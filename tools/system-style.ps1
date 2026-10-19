param(
  [ValidateSet('Apply','Restore','Taskbar','Inspect')]
  [string]$Mode = 'Apply',
  [int]$OwnerId = 0,
  [string]$OwnerExecutable = '',
  [int]$ExpectedOwnerId = 0,
  [switch]$OrphanOnly
)

$ErrorActionPreference = 'Stop'
$stateDir = Join-Path $env:LOCALAPPDATA 'GlassHiveDesktop'
$stateFile = Join-Path $stateDir 'system-state.json'
New-Item -ItemType Directory -Path $stateDir -Force | Out-Null

Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class GlassHiveWin32 {
  public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
  [DllImport("user32.dll", CharSet=CharSet.Auto)] public static extern IntPtr FindWindow(string cls, string title);
  [DllImport("user32.dll", CharSet=CharSet.Auto)] public static extern IntPtr FindWindowEx(IntPtr parent, IntPtr after, string cls, string title);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc callback, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int command);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern int SetWindowCompositionAttribute(IntPtr hWnd, ref WindowCompositionAttributeData data);
  public enum WindowCompositionAttribute { WCA_ACCENT_POLICY = 19 }
  public enum AccentState { Disabled = 0, BlurBehind = 3, AcrylicBlurBehind = 4 }
  [StructLayout(LayoutKind.Sequential)] public struct AccentPolicy {
    public AccentState AccentState;
    public int AccentFlags;
    public int GradientColor;
    public int AnimationId;
  }
  [StructLayout(LayoutKind.Sequential)] public struct WindowCompositionAttributeData {
    public WindowCompositionAttribute Attribute;
    public IntPtr Data;
    public int SizeOfData;
  }
  public static bool Accent(IntPtr hwnd, AccentState state, int color) {
    var policy = new AccentPolicy { AccentState = state, AccentFlags = 2, GradientColor = color, AnimationId = 0 };
    int size = Marshal.SizeOf(policy);
    IntPtr ptr = Marshal.AllocHGlobal(size);
    try {
      Marshal.StructureToPtr(policy, ptr, false);
      var data = new WindowCompositionAttributeData { Attribute = WindowCompositionAttribute.WCA_ACCENT_POLICY, Data = ptr, SizeOfData = size };
      return SetWindowCompositionAttribute(hwnd, ref data)!=0;
    } finally { Marshal.FreeHGlobal(ptr); }
  }
}
'@

function Get-DesktopListView {
  $script:desktopView = [IntPtr]::Zero
  $progman = [GlassHiveWin32]::FindWindow('Progman', $null)
  $view = [GlassHiveWin32]::FindWindowEx($progman, [IntPtr]::Zero, 'SHELLDLL_DefView', $null)
  if ($view -eq [IntPtr]::Zero) {
    [GlassHiveWin32]::EnumWindows({
      param($hwnd, $lparam)
      $candidate = [GlassHiveWin32]::FindWindowEx($hwnd, [IntPtr]::Zero, 'SHELLDLL_DefView', $null)
      if ($candidate -ne [IntPtr]::Zero) { $script:desktopView = $candidate; return $false }
      return $true
    }, [IntPtr]::Zero) | Out-Null
    $view = $script:desktopView
  }
  if ($view -eq [IntPtr]::Zero) { return [IntPtr]::Zero }
  return [GlassHiveWin32]::FindWindowEx($view, [IntPtr]::Zero, 'SysListView32', 'FolderView')
}

function Set-TaskbarAccent([bool]$enable) {
  $policyPath=Join-Path (Split-Path $PSScriptRoot -Parent) 'taskbar-policy.json'
  $useTranslucentTB=$true
  if(Test-Path -LiteralPath $policyPath){
    try{$useTranslucentTB=(Get-Content -LiteralPath $policyPath -Raw | ConvertFrom-Json).translucentTBEnabled -ne $false}catch{$useTranslucentTB=$false}
  }
  if(-not $useTranslucentTB){Write-Output 'Taskbar customization paused; existing taskbar controller retained.';return}
  if($useTranslucentTB -and (Test-Path -LiteralPath (Join-Path (Split-Path $PSScriptRoot -Parent) 'vendor\TranslucentTB-2026.2\TranslucentTB.exe'))){
    & (Join-Path $PSScriptRoot 'taskbar-style.ps1') -Mode $(if($enable){'Apply'}else{'Restore'})
    return
  }
  $targets = @([GlassHiveWin32]::FindWindow('Shell_TrayWnd', $null))
  $after = [IntPtr]::Zero
  while ($true) {
    $after = [GlassHiveWin32]::FindWindowEx([IntPtr]::Zero, $after, 'Shell_SecondaryTrayWnd', $null)
    if ($after -eq [IntPtr]::Zero) { break }
    $targets += $after
  }
  foreach ($target in $targets) {
    if ($target -eq [IntPtr]::Zero) { continue }
    if ($enable) {
      # AABBGGRR: 53% tint opacity, neutral gray RGB 606060.
      $accepted=[GlassHiveWin32]::Accent($target, [GlassHiveWin32+AccentState]::AcrylicBlurBehind, -2006949792)
      [pscustomobject]@{taskbar=$target.ToInt64();accepted=$accepted;tint='#606060';tintOpacity=0.533}
    } else {
      [GlassHiveWin32]::Accent($target, [GlassHiveWin32+AccentState]::Disabled, 0) | Out-Null
    }
  }
}

if ($Mode -eq 'Taskbar') { Set-TaskbarAccent $true | ConvertTo-Json -Compress; exit }
if($Mode -eq 'Inspect'){$desktopList=Get-DesktopListView;@{available=($desktopList -ne [IntPtr]::Zero);iconsVisible=($desktopList -ne [IntPtr]::Zero -and [GlassHiveWin32]::IsWindowVisible($desktopList));recoveryState=(Test-Path -LiteralPath $stateFile)} | ConvertTo-Json -Compress;exit}
$styleMutex=New-Object Threading.Mutex($false,'Local\HiveDesktopSystemStyle')
$styleLocked=$false
try {
try{$styleLocked=$styleMutex.WaitOne(5000)}catch [Threading.AbandonedMutexException]{$styleLocked=$true}
if(-not $styleLocked){throw 'Desktop style lock timed out; recovery state retained.'}
if($Mode -eq 'Restore' -and ($ExpectedOwnerId -or $OrphanOnly)){
 if(-not (Test-Path -LiteralPath $stateFile)){Write-Output 'No recovery state; nothing changed.';return}
 $record=$null;try{$record=Get-Content -LiteralPath $stateFile -Raw | ConvertFrom-Json}catch{}
 if($ExpectedOwnerId -and $record.ownerId -and $record.ownerId -ne $ExpectedOwnerId){Write-Output 'New owner has taken over; nothing changed.';return}
 if($OrphanOnly){
  if(((Get-Date)-(Get-Item -LiteralPath $stateFile).LastWriteTime).TotalSeconds -lt 30){return}
  if($record.ownerId){
   $owner=Get-Process -Id $record.ownerId -ErrorAction SilentlyContinue
   if($owner -and $owner.Path -eq $record.ownerExecutable -and $owner.StartTime -le [DateTime]$record.appliedAt){
    $heartbeat=Join-Path $env:APPDATA ('glass-hive-desktop\heartbeat-'+$record.ownerId+'.txt')
    $stamp=Get-Item -LiteralPath $heartbeat -ErrorAction SilentlyContinue
    $guardStamp=Get-Item -LiteralPath ($heartbeat+'.guard') -ErrorAction SilentlyContinue
    $suspectFile=Join-Path $stateDir 'recovery-suspect.json'
    # Two independent observations prevent a sleep/wake gap from killing a healthy owner.
    if(($stamp -and ((Get-Date)-$stamp.LastWriteTime).TotalSeconds -lt 90) -or ($guardStamp -and ((Get-Date)-$guardStamp.LastWriteTime).TotalSeconds -lt 90)){
     Remove-Item -LiteralPath $suspectFile -Force -ErrorAction SilentlyContinue;return
    }
    $key=[string]$record.ownerId+'|'+$owner.StartTime.ToUniversalTime().ToString('o')+'|'+$(if($stamp){$stamp.LastWriteTimeUtc.Ticks}else{'missing'})
    $suspect=$null;try{$suspect=Get-Content -LiteralPath $suspectFile -Raw -ErrorAction Stop | ConvertFrom-Json}catch{}
    if(-not $suspect -or $suspect.key -ne $key -or ((Get-Date)-[DateTime]$suspect.since).TotalSeconds -lt 45){
     if(-not $suspect -or $suspect.key -ne $key){@{key=$key;since=(Get-Date).ToString('o')} | ConvertTo-Json | Set-Content -LiteralPath $suspectFile -Encoding UTF8}
     return
    }
    Stop-Process -Id $record.ownerId -Force -ErrorAction Stop
   }
  }else{
   # Legacy records have no ownership; never interfere with an active Hive instance.
   $active=Get-CimInstance Win32_Process | Where-Object {$_.Name -eq 'HiveDesktop.exe' -or ($_.Name -eq 'electron.exe' -and $_.CommandLine -match 'glass-hive-desktop' -and $_.CommandLine -notmatch '--type=')}
   if($active){return}
  }
 }
}
$desktopList = Get-DesktopListView
if($Mode -eq 'Inspect'){@{available=($desktopList -ne [IntPtr]::Zero);iconsVisible=($desktopList -ne [IntPtr]::Zero -and [GlassHiveWin32]::IsWindowVisible($desktopList));recoveryState=(Test-Path -LiteralPath $stateFile)} | ConvertTo-Json -Compress;exit}
if ($desktopList -eq [IntPtr]::Zero) { throw 'Explorer desktop icon layer is unavailable; recovery state retained.' }
if ($Mode -eq 'Apply') {
  $wasVisible = $true
  if ($desktopList -ne [IntPtr]::Zero) { $wasVisible = [GlassHiveWin32]::IsWindowVisible($desktopList) }
  if (-not (Test-Path -LiteralPath $stateFile)) {
    $saved=@{ desktopIconsWereVisible = $wasVisible; appliedAt = (Get-Date).ToString('o') }
  }else{
    $saved=Get-Content -LiteralPath $stateFile -Raw | ConvertFrom-Json
    if($saved.desktopIconsWereVisible -isnot [bool]){throw 'Invalid recovery state; native icons were not changed.'}
  }
  if($OwnerId){$owner=Get-Process -Id $OwnerId -ErrorAction Stop;if($owner.Path -ne $OwnerExecutable){throw 'Desktop owner identity mismatch.'}}
  $next=@{desktopIconsWereVisible=[bool]$saved.desktopIconsWereVisible;appliedAt=(Get-Date).ToString('o');ownerId=$OwnerId;ownerExecutable=$OwnerExecutable}
  $next | ConvertTo-Json | Set-Content -LiteralPath ($stateFile+'.tmp') -Encoding UTF8
  Move-Item -LiteralPath ($stateFile+'.tmp') -Destination $stateFile -Force
  if ($desktopList -ne [IntPtr]::Zero) { [GlassHiveWin32]::ShowWindow($desktopList, 0) | Out-Null }
  if ([GlassHiveWin32]::IsWindowVisible($desktopList)) { throw 'Failed to hide desktop icons.' }
  Set-TaskbarAccent $true
  Write-Output 'Glass Hive system style applied.'
} else {
  $restoreIcons = $true
  if (Test-Path -LiteralPath $stateFile) {
    try { $saved = Get-Content -LiteralPath $stateFile -Raw | ConvertFrom-Json; if($null -ne $saved.desktopIconsWereVisible){$restoreIcons = [bool]$saved.desktopIconsWereVisible} } catch { $restoreIcons = $true }
  }
  if ($desktopList -ne [IntPtr]::Zero) { [GlassHiveWin32]::ShowWindow($desktopList, $(if ($restoreIcons) { 5 } else { 0 })) | Out-Null }
  if ([GlassHiveWin32]::IsWindowVisible($desktopList) -ne $restoreIcons) { throw 'Desktop icon restoration could not be verified; recovery state retained.' }
  Set-TaskbarAccent $false
  if(Test-Path -LiteralPath $stateFile){Remove-Item -LiteralPath $stateFile -Force}
  Remove-Item -LiteralPath (Join-Path $stateDir 'recovery-suspect.json') -Force -ErrorAction SilentlyContinue
  Write-Output 'Windows desktop restored.'
}
} finally {if($styleLocked){$styleMutex.ReleaseMutex()};$styleMutex.Dispose()}
