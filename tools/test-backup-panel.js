'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),vm=require('vm');
const select={value:'',disabled:false,options:[],replaceChildren(){this.options=[];this.value='';},append(o){this.options.push(o);if(this.options.length===1)this.value=o.value;}},status={textContent:''};
const buttons=Object.fromEntries(['save','export','import','list','restore'].map(action=>[action,{dataset:{action}}]));
const box={style:{},querySelector:s=>s==='select'?select:s==='small'?status:buttons.restore,querySelectorAll:()=>Object.values(buttons)};
let entries=['new','old'],handler,requests=[];
const response=()=>({ok:true,backups:entries.map(id=>({id,createdAt:'2026-10-17T00:00:00Z',reason:'manual'}))});
const context={document:{createElement:tag=>tag==='section'?box:{},head:{append(){}},getElementById:()=>({append(){}})},window:{glassHive:{layoutBackups:(action,id)=>{requests.push([action,id]);return handler?handler(action,id):Promise.resolve(response());}}}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../ui/layout-backups.js'),'utf8'),context);
(async()=>{
 await new Promise(setImmediate);assert.equal(select.value,'new');select.value='old';await buttons.list.onclick();assert.equal(select.value,'old');
 let resolve;handler=()=>new Promise(r=>resolve=r);const pending=buttons.restore.onclick();assert(select.disabled);assert(Object.values(buttons).every(b=>b.disabled));assert.equal(requests.at(-1)[1],'old');
 const count=requests.length;await buttons.save.onclick();assert.equal(requests.length,count,'Pending operation must suppress duplicate actions');resolve({ok:false,canceled:true});await pending;assert(!select.disabled);assert.equal(status.textContent,'已取消操作');assert.equal(select.value,'old');
 handler=async()=>{throw Error('offline');};await buttons.list.onclick();assert(!select.disabled);assert(!buttons.restore.disabled);assert(status.textContent.includes('offline'));assert.equal(select.value,'old');
 handler=null;entries=['new'];await buttons.list.onclick();assert.equal(select.value,'new');
 entries=[];await buttons.list.onclick();assert.equal(select.value,'');assert(buttons.restore.disabled);assert(!buttons.save.disabled);
 console.log('PASS backup selection retention, frozen operation target, duplicate suppression, cancellation/error recovery and empty list');
})().catch(e=>{console.error(e);process.exitCode=1;});
