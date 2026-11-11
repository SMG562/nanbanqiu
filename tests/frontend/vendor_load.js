// L5（11-11）：第三方库本站托管后，带着真实的安全响应头打开手机端 / 网页端，三个库（地图、二维码、截图）真的加载成功，
//   没有被内容安全策略拦下的东西，也没有页面报错。（/vendor/ 文件由测试从仓库里原样提供，等同站点部署后的样子）
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const DIR = process.env.NBQ_DIR || path.join(__dirname, '..', '..');
(async () => {
  const { SECURITY_HEADERS } = await import('file://' + path.join(DIR, 'server/headers.mjs'));
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] }); let bad = 0;
  for (const f of ['南伴球_PWA.html', '南伴球_Web.html']) {
    const ctx = await b.newContext({ viewport: f.includes('PWA') ? { width: 390, height: 844 } : { width: 1360, height: 860 } });
    const pg = await ctx.newPage(), viol = [], errs = [];
    await pg.exposeFunction('__csp', v => viol.push(v));
    await pg.addInitScript(() => document.addEventListener('securitypolicyviolation', e => window.__csp(e.violatedDirective + ' ' + (e.blockedURI || ''))));
    pg.on('pageerror', e => errs.push(e.message));
    const HOST = 'nanbanqiu.test';
    await pg.route(`https://${HOST}/vendor/**`, r => { const p = path.join(DIR, new URL(r.request().url()).pathname); const ok = p.startsWith(path.join(DIR, 'vendor')) && fs.existsSync(p);
      ok ? r.fulfill({ status: 200, body: fs.readFileSync(p), contentType: p.endsWith('.js') ? 'text/javascript' : p.endsWith('.css') ? 'text/css' : 'image/png' }) : r.fulfill({ status: 404, body: '' }) });
    await pg.route(`https://${HOST}/`, r => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', headers: SECURITY_HEADERS, body: fs.readFileSync(path.join(DIR, f)) }));
    await pg.route('https://tile.openstreetmap.org/**', r => r.abort()); await pg.route('https://cdnjs.cloudflare.com/**', r => r.abort());
    await pg.goto(`https://${HOST}/`); await pg.settle(800);
    const got = await pg.evaluate(() => ({ L: typeof L === 'object' && !!L.map, qr: typeof QRCode === 'function', h2c: typeof html2canvas === 'function',
      css: [...document.styleSheets].some(s => (s.href || '').includes('/vendor/leaflet/leaflet.css') && (() => { try { return s.cssRules.length > 50 } catch (e) { return false } })()) }));
    if (!(got.L && got.qr && got.h2c && got.css)) { console.log('FAIL 本站托管的库没有加载成功', f, got); bad++ }
    if (viol.length) { console.log('FAIL 有被内容安全策略拦下的东西', f, viol); bad++ }
    if (errs.length) { console.log('FAIL 页面报错', f, errs.slice(0, 3)); bad++ }
    await ctx.close();
  }
  await b.close(); console.log(bad ? `FAIL vendor_load ${bad}` : 'PASS vendor_load：两端的地图 / 二维码 / 截图库本站加载成功，无 CSP 拦截、无报错'); process.exit(bad ? 1 : 0);
})();
