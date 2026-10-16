'use strict';
const fs=require('fs'),path=require('path');
module.exports=async({app,dialog,execFile,root})=>{
 const dir=app.getPath('userData'),file=path.join(dir,'installation-settings.json');
 fs.mkdirSync(dir,{recursive:true});
 let configured=false;
 if(!fs.existsSync(file)||process.argv.includes('--setup')){
  const welcome=await dialog.showMessageBox({type:'info',title:'欢迎使用蜂巢桌面',message:'无需 Wallpaper Engine，也能使用蜂巢桌面。',detail:'保留 Windows 任务栏与当前壁纸。进入后在悬浮面板调整图标大小和文件收纳。退出可双击桌面的退出图标；异常时从开始菜单打开“恢复 Windows 桌面”。便签和布局本机保存，升级保留。',buttons:['继续设置','暂不进入'],defaultId:0,cancelId:1});
  if(welcome.response!==0)return false;
  const startup=await dialog.showMessageBox({type:'question',title:'启动选项',message:'登录 Windows 后自动进入蜂巢桌面？',buttons:['仅手动启动','登录后启动'],defaultId:0,cancelId:0});
  const wallpaper=await dialog.showMessageBox({type:'question',title:'可选壁纸联动',message:'是否在打开蜂巢桌面时，同时启动 Wallpaper Engine？',detail:'没有 Wallpaper：选“使用当前壁纸”。已经安装：选“选择 Wallpaper 程序”，在其安装文件夹选 wallpaper64.exe（也支持 wallpaper32.exe）。不要选 Steam.exe、快捷方式、壁纸图片或文件夹。此功能不更换具体壁纸；换壁纸仍在 Wallpaper Engine 内操作。频谱独立于 Wallpaper，无需关联也能用。',buttons:['使用当前壁纸','选择 Wallpaper 程序'],defaultId:0,cancelId:0});
  let config={autoStart:false,executable:''};
  if(wallpaper.response===1){const selected=await dialog.showOpenDialog({title:'选择 wallpaper64.exe 或 wallpaper32.exe',properties:['openFile'],filters:[{name:'Wallpaper Engine',extensions:['exe']}]});
   if(!selected.canceled&&/^wallpaper(32|64)\.exe$/i.test(path.basename(selected.filePaths[0]))&&fs.existsSync(selected.filePaths[0]))config={autoStart:true,executable:selected.filePaths[0]};
   else await dialog.showMessageBox({message:'未选择有效 Wallpaper 程序，将使用当前壁纸。'});
  }
  app.setLoginItemSettings({openAtLogin:startup.response===1,path:process.execPath,args:['--startup'],name:'HiveDesktop'});
  fs.writeFileSync(path.join(dir,'wallpaper.config.json'),JSON.stringify(config,null,2));
  fs.writeFileSync(file,JSON.stringify({version:1,completedAt:new Date().toISOString()}));
  configured=true;
 }
 const result=await new Promise(resolve=>execFile('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',path.join(root,'tools','start-wallpaper.ps1'),'-ConfigRoot',dir],{windowsHide:true,timeout:12000},(err,out)=>resolve(err?'unavailable':String(out||'').trim())));
 fs.writeFileSync(path.join(dir,'wallpaper-status.json'),JSON.stringify({time:new Date().toISOString(),status:result}));
 if(configured){
  const config=JSON.parse(fs.readFileSync(path.join(dir,'wallpaper.config.json'),'utf8'));
  const running=['already-running','started'].includes(result);
  await dialog.showMessageBox({type:config.autoStart&&!running?'warning':'info',title:'设置结果',message:config.autoStart?(running?'关联已保存，已检测到 Wallpaper Engine 运行':'关联已保存，但尚未确认 Wallpaper Engine 启动'):'已选择当前壁纸，不主动启动 Wallpaper Engine',detail:(config.autoStart?'所选程序：'+config.executable+'\n':'')+(running?'检测到进程不等于壁纸动画已播放；壁纸内容和暂停规则在 Wallpaper Engine 中设置。':'蜂巢桌面仍可正常使用。若已关联，请确认所选程序能够手动打开；可退出后在开始菜单 Hive Desktop → Setup 重新选择。')+'\n\n频谱已内置，无需下载或编译组件：打开音乐软件播放歌曲，把蜂巢面板切成“悬浮长条”并收起，长条会变成对称频谱柱。圆点或展开面板不显示；播放器需要提供 Windows 媒体播放状态，声音需要输出到系统默认播放设备。',buttons:['进入蜂巢桌面']});
 }
 return true;
};
