// 定位只问一次（11-03）：选过位置存本机，下次启动（含 iPhone 桌面 App）不再弹「允许使用位置」、不自动调定位；
// Club 列表按拼音字母排序、不按距离。起因：每次从桌面打开都要求允许定位。
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const DIR = process.env.NBQ_DIR || path.join(__dirname, '..', '..');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 400) : '')) };
(async () => {
  for (const [name, file] of [['pwa', '南伴球_PWA.html'], ['web', '南伴球_Web.html']]) {
    const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
    const ctx = await b.newContext({ viewport: name === 'pwa' ? { width: 390, height: 844 } : { width: 1280, height: 800 }, hasTouch: name === 'pwa', isMobile: name === 'pwa' });
    await ctx.addInitScript(() => { window.__geo = 0; try { Object.defineProperty(navigator, 'geolocation', { value: { getCurrentPosition() { window.__geo++ } }, configurable: true }) } catch (e) {} });
    const pg = await ctx.newPage(), errs = []; pg.on('pageerror', e => errs.push(e.message));
    await pg.route('https://nanbanqiu.test/**', r => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: fs.readFileSync(path.join(DIR, file)) }));
    await pg.route('https://cdnjs.cloudflare.com/**', r => r.abort()); await pg.route('https://tile.openstreetmap.org/**', r => r.abort());
    const wait = ms => pg.waitForTimeout(ms);
    await pg.goto('https://nanbanqiu.test/'); await wait(900);
    T(name + ' 首次：没存过位置，会询问一次', await pg.evaluate(() => (!!document.querySelector('#sheet.show') || !!document.querySelector('.locprompt'))));
    await pg.evaluate(() => setLoc(-37.845, 145.01, 'Malvern', 'manual')); await wait(200);
    T(name + ' 选过位置后写入本机', await pg.evaluate(() => { try { return JSON.parse(localStorage.getItem('nbq_loc')).label === 'Malvern' } catch (e) { return false } }));
    await pg.reload(); await wait(1900);
    const s = await pg.evaluate(() => ({ asked: LOC.asked, label: LOC.label, geo: window.__geo, sheet: !!document.querySelector('#sheet.show'), prompt: !!document.querySelector('.locprompt') }));
    T(name + ' 重开：位置还在、不再询问', s.asked === true && s.label === 'Malvern', s);
    T(name + ' 重开：没有弹位置弹层 / 提示条', !s.sheet && !s.prompt, s);
    T(name + ' 重开：没有自动调用定位', s.geo === 0, s);
    const names = await pg.evaluate(() => { CL = []; const d = document.createElement('div'); d.innerHTML = clubRows(); return [...d.querySelectorAll('.cp .v b')].map(e => e.textContent) });
    const sorted = [...names].sort(new Intl.Collator(['zh-Hans-u-co-pinyin', 'en'], { sensitivity: 'base', numeric: true }).compare);
    T(name + ' Club 列表有内容且按字母排序', names.length > 3 && JSON.stringify(names) === JSON.stringify(sorted), names.slice(0, 5));
    const km = await pg.evaluate(() => { const d = document.createElement('div'); d.innerHTML = clubRows(); return /\bkm\b/.test(d.textContent) });
    T(name + ' Club 列表不显示距离', !km);
    T(name + ' 无脚本错误', errs.length === 0, errs);
    await b.close();
  }
  console.log(`loc_persist: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
})();
