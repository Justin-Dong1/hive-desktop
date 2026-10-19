param([ValidateSet('get','set')][string]$Mode='get',[ValidateRange(0,100)][int]$Value=0)
$ErrorActionPreference='Stop'
[Console]::OutputEncoding=New-Object System.Text.UTF8Encoding($false)
$devices=$null;$device=$null
try {
 $vendor=Join-Path (Split-Path $PSScriptRoot -Parent) 'vendor\NAudio-2.2.1'
 Add-Type -Path (Join-Path $vendor 'NAudio.Core.dll')
 Add-Type -Path (Join-Path $vendor 'NAudio.Wasapi.dll')
 $devices=New-Object NAudio.CoreAudioApi.MMDeviceEnumerator
 $device=$devices.GetDefaultAudioEndpoint([NAudio.CoreAudioApi.DataFlow]::Render,[NAudio.CoreAudioApi.Role]::Multimedia)
 if($Mode -eq 'set') { $device.AudioEndpointVolume.MasterVolumeLevelScalar=[single]($Value/100.0) }
 @{ok=$true;volume=[int][Math]::Round($device.AudioEndpointVolume.MasterVolumeLevelScalar*100);muted=[bool]$device.AudioEndpointVolume.Mute;device=$device.FriendlyName} | ConvertTo-Json -Compress
} catch { @{ok=$false;message='Default audio endpoint unavailable.'} | ConvertTo-Json -Compress }
finally { if($device){$device.Dispose()};if($devices){$devices.Dispose()} }
