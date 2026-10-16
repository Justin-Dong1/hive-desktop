'use strict';

const stage = document.getElementById('stage');
const hive = document.getElementById('hive');
const cells = document.getElementById('cells');
const svg = document.getElementById('connections');
const island = document.getElementById('island');
const loading = document.getElementById('loading');
const empty = document.getElementById('empty');
const toastEl = document.getElementById('toast');
let items = [];
let coords = [];
let scale = 1;
let tx = 0;
let ty = 0;
let selected = null;
let toastTimer = null;
const radius = 69;
let slots = [];
try { const saved=JSON.parse(localStorage.getItem('hive-slots') || '[]'); if(Array.isArray(saved)) slots=saved; } catch (_) {}
let refreshRunning = false;
let refreshAgain = false;
let drag = null;
let suppressClickUntil = 0;
let preferredSize = Number(localStorage.getItem('hive-size') || 100);
if (!Number.isFinite(preferredSize)) preferredSize=100;
preferredSize=Math.max(65,Math.min(125,preferredSize));

function axialSpiral(count) {
  const result = [{ q: 0, r: 0 }];
  const dirs = [[1,0],[1,-1],[0,-1],[-1,0],[-1,1],[0,1]];
  for (let radius = 1; result.length < count; radius++) {
    let q = -radius, r = radius;
    for (let side = 0; side < 6; side++) {
      for (let step = 0; step < radius; step++) {
        if (result.length >= count) return result;
        result.push({ q, r });
        q += dirs[side][0]; r += dirs[side][1];
      }
    }
  }
  return result;
}

function xy(c) { return { x: radius * 1.5 * c.q, y: radius * Math.sqrt(3) * (c.r + c.q / 2) }; }
function polygonPoints(x, y, cellRadius = radius) {
  return Array.from({length:6}, (_,i) => {
    const angle = Math.PI / 3 * i;
    return `${(x + cellRadius*Math.cos(angle)).toFixed(1)},${(y + cellRadius*Math.sin(angle)).toFixed(1)}`;
  }).join(' ');
}

function applyTransform() { hive.style.transform = `translate(${tx}px,${ty}px) scale(${scale})`; }
function recenter() {
  const rect = stage.getBoundingClientRect();
  const points = coords.map(xy);
  if (!points.length) return;
  const minX = Math.min(...points.map(p=>p.x)) - radius;
  const maxX = Math.max(...points.map(p=>p.x)) + radius;
  const minY = Math.min(...points.map(p=>p.y)) - radius;
  const maxY = Math.max(...points.map(p=>p.y)) + radius;
  const fit = Math.min((rect.width-32)/(maxX-minX), (rect.height-32)/(maxY-minY));
  const recommended = Math.min(1,fit*.85);
  scale = Math.min(fit,recommended*preferredSize/100);
  document.getElementById('sizeSlider').value=preferredSize;
  document.getElementById('sizeValue').textContent=`${preferredSize}%${scale>=fit-.001?' · 屏幕上限':''}`;
  tx = rect.width/2 - (minX+maxX)/2*scale;
  ty = rect.height/2 - (minY+maxY)/2*scale;
  applyTransform();
}

function toast(message) {
  toastEl.textContent = message;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2200);
}

function render() {
  cells.replaceChildren();
  svg.replaceChildren();
  slots = updateSlots(slots, items.map(item=>item.id));
  try { localStorage.setItem('hive-slots',JSON.stringify(slots)); } catch (_) {}
  const byId = new Map(items.map(item=>[item.id,item]));
  coords = axialSpiral(hiveCapacity(slots.length));
  const points = coords.map(xy);
  const minX = Math.min(...points.map(p=>p.x)) - radius * 1.2;
  const minY = Math.min(...points.map(p=>p.y)) - radius * 1.2;
  const maxX = Math.max(...points.map(p=>p.x)) + radius * 1.2;
  const maxY = Math.max(...points.map(p=>p.y)) + radius * 1.2;
  // Root SVG x/y do not position it in an HTML containing block.
  svg.style.left = `${minX}px`; svg.style.top = `${minY}px`;
  svg.setAttribute('width', maxX-minX); svg.setAttribute('height', maxY-minY);
  svg.setAttribute('viewBox', `${minX} ${minY} ${maxX-minX} ${maxY-minY}`);
  coords.forEach((c, i) => {
    const p = points[i];
    const poly = document.createElementNS('http://www.w3.org/2000/svg','polygon');
    poly.setAttribute('points', polygonPoints(p.x,p.y));
    const item = byId.get(slots[i]);
    if (item) poly.classList.add('occupied');
    svg.appendChild(poly);
    if (!item) return;
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.dataset.slot=String(i);
    cell.style.left = `${p.x}px`; cell.style.top = `${p.y}px`;
    const hit = document.createElement('div'); hit.className = 'cell-hit';
    const app = document.createElement('div'); app.className = 'app'; app.dataset.id = item.id;
    const ring = document.createElement('div'); ring.className = 'icon-ring';
    if (item.icon) {
      const img = document.createElement('img'); img.src = item.icon; img.alt = '';
      ring.appendChild(img);
    } else {
      const fallback = document.createElement('div'); fallback.className='fallback'; fallback.textContent=item.directory?'⌂':item.initials;
      ring.appendChild(fallback);
    }
    const label = document.createElement('div'); label.className='label'; label.textContent=item.name; label.title=item.name;
    app.append(ring,label); hit.appendChild(app); cell.appendChild(hit); cells.appendChild(cell);
    app.addEventListener('click', (event) => {
      event.stopPropagation();
      if(Date.now()<suppressClickUntil) return;
      document.querySelectorAll('.app.selected').forEach(el=>el.classList.remove('selected'));
      app.classList.add('selected'); selected = item.id;
    });
    app.addEventListener('dblclick', async (event) => {
      event.stopPropagation();
      if(Date.now()<suppressClickUntil) return;
      const result = await window.glassHive.openItem(item.id);
      if (!result.ok) toast(result.message || '无法打开这个项目');
    });
    app.addEventListener('contextmenu', async (event) => {
      event.preventDefault(); event.stopPropagation();
      await window.glassHive.revealItem(item.id); toast('已在资源管理器中定位');
    });
  });
  document.getElementById('itemMetric').textContent = String(items.length);
  empty.style.display = items.length ? 'none':'block';
  recenter();
}

async function refresh(silent = false) {
  if(drag) { refreshAgain=true; return; }
  if(refreshRunning) { refreshAgain=true; return; }
  refreshRunning=true;
  if(!silent) loading.style.display='block';
  try { items = await window.glassHive.listDesktop(); render(); }
  catch (_) { toast('读取桌面失败，请重新启动'); }
  finally {
    loading.style.display='none'; refreshRunning=false;
    if(refreshAgain) { refreshAgain=false; void refresh(true); }
  }
}

async function refreshStatus() {
  try {
    const s = await window.glassHive.systemStatus();
    document.getElementById('pulse').classList.toggle('on', s.wallpaperEngine);
    document.getElementById('islandTitle').textContent = s.wallpaperEngine ? 'Wallpaper Engine · 动态壁纸已连接' : 'Wallpaper Engine · 未运行';
    document.getElementById('wallpaperMetric').textContent = s.wallpaperEngine ? '运行中 · 原生透视' : '未检测到进程';
    document.getElementById('memoryMetric').textContent = `${s.memory}%`;
  } catch (_) {}
}

function clock() {
  const now = new Date();
  document.getElementById('clock').textContent = now.toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit',hour12:false});
}

island.addEventListener('click', () => {
  const open = island.classList.toggle('open');
  island.setAttribute('aria-expanded', String(open));
});
document.querySelector('.island-panel').addEventListener('click', e=>e.stopPropagation());
document.getElementById('refresh').addEventListener('click', () => refresh());
document.getElementById('recenter').addEventListener('click', () => {
  preferredSize=100; localStorage.setItem('hive-size','100'); recenter();
});
document.getElementById('sizeSlider').addEventListener('input', e => {
  preferredSize=Number(e.target.value); localStorage.setItem('hive-size',String(preferredSize)); recenter();
});
document.getElementById('labels').addEventListener('click', function(){
  const hover = document.body.classList.toggle('labels-hover');
  this.textContent = hover ? '标签：悬停' : '标签：常显';
});
document.getElementById('quit').addEventListener('click', () => window.glassHive.quit());

stage.addEventListener('click', e => {
  if(Date.now()<suppressClickUntil) return;
  if (e.target.closest('.app')) return;
  document.querySelectorAll('.app.selected').forEach(el=>el.classList.remove('selected'));
  selected=null;
});
stage.addEventListener('pointerdown', e => {
  const cell=e.target.closest('.cell');
  if(e.button!==0 || !cell) return;
  drag={cell,from:Number(cell.dataset.slot),x:e.clientX,y:e.clientY,active:false,target:-1};
});
stage.addEventListener('pointermove', e => {
  if(!drag) return;
  const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
  if(!drag.active && Math.hypot(dx,dy)<7) return;
  if(!drag.active) stage.setPointerCapture(e.pointerId);
  drag.active=true; drag.cell.classList.add('dragging');
  drag.cell.style.transform=`translate(${dx/scale}px,${dy/scale}px)`;
  const rect=stage.getBoundingClientRect();
  const x=(e.clientX-rect.left-tx)/scale,y=(e.clientY-rect.top-ty)/scale;
  let nearest=-1,distance=Infinity;
  coords.forEach((c,i)=>{ const p=xy(c),d=Math.hypot(x-p.x,y-p.y); if(d<distance){nearest=i;distance=d;} });
  drag.target=distance<=radius ? nearest : -1;
  [...svg.children].forEach((p,i)=>p.classList.toggle('drop-target',i===drag.target));
});
function endDrag(e,cancelled=false) {
  if(!drag) return;
  const current=drag; drag=null;
  if(stage.hasPointerCapture(e.pointerId)) stage.releasePointerCapture(e.pointerId);
  current.cell.style.transform=''; current.cell.classList.remove('dragging');
  [...svg.children].forEach(p=>p.classList.remove('drop-target'));
  if(current.active) {
    suppressClickUntil=Date.now()+450;
    if(!cancelled && current.target>=0 && current.target!==current.from) {
      while(slots.length<=current.target) slots.push(null);
      [slots[current.from],slots[current.target]]=[slots[current.target],slots[current.from]];
      render();
    }
  }
  if(refreshAgain) {refreshAgain=false; void refresh(true);}
}
stage.addEventListener('pointerup',e=>endDrag(e));
stage.addEventListener('pointercancel',e=>endDrag(e,true));
document.addEventListener('dragstart', e => e.preventDefault());
window.addEventListener('resize', recenter);
window.addEventListener('keydown', e=>{ if(e.ctrlKey && e.key.toLowerCase()==='q') window.glassHive.quit(); if(e.key==='Escape') island.classList.remove('open'); });
window.glassHive.onStyleResult(result => { if(!result.ok) toast('任务栏玻璃效果未能应用，桌面层仍可使用'); });

window.glassHive.onDesktopChanged(() => refresh(true));
clock(); setInterval(clock,1000); refreshStatus(); setInterval(refreshStatus,10000); refresh();
