/* =====================================================================
 * 第三批 · 3d-2：概览「今天」面板 · 球场 · 待审核球场 —— 从数据层算（区域页用的 b1geo 已在 3b 改接）
 * ===================================================================== */
// 今天：不受上方时间范围 / 设备筛选影响；真实环境每 10 分钟重算
todayNow=function(){const D=DB,now=+NOW,L=D.L,d0=D.dms(L),d1=D.dms(L+1),pub=D.games.filter(g=>g.visibility==='public');
  const ps=g=>(D.byGame.get(g.id)||[]),need=g=>g.capacity-1,ok=g=>ps(g).filter(p=>p.role==='player'&&p.status==='approved').length>=need(g);
  const up=pub.filter(g=>g.starts_at>=now&&g.starts_at<d1&&g.status!=='cancelled'),left=up.length,filled=up.filter(ok).length,short=left-filled;
  const soon=up.filter(g=>!ok(g)&&g.starts_at<now+2*36e5).length,cancel=pub.filter(g=>g.starts_at>=d0&&g.starts_at<d1&&g.status==='cancelled').length;
  const dl=(c,st)=>Math.min(Math.max(c,st-36e5)+15*6e4,st),pendL=D.game_participants.filter(p=>p.role==='player'&&p.status==='pending'&&D.games[p.game_id].visibility==='public'&&D.games[p.game_id].starts_at>now);
  const pend=pendL.length,exp=pendL.filter(p=>dl(p.created_at,D.games[p.game_id].starts_at)<now+15*6e4).length;
  // 想打没打上：今天开打的局里被婉拒 / 满员自动结束 / 申请失效，且今天没有加入别的局
  const todayG=pub.filter(g=>g.starts_at>=d0&&g.starts_at<d1),inToday=new Set(),lost=new Set();todayG.forEach(g=>ps(g).forEach(p=>{if(p.status==='approved')inToday.add(p.user_id);else if(p.role==='player'&&(p.status==='expired'||p.status==='rejected'))lost.add(p.user_id)}));
  const unmet=[...lost].filter(u=>!inToday.has(u)).length;
  // 今天剩下的时间里开打最多的 2 小时
  let win=null;for(let h=new Date(now).getHours()+1;h<=21;h++){const a=d0+h*36e5,b=a+2*36e5,gs=up.filter(g=>g.starts_at>=a&&g.starts_at<b);if(gs.length&&(!win||gs.length>win.n))win={a:h,n:gs.length,gs}}
  return {left,filled,short,soon,cancel,pend,exp,unmet,win,pendL,lostIds:[...lost].filter(u=>!inToday.has(u))}};
nowPanel=function(){const t=new Date(NOW);t.setMinutes(Math.floor(t.getMinutes()/10)*10,0,0);const hm=d=>`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  const D=todayNow(),DBX=DB,hi=RISK.filter(r=>r.score>=60&&r.st==='open').length,rep=S.reports.filter(r=>r.status==='open').length;
  const tile=(n,v,sub,pg,warn)=>`<button data-pg="${pg}"><span>${n}</span><b class="num${warn&&v?' warn':''}">${v}</b><small>${sub}</small></button>`;
  const tiles=D.left?[tile('还要开打',D.left+' 局',`已人齐 ${D.filled}${D.cancel?` · 今天取消 ${D.cancel}`:''}`,'life'),
    tile('还缺人',D.short+' 局',D.soon?`2 小时内开打 ${D.soon} 局`:'2 小时内开打的都齐了','life',D.soon>0),
    tile('想打没打上',D.unmet+' 人','满员 / 婉拒 / 失效后，今天还没加入别的局','life'),
    tile('申请等处理',D.pend+' 条',D.exp?`15 分钟内失效 ${D.exp} 条`:'暂时没有快失效的','life',D.exp>0)].join(''):'<p class="cap">今天的球局都已开打 ✓</p>';
  const todo=[[rep,'条举报待处理','review'],[hi,'位高风险用户待处理','safety'],[S.pending,'个用户提交的球场待审核','review']].filter(x=>x[0]);
  const notes=[];
  if(D.win){const ids=new Set(D.win.gs.map(g=>g.id)),seek=new Set(D.pendL.filter(p=>ids.has(p.game_id)).map(p=>p.user_id));D.lostIds.forEach(u=>seek.add(u));const open=D.win.gs.filter(g=>(DBX.byGame.get(g.id)||[]).filter(p=>p.role==='player'&&p.status==='approved').length<g.capacity-1).length;
    if(seek.size>=3&&seek.size>open*1.5)notes.push(`今天 ${D.win.a}–${D.win.a+2} 点：<b>${seek.size}</b> 人在找局，只有 <b>${open}</b> 局还有空位 → 可以在微信群里请老球友发局`)}
  const rg=regionRows().filter(r=>r.games>=5).map(r=>({n:r.n,k:r.apps/r.games})),avgK=rg.length?rg.reduce((a,r)=>a+r.k,0)/rg.length:0,top=rg.sort((a,b)=>b.k-a.k)[0];
  if(top&&avgK&&top.k>=avgK*1.25)notes.push(`<b>${esc(top.n)}</b> 每局平均 <b>${top.k.toFixed(1)}</b> 人申请（全市平均 ${avgK.toFixed(1)}）· ${rangeTxt()} → 这里局不够`);
  // 接下来 7 天最集中的 2 小时（已发布、未取消）
  {const now=+NOW,c={};DBX.games.forEach(g=>{if(g.visibility!=='public'||g.status==='cancelled'||g.starts_at<now||g.starts_at>=now+7*DBX.DAY)return;const t=new Date(g.starts_at),k=(DBX.dayOf(g.starts_at)-DBX.L)+'|'+Math.floor(t.getHours()/2)*2;c[k]=(c[k]||0)+1});
    const best=Object.entries(c).sort((p,q)=>q[1]-p[1])[0];if(best&&best[1]>=5){const [off,h]=best[0].split('|').map(Number),dd=new Date(DBX.dms(DBX.L+off)),lab=off===0?'今天':off===1?'明天':'周'+WD[dd.getDay()];
      notes.push(`${lab}${+h<12?'上午':+h<18?'下午':'晚上'} ${h}–${+h+2} 点已有 <b>${best[1]}</b> 局，是接下来 7 天最集中的时段 → 留意场地是否订得到`)}}
  return `<div class="card now"><div class="ch"><b>今天</b><small>每 10 分钟更新 · 上次 ${hm(t)} · 不受上方筛选影响</small></div>
    <div class="now-t">${tiles}</div>
    <div class="now-s"><small>需要处理</small>${todo.length?todo.map(x=>`<button data-pg="${x[2]}"><b class="num">${x[0]}</b><span>${x[1]}</span><i>›</i></button>`).join(''):'<p class="cap">都处理完了 ✓</p>'}</div>
    <div class="now-s"><small>值得注意</small>${notes.length?notes.map(n=>`<p>${n}</p>`).join(''):'<p class="cap">暂时没有明显的供需缺口</p>'}</div></div>`};
// 球场的热度：近 30 天在这里发布的球局（用户提交、还在审核的球场 = 提交人发局时用过的次数）
const V3HEAT=(()=>{let c=null;return id=>{if(!c){c={};const t=+NOW-30*DB.DAY;DB.games.forEach(g=>{if(g.venue_id&&g.created_at>=t)c[g.venue_id]=(c[g.venue_id]||0)+1});DB.pending_venue_use.forEach(x=>c[x.venue_id]=(c[x.venue_id]||0)+x.n)}return c[id]||0}})();

