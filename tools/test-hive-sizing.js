const assert=require('assert'),grid=require('../ui/grid'),{arena,Game}=require('../ui/hive-platform');
for(const value of [0,96,99,101,149,151,192]){const s=grid.settings({cell:value});assert(s.cell>=100&&s.cell<=150&&s.cell%2===0);assert(s.icon>=28&&s.icon<=s.cell/2&&s.icon%2===0);assert.deepEqual(grid.settings(s),s);}
let s=grid.settings({cell:100,icon:40});for(let size=102;size<=150;size+=2)s=grid.resize(s,size);assert.equal(s.icon,60,'Small steps must accumulate proportional icon growth');
for(let size=148;size>=100;size-=2)s=grid.resize(s,size);assert.equal(s.icon,40);
const customized=grid.settings({cell:120,icon:36});assert.equal(grid.resize(customized,150).icon,46);assert.equal(grid.resize(customized,100).icon,30);
const trajectories=[];
for(const size of [100,120,150]){
 const scale=size/120,r=size/2,h=r*Math.sqrt(3)/2;
 const cell={active:true,points:Array.from({length:6},(_,i)=>({x:500+r*Math.cos(i*Math.PI/3),y:400+r*Math.sin(i*Math.PI/3)}))};
 const g=new Game(arena(2000,1400,[cell]));g.nextSpawn=999;g.cells[0].life=999;
 const start={...g.player};for(let i=0;i<20;i++)g.tick(.01,{x:1,jump:true});
 trajectories.push({x:(g.player.x-start.x)/scale,y:(g.player.y-start.y)/scale});
 assert(Math.abs(g.scale-scale)<1e-9);assert(g.alive);
 g.spikes=[{x:g.player.x+87*scale,y:g.player.y,cell:0},{x:g.player.x+89*scale,y:g.player.y,cell:0}];g.clear();assert.equal(g.score,1);assert.equal(g.spikes.length,1);
}
for(const t of trajectories){assert(Math.abs(t.x-trajectories[0].x)<1e-6);assert(Math.abs(t.y-trajectories[0].y)<1e-6);}
console.log('PASS 100-150 step 2, legacy clamp, icon proportional resizing without drift, scale-invariant run/jump and hammer range');
