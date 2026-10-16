'use strict';
(function(root){
 const profiles=[
  {id:'qq',name:'QQ 音乐',match:/(?:^|[^a-z0-9])(?:qqmusic|qq音乐)(?=$|[^a-z0-9])/i},
  {id:'kugou',name:'酷狗音乐',match:/(?:^|[^a-z0-9])(?:kugou(?:music)?|酷狗音乐)(?=$|[^a-z0-9])/i},
  {id:'kuwo',name:'酷我音乐',match:/(?:^|[^a-z0-9])(?:kwmusic|kuwo(?:music)?|酷我音乐)(?=$|[^a-z0-9])/i},
  {id:'netease',name:'网易云音乐',match:/(?:^|[^a-z0-9])cloudmusic(?=$|[^a-z0-9])/i},
  {id:'spotify',name:'Spotify',match:/(?:^|[^a-z0-9])spotify(?=$|[^a-z0-9])/i}
 ];
 function profile(source){return profiles.find(p=>p.match.test(String(source||'')))||null;}
 function name(source){return profile(source)?.name||({'msedge.exe':'Microsoft Edge','chrome.exe':'Google Chrome'}[String(source).toLowerCase()])||source;}
 function choose(sessions,current,selected,manual){
  if(manual&&sessions.some(s=>s.source===manual))return manual;
  const playing=sessions.filter(s=>s.playing),music=playing.filter(s=>profile(s.source));
  const candidates=music.length?music:playing.length?playing:sessions;
  return candidates.find(s=>s.source===current)?.source||candidates.find(s=>s.source===selected)?.source||candidates[0]?.source||'';
 }
 const api={profile,name,choose};
 if(typeof module==='object'&&module.exports)module.exports=api;else root.HiveMediaSources=api;
})(globalThis);
