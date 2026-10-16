'use strict';
function normalize(hidden, ids, primary) {
 const next={...hidden};
 if(ids.length&&ids.every(id=>next[id]===true))next[ids.includes(primary)?primary:ids[0]]=false;
 return next;
}
function setVisible(hidden,ids,primary,id,visible){
 const current=normalize(hidden,ids,primary);
 if(!ids.includes(id))return {ok:false,hidden:current,message:'该显示器已断开'};
 if(!visible&&ids.filter(key=>current[key]!==true).length===1&&current[id]!==true)return {ok:false,hidden:current,message:'至少需要保留一个蜂巢桌面，不能关闭最后一个'};
 return {ok:true,hidden:{...current,[id]:!visible}};
}
module.exports={normalize,setVisible};
