/* =====================================================================
 * 真数据 · 球友详情与处理（#27 第 4 步）。只在真模式生效；演示模式仍走 0050 的 openUD。
 *   打开：球友列表点一行 → GET /users/detail?no=；处理：改状态 / 重置昵称头像 / 性别 / 看完整手机号 → POST 后立刻重读（以服务器为准，不在本地改）。
 *   复用演示抽屉的容器 #ud 和样式，但动作属性用 data-rux（演示的 data-ud* 由 0050 / 0220 的全局监听接管，不能混用）。
 *   按钮按 /me 返回的权限置灰（服务端照样拦）；封禁、恢复已封禁 / 已注销的账号只有 owner。
 * ===================================================================== */
const RUD={no:null,d:null,err:null,loading:false,busy:false,pick:null,code:'',days:7,phone:null,gen:0};
const RUD_RC=[['harass','骚扰 / 不当言论'],['no_show','多次爽约'],['reported','被多人举报'],['gender_fake','冒用女生身份'],['spam','发广告 / 推销'],['fake_profile','资料不实'],['pact_violation','违反球友约定'],['other','其他']];
const realCan=a=>!!(RL.me&&Array.isArray(RL.me.perms)&&RL.me.perms.some(p=>p.action===a));
const rudNeed=(to,from)=>to==='banned'||['banned','deleted'].includes(from)?'user.ban':'user.status';
const rudDis=a=>realCan(a)?'':` disabled title="需要${esc(admNeed(a))}"`;
function rudOpen(no){Object.assign(RUD,{no,d:null,err:null,pick:null,code:'',days:7,phone:null});let w=document.getElementById('ud');
  if(!w){w=document.createElement('div');w.id='ud';document.body.appendChild(w)}rudPaint();requestAnimationFrame(()=>w.classList.add('show'));rudLoad()}
function rudClose(){const w=document.getElementById('ud');w&&w.classList.remove('show');RUD.no=null;RUD.d=null}
async function rudLoad(){const g=++RUD.gen,no=RUD.no;RUD.loading=true;const r=await admApi('GET','/users/detail?no='+no);
  if(g!==RUD.gen||RUD.no!==no)return;RUD.loading=false;                                         // 期间换了人 / 关了：丢掉旧结果
  if(r.status===401)return toLogin('登录已过期，请重新登录');
  if(r.ok&&r.body&&r.body.user&&Array.isArray(r.body.log)){RUD.d=r.body;RUD.err=null}else RUD.err=r.status===404?'找不到这位球友（可能不在你负责的城市）':realErr(r);
  rudPaint()}
function rudPaint(){const w=document.getElementById('ud');if(!w||RUD.no==null)return;
  w.innerHTML=`<div class="ud-bg" data-rux="x"></div><aside class="ud" data-rud-panel>${rudHTML()}</aside>`;w.classList.add('show')}
function rudHTML(){const x=`<button class="ud-x" data-rux="x" aria-label="关闭">×</button>`;
  if(!RUD.d)return `<div class="ud-h"><b>#${String(RUD.no).padStart(4,'0')}</b>${x}</div><p class="cap">${RUD.err?esc(RUD.err)+' <button class="btn sm" data-rux="reload">重试</button>':'读取中…'}</p>`;
  const u=RUD.d.user,nm=esc(u.nickname)+(u.last_initial?' '+esc(u.last_initial)+'.':''),busy=RUD.busy?' disabled':'';
  const k=[['UTR',utpUtr(u)],['等级','L'+u.level],['发起 / 参加',u.hosted+' / '+u.joined],['被举报',u.reported_open?`<span style="color:var(--crit)">${u.reported_open} 待处理</span> / ${u.reported}`:String(u.reported)]];
  const seg=UST_ORDER.filter(s=>s!=='deleted').map(s=>`<button class="${(RUD.pick||u.status)===s?'on':''}" data-rux="st" data-v="${s}"${s===u.status?'':rudDis(rudNeed(s,u.status))}${busy}>${UST[s][0]}</button>`).join('');
  const to=RUD.pick&&RUD.pick!==u.status?RUD.pick:null;
  const form=!to?'':`<div class="ud-f"><div class="ud-fl">改为「${UST[to][0]}」 · ${esc(UST[to][2])}</div>
    ${to==='active'?'':`<label>原因</label><div class="chips">${RUD_RC.map(([c,l])=>`<button class="${RUD.code===c?'on':''}" data-rux="rc" data-v="${c}">${l}</button>`).join('')}</div>`}
    ${to==='suspended'?`<label>时长</label><div class="chips">${DURS.map(([n,l])=>`<button class="${RUD.days===n?'on':''}" data-rux="days" data-v="${n}">${l}</button>`).join('')}</div>`:''}
    <label>理由（必填，至少 4 个字；记进操作日志，本人看不到）</label><input class="search" id="rudWhy" maxlength="200" style="width:100%" placeholder="比如：举报已核实，聊天里多次骚扰">
    <p class="cap">${to==='active'?'会通知本人「账号已恢复正常」':'会通知本人状态和原因，本人可以申诉'}</p>
    <div class="admr-e" id="rudErr"></div>
    <div style="display:flex;gap:8px;margin-top:10px"><button class="btn p" data-rux="go"${busy}>${RUD.busy?'提交中…':'确认'}</button><button class="btn" data-rux="cancel"${busy}>取消</button></div></div>`;
  const ops=[['nickname','重置昵称','user.reset'],['avatar','重置头像','user.reset'],['gclear','清除性别（让本人重新确认）','user.gender']].concat(u.m2f_used?[['gunlock','解除「男改女」限制','user.gender']]:[]);
  const log=RUD.d.log.map(l=>`<tr><td>${esc(UST[l.to_status]?UST[l.to_status][0]:l.to_status)}${l.duration_days?` ${l.duration_days} 天`:''}</td><td>${esc(l.reason||'')}${l.note?`<br><small style="color:var(--mut)">${esc(l.note)}</small>`:''}</td><td>${esc(l.by_name||'系统')}</td><td>${esc(rpAgo(l.created_at))}</td></tr>`).join('');
  return `<div class="ud-h"><div class="who"><b style="font-size:18px">${nm}</b><small style="color:var(--mut)">#${String(u.member_no).padStart(4,'0')} · ${esc(realCity(u.city))} · 注册 ${upDate(u.created_at)} · 最近活跃 ${upDate(u.last_active_at)}</small></div>${x}</div>
  <div class="ud-id"><span class="pill ${UST[u.status]?UST[u.status][1]:''}">${esc(UST[u.status]?UST[u.status][0]:u.status)}</span>${u.status==='suspended'&&u.status_until?`<small>到 ${upDate(u.status_until)}</small>`:''}
    <span class="mono">${esc(u.phone_tail||'')}</span>${RUD.phone?`<span class="pill nodot mono" title="已记进操作日志">${esc(RUD.phone)}</span>`:`<button class="btn sm" data-rux="phone"${rudDis('phone.reveal')}>看完整号码</button>`}</div>
  <div class="ud-k">${k.map(([a,b])=>`<div><small>${a}</small><b>${b}</b></div>`).join('')}</div>
  <div class="ud-sec"><b>账号状态</b><div class="ud-st">${seg}</div>${form}</div>
  <div class="ud-sec"><b>处理资料</b><div class="ud-ops">${ops.map(([k2,l,a])=>`<button class="btn sm" data-rux="op" data-v="${k2}"${rudDis(a)}${busy}>${l}</button>`).join('')}</div>
    <p class="cap">性别：${esc(u.gender==='f'?'女':u.gender==='m'?'男':'未确认')}${u.gender_review?' · 待核实':''}${u.m2f_used?' · 已用过一次「男改女」':''}</p></div>
  <div class="ud-sec"><b>状态记录</b>${log?`<table><tbody>${log}</tbody></table>`:'<p class="cap">还没有变更过。</p>'}</div>`}
// 写操作：一律「提交 → 重读详情 + 列表」，失败给人话
async function rudPost(path,body,okText){if(RUD.busy)return false;RUD.busy=true;rudPaint();
  const r=await admApi('POST',path,{no:RUD.no,...body});RUD.busy=false;
  if(r.status===401){toLogin('登录已过期，请重新登录');return false}
  if(!r.ok){const m=r.error==='state_changed'?'状态刚被别人改过，已刷新':r.status===404?'找不到这位球友（可能不在你负责的城市）':realErr(r);admToast(m);if(r.error==='state_changed'){RUD.pick=null;rudLoad()}else rudPaint();return false}
  admToast(okText);RUD.pick=null;await rudLoad();UP.loaded=false;if(RL.me&&S.page==='users')upLoad(false);return r}
function rudGo(){const u=RUD.d&&RUD.d.user,to=RUD.pick;if(!u||!to||to===u.status)return;
  const why=($('#rudWhy')||{}).value?.trim()||'',e=$('#rudErr'),say=m=>{if(e)e.textContent=m};
  if(to!=='active'&&!RUD.code)return say('请选原因');
  if(why.length<4)return say(ADMIN_ERR.admin_reason_required);
  rudPost('/users/status',{status:to,reason:why,reason_code:to==='active'?null:RUD.code,days:to==='suspended'?RUD.days:null},'已改为「'+UST[to][0]+'」')}
function rudOp(k){const L={nickname:['重置昵称','/users/reset',{what:'nickname'},'已重置昵称'],avatar:['重置头像','/users/reset',{what:'avatar'},'已重置头像'],
    gclear:['清除性别','/users/gender',{action:'clear'},'已清除性别'],gunlock:['解除「男改女」限制','/users/gender',{action:'unlock'},'已解除限制']}[k];if(!L)return;
  admAskReason(L[0],reason=>rudPost(L[1],{...L[2],reason},L[3]))}
function rudPhone(){admAskReason('查看完整手机号',async reason=>{const r=await rudPost('/users/phone',{reason},'已显示（已记进操作日志）');if(r&&r.body&&r.body.phone){RUD.phone=r.body.phone;rudPaint()}})}
if(NBQ_MODE==='real'){REAL_RESET.push(()=>rudClose());
  document.addEventListener('click',e=>{const t=e.target;if(!t.closest)return;
    const row=t.closest('tr[data-rud]');if(row){rudOpen(+row.dataset.rud);return}
    const b=t.closest('[data-rux]');if(!b||b.disabled)return;const k=b.dataset.rux,v=b.dataset.v;
    if(k==='x')return rudClose();if(k==='reload'){RUD.err=null;rudPaint();return rudLoad()}
    if(k==='st'){RUD.pick=v;RUD.code='';RUD.days=7;return rudPaint()}
    if(k==='rc'){RUD.code=v;const why=$('#rudWhy')?.value;rudPaint();if(why)$('#rudWhy').value=why;return}
    if(k==='days'){RUD.days=+v;const why=$('#rudWhy')?.value;rudPaint();if(why)$('#rudWhy').value=why;return}
    if(k==='cancel'){RUD.pick=null;return rudPaint()}
    if(k==='go')return rudGo();if(k==='op')return rudOp(v);if(k==='phone')return rudPhone()});
  document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target&&e.target.id==='rudWhy'&&nbqImeEnterAdm(e))rudGo();if(e.key==='Escape')RUD.no=null})}
