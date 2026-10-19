'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const source=fs.readFileSync(path.join(__dirname,'../main.js'),'utf8');
const snippet=source.slice(source.indexOf('async function applyWhenReady()'),source.indexOf('function desktopSignature()'));
(async()=>{
 let resolveStyle,writes=0,audits=0;const win={desktopAttached:true,webContents:{id:1,executeJavaScript:async()=>({})}};
 const context={quitting:false,rebuilding:false,guardReady:true,hostHealthy:true,desktopWindows:new Map([[1,win]]),rendererHealth:new Map([[1,{ready:true}]]),desktopEpoch:1,publishedEpoch:-1,readinessPending:null,styleApplication:null,systemStyled:false,ps:()=>new Promise(r=>resolveStyle=r),fs:{writeFileSync:()=>writes++},path,DATA_ROOT:'test',process:{pid:123,execPath:'hive.exe'},screen:{getAllDisplays:()=>[]},auditLayout:()=>audits++,failure:()=>{throw Error('unexpected failure');}};
 vm.createContext(context);vm.runInContext(snippet,context);
 const old=context.applyWhenReady();context.desktopEpoch++;context.hostHealthy=false;resolveStyle({ok:true});await old;assert.equal(writes,0);assert.equal(audits,0);
 context.hostHealthy=true;context.styleApplication=null;
 const active=context.applyWhenReady(),other=context.applyWhenReady();resolveStyle({ok:true});await Promise.all([active,other]);assert.equal(writes,1);assert.equal(audits,1);
 await context.applyWhenReady();assert.equal(writes,1);
 console.log('PASS stale readiness completion suppressed; concurrent readiness shared; audit emitted once per generation');
})().catch(e=>{console.error(e);process.exitCode=1;});
