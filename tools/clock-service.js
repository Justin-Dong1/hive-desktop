'use strict';
const path=require('path');
module.exports=({app,ipcMain,BrowserWindow,Notification,powerMonitor})=>{
 const store=require('./clock-store')(path.join(app.getPath('userData'),'hive-clock.json'));
 const broadcast=()=>{const s=store.read();for(const w of BrowserWindow.getAllWindows()){try{if(!w.isDestroyed())w.webContents.send('clock:changed',s);}catch{/* A closing screen must not suppress a saved reminder. */}}};
 ipcMain.handle('clock:read',()=>{try{return {ok:true,state:store.read()};}catch(e){return {ok:false,message:e.message};}});
 ipcMain.handle('clock:change',(_e,r)=>{try{const state=store.change(r);broadcast();return {ok:true,state};}catch(e){return {ok:false,message:e.message};}});
 const notifications=new Set();
 const tick=()=>{try{
  const due=store.tick();if(!due.length)return;broadcast();
  for(const item of due){
   if(!Notification.isSupported())continue;
   const n=new Notification({title:item.kind==='alarm'?'蜂巢闹钟':'蜂巢倒计时结束',body:item.text||'时间到了',silent:false});
   notifications.add(n);n.once('close',()=>notifications.delete(n));n.on('failed',()=>notifications.delete(n));n.show();
  }
 }catch(e){console.error('Clock reminder:',e.message);}};
 const timer=setInterval(tick,1000);tick();
 powerMonitor?.on('suspend',()=>{try{store.suspend();}catch(e){console.error(e);}});
 powerMonitor?.on('resume',()=>{try{store.resume();tick();broadcast();}catch(e){console.error('Clock resume:',e.message);}});
 app.once('before-quit',()=>{try{store.flush();}catch(e){console.error(e);}});
 app.once('will-quit',()=>{clearInterval(timer);for(const n of notifications)n.close();});
};
