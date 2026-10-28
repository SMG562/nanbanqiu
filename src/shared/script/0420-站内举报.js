/* =====================================================================
 * 站内举报（第二批第 2 轮）：球员卡 → 举报这个人；聊天 → 私信举报对方、球局聊天举报这局的聊天
 * 原因（与 schema reports.reason 一致）：pact_violation 违反球友约定 · harass 骚扰或不当言行 · no_show 爽约 · fake_profile 冒用身份 · other 其他
 * 点原因即提交；补充说明选填（≤200 字）；不告诉对方是谁举报的；同一个人对同一对象未处理时不重复记录。
 * 邮件 safety@nanbanqiu.app 保留（安全须知、联系我们），后台录入的邮件举报 source=email，站内 source=in_app。
 * ===================================================================== */
const REP_REASONS=[['pact_violation','违反球友约定','不尊重人、越界、费用没说清'],['harass','骚扰或不当言行','让人不舒服的消息或举动'],
  ['no_show','爽约','说好来却没来，也没提前说'],['fake_profile','冒用身份','资料不实，或冒用别人'],['other','其他','写在上面的补充说明里']];
var REPORTS=[];let REPCUR=null;
const repOpenOf=(type,id)=>ME&&REPORTS.find(r=>r.reporter_id===ME.id&&r.target_type===type&&r.target_id===id&&r.status==='open');
function repOpen(type,id,via,ctx){if(!ME)return;
  if(repOpenOf(type,id)){toast('你已经举报过，我们正在处理');return}
  REPCUR={type,id,via,ctx:ctx||null};const who=type==='user'?(U(id)||{}).name:'';
  UF_OPEN(`<div class="softno rep"><div class="sn-h">${type==='user'?'举报 '+esc(who||''):'举报这局的聊天'}</div>
    <p class="sn-p">不会告诉对方是谁举报的，我们会在 24 小时内处理。</p>
    <input class="sn-note" id="repNote" maxlength="200" placeholder="补充说明（选填）">
    <div class="sn-list">${REP_REASONS.map(([k,a,b])=>`<button data-rp="${k}"><b>${a}</b><small>${b}</small></button>`).join('')}</div></div>`)}
function repSubmit(reason){const c=REPCUR;if(!c||!ME)return;const el=document.getElementById('repNote'),note=(el&&el.value||'').trim().slice(0,200);
  if(reason==='other'&&!note){if(el){el.focus();el.placeholder='请简单说一下发生了什么'}return}
  REPORTS.unshift({id:'r'+Date.now().toString(36)+REPORTS.length,reporter_id:ME.id,target_type:c.type,target_id:c.id,reason,note:note||null,via:c.via,ctx:c.ctx,source:'in_app',status:'open',created_at:Date.now()});
  track('report_submit',{target_type:c.type,reason,has_note:!!note,via:c.via});REPCUR=null;UF_CLOSE();toast('已收到，我们会在 24 小时内处理')}
// 入口：球员卡「举报」（原来打开邮件）、聊天底部「举报」（原来只弹提示）
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-a="report"][data-u],[data-cx="report"],[data-rp]');if(!b)return;
  e.stopPropagation();e.preventDefault();
  if(b.dataset.rp){repSubmit(b.dataset.rp);return}
  if(b.dataset.a==='report'){const uid=b.dataset.u;const go=()=>repOpen('user',uid,'card');if(ME)go();else openAuth(go,'举报前，先用手机号验证一下');return}
  const t=typeof CXCUR!=='undefined'&&CXCUR&&THREADS.find(x=>x.id===CXCUR);if(!t)return;
  if(t.type==='dm')repOpen('user',cxOther(t),'chat',t.id);else repOpen('game',t.game_id||t.id,'chat',t.id)},true);


