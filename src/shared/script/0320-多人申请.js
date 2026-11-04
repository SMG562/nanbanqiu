/* ===================== 多人申请：发起人怎么挑 =====================
 * 申请列表默认按「推荐」排：你设过多遇到的 → 一起打过的 → 水平在范围内且接近 → 赴约率高 → 申请早；你设过少遇到的排最后。
 * 4 人以上可以切换排序；超过 6 人先显示 6 位，其余收起。申请人比空位多时，告诉发起人人齐后其余申请会自动结束（对方看到「这局已经满员」），
 * 所以发起人只需要挑够人，不用一个个婉拒。
 * 通知：同一局有 2 人以上申请时合并成一条；推送 10 分钟内同一局只提醒一次。 */
var RQ={sort:{},open:{}},RQ_MUTE=false,RQ_TITLE=null;
const RQ_WEB=typeof renderPop==='function',RQ_FOLD=6;
const RQ_BTN=RQ_WEB?{p:'btn btn-p btn-sm',s:'btn btn-s btn-sm',q:m=>`<div class="quote">“${esc(m)}”</div>`}:{p:'sbtn p',s:'sbtn',q:m=>`<q>“${esc(m)}”</q>`};
function rqTags(u){const t=[],k=playedCount(ME.id,u.id);
  if(followHas(ME.id,u.id))t.push('<span class="rq-t m">你设过多遇到</span>');
  if(k)t.push(`<span class="rq-t">一起打过 ${k} 场</span>`);
  if(lessHas(ME.id,u.id))t.push('<span class="rq-t l lt">你设过少遇到</span>');
  return t.length?`<div class="rq-ts">${t.join('')}</div>`:''}
function rqScore(c,p){const u=U(p.user_id),s=stats(u.id),mid=(c.ntrp_min+c.ntrp_max)/2,inR=u.ntrp>=c.ntrp_min-.25&&u.ntrp<=c.ntrp_max+.25;
  return (lessHas(ME.id,u.id)?1e6:0)-(followHas(ME.id,u.id)?1e5:0)-Math.min(playedCount(ME.id,u.id),10)*3000+(inR?0:2e4)+Math.abs(u.ntrp-mid)*1000+(1-(s.att==null?1:s.att))*8000}
function rqSorted(c){const k=RQ.sort[c.id]||'rec',L=c.pend.slice(),t=p=>p.created_at||0;
  if(k==='time')return L.sort((a,b)=>t(a)-t(b));
  if(k==='lvl'){const mid=(c.ntrp_min+c.ntrp_max)/2;return L.sort((a,b)=>Math.abs(U(a.user_id).ntrp-mid)-Math.abs(U(b.user_id).ntrp-mid)||t(a)-t(b))}
  return L.sort((a,b)=>rqScore(c,a)-rqScore(c,b)||t(a)-t(b))}
function rqRow(c,p,cmp){const u=U(p.user_id),s=stats(u.id);
  if(cmp)return `<div class="req rq-c" data-rqu="${u.id}"><div class="req-top"><button data-user="${u.id}">${av(u)}<div><b>${esc(u.name)}</b> <span class="lvchip" style="background:${LVCOLOR[s.lv]}">Lv${s.lv+1} ${LV[s.lv][1]}</span><div class="pm">UTR ${f1(u.ntrp)} · 已打 ${s.played} 场${wTrust(c,u)}</div>${rqTags(u)}</div></button>
    <div class="rq-a"><button class="${RQ_BTN.p}" data-a="approve" data-g="${c.id}" data-u="${u.id}">接受</button><button class="rq-no" data-sx="softNo" data-g="${c.id}" data-u="${u.id}">婉拒</button></div></div>${p.message?RQ_BTN.q(p.message):''}${etaLine(p)}</div>`;
  return `<div class="req" data-rqu="${u.id}"><div class="req-top"><button data-user="${u.id}">${av(u)}<div><b>${esc(u.name)}</b> <span class="lvchip" style="background:${LVCOLOR[s.lv]}">Lv${s.lv+1} ${LV[s.lv][1]}</span><div class="pm">UTR ${f1(u.ntrp)} · 已打 ${s.played} 场 · ${s.kudos} 个赞${wTrust(c,u)}</div>${rqTags(u)}</div></button><span class="pm">${ago(p.created_at)}</span></div>${p.message?RQ_BTN.q(p.message):''}${etaLine(p)}
    <div class="acts"><button class="${RQ_BTN.p}" data-a="approve" data-g="${c.id}" data-u="${u.id}">接受</button><button class="${RQ_BTN.s}" data-sx="softNo" data-g="${c.id}" data-u="${u.id}">婉拒</button></div></div>`}
function requestsHTML_(c){if(!(c.isHost&&c.pend.length&&!['past','cancelled'].includes(stateOf(c))))return'';
  const n=c.pend.length,k=RQ.sort[c.id]||'rec',L=rqSorted(c),open=RQ.open[c.id]||n<=RQ_FOLD+1,show=open?L:L.slice(0,RQ_FOLD);
  return `<div class="sec-t rq-h"><span>申请 · ${n}</span>${n>c.spots?`<span class="rq-sp">还差 ${c.spots} 位</span>`:''}</div>
  ${n>=4?`<div class="rq-sort">${[['rec','推荐'],['time','最早申请'],['lvl','水平接近']].map(([v,l])=>`<button data-rq="sort" data-g="${c.id}" data-v="${v}" class="${k===v?'on':''}">${l}</button>`).join('')}</div>`:''}
  ${n>c.spots?`<p class="rq-n">人齐后，其余申请会自动结束，对方看到的是「这局已经满员」</p>`:''}
  ${show.map(p=>rqRow(c,p,n>=4)).join('')}
  ${show.length<n?`<button class="rq-more" data-rq="more" data-g="${c.id}">展开其余 ${n-show.length} 位</button>`:''}`}
if(RQ_WEB)requestsHTML=requestsHTML_;else window.requestsHTML=requestsHTML_;
document.addEventListener('click',e=>{const b=e.target.closest('[data-rq]');if(!b)return;e.stopPropagation();const g=b.dataset.g;
  if(b.dataset.rq==='sort'){RQ.sort[g]=b.dataset.v;RQ.open[g]=false}
  if(b.dataset.rq==='more')RQ.open[g]=true;
  if(typeof renderDetail==='function')renderDetail();else render()},true);
// 从通知定位某位申请人：如果 TA 在收起的部分，先展开
if(typeof focusApplicant==='function'){const _rqFocus=focusApplicant;focusApplicant=function(uid){const g=UI.detail;if(g&&!RQ.open[g]){const c=api.get(g);if(c&&c.pend.length>RQ_FOLD+1){const i=rqSorted(c).findIndex(p=>p.user_id===uid);if(i>=RQ_FOLD){RQ.open[g]=true;setTimeout(()=>renderDetail(),0)}}}return _rqFocus(uid)}}

// ---------- 通知列表：同一局 2 人以上申请合并成一条 ----------
function ntfGroup(list){const out=[],done={};
  list.forEach(n=>{if(n.kind!=='request'){out.push(n);return}
    const ns=list.filter(x=>x.kind==='request'&&x.game_id===n.game_id),who=[...new Set(ns.map(x=>x.from))];
    if(who.length<2){out.push(n);return}
    if(done[n.game_id])return;done[n.game_id]=1;
    const g={id:'rg'+n.game_id,kind:'request_group',game_id:n.game_id,from:ns[0].from,who,at:ns[0].at,user_id:n.user_id};
    Object.defineProperty(g,'read',{get:()=>ns.every(x=>x.read),set:v=>ns.forEach(x=>x.read=v)});out.push(g)});
  return out}
function rqStack(n){const us=n.who.slice(0,2).map(U).filter(Boolean);return `<span class="rqs">${us.map(u=>av(u,'sm')).join('')}</span>`}
const _rqNtf=ntfText;ntfText=function(n){if(n.kind!=='request_group')return _rqNtf(n);
  const c=V(GAMES.find(g=>g.id===n.game_id)),names=n.who.slice(0,2).map(id=>U(id).name.split(' ')[0]).join('、'),k=n.who.length,pend=c.pend.length;
  return [k>2?`${names} 等 ${k} 人申请加入你的球局`:`${names} 申请加入你的球局`,`${relDay(c.start)} ${hm(c.start)} · ${c.v.short} · ${pend?`${pend} 人待确认`:c.spots<=0?'人齐了':'都处理好了'} ›`]};
document.addEventListener('click',e=>{const x=e.target.closest('[data-ntfo^="rg"]');if(!x||e.target.closest('button,[data-user]'))return;e.stopPropagation();
  const gid=x.dataset.ntfo.slice(2);NOTIFS.filter(n=>n.kind==='request'&&n.game_id===gid).forEach(n=>n.read=true);renderBadge&&renderBadge();openDetail(gid);
  setTimeout(()=>{const h=document.querySelector('#dBody .rq-h');if(h)h.scrollIntoView({behavior:'smooth',block:'start'})},380)},true);

// ---------- 推送：同一局 10 分钟内只提醒一次 ----------
const RQ_BN={};
const _rqNotify=notify;notify=function(uid,kind,gid,from){
  if(kind==='request'&&ME&&uid===ME.id){const now=Date.now(),b=RQ_BN[gid];
    if(b&&now-b.at<6e5){RQ_MUTE=true;try{return _rqNotify(uid,kind,gid,from)}finally{RQ_MUTE=false}}
    RQ_BN[gid]={at:now};const g=GAMES.find(x=>x.id===gid),c=g&&V(g),pend=c?c.pend.length:0;
    if(pend>=2){const f=U(from);RQ_TITLE=[`${f.name.split(' ')[0]} 等 ${pend} 人在等你确认`,`${relDay(c.start)} ${hm(c.start)} · ${c.v.short} · 还差 ${c.spots} 位`]}}
  try{return _rqNotify(uid,kind,gid,from)}finally{RQ_TITLE=null}};
if(typeof pushBanner==='function'){const _rqBan=pushBanner;pushBanner=function(t,b,f){if(RQ_MUTE)return;if(RQ_TITLE){[t,b]=RQ_TITLE}return _rqBan(t,b,f)}}
if(typeof deskNotify==='function'){const _rqDesk=deskNotify;deskNotify=function(t,b,f){if(RQ_MUTE)return;if(RQ_TITLE){[t,b]=RQ_TITLE}return _rqDesk(t,b,f)}}

