(function(root){
 'use strict';
 function timeline(session,now=Date.now()){
  const start=Number.isFinite(session?.controls?.start)?session.controls.start:0,end=session?.duration;
  const valid=Number.isFinite(end)&&end>start&&Number.isFinite(session?.position);
  if(!valid)return {valid:false,start:0,end:0,position:0,elapsed:0,duration:0,percent:0,canSeek:false,min:0,max:0};
  const rate=Number.isFinite(session.controls?.rate)?session.controls.rate:1;
  const delta=session.playing&&session.updated>0&&session.updated<=now?(now-session.updated)/1000*rate:0;
  const position=Math.max(start,Math.min(end,session.position+delta));
  const constrained=Number.isFinite(session.controls?.maxSeek)&&session.controls.maxSeek>session.controls.minSeek;
  const min=constrained?Math.max(start,session.controls.minSeek):start,max=constrained?Math.min(end,session.controls.maxSeek):end;
  return {valid:true,start,end,position,elapsed:position-start,duration:end-start,percent:(position-start)/(end-start)*100,canSeek:!!session.controls?.seek&&max>min,min,max};
 }
 function format(seconds){if(!Number.isFinite(seconds)||seconds<0)return '--:--';const n=Math.floor(seconds),h=Math.floor(n/3600),m=Math.floor(n%3600/60),s=String(n%60).padStart(2,'0');return h?`${h}:${String(m).padStart(2,'0')}:${s}`:`${m}:${s}`;}
 const api={timeline,format};if(typeof module==='object'&&module.exports)module.exports=api;else root.HiveMediaTimeline=api;
})(typeof globalThis!=='undefined'?globalThis:this);
