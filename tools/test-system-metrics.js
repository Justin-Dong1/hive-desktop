'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),vm=require('vm');
let time=10000,idle=100,user=100,free=50,reads=0;
const read=require('./system-metrics')({cpus:()=>{reads++;return [{times:{idle,user}}];},totalmem:()=>100,freemem:()=>free},()=>time);
assert.equal(read().cpu,null);time+=1500;idle+=50;user+=50;assert.equal(read().cpu,50);
const count=reads;read();assert.equal(reads,count,'Shared cache avoids repeated CPU reads');
time-=5000;free=25;assert.equal(read().memory,75,'Clock rollback must not freeze cached memory');assert.equal(read().cpu,null);
time+=1500;idle+=90;user+=10;assert.equal(read().cpu,10);
const nodes={};for(const id of ['island-functions','hubHome','island','hubCpu','hubCpuMeter','hubMemory','hubMemoryMeter','hubMemoryDetail'])nodes[id]={hidden:false,classList:{contains:()=>true},value:0};
let update,calls=0,fail=false;
const doc={hidden:false,querySelector:()=>({append(){}}),getElementById:id=>nodes[id],createElement:()=>({setAttribute(){}}),addEventListener(){}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../ui/hub-metrics.js'),'utf8'),{document:doc,window:{glassHive:{systemMetrics:async()=>{calls++;if(fail)throw Error('Unavailable');return {cpu:50,memory:75,used:75,total:100};}}},Date:{now:()=>time},MutationObserver:class{observe(){}},setInterval:fn=>update=fn});
(async()=>{
 await new Promise(setImmediate);assert.equal(nodes.hubCpuMeter.value,50);
 time+=1500;fail=true;await update();assert.equal(nodes.hubCpu.textContent,'—');assert.equal(nodes.hubMemoryMeter.value,0);assert.equal(nodes.hubCpuMeter.value,0);
 time-=5000;fail=false;await update();assert.equal(nodes.hubCpu.textContent,'50%');
 doc.hidden=true;time+=1500;const before=calls;await update();assert.equal(calls,before,'Hidden document must not request metrics');
 console.log('PASS metrics cache, clock rollback, CPU deltas, failure clears meters, recovery and hidden-panel polling');
})().catch(e=>{console.error(e);process.exitCode=1;});
