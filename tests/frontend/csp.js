// 第五批 5a-3：安全响应头草稿（server/headers.mjs）不会把页面弄坏：三个页面带上这些头打开、点完全部演示（后台跑每一页），
// 没有被内容安全策略拦下的脚本 / 样式 / 图片，也没有报错。
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const DIR = process.env.NBQ_DIR || path.join(__dirname, '..', '..');
(async () => {
  const { SECURITY_HEADERS, ADMIN_HEADERS } = await import('file://' + path.join(DIR, 'server/headers.mjs'));
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] }); let bad = 0;
  // 后台跑两遍：演示（预览站根域名 = 演示模式）和真模式（其它域名；登录和 /admin/api 用假回应，只看策略和报错）
  for (const [f, real] of [['南伴球_PWA.html', false], ['南伴球_Web.html', false], ['南伴球_后台.html', false], ['南伴球_后台.html', true]]) {
    const HOST = f.includes('后台') && !real ? 'nanbanqiu-preview.pages.dev' : 'nanbanqiu.test';
    const ctx = await b.newContext({ viewport: f.includes('PWA') ? { width: 390, height: 844 } : { width: 1360, height: 860 } });
    const pg = await ctx.newPage(), viol = [], errs = [];
    await pg.exposeFunction('__csp', v => viol.push(v));
    await pg.addInitScript(() => document.addEventListener('securitypolicyviolation', e => window.__csp(e.violatedDirective + ' ' + (e.blockedURI || '') + ' ' + (e.sample || '').slice(0, 60))));
    pg.on('pageerror', e => errs.push(e.message));
    const H = f.includes('后台') ? ADMIN_HEADERS : SECURITY_HEADERS;
    await pg.route(`https://${HOST}/**`, r => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', headers: H, body: fs.readFileSync(path.join(DIR, f)) }));
    await pg.route('https://cdnjs.cloudflare.com/**', r => r.abort());          // 测试环境不出网：第三方库加载失败页面也要能用
    await pg.route('https://tile.openstreetmap.org/**', r => r.abort());
    let authed = false;
    if (real) await pg.route(`https://${HOST}/admin/api/**`, r => { const u = new URL(r.request().url()).pathname, j = (st, b) => r.fulfill({ status: st, contentType: 'application/json', body: JSON.stringify(b) });
      if (u.endsWith('/login')) { authed = true; return j(200, { ok: true, role: 'owner' }) } if (u.endsWith('/me')) return authed ? j(200, { name: 'Han', role: 'owner', perms: [{ action: 'page.view', label: '查看统计和名单', need_reason: false }] }) : j(401, { error: 'admin_session_expired' }); return j(404, {}) });
    const url = `https://${HOST}/` + encodeURIComponent(f);
    await pg.goto(url); await pg.settle(800);
    // 5d：页面报错上报（同一条只记一次，只有信息和位置）
    const er = await pg.evaluate(() => { for (let i = 0; i < 3; i++) dispatchEvent(new ErrorEvent('error', { message: 'nbq-test', filename: 'https://x/app.js?v=1', lineno: 7 })); return NBQ_ERRS.filter(e => e.msg === 'nbq-test') });
    if (!(er.length === 1 && er[0].src === 'app.js' && er[0].line === 7 && ['pwa', 'web', 'admin'].includes(er[0].build))) { console.log('FAIL 页面报错上报', f, er); bad++ }
    if (real) { await pg.fill('#lgEmail', 'a@b.c'); await pg.fill('#lgPw', 'x'.repeat(14)); await pg.fill('#lgCode', '123456'); await pg.click('.go'); await pg.settle(600);
      const okReal = await pg.evaluate(async () => { for (const p of PAGES.filter(p => p[0] !== 'h').map(p => p[0])) { S.page = p; render(); await new Promise(r => setTimeout(r, 30)) } return document.documentElement.dataset.mode === 'real' && getComputedStyle(document.getElementById('app')).display !== 'none' });
      if (!okReal) { console.log('FAIL 后台真模式没能登录并点遍页面'); bad++ } }
    else if (f.includes('后台')) await pg.evaluate(async () => { doLogin({ preventDefault() { } }); clearInterval(window._tk); for (const p of PAGES.filter(p => p[0] !== 'h').map(p => p[0])) { S.page = p; render(); await new Promise(r => setTimeout(r, 30)) } });
    else { const demos = await pg.evaluate(() => [...document.querySelectorAll('[data-demo]')].map(x => x.dataset.demo));
      for (const d of demos) { await pg.goto(url); await pg.settle(300); await pg.evaluate(d => { try { typeof closeSheet === 'function' ? closeSheet() : closeModal() } catch (e) { } document.querySelector(`[data-demo="${d}"]`).click() }, d); await pg.settle(700) } }
    const v = [...new Set(viol)], e = [...new Set(errs)];
    console.log((v.length || e.length ? 'FAIL ' : 'PASS ') + f + (real ? '（真模式）' : '') + ' 违反策略 ' + v.length + ' 报错 ' + e.length, v.slice(0, 5), e.slice(0, 3));
    if (v.length || e.length) bad++;
    await ctx.close();
  }
  await b.close(); console.log(bad ? 'FAIL csp' : 'PASS csp'); process.exit(bad ? 1 : 0);
})();
