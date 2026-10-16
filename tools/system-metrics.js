'use strict';
module.exports=function(os=require('os'),now=Date.now){
 const snapshot=()=>os.cpus().reduce((sum,c)=>{sum.idle+=c.times.idle;sum.total+=Object.values(c.times).reduce((a,b)=>a+b,0);return sum;},{idle:0,total:0});
 let previous=snapshot(),stamp=now(),cached=null;
 return ()=>{
  const time=now();if(cached&&time-stamp<900)return cached;
  const current=snapshot(),elapsed=time-stamp,totalDelta=current.total-previous.total,idleDelta=current.idle-previous.idle;
  const cpu=elapsed>=200&&elapsed<=10000&&totalDelta>0&&idleDelta>=0?Math.round(Math.max(0,Math.min(100,(1-idleDelta/totalDelta)*100))):null;
  previous=current;stamp=time;const total=os.totalmem(),used=Math.max(0,total-os.freemem());
  cached={cpu,memory:total>0?Math.round(used/total*100):0,used,total};return cached;
 };
};
