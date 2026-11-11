// 手机端弹层手势与留白（11-03）：弹层顶部要留一条能点的遮罩；往下拖把手 / 顶部能收起、拖得不够会弹回；
// 内容滚动中、输入框里、横滑时不接管；Esc 能收起。起因：弹层顶部离屏幕上沿只剩 12px，点不到空档，也没法下滑收起。
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const DIR = process.env.NBQ_DIR || path.join(__dirname, '..', '..');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 400) : '')) };
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const pg = await ctx.newPage(), errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.route('https://nanbanqiu.test/**', r => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: fs.readFileSync(path.join(DIR, '南伴球_PWA.html')) }));
  await pg.route('https://cdnjs.cloudflare.com/**', r => r.abort()); await pg.route('https://tile.openstreetmap.org/**', r => r.abort());
  await pg.goto('https://nanbanqiu.test/'); await pg.settle(500);
  await pg.evaluate(() => { api.login({ name: 'Tess', last: 'L', ntrp: 4, home_club_ids: [], gender: null }); render() }); await pg.settle(300);
  const shown = () => pg.evaluate(() => document.querySelector('#sheet').classList.contains('show'));
  const rect = () => pg.evaluate(() => { const r = document.querySelector('#sheet').getBoundingClientRect(), d = document.querySelector('.device').getBoundingClientRect(); return { top: r.top - d.top, h: r.height, dh: d.height, sb: parseFloat(getComputedStyle(document.querySelector('.device')).getPropertyValue('--sb')) || 0, tf: document.querySelector('#sheet').style.transform } });
  // 合成触摸：从 (x,y0) 拖到 (x,y1)，中间分几步；返回松手前 / 后的状态由调用方查
  const touch = (sel, dx0, y0off, dy, steps = 6, opts = {}) => pg.evaluate(async ([sel, dx0, y0off, dy, steps, opts]) => {
    const el = document.querySelector(sel), r = el.getBoundingClientRect(), x = r.left + (dx0 ?? r.width / 2), y = r.top + y0off, mk = (type, yy) => { const t = new Touch({ identifier: 1, target: el, clientX: x + (opts.dx ? opts.dx * (yy - y) / (dy || 1) : 0), clientY: yy }); return new TouchEvent(type, { touches: type === 'touchend' ? [] : [t], changedTouches: [t], bubbles: true, cancelable: true }) };
    let prevented = false; el.dispatchEvent(mk('touchstart', y)); for (let i = 1; i <= steps; i++) { const e = mk('touchmove', y + dy * i / steps); el.dispatchEvent(e); if (e.defaultPrevented) prevented = true; await new Promise(r => setTimeout(r, opts.gap ?? 16)) }
    el.dispatchEvent(mk('touchend', y + dy)); return prevented }, [sel, dx0, y0off, dy, steps, opts]);
  const open = async (fn, tall) => { await pg.evaluate(f => { closeSheet(); eval(f) }, fn); await pg.settle(500) };

  // 1) 留白：高弹层（我的 Club 列表）顶部离屏幕上沿至少 状态栏 + 56px，遮罩那一条能点
  await open('openClubs()'); let r = await rect();
  T('弹层打开了', await shown());
  T('高弹层顶部留白 ≥ 状态栏 + 56px（点得到遮罩）', r.top >= r.sb + 56, r);
  T('高弹层没有超出屏幕、也没被压得太矮', r.h <= r.dh - r.sb - 56 + 1 && r.h > 300, r);
  const gapHit = await pg.evaluate(() => { const d = document.querySelector('.device').getBoundingClientRect(), s = document.querySelector('#sheet').getBoundingClientRect(); const y = d.top + (s.top - d.top) / 2 + 4; const el = document.elementFromPoint(d.left + 200, y); return el && el.id });
  T('顶部空档处点到的是遮罩（#sbg）', gapHit === 'sbg', gapHit);
  await pg.evaluate(() => { const d = document.querySelector('.device').getBoundingClientRect(), s = document.querySelector('#sheet').getBoundingClientRect(); document.elementFromPoint(d.left + 200, d.top + (s.top - d.top) / 2 + 4).click() }); await pg.settle(500);
  T('点顶部空档 → 收起', !(await shown()));

  // 2) 往下拖把手：拖过 110px 收起
  await open('openClubs()');
  const prevented = await touch('#sheet .grab', null, 2, 160);
  await pg.settle(600);
  T('拖把手 160px → 收起（且接管了滚动，页面没跟着动）', !(await shown()) && prevented, { shown: await shown(), prevented });
  T('收起后内联样式清干净（下次打开位置正常）', (await rect()).tf === '');
  // 3) 拖得不够：弹回
  await open('openClubs()');
  await touch('#sheet .grab', null, 2, 60, 6, { gap: 40 });
  await pg.settle(600); r = await rect();
  T('只拖 60px → 弹回，不收起', (await shown()) && r.tf === '' && r.top >= r.sb + 56 - 1, r);
  // 4) 甩一下（快速短距离）收起
  await touch('#sheet .grab', null, 2, 80, 8, { gap: 4 });
  await pg.settle(600);
  T('快速下甩 → 收起', !(await shown()));
  // 5) 内容在最上面时，从内容区往下拖也收起（iOS 习惯）
  await open('openClubs()');
  await touch('#clList .cp', null, 20, 170);
  await pg.settle(600);
  T('内容滚到顶，从列表往下拖 → 收起', !(await shown()));
  // 6) 内容滚过：往下拖是滚回去，不收起
  await open('openClubs()');
  await pg.evaluate(() => { document.querySelector('#sheet').scrollTop = 400 }); await pg.settle(100);
  const pv = await touch('#clList .cp', null, 20, 170);
  await pg.settle(500);
  T('内容滚过一段后往下拖 → 不收起、不抢滚动', (await shown()) && !pv, { pv });
  // 7) 横着滑：不接管
  await pg.evaluate(() => { document.querySelector('#sheet').scrollTop = 0 }); await pg.settle(100);
  const ph = await touch('#sheet .sh-t', 20, 4, 20, 6, { dx: 160 });
  await pg.settle(300);
  T('横滑 → 不接管（不收起、不阻止）', (await shown()) && !ph, { ph });
  // 8) 输入框里往下拖：不接管
  await open('openFilter ? 0 : 0'); await pg.evaluate(() => closeSheet()); await pg.settle(300);
  await pg.evaluate(() => { openSheet('<div class="sh-t">测试</div><textarea id="tx" style="width:100%;height:80px"></textarea>') }); await pg.settle(500);
  const pi = await touch('#tx', null, 10, 200);
  await pg.settle(400);
  T('输入框里往下拖 → 不接管（不收起）', (await shown()) && !pi, { pi });
  // 9) 矮弹层也一样能拖
  await open("openSheet('<div class=\"sh-t\">矮弹层</div><p class=\"sh-s\">一点内容</p><button class=\"btn btn-p\">好</button>')");
  await touch('#sheet .grab', null, 2, 150); await pg.settle(600);
  T('矮弹层往下拖也能收起', !(await shown()));
  // 10) 有「返回上一层」的弹层：拖下去 = 返回（和点遮罩一致），弹层还在
  await open("openSheet('<div class=\"sh-t\">第二层</div>'); UI.sheetBack=()=>{window.__back=1;openSheet('<div class=\"sh-t\">第一层</div>')}");
  await touch('#sheet .grab', null, 2, 160); await pg.settle(600);
  T('拖下去在有「返回」的弹层里 = 返回上一层，不是整个关掉', (await pg.evaluate(() => window.__back === 1)) && (await shown()));
  await pg.evaluate(() => closeSheet()); await pg.settle(400);
  // 11) Esc
  await open("openSheet('<div class=\"sh-t\">Esc</div>')");
  await pg.keyboard.press('Escape'); await pg.settle(500);
  T('Esc → 收起', !(await shown()));
  // 12) 全部弹层：逐个打开，高度都不超限、都有顶部留白
  const names = ['openContact', 'openSafety', 'openBlocklist', 'openCommunity', 'openFilter', 'openSuburbPicker', 'openCustom'];
  const bad = [];
  for (const n of names) { try { await pg.evaluate(n => { closeSheet(); if (typeof window[n] === 'function' || typeof eval('typeof ' + n) === 'function') eval(n + '()') }, n); await pg.settle(450); const rr = await rect(); if (await shown()) { if (rr.top < rr.sb + 55 || rr.h > rr.dh) bad.push([n, rr]) } } catch (e) { bad.push([n, String(e).slice(0, 80)]) } }
  T('其他弹层（联系 / 安全 / 屏蔽 / 社群 / 筛选 / 区域 / 定制卡）：顶部都有留白、不超屏', bad.length === 0, bad);
  T('无脚本错误', errs.length === 0, errs);
  await b.close(); console.log(`sheet_gestures: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
})();
