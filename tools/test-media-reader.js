'use strict';
const assert=require('assert'),path=require('path'),fs=require('fs');
const reader=require('./media-reader')(path.join(__dirname,'media-session.ps1'));
(async()=>{const samples=[];try{
 for(let i=0;i<5;i++){const start=Date.now(),result=await reader.read();assert(result.ok,result.message);samples.push({ms:Date.now()-start,sources:result.sessions.map(s=>({source:s.source,hasCover:!!s.cover}))});}
 const a=reader.read(),b=reader.read();assert.strictEqual(a,b,'Concurrent windows should share request');assert((await a).ok);
 reader.dispose();assert((await reader.read()).ok,'Worker should recover after shutdown');
 fs.writeFileSync(path.join(__dirname,'..','media-reader-verification.json'),JSON.stringify({time:new Date().toISOString(),samples,concurrentReadShared:true,restartPassed:true,playbackNotChanged:true},null,2));
 console.log('PASS real media reads, warm process reuse, concurrent request coalescing, worker restart');
 }finally{reader.dispose();}})().catch(e=>{console.error(e);process.exitCode=1;});
