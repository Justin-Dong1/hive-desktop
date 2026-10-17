'use strict';
(()=>{
 const box=document.createElement('section');box.style.cssText='padding:16px 0;display:grid;gap:10px';
 box.innerHTML='<h3>布局备份与恢复</h3><div style="display:flex;gap:8px;flex-wrap:wrap"><button data-action="save">立即备份</button><button data-action="export">导出布局</button><button data-action="import">导入布局</button><button data-action="list">刷新记录</button></div><select aria-label="历史布局备份" style="max-width:100%;padding:8px" id="layoutBackupList"></select><button data-action="restore">恢复所选备份…</button><small id="layoutBackupStatus" role="status">加载备份记录…</small>';
 document.getElementById('hubSettings').append(box);
 box.className='layout-backups';
 const style=document.createElement('style');style.textContent='.layout-backups button,.layout-backups select{font:inherit;color:#e5eded;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.14);border-radius:10px;padding:10px 14px}.layout-backups button{cursor:pointer;transition:background .18s}.layout-backups button:hover{background:rgba(255,255,255,.15)}.layout-backups button:disabled{opacity:.45;cursor:default}.layout-backups select option{background:#202525}.layout-backups small{color:#a8b5b5}.layout-backups h3{margin:6px 0;font-size:16px}';document.head.append(style);
 const select=box.querySelector('select'),status=box.querySelector('small');let pending=false;
 async function run(action){if(pending)return;const selected=select.value;pending=true;select.disabled=true;for(const b of box.querySelectorAll('button'))b.disabled=true;
 try{const r=await window.glassHive.layoutBackups(action,selected);if(!r.ok){if(!r.canceled)throw Error(r.message);status.textContent='已取消操作';return;}
 const result=action==='list'?r:await window.glassHive.layoutBackups('list');if(!result.ok)throw Error(result.message);
 select.replaceChildren();for(const entry of result.backups){const option=document.createElement('option');option.value=entry.id;option.textContent=new Date(entry.createdAt).toLocaleString()+' · '+({auto:'自动备份',manual:'手动备份',startup:'启动备份','before-restore':'恢复前备份'}[entry.reason]||entry.reason);select.append(option);}
 if(result.backups.some(entry=>entry.id===selected))select.value=selected;
 status.textContent=action==='list'?`${result.backups.length} / 10 份备份 · 停止变更 3 秒后自动备份，超出自动清理最旧记录`:'操作完成 · 仅保留最近 10 份备份';
 }catch(e){status.textContent='操作失败：'+e.message;}finally{pending=false;select.disabled=false;for(const b of box.querySelectorAll('button'))b.disabled=false;box.querySelector('[data-action=restore]').disabled=!select.value;}}
 for(const b of box.querySelectorAll('button'))b.onclick=()=>run(b.dataset.action);run('list');
})();
