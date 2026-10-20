'use strict';
const fs=require('fs'),os=require('os'),path=require('path'),assert=require('assert'),{spawnSync}=require('child_process');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'hive-hidden-'));
try{
 const dir=path.join(root,'中文路径');fs.mkdirSync(dir);
 const launcher=path.join(dir,'fallback-recovery-hidden.vbs');
 fs.copyFileSync(path.join(__dirname,'fallback-recovery-hidden.vbs'),launcher);
 fs.writeFileSync(path.join(dir,'fallback-recovery.ps1'),"Set-Content -LiteralPath (Join-Path $PSScriptRoot 'ran.txt') -Value 'ran'\nexit 37\n");
 const invoke=()=>spawnSync(path.join(process.env.WINDIR,'System32','wscript.exe'),['//B','//NoLogo',launcher],{env:{...process.env,LOCALAPPDATA:root},windowsHide:true,timeout:15000});
 let r=invoke();assert.ifError(r.error);assert.equal(r.status,0);assert(!fs.existsSync(path.join(dir,'ran.txt')));
 fs.mkdirSync(path.join(root,'GlassHiveDesktop'));fs.writeFileSync(path.join(root,'GlassHiveDesktop','system-state.json'),'{}');
 r=invoke();assert.ifError(r.error);assert.equal(r.status,37);assert(fs.existsSync(path.join(dir,'ran.txt')));
 const source=fs.readFileSync(launcher,'utf8');
 assert(source.includes('shell.Run(command, 0, True)'));
 const task=fs.readFileSync(path.join(__dirname,'recovery-task.ps1'),'utf8');
 assert(task.includes("System32\\wscript.exe"));assert(task.includes('$settings.Enabled=$false'));
 assert(task.includes('$legacyArguments'));assert(task.includes('$existing.Actions.Execute'));
 assert(fs.readFileSync(path.join(__dirname,'../electron-builder.yml'),'utf8').includes('tools/*.vbs'));
 console.log('PASS hidden launcher: no-state short circuit, Unicode path, waited child exit code, migration/disable and package rules');
}finally{fs.rmSync(root,{recursive:true,force:true});}
