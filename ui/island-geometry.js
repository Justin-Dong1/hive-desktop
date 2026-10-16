'use strict';
const IslandGeometry=(()=>{
 const diameter=48,margin=diameter/3;
 const clamp=(n,min,max)=>Math.max(min,Math.min(max,Number(n)||0));
 function bounds(w,h,d=diameter){return {left:Math.min(margin,Math.max(0,(w-d)/2)),top:Math.min(margin,Math.max(0,(h-d)/2)),right:Math.max(0,w-d-margin),bottom:Math.max(0,h-d-margin)};}
 function contain(p,w,h,d=diameter){const b=bounds(w,h,d);return {x:clamp(p.x,b.left,Math.max(b.left,b.right)),y:clamp(p.y,b.top,Math.max(b.top,b.bottom))};}
 function anchors(w,h){const b=bounds(w,h),x=(b.left+b.right)/2,y=(b.top+b.bottom)/2;return [{id:'top',x,y:b.top},{id:'bottom',x,y:b.bottom},{id:'left',x:b.left,y},{id:'right',x:b.right,y},{id:'top-left',x:b.left,y:b.top},{id:'top-right',x:b.right,y:b.top},{id:'bottom-left',x:b.left,y:b.bottom},{id:'bottom-right',x:b.right,y:b.bottom}];}
 function snap(p,w,h){const bounded=contain(p,w,h);const a=anchors(w,h).sort((a,b)=>Math.hypot(a.x-bounded.x,a.y-bounded.y)-Math.hypot(b.x-bounded.x,b.y-bounded.y))[0];return Math.hypot(a.x-bounded.x,a.y-bounded.y)<=diameter*2.5?{x:a.x,y:a.y,anchor:a.id}:{...bounded,anchor:null};}
 function barWidth(w){return Math.min(292,Math.max(1,w-32));}
 function containBar(p,w,h){return {x:clamp(p.x,Math.min(margin,Math.max(0,(w-barWidth(w))/2)),Math.max(0,w-barWidth(w)-margin)),y:clamp(p.y,Math.min(margin,Math.max(0,(h-diameter)/2)),Math.max(0,h-diameter-margin))};}
 function barAnchors(w,h){const top=containBar({x:(w-barWidth(w))/2,y:0},w,h),bottom=containBar({x:top.x,y:h},w,h);return [{id:'top',...top},{id:'bottom',...bottom}];}
 function snapBar(p,w,h){const bounded=containBar(p,w,h),a=barAnchors(w,h).sort((a,b)=>Math.hypot(a.x-bounded.x,a.y-bounded.y)-Math.hypot(b.x-bounded.x,b.y-bounded.y))[0];return Math.hypot(a.x-bounded.x,a.y-bounded.y)<=diameter*2.5?{x:a.x,y:a.y,anchor:a.id}:{...bounded,anchor:null};}
 return {diameter,contain,anchors,snap,barWidth,containBar,barAnchors,snapBar};
})();
if(typeof module!=='undefined')module.exports=IslandGeometry;
