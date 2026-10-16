param([long]$WindowHandle, [int]$X, [int]$Y, [int]$Width, [int]$Height)
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
 [DllImport("user32.dll")] static extern int GetWindowLong(IntPtr h, int i);
 [DllImport("user32.dll")] static extern int SetWindowLong(IntPtr h, int i, int v);
 [DllImport("user32.dll")] static extern bool GetWindowRect(IntPtr h, out RECT r);
 [DllImport("user32.dll")] static extern bool ScreenToClient(IntPtr h, ref POINT p);
 [DllImport("user32.dll")] static extern bool SetWindowPos(IntPtr h, IntPtr after, int x, int y, int w, int height, uint flags);
 [DllImport("user32.dll")] static extern IntPtr SetThreadDpiAwarenessContext(IntPtr context);
 [StructLayout(LayoutKind.Sequential)] struct RECT { public int L,T,R,B; }
 [StructLayout(LayoutKind.Sequential)] struct POINT { public int X,Y; }
 public static long Attach(long handle, int x, int y, int width, int height) {
   SetThreadDpiAwarenessContext(new IntPtr(-4));
   IntPtr host=IntPtr.Zero, h=new IntPtr(handle);
   EnumWindows((w,l)=> { if(FindWindowEx(w,IntPtr.Zero,"SHELLDLL_DefView",null)!=IntPtr.Zero) {host=w;return false;} return true; },IntPtr.Zero);
   if(host==IntPtr.Zero) throw new Exception("Explorer desktop host was not found.");
   RECT r; GetWindowRect(h,out r);
   int style=GetWindowLong(h,-16);
   SetWindowLong(h,-16,(style & ~unchecked((int)0x80000000)) | 0x40000000);
   SetParent(h,host);
   if(GetParent(h)!=host) { SetWindowLong(h,-16,style); throw new Exception("Desktop parenting failed."); }
   POINT p=new POINT {X=width>0?x:r.L,Y=height>0?y:r.T}; ScreenToClient(host,ref p);
   SetWindowPos(h,IntPtr.Zero,p.X,p.Y,width>0?width:r.R-r.L,height>0?height:r.B-r.T,0x10|0x20|0x40);
   return host.ToInt64();
 }
}
'@
[DesktopHost]::Attach($WindowHandle, $X, $Y, $Width, $Height)
