'use strict';

// A renderer heartbeat alone does not prove its native desktop host is usable.
module.exports=function createHostMonitor({paused,windows,inspect,restore,ready,fail,log}){
 let busy=false,stopped=false,failures=0;
 return {
  isBusy(){return busy;},
  stop(){stopped=true;},
  async check(){
   if(stopped||busy||paused())return;
   busy=true;
   try{
    const targets=[...windows()];
    if(!targets.length)throw new Error('No desktop windows remain');
    for(const win of targets){
     if(stopped||paused())return;
     if(win.isDestroyed()||!win.desktopAttached)throw new Error('Desktop window is destroyed or detached');
     await inspect(win);
    }
    if(stopped||paused())return;
    if(failures){failures=0;await ready();}
   }catch(error){
    if(stopped||paused())return;
    failures++;
    log(error);
    // Show native icons while Explorer is unavailable; never wait with both desktops hidden.
    const result=await restore();
    if(!result.ok||failures>=3)fail('Desktop host recovery failed: '+error.message);
   }finally{busy=false;}
  }
 };
};
