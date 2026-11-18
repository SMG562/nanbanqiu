/* ============================== 我的球拍（#60 PR-B） ==============================
 * 个人页三个槽位，1 号是主力；只记「品牌 + 系列」，是身份展示不是器材档案（不做稀有度 / 进度 / 红点）。
 * 数据：挂在 ME.rackets（[{brand|null, series}]，顺序 = 槽位）。真实模式只认服务器：读入走 nbqLoadAll → nbqApply → nbqRacketsIn；
 *   写入走 nbqWrite(PUT /api/me/rackets) 整组替换，成功后用服务器返回的列表；读不到（undefined）时不许改，免得拿空列表把服务器上的冲掉。
 * 演示模式（NBQ_NET 为空）：只改内存。快照（nbq_snap）随 USERS 一起存，刷新不先闪空槽。
 * 开关 NBQ_RACKETS_ON：正式站默认关（上线闸门过了由所有者打开，见 #60 PR-D）；测试环境（分支预览，连测试库）开；
 *   任何设备可用 localStorage nbq_ff_rackets=1 单独打开（真机预看、自动化测试）。关着时不显示入口、也不读接口。
 * #389 PR2b（ADR 0014）：选择列表以服务器品牌库为准（GET /api/rackets/lib，第一次打开弹层时读，同一页面只读一次）；没读到 / 数据不对 / 演示模式 → 用下面的 RK_BRANDS 兜底。
 *   弹层一屏：搜索（品牌 / 系列 / 别名）→ 品牌 chips → 系列 chips（含「其他系列」）→ 昵称（选填 ≤12 字符，输入法组合期间不截断）→ 保存。选中不保存，点保存才写。
 *   存的是 {brand_id, series_id | other_text, nickname}；品牌库里没有的（其他品牌）发旧形状 {brand:null, series}；老行（没有新字段）照样读 brand / series 两列。
 *   埋点（字典 tests/spec/events_spec.md）：racket_picker_open / racket_brand_pick / racket_save（服务器保存成功后才发）/ racket_invalid；不记手写的文字。 */
const NBQ_RACKETS_ON=(()=>{if(typeof NBQ_ENV!=='undefined'&&NBQ_ENV==='staging')return true;try{return localStorage.getItem('nbq_ff_rackets')==='1'}catch(_){return false}})();
const RK_MAX=3,RK_LEN=30,RK_NICK=12;
// 兜底列表：热门品牌 + 系列（只用文字，不用品牌标志）。和库种子（迁移 20261121_racket_series）一致；正常以服务器品牌库为准
const RK_BRANDS=[['Wilson',['Pro Staff','Blade','Clash','Ultra','Burn','Shift']],['Babolat',['Pure Drive','Pure Aero','Pure Strike']],['Head',['Speed','Radical','Gravity','Prestige','Extreme','Boom']],
  ['Yonex',['EZONE','VCORE','Percept']],['Dunlop',['CX','SX','FX']],['Prince',['Phantom','Textreme']],['Tecnifibre',['TF40','T-Fight']]];
// 与服务器 nbq_racket_text / nbq_racket_bad 同一套规则（服务器为准，这里只为了当场提示；校验见 rkBad）
const rkClean=s=>String(s==null?'':s).replace(/[\u0000-\u001f\u007f-\u009f]/g,'').replace(/[\s　 ]+/g,' ').trim();
const rkKey=r=>(r.brand||'').toLowerCase()+'\u001f'+String(r.series).toLowerCase();
const RK_UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const rkCid=v=>typeof v==='string'&&RK_UUID.test(v)?v:null;
const rkS=v=>typeof v==='string'&&v?v:null;
// 接口 → 前台：[{slot, brand, series, brand_id, series_id, other_text, other_brand_text, nickname}] → 按 slot 排好的列表；不是数组返回 null（= 没读到）
//   老行没有新字段：brand / series 两列照样有，显示只用这两列
function nbqFromRackets(rows){if(!Array.isArray(rows))return null;
  return rows.filter(r=>r&&typeof r.series==='string'&&r.series).sort((a,b)=>(+a.slot||0)-(+b.slot||0)).slice(0,RK_MAX).map(r=>({brand:rkS(r.brand),series:r.series,brand_id:rkCid(r.brand_id),series_id:rkCid(r.series_id),other_text:rkS(r.other_text),other_brand_text:rkS(r.other_brand_text),nickname:rkS(r.nickname)}))}
// 品牌库 → [{id, name, series:[{id, name, al[]}]}]（「其他系列」由前台固定画一个，库里的丢掉）；id 不是 uuid、名字不是文字 / 为空 / 超长的行丢掉；一个品牌都不剩返回 null（= 用兜底列表）
function nbqFromRacketLib(d){const rows=d&&Array.isArray(d.brands)?d.brands:null;if(!rows)return null;const out=[];
  rows.forEach(b=>{if(!b||!rkCid(b.id)||typeof b.name!=='string'||!Array.isArray(b.series))return;const bn=rkClean(b.name);if(!bn||[...bn].length>RK_LEN)return;const ss=[];
    b.series.forEach(s=>{if(!s||s.is_other===true||!rkCid(s.id)||typeof s.name!=='string')return;const n=rkClean(s.name);if(!n||[...n].length>RK_LEN)return;
      ss.push({id:s.id,name:n,al:Array.isArray(s.aliases)?s.aliases.filter(x=>typeof x==='string').map(x=>x.toLowerCase()):[]})});
    if(ss.length)out.push({id:b.id,name:bn,series:ss})});
  return out.length?out:null}
const RK_LIB={groups:null,p:null};   // 品牌库：读到一次就用到页面刷新；读失败不记，下次打开再试
const rkGroups=()=>RK_LIB.groups||RK_BRANDS.map(([b,l])=>({id:null,name:b,series:l.map(se=>({id:null,name:se,al:[]}))}));
function rkLibLoad(){if(RK_LIB.groups||RK_LIB.p||!nbqOn())return;
  RK_LIB.p=Promise.resolve().then(()=>NBQ_NET.get('/api/rackets/lib',null,{noauth:true})).then(r=>{const g=r&&r.ok?nbqFromRacketLib(r.data):null;if(!g)return;RK_LIB.groups=g;
    if(RK.view==='pick'&&rkOpen())rkSync()}).catch(()=>{}).finally(()=>{RK_LIB.p=null})}   // 到了就换上；输入框在列表外面，正在打字不丢
// 埋点直接写 track('事件名', …)：static/check 按这个写法核对「代码里的事件名都在字典里、两端一致」；props 与字典逐字一致，不传手写文字
// 读入（nbqApply 调用）：读到了 → 以服务器为准；没读到 → 保留这次之前的（同一个人），不清空
function nbqRacketsIn(me,list,old){if(!me)return;if(Array.isArray(list)){me.rackets=list;return}if(!Array.isArray(me.rackets)&&Array.isArray(old))me.rackets=old}
// 当前的球拍：null = 真实模式还没读到（不显示槽位、不许改）
const rkList=()=>{if(!ME)return null;if(Array.isArray(ME.rackets))return ME.rackets;if(typeof nbqOn==='function'&&nbqOn())return null;return ME.rackets=[]};

/* ---- 画：主力一张大卡 + 备用小卡；品牌首字母圆徽章；有昵称时昵称为主、「品牌 系列」做小字 ---- */
const RK_ICO='<svg class="rk-hi" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" aria-hidden="true"><g transform="rotate(45 14 10)"><ellipse cx="14" cy="8.6" rx="4.4" ry="6.1" stroke-width="1.7"/><path d="M12 4.2v8.8M14 2.6v12M16 4.2v8.8M9.9 6.6h8.2M9.7 9h8.6M9.9 11.4h8.2" stroke-width=".7" opacity=".6"/><path d="M14 14.7v2.2" stroke-width="1.5"/><path d="M14 17v5.2" stroke-width="2.6"/></g></svg>';
const rkName=r=>(r.brand?r.brand+' ':'')+r.series;   // 别人看到的写法：品牌 系列（不带昵称）
const rkIni=r=>[...(r.brand||r.series)][0].toUpperCase();
function rkRow(r,i){const sub=r.nickname?rkName(r):r.brand||'';
  return `<button class="rk-row${i===0?' main':''}" data-a="rkSlot" data-i="${i}" aria-label="${i===0?'主力拍：':''}${esc(r.nickname||rkName(r))}，点开可以编辑、设为主力或移除">`+
    `<span class="rk-bd" aria-hidden="true">${esc(rkIni(r))}</span><span class="v">${sub?`<small class="rk-br">${esc(sub)}</small>`:''}<b class="rk-se">${esc(r.nickname||r.series)}</b></span>${i===0?'<span class="rk-main">主力</span>':''}<span class="rk-more" aria-hidden="true">⋯</span></button>`}
function rkAddRow(n,k){
  return `<button class="rk-row rk-add" data-a="rkSlot" data-i="${n}"><span class="rk-plus" aria-hidden="true">+</span><span>添加球拍</span>${n+k===0?'<small class="rk-hint">第一把是主力</small>':''}</button>`}
// 个人页的一节：pwa = 分组标题 + 白色分组；web = 一张卡片。三个槽位都画：没放的是虚线「添加球拍」
function rkSectionHTML(kind){if(!NBQ_RACKETS_ON||!ME)return '';
  const L=rkList(),rows=L===null?`<div class="rk-off">断线了。球拍等会儿再看。</div>`:L.map(rkRow).join('')+Array.from({length:RK_MAX-L.length},(_,k)=>rkAddRow(L.length,k)).join('');
  const h=`<span class="rk-h">${RK_ICO}我的球拍</span>`;
  return kind==='web'?`<div class="card rk-card"><div class="ch-h">${h}</div><div class="rk">${rows}</div></div>`
    :`<div class="sec-t">${h}</div><div class="group rk">${rows}</div>`}

// 别人的球员卡弹层里的一行（#60 PR-C）：开关关着 / 没拍 / 已注销 → 空串（不出空栏）；数据来自球友卡片的 rackets（服务器已把注销的人过滤掉）
function rkCardHTML(uid){if(!NBQ_RACKETS_ON)return '';const u=USERS[uid],L=u&&!u.gone&&Array.isArray(u.rackets)?u.rackets:[];if(!L.length)return '';
  return `<div class="rk-pc"><span class="rk-h">${RK_ICO}球拍</span><div class="rk-pl">${L.map((r,i)=>`<span class="rk-pi">${i===0&&L.length>1?'<em>主力</em>':''}${esc(rkName(r))}</span>`).join('')}</div></div>`}

/* ---- 弹层（PWA 底部弹层 / 网页端弹窗，同一份内容）---- */
// bn/sn：选中的品牌 / 系列名（id 保存时按名字去当前品牌库里找，库后到也对）；ot：选了「其他系列」；oth：选了「其他品牌」；q：搜索词
const RK={i:0,mode:'add',bn:null,sn:null,ot:false,oth:false,q:'',view:null,otext:'',nick:''};
const rkSheet=()=>typeof openSheet==='function';
const rkCls=()=>rkSheet()?{t:'sh-t',s:'sh-s'}:{t:'m-t',s:'m-s'};
function rkShow(html){html=`<div class="rk-pk">${html}</div>`;if(rkSheet())openSheet(html);else openModal(`<div class="m-b">${html}</div>`,'sm')}
const rkHide=()=>{RK.view=null;if(rkSheet())closeSheet();else closeModal()};
// 选拍弹层开着吗（看底板：手机端 #sheet 的 show 要下一帧才加，#sbg 是立刻加的）
const rkOpen=()=>rkSheet()?!!(document.querySelector('#sbg.show')&&document.querySelector('#sheet .rk-pk')):!!(document.querySelector('#mbg.show')&&document.querySelector('#modal .rk-pk'));
// 包里别的槽位已有的（编辑时，被换掉的那把不算）
const rkTaken=()=>{const L=rkList()||[],o=new Set();L.forEach((r,j)=>{if(RK.mode==='swap'&&j===RK.i)return;o.add(rkKey(r))});return o};
if(window.visualViewport)visualViewport.addEventListener('resize',()=>document.documentElement.style.setProperty('--rkvh',visualViewport.height+'px'));   // 键盘起来时弹层跟着变矮，保存按钮不被盖住
const rkCut=(s,n)=>[...s].slice(0,n).join('');
// 选中后「保存」能不能点：选了系列，或「其他」里写了字
const rkReady=()=>RK.oth||RK.ot?!!rkClean(RK.otext):!!RK.sn;
function rkSync(){const body=$('#rkBody');if(!body)return;const G=rkGroups(),tk=rkTaken(),L=rkList()||[],cur=RK.mode==='swap'?L[RK.i]:null,q=rkClean(RK.q).toLowerCase();
  const se=(g,s,full)=>{const k=rkKey({brand:g.name,series:s.name}),own=tk.has(k),same=!!cur&&rkKey(cur)===k,on=RK.bn===g.name&&RK.sn===s.name&&!RK.ot&&!RK.oth;
    return `<button class="rk-chip${on?' on':''}" data-a="rkSeries" data-b="${esc(g.name)}" data-s="${esc(s.name)}"${own?' disabled':''} aria-pressed="${on}">${full?`<small>${esc(g.name)}</small>`:''}${esc(s.name)}${own?'<small>已在包里</small>':same&&!full?'<small>现在这把</small>':''}</button>`};
  let h;
  if(q){const ws=q.split(' '),hit=[];G.forEach(g=>g.series.forEach(s=>{const t=(g.name+' '+s.name+' '+s.al.join(' ')).toLowerCase();if(ws.every(w=>t.includes(w)))hit.push(se(g,s,true))}));
    h=hit.length?`<div class="rk-grid">${hit.slice(0,24).join('')}</div>`:`<p class="rk-none">没找到「${esc(rkClean(RK.q))}」。可以选下面的「其他品牌」自己写。</p>`;
    h+=`<div class="rk-grid"><button class="rk-chip oth${RK.oth?' on':''}" data-a="rkOther" data-k="b">其他品牌</button></div>`}
  else{const g=G.find(x=>x.name===RK.bn);
    h=`<div class="rk-lab">品牌</div><div class="rk-grid brands">${G.map(x=>`<button class="rk-chip brand${x.name===RK.bn?' on':''}" data-a="rkBrand" data-b="${esc(x.name)}" aria-pressed="${x.name===RK.bn}">${esc(x.name)}</button>`).join('')}<button class="rk-chip oth${RK.oth?' on':''}" data-a="rkOther" data-k="b">其他品牌</button></div>`;
    if(g)h+=`<div class="rk-lab">系列</div><div class="rk-grid">${g.series.map(s=>se(g,s)).join('')}<button class="rk-chip oth${RK.ot?' on':''}" data-a="rkOther" data-k="s">其他系列</button></div>`}
  body.innerHTML=h;
  const ot=$('#rkOt');if(ot){ot.hidden=!(RK.oth||RK.ot);const lb=$('#rkOtL');if(lb)lb.textContent=RK.oth?'拍子名称（品牌和型号）':`${RK.bn||''} 的系列名称`}
  const sv=document.querySelector('[data-a="rkSave"]');if(sv)sv.disabled=!rkReady()}
function rkDraw(){const c=rkCls(),L=rkList()||[],cur=RK.mode==='swap'?L[RK.i]:null;RK.view='pick';
  const sub=RK.mode==='swap'?`编辑 ${esc(rkName(cur))}`:RK.i===0||!L.length?'这把会是你的主力。':'搜一下，或点品牌和系列。';
  rkShow(`<div class="rk-top"><div class="${c.t}">${RK.mode==='swap'?'编辑球拍':'添一把球拍'}</div><p class="${c.s}">${sub}</p>
    <input id="rkQ" class="inp rk-q" type="search" enterkeyhint="search" autocomplete="off" spellcheck="false" placeholder="搜品牌或系列，例如 Pure Drive" aria-label="搜索球拍">
    <div id="rkBody"></div>
    <div id="rkOt" hidden><label class="rk-field"><span class="rk-lab" id="rkOtL">拍子名称</span><input id="rkName" class="inp" maxlength="${RK_LEN}" autocomplete="off" autocapitalize="words" spellcheck="false" placeholder="例如 Diadem Elevate"></label></div>
    <label class="rk-field"><span class="rk-lab">昵称（选填）</span><input id="rkNick" class="inp" autocomplete="off" enterkeyhint="done" placeholder="例如 老伙计"></label>
    <div class="rk-meta"><span class="rk-err" id="rkErr" role="alert"></span><span class="rk-n" id="rkN">0/${RK_NICK}</span></div></div>
    <div class="rk-foot"><button class="btn btn-p rk-save" data-a="rkSave" disabled>保存</button><p class="rk-tip">球拍和姓名一样，所有球友可见</p></div>`);
  const q=$('#rkQ'),nm=$('#rkName'),nk=$('#rkNick');if(!q||!nm||!nk)return;
  q.value=RK.q;nm.value=RK.otext;nk.value=RK.nick;$('#rkN').textContent=[...RK.nick].length+'/'+RK_NICK;
  q.addEventListener('input',()=>{RK.q=q.value;rkSync()});
  nm.addEventListener('input',()=>{RK.otext=nm.value;$('#rkErr').textContent='';const sv=document.querySelector('[data-a="rkSave"]');if(sv)sv.disabled=!rkReady()});
  const nkIn=e=>{if(!e.isComposing&&[...nk.value].length>RK_NICK)nk.value=rkCut(nk.value,RK_NICK);RK.nick=nk.value;$('#rkN').textContent=[...nk.value].length+'/'+RK_NICK;$('#rkErr').textContent=''};   // 输入法组合期间不截断，选完字才截
  nk.addEventListener('input',nkIn);nk.addEventListener('compositionend',nkIn);
  [q,nm,nk].forEach(i=>{i.addEventListener('keydown',e=>{if(e.key!=='Enter')return;e.preventDefault();if(!nbqImeEnter(e))i.blur()});i.addEventListener('focus',()=>setTimeout(()=>{try{i.scrollIntoView({block:'center'})}catch(_){}},300))});   // 回车只收键盘
  rkSync()}
function rkSlotSheet(i){const L=rkList()||[],r=L[i],c=rkCls();RK.view='slot';
  rkShow(`<div class="rk-hero">${r.nickname||r.brand?`<small class="rk-br">${esc(r.nickname?rkName(r):r.brand)}</small>`:''}<div class="rk-ht"><b class="${c.t}">${esc(r.nickname||r.series)}</b>${i===0?'<span class="rk-main">主力</span>':''}</div></div>
    <div class="rk-acts"><button class="rk-act" data-a="rkSwap"><b>编辑</b></button>${i>0?`<button class="rk-act" data-a="rkMain"><b>设为主力</b><small>和现在的主力换个位置</small></button>`:''}
      <button class="rk-act danger" data-a="rkDel"><b>移除</b></button></div>`)}

/* ---- 写：整组替换。真实模式走 nbqWrite（快照期间 / 连点 / 失败提示都在里面），成功后以服务器返回为准 ---- */
// 发给服务器：有品牌 id 的发新形状，其余发旧形状（服务器按名字自动归类）；昵称空就不发
const rkWire=r=>{const o=r.brand_id?(r.series_id?{brand_id:r.brand_id,series_id:r.series_id}:{brand_id:r.brand_id,other_text:r.other_text||r.series}):{brand:r.brand||null,series:r.series};if(r.nickname)o.nickname=r.nickname;return o};
// ev = {action, source}：服务器保存成功后才发 racket_save
async function rkCommit(next,done,btn,ev){const L=rkList();
  if(L===null){toast('球拍还没读到，稍等一下再试');return false}
  const keep=next.slice(0,RK_MAX),list=keep.map(rkWire);
  const pk=document.querySelector('.rk-pk');if(pk)pk.classList.add('busy');if(btn)btn.classList.add('busy');
  try{
    if(nbqOn()){const d=await nbqWrite('rackets',n=>n.put('/api/me/rackets',{rackets:list}));if(d===null)return false;
      const got=nbqFromRackets(d.rackets);if(ME&&got)ME.rackets=got}
    else ME.rackets=keep;
    if(ev)track('racket_save',{action:ev.action,source:ev.source,n_after:(rkList()||[]).length});
    rkHide();toast(done);render();return true}
  finally{if(pk)pk.classList.remove('busy');if(btn)btn.classList.remove('busy')}}
// 弹层里选的 → 一把球拍（id 按名字到当前品牌库里找）；「其他」= 自己写的
function rkBuild(){const nick=rkClean(RK.nick)||null,g=rkGroups().find(x=>x.name===RK.bn);
  if(RK.oth)return{src:'other',v:rkClean(RK.otext),r:{brand:null,series:rkClean(RK.otext),nickname:nick}};
  if(RK.ot)return{src:'other',v:rkClean(RK.otext),r:{brand:RK.bn,series:rkClean(RK.otext),brand_id:g&&g.id,other_text:rkClean(RK.otext),nickname:nick}};
  const s=g&&g.series.find(x=>x.name===RK.sn);return{src:'catalog',r:{brand:RK.bn,series:RK.sn,brand_id:g&&g.id,series_id:s&&s.id,nickname:nick}}}
// 当场校验（与服务器同一套规则，服务器为准）：返回 [原因, 提示]；原因进 racket_invalid
function rkBad(v){if(/http|www/i.test(v))return'link';if(/[@＠]/.test(v))return'at';if(/[0-9０-９]{6,}/.test(v))return'digits';return null}
function rkCheck(b){const bad='不能有链接、@ 或一长串数字',v=b.v;
  if(b.src==='other'){if(!v)return['empty','写一下拍子的名字'];if([...v].length>RK_LEN)return['long',`最多 ${RK_LEN} 个字`];const r=rkBad(v);if(r)return[r,'名字里'+bad]}
  const n=b.r.nickname;if(n){if([...n].length>RK_NICK)return['long',`昵称最多 ${RK_NICK} 个字`];const r=rkBad(n);if(r)return[r,'昵称里'+bad]}
  if(rkTaken().has(rkKey(b.r)))return['dup','这把已经在包里了'];return null}
// 事件（两端 0270 的 switch 转过来）
function rkOpenPick(mode,L){const cur=mode==='swap'?L[RK.i]:null;Object.assign(RK,{mode,bn:null,sn:null,ot:false,oth:false,q:'',otext:'',nick:cur&&cur.nickname||''});
  if(cur){const g=rkGroups().find(x=>x.name.toLowerCase()===(cur.brand||'').toLowerCase());   // 编辑：把现在这把预先选好
    if(g){RK.bn=g.name;const s=g.series.find(x=>x.name.toLowerCase()===cur.series.toLowerCase());if(s)RK.sn=s.name;else{RK.ot=true;RK.otext=cur.series}}
    else{RK.oth=true;RK.otext=rkCut(rkName(cur),RK_LEN)}}
  rkLibLoad();rkDraw();track('racket_picker_open',{mode,slot:RK.i+1})}
function rkAct(a){const d=a.dataset,L=rkList();
  switch(d.a){
    case'rkSlot':{if(L===null){toast('球拍还没读到，稍等一下再试');return}const i=+d.i||0;
      if(L[i]){RK.i=i;rkSlotSheet(i);return}RK.i=L.length;rkOpenPick('add',L);return}
    case'rkSwap':rkOpenPick('swap',L||[]);return;
    case'rkBrand':Object.assign(RK,{bn:d.b,sn:null,ot:false,oth:false});rkSync();track('racket_brand_pick',{brand:d.b});return;   // 品牌名来自品牌库 / 兜底列表，不是手写
    case'rkSeries':{const pick=RK.bn!==d.b;Object.assign(RK,{bn:d.b,sn:d.s,ot:false,oth:false});if(RK.q){RK.q='';const q=$('#rkQ');if(q)q.value=''}rkSync();if(pick)track('racket_brand_pick',{brand:d.b});return}
    case'rkOther':{const b=d.k==='b';if(b){if(!RK.oth)track('racket_brand_pick',{brand:'other'});Object.assign(RK,{oth:true,ot:false,bn:null,sn:null})}else Object.assign(RK,{ot:true,oth:false,sn:null});
      rkSync();setTimeout(()=>{const i=$('#rkName');if(i)i.focus()},rkSheet()?320:60);return}
    case'rkSave':{const b=rkBuild(),err=rkCheck(b),e=$('#rkErr');
      if(err){if(e)e.textContent=err[1];track('racket_invalid',{reason:err[0]});return}
      const n=[...(L||[])];if(RK.mode==='swap')n[RK.i]=b.r;else n.push(b.r);document.activeElement&&document.activeElement.blur&&document.activeElement.blur();
      return void rkCommit(n,RK.mode==='swap'?'已保存 '+rkName(b.r):n.length===1?'主力拍已就位':'已放进包里',a,{action:RK.mode==='swap'?'swap':'add',source:b.src})}
    case'rkMain':{if(!L||!L[RK.i]||!RK.i)return;const n=[...L];[n[0],n[RK.i]]=[n[RK.i],n[0]];   // 和 1 号位交换，不做拖拽排序
      return void rkCommit(n,'已设为主力',a,{action:'main',source:L[RK.i].series_id?'catalog':'other'})}   // source：被设为主力的那把是不是品牌库里的系列
    case'rkDel':{if(!L||!L[RK.i])return;const r=L[RK.i];
      if(!d.ok){d.ok='1';const t=a.querySelector('b');if(t)t.textContent='再点一下，确认移除';return}   // 移除要点两下
      return void rkCommit(L.filter((_,j)=>j!==RK.i),'已移除 '+rkName(r),a,{action:'remove',source:r.series_id?'catalog':'other'})}
  }}
