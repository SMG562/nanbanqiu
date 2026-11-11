/* ============================== 环境 & 演示 ============================== */
function detectEnv(){const ua=navigator.userAgent;if(/MicroMessenger/i.test(ua))return'wechat';if(matchMedia('(display-mode: standalone)').matches||navigator.standalone)return'pwa';return'safari'}
function setEnv(e){ENV=e;DEV.classList.toggle('env-wechat',e==='wechat');if(e==='wechat')PUSH.enabled=false;render()}
function setWho(id,quiet){ME=id?USERS[id]:null;UI.pastShown=20;if(ME&&!quiet)toast('当前身份：'+ME.name);
  if(ME&&LOC.source==='default'&&myClubIds().length){const v=VEN[myClubIds()[0]];LOC={...LOC,lat:v.lat,lng:v.lng,label:v.short,source:'club',asked:true}}render()}
function renderPanel(){if(typeof NBQ_NET!=='undefined'&&NBQ_NET)return;   /* 真实数据下没有演示球局，演示面板不画 */
  $$('#envSeg button').forEach(b=>b.classList.toggle('on',b.dataset.env===ENV));
  $$('#whoSeg button').forEach(b=>b.classList.toggle('on',b.dataset.who===(ME&&['jason','han'].includes(ME.id)?ME.id:'')));
  const c=api.get('g1');$('#wxPrev').innerHTML=wxPreviewHTML(c)+`<pre style="white-space:pre-wrap;font:12px/1.5 inherit;background:var(--bg);border-radius:10px;padding:10px;margin-top:10px;color:var(--ink2)">${esc(shareText(c))}</pre>`;$('#ogPrev').innerHTML=ogLHTML(c)}
$('#envSeg').onclick=e=>{const b=e.target.closest('[data-env]');if(b)setEnv(b.dataset.env)};
$('#whoSeg').onclick=e=>{const b=e.target.closest('[data-who]');if(b)setWho(b.dataset.who)};
function ensureJasonPending(){if(!PARTS.some(p=>p.game_id==='g1'&&p.user_id==='jason'&&p.status!=='withdrawn'&&p.status!=='left')){partUpsert({game_id:'g1',user_id:'jason',role:'player',status:'pending',message:'你好，我平时 3.0–3.5，住 Malvern 很近，希望一起打！',created_at:Date.now()-12*6e4});NOTIFS.unshift({id:++NID,user_id:'han',kind:'request',game_id:'g1',from:'jason',at:Date.now()-12*6e4,read:false})}}
$$('[data-demo]').forEach(b=>b.onclick=()=>{closeSheet();$('#wxg').hidden=true;const d=b.dataset.demo;
  if(d==='acct'){setWho('jason',true);LOC.asked=true;closeDetail();acctDemo('suspended');go('me');setTimeout(()=>acctBlock(acctSt(ME),'info'),400);return}
if(d==='reset'){seed();setEnv(detectEnv());closeDetail();go('disc');return}
  if(d==='soon'){setWho('jason',true);if(UI.detail)closeDetail();go('disc');if(!soonDemo())toast('没有可演示的球局');render();return}
  if(d==='pact'){setWho('jason',true);const id=pactDemo();openDetail(id);setTimeout(()=>{const b=document.querySelector('#dAct [data-a="apply"]');b&&b.click()},550);return}
  if(d==='multi'){setWho('han',true);closeDetail();const id=mdDemo();UI.msgTab='ntf';go('notif');return}
  if(d==='first'){ME=null;LOC={label:CITY.center,lat:CITY.lat,lng:CITY.lng,source:'default',asked:false};closeDetail();go('disc');return}
  if(d==='card'){setWho('jason',true);LOC.asked=true;closeDetail();go('me');setTimeout(()=>openCard('jason'),400);return}
  if(d==='mine'){setWho('jason',true);LOC.asked=true;closeDetail();go('mine');$('#scr-mine').scrollTop=0;return}
  if(d==='dense'){ME=null;LOC={label:'Malvern',lat:-37.845,lng:145.01,source:'manual',asked:true};F.radius=20;UI.day=BASE;UI.mode='cal';UI.exp=new Set();closeDetail();go('disc');setTimeout(()=>{const x=$('[data-exp]');if(x)x.scrollIntoView({block:'center'})},200);return}
  if(d==='link'){if(PARTS.some(p=>p.game_id==='g1'&&p.user_id==='jason'))seed();ME=null;LOC.asked=true;setEnv('wechat');openDetail('g1',true);return}
  if(d==='host'){ensureJasonPending();setWho('han',true);LOC.asked=true;closeDetail();go('disc');openDetail('g1');setTimeout(()=>pushBanner('Jason 申请加入你的球局','UTR 3.0 · '+relDay(api.get('g1').start)+' '+hm(api.get('g1').start)+' · Glen Iris',()=>{openDetail('g1');focusApplicant('jason')}),500);return}
  if(d==='unfilled'){setWho('han',true);LOC.asked=true;closeDetail();ufDemo();UI.msgTab='ntf';go('notif');return}
  if(d==='instant'){setWho('jason',true);LOC.asked=true;closeDetail();const id=uxDemo('instant');UI.day=dOff(new Date(GAMES.find(g=>g.id===id).starts_at));go('disc');setTimeout(()=>openDetail(id),300);return}
  if(d==='timeout'){setWho('jason',true);LOC.asked=true;closeDetail();const id=uxDemo('timeout');go('disc');setTimeout(()=>openDetail(id),300);return}
  if(d==='recap'){setWho('han',true);LOC.asked=true;closeDetail();const id=uxDemo(d);go('mine');setTimeout(()=>rcOpen(id),300);return}
  if(d==='badge'){closeDetail();const r=uxDemo('badge');setWho(r.u,true);LOC.asked=true;go('mine');setTimeout(()=>rcOpen(r.id),300);return}
  if(d==='follow'){setWho('han',true);LOC.asked=true;closeDetail();UI.msgTab='ntf';go('notif');uxDemo('follow');setTimeout(()=>render(),200);return}
  if(d==='invite'){setWho('jason',true);LOC.asked=true;closeDetail();UI.msgTab='ntf';go('notif');const inv=INV_DEMO();setTimeout(()=>notifyInv('jason','invite',inv,'han'),400);return}
  if(d==='series'){setWho('han',true);LOC.asked=true;closeDetail();const g=GAMES.find(g=>g.series_id==='S1'&&new Date(g.starts_at)>NOW)||GAMES.filter(g=>g.series_id==='S1').sort((x,y)=>new Date(y.starts_at)-new Date(x.starts_at))[0];UI.day=Math.max(0,Math.min(6,dOff(new Date(g.starts_at))));go('disc');setTimeout(()=>openDetail(g.id),300);return}
  if(d==='duo'){setWho('han',true);LOC.asked=true;closeDetail();go('disc');setTimeout(()=>{openCreate();NG.type='doubles';NG.miss=1;drawCreate()},300);return}
  if(d==='pals'){setWho('han',true);LOC.asked=true;closeDetail();go('me');setTimeout(()=>{const p=$('.pals');p&&p.scrollIntoView({block:'center'})},200);return}
  if(d==='women'){setWho('mia',true);LOC.asked=true;closeDetail();UI.day=dOff(new Date(GAMES.find(g=>g.id==='g20').starts_at));go('disc');setTimeout(()=>openDetail('g20'),300);return}
  if(d==='wlock'){setWho('jason',true);LOC.asked=true;closeDetail();go('disc');setTimeout(()=>openDetail('g20',true),300);return}
  if(d==='chat'){setWho('jason',true);LOC.asked=true;closeDetail();UI.msgTab='chat';go('notif');return}
  if(d==='invsend'){setWho('jason',true);LOC.asked=true;closeDetail();go('disc');setTimeout(()=>newInvite('han'),300);return}
  if(d==='accept'){ensureJasonPending();setWho('jason',true);if(ENV==='wechat')setEnv('pwa');PUSH.enabled=true;LOC.asked=true;openDetail('g1');
    setTimeout(()=>{const p=PARTS.find(p=>p.game_id==='g1'&&p.user_id==='jason');if(p&&p.status==='pending')api.decide('g1','jason',true);render()},1200);return}
});

