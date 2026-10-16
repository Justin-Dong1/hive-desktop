'use strict';
const layoutSnapshot=window.glassHive.syncLayout(Object.fromEntries(Object.keys(localStorage).filter(k=>/^hive-(grid-|island|collection|display-assignments|icon-fit)/.test(k)).map(k=>[k,localStorage.getItem(k)])),true);
if(layoutSnapshot.ok){for(const k of Object.keys(localStorage))if(/^hive-(grid-|island|collection|display-assignments|icon-fit)/.test(k)&&!Object.hasOwn(layoutSnapshot.values,k))localStorage.removeItem(k);for(const [k,v]of Object.entries(layoutSnapshot.values))localStorage.setItem(k,v);}
else alert('布局读取失败，请勿调整布局：'+layoutSnapshot.message);
function storedWrite(key,value){if(localStorage.getItem(key)===value)return;const result=window.glassHive.syncLayout({[key]:value});if(!result.ok){toast('布局保存失败：'+result.message);return;}localStorage.setItem(key,value);}
const displayId=new URLSearchParams(location.search).get('display')||'default';
const layoutDisplayId=new URLSearchParams(location.search).get('layout')||displayId;
const primaryDisplay=new URLSearchParams(location.search).get('primary')!=='false';
const layoutKey=k=>`${k}:${layoutDisplayId}`;
function layoutRead(k,f){try{return JSON.parse(localStorage.getItem(layoutKey(k))||(primaryDisplay?localStorage.getItem(k):null))||f;}catch(_){return f;}}
const COLLECTION_ID='__hive_collection__';
const EXIT_ID='__hive_exit__';
const exitItem={id:EXIT_ID,name:'退出蜂巢桌面',initials:'↪',system:true,icon:'data:image/svg+xml;charset=utf-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="#809ba5"/><stop offset="1" stop-color="#304351"/></linearGradient></defs><circle cx="32" cy="32" r="32" fill="url(#g)"/><g fill="none" stroke="#f0f8ff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M28 16H17v32h11M29 32h20m-8-8 8 8-8 8"/></g></svg>')};
let desktopItems=[],displayList=[];
function sharedRead(k){try{return JSON.parse(localStorage.getItem(k))||{};}catch(_){return {};}}
function collected(item){const overrides=sharedRead('hive-collection');return overrides[item.id]??(!item.system&&(item.directory||!(/\.(lnk|url|exe|appref-ms)$/i.test(item.rawName||item.name))));}
function belongsHere(item){const assigned=sharedRead('hive-display-assignments')[item.id];const owner=displayList.find(d=>d.layoutId===assigned||d.id===assigned);return owner?owner.id===displayId:primaryDisplay;}
function visibleItems(){const collection={id:COLLECTION_ID,name:'文件收纳',initials:'▦'};return [...(belongsHere(collection)?[collection]:[]),...desktopItems.filter(i=>!collected(i)&&belongsHere(i)),...(belongsHere(exitItem)?[exitItem]:[])];}
function collectItem(id,value){if(id===COLLECTION_ID||id===EXIT_ID)return;const state=sharedRead('hive-collection');state[id]=value;storedWrite('hive-collection',JSON.stringify(state));if(!value)assignDisplay(id,displayId,false);else window.glassHive.notifyWorkspace();applyItems();}
function assignDisplay(id,target,rerender=true){const state=sharedRead('hive-display-assignments');state[id]=displayList.find(d=>d.id===target)?.layoutId||target;storedWrite('hive-display-assignments',JSON.stringify(state));window.glassHive.notifyWorkspace();if(rerender)applyItems();}
function applyItems(){if(window.hiveGameActive){again=true;return;}items=visibleItems();render();renderCollection();}
function openCollection(){document.getElementById('collection').hidden=false;renderCollection();}
function renderCollection(){
 const list=document.getElementById('collectionList');if(!list)return;list.replaceChildren();
 const query=document.getElementById('collectionSearch').value.toLocaleLowerCase();
 const entries=desktopItems.filter(i=>collected(i));document.getElementById('collectionCount').textContent=`${entries.length} 项 · 仅整理展示，不移动真实文件`;
 for(const item of entries.filter(i=>i.name.toLocaleLowerCase().includes(query))){
  const row=document.createElement('div');row.className='collection-row';
  const open=document.createElement('button');open.className='collection-open';open.title=item.name;
  if(item.icon){const img=document.createElement('img');img.src=item.icon;img.alt='';open.append(img);}
  const title=document.createElement('span');title.textContent=item.name;open.append(title);open.onclick=async()=>{if(Date.now()<suppress)return;const r=await window.glassHive.openItem(item.id);if(!r.ok)toast(r.message);};
  open.onpointerdown=e=>startCollectionDrag(e,item,open);
  const out=document.createElement('button');out.textContent='放到此屏桌面';out.onclick=()=>collectItem(item.id,false);
  row.append(open,out);list.append(row);
  open.oncontextmenu=e=>{e.preventDefault();itemMenu(item,e.clientX,e.clientY);};
 }
 if(!list.children.length)list.textContent=query?'没有匹配的文件':'收纳为空；右键桌面图标可以收入这里。';
}
function itemMenu(item,x,y){
 document.getElementById('newMenu')?.setAttribute('hidden','');
 const menu=document.getElementById('itemMenu');menu.replaceChildren();
 const action=(label,fn)=>{const b=document.createElement('button');b.textContent=label;b.onclick=()=>{menu.hidden=true;fn();};menu.append(b);};
 if(item.id===EXIT_ID){action('退出蜂巢桌面并恢复 Windows 桌面',()=>window.glassHive.quit());for(const d of displayList.filter(d=>d.id!==displayId))action(`移到 ${d.name}${d.primary?'（主屏）':''}`,()=>assignDisplay(item.id,d.id));}
 else if(item.id===COLLECTION_ID){action('打开文件收纳',openCollection);for(const d of displayList.filter(d=>d.id!==displayId))action(`移到 ${d.name}${d.primary?'（主屏）':''}`,()=>assignDisplay(item.id,d.id));}
 else {action('收入文件收纳',()=>collectItem(item.id,true));action('在资源管理器中定位',()=>window.glassHive.revealItem(item.id));for(const d of displayList.filter(d=>d.id!==displayId))action(`移到 ${d.name}${d.primary?'（主屏）':''}`,()=>assignDisplay(item.id,d.id));}
 if(item.id!==COLLECTION_ID&&item.id!==EXIT_ID){
  action('打开（普通图标也可双击）',async()=>{const r=await window.glassHive.openItem(item.id);if(!r.ok)toast(r.message);});
  action('查看来源',()=>toast(item.sourcePath||'桌面文件夹项目'));
  if(!item.system)action('删除（移入回收站）',async()=>{const r=await window.glassHive.deleteItem(item.id);if(r.canceled)return;if(!r.ok)toast(r.message);else{await refresh();toast('真实桌面文件已移入回收站');}});
  const change=async reset=>{const r=await window.glassHive.changeIcon(item.id,reset);if(!r.ok&&!r.canceled)toast(r.message);};
  action('选择自定义图标…',()=>change(false));action('恢复默认图标',()=>change(true));
  const style=HiveIconFill.mode(item,sharedRead('hive-icon-fit'));
  for(const [value,label]of [['inner','内圆留白'],['contain','保留原图'],['cover','填满圆框']])action(`${style===value?'✓ ':''}图标样式：${label}`,()=>{const preferences=sharedRead('hive-icon-fit');preferences[item.id]=value;storedWrite('hive-icon-fit',JSON.stringify(preferences));render();});
  action('图标样式：恢复自动适配',()=>{const preferences=sharedRead('hive-icon-fit');delete preferences[item.id];storedWrite('hive-icon-fit',JSON.stringify(preferences));render();});
 }
 menu.hidden=false;menu.style.left=`${Math.max(8,Math.min(x,innerWidth-menu.offsetWidth-8))}px`;menu.style.top=`${Math.max(8,Math.min(y,innerHeight-menu.offsetHeight-8))}px`;
}
window.addEventListener('storage',e=>{if(['hive-collection','hive-display-assignments'].includes(e.key)){if(drag){again=true;}else applyItems();}});
document.addEventListener('pointerdown',e=>{if(!e.target.closest('#itemMenu, #newMenu'))document.getElementById('itemMenu').hidden=true;});
document.getElementById('collectionClose').onclick=()=>document.getElementById('collection').hidden=true;
document.getElementById('collectionSearch').oninput=renderCollection;
window.addEventListener('keydown',e=>{if(e.key==='Escape'){document.getElementById('collection').hidden=true;document.getElementById('itemMenu').hidden=true;}});
function startCollectionDrag(e,item,button){
 if(e.button!==0)return;
 const x=e.clientX,y=e.clientY;let active=false,ghost;
 function move(ev){
  if(!active&&Math.hypot(ev.clientX-x,ev.clientY-y)<8)return;
  if(!active){active=true;ghost=button.cloneNode(true);ghost.className='collection-ghost';document.body.append(ghost);document.getElementById('collection').hidden=true;document.body.classList.add('grid-drag');}
  ghost.style.left=`${ev.clientX+12}px`;ghost.style.top=`${ev.clientY+12}px`;
  islandDragHover(ev,item.id);
 }
 function finish(ev,cancel=false){
  document.removeEventListener('pointermove',move);document.removeEventListener('pointerup',finish);document.removeEventListener('pointercancel',abort);window.removeEventListener('blur',abort);document.removeEventListener('keydown',escape);
  if(!active)return;suppress=Date.now()+500;ghost.remove();document.body.classList.remove('grid-drag');
  island.classList.remove('portal-hover');
  if(!cancel&&islandDropHit(ev,item.id)){openTransfer(item.id);return;}
  const bounds=stage.getBoundingClientRect(),target=!cancel&&HiveGrid.hit(grid,ev.clientX-bounds.x,ev.clientY-bounds.y,config.cell);
  if(target?.complete){const other=items.find(i=>placements[i.id]?.page===page&&placements[i.id]?.key===target.key);collectItem(item.id,false);const old=placements[item.id];placements[item.id]={page,key:target.key};if(other&&old)placements[other.id]=old;save();render();toast('已放到当前屏幕');}
  else {openCollection();if(!cancel)toast('请放入屏幕内完整的蜂窝');}
 }
 function abort(ev){finish(ev,true);}
 function escape(ev){if(ev.key==='Escape')abort(ev);}
 document.addEventListener('pointermove',move);document.addEventListener('pointerup',finish);document.addEventListener('pointercancel',abort);window.addEventListener('blur',abort);document.addEventListener('keydown',escape);
}
