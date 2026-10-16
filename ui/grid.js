'use strict';
const HiveGrid=(()=>{
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number(v)||0));
 function settings(s={}){const original=Number(s.cell)||120,cell=Math.round(clamp(original,100,150)/2)*2,iconRatio=clamp(s.iconRatio||(Number(s.icon)||48)/original,.18,.5);return {cell,iconRatio,icon:Math.round(clamp(iconRatio*cell,28,Math.floor(cell/4)*2)/2)*2,x:clamp(s.x,-192,192),y:clamp(s.y,-192,192),labels:['always','hover','hidden'].includes(s.labels)?s.labels:'always'};}
 function resize(s,cell){return settings({...s,cell,iconRatio:s.iconRatio||s.icon/s.cell});}
 function build(w,h,s){const R=s.cell/2,H=R*Math.sqrt(3)/2,cx=w/2+s.x,cy=h/2+s.y,out=[];
  for(let q=Math.floor((-R-cx)/(1.5*R));q<=Math.ceil((w+R-cx)/(1.5*R));q++)for(let r=Math.floor((-H-cy)/(2*H)-q/2);r<=Math.ceil((h+H-cy)/(2*H)-q/2);r++){
   const x=cx+1.5*R*q,y=cy+2*H*(r+q/2);out.push({key:`${q}:${r}`,x,y,complete:x-R>=1&&x+R<=w-1&&y-H>=1&&y+H<=h-1});
  }return out.sort((a,b)=>Math.hypot(a.x-w/2,a.y-h/2)-Math.hypot(b.x-w/2,b.y-h/2));}
 function place(ids,previous,grid){const valid=grid.filter(c=>c.complete),keys=new Set(valid.map(c=>c.key)),used=new Set(),next={};if(!valid.length)return next;
  for(const id of ids){const p=previous[id];if(p&&keys.has(p.key)&&Number.isInteger(p.page)&&p.page>=0&&!used.has(`${p.page}/${p.key}`)){next[id]={...p};used.add(`${p.page}/${p.key}`);}}
  for(const id of ids)if(!next[id]){let page=0,c;while(!(c=valid.find(c=>!used.has(`${page}/${c.key}`))))page++;next[id]={page,key:c.key};used.add(`${page}/${c.key}`);}return next;}
 function hit(grid,x,y,d){const R=d/2;return grid.find(c=>{const dx=Math.abs(x-c.x),dy=Math.abs(y-c.y);return dx<=R&&dy<=Math.sqrt(3)*Math.min(R/2,R-dx);});}
 return {settings,resize,build,place,hit};
})();
if(typeof module!=='undefined')module.exports=HiveGrid;
