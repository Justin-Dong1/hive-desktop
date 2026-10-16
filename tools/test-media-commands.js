const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const handlers={},calls=[];
const fakeExec=(exe,args,options,cb)=>{calls.push(args);cb(null,JSON.stringify({ok:true,sessions:[]}));};
const context={module:{exports:{}},require:name=>name==='child_process'?{execFile:fakeExec}:require(name),console,process:{once(){}}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'island-services.js'),'utf8'),context);
context.module.exports({app:{getPath:()=>__dirname},ipcMain:{handle:(key,fn)=>handlers[key]=fn},BrowserWindow:{getAllWindows:()=>[]},root:path.join(__dirname,'..')});
(async()=>{
 const command=body=>handlers['media:control'](null,body);
 for(const source of ['QQMusic.exe','KuGou.exe','KwMusic.exe','Tencent.QQMusic_test!App']){
  for(const action of ['toggle','previous','next']){
   assert((await command({source,action})).ok);
   const args=calls.at(-1);assert.strictEqual(args[args.indexOf('-Source')+1],source,'Keep exact session ID, never substitute display name');assert.strictEqual(args[args.indexOf('-Action')+1],action);
  }
 }
 for(const [action,value]of [['shuffle',1],['shuffle',0],['repeat',2],['repeat',1],['repeat',0],['seek',65.5]]){
  assert((await command({source:'fake-player',action,value,track:'Test|Artist'})).ok);
  const args=calls.at(-1);assert(args.includes('-Mta'));assert.strictEqual(args[args.indexOf('-Value')+1],String(value));
 }
 const before=calls.length;
 for(const body of [{action:'seek',value:NaN},{action:'seek',value:-1},{action:'seek',value:100},{action:'shuffle',value:2},{action:'repeat',value:3},{action:'delete',value:0}])assert(!(await command({source:'fake-player',...body})).ok);
 assert.strictEqual(calls.length,before);
 console.log('PASS: seek/shuffle/repeat command routing and invalid input rejection (mock transport; no player changed)');
})().catch(e=>{console.error(e);process.exitCode=1;});
