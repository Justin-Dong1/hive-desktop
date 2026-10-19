param([long]$WindowHandle, [int]$X, [int]$Y, [int]$Width, [int]$Height, [switch]$Ensure, [long]$ExpectedParent)
$ErrorActionPreference = 'Stop'
Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class DesktopHost {
 public delegate bool Callback(IntPtr h, IntPtr l);
 [DllImport("user32.dll")] static extern bool EnumWindows(Callback cb, IntPtr l);
 [DllImport("user32.dll", CharSet=CharSet.Unicode)] static extern IntPtr FindWindowEx(IntPtr p, IntPtr a, string c, string t);
 [DllImport("user32.dll", SetLastError=true)] static extern IntPtr SetParent(IntPtr h, IntPtr p);
 [DllImport("user32.dll")] static extern IntPtr GetParent(IntPtr h);
 [DllImport("user32.dll")] static extern bool IsWindow(IntPtr h);
 [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr h);
 [DllImport("user32.dll")] static extern IntPtr GetWindow(IntPtr h, uint command);
 [DllImport("user32.dll")] static extern int GetWindowLong(IntPtr h, int i);
 [DllImport("user32.dll")] static extern int SetWindowLong(IntPtr h, int i, int v);
 [DllImport("user32.dll")] static extern bool GetWindowRect(IntPtr h, out RECT r);
 [DllImport("user32.dll")] static extern bool ScreenToClient(IntPtr h, ref POINT p);
 [DllImport("user32.dll")] static extern bool SetWindowPos(IntPtr h, IntPtr after, int x, int y, int w, int height, uint flags);
 [DllImport("user32.dll")] static extern IntPtr SetThreadDpiAwarenessContext(IntPtr context);
 [StructLayout(LayoutKind.Sequential)] struct RECT { public int L,T,R,B; }
 [StructLayout(LayoutKind.Sequential)] struct POINT { public int X,Y; }
 public static long Attach(long handle, int x, int y, int width, int height, bool ensure, long expectedParent) {
   SetThreadDpiAwarenessContext(new IntPtr(-4));
   IntPtr host=IntPtr.Zero, h=new IntPtr(handle);
   EnumWindows((w,l)=> { if(FindWindowEx(w,IntPtr.Zero,"SHELLDLL_DefView",null)!=IntPtr.Zero) {host=w;return false;} return true; },IntPtr.Zero);
   if(host==IntPtr.Zero) throw new Exception("Explorer desktop host was not found.");
   if(!IsWindow(h)) throw new Exception("Hive window no longer exists.");
   if(!IsWindowVisible(host)) throw new Exception("Explorer desktop host is hidden.");
   bool aboveDesktop=false;
   IntPtr view=FindWindowEx(host,IntPtr.Zero,"SHELLDLL_DefView",null);
   for(IntPtr child=GetWindow(host,5);child!=IntPtr.Zero;child=GetWindow(child,2)) {
     if(child==h) {aboveDesktop=true;break;}
     if(child==view) break;
   }
   // Healthy windows are left untouched: no repeated SetParent/ShowWindow flicker.
   if(ensure && GetParent(h)==host && expectedParent==host.ToInt64() && IsWindowVisible(h) && aboveDesktop) return host.ToInt64();
   RECT r; GetWindowRect(h,out r);
   int style=GetWindowLong(h,-16);
   SetWindowLong(h,-16,(style & ~unchecked((int)0x80000000)) | 0x40000000);
   if(GetParent(h)!=host) SetParent(h,host);
   if(GetParent(h)!=host) { SetWindowLong(h,-16,style); throw new Exception("Desktop parenting failed."); }
   POINT p=new POINT {X=width>0?x:r.L,Y=height>0?y:r.T}; ScreenToClient(host,ref p);
   SetWindowPos(h,IntPtr.Zero,p.X,p.Y,width>0?width:r.R-r.L,height>0?height:r.B-r.T,0x10|0x20|0x40);
   if(GetParent(h)!=host || !IsWindowVisible(h)) throw new Exception("Desktop attachment verification failed.");
   return host.ToInt64();
 }
}
'@
[DesktopHost]::Attach($WindowHandle, $X, $Y, $Width, $Height, [bool]$Ensure, $ExpectedParent)
