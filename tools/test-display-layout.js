'use strict';
const assert=require('assert'),fs=require('fs'),os=require('os'),path=require('path'),{spawnSync}=require('child_process');
const Store=require('./layout-store'),{identify,migrate}=require('./display-layout');
const screens=(fresh=false)=>[
 {id:fresh?901:1,label:'Built-in',internal:true,bounds:{x:fresh?1920:0,y:0}},
 {id:fresh?902:2,label:'H24T09P',internal:false,bounds:{x:fresh?0:1920,y:0}}
];
if(process.argv[2]==='write'){
 const store=Store(process.argv[3]),ids=identify(screens());
 store.write({'hive-grid-placements:1':'{"app":{"key":"2:3","page":1}}','hive-grid-settings:1':'{"cell":136,"icon":48}','hive-grid-pinned:1':'["1:2"]','hive-island:1':'{"x":123}','hive-display-assignments':'{"app":"2"}'});
 migrate(store,ids);store.write({['hive-grid-placements:'+ids.get('1')]:'{"app":{"key":"4:2","page":0}}'});
}else if(process.argv[2]==='read'){
 const store=Store(process.argv[3]),ids=identify(screens(true).reverse()),data=migrate(store,ids),key=ids.get('901');
 assert.equal(data['hive-grid-placements:'+key],'{"app":{"key":"4:2","page":0}}');
 assert.equal(data['hive-grid-settings:'+key],'{"cell":136,"icon":48}');
 assert.equal(data['hive-grid-pinned:'+key],'["1:2"]');
 assert.equal(data['hive-island:'+key],'{"x":123}');
 assert.equal(JSON.parse(data['hive-display-assignments']).app,ids.get('902'));
 assert(data['hive-grid-placements:1'],'Legacy backup retained');
 assert.equal(identify([screens(true)[1]]).get('902'),ids.get('902'),'External monitor identity after disconnect');
}else{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'hive-monitor-test-')),file=path.join(dir,'layout.json');
 for(const phase of ['write','read']){const result=spawnSync(process.execPath,[__filename,phase,file],{encoding:'utf8'});assert.equal(result.status,0,result.stderr);}
 console.log('PASS separate-process persistence, changed display ids, enumeration reversal, monitor relocation, disconnection, settings, pinned cells, hub and cross-screen ownership');
}
