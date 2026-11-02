/* ============================== 落地页 ============================== */
function renderLanding(){
  const c=api.byCode(UI.landing);if(!c){UI.landing=null;render();return}
  if(ME&&blockedPair(ME.id,c.host_id)){$('#landRoot').innerHTML=`<div class="land"><div class="lnav"><a class="logo" href="#/" data-a="home"><svg><use href="#logo"/></svg>南伴球</a></div><div class="card empty" style="max-width:520px;margin:40px auto"><b>这个球局暂时无法查看</b><br><button class="btn btn-p btn-sm" data-a="explore">看看其他球局</button></div></div>`;return}
  const near=api.list().filter(x=>x.id!==c.id&&!x.past&&stateOf(x)==='open').sort((a,b)=>a.dist-b.dist).slice(0,3),st=stateOf(c);
  $('#landRoot').innerHTML=`<div class="land"><div class="wxbanner">你正在微信内置浏览器中打开 · 点击右上角「···」选择「在默认浏览器中打开」，可接收通知</div>
  <div class="lnav"><a class="logo" href="#/" data-a="home"><svg><use href="#logo"/></svg>南伴球<small>${esc(CITY.zh)}网球约局</small></a><div class="sp"></div>
    <button class="btn btn-o btn-sm" data-a="home">浏览全部球局</button>${ME?`<span class="me">${av(ME,'sm')}</span>`:sbaWaiting()?'':`<button class="btn btn-p btn-sm" data-a="login">登录</button>`}</div>
  <div class="lwrap"><div>${womenLock(c)||passHTML(c)+requestsHTML(c)}</div>
    <aside class="lside">${st!=='past'||xActs(c,st)!=null?`<div class="card lcard"><div style="display:flex;flex-direction:column;gap:8px">${(ME?chatGameBtn(c,st):'')+(xActs(c,st)??actionsHTML(c)??'')+(ME?hostExtras(c,st):'')}</div>
      ${st==='open'&&!ME&&xActs(c,st)==null?`<div class="stepl"><div><i>1</i>发送申请，可以说一句</div><div><i>2</i>${esc(c.host.name)} 确认后${NOTIFY_WHERE()}</div><div><i>3</i>按时到场</div></div>`:''}</div>`:''}
      <div class="card lcard center"><div class="kick">在手机上打开</div><div class="qr" id="lqr"></div><div class="pm">微信扫码转发到群，或添加到主屏幕接收通知</div></div></aside></div>
  ${near.length?`<div style="max-width:1040px;margin:0 auto;padding:0 24px 20px"><div class="sec-t" style="font-size:13.5px">附近其他球局</div><div class="lgrid">${near.map(gcHTML).join('')}</div></div>`:''}
  <div class="foot" style="max-width:1040px;padding:10px 24px 90px"><button data-a="safety">安全须知</button><button data-a="contact">联系我们 / 举报</button><button data-a="community">微信约球群</button><span>© 2026 南伴球</span></div></div>`;
  qr($('#lqr'),shareURL('https://nanbanqiu.app/g/'+c.share_code,'webqr'));
}
function qr(el,text){if(!el)return;el.innerHTML='';if(window.QRCode)new QRCode(el,{text,width:156,height:156,colorDark:'#101828',colorLight:'#ffffff',correctLevel:QRCode.CorrectLevel.M});else el.innerHTML=`<div style="color:#101828;width:100%;height:100%">${qrSVG(text)}</div>`}

