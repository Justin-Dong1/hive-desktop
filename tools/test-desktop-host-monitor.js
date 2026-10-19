'use strict';
const assert=require('assert');
const create=require('./desktop-host-monitor');
(async()=>{
 let paused=false,bad=false,restored=0,ready=0,failed=0,inspected=0;
 const win={desktopAttached:true,isDestroyed:()=>false};
 const monitor=create({paused:()=>paused,windows:()=>[win],inspect:async()=>{inspected++;if(bad)throw Error('host lost');},restore:async()=>{restored++;return {ok:true};},ready:async()=>ready++,fail:()=>failed++,log:()=>{}});
 await monitor.check();assert.equal(restored,0);assert.equal(inspected,1);
 paused=true;await monitor.check();assert.equal(inspected,1);paused=false;
 bad=true;await monitor.check();assert.equal(restored,1);assert.equal(failed,0);
 bad=false;await monitor.check();assert.equal(ready,1);
 bad=true;await monitor.check();await monitor.check();await monitor.check();assert.equal(failed,1);
 monitor.stop();await monitor.check();assert.equal(restored,4);
 let release,count=0;
 const concurrent=create({paused:()=>false,windows:()=>[win],inspect:()=>{count++;return new Promise(r=>release=r);},restore:async()=>({ok:true}),ready:async()=>{},fail:()=>{},log:()=>{}});
 const first=concurrent.check();await concurrent.check();assert.equal(count,1);release();await first;
 for(const targets of [[],[{desktopAttached:false,isDestroyed:()=>false}],[{desktopAttached:true,isDestroyed:()=>true}]]){
  let restoredMissing=0,readiedMissing=0;
  const missing=create({paused:()=>false,windows:()=>targets,inspect:async()=>{},restore:async()=>{restoredMissing++;return {ok:true};},ready:async()=>readiedMissing++,fail:()=>{},log:()=>{}});
  await missing.check();assert.equal(restoredMissing,1);assert.equal(readiedMissing,0);
 }
 console.log('PASS desktop host monitor: healthy, paused, restore, retry, fail-safe, stop, no overlap');
})().catch(e=>{console.error(e);process.exitCode=1;});
