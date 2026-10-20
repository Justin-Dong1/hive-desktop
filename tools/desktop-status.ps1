param([string]$StatusPath)
$root=Split-Path $PSScriptRoot -Parent
if(-not $StatusPath){$StatusPath=Join-Path $root 'desktop-ready.json'}
try{
 $s=Get-Content -LiteralPath $StatusPath -Raw -Encoding UTF8 -ErrorAction Stop | ConvertFrom-Json
 $process=Get-Process -Id $s.pid -ErrorAction SilentlyContinue
 $heartbeat=Join-Path ([Environment]::GetFolderPath('ApplicationData')) ('glass-hive-desktop\heartbeat-'+$s.pid+'.txt')
 $stamp=Get-Item -LiteralPath $heartbeat -ErrorAction SilentlyContinue
 $guard=Get-Item -LiteralPath ($heartbeat+'.guard') -ErrorAction SilentlyContinue
 $guardProcess=$null
 if($guard){$guardId=[int](Get-Content -LiteralPath $guard.FullName -Raw);$guardProcess=Get-CimInstance Win32_Process -Filter "ProcessId=$guardId" -ErrorAction SilentlyContinue}
 $now=Get-Date
 $guardMatches=$guardProcess -and $guardProcess.Name -eq 'powershell.exe' -and $guardProcess.CommandLine -like '*watchdog.ps1*' -and $guardProcess.CommandLine -match ("-OwnerId "+$s.pid+"(?: |$)")
 $live=$process -and (!$s.executable -or $process.Path -eq $s.executable) -and $stamp -and $guard -and $guardMatches -and (($now-$stamp.LastWriteTime).TotalSeconds -ge 0) -and (($now-$stamp.LastWriteTime).TotalSeconds -lt 35) -and (($now-$guard.LastWriteTime).TotalSeconds -ge 0) -and (($now-$guard.LastWriteTime).TotalSeconds -lt 20) -and ($process.StartTime -le $stamp.LastWriteTime)
 @{ready=[bool]($s.ready -and $live);pid=$s.pid;reason=$(if($live){'live'}else{'stale-or-exited'});lastReported=$s} | ConvertTo-Json -Depth 4
}catch{@{ready=$false;reason='status-unavailable'} | ConvertTo-Json}
