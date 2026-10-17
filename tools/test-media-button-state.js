'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),vm=require('vm');
const queue=require('../ui/media-command-queue').create();
const buttons=Object.fromEntries(['musicToggle','musicPrevious','musicNext'].map(id=>[id,{setAttribute(k,v){this[k]=v;}}]));
const code=fs.readFileSync(path.join(__dirname,'../ui/island-pages.js'),'utf8');
const render=code.split('\n').find(line=>line.includes("button.setAttribute('aria-busy'"));
assert(render,'Test actual renderer button state binding');
let source='QQMusic.exe';const calls=[];
function draw(){vm.runInNewContext(render,{get:id=>buttons[id],s:{toggle:true,previous:true,next:true},controlBusy:action=>queue.busy(source,action)});}
function defer(){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};}
(async()=>{
 draw();const first=defer();
 const a=queue.run(source,'previous',()=>{calls.push('previous');return first.promise;},draw);
 assert(buttons.musicPrevious.disabled);assert(!buttons.musicToggle.disabled);assert(!buttons.musicNext.disabled);
 await queue.run(source,'previous',()=>calls.push('duplicate'),draw);
 const b=queue.run(source,'toggle',()=>calls.push('toggle'),draw);
 assert(buttons.musicPrevious.disabled);assert(buttons.musicToggle.disabled);assert(!buttons.musicNext.disabled);
 await Promise.resolve();assert.deepStrictEqual(calls,['previous']);
 source='KwMusic.exe';draw();assert(Object.values(buttons).every(b=>!b.disabled),'Other source not locked');
 first.resolve();await Promise.all([a,b]);assert.deepStrictEqual(calls,['previous','toggle']);
 const failed=queue.run(source,'next',()=>Promise.reject(Error('test failure')),draw);
 assert(buttons.musicNext.disabled);assert(!buttons.musicToggle.disabled);assert(!buttons.musicPrevious.disabled);
 await assert.rejects(failed);assert(!buttons.musicNext.disabled);
 await queue.run(source,'toggle',()=>calls.push('recovered'),draw);
 assert.strictEqual(calls.at(-1),'recovered');
 assert(Object.values(buttons).every(b=>b['aria-busy']==='false'));
 let executed=false;
 const renderFailure=queue.run(source,'next',()=>{executed=true;},()=>{throw Error('render unavailable');});
 await assert.rejects(renderFailure,/render unavailable/);assert(!executed,'Do not execute when initial state update failed');assert(!queue.busy(source,'next'),'Failed initial render must not lock the button');
 await queue.run(source,'next',()=>{executed=true;},draw);assert(executed,'Same button must be retryable');
 let changes=0;
 await assert.rejects(queue.run(source,'previous',()=>{},()=>{if(++changes===2)throw Error('completion render failed');}),/completion render failed/);
 assert(!queue.busy(source,'previous'));await queue.run(source,'previous',()=>{},draw);
 console.log('PASS actual button bindings: independent pending state, sequential commands, duplicate suppression, source isolation, failure recovery');
})().catch(e=>{console.error(e);process.exitCode=1;});
