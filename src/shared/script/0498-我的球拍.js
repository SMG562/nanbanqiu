/* ============================== 我的球拍（#60 PR-B） ==============================
 * 个人页三个槽位，1 号是主力；只记「品牌 + 系列」，是身份展示不是器材档案（不做稀有度 / 进度 / 红点）。
 * 数据：挂在 ME.rackets（[{brand|null, series}]，顺序 = 槽位）。真实模式只认服务器：读入走 nbqLoadAll → nbqApply → nbqRacketsIn；
 *   写入走 nbqWrite(PUT /api/me/rackets) 整组替换，成功后用服务器返回的列表；读不到（undefined）时不许改，免得拿空列表把服务器上的冲掉。
 * 演示模式（NBQ_NET 为空）：只改内存。快照（nbq_snap）随 USERS 一起存，刷新不先闪空槽。
 * 开关 NBQ_RACKETS_ON：正式站默认关（上线闸门过了由所有者打开，见 #60 PR-D）；测试环境（分支预览，连测试库）开；
 *   任何设备可用 localStorage nbq_ff_rackets=1 单独打开（真机预看、自动化测试）。关着时不显示入口、也不读接口。
 * PR2b（#389，ADR 0014）：品牌 → 系列两级库（GET /api/rackets/lib，第一次打开弹层时读，同一页面只读一次）；没读到 / 数据不对 / 演示模式 → 用 RK_BRANDS 兜底（发旧形状 {brand, series}）。
 *   弹层一屏：搜索 → 品牌 chips → 系列 chips → 昵称（选填 ≤12 字符）→ 保存。库里的点选发 {brand_id, series_id, nickname}，「其他系列」发 other_text，「其他品牌」发旧形状 {brand:null, series}。
 *   老行（品牌对不上：brand_id 空、other_text / other_brand_text 皆空）照旧读 brand / series 列。
 *   埋点（字典 tests/spec/events_spec.md）：racket_picker_open / racket_brand_pick / racket_save（服务器保存成功后才发）/ racket_invalid；不记手写的文字。 */
const NBQ_RACKETS_ON=(()=>{if(typeof NBQ_ENV!=='undefined'&&NBQ_ENV==='staging')return true;try{return localStorage.getItem('nbq_ff_rackets')==='1'}catch(_){return false}})();
const RK_MAX=3,RK_LEN=30,RK_NICK=12;
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
    if(rkOpen()&&RK.view==='pick'&&!RK.touched)rkReselect(),rkParts()}).catch(()=>{}).finally(()=>{RK_LIB.p=null})}   // 到了就换上；用户已经点过 / 打过字就不动
// 埋点直接写 track('事件名', …)：static/check 按这个写法核对「代码里的事件名都在字典里、两端一致」；props 与字典逐字一致，不传手写文字
// 读入（nbqApply 调用）：读到了 → 以服务器为准；没读到 → 保留这次之前的（同一个人），不清空
function nbqRacketsIn(me,list,old){if(!me)return;if(Array.isArray(list)){me.rackets=list;return}if(!Array.isArray(me.rackets)&&Array.isArray(old))me.rackets=old}
// 当前的球拍：null = 真实模式还没读到（不显示槽位、不许改）
const rkList=()=>{if(!ME)return null;if(Array.isArray(ME.rackets))return ME.rackets;if(typeof nbqOn==='function'&&nbqOn())return null;return ME.rackets=[]};

/* ---- 画：主力一张大卡 + 两张备用小卡；有昵称时昵称为主、「品牌 系列」为副；空槽虚线「＋ 添加球拍」；品牌首字母圆徽章（中性色）---- */
const RK_ICO='<svg class="rk-hi" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" aria-hidden="true"><g transform="rotate(45 14 10)"><ellipse cx="14" cy="8.6" rx="4.4" ry="6.1" stroke-width="1.7"/><path d="M12 4.2v8.8M14 2.6v12M16 4.2v8.8M9.9 6.6h8.2M9.7 9h8.6M9.9 11.4h8.2" stroke-width=".7" opacity=".6"/><path d="M14 14.7v2.2" stroke-width="1.5"/><path d="M14 17v5.2" stroke-width="2.6"/></g></svg>';
const rkBr=r=>r.other_brand_text||r.brand||'';
const rkName=r=>(rkBr(r)?rkBr(r)+' ':'')+r.series;
const rkTitle=r=>r.nickname||rkName(r);
const rkInit=r=>([...(rkBr(r)||r.series)][0]||'?').toUpperCase();
function rkRow(r,i){const big=i===0,sub=r.nickname?rkName(r):rkBr(r),ti=r.nickname||r.series;
  return `<button class="rk-row ${big?'rk-big main':'rk-sm'}" data-a="rkSlot" data-i="${i}" aria-label="${big?'主力拍：':''}${esc(rkTitle(r))}，点开可以编辑、设为主力或删除">`+
    `<span class="rk-av" aria-hidden="true">${esc(rkInit(r))}</span><span class="v"><b class="rk-se">${esc(ti)}</b>${sub?`<small class="rk-br">${esc(sub)}</small>`:''}</span>${big?'<span class="rk-main">主力</span>':''}<span class="rk-more" aria-hidden="true">⋯</span></button>`}
function rkAddRow(n){
  return `<button class="rk-row rk-add${n?' rk-sm':' rk-big'}" data-a="rkSlot" data-i="${n}"><span class="rk-plus" aria-hidden="true">＋</span><span>添加球拍</span>${n?'':'<small class="rk-hint">第一把是主力</small>'}</button>`}
// 个人页的一节：pwa = 分组标题 + 分组；web = 一张卡片
function rkSectionHTML(kind){if(!NBQ_RACKETS_ON||!ME)return '';
  const L=rkList(),rows=L===null?`<div class="rk-off">断线了。球拍等会儿再看。</div>`:(L.length?rkRow(L[0],0):rkAddRow(0))+(L.length?`<div class="rk-two">${L.slice(1).map((r,j)=>rkRow(r,j+1)).join('')}${L.length<RK_MAX?rkAddRow(L.length):''}</div>`:'');
  const h=`<span class="rk-h">${RK_ICO}我的球拍</span>`;
  return kind==='web'?`<div class="card rk-card"><div class="ch-h">${h}</div><div class="rk">${rows}</div></div>`
    :`<div class="sec-t">${h}</div><div class="rk rk-pwa">${rows}</div>`}

// 别人的球员卡弹层里的一行（#60 PR-C）：开关关着 / 没拍 / 已注销 → 空串（不出空栏）；显示「品牌 系列」（不显示昵称）
function rkCardHTML(uid){if(!NBQ_RACKETS_ON)return '';const u=USERS[uid],L=u&&!u.gone&&Array.isArray(u.rackets)?u.rackets:[];if(!L.length)return '';
  return `<div class="rk-pc"><span class="rk-h">${RK_ICO}球拍</span><div class="rk-pl">${L.map((r,i)=>`<span class="rk-pi">${i===0&&L.length>1?'<em>主力</em>':''}${esc(rkName(r))}</span>`).join('')}</div></div>`}

/* ---- 弹层（PWA 底部弹层 / 网页端弹窗，同一份内容）---- */
// RK.brand：品牌组 | '*'（其他品牌）| null；RK.ser：系列 | null；view：pick（选拍）/ slot（操作）/ del（删除确认）
const RK={i:0,mode:'add',brand:null,ser:null,q:'',other:'',nick:'',view:null,touched:false,keepId:null};
const rkSheet=()=>typeof openSheet==='function';
const rkCls=()=>rkSheet()?{t:'sh-t',s:'sh-s'}:{t:'m-t',s:'m-s'};
function rkShow(html){html=`<div class="rk-pk">${html}</div>`;if(rkSheet())openSheet(html);else openModal(`<div class="m-b">${html}</div>`,'sm')}
const rkHide=()=>{RK.view=null;if(rkSheet())closeSheet();else closeModal()};
// 选拍弹层开着吗（看底板：手机端 #sheet 的 show 要下一帧才加，#sbg 是立刻加的）
const rkOpen=()=>rkSheet()?!!(document.querySelector('#sbg.show')&&document.querySelector('#sheet .rk-pk')):!!(document.querySelector('#mbg.show')&&document.querySelector('#modal .rk-pk'));
// 包里别的槽位已有的（编辑时，自己这把不算）
const rkTaken=()=>{const L=rkList()||[],o=new Set();L.forEach((r,j)=>{if(RK.mode==='swap'&&j===RK.i)return;o.add(rkKey({brand:rkBr(r),series:r.series}))});return o};
const rkAny=r=>[r.name.toLowerCase(),...r.al];
// 搜索：品牌名 / 系列名 / 别名包含关键字（不分大小写）。有关键字时系列区列出所有品牌下命中的系列
function rkMatchS(g,q){return rkSeriesOf(g).filter(x=>!x.other&&(g.name.toLowerCase()+' '+rkAny(x).join(' ')).includes(q))}
function rkBrands(){const q=RK.q.toLowerCase();return q?rkGroups().filter(g=>g.name.toLowerCase().includes(q)||rkMatchS(g,q).length):rkGroups()}
function rkSeriesChips(){const q=RK.q.toLowerCase(),tk=rkTaken();
  const chip=(g,x,lab)=>{const k=rkKey({brand:g.name,series:x.name}),own=!x.other&&tk.has(k),on=RK.ser===x&&RK.brand===g;
    return `<button class="rk-chip${on?' on':''}${x.other?' oth':''}" data-a="rkSeries" data-b="${esc(g.name)}" data-s="${esc(x.name)}"${own?' disabled':''} aria-pressed="${on}">${esc(lab)}${own?'<small>已在包里</small>':''}</button>`};
  if(q&&!RK.brand)return rkGroups().flatMap(g=>rkMatchS(g,q).map(x=>chip(g,x,g.name+' '+x.name))).join('')||`<div class="rk-none">没找到，可以点「其他品牌」自己写</div>`;
  if(RK.brand&&RK.brand!=='*'){const g=RK.brand;return rkSeriesOf(g).filter(x=>!q||x.other||rkAny(x).join(' ').includes(q)).map(x=>chip(g,x,x.name)).join('')}
  return '<div class="rk-none">先选个品牌</div>'}
function rkNeedText(){return RK.brand==='*'||(RK.ser&&RK.ser.other)}
const rkValid=()=>RK.brand==='*'?!!rkClean(RK.other):!!(RK.brand&&RK.ser&&(!RK.ser.other||rkClean(RK.other)));
// 只重画会变的几块，搜索框和昵称输入框不动（不丢焦点、不丢输入法组合）
function rkParts(){const g=$('#rkBr');if(!g)return;
  g.innerHTML=rkBrands().map(b=>`<button class="rk-chip brand${RK.brand===b?' on':''}" data-a="rkBrand" data-b="${esc(b.name)}" aria-pressed="${RK.brand===b}">${esc(b.name)}</button>`).join('')+`<button class="rk-chip brand oth${RK.brand==='*'?' on':''}" data-a="rkOther" aria-pressed="${RK.brand==='*'}">其他品牌</button>`;
  $('#rkSe').innerHTML=RK.brand==='*'?'':rkSeriesChips();
  const t=$('#rkTx');t.hidden=!rkNeedText();$('#rkName').placeholder=RK.brand==='*'?'品牌和型号，例如 Diadem Elevate':'系列 / 型号，例如 Pro Staff 97';
  const sv=document.querySelector('[data-a="rkSave"]');if(sv)sv.disabled=!rkValid()}
// 编辑 / 重读库后：把已选的对回库里的品牌和系列（按 id，没有 id 按名字）
function rkReselect(){const r=RK.mode==='swap'?(rkList()||[])[RK.i]:null;if(!r)return;const G=rkGroups(),bn=rkBr(r).toLowerCase();
  const g=G.find(b=>r.brand_id&&b.id===r.brand_id)||G.find(b=>b.name.toLowerCase()===bn);
  if(!g){RK.brand='*';RK.ser=null;RK.other=rkName(r);return}
  RK.brand=g;const se=rkSeriesOf(g),x=se.find(s=>r.series_id&&s.id===r.series_id)||se.find(s=>!s.other&&s.name.toLowerCase()===r.series.toLowerCase());
  if(x){RK.ser=x;RK.other=''}else{RK.ser=se.find(s=>s.other);RK.other=r.other_text||r.series}}
function rkDraw(){const c=rkCls(),L=rkList()||[],cur=RK.mode==='swap'?L[RK.i]:null;RK.view='pick';
  rkShow(`<div class="rk-sc"><div class="${c.t}">${cur?'编辑球拍':'添一把球拍'}</div><p class="${c.s}">${cur?'换品牌 / 系列，或者只改昵称。':RK.i===0||!L.length?'这把会是你的主力。':'选品牌和系列就好。'}</p>
    <input id="rkQ" class="inp rk-q" type="search" inputmode="search" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="search" placeholder="搜品牌或系列，例如 Pure Drive" value="${esc(RK.q)}" aria-label="搜索球拍">
    <div class="rk-grid brands" id="rkBr"></div><div class="rk-grid" id="rkSe"></div>
    <label class="rk-field" id="rkTx" hidden><span class="rk-lab">拍子名称</span><input id="rkName" class="inp" autocomplete="off" autocapitalize="words" spellcheck="false" enterkeyhint="next" value="${esc(RK.other)}"></label>
    <label class="rk-field"><span class="rk-lab">昵称（选填，≤${RK_NICK} 个字）</span><input id="rkNick" class="inp" autocomplete="off" spellcheck="false" enterkeyhint="done" placeholder="例如 老伙计" value="${esc(RK.nick)}"></label>
    <div class="rk-meta"><span class="rk-err" id="rkErr" role="alert"></span><span class="rk-n" id="rkN">${[...RK.nick].length}/${RK_NICK}</span></div></div>
    <div class="rk-ft"><p class="rk-note">球拍和姓名一样，所有球友可见</p><button class="btn btn-p rk-save" data-a="rkSave" disabled>保存</button></div>`);
  rkParts();
  const q=$('#rkQ'),n=$('#rkName'),k=$('#rkNick'),done=e=>{if(e.key!=='Enter')return;e.preventDefault();if(!nbqImeEnter(e))e.target.blur()};
  q.addEventListener('input',()=>{if(q.isComposing)return;RK.q=rkClean(q.value);RK.touched=true;rkParts()});q.addEventListener('compositionend',()=>q.dispatchEvent(new Event('input')));q.addEventListener('keydown',done);
  n.addEventListener('input',()=>{RK.other=n.value;RK.touched=true;$('#rkErr').textContent='';rkParts()});n.addEventListener('keydown',done);
  // 昵称：输入法组合期间不截断（组合结束再按 ≤12 字符截）
  const cap=()=>{const a=[...k.value];if(a.length>RK_NICK)k.value=a.slice(0,RK_NICK).join('');RK.nick=k.value;$('#rkN').textContent=[...k.value].length+'/'+RK_NICK};
  k.addEventListener('input',e=>{RK.touched=true;$('#rkErr').textContent='';if(e.isComposing){RK.nick=k.value;$('#rkN').textContent=[...k.value].length+'/'+RK_NICK;return}cap()});k.addEventListener('compositionend',cap);k.addEventListener('keydown',done)}
function rkSlotSheet(i){const L=rkList()||[],r=L[i],c=rkCls();RK.view='slot';
  rkShow(`<div class="rk-hero">${rkBr(r)?`<small class="rk-br">${esc(r.nickname?rkName(r):rkBr(r))}</small>`:''}<div class="rk-ht"><b class="${c.t}">${esc(r.nickname||r.series)}</b>${i===0?'<span class="rk-main">主力</span>':''}</div></div>
    <div class="rk-acts"><button class="rk-act" data-a="rkEdit"><b>编辑</b></button>${i>0?`<button class="rk-act" data-a="rkMain"><b>设为主力</b><small>和现在的主力换个位置</small></button>`:''}
      <button class="rk-act danger" data-a="rkDel"><b>删除</b></button></div>`)}
function rkDelSheet(i){const r=(rkList()||[])[i],c=rkCls();RK.view='del';
  rkShow(`<div class="${c.t}">删除这把球拍？</div><p class="${c.s}">${esc(rkTitle(r))}${i===0&&(rkList()||[]).length>1?'。删掉后，下一把会成为主力。':'。'}</p>
    <div class="rk-acts"><button class="rk-act danger" data-a="rkDelOk"><b>确认删除</b></button><button class="rk-act" data-a="rkNo"><b>先不删</b></button></div>`)}

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
function rkNickCheck(v){if(!v)return null;if([...v].length>RK_NICK)return['long',`昵称最多 ${RK_NICK} 个字`];const bad='昵称里不能有链接、@ 或一长串数字';
  if(/http|www/i.test(v))return['link',bad];if(/[@＠]/.test(v))return['at',bad];if(/[0-9０-９]{6,}/.test(v))return['digits',bad];return null}
// 当前选的 → 一项
function rkBuild(){const nick=rkClean(RK.nick)||null,g=RK.brand,txt=rkClean(RK.other);
  if(g==='*')return{brand:null,series:txt,catalog_id:null,brand_id:null,series_id:null,other_text:null,other_brand_text:null,nickname:nick};
  if(RK.ser.other)return{brand:g.name,series:txt,catalog_id:null,brand_id:g.id,series_id:null,other_text:g.id?txt:null,other_brand_text:null,nickname:nick};
  return{brand:g.name,series:RK.ser.name,catalog_id:null,brand_id:g.id,series_id:RK.ser.id,other_text:null,other_brand_text:null,nickname:nick}}
function rkSave(btn){if(!rkValid())return;const txt=rkClean(RK.other),nick=rkClean(RK.nick),e=$('#rkErr'),other=rkNeedText();
  let err=other?rkCheck(txt):null;
  if(!err){const r=rkBuild();if(rkTaken().has(rkKey({brand:rkBr(r),series:r.series})))err=['dup','这把已经在包里了']}
  if(!err)err=rkNickCheck(nick);
  if(err){if(e)e.textContent=err[1];track('racket_invalid',{reason:err[0]});return}
  const r=rkBuild(),L=[...(rkList()||[])],ev=other?'other':'catalog',i=$('#rkName'),k=$('#rkNick');if(i)i.blur();if(k)k.blur();
  if(RK.mode==='swap'){L[RK.i]=r;return void rkCommit(L,'已更新 '+rkTitle(r),btn,{action:'swap',source:ev})}
  L.push(r);return void rkCommit(L,L.length===1?'主力拍已就位':'已放进包里',btn,{action:'add',source:ev})}
// 事件（两端 0270 的 switch 转过来）
function rkAct(a){const d=a.dataset,L=rkList();
  switch(d.a){
    case'rkSlot':{if(L===null){toast('球拍还没读到，稍等一下再试');return}const i=+d.i||0;
      if(L[i]){RK.i=i;rkSlotSheet(i);return}
      Object.assign(RK,{i:L.length,mode:'add',brand:null,ser:null,q:'',other:'',nick:'',touched:false});rkLibLoad();rkDraw();track('racket_picker_open',{mode:'add',slot:RK.i+1});return}
    case'rkEdit':{const r=L&&L[RK.i];if(!r)return;Object.assign(RK,{mode:'swap',brand:null,ser:null,q:'',other:'',nick:r.nickname||'',touched:false});rkReselect();rkLibLoad();rkDraw();track('racket_picker_open',{mode:'swap',slot:RK.i+1});return}
    case'rkBrand':{const g=rkGroups().find(b=>b.name===d.b);if(!g)return;RK.touched=true;if(RK.brand!==g){RK.brand=g;RK.ser=null;RK.other=''}const o=$('#rkName');if(o)o.value=RK.other;rkParts();track('racket_brand_pick',{brand:g.name});return}   // 品牌名来自库 / 兜底列表，不是手写
    case'rkOther':RK.touched=true;if(RK.brand!=='*')track('racket_brand_pick',{brand:'other'});RK.brand='*';RK.ser=null;rkParts();setTimeout(()=>{const i=$('#rkName');if(i)i.focus()},rkSheet()?320:60);return;
    case'rkSeries':{const g=rkGroups().find(b=>b.name===d.b),x=g&&rkSeriesOf(g).find(s=>s.name===d.s);if(!x)return;RK.touched=true;
      if(RK.brand!==g){RK.brand=g;RK.other='';const o=$('#rkName');if(o)o.value=''}RK.ser=x;if(!x.other)RK.other='';rkParts();
      if(x.other)setTimeout(()=>{const i=$('#rkName');if(i)i.focus()},rkSheet()?320:60);return}
    case'rkSave':return void rkSave(a);
    case'rkMain':{if(!L||!L[RK.i]||!RK.i)return;const n=[...L];[n[0],n[RK.i]]=[n[RK.i],n[0]];   // 和 1 号位交换，不做拖拽排序
      return void rkCommit(n,'已设为主力',a,{action:'main',source:rkSrc(L[RK.i])})}
    case'rkDel':if(L&&L[RK.i])rkDelSheet(RK.i);return;
    case'rkNo':rkHide();return;
    case'rkDelOk':{if(!L||!L[RK.i])return;const r=L[RK.i];return void rkCommit(L.filter((_,j)=>j!==RK.i),'已删除 '+rkTitle(r),a,{action:'remove',source:rkSrc(r)})}
  }}
const rkSrc=r=>r.series_id||r.catalog_id?'catalog':'other';   // 埋点 source：这把有没有归到库里
