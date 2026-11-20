/* ===== 照片管线（#393 P3）：选择 → 解码 → 方向 → 缩放 → 重编码 → 三变体 → 上传队列 → 草稿 =====
 * 浏览器能力（解码 / 画布）全由 E 注入，纯逻辑在 Node 空沙盒里可测（tests/unit/side_photo.mjs）；真实画布见 tests/frontend/side_photo.js。
 * 一律「画布重绘再导出 JPEG」：原文件的 EXIF / GPS / 内嵌缩略图全部丢弃（服务端对含 EXIF 的文件还会再拒一次）。
 * 键名 = 客户端随机名（16–24 位 [A-Za-z0-9_-]，与 api_sb_post 键正则一致），重试是同一个 PUT，天然幂等。本文件不接界面（P4）。 */
const SB_PH={full:1600,t:960,b:48,max:3,mp:16e6,pre:4096,conc:2,tries:3,
  bytes:{full:1.5e6,t:250e3,b:4e3},steps:[.82,.7]};
const sbPhErr=(code,x)=>Object.assign(new Error(code),{code},x);
// 名字不能以 -t / -b 结尾（会和别张图的变体键 <名>-t.jpg / <名>-b.jpg 撞名，服务端同样拒收）→ 以它们结尾就重抽
const sbPhName=()=>{const A='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';let s;
  do{const n=16+Math.floor(Math.random()*9),
    r=typeof crypto!=='undefined'&&crypto.getRandomValues?crypto.getRandomValues(new Uint8Array(n)):Array.from({length:n},()=>Math.floor(Math.random()*256));
    s=Array.from(r,v=>A[v%64]).join('')}while(/-[tb]$/.test(s));
  return s};
// 长边缩到 max（不放大）
const sbPhFit=(w,h,m)=>{const s=Math.min(1,m/Math.max(w,h));return {w:Math.max(1,Math.round(w*s)),h:Math.max(1,Math.round(h*s))}};
// 编码一个变体：质量 .82 → .7，仍超就缩小（full 缩到 1280 再 1024；t / b 同比例）。仍超 → photo_too_big
const sbPhDim=s=>({w:s.naturalWidth||s.width,h:s.naturalHeight||s.height});
const sbPhEncode=async(E,src,w,h,m,bytes)=>{
  const tries=[[m,.82],[m,.7],[Math.round(m*.8),.7],[Math.round(m*.64),.6]];let last;
  for(const[mm,q]of tries){if(last)E.free(last.cv);const d=sbPhFit(w,h,mm);last=await E.enc(src,d.w,d.h,q);if(last.blob.size<=bytes)return {...last,w:d.w,h:d.h}}
  throw sbPhErr('photo_too_big')};
// 解码：iOS 有的环境 createImageBitmap 不可用 / 失败 → 回落 <img>；超 16MP 先缩到 ≤4096 再画（iOS 画布上限）
const sbPhDecode=async(file,E)=>{
  if(!file||!/^image\//i.test(file.type||''))throw sbPhErr('photo_not_image');
  if(!file.size)throw sbPhErr('photo_empty');
  if(/svg/i.test(file.type))throw sbPhErr('photo_not_image');
  let s;try{s=await E.bitmap(file)}catch(e){try{s=await E.img(file)}catch(e2){throw sbPhErr('photo_decode')}}
  const z=sbPhDim(s);if(z.w*z.h>SB_PH.mp){const d=sbPhFit(z.w,z.h,SB_PH.pre);let s2;try{s2=await E.bitmap(file,d)}catch(e){s2=null}
    E.free(s);if(!s2)throw sbPhErr('photo_decode');s=s2}
  return s};
// 一张图 → {name,w,h,parts:{full,t,b}}；一次只处理一张，用完即放（iOS 内存）。full → t → b 逐级由上一级缩小，不反复读大图
const sbPhRun=async(file,E)=>{
  const s=await sbPhDecode(file,E);
  try{const z=sbPhDim(s),f=await sbPhEncode(E,s,z.w,z.h,SB_PH.full,SB_PH.bytes.full);E.free(s);
    const t=await sbPhEncode(E,f.cv,f.w,f.h,SB_PH.t,SB_PH.bytes.t),b=await sbPhEncode(E,t.cv,t.w,t.h,SB_PH.b,SB_PH.bytes.b);
    const out={name:sbPhName(),w:f.w,h:f.h,parts:{full:f.blob,t:t.blob,b:b.blob}};[f,t,b].forEach(x=>E.free(x.cv));return out}
  catch(e){E.free(s);throw e}};
// 选了一批文件：最多 3 张（已有的算在内），多的忽略并告诉调用方
const sbPhPick=(files,have)=>{const room=Math.max(0,SB_PH.max-have),a=Array.from(files||[]);return {take:a.slice(0,room),skip:Math.max(0,a.length-room)}};
// ---- 上传队列：并发 2 张；网络断 / 5xx / 429 指数退避重试 3 次（遵守 Retry-After）；4xx 业务错不重试；可取消 / 单张重试 ----
// o.put(name,variant,blob,signal) → {status,code?,retryAfter?}（抛错 = 网络断）；o.sleep(ms,signal) 可注入；o.on(item) 进度回调
const sbPhQueue=o=>{const items=[],sleep=o.sleep||((ms,sg)=>new Promise(r=>{const h=setTimeout(r,ms);sg&&sg.addEventListener('abort',()=>{clearTimeout(h);r()})})),emit=it=>{o.on&&o.on(it)};let run=0;
  const one=async it=>{it.st='up';it.ac=new AbortController();emit(it);const V=['b','t','full'];
    for(let v=it.done||0;v<V.length;v++){let n=0;
      for(;;){let r;try{r=await o.put(it.name,V[v],it.parts[V[v]],it.ac.signal)}catch(e){r=it.ac.signal.aborted?{status:-1}:{status:0}}
        if(it.ac.signal.aborted)return;
        if(r.status>=200&&r.status<300)break;
        const retry=r.status===0||r.status===429||r.status>=500;
        if(!retry||n>=SB_PH.tries){it.st='fail';it.code=r.code||(r.status===0?'photo_net':'photo_upload');emit(it);return}
        await sleep(r.retryAfter?r.retryAfter*1e3:Math.min(500*2**n,8e3),it.ac.signal);n++;if(it.ac.signal.aborted)return}
      it.done=v+1;it.p=it.done/V.length;emit(it)}
    it.st='ok';emit(it)};
  const pump=()=>{while(run<SB_PH.conc){const it=items.find(x=>x.st==='wait');if(!it)return;it.st='up';run++;one(it).finally(()=>{run--;pump()})}};
  return {items,
    add(name,parts){const it={name,parts,st:'wait',done:0,p:0};items.push(it);emit(it);pump();return it},
    cancel(name){const i=items.findIndex(x=>x.name===name);if(i<0)return;const it=items[i];it.ac&&it.ac.abort();items.splice(i,1)},   // 取消 = 移除，不再重试
    retry(name){const it=items.find(x=>x.name===name&&x.st==='fail');if(it){it.st='wait';it.code='';pump()}},                   // 单张重试：从失败的那个变体接着传
    pending:()=>items.filter(x=>x.st!=='ok').length}};
// 队列的 o.put 适配：变体 full → f，PUT 原始 JPEG 字节到 /api/sideline/photos/<名>-<f|t|b>（路径不带用户 id = 取登录人）。
//   net = NBQ_NET；成功 {status}；失败 {status, code, retryAfter}（status 0 = 断网 / 超时，队列会重试；401 / 4xx 业务错不重试）。每个文件最多 60 秒（弱网下 1.5MB 比普通请求慢）
const sbPhPutMake=net=>async(name,v,blob,signal)=>{const r=await net.putRaw('/api/sideline/photos/'+name+'-'+(v==='full'?'f':v),blob,{signal,timeout:60000});
  return r.ok?{status:r.status}:{status:r.status,code:r.code,retryAfter:r.retry_after}};
// ---- 草稿：上传会话（已传成功的键 + 文字 + 色调等）每步写本机；换账号 / 超过 24 小时作废（微信、iOS 会杀后台页）----
const SB_DRAFT_KEY='nbq_sb_draft';
const sbPhDraftGet=uid=>{const d=sbLS(SB_DRAFT_KEY);if(!d)return null;if(!uid||d.u!==uid||!(Date.now()-d.at<864e5)){sbLS(SB_DRAFT_KEY,null);return null}return d};
const sbPhDraftSet=(uid,d)=>{if(uid)sbLS(SB_DRAFT_KEY,{...d,u:uid,at:Date.now()})};
const sbPhDraftClear=()=>sbLS(SB_DRAFT_KEY,null);
// 发布页 C → 草稿内容：只收已传成功且带缩略图的图（键 + 宽高 + 小图 data URL）；文字 / 图都没有 = null（调用方据此清草稿）。判断覆盖 text 与 ups（旧演示图 pics 不进真实草稿）
const sbPhDraftOf=C=>{const ups=((C&&C.ups)||[]).filter(u=>u.st==='ok'&&u.name&&u.th).slice(0,3).map(u=>({name:u.name,w:u.w,h:u.h,th:u.th})),text=(C&&C.text)||'';
  return !text.trim()&&!ups.length?null:{text,tone:C.tone||'',topic:C.topic||null,loc:C.loc||null,ups}};
// 小图 → data URL（草稿恢复时直接当缩略图用，不依赖网络）
const sbPhThumb=b=>new Promise(ok=>{try{const r=new FileReader();r.onload=()=>ok(String(r.result||''));r.onerror=()=>ok('');r.readAsDataURL(b)}catch(e){ok('')}});
// 剥掉画布导出的 JPEG 里的元数据段：iOS 的画布编码器会自带 APP1（EXIF：尺寸 / 色彩）和 APP2（ICC，常有 0.5–3KB，会把 4KB 的极小图撑爆），
//   服务端对任何 APP1 都拒（photo_exif，二道防线），所以导出后必须在客户端剥干净：留 APP0 与图像数据，丢 APP1–APP15 和注释。只处理到 SOS 之前的段，之后的图像数据原样拷贝。
const sbPhStrip=u=>{if(u.length<4||u[0]!==0xFF||u[1]!==0xD8)return u;const out=[u.subarray(0,2)];let i=2;
  while(i+4<=u.length){if(u[i]!==0xFF)return u;const m=u[i+1];if(m===0xFF){i++;continue}
    if(m===0xDA||m===0xD9){out.push(u.subarray(i));break}
    const L=(u[i+2]<<8)|u[i+3];if(L<2||i+2+L>u.length)return u;
    if(!((m>=0xE1&&m<=0xEF)||m===0xFE))out.push(u.subarray(i,i+2+L));i+=2+L}
  const n=out.reduce((a,x)=>a+x.length,0),r=new Uint8Array(n);let o=0;for(const x of out){r.set(x,o);o+=x.length}return r};
// ---- 浏览器环境（真实画布）：iOS 画布有像素上限，用完立刻释放（宽高置 0）----
const sbPhEnv=()=>({
  bitmap:(f,d)=>createImageBitmap(f,Object.assign({imageOrientation:'from-image'},d?{resizeWidth:d.w,resizeHeight:d.h,resizeQuality:'high'}:{})),
  img:f=>new Promise((ok,no)=>{const u=URL.createObjectURL(f),i=new Image();i.onload=()=>{URL.revokeObjectURL(u);ok(i)};i.onerror=()=>{URL.revokeObjectURL(u);no(new Error('img'))};i.src=u}),
  enc:(src,w,h,q)=>new Promise((ok,no)=>{const cv=document.createElement('canvas');cv.width=w;cv.height=h;const c=cv.getContext('2d');
    c.fillStyle='#fff';c.fillRect(0,0,w,h);c.imageSmoothingQuality='high';c.drawImage(src,0,0,w,h);   // 先铺白底：透明 PNG 不变黑
    cv.toBlob(async b=>{if(!b)return no(sbPhErr('photo_decode'));
      try{ok({blob:new Blob([sbPhStrip(new Uint8Array(await b.arrayBuffer()))],{type:'image/jpeg'}),cv})}catch(e){no(sbPhErr('photo_decode'))}},'image/jpeg',q)}),
  free:s=>{if(!s)return;if(s.close)s.close();else if(s.getContext){s.width=0;s.height=0}}});
