'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto');
module.exports=function clockStore(file,now=Date.now,monotonic=now===Date.now?()=>require('perf_hooks').performance.now():now){
 const origin=now(),monoOrigin=monotonic();let sleepOffset=0,suspended=null,lastSave=origin,lastWall=origin,lastMono=monoOrigin;
 const durationNow=()=>origin+Math.max(0,monotonic()-monoOrigin)+sleepOffset;
 let state={version:1,items:[],watch:{elapsed:0,started:null}},loadError='';
 try{if(fs.existsSync(file)){
  const s=JSON.parse(fs.readFileSync(file,'utf8'));
  if(s.version!==1||!Array.isArray(s.items)||s.items.length>100||!s.watch||!Number.isFinite(s.watch.elapsed)||s.watch.elapsed<0||(s.watch.started!==null&&!Number.isFinite(s.watch.started)))throw Error('计时数据格式无效');
  const ids=new Set();
  for(const i of s.items){if(!i||typeof i.id!=='string'||ids.has(i.id)||!['alarm','timer'].includes(i.kind)||typeof i.text!=='string'||i.text.length>200||!['running','paused','fired'].includes(i.status)||!Number.isFinite(i.due)||!Number.isFinite(i.remaining)||i.remaining<0)throw Error('提醒数据格式无效');ids.add(i.id);}
  state=s;
 }}catch(e){loadError=e.message;}
 const snapshot=()=>JSON.parse(JSON.stringify(state));
 function project(s){
  const result=JSON.parse(JSON.stringify(s)),wall=now(),duration=durationNow();
  for(const i of result.items)if(i.kind==='timer'&&i.status==='running'){i.remaining=Math.max(0,i.due-duration);i.due=wall+(i.due-duration);}
  const w=result.watch;
  w.liveElapsed=w.elapsed+(w.started===null?0:Math.max(0,duration-w.started));
  if(w.started!==null)w.started=wall-(duration-w.started);
  return result;
 }
 function commit(next){
  if(loadError)throw Error('时钟数据无法读取，原文件已保留：'+loadError);
  fs.mkdirSync(path.dirname(file),{recursive:true});const tmp=file+'.tmp',fd=fs.openSync(tmp,'w');
  try{fs.writeFileSync(fd,JSON.stringify(project(next)));fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
  fs.renameSync(tmp,file);state=next;lastSave=durationNow();
 }
 return {
  read(){if(loadError)throw Error(loadError);return project(state);},
  suspend(){suspended={wall:now(),mono:monotonic()};if(!loadError)commit(snapshot());},
  resume(){if(suspended){sleepOffset+=Math.max(0,(now()-suspended.wall)-(monotonic()-suspended.mono));suspended=null;}},
  flush(){if(!loadError)commit(snapshot());},
  change(r){
   if(!r||typeof r.action!=='string')throw Error('无效操作');const s=snapshot(),t=durationNow();
   if(r.action==='add'){
    if(s.items.length>=100)throw Error('最多保留 100 条提醒，请先删除已完成的提醒');
    if(!['alarm','timer'].includes(r.kind)||typeof r.text!=='string'||r.text.length>200)throw Error('提醒文字最多 200 字');
    let due=r.due;
    if(r.kind==='timer'){if(!Number.isSafeInteger(r.seconds)||r.seconds<1||r.seconds>604800)throw Error('倒计时范围为 1 秒至 7 天');due=t+r.seconds*1000;}
    const reference=r.kind==='alarm'?now():t;
    if(!Number.isFinite(due)||due<=reference||due>reference+366*86400000)throw Error('请选择未来一年以内的时间');
    s.items.unshift({id:crypto.randomUUID(),kind:r.kind,text:r.text.trim(),due,remaining:due-reference,status:'running',ack:false});
   }else if(r.action.startsWith('watch:')){
    const w=s.watch;
    if(r.action==='watch:start'){if(w.started===null)w.started=t;}
    else if(r.action==='watch:pause'){if(w.started!==null){w.elapsed+=Math.max(0,t-w.started);w.started=null;}}
    else if(r.action==='watch:reset'){w.elapsed=0;w.started=null;}else throw Error('无效计时操作');
   }else{
    const i=s.items.find(i=>i.id===r.id);if(!i)throw Error('提醒已不存在');
    if(r.action==='delete')s.items=s.items.filter(i=>i.id!==r.id);
    else if(r.action==='ack'&&i.status==='fired')i.ack=true;
    else if(r.action==='pause'&&i.kind==='timer'&&i.status==='running'){
     if(i.due<=t)throw Error('倒计时已经结束');i.remaining=i.due-t;i.status='paused';
    }else if(r.action==='resume'&&i.kind==='timer'&&i.status==='paused'){i.due=t+i.remaining;i.status='running';}
    else throw Error('当前状态不支持此操作');
   }
   commit(s);return project(state);
  },
  tick(){
   if(loadError)return [];const s=snapshot(),wall=now(),mono=monotonic(),duration=durationNow();
   const jumped=Math.abs((wall-lastWall)-(mono-lastMono))>1000;lastWall=wall;lastMono=mono;
   const due=s.items.filter(i=>i.status==='running'&&i.due<=(i.kind==='alarm'?wall:duration));
   if(due.length){for(const i of due){i.status='fired';i.remaining=0;i.ack=false;}}
   if(due.length||jumped||(duration-lastSave>=30000&&(s.watch.started!==null||s.items.some(i=>i.status==='running'&&i.kind==='timer'))))commit(s);
   return due;
  }
 };
};
