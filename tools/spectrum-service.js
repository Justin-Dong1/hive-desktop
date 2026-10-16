'use strict';
const {spawn}=require('child_process'),path=require('path');
module.exports=({app,ipcMain,root})=>{
 const clients=new Map();let child=null,buffer='';
 function stop(){const previous=child;child=null;buffer='';previous?.stdin.end();if(previous){const timer=setTimeout(()=>previous.kill(),2000);timer.unref();}}
 function send(value){for(const [id,c]of clients){if(c.sender.isDestroyed()||Date.now()-c.stamp>5000)clients.delete(id);else c.sender.send('spectrum:frame',value);}}
 function start(){if(child)return;const current=child=spawn(path.join(root,'vendor','NAudio-1.10','HiveSpectrum.exe'),[],{windowsHide:true,stdio:['pipe','pipe','pipe']});current.stderr.resume();current.stdout.setEncoding('utf8');
  current.stdout.on('data',text=>{if(child!==current)return;buffer+=text;if(buffer.length>65536){stop();return;}let end;while((end=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,end);buffer=buffer.slice(end+1);try{const value=JSON.parse(line);send(Array.isArray(value)&&value.length===24&&value.every(x=>Number.isFinite(x)&&x>=0&&x<=1)?value:null);}catch{send(null);}}});
  current.on('error',()=>{if(child===current){child=null;send(null);}});current.stdin.on('error',()=>{});current.on('exit',()=>{if(child===current){child=null;send(null);}});
 }
 ipcMain.on('spectrum:active',(event,active)=>{if(active){clients.set(event.sender.id,{sender:event.sender,stamp:Date.now()});start();}else{clients.delete(event.sender.id);if(!clients.size)stop();}});
 const timer=setInterval(()=>{for(const [id,c]of clients)if(c.sender.isDestroyed()||Date.now()-c.stamp>5000)clients.delete(id);if(!clients.size)stop();},2000);timer.unref();
 app.on('will-quit',()=>{clearInterval(timer);clients.clear();stop();});process.once('exit',()=>child?.kill());
};
