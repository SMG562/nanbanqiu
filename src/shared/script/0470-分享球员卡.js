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
function scBlob(uid){return new Promise(res=>{if(!window.html2canvas)return res(null);
  const tmp=document.createElement('div');tmp.style.cssText='position:fixed;left:-9999px;top:0';tmp.innerHTML=shareShot(uid);document.body.appendChild(tmp);
  html2canvas(tmp.firstElementChild,{backgroundColor:null,scale:3}).then(cv=>cv.toBlob(b=>{tmp.remove();res(b)},'image/png')).catch(()=>{tmp.remove();res(null)})})}
function scDownload(blob,uid){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`nanbanqiu-${fmtNo(U(uid).no)}.png`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),4000)}
