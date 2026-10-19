param([int]$OwnerId,[string]$Heartbeat,[string]$ExecutablePath,[string]$StatusPath)
$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
$log=Join-Path (Split-Path $Heartbeat -Parent) 'watchdog-events.jsonl'
function Record([string]$eventName){
 try { @{time=(Get-Date).ToString('o');owner=$OwnerId;guard=$PID;event=$eventName} | ConvertTo-Json -Compress | Add-Content -LiteralPath $log -Encoding UTF8 } catch {}
}
$started=$null;$reason='owner-exited';$restored=$false;$replacement=@()
try {
 $owner=Get-Process -Id $OwnerId -ErrorAction SilentlyContinue
 if($owner){$started=$owner.StartTime}
 Record 'started'
 $lastPoll=Get-Date;$graceUntil=$lastPoll.AddSeconds(40)
 while($owner){
  Set-Content -LiteralPath ($Heartbeat+'.guard') -Value $PID
  Start-Sleep -Seconds 3
  $now=Get-Date
  # A sleep or scheduling gap must not be mistaken for a frozen app.
  if(($now-$lastPoll).TotalSeconds -gt 15 -or $now -lt $lastPoll){$graceUntil=$now.AddSeconds(45);Record 'resume-grace'}
  $lastPoll=$now
  $current=Get-Process -Id $OwnerId -ErrorAction SilentlyContinue
  if(-not $current -or $current.StartTime -ne $started){break}
  $stamp=Get-Item -LiteralPath $Heartbeat -ErrorAction SilentlyContinue
  if($now -ge $graceUntil -and (-not $stamp -or ($now-$stamp.LastWriteTime).TotalSeconds -gt 35)){
   $reason='owner-heartbeat-timeout';Record $reason
   Stop-Process -Id $OwnerId -Force -ErrorAction SilentlyContinue
   break
  }
  # Explorer host migration is handled by the app's host monitor.
 }
} catch {
 $reason='guard-error: '+$_.Exception.Message;Record $reason
 $current=Get-Process -Id $OwnerId -ErrorAction SilentlyContinue
 if($current -and $started -and $current.StartTime -eq $started){Stop-Process -Id $OwnerId -Force -ErrorAction SilentlyContinue}
} finally {
 Record $reason
 $hiveExe=if($ExecutablePath){$ExecutablePath}else{Join-Path $root 'node_modules\electron\dist\electron.exe'}
 for($attempt=0;$attempt -lt 20;$attempt++){
  try {
   $replacement=@(Get-CimInstance Win32_Process | Where-Object { $_.ProcessId -ne $OwnerId -and $_.ExecutablePath -eq $hiveExe -and $_.CommandLine -notmatch '--type=' })
   # Ownership is checked under the style mutex, not inferred from a process name.
   & (Join-Path $PSScriptRoot 'system-style.ps1') -Mode Restore -ExpectedOwnerId $OwnerId
   $restored=$true;break
  }catch{Record ('restore-retry: '+$_.Exception.Message);Start-Sleep -Seconds 3}
 }
 if($StatusPath -and -not $replacement.Count){
  try{
   $previous=Get-Content -LiteralPath $StatusPath -Raw | ConvertFrom-Json
   if($previous.pid -eq $OwnerId){@{pid=$OwnerId;time=(Get-Date).ToString('o');ready=$false;restored=$restored;reason=$reason} | ConvertTo-Json -Compress | Set-Content -LiteralPath $StatusPath -Encoding UTF8}
  }catch{Record 'status-update-failed'}
 }
 Record ('recovery-finished restored='+$restored)
 Remove-Item -LiteralPath $Heartbeat,($Heartbeat+'.guard') -Force -ErrorAction SilentlyContinue
}
