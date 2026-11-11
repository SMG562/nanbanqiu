/* =====================================================================
 * 第三批之后 · 提醒去了哪里：从数据层的球局 / 申请 / 邀约 / 赛后 / 多遇到 / 爽约推出每条提醒（= notifications），
 * 再按前台的路由规则决定第一去向（= notification_deliveries）。独立随机数流，不影响其他模拟数据。
 * ===================================================================== */
const N3=(()=>{let c=null;return()=>{if(c)return c;const D=DB,U=D.users,now=+NOW,DAY=D.DAY,out=[];
  let s=4242>>>0;const R=()=>{s=(s+0x6D2B79F5)>>>0;let t=s;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296};
  const add=(uid,kind,t,o)=>{if(uid==null||t==null||t>=now||!U[uid])return;out.push({uid,kind,t0:t,...o})};
  // ---- 1 产生提醒 ----
  D.games.forEach(g=>{const ps=D.byGame.get(g.id)||[],ct=g.status==='cancelled'?g.cancelled_at:null;
    ps.forEach(p=>{if(p.role!=='player')return;const inst=p.status!=='pending'&&p.decided_at===p.created_at&&['approved','left'].includes(p.status);
      add(g.host_id,inst?'joined':'request',p.created_at,{game:g.id,part:p});
      if(ct!=null&&p.decided_at===ct)return;                                  // 球局取消时一起结束的申请：只收到「球局取消」
      if(!inst&&['approved','left'].includes(p.status))add(p.user_id,'approved',p.decided_at,{game:g.id});
      if(p.status==='rejected')add(p.user_id,p.decline_reason==='full_auto'?'full':'rejected',p.decided_at,{game:g.id});
      if(p.status==='expired')add(p.user_id,'expired',p.decided_at,{game:g.id});
      if(p.status==='left')add(g.host_id,'player_left',p.left_at,{game:g.id})});
    if(ct!=null)ps.forEach(p=>{if(p.role==='player'&&p.created_at<ct&&(p.status==='approved'||p.decided_at===ct))add(p.user_id,'game_cancelled',ct,{game:g.id})});
    else{const ap=ps.filter(p=>p.status==='approved'),st=g.starts_at-30*6e4;if(ap.length>=2)ap.forEach(p=>{if((p.decided_at||p.created_at)<st&&g.created_at<st)add(p.user_id,'soon',st,{game:g.id})})}});
  D.game_changes.forEach(x=>{if(x.kind==='note')return;(D.byGame.get(x.game_id)||[]).forEach(p=>{if(p.role==='player'&&p.decided_at!=null&&p.decided_at<x.at&&(p.status==='approved'||(p.status==='left'&&p.left_at>x.at)))add(p.user_id,x.kind==='postpone'?'postponed':'changed',x.at,{game:x.game_id})})});
  D.recap_notices.forEach(r=>{if(r.sent)add(r.user_id,'recap',r.at,{game:r.game_id,read:r.opened})});
  D.follow_notices.forEach(f=>{if(f.status==='sent')add(f.user_id,'follow_game',f.at,{game:f.game_id,read:f.opened})});
  D.invites.forEach(i=>{add(i.to_user,'invite',i.created_at,{});const k={accepted:'invite_accepted',declined:'invite_declined',expired:'invite_expired'}[i.status];if(k&&i.decided_at)add(i.from_user,k,i.decided_at,{})});
  D.noshow_confirmed.forEach(n=>{if(n.confirmed)add(n.target_id,'noshow',n.at,{game:n.game_id})});
  out.sort((a,b)=>a.t0-b.t0);
  // ---- 2 路由（与前台、schema 注释 ①–⑧ 同一套）----
  const LATE=new Set(['recap','follow_game','invite_expired']),GO=new Set(['soon','game_cancelled','changed','postponed']),MAILK=new Set(['request','approved','rejected','full','expired','game_cancelled','changed','postponed','invite','invite_accepted']);
  const hr=t=>new Date(t).getHours(),at8=t=>{const d=new Date(t);if(d.getHours()>=22)d.setDate(d.getDate()+1);d.setHours(8,0,0,0);return +d};
  const lastReq={},deskPush=u=>b1h('nd'+u.id)<.22,mail=u=>b1h('em'+u.id)<.38;
  out.forEach(n=>{const u=U[n.uid];n.t=n.t0;n.extra=false;
    if(LATE.has(n.kind)&&(hr(n.t)>=22||hr(n.t)<8)){n.t=at8(n.t);n.night=true}
    if(n.kind==='request'){const k=n.uid+'|'+n.game;if(lastReq[k]!=null&&n.t-lastReq[k]<10*6e4){n.ch='none';n.why='merged';n.dev=u.mob>=.5?'mobile':'desktop';n.read=R()<.6;return}
      if(n.part.decided_at!=null&&n.part.decided_at-n.part.created_at<6e4){n.ch='none';n.why='stale';n.dev=u.mob>=.5?'mobile':'desktop';n.read=false;return}   // 推送前已处理：不推，也不占合并窗口
      lastReq[k]=n.t}
    if(n.t>=now){n.ch='pending';return}
    const d=D.dayOf(n.t),act=(D.actIdx[d]&&D.actIdx[d].has(n.uid))?.3:.02,h=hr(n.t),day=h>=7&&h<23;
    if(day&&R()<act){n.dev=R()<u.mob?'mobile':'desktop';n.ch='in_app';n.why='active_device';if(n.dev==='desktop'&&GO.has(n.kind)&&u.push)n.extra=true}
    else if(u.push&&u.mob>=.4){n.ch='push_mobile';n.dev='mobile';n.why=n.night?'deferred_night':'mobile_first'}
    else if(deskPush(u)){n.ch='push_desktop';n.dev='desktop';n.why=n.night?'deferred_night':'no_mobile_push';if(mail(u)&&MAILK.has(n.kind)&&R()<.55)n.mail=true}
    else if(mail(u)&&MAILK.has(n.kind)){n.ch='email';n.dev=u.mob>=.5?'mobile':'desktop';n.why='no_push'}
    else{n.ch='none';n.dev=u.mob>=.5?'mobile':'desktop';n.why='no_push'}
    if(n.read==null){const base={in_app:.86,push_mobile:.52,push_desktop:.36,email:.27,none:.44}[n.ch];n.read=R()<(n.kind==='soon'?Math.min(.95,base+.12):base)}});
  return c=out.filter(n=>n.ch!=='pending')}})();
// 提醒去了哪里（区间 + 设备筛选：按提醒最后到达的设备）
function notifCard(){const C=X3.ctx(),{dk}=MM().range,L=N3().filter(n=>n.t>=C.t0&&n.t<C.t1&&B3.ok(dk,n.dev));
  const by=k=>L.filter(n=>n.ch===k).length,N=L.length,sent=L.filter(n=>n.ch!=='none'),soon=L.filter(n=>n.kind==='soon'),go=L.filter(n=>n.extra).length;
  const ppl=new Set(L.map(n=>n.uid)).size,none=L.filter(n=>n.ch==='none'&&n.why==='no_push'),nonePpl=new Set(none.map(n=>n.uid)).size;
  const ins=[];if(N>=50&&by('none')/N>=.1)ins.push([`<b>${pct(by('none')/N)}</b> 的提醒只进了消息列表，主要是 <b>${fmt(nonePpl)}</b> 人没开推送也没留邮箱`,'可以在第一次申请成功后引导开启手机推送']);
  return `${sec('提醒')}<div class="grid g4">${kpi('发出的提醒',fmt(N),`${fmt(ppl)} 人收到`)}${kpi('点开',pct(X3.share(L.filter(n=>n.read).length,N)),'含之后在消息列表里看')}${kpi('开打前 30 分钟提醒',fmt(soon.length),'点开 '+pct(X3.share(soon.filter(n=>n.read).length,soon.length)))}${kpi('出发类同时推手机',fmt(go),'电脑上看到的同时')}</div>
  ${ins11(ins)}
  <div class="card sec"><div class="ch"><b>提醒去了哪里</b><small>${rangeTxt()} · 每条提醒的第一去向</small></div>${N?stack100([{n:'正在用的设备（页面里）',v:by('in_app')},{n:'推送到手机',v:by('push_mobile')},{n:'推送到电脑',v:by('push_desktop')},{n:'邮件',v:by('email')},{n:'只进消息列表',v:by('none')}]):'<p class="cap">这段时间没有提醒</p>'}
  ${N?`<p class="cap">夜间顺延到 8 点 ${pct(X3.share(L.filter(n=>n.why==='deferred_night').length,N))} · 送达前已处理 ${pct(X3.share(L.filter(n=>n.why==='stale').length,N))} · 同局申请合并 ${pct(X3.share(L.filter(n=>n.why==='merged').length,N))} · 推到电脑后 5 分钟未读补发邮件 ${fmt(L.filter(n=>n.mail).length)} 条</p>`:''}</div>`}
{const _pa3=pageAfter;pageAfter=function(){return _pa3()+notifCard()}}

