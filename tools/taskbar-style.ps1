param([ValidateSet('Apply','Restore')][string]$Mode='Apply')
$ErrorActionPreference='Stop'
$component=Join-Path (Split-Path $PSScriptRoot -Parent) 'vendor\TranslucentTB-2026.2\TranslucentTB.exe'
$record=Join-Path $env:LOCALAPPDATA 'GlassHiveDesktop\taskbar-owner.json'
$mutex=New-Object Threading.Mutex($false,'Local\GlassHiveTaskbarStyle')
$locked=$false
try {
 try{$locked=$mutex.WaitOne(8000)}catch [Threading.AbandonedMutexException]{$locked=$true}
 if(-not $locked){throw 'Taskbar style operation is busy'}
 if($Mode -eq 'Apply'){
  if(-not (Test-Path -LiteralPath $component)){throw 'Taskbar component missing'}
  $runtime=Get-AppxPackage Microsoft.UI.Xaml.2.8 | Where-Object { $_.Architecture -eq 'X64' -and [version]$_.Version -ge [version]'8.2501.31001.0' }
  if(-not $runtime){throw 'Microsoft.UI.Xaml.2.8 x64 8.2501.31001.0 or newer is required; taskbar controller was not changed'}
  $running=Get-Process TranslucentTB -ErrorAction SilentlyContinue
  if($running -and @($running | Where-Object Path -ne $component).Count){throw 'A separate TranslucentTB installation is running; configuration was not changed'}
  $prior=if(Test-Path -LiteralPath $record){Get-Content -LiteralPath $record -Raw | ConvertFrom-Json}else{$null}
  $crystal=Get-Process crystaltaskbar -ErrorAction SilentlyContinue
  if(-not $prior){$prior=@{crystalPath=if($crystal){@($crystal)[0].Path}else{''};component=$component};New-Item -ItemType Directory -Path (Split-Path $record) -Force | Out-Null;$prior | ConvertTo-Json | Set-Content -LiteralPath $record -Encoding UTF8}
  $crystal | Stop-Process
  if(-not $running){Start-Process -FilePath $component -WorkingDirectory (Split-Path $component) -WindowStyle Hidden}
  Start-Sleep -Milliseconds 1500
  if(-not (Get-Process TranslucentTB -ErrorAction SilentlyContinue | Where-Object Path -eq $component)){throw 'Taskbar component failed to start'}
  Write-Output 'XAML gray glass taskbar active.'
 }elseif(Test-Path -LiteralPath $record){
  $prior=Get-Content -LiteralPath $record -Raw | ConvertFrom-Json
  Add-Type @'
using System;using System.Runtime.InteropServices;
public static class HiveTaskbarClose {
 public delegate bool Callback(IntPtr h,IntPtr p);
 [DllImport("user32.dll")]static extern bool EnumWindows(Callback cb,IntPtr p);
 [DllImport("user32.dll")]static extern uint GetWindowThreadProcessId(IntPtr h,out uint pid);
 [DllImport("user32.dll")]static extern bool PostMessage(IntPtr h,uint msg,IntPtr w,IntPtr l);
 public static void Close(uint id){EnumWindows((h,p)=>{uint pid;GetWindowThreadProcessId(h,out pid);if(pid==id)PostMessage(h,0x10,IntPtr.Zero,IntPtr.Zero);return true;},IntPtr.Zero);}
}
'@
  foreach($p in @(Get-Process TranslucentTB -ErrorAction SilentlyContinue | Where-Object Path -eq $component)){[HiveTaskbarClose]::Close($p.Id);if(-not $p.WaitForExit(3000)){throw 'Taskbar component did not exit; restore record retained'}}
  if($prior.crystalPath -and (Test-Path -LiteralPath $prior.crystalPath) -and -not (Get-Process crystaltaskbar -ErrorAction SilentlyContinue)){Start-Process -FilePath $prior.crystalPath -ArgumentList '-autorun' -WorkingDirectory (Split-Path $prior.crystalPath) -WindowStyle Hidden}
  Remove-Item -LiteralPath $record
  Write-Output 'Previous taskbar controller restored.'
 }
}finally{if($locked){$mutex.ReleaseMutex()};$mutex.Dispose()}
