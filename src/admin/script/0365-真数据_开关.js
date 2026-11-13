/* =====================================================================
 * 真数据 · 运行时开关（#49 PR②）：暂停注册 / 维护页 / 停发短信。只有 owner（switch.set）能看、能改；改要写理由，记进操作日志。
 *   开关本身在库里（app_switches），接口见 /admin/api/switches；前台怎么读见 api_spec 运行时开关一节。
 * ===================================================================== */
const RSW={d:null,err:null,loading:false,busy:false};
const RSW_ITEMS=[
  ['register_paused','暂停注册','开：新号码注册被拒（已有账号照常登录、照常使用）。'],
  ['maintenance','维护页','开：除版本和开关查询外，所有前台接口返回「维护中」；后台不受影响（要靠它关）。'],
  ['sms_paused','停发短信','开：前台不再向手机发验证码，提示「短信验证码暂时停发」；已登录的人不受影响。']];
async function rswLoad(){if(RSW.loading)return;RSW.loading=true;const r=await admApi('GET','/switches');RSW.loading=false;
  if(r.status===401)return toLogin('登录已过期，请重新登录');
  if(r.ok&&r.body&&Array.isArray(r.body.switches)){RSW.d=r.body.switches;RSW.err=null}else RSW.err=realErr(r);if(RL.me&&S.page==='switches')render()}
function realSwitchesPage(){if(!realCan('switch.set'))return `<div class="card nodata"><h2>开关</h2><p>运行时开关只有超级管理员能看和改。</p></div>`;
  if(!RSW.d&&!RSW.err&&!RSW.loading)rswLoad();
  if(!RSW.d)return `<div class="card nodata"><h2>开关</h2><p>${RSW.err?esc(RSW.err)+' <button class="btn sm" data-rsw="reload">重试</button>':'读取中…'}</p></div>`;
  const by={},b=RSW.busy?' disabled':'';RSW.d.forEach(x=>{by[x.key]=x});
  return RSW_ITEMS.map(([k,name,desc])=>{const on=!!(by[k]&&by[k].is_on);
    return `<div class="card"><div class="ch"><b>${esc(name)}</b><span class="pill ${on?'w':'g'}">${on?'已开启':'关闭中'}</span><small>${by[k]&&by[k].updated_at?'上次改动 '+esc(String(by[k].updated_at).slice(0,16).replace('T',' ')):'还没改过'}</small></div>
    <p class="cap">${esc(desc)}</p><div class="rowacts"><button class="btn sm ${on?'':'p'}" data-rsw="set" data-k="${k}" data-v="${on?0:1}"${b}>${on?'关闭':'开启'}</button></div></div>`}).join('')
    +`<p class="cap">每次开关都要写理由，和你的名字一起记进操作日志。前台最多约 5 秒内生效；开启「维护页」后别忘了关。</p>`}
if(NBQ_MODE==='real'){REAL_PAGES.switches=()=>realSwitchesPage();REAL_RESET.push(()=>Object.assign(RSW,{d:null,err:null,loading:false,busy:false}));
  document.addEventListener('click',e=>{const t=e.target.closest&&e.target.closest('[data-rsw]');if(!t||t.disabled)return;const k=t.dataset.rsw;
    if(k==='reload'){RSW.err=null;render();return rswLoad()}
    if(k==='set'){const it=RSW_ITEMS.find(x=>x[0]===t.dataset.k);if(!it)return;const on=t.dataset.v==='1';
      return admAskReason(`${on?'开启':'关闭'}「${it[1]}」`,async reason=>{if(RSW.busy)return;RSW.busy=true;render();
        const r=await admApi('POST','/switches/set',{key:it[0],on,reason});RSW.busy=false;
        if(r.status===401){toLogin('登录已过期，请重新登录');return}
        if(!r.ok){admToast(realErr(r));render();return}
        admToast(`已${on?'开启':'关闭'}「${it[1]}」`);RSW.d=null;rswLoad()})}})}
