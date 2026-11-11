/* ============================== 球友（#110 PR-B1） ==============================
 * 关系只有两种来源：一起打过（前台按球局算，不落表）+ 当面扫码、对方确认（服务器 buddies 表）。没有远程「加好友」，不显示球友数。
 * 数据：BUDDY = {ok, list:[{uid, since}], incoming:[{id, from, at, exp}], outgoing:[{id, to, at, exp}]}，只认服务器：
 *   读入 nbqLoadAll（开关开时读 GET /api/buddies，卡片进 USERS）→ nbqApply → nbqBuddiesIn；没读到（null）保留之前的，不清空。
 *   写走 nbqWrite（成功后整体重读，页面以服务器为准）；失败由 nbqWrite 提示并重读。
 * 「我的球友」：开关开时替换个人页的「常一起打」—— 扫码球友 + 半年内一起打过的人（不再要求 ≥ 2 场）；多遇到在前，少遇到不显示；仅本人可见。
 *   待确认的申请常驻在这一节最上面（错过通知也找得到）。
 * 通知：buddy_request = 待处理（处理完之前保持未读，点开是确认页）；buddy_accepted 点开是 TA 的球员卡。
 * 确认页只有「确认」和「忽略」：没有拒绝，忽略不通知对方（页面上写明）。
 * 开关 NBQ_BUDDIES_ON：正式站默认关（上线闸门过了由所有者打开）；测试环境（分支预览，连测试库）开；
 *   localStorage nbq_ff_buddies=1 单独打开（真机预看、自动化测试）。关着时不读接口、不收这两种通知、个人页还是「常一起打」。
 * 演示模式（NBQ_NET 为空）：没有扫码球友和申请，只显示一起打过的人；演示截图基准不变（开关在演示环境是关的）。 */
const NBQ_BUDDIES_ON=(()=>{if(typeof NBQ_ENV!=='undefined'&&NBQ_ENV==='staging')return true;try{return localStorage.getItem('nbq_ff_buddies')==='1'}catch(_){return false}})();
var BUDDY={ok:false,list:[],incoming:[],outgoing:[]};
// 接口 → 前台：不是期望的形状 = 没读到 → null
function nbqFromBuddies(d){if(!d||typeof d!=='object'||!Array.isArray(d.buddies))return null;const ms=x=>Date.parse(x)||0;
  return{ok:true,list:d.buddies.filter(x=>x&&x.user_id).map(x=>({uid:x.user_id,since:ms(x.since)})),
    incoming:(d.incoming||[]).filter(x=>x&&x.id&&x.from_user).map(x=>({id:x.id,from:x.from_user,at:ms(x.created_at),exp:ms(x.expires_at)})),
    outgoing:(d.outgoing||[]).filter(x=>x&&x.id&&x.to_user).map(x=>({id:x.id,to:x.to_user,at:ms(x.created_at),exp:ms(x.expires_at)}))}}
function nbqBuddiesIn(b){if(b)BUDDY=b}
// 存进快照（nbq_snap）：连同我设了「少遇到」的人一起存 —— 刷新时偏好还没读回来，靠它不让这些人闪出来
function bdSnap(){if(!BUDDY.ok||!ME)return null;const p=ME.id+'>';return{...BUDDY,less:Object.keys(OPIN).filter(k=>k.startsWith(p)&&OPIN[k]&&OPIN[k].v==='less').map(k=>k.slice(p.length))}}
const bdHidden=uid=>lessHas(ME.id,uid)||(typeof NBQ_STALE!=='undefined'&&NBQ_STALE&&(BUDDY.less||[]).includes(uid));
// 还没失效、对方还在的待确认申请
const bdIn=()=>!ME?[]:BUDDY.incoming.filter(r=>r.exp>Date.now()&&U(r.from)&&!blockedPair(ME.id,r.from));
const bdWhen=t=>Date.now()-t<120e3?'刚刚':ago(t);
// 我的球友：扫码球友 ∪ 半年内一起打过的人；多遇到在前，其次最近一次（一起打 / 成为球友）更近的在前
function bdAll(){if(!ME)return[];const m=new Map();
  partnersOf(ME.id).forEach(x=>m.set(x.uid,{uid:x.uid,n:x.n,last:x.last,scan:false}));
  BUDDY.list.forEach(b=>{const o=m.get(b.uid);if(o){o.scan=true;o.last=Math.max(o.last,b.since)}else m.set(b.uid,{uid:b.uid,n:0,last:b.since,scan:true})});
  return[...m.values()].filter(x=>U(x.uid)&&!blockedPair(ME.id,x.uid)&&!bdHidden(x.uid))
    .sort((a,b)=>followHas(ME.id,b.uid)-followHas(ME.id,a.uid)||b.last-a.last)}
const bdLine=x=>x.n?`一起打过 ${x.n} 场`:'当面扫码认识';
const BD_SHOW=8;

/* ---- 画 ---- */
const bdReqHTML=r=>{const u=U(r.from);return `<button class="bd-req" data-act="bdOpen" data-id="${esc(r.id)}">${av(u)}<span class="bd-t"><b>${esc(u.name)}</b><small>想加你为球友 · ${esc(bdWhen(r.at))}扫了你的码</small></span><span class="go" aria-hidden="true">›</span></button>`};
function bdSectionHTML(){if(!ME)return'';const L=bdAll(),inc=bdIn();if(!L.length&&!inc.length)return'';
  const pals=L.slice(0,BD_SHOW).map(x=>{const u=U(x.uid);return `<button class="pal" data-user="${x.uid}">${av(u)}<b>${esc(u.name.split(' ')[0])}</b><small>${x.n?x.n+' 场':'扫码'}</small></button>`}).join('');
  return SX_SEC('我的球友','仅你可见',`<div class="bd">${inc.map(bdReqHTML).join('')}${L.length?`<div class="pals">${pals}</div>`:''}${L.length>BD_SHOW?`<button class="bd-all" data-act="bdList">全部 ${L.length} 位 ›</button>`:''}</div>`)}
{const _pals=partnersHTML;partnersHTML=function(){return NBQ_BUDDIES_ON?bdSectionHTML():_pals()}}
// 弹层：手机端底部弹层，网页端居中小弹窗
const bdShow=html=>{html=`<div class="bd-pk">${html}</div>`;if(typeof openSheet==='function')openSheet(html);else openModal(`<div class="m-b">${html}</div>`,'sm')};
const bdClose=()=>{try{if(typeof closeSheet==='function')closeSheet();else closeModal()}catch(_){}};
function bdConfirmHTML(r){const u=U(r.from),k=playedCount(ME.id,r.from);
  return `<div class="bd-cf">${av(u)}<b class="bd-nm">${esc(u.name)}</b><p>${esc(bdWhen(r.at))}扫了你的码，想加你为球友${k?` · 你们一起打过 ${k} 场`:''}</p>
    <div class="bd-bt"><button class="${SX_BTN.p}" data-act="bdAccept" data-id="${esc(r.id)}">确认</button><button class="${SX_BTN.s}" data-act="bdIgnore" data-id="${esc(r.id)}">忽略</button></div>
    <small class="bd-note">成为球友后，过几天想约也找得到对方。忽略不会通知 TA。</small></div>`}
function bdOpen(id,via){const r=bdIn().find(x=>x.id===id);if(!r){toast('这条申请已经处理过或失效了');render();return}
  track('buddy_request_open',{request_id:id,via});bdShow(bdConfirmHTML(r))}
function bdListOpen(){const L=bdAll();track('buddy_list_open',{n_buddies:L.filter(x=>x.scan).length,n_played:L.filter(x=>x.n).length});
  bdShow(`<div class="bd-ls"><div class="bd-h"><b>我的球友</b><small>仅你可见 · ${L.length} 位</small></div>${L.map(x=>{const u=U(x.uid);return `<button class="bd-row" data-user="${x.uid}">${av(u)}<span class="bd-t"><b>${esc(u.name)}</b><small>${esc(bdLine(x))}</small></span></button>`}).join('')}</div>`)}

/* ---- 确认 / 忽略：写服务器，成功后整体重读 ---- */
async function bdRespond(id,act){const r=BUDDY.incoming.find(x=>x.id===id);if(!r||!ME)return;
  if(!NBQ_NET){toast('演示模式里不能加球友');return}
  const d=await nbqWrite('bd:'+id,net=>net.post(`/api/buddies/requests/${encodeURIComponent(id)}/${act}`,{}));
  if(d===null)return;
  track('buddy_respond',{request_id:id,action:act,wait_min:Math.max(0,Math.round((Date.now()-r.at)/6e4))});
  NOTIFS.forEach(n=>{if(n.kind==='buddy_request'&&n.from===r.from&&!n.read)n.read=true});if(typeof nrBadge==='function')nrBadge();
  bdClose();const u=U(r.from);toast(act==='accept'?`你和 ${u?u.name.split(' ')[0]:'TA'} 成为球友了`:'已忽略，TA 不会收到通知');render()}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-act^="bd"]');if(!b||!ME)return;e.stopPropagation();e.preventDefault();
  const k=b.dataset.act,id=b.dataset.id;
  if(k==='bdOpen')bdOpen(id,'list');else if(k==='bdList')bdListOpen();else if(k==='bdAccept'||k==='bdIgnore')bdRespond(id,k==='bdAccept'?'accept':'ignore')},true);

/* ---- 通知：文案（纯文字，列表自己转义）、待处理、点开去哪 ---- */
{const _t=ntfText;ntfText=function(n){if(n&&(n.kind==='buddy_request'||n.kind==='buddy_accepted')){const u=U(n.from),nm=u?u.name:'一位球友';
  return n.kind==='buddy_request'?[`${nm} 想加你为球友`,'当面扫了你的码 · 点开确认 ›']:[`你和 ${nm} 成为球友了`,'以后想约，在「我的球友」里找 TA ›']}return _t.apply(this,arguments)}}
{const _td=nrTodo;nrTodo=function(n){if(n&&n.kind==='buddy_request')return bdIn().some(r=>r.from===n.from);return _td.apply(this,arguments)}}
{const _o=nrOpen;nrOpen=function(n){if(!n||(n.kind!=='buddy_request'&&n.kind!=='buddy_accepted'))return _o.apply(this,arguments);
  const push=typeof AN!=='undefined'&&AN.qp&&AN.qp.n!=null&&String(AN.qp.n)===String(n.id);
  if(n.kind==='buddy_request'){const r=bdIn().find(x=>x.from===n.from);if(r){bdOpen(r.id,push?'push':'notif');return}
    n.read=true;nrBadge();toast('这条申请已经处理过或失效了');return}
  n.read=true;nrBadge();if(U(n.from))openCard(n.from)};if(NR_PLAT==='mobile')ntfOpen=nrOpen}
