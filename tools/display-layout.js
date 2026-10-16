'use strict';
const crypto=require('crypto');
const prefixes=['hive-grid-settings','hive-grid-placements','hive-grid-pinned','hive-island','hive-island-page'];
// Electron ids can change after reboot. Unique monitor names do not depend on
// enumeration order, primary status, resolution, or desktop coordinates.
function identify(displays){
 const groups=new Map();
 for(const d of displays){const signature=JSON.stringify([d.internal===true,String(d.label||'').trim()]);if(!groups.has(signature))groups.set(signature,[]);groups.get(signature).push(d);}
 const result=new Map();
 for(const [signature,group]of groups){
  group.sort((a,b)=>a.bounds.x-b.bounds.x||a.bounds.y-b.bounds.y||String(a.id).localeCompare(String(b.id)));
  const base='monitor-'+crypto.createHash('sha256').update(signature).digest('hex').slice(0,20);
  group.forEach((d,i)=>result.set(String(d.id),base+(group.length>1?'-slot-'+i:'')));
 }
 return result;
}
function migrate(store,identities){
 const data=store.read(),updates={};
 for(const [runtime,stable]of identities)for(const prefix of prefixes){
  const destination=prefix+':'+stable,source=prefix+':'+runtime;
  if(!Object.hasOwn(data,destination)&&Object.hasOwn(data,source))updates[destination]=data[source];
 }
 if(data['hive-display-assignments']){
  const assignments=JSON.parse(data['hive-display-assignments']);let changed=false;
  for(const [item,id]of Object.entries(assignments))if(identities.has(String(id))){assignments[item]=identities.get(String(id));changed=true;}
  if(changed)updates['hive-display-assignments']=JSON.stringify(assignments);
 }
 return store.write(updates);
}
module.exports={identify,migrate};
