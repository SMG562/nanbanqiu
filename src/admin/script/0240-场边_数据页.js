/* ---------- 场边数据 ---------- */
const sbTn=id=>{const t=SB_TOPICS.find(x=>x.id===id);return t?'#'+t.t:id==='court'?'球场问题':id==='lost'?'失物招领':'—'};
function sbSeries(n,base,amp,trend){SEED=Math.round(base*13)+n;return Array.from({length:n},(_,i)=>Math.max(0,base*(1+trend*i/n)+amp*Math.sin(i/1.6)+(rnd()-.5)*amp*1.4))}
function sbTrend(vals,labels){const W=900,H=220,pl=40,pb=24,mx=Math.max(...vals)*1.15,x=i=>pl+i/(vals.length-1)*(W-pl-28),y=v=>H-pb-(v/mx)*(H-pb-10);
  const ticks=[0,.25,.5,.75,1].map(f=>mx*f);const step=Math.ceil(labels.length/7);
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${ticks.map(t=>`<line class="gl" x1="${pl}" x2="${W-8}" y1="${y(t)}" y2="${y(t)}"/><text class="ax" x="${pl-6}" y="${y(t)+3}" text-anchor="end">${fmt(t)}</text>`).join('')}
   <path d="M${x(0)},${y(0)} ${vals.map((v,i)=>`L${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')} L${x(vals.length-1)},${y(0)}Z" fill="var(--gw)"/><polyline points="${vals.map((v,i)=>`${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')}" fill="none" stroke="var(--g)" stroke-width="2" vector-effect="non-scaling-stroke"/>
   ${labels.map((l,i)=>i%step===0||i===labels.length-1?`<text class="ax" x="${x(i)}" y="${H-6}" text-anchor="middle">${l}</text>`:'').join('')}</svg>`}
const sbBars=(rows,lw=150)=>{const mx=Math.max(...rows.map(r=>r[1]),1);return `<div class="bars" style="--lw:${lw}px">${rows.map(r=>`<div class="bar" ${r[3]||''}><span class="n">${r[0]}</span><span class="t"><i style="width:${(r[1]/mx*100).toFixed(1)}%"></i></span><span class="v num">${r[2]??fmt(r[1])}</span></div>`).join('')}</div>`};


/* ---------- 页面：场边数据 ---------- */
function pageSb(){const k=sbK(),days=S.range===1?24:Math.min(S.range,90),lab=S.range===1?Array.from({length:24},(_,i)=>i+':00'):Array.from({length:days},(_,i)=>{const d=new Date(2026,9,26-days+1+i);return (d.getMonth()+1)+'/'+d.getDate()});
  const pf=S.plat==='pwa'?.71:S.plat==='web'?.29:1;
  const kp=[['发布',Math.round(1860*k*pf),.12,'这段时间发出的条数（含 24 小时后已存进相册的）'],['发布的人',Math.round(1140*k*pf),.09,'至少发过一条的人，去重'],['看过场边的人',Math.round(15200*k*pf),.05,'打开过场边这一页的人，去重（含未登录）'],['发布率',.075,.06,'发布的人 ÷ 看过场边的人'],['网球 + 回复',Math.round(16800*k*pf),.14,'点的网球数 + 回复数'],['带照片的',.58,.03,'带照片的发布 ÷ 全部发布']];
  const kpH=kp.map((x,i)=>`<div class="card kpi"><div class="l">${x[0]} <span class="hp" data-tv="口径" data-tl="${esc(x[3])}">?</span></div><div class="v num">${x[1]<1?pct(x[1]):fmt(x[1])}</div><div class="d ${x[2]>=0?'up':'dn'}">${x[2]>=0?'▲':'▼'} ${pct(Math.abs(x[2]))} 较上一周期</div>${spark(sbSeries(14,40+i*7,6,x[2]))}</div>`).join('');
  const tv=sbSeries(lab.length,S.range===1?78:265,S.range===1?40:35,.15).map(v=>v*pf*(SB.tr==='views'?8:SB.tr==='balls'?9:1));
  const ts=[...SB_TS].sort((a,b)=>SB.topicSort==='grow'?b.grow-a.grow:SB.topicSort==='people'?b.people-a.people:SB.topicSort==='balls'?b.balls-a.balls:b.posts-a.posts).slice(0,8);
  const tval=t=>SB.topicSort==='grow'?t.grow:SB.topicSort==='people'?t.people:SB.topicSort==='balls'?t.balls:t.posts;
  const cs=[...SB_COURTS].map(c=>({n:c[0],posts:Math.round(c[1]*k*pf),views:Math.round(c[1]*39*k*pf),act:Math.round(c[1]*8.6*k*pf)})).sort((a,b)=>b[SB.courtSort]-a[SB.courtSort]);
  SEED=11;const hm=Array.from({length:7},(_,d)=>Array.from({length:24},(_,h)=>{const base=(h>=6&&h<=9?.55:0)+(h>=17&&h<=21?1:0)+(h>=11&&h<=13?.3:0)+(d>=5&&h>=8&&h<=17?.7:0);return Math.max(.03,base+(rnd()-.5)*.25)}));const hmx=Math.max(...hm.flat());
  return `
  <div class="kpis6">${kpH}</div>
  <div class="card sec trend"><div class="ch"><b>趋势</b><small>${S.range===1?'今天每小时':'每天'}</small><div class="r chips">${[['posts','发布'],['views','浏览'],['balls','网球'],['replies','回复']].map(c=>`<button class="${(SB.tr||'posts')===c[0]?'on':''}" data-tr="${c[0]}">${c[1]}</button>`).join('')}</div></div>${sbTrend(tv,lab)}</div>
  <div class="grid g2 sec">
   <div class="card"><div class="ch"><b>最热闹的话题</b><small>点一个直接去编辑</small><div class="r chips">${[['posts','发布'],['people','参与人'],['balls','网球'],['grow','增长']].map(c=>`<button class="${SB.topicSort===c[0]?'on':''}" data-ts="${c[0]}">${c[1]}</button>`).join('')}</div></div>
    ${sbBars(ts.map(t=>[`${esc('#'+t.t)}${t.kind==='大家发起'?' <span class="pill nodot">大家发起</span>':''}`,SB.topicSort==='grow'?Math.max(0,t.grow):tval(t)*k,SB.topicSort==='grow'?(t.grow>=0?'▲ ':'▼ ')+pct(Math.abs(t.grow)):fmt(tval(t)*k*pf),`data-edit="${t.id}" style="cursor:pointer"`]),200)}
    <p class="cap">发布：带这个话题发出的条数；参与人：去重；增长：和上一周期比。#网球人的OOTD 今天是推荐日，会偏高。</p></div>
   <div class="card"><div class="ch"><b>发布最多的球场</b><small>只算选了球场的发布</small><div class="r chips">${[['posts','发布'],['views','浏览'],['act','互动']].map(c=>`<button class="${SB.courtSort===c[0]?'on':''}" data-cs="${c[0]}">${c[1]}</button>`).join('')}</div></div>
    ${sbBars(cs.map(c=>[esc(c.n),c[SB.courtSort]]),200)}
    <p class="cap">${pct(.63)} 的发布选了球场。没选的不计入这里。</p></div>
  </div>
  <div class="card sec"><div class="ch"><b>浏览最多的发布</b><small>${S.range===1?'今天':'近 '+S.range+' 天'} · 浏览 = 打开详情或在信息流里停留超过 1 秒</small></div>
   <table><thead><tr><th>#</th><th>发布</th><th>话题</th><th>球场</th><th class="r">浏览</th><th class="r">网球</th><th class="r">回复</th><th class="r">分享</th><th></th></tr></thead><tbody>
   ${SB_POSTS.map((p,i)=>`<tr><td class="num">${i+1}</td><td><div class="pst"><span class="thumb ${p[4]?'':'tx'}" style="${p[4]?'background:'+SB_PCOL[p[4]]:''}">${p[4]?'':'文'}</span><div><p>${esc(p[0])}</p><small>${esc(sbWho(p[3]))} · ${i<3?'仍在 24 小时内':'已存进相册'}</small></div></div></td><td>${p[1]?`<span class="pill g">${esc(sbTn(p[1]))}</span>`:'<span class="sbm">—</span>'}</td><td class="sbm">${esc(p[2])}</td><td class="r num"><b>${fmt(p[5]*k*pf)}</b></td><td class="r num">${fmt(p[6]*k*pf)}</td><td class="r num">${fmt(p[7]*k*pf)}</td><td class="r num">${fmt(p[8]*k*pf)}</td><td><div class="rowacts"><button class="btn sm" data-hide="${i}">隐藏</button></div></td></tr>`).join('')}</tbody></table>
   <p class="cap">「分享」= 生成分享图并存到相册、发到 Instagram 快拍或小红书的次数。只有作者自己能分享。</p></div>
  <div class="grid g2 sec">
   <div class="card"><div class="ch"><b>引导有没有用</b><small>从看到底栏的问题，到发出一条</small></div>
    <div class="sbfn">${[['看到底栏问题',152000],['点进来写',10900],['发出',6900]].map((s,i,a)=>`<div class="st"><span>${s[0]}</span><span class="t"><i style="width:${(s[1]/a[0][1]*100).toFixed(1)}%;min-width:4px"></i></span><b class="num">${i?pct(s[1]/a[i-1][1]):fmt(s[1]*k*pf)}</b></div>`).join('')}</div>
    <p class="cap" style="margin-top:6px">百分比是相对上一步。发出的里有 <b>54%</b> 用了三行开头。</p>
    <table style="margin-top:14px"><thead><tr><th>底栏问题</th><th>带出的话题</th><th class="r">展示</th><th class="r">点进率</th><th class="r">写完发出</th><th></th></tr></thead><tbody>
    ${SB_QS.map(q=>`<tr><td>${esc(q[0])}</td><td class="sbm">${esc(sbTn(q[1]))}</td><td class="r num">${fmt(q[2]*k*pf)}</td><td class="r num ${q[3]<.03?'flag':''}">${pct(q[3])}</td><td class="r num">${pct(q[4])}</td><td>${q[3]<.03?'<span class="pill w">建议换掉</span>':''}</td></tr>`).join('')}</tbody></table>
    <p class="cap">点进率 = 这句问题正在显示时点进发布页的次数 ÷ 展示次数；低于 3% 标黄。「写完发出」= 点进来后真的发出去的比例。</p></div>
   <div class="card"><div class="ch"><b>哪些开头被用了</b><small>点了开头的人里，最后发出的比例</small></div>
    <table><thead><tr><th>话题 · 开头</th><th class="r">被点</th><th class="r">发出</th></tr></thead><tbody>
    ${SB_TS.filter(t=>t.fills.length).slice(0,6).map((t,ti)=>t.fills.map((f,i)=>{SEED=ti*7+i+3;const c=Math.round((420-ti*40-i*90+rnd()*60)*k*pf),r=.42+rnd()*.38;return `<tr><td>${i===0?`<b>#${esc(t.t)}</b><br>`:''}<span class="tq2">${esc(f)}…</span></td><td class="r num">${fmt(Math.max(3,c))}</td><td class="r num ${r<.5?'flag':''}">${pct(r)}</td></tr>`}).join('')).join('')}
    </tbody></table><p class="cap">「发出」低于 50% 标黄：大家点了却没写下去，这句开头可能不好接。</p></div>
  </div>
  <div class="grid g2 sec">
   <div class="card"><div class="ch"><b>什么时候最热闹</b><small>发布数，按星期和小时（墨尔本时间）</small></div>
    <div class="sbhm"><span></span>${Array.from({length:24},(_,h)=>`<span>${h%3===0?h:''}</span>`).join('')}${hm.map((r,d)=>`<span>${'一二三四五六日'[d]}</span>${r.map(v=>`<i style="opacity:${(.08+v/hmx*.92).toFixed(2)}" title="周${'一二三四五六日'[d]} · ${fmt(v*40*k)} 条"></i>`).join('')}`).join('')}</div>
    <p class="cap">晚上 6–9 点和周末上午最多；底栏的时段问题就是按这个分的，可以在「引导文案」里调时间。</p></div>
   <div class="card"><div class="ch"><b>发的时候大家怎么选</b></div>
    ${sbBars([['带话题',.71,'71%'],['选了球场',.63,'63%'],['带照片',.58,'58%'],['2 小时后再公开',.17,'17%'],['关闭回复',.06,'6%'],['24 小时后留给自己',.34,'34%']],150)}
    <div class="ch" style="margin-top:18px"><b>不想看到的</b><small>越低越好</small></div>
    ${sbBars([['不感兴趣',212,'212'],['· 少看这一类',96,'96'],['· 少看这个人',41,'41'],['· 离我太远',58,'58'],['屏蔽',19,'19'],['举报',7,'7'],['自己撤回 / 删除',64,'64']].map(r=>[r[0],r[1]*k,r[2]==String(r[1])?fmt(r[1]*k):r[2]]),150)}
    <p class="cap">举报会进入「待审核」。不感兴趣的原因只用来调排序，不会通知对方。</p></div>
  </div>`}
