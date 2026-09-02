[CmdletBinding()]
param(
  [switch]$ReplaceExistingWebhook
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoPath = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$projectRefPath = Join-Path $repoPath 'supabase\.temp\project-ref'
if (-not (Test-Path -LiteralPath $projectRefPath)) {
  throw 'Supabase 프로젝트 연결이 없습니다. 저장소 루트에서 supabase link를 먼저 완료하십시오.'
}
$projectRef = (Get-Content -LiteralPath $projectRefPath -Raw).Trim()
if ($projectRef -notmatch '^[a-z0-9]{20}$') { throw 'Supabase project ref 형식이 올바르지 않습니다.' }
if (-not (Get-Command npx.cmd -ErrorAction SilentlyContinue)) { throw 'npx.cmd를 찾을 수 없습니다.' }

function Invoke-TelegramApi {
  param(
    [Parameter(Mandatory)][string]$Method,
    [Parameter(Mandatory)][hashtable]$Body
  )
  $uri = "https://api.telegram.org/bot$script:BotToken/$Method"
  $json = $Body | ConvertTo-Json -Depth 12 -Compress
  try {
    $result = Invoke-RestMethod -Method Post -Uri $uri -ContentType 'application/json' -Body $json
  } catch {
    throw "Telegram $Method 네트워크 요청에 실패했습니다. token과 인터넷 연결을 확인하십시오."
  }
  if (-not $result.ok) { throw "Telegram $Method 요청이 거절되었습니다." }
  return $result.result
}

function New-UrlSafeSecret {
  $bytes = New-Object byte[] 32
  $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
  try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
  return [Convert]::ToBase64String($bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_')
}

function Write-Utf8NoBom {
  param([Parameter(Mandatory)][string]$Path, [Parameter(Mandatory)][string]$Value)
  [IO.File]::WriteAllText($Path, $Value, [Text.UTF8Encoding]::new($false))
}

$secureToken = Read-Host 'BotFather token을 붙여넣으십시오. 화면과 명령 기록에는 표시되지 않습니다' -AsSecureString
$tokenPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureToken)
try {
  $script:BotToken = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($tokenPointer)
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($tokenPointer)
}
if ($script:BotToken -notmatch '^\d+:[A-Za-z0-9_-]{30,}$') { throw 'Telegram bot token 형식이 올바르지 않습니다.' }

$bot = Invoke-TelegramApi -Method 'getMe' -Body @{}
$botUsername = [string]$bot.username
if ($botUsername -notmatch '^[A-Za-z0-9_]{5,32}$') { throw 'Telegram bot username을 확인하지 못했습니다.' }
$webhookInfo = Invoke-TelegramApi -Method 'getWebhookInfo' -Body @{}
if ([string]$webhookInfo.url -and -not $ReplaceExistingWebhook) {
  throw "이 봇에는 이미 webhook이 있습니다. 새 Phase 3 전용 봇을 사용하거나 -ReplaceExistingWebhook을 명시하십시오."
}
if ([string]$webhookInfo.url) {
  [void](Invoke-TelegramApi -Method 'deleteWebhook' -Body @{ drop_pending_updates = $true })
}

Write-Host "Telegram에서 @$botUsername 대화를 열고 /start를 보낸 뒤 Enter를 누르십시오."
[void](Read-Host)
$updates = Invoke-TelegramApi -Method 'getUpdates' -Body @{ timeout = 0; allowed_updates = @('message') }
$startUpdates = @($updates | Where-Object {
  $_.message -and $_.message.chat.type -eq 'private' -and ([string]$_.message.text).StartsWith('/start')
} | Sort-Object update_id -Descending)
if ($startUpdates.Count -eq 0) { throw '/start 메시지를 찾지 못했습니다. 봇 대화에서 다시 보낸 뒤 스크립트를 재실행하십시오.' }
$chatId = [Int64]$startUpdates[0].message.chat.id
$confirmation = Read-Host "탐지된 허용 chat_id는 $chatId 입니다. 이 대화만 허용하려면 YES를 입력하십시오"
if ($confirmation -ne 'YES') { throw 'Telegram 연결을 변경하지 않았습니다.' }

$ownerResult = & npx.cmd supabase --workdir $repoPath --output json db query --linked 'select id from auth.users order by created_at asc limit 2;' 2>$null
if ($LASTEXITCODE -ne 0) { throw 'Supabase 사용자 조회에 실패했습니다.' }
$ownerRows = @((($ownerResult -join "`n") | ConvertFrom-Json).rows)
if ($ownerRows.Count -ne 1) { throw '인증 사용자가 정확히 1명일 때만 자동 연결할 수 있습니다.' }
$ownerUserId = [string]$ownerRows[0].id
if ($ownerUserId -notmatch '^[0-9a-f-]{36}$') { throw 'Supabase 사용자 ID 형식이 올바르지 않습니다.' }

$webhookSecret = New-UrlSafeSecret
$cronSecret = New-UrlSafeSecret
$tempSecretFile = Join-Path ([IO.Path]::GetTempPath()) "oos-telegram-secrets-$([Guid]::NewGuid().ToString('N')).env"
$tempSqlFile = Join-Path ([IO.Path]::GetTempPath()) "oos-telegram-setup-$([Guid]::NewGuid().ToString('N')).sql"
try {
  $secretText = @(
    "TELEGRAM_BOT_TOKEN=$script:BotToken"
    "TELEGRAM_ALLOWED_CHAT_ID=$chatId"
    "TELEGRAM_WEBHOOK_SECRET=$webhookSecret"
    "TELEGRAM_CRON_SECRET=$cronSecret"
    "OOS_OWNER_USER_ID=$ownerUserId"
  ) -join "`n"
  Write-Utf8NoBom -Path $tempSecretFile -Value $secretText
  & npx.cmd supabase --workdir $repoPath secrets set --env-file $tempSecretFile
  if ($LASTEXITCODE -ne 0) { throw 'Supabase Edge Function secret 등록에 실패했습니다.' }

  $functionUrl = "https://$projectRef.supabase.co/functions/v1/telegram-bot"
  $sqlTemplate = @'
insert into public.telegram_settings (
  user_id, allowed_chat_id, bot_username, notification_time, time_zone, enabled
) values (
  '{0}'::uuid, {1}, '{2}', '21:30:00', 'Asia/Seoul', true
)
on conflict (user_id) do update set
  allowed_chat_id = excluded.allowed_chat_id,
  bot_username = excluded.bot_username,
  enabled = true,
  updated_at = now();

do $vault$
declare
  secret_id uuid;
begin
  select id into secret_id from vault.secrets where name = 'oos_telegram_cron_secret';
  if secret_id is null then
    perform vault.create_secret('{3}', 'oos_telegram_cron_secret', 'OOS Telegram daily Edge Function authentication');
  else
    perform vault.update_secret(secret_id, '{3}', 'oos_telegram_cron_secret', 'OOS Telegram daily Edge Function authentication');
  end if;
end;
$vault$;

select cron.schedule(
  'oos-telegram-daily-dispatch',
  '* * * * *',
  $job$
    select net.http_post(
      url := '{4}',
      headers := jsonb_build_object(
        'content-type', 'application/json',
        'x-oos-cron-secret', (
          select decrypted_secret from vault.decrypted_secrets where name = 'oos_telegram_cron_secret'
        )
      ),
      body := '{{}}'::jsonb,
      timeout_milliseconds := 10000
    ) as request_id;
  $job$
);
'@
  $sql = $sqlTemplate -f $ownerUserId, $chatId, $botUsername, $cronSecret, $functionUrl
  Write-Utf8NoBom -Path $tempSqlFile -Value $sql
  & npx.cmd supabase --workdir $repoPath db query --linked --file $tempSqlFile
  if ($LASTEXITCODE -ne 0) { throw 'Telegram 연결 행 또는 cron 설정에 실패했습니다.' }

  [void](Invoke-TelegramApi -Method 'setMyCommands' -Body @{ commands = @(
    @{ command = 'today'; description = '오늘 기록 요약' },
    @{ command = 'study'; description = '편입 공부 분 기록' },
    @{ command = 'log'; description = '시간형 항목 분 기록' },
    @{ command = 'done'; description = '완료형 항목 기록' },
    @{ command = 'count'; description = '횟수형 항목 1회 기록' },
    @{ command = 'end'; description = '오늘 종료 스냅샷' },
    @{ command = 'plan'; description = '이번 주 계획' },
    @{ command = 'week'; description = '이번 주 계획 실제 차이' }
  ); language_code = 'ko' })
  [void](Invoke-TelegramApi -Method 'setWebhook' -Body @{
    url = $functionUrl
    secret_token = $webhookSecret
    allowed_updates = @('message', 'callback_query')
    drop_pending_updates = $true
  })
  [void](Invoke-TelegramApi -Method 'sendMessage' -Body @{
    chat_id = $chatId
    text = "OOS Ops Telegram 연결됨`n허용 chat_id · $chatId`n예약 시각 · 21:30 Asia/Seoul"
  })
  $finalWebhook = Invoke-TelegramApi -Method 'getWebhookInfo' -Body @{}
  Write-Host "연결 완료 · @$botUsername · chat_id $chatId"
  Write-Host "webhook · $($finalWebhook.url)"
  Write-Host '봇 토큰과 생성된 secret은 저장소에 기록되지 않았습니다.'
} finally {
  if (Test-Path -LiteralPath $tempSecretFile) { Remove-Item -LiteralPath $tempSecretFile -Force }
  if (Test-Path -LiteralPath $tempSqlFile) { Remove-Item -LiteralPath $tempSqlFile -Force }
  $script:BotToken = $null
}
