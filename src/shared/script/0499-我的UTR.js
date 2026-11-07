/* ============================== 我的 UTR（#101） ==============================
 * 个人页一行（和「我的球拍」同一套样式）：小标签「正式 / 自评」+ 数字；整行可点开弹层。自评数字前加 ≈。
 * 「几周前更新」平时不显示：电脑鼠标悬停、手机长按时才出现。球员卡不变（只显示数字，不带 ≈）。
 * 数据：数值和类型就是已有的 ME.ntrp / ME.utr_estimated；主页编号和更新时间在 UT 里，打开个人页时读一次 GET /api/me/utr。
 *   写入只走 nbqWrite(PUT /api/me/utr)，成功后以服务器返回为准；校验、频率（24 小时 5 次）在服务器，这里只为当场提示。
 * 开关 NBQ_UTR_ON：正式站默认关；测试环境（分支预览，连测试库）开；任何设备可用 localStorage nbq_ff_utr=1 单独打开。 */
const NBQ_UTR_ON=(()=>{if(typeof NBQ_ENV!=='undefined'&&NBQ_ENV==='staging')return true;try{return localStorage.getItem('nbq_ff_utr')==='1'}catch(_){return false}})();
// 自评五档（用户 11-07 定；注册页的 UTR_EST 是另一套，统一见 #103）
const UT_EST=[['刚开始学',1],['能稳定对拉',1.5],['会发球、能打比赛',2],['常打比赛',3],['校队 / 高水平',4]];
const UT={uid:null,at:null,profile:null,got:false,p:null,mode:'off',est:1};
const utFmt=v=>String(Math.round((+v||0)*100)/100);
const utShown=()=>ME.utr_estimated?'≈'+(+ME.ntrp).toFixed(1):utFmt(ME.ntrp);
function utAgo(t){if(!t)return '';const d=Math.floor((Date.now()-t)/864e5);return d<1?'今天更新':d<7?d+' 天前更新':d<60?Math.floor(d/7)+' 周前更新':d<730?Math.floor(d/30)+' 个月前更新':'很久没更新'}
// 链接 → 主页编号（与服务器 api_set_utr 同一套；空 = ''，认不出 = null）
function utProfile(s){s=String(s==null?'':s).trim();if(!s)return '';if(/^\d{4,12}$/.test(s))return s;
  const m=s.match(/^(?:https?:\/\/)?(?:app\.|www\.)?(?:utrsports\.net|universaltennis\.com)\/profiles\/(\d{4,12})(?:[/?#].*)?$/i);return m?m[1]:null}
function utNum(s){s=String(s||'').trim().replace(/[，。]/g,'.');if(!s)return {e:'填一下 UTR'};if(!/^\d{1,2}(\.\d{1,2})?$/.test(s))return {e:'最多两位小数'};
  const v=+s;return v<1||v>16.5?{e:'UTR 在 1 – 16.5 之间'}:{v}}
function nbqFromUtr(d){return d&&typeof d==='object'&&isFinite(+d.utr)?{utr:+d.utr,estimated:!!d.estimated,profile:typeof d.profile==='string'?d.profile:null,at:Date.parse(d.updated_at)||null}:null}
function utIn(x){if(!x||!ME)return;ME.ntrp=x.utr;ME.utr_estimated=x.estimated;UT.profile=x.profile;UT.at=x.at;UT.got=true}
function utLoad(){if(UT.uid!==ME.id){UT.uid=ME.id;UT.at=null;UT.profile=null;UT.got=false}   // 换了账号 / 退出再登录：不沿用上一个人的
  if(UT.got||UT.p)return;
  if(!nbqOn()){if(!UT.at)UT.at=Date.parse(ME.created_at)||Date.now();return}   // 演示模式（或真实模式还没接上）：不标记已读，接上后照常读一次
  const uid=ME.id;UT.p=Promise.resolve().then(()=>NBQ_NET.get('/api/me/utr')).then(r=>{const x=r&&r.ok?nbqFromUtr(r.data&&r.data.utr):null;if(!x||!ME||ME.id!==uid)return;utIn(x);
    if(document.querySelector('.ut-row')&&!document.querySelector('.ut-pk'))render()})   /* 个人页开着、弹层没开：重画一次（数值 / 时间以服务器为准） */.catch(()=>{}).finally(()=>{UT.p=null})}

/* ---- 个人页一行 ---- */
const UT_ICO='<svg class="rk-hi" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M4 16a8 8 0 0 1 16 0"/><path d="M12 16l4.2-5.2"/><circle cx="12" cy="16" r="1.4" fill="currentColor" stroke="none"/></svg>';
function utSectionHTML(kind){if(!NBQ_UTR_ON||!ME)return '';utLoad();
  const k=ME.utr_estimated?'自评':'正式',n=ME.utr_estimated?`<span class="ut-ap">≈</span>${(+ME.ntrp).toFixed(1)}`:utFmt(ME.ntrp);
  const row=`<button class="ut-row" data-a="utOpen" aria-label="我的 UTR：${k} ${utShown()}${UT.at?'，'+utAgo(UT.at):''}，点开更新"><span class="v"><small class="rk-br">${k}</small><b class="rk-se ut-n">${n}</b></span><span class="ut-tip" aria-hidden="true">${utAgo(UT.at)}</span></button>`;
  const h=`<span class="rk-h">${UT_ICO}我的 UTR</span>`;
  return kind==='web'?`<div class="card rk-card ut-card"><div class="ch-h">${h}</div><div class="ut">${row}</div></div>`:`<div class="sec-t">${h}</div><div class="group ut">${row}</div>`}
// 手机长按显示「几周前更新」（电脑悬停由 CSS 管）；长按后的那次点按不打开弹层
let UT_LP=0;
if(typeof document!=='undefined'){
  document.addEventListener('touchstart',e=>{const r=e.target.closest&&e.target.closest('.ut-row');if(!r)return;clearTimeout(UT_LP);UT_LP=setTimeout(()=>{r.classList.add('tipon');UT_LP=-1},450)},{passive:true});
  document.addEventListener('touchmove',()=>{if(UT_LP>0){clearTimeout(UT_LP);UT_LP=0}},{passive:true});
  document.addEventListener('touchend',e=>{const r=e.target.closest&&e.target.closest('.ut-row');if(UT_LP===-1&&r){e.preventDefault();setTimeout(()=>r.classList.remove('tipon'),1400)}else clearTimeout(UT_LP);UT_LP=0});
  document.addEventListener('contextmenu',e=>{if(e.target.closest&&e.target.closest('.ut-row'))e.preventDefault()})}

/* ---- 弹层：正式 / 自评 ---- */
const utSheet=()=>typeof openSheet==='function';
function utDraw(){const c=utSheet()?'sh-t':'m-t',off=UT.mode==='off';
  const html=`<div class="rk-pk ut-pk"><div class="${c}">我的 UTR</div>
    <div class="ut-seg" role="tablist"><button role="tab" data-a="utMode" data-m="off" aria-selected="${off}">正式</button><button role="tab" data-a="utMode" data-m="self" aria-selected="${!off}">自评</button></div>
    ${off?`<input id="utrNum" class="inp ut-num" inputmode="decimal" enterkeyhint="done" autocomplete="off" placeholder="如 4.6" aria-label="UTR" value="${ME.utr_estimated?'':utFmt(ME.ntrp)}">
    <label class="ut-lk"><input id="utrLink" class="inp" inputmode="url" enterkeyhint="done" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="UTR 主页链接（选填）" aria-label="UTR 主页链接（选填）" value="${esc(UT.profile||'')}"><svg class="ut-ok" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></label>
    <div class="rk-err ut-err" id="utErr" role="alert"></div>`
    :`<div class="rk-acts ut-opts" role="radiogroup" aria-label="自评">${UT_EST.map(([l,v],i)=>`<button class="rk-act ut-opt" role="radio" data-a="utEst" data-i="${i}" aria-checked="${i===UT.est}"><b>${l}</b><span>≈ ${v.toFixed(1)}</span></button>`).join('')}</div>`}
    <button class="btn btn-p ut-save" data-a="utSave">保存</button></div>`;
  if(utSheet())openSheet(html);else openModal(`<div class="m-b">${html}</div>`,'sm');
  if(!off)return;
  const n=$('#utrNum'),l=$('#utrLink'),chk=()=>{const p=utProfile(l.value);l.parentNode.classList.toggle('good',!!p);$('#utErr').textContent='';n.classList.remove('bad');l.classList.remove('bad')};
  chk();[n,l].forEach(x=>{x.addEventListener('input',chk);x.addEventListener('keydown',e=>{if(e.key!=='Enter')return;e.preventDefault();if(!nbqImeEnter(e))utSave(document.querySelector('[data-a="utSave"]'))})})}
async function utSave(btn){let body;
  if(UT.mode==='off'){const n=utNum($('#utrNum').value),p=utProfile($('#utrLink').value),e=$('#utErr');
    if(n.e||p===null){$('#utrNum').classList.toggle('bad',!!n.e);$('#utrLink').classList.toggle('bad',p===null);e.textContent=n.e||'不是 UTR 主页链接';return}
    body={utr:n.v,estimated:false,profile:p||null}}
  else body={utr:UT_EST[UT.est][1],estimated:true};
  const was=ME.ntrp;if(btn)btn.disabled=true;
  try{let x;
    if(nbqOn()){const d=await nbqWrite('utr',net=>net.put('/api/me/utr',body));if(d===null)return;x=nbqFromUtr(d.utr)}
    else x={utr:body.utr,estimated:body.estimated,profile:'profile' in body?body.profile:UT.profile,at:Date.now()};
    utIn(x);track('utr_save',{mode:body.estimated?'self':'off',linked:!!(x&&x.profile),change:x&&x.utr>was?'up':x&&x.utr<was?'down':'same'});
    utSheet()?closeSheet():closeModal();toast('已保存');render()}
  finally{if(btn)btn.disabled=false}}
function utAct(a){const d=a.dataset;
  switch(d.a){
    case'utOpen':if(a.classList.contains('tipon'))return;UT.mode=ME.utr_estimated?'self':'off';
      UT.est=Math.max(0,UT_EST.findIndex(([,v])=>v===+ME.ntrp));utDraw();return;
    case'utMode':if(UT.mode===d.m)return;UT.mode=d.m;utDraw();return;
    case'utEst':UT.est=+d.i||0;document.querySelectorAll('.ut-opt').forEach((b,i)=>b.setAttribute('aria-checked',i===UT.est));return;
    case'utSave':return void utSave(a)}}
