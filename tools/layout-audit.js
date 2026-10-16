'use strict';
const fs=require('fs'),os=require('os'),crypto=require('crypto');
module.exports=(file,store)=>{
 const initial=store.read(),digest=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
 const report={startedAt:new Date().toISOString(),pid:process.pid,estimatedBootAt:new Date(Date.now()-os.uptime()*1000).toISOString(),initialHash:digest(initial),events:[]};
 return function record(event,displays,renderers=[]){
  const current=store.read();report.events.push({event,time:new Date().toISOString(),displays,renderers:renderers.map(r=>{
   if(r.error)return r;
   const expected=initial[r.key]?JSON.parse(initial[r.key]):null;
   return {display:r.display,key:r.key,comparedWithStartup:expected!==null,retained:expected?Object.entries(expected).every(([id,p])=>JSON.stringify(r.placements[id])===JSON.stringify(p)):null};
  }),changedExistingKeys:Object.keys(initial).filter(k=>current[k]!==initial[k]),hash:digest(current)});
  report.events=report.events.slice(-100);fs.writeFileSync(file,JSON.stringify(report,null,2));
 };
};
