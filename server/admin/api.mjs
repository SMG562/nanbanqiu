// 南伴球 · 后台接口 /admin/api/*（#27 第 1 步）。纯函数风格 handleAdmin(request, { connect, hosts }) → Response，Node / Workers 通用。
//   登录、会话、权限、审计的规则都在数据库（schema ⑰ ㉚）和 server/admin/auth.mjs；这里只管：路由、防跨站请求、请求格式、错误码 → HTTP 状态、响应头。
//   安全要点（每条都有 tests/pg/admin_api.mjs 的用例）：
//     · 会话令牌只在 httpOnly + Secure + SameSite=Strict 的 Cookie 里，响应体里不出现
//     · 除 health 外每个请求都要带自定义头 X-NBQ-Admin: 1；POST 还要 Origin 与本站一致、Content-Type 是 JSON
//     · 每条路由在 ROUTES 里声明所需权限（admin_perms 的动作）：接口层先查，数据库函数再查一次（数据页接入时沿用）
//     · 只在登记过的域名上提供（ADMIN_HOSTS）：预览站根域名和正式站是同一个生产部署，但只有正式站前面有 Cloudflare Access → 没登记的域名一律 404；没配 = 全部 404
//     · 登录失败按 IP 限流（含不存在的邮箱）；所有响应 no-store；错误体只有错误码，不带数据库原文；日志只记错误码，不记请求内容
import { isIP } from 'node:net';
import { acquire, adminLogin, adminLogout, adminRequest, adminAttemptCheck, adminAttemptNote, COOKIE } from './auth.mjs';

export const ADMIN_BASE = '/admin/api';
export const isAdminPath = p => p === ADMIN_BASE || p.startsWith(ADMIN_BASE + '/');
// 域名白名单：ADMIN_HOSTS="nanbanqiu.app" 或 "*.nanbanqiu-preview.pages.dev"（逗号分隔；*. 只匹配子域名，不匹配根域名本身）
export const parseHosts = s => String(s || '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean);
export const hostAllowed = (host, list) => { const h = String(host || '').toLowerCase(); return (list || []).some(p => p.startsWith('*.') ? h.endsWith(p.slice(1)) && h.length > p.length - 1 : h === p) };
const COOKIE_NAME = 'nbq_admin';
const CLEAR_COOKIE = `${COOKIE_NAME}=; Path=/admin; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
const BASE_H = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'X-Robots-Tag': 'noindex, nofollow', 'Vary': 'Cookie' };
const send = (status, body, extra) => new Response(JSON.stringify(body), { status, headers: { ...BASE_H, ...extra } });
const MAX_BODY = 8192;

// 数据库抛出的错误码 → HTTP 状态。表里没有的一律当服务器错误（不把没见过的码原样交出去）；schema 里所有 admin_ 开头的码必须在这里（tests/static/admin_api_routes.mjs）
export const ADMIN_STATUS = {
  admin_bad_login: 401, admin_session_expired: 401,
  admin_forbidden: 403,
  admin_locked: 429, rate_limited: 429,
  admin_reason_required: 422, invalid: 422,
  not_found: 404,
  state_changed: 409, admin_last_owner: 409, admin_city_not_ready: 409, admin_config_stale: 409,
};
const DB_DOWN = new Set(['db_not_configured', '28P01', '28000', '3D000', '57P03', '53300']);
const isDbDown = e => DB_DOWN.has(String(e && e.code || '')) || /^(ECONN|ENOTFOUND|ETIMEDOUT|EAI_|EHOSTUNREACH)/.test(String(e && e.code || '')) || /connection (terminated|timeout)|tenant or user not found/i.test(String(e && e.message || ''));

const cookieToken = req => {
  for (const part of (req.headers.get('Cookie') || '').split(';')) {
    const i = part.indexOf('='); if (i < 0) continue;
    if (part.slice(0, i).trim() === COOKIE_NAME) { const v = part.slice(i + 1).trim(); return /^[A-Za-z0-9_-]{43}$/.test(v) ? v : null }
  }
  return null;
};
const ipOf = req => { const h = (req.headers.get('CF-Connecting-IP') || '').trim(); return h && isIP(h) ? h : null };   // 只信 Cloudflare 填的头；没有 / 不是 IP 就当没有

function fail(e, route) {
  const code = String(e && e.code || '');
  if (isDbDown(e)) { console.error('admin_api', route, 'db_down', code); return send(503, { error: 'db_unavailable' }) }
  if (Object.prototype.hasOwnProperty.call(ADMIN_STATUS, code)) {
    const st = ADMIN_STATUS[code], body = { error: code }, extra = {}, det = String(e.detail || '');
    if (st === 429 && /^\d{1,6}$/.test(det)) { body.retry_after = +det; extra['Retry-After'] = det }
    if (code === 'admin_session_expired') extra['Set-Cookie'] = CLEAR_COOKIE;
    return send(st, body, extra);
  }
  console.error('admin_api', route, 'unexpected', code || e?.message?.slice(0, 40));
  return send(500, { error: 'server_error' });
}
const bad = () => Object.assign(new Error('invalid'), { code: 'invalid' });

async function readJson(req) {
  if (!/^application\/json\b/i.test(req.headers.get('Content-Type') || '')) throw Object.assign(new Error('unsupported'), { http: send(415, { error: 'unsupported_media_type' }) });
  const t = await req.text();
  if (t.length > MAX_BODY) throw Object.assign(new Error('too_large'), { http: send(413, { error: 'too_large' }) });
  try { const b = JSON.parse(t || '{}'); if (b && typeof b === 'object' && !Array.isArray(b)) return b } catch (_) { }
  throw Object.assign(new Error('bad_json'), { http: send(400, { error: 'bad_json' }) });
}
const strIn = (v, max) => typeof v === 'string' && v.length > 0 && v.length <= max;

// 需要登录的路由：校验会话 → 查权限 → 在对应数据库角色的事务里执行 fn(db, admin, body)
export async function authed(req, d, route, fn, body) {
  if (!d.connect) return send(503, { error: 'db_unavailable' });
  const token = cookieToken(req);
  if (!token) return send(401, { error: 'admin_session_expired' }, { 'Set-Cookie': CLEAR_COOKIE });
  try {
    const out = await adminRequest(d.connect, token, async (db, a) => {
      if (route.perm) {
        const p = (await db.query('select roles from admin_perms where action = $1', [route.perm])).rows[0];
        if (!p || !p.roles.includes(a.role)) throw Object.assign(new Error('admin_forbidden'), { code: 'admin_forbidden' });
      }
      return fn(db, a, body);
    }, { ip: ipOf(req) });
    return send(200, out);
  } catch (e) { return fail(e, route.name) }
}

export const ROUTES = {
  // 不需要登录
  'GET /admin/api/health': { name: 'health', public: true, noCsrf: true, run: async (req, d) => {
    const out = { ok: true, db: null };
    if (new URL(req.url).searchParams.get('db') === '1') {
      if (!d.connect) { out.db = false; out.ok = false }
      else { try { const { db, release } = await acquire(d.connect); try { await db.query('select 1') } finally { await release() } out.db = true } catch (e) { out.db = false; out.ok = false } }
    }
    return send(out.ok ? 200 : 503, out);
  } },
  'POST /admin/api/login': { name: 'login', public: true, body: true, run: async (req, d, b) => {
    if (!d.connect) return send(503, { error: 'db_unavailable' });
    if (!strIn(b.email, 254) || !strIn(b.password, 256)) return fail(bad(), 'login');
    const viaRecovery = b.recovery !== undefined && b.recovery !== null && b.recovery !== '';
    if (viaRecovery ? !strIn(b.recovery, 32) : !(typeof b.code === 'string' && /^\d{6}$/.test(b.code))) return fail(bad(), 'login');
    const ip = ipOf(req);
    try {
      await adminAttemptCheck(d.connect, ip);        // 先限流再算 scrypt
      const r = await adminLogin(d.connect, { email: b.email, password: b.password, code: viaRecovery ? undefined : b.code, recovery: viaRecovery ? b.recovery : undefined, ip, ua: (req.headers.get('User-Agent') || '').slice(0, 200), now: d.now ? d.now() : Date.now() });
      return send(200, { ok: true, role: r.role }, { 'Set-Cookie': r.cookie });   // 令牌只在 Cookie 里，不放响应体
    } catch (e) {
      if (e.code === 'admin_bad_login' || e.code === 'admin_locked') await adminAttemptNote(d.connect, ip);
      return fail(e, 'login');
    }
  } },
  'POST /admin/api/logout': { name: 'logout', public: true, body: true, run: async (req, d) => {
    const t = cookieToken(req);
    if (t && d.connect) { try { await adminLogout(d.connect, t) } catch (e) { return fail(e, 'logout') } }   // 撤销服务端会话，不只是清 Cookie
    return send(200, { ok: true }, { 'Set-Cookie': CLEAR_COOKIE });
  } },
  // 需要登录
  'GET /admin/api/me': { name: 'me', perm: 'page.view', run: (req, d, b, route) => authed(req, d, route, async (db, a) => ({
    name: a.name, role: a.role, cities: a.cities ?? null,
    perms: (await db.query('select action, label, need_reason from admin_perms where $1 = any(roles) order by action', [a.role])).rows,
  })) },
};

export async function handleAdmin(request, d) {
  const url = new URL(request.url);
  if (d.hosts !== undefined && !hostAllowed(url.hostname, d.hosts)) return send(404, { error: 'not_found' });   // 没登记的域名：当作没有这个接口
  const key = `${request.method} ${url.pathname.replace(/\/+$/, '')}`;
  const route = ROUTES[key];
  if (!route) {
    const allow = Object.keys(ROUTES).filter(k => k.slice(k.indexOf(' ') + 1) === url.pathname.replace(/\/+$/, '')).map(k => k.split(' ')[0]);
    return allow.length ? send(405, { error: 'method_not_allowed' }, { Allow: allow.join(', ') }) : send(404, { error: 'not_found' });
  }
  try {
    if (!route.noCsrf) {
      if (request.headers.get('X-NBQ-Admin') !== '1') return send(403, { error: 'csrf' });
      if (request.method !== 'GET' && request.headers.get('Origin') !== url.origin) return send(403, { error: 'csrf' });
    }
    const body = route.body ? await readJson(request) : {};
    return await route.run(request, d, body, route);
  } catch (e) {
    if (e.http) return e.http;
    return fail(e, route.name);
  }
}
