/* =====================================================================
 * 真登录与真模式外壳（#27 PR-B1）。必须是 admin.list 的最后一个脚本：下面三处包住 render / drawNav / logout，要在所有前面的包装之外。
 *   模式只在 page 里的一处判定（data-mode）：默认「真」；本机文件（file:）和预览站根域名才是「演示」。
 *   真模式的铁律：不显示任何模拟数字。做法是「默认拒绝」——只有登记在 REAL_PAGES 里的页面才画；其余一律画占位，
 *   新加的页面不用记得去标，天然是占位。导航角标（待审核数、风险数）也来自模拟数据，真模式下不画。
 *   登录：邮箱 + 密码 + 验证码（或恢复码）→ POST /admin/api/login；令牌只在 httpOnly Cookie 里，这里拿不到也不存任何凭证。
 * ===================================================================== */
const NBQ_MODE=document.documentElement.getAttribute('data-mode')==='demo'?'demo':'real';
const RL={me:null,busy:false,recovery:false,touchAt:0};
const REAL_PAGES={account:()=>realAccountPage()};
const REAL_NOTE={review:'举报队列是 #27 第 2 步，球场审核在后面的步骤。',safety:'爽约申诉、风险用户在 #27 后面的步骤。'};
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
function toLogin(msg){rcClose();RL.me=null;RL.busy=false;RL.recovery=false;
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
  <table><tbody>${perms.map(p=>`<tr><td>${esc(p.label)}${p.need_reason?' <span title="必须填理由">✎</span>':''}</td><td class="r mono"><small>${esc(p.action)}</small></td></tr>`).join('')}</tbody></table></div>${rcCard()}</div>`}

// ---------- 重新生成恢复码（#27）：先再输一次密码 + 当前验证码，旧码全部作废，新码只显示这一次 ----------
const rcCard=()=>`<div class="card"><div class="ch"><b>恢复码</b><small>手机丢了、没法收验证码时用</small></div>
  <p class="cap" style="margin:0 0 12px">每个恢复码只能用一次。用掉的多了、或者怀疑泄露了，就在这里换一批新的：<b>旧的 10 个会立刻全部作废</b>。需要再输一次密码和当前的验证码。日常登录请用验证码，不要用恢复码。</p>
  <button class="btn sm" data-rgn="open">重新生成恢复码</button></div>`;
function rcDlg(html){let d=document.getElementById('admR');if(!d){d=document.createElement('div');d.id='admR';document.body.appendChild(d)}
  d.innerHTML=`<div class="admr-bg"></div><div class="admr">${html}</div>`;d.classList.add('show');d.onkeydown=null;d.onclick=null;return d}
function rcClose(){const d=document.getElementById('admR');if(d){d.classList.remove('show');d.innerHTML=''}}                      // 关掉就清空，新码不留在页面里
function rcAsk(msg){const d=rcDlg(`<b>重新生成恢复码</b><p class="cap">旧的恢复码会<b>立刻全部作废</b>。请再输一次密码和手机验证器里现在的 6 位数字。</p>
  <input class="search" id="rcPw" type="password" autocomplete="current-password" maxlength="256" placeholder="登录密码" style="width:100%;margin-bottom:8px">
  <input class="search" id="rcCode" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="验证码（6 位数字）" style="width:100%">
  <div class="admr-e" id="rcErr">${esc(msg||'')}</div>
  <div style="display:flex;gap:8px;margin-top:12px"><button class="btn" data-rgn="close">取消</button><button class="btn p" data-rgn="go" id="rcGo">重新生成</button></div>`);
  d.onkeydown=ev=>{if(ev.key==='Enter'&&!ev.isComposing)$('#rcGo').click();if(ev.key==='Escape')rcClose()};setTimeout(()=>{const i=$('#rcPw');i&&i.focus()},30)}
async function rcGo(){const pw=$('#rcPw').value,code=$('#rcCode').value.trim(),err=$('#rcErr'),go=$('#rcGo');
  if(!pw||!/^\d{6}$/.test(code)){err.textContent='请输入密码和 6 位数字的验证码';return}
  go.disabled=true;go.textContent='换码中…';
  const r=await admApi('POST','/account/recovery',{password:pw,code});
  if(r.status===401){rcClose();return toLogin('登录已过期，请重新登录')}
  if(r.ok&&r.body&&Array.isArray(r.body.codes)&&r.body.codes.length===10){
    rcDlg(`<b>新的恢复码</b><p class="cap" style="color:var(--crit)"><b>旧的恢复码已全部作废。</b>下面 10 个只显示这一次：请现在抄在纸上，别存在电脑里，别截图。</p>
      <div class="mono" style="columns:2;font-size:15px;line-height:1.9;margin:6px 0 4px">${r.body.codes.map((c,i)=>`${String(i+1).padStart(2)}. ${esc(c)}<br>`).join('')}</div>
      <div style="display:flex;gap:8px;margin-top:12px"><button class="btn p" data-rgn="close">我已抄好，关闭</button></div>`);admToast('已换成新的恢复码');return}
  rcAsk(r.status===403&&r.error==='admin_reauth_failed'?ADMIN_ERR.admin_reauth_failed:realErr(r))}
if(NBQ_MODE==='real')document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-rgn]');if(!b||b.disabled)return;
  const k=b.dataset.rgn;if(k==='open')rcAsk();else if(k==='close')rcClose();else if(k==='go')rcGo()});

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
