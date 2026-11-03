function doSaveCard(uid){const src=$('#modal').querySelector('.shot');if(!src)return;
  const tmp=document.createElement('div');tmp.style.cssText='position:fixed;left:-9999px;top:0';tmp.innerHTML=shareShot(uid);document.body.appendChild(tmp);
  const el=tmp.firstElementChild;
  if(window.html2canvas)html2canvas(el,{backgroundColor:null,scale:3}).then(cv=>{const a=document.createElement('a');a.href=cv.toDataURL('image/png');a.download=`nanbanqiu-${fmtNo(U(uid).no)}.png`;a.click();tmp.remove();toast('分享图已保存')}).catch(()=>{tmp.remove();toast('保存失败，请截图保存')});
  else{tmp.remove();toast('需要联网加载保存组件，也可以直接截图')}}
function openBlock(uid){const u=U(uid);openModal(`<div class="m-b"><div class="m-t">屏蔽 ${esc(u.name)}？</div><p class="m-s" style="margin-bottom:12px">屏蔽后：</p>
  <ul class="tips"><li><i>🙈</i><div>TA 看不到你发起的球局<small>包括通过分享链接打开</small></div></li><li><i>✋</i><div>TA 无法申请加入你的球局<small>TA 当前的待确认申请会自动婉拒</small></div></li><li><i>👀</i><div>你也不会再看到 TA 发起的球局</div></li><li><i>🔕</i><div>对方不会收到任何通知</div></li></ul>
  <div class="row2"><button class="btn btn-s" data-a="closeModal">取消</button><button class="btn btn-d" data-a="doBlock" data-u="${uid}">屏蔽</button></div><p class="fine">可以在「屏蔽名单」中随时解除</p></div>`,'sm')}
function openBlocklist(){const l=[...ME.blocked].map(U);openModal(`<div class="m-b"><div class="m-t">屏蔽名单</div><p class="m-s">被屏蔽的人看不到你的球局，也无法申请</p>
  ${l.length?l.map(u=>`<div class="cp">${av(u)}<span class="v"><b>${esc(u.name)}</b><small>UTR ${f1(u.ntrp)}</small></span><button class="btn btn-o btn-sm" data-a="unblock" data-u="${u.id}">解除</button></div>`).join(''):'<div class="empty" style="padding:28px">名单是空的</div>'}</div>`,'sm')}
function reportMail(uid){const u=uid?U(uid):null;return `mailto:safety@nanbanqiu.app?subject=${encodeURIComponent(u?`举报用户：${u.name}（${u.id}）`:'举报 / 安全问题')}&body=${encodeURIComponent('请描述发生了什么（时间、球局、经过），可附截图：\n\n')}`}
function openSafety(){openModal(`<div class="m-b"><div class="bigic" style="background:var(--gss);color:var(--g)"><svg><use href="#i-shield"/></svg></div><div class="m-t center">安全约球</div><p class="m-s center">南伴球的球友都来自社区，我们也希望每一次见面都安心</p>
  ${pactHTML(false)}<div class="pact-t2">见面安全</div><ul class="tips">
    <li><i>🏟</i><div>在公开球场见面<small>第一次约球选白天或灯光充足的时段，不去私人住所</small></div></li>
    <li><i>📍</i><div>把球局链接发给朋友或家人<small>让他们知道你在哪、和谁打球</small></div></li>
    <li><i>🔒</i><div>保护个人信息<small>不需要提前转账，不透露住址、证件等信息</small></div></li>
    <li><i>🚪</i><div>感觉不对，随时离开<small>取消参加不需要理由，也不会被记录</small></div></li>
    <li><i>🚫</i><div>遇到骚扰或不当行为<small>点对方头像 → 屏蔽或举报，我们会在 24 小时内处理</small></div></li>
    <li><i>🆘</i><div>紧急情况请拨打 000<small>澳大利亚报警 / 救护 / 消防</small></div></li></ul>
  <a class="btn btn-o w100" href="${reportMail()}"><svg><use href="#i-mail"/></svg>举报邮箱 safety@nanbanqiu.app</a></div>`,'md')}
function openContact(){openModal(`<div class="m-b"><div class="m-t">联系我们</div><p class="m-s">我们会认真看每一封邮件</p>
  <div class="contact"><a href="${reportMail()}"><span style="font-size:22px">🛡</span><span><b>举报与安全</b><small>违反球友约定、骚扰、虚假信息</small></span><span class="e">safety@nanbanqiu.app</span></a>
  <a href="mailto:hello@nanbanqiu.app?subject=${encodeURIComponent('南伴球反馈')}"><span style="font-size:22px">💬</span><span><b>建议与反馈</b><small>功能建议、Bug、球场信息更正</small></span><span class="e">hello@nanbanqiu.app</span></a>
  <a href="mailto:club@nanbanqiu.app?subject=${encodeURIComponent('Club 合作')}"><span style="font-size:22px">🏟</span><span><b>Club / 球场合作</b><small>场地优惠、活动合作</small></span><span class="e">club@nanbanqiu.app</span></a></div>
  <p class="fine">举报时请写上对方昵称、球局时间和经过，可附截图</p></div>`,'md')}
function openCommunity(){openModal(`<div class="m-b center"><div class="bigic" style="background:#E7F7EC;color:#07C160"><svg><use href="#i-wx"/></svg></div><div class="m-t">加南伴球小助手，进球友群</div><p class="m-s">${esc(CITY.zh)}的华人球友都在这里约球、聊球、组队<br>扫码加小助手，备注「南伴球」，拉你进群</p><div class="qr" id="cqr"></div><p class="fine">有想法也欢迎在群里告诉我们 🙌</p></div>`,'sm');qr($('#cqr'),'https://nanbanqiu.app/'+CITY.slug+'/community')}

/* 登录 */
let AUTH={next:null,phone:'',cc:'+61',t:0},NP={ntrp:3.0,clubs:[]};
function openAuth(next,why){AUTH.next=next;openModal(`<div class="m-b"><svg class="auth-logo" viewBox="0 0 100 100"><use href="#logo"/></svg><div class="m-t center">用手机号继续</div><p class="m-s center">${why||'30 秒创建账号，以后打开链接自动登录'}</p>
  <div class="lrow"><select class="inp" id="cc" style="width:92px;flex:none">${COUNTRIES.map(k=>`<option>${k.dial}</option>`).join('')}</select><input class="inp" id="ph" inputmode="tel" placeholder="0412 345 678"></div>
  <div style="height:12px"></div><button class="btn btn-p w100" data-a="sendCode">获取验证码</button><p class="fine">演示：任意手机号和 6 位验证码<br>继续即表示同意${legalLinks()}</p></div>`,'sm');setTimeout(()=>$('#ph')&&$('#ph').focus(),60)}
function openOtp(){openModal(`<div class="m-b"><button class="btn-link" data-a="login" style="margin:-6px 0 8px">‹ 修改手机号</button><div class="m-t">输入验证码</div><p class="m-s">已发送至 ${esc(AUTH.cc)} ${esc(AUTH.phone)}</p><input class="inp otp num" id="otp" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="······"><div class="fine" id="resend">60 秒后可重新发送</div></div>`,'sm');
  let n=60;clearInterval(AUTH.t);AUTH.t=setInterval(()=>{n--;const r=$('#resend');if(!r){clearInterval(AUTH.t);return}r.innerHTML=n>0?n+' 秒后可重新发送':'<b style="color:var(--g);cursor:pointer" data-a="sendCode">重新发送</b>';if(n<=0)clearInterval(AUTH.t)},1000);
  setTimeout(()=>{const o=$('#otp');o.focus();o.oninput=()=>{o.value=o.value.replace(/\D/g,'');if(o.value.length===6){sbaOtpDone(o.value)}}},60)}
function openNewProfile(){const near=Object.values(VEN).sort((a,b)=>km(LOC,a)-km(LOC,b)).slice(0,6);
  const draw=()=>openModal(`<div class="m-b"><div class="m-t">欢迎来到南伴球 👋</div><p class="m-s">填一次就好，发起人会看到</p>
  <div class="lab">昵称</div><input class="inp" id="npName" maxlength="20" placeholder="球友怎么称呼你" value="${esc(NP.name||'')}"><div class="lab">姓氏首字母 <span>选填 · 用来区分同名球友，如 Jason W.</span></div><input class="inp" id="npLast" maxlength="1" placeholder="W" style="width:88px;text-transform:uppercase" value="${esc(NP.last||'')}">
  <div class="lab">UTR <span>UTR Sports app 里可以查到</span></div><div class="utrin"><button data-nlv="${Math.max(UTR_MIN,NP.ntrp-.5)}">−</button><b>${f1(NP.ntrp)}</b><button data-nlv="${Math.min(UTR_MAX,NP.ntrp+.5)}">+</button></div>
  <div class="lab">还没有 UTR？<span>选一个最接近的</span></div><div class="cchips">${UTR_EST.map(([l,v])=>`<button data-nlv="${v}" class="${NP.ntrp===v?'on':''}">${l}<small> ≈${v}</small></button>`).join('')}</div>
  <div class="lab">性别 <span>选填 · 只用于女生局，不显示在球员卡上</span></div><div class="opt eq">${[['f','女生'],['m','男生'],['x','不透露']].map(([k,l])=>`<button data-sx="npg" data-v="${k}" class="${(NP.gender||'x')===k?'on':''}">${l}</button>`).join('')}</div>
  <div class="lab">Home Club <span>最多选 3 个，可跳过</span></div><div class="cchips">${near.map(v=>`<button data-npc="${v.id}" class="${NP.clubs.includes(v.id)?'on':''}">${esc(v.short)}</button>`).join('')}</div>
  <label class="npadult"><input type="checkbox" id="npAdult"${NP.adult?' checked':''}><span>我已满 18 岁，并同意${legalLinks()}</span></label>
  <div id="npErr" style="color:var(--red);font-size:13px;margin-top:6px"></div><div style="height:12px"></div><button class="btn btn-p w100" data-a="npDone">${AUTH.next?'完成并继续':'完成'}</button></div>`,'sm');
  NP.redraw=()=>{NP.name=$('#npName').value;NP.adult=!!($('#npAdult')&&$('#npAdult').checked);draw()};draw()}
function openApply(id){const c=api.get(id),h=c.host,gap=ME.ntrp<c.ntrp_min-.5||ME.ntrp>c.ntrp_max+1;
  openModal(`<div class="m-b"><div class="m-t">申请加入</div><p class="m-s">${esc(h.name)} 确认后，你会收到通知</p>
  <div class="mini">${av(h)}<div style="flex:1;min-width:0"><b>${relDay(c.start)} ${hm(c.start)} · ${esc(c.v.short)}</b><span class="s">${TYPE[c.game_type]} · UTR ${lvl(c)} · 发起人 ${esc(h.name)}</span></div></div>
  <div class="lab">说一句 <span>选填</span></div><textarea class="inp" id="applyMsg" maxlength="140">你好，我 ${f1(ME.ntrp)} 左右，希望一起打！</textarea>
  <div class="qchips">${['可以带新球','时间可以灵活','住得很近'].map(q=>`<button data-q="${q}">+ ${q}</button>`).join('')}</div>
  ${gap?`<div class="warn">你的水平 ${f1(ME.ntrp)} 与要求 ${lvl(c)} 有差距，可能不会通过。</div>`:''}
  <div style="height:16px"></div><button class="btn btn-p w100" data-a="doApply" data-g="${id}">发送申请</button></div>`,'md')}
function openApplied(id){const c=api.get(id);openModal(`<div class="m-b center"><div class="bigic" style="background:var(--gs);color:var(--g)"><svg><use href="#i-check"/></svg></div><div class="m-t">申请已发送</div><p class="m-s">${esc(c.host.name)} 确认后${NOTIFY_WHERE()}</p>
  ${nrWebCard()}${emAskHTML(false)}<div style="height:8px"></div><button class="btn btn-s w100" data-a="closeModal">好的</button></div>`,'sm')}
function openLeave(id){const c=api.get(id),appr=c.mine==='approved';openModal(`<div class="m-b"><div class="m-t">${appr?'取消参加？':'撤回申请？'}</div><p class="m-s">${appr?`${esc(c.host.name)} 会收到通知，名额会重新开放。${ugLeaveTxt(c)}`:'撤回后可以重新申请。'}</p>
  <div class="row2"><button class="btn btn-s" data-a="closeModal">再想想</button><button class="btn btn-d" data-a="doLeave" data-g="${id}">${appr?'取消参加':'撤回申请'}</button></div></div>`,'sm')}
function openCancelGame(id){const c=api.get(id),n=c.appr.length-1+c.pend.length;openModal(`<div class="m-b"><div class="m-t">取消这个球局？</div><p class="m-s">${n?`${n} 位球友会收到通知。`:'还没有球友加入。'}</p>
  <div class="row2"><button class="btn btn-s" data-a="closeModal">保留</button><button class="btn btn-d" data-a="doCancelGame" data-g="${id}">取消球局</button></div></div>`,'sm')}
let CL=[];
function clubRows(){return Object.values(VEN).sort((a,b)=>km(LOC,a)-km(LOC,b)).map(v=>{const i=CL.indexOf(v.id);return `<button class="cp${i>=0?' on':''}" data-cl="${v.id}"><span class="v"><b>${esc(v.name)}</b><small>${esc(v.suburb)} · ${surfTxt(v)} · ${km(LOC,v).toFixed(1)} km</small></span>${i===0?'<span class="cpm on" title="主 Club"><svg viewBox="0 0 24 24"><path d="M12 3.6l2.5 5.2 5.7.7-4.2 3.9 1.1 5.6L12 16.3 6.9 19l1.1-5.6-4.2-3.9 5.7-.7z" fill="currentColor"/></svg>主 Club</span>':i>0?`<span class="cpm" data-clmain="${v.id}" title="设为主 Club"><svg viewBox="0 0 24 24"><path d="M12 3.6l2.5 5.2 5.7.7-4.2 3.9 1.1 5.6L12 16.3 6.9 19l1.1-5.6-4.2-3.9 5.7-.7z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg></span>`:''}<span class="ck"><svg><use href="#i-check"/></svg></span></button>`}).join('')}
function openClubs(){CL=[...myClubIds()];openModal(`<div class="m-b"><div class="m-t">我的 Club</div><p class="m-s">最多选 3 个 · ★ 主 Club 会显示在球员卡上</p>
  <div id="clList">${clubRows()}</div>
  <div style="position:sticky;bottom:-26px;margin:12px -28px -26px;padding:12px 28px 26px;background:linear-gradient(to top,#fff 78%,rgba(255,255,255,0))"><button class="btn btn-p w100" data-a="saveClubs">完成${CL.length?`（${CL.length}）`:''}</button></div></div>`,'md')}
const shareText=c=>`🎾 南伴球｜${relDay(c.start)} ${hm(c.start)} ${c.v.short}\n${TYPE[c.game_type]} · UTR ${lvl(c)} · ${c.spots>0?'缺 '+c.spots+' 位':'已满'}\n👉 ${shareURL('https://nanbanqiu.app/g/'+c.share_code,'text')}`;
const ogTitle=c=>`${relDay(c.start)} ${hm(c.start)} · ${c.v.short} · ${c.spots>0?`缺${c.spots}位球友 · UTR ${lvl(c)}`:'已满员'}`;
const ogDesc=c=>`${TYPE[c.game_type]}｜发起人 ${c.host.name} UTR ${f1(c.host.ntrp)} · 南伴球`;
const ogAHTML=c=>`<div class="ogW">${ticketHTML(c)}</div>`;
function openShare(id){const c=api.get(id),h=c.host,url=shareURL('https://nanbanqiu.app/g/'+c.share_code,'webqr');
  openModal(`<div class="m-b"><div class="m-t">分享球局</div><p class="m-s">发到微信群或小红书，更快找到球友</p>
  <div class="shr">
    <section><div class="shr-h"><span class="si wx"><svg><use href="#i-wx"/></svg></span><b>微信群</b></div>
      <div class="shr-pv"><div class="wxchat"><div class="wxmsg">${av(h)}<div class="wxbub">${relDay(c.start)}有人一起打吗？👇</div></div><div class="wxmsg">${av(h)}<div class="wxcard"><b>${esc(ogTitle(c))}</b><div class="r"><p>${esc(ogDesc(c))}</p><div class="th"><div class="thumb"><svg viewBox="0 0 100 100"><use href="#logo"/></svg></div></div></div><div class="src">南伴球</div></div></div></div></div>
            <div class="shr-qr"><div class="qr" id="sqr1"></div><p><b>微信扫一扫</b>打开这局，点右上角「…」转发到群</p></div>
            <div class="shr-a"><button class="btn btn-o btn-sm" data-a="copyText" data-g="${id}">复制文案</button><button class="btn btn-o btn-sm" data-a="copyLink" data-g="${id}">复制链接</button></div></section>
    <section><div class="shr-h"><span class="si xhs">书</span><b>小红书</b></div>
      <div class="shr-pv">${ogAHTML(c)}</div>
            <div class="shr-qr"><div class="qr" id="sqr2"></div><p><b>手机扫一扫</b>保存这张图发小红书，图上的二维码能直接带人加入</p></div>
            <div class="shr-a"><button class="btn btn-o btn-sm" data-sx="dlPoster" data-g="${id}">保存图片</button><button class="btn btn-o btn-sm" data-sx="xhsCopy" data-g="${id}">复制文案（带话题）</button></div></section>
  </div></div>`,'lg');qr($('#sqr1'),url);qr($('#sqr2'),shareURL('https://nanbanqiu.app/g/'+c.share_code+'?poster=1','webqr'))}
let NG={type:'singles',dur:90};
function openCreate(){if(!ME){openAuth(openCreate,'登录后即可发起球局');return}ngInit();drawCreate()}

/* 通知 / 用户菜单 */
function renderPop(){const p=$('#pop');
  if(!ME){p.innerHTML=authView({wait:`<div class="pop-h"><b>通知</b></div>`+sbaWaitHTML(),out:()=>`<div class="pop-h"><b>通知</b></div><div class="empty" style="padding:30px"><b>登录后接收通知</b><br><button class="btn btn-p btn-sm" data-a="login">登录 / 注册</button></div>`});return}
  const list=nrList();
  p.innerHTML=`<div class="pop-h"><b>通知</b><button class="btn-link" data-a="readAll">全部已读</button></div>
  ${nrWebCard()}
  ${list.map(n=>{const[t,b]=ntfText(n),f=U(n.from)||{name:'?',color:'#999'},pp=n.kind==='request'?PARTS.find(p=>p.game_id===n.game_id&&p.user_id===n.from&&p.status!=='withdrawn'&&p.status!=='left'):null;
    const acts=pp&&pp.status==='pending'?`<div class="acts"><button class="btn btn-p btn-sm" data-a="approve" data-g="${n.game_id}" data-u="${n.from}">接受</button><button class="btn btn-s btn-sm" data-sx="softNo" data-g="${n.game_id}" data-u="${n.from}">婉拒</button></div>`:pp?`<div class="acts"><span class="pill ${pp.status==='approved'?'p-green':'p-gray'}">${pp.status==='approved'?'已接受':pp.reason==='timeout'?'已失效':pp.reason==='full_auto'?'已满员':'已婉拒'}</span></div>`:'';
    return `<div class="ntf${n.read?'':' unread'}" data-wn="${n.id}">${nrAv(n,f)||av(f)}<div class="nb"><b>${esc(t)}</b><p>${esc(b)}</p>${pp&&pp.message&&pp.status==='pending'?`<div class="quote">“${esc(pp.message)}”</div>`:''}${acts}</div><span class="tm">${ago(n.at)}</span></div>`}).join('')||'<div class="empty" style="padding:30px"><b>暂无通知</b><br>申请结果、新的申请都会出现在这里</div>'}`}
function togglePop(force){const p=$('#pop'),show=force??!p.classList.contains('show');p.classList.toggle('show',show);if(show)renderPop()}
function toggleUmenu(){const m=$('#umenu');m.innerHTML=`<button data-a="myCard"><svg><use href="#i-card"/></svg>我的球员卡</button><button data-tab="mine"><svg><use href="#i-cal"/></svg>我的球局</button><button data-a="sbAlbum"><svg><use href="#i-side"/></svg>场边相册</button><button data-a="blocklist"><svg><use href="#i-ban"/></svg>屏蔽名单</button><hr><button data-a="safety"><svg><use href="#i-shield"/></svg>安全须知</button><button data-a="contact"><svg><use href="#i-mail"/></svg>联系我们 / 举报</button><hr><button data-a="logout"><svg><use href="#i-out"/></svg>退出登录</button>`;m.classList.toggle('show')}
function enablePush(){const done=()=>{if(NBQ_NET){const ok='Notification'in window&&Notification.permission==='granted';closeModal();if(ok)nbqPushSub().then(r=>{toast(r?'桌面通知已开启':'已允许通知，但推送没开成功（'+NBQ_PUSH_WHY+'）');render();if($('#pop').classList.contains('show'))renderPop()});else{toast('没有开启通知，可以在浏览器设置里打开');render()}return}PUSH.enabled=true;toast('桌面通知已开启');closeModal();render();if($('#pop').classList.contains('show'))renderPop()};
  if('Notification'in window&&Notification.permission!=='denied'){try{Notification.requestPermission().then(done,done)}catch(e){done()}}else done()}

/* 位置 */
function setLoc(lat,lng,label,source){LOC={...LOC,lat,lng,label,source,asked:true};if(MAP.lf)MAP.lf.setView([lat,lng],12);render()}
function fallbackLoc(msg){const v=ME&&myClubIds().length?VEN[myClubIds()[0]]:null;if(v){setLoc(v.lat,v.lng,v.short,'club');toast(msg+'，以 '+v.short+' 为中心')}else{setLoc(CITY.lat,CITY.lng,CITY.center,'default');toast(msg+'，以 '+CITY.center+' 为中心')}}
function requestLocation(){closeModal();if(!navigator.geolocation){fallbackLoc('无法获取位置');return}
  navigator.geolocation.getCurrentPosition(p=>{const{latitude:lat,longitude:lng}=p.coords;if(km({lat,lng},CITY)>CITY.km+5){fallbackLoc('你目前不在'+CITY.zh+'附近');return}
    let b=SUBURBS[0],d=1e9;SUBURBS.forEach(s=>{const x=km({lat,lng},s);if(x<d){d=x;b=s}});setLoc(lat,lng,b.name,'gps');toast('已定位到 '+b.name)},()=>fallbackLoc('未获得位置权限'),{timeout:8000,maximumAge:6e5})}
function downloadICS(id){const c=api.get(id),f=d=>d.toISOString().replace(/[-:]/g,'').split('.')[0]+'Z';
  const ics=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//nanbanqiu//CN','BEGIN:VEVENT',`UID:${c.id}@nanbanqiu.app`,`DTSTAMP:${f(new Date())}`,`DTSTART:${f(c.start)}`,`DTEND:${f(c.end)}`,`SUMMARY:🎾 ${TYPE[c.game_type]} · ${c.v.short}`,`LOCATION:${c.v.name}\\, ${c.v.suburb} VIC`,`URL:https://nanbanqiu.app/g/${c.share_code}`,'BEGIN:VALARM','TRIGGER:-PT2H','ACTION:DISPLAY','DESCRIPTION:2 小时后打球','END:VALARM','END:VEVENT','END:VCALENDAR'].join('\r\n');
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([ics],{type:'text/calendar'}));a.download=`nanbanqiu-${c.share_code}.ics`;a.click();toast('已加入日历（提前 2 小时提醒）')}
function copy(t,m){(navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(()=>toast(m),()=>toast(m))}
function refreshFilters(){render();if($('#mbg').classList.contains('show')&&$('#modal [data-flv]')){$('#modal .m-b').innerHTML=filtersHTML();$('#modal .card').style.cssText='border:0;box-shadow:none';bindSub($('#modal'))}}

