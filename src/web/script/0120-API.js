  // POST /api/blocks {user_id}   —— 对方待确认的申请自动婉拒（不通知“被屏蔽”）
  block(uid){ME.blocked.add(uid);PARTS.filter(p=>p.user_id===uid&&p.status==='pending'&&GAMES.find(g=>g.id===p.game_id).host_id===ME.id).forEach(p=>{p.status='rejected';p.reason='blocked'})},
  // DELETE /api/blocks/:user_id
  unblock(uid){ME.blocked.delete(uid)},
  // POST /api/games/:id/kudos   赛后一键点赞同场球友（可选）
  kudos(id){const c=api.get(id);c.appr.filter(p=>p.user_id!==ME.id).forEach(p=>U(p.user_id).base.kudos=(U(p.user_id).base.kudos||0)+1);GAMES.find(g=>g.id===id).kudosDone=true}
};
function ntfText(n){if(n.invite_id)return invText(n);if(n.kind==='series_hold'||n.kind==='approved_hold')return sxText(n);const c=V(GAMES.find(g=>g.id===n.game_id)),f=U(n.from)||{name:''},when=`${relDay(c.start)} ${hm(c.start)} · ${c.v.short}`;
  return {request:[`${f.name} ${etaOf(n)?'想加入':'申请加入你的球局'}`,`UTR ${f1(f.ntrp)} · ${when}${etaOf(n)}`],approved:[`${f.name} 接受了你的申请 🎾`,when],rejected:['这局没排上 🎾',`${rejText(n)} · 附近还有别的局 ›`],
    full:['这局已经满员啦',`${when} · 看看附近其他球局`],player_left:[`${f.name} 取消了参加`,`${when} · 名额已重新开放`],game_cancelled:[`${f.name} 取消了球局`,when],unfilled:c.spots<=0?['这局凑齐了 🎾',when]:+c.start+LATE_JOIN<=NOW?['这局没有凑齐',`${when} · 用同样的设置再发一局 ›`]:[`还缺 ${c.spots} 位，${ufLeft(c)}后开打`,`${when} · ${c.postponed?'再分享或放宽水平':'再分享、放宽水平或顺延 1 小时'} ›`],unfilled_end:['这局没有凑齐',`${when} · 用同样的设置再发一局 ›`],postponed:[`${f.name} 把球局顺延了 1 小时`,`${when} · 时间不合适可以退出`],changed:[`${f.name} 修改了球局`,`${(n.lines||['时间或地点有变化']).join('，')} · 还能来吗？ ›`]}[n.kind]}
function notify(uid,kind,game_id,from){const n={id:++NID,user_id:uid,kind,game_id,from,at:Date.now(),read:false,...(typeof NR_EXTRA!=='undefined'&&NR_EXTRA||{})};NOTIFS.unshift(n);nrDeliver(n)}
function deskNotify(title,body,onTap){if(document.hidden){if(PUSH.enabled&&'Notification'in window&&Notification.permission==='granted'){try{const n=new Notification(title,{body});n.onclick=()=>{window.focus();onTap&&onTap()}}catch(e){}}renderNav();return}const d=$('#dn');d.innerHTML=`<svg><use href="#logo"/></svg><div style="flex:1;min-width:0"><div class="h"><span>南伴球</span><span>现在</span></div><b>${esc(title)}</b><p>${esc(body)}</p></div>`;
  d.onclick=()=>{d.classList.remove('show');onTap&&onTap()};requestAnimationFrame(()=>d.classList.add('show'));clearTimeout(d._t);d._t=setTimeout(()=>d.classList.remove('show'),5500);
  renderNav()}

