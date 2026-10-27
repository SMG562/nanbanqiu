/* =====================================================================
 * 账号状态（与后台 UST、schema users.status 一致）
 *   active 正常 · review 待核实 · limited 受限 · suspended 暂停（必须有到期时间）· banned 封禁 · deleted 已注销（30 天内可恢复）
 * 权限（服务端 can_act() 同一套规则，前台只负责提示和拦截）：
 *   review     看不到、也不能报名女生局；其余正常
 *   limited    不能报名女生局；不能私信、约没一起打过的球友；普通球局照常
 *   suspended  到期前只能浏览：不能发起、申请、直接加入、约人、接受邀约、发消息；待确认的申请自动撤回，已确认的球局保留
 *   banned     不能登录；已报名的局自动退出、发起的未开打球局自动取消并通知
 *   deleted    本人注销：已报名的局退出、发起的未开打球局取消并通知；30 天内重新登录可恢复
 * ===================================================================== */
const ACCT_WRITE=['apply','join','create','invite','accept','chat','counter'];
const ACCT_DEL_KEEP=30*864e5;
const acctSt=u=>{if(!u)return'active';if(u.status==='suspended'&&u.status_until&&u.status_until<=Date.now()){u.status='active';u.status_until=null;u.status_reason=null}return u.status||'active'};
const acctDate=t=>{const d=new Date(t);return `${d.getMonth()+1}月${d.getDate()}日`};
// 能不能做：返回 null = 可以；否则返回拦截原因的种类
function acctCan(action,o={}){if(!ME)return null;const s=acctSt(ME);
  if(s==='active')return null;
  if(s==='suspended'&&ACCT_WRITE.includes(action))return'suspended';
  if((s==='review'||s==='limited')&&(action==='apply'||action==='join')&&o.women)return s;
  if(s==='limited'&&(action==='invite'||action==='chat'||action==='accept')&&o.to&&!playedTogether(ME.id,o.to))return'limited';
  if(s==='banned'||s==='deleted')return s;
  return null}
function acctText(s){const u=ME,why=u&&u.status_reason?`<p class="ac-why">原因：${esc(u.status_reason)}</p>`:'',mail='<p class="ac-mail">有疑问可以写信到 <a href="mailto:safety@nanbanqiu.com?subject='+encodeURIComponent('账号申诉')+'">safety@nanbanqiu.com</a></p>';
  if(s==='suspended')return [`账号暂停中`,`${u.status_until?acctDate(u.status_until)+' 恢复。':''}这期间可以浏览球局，暂时不能发起、申请、约人和发消息。`,why+mail];
  if(s==='limited')return ['这个操作暂时不可用','你的账号目前受限：不能报名女生局，也不能私信或约没一起打过的球友。普通球局照常。',why+mail];
  if(s==='review')return ['账号核实中','核实期间暂时看不到女生局，其余功能正常，通常 24 小时内完成。',mail];
  if(s==='banned')return ['账号已封禁','这个账号已不能使用。',why+mail];
  return ['账号已注销','',''] }
function acctBlock(s,action){if(action!=='info')track('account_blocked',{action,status:s});const[t,b,x]=acctText(s);
  UF_OPEN(`<div class="acsh"><div class="ac-h">${t}</div><p class="ac-b">${b}</p>${x}<button class="btn btn-s w100" data-ac="close" style="margin-top:14px">知道了</button></div>`)}
// 统一拦截：返回 true = 已拦下
function acctGuard(action,o){const s=acctCan(action,o);if(!s)return false;acctBlock(s,action);return true}

// ---------- 接入各个入口（函数层拦截，登录后自动继续的流程也会经过这里） ----------
if(typeof gateApply==='function'){const _g=gateApply;gateApply=function(id,next){const c=api.get(id),w=c&&isW(c);if(acctGuard('apply',{women:w}))return;return _g.apply(this,arguments)}}
{const _oc=openCreate;openCreate=function(){if(acctGuard('create'))return;return _oc.apply(this,arguments)}}
{const _ni=newInvite;newInvite=function(to){if(acctGuard('invite',{to}))return;return _ni.apply(this,arguments)}}
{const _fa=finishAccept;finishAccept=function(i){const to=i&&(i.from===(ME&&ME.id)?i.to:i.from);if(acctGuard('accept',{to}))return;return _fa.apply(this,arguments)}}
{const _cs=cxSend;cxSend=function(text){const t=CXCUR&&THREADS.find(x=>x.id===CXCUR),to=t&&t.type==='dm'?cxOther(t):null;if(acctGuard('chat',{to}))return;return _cs.apply(this,arguments)}}
document.addEventListener('click',e=>{const b=e.target.closest('[data-iv="counter"],[data-iv="sendCounter"],[data-ug="join"]');if(!b||!ME)return;
  const s=b.dataset.ug==='join'?acctCan('join',{women:(()=>{const c=api.get(b.dataset.g||UI.detail||UI.sel);return !!(c&&isW(c))})()}):acctCan('counter');
  if(s){e.stopPropagation();e.preventDefault();acctBlock(s,b.dataset.ug==='join'?'join':'counter')}},true);
document.addEventListener('click',e=>{const b=e.target.closest('[data-ac]');if(!b)return;e.stopPropagation();e.preventDefault();const k=b.dataset.ac;
  if(k==='close'){UF_CLOSE();return}
  if(k==='info'){acctBlock(acctSt(ME),'info');return}
  if(k==='del'){acctDelOpen();return}
  if(k==='delGo'){acctDelete();return}
  if(k==='restore'){acctRestore();return}
  if(k==='newAcct'){UF_CLOSE();ME=null;if(typeof UI!=='undefined')UI.sel=null;render();toast('已退出');return}},true);

// ---------- 状态变化（真实环境在服务端执行；原型里由后台或演示调用） ----------
function acctSet(uid,status,{until=null,reason=null}={}){const u=U(uid);if(!u)return;const from=acctSt(u);u.status=status;u.status_until=status==='suspended'?until:null;u.status_reason=reason;u.status_since=Date.now();
  const now=Date.now(),mine=GAMES.filter(g=>g.status!=='cancelled'&&new Date(g.starts_at)>now);
  if(status==='suspended'||status==='banned'||status==='deleted')   // 待确认的申请自动撤回
    PARTS.filter(p=>p.user_id===uid&&p.status==='pending'&&mine.some(g=>g.id===p.game_id)).forEach(p=>{p.status='withdrawn';p.left_at=now;NOTIFS.filter(n=>n.kind==='request'&&n.game_id===p.game_id&&n.from===uid).forEach(n=>{n.read=true;n.hide=true})});
  let left=0,cancelled=0;
  if(status==='banned'||status==='deleted'){
    PARTS.filter(p=>p.user_id===uid&&p.status==='approved'&&p.role!=='host'&&mine.some(g=>g.id===p.game_id)).forEach(p=>{const g=GAMES.find(x=>x.id===p.game_id);p.status='left';p.left_at=now;left++;if(g.status==='full')g.status='open';notify(g.host_id,'player_left',g.id,uid)});
    mine.filter(g=>g.host_id===uid).forEach(g=>{g.status='cancelled';g.cancelled_at=now;cancelled++;PARTS.filter(p=>p.game_id===g.id&&p.user_id!==uid&&['approved','pending'].includes(p.status)).forEach(p=>notify(p.user_id,'game_cancelled',g.id,uid))});
    INVITES.filter(i=>(i.from===uid||i.to===uid)&&['pending','counter'].includes(i.status)).forEach(i=>i.status='withdrawn')}
  if(status!=='deleted'&&status!==from){NR_EXTRA={st:status,until:u.status_until,reason};try{notify(uid,'account_status',null,null)}finally{NR_EXTRA=null}}
  return {left,cancelled}}
const _acNtf=ntfText;ntfText=function(n){if(n.kind!=='account_status')return _acNtf(n);const s=n.st||'active',why=n.reason?`原因：${n.reason} · `:'';
  return {suspended:[`账号已暂停到 ${n.until?acctDate(n.until):''}`,`${why}这期间可以浏览，不能发起、申请和发消息 ›`],limited:['账号已受限',`${why}不能报名女生局、不能私信和约没一起打过的球友 ›`],review:['账号核实中','暂时看不到女生局，通常 24 小时内完成 ›'],banned:['账号已封禁',why+'›'],active:['账号已恢复正常','所有功能都可以用了']}[s]||['账号状态有变化','›']};
if(typeof NR_SYS!=='undefined')NR_SYS.add('account_status');
{const _no=nrOpen;nrOpen=function(n){if(n&&n.kind==='account_status'){n.read=true;nrBadge();if(acctSt(ME)!=='active')acctBlock(acctSt(ME),'info');return}return _no.apply(this,arguments)};if(NR_PLAT==='mobile')ntfOpen=nrOpen}

// ---------- 注销与恢复 ----------
function acctDelOpen(){if(!ME)return;const now=Date.now(),up=GAMES.filter(g=>g.status!=='cancelled'&&new Date(g.starts_at)>now),
  joined=PARTS.filter(p=>p.user_id===ME.id&&p.status==='approved'&&p.role!=='host'&&up.some(g=>g.id===p.game_id)).length,hosted=up.filter(g=>g.host_id===ME.id).length;
  UF_OPEN(`<div class="acsh"><div class="ac-h">注销账号</div><ul class="ac-l">
    <li>你的球员卡和资料不再对其他人显示</li>
    ${joined?`<li>已加入的 ${joined} 场球局会自动退出，发起人会收到通知</li>`:''}
    ${hosted?`<li>你发起、还没开打的 ${hosted} 场球局会取消，并通知已加入的人</li>`:''}
    <li>30 天内用同一个手机号登录，可以恢复账号；之后资料会被永久删除，只保留不含个人信息的统计</li></ul>
    <button class="btn btn-d w100" data-ac="delGo" style="margin-top:14px">确认注销</button><button class="btn btn-s w100" data-ac="close" style="margin-top:8px">取消</button></div>`)}
function acctDelete(){if(!ME)return;const u=ME,r=acctSet(u.id,'deleted',{reason:'本人注销'});u.deleted_at=Date.now();
  track('account_delete',{upcoming_left:r.left,hosted_cancelled:r.cancelled});UF_CLOSE();
  ME=null;if(typeof UI!=='undefined')UI.sel=null;render();if(typeof anNewAnon==='function')setTimeout(()=>{try{if(!ME)anNewAnon()}catch(_){}},0);
  setTimeout(()=>toast('账号已注销，30 天内登录可以恢复'),200)}
function acctRestore(){if(!ME)return;ME.status='active';ME.status_reason=null;ME.deleted_at=null;track('account_restore',{});UF_CLOSE();render();toast('账号已恢复')}
// 登录时：注销 30 天内 → 问要不要恢复；封禁 → 不能登录
{const _sw=setWho;setWho=function(id){const r=_sw.apply(this,arguments);const u=ME;if(!u)return r;const s=acctSt(u);
  if(s==='deleted'){if(u.deleted_at&&Date.now()-u.deleted_at>ACCT_DEL_KEEP){ME=null;render();toast('这个账号已注销超过 30 天，可以用手机号重新注册');return r}
    UF_OPEN(`<div class="acsh"><div class="ac-h">恢复账号？</div><p class="ac-b">这个账号在 ${acctDate(u.deleted_at||Date.now())} 申请了注销，${acctDate((u.deleted_at||Date.now())+ACCT_DEL_KEEP)} 前都可以恢复。恢复后资料和球员卡照旧，之前退出的球局不会自动恢复。</p>
      <button class="btn btn-p w100" data-ac="restore" style="margin-top:14px">恢复账号</button><button class="btn btn-s w100" data-ac="newAcct" style="margin-top:8px">不恢复</button></div>`)}
  else if(s==='banned'){ME=null;render();acctBlockBanned(u)}
  return r}}
function acctBlockBanned(u){const why=u.status_reason?`<p class="ac-why">原因：${esc(u.status_reason)}</p>`:'';track('account_blocked',{action:'login',status:'banned'});
  UF_OPEN(`<div class="acsh"><div class="ac-h">账号已封禁</div><p class="ac-b">这个账号已不能使用。</p>${why}<p class="ac-mail">有疑问可以写信到 <a href="mailto:safety@nanbanqiu.com?subject=${encodeURIComponent('账号申诉')}">safety@nanbanqiu.com</a></p><button class="btn btn-s w100" data-ac="close" style="margin-top:14px">知道了</button></div>`)}

// ---------- 我的页：状态提示 + 注销入口 ----------
function acctNoteHTML(){if(!ME)return'';const s=acctSt(ME);if(s==='active')return'';const[t]=acctText(s);
  return `<button class="acnote" data-ac="info"><b>${t}</b><span>${s==='suspended'&&ME.status_until?acctDate(ME.status_until)+' 恢复':s==='limited'?'部分功能受限':s==='review'?'通常 24 小时内完成':''} ›</span></button>`}
const acctDelLink=()=>ME?'<button class="acdel" data-ac="del">注销账号</button>':'';
if(NR_PLAT==='mobile'){const _rm=renderMe;renderMe=function(){_rm.apply(this,arguments);const b=$('#meBody');if(!b||!ME)return;b.insertAdjacentHTML('afterbegin',acctNoteHTML());b.insertAdjacentHTML('beforeend',acctDelLink())}}
else{const _ph=profileHTML;profileHTML=function(){return acctNoteHTML()+_ph.apply(this,arguments)+acctDelLink()}}

// ---------- 女生局：待核实 / 封禁不能看 ----------
// （womenOK 已包含 status 判断，见上方定义的文本修改）

// ---------- 演示 ----------
function acctDemo(kind){const id='jason';if(kind==='restore'){acctSet(id,'active');return}
  if(kind==='suspended')acctSet(id,'suspended',{until:Date.now()+7*864e5,reason:'多次爽约'});
  else if(kind==='limited')acctSet(id,'limited',{reason:'被多人举报'});}
// 其他演示开始前，把 Jason 的账号状态还原（不触发通知和连带处理）
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-demo]');if(!b||b.dataset.demo==='acct')return;const u=USERS&&USERS.jason;if(u&&u.status&&u.status!=='active'){u.status='active';u.status_until=null;u.status_reason=null;NOTIFS.forEach(x=>{if(x.user_id==='jason'&&x.kind==='account_status'){x.hide=true;x.read=true}})}},true);


