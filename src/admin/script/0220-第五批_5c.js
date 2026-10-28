/* =====================================================================
 * 第五批 5c：管理员角色与权限 —— 与数据库 admin_perms 逐条相同（tests/static/admin_perms.mjs 对照）
 *   页面上不能做的按钮置灰并说明需要什么角色；需要理由的操作先填理由（至少 4 个字，记进操作日志）；
 *   真实环境里服务端同样拦（admin_ 函数），这里只是让管理员一眼看清。演示：登录页选身份
 * ===================================================================== */
const ADMIN_PERMS=[["page.view","查看统计和名单",["owner","operator","viewer"],false],["audit.view","查看操作日志",["owner","operator"],false],["user.status","待核实 / 受限 / 暂停 / 恢复正常",["owner","operator"],true],["user.ban","永久封禁、恢复已封禁或已注销的账号",["owner"],true],["user.reset","重置昵称 / 头像",["owner","operator"],true],["user.gender","性别：清除 / 解除男改女限制",["owner","operator"],true],["user.notify","给球友发通知",["owner","operator"],false],["phone.reveal","查看完整手机号",["owner"],true],["report.handle","处理举报",["owner","operator"],false],["message.read","查看被举报的对话",["owner","operator"],true],["message.hide","隐藏消息 / 评价",["owner","operator"],true],["venue.review","审核球场",["owner","operator"],false],["risk.handle","处理风险提醒",["owner","operator"],false],["data.export","导出统计（不含用户 ID）",["owner","operator"],false],["data.export_ids","导出带用户 ID 的数据",["owner"],true],["rules.edit","修改风险 / 频率规则",["owner"],true],["admin.manage","管理管理员",["owner"],true],["city.manage","城市上线状态和资料",["owner"],true],["city.waitlist","导出「开放时通知我」名单",["owner"],true],["sideline.config","场边：改话题、引导文案、排期，发布 / 退回版本",["owner","operator"],false]];
const ADMIN_ERR={"admin_bad_login":"邮箱、密码或验证码不对","admin_locked":"输错次数太多，请 15 分钟后再试","admin_session_expired":"登录已过期，请重新登录","admin_forbidden":"你的角色不能做这件事","admin_reason_required":"请填写理由（至少 4 个字）","admin_last_owner":"至少要保留一位超级管理员","admin_city_not_ready":"这个城市还没准备好：检查清单里还有没通过的项","admin_config_stale":"别人刚发布了新版本，请刷新后再改"};
const ROLE_NAME={owner:'超级管理员',operator:'运营',viewer:'只读'},ROLE_WHO={owner:'Han',operator:'Amy',viewer:'Leo'};
const VIEWER_PAGES=new Set(['overview','cards','games','venues','regions','life','after','grow','traffic','growth','platform','env','events']);   // 只读：只看统计（数据库 nbq_viewer 读不到球友、举报、风险）；页面上的昵称换成「某球友」
S.role=S.role||'owner';
const admPerm=a=>ADMIN_PERMS.find(p=>p[0]===a),admCan=a=>{const p=admPerm(a);return !!p&&p[2].includes(S.role)},admWho=()=>ROLE_WHO[S.role];
const admNeed=a=>{const p=admPerm(a);return p?p[2].map(r=>ROLE_NAME[r]).join(' / '):''};
function admToast(m){let t=document.getElementById('admToast');if(!t){t=document.createElement('div');t.id='admToast';t.className='adm-toast';document.body.appendChild(t)}t.textContent=m;t.classList.add('show');clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove('show'),2600)}
// 点到的元素 → 哪个操作
function admAction(t){
  const go=t.closest('[data-udgo]');if(go){const u=S.ud&&USERS.find(x=>x.id===S.ud);return {a:go.dataset.udgo==='banned'||(u&&['banned','deleted'].includes(u.st))?'user.ban':'user.status',reasonFrom:'udNote'}}
  const op=t.closest('[data-udop]');if(op)return {a:{name:'user.reset',avatar:'user.reset',notify:'user.notify',restore:'user.ban'}[op.dataset.udop],label:op.textContent.trim()};
  const g=t.closest('[data-udg]');if(g&&g.dataset.udg==='clear')return {a:'user.gender',label:'清除性别'};
  if(g&&g.dataset.udg==='unlock')return {a:'user.gender',noReason:true};
  if(g&&g.dataset.udg==='unlockgo')return {a:'user.gender',reasonFrom:'udgWhy'};
  const ac=t.closest('[data-act]');if(ac){const k=ac.dataset.act;if(/^v(ok|no|merge)$/.test(k))return {a:'venue.review'};if(/^r(ok|no)$/.test(k)||/^sb(pk|px|ro|rd)$/.test(k))return {a:'report.handle'};if(k==='sbrh')return {a:'message.hide',label:'隐藏被举报的场边内容'};if(k==='rk')return {a:'risk.handle'}}
  if(t.closest('[data-rkst],[data-rkgo]'))return {a:'risk.handle'};
  if(t.closest('[onclick="exportCSV()"]'))return S.page==='users'?{a:'data.export_ids',label:'导出球友名单（含编号和昵称）'}:{a:'data.export'};
  const ad=t.closest('[data-adm]');if(ad)return {a:{phone:'phone.reveal',msgs:'message.read',invite:'admin.manage',cyst:'city.manage',cywl:'city.waitlist',cywd:'city.waitlist'}[ad.dataset.adm],label:ad.dataset.label||ad.textContent.trim(),own:true};
  return null}
let ADM_PASS=false;
addEventListener('click',e=>{if(ADM_PASS)return;const t=e.target;if(!t.closest)return;const x=admAction(t);if(!x||!x.a)return;
  const el=t.closest('[data-udgo],[data-udop],[data-udg],[data-act],[data-rkst],[data-rkgo],[onclick="exportCSV()"],[data-adm]');
  if(!admCan(x.a)){e.preventDefault();e.stopImmediatePropagation();admToast(`${ADMIN_ERR.admin_forbidden}（需要${admNeed(x.a)}）`);return}
  const p=admPerm(x.a),n0=S.audit.length;
  const after=reason=>setTimeout(()=>{if(S.audit.length>n0){S.audit[0][0]=admWho();if(reason&&!String(S.audit[0][2]).includes(reason))S.audit[0][2]+=' · 理由：'+reason}},0);
  if(p[3]&&!x.noReason&&x.reasonFrom){const i=document.getElementById(x.reasonFrom),v=((i&&i.value)||'').trim();
    if(v.length<4){e.preventDefault();e.stopImmediatePropagation();if(i){i.focus();i.style.borderColor='var(--crit)';i.placeholder=ADMIN_ERR.admin_reason_required}admToast(ADMIN_ERR.admin_reason_required);return}after(v);return}
  if(p[3]&&!x.noReason){e.preventDefault();e.stopImmediatePropagation();admAskReason(x.label||p[1],reason=>{if(x.own){admOwn(el,reason);return}ADM_PASS=true;try{el.click()}finally{ADM_PASS=false}after(reason)});return}
  if(x.own){e.preventDefault();e.stopImmediatePropagation();admOwn(el,'');return}
  after('')},true);
// 填理由
function admAskReason(label,cb){let d=document.getElementById('admR');if(!d){d=document.createElement('div');d.id='admR';document.body.appendChild(d)}
  d.innerHTML=`<div class="admr-bg" data-admrx></div><div class="admr"><b>${esc(label)}</b><p class="cap">这个操作要写理由，会和你的名字一起记进操作日志。</p><input class="search" id="admRin" style="width:100%" maxlength="200" placeholder="比如：举报 #r2，已核对聊天记录"><div class="admr-e" id="admRe"></div><div style="display:flex;gap:8px;margin-top:12px"><button class="btn p" data-admrok>确认</button><button class="btn" data-admrx>取消</button></div></div>`;
  d.classList.add('show');setTimeout(()=>{const i=document.getElementById('admRin');i&&i.focus()},30);
  d.onclick=ev=>{if(ev.target.closest('[data-admrx]')){d.classList.remove('show');return}if(ev.target.closest('[data-admrok]')){const v=document.getElementById('admRin').value.trim();if(v.length<4){document.getElementById('admRe').textContent=ADMIN_ERR.admin_reason_required;return}d.classList.remove('show');cb(v)}};
  d.onkeydown=ev=>{if(ev.key==='Enter')d.querySelector('[data-admrok]').click();if(ev.key==='Escape')d.classList.remove('show')}}
// 新增的两个操作：查看完整手机号（owner）· 查看被举报的对话（运营以上）
function admOwn(el,reason){const k=el.dataset.adm;
  if(k==='phone'){const u=S.ud&&USERS.find(x=>x.id===S.ud);if(!u)return;const ph='+61 4'+String(10000000+Math.floor(b1h(u.id+'ph')*89999999)).replace(/(\d{2})(\d{3})(\d{3})/,'$1 $2 $3');
    el.outerHTML=`<span class="pill nodot mono" title="已记进操作日志">${ph}</span>`;S.audit.unshift([admWho(),'phone.reveal',`${u.name} · ${u.uid.slice(0,8)} · 理由：${reason}`,'刚刚']);return}
  if(k==='msgs'){const r=S.reports.find(x=>x.id===el.dataset.id);if(!r)return;S.audit.unshift([admWho(),'message.read',`${r.id} · 理由：${reason}`,'刚刚']);
    const lines=[[r.target,'（演示）被举报前的一段消息'],[r.who,'（演示）举报人的回复'],[r.target,'（演示）被举报的那条消息']];
    admAskInfo(`被举报的对话 · ${r.id}`,`<p class="cap">只显示这条举报相关的那段对话（举报前 7 天到举报后 1 天）；你查看过已记进操作日志。真实环境从 admin_report_messages() 读取。</p><div class="admr-msgs">${lines.map(l=>`<div><b>${esc(l[0])}</b><span>${esc(l[1])}</span></div>`).join('')}</div>`);return}
  if(k==='cyst'||k==='cywl'||k==='cywd'){cityAct(el,reason);return}
  if(k==='invite'){admToast('已生成邀请：临时密码、两步验证二维码和 10 个恢复码只显示一次（演示）');S.audit.unshift([admWho(),'admin.manage','邀请管理员 · 理由：'+reason,'刚刚']);render()}}
function admAskInfo(title,html){let d=document.getElementById('admR');if(!d){d=document.createElement('div');d.id='admR';document.body.appendChild(d)}
  d.innerHTML=`<div class="admr-bg" data-admrx></div><div class="admr"><b>${esc(title)}</b>${html}<div style="display:flex;gap:8px;margin-top:12px"><button class="btn" data-admrx>关闭</button></div></div>`;d.classList.add('show');d.onclick=ev=>{if(ev.target.closest('[data-admrx]'))d.classList.remove('show')};d.onkeydown=null}
// 不能做的按钮置灰（不隐藏：让人知道有这个功能、需要谁来做）
function admMark(root){(root||document).querySelectorAll('[data-udgo],[data-udop],[data-udg],[data-act],[data-rkst],[data-rkgo],[onclick="exportCSV()"],[data-adm],[data-udst]').forEach(b=>{
    let a=null;if(b.matches('[data-udst]')){const u=S.ud&&USERS.find(x=>x.id===S.ud);a=b.dataset.udst==='banned'||(u&&['banned','deleted'].includes(u.st))?'user.ban':'user.status'}else{const x=admAction(b);a=x&&x.a}
    if(!a)return;const ok=admCan(a);b.classList.toggle('noperm',!ok);if(!ok)b.title='需要'+admNeed(a);else if(b.classList.contains('noperm'))b.removeAttribute('title')})}
new MutationObserver(()=>{clearTimeout(window._admm);window._admm=setTimeout(()=>admMark(),0)}).observe(document.body,{childList:true,subtree:true});
// 只读：导航只留统计页
const _admDrawNav=drawNav;drawNav=function(){if(S.role==='viewer'&&!VIEWER_PAGES.has(S.page))S.page='overview';_admDrawNav();if(S.role==='viewer')document.querySelectorAll('#nav [data-pg]').forEach(b=>{if(!VIEWER_PAGES.has(b.dataset.pg))b.remove()});
  document.querySelectorAll('#nav .navh').forEach(h=>{let n=h.nextElementSibling,any=false;while(n&&!n.classList.contains('navh')){any=true;n=n.nextElementSibling}h.style.display=any?'':'none'})};
// 只读：统计页里出现的昵称一律换成「某球友」（与数据库 nbq_viewer 读不到球友表一致）
let ADM_NAMES=null;const admMask=()=>{if(!ADM_NAMES){const ns=[...new Set(USERS.map(u=>u.name))].filter(n=>n&&n.length>1).sort((a,b)=>b.length-a.length).map(n=>n.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'));ADM_NAMES=new RegExp(ns.join('|'),'g')}
  const w=document.createTreeWalker(document.getElementById('page'),NodeFilter.SHOW_TEXT);let n;while((n=w.nextNode())){if(ADM_NAMES.test(n.nodeValue)){ADM_NAMES.lastIndex=0;n.nodeValue=n.nodeValue.replace(ADM_NAMES,'某球友')}ADM_NAMES.lastIndex=0}
  document.querySelectorAll('#page .a').forEach(a=>{a.textContent='·'})};
const _admRender=render;render=function(){const r=_admRender.apply(this,arguments);if(S.role==='viewer')admMask();return r};
// 登录：演示身份
const _admLogin=doLogin;doLogin=function(e){const sel=document.getElementById('demoRole');S.role=(sel&&sel.value)||'owner';
  const me=document.querySelector('.side .me');if(me){me.querySelector('b').textContent=admWho();me.querySelector('small').textContent=ROLE_NAME[S.role];me.querySelector('.av').textContent=admWho()[0]}
  const r=_admLogin(e);if(S.audit[0]&&S.audit[0][1]==='login')S.audit[0][0]=admWho();render();return r};

/* ---------------- 城市（地区扩展 R4） ----------------
 * 与数据库 cities（key、名称、网址、状态）相同；区 / 球场 / 球友 / 球局 / 开放时通知我的数量是演示（墨尔本按本页数据算）。
 * 真实环境：城市页读 admin_city_overview()、city_checklist()；改状态 admin_city_status()；导出名单 admin_city_waitlist()；标记已通知 admin_city_waitlist_done()。
 * 顶部城市筛选：两个以上城市试运行 / 正式后才出现；真实环境各页面的接口带 ?city=（统计函数的 p_city）。演示数据只有墨尔本。 */
var CITY_ADM=[
 {key:'melb',zh:'墨尔本',slug:'melbourne',status:'on',beta:'2026-09-01',community:'https://nanbanqiu.app/community',wl:0,wlp:0},
 {key:'syd',zh:'悉尼',slug:'sydney',status:'off',wl:37,wlp:37},
 {key:'bne',zh:'布里斯班',slug:'brisbane',status:'off',wl:12,wlp:12},
 {key:'per',zh:'珀斯',slug:'perth',status:'off',wl:9,wlp:9},
 {key:'adl',zh:'阿德莱德',slug:'adelaide',status:'off',wl:5,wlp:5},
 {key:'cbr',zh:'堪培拉',slug:'canberra',status:'off',wl:3,wlp:3}];
var CITY_ST={off:'未开放',prep:'筹备',beta:'试运行',on:'正式'},CITY_ORDER=['off','prep','beta','on'];
S.city=S.city||'all';
function cityCounts(c){if(c.key!=='melb')return {sub:c.sub||0,ven:c.ven||0,players:0,games:0};
  return {sub:669,ven:VENUES.filter(v=>v[6]!=='pending').length,players:USERS.length,games:Math.round(USERS.length*1.6)}}
function cityChecklist(c){const n=cityCounts(c),d=c.beta?Math.floor((Date.now()-new Date(c.beta))/864e5):-1;
  return [['suburbs','区数据已导入（至少 20 个区）',n.sub>=20,'beta',n.sub],['venues','球场已收录（至少 10 个）',n.ven>=10,'beta',n.ven],['basics','时区、中心、网址、默认位置、分享话题',true,'prep'],
    ['community','当地社群链接',!!c.community,'on'],['beta14','试运行满 14 天',d>=14,'on',d>=0?d+' 天':'']]}
const cityPill=st=>`<span class="pill ${st==='on'?'g':st==='beta'||st==='prep'?'w':'nodot'}">${CITY_ST[st]}</span>`;
function pageCities(){const pick=CITY_ADM.find(c=>c.key===S.cityPick)||CITY_ADM[0],need={prep:'进入筹备前',beta:'进入试运行前',on:'正式开放前'};
  const rows=CITY_ADM.map(c=>{const n=cityCounts(c),ck=cityChecklist(c),okN=ck.filter(x=>x[2]).length,i=CITY_ORDER.indexOf(c.status),nx=CITY_ORDER[i+1],pv=CITY_ORDER[i-1];
    return `<tr${c.key===pick.key?' class="sel"':''}><td><b data-cypick="${c.key}" style="cursor:pointer" title="看检查清单">${esc(c.zh)}</b><br><small class="mono" style="color:var(--mut)">/${esc(c.slug)}</small></td><td>${cityPill(c.status)}</td>
      <td class="r num">${fmt(n.sub)}</td><td class="r num">${fmt(n.ven)}</td><td class="r num">${fmt(n.players)}</td><td class="r num">${fmt(n.games)}</td>
      <td class="r num">${c.wl?`${fmt(c.wlp)}<small style="color:var(--mut)"> / ${fmt(c.wl)}</small>`:'—'}</td><td class="r">${okN} / ${ck.length}</td>
      <td><div class="rowacts">${nx?`<button class="btn sm" data-adm="cyst" data-city="${c.key}" data-to="${nx}" data-label="${esc(c.zh)}：改为${CITY_ST[nx]}">改为${CITY_ST[nx]}</button>`:''}${pv?`<button class="btn sm" data-adm="cyst" data-city="${c.key}" data-to="${pv}" data-label="${esc(c.zh)}：退回${CITY_ST[pv]}">退回</button>`:''}
      ${c.wlp&&['beta','on'].includes(c.status)?`<button class="btn sm" data-adm="cywl" data-city="${c.key}" data-label="导出${esc(c.zh)}「开放时通知我」名单">导出名单</button><button class="btn sm" data-adm="cywd" data-city="${c.key}" data-label="${esc(c.zh)}：标记已通知">标记已通知</button>`:''}</div></td></tr>`}).join('');
  const ck=cityChecklist(pick);
  return `${S.city!=='all'&&S.city!=='melb'?`<div class="card" style="margin-bottom:14px"><small style="color:var(--mut)">演示数据只有墨尔本；真实环境各页面按所选城市读取。</small></div>`:''}<div class="grid g12"><div class="card" style="grid-column:1/-1"><div class="ch"><b>城市</b><small>每个城市一个网址 nanbanqiu.app/城市；没开放的城市打开显示「即将开放」，可以留邮箱</small></div>
  <table><thead><tr><th>城市</th><th>状态</th><th class="r">区</th><th class="r">球场</th><th class="r">球友</th><th class="r">近 30 天球局</th><th class="r">开放时通知我<br><small>待通知 / 登记</small></th><th class="r">上线检查</th><th></th></tr></thead><tbody>${rows}</tbody></table>
  <p style="font-size:12px;color:var(--mut);margin-top:10px">未开放 → 筹备（只有管理员能看，导入区和球场）→ 试运行（能注册能用，首页标「试运行」）→ 正式。往前每一步要过检查清单，往回随时可以退。改状态、导出名单只有超级管理员，要写理由；名单在试运行或正式之后才能导出，发完通知点「标记已通知」，30 天后自动删除。</p></div>
  <div class="card" style="grid-column:1/-1"><div class="ch"><b>上线检查清单</b><small>${esc(pick.zh)} · ${cityPill(pick.status)}</small></div><table><tbody>${ck.map(x=>`<tr><td>${x[2]?'<span style="color:var(--g)">✓</span>':'<span style="color:var(--line)">—</span>'} ${esc(x[1])}${x[4]!==undefined&&x[4]!==''?` <small style="color:var(--mut)">现在 ${esc(String(x[4]))}</small>`:''}</td><td class="r"><small style="color:var(--mut)">${need[x[3]]}</small></td></tr>`).join('')}</tbody></table>
  <p style="font-size:12px;color:var(--mut);margin-top:10px">网址：<span class="mono">nanbanqiu.app/${esc(pick.slug)}</span> · 社群链接：${pick.community?`<span class="mono">${esc(pick.community)}</span>`:'未填'}</p></div></div>`}
// 城市操作（理由已填）：演示里按同一份检查清单拦下，记操作日志
function cityAct(el,reason){const c=CITY_ADM.find(x=>x.key===el.dataset.city);if(!c)return;const k=el.dataset.adm;
  if(k==='cyst'){const to=el.dataset.to,up=CITY_ORDER.indexOf(to)>CITY_ORDER.indexOf(c.status);
    if(up){const miss=cityChecklist(c).filter(x=>!x[2]&&CITY_ORDER.indexOf(x[3])<=CITY_ORDER.indexOf(to));if(miss.length){admToast(ADMIN_ERR.admin_city_not_ready+'：'+miss.map(x=>x[1]).join('；'));return}}
    if(to==='beta'&&c.status!=='beta')c.beta=new Date().toISOString().slice(0,10);c.status=to;S.audit.unshift([admWho(),'city.manage',`${c.zh} → ${CITY_ST[to]} · 理由：${reason}`,'刚刚']);render();return}
  if(k==='cywl'){S.audit.unshift([admWho(),'city.waitlist',`${c.zh} · 导出 ${c.wlp} 个邮箱 · 理由：${reason}`,'刚刚']);admToast(`已导出 ${c.wlp} 个邮箱（演示；真实环境下载 CSV）`);render();return}
  if(k==='cywd'){S.audit.unshift([admWho(),'city.waitlist',`${c.zh} · 标记已通知 ${c.wlp} 个 · 理由：${reason}`,'刚刚']);c.wlp=0;render()}}
addEventListener('click',e=>{const a=e.target.closest&&e.target.closest('[data-cypick]');if(a){S.cityPick=a.dataset.cypick;render()}});
// 顶部城市筛选：两个以上城市试运行 / 正式后出现
function citySel(){const sel=document.getElementById('citySel');if(!sel)return;const open=CITY_ADM.filter(c=>['beta','on'].includes(c.status));
  if(open.length<2){sel.style.display='none';S.city='all';return}
  sel.style.display='';sel.innerHTML=`<option value="all">全部城市</option>`+open.map(c=>`<option value="${c.key}">${esc(c.zh)}</option>`).join('');sel.value=open.some(c=>c.key===S.city)?S.city:'all';S.city=sel.value;
  sel.onchange=()=>{S.city=sel.value;render()}}
const _cityRender=render;render=function(){const r=_cityRender.apply(this,arguments);citySel();return r};
