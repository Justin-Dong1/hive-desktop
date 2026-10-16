Option Explicit
Dim shell, fso, root, exe, command
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
root = fso.GetParentFolderName(WScript.ScriptFullName)
exe = root & "\node_modules\electron\dist\electron.exe"
If Not fso.FileExists(exe) Then
  MsgBox "Runtime is missing. Please run the installer first.", 48, "HIVE DESKTOP"
  WScript.Quit 1
End If
command = "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File " & Chr(34) & root & "\tools\launch.ps1" & Chr(34)
If WScript.Arguments.Count > 0 Then
  If WScript.Arguments(0) = "--startup" Then command = command & " -Startup"
End If
shell.Run command, 0, False
