'use strict';
const HiveIconFill=(()=>{
 const cache=new Map();
 function bounds(data,width,height){let left=width,top=height,right=-1,bottom=-1;for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(data[(y*width+x)*4+3]>24){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}return right<left?null:{x:left,y:top,width:right-left+1,height:bottom-top+1};}
 function cropped(source){
  if(cache.has(source))return cache.get(source);
  const promise=new Promise(resolve=>{const image=new Image();image.onload=()=>{try{const canvas=document.createElement('canvas'),ratio=Math.min(1,256/Math.max(image.naturalWidth,image.naturalHeight));canvas.width=Math.max(1,Math.round(image.naturalWidth*ratio));canvas.height=Math.max(1,Math.round(image.naturalHeight*ratio));const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0,canvas.width,canvas.height);const box=bounds(ctx.getImageData(0,0,canvas.width,canvas.height).data,canvas.width,canvas.height);if(!box){resolve(source);return;}const result=document.createElement('canvas');result.width=128;result.height=128;const out=result.getContext('2d');out.imageSmoothingQuality='high';const side=Math.min(box.width,box.height);out.drawImage(canvas,box.x+(box.width-side)/2,box.y+(box.height-side)/2,side,side,0,0,128,128);resolve(result.toDataURL());}catch{resolve(source);}};image.onerror=()=>resolve(source);image.src=source;});
  cache.set(source,promise);if(cache.size>256)cache.delete(cache.keys().next().value);return promise;
 }
 function mode(item,preferences={}){const saved=preferences[item.id];if(['inner','contain','cover'].includes(saved))return saved;const name=String(item.rawName||item.name||'').replace(/\.lnk$/i,'').trim();return /^(QQ|微信|WeChat|Weixin)$/i.test(name)?'inner':'contain';}
 function apply(img,source,style='contain'){img.dataset.iconStyle=style;img.style.objectFit=style==='inner'?'cover':style;img.src=source;if(style==='cover'||style==='inner')cropped(source).then(result=>{if(img.isConnected&&img.dataset.iconStyle===style)img.src=result;});}
 return {bounds,apply,mode};
})();
if(typeof module!=='undefined')module.exports=HiveIconFill;
