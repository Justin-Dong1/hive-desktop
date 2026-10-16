'use strict';
const assert=require('assert'),icons=require('../ui/icon-fill');
for(const name of ['QQ','微信','WPS','此电脑','Terraria'])assert.equal(icons.mode({id:'test',name}),'inner');
assert.equal(icons.mode({id:'test'},{test:'cover'}),'inner');
assert.equal(icons.mode({id:'test'},{test:'contain'}),'contain');
global.Image=class{set src(value){this.onerror();}};
for(const style of ['inner','contain','cover']){const img={dataset:{},style:{}};icons.apply(img,'original-image',style);assert.equal(img.src,'original-image');assert.equal(img.style.objectFit,style==='contain'?'contain':'cover');assert.equal(img.dataset.iconStyle,style==='contain'?'contain':'inner');}
const html=require('fs').readFileSync(require('path').join(__dirname,'../ui/index.html'),'utf8');
const inner=html.match(/\.icon-ring img\[data-icon-style="inner"\]\s*\{([^}]+)\}/)[1];
assert(inner.includes('background:transparent'));assert(inner.includes('padding:0;'));assert(inner.includes('width:82%'));
assert(inner.includes('clip-path:circle(50% at 50% 50%)'));assert(inner.includes('object-fit:cover'));
const pixels=new Uint8ClampedArray(8*8*4);for(let y=2;y<6;y++)for(let x=2;x<6;x++)pixels[(y*8+x)*4+3]=255;
assert.deepEqual(icons.bounds(pixels,8,8),{x:2,y:2,width:4,height:4});
assert(html.includes('.icon-ring::after'));
console.log('PASS inner circle clipping, transparent margin detection, original-shape option and no added white fill');
