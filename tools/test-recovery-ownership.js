'use strict';
// Exercise the actual PowerShell ownership gate without invoking desktop APIs
// or stopping real processes. All recovery records are isolated in a temp dir.
const {spawnSync}=require('child_process');
const path=require('path');
const script=String.raw`
$ErrorActionPreference='Stop'
$ProgressPreference='SilentlyContinue'
$source=Get-Content -LiteralPath '${path.join(__dirname,'system-style.ps1').replace(/'/g,"''")}' -Raw
$start=$source.IndexOf("if(`+'`'+String.raw`$Mode -eq 'Restore' -and")
$end=$source.IndexOf('$desktopList = Get-DesktopListView',$start)
$gate=[scriptblock]::Create($source.Substring($start,$end-$start))
$stateDir=Join-Path ([IO.Path]::GetTempPath()) ('hive-recovery-test-'+[Guid]::NewGuid())
$priorAppData=$env:APPDATA
New-Item -ItemType Directory -Path $stateDir | Out-Null
$env:APPDATA=$stateDir
$stateFile=Join-Path $stateDir 'system-state.json'
$heartbeatDir=Join-Path $stateDir 'glass-hive-desktop'
New-Item -ItemType Directory -Path $heartbeatDir | Out-Null
$heartbeat=Join-Path $heartbeatDir 'heartbeat-42.txt'
$Mode='Restore';$ExpectedOwnerId=0;$OrphanOnly=$true
$script:stopped=0;$script:alive=$true
$script:fakeStart=(Get-Date).AddHours(-2)
function Get-Process {param($Id) if($script:alive){[pscustomobject]@{Path='fixture.exe';StartTime=$script:fakeStart}}}
function Stop-Process {param($Id,[switch]$Force) if($Id -ne 42){throw 'Wrong owner'};$script:stopped++}
function Assert($ok,$message){if(-not $ok){throw $message}}
function Write-State {
 @{ownerId=42;ownerExecutable='fixture.exe';appliedAt=(Get-Date).AddHours(-1).ToString('o');desktopIconsWereVisible=$true} | ConvertTo-Json | Set-Content -LiteralPath $stateFile
 (Get-Item -LiteralPath $stateFile).LastWriteTime=(Get-Date).AddMinutes(-10)
}
try {
 Write-State
 $ExpectedOwnerId=99;$OrphanOnly=$false
 $result=& $gate
 Assert ($result -match 'New owner') 'Old watchdog must not restore new owner'
 Assert ($script:stopped -eq 0) 'Old watchdog stopped owner'
 $ExpectedOwnerId=0;$OrphanOnly=$true
 'alive' | Set-Content -LiteralPath $heartbeat
 $null=& $gate
 Assert (-not (Test-Path (Join-Path $stateDir 'recovery-suspect.json'))) 'Fresh heartbeat marked suspect'
 (Get-Item -LiteralPath $heartbeat).LastWriteTime=(Get-Date).AddMinutes(-10)
 $null=& $gate
 $suspectFile=Join-Path $stateDir 'recovery-suspect.json'
 Assert (Test-Path $suspectFile) 'Stale owner was not marked suspect'
 Assert ($script:stopped -eq 0) 'First observation killed owner'
 $null=& $gate
 Assert ($script:stopped -eq 0) 'Second observation without grace killed owner'
 $suspect=Get-Content $suspectFile -Raw | ConvertFrom-Json
 $suspect.since=(Get-Date).AddMinutes(-2).ToString('o')
 $suspect | ConvertTo-Json | Set-Content $suspectFile
 $null=& $gate
 Assert ($script:stopped -eq 1) 'Confirmed stale owner was not stopped'
 'resumed' | Set-Content -LiteralPath $heartbeat
 $null=& $gate
 Assert (-not (Test-Path $suspectFile)) 'Resumed heartbeat did not clear suspect'
 Assert ($script:stopped -eq 1) 'Healthy resumed owner stopped'
 Write-Output 'PASS old-owner isolation, fresh heartbeat, stale two-observation grace, confirmed hang and wake recovery'
} finally {
 $env:APPDATA=$priorAppData
 Remove-Item -LiteralPath $stateDir -Recurse -Force
}
`;
const r=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(script,'utf16le').toString('base64')],{encoding:'utf8',timeout:30000});
process.stdout.write(r.stdout||'');process.stderr.write(r.stderr||'');
if(r.error)throw r.error;
process.exitCode=r.status===0?0:1;
