'use strict';
const path=require('path');
module.exports=({BrowserWindow,ipcMain,screen,root})=>{
 const editors=new Map();
 ipcMain.handle('notes:editor',async(event,id)=>{
  const owner=BrowserWindow.fromWebContents(event.sender);if(!owner||typeof id!=='string')return {ok:false};
  let win=editors.get(owner.id);
  if(win&&!win.isDestroyed()){win.show();win.focus();return {ok:true,external:true};}
  const area=screen.getDisplayMatching(owner.getBounds()).workArea;
  const width=Math.min(560,area.width),height=Math.min(420,area.height);
  win=new BrowserWindow({width,height,x:Math.round(area.x+(area.width-width)/2),y:Math.round(area.y+(area.height-height)/2),show:false,title:'编辑便签 · 蜂巢桌面',autoHideMenuBar:true,backgroundColor:'#182020',minWidth:280,minHeight:180,webPreferences:{preload:path.join(root,'preload.js'),contextIsolation:true,nodeIntegration:false}});
  editors.set(owner.id,win);owner.once('closed',()=>{if(!win.isDestroyed())win.close();});
  win.on('closed',()=>editors.delete(owner.id));
  await win.loadFile(path.join(root,'ui','notes-editor.html'),{query:{id,screen:String(owner.id)}});win.show();win.focus();return {ok:true,external:true};
 });
};
