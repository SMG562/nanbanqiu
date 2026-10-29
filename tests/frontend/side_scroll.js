// 场边页「整页被带起来 / 卡顿」的回归：手机端外壳钉在视口上（页面本身不能滚）、键盘弹出时外壳缩到可视区并收走底栏、
// 输入框 ≥16px（iOS 不自动放大）、读到一半时别人的新动态不能硬跳滚动位置（先攒着亮「↑ N 条新动态」，回到顶部停稳后再放进来）、呼吸点不再动 box-shadow。
const { chromium } = require('playwright');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? '  ✓ ' : 'FAIL ') + n + (ok || x === undefined ? '' : ' ' + JSON.stringify(x).slice(0, 400))) };
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const pg = await ctx.newPage(), errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('file:///mnt/user-data/outputs/南伴球_PWA.html'); await pg.settle(800);
  await pg.evaluate(() => { LOC.asked = true; closeSheet(); setWho('jason', true) }); await pg.settle(300);
  const E = (f, a) => pg.evaluate(f, a), W = ms => pg.settle(ms);
  await pg.click('#tabbar [data-tab="side"]'); await W(500);

  // ---- 外壳钉在视口上，页面本身不能滚 ----
  const sh = await E(() => { const d = document.querySelector('.device'), r = d.getBoundingClientRect(); return { pos: getComputedStyle(d).position, top: r.top, h: r.height, ih: innerHeight, docH: document.documentElement.scrollHeight, ov: getComputedStyle(document.documentElement).overflow } });
  T('手机端外壳 position:fixed、高度 = 视口', sh.pos === 'fixed' && sh.top === 0 && sh.h === sh.ih, sh);
  T('页面本身不能滚（文档高度 = 视口，overflow:hidden）', sh.docH <= sh.ih && sh.ov === 'hidden', sh);
  await E(() => scrollTo(0, 500)); await W(100);
  T('即使被程序滚了，也立刻回到 0', await E(() => scrollY) === 0);

  // ---- 键盘弹出：外壳缩到可视区，底栏收走；收起后恢复 ----
  const fake = (h, top) => E(([h, top]) => { const vv = visualViewport; Object.defineProperty(vv, 'height', { value: h, configurable: true }); Object.defineProperty(vv, 'offsetTop', { value: top, configurable: true }); vv.dispatchEvent(new Event('resize')) }, [h, top]);
  const geo = () => E(() => { const d = document.querySelector('.device'), r = d.getBoundingClientRect(); return { kb: d.classList.contains('kb'), top: r.top, h: r.height, tab: document.querySelector('#tabbar').getBoundingClientRect().top, box: document.querySelector('#sbHost').shadowRoot.querySelector('.box').getBoundingClientRect().bottom } });
  await fake(520, 0); await W(400); let g = await geo();
  T('键盘弹出：外壳高度 = 可视区', g.kb && g.h === 520, g);
  T('键盘弹出：底栏收到可视区外，输入框贴着键盘上沿', g.tab >= 520 && g.box <= 520 && g.box > 440, g);
  await fake(520, 90); await W(300); g = await geo();
  T('iOS 把页面顶上去 90px：外壳跟着平移，仍然等于可视区', g.top === 90 && g.h === 520, g);
  await fake(844, 0); await W(400); g = await geo();
  T('键盘收起：外壳回到整屏、底栏回来', !g.kb && g.top === 0 && g.h === 844 && g.tab < 844, g);

  // ---- 输入框 ≥ 16px ----
  const fs = await E(() => ['.box input', '.cin input', '.tq input'].map(s => { const e = document.querySelector('#sbHost').shadowRoot.querySelector(s); return e ? parseFloat(getComputedStyle(e).fontSize) : null }));
  T('场边发布栏输入框字号 ≥ 16px', fs[0] >= 16, fs);

  // ---- 呼吸点：动画的是伪元素的 transform / opacity，不是 box-shadow ----
  const dot = await E(() => { const d = document.querySelector('#sbHost').shadowRoot.querySelector('.dot'); const a = getComputedStyle(d, '::after'), s = getComputedStyle(d); return { after: a.animationName, self: s.animationName } });
  T('呼吸点：动画在 ::after 上（合成层），本体不再动 box-shadow', dot.after === 'pu' && dot.self === 'none', dot);

  // ---- 读到一半时来了新动态：不跳、不插，只亮提示；回到顶部停稳后再放进来 ----
  await E(() => { SBV.every = 400 });
  const sc = () => E(() => document.querySelector('#sbHost').shadowRoot.querySelector('[data-sc="home"]').scrollTop);
  await E(() => { document.querySelector('#sbHost').shadowRoot.querySelector('[data-sc="home"]').scrollTop = 600 }); await W(300);
  const q0 = await E(() => SBV.qi), n0 = await E(() => SBV.L.length);
  await pg.waitForFunction(q => SBV.qi >= q + 2 && (SBV.pend || []).length >= 1, q0, { timeout: 15000, polling: 100 }).catch(() => { });
  const mid = await E(() => { const r = document.querySelector('#sbHost').shadowRoot; return { st: r.querySelector('[data-sc="home"]').scrollTop, pend: (SBV.pend || []).length, pill: r.querySelector('[data-more]').classList.contains('show'), txt: r.querySelector('[data-more]').textContent } });
  T('读到一半：滚动位置一动不动（没有硬跳）', mid.st === 600, mid);
  T('读到一半：新动态先攒着，亮「↑ N 条新动态」', mid.pend >= 1 && mid.pill && /条新动态/.test(mid.txt), mid);
  await E(() => { SBV.every = 1e9 });
  await E(() => { document.querySelector('#sbHost').shadowRoot.querySelector('[data-sc="home"]').scrollTop = 0 }); await W(900);
  const top = await E(() => { const r = document.querySelector('#sbHost').shadowRoot; return { pend: SBV.pend ? SBV.pend.length : 0, pill: r.querySelector('[data-more]').classList.contains('show'), rows: r.querySelectorAll('[data-s="home"] .ln').length } });
  T('回到顶部停稳后：攒着的新动态放进列表，提示条收起', top.pend === 0 && !top.pill, top);

  // ---- 帖子卡片：手机上有关闭按钮，能下滑关闭（顶部条拖 / 内容在最上面时下拉），短拖弹回，内容滚下去后下拉不关 ----
  await E(() => { SBV.every = 1e9 });
  const cdp = await ctx.newCDPSession(pg);
  const drag = async (x, y0, dy, steps = 10) => { await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: y0 }] }); for (let i = 1; i <= steps; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y0 + dy * i / steps }] }); await pg.waitForTimeout(16) } };
  const rel = () => cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  const open = async () => { await E(() => { document.querySelectorAll('.banner.show').forEach(b => b.classList.remove('show'));  const r = document.querySelector('#sbHost').shadowRoot; SBV.api.open(+r.querySelector('[data-s="home"] .ln.pc').dataset.ln) }); await W(900) };
  const sst = () => E(() => { const r = document.querySelector('#sbHost').shadowRoot, sh = r.querySelector('.sheet'); return { open: SBV.open, top: Math.round(sh.getBoundingClientRect().top), tf: sh.style.transform, x: r.querySelector('.shx') ? r.querySelector('.shx').getBoundingClientRect().width : 0 } });
  await open(); let ss = await sst();
  T('帖子卡片：手机上有可见的关闭按钮（X）', ss.x >= 28, ss);
  await drag(200, 60, 60); ss = await sst(); T('从顶部条往下拖：卡片跟手', ss.top > 40 && /translateY/.test(ss.tf), ss);
  await rel(); await W(700); ss = await sst(); T('拖得不够远松手：弹回原位，不关', ss.open && ss.top < 20 && ss.tf === '', ss);
  await drag(200, 60, 200); await rel(); await W(900); ss = await sst(); T('拖得够远松手：卡片收起', !ss.open && ss.top > 800, ss);
  await open(); await E(() => document.querySelector('#sbHost').shadowRoot.querySelector('.shx').click()); await W(800); ss = await sst(); T('点 X：卡片收起', !ss.open, ss);
  await open(); await drag(200, 500, 220, 12); await rel(); await W(900); ss = await sst(); T('内容在最上面时往下拉：卡片收起', !ss.open, ss);
  await open(); await E(() => { document.querySelector('#sbHost').shadowRoot.querySelector('.sh-sc').scrollTop = 200 }); await drag(200, 500, 220, 12); await rel(); await W(900); ss = await sst(); T('内容已经滚下去后往下拉：只是滚内容，不关卡片', ss.open && ss.top < 20, ss);
  await E(() => document.querySelector('#sbHost').shadowRoot.querySelector('.shx').click()); await W(600);

  // ---- 键盘 + 回复框：正在输入时，高度少一截（≥120）就算键盘；没输入时要少 ≥200 才算（地址栏收放不误判）----
  await open(); await E(() => document.querySelector('#sbHost').shadowRoot.querySelector('[data-rin]').focus()); await W(200);
  await fake(560, 0); await W(400); g = await geo();
  T('回复框获得焦点 + 键盘：外壳缩到可视区，回复框在键盘上方', g.kb && g.h === 560 && g.box <= 560 && g.box > 400, g);
  await E(() => document.activeElement.blur && document.querySelector('#sbHost').shadowRoot.activeElement && document.querySelector('#sbHost').shadowRoot.activeElement.blur()); await fake(844, 0); await W(500); g = await geo();
  T('收起键盘：外壳回到整屏', !g.kb && g.h === 844, g);
  await fake(760, 0); await W(300); g = await geo(); T('只是地址栏收放（少 84px、没在输入）：不当成键盘', !g.kb, g);
  await fake(844, 0); await E(() => SBV.api.setHome && 0); await E(() => document.querySelector('#sbHost').shadowRoot.querySelector('.shx').click()); await W(600);

  T('没有页面报错', errs.length === 0, errs);
  console.log(`\n${pass} passed, ${fail} failed`); await b.close(); process.exit(fail ? 1 : 0);
})();
