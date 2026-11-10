/* ===================== 分享球员卡：先分享，后保存 =====================
 * 打开就预览朋友圈 / 小红书里的样子；主按钮一键分享（系统分享面板带图片 + 文案），文案自动复制
 * 不支持带图分享的环境（电脑、微信内）：自动保存图片 + 复制文案，提示去 App 里发布
 */
var SC={uid:null,to:'moments',blob:null};
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
  // 依次试 ① 原样 3 倍 ② 2 倍 ③ 去掉 SVG 滤镜 / 遮罩 ④ 再去掉头像里所有 SVG（只剩底色）；成功就停，全失败把原因留在 SC_ERR
  const strip=lv=>doc=>{doc.querySelectorAll('[filter],[mask]').forEach(e=>{e.removeAttribute('filter');e.removeAttribute('mask')});doc.querySelectorAll('filter,mask').forEach(e=>e.remove());
    if(lv>=2)doc.querySelectorAll('.pc-av svg').forEach(e=>e.remove())};
  const plan=[[3,0],[2,0],[2,1],[2,2]];
  const go=n=>{const [k,lv]=plan[n];return html2canvas(tmp.firstElementChild,{backgroundColor:null,scale:k,onclone:lv?strip(lv):undefined}).then(cv=>new Promise((ok,no)=>cv.toBlob(b=>b?ok(b):no(new Error('画布转图片失败')),'image/png')))
    .catch(e=>{SC_ERR=String(e&&e.message||e).slice(0,40);if(n<plan.length-1)return go(n+1);throw e})};
  go(0).then(b=>{tmp.remove();res(b)}).catch(()=>{tmp.remove();res(null)})})}
// 保存图片：能用系统分享就用（iOS 分享面板里选「存储图像」进相册）；不行（或点开太慢分享被拒）就弹出大图，长按保存。不用 <a download>：iOS 里它进的是「文件」不是相册，主屏幕版还会把页面带走
function imgSave(blob,name){
  const file=blob&&new File([blob],name,{type:'image/png'});
  const big=()=>{const old=document.getElementById('imgSaveBox');if(old)old.remove();const u=URL.createObjectURL(blob),d=document.createElement('div');d.id='imgSaveBox';
    d.style.cssText='position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.88);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;gap:14px';
    d.innerHTML='<img alt="" style="max-width:100%;max-height:78vh;border-radius:10px;-webkit-touch-callout:default;-webkit-user-select:auto;user-select:auto"><p style="margin:0;color:#fff;font-size:14px">长按图片，选「存储到相册」</p><button style="height:40px;padding:0 28px;border:0;border-radius:20px;background:#fff;color:#101828;font-size:15px">关闭</button>';
    d.querySelector('img').src=u;const close=()=>{d.remove();URL.revokeObjectURL(u)};d.querySelector('button').onclick=close;d.addEventListener('click',e=>{if(e.target===d)close()});document.body.appendChild(d)};
  if(file&&navigator.canShare&&navigator.canShare({files:[file]})){navigator.share({files:[file]}).catch(e=>{if(!e||e.name!=='AbortError')big()});return}
  big()}
function scDownload(blob,uid){imgSave(blob,`nanbanqiu-${fmtNo(U(uid).no)}.png`)}
