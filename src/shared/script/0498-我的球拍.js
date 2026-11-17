/* ============================== 我的球拍（#60 PR-B） ==============================
 * 个人页三个槽位，1 号是主力；只记「品牌 + 系列」，是身份展示不是器材档案（不做稀有度 / 进度 / 红点）。
 * 数据：挂在 ME.rackets（[{brand|null, series}]，顺序 = 槽位）。真实模式只认服务器：读入走 nbqLoadAll → nbqApply → nbqRacketsIn；
 *   写入走 nbqWrite(PUT /api/me/rackets) 整组替换，成功后用服务器返回的列表；读不到（undefined）时不许改，免得拿空列表把服务器上的冲掉。
 * 演示模式（NBQ_NET 为空）：只改内存。快照（nbq_snap）随 USERS 一起存，刷新不先闪空槽。
 * 开关 NBQ_RACKETS_ON：正式站默认关（上线闸门过了由所有者打开，见 #60 PR-D）；测试环境（分支预览，连测试库）开；
 *   任何设备可用 localStorage nbq_ff_rackets=1 单独打开（真机预看、自动化测试）。关着时不显示入口、也不读接口。
 * B2（#60，ADR 0009）：选择列表以服务器产品库为准（GET /api/rackets/catalog，第一次打开选拍弹层时读，同一页面只读一次）；
 *   没读到 / 数据不对 / 演示模式 → 用下面的 RK_BRANDS 兜底。从产品库点选的发 {catalog_id}，包里已有的保留各自的 catalog_id，手写的发 {brand, series}（服务器自动归类）。
 *   埋点（字典 tests/spec/events_spec.md）：racket_picker_open / racket_brand_pick / racket_save（服务器保存成功后才发）/ racket_invalid；不记手写的文字。 */
const NBQ_RACKETS_ON=(()=>{if(typeof NBQ_ENV!=='undefined'&&NBQ_ENV==='staging')return true;try{return localStorage.getItem('nbq_ff_rackets')==='1'}catch(_){return false}})();
const RK_MAX=3,RK_LEN=30;
// 兜底列表：热门品牌 + 系列（只用文字，不用品牌标志）。和产品库种子（迁移 20261108_racket_catalog）一致；正常以产品库为准
const RK_BRANDS=[['Wilson',['Pro Staff','Blade','Clash','Ultra','Burn','Shift']],['Babolat',['Pure Drive','Pure Aero','Pure Strike']],['Head',['Speed','Radical','Gravity','Prestige','Extreme','Boom']],
  ['Yonex',['EZONE','VCORE','Percept']],['Dunlop',['CX','SX','FX']],['Prince',['Phantom','Textreme']],['Tecnifibre',['TF40','T-Fight']]];
// 与服务器 nbq_racket_text / nbq_racket_bad 同一套规则（服务器为准，这里只为了当场提示；校验见 rkCheck）
const rkClean=s=>String(s==null?'':s).replace(/[\u0000-\u001f\u007f-\u009f]/g,'').replace(/[\s　 ]+/g,' ').trim();
const rkKey=r=>(r.brand||'').toLowerCase()+'\u001f'+String(r.series).toLowerCase();
// 接口 → 前台：[{slot, brand, series}] → 按 slot 排好的 [{brand|null, series}]；不是数组返回 null（= 没读到）
const RK_UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const rkCid=v=>typeof v==='string'&&RK_UUID.test(v)?v:null;
function nbqFromRackets(rows){if(!Array.isArray(rows))return null;
  return rows.filter(r=>r&&typeof r.series==='string'&&r.series).sort((a,b)=>(+a.slot||0)-(+b.slot||0)).slice(0,RK_MAX).map(r=>({brand:typeof r.brand==='string'&&r.brand?r.brand:null,series:r.series,catalog_id:rkCid(r.catalog_id)}))}
// 产品库 → 选择列表：{catalog:[{id, brand, series}]} → [[品牌, [{id, series}]]]，品牌按第一次出现的顺序（服务器已按 sort 排好）；
//   id 不是 uuid、名字不是文字 / 为空 / 超长的行丢掉；一行都不剩返回 null（= 用兜底列表）
function nbqFromRacketCatalog(d){const rows=d&&Array.isArray(d.catalog)?d.catalog:null;if(!rows)return null;const m=new Map();
  rows.forEach(r=>{if(!r||!rkCid(r.id)||typeof r.brand!=='string'||typeof r.series!=='string')return;const b=rkClean(r.brand),se=rkClean(r.series);
    if(!b||!se||[...b].length>RK_LEN||[...se].length>RK_LEN)return;if(!m.has(b))m.set(b,[]);m.get(b).push({id:r.id,series:se})});
  return m.size?[...m]:null}
const RK_CAT={groups:null,p:null};   // 产品库：读到一次就用到页面刷新；读失败不记，下次打开再试
const rkGroups=()=>RK_CAT.groups||RK_BRANDS.map(([b,l])=>[b,l.map(se=>({id:null,series:se}))]);
function rkCatLoad(){if(RK_CAT.groups||RK_CAT.p||!nbqOn())return;
  RK_CAT.p=Promise.resolve().then(()=>NBQ_NET.get('/api/rackets/catalog',null,{noauth:true})).then(r=>{const g=r&&r.ok?nbqFromRacketCatalog(r.data):null;if(!g)return;RK_CAT.groups=g;
    if(RK.view==='pick'&&rkOpen())rkDraw()}).catch(()=>{}).finally(()=>{RK_CAT.p=null})}   // 选品牌 / 系列时到了就换上；正在「其他」里打字不重画
// 埋点直接写 track('事件名', …)：static/check 按这个写法核对「代码里的事件名都在字典里、两端一致」；props 与字典逐字一致，不传手写文字
// 读入（nbqApply 调用）：读到了 → 以服务器为准；没读到 → 保留这次之前的（同一个人），不清空
function nbqRacketsIn(me,list,old){if(!me)return;if(Array.isArray(list)){me.rackets=list;return}if(!Array.isArray(me.rackets)&&Array.isArray(old))me.rackets=old}
// 当前的球拍：null = 真实模式还没读到（不显示槽位、不许改）
const rkList=()=>{if(!ME)return null;if(Array.isArray(ME.rackets))return ME.rackets;if(typeof nbqOn==='function'&&nbqOn())return null;return ME.rackets=[]};

/* ---- 画：一栏一个图标（标题前），行里只用字 —— 品牌是小号大写字距标签，系列是主角；只有主力行带「主力」标签 ---- */
const RK_ICO='<svg class="rk-hi" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" aria-hidden="true"><g transform="rotate(45 14 10)"><ellipse cx="14" cy="8.6" rx="4.4" ry="6.1" stroke-width="1.7"/><path d="M12 4.2v8.8M14 2.6v12M16 4.2v8.8M9.9 6.6h8.2M9.7 9h8.6M9.9 11.4h8.2" stroke-width=".7" opacity=".6"/><path d="M14 14.7v2.2" stroke-width="1.5"/><path d="M14 17v5.2" stroke-width="2.6"/></g></svg>';
const rkName=r=>(r.brand?r.brand+' ':'')+r.series;
function rkRow(r,i){
  return `<button class="rk-row${i===0?' main':''}" data-a="rkSlot" data-i="${i}" aria-label="${i===0?'主力拍：':''}${esc(rkName(r))}，点开可以换一把、设为主力或移除">`+
    `<span class="v">${r.brand?`<small class="rk-br">${esc(r.brand)}</small>`:''}<b class="rk-se">${esc(r.series)}</b></span>${i===0?'<span class="rk-main">主力</span>':''}</button>`}
function rkAddRow(n){
  return `<button class="rk-row rk-add" data-a="rkSlot" data-i="${n}"><span class="rk-plus" aria-hidden="true">+</span><span>添加球拍</span>${n?'':'<small class="rk-hint">第一把是主力</small>'}</button>`}
// 个人页的一节：pwa = 分组标题 + 白色分组；web = 一张卡片
function rkSectionHTML(kind){if(!NBQ_RACKETS_ON||!ME)return '';
  const L=rkList(),rows=L===null?`<div class="rk-off">断线了。球拍等会儿再看。</div>`:L.map(rkRow).join('')+(L.length<RK_MAX?rkAddRow(L.length):'');
  const h=`<span class="rk-h">${RK_ICO}我的球拍</span>`;
  return kind==='web'?`<div class="card rk-card"><div class="ch-h">${h}</div><div class="rk">${rows}</div></div>`
    :`<div class="sec-t">${h}</div><div class="group rk">${rows}</div>`}

/* ---- 弹层（PWA 底部弹层 / 网页端弹窗，同一份内容）---- */
const RK={i:0,mode:'add',brand:null,step:'brand',view:null};
const rkSheet=()=>typeof openSheet==='function';
const rkCls=()=>rkSheet()?{t:'sh-t',s:'sh-s'}:{t:'m-t',s:'m-s'};
function rkShow(html){html=`<div class="rk-pk">${html}</div>`;if(rkSheet())openSheet(html);else openModal(`<div class="m-b">${html}</div>`,'sm')}
const rkHide=()=>{RK.view=null;if(rkSheet())closeSheet();else closeModal()};
// 选拍弹层开着吗（看底板：手机端 #sheet 的 show 要下一帧才加，#sbg 是立刻加的）
const rkOpen=()=>rkSheet()?!!(document.querySelector('#sbg.show')&&document.querySelector('#sheet .rk-pk')):!!(document.querySelector('#mbg.show')&&document.querySelector('#modal .rk-pk'));
// 包里别的槽位已有的（换一把时，被换掉的那把不算）
const rkTaken=()=>{const L=rkList()||[],o=new Set();L.forEach((r,j)=>{if(RK.mode==='swap'&&j===RK.i)return;o.add(rkKey(r));if(r.catalog_id)o.add('id:'+r.catalog_id)});return o};
function rkBack(){return `<button class="rk-back" data-a="rkBack" aria-label="返回"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></button>`}
function rkDraw(){const c=rkCls(),L=rkList()||[],cur=RK.mode==='swap'?L[RK.i]:null;RK.view=RK.step==='other'?'other':'pick';
  if(RK.step==='brand'){
    const sub=RK.mode==='swap'?`换掉 ${esc(rkName(cur))}`:RK.i===0||!L.length?'这把会是你的主力。':'品牌和系列，点一下就好。';
    rkShow(`<div class="${c.t}">${RK.mode==='swap'?'换一把':'添一把球拍'}</div><p class="${c.s}">${sub}</p>
      <div class="rk-grid">${rkGroups().map(([b])=>`<button class="rk-chip brand" data-a="rkBrand" data-b="${esc(b)}">${esc(b)}</button>`).join('')}<button class="rk-chip oth" data-a="rkOther">其他品牌</button></div>`);return}
  if(RK.step==='series'){const tk=rkTaken(),list=(rkGroups().find(x=>x[0]===RK.brand)||[,[]])[1];
    rkShow(`<div class="rk-nav">${rkBack()}<div class="${c.t}">${esc(RK.brand)}</div></div><p class="${c.s}">选系列，点一下就保存。</p>
      <div class="rk-grid">${list.map(({id,series:s})=>{const k=rkKey({brand:RK.brand,series:s}),own=tk.has(k)||!!id&&tk.has('id:'+id),same=!!cur&&(rkKey(cur)===k||!!id&&cur.catalog_id===id);
        return `<button class="rk-chip" data-a="rkSeries" data-s="${esc(s)}"${id?` data-c="${esc(id)}"`:''}${own||same?' disabled':''}>${esc(s)}${own?'<small>已在包里</small>':same?'<small>现在这把</small>':''}</button>`}).join('')}<button class="rk-chip oth" data-a="rkOther">其他系列</button></div>`);return}
  // 「其他」：唯一的输入框。回车只收键盘；保存按钮不绑回车
  const ph=RK.brand?'系列 / 型号，例如 Pro Staff 97':'品牌和型号，例如 Diadem Elevate';
  rkShow(`<div class="rk-nav">${rkBack()}<div class="${c.t}">${RK.brand?esc(RK.brand)+' · 其他系列':'其他品牌'}</div></div>
    <label class="rk-field"><span class="rk-lab">拍子名称</span><input id="rkName" class="inp" maxlength="${RK_LEN}" autocomplete="off" autocapitalize="words" spellcheck="false" enterkeyhint="done" placeholder="${ph}"></label>
    <div class="rk-meta"><span class="rk-err" id="rkErr" role="alert"></span><span class="rk-n" id="rkN">0/${RK_LEN}</span></div>
    <button class="btn btn-p rk-save" data-a="rkSave" disabled>保存</button>`);
  const i=$('#rkName'),sv=document.querySelector('[data-a="rkSave"]');if(!i)return;
  i.addEventListener('input',()=>{const v=rkClean(i.value);$('#rkN').textContent=[...i.value].length+'/'+RK_LEN;$('#rkErr').textContent='';if(sv)sv.disabled=!v});
  i.addEventListener('keydown',e=>{if(e.key!=='Enter')return;e.preventDefault();if(!nbqImeEnter(e))i.blur()})}
function rkSlotSheet(i){const L=rkList()||[],r=L[i],c=rkCls();RK.view='slot';
  rkShow(`<div class="rk-hero">${r.brand?`<small class="rk-br">${esc(r.brand)}</small>`:''}<div class="rk-ht"><b class="${c.t}">${esc(r.series)}</b>${i===0?'<span class="rk-main">主力</span>':''}</div></div>
    <div class="rk-acts">${i>0?`<button class="rk-act" data-a="rkMain"><b>设为主力</b><small>和现在的主力换个位置</small></button>`:''}
      <button class="rk-act" data-a="rkSwap"><b>换一把</b></button><button class="rk-act danger" data-a="rkDel"><b>移除</b></button></div>`)}

/* ---- 写：整组替换。真实模式走 nbqWrite（快照期间 / 连点 / 失败提示都在里面），成功后以服务器返回为准 ---- */
// ev = {action, source}：服务器保存成功后才发 racket_save
async function rkCommit(next,done,btn,ev){const L=rkList();
  if(L===null){toast('球拍还没读到，稍等一下再试');return false}
  const keep=next.slice(0,RK_MAX).map(r=>({brand:r.brand||null,series:r.series,catalog_id:rkCid(r.catalog_id)}));
  const list=keep.map(r=>r.catalog_id?{catalog_id:r.catalog_id}:{brand:r.brand,series:r.series});   // 产品库里的发 id（名字以产品库为准），手写的发品牌 + 系列
  const pk=document.querySelector('.rk-pk');if(pk)pk.classList.add('busy');if(btn)btn.classList.add('busy');
  try{
    if(nbqOn()){const d=await nbqWrite('rackets',n=>n.put('/api/me/rackets',{rackets:list}));if(d===null)return false;
      const got=nbqFromRackets(d.rackets);if(ME&&got)ME.rackets=got}
    else ME.rackets=keep;
    if(ev)track('racket_save',{action:ev.action,source:ev.source,n_after:(rkList()||[]).length});
    rkHide();toast(done);render();return true}
  finally{if(pk)pk.classList.remove('busy');if(btn)btn.classList.remove('busy')}}
// source：catalog = 从列表点选（产品库或兜底列表）· other = 自己写的
function rkPut(r,btn,source){const L=[...(rkList()||[])];
  if(RK.mode==='swap'){L[RK.i]=r;return rkCommit(L,'已换上 '+rkName(r),btn,{action:'swap',source})}
  L.push(r);return rkCommit(L,L.length===1?'主力拍已就位':'已放进包里',btn,{action:'add',source})}
// 当场校验（与服务器同一套规则，服务器为准）：返回 [原因, 提示]；原因进 racket_invalid
function rkCheck(v){if(!v)return['empty','写一下拍子的名字'];if([...v].length>RK_LEN)return['long',`最多 ${RK_LEN} 个字`];
  const bad='名字里不能有链接、@ 或一长串数字';if(/http|www/i.test(v))return['link',bad];if(/[@＠]/.test(v))return['at',bad];if(/[0-9０-９]{6,}/.test(v))return['digits',bad];
  if(rkTaken().has(rkKey({brand:RK.brand,series:v})))return['dup','这把已经在包里了'];return null}
// 事件（两端 0270 的 switch 转过来）
function rkAct(a){const d=a.dataset,L=rkList();
  switch(d.a){
    case'rkSlot':{if(L===null){toast('球拍还没读到，稍等一下再试');return}const i=+d.i||0;
      if(L[i]){RK.i=i;rkSlotSheet(i);return}RK.i=L.length;RK.mode='add';RK.brand=null;RK.step='brand';rkCatLoad();rkDraw();
      track('racket_picker_open',{mode:'add',slot:RK.i+1});return}
    case'rkSwap':RK.mode='swap';RK.brand=null;RK.step='brand';rkCatLoad();rkDraw();track('racket_picker_open',{mode:'swap',slot:RK.i+1});return;
    case'rkBrand':RK.brand=d.b;RK.step='series';rkDraw();track('racket_brand_pick',{brand:d.b});return;   // 品牌名来自产品库 / 兜底列表，不是手写
    case'rkOther':if(RK.step==='brand')track('racket_brand_pick',{brand:'other'});RK.step='other';rkDraw();setTimeout(()=>{const i=$('#rkName');if(i)i.focus()},rkSheet()?320:60);return;
    case'rkBack':RK.step=RK.step==='other'&&RK.brand?'series':'brand';if(RK.step==='brand')RK.brand=null;rkDraw();return;
    case'rkSeries':return void rkPut({brand:RK.brand,series:d.s,catalog_id:rkCid(d.c)},a,'catalog');
    case'rkSave':{const i=$('#rkName'),e=$('#rkErr'),v=rkClean(i&&i.value),err=rkCheck(v);
      if(err){if(e)e.textContent=err[1];track('racket_invalid',{reason:err[0]});return}if(i)i.blur();return void rkPut({brand:RK.brand,series:v,catalog_id:null},a,'other')}
    case'rkMain':{if(!L||!L[RK.i]||!RK.i)return;const n=[...L];[n[0],n[RK.i]]=[n[RK.i],n[0]];   // 和 1 号位交换，不做拖拽排序
      return void rkCommit(n,'已设为主力',a,{action:'main',source:L[RK.i].catalog_id?'catalog':'other'})}   // source：被设为主力的那把有没有归到产品库
    case'rkDel':{if(!L||!L[RK.i])return;const r=L[RK.i];return void rkCommit(L.filter((_,j)=>j!==RK.i),'已移除 '+rkName(r),a,{action:'remove',source:r.catalog_id?'catalog':'other'})}
  }}
