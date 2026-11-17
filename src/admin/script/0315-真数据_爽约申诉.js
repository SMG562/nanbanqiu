/* =====================================================================
 * 真数据 · 风险用户页的「爽约申诉」（#195 ②）。接在风险提醒前面（申诉有时效，先处理）。
 *   一行 = 一条申诉：球局（时间、球场、发起人）、申诉人、理由、证据（谁反馈的、发起人有没有直接标未到、近 90 天其他确认爽约）。
 *   处理：申诉成立（这次不计）/ 不成立（重新计入），备注可选；提交后重读。处理结果暂不通知本人（要新的通知类型，见 #195）。
 * ===================================================================== */
const AP={view:'pending',list:null,err:null,loading:false,busy:new Set(),gen:0};
const AP_RS={came:'我到场了',told:'提前说过不来了',other:'其他原因'};
async function apLoad(){const g=++AP.gen;AP.loading=true;const r=await admApi('GET','/appeals?view='+AP.view);if(g!==AP.gen)return;AP.loading=false;
  if(r.status===401)return toLogin('登录已过期，请重新登录');
  if(r.ok&&r.body&&Array.isArray(r.body.appeals)){AP.list=r.body.appeals;AP.err=null}else AP.err=r.status===403?'你的角色不能处理申诉':realErr(r);
  if(RL.me&&S.page==='safety')render()}
async function apAct(x,status,note){const k=x.share_code+'#'+x.member_no;if(AP.busy.has(k))return;AP.busy.add(k);render();
  const r=await admApi('POST','/appeals/handle',{game:x.share_code,no:x.member_no,status,note:note||undefined});AP.busy.delete(k);
  if(r.status===401)return toLogin('登录已过期，请重新登录');
  admToast(r.ok?(status==='upheld'?'已判申诉成立：这次不计爽约':'已判申诉不成立：重新计入'):r.error==='state_changed'?'这条刚被别人处理过，已刷新':realErr(r));await apLoad()}
function apCard(){if(!realCan('report.handle'))return '';if(!AP.list&&!AP.err&&!AP.loading)apLoad();
  const tab=(k,l)=>`<button class="btn sm${AP.view===k?' p':''}" data-ap="view" data-v="${k}">${l}</button>`;
  const head=`<div class="ch"><b>爽约申诉</b><small>申诉期间这次爽约不计入等级和赴约率</small><button class="btn sm" data-ap="reload" style="margin-left:auto">刷新</button></div><div class="rowacts" style="margin:6px 0">${tab('pending','待处理'+(AP.view==='pending'&&AP.list?' '+AP.list.length:''))}${tab('done','最近处理')}</div>`;
  if(!AP.list)return `<div class="card">${head}<p class="cap">${AP.err?esc(AP.err)+' <button class="btn sm" data-ap="reload">重试</button>':'读取中…'}</p></div>`;
  const row=(x,i)=>{const b=AP.busy.has(x.share_code+'#'+x.member_no)?' disabled':'';
    const ev=[x.host_marked?'发起人在出勤里标了「未到」':'',x.reporters.length?`反馈人：${x.reporters.map(r=>esc(r.name)+(r.is_host?'（发起人）':'')).join('、')}`:'',x.other_noshows_90d?`<span style="color:var(--crit)">近 90 天另有 ${x.other_noshows_90d} 次确认爽约</span>`:'近 90 天没有其他爽约'].filter(Boolean).join('<br>');
    return `<tr><td><button class="lnk" data-rsk="user" data-v="${x.member_no}">#${String(x.member_no).padStart(4,'0')} ${esc(x.nickname)}</button><br><small style="color:var(--mut)">${esc(rpAgo(x.created_at))}申诉</small></td>
    <td>${esc(new Date(x.starts_at).toLocaleString('zh-CN',{month:'numeric',day:'numeric',weekday:'short',hour:'2-digit',minute:'2-digit'}))}<br><small style="color:var(--mut)">${esc(x.venue||'—')} · ${esc(x.host||'—')} 发起 · <span class="mono">${esc(x.share_code)}</span></small></td>
    <td>${esc(AP_RS[x.reason]||x.reason)}</td><td><small>${ev}</small></td>
    <td>${x.status==='pending'?`<div class="rowacts"><button class="btn sm p" data-ap="up" data-i="${i}"${b}>申诉成立</button><button class="btn sm" data-ap="no" data-i="${i}"${b}>不成立</button></div>`
      :`${x.status==='upheld'?'<span class="pill g">成立</span>':'<span class="pill">不成立</span>'}<br><small style="color:var(--mut)">${esc(x.decided_by_name||'')}${x.admin_note?' · '+esc(x.admin_note):''}</small>`}</td></tr>`};
  return `<div class="card">${head}${AP.err?`<p class="cap" style="color:var(--crit)">${esc(AP.err)}（下面是上次读到的）</p>`:''}
  ${AP.list.length?`<table><thead><tr><th>申诉人</th><th>球局</th><th>理由</th><th>证据</th><th></th></tr></thead><tbody>${AP.list.map(row).join('')}</tbody></table>`:`<div class="empty">${AP.view==='pending'?'没有待处理的申诉 ✓':'还没有处理过的申诉'}</div>`}
  <p class="cap">成立 = 这次不计爽约；不成立 = 重新计入。处理结果目前不会自动通知本人。</p></div>`}
if(NBQ_MODE==='real'){const _sf=REAL_PAGES.safety;REAL_PAGES.safety=()=>apCard()+_sf();
  REAL_RESET.push(()=>{Object.assign(AP,{view:'pending',list:null,err:null,loading:false});AP.busy.clear();AP.gen++});
  document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-ap]');if(!b||b.disabled)return;const k=b.dataset.ap;
    if(k==='view'){AP.view=b.dataset.v;AP.list=null;render();return apLoad()}
    if(k==='reload'){AP.list=null;AP.err=null;render();return apLoad()}
    const x=AP.list&&AP.list[+b.dataset.i];if(!x)return;
    if(k==='up'||k==='no'){const note=prompt(k==='up'?'申诉成立：备注（可不填，比如「聊天记录显示到了」）':'申诉不成立：备注（可不填）','');if(note===null)return;apAct(x,k==='up'?'upheld':'rejected',note.trim().slice(0,200))}})}
