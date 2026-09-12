$ErrorActionPreference = 'Stop'

$toolRoot = if ($env:OOS_DESIGN_TOOLS) {
  $env:OOS_DESIGN_TOOLS
} else {
  Join-Path $env:LOCALAPPDATA 'OOSDesignTools'
}

$jdkContainer = Get-ChildItem -LiteralPath $toolRoot -Directory -Filter 'jdk-*' |
  Sort-Object Name -Descending |
  Select-Object -First 1
$maestroContainer = Get-ChildItem -LiteralPath $toolRoot -Directory -Filter 'maestro-*' |
  Sort-Object Name -Descending |
  Select-Object -First 1

if (-not $jdkContainer -or -not $maestroContainer) {
  throw "OOS design tools are missing under $toolRoot"
}

$java = Get-ChildItem -LiteralPath $jdkContainer.FullName -Recurse -Filter 'java.exe' |
  Where-Object { $_.FullName -match '\\bin\\java\.exe$' } |
  Select-Object -First 1
$maestro = Get-ChildItem -LiteralPath $maestroContainer.FullName -Recurse -Filter 'maestro.bat' |
  Select-Object -First 1

if (-not $java -or -not $maestro) {
  throw 'Java or Maestro executable was not found.'
}

$env:JAVA_HOME = Split-Path (Split-Path $java.FullName -Parent) -Parent
$env:Path = "$(Join-Path $env:JAVA_HOME 'bin');$env:Path"
$env:MAESTRO_CLI_NO_ANALYTICS = 'true'
$env:MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED = 'true'

& $maestro.FullName @args
exit $LASTEXITCODE
