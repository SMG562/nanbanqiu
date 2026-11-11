/* =====================================================================
 * 真登录与真模式外壳（#27 PR-B1）。必须排在所有包装 render / drawNav / logout 的脚本之后（后面的 03xx 真数据页只登记 REAL_PAGES、不包装）：下面三处包住 render / drawNav / logout，要在所有前面的包装之外。
 *   模式只在 page 里的一处判定（data-mode）：默认「真」；本机文件（file:）和预览站根域名才是「演示」。
 *   真模式的铁律：不显示任何模拟数字。做法是「默认拒绝」——只有登记在 REAL_PAGES 里的页面才画；其余一律画占位，
 *   新加的页面不用记得去标，天然是占位。导航角标（待审核数、风险数）也来自模拟数据，真模式下不画。
 *   登录：邮箱 + 密码 + 验证码（或恢复码）→ POST /admin/api/login；令牌只在 httpOnly Cookie 里，这里拿不到也不存任何凭证。
 * ===================================================================== */
const NBQ_MODE=document.documentElement.getAttribute('data-mode')==='demo'?'demo':'real';
const RL={me:null,busy:false,recovery:false,touchAt:0};
const REAL_RESET=[];   // 退出 / 过期时各真数据页清自己的状态（后面的文件 push 进来）
const REAL_PAGES={account:()=>realAccountPage(),review:()=>realReviewPage(),venues:()=>realVenuesPage(),users:()=>realUsersPage(),games:()=>realGamesPage()};
const REAL_NOTE={};   // 个别页面的占位说明（没有就用通用的）
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
function toLogin(msg){REAL_RESET.forEach(f=>{try{f()}catch(_){}});RP.list=null;RP.err=null;RP.loadedAt=0;RP.busy.clear();RL.me=null;RL.busy=false;RL.recovery=false;
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
  const note='<p class="cap">这一页只有举报；球场审核在「球场」页；场边举报在后面的步骤接入。同一个人对同一对象未处理时只记一条；不会告诉对方是谁举报的；处理或忽略后举报人可以重新举报。所有操作写入操作日志。</p>';
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


// ---------- 球场（#27 第 3 步）：待核对坐标 + 用户添加的待审核球场 ----------
const VG={data:null,err:null,loading:false,loadedAt:0,busy:new Set(),sel:{}};
async function vgLoad(){if(VG.loading)return;VG.loading=true;
  const r=await admApi('GET','/venues');VG.loading=false;VG.loadedAt=Date.now();
  if(r.status===401){VG.data=null;return toLogin('登录已过期，请重新登录')}
  if(r.ok&&r.body&&Array.isArray(r.body.geo)&&Array.isArray(r.body.pending)){VG.data=r.body;VG.err=null}
  else VG.err=r.status===403?'你的角色不能审核球场':r.ok?'服务返回的内容不对，请稍后再试':realErr(r);
  if(RL.me&&S.page==='venues')render()}
async function vgPost(path,body,okText){const id=body.id;if(VG.busy.has(id))return;VG.busy.add(id);render();
  const r=await admApi('POST',path,body);VG.busy.delete(id);
  if(r.status===401)return toLogin('登录已过期，请重新登录');
  admToast(r.ok?okText:r.error==='state_changed'?'这条刚被别人处理过，已刷新':r.error==='invalid'?'坐标不对（要在澳大利亚境内，纬度在前、经度在后）':realErr(r));
  await vgLoad();if(RL.me&&S.page==='venues')render()}
// 从谷歌地图复制的「-37.8136, 144.9631」；也接受空格分隔
function vgParse(t){const m=String(t||'').trim().match(/^(-?\d{1,3}(?:\.\d+)?)\s*[,，\s]\s*(-?\d{1,3}(?:\.\d+)?)$/);return m?{lat:+m[1],lng:+m[2]}:null}
function vgAskGeo(id){const v=VG.data&&VG.data.geo.find(x=>x.id===id);if(!v)return;
  let d=document.getElementById('admR');if(!d){d=document.createElement('div');d.id='admR';document.body.appendChild(d)}
  d.innerHTML=`<div class="admr-bg" data-admrx></div><div class="admr"><b>${esc(v.name)} · 改位置</b><p class="cap">在谷歌地图里找到球场，右键点球场中间，点最上面那行坐标即可复制，粘贴到下面。现在：${v.lat}, ${v.lng}</p><input class="search" data-vgin style="width:100%" placeholder="-37.8136, 144.9631"><p class="cap" data-vgerr style="color:var(--crit);min-height:1.2em"></p><div style="display:flex;gap:8px;margin-top:8px"><button class="btn p" data-vgok>保存新位置</button><button class="btn" data-admrx>取消</button></div></div>`;
  d.classList.add('show');setTimeout(()=>{const i=d.querySelector('[data-vgin]');i&&i.focus()},30);
  const go=()=>{const p=vgParse(d.querySelector('[data-vgin]').value);if(!p){d.querySelector('[data-vgerr]').textContent='格式是「纬度, 经度」，例如 -37.8136, 144.9631';return}d.classList.remove('show');vgPost('/venues/geo',{id,lat:p.lat,lng:p.lng},'已保存新位置')};
  d.onclick=ev=>{if(ev.target.closest('[data-admrx]'))d.classList.remove('show');else if(ev.target.closest('[data-vgok]'))go()};
  d.onkeydown=ev=>{if(ev.key==='Enter'&&nbqImeEnterAdm(ev))go();if(ev.key==='Escape')d.classList.remove('show')}}
const nbqImeEnterAdm=e=>!e.isComposing&&e.keyCode!==229;
const vgMap=v=>`https://www.google.com/maps/search/?api=1&query=${v.lat},${v.lng}`;
function realVenuesPage(){
  if(VG.data===null&&!VG.err&&!VG.loading)vgLoad();
  else if(!VG.loading&&Date.now()-VG.loadedAt>30000)vgLoad();
  if(VG.err&&VG.data===null)return `<div class="card nodata"><h2>球场：读不出来</h2><p>${esc(VG.err)}</p><div class="rowacts"><button class="btn sm p" data-vg="reload">重试</button></div></div>`;
  if(VG.data===null)return '<div class="card nodata"><h2>球场</h2><p>读取中…</p></div>';
  const D=VG.data,done=D.active_total-D.geo_todo;
  const grow=v=>{const b=VG.busy.has(v.id);return `<tr><td><b style="font-weight:600">${esc(v.name)}</b></td><td>${esc(v.suburb||'—')}</td><td class="mono">${v.lat}, ${v.lng}</td><td><a href="${esc(vgMap(v))}" target="_blank" rel="noopener">在谷歌地图打开</a></td>
    <td><div class="rowacts"><button class="btn sm p" data-vg="ok" data-id="${esc(v.id)}"${b?' disabled':''}>位置没错</button><button class="btn sm" data-vg="move" data-id="${esc(v.id)}"${b?' disabled':''}>改位置</button></div></td></tr>`};
  const prow=v=>{const b=VG.busy.has(v.id),sel=VG.sel[v.id]||(v.near[0]&&v.near[0].id)||'';
    return `<tr><td><b style="font-weight:600">${esc(v.name)}</b><br><small style="color:var(--mut)">${esc(v.suburb||'—')} · ${esc(v.added_by_name||'—')} 添加</small></td><td class="mono">${v.lat}, ${v.lng}<br><a href="${esc(vgMap(v))}" target="_blank" rel="noopener">谷歌地图</a></td>
    <td>${v.near.length?`附近已有：${v.near.map(n=>esc(n.name)+'（'+n.dist_m+' 米）').join('、')}`:'<small style="color:var(--mut)">300 米内没有已收录的球场</small>'}</td>
    <td><div class="rowacts"><button class="btn sm p" data-vg="approve" data-id="${esc(v.id)}"${b?' disabled':''}>通过</button>${v.near.length?`<select class="search" data-vgsel="${esc(v.id)}">${v.near.map(n=>`<option value="${esc(n.id)}"${n.id===sel?' selected':''}>${esc(n.name)}</option>`).join('')}</select><button class="btn sm" data-vg="merge" data-id="${esc(v.id)}"${b?' disabled':''}>合并到它</button>`:''}<button class="btn sm" data-vg="reject" data-id="${esc(v.id)}"${b?' disabled':''}>驳回</button></div></td></tr>`};
  return `<div class="card"><div class="ch"><b>用户添加的球场</b><small>待审核 ${D.pending.length} 个</small><button class="btn sm" data-vg="reload" style="margin-left:auto">刷新</button></div>
  ${VG.err?`<p class="cap" style="color:var(--crit)">${esc(VG.err)}（下面是上次读到的）</p>`:''}
  ${D.pending.length?`<table><thead><tr><th>球场</th><th>位置</th><th>附近</th><th></th></tr></thead><tbody>${D.pending.map(prow).join('')}</tbody></table>`:'<div class="empty">没有待审核的球场 ✓</div>'}</div>
  <div class="card"><div class="ch"><b>待核对位置</b><small>已核对 ${done} / ${D.active_total} · 还差 ${D.geo_todo}${D.geo.length<D.geo_todo?`（下面先显示 ${D.geo.length} 个）`:''}</small></div>
  <p class="cap">这些球场的位置还是所在区的中心估值，可能偏几百米到几公里。点「在谷歌地图打开」看红点是否在球场上：对 → 「位置没错」；不对 → 在地图上找到球场，复制坐标点「改位置」。每次操作都写入操作日志。</p>
  ${D.geo.length?`<table><thead><tr><th>球场</th><th>区</th><th>现在的位置</th><th></th><th></th></tr></thead><tbody>${D.geo.map(grow).join('')}</tbody></table>`:'<div class="empty">所有球场的位置都核对过了 ✓</div>'}</div>`}
if(NBQ_MODE==='real'){document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-vg]');if(!b||b.disabled)return;
  const k=b.dataset.vg,id=b.dataset.id;
  if(k==='reload'){VG.data=null;VG.err=null;VG.loadedAt=0;render();return}
  if(k==='ok')return vgPost('/venues/geo',{id},'已标为已核对');
  if(k==='move')return vgAskGeo(id);
  if(k==='approve')return vgPost('/venues/review',{id,action:'approve'},'已通过，球场对所有人可见');
  if(k==='reject')return vgPost('/venues/review',{id,action:'reject'},'已驳回');
  if(k==='merge'){const s=document.querySelector(`[data-vgsel="${id}"]`);return vgPost('/venues/review',{id,action:'merge',merge_into:s&&s.value},'已合并')}});
  document.addEventListener('change',e=>{const s=e.target.closest&&e.target.closest('[data-vgsel]');if(s)VG.sel[s.dataset.vgsel]=s.value})}


// ---------- 球友（#27 第 3 步，只读）：搜索 · 按状态筛 · 每页 50 ----------
const UP={rows:[],counts:{},more:false,q:'',st:'',loading:false,loaded:false,err:null,gen:0,tm:0};
// 我的 UTR（#101）：球友页顶上一张卡片（概况 + 需要留意的人）；列表里 UTR 带类型（自评 ≈）和「已关联」✓。主页编号只在「同一主页多个账号」时显示
const UTP={d:null,loading:false,err:null};
async function utpLoad(){UTP.loading=true;UTP.err=null;const r=await admApi('GET','/utr');UTP.loading=false;
  if(r.status===401)return toLogin('登录已过期，请重新登录');
  if(r.ok&&r.body&&r.body.summary&&Array.isArray(r.body.flags))UTP.d=r.body;else UTP.err=r.status===403?'你的角色不能查看':r.ok?'服务返回的内容不对，请稍后再试':realErr(r);
  if(RL.me&&S.page==='users')render()}
const utpUtr=u=>(u.utr_estimated?'≈'+(+u.utr).toFixed(1):String(+u.utr))+(u.utr_linked?' <span title="已关联 UTR 主页" style="color:var(--ok,#176B4D)">✓</span>':'');
function utpCard(){if(!UTP.d&&!UTP.loading&&!UTP.err)utpLoad();
  if(!UTP.d)return `<div class="card"><div class="ch"><b>UTR</b><small>${UTP.err?esc(UTP.err):'读取中…'}</small></div>${UTP.err?'<button class="btn sm" data-up="utr">重试</button>':''}</div>`;
  const s=UTP.d.summary,pc=n=>s.total?Math.round(n*100/s.total)+'%':'—';
  const why=f=>[f.often_n?`近 7 天改了 ${f.often_n} 次`:'',f.jump_to!=null?`30 天内 ${f.jump_from} → ${f.jump_to}`:'',f.dup_profile?`主页 <a href="https://app.utrsports.net/profiles/${encodeURIComponent(f.dup_profile)}" target="_blank" rel="noopener noreferrer">#${esc(f.dup_profile)}</a> 还关联了别的账号`:''].filter(Boolean).join('；');
  return `<div class="card"><div class="ch"><b>UTR</b><small>在册 ${s.total} 人</small></div>
  <p class="cap" style="margin:4px 0 8px">正式 ${s.official}（${pc(s.official)}）· 自评 ${s.self}（${pc(s.self)}）· 关联主页 ${s.linked}（${pc(s.linked)}）· 近 30 天确认过 ${s.updated_30d} · 近 7 天改动 ${s.changes_7d} 次 / ${s.changers_7d} 人</p>
  ${UTP.d.flags.length?`<table><thead><tr><th>编号</th><th>昵称</th><th>UTR</th><th>需要留意</th></tr></thead><tbody>${UTP.d.flags.map(f=>`<tr><td class="mono">#${String(f.member_no).padStart(4,'0')}</td><td>${esc(f.nickname)}${f.last_initial?' '+esc(f.last_initial)+'.':''}</td><td>${utpUtr(f)}</td><td>${why(f)}</td></tr>`).join('')}</tbody></table>`:'<p class="cap">没有需要留意的人。</p>'}
  <p class="cap">只读。规则：近 7 天改 3 次以上 · 30 天内正式→正式一次跳 2 以上 · 同一主页关联了多个账号。</p></div>`}
const realCity=k=>((Array.isArray(CITY_ADM)&&CITY_ADM.find(c=>c.key===k))||{zh:k||'—'}).zh;   // CITY_ADM 是数组（0220）
const UP_ST={active:'正常',review:'待核实',limited:'受限',suspended:'暂停',banned:'封禁',deleted:'已注销'};
async function upLoad(more){const g=++UP.gen;UP.loading=true;UP.err=null;
  const r=await admApi('GET','/users?q='+encodeURIComponent(UP.q)+'&status='+UP.st+'&offset='+(more?UP.rows.length:0));
  if(g!==UP.gen)return;UP.loading=false;
  if(r.status===401)return toLogin('登录已过期，请重新登录');
  if(r.ok&&r.body&&Array.isArray(r.body.users)){UP.rows=more?UP.rows.concat(r.body.users):r.body.users;UP.more=!!r.body.more;UP.counts=r.body.counts||{};UP.loaded=true}
  else UP.err=r.status===403?'你的角色不能查看球友':r.ok?'服务返回的内容不对，请稍后再试':realErr(r);
  if(RL.me&&S.page==='users'){const had=document.activeElement&&document.activeElement.matches&&document.activeElement.matches('[data-upq]');render();
    if(had){const el=document.querySelector('[data-upq]');if(el){el.focus();el.setSelectionRange(el.value.length,el.value.length)}}}}
const upDate=t=>{if(!t)return '—';const d=new Date(t);return isNaN(d)?'—':d.toLocaleDateString('zh-CN',{year:'numeric',month:'2-digit',day:'2-digit'})};
function realUsersPage(){
  if(!UP.loaded&&!UP.loading&&!UP.err)upLoad(false);
  const total=Object.values(UP.counts).reduce((a,b)=>a+b,0);
  const chips=`<button class="btn sm${UP.st===''?' p':''}" data-up="st" data-v="">全部 ${total}</button>`+Object.keys(UP_ST).map(k=>`<button class="btn sm${UP.st===k?' p':''}" data-up="st" data-v="${k}">${UP_ST[k]} ${UP.counts[k]||0}</button>`).join('');
  const row=u=>`<tr data-rud="${u.member_no}" style="cursor:pointer" title="点开查看和处理"><td class="mono">#${String(u.member_no).padStart(4,'0')}</td><td><b style="font-weight:600">${esc(u.nickname)}${u.last_initial?' '+esc(u.last_initial)+'.':''}</b></td><td>${esc(realCity(u.city))}</td>
    <td>${esc(UP_ST[u.status]||u.status)}${u.status==='suspended'&&u.status_until?'<br><small style="color:var(--mut)">到 '+upDate(u.status_until)+'</small>':''}</td><td>UTR ${utpUtr(u)} · L${u.level}</td><td class="mono">${esc(u.phone_tail||'')}</td><td>${upDate(u.created_at)}</td><td>${upDate(u.last_active_at)}</td><td>${esc(u.signup_source||'—')}</td></tr>`;
  return utpCard()+`<div class="card"><div class="ch"><b>球友</b><small>${UP.loaded?'共 '+total+' 人':'读取中…'}</small></div>
  <div class="rowacts" style="margin:6px 0;flex-wrap:wrap">${chips}</div>
  <input class="search" data-upq style="width:100%;max-width:320px" placeholder="搜昵称或编号（如 62）" value="${esc(UP.q)}">
  ${UP.err?`<p class="cap" style="color:var(--crit)">${esc(UP.err)} <button class="btn sm" data-up="reload">重试</button></p>`:''}
  ${UP.loaded?(UP.rows.length?`<table><thead><tr><th>编号</th><th>昵称</th><th>城市</th><th>状态</th><th>UTR · 等级</th><th>手机</th><th>注册</th><th>最近活跃</th><th>来源</th></tr></thead><tbody>${UP.rows.map(row).join('')}</tbody></table>`:'<div class="empty">没有符合条件的球友</div>'):''}
  ${UP.more?`<div class="rowacts" style="margin-top:8px"><button class="btn sm" data-up="more"${UP.loading?' disabled':''}>再加载 50 个</button></div>`:''}
  <p class="cap">点一行查看详情和处理（改状态、重置昵称头像、性别）。手机号只显示后四位，完整号码只有超级管理员填理由后能看。</p></div>`}
if(NBQ_MODE==='real'){
  document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-up]');if(!b||b.disabled)return;const k=b.dataset.up;
    if(k==='st'){UP.st=b.dataset.v;UP.loaded=false;UP.rows=[];render();upLoad(false)}
    else if(k==='more')upLoad(true);
    else if(k==='reload'){UP.err=null;UP.loaded=false;render()}
    else if(k==='utr'){UTP.err=null;UTP.d=null;render()}});
  document.addEventListener('input',e=>{const i=e.target.closest&&e.target.closest('[data-upq]');if(!i||e.isComposing)return;UP.q=i.value;clearTimeout(UP.tm);UP.tm=setTimeout(()=>{UP.loaded=false;UP.rows=[];upLoad(false)},350)});
  document.addEventListener('compositionend',e=>{const i=e.target.closest&&e.target.closest('[data-upq]');if(!i)return;UP.q=i.value;clearTimeout(UP.tm);UP.tm=setTimeout(()=>{UP.loaded=false;UP.rows=[];upLoad(false)},350)})}


// ---------- 球局（#27 第 3 步，只读）：未开始 / 已过 / 全部 · 按状态筛 · 搜发起人 / 球场 / 分享码 ----------
const GP={rows:[],counts:{},more:false,q:'',st:'',when:'upcoming',loading:false,loaded:false,err:null,gen:0,tm:0};
const GP_ST={open:'招募中',full:'已满',cancelled:'已取消',completed:'已结束'};
const GP_TYPE={singles:'单打',doubles:'双打',rally:'拉球'};
const GP_TZ={syd:'Australia/Sydney'};
async function gpLoad(more){const g=++GP.gen;GP.loading=true;GP.err=null;
  const r=await admApi('GET','/games?when='+GP.when+'&status='+GP.st+'&q='+encodeURIComponent(GP.q)+'&offset='+(more?GP.rows.length:0));
  if(g!==GP.gen)return;GP.loading=false;
  if(r.status===401)return toLogin('登录已过期，请重新登录');
  if(r.ok&&r.body&&Array.isArray(r.body.games)){GP.rows=more?GP.rows.concat(r.body.games):r.body.games;GP.more=!!r.body.more;GP.counts=r.body.counts||{};GP.loaded=true}
  else GP.err=r.status===403?'你的角色不能查看球局':r.ok?'服务返回的内容不对，请稍后再试':realErr(r);
  if(RL.me&&S.page==='games'){const had=document.activeElement&&document.activeElement.matches&&document.activeElement.matches('[data-gpq]');render();
    if(had){const el=document.querySelector('[data-gpq]');if(el){el.focus();el.setSelectionRange(el.value.length,el.value.length)}}}}
const gpTime=(t,city)=>{const d=new Date(t);return isNaN(d)?'—':d.toLocaleString('zh-CN',{timeZone:GP_TZ[city]||'Australia/Melbourne',month:'2-digit',day:'2-digit',weekday:'short',hour:'2-digit',minute:'2-digit',hour12:false})};
function gpReload(){GP.loaded=false;GP.rows=[];render();gpLoad(false)}
function realGamesPage(){
  if(!GP.loaded&&!GP.loading&&!GP.err)gpLoad(false);
  const total=Object.values(GP.counts).reduce((a,b)=>a+b,0);
  const whens=[['upcoming','未开始'],['past','已过'],['all','全部']].map(([k,n])=>`<button class="btn sm${GP.when===k?' p':''}" data-gp="when" data-v="${k}">${n}</button>`).join('');
  const chips=`<button class="btn sm${GP.st===''?' p':''}" data-gp="st" data-v="">全部状态 ${total}</button>`+Object.keys(GP_ST).map(k=>`<button class="btn sm${GP.st===k?' p':''}" data-gp="st" data-v="${k}">${GP_ST[k]} ${GP.counts[k]||0}</button>`).join('');
  const row=g=>`<tr><td>${esc(gpTime(g.starts_at,g.city))}<br><small style="color:var(--mut)">${g.duration_min} 分钟</small></td>
    <td>${g.visibility==='private'?'<small style="color:var(--mut)">私人球局</small>':esc(g.venue||'—')}${g.note?'<br><small style="color:var(--mut)">'+esc(g.note)+'</small>':''}</td>
    <td>${esc(GP_TYPE[g.game_type]||g.game_type)}</td><td>${g.host?esc(g.host)+' <small class="mono" style="color:var(--mut)">#'+String(g.host_no).padStart(4,'0')+'</small>':'—'}</td>
    <td>${g.joined} / ${g.capacity}${g.pending?'<br><small style="color:var(--mut)">待处理申请 '+g.pending+'</small>':''}</td><td>${esc(GP_ST[g.status]||g.status)}${g.status==='cancelled'&&g.cancelled_at?'<br><small style="color:var(--mut)">'+esc(gpTime(g.cancelled_at,g.city))+'</small>':''}</td>
    <td class="mono">${esc(g.share_code)}</td></tr>`;
  return `<div class="card"><div class="ch"><b>球局</b><small>${GP.loaded?'共 '+total+' 场':'读取中…'}</small></div>
  <div class="rowacts" style="margin:6px 0;flex-wrap:wrap">${whens}</div><div class="rowacts" style="margin:6px 0;flex-wrap:wrap">${chips}</div>
  <input class="search" data-gpq style="width:100%;max-width:320px" placeholder="搜发起人、球场或分享码" value="${esc(GP.q)}">
  ${GP.err?`<p class="cap" style="color:var(--crit)">${esc(GP.err)} <button class="btn sm" data-gp="reload">重试</button></p>`:''}
  ${GP.loaded?(GP.rows.length?`<table><thead><tr><th>时间</th><th>球场</th><th>类型</th><th>发起人</th><th>人数</th><th>状态</th><th>分享码</th></tr></thead><tbody>${GP.rows.map(row).join('')}</tbody></table>`:'<div class="empty">没有符合条件的球局</div>'):''}
  ${GP.more?`<div class="rowacts" style="margin-top:8px"><button class="btn sm" data-gp="more"${GP.loading?' disabled':''}>再加载 50 场</button></div>`:''}
  <p class="cap">这里只读。私人球局不显示场地和备注；取消 / 隐藏等操作在后面的步骤接入。</p></div>`}
if(NBQ_MODE==='real'){
  document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-gp]');if(!b||b.disabled)return;const k=b.dataset.gp;
    if(k==='when'){GP.when=b.dataset.v;gpReload()}
    else if(k==='st'){GP.st=b.dataset.v;gpReload()}
    else if(k==='more')gpLoad(true);
    else if(k==='reload'){GP.err=null;gpReload()}});
  const gpQ=e=>{const i=e.target.closest&&e.target.closest('[data-gpq]');if(!i||e.isComposing)return;GP.q=i.value;clearTimeout(GP.tm);GP.tm=setTimeout(()=>{GP.loaded=false;GP.rows=[];gpLoad(false)},350)};
  document.addEventListener('input',gpQ);document.addEventListener('compositionend',gpQ)}

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
