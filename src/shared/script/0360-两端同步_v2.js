/* ===================== 两端同步 v2 ===================== */
// 待定的邀约：放在「我的球局」最上面（两端一致）
function ivqHTML(){if(!ME)return'';const ivs=INVITES.filter(i=>[i.from,i.to].includes(ME.id)&&['pending','counter'].includes(i.status)&&!invExpired(i)).sort((a,b)=>b.at-a.at);if(!ivs.length)return'';
  return `<div class="ivq"><div class="ivq-h">待定的邀约 <span>${ivs.length}</span></div>${ivs.map(i=>{const oth=U(i.from===ME.id?i.to:i.from),todo=i.status==='pending'?i.to===ME.id:i.from===ME.id;
    return `<button class="ivq-r${todo?' todo':''}" data-iv="view" data-i="${i.id}">${av(oth)}<span class="ivq-t"><b>${todo?(i.status==='counter'?`${esc(oth.name)} 提议了新时间`:`${esc(oth.name)} 想约你打球`):`你约了 ${esc(oth.name)}`}</b><small>${esc(invWhen(i))} · ${esc(invWhere(i))}</small></span><em>${todo?'去回复':'等 TA 回复'}</em></button>`}).join('')}</div>`}

// 演示：多人申请（12 人申请 Han 的双打）
function mdDemo(){const g=GAMES.find(g=>g.host_id==='han'&&g.status==='open'&&new Date(g.starts_at)>NOW&&V(g).game_type==='doubles'&&V(g).spots>=2)||GAMES.find(g=>g.host_id==='han'&&g.status==='open'&&new Date(g.starts_at)>NOW);
  PARTS=PARTS.filter(p=>!(p.game_id===g.id&&p.status==='pending'));NOTIFS=NOTIFS.filter(n=>!(n.game_id===g.id&&n.kind==='request'));
  const ids=Object.keys(USERS).filter(u=>u!=='han'&&!blockedPair('han',u)&&!PARTS.some(p=>p.game_id===g.id&&p.user_id===u)&&(!isW(V(g))||womenOK(U(u)))).slice(0,12);
  const MSG=['周六正好有空，可以带新球','双打站位都可以','第一次约，请多关照','',''];
  const save=ME;ME=USERS.han;
  ids.forEach((u,i)=>{PARTS.push({game_id:g.id,user_id:u,role:'player',status:'pending',message:MSG[i%5],created_at:Date.now()-(ids.length-i)*4e5});notify('han','request',g.id,u)});
  if(ids[2])setOpin('han',ids[2],'more');if(ids[7])setOpin('han',ids[7],'less');
  ME=save;RQ.sort[g.id]='rec';RQ.open[g.id]=false;return g.id}

// 网页：通知打开后自动标为已读；点开有人申请 → 定位到 TA；没排上 / 已失效 → 回到那天的发现页
if(typeof renderPop==='function'){
