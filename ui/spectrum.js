'use strict';
(()=>{
 const host=document.getElementById('island'),compact=host.querySelector('.island-compact'),visual=document.createElement('div');visual.id='hiveSpectrum';visual.setAttribute('aria-label','系统音频实时频谱');visual.setAttribute('role','img');
 for(let i=0;i<24;i++)visual.append(document.createElement('i'));compact.append(visual);
 let playing=false,busy=false,active=false,last=0;const smooth=Array(12).fill(0);
 function clear(){if(host.classList.contains('has-spectrum'))host.classList.remove('has-spectrum');}
 function update(){const next=playing&&!host.hidden&&!host.classList.contains('wallpaper-idle')&&!host.classList.contains('dot-mode')&&!host.classList.contains('open');active=next;window.glassHive.spectrumActive(active);if(!active){clear();smooth.fill(0);}}
 async function poll(){if(busy)return;busy=true;try{const r=await window.glassHive.mediaStatus();playing=r.ok&&r.sessions.some(s=>s.playing);}catch{playing=false;}finally{busy=false;update();}}
 window.glassHive.onSpectrum(values=>{if(!active)return;last=Date.now();if(!values){clear();return;}if(!host.classList.contains('has-spectrum'))host.classList.add('has-spectrum');for(let band=0;band<12;band++){const value=Math.max(values[band*2],values[band*2+1]);smooth[band]=Math.max(value,smooth[band]*.76);const height=`scaleY(${.07+.93*smooth[band]})`;visual.children[11-band].style.transform=height;visual.children[12+band].style.transform=height;}});
 new MutationObserver(update).observe(host,{attributes:true,attributeFilter:['class','hidden']});
 setInterval(()=>{if(!host.hidden&&!host.classList.contains('dot-mode'))poll();else{playing=false;update();}if(Date.now()-last>2000)clear();},1200);poll();
})();
