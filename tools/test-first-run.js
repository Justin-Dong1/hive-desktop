'use strict';
const assert=require('assert'),fs=require('fs'),os=require('os'),path=require('path'),setup=require('./first-run');
(async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'hive-onboarding-test-'));let launches=0,login;
 const app={getPath:()=>dir,setLoginItemSettings:s=>login=s};let responses=[1];
 const dialog={showMessageBox:async()=>({response:responses.shift()}),showOpenDialog:async()=>({canceled:true})};
 const execFile=(exe,args,opts,done)=>{launches++;done(new Error('Wallpaper unavailable'));};
 assert.equal(await setup({app,dialog,execFile,root:__dirname}),false);assert.equal(launches,0);assert(!fs.existsSync(path.join(dir,'installation-settings.json')));
 responses=[0,0,0];assert.equal(await setup({app,dialog,execFile,root:__dirname}),true);assert.equal(login.openAtLogin,false);
 assert.equal(JSON.parse(fs.readFileSync(path.join(dir,'wallpaper.config.json'))).autoStart,false);
 fs.writeFileSync(path.join(dir,'island-notes.json'),'private fixture');fs.writeFileSync(path.join(dir,'desktop-layout.json'),'layout fixture');
 assert.equal(await setup({app,dialog,execFile,root:__dirname}),true);assert.equal(responses.length,0);assert.equal(fs.readFileSync(path.join(dir,'island-notes.json'),'utf8'),'private fixture');assert.equal(fs.readFileSync(path.join(dir,'desktop-layout.json'),'utf8'),'layout fixture');
 console.log('PASS onboarding cancel/manual start/optional wallpaper/relaunch/data retention');
})().catch(e=>{console.error(e);process.exitCode=1;});
