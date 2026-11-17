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
// B：攒着时打开「只看我的球场」筛选：胶囊数跟着筛选走
ok(await hold(),'再攒一轮');
await pg.evaluate(()=>document.querySelector('#d0 [data-mine]').click());await W(700);
s=await snap();const shown=/\d+/.test(s.pill)?+s.pill.match(/\d+/)[0]:0;
const exp2=await pg.evaluate(()=>(SBV.pend||[]).filter(x=>SBV.homes.includes(x.w)&&!x.area).length);
ok(shown===exp2,'打开「只看我的球场」：胶囊数 = 攒着的里属于我的球场的条数',{shown,exp2,pend:s.pend.length});
await done(b,errs,'T9')})();
