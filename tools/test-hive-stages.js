const assert=require('assert'),{arena,Game}=require('../ui/hive-platform');
let seed=16;const rng=()=>((seed=(1664525*seed+1013904223)>>>0)/4294967296);
const make=()=>{const map=arena(1600,1000);const ratio=62.5/map.r;return new Game(arena(1600,1000,map.cells.map(c=>({active:true,points:c.points.map(p=>({x:c.x+(p.x-c.x)*ratio,y:c.y+(p.y-c.y)*ratio}))}))),rng);},count=g=>g.cells.filter(c=>c.active).length;
function hit(g,n){g.spikes=Array.from({length:n},()=>({...g.player,cell:g.support,warn:0,life:9}));g.clear();}
let g=make();assert.equal(count(g),40);hit(g,9);assert.equal(g.stage,1);assert.equal(count(g),40);
hit(g,1);assert.equal(g.stage,2);assert.equal(g.targetCount,35);assert.equal(count(g),35);assert.equal(g.score,10);
hit(g,19);assert.equal(count(g),35);assert.equal(g.stage,2);
hit(g,1);assert.equal(g.stage,3);assert.equal(g.targetCount,30);assert.equal(count(g),30);assert.equal(g.score,30);
const ids=g.cells.filter(c=>c.active).map(c=>c.id);g.clear();assert.deepEqual(g.cells.filter(c=>c.active).map(c=>c.id),ids,'No repeated cull');
for(let i=0;i<1000;i++){g.alive=true;g.tick(.02);assert(count(g)<=30,'Refill respects new cap');}
g=make();hit(g,32);assert.equal(g.stage,3);assert.equal(count(g),30,'One swing can cross both thresholds');assert.equal(g.score,32);
g=make();for(const c of g.cells.slice(0,30))c.active=false;const before=count(g);hit(g,10);assert.equal(count(g),before,'Under-cap transition does not delete or create cells');
const restart=new Game(g.map,rng);assert.equal(restart.stage,1);assert.equal(restart.score,0);assert.equal(count(restart),40);
console.log('PASS thresholds 10/30, caps 35/30, simultaneous exact culling, crossed thresholds, no repeat, refill cap and restart');
