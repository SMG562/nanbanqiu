// 埋点 v2 端到端验证：两端用真实界面操作走一遍，检查每个动作的事件「只发一次、props 齐全、两端一致、都在字典里」
// 运行：NODE_PATH=$(npm root -g) node verify.js
const {chromium}=require('playwright');const fs=require('fs');
const SPEC=new Set(fs.readFileSync(require('path').join(__dirname,'..','spec','events_spec.md'),'utf8').split('\n').map(l=>(l.match(/^\| ([a-z0-9_]+) \|/)||[])[1]).filter(Boolean));
const NOISE=new Set(['page_view','page_time','ui_action','app_hide','app_show','card_image_render','game_view','women_lock_view','card_share_error']);
const FAKE=+new Date('2026-10-14T13:10:00+11:00');
let pass=0,fail=0;const R={PWA:{},Web:{}},ALL={PWA:[],Web:[]};
const T=(n,ok,x='')=>{ok?pass++:fail++;if(!ok)console.log('FAIL '+n,typeof x==='string'?x:JSON.stringify(x))};
const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const match=(p,want)=>Object.entries(want).every(([k,v])=>typeof v==='function'?v(p[k],p):eq(p[k],v));
async function ctxFor(b,plat,{fresh=true}={}){const vp=plat==='PWA'?{width:390,height:844}:{width:1360,height:860};
  const ctx=await b.newContext({viewport:vp});
  await ctx.addInitScript(ts=>{const off=ts-Date.now(),D=Date;class FD extends D{constructor(...a){a.length?super(...a):super(D.now()+off)}static now(){return D.now()+off}};window.Date=FD;window.AN_LOG=[]},FAKE);
  return ctx}
const URL0=p=>'file:///mnt/user-data/outputs/南伴球_'+p+'.html';

async function run(b,plat){const W=plat==='Web',ctx=await ctxFor(b,plat),pg=await ctx.newPage(),errs=[];pg.on('pageerror',x=>errs.push(x.message));
  const ev=async()=>pg.evaluate(()=>AN_LOG.splice(0));
  const js=(f,a)=>pg.evaluate(f,a);
  const wait=ms=>pg.settle(ms);
  const clean=()=>js(()=>{['banner','dn'].forEach(i=>{const x=document.getElementById(i);if(x)x.classList.remove('show')});const w=document.getElementById('wxg');if(w)w.hidden=true});
  const noFx=()=>js(()=>{const f=document.getElementById('bdgFx');if(f)f.remove()});
  const click=async(sel,o={})=>{await pg.locator(sel).first().click({timeout:6000,...o})};
  const close=()=>js(W=>{W?closeModal():closeSheet()},W);
  const SH=W?'#modal':'#sheet',DET=W?'#colR':'#detail';
  const openGame=id=>js(([id,W])=>{AN.ctx='list';if(W){UI.tab='disc';select(id)}else{if(UI.detail)closeDetail();openDetail(id)}},[id,W]);
  const goTab=t=>js(([t,W])=>{if(W){if(t==='notif'){togglePop(true);return}closeModal();UI.landing=null;UI.tab=t;UI.sel=null;render()}else{closeSheet();if(UI.detail)closeDetail();if(t==='notif')UI.msgTab='ntf';if(t==='chat'){UI.msgTab='chat';t='notif'}go(t)}},[t,W]);
  const who=u=>js(u=>{typeof closeSheet==='function'?closeSheet():closeModal();if(typeof closeDetail==='function'&&UI.detail)closeDetail();setWho(u,true)},u);
  async function S(name,expect,fn,opt={}){if(!opt.keep)await clean();await ev();try{await fn()}catch(e){T(plat+' '+name+' (run)',false,e.message.split('\n')[0])}await wait(opt.wait||350);
    const L=await ev();ALL[plat].push(...L);const core=L.filter(e=>!NOISE.has(e.ev));R[plat][name]={core,common:opt.common!==false,all:L};
    for(const x of expect){const[evn,props,n=1]=x;const all=L.filter(e=>e.ev===evn),hit=all.filter(e=>match(e.props||{},props||{}));
      T(`${plat} ${name}: ${evn} ×${n}`,all.length===n&&hit.length===n,{got:all.map(e=>e.props),want:props})}
    if(opt.only){const extra=core.filter(e=>!expect.some(x=>x[0]===e.ev));T(`${plat} ${name}: no extra events`,!extra.length,extra.map(e=>e.ev))}
    return L}

  // ===== 1 访客打开 =====
  await pg.goto(URL0(plat));await wait(900);
  {const L=await ev();ALL[plat].push(...L);T(plat+' open: session_start first',L[0]&&L[0].ev==='session_start'&&L[0].props.entry==='direct',L.map(e=>e.ev));
   T(plat+' open: page_view disc',L.filter(e=>e.ev==='page_view'&&e.props.screen==='disc').length===1,L.map(e=>[e.ev,e.props.screen]));
   T(plat+' open: common fields',L.every(e=>e.device&&e.build===(W?'web':'pwa')&&e.anon&&e.sid&&e.env&&'uid'in e&&!('plat'in e)),L[0]);
   R[plat].open={core:L.filter(e=>!NOISE.has(e.ev)),common:true}}
  await close();
  // ===== 2 登录漏斗（从申请触发）=====
  const g0=await js(W=>{const sel=W?'#colC .gc[data-sel]':'#calView [data-open]';const ok=id=>{const c=api.get(id);return c&&stateOf(c)==='open'&&!isW(c)&&!ugInstant(c)&&c.start>NOW&&c.game_type==='singles'};
    const el=[...document.querySelectorAll(sel)].find(x=>ok(x.dataset.sel||x.dataset.open));return el?(el.dataset.sel||el.dataset.open):null},W);
  T(plat+' found open game',!!g0,g0);
  await S('list_open',[],async()=>{await click(W?`#colC .gc[data-sel="${g0}"]`:`#calView [data-open="${g0}"]`)});
  {const gv=R[plat].list_open.all.filter(e=>e.ev==='game_view');T(plat+' game_view once via list',gv.length===1&&gv[0].props.via==='list'&&gv[0].props.game_id===g0&&gv[0].props.venue_id,gv.map(e=>e.props))}
  await S('login_open',[['login_open',{trigger:'apply'}]],()=>click((W?'#colR':'#dAct')+' [data-a="apply"]'),{only:true});
  await S('send_code_bad',[],async()=>{await pg.fill('#ph','12');await click('[data-a="sendCode"]')},{only:true});
  await S('send_code',[['login_send_code',{cc:'+61'}]],async()=>{await pg.fill('#ph','0412 345 678');await click('[data-a="sendCode"]')},{only:true});
  await S('edit_phone',[],async()=>{await wait(400);await click(SH+' [data-a="login"]')},{only:true});
  T(plat+' edit phone keeps next',await js(()=>typeof AUTH.next==='function'));
  await S('send_code2',[['login_send_code',{cc:'+61'}]],async()=>{await pg.fill('#ph','0412 345 678');await click('[data-a="sendCode"]')},{only:true});
  await S('verify',[['login_verify',{ok:true}]],async()=>{await wait(500);await pg.fill('#otp','123456')},{only:true});
  await S('signup',[['login_success',{is_new:true,trigger:'apply',entry:'direct'}],['signup_complete',{ntrp:3,clubs_n:0,gender_given:false,avatar_kind:'letter'}],['pact_view',{via:'gate'}]],
    async()=>{await wait(300);await pg.fill('#npName','Tess');await pg.check('#npAdult');await click('[data-a="npDone"]');await wait(900)},{only:true});
  const meId=await js(()=>ME&&ME.id);T(plat+' logged in',!!meId,meId);
  await S('pact_accept',[['pact_accept',{via:'apply'}],['game_apply_open',{game_id:g0}]],async()=>{await click('[data-pact="ok"]');await wait(700)},{only:true});
  await S('apply_submit',[['game_apply_submit',{game_id:g0,has_message:true,played_n:0,avatar_kind:'letter',minutes_to_start:x=>typeof x==='number'&&x>0}]],()=>click('[data-a="doApply"]'),{only:true});
  await close();
  await S('withdraw',[['apply_withdraw',{game_id:g0}]],async()=>{await click((W?'#colR':'#dAct')+' [data-a="leave"]');await click('[data-a="doLeave"]')},{only:true});
  T(plat+' withdraw keeps row',await js(([g,u])=>{const r=PARTS.filter(p=>p.game_id===g&&p.user_id===u);return r.length===1&&r[0].status==='withdrawn'&&!!r[0].left_at},[g0,meId]));
  await S('reapply',[['game_apply_open',{game_id:g0}],['game_apply_submit',{game_id:g0}]],async()=>{await click((W?'#colR':'#dAct')+' [data-a="apply"]');await wait(300);await click('[data-a="doApply"]')},{only:true});
  T(plat+' reapply single pending row',await js(([g,u])=>{const r=PARTS.filter(p=>p.game_id===g&&p.user_id===u);return r.length===1&&r[0].status==='pending'&&api.get(g).mine==='pending'},[g0,meId]));
  await close();
  await S('withdraw2',[['apply_withdraw',{game_id:g0}]],async()=>{await click((W?'#colR':'#dAct')+' [data-a="leave"]');await click('[data-a="doLeave"]')},{only:true});
  // ===== 3 直接加入 · 退出（10 分钟内 / 之后）=====
  const gi=await js(()=>uxDemo('instant'));await openGame(gi);await wait(300);
  await S('instant_join',[['game_apply_open',{game_id:gi}],['game_join_instant',{game_id:gi,minutes_to_start:x=>x>0}]],async()=>{await click((W?'#colR':'#dAct')+' [data-a="apply"]');await wait(300);await click('[data-ug="join"]')},{only:true});
  await js(()=>{const b=document.querySelector('[data-ug="done"]');b&&b.click()});
  await S('leave_grace',[['game_leave_open',{game_id:gi}],['game_leave',{game_id:gi,grace:true,after_change:false}]],async()=>{await click((W?'#colR':'#dAct')+' [data-a="leave"]');await click('[data-a="doLeave"]')},{only:true});
  await S('rejoin',[['game_apply_open',{game_id:gi}],['game_join_instant',{game_id:gi}]],async()=>{await click((W?'#colR':'#dAct')+' [data-a="apply"]');await wait(300);await click('[data-ug="join"]')},{only:true});
  await js(()=>{const b=document.querySelector('[data-ug="done"]');b&&b.click()});
  await js(([g,u])=>{PARTS.find(p=>p.game_id===g&&p.user_id===u).approved_at=Date.now()-11*6e4;render()},[gi,meId]);
  await S('leave_late',[['game_leave_open',{game_id:gi}],['game_leave',{game_id:gi,grace:false,after_change:false}]],async()=>{await click((W?'#colR':'#dAct')+' [data-a="leave"]');await click('[data-a="doLeave"]')},{only:true});
  // ===== 4 性别（第一次填写）=====
  await goTab('me');await wait(300);
  await S('gender_first',[['gender_open',{}],['gender_set',{first:true,changed:false}]],async()=>{await js(()=>openSettings());await click('[data-sx="gender"]');await click('[data-sx="pickG"][data-v="m"]')},{only:true});
  // ===== 5 发起人：接受 / 婉拒（看过 / 没看过球员卡）· 取消 =====
  await who('han');await js(()=>{ensureJasonPending()});await openGame('g1');await wait(300);
  await S('approve_nocard',[['host_decide',{game_id:'g1',target_uid:'jason',ok:true,viewed_card:false,has_note:false,ms_since_request:x=>x>0}]],()=>click(`${W?'#colR':'#dBody'} [data-a="approve"][data-u="jason"]`),{only:true});
  T(plat+' approve: no reason key',!('reason' in (R[plat].approve_nocard.core[0]||{props:{}}).props));
  await openGame('g8');await wait(300);
  await S('card_from_request',[['card_view',{target_uid:'grace',own:false,via:'request'}]],()=>click(`${W?'#colR':'#dBody'} .req [data-user="grace"]`),{only:true});
  T(plat+' others card: no snapshot',!('theme' in R[plat].card_from_request.core[0].props));
  await close();await wait(300);
  await S('decline_open',[['host_decline_open',{game_id:'g8',target_uid:'grace'}]],()=>click(`${W?'#colR':'#dBody'} [data-sx="softNo"][data-u="grace"]`),{only:true});
  await S('decline_card',[['host_decide',{game_id:'g8',target_uid:'grace',ok:false,reason:'level',has_note:true,viewed_card:true}]],async()=>{await pg.fill('#snNote','下次一起');await click('[data-sx="softNoGo"][data-v="level"]')},{only:true});
  await js(()=>{PARTS.push({game_id:'g8',user_id:'david',role:'player',status:'pending',message:'',created_at:Date.now()-5*6e4});render();if(typeof renderDetail==='function'&&UI.detail)renderDetail()});await wait(200);
  await S('decline_nocard',[['host_decline_open',{}],['host_decide',{game_id:'g8',target_uid:'david',ok:false,reason:'pass',has_note:false,viewed_card:false}]],async()=>{await click(`${W?'#colR':'#dBody'} [data-sx="softNo"][data-u="david"]`);await click('[data-sx="softNoGo"][data-v="pass"]')},{only:true});
  await S('cancel',[['game_cancel_open',{game_id:'g8'}],['game_cancel',{game_id:'g8',approved_n:2,pending_n:0,minutes_to_start:x=>x>0}]],async()=>{await click(`${W?'#colR':'#dAct'} [data-a="cancelGame"]`);await click('[data-a="doCancelGame"]')},{only:true});
  T(plat+' cancelled_at',await js(()=>!!GAMES.find(g=>g.id==='g8').cancelled_at));
  // ===== 6 发起 · 修改 =====
  await goTab('disc');await wait(200);
  await S('create_start',[['game_create_start',{}]],()=>click(W?'.btn-new[data-a="create"]':'#tabbar [data-a="create"]'),{only:true});
  await S('create_submit',[['game_create_submit',{type:'singles',venue_id:'v1',join_mode:'approve',hide_done:true,repeat:false,spots:1,women:false,dur:90,utr_min:x=>typeof x==='number',utr_max:x=>typeof x==='number',minutes_to_start:x=>x>0,game_id:x=>!!x}],['game_share_open',{}]],
    async()=>{await click('[data-ng="publish"]');await wait(1100)},{only:true});
  const gn=await js(()=>AN.created);await close();await wait(200);
  await S('edit',[['game_edit',{game_id:gn,fields:['time'],approved_n:0,minutes_to_start:x=>x>0}]],async()=>{await click(`${W?'#colR':'#dAct'} [data-ge="edit"]`);await wait(300);await click('[data-ng="tm"]:not(.on):not([disabled])');await click('[data-ng="publish"]')},{only:true});
  await close();
  // ===== 7 通知列表打开 · 还缺人：顺延 / 放宽 =====
  const gu=await js(()=>ufDemo());await wait(300);await clean();
  const nu=await js(g=>{const n=NOTIFS.find(n=>n.game_id===g&&n.kind==='unfilled'&&n.user_id===ME.id);return n&&n.id},gu);
  await goTab('notif');await wait(400);
  await S('notif_list',[['notif_open',{kind:'unfilled',from:'list',notif_id:nu}]],()=>click(W?`#pop [data-wn="${nu}"]`:`[data-ntfo="${nu}"]`),{only:true});
  await S('postpone',[['game_postpone',{game_id:gu,from:x=>!!x,to:(x,p)=>new Date(x)-new Date(p.from)===36e5}],['unfilled_action',{game_id:gu,action:'delay'}]],async()=>{await click('[data-uf="delay"]');await click('[data-uf="delayGo"]')},{only:true});
  await js(g=>openUnfilled(g),gu);await wait(300);
  await S('widen',[['unfilled_action',{game_id:gu,action:'widen'}]],()=>click('[data-uf="widen"]'),{only:true});
  // ===== 8 屏蔽 / 解除（屏蔽导致的自动婉拒写 blocked）=====
  await js(g=>{PARTS.push({game_id:g,user_id:'jason',role:'player',status:'pending',message:'',created_at:Date.now()});typeof closeSheet==='function'?closeSheet():closeModal();AN.ctx='list';openCard('jason')},gn);await wait(400);await ev();
  await S('block',[['user_block',{target_uid:'jason'}]],async()=>{await click('[data-a="block"][data-u="jason"]');await click('[data-a="doBlock"]')},{only:true});
  T(plat+' block auto-decline reason=blocked',await js(g=>{const p=PARTS.find(p=>p.game_id===g&&p.user_id==='jason');return p.status+'/'+p.reason},gn)==='rejected/blocked');
  await js(()=>openBlocklist());await wait(300);
  await S('unblock',[['user_unblock',{target_uid:'jason'}]],()=>click('[data-a="unblock"][data-u="jason"]'),{only:true});
  // ===== 9 约 TA 打球：发 / 婉拒 / 接受 / 改时间 / 撤回 =====
  await who('jason');await js(()=>{const p=PARTS.find(p=>p.game_id==='g1'&&p.user_id==='jason');if(p){p.status='left';p.left_at=Date.now()}AN.ctx='list';openCard('han')});await wait(400);await ev();
  await S('invite_open',[['invite_open',{target_uid:'han',played_together:true}]],()=>click('[data-iv="new"][data-u="han"]'),{only:true});
  await S('invite_send',[['invite_send',{target_uid:'han',played_together:true,invite_id:x=>x>0}]],()=>click('[data-iv="send"]'),{only:true});
  const iv1=R[plat].invite_send.core[0]&&R[plat].invite_send.core[0].props.invite_id;await close();
  await who('han');await goTab('notif');await wait(400);
  const ni=await js(i=>{const n=NOTIFS.find(n=>n.invite_id===i&&n.user_id===ME.id);return n&&n.id},iv1);
  await S('invite_notif',[['notif_open',{kind:'invite',from:'list',notif_id:ni}]],()=>click(W?`#pop [data-wn="${ni}"]`:`.ntf[data-iv="view"][data-i="${iv1}"]`));
  await S('invite_decline',[['invite_decline',{invite_id:iv1,reason:'week',has_note:false}]],async()=>{await click('[data-iv="decline"]');await click('[data-iv="noGo"][data-v="week"]')},{only:true});
  const sendAs=async name=>{await who('jason');await js(()=>newInvite('han'));await wait(300);await click('[data-iv="send"]');await wait(200);const L=await ev();const s=L.find(e=>e.ev==='invite_send');T(`${plat} ${name}: send`,!!s&&L.filter(e=>e.ev==='invite_open').length===1);await close();return s&&s.props.invite_id};
  const iv2=await sendAs('inv2');await who('han');await js(i=>openInvite(i),iv2);await wait(300);
  await S('invite_accept',[['invite_accept',{invite_id:iv2}]],()=>click('[data-iv="accept"]'),{wait:700});
  const iv3=await sendAs('inv3');await who('han');await js(i=>openInvite(i),iv3);await wait(300);
  await S('counter',[['invite_counter_send',{invite_id:iv3}]],async()=>{await click('[data-iv="counter"]');await click('[data-iv="day"]:not(.on)');await click('[data-iv="sendCounter"]')},{only:true});
  await js(i=>openInvite(i),iv3);await wait(300);
  await S('counter_withdraw',[['invite_withdraw',{invite_id:iv3,what:'counter'}]],()=>click('[data-iv="withdraw"]'),{only:true});
  await who('jason');await js(i=>openInvite(i),iv3);await wait(300);
  await S('invite_withdraw',[['invite_withdraw',{invite_id:iv3,what:'invite'}]],()=>click('[data-iv="withdraw"]'),{only:true});
  await close();
  // ===== 10 赛后：多遇到 · 感受 · 印象 · TA 没来 · 完成 · 申诉 · 撤回 =====
  await who('han');const gr=await js(()=>uxDemo('recap'));const ru=await js(g=>rcOthers(GAMES.find(x=>x.id===g),'han')[0],gr);
  await openGame(gr);await wait(300);
  await S('recap_open',[['recap_open',{game_id:gr,via:'detail'}]],()=>click(`${W?'#colR':'#dBody'} [data-rc="open"]`),{only:true});
  await S('pref',[['pref_set',{target_uid:ru,value:'more',prev:'ok',via:'recap'}]],()=>click(`[data-rc="more"][data-u="${ru}"]`),{only:true});
  await S('feel',[['feel_set',{game_id:gr,value:'easy'}]],()=>click('[data-rc="feel"][data-v="easy"]'),{only:true});
  await S('imp_on',[['impression_give',{target_uid:ru,tag:'kind',on:true,bulk:false}]],async()=>{await click(`[data-rcx="imp"][data-u="${ru}"]`);await click(`[data-rcx="tag"][data-u="${ru}"][data-v="kind"]`)},{only:true});
  await S('imp_off',[['impression_give',{target_uid:ru,tag:'kind',on:false,bulk:false}]],()=>click(`[data-rcx="tag"][data-u="${ru}"][data-v="kind"]`),{only:true});
  await S('noshow',[['noshow_report',{game_id:gr,target_uid:ru,role:'host'}]],async()=>{await click(`[data-rcx="ns"][data-u="${ru}"]`);await click(`[data-rcx="nsok"][data-u="${ru}"]`)},{only:true});
  await S('recap_done',[['recap_done',{game_id:gr,n_set:2}]],()=>click('[data-rc="done"]'),{only:true});
  await who(ru);await goTab('notif');await wait(400);const nn=await js(g=>{const n=NOTIFS.find(n=>n.game_id===g&&n.kind==='noshow'&&n.user_id===ME.id);return n&&n.id},gr);
  await S('noshow_notif',[['notif_open',{kind:'noshow',from:'list',notif_id:nn}]],()=>click(W?`#pop [data-wn="${nn}"]`:`[data-ntfo="${nn}"]`),{only:true});
  await S('appeal',[['noshow_appeal',{game_id:gr,reason:'came'}]],()=>click('[data-nsa="came"]'),{only:true});
  await who('han');await openGame(gr);await wait(300);await ev();
  await S('noshow_undo',[['recap_open',{game_id:gr}],['noshow_undo',{game_id:gr,target_uid:ru}]],async()=>{await click(`${W?'#colR':'#dBody'} [data-rc="open"]`);await click(`[data-rcx="nsundo"][data-u="${ru}"]`)},{only:true});
  await close();
  // ===== 11 徽章：获得 · 分享 · 徽章墙 =====
  const bd=await js(()=>{const r=uxDemo('badge');typeof closeSheet==='function'?closeSheet():closeModal();setWho(r.u,true);rcOpen(r.id);return r});await wait(400);await ev();
  await S('badge_ceremony',[['badge_view',{code:x=>['first','ten'].includes(x),via:'ceremony'}]],()=>click('[data-bdgc]'),{only:true});
  const bc=(R[plat].badge_ceremony.core[0]||{props:{}}).props.code;
  await js(()=>{window._qr=[];const o=qrImage;qrImage=t=>{_qr.push(t);return o(t)}});
  await S('badge_share',[['badge_share',{code:bc,to:'xhs',action:'copy'}]],async()=>{await click('[data-bfx="share"]');await wait(1500);await click('[data-bsh="to"][data-v="xhs"]');await wait(1500);await click('[data-bsh="copy"]')},{only:true,keep:true});
  {const q=await js(()=>_qr);T(plat+' badge QR /p/ + s=xhs + f=',q.length>=2&&/\/p\/\d{4}\?s=moments&f=\d+$/.test(q[0])&&/\/p\/\d{4}\?s=xhs&f=\d+$/.test(q[q.length-1]),q)}
  await noFx();await close();await js(u=>{AN.ctx='list';openCard(u)},bd.u);await wait(400);await ev();
  await S('badge_wall',[['badge_view',{via:'wall'}]],()=>click(`${SH} .bd:not(.lock)[data-bdgd]`),{only:true});
  await noFx();await close();
  // ===== 12 开打前 30 分钟：横幅打开 =====
  await who('jason');await goTab('disc');const gs=await js(()=>{const id=soonDemo();if(!NOTIFS.some(n=>n.kind==='soon'&&n.user_id===ME.id&&n.game_id===id)){const g=GAMES.find(x=>x.id===id);g.starts_at=new Date(Date.now()+29*6e4).toISOString();soonTick()}return id});await wait(500);
  await S('soon_banner',[['notif_open',{kind:'soon',from:'banner',notif_id:x=>x>0}],['soon_open',{game_id:gs}],['pact_view',{via:'soon'}]],()=>click(W?'#dn':'#banner'),{only:true,keep:true});
  await close();
  // ===== 13 球员卡：个性化 · 分享 =====
  if(W){await S('custom_open',[['card_view',{target_uid:'jason',own:true,via:x=>!!x,theme:'court'}],['card_custom_open',{days_since_signup:null}]],()=>js(()=>{AN.ctx='list';openCard('jason')}),{only:true,common:false})}
  else{await goTab('me');await wait(300);await S('custom_open',[['card_custom_open',{days_since_signup:null}]],()=>click('#meBody [data-a="custom"]'),{only:true,common:false})}
  await S('cz_seal',[['card_customize',{field:'seal',value:x=>!!x,seal_roll:1}]],()=>click(`${SH} [data-roll]`),{only:true});
  await S('cz_animal',[['card_customize',{field:'animal',value:'bear',animal:'bear'}]],()=>click(`${SH} [data-an="bear"]`),{only:true});
  const col=await js(()=>ZCOL.find(c=>c!==ME.color));
  await S('cz_color',[['card_customize',{field:'color',value:col,color:col}]],()=>click(`${SH} [data-avc="${col}"]`),{only:true});
  await S('cz_theme',[['card_customize',{field:'theme',value:'clay',theme:'clay'}]],()=>click(`${SH} [data-cth="clay"]`),{only:true});
  await S('cz_kind',[['card_customize',{field:'avatar_kind',value:'letter',animal:'letter'}]],()=>click(`${SH} [data-akind="letter"]`),{only:true});
  if(!W){await close();await wait(300)}
  await S('card_share_open',[['card_share_open',{target_uid:'jason',theme:'clay'}]],()=>click(W?`${SH} [data-a="saveCard"]`:'#meBody [data-a="saveCard"]'));
  await S('card_share_link',[['card_share',{channel:'xhs',action:'link',ok:true}]],async()=>{await click('[data-sc="to"][data-v="xhs"]');await click('[data-sc="link"]')});
  await pg.waitForFunction(()=>!SC.busy,null,{timeout:12000}).catch(()=>{});
  await S('card_share_save',[['card_share',{channel:'xhs',action:'save',ok:x=>typeof x==='boolean'}]],()=>click('[data-sc="save"]'),{wait:1500});
  {const q=await js(()=>{const o=qrSVG,a=[];qrSVG=t=>{a.push(t);return o(t)};SC.to='xhs';shareShot('jason');SC.to='moments';shareShot('jason');qrSVG=o;return a});
   T(plat+' card share QR by channel',/\/p\/0062\?s=xhs&f=0062$/.test(q[0])&&/\/p\/0062\?s=moments&f=0062$/.test(q[q.length-1]),q)}
  await close();
  // ===== 14 筛选 · 换天 · 视图 · 选区 =====
  await goTab('disc');await wait(300);
  if(!W)await S('filter_open',[['filter_open',{}]],()=>click('#chips [data-a="filter"]'),{only:true});
  const FS=W?'#colL':SH;
  await S('f_band',[['filter_utr_band',{band:2,on:true}]],()=>click(`${FS} [data-flv="2"]`),{only:true});
  await S('f_type',[['filter_type',{type:'doubles',on:true}]],()=>click(`${FS} [data-fty="doubles"]`),{only:true});
  await S('f_tag',[['filter_tag',{tag:'newbie',on:true}]],()=>click(`${FS} [data-sx="ftag"][data-v="newbie"]`),{only:true});
  await S('f_tag_off',[['filter_tag',{tag:'newbie',on:false}]],()=>click(`${FS} [data-sx="ftag"][data-v="newbie"]`),{only:true});
  if(W){await S('f_radius',[['filter_radius',{km:20}]],()=>click(`${FS} [data-radius="20"]`),{only:true})}
  await S('f_reset',[['filter_reset',{}]],()=>click(`${FS} [data-a="fReset"]`),{only:true});
  await close();
  if(!W){await click('#chips [data-a="loc"]');await wait(300);await S('f_radius',[['filter_radius',{km:20}]],()=>click('#sheet [data-radius="20"]'),{only:true});
    await S('suburb',[['loc_suburb_pick',{suburb:'Box Hill',via:'search'}]],async()=>{await pg.fill('#sbQ','Box Hill');await click('#sbBody [data-suburb="Box Hill"]')},{only:true})}
  else{await S('suburb',[['loc_suburb_pick',{suburb:'Box Hill',via:'search'}]],async()=>{await pg.click('#fSub');await pg.fill('#fSub','Box Hill');await wait(100);await click('[data-subpick="Box Hill"]')},{only:true})}
  if(W)await S('day',[['day_select',{offset:2,via:'pager'}]],()=>click('[data-a="next"]'),{only:true,common:false});
  else await S('day',[['day_select',{offset:1,via:'strip'}]],()=>click('#week [data-day="1"]'),{only:true,common:false});
  await S('mode_map',[['view_mode',{mode:'map'}]],()=>click('[data-mode="map"]'),{only:true});
  if(W)await S('map_day',[['map_day',{day:1}]],()=>click('[data-mapday="1"]'),{only:true,common:false});
  await S('mode_list',[['view_mode',{mode:'agenda'}]],()=>click(W?'[data-mode="agenda"]':'[data-mode="cal"]'),{only:true});
  // ===== 15 消息：打开 · 发送（不带内容）· 快捷回复 =====
  if(W)await js(()=>CX_INBOX());else await goTab('chat');await wait(400);
  await S('chat_open',[['chat_open',{type:'dm'}]],()=>click('[data-cx="open"][data-t="t1"]'),{only:true});
  await S('chat_send',[['chat_send',{type:'dm',quick:false}]],async()=>{await pg.fill('#cxIn','秘密内容 secret-xyz');await click('[data-cx="send"]')},{only:true});
  await S('chat_quick',[['chat_send',{type:'dm',quick:true}]],()=>click('[data-cx="quick"]'),{only:true});
  await wait(1800);
  // ===== 16 性别（改）不记值 =====
  await close();await goTab('me');await wait(300);
  await S('gender_change',[['gender_open',{}],['gender_set',{first:false,changed:true}]],async()=>{await js(()=>openSettings());await click('[data-sx="gender"]');await click('[data-sx="pickG"][data-v="f"]');await click('[data-sx="gConfirm"]')},{only:true});
  // ===== 17 退出 → 新 anon；访客关闭使用数据 → 不再发任何事件 =====
  const anon0=await js(()=>AN.anon);
  await S('logout',[['logout',{}],['session_start',{entry:'direct'}]],async()=>{if(W){await click('[data-a="umenu"]');await click('#umenu [data-a="logout"]')}else{await js(()=>openSettings());await click('#sheet [data-a="logout"]')}},{only:true});
  {const L=R[plat].logout.all;const lo=L.find(e=>e.ev==='logout'),ss=L.find(e=>e.ev==='session_start');T(plat+' logout → new anon & sid',lo&&ss&&lo.anon===anon0&&ss.anon!==anon0&&ss.sid!==lo.sid&&ss.uid===null,[lo&&lo.anon,ss&&ss.anon])}
  await goTab('me');await wait(300);
  await S('analytics_off',[['analytics_off',{}]],()=>click((W?'#colL':'#meBody')+' [data-anx]'),{only:true});
  {const L=R[plat].analytics_off.all;T(plat+' analytics_off is last',L.length&&L[L.length-1].ev==='analytics_off',L.map(e=>e.ev))}
  await S('off_silent',[],async()=>{await goTab('disc');await wait(200);await click(W?'#colL [data-flv="1"]':'#chips [data-a="filter"]');await close();await click('[data-mode="map"]')});
  T(plat+' nothing sent while off',R[plat].off_silent.all.length===0,R[plat].off_silent.all.map(e=>e.ev));
  await pg.reload();await wait(900);T(plat+' reload while off: nothing',(await ev()).length===0);
  await close();await goTab('me');await wait(300);
  await S('analytics_on',[['analytics_on',{}]],()=>click((W?'#colL':'#meBody')+' [data-anx]'));
  T(plat+' no page errors',!errs.length,errs);
  await ctx.close()}

// ===== 站外入口：推送 · 分享链接 · 路由 =====
async function entries(b,plat){const W=plat==='Web',out={};
  const one=async(q,f)=>{const ctx=await ctxFor(b,plat),pg=await ctx.newPage(),errs=[];pg.on('pageerror',x=>errs.push(x.message));await pg.goto(URL0(plat)+q);await pg.settle(1000);
    const r=await f(pg);const L=await pg.evaluate(()=>AN_LOG.splice(0));T(plat+' '+q+' no errors',!errs.length,errs);await ctx.close();return [L,r]};
  {const [L,r]=await one('?n=5&k=approved',pg=>pg.evaluate(()=>location.search));const s=L.find(e=>e.ev==='session_start'),n=L.filter(e=>e.ev==='notif_open');
   T(plat+' push: entry=push',s&&s.props.entry==='push');T(plat+' push: notif_open once',n.length===1&&eq(n[0].props,{kind:'approved',from:'push',notif_id:5}),n.map(e=>e.props));T(plat+' push: n/k removed',r==='',r);out.push=L.filter(e=>!NOISE.has(e.ev))}
  {const [L]=await one('?s=link&f=0001#/g/7Kq2',async()=>0);const s=L.find(e=>e.ev==='session_start'),g=L.filter(e=>e.ev==='game_view');
   T(plat+' share link: entry=share s/f',s&&s.props.entry==='share'&&s.props.s==='link'&&s.props.f==='0001');T(plat+' share link: game_view share_link',g.length===1&&g[0].props.via==='share_link'&&g[0].props.game_id==='g1',g.map(e=>e.props));
   T(plat+' share link: page_view',L.some(e=>e.ev==='page_view'&&e.props.screen===(W?'landing':'game_detail')),L.map(e=>[e.ev,e.props.screen]))}
  {const [L]=await one('?source=pwa',async()=>0);T(plat+' source param',(L.find(e=>e.ev==='session_start')||{props:{}}).props.source==='pwa')}
  {const [L]=await one('#/mine',pg=>0);T(plat+' #/mine',L.some(e=>e.ev==='page_view'&&e.props.screen==='mine'),L.map(e=>[e.ev,e.props.screen]))}
  {const [L]=await one('#/new',pg=>0);const lo=L.filter(e=>e.ev==='login_open');T(plat+' #/new → login (create)',lo.length===1&&lo[0].props.trigger==='create',lo.map(e=>e.props))}
  {const [L,r]=await one('#/p/0062',async pg=>{const a=await pg.evaluate(()=>AN_LOG.splice(0));
      // 未登录在球员卡点「约 TA 打球」：打开登录，登录后回到邀约表单
      await pg.locator('[data-iv="new"][data-u="jason"]').first().click();await pg.settle(400);await pg.fill('#ph','0412 345 678');await pg.locator('[data-a="sendCode"]').first().click();await pg.settle(500);
      await pg.fill('#otp','654321');await pg.settle(400);await pg.fill('#npName','Ivy');await pg.check('#npAdult');await pg.locator('[data-a="npDone"]').first().click();await pg.settle(900);
      await pg.locator('[data-pact="ok"]').first().click();await pg.settle(800);const form=await pg.evaluate(()=>!!document.querySelector('[data-iv="send"]')&&IVF&&IVF.to);return {a,form}});
   const cv=r.a.filter(e=>e.ev==='card_view');T(plat+' #/p/0062 → card_view link',cv.length===1&&cv[0].props.target_uid==='jason'&&cv[0].props.via==='link'&&cv[0].props.own===false,cv.map(e=>e.props));
   const lo=L.filter(e=>e.ev==='login_open'),ls=L.filter(e=>e.ev==='login_success'),pa=L.filter(e=>e.ev==='pact_accept'),io=L.filter(e=>e.ev==='invite_open');
   T(plat+' guest invite → login trigger invite',lo.length===1&&lo[0].props.trigger==='invite'&&ls.length===1&&ls[0].props.trigger==='invite',[lo.map(e=>e.props),ls.map(e=>e.props)]);
   T(plat+' guest invite → back to form after login',r.form==='jason'&&pa.length===1&&pa[0].props.via==='invite'&&io.length===1&&io[0].props.target_uid==='jason',[r.form,pa.map(e=>e.props),io.map(e=>e.props)])}
  return out}

(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  for(const p of ['PWA','Web']){await run(b,p);await entries(b,p)}
  // 字典之外的事件
  for(const p of ['PWA','Web']){const bad=[...new Set(ALL[p].map(e=>e.ev).filter(x=>!SPEC.has(x)&&x!=='ui_action'))];T(p+' only spec events',!bad.length,bad);
    const leak=ALL[p].filter(e=>/secret-xyz|秘密内容|我到了/.test(JSON.stringify(e.props)));T(p+' no chat text in events',!leak.length,leak.map(e=>e.ev));
    const gs=ALL[p].filter(e=>e.ev==='gender_set');T(p+' gender_set has no value',gs.length===2&&gs.every(e=>!/"[fm]"/.test(JSON.stringify(e.props))&&!('value'in e.props)&&!('gender'in e.props)),gs.map(e=>e.props))}
  // 两端同一个动作：事件名和 props 一致（时间、编号类的值不比）
  const norm=e=>{const p={};Object.keys(e.props||{}).sort().forEach(k=>{const v=e.props[k];p[k]=/^(minutes_to_start|ms|ms_since_request|from|to|notif_id|invite_id|game_id|vw|days_since_signup|landing|value)$/.test(k)&&!(e.ev==='badge_share'&&k==='to')&&!(e.ev!=='card_customize'&&k==='value')?typeof v:v});return e.ev+' '+JSON.stringify(p)};
  let same=0;for(const k of Object.keys(R.PWA)){const a=R.PWA[k],w=R.Web[k];if(!a||!w||!a.common)continue;const A=a.core.map(norm).sort(),B=w.core.map(norm).sort();if(eq(A,B))same++;else T('parity '+k,false,{PWA:A,Web:B})}
  console.log(`parity steps equal: ${same}`);
  for(const p of ['PWA','Web']){const ua={};ALL[p].filter(e=>e.ev==='ui_action').forEach(e=>{const k=e.props.attr+':'+e.props.action;ua[k]=(ua[k]||0)+1});console.log(p,'ui_action',JSON.stringify(ua));
    const pv=ALL[p].filter(e=>e.ev==='page_view').map(e=>e.props.screen);console.log(p,'page_view',pv.length,pv.slice(0,60).join('>'));
    const cnt={};ALL[p].forEach(e=>cnt[e.ev]=(cnt[e.ev]||0)+1);console.log(p,'distinct events',Object.keys(cnt).length)}
  // 已由结果事件覆盖的按钮不应该再记 ui_action
  const HANDLED=/^(a:(apply|doApply|approve|leave|doLeave|cancelGame|doCancelGame|share|saveCard|myCard|custom|login|sendCode|npDone|logout|enablePush|create|safety|contact|community|doBlock|unblock|saveClubs|addClub|nrSet|prev|next)|sx:(softNo|softNoGo|impPick|gConfirm|ftag|gender)|iv:(new|send|accept|noGo|sendCounter|withdraw)|ng:publish|cx:(send|quick|dm|game|open)|sc:(go|save|link|to))$/;
  for(const p of ['PWA','Web']){const dup=ALL[p].filter(e=>e.ev==='ui_action'&&HANDLED.test(e.props.attr+':'+e.props.action));T(p+' no ui_action for handled buttons',!dup.length,dup.map(e=>e.props))}
  console.log(`\n${pass} passed, ${fail} failed`);await b.close()})();
