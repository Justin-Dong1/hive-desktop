'use strict';

const { app, BrowserWindow, ipcMain, nativeImage, screen, shell, globalShortcut, dialog } = require('electron');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { execFile } = require('child_process');

const APP_NAME = '蜂巢桌面 · HIVE DESKTOP';
const ROOT = __dirname;
// Keep the existing profile when the executable/product name changes.
if(app.isPackaged)app.setPath('userData',path.join(app.getPath('appData'),'glass-hive-desktop'));
const packageSmoke=app.isPackaged&&process.argv.includes('--package-smoke');
if(packageSmoke)app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'hive-package-smoke-')));
const DATA_ROOT=app.isPackaged?path.join(app.getPath('userData'),'diagnostics'):ROOT;
fs.mkdirSync(DATA_ROOT,{recursive:true});
require('./tools/spectrum-service')({app,ipcMain,root:ROOT});
const layoutStore=require('./tools/layout-store')(path.join(app.getPath('userData'),'desktop-layout.json'));
const displayLayout=require('./tools/display-layout');
let layoutIdentities=new Map();
const layoutBackups=require('./tools/layout-backups')(path.join(app.getPath('userData'),'layout-backups'),layoutStore);
let layoutEpoch=0,layoutBackupTimer;
if(Object.keys(layoutStore.read()).length){try{layoutBackups.save('startup');}catch(e){console.error('Startup backup failed:',e.message);}}
const auditLayout=require('./tools/layout-audit')(path.join(DATA_ROOT,'layout-startup-audit.json'),layoutStore);
ipcMain.on('layout:sync',(event,values,seed,epoch)=>{try{
 if(!seed&&epoch!==layoutEpoch)throw Error('布局已恢复，请等待界面重新载入');
 const before=JSON.stringify(layoutStore.read());
 if(!seed||!Object.keys(layoutStore.read()).length)layoutStore.write(values,seed===true);
 const current=displayLayout.migrate(layoutStore,layoutIdentities);
 if(before!==JSON.stringify(current)){clearTimeout(layoutBackupTimer);layoutBackupTimer=setTimeout(()=>{try{layoutBackups.save('auto');}catch(e){console.error(e);}},3000);}
 event.returnValue={ok:true,epoch:layoutEpoch,values:current};
 }catch(e){event.returnValue={ok:false,message:e.message};}});
ipcMain.handle('layout:backups',async(event,action,id)=>{try{
 const parent=BrowserWindow.fromWebContents(event.sender);
 if(action==='list')return {ok:true,backups:layoutBackups.list()};
 if(action==='save'){layoutBackups.save('manual');return {ok:true};}
 if(action==='export'){const r=await dialog.showSaveDialog(parent,{title:'导出蜂窝布局',defaultPath:'蜂窝布局.json',filters:[{name:'布局备份',extensions:['json']}]});if(r.canceled)return {ok:false,canceled:true};fs.writeFileSync(r.filePath,JSON.stringify(layoutBackups.document('export'),null,2));return {ok:true};}
 let doc;
 if(action==='import'){const r=await dialog.showOpenDialog(parent,{title:'导入蜂窝布局',properties:['openFile'],filters:[{name:'布局备份',extensions:['json']}]});if(r.canceled)return {ok:false,canceled:true};doc=layoutBackups.read(r.filePaths[0]);}
 else if(action==='restore')doc=layoutBackups.selected(id);else throw Error('未知操作');
 const confirm=await dialog.showMessageBox(parent,{type:'question',title:'恢复布局',message:'替换所有屏幕的布局？当前布局会先自动备份。',detail:'仅恢复图标位置、蜂窝设置、中枢位置和收纳归属；不修改真实文件或便签。建议恢复本机导出的备份。',buttons:['取消','恢复'],defaultId:0,cancelId:0});
 if(confirm.response!==1)return {ok:false,canceled:true};
 clearTimeout(layoutBackupTimer);layoutBackups.restore(doc);layoutEpoch++;
 for(const w of desktopWindows.values())if(!w.isDestroyed())w.webContents.reload();
 return {ok:true};
 }catch(e){return {ok:false,message:e.message};}});
require('./tools/island-services')({app,ipcMain,BrowserWindow,root:ROOT});
const islandPolicy=require('./tools/island-policy');
const islandStatePath=path.join(app.getPath('userData'),'island-visibility.json');
let islandHidden={};
try{islandHidden=JSON.parse(fs.readFileSync(islandStatePath,'utf8'));}catch(_){}
function islandState(){
 const displays=screen.getAllDisplays(),ids=displays.map(d=>String(d.id));
 islandHidden=islandPolicy.normalize(islandHidden,ids,String(screen.getPrimaryDisplay().id));
 return displays.map(d=>({id:String(d.id),name:d.label||`显示器 ${d.id}`,visible:islandHidden[d.id]!==true}));
}
function broadcastIslands(){const state=islandState();fs.mkdirSync(path.dirname(islandStatePath),{recursive:true});fs.writeFileSync(islandStatePath,JSON.stringify(islandHidden));for(const w of desktopWindows.values())if(!w.isDestroyed())w.webContents.send('island:state',state);return state;}
const STYLE_SCRIPT = path.join(ROOT, 'tools', 'system-style.ps1');
const SCAN_SCRIPT = path.join(ROOT, 'tools', 'scan-desktop.ps1');
const desktopRoots = [app.getPath('desktop'), path.join(process.env.PUBLIC || 'C:\\Users\\Public', 'Desktop')];
const itemMap = new Map();
const customIconDir=path.join(app.getPath('userData'),'custom-icons');
const systemTargets=new Set();
function withCustomIcons(items){return items.map(item=>{const file=path.join(customIconDir,item.id+'.png');if(fs.existsSync(file)){item.icon='data:image/png;base64,'+fs.readFileSync(file).toString('base64');item.customIcon=true;}return item;});}
const desktopWindows = new Map();
let rebuilding = false;
let topologyTimer;
let systemStyled = false;
let styleApplication,styleQueue=Promise.resolve();
let quitting = false;
const desktopWatchers = [];
let changeTimer;
let desktopPoll;
const rendererHealth=new Map();
let healthTimer,guardReady=false;
function failure(reason){
 try{fs.appendFileSync(path.join(DATA_ROOT,'desktop-failures.log'),`${new Date().toISOString()} ${reason}\n`);}catch(_){}
 restoreAndQuit();
}
async function applyWhenReady(){
 if(quitting||rebuilding||!guardReady||!desktopWindows.size)return;
 if(![...desktopWindows.values()].every(w=>rendererHealth.get(w.webContents.id)?.ready&&w.desktopAttached))return;
 if(!styleApplication)styleApplication=ps('Apply');
 const result=await styleApplication;systemStyled=result.ok;
 if(quitting||rebuilding)return;
 if(!result.ok){failure('System style failed: '+result.message);return;}
 fs.writeFileSync(path.join(DATA_ROOT,'desktop-ready.json'),JSON.stringify({pid:process.pid,time:new Date().toISOString(),screens:desktopWindows.size,ready:true}));
  const rendererLayouts=await Promise.all([...desktopWindows.values()].map(w=>w.webContents.executeJavaScript('({display:displayId,key:layoutKey("hive-grid-placements"),placements:preferredPlacements})').catch(e=>({error:e.message}))));
  auditLayout('ready',screen.getAllDisplays().map(d=>({id:d.id,label:d.label,bounds:d.bounds,scaleFactor:d.scaleFactor})),rendererLayouts);
}
function desktopSignature() {
  return desktopRoots.map(root => {
    try { return fs.readdirSync(root).sort().map(name => {
      try { const s=fs.statSync(path.join(root,name)); return [name,s.size,s.mtimeMs]; }
      catch (_) { return [name]; }
    }); } catch (_) { return []; }
  });
}
function watchDesktop() {
  let signature=JSON.stringify(desktopSignature());
  const changed=() => {
    clearTimeout(changeTimer);
    changeTimer=setTimeout(() => {
      signature=JSON.stringify(desktopSignature());
      for (const window of desktopWindows.values()) if (!window.isDestroyed()) window.webContents.send('desktop:changed');
    },600);
  };
  for(const root of desktopRoots) {
    try { const watcher=fs.watch(root,changed); watcher.on('error',()=>{}); desktopWatchers.push(watcher); } catch (_) {}
  }
  desktopPoll=setInterval(() => {
    if(JSON.stringify(desktopSignature())!==signature) changed();
  },10000);
}

app.setPath('userData',app.getPath('userData'));
app.setName(APP_NAME);
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
app.commandLine.appendSwitch('disable-renderer-backgrounding');

function ps(mode) {
  const execute=()=>new Promise((resolve) => {
    if(mode==='Apply'&&quitting){resolve({ok:false,message:'Exit in progress'});return;}
    execFile('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', STYLE_SCRIPT, '-Mode', mode],
      { windowsHide: true, timeout: 10000 }, (error, stdout, stderr) => resolve({
        ok: !error,
        message: String(stdout || stderr || error?.message || '').trim()
      }));
  });
  const result=styleQueue.then(execute,execute);styleQueue=result.catch(()=>{});return result;
}

function isInside(child, parent) {
  const rel = path.relative(path.resolve(parent), path.resolve(child));
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

function initials(name) {
  const clean = name.replace(/\.[^.]+$/, '').trim();
  return (clean.match(/[\p{L}\p{N}]/gu) || ['?']).slice(0, 2).join('').toUpperCase();
}

async function thumbnail(filePath, isDirectory) {
  try {
    const image = await nativeImage.createThumbnailFromPath(filePath, { width: 160, height: 160 });
    if (!image.isEmpty()) return image.toDataURL();
  } catch (_) {}
  return null;
}

function isHiveLauncher(file){
 if(path.extname(file).toLowerCase()!=='.lnk')return false;
 try{
  const link=shell.readShortcutLink(file),launcher=path.join(ROOT,'启动玻璃蜂窝桌面.vbs').toLowerCase();
  if(app.isPackaged&&path.resolve(link.target).toLowerCase()===process.execPath.toLowerCase())return true;
  if(path.resolve(link.target).toLowerCase()===launcher)return true;
  return /^wscript\.exe$|^cscript\.exe$/i.test(path.basename(link.target))&&String(link.args||'').trim().replace(/^"|"$/g,'').toLowerCase()===launcher;
 }catch{return false;}
}
async function scanDesktopNative() {
  itemMap.clear();
  const found = [];
  const seen = new Set();
  for (const root of desktopRoots) {
    if (!fs.existsSync(root)) continue;
    let entries = [];
    try { entries = fs.readdirSync(root, { withFileTypes: true }); } catch (_) { continue; }
    for (const entry of entries) {
      if (entry.name.startsWith('.') || /desktop\.ini/i.test(entry.name)) continue;
      const fullPath = path.join(root, entry.name);
      if(isHiveLauncher(fullPath))continue;
      const key = entry.name.toLocaleLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      const id = crypto.createHash('sha1').update(fullPath).digest('hex').slice(0, 16);
      let stat;
      try { stat = fs.statSync(fullPath); } catch (_) { continue; }
      const item = {
        id,
        name: entry.name.replace(/\.lnk$/i, ''),
        initials: initials(entry.name),
        directory: stat.isDirectory(),
        rawName: entry.name,
        modified: stat.mtimeMs,
        icon: null
      };
      itemMap.set(id, fullPath);
      found.push({ item, fullPath });
    }
  }
  found.sort((a, b) => Number(b.item.directory) - Number(a.item.directory) || a.item.name.localeCompare(b.item.name, 'zh-CN'));
  await Promise.all(found.map(async ({ item, fullPath }) => { item.icon = await thumbnail(fullPath, item.directory); }));
  return found.map(({ item }) => item);
}

function scanDesktopShell() {
  return new Promise((resolve, reject) => {
    execFile('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', SCAN_SCRIPT],
      { windowsHide: true, timeout: 60000, maxBuffer: 24 * 1024 * 1024, encoding: 'utf8' }, (error, stdout) => {
        if (error) return reject(error);
        try {
          const payload = JSON.parse(String(stdout).replace(/^\uFEFF/, ''));
          const result = [];
          const seen = new Set();
          itemMap.clear();
          for (const raw of payload.items || []) {
            const fullPath = String(raw.path || '');
            if(isHiveLauncher(fullPath))continue;
            const key = String(raw.raw || raw.name || '').toLocaleLowerCase();
            if (!fullPath || seen.has(key)) continue;
            seen.add(key);
            const id = crypto.createHash('sha1').update(fullPath).digest('hex').slice(0, 16);
            let icon = null;
            if (raw.icon) {
              const iconPath = path.join(process.env.LOCALAPPDATA || '', 'GlassHiveDesktop', 'icons', raw.icon);
              try { icon = 'data:image/png;base64,' + fs.readFileSync(iconPath).toString('base64'); } catch (_) {}
            }
            itemMap.set(id, fullPath);
            if(raw.kind==='system'&&/^::\{[0-9a-f-]+\}$/i.test(fullPath))systemTargets.add(fullPath);
            result.push({ id, name: String(raw.name || raw.raw), rawName: String(raw.raw || raw.name), sourcePath:fullPath,system:raw.kind==='system',initials: initials(String(raw.name || '?')), directory: Boolean(raw.isDir), icon });
          }
          result.sort((a, b) => Number(b.directory) - Number(a.directory) || a.name.localeCompare(b.name, 'zh-CN'));
          resolve(result);
        } catch (parseError) { reject(parseError); }
      });
  });
}

async function scanDesktop() {
  try { return withCustomIcons(await scanDesktopShell()); }
  catch (_) { return withCustomIcons(await scanDesktopNative()); }
}

function wallpaperEngineStatus() {
  return new Promise((resolve) => {
    execFile('tasklist.exe', ['/FI', 'IMAGENAME eq wallpaper*.exe', '/FO', 'CSV', '/NH'],
      { windowsHide: true, timeout: 3000 }, (error, stdout) => {
        resolve(!error && /wallpaper(?:32|64)\.exe/i.test(stdout || ''));
      });
  });
}

function createWindow(display = screen.getPrimaryDisplay()) {
  const bounds = display.workArea;
  const win = new BrowserWindow({
    ...bounds,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    roundedCorners: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    title: APP_NAME,
    webPreferences: {
      preload: path.join(ROOT, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false
    }
  });
  win.setMenuBarVisibility(false);
  desktopWindows.set(display.id, win);
  const contentId=win.webContents.id;
  rendererHealth.set(contentId,{ready:false,last:Date.now(),created:Date.now()});
  win.webContents.on('did-start-loading',()=>{
   rendererHealth.set(contentId,{ready:false,last:Date.now(),created:Date.now()});
   styleApplication=null;
   if(systemStyled&&!quitting)ps('Restore').then(r=>{systemStyled=false;if(!r.ok)failure('Reload recovery failed: '+r.message);});
  });
  win.webContents.on('render-process-gone',(_e,details)=>{if(!quitting&&!rebuilding)failure('Renderer gone: '+details.reason);});
  win.webContents.on('did-fail-load',(_e,code,description)=>{if(code!==-3)failure('Load failed: '+description);});
  win.on('unresponsive',()=>failure('Window unresponsive'));
  win.loadFile(path.join(ROOT, 'ui', 'index.html'), {query:{display:String(display.id),layout:layoutIdentities.get(String(display.id)),primary:String(display.id===screen.getPrimaryDisplay().id)}});
  win.once('ready-to-show', async () => {
    win.showInactive();
    const handle = win.getNativeWindowHandle().readBigUInt64LE().toString();
    const physical=screen.dipToScreenRect(null,bounds);
    const attached = await new Promise(resolve => {
      execFile('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(ROOT,'tools','attach-desktop.ps1'), '-WindowHandle', handle,'-X',String(physical.x),'-Y',String(physical.y),'-Width',String(physical.width),'-Height',String(physical.height)],
        { windowsHide:true, timeout:10000 }, (error, stdout, stderr) => resolve({ok:!error, parent:stdout?.trim(), error:stderr}));
    });
    fs.writeFileSync(path.join(DATA_ROOT,'desktop-host-status.json'), JSON.stringify(attached));
    if (win.isDestroyed()) return;
    if (!attached.ok) { failure('Desktop attachment failed: '+JSON.stringify(attached)); return; }
    win.desktopAttached=true;
    await applyWhenReady();
    const result={ok:true};
    if (win.isDestroyed()) return;
    win.webContents.send('system-style', result);
    if(process.argv.includes('--verify-layout-persistence')&&display.id===screen.getPrimaryDisplay().id)setTimeout(()=>{require('./tools/verify-layout')(win,ROOT).catch(e=>fs.writeFileSync(path.join(ROOT,'layout-persistence-error.txt'),String(e.stack)));},8000);
    if(process.argv.includes('--verify-layout-backups')&&display.id===screen.getPrimaryDisplay().id)setTimeout(()=>{require('./tools/verify-layout-backups')(win,ROOT).catch(e=>fs.writeFileSync(path.join(ROOT,'layout-backups-error.txt'),String(e.stack)));},8000);
    const restartPhase=process.argv.includes('--verify-layout-restart-write')?'write':process.argv.includes('--verify-layout-restart-read')?'read':null;
    if(restartPhase&&display.id===screen.getPrimaryDisplay().id)setTimeout(()=>{require('./tools/verify-layout-restart')(win,ROOT,restartPhase).catch(e=>fs.writeFileSync(path.join(ROOT,'layout-restart-error.txt'),String(e.stack)));},8000);
    if(process.argv.includes('--verify-hive-hub')&&display.id===screen.getPrimaryDisplay().id)setTimeout(()=>{
      require('./tools/verify-hive-hub')(win,ROOT).catch(e=>fs.writeFileSync(path.join(ROOT,'hive-hub-error.txt'),String(e.stack)));
    },8000);
    if(process.argv.includes('--verify-notes')&&display.id===screen.getPrimaryDisplay().id)setTimeout(()=>{require('./tools/verify-notes')(win,ROOT,desktopWindows).catch(e=>fs.writeFileSync(path.join(ROOT,'notes-input-error.txt'),String(e.stack)));},8000);
    if(process.argv.includes('--verify-spectrum')&&display.id===screen.getPrimaryDisplay().id)setTimeout(()=>{require('./tools/verify-spectrum')(win,ROOT).catch(e=>fs.writeFileSync(path.join(ROOT,'spectrum-ui-error.txt'),String(e.stack)));},8000);
    if(process.argv.includes('--verify-bar-drag')&&display.id===screen.getPrimaryDisplay().id)setTimeout(()=>{require('./tools/verify-bar-drag')(win,ROOT).catch(e=>fs.writeFileSync(path.join(ROOT,'bar-drag-error.txt'),String(e.stack)));},8000);
    if(process.argv.includes('--verify-notes-window')&&display.id===screen.getPrimaryDisplay().id)setTimeout(()=>{require('./tools/verify-notes-window')(win,ROOT,BrowserWindow).catch(e=>fs.writeFileSync(path.join(ROOT,'notes-window-error.txt'),String(e.stack)));},8000);
    if(process.argv.includes('--verify-hub-experience')&&display.id===screen.getPrimaryDisplay().id)setTimeout(()=>{require('./tools/verify-hub-experience')(win,ROOT).catch(e=>fs.writeFileSync(path.join(ROOT,'hub-experience-error.txt'),String(e.stack)));},8000);
    if(process.argv.includes('--verify-hub-toggle')&&display.id===screen.getPrimaryDisplay().id)setTimeout(()=>{require('./tools/verify-hub-toggle')(win,ROOT,desktopWindows).catch(e=>fs.writeFileSync(path.join(ROOT,'hub-toggle-error.txt'),String(e.stack)));},8000);
    if(process.argv.includes('--verify-island-pages'))win.webContents.on('console-message',(_event,details)=>{if(details.level==='error')fs.appendFileSync(path.join(ROOT,'island-pages-console.txt'),details.message+'\n');});
    if(process.argv.includes('--verify-island-pages')&&display.id===screen.getPrimaryDisplay().id)setTimeout(()=>{
      require('./tools/verify-island-pages')(win,ROOT,desktopWindows).catch(e=>fs.writeFileSync(path.join(ROOT,'island-pages-error.txt'),String(e.stack)));
    },8000);
    if(process.argv.includes('--verify-shell-new')&&display.id===screen.getPrimaryDisplay().id)setTimeout(()=>{
      require('./tools/verify-shell-new')(win,ROOT).catch(e=>fs.writeFileSync(path.join(ROOT,'shell-new-error.txt'),String(e.stack)));
    },8000);
    if(process.argv.includes('--verify-create')&&display.id===screen.getPrimaryDisplay().id)setTimeout(()=>{
      require('./tools/verify-create')(win,ROOT).catch(e=>fs.writeFileSync(path.join(ROOT,'create-error.txt'),String(e.stack)));
    },8000);
    if(process.argv.includes('--verify-system-open')&&display.id===screen.getPrimaryDisplay().id)setTimeout(()=>{
      require('./tools/verify-system-open')(win,ROOT).catch(e=>fs.writeFileSync(path.join(ROOT,'system-open-error.txt'),String(e.stack)));
    },8000);
    if(process.argv.includes('--verify-collection-owner')&&display.id===screen.getPrimaryDisplay().id)setTimeout(()=>{
      require('./tools/verify-collection-owner')(win,ROOT,desktopWindows).catch(error=>fs.writeFileSync(path.join(ROOT,'collection-owner-error.txt'),String(error.stack)));
    },8000);
    if(process.argv.includes('--verify-portal')&&display.id===screen.getPrimaryDisplay().id)setTimeout(()=>{
      require('./tools/verify-portal')(win,ROOT,desktopWindows).catch(error=>fs.writeFileSync(path.join(ROOT,'portal-error.txt'),String(error.stack)));
    },8000);
    if(process.argv.includes('--verify-workspace')&&display.id===screen.getPrimaryDisplay().id) setTimeout(()=>{
      require('./tools/verify-workspace')(win,ROOT,desktopWindows).catch(error=>fs.writeFileSync(path.join(ROOT,'workspace-error.txt'),String(error.stack)));
    },7000);
    if(process.argv.includes('--verify-island')) setTimeout(()=>{
      require('./tools/verify-island')(win,ROOT).catch(error=>fs.writeFileSync(path.join(ROOT,'island-error.txt'),String(error.stack)));
    },7000);
    if(process.argv.includes('--verify-grid')) setTimeout(()=>{
      require('./tools/verify-grid')(win,ROOT).catch(error=>fs.writeFileSync(path.join(ROOT,'grid-error.txt'),String(error.stack)));
    },7000);
    if(process.argv.includes('--verify-customization')) setTimeout(()=>{
      require('./tools/verify-customization')(win,ROOT).catch(error=>fs.writeFileSync(path.join(ROOT,'customization-error.txt'),String(error.stack)));
    },7000);
    if(process.argv.includes('--verify-dynamic')) {
      const verification=setInterval(async()=>{
        if(!win || win.isDestroyed()) return clearInterval(verification);
        const snapshot=await win.webContents.executeJavaScript(`({count:items.length,capacity:coords.length,slots:slots.slice(),names:items.map(i=>i.name)})`);
        fs.writeFileSync(path.join(ROOT,'dynamic-verification.json'),JSON.stringify(snapshot));
      },1000);
    }
    if (process.argv.includes('--verify-layout')) setTimeout(async () => {
      const result = await win.webContents.executeJavaScript(`(() => {
        const polygons=[...document.querySelectorAll('polygon.occupied')];
        const rings=[...document.querySelectorAll('.icon-ring')];
        const errors=rings.map((ring,i)=>{
          const a=ring.getBoundingClientRect(), b=polygons[i].getBoundingClientRect();
          return Math.hypot(a.x+a.width/2-b.x-b.width/2,a.y+a.height/2-b.y-b.height/2);
        });
        const stage=document.getElementById('stage'), hive=document.getElementById('hive');
        const before=hive.style.transform;
        stage.dispatchEvent(new PointerEvent('pointerdown',{clientX:200,clientY:200,bubbles:true}));
        stage.dispatchEvent(new PointerEvent('pointermove',{clientX:400,clientY:400,bubbles:true}));
        stage.dispatchEvent(new PointerEvent('pointerup',{clientX:400,clientY:400,bubbles:true}));
        stage.dispatchEvent(new WheelEvent('wheel',{deltaY:300,bubbles:true}));
        return {count:rings.length,maxCenterError:Math.max(...errors),fixed:before===hive.style.transform};
      })()`);
      fs.writeFileSync(path.join(ROOT,'layout-verification.json'),JSON.stringify(result));
      const picture=await win.webContents.capturePage();
      fs.writeFileSync(path.join(ROOT,'qa-fixed-layer.png'),picture.toPNG());
    },6000);
  });
  win.on('closed', () => { rendererHealth.delete(contentId);if(desktopWindows.get(display.id)===win)desktopWindows.delete(display.id); });
}

let scanPending;
ipcMain.on('desktop:health',(event,ready)=>{
 const h=rendererHealth.get(event.sender.id);if(!h)return;h.last=Date.now();h.ready=h.ready||ready===true;applyWhenReady().catch(e=>failure(e.stack));
});
let menuActive=false;
ipcMain.handle('desktop:settings',(_event,kind)=>{const urls={display:'ms-settings:display',personalization:'ms-settings:personalization'};if(urls[kind])return shell.openExternal(urls[kind]);});
ipcMain.handle('desktop:menu',async()=>{
 if(menuActive)return {ok:false,message:'菜单已经打开'};
 menuActive=true;
 const point=screen.dipToScreenPoint(screen.getCursorScreenPoint());
 const windows=[...desktopWindows.values()];
 try{
  for(const w of windows)if(!w.isDestroyed()){w.setIgnoreMouseEvents(true);w.hide();}
  const result=await new Promise(resolve=>execFile('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',path.join(ROOT,'tools','desktop-menu.ps1'),'-X',String(point.x),'-Y',String(point.y)],{windowsHide:true,timeout:125000},(error)=>resolve({ok:!error,message:error?.message})));
  if(!result.ok)await new Promise(resolve=>execFile('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',path.join(ROOT,'tools','desktop-menu.ps1'),'-Cancel'],{windowsHide:true,timeout:5000},resolve));
  return result;
 }finally{for(const w of windows)if(!w.isDestroyed()){w.setIgnoreMouseEvents(false);w.showInactive();}menuActive=false;}
});
ipcMain.handle('desktop:list', () => {
  if(!scanPending)scanPending=scanDesktop().finally(()=>{scanPending=null;});
  return scanPending;
});
ipcMain.handle('desktop:displays', () => screen.getAllDisplays().map(d=>({id:String(d.id),layoutId:layoutIdentities.get(String(d.id)),name:d.label||`显示器 ${d.id}`,primary:d.id===screen.getPrimaryDisplay().id})));
ipcMain.handle('island:state',()=>islandState());
ipcMain.handle('island:visible',(_event,id,visible)=>{
 const result=islandPolicy.setVisible(islandHidden,screen.getAllDisplays().map(d=>String(d.id)),String(screen.getPrimaryDisplay().id),String(id),visible===true);
 islandHidden=result.hidden;return {ok:result.ok,message:result.message,state:broadcastIslands()};
});
ipcMain.on('workspace:changed',event=>{for(const window of desktopWindows.values())if(!window.isDestroyed()&&window.webContents!==event.sender)window.webContents.send('desktop:changed');});
ipcMain.handle('desktop:open', async (_event, id) => {
  const target = itemMap.get(String(id));
  if (!target || (!systemTargets.has(target)&&!desktopRoots.some(root => isInside(target, root)))) return { ok: false, message: '项目已失效，请刷新桌面。' };
  const result=await new Promise(resolve=>execFile('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',path.join(ROOT,'tools','open-desktop-item.ps1'),'-ItemPath',target],{windowsHide:true,timeout:15000,encoding:'utf8'},(error,out)=>{try{resolve(JSON.parse(out));}catch(_){resolve({ok:false,message:error?.message||'系统未返回启动结果'});}}));
  fs.appendFileSync(path.join(DATA_ROOT,'item-open.log'),JSON.stringify({time:new Date().toISOString(),id,result})+'\n');return result;
});
ipcMain.handle('desktop:reveal', async (_event, id) => {
  const target = itemMap.get(String(id));
  if (!target) return false;
  if(systemTargets.has(target)){execFile('explorer.exe',[target],{windowsHide:true});return true;}
  shell.showItemInFolder(target);
  return true;
});
const readSystemMetrics=require('./tools/system-metrics')();
ipcMain.handle('system:metrics',()=>readSystemMetrics());
ipcMain.handle('system:status', async () => {
  const total = os.totalmem();
  const used = total - os.freemem();
  return {
    wallpaperEngine: await wallpaperEngineStatus(),
    memory: Math.round(used / total * 100),
    host: os.hostname(),
    platform: 'Windows 11'
  };
});
ipcMain.handle('app:quit', () => app.quit());
async function gameWindowMode(event,release=false){
 const win=BrowserWindow.fromWebContents(event.sender);if(!win||win.isDestroyed())return {ok:false};
 if(release)return {ok:true};
 const handle=win.getNativeWindowHandle().readBigUInt64LE().toString();
 let result=await notesFocus.request(handle,'desktop');
 if(!win.isDestroyed()){
  win.webContents.focus();
  if(!result.ok){await new Promise(resolve=>setTimeout(resolve,40));result=await notesFocus.request(handle,'desktop');}
 }
 win.lastGameFocusResult=result;return result;
}
ipcMain.handle('game:focus',event=>gameWindowMode(event));
const notesFocus=require('./tools/notes-focus')(path.join(ROOT,'tools','focus-game.ps1'));
app.whenReady().then(()=>{if(!packageSmoke)notesFocus.start();});app.on('will-quit',()=>notesFocus.stop());process.once('exit',()=>notesFocus.stop());
ipcMain.handle('notes:focus',async event=>{const win=BrowserWindow.fromWebContents(event.sender);if(!win||win.isDestroyed())return {ok:false};const started=Date.now();let result=await notesFocus.request(win.getNativeWindowHandle().readBigUInt64LE().toString(),'desktop');if(!win.isDestroyed()){win.webContents.focus();if(!result.ok){await new Promise(resolve=>setTimeout(resolve,40));result=await notesFocus.request(win.getNativeWindowHandle().readBigUInt64LE().toString(),'desktop');}}win.lastNotesFocusMs=Date.now()-started;win.lastNotesFocusResult=result;return result;});
ipcMain.handle('notes:release',()=>({ok:true}));
ipcMain.handle('game:release',event=>gameWindowMode(event,true));
function shellNew(args=[]){return new Promise((resolve,reject)=>execFile('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',path.join(ROOT,'tools','shell-new.ps1'),...args],{windowsHide:true,timeout:20000,encoding:'utf8'},(error,out)=>{try{const result=JSON.parse(out);if(result.ok===false)reject(new Error(result.message));else if(error)reject(error);else resolve(result);}catch(e){reject(e);}}));}
ipcMain.handle('desktop:new-types',async()=>{try{return {ok:true,types:await shellNew()};}catch(e){return {ok:false,message:e.message};}});
ipcMain.handle('desktop:new-type',async(event,extension)=>{
 try{
  const types=await shellNew(),type=types.find(t=>t.extension===extension);if(!type)throw new Error('新建类型已失效，请重新打开菜单');
  const desktop=app.getPath('desktop');let target='';
  if(type.requiresPath){
   const choice=await dialog.showSaveDialog(BrowserWindow.fromWebContents(event.sender),{title:'新建 '+type.name,defaultPath:path.join(desktop,'新建 '+type.name+extension),filters:[{name:type.name,extensions:[extension.slice(1)]}]});
   if(choice.canceled)return {canceled:true};target=choice.filePath;
   if(path.dirname(target).toLowerCase()!==desktop.toLowerCase())throw new Error('请保存在桌面目录中');
   if(path.extname(target).toLowerCase()!==extension.toLowerCase())throw new Error('请保留文件类型后缀 '+extension);
   if(fs.existsSync(target))throw new Error('同名文件已存在，请换一个名称；不会覆盖原文件');
  }
  const result=await shellNew(['-Mode','Create','-Extension',extension,...(target?['-Destination',target]:[])]);
  for(const w of desktopWindows.values())if(!w.isDestroyed())w.webContents.send('desktop:changed');return result;
 }catch(e){return {ok:false,message:e.message};}
});
ipcMain.handle('desktop:delete',async(event,id)=>{
 const target=itemMap.get(String(id));
 if(!target||systemTargets.has(target)||!desktopRoots.some(root=>path.dirname(target).toLowerCase()===path.resolve(root).toLowerCase()))return {ok:false,message:'此项目不是可删除的桌面文件'};
 try{
  if(!fs.existsSync(target))throw new Error('文件已经不存在，请刷新');
  const choice=await dialog.showMessageBox(BrowserWindow.fromWebContents(event.sender),{type:'warning',title:'删除真实桌面文件',message:`将「${path.basename(target)}」移入回收站？`,detail:`${target}\n\n这会同时删除原 Windows 桌面上的项目，不只是隐藏蜂窝图标。文件夹包含的内容也会一起移入回收站；删除快捷方式不会卸载应用。`,buttons:['取消','移入回收站'],defaultId:0,cancelId:0,noLink:true});
  if(choice.response!==1)return {canceled:true};
  await shell.trashItem(target);
  for(const w of desktopWindows.values())if(!w.isDestroyed())w.webContents.send('desktop:changed');return {ok:true};
 }catch(e){return {ok:false,message:'未能移入回收站（不会改为永久删除）：'+e.message};}
});
ipcMain.handle('desktop:folder',async()=>{
 const error=await shell.openPath(app.getPath('desktop'));
 return error?{ok:false,message:error}:{ok:true};
});
ipcMain.handle('desktop:create',async(event,kind)=>{
 const parent=BrowserWindow.fromWebContents(event.sender),desktop=app.getPath('desktop');
 const broadcast=()=>{for(const w of desktopWindows.values())if(!w.isDestroyed())w.webContents.send('desktop:changed');};
 try{
  if(['folder','text'].includes(kind)){
   const choice=await dialog.showSaveDialog(parent,{title:kind==='folder'?'新建桌面文件夹':'新建桌面文本文档',defaultPath:path.join(desktop,kind==='folder'?'新建文件夹':'新建文本文档.txt')});
   if(choice.canceled)return {canceled:true};const target=choice.filePath;
   if(path.dirname(target).toLowerCase()!==desktop.toLowerCase())return {ok:false,message:'请保存在桌面目录中'};
   if(kind==='folder')fs.mkdirSync(target);else fs.writeFileSync(target,'',{flag:'wx'});
  }else if(kind==='shortcut'||kind==='import'){
   const choice=await dialog.showOpenDialog(parent,{title:kind==='shortcut'?'选择要创建桌面快捷方式的应用或文件':'选择要复制到桌面的文件',properties:kind==='shortcut'?['openFile']:['openFile','multiSelections']});
   if(choice.canceled)return {canceled:true};
   for(const source of choice.filePaths){
    const name=kind==='shortcut'?path.parse(source).name+'.lnk':path.basename(source),p=path.parse(name);let target=path.join(desktop,name),n=2;
    while(fs.existsSync(target))target=path.join(desktop,`${p.name} (${n++})${p.ext}`);
    if(kind==='import')fs.copyFileSync(source,target,fs.constants.COPYFILE_EXCL);
    else await new Promise((resolve,reject)=>execFile('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',path.join(ROOT,'tools','create-shortcut.ps1'),'-Source',source,'-Destination',target],{windowsHide:true,timeout:15000},e=>e?reject(e):resolve()));
   }
  }else return {ok:false,message:'不支持的操作'};
  broadcast();return {ok:true};
 }catch(e){broadcast();return {ok:false,message:'创建未完成：'+e.message};}
});
ipcMain.handle('desktop:icon',async(event,id,reset)=>{
 if(!itemMap.has(String(id))||! /^[a-f0-9]{16}$/.test(String(id)))return {ok:false,message:'图标项目已失效'};
 fs.mkdirSync(customIconDir,{recursive:true});const output=path.join(customIconDir,id+'.png');
 if(reset){if(fs.existsSync(output))fs.unlinkSync(output);}
 else {
  const choice=await dialog.showOpenDialog(BrowserWindow.fromWebContents(event.sender),{title:'选择图标图片',properties:['openFile'],filters:[{name:'图标图片',extensions:['png','jpg','jpeg','webp','bmp','ico']}]});
  if(choice.canceled)return {ok:false,canceled:true};const file=choice.filePaths[0];
  try{
   if(fs.statSync(file).size>20*1024*1024)return {ok:false,message:'请选择小于 20 MB 的图片'};
   if(path.extname(file).toLowerCase()==='.ico'){
    const temporary=path.join(customIconDir,id+'-pending.png');
    const status=await new Promise(resolve=>execFile('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',SCAN_SCRIPT,'-IconPath',file,'-IconOutput',temporary],{windowsHide:true,timeout:15000},(e,out)=>resolve(!e&&String(out).includes('OK:'))));
    if(!status)return {ok:false,message:'ICO 无法读取，请选择 PNG 图片'};fs.renameSync(temporary,output);
   }else{
    const image=nativeImage.createFromPath(file);if(image.isEmpty())return {ok:false,message:'图片无法读取'};
    fs.writeFileSync(output,image.resize({width:256}).toPNG());
   }
  }catch(e){return {ok:false,message:'更换图标失败：'+e.message};}
 }
 for(const w of desktopWindows.values())if(!w.isDestroyed())w.webContents.send('desktop:changed');return {ok:true};
});

async function restoreAndQuit() {
  if (quitting) return;
  quitting = true;
  clearTimeout(changeTimer); clearInterval(desktopPoll);
  clearTimeout(topologyTimer);
  clearInterval(healthTimer);
  globalShortcut.unregisterAll();
  desktopWatchers.forEach(watcher=>watcher.close());
  let restored=false;
  for(let attempt=0;attempt<3;attempt++){const result=await ps('Restore');if(result.ok){restored=true;break;}await new Promise(resolve=>setTimeout(resolve,1000));}
  try{fs.writeFileSync(path.join(DATA_ROOT,'desktop-ready.json'),JSON.stringify({pid:process.pid,time:new Date().toISOString(),ready:false,restored}));}catch{}
  app.exit(0);
}

if (!app.requestSingleInstanceLock()) {
  // A secondary launch must not run desktop restoration belonging to the owner.
  app.exit(0);
} else {
app.on('second-instance', (_event,args) => {if(args.includes('--setup'))dialog.showMessageBox({message:'请先退出蜂巢桌面，再从开始菜单打开 Setup 调整启动选项。'});});
app.whenReady().then(async()=>{
  if(packageSmoke){
    await require('./tools/package-smoke')({app,root:ROOT,execFile});
    app.exit(0);return;
  }
  if(app.isPackaged){
    if(process.argv.includes('--startup'))await new Promise(resolve=>setTimeout(resolve,15000));
    const proceed=await require('./tools/first-run')({app,dialog,execFile,root:ROOT});
    if(!proceed){app.exit(0);return;}
  }
  const initialRestore=await ps('Restore');if(!initialRestore.ok)throw Error('Initial desktop restoration failed: '+initialRestore.message);
  const heartbeat=path.join(app.getPath('userData'),`heartbeat-${process.pid}.txt`);
  fs.writeFileSync(heartbeat,String(Date.now()));
  const quote=s=>"'"+s.replace(/'/g,"''")+"'";
  const guardArgs=`-NoProfile -NonInteractive -ExecutionPolicy Bypass -File "${path.join(ROOT,'tools','watchdog.ps1')}" -OwnerId ${process.pid} -Heartbeat "${heartbeat}" -ExecutablePath "${process.execPath}"`;
  const guardCommand=`Start-Process -FilePath powershell.exe -ArgumentList ${quote(guardArgs)} -WindowStyle Hidden`;
  execFile('powershell.exe',['-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(guardCommand,'utf16le').toString('base64')],{windowsHide:true},e=>{if(e)failure('Watchdog launch failed: '+e.message);});
  const guardDeadline=Date.now()+10000;
  while(!fs.existsSync(heartbeat+'.guard')&&Date.now()<guardDeadline&&!quitting)await new Promise(resolve=>setTimeout(resolve,100));
  if(quitting)return;
  if(!fs.existsSync(heartbeat+'.guard'))throw Error('Watchdog did not acknowledge startup; native icons remain visible');
  guardReady=true;
  healthTimer=setInterval(()=>{
   const now=Date.now();
   if([...rendererHealth.values()].some(h=>(!h.ready&&now-h.created>75000)||(h.ready&&now-h.last>25000))){failure('Renderer readiness/heartbeat timeout');return;}
   fs.writeFileSync(heartbeat,String(now));
  },3000);
  globalShortcut.register('CommandOrControl+Alt+Shift+Q',()=>restoreAndQuit());
  watchDesktop();
  const rebuild=async()=>{
    if(quitting||rebuilding)return;
    rebuilding=true;
    const restored=await ps('Restore');
    if(quitting)return;
    if(!restored.ok){rebuilding=false;failure('Display rebuild recovery failed: '+restored.message);return;}
    systemStyled=false;styleApplication=null;
    for(const window of desktopWindows.values())window.destroy();
    desktopWindows.clear();
    layoutIdentities=displayLayout.identify(screen.getAllDisplays());
    displayLayout.migrate(layoutStore,layoutIdentities);
    fs.writeFileSync(path.join(DATA_ROOT,'display-layout-diagnostics.json'),JSON.stringify(screen.getAllDisplays().map(d=>({id:d.id,layoutId:layoutIdentities.get(String(d.id)),label:d.label,internal:d.internal,bounds:d.bounds})),null,2));
    for(const display of screen.getAllDisplays())createWindow(display);
    broadcastIslands();
    rebuilding=false;
  };
  await rebuild();
  require('electron').powerMonitor.on('resume',()=>auditLayout('resume',screen.getAllDisplays().map(d=>({id:d.id,label:d.label,bounds:d.bounds,scaleFactor:d.scaleFactor}))));
  const schedule=()=>{clearTimeout(topologyTimer);topologyTimer=setTimeout(()=>{if(rebuilding){schedule();return;}rebuild().catch(e=>failure(e.stack));},800);};
  screen.on('display-added',schedule);screen.on('display-removed',schedule);screen.on('display-metrics-changed',schedule);
  for(const event of ['display-added','display-removed','display-metrics-changed'])screen.on(event,()=>auditLayout(event,screen.getAllDisplays().map(d=>({id:d.id,label:d.label,bounds:d.bounds,scaleFactor:d.scaleFactor}))));
}).catch(e=>{if(packageSmoke){console.error(e);app.exit(1);}else failure(e.stack);});
process.on('uncaughtException',e=>failure(e.stack));
process.on('unhandledRejection',e=>failure(String(e?.stack||e)));
app.on('before-quit', (event) => {
  if (!quitting) {
    event.preventDefault();
    restoreAndQuit();
  }
});
app.on('window-all-closed', () => {if(!rebuilding)restoreAndQuit();});
app.on('activate', () => { if (!desktopWindows.size&&!rebuilding&&!quitting)failure('No desktop windows remain'); });
}
