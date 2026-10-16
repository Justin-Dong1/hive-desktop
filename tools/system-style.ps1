param(
  [ValidateSet('Apply','Restore','Taskbar','Inspect')]
  [string]$Mode = 'Apply'
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
$desktopList = Get-DesktopListView
if($Mode -eq 'Inspect'){@{available=($desktopList -ne [IntPtr]::Zero);iconsVisible=($desktopList -ne [IntPtr]::Zero -and [GlassHiveWin32]::IsWindowVisible($desktopList));recoveryState=(Test-Path -LiteralPath $stateFile)} | ConvertTo-Json -Compress;exit}
if ($desktopList -eq [IntPtr]::Zero) { throw 'Explorer desktop icon layer is unavailable; recovery state retained.' }
if ($Mode -eq 'Apply') {
  $wasVisible = $true
  if ($desktopList -ne [IntPtr]::Zero) { $wasVisible = [GlassHiveWin32]::IsWindowVisible($desktopList) }
  if (-not (Test-Path -LiteralPath $stateFile)) {
    @{ desktopIconsWereVisible = $wasVisible; appliedAt = (Get-Date).ToString('o') } | ConvertTo-Json | Set-Content -LiteralPath $stateFile -Encoding UTF8
  }
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
  Write-Output 'Windows desktop restored.'
}
