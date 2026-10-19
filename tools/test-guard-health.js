'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const text=fs.readFileSync(path.join(__dirname,'../main.js'),'utf8');
const begin=text.indexOf('  let lastHealth=Date.now(),resumeUntil=0;');
const end=text.indexOf('  },3000);',begin)+'  },3000);'.length;
function setup(){
 let now=100000,stamp=now,tick,resume;const failures=[],health={ready:true,last:now,created:now};
 const c={Date:{now:()=>now},fs:{writeFileSync(){},statSync(){return {mtimeMs:stamp};}},heartbeat:'test',rendererHealth:new Map([[1,health]]),failure:r=>failures.push(r),require:()=>({powerMonitor:{on:(_e,fn)=>resume=fn}}),setInterval:fn=>{tick=fn;return 1;}};
 vm.runInNewContext(text.slice(begin,end),c);
 return {failures,health,tick:()=>tick(),resume:()=>resume(),time:n=>now=n,stamp:n=>stamp=n};
}
let s=setup();s.tick();assert.equal(s.failures.length,0);s.time(103000);s.stamp(0);s.tick();assert(s.failures[0].includes('Watchdog heartbeat lost'));
s=setup();s.time(1000000);s.stamp(0);s.tick();assert.equal(s.failures.length,0);assert.equal(s.health.last,1000000);
s.time(1003000);s.tick();assert.equal(s.failures.length,0);
s.time(1004000);s.resume();assert.equal(s.health.last,1004000);
console.log('PASS guard loss fails safe; sleep/scheduling gap and resume reset renderer timeout with grace');
