/* =====================================================================
 * 真数据 · 管理员（#27 第 4 步）：管理员名单（owner：改角色 / 负责城市 / 停用恢复）+ 操作日志（owner、运营）。
 *   新增管理员不在网页做：本机运行 tools/admin_create.mjs（密码由本人输入、不经过网络）。所有改动必须填理由，提交后重读。
 * ===================================================================== */
const RA={d:null,err:null,loading:false,busy:false,edit:null,log:null,lerr:null,lmore:false,lloading:false,act:''};
const RA_CAT=[['','全部'],['login','登录'],['user','球友'],['phone','手机号'],['report','举报'],['message','消息'],['venue','球场'],['risk','风险'],['rules','规则'],['admin','管理员'],['city','城市'],['data','导出'],['sideline','场边配置']];
async function raLoad(){if(RA.loading)return;RA.loading=true;const r=await admApi('GET','/admins');RA.loading=false;
  if(r.status===401)return toLogin('登录已过期，请重新登录');
  if(r.ok&&r.body&&Array.isArray(r.body.admins)){RA.d=r.body;RA.err=null}else RA.err=realErr(r);if(RL.me&&S.page==='admin')render()}
async function raLog(more){if(RA.lloading)return;RA.lloading=true;const last=more&&RA.log&&RA.log.length?RA.log[RA.log.length-1].id:'';
  const r=await admApi('GET','/audit?action='+encodeURIComponent(RA.act)+(last?'&before='+last:''));RA.lloading=false;
  if(r.status===401)return toLogin('登录已过期，请重新登录');
  if(r.ok&&r.body&&Array.isArray(r.body.rows)){RA.log=more?RA.log.concat(r.body.rows):r.body.rows;RA.lmore=!!r.body.more;RA.lerr=null}else RA.lerr=realErr(r);
  if(RL.me&&S.page==='admin')render()}
async function raPost(path,body,ok){if(RA.busy)return;RA.busy=true;render();const r=await admApi('POST',path,body);RA.busy=false;
  if(r.status===401)return toLogin('登录已过期，请重新登录');
  if(!r.ok){admToast(r.error==='admin_last_owner'?'至少要保留一位超级管理员，也不能停用自己':r.error==='invalid'?'超级管理员不能限城市；城市必须是已有的':realErr(r));return render()}
  admToast(ok);RA.edit=null;RA.d=null;RA.log=null;raLoad();raLog(false)}
const raAct=a=>{const p=ADMIN_PERMS.find(x=>x[0]===a);return p?p[1]:({login:'登录',logout:'退出','sideline.config':'场边配置'})[a]||a};
function raDetail(x){const d=x.detail||{},bits=[];
  for(const [k,l] of [['to','改为'],['status','状态'],['action','操作'],['what','重置'],['role','角色'],['days','天数'],['dataset','数据集']])if(d[k]!=null&&d[k]!=='')bits.push(l+' '+(k==='to'||k==='status'?(UST[d[k]]?UST[d[k]][0]:RK_ST[d[k]]||d[k]):k==='role'?(ROLE_NAME[d[k]]||d[k]):d[k]));
  if(d.disable!=null)bits.push(d.disable?'停用':'恢复');if(d.hide!=null)bits.push(d.hide?'隐藏':'恢复显示');if(d.cities!==undefined)bits.push('城市 '+(d.cities?d.cities.map(realCity).join('、'):'全部'));
  if(d.reason)bits.push('理由：'+d.reason);return bits.join(' · ')}
function raLogCard(){if(!realCan('audit.view'))return '';if(!RA.log&&!RA.lerr&&!RA.lloading)raLog(false);
  const chips=RA_CAT.map(([k,l])=>`<button class="btn sm${RA.act===k?' p':''}" data-ra="cat" data-v="${k}">${l}</button>`).join('');
  return `<div class="card"><div class="ch"><b>操作日志</b><small>只追加、不能改；每页 100 条</small><button class="btn sm" data-ra="logreload" style="margin-left:auto">刷新</button></div>
  <div class="rowacts" style="margin:6px 0;flex-wrap:wrap">${chips}</div>
  ${RA.lerr?`<p class="cap" style="color:var(--crit)">${esc(RA.lerr)} <button class="btn sm" data-ra="logreload">重试</button></p>`:''}
  ${!RA.log?'<p class="cap">读取中…</p>':RA.log.length?`<table><thead><tr><th>时间</th><th>谁</th><th>做了什么</th><th>对象</th><th>详情</th></tr></thead><tbody>${RA.log.map(x=>`<tr><td><small>${esc(new Date(x.at).toLocaleString('zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}))}</small></td><td>${esc(x.admin_name||'—')}</td><td>${esc(raAct(x.action))}<br><small class="mono" style="color:var(--mut)">${esc(x.action)}</small></td><td class="mono"><small>${esc(String(x.target||'').slice(0,40))}</small></td><td><small>${esc(raDetail(x))}</small></td></tr>`).join('')}</tbody></table>`:'<div class="empty">这一类还没有记录</div>'}
  ${RA.lmore?`<div class="rowacts" style="margin-top:8px"><button class="btn sm" data-ra="logmore"${RA.lloading?' disabled':''}>更早的 100 条</button></div>`:''}</div>`}
function raListCard(){if(!realCan('admin.manage'))return `<div class="card"><div class="ch"><b>管理员</b></div><p class="cap">管理员名单和权限设置只有超级管理员能看。</p></div>`;
  if(!RA.d&&!RA.err&&!RA.loading)raLoad();
  if(!RA.d)return `<div class="card"><div class="ch"><b>管理员</b><small>${RA.err?esc(RA.err):'读取中…'}</small></div>${RA.err?'<button class="btn sm" data-ra="reload">重试</button>':''}</div>`;
  const h=RA.d.health,me=RA.d.me,b=RA.busy?' disabled':'',e=RA.edit;
  const warn=[h.owners<2?`超级管理员只有 ${h.owners} 位（建议至少 2 位，一位出事另一位还能管）`:'',h.low_recovery?`${h.low_recovery} 位的恢复码少于 3 个，请重新生成`:''].filter(Boolean);
  const cityEd=a=>`<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center">${RA.d.cities.map(c=>`<label><input type="checkbox" data-racity="${esc(c.key)}"${a.cities&&a.cities.includes(c.key)?' checked':''}> ${esc(c.name_zh)}</label>`).join('')}<small style="color:var(--mut)">都不勾 = 全部城市</small></div>
    <input class="search" id="raWhy" maxlength="200" placeholder="理由（必填）" style="width:180px;margin-top:6px"> <button class="btn sm p" data-ra="savecity" data-id="${esc(a.id)}"${b}>保存</button><button class="btn sm" data-ra="unedit">取消</button>`;
  const row=a=>`<tr${a.disabled?' style="opacity:.55"':''}><td><b style="font-weight:600">${esc(a.name)}</b>${a.id===me?' <small>（你）</small>':''}<br><small style="color:var(--mut)">${esc(a.email)}</small></td>
    <td>${a.disabled?esc(ROLE_NAME[a.role]||a.role):`<select data-rarole="${esc(a.id)}"${b}>${['owner','operator','viewer'].map(r=>`<option value="${r}"${a.role===r?' selected':''}>${ROLE_NAME[r]}</option>`).join('')}</select>`}</td>
    <td>${e===a.id?cityEd(a):`${a.cities?a.cities.map(c=>esc(realCity(c))).join('、'):'全部城市'}${a.role!=='owner'&&!a.disabled?` <button class="btn sm" data-ra="city" data-id="${esc(a.id)}">改</button>`:''}`}</td>
    <td><small>${a.last_login_at?esc(rpAgo(a.last_login_at)):'还没登录过'}</small></td>
    <td>${a.disabled?`<small style="color:var(--mut)">已停用${a.disabled_reason?'：'+esc(a.disabled_reason):''}</small><br><button class="btn sm" data-ra="enable" data-id="${esc(a.id)}"${b}>恢复</button>`:a.id===me?'':`<button class="btn sm" data-ra="disable" data-id="${esc(a.id)}"${b}>停用</button>`}</td></tr>`;
  return `<div class="card"><div class="ch"><b>管理员</b><small>${h.active_admins} 位在用 · ${h.live_sessions} 个登录中的会话</small></div>
  ${warn.map(w=>`<p class="cap" style="color:var(--crit)">${esc(w)}</p>`).join('')}
  <table><thead><tr><th>管理员</th><th>角色</th><th>负责城市</th><th>最近登录</th><th></th></tr></thead><tbody>${RA.d.admins.map(row).join('')}</tbody></table>
  <p class="cap">新增管理员：在你自己的电脑上运行 <span class="mono">node tools/admin_create.mjs --email=… --name=… --role=operator</span>，把打印的 SQL 在数据库里执行（密码由本人输入，不经过网络）。停用会立刻让他退出登录。</p></div>`}
function realAdminPage(){return raListCard()+raLogCard()}
if(NBQ_MODE==='real'){REAL_PAGES.admin=()=>realAdminPage();REAL_RESET.push(()=>Object.assign(RA,{d:null,err:null,loading:false,busy:false,edit:null,log:null,lerr:null,lmore:false,lloading:false,act:''}));
  document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-ra]');if(!b||b.disabled)return;const k=b.dataset.ra,id=b.dataset.id;
    if(k==='reload'){RA.err=null;render();return raLoad()}
    if(k==='cat'){RA.act=b.dataset.v;RA.log=null;render();return raLog(false)}
    if(k==='logreload'){RA.log=null;RA.lerr=null;render();return raLog(false)}
    if(k==='logmore')return raLog(true);
    if(k==='city'){RA.edit=id;return render()}if(k==='unedit'){RA.edit=null;return render()}
    if(k==='savecity'){const why=($('#raWhy')||{}).value?.trim()||'';if(why.length<4)return admToast(ADMIN_ERR.admin_reason_required);
      const cs=[...document.querySelectorAll('[data-racity]:checked')].map(x=>x.dataset.racity);return raPost('/admins/cities',{id,cities:cs.length?cs:null,reason:why},'已改负责城市')}
    if(k==='disable'||k==='enable')admAskReason(k==='disable'?'停用这位管理员（会立刻退出登录）':'恢复这位管理员',reason=>raPost('/admins/update',{id,disable:k==='disable',reason},k==='disable'?'已停用':'已恢复'))});
  document.addEventListener('change',e=>{const s=e.target.closest&&e.target.closest('[data-rarole]');if(!s)return;const id=s.dataset.rarole,to=s.value;
    admAskReason('把角色改为「'+ROLE_NAME[to]+'」',reason=>raPost('/admins/update',{id,role:to,reason},'已改角色'));
    setTimeout(()=>{if(!RA.busy)render()},0)})}                                   // 取消填理由时下拉框回到原值（以服务器为准）
