'use strict';
const assert=require('assert'),fs=require('fs'),os=require('os'),path=require('path'),vm=require('vm');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'hive-clock-service-')),handlers={},messages=[],notifications=[];let tick,stop;
class Notice{static isSupported(){return true;}constructor(o){this.options=o;}once(){}on(){}show(){notifications.push(this.options);}close(){}}
const sandbox={module:{exports:{}},require:n=>n==='path'?path:require('./clock-store'),console,setInterval:fn=>{tick=fn;return 1;},clearInterval:()=>{}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'clock-service.js'),'utf8'),sandbox);
sandbox.module.exports({app:{getPath:()=>dir,once:(_e,fn)=>stop=fn},ipcMain:{handle:(name,fn)=>handlers[name]=fn},BrowserWindow:{getAllWindows:()=>[{isDestroyed:()=>false,webContents:{send:()=>{throw Error('closing');}}},{isDestroyed:()=>false,webContents:{send:(_c,s)=>messages.push(s)}}]},Notification:Notice});
const r=handlers['clock:change'](null,{action:'add',kind:'alarm',text:'提醒测试',due:Date.now()+100});assert(r.ok);
setTimeout(()=>{
 tick();assert.equal(notifications.length,1);assert.equal(notifications[0].body,'提醒测试');assert.equal(messages.at(-1).items[0].status,'fired');
 tick();assert.equal(notifications.length,1);assert(handlers['clock:read']().ok);stop();console.log('PASS clock service: IPC, cross-screen broadcast with closing screen, system notification, no duplicate firing');
},150);
