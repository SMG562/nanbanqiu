/* ---------- 页面：话题 ---------- */
function pageSbTopic(){const tabs=[['all','全部'],['常驻','常驻'],['限时','限时'],['大家发起','大家发起'],['pending','还没到门槛'],['off','已下线']];
  const list=SB_TOPICS.filter(t=>SB.tab==='all'?!t.pending:SB.tab==='pending'?t.pending:SB.tab==='off'?!t.on:t.kind===SB.tab&&!t.pending);
  const st=id=>SB_TS.find(x=>x.id===id)||{posts:0,people:0,balls:0};
  return `<div class="card sec" style="margin-top:0"><div class="ch"><b>所有话题</b><small>改完点「保存」，5 分钟内在场边生效</small><div class="r"><input class="search" placeholder="搜话题" style="width:200px" id="tsearch"><button class="btn p" data-new>＋ 新建话题</button></div></div>
   <div class="tabs">${tabs.map(t=>`<button class="${SB.tab===t[0]?'on':''}" data-tab="${t[0]}">${t[1]}${t[0]==='pending'?` <span class="pill w">${SB_TOPICS.filter(x=>x.pending).length}</span>`:''}</button>`).join('')}</div>
   <table><thead><tr><th>话题</th><th>类型</th><th>它的问题</th><th>三个开头</th><th class="r">近 7 天发布</th><th class="r">参与人</th><th>上线</th><th></th></tr></thead><tbody>
   ${list.map(t=>{const s=st(t.id);return `<tr><td><b>#${esc(t.t)}</b>${t.by?`<br><small class="sbm">由 ${esc(sbWho(t.by))} 发起</small>`:''}</td><td><span class="pill ${t.kind==='常驻'?'g':t.kind==='限时'?'w':'nodot'}">${t.kind}</span></td><td class="tq2">${esc(t.ask)||'<span class="sbm">（没有，提示用「说说 #话题」）</span>'}</td><td class="sbm">${t.fills.length?t.fills.length+' 句':'—'}</td>
     <td class="r num">${t.pending?`${t.people} / ${SB_RULES.people} 人`:fmt(s.posts)}</td><td class="r num">${t.pending?'—':fmt(s.people)}</td><td><button class="tg ${t.on?'on':''}" data-on="${t.id}" aria-label="上线"></button></td>
     <td><div class="rowacts"><button class="btn sm" data-edit="${t.id}">编辑</button>${t.kind==='大家发起'&&!t.pending?`<button class="btn sm" data-promote="${t.id}">转为常驻</button>`:''}${t.pending?`<button class="btn sm" data-release="${t.id}">提前放出</button>`:''}</div></td></tr>`}).join('')||'<tr><td colspan="8" class="sbm">没有</td></tr>'}</tbody></table>
   ${SB.tab==='pending'?`<p class="cap">「大家发起」的新话题，7 天内有 ${SB_RULES.people} 个不同的人用过才会出现在「大家在聊」和搜索里。没到门槛前只挂在帖子上。</p>`:''}</div>
  <div class="grid g2 sec">
   <div class="card"><div class="ch"><b>相似的合并</b><small>输入时先推荐已有的话题；意思一样的直接并过去</small></div>
    <table><thead><tr><th>大家输入的词</th><th>推荐 / 并入</th><th></th></tr></thead><tbody>${SB_ALIAS.map((a,i)=>`<tr><td><b>${esc(a[0])}</b></td><td>#${esc(SB_TOPICS.find(t=>t.id===a[1]).t)}</td><td><button class="btn sm" data-ral="${i}">删除</button></td></tr>`).join('')}
    <tr><td><input class="search" id="alw" placeholder="比如：神仙场" style="width:150px"></td><td><select class="search" id="alt" style="width:200px">${SB_TOPICS.filter(t=>t.kind!=='大家发起').map(t=>`<option value="${t.id}">#${esc(t.t)}</option>`).join('')}</select></td><td><button class="btn sm p" data-aal>添加</button></td></tr></tbody></table></div>
   <div class="card"><div class="ch"><b>规则</b><small>大家发起话题时</small></div>
    <div class="fld"><label>太宽的词 <small>不能新建，会提示「换个具体的？」</small></label><div class="tags" id="gen">${SB_GENERIC.map((g,i)=>`<span>${esc(g)}<button data-rgen="${i}">×</button></span>`).join('')}<input placeholder="加一个，回车" id="genin"></div></div>
    <div class="row2"><div class="fld"><label>名字最短</label><input type="number" value="${SB_RULES.min}" data-rule="min"></div><div class="fld"><label>名字最长</label><input type="number" value="${SB_RULES.max}" data-rule="max"></div></div>
    <div class="row2"><div class="fld"><label>几个人用过才被看到</label><input type="number" value="${SB_RULES.people}" data-rule="people"></div><div class="fld"><label>在几天内</label><input type="number" value="${SB_RULES.days}" data-rule="days"></div></div>
    <div class="fld"><label>多少天没人用就沉下去</label><input type="number" value="${SB_RULES.sink}" data-rule="sink"></div></div>
  </div>`}

/* ---------- 页面：今日推荐排期 ---------- */
function pageSbSched(){const opts=sel=>`<option value="@hot" ${sel==='@hot'?'selected':''}>大家发起的本周最热（自动）</option>`+SB_TOPICS.filter(t=>t.kind!=='大家发起'&&t.on).map(t=>`<option value="${t.id}" ${sel===t.id?'selected':''}>#${esc(t.t)}</option>`).join('');
  const last={dopa:[61,48],gear:[44,35],'@hot':[39,30],spot:[52,41],ootd:[88,70],pet:[57,45],sunset:[49,40]};
  return `<div class="card sec" style="margin-top:0"><div class="ch"><b>每周的固定栏目</b><small>每天 0 点换；今天（周五）的推荐显示在场边的「今日推荐」卡片和底栏问题里</small></div>
   <div class="wk">${SB_WEEK.map((w,i)=>{const l=last[w[1]]||[0,0];return `<div class="d ${i===4?'today':''}"><h4><span>${w[0]}</span>${i===4?'<span class="pill g">今天</span>':''}</h4><select data-wk="${i}">${opts(w[1])}</select><input value="${esc(w[2])}" data-wkn="${i}" placeholder="一句说明（只给自己看）"><div class="sbm">上周这天：<b>${l[0]}</b> 条 · <b>${l[1]}</b> 人</div></div>`}).join('')}</div>
   <p class="cap">原则：周一、周日偏一句话，周五、周六偏照片；周三留给大家发起的话题，给发起人一点回报。同一个话题一周只出现一次。</p></div>
  <div class="card sec"><div class="ch"><b>特别安排</b><small>盖过周历；有起止时间，到点自动开始和结束</small><div class="r"><button class="btn sm p" data-newev>＋ 添加</button></div></div>
   <div class="sbev" style="border-top:0;font-size:11.5px;color:var(--mut);font-weight:600"><span>话题</span><span>什么时候</span><span>说明</span><span></span></div>
   <div class="sbev"><b>#AO来了 <span class="pill w">限时</span></b><span class="num">2027-01-12 → 2027-02-01</span><span class="sbm">澳网期间每天推荐</span><span><button class="btn sm" data-edit="ao">编辑</button></span></div>
   <div class="sbev"><b>#雨停了 <span class="pill nodot">自动</span></b><span>天气：雨停 2 小时内（按球场所在区）</span><span class="sbm">问题「场地干了吗？」，最多一天一次</span><span><button class="tg on" data-x></button></span></div>
   <div class="sbev"><b>#夏令时的第一个晚场</b><span class="num">2026-10-04（已结束）</span><span class="sbm">212 条 · 160 人</span><span class="sbm">已结束</span></div></div>
  <div class="sbnote"><b>i</b><span>每天的推荐会同时出现在三个地方：场边信息流里的「今日推荐」卡片、底栏轮播的第二句、发布页「今天想聊点什么」的第一个。改了排期，三个地方一起变。</span></div>`}

/* ---------- 页面：引导文案 ---------- */
const sbQrow=(q,i,grp,extra='')=>`<div class="qi"><span class="h">⋮⋮</span><input value="${esc(q.t)}" data-q="${grp}:${i}" maxlength="20"><span class="sbm">${extra}</span><span class="sbm ${q.t.replace(/\{球场\}/,'Kooyong').length>SB_SET.hlen||/！|!/.test(q.t)?'flag':''}">${q.t.replace(/\{球场\}/,'Kooyong').length} 字${/！|!/.test(q.t)?' · 有感叹号':''}</span><button class="tg ${q.on?'on':''}" data-qon="${grp}:${i}"></button><button class="x" data-qx="${grp}:${i}">×</button></div>`;
function pageSbGuide(){const tOpt=sel=>SB_TOPICS.filter(t=>t.on&&t.kind!=='大家发起').map(t=>`<option value="${t.id}" ${sel===t.id?'selected':''}>#${esc(t.t)} · ${esc(t.ask)}</option>`).join('');
  return `<div style="display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:16px;align-items:start">
  <div>
  <div class="card" ><div class="ch"><b>底栏的问题</b><small>浏览时输入框里轮播的那一句。只问此刻，${SB_SET.hlen} 个字以内，不用感叹号</small></div>
   <div class="row2"><div class="fld"><label>每句停留 <small>秒</small></label><input type="number" value="${SB_SET.every}" data-set="every"></div><div class="fld"><label>换了球场或筛选后，至少停留 <small>秒</small></label><input type="number" value="${SB_SET.hold}" data-set="hold"></div></div>
   <div class="ch" style="margin:6px 0 0"><b style="font-size:13px">一直会出现的</b></div>
   <div class="ql">${SB_GENQ.map((q,i)=>sbQrow(q,i,'gen',q.k)).join('')}</div>
   <div class="ch" style="margin:16px 0 0"><b style="font-size:13px">按时段带出的话题</b><small>每个时段两个话题，用的是话题自己的问题；今日推荐固定在第二句</small></div>
   ${SB_SLOTS.map((s,i)=>`<div class="slot"><b>${s.n}</b><span class="tm"><input value="${s.f}" data-sf="${i}">–<input value="${s.to}" data-st="${i}">点</span><select data-sl="${i}:0">${tOpt(s.tp[0])}</select><select data-sl="${i}:1">${tOpt(s.tp[1])}</select></div>`).join('')}
   <div class="ch" style="margin:16px 0 0"><b style="font-size:13px">选了球场时</b><small>{球场} 会换成那块场的名字</small></div>
   <div class="ql">${SB_COURTQ.map((q,i)=>sbQrow(q,i,'court',q.night?'只在晚上':q.day?'白天':'')).join('')}</div>
   <p class="cap">排在最前面的先出现；拖动 ⋮⋮ 改顺序。点进率低于 3% 的问题会在「场边数据」里标黄。</p></div>

  <div class="card sec"><div class="ch"><b>不是话题的开头</b><small>从球场问题、失物招领进来时，输入框下面的几行</small></div>
   <div class="fld"><label>球场</label>${SB_COURTF.map((f,i)=>`<div class="srow" style="margin-bottom:6px"><input type="text" value="${esc(f)}" data-cf="${i}"><button>↑</button><button>↓</button></div>`).join('')}</div>
   <div class="fld"><label>失物招领 <small>实用的只给两句</small></label>${SB_LOSTF.map((f,i)=>`<div class="srow" style="margin-bottom:6px"><input type="text" value="${esc(f)}" data-lf="${i}"><button>↑</button><button>↓</button></div>`).join('')}</div></div>

  <div class="card sec"><div class="ch"><b>发布页</b></div>
   <div class="opt" style="border-top:0"><div><b>没带话题进来时，下面给几个话题</b><small>按：和照片相配 → 今日推荐 → 这个时段的话题</small></div><input type="number" value="${SB_SET.sugN}" style="width:64px;height:34px;border:1px solid var(--line);border-radius:9px;text-align:center" data-set="sugN"></div>
   <div class="opt"><div><b>照片和话题怎么配</b><small>识别出照片里有这些东西时，先推荐对应话题。在每个话题的编辑页里设置</small></div><button class="btn sm" data-pg="stopic">去话题</button></div>
   <div class="opt"><div><b>写开头的原则</b><small>只给半句；落到一件具体的东西；不问感受；不需要露脸、比水平、晒成绩</small></div></div></div>

  <div class="card sec"><div class="ch"><b>改动记录</b><small>每次发布都留一个版本，可以退回</small></div>
   <div class="ver">${SB_VERS.map(v=>`<div><b class="mono">${v[0]}</b><span>${esc(v[2])}<br><small class="sbm">${v[1]} · ${v[3]}</small></span><button class="btn sm" data-rollback="${v[0]}">退回到这一版</button></div>`).join('')}</div></div>
  </div>
  <div class="pv"><div class="lb">预览</div><div class="pvtabs">${SB_SLOTS.map((s,i)=>`<button class="${SB.slot===i?'on':''}" data-pvs="${i}">${s.n}</button>`).join('')}</div>${sbPhoneBar()}<p class="cap">按「每句停留」的时间轮播；这里用 1.5 秒播一遍。</p></div>
  </div>`}

/* ---------- 预览 ---------- */
function sbHintList(slot){const s=SB_SLOTS[slot],T=id=>SB_TOPICS.find(t=>t.id===id);const today=T('ootd');return [...SB_GENQ.filter(q=>q.on&&q.k==='通用').map(q=>q.t),today.ask,...s.tp.map(id=>T(id).ask),...SB_GENQ.filter(q=>q.on&&q.k!=='通用').map(q=>q.t)]}
function sbPhoneBar(){return `<div class="ph"><div class="sc"><div class="fe"><h4>场边<sup style="font-size:9px;color:#1E5A44">24h</sup></h4><div class="card2">红土 3、4 号空着，快来<small>Mia · KOOYONG · 2 分钟前</small></div><div class="card2">风好大，高球全飘了<small>阿杰 · GLEN IRIS · 8 分钟前</small></div><div class="card2" style="background:#fff"><b style="font-size:11px;color:#1E5A44">今日推荐 · 周五</b><br>#网球人的OOTD<small>已有 37 张 · 我也发一张</small></div></div><div class="bar2"><em id="pvh">${esc(sbHintList(SB.slot)[0])}</em><i>球场</i></div></div></div>`}
function sbPhoneCompose(t){const has=!!t.t,F=t.fills.filter(Boolean);return `<div class="ph"><div class="sc"><div class="tb"><span>取消</span><b>发布</b></div><div class="ct ${has?'':'off'}"># ${esc(t.t||'加个话题')} ⌄</div><div class="pl">${esc(t.ask||('说说 #'+(t.t||'')))}</div><div class="ss">${F.map(f=>`<p>${esc(f)}…</p>`).join('')}</div><div class="bt"><span>⌖ 球场</span></div></div></div>`}
let sbPvT;function sbRunPv(){clearInterval(sbPvT);const e=$('#pvh');if(!e)return;let i=0;sbPvT=setInterval(()=>{const L=sbHintList(SB.slot),el=$('#pvh');if(!el){clearInterval(sbPvT);return}el.style.opacity=0;setTimeout(()=>{el.textContent=L[++i%L.length];el.style.opacity=1},300)},1500)}
