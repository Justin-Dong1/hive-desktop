'use strict';
const {spawn}=require('child_process');
module.exports=function(script){
 let child=null,pending=null,buffer='',idle;
 function dispose(){clearTimeout(idle);const old=child;child=null;buffer='';if(pending){clearTimeout(pending.timer);pending.resolve({ok:false,sessions:[],message:'媒体读取进程已停止'});pending=null;}old?.kill();}
 function read(){
  if(pending)return pending.promise;clearTimeout(idle);
  if(!child){
   child=spawn('powershell.exe',['-Mta','-NoProfile','-ExecutionPolicy','Bypass','-File',script,'-Serve'],{windowsHide:true,stdio:['pipe','pipe','pipe']});
   const current=child;current.stdout.setEncoding('utf8');current.stderr.resume();
   current.on('error',()=>{if(child===current)dispose();});current.on('exit',()=>{if(child===current)dispose();});current.stdin.on('error',()=>{if(child===current)dispose();});
   current.stdout.on('data',chunk=>{
    if(child!==current)return;buffer+=chunk;if(buffer.length>32*1024*1024){dispose();return;}
    const index=buffer.indexOf('\n');if(index<0)return;
    const line=buffer.slice(0,index).replace(/^\uFEFF/,'').trim();buffer=buffer.slice(index+1);
    if(!pending)return;let result;try{result=JSON.parse(line);if(!result||typeof result.ok!=='boolean'||!Array.isArray(result.sessions)||result.sessions.some(s=>!s||typeof s.source!=='string'||typeof s.playing!=='boolean'))throw Error('Invalid media response');}catch{dispose();return;}
    const request=pending;pending=null;clearTimeout(request.timer);request.resolve(result);idle=setTimeout(dispose,60000);idle.unref();
   });
  }
  let resolve;const promise=new Promise(r=>resolve=r);pending={promise,resolve,timer:setTimeout(dispose,18000)};
  try{child.stdin.write('status\n');}catch{dispose();}return promise;
 }
 return {read,dispose};
};
