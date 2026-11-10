// 埋点 v2 补充验证：其余打开类 / 设置类事件，两端各走一遍；顺便列出 ui_action 和 page_view 的样子
const {chromium}=require('playwright');const fs=require('fs');
const SPEC=new Set(fs.readFileSync(require('path').join(__dirname,'..','spec','events_spec.md'),'utf8').split('\n').map(l=>(l.match(/^\| ([a-z0-9_]+) \|/)||[])[1]).filter(Boolean));
const FAKE=+new Date('2026-10-14T13:10:00+11:00');let pass=0,fail=0;
const T=(n,ok,x='')=>{ok?pass++:fail++;if(!ok)console.log('FAIL '+n,JSON.stringify(x))};
const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});const OUT={};
for(const plat of ['PWA','Web']){const W=plat==='Web';
  const ctx=await b.newContext({viewport:W?{width:1360,height:860}:{width:390,height:844}});
  await ctx.addInitScript(ts=>{const off=ts-Date.now(),D=Date;class FD extends D{constructor(...a){a.length?super(...a):super(D.now()+off)}static now(){return D.now()+off}};window.Date=FD;window.AN_LOG=[]},FAKE);
  const pg=await ctx.newPage(),errs=[];pg.on('pageerror',x=>errs.push(x.message));await pg.goto('file:///mnt/user-data/outputs/南伴球_'+plat+'.html');await pg.settle(900);
  const js=(f,a)=>pg.evaluate(f,a),wait=ms=>pg.settle(ms),ev=()=>js(()=>AN_LOG.splice(0));
  const click=s=>pg.locator(s).first().click({timeout:6000});const close=()=>js(W=>W?closeModal():closeSheet(),W);
  const all=[];OUT[plat]={};
  async function S(name,want,fn){await ev();try{await fn()}catch(e){T(plat+' '+name+' run',false,e.message.split('\n')[0])}await wait(400);const L=await ev();all.push(...L);
    const core=L.filter(e=>!['page_view','page_time','ui_action','game_view','card_image_render'].includes(e.ev));OUT[plat][name]=core.map(e=>e.ev+' '+JSON.stringify(e.props));
    for(const [n,p] of want){const h=L.filter(e=>e.ev===n);T(`${plat} ${name}: ${n}`,h.length===1&&Object.entries(p).every(([k,v])=>typeof v==='function'?v(h[0].props[k]):eq(h[0].props[k],v)),h.map(e=>e.props))}}
  await close();await js(()=>{setWho('han',true)});
  const det=W?'#colR':'#detail';
  await js(W=>{AN.ctx='list';W?select('g1'):openDetail('g1')},W);await wait(300);
  await S('share_open',[['game_share_open',{game_id:'g1'}]],()=>click(`${W?'#colR':'#dNav'} [data-a="share"]`));
  await S('copy_text',[['share_copy_text',{game_id:'g1'}]],()=>click('[data-a="copyText"]'));
  await S('copy_link',[['share_copy_link',{game_id:'g1'}]],()=>click('[data-a="copyLink"]'));
  if(!W){await S('sys_share',[['share_system',{game_id:'g1'}]],()=>click('[data-a="sysShare"]'));
    await S('poster_open',[['poster_open',{game_id:'g1'}]],()=>click('[data-a="poster"]'))}
  await S('xhs_copy',[['share_xhs_copy',{game_id:'g1'}]],()=>click('[data-sx="xhsCopy"]'));
  await close();
  // 详情：加入日历（PWA 按钮没有 data-g，回退到当前详情）
  await js(W=>{const p=PARTS.find(p=>p.game_id==='g6'&&p.user_id==='jason');setWho('jason',true);AN.ctx='list';W?select('g6'):openDetail('g6')},W);await wait(300);
  await S('ics',[['calendar_add',{game_id:'g6'}]],()=>click(`${det} [data-a="ics"]`));
  await S('pact_detail',[['pact_view',{via:'detail'}]],()=>click(`${det} [data-pact="1"]`));await close();
  await S('safety',[['safety_open',{}],['pact_view',{via:'safety'}]],()=>click(`${det} [data-a="safety"]`));await close();
  // 设置：提醒方式 · 邮件 · 谁可以约我 · 等级说明 · 联系我们 · 微信群
  if(!W)await js(()=>{if(UI.detail)closeDetail();go('me')});else await js(()=>{UI.tab='me';UI.sel=null;render()});await wait(300);
  const L=W?'#modal':'#sheet';   // 设置在齿轮弹层里（#134 P2）
  await S('nr_settings',[['notif_settings_open',{}]],()=>js(()=>openSettings()).then(()=>click(`${L} [data-a="nrSet"]`)));
  if(!W){await S('a2hs',[['a2hs_open',{env:x=>!!x}]],()=>click('[data-a="enablePush"]'));await close();await js(()=>{setEnv('pwa');go('me')});await js(()=>openSettings()).then(()=>click(`${L} [data-a="nrSet"]`));await wait(300)}
  if(W)T('网页端提醒方式页没有「开启推送」（11-03：提醒只推手机）',!(await pg.$('[data-a="enablePush"]')));
  else await S('push',[['push_enable',{env:x=>!!x,result:x=>['granted','denied','unsupported'].includes(x)}]],async()=>{await click('[data-a="enablePush"]');await pg.waitForFunction(()=>AN_LOG.some(e=>e.ev==='push_enable'),null,{timeout:5000,polling:50}).catch(()=>{})});   // 等权限回应（E2：原来固定等 2.5 秒）
  OUT[plat].pushProps=all.filter(e=>e.ev==='push_enable').map(e=>e.props);await close();
  await S('email_bad',[],async()=>{await js(()=>openSettings()).then(()=>click(`${L} [data-em="settings"]`));await pg.fill('#emSet','not-an-email');await click('[data-em="setSave"]')});await close();
  await S('email_ok',[['email_settings_save',{on:true}]],async()=>{await js(()=>openSettings()).then(()=>click(`${L} [data-em="settings"]`));await pg.fill('#emSet','j@x.com');await click('[data-em="setSave"]')});
  await S('email_off',[['email_settings_save',{on:false}]],async()=>{await js(()=>openSettings()).then(()=>click(`${L} [data-em="settings"]`));await click('[data-em="off"]')});
  await S('ivset',[['invite_setting',{value:'played'}]],async()=>{await js(()=>openSettings()).then(()=>click(`${L} [data-ivset="open"]`));await click('[data-ivset="played"]')});
  await S('lvinfo',[['level_info_open',{}]],()=>click(`${W?'#colL':'#meBody'} [data-sx="lvinfo"]`));await close();
  await S('clubs_open',[['club_add_open',{}]],()=>click(`${W?'#colL':'#meBody'} [data-a="editClubs"]`));
  await S('clubs_save',[['home_clubs_save',{n:1}]],()=>click('[data-a="saveClubs"]'));
  if(!W){await S('community',[['community_open',{}]],()=>js(()=>openSettings()).then(()=>click(`${L} [data-a="community"]`)));await close();
    await S('contact',[['contact_open',{}]],()=>js(()=>openSettings()).then(()=>click(`${L} [data-a="contact"]`)));await close()}
  else{await S('contact',[['contact_open',{}]],async()=>{await click('[data-a="umenu"]');await click('#umenu [data-a="contact"]')});await close()}
  // 发起人：每周发布 · 多人申请排序 / 展开
  await js(()=>{setWho('han',true)});const sg=await js(W=>{const g=GAMES.find(g=>g.series_id==='S1'&&new Date(g.starts_at)>NOW);AN.ctx='list';W?select(g.id):openDetail(g.id);return g.id},W);await wait(300);
  await S('series_end',[['series_end',{game_id:sg}]],()=>click(`${det} [data-sx="endSeries"]`));
  const mg=await js(W=>{const id=mdDemo();AN.ctx='notif';W?select(id):openDetail(id);return id},W);await wait(400);
  await S('req_sort',[['req_sort',{game_id:mg,sort:'time'}]],()=>click(`${det} [data-rq="sort"][data-v="time"]`));
  await S('req_expand',[['req_expand',{game_id:mg}]],()=>click(`${det} [data-rq="more"]`));
  // 地图：选中（PWA）· 球场聚合
  if(!W){await js(()=>{closeDetail();go('disc');UI.mode='map';render()});await wait(500);
    await S('game_select',[['game_select',{}]],()=>js(()=>{const c=[...document.querySelectorAll('.mcard[data-sel]')].map(x=>x.dataset.sel).find(id=>id!==UI.sel);selectGame(c,true)}))}
  // 等级提升庆祝
  await S('level_view',[['level_view',{lv:x=>x>=1}]],()=>js(()=>{LVREC[ME.id].lv=Math.min(4,LVREC[ME.id].lv);lvShow(ME.id)}));
  await js(()=>{const f=document.getElementById('bdgFx');f&&f.remove()});
  // 球员卡：举报 / 屏蔽入口
  await js(()=>{AN.ctx='list';openCard('tom')});await wait(300);
  await S('report',[['report_open',{target_type:'user',via:'card'}]],()=>js(()=>{document.querySelector('[data-a="report"][data-u="tom"]').click()}));
  await S('report_submit',[['report_submit',{target_type:'user',reason:'harass',has_note:false,via:'card'}]],()=>js(()=>{document.querySelector('[data-rp="harass"]').click()}));
    T(plat+' no page errors',!errs.length,errs);
  const ua={};all.filter(e=>e.ev==='ui_action').forEach(e=>{const k=e.props.attr+':'+e.props.action;ua[k]=(ua[k]||0)+1});OUT[plat].ui_action=ua;
  OUT[plat].pages=all.filter(e=>e.ev==='page_view').map(e=>e.props.screen).join(' > ');
  const bad=[...new Set(all.map(e=>e.ev).filter(x=>!SPEC.has(x)&&x!=='ui_action'))];T(plat+' only spec events',!bad.length,bad);
  await ctx.close()}
for(const k of Object.keys(OUT.PWA))if(Array.isArray(OUT.PWA[k])&&OUT.Web[k]&&!['pushProps'].includes(k)){const A=OUT.PWA[k].map(s=>s.replace(/"(game_id|minutes_to_start)":"?[^,}"]*"?/g,'"$1":0')).sort(),B=OUT.Web[k].map(s=>s.replace(/"(game_id|minutes_to_start)":"?[^,}"]*"?/g,'"$1":0')).sort();T('parity '+k,eq(A,B),{A,B})}
console.log(JSON.stringify({ua:[OUT.PWA.ui_action,OUT.Web.ui_action],push:[OUT.PWA.pushProps,OUT.Web.pushProps],pages:[OUT.PWA.pages,OUT.Web.pages]},null,1));
console.log(`\n${pass} passed, ${fail} failed`);await b.close()})();
