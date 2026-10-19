'use strict';
(()=>{
 const page=document.getElementById('island-music');if(!page)return;
 const box=document.createElement('div');box.className='system-volume';
 box.innerHTML='<label for="systemVolume">电脑音量</label><input id="systemVolume" type="range" min="0" max="100" step="1" value="0" disabled aria-label="电脑系统音量"><output for="systemVolume">--%</output><small role="status">正在读取默认播放设备…</small>';
 page.querySelector('.music-controls').after(box);
 const slider=box.querySelector('input'),output=box.querySelector('output'),status=box.querySelector('small');let busy=false,pending=null,editing=false,revision=0,timer;
 const visible=()=>page.classList.contains('active')&&island.classList.contains('open')&&!island.hidden;
 const preview=()=>{output.textContent=slider.value+'%';slider.style.setProperty('--volume',slider.value+'%');slider.setAttribute('aria-valuetext',slider.value+'%');};
 function show(r){if(!r.ok){status.textContent=r.message;return;}slider.disabled=false;slider.value=r.volume;preview();status.textContent=(r.muted?'系统已静音 · ':'')+r.device;}
 async function write(){
  if(busy||pending===null)return;const value=pending;pending=null;busy=true;const version=revision;
  try{const r=await window.glassHive.systemVolume('set',value);if(version===revision){if(r.ok){show(r);}else{status.textContent=r.message;}}}
  catch{status.textContent='音量设置失败，请重试';}finally{busy=false;if(pending!==null)write();}
 }
 slider.addEventListener('pointerdown',()=>{editing=true;});
 slider.addEventListener('input',()=>{revision++;pending=Number(slider.value);preview();clearTimeout(timer);timer=setTimeout(write,120);});
 slider.addEventListener('change',()=>{editing=false;clearTimeout(timer);write();});
 window.addEventListener('pointerup',()=>{if(editing){editing=false;clearTimeout(timer);write();}});
 slider.addEventListener('pointercancel',()=>{editing=false;write();});
 async function read(){if(!visible()||busy||editing||pending!==null)return;busy=true;const version=revision;
  try{const r=await window.glassHive.systemVolume();if(version===revision&&!editing)show(r);}catch{status.textContent='音量读取失败，请稍后重试';}finally{busy=false;if(pending!==null)write();}
 }
 new MutationObserver(read).observe(page,{attributes:true,attributeFilter:['class']});
 new MutationObserver(read).observe(island,{attributes:true,attributeFilter:['class','hidden']});
 setInterval(read,3000);read();
})();
