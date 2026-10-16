'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const allowed=k=>/^hive-(grid-(settings|placements|pinned)|island|island-page)(:.*)?$/.test(k)||['hive-collection','hive-display-assignments','hive-icon-fit'].includes(k);
function validate(doc){
 if(doc?.format!=='glass-hive-layout'||doc.version!==1||!doc.values||Array.isArray(doc.values)||typeof doc.values!=='object')throw Error('不是受支持的蜂窝布局备份');
 const entries=Object.entries(doc.values);if(!entries.length||entries.length>2000)throw Error('布局为空或过大');
 for(const [k,v]of entries){
  if(!allowed(k)||typeof v!=='string'||v.length>4000000)throw Error('布局包含无效字段');
  if(k.startsWith('hive-island-page')){if(!['functions','notes','music'].includes(v))throw Error('页面无效');continue;}
  const value=JSON.parse(v);if(!value||typeof value!=='object')throw Error('布局内容无效');
  if(k.startsWith('hive-grid-pinned')){if(!Array.isArray(value)||value.some(x=>typeof x!=='string'))throw Error('蜂窝列表无效');}
  else if(Array.isArray(value))throw Error('布局字段类型无效');
  if(k.startsWith('hive-grid-placements'))for(const p of Object.values(value))if(!p||!Number.isInteger(p.page)||p.page<0||typeof p.key!=='string'||! /^-?\d+:-?\d+$/.test(p.key))throw Error('图标位置无效');
 }
 return doc;
}
module.exports=function(directory,store){
 directory=path.resolve(directory);
 fs.mkdirSync(directory,{recursive:true});
 let lastStamp=Math.max(0,...fs.readdirSync(directory).filter(n=>/^\d+-[a-f0-9]+\.json$/.test(n)).map(n=>Number(n.split('-')[0])));
 function document(reason){return {format:'glass-hive-layout',version:1,createdAt:new Date().toISOString(),reason,values:store.read()};}
 function save(reason='manual'){
  const doc=validate(document(reason));lastStamp=Math.max(Date.now(),lastStamp+1);const id=lastStamp+'-'+crypto.randomBytes(4).toString('hex')+'.json';
  const fd=fs.openSync(path.join(directory,id),'wx');try{fs.writeFileSync(fd,JSON.stringify(doc,null,2));fs.fsyncSync(fd);}finally{fs.closeSync(fd);}prune();return {id,...doc};
 }
 function read(file){if(fs.statSync(file).size>16000000)throw Error('备份超过 16 MB');return validate(JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,'')));}
 function list(){return fs.readdirSync(directory).filter(n=>/^\d+-[a-f0-9]+\.json$/.test(n)).sort((a,b)=>Number(b.split('-')[0])-Number(a.split('-')[0])||b.localeCompare(a)).flatMap(id=>{try{const file=path.join(directory,id);if(!fs.lstatSync(file).isFile())return [];const d=read(file);return [{id,createdAt:d.createdAt,reason:d.reason}];}catch{return [];}});}
 function prune(){for(const entry of list().slice(10)){const target=path.resolve(directory,entry.id);if(path.dirname(target)!==directory||!fs.lstatSync(target).isFile())throw Error('备份清理路径无效');fs.unlinkSync(target);}}
 function restore(doc){validate(doc);save('before-restore');return store.replace(doc.values);}
 function selected(id){if(!list().some(b=>b.id===id))throw Error('备份不存在');return read(path.join(directory,id));}
 prune();
 return {save,list,read,restore,selected,document};
};
module.exports.validate=validate;
