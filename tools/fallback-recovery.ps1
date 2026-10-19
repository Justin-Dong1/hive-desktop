# Runs independently of Electron and its watchdog, only in this user's session.
$ErrorActionPreference='Stop'
$state=Join-Path $env:LOCALAPPDATA 'GlassHiveDesktop\system-state.json'
if(-not (Test-Path -LiteralPath $state)){exit 0}
try {
 $result=& (Join-Path $PSScriptRoot 'system-style.ps1') -Mode Restore -OrphanOnly
 if($result){
  $logDir=Join-Path $env:APPDATA 'glass-hive-desktop'
  New-Item -ItemType Directory -Path $logDir -Force | Out-Null
  @{time=(Get-Date).ToString('o');result=($result -join ' ')} | ConvertTo-Json -Compress | Add-Content -LiteralPath (Join-Path $logDir 'fallback-recovery.jsonl') -Encoding UTF8
 }
} catch { Write-Error $_;exit 1 }
