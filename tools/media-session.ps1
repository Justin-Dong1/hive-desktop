param([ValidateSet('status','toggle','previous','next','seek','shuffle','repeat')][string]$Action='status',[string]$Source='',[double]$Value=0,[string]$Track='',[switch]$Serve)
$ErrorActionPreference='Stop'
[Console]::OutputEncoding=New-Object Text.UTF8Encoding($false)
if($Serve){
 while($null -ne ($requestLine=[Console]::ReadLine())){
  if($requestLine -eq 'status'){& $PSCommandPath -Action status;[Console]::WriteLine()}
 }
 exit
}
try {
 Add-Type -AssemblyName System.Runtime.WindowsRuntime
 $managerType=[Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager,Windows.Media.Control,ContentType=WindowsRuntime]
 $propertiesType=[Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties,Windows.Media.Control,ContentType=WindowsRuntime]
 $asTask=[System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {$_.Name -eq 'AsTask' -and $_.IsGenericMethod -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'} | Select-Object -First 1
 function Await($operation,[Type]$type){
  $task=$asTask.MakeGenericMethod($type).Invoke($null,@($operation))
  if(-not $task.Wait(4000)){throw 'Media request timed out'}
  return $task.Result
 }
 $manager=Await ($managerType::RequestAsync()) $managerType
 $sessions=@($manager.GetSessions())
 if($Action -ne 'status'){
  $selected=$sessions | Where-Object {$_.SourceAppUserModelId -eq $Source} | Select-Object -First 1
  if(-not $selected){throw 'Media session is no longer available'}
  $control=$selected.GetPlaybackInfo().Controls
  if($Action -eq 'seek'){
   $nowPlaying=Await ($selected.TryGetMediaPropertiesAsync()) $propertiesType
   if($Track -ne ($nowPlaying.Title+'|'+$nowPlaying.Artist)){throw 'Track changed; seek canceled'}
  }
  $operation=switch($Action){
   'toggle'{$selected.TryTogglePlayPauseAsync()}
   'previous'{$selected.TrySkipPreviousAsync()}
   'next'{$selected.TrySkipNextAsync()}
   'seek'{if(-not $control.IsPlaybackPositionEnabled){throw 'Player does not support seeking'};$t=$selected.GetTimelineProperties();if([double]::IsNaN($Value) -or [double]::IsInfinity($Value) -or $Value -lt $t.StartTime.TotalSeconds -or $Value -gt $t.EndTime.TotalSeconds -or $t.EndTime.TotalSeconds -le $t.StartTime.TotalSeconds){throw 'Invalid playback position'};$selected.TryChangePlaybackPositionAsync([long]($Value*10000000))}
   'shuffle'{if(-not $control.IsShuffleEnabled){throw 'Player does not expose shuffle control'};if($Value -notin @(0,1)){throw 'Invalid shuffle value'};$selected.TryChangeShuffleActiveAsync([bool]$Value)}
   'repeat'{if(-not $control.IsRepeatEnabled){throw 'Player does not expose repeat control'};if($Value -notin @(0,1,2)){throw 'Invalid repeat value'};$selected.TryChangeAutoRepeatModeAsync([Windows.Media.MediaPlaybackAutoRepeatMode,Windows.Media,ContentType=WindowsRuntime][int]$Value)}
  }
  $success=Await $operation ([bool])
  [Console]::Write((@{ok=[bool]$success;message=$(if(-not $success){'Player rejected this control'}else{''})}|ConvertTo-Json -Compress));exit
 }
 $current=$manager.GetCurrentSession();$result=@()
 foreach($session in $sessions){
  try{
   $media=Await ($session.TryGetMediaPropertiesAsync()) $propertiesType
   $play=$session.GetPlaybackInfo();$timeline=$session.GetTimelineProperties();$cover='';$coverError='';$coverStatus='not-provided'
   if($media.Thumbnail){
    $coverStatus='reading'
    try{
     if(-not ('HiveMediaCover' -as [type])){
      $runtime=Get-ChildItem "$env:WINDIR\Microsoft.NET\assembly\GAC_MSIL\System.Runtime" -Filter System.Runtime.dll -Recurse | Select-Object -First 1 -ExpandProperty FullName
      $compiler=New-Object System.CodeDom.Compiler.CompilerParameters
      foreach($reference in @('System.dll','System.Core.dll',$runtime,"$env:WINDIR\System32\WinMetadata\Windows.Storage.winmd","$env:WINDIR\System32\WinMetadata\Windows.Foundation.winmd")){$null=$compiler.ReferencedAssemblies.Add($reference)}
      Add-Type -Path (Join-Path $PSScriptRoot 'media-cover.cs') -CompilerParameters $compiler
     }
     $cover=[HiveMediaCover]::Read($media.Thumbnail)
    }catch{$coverStatus='read-error';$coverError=$_.Exception.Message}
   }
   if($cover){$coverStatus='ready'}elseif($coverStatus -eq 'reading'){$coverStatus='empty-or-too-large'}
   $coverDiagnostics=@{status=$coverStatus;error=$coverError}
   $extras=@{seek=[bool]$play.Controls.IsPlaybackPositionEnabled;shuffleEnabled=[bool]$play.Controls.IsShuffleEnabled;repeatEnabled=[bool]$play.Controls.IsRepeatEnabled;shuffle=$play.IsShuffleActive;repeat=$(if($null -ne $play.AutoRepeatMode){$play.AutoRepeatMode.ToString()}else{$null});rate=$play.PlaybackRate;start=$timeline.StartTime.TotalSeconds;minSeek=$timeline.MinSeekTime.TotalSeconds;maxSeek=$timeline.MaxSeekTime.TotalSeconds;sampled=[DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()}
   $result+=@{source=[string]$session.SourceAppUserModelId;title=[string]$media.Title;artist=[string]$media.Artist;album=[string]$media.AlbumTitle;cover=$cover;coverDiagnostics=$coverDiagnostics;controls=$extras;playing=($play.PlaybackStatus.ToString() -eq 'Playing');status=$play.PlaybackStatus.ToString();position=$timeline.Position.TotalSeconds;duration=$timeline.EndTime.TotalSeconds;updated=$timeline.LastUpdatedTime.ToUnixTimeMilliseconds();toggle=[bool]$play.Controls.IsPlayPauseToggleEnabled;previous=[bool]$play.Controls.IsPreviousEnabled;next=[bool]$play.Controls.IsNextEnabled}
  }catch{}
 }
 [Console]::Write((@{ok=$true;current=$(if($current){[string]$current.SourceAppUserModelId}else{''});sessions=@($result)}|ConvertTo-Json -Depth 5 -Compress))
}catch{[Console]::Write((@{ok=$false;message=$_.Exception.Message;sessions=@()}|ConvertTo-Json -Compress))}
