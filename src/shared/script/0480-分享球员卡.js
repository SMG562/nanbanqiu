async function scGo(){const uid=SC.uid,to=SC.to,text=scCopyText(uid,to),app=to==='xhs'?'小红书':'微信';
  try{navigator.clipboard&&navigator.clipboard.writeText(text).catch(()=>{})}catch(e){}const blob=SC.blob||await scBlob(uid);
  const file=blob&&new File([blob],`nanbanqiu-${fmtNo(U(uid).no)}.png`,{type:'image/png'});
  if(file&&navigator.canShare&&navigator.canShare({files:[file]})){navigator.share({files:[file],text}).catch(()=>{});return}
  if(blob){scDownload(blob,uid);toast(`图片已保存，文案已复制 · 打开${app}发布即可`)}else toast(typeof ENV!=='undefined'&&ENV==='wechat'?'长按上面的图片保存，文案已复制':'文案已复制，截图即可分享')}
document.addEventListener('click',e=>{const b=e.target.closest('[data-sc]');if(!b)return;e.stopPropagation();const a=b.dataset.sc;
  if(a==='to'){SC.to=b.dataset.v;scRender()}
  else if(a==='go')scGo();
  else if(a==='save'){(SC.blob?Promise.resolve(SC.blob):scBlob(SC.uid)).then(bl=>{if(bl){scDownload(bl,SC.uid);toast('图片已保存')}else toast('保存失败，请截图保存')})}
  else if(a==='link')copy(profileUrl(U(SC.uid),'link'),'球员卡链接已复制，可以发给朋友')},true);
