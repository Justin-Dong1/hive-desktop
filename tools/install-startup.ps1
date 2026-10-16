$ErrorActionPreference = 'Stop'
$hiveRoot = Split-Path $PSScriptRoot -Parent
$launcher = Join-Path $hiveRoot (([char]0x542F).ToString() + [char]0x52A8 + [char]0x73BB + [char]0x7483 + [char]0x8702 + [char]0x7A9D + [char]0x684C + [char]0x9762 + '.vbs')
$linkName = ([char]0x73BB).ToString() + [char]0x7483 + [char]0x8702 + [char]0x7A9D + [char]0x684C + [char]0x9762 + '.lnk'
$legacyLinkName = $linkName
$linkName = ([char]0x8702).ToString() + [char]0x5DE2 + [char]0x684C + [char]0x9762 + '.lnk'
$shell = New-Object -ComObject WScript.Shell
foreach ($folder in @('Desktop', 'Startup')) {
    $linkPath = Join-Path ([Environment]::GetFolderPath($folder)) $linkName
    $legacyPath = Join-Path ([Environment]::GetFolderPath($folder)) $legacyLinkName
    if ((Test-Path -LiteralPath $legacyPath) -and -not (Test-Path -LiteralPath $linkPath)) {
        $legacyLink = $shell.CreateShortcut($legacyPath)
        if ($legacyLink.Arguments -like ('*' + $launcher + '*')) { Rename-Item -LiteralPath $legacyPath -NewName $linkName }
    }
    if (Test-Path -LiteralPath $linkPath) {
        $existing = $shell.CreateShortcut($linkPath)
        if ($existing.Arguments -notlike ('*' + $launcher + '*')) { throw "An unrelated shortcut already exists: $linkPath" }
    }
    $link = $shell.CreateShortcut($linkPath)
    $link.TargetPath = Join-Path $env:WINDIR 'System32\wscript.exe'
    $link.Arguments = '"' + $launcher + '"'
    if ($folder -eq 'Startup') { $link.Arguments += ' --startup' }
    $link.WorkingDirectory = $hiveRoot
    $link.IconLocation = (Join-Path $env:WINDIR 'System32\imageres.dll') + ',110'
    $link.Description = 'HIVE DESKTOP - start desktop and Wallpaper Engine'
    $link.WindowStyle = 7
    $link.Save()
    Write-Output $linkPath
}
