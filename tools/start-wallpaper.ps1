param([string]$ConfigRoot)
. (Join-Path $PSScriptRoot 'wallpaper-optional.ps1')
Start-OptionalWallpaper -Root $ConfigRoot
