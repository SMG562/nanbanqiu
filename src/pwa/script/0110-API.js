  // POST /api/blocks
  block(uid){ME.blocked.add(uid);PARTS.filter(p=>p.user_id===uid&&p.status==='pending'&&GAMES.find(g=>g.id===p.game_id).host_id===ME.id).forEach(p=>{p.status='rejected';p.reason='blocked'})},
  unblock(uid){ME.blocked.delete(uid)},
  // POST /api/games/:id/kudos
  kudos(id){const c=api.get(id);c.appr.filter(p=>p.user_id!==ME.id).forEach(p=>U(p.user_id).base.kudos=(U(p.user_id).base.kudos||0)+1);GAMES.find(g=>g.id===id).kudosDone=true}
};
function ntfText(n){if(n.invite_id)return invText(n);if(n.kind==='series_hold'||n.kind==='approved_hold')return sxText(n);const c=V(GAMES.find(g=>g.id===n.game_id)),f=U(n.from)||{name:''},when=`${relDay(c.start)} ${hm(c.start)} · ${c.v.short}`;
  return {request:[`${f.name} 申请加入你的球局`,`UTR ${f1(f.ntrp)} · ${when}`],approved:[`${f.name} 接受了你的申请 🎾`,when],rejected:['这局没排上 🎾',`${rejText(n)} · 附近还有别的局 ›`],
    full:['这局已经满员啦',`${when} · 看看附近其他球局`],player_left:[`${f.name} 取消了参加`,`${when} · 名额已重新开放`],game_cancelled:[`${f.name} 取消了球局`,when],unfilled:c.spots<=0?['这局凑齐了 🎾',when]:c.start<=NOW?['这局没有凑齐',`${when} · 用同样的设置再发一局 ›`]:[`还缺 ${c.spots} 位，${ufLeft(c)}后开打`,`${when} · ${c.postponed?'再分享或放宽水平':'再分享、放宽水平或顺延 1 小时'} ›`],unfilled_end:['这局没有凑齐',`${when} · 用同样的设置再发一局 ›`],postponed:[`${f.name} 把球局顺延了 1 小时`,`${when} · 时间不合适可以退出`],changed:[`${f.name} 修改了球局`,`${(n.lines||['时间或地点有变化']).join('，')} · 还能来吗？ ›`]}[n.kind]}
function notify(uid,kind,game_id,from){const n={id:++NID,user_id:uid,kind,game_id,from,at:Date.now(),read:false,...(typeof NR_EXTRA!=='undefined'&&NR_EXTRA||{})};NOTIFS.unshift(n);nrDeliver(n)}
// 点通知去哪：有人申请 → 球局详情并定位到 TA 的申请；没排上 → 当天附近别的局；其余 → 球局详情
function ntfOpen(n){n.read=true;renderBadge&&renderBadge();
  if(['unfilled','unfilled_end'].includes(n.kind)){openUnfilled(n.game_id);return}
  if(n.kind==='rejected'){const g=GAMES.find(g=>g.id===n.game_id);closeDetail&&UI.detail&&closeDetail();if(g){const o=dOff(new Date(g.starts_at));if(o>=0&&o<7)UI.day=o}UI.mode='cal';go('disc');return}
  openDetail(n.game_id);if(n.kind==='request'&&n.from)focusApplicant(n.from)}
document.addEventListener('click',e=>{const x=e.target.closest('[data-ntfo]');if(!x||e.target.closest('button,[data-sx],[data-a],[data-user]'))return;e.stopPropagation();const n=NOTIFS.find(n=>String(n.id)===x.dataset.ntfo);if(n)ntfOpen(n)},true);
function focusApplicant(uid){setTimeout(()=>{const b=document.querySelector(`#dBody [data-sx="softNo"][data-u="${uid}"],#dBody [data-a="approve"][data-u="${uid}"]`);if(!b)return;
  let card=b.parentElement;while(card&&card.parentElement&&card.parentElement.id!=='dBody'&&!card.matches('.req,.ap,.appl,.card'))card=card.parentElement;
  (card||b).scrollIntoView({behavior:'smooth',block:'center'});(card||b).classList.add('flash');setTimeout(()=>(card||b).classList.remove('flash'),1600)},380)}
function pushBanner(title,body,onTap){const bn=$('#banner');
  bn.innerHTML=`<svg class="ai"><use href="#logo"/></svg><div class="bt"><div><span>南伴球</span><span>现在</span></div><b>${esc(title)}</b><p>${esc(body)}</p></div>`;
  bn.onclick=()=>{bn.classList.remove('show');onTap&&onTap()};setTimeout(()=>bn.classList.add('show'),60);clearTimeout(bn._t);bn._t=setTimeout(()=>bn.classList.remove('show'),5200);
  renderBadge()}

