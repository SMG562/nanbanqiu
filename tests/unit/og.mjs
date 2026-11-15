// 分享链接卡片（server/og）：文案规则、head 改写（转义、补标签）、通用兜底、整页处理（用仓库里的手机端 / 网页端页面当资源）
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { relDay, ogTitle, ogDesc, rewriteHead, cardFor, fromApiGame, BRAND } from '../../server/og/card.mjs';
import { sharePage } from '../../server/og/page.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 300) : '')) };
const NOW = new Date('2026-10-29T08:00:00+11:00');   // 墨尔本周四
T('relDay：今晚 / 今天 / 明晚 / 明天 / 后天 / 昨天 / 周几', [relDay(0, '18:00', NOW), relDay(0, '09:00', NOW), relDay(1, '19:00', NOW), relDay(1, '08:00', NOW), relDay(2, '10:00', NOW), relDay(-1, '10:00', NOW), relDay(3, '10:00', NOW), relDay(6, '10:00', NOW)].join() === '今晚,今天,明晚,明天,后天,昨天,周日,周三');
T('relDay：按墨尔本日期算（UTC 还是前一天时）', relDay(0, '18:00', new Date('2026-10-28T14:30:00Z')) === '今晚' && relDay(1, '18:00', new Date('2026-10-28T14:30:00Z')) === '明晚');
const G = { code: 'x', o: 0, t: '18:00', v: 'South Camberwell TC', type: 'singles', spots: 1, lvl: '4.5', host: 'Han Liu', hu: '4.5' };
T('标题：缺位', ogTitle(G, NOW) === '今晚 18:00 · South Camberwell TC · 缺1位球友 · UTR 4.5', ogTitle(G, NOW));
T('标题：已满员', ogTitle({ ...G, spots: 0 }, NOW) === '今晚 18:00 · South Camberwell TC · 已满员');
T('描述', ogDesc(G) === '单打｜发起人 Han Liu UTR 4.5 · 南伴球' && ogDesc({ ...G, type: 'doubles' }).startsWith('双打｜') && ogDesc({ ...G, type: 'rally' }).startsWith('拉球｜'));
const H = '<head><title>旧</title><meta property="og:title" content="旧标题"><meta property="og:image" content="x"></head><body></body>';
const R = rewriteHead(H, { title: 'A "引号" <b> & c', desc: 'd', image: 'https://e/i.png', url: 'https://e/g/1' });
T('改写：标题换掉、引号和尖括号转义', /<meta property="og:title" content="A &quot;引号&quot; &lt;b&gt; &amp; c">/.test(R) && !/旧标题/.test(R) && /<title>A &quot;引号&quot; &lt;b&gt; &amp; c<\/title>/.test(R), R);
T('改写：缺的标签补上（描述 / url / site_name），不重复', /og:description" content="d"/.test(R) && /og:url" content="https:\/\/e\/g\/1"/.test(R) && /og:site_name" content="南伴球"/.test(R) && (R.match(/og:title/g) || []).length === 1 && (R.match(/og:image/g) || []).length === 1);
const D = { games: [G], users: [{ no: 7, name: 'Grace Lin', ntrp: '3.5' }] };
const c1 = cardFor('g', 'x', D, 'https://nanbanqiu.app', '/g/x', NOW);
T('分享码对得上：球局自己的卡片，图片是同域名的图标', c1.title === ogTitle(G, NOW) && c1.image === 'https://nanbanqiu.app/icons/og-share.jpg' && c1.url === 'https://nanbanqiu.app/g/x', c1);
const c2 = cardFor('g', 'nope', D, 'https://nanbanqiu.app', '/g/nope', NOW);
T('分享码不存在：品牌通用卡片（不报错、不露别的球局）', c2.title === BRAND.title && c2.desc === BRAND.desc, c2);
const c3 = cardFor('p', '0007', D, 'https://nanbanqiu.app', '/p/0007', NOW);
T('球员卡：名字只取第一个词 + UTR，编号前导 0 也认', c3.title === 'Grace · UTR 3.5' && !/Lin/.test(c3.title + c3.desc), c3);
const files = { '/pwa.html': fs.readFileSync(path.join(ROOT, '南伴球_PWA.html')), '/web.html': fs.readFileSync(path.join(ROOT, '南伴球_Web.html')) };
const env = { ASSETS: { fetch: async req => { const p = new URL(req.url).pathname; return files[p] ? new Response(files[p], { headers: { 'content-type': 'text/html' } }) : new Response('nf', { status: 404 }) } } };
const req = (u, ua) => new Request('https://nanbanqiu.app' + u, { headers: { 'user-agent': ua } });
const MOB = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile/15E148', DESK = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/130';
let r = await sharePage('g', 'x', req('/g/x?s=wx', MOB), env, D), t = await r.text();
T('整页：选排版壳（和 /melbourne/ 同一个）+ 这条球局的卡片，网址不变，不缓存；不再按 UA 选页面', r.status === 200 && /document\.write/.test(t) && /\(hover: none\) and \(pointer: coarse\)/.test(t) && /og:title" content="[^"]*South Camberwell TC/.test(t) && /no-store/.test(r.headers.get('cache-control')), r.status);
r = await sharePage('g', 'x', req('/g/x', DESK), env, D); const t2 = await r.text();
T('整页：手机和电脑 UA 拿到同一个壳（分辨在浏览器里做）', t2 === t);
r = await sharePage('p', 'x', req('/p/x', MOB), { ASSETS: { fetch: async () => new Response('x', { status: 500 }) } }, D);
T('整页：不依赖静态资源服务（资源取不到也照常给壳）', r.status === 200);
// 真实球局（接口版）：时间按墨尔本、缺位 = 容量 - 已加入、水平范围；查不到 / 出错退回演示快照或通用卡片
const API = { share_code: 'Zz9k', starts_at: '2026-10-29T07:30:00Z', short_name: 'Tennis World', game_type: 'doubles', capacity: 4, filled: 2, utr_min: 3, utr_max: 4, host_nickname: 'Han', host_utr: 4 };   // 墨尔本 10-29 18:30（今晚）
const ag = fromApiGame(API, NOW);
T('接口球局 → 卡片字段：今晚 18:30、缺 2 位、UTR 3.0–4.0', ag.o === 0 && ag.t === '18:30' && ag.spots === 2 && ag.lvl === '3.0–4.0' && ag.host === 'Han' && ag.hu === '4.0' && ogTitle(ag, NOW) === '今晚 18:30 · Tennis World · 缺2位球友 · UTR 3.0–4.0', ag);
T('接口球局：水平不限 / 单一值 / 已满', fromApiGame({ ...API, utr_min: 1, utr_max: 16 }, NOW).lvl === '不限' && fromApiGame({ ...API, utr_min: 4, utr_max: 4 }, NOW).lvl === '4.0' && fromApiGame({ ...API, filled: 4 }, NOW).spots === 0);
r = await sharePage('g', 'Zz9k', req('/g/Zz9k', MOB), env, D, async () => ag); t = await r.text();
T('整页：真实球局的分享链接带这条球局自己的标题（不是通用卡片）', /og:title" content="今晚 18:30 · Tennis World/.test(t) && !t.includes(BRAND.desc), t.slice(0, 0));
r = await sharePage('g', 'Zz9k', req('/g/Zz9k', MOB), env, D, async () => { throw new Error('超时') }); t = await r.text();
T('整页：接口出错 → 退回通用卡片，不报错', r.status === 200 && t.includes(BRAND.title));
console.log(`og: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
