const {open,ok,lab,W,done}=require('./lib.cjs');
(async()=>{const {b,pg,errs,PS}=await open();console.log('T5 底栏');await lab(pg,3);
const E='#d3';
// 等到一句带话题的问题（底栏问题每 4 秒换一句，正式页面的问题池来自配置）
const topicHint=async()=>{await pg.waitForFunction(()=>{const h=SBV.hq,e=document.querySelector('#d3 [data-hint]');return h&&h.tp&&e&&!e.classList.contains('out')},null,{timeout:40000,polling:100});return pg.$eval(PS+' [data-hint]',e=>e.textContent)};const d=await pg.$(PS);await d.scrollIntoViewIfNeeded();
// 问题轮播
const h0=await pg.$eval(PS+' [data-hint]',e=>e.textContent);await W(4600);const h1=await pg.$eval(PS+' [data-hint]',e=>e.textContent);ok(h0!==h1,'底栏问题每 4 秒换一句',`${h0} → ${h1}`);
// 等到一句带话题的问题，再点输入框
// 10-29 起手机端首页输入框不再是真输入框：点一下直接进写动态页（和点相机一样），话题带过去；首页不弹键盘、不出话题条
let hq;hq=await topicHint()
const tap=async sel=>{const h=await d.$(sel);await h.scrollIntoViewIfNeeded();const bb=await h.boundingBox();await pg.mouse.click(bb.x+Math.min(30,bb.width/2),bb.y+bb.height/2)};
const setText=async v=>pg.evaluate(([E,v])=>{const t=document.querySelector(E+' [data-ctext]');t.value=v;t.dispatchEvent(new Event('input',{bubbles:true}))},[E,v]);
await tap('.bar .box');await W(700);
let r=await pg.evaluate(E=>{const el=document.querySelector(E);return {cmp:el.classList.contains('composing'),qing:el.classList.contains('qing'),focus:document.activeElement===el.querySelector('[data-in]'),top:el.querySelector('.ctop').textContent,txt:el.querySelector('[data-ctext]').value}},E);
ok(r.cmp&&!r.qing&&!r.focus,'点输入框：直接进写动态页，首页没有话题条、输入框没焦点',JSON.stringify(r));ok(r.top.replace(/[#\s]/g,'').length>0&&!r.top.includes('加个话题'),'这句问题带出的话题已选好',`${hq} → ${r.top}`);
const chip=r.top.replace(/[#\s]/g,'');
const hy=await pg.$eval(PS+' [data-hint]',e=>e.textContent);await W(4500);const hz=await pg.$eval(PS+' [data-hint]',e=>e.textContent);ok(hz===hy,'正在写时，首页问题停住不换（进写页后量，不受点击前那一下轮换影响）',`${hy} → ${hz}`);
// 带话题发（在写页里写、发布）
await setText('测试：带话题');await pg.evaluate(E=>document.querySelector(E+' [data-cgo]').click(),E);await W(1200);
r=await pg.evaluate(E=>{const el=document.querySelector(E),ln=el.querySelector('[data-s="home"] .ln');return {txt:ln.querySelector('.tx').textContent,tp:(ln.querySelector('.tpl,.flr')||{}).textContent||'',me:ln.querySelector('.un').textContent.trim(),cmp:el.classList.contains('composing'),qing:el.classList.contains('qing'),val:el.querySelector('[data-in]').value,undo:el.querySelector('.undo').classList.contains('show')}},E);
ok(r.txt==='测试：带话题'&&r.tp.includes(chip),'带着话题发出，并有编号',`${chip} → ${r.tp}`);ok(r.me===await pg.evaluate(()=>SBV.api.me),'署名是自己',r.me);ok(!r.cmp&&!r.qing&&r.val==='','发出后写页收起、首页输入框干净');ok(r.undo,'出现可以撤回的提示');
// 撤回
r=await pg.evaluate(async E=>{const el=document.querySelector(E);el.querySelector('[data-undo]').click();await new Promise(r=>setTimeout(r,1200));return el.querySelector('[data-s="home"] .ln .tx').textContent},E);ok(r!=='测试：带话题','撤回：这一条消失',r);
// 点灰色发送箭头也进写页；取消后首页原样
await tap('[data-send]');await W(700);r=await pg.evaluate(E=>document.querySelector(E).classList.contains('composing'),E);ok(r,'点右边的发送箭头：也进写动态页');
await pg.evaluate(E=>document.querySelector(E+' [data-cx]').click(),E);await W(600);
// 点相机：进写页并打开照片
await tap('[data-cam]');await W(800);
r=await pg.evaluate(E=>{const el=document.querySelector(E);return {cmp:el.classList.contains('composing'),lib:!!el.querySelector('.compose .lib'),qing:el.classList.contains('qing')}},E);
ok(r.cmp&&r.lib,'点相机：打开发布页和照片');ok(!r.qing,'首页没有话题条');
await pg.evaluate(E=>document.querySelector(E+' [data-cx]').click(),E);await W(600);
// 球场小单子
r=await pg.evaluate(async E=>{const el=document.querySelector(E);const pl=el.querySelector('[data-place]');const cam=el.querySelector('[data-cam]').getBoundingClientRect().x;pl.click();await new Promise(r=>setTimeout(r,300));const a={open:el.querySelector('.lp').classList.contains('on'),n:el.querySelectorAll('.lp [data-lq]').length};
 el.querySelector('.lp [data-lq="Glen Iris"]').click();await new Promise(r=>setTimeout(r,700));a.pill=pl.textContent.trim();a.closed=!el.querySelector('.lp').classList.contains('on');a.hint=el.querySelector('[data-hint]').textContent;a.camDx=el.querySelector('[data-cam]').getBoundingClientRect().x-cam;
 pl.click();await new Promise(r=>setTimeout(r,300));el.querySelector('[data-sc="home"]').dispatchEvent(new MouseEvent('click',{bubbles:true}));await new Promise(r=>setTimeout(r,300));a.outside=!el.querySelector('.lp').classList.contains('on');
 pl.click();await new Promise(r=>setTimeout(r,300));el.querySelector('.lp [data-lq="none"]').click();await new Promise(r=>setTimeout(r,700));a.none=pl.textContent.trim();a.spans=pl.querySelectorAll('span').length;return a},E);
ok(r.open&&r.n>=4,'点球场：弹出小单子',r.n);ok(r.pill==='GLEN IRIS'&&r.closed,'选 Glen Iris：按钮变成它，单子收起');ok(r.hint.startsWith('Glen Iris'),'底栏问题跟着变',r.hint);ok(Math.abs(r.camDx)<.5,'相机位置不动',r.camDx);ok(r.outside,'点别处，单子收起');ok(r.none==='球场'&&r.spans===1,'选「不选」回到「球场」，按钮里没有残留的文字',r.spans);
await done(b,errs,'T5')})();
