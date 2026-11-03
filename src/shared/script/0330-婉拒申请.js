/* ===================== 婉拒申请：和婉拒邀约同一套做法 =====================
 * 三句真实、不评价人的理由（说的是这一局，不是对方）+ 可选一句自己的话；对方只看到这句话。
 * 系统自动结束的申请用中性的说法：满员 →「这局已经满员啦」；超时 →「发起人没来得及确认」；屏蔽 → 不通知。 */
SOFTNO.splice(0,SOFTNO.length,
  ['known','这局想和熟悉的球友打','这局想和熟悉的球友一起打，下次一起 🎾'],
  ['level','想找水平更接近的','这局想找水平更接近一些的，下次合适的局再一起'],
  ['pass','这次先不了','谢谢你的申请，这次先不了']);
const SOFTNO_OLD={full:'known',friends:'known',next:'pass'};
softNoHTML=function(g,uid){const u=U(uid);
  return `<div class="softno"><div class="sn-h">婉拒 ${esc(u.name.split(' ')[0])} 的申请</div>
    <input class="sn-note" id="snNote" maxlength="30" placeholder="想对 TA 说一句？（可选）">
    <div class="sn-list">${SOFTNO.map(([k,a,b])=>`<button data-sx="softNoGo" data-g="${g}" data-u="${uid}" data-v="${k}"><b>${a}</b><small>TA 会看到：「${b}」</small></button>`).join('')}</div></div>`};
rejText=function(n){const p=PARTS.find(p=>p.game_id===n.game_id&&p.user_id===n.user_id),k=p&&(SOFTNO_OLD[p.reason]||p.reason),x=SOFTNO.find(x=>x[0]===k);
  const g=GAMES.find(g=>g.id===n.game_id),host=g?U(g.host_id):null;
  return (x?x[2]:'这次没排上，下次一起打 🎾')+(p&&p.note?` · ${host?host.name.split(' ')[0]:'发起人'}：「${p.note}」`:'')};
// 申请人在球局详情里看到的：发起人选的那句话
const _rqPass=passHTML0;passHTML0=function(c){let h=_rqPass(c);const p=c.mineP;
  if(p&&!c.isHost&&p.status==='rejected'&&p.reason==='full_auto')h=h.replace('这局没排上 · 看看附近其他球局吧','这局已经满员啦 · 看看附近其他球局');
  if(p&&!c.isHost&&p.status==='rejected'&&SOFTNO.some(x=>x[0]===(SOFTNO_OLD[p.reason]||p.reason)))h=h.replace('这局没排上 · 看看附近其他球局吧',esc(rejText({game_id:c.id,user_id:ME.id})));
  return h};

