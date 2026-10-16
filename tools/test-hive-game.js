const assert=require('assert'),{graph,Game,segmentDistance}=require('../ui/hive-game-core');
const hex=(x,y,r=60)=>Array.from({length:6},(_,i)=>({x:x+r*Math.cos(i*Math.PI/3),y:y+r*Math.sin(i*Math.PI/3)}));
const one=graph([hex(100,100)]);assert.equal(one.nodes.length,6);assert.equal(one.edges.length,6);
const map=graph([hex(100,100),hex(190,100+30*Math.sqrt(3)),hex(600,100)]);
assert.equal(map.nodes.length,16);assert.equal(map.edges.length,17);assert.equal(map.components.length,2);
const game=new Game(map,()=>.7);assert.equal(game.reachable.size,11);
for(const direction of [{x:1,y:0},{x:0,y:1},{x:-1,y:0},{x:0,y:-1}])for(let i=0;i<100;i++){
 game.move(.016,direction);assert(map.edges.some(e=>segmentDistance(game.player,map.nodes[e.a],map.nodes[e.b])<.00001),'Left boundary');
}
const g=new Game(one);g.spikes.push({...g.player,warn:0});g.tick(.01);assert(!g.alive,'Collision should kill');
const h=new Game(one);h.spikes.push({...h.player,warn:0});assert(h.hammer());assert.equal(h.spikes.length,0);assert.equal(h.score,1);assert(!h.hammer());assert.equal(h.cooldown,7);
h.nextSpawn=100;for(let i=0;i<139;i++)h.tick(.05);assert(!h.hammer());h.tick(.05);h.tick(.001);assert(h.hammer());assert(h.alive);
const warning=new Game(one);warning.spikes.push({...warning.player,warn:.5});warning.tick(.05);assert(warning.alive);for(let i=0;i<10;i++)warning.tick(.05);assert(!warning.alive);
const spawning=new Game(map,()=>.6);for(let i=0;i<20;i++)spawning.spawn();assert(spawning.spikes.every(s=>spawning.reachable.has(s.edge)));assert(spawning.spikes.every(s=>segmentDistance(s,map.nodes[map.edges[s.edge].a],map.nodes[map.edges[s.edge].b])<.001));
const swept=new Game(one);const edge=one.edges[one.nodes[swept.node].edges[0]],a=one.nodes[swept.node],b=one.nodes[edge.a===swept.node?edge.b:edge.a];swept.spikes.push({x:(a.x+b.x)/2,y:(a.y+b.y)/2,warn:0});swept.move(1,{x:b.x-a.x,y:b.y-a.y});assert(!swept.alive,'Swept collision');
assert.throws(()=>new Game(graph([])));console.log('PASS: shared edges, disconnected groups, boundary-only movement, lethal collision, swept collision, warning, hammer range and 7s cooldown');
const turning=new Game(one);const horizontal=one.edges.findIndex(e=>Math.abs(one.nodes[e.a].y-one.nodes[e.b].y)<.001),he=one.edges[horizontal];turning.edge=horizontal;turning.offset=he.length/2;turning.edgeSign=1;turning.player={x:(one.nodes[he.a].x+one.nodes[he.b].x)/2,y:one.nodes[he.a].y};const prior=turning.steps;turning.move(.1,{x:0,y:-1});assert(turning.steps>prior+10,'Perpendicular input must continue toward the junction');assert(one.edges.some(e=>segmentDistance(turning.player,one.nodes[e.a],one.nodes[e.b])<.0001));console.log('PASS: perpendicular turn no longer stalls mid-edge');
