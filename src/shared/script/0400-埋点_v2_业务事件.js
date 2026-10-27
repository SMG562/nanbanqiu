/* ===================== 埋点 v2 · 业务事件 =====================
 * 事件名和 props 只来自 events_spec.md；两端同一份代码（平台差异只在 AN_BUILD 分支里）。
 * · 结果事件在「成功之后」发：包在各功能最终版本的函数外面（申请、加入、婉拒、发布、修改、顺延、邀约……）；
 *   校验没通过、未登录被拦下、球友约定还没同意时都不发
 * · 点击类只保留字典里的 *_open 等；字典之外的按钮仍记 ui_action（兜底），已经由结果事件覆盖的按钮不再重复记
 * · 不记聊天内容、性别值；球员卡快照只在看 / 改 / 分享自己的卡时附带
 * · 路由：#/new 发起球局（需要时先登录）· #/mine 我的球局 · /p/{编号}、#/p/{编号} 球员卡（未登录也能看）
 * · 推送打开：地址带 ?n=<通知 id>&k=<种类> → 会话 entry=push、notif_open{from:'push'}，然后把 n / k 从地址栏去掉 */
const AN_FIELD={'时间':'time','地点':'venue','玩法':'type','水平':'utr','标签':'tags','备注':'note','公开设置':'hide_done','加入方式':'join_mode','缺几人':'spots'};
function anRoute(){if(typeof USERS==='undefined'||!USERS)return false;const h=location.hash||'',path=location.pathname||'';
  const home=tab=>{if(AN_BUILD==='pwa')go(tab);else{UI.landing=null;UI.tab=tab;UI.sel=null;render()}};
  const m=h.match(/^#\/p\/(\d+)/)||path.match(/\/p\/(\d+)\/?$/);
  if(m){const u=Object.values(USERS).find(x=>+x.no===+m[1]);if(!u)return false;if(h.startsWith('#/p/'))try{history.replaceState(null,'','#/')}catch(e){}
    LOC.asked=true;home('disc');AN.cardVia='link';openCard(u.id);return true}
  if(/^#\/new\b/.test(h)){try{history.replaceState(null,'','#/')}catch(e){}LOC.asked=true;home('disc');AN.trig='create';try{openCreate()}finally{AN.trig=null}return true}
  if(/^#\/mine\b/.test(h)){try{history.replaceState(null,'','#/')}catch(e){}home('mine');return true}
  return false}
// 启动完成（演示数据 / 登录身份已恢复）之后：开会话，补发启动期间记下的事件，处理推送打开
function anBoot(){if(AN.ready)return;AN.ready=true;const now=Date.now(),last=+anLS('nbq_last')||0,sid=anLS('nbq_sid');
  if(sid&&now-last<AN_IDLE&&AN.entry!=='share'&&AN.entry!=='push'){AN.sid=sid;AN.last=last}else anSession(AN.entry,true);
  AN.pre.splice(0).forEach(e=>{e.sid=AN.sid;anPush(e)});
  if(AN.qp.n||AN.qp.k){const nid=AN.qp.n;track('notif_open',{kind:AN.qp.k||null,from:'push',notif_id:anNid(nid)});
    try{const u=new URL(location.href);u.searchParams.delete('n');u.searchParams.delete('k');history.replaceState(null,'',u.pathname+u.search+u.hash)}catch(e){}
    if(typeof ME!=='undefined'&&ME){const n=NOTIFS.find(x=>String(x.id)===String(nid)&&x.user_id===ME.id);if(n){AN.ctx='notif';nrOpen(n)}}}}
const anNid=x=>x==null?null:/^\d+$/.test(String(x))?+x:String(x);
setTimeout(anBoot,0);
if(AN_BUILD==='pwa')addEventListener('hashchange',()=>anRoute());

(function(){
const now=()=>Date.now(),me=()=>typeof ME!=='undefined'&&ME?ME.id:null,gOf=id=>GAMES.find(x=>x.id===id);
const mts=g=>g?Math.round((new Date(g.starts_at)-now())/6e4):null;
const wrap=(n,f)=>{const o=window[n];if(typeof o==='function')window[n]=f(o)};
const apiWrap=(n,f)=>{const o=api[n];if(typeof o==='function')api[n]=f(o)};
const later=f=>setTimeout(()=>{try{f()}catch(e){}},0);
const VIA=['list','map','chat','notif','card','mine','detail'];
const gVia=()=>VIA.includes(AN.ctx)?AN.ctx:'detail';
const gid=d=>d&&d.g||(typeof UI!=='undefined'&&(UI.detail||UI.sel))||null;
const active=p=>!!p&&p.status!=='withdrawn'&&p.status!=='left';
const myPart=id=>PARTS.find(p=>p.game_id===id&&p.user_id===me()&&active(p));
const wlock=id=>{try{const c=api.get(id);if(c&&womenLock0(c))track('women_lock_view',{game_id:id,logged_in:!!me()})}catch(e){}};
const days=()=>ME&&ME.created_at?Math.floor((now()-ME.created_at)/864e5):null;

/* ---------- 页面与浏览 ---------- */
wrap('render',o=>function(){const r=o.apply(this,arguments);try{
    if(AN_BUILD==='web'){if(UI.landing&&UI.landing!==AN.land){AN.land=UI.landing;const c=api.byCode&&api.byCode(UI.landing);if(c){anSync();track('game_view',{...anGame(c.id),via:AN.qp.s?'share_link':'link'});wlock(c.id)}}if(!UI.landing)AN.land=null}
    anSync()}catch(e){}return r});
wrap('openDetail',o=>function(id,landing){const was=UI.detail;const r=o.apply(this,arguments);anSync();
  if(id&&was!==id){track('game_view',{...anGame(id),via:landing?(AN.qp.s?'share_link':'link'):gVia()});wlock(id)}return r});
wrap('select',o=>function(id){const was=UI.sel;const r=o.apply(this,arguments);anSync();if(id&&was!==id){track('game_view',{...anGame(id),via:gVia()});wlock(id)}return r});
wrap('selectGame',o=>function(id,scroll){const was=UI.sel;const r=o.apply(this,arguments);if(scroll&&id&&id!==was)track('game_select',{game_id:id});return r});   // PWA 地图：只是选中，不算打开详情
wrap('togglePop',o=>function(){const r=o.apply(this,arguments);const p=document.getElementById('pop');if(p&&p.classList.contains('show'))anOverlay('notif');else anSync();return r});
['closeSheet','closeModal'].forEach(n=>wrap(n,o=>function(){const back=typeof UI!=='undefined'&&(UI.sheetBack||UI.modalBack);AN.back=!!back;try{return o.apply(this,arguments)}finally{AN.back=false;later(anSync)}}));
addEventListener('click',()=>later(anSync));

/* ---------- 登录 ---------- */
function trig(next){if(AN.trig)return AN.trig;const el=AN.clickEl,d=el&&el.closest&&(el.closest('[data-a],[data-iv]')||{}).dataset||{};
  if(next&&next===window.openCreate||d.a==='create')return'create';if(d.a==='apply')return'apply';if(d.a==='myCard'||d.a==='custom')return'card';
  if(d.iv==='new')return'invite';if(d.a==='login')return/女生/.test(el.textContent||'')?'women':'manual';return'other'}
wrap('openAuth',o=>function(next,why){
  if(document.getElementById('otp')&&AUTH&&AN.login)return o.call(this,AUTH.next,AN.login.why);   // 验证码页「修改手机号」：还是同一次登录
  AN.login={trigger:trig(next),why};const r=o.apply(this,arguments);track('login_open',{trigger:AN.login.trigger});anOverlay('login');return r});
wrap('openOtp',o=>function(){const r=o.apply(this,arguments);track('login_send_code',{cc:AUTH.cc});return r});   // 号码格式不对时不会走到这里
wrap('openNewProfile',o=>function(){track('login_verify',{ok:true});return o.apply(this,arguments)});
apiWrap('login',o=>function(p){const r=o.apply(this,arguments);if(ME){ME.created_at=ME.created_at||now();anIdentity();
    track('login_success',{is_new:true,trigger:(AN.login||{}).trigger||'other',entry:AN.entry});
    track('signup_complete',{ntrp:ME.ntrp,clubs_n:(ME.home_club_ids||[]).length,gender_given:!!ME.gender,avatar_kind:ME.avatar_kind||'letter'});AN.login=null}return r});
wrap('setWho',o=>function(){const r=o.apply(this,arguments);anIdentity();return r});
addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-a="logout"]');if(!b||!me())return;track('logout');later(()=>{if(!me())anNewAnon()})},true);

/* ---------- 发现：筛选 · 换天 · 视图 · 选区 · 地图 ---------- */
const sbVia=name=>{const q=(typeof SBS!=='undefined'&&SBS.q||'').trim();if(q)return'search';if(typeof SBS!=='undefined'&&SBS.letter)return'letter';try{if(sbRecentList().includes(name))return'recent'}catch(e){}return'hot'};
addEventListener('click',e=>{const t=e.target;if(!t.closest)return;const el=t.closest('[data-flv],[data-fty],[data-radius],[data-mode],[data-day],[data-fday],[data-mapday],[data-vc],[data-suburb],[data-center],[data-a="prev"],[data-a="next"],[data-sx="ftag"]');if(!el)return;
  const d=el.dataset,pre={mode:UI.mode,day:UI.day,page:UI.page,radius:F.radius,tags:new Set(F.tags||[]),lv:new Set(F.levels),ty:new Set(F.types),loc:LOC.label,map:UI.mapDay};
  const sub=d.suburb?sbVia(d.suburb):null,strip=!!el.closest('#week');
  later(()=>{
    if(d.flv!=null){const b=+d.flv;if(pre.lv.has(b)!==F.levels.has(b))track('filter_utr_band',{band:b,on:F.levels.has(b)});return}
    if(d.fty){if(pre.ty.has(d.fty)!==F.types.has(d.fty))track('filter_type',{type:d.fty,on:F.types.has(d.fty)});return}
    if(d.sx==='ftag'){const k=d.v,on=!!(F.tags&&F.tags.has(k));if(pre.tags.has(k)!==on)track('filter_tag',{tag:k,on});return}
    if(d.radius){if(pre.radius!==F.radius)track('filter_radius',{km:F.radius});return}
    if(d.mode){const n=x=>x==='cal'?'agenda':x;if(pre.mode!==UI.mode)track('view_mode',{mode:n(UI.mode)});return}
    if(d.day!=null){if(pre.day!==UI.day)track('day_select',{offset:UI.day,via:strip?'strip':'next_day'});return}
    if(d.fday!=null){if(pre.day!==UI.day)track('day_select',{offset:UI.day,via:'next_day'});return}
    if(d.a==='prev'||d.a==='next'){if(pre.page!==UI.page)track('day_select',{offset:UI.page,via:'pager'});return}
    if(d.mapday!=null){if(pre.map!==UI.mapDay)track('map_day',{day:UI.mapDay});return}
    if(d.vc){track('map_cluster_open',{venue_id:d.vc});return}
    if(d.suburb){if(LOC.label===d.suburb)track('loc_suburb_pick',{suburb:d.suburb,via:sub});return}
    if(d.center){track('loc_suburb_pick',{suburb:LOC.label,via:'club'});return}})},true);
wrap('subPick',o=>function(name){const i=document.getElementById('fSub'),q=i&&i.value!==LOC.label?i.value.trim():'',via=q?'search':sbVia(name);const r=o.apply(this,arguments);if(LOC.label===name)track('loc_suburb_pick',{suburb:name,via});return r});   // 网页选区
wrap('requestLocation',o=>function(){AN.loc=true;return o.apply(this,arguments)});
wrap('setLoc',o=>function(a,b,c,src){const r=o.apply(this,arguments);if(AN.loc&&src==='gps'){AN.loc=false;track('location_allow',{result:'granted'})}return r});
wrap('fallbackLoc',o=>function(msg){if(AN.loc){AN.loc=false;track('location_allow',{result:/目前不在.+附近/.test(msg||'')?'outside':'denied'})}return o.apply(this,arguments)});
wrap('openFilter',o=>function(){const r=o.apply(this,arguments);anOverlay('filter');return r});

/* ---------- 球局：发起 · 修改 · 顺延 · 取消 · 申请 · 加入 · 退出 · 处理申请 ---------- */
apiWrap('create',o=>function(d){const id=o.apply(this,arguments);AN.created=id;return id});
wrap('ngInit',o=>function(){const r=o.apply(this,arguments);later(()=>{if(NG&&!NG.edit&&AN.ngSeen!==NG){AN.ngSeen=NG;track('game_create_start');anOverlay('create')}});return r});
wrap('ngPublish',o=>function(){const edit=NG&&NG.edit;AN.created=null;const r=o.apply(this,arguments);const g=!edit&&AN.created&&gOf(AN.created);
  if(g&&g.host_id===me()){const c=V(g);track('game_create_submit',{game_id:g.id,type:g.game_type,venue_id:g.venue_id,minutes_to_start:mts(g),dur:g.duration_min,utr_min:g.ntrp_min,utr_max:g.ntrp_max,
    join_mode:g.join_mode||'approve',hide_done:!!g.hide_done,repeat:!!g.series_id,spots:c.spots,women:isW(g)})}return r});
wrap('geApply',o=>function(c,f,d){const fields=[...d.key.map(x=>x[0]),...d.lite].map(x=>AN_FIELD[x]||x),n=c.appr.filter(p=>p.user_id!==c.host_id).length;const r=o.apply(this,arguments);
  track('game_edit',{game_id:c.id,fields,minutes_to_start:mts(gOf(c.id)),approved_n:n});return r});
addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-uf]');if(!b)return;const k=b.dataset.uf,id=b.dataset.g,g=gOf(id);if(!g)return;const from=g.starts_at,lv=[g.ntrp_min,g.ntrp_max];
  later(()=>{if(k==='delayGo'){if(g.starts_at!==from){track('game_postpone',{game_id:id,from,to:g.starts_at});track('unfilled_action',{game_id:id,action:'delay'})}return}
    if(k==='widen'&&(g.ntrp_min!==lv[0]||g.ntrp_max!==lv[1])||['share','cancel','again'].includes(k))track('unfilled_action',{game_id:id,action:k})})},true);
wrap('openCancelGame',o=>function(id){const r=o.apply(this,arguments);track('game_cancel_open',{game_id:id});return r});
apiWrap('cancelGame',o=>function(id){const g=gOf(id),c=g&&V(g),was=g&&g.status,host=g&&g.host_id===me();const r=o.apply(this,arguments);
  if(host&&was!=='cancelled'&&g.status==='cancelled')track('game_cancel',{game_id:id,minutes_to_start:mts(g),approved_n:c.appr.filter(p=>p.user_id!==g.host_id).length,pending_n:c.pend.length});return r});
wrap('openApply',o=>function(id){const r=o.apply(this,arguments);if(me())track('game_apply_open',{game_id:id});return r});
apiWrap('apply',o=>function(id,msg){const r=o.apply(this,arguments);const p=myPart(id);
  if(p&&p.status==='pending')track('game_apply_submit',{game_id:id,minutes_to_start:mts(gOf(id)),played_n:stats(me()).played,avatar_kind:ME.avatar_kind||'letter',has_message:!!String(msg||'').trim()});return r});
apiWrap('join',o=>function(id){const r=o.apply(this,arguments);const p=myPart(id);if(p&&p.status==='approved')track('game_join_instant',{game_id:id,minutes_to_start:mts(gOf(id))});return r});
apiWrap('leave',o=>function(id){const p=myPart(id),was=p&&p.status,grace=!!(p&&ugGrace(p)),chg=!!(p&&p.chg&&!p.chg.ack);const r=o.apply(this,arguments);
  if(p&&!active(p)){if(was==='pending')track('apply_withdraw',{game_id:id});else if(was==='approved')track('game_leave',{game_id:id,minutes_to_start:mts(gOf(id)),grace,after_change:chg})}return r});
// 改了时间 / 地点后「来不了」：直接退出，也是一次退出
addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-ge="out"]');if(!b)return;const id=b.dataset.g,p=myPart(id);if(!p||p.status!=='approved')return;const grace=ugGrace(p);
  later(()=>{if(!active(p))track('game_leave',{game_id:id,minutes_to_start:mts(gOf(id)),grace,after_change:true})})},true);
wrap('openLeave',o=>function(id){const r=o.apply(this,arguments);const c=api.get(id);if(c&&c.mine==='approved')track('game_leave_open',{game_id:id});return r});
apiWrap('decide',o=>function(id,uid,ok){const p=PARTS.find(x=>x.game_id===id&&x.user_id===uid&&x.status==='pending'),g=gOf(id),host=!!g&&g.host_id===me();const r=o.apply(this,arguments);
  if(r!==false&&host&&p&&p.status!=='pending'){const e={game_id:id,target_uid:uid,ok:!!ok,has_note:!!p.note,viewed_card:(AN.cardAt[uid]||0)>=(p.created_at||0),ms_since_request:Math.max(0,now()-(p.created_at||now()))};
    if(!ok)e.reason=['known','level','pass'].includes(p.reason)?p.reason:'pass';track('host_decide',e)}return r});
addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-rq]');if(!b)return;const d=b.dataset;
  if(d.rq==='sort'&&(RQ.sort[d.g]||'rec')!==d.v)track('req_sort',{game_id:d.g,sort:d.v});if(d.rq==='more')track('req_expand',{game_id:d.g})},true);

/* ---------- 分享 ---------- */
wrap('openShare',o=>function(id){const r=o.apply(this,arguments);track('game_share_open',{game_id:id});anOverlay('game_share');return r});
wrap('openPoster',o=>function(id){const r=o.apply(this,arguments);track('poster_open',{game_id:id});anOverlay('poster');return r});

/* ---------- 球员卡 ---------- */
const cardShown=uid=>{const c=document.querySelector(`#sheet .pc[data-card="${uid}"],#modal .pc[data-card="${uid}"]`);return !!c&&anOverlayOn()&&AN.overlay==='player_card'};
wrap('openCard',o=>function(uid){const again=AN.back||cardShown(uid);const r=o.apply(this,arguments);
  if(!again){AN.cardAt[uid]=now();const own=me()===uid,via=AN.cardVia||(['recap','request'].includes(AN.ctx)?AN.ctx:gVia());AN.cardVia=null;
    track('card_view',{target_uid:uid,own,via,...(own?anCard():{})});if(own&&AN_BUILD==='web')track('card_custom_open',{days_since_signup:days()})}   // 网页：自己的卡上直接能个性化
  anOverlay('player_card');return r});
wrap('openCustom',o=>function(){const r=o.apply(this,arguments);track('card_custom_open',{days_since_signup:days()});return r});
addEventListener('click',e=>{const el=e.target.closest&&e.target.closest('[data-avc],[data-akind],[data-an],[data-roll],[data-cth]');if(!el||!me())return;const d=el.dataset;
  const pre={color:ME.color,kind:ME.avatar_kind,animal:ME.animal,roll:ME.seal_roll||0,theme:ME.card_theme||'court'};
  later(()=>{if(!ME)return;let f=null,v=null;
    if(d.avc!=null&&ME.color!==pre.color){f='color';v=ME.color}
    else if(d.an!=null&&(ME.animal!==pre.animal||pre.kind!=='animal')){f='animal';v=ME.animal}
    else if(d.akind!=null&&ME.avatar_kind!==pre.kind){f='avatar_kind';v=ME.avatar_kind}
    else if(d.roll!=null&&(ME.seal_roll||0)!==pre.roll){f='seal';v=typeof sealOf==='function'?sealOf(ME):String(ME.seal_roll)}
    else if(d.cth!=null&&(ME.card_theme||'court')!==pre.theme){f='theme';v=ME.card_theme}
    if(f)track('card_customize',{field:f,value:v,...anCard()})})},true);
wrap('saveCard',o=>function(uid){const r=o.apply(this,arguments);SC._to=SC.to;track('card_share_open',{target_uid:uid,...(uid===me()?anCard():{})});anOverlay('card_share');return r});
// 分享图生成：耗时 / 失败；超过 8 秒算超时（分享按钮会改成保存图片 + 复制文案）
wrap('scBlob',o=>function(uid){const t0=now();return o.apply(this,arguments).then(b=>{track('card_image_render',{ms:now()-t0,ok:!!b});if(!b)track('card_share_error',{reason:window.html2canvas?'render':'no_renderer'});return b})});
scBlobT=function(uid){let done=false;const p=scBlob(uid).then(b=>{done=true;return b});return Promise.race([p,new Promise(r=>setTimeout(()=>{if(!done)track('card_share_error',{reason:'timeout'});r(null)},8000))])};
// 换渠道（朋友圈 / 小红书）：分享图上的二维码带不同的 s=，重新生成
wrap('scRender',o=>function(){const r=o.apply(this,arguments);if(SC.uid&&SC._to!==SC.to){SC._to=SC.to;const uid=SC.uid,to=SC.to;SC.blob=null;SC.busy=true;scBtn();
  scBlobT(uid).then(b=>{if(SC.uid!==uid||SC.to!==to)return;SC.blob=b;SC.busy=false;scBtn()})}return r});
scGo=function(){const uid=SC.uid,to=SC.to,text=scCopyText(uid,to),app=to==='xhs'?'小红书':'微信',blob=SC.blob,ev=ok=>track('card_share',{channel:to,action:'go',ok});
  try{navigator.clipboard&&navigator.clipboard.writeText(text).catch(()=>{})}catch(e){}
  const fallback=()=>{if(blob){scDownload(blob,uid);toast(`图片已保存，文案已复制 · 打开${app}发布即可`)}else toast(typeof ENV!=='undefined'&&ENV==='wechat'?'长按上面的图片保存，文案已复制':'文案已复制，截图即可分享');ev(!!blob)};
  const file=blob&&new File([blob],`nanbanqiu-${fmtNo(U(uid).no)}.png`,{type:'image/png'});
  if(file&&navigator.canShare&&navigator.canShare({files:[file]})){try{navigator.share({files:[file],text}).then(()=>ev(true),err=>{if(!err||err.name!=='AbortError'){track('card_share_error',{reason:'share_'+(err&&err.name||'error')});fallback()}else ev(false)})}catch(err){track('card_share_error',{reason:'share_'+(err&&err.name||'error')});fallback()}return}
  fallback()};
addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-sc]');if(!b)return;const a=b.dataset.sc;
  if(a==='save'){e.stopPropagation();const uid=SC.uid,to=SC.to;(SC.blob?Promise.resolve(SC.blob):scBlobT(uid)).then(bl=>{if(bl){scDownload(bl,uid);toast('图片已保存')}else toast('保存失败，请截图保存');track('card_share',{channel:to,action:'save',ok:!!bl})});return}
  if(a==='link')track('card_share',{channel:SC.to,action:'link',ok:true})},true);

/* ---------- 打完之后：多遇到 · 感受 · 印象 · 完成 · TA 没来 · 申诉 ---------- */
addEventListener('click',e=>{const t=e.target;if(!t.closest||!me())return;const b=t.closest('[data-rc],[data-pcp],[data-rcx],[data-sx="impPick"],[data-nsa]');if(!b)return;const d=b.dataset,m=me();
  if(d.rc==='more'||d.rc==='ok'||d.rc==='less'||d.pcp){const v=d.rc||d.pcp,prev=opinOf(m,d.u);later(()=>{if(opinOf(m,d.u)!==prev)track('pref_set',{target_uid:d.u,value:v,prev,via:d.pcp?'card':'recap'})});return}
  if(d.rc==='feel'){const a=AFTER[d.g+'|'+m]||{},pre=a.feel;later(()=>{const x=(AFTER[d.g+'|'+m]||{}).feel;if(x&&x!==pre)track('feel_set',{game_id:d.g,value:x})});return}
  if(d.rc==='done'){const g=gOf(d.g),os=g?rcOthers(g,m):[],a=AFTER[d.g+'|'+m]||{};
    const n=os.filter(u=>opinOf(m,u)!=='ok').length+(a.feel?1:0)+os.filter(u=>(KUDOS.get(m+'|'+u+'|'+d.g)||[]).length).length;later(()=>track('recap_done',{game_id:d.g,n_set:n}));return}
  if(d.rcx==='tag'||d.sx==='impPick'){const k=m+'|'+d.u+'|'+d.g,pre=(KUDOS.get(k)||[]).includes(d.v);later(()=>{const on=(KUDOS.get(k)||[]).includes(d.v);if(on!==pre)track('impression_give',{target_uid:d.u,tag:d.v,on,bulk:false})});return}
  if(d.rcx==='all'){const g=gOf(d.g),os=g?rcOthers(g,m):[],pre=os.filter(u=>!(KUDOS.get(m+'|'+u+'|'+d.g)||[]).length);
    later(()=>pre.forEach(u=>{if((KUDOS.get(m+'|'+u+'|'+d.g)||[]).length)track('impression_give',{target_uid:u,tag:'like',on:true,bulk:true})}));return}
  if(d.rcx==='nsok'||d.rcx==='nsundo'){const k=nsKey(d.g,d.u),pre=!!(NS[k]&&NS[k].has(m)),g=gOf(d.g);
    later(()=>{const on=!!(NS[k]&&NS[k].has(m));if(on===pre)return;if(on)track('noshow_report',{game_id:d.g,target_uid:d.u,role:g&&g.host_id===m?'host':'player'});else track('noshow_undo',{game_id:d.g,target_uid:d.u})});return}
  if(d.nsa&&d.nsa!=='ok'){const k=nsKey(d.g,m),pre=!!NS_APPEAL[k];later(()=>{if(!pre&&NS_APPEAL[k])track('noshow_appeal',{game_id:d.g,reason:d.nsa})})}},true);
wrap('rcOpen',o=>function(id){const ok=me()&&rcEligible(gOf(id),me());const r=o.apply(this,arguments);if(ok)track('recap_open',{game_id:id,via:AN.ctx==='notif'?'notif':'detail'});return r});

/* ---------- 成长：徽章 · 等级 ---------- */
wrap('bdgShow',o=>function(uid,code){const self=me()===uid,rec=(BDG[uid]||{})[code],isNew=self&&rec&&!rec.seen;const r=o.apply(this,arguments);
  if(document.getElementById('bdgFx'))track('badge_view',{code,via:isNew?'ceremony':AN.ctx==='notif'?'notif':self?'wall':'card'});return r});
addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-bsh]');if(!b||typeof BSH==='undefined')return;const k=b.dataset.bsh;
  if(k==='save'||k==='copy')track('badge_share',{code:BSH.code,to:BSH.to,action:k});
  if(k==='to'&&b.dataset.v!==BSH.to){const{uid,code}=BSH,to=b.dataset.v;later(()=>bdgPoster2(uid,code).then(cv=>{if(BSH.uid!==uid||BSH.code!==code||BSH.to!==to)return;BSH.cv=cv;BSH.url=cv.toDataURL('image/png');bshDraw()}))}},true);   // 二维码跟着渠道走
wrap('lvShow',o=>function(uid){const r=o.apply(this,arguments);try{track('level_view',{lv:LVREC[uid].lv+1})}catch(e){}return r});

/* ---------- 通知：列表 · 横幅 · 系统通知（推送） ---------- */
addEventListener('click',e=>{const t=e.target;if(!t.closest||!me())return;const row=t.closest('#scr-notif .ntf,#notifBody .ntf,#pop .ntf');if(!row||t.closest('button,a,[data-user],[data-sx],[data-a]'))return;
  const id=row.dataset.ntfo||row.dataset.wn;let n=null;
  if(id&&id.startsWith('rg'))n={kind:'request_group',id};else if(id)n=NOTIFS.find(x=>String(x.id)===String(id));
  else if(row.dataset.iv==='view')n=NOTIFS.find(x=>x.user_id===me()&&String(x.invite_id)===String(row.dataset.i));
  if(n)track('notif_open',{kind:n.kind,from:'list',notif_id:anNid(n.id)})},true);
wrap('nrDeliver',o=>function(n){const was=AN.curN;AN.curN=n;try{return o.apply(this,arguments)}finally{AN.curN=was}});
const tapOf=(n,tap,from)=>()=>{if(n&&n.id!=null)track('notif_open',{kind:n.kind,from:typeof from==='function'?from():from,notif_id:anNid(n.id)});AN.ctx='notif';tap&&tap()};
wrap('pushBanner',o=>function(t,b,tap){return o.call(this,t,b,tapOf(AN.curN,tap,'banner'))});
wrap('deskNotify',o=>function(t,b,tap){const hid=document.hidden;return o.call(this,t,b,tapOf(AN.curN,tap,hid?'push':'banner'))});
// 页面在后台：系统通知（真实环境由 Service Worker 显示；点开带 ?n=&k=，见 sw.js）
nrSysNotify=function(t,b,tap,n){if(!PUSH.enabled||!('Notification'in window)||Notification.permission!=='granted')return;
  const tag=(n&&n.kind||'n')+'-'+(n&&(n.game_id||n.invite_id)||''),tp=tapOf(n,tap,'push'),g=n&&n.game_id&&gOf(n.game_id);
  const go=x=>{try{x.onclick=()=>{window.focus();tp();x.close()}}catch(e){}};
  const data={url:g?'/g/'+g.share_code:'/',kind:n&&n.kind||null,notif_id:n&&n.id!=null?n.id:null};
  if(navigator.serviceWorker&&navigator.serviceWorker.getRegistration){navigator.serviceWorker.getRegistration().then(r=>{if(r)r.showNotification(t,{body:b,tag,data});else{try{go(new Notification(t,{body:b,tag}))}catch(e){}}}).catch(()=>{try{go(new Notification(t,{body:b,tag}))}catch(e){}})}
  else{try{go(new Notification(t,{body:b,tag}))}catch(e){}}};
{const old=nrOpen;wrap('nrOpen',o=>function(n){const r=o.apply(this,arguments);if(n&&n.kind==='follow_game')track('follow_open',{game_id:n.game_id});return r});if(window.ntfOpen===old)ntfOpen=nrOpen}
wrap('nrSettings',o=>function(){const r=o.apply(this,arguments);if(me())track('notif_settings_open');return r});
wrap('enablePush',o=>function(){const env=AENV.env;
  if(AN_BUILD==='pwa'&&typeof ENV!=='undefined'&&ENV==='safari')return o.apply(this,arguments);            // 先引导添加到主屏幕（a2hs_open）
  if(AN_BUILD==='pwa'&&typeof ENV!=='undefined'&&ENV==='wechat'||!('Notification'in window)){track('push_enable',{result:'unsupported',env});return o.apply(this,arguments)}
  if(Notification.permission==='denied'){track('push_enable',{result:'denied',env});return o.apply(this,arguments)}
  const rp=Notification.requestPermission;let asked=false;
  try{Notification.requestPermission=function(){asked=true;const p=rp.apply(Notification,arguments);Promise.resolve(p).then(x=>track('push_enable',{result:x==='granted'?'granted':'denied',env}),()=>track('push_enable',{result:'denied',env}));return p};
    return o.apply(this,arguments)}finally{Notification.requestPermission=rp;if(!asked)track('push_enable',{result:'unsupported',env})}});
['openA2HS','openWxGuide'].forEach(n=>wrap(n,o=>function(){const r=o.apply(this,arguments);track('a2hs_open',{env:AENV.env});return r}));
addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-em]');if(!b||!me())return;const k=b.dataset.em;
  if(k==='save'){const v=((document.getElementById('emkIn')||{}).value||'').trim();if(emOK(v))track('email_settings_save',{on:true})}
  if(k==='setSave'){const v=((document.getElementById('emSet')||{}).value||'').trim();if(!v||emOK(v))track('email_settings_save',{on:!!v})}
  if(k==='off')track('email_settings_save',{on:false})},true);

/* ---------- 安全：球友约定 · 开打前 · 屏蔽 ---------- */
[['gateApply','apply'],['openCreate','create'],['newInvite','invite'],['finishAccept','accept']].forEach(([n,via])=>wrap(n,o=>function(){const was=AN.pctx;AN.pctx=was||via;try{return o.apply(this,arguments)}finally{AN.pctx=was}}));
wrap('pactGate',o=>function(next){const gate=me()&&!ME.pact_at;if(gate)AN.pactVia=AN.pctx||'apply';const r=o.apply(this,arguments);if(gate)track('pact_view',{via:'gate'});return r});
addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-pact="ok"]');if(!b||!me()||ME.pact_at)return;const via=AN.pactVia||'apply';later(()=>{if(ME&&ME.pact_at){AN.pactVia=null;track('pact_accept',{via})}})},true);
wrap('pactOpen',o=>function(){const r=o.apply(this,arguments);track('pact_view',{via:'detail'});return r});
wrap('soonOpen',o=>function(id){const r=o.apply(this,arguments);if(api.get(id)){track('soon_open',{game_id:id});track('pact_view',{via:'soon'})}return r});
wrap('openSafety',o=>function(){const r=o.apply(this,arguments);track('safety_open');track('pact_view',{via:'safety'});anOverlay('safety');return r});
wrap('openContact',o=>function(){const r=o.apply(this,arguments);track('contact_open');return r});
wrap('openCommunity',o=>function(){const r=o.apply(this,arguments);track('community_open');anOverlay('community');return r});
apiWrap('block',o=>function(uid){const r=o.apply(this,arguments);track('user_block',{target_uid:uid});return r});
apiWrap('unblock',o=>function(uid){const r=o.apply(this,arguments);track('user_unblock',{target_uid:uid});return r});
apiWrap('setClubs',o=>function(ids){const r=o.apply(this,arguments);track('home_clubs_save',{n:(ids||[]).length});return r});

/* ---------- 消息：打开对话 · 发消息（不记内容） ---------- */
addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-cx],[data-sn="chat"]');if(!b||!me())return;const d=b.dataset;
  if(d.sn==='chat'||d.cx==='game')track('chat_open',{type:'game'});else if(d.cx==='dm')track('chat_open',{type:'dm'});
  else if(d.cx==='open'){const t=THREADS.find(x=>x.id===d.t);if(t)track('chat_open',{type:t.type})}
  else if(d.cx==='quick')AN.quick=true},true);
wrap('cxSend',o=>function(){const quick=!!AN.quick;AN.quick=false;const t=THREADS.find(x=>x.id===CXCUR),n0=MSGS.length;const r=o.apply(this,arguments);
  if(t&&MSGS.length>n0&&MSGS[MSGS.length-1].from===me())track('chat_send',{type:t.type,quick});return r});

/* ---------- 我的：性别（不记值） ---------- */
wrap('setGender',o=>function(to){const from=ME&&ME.gender;const r=o.apply(this,arguments);if(ME&&ME.gender!==from)track('gender_set',{first:!from,changed:!!from});return r});

/* ---------- 约 TA 打球 ---------- */
wrap('newInvite',o=>function(to){const f0=IVF;const r=o.apply(this,arguments);if(IVF&&IVF!==f0&&IVF.kind==='new'&&IVF.to===to){track('invite_open',{target_uid:to,played_together:playedTogether(me(),to)});anOverlay('invite')}return r});
wrap('sendInvite',o=>function(){const i0=INVITES[0];const r=o.apply(this,arguments);const i=INVITES[0];
  if(i&&i!==i0&&i.from===me())track('invite_send',{invite_id:i.id,target_uid:i.to,played_together:playedTogether(i.from,i.to)});return r});
wrap('finishAccept',o=>function(i){const was=i&&i.status;const r=o.apply(this,arguments);if(i&&was!=='accepted'&&i.status==='accepted')track('invite_accept',{invite_id:i.id});return r});
wrap('invAct',o=>function(act,el){const i=typeof IVP!=='undefined'&&IVP&&invOf(IVP.id),pre=i&&{status:i.status,counter:i.counter,to:i.to};const r=o.apply(this,arguments);
  if(i&&pre){if(act==='noGo'&&pre.status!=='declined'&&i.status==='declined')track('invite_decline',{invite_id:i.id,reason:el&&el.dataset.v||'pass',has_note:!!i.noNote});
    if(act==='sendCounter'&&i.status==='counter'&&i.counter!==pre.counter)track('invite_counter_send',{invite_id:i.id});
    if(act==='withdraw'&&i.status!==pre.status)track('invite_withdraw',{invite_id:i.id,what:pre.status==='counter'&&pre.to===me()?'counter':'invite'})}return r});
addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-ivset]');if(!b||!me()||b.dataset.ivset==='open')return;track('invite_setting',{value:b.dataset.ivset})},true);

/* ---------- 其余按钮：字典里的点击事件；没登记的记 ui_action ----------
 * null = 已经由上面的结果事件 / 打开事件覆盖，不再重复记 */
const G=d=>({game_id:gid(d)});
const AN_MAP={
  a:{filter:d=>(anOverlay('filter'),['filter_open']),filterModal:d=>(anOverlay('filter'),['filter_open']),fReset:'filter_reset',
     copyLink:d=>['share_copy_link',G(d)],copyText:d=>['share_copy_text',G(d)],sysShare:d=>['share_system',G(d)],ics:d=>['calendar_add',G(d)],
     editClubs:'club_add_open',report:d=>ME?['report_open',{target_type:'user',via:'card'}]:null,
     apply:null,doApply:null,approve:null,reject:null,leave:null,doLeave:null,cancelGame:null,doCancelGame:null,share:null,poster:null,saveCard:null,doSaveCard:null,myCard:null,custom:null,
     login:null,sendCode:null,npDone:null,logout:null,enablePush:null,create:null,publish:null,safety:null,contact:null,community:null,commOpen:null,doBlock:null,unblock:null,
     saveClubs:null,addClub:null,nrSet:null,prev:null,next:null,today:null,notif:null,a2hs:null,wxguide:null,locAllow:null},
  sx:{softNo:d=>['host_decline_open',{game_id:d.g,target_uid:d.u}],lvinfo:'level_info_open',xhsCopy:d=>['share_xhs_copy',G(d)],dlPoster:d=>['poster_download',G(d)],
      endSeries:d=>['series_end',G(d)],gender:d=>me()?['gender_open']:null,softNoGo:null,impPick:null,gConfirm:null,ftag:null},
  iv:{new:null,send:null,accept:null,noGo:null,sendCounter:null,withdraw:null},
  ng:{publish:null},
  cx:{send:null,quick:null,dm:null,game:null,open:null,report:()=>{const t=THREADS.find(x=>x.id===CXCUR);return t?['report_open',{target_type:t.type==='dm'?'user':'game',via:'chat'}]:null}},
  sc:{go:null,save:null,link:null,to:null}};
document.addEventListener('click',e=>{const el=e.target.closest&&e.target.closest('[data-a],[data-sx],[data-iv],[data-ng],[data-cx],[data-sc]');if(!el)return;const d={...el.dataset};
  later(()=>{for(const k of ['a','sx','iv','ng','cx','sc']){if(d[k]==null)continue;const v=d[k],M=AN_MAP[k]||{};
    if(!(v in M)){const p={attr:k,action:v};if(d.g)p.game_id=d.g;if(d.u)p.target_uid=d.u;track('ui_action',p);return}
    const x=typeof M[v]==='function'?M[v](d):M[v];if(!x)return;const[name,props]=Array.isArray(x)?x:[x];track(name,props||{});return}})},true);
})();


