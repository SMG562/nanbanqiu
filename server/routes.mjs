// 南伴球 · 页面路由（地区扩展 R3-2）。5g 部署时接到托管平台 / 反向代理上（纯函数 + 一个数据库查询接口，Node / Workers 都能用）。
//   每个城市一个网址 nanbanqiu.app/<slug>（/melbourne、/sydney……）：
//     /                     → 302 /melbourne/（查询参数保留）
//     /g/码、/p/编号         → 302 /<球局 / 球员的城市>/g/码（短链接不变；找不到的按墨尔本，页面里显示「已不存在」）
//     /<slug>               → 301 /<slug>/
//     /<slug>/…             → 页面：手机 = PWA，电脑 = 网页端；标题、分享预览、PWA 安装配置按城市替换
//     /<slug>/manifest.webmanifest → 这个城市的 PWA 安装配置（装到主屏幕后从这个城市打开、范围只在这个城市）
//     /<slug>/community     → 这个城市的微信群 / 社群链接（没配就去 /community）
//     认不出的 /<xxx>/…      → 302 /melbourne/
//   未开放的城市照常返回页面，由页面显示「即将开放」（页面里 CITY.status 决定）。
//   db：{ cityBySlug(slug) → {key, slug, name_zh, status, community_url} | null, routeCity(kind, code) → slug | null }
//       真实环境用 pgLookup(pool)（以 nbq_service 调 city_by_slug / route_city）
import { SECURITY_HEADERS } from './headers.mjs';

export const DEFAULT_SLUG = 'melbourne';
export const PASS = /^\/(api|admin|icons|og|unsub|privacy\.html|terms\.html|sw\.js|community|robots\.txt|favicon\.ico)(\/|$)/;   // 原样交给静态文件 / 接口
const MOBILE = /Mobi|Android|iPhone|iPod|iPad|HarmonyOS/i;
const qs = q => (q && q !== '?' ? (q.startsWith('?') ? q : '?' + q) : '');
const redirect = (status, location) => ({ status, headers: { Location: location, 'Cache-Control': 'no-store' } });

// 只决定去哪：{ type: 'redirect' | 'page' | 'manifest' | 'pass', … }
export async function resolve(pathname, search, ua, db) {
  const p = pathname.replace(/\/{2,}/g, '/'), q = qs(search);
  if (p === '/' || p === '') return { type: 'redirect', status: 302, location: `/${DEFAULT_SLUG}/${q}` };
  if (p === '/manifest.webmanifest') return { type: 'redirect', status: 301, location: `/${DEFAULT_SLUG}/manifest.webmanifest` };   // 旧的安装配置地址
  if (PASS.test(p)) return { type: 'pass' };
  const short = p.match(/^\/(g|p)\/([A-Za-z0-9]{1,16})\/?$/);
  if (short) { const slug = (await db.routeCity(short[1], short[2])) || DEFAULT_SLUG; return { type: 'redirect', status: 302, location: `/${slug}/${short[1]}/${short[2]}${q}` } }
  const m = p.match(/^\/([A-Za-z]+)(\/.*)?$/);
  const city = m && await db.cityBySlug(m[1].toLowerCase());
  if (!city) return { type: 'redirect', status: 302, location: `/${DEFAULT_SLUG}/${q}` };
  if (m[1] !== city.slug) return { type: 'redirect', status: 301, location: `/${city.slug}${m[2] || '/'}${q}` };   // 大小写统一
  const rest = m[2] || '';
  if (!rest) return { type: 'redirect', status: 301, location: `/${city.slug}/${q}` };
  if (rest === '/manifest.webmanifest') return { type: 'manifest', city };
  if (rest === '/community' || rest === '/community/') return { type: 'redirect', status: 302, location: city.community_url || '/community' };
  return { type: 'page', city, build: MOBILE.test(ua || '') ? 'pwa' : 'web' };
}

// 页面里按城市替换：标题、分享预览、PWA 安装配置地址（页面里的城市名由 CITIES 决定，这里只管搜索引擎和微信 / 小红书预览看到的）
const attr = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export function cityPage(html, city, origin = 'https://nanbanqiu.app') {
  const t = `南伴球 · ${city.name_zh}网球约局`, soon = !['on', 'beta'].includes(city.status);
  const desc = soon ? `南伴球 · ${city.name_zh}即将开放，留下邮箱，开放时第一时间通知你` : `找到同水平的网球搭子，申请加入${city.name_zh}附近的球局｜南伴球 · ${city.name_zh}网球约局`;
  return html
    .replace(/<title>[^<]*<\/title>/, `<title>${attr(t)}</title>`)
    .replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${attr(desc)}">`)
    .replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${attr(t)}">`)
    .replace(/<link rel="manifest" href="[^"]*">/, `<link rel="manifest" href="/${city.slug}/manifest.webmanifest">`)
    .replace('</head>', `<link rel="canonical" href="${origin}/${city.slug}/">\n</head>`);
}

// 这个城市的 PWA 安装配置：装到主屏幕后从这个城市打开；每个城市单独一个应用（id 不同）
export function cityManifest(base, city) {
  const m = JSON.parse(base), s = `/${city.slug}/`;
  m.name = `南伴球 · ${city.name_zh}网球约局`; m.id = s; m.start_url = `${s}?source=pwa`; m.scope = s;
  m.shortcuts = (m.shortcuts || []).map(x => ({ ...x, url: x.url.replace(/^\/\?/, `${s}?`) }));
  return JSON.stringify(m, null, 2);
}

// 一次请求：files = { pwa, web, manifest }（文件内容）；返回 { status, headers, body }；pass = 交给后面的静态文件 / 接口
export async function handle({ pathname, search = '', ua = '' }, { db, files, origin }) {
  const r = await resolve(pathname, search, ua, db);
  if (r.type === 'pass') return null;
  if (r.type === 'redirect') return redirect(r.status, r.location);
  if (r.type === 'manifest') return { status: 200, headers: { 'Content-Type': 'application/manifest+json; charset=utf-8', 'Cache-Control': 'public, max-age=3600' }, body: cityManifest(files.manifest, r.city) };
  return { status: 200, headers: { ...SECURITY_HEADERS, 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache', Vary: 'User-Agent' }, body: cityPage(files[r.build], r.city, origin) };
}

// 真实环境的查询（以 nbq_service 连接）；结果缓存 5 分钟，城市状态改了最多 5 分钟生效
export function pgLookup(pool, ttl = 5 * 60e3) {
  const cache = new Map(), memo = async (k, f) => { const c = cache.get(k); if (c && c.t > Date.now()) return c.v; const v = await f(); cache.set(k, { v, t: Date.now() + ttl }); return v };
  return {
    cityBySlug: slug => memo('c:' + slug, async () => (await pool.query(`select key, slug, name_zh, status, community_url from cities where key = city_by_slug($1)`, [slug])).rows[0] || null),
    routeCity: (kind, code) => memo(kind + ':' + code, async () => (await pool.query(`select route_city($1, $2) s`, [kind, code])).rows[0].s),
  };
}
