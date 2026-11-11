  if(n.invite_id){if(k==='invite_accepted'&&n.game_id)INV_GAME(n.game_id);else openInvite(n.invite_id)}
  else if(k==='unfilled'||k==='unfilled_end')openUnfilled(n.game_id);
  else if(k==='recap')rcOpen(n.game_id);
  else if(k==='badge')bdgShow(n.user_id,n.badge);
  else if(k==='levelup'){if(LVREC[n.user_id])lvShow(n.user_id)}
  else if(k==='noshow')nsAppeal(n.game_id);
  else if(k==='soon')soonOpen(n.game_id);
  else if(['rejected','expired','full'].includes(k))nrToDay(n.game_id);
  else if(k==='request_group'){nrToGame(n.game_id,null);setTimeout(()=>{const h=document.querySelector('#dBody .rq-h,#colR .rq-h');h&&h.scrollIntoView({behavior:'smooth',block:'start'})},420)}
  else if(n.game_id)nrToGame(n.game_id,k==='request'?n.from:null);
  nrBadge()}
if(NR_PLAT==='mobile')ntfOpen=nrOpen;

// ---------- 红点：按列表里的条数算（合并后的申请算一条），加上聊天未读 ----------
function nrList(){return ME?ntfGroup(NOTIFS.filter(n=>n.user_id===ME.id&&!n.hide&&!(n.kind==='request'&&n.from&&blockedPair(ME.id,n.from)))):[]}
function nrBadgeN(){return ME?nrList().filter(n=>!n.read).length:0}
function nrBadge(){if(NR_PLAT==='mobile'){if(typeof renderBadge==='function')renderBadge()}else if(typeof renderNav==='function')renderNav()}
if(NR_PLAT==='mobile'){renderBadge=function(){const n=ME?nrBadgeN()+chatUnread():0;const b=$('#nBadge');if(!b)return;b.hidden=!n;b.textContent=n}}
else{const _nrNav=renderNav;renderNav=function(){_nrNav();const n=nrBadgeN(),b=$('#nBadge');if(b){b.hidden=!n;b.textContent=n}}}

// ---------- 通知文案补充 ----------
const _nrText=ntfText;ntfText=function(n){const g=nrGame(n);
  if(n.kind==='soon'&&g){const c=V(g),m=Math.max(5,Math.round((c.start-Date.now())/3e5)*5),os=c.appr.filter(p=>p.user_id!==n.user_id).map(p=>U(p.user_id)).filter(Boolean);
    const fresh=stats(n.user_id).played<5||os.some(u=>!playedCount(n.user_id,u.id));
    return [`${m} 分钟后开打 🎾`,`${hm(c.start)} · ${c.v.short}${os.length?` · 和 ${os.slice(0,3).map(u=>u.name.split(' ')[0]).join('、')}`:''}${fresh?' · 见面前看看球友约定':''} ›`]}
  if(n.kind==='reopen'&&g){const c=V(g);return ['你想加入的球局又有空位了',`${relDay(c.start)} ${hm(c.start)} · ${c.v.short} · 还缺 ${c.spots} 位 ›`]}
  if(n.kind==='player_left'&&g&&g.visibility==='private'){const c=V(g),f=U(n.from)||{name:''};return [`${f.name} 取消了你们的约球`,`${relDay(c.start)} ${hm(c.start)} · ${c.v.short}`]}
  if(n.kind==='noshow'&&g){const c=V(g);return ['有球友反馈你没到场',`${relDay(c.start)} ${hm(c.start)} · ${c.v.short} · 有误会可以申诉 ›`]}
  let r;try{r=_nrText(n)}catch(e){r=null}return r&&r.length?r:['南伴球','']};
const _nrInvText=invText;invText=function(n){if(n.kind==='invite_expired'){const i=invOf(n.invite_id),f=U(n.from)||{name:''};return [`${f.name.split(' ')[0]} 没来得及回复你的邀约`,`${i?esc(invWhen(i)):''} · 邀约已失效，可以换个时间再约 ›`]}return _nrInvText(n)};
// 系统通知（没有具体发起人）：列表里用南伴球的标识
function nrAv(n,f){if(n.kind==='request_group')return rqStack(n);if(NR_SYS.has(n.kind)||!n.from)return '<span class="av nrsys"><svg viewBox="0 0 100 100"><use href="#logo"/></svg></span>';return null}

// ---------- 开打前 30 分钟 ----------
const SOON_MIN=30;var SOON_SENT=new Set();
function soonTick(){const now=Date.now();GAMES.forEach(g=>{if(g.status==='cancelled')return;const s=+new Date(g.starts_at),t=s-now;if(t>SOON_MIN*6e4||t<=60e3)return;
  const appr=PARTS.filter(p=>p.game_id===g.id&&p.status==='approved');if(appr.length<2)return;
  appr.forEach(p=>{const k=g.id+'|'+p.user_id+'|'+s;if(SOON_SENT.has(k))return;SOON_SENT.add(k);
    const since=p.role==='host'?(g.created_at||0):(p.approved_at||0);if(since&&s-since<SOON_MIN*6e4)return;   // 开打前 30 分钟内才加入 / 才发布的，不提醒
    notify(p.user_id,'soon',g.id,null)})})}
function soonOpen(id){const c=api.get(id);if(!c)return;const st=stateOf(c),os=c.appr.filter(p=>!ME||p.user_id!==ME.id).map(p=>U(p.user_id)).filter(Boolean),m=Math.max(0,Math.round((c.start-Date.now())/6e4));
  const nav=`https://maps.google.com/?daddr=${encodeURIComponent(c.v.name+' VIC')}`;
  UF_OPEN(`<div class="soon"><div class="sn-k">${m>0?`${m} 分钟后开打`:'已经开打'}</div><div class="sn-t num">${hm(c.start)} · ${esc(c.v.short)}</div>
    <div class="sn-p">${os.map(u=>`<span>${av(u,'sm')}${esc(u.name.split(' ')[0])}</span>`).join('')}</div>
    <div class="sn-b"><a class="btn btn-p" href="${nav}" target="_blank" rel="noopener">导航</a>${chatGameBtn(c,st)?`<button class="btn btn-s" data-sn="chat" data-g="${id}">球局聊天</button>`:''}</div>
    ${pactHTML(true)}<button class="btn btn-s w100" data-sn="close" style="margin-top:12px">好的，球场见</button></div>`)}
document.addEventListener('click',e=>{const b=e.target.closest('[data-sn]');if(!b)return;e.stopPropagation();if(b.dataset.sn==='close'){UF_CLOSE();return}
  if(b.dataset.sn==='chat'){UF_CLOSE();setTimeout(()=>{const t=gameThread(b.dataset.g,true);if(t)openThread(t.id)},200)}},true);

// ---------- 球友约定 ----------
const PACT=['准时到场；来不了，尽早在球局里告诉大家','尊重每一位球友，不论水平、年龄、性别和背景','真诚友善，多鼓励，不嘲讽，不争执','守住边界：不骚扰、不推销，对方没同意时不索要联系方式','场地、用球等费用提前说清，按约分摊'];
const PACT_RULE='违反约定的行为，一经核实，将视情节暂停账号，最长 6 个月；情节严重的，永久封禁。';
const PACT_WHY='南伴球是以友好为本的球友社区，任何破坏社区氛围的行为都不被接受。';
function pactHTML(compact){return `<div class="pact${compact?' sm':''}"><b>球友约定</b><ol>${PACT.map(x=>`<li>${x}</li>`).join('')}</ol><p>${PACT_RULE}${compact?'':'<br>'+PACT_WHY}</p></div>`}
function pactOpen(){UF_OPEN(`<div class="pactsh">${pactHTML(false)}<button class="btn btn-s w100" data-pact="close" style="margin-top:12px">知道了</button></div>`)}
var PACT_NEXT=null;
function pactGate(next){if(!ME||ME.pact_at){next();return}PACT_NEXT=next;
  UF_OPEN(`<div class="pactsh"><div class="pact-h">开始约球之前</div><p class="pact-s">每一次见面，都是一次信任。请花 10 秒读一下：</p>${pactHTML(false)}
    <button class="btn btn-p w100" data-pact="ok" style="margin-top:14px">同意并继续</button><button class="btn btn-s w100" data-pact="close" style="margin-top:8px">再想想</button></div>`)}
document.addEventListener('click',e=>{const b=e.target.closest('[data-pact]');if(!b)return;e.stopPropagation();e.preventDefault();const k=b.dataset.pact;
  if(k==='1'){pactOpen();return}
  if(k==='ok'&&ME){const n=PACT_NEXT;PACT_NEXT=null;
    if(typeof NBQ_NET!=='undefined'&&NBQ_NET){NBQ_NET.post('/api/me/pact').then(r=>{if(r.ok){ME.pact_at=Date.now();UF_CLOSE();if(n)setTimeout(n,260)}else toast(apiErrText(r.code))});return}   // 真实模式：同意约定要先记到数据库
    ME.pact_at=Date.now();UF_CLOSE();if(n)setTimeout(n,260);return}
  PACT_NEXT=null;UF_CLOSE()},true);
if(typeof gateApply==='function'){const _pgA=gateApply;gateApply=function(id,next){pactGate(()=>_pgA(id,next))}}
{const _pgC=openCreate;openCreate=function(){if(ME&&!ME.pact_at){pactGate(()=>openCreate());return}return _pgC.apply(this,arguments)}}
// 演示用户默认已同意；新注册的球友第一次申请 / 发起 / 约人时会看到
const nrPactSeed=()=>{if(USERS)Object.values(USERS).forEach(u=>{if(u.pact_at===undefined)u.pact_at=1})};nrPactSeed();
{const _nrSeed=seed;seed=function(){_nrSeed.apply(this,arguments);nrPactSeed();SOON_SENT=new Set();NR_Q=[];NR_LOG=[]}}

// ---------- 事件补齐 ----------
// 顺延：待确认的人也通知；已加入的人可以无责退出（和修改球局一样）
// 有人退出后又有空位：之前因满员没排上的人，告诉一次（开打前 1 小时以上）
{const _nrLeave=api.leave;api.leave=function(id){const g=GAMES.find(g=>g.id===id);
  if(g&&ME&&g.host_id===ME.id){toast('你是发起人，可以取消球局');return}
  const p=PARTS.find(p=>p.game_id===id&&p.user_id===ME.id),was=p&&p.status;const r=_nrLeave.apply(this,arguments);
  if(was==='pending')NOTIFS.filter(n=>n.kind==='request'&&n.game_id===id&&n.from===ME.id).forEach(n=>{n.read=true;n.hide=true});
  if(was==='approved'&&g&&g.visibility!=='private'&&new Date(g.starts_at)-Date.now()>36e5){const c=V(g);if(c.spots>0)PARTS.filter(q=>q.game_id===id&&q.status==='rejected'&&q.reason==='full_auto'&&!q.reopenTold).forEach(q=>{q.reopenTold=true;notify(q.user_id,'reopen',id,g.host_id)})}
  nrBadge();return r}}
// 新的修改 / 顺延通知出来后，同一局之前的那条收起来，只留最新的
{const _nrNotify=notify;notify=function(uid,kind,gid,from){const r=_nrNotify.apply(this,arguments);
  if(['changed','postponed'].includes(kind)){const all=NOTIFS.filter(n=>n.user_id===uid&&n.game_id===gid&&['changed','postponed'].includes(n.kind));all.slice(1).forEach(n=>{n.hide=true;n.read=true})}
  // 同一个人对同一局再次申请：只留最新那条申请通知（旧的收起），避免发起人看到两条待处理
  if(kind==='request'){NOTIFS.filter(n=>n.user_id===uid&&n.game_id===gid&&n.kind==='request'&&n.from===from).slice(1).forEach(n=>{n.hide=true;n.read=true})}
  return r}}
// 邀约过期：告诉发起邀约的人一声；收到邀约的人那条不再算未处理
var INV_TOLD=new Set();
function invExpTick(){INVITES.forEach(i=>{if(!['pending','counter'].includes(i.status)||!invExpired(i)||INV_TOLD.has(i.id))return;INV_TOLD.add(i.id);
  NOTIFS.filter(n=>n.invite_id===i.id&&['invite','invite_counter'].includes(n.kind)).forEach(n=>n.read=true);
  const who=i.status==='counter'?i.to:i.from,other=who===i.from?i.to:i.from;notifyInv(who,'invite_expired',i,other)})}
// 邀约也走统一的提醒和邮件
notifyInv=function(uid,kind,inv,from){const n={id:++NID,user_id:uid,kind,invite_id:inv.id,game_id:inv.game_id||null,from,at:Date.now(),read:false};NOTIFS.unshift(n);
  if(ME&&uid===ME.id)INV_RENDER();nrDeliver(n);if(typeof emQueue==='function')emQueue(uid,kind,'i'+inv.id,n.id);return n};
Object.assign(EM_KIND,{unfilled:'change',invite:'request',invite_counter:'request',invite_accepted:'result',invite_declined:'result'});

// ---------- 聊天：同一个对话 5 分钟内只提醒一次；少遇到的人不提醒 ----------
var NR_CHAT={};
function nrChat(t,m,show){if(!ME||!m||m.from===ME.id)return;if(typeof msgQuiet==='function'&&msgQuiet(ME.id,m)){nrLog({user_id:ME.id,t:'私信'},'不提醒','你设过少遇到');return}
  const now=Date.now(),k=t.id;if(NR_CHAT[k]&&now-NR_CHAT[k]<5*6e4){nrLog({user_id:ME.id,t:(U(m.from)||{name:''}).name+' 的消息'},'同一对话 5 分钟内已提醒过');nrBadge();return}NR_CHAT[k]=now;
  const g=t.type==='game'?GAMES.find(x=>x.id===t.game_id):null;
  nrDeliver({user_id:ME.id,kind:g&&new Date(g.starts_at)-now<24*36e5?'chat_soon':'chat',game_id:g?g.id:null,from:m.from,t:(U(m.from)||{name:''}).name,b:m.text,read:false},{show,tap:()=>openThread(t.id)})}
// 群聊 / 私信：加入之前的历史不算未读；取消的、结束 48 小时后的群不算
{const _nrCxU=cxUnread;cxUnread=function(t){if(t.type==='game'){const g=GAMES.find(x=>x.id===t.game_id);if(!g||g.status==='cancelled'||rcEnd(g)<Date.now()-48*36e5)return 0;
  const p=PARTS.find(p=>p.game_id===g.id&&p.user_id===ME.id),j=p&&p.approved_at;if(j){const k=ME.id+'|'+t.id;if((LASTREAD[k]||0)<j)return tMsgs(t).filter(m=>m.from!==ME.id&&m.at>j).length}}return _nrCxU(t)}}

// ---------- 提醒方式（两端一样） ----------
function nrWhere(){const d=nrDev(ME);if(d.mobile.push)return '会推送到你的手机';if(NR_PLAT==='desktop')return '会在右上角的<svg class="ibell"><use href="#i-bell"/></svg>里提醒你，用手机开启推送能第一时间知道';
  return '会出现在「消息」里'+(typeof ENV!=='undefined'&&ENV==='wechat'?'':'，开启推送能第一时间知道')}
function nrSetHTML(){const d=nrDev(ME),mob=NR_PLAT==='mobile';
  const row=(ic,t,s,btn)=>`<div class="nrs-r"><span class="nrs-i">${ic}</span><div><b>${t}</b><small>${s}</small></div>${btn||''}</div>`;
  return `<div class="nrs"><div class="nrs-h">提醒方式</div>
  ${row('📱','手机',d.mobile.push?'已开启':mob?'未开启':'用手机打开南伴球，添加到主屏幕后开启',mob&&!d.mobile.push?'<button class="nrs-b p" data-a="enablePush">开启</button>':'')}
  ${row('✉️','邮件',ME.email?esc(ME.email):'默认不发',`<button class="nrs-b" data-em="settings">${ME.email?'修改':'设置'}</button>`)}
  ${typeof NBQ_NET!=='undefined'&&NBQ_NET?'<div id="nrDiag"></div>':''}</div>`}
// 推送自检（11-03）：设备订阅状态 + 最近提醒去向，来自 POST /api/me/push-diag（只在真实模式）。纯函数，单元测试直接测
const NR_KIND_ZH={request:'有人申请',approved:'申请被同意',rejected:'申请被婉拒',full:'球局满员',player_left:'有人退出',game_cancelled:'球局取消',joined:'有人加入',expired:'申请过期',unfilled:'没凑齐',unfilled_end:'没凑齐',postponed:'顺延',changed:'改了时间',soon:'快开始了',reopen:'重新开放'};
function nrAgo(t,now){if(!t)return'';const s=Math.max(0,Math.round((new Date(now)-new Date(t))/1000));return s<90?'刚刚':s<5400?Math.round(s/60)+' 分钟前':s<172800?Math.round(s/3600)+' 小时前':Math.round(s/86400)+' 天前'}
function nrDeliveryZh(x){const r=x.reason||'';if(r.startsWith('stale:'))return/^(404|410)$/.test(r.slice(6))?'没发：这台设备的推送订阅已失效':'没发：'+r.slice(6);
  if(x.channel==='push_mobile')return r==='go_kind'?'同时推送到手机（出发类提醒）':'推送到手机';
  if(x.channel==='push_desktop')return'推送到电脑';if(x.channel==='email')return'补发了邮件';
  if(x.channel==='none')return'没发送';
  return({active_device:'只在页面里提醒（你当时正在用设备）',no_push:'只在应用内（没有开启推送的设备）',merged:'合并进另一条推送',deferred_night:'夜间顺延'})[r]||'应用内'}
function nrDiagHTML(r){if(!r||!Array.isArray(r.devices))return'<small>读取失败，稍后再试</small>';
  const dv=r.devices.length?r.devices.map(d=>`<div class="nrl"><b>${d.platform==='mobile'?'手机':'电脑'}${d.this?'（这台）':''}</b><span>${d.push?'已订阅推送':'没订阅推送'}${d.push?(d.push_ok_at?' · 最近送达 '+nrAgo(d.push_ok_at,r.now):' · 还没成功送达过'):''}${d.last_active_at?' · 最近在用 '+nrAgo(d.last_active_at,r.now):''}</span></div>`).join(''):'<div class="nrl"><span>还没有登记的设备</span></div>';
  const tip=!r.devices.some(d=>d.push)?'<div class="nrl"><span>没有任何设备订阅了推送：先点上面的「开启提醒」</span></div>':(!r.devices.some(d=>d.this)?'<div class="nrl"><span>这台设备还没订阅推送（或订阅已失效）</span></div>':'');
  const rc=(r.recent||[]).length?r.recent.map(n=>`<div class="nrl"><b>${esc(NR_KIND_ZH[n.kind]||n.kind)} · ${nrAgo(n.created_at,r.now)}</b><span>${(n.deliveries||[]).length?n.deliveries.map(x=>esc(nrDeliveryZh(x))).join('；'):'还没发送'}${n.read_at?' · 已读':''}</span></div>`).join(''):'<div class="nrl"><span>还没有提醒</span></div>';
  return `<div class="nrs-h" style="margin-top:14px;font-size:14px">推送自检</div>${dv}${tip}<div class="nrs-h" style="margin-top:10px;font-size:14px">最近的提醒去了哪</div>${rc}`}
async function nrDiagLoad(){const el=document.getElementById('nrDiag');if(!el||typeof nbqPushDiag!=='function')return;el.innerHTML='<small>正在读取…</small>';let r=null;try{r=await nbqPushDiag()}catch(e){}if(document.getElementById('nrDiag'))document.getElementById('nrDiag').innerHTML=nrDiagHTML(r)}
function nrSettings(){if(!ME){toast('请先登录');return}UF_OPEN(nrSetHTML());nrDiagLoad()}
// 网页：通知面板里的引导 —— 先引导到手机，电脑通知是次要的
function nrWebCard(){const d=nrDev(ME);if(d.mobile.push)return'';
  return `<div class="pushcard nrw"><div class="ic"><svg width="20" height="20"><use href="#i-bell"/></svg></div><div style="flex:1"><b>在手机上接收提醒</b><p>用手机打开 nanbanqiu.app/${CITY.slug}，添加到主屏幕，提醒都会推送到手机</p></div></div>`}

// ---------- 演示：另一台设备 · 提醒去向 ----------
function nrDevSet(v){if(!ME)return;const d=nrDev(ME)[NR_OTHER];d.push=v!=='off';d.active=v==='active';nrDemoDraw()}
function nrDemoDraw(){const el=document.getElementById('nrDemo');if(!el)return;const d=ME?nrDev(ME)[NR_OTHER]:{},v=!ME?'':d.active?'active':d.push?'push':'off',nm=NR_OTHER==='mobile'?'手机':'电脑';
  const hn=NR_PLAT==='mobile'?'手机':'电脑';el.innerHTML=`<h4>这台${hn}</h4><div class="dseg">${[['here','正在用'],['away','离开了']].map(([k,l])=>`<button data-nraway="${k}" class="${(NR_AWAY?'away':'here')===k?'on':''}">${l}</button>`).join('')}</div><h4 style="margin-top:12px">另一台设备（${nm}）</h4><div class="dseg">${[['off','没开提醒'],['push','开着推送'],['active','正在用']].map(([k,l])=>`<button data-nrdev="${k}" class="${v===k?'on':''}"${ME?'':' disabled'}>${l}</button>`).join('')}</div><h4 style="margin-top:12px">提醒去向</h4><div id="nrLog"></div>`;nrLogDraw()}
function nrLogDraw(){const el=document.getElementById('nrLog');if(!el)return;const L=NR_LOG.filter(x=>x.me).slice(0,6);
  el.innerHTML=L.length?L.map(x=>`<div class="nrl"><b>${esc(x.t)}</b><span>${esc(x.dest)}${x.why?' · '+esc(x.why):''}</span></div>`).join(''):'<div class="nrl"><span>还没有提醒</span></div>'}
document.addEventListener('click',e=>{const b=e.target.closest('[data-nrdev]');if(!b)return;e.stopPropagation();nrDevSet(b.dataset.nrdev)},true);

// 演示：开打前 30 分钟 · 第一次申请
function soonDemo(){const now=Date.now();let g=GAMES.find(g=>g.status!=='cancelled'&&new Date(g.starts_at)>now&&PARTS.some(p=>p.game_id===g.id&&p.user_id==='jason'&&p.status==='approved')&&PARTS.filter(p=>p.game_id===g.id&&p.status==='approved').length>=2);
  if(!g)return null;g.starts_at=new Date(Math.floor((now+SOON_MIN*6e4-5e3)/6e4)*6e4).toISOString();PARTS.filter(p=>p.game_id===g.id).forEach(p=>{if(p.approved_at)p.approved_at=now-864e5});g.created_at=now-2*864e5;
  [...SOON_SENT].filter(k=>k.startsWith(g.id+'|')).forEach(k=>SOON_SENT.delete(k));soonTick();return g.id}
function pactDemo(){ME.pact_at=null;const g=api.list().find(c=>!c.past&&stateOf(c)==='open'&&!isW(c));return g&&g.id}

setInterval(()=>{if(!ME)return;soonTick();invExpTick();nrFlush()},30000);
{const _nrUf=ufKeep;ufKeep=function(){_nrUf();try{soonTick();invExpTick();nrFlush()}catch(e){}}}

document.addEventListener('click',e=>{const b=e.target.closest('[data-nraway]');if(!b)return;e.stopPropagation();NR_AWAY=b.dataset.nraway==='away';nrDemoDraw()},true);
document.addEventListener('click',e=>{const b=e.target.closest('[data-a="nrSet"]');if(!b)return;e.stopPropagation();nrSettings()},true);
{const _nrWho=setWho;setWho=function(){const r=_nrWho.apply(this,arguments);nrDemoDraw();return r}}
setTimeout(nrDemoDraw,300);

/* ---------- 通知 v2 · 复查修正 ---------- */
// 1 rcTick 防重入（网页红点刷新会间接再次触发 rcTick，导致同一条发两次）
{const _r=rcTick;let busy=false;rcTick=function(){if(busy)return;busy=true;try{return _r.apply(this,arguments)}finally{busy=false}}}
// 网页红点只更新数字，不触发整页渲染
if(NR_PLAT==='desktop'){nrBadge=function(){const n=nrBadgeN(),b=$('#nBadge');if(b){b.hidden=!n;b.textContent=n}}}
// 2 约定：邀约在函数里拦（同意后直接继续）
{const _ni=newInvite;newInvite=function(to){if(ME&&!ME.pact_at){pactGate(()=>newInvite(to));return}return _ni.apply(this,arguments)}}
{const _fa=finishAccept;finishAccept=function(i){if(ME&&!ME.pact_at){pactGate(()=>{finishAccept(i);INV_RENDER()});return}return _fa.apply(this,arguments)}}
// 11 邀约生成的私人球局：记下生成时间（30 分钟内才定下来的，不发开打前提醒）
{const _mg=makeGame;makeGame=function(i){const id=_mg.apply(this,arguments),g=GAMES.find(x=>x.id===id),now=Date.now();if(g)g.created_at=now;PARTS.filter(p=>p.game_id===id).forEach(p=>p.approved_at=now);return id}}
// 3 邀约邮件：单独一类，标题按种类写
Object.assign(EM_KIND,{invite:'invite',invite_counter:'invite',invite_accepted:'invite',invite_declined:'invite'});EM_RANK.invite=1;
// 10 开打前提醒：顺延后新的一条出来，旧的收起
{const _n2=notify;notify=function(uid,kind,gid,from){const r=_n2.apply(this,arguments);if(kind==='soon'){NOTIFS.filter(n=>n.user_id===uid&&n.game_id===gid&&n.kind==='soon').slice(1).forEach(n=>{n.hide=true;n.read=true})}return r}}

