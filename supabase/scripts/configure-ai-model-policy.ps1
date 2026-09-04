[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoPath = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$tempPath = $null
$exitCode = 0

try {
  # Kept in a temporary env file so model configuration never reaches command history.
  $policy = @(
    'AI_MODEL_LIGHT=gpt-5.6-luna',
    'AI_MODEL_STANDARD=gpt-5.6-terra',
    'AI_MODEL_DEEP=gpt-5.6-sol',
    'AI_PRICE_LIGHT_INPUT_PER_MILLION=0.2',
    'AI_PRICE_LIGHT_OUTPUT_PER_MILLION=1.2',
    'AI_PRICE_STANDARD_INPUT_PER_MILLION=2',
    'AI_PRICE_STANDARD_OUTPUT_PER_MILLION=12',
    'AI_PRICE_DEEP_INPUT_PER_MILLION=4',
    'AI_PRICE_DEEP_OUTPUT_PER_MILLION=20'
  ) -join "`n"
  $tempPath = [System.IO.Path]::GetTempFileName()
  [System.IO.File]::WriteAllText($tempPath, "$policy`n", [System.Text.UTF8Encoding]::new($false))

  Push-Location -LiteralPath $repoPath
  try {
    & npx.cmd supabase@2.116.0 secrets set --env-file $tempPath
    if ($LASTEXITCODE -ne 0) { throw "Supabase model policy setup failed with exit code $LASTEXITCODE." }
  } finally {
    Pop-Location
  }
  Write-Host 'AI model policy saved as Supabase server configuration.' -ForegroundColor Green
} catch {
  $exitCode = 1
  Write-Host ("AI model policy setup failed: " + $_.Exception.Message) -ForegroundColor Red
} finally {
  if ($tempPath -and [System.IO.File]::Exists($tempPath)) { Remove-Item -LiteralPath $tempPath -Force }
}

exit $exitCode
