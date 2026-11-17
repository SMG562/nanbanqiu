// 通用选球场（#335 B1）：附近 + 距离（真实定位）、搜索空态、无定位权限、刷新后还在。
// 入口：发布球局（ng）、约 TA（iv）共用 vpList/vpAct；Home Club 列表是 11-03 定的「按字母、不显示距离」，不在此列（见 loc_persist）。
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const DIR = process.env.NBQ_DIR || path.join(__dirname, '..', '..');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 400) : '')) };
(async () => {
  for (const [name, file] of [['pwa', '南伴球_PWA.html'], ['web', '南伴球_Web.html']]) {
    for (const mode of ['grant', 'deny']) {
      const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
      const ctx = await b.newContext({ viewport: name === 'pwa' ? { width: 390, height: 844 } : { width: 1280, height: 800 }, hasTouch: name === 'pwa', isMobile: name === 'pwa' });
      await ctx.addInitScript(m => { window.__geo = 0; Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition(ok, no) { window.__geo++; m === 'grant' ? ok({ coords: { latitude: -37.8395, longitude: 144.979 } }) : no({ code: 1 }) } } }) }, mode);
      const pg = await ctx.newPage(), errs = []; pg.on('pageerror', e => errs.push(e.message)); pg.on('request', r => { if (process.env.DBG && r.url() !== 'https://nanbanqiu.test/') console.log('REQ', r.url()) });
      await pg.route('https://nanbanqiu.test/**', r => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: fs.readFileSync(path.join(DIR, file)) }));
      await pg.route('https://nanbanqiu.test/vendor/**', r => r.fulfill({ status: 200, contentType: r.request().url().endsWith('.css') ? 'text/css' : 'application/javascript', body: '' })); await pg.route('https://cdnjs.cloudflare.com/**', r => r.abort()); await pg.route('https://basemaps.cartocdn.com/**', r => r.abort());
      const wait = ms => pg.waitForTimeout(ms), N = `${name}/${mode}`;
      await pg.goto('https://nanbanqiu.test/'); await wait(900);
      await pg.evaluate(() => { ME = USERS.jason; ngInit(); NG.search = true; setLoc(CITY.lat, CITY.lng, CITY.center, 'default') });
      const list = (q = '') => pg.evaluate(q => { NG.q = q; const d = document.createElement('div'); d.innerHTML = vpList('ng', NG); return { text: d.textContent, rows: [...d.querySelectorAll('.vp-row:not(.vp-new)')].map(e => e.textContent), sec: [...d.querySelectorAll('.vp-sec')].map(e => e.textContent), loc: !!d.querySelector('[data-ng="vpLocate"]') } }, q);
      let s = await list();
      T(N + ' 没有真实位置：不画假距离，有「使用当前位置」', !/\bkm\b/.test(s.text) && s.loc && !s.sec.some(x => /^附近/.test(x)), s);
      s = await list('zzzzqq'); T(N + ' 无结果：提示「没找到，换个词」', /没找到，换个词/.test(s.text), s.text);
      // 真点一下「使用当前位置」
      await pg.evaluate(() => { openCreate(); NG.search = true; drawCreate() }); await wait(300);
      const hasBtn = await pg.evaluate(() => !!document.querySelector('[data-ng="vpLocate"]')); T(N + ' 界面里有「使用当前位置」', hasBtn);
      if (hasBtn) { await pg.evaluate(() => document.querySelector('[data-ng="vpLocate"]').click()); await wait(400) }
      const after = await pg.evaluate(() => ({ geo: window.__geo, src: LOC.source, label: LOC.label, dom: (document.querySelector('.vp-list') || {}).textContent || '', sec: [...document.querySelectorAll('.vp-sec')].map(e => e.textContent) }));
      T(N + ' 点了会请求定位', after.geo === 1, after);
      if (mode === 'grant') {
        T(N + ' 有权限：位置存为 gps，列表出现「附近」且带距离', after.src === 'gps' && after.sec.some(x => /^附近/.test(x)) && /\d(\.\d)? km|\d+ m/.test(after.dom), after);
        const near = await pg.evaluate(() => { const o = Object.values(VEN).filter(v => !v.custom).map(v => [km(LOC, v), v.short]).sort((a, b) => a[0] - b[0]).map(x => x[1]); return { o, rows: [...document.querySelectorAll('.vp-row:not(.vp-new) b')].map(e => e.textContent) } });
        T(N + ' 「附近」第一个确实是离得最近的', near.o.slice(0, 3).some(n => near.rows.includes(n)), near);
        await pg.reload(); await wait(1900);
        const re = await pg.evaluate(() => ({ src: LOC.source, geo: window.__geo, txt: (() => { ME = USERS.jason; ngInit(); NG.search = true; const d = document.createElement('div'); d.innerHTML = vpList('ng', NG); return d.textContent })() }));
        T(N + ' 刷新后：位置还在，「附近」还在，没有自动再问一次', re.src === 'gps' && /附近/.test(re.txt) && /\d(\.\d)? km|\d+ m/.test(re.txt) && re.geo <= 1, re);
        s = await list('zzzzqq'); T(N + ' 有位置时无结果也提示', /没找到，换个词/.test(s.text));
      } else {
        T(N + ' 无权限：位置不变、不出假距离、列表还能用', after.src === 'default' && !/\bkm\b/.test(after.dom) && after.dom.length > 20, after);
        T(N + ' 无权限：给出提示（toast）', await pg.evaluate(() => /没获得位置权限/.test(document.body.innerText)));
      }
      T(N + ' 无脚本错误', errs.length === 0, errs);
      await b.close();
    }
  }
  console.log(`venue_pick: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
})();
