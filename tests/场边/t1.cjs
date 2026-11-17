const {open,ok,W,done}=require('./lib.cjs');
(async()=>{const {b,pg,errs}=await open('pwa',{live:true});console.log('T1 加载与信息流');
const r=await pg.evaluate(()=>({phones:[0].map(i=>{const el=document.querySelector('#d'+i);return el&&el.children.length>0}),rows0:document.querySelectorAll('#d0 .ln').length}));
const web=await open('web');const rw=await web.pg.evaluate(()=>({deskRows:document.querySelectorAll('#desk .ln').length,rail:document.querySelectorAll('#desk .rail [data-court]').length,railTopics:document.querySelectorAll('#desk .rail [data-topic]').length}));Object.assign(r,rw);errs.push(...web.errs);await web.b.close();
ok(r.phones.every(Boolean),'手机端场边渲染了');ok(r.rows0>5,'第一台信息流有内容',r.rows0);ok(r.deskRows>5,'电脑版信息流有内容',r.deskRows);ok(r.rail>=3&&r.railTopics>=1,'电脑右栏：热闹的球场和大家在聊',`${r.rail}/${r.railTopics}`);
// 实时新消息
const n0=await pg.evaluate(()=>document.querySelectorAll('#d0 [data-s="home"] .ln').length);await W(6500);
const live=await pg.evaluate(()=>({n:document.querySelectorAll('#d0 [data-s="home"] .ln').length,typing:document.querySelectorAll('#d0 .typing').length,pend:(SBV.pend||[]).length,pill:document.querySelector('#d0 [data-more]').classList.contains('show')}));
// #344：新动态一律先攒着，不自己冒出来（不论用户在不在顶部），只亮「↑ N 条新动态」
ok(live.n===n0&&live.pend>0&&live.pill,'第一台：新消息不自己冒出来，只亮胶囊',`${n0}→${live.n}，攒着 ${live.pend}`);
// 点胶囊才放进来：直接放，没有让高度增长的 slot 动画；回顶、胶囊收起
const more=await pg.evaluate(async()=>{const d=document.querySelector('#d0'),sc=d.querySelector('[data-sc="home"]');sc.scrollTop=900;await new Promise(r=>setTimeout(r,300));const m=d.querySelector('[data-more]');const shown=m&&m.classList.contains('show'),n1=d.querySelectorAll('[data-s="home"] .ln').length;if(shown)m.click();await new Promise(r=>setTimeout(r,120));return {shown,top:sc.scrollTop,exists:!!m,grew:d.querySelectorAll('[data-s="home"] .ln').length>n1,slots:d.querySelectorAll('.slot').length,hidden:!m.classList.contains('show')}});
ok(more.exists,'有「新消息」提示元素');ok(more.shown,'滚动后提示还在');ok(more.top<5,'点提示回到顶部',more.top);
ok(more.grew&&more.slots===0&&more.hidden,'点提示后：攒着的放进来、没有增高的 slot 动画、提示收起',more);
// 不停插入后，没有残留的气泡、slot 等
await pg.evaluate(()=>{SBV.every=1e9});await W(4500);const left=await pg.evaluate(()=>({slots:[...document.querySelectorAll('#d0 .slot')].filter(s=>s.style.overflow==='hidden').length,bub:document.querySelectorAll('#d0 .tx.bub').length}));
ok(left.slots===0,'新消息动画结束后没有卡住的容器',left.slots);
await done(b,errs,'T1')})();
