/* ===================== 约 TA 打球（结构化邀约，不是聊天） =====================
 * POST /api/invites {to, starts_at, ends_at, venue_id | venue_name, game_type, note≤30}
 * POST /api/invites/:id/accept                         → 生成 visibility='private' 的 2 人球局
 * POST /api/invites/:id/counter {starts_at, ends_at, venue_id|venue_name}   → 只允许改一次
 * POST /api/invites/:id/decline
 * 规则：每人每天最多 3 个；同一人 2 次「婉拒」后 30 天内不能再约；屏蔽双向生效；48 小时或开始时间已过即失效
 */
var INVITES=[];
const invOf=id=>INVITES.find(i=>String(i.id)===String(id));   // 真实模式的邀约 id 是 UUID
const invCur=i=>i.status==='counter'&&i.counter?i.counter:i;
const invExpired=i=>['pending','counter'].includes(i.status)&&(Date.now()-i.at>48*36e5||dayAt(invCur(i).o,invCur(i).t)<=NOW);
const invHome=u=>(u&&u.home_club_ids||[])[0]||null;
const gamesTogether=(a,b)=>GAMES.filter(g=>g.status!=='cancelled'&&[a,b].every(x=>PARTS.some(p=>p.game_id===g.id&&p.user_id===x&&p.status==='approved')));
const playedCount=(a,b)=>gamesTogether(a,b).filter(g=>new Date(+new Date(g.starts_at)+g.duration_min*6e4)<NOW).length;
const playedTogether=(a,b)=>playedCount(a,b)>0;
function canInvite(to){if(!ME)return'请先登录';const u=U(to);if(!u||to===ME.id)return'不能约自己';
  if(blockedPair(ME.id,to))return'暂时无法约这位球友';
  const pt=playedTogether(ME.id,to),lim=u.invite_from||'all';
  if(lim==='none')return'TA 暂时不接受邀约';if(lim==='played'&&!pt)return'TA 只接受一起打过球的球友邀约';
  if(!pt){const nNew=new Set(INVITES.filter(i=>i.from===ME.id&&Date.now()-i.at<864e5&&!playedTogether(ME.id,i.to)).map(i=>i.to)).size;if(nNew>=2)return'今天已经约了 2 位新球友，明天再约吧'}
  const today=new Set(INVITES.filter(i=>i.from===ME.id&&Date.now()-i.at<864e5).map(i=>i.id)).size;if(today>=3)return'今天已经发出 3 个邀约了，明天再约吧';
  const dec=INVITES.filter(i=>i.from===ME.id&&i.to===to&&i.status==='declined'&&Date.now()-i.at<30*864e5).length;if(dec>=2)return'对方最近不太方便，过段时间再约吧';
  if(INVITES.some(i=>i.from===ME.id&&i.to===to&&['pending','counter'].includes(i.status)&&!invExpired(i)))return'已经约过 TA 了，等 TA 回复吧';return null}

/* ---------- 时间 / 地点 文案 ---------- */
const dayTxt=o=>{const d=dayAt(o);return `${o===0?'今天':o===1?'明天':WD[d.getDay()]} ${d.getMonth()+1}/${d.getDate()}`};
const toMin=t=>{const[h,m]=t.split(':');return +h*60+ +m},fromMin=m=>`${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
const durTxt=(t,e)=>{const m=toMin(e)-toMin(t);return m%60?`${(m/60).toFixed(1)} 小时`:`${m/60} 小时`};
const venTxt=v=>VEN[v]?VEN[v].short||VEN[v].name:'';
const invWhen=i=>{const p=invCur(i);return `${dayTxt(p.o)} ${p.t}–${p.e}`};
const invWhere=i=>venTxt(invCur(i).venue_id);
const PERIODS=[['早上',360,570],['中午',600,810],['下午',840,1050],['晚上',1080,1290]]; // 每段 8 个半点，06:00–21:30
const perOf=t=>{const m=toMin(t);return PERIODS.findIndex(p=>m>=p[1]&&m<=p[2])};
const DURS=[60,90,120],durLbl=m=>m===60?'1 小时':m===90?'1.5 小时':'2 小时';
const setEnd=f=>{f.e=fromMin(toMin(f.t)+f.dur)};
const firstFree=o=>{for(const p of PERIODS)for(let m=p[1];m<=p[2];m+=30)if(dayAt(o,fromMin(m))>NOW)return fromMin(m);return null};

/* ---------- 通知 ---------- */
function invText(n){const i=invOf(n.invite_id),f=U(n.from)||{name:''};if(!i)return['邀约',''];
  return {invite:[`${f.name} 想约你打球`,`${invWhen(i)} · ${invWhere(i)}`],
    invite_counter:[`${f.name} 提议换个时间`,`${invWhen(i)} · ${invWhere(i)}`],
    invite_accepted:[`${f.name} 接受了你的邀约 🎾`,'已为你们生成一场私人球局'],
    invite_declined:[`${f.name} 回复了你的邀约`,ivNoText(i)]}[n.kind]}
function notifyInv(uid,kind,inv,from){const n={id:++NID,user_id:uid,kind,invite_id:inv.id,game_id:inv.game_id||null,from,at:Date.now(),read:false};NOTIFS.unshift(n);
  if(ME&&uid===ME.id){INV_RENDER();const[t,b]=invText(n);INV_BANNER(t,b,()=>inv.game_id&&kind==='invite_accepted'?INV_GAME(inv.game_id):openInvite(inv.id))}}

/* ---------- 球员卡上的按钮：按关系显示不同状态 ---------- */
function invBtnHTML(uid){if(ME&&(uid===ME.id||ME.blocked.has(uid)||blockedPair(ME.id,uid)))return'';
  if(!ME)return `<button class="invbtn" data-iv="new" data-u="${uid}">约 TA 打球</button>`;
  const lim=(U(uid)||{}).invite_from||'all';if(lim==='none'||(lim==='played'&&!playedTogether(ME.id,uid)))return `<div class="invbtn off">${lim==='none'?'TA 暂时不接受邀约':'TA 只接受打过球的球友邀约'}</div>`;
  const open=INVITES.find(i=>[i.from,i.to].includes(uid)&&[i.from,i.to].includes(ME.id)&&['pending','counter'].includes(i.status)&&!invExpired(i));
  if(open){const mine=open.status==='pending'?open.from===ME.id:open.to===ME.id;
    return `<button class="invbtn ${mine?'wait':''}" data-iv="view" data-i="${open.id}">${mine?'已约 · 等 TA 回复':open.status==='counter'?'TA 提议了新时间 · 去确认':'TA 约了你 · 去回复'}<small>${esc(invWhen(open))} · ${esc(invWhere(open))}</small></button>`}
  // 已有一场未开始的球局：不再把「约 TA」换成「查看球局」——想再约一天、或只是同在多人局里想单独约，都应该约得了。球局信息作为一行小字放在按钮下面。
  const next=gamesTogether(ME.id,uid).filter(g=>new Date(g.starts_at)>NOW).sort((a,b)=>new Date(a.starts_at)-new Date(b.starts_at))[0];
  const n=playedCount(ME.id,uid),u=U(uid);
  const nextRow=next?(()=>{const s=new Date(next.starts_at);return `<button class="invnext" data-iv="gameOf" data-g="${next.id}">你们${relDay(s)} ${hm(s)} 已有一场 · ${esc(venTxt(next.venue_id))} · 查看</button>`})():'';
  return (n?`<button class="invbtn" data-iv="new" data-u="${uid}">再约一局<small>你们一起打过 ${n} 场</small></button>`
          :`<button class="invbtn soft" data-iv="new" data-u="${uid}">约 TA 打球</button>`)+nextRow}

/* ---------- 发起 / 改时间：共用一张表单 ---------- */
let IVF=null;
function newInvite(to){const why=canInvite(to);if(why){toast(why);return}
  let o=1;while(o<6&&dayAt(o).getDay()!==6)o++;       // 默认最近的周六
  const mine=ME.home_club_ids||[];
  IVF={kind:'new',to,o,t:'09:00',e:'10:30',dur:90,per:0,venue_id:mine[0]||null,extra:null,search:!mine.length,q:'',game_type:'singles',note:'',hint:''};
  if(!lastTimeDefaults(IVF))strangerDefaults(IVF);drawInviteForm()}
/* 没一起打过：优先选你们共同所属的 Club，其次 TA 的主 Club；只用双方资料里已有的数据，不额外检索 */
function strangerDefaults(f){const u=U(f.to)||{},mine=ME.home_club_ids||[],theirs=u.home_club_ids||[],both=mine.find(v=>theirs.includes(v));f.stranger=true;
  if(both&&VEN[both]){f.venue_id=both;f.search=false;f.hint=`你们都是 ${venTxt(both)} 的会员，已选这里`}
  else if(theirs[0]&&VEN[theirs[0]]){f.venue_id=theirs[0];f.search=false;f.hint=`TA 的主 Club 是 ${venTxt(theirs[0])}，已选这里`}}
/* 打过球：按你们上一场的星期 / 时间 / 场地 / 玩法预填，一键就能发 */
function lastTimeDefaults(f){const last=gamesTogether(ME.id,f.to).filter(g=>new Date(g.starts_at)<NOW).sort((a,b)=>new Date(b.starts_at)-new Date(a.starts_at))[0];if(!last)return false;
  const s=new Date(last.starts_at),t=hm(s),wd=s.getDay();let o=null;for(let k=0;k<7;k++)if(dayAt(k).getDay()===wd&&dayAt(k,t)>NOW){o=k;break}
  if(o==null||perOf(t)<0)return false;f.o=o;f.t=t;f.per=perOf(t);f.dur=DURS.reduce((a,m)=>Math.abs(m-last.duration_min)<Math.abs(a-last.duration_min)?m:a,90);setEnd(f);
  if(VEN[last.venue_id])f.venue_id=last.venue_id;f.search=false;f.game_type=last.game_type==='rally'?'rally':'singles';
  f.hint=`已按你们上一场预填：${WD[wd]} ${t} · ${venTxt(last.venue_id)}`;return true}
function venueChoices(){const f=IVF,base=f.kind==='counter'?[...new Set([f.orig,...(ME.home_club_ids||[])])]:(ME.home_club_ids||[]);
  const list=[...base];if(f.venue_id&&!list.includes(f.venue_id))list.push(f.venue_id);return list}
function venueResults(){const o=U(IVF.to)||{};return vpList('iv',IVF,o.home_club_ids||[])}
const ivScroller=()=>{let e=document.querySelector('.iv');while(e&&e!==document.body){if(/(auto|scroll)/.test(getComputedStyle(e).overflowY)&&e.scrollHeight>e.clientHeight)return e;e=e.parentElement}return null};   // 只给测试用；重画不跳回顶部由 openSheet / openModal 统一保证
const IV_QP_PLAYED=['上次打得很开心，再来一局','这周有空吗？','想再切磋一下'],IV_QP_NEW=['想认识一下，一起练练','水平差不多，来一场吧','周末有空一起打吗？'];
function drawInviteForm(){_drawInviteForm()}
function _drawInviteForm(){const f=IVF,u=U(f.to),counter=f.kind==='counter',mine=ME.home_club_ids||[];
  const d0=firstFree(0)?0:1,days=Array.from({length:7-d0},(_,k)=>d0+k);   // 今天还来得及就从今天起，否则从明天起，共 7 天
  const P=PERIODS[f.per],slots=[];for(let m=P[1];m<=P[2];m+=30)slots.push(fromMin(m));
  const tag=v=>counter&&v===f.orig?'原地点':VEN[v]&&VEN[v].custom?'自己填写':VEN[v]?surfTxt(VEN[v]):'';
  INV_OPEN(`<div class="iv${f.compact?' compact':''}">
    <div class="iv-h"><span class="iv-av">${av(u)}</span><div><b>${counter?'换个时间给 '+esc(u.name):'约 '+esc(cardName(u))+' 打球'}</b><small>${counter?'只能改一次，TA 确认后生成球局':'TA 接受后，就是你们俩的私人球局'}</small></div></div>
    <div class="kbhide">
    ${f.stranger&&!counter?(()=>{const s=stats(f.to);return `<div class="iv-trust"><span>赴约率 <b>${s.played?Math.round(s.att*100)+'%':'—'}</b></span><span>好评 <b>${s.kudos}</b></span><span>打过 <b>${s.played}</b> 场</span></div>`})():''}
    ${f.hint&&!counter?`<div class="iv-hint2">${esc(f.hint)}</div>`:''}
    <div class="iv-l">哪天</div>
    <div class="iv-days">${days.map(o=>{const d=dayAt(o);return `<button data-iv="day" data-v="${o}" class="${f.o===o?'on':''}"><small>${o===0?'今天':o===1?'明天':WD[d.getDay()]}</small><b>${d.getDate()}</b></button>`}).join('')}</div>
    <div class="iv-l">几点开始</div>
    <div class="iv-tp"><div class="iv-per">${PERIODS.map((p,k)=>`<button data-iv="per" data-v="${k}" class="${f.per===k?'on':''}">${p[0]}${perOf(f.t)===k?'<i></i>':''}</button>`).join('')}</div>
      <div class="iv-slots">${slots.map(t=>{const off=dayAt(f.o,t)<=NOW;return `<button data-iv="tm" data-v="${t}" class="${f.t===t?'on':''}" ${off?'disabled':''}>${t}</button>`}).join('')}</div></div>
    <div class="iv-l">打多久</div>
    <div class="iv-seg">${DURS.map(m=>`<button data-iv="dur" data-v="${m}" class="${f.dur===m?'on':''}">${durLbl(m)}</button>`).join('')}</div>
    <div class="iv-sum"><b>${esc(dayTxt(f.o))}</b><span>${f.t} – ${f.e}</span></div>
    ${(()=>{const c=ivClash(f);return c?`<div class="iv-warn">${c}</div>`:''})()}
    <div class="iv-l">在哪打</div>
    <div class="iv-chips">${venueChoices().map(v=>`<button data-iv="ven" data-v="${v}" class="${f.venue_id===v?'on':''}">${esc(venTxt(v))}<small>${tag(v)}</small></button>`).join('')}<button data-iv="more" class="${f.search?'on2':''}">其他场地</button></div>
    ${f.search||f.adding?vpHTML('iv',f):''}
    ${counter?'':`<div class="iv-l">玩法</div>
    <div class="iv-seg">${['singles','rally'].map(k=>`<button data-iv="type" data-v="${k}" class="${f.game_type===k?'on':''}">${TYPE[k]}</button>`).join('')}</div>`}
    </div>
    ${counter?'':`<div class="iv-kbsum"><span>${esc(dayTxt(f.o))} ${f.t}–${f.e} · ${esc(venTxt(f.venue_id)||'还没选场地')} · ${TYPE[f.game_type]}</span><button type="button" data-iv="expand">修改</button></div>
    <div class="iv-l">说一句 <span>选填</span></div>
    <input id="ivNote" class="iv-in" maxlength="30" enterkeyhint="done" autocomplete="off" placeholder="比如：上次双打很开心，想约你单挑一局" value="${esc(f.note)}">
    <div class="iv-qp">${(f.stranger?IV_QP_NEW:IV_QP_PLAYED).map((t,k)=>`<button type="button" data-iv="qp" data-v="${k}">${t}</button>`).join('')}</div>`}
    ${f.stranger&&!counter?`<p class="iv-safe kbhide">第一次约 TA：建议选有人的公共球场，见面前在聊天里确认一下 · <a data-a="safety">安全须知</a></p>`:''}
    <button class="iv-go" data-iv="${counter?'sendCounter':'send'}">${counter?'发回给 TA 确认':'发送邀约'}</button>
    ${counter?'<button class="iv-3" data-iv="back" style="width:100%;margin-top:8px">返回</button>':`<div class="iv-foot">48 小时内有效 · 不会显示在发现页</div>`}</div>`);
  const d=document.querySelector('.iv-days .on');if(d)d.scrollIntoView({block:'nearest',inline:'center'})}
/* 选的时间和已有球局撞了：只提醒、不拦（可能想换场、或另有安排）。先看和 TA 的球局，再看自己的 */
function ivClash(f){if(!ME||f.kind==='counter'&&false)return'';const a=dayAt(f.o,f.t),b=dayAt(f.o,f.e);
  const hit=(uid,pre)=>GAMES.find(g=>g.status!=='cancelled'&&PARTS.some(p=>p.game_id===g.id&&p.user_id===uid&&p.status==='approved')&&new Date(g.starts_at)<b&&new Date(+new Date(g.starts_at)+g.duration_min*6e4)>a);
  const t=hit(f.to),m=hit(ME.id);const w=g=>`${relDay(new Date(g.starts_at))} ${hm(new Date(g.starts_at))}`;
  if(t&&PARTS.some(p=>p.game_id===t.id&&p.user_id===ME.id&&p.status==='approved'))return `你们 ${w(t)} 已经有一场了，换个时间约吧`;
  if(m)return `你这个时间已有一场球局（${w(m)}），确定要约吗？`;return''}
function keepForm(){if(!IVF)return;const n=document.getElementById('ivNote');if(n)IVF.note=n.value;const q=document.getElementById('ivQ');if(q)IVF.q=q.value;vpKeep('iv',IVF)}
function formOK(){const f=IVF;if(!f.venue_id){toast('选一个场地吧');return false}
  if(dayAt(f.o,f.t)<=NOW){toast('这个时间已经过了');return false}if(toMin(f.e)<=toMin(f.t)){toast('结束时间要晚于开始时间');return false}return true}
const invSentHTML=(to,when,where)=>`<div class="iv iv-done"><div class="iv-ok">✓</div><b>邀约已发送</b><p>${esc(cardName(U(to)))} 回复后会通知你<br>${esc(when)} · ${esc(where)}</p><button class="iv-go" data-iv="close">好的</button></div>`;
function sendInvite(){keepForm();if(!formOK())return;const f=IVF;
  if(NBQ_NET){nbqInviteSend(f,invSentHTML(f.to,`${dayTxt(f.o)} ${f.t}–${f.e}`,venTxt(f.venue_id)));return}   // 真实模式：先调接口
  const inv={id:++NID,from:ME.id,to:f.to,o:f.o,t:f.t,e:f.e,venue_id:f.venue_id,game_type:f.game_type,note:f.note.trim().slice(0,30),status:'pending',at:Date.now(),countered:false};
  if(lessHas(ME.id,f.to))setOpin(ME.id,f.to,'ok',null);   // 主动约 TA，说明不再想少遇到
  INVITES.unshift(inv);notifyInv(f.to,'invite',inv,ME.id);IVF=null;
  INV_OPEN(invSentHTML(inv.to,invWhen(inv),invWhere(inv)))}
function customVenue(name){name=name.trim().slice(0,40);if(!name)return null;
  const hit=Object.values(VEN).find(v=>v.name.toLowerCase()===name.toLowerCase());if(hit)return hit.id;
  const base=VEN[invHome(ME)]||VEN.v1,id='c'+(++NID);
  VEN[id]={id,name,short:name,suburb:'自填场地',lat:base.lat,lng:base.lng,surface:'hard',custom:true};return id}

/* ---------- 查看 / 回复邀约 ---------- */
let IVP=null;
function openInvite(id){const i=invOf(id);if(!i)return;IVP={id:i.id};IVF=null;drawInvite()}
function drawInvite(){const i=invOf(IVP.id),me=ME&&ME.id,exp=invExpired(i),incoming=!exp&&(i.status==='pending'?i.to===me:i.status==='counter'?i.from===me:false);
  const other=U(i.from===me?i.to:i.from);
  const stTxt=exp?'已失效':{pending:i.from===me?'等 TA 回复':'待你回复',counter:i.from===me?'TA 提议了新时间，待你确认':'等 TA 确认新时间',accepted:(()=>{const g=i.game_id&&GAMES.find(x=>x.id===i.game_id);return g&&new Date(g.starts_at)<=NOW?'已经一起打过了':'已确认 · 已生成私人球局'})(),declined:i.from===me?ivNoText(i):'你已婉拒',withdrawn:i.from===me?'你已撤回':'TA 撤回了邀约',expired:'已失效'}[i.status];
  const p=invCur(i);
  INV_OPEN(`<div class="iv"><div class="iv-card"><div class="iv-card-h"><span class="iv-av">${av(U(i.from))}</span><div><b>${i.status==='accepted'?`你和 ${esc(other.name)} 约好了`:`${esc(U(i.from).name)} 想约${i.from===me?' '+esc(other.name)+' ':'你'}打球`}</b><small>${stTxt}</small></div></div>
    ${i.status==='counter'?`<div class="iv-was">原定 ${esc(dayTxt(i.o))} ${i.t}–${i.e} · ${esc(venTxt(i.venue_id))}</div>`:''}
    <div class="iv-kv"><span>时间</span><b>${esc(invWhen(i))}</b></div><div class="iv-kv"><span>地点</span><b>${esc(invWhere(i))}</b></div><div class="iv-kv"><span>玩法</span><b>${TYPE[i.game_type]} · ${durTxt(p.t,p.e)}</b></div>
    ${i.note?`<div class="iv-note">“${esc(i.note)}”</div>`:''}</div>
    ${incoming?`<div class="iv-acts"><button class="iv-go" data-iv="accept">${i.status==='counter'?'就这个时间':'接受'}</button>${i.status==='pending'&&!i.countered?'<button class="iv-2" data-iv="counter">换个时间</button>':''}<button class="iv-3" data-iv="decline">婉拒</button></div>`
      :invNext(i,exp,other)}</div>`)}
/* 邀约的每一种状态都给出下一步，不留死胡同 */
function invNext(i,exp,other){const me=ME.id,mine=i.from===me,g=i.game_id&&GAMES.find(x=>x.id===i.game_id),first=esc(other.name.split(' ')[0]);
  const dm=`<button class="iv-2" data-cx="dm" data-u="${other.id}">发消息</button>`,close=`<button class="iv-3" data-iv="close">关闭</button>`;
  if(i.status==='accepted'&&g){const done=new Date(g.starts_at)<=NOW;
    return `<button class="iv-go" data-iv="game">查看球局</button><div class="iv-acts">${dm}${done?close:`<button class="iv-2" data-a="ics" data-g="${g.id}">加入日历</button>`}</div>
      <div class="iv-foot">${done?'打完了？去球局里给 TA 留个印象':'球局只有你们两人可见 · 有变化在球局聊天里说'}</div>`}
  if(exp)return `${mine?`<div class="iv-foot" style="margin:14px 0 4px">${first} 没有在 48 小时内回复，邀约已失效</div>`:''}<div class="iv-acts">${mine?`<button class="iv-2" data-iv="again">再约一次</button>`:dm}${close}</div>`;
  if(i.status==='declined')return `<div class="iv-acts">${mine?`<button class="iv-2" data-iv="again">换个时间再约</button>`:dm}${close}</div>`;
  if(i.status==='withdrawn')return `<div class="iv-acts">${mine?`<button class="iv-2" data-iv="again">重新约 ${first}</button>`:dm}${close}</div>`;
  // 我发出的、等对方回复（或我提议了新时间、等对方确认）
  const left=Math.max(1,Math.ceil((48*36e5-(Date.now()-i.at))/36e5));
  return `<div class="iv-foot" style="margin:14px 0 4px">${first} 回复后会通知你 · 还有 ${left} 小时有效</div><div class="iv-acts">${dm}<button class="iv-3" data-iv="withdraw">${mine?'撤回邀约':'撤回新时间'}</button></div>`}
function makeGame(i){const p=invCur(i),a=U(i.from),b=U(i.to),id='p'+(++NID);
  GAMES.push({id,share_code:Math.random().toString(36).slice(2,6),starts_at:dayAt(p.o,p.t).toISOString(),duration_min:toMin(p.e)-toMin(p.t),venue_id:p.venue_id,game_type:i.game_type,ntrp_min:Math.min(a.ntrp,b.ntrp),ntrp_max:Math.max(a.ntrp,b.ntrp),host_id:i.from,capacity:2,note:i.note||'',status:'full',visibility:'private',wx:{}});
  PARTS.push({game_id:id,user_id:i.from,role:'host',status:'approved',message:'',created_at:Date.now()},{game_id:id,user_id:i.to,role:'player',status:'approved',message:'',created_at:Date.now()});return id}
function finishAccept(i){const id=makeGame(i);i.status='accepted';i.game_id=id;const other=i.from===ME.id?i.to:i.from;
  notifyInv(other,'invite_accepted',i,ME.id);INV_CLOSE();toast('已生成私人球局 🎾');INV_RENDER();setTimeout(()=>INV_GAME(id),300)}
function invAct(act,el){const i=IVP&&invOf(IVP.id);
  if(IVF&&['pickVen','addVen','addCancel','addSurf','addSave','vpLetter','pickPlace','auPick'].includes(act)){keepForm();if(vpAct(IVF,act,el))drawInviteForm();return}
  switch(act){
    case'close':IVF=null;INV_CLOSE();break;
    case'day':keepForm();IVF.o=+el.dataset.v;if(dayAt(IVF.o,IVF.t)<=NOW){const t=firstFree(IVF.o);if(t){IVF.t=t;IVF.per=perOf(t);setEnd(IVF)}}drawInviteForm();break;
    case'per':keepForm();IVF.per=+el.dataset.v;drawInviteForm();break;
    case'tm':keepForm();IVF.t=el.dataset.v;setEnd(IVF);drawInviteForm();break;
    case'dur':keepForm();IVF.dur=+el.dataset.v;setEnd(IVF);drawInviteForm();break;
    case'ven':keepForm();IVF.venue_id=el.dataset.v;drawInviteForm();break;
    case'more':keepForm();IVF.search=!IVF.search;IVF.adding=null;IVF.q='';drawInviteForm();break;
    case'customVen':keepForm();{const id=customVenue(IVF.q);if(id){IVF.venue_id=id;IVF.q='';IVF.search=false}}drawInviteForm();break;
    case'type':keepForm();IVF.game_type=el.dataset.v;drawInviteForm();break;
    case'expand':keepForm();IVF.compact=false;drawInviteForm();break;
    case'qp':{const t=(IVF.stranger?IV_QP_NEW:IV_QP_PLAYED)[+el.dataset.v];if(t){IVF.note=t;const n=document.getElementById('ivNote');if(n){n.value=t;n.blur()}}}break;
    case'send':sendInvite();break;
    case'accept':if(NBQ_NET)nbqInviteAccept(i);else finishAccept(i);break;
    case'counter':IVF={kind:'counter',to:i.from,o:i.o,t:i.t,e:i.e,dur:toMin(i.e)-toMin(i.t),per:Math.max(0,perOf(i.t)),venue_id:i.venue_id,orig:i.venue_id,search:false,q:'',game_type:i.game_type,note:''};drawInviteForm();break;
    case'back':IVF=null;drawInvite();break;
    case'sendCounter':keepForm();if(!formOK())return;{const f=IVF;if(f.o===i.o&&f.t===i.t&&f.e===i.e&&f.venue_id===i.venue_id){toast('时间和地点都没变，直接接受就好');return}
      if(NBQ_NET){nbqInviteCounter(i,f);return}
      i.counter={o:f.o,t:f.t,e:f.e,venue_id:f.venue_id};i.status='counter';i.countered=true;i.at=Date.now();IVF=null;notifyInv(i.from,'invite_counter',i,i.to);INV_CLOSE();toast('已发回给对方确认');INV_RENDER()}break;
    case'decline':drawInvNo(i);break;
    case'noBack':drawInvite();break;
    case'noGo':if(NBQ_NET){nbqInviteDecline(i,el.dataset.v,((document.getElementById('ivNote')||{}).value||'').trim().slice(0,30));break}
    {const oth=i.from===ME.id?i.to:i.from,nt=((document.getElementById('ivNote')||{}).value||'').trim().slice(0,30);i.status='declined';i.no=el.dataset.v;i.noNote=nt;notifyInv(oth,'invite_declined',i,ME.id);INV_CLOSE();toast('已婉拒');INV_RENDER()}break;
    case'game':INV_CLOSE();INV_GAME(i.game_id);break;
    case'withdraw':if(NBQ_NET){nbqInviteWithdraw(i);break}
      if(i.status==='counter'&&i.to===ME.id){i.status='pending';i.counter=null;toast('已撤回新时间');drawInvite()}else{i.status='withdrawn';toast('已撤回');INV_CLOSE()}INV_RENDER();break;
    case'again':{const to=i.from===ME.id?i.to:i.from;INV_CLOSE();setTimeout(()=>newInvite(to),120)}break;
  }}

/* ---------- 婉拒邀约：和婉拒申请同一套做法 —— 选一句真实的理由，可以再加一句自己的话；时间不合适就直接「换个时间」 ---------- */
const IVNO=[['week','这周排满了','这周排满了，下次再约 🎾'],['rest','最近在休息','最近在休息，暂时不约球'],['pass','这次先不约了','谢谢邀请，这次先不约啦']];
function ivNoText(i){const x=IVNO.find(x=>x[0]===i.no);return (x?x[2]:'这次先不约啦')+(i.noNote?` · 「${i.noNote}」`:'')}
function drawInvNo(i){const u=U(i.from===ME.id?i.to:i.from);
  INV_OPEN(`<div class="iv softno"><div class="sn-h">婉拒 ${esc(u.name.split(' ')[0])} 的邀约</div>
    <input class="sn-note" id="ivNote" maxlength="30" placeholder="想对 TA 说一句？（可选）">
    <div class="sn-list">${IVNO.map(([k,a,b])=>`<button data-iv="noGo" data-v="${k}"><b>${a}</b><small>TA 会看到：「${b}」</small></button>`).join('')}</div>
    ${i.status==='pending'&&!i.countered?`<button class="iv-2" data-iv="counter" style="width:100%;margin-top:10px">只是时间不合适？换个时间</button>`:''}
    <button class="mt-sec" data-iv="noBack" style="display:block;margin:8px auto 0;border:0;background:none;font:inherit;color:var(--mut)">返回</button></div>`)}

/* ---------- 私人球局：互相展示微信号（默认关闭，双方都打开才可见） ---------- */
function privHTML(c){if(c.visibility!=='private')return'';const me=ME&&c.appr.some(p=>p.user_id===ME.id);
  const wx=c.wx||{},other=c.appr.map(p=>U(p.user_id)).find(u=>!ME||u.id!==ME.id),both=ME&&other&&wx[ME.id]&&wx[other.id];
  return `<div class="priv"><div class="priv-h">🔒 私人球局 · 只有你们两人可见，不出现在发现页</div>
    ${me?`<div class="priv-row"><span>向对方展示我的微信号</span><button class="tg ${wx[ME.id]?'on':''}" data-iv="wx" data-g="${c.id}"></button></div>
    ${wx[ME.id]&&!ME.wechat?`<div class="priv-row"><input id="wxId" class="iv-in" placeholder="你的微信号" style="margin:0"><button class="iv-2" data-iv="wxSave" data-g="${c.id}" style="flex:none;padding:0 14px">保存</button></div>`:''}
    <div class="priv-s">${both?`微信：${esc(ME.name)} <b>${esc(ME.wechat)}</b> · ${esc(other.name)} <b>${esc(other.wechat||'')}</b>`:wx[ME.id]?'等对方也打开后，双方互相可见':'默认关闭。双方都打开后才会互相显示'}</div>`:''}</div>`}
function wxToggle(gid){const g=GAMES.find(x=>x.id===gid);g.wx=g.wx||{};g.wx[ME.id]=!g.wx[ME.id];INV_RENDER()}

document.addEventListener('click',e=>{const el=e.target.closest('[data-iv]');if(!el)return;e.stopPropagation();const a=el.dataset.iv;
  if(a==='new'){const u=el.dataset.u;if(!ME){openAuth(()=>newInvite(u),'登录后就可以约 TA 打球');return}newInvite(u);return}
  if(a==='view'){openInvite(el.dataset.i);return}
  if(a==='gameOf'){INV_CLOSE();INV_GAME(el.dataset.g);return}
  if(a==='wx'){wxToggle(el.dataset.g);return}
  if(a==='wxSave'){const v=(document.getElementById('wxId')||{}).value;if(v&&v.trim()){if(nbqCardBlocked())return;ME.wechat=v.trim();if(nbqOn())nbqPatchMe('wx',{wechat_id:ME.wechat});INV_RENDER()}return}
  invAct(a,el)},true);
/* 点了「说一句」就进入精简视图并一直留着：键盘收起（点「完成」）后表单不再展开、位置不跳；要改时间 / 地点点摘要旁的「修改」 */
document.addEventListener('focusin',e=>{if(e.target.id==='ivNote'&&IVF&&IVF.kind==='new'&&!IVF.compact){IVF.compact=true;const r=e.target.closest('.iv');if(r)r.classList.add('compact')}});
document.addEventListener('input',e=>{if(e.target.id!=='ivQ'||!IVF)return;IVF.q=e.target.value;const r=document.getElementById('ivRes');if(r)r.innerHTML=venueResults()});
document.addEventListener('keydown',e=>{if(nbqImeEnter(e))return;   // 中文输入法拼写中的回车只是「确认拼音」
  if(e.target.id==='ivQ'&&e.key==='Enter'&&!nbqImeEnter(e)&&IVF&&IVF.q.trim()){e.preventDefault();const hit=document.querySelector('#ivRes [data-iv]');if(hit)hit.click()}});

/* ---------- 「谁可以约我打球」：所有球友 / 一起打过球的 / 暂不接受 ---------- */
const IVSET=[['all','所有球友','任何登录的球友都可以约你；每人每天最多约 2 位新球友'],['played','一起打过球的','只有和你同场打过球的人能约你'],['none','暂不接受','球员卡上不显示「约 TA 打球」']];
const invSetHTML=cls=>ME?`<button class="${cls}" data-ivset="open"><span class="ico" style="background:#2F8F5B"><svg><use href="#i-cal"/></svg></span><span class="v">谁可以约我打球<small>${IVSET.find(x=>x[0]===(ME.invite_from||'all'))[1]}</small></span></button>`:'';
function ivSetSheet(){INV_OPEN(`<div class="iv"><div class="iv-h"><div><b>谁可以约我打球</b><small>收到邀约后由你确认，才会生成球局</small></div></div>
  <div class="ivset">${IVSET.map(x=>`<button class="${(ME.invite_from||'all')===x[0]?'on':''}" data-ivset="${x[0]}"><b>${x[1]}</b><small>${x[2]}</small></button>`).join('')}</div></div>`)}
document.addEventListener('click',e=>{const b=e.target.closest('[data-ivset]');if(!b)return;e.stopPropagation();const v=b.dataset.ivset;
  if(v==='open'){ivSetSheet();return}if(nbqCardBlocked())return;ME.invite_from=v;if(nbqOn())nbqPatchMe('inv',{invite_from:v});INV_CLOSE();INV_RENDER();toast('已更新：'+IVSET.find(x=>x[0]===v)[1])},true);
const INV_DEMO=()=>{let o=1;while(o<6&&dayAt(o).getDay()!==6)o++;const inv={id:++NID,from:'han',to:'jason',o,t:'09:00',e:'10:30',venue_id:'v2',game_type:'singles',note:'上次双打配合很好，想约你单挑一局',status:'pending',at:Date.now(),countered:false};INVITES.unshift(inv);return inv};


