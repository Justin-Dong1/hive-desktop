param([string]$ConfigRoot)
. (Join-Path $PSScriptRoot 'wallpaper-optional.ps1')
$result=Start-OptionalWallpaper -Root $ConfigRoot
if($result -eq 'start-requested'){
 $deadline=(Get-Date).AddSeconds(8)
 while((Get-Date) -lt $deadline -and -not (Get-Process wallpaper32,wallpaper64 -ErrorAction SilentlyContinue)){Start-Sleep -Milliseconds 400}
 $result=if(Get-Process wallpaper32,wallpaper64 -ErrorAction SilentlyContinue){'started'}else{'start-unconfirmed'}
}
Write-Output $result
