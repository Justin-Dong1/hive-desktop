'use strict';
const assert=require('assert'),sources=require('../ui/media-sources');
for(const [source,id,name]of [
 ['QQMusic.exe','qq','QQ 音乐'],['qqmusic.EXE','qq','QQ 音乐'],['Tencent.QQMusic_test!App','qq','QQ 音乐'],
 ['KuGou.exe','kugou','酷狗音乐'],['KugouMusic.exe','kugou','酷狗音乐'],
 ['KwMusic.exe','kuwo','酷我音乐'],['KuwoMusic.exe','kuwo','酷我音乐'],['C:\\Music\\KwMusic.exe','kuwo','酷我音乐'],
 ['cloudmusic.exe','netease','网易云音乐']
]){assert.strictEqual(sources.profile(source)?.id,id);assert.strictEqual(sources.name(source),name);}
assert.strictEqual(sources.profile('notqqmusic.exe'),null);
assert.strictEqual(sources.name('unknown.exe'),'unknown.exe');
const a={source:'cloudmusic.exe',playing:false},b={source:'QQMusic.exe',playing:true},c={source:'KuGou.exe',playing:true},d={source:'KwMusic.exe',playing:true},browser={source:'chrome.exe',playing:true};
for(const active of [b,c,d]){
 assert.strictEqual(sources.choose([a,active,browser],browser.source,a.source,''),active.source,'Auto follows playing music, not old paused player or browser');
 assert.strictEqual(sources.choose([a,active],active.source,'',a.source),a.source,'Manual selection is respected');
}
assert.strictEqual(sources.choose([b,c],c.source,b.source,''),c.source);
assert.strictEqual(sources.choose([d],'',b.source,b.source),d.source,'Closed manual source falls back');
assert.strictEqual(sources.choose([],b.source,b.source,''),'');
assert.strictEqual(sources.choose([browser],'','',''),browser.source);
console.log('PASS player aliases, auto switching, manual selection, closed sources, browser fallback');
