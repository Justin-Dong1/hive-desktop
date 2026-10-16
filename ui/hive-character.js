'use strict';
(function(root){
 const themes=[
  {id:'ice',name:'冰白',body:'#effaff',glow:'#64dbe8',hammer:'#c4ecf3'},
  {id:'mint',name:'薄荷',body:'#a5ffda',glow:'#39ddaa',hammer:'#7fe8bd'},
  {id:'sky',name:'天蓝',body:'#91cdff',glow:'#428fff',hammer:'#7eb9f5'},
  {id:'violet',name:'星紫',body:'#d5b4ff',glow:'#ac78ff',hammer:'#c19aeb'},
  {id:'pink',name:'樱粉',body:'#ffb6d8',glow:'#ff73b2',hammer:'#efa3cd'},
  {id:'gold',name:'暖金',body:'#ffe6a0',glow:'#ffc350',hammer:'#e9cd86'},
  {id:'orange',name:'橘光',body:'#ffc38f',glow:'#ff944d',hammer:'#efaf78'}
 ];
 const resolve=id=>themes.find(t=>t.id===id)||themes[0];
 const api={themes,resolve};if(typeof module==='object'&&module.exports)module.exports=api;else root.HiveCharacter=api;
})(globalThis);
