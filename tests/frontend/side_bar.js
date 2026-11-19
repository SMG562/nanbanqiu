// 场边首页输入框回归（10-29 你在 iPhone 上发现：输入框升起 / 落下位置错乱、整页跟着滚、话题条一直冒出来、键盘上方的网址条割裂）：
// 根治方案 = 首页的输入框不再是真输入框：点一下直接进「写动态」页（和点相机一样），首页永远不弹键盘，
// 所以不存在「键盘升降」「话题条跟着跳」「整页被带起来」。这里锁住：点哪里都进写页、话题带过去、首页输入框拿不到焦点、不出现话题条、不残留。
const { chromium } = require('playwright');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? '  ✓ ' : 'FAIL ') + n + (ok || x === undefined ? '' : ' ' + JSON.stringify(x).slice(0, 400))) };
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const pg = await ctx.newPage(), errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('file:///mnt/user-data/outputs/南伴球_PWA.html'); await pg.settle(800);
  await pg.evaluate(() => { LOC.asked = true; closeSheet(); setWho('jason', true) }); await pg.settle(300);
  // 冻结会自己冒动画的两个定时器（#344 / #245：「没有挂着没结束的动画」偶发红，main 上同样，重跑一红一绿）。取证（失败时列出在跑的动画）：
  // 在跑的是输入框提示语轮换（SPAN.hint，每隔几秒换一条、348ms 的动画）；实时流每 5.6 秒冒一条新动态也会撞上，两个一起冻。
  // 光设 SBV.every=1e9 只影响下一次排期，已排好的那次还会响：实时流读 el.matches(':hover')，让它恒为真就整个跳过；提示轮换读 SBV.hintAt（「刚换过不久就不换」），让它恒在未来。
  await pg.evaluate(() => { const m = Element.prototype.matches; Element.prototype.matches = function (q) { return q === ':hover' ? true : m.call(this, q) } });   // 场边实例点「场边」tab 才创建，SBV 此刻还是 null，先只补这一半
  const E = (f, a) => pg.evaluate(f, a), W = ms => pg.settle(ms);
  const R = s => E(s => { const r = document.querySelector('#sbHost').shadowRoot; return r.querySelector(s) }, s);
  const q = f => E(new Function(`const r=document.querySelector('#sbHost').shadowRoot;return (${f})(r)`));
  await pg.click('#tabbar [data-tab="side"]'); await pg.evaluate(() => { SBV.every = 1e9; Object.defineProperty(SBV, 'hintAt', { get: () => Date.now() + 1e9, set() { } }) }); await W(500);

  const st = () => q(`r=>{const el=r.querySelector('.compose'),b=r.querySelector('.bar .box').getBoundingClientRect(),i=r.querySelector('[data-in]'),a=r.activeElement;
    return {composeOn:el.getBoundingClientRect().top<innerHeight-60,focusIn:a===i||(!!a&&/^(INPUT|TEXTAREA)$/.test(a.tagName)&&!a.closest('.compose')),qing:!!r.querySelector('.qing')||r.querySelector('.view.home').parentElement.classList.contains('qing'),
      qtpH:r.querySelector('.qtp').getBoundingClientRect().height,boxTop:Math.round(b.top),boxH:Math.round(b.height),topic:(r.querySelector('.compose .ctop b')||{}).textContent||'',ph:(r.querySelector('.compose textarea')||{}).placeholder||''}}`);
  const clickAt = async (sel, dx = 0.5) => { const bb = await E(new Function(`const r=document.querySelector('#sbHost').shadowRoot,e=r.querySelector(${JSON.stringify(sel)}).getBoundingClientRect();return {x:e.left,y:e.top,w:e.width,h:e.height}`)); await pg.touchscreen.tap(bb.x + bb.w * dx, bb.y + bb.h / 2) };
  const close = async () => { await E(() => document.querySelector('#sbHost').shadowRoot.querySelector('[data-cx]').click()); await W(600) };

  // ---- 首页输入框：静止时的形状 ----
  const s0 = await st();
  T('首页没有写动态页、没有话题条、输入框没焦点', !s0.composeOn && !s0.focusIn && !s0.qing && s0.qtpH === 0, s0);
  const cover = await q(`r=>{const b=r.querySelector('.bar .box').getBoundingClientRect(),o=r.querySelector('[data-open]').getBoundingClientRect(),g=getComputedStyle(r.querySelector('[data-in]'));
    return {sameBox:Math.abs(o.left-b.left)<1&&Math.abs(o.width-b.width)<1&&Math.abs(o.height-b.height)<1,ghostNoPointer:g.pointerEvents==='none',ghostTiny:parseFloat(g.width)<=1,sendNoPointer:getComputedStyle(r.querySelector('[data-send]')).pointerEvents==='none'}}`);
  T('点击层盖住整个输入框；真输入框是点不到的 1px 幽灵；灰着的发送键不吃点击', cover.sameBox && cover.ghostNoPointer && cover.ghostTiny && cover.sendNoPointer, cover);

  const pos = await q(`r=>{const f=x=>{const b=r.querySelector(x).getBoundingClientRect();return [b.left,b.top,b.width,b.height].map(v=>Math.round(v*10)/10)};return {box:f('.bar .box'),where:f('[data-place]'),cam:f('[data-cam]'),send:f('[data-send]')}}`);
  T('球场标签 / 相机 / 发送键靠右排好，位置和改动前一模一样（量过坐标）', JSON.stringify(pos) === JSON.stringify({ box: [12, 726, 366, 50], where: [225.1, 735, 61.9, 32], cam: [293, 735, 34, 32], send: [333, 731, 40, 40] }), pos);

  // ---- 点提示文字区域 → 进写页，话题（当前提示的话题）带过去，首页输入框仍没焦点 ----
  const hintBefore = await q(`r=>r.querySelector('[data-hint]').textContent`);
  await clickAt('.bar .box', 0.25); await W(700);
  let s1 = await st();
  T('点输入框中间 → 进写动态页', s1.composeOn, s1);
  // 11-17 #335：说明文字曾是绝对定位、没底色，键盘升起（页面变矮）后压在输入区上；现在和工具条同属一个有底色的底栏
  { await pg.setViewportSize({ width: 390, height: 470 }); await W(500);
    const o = await q(`r=>{const n=r.querySelector('.compose .cnote').getBoundingClientRect(),t=r.querySelector('.compose .ctool').getBoundingClientRect(),x=r.querySelector('.compose [data-ctext]').getBoundingClientRect(),bar=r.querySelector('.compose .cbot'),bg=getComputedStyle(bar).backgroundColor;return {nb:Math.round(n.bottom),tt:Math.round(t.top),nt:Math.round(n.top),barTop:Math.round(bar.getBoundingClientRect().top),bg,inBar:!!n.width&&bar.contains(r.querySelector('.compose .cnote'))}}`);
    T('写动态页：说明文字在工具条上方、不与它重叠；底栏有底色（矮屏 / 键盘弹出时不透出输入区）', o.inBar && o.nb <= o.tt + 1 && o.nt >= o.barTop && !/rgba\(0, 0, 0, 0\)|transparent/.test(o.bg), o);
    await pg.setViewportSize({ width: 390, height: 844 }); await W(500) }
  // 11-17 #335：键盘开着点「加个话题 / 发布设置 / 球场」，弹层不许在「键盘上方那一小块」里先滑入再落位（先冲到最高点）。
  // 11-20：写页打开即聚焦；照片 / 球场收成键盘上方一行工具条，点它们不收键盘、不弹浮层、不丢已输入的字
  { const foc = () => q(`r=>{const a=r.activeElement,t=r.querySelector('.compose [data-ctext]');return {on:a===t,v:t.value,pickOn:r.querySelector('.pick').classList.contains('on'),shOn:r.querySelector('.csh').classList.contains('on'),cq:r.querySelector('.cqk').classList.contains('on'),lab:r.querySelector('.compose [data-cpl] span').textContent}}`);
    await pg.setViewportSize({ width: 390, height: 470 }); await W(500);
    let f = await foc(); T('写页打开即聚焦输入框', f.on, f);
    const pb = await q(`r=>parseFloat(getComputedStyle(r.querySelector('.compose .ctool')).paddingBottom)`); T('聚焦（键盘在）时工具条下方只留很小空隙，紧贴键盘', pb <= 10, pb);
    await q(`r=>{const t=r.querySelector('.compose [data-ctext]');t.value='今天打得不错';t.dispatchEvent(new Event('input'))}`);
    await q(`r=>{r.querySelector('.compose [data-cpl]').click()}`); await W(200); f = await foc();
    T('点球场：键盘上方展开一行球场芯片，输入框仍聚焦、字还在、没有浮层', f.cq && f.on && f.v === '今天打得不错' && !f.pickOn && !f.shOn, f);
    const k = await q(`r=>{const b=r.querySelector('.compose .cqk [data-ql]:not([data-ql=none])');return b?b.dataset.ql:''}`);
    await q(`r=>{r.querySelector('.compose .cqk [data-ql]:not([data-ql=none])').click()}`); await W(200); f = await foc();
    T('点一个球场芯片：球场标签更新、芯片收起、输入框仍聚焦、字还在', !!k && f.lab !== '球场' && !f.cq && f.on && f.v === '今天打得不错' && !f.pickOn, { k, f });
    await q(`r=>{r.querySelector('.compose [data-lib]').click()}`); await W(300); f = await foc();
    T('点照片：照片格在页内展开，输入框仍聚焦、字还在、没有浮层', f.on && f.v === '今天打得不错' && !f.pickOn && !f.shOn && await q(`r=>!!r.querySelector('.compose .lib')`), f);
    await q(`r=>{r.querySelector('.compose [data-cpl]').click()}`); await W(100);
    await q(`r=>{r.querySelector('.compose .cqk [data-ql=none]').click()}`); await W(200); f = await foc();
    T('选「不选」：标签回到「球场」', f.lab === '球场' && f.on, f);
    await pg.setViewportSize({ width: 390, height: 844 }); await W(500) }
  // 沙盒没有真键盘：把视口缩到 470 高 = 键盘升起（.device.kb），再放回 844 = 键盘收起。
  for (const [name, btn, sel] of [['话题', '.compose [data-ctp]', '.csh'], ['发布设置', '.compose [data-cset]', '.csh'], ['球场（搜索更多）', '.compose [data-cpl2]', '.pick']]) {
    await pg.setViewportSize({ width: 390, height: 470 }); await W(500);
    await q(`r=>{const t=r.querySelector('.compose [data-ctext]');t.focus()}`); await W(100);
    await pg.evaluate(`window.__s=[];const r=document.querySelector('#sbHost').shadowRoot;window.__t=setInterval(()=>{const e=r.querySelector('${sel}'),p=r.querySelector('${sel === '.csh' ? '.csh-p' : '.pick'}');window.__s.push({on:e.classList.contains('on'),top:Math.round(p.getBoundingClientRect().top),kb:document.querySelector('.device').classList.contains('kb')})},20)`);
    await q(`r=>{r.querySelector('${btn}').click()}`); await W(150);
    const early = await E(() => window.__s.slice(-1)[0]);
    await pg.setViewportSize({ width: 390, height: 844 }); await W(900);
    const smp = await E(() => { clearInterval(window.__t); return window.__s }), on = smp.filter(x => x.on), fin = smp.slice(-1)[0];
    T(`键盘开着点「${name}」：键盘收完之前弹层不滑入`, early && !early.on, early);
    T(`键盘开着点「${name}」：弹层只在键盘收起后才出现、位置一路不高于最终位置（不冲顶）`, on.length > 0 && on.every(x => !x.kb) && on.every(x => x.top >= fin.top - 2), { fin, bad: on.filter(x => x.kb || x.top < fin.top - 2).slice(0, 3) });
    await q(`r=>{const b=r.querySelector('${sel === '.csh' ? '.csh-b' : '[data-pkx]'}');b&&b.click()}`); await W(700) }
  T('首页输入框全程没拿到焦点、没出话题条（不会弹键盘）', !s1.focusIn && !s1.qing && s1.qtpH === 0, s1);
  T('不带话题的提示：写页没有话题，用通用提示语', s1.topic === '加个话题' && !!hintBefore, { hintBefore, s1 });
  await close(); let s2 = await st();
  T('取消后回到首页：输入框位置和大小与进去前完全一样（不跳、不漂）', !s2.composeOn && s2.boxTop === s0.boxTop && s2.boxH === s0.boxH, { s0, s2 });

  // ---- 点灰色发送键（它自己不可点）→ 也进写页，不是没反应 ----
  await clickAt('[data-send]'); await W(700); s1 = await st(); T('点右边灰色的发送箭头 → 也进写动态页', s1.composeOn, s1); await close();

  // ---- 点相机 → 进写页并打开相册（原有行为不变）；点球场标签 → 仍是选球场，不进写页 ----
  await clickAt('[data-cam]'); await W(800); s1 = await st();
  T('点相机 → 进写页，选照片区展开', s1.composeOn && await q(`r=>!!r.querySelector('.compose .lib')`), s1); await close();
  await clickAt('[data-place]'); await W(500); s1 = await st();
  T('点球场标签 → 不进写页（还是选球场）', !s1.composeOn, s1);
  await E(() => closeSheet && closeSheet()); await E(() => { const r = document.querySelector('#sbHost').shadowRoot, s = r.querySelector('.scrim'); s && s.click() }); await W(500);

  // ---- 连点 5 次、来回开关：没有残留、页面没被滚动、输入框回到原位 ----
  for (let i = 0; i < 5; i++) { await clickAt('.bar .box', 0.3); await W(120); await close() }
  const s3 = await st(), sy = await E(() => ({ y: scrollY, x: scrollX, d: document.querySelector('.device').getBoundingClientRect().top }));
  T('来回开关 5 次：输入框原位、页面没被带起来', !s3.composeOn && s3.boxTop === s0.boxTop && sy.y === 0 && sy.x === 0 && sy.d === 0, { s3, sy });
  const ghost = await q(`r=>({v:r.querySelector('[data-in]').value,anims:r.getAnimations?r.getAnimations().filter(a=>a.playState==='running'&&a.effect&&a.effect.getTiming().iterations!==Infinity).length:0,what:r.getAnimations().filter(a=>a.playState==='running'&&a.effect&&a.effect.getTiming().iterations!==Infinity).map(a=>{const t=a.effect.target;return (t&&(t.tagName+'.'+t.className))+'|'+(a.animationName||'')+'|'+Math.round(a.effect.getTiming().duration)+'|'+Math.round(a.currentTime)})})`);
  T('没有残留文字、没有挂着没结束的动画', ghost.v === '' && ghost.anims === 0, ghost);

  // ---- 提示带话题（#宝藏球场 这类）：点输入框 → 进写页，话题已选好，首页不出话题条 ----
  const ht = await E(() => SBV.api.hint('ootd')); await W(500);
  await clickAt('.bar .box', 0.3); await W(700); s1 = await st();
  T('带话题的提示：进写页，话题 = 提示的话题，写页提示语 = 该话题的提问', s1.composeOn && s1.topic === '网球人的OOTD' && s1.ph === ht, { s1, ht });
  T('首页仍没话题条、没焦点', !s1.focusIn && !s1.qing && s1.qtpH === 0, s1); await close();

  T('没有页面报错', errs.length === 0, errs);
  console.log(`\n${pass} passed, ${fail} failed`); await b.close(); process.exit(fail ? 1 : 0);
})();
