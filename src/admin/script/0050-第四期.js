/* =====================================================================
 * 第四期：完整排行（分页）· 用户状态体系 · 用户详情与管理
 * ===================================================================== */
// 用户状态：一个账号同一时间只有一种状态；每次变更都要写原因，自动通知本人，记入状态历史和审计日志
const UST={
  active:   ['正常','g','所有功能正常'],
  review:   ['待核实','w','被举报冒用身份 / 资料存疑：暂时看不到也不能报名女生局，其余正常；24 小时内人工核实'],
  limited:  ['受限','w','不能报名女生局、不能私信和邀约新球友；可以正常发起和申请普通球局'],
  suspended:['暂停','c','到期前不能发起、申请、邀约和发消息，可以登录查看；到期自动恢复'],
  banned:   ['封禁','c','不能登录；已报名的球局自动退出，发起的球局自动取消并通知其他人'],
  deleted:  ['已注销','','本人申请注销：30 天内可恢复，之后资料匿名化，只保留统计数据'],
};
const UST_ORDER=['active','review','limited','suspended','banned','deleted'];
const REASONS=['多次爽约','被多人举报','冒用女生身份','骚扰 / 不当言论','发广告 / 推销','资料不实','其他'];
const DURS=[[1,'1 天'],[3,'3 天'],[7,'7 天'],[30,'30 天'],[90,'90 天'],[180,'180 天']];
// 原型：补到 220 位球友，并给一部分人不同状态
(function(){const F=['Alice','Bob','Cindy','Dylan','Eason','Fiona','George','Hannah','Ian','Joy','Ken','Lucy','Max','Nora','Owen','Penny','Quinn','Ray','Sophie','Tony','Una','Vince','Wen','Xavier','Yvonne','Zack','Aaron','Bella','Carl','Daisy'];
  const n0=USERS.length;for(let i=n0;i<220;i++){const b=USERS[i%n0],nm=F[i%F.length]+' '+'ABCDEFGHJKLMNPRSTWXYZ'[(i*7)%21]+'.';
    const u={...b,id:'u'+(i+1),no:Math.round(30+rnd()*2400),name:nm,sub:pick(SUBURBS.map(s=>s[0]),SUBURBS.map(s=>s[1])),utr:+(1.5+rnd()*8.5).toFixed(1),col:COLORS[i%8][2],last:Math.round(rnd()*rnd()*30*1440),src:pick(SRC,SRCW),played:Math.round(rnd()*rnd()*90)+1,att:.8+rnd()*.2};
    u.uid=`${hex(8)}-${hex(4)}-4${hex(3)}-${'89ab'[Math.floor(rnd()*4)]}${hex(3)}-${hex(12)}`;
    const a=rnd();u.w={hostOk:Math.round(a*a*4),play:Math.round(a*6),apply:Math.round(a*7),inv:Math.round(a*a*4),imp:Math.round(a*8),days:1+Math.floor(a*6),noshow:rnd()<.08?1:0};USERS.push(u)}
  USERS.forEach(u=>{u.st='active';u.hist=[]});
  const set=(i,st,why,by,ago,until)=>{const u=USERS[i];u.st=st;u.why=why;u.until=until||null;u.hist.unshift({st,why,by,at:ago})};
  set(10,'limited','多次爽约','系统 · 风险分 72','2 天前');set(14,'suspended','骚扰 / 不当言论','Han','昨天','10/9');set(23,'banned','发广告 / 推销','Amy','9/21');
  set(29,'review','冒用女生身份','系统 · 举报','3 小时前');set(41,'review','资料不实','系统 · 举报','5 小时前');set(57,'limited','被多人举报','Amy','9/28');
  set(66,'deleted','本人申请注销','本人','9/30');set(88,'suspended','多次爽约','Han','10/1','10/8');set(120,'banned','冒用女生身份','Han','9/12');set(150,'deleted','本人申请注销','本人','9/25');
  USERS.forEach(u=>u.status=u.st==='active'||u.st==='review'?'ok':u.st);})();
const stPill=u=>{const s=UST[u.st];return `<span class="pill ${s[1]}">${s[0]}${u.until?` · 至 ${u.until}`:''}</span>`};

/* ---------- 分页 ---------- */
S.pg=S.pg||{};
function pager(key,total,size=20){const pages=Math.max(1,Math.ceil(total/size));let p=Math.min(S.pg[key]||1,pages);S.pg[key]=p;
  const from=(p-1)*size,to=Math.min(total,from+size);
  const html=pages<=1?'':`<div class="pager"><span>第 ${from+1}–${to} 条 · 共 ${total} 条</span><div><button class="btn sm" data-pgk="${key}" data-pgv="${p-1}" ${p<=1?'disabled':''}>‹ 上一页</button><b>${p} / ${pages}</b><button class="btn sm" data-pgk="${key}" data-pgv="${p+1}" ${p>=pages?'disabled':''}>下一页 ›</button></div></div>`;
  return {from,to,html}}
document.addEventListener('click',e=>{const b=e.target.closest('[data-pgk]');if(!b||b.disabled)return;e.stopPropagation();S.pg[b.dataset.pgk]=+b.dataset.pgv;render();const c=document.getElementById('pg-'+b.dataset.pgk);c&&c.scrollIntoView({block:'start'})},true);

/* ---------- 用户表：点行打开详情；状态用新体系 ---------- */
function userTable(rows,compact,offset=0){if(rows.length&&!rows[0].u)rows=rows.map(u=>({u,s:ustat(u)}));
  return `<div style="overflow-x:auto"><table class="clk"><thead><tr><th>#</th><th>球友</th><th>用户 ID ${help('数据库 users.id（UUID）。点击复制完整 ID')}</th>${compact?'':'<th>区域</th><th class="r">UTR</th>'}<th class="r">打球</th><th class="r">发起成局</th><th class="r">申请</th>${compact?'':'<th class="r">邀约</th><th class="r">印象</th>'}<th class="r">活跃天数</th>${compact?'':'<th class="r">爽约</th>'}<th class="r">活跃分</th>${compact?'':'<th>最近活跃</th><th>状态</th>'}</tr></thead><tbody>
  ${rows.map(({u,s},i)=>`<tr data-ud="${u.id}"><td class="num" style="color:var(--mut)">${offset+i+1}</td><td><div class="who">${av(u)}<div><b>${esc(u.name)}</b><small class="num">编号 #${String(u.no).padStart(4,'0')}</small></div></div></td><td>${idCell(u)}</td>${compact?'':`<td>${esc(u.sub)}</td><td class="r num">${(+u.utr).toFixed(1)}</td>`}
    <td class="r num">${s.play}</td><td class="r num">${s.hostOk}</td><td class="r num">${s.apply}</td>${compact?'':`<td class="r num">${s.inv}</td><td class="r num">${s.imp}</td>`}<td class="r num">${s.days}</td>${compact?'':`<td class="r num" style="${s.noshow?'color:var(--crit)':''}">${s.noshow}</td>`}<td class="r num"><b>${s.score}</b></td>
    ${compact?'':`<td>${u.last<60?u.last+' 分钟前':u.last<1440?Math.round(u.last/60)+' 小时前':Math.round(u.last/1440)+' 天前'}</td><td>${stPill(u)}</td>`}</tr>`).join('')}</tbody></table></div>`}

document.addEventListener('click',e=>{const b=e.target.closest('[data-ust]');if(!b)return;e.stopPropagation();S.ust=b.dataset.ust;S.pg.users=1;render()},true);

/* ---------- 球场：完整排行 ---------- */

/* ---------- 用户详情抽屉 ---------- */
function openUD(id){const u=USERS.find(x=>x.id===id);if(!u)return;S.ud=id;let d=document.getElementById('ud');if(!d){d=document.createElement('div');d.id='ud';document.body.appendChild(d)}
  d.innerHTML=`<div class="ud-bg" data-udx></div><aside class="ud">${udHTML(u)}</aside>`;requestAnimationFrame(()=>d.classList.add('show'))}
function closeUD(){const d=document.getElementById('ud');d&&d.classList.remove('show');S.ud=null}
function udForm(u,st){const f=document.getElementById('udForm');if(st===u.st){f.innerHTML='';return}
  f.innerHTML=`<div class="ud-f"><div class="ud-fl">改为「${UST[st][0]}」 · ${UST[st][2]}</div>
    ${st==='active'?'':`<label>原因</label><div class="chips">${REASONS.map((r,i)=>`<button class="${i===0?'on':''}" data-udr="${r}">${r}</button>`).join('')}</div>`}
    ${st==='suspended'?`<label>时长</label><div class="chips">${DURS.map((x,i)=>`<button class="${i===2?'on':''}" data-udd="${x[0]}">${x[1]}</button>`).join('')}</div>`:''}
    <label>备注（只有管理员能看到）</label><input class="search" id="udNote" style="width:100%" placeholder="比如：举报 #r2，已核对聊天记录">
    <p class="cap">${st==='active'?'会通知本人「账号已恢复正常」':'会通知本人状态、原因和到期时间，本人可以在「我的 → 联系我们」申诉'}</p>
    <div style="display:flex;gap:8px;margin-top:10px"><button class="btn p" data-udgo="${st}">确认</button><button class="btn" data-udcancel>取消</button></div></div>`}
document.addEventListener('click',e=>{const t=e.target;
  const r=t.closest('tr[data-ud]');if(r&&!t.closest('[data-copy]')){openUD(r.dataset.ud);return}
  if(t.closest('[data-udx]')){closeUD();return}
  const u=S.ud&&USERS.find(x=>x.id===S.ud);if(!u)return;
  const st=t.closest('[data-udst]');if(st){document.querySelectorAll('[data-udst]').forEach(b=>b.classList.toggle('on',b===st));udForm(u,st.dataset.udst);return}
  const ch=t.closest('[data-udr],[data-udd]');if(ch){ch.parentElement.querySelectorAll('button').forEach(b=>b.classList.toggle('on',b===ch));return}
  if(t.closest('[data-udcancel]')){openUD(u.id);return}
  const go=t.closest('[data-udgo]');if(go){const s2=go.dataset.udgo,why=(document.querySelector('[data-udr].on')||{}).dataset?.udr||'',dd=+((document.querySelector('[data-udd].on')||{}).dataset?.udd||0),note=(document.getElementById('udNote')||{}).value||'';
    const until=s2==='suspended'&&dd?(()=>{const d=new Date();d.setDate(d.getDate()+dd);return `${d.getMonth()+1}/${d.getDate()}`})():null;
    u.st=s2;u.status=s2==='active'||s2==='review'?'ok':s2;u.why=why;u.until=until;u.hist.unshift({st:s2,why:s2==='active'?'人工恢复':why,by:'Han',at:'刚刚'});
    S.audit.unshift(['Han','user.'+s2,`${u.name} · ${u.uid.slice(0,8)}${why?' · '+why:''}${note?' · '+note:''}`,'刚刚']);render();openUD(u.id);return}
  const op=t.closest('[data-udop]');if(op){const k=op.dataset.udop,lab={name:'重置昵称',avatar:'重置头像',notify:'发送通知',restore:'恢复账号'}[k];
    if(k==='restore'){u.st='active';u.hist.unshift({st:'active',why:'恢复注销的账号',by:'Han',at:'刚刚'})}
    S.audit.unshift(['Han','user.'+k,`${u.name} · ${u.uid.slice(0,8)}`,'刚刚']);op.textContent='已'+lab.replace(/^重置|^清除|^发送|^恢复/,m=>m);op.disabled=true;if(k==='restore'){render();openUD(u.id)}}},true);
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeUD()});

