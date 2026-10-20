param([switch]$Remove)
$ErrorActionPreference='Stop'
try {
 $sid=[Security.Principal.WindowsIdentity]::GetCurrent().User.Value
 $name='HiveDesktop-Recovery-'+$sid
 $script=Join-Path $PSScriptRoot 'fallback-recovery-hidden.vbs'
 $executable=Join-Path $env:WINDIR 'System32\wscript.exe'
 $arguments='//B //NoLogo "'+$script+'"'
 $legacyArguments='-NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File "'+(Join-Path $PSScriptRoot 'fallback-recovery.ps1')+'"'
 $existing=Get-ScheduledTask -TaskName $name -ErrorAction SilentlyContinue
 if($Remove){
  # An old installation must not remove another installation's recovery task.
  $owned=$existing -and (($existing.Actions.Arguments -contains $arguments) -or ($existing.Actions.Arguments -contains $legacyArguments))
  if($owned){Unregister-ScheduledTask -TaskName $name -Confirm:$false}
  @{ok=$true;removed=[bool]$owned} | ConvertTo-Json -Compress;exit
 }
 if(-not (Test-Path -LiteralPath $script)){throw 'Hidden recovery launcher is missing.'}
 if(-not $existing -or $existing.Actions.Count -ne 1 -or $existing.Actions.Arguments -notcontains $arguments -or $existing.Actions.Execute -notcontains $executable){
  $action=New-ScheduledTaskAction -Execute $executable -Argument $arguments
  $trigger=New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes 1) -RepetitionDuration (New-TimeSpan -Days 3650)
  $principal=New-ScheduledTaskPrincipal -UserId $sid -LogonType Interactive -RunLevel Limited
  $settings=New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 1)
  # Preserve an intentional disable across startup and action migration.
  if($existing -and $existing.State -eq 'Disabled'){$settings.Enabled=$false}
  Register-ScheduledTask -TaskName $name -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description 'Restore native desktop icons only when Hive has left recovery state with no live owner.' -Force | Out-Null
 }
 $installed=Get-ScheduledTask -TaskName $name -ErrorAction Stop
 @{ok=$true;task=$name;enabled=($installed.State -ne 'Disabled')} | ConvertTo-Json -Compress
} catch { @{ok=$false;message=$_.Exception.Message} | ConvertTo-Json -Compress;exit 1 }
