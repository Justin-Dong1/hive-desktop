'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),vm=require('vm');
const requests=[];let canvasCount=0;
class Image{constructor(){this.naturalWidth=2;this.naturalHeight=2;}set src(source){this.source=source;requests.push(this);}}
const pixels=new Uint8ClampedArray(16).fill(255);
const document={createElement:()=>{const id=++canvasCount;return {getContext:()=>({drawImage(){},getImageData:()=>({data:pixels})}),toDataURL:()=>`cropped-${id}`};}};
const ctx={module:{exports:{}},Image,document};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../ui/icon-fill.js'),'utf8'),ctx);
const icons=ctx.module.exports,make=()=>({dataset:{},style:{},isConnected:true}),tick=()=>new Promise(setImmediate);
(async()=>{
 const img=make();icons.apply(img,'retry');requests.at(-1).onerror();await tick();assert.equal(img.src,'retry');
 icons.apply(img,'retry');assert.equal(requests.length,2,'Failed images must be retryable');requests.at(-1).onload();await tick();assert(img.src.startsWith('cropped-'));
 const cached=img.src,count=requests.length;icons.apply(img,'retry');await tick();assert.equal(requests.length,count);assert.equal(img.src,cached);
 icons.apply(img,'old');const old=requests.at(-1);icons.apply(img,'new');const fresh=requests.at(-1);fresh.onload();await tick();const selected=img.src;old.onload();await tick();assert.equal(img.src,selected,'Late old image must not overwrite new image');
 icons.apply(img,'style-change');const pending=requests.at(-1);icons.apply(img,'style-change','contain');pending.onload();await tick();assert.equal(img.src,'style-change');assert.equal(img.dataset.iconStyle,'contain');
 icons.apply(img,'detached');const detached=requests.at(-1);img.isConnected=false;detached.onload();await tick();assert.equal(img.src,'detached');
 const a=make(),b=make();icons.apply(a,'shared');const shared=requests.at(-1),before=requests.length;icons.apply(b,'shared');assert.equal(requests.length,before);shared.onload();await tick();assert.equal(a.src,b.src);
 console.log('PASS icon retry after failure, successful cache reuse, stale image/style guards, detached node and shared loading');
})().catch(e=>{console.error(e);process.exitCode=1;});
