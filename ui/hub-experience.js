'use strict';
(()=>{
 const settings=document.getElementById('hubSettings');
 const groups=[['布局',['#sizeSlider','#gridEdit','#offsetValue','.control-note']],['图标',['#iconSlider','#refresh','#recenter','#labelSetting']],['中枢',['#islandBar','.overview','#quit']],['多屏',['#islandScreens']],['备份',['.layout-backups']]];
 for(const [name,selectors]of groups){
  const section=document.createElement('details');section.className='hub-settings-group';
  const key='hub-group:'+displayId+':'+name;section.open=sessionStorage.getItem(key)==='true'||(sessionStorage.getItem(key)===null&&name==='布局');
  const heading=document.createElement('summary');heading.textContent=name;const content=document.createElement('div');content.className='hub-settings-content';section.append(heading,content);
  for(const selector of selectors){let node=settings.querySelector(selector);if(!node)continue;if(node.matches('input'))node=node.closest('label');else if(['gridEdit','offsetValue','islandBar'].includes(node.id))node=node.closest('.grid-controls');content.append(node);}
  section.addEventListener('toggle',()=>sessionStorage.setItem(key,String(section.open)));settings.append(section);
 }
 const emptyActions=settings.querySelector('.actions');if(emptyActions&&!emptyActions.children.length)emptyActions.remove();
 const compact=document.querySelector('.island-compact');compact.tabIndex=0;compact.setAttribute('role','button');compact.setAttribute('aria-label','展开或收起蜂巢桌面');compact.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();compact.click();}};
})();
