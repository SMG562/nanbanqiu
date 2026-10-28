const {open,ok,lab,W,done}=require('./lib.cjs');
(async()=>{const {b,pg,errs,PS}=await open();console.log('T5 底栏');await lab(pg,3);
const E='#d3';
// 等到一句带话题的问题（底栏问题每 4 秒换一句，正式页面的问题池来自配置）
const topicHint=async()=>{await pg.waitForFunction(()=>{const h=SBV.hq,e=document.querySelector('#d3 [data-hint]');return h&&h.tp&&e&&!e.classList.contains('out')},null,{timeout:40000,polling:100});return pg.$eval(PS+' [data-hint]',e=>e.textContent)};const d=await pg.$(PS);await d.scrollIntoViewIfNeeded();
// 问题轮播
const h0=await pg.$eval(PS+' [data-hint]',e=>e.textContent);await W(4600);const h1=await pg.$eval(PS+' [data-hint]',e=>e.textContent);ok(h0!==h1,'底栏问题每 4 秒换一句',`${h0} → ${h1}`);
// 等到一句带话题的问题，再点输入框
let hq;hq=await topicHint()
const tap=async sel=>{const h=await d.$(sel);await h.scrollIntoViewIfNeeded();const bb=await h.boundingBox();await pg.mouse.click(bb.x+Math.min(30,bb.width/2),bb.y+bb.height/2)};await tap('[data-in]');await W(400);
let r=await pg.evaluate(E=>{const el=document.querySelector(E);return {qing:el.classList.contains('qing'),chip:(el.querySelector('.qtp .qt')||{}).textContent||'',hint:el.querySelector('[data-hint]').textContent,focus:document.activeElement===el.querySelector('[data-in]')}},E);
ok(r.qing&&r.focus,'点输入框：可以直接写，上方浮出话题和「展开」');ok(r.chip.length>1,'这句问题带出的话题',`${hq} → ${r.chip}`);
await W(4500);const hz=await pg.$eval(PS+' [data-hint]',e=>e.textContent);ok(hz===r.hint,'正在写时，问题停住不换',hz);
// 去掉话题再发
await pg.evaluate(E=>document.querySelector(E+' [data-qtx]').click(),E);await W(150);
const still=await pg.evaluate(E=>document.activeElement===document.querySelector(E+' [data-in]'),E);ok(still,'点 × 去掉话题，输入框不失焦');
await pg.keyboard.type('测试：不带话题');await pg.keyboard.press('Enter');await W(900);
r=await pg.evaluate(E=>{const el=document.querySelector(E);const ln=el.querySelector('[data-s="home"] .ln');return {txt:ln.querySelector('.tx').textContent,tp:!!ln.querySelector('.tpl'),me:ln.querySelector('.un').textContent.trim(),qing:el.classList.contains('qing'),val:el.querySelector('[data-in]').value,undo:el.querySelector('.undo').classList.contains('show')}},E);
ok(r.txt==='测试：不带话题'&&!r.tp,'回车直接发出，没带话题');ok(r.me===await pg.evaluate(()=>SBV.api.me),'署名是自己',r.me);ok(!r.qing&&r.val==='','发出后底栏收起、清空');ok(r.undo,'出现可以撤回的提示');
// 撤回
r=await pg.evaluate(async E=>{const el=document.querySelector(E);el.querySelector('[data-undo]').click();await new Promise(r=>setTimeout(r,1200));return el.querySelector('[data-s="home"] .ln .tx').textContent},E);ok(r!=='测试：不带话题','撤回：这一条消失',r);
// 带话题发
hq=await topicHint()
await tap('[data-in]');await W(300);const chip=await pg.$eval(PS+' .qtp .qt',e=>e.textContent).catch(()=>'');await pg.keyboard.type('测试：带话题');await pg.keyboard.press('Enter');await W(900);
r=await pg.evaluate(E=>{const ln=document.querySelector(E+' [data-s="home"] .ln');return {txt:ln.querySelector('.tx').textContent,tp:(ln.querySelector('.tpl,.flr')||{}).textContent||''}},E);
ok(r.txt==='测试：带话题'&&chip&&r.tp.includes(chip.replace('#','').trim()),'带着话题发出，并有编号',`${chip} → ${r.tp}`);
// 展开：带着已经写的字和话题进入发布页
hq=await topicHint()
await tap('[data-in]');await W(300);const chip2=await pg.$eval(PS+' .qtp .qt',e=>e.textContent).catch(()=>'');await pg.keyboard.type('想加张照片');
await tap('[data-qx]');await W(700);
r=await pg.evaluate(E=>{const el=document.querySelector(E);return {cmp:el.classList.contains('composing'),txt:el.querySelector('[data-ctext]').value,top:el.querySelector('.ctop').textContent,bar:el.querySelector('[data-in]').value}},E);
ok(r.cmp&&r.txt==='想加张照片','展开：带着已经写的字进入发布页');ok(r.top.replace(/\s/g,'').includes(chip2.replace(/[#\s×]/g,'')),'展开：话题也带过去',`${chip2} → ${r.top}`);ok(r.bar==='','底栏清空');
await pg.evaluate(E=>document.querySelector(E+' [data-cx]').click(),E);await W(600);
// 写了字再点相机：字不能丢
await tap('[data-in]');await W(300);await pg.keyboard.type('先写一句');
await tap('[data-cam]');await W(800);
r=await pg.evaluate(E=>{const el=document.querySelector(E);return {cmp:el.classList.contains('composing'),txt:el.querySelector('[data-ctext]').value,lib:!!el.querySelector('.compose .lib'),bar:el.querySelector('[data-in]').value,qing:el.classList.contains('qing')}},E);
ok(r.cmp&&r.lib,'点相机：打开发布页和照片');ok(r.txt==='先写一句','点相机：底栏写的字带进发布页',JSON.stringify(r));ok(!r.qing,'点相机后底栏收起');
await pg.evaluate(E=>document.querySelector(E+' [data-cx]').click(),E);await W(600);
// 球场小单子
r=await pg.evaluate(async E=>{const el=document.querySelector(E);const pl=el.querySelector('[data-place]');const cam=el.querySelector('[data-cam]').getBoundingClientRect().x;pl.click();await new Promise(r=>setTimeout(r,300));const a={open:el.querySelector('.lp').classList.contains('on'),n:el.querySelectorAll('.lp [data-lq]').length};
 el.querySelector('.lp [data-lq="Glen Iris"]').click();await new Promise(r=>setTimeout(r,700));a.pill=pl.textContent.trim();a.closed=!el.querySelector('.lp').classList.contains('on');a.hint=el.querySelector('[data-hint]').textContent;a.camDx=el.querySelector('[data-cam]').getBoundingClientRect().x-cam;
 pl.click();await new Promise(r=>setTimeout(r,300));el.querySelector('[data-sc="home"]').dispatchEvent(new MouseEvent('click',{bubbles:true}));await new Promise(r=>setTimeout(r,300));a.outside=!el.querySelector('.lp').classList.contains('on');
 pl.click();await new Promise(r=>setTimeout(r,300));el.querySelector('.lp [data-lq="none"]').click();await new Promise(r=>setTimeout(r,700));a.none=pl.textContent.trim();a.spans=pl.querySelectorAll('span').length;return a},E);
ok(r.open&&r.n>=4,'点球场：弹出小单子',r.n);ok(r.pill==='GLEN IRIS'&&r.closed,'选 Glen Iris：按钮变成它，单子收起');ok(r.hint.startsWith('Glen Iris'),'底栏问题跟着变',r.hint);ok(Math.abs(r.camDx)<.5,'相机位置不动',r.camDx);ok(r.outside,'点别处，单子收起');ok(r.none==='球场'&&r.spans===1,'选「不选」回到「球场」，按钮里没有残留的文字',r.spans);
await done(b,errs,'T5')})();
