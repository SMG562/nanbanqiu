/* ===================== 徽章 · 好评 · 赴约 · 球友等级：统一规则 =====================
 * 一场「算数」的球：没被取消；已经结束；结束时你仍是确认参加的状态（中途撤回 / 退出的不算）；
 *   至少还有一位球友（或线下补位）；你没有被确认爽约。
 * 早场：08:00 及以前开场；夜场：19:00 及以后开场（都按开场时间算）。
 * 好评：同一位球友、同一场球，最多算 1 次好评——不管 TA 点了几个印象；一键「点赞同场球友」也算 1 次。
 *   印象（守时、友善……）照常分别计数，用来显示「大家最喜欢 TA 的地方」。
 * 赴约：不用签到。默认都到了；只有同场球友在结束后 48 小时内反馈「TA 没来」才会记录：
 *   发起人反馈、两人局里另一位反馈、或双打里两位球友都反馈 → 确认；被反馈的人会收到通知，可以申诉，申诉期间不计入。
 *   赴约率 = 到场 ÷（到场 + 爽约）。开打前 24 小时内退出不算爽约，但在等级里按半次计。
 * 球友等级：看的是「你是不是一个让人愿意再约的球友」，不是谁打得最多。
 *   好评率用平滑后的比例：（好评 + 2.5）÷（场次 + 10），新人不会因为样本少被误判；
 *   例：200 场 20 次好评 ≈ 0.11；40 场 15 次好评 ≈ 0.35 —— 后者等级更高。打得多，用场次和徽章来体现。 */
const GR={EARLY:8*60,NIGHT:19*60,PR:.25,PN:10,NS_WIN:48*36e5};
const grMin=d=>d.getHours()*60+d.getMinutes();
var NS={},NS_APPEAL={},NS_TOLD=new Set(),LVREC={},RC_IMP=new Set(),RC_NSASK=null;
const nsKey=(g,t)=>g+'|'+t;
function nsConfirmed(gid,t){const k=nsKey(gid,t),r=NS[k];if(!r||!r.size||NS_APPEAL[k])return false;const g=GAMES.find(x=>x.id===gid);if(!g)return false;
  if(r.has(g.host_id)&&t!==g.host_id)return true;if(r.size>=2)return true;
  return PARTS.filter(p=>p.game_id===gid&&p.status==='approved'&&p.user_id!==t).length<=1}
function grPlayed(uid,now=Date.now()){return GAMES.filter(g=>{if(g.status==='cancelled'||rcEnd(g)>now)return false;
  const ap=PARTS.filter(p=>p.game_id===g.id&&p.status==='approved');if(!ap.some(p=>p.user_id===uid))return false;
  if(ap.length+(g.filled||0)<2)return false;return !nsConfirmed(g.id,uid)})}
function grNoshow(uid){const b=(U(uid)||{}).base||{},now=Date.now();let all=b.noshow||0,recent=b.noshow||0;
  Object.keys(NS).forEach(k=>{const[g,t]=k.split('|');if(t!==uid||!nsConfirmed(g,t))return;all++;const G=GAMES.find(x=>x.id===g);if(G&&now-rcEnd(G)<90*864e5)recent++});return {all,recent}}
function grKudos(uid){const b=(U(uid)||{}).base||{};let n=0;const from=new Set();
  if(typeof KUDOS!=='undefined')KUDOS.forEach((tags,k)=>{const[r,t]=k.split('|');if(t!==uid||r===uid||!tags||!tags.length||blockedPair(r,t))return;n++;from.add(r)});
  const legacy=b.kudos||0;return {n:legacy+n,from:Math.round(legacy*.7)+from.size}}   // 历史数据没有来源，按 7 成估算不同球友数
bdgStreak=function(uid){const W=7*864e5,mon=t=>{const d=new Date(t);d.setHours(0,0,0,0);d.setDate(d.getDate()-((d.getDay()+6)%7));return +d};
  const wk=new Set(grPlayed(uid).map(g=>mon(new Date(g.starts_at))));let w=mon(Date.now());if(!wk.has(w))w=mon(w-W+36e5);let n=0;while(wk.has(w)){n++;w=mon(w-W+36e5)}return n};

// ---------- 徽章门槛 ----------
(()=>{const B=c=>BADGES.find(x=>x[0]===c);
  const n=B('night');n[2]='19:00 及以后开场 5 场';n[4]=5;n[5]=s=>s.night;
  const e=B('early');e[2]='08:00 及以前开场 5 场';e[4]=5;e[5]=s=>s.early;
  const k=B('kudos');k[2]='30 次好评，来自至少 10 位球友';k[5]=s=>s.kudosFrom>=10?s.kudos:Math.min(s.kudos,29);
  const h=B('host10');h[2]='组织 10 场（至少有 1 位球友来打完）';
  const sh=IMP.find(x=>x[0]==='share');if(sh)sh[1]='🎁'})();
const BDG_UNIT2={kudos:'次好评'};

// ---------- 统计（替换原来的 stats）----------
stats=function(uid){const u=U(uid);const b=u.base||{},played=grPlayed(uid),hosted=played.filter(g=>g.host_id===uid),k=grKudos(uid),ns=grNoshow(uid);
  const s={played:(b.played||0)+played.length,hosted:(b.hosted||0)+hosted.length,kudos:k.n,kudosFrom:k.from,streak:Math.max(b.streak||0,bdgStreak(uid)),invites:b.invites||0,
    night:(b.night||0)+played.filter(g=>grMin(new Date(g.starts_at))>=GR.NIGHT).length,early:(b.early||0)+played.filter(g=>grMin(new Date(g.starts_at))<=GR.EARLY).length,
    surfaces:Math.max(b.surfaces||0,new Set(played.map(g=>VEN[g.venue_id].surface).filter(x=>x!=='synthetic')).size),clubs:Math.max(b.clubs||0,new Set(played.map(g=>g.venue_id)).size)};
  const vc={};played.forEach(g=>vc[g.venue_id]=(vc[g.venue_id]||0)+1);s.topClub=Object.keys(vc).sort((a,c)=>vc[c]-vc[a])[0]||null;
  {const pc={};played.forEach(g=>PARTS.filter(p=>p.game_id===g.id&&p.status==='approved'&&p.user_id!==uid).forEach(p=>pc[p.user_id]=(pc[p.user_id]||0)+1));s.partner=Math.max(b.partner||0,...Object.values(pc),0)}
  s.noshow=ns.all;s.noshowRecent=ns.recent;s.late=b.late||0;s.att=s.played+s.noshow?s.played/(s.played+s.noshow):1;
  journey(u,s);
  const rec=BDG[uid]||{};
  s.badges=BADGES.map(x=>{const v=x[5](s),cur=v>=x[4],r=rec[x[0]];return {code:x[0],name:x[1],desc:x[2],icon:x[3],glyph:bdgHex(x[3],cur||!!r),mini:bdgMini(x[3]),target:x[4],val:Math.min(x[4],v),cur,got:cur||!!r,at:r&&r.at||null}});
  return s};

// ---------- 球友等级 ----------
JOURNEY.splice(0,JOURNEY.length,
  {n:'初见',e:'🌱',games:0,att:0,rate:0,from:0,d:'欢迎来到社区，一切从这里开始'},
  {n:'相伴',e:'🤝',games:3,att:0,rate:0,from:0,d:'开始与他人约球、建立连接'},
  {n:'常伴',e:'🌿',games:10,att:.9,rate:.15,from:3,d:'经常参与，是社区里的熟面孔'},
  {n:'挚友',e:'❤️',games:30,att:.95,rate:.3,from:10,d:'被大家信任，和你打球是件舒服的事'},
  {n:'南伴之光',e:'✨',games:60,att:.98,rate:.4,from:25,clean:1,d:'因为你的存在，社区变得更温暖、更值得回来'});
LV_REQ.splice(0,LV_REQ.length,'刚来到南伴球','完成 3 场','完成 10 场 · 赴约率 90% · 每 10 场约 1.5 次好评 · 来自 3 位以上球友','完成 30 场 · 赴约率 95% · 每 10 场约 3 次好评 · 来自 10 位以上球友','完成 60 场 · 赴约率 98% · 每 10 场约 4 次好评 · 来自 25 位以上球友 · 半年内零举报');
function grReq(s,j){const rate=s.kindRate,att=s.attEff;
  return [{k:'games',t:`完成 ${j.games} 场`,ok:s.played>=j.games,f:Math.min(1,s.played/Math.max(1,j.games)),left:`再打 ${j.games-s.played} 场`},
    j.att?{k:'att',t:`赴约率 ${Math.round(j.att*100)}%`,ok:att>=j.att,f:Math.min(1,att/j.att),left:'守约，不临时放鸽子'}:null,
    j.rate?{k:'rate',t:`每 10 场约 ${+(j.rate*10).toFixed(1)} 次好评`,ok:rate>=j.rate,f:Math.min(1,rate/j.rate),left:'对球友多一分友善和耐心，大家打完会给你留下好印象'}:null,
    j.from?{k:'from',t:`来自 ${j.from} 位以上球友`,ok:s.kudosFrom>=j.from,f:Math.min(1,s.kudosFrom/j.from),left:`和更多不同的球友打球（还差 ${Math.max(0,j.from-s.kudosFrom)} 位）`}:null,
    j.clean?{k:'clean',t:'半年内零举报',ok:!s.reports,f:s.reports?0:1,left:'保持友善，零举报'}:null].filter(Boolean)}
journey=function(u,s){const b=u.base||{};s.reports=b.reports||0;
  s.kindRate=(s.kudos+GR.PR*GR.PN)/(s.played+GR.PN);s.attEff=s.played?s.played/(s.played+s.noshow+.5*s.late):1;
  let i=0;JOURNEY.forEach((j,k)=>{if(grReq(s,j).every(r=>r.ok))i=k;});
  for(let k=1;k<=i;k++)if(!grReq(s,JOURNEY[k]).every(r=>r.ok)){i=k-1;break}           // 必须逐级满足
  if(s.noshowRecent>=2)i=Math.min(i,2);if(s.noshowRecent>=4)i=Math.min(i,1);           // 近期爽约会让等级回落，改正后会回来
  s.lv=i;s.next=LV[i+1];const nx=JOURNEY[i+1];s.req=nx?grReq(s,nx):[];
  const fr=s.req.length?s.req.reduce((a,r)=>a+r.f,0)/s.req.length:1;s.points=Math.round(LV[i][0]+(nx?(LV[i+1][0]-LV[i][0])*fr:0));s.cs=s.points;s.kind=Math.round(s.kindRate*100);
  const miss=s.req.find(r=>!r.ok&&r.k==='rate')||s.req.find(r=>!r.ok);
  s.hint=!nx?'已是最高等级，谢谢你让这里变得更好':miss?`${miss.left}，就能升到「${nx.n}」`:`就快升到「${nx.n}」了`};
const _grJH=journeyHTML;journeyHTML=function(u,s){let h=_grJH(u,s);if(!(ME&&u.id===ME.id)||!s.req.length)return h;
  const nx=JOURNEY[s.lv+1];const list=`<div class="lvc-req"><small>升到「${nx.n}」</small>${s.req.map(r=>`<span class="${r.ok?'ok':''}"><i></i>${r.t}</span>`).join('')}</div>`;
  return h.replace('<div class="lvc-next">',list+'<div class="lvc-next">')};
lvInfoHTML=function(){const s=ME?stats(ME.id):null;
  return `<div class="lvinfo"><div class="lvi-h">球友等级</div><p class="lvi-p">等级不看球技，也不看谁打得最多，只回答一个问题：<b>你是不是一个让人愿意再约的球友。</b>打了多少场，由场次和徽章来体现。</p>
    <div class="lvi-list">${JOURNEY.map((j,i)=>`<div class="lvi-row${s&&s.lv===i?' on':''}"><span class="lvi-e">${j.e}</span><div><b>Lv${i+1} ${j.n}${s&&s.lv===i?'<em>你在这里</em>':''}</b><p>${j.d}</p><small>${LV_REQ[i]}</small></div></div>`).join('')}</div>
    <div class="lvi-sec"><b>好评怎么算</b><p>打完球，同场球友给你留下印象或点赞，就是一次好评。同一位球友、同一场球最多算一次——点了几个印象都只算一次。</p></div>
    <div class="lvi-sec"><b>为什么看「每 10 场多少次好评」</b><p>打 200 场收到 20 次好评，和打 40 场收到 15 次好评，后者更让人愿意再约。所以等级看的是比例，并且对刚来的球友做了平滑，不会因为一两场就被误判。好评还要来自足够多的不同球友。</p></div>
    <div class="lvi-sec"><b>赴约不用签到</b><p>默认你都到了。只有同场球友反馈你没来，才会记一次爽约；你会收到通知，可以申诉，申诉期间不计入。</p></div>
    <div class="lvi-sec"><b>什么会让等级回落</b><p>近 90 天爽约 2 次以上、开打前 24 小时内频繁退出、被核实的辱骂或骚扰。改正之后，等级会慢慢回来。</p></div>
    <div class="lvi-sec"><b>看不到分数</b><p>没有分数，也没有排行榜。你只会看到下一级还差什么。</p></div></div>`};

// ---------- 一键点赞同场球友：每人算 1 次好评（已经留过印象的不重复算）----------
api.kudos=function(id){const c=api.get(id);c.appr.filter(p=>p.user_id!==ME.id).forEach(p=>{const k=ME.id+'|'+p.user_id+'|'+id;if(!(KUDOS.get(k)||[]).length)KUDOS.set(k,['like'])});GAMES.find(g=>g.id===id).kudosDone=true};

// ---------- 球员卡：底部最多 7 枚徽章；Club 名称太长时简写 ----------
const BDG_CH=['first','ten','fifty','hundred'];
function bdgTop(s){let L=s.badges.filter(b=>b.got);const ch=L.filter(b=>BDG_CH.includes(b.code));if(ch.length>1){const best=ch.sort((a,b)=>BDG_CH.indexOf(b.code)-BDG_CH.indexOf(a.code))[0];L=L.filter(b=>!BDG_CH.includes(b.code)||b===best)}
  return L.sort((a,b)=>bdgRarity(a.code)-bdgRarity(b.code)||(b.at||0)-(a.at||0)).slice(0,7)}
let CLUB_ICON='<svg class="pc-ci" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="6" width="17" height="12" rx="1.2"/><path d="M12 6v12M7.5 8.8v6.4M16.5 8.8v6.4M7.5 12h9"/></svg>';
let CL_CV=null;
function clubLabel(name,max=246){CL_CV=CL_CV||document.createElement('canvas').getContext('2d');CL_CV.font='600 12px -apple-system,BlinkMacSystemFont,"PingFang SC","Noto Sans SC",system-ui,sans-serif';
  const fit=t=>CL_CV.measureText(t).width<=max;if(fit(name))return name;
  for(const[re,to]of[[/\s+Lawn Tennis Club$/i,' LTC'],[/\s+Tennis Club$/i,' TC'],[/\s+Tennis Cent(re|er)$/i,' TC'],[/\s+Tennis Association$/i,' TA']]){if(re.test(name))return name.replace(re,to)}return name}
const clubLabelHTML=name=>`${CLUB_ICON}<span>${esc(clubLabel(name))}</span>`;

// ---------- 赛后卡片：留个好印象 · TA 没来 ----------
rcRow=function(gid,uid){const u=U(uid),k=ME.id+'|'+uid+'|'+gid,given=KUDOS.get(k)||[],open=RC_IMP.has(k),g=GAMES.find(x=>x.id===gid),nsOn=(NS[nsKey(gid,uid)]||new Set()).has(ME.id),canNs=Date.now()-rcEnd(g)<GR.NS_WIN;
  const ask=RC_NSASK===k;
  return `<div class="rc-p"><div class="rc-u">${av(u)}<div><b>${esc(u.name)}</b><small>UTR ${f1(u.ntrp)}</small></div></div>${rcSeg('data-rc',uid,opinOf(ME.id,uid),` data-g="${gid}"`)}
    <div class="rc-x"><button class="rc-xl${given.filter(t=>t!=='like').length?' on':''}" data-rcx="imp" data-g="${gid}" data-u="${uid}">${given.filter(t=>t!=='like').length?`已留 ${given.filter(t=>t!=='like').length} 个好印象`:'＋ 留个好印象'}</button>
      ${canNs?(nsOn?`<button class="rc-xr" data-rcx="nsundo" data-g="${gid}" data-u="${uid}">已反馈没来 · 撤回</button>`:ask?'':`<button class="rc-xr" data-rcx="ns" data-g="${gid}" data-u="${uid}">TA 没来？</button>`):''}</div>
    ${open?`<div class="rc-imp">${IMP.map(x=>`<button data-rcx="tag" data-g="${gid}" data-u="${uid}" data-v="${x[0]}" class="${given.includes(x[0])?'on':''}">${x[1]} ${x[2]}</button>`).join('')}</div>`:''}
    ${ask?`<div class="rc-ns"><p>确认 ${esc(u.name.split(' ')[0])} 没有到场？TA 会收到通知，可以申诉。</p><div><button data-rcx="nsok" data-g="${gid}" data-u="${uid}">确认没来</button><button data-rcx="nsno" data-g="${gid}" data-u="${uid}">算了</button></div></div>`:''}</div>`};
document.addEventListener('click',e=>{const b=e.target.closest('[data-rcx]');if(!b||!ME)return;e.stopPropagation();const k=b.dataset.rcx,gid=b.dataset.g,uid=b.dataset.u,key=ME.id+'|'+uid+'|'+gid,nk=nsKey(gid,uid);
  if(k==='imp'){RC_IMP.has(key)?RC_IMP.delete(key):RC_IMP.add(key)}
  if(k==='tag'&&nbqOn()){const g=(KUDOS.get(key)||[]).filter(y=>y!=='like'),v=b.dataset.v,nx=g.includes(v)?g.filter(y=>y!==v):[...g,v];nbqRecapImp(gid,uid,nx).then(()=>rcRedraw(gid));return}   // 真实模式：先写服务器
  if(k==='tag'){const u=U(uid),imp=impOf(u),g=KUDOS.get(key)||[],v=b.dataset.v;if(g.includes(v)){KUDOS.set(key,g.filter(y=>y!==v));imp[v]=Math.max(0,(imp[v]||1)-1)}else{KUDOS.set(key,[...g.filter(y=>y!=='like'),v]);imp[v]=(imp[v]||0)+1}}
  if(k==='ns'){RC_NSASK=key}
  if(k==='nsno'){RC_NSASK=null}
  if(k==='nsok'){RC_NSASK=null;const was=nsConfirmed(gid,uid);(NS[nk]=NS[nk]||new Set()).add(ME.id);
    if(!was&&nsConfirmed(gid,uid)&&!NS_TOLD.has(nk)){NS_TOLD.add(nk);const G=GAMES.find(x=>x.id===gid);notify(uid,'noshow',gid,null)}
    toast('已记录，谢谢反馈')}
  if(k==='nsundo'){const s=NS[nk];if(s)s.delete(ME.id);toast('已撤回')}
  rcRedraw(gid)},true);

// ---------- 被反馈没来：通知 + 申诉 ----------
function nsAppeal(gid){const g=GAMES.find(x=>x.id===gid),c=V(g),k=nsKey(gid,ME.id);if(NS_APPEAL[k]){toast('申诉已提交，我们会尽快核实');return}
  UF_OPEN(`<div class="uf"><div class="uf-h">有球友反馈你没到场</div><p class="uf-s">${relDay(c.start)} ${hm(c.start)} · ${esc(c.v.short)}。如果有误会，告诉我们发生了什么，核实期间不会计入爽约。</p>
    <div class="uf-l">${[['came','我到了','可能没碰上，或者对方记错了'],['told','我提前说过来不了','在聊天里或私下说过'],['other','其他原因','我们会联系你了解情况']].map(([v,t,d])=>`<button class="uf-r" data-nsa="${v}" data-g="${gid}"><b>${t}</b><small>${d}</small></button>`).join('')}
    <button class="uf-r" data-nsa="ok" data-g="${gid}"><b>没有误会</b><small>下次会提前说</small></button></div></div>`)}
document.addEventListener('click',e=>{const b=e.target.closest('[data-nsa]');if(!b||!ME)return;e.stopPropagation();const v=b.dataset.nsa,k=nsKey(b.dataset.g,ME.id);
  if(v!=='ok'){NS_APPEAL[k]={reason:v,at:Date.now(),status:'pending'};toast('已提交，核实期间不计入爽约')}else toast('好的，谢谢你');UF_CLOSE();UF_RENDER()},true);

// ---------- 等级提升：通知一次 + 获得动画；等级回落不打扰 ----------
function lvInit(){LVREC={};Object.keys(USERS).forEach(u=>LVREC[u]={lv:stats(u).lv,seen:true})}
const _grSeed=seed;seed=function(){const r=_grSeed.apply(this,arguments);lvInit();return r};
const _grCheck=bdgCheck;bdgCheck=function(force){const t0=BDG_T;_grCheck(force);if(BDG_T===t0&&!force)return;
  Object.keys(USERS).forEach(uid=>{const s=stats(uid),r=LVREC[uid]||(LVREC[uid]={lv:s.lv,seen:true});if(s.lv>r.lv){r.lv=s.lv;r.seen=false;r.at=Date.now();rcQueue(uid,'levelup',null,String(s.lv),Date.now())}})};
function lvShow(uid){const r=LVREC[uid],j=JOURNEY[r.lv],s=stats(uid),nx=JOURNEY[r.lv+1];r.seen=true;bdgClose(true);
  document.body.insertAdjacentHTML('beforeend',`<div id="bdgFx" class="bfx new" data-bfx="bg"><div class="bfx-c"><div class="bfx-cf">${Array.from({length:14},(_,i)=>`<i style="--x:${(i*53)%100}%;--d:${(i%5)*.12}s;--r:${(i*47)%360}deg"></i>`).join('')}</div>
    <div class="bfx-k">球友等级提升</div><div class="lvx"><span>${j.e}</span></div><div class="bfx-n">Lv${r.lv+1} ${j.n}</div><div class="bfx-d">${j.d}</div>
    <div class="bfx-m">已经有 ${s.kudosFrom} 位球友给你留下过好评</div>${nx?`<div class="bfx-nx">下一级「${nx.n}」：${esc(s.hint.replace(/，就能升到.*$/,''))}</div>`:''}
    <div class="bfx-b"><button class="bfx-s" data-bfx="close">收下了</button></div></div></div>`);requestAnimationFrame(()=>{const x=document.getElementById('bdgFx');x&&x.classList.add('on')})}
const _grAuto=bdgAuto;bdgAuto=function(){if(!ME)return;if(bdgPending().filter(c=>!BDG_SHOWN.has(ME.id+'|'+c)).length)return _grAuto();const r=LVREC[ME.id];if(!r||r.seen||bdgBusy())return;
  clearTimeout(bdgAuto.lt);bdgAuto.lt=setTimeout(()=>{if(!bdgBusy()&&LVREC[ME.id]&&!LVREC[ME.id].seen)lvShow(ME.id)},800)};

// ---------- 通知 ----------
const _grRcTick=rcTick;rcTick=function(){const due=RCQ.filter(x=>x.kind==='levelup'&&x.at<=Date.now());due.forEach(x=>{RCQ.splice(RCQ.indexOf(x),1);const n={id:++NID,user_id:x.uid,kind:'levelup',game_id:null,from:x.uid,lv:+x.from,at:Date.now(),read:false};NOTIFS.unshift(n);
    nrDeliver(n)});return _grRcTick()};
const _grNtf=ntfText;ntfText=function(n){if(n.kind==='levelup'){const j=JOURNEY[n.lv]||JOURNEY[0];return[`升级到 Lv${n.lv+1}「${j.n}」${j.e}`,`${j.d} ›`]}
  if(n.kind==='noshow'){const g=GAMES.find(x=>x.id===n.game_id),c=V(g),f=U(n.from)||{name:''};return[`有球友反馈你没到场`,`${relDay(c.start)} ${hm(c.start)} · ${c.v.short} · 有误会可以申诉 ›`]}return _grNtf(n)};
if(typeof ntfOpen==='function'){const _grOpen=ntfOpen;ntfOpen=function(n){if(n.kind==='levelup'){n.read=true;if(LVREC[n.user_id])lvShow(n.user_id);return}if(n.kind==='noshow'){n.read=true;nsAppeal(n.game_id);return}return _grOpen(n)}}
document.addEventListener('click',e=>{const o=e.target.closest('[data-lvup],[data-nsap]');if(!o||!ME)return;e.stopPropagation();const pop=document.getElementById('pop');if(pop)pop.classList.remove('show');
  if(o.dataset.lvup!=null)lvShow(ME.id);else nsAppeal(o.dataset.nsap)},true);


/* ---------- 成长体系 v2：好评按「不同的人」算 · 场次门槛提高 · 不催促 ---------- */
// 好评 = 给过你好评的不同球友人数（同一位球友打再多场、点再多次，只算 1）
// 好评率 = 好评人数 ÷ 一起打过球的不同球友人数，平滑：(好评 + 1) ÷ (球友 + 4)
//   这样固定搭子不会刷高好评，也不会因为总和熟人打球而吃亏：看的是「和你打过球的人里，有多少人觉得你好」
function grMates(uid){const set=new Set();grPlayed(uid).forEach(g=>PARTS.forEach(p=>{if(p.game_id===g.id&&p.status==='approved'&&p.user_id!==uid)set.add(p.user_id)}));
  const b=(U(uid)||{}).base||{};return set.size+Math.round((b.played||0)*.45)}          // 历史数据没有球友名单，按每场 0.45 位新球友估算
grKudos=function(uid){const b=(U(uid)||{}).base||{},from=new Set();
  if(typeof KUDOS!=='undefined')KUDOS.forEach((tags,k)=>{const[r,t]=k.split('|');if(t!==uid||r===uid||!tags||!tags.length||blockedPair(r,t))return;from.add(r)});
  const legacy=Math.round((b.kudos||0)*.7);return {n:legacy+from.size,from:legacy+from.size}};
(()=>{const k=BADGES.find(x=>x[0]==='kudos');k[2]='30 位球友给过你好评';k[5]=s=>s.kudos;
  const sh=IMP.find(x=>x[0]==='share');if(sh)sh[1]='🤲'})();
JOURNEY.splice(0,JOURNEY.length,
  {n:'初见',e:'🌱',games:0,att:0,rate:0,from:0,d:'一颗刚破土的芽，一切从这里开始'},
  {n:'相伴',e:'🌿',games:20,att:0,rate:0,from:0,d:'枝叶舒展，开始和球友们建立连接'},
  {n:'常伴',e:'🪴',games:50,att:.9,rate:.3,from:10,d:'稳稳扎根，是社区里的熟面孔'},
  {n:'挚友',e:'🌲',games:100,att:.95,rate:.4,from:25,d:'被大家信任，和你打球是件舒服的事'},
  {n:'南伴之光',e:'🌳',games:200,att:.98,rate:.5,from:50,clean:1,d:'一棵大树，因为你，社区变得更温暖、更值得回来'});
LV_REQ.splice(0,LV_REQ.length,'刚来到南伴球','完成 20 场','完成 50 场 · 赴约率 90% · 打过球的球友里约 3 成给过你好评 · 至少 10 位','完成 100 场 · 赴约率 95% · 约 4 成球友给过你好评 · 至少 25 位','完成 200 场 · 赴约率 98% · 约一半球友给过你好评 · 至少 50 位 · 半年内零举报');
const _grJ1=journey;journey=function(u,s){s.mates=Math.max(grMates(u.id),s.kudosFrom);_grJ1(u,s);   // 给过好评的人一定一起打过球
  // 用「不同球友」口径重新判定
  s.kindRate=(s.kudosFrom+1)/(s.mates+4);let i=0;
  for(let k=1;k<JOURNEY.length;k++){const j=JOURNEY[k];if(s.played>=j.games&&s.attEff>=j.att&&s.kindRate>=j.rate&&s.kudosFrom>=j.from&&(!j.clean||!s.reports))i=k;else break}
  if(s.noshowRecent>=2)i=Math.min(i,2);if(s.noshowRecent>=4)i=Math.min(i,1);
  s.lv=i;s.next=LV[i+1];s.req=[];s.kind=Math.round(s.kindRate*100);
  s.points=Math.round(LV[i][0]+(LV[i+1]?Math.min(.95,s.played/JOURNEY[i+1].games)*(LV[i+1][0]-LV[i][0]):0));s.cs=s.points;
  s.hint=i===JOURNEY.length-1?'谢谢你让这里变得更好':''};               // 不显示「还差几场」之类的提示
journeyHTML=_grJH;    // 去掉「升到下一级还差什么」清单
lvShow=function(uid){const r=LVREC[uid],j=JOURNEY[r.lv],s=stats(uid);r.seen=true;bdgClose(true);
  document.body.insertAdjacentHTML('beforeend',`<div id="bdgFx" class="bfx new" data-bfx="bg"><div class="bfx-c"><div class="bfx-cf">${Array.from({length:14},(_,i)=>`<i style="--x:${(i*53)%100}%;--d:${(i%5)*.12}s;--r:${(i*47)%360}deg"></i>`).join('')}</div>
    <div class="bfx-k">球友等级</div><div class="lvx"><span>${j.e}</span></div><div class="bfx-n">Lv${r.lv+1} ${j.n}</div><div class="bfx-d">${j.d}</div>
    <div class="bfx-m">${s.kudosFrom} 位球友给你留下过好评</div><div class="bfx-b"><button class="bfx-s" data-bfx="close">收下了</button></div></div></div>`);requestAnimationFrame(()=>{const x=document.getElementById('bdgFx');x&&x.classList.add('on')})};
// 球员卡 Club：插旗图标；放不下时逐级简写（先 TC，再从后往前把中间的词缩成首字母），不用省略号
CLUB_ICON='<svg class="pc-ci" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M6 21V3.5"/><path d="M6 4.5h10.5l-2.3 3.6 2.3 3.6H6"/></svg>';
clubLabel=function(name,max=236){CL_CV=CL_CV||document.createElement('canvas').getContext('2d');CL_CV.font='600 12px -apple-system,BlinkMacSystemFont,"PingFang SC","Noto Sans SC",system-ui,sans-serif';
  const fit=t=>CL_CV.measureText(t).width<=max;if(fit(name))return name;
  // ① 去掉括号里的补充说明 ② 常见后缀简写 ③ 还放不下：从后往前把中间的词缩成首字母（首词、末词和 of / and 这类小词不动），一次一个
  let t=name.replace(/\s*\([^)]*\)\s*/g,' ').replace(/\s+and\s+/gi,' & ').trim();if(fit(t))return t;
  for(const[re,to]of[[/\s+Lawn Tennis Club$/i,' LTC'],[/\s+Tennis Club$/i,' TC'],[/\s+Tennis Cent(re|er)$/i,' TC'],[/\s+Tennis Courts?$/i,m=>/s$/i.test(m)?' Courts':' Court'],[/\s+Tennis Association$/i,' TA']])if(re.test(t)){t=t.replace(re,to);break}
  if(fit(t))return t;const w=t.split(' ');
  for(let n=0;n<w.length&&!fit(w.join(' '));n++){let k=-1;for(let i=w.length-2;i>=1;i--)if(w[i].length>3&&!/\.$/.test(w[i])&&!/^(of|the|and|&)$/i.test(w[i])){k=i;break}if(k<0)break;w[k]=w[k][0].toUpperCase()+'.'}
  return w.join(' ')};
// 赛后卡片（双打）：每位球友单独选；另给一个「都点个赞」
const _grRcHTML=rcHTML;rcHTML=function(gid){let h=_grRcHTML(gid);const g=GAMES.find(x=>x.id===gid),os=rcOthers(g,ME.id);
  if(os.length>1){const all=os.every(u=>(KUDOS.get(ME.id+'|'+u+'|'+gid)||[]).length);h=h.replace('<div class="rc-q">以后想多遇到吗？</div>',`<div class="rc-q rc-q2"><span>以后想多遇到吗？</span><button data-rcx="all" data-g="${gid}" class="${all?'on':''}">${all?'已给大家点赞':'👍 都点个赞'}</button></div>`)}
  return h};
document.addEventListener('click',e=>{const b=e.target.closest('[data-rcx="all"]');if(!b||!ME)return;e.stopPropagation();const gid=b.dataset.g,g=GAMES.find(x=>x.id===gid);
  if(nbqOn()){nbqKudosAll(gid,rcOthers(g,ME.id).filter(u=>!(KUDOS.get(ME.id+'|'+u+'|'+gid)||[]).length)).then(()=>rcRedraw(gid));return}
  rcOthers(g,ME.id).forEach(u=>{const k=ME.id+'|'+u+'|'+gid;if(!(KUDOS.get(k)||[]).length)KUDOS.set(k,['like'])});rcRedraw(gid)},true);


/* ---------- 成长体系 v3：门槛更高 · 等级图标 · 徽章分享 ---------- */
(()=>{const J=JOURNEY;J[1].e='🍃';J[2].e='🌿';J[1].d='两片新叶，开始和球友们建立连接';J[2].d='枝叶渐丰，是社区里的熟面孔';
  J[2].rate=.5;J[3].rate=2/3;J[4].rate=2/3;
  LV_REQ[2]='完成 50 场 · 赴约率 90% · 打过球的球友里一半以上给过你好评 · 至少 10 位';
  LV_REQ[3]='完成 100 场 · 赴约率 95% · 三分之二以上的球友给过你好评 · 至少 25 位';
  LV_REQ[4]='完成 200 场 · 赴约率 98% · 三分之二以上的球友给过你好评 · 至少 50 位 · 半年内零举报'})();

// ---------- 徽章分享：朋友圈 / 小红书，先看效果再保存 ----------
// Club 小旗：按字形裁好的视图框（没有内边距），旗杆从字顶到基线，笔画粗细与粗体文字一致
CLUB_ICON='<svg class="pc-ci" viewBox="0 0 11 15" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M1.6 14V1.4"/><path d="M1.6 1.9h7.6L7.4 4.9l1.8 3H1.6"/></svg>';
var BSH={uid:null,code:null,to:'moments',url:null,cv:null};
function bshText(uid,code,to){const b=stats(uid).badges.find(x=>x.code===code);
  return to==='xhs'?{title:`${CITY.zh}打网球｜解锁「${b.name}」徽章 🎾`,body:`${b.desc}，在南伴球约到了很多很棒的球友。\n${CITY.zh}想找人一起打球的，可以来南伴球看看～\n\n#${CITY.tag} #网球搭子 #${CITY.zh}生活 #南伴球`}
    :{title:'',body:`解锁了「${b.name}」徽章 🎾 ${b.desc}。${CITY.zh}有想一起打球的吗？`}}
function qrImage(text){return new Promise(res=>{try{const svg=qrSVG(text).replace('<svg','<svg xmlns="http://www.w3.org/2000/svg"');const img=new Image();img.onload=()=>res(img);img.onerror=()=>res(null);img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg)}catch(e){res(null)}})}
// 分享图 v2：1080×1440（3:4，朋友圈和小红书都合适）
async function bdgPoster2(uid,code){const s=stats(uid),b=s.badges.find(x=>x.code===code),u=U(uid),W=1080,H=1440,cv=document.createElement('canvas');cv.width=W;cv.height=H;const x=cv.getContext('2d');
  const F='"PingFang SC","Noto Sans SC","Microsoft YaHei",system-ui,sans-serif';
  let g=x.createLinearGradient(0,0,0,H);g.addColorStop(0,'#13664C');g.addColorStop(.55,'#0B4634');g.addColorStop(1,'#062A1F');x.fillStyle=g;x.fillRect(0,0,W,H);
  g=x.createRadialGradient(W/2,600,40,W/2,600,520);g.addColorStop(0,'rgba(198,234,61,.20)');g.addColorStop(1,'rgba(198,234,61,0)');x.fillStyle=g;x.fillRect(0,0,W,H);
  // 很淡的球场线，像水印
  x.strokeStyle='rgba(255,255,255,.045)';x.lineWidth=3;x.strokeRect(70,70,W-140,H-140);x.beginPath();x.moveTo(70,250);x.lineTo(W-70,250);x.moveTo(70,H-250);x.lineTo(W-70,H-250);x.stroke();
  x.textBaseline='alphabetic';
  // 顶部：品牌 + 标签
  x.fillStyle='#C6EA3D';x.beginPath();x.arc(124,146,13,0,7);x.fill();x.fillStyle='#fff';x.font=`800 38px ${F}`;x.textAlign='left';x.fillText('南伴球',150,159);
  x.textAlign='right';x.fillStyle='rgba(255,255,255,.62)';x.font=`600 26px ${F}`;x.fillText('徽章',W-110,157);
  // 徽章
  const hex=(cx,cy,r)=>{x.beginPath();for(let i=0;i<6;i++){const a=Math.PI/180*(60*i-90);x[i?'lineTo':'moveTo'](cx+r*Math.cos(a),cy+r*Math.sin(a))}x.closePath()};
  x.save();x.shadowColor='rgba(0,0,0,.45)';x.shadowBlur=70;x.shadowOffsetY=30;hex(W/2,600,240);x.fillStyle='#C6EA3D';x.fill();x.restore();
  hex(W/2,600,228);const hg=x.createLinearGradient(0,372,0,828);hg.addColorStop(0,'#2BA878');hg.addColorStop(1,'#0A3B2A');x.fillStyle=hg;x.fill();
  x.save();hex(W/2,600,228);x.clip();const sh=x.createLinearGradient(300,380,780,820);sh.addColorStop(0,'rgba(255,255,255,0)');sh.addColorStop(.45,'rgba(255,255,255,.10)');sh.addColorStop(.55,'rgba(255,255,255,0)');x.fillStyle=sh;x.fillRect(0,0,W,H);x.restore();
  const n=b.icon[0]==='#'?b.icon.slice(1):null;x.textAlign='center';x.textBaseline='middle';x.fillStyle='#fff';
  if(n){x.font=`900 ${n.length>2?170:210}px ${F}`;x.fillText(n,W/2,612)}
  else if(b.icon==='🐦'){x.save();x.translate(W/2-140,590-140);x.scale(280/24,280/24);const bg=x.createLinearGradient(0,6,4,18);bg.addColorStop(0,'#FFE3A6');bg.addColorStop(1,'#F7A46F');x.fillStyle=bg;
    x.fill(new Path2D('M3.5 13.4c2.7-.2 4.5-1.7 5.7-3.7C10.7 7.3 12.9 6 15.4 6c2.2 0 3.9 1.3 4.5 3.1l1.6.4-1.5 1.2c-.3 4.6-4 7.8-8.7 7.8-3.3 0-6.1-1.6-7.8-5.1z'));x.strokeStyle='#D97A4E';x.lineWidth=1.3;x.lineCap='round';x.stroke(new Path2D('M8.8 14.5c1.8.5 3.5.3 5-.7'));x.fillStyle='#4B2C1E';x.beginPath();x.arc(16,9.6,.95,0,7);x.fill();x.restore()}
  else{x.font=`190px ${F}`;x.fillText(b.icon,W/2,615)}
  x.textBaseline='alphabetic';
  x.fillStyle='#fff';x.font=`800 96px ${F}`;x.fillText(b.name,W/2,958);
  x.fillStyle='rgba(255,255,255,.78)';x.font=`500 38px ${F}`;x.fillText(b.desc,W/2,1022);
  x.fillStyle='#C6EA3D';x.font=`700 34px ${F}`;const d=b.at?new Date(b.at):null;x.fillText(`${cardName(u)}${d?` · ${d.getFullYear()}.${d.getMonth()+1}.${d.getDate()} 获得`:''}`,W/2,1110);
  if(bdgRarity(code)<=50){x.fillStyle='rgba(255,255,255,.55)';x.font=`500 28px ${F}`;x.fillText(`只有 ${bdgRarity(code)}% 的球友有这枚徽章`,W/2,1160)}
  // 底部：一句话 + 二维码
  x.textAlign='left';x.fillStyle='rgba(255,255,255,.92)';x.font=`700 34px ${F}`;x.fillText('在'+CITY.zh+'，一起打网球',110,1290);
  x.fillStyle='rgba(255,255,255,.55)';x.font=`500 26px ${F}`;x.fillText('扫码看看附近的球局 · nanbanqiu.app',110,1338);
  const qi=await qrImage(shareURL('https://nanbanqiu.app/p/'+fmtNo(u.no),BSH.to==='xhs'?'xhs':'moments'));const qx=W-110-150,qy=1210;x.fillStyle='#fff';x.beginPath();x.roundRect?x.roundRect(qx,qy,150,150,20):x.rect(qx,qy,150,150);x.fill();if(qi)x.drawImage(qi,qx+13,qy+13,124,124);
  return cv}
async function bdgShare(uid,code){BSH={uid,code,to:BSH.to||'moments',url:null,cv:null};bdgClose(true);UF_OPEN(`<div class="sc bsh" id="bshBox"><div class="sc-h"><b>分享徽章</b></div><div class="bsh-load">正在生成分享图…</div></div>`);
  const cv=await bdgPoster2(uid,code);BSH.cv=cv;BSH.url=cv.toDataURL('image/png');bshDraw()}
function bshDraw(){const box=document.getElementById('bshBox');if(!box)return;const{uid,code,to,url}=BSH,u=U(uid),t=bshText(uid,code,to);
  const pv=to==='xhs'?`<div class="sc-xhs bsh-x"><img src="${url}" alt=""><div class="sc-xt">${esc(t.title)}</div><div class="sc-xu">${av(u,'sm')}<span>${esc(u.name.split(' ')[0])}</span><i>♡ 0</i></div></div>`
    :`<div class="sc-mo">${av(u)}<div class="sc-mb"><b>${esc(u.name.split(' ')[0])}</b><p>${esc(t.body)}</p><img class="bsh-m" src="${url}" alt=""><small>刚刚</small></div></div>`;
  box.outerHTML=`<div class="sc bsh" id="bshBox"><div class="sc-h"><b>分享徽章</b></div>
    <div class="sc-seg"><button class="${to==='moments'?'on':''}" data-bsh="to" data-v="moments">朋友圈</button><button class="${to==='xhs'?'on':''}" data-bsh="to" data-v="xhs">小红书</button></div>
    <div class="sc-pv">${pv}</div>
    <div class="bsh-b"><button class="btn btn-p" data-bsh="save">保存图片</button><button class="btn btn-s" data-bsh="copy">复制${to==='xhs'?'标题和正文':'文案'}</button></div>
    <p class="bsh-tip">${to==='xhs'?'打开小红书，发布笔记时选这张图，粘贴文案即可':'打开微信朋友圈，选这张图，粘贴文案即可'}</p></div>`}
document.addEventListener('click',e=>{const b=e.target.closest('[data-bsh]');if(!b)return;e.stopPropagation();const k=b.dataset.bsh;
  if(k==='to'){BSH.to=b.dataset.v;bshDraw();return}
  if(k==='copy'){const t=bshText(BSH.uid,BSH.code,BSH.to),s=BSH.to==='xhs'?t.title+'\n\n'+t.body:t.body;(navigator.clipboard?navigator.clipboard.writeText(s):Promise.reject()).then(()=>toast('文案已复制'),()=>toast('文案已复制'));return}
  if(k==='save'){const cv=BSH.cv;if(!cv)return;cv.toBlob(async blob=>{const name=`南伴球-${BSH.code}.png`;try{const f=new File([blob],name,{type:'image/png'});if(navigator.canShare&&navigator.canShare({files:[f]})){await navigator.share({files:[f]});return}}catch(err){}
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500);toast('图片已保存')},'image/png')}},true);

