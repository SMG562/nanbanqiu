/* ===================== 分享球员卡：图片没生成好之前不去调系统分享 =====================
 * 系统分享必须在点击的同一刻发起；先等图片生成再分享，手机上会被浏览器拦下（看起来没反应）。
 * 所以打开面板就开始生成，生成好之前按钮显示「正在生成分享图…」；分享失败（非用户取消）自动改为保存图片 + 复制文案。 */
function scBtn(){const b=document.querySelector('#scBox [data-sc="go"]');if(!b)return;const lab=SC.to==='xhs'?'发到小红书':'分享到朋友圈';
  if(SC.blob===null&&SC.busy){b.disabled=true;b.classList.add('busy');b.innerHTML='正在生成分享图…'}else{b.disabled=false;b.classList.remove('busy');b.innerHTML=`<svg><use href="#i-share"/></svg>${lab}`}}
function scBlobT(uid){return Promise.race([scBlob(uid),new Promise(r=>setTimeout(()=>r(null),8000))])}
saveCard=function(uid){SC.uid=uid;SC.blob=null;SC.busy=true;SHARE_OPEN(shareCardHTML(uid));scBtn();
  scBlobT(uid).then(b=>{if(SC.uid!==uid)return;SC.blob=b;SC.busy=false;scBtn()})};
const _scRender=scRender;scRender=function(){_scRender();scBtn()};
scGo=function(){const uid=SC.uid,to=SC.to,text=scCopyText(uid,to),app=to==='xhs'?'小红书':'微信',blob=SC.blob;
  try{navigator.clipboard&&navigator.clipboard.writeText(text).catch(()=>{})}catch(e){}
  const fallback=()=>{if(blob){scDownload(blob,uid);toast(`图片已保存，文案已复制 · 打开${app}发布即可`)}else toast(typeof ENV!=='undefined'&&ENV==='wechat'?'长按上面的图片保存，文案已复制':'文案已复制，截图即可分享')};
  const file=blob&&new File([blob],`nanbanqiu-${fmtNo(U(uid).no)}.png`,{type:'image/png'});
  if(file&&navigator.canShare&&navigator.canShare({files:[file]})){try{navigator.share({files:[file],text}).catch(err=>{if(!err||err.name!=='AbortError')fallback()})}catch(err){fallback()}return}
  fallback()};

