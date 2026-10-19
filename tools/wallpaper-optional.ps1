function Start-OptionalWallpaper {
    param([string]$Root)
    try {
        if (Get-Process wallpaper32,wallpaper64 -ErrorAction SilentlyContinue) { return 'already-running' }
        # The installed wizard and source launcher share the same user preference.
        # Keep project-local config as a legacy fallback, never override an explicit disabled preference.
        $configPath = Join-Path ([Environment]::GetFolderPath('ApplicationData')) 'glass-hive-desktop\wallpaper.config.json'
        if (-not (Test-Path -LiteralPath $configPath)) { $configPath = Join-Path $Root 'wallpaper.config.json' }
        if (-not (Test-Path -LiteralPath $configPath)) { return 'optional-not-configured' }
        $config = Get-Content -LiteralPath $configPath -Raw | ConvertFrom-Json
        if ($config.autoStart -ne $true) { return 'disabled' }
        $exe = [string]$config.executable
        if (-not $exe -or -not (Test-Path -LiteralPath $exe -PathType Leaf)) { return 'not-installed' }
        if ([IO.Path]::GetFileName($exe) -notin @('wallpaper32.exe','wallpaper64.exe')) { return 'invalid-executable' }
        Start-Process -FilePath $exe -ArgumentList '-silent' -WorkingDirectory (Split-Path $exe) -WindowStyle Hidden
        return 'start-requested'
    } catch { return 'unavailable' }
}
