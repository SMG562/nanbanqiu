const {open,ok,lab,W,done}=require('./lib.cjs');
(async()=>{const {b,pg,errs}=await open();console.log('T7 话题墙、相册与其他');await lab(pg,3);const E='#d3';const ev=(f,a)=>pg.evaluate(f,a);
// 今日推荐卡片 → 话题照片墙 → 点一张 → 详情 → 话题条 / 我也发一张
let r=await ev(async E=>{const el=document.querySelector(E);if(el.querySelector('[data-fx]')){el.querySelector('[data-fx]').click();await new Promise(r=>setTimeout(r,600))}el.querySelector('.tpc').click();await new Promise(r=>setTimeout(r,700));const a={grid:!!el.querySelector('.wg'),chip:(el.querySelector('.fchip')||{}).textContent};
 el.querySelector('.wg .wt').click();await new Promise(r=>setTimeout(r,800));a.sheet=el.classList.contains('sheeting');a.fb=!!el.querySelector('.sheet .floorbar');
 el.querySelector('.sheet [data-jie]').click();await new Promise(r=>setTimeout(r,800));a.cmp=el.classList.contains('composing');a.top=el.querySelector('.ctop').textContent;el.querySelector('[data-cx]').click();await new Promise(r=>setTimeout(r,600));a.backToSheet=el.classList.contains('sheeting');
 if(a.backToSheet){el.querySelector('.sheet .fb1').click();await new Promise(r=>setTimeout(r,800));a.fb1=!el.classList.contains('sheeting')&&!!el.querySelector('.fchip')}return a},E);
ok(r.grid&&r.chip,'今日推荐卡片 → 话题照片墙',r.chip);ok(r.sheet&&r.fb,'照片墙点一张 → 详情，有话题条');ok(r.cmp&&r.top.includes('OOTD'),'「我也发一张」→ 发布页带上这个话题',r.top);ok(r.backToSheet,'取消发布后回到详情');ok(r.fb1,'点话题条 → 回到这个话题的筛选');
// 分享这个话题（照片墙）有入口吗
r=await ev(async E=>{const el=document.querySelector(E);if(el.querySelector('[data-fx]')){el.querySelector('[data-fx]').click();await new Promise(r=>setTimeout(r,600))}el.querySelector('.tpc').click();await new Promise(r=>setTimeout(r,700));const b=el.querySelector('[data-tshare]');if(!b)return {none:true};b.click();await new Promise(r=>setTimeout(r,600));const a={on:el.classList.contains('sharing'),card:!!el.querySelector('.share .wtt'),title:(el.querySelector('.share .wtt b')||{}).textContent};el.querySelector('[data-sx]').click();await new Promise(r=>setTimeout(r,600));a.off=!el.classList.contains('sharing')&&!el.classList.contains('inwall');a.still=!!el.querySelector('.fchip');return a},E);
ok(!r.none&&r.on&&r.card,'话题筛选里有「分享这个话题」，打开是这个话题的照片墙卡片',r.title);ok(r.off&&r.still,'关掉分享，回到话题筛选');
// 相册
r=await ev(async E=>{const el=document.querySelector(E);el.querySelector('[data-fx]')&&el.querySelector('[data-fx]').click();await new Promise(r=>setTimeout(r,500));el.querySelector('[data-me]').click();await new Promise(r=>setTimeout(r,700));const a={on:el.classList.contains('albuming')||!!el.querySelector('.album .ah'),n:el.querySelectorAll('.album [data-ln],.album .at,.album .tn').length};el.querySelector('[data-aback]').click();await new Promise(r=>setTimeout(r,600));a.off=!el.className.includes('album');return a},E);
ok(r.on&&r.off,'「我的」→ 相册，能返回',r.n);
// 电脑：我的球场有 / 没有
r=await ev(async()=>{const bs=document.querySelectorAll('[data-home]');const el=document.querySelector('#desk');bs[1].click();await new Promise(r=>setTimeout(r,600));const a={mineBtn:getComputedStyle(el.querySelector('[data-mine]')).display,rail:el.querySelectorAll('.rail .mdot').length};bs[0].click();await new Promise(r=>setTimeout(r,600));a.mineBtn2=getComputedStyle(el.querySelector('[data-mine]')).display;a.rail2=el.querySelectorAll('.rail .mdot').length;return a});
ok(r.mineBtn==='none'&&r.mineBtn2!=='none','电脑：没设我的球场时隐藏「只看我的球场」',`${r.mineBtn}/${r.mineBtn2}`);ok(r.rail===0&&r.rail2>0,'电脑：右栏的我的球场标记跟着变');
// 死代码：球场页、话题墙页还有入口吗
r=await ev(E=>({court:!!document.querySelector('[data-home2]'),wall:typeof S==='undefined'}),E);
await done(b,errs,'T7')})();
