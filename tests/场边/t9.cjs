// T9 攒着的新动态（#335 后续，11-17）：读到下面时别人冒的新动态先攒着，不碰页面；
// 攒着期间任何重画首页（改筛选 / 改「我的球场」…）都不许把攒着的提前画出来，回顶后也不许重复放一次；胶囊数跟着当前筛选走。
const {open,ok,W,done}=require('./lib.cjs');
(async()=>{const {b,pg,errs}=await open('pwa',{live:true});console.log('T9 攒着的新动态');
const hold=async()=>{await pg.evaluate(()=>{document.querySelector('#d0 [data-sc="home"]').scrollTop=900});await W(400);
  for(let i=0;i<30;i++){if(await pg.evaluate(()=>(SBV.pend||[]).length>0))return true;await W(500)}return false};
const snap=()=>pg.evaluate(()=>{const d=document.querySelector('#d0'),ids=[...d.querySelectorAll('[data-s="home"] [data-ln]')].map(e=>e.dataset.ln),p=d.querySelector('[data-more]');
  return {ids,dup:ids.filter((x,i)=>ids.indexOf(x)!==i),pend:(SBV.pend||[]).map(x=>String(x.id)),pill:p.classList.contains('show')?p.textContent:'',st:d.querySelector('[data-sc="home"]').scrollTop}});
// A：攒着时重画首页
ok(await hold(),'滚到下面后，别人的新动态被攒着（胶囊出现）');
let s=await snap();ok(s.pend.length>0&&/新动态/.test(s.pill),'胶囊写着数量',s.pill);
await pg.evaluate(()=>SBV.api.setHome('Kooyong,Glen Iris'));await W(600);
s=await snap();
ok(s.pend.every(id=>!s.ids.includes(id)),'重画首页后：攒着的还没画进列表（不会提前出现）',{pend:s.pend,inList:s.pend.filter(id=>s.ids.includes(id))});
ok(s.pill.includes(String(s.pend.length)),'重画首页后：胶囊数量没丢',s.pill);
await pg.evaluate(()=>{document.querySelector('#d0 [data-sc="home"]').scrollTop=0});await W(1800);
s=await snap();
ok(s.dup.length===0,'回到顶部放进来之后：列表里没有重复的动态',s.dup);
ok(s.pill==='','放进来之后胶囊收起',s.pill);
// B：胶囊数跟着筛选走。全部在一次同步执行里完成（不被定时器 / 回顶放入打断），攒着的人为造 2 条：一条属于我的球场（Kooyong），一条不属于（Hawthorn）
const B=await pg.evaluate(()=>{const d=document.querySelector('#d0'),pill=()=>{const p=d.querySelector('[data-more]');return p.classList.contains('show')?p.textContent:''};
  SBV.api.setHome('Kooyong,Glen Iris');const base=SBV.L.find(x=>x.w&&!x.area&&!x.mine&&!x.topic);
  const mk=(id,w)=>({...base,id,w,t:Date.now(),b:0,r:[],mine:false,area:false});const a=mk(990001,'Kooyong'),c=mk(990002,'Hawthorn');
  SBV.L.unshift(a,c);SBV.pend=[a,c];SBV.api.setHome('Kooyong,Glen Iris');
  const p0=pill(),inList0=[...d.querySelectorAll('[data-s="home"] [data-ln]')].map(e=>e.dataset.ln).filter(i=>i==='990001'||i==='990002');
  d.querySelector('[data-mine]').click();const p1=pill();d.querySelector('[data-mine]').click();const p2=pill();
  return {p0,p1,p2,inList0}});
ok(B.p0.includes('2')&&B.inList0.length===0,'攒着 2 条（1 条属于我的球场）：胶囊写 2，且都没画进列表',B);
ok(B.p1.includes('1'),'打开「只看我的球场」：胶囊数变成 1（只数属于我的球场的）',B.p1);
ok(B.p2.includes('2'),'关掉筛选：胶囊数回到 2',B.p2);
await W(1500);const E=await snap();ok(E.dup.length===0,'之后回顶放入：没有重复',E.dup);
// C：攒着的被撤回 / 删掉后，不数、不放
const C=await pg.evaluate(()=>{const d=document.querySelector('#d0'),pill=()=>{const p=d.querySelector('[data-more]');return p.classList.contains('show')?p.textContent:''};
  const base=SBV.L.find(x=>x.w&&!x.area&&!x.mine&&!x.topic),mk=(id)=>({...base,id,t:Date.now(),b:0,r:[],mine:false,area:false}),a=mk(990011),c=mk(990012);
  d.querySelector('[data-sc="home"]').scrollTop=900;SBV.L.unshift(a,c);SBV.pend=[a,c];SBV.api.setHome('Kooyong,Glen Iris');const p0=pill();
  SBV.L=SBV.L.filter(y=>y!==c);SBV.api.setHome('Kooyong,Glen Iris');return {p0,p1:pill()}});
ok(C.p0.includes('2')&&C.p1.includes('1'),'攒着的有一条被删掉后：胶囊数少 1',C);
await done(b,errs,'T9')})();
