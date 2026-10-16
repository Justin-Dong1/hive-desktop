param([int]$X,[int]$Y,[switch]$Cancel)
$ErrorActionPreference='Stop'
Add-Type @'
using System;
using System.Runtime.InteropServices;
public class HiveDesktopMenu {
 public delegate bool Callback(IntPtr w,IntPtr l);
 [DllImport("user32.dll")] static extern bool EnumWindows(Callback c,IntPtr l);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)] static extern IntPtr FindWindowEx(IntPtr p,IntPtr a,string c,string t);
 [DllImport("user32.dll")] static extern bool PostMessage(IntPtr h,uint m,IntPtr w,IntPtr l);
 [DllImport("user32.dll")] static extern IntPtr SendMessageTimeout(IntPtr h,uint m,IntPtr w,IntPtr l,uint flags,uint timeout,out IntPtr result);
 [DllImport("user32.dll")] static extern bool SetForegroundWindow(IntPtr h);
 [DllImport("user32.dll")] static extern IntPtr SetThreadDpiAwarenessContext(IntPtr c);
 [DllImport("user32.dll")] static extern bool ShowWindow(IntPtr h,int cmd);
 [DllImport("user32.dll")] static extern int GetWindowLong(IntPtr h,int i);
 [DllImport("user32.dll")] static extern int SetWindowLong(IntPtr h,int i,int v);
 [DllImport("user32.dll")] static extern bool SetLayeredWindowAttributes(IntPtr h,uint c,byte alpha,uint flags);
 [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr h,out uint pid);
 [DllImport("user32.dll")] static extern bool GetGUIThreadInfo(uint thread,ref GUI info);
 [DllImport("user32.dll")] static extern bool SetCursorPos(int x,int y);
 [DllImport("user32.dll")] static extern void mouse_event(uint f,uint x,uint y,uint data,UIntPtr extra);
 [DllImport("user32.dll")] static extern bool AttachThreadInput(uint a,uint b,bool attach);
 [DllImport("kernel32.dll")] static extern uint GetCurrentThreadId();
 [DllImport("user32.dll")] static extern IntPtr SetFocus(IntPtr h);
 [StructLayout(LayoutKind.Sequential)] struct GUI {public int size;public uint flags;public IntPtr active,focus,capture,menu,move,caret;public int l,t,r,b;}
 public static void Open(int x,int y,bool cancel){
  SetThreadDpiAwarenessContext(new IntPtr(-4));
  IntPtr view=IntPtr.Zero,host=IntPtr.Zero;
  EnumWindows((w,l)=>{var v=FindWindowEx(w,IntPtr.Zero,"SHELLDLL_DefView",null);if(v==IntPtr.Zero)return true;view=v;host=w;return false;},IntPtr.Zero);
  if(view==IntPtr.Zero)throw new Exception("Explorer desktop view not found");
  if(cancel){PostMessage(view,0x001F,IntPtr.Zero,IntPtr.Zero);PostMessage(host,0x001F,IntPtr.Zero,IntPtr.Zero);return;}
  SetForegroundWindow(host);
  IntPtr list=FindWindowEx(view,IntPtr.Zero,"SysListView32","FolderView");
  int style=GetWindowLong(list,-20);
  try{
   SetWindowLong(list,-20,style|0x80000);SetLayeredWindowAttributes(list,0,1,2);ShowWindow(list,5);
   uint pid;uint thread=GetWindowThreadProcessId(view,out pid);
   uint own=GetCurrentThreadId();AttachThreadInput(own,thread,true);SetForegroundWindow(host);SetFocus(list);AttachThreadInput(own,thread,false);
   SetCursorPos(x,y);mouse_event(8,0,0,0,UIntPtr.Zero);mouse_event(16,0,0,0,UIntPtr.Zero);
   System.Threading.Thread.Sleep(700);
   // Modern XAML menus do not consistently set GUITHREADINFO menu flags.
   for(int n=0;n<240;n++){
    var menus=System.Windows.Automation.AutomationElement.RootElement.FindAll(System.Windows.Automation.TreeScope.Descendants,new System.Windows.Automation.AndCondition(new System.Windows.Automation.PropertyCondition(System.Windows.Automation.AutomationElement.ProcessIdProperty,(int)pid),new System.Windows.Automation.PropertyCondition(System.Windows.Automation.AutomationElement.ControlTypeProperty,System.Windows.Automation.ControlType.Menu)));
    bool visible=false;foreach(System.Windows.Automation.AutomationElement menu in menus){try{if(!menu.Current.IsOffscreen){visible=true;break;}}catch{}}
    var g=new GUI();g.size=Marshal.SizeOf(typeof(GUI));GetGUIThreadInfo(thread,ref g);if(!visible&&(g.flags&28)==0&&g.menu==IntPtr.Zero)break;System.Threading.Thread.Sleep(250);
   }
  }finally{ShowWindow(list,0);SetWindowLong(list,-20,style);}
 }
}
'@ -ReferencedAssemblies UIAutomationClient,UIAutomationTypes,WindowsBase
[HiveDesktopMenu]::Open($X,$Y,[bool]$Cancel)
