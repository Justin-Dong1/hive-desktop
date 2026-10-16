param([int]$OwnerId,[string]$Heartbeat,[string]$ExecutablePath)
$ErrorActionPreference='SilentlyContinue'
Start-Transcript -Path (Join-Path (Split-Path $Heartbeat -Parent) 'watchdog.log') -Append | Out-Null
Write-Output "Watchdog requested: owner=$OwnerId heartbeat=$Heartbeat"
$owner=Get-Process -Id $OwnerId
$started=if($owner){$owner.StartTime}else{$null}
$explorer=Get-Process explorer | Select-Object -First 1
$explorerStarted=if($explorer){$explorer.StartTime}else{$null}
Write-Output "Watchdog started for $OwnerId at $(Get-Date -Format o)"
if($owner){Set-Content -LiteralPath ($Heartbeat+'.guard') -Value $PID -ErrorAction Stop}
while($owner){
 Start-Sleep -Seconds 3
 $current=Get-Process -Id $OwnerId
 if(-not $current -or $current.StartTime -ne $started){Write-Output 'Owner exited';break}
 $explorer=Get-Process explorer | Select-Object -First 1
 if(-not $explorer -or ($explorerStarted -and $explorer.StartTime -ne $explorerStarted)){
  Write-Output 'Explorer host changed; returning to Windows desktop'
  if($current.StartTime -eq $started){Stop-Process -Id $OwnerId -Force}
  break
 }
 $stamp=Get-Item -LiteralPath $Heartbeat
 if(-not $stamp -or ((Get-Date)-$stamp.LastWriteTime).TotalSeconds -gt 35){
  # Only terminate the exact process generation this watchdog owns.
  if($current.StartTime -eq $started){Stop-Process -Id $OwnerId -Force}
  break
 }
}
$hiveExe=if($ExecutablePath){$ExecutablePath}else{Join-Path (Split-Path $PSScriptRoot -Parent) 'node_modules\electron\dist\electron.exe'}
$replacement=Get-CimInstance Win32_Process | Where-Object { $_.ProcessId -ne $OwnerId -and $_.ExecutablePath -eq $hiveExe -and $_.CommandLine -notmatch '--type=' }
if(-not $replacement){
 for($attempt=0;$attempt -lt 20;$attempt++){
  $replacement=Get-CimInstance Win32_Process | Where-Object { $_.ProcessId -ne $OwnerId -and $_.ExecutablePath -eq $hiveExe -and $_.CommandLine -notmatch '--type=' }
  if($replacement){break}
  try{& (Join-Path $PSScriptRoot 'system-style.ps1') -Mode Restore;break}catch{Write-Output "Recovery retry: $_";Start-Sleep -Seconds 3}
 }
}
Write-Output "Recovery completed; replacement count: $(@($replacement).Count)"
if(Test-Path -LiteralPath $Heartbeat){Remove-Item -LiteralPath $Heartbeat -Force}
if(Test-Path -LiteralPath ($Heartbeat+'.guard')){Remove-Item -LiteralPath ($Heartbeat+'.guard') -Force}
