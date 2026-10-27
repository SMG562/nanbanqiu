/* ===================== 临时约球（开场前 2 小时内） =====================
 * ① 不用我确认：开场前 2 小时内发布（或修改）时可以打开。水平在范围内的球友点「直接加入」就定了；不在范围内的照常申请、由发起人确认。
 *    名额满了自动关闭加入；满员时其余待确认的申请自动婉拒并通知。
 * ② 申请超时：一局进入开场前 1 小时，发起人还没处理的申请再给 15 分钟（之后才申请的，从申请时算 15 分钟），最晚到开场；
 *    到点自动失效并通知申请人，让 TA 去找别的局。失效后在发起人那边不再显示，只提示「N 个申请超时已失效」。
 *    计算：失效时间 = min( max(申请时间, 开场 − 60 分钟) + 15 分钟 , 开场 )
 * ③ 和已有规则的衔接：
 *    · 开场前 2 小时内才发布 / 改时间 / 顺延的球局，不再发「还缺人」提醒（发起人刚操作过）；开场时没凑齐的提醒照发
 *    · 邮件：开场前 1 小时内的「申请 / 结果」类不发邮件（读到时已经来不及）；开场前 2 小时内的改动 / 取消不等 5 分钟、不合并，立刻发
 *    · 临时退出：被确认（或直接加入）后 10 分钟内退出，不算临时退出 */
const UG_SOON=2*36e5,UG_WIN=36e5,UG_WAIT=15*6e4,UG_GRACE=10*6e4,UG_FRESH=20*6e4;
const ugNow=()=>Date.now();
const ugStart=g=>+new Date(g.starts_at);
const ugDeadline=(p,g)=>{const st=ugStart(g);return Math.min(Math.max(p.created_at||0,st-UG_WIN)+UG_WAIT,st)};
const ugClock=t=>{const d=new Date(t);return (dOff(d)!==dOff(new Date())?relDay(d)+' ':'')+hm(d)};
const ugInstant=c=>!!c&&c.join_mode==='instant'&&c.status!=='cancelled'&&c.status!=='full'&&c.visibility!=='private'&&ugStart(c)>ugNow()&&c.spots>0;
const ugLvFit=(c,u)=>!!u&&u.ntrp>=c.ntrp_min-1e-9&&u.ntrp<=c.ntrp_max+1e-9;
const ugFits=(c,u)=>ugLvFit(c,u)&&!lessHas(c.host_id,u.id);   // 发起人设了「少遇到」的人：照常申请，看起来和普通球局一样
// 发布 / 修改表单：开场前 2 小时内才出现；已经是「直接加入」的球局修改时也显示，方便关掉
function ugShow(f){if(!f||f.o==null||!f.t)return false;const st=+dayAt(f.o,f.t),left=st-ugNow();
  if(left>0&&left<=UG_SOON)return true;if(f.edit){const g=GAMES.find(x=>x.id===f.edit);return !!g&&g.join_mode==='instant'}return false}
const ugMode=f=>f.instant&&ugShow(f)?'instant':'approve';
function ugToggleHTML(f){if(!ugShow(f))return'';
  return `<div class="tgl ngrep" data-ng="instant"><span>不用我确认<small>水平在范围内的球友可以直接加入，临时约球更快凑齐</small></span><span class="sw${f.instant?' on':''}"></span></div>`}

// ---------- 申请超时 ----------
function ugExpire(){const now=ugNow();let n=0;
  PARTS.forEach(p=>{if(p.status!=='pending')return;const g=GAMES.find(x=>x.id===p.game_id);if(!g||g.status==='cancelled')return;
    const dl=ugDeadline(p,g);if(now<dl)return;p.status='rejected';p.reason='timeout';p.expired_at=dl;n++;
    if(now-dl<30*6e4&&ugStart(g)>now-30*6e4)notify(p.user_id,'expired',g.id,g.host_id)});   // 很久以前就该失效的（离线补算）只改状态，不再打扰
  return n}
const _ugGet=api.get;api.get=function(id){ugExpire();return _ugGet.call(api,id)};
const _ugDecide=api.decide;api.decide=function(id,uid,ok){ugExpire();const p=PARTS.find(x=>x.game_id===id&&x.user_id===uid);
  if(!p||p.status!=='pending'){toast(p&&p.reason==='timeout'?'这个申请已经超时失效了':'这个申请已经处理过了');UF_RENDER();return false}
  _ugDecide.call(api,id,uid,ok);if(ok)p.approved_at=ugNow();return true};
// 直接加入
api.join=function(id){const g=GAMES.find(x=>x.id===id);
  const now=ugNow();partUpsert({game_id:id,user_id:ME.id,role:'player',status:'approved',message:'',created_at:now,approved_at:now,via:'instant'});
  notify(g.host_id,'joined',id,ME.id);const c=V(g);
  if(c.spots<=0){g.status='full';c.pend.forEach(q=>{q.status='rejected';q.reason='full_auto';notify(q.user_id,'full',id,g.host_id)})}};
// 临时退出：确认后 10 分钟内退出不算
const ugGrace=p=>!!p&&p.status==='approved'&&!!p.approved_at&&ugNow()-p.approved_at<UG_GRACE;
const ugLate=(p,g)=>ugStart(g)-ugNow()<864e5&&!ugGrace(p);
function ugLeaveTxt(c){const p=c.mineP;if(ugGrace(p))return '刚加入 10 分钟内退出，不算临时退出。';return c.start-NOW<864e5?'开打前 24 小时内退出，会影响你的球友等级。':''}

// ---------- 「还缺人」提醒：刚发布 / 刚改过时间的不提醒 ----------
const ugSetAt=g=>Math.max(g.created_at||0,g.time_set_at||0);
const _ugUf=ufKeep;ufKeep=function(){ugExpire();GAMES.forEach(g=>{const s=ugSetAt(g);if(s&&!g.ufRemind&&ugStart(g)-s<UG_SOON)g.ufRemind=true});_ugUf()};

// ---------- 发起人在详情里看到的 ----------
const _ugHost=ufHostCard;ufHostCard=function(c){if(!c.isHost)return'';const now=ugNow(),fresh=now-ugSetAt(c)<UG_FRESH;let h='';
  if(c.start>now&&!['cancelled'].includes(c.status)){
    if(c.join_mode==='instant'&&c.spots>0)h+=`<div class="ugh">不用你确认 · 水平在 ${lvl(c)} 内的球友可以直接加入</div>`;
    const pend=c.pend.filter(p=>c.start-now<=UG_SOON);
    if(pend.length){const dl=Math.min(...pend.map(p=>ugDeadline(p,c))),who=pend.length===1?esc(U(pend[0].user_id).name.split(' ')[0])+' 的申请':`${pend.length} 个申请`;
      h+=`<div class="ugh warn">${who}${pend.length>1?'最早':''} ${ugClock(dl)} 前没处理会自动失效</div>`}
    const ex=PARTS.filter(p=>p.game_id===c.id&&p.reason==='timeout').length;
    if(ex)h+=`<div class="ugh">${ex} 个申请超过 15 分钟没处理，已自动失效</div>`}
  return h+(fresh?(c.hide_done?`<div class="ufh">🔒 约满或开打后，这局不再公开，只有参加的人能看到</div>`:''):_ugHost(c))};

// ---------- 申请人：申请弹窗、等待中的提示 ----------
const ugApplyNote=c=>{const now=ugNow();if(c.start-now>UG_SOON)return'';const dl=ugDeadline({created_at:now},c);
  return dl>=+c.start?`<div class="ugn">离开打不到 15 分钟，${esc(c.host.name.split(' ')[0])} 可能来不及确认</div>`:`<div class="ugn">${esc(c.host.name.split(' ')[0])} ${ugClock(dl)} 前没确认，申请会自动失效，你可以再找别的局</div>`};
const _ugApply=openApply;openApply=function(id){ugExpire();const c=api.get(id);if(!c)return;
  if(ugInstant(c)&&ugFits(c,ME)){ugOpenJoin(id);return}
  _ugApply(id);const b=document.querySelector('[data-a="doApply"]');if(!b)return;
  const note=ugApplyNote(c)+(c.join_mode==='instant'&&ugInstant(c)&&!ugLvFit(c,ME)?`<div class="ugn">你的水平不在 ${lvl(c)} 内，需要 ${esc(c.host.name.split(' ')[0])} 确认</div>`:'');
  if(note)b.insertAdjacentHTML('beforebegin',note)};
function ugOpenJoin(id){const c=api.get(id),h=c.host;
  UF_OPEN(`<div class="uf ugj"><div class="uf-h">加入这局</div><p class="uf-s">${esc(h.name.split(' ')[0])} 设置了不用确认，加入后就定了</p>
    <div class="mini">${av(h)}<div style="flex:1;min-width:0"><b>${relDay(c.start)} ${hm(c.start)} · ${esc(c.v.short)}</b><span class="s">${TYPE[c.game_type]} · UTR ${lvl(c)} · 发起人 ${esc(h.name)}</span></div></div>
    <p class="ugf">加入后 10 分钟内可以退出，不算临时退出</p>
    <button class="btn btn-p w100" data-ug="join" data-g="${id}">确认加入</button></div>`)}
function ugJoined(id){const c=api.get(id),nav=`https://maps.google.com/?daddr=${encodeURIComponent(c.v.name+' VIC')}`;
  UF_OPEN(`<div class="uf center ugj"><div class="bigic" style="background:var(--gs);color:var(--g)"><svg><use href="#i-check"/></svg></div><div class="uf-h">你已加入</div>
    <p class="uf-s">${relDay(c.start)} ${hm(c.start)} · ${esc(c.v.short)} · ${esc(c.host.name.split(' ')[0])} 会收到通知</p>
    <div class="ugb"><a class="btn btn-p" href="${nav}" target="_blank" rel="noopener">导航到球场</a><button class="btn btn-s" data-ug="done">好的</button></div></div>`)}
document.addEventListener('click',e=>{const b=e.target.closest('[data-ug]');if(!b)return;e.stopPropagation();const k=b.dataset.ug,id=b.dataset.g;
  if(k==='done'){UF_CLOSE();UF_RENDER();return}
  if(k==='join'){if(!ME)return;ugExpire();const c=api.get(id);
    if(!c||c.status==='cancelled'){UF_CLOSE();toast('这局已经取消了');UF_RENDER();return}
    if(ugStart(c)<=ugNow()){UF_CLOSE();toast('这局已经开打了');UF_RENDER();return}
    if(c.mine==='approved'){UF_CLOSE();UF_RENDER();return}
    if(c.spots<=0){UF_CLOSE();toast('刚刚满员了，看看附近其他球局');UF_RENDER();return}
    if(!ugInstant(c)||!ugFits(c,ME)){UF_CLOSE();toast('发起人改成了需要确认，请发送申请');setTimeout(()=>openApply(id),200);return}
    api.join(id);UF_RENDER();ugJoined(id)}},true);
// 等待确认的提示条带上失效时间；超时失效的显示原因
const _ugPass=passHTML0;passHTML0=function(c){let h=_ugPass(c);const p=c.mineP;if(!p||c.isHost)return h;
  if(p.status==='pending'){const now=ugNow();h=h.replace(/(<div class="pass-band band-amber">)⏳ ?/,'$1');
    if(c.start-now<=UG_SOON&&c.start>now){const dl=ugDeadline(p,c);h=h.replace(/(<div class="pass-band band-amber">[^<]*确认)(<\/div>)/,`$1 · ${ugClock(dl)} 前没确认会自动失效$2`)}}
  if(p.reason==='timeout')h=h.replace('这局没排上 · 看看附近其他球局吧',`${esc(c.host.name.split(' ')[0])} 没来得及确认，申请已自动失效`);
  return h};
// 「申请加入」按钮：能直接加入时改成「直接加入」
function ugDecorate(){document.querySelectorAll('[data-a="apply"]:not([data-ugd])').forEach(b=>{b.dataset.ugd='1';
  let id=b.dataset.g||(typeof UI!=='undefined'&&(UI.detail||UI.sel));if(!id&&typeof UI!=='undefined'&&UI.landing&&api.byCode){const x=api.byCode(UI.landing);id=x&&x.id}
  const g=id&&GAMES.find(x=>x.id===id);if(!g)return;const c=V(g);if(!ugInstant(c))return;const cap=b.nextElementSibling&&b.nextElementSibling.classList.contains('cap')?b.nextElementSibling:null;
  if(!ME){b.textContent='直接加入';if(cap)cap.textContent='不用等确认 · 手机号 30 秒完成';return}
  if(ugFits(c,ME)){b.textContent='直接加入';if(cap)cap.textContent='不用等确认，加入后就定了'}
  else if(cap&&!ugLvFit(c,ME))cap.textContent=`你的水平不在 ${lvl(c)} 内，需要 ${c.host.name.split(' ')[0]} 确认`})}
new MutationObserver(()=>ugDecorate()).observe(document.documentElement,{childList:true,subtree:true});

// ---------- 通知 ----------
const _ugNtf=ntfText;ntfText=function(n){const g=GAMES.find(x=>x.id===n.game_id);
  if(g&&(n.kind==='joined'||n.kind==='expired')){const c=V(g),f=U(n.from)||{name:''},when=`${relDay(c.start)} ${hm(c.start)} · ${c.v.short}`;
    return n.kind==='joined'?[`${f.name} 加入了你的球局 🎾`,`UTR ${f1(f.ntrp)} · ${when}`]:[`${f.name} 没来得及确认你的申请`,`申请已自动失效 · 附近还有别的局 ›`]}
  const r=_ugNtf(n);
  if(r&&n.kind==='request'&&g){const p=PARTS.find(x=>x.game_id===g.id&&x.user_id===n.from&&x.status==='pending');
    if(p&&ugStart(g)-ugNow()<=UG_SOON)r[1]+=` · ${ugClock(ugDeadline(p,g))} 前处理`}
  return r};
if(typeof ntfOpen==='function'){const _ugOpen=ntfOpen;ntfOpen=function(n){if(n.kind==='expired'){n.read=true;return _ugOpen({...n,kind:'rejected'})}return _ugOpen(n)}}

// ---------- 邮件 ----------
const _ugEmQ=emQueue;emQueue=function(uid,kind,gid,nid,t=Date.now()){const g=GAMES.find(x=>x.id===gid),k=EM_KIND[kind];
  if(!g||!k)return _ugEmQ(uid,kind,gid,nid,t);const left=ugStart(g)-t;
  if(k!=='change'&&left<UG_WIN)return null;                                   // ⑦ 开场前 1 小时内：申请、结果不发邮件
  const m=_ugEmQ(uid,kind,gid,nid,t);
  if(m&&k==='change'&&left<UG_SOON&&m.status==='queued'){m.after=t;m.urgent=true}   // ⑦ 临近开场的改动 / 取消：立刻发
  return m};

// 页面一直开着：每 30 秒检查一次超时
setInterval(()=>{if(ugExpire())UF_RENDER()},30000);


