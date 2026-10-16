'use strict';
(function(root){
 function create(){
  let tail=Promise.resolve();const pending=new Set();
  const key=(source,action)=>JSON.stringify([source,action]);
  return {
   busy:(source,action)=>pending.has(key(source,action)),
   run(source,action,execute,changed=()=>{}){
    const id=key(source,action);if(pending.has(id))return Promise.resolve();
    pending.add(id);changed();
    const result=tail.then(execute).finally(()=>{pending.delete(id);changed();});
    tail=result.catch(()=>{});return result;
   }
  };
 }
 const api={create};if(typeof module==='object'&&module.exports)module.exports=api;else root.HiveMediaCommandQueue=api;
})(globalThis);
