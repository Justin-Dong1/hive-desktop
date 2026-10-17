'use strict';
const {spawn}=require('child_process');
module.exports=script=>{
 let child,pending,buffer='',queue=Promise.resolve(),generation=0;
 function stop(){const old=child;child=null;buffer='';if(pending){clearTimeout(pending.timer);pending.resolve({ok:false});pending=null;}old?.kill();}
 function start(){if(child)return;const current=child=spawn('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',script,'-Serve'],{windowsHide:true,stdio:['pipe','pipe','pipe']});current.stdout.setEncoding('utf8');current.stderr.resume();
  for(const stream of [current,current.stdin])stream.on('error',()=>{if(child===current)stop();});current.on('exit',()=>{if(child===current)stop();});
  current.stdout.on('data',data=>{if(child!==current)return;buffer+=data;if(buffer.length>65536){stop();return;}const end=buffer.indexOf('\n');if(end<0)return;const line=buffer.slice(0,end).replace(/^\uFEFF/,'');buffer=buffer.slice(end+1);if(!pending)return;let result;try{result=JSON.parse(line);if(!result||typeof result.ok!=='boolean')throw Error('Invalid focus response');}catch{stop();return;}const request=pending;pending=null;clearTimeout(request.timer);request.resolve(result);});
 }
 function request(handle,action){const epoch=generation;const run=()=>new Promise(resolve=>{if(epoch!==generation){resolve({ok:false});return;}try{start();pending={resolve,timer:setTimeout(stop,5000)};child.stdin.write(JSON.stringify({handle,action})+'\n');}catch{stop();resolve({ok:false});}});queue=queue.then(run,run);return queue;}
 return {start,request,stop(){generation++;stop();}};
};
