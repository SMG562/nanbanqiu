const {open,ok,W,done}=require('./lib.cjs');
(async()=>{const {b,pg,errs}=await open();console.log('T1 加载与信息流');
const r=await pg.evaluate(()=>({phones:[0,1,2,3,4,5].map(i=>{const el=document.querySelector('#d'+i);return el&&el.children.length>0}),rows0:document.querySelectorAll('#d0 .ln').length,deskRows:document.querySelectorAll('#desk .ln').length,rail:document.querySelectorAll('#desk .rail [data-court]').length,railTopics:document.querySelectorAll('#desk .rail [data-topic]').length,demo:!!document.querySelector('#demo')}));
ok(r.phones.every(Boolean),'6 台手机都渲染了');ok(r.rows0>5,'第一台信息流有内容',r.rows0);ok(r.deskRows>5,'电脑版信息流有内容',r.deskRows);ok(r.rail>=3&&r.railTopics>=1,'电脑右栏：热闹的球场和大家在聊',`${r.rail}/${r.railTopics}`);
// 实时新消息
const n0=await pg.evaluate(()=>document.querySelectorAll('#d0 [data-s="home"] .ln').length);await W(6500);
const live=await pg.evaluate(()=>({n:document.querySelectorAll('#d0 [data-s="home"] .ln').length,typing:document.querySelectorAll('#d0 .typing').length}));
ok(live.n>n0,'第一台：新消息会自动冒出来',`${n0}→${live.n}`);
// 新消息冒出时，名字那一行与文字同时出现
const sync=await pg.evaluate(()=>new Promise(res=>{const d=document.querySelector('#d0');const t0=performance.now();let mT=null,tT=null;const L=()=>{const ln=d.querySelector('.slot .ln');if(ln){const m=ln.querySelector('.bd>.m'),pill=ln.querySelector('.typing');if(mT===null&&+getComputedStyle(m).opacity>.05)mT=performance.now();if(tT===null&&!pill&&mT!==null)tT=performance.now()}if(performance.now()-t0<9000&&(mT===null||tT===null))requestAnimationFrame(L);else res({mT,tT})};requestAnimationFrame(L)}));
ok(sync.mT&&sync.tT&&Math.abs(sync.mT-sync.tT)<250,'名字行和文字同时出现',sync.mT&&sync.tT?`相差 ${Math.round(Math.abs(sync.mT-sync.tT))} ms`:'没测到');
// 滚到下面时来了新消息 → 出现「有新消息」提示，点它回到顶部
const more=await pg.evaluate(async()=>{const d=document.querySelector('#d0'),sc=d.querySelector('[data-sc="home"]');sc.scrollTop=900;for(let i=0;i<30&&!d.querySelector("[data-more]").classList.contains("show");i++)await new Promise(r=>setTimeout(r,500));const m=d.querySelector('[data-more]');const shown=m&&m.classList.contains('show');if(shown)m.click();await new Promise(r=>setTimeout(r,900));return {shown,top:sc.scrollTop,exists:!!m}});
ok(more.exists,'有「新消息」提示元素');ok(more.shown,'滚动后来了新消息，提示出现');ok(more.top<5,'点提示回到顶部',more.top);
// 不停插入后，没有残留的气泡、slot 等
await W(1500);const left=await pg.evaluate(()=>({slots:[...document.querySelectorAll('#d0 .slot')].filter(s=>s.style.overflow==='hidden').length,bub:document.querySelectorAll('#d0 .tx.bub').length}));
ok(left.slots===0,'新消息动画结束后没有卡住的容器',left.slots);
await done(b,errs,'T1')})();
