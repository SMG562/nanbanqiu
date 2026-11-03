/* ============================== 演示 ============================== */
function setWho(id){ME=id?USERS[id]:null;UI.sel=null;UI.pastShown=20;if(ME&&LOC.source==='default'&&myClubIds().length){const v=VEN[myClubIds()[0]];LOC={...LOC,lat:v.lat,lng:v.lng,label:v.short,source:'club',asked:true}}render();if(ME)toast('当前身份：'+ME.name)}
function renderDemo(){$$('#whoSeg button').forEach(b=>b.classList.toggle('on',b.dataset.who===(ME&&['jason','han'].includes(ME.id)?ME.id:'')))}
function ensureJasonPending(){if(!PARTS.some(p=>p.game_id==='g1'&&p.user_id==='jason'&&p.status!=='withdrawn'&&p.status!=='left')){partUpsert({game_id:'g1',user_id:'jason',role:'player',status:'pending',message:'你好，我平时 3.0–3.5，住 Malvern 很近，希望一起打！',created_at:Date.now()-12*6e4});NOTIFS.unshift({id:++NID,user_id:'han',kind:'request',game_id:'g1',from:'jason',at:Date.now()-12*6e4,read:false})}}
function runDemo(d){closeModal();$('#demo').classList.remove('show');
  const toApp=()=>{UI.landing=null;history.replaceState(null,'','#/')};
  if(d==='acct'){ME=USERS.jason;toApp();UI.tab='mine';UI.sel=null;acctDemo('suspended');render();setTimeout(()=>acctBlock(acctSt(ME),'info'),150);return}
if(d==='reset'){seed();toApp();render();toast('已重置');return}
  if(d==='soon'){setWho('jason');toApp();UI.tab='disc';UI.sel=null;render();if(!soonDemo())toast('没有可演示的球局');render();return}
  if(d==='pact'){setWho('jason');toApp();UI.tab='disc';const id=pactDemo();select(id);setTimeout(()=>{const b=document.querySelector('#colR [data-a="apply"]');b&&b.click()},450);return}
  if(d==='multi'){ME=USERS.han;toApp();UI.tab='disc';UI.sel=null;const id=mdDemo();render();setTimeout(()=>togglePop(true),200);return}
  if(d==='first'){ME=null;toApp();UI.tab='disc';UI.sel=null;UI.page=0;LOC={label:CITY.center,lat:CITY.lat,lng:CITY.lng,source:'default',asked:false};render();return}
  if(d==='accept'){ensureJasonPending();setWho('jason');toApp();PUSH.enabled=true;LOC.asked=true;UI.tab='disc';UI.page=0;select('g1');setTimeout(()=>{const p=PARTS.find(p=>p.game_id==='g1'&&p.user_id==='jason');if(p&&p.status==='pending')api.decide('g1','jason',true);render()},1200);return}
  if(d==='unfilled'){ME=USERS.han;toApp();UI.tab='disc';UI.sel=null;const id=ufDemo();render();setTimeout(()=>togglePop(true),200);return}
  if(d==='instant'||d==='timeout'){ME=USERS.jason;toApp();UI.tab='disc';UI.mode='agenda';const id=uxDemo(d);select(id);return}
  if(d==='recap'){ME=USERS.han;toApp();UI.tab='disc';UI.sel=null;const id=uxDemo(d);render();setTimeout(()=>rcOpen(id),200);return}
  if(d==='badge'){const r=uxDemo('badge');ME=USERS[r.u];toApp();UI.tab='disc';UI.sel=null;render();setTimeout(()=>rcOpen(r.id),200);return}
  if(d==='follow'){ME=USERS.han;toApp();UI.tab='disc';UI.sel=null;render();uxDemo('follow');setTimeout(()=>togglePop(true),300);return}
  if(d==='invite'){ME=USERS.jason;toApp();UI.tab='disc';UI.sel=null;render();const inv=INV_DEMO();setTimeout(()=>{notifyInv('jason','invite',inv,'han');openInvite(inv.id)},300);return}
  if(d==='series'){ME=USERS.han;toApp();UI.tab='disc';select((GAMES.find(g=>g.series_id==='S1'&&new Date(g.starts_at)>NOW)||GAMES.filter(g=>g.series_id==='S1').sort((x,y)=>new Date(y.starts_at)-new Date(x.starts_at))[0]).id);return}
  if(d==='duo'){ME=USERS.han;toApp();UI.tab='disc';UI.sel=null;render();setTimeout(()=>{openCreate();NG.type='doubles';NG.miss=1;drawCreate()},200);return}
  if(d==='pals'){ME=USERS.han;toApp();UI.tab='mine';UI.sel=null;render();return}
  if(d==='women'){ME=USERS.mia;toApp();UI.tab='disc';select('g20');return}
  if(d==='wlock'){ME=USERS.jason;toApp();UI.tab='disc';select('g20');return}
  if(d==='chat'){ME=USERS.jason;toApp();UI.tab='disc';UI.sel=null;render();setTimeout(()=>CX_INBOX(),150);return}
  if(d==='invsend'){ME=USERS.jason;toApp();UI.tab='disc';UI.sel=null;render();setTimeout(()=>newInvite('han'),200);return}
  if(d==='card'){ME=USERS.jason;toApp();UI.tab='mine';UI.sel=null;render();setTimeout(()=>openCard('jason'),100);return}
  if(d==='mine'){ME=USERS.jason;UI.pastShown=20;toApp();UI.tab='mine';UI.sel=null;render();scrollTo(0,0);return}
  if(d==='dense'){ME=null;toApp();UI.tab='disc';UI.mode='agenda';UI.page=0;UI.sel=null;F.radius=20;LOC={...LOC,lat:-37.845,lng:145.01,label:'Malvern',source:'manual',asked:true};UI.exp=new Set();render();
    setTimeout(()=>{const b=$('[data-exp]');if(b)b.scrollIntoView({block:'center'})},100);return}
  if(d==='host'){ensureJasonPending();ME=USERS.han;LOC={...LOC,lat:VEN.v1.lat,lng:VEN.v1.lng,label:'Glen Iris',source:'club',asked:true};toApp();UI.tab='disc';UI.sel='g1';UI.page=0;render();setTimeout(()=>deskNotify('Jason 申请加入你的球局','UTR 3.0 · '+relDay(api.get('g1').start)+' '+hm(api.get('g1').start)+' · Glen Iris',()=>{select('g1');webFocusApplicant('jason')}),300);return}
  if(d==='link'){ME=null;UI.landing='7Kq2';history.replaceState(null,'','#/g/7Kq2');render();scrollTo(0,0);return}
}

