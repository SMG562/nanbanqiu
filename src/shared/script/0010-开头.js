// 页面报错上报（5d）：只有错误信息和位置，不含用户内容；同一条只报一次、每页最多 20 条 → POST /api/client-errors → client_error_log()
window.NBQ_ERRS=[];(()=>{const seen=new Set(),rep=(msg,src,line)=>{const k=msg+'|'+src+'|'+line;if(seen.has(k)||seen.size>=20)return;seen.add(k);
