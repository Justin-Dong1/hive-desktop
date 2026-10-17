'use strict';
const assert=require('assert'),fs=require('fs'),os=require('os'),path=require('path'),Backups=require('./layout-backups');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'hive-backup-size-'));
let values={'hive-grid-settings:screen':'{"cell":120}'},replaced=false;
const store={read:()=>values,replace:()=>{replaced=true;}};
try{
 const backups=Backups(dir,store),saved=backups.save();
 const content=JSON.stringify({label:'中'.repeat(2000000)});
 values=Object.fromEntries([1,2,3].map(i=>['hive-grid-settings:screen-'+i,content]));
 assert(content.length<4000000,'Each field separately fits existing limit');
 assert.throws(()=>backups.save(),/16 MB/);
 assert.deepEqual(fs.readdirSync(dir),[saved.id],'Oversize failure must not create partial file or prune previous backup');
 assert.throws(()=>backups.restore(saved),/16 MB/);assert(!replaced,'Unsafe restore must not proceed without recovery backup');
 assert.equal(backups.selected(saved.id).values['hive-grid-settings:screen'],'{"cell":120}');
 values={'hive-grid-settings:screen':'{"cell":122}'};const next=backups.save();assert.equal(backups.selected(next.id).values['hive-grid-settings:screen'],values['hive-grid-settings:screen']);
 console.log('PASS backup UTF-8 total size guard, existing backups preserved, recovery backup failure blocks restore and subsequent save works');
}finally{for(const file of fs.readdirSync(dir))fs.unlinkSync(path.join(dir,file));fs.rmdirSync(dir);}
