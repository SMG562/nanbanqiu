function doSaveCard(uid){const src=$('#sheet').querySelector('.shot');if(!src)return;
  const tmp=document.createElement('div');tmp.style.cssText='position:fixed;left:-9999px;top:0';tmp.innerHTML=shareShot(uid);document.body.appendChild(tmp);
  const el=tmp.firstElementChild;
  if(window.html2canvas)html2canvas(el,{backgroundColor:null,scale:3}).then(cv=>{const a=document.createElement('a');a.href=cv.toDataURL('image/png');a.download=`nanbanqiu-${fmtNo(U(uid).no)}.png`;a.click();tmp.remove();toast('分享图已保存')}).catch(()=>{tmp.remove();toast('保存失败，请截图保存')});
  else{tmp.remove();toast('需要联网加载保存组件，也可以直接截图')}}
function openBlock(uid){const u=U(uid);openSheet(`<div class="sh-t">屏蔽 ${esc(u.name)}？</div><p class="sh-s" style="margin-bottom:12px">屏蔽后：</p>
  <ul class="tips"><li><i>🙈</i><div>TA 看不到你发起的球局<small>包括通过分享链接打开</small></div></li><li><i>✋</i><div>TA 无法申请加入你的球局<small>TA 当前的待确认申请会自动婉拒</small></div></li><li><i>👀</i><div>你也不会再看到 TA 发起的球局</div></li><li><i>🔕</i><div>对方不会收到任何通知</div></li></ul>
  <button class="btn btn-d" data-a="doBlock" data-u="${uid}">屏蔽</button><div style="height:8px"></div><button class="btn btn-s" data-a="close">取消</button><p class="fine">可以在「我的 → 屏蔽名单」中随时解除</p>`)}
function openBlocklist(){const l=[...ME.blocked].map(U);openSheet(`<div class="sh-t">屏蔽名单</div><p class="sh-s">被屏蔽的人看不到你的球局，也无法申请</p>
  ${l.length?l.map(u=>`<div class="cp">${av(u)}<span class="v"><b>${esc(u.name)}</b><small>UTR ${f1(u.ntrp)}</small></span><button class="sbtn" style="flex:none" data-a="unblock" data-u="${u.id}">解除</button></div>`).join(''):'<div class="empty" style="padding:24px">名单是空的</div>'}`)}
const reportMail=uid=>{const u=uid?U(uid):null;return `mailto:safety@nanbanqiu.app?subject=${encodeURIComponent(u?`举报用户：${u.name}（${u.id}）`:'举报 / 安全问题')}&body=${encodeURIComponent('请描述发生了什么（时间、球局、经过），可附截图：\n\n')}`};
function openSafety(){openSheet(`<div class="center"><div class="bigic" style="background:var(--gss);color:var(--g)"><svg><use href="#i-shield"/></svg></div><div class="sh-t">安全约球</div><p class="sh-s">南伴球的球友都来自社区，我们也希望每一次见面都安心</p></div>
  ${pactHTML(false)}<div class="pact-t2">见面安全</div><ul class="tips"><li><i>🏟</i><div>在公开球场见面<small>第一次约球选白天或灯光充足的时段，不去私人住所</small></div></li>
    <li><i>📍</i><div>把球局链接发给朋友或家人<small>让他们知道你在哪、和谁打球</small></div></li>
    <li><i>🔒</i><div>保护个人信息<small>不需要提前转账，不透露住址、证件等信息</small></div></li>
    <li><i>🚪</i><div>感觉不对，随时离开<small>取消参加不需要理由，也不会被记录</small></div></li>
    <li><i>🚫</i><div>遇到骚扰或不当行为<small>点对方头像 → 屏蔽或举报，我们会在 24 小时内处理</small></div></li>
    <li><i>🆘</i><div>紧急情况请拨打 000<small>澳大利亚报警 / 救护 / 消防</small></div></li></ul>
  <a class="btn btn-s" href="${reportMail()}"><svg><use href="#i-mail"/></svg>举报邮箱 safety@nanbanqiu.app</a>`,true)}
function openContact(){openSheet(`<div class="sh-t">联系我们</div><p class="sh-s">我们会认真看每一封邮件</p>
  <div class="contact"><a href="${reportMail()}"><span style="font-size:22px">🛡</span><span><b>举报与安全</b><small>违反球友约定、骚扰、虚假信息 · safety@nanbanqiu.app</small></span></a>
  <a href="mailto:hello@nanbanqiu.app?subject=${encodeURIComponent('南伴球反馈')}"><span style="font-size:22px">💬</span><span><b>建议与反馈</b><small>功能建议、Bug、球场信息更正 · hello@nanbanqiu.app</small></span></a>
  <a href="mailto:club@nanbanqiu.app?subject=${encodeURIComponent('Club 合作')}"><span style="font-size:22px">🏟</span><span><b>Club / 球场合作</b><small>场地优惠、活动合作 · club@nanbanqiu.app</small></span></a></div>
  <p class="fine">举报时请写上对方昵称、球局时间和经过，可附截图</p>`)}
function openCommunity(){openSheet(`<div class="center"><div class="bigic" style="background:#E7F7EC;color:#07C160"><svg><use href="#i-wx"/></svg></div><div class="sh-t">加南伴球小助手，进球友群</div><p class="sh-s">${esc(CITY.zh)}的华人球友都在这里约球、聊球、组队<br>长按识别二维码，备注「南伴球」，拉你进群</p><div class="qr" id="cqr"></div><p class="fine">有想法也欢迎在群里告诉我们 🙌</p></div>`);qr($('#cqr'),'https://nanbanqiu.app/'+CITY.slug+'/community')}
function qr(el,text){if(!el)return;el.innerHTML='';if(window.QRCode)new QRCode(el,{text,width:156,height:156,colorDark:'#101828',colorLight:'#ffffff',correctLevel:QRCode.CorrectLevel.M});else el.innerHTML=`<div style="color:#101828;width:100%;height:100%">${qrSVG(text)}</div>`}

/* 位置 */
function openLocSheet(){LOC.asked=true;
  openSheet(`<div class="center"><div class="bigic" style="background:#EAF2FE;color:var(--blue)"><svg><use href="#i-nav"/></svg></div><div class="sh-t">允许南伴球使用你的位置？</div><p class="sh-s">用来显示附近的球局和距离，不会公开你的位置。</p></div>
  <button class="btn btn-p" data-a="locAllow">允许</button><div style="height:8px"></div><button class="btn btn-s" data-a="locPick">暂不</button>`)}
function setLoc(lat,lng,label,source){LOC={...LOC,lat,lng,label,source,asked:true};if(MAP.lf)MAP.lf.setView([lat,lng],12);render()}
function fallbackLoc(msg){const v=ME&&myClubIds().length?VEN[myClubIds()[0]]:null;if(v){setLoc(v.lat,v.lng,v.short,'club');toast(msg+'，以 '+v.short+' 为中心')}else{setLoc(CITY.lat,CITY.lng,CITY.center,'default');toast(msg+'，以 '+CITY.center+' 为中心')}}
function requestLocation(){closeSheet();if(!navigator.geolocation){fallbackLoc('无法获取位置');return}
  navigator.geolocation.getCurrentPosition(p=>{const{latitude:lat,longitude:lng}=p.coords;if(km({lat,lng},CITY)>CITY.km+5){fallbackLoc('你目前不在'+CITY.zh+'附近');return}
    let b=SUBURBS[0],d=1e9;SUBURBS.forEach(s=>{const x=km({lat,lng},s);if(x<d){d=x;b=s}});setLoc(lat,lng,b.name,'gps');toast('已定位到 '+b.name)},()=>fallbackLoc('未获得位置权限'),{timeout:8000,maximumAge:6e5})}
function openSuburbPicker(){SBS.q='';SBS.letter=null;openSheet(`<div class="sh-t">位置与距离</div><p class="sh-s">最远 50 km，只显示附近的球局</p>
  <button class="btn btn-s" data-a="locAllow" style="color:var(--blue);margin-bottom:6px"><svg><use href="#i-nav"/></svg>使用当前位置</button>
  <div class="lab">距离</div><div class="opt eq" style="--n:5">${RADII.map(r=>`<button class="${F.radius===r?'on':''}" data-radius="${r}">${r} km</button>`).join('')}</div>
  <div class="lab">区域</div><div class="sbq"><svg><use href="#i-pin"/></svg><input id="sbQ" placeholder="区名、邮编或中文名" autocomplete="off" spellcheck="false"></div>
  <div id="sbBody">${sbBody()}</div>`,true);const i=$('#sbQ');i.oninput=()=>{SBS.q=i.value;SBS.letter=null;$('#sbBody').innerHTML=sbBody()}}
const sbRow=(s,q)=>`<button class="sbr${LOC.label===s.name?' on':''}" data-suburb="${esc(s.name)}"><span>${sbHL(s.name,q)}</span><em>${s.pc}</em></button>`;
const SB_AZ=[...new Set(SUBURBS.map(s=>s.name[0].toUpperCase()))].sort();
// 区域：搜索 + 最近 + 常用 + 按首字母。每一行右边统一是邮编
function sbBody(){const q=SBS.q.trim();
  if(q){const m=sbSearch(q,12);return m.length?`<div class="sbl">${m.map(s=>sbRow(s,q)).join('')}</div>`:`<div class="sbno">没有找到「${esc(q)}」，试试邮编</div>`}
  if(SBS.letter){const list=SUBURBS.filter(s=>s.name[0].toUpperCase()===SBS.letter);return `<button class="sbback" data-sbl="">‹ ${SBS.letter}<span>${list.length} 个区</span></button><div class="sbl">${list.map(s=>sbRow(s)).join('')}</div>`}
  const chip=s=>`<button data-suburb="${esc(s.name)}" class="${LOC.label===s.name?'on':''}">${esc(s.name)}</button>`;
  const RL=sbRecentList(),rec=RL.map(n=>SUBURBS.find(s=>s.name===n)).filter(Boolean),hot=sbHot(6+RL.length).map(x=>x.s).filter(s=>!RL.includes(s.name)).slice(0,6);
  return (rec.length?`<div class="sbh">最近</div><div class="cchips">${rec.map(chip).join('')}</div>`:'')+(hot.length?`<div class="sbh">常用</div><div class="cchips">${hot.map(chip).join('')}</div>`:'')
    +`<div class="sbh">按首字母</div><div class="sbaz">${SB_AZ.map(l=>`<button data-sbl="${l}">${l}</button>`).join('')}</div>`}
document.addEventListener('click',e=>{const b=e.target.closest('[data-sbl]');if(!b)return;e.stopPropagation();SBS.letter=b.dataset.sbl||null;const x=$('#sbBody');if(x){x.innerHTML=sbBody();const sh=$('#sheet'),q=$('#sbQ');if(sh&&q)sh.scrollTop=Math.max(0,q.offsetTop-80)}},true);
function openFilter(){const draw=()=>openSheet(`<div class="sh-t">筛选</div>
  <div class="lab">UTR</div><div class="opt eq" style="--n:5">${UB.map((b,i)=>`<button class="${F.levels.has(i)?'on':''}" data-flv="${i}">${b[2]}</button>`).join('')}</div>
  <div class="lab">玩法</div><div class="opt eq">${Object.entries(TYPE).map(([k,v])=>`<button class="${F.types.has(k)?'on':''}" data-fty="${k}">${v}</button>`).join('')}</div>
  ${tagFilterHTML(t=>`<div class="lab">${t}</div>`)}
  <div class="row2" style="margin-top:22px"><button class="btn btn-s" data-a="fReset">重置</button>${(()=>{const L=api.list().filter(c=>!c.past),n=L.filter(c=>dOff(c.start)===UI.day).length;if(n)return `<button class="btn btn-p" data-a="close">显示 ${n} 个球局</button>`;const nx=[1,2,3,4,5,6].map(k=>UI.day+k).find(o=>o<7&&L.some(c=>dOff(c.start)===o));if(nx==null)return `<button class="btn btn-p" data-a="close">没有符合的球局</button>`;const d=dayAt(nx),m=L.filter(c=>dOff(c.start)===nx).length;return `<button class="btn btn-p" data-fday="${nx}">${nx===1?'明天':WD[d.getDay()]} ${d.getMonth()+1}/${d.getDate()} 有 ${m} 局</button>`})()}</div>`);UI.redrawFilter=draw;draw()}

/* 登录 */
let AUTH={next:null,phone:'',cc:'+61',t:0},NP={ntrp:3.0,clubs:[]};
function openAuth(next,why){AUTH.next=next;
  openSheet(`<div class="sh-t">用手机号继续</div><p class="sh-s">${why||'30 秒创建账号，以后打开链接自动登录'}</p>
  <div class="phone"><select class="inp" id="cc">${COUNTRIES.map(k=>`<option>${k.dial}</option>`).join('')}</select><input class="inp" id="ph" inputmode="tel" autocomplete="tel" placeholder="0412 345 678"></div>
  <div style="height:12px"></div><button class="btn btn-p" data-a="sendCode">获取验证码</button><p class="fine">演示：任意手机号和 6 位验证码<br>继续即表示同意${legalLinks()}</p>`);setTimeout(()=>$('#ph')&&$('#ph').focus(),350)}
function openOtp(){openSheet(`<button class="btn-link" data-a="login" style="height:auto;margin-bottom:6px">‹ 修改手机号</button><div class="sh-t">输入验证码</div><p class="sh-s">已发送至 ${esc(AUTH.cc)} ${esc(AUTH.phone)}</p>
  <input class="inp otp num" id="otp" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="······"><div class="fine" id="resend">60 秒后可重新发送</div>`);
  let n=60;clearInterval(AUTH.t);AUTH.t=setInterval(()=>{n--;const r=$('#resend');if(!r){clearInterval(AUTH.t);return}r.innerHTML=n>0?n+' 秒后可重新发送':'<b style="color:var(--g)" data-a="sendCode">重新发送</b>';if(n<=0)clearInterval(AUTH.t)},1000);
  setTimeout(()=>{const o=$('#otp');if(!o)return;o.focus();o.oninput=()=>{o.value=o.value.replace(/\D/g,'');if(o.value.length===6){sbaOtpDone(o.value)}}},350)}
function openNewProfile(){const near=Object.values(VEN).sort((a,b)=>km(LOC,a)-km(LOC,b)).slice(0,6);
  const draw=()=>openSheet(`<div class="sh-t">欢迎来到南伴球 👋</div><p class="sh-s">填一次就好，发起人会看到</p>
  <div class="lab">昵称</div><input class="inp" id="npName" maxlength="20" placeholder="球友怎么称呼你" value="${esc(NP.name||'')}"><div class="lab">姓氏首字母 <span>选填 · 用来区分同名球友，如 Jason W.</span></div><input class="inp" id="npLast" maxlength="1" placeholder="W" style="width:88px;text-transform:uppercase" value="${esc(NP.last||'')}">
  <div class="lab">UTR <span>UTR Sports app 里可以查到</span></div><div class="utrin"><button data-nlv="${Math.max(UTR_MIN,NP.ntrp-.5)}">−</button><b>${f1(NP.ntrp)}</b><button data-nlv="${Math.min(UTR_MAX,NP.ntrp+.5)}">+</button></div>
  <div class="lab">还没有 UTR？<span>选一个最接近的</span></div><div class="cchips">${UTR_EST.map(([l,v])=>`<button data-nlv="${v}" class="${NP.ntrp===v?'on':''}">${l}<small> ≈${v}</small></button>`).join('')}</div>
  <div class="lab">性别 <span>选填 · 只用于女生局，不显示在球员卡上</span></div><div class="opt eq">${[['f','女生'],['m','男生'],['x','不透露']].map(([k,l])=>`<button data-sx="npg" data-v="${k}" class="${(NP.gender||'x')===k?'on':''}">${l}</button>`).join('')}</div>
  <div class="lab">Home Club <span>可多选，可跳过</span></div><div class="cchips">${near.map(v=>`<button data-npc="${v.id}" class="${NP.clubs.includes(v.id)?'on':''}">${esc(v.short)}</button>`).join('')}</div>
  <label class="npadult"><input type="checkbox" id="npAdult"${NP.adult?' checked':''}><span>我已满 18 岁，并同意${legalLinks()}</span></label>
  <div id="npErr" style="color:var(--red);font-size:13px;margin-top:6px"></div><div style="height:14px"></div><button class="btn btn-p" data-a="npDone">${AUTH.next?'完成并继续':'完成'}</button>`,true);
  NP.redraw=()=>{NP.name=$('#npName').value;NP.adult=!!($('#npAdult')&&$('#npAdult').checked);draw()};draw()}

/* 申请 / 取消 */
function openApply(id){const c=api.get(id),h=c.host,gap=ME.ntrp<c.ntrp_min-.5||ME.ntrp>c.ntrp_max+1;
  openSheet(`<div class="sh-t">申请加入</div><p class="sh-s">${esc(h.name)} 确认后，你会收到通知</p>
  <div class="mini">${av(h)}<div style="flex:1;min-width:0"><b>${relDay(c.start)} ${hm(c.start)} · ${esc(c.v.short)}</b><span class="s">${TYPE[c.game_type]} · UTR ${lvl(c)} · 发起人 ${esc(h.name)}</span></div></div>
  <div class="lab">说一句 <span>选填</span></div><textarea class="inp" id="applyMsg" maxlength="140">你好，我 ${f1(ME.ntrp)} 左右，希望一起打！</textarea>
  <div class="qchips">${['可以带新球','时间可以灵活','住得很近'].map(q=>`<button data-q="${q}">+ ${q}</button>`).join('')}</div>
  ${gap?`<div class="warn">你的水平 ${f1(ME.ntrp)} 与要求 ${lvl(c)} 有差距，可能不会通过。</div>`:''}
  <div style="height:16px"></div><button class="btn btn-p" data-a="doApply" data-g="${id}">发送申请</button>`)}
function openApplied(id){const c=api.get(id);
  const card=ENV==='wechat'?`<button class="btn btn-p" data-a="wxguide">在浏览器打开，接收通知</button><p class="fine" style="margin:6px 0 4px">微信内无法推送通知</p>`
    :ENV==='safari'?`<button class="btn btn-p" data-a="a2hs">添加到主屏幕，接收通知</button>`:PUSH.enabled?'':`<button class="btn btn-p" data-a="enablePush">开启通知</button>`;
  openSheet(`<div class="center"><div class="bigic" style="background:var(--gs);color:var(--g)"><svg><use href="#i-check"/></svg></div><div class="sh-t">申请已发送</div><p class="sh-s">${esc(c.host.name)} 确认后${NOTIFY_WHERE()}</p></div>${card}${emAskHTML(false)}<div style="height:8px"></div><button class="btn btn-s" data-a="close">好的</button>`)}
function openLeave(id){const c=api.get(id),appr=c.mine==='approved';
  openSheet(`<div class="sh-t">${appr?'取消参加？':'撤回申请？'}</div><p class="sh-s">${appr?`${esc(c.host.name)} 会收到通知，名额会重新开放。${ugLeaveTxt(c)}`:'撤回后可以重新申请。'}</p>
  <button class="btn btn-d" data-a="doLeave" data-g="${id}">${appr?'取消参加':'撤回申请'}</button><div style="height:8px"></div><button class="btn btn-s" data-a="close">再想想</button>`)}
function openCancelGame(id){const c=api.get(id),n=c.appr.length-1+c.pend.length;
  openSheet(`<div class="sh-t">取消这个球局？</div><p class="sh-s">${n?`${n} 位球友会收到通知。`:'还没有球友加入。'}</p>
  <button class="btn btn-d" data-a="doCancelGame" data-g="${id}">取消球局</button><div style="height:8px"></div><button class="btn btn-s" data-a="close">保留</button>`)}
let CL=[];
function clubRows(){return Object.values(VEN).sort((a,b)=>km(LOC,a)-km(LOC,b)).map(v=>{const i=CL.indexOf(v.id);return `<button class="cp${i>=0?' on':''}" data-cl="${v.id}"><span class="v"><b>${esc(v.name)}</b><small>${esc(v.suburb)} · ${surfTxt(v)} · ${km(LOC,v).toFixed(1)} km</small></span>${i===0?'<span class="cpm on" title="主 Club"><svg viewBox="0 0 24 24"><path d="M12 3.6l2.5 5.2 5.7.7-4.2 3.9 1.1 5.6L12 16.3 6.9 19l1.1-5.6-4.2-3.9 5.7-.7z" fill="currentColor"/></svg>主 Club</span>':i>0?`<span class="cpm" data-clmain="${v.id}" title="设为主 Club"><svg viewBox="0 0 24 24"><path d="M12 3.6l2.5 5.2 5.7.7-4.2 3.9 1.1 5.6L12 16.3 6.9 19l1.1-5.6-4.2-3.9 5.7-.7z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg></span>`:''}<span class="ck"><svg><use href="#i-check"/></svg></span></button>`}).join('')}
function openClubs(){CL=[...myClubIds()];openSheet(`<div class="sh-t">我的 Club</div><p class="sh-s">可多选 · ★ 主 Club 会显示在球员卡上</p>
  <div id="clList">${clubRows()}</div>
  <div style="height:12px"></div><button class="btn btn-p" data-a="saveClubs">完成${CL.length?`（${CL.length}）`:''}</button>`,true)}

/* 分享 */
const shareText=c=>`🎾 南伴球｜${relDay(c.start)} ${hm(c.start)} ${c.v.short}\n${TYPE[c.game_type]} · UTR ${lvl(c)} · ${c.spots>0?'缺 '+c.spots+' 位':'已满'}\n👉 ${shareURL('https://nanbanqiu.app/g/'+c.share_code,'text')}`;
// 链接卡片的标题 / 描述：和服务端 server/og/card.mjs 同一套文案（tests/frontend/og_parity 逐个核对）
const ogTitle=c=>`${relDay(c.start)} ${hm(c.start)} · ${c.v.short} · ${c.spots>0?`缺${c.spots}位球友 · UTR ${lvl(c)}`:'已满员'}`;
const ogDesc=c=>`${TYPE[c.game_type]}｜发起人 ${c.host.name} UTR ${f1(c.host.ntrp)} · 南伴球`;
// 缩略图 = 链接卡片上真实显示的那张（服务端 og:image = /icons/icon-512.png），预览和真实卡片一致
const thumbHTML=c=>`<div class="thumb"><svg viewBox="0 0 100 100"><use href="#logo"/></svg></div>`;
const wxPreviewHTML=c=>{const h=c.host;return `<div class="wxchat"><div class="wxmsg">${av(h)}<div class="wxbub">${relDay(c.start)}有人一起打吗？👇</div></div><div class="wxmsg">${av(h)}<div class="wxcard"><b>${esc(ogTitle(c))}</b><div class="r"><p>${esc(ogDesc(c))}</p><div class="th">${thumbHTML(c)}</div></div><div class="src">南伴球</div></div></div></div>`};
const ogAHTML=c=>`<div class="ogW">${ticketHTML(c)}</div>`;
const ogLHTML=c=>`<div class="ogL"><div class="l"><svg viewBox="0 0 100 100"><use href="#ball"/></svg><b>南伴球<small>${esc(CITY.zh)}网球约球</small></b></div><div class="r"><div class="t">${WD[c.start.getDay()]} · ${hm(c.start)} · ${relDay(c.start)}</div><div class="p">${esc(c.v.short)}</div><div class="v">${esc(c.v.name)} · ${TYPE[c.game_type]} · UTR ${lvl(c)}</div><div class="n"><i></i>${c.spots>0?`缺 ${c.spots} 位球友`:'已满员'}</div></div></div>`;
// 分享球局：「发到微信群」= 系统分享面板 → 选「微信」→「发送给朋友」，对方收到的是链接卡片（标题 / 描述 / 缩略图来自服务端 og 标签，预览图就是它的样子）；
// 微信里打开时没有系统面板，改成提示点右上角 ···；没有系统分享（电脑等）才退回复制文案
function setOg(c){const m=(p,v)=>{let e=document.querySelector(`meta[property="${p}"]`);if(!e){e=document.createElement('meta');e.setAttribute('property',p);document.head.appendChild(e)}e.setAttribute('content',v)};
  m('og:title',ogTitle(c));m('og:description',ogDesc(c));m('og:url','https://nanbanqiu.app/g/'+c.share_code)}
function wxShare(id){const c=api.get(id);setOg(c);
  if(ENV==='wechat'){closeSheet();openWxShareGuide();return}
  const fb=()=>copy(shareText(c),'已复制，去微信群粘贴');
  if(navigator.share)navigator.share({title:ogTitle(c),url:shareURL('https://nanbanqiu.app/g/'+c.share_code,'wx')}).catch(e=>{if(!e||e.name!=='AbortError')fb()});else fb()}
function openWxShareGuide(){$('#wxg').hidden=false;$('#wxg').innerHTML=`<svg class="arrow" viewBox="0 0 100 100" fill="none" stroke="#C6EA3D" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 92 C 30 52, 55 32, 84 14"/><path d="M67 11 L85 13 L80 30"/></svg>
  <h3>发给微信好友或群</h3><p class="lead">点右上角 <em>···</em>，选「发送给朋友」或「分享到群聊」</p><button class="btn" data-a="wxclose">知道了</button>`}
function openShare(id){const c=api.get(id);
  openSheet(`<div class="sh-t">分享球局</div><p class="sh-s">发到微信群，更快找到球友</p>${wxPreviewHTML(c)}
  <div class="sgrid"><button data-a="wxShare" data-g="${id}"><span class="si" style="background:#E7F7EC;color:#07C160"><svg><use href="#i-wx"/></svg></span>发到微信群</button>
  <button data-a="sysShare" data-g="${id}"><span class="si"><svg><use href="#i-share"/></svg></span>更多</button>
  <button data-a="poster" data-g="${id}"><span class="si" style="background:#FDECEE;color:#FF2442"><svg><use href="#i-img"/></svg></span>发到小红书</button>
  <button data-a="copyLink" data-g="${id}"><span class="si"><svg><use href="#i-link"/></svg></span>复制链接</button></div>
  <p class="sh-tip">点「发到微信群」→ 选「微信」→「发送给朋友」<br>对方收到的就是上面这张卡片</p>
  <p class="sh-tip sh-note">对方首次点开，微信可能提示「未备案」，点「继续」即可</p>
  <button class="sh-lnk" data-a="copyText" data-g="${id}">只想发文字？复制文案</button>`)}
// 发到小红书（一键）：点一下 = 复制文案 + 弹出系统分享面板（图片已在里面），用户选「小红书」，图片自动带进发布页，只需粘贴文案。
// 海报图在打开时就预先生成（XHSP），点击时直接分享——iOS 要求分享发生在点击之后很短时间内，现生成容易被拒；被拒或不支持就弹大图长按保存
const XHSP={};
function xhsPre(id){const el=document.querySelector('.xhs-pv .ogW');if(!el||!window.html2canvas||XHSP[id])return;
  html2canvas(el,{scale:2,backgroundColor:null}).then(cv=>cv.toBlob(bl=>{if(bl)XHSP[id]=bl},'image/png')).catch(()=>{})}
function xhsGo(id){const text=xhsText(api.get(id));
  try{navigator.clipboard&&navigator.clipboard.writeText(text).catch(()=>{})}catch(e){}
  const nm='nanbanqiu-'+id+'.png',go=bl=>{
    if(!bl){toast('文案已复制，截图保存海报后发布即可');return}
    const f=new File([bl],nm,{type:'image/png'});
    if(navigator.canShare&&navigator.canShare({files:[f]}))navigator.share({files:[f]}).catch(e=>{if(!e||e.name!=='AbortError'){imgSave(bl,nm);toast('文案已复制 · 长按图片保存后发布')}});
    else{imgSave(bl,nm);toast('文案已复制 · 保存图片后打开小红书发布')}};
  if(XHSP[id])go(XHSP[id]);
  else{const el=document.querySelector('.xhs-pv .ogW');
    if(el&&window.html2canvas)html2canvas(el,{scale:2,backgroundColor:null}).then(cv=>cv.toBlob(bl=>{if(bl)XHSP[id]=bl;go(bl)},'image/png')).catch(()=>go(null));else go(null)}}
function openPoster(id){const c=api.get(id);openSheet(`<button class="btn-link" data-a="share" data-g="${id}" style="height:auto;margin-bottom:8px">‹ 返回</button><div class="sh-t">发到小红书</div><p class="sh-s">图片上带二维码，小红书上的球友扫码就能加入</p><div class="xhs-pv">${ogAHTML(c)}</div>
  <button class="btn btn-p xhs-go" data-sx="xhsCopy" data-g="${id}">分享到小红书</button><p class="xhs-tip">文案会自动复制；在弹出的面板里选「小红书」，图片已带上，粘贴文案发布即可</p>`);setTimeout(()=>xhsPre(id),350)}

/* 微信 / 主屏幕 / 推送 */
function openWxGuide(){$('#wxg').hidden=false;$('#wxg').innerHTML=`<svg class="arrow" viewBox="0 0 100 100" fill="none" stroke="#C6EA3D" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 92 C 30 52, 55 32, 84 14"/><path d="M67 11 L85 13 L80 30"/></svg>
  <h3>用 Safari 打开</h3><p class="lead">微信里会弹「未备案」提示，也收不到通知。换到 Safari，<em>不再有提示</em>，有人申请时<em>第一时间</em>通知你</p>
  <div class="ntf"><svg class="ic"><use href="#logo"/></svg><div><b>南伴球<small>现在</small></b><span>Grace 申请加入你周六 9:00 的球局</span></div></div>
  <ol><li><i>1</i><div>点击右上角 <span class="kbd">···</span></div></li><li><i>2</i><div>选择「在 Safari 中打开」<small>Android 选「在浏览器打开」</small></div></li><li><i>3</i><div>点底部的分享 <span class="kbd">⬆︎</span>（看不到就点地址栏的菜单），选「添加到主屏幕」</div></li></ol>
  <button class="btn" data-a="wxclose">知道了</button>`}
// 添加到主屏幕（10-29 重做）：按浏览器给最直白的步骤，每一步配和真实界面一致的图标；没有演示按钮
// iOS Safari：底部工具栏的分享（新版 Safari 工具栏收起时，在地址栏的 ≡ / ⋯ 菜单里）→ 添加到主屏幕 → 添加
// iOS 其他浏览器 / App 内置浏览器：先换到 Safari（复制链接）；安卓 Chrome：能一键就一键（beforeinstallprompt），否则 ⋮ 菜单
let A2HS_EV=null;
function a2hsKind(){const ua=navigator.userAgent||'',ios=/iPhone|iPad|iPod/.test(ua)||(/Mac/.test(ua)&&navigator.maxTouchPoints>1);
  if(/MicroMessenger|xhsdiscover|XiaoHongShu|Instagram|FBAN|FBAV|Line\/|; wv\)/i.test(ua)||(ios&&!/Safari/.test(ua)))return'inapp';
  if(ios)return/CriOS|FxiOS|EdgiOS|OPiOS|GSA\/|DuckDuckGo/.test(ua)?'ios_other':'ios_safari';
  return'android'}
const A2G={
  share:'<svg viewBox="0 0 24 24"><path d="M12 15V3.5M8 7l4-4 4 4M7.5 10H6a1.5 1.5 0 0 0-1.5 1.5v8A1.5 1.5 0 0 0 6 21h12a1.5 1.5 0 0 0 1.5-1.5v-8A1.5 1.5 0 0 0 18 10h-1.5"/></svg>',
  plus:'<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="3.5"/><path d="M12 8.5v7M8.5 12h7"/></svg>',
  menu:'<svg viewBox="0 0 24 24"><path d="M5 7h14M5 12h14M5 17h14"/></svg>',
  dots:'<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><circle cx="5.5" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="18.5" cy="12" r="1.7"/></svg>',
  vdots:'<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><circle cx="12" cy="5.5" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="12" cy="18.5" r="1.7"/></svg>',
  add:'<b class="a2t">添加</b>'};
const a2s=(n,t,sub,g)=>`<div class="a2s"><i>${n}</i><div class="a2b"><b>${t}</b>${sub?`<p>${sub}</p>`:''}</div><span class="a2g">${A2G[g]}</span></div>`;
function a2hsSteps(k){
  if(k==='android')return a2s(1,'点浏览器右上角的「<u>⋮</u>」','','vdots')+a2s(2,'点「添加到主屏幕」','有的手机显示为「安装应用」','plus')+a2s(3,'点「添加」','桌面出现南伴球图标，之后从它打开','add');
  return a2s(1,'点屏幕底部的「分享」','看不到？点地址栏的 <span class="a2i">'+A2G.menu+'</span> 或 <span class="a2i">'+A2G.dots+'</span>，再选「分享」','share')
    +a2s(2,'向上滑，点「添加到主屏幕」','在分享菜单里往上滑一点就能看到','plus')
    +a2s(3,'点右上角「添加」','桌面出现南伴球图标，之后从它打开','add')}
function openA2HS(){const k=a2hsKind(),head=`<div class="center"><img src="/icons/icon-180.png" alt="" class="a2ic"><div class="sh-t">添加到主屏幕</div><p class="sh-s">像 App 一样打开，有人申请时第一时间通知你</p></div>`;
  let top='',main='';
  if(k==='inapp'||k==='ios_other'){
    top=`<div class="a2warn"><b>先用 Safari 打开</b><p>${k==='inapp'?'现在是在 App 里打开的，':'只有 Safari 能把网页添加到 iPhone 主屏幕，'}点下面复制链接，打开 Safari 粘贴到地址栏。</p><button class="btn btn-s" data-a="a2hsLink">复制链接</button></div>`;
    main=`<p class="a2h">然后在 Safari 里：</p><div class="a2steps">${a2hsSteps('ios_safari')}</div>`}
  else if(k==='android'&&A2HS_EV)main=`<button class="btn btn-p" data-a="a2hsGo">添加到主屏幕</button><p class="a2foot">点上面的按钮，再点「安装」/「添加」即可</p>`;
  else main=`<div class="a2steps">${a2hsSteps(k)}</div>`;
  openSheet(head+top+main+`<p class="a2foot">${k==='android'?'添加后从桌面图标打开，再按提示允许通知':'添加后从桌面图标打开，再按提示允许通知（需要 iOS 16.4 或更新）'}</p><button class="btn btn-s" data-a="close" style="margin-top:6px">知道了</button>`)}
function enablePush(){if(ENV==='wechat'){closeSheet();openWxGuide();return}if(ENV==='safari'){openA2HS();return}
  const done=()=>{if(NBQ_NET){const ok='Notification'in window&&Notification.permission==='granted';closeSheet();if(ok)nbqPushSub().then(r=>{toast(r?'通知已开启':'已允许通知，但推送没开成功（'+NBQ_PUSH_WHY+'）');render()});else{toast('没有开启通知，可以在系统设置里打开');render()}return}PUSH.enabled=true;closeSheet();toast('通知已开启');render()};
  if('Notification'in window&&Notification.permission!=='denied'){try{Notification.requestPermission().then(done,done)}catch(e){done()}}else done()}

/* 发起球局 */
let NG={type:'singles',dur:90};
function openCreate(){if(!ME){openAuth(openCreate,'登录后即可发起球局');return}ngInit();drawCreate()}

