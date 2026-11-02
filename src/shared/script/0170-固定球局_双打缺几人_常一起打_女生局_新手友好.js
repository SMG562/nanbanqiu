/* ===================== 固定球局 · 双打缺几人 · 常一起打 · 女生局 / 新手友好 =====================
 * game_series  每周重复：只替发起人自动发布下一场（和普通球局完全一样，不带任何上一场的球友，不通知任何人，只有发起人知道它是重复的）
 * games.filled 双打「缺几人」：缺 1 → 另有 2 位已有球友，匿名占位（不需要填是谁）
 * games.tags   women 女生局：只有女生能发起、看到、报名；男生在发现页和分享链接里都看不到详情
 *              newbie 新手友好：只是一个标签，任何人都能报名
 */
var SERIES=[];
const TAGS={relax:['轻松随意','tg-a'],booked:['场地已订','tg-a'],newbie:['新手友好','tg-n'],match:['认真比赛','tg-a'],casual:['轻松拉球','tg-a'],easy:['养生局','tg-a'],newballs:['开新球','tg-a'],drill:['练球为主','tg-a'],women:['女生局','tg-w']};   // booked 只为兼容旧数据，不再出现在发起和筛选里
const TAG_MINI=['women','newbie','booked'];
const inGame=(c,uid)=>!!uid&&(c.host_id===uid||PARTS.some(p=>p.game_id===c.id&&p.user_id===uid&&['approved','pending'].includes(p.status)));
const seriesOf=c=>c&&c.series_id?SERIES.find(s=>s.id===c.series_id):null;
const isW=c=>(c.tags||[]).includes('women');
/* 能不能看女生局：女生 · 账号不在审核中 */
const womenOK=u=>!!u&&u.gender==='f'&&!u.g_flag&&!['review','banned','deleted'].includes(u.status);

/* 能否在发现页看到：女生局只给女生（已加入 / 已申请的人也能看到自己那局） */
function canSee(g){if(g.hide_done&&doneHidden(V(g)))return false;if(g.visibility==='private'&&!(ME&&PARTS.some(p=>p.game_id===g.id&&p.user_id===ME.id&&p.status==='approved')))return false;
  if(isW(g)&&!(ME&&(womenOK(ME)||inGame(g,ME.id))))return false;return true}
function tagFilter(c){if(!F.tags||!F.tags.size)return true;const ct=c.tags||[],sty=['match','relax'].filter(t=>F.tags.has(t));   // 风格类标签之间是「或」，其余是「且」
  return [...F.tags].filter(t=>!sty.includes(t)).every(t=>t==='newbie'?(ct.includes('newbie')||c.ntrp_min<=UTR_NEWBIE):ct.includes(t))&&(!sty.length||sty.some(t=>ct.includes(t))||!ct.some(t=>t==='match'||t==='relax'))}   // 节奏：没标节奏的局算「都可以」，照样出现；只排除标了相反节奏的

/* ---------- 固定球局：到期自动发布下一场（一场普通的新球局） ---------- */
function housekeep(){ufKeep();
  SERIES.filter(s=>s.active).forEach(s=>{let o=null;for(let k=0;k<7;k++)if(dayAt(k).getDay()===s.wd&&dayAt(k,s.t)>NOW){o=k;break}if(o==null)return;
    const iso=dayAt(o,s.t).toISOString();if(GAMES.some(g=>g.series_id===s.id&&g.starts_at===iso))return;
    const id='s'+(++NID);GAMES.push({id,share_code:Math.random().toString(36).slice(2,6),starts_at:iso,duration_min:s.dur,venue_id:s.venue_id,game_type:s.game_type,ntrp_min:s.ntrp_min,ntrp_max:s.ntrp_max,capacity:CAP[s.game_type],filled:s.filled||0,host_id:s.host_id,note:s.note,status:'open',tags:[...s.tags],hide_done:!!s.hide_done,series_id:s.id});
    PARTS.push({game_id:id,user_id:s.host_id,role:'host',status:'approved',message:'',created_at:Date.now()})})}
function makeSeries(gid){const g=GAMES.find(x=>x.id===gid),st=new Date(g.starts_at);
  const s={id:'S'+(++NID),host_id:g.host_id,wd:st.getDay(),t:hm(st),dur:g.duration_min,venue_id:g.venue_id,game_type:g.game_type,filled:g.filled||0,ntrp_min:g.ntrp_min,ntrp_max:g.ntrp_max,note:g.note,tags:[...(g.tags||[])],hide_done:!!g.hide_done,active:true};
  SERIES.push(s);g.series_id=s.id;return s}

/* ---------- 常一起打（只有自己看得到） ---------- */
function partnersOf(uid){const m={};
  GAMES.forEach(g=>{if(g.status==='cancelled')return;const end=+new Date(g.starts_at)+g.duration_min*6e4;if(end>+NOW||+NOW-end>180*864e5)return;
    const ps=PARTS.filter(p=>p.game_id===g.id&&p.status==='approved');if(!ps.some(p=>p.user_id===uid))return;
    ps.forEach(p=>{if(p.user_id===uid)return;const x=m[p.user_id]||(m[p.user_id]={uid:p.user_id,n:0,last:0});x.n++;x.last=Math.max(x.last,end)})});
  return Object.values(m).filter(x=>U(x.uid)&&!blockedPair(uid,x.uid)).sort((a,b)=>b.n-a.n||b.last-a.last)}
function partnersHTML(){const L=partnersOf(ME.id).filter(x=>(x.n>=2||followHas(ME.id,x.uid))&&!lessHas(ME.id,x.uid)).sort((a,b)=>followHas(ME.id,b.uid)-followHas(ME.id,a.uid)||b.n-a.n).slice(0,8);if(!L.length)return'';
  return SX_SEC('常一起打','仅你可见',`<div class="pals">${L.map(x=>{const u=U(x.uid);return `<button class="pal" data-user="${x.uid}">${av(u)}<b>${esc(u.name.split(' ')[0])}</b><small>${x.n} 场</small></button>`}).join('')}</div>`)}

/* ---------- 卡片 / 详情 ---------- */
const tagMini=c=>(c.tags||[]).filter(k=>TAG_MINI.includes(k)).map(k=>`<em class="gt ${TAGS[k][1]}">${TAGS[k][0]}</em>`).join('');
function gxHTML(c){const rows=[];
  if(isW(c))rows.push(`<div class="gx"><span class="gxi tg-w">♀</span><span><b>女生局</b><small>只有女生能看到和报名</small></span></div>`);
  if((c.tags||[]).includes('newbie'))rows.push(`<div class="gx"><span class="gxi tg-n">🌱</span><span><b>新手友好</b><small>节奏轻松，不计较失误，第一次来也没关系</small></span></div>`);
  const s=seriesOf(c);if(s&&c.isHost&&s.active)rows.push(`<div class="gx"><span class="gxi tg-a">↻</span><span><b>每${WD[s.wd]} ${s.t} 自动发布</b><small>此设置仅你可见，球友看到的是普通球局</small></span></div>`);
  const other=(c.tags||[]).filter(k=>!['women','newbie'].includes(k)&&TAGS[k]);
  return rows.length||other.length?`<div class="gxs">${other.length?`<div class="gtags">${other.map(k=>`<em>${TAGS[k][0]}</em>`).join('')}</div>`:''}${rows.join('')}</div>`:''}
const ANON_SVG='<svg viewBox="0 0 24 24"><circle cx="12" cy="9" r="4"/><path d="M4.5 21c1-4.2 4-6.3 7.5-6.3s6.5 2.1 7.5 6.3"/></svg>';
function seatsHTML(c,st){
  const person=(u,p)=>`<button class="person" data-user="${u.id}" title="查看球员卡"><span class="av st">${avStamp(u,48)}${p.role==='host'?'<span class="host">发起</span>':''}</span><span class="nm">${ME&&u.id===ME.id?'我':esc(u.name.split(' ')[0])}</span><span class="lv">UTR ${f1(u.ntrp)}</span></button>`;
  let h=c.appr.map(p=>person(U(p.user_id),p)).join('');
  h+=Array.from({length:c.filled||0},()=>`<div class="person anon"><span class="av ph anon">${ANON_SVG}</span><span class="nm">球友</span><span class="lv">已有</span></div>`).join('');
  if(!['cancelled','past'].includes(st))h+=Array.from({length:Math.max(0,c.spots)},()=>`<div class="person ph"><span class="av ph">+</span><span class="nm">待加入</span></div>`).join('');
  return h}
const stackAv=c=>c.appr.slice(0,4).map(p=>av(U(p.user_id),'sm')).join('')+Array.from({length:Math.min(c.filled||0,Math.max(0,4-c.appr.length))},()=>`<span class="av sm anonav">${ANON_SVG}</span>`).join('');

/* 女生局：非女生通过链接打开时，只显示一张锁定卡，不露时间地点和球友 */
function womenLock0(c){if(!isW(c)||ME&&(womenOK(ME)||inGame(c,ME.id)))return'';
  return `<div class="wlock"><span class="wl-i">♀</span><b>女生局</b><p>这局只对女生开放。<br>为了营造一个女性友好、安全的环境，<br>时间、地点和球友信息只有女生能看到。</p></div>`}
function xActs(c,st){const X=SX_BTN;
  if(doneLock(c))return `<button class="${X.p}" data-a="explore">看看附近其他球局</button>`;
  if(!c.past&&c.start<=NOW&&!c.isHost&&!c.mine)return `<div class="cap" style="text-align:center;margin-bottom:8px">这局已经开打了</div><button class="${X.p}" data-a="explore">看看附近其他球局</button>`;
  if(womenLock(c)){if(!ME)return sbaWaiting()?'':`<button class="${X.p}" data-a="login">我是女生 · 登录查看</button>`;
    if(ME.gender==='m')return `<div class="cap">女生局只对女生开放</div>`;
    if(ME.gender==='f')return `<div class="cap">账号审核中，暂时看不到女生局</div>`;
    return `<button class="${X.p}" data-sx="gender">我是女生 · 确认后查看</button>`}
  return null}
function hostExtras(c,st){return ufHostCard(c)+hostExtras0(c,st)}
function hostExtras0(c,st){if(!c.isHost||['past','cancelled'].includes(st))return'';const s=seriesOf(c);
  return s&&s.active?`<div class="sxlinks"><button data-sx="endSeries" data-g="${c.id}">停止每周发布</button></div>`:''}
/* 申请人信任信号：女生局里显示她参加过几场女生局 */
function wTrust(c,u){if(!isW(c))return'';const n=GAMES.filter(g=>isW(g)&&g.id!==c.id&&new Date(g.starts_at)<NOW&&PARTS.some(p=>p.game_id===g.id&&p.user_id===u.id&&p.status==='approved')).length;
  return n?` · 女生局 ${n} 场`:' · 第一次参加女生局'}

/* ---------- 报名门槛：只有女生局有 ---------- */
function gateApply(id,next){const c=api.get(id);
  if(isW(c)&&!womenOK(ME)){if(!ME.gender){openGender(()=>gateApply(id,next));return}toast('女生局只对女生开放');return}
  next()}

/* ---------- 性别：只用于女生局 ----------
 * 规则和弹窗见下方「性别：只用于女生局」：第一次填写立即生效；女生改男生随时可以；男生改女生只能一次 */
let GNEXT=null,GSTEP=null;
function openGender(next){}   // 下方重新定义
function setGender(to){}

/* ---------- 筛选：场景标签 ---------- */
function tagFilterHTML(lab){F.tags=F.tags||new Set();const opts=[['newbie','新手友好'],['match','认真比赛'],['relax','轻松随意']];if(!ME||womenOK(ME)||!ME.gender)opts.unshift(['women','女生局']);
  return `${lab('场景<span class="opt-hint">选填</span>')}<div class="opt eq" style="--n:2">${opts.map(([k,l])=>`<button class="${F.tags.has(k)?'on':''}" data-sx="ftag" data-v="${k}">${l}</button>`).join('')}</div>`}
function sxText(n){return['南伴球','']}

document.addEventListener('click',e=>{const el=e.target.closest('[data-sx]');if(!el)return;e.stopPropagation();const a=el.dataset.sx,d=el.dataset;
  const G=()=>GAMES.find(x=>x.id===d.g);
  switch(a){
    case'again':if(!ME)return;newInvite(d.u);break;
    case'xhsCopy':if(typeof xhsGo==='function')xhsGo(d.g);else copy(xhsText(api.get(d.g)),'已复制文案，发布时粘贴');break;   // 手机端一键（复制 + 系统分享带图），网页端只复制文案
