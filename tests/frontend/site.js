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
  const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)).map(x => e.name + '/' + x) : [e.name]);
  const files = walk(out).sort(), want = [...Object.keys(S.FILES), ...S.GENERATED].sort();
  T('site/ 只有白名单里的文件', JSON.stringify(files) === JSON.stringify(want), { files, want });
  T('不含进度记录、数据库、测试、服务端代码', !files.some(f => /\.(md|sql|py|mjs|cjs)$|^tests|^server|^src/.test(f)), files);
  T('页面和仓库里的文件逐字节一致', Object.entries(S.FILES).every(([to, from]) => fs.readFileSync(path.join(out, to)).equals(fs.readFileSync(path.join(ROOT, from)))));
  // 主屏幕图标：manifest 和 apple-touch-icon 引用的文件都在、是真 PNG、尺寸对；预览站 manifest 从 /pwa.html 打开（根是入口页）
  const png = f => { const b = fs.readFileSync(path.join(out, f)); return b.slice(1, 4).toString() === 'PNG' ? [b.readUInt32BE(16), b.readUInt32BE(20)] : null };
  const mf = JSON.parse(fs.readFileSync(path.join(out, 'manifest.webmanifest'), 'utf8'));
  T('图标：180 / 192 / 512 / maskable 512 都是对应尺寸的 PNG', JSON.stringify([png('icons/icon-180.png'), png('icons/icon-192.png'), png('icons/icon-512.png'), png('icons/icon-maskable-512.png')]) === '[[180,180],[192,192],[512,512],[512,512]]');
  T('manifest 里的图标文件都在 site/ 里', mf.icons.length >= 3 && mf.icons.every(i => files.includes(i.src.replace(/^\//, ''))), mf.icons);
  T('页面的 apple-touch-icon 指向 site/ 里的文件', (() => { const m = fs.readFileSync(path.join(out, 'pwa.html'), 'utf8').match(/rel="apple-touch-icon" href="([^"]+)"/); return !!m && files.includes(m[1].replace(/^\//, '')) })());
  T('预览站 manifest：从 /pwa.html 打开（不是入口页），快捷方式同', mf.start_url === '/pwa.html?source=pwa' && mf.id === '/pwa.html' && mf.shortcuts.every(x => x.url.startsWith('/pwa.html?')), mf);
  const hd = fs.readFileSync(path.join(out, '_headers'), 'utf8');
  T('_headers：全站不让搜索引擎收录、页面不缓存', /^\/\*\n/.test(hd) && /X-Robots-Tag: noindex/.test(hd) && /Cache-Control: no-cache/.test(hd), hd);
  const idx = fs.readFileSync(path.join(out, 'index.html'), 'utf8'), links = [...idx.matchAll(/href="([^"]+)"/g)].map(m => m[1]);
  T('入口页：手机端 / 网页端 / 后台 / 宣传物料，链接都指向 site/ 里的文件', JSON.stringify(links) === '["pwa.html","web.html","admin.html","materials.html"]' && links.every(l => files.includes(l)), links);
  T('入口页写着这次部署的提交（Cloudflare 给的提交号前 7 位）', /提交 0123abc /.test(idx) && /name="robots" content="noindex"/.test(idx));

  // Cloudflare 部署配置：只发布 site/
  const wr = JSON.parse(fs.readFileSync(path.join(ROOT, 'wrangler.jsonc'), 'utf8').replace(/^\s*\/\/.*$/gm, ''));
  T('wrangler.jsonc：Pages 格式，只发布 site/，声明 nodejs_compat（/api 打包 pg 需要）；分享卡片和 /api 走 functions/', wr.pages_build_output_dir === './site' && (wr.compatibility_flags || []).includes('nodejs_compat') && !wr.assets && !wr.main && fs.existsSync(path.join(ROOT, 'functions', 'api', '[[path]].js')), wr);
  T('Worker 入口和 Pages functions 入口都在，并共用 server/og/page.mjs', fs.existsSync(path.join(ROOT, 'worker', 'index.mjs')) && fs.existsSync(path.join(ROOT, 'functions', 'g', '[code].js')) && fs.existsSync(path.join(ROOT, 'functions', 'p', '[no].js')) && /server\/og\/page\.mjs/.test(fs.readFileSync(path.join(ROOT, 'worker', 'index.mjs'), 'utf8')));   // 没有对应文件的路径（/g/码、/p/编号）落到入口页再转走

  // 像线上一样用 http 打开
  const types = { html: 'text/html; charset=utf-8', webmanifest: 'application/manifest+json', webp: 'image/webp' }, miss = [];
  const srv = http.createServer((q, r) => { const p = decodeURIComponent(new URL(q.url, 'http://x').pathname), f = path.join(out, p === '/' ? 'index.html' : p.slice(1));
    if (!f.startsWith(out) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { miss.push(p); r.writeHead(404); r.end(); return }
    r.writeHead(200, { 'content-type': types[f.split('.').pop()] || 'application/octet-stream' }); r.end(fs.readFileSync(f)) }).listen(0);
  const base = `http://127.0.0.1:${srv.address().port}`;
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  for (const [name, vp, check] of [['index.html', { width: 390, height: 844 }, () => document.querySelectorAll('a').length === 4],
    ['materials.html', { width: 390, height: 844 }, () => document.querySelectorAll('#grid .card').length >= 16 && document.documentElement.scrollWidth <= innerWidth],
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
  // 宣传物料页（marketing/）：清单、源文件、图片对得上；手机尺寸能浏览、点开大图、筛选
  {
    const list = S.posters(), mk = path.join(ROOT, 'marketing', 'posters'), nn = p => String(p.id).padStart(2, '0');
    const srcs = fs.readdirSync(mk).filter(f => /^p\d\d_.+\.py$/.test(f)).sort();
    T('物料：posters.json 和 marketing/posters/ 源文件一一对应', JSON.stringify(srcs) === JSON.stringify(list.map(p => `p${nn(p)}_${p.slug.replace(/-/g, '_')}.py`).sort()), { srcs: srcs.length, list: list.length });
    T('物料：每张都有大图和缩略图，且在 site/ 里', list.length >= 16 && list.every(p => files.includes(`materials/img/${S.posterName(p)}.webp`) && files.includes(`materials/thumb/${S.posterName(p)}.webp`)));
    const webp = f => { const x = fs.readFileSync(path.join(out, f)); return x.slice(0, 4).toString() === 'RIFF' && x.slice(8, 12).toString() === 'WEBP' ? [x.readUInt16LE(26) & 0x3fff, x.readUInt16LE(28) & 0x3fff] : null };
    T('物料：大图 1080×1350、缩略图 360×450（webp）', list.every(p => JSON.stringify(webp(`materials/img/${S.posterName(p)}.webp`)) === '[1080,1350]' && JSON.stringify(webp(`materials/thumb/${S.posterName(p)}.webp`)) === '[360,450]'));
    T('物料：编号不重复，每张有文案、创意、用途', new Set(list.map(p => p.id)).size === list.length && list.every(p => p.lines.length && p.concept && p.use && p.title));
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort()); await ctx.route(/^http:\/\/127\.0\.0\.1/, r => r.continue());   // preload 默认拦掉所有 http，本站放行（和上面各页一样）
    const pg = await ctx.newPage(); await pg.goto(`${base}/materials.html`);
    await pg.evaluate(() => { document.querySelectorAll('img').forEach(i => { i.loading = 'eager' }) }); await pg.waitForTimeout(1200);
    const bad = await pg.evaluate(() => [...document.querySelectorAll('#grid img')].filter(i => !(i.complete && i.naturalWidth > 0)).length);
    T('物料页：缩略图全部加载出来', bad === 0, bad);
    await pg.click('#grid .card'); await pg.waitForTimeout(400);
    T('物料页：点开大图，有保存按钮，地址带编号', await pg.evaluate(() => document.getElementById('lb').classList.contains('on') && /materials\/img\/01-/.test(document.getElementById('lbimg').src) && document.getElementById('dl').getAttribute('href').endsWith('.webp') && location.hash === '#01'));
    await pg.click('#next'); await pg.waitForTimeout(200);
    T('物料页：下一张 → 02', await pg.evaluate(() => /materials\/img\/02-/.test(document.getElementById('lbimg').src)));
    await pg.keyboard.press('Escape');
    T('物料页：Esc 关闭', await pg.evaluate(() => !document.getElementById('lb').classList.contains('on')));
    await pg.click('#chips button:nth-child(2)'); const n1 = await pg.evaluate(() => document.querySelectorAll('#grid .card').length);
    T('物料页：筛选后数量变少', n1 > 0 && n1 < list.length, n1);
    await pg.goto(`${base}/materials.html#05`); await pg.waitForTimeout(400);
    T('物料页：带 #编号 打开直接看大图', await pg.evaluate(() => document.getElementById('lb').classList.contains('on') && /materials\/img\/05-/.test(document.getElementById('lbimg').src)));
    await ctx.close();
  }
  // 分享短链接：线上落到入口页（SPA 回退），按屏幕宽度转到手机端 / 网页端并打开对应球局 / 球员卡
  for (const [vp, page, tag] of [[{ width: 390, height: 844 }, 'pwa.html', '手机'], [{ width: 1440, height: 900 }, 'web.html', '电脑']]) {
    const ctx = await b.newContext({ viewport: vp }); await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
    await ctx.route(/\/(g|p)\/\w+/, r => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: idx }));
    await ctx.route(/\/(pwa|web)\.html/, r => r.continue());
    const pg = await ctx.newPage(); await pg.goto(`${base}/g/W2m5?ref=wx`); await pg.waitForTimeout(1500);
    T(`${tag}打开 /g/码：转到 ${page}，带上 ?ref 和 #/g/码`, pg.url() === `${base}/${page}?ref=wx#/g/W2m5`, pg.url());
    await pg.goto(`${base}/p/0001`); await pg.waitForTimeout(800);
    T(`${tag}打开 /p/编号：转到 ${page}#/p/编号`, pg.url() === `${base}/${page}#/p/0001` || pg.url() === `${base}/${page}#/`, pg.url());   // 球员卡打开后页面把 #/p/ 改写成 #/
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
