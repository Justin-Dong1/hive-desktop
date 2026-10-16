$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
$exe=Join-Path $root 'node_modules\electron\dist\electron.exe'
# Only stop this installation, not other Electron applications.
Get-Process electron -ErrorAction SilentlyContinue | Where-Object {$_.Path -eq $exe} | Stop-Process -Force
for($attempt=0;$attempt -lt 10;$attempt++){
 try{& (Join-Path $PSScriptRoot 'system-style.ps1') -Mode Restore;exit 0}
 catch{if($attempt -eq 9){Write-Error $_;exit 1};Start-Sleep -Seconds 2}
}
