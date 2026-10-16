param([long]$WindowHandle,[switch]$Inspect,[switch]$Release,[ValidateRange(30,400)][int]$HoldMs=80,[ValidateSet('None','D','A','W','S','Space','DW','DS')][string]$TestKey='None',[switch]$Serve)
$ErrorActionPreference='Stop'
Add-Type @'
using System;using System.Runtime.InteropServices;using System.Threading;
public static class HiveGameFocus {
 [DllImport("user32.dll")] static extern IntPtr GetParent(IntPtr h);
 [DllImport("user32.dll")] static extern IntPtr SetParent(IntPtr h,IntPtr p);
 [DllImport("user32.dll")] static extern int GetWindowLong(IntPtr h,int index);
 [DllImport("user32.dll")] static extern int SetWindowLong(IntPtr h,int index,int value);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)] static extern bool SetProp(IntPtr h,string key,IntPtr value);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)] static extern IntPtr GetProp(IntPtr h,string key);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)] static extern IntPtr RemoveProp(IntPtr h,string key);
 [DllImport("user32.dll")] static extern bool GetWindowRect(IntPtr h,out RECT r);
 [DllImport("user32.dll")] static extern bool SetWindowPos(IntPtr h,IntPtr after,int x,int y,int w,int height,uint flags);
 [DllImport("user32.dll")] static extern bool ScreenToClient(IntPtr h,ref POINT p);
 [DllImport("user32.dll")] static extern IntPtr SetThreadDpiAwarenessContext(IntPtr c);
 [StructLayout(LayoutKind.Sequential)] struct POINT {public int x,y;}
 public static void Detach(IntPtr h){SetThreadDpiAwarenessContext(new IntPtr(-4));if(GetProp(h,"HiveGameParent")!=IntPtr.Zero)return;IntPtr parent=GetParent(h);if(parent==IntPtr.Zero)return;RECT r;GetWindowRect(h,out r);SetProp(h,"HiveGameParent",parent);SetProp(h,"HiveGameStyle",new IntPtr(GetWindowLong(h,-16)));SetParent(h,IntPtr.Zero);SetWindowLong(h,-16,(GetWindowLong(h,-16)&~0x40000000)|unchecked((int)0x80000000));SetWindowPos(h,IntPtr.Zero,r.l,r.t,r.r-r.l,r.b-r.t,0x20|0x40);}
 public static bool Restore(long handle){SetThreadDpiAwarenessContext(new IntPtr(-4));var h=new IntPtr(handle);var parent=GetProp(h,"HiveGameParent");if(parent==IntPtr.Zero)return true;RECT r;GetWindowRect(h,out r);SetWindowLong(h,-16,GetProp(h,"HiveGameStyle").ToInt32());SetParent(h,parent);if(GetParent(h)!=parent)return false;POINT p=new POINT{x=r.l,y=r.t};ScreenToClient(parent,ref p);SetWindowPos(h,IntPtr.Zero,p.x,p.y,r.r-r.l,r.b-r.t,0x10|0x20|0x40);RemoveProp(h,"HiveGameParent");RemoveProp(h,"HiveGameStyle");return true;}
 [DllImport("user32.dll")] static extern IntPtr GetAncestor(IntPtr h,uint flags);
 [DllImport("user32.dll")] static extern bool IsChild(IntPtr parent,IntPtr child);
 [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
 [DllImport("user32.dll")] static extern bool SetForegroundWindow(IntPtr h);
 [DllImport("user32.dll")] static extern IntPtr SetFocus(IntPtr h);
 [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr h,out uint process);
 [DllImport("kernel32.dll")] static extern uint GetCurrentThreadId();
 [DllImport("user32.dll")] static extern bool AttachThreadInput(uint a,uint b,bool attach);
 [StructLayout(LayoutKind.Sequential)] struct RECT {public int l,t,r,b;}
 [StructLayout(LayoutKind.Sequential)] struct GUI {public int size;public uint flags;public IntPtr active,focus,capture,menu,move,caret;public RECT rect;}
 [DllImport("user32.dll")] static extern bool GetGUIThreadInfo(uint thread,ref GUI info);
 [DllImport("user32.dll")] static extern void keybd_event(byte key,byte scan,uint flags,UIntPtr extra);
 [DllImport("user32.dll")] static extern uint MapVirtualKey(uint code,uint type);
 public static bool Check(long handle){IntPtr h=new IntPtr(handle);uint pid;var thread=GetWindowThreadProcessId(h,out pid);var info=new GUI{size=Marshal.SizeOf(typeof(GUI))};if(!GetGUIThreadInfo(thread,ref info))return false;var foreground=GetForegroundWindow();return (foreground==h||foreground==GetAncestor(h,2))&&(info.focus==h||IsChild(h,info.focus));}
 public static bool Activate(long handle){IntPtr h=new IntPtr(handle);Detach(h);uint pid;uint current=GetCurrentThreadId(),target=GetWindowThreadProcessId(h,out pid);bool attached=false;try{SetForegroundWindow(h);if(current!=target)attached=AttachThreadInput(current,target,true);SetFocus(h);}finally{if(attached)AttachThreadInput(current,target,false);}Thread.Sleep(80);return Check(handle);}
 public static bool FocusDesktop(long handle){IntPtr h=new IntPtr(handle),root=GetAncestor(h,2),parent=GetParent(h);if(parent==IntPtr.Zero)return false;uint pid,current=GetCurrentThreadId(),target=GetWindowThreadProcessId(h,out pid),host=GetWindowThreadProcessId(root,out pid);bool a=false,b=false;try{SetForegroundWindow(root);if(current!=target)a=AttachThreadInput(current,target,true);if(host!=target&&current!=host)b=AttachThreadInput(current,host,true);SetFocus(h);}finally{if(b)AttachThreadInput(current,host,false);if(a)AttachThreadInput(current,target,false);}return GetParent(h)==parent&&Check(handle);}
 public static long Parent(long handle){return GetParent(new IntPtr(handle)).ToInt64();}
 public static bool Test(long handle,byte key,int hold,bool chord){if(!Check(handle))return false;byte scan=(byte)MapVirtualKey(key,0);if(chord)keybd_event(68,(byte)MapVirtualKey(68,0),0,UIntPtr.Zero);keybd_event(key,scan,0,UIntPtr.Zero);try{Thread.Sleep(hold);}finally{keybd_event(key,scan,2,UIntPtr.Zero);if(chord)keybd_event(68,(byte)MapVirtualKey(68,0),2,UIntPtr.Zero);}return true;}
}
'@
if($Serve){
 while($null -ne ($line=[Console]::ReadLine())){
  try{$request=$line|ConvertFrom-Json;$handle=[long]$request.handle;$parentBefore=[HiveGameFocus]::Parent($handle);$ok=switch($request.action){'desktop'{[HiveGameFocus]::FocusDesktop($handle)}'focus'{[HiveGameFocus]::Activate($handle)}'release'{[HiveGameFocus]::Restore($handle)}'inspect'{[HiveGameFocus]::Check($handle)}default{$false}};[Console]::WriteLine((@{ok=[bool]$ok;parentBefore=$parentBefore;parentAfter=[HiveGameFocus]::Parent($handle)}|ConvertTo-Json -Compress))}catch{[Console]::WriteLine('{"ok":false}')}
 }
 exit
}
if($Release){$ok=[HiveGameFocus]::Restore($WindowHandle)}elseif($TestKey -ne 'None'){$key=if($TestKey -eq 'Space'){32}else{[int][char]$TestKey.Substring($TestKey.Length-1)};$ok=[HiveGameFocus]::Test($WindowHandle,[byte]$key,$HoldMs,($TestKey -eq 'DW' -or $TestKey -eq 'DS'))}elseif($Inspect){$ok=[HiveGameFocus]::Check($WindowHandle)}else{$ok=[HiveGameFocus]::Activate($WindowHandle)}
@{ok=$ok}|ConvertTo-Json -Compress
