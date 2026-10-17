'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const {execFile}=require('child_process');
module.exports=({app,ipcMain,BrowserWindow,root})=>{
 const file=path.join(app.getPath('userData'),'island-notes.json');
 let notes=[],loadError='';
 try{if(fs.existsSync(file)){notes=JSON.parse(fs.readFileSync(file,'utf8'));const ids=new Set();if(!Array.isArray(notes)||notes.some(n=>{if(!n||typeof n.id!=='string'||!n.id||ids.has(n.id)||typeof n.text!=='string'||!Number.isSafeInteger(n.revision)||n.revision<1||!Number.isFinite(n.updated)||(n.deletedAt!==undefined&&(!Number.isFinite(n.deletedAt)||n.deletedAt<=0)))return true;ids.add(n.id);return false;}))throw new Error('Invalid notes file');}}catch(e){loadError=e.message;notes=[];}
 const activeNotes=()=>notes.filter(n=>!n.deletedAt);
 const broadcast=()=>{const active=activeNotes();for(const w of BrowserWindow.getAllWindows()){try{if(!w.isDestroyed()&&!w.webContents.isDestroyed?.())w.webContents.send('notes:changed',active);}catch{/* A closing renderer must not turn a committed save into a failure. */}}};
 ipcMain.handle('notes:list',()=>loadError?{ok:false,message:'便签文件读取失败，原文件已保留：'+loadError}:{ok:true,notes:activeNotes()});
 ipcMain.handle('notes:trash',()=>loadError?{ok:false,message:loadError}:{ok:true,notes:notes.filter(n=>n.deletedAt).sort((a,b)=>b.deletedAt-a.deletedAt)});
 ipcMain.handle('notes:write',(_event,request)=>{
  try{
   if(loadError)throw new Error('便签文件读取失败，已禁止覆盖原文件');
   if(!request||!['add','update','delete','restore'].includes(request.action))throw new Error('无效操作');
   const next=notes.map(n=>({...n}));let note;
   if(request.action==='add'){
    if(activeNotes().length>=200)throw new Error('最多保留 200 条便签');
    note={id:crypto.randomUUID(),text:'',revision:1,updated:Date.now()};next.unshift(note);
   }else{
    const index=next.findIndex(n=>n.id===request.id);if(index<0)throw new Error('便签已被删除，请重新选择');
    if(next[index].revision!==request.revision)return {ok:false,conflict:true,message:'另一屏已修改此便签，草稿已保留，可点击“另存草稿”。',notes:activeNotes()};
    if(request.action==='restore'){
     if(!next[index].deletedAt)throw Error('便签已经恢复');if(activeNotes().length>=200)throw Error('最多保留 200 条便签');
     note=next[index]={...next[index],revision:next[index].revision+1,updated:Date.now()};delete note.deletedAt;
    }
    else if(next[index].deletedAt)throw Error('便签已删除，草稿已保留，请先从最近删除恢复');
    else if(request.action==='delete')next[index]={...next[index],deletedAt:Date.now(),revision:next[index].revision+1};
    else{if(typeof request.text!=='string'||request.text.length>20000)throw new Error('每条便签最多 20000 字');note=next[index]={...next[index],text:request.text,revision:next[index].revision+1,updated:Date.now()};}
   }
   fs.mkdirSync(path.dirname(file),{recursive:true});const tmp=file+'.tmp';const fd=fs.openSync(tmp,'w');try{fs.writeFileSync(fd,JSON.stringify(next,null,2),'utf8');fs.fsyncSync(fd);}finally{fs.closeSync(fd);}if(fs.existsSync(file))fs.copyFileSync(file,file+'.bak');fs.renameSync(tmp,file);notes=next;broadcast();return {ok:true,notes:activeNotes(),note};
  }catch(e){return {ok:false,message:e.message};}
 });
 let cached=null,stamp=0,pending=null,controlPending=false;
 const mediaReader=require('./media-reader')(path.join(root,'tools','media-session.ps1'));
 app.once?.('before-quit',()=>mediaReader.dispose());
 process.once('exit',()=>mediaReader.dispose());
 const query=(args=[])=>new Promise(resolve=>execFile('powershell.exe',['-Mta','-NoProfile','-ExecutionPolicy','Bypass','-File',path.join(root,'tools','media-session.ps1'),...args],{windowsHide:true,timeout:18000,maxBuffer:32*1024*1024,encoding:'utf8'},(error,out)=>{try{resolve(JSON.parse(out.replace(/^\uFEFF/,'')));}catch(_){resolve({ok:false,sessions:[],message:error?.message||'媒体读取失败'});}}));
 ipcMain.handle('media:status',async()=>{
  if(cached&&Date.now()-stamp<300)return cached;
  if(!pending)pending=mediaReader.read().then(r=>{cached=r;stamp=Date.now();return r;}).finally(()=>pending=null);
  return pending;
 });
 ipcMain.handle('media:control',async(_event,{source,action,value,track}={})=>{
  if(!['toggle','previous','next','seek','shuffle','repeat'].includes(action)||typeof source!=='string'||source.length>512)return {ok:false,message:'无效媒体操作'};
  if(['seek','shuffle','repeat'].includes(action)&&(!Number.isFinite(value)||value<0||(action==='seek'&&value>31536000)||(action==='shuffle'&&![0,1].includes(value))||(action==='repeat'&&![0,1,2].includes(value))))return {ok:false,message:'无效播放参数'};
  if(action==='seek'&&(typeof track!=='string'||track.length>4096))return {ok:false,message:'歌曲信息已失效'};
  if(controlPending)return {ok:false,message:'播放器正在响应，请稍候'};
  controlPending=true;
  try{if(pending)await pending;const result=await query(['-Action',action,'-Source',source,...(['seek','shuffle','repeat'].includes(action)?['-Value',String(value)]:[]),...(action==='seek'?['-Track',track]:[])]);cached=null;stamp=0;return result;}finally{controlPending=false;}
 });
};
