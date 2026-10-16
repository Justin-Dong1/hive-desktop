'use strict';
(()=>{
 const heading=document.querySelector('#hubHome .hub-heading'),panel=document.getElementById('island-functions'),home=document.getElementById('hubHome'),island=document.getElementById('island');
 const cards=document.createElement('div');cards.className='hub-metrics';cards.setAttribute('aria-label','系统资源占用');
 cards.innerHTML='<div class="hub-resource"><span>CPU</span><strong id="hubCpu">—</strong><meter id="hubCpuMeter" min="0" max="100" value="0" aria-label="CPU 使用率"></meter><small>系统总占用</small></div><div class="hub-resource"><span>内存</span><strong id="hubMemory">—</strong><meter id="hubMemoryMeter" min="0" max="100" value="0" aria-label="内存使用率"></meter><small id="hubMemoryDetail">正在读取</small></div>';
 heading.append(cards);let busy=false,previous=0;
 const visible=()=>!document.hidden&&!island.hidden&&island.classList.contains('open')&&panel.classList.contains('active')&&!home.hidden;
 async function update(){if(!visible()||busy||Date.now()-previous<900)return;busy=true;previous=Date.now();try{const s=await window.glassHive.systemMetrics();document.getElementById('hubCpu').textContent=s.cpu===null?'—':`${s.cpu}%`;document.getElementById('hubCpuMeter').value=s.cpu||0;document.getElementById('hubMemory').textContent=`${s.memory}%`;document.getElementById('hubMemoryMeter').value=s.memory;document.getElementById('hubMemoryDetail').textContent=`${(s.used/2**30).toFixed(1)} / ${(s.total/2**30).toFixed(1)} GB`;}catch{for(const id of ['hubCpu','hubMemory'])document.getElementById(id).textContent='—';document.getElementById('hubMemoryDetail').textContent='暂不可用';}finally{busy=false;}}
 for(const target of [island,panel,home])new MutationObserver(update).observe(target,{attributes:true,attributeFilter:['class','hidden']});
 document.addEventListener('visibilitychange',update);setInterval(update,1500);update();
})();
