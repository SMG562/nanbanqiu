/* ===================== 徽章：获得的那一刻 =====================
 * 规则清楚、获得后永久保留：
 *   · 条件达成的那一刻记下获得时间（BDG[uid][code].at）；之后即使球局被取消、数字回落，徽章也不会收回
 *   · 连续周：按真实球局计算（以周一为一周开始；本周还没打不算中断，从上周往前数）
 * 让人感知到、觉得荣誉：
 *   · 获得时：一条通知「获得新徽章「十场」」（22:00–08:00 顺延到早上）；下次打开时自动展示一次获得动画；
 *     赛后卡片顶部也会出现「解锁新徽章」；每枚徽章只庆祝一次
 *   · 展示：大号徽章、获得日期、多少球友拥有、离下一枚还差多少
 *   · 分享：一键生成分享图（朋友圈 / 小红书），附一段可以直接复制的文案
 * 徽章墙上的任何一枚都可以点开：已获得的看日期并分享；没获得的看还差多少；别人的只看名称和获得日期。 */
var BDG={},BDG_T=0,BDG_SHOWN=new Set();
const BDG_UNIT={first:'场',ten:'场',fifty:'场',hundred:'场',host10:'场',night:'场',early:'场',surface:'种场地',explorer:'个 Club',streak:'周',kudos:'次好评',partner:'场'};
const BDG_CHAIN=[['first','ten','fifty','hundred']];
// 连续周（真实球局）
function bdgStreak(uid){const W=7*864e5,mon=t=>{const d=new Date(t);d.setHours(0,0,0,0);d.setDate(d.getDate()-((d.getDay()+6)%7));return +d};
  const wk=new Set(GAMES.filter(g=>g.status!=='cancelled'&&rcEnd(g)<=Date.now()&&PARTS.some(p=>p.game_id===g.id&&p.user_id===uid&&p.status==='approved')).map(g=>mon(new Date(g.starts_at))));
  let w=mon(Date.now());if(!wk.has(w))w=mon(w-W+36e5);let n=0;while(wk.has(w)){n++;w=mon(w-W+36e5)}return n}
const _bdgStats=stats;stats=function(uid){const s=_bdgStats(uid);s.streak=Math.max(s.streak||0,bdgStreak(uid));const rec=BDG[uid]||{};
  s.badges=BADGES.map(b=>{const v=b[5](s),cur=v>=b[4],r=rec[b[0]];return {code:b[0],name:b[1],desc:b[2],icon:b[3],glyph:bdgHex(b[3],cur||!!r),mini:bdgMini(b[3]),target:b[4],val:Math.min(b[4],v),cur,got:cur||!!r,at:r&&r.at||null}});return s};
// 第一次运行（以及重置演示数据）：已经达到的都算「早就获得」，不补发庆祝
function bdgInit(){BDG={};BDG_SHOWN=new Set();Object.keys(USERS).forEach(uid=>{const s=stats(uid);BDG[uid]={};s.badges.filter(b=>b.cur).forEach(b=>BDG[uid][b.code]={at:null,seen:true})})}
function bdgCheck(force){const now=Date.now();if(!force&&now-BDG_T<2000)return;BDG_T=now;
  Object.keys(USERS).forEach(uid=>{const s=stats(uid),r=BDG[uid]=BDG[uid]||{};
    s.badges.filter(b=>b.cur&&!r[b.code]).forEach(b=>{r[b.code]={at:now,seen:false};rcQueue(uid,'badge',null,b.code,now)})})}
function bdgNotify(uid,code){const b=BADGES.find(x=>x[0]===code);if(!b)return;const n={id:++NID,user_id:uid,kind:'badge',game_id:null,from:uid,badge:code,at:Date.now(),read:false};NOTIFS.unshift(n);
  nrDeliver(n)}
const bdgPending=()=>ME?Object.entries(BDG[ME.id]||{}).filter(([c,r])=>!r.seen).map(x=>x[0]):[];
let BDG_RARE={t:0,m:{}};
// 稀有度 = 拥有的人 ÷ 打过至少 1 场的人（和后台、schema 同一口径）
function bdgRarity(code){if(Date.now()-BDG_RARE.t>6e4){const m={};let n=0;Object.keys(USERS).forEach(u=>{const s=stats(u);if(s.played<1)return;n++;s.badges.forEach(b=>{if(b.got)m[b.code]=(m[b.code]||0)+1})});BDG_RARE={t:Date.now(),m,n}}
  return Math.max(1,Math.round((BDG_RARE.m[code]||0)/Math.max(1,BDG_RARE.n)*100))}
function bdgNext(s,code){const ch=BDG_CHAIN.find(c=>c.includes(code));if(!ch)return null;const i=ch.indexOf(code);const nx=s.badges.find(b=>b.code===ch[i+1]);return nx&&!nx.got?nx:null}
const bdgDate=t=>{const d=new Date(t);return `${d.getFullYear()} 年 ${d.getMonth()+1} 月 ${d.getDate()} 日`};

// ---------- 庆祝 / 查看 ----------
function bdgShow(uid,code,mode){const s=stats(uid),b=s.badges.find(x=>x.code===code);if(!b)return;const self=!!ME&&uid===ME.id,r=(BDG[uid]||{})[code],isNew=self&&r&&!r.seen;
  if(isNew)r.seen=true;BDG_SHOWN.add(uid+'|'+code);const u=U(uid),unit=BDG_UNIT[code]||'',nx=self&&b.got?bdgNext(s,code):null,rare=bdgRarity(code);
  // 稀有度只在有意义时显示（一半以下的球友拥有）
  const meta=b.got?`${b.at?bdgDate(b.at)+' 获得':'已获得'}${rare<=50?` · 只有 ${rare}% 的球友有`:''}`:`还差 ${b.target-b.val} ${unit}${rare<=50?` · ${rare}% 的球友已经拿到`:''}`;
  const conf=isNew?`<div class="bfx-cf">${Array.from({length:14},(_,i)=>`<i style="--x:${(i*53)%100}%;--d:${(i%5)*.12}s;--r:${(i*47)%360}deg"></i>`).join('')}</div>`:'';
  bdgClose(true);document.body.insertAdjacentHTML('beforeend',`<div id="bdgFx" class="bfx${isNew?' new':''}" data-bfx="bg"><div class="bfx-c">${conf}
    ${isNew?'<div class="bfx-k">解锁新徽章</div>':self||b.got?'':'<div class="bfx-k">还没解锁</div>'}
    <div class="bfx-wrap"><div class="bfx-hx${b.got?'':' lock'}"><div class="hx">${b.glyph}</div><span class="bfx-sh"></span></div></div>
    <div class="bfx-n">${esc(b.name)}</div><div class="bfx-d">${esc(b.desc)}${self?'':` · ${esc(u.name.split(' ')[0])}`}</div>
    ${b.got?'':`<div class="bfx-pg"><i style="width:${b.val/b.target*100}%"></i></div>`}
    <div class="bfx-m">${meta}</div>
    ${nx?`<div class="bfx-nx">下一枚「${esc(nx.name)}」还差 ${nx.target-nx.val} ${BDG_UNIT[nx.code]||''}</div>`:''}
    <div class="bfx-b">${self&&b.got?`<button class="bfx-p" data-bfx="share" data-u="${uid}" data-c="${code}">分享这枚徽章</button>`:''}<button class="bfx-s" data-bfx="close">${isNew?'收下了':'关闭'}</button></div>
  </div></div>`);requestAnimationFrame(()=>{const x=document.getElementById('bdgFx');x&&x.classList.add('on')})}
function bdgClose(quick){const x=document.getElementById('bdgFx');if(!x)return;if(quick){x.remove();return}x.classList.remove('on');setTimeout(()=>{x.remove();bdgAuto()},220)}
// 下次打开（空闲时）自动庆祝一次：不打断正在进行的操作
function bdgBusy(){return !!document.querySelector('#bdgFx,#sheet.show,#mbg.show')||(typeof UI!=='undefined'&&!!UI.landing)||document.visibilityState==='hidden'}
function bdgAuto(){const p=bdgPending().filter(c=>!BDG_SHOWN.has(ME.id+'|'+c));if(!p.length||bdgBusy())return;
  clearTimeout(bdgAuto.t);bdgAuto.t=setTimeout(()=>{if(!bdgBusy()&&ME&&bdgPending().includes(p[0]))bdgShow(ME.id,p[0])},700)}
const _bdgRender=render;render=function(){const r=_bdgRender.apply(this,arguments);try{bdgCheck();if(ME)bdgAuto()}catch(e){}return r};

// ---------- 分享图 ----------
function bdgPoster(uid,code){const s=stats(uid),b=s.badges.find(x=>x.code===code),u=U(uid),W=1080,H=1440,cv=document.createElement('canvas');cv.width=W;cv.height=H;const x=cv.getContext('2d');
  const g=x.createLinearGradient(0,0,W*.4,H);g.addColorStop(0,'#22966A');g.addColorStop(.55,'#14714F');g.addColorStop(1,'#0A3B2A');x.fillStyle=g;x.fillRect(0,0,W,H);
  x.strokeStyle='rgba(255,255,255,.06)';x.lineWidth=4;x.strokeRect(90,150,900,1120);x.beginPath();x.moveTo(90,290);x.lineTo(990,290);x.stroke();
  const F='"PingFang SC","Noto Sans SC","Microsoft YaHei",system-ui,sans-serif';x.textAlign='center';
  x.fillStyle='rgba(255,255,255,.75)';x.font=`600 40px ${F}`;x.fillText('解锁徽章',W/2,250);
  const hex=(cx,cy,r)=>{x.beginPath();for(let i=0;i<6;i++){const a=Math.PI/180*(60*i-90);x[i?'lineTo':'moveTo'](cx+r*Math.cos(a),cy+r*Math.sin(a))}x.closePath()};
  x.save();x.shadowColor='rgba(0,0,0,.35)';x.shadowBlur=60;x.shadowOffsetY=24;hex(W/2,590,250);const hg=x.createLinearGradient(0,340,0,840);hg.addColorStop(0,'#2BA878');hg.addColorStop(1,'#0B3B2A');x.fillStyle=hg;x.fill();x.restore();
  hex(W/2,590,250);x.lineWidth=10;x.strokeStyle='#C6EA3D';x.stroke();
  const n=b.icon[0]==='#'?b.icon.slice(1):null;x.fillStyle='#fff';x.textBaseline='middle';
  if(n){x.font=`900 ${n.length>2?170:210}px ${F}`;x.fillText(n,W/2,600)}
  else if(b.icon==='🐦'){x.save();x.translate(W/2-140,580-140);x.scale(280/24,280/24);const bg=x.createLinearGradient(0,6,0,18);bg.addColorStop(0,'#FFE3A6');bg.addColorStop(1,'#F7A46F');x.fillStyle=bg;
    x.fill(new Path2D('M3.5 13.4c2.7-.2 4.5-1.7 5.7-3.7C10.7 7.3 12.9 6 15.4 6c2.2 0 3.9 1.3 4.5 3.1l1.6.4-1.5 1.2c-.3 4.6-4 7.8-8.7 7.8-3.3 0-6.1-1.6-7.8-5.1z'));x.strokeStyle='#D97A4E';x.lineWidth=1.3;x.lineCap='round';x.stroke(new Path2D('M8.8 14.5c1.8.5 3.5.3 5-.7'));x.fillStyle='#4B2C1E';x.beginPath();x.arc(16,9.6,.95,0,7);x.fill();x.restore()}
  else{x.font=`200px ${F}`;x.fillText(b.icon,W/2,600)}x.textBaseline='alphabetic';
  x.fillStyle='#fff';x.font=`800 96px ${F}`;x.fillText(b.name,W/2,960);
  x.fillStyle='rgba(255,255,255,.82)';x.font=`500 44px ${F}`;x.fillText(b.desc,W/2,1035);
  x.fillStyle='#C6EA3D';x.font=`600 38px ${F}`;x.fillText(`${cardName(u)} · ${b.at?bdgDate(b.at):'已获得'}`,W/2,1150);
  x.fillStyle='rgba(255,255,255,.6)';x.font=`500 32px ${F}`;if(bdgRarity(code)<=50)x.fillText(`只有 ${bdgRarity(code)}% 的球友有这枚徽章`,W/2,1205);
  x.fillStyle='rgba(255,255,255,.9)';x.font=`800 44px ${F}`;x.fillText('南伴球',W/2,1330);x.fillStyle='rgba(255,255,255,.55)';x.font=`500 28px ${F}`;x.fillText(CITY.zh+'网球约局 · nanbanqiu.app',W/2,1380);
  return cv}
const bdgText=(uid,code)=>{const b=stats(uid).badges.find(x=>x.code===code);return `在${CITY.zh}解锁了「${b.name}」徽章：${b.desc} 🎾\n#${CITY.tag} #网球搭子 #南伴球`};
function bdgShare(uid,code){const cv=bdgPoster(uid,code),url=cv.toDataURL('image/png'),c=document.querySelector('#bdgFx .bfx-c');if(!c)return;
  c.classList.add('poster');c.innerHTML=`<img class="bfx-img" src="${url}" alt="徽章分享图"><p class="bfx-tip">长按图片保存，或用下面的按钮</p>
    <div class="bfx-b"><button class="bfx-p" data-bfx="save" data-u="${uid}" data-c="${code}">保存图片</button><button class="bfx-s" data-bfx="copy" data-u="${uid}" data-c="${code}">复制文案</button><button class="bfx-l" data-bfx="close">完成</button></div>`;
  c._cv=cv}
async function bdgSave(uid,code){const c=document.querySelector('#bdgFx .bfx-c'),cv=(c&&c._cv)||bdgPoster(uid,code),name=`南伴球-${code}.png`;
  const blob=await new Promise(r=>cv.toBlob(r,'image/png'));try{const f=new File([blob],name,{type:'image/png'});if(navigator.canShare&&navigator.canShare({files:[f]})){await navigator.share({files:[f],text:bdgText(uid,code)});return}}catch(e){}
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500);toast('图片已保存')}
document.addEventListener('click',e=>{const t=e.target,b=t.closest('[data-bfx]');
  if(b){e.stopPropagation();const k=b.dataset.bfx;if(k==='bg'&&t!==b)return;
    if(k==='bg'||k==='close'){bdgClose();return}if(k==='share'){bdgShare(b.dataset.u,b.dataset.c);return}if(k==='save'){bdgSave(b.dataset.u,b.dataset.c);return}
    if(k==='copy'){const s=bdgText(b.dataset.u,b.dataset.c);(navigator.clipboard?navigator.clipboard.writeText(s):Promise.reject()).then(()=>toast('文案已复制'),()=>toast('文案已复制'));return}}
  const o=t.closest('[data-bdgc]');if(o&&ME){e.stopPropagation();const pop=document.getElementById('pop');if(pop)pop.classList.remove('show');const n=NOTIFS.find(x=>x.kind==='badge'&&x.badge===o.dataset.bdgc&&x.user_id===ME.id);if(n)n.read=true;bdgShow(ME.id,o.dataset.bdgc);return}
  const d=t.closest('[data-bdgd]');if(d){e.stopPropagation();bdgShow(d.dataset.u,d.dataset.bdgd)}},true);

// ---------- 赛后卡片 / 通知 ----------
function bdgRecapHTML(){const p=bdgPending();if(!p.length)return'';const b=stats(ME.id).badges.find(x=>x.code===p[0]);
  return `<button class="rc-bdg" data-bdgc="${b.code}"><span class="hx">${b.glyph}</span><span>解锁新徽章「${esc(b.name)}」${p.length>1?` 等 ${p.length} 枚`:''}</span><svg><use href="#i-r"/></svg></button>`}
const _bdgNtf=ntfText;ntfText=function(n){if(n.kind==='badge'){const b=BADGES.find(x=>x[0]===n.badge)||['','徽章','',''];return[`获得新徽章「${b[1]}」🏅`,`${b[2]} · 点开看看 ›`]}return _bdgNtf(n)};
if(typeof ntfOpen==='function'){const _bdgOpen=ntfOpen;ntfOpen=function(n){if(n.kind==='badge'){n.read=true;bdgShow(n.user_id,n.badge);return}return _bdgOpen(n)}}
const _bdgSeed=seed;seed=function(){const r=_bdgSeed.apply(this,arguments);bdgInit();return r};


/* ---------- 徽章图标：一套极简线性图标（同一笔画粗细、圆角端点），代替彩色 emoji ---------- */
const BDG_ICON={
 early:'M3.5 13.4c2.7-.2 4.5-1.7 5.7-3.7C10.7 7.3 12.9 6 15.4 6c2.2 0 3.9 1.3 4.5 3.1l1.6.4-1.5 1.2c-.3 4.6-4 7.8-8.7 7.8-3.3 0-6.1-1.6-7.8-5.1z M8.8 14.5c1.8.5 3.5.3 5-.7 M16 9.6h.01',
 night:'M19.5 14.8A7.8 7.8 0 0 1 9.2 4.5a7.8 7.8 0 1 0 10.3 10.3z',
 host10:'M4 10.2v3.6c0 .5.4.9.9.9h2.4l6.2 3.9V5.4L7.3 9.3H4.9c-.5 0-.9.4-.9.9z M17.2 9.2a4 4 0 0 1 0 5.6 M19.6 7a7.2 7.2 0 0 1 0 10',
 surface:'M12 4.5l8 4-8 4-8-4z M4 12.5l8 4 8-4 M4 16.5l8 4 8-4',
 explorer:'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17z M14.9 9.1l-1.6 4.2-4.2 1.6 1.6-4.2z',
 streak:'M12 3.2c.6 2.6 2.4 4.1 3.8 5.6 1.3 1.4 2.2 3 2.2 5a6 6 0 0 1-12 0c0-2.2 1.1-3.9 2.5-5 .2 1.6 1 2.7 2.2 3.2-.4-3.2.1-6.2 1.3-8.8z',
 kudos:'M12 19.6s-7.5-4.4-7.5-10.1A4.2 4.2 0 0 1 12 6.9a4.2 4.2 0 0 1 7.5 2.6c0 5.7-7.5 10.1-7.5 10.1z',
 partner:'M9.2 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10z M14.8 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10z'};
const BDG_EMO={'📣':'host10','🌙':'night','🐦':'early','🎾':'surface','🧭':'explorer','🔥':'streak','👍':'kudos','🤝':'partner'};
const bdgSvg=(icon,cls)=>{const d=BDG_ICON[BDG_EMO[icon]];return d?`<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`:`<span class="bg-e">${icon}</span>`};
// 徽章墙 / 详情 / 获得动画：彩色 emoji（有激情）；早起鸟用一只彩色的极简小鸟代替原来的黑鸟
const BDG_BIRD=`<svg class="bg-bird" viewBox="0 0 24 24"><defs><linearGradient id="bgBirdG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE3A6"/><stop offset="1" stop-color="#F7A46F"/></linearGradient></defs><path d="M3.5 13.4c2.7-.2 4.5-1.7 5.7-3.7C10.7 7.3 12.9 6 15.4 6c2.2 0 3.9 1.3 4.5 3.1l1.6.4-1.5 1.2c-.3 4.6-4 7.8-8.7 7.8-3.3 0-6.1-1.6-7.8-5.1z" fill="url(#bgBirdG)"/><path d="M8.8 14.5c1.8.5 3.5.3 5-.7" fill="none" stroke="#D97A4E" stroke-width="1.3" stroke-linecap="round"/><circle cx="16" cy="9.6" r=".95" fill="#4B2C1E"/></svg>`;
bdgHex=function(icon,got){const n=icon[0]==='#'?icon.slice(1):null;return n?`<span class="bg-n${n.length>2?' s':''}">${n}</span>`:icon==='🐦'?BDG_BIRD:`<span class="bg-e">${icon}</span>`};
// 球员卡底部的小徽章：细线六边形，和徽章墙同一个形状
bdgMini=function(icon){const n=icon[0]==='#'?icon.slice(1):null;return `<svg class="bm-b" viewBox="0 0 22 24"><polygon points="11,1.2 20.6,6.6 20.6,17.4 11,22.8 1.4,17.4 1.4,6.6"/></svg>${n?`<b class="bm-n${n.length>2?' s':''}">${n}</b>`:bdgSvg(icon,'bm-i')}`};


