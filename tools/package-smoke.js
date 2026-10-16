'use strict';
const fs=require('fs'),path=require('path');
module.exports=async({app,root,execFile})=>{
 const required=['preload.js','ui/index.html','tools/system-style.ps1','tools/watchdog.ps1','tools/recover-desktop.ps1','tools/media-session.ps1','tools/focus-game.ps1','vendor/NAudio-1.10/HiveSpectrum.exe','vendor/NAudio-1.10/NAudio.dll','vendor/NAudio-1.10/LICENSE.txt'];
 for(const file of required)if(!fs.existsSync(path.join(root,file)))throw Error('Missing packaged resource: '+file);
 const result=await new Promise((resolve,reject)=>execFile(path.join(root,'vendor/NAudio-1.10/HiveSpectrum.exe'),['--test'],{windowsHide:true,timeout:15000},(err,out)=>err?reject(err):resolve(out.trim())));
 const report=process.argv.find(a=>a.startsWith('--smoke-report='))?.slice('--smoke-report='.length);
 if(!report)throw Error('Smoke report destination required');
 fs.writeFileSync(report,JSON.stringify({ok:true,version:app.getVersion(),resources:required.length,fft:result,isolatedProfile:true},null,2));
};
