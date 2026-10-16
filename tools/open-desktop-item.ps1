param([Parameter(Mandatory=$true)][string]$ItemPath)
$ErrorActionPreference='Stop'
try {
 $namespace=$ItemPath -match '^::\{[0-9a-fA-F-]+\}$'
 $folderTarget=$null
 $shortcut=$false
 if(-not $namespace){
  if(-not(Test-Path -LiteralPath $ItemPath)){throw 'File no longer exists'}
  if(Test-Path -LiteralPath $ItemPath -PathType Container){$folderTarget=[IO.Path]::GetFullPath($ItemPath)}
  elseif([IO.Path]::GetExtension($ItemPath) -eq '.lnk'){
   $shortcut=$true
   $link=(New-Object -ComObject WScript.Shell).CreateShortcut($ItemPath)
   if($link.TargetPath -and [IO.Path]::IsPathRooted($link.TargetPath)){
    if(-not(Test-Path -LiteralPath $link.TargetPath)){throw ('Shortcut target no longer exists: '+$link.TargetPath)}
    if(Test-Path -LiteralPath $link.TargetPath -PathType Container){$folderTarget=[IO.Path]::GetFullPath($link.TargetPath)}
   }
  }
 }
 if($namespace -or $folderTarget){
  Add-Type @'
using System;using System.Runtime.InteropServices;
public class HiveOpenWindow {
 [DllImport("user32.dll")] public static extern bool ShowWindowAsync(IntPtr h,int cmd);
 [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
 [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
 [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr h);
}
'@
  # Use Explorer's shell namespace command line, not a short-lived COM Explore request.
  if($shortcut){
   # Launch the original shortcut so its arguments and working directory survive.
   $info=New-Object Diagnostics.ProcessStartInfo
   $info.FileName=$ItemPath;$info.UseShellExecute=$true;$info.WindowStyle=[Diagnostics.ProcessWindowStyle]::Normal
   $null=[Diagnostics.Process]::Start($info)
  }else{
   $argument=if($namespace){'shell:'+$ItemPath}else{'"'+$folderTarget+'"'}
   Start-Process -FilePath (Join-Path $env:WINDIR 'explorer.exe') -ArgumentList $argument -WindowStyle Normal
  }
  $deadline=(Get-Date).AddSeconds(8)
  $found=$null
  do {
   Start-Sleep -Milliseconds 300
   $shellApp=New-Object -ComObject Shell.Application
   foreach($window in $shellApp.Windows()){
    try{
     $actual=$window.Document.Folder.Self.Path
     $sameTarget=if($namespace){$actual -eq $ItemPath}else{[string]::Equals(([string]$actual).TrimEnd('\'),$folderTarget.TrimEnd('\'),[StringComparison]::OrdinalIgnoreCase)}
     if($namespace -and $ItemPath -match '26EE0668|5399E694'){$sameTarget=$actual -match '26EE0668|5399E694'}
     if($sameTarget){$found=$window;break}
    }catch{}
   }
  }while(-not $found -and (Get-Date) -lt $deadline)
  if(-not $found){throw 'Explorer did not expose the requested window within 8 seconds. Please retry.'}
  $handle=[IntPtr]([long]$found.HWND)
  $null=[HiveOpenWindow]::ShowWindowAsync($handle,9)
  $visibleDeadline=(Get-Date).AddSeconds(3)
  while(((-not [HiveOpenWindow]::IsWindowVisible($handle)) -or [HiveOpenWindow]::IsIconic($handle)) -and (Get-Date) -lt $visibleDeadline){Start-Sleep -Milliseconds 100}
  $null=[HiveOpenWindow]::SetForegroundWindow($handle)
  if((-not [HiveOpenWindow]::IsWindowVisible($handle)) -or [HiveOpenWindow]::IsIconic($handle)){throw 'The requested Explorer window is not visible'}
 }else{
  # ShellExecute keeps shortcut arguments, working directory, URL associations and elevation verbs.
  $info=New-Object Diagnostics.ProcessStartInfo
  $info.FileName=$ItemPath;$info.UseShellExecute=$true;$info.WindowStyle=[Diagnostics.ProcessWindowStyle]::Normal
  $null=[Diagnostics.Process]::Start($info)
 }
 [Console]::OutputEncoding=[Text.Encoding]::UTF8
 [Console]::Write('{"ok":true}')
}catch{
 [Console]::OutputEncoding=[Text.Encoding]::UTF8
 [Console]::Write((@{ok=$false;message=$_.Exception.Message}|ConvertTo-Json -Compress))
}
