/* ===================== 打完之后：只关于自己的选择 · 不等任何人回应 =====================
 * 赛后卡片对每位同场球友选「多遇到 / 随缘 / 少遇到」，再选这局对你来说「偏难 / 刚好 / 偏轻松」。
 * 设计原则：这是你给自己的推荐做的设置，不是向对方发出的请求——
 *   · 没有「等对方回应」这一步，也没有「互相」才出现的东西，所以不会有期待落空、没回音的难受；
 *   · 任何选择都不通知对方，也不会让对方看到的页面有任何变化（少遇到的人看到的是「TA 暂时不接受邀约」，和对方关闭邀约时完全一样）。
 * 多遇到：TA 发的局在你的列表里靠前；TA 新发了适合你的局，告诉你一声（同一个人每周最多一次，22:00–08:00 顺延到早上）。
 * 少遇到：TA 发的局排在后面；TA 不能直接加入你的局（照常申请）、不能约你；TA 的消息不再提醒你。
 * 提醒：结束 1 小时后一条「打得怎么样」，只发一次；22:00–08:00 顺延到早上 8 点；超过 24 小时没送出就不发。卡片 7 天内可以改，之后在球员卡上改。 */
const RC_DELAY=36e5,RC_WINDOW=7*864e5,FG_GAP=7*864e5;
var OPIN={},AFTER={},RCQ=[],FG_LAST={},LESS_IV={};
const rcEnd=g=>+new Date(g.starts_at)+g.duration_min*6e4;
const rcQuiet=t=>nrQuiet(t);   // 夜间（城市当地时间，默认 22:00–08:00）顺延到早上 8 点，和通知用同一个 nrQuiet
const opinOf=(a,b)=>(OPIN[a+'>'+b]||{}).v||'ok';
const lessHas=(a,b)=>opinOf(a,b)==='less';
const followHas=(a,b)=>opinOf(a,b)==='more';
function setOpin(a,b,v,gid){const was=opinOf(a,b),now=Date.now(),iv=LESS_IV[a+'>'+b]=LESS_IV[a+'>'+b]||[];
  if(v==='ok')delete OPIN[a+'>'+b];else OPIN[a+'>'+b]={v,at:now,gid:gid||null};
  // 记下「少遇到」生效的时间段：只有这段时间里收到的私信不提醒；改回之后，之前静音的消息也不会突然冒出未读
  if(was!=='less'&&v==='less')iv.push([now,Infinity]);if(was==='less'&&v!=='less'&&iv.length)iv[iv.length-1][1]=now}
function rcOthers(g,uid){return PARTS.filter(p=>p.game_id===g.id&&p.status==='approved'&&p.user_id!==uid&&U(p.user_id)&&!blockedPair(uid,p.user_id)).map(p=>p.user_id)}
function rcEligible(g,uid,now=Date.now()){if(!g||!uid||g.status==='cancelled')return false;const e=rcEnd(g);if(e>now||now-e>RC_WINDOW)return false;
  return PARTS.some(p=>p.game_id===g.id&&p.user_id===uid&&p.status==='approved')&&rcOthers(g,uid).length>0}
function rcQueue(uid,kind,gid,from,at=Date.now()){RCQ.push({uid,kind,gid,from,at:rcQuiet(at)})}
function rcTick(){const now=Date.now();
  GAMES.forEach(g=>{if(g.status==='cancelled')return;const e=rcEnd(g);if(e>now||now-e>RC_WINDOW)return;
    PARTS.filter(p=>p.game_id===g.id&&p.status==='approved').forEach(p=>{const k=g.id+'|'+p.user_id,a=AFTER[k]||(AFTER[k]={});if(a.notified||a.closed)return;
      if(!rcEligible(g,p.user_id,now)){a.notified=true;return}const due=rcQuiet(e+RC_DELAY);if(now<due)return;a.notified=true;
      if(now-due<864e5&&!nbqOn())notify(p.user_id,'recap',g.id,p.user_id)})});
  const t2=Date.now();RCQ.filter(x=>x.at<=t2).forEach(x=>{RCQ.splice(RCQ.indexOf(x),1);
    if(x.kind==='badge'){bdgNotify(x.uid,x.from);return}
    if(x.kind==='follow_game'){const g=GAMES.find(y=>y.id===x.gid);if(!g||g.status!=='open'||new Date(g.starts_at)<=t2||!followHas(x.uid,x.from))return}
    notify(x.uid,x.kind,x.gid,x.from)})}

// ---------- 多遇到：TA 新发了适合你的局 ----------
function fgFits(g,u){if(!u||g.visibility==='private'||blockedPair(u.id,g.host_id))return false;if(isW(V(g))&&!womenOK(u))return false;
  return u.ntrp>=g.ntrp_min-.5&&u.ntrp<=g.ntrp_max+.5}
function fgOnCreate(id){const g=GAMES.find(x=>x.id===id);if(!g)return;const now=Date.now();
  Object.keys(OPIN).forEach(k=>{const[a,b]=k.split('>');if(b!==g.host_id||OPIN[k].v!=='more')return;const u=U(a),key=a+'>'+b;
    if(!fgFits(g,u)||now-(FG_LAST[key]||0)<FG_GAP)return;FG_LAST[key]=now;rcQueue(a,'follow_game',id,b,now)})}
const _rcCreate=api.create;api.create=function(d){const id=_rcCreate.call(api,d);setTimeout(()=>{fgOnCreate(id);rcTick()},0);return id};

// ---------- 赛后卡片 ----------
// 结尾的好感受：一个数字 + 一句只属于这场的亮点（第一场 / 里程碑 / 第一次来这个球场 / 和同一个人第 N 场 / 本月第 N 场），不做成任务
const RC_MILE=[10,25,50,100,150,200,300,500];
function rcHero(g,uid){const s=stats(uid),n=s.played,c=V(g),os=rcOthers(g,uid),mine=GAMES.filter(x=>x.status!=='cancelled'&&rcEnd(x)<=Date.now()&&PARTS.some(p=>p.game_id===x.id&&p.user_id===uid&&p.status==='approved'));
  const st=new Date(g.starts_at),month=mine.filter(x=>{const d=new Date(x.starts_at);return d.getFullYear()===st.getFullYear()&&d.getMonth()===st.getMonth()}).length,
    atV=mine.filter(x=>x.venue_id===g.venue_id).length,pal=os.map(u=>[u,playedCount(uid,u)]).sort((a,b)=>b[1]-a[1])[0];
  const hl=n<=1?'你在南伴球的第一场 🎾':RC_MILE.includes(n)?`第 ${n} 场，一个小里程碑 🎉`:atV===1?`第一次在 ${esc(c.v.short)} 打球`:pal&&pal[1]>=3?`和 ${esc(U(pal[0]).name.split(' ')[0])} 一起打的第 ${pal[1]} 场`:`${st.getMonth()+1} 月的第 ${month} 场`;
  return {n,hl}}
const RC_OPT=[['more','多遇到'],['ok','随缘'],['less','少遇到']];
const RC_HINT={more:'TA 发的局会排在前面；TA 发了适合你的新局，告诉你一声',less:'TA 发的局排在后面；TA 不能直接加入你的局、不能约你；TA 的私信不再提醒你（同在一局时照常提醒）'};
function rcSeg(attr,uid,v,extra=''){return `<div class="rc-seg">${RC_OPT.map(([k,l])=>`<button ${attr}="${k}" data-u="${uid}"${extra} class="${v===k?'on':''}">${l}</button>`).join('')}</div>${RC_HINT[v]?`<p class="rc-lh">${RC_HINT[v]}</p>`:''}`}
function rcRow(gid,uid){const u=U(uid);
  return `<div class="rc-p"><div class="rc-u">${av(u)}<div><b>${esc(u.name)}</b><small>UTR ${f1(u.ntrp)}</small></div></div>${rcSeg('data-rc',uid,opinOf(ME.id,uid),` data-g="${gid}"`)}</div>`}
function rcHTML(gid){const g=GAMES.find(x=>x.id===gid),c=V(g),me=ME.id,a=AFTER[gid+'|'+me]||{},os=rcOthers(g,me),h=rcHero(g,me);
  return `<div class="uf rc" data-g="${gid}"><div class="rc-hero"><small>${relDay(c.start)} ${hm(c.start)} · ${esc(c.v.short)}</small><div class="rc-num">第 <b>${h.n}</b> 场</div><p>${h.hl}</p>${bdgRecapHTML()}</div>
    <div class="rc-tip">顺手记一下，也可以直接关掉</div>
    <div class="rc-q">以后想多遇到吗？</div><div class="rc-l">${os.map(u=>rcRow(gid,u)).join('')}</div>
    <div class="rc-q">这局对你来说</div><div class="rc-seg rc-feel">${[['hard','偏难'],['ok','刚好'],['easy','偏轻松']].map(([k,l])=>`<button data-rc="feel" data-g="${gid}" data-v="${k}" class="${a.feel===k?'on':''}">${l}</button>`).join('')}</div>
    <p class="rc-priv">只影响你自己看到的推荐，对方不会知道，也不会收到任何通知</p>
    <button class="btn btn-p w100" data-rc="done" data-g="${gid}">好了</button></div>`}
function rcOpen(gid){if(!ME)return;const g=GAMES.find(x=>x.id===gid);if(!rcEligible(g,ME.id)){toast('这局已经过了可以填写的时间');return}
  const k=gid+'|'+ME.id;(AFTER[k]=AFTER[k]||{}).seen=true;AFTER[k].notified=true;UF_OPEN(rcHTML(gid))}
function rcRedraw(gid){const el=document.querySelector('.rc');if(el)el.outerHTML=rcHTML(gid)}
document.addEventListener('click',e=>{const b=e.target.closest('[data-rc]');if(!b||!ME)return;e.stopPropagation();const k=b.dataset.rc,gid=b.dataset.g,uid=b.dataset.u,me=ME.id;
  if(k==='open'){rcOpen(gid);return}
  const key=gid+'|'+me,a=AFTER[key]=AFTER[key]||{};
  if(k==='more'||k==='ok'||k==='less'){if(nbqOn()){nbqRecapPref(gid,uid,k).then(()=>rcRedraw(gid));return}setOpin(me,uid,k,gid);rcRedraw(gid);return}
  if(k==='feel'){if(nbqOn()){if(a.feel!==b.dataset.v)nbqRecapFeel(gid,b.dataset.v).then(()=>rcRedraw(gid));return}a.feel=a.feel===b.dataset.v?null:b.dataset.v;rcRedraw(gid);return}
  if(k==='done'){if(nbqOn()){nbqRecapDone(gid).then(ok=>{if(!ok)return;UF_CLOSE();toast('已保存，只有你知道');UF_RENDER()});return}a.closed=true;a.at=Date.now();UF_CLOSE();toast('已保存，只有你知道');UF_RENDER();return}},true);

// ---------- 球局详情里的入口（结束后 7 天内） ----------
function rcEntryHTML(c){if(!ME)return'';const g=GAMES.find(x=>x.id===c.id);if(!rcEligible(g,ME.id))return'';const a=AFTER[c.id+'|'+ME.id]||{};
  return `<button class="rc-entry" data-rc="open" data-g="${c.id}"><span><b>${a.closed?'你的赛后记录':`第 ${rcHero(g,ME.id).n} 场打完啦`}</b><small>${a.closed?'已保存 · 只有你知道 · 7 天内可以修改':'顺手记一下 · 只有你知道'}</small></span><svg><use href="#i-r"/></svg></button>`}
const _rcPass=passHTML;passHTML=function(c){return _rcPass(c)+rcEntryHTML(c)};

// ---------- 球员卡：一起打过的人，随时改 ----------
function pcPrivHTML(uid){return `<div class="pcp" data-u="${uid}"><div class="pcp-h"><b>以后想多遇到 TA 吗？</b><small>只影响你自己看到的推荐，TA 不会知道</small></div>${rcSeg('data-pcp',uid,opinOf(ME.id,uid))}</div>`}
const _rcInvBtn=invBtnHTML;invBtnHTML=function(uid){if(!ME||uid===ME.id||blockedPair(ME.id,uid))return _rcInvBtn(uid);
  let h=_rcInvBtn(uid);
  // TA 把我设成了少遇到：和 TA 关闭邀约时看到的完全一样
  if(lessHas(uid,ME.id)&&/data-iv="new"/.test(h))h='<div class="invbtn off">TA 暂时不接受邀约</div>';
  return h+(playedTogether(ME.id,uid)?pcPrivHTML(uid):'')};
document.addEventListener('click',e=>{const b=e.target.closest('[data-pcp]');if(!b||!ME)return;e.stopPropagation();const uid=b.dataset.u;
  if(nbqOn()){nbqPrefSet(uid,b.dataset.pcp).then(()=>{const el=document.querySelector(`.pcp[data-u="${uid}"]`);if(el)el.outerHTML=pcPrivHTML(uid)});return}
  setOpin(ME.id,uid,b.dataset.pcp,null);const el=document.querySelector(`.pcp[data-u="${uid}"]`);if(el)el.outerHTML=pcPrivHTML(uid)},true);
const _rcCan=canInvite;canInvite=function(to){const r=_rcCan(to);if(r)return r;if(lessHas(to,ME.id))return'TA 暂时不接受邀约';return null};

// ---------- 少遇到 / 多遇到 对推荐的影响 ----------
// 私信：设了少遇到之后，TA 发来的私信不计未读、不推送；消息照常收到、随时能看，TA 那边也和平时一样。
// 例外：你们有共同的球局（开场前 24 小时到结束后 2 小时），这段时间的私信照常提醒，免得错过「我晚到 10 分钟」。球局群聊不受影响。
const RC_PRE=864e5,RC_POST=2*36e5;
const rcShared=(a,b,at)=>gamesTogether(a,b).some(g=>at>=+new Date(g.starts_at)-RC_PRE&&at<=rcEnd(g)+RC_POST);
const msgQuiet=(me,m)=>!!m&&m.from!==me&&(LESS_IV[me+'>'+m.from]||[]).some(([s,e])=>m.at>=s&&m.at<e)&&!rcShared(me,m.from,m.at);
cxUnread=function(t){const lr=LASTREAD[ME.id+'|'+t.id]||0;return tMsgs(t).filter(m=>m.from!==ME.id&&m.at>lr&&!(t.type==='dm'&&msgQuiet(ME.id,m))).length};
const _rcRank=rank;rank=function(c){if(!ME)return _rcRank(c);return _rcRank(c)+(lessHas(ME.id,c.host_id)?4000:followHas(ME.id,c.host_id)?-60:0)};

// ---------- 通知 ----------
const _rcNtf=ntfText;ntfText=function(n){const g=GAMES.find(x=>x.id===n.game_id),f=U(n.from)||{name:''};
  if(n.kind==='recap'){const c=V(g),os=rcOthers(g,n.user_id),h=rcHero(g,n.user_id);const hl=h.hl.replace(/<[^>]+>/g,''),who=`和 ${os.slice(0,3).map(u=>U(u).name.split(' ')[0]).join('、')}`;return[`第 ${h.n} 场打完啦 🎾`,`${/ 月的第 /.test(hl)?who:hl} · ${c.v.short} ›`]}
  if(n.kind==='follow_game'){const c=V(g),k=playedCount(n.user_id,n.from);return[`${f.name.split(' ')[0]} 发了一场新球局`,`${relDay(c.start)} ${hm(c.start)} · ${c.v.short} · UTR ${lvl(c)}${k?` · 一起打过 ${k} 场`:''} ›`]}
  return _rcNtf(n)};
if(typeof ntfOpen==='function'){const _rcOpen=ntfOpen;ntfOpen=function(n){if(n.kind==='recap'){n.read=true;rcOpen(n.game_id);return}return _rcOpen(n)}}
const _rcUf=ufKeep;ufKeep=function(){_rcUf();rcTick()};
setInterval(()=>{if(ME)rcTick()},30000);


/* ---------- 演示：临时约球 / 申请超时 / 赛后表态 / 多遇到 ---------- */
function uxDemo(k){const now=Date.now(),r5=t=>Math.ceil(t/3e5)*3e5;
  const mk=o=>{const id='x'+(++NID);GAMES.push({id,share_code:'D'+NID,status:'open',game_type:'singles',capacity:2,duration_min:90,venue_id:'v1',note:'',tags:[],...o});return id};
  const part=(id,u,st,extra)=>{const g=GAMES.find(x=>x.id===id);partUpsert({game_id:id,user_id:u,role:u===g.host_id?'host':'player',status:st,message:'',created_at:now,...extra})};
  if(k==='instant'){const id=mk({host_id:'han',starts_at:new Date(r5(now+50*6e4)).toISOString(),ntrp_min:3,ntrp_max:4,join_mode:'instant',created_at:now-5*6e4,note:'临时有空，来一场'});part(id,'han','approved');return id}
  if(k==='timeout'){const id=mk({host_id:'sarah',venue_id:'v2',starts_at:new Date(r5(now+40*6e4)).toISOString(),ntrp_min:3,ntrp_max:4,created_at:now-3*36e5});part(id,'sarah','approved');part(id,'jason','pending',{created_at:now-16*6e4});ugExpire();return id}
  // 赛后：Han 和一位还没一起打过球的球友刚打完
  const u=Object.keys(USERS).find(x=>x!=='han'&&gamesTogether('han',x).length===0&&!blockedPair('han',x)&&!INVITES.some(i=>[i.from,i.to].includes(x)));
  const id=mk({host_id:'han',starts_at:new Date(now-150*6e4).toISOString(),ntrp_min:3,ntrp_max:4,status:'completed'});part(id,'han','approved');part(id,u,'approved');
  delete OPIN['han>'+u];delete OPIN[u+'>han'];AFTER[id+'|han']={notified:true};AFTER[id+'|'+u]={notified:true};
  if(k==='badge'){   // 找一位还没拿到「十场」的球友，让 TA 刚好打完第 10 场
    const u=Object.keys(USERS).find(x=>!stats(x).badges.find(y=>y.code==='ten').got)||'jason';if(BDG[u])['ten','fifty','hundred'].forEach(c=>delete BDG[u][c]);const s=stats(u);USERS[u].base.played=(USERS[u].base.played||0)+(9-s.played);
    const p=Object.keys(USERS).find(x=>x!==u&&!blockedPair(u,x));const id=mk({host_id:u,starts_at:new Date(now-150*6e4).toISOString(),ntrp_min:1,ntrp_max:16,status:'completed'});part(id,u,'approved');part(id,p,'approved');
    AFTER[id+'|'+u]={notified:true};bdgCheck(true);RCQ.forEach(x=>{if(x.kind==='badge')x.at=Infinity});return {u,id}}   // 演示里先看赛后卡片，通知不弹
  if(k==='follow'){setOpin('han',u,'more',id);AFTER[id+'|han'].closed=true;delete FG_LAST['han>'+u];
    const me=ME;ME=USERS[u];const st=new Date(now+2*864e5);st.setHours(18,0,0,0);api.create({venue_id:'v2',starts_at:st.toISOString(),duration_min:90,game_type:'singles',ntrp_min:3,ntrp_max:4.5,note:''});ME=me;
    setTimeout(()=>{RCQ.forEach(x=>x.at=0);rcTick();if(typeof renderPop==='function'&&$('#pop').classList.contains('show'))renderPop();else render()},20);   // 演示里跳过夜间顺延
    return u}
  return id}


