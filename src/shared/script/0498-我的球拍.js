/* ============================== 我的球拍（#60 PR-B） ==============================
 * 个人页三个槽位，1 号是主力；只记「品牌 + 系列」，是身份展示不是器材档案（不做稀有度 / 进度 / 红点）。
 * 数据：挂在 ME.rackets（[{brand|null, series}]，顺序 = 槽位）。真实模式只认服务器：读入走 nbqLoadAll → nbqApply → nbqRacketsIn；
 *   写入走 nbqWrite(PUT /api/me/rackets) 整组替换，成功后用服务器返回的列表；读不到（undefined）时不许改，免得拿空列表把服务器上的冲掉。
 * 演示模式（NBQ_NET 为空）：只改内存。快照（nbq_snap）随 USERS 一起存，刷新不先闪空槽。
 * 开关 NBQ_RACKETS_ON：11-18 所有者同意打开（#60 PR-D），所有环境默认开；
 *   任何设备可用 localStorage nbq_ff_rackets=0 单独关掉（应急、自动化测试）。关着时不显示入口、也不读接口。
 * PR2b（#389，ADR 0014）：品牌 → 系列两级库（GET /api/rackets/lib，第一次打开弹层时读，同一页面只读一次）；没读到 / 数据不对 / 演示模式 → 用 RK_BRANDS 兜底（发旧形状 {brand, series}）。
 *   弹层两步列表：品牌（顶上一个搜索框，搜到系列直接出「品牌 系列」行）→ 系列，点到系列就保存，没有保存按钮、没有说明句。库里的点选发 {brand_id, series_id}，「其他系列」发 other_text，「其他品牌」发旧形状 {brand:null, series}；这两个才有一个输入框 + 「完成」。
 *   昵称（11-18 所有者决定）这一版不开放：不显示、不输入；服务器上已有的昵称编辑时原样带着（RK.keepNick），后续要开再加回输入框。
 *   老行（品牌对不上：brand_id 空、other_text / other_brand_text 皆空）照旧读 brand / series 列。
 *   埋点（字典 tests/spec/events_spec.md）：racket_picker_open / racket_brand_pick / racket_save（服务器保存成功后才发）/ racket_invalid；不记手写的文字。 */
const NBQ_RACKETS_ON=(()=>{try{return localStorage.getItem('nbq_ff_rackets')!=='0'}catch(_){return true}})();
const RK_MAX=3,RK_LEN=30;
// 兜底列表：热门品牌 + 系列（只用文字，不发 id）。和种子一致；正常以服务器的品牌 → 系列库为准
const RK_BRANDS=[['Wilson',['Pro Staff','Blade','Clash','Ultra','Burn','Shift']],['Babolat',['Pure Drive','Pure Aero','Pure Strike']],['Head',['Speed','Radical','Gravity','Prestige','Extreme','Boom']],
  ['Yonex',['EZONE','VCORE','Percept']],['Dunlop',['CX','SX','FX']],['Prince',['Phantom','Textreme']],['Tecnifibre',['TF40','T-Fight']]];
// 与服务器 nbq_racket_text / nbq_racket_bad 同一套规则（服务器为准，这里只为了当场提示；校验见 rkCheck）
const rkClean=s=>String(s==null?'':s).replace(/[\u0000-\u001f\u007f-\u009f]/g,'').replace(/[\s　 ]+/g,' ').trim();
const rkKey=r=>(r.brand||'').toLowerCase()+'\u001f'+String(r.series).toLowerCase();
const RK_UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const rkCid=v=>typeof v==='string'&&RK_UUID.test(v)?v:null;
const rkTx=v=>typeof v==='string'&&v?v:null;
// 接口 → 前台：[{slot, brand, series, brand_id, series_id, other_text, other_brand_text, nickname}] → 按 slot 排好；不是数组返回 null（= 没读到）
function nbqFromRackets(rows){if(!Array.isArray(rows))return null;
  return rows.filter(r=>r&&typeof r.series==='string'&&r.series).sort((a,b)=>(+a.slot||0)-(+b.slot||0)).slice(0,RK_MAX).map(r=>({brand:rkTx(r.brand),series:r.series,catalog_id:rkCid(r.catalog_id),
    brand_id:rkCid(r.brand_id),series_id:rkCid(r.series_id),other_text:rkTx(r.other_text),other_brand_text:rkTx(r.other_brand_text),nickname:rkTx(r.nickname)}))}
// 品牌 → 系列库：{brands:[{id,name,series:[{id,name,is_other,aliases}]}]} → [{id,name,series:[{id,name,other,al:[小写别名]}]}]；坏行丢掉，一个品牌都不剩返回 null（= 用兜底）
function nbqFromRacketLib(d){const rows=d&&Array.isArray(d.brands)?d.brands:null;if(!rows)return null;const out=[];
  rows.forEach(b=>{if(!b||!rkCid(b.id)||typeof b.name!=='string'||!Array.isArray(b.series))return;const n=rkClean(b.name);if(!n||[...n].length>RK_LEN)return;
    const se=b.series.filter(x=>x&&rkCid(x.id)&&typeof x.name==='string'&&rkClean(x.name)&&[...rkClean(x.name)].length<=RK_LEN).map(x=>({id:x.id,name:rkClean(x.name),other:x.is_other===true,al:(Array.isArray(x.aliases)?x.aliases:[]).filter(a=>typeof a==='string').map(a=>rkClean(a).toLowerCase())}));
    if(se.length)out.push({id:b.id,name:n,series:se})});
  return out.length?out:null}
const RK_LIB={groups:null,p:null};   // 品牌 → 系列库：读到一次就用到页面刷新；读失败不记，下次打开再试
const RK_OTHER_NAME='其他系列';
const rkGroups=()=>RK_LIB.groups||RK_BRANDS.map(([b,l])=>({id:null,name:b,series:l.map(n=>({id:null,name:n,other:false,al:[]}))}));
const rkSeriesOf=g=>g.series.some(x=>x.other)?g.series:g.series.concat([{id:null,name:RK_OTHER_NAME,other:true,al:[]}]);   // 兜底列表没有「其他系列」，补一个
function rkLibLoad(){if(RK_LIB.groups||RK_LIB.p||!nbqOn())return;
  RK_LIB.p=Promise.resolve().then(()=>NBQ_NET.get('/api/rackets/lib',null,{noauth:true})).then(r=>{const g=r&&r.ok?nbqFromRacketLib(r.data):null;if(!g)return;RK_LIB.groups=g;
    if(rkOpen()&&!RK.touched){if(RK.mode==='swap')rkEnter();else if(RK.view==='brand'){const l=$('#rkLs');if(l)l.innerHTML=rkBrandRows()}}}).catch(()=>{}).finally(()=>{RK_LIB.p=null})}   // 到了就换上；用户已经点过 / 打过字就不动
// 埋点直接写 track('事件名', …)：static/check 按这个写法核对「代码里的事件名都在字典里、两端一致」；props 与字典逐字一致，不传手写文字
// 读入（nbqApply 调用）：读到了 → 以服务器为准；没读到 → 保留这次之前的（同一个人），不清空
function nbqRacketsIn(me,list,old){if(!me)return;if(Array.isArray(list)){me.rackets=list;return}if(!Array.isArray(me.rackets)&&Array.isArray(old))me.rackets=old}
// 当前的球拍：null = 真实模式还没读到（不显示槽位、不许改）
const rkList=()=>{if(!ME)return null;if(Array.isArray(ME.rackets))return ME.rackets;if(typeof nbqOn==='function'&&nbqOn())return null;return ME.rackets=[]};

/* ---- 画：主力一张大卡 + 两张备用小卡；有昵称时昵称为主、「品牌 系列」为副；空槽虚线「＋ 添加球拍」；品牌首字母圆徽章（中性色）---- */
const RK_ICO='<svg class="rk-hi" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" aria-hidden="true"><g transform="rotate(45 14 10)"><ellipse cx="14" cy="8.6" rx="4.4" ry="6.1" stroke-width="1.7"/><path d="M12 4.2v8.8M14 2.6v12M16 4.2v8.8M9.9 6.6h8.2M9.7 9h8.6M9.9 11.4h8.2" stroke-width=".7" opacity=".6"/><path d="M14 14.7v2.2" stroke-width="1.5"/><path d="M14 17v5.2" stroke-width="2.6"/></g></svg>';
const rkBr=r=>r.other_brand_text||r.brand||'';
const rkName=r=>(rkBr(r)?rkBr(r)+' ':'')+r.series;
function rkRow(r,i){const sub=rkBr(r);
  return `<button class="rk-row" data-a="rkSlot" data-i="${i}" aria-label="${i===0?'主力拍：':''}${esc(rkName(r))}，点开可以编辑、设为主力或删除"><span class="v"><b class="rk-se">${esc(r.series)}</b>${sub?`<small class="rk-br">${esc(sub)}</small>`:''}</span>${i===0?'<span class="rk-main">主力</span>':''}<i class="rk-chev" aria-hidden="true"></i></button>`}
const rkAddRow=n=>`<button class="rk-row rk-add" data-a="rkSlot" data-i="${n}"><span class="rk-plus" aria-hidden="true">＋</span><span>添加球拍</span></button>`;
// 个人页的一节：pwa = 分组标题 + 分组；web = 一张卡片
function rkSectionHTML(kind){if(!NBQ_RACKETS_ON||!ME)return '';
  const L=rkList(),rows=L===null?`<div class="rk-off">断线了。球拍等会儿再看。</div>`:L.map(rkRow).join('')+(L.length<RK_MAX?rkAddRow(L.length):'');
  const h=`<span class="rk-h">${RK_ICO}我的球拍</span>`;
  return kind==='web'?`<div class="card rk-card"><div class="ch-h">${h}</div><div class="rk">${rows}</div></div>`
    :`<div class="sec-t">${h}</div><div class="rk rk-pwa">${rows}</div>`}

// 别人的球员卡弹层里的一行（#60 PR-C）：开关关着 / 没拍 / 已注销 → 空串（不出空栏）；显示「品牌 系列」（不显示昵称）
function rkCardHTML(uid){if(!NBQ_RACKETS_ON)return '';const u=USERS[uid],L=u&&!u.gone&&Array.isArray(u.rackets)?u.rackets:[];if(!L.length)return '';
  return `<div class="rk-pc"><span class="rk-h">${RK_ICO}球拍</span><div class="rk-pl">${L.map((r,i)=>`<span class="rk-pi">${i===0&&L.length>1?'<em>主力</em>':''}${esc(rkName(r))}</span>`).join('')}</div></div>`}

/* ---- 弹层（PWA 底部弹层 / 网页端弹窗，同一份内容）：品牌 → 系列两步列表，点到系列就保存 ---- */
// RK.brand：品牌组 | '*'（其他品牌）| null；RK.ser：系列 | null；view：brand（选品牌 + 搜索）/ series（选系列）/ text（其他：写名字）/ slot（操作）/ del（删除确认）
const RK={i:0,mode:'add',brand:null,ser:null,q:'',other:'',view:null,touched:false,keepNick:null,curKey:null};
const rkSheet=()=>typeof openSheet==='function';
function rkShow(html){html=`<div class="rk-pk">${html}</div>`;if(rkSheet())openSheet(html);else openModal(`<div class="m-b">${html}</div>`,'sm')}
const rkHide=()=>{RK.view=null;if(rkSheet())closeSheet();else closeModal()};
// 选拍弹层开着吗（看底板：手机端 #sheet 的 show 要下一帧才加，#sbg 是立刻加的）
const rkOpen=()=>rkSheet()?!!(document.querySelector('#sbg.show')&&document.querySelector('#sheet .rk-pk')):!!(document.querySelector('#mbg.show')&&document.querySelector('#modal .rk-pk'));
// 包里别的槽位已有的（编辑时，自己这把不算）
const rkTaken=()=>{const L=rkList()||[],o=new Set();L.forEach((r,j)=>{if(RK.mode==='swap'&&j===RK.i)return;o.add(rkKey({brand:rkBr(r),series:r.series}))});return o};
const rkAny=r=>[r.name.toLowerCase(),...r.al];
// 搜索：品牌名 / 系列名 / 别名包含关键字（不分大小写）
const rkMatchS=(g,q)=>rkSeriesOf(g).filter(x=>!x.other&&(g.name.toLowerCase()+' '+rkAny(x).join(' ')).includes(q));
const rkHead=(t,back)=>`<div class="rk-hd">${back?'<button class="rk-bk" data-a="rkBack" aria-label="返回"></button>':'<span class="rk-bk"></span>'}<b class="rk-tt">${esc(t)}</b><span class="rk-bk"></span></div>`;
const rkLi=(a,at,lab,tail,cls)=>`<button class="rk-li${cls||''}" data-a="${a}"${at||''}><span>${esc(lab)}</span>${tail||''}</button>`;
const RK_CHEV='<i class="rk-chev" aria-hidden="true"></i>';
function rkSeriesRow(g,x,lab,tk){const own=!x.other&&tk.has(rkKey({brand:g.name,series:x.name})),cur=!x.other&&RK.curKey===rkKey({brand:g.name,series:x.name});
  return rkLi('rkSeries',` data-b="${esc(g.name)}" data-s="${esc(x.name)}"${own?' disabled':''}`,lab,own?'<small>已在包里</small>':cur?'<i class="rk-ck" aria-hidden="true"></i>':x.other?RK_CHEV:'',x.other?' oth':'')}
const rkBrandRow=g=>rkLi('rkBrand',` data-b="${esc(g.name)}"`,g.name,RK_CHEV);
function rkBrandRows(){const q=RK.q.toLowerCase(),G=rkGroups(),oth=rkLi('rkOther','','其他品牌',RK_CHEV,' oth');
  if(!q)return G.map(rkBrandRow).join('')+oth;
  const bs=G.filter(g=>g.name.toLowerCase().includes(q)),tk=rkTaken();   // 品牌名对上的出品牌行；只有系列 / 别名对上的直接出「品牌 系列」行，点了就保存
  return bs.map(rkBrandRow).join('')+G.filter(g=>!bs.includes(g)).flatMap(g=>rkMatchS(g,q).map(x=>rkSeriesRow(g,x,g.name+' '+x.name,tk))).join('')+oth}
const rkSeriesRows=g=>{const tk=rkTaken();return rkSeriesOf(g).map(x=>rkSeriesRow(g,x,x.name,tk)).join('')};
function rkRender(){const v=RK.view,b=RK.brand;
  if(v==='series'&&b&&b!=='*'){const g=rkGroups().find(x=>x.name===b.name)||b;RK.brand=g;
    rkShow(rkHead(g.name,true)+`<div class="rk-sc"><div class="rk-ls">${rkSeriesRows(g)}</div></div>`);return}
  if(v==='text'){const ph=b==='*'?'品牌和型号，例如 Diadem Elevate':'型号，例如 Pro Staff 97';
    rkShow(rkHead(b==='*'?'其他品牌':b.name+' · 其他系列',true)+`<div class="rk-sc rk-tx"><input id="rkName" class="inp" autocomplete="off" autocapitalize="words" spellcheck="false" enterkeyhint="done" placeholder="${ph}" aria-label="拍子名称" value="${esc(RK.other)}"><div class="rk-err" id="rkErr" role="alert"></div></div><div class="rk-ft"><button class="btn btn-p rk-save" data-a="rkSave"${rkValid()?'':' disabled'}>完成</button></div>`);
    const n=$('#rkName');n.addEventListener('input',()=>{RK.other=n.value;RK.touched=true;$('#rkErr').textContent='';const sv=document.querySelector('[data-a="rkSave"]');if(sv)sv.disabled=!rkValid()});
    n.addEventListener('keydown',e=>{if(e.key!=='Enter')return;e.preventDefault();if(!nbqImeEnter(e))n.blur()});return}
  RK.view='brand';
  rkShow(rkHead('品牌',false)+`<input id="rkQ" class="inp rk-q" type="search" inputmode="search" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="search" placeholder="搜索" value="${esc(RK.q)}" aria-label="搜索球拍"><div class="rk-sc"><div class="rk-ls" id="rkLs">${rkBrandRows()}</div></div>`);
  const q=$('#rkQ');
  q.addEventListener('input',()=>{if(q.isComposing)return;RK.q=rkClean(q.value);RK.touched=true;$('#rkLs').innerHTML=rkBrandRows()});q.addEventListener('compositionend',()=>q.dispatchEvent(new Event('input')));
  q.addEventListener('keydown',e=>{if(e.key!=='Enter')return;e.preventDefault();if(!nbqImeEnter(e))q.blur()})}
const rkDraw=rkRender;
const rkFocus=()=>{const i=$('#rkName');if(i)i.focus({preventScroll:true})};   // 在点击的同一帧里聚焦，iOS 才肯弹键盘
const rkValid=()=>!!rkClean(RK.other);
// 编辑 / 重读库后：把已选的对回库里的品牌和系列（按 id，没有 id 按名字），再决定停在哪一步
function rkEnter(){const r=RK.mode==='swap'?(rkList()||[])[RK.i]:null;if(!r){RK.view='brand';rkRender();return}
  const G=rkGroups(),bn=rkBr(r).toLowerCase(),g=G.find(b=>r.brand_id&&b.id===r.brand_id)||G.find(b=>b.name.toLowerCase()===bn);
  if(!g){RK.brand='*';RK.ser=null;RK.other=rkName(r);RK.view='text';rkRender();rkFocus();return}
  RK.brand=g;const se=rkSeriesOf(g),x=se.find(s=>r.series_id&&s.id===r.series_id)||se.find(s=>!s.other&&s.name.toLowerCase()===r.series.toLowerCase());
  if(x){RK.ser=x;RK.other='';RK.view='series'}else{RK.ser=se.find(s=>s.other);RK.other=r.other_text||r.series;RK.view='text'}
  rkRender();if(RK.view==='text')rkFocus()}
function rkSlotSheet(i){const r=(rkList()||[])[i];RK.view='slot';
  rkShow(`<div class="rk-hero">${rkBr(r)?`<small class="rk-br">${esc(rkBr(r))}</small>`:''}<b class="rk-ht">${esc(r.series)}</b></div>
    <div class="rk-ls">${rkLi('rkEdit','','编辑')}${i>0?rkLi('rkMain','','设为主力'):''}${rkLi('rkDel','','删除','',' danger')}</div>`)}
function rkDelSheet(i){const r=(rkList()||[])[i];RK.view='del';
  rkShow(`<div class="rk-hero">${rkBr(r)?`<small class="rk-br">${esc(rkBr(r))}</small>`:''}<b class="rk-ht">${esc(r.series)}</b></div>
    <div class="rk-ls">${rkLi('rkDelOk','','确认删除','',' danger')}${rkLi('rkNo','','先不删')}</div>`)}

/* ---- 写：整组替换。真实模式走 nbqWrite（快照期间 / 连点 / 失败提示都在里面），成功后以服务器返回为准 ---- */
// 发给服务器的一项：库里的 {brand_id, series_id | other_text}，其余旧形状；有昵称才带
function rkWire(r){const n=r.nickname?{nickname:r.nickname}:{};
  if(r.brand_id&&(r.series_id||r.other_text))return r.series_id?{brand_id:r.brand_id,series_id:r.series_id,...n}:{brand_id:r.brand_id,other_text:r.other_text,...n};
  if(r.catalog_id)return{catalog_id:r.catalog_id,...n};
  return{brand:rkBr(r)||null,series:r.series,...n}}
// ev = {action, source}：服务器保存成功后才发 racket_save
async function rkCommit(next,done,btn,ev){const L=rkList();
  if(L===null){toast('球拍还没读到，稍等一下再试');return false}
  const keep=next.slice(0,RK_MAX),pk=document.querySelector('.rk-pk');if(pk)pk.classList.add('busy');if(btn)btn.classList.add('busy');
  try{
    if(nbqOn()){const d=await nbqWrite('rackets',n=>n.put('/api/me/rackets',{rackets:keep.map(rkWire)}));if(d===null)return false;
      const got=nbqFromRackets(d.rackets);if(ME&&got)ME.rackets=got}
    else ME.rackets=keep;
    if(ev)track('racket_save',{action:ev.action,source:ev.source,n_after:(rkList()||[]).length});
    rkHide();toast(done);render();return true}
  finally{if(pk)pk.classList.remove('busy');if(btn)btn.classList.remove('busy')}}
// 当场校验（与服务器同一套规则，服务器为准）：返回 [原因, 提示]；原因进 racket_invalid
function rkCheck(v){const bad='名字里不能有链接、@ 或一长串数字';
  if(!v)return['empty','写一下拍子的名字'];if([...v].length>RK_LEN)return['long',`最多 ${RK_LEN} 个字`];
  if(/http|www/i.test(v))return['link',bad];if(/[@＠]/.test(v))return['at',bad];if(/[0-9０-９]{6,}/.test(v))return['digits',bad];return null}
// 当前选的 → 一项（昵称这一版不开放：编辑时原样带着服务器上已有的，不新增 / 不显示）
function rkBuild(){const nick=RK.keepNick||null,g=RK.brand,txt=rkClean(RK.other);
  if(g==='*')return{brand:null,series:txt,catalog_id:null,brand_id:null,series_id:null,other_text:null,other_brand_text:null,nickname:nick};
  if(RK.ser.other)return{brand:g.name,series:txt,catalog_id:null,brand_id:g.id,series_id:null,other_text:g.id?txt:null,other_brand_text:null,nickname:nick};
  return{brand:g.name,series:RK.ser.name,catalog_id:null,brand_id:g.id,series_id:RK.ser.id,other_text:null,other_brand_text:null,nickname:nick}}
// 提交当前选的：ev = 点选（catalog）还是手写（other）；重复的当场提示
function rkSubmit(btn,other){const e=$('#rkErr');let err=null;
  if(other)err=rkCheck(rkClean(RK.other));
  const r=err?null:rkBuild();
  if(!err&&rkTaken().has(rkKey({brand:rkBr(r),series:r.series})))err=['dup','这把已经在包里了'];
  if(err){if(e)e.textContent=err[1];else toast(err[1]);track('racket_invalid',{reason:err[0]});return}
  const L=[...(rkList()||[])],ev=other?'other':'catalog',i=$('#rkName');if(i)i.blur();
  if(RK.mode==='swap'){L[RK.i]=r;return void rkCommit(L,'已更新 '+rkName(r),btn,{action:'swap',source:ev})}
  L.push(r);return void rkCommit(L,L.length===1?'主力拍已就位':'已放进包里',btn,{action:'add',source:ev})}
// 事件（两端 0270 的 switch 转过来）
function rkAct(a){const d=a.dataset,L=rkList();
  switch(d.a){
    case'rkSlot':{if(L===null){toast('球拍还没读到，稍等一下再试');return}const i=+d.i||0;
      if(L[i]){RK.i=i;rkSlotSheet(i);return}
      Object.assign(RK,{i:L.length,mode:'add',brand:null,ser:null,q:'',other:'',view:'brand',touched:false,keepNick:null,curKey:null});rkLibLoad();rkRender();track('racket_picker_open',{mode:'add',slot:RK.i+1});return}
    case'rkEdit':{const r=L&&L[RK.i];if(!r)return;Object.assign(RK,{mode:'swap',brand:null,ser:null,q:'',other:'',touched:false,keepNick:r.nickname||null,curKey:rkKey({brand:rkBr(r),series:r.series})});rkEnter();rkLibLoad();track('racket_picker_open',{mode:'swap',slot:RK.i+1});return}
    case'rkBrand':{const g=rkGroups().find(b=>b.name===d.b);if(!g)return;Object.assign(RK,{touched:true,brand:g,ser:null,other:'',view:'series'});rkRender();track('racket_brand_pick',{brand:g.name});return}   // 品牌名来自库 / 兜底列表，不是手写
    case'rkOther':if(RK.brand!=='*')track('racket_brand_pick',{brand:'other'});Object.assign(RK,{touched:true,brand:'*',ser:null,other:'',view:'text'});rkRender();rkFocus();return;
    case'rkSeries':{const g=rkGroups().find(b=>b.name===d.b),x=g&&rkSeriesOf(g).find(s=>s.name===d.s);if(!x)return;RK.touched=true;
      if(x.other){Object.assign(RK,{brand:g,ser:x,other:'',view:'text'});rkRender();rkFocus();return}
      Object.assign(RK,{brand:g,ser:x,other:''});return void rkSubmit(a,false)}
    case'rkBack':{if(RK.view==='text'&&RK.brand!=='*'){RK.view='series'}else{RK.view='brand';RK.brand=null;RK.ser=null}rkRender();return}
    case'rkSave':if(rkValid())rkSubmit(a,true);return;
    case'rkMain':{if(!L||!L[RK.i]||!RK.i)return;const n=[...L];[n[0],n[RK.i]]=[n[RK.i],n[0]];   // 和 1 号位交换，不做拖拽排序
      return void rkCommit(n,'已设为主力',a,{action:'main',source:rkSrc(L[RK.i])})}
    case'rkDel':if(L&&L[RK.i])rkDelSheet(RK.i);return;
    case'rkNo':rkHide();return;
    case'rkDelOk':{if(!L||!L[RK.i])return;const r=L[RK.i];return void rkCommit(L.filter((_,j)=>j!==RK.i),'已删除 '+rkName(r),a,{action:'remove',source:rkSrc(r)})}
  }}
const rkSrc=r=>r.series_id||r.catalog_id?'catalog':'other';   // 埋点 source：这把有没有归到库里
