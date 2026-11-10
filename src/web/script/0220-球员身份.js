function playerCard(uid,cls=''){const u=U(uid),s=stats(uid),home=(u.home_club_ids||[])[0];const top=bdgTop(s);
  return `<div class="pc th-${u.card_theme||'court'} ${cls}" data-card="${uid}"><svg class="court" viewBox="0 0 300 430" fill="none" stroke="#fff" stroke-width="2"><rect x="40" y="40" width="220" height="350"/><path d="M40 215h220M70 40v350M230 40v350M70 130h160M70 300h160M150 130v170"/></svg><i class="pc-light"></i><i class="pc-grain"></i>
    <div class="pc-top"><div class="pc-rt"><b>${f1(u.ntrp)}</b><span>UTR</span></div><div class="pc-lv"><b>Lv${s.lv+1}</b><span>${LV[s.lv][1]}</span></div></div>
    <div class="pc-av wdc ${u.avatar_kind==='animal'&&sealOf(u).endsWith('-g')?'glass':''}">${stampSVG(s=>avContent(u,s),u.color,128,String(u.id)+(u.animal||'')+u.color+(u.seal_roll||0),u.avatar_kind==='animal'?sealOf(u):'bw-rd',String(u.id)+(u.animal||''))}</div>
    <div class="pc-name">${esc(cardName(u))}</div><div class="pc-club">${home?clubLabelHTML(VEN[home].name):esc(CITY.zh)+' · 南伴球'}</div><div class="pc-rule"></div>
    <div class="pc-stats"><div><b class="num">${s.played}</b><span>场次</span></div><div><b class="num">${s.hosted}</b><span>组织</span></div><div><b class="num">${s.kudos}</b><span>好评</span></div>
      <div><b class="num">${s.streak}</b><span>连续周</span></div><div><b class="num">${s.clubs}</b><span>CLUB</span></div><div><b class="num">${s.played?Math.round(s.att*100)+'%':'—'}</b><span>赴约率</span></div></div>
    <div class="pc-foot"><span class="pc-no">NO. ${fmtNo(u.no)}</span><span class="bdg">${top.map(b=>`<i title="${b.name}">${b.mini}</i>`).join('')}</span></div><div class="pc-qrw"><div class="t"><b>扫码约我打球</b></div><div class="pc-qr"></div></div></div>`}
function profileHTML(){
  if(!ME)return authView({out:()=>`<div class="card" style="padding:20px"><b style="font-size:16px">还没有登录</b><p class="pm" style="margin:4px 0 12px">登录后查看你的球局和球员卡</p><button class="btn btn-p w100" data-a="login">登录 / 注册</button></div><div class="card" style="padding:4px 0">${anPrivHTML('set')}</div>`});
  const s=stats(ME.id),freq={};api.mine().filter(c=>c.past&&(c.mine==='approved'||c.isHost)).forEach(c=>freq[c.venue_id]=(freq[c.venue_id]||0)+1);
  const often=Object.entries(freq).filter(([id])=>!myClubIds().includes(id)).sort((a,b)=>b[1]-a[1]).slice(0,2);
  const pct=s.next?Math.round((s.points-LV[s.lv][0])/(s.next[0]-LV[s.lv][0])*100):100;
  return `<div class="mehd"><b>我的</b><button class="gear" data-a="settings" aria-label="设置"><svg><use href="#i-gear"/></svg></button></div><div class="card mycard" data-a="myCard"><div style="width:212px;height:304px;overflow:hidden"><div style="transform:scale(.7067);transform-origin:top left">${playerCard(ME.id)}</div></div>
    <div class="lvline"><div style="display:flex;justify-content:space-between;align-items:center"><b>${JOURNEY[s.lv].e} Lv${s.lv+1} ${LV[s.lv][1]}</b><button class="lvc-info" data-sx="lvinfo">等级说明 ›</button></div>${journeyPath(s)}<p class="jhint">${s.hint}</p></div></div>
  <div class="card"><div class="ch-h"><span>我的 Club</span><button data-a="editClubs">编辑</button></div>
    ${myClubIds().map(id=>{const v=VEN[id];return `<div class="club"><span class="ci"><svg><use href="#i-court"/></svg></span><span class="v"><b>${esc(v.name)}</b><small>${esc(v.suburb)} · ${surfTxt(v)} · ${km(LOC,v).toFixed(1)} km</small></span><span class="pill p-green">Home</span></div>`}).join('')}
    ${often.map(([id,n])=>{const v=VEN[id];return `<div class="club"><span class="ci" style="background:#F0F2F0;color:var(--mut)"><svg><use href="#i-court"/></svg></span><span class="v"><b>${esc(v.name)}</b><small>最近打过 ${n} 次</small></span><button class="pill p-gray" data-a="addClub" data-v="${id}">+ Home</button></div>`}).join('')}
    ${!myClubIds().length&&!often.length?`<button class="club" data-a="editClubs" style="width:100%;border:0;background:none;font:inherit;text-align:left;cursor:pointer"><span class="ci"><svg><use href="#i-plus"/></svg></span><span class="v"><b>添加我的 Club</b><small>会员 Club 可多选，主 Club 显示在球员卡上</small></span></button>`:''}<div style="height:6px"></div></div>
  ${utSectionHTML('web')}
  ${rkSectionHTML('web')}
  ${partnersHTML()}
  ${nrDev(ME).mobile.push||PUSH.enabled?'':`<div class="card" style="padding:4px 0"><button class="set" data-a="nrSet"><span class="ico" style="background:#E5484D"><svg><use href="#i-bell"/></svg></span><span class="v">通知未开启<small>开启后才能收到约局消息</small></span></button></div>`}`;
}
// 「我的球局」左栏只放摘要；资料、UTR、球拍、球友、设置都在「我的」标签（#134 P1）
function mineSumHTML(){if(!ME)return profileHTML();
  const s=stats(ME.id),t=new Date(),m=api.mine().filter(c=>c.past&&c.status!=='cancelled'&&(c.mine==='approved'||c.isHost)&&new Date(c.start).getFullYear()===t.getFullYear()&&new Date(c.start).getMonth()===t.getMonth()).length;
  return `<div class="card minesum"><b class="ms-n">${esc(cardName(ME))}</b><span class="ms-l">${JOURNEY[s.lv].e} Lv${s.lv+1} ${LV[s.lv][1]}</span><span class="ms-m">本月打了 ${m} 场 · 共 ${s.played} 场</span><button class="btn btn-sm" data-tab="me">编辑资料 ›</button></div>`}
function renderLeft(){$('#colL').innerHTML=UI.tab==='disc'?filtersHTML():UI.tab==='me'?profileHTML():mineSumHTML();bindSub($('#colL'))}
/* ---------- 选区域：一个输入框，输入区名或邮编即时联想；空着时给「最近用过」和「附近有球局的区域」 ----------
 * 第一版只做墨尔本都会区约 70 个常用区（名称 + 邮编 + 中心点，随页面一起下发，不调用任何接口）；
 * 以后扩到全维州 ~3,000 个 locality：数据来自 Vicmap / ABS 的公开边界，压缩后约 60KB，仍然是本地搜索。 */
// 区域数据见下方 MELB（大墨尔本 669 个区）
const SUBX={recent:[],i:0,items:[]};
function subHot(){const up=api.list().filter(c=>!c.past),m={};up.forEach(c=>{let b=null,d=1e9;SUBURBS.forEach(s=>{const x=km(c.v,s);if(x<d){d=x;b=s}});if(b)m[b.name]=(m[b.name]||0)+1});
  return Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([n,c])=>({s:SUBURBS.find(x=>x.name===n),c}))}
function subMatch(q){q=q.trim().toLowerCase();if(!q)return[];const pre=[],mid=[];
  SUBURBS.forEach(s=>{const n=s.name.toLowerCase();if(n.startsWith(q)||String(s.pc||'').startsWith(q))pre.push(s);else if(n.includes(' '+q)||(q.length>=3&&n.includes(q)))mid.push(s)});return [...pre,...mid].slice(0,8)}
const subHL=(n,q)=>{q=q.trim();const i=q?n.toLowerCase().indexOf(q.toLowerCase()):-1;return i<0?esc(n):esc(n.slice(0,i))+'<b>'+esc(n.slice(i,i+q.length))+'</b>'+esc(n.slice(i+q.length))};
// 区域：搜索 + 最近 + 常用 + 按首字母。每一行右边统一是邮编
const SB_AZ2=()=>[...new Set(SUBURBS.map(s=>s.name[0].toUpperCase()))].sort();
function subDD(root){const inp=$('#fSub',root),dd=$('#fSubDD',root);if(!inp||!dd)return;const q=inp.value===LOC.label?'':inp.value;let h='';SUBX.items=[];
  const row=s=>{SUBX.items.push(s);return `<button class="sbx-o${SUBX.items.length-1===SUBX.i?' on':''}" data-subpick="${esc(s.name)}"><span>${sbHL(s.name,q)}</span><em>${s.pc}</em></button>`};
  if(q.trim()){const m=sbSearch(q,8);h=m.length?m.map(row).join(''):`<div class="sbx-no">没有找到「${esc(q.trim())}」，试试邮编</div>`}
  else if(SBS.letter){const list=SUBURBS.filter(s=>s.name[0].toUpperCase()===SBS.letter);h=`<button class="sbx-back" data-sbl="">‹ ${SBS.letter}<span>${list.length} 个区</span></button>`+list.map(row).join('')}
  else{const RL=sbRecentList(),rec=RL.map(n=>SUBURBS.find(s=>s.name===n)).filter(Boolean),hot=sbHot(5+RL.length).map(x=>x.s).filter(s=>!RL.includes(s.name)).slice(0,5);
    if(rec.length)h+=`<div class="sbx-h">最近</div>`+rec.map(row).join('');
    if(hot.length)h+=`<div class="sbx-h">常用</div>`+hot.map(row).join('');
    h+=`<div class="sbx-h">按首字母</div><div class="sbx-az">${SB_AZ2().map(l=>`<button data-sbl="${l}">${l}</button>`).join('')}</div>`}
  dd.innerHTML=h;dd.hidden=!h}
function subPick(name){const s=SUBURBS.find(x=>x.name===name);if(!s)return;sbRemember(name);setLoc(s.lat,s.lng,s.name,'manual')}
function bindSub(root){const inp=$('#fSub',root),dd=$('#fSubDD',root);if(!inp)return;
  inp.onfocus=()=>{SUBX.i=-1;SBS.letter=null;inp.select();subDD(root)};
  inp.oninput=()=>{SUBX.i=0;subDD(root)};
  inp.onblur=()=>setTimeout(()=>{dd.hidden=true;inp.value=LOC.label},120);
  inp.onkeydown=e=>{const n=SUBX.items.length;if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();if(!n)return;SUBX.i=(SUBX.i+(e.key==='ArrowDown'?1:-1)+n)%n;subDD(root)}
    else if(e.key==='Enter'&&!nbqImeEnter(e)){e.preventDefault();const s=SUBX.items[Math.max(0,SUBX.i)];if(s){inp.blur();subPick(s.name)}}else if(e.key==='Escape'){inp.value=LOC.label;inp.blur()}};
  dd.onmousedown=e=>{e.preventDefault();const lt=e.target.closest('[data-sbl]');if(lt){SBS.letter=lt.dataset.sbl||null;subDD(root);dd.scrollTop=0;return}const b=e.target.closest('[data-subpick]');if(b){inp.blur();subPick(b.dataset.subpick)}}}

/* ---------- 中栏：发现 ---------- */
function renderCenter(){UI.tab==='disc'?renderDisc():UI.tab==='me'?($('#colC').innerHTML=''):renderMine()}
function renderDisc(){
  const all=api.list(),d0=dayAt(UI.page),d4=dayAt(UI.page+4),nf=F.levels.size+F.types.size+(F.tags?F.tags.size:0);
  let h=`<div class="ctool"><div><h1>${d0.getMonth()+1}月${d0.getDate()}日 – ${d4.getMonth()===d0.getMonth()?'':d4.getMonth()+1+'月'}${d4.getDate()}日</h1><div class="sub">${esc(LOC.label)+' · '+F.radius+' km 内'}${Object.keys(LIST_HIDDEN).length?` · 球局较多，每天只显示最近的 ${DAY_CAP} 局`:''}</div></div>

    <div class="pgn"><button data-a="prev" title="前几天" ${UI.page?'':'disabled'}>‹</button><button data-a="next" title="后几天" ${UI.page>=2?'disabled':''}>›</button></div><div class="sp"></div><button class="btn btn-o btn-sm fbtn" data-a="filterModal"><svg><use href="#i-filter"/></svg>筛选${nf?' · '+nf:''}</button>
    <div class="seg">${[['agenda','日程','i-cal'],['map','地图','i-map']].map(([k,l,i])=>`<button data-mode="${k}" class="${UI.mode===k?'on':''}"><svg><use href="#${i}"/></svg>${l}</button>`).join('')}</div></div>`;
  if(UI.mode==='agenda'){$('#colC').innerHTML=h+agendaHTML(all);agAutoScroll();if(MAP.lf){MAP.lf.remove();MAP.lf=null}return}
  const md=`<div class="mapdays">${[0,1,2,3,4].map(i=>`<button class="${UI.mapDay===i?'on':''}" data-mapday="${i}">${dayName(UI.page+i)}</button>`).join('')}</div>`;
  if(MAP.lf&&$('#mapEl')){$$('#colC > :not(.mapbox)').forEach(e=>e.remove());$('#colC').insertAdjacentHTML('afterbegin',h);$('#colC .mapdays').outerHTML=md}
  else{if(MAP.lf){MAP.lf.remove();MAP.lf=null}$('#colC').innerHTML=h+`<div class="card mapbox"><div class="mapel" id="mapEl"></div>${md}</div>`}
  renderMap(all);
}
function gcState(c){const r=gcState0(c);if(!c.past&&c.start<=NOW){const j=c.lateOpen&&c.spots>0&&!c.isHost&&!c.mine;r.cls=j?r.cls:(r.cls==='mine'?'mine':'past')+' live';r.tag=j?'已开打 · 可加入':'进行中'}return r}
function gcState0(c){const st=stateOf(c);return {st,cls:st==='host'||st==='approved'?'mine':st==='pending'||st==='held'||st==='invited'?'pending':st==='full'||st==='rejected'?'full':st==='past'?'past':c.spots===1?'hot':'',
  tag:st==='host'?(c.pend.length?`${c.pend.length} 个申请`:'我发起'):st==='approved'?'已加入':st==='held'?'保留中':st==='invited'?'受邀':st==='pending'?'待确认':st==='full'?'已满':st==='rejected'?'没排上':st==='past'?'已结束':`缺 ${c.spots}`}}
function gcHTML(c){const{cls,tag}=gcState(c);
  return `<button class="gc ${cls}${UI.sel===c.id?' sel':''}" data-sel="${c.id}"><div class="gc-r1"><b class="num">${hm(c.start)}</b>${lt(c.start)}<span class="gc-d">${c.duration_min/60} 小时</span></div>
    <div class="gc-v">${esc(c.v.short)}</div><div class="gc-m">${TYPE[c.game_type]} · <i class="gc-u">UTR </i>${lvl(c)}</div>
    <div class="gc-f"><span class="dots">${Array.from({length:c.capacity},(_,k)=>`<i${k<c.appr.length?'':k<c.appr.length+c.hold.length?' class="h"':' class="o"'}></i>`).join('')}</span><span class="tagx">${tag}</span></div></button>`}
function gcRow(c){const{cls,tag}=gcState(c);return `<button class="gc row ${cls}${UI.sel===c.id?' sel':''}" data-sel="${c.id}"><b class="num">${hm(c.start)}</b>${lt(c.start)}<span class="v">${esc(c.v.short)}</span><span class="l">${tag}</span></button>`}
/* 同一格排序：我的 → 待确认 → 可申请（水平越接近、距离越近越靠前） → 已满 / 已结束 */
function rank(c){const{st}=gcState(c);const tier=st==='host'||st==='approved'?0:st==='pending'?1:st==='open'?2:3;const paceMiss=F.tags&&['match','relax'].some(t=>F.tags.has(t))&&!(c.tags||[]).some(t=>F.tags.has(t))?300:0;
  const fit=ME?Math.abs((c.ntrp_min+c.ntrp_max)/2-ME.ntrp):0;return tier*1000+paceMiss+fit*40+c.dist}
function agendaHTML(all){
  const days=[0,1,2,3,4].map(i=>UI.page+i);
  const vis=all;
  const bands=BANDS.filter(b=>vis.some(c=>days.includes(dOff(c.start))&&c.start.getHours()>=b[3]&&c.start.getHours()<b[4]));
  if(!bands.length)return (F.levels.size||F.types.size||(F.tags&&F.tags.size))?`<div class="card none"><p>当前条件下没有球局</p><button class="none-go" data-a="create">发起一局</button><button class="none-alt" data-a="fReset">查看全部球局 ›</button></div>`:`<div class="card none"><p>这几天还没有球局</p><button class="none-go" data-a="create">发起一局</button></div>`;
  let h=`<div class="card ag"><div class="ag-grid"><div class="ag-h"></div>`;
  days.forEach(o=>{const d=dayAt(o),n=all.filter(c=>dOff(c.start)===o&&!c.past).length;
    h+=`<div class="ag-h${o===0?' today':''}"><small>${dayName(o)}${o<2?' · '+WD[d.getDay()]:''}</small><div class="d"><b>${d.getDate()}</b></div></div>`});
  // 第一屏从「此刻」开始：今天第一局还没结束的球局所在的时段；今天没有就取当前时间所在（或之后）的时段
  const g0=days[0]===0?all.filter(c=>dOff(c.start)===0&&c.end>NOW).sort((a,b)=>a.start-b.start)[0]:null,hr0=g0?g0.start.getHours():NOW.getHours();
  const nowBand=days[0]===0?(bands.find(b=>hr0>=b[3]&&hr0<b[4])||bands.find(b=>b[4]>hr0)||bands[bands.length-1]):null;
  bands.forEach(b=>{h+=`<div class="ag-band${b===nowBand?' now':''}">${b[1]}<small>${b[2]}</small></div>`;
    days.forEach(o=>{const items=vis.filter(c=>dOff(c.start)===o&&c.start.getHours()>=b[3]&&c.start.getHours()<b[4]).sort((x,y)=>rank(x)-rank(y));
      const key=o+'-'+b[0],open=UI.exp.has(key);let inner='';
      if(!items.length)inner='<div class="ag-empty">·</div>';
      else{const show=items.slice(0,CELL_MAX),rest=items.slice(CELL_MAX);
        inner=show.sort((x,y)=>x.start-y.start).map(gcHTML).join('');
        if(rest.length)inner+=open?rest.sort((x,y)=>x.start-y.start).map(gcHTML).join('')+`<button class="morebtn" data-exp="${key}">收起</button>`
          :`<button class="morebtn" data-exp="${key}"><span class="stk">${rest.slice(0,4).map(()=>'<i></i>').join('')}</span>另外 ${rest.length} 局<svg width="14" height="14"><use href="#i-down"/></svg></button>`}
      h+=`<div class="ag-cell${o===0?' today':''}">${inner}</div>`})});
  return h+`</div></div><div class="legend"><span><i style="background:#fff;border:1px solid var(--line);box-shadow:inset 3px 0 0 var(--g)"></i>可申请</span><span><i style="background:var(--g)"></i>我的球局</span><span><i style="background:#FFF4D6;border:1px solid #F2DFA6"></i>等待确认</span><span><i style="background:#ECEFEC"></i>已满 / 已结束</span><span style="margin-left:auto">每格最多显示 ${CELL_MAX} 局，按与你的匹配度排序</span></div>`;
}
function renderMap(all){
  const items=all.filter(c=>!c.past&&dOff(c.start)>=UI.page&&dOff(c.start)<UI.page+5&&dOff(c.start)===UI.page+UI.mapDay),el=$('#mapEl');
  const byV={};items.forEach(c=>(byV[c.v.id]=byV[c.v.id]||[]).push(c));
  // 地图标记：颜色只表示状态（白=可申请 · 绿=我的 · 黄=等待确认 · 灰=已满），选中=黑色描边放大；同一球场多局合成一个「球场 · N 局」
  const pst=c=>{const x=stateOf(c);return x==='host'||x==='approved'?'mine':x==='pending'||x==='invited'?'pend':x==='open'?'':'full'};
  const pinHTML=l=>{const c=l[0];if(l.length>1){const st=l.map(pst),k=st.includes('mine')?'mine':st.includes('pend')?'pend':st.every(x=>x==='full')?'full':'';
      return `<div class="pin ${k}${UI.selVenue===c.v.id||l.some(x=>x.id===UI.sel)?' sel':''}" data-vc="${c.v.id}"><i></i>${esc(c.v.short)}<span>${l.length} 局</span></div>`}
    return `<div class="pin ${pst(c)}${c.id===UI.sel?' sel':''}" data-sel="${c.id}"><i></i>${hm(c.start)}<span>${lvl(c)}</span></div>`};
  {const box=el.parentNode;box.querySelectorAll('.mapleg,.mapempty').forEach(x=>x.remove());
    box.insertAdjacentHTML('beforeend','<div class="mapleg"><span><i style="background:#fff;border:1px solid #CFd5CF"></i>可申请</span><span><i style="background:var(--g)"></i>我的</span><span><i style="background:#FFE7A8"></i>等待确认</span><span><i style="background:#D9DED9"></i>已满</span></div>');
    if(!items.length){const nx=[1,2,3,4].map(i=>UI.mapDay+i).find(i=>i<=4&&all.some(c=>!c.past&&dOff(c.start)===UI.page+i));
      box.insertAdjacentHTML('beforeend',`<div class="mapempty">${dayName(UI.page+UI.mapDay)}附近还没有球局${nx!=null?`<br><button class="btn btn-o btn-sm" data-mapday="${nx}">看看${dayName(UI.page+nx)}</button>`:''}</div>`)}}
  if(window.L){
    if(!MAP.lf){MAP.lf=L.map(el,{zoomControl:true}).setView([LOC.lat,LOC.lng],12);MAP.lf.zoomControl.setPosition('bottomright');
      L.tileLayer('https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key=cb1_4wk5_1_309fd2f059d35610107a84a1',{maxZoom:19,attribution:'© OpenStreetMap © CARTO'}).addTo(MAP.lf);MAP.layer=L.layerGroup().addTo(MAP.lf)}
    MAP.layer.clearLayers();L.marker([LOC.lat,LOC.lng],{icon:L.divIcon({className:'pinwrap',html:'<div class="medot"></div>',iconSize:[0,0]}),interactive:false}).addTo(MAP.layer);
    L.circle([LOC.lat,LOC.lng],{radius:F.radius*1000,color:'#176B4D',weight:1,opacity:.4,fillOpacity:.03,dashArray:'4 4'}).addTo(MAP.layer);
    Object.values(byV).forEach(l=>L.marker([l[0].v.lat,l[0].v.lng],{icon:L.divIcon({className:'pinwrap',html:pinHTML(l),iconSize:[0,0]})}).addTo(MAP.layer));
    setTimeout(()=>MAP.lf&&MAP.lf.invalidateSize(),60);
  }else{
    el.classList.add('fmap');const W=el.clientWidth||800,Hh=el.clientHeight||560,pts=[LOC,...items.map(c=>c.v)];
    let la=Math.min(...pts.map(p=>p.lat)),lb=Math.max(...pts.map(p=>p.lat)),na=Math.min(...pts.map(p=>p.lng)),nb=Math.max(...pts.map(p=>p.lng));const pl=(lb-la)*.2+.01,pn=(nb-na)*.15+.01;la-=pl;lb+=pl;na-=pn;nb+=pn;
    const P=p=>({x:(p.lng-na)/(nb-na)*W,y:70+(lb-p.lat)/(lb-la)*(Hh-110)});
    let h=`<svg class="deco" viewBox="0 0 ${W} ${Hh}" preserveAspectRatio="none"><rect width="${W}" height="${Hh}" fill="#EEF1EC"/><path d="M-20 ${Hh*.6} C ${W*.3} ${Hh*.48}, ${W*.55} ${Hh*.72}, ${W+20} ${Hh*.52}" stroke="#CFE0EE" stroke-width="18" fill="none"/><g stroke="#fff" stroke-width="8" fill="none"><path d="M0 ${Hh*.3}L${W} ${Hh*.22}"/><path d="M${W*.35} 0L${W*.42} ${Hh}"/><path d="M${W*.72} 0L${W*.68} ${Hh}"/></g></svg>`;
    const me=P(LOC);h+=`<div class="medot" style="left:${me.x}px;top:${me.y}px"></div>`;
    Object.values(byV).forEach(l=>{const p=P(l[0].v);h+=`<div style="position:absolute;left:${p.x}px;top:${p.y}px">${pinHTML(l)}</div>`});el.innerHTML=h;
  }
}

/* ---------- 中栏：我的球局（按月分组 + 滚动加载） ---------- */
function renderMine(){
  let h=`<div class="ctool"><div><h1>我的球局</h1><div class="sub">${ME?'发起的和申请过的，都在这条时间轴上':authView({wait:'',out:()=>'登录后查看'})}</div></div></div>`;
  if(!ME){$('#colC').innerHTML=authView({wait:h+sbaWaitHTML(),out:()=>h+`<div class="card empty"><b>登录后查看你的球局</b><br><button class="btn btn-p btn-sm" data-a="login">登录 / 注册</button></div>`});return}
  const all=api.mine(),up=all.filter(c=>!c.past&&c.status!=='cancelled').sort((a,b)=>a.start-b.start),past=all.filter(c=>c.past||c.status==='cancelled').sort((a,b)=>b.start-a.start);
  const thisMonth=past.filter(c=>c.start.getMonth()===NOW.getMonth()&&c.start.getFullYear()===NOW.getFullYear()).length;
  h+=`<div class="tstat"><span><b>${up.length}</b>即将开始</span><span><b>${past.length}</b>已结束</span><span><b>${thisMonth}</b>本月</span></div>`;
  h+=ivqHTML();
  const item=c=>{const st=stateOf(c),o=dOff(c.start),cls=c.past||c.status==='cancelled'?'past':st==='pending'?'pending':'';
    return `<div class="ti ${cls}"><div class="ti-date${o===0?' today':''}"><b>${c.start.getDate()}</b><span>${o===0?'今天':o===1?'明天':WD[c.start.getDay()]}</span></div><div class="ti-rail"><i></i></div>
    <button class="ti-card${UI.sel===c.id?' sel':''}" data-sel="${c.id}"><span class="ti-time num">${hm(c.start)}${lt(c.start)}</span><span class="ti-body"><b>${esc(c.v.name)}</b><span>${TYPE[c.game_type]} · ${lvl(c)}</span></span><span class="stack">${stackAv(c)}</span>${pill(c)}</button></div>`};
  if(!all.length){$('#colC').innerHTML=h+`<div class="card empty"><div class="ic"><svg width="28" height="28"><use href="#ball"/></svg></div><b>还没有球局</b>去发现页申请一局，或者自己发起<br><br><button class="btn btn-p btn-sm" data-tab="disc">去发现</button></div>`;return}
  let p='',lastM='';const shown=past.slice(0,UI.pastShown);
  shown.forEach(c=>{const m=c.start.getFullYear()+'年'+(c.start.getMonth()+1)+'月';if(m!==lastM){const n=past.filter(x=>x.start.getFullYear()+'年'+(x.start.getMonth()+1)+'月'===m).length;p+=`<div class="tmon">${m}<span>${n} 场</span></div>`;lastM=m}p+=item(c)});
  h+=`<div class="tl2">${up.length?`<div class="tsec">即将开始</div>${up.map(item).join('')}`:''}<div class="nowmark">现在</div>${p}
    ${past.length>UI.pastShown?`<div class="sentinel" id="sentinel">继续滚动加载更早的球局 · 还有 ${past.length-UI.pastShown} 场</div>`:past.length?`<div class="sentinel" style="border:0">已经到底了 · 共 ${past.length} 场</div>`:''}</div>`;
  $('#colC').innerHTML=h;
  const s=$('#sentinel');if(s&&'IntersectionObserver'in window){const io=new IntersectionObserver(es=>{if(es[0].isIntersecting){io.disconnect();UI.pastShown+=20;renderMine()}},{rootMargin:'300px'});io.observe(s)}
}

/* ---------- 右栏：详情 ---------- */
function passHTML0(c){const st=stateOf(c);
  const BAND={approved:['band-green','i-check',c.spots<=0?'你已加入 · 人齐了':'你已加入'],pending:['band-amber',null,`等待 ${c.host.name} 确认`],
    host:['band-host','i-host',c.pend.length?`你发起的 · ${c.pend.length} 个申请待确认`:c.spots>0?'你发起的球局':'你发起的 · 人齐了'],
    full:['band-gray',null,'已满员 · 这局已经找到球友'],rejected:['band-gray',null,'这局没排上 · 看看附近其他球局吧'],cancelled:['band-red',null,'球局已取消'],past:['band-gray',null,'已结束'],held:['band-amber',null,'为你保留了位置 · 确认一下这周来不来'],invited:['band-amber',null,`${c.host.name} 约你打这局双打`]}[st];
  const people=seatsHTML(c,st);
  return `<div class="pass">${BAND?`<div class="pass-band ${BAND[0]}">${BAND[1]?`<svg><use href="#${BAND[1]}"/></svg>`:''}${esc(BAND[2])}</div>`:''}
    <div class="pass-main"><div class="pass-day">${dateLine(c.start)}</div><div class="pass-time num"><b>${hm(c.start)}</b><span>– ${hm(c.end)}</span>${lt(c.start)}</div>
      <a class="pass-place" href="https://maps.google.com/?q=${encodeURIComponent(c.v.name+' '+c.v.suburb+' VIC')}" target="_blank" rel="noopener"><span class="pi"><svg><use href="#i-pin"/></svg></span><span><b>${esc(c.v.name)}</b><small>${esc(c.v.suburb)} · ${c.dist.toFixed(1)} km</small></span></a>
      <div class="pass-meta"><div><small>玩法</small><b>${TYPE[c.game_type]}</b></div><div><small>水平</small><b>${lvl(c)}</b></div><div><small>场地</small><b>${surfTxt(c.v)}</b></div></div>
      ${gxHTML(c)}${c.note?`<div class="note">${esc(c.note)}</div>`:''}</div>
    ${privHTML(c)}
    <div class="pass-people"><div class="pp-h"><b>球友</b><span>${c.spots>0&&!['cancelled','past'].includes(st)?`还缺 ${c.spots} 位`:`${c.appr.length} 人`}</span></div><div class="people">${people}</div></div></div>`}
function requestsHTML(c){if(!(c.isHost&&c.pend.length&&!['past','cancelled'].includes(stateOf(c))))return'';
  return `<div class="sec-t">申请 · ${c.pend.length}</div>`+c.pend.map(p=>{const u=U(p.user_id),s=stats(u.id);return `<div class="req"><div class="req-top"><button data-user="${u.id}">${av(u)}<div><b>${esc(u.name)}</b> <span class="lvchip" style="background:${LVCOLOR[s.lv]}">Lv${s.lv+1} ${LV[s.lv][1]}</span><div class="pm">UTR ${f1(u.ntrp)} · 已打 ${s.played} 场 · ${s.kudos} 个赞${wTrust(c,u)}${lessHas(ME.id,u.id)?' · <span class="lt">你设过少遇到</span>':''}</div></div></button><span class="pm">${ago(p.created_at)}</span></div>${p.message?`<div class="quote">“${esc(p.message)}”</div>`:''}<div class="acts"><button class="btn btn-p btn-sm" data-a="approve" data-g="${c.id}" data-u="${u.id}">接受</button><button class="btn btn-s btn-sm" data-sx="softNo" data-g="${c.id}" data-u="${u.id}">婉拒</button></div></div>`}).join('')}
function actionsHTML(c){const st=stateOf(c),nav=`https://maps.google.com/?daddr=${encodeURIComponent(c.v.name+' VIC')}`,safe='<div class="safe"><svg width="14" height="14" style="color:var(--g)"><use href="#i-shield"/></svg>见面前，看看<b data-pact="1">球友约定</b>和<b data-a="safety">安全须知</b></div>';
  if(ME&&blockedPair(ME.id,c.host_id))return `<div class="cap">你与发起人之间存在屏蔽关系，无法申请</div>`;
  return {open:`${lateNote(c)}<button class="btn btn-p w100" data-a="apply" data-g="${c.id}">申请加入</button><div class="cap">${ME?`${esc(c.host.name)} 确认后${NOTIFY_WHERE()}`:'无需下载 · 手机号 30 秒完成'}</div>`,
  pending:`<button class="btn btn-o w100" data-a="leave" data-g="${c.id}">撤回申请</button>${safe}`,
  approved:`<div class="row2"><button class="btn btn-o" data-a="ics" data-g="${c.id}"><svg><use href="#i-cal"/></svg>加入日历</button><a class="btn btn-p" href="${nav}" target="_blank" rel="noopener"><svg><use href="#i-dir"/></svg>导航</a></div><button class="btn btn-link red" data-a="leave" data-g="${c.id}">取消参加</button>${safe}`,
  host:`<button class="btn btn-p w100" data-a="share" data-g="${c.id}"><svg><use href="#i-wx"/></svg>分享到微信群</button><div class="hostlinks">${c.start>NOW?`<button class="btn btn-link" data-ge="edit" data-g="${c.id}">修改球局</button><i></i>`:''}<button class="btn btn-link red" data-a="cancelGame" data-g="${c.id}">取消球局</button></div>`,
  full:`<button class="btn btn-p w100" data-a="explore">看看附近其他球局</button><button class="btn btn-link" data-a="create">自己发起一局</button>`,
  rejected:`<button class="btn btn-p w100" data-a="explore">看看附近其他球局</button>`,cancelled:`<button class="btn btn-p w100" data-a="explore">看看附近其他球局</button>`,
  past:(c.mine==='approved'||c.isHost)&&c.appr.length>1?'':''}[st]}
function renderRight(){const R=$('#colR');
  const vg=UI.selVenue&&UI.mode==='map'&&UI.tab==='disc'?VC_GAMES(UI.selVenue):[];if(UI.selVenue&&!vg.length)UI.selVenue=null;
  if(!UI.sel&&UI.selVenue){R.innerHTML=`<div class="dp"><div class="dp-h"><span class="sp"></span><button class="iconbtn" data-a="closeDetail" title="关闭" style="font-size:22px">×</button></div><div class="dp-b vpanel">${venueGamesHTML(UI.selVenue,vg)}</div></div>`;$('#dim').classList.toggle('show',isNarrow());return}
  if(!UI.sel){R.innerHTML='';$('#dim').classList.remove('show');return}
  const c0=api.get(UI.sel);if(ME&&c0&&blockedPair(ME.id,c0.host_id)){R.innerHTML=`<div class="dp"><div class="dp-h"><span class="sp"></span><button class="iconbtn" data-a="closeDetail" title="关闭" style="font-size:22px">×</button></div><div class="dp-b"><div class="empty" style="padding:80px 20px;text-align:center"><b>这个球局暂时无法查看</b><br><br><button class="btn btn-p btn-sm" data-a="explore">看看其他球局</button></div></div></div>`;$('#dim').classList.toggle('show',isNarrow());return}
  const c=api.get(UI.sel),back=UI.selVenue&&c.venue_id===UI.selVenue&&vg.length>1?`<button class="dp-back" data-a="vback">‹ ${esc(c.v.short)} 的 ${vg.length} 局</button>`:'',stx=stateOf(c),a=(ME?chatGameBtn(c,stx):'')+(xActs(c,stx)??actionsHTML(c)??'')+(ME?hostExtras(c,stx):'');
  R.innerHTML=`<div class="dp"><div class="dp-h">${back}<span class="sp"></span><button class="iconbtn" data-a="share" data-g="${c.id}" title="分享"><svg><use href="#i-share"/></svg></button><button class="iconbtn" data-a="closeDetail" title="关闭" style="font-size:22px">×</button></div>
    <div class="dp-b">${womenLock(c)||passHTML(c)+requestsHTML(c)}</div>${a?`<div class="dp-f">${a}</div>`:''}</div>`;
  $('#dim').classList.toggle('show',isNarrow());
}
function select(id){UI.sel=id;{const g0=GAMES.find(g=>g.id===id);if(!g0||g0.venue_id!==UI.selVenue)UI.selVenue=null}if(UI.landing){UI.landing=null;history.replaceState(null,'','#/')}
  const g=GAMES.find(g=>g.id===id);if(g&&UI.tab==='disc'){const o=dOff(new Date(g.starts_at));if(o>=0&&o<7&&(o<UI.page||o>=UI.page+5))UI.page=o<=4?0:2}
  render();if(MAP.lf){const c=api.get(id);MAP.lf.panTo([c.v.lat,c.v.lng])}}
// 设置子页（#134 P2）：设置收进「我的」右上角齿轮
function settingsHTML(){return `<div class="m-b"><h3 class="sh-t">设置</h3>
  <div>
    <button class="set" data-a="nrSet"><span class="ico" style="background:#E5484D"><svg><use href="#i-bell"/></svg></span><span class="v">提醒方式<small>${nrDev(ME).mobile.push?'手机推送已开启':PUSH.enabled?'浏览器通知已开启':'未开启推送'}</small></span></button>
    <button class="set" data-em="settings"><span class="ico" style="background:#3B82F6"><svg><use href="#i-mail"/></svg></span><span class="v">邮件提醒<small>${ME.email?esc(ME.email):'默认不发'}</small></span></button>
    <button class="set" data-sx="gender"><span class="ico" style="background:#C2476B"><svg><use href="#i-user"/></svg></span><span class="v">性别<small>${ME.gender==='f'?'女生':ME.gender==='m'?'男生':'未填写'} · 只用于女生局</small></span></button>
    ${invSetHTML('set')}<button class="set" data-a="blocklist"><span class="ico" style="background:#667085"><svg><use href="#i-ban"/></svg></span><span class="v">屏蔽名单<small>${ME.blocked.size?ME.blocked.size+' 人':'暂无'}</small></span></button>${anPrivHTML('set')}${pvExportHTML('set')}
    <button class="set" data-a="safety"><span class="ico" style="background:var(--g)"><svg><use href="#i-shield"/></svg></span><span class="v">安全须知</span></button>
    <button class="set" data-a="logout"><span class="ico" style="background:#98A2B3"><svg><use href="#i-out"/></svg></span><span class="v">退出登录</span></button></div></div>`}
function openSettings(){if(!ME){toast('请先登录');return}openModal(settingsHTML(),'sm')}
