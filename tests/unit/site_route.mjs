// 正式首页（server/site_route.mjs，11-03 第一轮）：nanbanqiu.app 打开不再是入口页；触屏设备（手机、iPad）横竖都是手机版，电脑按窗口宽度；
// 预览站根仍是入口页；正式站不露宣传物料；Pages 中间件、Workers 入口接上；_routes.json 覆盖要经过函数的路径（漏了 /api 整个接口 404）。
import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm'; import { fileURLToPath } from 'node:url';
import { siteRoute, isProd, PREVIEW_ROOT, NARROW, TOUCH } from '../../server/site_route.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 300) : '')) };
const req = (u, method = 'GET') => new Request(u, { method });
// 在假浏览器里跑选排版页的脚本：给定窗口宽度、是不是触屏为主（和 iOS 一样，screen.width 横屏不变），看跳到哪
async function goes(html, innerWidth, screenWidth, search = '', hash = '', touch = false, noMM = false) {
  const js = html.match(/<script>([\s\S]*?)<\/script>/)[1]; let to = null, asked = null;
  const matchMedia = q => { asked = q; return { matches: touch && q === TOUCH } };
  const win = { innerWidth, screen: { width: screenWidth }, location: { search, hash, replace: u => { to = u } }, fetch: u => { to = u; return new Promise(() => {}) } };
  if (!noMM) win.matchMedia = matchMedia; win.window = win;
  vm.runInNewContext(js, win); return to;   // 载入走 fetch(页面)，失败才 location.replace；两种都记下目标页
}

T('isProd：nanbanqiu.app 和 www，别的不算', isProd('nanbanqiu.app') && isProd('www.nanbanqiu.app') && !isProd(PREVIEW_ROOT) && !isProd('staging.nanbanqiu-preview.pages.dev') && !isProd('evilnanbanqiu.app'));
let r = await siteRoute(req('https://nanbanqiu.app/?source=pwa'));
T('正式站 /：302 到 /melbourne/，参数带上，不缓存', r.status === 302 && r.headers.get('location') === '/melbourne/?source=pwa' && /no-store/.test(r.headers.get('cache-control')), r.headers.get('location'));
r = await siteRoute(req('https://nanbanqiu.app/melbourne/')); const html = await r.text();
T('/melbourne/：200，不缓存，不是入口页（没有后台、宣传物料链接、「演示数据」）', r.status === 200 && /no-store/.test(r.headers.get('cache-control')) && !/admin|materials|演示数据|管理后台/.test(html), html.slice(0, 200));
const cases = [['iPhone 竖屏', 390, 390, true, '/pwa.html'], ['iPhone 横屏', 844, 390, true, '/pwa.html'], ['iPhone Pro Max 横屏（932 宽）', 932, 430, true, '/pwa.html'],
  ['iPad mini 竖屏', 744, 744, true, '/pwa.html'], ['iPad Pro 11 竖屏', 834, 834, true, '/pwa.html'], ['iPad Air 横屏', 1180, 820, true, '/pwa.html'], ['iPad Pro 12.9 横屏', 1366, 1024, true, '/pwa.html'],
  ['电脑', 1440, 1440, false, '/web.html'], ['电脑缩窄窗口', 600, 1440, false, '/pwa.html']];
for (const [n, w, sw, touch, want] of cases) { const to = await goes(html, w, sw, '', '', touch); T(`${touch ? '触屏' : '鼠标'}：${n}（${w}）→ ${want}`, to === want, to) }
T('转屏不换样式：同一台 iPad 竖屏、横屏都是手机版', (await goes(html, 820, 820, '', '', true)) === (await goes(html, 1180, 820, '', '', true)));
T('判断用的是「主要输入是手指」这条媒体查询', html.includes(TOUCH) && TOUCH === '(hover: none) and (pointer: coarse)');
T('老浏览器没有 matchMedia：退回只看宽度，不报错', (await goes(html, 390, 390, '', '', false, true)) === '/pwa.html' && (await goes(html, 1440, 1440, '', '', false, true)) === '/web.html');
T(`电脑分界 ${NARROW}：899 手机版、900 网页版`, (await goes(html, NARROW - 1, 1440)) === '/pwa.html' && (await goes(html, NARROW, 1440)) === '/web.html');
T('原地载入：地址栏不变（fetch 后 document.write，参数和 # 本来就在地址栏里）', /document\.write/.test(html) && /fetch\(a/.test(html));
{ const js = html.match(/<script>([\s\S]*?)<\/script>/)[1]; let to = null; const win = { innerWidth: 390, screen: { width: 390 }, matchMedia: () => ({ matches: true }), location: { search: '?n=3', hash: '#/g/W2m5', replace: u => { to = u } }, fetch: () => Promise.reject(0), document: {} }; win.window = win; vm.runInNewContext(js, win); await new Promise(r => setTimeout(r, 20));
  T('fetch 失败：退回跳转到该版本，参数和 # 带上', to === '/pwa.html?n=3#/g/W2m5', to) }
T('页面带主屏幕图标和安装配置', /rel="manifest" href="\/manifest\.webmanifest"/.test(html) && /rel="apple-touch-icon" href="\/icons\/icon-180\.png"/.test(html));
r = await siteRoute(req('https://nanbanqiu.app/melbourne/', 'HEAD'));
T('HEAD /melbourne/：200、没有正文', r.status === 200 && (await r.text()) === '');
T('预览站根：不管（交给静态入口页）', (await siteRoute(req(`https://${PREVIEW_ROOT}/`))) === null && (await siteRoute(req(`https://${PREVIEW_ROOT}/?x=1`))) === null);
r = await siteRoute(req('https://staging.nanbanqiu-preview.pages.dev/'));
T('分支预览根：和正式站一样进 /melbourne/（合并前真机能测）', r && r.status === 302 && r.headers.get('location') === '/melbourne/');
T('/melbourne（没斜杠）→ /melbourne/；/sydney/ 同一个壳；别的城市名不管', (await siteRoute(req('https://nanbanqiu.app/melbourne?a=1'))).headers.get('location') === '/melbourne/?a=1' && (await (await siteRoute(req('https://nanbanqiu.app/sydney/'))).text()) === html && (await siteRoute(req('https://nanbanqiu.app/paris/'))) === null);
const nav = { 'sec-fetch-dest': 'document' };
for (const p of ['/pwa.html', '/web.html', '/pwa', '/web']) { r = await siteRoute(new Request('https://nanbanqiu.app' + p + '?source=pwa', { headers: nav })); T(`旧地址 ${p} 被浏览器直接打开 → /melbourne/?source=pwa`, r && r.status === 302 && r.headers.get('location') === '/melbourne/?source=pwa', r && r.headers.get('location')) }
T('页面自己 fetch /pwa.html（不是导航）不跳，否则死循环', (await siteRoute(new Request('https://nanbanqiu.app/pwa.html', { headers: { 'sec-fetch-dest': 'empty' } }))) === null && (await siteRoute(req('https://nanbanqiu.app/web.html'))) === null);
T('预览站根的 /pwa.html 入口页直达照常', (await siteRoute(new Request(`https://${PREVIEW_ROOT}/pwa.html`, { headers: nav }))) === null);
for (const p of ['/materials.html', '/materials']) { r = await siteRoute(req('https://nanbanqiu.app' + p)); T(`正式站 ${p} → 回首页`, r && r.status === 302 && r.headers.get('location') === '/') }
T('预览站 /materials.html 照常（不管）', (await siteRoute(req(`https://${PREVIEW_ROOT}/materials.html`))) === null);
T('其他路径不管：/api、/g、/pwa.html、/admin、静态文件、POST /', (await Promise.all(['/api/health', '/g/abc', '/pwa.html', '/web.html', '/admin', '/sw.js'].map(p => siteRoute(req('https://nanbanqiu.app' + p))))).every(x => x === null) && (await siteRoute(req('https://nanbanqiu.app/', 'POST'))) === null);

// 接线
const mw = fs.readFileSync(path.join(ROOT, 'functions', '_middleware.js'), 'utf8');
T('functions/_middleware.js 用 siteRoute，不归它管时 next()', /siteRoute/.test(mw) && /ctx\.next\(\)/.test(mw));
T('worker/index.mjs 也用 siteRoute', /siteRoute\(request\)/.test(fs.readFileSync(path.join(ROOT, 'worker', 'index.mjs'), 'utf8')));
const S = await import(path.join(ROOT, 'tools', 'site.mjs')), inc = S.ROUTES.include;
T('_routes.json：/、/materials、/api/*、/g/*、/p/* 经过函数；没有 /*（静态文件不算函数调用）', ['/', '/melbourne/', '/sydney/', '/pwa.html', '/web.html', '/materials', '/materials.html', '/api/*', '/g/*', '/p/*'].every(x => inc.includes(x)) && !inc.includes('/*') && inc.length <= 100, inc);
// 11-05：嵌套目录也要登记（functions/admin/api/ → /admin/api/*，或更宽的 /admin/*）；只在顶层目录里找会漏掉 /admin/api
const fnDirs = []; const walk = (d, rel) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { if (e.isDirectory()) { if (rel || true) walk(path.join(d, e.name), rel + '/' + e.name) } else if (rel && !e.name.startsWith('_')) { if (!fnDirs.includes(rel)) fnDirs.push(rel) } } };
walk(path.join(ROOT, 'functions'), '');
T('functions/ 下每个放了函数的目录（含嵌套）都在 _routes.json 里，自己或某个上级目录的 /…/*（新加函数忘了登记会 404）', fnDirs.length >= 3 && fnDirs.every(rel => { const parts = rel.split('/').filter(Boolean); return parts.some((_, k) => inc.includes('/' + parts.slice(0, k + 1).join('/') + '/*')) }), fnDirs.filter(rel => { const parts = rel.split('/').filter(Boolean); return !parts.some((_, k) => inc.includes('/' + parts.slice(0, k + 1).join('/') + '/*')) }));
T('嵌套检查有效：把 /admin/api/* 拿掉就会报', !(() => { const rel = '/admin/api', parts = rel.split('/').filter(Boolean), inc2 = inc.filter(x => x !== '/admin/api/*'); return parts.some((_, k) => inc2.includes('/' + parts.slice(0, k + 1).join('/') + '/*')) })());
// #299：选排版壳一执行就把本机缓存的交接码同步写进安装配置（iOS 在页面加载时就读），和手机端页面头部是同一段
{ const { HO_EARLY, chooserHTML } = await import('../../server/site_route.mjs'), pwaHead = fs.readFileSync(path.join(ROOT, 'src/pwa/page/0010-开头.html'), 'utf8');
  T('壳和手机端页面头部用的是同一段（两处一致）', chooserHTML().includes(HO_EARLY + ';var t=') && pwaHead.includes('<link rel="manifest" href="/manifest.webmanifest">\n<script data-ho>' + HO_EARLY + '</script>'));
  const run = (store, now = 1_800_000_000_000) => { const link = { href: '/manifest.webmanifest', setAttribute(k, v) { this[k] = v } };
    vm.runInNewContext(HO_EARLY, { localStorage: { getItem: k => store[k] ?? null }, document: { querySelector: () => link }, JSON, Date: { now: () => now } }); return link.href };
  const code = 'C'.repeat(43), ho = exp => JSON.stringify({ code, exp, uid: 'u' }), T0 = 1_800_000_000_000;
  T('有登录 + 码没过期：同步换成带码的安装配置', run({ nbq_sb: '{}', nbq_ho: ho(T0 + 5 * 3600e3) }) === '/api/manifest?h=' + code);
  T('没登录 / 码快过期 / 码格式不对 / 没有码 / 内容坏了：都不换，也不报错', [{ nbq_ho: ho(T0 + 5 * 3600e3) }, { nbq_sb: '{}', nbq_ho: ho(T0 + 60e3) }, { nbq_sb: '{}', nbq_ho: JSON.stringify({ code: 'x&y=1', exp: T0 + 9e7 }) }, { nbq_sb: '{}' }, { nbq_sb: '{}', nbq_ho: '{oops' }].every(st => run(st) === '/manifest.webmanifest'));
  let threw = false; try { vm.runInNewContext(HO_EARLY, {}) } catch (_) { threw = true } T('没有 localStorage / document 的环境：不抛错', !threw) }
console.log(`site_route: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
