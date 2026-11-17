// T11 新动态一律先攒着（#344 PR2，11-17）：不论用户在顶部空闲 / 滚在中间 / 滚回顶部，别人的新动态到来时
// 已显示内容的 y 坐标不变（断言 getBoundingClientRect，不只看 scrollTop）；只亮「↑ N 条新动态」；点胶囊才放进来、回顶、收起、无重复。
const {open,ok,W,done}=require('./lib.cjs');
(async()=>{const {b,pg,errs}=await open('pwa',{live:true});console.log('T11 新动态先攒着');
const snap=()=>{const d=document.querySelector('#d0'),sc=d.querySelector('[data-sc="home"]'),sr=sc.getBoundingClientRect();
  const rows=[...d.querySelectorAll('[data-s="home"] [data-ln]')].filter(e=>{const r=e.getBoundingClientRect();return r.bottom>sr.top&&r.top<sr.bottom}).slice(0,4).map(e=>[e.dataset.ln,Math.round(e.getBoundingClientRect().top*10)/10]);
  const p=d.querySelector('[data-more]');return {st:sc.scrollTop,rows,n:d.querySelectorAll('[data-s="home"] [data-ln]').length,pend:(SBV.pend||[]).length,pill:p.classList.contains('show')?p.textContent:''}};
const tops=()=>pg.evaluate(snap);
// 在页面里一次完成：记下现在的样子 → 等攒着的条数增加（最多 25 秒）→ 再记一次，中间没有任何别的操作
const arrive=()=>pg.evaluate(async snapSrc=>{const snap=eval('('+snapSrc+')'),a=snap(),n0=a.pend;SBV.every=300;
  for(let i=0;i<250&&(SBV.pend||[]).length<=n0;i++)await new Promise(r=>setTimeout(r,100));
  const c=snap();SBV.every=5600;return {a,c}},snap.toString());
const same=(a,c)=>a.rows.length>0&&JSON.stringify(a.rows)===JSON.stringify(c.rows);
// A：顶部空闲
await pg.evaluate(()=>{document.querySelector('#d0 [data-sc="home"]').scrollTop=0});await W(600);
let r=await arrive(),a=r.a,c=r.c;
ok(c.pend>a.pend&&/新动态/.test(c.pill),'A 顶部空闲：来了新动态，只亮胶囊',c.pill);
ok(same(a,c)&&c.n===a.n,'A 顶部空闲：已显示的行 y 坐标不变、行数不变',{前:a.rows,后:c.rows});
// B：滚在中间
await pg.evaluate(()=>{document.querySelector('#d0 [data-sc="home"]').scrollTop=600});await W(500);
r=await arrive();a=r.a;c=r.c;
ok(c.pend>a.pend,'B 滚在中间：又来了新动态，胶囊数增加',`${a.pend}→${c.pend}`);
ok(same(a,c)&&c.st===a.st&&c.n===a.n,'B 滚在中间：已显示的行 y 坐标不变、scrollTop 不变',{前:a.rows,后:c.rows});
// C：滚回顶部——不再自动放进来
await pg.evaluate(()=>{document.querySelector('#d0 [data-sc="home"]').scrollTop=0});await W(1800);
a=await tops();ok(a.pend>=2&&/新动态/.test(a.pill),'C 滚回顶部停稳：攒着的仍攒着，胶囊还在',a.pill);
r=await arrive();a=r.a;c=r.c;
ok(c.pend>a.pend&&same(a,c)&&c.n===a.n,'C 滚回顶部后又来新动态：已显示的行 y 坐标不变',{前:a.rows,后:c.rows});
ok(c.pill.includes(String(c.pend)),'胶囊数 = 攒着的条数',`${c.pill} / ${c.pend}`);
// 点胶囊：放进来、回顶、收起、无重复
const k=c.pend,n1=c.n;
await pg.evaluate(()=>{const m=document.querySelector('#d0 [data-more]');m.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,composed:true,view:window}))});await W(500);
const z=await pg.evaluate(()=>{const d=document.querySelector('#d0'),ids=[...d.querySelectorAll('[data-s="home"] [data-ln]')].map(e=>e.dataset.ln),p=d.querySelector('[data-more]');
  return {n:ids.length,dup:ids.filter((x,i)=>ids.indexOf(x)!==i),st:d.querySelector('[data-sc="home"]').scrollTop,pend:(SBV.pend||[]).length,pill:p.classList.contains('show')}});
ok(z.n===n1+k,'点胶囊：攒着的都放进来了',`${n1}+${k}→${z.n}`);
ok(z.st===0&&z.pend===0&&!z.pill,'点胶囊：回到顶部、胶囊收起、攒着清空',z);
ok(z.dup.length===0,'点胶囊后没有重复',z.dup);
// 网格视图（话题照片墙）：攒着的不画进网格，点胶囊才整块重画，无重复。（实时流里带话题的帖子太少，这里人为造一条攒着的；insertPost0 的网格分支没有被自动触发）
await pg.evaluate(()=>{const d=document.querySelector('#d0');d.querySelector('[data-fx]')?.click();d.querySelector('[data-more]').classList.remove('show');SBV.pend=null});await W(300);
const g=await pg.evaluate(async()=>{const d=document.querySelector('#d0'),t=d.querySelector('[data-s="home"] [data-topic]');if(!t)return {err:'没找到话题入口'};t.click();await new Promise(r=>setTimeout(r,700));
  const grid=!!d.querySelector('[data-s="home"] [data-vw="grid"].on');if(!grid)return {err:'没进网格',grid};
  const tp=SBV.f.v,ids=()=>[...d.querySelectorAll('[data-s="home"] [data-ln]')].map(e=>e.dataset.ln),base=SBV.L.find(x=>x.topic===tp)||SBV.L.find(x=>!x.mine&&!x.topic);
  const n0=ids().length,x={...base,id:990101,topic:tp,t:Date.now(),b:0,r:[],mine:false};SBV.L.unshift(x);SBV.pend=[x];
  const held=ids().includes('990101');
  d.querySelector('[data-more]').dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,composed:true,view:window}));await new Promise(r=>setTimeout(r,400));
  const a=ids();return {grid,n0,held,after:a.includes('990101'),dup:a.filter((v,i)=>a.indexOf(v)!==i),pend:(SBV.pend||[]).length}});
ok(!g.err&&!g.held&&g.after&&g.dup.length===0&&g.pend===0,'网格：攒着的不提前画出；点胶囊后放进来、无重复、攒着清空',g);
// 球场页（#344 PR3）：同规则。页面现在没有 UI 入口（t7 标过死代码），用合成的 data-home2 点击打开；
// 别人的新帖攒进 SBV.cpend、只亮球场页自己的胶囊，已显示的行 y 坐标不变；点胶囊才放进来、回顶、收起、无重复。（话题墙 S.wall 没有任何入口，没法打开，不测）
// 实时流是固定顺序（INCOMING）：从源文件里读出来，挑「接下来 12 条里到得最多」的那个球场打开，不靠运气等
const fs=require('fs'),src=fs.readFileSync(__dirname+'/../../src/shared/side/0040-数据.js','utf8'),INC=new Function('return '+src.slice(src.indexOf('INCOMING=[')+9,src.indexOf('\n];',src.indexOf('INCOMING=['))+2))();
const cr=await pg.evaluate(async INC=>{const d=document.querySelector('#d0');
  // 球场页滑进来后盖住了鼠标位置，实时流的「鼠标在上面就不冒新动态」会一直拦着；这里只在测试页里让 :hover 判断恒为否
  const mm=Element.prototype.matches;Element.prototype.matches=function(q){return q===':hover'?false:mm.call(this,q)};
  const cnt={};for(let i=0;i<12;i++){const e=INC[(SBV.qi+i)%INC.length];if(e.w&&!e.ball&&!e.reply&&!e.area)cnt[e.w]=(cnt[e.w]||0)+1}const name=Object.entries(cnt).sort((x,y)=>y[1]-x[1])[0][0];
  const bt=document.createElement('button');bt.dataset.home2=name;d.append(bt);bt.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,composed:true,view:window}));d.classList.add('incourt');await new Promise(r=>setTimeout(r,900));
  const snap=()=>{const sc=d.querySelector('.court .scroll'),sr=sc.getBoundingClientRect(),all=[...d.querySelectorAll('[data-s="court"] [data-ln]')];
    const rows=all.filter(e=>{const r=e.getBoundingClientRect();return r.bottom>sr.top&&r.top<sr.bottom}).slice(0,4).map(e=>[e.dataset.ln,Math.round(e.getBoundingClientRect().top*10)/10]);
    const p=d.querySelector('[data-cmore]');return {rows,ids:all.map(e=>e.dataset.ln),pend:(SBV.cpend||[]).length,pill:p&&p.classList.contains('show')?p.textContent:''}};
  const a=snap();SBV.every=300;for(let i=0;i<300&&(SBV.cpend||[]).length<=a.pend;i++)await new Promise(r=>setTimeout(r,100));const c=snap();SBV.every=5600;
  const k=c.pend;d.querySelector('[data-cmore]').dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,composed:true,view:window}));await new Promise(r=>setTimeout(r,400));
  const z=snap(),sc=d.querySelector('.court .scroll');return {name,a,c,z,st:sc.scrollTop,home:(SBV.pend||[]).length}},INC);
ok(cr.c.pend>cr.a.pend&&/新动态/.test(cr.c.pill),'球场页：来了新动态，只亮球场页自己的胶囊',cr.c.pill);
ok(cr.a.rows.length>0&&JSON.stringify(cr.a.rows)===JSON.stringify(cr.c.rows)&&cr.c.ids.length===cr.a.ids.length,'球场页：已显示的行 y 坐标不变、行数不变',{前:cr.a.rows,后:cr.c.rows});
ok(cr.c.pill.includes(String(cr.c.pend)),'球场页：胶囊数 = 攒着的条数',`${cr.c.pill} / ${cr.c.pend}`);
ok(cr.z.ids.length===cr.a.ids.length+cr.c.pend&&cr.z.pend===0&&!cr.z.pill&&cr.st===0,'球场页：点胶囊放进来、攒着清空、胶囊收起、回顶',{前:cr.a.ids.length,攒:cr.c.pend,后:cr.z.ids.length,pill:cr.z.pill,st:cr.st});
ok(cr.z.ids.filter((v,i)=>cr.z.ids.indexOf(v)!==i).length===0,'球场页：点胶囊后没有重复');
await done(b,errs,'T11')})();
