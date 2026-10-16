'use strict';
const fs=require('fs'),path=require('path');
const allowed=k=>/^hive-(grid-(settings|placements|pinned)|island|island-page)(:.*)?$/.test(k)||['hive-collection','hive-display-assignments','hive-icon-fit'].includes(k);
module.exports=function(file){
 let data={};
 for(const candidate of [file,file+'.bak']){try{const parsed=JSON.parse(fs.readFileSync(candidate,'utf8'));if(!parsed||Array.isArray(parsed)||typeof parsed!=='object')throw Error('Invalid layout');data=parsed;break;}catch(e){if(e.code!=='ENOENT'&&fs.existsSync(candidate))fs.copyFileSync(candidate,candidate+'.invalid-'+Date.now());}}
 function write(values,seed=false){const next={...data};for(const [k,v]of Object.entries(values||{})){if(!allowed(k)||typeof v!=='string'||v.length>4000000)continue;if(seed&&Object.hasOwn(next,k))continue;next[k]=v;}if(JSON.stringify(next)===JSON.stringify(data))return {...data};
  fs.mkdirSync(path.dirname(file),{recursive:true});const fd=fs.openSync(file+'.tmp','w');try{fs.writeFileSync(fd,JSON.stringify(next));fs.fsyncSync(fd);}finally{fs.closeSync(fd);}if(fs.existsSync(file))fs.copyFileSync(file,file+'.bak');fs.renameSync(file+'.tmp',file);data=next;return {...data};
 }
 function replace(values){const previous=data;data={};try{return write(values);}catch(e){data=previous;throw e;}}
 return {read:()=>({...data}),write,replace};
};
