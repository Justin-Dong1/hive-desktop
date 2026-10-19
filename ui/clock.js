'use strict';
(()=>{
 const pane=document.getElementById('island-clock');if(!pane)return;
 pane.innerHTML=`<div class="clock-heading"><div><span class="clock-eyebrow">TIME FOR WHAT MATTERS</span><h2>给重要的事，留一点时间</h2></div></div>
 <div class="clock-modes" aria-label="时钟功能"><button data-mode="alarm" aria-pressed="true">闹钟</button><button data-mode="timer" aria-pressed="false">倒计时</button><button data-mode="watch" aria-pressed="false">计时</button></div>
 <form id="clockForm" class="clock-card">
 <label id="clockAlarmField">提醒日期与时间<input id="clockAlarm" type="datetime-local" required></label>
 <div id="clockTimerFields" class="clock-durations" hidden><label>时<input id="clockHours" type="number" min="0" max="168" value="0"></label><label>分<input id="clockMinutes" type="number" min="0" max="59" value="5"></label><label>秒<input id="clockSeconds" type="number" min="0" max="59" value="0"></label></div>
 <label>提醒我做什么<input id="clockText" type="text" maxlength="200" placeholder="例如：喝水休息、参加会议、关火" autocomplete="off"></label>
 <button id="clockAdd" class="clock-primary" type="submit">添加闹钟</button></form>
 <div id="clockWatch" class="clock-card" hidden><div id="clockWatchValue" class="clock-digits">00:00:00</div><div class="clock-watch-buttons"><button id="clockWatchToggle" class="clock-primary">开始</button><button id="clockWatchReset">归零</button></div></div>
 <p id="clockMessage" role="status"></p><div id="clockItems" class="clock-items"></div>
 <p class="clock-footnote">本机保存 · 多屏共享。收起中枢仍会提醒；退出蜂巢或关机时不会响铃，再次启动后会补记到期提醒。睡眠期间不会唤醒电脑。</p>`;
 const get=id=>document.getElementById(id);let mode='alarm',state=null,busy=false,sampled=performance.now();
 const accept=next=>{state=next;sampled=performance.now();render();};
 const banner=document.createElement('button');banner.className='clock-reminder';banner.hidden=true;banner.onclick=()=>{
  const target=state?.items.find(i=>i.status==='fired'&&!i.ack);document.querySelector('[data-page="clock"]').click();
  if(target){select(target.kind);const row=[...pane.querySelectorAll('[data-clock-id]')].find(n=>n.dataset.clockId===target.id);row?.scrollIntoView({block:'nearest'});row?.querySelector('button')?.focus({preventScroll:true});}
 };
 document.querySelector('.island-panel').prepend(banner);
 function format(ms){const s=Math.max(0,Math.floor(ms/1000));return [Math.floor(s/3600),Math.floor(s/60)%60,s%60].map(n=>String(n).padStart(2,'0')).join(':');}
 const local=new Date(Date.now()+3600000);local.setMinutes(local.getMinutes()-local.getTimezoneOffset());get('clockAlarm').value=local.toISOString().slice(0,16);
 async function action(request){
  if(busy)return false;busy=true;get('clockAdd').disabled=true;
   try{const r=await window.glassHive.clockChange(request);if(!r.ok)throw Error(r.message);accept(r.state);get('clockMessage').textContent=request.action==='add'?'提醒已保存':'';return true;}
  catch(e){get('clockMessage').textContent=e.message;return false;}
  finally{busy=false;get('clockAdd').disabled=false;}
 }
 function select(next){mode=next;for(const b of pane.querySelectorAll('[data-mode]'))b.setAttribute('aria-pressed',String(b.dataset.mode===mode));get('clockForm').hidden=mode==='watch';get('clockWatch').hidden=mode!=='watch';get('clockAlarmField').hidden=mode!=='alarm';get('clockAlarm').required=mode==='alarm';get('clockAlarm').disabled=mode!=='alarm';get('clockTimerFields').hidden=mode!=='timer';for(const id of ['clockHours','clockMinutes','clockSeconds'])get(id).disabled=mode!=='timer';get('clockAdd').textContent=mode==='alarm'?'添加闹钟':'开始倒计时';render();}
 for(const b of pane.querySelectorAll('[data-mode]'))b.onclick=()=>select(b.dataset.mode);
 get('clockForm').onsubmit=async event=>{event.preventDefault();const seconds=Number(get('clockHours').value)*3600+Number(get('clockMinutes').value)*60+Number(get('clockSeconds').value);if(await action({action:'add',kind:mode,text:get('clockText').value,due:new Date(get('clockAlarm').value).getTime(),seconds}))get('clockText').value='';};
 get('clockWatchToggle').onclick=()=>action({action:state?.watch.started===null?'watch:start':'watch:pause'});
 get('clockWatchReset').onclick=()=>action({action:'watch:reset'});
 // Reuse the native keyboard/IME focus path; do not reparent or open a separate editor window.
 let focusPending=false,focusOwned=false;
 window.addEventListener('blur',()=>{focusOwned=false;});
 pane.addEventListener('pointerdown',async event=>{
  const input=event.target.closest('input');if(!input||focusPending||focusOwned)return;
  focusPending=true;try{const r=await window.glassHive.focusNotes();if(r.ok&&pane.classList.contains('active')&&island.classList.contains('open')&&document.activeElement===input){focusOwned=true;input.focus({preventScroll:true});}else if(!r.ok)get('clockMessage').textContent='未能获得输入焦点，请再点击输入框';}
  catch(e){get('clockMessage').textContent='未能获得输入焦点，请再点击输入框';}finally{focusPending=false;}
 });
 function drawTime(){
  if(!state)return;const elapsed=Math.max(0,performance.now()-sampled),w=state.watch;
  get('clockWatchValue').textContent=format((w.liveElapsed??w.elapsed)+(w.started===null?0:elapsed));
  for(const node of pane.querySelectorAll('[data-clock-time]')){
   const i=state.items.find(i=>i.id===node.dataset.clockTime);if(!i)continue;
   node.textContent=i.status==='fired'?(i.ack?'已确认':'时间到了'):i.kind==='alarm'?new Date(i.due).toLocaleString('zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}):format(i.status==='paused'?i.remaining:Math.max(0,i.remaining-elapsed)+999)+(i.status==='paused'?' · 已暂停':'');
  }
 }
 function render(){
  if(!state)return;const list=get('clockItems');list.replaceChildren();
  const pending=state.items.filter(i=>i.status==='fired'&&!i.ack);
  banner.hidden=!pending.length;banner.textContent=pending.length?`◷ ${pending[0].text||'时间到了'}${pending.length>1?' · 另有 '+(pending.length-1)+' 条提醒':''} · 查看`:'';
  get('clockWatchToggle').textContent=state.watch.started===null?(state.watch.elapsed?'继续':'开始'):'暂停';
  for(const i of state.items.filter(i=>mode==='watch'?i.status==='fired'&&!i.ack:i.kind===mode)){
   const row=document.createElement('div');row.dataset.clockId=i.id;row.className='clock-item'+(i.status==='fired'&&!i.ack?' due':'');
   const copy=document.createElement('div'),label=document.createElement('strong'),time=document.createElement('span');label.textContent=i.text||(i.kind==='alarm'?'闹钟':'倒计时');time.dataset.clockTime=i.id;copy.append(label,time);row.append(copy);
   const controls=document.createElement('div');controls.className='clock-item-actions';
   const add=(text,act)=>{const b=document.createElement('button');b.textContent=text;b.onclick=()=>action({action:act,id:i.id});controls.append(b);};
   if(i.status==='fired'&&!i.ack)add('知道了','ack');
   else if(i.kind==='timer'&&i.status!=='fired')add(i.status==='paused'?'继续':'暂停',i.status==='paused'?'resume':'pause');
   add('删除','delete');row.append(controls);list.append(row);
  }
  if(!list.children.length&&mode!=='watch'){const empty=document.createElement('p');empty.className='clock-empty';empty.textContent=mode==='alarm'?'还没有闹钟，给下一件重要的事定个时间。':'还没有倒计时，试试专注五分钟。';list.append(empty);}drawTime();
 }
 window.glassHive.onClockChanged(accept);
 window.glassHive.clockRead().then(r=>{if(!r.ok)throw Error(r.message);accept(r.state);select(mode);}).catch(e=>{get('clockMessage').textContent='时钟加载失败：'+e.message;});
 setInterval(()=>{if(pane.classList.contains('active')&&island.classList.contains('open')&&!island.hidden)drawTime();},250);
})();
