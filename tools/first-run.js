'use strict';
const fs=require('fs'),path=require('path');
module.exports=async({app,dialog,execFile,root})=>{
 const dir=app.getPath('userData'),file=path.join(dir,'installation-settings.json');
 fs.mkdirSync(dir,{recursive:true});
 if(!fs.existsSync(file)||process.argv.includes('--setup')){
  const welcome=await dialog.showMessageBox({type:'info',title:'欢迎使用蜂巢桌面',message:'无需 Wallpaper Engine，也能使用蜂巢桌面。',detail:'保留 Windows 任务栏与当前壁纸。进入后在悬浮面板调整图标大小和文件收纳。退出可双击桌面的退出图标；异常时从开始菜单打开“恢复 Windows 桌面”。便签和布局本机保存，升级保留。',buttons:['继续设置','暂不进入'],defaultId:0,cancelId:1});
  if(welcome.response!==0)return false;
  const startup=await dialog.showMessageBox({type:'question',title:'启动选项',message:'登录 Windows 后自动进入蜂巢桌面？',buttons:['仅手动启动','登录后启动'],defaultId:0,cancelId:0});
  const wallpaper=await dialog.showMessageBox({type:'question',title:'可选壁纸联动',message:'是否关联已安装的 Wallpaper Engine？',detail:'没有安装请选择“使用当前壁纸”，不影响正常使用。',buttons:['使用当前壁纸','选择 Wallpaper 程序'],defaultId:0,cancelId:0});
  let config={autoStart:false,executable:''};
  if(wallpaper.response===1){const selected=await dialog.showOpenDialog({title:'选择 wallpaper64.exe 或 wallpaper32.exe',properties:['openFile'],filters:[{name:'Wallpaper Engine',extensions:['exe']}]});
   if(!selected.canceled&&/^wallpaper(32|64)\.exe$/i.test(path.basename(selected.filePaths[0])))config={autoStart:true,executable:selected.filePaths[0]};
   else await dialog.showMessageBox({message:'未选择有效 Wallpaper 程序，将使用当前壁纸。'});
  }
  app.setLoginItemSettings({openAtLogin:startup.response===1,path:process.execPath,args:['--startup'],name:'HiveDesktop'});
  fs.writeFileSync(path.join(dir,'wallpaper.config.json'),JSON.stringify(config,null,2));
  fs.writeFileSync(file,JSON.stringify({version:1,completedAt:new Date().toISOString()}));
 }
 await new Promise(resolve=>execFile('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',path.join(root,'tools','start-wallpaper.ps1'),'-ConfigRoot',dir],{windowsHide:true,timeout:5000},()=>resolve()));
 return true;
};
