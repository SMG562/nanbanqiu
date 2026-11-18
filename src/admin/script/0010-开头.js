// 页面报错上报（5d）：只有错误信息和位置，不含用户内容；同一条只报一次、每页最多 20 条 → POST /api/client-errors → client_error_log()
window.NBQ_ERRS=[];(()=>{const seen=new Set(),rep=(msg,src,line)=>{const k=msg+'|'+src+'|'+line;if(seen.has(k)||seen.size>=20)return;seen.add(k);
  const e={build:'admin',device:matchMedia('(pointer:coarse)').matches?'mobile':'desktop',msg:String(msg||'').slice(0,200),src:String(src||'').split(/[?#]/)[0].split('/').pop()||'',line:+line||0};NBQ_ERRS.push(e);
  try{if(location.protocol==='https:'&&navigator.sendBeacon)navigator.sendBeacon('/api/client-errors',JSON.stringify(e))}catch(_){}};
  addEventListener('error',ev=>{if(ev.message)rep(ev.message,ev.filename,ev.lineno)});addEventListener('unhandledrejection',ev=>rep('unhandled: '+((ev.reason&&ev.reason.message)||ev.reason),'',0))})();

// 运行模式（判定在 page 里 data-mode 一处，这里只读一次）：真模式不生成 / 不读模拟数据层（0130），要在它之前定义
const NBQ_MODE=document.documentElement.getAttribute('data-mode')==='demo'?'demo':'real';
