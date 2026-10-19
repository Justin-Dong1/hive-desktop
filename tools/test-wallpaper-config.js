'use strict';
const assert=require('assert'),path=require('path'),{execFileSync}=require('child_process');
const script=path.join(__dirname,'wallpaper-optional.ps1').replace(/'/g,"''");
const result=execFileSync('powershell.exe',['-NoProfile','-Command',`
. '${script}'
$script:userConfig=Join-Path ([Environment]::GetFolderPath('ApplicationData')) 'glass-hive-desktop\\wallpaper.config.json'
$script:hasUser=$true
$script:enabled=$true
$script:readPath=''
$script:started=''
function Get-Process { return $null }
function Test-Path { param($LiteralPath,$PathType) if($LiteralPath -eq $script:userConfig){return $script:hasUser};return $true }
function Get-Content { param($LiteralPath,[switch]$Raw) $script:readPath=$LiteralPath;return ('{"autoStart":'+$script:enabled.ToString().ToLower()+',"executable":"D:\\\\OtherSteam\\\\wallpaper64.exe"}') }
function Start-Process { param($FilePath,$ArgumentList,$WorkingDirectory,$WindowStyle) $script:started=$FilePath }
$a=Start-OptionalWallpaper -Root 'D:\\LegacyHive'
if($a -ne 'start-requested' -or $script:readPath -ne $script:userConfig -or -not $script:started){throw 'User configuration ignored'}
$script:enabled=$false;$script:started=''
$b=Start-OptionalWallpaper -Root 'D:\\LegacyHive'
if($b -ne 'disabled' -or $script:started){throw 'Disabled preference ignored'}
$script:hasUser=$false;$script:enabled=$true
$c=Start-OptionalWallpaper -Root 'D:\\LegacyHive'
if($c -ne 'start-requested' -or $script:readPath -ne 'D:\\LegacyHive\\wallpaper.config.json'){throw 'Legacy fallback failed'}
Write-Output 'PASS user config priority, disabled preference, arbitrary install path, legacy fallback'
`],{encoding:'utf8',windowsHide:true});
assert(result.includes('PASS'));console.log(result.trim());
