'use strict';
(()=>{
 const host=document.querySelector('.island-panel'),functions=document.createElement('section');
 functions.id='island-functions';functions.className='island-page active';functions.setAttribute('role','tabpanel');
 while(host.firstChild)functions.append(host.firstChild);
 host.innerHTML=`<nav class="island-tabs" role="tablist" aria-label="蜂巢桌面页面"><button role="tab" data-page="functions">⌘ 功能</button><button role="tab" data-page="music">♫ 音乐</button><button role="tab" data-page="notes">▤ 便签</button><button role="tab" data-page="clock">◷ 时钟</button></nav><div class="island-pages"></div>`;
 const pages=host.querySelector('.island-pages');pages.append(functions);
 const music=document.createElement('section');music.id='island-music';music.className='island-page';music.setAttribute('role','tabpanel');
 music.innerHTML=`<div class="music-top"><span class="music-eyebrow">NOW PLAYING</span><select id="musicSource" aria-label="音乐来源"><option>正在读取…</option></select></div><div class="music-card"><div class="music-art"><span>♫</span><img id="musicCover" alt="专辑封面" hidden></div><div class="music-copy"><div class="music-state"><span class="music-bars"><i></i><i></i><i></i></span><span id="musicState">等待音乐</span></div><h2 id="musicTitle">让音乐陪你工作</h2><div id="musicArtist">打开音乐软件，播放一首喜欢的歌</div><div id="musicAlbum"></div></div></div><div class="music-timeline"><div class="music-track"><div id="musicProgress"></div></div><div class="music-times"><span id="musicPosition">--:--</span><span id="musicDuration">--:--</span></div></div><div class="music-controls"><button id="musicPrevious" aria-label="上一首" disabled>❮❮</button><button id="musicToggle" aria-label="播放或暂停" disabled>▶</button><button id="musicNext" aria-label="下一首" disabled>❯❯</button></div><p id="musicHelp">通过 Windows 系统媒体会话连接播放器</p>`;
 pages.append(music);
 music.querySelector('.music-track').innerHTML='<input id="musicSeek" type="range" min="0" max="1" step="0.1" value="0" aria-label="播放进度" disabled>';
 const shuffleButton=document.createElement('button');shuffleButton.id='musicShuffle';shuffleButton.className='music-mode';shuffleButton.disabled=true;shuffleButton.textContent='随机';shuffleButton.setAttribute('aria-label','切换随机播放');music.querySelector('.music-controls').prepend(shuffleButton);
 const repeatButton=document.createElement('button');repeatButton.id='musicRepeat';repeatButton.className='music-mode';repeatButton.disabled=true;repeatButton.textContent='顺序';repeatButton.setAttribute('aria-label','切换顺序或循环播放');music.querySelector('.music-controls').append(repeatButton);
 // Keep the generic transport implementation dormant; this UI exposes only verified integration.
 music.classList.add('music-simple');
 music.querySelector('.music-timeline').hidden=true;shuffleButton.hidden=true;repeatButton.hidden=true;music.querySelector('#musicHelp').hidden=true;
 const atmosphere=document.createElement('img');atmosphere.className='music-atmosphere';atmosphere.alt='';atmosphere.hidden=true;music.querySelector('.music-card').prepend(atmosphere);
 const artCaption=document.createElement('span');artCaption.id='musicCoverStatus';artCaption.textContent='等待封面';music.querySelector('.music-art').append(artCaption);
 artCaption.hidden=true;
 const glyphs={play:'<path d="m9 5 11 7-11 7Z"/>',pause:'<path d="M8 5v14M16 5v14"/>',previous:'<path d="M6 5v14m13-14L9 12l10 7Z"/>',next:'<path d="M18 5v14M5 5l10 7-10 7Z"/>'};
 const icon=name=>`<svg viewBox="0 0 24 24" width="22" height="22" fill="${name==='play'?'currentColor':'none'}" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${glyphs[name]}</svg>`;
 getMusicButton('musicPrevious','previous');getMusicButton('musicNext','next');
 function getMusicButton(id,name){music.querySelector('#'+id).innerHTML=icon(name);}
 const notesPage=document.createElement('section');notesPage.id='island-notes';notesPage.className='island-page';notesPage.setAttribute('role','tabpanel');
 notesPage.innerHTML=`<div class="notes-top"><span id="notesCount">随手记下，不打断思路</span><button id="noteAdd">＋ 新便签</button></div><div class="notes-layout"><div class="notes-list" id="notesList"></div><div class="notes-editor"><textarea id="noteText" maxlength="20000" placeholder="点击「新便签」，记下此刻的想法…" aria-label="便签内容" disabled></textarea><div class="note-footer"><span id="noteSaveStatus">本机保存 · 多屏共享</span><button id="noteDelete" disabled>删除</button></div></div></div>`;
 pages.append(notesPage);
 const retry=document.createElement('button');retry.id='noteRetry';retry.textContent='重试保存';retry.hidden=true;notesPage.querySelector('.note-footer').append(retry);
 const trashButton=document.createElement('button');trashButton.id='noteTrash';trashButton.textContent='最近删除';notesPage.querySelector('.notes-top').append(trashButton);
 const trashPanel=document.createElement('div');trashPanel.id='noteTrashPanel';trashPanel.hidden=true;notesPage.append(trashPanel);
 let trashBusy=false;
 async function showTrash(){
  if(trashBusy)return;trashBusy=true;
  try{const r=await window.glassHive.deletedNotes();if(!r.ok)throw Error(r.message);trashPanel.replaceChildren();
   const close=document.createElement('button');close.textContent='← 返回便签';close.onclick=()=>trashPanel.hidden=true;trashPanel.append(close);
   for(const n of r.notes){const row=document.createElement('button');row.textContent='恢复 · '+(n.text.trim().split('\n')[0]||'未命名便签');row.title=new Date(n.deletedAt).toLocaleString();row.onclick=async()=>{if(dirty||saving){toast('请先保存当前草稿');return;}row.disabled=true;try{const result=await window.glassHive.writeNote({action:'restore',id:n.id,revision:n.revision});if(!result.ok)throw Error(result.message);notes=result.notes;openNote(n.id);trashPanel.hidden=true;toast('便签已恢复');}catch(e){toast(e.message);row.disabled=false;}};trashPanel.append(row);}
   if(!r.notes.length)trashPanel.append(document.createTextNode('暂无已删除便签'));trashPanel.hidden=false;
  }catch(e){toast('读取失败：'+e.message);}finally{trashBusy=false;}
 }
 trashButton.onclick=showTrash;
 const pageScroll={};
 const clockPage=document.createElement('section');clockPage.id='island-clock';clockPage.className='island-page';clockPage.setAttribute('role','tabpanel');pages.append(clockPage);
 for(const panel of pages.children){const key='hub-scroll:'+displayId+':'+panel.id;pageScroll[panel.id]=Number(sessionStorage.getItem(key))||0;panel.addEventListener('scroll',()=>{if(!panel.classList.contains('active'))return;pageScroll[panel.id]=panel.scrollTop;sessionStorage.setItem(key,String(panel.scrollTop));},{passive:true});}
 const get=id=>document.getElementById(id),tabs=[...host.querySelectorAll('[role=tab]')];let active='functions';
 function selectPage(name){
  if(active==='notes'&&name!=='notes'){editor.blur();saveNote();}
  const old=tabs.findIndex(t=>t.dataset.page===active),next=tabs.findIndex(t=>t.dataset.page===name);active=name;
  for(const [i,tab]of tabs.entries()){
   const on=tab.dataset.page===name;tab.id='tab-'+tab.dataset.page;tab.setAttribute('aria-controls','island-'+tab.dataset.page);tab.setAttribute('aria-selected',String(on));tab.tabIndex=on?0:-1;
   const panel=get('island-'+tab.dataset.page);panel.setAttribute('aria-labelledby',tab.id);panel.inert=!on;panel.classList.toggle('depart-left',i<next||(i===old&&next>old));panel.classList.toggle('active',on);
  }
  get('island-'+name).scrollTop=pageScroll['island-'+name]||0;
  storedWrite(layoutKey('hive-island-page'),name);if(name==='music')pollMedia();
 }
 tabs.forEach((tab,i)=>{tab.onclick=()=>selectPage(tab.dataset.page);tab.onkeydown=e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const index=e.key==='Home'?0:e.key==='End'?tabs.length-1:(i+(e.key==='ArrowRight'?1:tabs.length-1))%tabs.length;tabs[index].focus();selectPage(tabs[index].dataset.page);}};});
 let sessions=[],selected='',manualSource='',mediaBusy=false,coverRequest=0,coverKey='',trackKey='',seekPreview=null;
 const mediaCommands=HiveMediaCommandQueue.create(),controlBusy=action=>mediaCommands.busy(selected,action);
 const sourceName=HiveMediaSources.name;
 const time=HiveMediaTimeline.format;
 function drawTimeline(){
  const s=sessions.find(s=>s.source===selected),t=HiveMediaTimeline.timeline(s),seek=get('musicSeek');
  const position=seekPreview===null?t.position:seekPreview;
  seek.disabled=controlBusy('seek')||!t.canSeek;seek.min=t.valid?t.min:0;seek.max=t.valid?t.max:1;seek.value=t.valid?position:0;
  seek.style.setProperty('--progress',`${t.valid?Math.max(0,Math.min(100,(position-t.min)/(t.max-t.min||1)*100)):0}%`);
  seek.title=t.canSeek?'拖动调整播放位置':t.valid?'此播放器未开放进度拖动':'此播放器未提供时间轴，无法拖动';
  seek.setAttribute('aria-valuetext',t.valid?`${time(position-t.start)} / ${time(t.duration)}`:'播放器未提供时间信息');
  get('musicPosition').textContent=t.valid?time(position-t.start):'已播放：未提供';get('musicDuration').textContent=t.valid?time(t.duration):'总时长：未提供';
 }
 function showMedia(){
  const s=sessions.find(s=>s.source===selected);music.classList.toggle('playing',!!s?.playing);
  get('musicTitle').textContent=s?.title||'让音乐陪你工作';get('musicArtist').textContent=s?.artist|| (s?'未提供歌手信息':'打开音乐软件，播放一首喜欢的歌');get('musicAlbum').textContent=s?.album||'';
  get('musicState').textContent=s?(s.playing?'正在播放':'已暂停'):'等待音乐';
  const currentTrack=s?[s.source,s.title,s.artist].join('|'):'';
  if(currentTrack!==trackKey){trackKey=currentTrack;seekPreview=null;if(!matchMedia('(prefers-reduced-motion: reduce)').matches)music.querySelector('.music-copy').animate([{opacity:0,transform:'translateY(7px)'},{opacity:1,transform:'none'}],{duration:300,easing:'ease-out'});}
  const cover=get('musicCover'),key=currentTrack+'|'+(s?.cover||'');
  const diagnostic=s?.coverDiagnostics?.status;
  get('musicCoverStatus').textContent=s?.cover?'封面加载中':diagnostic==='read-error'?'封面读取失败':s?'暂无封面':'等待音乐';
  if(key!==coverKey){coverKey=key;const request=++coverRequest;
   // Clear a previous track immediately; never show another song's cover as this song's.
   cover.hidden=true;atmosphere.hidden=true;music.classList.remove('has-cover');
   music.classList.toggle('cover-loading',!!s?.cover);
   if(s?.cover){const candidate=new Image();candidate.src=s.cover;candidate.decode().then(()=>{if(request!==coverRequest)return;cover.src=candidate.src;atmosphere.src=candidate.src;cover.hidden=false;atmosphere.hidden=false;music.classList.remove('cover-loading');music.classList.add('has-cover');if(!matchMedia('(prefers-reduced-motion: reduce)').matches)cover.animate([{opacity:0,transform:'scale(1.05)'},{opacity:1,transform:'scale(1)'}],{duration:240,easing:'ease-out'});}).catch(()=>{if(request===coverRequest){music.classList.remove('cover-loading');coverKey='';get('musicCoverStatus').textContent='封面无法解码';}});}
   else{cover.removeAttribute('src');atmosphere.removeAttribute('src');}
  }
  get('musicToggle').innerHTML=icon(s?.playing?'pause':'play');get('musicToggle').setAttribute('aria-label',s?.playing?'暂停':'播放');
  for(const [id,action]of [['musicToggle','toggle'],['musicPrevious','previous'],['musicNext','next']]){const button=get(id),busy=controlBusy(action);button.disabled=busy||!s?.[action];button.setAttribute('aria-busy',String(busy));}
  drawTimeline();
  shuffleButton.disabled=controlBusy('shuffle')||!s?.controls?.shuffleEnabled||typeof s.controls.shuffle!=='boolean';shuffleButton.setAttribute('aria-pressed',String(s?.controls?.shuffle===true));shuffleButton.textContent=s?.controls?.shuffle?'随机开':'随机';shuffleButton.title=shuffleButton.disabled?'播放器未开放随机播放控制':'切换随机播放';
  const repeat=s?.controls?.repeat;repeatButton.disabled=controlBusy('repeat')||!s?.controls?.repeatEnabled||!['None','Track','List'].includes(repeat);repeatButton.textContent=({None:'顺序',Track:'单曲',List:'列表'})[repeat]||'循环';repeatButton.setAttribute('aria-label','播放模式：'+(repeatButton.disabled?'未开放':repeatButton.textContent));repeatButton.dataset.active=String(repeat==='Track'||repeat==='List');repeatButton.title=repeatButton.disabled?'播放器未开放循环模式控制':'顺序 → 列表循环 → 单曲循环';
  const missing=[];if(!HiveMediaTimeline.timeline(s).valid)missing.push('时间轴');if(!s?.controls?.shuffleEnabled)missing.push('随机');if(!s?.controls?.repeatEnabled)missing.push('循环');
  get('musicHelp').textContent=s?(missing.length?`播放器未开放：${missing.join('、')}；请在原播放器中操作。`:'拖动进度条跳转 · 随机与循环状态由播放器同步'):'未检测到系统媒体会话；请在播放器中启用系统媒体控制（如支持）。';
 }
 async function pollMedia(){
  if(mediaBusy||active!=='music'||!island.classList.contains('open')||island.hidden)return;mediaBusy=true;
  try{const r=await window.glassHive.mediaStatus();sessions=r.ok?r.sessions:[];
   if(r.ok&&manualSource&&!sessions.some(s=>s.source===manualSource))manualSource='';
   selected=HiveMediaSources.choose(sessions,r.current,selected,manualSource);
   const select=get('musicSource'),options=[{value:'',label:selected?'自动 · '+sourceName(selected):'自动 · 等待播放器'},...sessions.map(s=>({value:s.source,label:sourceName(s.source)}))];
   const signature=JSON.stringify(options);if(select.dataset.options!==signature){select.replaceChildren();for(const entry of options){const option=document.createElement('option');option.value=entry.value;option.textContent=entry.label;select.append(option);}select.dataset.options=signature;}
   select.value=manualSource;select.disabled=!sessions.length;showMedia();if(!r.ok)get('musicState').textContent='连接暂不可用';
  }catch(e){sessions=[];selected='';showMedia();get('musicState').textContent='连接暂不可用';}finally{mediaBusy=false;}
 }
 get('musicSource').onchange=e=>{manualSource=e.target.value;selected=HiveMediaSources.choose(sessions,'',selected,manualSource);showMedia();};
 async function command(action,value,track){
  if(!selected)return;const source=selected;
  await mediaCommands.run(source,action,async()=>{
   try{const r=await window.glassHive.mediaControl(source,action,value,track);if(!r.ok)toast(r.message||'软件不支持此操作');}
   catch(_){toast('媒体操作失败，请重试');}
   finally{seekPreview=null;await pollMedia();}
  },showMedia);
 }
 for(const [id,action]of [['musicToggle','toggle'],['musicPrevious','previous'],['musicNext','next']])get(id).onclick=()=>command(action);
 shuffleButton.onclick=()=>{const s=sessions.find(s=>s.source===selected);if(s?.controls?.shuffleEnabled)command('shuffle',s.controls.shuffle?0:1);};
 repeatButton.onclick=()=>{const s=sessions.find(s=>s.source===selected);if(s?.controls?.repeatEnabled)command('repeat',({None:2,List:1,Track:0})[s.controls.repeat]);};
 get('musicSeek').oninput=e=>{seekPreview=Number(e.target.value);drawTimeline();};
 get('musicSeek').onchange=()=>{const s=sessions.find(s=>s.source===selected),value=seekPreview;seekPreview=null;if(s&&value!==null&&HiveMediaTimeline.timeline(s).canSeek)command('seek',value,s.title+'|'+s.artist);};
 get('musicSeek').onpointercancel=()=>{seekPreview=null;drawTimeline();};
 setInterval(pollMedia,700);new MutationObserver(()=>{if(island.classList.contains('open'))pollMedia();}).observe(island,{attributes:true,attributeFilter:['class','hidden']});
 let notes=[],noteId=null,noteRevision=null,saving=false,dirty=false,conflict=false;const editor=get('noteText'),status=get('noteSaveStatus');
 let noteFocusPending=false,noteFocusOwned=false,noteFocusVersion=0;
 window.hiveNoteFocusState=()=>({pending:noteFocusPending,owned:noteFocusOwned,focused:document.hasFocus(),target:document.activeElement?.id,status:status.textContent});
 async function focusEditor(){
  if(editor.disabled||active!=='notes'||!island.classList.contains('open')||noteFocusPending)return;
  if(noteFocusOwned){editor.focus({preventScroll:true});return;}
  noteFocusPending=true;const version=++noteFocusVersion;
  try{const r=await window.glassHive.focusNotes();if(version!==noteFocusVersion)return;if(r.ok){noteFocusOwned=true;if(status.textContent.startsWith('未获得输入焦点'))status.textContent=dirty?'待保存…':'已保存 · '+editor.value.length+' 字';editor.focus({preventScroll:true});}else status.textContent='未获得输入焦点，请再点击编辑区';}catch(e){status.textContent='输入焦点获取失败，请重试';}finally{noteFocusPending=false;}
 }
 function releaseEditor(){if(document.activeElement===editor)editor.blur();if(!noteFocusOwned)return;noteFocusOwned=false;noteFocusVersion++;window.glassHive.releaseNotes().catch(()=>{});}
 editor.addEventListener('pointerdown',()=>{if(!noteFocusOwned)focusEditor();});
 editor.addEventListener('keyup',event=>{if(event.key==='Tab'&&!noteFocusOwned)focusEditor();});
 // Tabs share one open panel: release native ownership only when leaving the panel.
 new MutationObserver(()=>{if(!island.classList.contains('open')||island.hidden){saveNote();releaseEditor();}}).observe(island,{attributes:true,attributeFilter:['class','hidden']});
 window.addEventListener('blur',()=>{if(!noteFocusPending)releaseEditor();});
 document.addEventListener('pointerdown',event=>{if(!island.contains(event.target))releaseEditor();},true);
 const draftKey=id=>'hive-note-draft:'+layoutDisplayId+':'+id;
 function readDraft(id){const key=draftKey(id),legacy='hive-note-draft:'+id;let value=localStorage.getItem(key);if(value===null){value=localStorage.getItem(legacy);if(value!==null){localStorage.setItem(key,value);localStorage.removeItem(legacy);}}return value;}
 function renderNotes(){
  get('notesCount').textContent=`${notes.length} 条便签 · 本机保存 / 多屏共享`;const list=get('notesList');list.replaceChildren();
  for(const note of notes){const b=document.createElement('button');b.setAttribute('aria-current',String(note.id===noteId));const title=document.createElement('b');title.textContent=note.text.trim().split('\n')[0]||'未命名便签';const date=document.createElement('small');date.textContent=new Date(note.updated).toLocaleDateString('zh-CN');b.append(title,date);b.onclick=()=>{if(dirty||saving){toast('请等待保存，或先复制尚未保存的草稿');return;}openNote(note.id);};list.append(b);}
 }
 function openNote(id){deleteArmed=0;get('noteDelete').textContent='删除';retry.hidden=true;noteId=id;const note=notes.find(n=>n.id===id);noteRevision=note?.revision??null;editor.value=note?.text||'';editor.disabled=!note;editor.placeholder=note?'在这里输入便签内容…':'点击「新便签」，记下此刻的想法…';get('noteDelete').disabled=!note;dirty=false;conflict=false;get('noteAdd').textContent='＋ 新便签';status.textContent=note?'已保存 · '+note.text.length+' 字':'本机保存 · 多屏共享';const draft=note?readDraft(id):null;if(draft!==null&&draft!==editor.value){editor.value=draft;dirty=true;status.textContent='恢复了未保存草稿，继续输入以保存';}renderNotes();}
 let noteSaveTimer;
 async function saveNote(){
  clearTimeout(noteSaveTimer);
  if(saving||!dirty||conflict||composingNote)return;const note=notes.find(n=>n.id===noteId);if(!note)return;saving=true;retry.hidden=true;status.textContent='正在保存…';const text=editor.value,id=noteId;
  try{const r=await window.glassHive.writeNote({action:'update',id,revision:noteRevision,text});if(!r.ok){conflict=!!r.conflict;status.textContent='保存失败：'+r.message;retry.hidden=conflict;if(conflict)get('noteAdd').textContent='＋ 另存草稿';return;}notes=r.notes;noteRevision=r.note.revision;dirty=editor.value!==text;status.textContent=dirty?'正在保存…':`已保存 · ${text.length} 字`;if(!dirty)localStorage.removeItem(draftKey(id));renderNotes();}
  catch(e){retry.hidden=false;status.textContent='保存失败，草稿已保留';return;}finally{saving=false;}
  if(dirty&&!conflict)saveNote();
 }
 retry.onclick=()=>saveNote();
 let composingNote=false;
 editor.addEventListener('compositionstart',()=>{composingNote=true;});
 editor.addEventListener('compositionend',()=>{composingNote=false;editor.oninput();});
 editor.oninput=()=>{dirty=true;localStorage.setItem(draftKey(noteId),editor.value);status.textContent=composingNote?'正在输入…':'正在保存…';if(!composingNote){clearTimeout(noteSaveTimer);noteSaveTimer=setTimeout(saveNote,250);}};
 get('noteAdd').onclick=async()=>{if(saving||(dirty&&!conflict)){toast('请先完成当前便签的保存');return;}const draft=conflict?editor.value:null,oldId=noteId;const r=await window.glassHive.writeNote({action:'add'});if(!r.ok){toast(r.message);return;}notes=r.notes;openNote(r.note.id);if(draft!==null){editor.value=draft;dirty=true;localStorage.setItem(draftKey(noteId),draft);localStorage.removeItem(draftKey(oldId));await saveNote();}await focusEditor();};
 let deleteArmed=0;
 get('noteDelete').onclick=async()=>{if(dirty||saving){toast('当前便签尚未保存，请稍候');return;}if(Date.now()>deleteArmed){deleteArmed=Date.now()+4000;get('noteDelete').textContent='确认删除？';setTimeout(()=>get('noteDelete').textContent='删除',4000);return;}deleteArmed=0;const note=notes.find(n=>n.id===noteId);if(!note)return;const r=await window.glassHive.writeNote({action:'delete',id:note.id,revision:note.revision});if(!r.ok){toast(r.message);return;}notes=r.notes;localStorage.removeItem(draftKey(note.id));openNote(notes[0]?.id||null);get('noteDelete').textContent='删除';};
 window.glassHive.onNotesChanged(next=>{const previous=notes.find(n=>n.id===noteId);notes=next;if(dirty&&!saving&&notes.find(n=>n.id===noteId)?.revision!==noteRevision){conflict=true;status.textContent='另一屏已修改或删除便签，当前草稿已保留';get('noteAdd').textContent='＋ 另存草稿';}if(previous&&notes.find(n=>n.id===noteId)?.revision===previous.revision){renderNotes();return;}if(!dirty&&!saving)openNote(notes.some(n=>n.id===noteId)?noteId:notes[0]?.id||null);else renderNotes();});
 window.glassHive.listNotes().then(r=>{if(!r.ok){status.textContent=r.message;get('noteAdd').disabled=true;return;}notes=r.notes;openNote(notes[0]?.id||null);});
 const saved=localStorage.getItem(layoutKey('hive-island-page'));selectPage(['functions','music','notes','clock'].includes(saved)?saved:'functions');
})();
