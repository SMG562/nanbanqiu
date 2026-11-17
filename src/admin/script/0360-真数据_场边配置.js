/* =====================================================================
 * 真数据 · 场边配置三页（#27 第 4 步）：话题（stopic）· 今日推荐排期（ssched）· 引导文案（sguide）。
 *   同一份配置（库里 sb_config 的 9 块），改动先进草稿，点「发布」才对前台生效；可丢弃草稿、退回任一旧版本。
 *   每个写操作带页面上看到的版本号：别人刚发布过 → 409，页面提示后重读。只读角色和限城市的管理员不能改（库函数挡，这里按钮也不给）。
 *   话题表可直接开关上线；其余各块点「编辑」出表单（按数据形状生成），「高级：JSON」作后备；内容都由库里的 sb_config_check 校验，不合格不存。
 * ===================================================================== */
const SC={d:null,err:null,loading:false,busy:false,edit:null,work:null,json:false};
const SC_PART={topics:'话题',alias:'相似词（搜这个词 → 归到哪个话题）',generic:'太宽的词（不单独成话题）',settings:'规则设置',hints:'引导提示',slots:'时段',starters:'开头句',week:'周历（每天推荐的话题）',specials:'特别安排'};
const SC_PAGE={stopic:['topics','alias','generic'],ssched:['slots','week','specials'],sguide:['hints','starters','settings']};
async function scLoad(){if(SC.loading)return;SC.loading=true;const r=await admApi('GET','/sideline/config');SC.loading=false;
  if(r.status===401)return toLogin('登录已过期，请重新登录');
  if(r.ok&&r.body&&r.body.draft&&r.body.draft.config){SC.d=r.body;SC.err=null}else SC.err=r.status===403?'你的角色不能查看场边配置':realErr(r);
  if(RL.me&&SC_PAGE[S.page])render()}
async function scPost(path,body,ok){if(SC.busy)return null;SC.busy=true;render();const r=await admApi('POST','/sideline/'+path,{base:SC.d.draft.version,...body});SC.busy=false;
  if(r.status===401){toLogin('登录已过期，请重新登录');return null}
  if(!r.ok){admToast(r.error==='admin_config_stale'?'别人刚发布了新版本，已刷新，请在新版本上再改':r.error==='invalid'?'内容不合格，没有保存（检查格式和必填项）':realErr(r));if(r.error==='admin_config_stale'){SC.d=null;SC.edit=null;scLoad()}else render();return null}
  admToast(ok);SC.edit=null;SC.d=null;scLoad();return r}
const scCan=()=>realCan('sideline.config')&&!(RL.me&&Array.isArray(RL.me.cities)&&RL.me.cities.length);
function scHead(){const d=SC.d.draft,v=SC.d.versions,can=scCan(),b=SC.busy?' disabled':'',ch=d.changed||[];
  return `<div class="card"><div class="ch"><b>场边配置 v${d.version}</b><small>发布于 ${esc(upDate(d.published_at))}${v[0]&&v[0].published_by?' · '+esc(v[0].published_by):''}</small><button class="btn sm" data-sc="reload" style="margin-left:auto">刷新</button></div>
  ${ch.length?`<p class="cap" style="color:var(--warn,#B7791F)">草稿里改了：${ch.map(k=>esc(SC_PART[k]||k)).join('、')}${d.updated_by?`（${esc(d.updated_by)} ${esc(rpAgo(d.updated_at))}）`:''}。发布后前台 5 分钟内生效。</p>
    ${can?`<div class="rowacts"><input class="search" id="scNote" maxlength="60" placeholder="这次改了什么（必填，60 字内）" style="width:260px"><button class="btn sm p" data-sc="publish"${b}>发布</button><button class="btn sm" data-sc="discard"${b}>丢弃草稿</button></div>`:''}`:'<p class="cap">没有未发布的改动。</p>'}
  <details style="margin-top:8px"><summary class="cap">最近的版本（可退回）</summary><table><tbody>${v.map(x=>`<tr><td class="mono">v${x.version}</td><td>${esc(x.note||'')}${x.from_version?` <small style="color:var(--mut)">（从 v${x.from_version} 退回）</small>`:''}<br><small style="color:var(--mut)">改了：${esc((x.changed||[]).map(k=>SC_PART[k]?SC_PART[k].replace(/（.*$/,''):k).join('、')||'—')}</small></td><td><small>${esc(x.published_by||'系统')} · ${esc(upDate(x.published_at))}</small></td><td>${can&&x.version!==d.version?`<button class="btn sm" data-sc="rollback" data-v="${x.version}"${b}>退回到这一版</button>`:''}</td></tr>`).join('')}</tbody></table></details></div>`}
function scPreview(v){if(Array.isArray(v)){if(!v.length)return '<p class="cap">（空）</p>';
    if(v.every(x=>x&&typeof x==='object'&&!Array.isArray(x)))return stxTable(v.map(x=>Object.fromEntries(Object.entries(x).map(([k,y])=>[k,Array.isArray(y)?y.join('、'):y&&typeof y==='object'?JSON.stringify(y):y]))));
    return `<p class="cap">${v.map(x=>esc(Array.isArray(x)?x.join(' → '):String(x))).join('　·　')}</p>`}
  if(v&&typeof v==='object')return `<table><tbody>${Object.entries(v).map(([k,y])=>`<tr><td class="mono">${esc(k)}</td><td>${esc(Array.isArray(y)?y.join(' · '):typeof y==='object'?JSON.stringify(y):String(y))}</td></tr>`).join('')}</tbody></table>`;
  return `<p class="cap">${esc(String(v))}</p>`}
// ---------- 表单编辑（#195 ⑦）：按这一块数据的形状生成表单，改的是一份副本 SC.work，「保存到草稿」才提交；「高级：JSON」是后备 ----------
//   对象数组 → 一行一条（文字 / 数字 / 开关 / 话题下拉 / 多值用「、」分隔），可加行删行；字符串数组 → 一行一个；对象 → 每个键一行（值是列表的同样一行一个）；
//   [词, 话题] 这种二元组 → 两列。字段类型从现有数据推断；topic_id / alt_topic_id 给话题下拉。时间字段按原样文字编辑（库里校验）。
const SC_F={id:'编号',title:'标题',kind:'类型',text:'文字',daypart:'时段',active:'启用',slot:'序号',name:'名字',from:'从（点）',to:'到（点）',topics:'话题',dow:'星期（0=日）',topic_id:'话题',alt_topic_id:'备选话题',auto_hot:'自动用热门',note:'备注',trigger:'触发',starts_at:'开始',ends_at:'结束',city:'城市',court:'在场边',lost:'没打上'};
const scClone=v=>JSON.parse(JSON.stringify(v));
function scShape(v){if(Array.isArray(v)){if(v.every(x=>Array.isArray(x)&&x.length===2))return 'pairs';if(v.every(x=>typeof x==='string'))return 'strings';if(v.every(x=>x&&typeof x==='object'))return 'rows'}
  if(v&&typeof v==='object'&&!Array.isArray(v))return 'object';return 'json'}
function scInput(path,val,key){const tp=SC.d.draft.config.topics,id=`data-scf="${esc(path)}"`;
  if(typeof val==='boolean')return `<input type="checkbox" ${id}${val?' checked':''}>`;
  if(key==='topic_id'||key==='alt_topic_id')return `<select ${id}><option value="">（无）</option>${tp.map(t=>`<option value="${esc(t.id)}"${t.id===val?' selected':''}>#${esc(t.title)}</option>`).join('')}</select>`;
  if(typeof val==='number')return `<input class="search mono" type="number" step="any" ${id} value="${esc(String(val))}" style="width:80px">`;
  if(Array.isArray(val))return `<input class="search" ${id} data-scarr="1" value="${esc(val.join('、'))}" style="width:100%" title="多个用「、」分隔">`;
  return `<input class="search" ${id} value="${esc(val==null?'':String(val))}" style="width:100%">`}
function scForm(k){const w=SC.work,sh=scShape(w),b=SC.busy?' disabled':'',del=i=>`<button class="btn sm" data-sc="rowdel" data-i="${i}" title="删掉这一行">×</button>`;let f;
  if(sh==='rows'){const cols=[...new Set(w.flatMap(x=>Object.keys(x)))];f=`<table><thead><tr>${cols.map(c=>`<th>${esc(SC_F[c]||c)}</th>`).join('')}<th></th></tr></thead><tbody>${w.map((x,i)=>`<tr>${cols.map(c=>`<td>${scInput(i+'.'+c,x[c],c)}</td>`).join('')}<td>${del(i)}</td></tr>`).join('')}</tbody></table>`}
  else if(sh==='pairs')f=`<table><thead><tr><th>词</th><th>归到话题</th><th></th></tr></thead><tbody>${w.map((x,i)=>`<tr><td>${scInput(i+'.0',x[0])}</td><td>${scInput(i+'.1',x[1],'topic_id')}</td><td>${del(i)}</td></tr>`).join('')}</tbody></table>`;
  else if(sh==='strings')f=`<label class="cap">一行一个</label><textarea class="search" data-scf="*lines" style="width:100%;min-height:160px">${esc(w.join('\n'))}</textarea>`;
  else if(sh==='object')f=`<table><tbody>${Object.entries(w).map(([kk,v])=>`<tr><td class="mono">${esc(SC_F[kk]||kk)}</td><td>${Array.isArray(v)&&v.every(x=>typeof x==='string')?`<textarea class="search" data-scf="${esc(kk)}" data-sclines="1" style="width:100%;min-height:90px">${esc(v.join('\n'))}</textarea><small style="color:var(--mut)">一行一个</small>`:scInput(kk,v,kk)}</td></tr>`).join('')}</tbody></table>`;
  else f='<p class="cap">这一块的结构比较特殊，请用「高级：JSON」编辑。</p>';
  return `${f}<div class="admr-e" id="scErr"></div><div class="rowacts" style="margin-top:8px;flex-wrap:wrap">${sh==='rows'||sh==='pairs'?`<button class="btn sm" data-sc="rowadd">＋ 加一行</button>`:''}<button class="btn sm p" data-sc="savef" data-k="${k}"${b}>保存到草稿</button><button class="btn sm" data-sc="unedit">取消</button><button class="btn sm" data-sc="json" style="margin-left:auto">高级：JSON</button></div>`}
// 输入框 → 副本（不重画，保留光标）；类型按原值：数字转数字、多值按「、」拆开、开关取 checked
function scFieldSet(el){const p=el.dataset.scf,w=SC.work;if(!w)return;
  if(p==='*lines'){SC.work=el.value.split('\n').map(x=>x.trim()).filter(Boolean);return}
  const ks=p.split('.'),last=ks.pop(),o=ks.reduce((a,x)=>a[x],w),old=o[last];
  o[last]=el.type==='checkbox'?el.checked:el.dataset.sclines?el.value.split('\n').map(x=>x.trim()).filter(Boolean):el.dataset.scarr?el.value.split(/[、,，]/).map(x=>x.trim()).filter(Boolean)
    :typeof old==='number'?(el.value===''?null:+el.value):el.tagName==='SELECT'&&el.value===''?null:el.value}
function scPart(k){const v=SC.d.draft.config[k],can=scCan(),ed=SC.edit===k,b=SC.busy?' disabled':'',ch=(SC.d.draft.changed||[]).includes(k);
  let body;
  if(ed&&!SC.json)body=scForm(k);
  else if(ed)body=`<textarea id="scJson" class="search mono" style="width:100%;min-height:260px;font-size:12px">${esc(JSON.stringify(v,null,1))}</textarea><div class="admr-e" id="scErr"></div><div class="rowacts" style="margin-top:6px"><button class="btn sm p" data-sc="save" data-k="${k}"${b}>保存到草稿</button><button class="btn sm" data-sc="unedit">取消</button></div>`;
  else if(k==='topics')body=`<table><thead><tr><th>话题</th><th>类型</th><th>问题</th><th>开头句</th><th>上线</th></tr></thead><tbody>${v.map((t,i)=>`<tr><td><b style="font-weight:600">#${esc(t.title)}</b><br><small class="mono" style="color:var(--mut)">${esc(t.id)}</small></td><td>${t.kind==='limited'?`限时${t.starts_at?'<br><small>'+esc(String(t.starts_at).slice(0,10))+' 起</small>':''}`:'常驻'}</td><td>${esc(t.ask||'—')}</td><td><small>${esc((t.starters||[]).join(' / ')||'—')}</small></td>
    <td>${can?`<button class="btn sm${t.active?' p':''}" data-sc="toggle" data-i="${i}" title="${t.active?'点一下下线（先进草稿，发布后生效）':'点一下上线（先进草稿，发布后生效）'}"${b}>${t.active?'上线中':'已下线'}</button>`:t.active?'上线中':'已下线'}</td></tr>`).join('')}</tbody></table>`;
  else body=scPreview(v);
  return `<div class="card"><div class="ch"><b>${esc(SC_PART[k])}</b>${ch?'<span class="pill w">草稿已改</span>':''}${can&&!ed?`<button class="btn sm" data-sc="edit" data-k="${k}" style="margin-left:auto">编辑</button>`:''}</div>${body}</div>`}
function scPending(){const p=SC.d.pending||[],can=scCan();if(!p.length)return '';
  return `<div class="card"><div class="ch"><b>大家发起、还没到门槛的话题</b><small>放出后马上出现在「大家在聊」和搜索里（不走版本）</small></div><table><tbody>${p.map(t=>`<tr><td>#${esc(t.title)}</td><td>${esc(realCity(t.city))}</td><td>${esc(rpAgo(t.created_at))}</td><td>${can?`<button class="btn sm" data-sc="release" data-v="${esc(t.id)}">提前放出</button>`:''}</td></tr>`).join('')}</tbody></table></div>`}
function realSbConfigPage(page){if(!SC.d&&!SC.err&&!SC.loading)scLoad();
  if(!SC.d)return `<div class="card nodata"><h2>场边配置</h2><p>${SC.err?esc(SC.err)+' <button class="btn sm" data-sc="reload">重试</button>':'读取中…'}</p></div>`;
  return scHead()+(page==='stopic'?scPending():'')+SC_PAGE[page].map(scPart).join('')+(scCan()?'':'<p class="cap">只能看：改场边配置需要超级管理员或运营，且不能是限城市的账号（这是全站配置）。</p>')}
if(NBQ_MODE==='real'){for(const p of Object.keys(SC_PAGE))REAL_PAGES[p]=()=>realSbConfigPage(p);
  REAL_RESET.push(()=>Object.assign(SC,{d:null,err:null,loading:false,busy:false,edit:null,work:null,json:false}));
  for(const ev of ['input','change'])document.addEventListener(ev,e=>{const el=e.target.closest&&e.target.closest('[data-scf]');if(el&&!e.isComposing)scFieldSet(el)});
  document.addEventListener('compositionend',e=>{const el=e.target.closest&&e.target.closest('[data-scf]');if(el)scFieldSet(el)});
  document.addEventListener('click',e=>{const t=e.target.closest&&e.target.closest('[data-sc]');if(!t||t.disabled)return;const k=t.dataset.sc;
    if(k==='reload'){SC.d=null;SC.err=null;SC.edit=null;render();return scLoad()}
    if(k==='edit'){SC.edit=t.dataset.k;SC.json=false;SC.work=scClone(SC.d.draft.config[t.dataset.k]);return render()}if(k==='unedit'){SC.edit=null;SC.work=null;return render()}
    if(k==='json'){SC.json=true;return render()}
    if(k==='rowadd'){const w=SC.work,proto=w[w.length-1];w.push(Array.isArray(proto)?['','']:proto&&typeof proto==='object'?Object.fromEntries(Object.entries(proto).map(([kk,v])=>[kk,typeof v==='boolean'?v:typeof v==='number'?v:Array.isArray(v)?[]:null])):'');return render()}
    if(k==='rowdel'){SC.work.splice(+t.dataset.i,1);return render()}
    if(k==='savef'){const bad=Array.isArray(SC.work)&&SC.work.some(x=>Array.isArray(x)&&x.some(y=>!y));if(bad){$('#scErr').textContent='每一行的词和话题都要填';return}
      return scPost('config/set',{part:t.dataset.k,value:SC.work},'已存进草稿（还没发布）')}
    if(k==='save'){let v;try{v=JSON.parse($('#scJson').value)}catch(err){$('#scErr').textContent='不是合法的 JSON：'+err.message.slice(0,80);return}
      return scPost('config/set',{part:t.dataset.k,value:v},'已存进草稿（还没发布）')}
    if(k==='toggle'){const ts=SC.d.draft.config.topics.map((x,i)=>i===+t.dataset.i?{...x,active:!x.active}:x);return scPost('config/set',{part:'topics',value:ts},'已存进草稿（还没发布）')}
    if(k==='publish'){const n=($('#scNote')||{}).value?.trim()||'';if(!n)return admToast('请写一句这次改了什么');return scPost('config/publish',{note:n},'已发布')}
    if(k==='discard'){if(!confirm('丢弃草稿里所有没发布的改动？'))return;return scPost('config/discard',{},'已丢弃草稿')}
    if(k==='rollback')return admAskReason(`退回到 v${t.dataset.v}（会作为新版本发布，草稿一起清掉）`,note=>scPost('config/rollback',{version:+t.dataset.v,note:note.slice(0,60)},'已退回（发布成了新版本）'));
    if(k==='release')return scPost('topics/release',{topic:t.dataset.v},'已放出')})}
