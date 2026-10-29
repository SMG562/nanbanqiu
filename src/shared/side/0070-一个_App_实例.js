/* ===== 一个 App 实例：手机或电脑 ===== */
function App(el,init){
  const S=Object.assign({near:true,place:0,qi:0,photo:false,court:null,view:null,open:null,k:1},init||{});
  S.L=seed();S.A=ALBUM();S.rid=0;S.bl=new Set();S.T=JSON.parse(JSON.stringify(TOPICS));
  S.at=(init&&init.at)||null;S.loc=S.at||'';S.homes=(init&&init.home!==undefined)?(init.home?init.home.split(','):[]):['Kooyong','Glen Iris'];S.home=S.homes[0]||null;
  const desk=!!S.desk;el.classList.toggle('desk',desk);el.classList.toggle('embed',!!S.embed);const AE=()=>{const r=el.getRootNode();return r.activeElement||document.activeElement};
  el.innerHTML=`${desk||S.embed?'':`<div class="island"></div><div class="sbar"><span>${hm(Date.now())}</span><svg width="68" height="12" viewBox="0 0 68 12" fill="currentColor"><rect x="0" y="7" width="3" height="5" rx="1"/><rect x="5" y="5" width="3" height="7" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="1" width="3" height="11" rx="1"/><rect x="42" y="1" width="22" height="11" rx="3.2" fill="none" stroke="currentColor" stroke-opacity=".4"/><rect x="44" y="3" width="16" height="7" rx="1.6"/><rect x="65" y="4.5" width="2" height="4" rx="1" fill-opacity=".4"/></svg></div>`}
    <div class="view home"><div class="hd"><div><h3>场边<sup class="h24">24h</sup></h3><div class="sub"><span class="dot"></span><span data-cnt></span></div></div><span class="sp"></span><button class="mine-t" data-mine><i></i>只看我的球场</button>${S.bell?`<button class="bell" data-bell aria-label="消息">${ic('i-bell')}<b data-bn hidden></b></button>`:''}</div>
      <div class="scroll" data-sc="home"><div data-s="home"></div></div><button class="more" data-more></button>${desk?'<aside class="rail"></aside>':''}<div class="remind"></div><div class="undo"></div>
      <div class="bar"><div class="qtp" data-qtp></div><div class="box"><span class="hint" data-hint></span><span data-att></span><input data-in maxlength="${CFG.settings.post_max_len}"><button class="where" data-place></button><button class="cam" data-cam>${ic('cam')}</button><button class="send" data-send disabled>${ic('up')}</button><div class="lp" data-lp></div></div>
      ${desk?'':S.embed?'<div class="tabsp"></div>':`<div class="tabs"><span>${ic('i-compass')}发现</span><span>${ic('i-cal')}球局</span><span class="on">${ic('i-side')}场边</span><span data-me>${ic('i-user')}我的</span></div>`}</div></div>
    <div class="view court"></div><div class="view wall"></div><div class="view album"></div><div class="scrim" data-shut></div><div class="sheet"></div>
    <div class="cscrim"></div><div class="compose"></div><div class="share"></div><div class="viewer"></div><div class="acts"><div class="g"><button data-act="hide">不看这条</button><button class="warn" data-act="report">举报</button></div><div class="g g2"><button data-act="cancel">取消</button></div></div><div class="toast"></div>`;
  const $=s=>el.querySelector(s),inp=$('[data-in]'),sendB=$('[data-send]'),hint=$('[data-hint]'),list=$('[data-s="home"]'),sc=$('[data-sc="home"]');
  const toast=m=>{const t=$('.toast');t.textContent=m;t.classList.add('show');clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove('show'),1600)};
  // 写操作（F1b）：宿主页面的 gate 负责「没登录先登录、账号状态不允许的拦下」，通过后再做；登录后接着做（草稿还在）
  const need=(k,fn)=>S.gate?S.gate(k,fn):fn(),again=t=>{S.gok=1;try{t.click()}finally{S.gok=0}};
  const say=c=>toast(S.err?S.err(c):c);   // 错误码 → 给用户看的话（接口文档 §1）
  const find=id=>S.L.find(y=>String(y.id)===String(id))||S.A.find(y=>String(y.id)===String(id));
  const pass=x=>Date.now()-x.t<24*H&&!x.ed;
  // 113 条 · 每条只公开 24 小时
  const setCnt=()=>{const n=S.L.filter(pass).length+96,old=S._n,c=$('[data-cnt]');
    if(old==null||!c.querySelector('.n'))c.innerHTML=`<span class="n"><b>${n}</b></span> 条 · 每条只公开 24 小时`;
    else if(n!==old){const o=c.querySelector('.n'),up=n>old;o.innerHTML=`<span class="roll"><b>${up?old:n}</b><b>${up?n:old}</b></span>`;
      o.firstChild.animate(up?[{transform:'translateY(0)'},{transform:'translateY(-50%)'}]:[{transform:'translateY(-50%)'},{transform:'translateY(0)'}],{duration:560,easing:'cubic-bezier(.3,1.3,.5,1)',fill:'forwards'}).onfinish=()=>{o.innerHTML=`<b>${n}</b>`}}
    S._n=n};
  S.lc={};S.lu={};S.lf=false;
  const LH=(x,o={})=>lineHTML(x,Object.assign({my:S.homes},o));
  const mycHTML=()=>S.homes.length?`<div class="myc"><span class="lb">我的球场</span><button data-myc="" class="${!S.filt?'on':''}">全部</button>${S.homes.map(h=>{const n=S.L.filter(x=>x.w===h&&!x.area&&Date.now()-x.t<3*H).length;return `<button data-myc="${h}" class="${S.filt===h?'on':''}">${esc(COURTS[h].n)}${n?`<b>${n}</b>`:''}</button>`}).join('')}</div>`:'';
  const rank=x=>(S.homes.includes(x.w)&&!x.area?1.6:1)*score(x)*(S.lc[catOf(x)]?.3:1)*(S.lu[U(x).n]?.3:1)*(S.lf&&(x.km||0)>2.5?.35:1);
  // 一条流，最多一个筛选：只看我的球场 / 某个球场 / 某个话题
  const fOk=x=>S.mineOnly&&S.homes.length?(S.homes.includes(x.w)&&!x.area):!S.f?true:S.f.k==='court'?(x.w===S.f.v&&!x.area):x.topic===S.f.v;
  const fbarHTML=n=>{if(!S.f)return '';const tp=S.f.k==='topic',lab=tp?'#'+esc(S.T[S.f.v].t):esc(COURTS[S.f.v].n);
    return `<div class="fbar"><button class="fchip" data-fx>${lab}${ic('x')}</button><span>今天 ${n} 条</span>${tp?`<button class="fsh" data-tshare title="分享这个话题">${ic('share')}</button><span class="vw"><button data-vw="list" class="${S.vw!=='grid'?'on':''}" title="列表">${ic('i-list')}</button><button data-vw="grid" class="${S.vw==='grid'?'on':''}" title="照片墙">${ic('i-grid')}</button></span>`:''}</div>${tp?`<p class="fq">${esc(S.T[S.f.v].q)}</p>`:''}`};
  const gridHTML=L=>`<div class="it itg"><div class="wg">${L.map(x=>`<div class="wt${x.pic?'':' tx2'}" data-ln="${x.id}"${x.pic?` style="aspect-ratio:${PM[x.pic]?'4/5':'1/1'}"`:''}>${x.pic?PIC(x.pic,'hero',x.tone):`<p>${esc(x.x)}</p>`}<span class="fl">${x.floor?'No.'+x.floor:''}</span></div>`).join('')}</div></div>`;
  // 手机：信息流里的引导
  const DAYN=()=>{const Cn={},Tn={};S.L.forEach(x=>{if(!pass(x))return;if(x.w&&!x.area&&COURTS[x.w])Cn[x.w]=(Cn[x.w]||0)+1;if(x.topic)Tn[x.topic]=(Tn[x.topic]||0)+1});return {Cn,Tn}};
  const hotHTML=()=>{const top=Object.entries(DAYN().Cn).sort((a,b)=>b[1]-a[1]).slice(0,6);if(top.length<2)return '';
    return `<div class="it itm"><div class="mh3"><span class="dot"></span>此刻热闹的球场</div><div class="hs3">${top.map(([k,n])=>`<button class="hc2" data-court="${k}"><b>${S.homes.includes(k)?'<i class="mdot"></i>':''}${esc(COURTS[k].n)}</b><small>今天 ${n} 条</small></button>`).join('')}</div></div>`};
  const talkHTML=()=>{const t=Object.entries(DAYN().Tn).sort((a,b)=>b[1]-a[1]);if(!t.length)return '';
    return `<div class="it itm"><div class="mh3">大家在聊</div><div class="hs3">${t.map(([k,n])=>`<button class="ht3" data-topic="${k}"><b>#${esc(S.T[k].t)}</b><small>今天 ${n} 条</small></button>`).join('')}</div></div>`};
  const drawHome=()=>{setCnt();const mine=!!(S.mineOnly&&S.homes.length),fil=mine||!!S.f;
    const L=S.L.filter(x=>pass(x)&&fOk(x)).sort((a,b)=>fil?b.t-a.t:rank(b)-rank(a)),grid=S.f&&S.f.k==='topic'&&S.vw==='grid',rows=grid?[gridHTML(L)]:L.map(x=>LH(x));
    if(!fil&&!desk){rows.splice(2,0,`<div class="it itc">${topicCard()}</div>`);if(rows.length>8)rows.splice(7,0,hotHTML());if(rows.length>14)rows.splice(13,0,talkHTML())}
    if(fil&&!rows.length)rows.push(`<div class="empty">${mine?'你的球场今天还很安静':'这里今天还很安静'}</div>`);
    list.innerHTML=fbarHTML(L.length)+rows.join('');
    const mt=$('[data-mine]');if(mt){mt.classList.toggle('on',mine);mt.style.display=S.homes.length?'':'none'}
    if(desk)drawRail()};
  const swap=(after,keep)=>{el.querySelectorAll('.xfade').forEach(n=>n.remove());const c=sc.cloneNode(true),top=sc.scrollTop;c.classList.add('xfade');c.removeAttribute('data-sc');c.querySelectorAll('.typing,.fxb,.fxsh,.ring,.bsh,.xfade').forEach(n=>n.remove());
    c.style.top=sc.offsetTop+'px';c.style.height=sc.offsetHeight+'px';sc.after(c);c.scrollTop=top;
    drawHome();if(!keep)sc.scrollTop=0;
    list.querySelectorAll(':scope>.it,:scope>.empty').forEach(e=>e.animate([{opacity:0,transform:'translateY(5px)'},{opacity:1,transform:'none'}],{duration:240,delay:40,easing:'cubic-bezier(.2,.8,.3,1)',fill:'backwards'}));
    c.animate([{opacity:1},{opacity:0}],{duration:170,easing:'cubic-bezier(.3,0,.6,1)',fill:'forwards'}).onfinish=()=>c.remove();if(after)after()};
  const setF=f=>{const pf=S.f;S.f=f;if(f&&(!pf||pf.k!==f.k||pf.v!==f.v)){if(f.k==='topic')track('sb_topic_view',{topic:S.T[f.v]&&S.T[f.v].user?'user':f.v});else if(f.k==='court')track('sb_court_view',{venue:f.v,via:'filter'})}S.vw=f&&f.k==='topic'?'grid':'list';if(S.rehint)S.rehint();setLoc(f&&f.k==='court'?f.v:(S.at||''));if(f)S.mineOnly=false;S.open=null;S.court=null;S.wall=null;state();if(desk)drawRail();const mt=$('[data-mine]');if(mt)mt.classList.toggle('on',!!(S.mineOnly&&S.homes.length));
    swap(()=>{const fb=list.querySelector('.fbar');if(!fb||!f)return;
      if(!pf)fb.animate([{opacity:0,transform:'scale(.96)'},{opacity:1,transform:'none'}],{duration:260,delay:60,easing:'cubic-bezier(.2,.8,.3,1)',fill:'backwards'});
      else{const ch=fb.querySelector('.fchip');if(ch)ch.animate([{opacity:.35},{opacity:1}],{duration:200,easing:'ease-out'})}})};
  // 电脑：右边一列「此刻」
  const drawRail=()=>{const r=$('.rail');if(!r)return;const since=Date.now()-24*H,Cn={},Tn={};
    S.L.forEach(x=>{if(x.w&&!x.area&&x.t>since&&COURTS[x.w])Cn[x.w]=(Cn[x.w]||0)+1;if(x.topic&&pass(x))Tn[x.topic]=(Tn[x.topic]||0)+1});
    const top=Object.entries(Cn).sort((a,b)=>b[1]-a[1]).slice(0,5),mx=top.length?top[0][1]:1,tags=Object.entries(Tn).filter(([k])=>k!==TODAY).sort((a,b)=>b[1]-a[1]);
    const on=(k,v)=>S.f&&S.f.k===k&&S.f.v===v?' on':'';
    r.innerHTML=`<div class="rs1">${topicCard()}</div>
      <div class="rh2">此刻热闹的球场<small>今天</small></div>${top.map(([k,n])=>`<button class="rc${on('court',k)}" data-court="${k}"><span class="rn2">${S.homes.includes(k)?'<i class="mdot"></i>':''}${esc(COURTS[k].n)}</span><span class="rb2"><i style="width:${(n/mx*100).toFixed(0)}%"></i></span><b>${n}</b></button>`).join('')}
      ${tags.length?`<div class="rh2">大家在聊<small>今天</small></div>${tags.map(([k,n])=>`<button class="rt2${on('topic',k)}" data-topic="${k}"><span>#${esc(S.T[k].t)}</span><b>${n}</b></button>`).join('')}`:''}
      <p class="rf">点一个球场或话题，左边只看它；再点一次回到全部。</p>`};
  const prep=h=>{const ref=list.querySelector(':scope>.it,:scope>.slot'),t=document.createElement('div');t.innerHTML=h;const n=t.firstElementChild;ref?list.insertBefore(n,ref):list.append(n);return n.querySelector('.ln')};
  // 球场：只回答「这条和哪块场有关」
  const locGroups=()=>{const seen=new Set(),G=[];const take=(ks,g,l,n)=>{let a=ks.filter(k=>k&&COURTS[k]&&!seen.has(k));if(n)a=a.slice(0,n);a.forEach(k=>seen.add(k));if(a.length)G.push({g,l,a})};
    take([S.at],'here','你在这里');take(S.homes||[],'mine','我的球场');take(Object.keys(KM).sort((a,b)=>KM[a]-KM[b]),'near','附近',3);return G};
  const locSub=(k,g)=>g==='here'?'你在这里':fkm(KM[k]);
  const lpHTML=()=>`<div class="lp-h">这条和哪块场有关？</div>${locGroups().map(G=>`<div class="lp-l">${G.l}</div>${G.a.map(k=>`<button class="lq${G.g==='here'?' here':''}${S.loc===k?' on':''}" data-lq="${esc(k)}"><span class="dt"></span><b>${esc(COURTS[k].n)}</b><small>${G.g==='here'?'':fkm(KM[k])}</small>${ic('check','ck')}</button>`).join('')}`).join('')}
    <button class="lq no${!S.loc?' on':''}" data-lq="none" style="margin-top:6px"><span class="dt"></span><b>不选</b><small>和球场无关</small>${ic('check','ck')}</button>
    <p class="lp-f">选了球场，这条也会出现在那块场的动态里。只显示球场名字，不显示你在哪。</p>`;
  const openLp=()=>{const lp=$('[data-lp]');if(!lp)return;lp.innerHTML=lpHTML();S.lpOn=true;lp.classList.add('on');$('[data-place]').classList.add('open')};
  const closeLp=()=>{const lp=$('[data-lp]');S.lpOn=false;if(lp)lp.classList.remove('on');const pl=$('[data-place]');if(pl)pl.classList.remove('open')};
  const locTxt=k=>k?k.toUpperCase():'球场';
  const setLoc=k=>{if(k===S.loc)return;const pl=$('[data-place]');S.loc=k;if(S.rehint)S.rehint();if(!pl)return;
    const old=pl.querySelector('.plv');if(!old){drawComposer();return}
    const w0=pl.offsetWidth,pr=pl.getBoundingClientRect(),r0=old.getBoundingClientRect();
    pl.querySelectorAll('.plv-out').forEach(n=>n.remove());
    old.className='plv-out';old.style.cssText=`position:absolute;left:${(r0.left-pr.left).toFixed(1)}px;top:${(r0.top-pr.top).toFixed(1)}px;white-space:nowrap`;
    const ns=document.createElement('span');ns.className='plv';ns.textContent=locTxt(k);pl.append(ns);pl.classList.toggle('set',!!k);
    const w1=pl.offsetWidth;
    pl.animate([{width:w0+'px'},{width:w1+'px'}],{duration:300,easing:'cubic-bezier(.2,.8,.3,1)'});
    old.animate([{opacity:1,transform:'none'},{opacity:0,transform:'translateY(-6px)'}],{duration:170,easing:'ease-in',fill:'forwards'}).onfinish=()=>old.remove();
    ns.animate([{opacity:0,transform:'translateY(6px)'},{opacity:1,transform:'none'}],{duration:240,delay:50,easing:'cubic-bezier(.2,.8,.3,1)',fill:'backwards'})};
  const drawComposer=()=>{const k=S.loc;
    const pl=$('[data-place]');if(!pl.querySelector('.plv')){pl.innerHTML=`${ic('pin')}<span class="plv"></span>`}const pv=pl.querySelector('.plv');if(pv.textContent!==locTxt(k))pv.textContent=locTxt(k);pl.classList.toggle('set',!!k);
    $('[data-cam]').classList.toggle('on',S.photo);
    $('[data-att]').innerHTML=S.photo?`<span class="att">${PIC('sunset','band')}</span>`:'';
    hint.style.display=inp.value?'none':'block';
    sendB.disabled=!(inp.value.trim()||S.photo)};
  const courtRows=()=>S.L.filter(x=>x.w===S.court&&!x.area&&Date.now()-x.t<3*H).sort((a,b)=>b.t-a.t);
  const drawCourt=()=>{const c=COURTS[S.court];if(!c)return;const L=courtRows(),v=$('.court');
    const mine=S.homes&&S.homes.includes(S.court);
    v.innerHTML=`<div class="cnav"><button class="ib" data-back>${ic('back')}</button></div>${desk?`<div class="dnav"><button class="backto" data-back>${ic('back')}<span>关闭</span></button></div>`:''}
      <div class="scroll" style="padding-top:0"><div class="ch"><div class="k">${mine?'我的球场 · '+esc(c.area.split(' · ').pop()):esc(c.area)}</div><h3>${esc(c.n)}</h3></div>
      
      <div class="mod"><div class="mh"><span class="dot"></span><b>刚刚发生</b><small data-ccnt>近 3 小时 · ${L.length} 条</small></div>
        <div data-s="court">${L.map(x=>LH(x,{court:1})).join('')||'<div class="empty">近 3 小时还没有动态</div>'}</div></div>
      </div>
      <div class="bar"><div class="box"><span class="hint" style="right:60px">在 ${esc(S.court)} 发一条…</span><input maxlength="${CFG.settings.post_max_len}" data-cin><button class="send" data-csend disabled>${ic('up')}</button></div></div>`;
    const ci=v.querySelector('[data-cin]'),cs=v.querySelector('[data-csend]'),ch=v.querySelector('.hint');
    ci.oninput=()=>{cs.disabled=!ci.value.trim();ch.style.display=ci.value?'none':'block'};ci.onkeydown=e=>{if(e.key==='Enter'&&!cs.disabled)cs.click()}};
  const drawSheet=()=>{const x=find(S.open);if(!x)return;const L=life(x.t),a=ago(x.t),ps=x.pics||[];
    $('.sheet').innerHTML=`<div class="grab"></div>
      <div class="sh-top">${av(U(x),34)}<div class="who">${unb(U(x)).replace('class="un"','')}<small>${x.w?(x.area?`<span class="pl ar">${esc(x.w)} 附近</span>`:`<span class="pl" data-court="${esc(x.w)}">${esc(x.w)}</span>`)+'<i>·</i>':''}${lifeRing(x.t)}<span>${a}</span></small></div><span class="sp"></span>${x.mine&&x.pic?`<button class="ib2" data-share title="分享图片">${ic('share')}</button>`:''}<button class="ib2" data-menu>${ic('dots')}</button><button class="ib2 shx" data-shut>${ic('x')}</button></div>
      <div class="sh-sc">${ps.length?`<div class="hero${PM[ps[0]]?' pt':''}"><div class="hs">${ps.map(p=>`<div class="hp" data-pic="${x.id}">${PIC(p,'hero',x.tone)}</div>`).join('')}</div>${ps.length>1?`<div class="hd2">${ps.map((_,i)=>`<i${i?'':' class="on"'}></i>`).join('')}</div>`:''}</div>`:''}
        <div class="sh-t">${esc(x.x)}</div>${x.topic?`<div class="floorbar"><button class="fb1" data-topic="${x.topic}"><b>#${esc(S.T[x.topic].t)}</b><span>No.${x.floor}</span>${ic('chev','')}</button><button class="fb2" data-jie="${x.topic}">${ic('cam')}我也发一张</button></div>`:''}
        
        <div class="life">${x.mine?`<div class="seen">${ic('eye')}<b data-views>0</b> 人看过<span>仅你可见</span></div>`:'<span></span>'}${ballBtn(x,true)}</div>
        <div class="rh" data-rh>${x.closed?'回复已关闭':x.r.length?x.r.length+' 条回复':'还没有回复'}</div>
        ${x.mine&&x.pend&&x.pend.length?`<div class="scr"><div class="scr-h">${ic('lock')}<b>${x.pend.length} 条回复等你确认</b><span>来自第一次和你说话的人，只有你看得到</span></div>${x.pend.map((r,i)=>{const u=uOf('s'+r.x);return `<div class="scr-r">${av(u,28)}<div><b>${esc(u.n)}</b><p>${esc(r.x)}</p></div><button data-scok="${i}">显示</button><button data-scno="${i}">忽略</button></div>`}).join('')}</div>`:''}<div class="rs">${x.r.map(r=>replyHTML(r,x)).join('')}</div></div>
      ${x.closed?'':`<div class="bar"><div class="box"><span class="hint" style="right:60px">回复…</span><input maxlength="${CFG.settings.post_max_len}" data-rin><button class="send" data-rsend disabled>${ic('up')}</button></div></div>`}`;
    const hs=$('.sheet .hs');if(hs)hs.onscroll=()=>{const k=Math.round(hs.scrollLeft/hs.clientWidth);el.querySelectorAll('.sheet .hd2 i').forEach((d,i)=>d.classList.toggle('on',i===k))};
    if(x.mine){const v=$('[data-views]'),t0=performance.now();const f=t=>{const p=Math.min(1,(t-t0)/1100),e=1-Math.pow(1-p,3);v.textContent=Math.round(x.views*e);if(p<1)requestAnimationFrame(f)};setTimeout(()=>requestAnimationFrame(f),350)}
    const ri=$('[data-rin]'),rb=$('[data-rsend]'),rh=$('.sheet .hint');
    if(ri){S.rto=null;ri.oninput=()=>{rb.disabled=!ri.value.trim();rh.style.display=ri.value?'none':'block'};ri.onkeydown=e=>{if(e.key==='Enter'&&!rb.disabled)rb.click()};
      ri.onblur=()=>setTimeout(()=>{if(S.rto&&!ri.value&&AE()!==ri)clearRto()},220)}};
  const rtoHint=v=>{const h=$('.sheet .hint');if(!h)return;h.textContent=v;h.animate([{opacity:0,transform:'translateY(4px)'},{opacity:1,transform:'none'}],{duration:220,easing:'ease-out'})};
  const setRto=(n,row)=>{S.rto=n;el.querySelectorAll('.sheet .rr.tgt').forEach(r=>r.classList.remove('tgt'));row.classList.add('tgt');rtoHint(`回复 ${n}…`);const ri=$('[data-rin]');if(ri)ri.focus({preventScroll:true})};
  const clearRto=()=>{if(!S.rto)return;S.rto=null;el.querySelectorAll('.sheet .rr.tgt').forEach(r=>r.classList.remove('tgt'));rtoHint('回复…')};
  const drawViewer=()=>{const x=find(S.view);if(!x)return;
    $('.viewer').innerHTML=`<button class="x" data-close>${ic('x')}</button><div class="img"><div>${PIC(x.pic,'full',x.tone)}</div></div>
      <div class="cap"><div class="t"><span class="tx">${esc(x.x)}</span></div><div class="m">${x.w?`<span class="pl">${esc(x.w)}</span><i>·</i>`:''}${String(x.id)[0]==='a'?`<span>${new Date(x.t).getMonth()+1}.${new Date(x.t).getDate()} · 仅自己可见</span>`:`<span>${ago(x.t)}</span><span class="sp"></span>${ballBtn(x)}`}</div></div>`};
  const state=()=>{el.classList.toggle('incourt',!!S.court);el.classList.toggle('sheeting',!!S.open);el.classList.toggle('viewing',!!S.view);el.classList.toggle('composing',!!S.cmp);el.classList.toggle('sharing',!!S.share);el.classList.toggle('inwall',!!S.wall);el.classList.toggle('inalbum',!!S.album)};
  // 发图页：预览就是它在场边里的样子
  // 地点：发布时定位一次，从球场库里找附近的球场
  const scFills=(k,C)=>{const c=C.loc||'';if(c&&(k==='court'||k==='lost'))return (CFG.starters[k]||[]).map(s=>s.split('{球场}').join(c));return k==='court'?[`${c?c+' ':'这边'}现在有空场，`,c?`${c} 风好大，`:'今天风好大，',`刚下过雨，${c?c+' 的':''}场地`]:k==='lost'?[c?`在 ${c} 捡到一个`:'在球场捡到一个',c?`有没有人在 ${c} 看到一个`:'有没有人在球场看到一个']:[]};
  const sugTopics=C=>[...new Set([PSUG[C.pics[0]],TODAY,...SLOTT[slotNow()]].filter(Boolean))].slice(0,3);
  const stHTML=C=>{const hide=C.text?' style="display:none"':'',F=C.topic?S.T[C.topic].fills:C.sc?scFills(C.sc,C):[];
    if(F.length)return `<div class="sts"${hide}>${F.map(f=>`<button class="st" data-fill="${esc(f)}">${esc(f)}<i>…</i></button>`).join('')}</div>`;
    if(C.topic)return '';
    return `<div class="sts"${hide}><div class="tsg">${sugTopics(C).map(id=>`<button data-tp="${id}"><b>#${esc(S.T[id].t)}</b><span>${esc(S.T[id].ask)}</span></button>`).join('')}<button class="more" data-ctp>看看别的话题${ic('chev','cv')}</button></div></div>`};
  const pickHTML=C=>{const row=(k,g)=>`<button class="pi${g==='here'?' here':''}${C.loc===k?' on':''}" data-loc="${esc(k)}"><span class="pin2">${ic('pin')}</span><div><b>${esc(COURTS[k].n)}</b><small>${g==='here'?'你在这里':(g==='mine'?'我的球场 · ':'')+fkm(KM[k])}</small></div>${ic('check')}</button>`;
    return `<div class="pk-h"><span style="width:28px"></span><b>这条和哪块场有关？</b><button data-pkx>完成</button></div><div class="pk-s">${ic('search')}<span>搜索球场</span></div>
      <div class="pk-b">${locGroups().map(G=>`<div class="pk-l">${G.l}</div><div class="pk-g">${G.a.map(k=>row(k,G.g)).join('')}</div>`).join('')}
      <div class="pk-g" style="margin-top:18px"><button class="pi${!C.loc?' on':''}" data-loc="none"><span class="pin2">${ic('nopin')}</span><div><b>不选</b><small>这条和球场无关</small></div>${ic('check')}</button></div>
      <p class="pk-f">选了球场，这条也会出现在那块场的动态里。<br>只显示球场名字，不显示你在哪，也不记录行踪。</p></div>`};
  const TONES=[['','原片'],['warm','暖阳'],['film','胶片'],['dawn','清晨']];
  const shHTML=k=>{const C=S.cmp,pic=C.pics[0];
    if(k==='topic')return `<p class="csh-t">选个话题</p><label class="tq"><span>#</span><input data-tq maxlength="${CFG.settings.name_max}" placeholder="搜一个，没有就新建"></label><div class="tl">${tRows('')}</div>`;
    return `<p class="csh-t">发布设置</p><div class="op" data-tg="later"><div><b>2 小时后再公开</b><p>打完球再让大家看到</p></div><span class="tg${C.later?' on':''}"></span></div><div class="op" data-tg="replyOn"><div><b>允许回复</b></div><span class="tg${C.replyOn?' on':''}"></span></div>`};
  const GEN=CFG.generic;   // 太宽的词：后台配置
  const SIM=SB_ALIAS();   // 相似词：后台配置
  const tRows=q=>{const C=S.cmp,pic=C.pics[0],ids=Object.keys(S.T),lq=q.toLowerCase(),sim=Object.keys(SIM).filter(w=>lq.includes(w)).map(w=>SIM[w]),m=id=>!q||S.T[id].t.toLowerCase().includes(lq)||sim.includes(id),used=new Set(),G=[];
    const add=(l,a)=>{a=a.filter(id=>m(id)&&!used.has(id));a.forEach(id=>used.add(id));if(a.length)G.push([l,a])};
    add('今日推荐',[TODAY]);if(PSUG[pic])add('和你的照片很配',[PSUG[pic]]);add('常驻',ids.filter(id=>!S.T[id].user));add('大家发起的',ids.filter(id=>S.T[id].user).sort((a,b)=>S.T[b].n-S.T[a].n));
    const sub=id=>{const T=S.T[id];return id===TODAY?'今日推荐 · 已有 '+T.n+' 张':T.mine?'你刚发起的':T.user?`由 ${esc(T.by)} 发起 · ${T.n} 人发过`:T.n+' 条'};
    let h=G.map(([l,a])=>`<div class="pk-l">${l}</div>${a.map(id=>`<button class="pi${C.topic===id?' on':''}" data-tp="${id}"><span class="pin2">#</span><div><b>${esc(S.T[id].t)}</b><small>${S.T[id].ask?esc(S.T[id].ask)+' · ':''}${sub(id)}</small></div>${ic('check')}</button>`).join('')}`).join('');
    const exact=ids.some(id=>S.T[id].t.toLowerCase()===lq)||!!(SIM[lq]&&S.T[SIM[lq]]);
    if(q&&!exact){const nw=sbGeneric(lq)?`<div class="tnew no"><b>#${esc(q)}</b> 太宽了，换个具体的？比如 #反手终于开窍了</div>`:[...q].length<2?'':`<button class="pi tnew" data-tnew="${esc(q)}"><span class="pin2">+</span><div><b>新建 #${esc(q)}</b><small>发出后，别人也能用这个话题</small></div></button>`;
      h=sbGeneric(lq)?nw+(G.length?`<div class="pk-l">试试这些</div>`+h.replace(/<div class="pk-l">[^<]*<\/div>/g,''):''):(G.length?`<div class="pk-l">已有相似的</div>`+h.replace(/<div class="pk-l">[^<]*<\/div>/g,''):'')+nw}
    return h+(q?'':`<button class="pi${!C.topic?' on':''}" data-tp="" style="margin-top:8px"><span class="pin2">–</span><div><b>不加话题</b></div>${ic('check')}</button>`)};
  const openSh=k=>{S.cmp.sh=k;$('.csh-p').innerHTML=shHTML(k);requestAnimationFrame(()=>$('.csh').classList.add('on'))};
  const closeSh=()=>{const was=S.cmp.sh;S.cmp.sh=null;$('.csh').classList.remove('on');setTimeout(()=>{drawCompose();if(was==='topic')topicIn()},380)};
  const topicIn=()=>{const h=$('.compose .ctop'),st=$('.compose .sts');if(h)h.animate([{opacity:0,transform:'translateY(-4px)'},{opacity:1,transform:'none'}],{duration:260,easing:'cubic-bezier(.2,.8,.3,1)'});
    if(st)[...st.children].forEach((n,i)=>n.animate([{opacity:0,transform:'translateY(5px)'},{opacity:1,transform:'none'}],{duration:260,delay:60+i*45,easing:'cubic-bezier(.2,.8,.3,1)',fill:'backwards'}))};
  const drawCompose=()=>{const C=S.cmp,pic=C.pics[0],plab=C.loc&&COURTS[C.loc]?COURTS[C.loc].n:'',ph=C.topic?(S.T[C.topic].ask||`说说 #${S.T[C.topic].t}`):(C.ph&&C.sc?C.ph:C.sc==='lost'?'捡到东西了？':'场边有什么新鲜事？'),old=$('.cmp-sc'),top=old?old.scrollTop:0;
    $('.compose').innerHTML=`<div class="cmp-top"><button data-cx>取消</button><span></span><button class="go" data-cgo>${C.later?'稍后公开':'发布'}</button></div>
      <div class="cmp-sc">
        <button class="ctop${C.topic?' on':''}" data-ctp><em>#</em><b>${C.topic?esc(S.T[C.topic].t):'加个话题'}</b>${ic('chev','cv')}</button>
        <textarea data-ctext maxlength="${CFG.settings.post_max_len}" rows="2" placeholder="${esc(ph)}">${esc(C.text)}</textarea>
        ${stHTML(C)}
        <div class="phs">${C.pics.map(q=>`<div class="ph1${PM[q]?' pt':''}">${PIC(q,'hero',C.tone)}<button class="phx" data-pk="${q}">${ic('x')}</button></div>`).join('')}${C.pics.length<3?`<button class="phadd" data-lib>${ic('plus')}</button>`:''}</div>
        ${C.lib?`<div class="lib">${['outfit','shoes','gear','shadow','sunset'].map(q=>{const i=C.pics.indexOf(q);return `<button class="pkb${i>=0?' on':''}" data-pk="${q}">${C.libReady?PIC(q,'band'):''}<i>${i>=0?i+1:''}</i></button>`}).join('')}</div>`:''}
        ${pic?`<div class="tones2">${TONES.map(t=>`<button class="${C.tone===t[0]?'on':''}" data-tone="${t[0]||'none'}">${t[1]}</button>`).join('')}</div>`:''}
      </div>
      <p class="cnote">${C.later?'2 小时后公开':'公开 24 小时'}${C.replyOn?'':' · 不允许回复'}，之后存进你的相册</p>
      <div class="ctool"><button class="chip${plab?' set':''}" data-cpl>${ic('pin')}<span>${esc(plab||'球场')}</span></button><span class="sp"></span><button class="chip ico${C.later||!C.replyOn?' set':''}" data-cset title="发布设置">${ic('sliders')}</button></div>
      <div class="pick${C.pick?' on':''}">${pickHTML(C)}</div>
      <div class="csh${C.sh?' on':''}"><div class="csh-b" data-cshx></div><div class="csh-p">${C.sh?shHTML(C.sh):''}</div></div>`;
    $('.cmp-sc').scrollTop=top;
    const ct=$('[data-ctext]'),fl=$('.compose .sts');ct.oninput=()=>{C.text=ct.value;if(fl)fl.style.display=C.text?'none':''}};
  const openCompose=o=>{clearTimeout(S.libT);S.cmp=Object.assign({pics:[],tone:'',text:'',loc:S.loc,ph:'',sc:null,sig:false,later:false,reply:'all',topic:null,keep:false,anon:false,replyOn:true,pick:false,lib:false,libReady:false,sh:null},o);
    // 先把整页排好（在屏幕外），下一帧再滑上来：滑动时只动一整张卡片，没有任何东西在里面陆续出现
    drawCompose();void $('.compose').offsetHeight;requestAnimationFrame(()=>requestAnimationFrame(state));
    // 照片最重，等卡片到位后再放进已经留好的格子里
    if(S.cmp.lib)S.libT=setTimeout(libFill,440)};
  const libFill=()=>{const C=S.cmp;if(!C||C.libReady)return;C.libReady=true;el.querySelectorAll('.compose .pkb').forEach(b=>{const q=b.dataset.pk;b.insertAdjacentHTML('afterbegin',PIC(q,'band'));const v=b.firstElementChild;if(v)v.animate([{opacity:0},{opacity:1}],{duration:180,easing:'ease-out'})})};
  // 带走一张图：9:16
  const dt=t=>{const d=new Date(t);return `${d.getMonth()+1}.${String(d.getDate()).padStart(2,'0')}  ${hm(t)}`};
  const MK=`<svg viewBox="0 0 100 100"><use href="#ballR"/></svg>场边<sup class="h24">24h</sup>`;
  const card0=(x,T)=>T==='photo'
    ?`<div class="fill">${PIC(x.pic,'full',x.tone)}</div><div class="scg"></div><div class="mk">${MK}<span>${esc(CITY.en.toUpperCase())}</span></div><div class="scb"><div class="s1">${esc(x.x)}</div><div class="s2">${x.w?esc(x.w)+'  ·  ':''}${dt(x.t)}</div>${U(x).anon?'':`<div class="s3">${esc(U(x).n)}</div>`}</div>`
    :`<div class="mk">${MK}<span>${esc(CITY.en.toUpperCase())}</span></div><div class="ph2">${PIC(x.pic,'full',x.tone)}</div><div class="s1">${esc(x.x)}</div><div class="s2">${x.w?esc(x.w)+'  ·  ':''}${dt(x.t)}</div><div class="ft"><span>${U(x).anon?'':esc(U(x).n)}</span><span>nanbanqiu.app</span></div>`;
  const floorCard=x=>{const T=S.T[x.topic];return `<div class="mk">${MK}<span>${esc(CITY.en.toUpperCase())}</span></div><div class="flh"><b>#${esc(T.t)}</b><span>NO.<em>${x.floor}</em></span></div><div class="ph2">${PIC(x.pic,'hero',x.tone)}</div><div class="s1">${esc(x.x)}</div><div class="ft2"><span>${x.w?esc(x.w).toUpperCase()+' · ':''}${dt(x.t).split('  ')[0]}</span><span>你也来一张 →</span></div>`};
  const card=(x,T)=>T==='floor'?floorCard(x):card0(x,T);
  const wallCard=id=>{const T=S.T[id],P=S.L.filter(x=>x.topic===id&&x.pic).sort((a,b)=>b.floor-a.floor).slice(0,9);
    return `<div class="mk">${MK}<span>${esc(CITY.en.toUpperCase())}</span></div><div class="wtt"><b>#${esc(T.t)}</b><small>${T.daily?CITY.zh+'的'+WD[melNow().dow]:CITY.zh} · ${T.n} 张</small></div><div class="wgr">${P.map(x=>`<i>${PIC(x.pic,'hero',x.tone)}<em>${x.floor}</em></i>`).join('')}</div><div class="ft"><span>nanbanqiu.app</span><span>你也来一张 →</span></div>`};
  const drawShare=()=>{const T=S.share,isW=T==='wall',x=isW?null:find(S.open);if(!isW&&!x)return;
    const tpls=isW?[]:x.topic?[['floor','编号'],['photo','照片'],['paper','留白'],['night','夜']]:[['photo','照片'],['paper','留白'],['night','夜']];
    $('.share').innerHTML=`<div class="sh2-top"><button class="ib3" data-sx>${ic('x')}</button><b>${isW?'分享这个话题':'分享图片'}</b><span style="width:34px"></span></div>
      <div class="stage2"><div class="sc t-${T}">${isW?wallCard(S.shTopic||S.wall):card(x,T)}</div></div>
      ${tpls.length?`<div class="tpls">${tpls.map(t=>`<button data-tpl="${t[0]}" class="${T===t[0]?'on':''}">${t[1]}</button>`).join('')}</div>`:''}
      <div class="outs"><button data-sv="存到相册了">${ic('down')}<span>存到相册</span></button><button data-sv="打开 Instagram 快拍…">${ic('story')}<span>Instagram 快拍</span></button><button data-sv="打开小红书…">${ic('book')}<span>小红书</span></button></div>
      <p class="snote">${isW?'图上只有照片和编号，没有名字。':'只能分享自己发的，图上不含回复。'}</p>`};
  // 留给自己
  const keepRow=x=>`<div class="keep" data-keep="${x.id}"><div><b>${x.keep?'会留下来':'到期就消失'}</b><p>${x.keep?'24 小时后收进「我的」，只有你看得到':'想留下来？打开就好，只有你看得到'}</p></div><span class="tg${x.keep?' on':''}"></span></div>`;
  const drawAlbum=()=>{const pend=S.L.filter(x=>x.mine&&Date.now()-x.t<24*H),MO={};S.A.forEach(x=>{const m=new Date(x.t).getMonth()+1;(MO[m]=MO[m]||[]).push(x)});
    $('.album').innerHTML=`<div class="cnav"><button class="ib" data-aback>${ic('back')}</button></div>
      <div class="scroll" style="padding-top:0"><div class="ah"><div class="k">${ic('lock')}仅自己可见</div><h3>我的相册</h3><p>你发的每一条，公开 24 小时后自动存到这里。</p></div>
      ${pend.length?`<div class="pend">${pend[0].pic?`<span class="th">${PIC(pend[0].pic,'hero',pend[0].tone)}</span>`:''}<div>公开中 <b>${pend.length} 条</b>，${life(pend[0].t).txt.replace('还剩 ','')}后存到这里</div></div>`:''}
      ${Object.keys(MO).sort((a,b)=>b-a).map(m=>`<div class="mon">${['','一','二','三','四','五','六','七','八','九','十','十一','十二'][m]}月</div><div class="ag">${MO[m].map(x=>x.pic?`<div class="at" data-pic="${x.id}">${PIC(x.pic,'hero',x.tone)}<em>${new Date(x.t).getMonth()+1}.${new Date(x.t).getDate()}</em></div>`:`<div class="at tx3"><p>${esc(x.x)}</p><em>${new Date(x.t).getMonth()+1}.${new Date(x.t).getDate()}</em></div>`).join('')}</div>`).join('')}</div>`};
  const showRemind=id=>{const x=find(id);if(!x)return;const r=$('.remind'),mins=Math.max(1,Math.round((24*H-(Date.now()-x.t))/M));
    r.innerHTML=`${x.pic?`<span class="th">${PIC(x.pic,'hero',x.tone)}</span>`:''}<div><p>「${esc(x.x.length>12?x.x.slice(0,12)+'…':x.x)}」还剩 <b>${mins} 分钟</b>，刚刚又有 3 个人点了网球。</p><div class="bt"><button class="k1" data-keep1="${x.id}">留下来</button><button data-letgo>让它走</button></div></div>`;
    r.classList.add('show')};
  let undoT;
  const showUndo=msg=>{const u=$('.undo'),D=S.undoHold?6e5:8000;u.innerHTML=`<span>${msg}</span><button data-undo>撤回</button><i></i>`;u.classList.add('show');
    u.querySelector('i').animate([{transform:'scaleX(1)'},{transform:'scaleX(0)'}],{duration:D,easing:'linear',fill:'forwards'});clearTimeout(undoT);undoT=setTimeout(()=>u.classList.remove('show'),D)};
  const collapse=row=>{const n=row.closest('.slot')||row.closest('.it')||row,h=n.offsetHeight;n.style.overflow='hidden';
    n.animate([{height:h+'px',opacity:1},{height:'0px',opacity:0,marginTop:'0px',marginBottom:'0px'}],{duration:440,easing:'cubic-bezier(.4,0,.2,1)'}).onfinish=()=>n.remove()};
  // 话题卡：叠起来的三张 + 楼数
  const topicCard=()=>{const T=S.T[TODAY],th=S.L.filter(x=>x.topic===TODAY&&x.pic).sort((a,b)=>b.floor-a.floor).slice(0,3).reverse();
    return `<div class="tpc" data-topic="${TODAY}"><div><span class="k">${T.k}</span><span class="tt">#${esc(T.t)}</span><small>已有 <span class="n"><b>${T.n}</b></span> 张 · 我也发一张</small></div><div class="stk">${th.map(x=>`<i>${PIC(x.pic,'band',x.tone)}</i>`).join('')}</div></div>`};
  const refreshTopic=x=>{const old=list.querySelector('.tpc');
    if(old&&x.topic===TODAY){const n=S.T[TODAY].n,tmp=document.createElement('div');tmp.innerHTML=topicCard();const nc=tmp.firstElementChild;
      const o=nc.querySelector('.n');o.innerHTML=`<span class="roll"><b>${n-1}</b><b>${n}</b></span>`;old.replaceWith(nc);
      o.firstChild.animate([{transform:'translateY(0)'},{transform:'translateY(-50%)'}],{duration:560,delay:900,easing:'cubic-bezier(.3,1.3,.5,1)',fill:'forwards'}).onfinish=()=>{o.innerHTML=`<b>${n}</b>`};
      const nt=nc.querySelector('.stk i:last-child');if(nt&&x.pic)nt.animate([{transform:'translateY(-30px) rotate(20deg) scale(.6)',opacity:0},{transform:'rotate(8deg)',opacity:1}],{duration:700,delay:700,easing:'cubic-bezier(.3,1.4,.5,1)',fill:'backwards'})}
    if(S.wall===x.topic){drawWall();const t=$(`.wall [data-ln="${x.id}"]`);if(t)t.classList.add('nw')}};
  // 话题墙：一栋楼
  const drawWall=()=>{const T=S.T[S.wall];if(!T)return;const P=S.L.filter(x=>x.topic===S.wall&&Date.now()-x.t<24*H).sort((a,b)=>b.floor-a.floor),v=$('.wall'),old=v.querySelector('.scroll'),top=old?old.scrollTop:0;
    v.innerHTML=`<div class="cnav"><button class="ib" data-wback>${ic('back')}</button><button class="ib" data-wshare title="分享这个话题">${ic('share')}</button></div>
      <div class="scroll" style="padding-top:0"><div class="wh"><div class="k">${T.k}</div><h3>#${esc(T.t)}</h3><p>${esc(T.q)}</p><div class="ws"><span class="dot"></span><b>${T.n}</b> 张 · 最新在前</div></div>
      <div class="wg">${P.map(x=>`<div class="wt${x.ed?' ed tx2':x.pic?'':' tx2'}"${x.ed?'':` data-ln="${x.id}"`}${x.pic?` style="aspect-ratio:${PM[x.pic]?'4/5':'1/1'}"`:''}>${x.pic?PIC(x.pic,'hero',x.tone):`<p>${esc(x.x)}</p>`}<span class="fl">${x.ed?'No.1 · 场边出题':'No.'+x.floor}</span></div>`).join('')}</div></div>
      <button class="wfab" data-wgo>${ic('cam')}我也发一张</button>`;
    v.querySelector('.scroll').scrollTop=top};
  const render=()=>{drawHome();drawComposer();if(S.court)drawCourt();if(S.open)drawSheet();if(S.view)drawViewer();if(S.wall)drawWall();if(S.album)drawAlbum();if(S.cmp)drawCompose();if(S.share)drawShare();state()};

  // 滚动状态：手指在屏幕上，或 250ms 内还在滚（惯性）
  const busy=()=>S.touch||Date.now()-(S.sct||0)<250;
  // 把攒着的新动态放进列表（只在回到顶部、停稳之后；最新一条带出现动画，其余直接放）
  const flushNew=()=>{S.pend&&S.pend.length&&(()=>{const q=S.pend;S.pend=null;S.qn=0;q.forEach((x,i)=>{if(pass(x)&&fOk(x)){const r=prep(LH(x));if(i===q.length-1)birth(r,{k:S.k,typing:true})}})})();
    $('[data-more]').classList.remove('show');if(S.pdraw){S.pdraw=0;drawHome()}};
  const settle=()=>{clearTimeout(S.ft);S.ft=setTimeout(()=>{if(!busy()&&sc.scrollTop<=80&&(S.pend||S.pdraw))flushNew();else if(busy())settle()},280)};
  // 新的一句
  const insertPost0=(x,mine)=>{S.L.unshift(x);setCnt();
    if(desk)setTimeout(drawRail,50);
    if(S.f&&S.f.k==='topic'&&S.vw==='grid'){if(fOk(x)){if(!mine&&busy())S.pdraw=1;else setTimeout(drawHome,30)}}
    else if(pass(x)&&fOk(x)){
      // 别人的新动态：正在读（滚动位置 > 80）或手指还在屏幕上 / 惯性滚动中 → 先攒着、只亮「↑ N 条新动态」，不碰页面；回到顶部且停稳后再一起放进来。
      // （旧做法是插进去再用 scrollTop 硬补偿，一次跳几百像素，iOS 上会打断惯性滚动 = 卡顿）
      if(!mine&&(sc.scrollTop>80||busy())){(S.pend=S.pend||[]).push(x);S.qn=S.pend.length;const m=$('[data-more]');m.textContent=`↑ ${S.qn} 条新动态`;m.classList.add('show')}
      else birth(prep(LH(x)),{k:S.k,typing:!mine})}
    if(S.court&&S.court===x.w&&!x.area){const cl=$('[data-s="court"]');if(cl){cl.querySelector('.empty')?.remove();cl.insertAdjacentHTML('afterbegin',LH(x,{court:1}));birth(cl.firstElementChild.querySelector('.ln'),{k:S.k,typing:!mine});$('[data-ccnt]').textContent=`近 3 小时 · ${courtRows().length} 条`}}};
  // 新的回应
  const insertPost=(x,mine)=>{if(mine)S.lastMine=x;if(x.topic&&!x.floor)x.floor=++S.T[x.topic].n;insertPost0(x,mine);if(x.topic)refreshTopic(x)};
  const addReply=(id,text,f={})=>{const x=find(id);if(!x)return;const r={x:text,t:Date.now(),id:++S.rid,...f};x.r.push(r);
    if(!f.me){const k=x.mine?'sb_reply':f.to===ME_U.n?'sb_reply_to':null;if(k)ntf({kind:k,post:x,reply:r,actor:RU(r,x)})}
    el.querySelectorAll(`[data-s] [data-ln="${x.id}"]`).forEach(row=>{const h0=row.offsetHeight,tmp=document.createElement('div');tmp.innerHTML=LH(x,{court:!!row.closest('[data-s="court"]')});const nr=tmp.querySelector('.ln');row.replaceWith(nr);replyIn(nr,h0,{k:S.k,typing:!f.me})});
    if(String(S.open)===String(x.id)){const rs=$('.sheet .rs');rs.insertAdjacentHTML('beforeend',replyHTML(r,x));$('[data-rh]').textContent=x.r.length+' 条回复';
      const s=$('.sh-sc');s.scrollTo({top:s.scrollHeight,behavior:'smooth'});bubbleIn(rs.lastElementChild.querySelector('.tx'),{k:S.k,typing:!f.me,perm:true,right:false,delay:120})}};
  // 点网球
  const tapBall=(id,opt={})=>{const x=find(id),a=x.b+(x.my?1:0);x.my=!x.my;const b=x.b+(x.my?1:0),up=b>a;
    el.querySelectorAll(`[data-ball="${x.id}"]`).forEach(btn=>{btn.classList.toggle('on',x.my);btn.querySelector('use').setAttribute('href',x.my?'#ball':'#ball0');
      const o=btn.querySelector('.odo');o.innerHTML=`<span class="roll"><b>${F99(up?a:b)||'&nbsp;'}</b><b>${F99(up?b:a)||'&nbsp;'}</b></span>`;
      o.firstChild.animate(up?[{transform:'translateY(0)'},{transform:'translateY(-50%)'}]:[{transform:'translateY(-50%)'},{transform:'translateY(0)'}],{duration:420,delay:x.my?ANI.L1-20:0,easing:'cubic-bezier(.3,1.3,.5,1)',fill:'both'}).onfinish=()=>{o.innerHTML=b?`<b>${F99(b)}</b>`:''};
      const sv=btn.querySelector('svg'),bw=btn.querySelector('.bw');
      if(!x.my){sv.getAnimations().forEach(a=>a.cancel());bw.querySelectorAll('.bsh,.ring').forEach(n=>n.remove())}
      if(x.my)tossSync(sv,bw);
      else if(false){sv.animate([{transform:'none',easing:'cubic-bezier(.2,.7,.4,1)'},{transform:'translateY(-17px) rotate(-200deg) scale(1.1)',offset:.42,easing:'cubic-bezier(.6,0,.9,.5)'},{transform:'translateY(0) rotate(-330deg) scale(1.24,.76)',offset:.76},{transform:'translateY(-2px) rotate(-350deg) scale(.96,1.04)',offset:.88},{transform:'rotate(-360deg)'}],{duration:720});
        const sh=document.createElement('span');sh.className='bsh';bw.append(sh);sh.animate([{transform:'scale(1)',opacity:.3},{transform:'scale(.35)',opacity:.08,offset:.42},{transform:'scale(1.35)',opacity:.42,offset:.76},{transform:'scale(1)',opacity:0}],{duration:720}).onfinish=()=>sh.remove();
        const ring=document.createElement('span');ring.className='ring';bw.append(ring);ring.animate([{transform:'scale(.5)',opacity:.9},{transform:'scale(2.4)',opacity:0}],{duration:620,delay:540,easing:'ease-out',fill:'both'}).onfinish=()=>ring.remove()}
      else sv.animate([{transform:'scale(1)'},{transform:'scale(.72,.8)',offset:.4},{transform:'scale(1)'}],{duration:320,easing:'ease-out'})})};
  // 双击：一个大网球从上面弹下来
  const catchFx=(sv,bw)=>{sv.animate([{transform:'scale(1)'},{transform:'scale(1.65)',offset:.26},{transform:'scale(.8)',offset:.56},{transform:'scale(1.08)',offset:.8},{transform:'scale(1)'}],{duration:500,easing:'ease-out'});
    const rg=document.createElement('span');rg.className='ring';bw.append(rg);rg.animate([{transform:'scale(.6)',opacity:1},{transform:'scale(2.7)',opacity:0}],{duration:560,easing:'cubic-bezier(.2,.8,.3,1)'}).onfinish=()=>rg.remove()};
  const bump=id=>el.querySelectorAll(`[data-ball="${id}"]`).forEach(b=>catchFx(b.querySelector('svg'),b.querySelector('.bw')));
  const ntf=o=>{try{S.ntf&&S.ntf(o)}catch(e){console.error(e)}};
  // 别人点 / 取消网球（演示和测试用；正式版由接口推过来）
  const otherBall=(id,n,on=true)=>{const x=find(id);if(!x||!n)return;const L=x.bu||(x.bu=[]),i=L.findIndex(b=>b.n===n);
    if(on&&i<0){L.push({n,c:uOf('b'+n).c,t:Date.now()});x.b++}else if(!on&&i>=0){L.splice(i,1);x.b=Math.max(0,x.b-1)}else return;
    el.querySelectorAll(`[data-ball="${x.id}"] .odo`).forEach(o=>{const v=x.b+(x.my?1:0);o.innerHTML=v?`<b>${F99(v)}</b>`:''});if(on)bump(x.id);
    if(x.mine)ntf({kind:'sb_ball',post:x,on,actor:{n,c:uOf('b'+n).c}})};
  const fx=(c,x,y,h)=>{const e=document.createElement('span');e.className=c;e.style.left=x+'px';e.style.top=y+'px';if(h)e.innerHTML=h;el.append(e);return e};
  // 一条轨迹：上升一路减速，到顶速度为零，再从零加速下落；落地压扁、泛圈；轻弹一次；停稳；落进涟漪
  // 网球抛起：方案 E″
  // 起：上升越来越慢地靠近最高点；停：顶上停约 0.12 秒，只轻轻浮一下；落：从静止慢慢起步，越落越快。
  // 转：转速跟着球速走，最高点仍在慢慢转，下落时越转越快；着地一瞬间转速被地面吃掉一大半，之后每弹一次更低、更慢，停下时回到原来的角度。
  const EF=1100,ET1=190,ET2=105;
  const ANI={L1:EF,RB:EF+ET1,L2:EF+2*ET1,R2:EF+2*ET1+ET2,L3:EF+2*ET1+2*ET2,ST:EF+2*ET1+2*ET2+50,T:EF+2*ET1+2*ET2+470};
  const flight=(t,H)=>{if(t<520)return -H*(1-Math.pow(1-t/520,3));if(t<640)return -H-H/100*(1-Math.cos(2*Math.PI*(t-520)/120));if(t<EF)return -H*(1-Math.pow((t-640)/460,2.6));
    const d=t-EF;if(d<2*ET1){const u=(d-ET1)/ET1;return -.13*H*(1-u*u)}if(d<2*ET1+2*ET2){const u=(d-2*ET1-ET2)/ET2;return -.03*H*(1-u*u)}return 0};
  const {SPD,ANG}=(()=>{const T=ANI.T,Y=new Float32Array(T+1),S=new Float32Array(T+1),G=new Float32Array(T+1);for(let t=0;t<=T;t++)Y[t]=flight(t,1);
    let vm=0;for(let t=1;t<EF;t++)vm=Math.max(vm,Math.abs(Y[t]-Y[t-1]));let a=0,wL=0;
    for(let t=0;t<=T;t++){G[t]=a;let w;if(t<EF){const sp=t>0?Math.abs(Y[t]-Y[t-1])/vm:1;S[t]=sp;w=.2+.81*sp*(t>640?1.3:1);wL=w}
      else{const d=t-EF,s=Math.min(1,d/(2*ET1+2*ET2+80));w=wL*(.4+.6*Math.exp(-d/22))*Math.pow(1-s,1.6)}a-=w}
    const k=Math.round(G[T]/360)*360/G[T];for(let t=0;t<=T;t++)G[t]*=k;return {SPD:S,ANG:G}})();
  const squash=t=>{let q=0,st=0;const g=(d,w)=>Math.exp(-(d/w)*(d/w));[[ANI.L1,1],[ANI.L2,.36],[ANI.L3,.1]].forEach(([c,a])=>{const d=t-c;q+=a*(g(d,30)-.26*g(d-64,26));st+=a*g(d+24,16)});return [1+.24*q-.05*st,1-.28*q+.08*st]};
  const trajectory=(H,hb,Rr)=>{const K=[],T=ANI.T;for(let t=0;t<T;t+=12){const [sx,sy]=squash(t),y=flight(t,H)+(1-sy)*Rr;
      K.push({offset:+(t/T).toFixed(5),transform:`translateY(${y.toFixed(2)}px) scale(${sx.toFixed(4)},${sy.toFixed(4)}) rotate(${ANG[t].toFixed(2)}deg)`})}
    K.push({offset:1,transform:`translateY(0px) scale(1,1) rotate(${ANG[T].toFixed(0)}deg)`});return K};
  const shadowK=(k=1,C='translate(-50%,-50%) ')=>{const K=[],T=ANI.T;for(let t=0;t<T;t+=24){const h=-flight(t,1),[sx]=squash(t),fin=Math.min(1,t/120),fout=t>ANI.ST?Math.max(0,1-(t-ANI.ST)/(T-ANI.ST)):1;
      K.push({offset:+(t/T).toFixed(5),opacity:+(k*(.46-.34*h)*fin*fout).toFixed(3),transform:C+`scale(${((1.15-.6*h)*(1+.5*(sx-1))).toFixed(3)})`})}
    K.push({offset:1,opacity:0,transform:C+'scale(.7)'});return K};
  // 拖影：只在快的时候出现，最高点没有
  const ghostK=k=>{const K=[],T=ANI.T;for(let t=0;t<T;t+=24)K.push({offset:+(t/T).toFixed(5),opacity:+(t<EF?k*SPD[t]:0).toFixed(3)});K.push({offset:1,opacity:0});return K};
  const tossSync=(sv,bw)=>{sv.animate(trajectory(17,3,5.6),{duration:ANI.T});
    const sh=document.createElement('span');sh.className='bsh';bw.append(sh);sh.animate(shadowK(.85,''),{duration:ANI.T}).onfinish=()=>sh.remove();
    [[ANI.L1,640,2.6,.95],[ANI.L2,420,1.6,.45]].forEach(([d,du,to,op])=>{const rg=document.createElement('span');rg.className='ring';rg.style.opacity=0;bw.append(rg);rg.animate([{transform:'scale(.5)',opacity:op},{transform:`scale(${to})`,opacity:0}],{duration:du,delay:d,easing:'cubic-bezier(.2,.8,.3,1)',fill:'forwards'}).onfinish=()=>rg.remove()})};
  const bigBall=(host,ev,id)=>{const box=host.closest('.it')||host.closest('.sh-sc')||el,R=box.getBoundingClientRect(),hr=host.getBoundingClientRect(),
      scr=(host.closest('.sh-sc,[data-sc],.scroll')||el).getBoundingClientRect(),hd=host.closest('.home')?el.querySelector('.home .hd'):null,top=Math.max(scr.top,hd?hd.getBoundingClientRect().bottom:scr.top),
      bar=host.closest('.sheet')?el.querySelector('.sheet .bar'):el.querySelector('.home .bar'),bot=Math.min(scr.bottom,bar?bar.getBoundingClientRect().top+20:scr.bottom),
      vt=Math.max(hr.top,top),vb=Math.min(hr.bottom,bot),cy=(vt+vb)/2,Hh=Math.round(Math.max(40,Math.min(104,(cy-top-38)*.9))),
      x0=hr.left+hr.width/2-R.left+(box.scrollLeft||0),y0=cy-R.top+(box.scrollTop||0),fx=(c,x,y,h)=>{const e=document.createElement('span');e.className=c;e.style.left=x+'px';e.style.top=y+'px';if(h)e.innerHTML=h;box.append(e);return e},C='translate(-50%,-50%) ',x=find(id),was=x&&x.my,A=ANI;
    const sh=fx('fxsh',x0,y0+26),b=fx('fxb',x0,y0,'<svg viewBox="0 0 100 100"><use href="#ball"/></svg>'),sv=b.firstChild;
    const TJ=trajectory(Hh,0,24);b.animate(TJ,{duration:A.T,fill:'forwards'});
    [[26,.2],[52,.1]].forEach(([d,k])=>{const gb=fx('fxb fxg',x0,y0,'<svg viewBox="0 0 100 100"><use href="#ball"/></svg>');gb.style.opacity=0;b.before(gb);gb.animate(TJ,{duration:A.T,delay:d});gb.animate(ghostK(k),{duration:A.T,delay:d}).onfinish=()=>gb.remove()});
    sv.animate([{transform:'scale(.4)',opacity:0},{transform:'scale(1)',opacity:1}],{duration:200,easing:'cubic-bezier(.2,.7,.3,1)'});
    sv.animate([{transform:'translateY(0px) scale(1)',opacity:1},{transform:'translateY(7px) scale(.5)',opacity:0}],{duration:A.T-A.ST,delay:A.ST,easing:'cubic-bezier(.4,0,.2,1)',fill:'forwards'}).onfinish=()=>b.remove();
    sh.animate(shadowK(),{duration:A.T,fill:'forwards'}).onfinish=()=>sh.remove();
    const ring=(c,delay,dur,to,op)=>{const r=fx(c,x0,y0+25);r.animate([{transform:C+'scale(.3)',opacity:op},{transform:C+`scale(${to})`,opacity:0}],{duration:dur,delay,easing:'cubic-bezier(.2,.75,.3,1)',fill:'forwards'}).onfinish=()=>r.remove()};
    ring('fxr',A.L1,840,2.6,1);ring('fxr',A.L2,520,1.5,.45);ring('fxr w',A.ST-20,900,2.2,.75);
    for(let i=0;i<6;i++){const dir=i%2?1:-1,dx=dir*(16+Math.random()*26),dy=-(3+Math.random()*10),d=fx('fxd'+(i%3?'':' w'),x0+dir*10,y0+24);
      d.animate([{transform:C+'scale(1)',opacity:1},{transform:`translate(calc(-50% + ${dx.toFixed(1)}px),calc(-50% + ${dy.toFixed(1)}px)) scale(.3)`,opacity:0}],{duration:460+Math.random()*120,delay:A.L1,easing:'cubic-bezier(.1,.7,.3,1)',fill:'forwards'}).onfinish=()=>d.remove()}
    host.animate([{transform:'scale(1)'},{transform:'scale(.99)',offset:.35},{transform:'scale(1)'}],{duration:340,delay:A.L1,easing:'ease-out'});
    if(ev&&ev.isTrusted)setTimeout(()=>{try{navigator.vibrate&&navigator.vibrate(10)}catch(e){}},A.L1);
    if(x&&!was){tapBall(id);track('sb_ball',{post_id:x.id,on:true,via:'double'})}else setTimeout(()=>bump(id),A.L1)};
  const dbl=(host,id,e)=>bigBall(host,e,id);
  const flyArrow=b=>b.querySelector('svg').animate([{transform:'none'},{transform:'translateY(-22px)',opacity:0,offset:.45},{transform:'translateY(20px)',opacity:0,offset:.46},{transform:'none',opacity:1}],{duration:560,easing:'ease-in-out'});
  const openSheet=(id,via)=>{S.open=id;drawSheet();requestAnimationFrame(state);const x=find(id);
    if(x)track('sb_post_view',{post_id:x.id,own:!!x.mine,via:via||(S.album?'album':S.court?'court':S.wall||(S.f&&S.f.k==='topic')?'topic':'feed')})};
  const shut=()=>{S.open=null;el.classList.remove('acting');state()};

  // 发布成功（F2 埋点）：话题是官方的、大家发起的，还是这次新建的
  const tkind=tp=>{const T=tp&&S.T[tp];return !T?'none':T.fresh?'new':T.user?'user':'official'};
  const tcode=tp=>tp&&S.T[tp]&&S.T[tp].user?'user':tp||null;
  const subEv=(id,photos,tk,court,later,via)=>track('sb_post_submit',{post_id:id,photos,topic_kind:tk,court:!!court,later:!!later,via});
  const fromBar=(o={})=>{const q=S.hq||{};openCompose(Object.assign({ph:q.t,topic:q.tp,sc:q.sc},o))};
  inp.oninput=drawComposer;inp.onkeydown=e=>{if(e.key==='Enter'&&!sendB.disabled)sendB.click()};
  const qtp=$('[data-qtp]');
  const drawQ=()=>{const T=S.qtp&&S.T[S.qtp];qtp.innerHTML=`${T?`<span class="qt">#${esc(T.t)}<button data-qtx aria-label="不带这个话题">${ic('x')}</button></span>`:''}<span class="sp"></span><button class="qx" data-qx>展开${ic('chev','cv')}</button>`};
  const qOpen=()=>{if(el.classList.contains('qing'))return;S.qhq=S.hq;S.qtp=S.hq&&S.hq.tp||null;drawQ();el.classList.add('qing');closeLp()};
  const qClose=()=>{el.classList.remove('qing')};
  qtp.addEventListener('pointerdown',e=>e.preventDefault());
  inp.addEventListener('focus',qOpen);
  inp.addEventListener('blur',()=>setTimeout(()=>{if(AE()!==inp&&!inp.value.trim())qClose()},150));
  el.addEventListener('pointerdown',e=>{const r=e.target.closest('.lr');if(r){r.classList.add('tip');setTimeout(()=>r.classList.remove('tip'),1800)}});
  el.addEventListener('click',e=>{const t=e.target.closest('[data-ball],[data-pic],[data-court],[data-ln],[data-send],[data-csend],[data-rsend],[data-place],[data-lq],[data-qtx],[data-qx],[data-near],[data-cam],[data-back],[data-close],[data-more],[data-shut],[data-menu],[data-act],[data-share],[data-tpl],[data-sx],[data-sv],[data-cx],[data-cgo],[data-pk],[data-tone],[data-cpl],[data-tg],[data-rp],[data-topic],[data-wback],[data-wshare],[data-wgo],[data-jie],[data-tp],[data-tnew],[data-tshare],[data-fill],[data-bell],[data-me],[data-aback],[data-user],[data-rto],[data-scok],[data-scno],[data-loc],[data-pkx],[data-rtox],[data-home2],[data-myc],[data-mine],[data-fx],[data-vw],[data-cmt],[data-ctp],[data-cset],[data-cshx],[data-lib],[data-keep],[data-keep1],[data-letgo],[data-undo]');if(!t)return;const d=t.dataset;
    if(d.ball){e.stopPropagation();const id=d.ball;need('ball',()=>{const c=sbRate(S,'sb_ball');if(c)return say(c);tapBall(id);const x=find(id);track('sb_ball',{post_id:x.id,on:!!x.my,via:'tap'})});return}
    if(d.pic&&t.closest('.hero')){const k='p'+d.pic,now=Date.now();if(S._tap&&S._tap.k===k&&now-S._tap.t<300){clearTimeout(S._tap.h);S._tap=null;const h=t.closest('.hero'),id=d.pic;need('ball',()=>{const x=find(id),c=x&&!x.my&&sbRate(S,'sb_ball');if(c)return say(c);dbl(h,id,e)});return}const id=d.pic;S._tap={k,t:now,h:setTimeout(()=>{S._tap=null;S.view=id;drawViewer();state();track('sb_photo_view',{post_id:id})},280)};return}
    if(d.pic){S.view=d.pic;drawViewer();state();track('sb_photo_view',{post_id:d.pic});return}
    if('close' in d){S.view=null;state();return}
        if(d.court){if(COURTS[d.court])setF(S.f&&S.f.k==='court'&&S.f.v===d.court?null:{k:'court',v:d.court});return}
    if('back' in d){S.court=null;state();return}
    if(d.near){S.near=d.near==='1';drawHome();return}
    if('shut' in d){shut();return}
    if('menu' in d){const x=find(S.open),u=U(x);
      $('.acts .g').innerHTML=x.mine?`<p class="ah2">你发的</p>${x.pic?'<button data-act="share">分享图片</button>':''}<button data-act="mute">${x.closed?'允许回复':'关闭回复'}</button><button class="warn" data-act="del">删除</button>`
        :`<p class="ah2">${u.anon?'一位球友发的':esc(u.n)+' 发的'}</p><button data-act="less">不感兴趣<small>以后少给你看类似的</small></button>${u.anon||u.off?'':`<button data-act="block" data-un="${esc(u.n)}">屏蔽 ${esc(u.n)}<small>互相看不到对方发的内容</small></button>`}<button class="warn" data-act="report">举报</button>`;
      el.classList.add('acting');return}
    if(d.act&&['less','block','report','r'].includes(d.act)&&!S.gok){need(d.act==='less'?'less':d.act==='block'?'block':'report',()=>again(t));return}
    if(d.act){const A=d.act,drop=f=>{S.L=S.L.filter(y=>!f(y));if(S.open&&!find(S.open))shut();drawHome();if(S.court)drawCourt()};
      if(A==='report'){$('.acts .g').innerHTML=`<p class="ah2">举报的原因</p><button data-act="r" data-rr="harass">骚扰或冒犯</button><button data-act="r" data-rr="photo">不当照片</button><button data-act="r" data-rr="fraud">虚假交易</button><button data-act="r" data-rr="other">其他</button>`;
        track('report_open',{target_type:'sb_post',via:'sideline'});return}
      el.classList.remove('acting');
      if(A==='r'){const id=S.open,R=S.rep||(S.rep=new Set());if(R.has(String(id))){say('report_duplicate');return}const c=sbRate(S,'sb_report');if(c){say(c);return}R.add(String(id));track('report_submit',{target_type:'sb_post',reason:d.rr||'other',has_note:false,via:'sideline'});toast('已收到，我们会尽快处理')}
      if(A==='less'){const x=find(S.open),c=catOf(x),n=U(x).n;S._lx={id:x.id,c,n};track('sb_hide',{post_id:x.id,reason:'none'});shut();drop(y=>String(y.id)===String(x.id));el.classList.add('acting');
        $('.acts .g').innerHTML=`<p class="ah2">这一条已隐藏。想告诉我们原因吗？</p><button data-act="lc">少看「${esc(c)}」<small>同类内容会排得更靠后</small></button><button data-act="lu">少看 ${esc(n)} 的<small>${esc(n)} 发的会排得更靠后</small></button><button data-act="lf">离我太远<small>远处的内容会排得更靠后</small></button><button data-act="l0">只是这一条</button>`;return}
      if(['lc','lu','lf','l0'].includes(A)){const L=S._lx;if(A!=='l0')track('sb_hide',{post_id:L.id,reason:{lc:'topic',lu:'user',lf:'far'}[A]});if(A==='lc')S.lc[L.c]=1;if(A==='lu')S.lu[L.n]=1;if(A==='lf')S.lf=true;shut();drop(y=>String(y.id)===String(L.id));
        toast(A==='lc'?`好的，会少给你看「${L.c}」`:A==='lu'?`好的，会少给你看 ${L.n} 的`:A==='lf'?'好的，会多给你看近处的':'好的，这一条不会再出现')}
      if(A==='block'){const n=d.un;S.bl.add(n);track('user_block',{target_uid:'sb:'+hsh(n)});shut();drop(y=>U(y).n===n&&!y.mine);toast('已屏蔽 '+n)}
      if(A==='del'){const id=S.open;track('sb_post_delete',{post_id:id});shut();drop(y=>String(y.id)===String(id));toast('已删除')}
      if(A==='mute'){const x=find(S.open);x.closed=!x.closed;track('sb_replies_toggle',{post_id:x.id,open:!x.closed});drawSheet();toast(x.closed?'已关闭回复':'已允许回复')}
      if(A==='share'){S.share='photo';drawShare();state()}
      return}
    if('qtx' in d){S.qtp=null;drawQ();return}
    if('qx' in d){const q=S.qhq||{};const v=inp.value.trim();inp.value='';drawComposer();qClose();inp.blur();openCompose({text:v,ph:q.t,topic:S.qtp,sc:q.sc});return}
    if('place' in d){S.lpOn?closeLp():openLp();return}
    if(d.lq!==undefined){const k=d.lq==='none'?'':d.lq;el.querySelectorAll('[data-lq]').forEach(b=>b.classList.toggle('on',b===t));setTimeout(()=>{closeLp();setLoc(k)},140);return}
    if('cam' in d){closeLp();if(el.classList.contains('qing')||inp.value.trim()){const q=S.qhq||S.hq||{},v=inp.value.trim();inp.value='';drawComposer();qClose();inp.blur();openCompose({text:v,ph:q.t,topic:S.qtp,sc:q.sc,lib:true})}else fromBar({lib:true});return}
    if('more' in d){sc.scrollTo({top:0,behavior:'smooth'});settle();return}
    if('send' in d){if(!S.gok){need('post',()=>again(t));return}const v=inp.value.trim(),lk=S.loc,tp=el.classList.contains('qing')?S.qtp:null;
      {const c=SB_LINK.test(v)?'message_link':sbRate(S,'sb_post');if(c){say(c);return}}flyArrow(t);sc.scrollTop=0;const tk=tkind(tp);
      insertPost({id:++UID,t:Date.now(),x:v||'（一张照片）',w:lk,km:lk?KM[lk]:null,b:0,r:[],pic:S.photo?'sunset':null,topic:tp||undefined,mine:true,views:0},true);subEv(S.lastMine.id,S.photo?1:0,tk,lk,false,'bar');
      S.photo=false;inp.value='';drawComposer();qClose();inp.blur();S.qtp=null;showUndo(tp?`已发布 · No.${S.T[tp].n}`:'已发布');return}
    if('csend' in d){if(!S.gok){need('post',()=>again(t));return}const ci=$('[data-cin]'),v=ci.value.trim();if(!v)return;{const c=SB_LINK.test(v)?'message_link':sbRate(S,'sb_post');if(c){say(c);return}}flyArrow(t);insertPost({id:++UID,t:Date.now(),x:v,w:S.court,km:1.2,b:0,r:[],mine:true,views:0},true);subEv(S.lastMine.id,0,'none',S.court,false,'court');ci.value='';ci.oninput();toast('已发布到 '+S.court);return}
    if('rsend' in d){if(!S.gok){need('reply',()=>again(t));return}const ri=$('[data-rin]'),v=ri.value.trim(),x=find(S.open);if(!v||!x)return;{const c=x.closed&&!x.mine?'replies_closed':SB_LINK.test(v)?'message_link':sbRate(S,'sb_reply');if(c){say(c);return}}flyArrow(t);addReply(S.open,v,{me:1,to:S.rto||undefined});track('sb_reply_send',{post_id:x.id,own_post:!!x.mine,to_someone:!!S.rto});ri.value='';ri.oninput();clearRto();return}
    if('share' in d){S.share='photo';drawShare();state();return}
    if(d.tpl){S.share=d.tpl;const c=$('.sc');c.className='sc t-'+d.tpl;c.innerHTML=card(find(S.open),d.tpl);c.animate([{transform:'scale(.96)',opacity:.6},{transform:'none',opacity:1}],{duration:420,easing:'cubic-bezier(.3,1.3,.5,1)'});el.querySelectorAll('[data-tpl]').forEach(b=>b.classList.toggle('on',b===t));return}
    if('sx' in d){S.share=null;S.shTopic=null;state();return}
    if('tshare' in d){if(!S.f||S.f.k!=='topic')return;S.shTopic=S.f.v;S.share='wall';drawShare();state();return}
    if(d.sv){const w=S.share==='wall';track('sb_share',{post_id:w?null:S.open,topic:w?tcode(S.shTopic||S.wall):null,what:w?'topic':'photo',to:/相册/.test(d.sv)?'save':/Instagram/.test(d.sv)?'instagram':'xhs'});toast(d.sv);return}
    if('cx' in d){S.cmp=null;state();return}
    if(d.pk){const C=S.cmp,i=C.pics.indexOf(d.pk);if(i>=0)C.pics.splice(i,1);else if(C.pics.length<3)C.pics.push(d.pk);else{toast('最多三张');return}drawCompose();return}
    if(d.tone){S.cmp.tone=d.tone==='none'?'':d.tone;el.querySelectorAll('.ph1 .tn').forEach(pv=>pv.className='tn'+(S.cmp.tone?' t-'+S.cmp.tone:''));el.querySelectorAll('[data-tone]').forEach(b=>b.classList.toggle('on',b===t));return}
    if('cpl' in d){S.cmp.pick=true;$('.pick').classList.add('on');return}
    if(d.loc!==undefined){S.cmp.loc=d.loc==='none'?'':d.loc;setLoc(S.cmp.loc);el.querySelectorAll('[data-loc]').forEach(b=>b.classList.toggle('on',b===t));setTimeout(()=>{S.cmp.pick=false;$('.pick').classList.remove('on');setTimeout(drawCompose,450)},260);return}
    if('pkx' in d){S.cmp.pick=false;$('.pick').classList.remove('on');setTimeout(drawCompose,450);return}
    if(d.tg){const C=S.cmp;C[d.tg]=!C[d.tg];t.querySelector('.tg').classList.toggle('on',C[d.tg]);return}
    if(d.rp){S.cmp.reply=d.rp;el.querySelectorAll('[data-rp]').forEach(b=>b.classList.toggle('on',b===t));return}
    if('cgo' in d){const C=S.cmp;if(!C.text.trim()&&!C.pics.length){toast('写点什么，或者选一张照片');return}
      if(!S.gok){need('post',()=>again(t));return}
      const tk=tkind(C.topic);
      {const nt=C.topic&&S.T[C.topic]&&S.T[C.topic].fresh,c=SB_LINK.test(C.text)?'message_link':(nt&&sbRate(S,'sb_topic',true))||sbRate(S,'sb_post',true);if(c){say(c);return}sbRate(S,'sb_post');if(nt){sbRate(S,'sb_topic');S.T[C.topic].fresh=0}}
      const lk=C.loc;S.cmp=null;state();const pid=++UID;subEv(pid,C.pics.length,tk,lk,C.later,'compose');
      if(C.later){toast('好的，2 小时后公开');return}
      sc.scrollTop=0;setTimeout(()=>insertPost(norm([{id:pid,t:Date.now(),x:C.text.trim()||'（一张照片）',w:lk,km:lk?KM[lk]:null,b:0,r:[],pics:C.pics.length?C.pics.slice():undefined,tone:C.tone,area:false,anon:C.anon,mine:true,views:0,closed:!C.replyOn,topic:C.topic||undefined,keep:C.keep}])[0],true),420);
      inp.value='';drawComposer();setTimeout(()=>showUndo(C.topic?`已发布 · No.${S.T[C.topic].n}`:'已发布'),480);return}
    if(d.user){const u=UREG[d.user];if(!u)return;$('.acts .g').innerHTML=`<div class="uc">${av(u,56)}<b>${esc(u.n)}</b><p>${u.me?'这是你':`水平 ${u.lv} · 常在 ${esc(u.area)} 一带 · 打过 ${u.g} 场球局`}</p><small>场边没有私信。想一起打，可以在「球局」里约。</small></div>${u.me?'':`<button data-act="block" data-un="${esc(u.n)}">屏蔽 ${esc(u.n)}<small>互相看不到对方发的内容</small></button><button class="warn" data-act="report">举报</button>`}`;el.classList.add('acting');return}
    if(d.rto!==undefined&&t.matches('.rr')){if(!d.rto)return;if(S.rto===d.rto){clearRto();return}setRto(d.rto,t);return}
    if('rtox' in d){S.rto=null;const c=$('.sheet .rtc');if(c)c.innerHTML='';return}
    if(d.scok!==undefined||d.scno!==undefined){const x=find(S.open),i=+(d.scok??d.scno),r=x.pend.splice(i,1)[0];if(d.scok!==undefined){r.u=uOf('s'+r.x);x.r.push(r);toast('已显示')}else toast('已忽略，对方不会知道');drawSheet();return}
    if('mine' in d){S.mineOnly=!S.mineOnly;S.f=null;t.classList.toggle('on',S.mineOnly);if(desk)drawRail();swap();return}
    if(d.myc!==undefined){S.filt=d.myc||null;S.open=null;state();drawHome();sc.scrollTop=0;return}
    if(d.cmt){openSheet(d.cmt);setTimeout(()=>{const r=$('.sheet [data-rh]'),c=$('.sh-sc');if(r&&c)c.scrollTo({top:r.offsetTop-12,behavior:'smooth'})},380);return}
    if(d.home2){S.court=S.home=d.home2;drawCourt();track('sb_court_view',{venue:d.home2,via:'page'});return}
    if('bell' in d){S.bell&&S.bell();return}
    if('me' in d){S.album=true;drawAlbum();state();return}
    if('aback' in d){S.album=false;state();return}
    if(d.keep){const x=find(d.keep);x.keep=!x.keep;t.querySelector('.tg').classList.toggle('on',x.keep);setTimeout(()=>{t.outerHTML=keepRow(x)},380);toast(x.keep?'好，到期后收进「我的」':'好，到期就让它走');return}
    if(d.keep1){const x=find(d.keep1);x.keep=true;$('.remind').classList.remove('show');toast('留下来了，只有你看得到');return}
    if('letgo' in d){$('.remind').classList.remove('show');return}
    if('undo' in d){const x=S.lastMine;if(!x)return;$('.undo').classList.remove('show');el.querySelectorAll(`[data-s] [data-ln="${x.id}"],.wall [data-ln="${x.id}"]`).forEach(collapse);
      S.L=S.L.filter(y=>y!==x);if(x.topic&&S.T[x.topic].n===x.floor){S.T[x.topic].n--;const c=list.querySelector('.tpc');if(c)c.outerHTML=topicCard()}setCnt();S.lastMine=null;toast('已撤回');return}
    if(d.topic){if(t.closest('.sheet,.tpc,.wg')){setF({k:'topic',v:d.topic});return}setF(S.f&&S.f.k==='topic'&&S.f.v===d.topic?null:{k:'topic',v:d.topic});return}
    if('fx' in d){setF(null);return}
    if(d.vw){if(S.vw===d.vw)return;S.vw=d.vw;el.querySelectorAll('[data-vw]').forEach(b=>b.classList.toggle('on',b===t));swap(null,true);return}
    if('wback' in d){S.wall=null;state();return}
    if('wshare' in d){S.share='wall';drawShare();state();return}
    if('wgo' in d){openCompose({topic:S.wall});return}
    if(d.jie){openCompose({topic:d.jie});return}
    if(d.tnew){const r=sbTopicResolve(d.tnew,S.T);if(r.err){say(r.err);return}if(r.id){S.cmp.topic=r.id;S.cmp.sc=null;setTimeout(closeSh,120);return}
      const id='c'+(++UID);S.T[id]={fresh:1,t:r.title,k:'由 你 发起',q:'',ask:'',fills:[],n:0,user:1,by:'你',mine:1};S.cmp.topic=id;S.cmp.sc=null;setTimeout(closeSh,120);return}
    if(d.tp!==undefined){const C=S.cmp;C.topic=d.tp||null;C.sc=null;if(C.sh){el.querySelectorAll('[data-tp]').forEach(b=>b.classList.toggle('on',b===t));setTimeout(closeSh,160)}else{drawCompose();topicIn()}return}
    if('ctp' in d){openSh('topic');return}
    if('cset' in d){openSh('set');return}
    if('cshx' in d){closeSh();return}
    if('lib' in d){S.cmp.lib=!S.cmp.lib;S.cmp.libReady=true;drawCompose();return}
    if(d.fill){S.cmp.text=d.fill;drawCompose();const ct=$('[data-ctext]');ct.focus({preventScroll:true});ct.setSelectionRange(ct.value.length,ct.value.length);return}
    if(d.ln&&!t.classList.contains('pc')){openSheet(d.ln);return}
    if(d.ln&&t.matches('.rr')===false){const now=Date.now();if(S._tap&&S._tap.k===d.ln&&now-S._tap.t<300){clearTimeout(S._tap.h);S._tap=null;const h=t,id=d.ln;need('ball',()=>{const x=find(id),c=x&&!x.my&&sbRate(S,'sb_ball');if(c)return say(c);dbl(h,id,e)});return}
      const id=d.ln;S._tap={k:id,t:now,h:setTimeout(()=>{S._tap=null;openSheet(id)},240)};return}});
  if(S.typed)inp.value=S.typed;
  if(S.compose)S.cmp=Object.assign({pics:[],tone:'',text:'',loc:S.loc,ph:'',sc:null,sig:false,later:false,reply:'all',topic:null,keep:false,anon:false,replyOn:true,pick:false,lib:false,libReady:true,sh:null},S.compose);
  render();
  if(S.menu)setTimeout(()=>{const m=$('.sheet [data-menu]');if(m)m.click();if(S.less)setTimeout(()=>{const l=$('[data-act="less"]');if(l)l.click()},400)},700);
  if(S.rtoDemo)setTimeout(()=>{const r=$(`.sheet .rr[data-rto="${S.rtoDemo}"]`)||$('.sheet .rr[data-rto]:not([data-rto=""])');if(r)r.click()},900);
  if(S.dblDemo)setTimeout(()=>{const go=()=>{const h=S.dblDemo==='feed'?list.querySelector('[data-ln="20"]'):$('.sheet .hero');if(h&&!S.view&&!S.open===(S.dblDemo==='feed')){const r=h.getBoundingClientRect();bigBall(h,{clientX:r.left+r.width*.55,clientY:r.top+Math.min(r.height*.42,160)},S.dblDemo==='feed'?20:S.open)}};go();setInterval(go,3600)},1300);
  if(S.sheetScroll)setTimeout(()=>{const c=$('.sh-sc');if(c)c.scrollTop=S.sheetScroll},60);
  if(S.remind)setTimeout(()=>showRemind(S.remind),900);
  if(S.undoDemo){S.undoHold=true;setTimeout(()=>{insertPost({id:++UID,t:Date.now(),x:'今天第一次发球直接得分',w:'Glen Iris',km:.8,b:0,r:[],mine:true,views:0},true);setTimeout(()=>showUndo('已发布'),300)},700)}
  if(S.fInit){S.f=S.fInit;S.vw=S.vwInit||(S.fInit.k==='topic'?'grid':'list');drawHome()}
  if(S.toMod)setTimeout(()=>{const m=list.querySelector('.itm');if(m)sc.scrollTop=m.offsetTop-110},50);
  if(S.cmp&&S.shOpen)setTimeout(()=>openSh(S.shOpen),700);
  if(S.cmpScroll){const c=$('.cmp-sc');if(c)c.scrollTop=S.cmpScroll}
  if(S.scrollToId){const r=list.querySelector(`[data-ln="${S.scrollToId}"]`);if(r)sc.scrollTop=(r.closest('.it')||r).offsetTop-96}
  const HQ=(t,tp,sc)=>({t,tp:tp||null,sc:sc||null});
  const hintsFor=()=>{
    if(S.f&&S.f.k==='topic'){const T=S.T[S.f.v];return [HQ(T.ask||`说说 #${T.t}`,S.f.v)]}
    const k=S.loc||(S.f&&S.f.k==='court'?S.f.v:''),tops=[...new Set([TODAY,...SLOTT[slotNow()]])].filter(id=>S.T[id]&&S.T[id].ask).map(id=>HQ(S.T[id].ask,id)),lost=sbHints('lost')[0]||HQ('捡到东西了？',null,'lost');
    if(k){const cq=sbHints('court',k);return [cq[0],...tops,...cq.slice(1),lost]}
    return [...sbHints('general'),...tops,lost]};
  let hi=0;const showHint=o=>{S.hq=o;S.hintAt=Date.now();if(hint.textContent===o.t)return;hint.classList.add('out');setTimeout(()=>{hint.textContent=S.hq.t;hint.classList.remove('out')},300)};
  S.hq=hintsFor()[0];hint.textContent=S.hq.t;S.rehint=()=>{hi=0;showHint(hintsFor()[0])};
  setInterval(()=>{if(inp.value||AE()===inp||S.lpOn||S.cmp||Date.now()-(S.hintAt||0)<CFG.settings.hint_hold*1000-200||!el.getClientRects().length)return;const L=hintsFor();showHint(L[++hi%L.length])},CFG.settings.hint_every*1000);
  el.addEventListener('input',e=>{if(e.target.matches('[data-tq]')){const tl=$('.csh-p .tl');if(tl)tl.innerHTML=tRows(e.target.value.trim().replace(/^#+/,''))}});
  el.addEventListener('click',e=>{if(S.lpOn&&!e.target.closest('.lp,[data-place]'))closeLp()},true);
  if(S.lpDemo)setTimeout(openLp,900);
  if(S.qDemo)setTimeout(()=>{S.hq=HQ(S.T.ootd.ask,'ootd');hint.textContent=S.hq.t;S.qhq=S.hq;S.qtp='ootd';drawQ();el.classList.add('qing');inp.value='第一次穿网球裙上场，有点紧张';drawComposer()},700);
  if(S.live){const tick=()=>{if(!S.open&&!S.view&&el.getClientRects().length&&AE()!==inp&&!el.matches(':hover')){const e=INCOMING[S.qi++%INCOMING.length];
      if(e.ball)otherBall(e.ball,e.by);else if(e.reply)addReply(e.reply,e.x,e.to?{to:e.to}:{});else insertPost(norm([{id:++UID,t:Date.now(),x:e.x,w:e.w,km:e.km,b:0,r:[],pic:e.pic,tone:e.tone,topic:e.topic}])[0],false)}
    setTimeout(tick,S.every||5600)};setTimeout(tick,S.first||1800)}
  // ---- 第八批 F2：别人对「我」的互动交给宿主的消息列表（合并、提醒、点开在宿主那边，数据库 sb_notify_ball / sb_notify_reply 同一套） ----
  //   网球：x.bu = 别人点的（名字 + 时间），x.b = 别人点的总数；回复：r.id；屏蔽了的人 S.bl（不再提醒）
  const gone=x=>!x||!S.L.includes(x)&&!S.A.includes(x);
  S.api={get:id=>{const x=find(id);if(gone(x))return null;const ps=x.pics||(x.pic?[x.pic]:[]);
      return {id:x.id,mine:!!x.mine,body:x.x==='（一张照片）'?'':x.x,photos:ps.length,balls:(x.bu||[]).slice(),reply:rid=>x.r.find(r=>r.id===rid)||null,
        replies:x.r.map(r=>{const u=RU(r,x);return {id:r.id,t:r.t,me:!!r.me,to:r.to||null,n:u.n,c:u.c}})}},
    me:ME_U.n,
    // 从通知打开：盖在上面的先收起，打开那条；回复类滚到那条回复并闪一下
    open:(id,rid)=>{const x=find(id);if(gone(x))return false;S.view=null;S.court=null;S.wall=null;S.album=false;S.share=null;el.classList.remove('acting');openSheet(x.id,'notif');
      const i=rid==null?-1:x.r.findIndex(r=>r.id===rid);setTimeout(()=>{const c=$('.sh-sc'),row=i>=0?$('.sheet .rs').children[i]:null;if(!c)return;
        if(row){c.scrollTo({top:Math.max(0,row.offsetTop-c.clientHeight/3),behavior:'smooth'});row.animate([{background:'rgba(198,234,61,.35)'},{background:'transparent'}],{duration:1600,easing:'ease-out'})}},380);return true},
    others:{ball:(id,n,on)=>otherBall(id,n,on),reply:(id,text,f)=>addReply(id,text,f||{})},
    album:()=>{S.open=null;S.court=null;S.wall=null;S.album=true;drawAlbum();state();track('sb_album_open',{})},badge:n=>{const b=$('[data-bn]');if(b){b.hidden=!n;b.textContent=n||''}},setHome:h=>{S.homes=h?h.split(','):[];S.home=S.homes[0]||null;S.filt=null;drawHome();S.open=null;if(S.court)drawCourt();state()}};
  sc.addEventListener('scroll',()=>{el.classList.toggle('cond',sc.scrollTop>14);S.sct=Date.now();if(S.pend||S.pdraw)settle()},{passive:true});
  sc.addEventListener('touchstart',()=>{S.touch=1},{passive:true});
  sc.addEventListener('touchend',()=>{S.touch=0;if(S.pend||S.pdraw)settle()},{passive:true});sc.addEventListener('touchcancel',()=>{S.touch=0;if(S.pend||S.pdraw)settle()},{passive:true});
  setInterval(setCnt,30000);
  return S;
}

return {App,CFG,rules:{rate:sbRate,topic:sbTopicResolve,link:SB_LINK},today:sbToday,topics:()=>TOPICS,hints:sbHints,slot:()=>slotNow()};
})();

