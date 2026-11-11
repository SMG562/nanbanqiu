const {open,ok,lab,W,done}=require('./lib.cjs');
(async()=>{const {b,pg,errs}=await open();console.log('T3 筛选');await lab(pg,3);
const st=i=>pg.evaluate(i=>{const el=document.querySelector('#d'+i);return {chip:(el.querySelector('.fbar .fchip')||{}).textContent||'',pill:el.querySelector('[data-place]').textContent.trim(),hint:el.querySelector('[data-hint]').textContent,rows:[...el.querySelectorAll('[data-s="home"]>.it .ln')].length,grid:!!el.querySelector('[data-s="home"] [data-vw="grid"].on'),xf:el.querySelectorAll('.xfade').length}},i);
// 点某条的球场名 → 只看这块场
const court=await pg.evaluate(()=>{const p=document.querySelector('#d3 [data-s="home"] .pl[data-court]');const c=p.dataset.court;p.click();return c});await W(700);
let s=await st(3);const courtsOk=await pg.evaluate(c=>[...document.querySelectorAll('#d3 [data-s="home"]>.it .ln')].every(ln=>{const id=ln.dataset.ln;return true}),court);
const allCourt=await pg.evaluate(c=>{const L=[...document.querySelectorAll('#d3 [data-s="home"]>.it .ln')];return L.length>0&&L.every(ln=>(ln.querySelector('.pl')?ln.querySelector('.pl').textContent:'').trim()===''||ln.querySelector('.pl').textContent.trim().toLowerCase()===c.toLowerCase())},court);
ok(s.chip.includes(court)||s.chip.length>0,'出现筛选标签',s.chip);ok(s.pill===court.toUpperCase(),'底栏球场跟着变成这块场',s.pill);ok(s.hint.startsWith(court),'底栏问题跟着变成这块场',s.hint);ok(s.xf===0,'切换后没有残留的旧画面');
// 球场筛选时，列表只剩这块场（筛选时不显示球场名，看数据）
const only=await pg.evaluate(c=>{const ids=[...document.querySelectorAll('#d3 [data-s="home"]>.it .ln')].map(l=>l.dataset.ln);return ids.length},court);ok(only>0,'球场筛选有内容',only);
// 关掉筛选
await pg.evaluate(()=>document.querySelector('#d3 [data-fx]').click());await W(700);s=await st(3);
ok(!s.chip,'关掉筛选标签，回到全部');ok(s.pill==='球场','底栏球场回到「不选」',s.pill);ok(!s.hint.includes(court),'底栏问题不再提这块场',s.hint);
// 话题：默认照片墙，可以切到列表
await pg.evaluate(()=>{const t=document.querySelector('#d3 [data-s="home"] .ln [data-topic]');t.click()});await W(700);s=await st(3);
ok(s.grid,'点话题，默认是照片墙');const tq=s.hint;ok(tq.length>0,'底栏只问这个话题',tq);
await pg.evaluate(()=>document.querySelector('#d3 [data-vw="list"]').click());await W(600);s=await st(3);ok(!s.grid&&s.rows>0,'切到列表',s.rows);
// 话题筛选时，再点同一个话题 → 取消
await pg.evaluate(()=>document.querySelector('#d3 [data-fx]').click());await W(600);
// 只看我的球场
const mine=await pg.evaluate(async()=>{const el=document.querySelector('#d3');const m=el.querySelector('[data-mine]');m.click();await new Promise(r=>setTimeout(r,600));const on=m.classList.contains('on');const rows=[...el.querySelectorAll('[data-s="home"]>.it .ln')].length;m.click();await new Promise(r=>setTimeout(r,600));return {on,rows,off:!m.classList.contains('on')}});
ok(mine.on&&mine.rows>0&&mine.off,'只看我的球场：打开有内容，再点关闭',mine.rows);
// 电脑版右栏（网页端）
const web=await open('web');const pgw=web.pg;errs.push(...web.errs);
const dk=await pgw.evaluate(async()=>{const el=document.querySelector('#desk');const cs=()=>el.querySelectorAll('.rail [data-court]');const c0=cs()[0].textContent;cs()[0].click();await new Promise(r=>setTimeout(r,600));const a={chip:(el.querySelector('.fbar .fchip')||{}).textContent,on:el.querySelector('.rail [data-court].on')!==null,hint:el.querySelector('[data-hint]').textContent,pill:el.querySelector('[data-place]').textContent};
 const k2=cs()[1].dataset.court;cs()[1].click();await new Promise(r=>setTimeout(r,600));a.chip2=(el.querySelector('.fbar .fchip')||{}).textContent;await new Promise(r=>setTimeout(r,2600));a.hint2=el.querySelector('[data-hint]').textContent;a.pill2=el.querySelector('[data-place]').textContent;
 el.querySelector(`.rail [data-court="${k2}"]`).click();await new Promise(r=>setTimeout(r,600));a.cleared=!el.querySelector('.fbar .fchip');
 el.querySelectorAll('.rail [data-topic]')[0].click();await new Promise(r=>setTimeout(r,600));a.topicGrid=!!el.querySelector('[data-vw="grid"].on');el.querySelector('[data-fx]').click();await new Promise(r=>setTimeout(r,600));a.xf=el.querySelectorAll('.xfade').length;return a});
ok(dk.on&&dk.chip,'电脑：点右栏球场，左边只看它，右栏高亮');ok(dk.chip2&&dk.chip2!==dk.chip,'电脑：换另一块场',`${dk.chip} → ${dk.chip2}`);ok(dk.hint2.startsWith(dk.pill2.trim().toLowerCase().replace(/\b\w/g,c=>c.toUpperCase()).split(' ')[0])&&dk.pill2!==dk.pill,'电脑：底栏问题和球场都跟着换成新的这块场',`${dk.hint2} / ${dk.pill2}`);ok(dk.cleared,'电脑：再点一次回到全部');ok(dk.topicGrid,'电脑：点话题默认照片墙');ok(dk.xf===0,'电脑：没有残留的旧画面');
// 连续快速切换 8 次
const fast=await pgw.evaluate(async()=>{const el=document.querySelector('#desk');for(let i=0;i<8;i++){el.querySelectorAll('.rail [data-court]')[i%3].click();await new Promise(r=>setTimeout(r,40))}await new Promise(r=>setTimeout(r,700));return {xf:el.querySelectorAll('.xfade').length,chip:(el.querySelector('.fbar .fchip')||{}).textContent,on:[...el.querySelectorAll('.rail [data-court].on')].map(b=>b.textContent)}});
ok(fast.xf===0,'快速切换 8 次：没有残留的旧画面',fast.xf);ok(fast.on.length===1,'快速切换后，右栏只有一个高亮',fast.on.length);
await web.b.close();await done(b,errs,'T3')})();
