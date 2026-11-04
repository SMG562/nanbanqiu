/* =====================================================================
 * 第三批 · 3b：球局、球局全流程、打完之后 —— 每个数字都从 DB 算（概览的 KPI / 趋势 / 漏斗 / 热力图 / 球场 / 区域由上面的基础计算提供）
 * 区间：上方时间范围；设备：球局按发起时、申请按申请时、赛后按球局发起时
 * ===================================================================== */
const X3=(()=>{const D=DB;
  // 区间里的球局：created = 发起时间在区间内；started = 开打时间在区间内且已到开打时间（含取消）
  function ctx(){const M=MM();if(M._x3)return M._x3;const {a,b,cut,dk}=M.range,t0=D.dms(a),t1=Math.min(D.dms(b+1),cut),ok=B3.ok,inR=t=>t>=t0&&t<t1;
    const pub=D.games.filter(g=>g.visibility==='public'&&ok(dk,g.created_device));
    const created=pub.filter(g=>inR(g.created_at)),started=pub.filter(g=>inR(g.starts_at)&&g.starts_at<+NOW);
    const endIn=g=>g.status==='completed'&&inR(g.starts_at+g.duration_min*6e4);
    const ap=g=>(D.byGame.get(g.id)||[]).filter(p=>p.status==='approved');
    return M._x3={M,a,b,cut,dk,t0,t1,inR,pub,created,started,endIn,ap,apps:M._apps||[]}}
  const share=(n,d)=>d?n/d:0;
  return {ctx,share}})();
const LBL_TYPE={singles:'单打',doubles:'双打',rally:'拉球'},LBL_DECL={known:'这局想和熟悉的球友打',level:'想找水平更接近的',pass:'这次先不了'};

/* ---------- 球局 ---------- */
pageGames=function(){const C=X3.ctx(),M=C.M,G=C.created,g=G.length,AP=b1apps(M),W=G.filter(x=>x.tags.includes('women')),ty=k=>G.filter(x=>x.game_type===k).length;
  const ws=C.started.filter(x=>x.tags.includes('women')&&x.status!=='cancelled'),wFill=ws.length?ws.filter(x=>x.filled_at_start).length/ws.length:null;
  const wApps=C.apps.filter(p=>DB.games[p.game_id].tags.includes('women')).length,blocked=W.reduce((s,x)=>s+x.blocked_m,0),gf=C.M.range?DB.reports.filter(r=>r.reason==='gender_fake'&&C.inR(r.created_at)).length:0;
  const tag=(k,n)=>({n,v:G.filter(x=>x.tags.includes(k)).length}),top=regionRows().sort((x,y)=>y.score-x.score).slice(0,6);
  const byDev=k=>[DB.games.filter(x=>x.visibility==='public'&&C.inR(x.created_at)&&x.game_type===k&&x.created_device==='mobile').length,DB.games.filter(x=>x.visibility==='public'&&C.inR(x.created_at)&&x.game_type===k&&x.created_device==='desktop').length];
  const sd=ty('singles'),db=ty('doubles'),ra=ty('rally'),gcd=(x,y)=>y?gcd(y,x%y):x,rr=sd+db?`${Math.round(sd/(sd+db)*100)} : ${Math.round(db/(sd+db)*100)}`:'—';
  return `<div class="grid g6">${kpi('新球局',fmt(g),rangeTxt())}${kpi('单打 : 双打',rr,`拉球 ${pct(X3.share(ra,g))}`)}${kpi('女生局',fmt(W.length),`占全部球局 ${pct(X3.share(W.length,g))}`)}${kpi('申请',fmt(AP.apps),`平均每局 ${(g?AP.apps/g:0).toFixed(1)} 次`)}${kpi('申请通过率',pct(AP.rate),'通过 ÷ 申请')}${b1fillKpi()}</div>
  <div class="grid g2 sec"><div class="card"><div class="ch"><b>申请的结果</b><small>${fmt(AP.apps)} 次申请</small></div>${stack100(AP.parts.filter(p=>p[1]).map(p=>({n:p[0],v:p[1]})))}
      <div class="ch" style="margin-top:18px"><b>婉拒理由</b><small>发起人选的</small></div>${barsH(Object.entries(LBL_DECL).map(([k,n])=>({n,v:AP.why[k]})),{lw:150})}</div>
    <div class="card"><div class="ch"><b>发布的玩法</b><small>${S.plat==='all'?'按发起时用的设备':'在'+PLAT_NAME[S.plat]+'上发起的'}</small></div>${S.plat==='all'?pairBars(['doubles','singles','rally'].map(k=>{const[a,b]=byDev(k);return {n:LBL_TYPE[k],a,b}}),{lw:48}):barsH(['doubles','singles','rally'].map(k=>({n:LBL_TYPE[k],v:ty(k)})),{lw:48})}
      <div class="ch" style="margin-top:18px"><b>女生局</b></div><table><tbody>
      ${[['发布',fmt(W.length),'占全部 '+pct(X3.share(W.length,g))],['每局申请',(W.length?wApps/W.length:0).toFixed(1)+' 次','全部球局 '+(g?AP.apps/g:0).toFixed(1)+' 次'],['开打时人齐',b1pf(wFill),'全部球局 '+b1pf(M.rate)],['被拦下的非女生申请',fmt(blocked),'看不到时间地点，只能看到说明'],['性别冒用举报',fmt(gf),'24 小时内人工核实']].map(r=>`<tr><td>${r[0]}</td><td class="r num"><b>${r[1]}</b></td><td style="color:var(--mut);font-size:12px">${r[2]}</td></tr>`).join('')}</tbody></table></div></div>
  <div class="grid g12 sec"><div class="card"><div class="ch"><b>球局标签</b><small>节奏二选一 · 适合谁可多选 · 都是选填</small></div>${barsH([tag('relax','轻松随意'),tag('match','认真比赛'),tag('newbie','新手友好'),tag('women','女生局')],{lw:70})}</div>
    <div class="card"><div class="ch"><b>最活跃的区域</b><small>${rangeTxt()}</small><div class="r"><button class="btn sm" data-pg="regions">全部区域 ›</button></div></div>${barsH(top.map(r=>({n:r.n,v:r.score})),{lw:110})}</div></div>`};

/* ---------- 球局全流程 ---------- */
pageLife=function(){const C=X3.ctx(),M=C.M,G=C.created.length,Sg=C.started,stG=Sg.filter(x=>x.status!=='cancelled'),st=stG.length,fullG=stG.filter(x=>x.filled_at_start),full=fullG.length,shortG=stG.filter(x=>!x.filled_at_start),short=shortG.length,cancelG=Sg.filter(x=>x.status==='cancelled'),cancel=cancelG.length,base0=st+cancel,rate=st?full/st:0,AP=b1apps(M),apps=C.apps;
  const hr=g=>{const t=new Date(g.starts_at);return t.getHours()+t.getMinutes()/60};
  const B=[['早场','08:00 及以前开打',g=>hr(g)<=8],['上午','08–12 点',g=>hr(g)>8&&hr(g)<12],['下午','12–17 点',g=>hr(g)>=12&&hr(g)<17],['傍晚','17–19 点',g=>hr(g)>=17&&hr(g)<19],['晚场','19:00 及以后',g=>hr(g)>=19]];
  const SL=B.map(([n,d,f])=>{const x=stG.filter(f),fu=x.filter(g=>g.filled_at_start).length;return [n,d,x.length,x.length?fu/x.length:null,x.length-fu]});
  const WDR=[1,2,3,4,5,6,0].map(w=>({n:'周'+WD[w],v:Sg.filter(g=>new Date(g.starts_at).getDay()===w).length}));
  // 开打时还缺人：差在哪（按顺序归到第一个符合的原因）
  const why={none:0,decl:0,exp:0,left:0,one:0,more:0};shortG.forEach(g=>{const ps=(DB.byGame.get(g.id)||[]).filter(p=>p.role==='player'),ok=ps.filter(p=>p.status==='approved').length,need=g.capacity-1;
    if(!ps.length)why.none++;else if(!ok&&ps.some(p=>['known','level','pass'].includes(p.decline_reason))&&!ps.some(p=>p.status==='expired'))why.decl++;else if(ps.some(p=>p.status==='expired'))why.exp++;else if(ps.some(p=>p.status==='left'))why.left++;else if(need-ok===1)why.one++;else why.more++});
  const playedAnyway=shortG.filter(g=>g.status==='completed'&&C.ap(g).length>=2).length;
  const counted=fullG.filter(g=>g.status==='completed'&&C.ap(g).length>=2),withRecap=counted.filter(g=>DB.game_feel.some(f=>f.game_id===g.id));
  // 申请
  const exp=apps.filter(p=>p.status==='expired'),fa=apps.filter(p=>p.decline_reason==='full_auto').length,dec=AP.parts[1][1];
  const reApply=exp.filter(p=>DB.game_participants.some(q=>q.user_id===p.user_id&&q.game_id!==p.game_id&&q.created_at>=p.decided_at&&q.created_at<p.decided_at+30*6e4)).length;
  const leftA=DB.game_participants.filter(p=>p.status==='left'&&p.left_at>=C.t0&&p.left_at<C.t1&&B3.ok(C.dk,p.device||DB.games[p.game_id].created_device)&&p.leave_reason!=='changed');
  const grace=leftA.filter(p=>p.left_at-p.decided_at<=10*6e4).length,late24=leftA.filter(p=>p.left_at-p.decided_at>10*6e4&&DB.games[p.game_id].starts_at-p.left_at<=24*36e5).length;
  // 临时约球（开打前 2 小时内发布）
  const lateG=C.created.filter(g=>g.late),inst=lateG.filter(g=>g.join_mode==='instant'),lateS=stG.filter(g=>g.late),fr=a=>a.length?a.filter(g=>g.filled_at_start).length/a.length:null;
  const ij=apps.filter(p=>DB.games[p.game_id].join_mode==='instant'&&B3.appr(p)&&p.decided_at===p.created_at).length,instR=fr(lateS.filter(g=>g.join_mode==='instant')),appR=fr(lateS.filter(g=>g.join_mode!=='instant'));
  // 修改与取消
  const ch=DB.game_changes.filter(c=>C.inR(c.at)&&B3.ok(C.dk,DB.games[c.game_id].created_device)),chN=k=>ch.filter(c=>c.kind===k).length;
  const chP=DB.game_participants.filter(p=>p.changed&&C.inR(DB.games[p.game_id].created_at)),chLeft=chP.filter(p=>p.leave_reason==='changed').length;
  const cBefore=g=>g.starts_at-g.cancelled_at,cWith=cancelG.filter(g=>(DB.byGame.get(g.id)||[]).some(p=>p.role==='player'&&B3.appr(p)&&p.decided_at<g.cancelled_at));
  const nextGap=list=>{const gaps=list.map(g=>{const n=DB.games.filter(x=>x.host_id===g.host_id&&x.created_at>g.created_at&&x.visibility==='public').sort((p,q)=>p.created_at-q.created_at)[0];return n?(n.created_at-g.created_at)/DB.DAY:null}).filter(x=>x!=null);return gaps.length?gaps.reduce((s,x)=>s+x,0)/gaps.length:null};
  const gW=nextGap(cWith),gN=nextGap(stG.filter(g=>g.filled_at_start).slice(0,400));
  // 值得关注：只列有明显差异的
  const ins=[];const e=SL[0],ev=SL[4];
  if(e[3]!=null&&ev[3]!=null&&e[2]>=10&&ev[2]>=10&&Math.abs(ev[3]-e[3])>=.08)ins.push([`晚场（19:00 后）开打时人齐的比例 <b>${pct(ev[3])}</b>，早场（08:00 前）<b>${pct(e[3])}</b>`,ev[3]>e[3]?'发现页可以加一个「明早」快捷筛选，先观察 2 周早场成局率':'']);
  if(instR!=null&&appR!=null&&lateS.length>=10&&Math.abs(instR-appR)>=.08)ins.push([`开打前 2 小时内发的局，开了「不用我确认」的 <b>${pct(instR)}</b> 人齐，没开的 <b>${pct(appR)}</b>`,instR>appR?'临时局默认打开「不用我确认」，发起人仍可关掉':'']);
  if(short>=10&&why.one/short>=.3)ins.push([`开打时还缺人的局里，<b>${pct(why.one/short)}</b> 只差 1 人`,'缺 1 人的局在开打前 2 小时推给「多遇到」过发起人的球友']);
  const steps=base0>0?stepFunnel([['到了开打时间',1],['没有取消',st/base0],['开打时人齐',full/base0],['打完（计入场次）',counted.length/base0],['有人填了赛后卡片',withRecap.length/base0]],base0):'<p class="cap">这段时间还没有到开打时间的球局</p>';
  return `<div class="grid g4">${kpi('新球局',fmt(G),rangeTxt())}${b1fillKpi()}${kpi('开打时还缺人',fmt(short),st?pct(short/st)+' 的开打球局 · 其中 '+pct(X3.share(playedAnyway,short))+' 照常打了':'—')}${kpi('开打前取消',fmt(cancel),base0?pct(cancel/base0):'—')}</div>
  ${ins11(ins)}
  <div class="grid g2 sec"><div class="card"><div class="ch"><b>一局球的去向</b><small>按开打时间统计</small></div>${stack100([{n:'开打时人齐',v:full},{n:'开打时还缺人',v:short},{n:'开打前取消',v:cancel}])}
    <div class="ch" style="margin-top:18px"><b>开打时还缺人：差在哪</b></div>${barsH([['没人申请',why.none],['申请都被婉拒',why.decl],['申请超时失效',why.exp],['人齐后有人退出',why.left],['缺 1 人',why.one],['缺 2 人以上',why.more]].map(w=>({n:w[0],v:w[1]})),{lw:150})}</div>
    <div class="card"><div class="ch"><b>从开打到打完</b><small>每一步占到了开打时间的球局</small></div>${steps}<p class="cap">每一步都是上一步里的球局。「打完」与球员卡场次同一口径：未取消、已到结束时间、结束时仍是已通过、至少 2 人（含线下补位）、没有被确认爽约；开打时还缺人但照常打完的 ${fmt(playedAnyway)} 局也计入场次，不在这里。</p></div></div>
  ${sec('什么时候打')}
  <div class="grid g2 sec"><div class="card"><div class="ch"><b>开打时段</b><small>已开打的球局 · 开打时人齐的比例</small></div>${tbl11(['时段','开打','占比','人齐','还缺人'],SL.map(s=>[`${s[0]} <small style="color:var(--mut)">${s[1]}</small>`,fmt(s[2]),pct(X3.share(s[2],st)),b1pf(s[3]),fmt(s[4])]))}</div>
    <div class="card"><div class="ch"><b>星期几</b><small>到了开打时间的球局</small></div>${barsH(WDR,{lw:48})}</div></div>
  ${sec('申请')}
  <div class="grid g4">${kpi('申请',fmt(AP.apps),'通过率 '+pct(AP.rate))}${kpi('超时失效',fmt(exp.length),'所有需要确认的球局都适用')}${kpi('满员自动结束',fmt(fa),'对方看到「这局已经满员」')}${kpi('发起人婉拒',fmt(dec),'三句理由 + 可选一句话')}</div>
  <div class="grid g2 sec"><div class="card"><div class="ch"><b>申请截止</b><small>所有需要确认的球局</small></div><p class="cap" style="margin:0">失效时间 = max(申请时间, 开打前 60 分钟) + 15 分钟（不再被开打截断：开打后 30 分钟内仍可申请）。不只是临时局：每一局在开打前最后一小时都按这个规则——开打前 1 小时起开始计时，发起人有 15 分钟处理；开打前 1 小时内提交的申请，从提交起 15 分钟，最晚到开打。到点自动失效并通知申请人；发起人那边只提示「N 个申请超时已失效」。</p></div>
    <div class="card"><div class="ch"><b>超时与退出</b><small>所有球局</small></div>${tbl11(['','次数','说明'],[['申请超时失效',fmt(exp.length),'之后 30 分钟内申请了别的局：'+pct(X3.share(reApply,exp.length))],['确认后 10 分钟内退出',fmt(grace),'不算临时退出'],['开打前 24 小时内退出（临时退出）',fmt(late24),'等级里按半次计，发起人收到提醒']])}</div></div>
  ${sec('临时约球（开打前 2 小时内）')}
  <div class="grid g3">${kpi('临时发布的局',fmt(lateG.length),G?pct(lateG.length/G)+' 的球局':'—')}${kpi('开了「不用我确认」',pct(X3.share(inst.length,lateG.length)),fmt(inst.length)+' 局')}${kpi('直接加入',fmt(ij),'不经过申请')}</div>
  <div class="card sec"><div class="ch"><b>临时局开打时人齐的比例</b></div>${pairBars2([['开了「不用我确认」',instR||0],['没开',appR||0],['全部球局（参考）',rate]])}</div>
  ${sec('改期与取消')}
  <div class="grid g2 sec"><div class="card"><div class="ch"><b>发起人改了什么</b></div>${barsH([{n:'改时间',v:chN('time')},{n:'顺延',v:chN('postpone')},{n:'改人数 / 水平',v:chN('spots')},{n:'改球场',v:chN('venue')},{n:'改说明',v:chN('note')}],{lw:96})}<p class="cap">改时间后已通过的人：继续参加 ${pct(X3.share(chP.length-chLeft,chP.length))} · 退出 ${pct(X3.share(chLeft,chP.length))}（不算临时退出）</p></div>
    <div class="card"><div class="ch"><b>取消发生在</b><small>距开打</small></div>${barsH([{n:'24 小时以上',v:cancelG.filter(g=>cBefore(g)>=24*36e5).length},{n:'2–24 小时',v:cancelG.filter(g=>cBefore(g)>=2*36e5&&cBefore(g)<24*36e5).length},{n:'2 小时内',v:cancelG.filter(g=>cBefore(g)<2*36e5).length}],{lw:96})}<p class="cap">取消时已有人通过的占 ${pct(X3.share(cWith.length,cancel))}${gW!=null&&gN!=null?`，这些局的发起人下次发局平均隔 ${gW.toFixed(1)} 天（人齐的局之后是 ${gN.toFixed(1)} 天）`:''}</p></div></div>`};

/* ---------- 打完之后 ---------- */
pageAfter=function(){const C=X3.ctx(),D=DB,ended=C.pub.filter(C.endIn),eid=new Set(ended.map(g=>g.id)),pl=ended.reduce((s,g)=>s+C.ap(g).length,0);
  const rc=D.recap_notices.filter(r=>eid.has(r.game_id)&&r.at<C.cut),sent=rc.filter(r=>r.sent),opened=rc.filter(r=>r.opened),openedSent=sent.filter(r=>r.opened),acted=rc.filter(r=>r.acted),done=rc.filter(r=>r.done);
  const pr=D.player_prefs.filter(p=>p.via==='recap'&&eid.has(p.game_id)),more=pr.filter(p=>p.pref==='more').length,less=pr.filter(p=>p.pref==='less').length;
  const mates=acted.reduce((s,r)=>s+C.ap(D.games[r.game_id]).length-1,0),ok=Math.max(0,mates-more-less);
  const prR=D.player_prefs.filter(p=>p.updated_at>=C.t0&&p.updated_at<C.t1),viaR=prR.filter(p=>p.via==='recap').length,viaC=prR.filter(p=>p.via==='card').length;
  const chg=D.pref_changes.filter(x=>x.at>=C.t0&&x.at<C.t1),lessBack=chg.filter(x=>x.from==='less').length,moreLess=chg.filter(x=>x.from==='more').length;
  const fl=D.game_feel.filter(f=>eid.has(f.game_id)),fc=k=>fl.filter(f=>f.feel===k).length,hardBy=(lo,hi)=>{const x=fl.filter(f=>f.gap>=lo&&f.gap<hi);return x.length?x.filter(f=>f.feel==='hard').length/x.length:0};
  const im=D.impressions.filter(x=>eid.has(x.game_id)),KI={ontime:0,kind:1,partner:2,serious:3,fun:4,share:5,newbie:6},kc=IMP_A.map(()=>0);im.forEach(x=>x.kinds.forEach(k=>kc[KI[k]]++));
  const eff=D.less_effects.filter(x=>x.at>=C.t0&&x.at<C.t1),ef=k=>eff.filter(x=>x.type===k).length;
  const fo=D.follow_notices.filter(x=>x.at>=C.t0&&x.at<C.t1),foS=fo.filter(x=>x.status==='sent');
  const ns=D.noshow_confirmed.filter(n=>eid.has(n.game_id)),nsRep=D.noshow_reports.filter(n=>eid.has(n.game_id)).length,conf=ns.filter(n=>n.confirmed),ap=D.noshow_appeals.filter(x=>eid.has(x.game_id)),apOK=ap.filter(x=>x.status==='upheld').length;
  const t90=+NOW-90*D.DAY,c90={};D.noshow_confirmed.filter(n=>n.confirmed&&n.at>=t90).forEach(n=>c90[n.target_id]=(c90[n.target_id]||0)+1);const ge2=Object.values(c90).filter(v=>v>=2).length,ge4=Object.values(c90).filter(v=>v>=4).length;
  // 值得关注
  const mRate=f=>{const gs=ended.filter(f),ids=new Set(gs.map(g=>g.id)),a=acted.filter(r=>ids.has(r.game_id)),m=a.reduce((s,r)=>s+C.ap(D.games[r.game_id]).length-1,0);return m>=30?pr.filter(p=>ids.has(p.game_id)&&p.pref==='more').length/m:null};
  const eR=mRate(g=>new Date(g.starts_at).getHours()<8),nR=mRate(g=>new Date(g.starts_at).getHours()>=19),dR=mRate(g=>g.game_type==='doubles'),sR=mRate(g=>g.game_type==='singles');
  const ins=[];if(eR!=null&&nR!=null&&Math.abs(eR-nR)>=.05)ins.push([`早场打完后标「多遇到」的比例 <b>${pct(eR)}</b>，晚场 <b>${pct(nR)}</b>${dR!=null&&sR!=null?`；双打 ${pct(dR)}，单打 ${pct(sR)}`:''}`,'']);
  const h2=hardBy(2,99),h0=hardBy(0,.5);if(fl.length>=30&&h2-h0>=.15)ins.push([`和同场最高 UTR 差 2 以上时，<b>${pct(h2)}</b> 选了「偏难」（差 0.5 以内只有 ${pct(h0)}）`,'发现页可以把水平差 2 以上的局排后一点，或在申请前提醒一句']);
  if(foS.length>=20)ins.push([`收到「TA 发了新球局」的人里 <b>${pct(X3.share(foS.filter(x=>x.applied).length,foS.length))}</b> 申请了`,'']);
  return `<div class="grid g4">${kpi('打完的人次',fmt(pl),rangeTxt())}${kpi('赛后提醒打开',pct(X3.share(openedSent.length,sent.length)),fmt(sent.length)+' 条送出')}${kpi('填写了赛后卡片',pct(X3.share(acted.length,pl)),'含从球局详情进入')}${kpi('平均每次标了',(acted.length?(more+less)/acted.length:0).toFixed(1)+' 位','只算非「随缘」的变更')}</div>
  ${ins11(ins)}
  <div class="grid g2 sec"><div class="card"><div class="ch"><b>赛后提醒</b><small>结束 1 小时后 · 22:00–08:00 顺延 · 只发一次</small></div>${rc.length?stepFunnel([['应发',1],['送出',sent.length/rc.length],['打开',openedSent.length/rc.length],['选了至少一项',sent.filter(r=>r.acted).length/rc.length],['点了完成',sent.filter(r=>r.done).length/rc.length]],rc.length):'<p class="cap">这段时间还没有打完的球局</p>'}
    <p class="cap">没送出的 ${pct(X3.share(rc.length-sent.length,rc.length))}：顺延后超过 24 小时 ${pct(X3.share(rc.filter(r=>r.why==='late').length,rc.length))} · 同场只剩被屏蔽的人 ${pct(X3.share(rc.filter(r=>r.why==='blocked').length,rc.length))} · 关闭了通知 ${pct(X3.share(rc.filter(r=>r.why==='off').length,rc.length))}</p></div>
    <div class="card"><div class="ch"><b>以后想多遇到吗</b><small>每位同场球友各算一次</small></div>${stack100([{n:'多遇到',v:more},{n:'随缘',v:ok},{n:'少遇到',v:less}])}
    <div class="ch" style="margin-top:18px"><b>在哪里设置的</b></div>${barsH([{n:'赛后卡片',v:viaR},{n:'球员卡',v:viaC}],{lw:96})}
    <p class="cap">改过主意：少遇到 → 随缘 / 多遇到 ${fmt(lessBack)} 次 · 多遇到 → 少遇到 ${fmt(moreLess)} 次</p></div></div>
  <div class="grid g2 sec"><div class="card"><div class="ch"><b>这局对你来说</b></div>${stack100([{n:'偏难',v:fc('hard')},{n:'刚好',v:fc('ok')},{n:'偏轻松',v:fc('easy')}])}
    <div class="ch" style="margin-top:18px"><b>「偏难」的比例 · 按和同场最高 UTR 的差</b></div>${barsH([{n:'差 0.5 以内',v:hardBy(0,.5)},{n:'0.5–1',v:hardBy(.5,1)},{n:'1–2',v:hardBy(1,2)},{n:'2 以上',v:hardBy(2,99)}],{lw:96,fv:pct})}</div>
    <div class="card"><div class="ch"><b>留下的好印象</b><small>${fmt(im.length)} 人次 · 「都点个赞」占 ${pct(X3.share(im.filter(x=>x.all).length,im.length))}</small></div>${barsH(IMP_A.map((t,i)=>({n:t[1]+' '+t[0],v:kc[i]})),{lw:110})}</div></div>
  ${sec('少遇到 · 仅管理员可见')}
  <div class="card sec"><div class="ch"><b>被标「少遇到」较多的球友</b><small>前台任何地方都不显示，也不通知本人 · 至少 3 人标记才列出</small><div class="r"><button class="btn sm" data-pg="safety">风险用户 ›</button></div></div>${lessTable()}</div>
  <div class="grid g4 sec">${kpi('少遇到拦下的直接加入',fmt(ef('join')),'改为普通申请')}${kpi('拦下的邀约',fmt(ef('invite')),'对方看到「暂时不接受邀约」')}${kpi('静音的私信',fmt(ef('dm')),'同局 24 小时前到结束 2 小时内除外')}${kpi('排序后移的球局',fmt(ef('rank')),'次曝光')}</div>
  <div class="grid g2 sec"><div class="card"><div class="ch"><b>被标「多遇到」最多</b><small>可以优先推荐给新球友</small></div>${moreTable()}</div>
    <div class="card"><div class="ch"><b>TA 发了新球局</b><small>follow_notify · 同一人每周最多 1 次</small></div>${foS.length?stepFunnel([['送出',1],['打开',foS.filter(x=>x.opened).length/foS.length],['申请 / 加入',foS.filter(x=>x.applied).length/foS.length]],foS.length):'<p class="cap">这段时间还没有</p>'}<p class="cap">被每周上限拦下 ${fmt(fo.filter(x=>x.status==='capped').length)} 次 · 球局不适合（水平 / 女生局）没发 ${fmt(fo.filter(x=>x.status==='unfit').length)} 次</p></div></div>
  ${sec('爽约')}
  <div class="grid g4">${kpi('爽约反馈',fmt(nsRep),'结束后 48 小时内')}${kpi('确认爽约',fmt(conf.length),'发起人，或两人局里另一位，或 2 人以上反馈')}${kpi('申诉',fmt(ap.length),'申诉期间不计入')}${kpi('申诉成立',fmt(apOK),'恢复场次与赴约率')}</div>
  <div class="card sec"><div class="ch"><b>谁反馈的</b><small>每位被反馈的人算一次</small></div>${stack100([{n:'发起人',v:ns.filter(n=>n.rule==='host').length},{n:'两人局的另一位',v:ns.filter(n=>n.rule==='pair').length},{n:'2 人以上',v:ns.filter(n=>n.rule==='2+').length},{n:'只有 1 人（未确认）',v:ns.filter(n=>n.rule==='single').length}])}<p class="cap">近 90 天确认爽约 ≥2 次：${ge2} 人（等级最高 Lv3）· ≥4 次：${ge4} 人（最高 Lv2）</p></div>`};

/* 少遇到 / 多遇到 名单：全部时间（不受上方时间范围影响），至少 3 人标记才列出 */
const X3P=(()=>{let c=null;return()=>{if(c)return c;const D=DB,less={},more={},mates={};
  D.player_prefs.forEach(p=>{const o=p.pref==='less'?less:more;(o[p.target_id]=o[p.target_id]||new Set()).add(p.user_id)});
  D.games.forEach(g=>{if(g.status!=='completed')return;const ps=(D.byGame.get(g.id)||[]).filter(p=>p.status==='approved').map(p=>p.user_id);ps.forEach(a=>{const s=mates[a]=mates[a]||new Set();ps.forEach(b=>{if(a!==b)s.add(b)})})});
  const nsC={},rep={};D.noshow_confirmed.filter(n=>n.confirmed).forEach(n=>nsC[n.target_id]=(nsC[n.target_id]||0)+1);D.reports.filter(r=>r.target_type==='user').forEach(r=>rep[r.target_id]=(rep[r.target_id]||0)+1);
  return c={less,more,mates,nsC,rep}}})();
lessTable=function(){const P=X3P(),U=DB.users,rows=Object.entries(P.less).map(([id,s])=>({u:U[id],k:s.size,mates:(P.mates[id]||new Set()).size})).filter(x=>x.k>=3&&x.mates>0).map(x=>{const n=P.nsC[x.u.id]||0,played=x.mates,sig=[];
    if(n)sig.push('确认爽约 '+n);if(P.rep[x.u.id])sig.push('被举报 '+P.rep[x.u.id]);return {...x,r:x.k/x.mates,sig}}).sort((a,b)=>b.r-a.r);
  if(!rows.length)return '<p class="cap">目前没有被 3 人以上标「少遇到」的球友</p>';
  const p=pager('less11',rows.length,8);
  return `<table><thead><tr><th>球友</th><th class="r">标了少遇到</th><th class="r">一起打过的人</th><th class="r">占比</th><th>同时出现</th><th>处理</th></tr></thead><tbody>${rows.slice(p.from,p.to).map(x=>`<tr><td><b style="font-weight:600">${esc(x.u.name)}</b> <small style="color:var(--mut)">#${x.u.no} · ${esc(x.u.suburb)} · UTR ${x.u.utr.toFixed(1)}</small></td><td class="r num">${x.k}</td><td class="r num">${x.mates}</td><td class="r num">${pct(x.r)}</td><td>${x.sig.map(s=>`<span class="pill w">${s}</span>`).join(' ')||'<span style="color:var(--mut)">—</span>'}</td><td>${x.r>.25&&x.sig.length?'<span class="pill c">建议复核</span>':'<span class="pill nodot">观察</span>'}</td></tr>`).join('')}</tbody></table>${p.html}
  <p class="cap">只作为线索，不单独作为处罚依据；与爽约、举报、屏蔽同时出现时才进入风险用户。</p>`};
moreTable=function(){const P=X3P(),U=DB.users,rows=Object.entries(P.more).map(([id,s])=>({u:U[id],k:s.size,mates:(P.mates[id]||new Set()).size})).filter(x=>x.k>=3).sort((a,b)=>b.k-a.k).slice(0,6);
  return rows.length?tbl11(['球友','标了多遇到','一起打过的人'],rows.map(x=>[`${esc(x.u.name)} <small style="color:var(--mut)">#${x.u.no}</small>`,x.k,x.mates])):'<p class="cap">目前还没有</p>'};

