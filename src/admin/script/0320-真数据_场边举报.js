/* =====================================================================
 * 真数据 · 待审核页的「场边举报」（#27 第 4 步）。接在举报队列（0290 realReviewPage）下面。
 *   一行 = 一条被举报的发布 / 回复（多条举报合并）；操作：隐藏（填理由，同时把这条的举报都标成已处理）· 不用处理（都标成已忽略）· 恢复显示。
 *   照片：前台还没有照片存储，只显示「几张待审」，不给看不见图的审核按钮。
 * ===================================================================== */
const SQ={items:null,err:null,loading:false,loadedAt:0,busy:new Set()};
const SQ_RC={harass:'骚扰或冒犯',photo:'不当照片',fraud:'虚假交易',other:'其他'};
async function sqLoad(){if(SQ.loading)return;SQ.loading=true;const r=await admApi('GET','/sideline/reports');SQ.loading=false;SQ.loadedAt=Date.now();
  if(r.status===401)return toLogin('登录已过期，请重新登录');
  if(r.ok&&r.body&&Array.isArray(r.body.items)){SQ.items=r.body.items;SQ.err=null}else SQ.err=r.status===403?'你的角色不能处理场边举报':realErr(r);
  if(RL.me&&S.page==='review')render()}
async function sqPost(path,body,ok){const key=body.kind+body.id;if(SQ.busy.has(key))return;SQ.busy.add(key);render();
  const r=await admApi('POST',path,body);SQ.busy.delete(key);if(r.status===401)return toLogin('登录已过期，请重新登录');
  admToast(r.ok?ok:r.error==='state_changed'?'这条刚被别人处理过，已刷新':r.error==='admin_forbidden'?'不能处理：举报人或内容不在你负责的城市':realErr(r));await sqLoad()}
function sqCard(){if(SQ.items===null&&!SQ.err&&!SQ.loading)sqLoad();else if(!SQ.loading&&Date.now()-SQ.loadedAt>30000)sqLoad();
  const head=`<div class="ch"><b>场边举报</b><small>${SQ.items?`待处理 ${SQ.items.filter(x=>x.open).length} 条 · 另显示最近处理的`:''}</small><button class="btn sm" data-sq="reload" style="margin-left:auto">刷新</button></div>`;
  if(SQ.items===null)return `<div class="card">${head}<p class="cap">${SQ.err?esc(SQ.err)+' <button class="btn sm" data-sq="reload">重试</button>':'读取中…'}</p></div>`;
  const canHide=realCan('message.hide');
  const row=x=>{const k=x.kind+x.id,b=SQ.busy.has(k)?' disabled':'',a=`data-kind="${x.kind}" data-id="${esc(x.id)}"`;
    const acts=x.deleted?'<small style="color:var(--mut)">作者已删除</small>':x.status==='hidden'
      ?`<button class="btn sm" data-sq="show" ${a}${b}${canHide?'':' disabled title="需要'+esc(admNeed('message.hide'))+'"'}>恢复显示</button>`
      :`<button class="btn sm p" data-sq="hide" ${a}${b}${canHide?'':' disabled title="需要'+esc(admNeed('message.hide'))+'"'}>隐藏</button>`;
    return `<tr><td>${x.kind==='post'?'发布':'回复'}${x.photo_count&&x.kind==='post'?`<br><small style="color:var(--mut)">${x.photo_count} 张照片${x.photos_pending?`（${x.photos_pending} 张待审）`:''}</small>`:''}</td>
    <td><b style="font-weight:600">${esc(x.body||'（只有照片）')}</b><br><small style="color:var(--mut)"><button class="lnk" data-rsk="user" data-v="${x.author_no}">${esc(x.author)}</button> 发的${x.status==='hidden'?' · <span class="pill">已隐藏</span>':''}</small></td>
    <td>${x.reports.map(r=>`${esc(SQ_RC[r.reason]||r.reason)} <small style="color:var(--mut)">${esc(r.reporter||'')} · ${esc(rpAgo(r.created_at))}${r.status!=='open'?' · '+(r.status==='actioned'?'已处理':'已忽略'):''}</small>`).join('<br>')}</td>
    <td><div class="rowacts">${acts}${x.open?`<button class="btn sm" data-sq="dismiss" ${a}${b}>不用处理</button>`:''}</div></td></tr>`};
  return `<div class="card">${head}${SQ.err?`<p class="cap" style="color:var(--crit)">${esc(SQ.err)}（下面是上次读到的）</p>`:''}
  ${SQ.items.length?`<table><thead><tr><th>类型</th><th>内容</th><th>举报</th><th></th></tr></thead><tbody>${SQ.items.map(row).join('')}</tbody></table>`:'<div class="empty">场边还没有举报 ✓</div>'}
  <p class="cap">隐藏要写理由；隐藏后作者自己的相册里还看得到，别人看不到，这条内容上的举报一并标成已处理。照片审核等照片存储上线后在这里显示缩略图。</p></div>`}
if(NBQ_MODE==='real'){const _rv=REAL_PAGES.review;REAL_PAGES.review=()=>_rv()+sqCard();
  REAL_RESET.push(()=>{Object.assign(SQ,{items:null,err:null,loading:false,loadedAt:0});SQ.busy.clear()});
  document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-sq]');if(!b||b.disabled)return;const k=b.dataset.sq,t={kind:b.dataset.kind,id:b.dataset.kind==='reply'?+b.dataset.id:b.dataset.id};
    if(k==='reload'){SQ.items=null;SQ.err=null;render();return sqLoad()}
    if(k==='dismiss')return sqPost('/sideline/dismiss',t,'已标成不用处理');
    if(k==='hide'||k==='show')admAskReason(k==='hide'?'隐藏这条场边内容':'恢复显示这条场边内容',reason=>sqPost('/sideline/hide',{...t,hide:k==='hide',reason},k==='hide'?'已隐藏':'已恢复显示'))})}
