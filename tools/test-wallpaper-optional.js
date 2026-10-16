'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const root=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(root,'ui/grid-app.js'),'utf8');
const elements={};const classes=new Set();
const toggle=(key,on)=>on?classes.add(key):classes.delete(key);
const context={island:{classList:{toggle}},$:id=>elements[id]??=( {classList:{toggle(){}}} )};
vm.createContext(context);
vm.runInContext(source.slice(source.indexOf('function wallpaperStatus('),source.indexOf('async function status()')),context);
context.wallpaperStatus(false);assert(classes.has('wallpaper-idle'));assert.equal(elements.islandTitle.textContent,'');
context.wallpaperStatus(true);assert(!classes.has('wallpaper-idle'));assert(elements.islandTitle.textContent.includes('Wallpaper Engine'));
context.wallpaperStatus(false);assert.equal(elements.islandTitle.textContent,'');
const main=fs.readFileSync(path.join(root,'main.js'),'utf8');
const fn=main.slice(main.indexOf('function wallpaperEngineStatus()'),main.indexOf('function createWindow('));
(async()=>{for(const [output,error,expected] of [['"wallpaper32.exe"',null,true],['"wallpaper64.exe"',null,true],['"explorer.exe"',null,false],['',new Error('timeout'),false]]){
 const calls=[];const c={execFile:(exe,args,opts,done)=>{assert.equal(exe,'tasklist.exe');assert(['IMAGENAME eq wallpaper32.exe','IMAGENAME eq wallpaper64.exe'].includes(args[1]));calls.push(args[1]);done(error,output.includes(args[1].split(' ').at(-1))?output:'');}};vm.createContext(c);vm.runInContext(fn,c);assert.equal(await c.wallpaperEngineStatus(),expected);assert.equal(new Set(calls).size,2);
}console.log('Wallpaper optional UI and exact process detection: PASS');
if(process.argv.includes('--live')){
 let calls=0;const real=require('child_process').execFile;
 const c={execFile:(exe,args,opts,done)=>real(exe,args,opts,(err,out,stderr)=>{assert.ifError(err);assert(!/ERROR:/i.test(stderr||''));calls++;done(err,out);})};
 vm.createContext(c);vm.runInContext(fn,c);const detected=await c.wallpaperEngineStatus();assert.equal(calls,2);console.log(JSON.stringify({liveWindowsCommandsPassed:true,wallpaperRunning:detected}));
}
})().catch(e=>{console.error(e);process.exitCode=1;});
