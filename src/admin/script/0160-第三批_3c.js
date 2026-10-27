/* =====================================================================
 * 第三批 · 3c：球友相关页面改从数据层算
 *  · USERS = 数据层的全部球友（不再是原型样本）；场次 / 赴约率 / 等级 / 最近活跃 / 状态都从数据算
 *  · 活跃分（ustat）按所选时间范围真实统计；等级按 v3 规则（与前台 JOURNEY 一致）
 *  · 风险用户按 risk_rules 从数据算；待审核的举报列表来自 reports 表
 * ===================================================================== */
// 等级门槛（与前台一致）：Lv3 好评率 ≥ 1/2，Lv4 / Lv5 ≥ 2/3（之前后台写成 .3 / .4 / .5，已改正）
B1_LV[1][2]=.5;B1_LV[2][2]=2/3;B1_LV[3][2]=2/3;
const U3=(()=>{const D=DB,now=+NOW,DAY=D.DAY,N=D.users.length,z=()=>new Float64Array(N);
  // 每个人：计入的场次、发起成局、确认爽约、临时退出、一起打过的人、给过好评的人、最近活跃、近 14 天每天的活跃
  const played=z(),hosted=z(),ns=z(),late=z(),last=z(),mates=[...Array(N)].map(()=>new Set()),givers=[...Array(N)].map(()=>new Set()),ns90=z(),rep6m=z();
  D.games.forEach(g=>{if(g.status!=='completed')return;const ps=(D.byGame.get(g.id)||[]).filter(p=>p.status==='approved').map(p=>p.user_id);if(ps.length<2)return;
    ps.forEach(a=>{played[a]++;ps.forEach(b=>{if(a!==b)mates[a].add(b)})});hosted[g.host_id]++});
  D.noshow_confirmed.forEach(n=>{if(!n.confirmed)return;const ap=D.noshow_appeals.find(x=>x.game_id===n.game_id&&x.user_id===n.target_id);if(ap&&ap.status!=='rejected')return;ns[n.target_id]++;if(n.at>=now-90*DAY)ns90[n.target_id]++});
  D.game_participants.forEach(p=>{if(p.status==='left'&&p.leave_reason!=='changed'&&p.left_at-p.decided_at>10*6e4&&D.games[p.game_id].starts_at-p.left_at<=24*36e5)late[p.user_id]++});
  D.impressions.forEach(x=>givers[x.to_id].add(x.from_id));
  D.reports.forEach(r=>{if(r.target_type==='user'&&r.status==='actioned'&&r.created_at>=now-182*DAY)rep6m[r.target_id]++});
  D.activity.forEach(A=>{for(let i=0;i<A.u.length;i++)if(A.t[i]>last[A.u[i]])last[A.u[i]]=A.t[i]});
  // 区间统计（活跃分）：发起并成局 ×4 · 到场打球 ×3 · 申请 ×1 · 邀约 ×1 · 留印象 ×0.5 · 活跃天数 ×1 · 爽约 ×−5
  function range(a,b,cut){const o=new Map(),get=id=>{let x=o.get(id);if(!x){x={hostOk:0,play:0,apply:0,inv:0,imp:0,days:0,noshow:0};o.set(id,x)}return x},t0=D.dms(a),t1=Math.min(D.dms(b+1),cut),inR=t=>t>=t0&&t<t1;
    D.games.forEach(g=>{if(g.status!=='completed'||!inR(g.starts_at))return;const ps=(D.byGame.get(g.id)||[]).filter(p=>p.status==='approved');if(ps.length<2)return;ps.forEach(p=>get(p.user_id).play++);get(g.host_id).hostOk++});
    D.game_participants.forEach(p=>{if(p.role==='player'&&inR(p.created_at))get(p.user_id).apply++});
    D.invites.forEach(i=>{if(inR(i.created_at))get(i.from_user).inv++});D.impressions.forEach(x=>{if(inR(x.created_at))get(x.from_id).imp++});
    D.noshow_confirmed.forEach(n=>{if(n.confirmed&&inR(n.at))get(n.target_id).noshow++});
    for(let d=Math.max(0,a);d<=Math.min(D.L,b);d++){const A=D.activity[d];for(let i=0;i<A.u.length;i++)if(A.t[i]<cut)get(A.u[i]).days++}
    o.forEach(x=>x.score=Math.round(ACT_W.reduce((s,[k,,w])=>s+x[k]*w,0)*10)/10);return o}
  const lvOf=id=>{const m=mates[id].size,f=givers[id].size,rate=(f+1)/(Math.max(m,f)+4),att=played[id]?played[id]/(played[id]+ns[id]+.5*late[id]):1;let lv=1;
    for(let i=0;i<B1_LV.length;i++){const[g,a,r,fr]=B1_LV[i];if(played[id]>=g&&att>=a&&rate>=r&&f>=fr&&(i<3||!rep6m[id]))lv=i+2;else break}
    if(ns90[id]>=4)lv=Math.min(lv,2);else if(ns90[id]>=2)lv=Math.min(lv,3);return {lv,rate,att,from:f,mates:m}};
  return {played,hosted,ns,late,last,mates,givers,ns90,rep6m,range,lvOf}})();
// USERS：原型样本换成数据层的全部球友（数组本身不变，各页面的引用照常有效）
{const D=DB,now=+NOW,hx=(s,n)=>{let o='';for(let i=0;o.length<n;i++)o+=Math.floor(b1h(s+'#'+i)*4294967296).toString(16).padStart(8,'0');return o.slice(0,n)};
  const SRCM=u=>u.src==='share'?(u.ref!=null&&D.shares[u.ref]&&D.shares[u.ref].target==='card'?SRC[1]:SRC[0]):u.src==='external'?(u.env0==='xhs'?SRC[2]:u.env0==='wechat'?SRC[3]:SRC[4]):SRC[5];
  const WHY={suspended:'多次爽约',limited:'被多人举报',review:'资料存疑，待核实',banned:'严重违反球友约定',deleted:'本人申请注销'};
  USERS.length=0;D.users.forEach(x=>{const L=U3.lvOf(x.id),sp=[];for(let d=D.L-13;d<=D.L;d++){const ix=D.actIdx[d]&&D.actIdx[d].get(x.id);sp.push(ix!=null?1:0)}
    const u={id:'u'+x.id,dbid:x.id,no:x.no,name:x.name,sub:x.suburb,utr:x.utr,uid:`${hx(x.id+'a',8)}-${hx(x.id+'b',4)}-4${hx(x.id+'c',3)}-${'89ab'[Math.floor(b1h(x.id+'v')*4)]}${hx(x.id+'d',3)}-${hx(x.id+'e',12)}`,
      col:COLORS[Math.floor(b1h(x.id+'col')*8)][2],src:SRCM(x),played:U3.played[x.id],hosted:U3.hosted[x.id],att:L.att,lv:L.lv,kRate:L.rate,kFrom:L.from,mates:L.mates,
      last:U3.last[x.id]?Math.max(0,Math.round((now-U3.last[x.id])/6e4)):Math.round((now-x.created_at)/6e4),st:x.status,why:x.status==='active'?null:WHY[x.status],until:x.status_until?(d=>`${d.getMonth()+1}/${d.getDate()}`)(new Date(x.status_until)):null,
      hist:x.status==='active'?[]:[{st:x.status,why:WHY[x.status],by:x.status==='deleted'?'本人':x.status==='suspended'?'系统 · 风险分':'Amy',at:'近 7 天'}],gender:x.gender,dev:x.dev,spark:sp,created_at:x.created_at};
    u.status=u.st==='active'||u.st==='review'?'ok':u.st;USERS.push(u)})}
const UBY=new Map(USERS.map(u=>[u.dbid,u]));
ustat=function(u){const M=MM();if(!M._ust){const {a,b,cut}=M.range;M._ust=U3.range(a,b,cut)}const x=M._ust.get(u.dbid);return x?{...x}:{hostOk:0,play:0,apply:0,inv:0,imp:0,days:0,noshow:0,score:0}};
topUsers=function(n=8){const k=S.usort||'score';return USERS.filter(u=>u.st==='active').map(u=>({u,s:ustat(u)})).filter(x=>x.s.days>0).sort((a,b)=>b.s[k]-a.s[k]||b.s.score-a.s.score).slice(0,n)};
b1lv=u=>u.lv;
b1g=function(u){if(u._g)return u._g;const x=DB.users[u.dbid],g=x.gender||'',hist=[];if(g){hist.push([`首次填写 · ${x.m2f?'男生':g==='f'?'女生':'男生'}`,'本人',(d=>`${d.getMonth()+1}/${d.getDate()}`)(new Date(x.created_at))]);if(x.m2f)hist.unshift(['男生 → 女生（唯一一次）','本人',(d=>`${d.getMonth()+1}/${d.getDate()}`)(new Date(x.m2f))])}
  return u._g={g,m2f:!!x.m2f,hist}};
// 新用户留存：按注册周；第 k 周 = 注册后第 k 个 7 天里至少活跃一天
cohort=function(){const w=8,D=DB,dk=DEVK(),mon=dayAt(-((NOW.getDay()+6)%7)),m0=D.dayOf(+mon);let h='<table class="co"><thead><tr><th style="text-align:left">注册周</th><th>人数</th>'+Array.from({length:w},(_,i)=>`<th>第 ${i} 周</th>`).join('')+'</tr></thead><tbody>';
  for(let c=0;c<w;c++){const d0=m0-7*(w-1-c),us=D.users.filter(u=>u.day>=d0&&u.day<d0+7&&B3.ok(dk,u.dev));h+=`<tr><td style="text-align:left;color:var(--ink2)">${md(new Date(D.dms(d0)))}</td><td class="num">${us.length}</td>`;
    for(let k=0;k<w;k++){if(k>w-1-c||!us.length){h+='<td></td>';continue}const back=us.filter(u=>{for(let d=u.day+7*k+(k?0:1);d<u.day+7*(k+1)&&d<=D.L;d++)if(D.actIdx[d].has(u.id))return true;return false}).length,r=back/us.length;
      h+=`<td class="c num" style="background:${ramp(r)};color:${r>.55?'#fff':'var(--ink)'}" data-tv="${pct(r)} · ${back} 人" data-tl="${md(new Date(D.dms(d0)))} 注册 · 第 ${k} 周${k?'':'（注册后 6 天内又来过）'}">${pct(r)}</td>`}h+='</tr>'}
  return h+'</tbody></table>'};
// 次日 / 7 日 / 30 日留存：注册后第 1 / 7 / 30 天又来了（只算已经过了那一天的人）
function u3ret(dk){const D=DB,r=k=>{const us=D.users.filter(u=>u.day+k<=D.L-1&&u.day>=D.L-90&&B3.ok(dk,u.dev));return us.length?us.filter(u=>D.actIdx[u.day+k].has(u.id)).length/us.length:0};return [r(1),r(7),r(30)]}
pageUsers=function(){const D=DB,dk=DEVK(),M=MM(),N=TU(),US=D.users.filter(u=>B3.ok(dk,u.dev));
  const wau=b1calc(HIST.slice(-8,-1)).au,mau=b1calc(HIST.slice(-31,-1)).au,dau=avg(HIST.slice(-8,-1),'dau'),R=u3ret(dk);
  const gC=k=>US.filter(u=>(u.gender||'')===k).length,gD=(k,dv)=>D.users.filter(u=>(u.gender||'')===k&&u.dev===dv).length;
  const utrB=[['1–2',1,2],['2–3',2,3],['3–4',3,4],['4–5',4,5],['5–6',5,6],['6–7',6,7],['7–8',7,8],['8–10',8,10],['10+',10,99]];
  return `<div class="grid g4">${kpi('总注册球友',fmt(N),S.plat==='all'?'上线以来每天新注册之和':'在'+PLAT_NAME[S.plat]+'上注册的球友')}${kpi('月活',fmt(mau),'近 30 天至少有 1 个事件（去重，含未登录）')}${kpi('周活',fmt(wau),`近 7 天日均 / 月活 ${pct(dau/(mau||1))}`)}${kpi('次日 / 7 日 / 30 日留存',R.map(pct).join(' · '),'近 90 天注册的人，第 1 / 7 / 30 天又来了')}</div>
  <div class="grid g3 sec"><div class="card"><div class="ch"><b>性别</b><small>用户自己确认的；只用于女生局</small></div>${stack100(GENDER.map(g=>({n:g[1],v:gC(g[0])})))}
      <div class="ch" style="margin-top:18px"><b>手机 / 电脑的性别构成</b><small>按注册时用的设备</small></div>${pairBars(GENDER.map(g=>({n:g[1],a:gD(g[0],'mobile'),b:gD(g[0],'desktop')})),{lw:52})}</div>
    <div class="card"><div class="ch"><b>UTR 分布</b></div>${barsH(utrB.map(b=>({n:'UTR '+b[0],v:US.filter(u=>u.utr>=b[1]&&u.utr<b[2]).length})),{lw:70})}</div>
    <div class="card"><div class="ch"><b>新用户留存</b><small>按注册周</small></div><div style="overflow-x:auto">${cohort()}</div></div></div>
  <div class="card sec"><div class="ch"><b>全部球友</b></div></div>`};
// 风险用户：按 risk_rules（权重 · 阈值 · 时间窗）从数据算；分数 ≥ 30 才列出；处理进度保留在本次打开期间
// 与数据库 risk_rules（启用的）逐条相同：代码 · 名称 · 权重 · 阈值 · 时间窗（天）
const RISK_RULES=[['no_show','确认爽约',25,2,30],['late_leave','参加者 24 小时内退出',10,3,30],['host_late_cancel','发起人临时取消',10,2,30],['reported','被不同的人举报',30,2,30],['pact_violation','违反球友约定',30,1,180],
  ['blocked_by','被多人屏蔽',15,3,30],['less_marked','被多人标少遇到',10,3,90],['invite_declined','30 天内邀约被婉拒',10,2,30],['declined_streak','被婉拒后仍高频申请',10,8,7],['women_probe','未确认性别反复试女生局',20,3,30],
  ['gender_flip','注册 30 天内男生改为女生',20,1,30],['dm_burst','新账号 24 小时内私信很多人',15,5,1],['link_spam','反复尝试发链接',15,3,7],
  ['same_device','同一设备注册多个账号',15,2,30],['same_ip','同一网络一天注册 3 个以上账号',10,3,1],['contact_lure','新账号私信里留联系方式（≥2 人）',15,2,7],['apply_churn','申请后反复撤回',10,6,7],['rate_hit','反复触发频率限制',10,5,1]];
const RISK_UNIT={reported:'人',blocked_by:'人',less_marked:'人',dm_burst:'人',contact_lure:'人',same_device:'个号',same_ip:'个号'};
const U3R=(()=>{const D=DB,now=+NOW,DAY=D.DAY,ix=(arr,k)=>{const m=new Map();arr.forEach(x=>{const v=x[k];let a=m.get(v);if(!a){a=[];m.set(v,a)}a.push(x)});return m},E=[];
  const pU=ix(D.game_participants,'user_id'),gH=ix(D.games,'host_id'),rT=ix(D.reports.filter(r=>r.target_type==='user'),'target_id'),bB=ix(D.blocks,'blocked_id'),lT=ix(D.player_prefs.filter(p=>p.pref==='less'),'target_id'),
    iF=ix(D.invites,'from_user'),sU=ix(D.signals,'user_id'),nT=ix(D.noshow_confirmed.filter(n=>n.confirmed),'target_id');
  function counts(id){const w=d=>now-d*DAY,c={},u=D.users[id],P=pU.get(id)||E,sg=k=>(sU.get(id)||E).filter(s=>s.type===k);
    c.no_show=(nT.get(id)||E).filter(n=>n.at>=w(30)).length;
    c.late_leave=P.filter(p=>p.status==='left'&&p.leave_reason!=='changed'&&p.left_at>=w(30)&&p.left_at-p.decided_at>10*6e4&&D.games[p.game_id].starts_at-p.left_at<=24*36e5).length;
    c.host_late_cancel=(gH.get(id)||E).filter(g=>g.status==='cancelled'&&g.cancelled_at>=w(30)&&g.starts_at-g.cancelled_at<=24*36e5&&(D.byGame.get(g.id)||E).some(p=>p.role==='player'&&B3.appr(p)&&p.decided_at<g.cancelled_at)).length;
    const R_=rT.get(id)||E;c.reported=new Set(R_.filter(r=>r.created_at>=w(30)).map(r=>r.reporter_id)).size;c.pact_violation=R_.filter(r=>r.reason==='pact_violation'&&r.status==='actioned'&&r.created_at>=w(180)).length;
    c.blocked_by=new Set((bB.get(id)||E).filter(b=>b.created_at>=w(30)).map(b=>b.blocker_id)).size;
    c.less_marked=new Set((lT.get(id)||E).filter(p=>p.updated_at>=w(90)).map(p=>p.user_id)).size;
    const dec={};(iF.get(id)||E).filter(i=>i.status==='declined'&&i.decided_at>=w(30)).forEach(i=>dec[i.to_user]=(dec[i.to_user]||0)+1);c.invite_declined=Math.max(0,...Object.values(dec));
    c.declined_streak=P.some(p=>p.status==='rejected'&&['known','level','pass'].includes(p.decline_reason)&&p.decided_at>=w(7))?P.filter(p=>p.role==='player'&&p.created_at>=w(7)).length:0;
    c.women_probe=sg('women_probe').filter(s=>s.at>=w(30)).length;c.gender_flip=sg('gender_m2f').filter(s=>s.at>=w(30)&&s.at-u.created_at<=30*DAY).length;
    c.dm_burst=Math.max(0,...sg('dm_burst').filter(s=>s.at>=w(1)||now-u.created_at<=3*DAY).map(s=>s.n));c.link_spam=sg('link').filter(s=>s.at>=w(7)).length;
    const mx=(k,d)=>Math.max(0,...sg(k).filter(s=>s.at>=w(d)).map(s=>s.n||1)),ct=(k,d)=>sg(k).filter(s=>s.at>=w(d)).length;
    c.same_device=mx('same_device',30);c.same_ip=mx('same_ip',1);c.contact_lure=ct('contact_lure',7);c.apply_churn=ct('apply_churn',7);c.rate_hit=ct('rate_hit',1);return c}
  // 只算可能有信号的人（有过爽约、举报、屏蔽、少遇到、取消、被婉拒、退出或其他信号）
  const cand=new Set([...nT.keys(),...rT.keys(),...bB.keys(),...lT.keys(),...sU.keys()]);D.games.forEach(g=>g.status==='cancelled'&&cand.add(g.host_id));D.invites.forEach(i=>i.status==='declined'&&cand.add(i.from_user));
  D.game_participants.forEach(p=>(p.status==='left'||(p.status==='rejected'&&p.decided_at>=now-7*DAY))&&cand.add(p.user_id));
  const all=[...cand].map(id=>{const c=counts(id),hit=RISK_RULES.filter(([k,,,th])=>c[k]>=th);return {id,c,hit,score:hit.reduce((s,r)=>s+r[2],0)}});
  return {all,counts}})();
RISK.length=0;U3R.all.filter(x=>x.score>=30).sort((a,b)=>b.score-a.score).forEach(x=>{const u=UBY.get(x.id),age=Math.round((+NOW-u.created_at)/DB.DAY);
  RISK.push({u:u.name,sub:u.sub,plat:u.dev==='mobile'?'pwa':'web',score:x.score,sig:x.hit.map(r=>[r[1],x.c[r[0]]]),age:age<14?`注册 ${age} 天`:age<60?`注册 ${Math.round(age/7)} 周`:`注册 ${Math.round(age/30)} 个月`,st:u.st==='active'?'open':'handled',uid:u.id})});
// 待审核 → 举报：reports 表（未处理的全部 + 最近处理过的 30 条）
{const D=DB,ago=t=>{const m=Math.round((+NOW-t)/6e4);return m<60?m+' 分钟前':m<1440?Math.round(m/60)+' 小时前':m<2880?'昨天':Math.round(m/1440)+' 天前'};
  const list=D.reports.slice().sort((a,b)=>b.created_at-a.created_at),open=list.filter(r=>r.status==='open'),done=list.filter(r=>r.status!=='open').slice(0,30);
  S.reports.length=0;open.concat(done).forEach(r=>{const who=UBY.get(r.reporter_id),tg=UBY.get(r.target_id);
    S.reports.push({id:'r'+r.id,who:who.name,target:r.target_type==='user'?tg.name:`「${tg.name.split(' ')[0]} 发起的球局」`,type:r.target_type==='user'?'用户':'球局',src:r.source,via:r.via,rc:r.reason,note:null,at:ago(r.created_at),status:r.status})})}
// 安全页：规则触发人数、举报 / 屏蔽、球友约定门槛 —— 全部从数据算
pageSafety=function(){const M=MM(),D=DB,{a,b,cut,dk}=M.range,t0=D.dms(a),t1=Math.min(D.dms(b+1),cut),inR=t=>t>=t0&&t<t1;const open=RISK.filter(r=>r.st==='open').length,high=RISK.filter(r=>r.score>=60&&r.st==='open').length;
  const rep=D.reports.filter(r=>inR(r.created_at)),blk=D.blocks.filter(x=>inR(x.created_at)).length;
  // 球友约定门槛：第一次申请 / 发起 / 约人 / 接受邀约时看到并同意（pact_view · pact_accept）；没同意的人不会有第一次动作
  const first=new Map();const fa=(id,t)=>{if(!first.has(id)||first.get(id)>t)first.set(id,t)};D.game_participants.forEach(p=>fa(p.user_id,p.created_at));D.invites.forEach(i=>{fa(i.from_user,i.created_at);if(i.status==='accepted')fa(i.to_user,i.decided_at)});
  let acc=0;first.forEach((t,id)=>{if(inR(t)&&B3.ok(dk,D.users[id].dev))acc++});const pv=acc+Math.round(acc*.03*(.5+b1h('pact'+a+b)));
  const hit=RISK_RULES.map(r=>U3R.all.filter(x=>x.c[r[0]]>=r[3]).length);
  return `<div class="grid g6">${kpi('看到球友约定',fmt(pv),rangeTxt()+' · pact_view(via=gate)')}${kpi('同意约定',fmt(acc),'同意率 '+pct(pv?acc/pv:0))}${kpi('举报',rep.length+' 条',rep.filter(r=>r.status==='open').length+' 条待处理 · 站内 '+rep.filter(r=>r.source==='in_app').length)}${kpi('屏蔽',fmt(blk),'用户主动屏蔽')}${kpi('高风险用户',high,'风险分 ≥ 60 · 待处理','dn')}${kpi('需要看一下',open,'待处理')}</div>
  <div class="card sec"><div class="ch"><b>潜在风险用户</b></div></div>
  <div class="grid g2 sec"><div class="card"><div class="ch"><b>风险规则</b><small>可调权重和阈值（risk_rules 表）</small></div><table><thead><tr><th>规则</th><th class="r">权重</th><th class="r">阈值</th><th class="r">时间窗</th><th class="r">现在满足的人</th></tr></thead><tbody>
    ${RISK_RULES.map((r,i)=>`<tr><td>${r[1]}</td><td class="r num">${r[2]}</td><td class="r">${r[3]} ${RISK_UNIT[r[0]]||'次'}</td><td class="r">${r[4]} 天</td><td class="r num">${hit[i]}</td></tr>`).join('')}</tbody></table>
    <p class="cap">确认爽约 = 发起人反馈，或两人局里另一位反馈，或 2 人以上反馈；申诉期间不计入。<b>近 30 天确认爽约 2 次 → 建议暂停 7 天</b>；等级上限另按近 90 天算（≥2 次最高 Lv3，≥4 次最高 Lv2）。参加者 24 小时内退出 = 临时退出，确认（或直接加入）后 10 分钟内退出、球局大改后选「来不了」都不算。风险分 = 满足的规则权重之和，30 以上列入风险用户。</p></div>
    <div class="card"><div class="ch"><b>举报</b><span class="pill nodot">站内 + 邮件</span><small>${rangeTxt()}</small></div><p class="cap" style="margin:0">用户在球员卡和聊天里站内举报（私信里举报对方，球局聊天里举报这局的聊天）；也可以写邮件到 <span class="mono">safety@nanbanqiu.com</span>，由管理员录入。都在「待审核 → 举报」处理，24 小时内。</p>
      ${tbl11(['原因','条数'],Object.keys(REP_RC).map(k=>[REP_RC[k],rep.filter(r=>r.reason===k).length]).filter(x=>x[1]))}
      ${tbl11(['来源','条数'],[['站内 · 球员卡',rep.filter(r=>r.source==='in_app'&&r.via==='card').length],['站内 · 聊天',rep.filter(r=>r.source==='in_app'&&r.via==='chat').length],['邮件录入',rep.filter(r=>r.source==='email').length]])}
      <div class="ch" style="margin-top:18px"><b>球友约定门槛 · 查看 / 同意</b><small>第一次申请 / 发起 / 约人 / 接受邀约前必须同意 · ${rangeTxt()}</small></div>${pv?stepFunnel([['看到约定（pact_view · gate）',1],['同意（pact_accept）',acc/pv]],pv):'<p class="cap">这段时间没有</p>'}
      <p class="cap">开打前 30 分钟卡片、球局详情、安全须知里也能看到约定，不算在门槛里。</p></div></div>`};

