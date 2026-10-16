Option Explicit
Dim shell, fso, root, scriptPath, command, result
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
root = fso.GetParentFolderName(WScript.ScriptFullName)
scriptPath = root & "\tools\recover-desktop.ps1"
command = "powershell.exe -NoProfile -ExecutionPolicy Bypass -File " & Chr(34) & scriptPath & Chr(34)
result = shell.Run(command, 0, True)
If result = 0 Then
  MsgBox "Windows desktop restored. HIVE DESKTOP has been stopped.", 64, "HIVE DESKTOP"
Else
  MsgBox "Desktop recovery could not be verified. Please wait for Explorer and retry.", 48, "HIVE DESKTOP"
End If
