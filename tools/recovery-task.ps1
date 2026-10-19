param([switch]$Remove)
$ErrorActionPreference='Stop'
try {
 $sid=[Security.Principal.WindowsIdentity]::GetCurrent().User.Value
 $name='HiveDesktop-Recovery-'+$sid
 $script=Join-Path $PSScriptRoot 'fallback-recovery.ps1'
 $arguments='-NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File "'+$script+'"'
 $existing=Get-ScheduledTask -TaskName $name -ErrorAction SilentlyContinue
 if($Remove){
  # An old installation must not remove another installation's recovery task.
  if($existing -and $existing.Actions.Arguments -contains $arguments){Unregister-ScheduledTask -TaskName $name -Confirm:$false}
  @{ok=$true;removed=$true} | ConvertTo-Json -Compress;exit
 }
 if(-not $existing -or $existing.Actions.Arguments -notcontains $arguments -or $existing.State -eq 'Disabled'){
  $action=New-ScheduledTaskAction -Execute (Join-Path $env:WINDIR 'System32\WindowsPowerShell\v1.0\powershell.exe') -Argument $arguments
  $trigger=New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes 1) -RepetitionDuration (New-TimeSpan -Days 3650)
  $principal=New-ScheduledTaskPrincipal -UserId $sid -LogonType Interactive -RunLevel Limited
  $settings=New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 1)
  Register-ScheduledTask -TaskName $name -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description 'Restore native desktop icons only when Hive has left recovery state with no live owner.' -Force | Out-Null
 }
 @{ok=$true;task=$name} | ConvertTo-Json -Compress
} catch { @{ok=$false;message=$_.Exception.Message} | ConvertTo-Json -Compress;exit 1 }
