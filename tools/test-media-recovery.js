'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),vm=require('vm'),{EventEmitter}=require('events');
const children=[],timers=new Set();let brokenWrite=false;
function spawn(){const c=new EventEmitter();c.stdout=new EventEmitter();c.stdout.setEncoding=()=>{};c.stderr={resume(){}};c.stdin=new EventEmitter();c.stdin.write=()=>{if(brokenWrite)throw Error('Closed pipe');};c.kill=()=>{c.killed=true;};children.push(c);return c;}
const ctx={module:{exports:{}},require:name=>name==='child_process'?{spawn}:require(name),setTimeout:(fn,ms)=>{const t={fn,ms,unref(){}};timers.add(t);return t;},clearTimeout:t=>timers.delete(t)};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'media-reader.js'),'utf8'),ctx);
const reader=ctx.module.exports('fixture.ps1'),good='{"ok":true,"sessions":[{"source":"fixture","playing":true}]}\n';
(async()=>{
 for(const bad of ['null\n','{"ok":true}\n','{"ok":"true","sessions":[]}\n','{"ok":true,"sessions":[null]}\n','{"ok":true,"sessions":[{"source":42,"playing":true}]}\n','not-json\n']){
  const p=reader.read();assert.strictEqual(reader.read(),p);const c=children.at(-1);c.stdout.emit('data',bad);assert.equal((await p).ok,false);assert(c.killed);assert.equal(timers.size,0);
 }
 brokenWrite=true;assert.equal((await reader.read()).ok,false);assert.equal(timers.size,0);brokenWrite=false;
 let p=reader.read(),old=children.at(-1);old.emit('exit');assert.equal((await p).ok,false);
 p=reader.read();const fresh=children.at(-1);old.stdout.emit('data',good);old.emit('error');fresh.stdout.emit('data','\uFEFF'+good.slice(0,10));fresh.stdout.emit('data',good.slice(10));assert.equal((await p).sessions[0].source,'fixture');
 p=reader.read();const timeout=[...timers].find(t=>t.ms===18000);timeout.fn();assert.equal((await p).ok,false);assert.equal(timers.size,0);
 p=reader.read();children.at(-1).stdout.emit('data',good);assert.equal((await p).ok,true);reader.dispose();assert.equal(timers.size,0);
 console.log('PASS media invalid payload rejection, shared pending read, synchronous pipe failure, timeout, stale child isolation and recovery');
})().catch(e=>{console.error(e);process.exitCode=1;});
