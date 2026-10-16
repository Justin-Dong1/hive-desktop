'use strict';
const {app,BrowserWindow}=require('electron'),fs=require('fs'),path=require('path'),assert=require('assert');
app.setPath('userData',fs.mkdtempSync(path.join(require('os').tmpdir(),'hive-hover-test-')));
app.whenReady().then(async()=>{
 const html=fs.readFileSync(path.join(__dirname,'../ui/index.html'),'utf8'),styles=[...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map(m=>m[1]).join('\n');
 const win=new BrowserWindow({show:false,webPreferences:{contextIsolation:true,nodeIntegration:false}});
 await win.loadURL('data:text/html;charset=utf-8,'+encodeURIComponent(`<style>${styles}</style><div id="cells" style="--icon:48px"><div class="app"><div class="icon-ring"><img data-icon-style="inner"></div></div></div>`));
 const debug=win.webContents.debugger;debug.attach('1.3');await debug.sendCommand('DOM.enable');await debug.sendCommand('CSS.enable');const {root}=await debug.sendCommand('DOM.getDocument');const {nodeId}=await debug.sendCommand('DOM.querySelector',{nodeId:root.nodeId,selector:'.app'});
 const state=()=>win.webContents.executeJavaScript(`(()=>{const ring=document.querySelector('.icon-ring'),r=ring.getBoundingClientRect(),a=document.querySelector('.app').getBoundingClientRect(),i=ring.querySelector('img').getBoundingClientRect();return {y:r.y,appY:a.y,dx:r.x+r.width/2-i.x-i.width/2,dy:r.y+r.height/2-i.y-i.height/2,pointer:getComputedStyle(ring).pointerEvents};})()`);
 const pause=()=>new Promise(r=>setTimeout(r,300)),base=await state();
 await debug.sendCommand('CSS.forcePseudoState',{nodeId,forcedPseudoClasses:['hover']});await pause();let hover=await state();assert(Math.abs(hover.y-base.y+5)<.02);assert.equal(hover.appY,base.appY);assert.equal(hover.pointer,'none');assert(Math.abs(hover.dx)<.02&&Math.abs(hover.dy)<.02);
 await win.webContents.executeJavaScript("document.body.classList.add('grid-drag')");await pause();assert(Math.abs((await state()).y-base.y)<.02);
 await win.webContents.executeJavaScript("document.body.classList.remove('grid-drag')");await debug.sendCommand('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await pause();assert(Math.abs((await state()).y-base.y)<.02);
 await debug.sendCommand('Emulation.setEmulatedMedia',{features:[]});await debug.sendCommand('CSS.forcePseudoState',{nodeId,forcedPseudoClasses:[]});await pause();assert(Math.abs((await state()).y-base.y)<.02);
 console.log('PASS real Chromium hover lift 5px, stable hitbox, concentric circles, drag suppression, reduced motion and return');win.destroy();app.exit(0);
}).catch(e=>{console.error(e);app.exit(1);});
