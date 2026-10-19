param([switch]$Startup)
$ErrorActionPreference = 'Stop'
$hiveRoot = Split-Path $PSScriptRoot -Parent
$logPath = Join-Path $hiveRoot 'launch-status.json'
$state = [ordered]@{ time = (Get-Date).ToString('o'); startup = [bool]$Startup; wallpaper = ''; desktop = ''; error = '' }
$mutex = New-Object Threading.Mutex($false, 'Local\GlassHiveDesktopLauncher')
$locked = $false
try {
    try { $locked = $mutex.WaitOne(0) } catch [Threading.AbandonedMutexException] { $locked = $true }
    if (-not $locked) { exit }
    if ($Startup) { Start-Sleep -Seconds 15 }
    $deadline = (Get-Date).AddSeconds(60)
    while (-not (Get-Process explorer -ErrorAction SilentlyContinue)) {
        if ((Get-Date) -gt $deadline) { throw 'Explorer desktop was not available within 60 seconds.' }
        Start-Sleep -Seconds 2
    }
    . (Join-Path $PSScriptRoot 'wallpaper-optional.ps1')
    $state.wallpaper = Start-OptionalWallpaper -Root $hiveRoot
    $hiveExe = Join-Path $hiveRoot 'node_modules\electron\dist\electron.exe'
    $running = Get-CimInstance Win32_Process -Filter "Name = 'electron.exe'" | Where-Object { $_.ExecutablePath -eq $hiveExe -and $_.CommandLine -notmatch '--type=' }
    if ($running) {
        # Deliver Electron's second-instance event instead of silently leaving an invisible owner alone.
        Start-Process -FilePath $hiveExe -ArgumentList ('"' + $hiveRoot + '" --repair-desktop') -WorkingDirectory $hiveRoot -WindowStyle Hidden
        $state.desktop = 'recovery-requested'
    }
    else {
        & (Join-Path $PSScriptRoot 'system-style.ps1') -Mode Restore
        if (-not (Test-Path -LiteralPath $hiveExe)) { throw 'Electron runtime is missing.' }
        $hiveProcess=Start-Process -FilePath $hiveExe -ArgumentList ('"' + $hiveRoot + '"') -WorkingDirectory $hiveRoot -WindowStyle Hidden -PassThru
        $deadline=(Get-Date).AddSeconds(85)
        $ready=$false
        while((Get-Date) -lt $deadline -and -not $hiveProcess.HasExited){
            Start-Sleep -Seconds 1
            try { $status=& (Join-Path $PSScriptRoot 'desktop-status.ps1') | ConvertFrom-Json; if($status.pid -eq $hiveProcess.Id -and $status.ready){$ready=$true;break} } catch {}
            $hiveProcess.Refresh()
        }
        if($ready){$state.desktop='ready'}else{$state.desktop='failed-restored';if(-not $hiveProcess.HasExited){$hiveProcess.Kill()};& (Join-Path $PSScriptRoot 'system-style.ps1') -Mode Restore}
    }
} catch { $state.error = $_.Exception.Message }
finally {
    if ($locked) { $state | ConvertTo-Json | Set-Content -LiteralPath $logPath -Encoding UTF8; $mutex.ReleaseMutex() }
    $mutex.Dispose()
}
