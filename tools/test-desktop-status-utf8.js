'use strict';
const fs=require('fs'),os=require('os'),path=require('path'),assert=require('assert'),{spawnSync}=require('child_process');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'hive-status-'));
const quote=s=>s.replace(/'/g,"''");
try{
 const exe='D:\\测试目录\\蜂巢桌面\\electron.exe';
 const status=path.join(root,'ready.json');
 fs.writeFileSync(status,JSON.stringify({pid:4242,executable:exe,ready:true}),'utf8');
 const script=`
$ErrorActionPreference='Stop'
$ProgressPreference='SilentlyContinue'
[Console]::OutputEncoding=New-Object Text.UTF8Encoding($false)
function Get-Process {param($Id) [pscustomobject]@{Path='${exe}';StartTime=(Get-Date).AddMinutes(-1)}}
function Get-Item {param($LiteralPath) [pscustomobject]@{FullName=$LiteralPath;LastWriteTime=(Get-Date).AddSeconds(-1)}}
function Get-CimInstance {param($ClassName,$Filter) [pscustomobject]@{Name='powershell.exe';CommandLine='powershell.exe -File watchdog.ps1 -OwnerId 4242'}}
function Get-Content {param($LiteralPath,[switch]$Raw,$Encoding)
 if($LiteralPath.EndsWith('.guard')){return '23'}
 if($Encoding){Microsoft.PowerShell.Management\\Get-Content -LiteralPath $LiteralPath -Raw -Encoding $Encoding}
 else{Microsoft.PowerShell.Management\\Get-Content -LiteralPath $LiteralPath -Raw}
}
& '${quote(path.join(__dirname,'desktop-status.ps1'))}' -StatusPath '${quote(status)}'
`;
 const run=()=>{const r=spawnSync('powershell.exe',['-NoProfile','-EncodedCommand',Buffer.from(script,'utf16le').toString('base64')],{encoding:'utf8',windowsHide:true,timeout:15000});assert.ifError(r.error);assert.equal(r.status,0,r.stderr);return JSON.parse(r.stdout);};
 assert.equal(run().ready,true,'PowerShell 5.1 must recognize BOM-less UTF8 Chinese owner path');
 fs.writeFileSync(status,JSON.stringify({pid:4242,executable:'D:\\wrong\\electron.exe',ready:true}));
 assert.equal(run().ready,false,'Wrong executable must still be rejected');
 fs.writeFileSync(status,'{broken');
 assert.equal(run().reason,'status-unavailable');
 console.log('PASS PowerShell 5.1 UTF8 status: Chinese owner recognized, wrong identity and corrupt JSON rejected');
}finally{fs.rmSync(root,{recursive:true,force:true});}
