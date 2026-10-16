const fs=require('fs'),path=require('path'),os=require('os'),assert=require('assert');
const setup=require('./island-services');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'hive-notes-test-'));
function boot(){const handlers={};setup({app:{getPath:()=>temp},ipcMain:{handle:(name,fn)=>handlers[name]=fn},BrowserWindow:{getAllWindows:()=>[]},root:path.join(__dirname,'..')});return handlers;}
try{
 let h=boot();assert.deepStrictEqual(h['notes:list']().notes,[]);
 const added=h['notes:write'](null,{action:'add'});assert(added.ok);const note=added.note;
 const updated=h['notes:write'](null,{action:'update',id:note.id,revision:note.revision,text:'中文便签\nsecond line'});assert(updated.ok);
 assert(h['notes:write'](null,{action:'update',id:note.id,revision:1,text:'stale'}).conflict);
 h=boot();assert.strictEqual(h['notes:list']().notes[0].text,'中文便签\nsecond line');
 assert(!h['notes:write'](null,{action:'update',id:note.id,revision:2,text:'a'.repeat(20001)}).ok);
 assert(h['notes:write'](null,{action:'delete',id:note.id,revision:1}).conflict);
 assert(h['notes:write'](null,{action:'delete',id:note.id,revision:2}).ok);
 assert.strictEqual(boot()['notes:list']().notes.length,0);
 fs.writeFileSync(path.join(temp,'island-notes.json'),'broken-json');h=boot();assert(!h['notes:list']().ok);assert(!h['notes:write'](null,{action:'add'}).ok);assert.strictEqual(fs.readFileSync(path.join(temp,'island-notes.json'),'utf8'),'broken-json');
 console.log('PASS: add, edit, persist/reload, conflict, size-limit, delete, corrupt-file protection');
}finally{for(const name of ['island-notes.json','island-notes.json.bak']){const file=path.join(temp,name);if(fs.existsSync(file))fs.unlinkSync(file);}if(!fs.readdirSync(temp).length)fs.rmdirSync(temp);}
