'use strict';

const { contextBridge, ipcRenderer } = require('electron');
let layoutEpoch;

contextBridge.exposeInMainWorld('glassHive', {
  spectrumActive: active => ipcRenderer.send('spectrum:active',active===true),
  onSpectrum: callback => ipcRenderer.on('spectrum:frame',(_event,values)=>callback(values)),
  syncLayout: (values,seed=false) => {const result=ipcRenderer.sendSync('layout:sync',values,seed,layoutEpoch);if(result.ok)layoutEpoch=result.epoch;return result;},
  layoutBackups: (action,id) => ipcRenderer.invoke('layout:backups',action,id),
  listDesktop: () => ipcRenderer.invoke('desktop:list'),
  focusGame: () => ipcRenderer.invoke('game:focus'),
  focusNotes: () => ipcRenderer.invoke('notes:focus'),
  editNote: id => ipcRenderer.invoke('notes:editor',id),
  releaseNotes: () => ipcRenderer.invoke('notes:release'),
  releaseGame: () => ipcRenderer.invoke('game:release'),
  mediaStatus: () => ipcRenderer.invoke('media:status'),
  mediaControl: (source,action,value,track) => ipcRenderer.invoke('media:control',{source,action,value,track}),
  listNotes: () => ipcRenderer.invoke('notes:list'),
  deletedNotes: () => ipcRenderer.invoke('notes:trash'),
  writeNote: request => ipcRenderer.invoke('notes:write',request),
  onNotesChanged: callback => ipcRenderer.on('notes:changed',(_event,notes)=>callback(notes)),
  desktopMenu: () => ipcRenderer.invoke('desktop:menu'),
  desktopSettings: kind => ipcRenderer.invoke('desktop:settings',kind),
  createDesktopItem: kind => ipcRenderer.invoke('desktop:create',kind),
  newTypes: () => ipcRenderer.invoke('desktop:new-types'),
  newType: extension => ipcRenderer.invoke('desktop:new-type',extension),
  deleteItem: id => ipcRenderer.invoke('desktop:delete',id),
  openDesktopFolder: () => ipcRenderer.invoke('desktop:folder'),
  health: ready => ipcRenderer.send('desktop:health',ready),
  displays: () => ipcRenderer.invoke('desktop:displays'),
  islandState: () => ipcRenderer.invoke('island:state'),
  setIslandVisible: (id,visible) => ipcRenderer.invoke('island:visible',id,visible),
  onIslandState: callback => ipcRenderer.on('island:state',(_event,state)=>callback(state)),
  notifyWorkspace: () => ipcRenderer.send('workspace:changed'),
  openItem: (id) => ipcRenderer.invoke('desktop:open', id),
  changeIcon: (id,reset=false) => ipcRenderer.invoke('desktop:icon',id,reset),
  revealItem: (id) => ipcRenderer.invoke('desktop:reveal', id),
  systemStatus: () => ipcRenderer.invoke('system:status'),
  systemMetrics: () => ipcRenderer.invoke('system:metrics'),
  quit: () => ipcRenderer.invoke('app:quit'),
  onDesktopChanged: (callback) => ipcRenderer.on('desktop:changed', () => callback()),
  onStyleResult: (callback) => ipcRenderer.on('system-style', (_event, result) => callback(result))
});
