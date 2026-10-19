'use strict';
const assert=require('assert'),vm=require('vm'),fs=require('fs'),path=require('path');
const source=fs.readFileSync(path.join(__dirname,'../main.js'),'utf8');
const fn=source.slice(source.indexOf('function ps(mode)'),source.indexOf('function isInside('));
const calls=[],callbacks=[];
const context={process:{pid:42,execPath:'hive.exe'},STYLE_SCRIPT:'test.ps1',execFile:(exe,args,options,done)=>{calls.push(args.at(-1));callbacks.push(done);}};
vm.createContext(context);vm.runInContext('let styleQueue=Promise.resolve(),quitting=false;'+fn,context);
(async()=>{
 const apply=vm.runInContext("ps('Apply')",context),restore=vm.runInContext("ps('Restore')",context);
 await new Promise(setImmediate);assert.deepEqual(calls,['Apply']);callbacks.shift()(null,'ok','');await apply;
 await new Promise(setImmediate);assert.deepEqual(calls,['Apply','Restore']);callbacks.shift()(null,'ok','');await restore;
 vm.runInContext('quitting=true',context);const skipped=await vm.runInContext("ps('Apply')",context);assert(!skipped.ok);assert.equal(calls.length,2);
 console.log('PASS restore waits for pending Apply; queued Apply cannot hide icons after exit starts');
})().catch(e=>{console.error(e);process.exitCode=1;});
