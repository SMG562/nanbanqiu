/* =====================================================================
 * 真数据 · 风险用户（#27 第 4 步）：风险提醒（待处理 / 观察中 / 最近处理）+ 风险与频率规则。
 *   提醒来自每晚的 job_risk_scores；处理 = 观察 N 天 / 已处理 / 忽略 / 重新打开（POST /risk/handle，留痕）。要改账号状态：点球友打开详情抽屉（0300）。
 *   规则：运营以上能看；只有 owner 能改，必须填理由（库函数记改前改后）。提交后一律重读。
 * ===================================================================== */
const RK={view:'open',d:null,err:null,loading:false,busy:new Set(),gen:0,rules:null,rerr:null,edit:null};
const RK_SUG={watch:'观察',review:'待核实',limited:'受限',suspended:'暂停',banned:'封禁'};
const RK_ST={open:'待处理',watching:'观察中',handled:'已处理',ignored:'已忽略'};
async function rkLoad(){const g=++RK.gen;RK.loading=true;const r=await admApi('GET','/risk?view='+RK.view);if(g!==RK.gen)return;RK.loading=false;
  if(r.status===401)return toLogin('登录已过期，请重新登录');
  if(r.ok&&r.body&&Array.isArray(r.body.alerts)){RK.d=r.body;RK.err=null}else RK.err=r.status===403?'你的角色不能处理风险提醒':realErr(r);
  if(RL.me&&S.page==='safety')render()}
async function rkRules(){RK.rerr=null;const r=await admApi('GET','/rules');if(r.status===401)return toLogin('登录已过期，请重新登录');
  if(r.ok&&r.body&&Array.isArray(r.body.risk)&&Array.isArray(r.body.rate))RK.rules=r.body;else RK.rerr=realErr(r);if(RL.me&&S.page==='safety')render()}
async function rkAct(id,status,extra){if(RK.busy.has(id))return;RK.busy.add(id);render();
  const r=await admApi('POST','/risk/handle',{id:+id,status,...extra});RK.busy.delete(id);
  if(r.status===401)return toLogin('登录已过期，请重新登录');
  admToast(r.ok?{watching:'已转为观察',handled:'已处理',ignored:'已忽略',open:'已重新打开'}[status]:r.error==='state_changed'?'这条刚被别人处理过，已刷新':realErr(r));await rkLoad()}
const rkWin=s=>s%86400===0?s/86400+' 天':s%3600===0?s/3600+' 小时':Math.round(s/60)+' 分钟';
function rkRulesCard(){if(!RK.rules&&!RK.rerr)rkRules();
  if(!RK.rules)return `<div class="card"><div class="ch"><b>规则</b><small>${RK.rerr?esc(RK.rerr):'读取中…'}</small></div></div>`;
  const own=realCan('rules.edit'),e=RK.edit,num=(id,v,w)=>`<input class="search mono" id="${id}" value="${esc(String(v))}" style="width:${w||70}px" inputmode="decimal">`,on=(id,v)=>`<label><input type="checkbox" id="${id}"${v?' checked':''}> 开</label>`;
  const btn=(kind,k)=>own?`<button class="btn sm" data-rsk="edit" data-kind="${kind}" data-v="${esc(k)}">改</button>`:'';
  const risk=RK.rules.risk.map(x=>e&&e.kind==='risk'&&e.k===x.code?`<tr><td>${esc(x.name)}</td><td>${num('rkW',x.weight)}</td><td>${num('rkT',x.threshold)}</td><td>${num('rkD',x.window_days)} 天</td><td>${on('rkE',x.enabled)}</td><td>${rkSaveRow()}</td></tr>`
    :`<tr><td>${esc(x.name)}<br><small class="mono" style="color:var(--mut)">${esc(x.code)}</small></td><td>${x.weight}</td><td>${x.threshold}</td><td>${x.window_days} 天</td><td>${x.enabled?'开':'<span style="color:var(--mut)">关</span>'}</td><td>${btn('risk',x.code)}</td></tr>`).join('');
  const rate=RK.rules.rate.map(x=>e&&e.kind==='rate'&&e.k===x.rule?`<tr><td>${esc(x.note||x.rule)}</td><td>${num('rkM',x.max_hits)}</td><td>${x.day_reset?'每天 0 点清零':rkWin(x.win_s)}</td><td>${on('rkE',x.enabled)}</td><td>${rkSaveRow()}</td></tr>`
    :`<tr><td>${esc(x.note||x.rule)}<br><small class="mono" style="color:var(--mut)">${esc(x.rule)}</small></td><td>${x.max_hits}</td><td>${x.day_reset?'每天 0 点清零':rkWin(x.win_s)}</td><td>${x.enabled?'开':'<span style="color:var(--mut)">关</span>'}</td><td>${btn('rate',x.rule)}</td></tr>`).join('');
  return `<div class="card"><div class="ch"><b>风险规则</b><small>分数 = 各条命中规则的权重之和；每晚重算</small></div>
  <table><thead><tr><th>规则</th><th>权重</th><th>阈值</th><th>时间窗</th><th>开关</th><th></th></tr></thead><tbody>${risk}</tbody></table></div>
  <div class="card"><div class="ch"><b>频率限制</b><small>超过次数会被拦下并提示</small></div>
  <table><thead><tr><th>限制</th><th>最多次数</th><th>时间窗</th><th>开关</th><th></th></tr></thead><tbody>${rate}</tbody></table>
  <p class="cap">${own?'改规则要写理由，改前改后都记进操作日志。':'规则只有超级管理员能改。'}</p></div>`}
function rkSaveRow(){return `<input class="search" id="rkWhy" maxlength="200" placeholder="理由（必填）" style="width:150px"> <button class="btn sm p" data-rsk="save"${RK.edit&&RK.edit.busy?' disabled':''}>保存</button><button class="btn sm" data-rsk="unedit">取消</button>`}
async function rkSave(){const e=RK.edit;if(!e||e.busy)return;const v=id=>($('#'+id)||{}).value,why=(v('rkWhy')||'').trim(),en=!!($('#rkE')||{}).checked;
  if(why.length<4)return admToast(ADMIN_ERR.admin_reason_required);
  const patch=e.kind==='risk'?{weight:+v('rkW'),threshold:+v('rkT'),window_days:+v('rkD'),enabled:en}:{max_hits:+v('rkM'),enabled:en};
  if(Object.values(patch).some(x=>typeof x==='number'&&!Number.isFinite(x)))return admToast('请填数字');
  e.busy=true;const r=await admApi('POST','/rules/set',{kind:e.kind,rule:e.k,patch,reason:why});e.busy=false;
  if(r.status===401)return toLogin('登录已过期，请重新登录');
  if(!r.ok)return admToast(r.error==='invalid'?'数值不在允许范围内（权重 0–100、时间窗 1–365 天、次数至少 1）':realErr(r));
  admToast('已保存');RK.edit=null;RK.rules=null;rkRules()}
function realSafetyPage(){if(!RK.d&&!RK.loading&&!RK.err)rkLoad();
  const c=(RK.d&&RK.d.counts)||{},tab=(k,l)=>`<button class="btn sm${RK.view===k?' p':''}" data-rsk="view" data-v="${k}">${l}</button>`;
  const head=`<div class="ch"><b>风险提醒</b><small>每晚按规则重算；同一个人同一条规则只保留一条未处理的</small><button class="btn sm" data-rsk="reload" style="margin-left:auto">刷新</button></div>
  <div class="rowacts" style="margin:6px 0">${tab('open','待处理 '+(c.open||0))}${tab('watching','观察中 '+(c.watching||0))}${tab('done','最近处理')}</div>`;
  let body;
  if(RK.err&&!RK.d)body=`<p class="cap" style="color:var(--crit)">${esc(RK.err)} <button class="btn sm" data-rsk="reload">重试</button></p>`;
  else if(!RK.d)body='<p class="cap">读取中…</p>';
  else if(!RK.d.alerts.length)body=`<div class="empty">${RK.view==='open'?'没有待处理的风险提醒 ✓':RK.view==='watching'?'没有在观察的人':'还没有处理过的提醒'}</div>`;
  else body=`<table><thead><tr><th>球友</th><th>规则</th><th>分数</th><th>建议</th><th>触发</th><th>状态</th><th></th></tr></thead><tbody>${RK.d.alerts.map(a=>{const b=RK.busy.has(a.id)?' disabled':'',id=esc(a.id);
    const acts=a.status==='open'?`<button class="btn sm" data-rsk="watch" data-id="${id}"${b}>观察 7 天</button><button class="btn sm p" data-rsk="handled" data-id="${id}"${b}>已处理</button><button class="btn sm" data-rsk="ignored" data-id="${id}"${b}>忽略</button>`
      :a.status==='watching'?`<button class="btn sm p" data-rsk="handled" data-id="${id}"${b}>已处理</button><button class="btn sm" data-rsk="ignored" data-id="${id}"${b}>忽略</button>`:`<button class="btn sm" data-rsk="open" data-id="${id}"${b}>重新打开</button>`;
    return `<tr><td><button class="lnk" data-rsk="user" data-v="${a.member_no}">#${String(a.member_no).padStart(4,'0')} ${esc(a.nickname)}</button>${a.user_status!=='active'?`<br><small style="color:var(--mut)">现在：${esc(UST[a.user_status]?UST[a.user_status][0]:a.user_status)}</small>`:''}</td>
    <td>${esc(a.rule_name)}<br><small style="color:var(--mut)">近 ${Math.max(1,Math.round((new Date(a.window_to)-new Date(a.window_from))/864e5))} 天内 ${a.value} 次</small></td><td class="mono">${a.score}</td><td>${esc(RK_SUG[a.suggested]||'—')}</td><td>${esc(rpAgo(a.created_at))}</td>
    <td>${esc(RK_ST[a.status]||a.status)}${a.status==='watching'&&a.watch_until?`<br><small style="color:var(--mut)">到 ${upDate(a.watch_until)}</small>`:''}${a.reviewed_by_name?`<br><small style="color:var(--mut)">${esc(a.reviewed_by_name)}${a.note?' · '+esc(a.note):''}</small>`:''}</td>
    <td><div class="rowacts">${acts}</div></td></tr>`}).join('')}</tbody></table>`;
  return `<div class="card">${head}${RK.err&&RK.d?`<p class="cap" style="color:var(--crit)">${esc(RK.err)}（下面是上次读到的）</p>`:''}${body}
  <p class="cap">要暂停、受限或封禁：点球友名字打开详情处理，再回来把提醒标成「已处理」。爽约申诉还没有后台处理函数，需要先加数据库迁移（另开 Issue）。</p></div>${rkRulesCard()}`}
if(NBQ_MODE==='real'){REAL_PAGES.safety=()=>realSafetyPage();REAL_RESET.push(()=>{Object.assign(RK,{view:'open',d:null,err:null,loading:false,rules:null,rerr:null,edit:null});RK.busy.clear();RK.gen++});
  document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-rsk]');if(!b||b.disabled)return;const k=b.dataset.rsk,id=b.dataset.id;
    if(k==='view'){RK.view=b.dataset.v;RK.d=null;RK.err=null;render();return rkLoad()}
    if(k==='reload'){RK.err=null;RK.d=null;render();return rkLoad()}
    if(k==='user')return rudOpen(+b.dataset.v);
    if(k==='watch')return rkAct(id,'watching',{watch_days:7});
    if(k==='handled'||k==='ignored'||k==='open')return rkAct(id,k);
    if(k==='edit'){RK.edit={kind:b.dataset.kind,k:b.dataset.v};return render()}
    if(k==='unedit'){RK.edit=null;return render()}
    if(k==='save')return rkSave()})}
