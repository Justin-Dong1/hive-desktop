param([string]$Source,[string]$Destination)
$ErrorActionPreference='Stop'
if(-not(Test-Path -LiteralPath $Source)){throw 'Shortcut source does not exist'}
if(Test-Path -LiteralPath $Destination){throw 'Destination already exists'}
$shell=New-Object -ComObject WScript.Shell
$link=$shell.CreateShortcut($Destination)
$link.TargetPath=$Source
$link.WorkingDirectory=[IO.Path]::GetDirectoryName($Source)
$link.Save()
