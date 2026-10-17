'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),vm=require('vm'),{EventEmitter}=require('events');
const children=[],frames=[],ipcMain=new EventEmitter(),app=new EventEmitter();let time=10000;
function spawn(){const child=new EventEmitter();child.stdout=new EventEmitter();child.stdout.setEncoding=()=>{};child.stderr={resume(){}};child.stdin=new EventEmitter();child.stdin.end=()=>{};child.kill=()=>{};children.push(child);return child;}
const context={module:{exports:{}},require:name=>name==='child_process'?{spawn}:require(name),Date:{now:()=>time},process:new EventEmitter(),setInterval:()=>({unref(){}}),clearInterval(){},setTimeout:()=>({unref(){}})};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'spectrum-service.js'),'utf8'),context);
context.module.exports({app,ipcMain,root:__dirname});
const sender={id:1,isDestroyed:()=>false,send:(_,value)=>frames.push(value)},event={sender};
const line=JSON.stringify(Array(24).fill(.5))+'\n';
for(const failure of ['exit','error']){
 ipcMain.emit('spectrum:active',event,true);const old=children.at(-1);
 old.stdout.emit('data','[0.2,');old.emit(failure);assert.strictEqual(frames.at(-1),null);
 ipcMain.emit('spectrum:active',event,true);assert.strictEqual(children.at(-1),old);time+=1000;
 ipcMain.emit('spectrum:active',event,true);const fresh=children.at(-1);assert.notStrictEqual(fresh,old);
 old.stdout.emit('data',line);old.emit('exit');
 fresh.stdout.emit('data',line.slice(0,10));fresh.stdout.emit('data',line.slice(10));
 assert.equal(frames.at(-1).length,24);assert(frames.at(-1).every(x=>x===.5));
 ipcMain.emit('spectrum:active',event,false);
}
ipcMain.emit('spectrum:active',event,true);let old=children.at(-1);
for(const delay of [1000,2000,4000,8000,16000,30000,30000]){
 old.emit('error');time+=delay-1;ipcMain.emit('spectrum:active',event,true);assert.strictEqual(children.at(-1),old);
 time++;ipcMain.emit('spectrum:active',event,true);assert.notStrictEqual(children.at(-1),old);old=children.at(-1);
}
const broken={id:2,isDestroyed:()=>false,send:()=>{throw Error('Window closed during delivery');}};
ipcMain.emit('spectrum:active',{sender:broken},true);old.stdout.emit('data',line);assert.equal(frames.at(-1).length,24);
ipcMain.emit('spectrum:active',{sender:broken},false);const count=children.length;
ipcMain.emit('spectrum:active',event,true);assert.equal(children.length,count,'Remaining screen keeps shared helper');
old.stdin.emit('error');time+=1000;ipcMain.emit('spectrum:active',event,true);assert.notStrictEqual(children.at(-1),old,'Valid frames reset retry delay');
app.emit('will-quit');
console.log('PASS spectrum frame recovery, stale-process isolation, capped backoff, stdin failure and multi-screen delivery isolation');
