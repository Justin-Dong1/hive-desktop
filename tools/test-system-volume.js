'use strict';
const assert=require('assert');let handler;const calls=[],callbacks=[];
require('./system-volume')({root:__dirname,ipcMain:{handle:(_n,h)=>handler=h},execFile:(exe,args,opts,cb)=>{calls.push(args);callbacks.push(cb);}});
(async()=>{
 assert.equal(handler(null,'set',101).ok,false);assert.equal(handler(null,'set',NaN).ok,false);assert.equal(handler(null,'bad').ok,false);
 const read=handler(null,'get'),duplicate=handler(null,'get');assert.strictEqual(read,duplicate);await new Promise(setImmediate);assert.equal(calls.length,1);
 callbacks.shift()(null,JSON.stringify({ok:true,volume:42,muted:false,device:'test'}));assert.equal((await read).volume,42);
 const set=handler(null,'set',38),next=handler(null,'get');await new Promise(setImmediate);assert.equal(calls.length,2);assert.deepEqual(calls[1].slice(-4),['-Mode','set','-Value','38']);
 callbacks.shift()(null,JSON.stringify({ok:true,volume:38,muted:false,device:'test'}));assert((await set).ok);await new Promise(setImmediate);assert.equal(calls.length,3);
 callbacks.shift()(Error('device disconnected'),'');assert.equal((await next).ok,false);
 console.log('PASS system volume: bounds, invalid commands, shared reads, serialized writes and device failure');
})().catch(e=>{console.error(e);process.exitCode=1;});
