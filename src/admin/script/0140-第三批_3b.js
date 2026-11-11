/* =====================================================================
 * 第三批 · 3b：页面数字改从 DB 算（全站共用的基础计算）
 *  · HIST 每一行 = 当天的汇总（= daily_metrics），按设备存三份（全部 / 手机 / 电脑）；读取时按上方「设备」筛选
 *  · b1calc / MM：区间内的合计、去重人数、开打人齐、漏斗，全部从 DB 算；「较昨日同时段」按昨天同一时刻截止
 *  · b1apps：申请结果；b1geo：球场 / 区域；heat：开打时间分布 —— 都从 DB 算
 * 设备：手机 / 电脑 = 当时用的设备（访问按当天用过的设备；新注册按注册时；球局按发起时；申请按申请时）
 * ===================================================================== */
const DEVK=()=>S.plat==='pwa'?'mobile':S.plat==='web'?'desktop':'all';
const DEVM={all:3,mobile:1,desktop:2};
const B3=(()=>{const D=DB,L=D.L,DAY=D.DAY,now=+NOW,DV=['all','mobile','desktop'],ok=(dk,dev)=>dk==='all'||dk===dev;
  // 按天分桶，避免反复全表扫描
  const by=k=>{const o=[...Array(L+1)].map(()=>[]);return (arr,f)=>{arr.forEach(x=>{const d=f(x);if(d>=0&&d<=L)o[d].push(x)});return o}};
  const usersBy=by()(D.users,u=>u.day),gamesBy=by()(D.games.filter(g=>g.visibility==='public'),g=>g.day),startBy=by()(D.games.filter(g=>g.visibility==='public'),g=>D.dayOf(g.starts_at));
  const appsBy=by()(D.game_participants.filter(p=>p.role==='player'&&D.games[p.game_id].visibility==='public'),p=>D.dayOf(p.created_at));
  const invBy=by()(D.invites,i=>D.dayOf(i.created_at)),shBy=by()(D.shares,x=>x.day);
  const nsBy=by()(D.noshow_confirmed.filter(n=>n.confirmed),n=>D.dayOf(D.games[n.game_id].starts_at));
  const appr=p=>p.status==='approved'||p.status==='left';
  // 一天的汇总；cut = 截止时刻（今天 = 此刻；「昨天同一时间」= 此刻 − 24 小时）
  function day(d,cut=now){const out={},A=D.activity[d],N=D.anon[d],ms=D.msgs[d],e=Math.min(cut,D.dms(d+1)),frac=Math.max(0,Math.min(1,(e-D.dms(d))/(D.dms(d+1)-D.dms(d))));
    DV.forEach(dk=>{const m=DEVM[dk],r={};let dau=0,ses=0;for(let i=0;i<A.u.length;i++)if(A.dev[i]&m&&A.t[i]<cut){dau++;ses+=dk==='all'?A.ses[i]:dk==='mobile'?A.sesM[i]:A.sesD[i]}   // 会话按每次会话用的设备
      for(let i=0;i<N.a.length;i++)if(N.dev[i]&m&&N.reg[i]==null&&N.t[i]<cut){dau++;ses++}
      r.dau=dau;r.sessions=ses;r.visitors=ses;
      r.nu=usersBy[d].filter(u=>u.created_at<cut&&ok(dk,u.dev)).length;
      r.games=gamesBy[d].filter(g=>g.created_at<cut&&ok(dk,g.created_device)).length;
      const ap=appsBy[d].filter(p=>p.created_at<cut&&ok(dk,p.device));r.apps=ap.length;r.applicants=new Set(ap.map(p=>p.user_id)).size;r.appr=ap.filter(appr).length;
      r.inv=invBy[d].filter(i=>i.created_at<cut&&ok(dk,i.device)).length;r.shares=shBy[d].filter(x=>x.t<cut&&ok(dk,x.device)).length;
      r.msgs=Math.round((dk==='all'?ms.dm[0]+ms.dm[1]+ms.game[0]+ms.game[1]:dk==='mobile'?ms.dm[0]+ms.game[0]:ms.dm[1]+ms.game[1])*frac);
      const sg=startBy[d].filter(g=>g.starts_at<Math.min(cut,now)&&ok(dk,g.created_device));r.cancel=sg.filter(g=>g.status==='cancelled').length;r.st=sg.length-r.cancel;r.full=sg.filter(g=>g.status!=='cancelled'&&g.filled_at_start).length;r.fill=r.st?r.full/r.st:0;
      const pl=sg.filter(g=>g.status==='completed').reduce((s,g)=>s+(D.byGame.get(g.id)||[]).filter(p=>p.status==='approved').length,0);r.noshow=pl?nsBy[d].filter(n=>ok(dk,D.games[n.game_id].created_device)).length/pl:0;
      out[dk]=r});return out}
  const ROLL=HIST.map((x,d)=>day(d)),YCUT=day(L-1,D.ago(now,1));   // 昨天同一墙上时间（夏令时那天不是 24 小时前）
  // 区间内的人（去重）：已注册活跃 L、未登录访客、看过详情 D、申请 A、被接受 AC、打上球 PL
  function people(a,b,dk,cut){const m=DEVM[dk],Ls=new Set(),Vn=new Set(),Ds=new Set(),DET=1<<D.SCR.indexOf('game_detail');
    for(let d=Math.max(0,a);d<=Math.min(L,b);d++){const A=D.activity[d],N=D.anon[d];for(let i=0;i<A.u.length;i++)if(A.dev[i]&m&&A.t[i]<cut){Ls.add(A.u[i]);if(A.scr[i]&DET)Ds.add(A.u[i])}
      for(let i=0;i<N.a.length;i++)if(N.dev[i]&m&&N.reg[i]==null&&N.t[i]<cut)Vn.add(N.a[i])}
    const ap=[];for(let d=Math.max(0,a);d<=Math.min(L,b);d++)appsBy[d].forEach(p=>{if(p.created_at<cut&&ok(dk,p.device))ap.push(p)});
    const As=new Set(ap.map(p=>p.user_id)),AC=new Set(ap.filter(p=>appr(p)&&p.decided_at<cut).map(p=>p.user_id)),PL=new Set(ap.filter(p=>{const g=D.games[p.game_id];return p.status==='approved'&&g.status==='completed'&&g.starts_at+g.duration_min*6e4<cut}).map(p=>p.user_id));
    return {L:Ls.size,V:Ls.size+Vn.size,D:Ds.size,A:As.size,AC:AC.size,PL:PL.size,apps:ap}}
  const regUntil=(b,dk)=>D.users.filter(u=>u.day<=b&&ok(dk,u.dev)).length;
  return {day,ROLL,YCUT,people,regUntil,appsBy,startBy,gamesBy,ok,appr}})();
// HIST 的每一行改为从汇总读（按当前设备）；写入无效（原型的实时动态不再改数字）
['dau','nu','games','apps','applicants','appr','msgs','inv','shares','sessions','visitors','noshow','fill'].forEach(k=>HIST.forEach((x,d)=>{x.di=d;Object.defineProperty(x,k,{get(){return B3.ROLL[d][DEVK()][k]},set(){},configurable:true,enumerable:true})}));
// 一天的球局去向（今天只算已经到开打时间的）
b1day=function(x,mode){const r=mode==='yday'?B3.YCUT[DEVK()]:B3.ROLL[x.di][DEVK()];return {st:r.st,full:r.full,cancel:r.cancel}};
b1calc=function(arr,mode){const dk=DEVK(),yd=mode==='yday',L=DB.L,a=yd?L-1:arr.length?arr[0].di:L,b=yd?L-1:arr.length?arr[arr.length-1].di:L,cut=yd?DB.ago(+NOW,1):+NOW;
  const rows=yd?[B3.YCUT[dk]]:arr.map(x=>B3.ROLL[x.di][dk]),S_=k=>rows.reduce((s,r)=>s+r[k],0);
  const o={days:rows.length,dauSum:S_('dau'),nu:S_('nu'),games:S_('games'),apps:S_('apps'),appr:S_('appr'),msgs:S_('msgs'),inv:S_('inv'),shares:S_('shares'),sessions:S_('sessions'),visits:S_('visitors'),st:S_('st'),full:S_('full'),cancel:S_('cancel')};
  o.rate=o.st>0?o.full/o.st:null;o.dau=o.days?o.dauSum/o.days:0;
  const P=B3.people(a,b,dk,cut);o.applicants=P.A;o.visitors=P.V;o.au=P.V;o.reg=B3.regUntil(b,dk);o.regAll=B3.regUntil(b,'all');
  o.fun={V:P.V,L:P.L,D:P.D,A:P.A,AC:P.AC,PL:P.PL,nu:o.nu};o.range={a,b,cut,dk};o._apps=P.apps;return o};
// 申请的结果（互斥，加起来 = 申请次数）：通过（含之后退出）· 发起人婉拒 · 满员自动结束 · 超时失效 · 屏蔽自动结束 · 申请人撤回 · 还在等
b1apps=function(M){const ap=M._apps||[],c=f=>ap.filter(f).length,n=ap.length,p=c(B3.appr);
  const parts=[['通过',p],['发起人婉拒',c(x=>x.status==='rejected'&&['known','level','pass'].includes(x.decline_reason))],['满员自动结束',c(x=>x.decline_reason==='full_auto')],['超时失效',c(x=>x.status==='expired')],['屏蔽自动结束',c(x=>x.decline_reason==='blocked')],['申请人撤回',c(x=>x.status==='withdrawn')],['还在等发起人确认',c(x=>x.status==='pending')]];
  const why={known:c(x=>x.decline_reason==='known'),level:c(x=>x.decline_reason==='level'),pass:c(x=>x.decline_reason==='pass'&&x.status==='rejected')};
  return {apps:n,appr:p,rate:n?p/n:0,parts,why}};
// 球场 / 区域（区间内：新球局按发起时间；开打 / 人齐按开打时间；申请按申请时间；打上球的人按开打时间去重）
b1geo=function(){const M=MM();if(M._geo)return M._geo;const {a,b,cut,dk}=M.range,D=DB,L=D.L,ok=B3.ok,inR=t=>t>=D.dms(a)&&t<Math.min(D.dms(b+1),cut);
  const V=VENUES.filter(v=>(v[6]==='verified'||v[6]==='pending')&&v[3]),vm=new Map(V.map(v=>[v[0],{v,games:0,st:0,full:0,apps:0,pl:new Set(),played:0}])),reg={},R=n=>reg[n]=reg[n]||{n,games:0,st:0,full:0,apps:0,venues:0,vl:[],custom:0,pl:new Set(),wg:0,utrS:0,utrN:0,nu:0};
  const pub=D.games.filter(g=>g.visibility==='public'&&ok(dk,g.created_device));
  pub.forEach(g=>{const x=g.venue_id?vm.get(g.venue_id):null,rg=R(x?x.v[3]:g.suburb);if(inR(g.created_at)){if(x)x.games++;else rg.custom++;rg.games+=x?0:1;if(g.tags.includes('women'))rg.wg++}
    if(inR(g.starts_at)&&g.status!=='cancelled'){const ps=(D.byGame.get(g.id)||[]).filter(p=>p.status==='approved');if(x){x.st++;if(g.filled_at_start){x.full++;x.played++}}else{rg.st++;if(g.filled_at_start){rg.full++}}
      if(g.status==='completed'&&g.filled_at_start)ps.forEach(p=>{(x?x.pl:rg.pl).add(p.user_id);rg.utrS+=D.users[p.user_id].utr;rg.utrN++})}});
  for(let d=Math.max(0,a);d<=Math.min(L,b);d++)B3.appsBy[d].forEach(p=>{if(p.created_at<cut&&ok(dk,p.device)){const g=D.games[p.game_id],x=g.venue_id?vm.get(g.venue_id):null;if(x)x.apps++;else R(g.suburb).apps++}});
  D.users.forEach(u=>{if(u.day>=a&&u.day<=b&&u.created_at<cut&&ok(dk,u.dev))R(u.suburb).nu++});
  const rows=[...vm.values()].map(x=>({v:x.v,games:x.games,st:x.st,full:x.full,fill:x.st?x.full/x.st:null,apps:x.apps,played:x.played,players:x.pl.size,pl:x.pl,score:x.played*3+x.games+x.apps*.5}));
  rows.forEach(r=>{const x=R(r.v[3]);x.games+=r.games;x.st+=r.st;x.full+=r.full;x.apps+=r.apps;r.pl.forEach(u=>x.pl.add(u));if(r.v[6]==='verified')x.venues++;x.vl.push(r)});
  // 环比：上一个同样长的区间（今天对比昨天同一时间）
  const span=b-a+1,pa=a-span,pb=b-span,pcut=M.one?D.ago(cut,span):D.dms(pb+1),prev={};
  if(M.prevOK&&pa>=0)pub.forEach(g=>{if(g.created_at>=D.dms(pa)&&g.created_at<Math.min(D.dms(pb+1),pcut)){const n=g.venue_id?(vm.get(g.venue_id)||{v:[0,0,0,g.suburb]}).v[3]:g.suburb;prev[n]=(prev[n]||0)+1}});
  const regions=Object.values(reg).map(x=>{const top=x.vl.filter(r=>r.v[6]==='verified').sort((p,q)=>q.games-p.games)[0];
    return {n:x.n,games:x.games,st:x.st,full:x.full,apps:x.apps,venues:x.venues,vl:x.vl,custom:x.custom,fill:x.st>0?x.full/x.st:null,played:x.full,players:x.pl.size,nu:x.nu,top:top&&top.games?top.v[2]:null,
      women:x.games?x.wg/x.games:0,utr:x.utrN?+(x.utrS/x.utrN).toFixed(1):+(DB.users.filter(u=>u.suburb===x.n).reduce((s,u,i,a)=>s+u.utr/a.length,0)||4.5).toFixed(1),chg:M.prevOK&&prev[x.n]>=3?x.games/prev[x.n]-1:null,score:x.full*3+x.games+x.apps*.5}});
  return M._geo={venues:rows,regions}};
// 开打时间分布（星期 × 小时，到了开打时间的球局，含取消）
heat=function(){const M=MM(),{a,b,cut,dk}=M.range,D=DB,cells=[...Array(7)].map(()=>Array(24).fill(0));let mx=0;
  for(let d=Math.max(0,a);d<=Math.min(D.L,b);d++)B3.startBy[d].forEach(g=>{if(g.starts_at<Math.min(cut,+NOW)&&B3.ok(dk,g.created_device)){const t=new Date(g.starts_at);cells[t.getDay()][t.getHours()]++}});
  cells.forEach(r=>r.forEach(v=>mx=Math.max(mx,v)));
  let h='<div class="hm"><span></span>'+Array.from({length:17},(_,i)=>`<span class="hx">${(i+6)%3===0?i+6:''}</span>`).join('');
  [1,2,3,4,5,6,0].forEach(d=>{h+=`<span class="hl">周${WD[d]}</span>`;for(let x=6;x<=22;x++){const v=cells[d][x];h+=`<span class="c" style="background:${ramp(mx?v/mx:0)}" data-tv="${v} 局" data-tl="周${WD[d]} ${x}:00–${x+1}:00 开打"></span>`}});
  return h+`</div><div class="legend">少<span class="ramp">${[0,.17,.33,.5,.67,.83,1].map(t=>`<i style="background:${ramp(t)}"></i>`).join('')}</span>多 · 按开打时间 · ${rangeTxt()}</div>`};
B1C={k:''};

