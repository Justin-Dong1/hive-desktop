const assert=require('assert'),{arena,Game,spikeHit}=require('../ui/hive-platform');
let seed=20261016;const rng=()=>((seed=(1664525*seed+1013904223)>>>0)/4294967296);
const base=arena(1600,1000);
for(const count of [0,8,40,base.cells.length]){
 const desktop=base.cells.map((c,i)=>({points:c.points,active:i<count}));
 const game=new Game(arena(1600,1000,desktop),rng),active=game.cells.filter(c=>c.active);
 assert.equal(active.length,game.targetCount);assert.deepEqual(desktop.map(c=>c.active),base.cells.map((_,i)=>i<count),'Original desktop untouched');
 const density=c=>active.filter(n=>Math.hypot(n.x-c.x,n.y-c.y)<=c.r*3.1).length;
 assert.equal(density(game.cells[game.support]),Math.max(...active.map(density)));
 if(count<=40)for(let i=0;i<count;i++)assert(game.cells[i].active);
}
const small=new Game(arena(1600,1000,base.cells.slice(0,5).map(c=>({points:c.points,active:false}))),rng);assert.equal(small.targetCount,5);assert.equal(small.cells.filter(c=>c.active).length,5);
const top={x:0,y:0,angle:Math.PI};assert(!spikeHit({x:4,y:-5},top));assert(!spikeHit({x:4,y:0},top));assert(spikeHit({x:4,y:5},top));
assert(spikeHit({x:-4,y:-5},{x:0,y:0,angle:0}));
const g=new Game(base,rng);for(let i=0;i<100;i++)g.spawn();assert.equal(new Set(g.spikes.map(s=>s.side)).size,6);
for(const s of g.spikes){const c=g.cells[s.cell];assert(Math.sin(s.angle)*(c.x-s.x)-Math.cos(s.angle)*(c.y-s.y)>0,'Spike points into owner cell');}
// Standing above a downward ceiling spike must not hurt; entering its interior must.
const c=g.cells[g.support];g.player={x:c.x,y:c.y-c.h};g.vy=0;g.nextSpawn=999;
g.spikes=[{cell:c.id,x:c.x+4,y:c.y-c.h,angle:Math.PI,warn:0,life:10}];g.tick(.01);assert(g.alive);
g.player.y+=10;g.vy=0;g.grounded=false;g.tick(.01);assert(!g.alive);
// Refill selection spans the whole map rather than selecting the first eligible IDs.
const picked=new Set();
for(let n=0;n<400;n++){
 const game=new Game(base,rng);for(const cell of game.cells){cell.active=false;cell.respawn=0;}
 game.targetCount=1;game.player={x:-1000,y:-1000};game.nextSpawn=999;game.tick(.01);
 picked.add(game.cells.find(c=>c.active).id);
}
assert(picked.size>base.cells.length*.85,'Uniform refill should reach all map regions');
console.log('PASS initial add/trim to width-adjusted cap, tiny screens, densest spawn, inward six-edge spikes, ceiling isolation, full-map randomized refill');
