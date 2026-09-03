[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoPath = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$pointer = [IntPtr]::Zero
$plainKey = $null
$tempPath = $null
$scriptExitCode = 0

try {
  $secureKey = Read-Host 'Paste the new OpenAI API key (input is hidden)' -AsSecureString
  if ($secureKey.Length -eq 0) {
    throw 'No API key was entered.'
  }

  $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureKey)
  $plainKey = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
  if ([string]::IsNullOrWhiteSpace($plainKey) -or $plainKey.Length -lt 20 -or $plainKey -match '\s') {
    throw 'The API key format is invalid. Paste the complete key without spaces.'
  }

  $tempPath = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempFileName())
  $tempRoot = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
  if (-not $tempPath.StartsWith($tempRoot, [StringComparison]::OrdinalIgnoreCase)) {
    throw 'The temporary file path could not be verified.'
  }

  $utf8WithoutBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($tempPath, "OPENAI_API_KEY=$plainKey`n", $utf8WithoutBom)

  Push-Location -LiteralPath $repoPath
  try {
    $previousPreference = $ErrorActionPreference
    try {
      $ErrorActionPreference = 'Continue'
      & npx.cmd supabase@latest secrets set --env-file $tempPath
      $nativeExitCode = $LASTEXITCODE
    } finally {
      $ErrorActionPreference = $previousPreference
    }

    if ($nativeExitCode -ne 0) {
      throw "Supabase secret setup failed with exit code $nativeExitCode."
    }
  } finally {
    Pop-Location
  }

  Write-Host 'OpenAI API key saved as a Supabase server secret.' -ForegroundColor Green
  Write-Host 'The key was not copied into the app or repository.' -ForegroundColor Green
} catch {
  $scriptExitCode = 1
  Write-Host ("OpenAI secret setup failed: " + $_.Exception.Message) -ForegroundColor Red
} finally {
  if ($pointer -ne [IntPtr]::Zero) {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
  }

  if ($tempPath -and [System.IO.File]::Exists($tempPath)) {
    if ($plainKey) {
      [System.IO.File]::WriteAllText($tempPath, ('0' * $plainKey.Length))
    }
    Remove-Item -LiteralPath $tempPath -Force
  }

  $plainKey = $null
}

exit $scriptExitCode
