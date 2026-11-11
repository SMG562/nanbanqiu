/* =====================================================================
 * 待审核 → 场边（A1）：被打码送审的照片 + 场边举报
 *   照片：sb_photos.review = 'blurred'（自动识别可疑，或有人举报「不当照片」→ 这条的照片先打码送审）。保留 → ok；拿掉 → removed（别人看不到，作者自己还能看到）。人工审过的不再被自动改。
 *   举报：reports.via = 'sideline'，对象 sb_post / sb_reply，原因 harass 骚扰或冒犯 / photo 不当照片 / fraud 虚假交易 / other（不要求写说明）。
 *   隐藏 = 作者仍在相册里看到、别人看不到，作者收到说明；处理 / 忽略只改举报状态。
 *   真实环境：照片 admin_sb_photo_review(post, idx, keep|remove)（权限 report.handle）；隐藏 admin_sb_post_hide / admin_sb_reply_hide（权限 message.hide，要理由）；
 *   举报状态 admin_report_handle（report.handle）。后台不再有直接改 sb_ 表审核列的权限，一律走这些函数。演示数据。
 * ===================================================================== */
const SB_REP_RC={harass:'骚扰或冒犯',photo:'不当照片',fraud:'虚假交易',other:'其他'};
const SB_REVIEW={
 photos:[{id:'sp1',post:'今天的配色：奶白 + 一点网球绿',who:'Lily',sw:'#D9C8AE',why:'auto',at:'2 小时前',st:'blurred'},
         {id:'sp2',post:'下午四点的影子，比我打得好看',who:'Nana',sw:'#5F7068',why:'report',at:'5 小时前',st:'blurred'},
         {id:'sp3',post:'它捡球比我还积极',who:'Yuki',sw:'#C9A57E',why:'auto',at:'昨天',st:'blurred'}],
 reports:[{id:'sr1',kind:'发布',text:'便宜出一支 Wilson 拍子，先转钱再发货',author:'Ray',who:'Mia',rc:'fraud',at:'1 小时前',st:'open'},
          {id:'sr2',kind:'回复',text:'你这水平还来场边发什么',author:'Ben',who:'Coco',rc:'harass',at:'3 小时前',st:'open'},
          {id:'sr3',kind:'发布',text:'今天的配色：奶白 + 一点网球绿',author:'Lily',who:'阿杰',rc:'photo',at:'今天 09:12',st:'open'},
          {id:'sr4',kind:'回复',text:'哈哈哈哈',author:'Leo',who:'Amy',rc:'other',at:'昨天',st:'dismissed'}]};
const sbReviewOpen=()=>SB_REVIEW.photos.filter(x=>x.st==='blurred').length+SB_REVIEW.reports.filter(x=>x.st==='open').length;
function sbReviewPane(){const P=SB_REVIEW.photos,R=SB_REVIEW.reports,pill=s=>s==='open'||s==='blurred'?'<span class="pill w">待处理</span>':s==='ok'||s==='actioned'?'<span class="pill g">已处理</span>':'<span class="pill nodot">已忽略</span>';
  const pst=s=>s==='blurred'?'<span class="pill w">待审核</span>':s==='ok'?'<span class="pill g">已保留</span>':'<span class="pill nodot">已拿掉</span>';
  return `<div class="ch" style="margin:4px 0 8px"><b>照片待审核</b><small>自动识别可疑、或被举报的照片先打码，等你看一眼</small></div>
  ${P.length?`<table><thead><tr><th>照片</th><th>发布</th><th>作者</th><th>为什么送审</th><th>时间</th><th>状态</th><th></th></tr></thead><tbody>${P.map(x=>`<tr><td><span class="thumb" style="background:${x.sw};filter:${x.st==='blurred'?'blur(1.5px)':'none'}"></span></td><td>${esc(x.post)}</td><td>${esc(x.who)}</td><td>${x.why==='report'?'有人举报「不当照片」':'自动识别可疑'}</td><td>${x.at}</td><td>${pst(x.st)}</td>
    <td>${x.st==='blurred'?`<div class="rowacts"><button class="btn sm p" data-act="sbpk" data-id="${x.id}">保留</button><button class="btn sm" data-act="sbpx" data-id="${x.id}">拿掉</button></div>`:''}</td></tr>`).join('')}</tbody></table>`:'<div class="empty">都处理完了 ✓</div>'}
  <div class="ch" style="margin:22px 0 8px"><b>场边举报</b><small>举报发布或回复；不会告诉对方是谁举报的</small></div>
  <table><thead><tr><th>举报人</th><th>对象</th><th>作者</th><th>原因</th><th>时间</th><th>状态</th><th></th></tr></thead><tbody>${R.map(x=>`<tr><td>${esc(x.who)}</td><td><span class="pill nodot">${x.kind}</span> ${esc(x.text)}</td><td>${esc(x.author)}</td><td>${SB_REP_RC[x.rc]}</td><td>${x.at}</td><td>${pill(x.st)}</td>
    <td>${x.st==='open'?`<div class="rowacts"><button class="btn sm p" data-act="sbrh" data-id="${x.id}">隐藏内容</button><button class="btn sm" data-act="sbro" data-id="${x.id}">已处理</button><button class="btn sm" data-act="sbrd" data-id="${x.id}">忽略</button></div>`:''}</td></tr>`).join('')}</tbody></table>
  <p class="cap">举报「不当照片」会让这条的照片先打码送审；人工审过的照片不会再被自动改。「隐藏内容」：作者在相册里还看得到，别人看不到，作者会收到说明；要写理由。</p>`}
const _sbAct=act;act=function(d){if(!/^sb(pk|px|rh|ro|rd)$/.test(d.act||''))return _sbAct(d);
  const k=d.act,now=`今天 ${String(new Date().getHours()).padStart(2,'0')}:${String(new Date().getMinutes()).padStart(2,'0')}`;
  if(k==='sbpk'||k==='sbpx'){const x=SB_REVIEW.photos.find(p=>p.id===d.id);if(!x)return;x.st=k==='sbpk'?'ok':'removed';S.audit.unshift([admWho(),k==='sbpk'?'sb.photo_keep':'sb.photo_remove',x.post,now])}
  else{const x=SB_REVIEW.reports.find(p=>p.id===d.id);if(!x)return;x.st=k==='sbrd'?'dismissed':'actioned';
    if(k==='sbrh'){S.audit.unshift([admWho(),'sb.hide',`${x.kind}：${x.text}`,now])}
    else S.audit.unshift([admWho(),k==='sbro'?'sb.report_action':'sb.report_dismiss',`${x.kind}：${x.text}`,now])}
  render()};
