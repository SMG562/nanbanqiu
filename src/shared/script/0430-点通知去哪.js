/* =====================================================================
 * 点通知去哪（v3，两端同一套）：每一条点开都要有去处，并且看得到是哪一局
 *   没排上 / 申请自动失效 / 满员自动结束 → 那场球局的详情（顶部写原因；底部「看看附近其他球局」→ 同一天的发现页）
 *   账号状态 → 我的页；账号当前不是正常状态时，再打开状态说明
 *   开打前 30 分钟 → 出发卡片；球局已取消 / 已结束 / 我已不在这局 → 球局详情
 *   球局已不存在 → 提示，不跳转
 * 其余种类沿用 nrOpen 原来的去处（申请 → 定位到申请人；还缺人 → 还缺人卡片；赛后 → 赛后卡片；徽章 / 等级 → 庆祝页；邀约 → 邀约卡片）
 * ===================================================================== */
function acctGo(){if(NR_PLAT==='mobile'){closeSheet();if(UI.detail)closeDetail();go('me')}
  else{$('#pop')&&$('#pop').classList.remove('show');try{closeModal()}catch(_){}if(UI.landing){UI.landing=null;history.replaceState(null,'','#/')}UI.tab='mine';UI.sel=null;render()}
  const s=acctSt(ME);if(ME&&s!=='active')setTimeout(()=>acctBlock(s,'info'),250)}
{const _o=nrOpen;nrOpen=function(n){if(!n)return;const k=n.kind,done=()=>{if(!nrTodo(n))n.read=true;nrBadge()};
  if(k==='account_status'){done();acctGo();return}
  if(n.game_id&&!n.invite_id&&k!=='request_group'&&!GAMES.some(g=>g.id===n.game_id)){done();toast('这场球局已不存在');return}
  if(k==='rejected'||k==='expired'||k==='full'){done();if(NR_PLAT==='mobile')closeSheet();nrToGame(n.game_id,null);return}
  if(k==='soon'){const c=api.get(n.game_id);if(!c||c.status==='cancelled'||Date.now()>=+c.end||!(c.isHost||c.mine==='approved')){done();if(NR_PLAT==='mobile')closeSheet();nrToGame(n.game_id,null);return}}
  return _o.apply(this,arguments)};if(NR_PLAT==='mobile')ntfOpen=nrOpen}
// 文案：这几种点开是球局详情，所以写清是哪一局
{const _t=ntfText;ntfText=function(n){const r=_t.apply(this,arguments);if(!['rejected','expired','full'].includes(n.kind)||n.invite_id)return r;
  const g=GAMES.find(x=>x.id===n.game_id);if(!g)return r;const c=V(g),when=`${relDay(c.start)} ${hm(c.start)} · ${c.v.short}`;
  if(n.kind==='rejected'){const why=String(rejText(n)).replace(/\s*🎾/g,'').replace(/^这次没排上，/,'');return ['这局没排上 🎾',`${when}${why?' · '+why:''} ›`]}
  if(n.kind==='expired'){const f=U(n.from)||{name:'发起人'};return [`${f.name} 没来得及确认你的申请`,`${when} · 这次没约上 · 看看附近其他局 ›`]}
  return ['这局已经满员啦',`${when} ›`]}}
// 球局详情里的「看看附近其他球局」：去这局所在那天的发现页（没排上 / 满员 / 已取消时更有用）
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-a="explore"]');if(!b)return;const gid=NR_PLAT==='mobile'?UI.detail:UI.sel;
  if(!gid||!GAMES.some(g=>g.id===gid))return;e.stopPropagation();e.preventDefault();if(NR_PLAT==='mobile')closeSheet();else try{closeModal()}catch(_){}nrToDay(gid)},true);

