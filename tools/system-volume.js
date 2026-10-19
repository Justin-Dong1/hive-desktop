'use strict';
module.exports=function({ipcMain,root,execFile=require('child_process').execFile}){
 let queue=Promise.resolve(),reading=null;
 const run=(action,value)=>new Promise(resolve=>execFile('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',require('path').join(root,'tools','system-volume.ps1'),'-Mode',action,...(action==='set'?['-Value',String(value)]:[])],{windowsHide:true,timeout:5000,encoding:'utf8'},(error,out)=>{
  try{const r=JSON.parse(String(out).replace(/^\uFEFF/,''));if(error||r.ok!==true||!Number.isInteger(r.volume)||r.volume<0||r.volume>100)throw Error();resolve(r);}catch{resolve({ok:false,message:'无法读取或调节系统音量，请检查播放设备。'});}
 }));
 ipcMain.handle('system:volume',(_event,action='get',value)=>{
  if(!['get','set'].includes(action)||(action==='set'&&(!Number.isInteger(value)||value<0||value>100)))return {ok:false,message:'音量须为 0–100 的整数'};
  if(action==='get'&&reading)return reading;
  const result=queue.then(()=>run(action,value));queue=result.catch(()=>{});
  if(action==='get'){reading=result;result.finally(()=>{if(reading===result)reading=null;});}
  return result;
 });
};
