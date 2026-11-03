// 第五批 5a-3：安全响应头草稿（server/headers.mjs）不会把页面弄坏：三个页面带上这些头打开、点完全部演示（后台跑每一页），
// 没有被内容安全策略拦下的脚本 / 样式 / 图片，也没有报错。
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const DIR = process.env.NBQ_DIR || path.join(__dirname, '..', '..');
(async () => {
  const { SECURITY_HEADERS, ADMIN_HEADERS } = await import('file://' + path.join(DIR, 'server/headers.mjs'));
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] }); let bad = 0;
  for (const f of ['南伴球_PWA.html', '南伴球_Web.html', '南伴球_后台.html']) {
    const ctx = await b.newContext({ viewport: f.includes('PWA') ? { width: 390, height: 844 } : { width: 1360, height: 860 } });
    const pg = await ctx.newPage(), viol = [], errs = [];
    await pg.exposeFunction('__csp', v => viol.push(v));
    await pg.addInitScript(() => document.addEventListener('securitypolicyviolation', e => window.__csp(e.violatedDirective + ' ' + (e.blockedURI || '') + ' ' + (e.sample || '').slice(0, 60))));
    pg.on('pageerror', e => errs.push(e.message));
    const H = f.includes('后台') ? ADMIN_HEADERS : SECURITY_HEADERS;
    await pg.route('https://nanbanqiu.test/**', r => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', headers: H, body: fs.readFileSync(path.join(DIR, f)) }));
    await pg.route('https://cdnjs.cloudflare.com/**', r => r.abort());          // 测试环境不出网：第三方库加载失败页面也要能用
    await pg.route('https://basemaps.cartocdn.com/**', r => r.abort());
    const url = 'https://nanbanqiu.test/' + encodeURIComponent(f);
    await pg.goto(url); await pg.settle(800);
    // 5d：页面报错上报（同一条只记一次，只有信息和位置）
    const er = await pg.evaluate(() => { for (let i = 0; i < 3; i++) dispatchEvent(new ErrorEvent('error', { message: 'nbq-test', filename: 'https://x/app.js?v=1', lineno: 7 })); return NBQ_ERRS.filter(e => e.msg === 'nbq-test') });
    if (!(er.length === 1 && er[0].src === 'app.js' && er[0].line === 7 && ['pwa', 'web', 'admin'].includes(er[0].build))) { console.log('FAIL 页面报错上报', f, er); bad++ }
    if (f.includes('后台')) await pg.evaluate(async () => { doLogin({ preventDefault() { } }); clearInterval(window._tk); for (const p of PAGES.filter(p => p[0] !== 'h').map(p => p[0])) { S.page = p; render(); await new Promise(r => setTimeout(r, 30)) } });
    else { const demos = await pg.evaluate(() => [...document.querySelectorAll('[data-demo]')].map(x => x.dataset.demo));
      for (const d of demos) { await pg.goto(url); await pg.settle(300); await pg.evaluate(d => { try { typeof closeSheet === 'function' ? closeSheet() : closeModal() } catch (e) { } document.querySelector(`[data-demo="${d}"]`).click() }, d); await pg.settle(700) } }
    const v = [...new Set(viol)], e = [...new Set(errs)];
    console.log((v.length || e.length ? 'FAIL ' : 'PASS ') + f + ' 违反策略 ' + v.length + ' 报错 ' + e.length, v.slice(0, 5), e.slice(0, 3));
    if (v.length || e.length) bad++;
    await ctx.close();
  }
  await b.close(); console.log(bad ? 'FAIL csp' : 'PASS csp'); process.exit(bad ? 1 : 0);
})();
