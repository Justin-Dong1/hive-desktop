const assert=require('assert'),g=require('../ui/island-geometry');
for(const [w,h]of [[1920,1080],[1707,1067],[800,600]]){
 const anchors=g.barAnchors(w,h);assert.deepEqual(anchors.map(a=>a.id),['top','bottom']);
 for(const a of anchors)assert.equal(g.snapBar({x:a.x+5,y:a.y+5},w,h).anchor,a.id);
 for(const p of [{x:0,y:0},{x:w,y:0},{x:0,y:h},{x:w,y:h},{x:0,y:h/2},{x:w,y:h/2}]){const q=g.snapBar(p,w,h);assert.equal(q.anchor,null);assert(q.x>=0&&q.y>=0&&q.x+g.barWidth(w)<=w&&q.y+48<=h);}
 assert.equal(g.snapBar({x:w/2,y:h/2},w,h).anchor,null);assert.equal(g.anchors(w,h).length,8);
}
console.log('PASS bar top/bottom only, no corner/side snaps, containment and dot anchors unchanged');
