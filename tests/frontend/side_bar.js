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
  const E = (f, a) => pg.evaluate(f, a), W = ms => pg.settle(ms);
  const R = s => E(s => { const r = document.querySelector('#sbHost').shadowRoot; return r.querySelector(s) }, s);
  const q = f => E(new Function(`const r=document.querySelector('#sbHost').shadowRoot;return (${f})(r)`));
  await pg.click('#tabbar [data-tab="side"]'); await W(500);

  const st = () => q(`r=>{const el=r.querySelector('.compose'),b=r.querySelector('.bar .box').getBoundingClientRect(),i=r.querySelector('[data-in]'),a=r.activeElement;
    return {composeOn:el.getBoundingClientRect().top<innerHeight-60,focusIn:a===i||(!!a&&/^(INPUT|TEXTAREA)$/.test(a.tagName)),qing:!!r.querySelector('.qing')||r.querySelector('.view.home').parentElement.classList.contains('qing'),
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
  T('球场标签 / 相机 / 发送键靠右排好，位置和改动前一模一样（量过坐标）', JSON.stringify(pos) === JSON.stringify({ box: [12, 714, 366, 50], where: [225.1, 723, 61.9, 32], cam: [293, 723, 34, 32], send: [333, 719, 40, 40] }), pos);

  // ---- 点提示文字区域 → 进写页，话题（当前提示的话题）带过去，首页输入框仍没焦点 ----
  const hintBefore = await q(`r=>r.querySelector('[data-hint]').textContent`);
  await clickAt('.bar .box', 0.25); await W(700);
  let s1 = await st();
  T('点输入框中间 → 进写动态页', s1.composeOn, s1);
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
  const ghost = await q(`r=>({v:r.querySelector('[data-in]').value,anims:r.getAnimations?r.getAnimations().filter(a=>a.playState==='running'&&a.effect&&a.effect.getTiming().iterations!==Infinity).length:0})`);
  T('没有残留文字、没有挂着没结束的动画', ghost.v === '' && ghost.anims === 0, ghost);

  // ---- 提示带话题（#宝藏球场 这类）：点输入框 → 进写页，话题已选好，首页不出话题条 ----
  const ht = await E(() => SBV.api.hint('ootd')); await W(500);
  await clickAt('.bar .box', 0.3); await W(700); s1 = await st();
  T('带话题的提示：进写页，话题 = 提示的话题，写页提示语 = 该话题的提问', s1.composeOn && s1.topic === '网球人的OOTD' && s1.ph === ht, { s1, ht });
  T('首页仍没话题条、没焦点', !s1.focusIn && !s1.qing && s1.qtpH === 0, s1); await close();

  T('没有页面报错', errs.length === 0, errs);
  console.log(`\n${pass} passed, ${fail} failed`); await b.close(); process.exit(fail ? 1 : 0);
})();
