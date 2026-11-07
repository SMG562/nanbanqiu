/* ============================== 我的球拍（#60 PR-B） ==============================
 * 个人页三个槽位，1 号是主力；只记「品牌 + 系列」，是身份展示不是器材档案（不做稀有度 / 进度 / 红点）。
 * 数据：挂在 ME.rackets（[{brand|null, series}]，顺序 = 槽位）。真实模式只认服务器：读入走 nbqLoadAll → nbqApply → nbqRacketsIn；
 *   写入走 nbqWrite(PUT /api/me/rackets) 整组替换，成功后用服务器返回的列表；读不到（undefined）时不许改，免得拿空列表把服务器上的冲掉。
 * 演示模式（NBQ_NET 为空）：只改内存。快照（nbq_snap）随 USERS 一起存，刷新不先闪空槽。
 * 开关 NBQ_RACKETS_ON：正式站默认关（上线闸门过了由所有者打开，见 #60 PR-D）；测试环境（分支预览，连测试库）开；
 *   任何设备可用 localStorage nbq_ff_rackets=1 单独打开（真机预看、自动化测试）。关着时不显示入口、也不读接口。 */
const NBQ_RACKETS_ON=(()=>{if(typeof NBQ_ENV!=='undefined'&&NBQ_ENV==='staging')return true;try{return localStorage.getItem('nbq_ff_rackets')==='1'}catch(_){return false}})();
const RK_MAX=3,RK_LEN=30;
// 预设：热门品牌 + 系列（只用文字，不用品牌标志）。列表只在前台，服务器只校验长度和字符，改列表不用迁移
const RK_BRANDS=[['Wilson',['Pro Staff','Blade','Clash','Ultra','Burn','Shift']],['Babolat',['Pure Drive','Pure Aero','Pure Strike']],['Head',['Speed','Radical','Gravity','Prestige','Extreme','Boom']],
  ['Yonex',['EZONE','VCORE','Percept']],['Dunlop',['CX','SX','FX']],['Prince',['Phantom','Textreme']],['Tecnifibre',['TF40','T-Fight']]];
// 与服务器 nbq_racket_text / nbq_racket_bad 同一套规则（服务器为准，这里只为了当场提示）
const rkClean=s=>String(s==null?'':s).replace(/[\u0000-\u001f\u007f-\u009f]/g,'').replace(/[\s　 ]+/g,' ').trim();
const rkBad=s=>/http|www/i.test(s)||/[@＠]/.test(s)||/[0-9０-９]{6,}/.test(s);
const rkKey=r=>(r.brand||'').toLowerCase()+'\u001f'+String(r.series).toLowerCase();
// 接口 → 前台：[{slot, brand, series}] → 按 slot 排好的 [{brand|null, series}]；不是数组返回 null（= 没读到）
function nbqFromRackets(rows){if(!Array.isArray(rows))return null;
  return rows.filter(r=>r&&typeof r.series==='string'&&r.series).sort((a,b)=>(+a.slot||0)-(+b.slot||0)).slice(0,RK_MAX).map(r=>({brand:typeof r.brand==='string'&&r.brand?r.brand:null,series:r.series}))}
// 读入（nbqApply 调用）：读到了 → 以服务器为准；没读到 → 保留这次之前的（同一个人），不清空
function nbqRacketsIn(me,list,old){if(!me)return;if(Array.isArray(list)){me.rackets=list;return}if(!Array.isArray(me.rackets)&&Array.isArray(old))me.rackets=old}
// 当前的球拍：null = 真实模式还没读到（不显示槽位、不许改）
const rkList=()=>{if(!ME)return null;if(Array.isArray(ME.rackets))return ME.rackets;if(typeof nbqOn==='function'&&nbqOn())return null;return ME.rackets=[]};

/* ---- 画：和「我的 Club」同一套列表行，一把一行；主力用标签标出，不用插图 ---- */
// 小图标（24 格线稿）：斜放的拍面 + 拍柄 + 一颗球。只在行首这一处用，与 Club 的球场图标同尺寸、同底色规则
const RK_ICO='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><ellipse cx="14.2" cy="9.8" rx="5.2" ry="6.6" transform="rotate(45 14.2 9.8)"/><path d="M10.4 13.6 4.6 19.4"/><path d="M11.4 7.6l5 5M13.6 5.9l4.5 4.5" stroke-width="1" opacity=".55"/><circle cx="18.6" cy="18.6" r="1.9" fill="currentColor" stroke="none"/></svg>';
const rkName=r=>(r.brand?r.brand+' ':'')+r.series;
function rkRow(r,i){
  return `<button class="club rk-row${i===0?' main':''}" data-a="rkSlot" data-i="${i}" aria-label="${i===0?'主力拍：':''}${esc(rkName(r))}，点开可以换一把、设为主力或移除"><span class="ci">${RK_ICO}</span>`+
    `<span class="v"><b>${esc(r.series)}</b><small>${r.brand?esc(r.brand):'其他品牌'}</small></span>${i===0?'<span class="pill p-green">主力</span>':'<svg class="rk-chev" aria-hidden="true"><use href="#i-ch"/></svg>'}</button>`}
function rkAddRow(n){
  return `<button class="club rk-row rk-add" data-a="rkSlot" data-i="${n}"><span class="ci"><svg><use href="#i-plus"/></svg></span>`+
    `<span class="v"><b>${n?'再添一把':'添加我的球拍'}</b><small>${n?`还能放 ${RK_MAX-n} 把`:'最多 3 把，第一把是主力'}</small></span></button>`}
// 个人页的一节：pwa = 分组标题 + 白色分组；web = 一张卡片（与「我的 Club」同构）
function rkSectionHTML(kind){if(!NBQ_RACKETS_ON||!ME)return '';
  const L=rkList(),rows=L===null?`<div class="rk-off">断线了。球拍等会儿再看。</div>`:L.map(rkRow).join('')+(L.length<RK_MAX?rkAddRow(L.length):'');
  return kind==='web'?`<div class="card rk-card"><div class="ch-h"><span>我的球拍</span></div><div class="rk">${rows}</div><div style="height:6px"></div></div>`
    :`<div class="sec-t"><span>我的球拍</span></div><div class="group rk">${rows}</div>`}

/* ---- 弹层（PWA 底部弹层 / 网页端弹窗，同一份内容）---- */
const RK={i:0,mode:'add',brand:null,step:'brand'};
const rkSheet=()=>typeof openSheet==='function';
const rkCls=()=>rkSheet()?{t:'sh-t',s:'sh-s'}:{t:'m-t',s:'m-s'};
function rkShow(html){html=`<div class="rk-pk">${html}</div>`;if(rkSheet())openSheet(html);else openModal(`<div class="m-b">${html}</div>`,'sm')}
const rkHide=()=>{if(rkSheet())closeSheet();else closeModal()};
// 包里别的槽位已有的（换一把时，被换掉的那把不算）
const rkTaken=()=>{const L=rkList()||[];return new Set(L.filter((_,j)=>!(RK.mode==='swap'&&j===RK.i)).map(rkKey))};
function rkBack(){return `<button class="rk-back" data-a="rkBack" aria-label="返回"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></button>`}
function rkDraw(){const c=rkCls(),L=rkList()||[],cur=RK.mode==='swap'?L[RK.i]:null;
  if(RK.step==='brand'){
    const sub=RK.mode==='swap'?`换掉 ${esc(rkName(cur))}`:RK.i===0||!L.length?'这把会是你的主力。':'品牌和系列，点一下就好。';
    rkShow(`<div class="${c.t}">${RK.mode==='swap'?'换一把':'添一把球拍'}</div><p class="${c.s}">${sub}</p>
      <div class="rk-grid">${RK_BRANDS.map(([b])=>`<button class="rk-chip brand" data-a="rkBrand" data-b="${esc(b)}">${esc(b)}</button>`).join('')}<button class="rk-chip oth" data-a="rkOther">其他品牌</button></div>`);return}
  if(RK.step==='series'){const tk=rkTaken(),list=(RK_BRANDS.find(x=>x[0]===RK.brand)||[,[]])[1];
    rkShow(`<div class="rk-nav">${rkBack()}<div class="${c.t}">${esc(RK.brand)}</div></div><p class="${c.s}">选系列，点一下就保存。</p>
      <div class="rk-grid">${list.map(s=>{const k=rkKey({brand:RK.brand,series:s}),own=tk.has(k),same=cur&&rkKey(cur)===k;
        return `<button class="rk-chip" data-a="rkSeries" data-s="${esc(s)}"${own||same?' disabled':''}>${esc(s)}${own?'<small>已在包里</small>':same?'<small>现在这把</small>':''}</button>`}).join('')}<button class="rk-chip oth" data-a="rkOther">其他系列</button></div>`);return}
  // 「其他」：唯一的输入框。回车只收键盘；保存按钮不绑回车
  const ph=RK.brand?'系列 / 型号，例如 Pro Staff 97':'品牌和型号，例如 Diadem Elevate';
  rkShow(`<div class="rk-nav">${rkBack()}<div class="${c.t}">${RK.brand?esc(RK.brand)+' · 其他系列':'其他品牌'}</div></div>
    <label class="rk-field"><span class="rk-lab">拍子名称</span><input id="rkName" class="inp" maxlength="${RK_LEN}" autocomplete="off" autocapitalize="words" spellcheck="false" enterkeyhint="done" placeholder="${ph}"></label>
    <div class="rk-meta"><span class="rk-err" id="rkErr" role="alert"></span><span class="rk-n" id="rkN">0/${RK_LEN}</span></div>
    <button class="btn btn-p rk-save" data-a="rkSave" disabled>保存</button>`);
  const i=$('#rkName'),sv=document.querySelector('[data-a="rkSave"]');if(!i)return;
  i.addEventListener('input',()=>{const v=rkClean(i.value);$('#rkN').textContent=[...i.value].length+'/'+RK_LEN;$('#rkErr').textContent='';if(sv)sv.disabled=!v});
  i.addEventListener('keydown',e=>{if(e.key!=='Enter')return;e.preventDefault();if(!nbqImeEnter(e))i.blur()})}
function rkSlotSheet(i){const L=rkList()||[],r=L[i],c=rkCls();
  rkShow(`<div class="rk-hero${i===0?' main':''}"><span class="ci">${RK_ICO}</span><div><b class="${c.t}">${esc(r.series)}</b><small>${r.brand?esc(r.brand):'其他品牌'}${i===0?' · 主力':''}</small></div></div>
    <div class="rk-acts">${i>0?`<button class="rk-act" data-a="rkMain"><b>设为主力</b><small>和现在的主力换个位置</small></button>`:''}
      <button class="rk-act" data-a="rkSwap"><b>换一把</b></button><button class="rk-act danger" data-a="rkDel"><b>移除</b></button></div>`)}

/* ---- 写：整组替换。真实模式走 nbqWrite（快照期间 / 连点 / 失败提示都在里面），成功后以服务器返回为准 ---- */
async function rkCommit(next,done,btn){const L=rkList();
  if(L===null){toast('球拍还没读到，稍等一下再试');return false}
  const list=next.slice(0,RK_MAX).map(r=>({brand:r.brand||null,series:r.series}));
  const pk=document.querySelector('.rk-pk');if(pk)pk.classList.add('busy');if(btn)btn.classList.add('busy');
  try{
    if(nbqOn()){const d=await nbqWrite('rackets',n=>n.put('/api/me/rackets',{rackets:list}));if(d===null)return false;
      const got=nbqFromRackets(d.rackets);if(ME&&got)ME.rackets=got}
    else ME.rackets=list;
    rkHide();toast(done);render();return true}
  finally{if(pk)pk.classList.remove('busy');if(btn)btn.classList.remove('busy')}}
function rkPut(r,btn){const L=[...(rkList()||[])];
  if(RK.mode==='swap'){L[RK.i]=r;return rkCommit(L,'已换上 '+rkName(r),btn)}
  L.push(r);return rkCommit(L,L.length===1?'主力拍已就位':'已放进包里',btn)}
// 事件（两端 0270 的 switch 转过来）
function rkAct(a){const d=a.dataset,L=rkList();
  switch(d.a){
    case'rkSlot':{if(L===null){toast('球拍还没读到，稍等一下再试');return}const i=+d.i||0;
      if(L[i]){RK.i=i;rkSlotSheet(i);return}RK.i=L.length;RK.mode='add';RK.brand=null;RK.step='brand';rkDraw();return}
    case'rkSwap':RK.mode='swap';RK.brand=null;RK.step='brand';rkDraw();return;
    case'rkBrand':RK.brand=d.b;RK.step='series';rkDraw();return;
    case'rkOther':RK.step='other';rkDraw();setTimeout(()=>{const i=$('#rkName');if(i)i.focus()},rkSheet()?320:60);return;
    case'rkBack':RK.step=RK.step==='other'&&RK.brand?'series':'brand';if(RK.step==='brand')RK.brand=null;rkDraw();return;
    case'rkSeries':return void rkPut({brand:RK.brand,series:d.s},a);
    case'rkSave':{const i=$('#rkName'),e=$('#rkErr'),v=rkClean(i&&i.value);
      const err=!v?'写一下拍子的名字':[...v].length>RK_LEN?`最多 ${RK_LEN} 个字`:rkBad(v)?'名字里不能有链接、@ 或一长串数字':rkTaken().has(rkKey({brand:RK.brand,series:v}))?'这把已经在包里了':'';
      if(err){if(e)e.textContent=err;return}if(i)i.blur();return void rkPut({brand:RK.brand,series:v},a)}
    case'rkMain':{if(!L||!L[RK.i]||!RK.i)return;const n=[...L];[n[0],n[RK.i]]=[n[RK.i],n[0]];   // 和 1 号位交换，不做拖拽排序
      return void rkCommit(n,'已设为主力',a)}
    case'rkDel':{if(!L||!L[RK.i])return;const r=L[RK.i];return void rkCommit(L.filter((_,j)=>j!==RK.i),'已移除 '+rkName(r),a)}
  }}
