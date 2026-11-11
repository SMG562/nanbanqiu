/* =====================================================================
 * 第三批 · 3c-2：球员卡 · 成长与徽章 · 邀约与多人申请监控 —— 从数据层算
 * ===================================================================== */
const NAME_OF=(L,k)=>(L.find(x=>x[0]===k)||[k,k])[1];
/* ---------- 球员卡 ---------- */
cardFindings=function(){const M=MM(),D=DB,{a,b,cut}=M.range,t0=D.dms(a),t1=Math.min(D.dms(b+1),cut),inR=t=>t>=t0&&t<t1,out=[];
  // 扫卡背二维码 / 点球员卡链接 → 注册；球局分享链接 → 注册（打开分享的新访客里，之后注册的比例）
  const conv=tg=>{let n=0,r=0;D.shares.filter(s=>s.target===tg&&s.day>=a&&s.day<=b).forEach(s=>{n+=s.opens});r=D.users.filter(u=>u.src==='share'&&u.ref!=null&&D.shares[u.ref].target===tg&&inR(u.created_at)).length;return n?r/n:0};
  const cardReg=conv('card'),gameReg=conv('game'),cs=D.shares.filter(s=>s.target==='card'&&s.day>=a&&s.day<=b).length,all=D.shares.filter(s=>s.day>=a&&s.day<=b).length;
  if(cs>=20&&cardReg>=gameReg*1.5)out.push([`打开球员卡分享的人，<b>${pct(cardReg)}</b> 注册了；球局分享链接 <b>${pct(gameReg)}</b>。但球员卡只占全部分享的 ${pct(cs/(all||1))}`,'打完球、给印象之后，提醒双方「把球员卡发给球友」']);
  // 看完球员卡（站内）当天点「约 TA 打球」
  const vw=D.card_views.filter(v=>inR(v.t)&&v.viewer!=null&&v.via!=='link'),key=new Set(D.invites.filter(i=>i.fromCard&&inR(i.created_at)).map(i=>i.from_user+'>'+i.to_user+'@'+D.dayOf(i.created_at)));
  const ivIn=vw.length?vw.filter(v=>key.has(v.viewer+'>'+v.owner+'@'+v.day)).length/vw.length:0,lk=D.card_views.filter(v=>inR(v.t)&&v.via==='link'),ivOut=lk.length?lk.filter(v=>v.viewer!=null&&key.has(v.viewer+'>'+v.owner+'@'+v.day)).length/lk.length:0;
  if(vw.length>=50&&lk.length>=20&&ivOut>0&&ivIn>=ivOut*3)out.push([`看完球员卡点「约 TA 打球」：站内 <b>${pct(ivIn)}</b>，站外链接打开只有 <b>${pct(ivOut)}</b>`,'站外打开的球员卡页，先让人看到「约 TA 打球」，点了再登录']);
  // 字母头像的人，申请被接受率
  const ap=(M._apps||[]).filter(p=>p.status!=='pending'&&p.status!=='withdrawn'),acc=f=>{const x=ap.filter(p=>f(D.users[p.user_id]));return x.length>=30?x.filter(B3.appr).length/x.length:null};
  const la=acc(u=>u.avatar==='letter'),aa=acc(u=>u.avatar==='animal'),letter=D.users.filter(u=>u.avatar==='letter').length/D.users.length;
  if(la!=null&&aa!=null&&aa-la>=.05)out.push([`还有 <b>${pct(letter)}</b> 的球友用字母头像，他们的申请被接受率低 <b>${Math.round((aa-la)*100)}</b> 个百分点`,'注册时把「选一只动物」提前到第一步，跳过的人发第一条申请前再提示一次']);
  return out};
pageCards6=function(){const M=MM(),D=DB,{a,b,cut,dk}=M.range,t0=D.dms(a),t1=Math.min(D.dms(b+1),cut),inR=t=>t>=t0&&t<t1,ok=B3.ok,f=cardFindings();
  const US=D.users.filter(u=>ok(dk,u.dev)),an=US.filter(u=>u.avatar==='animal');
  const V=D.card_views.filter(v=>inR(v.t)&&ok(dk,v.dev)),SHc=D.shares.filter(s=>s.target==='card'&&s.day>=a&&s.day<=b&&ok(dk,s.device)),opens=SHc.reduce((s,x)=>s+x.opens,0),regs=D.users.filter(u=>u.src==='share'&&u.ref!=null&&D.shares[u.ref].target==='card'&&inR(u.created_at)&&ok(dk,u.dev)).length;
  const cnt=(arr,k,L,lab)=>{const m={};arr.forEach(x=>m[x[k]]=(m[x[k]]||0)+1);return L.map(x=>({n:x[1],sw:x[2],v:m[x[0]]||0})).sort((p,q)=>q.v-p.v)};
  const A=cnt(an,'animal',ANIMALS),Sx=cnt(an,'seal',SEALS),C=cnt(US,'color',COLORS),Th=cnt(US,'theme',THEMES);
  const rb=[['没换过',0,0],['1–2 次',1,2],['3–5 次',3,5],['6–10 次',6,10],['10 次以上',11,999]].map(r=>({n:r[0],v:an.filter(u=>u.cust.length>=r[1]&&u.cust.length<=r[2]).length}));
  const combo={};an.forEach(u=>{const k=u.animal+'|'+u.seal+'|'+u.color+'|'+u.theme;combo[k]=(combo[k]||0)+1});const top=Object.entries(combo).sort((p,q)=>q[1]-p[1])[0],tk=top?top[0].split('|'):null;
  const own={};V.forEach(v=>{const o=own[v.owner]=own[v.owner]||{n:0,link:0,via:{}};o.n++;if(v.via==='link')o.link++;o.via[v.via]=(o.via[v.via]||0)+1});
  const VIA={detail:'球局详情',chat:'聊天',list:'发现页列表',notif:'通知',mine:'我的球局',card:'别人的球员卡',link:'站外链接'};
  const rows=Object.entries(own).sort((p,q)=>q[1].n-p[1].n).slice(0,10).map(([id,o])=>({u:UBY.get(+id),o,via:VIA[Object.entries(o.via).sort((p,q)=>q[1]-p[1])[0][0]]}));
  const CH={moments:'朋友圈 · moments',xhs:'小红书 · xhs',link:'复制链接 · link'},vc=k=>V.filter(v=>v.via===k).length;
  return `<div class="grid g4">${kpi('球员卡被查看',fmt(V.length),rangeTxt()+' · 不含看自己')}${kpi('球员卡被分享',fmt(SHc.length),'朋友圈 / 小红书 / 复制链接')}${kpi('站外打开球员卡',fmt(opens),'带来新注册 '+fmt(regs))}${kpi('头像选了动物',pct(an.length/(US.length||1)),'其余用字母')}</div>
  ${tk?`<div class="insight sec"><span>✨</span><div>现在最多人用的组合：<b>${NAME_OF(ANIMALS,tk[0])} · ${NAME_OF(SEALS,tk[1])} · ${NAME_OF(COLORS,tk[2])}底 · ${NAME_OF(THEMES,tk[3])}</b>（${top[1]} 人）</div></div>`:''}
  ${f.length?`<div class="card sec"><div class="ch"><b>值得改进的地方</b><small>${rangeTxt()} · 数据满足条件时才会出现</small></div><div class="fd">${f.map(x=>`<div><p>${x[0]}</p><span>→ ${x[1]}</span></div>`).join('')}</div></div>`:''}
  <div class="grid g21 sec"><div class="card"><div class="ch"><b>被看最多的球员卡</b><small>${rangeTxt()} · 不含自己看自己</small></div>${rows.length?`<table><thead><tr><th>#</th><th>球友</th><th class="r">被查看</th><th class="r">站外打开</th><th>主要从哪看到</th><th class="r">场次</th></tr></thead><tbody>
    ${rows.map((x,i)=>`<tr><td class="num" style="color:var(--mut)">${i+1}</td><td><div class="who">${av(x.u)}<div><b>${esc(x.u.name)}</b><small>${esc(x.u.sub)} · UTR ${(+x.u.utr).toFixed(1)}</small></div></div></td><td class="r num"><b>${fmt(x.o.n)}</b></td><td class="r num">${pct(x.o.link/x.o.n)}</td><td>${x.via}</td><td class="r num">${x.u.played}</td></tr>`).join('')}</tbody></table>`:'<p class="cap">这段时间还没有</p>'}</div>
    <div class="card"><div class="ch"><b>球员卡怎么被分享的</b></div>${barsH(Object.keys(CH).map(k=>({n:CH[k],v:SHc.filter(s=>s.channel===k).length})),{lw:110})}<div class="ch" style="margin-top:18px"><b>查看来源</b><small>card_view.via</small></div>${barsH(Object.keys(VIA).map(k=>({n:VIA[k]+' · '+k,v:vc(k)})).sort((p,q)=>q.v-p.v),{lw:130})}</div></div>
  <div class="grid g2 sec"><div class="card"><div class="ch"><b>动物</b><small>当前在用（快照）· Top 12</small></div>${barsH(A.slice(0,12),{lw:56})}</div>
    <div class="card"><div class="ch"><b>印样</b><small>选了动物的人当前停在哪一枚</small></div>${barsH(Sx,{lw:56})}<div class="ch" style="margin-top:20px"><b>「换一枚印」次数</b></div>${barsH(rb,{lw:74})}</div></div>
  <div class="grid g2 sec"><div class="card"><div class="ch"><b>头像底色</b><small>12 种 · 字母和动物头像都可以选</small></div>${barsH(C,{lw:74})}</div><div class="card"><div class="ch"><b>卡面</b></div>${barsH(Th,{lw:74})}</div></div>`};

/* ---------- 成长与徽章 ---------- */
const G3=(()=>{const D=DB,DAY=D.DAY,N=D.users.length,surf=v=>{if(!v)return null;const s=(vA(v).surf[0])||['hard','hard','hard','synclay','clay','grass'][Math.floor(b1h(v[0]+'s')*6)];return s==='synthetic'?null:s};
  const VS=new Map(VENUES.map(v=>[v[0],v]));
  // 每个人按时间排好的计入场次
  const games=[...Array(N)].map(()=>[]),hostedOk=[...Array(N)].map(()=>[]);
  D.games.filter(g=>g.status==='completed').sort((p,q)=>p.starts_at-q.starts_at).forEach(g=>{const ps=(D.byGame.get(g.id)||[]).filter(p=>p.status==='approved').map(p=>p.user_id);if(ps.length<2)return;ps.forEach(a=>games[a].push({g,ps}));hostedOk[g.host_id].push(g)});
  const givers=[...Array(N)].map(()=>[]);D.impressions.slice().sort((p,q)=>p.created_at-q.created_at).forEach(x=>givers[x.to_id].push(x));
  const nth=(arr,n,f=x=>x)=>arr.length>=n?f(arr[n-1]):null;
  // 徽章：获得时间（拿不到为 null）
  const BD=[['first','首场','完成第 1 场',G=>nth(G.g,1,x=>x.g.starts_at)],['ten','十场','完成 10 场',G=>nth(G.g,10,x=>x.g.starts_at)],
    ['early','早起鸟','08:00 及以前开场 5 场',G=>nth(G.g.filter(x=>{const t=new Date(x.g.starts_at);return t.getHours()<8||(t.getHours()===8&&t.getMinutes()===0)}),5,x=>x.g.starts_at)],
    ['night','夜场常客','19:00 及以后开场 5 场',G=>nth(G.g.filter(x=>new Date(x.g.starts_at).getHours()>=19),5,x=>x.g.starts_at)],
    ['streak','四周连打','连续 4 周打球',G=>{let run=0,last=null;for(const x of G.g){const w=Math.floor(D.dayOf(x.g.starts_at)/7);if(w===last)continue;run=last!=null&&w===last+1?run+1:1;last=w;if(run>=4)return x.g.starts_at}return null}],
    ['surf','全场地','在 3 种场地打过（按球场的主场地类型：硬地 / 红土 / 人工红土 / 草地各算一种，人造草不算）',G=>{const s=new Set();for(const x of G.g){const t=surf(VS.get(x.g.venue_id));if(t)s.add(t);if(s.size>=3)return x.g.starts_at}return null}],
    ['explorer','Club 探险家','在 5 个不同的球场打过（含公共球场；前台写「去过 5 个 Club」）',G=>{const s=new Set();for(const x of G.g){if(x.g.venue_id)s.add(x.g.venue_id);if(s.size>=5)return x.g.starts_at}return null}],
    ['host','组局达人','组织 10 场（至少有 1 位球友来打完）',G=>nth(G.h,10,g=>g.starts_at)],['fifty','半百','完成 50 场',G=>nth(G.g,50,x=>x.g.starts_at)],
    ['kind','好球友','30 位球友给过你好评（按不同球友计）',G=>{const s=new Set();for(const x of G.k){s.add(x.from_id);if(s.size>=30)return x.created_at}return null}],
    ['partner','黄金搭档','同一搭档打 10 场',G=>{const c={};for(const x of G.g)for(const p of x.ps){if(p===G.id)continue;c[p]=(c[p]||0)+1;if(c[p]>=10)return x.g.starts_at}return null}],
    ['hundred','百场','完成 100 场',G=>nth(G.g,100,x=>x.g.starts_at)]];
  const earned=[...Array(N)].map((_,id)=>{const G={id,g:games[id],h:hostedOk[id],k:givers[id]};return BD.map(b=>b[3](G))});
  const milestone=(id,n)=>nth(games[id],n,x=>x.g.starts_at);
  return {BD,earned,games,milestone}})();
pageGrow=function(){const M=MM(),D=DB,{a,b,cut,dk}=M.range,all=M.all,t0=D.dms(a),t1=Math.min(D.dms(b+1),cut),inR=t=>t>=t0&&t<t1,US=USERS.filter(u=>B3.ok(dk,u.dev)),N=US.length;
  const B=[['0 场',0,0],['1–9 场',1,9],['10–19 场',10,19],['20–49 场',20,49],['50–99 场',50,99],['100–199 场',100,199],['200 场以上',200,1e9]];
  const P1=US.filter(u=>u.played>=1).length,reach=[10,20,50,100,200].map(k=>{const us=US.filter(u=>u.played>=k),newIn=us.filter(u=>{const t=G3.milestone(u.dbid,k);return t!=null&&inR(t)}).length,days=us.map(u=>(G3.milestone(u.dbid,k)-G3.milestone(u.dbid,1))/D.DAY);return [k,us.length,newIn,days.length>=5?Math.round(days.reduce((s,x)=>s+x,0)/days.length):null]});
  const lvN=[1,2,3,4,5].map(l=>US.filter(u=>u.lv===l).length),LVN=['🌱 Lv1 初见','🌿 Lv2 相伴','🪴 Lv3 常伴','🌲 Lv4 挚友','🌳 Lv5 南伴之光'];
  // 场次够了、还没升上去：卡在哪一项（可多项）
  const stuck=[1,2,3].map(i=>{const [g,att,r,fr]=B1_LV[i],us=US.filter(u=>u.played>=g&&u.lv<=i+1),n=us.length,sh=f=>n?us.filter(f).length/n:0;
    return {n,rate:sh(u=>u.kRate<r),from:sh(u=>u.kFrom<fr),att:sh(u=>u.att<att),ns:sh(u=>U3.ns90[u.dbid]>=(i===1?4:2)),rep:i===3?sh(u=>U3.rep6m[u.dbid]>0):null}});
  const ge20=US.filter(u=>u.played>=20),bk=(arr,f,cuts)=>cuts.map(([n,lo,hi])=>({n,v:arr.filter(u=>f(u)>=lo&&f(u)<hi).length}));
  const bd=G3.BD.map((x,i)=>{const own=US.filter(u=>G3.earned[u.dbid][i]!=null),newIn=own.filter(u=>inR(G3.earned[u.dbid][i])).length,seen=own.filter(u=>U3.last[u.dbid]>=G3.earned[u.dbid][i]),sh=seen.filter(u=>b1h(u.dbid+x[0]+'s')<.18);
    return {b:x,own:own.length,newIn,seen:seen.length,sh:sh.length,save:sh.filter(u=>b1h(u.dbid+x[0]+'v')<.64).length,shu:sh}});
  const shown=bd.reduce((s,x)=>s+(all?x.seen:x.newIn),0),bS=bd.reduce((s,x)=>s+x.sh,0),bV=bd.reduce((s,x)=>s+x.save,0),ch=u=>b1h(u+'ch')<.69?'moments':'xhs';
  const svM=bd.reduce((s,x)=>s+x.shu.filter(u=>b1h(u.dbid+x.b[0]+'v')<.64&&ch(u.dbid+x.b[0])==='moments').length,0),svX=bV-svM;
  const custN=US.filter(u=>DB.users[u.dbid].cust.some(t=>all||inR(t))).length,av=US.filter(u=>DB.users[u.dbid].avatar==='animal').length;
  // 值得关注
  const ins=[];const s3=stuck[0];if(s3.n>=5){const k=[['好评率',s3.rate],['好评人数',s3.from],['赴约率',s3.att]].sort((p,q)=>q[1]-p[1]);ins.push([`场次已够 Lv3（50 场）但还没到 Lv3 的有 <b>${fmt(s3.n)}</b> 人：<b>${pct(s3.rate)}</b> 卡在好评率（≥ 1/2）、<b>${pct(s3.from)}</b> 卡在好评人数（≥10 位）、<b>${pct(s3.att)}</b> 卡在赴约率（≥90%）`,k[0][1]>=.5?`主要卡在${k[0][0]}，上线前确认一下这个门槛是否合理`:''])}
  const act30=u=>U3.last[u.dbid]>=+NOW-30*D.DAY,old=US.filter(u=>+NOW-u.created_at>=60*D.DAY),g20=old.filter(u=>u.played>=20),g19=old.filter(u=>u.played>=1&&u.played<=9);
  if(g20.length>=10&&g19.length>=10){const r20=g20.filter(act30).length/g20.length,r19=g19.filter(act30).length/g19.length;if(r20-r19>=.15)ins.push([`注册 2 个月以上的人里，打过 20 场以上的近 30 天还在用的有 <b>${pct(r20)}</b>；只打过 1–9 场的 <b>${pct(r19)}</b>`,'前 10 场是关键，可以在第 3 场后多推荐「多遇到」过的人的球局'])}
  return `<div class="grid g4">${kpi('打过至少 1 场',fmt(P1),pct(P1/(N||1))+' 的注册球友')}${kpi('达到 10 场',fmt(reach[0][1]),(all?'上线以来累计 '+fmt(reach[0][1])+' 人':'本期新达到 '+fmt(reach[0][2])))}${kpi('达到 50 场',fmt(reach[2][1]),(all?'上线以来累计 '+fmt(reach[2][1])+' 人':'本期新达到 '+fmt(reach[2][2])))}${kpi('Lv2 及以上',fmt(N-lvN[0]),'现在的等级')}</div>
  ${ins11(ins)}
  <div class="grid g2 sec"><div class="card"><div class="ch"><b>场次分布</b><small>注册球友 · 计入场次的口径</small></div>${barsH(B.map(x=>({n:x[0],v:US.filter(u=>u.played>=x[1]&&u.played<=x[2]).length})),{lw:96})}</div>
    <div class="card"><div class="ch"><b>场次里程碑</b></div>${tbl11(['达到','人数',all?'累计达到':'本期新达到','从第 1 场起平均用时'],reach.map(r=>[r[0]+' 场',fmt(r[1]),fmt(all?r[1]:r[2]),r[3]!=null?r[3]+' 天':'—']))}<p class="cap">人数少于 5 时不显示用时</p></div></div>
  ${sec('等级')}
  <div class="grid g2 sec"><div class="card"><div class="ch"><b>等级分布</b><small>与前台 v3 门槛一致</small></div>${barsH(LVN.map((n,i)=>({n,v:lvN[i]})),{lw:130})}</div>
    <div class="card"><div class="ch"><b>场次够了、还没升上去</b><small>卡在哪一项（可多项）</small></div>${tbl11(['','Lv3 常伴','Lv4 挚友','Lv5 南伴之光'],[['场次已够',...stuck.map(x=>fmt(x.n))],['好评率不够',...stuck.map(x=>x.n?pct(x.rate):'—')],['好评人数不够',...stuck.map(x=>x.n?pct(x.from):'—')],['赴约率不够',...stuck.map(x=>x.n?pct(x.att):'—')],['近 90 天爽约限制',...stuck.map(x=>x.n?pct(x.ns):'—')],['半年内有举报','—','—',stuck[2].n?pct(stuck[2].rep):'—']])}
      <p class="cap">Lv2：20 场；Lv3：50 场 · 赴约率 90% · 好评率 ≥ 1/2 · 好评人数 ≥10；Lv4：100 场 · 95% · ≥ 2/3 · ≥25；Lv5：200 场 · 98% · ≥ 2/3 · ≥50 · 半年内零举报。好评率 =（给过好评的人 + 1）÷（max(一起打过的人, 给过好评的人) + 4）；赴约率按等级口径（场次 ÷（场次 + 爽约 + 0.5 × 临时退出））。近 90 天确认爽约 ≥2 次最高 Lv3，≥4 次最高 Lv2。</p></div></div>
  <div class="grid g2 sec"><div class="card"><div class="ch"><b>好评率分布</b><small>打过 ≥20 场的球友 · 等级口径</small></div>${barsH(bk(ge20,u=>u.kRate,[['2/3 以上',2/3,9],['1/2–2/3',.5,2/3],['30%–1/2',.3,.5],['30% 以下',-1,.3]]),{lw:96})}</div>
    <div class="card"><div class="ch"><b>赴约率分布</b><small>打过 ≥20 场的球友 · 等级口径</small></div>${barsH(bk(ge20,u=>u.att,[['98% 以上',.98,9],['95–98%',.95,.98],['90–95%',.9,.95],['90% 以下',-1,.9]]),{lw:96})}</div></div>
  ${sec('徽章')}
  <div class="card sec"><div class="ch"><b>徽章</b><small>获得后永久保留 · 稀有度 = 拥有的人 ÷ 打过至少 1 场的人</small></div>${tbl11(['徽章','获得人数','稀有度',all?'累计获得':'本期新获得','看到庆祝页','分享'],bd.map(x=>[`<b style="font-weight:600">${x.b[1]}</b> <small style="color:var(--mut)">${x.b[2]}</small>`,fmt(x.own),pct(x.own/(P1||1)),fmt(all?x.own:x.newIn),x.own?pct(x.seen/x.own):'—',x.seen?pct(x.sh/x.seen):'—']))}<p class="cap">稀有度 ≤50% 时才在前台显示「只有 x% 的球友有」；分母与前台、schema（v_badge_rarity）一致</p></div>
  <div class="grid g2 sec"><div class="card"><div class="ch"><b>徽章分享</b><small>获得时的庆祝页 → 分享面板 · 累计</small></div>${bd.reduce((s,x)=>s+x.seen,0)?stepFunnel([['看到庆祝页',1],['点了分享',bS/bd.reduce((s,x)=>s+x.seen,0)],['保存图片 / 复制文案',bV/bd.reduce((s,x)=>s+x.seen,0)]],bd.reduce((s,x)=>s+x.seen,0)):'<p class="cap">还没有</p>'}</div>
    <div class="card"><div class="ch"><b>分享渠道</b><small>保存图片或复制文案时所在的标签 · 累计</small></div>${tbl11(['','保存 / 复制'],[['朋友圈',fmt(svM)],['小红书',fmt(svX)]])}</div></div>
  ${sec('头像与卡面')}
  <div class="grid g2 sec"><div class="card"><div class="ch"><b>卡面主题</b></div>${barsH(THEMES.map(t=>({n:t[1],sw:t[2],v:US.filter(u=>DB.users[u.dbid].theme===t[0]).length})),{lw:80})}</div>
    <div class="card"><div class="ch"><b>头像类型</b><small>类型和底色是两个维度，分开选</small></div>${stack100([{n:'动物',v:av},{n:'字母',v:N-av}])}<div class="ch" style="margin-top:16px"><b>头像底色 Top 5</b><small>12 种，字母和动物都能选</small></div>${barsH(COLORS.map(c=>({n:c[1],sw:c[2],v:US.filter(u=>DB.users[u.dbid].color===c[0]).length})).sort((p,q)=>q.v-p.v).slice(0,5),{lw:74})}<p class="cap">${all?'上线以来':'本期'}改过球员卡（card_customize）${fmt(custN)} 人</p></div></div>`};

/* ---------- 球局全流程：多人申请 · 邀约（第二批并入的监控） ---------- */
{const _pl=pageLife;pageLife=function(){const h=_pl(),C=X3.ctx(),D=DB,med=a=>{if(!a.length)return null;const s=a.slice().sort((p,q)=>p-q);return s[Math.floor(s.length/2)]},mins=x=>x==null?'—':x<60?Math.round(x)+' 分钟':(x/60).toFixed(1)+' 小时';
  const G=C.created,np=g=>(D.byGame.get(g.id)||[]).filter(p=>p.role==='player').length,multi=G.filter(g=>np(g)>=4),norm=G.filter(g=>np(g)>=1&&np(g)<4);
  const fr=a=>{const s=a.filter(g=>g.starts_at<+NOW&&g.status!=='cancelled');return s.length?s.filter(g=>g.filled_at_start).length/s.length:null};
  const ps=a=>a.flatMap(g=>(D.byGame.get(g.id)||[]).filter(p=>p.role==='player'));const host=a=>ps(a).filter(p=>p.decided_at!=null&&p.decided_at>p.created_at&&(B3.appr(p)||(p.status==='rejected'&&['known','level','pass'].includes(p.decline_reason))));   // 发起人亲自处理的（不含直接加入、自动结束）
  const rt=a=>med(host(a).map(p=>(p.decided_at-p.created_at)/6e4)),exr=a=>{const x=ps(a);return x.length?x.filter(p=>p.status==='expired').length/x.length:null},fa=ps(multi).filter(p=>p.decline_reason==='full_auto').length;
  const I=D.invites.filter(i=>C.inR(i.created_at)&&B3.ok(C.dk,i.device)),ic=k=>I.filter(i=>i.status===k).length,done=I.filter(i=>['accepted','declined','expired'].includes(i.status)),acc=ic('accepted');
  const played=I.filter(i=>i.status==='accepted'&&D.games[i.game_id].status==='completed').length,accPast=I.filter(i=>i.status==='accepted'&&D.games[i.game_id].starts_at+90*6e4<+NOW).length;
  const rep=med(I.filter(i=>i.decided_at&&i.status!=='expired').map(i=>(i.decided_at-i.created_at)/6e4)),pt=I.filter(i=>i.played),np2=I.filter(i=>!i.played),ar=a=>{const d=a.filter(i=>['accepted','declined','expired'].includes(i.status));return d.length?d.filter(i=>i.status==='accepted').length/d.length:null};
  return h+`${sec('多人申请（4 人以上申请的局）')}
  <div class="grid g4">${kpi('4 人以上申请的局',fmt(multi.length),G.length?pct(multi.length/G.length)+' 的新球局':'—')}${kpi('这些局开打时人齐',b1pf(fr(multi)),'其他有人申请的局 '+b1pf(fr(norm)))}${kpi('发起人处理用时（中位数）',mins(rt(multi)),'其他局 '+mins(rt(norm)))}${kpi('人齐后自动结束的申请',fmt(fa),'对方看到「这局已经满员」')}</div>
  <div class="card sec"><div class="ch"><b>申请多了以后</b><small>${rangeTxt()} · 按发起时间</small></div>${tbl11(['','4 人以上申请','1–3 人申请'],[['球局',fmt(multi.length),fmt(norm.length)],['平均申请人数',(multi.length?ps(multi).length/multi.length:0).toFixed(1),(norm.length?ps(norm).length/norm.length:0).toFixed(1)],['申请超时失效',exr(multi)==null?'—':pct(exr(multi)),exr(norm)==null?'—':pct(exr(norm))],['发起人处理用时（中位数）',mins(rt(multi)),mins(rt(norm))],['开打时人齐',b1pf(fr(multi)),b1pf(fr(norm))]])}<p class="cap">4 人以上申请时，发起人看到紧凑列表和排序（推荐 / 最早申请 / 水平接近）；人比空位多时提示「人齐后，其余申请会自动结束」。</p></div>
  ${sec('邀约（约 TA 打球）')}
  <div class="grid g4">${kpi('发出的邀约',fmt(I.length),'约一起打过的人 '+pct(I.length?pt.length/I.length:0))}${kpi('接受率',b1pf(ar(I)),'已有结果的邀约里')}${kpi('回复用时（中位数）',mins(rep),'48 小时或开打前没回复就失效')}${kpi('邀约成局后打完',accPast?pct(played/accPast):'—',fmt(played)+' 局')}</div>
  <div class="grid g2 sec"><div class="card"><div class="ch"><b>邀约的结果</b><small>${fmt(I.length)} 个</small></div>${stack100([{n:'接受',v:acc},{n:'婉拒',v:ic('declined')},{n:'没回复失效',v:ic('expired')},{n:'发起人撤回',v:ic('withdrawn')},{n:'等对方确认新时间',v:ic('counter')},{n:'还在等回复',v:ic('pending')}].filter(x=>x.v))}
      <div class="ch" style="margin-top:18px"><b>婉拒理由</b></div>${barsH([['week','这周排满了'],['rest','最近在休息'],['pass','这次先不了']].map(([k,n])=>({n,v:I.filter(i=>i.reason===k).length})),{lw:96})}</div>
    <div class="card"><div class="ch"><b>约谁更容易成</b></div>${tbl11(['','邀约','接受率'],[['一起打过的人',fmt(pt.length),b1pf(ar(pt))],['没一起打过的人',fmt(np2.length),b1pf(ar(np2))],['从球员卡点「约 TA 打球」',fmt(I.filter(i=>i.fromCard).length),b1pf(ar(I.filter(i=>i.fromCard)))],['换过一次时间',fmt(I.filter(i=>i.countered).length),b1pf(ar(I.filter(i=>i.countered)))]])}
      <p class="cap">每天最多 3 个，其中最多 2 位没一起打过的；30 天内被同一人婉拒 2 次后不能再约；只能改一次时间。</p></div></div>`}}

/* ---------- 分享带来的注册（全站只用这一个函数）：分享 → 被打开 → 注册（打开分享链接的新访客当天注册，归到那次分享）→ 注册后 7 天内的申请 ---------- */
b1share=function(){const M=MM();if(M._sh)return M._sh;const D=DB,{a,b,cut,dk}=M.range,t0=D.dms(a),t1=Math.min(D.dms(b+1),cut),inR=t=>t>=t0&&t<t1,ok=B3.ok;
  const SH=D.shares.filter(s=>s.day>=a&&s.day<=b&&s.t<cut&&ok(dk,s.device)),RG=D.users.filter(u=>u.src==='share'&&u.ref!=null&&inR(u.created_at)&&ok(dk,u.dev));
  const appsBy=new Map();D.game_participants.forEach(p=>{if(p.role!=='player')return;const u=D.users[p.user_id];if(u.src==='share'&&p.created_at-u.created_at<=7*D.DAY)appsBy.set(u.id,(appsBy.get(u.id)||0)+1)});
  const OP=D.share_opens.filter(o=>o.t<cut&&o.t>=t0&&o.t<t1&&ok(dk,o.dev));                       // 被打开 = 这段时间里点开分享链接的次数（按打开时间、打开时的设备）
  const mk=(tg,rows,ap)=>{const r=rows.map(([n,k])=>{const s=SH.filter(x=>x.target===tg&&x.channel===k),op=OP.filter(o=>{const z=D.shares[o.share];return z.target===tg&&z.channel===k}).length,rg=RG.filter(u=>{const z=D.shares[u.ref];return z.target===tg&&z.channel===k});
      return {n,k,shares:s.length,opens:op,regs:rg.length,apps:ap?rg.reduce((q,u)=>q+(appsBy.get(u.id)||0),0):null}});
    return {rows:r,shares:r.reduce((s,x)=>s+x.shares,0),opens:r.reduce((s,x)=>s+x.opens,0),regs:r.reduce((s,x)=>s+x.regs,0)}};
  const game=mk('game',[['复制链接 · link','link'],['小红书海报 / 文案 · xhs','xhs'],['复制文案 · text（PWA「发到微信群」）','text'],['系统分享 · sys（仅 PWA）','sys'],['网页扫码 · webqr（仅 Web）','webqr']],true);
  const card=mk('card',[['朋友圈 · moments','moments'],['小红书 · xhs','xhs'],['复制链接 · link','link']],false);
  return M._sh={game,card,shares:game.shares+card.shares,opens:game.opens+card.opens,regs:game.regs+card.regs}};
// 分享与拉新：新球友从哪来 = 新注册的人首次打开时的来源（与 USERS.src 同一口径）
{const _pg=pageGrowth;pageGrowth=function(){const M=MM(),D=DB,{a,b,cut,dk}=M.range,t0=D.dms(a),t1=Math.min(D.dms(b+1),cut),h=_pg();
  const nu=USERS.filter(u=>u.created_at>=t0&&u.created_at<t1&&B3.ok(dk,u.dev)),src=SRC.map(s=>({n:s[1],v:nu.filter(u=>u.src[0]===s[0]).length})).sort((p,q)=>q.v-p.v);
  const i=h.indexOf('<div class="ch"><b>新球友从哪来</b>'),j=h.indexOf('</div>',h.indexOf('<div class="bars',i)>0?h.indexOf('</div></div>',i):i);
  const k=h.indexOf('<div class="card"><div class="ch"><b>每日新注册</b>');return h.slice(0,i)+`<div class="ch"><b>新球友从哪来</b><small>首次打开时的来源</small></div>${barsH(src,{lw:104})}</div>`+h.slice(k)}}

