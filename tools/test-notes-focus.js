'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),vm=require('vm'),{EventEmitter}=require('events');
const children=[],timers=new Set();
function spawn(){const c=new EventEmitter();c.stdout=new EventEmitter();c.stdout.setEncoding=()=>{};c.stderr={resume(){}};c.stdin=new EventEmitter();c.writes=[];c.stdin.write=x=>c.writes.push(x);c.kill=()=>{c.killed=true;};children.push(c);return c;}
const ctx={module:{exports:{}},require:name=>name==='child_process'?{spawn}:require(name),setTimeout:fn=>{timers.add(fn);return fn;},clearTimeout:fn=>timers.delete(fn)};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'notes-focus.js'),'utf8'),ctx);
const service=ctx.module.exports('fixture.ps1'),tick=()=>new Promise(setImmediate);
(async()=>{
 const a=service.request('1','desktop'),b=service.request('2','desktop');await tick();assert.equal(children.length,1);assert.equal(children[0].writes.length,1);
 service.stop();assert.equal((await a).ok,false);assert.equal((await b).ok,false);assert.equal(children.length,1,'Stopped queue must not respawn');assert.equal(timers.size,0);
 let p=service.request('3','desktop');await tick();let c=children.at(-1);children[0].stdout.emit('data','{"ok":true}\n');c.stdout.emit('data','\uFEFF{"ok":');c.stdout.emit('data','true}\n');assert.equal((await p).ok,true);
 for(const bad of ['null\n','{"ok":"true"}\n','invalid\n','x'.repeat(65537)]){
  p=service.request('3','desktop');await tick();c=children.at(-1);c.stdout.emit('data',bad);assert.equal((await p).ok,false);assert(c.killed);assert.equal(timers.size,0);
 }
 p=service.request('4','desktop');await tick();[...timers][0]();assert.equal((await p).ok,false);
 p=service.request('5','desktop');await tick();children.at(-1).stdout.emit('data','{"ok":true}\n');assert.equal((await p).ok,true);
 service.stop();service.start();children.at(-1).stdin.write=()=>{throw Error('Pipe closed');};assert.equal((await service.request('6','desktop')).ok,false);assert.equal(timers.size,0);service.stop();
 console.log('PASS focus queue cancellation, restart, stale child isolation, BOM/split replies, invalid/oversized data, timeout and write failure');
})().catch(e=>{console.error(e);process.exitCode=1;});
