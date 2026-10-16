'use strict';
const fs=require('fs'),os=require('os'),path=require('path'),assert=require('assert'),services=require('./island-services');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'hive-notes-'));
function boot(){const routes={};services({app:{getPath:()=>dir},ipcMain:{handle:(k,f)=>routes[k]=f},BrowserWindow:{getAllWindows:()=>[]},root:dir});return routes;}
let r=boot();const write=x=>r['notes:write']({},x);
let note=write({action:'add'}).note;
note=write({action:'update',id:note.id,revision:note.revision,text:'中文草稿\n保留内容'}).note;
assert(write({action:'update',id:note.id,revision:1,text:'过期的另一屏'}).conflict);
assert(write({action:'delete',id:note.id,revision:note.revision}).ok);
assert.equal(r['notes:list']().notes.length,0);
r=boot();let deleted=r['notes:trash']().notes[0];assert.equal(deleted.text,'中文草稿\n保留内容');
assert(!write({action:'update',id:deleted.id,revision:deleted.revision,text:'不能修改已删除便签'}).ok);
const restored=write({action:'restore',id:deleted.id,revision:deleted.revision});assert(restored.ok);assert.equal(restored.note.text,deleted.text);assert.equal(r['notes:trash']().notes.length,0);
assert(!write({action:'delete',id:deleted.id,revision:deleted.revision}).ok);
assert(fs.existsSync(path.join(dir,'island-notes.json.bak')));
console.log('PASS Chinese text, stale multi-screen revision, soft deletion, restart recovery, restore, stale delete protection, backup');
