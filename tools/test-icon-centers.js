'use strict';
const {app,BrowserWindow}=require('electron'),fs=require('fs'),path=require('path'),assert=require('assert');
app.setPath('userData',fs.mkdtempSync(path.join(require('os').tmpdir(),'hive-circle-test-')));
app.whenReady().then(async()=>{
 const html=fs.readFileSync(path.join(__dirname,'../ui/index.html'),'utf8'),styles=[...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map(m=>m[1]).join('\n');
 const win=new BrowserWindow({show:false,webPreferences:{contextIsolation:true,nodeIntegration:false}});
 await win.loadURL('data:text/html;charset=utf-8,'+encodeURIComponent(`<style>${styles}</style><div class="icon-ring" style="--icon:48px"><img data-icon-style="inner"></div>`));
 let count=0,maxError=0;
 for(const zoom of [1,1.25,1.5,1.75,2]){
  win.webContents.setZoomFactor(zoom);
  const results=await win.webContents.executeJavaScript(`(()=>{const ring=document.querySelector('.icon-ring'),img=ring.querySelector('img'),results=[];for(let size=28;size<=75;size++){ring.style.setProperty('--icon',size+'px');for(const style of ['inner','contain']){img.dataset.iconStyle=style;const a=ring.getBoundingClientRect(),b=img.getBoundingClientRect();const outline=getComputedStyle(ring,'::after');results.push({dx:Math.abs(a.x+a.width/2-b.x-b.width/2),dy:Math.abs(a.y+a.height/2-b.y-b.height/2),square:Math.abs(b.width-b.height),outline:[outline.top,outline.left,outline.right,outline.bottom]});}}return results;})()`);
  for(const r of results){maxError=Math.max(maxError,r.dx,r.dy);assert(r.dx<=.02&&r.dy<=.02&&r.square<=.02,JSON.stringify(r));assert(r.outline.every(x=>x==='0px'));count++;}
 }
 console.log(JSON.stringify({ok:true,cases:count,maxCenterErrorCssPx:maxError,zoomFactors:[1,1.25,1.5,1.75,2]}));win.destroy();app.exit(0);
}).catch(e=>{console.error(e);app.exit(1);});
