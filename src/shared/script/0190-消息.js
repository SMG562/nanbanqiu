/* ===================== 消息：球局群聊 + 球友私信 =====================
 * 只有同一局里已确认的人能进球局群聊；私信只限「一起打过球 / 同在一局 / 接受过邀约」的球友，陌生人没有入口
 * 不显示手机号、不发图片和链接；屏蔽后双方都看不到对方的消息；每条消息都可以举报
 */
var THREADS=[],MSGS=[],LASTREAD={},CXCUR=null;
const QUICK=['我到了','晚到 10 分钟','晚到 20 分钟','下雨了，还打吗？','我带球','谢谢，下次再约！'];
const gMembers=gid=>PARTS.filter(p=>p.game_id===gid&&p.status==='approved').map(p=>p.user_id);
const cxOther=t=>t.members.find(x=>x!==ME.id);
function cxMember(t,uid){return t.type==='game'?gMembers(t.game_id).includes(uid):t.members.includes(uid)}
function canDM(uid){if(!ME||uid===ME.id||blockedPair(ME.id,uid))return false;
  return gamesTogether(ME.id,uid).length>0||INVITES.some(i=>[i.from,i.to].includes(uid)&&[i.from,i.to].includes(ME.id)&&['pending','counter','accepted'].includes(i.status))}
function dmThread(uid,create){let t=THREADS.find(t=>t.type==='dm'&&t.members.includes(ME.id)&&t.members.includes(uid));if(!t&&create){t={id:'t'+(++NID),type:'dm',members:[ME.id,uid],...(NBQ_NET?{tmp:true}:{})};THREADS.push(t)}return t}
function gameThread(gid,create){let t=THREADS.find(t=>t.type==='game'&&t.game_id===gid);if(!t&&create){t={id:'t'+(++NID),type:'game',game_id:gid,...(NBQ_NET?{tmp:true}:{})};THREADS.push(t)}return t}
const tMsgs=t=>MSGS.filter(m=>m.tid===t.id&&!(ME&&blockedPair(ME.id,m.from)));
const lastMsg=t=>{const l=tMsgs(t);return l[l.length-1]};
function cxUnread(t){const lr=LASTREAD[ME.id+'|'+t.id]||0;return tMsgs(t).filter(m=>m.from!==ME.id&&m.at>lr).length}
function myThreads(){if(!ME)return[];return THREADS.filter(t=>cxMember(t,ME.id)&&lastMsg(t)&&!(t.type==='dm'&&blockedPair(ME.id,cxOther(t)))).sort((a,b)=>lastMsg(b).at-lastMsg(a).at)}
const chatUnread=()=>myThreads().reduce((a,t)=>a+cxUnread(t),0);
function gameClosed(t){if(t.type!=='game')return false;const g=GAMES.find(x=>x.id===t.game_id);return !g||g.status==='cancelled'||+new Date(g.starts_at)+g.duration_min*6e4+48*36e5<Date.now()}
function cxTitle(t){if(t.type==='dm')return U(cxOther(t)).name;const c=V(GAMES.find(g=>g.id===t.game_id));return `${relDay(c.start)} ${hm(c.start)} · ${c.v.short}`}
// 球局群聊头像（11-04 用户选定方案 C2）：浅绿圆角方块里放成员的圆头像，最多 4 人（2 人并排、3 人品字、4 人 2×2）；私信仍是圆头像，一眼分得清。
// 排序：别人在前、我在最后。成员资料还没读到的先跳过；一个都没有时退回网球图标。
function cxGroupMembers(t){const ids=gMembers(t.game_id).map(String),me=String(ME.id);return ids.filter(i=>i!==me).concat(ids.includes(me)?[me]:[]).map(i=>U(i)||U(+i)).filter(Boolean).slice(0,4)}
function cxAv(t){if(t.type==='dm')return av(U(cxOther(t)));const m=cxGroupMembers(t);
  return m.length?`<span class="cx-gt n${m.length}">${m.map(u=>av(u)).join('')}</span>`:`<span class="av cx-gav"><svg viewBox="0 0 100 100"><use href="#ball"/></svg></span>`}
const cxTime=at=>{const d=new Date(at),o=dOff(d);return o===0?hm(d):o===-1?'昨天':`${d.getMonth()+1}/${d.getDate()}`};

function inboxHTML(){const L=myThreads();
  if(!L.length)return `<div class="empty"><b>还没有消息</b>和球友一起打过球之后，可以在球员卡上发消息<br>加入球局后，也可以在球局里聊天</div>`;
  return `<div class="cx-list">${L.map(t=>{const m=lastMsg(t),n=cxUnread(t);return `<button class="cx-item${CXCUR===t.id?' on':''}" data-cx="open" data-t="${t.id}">${cxAv(t)}<span class="cx-mid"><b>${esc(cxTitle(t))}</b><span>${t.type==='game'&&m.from!==ME.id?esc(U(m.from).name.split(' ')[0])+'：':''}${esc(m.text)}</span></span><span class="cx-r"><small>${cxTime(m.at)}</small>${n?`<i>${n}</i>`:''}</span></button>`}).join('')}</div>`}
function threadHTML(t){const ms=tMsgs(t),closed=gameClosed(t),other=t.type==='dm'?U(cxOther(t)):null;
  const sub=t.type==='dm'?`一起打过 ${playedCount(ME.id,other.id)} 场`:`${gMembers(t.game_id).length} 人 · 球局聊天`;
  let last=0,h='';ms.forEach(m=>{if(m.at-last>30*6e4)h+=`<div class="cx-ts">${cxTime(m.at)}${dOff(new Date(m.at))===0?'':' '+hm(new Date(m.at))}</div>`;last=m.at;const me=m.from===ME.id,u=U(m.from);
    h+=`<div class="cx-m${me?' mine':''}">${me?'':`<span data-user="${u.id}">${av(u,'sm')}</span>`}<div>${!me&&t.type==='game'?`<small>${esc(u.name.split(' ')[0])}</small>`:''}<p>${esc(m.text)}</p></div></div>`});
  return `<div class="cx-th"><div class="cx-hd">${CX_BACK?`<button class="cx-back" data-cx="inbox">‹</button>`:''}${cxAv(t)}<div><b>${esc(cxTitle(t))}</b><small>${sub}</small></div>${t.type==='game'?`<button class="cx-link" data-cx="toGame" data-g="${t.game_id}">球局</button>`:`<button class="cx-link" data-user="${other.id}">球员卡</button>`}</div>
    <div class="cx-msgs" id="cxMsgs">${h||`<div class="cx-ts">${t.type==='game'?'和同局球友打个招呼吧':'说点什么吧'}</div>`}</div>
    ${closed?`<div class="cx-closed">球局已结束，聊天已关闭</div>`:`<div class="cx-quick">${QUICK.map(q=>`<button data-cx="quick" data-v="${q}">${q}</button>`).join('')}</div>
    <div class="cx-in"><input id="cxIn" maxlength="200" placeholder="${t.type==='game'?'发给同局球友':'发消息给 '+esc(other.name.split(' ')[0])}" autocomplete="off"><button data-cx="send">发送</button></div>
    <div class="cx-foot">不会显示你的手机号 · 只能发文字 · <a data-cx="report">举报</a></div>`}</div>`}
function openThread(tid){if(NBQ_NET){nbqThreadOpen(tid);return}cxDraw(tid)}   // 真实模式：先在服务器建会话、读消息，再画
function cxDraw(tid){CXCUR=tid;const t=THREADS.find(x=>x.id===tid);LASTREAD[ME.id+'|'+tid]=Date.now();CX_SHOW(t);INV_RENDER();
  setTimeout(()=>{const b=document.getElementById('cxMsgs');if(b)b.scrollTop=b.scrollHeight},30)}
function cxSend(text){text=String(text||'').trim().slice(0,200);if(!text)return;if(/https?:\/\/|www\./i.test(text)){toast('暂不支持发送链接');return}
  const t=THREADS.find(x=>x.id===CXCUR);if(NBQ_NET){nbqSendMsg(t,text);return}
  MSGS.push({tid:t.id,from:ME.id,text,at:Date.now()});LASTREAD[ME.id+'|'+t.id]=Date.now();cxDraw(t.id);
  if(t.type==='dm'){const o=cxOther(t);setTimeout(()=>{MSGS.push({tid:t.id,from:o,text:/晚到/.test(text)?'没事，慢慢来，我先热身 👌':/到了/.test(text)?'我也快到了！':'好的 👌',at:Date.now()});
    if(CXCUR===t.id&&document.getElementById('cxMsgs'))cxDraw(t.id);else{INV_RENDER();nrChat(t,lastMsg(t),()=>INV_BANNER(U(o).name,lastMsg(t).text,()=>openThread(t.id)))}},1600)}}
function chatBtnHTML(uid){if(!canDM(uid))return'';const t=dmThread(uid),n=t?cxUnread(t):0;return `<button class="kdb cxbtn" data-cx="dm" data-u="${uid}">💬 发消息${n?` · ${n} 条未读`:''}</button>`}
function chatGameBtn(c,st){if(!ME||!['approved','host'].includes(st)||c.appr.length<2)return'';const t=gameThread(c.id),n=t?cxUnread(t):0;
  return `<button class="${SX_BTN.s} cxgame" data-cx="game" data-g="${c.id}">💬 球局聊天${n?` · ${n} 条未读`:''}</button>`}
document.addEventListener('click',e=>{const el=e.target.closest('[data-cx]');if(!el)return;e.stopPropagation();const a=el.dataset.cx,d=el.dataset;
  if(!ME&&a!=='inbox'){toast('请先登录');return}
  switch(a){
    case'inbox':CXCUR=null;CX_INBOX();break;
    case'open':openThread(d.t);break;
    case'dm':openThread(dmThread(d.u,true).id);break;
    case'game':openThread(gameThread(d.g,true).id);break;
    case'quick':cxSend(d.v);break;
    case'send':{const i=document.getElementById('cxIn');cxSend(i&&i.value);break}
    case'toGame':CX_CLOSE();INV_GAME(d.g);break;
    case'report':toast('已收到举报，我们会尽快核实');break;
  }},true);
document.addEventListener('keydown',e=>{if(e.target.id==='cxIn'&&e.key==='Enter'){e.preventDefault();cxSend(e.target.value)}});
function seedChat(){THREADS=[];MSGS=[];LASTREAD={};CXCUR=null;const now=Date.now();
  const g=gameThread('g6',true),dm={id:'t1',type:'dm',members:['han','jason']};THREADS.push(dm);
  MSGS.push({tid:g.id,from:'tom',text:'明天 9 点见，我订了 3 号场',at:now-5*36e5},{tid:g.id,from:'grace',text:'好的👌 我带一筒新球',at:now-4.6*36e5},{tid:g.id,from:'jason',text:'收到，8:50 到',at:now-4.2*36e5},{tid:g.id,from:'tom',text:'明天可能有小雨，早上我看一下再说',at:now-40*6e4});
  MSGS.push({tid:'t1',from:'han',text:'周三双打打得很开心！',at:now-26*36e5},{tid:'t1',from:'jason',text:'我也是，你的网前太稳了',at:now-25.5*36e5},{tid:'t1',from:'han',text:'这周六上午有空吗？想再约一局单打',at:now-2*36e5});
  LASTREAD['jason|'+g.id]=now-4.2*36e5}
document.addEventListener('click',e=>{const b=e.target.closest('[data-cx2]');if(!b)return;e.stopPropagation();UI.msgTab=b.dataset.cx2;INV_RENDER()},true);

