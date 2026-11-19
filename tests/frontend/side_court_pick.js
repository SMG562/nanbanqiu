// 场边「选球场」接真实球场（#335 B2）：附近 + 真实距离、搜索可用、无结果提示、无定位权限、刷新后还在、键盘升起时搜索框在可视区。
// 只测 PWA（场边在 PWA 里是手机写动态页）；网页端场边没验。
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const DIR = process.env.NBQ_DIR || path.join(__dirname, '..', '..');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 400) : '')) };
(async () => {
  for (const mode of ['grant', 'deny']) {
    const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    await ctx.addInitScript(m => { window.__geo = 0; Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition(ok, no) { window.__geo++; m === 'grant' ? ok({ coords: { latitude: -37.8395, longitude: 144.979 } }) : no({ code: 1 }) } } }) }, mode);
    const pg = await ctx.newPage(), errs = []; pg.on('pageerror', e => errs.push(e.message));
    await pg.route('https://nanbanqiu.test/**', r => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: fs.readFileSync(path.join(DIR, '南伴球_PWA.html')) }));
    await pg.route('https://nanbanqiu.test/vendor/**', r => r.fulfill({ status: 200, contentType: r.request().url().endsWith('.css') ? 'text/css' : 'application/javascript', body: '' }));
    await pg.route('https://cdnjs.cloudflare.com/**', r => r.abort()); await pg.route('https://basemaps.cartocdn.com/**', r => r.abort());
    const W = ms => pg.waitForTimeout(ms), E = (f, a) => pg.evaluate(f, a);
    const q = f => E(new Function(`const r=document.querySelector('#sbHost').shadowRoot;return (${f})(r)`));
    const open = async (keepLoc) => { await E(k => { LOC.asked = true; closeSheet(); setWho('jason', true); if (!k) { LOC = { ...LOC, lat: CITY.lat, lng: CITY.lng, label: CITY.center, source: 'default' } } }, keepLoc); await W(300); await pg.click('#tabbar [data-tab="side"]'); await W(500);
      const bb = await q(`r=>{const e=r.querySelector('.bar .box').getBoundingClientRect();return {x:e.left,y:e.top,w:e.width,h:e.height}}`); await pg.touchscreen.tap(bb.x + bb.w * .5, bb.y + bb.h / 2); await W(900); await q(`r=>{r.querySelector('.compose [data-cpl2]').click()}`); await W(900) };
    const pick = () => q(`r=>{const p=r.querySelector('.pick');return {on:p.classList.contains('on'),text:p.textContent,names:[...p.querySelectorAll('.pk-b .pi:not([data-clocate]) b')].map(e=>e.textContent),groups:[...p.querySelectorAll('.pk-l')].map(e=>e.textContent),loc:!!p.querySelector('[data-clocate]')}}`);
    const type = v => q(`r=>{const i=r.querySelector('[data-cq]');i.value=${JSON.stringify(v)};i.dispatchEvent(new Event('input',{bubbles:true}))}`);
    const N = 'side/' + mode;
    await pg.goto('https://nanbanqiu.test/'); await W(900); await open();
    let s = await pick();
    T(N + ' 打开球场选择页', s.on, s);
    T(N + ' 没有真实位置：不出假球场（演示球场名）、不出「附近」，有「使用当前位置」', !/Kooyong Lawn|Glen Iris Park|Fawkner Park\b.*5\.2/.test(s.text) && !s.groups.includes('附近') && s.loc && !/\bkm\b/.test(s.text), s);
    await type('zzqq'); s = await pick();
    T(N + ' 搜索无结果：提示「没找到，换个词」', /没找到，换个词/.test(s.text) && s.names.length === 0, s);
    await type('kooyong'); s = await pick();
    const real = await E(() => Object.values(VEN).filter(v => /kooyong/i.test(v.name + v.short)).map(v => v.short));
    T(N + ' 搜索有结果：列出的是真实球场（来自 VEN）', s.names.length > 0 && s.names.every(n => real.includes(n)), { s: s.names, real });
    // 点一个搜索结果 → 选中，并回到写动态页，球场标签变成它
    await q(`r=>{r.querySelector('.pick [data-loc]:not([data-loc=none])').click()}`); await W(1100);
    const lab = await q(`r=>({loc:(r.querySelector('.compose [data-cpl] span')||{}).textContent||'',pickOn:r.querySelector('.pick').classList.contains('on')})`);
    T(N + ' 选中搜索结果：标签显示它的名字（不是内部编号）', !lab.pickOn && !/^v\d+$/i.test(lab.loc) && real.includes(lab.loc), lab);
    await q(`r=>{r.querySelector('.compose [data-cpl2]').click()}`); await W(900);
    await type(''); s = await pick();
    T(N + ' 选过的球场再打开：「已选」里还在', s.groups.includes('已选') || s.groups.includes('我的球场'), s.groups);
    await q(`r=>{r.querySelector('[data-clocate]').click()}`); await W(600);
    const a = await E(() => ({ geo: window.__geo, src: LOC.source }));
    s = await pick();
    T(N + ' 点「使用当前位置」会请求定位', a.geo === 1, a);
    if (mode === 'grant') {
      T(N + ' 有权限：位置为 gps，出现「附近」并带真实距离', a.src === 'gps' && s.groups.includes('附近') && /\d(\.\d)? km|\d+ m/.test(s.text), { a, g: s.groups });
      const near = await E(() => Object.values(VEN).filter(v => !v.custom).map(v => [km(LOC, v), v.short]).sort((x, y) => x[0] - y[0]).slice(0, 3).map(x => x[1]));
      T(N + ' 「附近」包含离得最近的球场', near.some(n => s.names.includes(n)), { near, names: s.names });
      await pg.reload(); await W(1900); await open(true); s = await pick(); const g = await E(() => window.__geo);
      T(N + ' 刷新后：「附近」和距离还在，没有自动再问定位', s.groups.includes('附近') && /\d(\.\d)? km|\d+ m/.test(s.text) && g <= 1, { g: s.groups, geo: g });
    } else {
      T(N + ' 无权限：位置不变、没有假距离、列表和搜索还能用', a.src === 'default' && !s.groups.includes('附近') && !/\bkm\b/.test(s.text), { a, g: s.groups });
      await type('kooyong'); s = await pick(); T(N + ' 无权限：搜索仍然可用', s.names.length > 0, s);
    }
    // 键盘升起（视口缩到 470）：搜索框在可视区内、列表有高度
    await pg.setViewportSize({ width: 390, height: 470 }); await W(500);
    await q(`r=>{r.querySelector('[data-cq]').focus()}`); await W(400);
    const zfs = await q(`r=>parseFloat(getComputedStyle(r.querySelector('[data-cq]')).fontSize)`);   // iOS Safari 聚焦字号 < 16px 的输入框会放大整页（11-17 真机）
    T('搜索球场输入框字号 ≥ 16px（点它不放大页面）', zfs >= 16, zfs);
    const kb = await q(`r=>{const i=r.querySelector('[data-cq]').getBoundingClientRect(),l=r.querySelector('.pk-b').getBoundingClientRect();return {ib:Math.round(i.bottom),it:Math.round(i.top),lh:Math.round(l.height),vh:innerHeight}}`);
    T(N + ' 键盘升起：搜索框在可视区内，列表还有高度', kb.it >= 0 && kb.ib <= kb.vh && kb.lh > 40, kb);
    T(N + ' 无脚本错误', errs.length === 0, errs);
    await b.close();
  }
  console.log(`side_court_pick: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
})();
