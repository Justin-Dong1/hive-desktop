Option Explicit
Dim shell, files, script, state, command, result
Set shell = CreateObject("WScript.Shell")
Set files = CreateObject("Scripting.FileSystemObject")
state = shell.ExpandEnvironmentStrings("%LOCALAPPDATA%") & "\GlassHiveDesktop\system-state.json"
' Avoid even starting a console process when there is nothing to recover.
If Not files.FileExists(state) Then WScript.Quit 0
script = files.BuildPath(files.GetParentFolderName(WScript.ScriptFullName), "fallback-recovery.ps1")
If Not files.FileExists(script) Then WScript.Quit 2
command = Chr(34) & shell.ExpandEnvironmentStrings("%SystemRoot%") & "\System32\WindowsPowerShell\v1.0\powershell.exe" & Chr(34) & _
    " -NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File " & Chr(34) & script & Chr(34)
' Window style 0 is applied at process creation, not after PowerShell starts.
' Wait so Task Scheduler retains overlap prevention and the child exit code.
result = shell.Run(command, 0, True)
WScript.Quit result
