'use strict';
(()=>{
 const id=new URLSearchParams(location.search).get('id'),editor=document.getElementById('editor'),status=document.getElementById('status'),key='hive-editor-draft:'+id;
 let revision,dirty=false,saving=false,composing=false,conflict=false,timer,closing=false;
 async function save(){clearTimeout(timer);if(saving||composing||conflict)return false;if(!dirty)return true;saving=true;const text=editor.value;status.textContent='正在保存…';
  try{const r=await window.glassHive.writeNote({action:'update',id,revision,text});if(!r.ok){conflict=!!r.conflict;status.textContent=r.message+'；草稿已保留';return false;}revision=r.note.revision;dirty=editor.value!==text;if(!dirty)localStorage.removeItem(key);status.textContent=dirty?'待保存…':'已保存 · '+text.length+' 字';}
  catch(e){status.textContent='保存失败，草稿已保留，请重试';return false;}finally{saving=false;}
  if(dirty)return save();return true;
 }
 editor.oninput=()=>{dirty=true;localStorage.setItem(key,editor.value);status.textContent=composing?'正在输入…':'待保存…';clearTimeout(timer);if(!composing)timer=setTimeout(save,250);};
 editor.oncompositionstart=()=>composing=true;editor.oncompositionend=()=>{composing=false;editor.oninput();};
 document.getElementById('save').onclick=save;document.getElementById('done').onclick=async()=>{if(await save()){closing=true;window.close();}};
 window.addEventListener('beforeunload',event=>{if(dirty||saving||composing){localStorage.setItem(key,editor.value);if(!closing){event.preventDefault();event.returnValue='';save().then(()=>{closing=true;window.close();});}}});
 window.glassHive.onNotesChanged(notes=>{const n=notes.find(n=>n.id===id);if(!n){conflict=true;status.textContent='便签已删除；当前草稿保留，请复制内容';return;}if(saving)return;if(dirty&&n.revision!==revision){conflict=true;status.textContent='其他窗口已修改；草稿保留，请复制后重新打开';return;}if(!dirty&&n.revision!==revision){revision=n.revision;editor.value=n.text;}});
 window.glassHive.listNotes().then(r=>{const note=r.notes?.find(n=>n.id===id);if(!r.ok||!note){status.textContent=r.message||'便签不存在';return;}revision=note.revision;editor.value=localStorage.getItem(key)??note.text;dirty=editor.value!==note.text;editor.disabled=false;status.textContent=dirty?'已恢复草稿，点击保存':'已保存';editor.focus();}).catch(()=>status.textContent='读取失败，请关闭后重试');
})();
