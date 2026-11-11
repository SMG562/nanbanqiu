/* =====================================================================
 * 真数据 · 场边配置三页（#27 第 4 步）：话题（stopic）· 今日推荐排期（ssched）· 引导文案（sguide）。
 *   同一份配置（库里 sb_config 的 9 块），改动先进草稿，点「发布」才对前台生效；可丢弃草稿、退回任一旧版本。
 *   每个写操作带页面上看到的版本号：别人刚发布过 → 409，页面提示后重读。只读角色和限城市的管理员不能改（库函数挡，这里按钮也不给）。
 *   第一版：话题表可直接开关上线；其余各块是「可读预览 + JSON 编辑」，内容由库里的 sb_config_check 校验，不合格不存。
 * ===================================================================== */
const SC={d:null,err:null,loading:false,busy:false,edit:null};
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
function scPart(k){const v=SC.d.draft.config[k],can=scCan(),ed=SC.edit===k,b=SC.busy?' disabled':'',ch=(SC.d.draft.changed||[]).includes(k);
  let body;
  if(ed)body=`<textarea id="scJson" class="search mono" style="width:100%;min-height:260px;font-size:12px">${esc(JSON.stringify(v,null,1))}</textarea><div class="admr-e" id="scErr"></div><div class="rowacts" style="margin-top:6px"><button class="btn sm p" data-sc="save" data-k="${k}"${b}>保存到草稿</button><button class="btn sm" data-sc="unedit">取消</button></div>`;
  else if(k==='topics')body=`<table><thead><tr><th>话题</th><th>类型</th><th>问题</th><th>开头句</th><th>上线</th></tr></thead><tbody>${v.map((t,i)=>`<tr><td><b style="font-weight:600">#${esc(t.title)}</b><br><small class="mono" style="color:var(--mut)">${esc(t.id)}</small></td><td>${t.kind==='limited'?`限时${t.starts_at?'<br><small>'+esc(String(t.starts_at).slice(0,10))+' 起</small>':''}`:'常驻'}</td><td>${esc(t.ask||'—')}</td><td><small>${esc((t.starters||[]).join(' / ')||'—')}</small></td>
    <td>${can?`<button class="btn sm${t.active?' p':''}" data-sc="toggle" data-i="${i}"${b}>${t.active?'上线中':'已下线'}</button>`:t.active?'上线中':'已下线'}</td></tr>`).join('')}</tbody></table>`;
  else body=scPreview(v);
  return `<div class="card"><div class="ch"><b>${esc(SC_PART[k])}</b>${ch?'<span class="pill w">草稿已改</span>':''}${can&&!ed?`<button class="btn sm" data-sc="edit" data-k="${k}" style="margin-left:auto">编辑</button>`:''}</div>${body}</div>`}
function scPending(){const p=SC.d.pending||[],can=scCan();if(!p.length)return '';
  return `<div class="card"><div class="ch"><b>大家发起、还没到门槛的话题</b><small>放出后马上出现在「大家在聊」和搜索里（不走版本）</small></div><table><tbody>${p.map(t=>`<tr><td>#${esc(t.title)}</td><td>${esc(realCity(t.city))}</td><td>${esc(rpAgo(t.created_at))}</td><td>${can?`<button class="btn sm" data-sc="release" data-v="${esc(t.id)}">提前放出</button>`:''}</td></tr>`).join('')}</tbody></table></div>`}
function realSbConfigPage(page){if(!SC.d&&!SC.err&&!SC.loading)scLoad();
  if(!SC.d)return `<div class="card nodata"><h2>场边配置</h2><p>${SC.err?esc(SC.err)+' <button class="btn sm" data-sc="reload">重试</button>':'读取中…'}</p></div>`;
  return scHead()+(page==='stopic'?scPending():'')+SC_PAGE[page].map(scPart).join('')+(scCan()?'':'<p class="cap">只能看：改场边配置需要超级管理员或运营，且不能是限城市的账号（这是全站配置）。</p>')}
if(NBQ_MODE==='real'){for(const p of Object.keys(SC_PAGE))REAL_PAGES[p]=()=>realSbConfigPage(p);
  REAL_RESET.push(()=>Object.assign(SC,{d:null,err:null,loading:false,busy:false,edit:null}));
  document.addEventListener('click',e=>{const t=e.target.closest&&e.target.closest('[data-sc]');if(!t||t.disabled)return;const k=t.dataset.sc;
    if(k==='reload'){SC.d=null;SC.err=null;SC.edit=null;render();return scLoad()}
    if(k==='edit'){SC.edit=t.dataset.k;return render()}if(k==='unedit'){SC.edit=null;return render()}
    if(k==='save'){let v;try{v=JSON.parse($('#scJson').value)}catch(err){$('#scErr').textContent='不是合法的 JSON：'+err.message.slice(0,80);return}
      return scPost('config/set',{part:t.dataset.k,value:v},'已存进草稿（还没发布）')}
    if(k==='toggle'){const ts=SC.d.draft.config.topics.map((x,i)=>i===+t.dataset.i?{...x,active:!x.active}:x);return scPost('config/set',{part:'topics',value:ts},'已存进草稿（还没发布）')}
    if(k==='publish'){const n=($('#scNote')||{}).value?.trim()||'';if(!n)return admToast('请写一句这次改了什么');return scPost('config/publish',{note:n},'已发布')}
    if(k==='discard'){if(!confirm('丢弃草稿里所有没发布的改动？'))return;return scPost('config/discard',{},'已丢弃草稿')}
    if(k==='rollback')return admAskReason(`退回到 v${t.dataset.v}（会作为新版本发布，草稿一起清掉）`,note=>scPost('config/rollback',{version:+t.dataset.v,note:note.slice(0,60)},'已退回（发布成了新版本）'));
    if(k==='release')return scPost('topics/release',{topic:t.dataset.v},'已放出')})}
