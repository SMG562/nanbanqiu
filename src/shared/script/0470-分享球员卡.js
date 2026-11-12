/* ===================== 分享球员卡：先分享，后保存 =====================
 * 打开就预览朋友圈 / 小红书里的样子；主按钮一键分享（系统分享面板带图片 + 文案），文案自动复制
 * 不支持带图分享的环境（电脑、微信内）：自动保存图片 + 复制文案，提示去 App 里发布
 */
var SC={uid:null,to:'moments',blob:null};
// 地图瓦片偶发加载失败（限流 / 网络抖动）会留下灰块：失败的瓦片自动重试 3 次（间隔递增）；失败次数记在 window.TILE_ERR 方便排查
function tileRetry(l){l.on('tileerror',e=>{const t=e.tile;window.TILE_ERR=(window.TILE_ERR||0)+1;t._rt=(t._rt||0)+1;if(t._rt<=3){const u=(t._u0=t._u0||t.src);setTimeout(()=>{t.src=u+(u.includes('?')?'&':'?')+'_r='+t._rt},700*t._rt)}})}
function scMini(uid,w){const k=w/640;return `<div class="sc-img" style="width:${w}px;height:${Math.round(520*k)}px"><div style="transform:scale(${k});transform-origin:0 0">${shareShot(uid)}</div></div>`}
function scText(uid,to){const u=U(uid),s=stats(uid),home=(u.home_club_ids||[])[0]||s.topClub,club=home?VEN[home].short:'';
  return to==='xhs'?{title:`${CITY.zh}找球友｜UTR ${f1(u.ntrp)}${club?' · '+club:''} 🎾`,body:`在南伴球打了 ${s.played} 场，欢迎扫图上的二维码约我打球～\n#${CITY.tag} #${CITY.zh}约球 #网球搭子 #南伴球`}
    :{body:`在南伴球打了 ${s.played} 场球 🎾 UTR ${f1(u.ntrp)}${club?' · '+club:''}，扫码约我打球`}}
const scCopyText=(uid,to)=>{const t=scText(uid,to);return to==='xhs'?t.title+'\n'+t.body:t.body};
function scPrevHTML(uid,to){const u=U(uid),t=scText(uid,to);
  if(to==='xhs')return `<div class="sc-xhs">${scMini(uid,208)}<div class="sc-xt">${esc(t.title)}</div><div class="sc-xu">${av(u,'sm')}<span>${esc(u.name.split(' ')[0])}</span><i>♡ 0</i></div></div>`;
  return `<div class="sc-mo">${av(u)}<div class="sc-mb"><b>${esc(u.name.split(' ')[0])}</b><p>${esc(t.body)}</p>${scMini(uid,172)}<small>刚刚</small></div></div>`}
function shareCardHTML(uid){const to=SC.to,lab=to==='xhs'?'发到小红书':'分享到朋友圈';
  return `<div class="sc" id="scBox"><div class="sc-h"><b>分享球员卡</b></div>
    <div class="sc-seg"><button class="${to==='moments'?'on':''}" data-sc="to" data-v="moments">朋友圈</button><button class="${to==='xhs'?'on':''}" data-sc="to" data-v="xhs">小红书</button></div>
    <div class="sc-pv">${scPrevHTML(uid,to)}</div>
    <button class="btn btn-p sc-go" data-sc="go"><svg><use href="#i-share"/></svg>${lab}</button>
    <div class="sc-sub"><button data-sc="save"><svg><use href="#i-dl"/></svg>保存图片</button><span></span><button data-sc="link"><svg><use href="#i-link"/></svg>复制链接</button></div>
    <p class="sc-fine">文案会自动复制，发布时粘贴即可</p></div>`}
function scRender(){const b=document.getElementById('scBox');if(b)b.outerHTML=shareCardHTML(SC.uid)}
function scBlob(uid){return new Promise(res=>{window.SC_ERR='';if(!window.html2canvas){SC_ERR='截图库没加载';return res(null)}
  const tmp=document.createElement('div');tmp.style.cssText='position:fixed;left:-9999px;top:0';tmp.innerHTML=shareShot(uid);document.body.appendChild(tmp);
  // 手机上画布太大 / 内存不够会失败：3 倍清晰度不行就降到 2、1 倍再试；仍失败把原因留在 SC_ERR（提示里带出来，方便定位）
  // iPhone Safari 会因为头像里的 SVG 滤镜把画布判成「不安全」(The operation is insecure)，导出就失败：
  // 依次试 ① 原样 3 倍 ② 2 倍 ③ 把 SVG 逐个先画成位图换进去（印章 / 动物保留；画不出来才去滤镜，再不行头像换首字母）；成功就停，全失败把原因留在 SC_ERR
  // iPhone Safari 会因为球员卡里的 SVG（头像滤镜、二维码、纹理）把画布判成「不安全」(The operation is insecure)，导出失败；
  // 而放行的 SVG 又会被画成空白。所以 3 倍、2 倍原样试过之后，直接走「无 SVG」版：二维码用画布画成 PNG 换进去（先载入再截图），头像换成底色圆 + 首字母
  const qrPng=col=>qrDataUrl(profileUrl(U(uid),typeof SC!=='undefined'&&SC.to==='xhs'?'xhs':'moments'),col);
  const plain=()=>new Promise(ok=>{const q=tmp.querySelector('.bk .q');if(!q)return ok();const im=new Image();im.style.cssText='display:block;width:100%;height:100%';
    im.onload=im.onerror=()=>ok();im.src=qrPng(getComputedStyle(q).color);q.innerHTML='';q.appendChild(im)});
  const noSvg=doc=>{doc.querySelectorAll('.pc-grain,.pc-light').forEach(e=>e.style.backgroundImage='none');const u=U(uid);
    return nbqSvgsToPng(doc,e=>{const av=e.closest('.pc-av');if(av&&!av.querySelector('.pc-ini')){const d=doc.createElement('div');d.className='pc-ini';d.textContent=(String(u.name||'?').trim()[0]||'?').toUpperCase();
      d.style.cssText=`width:100%;height:100%;border-radius:50%;background:${u.color||'#EFE9DA'};display:flex;align-items:center;justify-content:center;font:800 44px system-ui;color:#1D5B43`;av.appendChild(d)}})};
  const plan=[[3,0],[2,0],[2,1]];
  const go=n=>{const [k,lv]=plan[n];return (lv?plain():Promise.resolve()).then(()=>html2canvas(tmp.firstElementChild,{backgroundColor:null,scale:k,onclone:lv?noSvg:undefined})).then(cv=>new Promise((ok,no)=>cv.toBlob(b=>b?ok(b):no(new Error('画布转图片失败')),'image/png')))
    .catch(e=>{SC_ERR=String(e&&e.message||e).slice(0,40);if(n<plan.length-1)return go(n+1);throw e})};
  go(0).then(b=>{tmp.remove();res(b)}).catch(()=>{tmp.remove();res(null)})})}
// 保存图片：能用系统分享就用（iOS 分享面板里选「存储图像」进相册）；不行（或点开太慢分享被拒）就弹出大图，长按保存。不用 <a download>：iOS 里它进的是「文件」不是相册，主屏幕版还会把页面带走
function imgSave(blob,name){
  const file=blob&&new File([blob],name,{type:'image/png'});
  const big=()=>{const old=document.getElementById('imgSaveBox');if(old)old.remove();const u=URL.createObjectURL(blob),d=document.createElement('div');d.id='imgSaveBox';
    d.style.cssText='position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.88);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;gap:14px';
    d.innerHTML='<img alt="" style="max-width:100%;max-height:78vh;border-radius:10px;-webkit-touch-callout:default;-webkit-user-select:auto;user-select:auto"><p style="margin:0;color:#fff;font-size:14px"></p><button style="height:40px;padding:0 28px;border:0;border-radius:20px;background:#fff;color:#101828;font-size:15px">关闭</button>';
    d.querySelector('p').textContent=(window.matchMedia&&matchMedia('(pointer:coarse)').matches)?'长按图片，选「存储到相册」':'右键图片，选「图片另存为」';   // 触屏才说长按；电脑是右键（#206）
    d.querySelector('img').src=u;const close=()=>{d.remove();URL.revokeObjectURL(u)};d.querySelector('button').onclick=close;d.addEventListener('click',e=>{if(e.target===d)close()});document.body.appendChild(d)};
  if(file&&navigator.canShare&&navigator.canShare({files:[file]})){navigator.share({files:[file]}).then(()=>{if(typeof toast==='function')toast('图像已保存')},e=>{if(!e||e.name!=='AbortError')big()});return}   // 分享面板走完才提示（之前没有任何提示）；取消不提示
  big()}
function scDownload(blob,uid){imgSave(blob,`nanbanqiu-${fmtNo(U(uid).no)}.png`)}
// 二维码画成 PNG 的 data 地址（iPhone Safari 会把页面里的 SVG 判成「不安全」，而放行的 SVG 又会被画成空白——所以降级到最后一级时二维码不能留 SVG）。scBlob 和 nbqShot 共用。
function qrDataUrl(text,col){const a=qrMatrix(text),n=a.length,k=12,pad=k/2,c=document.createElement('canvas');c.width=c.height=(n+1)*k;const x=c.getContext('2d');x.fillStyle=x.strokeStyle=col||'#fff';
    const box=(i,j,w,r,f)=>{x.beginPath();x.roundRect?x.roundRect(pad+i*k,pad+j*k,w*k,w*k,r*k):x.rect(pad+i*k,pad+j*k,w*k,w*k);f?x.fill():x.stroke()};
    for(let j=0;j<n;j++)for(let i=0;i<n;i++)if(a[j][i]&&!((i<7&&j<7)||(i>=n-7&&j<7)||(i<7&&j>=n-7))){x.beginPath();x.arc(pad+(i+.5)*k,pad+(j+.5)*k,.42*k,0,7);x.fill()}
    x.lineWidth=k;[[0,0],[n-7,0],[0,n-7]].forEach(([i,j])=>{box(i+.5,j+.5,6,1.8,0);box(i+2,j+2,3,.9,1)});return c.toDataURL('image/png')}
// 把页面里一块元素截成 PNG（海报 / 球员卡共用，11-11 #161 第 4 项）：手机上内存不够、或 iPhone Safari 判「不安全」(The operation is insecure) 时逐级降级，
//   ① 原样 scale 倍 ② 1 倍 ③ 在克隆里去掉全部 SVG（二维码按 data-qr 换成 PNG、纹理背景去掉）再截，倍数取 min(scale,2)；成功就停，全失败返回 null（原因留在 SC_ERR）。不改原页面（只改 html2canvas 的克隆）。
//   第 ③ 级和 scBlob 的「无 SVG」版同思路（协作者交叉复核 11-11：只去滤镜、二维码 SVG 还在，大概率仍然 insecure）。需要二维码的元素带 data-qr="<链接>"（海报 .t-qr）。
// 克隆里的 SVG 不直接交给 html2canvas（iPhone Safari 会判「不安全」或画成空白）：自己先画成位图再换进去。
// ① 整枚原样（带滤镜纹理，用户选的印章和动物都在）→ ② 去掉滤镜 / 遮罩再试 → ③ 都画不出（被判不安全 / 全透明）才退化：有 letter 回调的（头像）换首字母，其余移除。
function nbqSvgPng(doc,s,flat){return new Promise(ok=>{try{
  const vb=(s.getAttribute('viewBox')||'').trim().split(/[\s,]+/).map(Number),r=s.getBoundingClientRect?s.getBoundingClientRect():{},
    w=Math.round(r.width||+s.getAttribute('width')||vb[2]||0),h=Math.round(r.height||+s.getAttribute('height')||vb[3]||0);
  if(!(w>0&&h>0))return ok(null);
  const c=s.cloneNode(true),col=((doc.defaultView||window).getComputedStyle(s).color)||'';
  c.setAttribute('xmlns','http://www.w3.org/2000/svg');c.setAttribute('width',w);c.setAttribute('height',h);if(!c.getAttribute('viewBox'))c.setAttribute('viewBox',`0 0 ${w} ${h}`);
  c.style.width=w+'px';c.style.height=h+'px';if(col)c.style.color=col;c.style.filter='';   // currentColor 单独成图后会变黑：把页面里算出来的颜色写进去
  if(flat){c.querySelectorAll('filter,mask').forEach(e=>e.remove());c.querySelectorAll('[filter],[mask]').forEach(e=>{e.removeAttribute('filter');e.removeAttribute('mask')})}
  const img=new Image(),k=2;
  img.onload=()=>{try{const cv=document.createElement('canvas');cv.width=w*k;cv.height=h*k;const x=cv.getContext('2d');x.drawImage(img,0,0,cv.width,cv.height);
    const d=x.getImageData(0,0,cv.width,cv.height).data;let n=0;for(let i=3;i<d.length&&n<=30;i+=4)if(d[i]>8)n++;   // 全透明 = Safari 放行但画成空白，当失败
    ok(n>30?{u:cv.toDataURL('image/png'),w,h}:null)}catch(e){ok(null)}};   // getImageData / toDataURL 抛错 = 被判不安全
  img.onerror=()=>ok(null);setTimeout(()=>ok(null),1500);
  img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(new XMLSerializer().serializeToString(c))}catch(e){ok(null)}})}
function nbqSvgsToPng(doc,letter){return Promise.all([...doc.querySelectorAll('svg')].map(s=>{
  if(s.parentNode&&s.parentNode.closest&&s.parentNode.closest('svg'))return null;   // 只处理最外层 SVG
  return nbqSvgPng(doc,s,0).then(r=>r||nbqSvgPng(doc,s,1)).then(r=>{
    if(r){const im=doc.createElement('img');im.className=s.getAttribute('class')||'';im.style.cssText=(s.getAttribute('style')||'')+`;display:block;width:${r.w}px;height:${r.h}px`;im.src=r.u;s.replaceWith(im);return new Promise(ok=>{im.onload=im.onerror=()=>ok();setTimeout(ok,1500)})}
    if(letter)letter(s);s.remove()})}))}
function nbqShotPlan(scale){const k=scale||2;return [[k,0],[1,0],[Math.min(k,2),1]]}
function nbqShotClean(doc){doc.querySelectorAll('[data-qr]').forEach(q=>{const t=q.getAttribute('data-qr');if(!t)return;const im=doc.createElement('img');im.style.cssText='display:block;width:100%;height:100%';
    const done=new Promise(ok=>{im.onload=im.onerror=()=>ok();setTimeout(ok,1500)});   // 图片等不到就不等了：最多多等 1.5 秒，不让保存流程挂住
    try{im.src=qrDataUrl(t,getComputedStyle(q).color||'#101828')}catch(e){}q.innerHTML='';q.appendChild(im);(doc.__qrWait=doc.__qrWait||[]).push(done)});
  doc.querySelectorAll('.pc-grain,.pc-light,[class*=grain]').forEach(e=>e.style.backgroundImage='none');
  (doc.__qrWait=doc.__qrWait||[]).push(nbqSvgsToPng(doc));
  return Promise.all(doc.__qrWait)}
function nbqShot(el,scale){window.SC_ERR='';if(!el||!window.html2canvas){SC_ERR='截图库没加载';return Promise.resolve(null)}
  const plan=nbqShotPlan(scale),go=n=>{const [k,clean]=plan[n];
    return Promise.resolve().then(()=>html2canvas(el,{backgroundColor:null,scale:k,onclone:clean?nbqShotClean:undefined})).then(cv=>new Promise((ok,no)=>cv.toBlob(b=>b?ok(b):no(new Error('画布转图片失败')),'image/png')))
      .catch(e=>{SC_ERR=String(e&&e.message||e).slice(0,40);if(n<plan.length-1)return go(n+1);throw e})};
  return go(0).catch(()=>null)}
