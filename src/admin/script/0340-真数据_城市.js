/* =====================================================================
 * 真数据 · 城市（#27 第 4 步，地区扩展 R4）：一览（状态、区 / 球场 / 球友 / 近 30 天球局 / 等候名单、上线检查清单）+
 *   owner 操作：改上线状态（往前要过清单，往回不检查）、改资料（社群链接、话题、中心地名）、导出「开放时通知我」名单（CSV）、标记已通知。全部要理由。
 * ===================================================================== */
const RC={d:null,err:null,loading:false,busy:false,edit:null};
const RC_ST={off:['未开放',''],prep:['准备中','w'],beta:['试运行','w'],on:['开放','g']},RC_ORDER=['off','prep','beta','on'];
async function rcLoad(){if(RC.loading)return;RC.loading=true;const r=await admApi('GET','/cities');RC.loading=false;
  if(r.status===401)return toLogin('登录已过期，请重新登录');
  if(r.ok&&r.body&&Array.isArray(r.body.cities)){RC.d=r.body.cities;RC.err=null}else RC.err=realErr(r);if(RL.me&&S.page==='cities')render()}
async function rcPost(path,body,ok){if(RC.busy)return null;RC.busy=true;render();const r=await admApi('POST',path,body);RC.busy=false;
  if(r.status===401){toLogin('登录已过期，请重新登录');return null}
  if(!r.ok){admToast(r.error==='admin_city_not_ready'?'还不能：检查清单里有没通过的项（或城市还没开放）':r.error==='invalid'?'填写的内容不对（社群链接要以 https:// 开头）':realErr(r));render();return null}
  if(ok)admToast(ok);RC.edit=null;RC.d=null;rcLoad();return r}
function rcCsv(city,rows){const csv='email,created_at\n'+rows.map(x=>`${String(x.email).replace(/[",\n]/g,'')},${x.created_at}`).join('\n');
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['﻿'+csv],{type:'text/csv'}));a.download=`waitlist_${city}.csv`;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},0)}
function realCitiesPage(){if(!RC.d&&!RC.err&&!RC.loading)rcLoad();
  if(!RC.d)return `<div class="card nodata"><h2>城市</h2><p>${RC.err?esc(RC.err)+' <button class="btn sm" data-rc2="reload">重试</button>':'读取中…'}</p></div>`;
  const own=realCan('city.manage'),wl=realCan('city.waitlist'),b=RC.busy?' disabled':'';
  const card=c=>{const i=RC_ORDER.indexOf(c.status),nx=RC_ORDER[i+1],pv=RC_ORDER[i-1],ck=Array.isArray(c.checklist)?c.checklist:[],ed=RC.edit===c.key;
    const acts=own?`${nx?`<button class="btn sm p" data-rc2="st" data-c="${c.key}" data-v="${nx}"${b}>改为「${RC_ST[nx][0]}」</button>`:''}${pv?`<button class="btn sm" data-rc2="st" data-c="${c.key}" data-v="${pv}"${b}>退回「${RC_ST[pv][0]}」</button>`:''}<button class="btn sm" data-rc2="edit" data-c="${c.key}">改资料</button>`:'';
    const wla=wl&&c.waitlist_pending&&['beta','on'].includes(c.status)?`<button class="btn sm" data-rc2="wl" data-c="${c.key}"${b}>导出 ${c.waitlist_pending} 个邮箱</button><button class="btn sm" data-rc2="wldone" data-c="${c.key}"${b}>标记已通知</button>`:'';
    const form=ed?`<div class="ud-f"><label>当地社群链接（https://…，可留空）</label><input class="search" id="rcUrl" style="width:100%" value="${esc(c.community_url||'')}">
      <label>分享话题</label><input class="search" id="rcTag" style="width:100%" value="${esc(c.hashtag||'')}"><label>中心地名（地图默认位置的说明）</label><input class="search" id="rcCtr" style="width:100%" value="${esc(c.center_label||'')}">
      <label>理由（必填）</label><input class="search" id="rcWhy" maxlength="200" style="width:100%"><div class="rowacts" style="margin-top:8px"><button class="btn sm p" data-rc2="save" data-c="${c.key}"${b}>保存</button><button class="btn sm" data-rc2="unedit">取消</button></div></div>`:'';
    return `<div class="card"><div class="ch"><b>${esc(c.name_zh)}</b><span class="pill ${RC_ST[c.status]?RC_ST[c.status][1]:''}">${esc(RC_ST[c.status]?RC_ST[c.status][0]:c.status)}</span><small>${c.launched_at?'开放于 '+upDate(c.launched_at):c.beta_at?'试运行于 '+upDate(c.beta_at):''}</small></div>
    <div class="ud-k">${[['区',c.suburbs],['球场',c.venues],['球友',c.players],['近 30 天球局',c.games_30d],['等候通知',c.waitlist_pending+' / '+c.waitlist]].map(([k,v])=>`<div><small>${k}</small><b>${v}</b></div>`).join('')}</div>
    <ul class="cap" style="margin:10px 0;padding-left:18px">${ck.map(x=>`<li>${x.ok?'✓':'✗'} ${esc(x.label)}${x.value!=null?`（现在 ${esc(String(x.value))}）`:''} <small style="color:var(--mut)">进入「${esc(RC_ST[x.need]?RC_ST[x.need][0]:x.need)}」前要过</small></li>`).join('')}</ul>
    <div class="rowacts" style="flex-wrap:wrap">${acts}${wla}</div>${form}</div>`};
  return RC.d.map(card).join('')+`<p class="cap">${own?'改状态、资料都要写理由并记进操作日志；往前要先过检查清单，往回退不检查。':'城市的上线状态和资料只有超级管理员能改。'}导出的邮箱只用于「开放了」的一次性通知，发完点「标记已通知」。</p>`}
if(NBQ_MODE==='real'){REAL_PAGES.cities=()=>realCitiesPage();REAL_RESET.push(()=>Object.assign(RC,{d:null,err:null,loading:false,busy:false,edit:null}));
  document.addEventListener('click',e=>{const t=e.target.closest&&e.target.closest('[data-rc2]');if(!t||t.disabled)return;const k=t.dataset.rc2,c=t.dataset.c;
    if(k==='reload'){RC.err=null;render();return rcLoad()}
    if(k==='edit'){RC.edit=c;return render()}if(k==='unedit'){RC.edit=null;return render()}
    if(k==='save'){const v=id=>($(id)||{}).value?.trim()??'',why=v('#rcWhy');if(why.length<4)return admToast(ADMIN_ERR.admin_reason_required);
      return rcPost('/cities/set',{city:c,patch:{community_url:v('#rcUrl'),hashtag:v('#rcTag'),center_label:v('#rcCtr')},reason:why},'已保存')}
    const nm=(RC.d.find(x=>x.key===c)||{}).name_zh||c;
    if(k==='st')return admAskReason(`把${nm}改为「${RC_ST[t.dataset.v][0]}」`,reason=>rcPost('/cities/status',{city:c,status:t.dataset.v,reason},'已改为「'+RC_ST[t.dataset.v][0]+'」'));
    if(k==='wl')return admAskReason(`导出${nm}「开放时通知我」的邮箱`,async reason=>{const r=await rcPost('/cities/waitlist',{city:c,reason},'');if(r&&r.body&&Array.isArray(r.body.emails)){rcCsv(c,r.body.emails);admToast(`已导出 ${r.body.emails.length} 个邮箱`)}});
    if(k==='wldone')return admAskReason(`${nm}：标记名单已通知（之后不再导出）`,async reason=>{const r=await rcPost('/cities/waitlist/done',{city:c,reason},'');if(r&&r.body)admToast(`已标记 ${r.body.marked} 个`)})})}
