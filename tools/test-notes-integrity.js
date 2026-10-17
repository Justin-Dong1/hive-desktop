'use strict';
const assert=require('assert'),fs=require('fs'),os=require('os'),path=require('path'),vm=require('vm');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'hive-notes-integrity-')),file=path.join(root,'island-notes.json');
const frames=[],windows=[{isDestroyed:()=>false,webContents:{send(){throw Error('Window closing');}}},{isDestroyed:()=>false,webContents:{isDestroyed:()=>true,send(){throw Error('Must skip');}}},{isDestroyed:()=>false,webContents:{isDestroyed:()=>false,send:(channel,notes)=>frames.push(notes)}}];
function boot(){const handlers={},context={module:{exports:{}},require:name=>name==='./media-reader'?()=>({dispose(){}}):require(name),process:{once(){}}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'island-services.js'),'utf8'),context);context.module.exports({app:{getPath:()=>root},ipcMain:{handle:(name,fn)=>handlers[name]=fn},BrowserWindow:{getAllWindows:()=>windows},root});return handlers;}
try{
 let h=boot();const added=h['notes:write'](null,{action:'add'});assert(added.ok,'Committed add must succeed even when another window closes');assert.equal(frames.length,1);
 const saved=h['notes:write'](null,{action:'update',id:added.note.id,revision:1,text:'中文跨屏保存'});assert(saved.ok);assert.equal(frames.at(-1)[0].text,'中文跨屏保存');assert.equal(boot()['notes:list']().notes[0].text,'中文跨屏保存');
 const valid=saved.note;
 for(const records of [[null],[{...valid,revision:'2'}],[{...valid,text:null}],[valid,valid],[{...valid,deletedAt:'bad'}]]){
  const content=JSON.stringify(records);fs.writeFileSync(file,content);h=boot();assert.equal(h['notes:list']().ok,false);assert.equal(h['notes:trash']().ok,false);assert.equal(h['notes:write'](null,{action:'add'}).ok,false);assert.equal(fs.readFileSync(file,'utf8'),content,'Damaged source must remain intact');
 }
 console.log('PASS committed notes save despite closed renderer, healthy-screen delivery, reload, malformed-record rejection and original-file preservation');
}finally{for(const suffix of ['', '.bak','.tmp'])if(fs.existsSync(file+suffix))fs.unlinkSync(file+suffix);fs.rmdirSync(root);}
