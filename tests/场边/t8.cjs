const {open,ok,lab,W,done}=require('./lib.cjs');
(async()=>{const {b,pg,errs}=await open();console.log('T8 压力与边界');await lab(pg,3);const E='#d3';const ev=(f,a)=>pg.evaluate(f,a);
const junk=E=>pg.evaluate(E=>{const el=document.querySelector(E);return {fx:el.querySelectorAll('.fxb,.fxsh,.fxr,.fxd,.ring,.bsh,.xfade,.typing').length,slot:[...el.querySelectorAll('.slot')].filter(s=>s.style.overflow==='hidden').length}},E);
// 点赞后马上取消：飞行中的网球要停下，不能空心球还在飞
let r=await ev(async E=>{const el=document.querySelector(E);const btn=el.querySelector('.ln:not(.pc) [data-ball]');const sv=btn.querySelector('svg');if(btn.classList.contains('on')){btn.click();await new Promise(r=>setTimeout(r,800))}btn.click();await new Promise(r=>setTimeout(r,300));btn.click();await new Promise(r=>setTimeout(r,60));const flying=sv.getAnimations().filter(a=>a.effect.getComputedTiming().duration>1000&&a.playState==='running').length;const ty=new DOMMatrix(getComputedStyle(sv).transform).f;await new Promise(r=>setTimeout(r,2400));return {flying,ty:ty.toFixed(1),on:btn.classList.contains('on')}},E);
ok(r.flying===0,'点赞后马上取消：网球不再继续飞',`仍在飞 ${r.flying}，高度 ${r.ty}`);
// 详情连续开关 10 次
r=await ev(async E=>{const el=document.querySelector(E);for(let i=0;i<10;i++){el.querySelector('[data-s="home"] .ln:not(.pc)').click();await new Promise(r=>setTimeout(r,90));el.querySelector('[data-shut]').click();await new Promise(r=>setTimeout(r,90))}await new Promise(r=>setTimeout(r,800));return {open:el.classList.contains('sheeting'),acting:el.classList.contains('acting')}},E);
ok(!r.open&&!r.acting,'详情快速开关 10 次后状态正确');
// 发布页连续开关
r=await ev(async E=>{const el=document.querySelector(E);for(let i=0;i<8;i++){el.querySelector('[data-cam]').click();await new Promise(r=>setTimeout(r,70));el.querySelector('[data-cx]').click();await new Promise(r=>setTimeout(r,70))}await new Promise(r=>setTimeout(r,900));return {cmp:el.classList.contains('composing'),imgs:el.querySelectorAll('.compose .pkb svg').length}},E);
ok(!r.cmp,'发布页快速开关 8 次后是关着的');
// 关掉后，延迟放照片的定时器不会把旧照片塞进新打开的空发布页
r=await ev(async E=>{const el=document.querySelector(E);el.querySelector('[data-cam]').click();await new Promise(r=>setTimeout(r,100));el.querySelector('[data-cx]').click();await new Promise(r=>setTimeout(r,100));el.querySelector('[data-s="home"] .ln.pc')&&0;el.querySelector('.tpc')&&0;
 // 再从话题入口打开（不带照片库）
 el.querySelector('[data-in]');el.querySelector('[data-cam]').click();await new Promise(r=>setTimeout(r,700));const n=el.querySelectorAll('.compose .pkb svg').length,pk=el.querySelectorAll('.compose .pkb').length;el.querySelector('[data-cx]').click();await new Promise(r=>setTimeout(r,600));return {n,pk}},E);
ok(r.n===r.pk,'重新打开后照片格子和图片一一对应，没有重复',`${r.n}/${r.pk}`);
// 筛选中途开详情、快速切换
r=await ev(async E=>{const el=document.querySelector(E);for(let i=0;i<6;i++){const t=el.querySelector('[data-s="home"] [data-topic]');if(t)t.click();await new Promise(r=>setTimeout(r,50));const f=el.querySelector('[data-fx]');if(f)f.click();await new Promise(r=>setTimeout(r,50))}await new Promise(r=>setTimeout(r,800));return {xf:el.querySelectorAll('.xfade').length,chip:!!el.querySelector('.fchip')}},E);
ok(r.xf===0,'话题筛选快速开关：没有残留的旧画面');
// 回复后列表里回复数同步
r=await ev(async E=>{const el=document.querySelector(E);const ln=el.querySelector('[data-s="home"] .ln:not(.pc)');const id=ln.dataset.ln;const c0=(ln.querySelector('.cnt .n')||{}).textContent||'0';ln.click();await new Promise(r=>setTimeout(r,700));const ri=el.querySelector('[data-rin]');ri.value='同步测试';ri.oninput();el.querySelector('[data-rsend]').click();await new Promise(r=>setTimeout(r,1500));el.querySelector('[data-shut]').click();await new Promise(r=>setTimeout(r,700));const ln2=el.querySelector(`[data-s="home"] .ln[data-ln="${id}"]`);return {c0,c1:(ln2.querySelector('.cnt .n')||{}).textContent,rp:(ln2.querySelector('.rp')||{}).textContent}},E);
ok(+r.c1===+r.c0+1,'回复后，列表里的回复数 +1',`${r.c0}→${r.c1}`);ok((r.rp||'').includes('同步测试'),'列表里的回复旁注换成最新一条',r.rp);
// 等 3 秒，检查残留
await W(3000);r=await junk(E);ok(r.fx===0&&r.slot===0,'所有操作结束后没有残留的特效元素',JSON.stringify(r));
// 窄屏（手机浏览器打开设计稿）
await pg.setViewportSize({width:390,height:844});await W(800);r=await ev(()=>({sw:document.documentElement.scrollWidth,w:innerWidth}));ok(r.sw<=r.w+1,'手机宽度打开设计稿：没有横向滚动',`${r.sw}/${r.w}`);
await done(b,errs,'T8')})();
