'use strict';
(()=>{
 const el=document.getElementById('island'),handle=el.querySelector('.island-compact');
 let saved=layoutRead('hive-island',{});
 let mode=saved?.mode==='dot'?'dot':'bar';
 const positions={dot:{x:Number(saved?.x)||innerWidth/2-24,y:Number(saved?.y)||12,anchor:saved?.anchor||null},bar:saved?.bar||{...IslandGeometry.barAnchors(innerWidth,innerHeight)[0],anchor:'top'}};
 let pos=positions[mode];
 let moving=null,ignoreClick=0;
 const store=()=>{positions[mode]={...pos};storedWrite(layoutKey('hive-island'),JSON.stringify({mode,...positions.dot,bar:positions.bar}));};
 function layout(){
  const open=el.classList.contains('open');
  el.setAttribute('aria-expanded',String(open));
  const a=(mode==='bar'?IslandGeometry.barAnchors:IslandGeometry.anchors)(innerWidth,innerHeight).find(a=>a.id===pos.anchor);
  if(a&&!moving)pos={x:a.x,y:a.y,anchor:a.id};
  pos={...pos,...(mode==='bar'?IslandGeometry.containBar:IslandGeometry.contain)(pos,innerWidth,innerHeight)};
  const compactWidth=mode==='bar'?IslandGeometry.barWidth(innerWidth):48;
  const w=open?Math.min(620,innerWidth-16):compactWidth;
  const h=open?Math.min(480,innerHeight-16):48;
  let x=pos.x+(compactWidth-w)/2;
  let y=pos.y;
  x=Math.max(8,Math.min(innerWidth-w-8,x));y=Math.max(8,Math.min(innerHeight-h-8,y));
  Object.assign(el.style,{left:`${x}px`,top:`${y}px`,width:`${w}px`,height:`${h}px`,translate:'none'});
  document.getElementById('islandBar').setAttribute('aria-pressed',String(mode==='bar'));
  document.getElementById('islandDot').setAttribute('aria-pressed',String(mode==='dot'));
  handle.title=mode==='dot'?'点击展开；拖动圆点移动，靠近边角自动吸附':'点击展开；拖动长条移动，仅顶部中央和底部中央吸附';
 }
 function setMode(next){positions[mode]={...pos};mode=next;pos={...positions[mode]};el.classList.toggle('dot-mode',mode==='dot');el.classList.remove('open');layout();store();}
 document.getElementById('islandBar').onclick=()=>setMode('bar');
 document.getElementById('islandDot').onclick=()=>setMode('dot');
 handle.onclick=e=>{e.stopPropagation();if(Date.now()<ignoreClick)return;el.classList.toggle('open');layout();};
 handle.addEventListener('pointerdown',e=>{
  if(e.button!==0||el.classList.contains('open'))return;
  // Start from the rendered location, even if an earlier snap is still animating.
  const rect=el.getBoundingClientRect();
  moving={id:e.pointerId,x:e.clientX,y:e.clientY,start:{x:rect.x,y:rect.y,anchor:null},active:false};
  handle.setPointerCapture(e.pointerId);e.stopPropagation();
 });
 handle.addEventListener('pointermove',e=>{
  if(!moving)return;const dx=e.clientX-moving.x,dy=e.clientY-moving.y;
  if(!moving.active&&Math.hypot(dx,dy)<5)return;
  moving.active=true;el.classList.add('island-moving');
  pos=(mode==='bar'?IslandGeometry.snapBar:IslandGeometry.snap)({x:moving.start.x+dx,y:moving.start.y+dy},innerWidth,innerHeight);
  el.classList.toggle('island-snapped',!!pos.anchor);layout();
 });
 function finish(cancel){if(!moving)return;const m=moving;moving=null;if(handle.hasPointerCapture(m.id))handle.releasePointerCapture(m.id);if(cancel&&m.active)pos=m.start;if(m.active)ignoreClick=Date.now()+350;el.classList.remove('island-moving','island-snapped');layout();store();}
 handle.addEventListener('pointerup',()=>finish(false));handle.addEventListener('pointercancel',()=>finish(true));handle.addEventListener('lostpointercapture',()=>{if(moving)finish(true);});
 // Also finish when the pointer is released outside the compact handle.
 window.addEventListener('pointerup',()=>finish(false));
 window.addEventListener('blur',()=>finish(true));
 window.addEventListener('keydown',e=>{if(e.key==='Escape')finish(true);});
 window.addEventListener('resize',()=>{finish(true);layout();store();});
 // Existing grid actions may close the panel, so keep its compact bounds synchronized.
 new MutationObserver(()=>layout()).observe(el,{attributes:true,attributeFilter:['class']});
 el.classList.toggle('dot-mode',mode==='dot');layout();store();
})();
