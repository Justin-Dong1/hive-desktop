const assert=require('assert'),{arena,Game,stageLimit}=require('../ui/hive-platform');
for(const [width,limits]of [[100,[35,30,25]],[120,[39,34,29]],[124,[40,35,30]],[125,[40,35,30]],[126,[40,35,30]],[130,[41,36,31]],[150,[45,40,35]]]){
 assert.deepEqual([1,2,3].map(stage=>stageLimit(width,stage)),limits);
 const original=arena(2200,1400),r=width/2;
 const map=arena(2200,1400,original.cells.map(c=>({active:true,points:Array.from({length:6},(_,i)=>({x:c.x+r*Math.cos(i*Math.PI/3),y:c.y+r*Math.sin(i*Math.PI/3)}))})));
 const game=new Game(map);assert.equal(game.targetCount,limits[0]);assert.equal(game.cells.filter(c=>c.active).length,limits[0]);
 for(const [score,index]of [[10,1],[30,2]]){game.score=score;game.advanceStage();assert.equal(game.targetCount,limits[index]);assert.equal(game.cells.filter(c=>c.active).length,limits[index]);}
 for(let i=0;i<500;i++){game.alive=true;game.tick(.05);assert(game.cells.filter(c=>c.active).length<=limits[2]);}
 assert.equal(new Game(game.map).targetCount,limits[0]);
}
for(let width=100;width<=150;width+=2)assert.equal(stageLimit(width,1),40+Math.trunc((width-125)/5));
assert.equal(stageLimit(119.9999999999,1),39,'Geometry roundoff must not lose a step');
console.log('PASS width-adjusted stage limits, 2px slider values, floating point geometry, culling/refill/restart');
