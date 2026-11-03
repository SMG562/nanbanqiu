/* =====================================================================
 * 通知 v2：一条通知，只提醒一次，提醒在对的设备上
 * ---------------------------------------------------------------------
 * 收件箱：每条通知只存一份，手机和电脑看到的是同一份列表，已读状态同步。
 * 提醒（横幅 / 推送）按下面的顺序决定发到哪里，同一条只提醒一处：
 *   ① 正在使用的设备：直接在页面里提醒；其他设备只更新红点
 *   ② 都没在用：优先推送到手机；手机没开推送，才推送到电脑
 *   ③ 出发相关（开打前提醒、取消、改时间、顺延）：在电脑上看到之外，也推送到手机
 *   ④ 夜间（城市当地时间，默认 22:00–08:00）：不紧急的推迟到早上 8 点；12 小时内开打的球局相关提醒照常
 *   ⑤ 推送前再检查一次：球局已取消 / 已开打 / 申请已处理 / 已读，就不再提醒
 *   ⑥ 手机没收到推送、5 分钟内也没看过：重要的提醒改发邮件（见 emFlush）
 * ===================================================================== */
const NR_PLAT=typeof renderPop==='function'?'desktop':'mobile',NR_OTHER=NR_PLAT==='mobile'?'desktop':'mobile';
var NR_LOG=[],NR_Q=[],NR_AWAY=false,NR_EXTRA=null;
const NR_URGENT=new Set(['soon','game_cancelled','changed','postponed','unfilled','unfilled_end']);
const NR_LOW=new Set(['recap','follow_game','badge','levelup','reopen','invite_expired','noshow']);
const NR_GO=new Set(['soon','game_cancelled','changed','postponed']);
const NR_SYS=new Set(['soon','noshow','badge','levelup','unfilled','unfilled_end']);
function nrDev(u){if(!u)return{mobile:{},desktop:{}};u.dev=u.dev||{mobile:{push:!!u.pushOK,active:false},desktop:{push:false,active:false}};
  if(u!==ME){u.dev.mobile.push=!!u.pushOK;u.dev.desktop.push=false;u.dev.mobile.active=u.dev.desktop.active=false}if(u===ME){const d=u.dev[NR_PLAT];d.push=!!PUSH.enabled&&!(typeof ENV!=='undefined'&&ENV==='wechat');d.active=document.visibilityState==='visible'&&!NR_AWAY}return u.dev}
// 城市当地时间的小时（CITY.tz）
function nrMelH(t){const s=new Date(t).toLocaleString('en-AU',{timeZone:CITY.tz,hour:'2-digit',minute:'2-digit',hour12:false});const[h,m]=s.split(':').map(Number);return [h%24,m]}
function nrQuiet(t){const[h,m]=nrMelH(t),x=h*60+m,qs=cityHM(CITY.quiet[0]),qe=cityHM(CITY.quiet[1]);if(qs>qe?(x<qs&&x>=qe):(x<qs||x>=qe))return t;let u=t+(((qe-x)%1440+1440)%1440)*6e4;const[h2,m2]=nrMelH(u);return u+(qe-h2*60-m2)*6e4}   // 夜间（城市的 quiet，默认 22:00–08:00）顺延到当地结束时刻；夏令时切换的夜里只有 23 / 25 小时：按当地墙上时间对齐
function nrGame(n){return n.game_id?GAMES.find(g=>g.id===n.game_id):null}
function nrPri(n){if(NR_URGENT.has(n.kind))return 0;if(NR_LOW.has(n.kind))return 2;const g=nrGame(n);
  if(g){const d=new Date(g.starts_at)-Date.now();if(d>0&&d<12*36e5)return 0}return 1}
function nrStale(n){if(n.read)return'已经看过';const g=nrGame(n),now=Date.now();
  if(n.from&&n.user_id&&blockedPair(n.user_id,n.from))return'有屏蔽关系';
  if(g){if(g.status==='cancelled'&&n.kind!=='game_cancelled')return'球局已取消';
    const st=+new Date(g.starts_at);if(st<=now&&!['unfilled_end','recap','noshow','game_cancelled','badge','levelup'].includes(n.kind))return'已经开打';
    if(n.kind==='request'&&!PARTS.some(p=>p.game_id===g.id&&p.user_id===n.from&&p.status==='pending'))return'申请已处理';
    if(n.kind==='soon'&&!PARTS.some(p=>p.game_id===g.id&&p.user_id===n.user_id&&p.status==='approved'))return'已不在这局';
    if(n.kind==='reopen'&&(V(g).spots<=0||PARTS.some(p=>p.game_id===g.id&&p.user_id===n.user_id&&['pending','approved'].includes(p.status))))return'已经没有空位或已报名';
    if(n.kind==='follow_game'&&(g.status!=='open'||PARTS.some(p=>p.game_id===g.id&&p.user_id===n.user_id&&p.status!=='withdrawn'&&p.status!=='left')))return'已经满员或已报名'}
  if(n.invite_id&&['invite','invite_counter'].includes(n.kind)){const i=invOf(n.invite_id);if(!i||!['pending','counter'].includes(i.status)||invExpired(i))return'邀约已结束'}
  return null}
// 需要处理的通知：列表里看过也保持未读，直到处理掉
function nrTodo(n){if(n.kind==='request_group')return PARTS.some(p=>p.game_id===n.game_id&&p.status==='pending'&&n.who.includes(p.user_id));
  if(n.kind==='request')return PARTS.some(p=>p.game_id===n.game_id&&p.user_id===n.from&&p.status==='pending')&&!nrStale({...n,read:false});
  if(n.invite_id&&['invite','invite_counter'].includes(n.kind)){const i=invOf(n.invite_id);return !!i&&!invExpired(i)&&((i.status==='pending'&&i.to===n.user_id)||(i.status==='counter'&&i.from===n.user_id))}
  return false}
const NR_DEST={'mobile-app':'手机 · 正在用，页面里提醒','desktop-app':'电脑 · 正在用，页面里提醒','mobile-push':'推送到手机','desktop-push':'推送到电脑（浏览器通知）','email':'推送没送达，5 分钟后没看就发邮件','inbox':'只进消息列表'};
function nrLog(n,dest,why){const u=U(n.user_id)||{name:'?'};let t='';try{t=(n.t||nrText(n)[0])}catch(e){}
  NR_LOG.unshift({at:Date.now(),who:u.name.split(' ')[0],me:!!ME&&n.user_id===ME.id,t,dest:Array.isArray(dest)?dest.map(x=>NR_DEST[x]||x).join(' + '):dest,why:why||''});NR_LOG.length=Math.min(NR_LOG.length,40);nrLogDraw()}
function nrText(n){if(n.t)return[n.t,n.b||''];try{const r=ntfText(n);if(r&&r.length)return r}catch(e){}return['南伴球','']}
// 决定提醒去哪；本设备需要提醒时调用 show
function nrDeliver(n,opt={}){const u=U(n.user_id);if(!u)return;const now=Date.now();
  if(typeof RQ_MUTE!=='undefined'&&RQ_MUTE){nrLog(n,'已合并到同一局的申请提醒');nrBadge();return}
  if(!opt.force&&nrPri(n)===2&&n.user_id===(ME&&ME.id)){const[mh,mm]=nrMelH(now),qd=mh*60+mm-cityHM(CITY.quiet[1]);if(qd>=0&&qd<10){NR_Q.push({n,at:now,show:opt.show,tap:opt.tap});clearTimeout(nrDeliver._t);nrDeliver._t=setTimeout(nrFlush,60);nrLog(n,'早上一起提醒');return}}
  if(!opt.force&&nrPri(n)>0){const q=nrQuiet(now);if(q>now){NR_Q.push({n,at:q,show:opt.show,tap:opt.tap});nrLog(n,`夜间，${hm(new Date(q))} 再提醒`,'不紧急的提醒推迟到早上');nrBadge();return}}
  const st=nrStale(n);if(st){nrLog(n,'不再提醒',st);if(n.kind==='follow_game')delete FG_LAST[n.user_id+'>'+n.from];nrBadge();return}
  const d=nrDev(u),to=[];
  if(d[NR_PLAT].active&&u===ME)to.push(NR_PLAT+'-app');else if(d[NR_OTHER].active)to.push(NR_OTHER+'-app');
  if(!to.length){if(d.mobile.push)to.push('mobile-push');else if(d.desktop.push)to.push('desktop-push')}
  else if(NR_GO.has(n.kind)&&to[0]!=='mobile-app'&&d.mobile.push)to.push('mobile-push');
  if(!to.length||(!to.includes('mobile-push')&&!to.includes('mobile-app')&&!to.includes('desktop-app'))){if(EM_KIND[n.kind]&&u.email)to.push('email')}
  if(!to.length)to.push('inbox');
  n.route=to;nrLog(n,to);
  if(u===ME&&to.some(x=>x.startsWith(NR_PLAT))){if(document.visibilityState!=='visible'){const[t,b]=nrText(n);nrSysNotify(t,b,opt.tap||(()=>nrOpen(n)),n)}else(opt.show||(()=>nrShow(n)))()}
  nrBadge();if(NR_PLAT==='desktop'&&$('#pop')&&$('#pop').classList.contains('show'))renderPop()}
function nrShow(n){const[t,b]=nrText(n),tap=()=>nrOpen(n);
  if(document.visibilityState!=='visible'){nrSysNotify(t,b,tap,n);return}
  if(NR_PLAT==='mobile')pushBanner(t,b,tap);else deskNotify(t,b,tap)}
// 页面在后台：系统通知（真实环境由 Service Worker 显示，tag 用 种类+球局，避免互相覆盖）
function nrSysNotify(t,b,tap,n){if(!PUSH.enabled||!('Notification'in window)||Notification.permission!=='granted')return;
  const tag=(n&&n.kind||'n')+'-'+(n&&(n.game_id||n.invite_id)||'');
  const go=x=>{try{x.onclick=()=>{window.focus();tap&&tap();x.close()}}catch(e){}};
  if(navigator.serviceWorker&&navigator.serviceWorker.getRegistration){navigator.serviceWorker.getRegistration().then(r=>{if(r)r.showNotification(t,{body:b,tag,data:{kind:n&&n.kind,game:n&&n.game_id}});else{try{go(new Notification(t,{body:b,tag}))}catch(e){}}}).catch(()=>{try{go(new Notification(t,{body:b,tag}))}catch(e){}})}
  else{try{go(new Notification(t,{body:b,tag}))}catch(e){}}}
function nrFlush(){const now=Date.now(),due=NR_Q.filter(x=>x.at<=now);if(!due.length)return;NR_Q=NR_Q.filter(x=>x.at>now);
  const mine=due.filter(x=>ME&&x.n.user_id===ME.id&&!nrStale(x.n));
  due.filter(x=>!mine.includes(x)).forEach(x=>nrDeliver(x.n,{force:true,show:x.show,tap:x.tap}));
  // 早上 8 点好几条一起到：合成一条，不连续弹
  if(mine.length>=2){mine.forEach(x=>{x.n.route=['merged'];nrLog(x.n,'早上合成一条提醒')});const n={user_id:ME.id,kind:'digest',t:`有 ${mine.length} 条新消息`,b:mine.slice(0,2).map(x=>nrText(x.n)[0]).join(' · ')+' ›'};
    const go=()=>{if(NR_PLAT==='mobile'){UI.msgTab='ntf';go2('notif')}else togglePop(true)};nrDeliver(n,{force:true,tap:go,show:()=>{NR_PLAT==='mobile'?pushBanner(n.t,n.b,go):deskNotify(n.t,n.b,go)}})}
  else mine.forEach(x=>nrDeliver(x.n,{force:true,show:x.show,tap:x.tap}))}
function go2(t){if(typeof closeDetail==='function'&&UI.detail)closeDetail();go(t)}

// ---------- 点通知去哪：两端同一套 ----------
