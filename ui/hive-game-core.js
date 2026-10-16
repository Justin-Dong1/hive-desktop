(function(root){
 'use strict';
 const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 function graph(polygons){
  const nodes=[],edges=[],points=new Map(),links=new Map();
  const vertex=p=>{const key=`${Math.round(p.x*100)},${Math.round(p.y*100)}`;if(!points.has(key)){points.set(key,nodes.length);nodes.push({x:p.x,y:p.y,edges:[]});}return points.get(key);};
  for(const poly of polygons)for(let i=0;i<poly.length;i++){
   const a=vertex(poly[i]),b=vertex(poly[(i+1)%poly.length]);if(a===b)continue;const key=[a,b].sort((x,y)=>x-y).join(':');
   if(links.has(key))continue;const length=distance(nodes[a],nodes[b]);if(length<1)continue;const id=edges.length;edges.push({a,b,length});nodes[a].edges.push(id);nodes[b].edges.push(id);links.set(key,id);
  }
  const visited=new Set(),components=[];
  for(let i=0;i<nodes.length;i++){if(visited.has(i))continue;const queue=[i],component=[];visited.add(i);for(let n=0;n<queue.length;n++){const id=queue[n];component.push(id);for(const edgeId of nodes[id].edges){const e=edges[edgeId],next=e.a===id?e.b:e.a;if(!visited.has(next)){visited.add(next);queue.push(next);}}}components.push(component);}
  components.sort((a,b)=>b.length-a.length);return {nodes,edges,components};
 }
 function segmentDistance(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,len=dx*dx+dy*dy,t=len?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/len)):0;return distance(p,{x:a.x+dx*t,y:a.y+dy*t});}
 class Game {
  constructor(map,random=Math.random){
   if(!map.edges.length)throw new Error('没有可行走的蜂窝边界');this.map=map;this.random=random;this.time=0;this.score=0;this.alive=true;this.cooldown=0;this.swing=0;this.spikes=[];this.nextSpawn=1.5;this.steps=0;this.edgeSign=1;this.moving=false;this.effects=[];
   const component=map.components[0],center=component.reduce((p,i)=>({x:p.x+map.nodes[i].x/component.length,y:p.y+map.nodes[i].y/component.length}),{x:0,y:0});this.reachable=new Set(component.flatMap(i=>map.nodes[i].edges));this.node=component.reduce((a,b)=>distance(map.nodes[a],center)<distance(map.nodes[b],center)?a:b);this.edge=null;this.offset=0;this.facing=1;this.player={x:map.nodes[this.node].x,y:map.nodes[this.node].y};
  }
  hammer(){if(!this.alive||this.cooldown>0)return false;this.cooldown=7;this.swing=.5;this.clear();return true;}
  clear(){const old=this.spikes.length;this.spikes=this.spikes.filter(s=>{if(distance(this.player,s)>88)return true;this.effects.push({x:s.x,y:s.y,at:this.time});return false;});this.score+=old-this.spikes.length;}
  spawn(){
   if(this.spikes.length>=48)return;
   const choices=[...this.reachable];for(let attempt=0;attempt<30;attempt++){
    const id=choices[Math.floor(this.random()*choices.length)],edge=this.map.edges[id],a=this.map.nodes[edge.a],b=this.map.nodes[edge.b],t=.15+this.random()*.7,p={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,edge:id,warn:1.1};
    if(distance(p,this.player)<65||this.spikes.some(s=>distance(s,p)<25))continue;this.spikes.push(p);return;
   }
  }
  move(dt,input){
   const magnitude=Math.hypot(input.x,input.y);if(!magnitude)return;
   const direction={x:input.x/magnitude,y:input.y/magnitude};let travel=125*dt;
   while(travel>0.00001&&this.alive){
    if(this.edge===null){
     let choice=null,best=-.01;for(const id of this.map.nodes[this.node].edges){const edge=this.map.edges[id],next=edge.a===this.node?edge.b:edge.a,a=this.map.nodes[this.node],b=this.map.nodes[next],dot=((b.x-a.x)*direction.x+(b.y-a.y)*direction.y)/edge.length;if(dot>best){best=dot;choice=id;}}
     if(choice===null)break;this.edge=choice;const e=this.map.edges[choice];this.offset=e.a===this.node?0:e.length;this.edgeSign=e.a===this.node?1:-1;
    }
    const e=this.map.edges[this.edge],a=this.map.nodes[e.a],b=this.map.nodes[e.b],dot=((b.x-a.x)*direction.x+(b.y-a.y)*direction.y)/e.length;
    // A perpendicular turn is queued until the next vertex, not a stop in mid-edge.
    const sign=Math.abs(dot)<.15?this.edgeSign:(dot>0?1:-1);this.edgeSign=sign;
    const available=sign>0?e.length-this.offset:this.offset,amount=Math.min(travel,available),old={...this.player};this.offset+=sign*amount;this.player={x:a.x+(b.x-a.x)*this.offset/e.length,y:a.y+(b.y-a.y)*this.offset/e.length};travel-=amount;this.steps+=amount;if(Math.abs(this.player.x-old.x)>.001)this.facing=Math.sign(this.player.x-old.x);
    if(this.swing>0)this.clear();
    if(this.spikes.some(s=>s.warn<=0&&segmentDistance(s,old,this.player)<11)){this.alive=false;break;}
    if(available<=amount+.00001){this.node=sign>0?e.b:e.a;this.edge=null;}
   }
  }
  tick(dt,input={x:0,y:0}){
   if(!this.alive)return;dt=Math.min(.05,Math.max(0,dt));this.time+=dt;this.cooldown=Math.max(0,this.cooldown-dt);
   for(const s of this.spikes)s.warn=Math.max(0,s.warn-dt);
   if(this.swing>0)this.clear();const before=this.steps;this.move(dt,input);this.moving=this.steps>before+.001;this.effects=this.effects.filter(e=>this.time-e.at<.65);if(this.spikes.some(s=>s.warn<=0&&distance(s,this.player)<11))this.alive=false;
   this.swing=Math.max(0,this.swing-dt);this.nextSpawn-=dt;if(this.nextSpawn<=0){this.spawn();this.nextSpawn=Math.max(.8,2-this.time/90);}
  }
 }
 const api={graph,Game,segmentDistance};if(typeof module==='object'&&module.exports)module.exports=api;else root.HiveGame=api;
})(typeof globalThis!=='undefined'?globalThis:this);
