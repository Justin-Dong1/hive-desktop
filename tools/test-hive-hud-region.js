const assert=require('assert'),{arena,Game,excludeRegion,stageLimit}=require('../ui/hive-platform');
for(const [w,h]of [[800,600],[1920,1080],[1080,1920]]){
 const original=arena(w,h),rect={left:w/2-270,right:w/2+270,top:0,bottom:180};
 const map=excludeRegion(original,rect);assert(map.cells.length<original.cells.length);
 const intersects=c=>Math.max(...c.points.map(p=>p.x))>=rect.left&&Math.min(...c.points.map(p=>p.x))<=rect.right&&Math.max(...c.points.map(p=>p.y))>=rect.top&&Math.min(...c.points.map(p=>p.y))<=rect.bottom;
 assert(map.cells.every((c,i)=>c.id===i&&!intersects(c)));
 const game=new Game(map);assert.equal(game.targetCount,Math.min(stageLimit(map.r*2,1),map.cells.length));
 for(let i=0;i<1000;i++){game.alive=true;game.tick(.05);assert(game.cells.every(c=>!intersects(c)));}
 assert(new Game(game.map).cells.every(c=>!intersects(c)),'Restart keeps exclusion');
}
console.log('PASS HUD exclusion: complete cells, contiguous IDs, initial/refill/restart, landscape and portrait');
