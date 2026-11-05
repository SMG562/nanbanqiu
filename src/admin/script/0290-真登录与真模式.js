/* =====================================================================
 * 真登录与真模式外壳（#27 PR-B1）。必须是 admin.list 的最后一个脚本：下面三处包住 render / drawNav / logout，要在所有前面的包装之外。
 *   模式只在 page 里的一处判定（data-mode）：默认「真」；本机文件（file:）和预览站根域名才是「演示」。
 *   真模式的铁律：不显示任何模拟数字。做法是「默认拒绝」——只有登记在 REAL_PAGES 里的页面才画；其余一律画占位，
 *   新加的页面不用记得去标，天然是占位。导航角标（待审核数、风险数）也来自模拟数据，真模式下不画。
 *   登录：邮箱 + 密码 + 验证码（或恢复码）→ POST /admin/api/login；令牌只在 httpOnly Cookie 里，这里拿不到也不存任何凭证。
 * ===================================================================== */
const NBQ_MODE=document.documentElement.getAttribute('data-mode')==='demo'?'demo':'real';
const RL={me:null,busy:false,recovery:false,touchAt:0};
const REAL_PAGES={account:()=>realAccountPage(),review:()=>realReviewPage()};
const REAL_NOTE={review:'待审核。',safety:'爽约申诉、风险用户在 #27 后面的步骤。'};
if(NBQ_MODE==='real'){PAGES.unshift(['h','账号'],['account','我的账号']);TITLES.account='我的账号';IC.account='<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>'}

// ---------- 接口 ----------
// 返回 {ok,status,body,error,retry}；网络不通 / 超时 status=0。带自定义头 X-NBQ-Admin（服务端的防跨站请求要求），Origin 由浏览器自己带
async function admApi(method,path,body){
  const init={method,credentials:'same-origin',headers:{'X-NBQ-Admin':'1'}};
  if(body!==undefined){init.headers['Content-Type']='application/json';init.body=JSON.stringify(body)}
  const ac=new AbortController(),tm=setTimeout(()=>ac.abort(),15000);init.signal=ac.signal;
  try{const r=await fetch('/admin/api'+path,init);let j=null;try{j=await r.json()}catch(_){}
    return {ok:r.ok,status:r.status,body:j,error:(j&&j.error)||null,retry:(j&&j.retry_after)||null}}
  catch(_){return {ok:false,status:0,body:null,error:'network',retry:null}}
  finally{clearTimeout(tm)}}
// 错误 → 给人看的话。服务不可用 / 网络不通不能说成「密码不对」
function realErr(r){const e=r.error;
  if(r.status===0)return '网络不通，检查网络后再试';
  if(e==='admin_locked'||e==='rate_limited'){const m=r.retry?Math.max(1,Math.ceil(r.retry/60)):15;return `输错次数太多，请 ${m} 分钟后再试`}
  if(e==='db_unavailable'||r.status===503)return '服务暂时不可用，请稍后再试（不是密码的问题）';
  if(r.status===404)return '这个网址没有开通后台';
  if(e==='csrf')return '请求被拒绝，请刷新页面后再试';
  if(e==='invalid')return '请检查填写的内容';
  if(r.status===413||r.status===415||e==='bad_json')return '请求格式不对，请刷新页面后再试';
  if(ADMIN_ERR[e])return ADMIN_ERR[e];
  return `出错了，请稍后再试（${e||r.status}）`}

// ---------- 登录页 ----------
const lgErr=m=>{const p=$('#lgErr');p.textContent=m||'';p.hidden=!m};
const lgBusy=b=>{RL.busy=b;const g=document.querySelector('#login .go');g.disabled=b;g.textContent=b?'登录中…':'登录'};
function lgRecoveryUI(){const c=$('#lgCode');$('#lgCodeLab').textContent=RL.recovery?'恢复码（xxxx-xxxx，用过即作废）':'两步验证码（6 位数字）';
  $('#lgAlt').textContent=RL.recovery?'改用验证码':'没有手机？改用恢复码';c.inputMode=RL.recovery?'text':'numeric';c.autocomplete=RL.recovery?'off':'one-time-code';c.maxLength=RL.recovery?32:6}
function onLogin(e){e.preventDefault();if(NBQ_MODE==='demo')return doLogin(e);realLogin();return false}
async function realLogin(){
  if(RL.busy)return;                                                       // 防连点：验证码同一个 30 秒只能用一次，第二次必然失败
  const email=$('#lgEmail').value.trim(),pw=$('#lgPw').value,code=$('#lgCode').value.trim();
  if(!email||!pw||!code)return lgErr('请填写邮箱、密码和'+(RL.recovery?'恢复码':'验证码'));
  if(!RL.recovery&&!/^\d{6}$/.test(code))return lgErr('验证码是 6 位数字');
  lgErr('');lgBusy(true);
  const r=await admApi('POST','/login',RL.recovery?{email,password:pw,recovery:code}:{email,password:pw,code});
  $('#lgPw').value='';$('#lgCode').value='';                               // 不管成败都清掉密码和验证码
  if(!r.ok){lgBusy(false);lgErr(realErr(r));$('#lgPw').focus();return}
  const m=await admApi('GET','/me');lgBusy(false);
  if(!meOk(m)){lgErr(m.ok?'服务返回的内容不对，请稍后再试':realErr(m));return}
  $('#lgEmail').value='';enterApp(m.body)}
document.getElementById('lgAlt').addEventListener('click',()=>{RL.recovery=!RL.recovery;lgRecoveryUI();$('#lgCode').value='';lgErr('');$('#lgCode').focus()});

// ---------- 进入 / 离开后台 ----------
// /me 必须是带 role 的 JSON 才算登录成功（200 但内容不对 = 前面有什么东西截了请求，当错误处理，不能崩）
const meOk=r=>!!(r&&r.ok&&r.body&&typeof r.body==='object'&&typeof r.body.role==='string');
const realRole=r=>['owner','operator','viewer'].includes(r)?r:'viewer';       // 不认识的角色按最小权限
function realPaintMe(){const m=RL.me,nm=String(m.name||'').trim()||'管理员',box=document.querySelector('.side .me');
  box.querySelector('.av').textContent=[...nm][0]||'?';box.querySelector('b').textContent=nm;box.querySelector('small').textContent=ROLE_NAME[S.role]||S.role}
function enterApp(me){RL.me=me;S.role=realRole(me.role);RL.touchAt=Date.now();
  document.documentElement.removeAttribute('data-boot');$('#login').style.display='none';$('#app').style.display='block';
  realPaintMe();S.page='account';render()}
function toLogin(msg){RP.list=null;RP.err=null;RP.loadedAt=0;RP.busy.clear();RL.me=null;RL.busy=false;RL.recovery=false;
  document.documentElement.removeAttribute('data-boot');
  $('#app').style.display='none';$('#page').innerHTML='';$('#nav').innerHTML='';$('#drw').innerHTML='';   // 退出后页面上不留上一位管理员的内容
  $('#login').style.display='grid';for(const i of ['#lgEmail','#lgPw','#lgCode'])$(i).value='';
  lgBusy(false);lgRecoveryUI();lgErr(msg||'')}
// 离开页面一段时间 / 切换页面时确认会话还在（服务端闲置 1 小时作废）；顺便刷新权限
async function realTouch(){if(!RL.me||Date.now()-RL.touchAt<20000)return;RL.touchAt=Date.now();
  const r=await admApi('GET','/me');if(!RL.me)return;
  if(r.status===401)return toLogin('登录已过期，请重新登录');
  if(meOk(r)){RL.me=r.body;S.role=realRole(r.body.role);realPaintMe();render()}}
if(NBQ_MODE==='real'){
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)realTouch()});
  document.addEventListener('click',e=>{if(e.target.closest&&e.target.closest('[data-pg]'))realTouch()},true);
}

// ---------- 页面 ----------
function realPlaceholder(k){return `<div class="card nodata"><h2>${esc(TITLES[k]||'这一页')}：还没接真数据</h2><p>这一页现在不显示任何数字，免得把演示数据当成真的。${esc(REAL_NOTE[k]||'接入计划见 Issue #27。')}</p></div>`}
function realAccountPage(){const m=RL.me,perms=Array.isArray(m.perms)?m.perms:[],nm=String(m.name||'').trim()||'管理员';
  return `<div class="grid g12"><div class="card"><div class="acct-top"><span class="av">${esc([...nm][0]||'?')}</span><div><b>${esc(nm)}</b><br><span class="pill nodot">${esc(ROLE_NAME[S.role]||S.role)}</span></div></div>
  <p class="cap" style="margin:0 0 14px">登录有效期 12 小时，闲置 1 小时要重新登录。所有操作都会记录在操作日志。</p>
  <div class="ch"><b>你能做的事</b><small>共 ${perms.length} 项 · ✎ = 必须填理由</small></div>
  <table><tbody>${perms.map(p=>`<tr><td>${esc(p.label)}${p.need_reason?' <span title="必须填理由">✎</span>':''}</td><td class="r mono"><small>${esc(p.action)}</small></td></tr>`).join('')}</tbody></table></div></div>`}


// ---------- 待审核 → 举报（#27 第 2 步，真数据）----------
// 列表来自 GET /reports（处理中的全部 + 最近处理的 30 条）；处理 / 忽略 POST /reports/handle；查看对话 POST /reports/messages（必须填理由，服务端留痕）。
// 球场审核、场边举报还在后面的步骤，这一页只放举报，页脚如实写明。刚处理完立即重读，不在本地改状态（刷新后还在 = 以服务器为准）。
const RP={list:null,err:null,loading:false,loadedAt:0,busy:new Set()};
const RP_TYPE={user:'用户',game:'球局'};
function rpAgo(t){const m=Math.max(0,Math.round((Date.now()-new Date(t))/6e4));return m<1?'刚刚':m<60?m+' 分钟前':m<1440?Math.round(m/60)+' 小时前':m<2880?'昨天':Math.round(m/1440)+' 天前'}
function rpSrc(r){return r.source==='email'?'邮件录入':r.via==='chat'?'站内 · 聊天':'站内 · 球员卡'}
async function rpLoad(){if(RP.loading)return;RP.loading=true;
  const r=await admApi('GET','/reports');RP.loading=false;RP.loadedAt=Date.now();
  if(r.status===401){RP.list=null;return toLogin('登录已过期，请重新登录')}
  if(r.ok&&r.body&&Array.isArray(r.body.reports)){RP.list=r.body.reports;RP.err=null}
  else RP.err=r.status===403?'你的角色不能处理举报':r.ok?'服务返回的内容不对，请稍后再试':realErr(r);
  if(RL.me&&S.page==='review')render()}
async function rpAct(id,action){if(RP.busy.has(id))return;RP.busy.add(id);render();
  const r=await admApi('POST','/reports/handle',{id,action});RP.busy.delete(id);
  if(r.status===401)return toLogin('登录已过期，请重新登录');
  admToast(r.ok?(action==='actioned'?'已处理':'已忽略'):r.error==='state_changed'?'这条刚被别人处理过，已刷新':realErr(r));
  await rpLoad();if(RL.me&&S.page==='review')render()}
function rpMsgs(id){admAskReason('查看被举报的对话',async reason=>{
  const r=await admApi('POST','/reports/messages',{id,reason});
  if(r.status===401)return toLogin('登录已过期，请重新登录');
  if(!r.ok||!r.body||!Array.isArray(r.body.messages))return admToast(realErr(r));
  const ms=r.body.messages;
  admAskInfo('被举报的对话',`<p class="cap">只显示这条举报相关的那段对话（举报前 7 天到举报后 1 天）；你查看过已记进操作日志。</p>${ms.length?`<div class="admr-msgs">${ms.map(m=>`<div><b>${esc(m.sender_name)}</b><span>${esc(m.body)}${m.hidden?'（已隐藏）':''} <small>${esc(rpAgo(m.created_at))}</small></span></div>`).join('')}</div>`:'<p class="cap">这段时间里没有找到消息。</p>'}`)})}
function realReviewPage(){
  if(RP.list===null&&!RP.err&&!RP.loading)rpLoad();
  else if(!RP.loading&&Date.now()-RP.loadedAt>30000)rpLoad();                 // 隔一会儿再进来：先画旧的，同时后台重读
  const note='<p class="cap">这一页只有举报。球场审核、场边举报在后面的步骤接入；现在要处理它们请先用其他方式。同一个人对同一对象未处理时只记一条；不会告诉对方是谁举报的；处理或忽略后举报人可以重新举报。所有操作写入操作日志。</p>';
  if(RP.err&&RP.list===null)return `<div class="card nodata"><h2>举报队列：读不出来</h2><p>${esc(RP.err)}</p><div class="rowacts"><button class="btn sm p" data-rp="reload">重试</button></div></div>`;
  if(RP.list===null)return '<div class="card nodata"><h2>举报队列</h2><p>读取中…</p></div>';
  const L=RP.list,open=L.filter(x=>x.status==='open').length;
  const row=x=>{const busy=RP.busy.has(x.id),can=x.status==='open';
    return `<tr><td>${esc(x.reporter)}</td><td><b style="font-weight:600">${esc(x.target_type==='game'?`「${x.target||'?'} 发起的球局」`:x.target||'（已删除）')}</b></td><td>${esc(RP_TYPE[x.target_type]||x.target_type)}</td><td>${esc(rpSrc(x))}</td>
    <td>${esc(REP_RC[x.reason]||'其他')}${x.note?`<br><small style="color:var(--mut)">${esc(x.note)}</small>`:''}</td><td>${esc(rpAgo(x.created_at))}</td>
    <td>${x.status==='open'?'<span class="pill w">待处理</span>':x.status==='actioned'?'<span class="pill g">已处理</span>':'<span class="pill">已忽略</span>'}${x.handled_by_name?`<br><small style="color:var(--mut)">${esc(x.handled_by_name)}</small>`:''}</td>
    <td>${can?`<div class="rowacts"><button class="btn sm" data-rp="msgs" data-id="${esc(x.id)}"${busy?' disabled':''}>查看对话</button><button class="btn sm p" data-rp="ok" data-id="${esc(x.id)}"${busy?' disabled':''}>处理</button><button class="btn sm" data-rp="no" data-id="${esc(x.id)}"${busy?' disabled':''}>忽略</button></div>`:''}</td></tr>`};
  return `<div class="card"><div class="ch"><b>举报</b><small>待处理 ${open} 条 · 另显示最近处理的</small><button class="btn sm" data-rp="reload" style="margin-left:auto">刷新</button></div>
  ${RP.err?`<p class="cap" style="color:var(--crit)">${esc(RP.err)}（下面是上次读到的）</p>`:''}
  ${L.length?`<table><thead><tr><th>举报人</th><th>对象</th><th>类型</th><th>来源</th><th>原因</th><th>时间</th><th>状态</th><th></th></tr></thead><tbody>${L.map(row).join('')}</tbody></table>`:'<div class="empty">还没有举报 ✓</div>'}</div>${note}`}
if(NBQ_MODE==='real')document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-rp]');if(!b||b.disabled)return;
  const k=b.dataset.rp,id=b.dataset.id;
  if(k==='reload'){RP.list=null;RP.err=null;RP.loadedAt=0;render();return}
  if(k==='msgs')return rpMsgs(id);
  if(k==='ok'||k==='no')rpAct(id,k==='ok'?'actioned':'dismissed')});

// ---------- 包住三个入口（真模式：不走任何模拟数据的画法） ----------
const _realRender=render;
render=function(){if(NBQ_MODE!=='real')return _realRender.apply(this,arguments);
  if(!RL.me)return;drawNav();$('#pt').textContent=TITLES[S.page]||'后台';
  const f=REAL_PAGES[S.page];$('#page').innerHTML=f?f():realPlaceholder(S.page)};
const _realDrawNav=drawNav;
drawNav=function(){if(NBQ_MODE!=='real')return _realDrawNav.apply(this,arguments);
  $('#nav').innerHTML=PAGES.map(p=>p[0]==='h'?`<div class="navh">${esc(p[1])}</div>`:`<button class="${S.page===p[0]?'on':''}" data-pg="${esc(p[0])}"><svg class="ic" viewBox="0 0 24 24">${IC[p[0]]||''}</svg>${esc(p[1])}${REAL_PAGES[p[0]]?'':'<em class="soon">待接入</em>'}</button>`).join('')};
const _realLogout=logout;
logout=async function(){if(NBQ_MODE!=='real')return _realLogout.apply(this,arguments);
  const r=await admApi('POST','/logout',{});toLogin(r.ok?'已退出登录':'已在本机退出；网络没通，服务器上的登录会在 12 小时内自动失效')};

// ---------- 启动：先问服务器「我是谁」，期间不显示登录页（不闪），也不显示后台 ----------
if(NBQ_MODE==='real'){lgRecoveryUI();(async()=>{const r=await admApi('GET','/me');if(meOk(r))enterApp(r.body);else toLogin(r.ok?'服务返回的内容不对，请稍后再试':r.status===401?'':realErr(r))})()}
