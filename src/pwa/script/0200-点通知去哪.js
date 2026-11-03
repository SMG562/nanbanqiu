function render(){renderBadge();if(UI.tab==='disc')renderDisc();if(UI.tab==='mine')renderMine();if(UI.tab==='notif')renderNotif();if(UI.tab==='me')renderMe();if(UI.detail)renderDetail();renderPanel()}
function renderBadge(){const n=ME?NOTIFS.filter(x=>x.user_id===ME.id&&!x.read).length+chatUnread():0;$('#nBadge').hidden=!n;$('#nBadge').textContent=n}
const commHTML=()=>'';

/* ---------- 发现 ---------- */
function renderDisc(){
  const lvT=F.levels.size?'UTR '+[...F.levels].sort().map(i=>UB[i][2]).join(' / '):'全部水平';
  $('#chips').innerHTML=`<button class="chip" data-a="loc"><svg><use href="#i-pin"/></svg>${esc(LOC.label)} · ${F.radius} km</button>
    <button class="chip${F.levels.size?' on':''}" data-a="filter">${lvT}</button>
    <button class="chip${F.types.size?' on':''}" data-a="filter">${F.types.size?[...F.types].map(t=>TYPE[t]).join('/'):'全部玩法'}</button>
    <button class="chip${F.tags&&F.tags.has('newbie')?' on':''}" data-sx="ftag" data-v="newbie">🌱 新手友好</button>${(()=>{const o=[['women','女生局'],['match','认真比赛'],['relax','轻松随意']].filter(([k])=>F.tags&&F.tags.has(k));return o.length?`<button class="chip on" data-a="filter">${o.map(x=>x[1]).join('/')}</button>`:''})()}`;
  const all=api.list();let w='';
  for(let o=0;o<7;o++){const d=dayAt(o),n=all.filter(c=>dOff(c.start)===o&&!c.past).length;
    w+=`<button class="wd${o===0?' today':''}${o===UI.day?' on':''}" data-day="${o}"><small>${o===0?'今天':WD[d.getDay()].slice(1)}</small><b>${d.getDate()}</b><i>${n?Array.from({length:Math.min(n,3)},()=>'<span></span>').join(''):'<span class="z"></span>'}</i></button>`}
  $('#week').innerHTML=w;
  const items=all.filter(c=>dOff(c.start)===UI.day);
  $$('#modeSeg button').forEach(b=>b.classList.toggle('on',b.dataset.mode===UI.mode));
  $('#calView').hidden=UI.mode!=='cal';$('#mapView').hidden=UI.mode!=='map';
  UI.mode==='cal'?renderCal(items):renderMap(items);
}
function grState(c){const r=grState0(c);if(!c.past&&c.start<=NOW){r.cls=(r.cls==='mine'?'mine':'past')+' live';r.tag='进行中'}return r}
function grState0(c){const st=stateOf(c);return {st,cls:st==='host'||st==='approved'?'mine':st==='pending'||st==='held'||st==='invited'?'pending':st==='full'||st==='rejected'?'full':st==='past'?'past':c.spots===1?'hot':'',
  tag:st==='host'?(c.pend.length?`${c.pend.length} 个申请`:'我发起'):st==='approved'?'已加入':st==='held'?'保留中':st==='invited'?'受邀':st==='pending'?'待确认':st==='full'?'已满':st==='rejected'?'没排上':st==='past'?'已结束':`缺 ${c.spots}`}}
function grHTML(c,row){const{cls,tag}=grState(c);
  return `<button class="gr ${cls}${row?' row':''}" data-open="${c.id}"><div class="gr-t"><b class="num">${hm(c.start)}</b>${lt(c.start)}${row?'':`<span>${c.duration_min/60} 小时</span>`}</div>
    <div class="gr-m"><b>${esc(c.v.short)}</b>${row?'':`<span>${TYPE[c.game_type]} · UTR ${lvl(c)}</span>`}</div>
    <div class="gr-r">${row?'':`<span class="dots">${Array.from({length:c.capacity},(_,k)=>`<i${k<c.appr.length?'':k<c.appr.length+c.hold.length?' class="h"':' class="o"'}></i>`).join('')}</span>`}<span class="tagx">${tag}</span></div></button>`}
function rank(c){const{st}=grState(c);const tier=st==='host'||st==='approved'?0:st==='pending'?1:st==='open'?2:3;const paceMiss=F.tags&&['match','relax'].some(t=>F.tags.has(t))&&!(c.tags||[]).some(t=>F.tags.has(t))?300:0;const fit=ME?Math.abs((c.ntrp_min+c.ntrp_max)/2-ME.ntrp):0;return tier*1000+paceMiss+fit*40+c.dist}
function renderCal(items){
  const d=dayAt(UI.day),open=items.filter(c=>!c.past).reduce((s,c)=>s+Math.max(0,c.spots),0);
  let h=`<div class="dayhead"><b>${UI.day===0?'今天':UI.day===1?'明天':WD[d.getDay()]} · ${d.getMonth()+1}月${d.getDate()}日</b>${LIST_HIDDEN[UI.day]?`<span>只显示最近的 ${DAY_CAP} 局</span>`:''}</div>`;
  if(!items.length){const all=api.list(),cnt=o=>all.filter(c=>dOff(c.start)===o&&!c.past).length;let nx=null;for(let k=1;k<7&&nx==null;k++)for(const o of [UI.day+k,UI.day-k])if(o>=0&&o<7&&cnt(o)){nx=o;break}
    const nd=nx!=null?dayAt(nx):null,ff=(F.levels.size||F.types.size||(F.tags&&F.tags.size));$('#calView').innerHTML=h+`<div class="none"><p>${ff?'当前条件下，这天没有球局':'这天还没有球局'}</p><button class="none-go" data-a="create">发起一局</button>${nx!=null?`<button class="none-alt" data-day="${nx}">${nx===0?'今天':nx===1?'明天':WD[nd.getDay()]} ${nd.getMonth()+1}/${nd.getDate()} 有 ${cnt(nx)} 局 ›</button>`:ff?`<button class="none-alt" data-a="fReset">查看全部球局 ›</button>`:''}</div>`;return}
  BANDS.forEach(b=>{const list=items.filter(c=>c.start.getHours()>=b[3]&&c.start.getHours()<b[4]);if(!list.length)return;
    const ranked=[...list].sort((x,y)=>rank(x)-rank(y)),show=ranked.slice(0,BAND_MAX).sort((x,y)=>x.start-y.start),rest=ranked.slice(BAND_MAX).sort((x,y)=>x.start-y.start),key=UI.day+'-'+b[0],open=UI.exp.has(key);
    h+=`<div class="band" data-b="${b[0]}">${b[1]}</div><div class="glist">${show.map(c=>grHTML(c)).join('')}`;
    if(rest.length)h+=open?rest.map(c=>grHTML(c)).join('')+`<button class="morebtn" data-exp="${key}">收起</button>`
      :`<button class="morebtn" data-exp="${key}"><span class="stk">${rest.slice(0,4).map(()=>'<i></i>').join('')}</span>另外 ${rest.length} 局<svg><use href="#i-down"/></svg></button>`;
    h+='</div>'});
  $('#calView').innerHTML=h+commHTML();
  if(UI._scrollNow){UI._scrollNow=false;calScrollNow()}
}
const MAP={lf:null,layer:null,mk:{}};
function renderMap(items){
  items=items.filter(c=>!c.past);
  const byV={};items.forEach(c=>(byV[c.v.id]=byV[c.v.id]||[]).push(c));
  const groups=Object.values(byV);
  if(groups.length&&!groups.some(l=>l.some(c=>c.id===UI.sel)))UI.sel=groups[0][0].id;
  const el=$('#mapEl');
  $('#car').innerHTML=items.map(c=>`<div class="mcard" data-sel="${c.id}" data-open="${c.id}"><div class="mc-top"><span class="eyebrow">${relDay(c.start)} ${hm(c.start)}</span>${pill(c)}</div>
    <b class="mc-t">${esc(c.v.short)}</b><div class="mc-s">${TYPE[c.game_type]} · UTR ${lvl(c)}</div>
    <div class="mc-b"><span class="stack">${stackAv(c)}</span><svg class="mc-go"><use href="#i-ch"/></svg></div></div>`).join('')
    ||`<div class="mcard" style="text-align:center;color:var(--mut)">这天附近没有球局 · <b style="color:var(--g)" data-a="create">发起一局</b></div>`;
  // 同一球场多局 → 一个聚合标记
  const pst=c=>{const x=stateOf(c);return x==='host'||x==='approved'?'mine':x==='pending'||x==='invited'?'pend':x==='open'?'':'full'},pk=l=>{const st=l.map(pst);return st.includes('mine')?'mine':st.includes('pend')?'pend':st.every(x=>x==='full')?'full':''};
  const pinHTML=l=>{const sel=l.some(c=>c.id===UI.sel);if(l.length>1)return `<div class="pin ${pk(l)}${sel?' sel':''}" data-pin="${l[0].id}" data-vc="${l[0].v.id}"><i></i>${esc(l[0].v.short)}<span>${l.length} 局</span></div>`;
    const c=l[0];return `<div class="pin ${pk(l)}${sel?' sel':''}" data-pin="${c.id}"><i></i>${hm(c.start)}<span>${lvl(c)}</span></div>`};
  if(window.L){
    if(!MAP.lf){MAP.lf=L.map(el,{zoomControl:false,attributionControl:false}).setView([LOC.lat,LOC.lng],12);
      L.tileLayer('https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key=cb1_4wk5_1_309fd2f059d35610107a84a1',{maxZoom:19,attribution:'© OpenStreetMap © CARTO'}).addTo(MAP.lf);
      L.control.attribution({position:'topleft',prefix:false}).addAttribution('© OpenStreetMap © CARTO').addTo(MAP.lf);MAP.layer=L.layerGroup().addTo(MAP.lf)}
    MAP.layer.clearLayers();MAP.mk={};
    L.marker([LOC.lat,LOC.lng],{icon:L.divIcon({className:'pinwrap',html:'<div class="medot"></div>',iconSize:[0,0]}),interactive:false}).addTo(MAP.layer);
    groups.forEach(l=>{const m=L.marker([l[0].v.lat,l[0].v.lng],{icon:L.divIcon({className:'pinwrap',html:pinHTML(l),iconSize:[0,0]})}).addTo(MAP.layer);l.forEach(c=>MAP.mk[c.id]=m)});
    setTimeout(()=>{MAP.lf.invalidateSize();const s=items.find(c=>c.id===UI.sel);if(s)MAP.lf.panTo([s.v.lat-0.012,s.v.lng])},60);
  }else{
    el.classList.add('fmap');const W=el.clientWidth||390,Hh=el.clientHeight||560,pts=[LOC,...items.map(c=>c.v)];
    let la=Math.min(...pts.map(p=>p.lat)),lb=Math.max(...pts.map(p=>p.lat)),na=Math.min(...pts.map(p=>p.lng)),nb=Math.max(...pts.map(p=>p.lng));const pl=(lb-la)*.25+.01,pn=(nb-na)*.2+.01;la-=pl;lb+=pl;na-=pn;nb+=pn;
    const P=p=>({x:(p.lng-na)/(nb-na)*W,y:60+(lb-p.lat)/(lb-la)*(Hh-290)});
    let h=`<svg class="deco" viewBox="0 0 ${W} ${Hh}" preserveAspectRatio="none"><rect width="${W}" height="${Hh}" fill="#EEF1EC"/><path d="M-20 ${Hh*.62} C ${W*.3} ${Hh*.5}, ${W*.5} ${Hh*.72}, ${W+20} ${Hh*.55}" stroke="#CFE0EE" stroke-width="16" fill="none"/><g stroke="#fff" stroke-width="7" fill="none"><path d="M0 ${Hh*.3}L${W} ${Hh*.22}"/><path d="M${W*.35} 0L${W*.45} ${Hh}"/><path d="M${W*.75} 0L${W*.7} ${Hh}"/></g><g fill="#DCEBD6"><rect x="${W*.08}" y="${Hh*.36}" width="${W*.2}" height="${Hh*.1}" rx="10"/><rect x="${W*.55}" y="${Hh*.08}" width="${W*.14}" height="${Hh*.1}" rx="10"/></g></svg>`;
    const me=P(LOC);h+=`<div class="medot" style="left:${me.x}px;top:${me.y}px"></div>`;
    groups.forEach(l=>{const p=P(l[0].v);h+=`<div style="position:absolute;left:${p.x}px;top:${p.y}px;z-index:${l.some(c=>c.id===UI.sel)?9:1}">${pinHTML(l)}</div>`});el.innerHTML=h;
  }
  const car=$('#car');car.onscroll=()=>{clearTimeout(car._t);car._t=setTimeout(()=>{const mid=car.scrollLeft+car.clientWidth/2;let best=null,bd=1e9;$$('.mcard',car).forEach(x=>{const d=Math.abs(x.offsetLeft+x.clientWidth/2-mid);if(d<bd){bd=d;best=x}});if(best&&best.dataset.sel&&best.dataset.sel!==UI.sel)selectGame(best.dataset.sel,false)},120)};
}
function selectGame(id,scroll){UI.sel=id;const c=api.get(id);
  $$('.pin').forEach(p=>{const pc=api.get(p.dataset.pin);p.classList.toggle('sel',pc.venue_id===c.venue_id)});
  if(MAP.lf)MAP.lf.panTo([c.v.lat-0.012,c.v.lng]);
  if(scroll){const el=$(`.mcard[data-sel="${id}"]`);el&&el.scrollIntoView({behavior:'smooth',inline:'center',block:'nearest'})}}

/* ---------- 我的球局：按月分组 + 滚动加载 ---------- */
function renderMine(){
  const b=$('#mineBody');
  if(!ME){b.innerHTML=authView({out:()=>loginCTA('登录后查看你的球局')});return}
  const all=api.mine(),up=all.filter(c=>!c.past&&c.status!=='cancelled').sort((a,b)=>a.start-b.start),past=all.filter(c=>c.past||c.status==='cancelled').sort((a,b)=>b.start-a.start);
  if(!all.length){b.innerHTML=ivqHTML()+`<div class="empty"><div class="ic"><svg width="28" height="28"><use href="#ball"/></svg></div><b>还没有球局</b>去发现页申请一局，或者自己发起<br><br><button class="sbtn p" style="flex:none" data-tab="disc">去发现</button></div>`+commHTML();return}
  const thisMonth=past.filter(c=>c.start.getMonth()===NOW.getMonth()&&c.start.getFullYear()===NOW.getFullYear()).length;
  const item=c=>{const st=stateOf(c),o=dOff(c.start),cls=c.past||c.status==='cancelled'?'past':st==='pending'?'pending':'';
    return `<div class="ti ${cls}"><div class="ti-date${o===0?' today':''}"><b>${c.start.getDate()}</b><span>${o===0?'今天':o===1?'明天':WD[c.start.getDay()]}</span></div><div class="ti-rail"><i></i></div>
    <button class="ti-card" data-open="${c.id}"><div class="ti-r1"><b class="num">${hm(c.start)}</b>${lt(c.start)}${pill(c)}</div><div class="ti-r2">${esc(c.v.name)}</div>
    <div class="ti-r3"><span>${TYPE[c.game_type]} · ${lvl(c)}</span><span class="stack">${stackAv(c)}</span></div></button></div>`};
  let p='',lastM='';past.slice(0,UI.pastShown).forEach(c=>{const m=c.start.getFullYear()+'年'+(c.start.getMonth()+1)+'月';if(m!==lastM){p+=`<div class="tmon">${m}<span>${past.filter(x=>x.start.getFullYear()+'年'+(x.start.getMonth()+1)+'月'===m).length} 场</span></div>`;lastM=m}p+=item(c)});
  b.innerHTML=`<div class="tstat"><span><b>${up.length}</b>即将开始</span><span><b>${past.length}</b>已结束</span><span><b>${thisMonth}</b>本月</span></div>`+ivqHTML()
    +(up.length?`<div class="tsec">即将开始</div>${up.map(item).join('')}`:'')+`<div class="nowmark">现在</div>`+p
    +(past.length>UI.pastShown?`<div class="sentinel" id="sentinel">继续上滑加载更早的球局 · 还有 ${past.length-UI.pastShown} 场</div>`:past.length?`<div class="sentinel" style="border:0">已经到底了 · 共 ${past.length} 场</div>`:'')+commHTML();
  const s=$('#sentinel');if(s&&'IntersectionObserver'in window){const io=new IntersectionObserver(es=>{if(es[0].isIntersecting){io.disconnect();UI.pastShown+=20;renderMine()}},{root:$('#scr-mine'),rootMargin:'300px'});io.observe(s)}
}
const loginCTA=t=>`<div class="empty"><svg class="lg-solo" width="56" height="56"><use href="#logo"/></svg><b>${t}</b>手机号验证码登录，30 秒完成<br><br><button class="sbtn p" style="flex:none" data-a="login">登录 / 注册</button></div>`;

/* ---------- 通知 ---------- */
function pushCardHTML(){if(PUSH.enabled)return'';
  // 先让人看到「会收到什么」（App 图标上的红点），再告诉 TA 一步怎么做
  const t=ENV==='wechat'?['换到浏览器，才收得到提醒','微信里收不到申请和通过的通知','怎么换','i-share']:ENV==='safari'?['有人申请，马上知道','放到主屏幕，像 App 一样收提醒','放到主屏幕','i-plus']:['有人申请，马上知道','申请、通过、开打前都会提醒你','开启提醒','i-bell'];
  return `<div class="pushcard"><span class="pc-ic"><svg viewBox="0 0 100 100"><use href="#logo"/></svg><i>1</i></span><div><b>${t[0]}</b><p>${t[1]}</p></div><button class="pc-go" data-a="enablePush"><svg><use href="#${t[3]}"/></svg>${t[2]}</button></div>`}
function renderNotif(){
  if(!ME){$('#notifBody').innerHTML=authView({out:()=>`<div class="pad">${loginCTA('登录后接收通知')}</div>`});return}
  UI.msgTab=UI.msgTab||(chatUnread()?'chat':'ntf');const cu=chatUnread(),nu=nrBadgeN();
  const seg=`<div class="pad" style="padding-bottom:4px"><div class="seg2"><button data-cx2="chat" class="${UI.msgTab==='chat'?'on':''}">聊天${cu?`<i>${cu}</i>`:''}</button><button data-cx2="ntf" class="${UI.msgTab==='ntf'?'on':''}">通知${nu?`<i>${nu}</i>`:''}</button></div></div>`;
  if(UI.msgTab==='chat'){$('#notifBody').innerHTML=seg+`<div class="pad">${inboxHTML()}</div>`;return}
  const list=nrList();
  $('#notifBody').innerHTML=seg+pushCardHTML()+(list.length?`<div class="pad"><div class="group">${list.map(n=>{const[t,b]=ntfText(n),f=U(n.from)||{name:'?',color:'#999'},p=n.kind==='request'?PARTS.find(p=>p.game_id===n.game_id&&p.user_id===n.from&&p.status!=='withdrawn'&&p.status!=='left'):null;
    const acts=p&&p.status==='pending'?`<div class="acts"><button class="sbtn p" data-a="approve" data-g="${n.game_id}" data-u="${n.from}">接受</button><button class="sbtn" data-sx="softNo" data-g="${n.game_id}" data-u="${n.from}">婉拒</button></div>`:p?`<div class="acts"><span class="pill ${p.status==='approved'?'p-green':'p-gray'}">${p.status==='approved'?'已接受':p.reason==='timeout'?'已失效':p.reason==='full_auto'?'已满员':'已婉拒'}</span></div>`:'';
    return `<div class="ntf${n.read?'':' unread'}" ${n.invite_id&&n.kind!=='invite_accepted'?`data-iv="view" data-i="${n.invite_id}"`:`data-ntfo="${n.id}"`}>${nrAv(n,f)||`<span data-user="${f.id}">${av(f)}</span>`}<div class="nb"><b>${esc(t)}</b><p>${esc(b)}</p>${p&&p.message&&p.status==='pending'?`<q>“${esc(p.message)}”</q>`:''}${acts}</div><span class="tm">${ago(n.at)}</span></div>`}).join('')}</div></div>`
    :`<div class="empty"><b>暂无通知</b>申请结果、新的申请都会出现在这里</div>`);
  setTimeout(()=>{list.forEach(n=>{if(!nrTodo(n))n.read=true});renderBadge()},1500);
}

/* ---------- 我的：球员卡 + Club + 设置 ---------- */
