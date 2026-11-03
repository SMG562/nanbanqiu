/* =====================================================================
 * 第三批 · 3d-1：访问与页面 · 手机与电脑 · 打开方式 —— 从数据层算
 *  访问记录 = 每人每天一行（会话数按设备、每个页面的访问次数、停留、入口、打开方式）+ 每天每个未登录访客一行
 *  页面停留来自 page_time（原型按页面基准 × 设备随机模拟）；站外来源、从哪里点进球局按天汇总（daily_metrics 维度）
 * ===================================================================== */
const A3=(()=>{const D=DB,NS=D.NS,PWA_ONLY=SCREENS.map(x=>x[5]==='仅 PWA'),ENVK=ENVS.map(e=>e[0]),EG=Object.fromEntries(ENVS.map(e=>[e[0],e[2]]));
  const deskEnv=u=>u.env0&&u.env0.startsWith('desk')?u.env0:'desk_chrome',deskOS=u=>u.os==='macOS'||u.os==='Windows'?u.os:b1h('os'+u.id)<.5?'macOS':'Windows';
  const anonOS=(id,env)=>env.startsWith('desk')?(env==='desk_safari'?'macOS':env==='desk_edge'||b1h('ao'+id)<.55?'Windows':'macOS'):env.includes('android')?'Android':b1h('ao'+id)<.84?'iOS':'Android';
  // 区间汇总：dev = all / mobile / desktop
  function acc(a,b,cut,dev){const key=[a,b,cut,dev].join('|');if(acc.c&&acc.c.k===key)return acc.c.v;
    const m=dev==='mobile'?1:dev==='desktop'?2:3,o={views:Array(NS).fill(0),people:[...Array(NS)].map(()=>new Set()),pvM:Array(NS).fill(0),pvD:Array(NS).fill(0),ent:[0,0,0,0],ses:0,dur:0,pv:0,env:{},envDur:{},envUsers:{},os:{},det:new Set(),detByDay:[]};
    const addEnv=(k,s,du,uid)=>{o.env[k]=(o.env[k]||0)+s;o.envDur[k]=(o.envDur[k]||0)+du;if(uid!=null)(o.envUsers[k]=o.envUsers[k]||new Set()).add(uid)};
    for(let d=Math.max(0,a);d<=Math.min(D.L,b);d++){const A=D.activity[d],N=D.anon[d];
      for(let i=0;i<A.u.length;i++){if(A.t[i]>=cut)continue;const u=D.users[A.u[i]],sM=A.sesM[i],sD=A.sesD[i],ses=sM+sD,s=(m&1?sM:0)+(m&2?sD:0);if(!s)continue;const f=s/ses;
        o.ses+=s;o.dur+=(m&1?A.durM[i]:0)+(m&2?A.durD[i]:0);for(let j=0;j<NS;j++){const c=A.pv[i*NS+j];if(!c)continue;const po=PWA_ONLY[j],cm=po?(sM?c:0):sD?(sM?Math.round(c*sM/ses):0):c,cd=po?0:c-cm,v=(m&1?cm:0)+(m&2?cd:0);o.pvM[j]+=cm;o.pvD[j]+=cd;if(!v)continue;o.views[j]+=v;o.pv+=v;o.people[j].add(A.u[i])}   // 每次访问归到一台设备
        for(let k=0;k<4;k++)o.ent[k]+=(m&1?A.esM[i*4+k]:0)+(m&2?A.esD[i*4+k]:0);
        const em=ENVK[A.env[i]];if(m&1&&sM)addEnv(A.dev[i]&1?em:'safari_ios',sM,A.durM[i],u.id);if(m&2&&sD)addEnv(deskEnv(u),sD,A.durD[i],u.id);
        if(m&1&&sM)o.os[u.os==='macOS'||u.os==='Windows'?'iOS':u.os]=(o.os[u.os==='macOS'||u.os==='Windows'?'iOS':u.os]||0)+sM;if(m&2&&sD)o.os[deskOS(u)]=(o.os[deskOS(u)]||0)+sD;
        if(A.scr[i]&2){o.det.add(A.u[i]);(o.detByDay[d]=o.detByDay[d]||new Set()).add(A.u[i])}}
      for(let i=0;i<N.a.length;i++){if(N.reg[i]!=null||N.t[i]>=cut||!(N.dev[i]&m))continue;o.ses++;o.dur+=N.dur[i];const ek=ENVK[N.env[i]];addEnv(ek,1,N.dur[i],null);o.os[anonOS(N.a[i],ek)]=(o.os[anonOS(N.a[i],ek)]||0)+1;
        o.ent[[1,2,4,8].indexOf(N.ent[i])]++;for(let j=0;j<NS;j++){const c=N.pv[i*NS+j];if(!c||(PWA_ONLY[j]&&N.dev[i]!==1))continue;o.views[j]+=c;o.pv+=c;(N.dev[i]===1?o.pvM:o.pvD)[j]+=c;o.people[j].add('a'+N.a[i])}}}
    acc.c={k:key,v:o};return o}
  const rng=()=>{const M=MM();return M.range};
  // 申请：这一天看过详情、又在同一天申请的人（看球局 → 申请）
  function viewApply(a,b,cut,dev){const o=acc(a,b,cut,dev);let v=0,ap=0;for(let d=Math.max(0,a);d<=Math.min(D.L,b);d++){const s=o.detByDay[d];if(!s)continue;v+=s.size;const A=new Set(B3.appsBy[d].filter(p=>p.created_at<cut&&B3.ok(dev,p.device)).map(p=>p.user_id));s.forEach(u=>{if(A.has(u))ap++})}return v?ap/v:null}
  // 次日留存：区间内注册（不含最后一天）的人，第二天又来了
  function nextDay(a,b,f){const nu=D.users.filter(u=>u.day>=a&&u.day<Math.min(b,D.L)&&f(u));if(!nu.length)return null;let r=0;nu.forEach(u=>{if(D.actIdx[u.day+1]&&D.actIdx[u.day+1].has(u.id))r++});return r/nu.length}
  const pushOK=u=>u.push&&(u.pwa||u.os==='Android'||u.dev==='desktop');
  return {acc,rng,viewApply,nextDay,pushOK,EG,deskEnv}})();

/* ---------- 进入方式 ---------- */
entryData=function(){const {a,b,cut,dk}=A3.rng(),o=A3.acc(a,b,cut,dk),SH=b1share(),D=DB;
  const direct=o.ent[0],push=o.ent[1],share=o.ent[2],ext=o.ent[3],ses=o.ses;
  const cg={};[...SH.game.rows,...SH.card.rows].forEach(r=>{cg[r.k]=(cg[r.k]||0)+r.opens});
  const CN={link:'复制链接 · link',xhs:'小红书 · xhs',moments:'朋友圈 · moments',text:'复制文案 · text',sys:'系统分享 · sys（PWA）',webqr:'网页扫码 · webqr（Web）'};
  const ch=Object.keys(CN).map(k=>({n:CN[k],k,v:cg[k]||0})).sort((p,q)=>q.v-p.v);
  const X=[0,0,0,0],V={};for(let d=Math.max(0,a);d<=Math.min(D.L,b);d++){['mobile','desktop'].forEach((k,ix)=>{if(!B3.ok(dk,k))return;D.ext_sources[d][k].forEach((v,i)=>X[i]+=v);Object.entries(D.game_view_via[d]).forEach(([w,c])=>V[w]=(V[w]||0)+c[ix])})}
  const exs=[{n:'Google 搜索',v:X[0]},{n:'小红书（非分享链接）',v:X[1]},{n:'微信（非分享链接）',v:X[2]},{n:'其他网站',v:X[3]}];
  const VN={list:'发现页列表 · list',map:'地图 · map',notif:'消息 / 通知 · notif',mine:'我的球局 · mine',link:'直接链接 · link',chat:'球局聊天 · chat',card:'球员卡 · card',share_link:'站外分享链接 · share_link'};
  const via=Object.keys(VN).map(k=>({n:VN[k],v:V[k]||0}));const gv=via.reduce((s,x)=>s+x.v,0),sl=V.share_link||0;
  // 分享链接来的新球友 vs 其他新球友：注册后 7 天内申请过的比例
  const nu=D.users.filter(u=>u.created_at>=D.dms(a)&&u.created_at<Math.min(D.dms(b+1),cut)&&B3.ok(dk,u.dev)),ap=new Set(D.game_participants.filter(p=>p.role==='player').map(p=>p.user_id+'|'+(D.users[p.user_id].created_at+7*D.DAY>p.created_at?1:0)));
  const ar=f=>{const x=nu.filter(f);return x.length>=10?x.filter(u=>ap.has(u.id+'|1')).length/x.length:null},rS=ar(u=>u.src==='share'),rO=ar(u=>u.src!=='share');
  return {ses,share,ext,push,direct,ch,exs,via,gv,sl,rS,rO}};
screenRows=function(){const {a,b,cut,dk}=A3.rng(),o=A3.acc(a,b,cut,dk),oM=A3.acc(a,b,cut,'mobile'),oD=A3.acc(a,b,cut,'desktop');A3.acc(a,b,cut,dk);
  return SCREENS.map(([k,n,per,m0,sec,bb],j)=>{const v=o.views[j],pM=oM.views[j],pD=oD.views[j],m=pM+pD?pM/(pM+pD):0;
    return {k,n,b:bb||'两端',v,m,u:o.people[j].size,uP:oM.people[j].size,uW:oD.people[j].size,pwa:pM,web:pD,sec:sec*(m+(1-m)*1.25),secP:sec,secW:sec*1.25}})};
pageTraffic=function(){const rows=screenRows(),E=entryData(),SH=b1share();
  const totPV=rows.reduce((a,r)=>a+r.v,0),ins=E.rS!=null&&E.rO!=null&&E.rS>=E.rO*1.2?`<div class="insight" style="margin-top:12px"><div>从分享链接来的新球友，注册后 7 天内申请过的有 <b>${pct(E.rS)}</b>，其他新球友 <b>${pct(E.rO)}</b>——被朋友专门转发的局，意向更强。</div></div>`:'';
  return `<div class="grid g4">${kpi('页面访问',fmt(totPV),rangeTxt()+' · 人次')}${kpi('站外进入',pct(E.ses?(E.share+E.ext)/E.ses:0),`${fmt(E.share+E.ext)} 次会话 · 其中分享链接 ${fmt(E.share)}`)}${kpi('直接打开',pct(E.ses?E.direct/E.ses:0),'主屏幕 / 收藏 / 输入网址')}${kpi('分享带来注册',fmt(SH.regs),'打开分享链接当天注册')}</div>
  <div class="card sec"><div class="ch"><b>每个页面</b><small>${rangeTxt()} · ${S.plat==='all'?'手机 + 电脑':PLAT_NAME[S.plat]} · 人数按整段时间去重（含未登录访客）</small></div><table><thead><tr><th>页面</th><th class="mono" style="font-family:inherit">screen</th><th>哪端有</th><th class="r">访问人次</th><th class="r">访问人数</th><th class="r">人均次数</th><th class="r">平均停留</th><th>手机 / 电脑</th></tr></thead><tbody>
    ${rows.map(r=>`<tr><td><b style="font-weight:600">${r.n}</b></td><td class="mono" style="color:var(--mut)">${r.k}</td><td style="font-size:12px;color:var(--ink2);white-space:nowrap">${r.b}</td><td class="r num">${fmt(r.v)}</td><td class="r num">${fmt(r.u)}</td><td class="r num">${(r.u?r.v/r.u:0).toFixed(1)}</td><td class="r num">${Math.round(S.plat==='pwa'?r.secP:S.plat==='web'?r.secW:r.sec)} 秒</td>
      <td style="width:170px"><span class="split" data-tv="${pct(r.m)} / ${pct(1-r.m)}" data-tl="${r.n} · 手机 / 电脑"><i style="width:${(r.m*100).toFixed(0)}%;background:var(--c1)"></i><i style="width:${((1-r.m)*100).toFixed(0)}%;background:var(--c2)"></i></span></td></tr>`).join('')}</tbody></table></div>
  <div class="grid g3 sec"><div class="card"><div class="ch"><b>怎么进来的</b><small>会话的进入方式</small></div>${stack100([{n:'分享链接',v:E.share},{n:'其他站外',v:E.ext},{n:'推送 / 通知',v:E.push},{n:'直接打开',v:E.direct}])}
      <div class="ch" style="margin-top:18px"><b>其他站外来源</b></div>${barsH(E.exs,{lw:120})}</div>
    <div class="card"><div class="ch"><b>站外：分享链接按渠道</b><small>链接里的 ?s= · 与「分享与拉新」的「被打开」一致</small></div>${barsH(E.ch,{lw:112})}</div>
    <div class="card"><div class="ch"><b>站内：从哪里点进球局</b><small>game_view ${fmt(E.gv)} 次</small></div>${barsH(E.via,{lw:96})}${ins}</div></div>`};

/* ---------- 手机与电脑（不受右上角设备筛选影响，范围照常） ---------- */
pagePlatform=function(){const D=DB,{a,b,cut}=A3.rng(),M=b1allPlat(()=>MM()),one=M.one,P=k=>{const p=S.plat;S.plat=k;B1C={k:''};try{return MM()}finally{S.plat=p;B1C={k:''}}},mm=P('pwa'),md=P('web');
  const oM=A3.acc(a,b,cut,'mobile'),oD=A3.acc(a,b,cut,'desktop'),days=M.days||1;
  const act=dev=>{const s=new Set();for(let d=Math.max(0,a);d<=Math.min(D.L,b);d++){const A=D.activity[d];for(let i=0;i<A.u.length;i++)if(A.t[i]<cut&&(dev==='mobile'?A.sesM[i]:A.sesD[i]))s.add(A.u[i])}return s};
  const uM=act('mobile'),uD=act('desktop'),pr=(s,f)=>{let n=0;s.forEach(id=>{if(f(D.users[id]))n++});return s.size?n/s.size:null};
  const pact=dev=>{const first=new Map(),fa=(id,t)=>{if(!first.has(id)||first.get(id)>t)first.set(id,t)};D.game_participants.forEach(p=>fa(p.user_id,p.created_at));D.invites.forEach(i=>{fa(i.from_user,i.created_at);if(i.status==='accepted')fa(i.to_user,i.decided_at)});let acc=0;first.forEach((t,id)=>{if(t>=D.dms(a)&&t<Math.min(D.dms(b+1),cut)&&D.users[id].dev===dev)acc++});const pv=acc+Math.round(acc*.03*(.5+b1h('pact'+a+b)));return pv?acc/pv:null};
  const rows=[['日活（日均）',[mm.dau,md.dau],fmt,'当天在这台设备上打开过的人（含未登录）'],['新注册',[mm.nu,md.nu],fmt,'按注册时用的设备'],['会话数',[mm.sessions,md.sessions],fmt,'一次打开到离开'],['人均每天会话',[mm.dauSum?mm.sessions/mm.dauSum:0,md.dauSum?md.sessions/md.dauSum:0],v=>v.toFixed(1)+' 次',''],
    ['平均会话时长',[oM.ses?oM.dur/oM.ses:0,oD.ses?oD.dur/oD.ses:0],v=>Math.floor(v/60)+' 分 '+Math.round(v%60)+' 秒','页面停留之和 ÷ 会话'],['每次会话页面数',[oM.ses?oM.pv/oM.ses:0,oD.ses?oD.pv/oD.ses:0],v=>v.toFixed(1),''],['发起球局',[mm.games,md.games],fmt,'按发起时用的设备'],['申请加入',[mm.apps,md.apps],fmt,'按申请时用的设备'],
    ['申请通过率',[mm.apps?mm.appr/mm.apps:0,md.apps?md.appr/md.apps:0],pct,'通过 ÷ 申请'],['开打时人齐',[mm.rate,md.rate],b1pf,'按发起时用的设备'],['看球局 → 申请',[A3.viewApply(a,b,cut,'mobile'),A3.viewApply(a,b,cut,'desktop')],b1pf,'当天看了详情的人里，同一天提交申请的比例'],['分享次数',[mm.shares,md.shares],fmt,'球局 + 球员卡'],['消息',[mm.msgs,md.msgs],fmt,''],
    ['球友约定同意率',[pact('mobile'),pact('desktop')],b1pf,'pact_accept ÷ pact_view(via=gate) · 按注册设备'],['次日留存',[A3.nextDay(a,b,u=>u.dev==='mobile'),A3.nextDay(a,b,u=>u.dev==='desktop')],b1pf,'这段时间注册的人，第二天又来了 · 按注册设备'],['推送 / 通知开启',[pr(uM,A3.pushOK),pr(uD,u=>u.push)],b1pf,'手机为系统推送（主屏幕 App / 安卓），电脑为浏览器通知']];
  const typ=k=>{const g=D.games.filter(x=>x.visibility==='public'&&x.created_at>=D.dms(a)&&x.created_at<Math.min(D.dms(b+1),cut)&&x.game_type===k);return [g.filter(x=>x.created_device==='mobile').length,g.filter(x=>x.created_device==='desktop').length]};
  const mt=oM.ses||1,es=ks=>ks.reduce((s,k)=>s+(oM.env[k]||0),0)/mt;
  return `<div class="insight"><span>📱</span><div>按设备：每个事件里的 <span class="mono">device</span>（mobile / desktop，由设备推断）分手机和电脑，和埋点 device 字段一致；<span class="mono">build</span>（pwa / web）只表示加载的是哪个文件，不用来分平台。这一页不受右上角设备筛选影响，两边始终并排对比。</div></div>
  <div class="card sec"><div class="ch"><b>每日活跃 · 手机 / 电脑</b><small>${one?'近 14 天':rangeTxt()} · 已过完的整天</small></div><div id="plTrend"></div></div>
  <div class="grid g21 sec"><div class="card"><div class="ch"><b>关键指标对比</b><small>${rangeTxt()}</small></div><table><thead><tr><th>指标</th><th class="r" style="color:var(--c1)">手机</th><th class="r" style="color:var(--c2)">电脑</th><th class="r">手机占比</th><th>说明</th></tr></thead><tbody>
    ${rows.map(([n,[x,y],f,d])=>{const share=(f===fmt)&&(x+y)>0?x/(x+y):null;return `<tr><td><b style="font-weight:600">${n}</b></td><td class="r num">${x==null?'—':f(x)}</td><td class="r num">${y==null?'—':f(y)}</td><td class="r">${share!=null?`<span class="mini"><i style="width:${(share*100).toFixed(0)}%"></i></span> <span class="num">${pct(share)}</span>`:'<span style="color:var(--mut)">—</span>'}</td><td style="color:var(--mut);font-size:12px">${d}</td></tr>`}).join('')}</tbody></table></div>
    <div class="card"><div class="ch"><b>各页面访问</b><small>人次</small></div>${pairBars(SCREENS.slice(0,11).map((s,j)=>({n:s[1],a:oM.views[j],b:oD.views[j]})),{lw:70})}</div></div>
  <div class="grid g2 sec"><div class="card"><div class="ch"><b>发布的玩法</b><small>按发起时用的设备</small></div>${pairBars([['doubles','双打'],['singles','单打'],['rally','拉球']].map(([k,n])=>{const[x,y]=typ(k);return {n,a:x,b:y}}),{lw:48})}</div>
    <div class="card"><div class="ch"><b>手机上从哪打开</b><small>手机会话 · 详见「打开方式」</small></div>${barsH([{n:'iPhone · 主屏幕',v:es(['pwa_ios'])},{n:'iPhone · 浏览器',v:es(['safari_ios','chrome_ios'])},{n:'微信内打开',v:es(['wechat'])},{n:'小红书 / 其他 App 内',v:es(['xhs','ig_fb'])},{n:'安卓',v:es(['pwa_android','chrome_android'])},{n:'其他',v:es(['mobile_other'])}],{lw:150,fv:pct})}</div></div>`};

/* ---------- 打开方式（不受右上角设备筛选影响，范围照常） ---------- */
const E3=(()=>{function per(a,b,cut){const D=DB,o=A3.acc(a,b,cut,'all'),all=o.ses||1;
    // 每种环境：看详情 → 当天申请、次日还来、推送开启（按在这个环境里出现过的球友）
    const env={};ENVS.forEach(e=>env[e[0]]={ses:o.env[e[0]]||0,dur:o.envDur[e[0]]||0,users:o.envUsers[e[0]]||new Set(),v:0,ap:0,r0:0,r1:0});
    for(let d=Math.max(0,a);d<=Math.min(D.L,b);d++){const A=D.activity[d],ap=new Set(B3.appsBy[d].filter(p=>p.created_at<cut).map(p=>p.user_id)),nx=D.actIdx[d+1];
      for(let i=0;i<A.u.length;i++){if(A.t[i]>=cut)continue;const k=A.dev[i]&1?ENVS[A.env[i]][0]:A3.deskEnv(D.users[A.u[i]]),x=env[k];if(!x)continue;if(A.scr[i]&2){x.v++;if(ap.has(A.u[i]))x.ap++}if(nx&&d<b){x.r0++;if(nx.has(A.u[i]))x.r1++}}}
    Object.entries(env).forEach(([k,x])=>{let n=0;x.users.forEach(id=>{const u=D.users[id];if(k.startsWith('desk')?u.push:A3.pushOK(u)&&(k.startsWith('pwa')||k==='chrome_android'))n++});x.push=x.users.size?n/x.users.size:0});
    return {o,env,all}}
  return {per}})();
drawEnvTrend=function(){const el=$('#envTrend');if(!el)return;const D=DB,L=D.L,n=S.range===1?14:Math.min(S.range,ALLD),days=[];for(let d=L-n;d<L;d++)if(d>=0)days.push(d);
  const G=EGROUP.map(g=>({name:g[1],color:css(g[2]),vals:days.map(d=>{const o=A3.acc(d,d,D.dms(d+1),'all');return ENVS.filter(e=>e[2]===g[0]).reduce((s,e)=>s+(o.env[e[0]]||0),0)})}));A3.acc.c=null;
  lineMulti(el,days.map(d=>md(new Date(D.dms(d)))),G,v=>fmt(v))};
pageEnv=function(){const D=DB,{a,b,cut}=A3.rng(),P=E3.per(a,b,cut),o=P.o,ses=o.ses,mob=ENVS.filter(e=>e[2]!=='desk').reduce((s,e)=>s+(o.env[e[0]]||0),0)||1,t1=Math.min(D.dms(b+1),cut);
  const inst=D.users.filter(u=>u.pwa&&u.inst<=b),newInst=inst.filter(u=>u.inst>=a).length,gs=EGROUP.map(g=>({n:g[1],v:ENVS.filter(e=>e[2]===g[0]).reduce((s,e)=>s+(o.env[e[0]]||0),0)}));
  const uM=new Set(),uD=new Set();for(let d=Math.max(0,a);d<=Math.min(D.L,b);d++){const A=D.activity[d];for(let i=0;i<A.u.length;i++)if(A.t[i]<cut){if(A.sesM[i])uM.add(A.u[i]);if(A.sesD[i])uD.add(A.u[i])}}
  const pM=uM.size?[...uM].filter(id=>A3.pushOK(D.users[id])).length/uM.size:0,pD=uD.size?[...uD].filter(id=>D.users[id].push).length/uD.size:0;
  // 添加到主屏幕：这段时间在手机浏览器里用过的人
  const lastPwa={};D.activity.forEach((A,d)=>{for(let i=0;i<A.u.length;i++)if(A.dev[i]&1&&ENVS[A.env[i]][0].startsWith('pwa'))lastPwa[A.u[i]]=d});
  const mbU=new Set();for(let d=Math.max(0,a);d<=Math.min(D.L,b);d++){const A=D.activity[d];for(let i=0;i<A.u.length;i++)if(A.t[i]<cut&&A.dev[i]&1&&ENVS[A.env[i]][2]==='mbrowser')mbU.add(A.u[i])}
  const mb=[...mbU].map(id=>D.users[id]),f1=mb.filter(u=>u.a2hsSeen),f2=f1.filter(u=>u.a2hsOpen),f3=f2.filter(u=>u.pwa&&u.inst<=D.L),f4=f3.filter(u=>lastPwa[u.id]!=null&&lastPwa[u.id]>=D.L-7);
  const wxU=new Set();for(let d=Math.max(0,a);d<=Math.min(D.L,b);d++){const A=D.activity[d];for(let i=0;i<A.u.length;i++)if(A.t[i]<cut&&A.dev[i]&1&&['wechat','xhs'].includes(D.users[A.u[i]].env0))wxU.add(A.u[i])}
  const wx=[...wxU].map(id=>D.users[id]),w1=wx.filter(u=>u.wxSeen),w2=w1.filter(u=>u.wxClick),w3=w2.filter(u=>u.sw!=null&&u.sw<=D.L),w4=w3.filter(u=>u.pwa&&u.inst<=D.L);
  const fn=(st,base)=>{if(!base.length)return '<p class="cap">这段时间没有</p>';const z=st.findIndex(x=>!x[1].length);return stepFunnel(st.slice(0,z<0?st.length:z+1).map(([n,x])=>[n,x.length/base.length]),base.length)};
  // 主屏幕用户 vs 手机浏览器用户：每周打开天数、每月打上球、通过后到场
  const grp=k=>{const days={},ids=new Set();for(let d=Math.max(0,a);d<=Math.min(D.L,b);d++){const A=D.activity[d];for(let i=0;i<A.u.length;i++){if(A.t[i]>=cut||!(A.dev[i]&1))continue;const g=ENVS[A.env[i]][2];if(g!==k)continue;ids.add(A.u[i]);days[A.u[i]]=(days[A.u[i]]||0)+1}}
    const w=Math.max(1,(b-a+1)/7),n=ids.size||1,played={};D.games.forEach(g=>{if(g.status!=='completed'||g.starts_at<D.dms(a)||g.starts_at>=t1)return;(D.byGame.get(g.id)||[]).forEach(p=>{if(p.status==='approved'&&ids.has(p.user_id))played[p.user_id]=(played[p.user_id]||0)+1})});
    const ns=D.noshow_confirmed.filter(x=>x.confirmed&&ids.has(x.target_id)&&D.games[x.game_id].starts_at>=D.dms(a)&&D.games[x.game_id].starts_at<t1).length,pl=Object.values(played).reduce((s,x)=>s+x,0);
    return {days:Object.values(days).reduce((s,x)=>s+x,0)/n/w,games:pl/n/Math.max(1,(b-a+1)/30),att:pl+ns?pl/(pl+ns):null,n:ids.size}};
  const gP=grp('pwa'),gB=grp('mbrowser'),osT=Object.values(o.os).reduce((s,x)=>s+x,0)||1,dk=ENVS.filter(e=>e[2]==='desk'),dT=dk.reduce((s,e)=>s+(o.env[e[0]]||0),0)||1;
  return `<div class="insight"><span>📲</span><div>把「手机」再拆开：同样在手机上，<b>从主屏幕打开</b>、<b>在微信里点链接</b>、<b>在 Safari 里打开</b>是完全不同的体验和问题。这一页不受右上角设备筛选影响。</div></div>
  <div class="grid g4 sec">${kpi('已添加到主屏幕',fmt(inst.length)+' 人',`占全部球友 ${pct(inst.length/(D.users.length||1))} · ${rangeTxt()}新增 ${fmt(newInst)} ${help('iPhone 以「第一次从主屏幕打开」计（pwa_first_launch），安卓 / 电脑以安装事件计（pwa_installed），按人去重')}`)}
    ${kpi('微信内打开',pct((o.env.wechat||0)/mob),'占手机会话 · 不能推送')}${kpi('小红书内打开',pct((o.env.xhs||0)/mob),'占手机会话 · 多为首访')}${kpi('推送 / 通知开启',pct(pM),'手机 · 电脑通知 '+pct(pD))}</div>
  <div class="grid g2 sec"><div class="card"><div class="ch"><b>会话从哪打开</b><small>${rangeTxt()} · ${fmt(ses)} 次会话</small></div>${stack100(gs)}</div>
    <div class="card"><div class="ch"><b>各环境每日会话</b><small>已过完的整天</small></div><div id="envTrend"></div></div></div>
  <div class="card sec"><div class="ch"><b>每种环境</b><small>${rangeTxt()} · 看球局 → 申请、次日还来、推送都按在这个环境里出现过的球友</small></div><div style="overflow-x:auto"><table><thead><tr><th>环境</th><th>类别</th><th class="r">会话</th><th class="r">占比</th><th class="r">平均会话</th><th class="r">看球局 → 申请 ${help('当天在这个环境里看过球局详情的球友里，同一天提交了申请的比例')}</th><th class="r">次日还来</th><th class="r">推送 / 通知</th><th>观察</th></tr></thead><tbody>
    ${ENVS.map(e=>{const x=P.env[e[0]],sh=x.ses/(ses||1),dur=x.ses?x.dur/x.ses:0;return `<tr><td><b style="font-weight:600">${e[1]}</b><br><small class="mono" style="color:var(--mut)">${e[0]}</small></td><td><span class="pill nodot">${EGROUP.find(g=>g[0]===e[2])[1]}</span></td><td class="r num">${fmt(x.ses)}</td><td class="r"><span class="mini"><i style="width:${Math.min(100,sh/.3*100).toFixed(0)}%;background:var(${EGROUP.find(g=>g[0]===e[2])[2]})"></i></span> <span class="num">${pct(sh)}</span></td><td class="r num">${x.ses?Math.floor(dur/60)+':'+String(Math.round(dur%60)).padStart(2,'0'):'—'}</td><td class="r num">${x.v>=20?pct(x.ap/x.v):'—'}</td><td class="r num">${x.r0>=20?pct(x.r1/x.r0):'—'}</td><td class="r num">${e[2]==='inapp'||e[0]==='safari_ios'||e[0]==='chrome_ios'||e[0]==='mobile_other'?'<span style="color:var(--mut)">不能推送</span>':x.users.size?pct(x.push):'—'}</td><td style="font-size:12px;color:var(--ink2)">${e[8]||''}</td></tr>`}).join('')}</tbody></table></div><p class="cap">会话少于 20 时不显示比例。</p></div>
  <div class="grid g2 sec"><div class="card"><div class="ch"><b>添加到主屏幕</b><small>${rangeTxt()}在手机浏览器里用过的球友</small></div>${fn([['在手机浏览器里打开过',mb],['看到「添加到主屏幕」提示',f1],['打开了添加教程',f2],['第一次从主屏幕打开',f3],['最近 7 天还从主屏幕打开',f4]],mb)}<p class="cap">iPhone 不能直接弹出安装，只能看教程手动添加——这一步流失最大。</p></div>
    <div class="card"><div class="ch"><b>微信 / 小红书里的球友去哪了</b><small>${rangeTxt()}</small></div>${fn([['在微信 / 小红书里打开',wx],['看到「在浏览器打开」提示',w1],['点开了提示',w2],['之后在 Safari / Chrome 登录',w3],['添加到主屏幕',w4]],wx)}<p class="cap">按登录后的用户 ID 把不同环境串起来；未登录的只能按设备看。</p></div></div>
  <div class="grid g3 sec"><div class="card"><div class="ch"><b>系统</b><small>按会话</small></div>${barsH(['iOS','Android','macOS','Windows'].map(k=>({n:k,v:(o.os[k]||0)/osT})),{lw:70,fv:pct})}</div>
    <div class="card"><div class="ch"><b>主屏幕用户 vs 手机浏览器用户</b><small>${rangeTxt()}</small></div><table><tbody>${[['每周打开天数',gP.days.toFixed(1)+' 天',gB.days.toFixed(1)+' 天'],['每月打上球',gP.games.toFixed(1)+' 次',gB.games.toFixed(1)+' 次'],['通过后到场',b1pf(gP.att),b1pf(gB.att)]].map(r=>`<tr><td>${r[0]}</td><td class="r num"><b>${r[1]}</b></td><td class="r num" style="color:var(--mut)">${r[2]}</td></tr>`).join('')}</tbody></table><p class="cap">左：主屏幕 App（${fmt(gP.n)} 人）；右：手机浏览器（${fmt(gB.n)} 人）。</p></div>
    <div class="card"><div class="ch"><b>电脑</b><small>浏览器 · 按会话</small></div>${barsH(dk.map(e=>({n:e[1].replace('电脑 ',''),v:(o.env[e[0]]||0)/dT})),{lw:70,fv:pct})}<p class="cap">电脑会话最长，多用于看地图挑球局；可以开浏览器通知，手机没开推送时提醒才会推到电脑。</p></div></div>`};

