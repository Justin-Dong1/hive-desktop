'use strict';
window.addEventListener('keydown',e=>{if(e.key==='F5'){e.preventDefault();refresh();}});
const newMenu=document.createElement('nav');newMenu.id='newMenu';newMenu.hidden=true;newMenu.setAttribute('aria-label','新建');document.body.append(newMenu);
new MutationObserver(()=>{if(document.getElementById('itemMenu').hidden)newMenu.hidden=true;}).observe(document.getElementById('itemMenu'),{attributes:true,attributeFilter:['hidden']});
async function showNewMenu(anchor,create){
 newMenu.replaceChildren();newMenu.hidden=false;const loading=document.createElement('div');loading.textContent='正在读取系统新建类型…';newMenu.append(loading);
 const position=()=>{const r=anchor.getBoundingClientRect();newMenu.style.left=`${Math.max(8,r.right+newMenu.offsetWidth+8<innerWidth?r.right+4:r.left-newMenu.offsetWidth-4)}px`;newMenu.style.top=`${Math.max(8,Math.min(r.top,innerHeight-newMenu.offsetHeight-8))}px`;};position();
 const result=await window.glassHive.newTypes();if(newMenu.hidden)return;newMenu.replaceChildren();
 const add=(label,action)=>{const b=document.createElement('button');b.textContent=label;b.onclick=()=>{newMenu.hidden=true;document.getElementById('itemMenu').hidden=true;action();};newMenu.append(b);};
 add('📁 文件夹',()=>create('folder'));add('↗ 快捷方式',()=>create('shortcut'));
 if(result.ok)for(const type of result.types)add(type.name,async()=>{const r=await window.glassHive.newType(type.extension);if(r.canceled)return;if(!r.ok)toast(r.message);else{await refresh();toast(r.launched?'已启动软件的新建界面，请在其中完成创建':'已创建，可在文件收纳中找到');}});
 else add('读取失败，点击重试',()=>{toast(result.message);});
 position();
}
function showIslandState(state){
 const own=state.find(d=>d.id===displayId);island.hidden=own?.visible===false;
 const manager=document.getElementById('islandScreens');manager.replaceChildren();
 const count=state.filter(d=>d.visible).length;
 for(const d of state){const b=document.createElement('button');b.textContent=`${d.id===displayId?'本屏':d.name}：${d.visible?'关闭蜂巢桌面':'显示蜂巢桌面'}`;b.disabled=d.visible&&count===1;b.title=b.disabled?'必须保留至少一个蜂巢桌面':'';b.onclick=async()=>{const r=await window.glassHive.setIslandVisible(d.id,!d.visible);showIslandState(r.state);if(!r.ok)toast(r.message);};manager.append(b);}
}
window.glassHive.onIslandState(showIslandState);window.glassHive.islandState().then(showIslandState);
setInterval(()=>window.glassHive.health(false),3000);
function islandDropHit(e,id){if(island.hidden)return false;const r=island.getBoundingClientRect();return e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom;}
function islandDragHover(e,id){const hit=islandDropHit(e,id);island.classList.toggle('portal-hover',hit);return hit;}
async function openTransfer(id){
 island.classList.remove('portal-hover');
 const item=id===EXIT_ID?exitItem:id===COLLECTION_ID?{id,name:'文件收纳'}:desktopItems.find(i=>i.id===id);if(!item)return;
 const dialog=document.getElementById('transfer');dialog.hidden=false;document.getElementById('transferTitle').textContent=`传送「${item.name}」到…`;
 const list=document.getElementById('transferTargets');list.textContent='正在获取显示器…';
 const displays=await window.glassHive.displays();if(dialog.hidden)return;list.replaceChildren();
 for(const d of displays.filter(d=>d.id!==displayId)){
  const b=document.createElement('button');b.textContent=`${d.name}${d.primary?'（主屏）':''}`;
  b.onclick=async()=>{
   const live=await window.glassHive.displays();if(!live.some(s=>s.id===d.id)){toast('目标屏幕已断开，图标保留在原处');dialog.hidden=true;return;}
   if(id!==COLLECTION_ID&&id!==EXIT_ID){const state=sharedRead('hive-collection');state[id]=false;storedWrite('hive-collection',JSON.stringify(state));}
   assignDisplay(id,d.id);dialog.hidden=true;toast(`已传送到 ${d.name}`);
  };list.append(b);
 }
 if(!list.children.length)list.textContent='没有其他已连接的显示器，图标保留在原处。';
}
document.getElementById('transferCancel').onclick=()=>document.getElementById('transfer').hidden=true;
window.addEventListener('keydown',e=>{if(e.key==='Escape')document.getElementById('transfer').hidden=true;});
stage.addEventListener('contextmenu',e=>{
 if(e.target.closest('.app')||editing)return;
 const rect=stage.getBoundingClientRect(),cell=HiveGrid.hit(grid,e.clientX-rect.x,e.clientY-rect.y,config.cell);
 const occupied=cell&&items.some(i=>placements[i.id]?.page===page&&placements[i.id]?.key===cell.key);
 if(occupied||(cell&&pinned.has(cell.key)))return;
 e.preventDefault();
 if(!e.shiftKey){
  const menu=document.getElementById('itemMenu');menu.replaceChildren();
  newMenu.hidden=true;
  const add=(label,action)=>{const b=document.createElement('button');b.textContent=label;b.onclick=()=>{menu.hidden=true;action();};menu.append(b);};
  add('刷新蜂巢桌面',refresh);add('显示设置',()=>window.glassHive.desktopSettings('display'));add('个性化',()=>window.glassHive.desktopSettings('personalization'));
  const create=async kind=>{const r=await window.glassHive.createDesktopItem(kind);if(r.canceled)return;if(!r.ok)toast(r.message);else{await refresh();toast(kind==='shortcut'?'快捷方式已添加到蜂窝':'已添加；文件和文件夹可在文件收纳中找到');}};
  const newButton=document.createElement('button');newButton.textContent='新建　▸';newButton.setAttribute('aria-haspopup','menu');newButton.onclick=()=>showNewMenu(newButton,create);newButton.onpointerenter=()=>{if(newMenu.hidden)showNewMenu(newButton,create);};menu.append(newButton);
  add('添加已有文件到桌面（复制）…',()=>create('import'));
  add('打开桌面文件夹（更多新建类型）',async()=>{const r=await window.glassHive.openDesktopFolder();if(!r.ok)toast(r.message);});
  if(island.hidden)add('显示本屏蜂巢桌面',async()=>showIslandState((await window.glassHive.setIslandVisible(displayId,true)).state));
  add('使用完整 Windows 菜单（退出并恢复原桌面）',()=>window.glassHive.quit());
  menu.hidden=false;menu.style.left=`${Math.max(8,Math.min(e.clientX,innerWidth-menu.offsetWidth-8))}px`;menu.style.top=`${Math.max(8,Math.min(e.clientY,innerHeight-menu.offsetHeight-8))}px`;return;
 }
 if(!island.hidden)return;
 const menu=document.getElementById('itemMenu');menu.replaceChildren();const b=document.createElement('button');b.textContent='显示本屏蜂巢桌面';b.onclick=async()=>{menu.hidden=true;showIslandState((await window.glassHive.setIslandVisible(displayId,true)).state);};menu.append(b);menu.hidden=false;menu.style.left=`${Math.max(8,Math.min(e.clientX,innerWidth-menu.offsetWidth-8))}px`;menu.style.top=`${Math.max(8,Math.min(e.clientY,innerHeight-menu.offsetHeight-8))}px`;
});
