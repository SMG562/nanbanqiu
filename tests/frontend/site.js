// 预览网站（tools/site.mjs → site/，Cloudflare Pages 每次推送自动部署）。
// 只有白名单里的文件（进度记录、数据库、测试、服务端代码不能进）；页面和仓库里拼出来的逐字节一致；入口页三个链接都能打开；
// _headers 不让搜索引擎收录、页面不缓存；用 http 打开（和线上一样的方式），三个页面能跑、没有脚本错误、没有坏掉的本地链接。
const { chromium } = require('playwright'); const fs = require('fs'), os = require('os'), path = require('path'), http = require('http'), url = require('url');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? '  ✓ ' : 'FAIL ') + n + (ok || x === undefined ? '' : ' ' + JSON.stringify(x).slice(0, 400))) };
const ROOT = process.env.NBQ_DIR || path.join(__dirname, '..', '..');
(async () => {
  const S = await import(url.pathToFileURL(path.join(ROOT, 'tools', 'site.mjs')).href);
  process.env.CF_PAGES_COMMIT_SHA = '0123abcdef0123';   // Cloudflare 构建时给的提交号
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'nbq-site-')); S.build(out);
  const files = fs.readdirSync(out).sort(), want = [...Object.keys(S.FILES), ...S.GENERATED].sort();
  T('site/ 只有白名单里的文件', JSON.stringify(files) === JSON.stringify(want), { files, want });
  T('不含进度记录、数据库、测试、服务端代码', !files.some(f => /\.(md|sql|py|mjs|cjs)$|^tests|^server|^src/.test(f)), files);
  T('页面和仓库里的文件逐字节一致', Object.entries(S.FILES).every(([to, from]) => fs.readFileSync(path.join(out, to)).equals(fs.readFileSync(path.join(ROOT, from)))));
  const hd = fs.readFileSync(path.join(out, '_headers'), 'utf8');
  T('_headers：全站不让搜索引擎收录、页面不缓存', /^\/\*\n/.test(hd) && /X-Robots-Tag: noindex/.test(hd) && /Cache-Control: no-cache/.test(hd), hd);
  const idx = fs.readFileSync(path.join(out, 'index.html'), 'utf8'), links = [...idx.matchAll(/href="([^"]+)"/g)].map(m => m[1]);
  T('入口页：手机端 / 网页端 / 后台，链接都指向 site/ 里的文件', JSON.stringify(links) === '["pwa.html","web.html","admin.html"]' && links.every(l => files.includes(l)), links);
  T('入口页写着这次部署的提交（Cloudflare 给的提交号前 7 位）', /提交 0123abc /.test(idx) && /name="robots" content="noindex"/.test(idx));

  // 像线上一样用 http 打开
  const types = { html: 'text/html; charset=utf-8', webmanifest: 'application/manifest+json' }, miss = [];
  const srv = http.createServer((q, r) => { const p = decodeURIComponent(new URL(q.url, 'http://x').pathname), f = path.join(out, p === '/' ? 'index.html' : p.slice(1));
    if (!f.startsWith(out) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { miss.push(p); r.writeHead(404); r.end(); return }
    r.writeHead(200, { 'content-type': types[f.split('.').pop()] || 'application/octet-stream' }); r.end(fs.readFileSync(f)) }).listen(0);
  const base = `http://127.0.0.1:${srv.address().port}`;
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  for (const [name, vp, check] of [['index.html', { width: 390, height: 844 }, () => document.querySelectorAll('a').length === 3],
    ['pwa.html', { width: 390, height: 844 }, () => typeof ME !== 'undefined' && document.querySelectorAll('#tabbar [data-tab]').length >= 4 && CITY.slug === 'melbourne'],
    ['web.html', { width: 1440, height: 900 }, () => typeof ME !== 'undefined' && document.querySelectorAll('#tabs [data-tab]').length === 3 && CITY.slug === 'melbourne'],
    ['admin.html', { width: 1440, height: 900 }, () => getComputedStyle(document.querySelector('#login')).display !== 'none' && /演示身份/.test(document.body.innerText)]]) {
    const ctx = await b.newContext({ viewport: vp }); await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort()); await ctx.route(/^http:\/\/127\.0\.0\.1/, r => r.continue());   // 外部 CDN 不连，只看本站（preload 默认拦掉所有 http，本站放行）
    const pg = await ctx.newPage(), errs = []; pg.on('pageerror', e => errs.push(e.message));
    await pg.goto(`${base}/${name === 'index.html' ? '' : name}`); await pg.waitForTimeout(1200);
    if (name === 'web.html') { await pg.click('#tabs [data-tab="side"]'); await pg.waitForTimeout(800) }
    const ok = await pg.evaluate(check).catch(e => String(e));
    T(`${name}：http 打开能跑${name === 'web.html' ? '（含场边）' : ''}`, ok === true, ok);
    T(`${name}：没有脚本错误`, errs.filter(e => !/\bL is not defined|QRCode|html2canvas/.test(e)).length === 0, errs);
    await ctx.close();
  }
  // 页面里引用的本地文件：线上由后端提供的（/icons/、/<城市>/、/api/、/sw.js）以外都要在 site/ 里
  const bad = [...new Set(miss)].filter(p => !/^\/(icons\/|api\/|sw\.js|favicon\.ico|[a-z]+\/$)/.test(p));
  T('没有坏掉的本地链接（后端才有的除外）', bad.length === 0, bad);
  for (const [to] of Object.entries(S.FILES).filter(([t]) => t.endsWith('.html'))) {
    const refs = [...fs.readFileSync(path.join(out, to), 'utf8').matchAll(/href="([a-z][a-z0-9_-]*\.html)"/g)].map(m => m[1]);
    T(`${to}：链到的 .html 都在 site/ 里`, refs.every(r => files.includes(r)), refs.filter(r => !files.includes(r)));
  }
  await b.close(); srv.close(); fs.rmSync(out, { recursive: true });
  console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1) });
