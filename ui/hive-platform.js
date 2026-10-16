(function(root){
 'use strict';
 const inside=(p,c)=>{let hit=false;const v=c.points;for(let i=0,j=5;i<6;j=i++){if((v[i].y>p.y)!==(v[j].y>p.y)&&p.x<(v[j].x-v[i].x)*(p.y-v[i].y)/(v[j].y-v[i].y)+v[i].x)hit=!hit;}return hit;};
 const spikeShape=[{x:-10,y:0},{x:-4,y:-13},{x:1,y:-2},{x:6,y:-16},{x:11,y:0}];
 function stageLimit(width,stage){const delta=(width-125)/5,offset=Math.trunc(delta+Math.sign(delta)*1e-7);return Math.max(1,({1:40,2:35,3:30}[stage]||40)+offset);}
 function excludeRegion(map,rect){
  const cells=map.cells.filter(c=>Math.max(...c.points.map(p=>p.x))<rect.left||Math.min(...c.points.map(p=>p.x))>rect.right||Math.max(...c.points.map(p=>p.y))<rect.top||Math.min(...c.points.map(p=>p.y))>rect.bottom).map((c,id)=>({...c,id}));
  return {...map,cells};
 }
 function spikeHit(p,s){const a=s.angle||0,dx=(p.x-s.x)/(s.scale||1),dy=(p.y-s.y)/(s.scale||1),x=dx*Math.cos(a)+dy*Math.sin(a),y=-dx*Math.sin(a)+dy*Math.cos(a);if(y>=-0.01)return false;let hit=false;for(let i=0,j=spikeShape.length-1;i<spikeShape.length;j=i++){const a=spikeShape[i],b=spikeShape[j];if((a.y>y)!==(b.y>y)&&x<(b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x)hit=!hit;}return hit;}
 function arena(width,height,desktop){
  if(desktop){const cells=desktop.map((c,id)=>{const x=c.points.reduce((s,p)=>s+p.x,0)/6,y=c.points.reduce((s,p)=>s+p.y,0)/6,r=Math.max(...c.points.map(p=>Math.abs(p.x-x))),h=Math.max(...c.points.map(p=>Math.abs(p.y-y)));return {...c,id,x,y,r,h};});return {width,height,r:cells[0]?.r,h:cells[0]?.h,cells,desktop:true};}
  const r=Math.max(64,Math.min(94,width/15)),h=r*Math.sqrt(3)/2,cells=[];
  for(let col=0,x=r+24;x+r<width-24;col++,x+=1.5*r)for(let row=0,y=90+h+(col%2)*h;y+h<height-45;row++,y+=2*h){const points=Array.from({length:6},(_,i)=>({x:x+r*Math.cos(i*Math.PI/3),y:y+r*Math.sin(i*Math.PI/3)}));cells.push({id:cells.length,x,y,r,h,points});}
  return {width,height,r,h,cells};
 }
 class Game {
  constructor(map,random=Math.random){
   if(!map.cells.length)throw new Error('屏幕空间不足');this.map=map;this.random=random;this.time=0;this.score=0;this.alive=true;this.cooldown=0;this.swing=0;this.steps=0;this.moving=false;this.effects=[];this.spikes=[];this.facing=1;this.vy=0;this.grounded=true;this.dropUntil=0;this.jumpHeld=false;this.dropHeld=false;this.occupied=null;this.dwell=0;this.nextSpawn=2;this.reason='';
   this.cells=map.cells.map(c=>({...c,active:map.desktop?c.active:random()<.35,spent:0,life:9+random()*14,warning:null,respawn:4+random()*8,born:-1}));
   this.scale=(map.r||60)/60;this.gravity=1000*this.scale;this.stage=1;this.targetCount=Math.min(stageLimit((map.r||60)*2,1),this.cells.length);
   const active=this.cells.filter(c=>c.active),pool=this.shuffle(this.cells.filter(c=>active.length>this.targetCount?c.active:!c.active));
   for(const c of pool.slice(0,Math.abs(this.targetCount-active.length)))c.active=active.length<this.targetCount;
   const candidates=this.shuffle(this.cells.filter(c=>c.active));
   const density=c=>candidates.filter(n=>Math.hypot(n.x-c.x,n.y-c.y)<=c.r*3.1).length;
   const start=candidates.reduce((a,b)=>density(b)>density(a)?b:a);
   this.coyote=.12;this.jumpBuffer=0;this.dropBuffer=0;
   start.active=true;this.player={x:start.x,y:start.y+start.h};this.support=start.id;this.occupied=start.id;
  }
  shuffle(items){const result=[...items];for(let i=result.length-1;i>0;i--){const j=Math.floor(this.random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}return result;}
  platforms(){return this.cells.filter(c=>c.active).flatMap(c=>[{cell:c.id,x1:c.x-c.r/2,x2:c.x+c.r/2,y:c.y+c.h},{cell:c.id,x1:c.x-c.r/2,x2:c.x+c.r/2,y:c.y-c.h}]);}
  hammer(){if(!this.alive||this.cooldown>0)return false;this.cooldown=7;this.swing=.5;this.clear();return true;}
  clear(){this.spikes=this.spikes.filter(s=>{if(Math.hypot(s.x-this.player.x,s.y-this.player.y)>88*this.scale)return true;this.effects.push({x:s.x,y:s.y,at:this.time});this.score++;return false;});this.advanceStage();}
  advanceStage(){
   const stage=this.score>=30?3:this.score>=10?2:1;if(stage<=this.stage)return;
   this.stage=stage;this.targetCount=Math.min(stageLimit((this.map.r||60)*2,stage),this.cells.length);
   const active=this.cells.filter(c=>c.active),excess=Math.max(0,active.length-this.targetCount);
   for(const c of this.shuffle(active).slice(0,excess))this.breakCell(c);
   if(this.support!==null&&!this.cells[this.support]?.active){this.support=null;this.grounded=false;}
   if(this.occupied!==null&&!this.cells[this.occupied]?.active){this.occupied=null;this.dwell=0;}
  }
  breakCell(c){c.active=false;c.warning=null;c.respawn=2+this.random()*5;for(const p of c.points)this.effects.push({...p,at:this.time});this.spikes=this.spikes.filter(s=>s.cell!==c.id);}
  spawn(){const edges=this.cells.filter(c=>c.active).flatMap(c=>c.points.map((a,i)=>({cell:c.id,a,b:c.points[(i+1)%6],side:i})));if(!edges.length||this.spikes.length>=36)return;for(let attempt=0;attempt<16;attempt++){const e=edges[Math.floor(this.random()*edges.length)],t=.2+this.random()*.6,x=e.a.x+(e.b.x-e.a.x)*t,y=e.a.y+(e.b.y-e.a.y)*t;if(Math.hypot(x-this.player.x,y-this.player.y)<85*this.scale||this.spikes.some(s=>Math.hypot(s.x-x,s.y-y)<25*this.scale))continue;const c=this.cells[e.cell];let angle=Math.atan2(e.b.y-e.a.y,e.b.x-e.a.x);if(Math.sin(angle)*(c.x-x)-Math.cos(angle)*(c.y-y)<0)angle+=Math.PI;this.spikes.push({cell:e.cell,side:e.side,x,y,angle,scale:this.scale,warn:1.2,life:5+this.random()*7});return;}}
  die(reason){this.alive=false;this.reason=reason;this.moving=false;}
  tick(dt,input={x:0,y:0}){
   if(!this.alive)return;dt=Math.min(.05,Math.max(0,dt));this.time+=dt;this.cooldown=Math.max(0,this.cooldown-dt);this.swing=Math.max(0,this.swing-dt);this.effects=this.effects.filter(e=>this.time-e.at<.65);
   const jump=!!input.jump||input.y<0,drop=!!input.drop||input.y>0;
   this.coyote=this.grounded?.12:Math.max(0,this.coyote-dt);this.jumpBuffer=Math.max(0,this.jumpBuffer-dt);this.dropBuffer=Math.max(0,this.dropBuffer-dt);
   if(jump&&!this.jumpHeld)this.jumpBuffer=.15;if(drop&&!this.dropHeld)this.dropBuffer=.15;
   if(this.jumpBuffer>0&&this.coyote>0){this.vy=-Math.sqrt(2*this.gravity*this.map.h*2.65);this.grounded=false;this.coyote=0;this.jumpBuffer=0;}
   if(this.dropBuffer>0&&this.grounded){this.dropUntil=this.time+.18;this.grounded=false;this.coyote=0;this.dropBuffer=0;this.vy=100*this.scale;this.player.y+=3*this.scale;}
   this.jumpHeld=jump;this.dropHeld=drop;
   const old={...this.player};this.player.x+=Math.max(-1,Math.min(1,input.x||0))*245*this.scale*dt;this.steps+=Math.abs(this.player.x-old.x);this.moving=Math.abs(this.player.x-old.x)>.01;if(this.moving)this.facing=Math.sign(this.player.x-old.x);
   this.vy+=this.gravity*dt;this.player.y+=this.vy*dt;this.grounded=false;this.support=null;
   if(this.vy>=0&&this.time>=this.dropUntil){const landing=this.platforms().filter(p=>old.y<=p.y+.1&&this.player.y>=p.y&&this.player.x>=p.x1-3*this.scale&&this.player.x<=p.x2+3*this.scale).sort((a,b)=>a.y-b.y)[0];if(landing){this.player.y=landing.y;this.vy=0;this.grounded=true;this.support=landing.cell;}}
   const current=this.cells.find(c=>c.active&&inside({x:this.player.x,y:this.player.y-16*this.scale},c))||(this.grounded?this.cells[this.support]:null);
   this.occupied=current?.id??null;if(current&&current.warning===null)current.spent=Math.min(2,current.spent+dt);this.dwell=current?.spent||0;
   for(const c of this.cells){if(!c.active){c.respawn-=dt;continue;}c.life-=dt;if(c.warning===null&&(c.life<=1.2||c.spent>=2-1e-8))c.warning=this.time;
    if(c.warning!==null&&this.time-c.warning>=1.2-1e-8)this.breakCell(c);
   }
   const vacancies=Math.max(0,this.targetCount-this.cells.filter(c=>c.active).length);
   if(vacancies){const eligible=this.cells.filter(c=>!c.active&&c.respawn<=0&&Math.hypot(c.x-this.player.x,c.y-this.player.y)>c.r*.8);for(const c of this.shuffle(eligible).slice(0,vacancies)){c.active=true;c.spent=0;c.warning=null;c.life=9+this.random()*14;c.born=this.time;}}
   for(const s of this.spikes){s.warn=Math.max(0,s.warn-dt);s.life-=dt;}this.spikes=this.spikes.filter(s=>s.life>0&&this.cells[s.cell]?.active);if(this.swing>0)this.clear();
   for(const s of this.spikes){if(s.warn>0)continue;const dx=this.player.x-old.x,dy=this.player.y-old.y;const steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)/3));for(let i=0;i<=steps;i++){const x=old.x+dx*i/steps,y=old.y+dy*i/steps;for(let body=0;body<=40*this.scale;body+=2*this.scale){if(spikeHit({x,y:y-body},s)){this.die('碰到了尖刺');break;}}if(!this.alive)break;}}
   if(this.player.y>this.map.height+40||this.player.x<0||this.player.x>this.map.width)this.die('掉出了蜂巢');
   this.nextSpawn-=dt;if(this.nextSpawn<=0){this.spawn();this.spawn();this.nextSpawn=.8+this.random()*.7;}
  }
 }
 const api={arena,Game,inside,spikeHit,spikeShape,excludeRegion,stageLimit};if(typeof module==='object'&&module.exports)module.exports=api;else root.HivePlatform=api;
})(typeof globalThis!=='undefined'?globalThis:this);
