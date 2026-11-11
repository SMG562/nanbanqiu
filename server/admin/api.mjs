// 南伴球 · 后台接口 /admin/api/*（#27 第 1 步）。纯函数风格 handleAdmin(request, { connect, hosts }) → Response，Node / Workers 通用。
//   登录、会话、权限、审计的规则都在数据库（schema ⑰ ㉚）和 server/admin/auth.mjs；这里只管：路由、防跨站请求、请求格式、错误码 → HTTP 状态、响应头。
//   安全要点（每条都有 tests/pg/admin_api.mjs 的用例）：
//     · 会话令牌只在 httpOnly + Secure + SameSite=Strict 的 Cookie 里，响应体里不出现
//     · 除 health 外每个请求都要带自定义头 X-NBQ-Admin: 1；POST 还要 Origin 与本站一致、Content-Type 是 JSON
//     · 每条路由在 ROUTES 里声明所需权限（admin_perms 的动作）：接口层先查，数据库函数再查一次（数据页接入时沿用）
//     · 只在登记过的域名上提供（ADMIN_HOSTS）：预览站根域名和正式站是同一个生产部署，但只有正式站前面有 Cloudflare Access → 没登记的域名一律 404；没配 = 全部 404
//     · 登录失败按 IP 限流（含不存在的邮箱）；所有响应 no-store；错误体只有错误码，不带数据库原文；日志只记错误码，不记请求内容
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
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

// 连不上数据库时只给粗略类别（排查用；不含地址、用户名、密码、报错原文）。和前台 /api/health 的 why 同一套
export const dbWhy = e => { const c = String(e && e.code || ''), m = String(e && e.message || '');
  if (c === '28P01') return 'bad_password';
  if (c === '28000') return 'login_not_allowed';                                      // 角色没开 login，或连接池不认
  if (/tenant or user not found/i.test(m)) return 'user_not_found';                   // 用户名要写成 nbq_admin_api.<项目编号>
  if (c === '3D000') return 'bad_database';
  if (/^(ECONN|ENOTFOUND|ETIMEDOUT|EAI_|EHOSTUNREACH)/.test(c) || /connection (terminated|timeout)/i.test(m)) return 'network';
  if (/invalid|parse|url/i.test(m) && !c) return 'bad_url';
  return 'other:' + (/^[0-9A-Z]{5}$/.test(c) ? c : 'x') };
const cookieToken = req => {
  for (const part of (req.headers.get('Cookie') || '').split(';')) {
    const i = part.indexOf('='); if (i < 0) continue;
    if (part.slice(0, i).trim() === COOKIE_NAME) { const v = part.slice(i + 1).trim(); return /^[A-Za-z0-9_-]{43}$/.test(v) ? v : null }
  }
  return null;
};
// 只信 Cloudflare 填的头；没有 / 不是 IP 就当没有。不用 node:net（Pages 把所有函数打成一个 Worker，没验证过的 Node 模块可能让整个部署失败）
const V4 = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
export const isIp = h => { if (typeof h !== 'string' || !h || h.length > 45) return false; if (V4.test(h)) return true;
  if (!/^[0-9a-fA-F:.]+$/.test(h) || !h.includes(':')) return false; try { return new URL(`http://[${h}]/`).hostname.length > 2 } catch (_) { return false } };
const ipOf = req => { const h = (req.headers.get('CF-Connecting-IP') || '').trim(); return isIp(h) ? h : null };

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
  const tooBig = () => Object.assign(new Error('too_large'), { http: send(413, { error: 'too_large' }) });
  if (+(req.headers.get('Content-Length') || 0) > MAX_BODY) throw tooBig();            // 先看声明的长度，超了不读
  const t = await req.text();
  if (new TextEncoder().encode(t).length > MAX_BODY) throw tooBig();                    // 按字节算（中文一个字 3 字节）
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
      if (!d.connect) { out.db = false; out.ok = false; out.why = 'not_configured' }
      else { try { const { db, release } = await acquire(d.connect); try { await db.query('select 1') } finally { await release() } out.db = true } catch (e) { out.db = false; out.ok = false; out.why = dbWhy(e) } }
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
  // ---------- 举报队列（#27 第 2 步）----------
  // 列表：处理中的全部（最多 200）+ 最近处理过的 30 条。限城市的管理员只看举报人所在城市的。不返回手机号 / 举报人 id，只给昵称。
  'GET /admin/api/reports': { name: 'reports', perm: 'report.handle', run: (req, d, b, route) => authed(req, d, route, async (db, a) => ({ reports: (await db.query(`
      with base as (
        select r.*, ru.nickname as reporter_name,
               case when r.target_type = 'user' and r.target_id ~ '^[0-9a-f-]{36}$' then (select nickname from users where id = r.target_id::uuid)
                    when r.target_type = 'game' and r.target_id ~ '^[0-9a-f-]{36}$' then (select hu.nickname from games g join users hu on hu.id = g.host_id where g.id = r.target_id::uuid) end as target_name
          from reports r join users ru on ru.id = r.reporter_id
         where $1::text[] is null or ru.home_city = any($1::text[])),
      pick as (
        (select * from base where status = 'open' order by created_at desc limit 200)
        union all
        (select * from base where status <> 'open' order by handled_at desc nulls last limit 30))
      select p.id, p.status, p.target_type, p.reason, p.note, p.source, p.via, p.created_at, p.handled_at,
             p.reporter_name as reporter, p.target_name as target, (p.context_ref is not null) as has_chat,
             (select name from admin_users where id = p.handled_by) as handled_by_name
        from pick p order by (p.status = 'open') desc, coalesce(p.handled_at, p.created_at) desc`, [a.cities ?? null])).rows })) },
  // 处理 / 忽略：只有「处理中」的能改（别人刚处理过 → 409 state_changed）。处理后举报人的 /api/reports/mine 就不再返回，可以重新举报
  'POST /admin/api/reports/handle': { name: 'reports_handle', perm: 'report.handle', body: true, run: (req, d, b, route) => {
    if (!UUID.test(b.id || '') || !['actioned', 'dismissed'].includes(b.action) || (b.note != null && !strIn(b.note, 500))) return fail(bad(), 'reports_handle');
    return authed(req, d, route, async db => { await db.query('select admin_report_handle($1::uuid, $2, $3)', [b.id, b.action, b.note ?? null]); return { ok: true } }, b);
  } },
  // 被举报的那段对话：必须填理由（至少 4 个字），数据库函数留痕 message.read
  'POST /admin/api/reports/messages': { name: 'reports_messages', perm: 'message.read', body: true, run: (req, d, b, route) => {
    if (!UUID.test(b.id || '') || !strIn(b.reason, 300)) return fail(bad(), 'reports_messages');
    return authed(req, d, route, async db => ({ messages: (await db.query('select id::text, sender_name, body, created_at, hidden from admin_report_messages($1::uuid, $2)', [b.id, b.reason])).rows }), b);
  } },
  // ---------- 球场审核（#27 第 3 步）----------
  // 一次给两份：geo = 坐标还是「区中心估值」的公开球场（待核对，最多 200）；pending = 用户添加待审核的球场（最多 100，附 300 米内已收录的球场，合并时选）。
  // 限城市的管理员只看自己城市的。不返回添加人的手机号 / id，只给昵称。
  'GET /admin/api/venues': { name: 'venues', perm: 'venue.review', run: (req, d, b, route) => authed(req, d, route, async (db, a) => {
    const c = a.cities ?? null;
    const geo = (await db.query(`select v.id, v.name, v.short_name, v.suburb, round(st_y(v.location::geometry)::numeric, 6)::float as lat, round(st_x(v.location::geometry)::numeric, 6)::float as lng
        from venues v where v.status = 'active' and v.geo_source = 'suburb_centroid' and ($1::text[] is null or v.city = any($1::text[])) order by v.suburb nulls last, v.name limit 200`, [c])).rows;
    const pending = (await db.query(`select v.id, v.name, v.short_name, v.suburb, round(st_y(v.location::geometry)::numeric, 6)::float as lat, round(st_x(v.location::geometry)::numeric, 6)::float as lng,
               v.added_at, (select nickname from users where id = v.added_by) as added_by_name,
               coalesce((select jsonb_agg(jsonb_build_object('id', n.id, 'name', n.name, 'dist_m', round(st_distance(n.location, v.location))::int) order by st_distance(n.location, v.location))
                           from venues n where n.status = 'active' and n.id <> v.id and st_dwithin(n.location, v.location, 300)), '[]'::jsonb) as near
        from venues v where v.status = 'pending' and ($1::text[] is null or v.city = any($1::text[])) order by v.added_at nulls last, v.name limit 100`, [c])).rows;
    const t = (await db.query(`select count(*) filter (where geo_source = 'suburb_centroid')::int as todo, count(*)::int as total from venues v where v.status = 'active' and ($1::text[] is null or v.city = any($1::text[]))`, [c])).rows[0];
    return { geo, pending, geo_todo: t.todo, active_total: t.total };
  }) },
  // 核对坐标：lat / lng 都不填 = 位置没错，只标成已核对；填了 = 改到新位置（数据库函数挡范围、写日志）
  'POST /admin/api/venues/geo': { name: 'venues_geo', perm: 'venue.review', body: true, run: (req, d, b, route) => {
    const num = x => typeof x === 'number' && Number.isFinite(x);
    if (!UUID.test(b.id || '') || (b.lat == null) !== (b.lng == null) || (b.lat != null && !(num(b.lat) && num(b.lng)))) return fail(bad(), 'venues_geo');
    return authed(req, d, route, async db => { await db.query('select admin_venue_geo($1::uuid, $2::float8, $3::float8)', [b.id, b.lat ?? null, b.lng ?? null]); return { ok: true } }, b);
  } },
  // 用户添加的球场：通过 / 合并到已有球场 / 驳回。只有「待审核」的能处理（别人刚处理过 → 409 state_changed）
  'POST /admin/api/venues/review': { name: 'venues_review', perm: 'venue.review', body: true, run: (req, d, b, route) => {
    if (!UUID.test(b.id || '') || !['approve', 'merge', 'reject'].includes(b.action) || (b.action === 'merge' ? !UUID.test(b.merge_into || '') : b.merge_into != null)) return fail(bad(), 'venues_review');
    return authed(req, d, route, async (db, a) => {
      const v = (await db.query(`select status, city from venues where id = $1::uuid`, [b.id])).rows[0];
      if (!v) throw Object.assign(new Error('not_found'), { code: 'not_found' });
      if (a.cities && !a.cities.includes(v.city)) throw Object.assign(new Error('admin_forbidden'), { code: 'admin_forbidden' });   // 城市范围先于状态判断（行级安全下范围外的球场本来就读不到 → 上面的 404）
      if (v.status !== 'pending') throw Object.assign(new Error('state_changed'), { code: 'state_changed' });
      await db.query('select admin_venue_review($1::uuid, $2, $3::uuid)', [b.id, b.action, b.merge_into ?? null]); return { ok: true } }, b);
  } },
  // ---------- 球友列表（#27 第 3 步，只读）----------
  // 查询参数：q（昵称包含 / 编号 #0062 或 62）、status（六种状态之一）、offset（每页 50）。限城市的管理员只看自己城市的人。
  // 权限用 user.status（运营 / owner）：只读角色在库里本来就看不到个人名单（nbq_viewer 只有统计），所以不能用 page.view。
  // 手机号只给后四位（admin_user_phone 视图）；完整号码只有 owner 走 admin_reveal_phone，这里不碰。
  'GET /admin/api/users': { name: 'users', perm: 'user.status', run: (req, d, b, route) => {
    const sp = new URL(req.url).searchParams, q = (sp.get('q') || '').trim().slice(0, 40), st = sp.get('status') || '', off = sp.get('offset') ?? '0';
    if (st && !['active', 'review', 'limited', 'suspended', 'banned', 'deleted'].includes(st)) return fail(bad(), 'users');
    if (!/^\d{1,6}$/.test(off)) return fail(bad(), 'users');
    const no = /^#?(\d{1,9})$/.exec(q), like = '%' + q.replace(/[\\%_]/g, m => '\\' + m) + '%';
    return authed(req, d, route, async (db, a) => {
      const c = a.cities ?? null;
      const rows = (await db.query(`select u.member_no::int as member_no, u.nickname, u.last_initial, u.home_city as city, u.status, u.status_since, u.status_until, u.utr::float as utr, u.utr_estimated, (u.utr_profile is not null) as utr_linked, u.level, u.gender,
               u.created_at, u.last_active_at, u.signup_source, p.phone_tail
          from users u join admin_user_phone p on p.id = u.id
         where ($1::text[] is null or u.home_city = any($1::text[])) and ($2 = '' or u.status = $2)
           and ($3 = '' or u.nickname ilike $4 or ($5::bigint is not null and u.member_no = $5::bigint))
         order by u.member_no desc offset $6::int limit 51`, [c, st, q, like, no ? no[1] : null, off])).rows;
      const cnt = (await db.query(`select u.status, count(*)::int n from users u where ($1::text[] is null or u.home_city = any($1::text[])) group by 1`, [c])).rows;
      return { users: rows.slice(0, 50), more: rows.length > 50, counts: Object.fromEntries(cnt.map(x => [x.status, x.n])) };
    });
  } },
  // ---------- 球友统计（#110，只读）----------
  // 查询参数 from / to（ISO 时间，默认最近 30 天，跨度 ≤ 366 天）。数字来自 buddy_stats（数据库按表算，不是埋点），只读角色也能看（只有汇总数字，没有名单）；限城市的管理员只算自己城市。
  'GET /admin/api/buddies/stats': { name: 'buddies_stats', perm: 'page.view', run: (req, d, b, route) => {
    const sp = new URL(req.url).searchParams, now = (d.now ? d.now() : Date.now());
    const to = sp.get('to') ? Date.parse(sp.get('to')) : now, from = sp.get('from') ? Date.parse(sp.get('from')) : to - 30 * 864e5;
    if (!Number.isFinite(from) || !Number.isFinite(to) || from >= to || to - from > 366 * 864e5) return fail(bad(), 'buddies_stats');
    return authed(req, d, route, async (db, a) => {
      const r = (await db.query('select * from buddy_stats($1, $2, $3)', [new Date(from).toISOString(), new Date(to).toISOString(), a.cities ?? null])).rows[0];
      const n = k => r[k] === null ? null : Number(r[k]);
      return { from: new Date(from).toISOString(), to: new Date(to).toISOString(), stats: Object.fromEntries(Object.keys(r).map(k => [k, n(k)])) };
    });
  } },
  // ---------- 我的 UTR（#101，只读）----------
  // 概况：在册（不含注销 / 封禁）的正式 / 自评 / 关联主页人数、近 30 天确认过的人、近 7 天改动次数和人数。
  // 需要留意（最多 100 人）：近 7 天改了 3 次以上 · 30 天内正式→正式一次跳 ≥ 2（自评换成正式是正常的，不算）· 同一个主页编号关联了 2 个以上账号（带编号，方便去 UTR 核实）。
  // 权限同球友列表（user.status）；限城市的管理员只算、只看自己城市的人（users 的行级安全），也看不出别的城市有人关联了同一个主页。
  'GET /admin/api/utr': { name: 'utr', perm: 'user.status', run: (req, d, b, route) => authed(req, d, route, async (db, a) => {
    const c = a.cities ?? null, mine = `u.status not in ('deleted', 'banned') and ($1::text[] is null or u.home_city = any($1::text[]))`;
    const s = (await db.query(`select count(*)::int as total, count(*) filter (where not u.utr_estimated)::int as official, count(*) filter (where u.utr_estimated)::int as self,
        count(*) filter (where u.utr_profile is not null)::int as linked, count(*) filter (where u.utr_at > now() - interval '30 days')::int as updated_30d from users u where ${mine}`, [c])).rows[0];
    const ch = (await db.query(`select count(*)::int as n, count(distinct x.user_id)::int as people from utr_changes x join users u on u.id = x.user_id where x.at > now() - interval '7 days' and ${mine}`, [c])).rows[0];
    const flags = (await db.query(`with often as (select x.user_id, count(*)::int n from utr_changes x where x.at > now() - interval '7 days' group by 1 having count(*) >= 3),
        jump as (select distinct on (x.user_id) x.user_id, x.old_utr::float as o, x.new_utr::float as n from utr_changes x
                  where x.at > now() - interval '30 days' and x.old_est = false and x.new_est = false and abs(x.new_utr - x.old_utr) >= 2 order by x.user_id, x.at desc),
        dup as (select u.utr_profile as p from users u where u.utr_profile is not null and ${mine} group by 1 having count(*) >= 2)
      select u.member_no::int as member_no, u.nickname, u.last_initial, u.utr::float as utr, u.utr_estimated, often.n as often_n, jump.o as jump_from, jump.n as jump_to,
             case when dup.p is not null then u.utr_profile end as dup_profile
        from users u left join often on often.user_id = u.id left join jump on jump.user_id = u.id left join dup on dup.p = u.utr_profile
       where ${mine} and (often.user_id is not null or jump.user_id is not null or dup.p is not null)
       order by u.member_no desc limit 100`, [c])).rows;
    return { summary: { ...s, changes_7d: ch.n, changers_7d: ch.people }, flags };
  }) },
  // ---------- 球局列表（#27 第 3 步，只读）----------
  // 查询参数：when（upcoming 未开始 / past 已过 / all，默认 upcoming）、status、q（发起人昵称 / 球场名 / 分享码）、offset（每页 50）。限城市的管理员只看自己城市。
  // 发起人用 left join：限城市的管理员看不到别的城市的用户行（行级安全），发起人在别的城市时球局照样列出、发起人显示「—」。
  // 私人球局（visibility = private）不给一句话备注和自填场地，只给「私人」标记；不给任何人的手机号 / 微信。权限 report.handle（运营 / owner）：只读角色库里看不到个人内容。
  'GET /admin/api/games': { name: 'games', perm: 'report.handle', run: (req, d, b, route) => {
    const sp = new URL(req.url).searchParams, q = (sp.get('q') || '').trim().slice(0, 40), st = sp.get('status') || '', when = sp.get('when') || 'upcoming', off = sp.get('offset') ?? '0';
    if ((st && !['open', 'full', 'cancelled', 'completed'].includes(st)) || !['upcoming', 'past', 'all'].includes(when) || !/^\d{1,6}$/.test(off)) return fail(bad(), 'games');
    const like = '%' + q.replace(/[\\%_]/g, m => '\\' + m) + '%';
    return authed(req, d, route, async (db, a) => {
      const c = a.cities ?? null;
      const rows = (await db.query(`select g.share_code, g.starts_at, g.duration_min, g.game_type::text as game_type, g.capacity, g.status::text as status, g.visibility, g.join_mode, g.tags, g.city, g.created_at, g.cancelled_at, g.created_device,
               case when g.visibility = 'public' then g.note end as note, case when g.visibility = 'public' then coalesce(v.name, g.venue_name) end as venue,
               h.nickname as host, h.member_no::int as host_no,
               (select count(*)::int from game_participants p where p.game_id = g.id and p.status = 'approved') as joined,
               (select count(*)::int from game_participants p where p.game_id = g.id and p.status = 'pending') as pending
          from games g left join users h on h.id = g.host_id left join venues v on v.id = g.venue_id
         where ($1::text[] is null or g.city = any($1::text[])) and ($2 = '' or g.status::text = $2)
           and (case $3 when 'upcoming' then g.starts_at >= now() when 'past' then g.starts_at < now() else true end)
           and ($4 = '' or h.nickname ilike $5 or g.share_code = $4 or (g.visibility = 'public' and coalesce(v.name, g.venue_name) ilike $5))
         order by case when $3 = 'upcoming' then g.starts_at end asc, g.starts_at desc offset $6::int limit 51`, [c, st, when, q, like, off])).rows;
      const cnt = (await db.query(`select g.status::text as status, count(*)::int n from games g where ($1::text[] is null or g.city = any($1::text[])) and (case $2 when 'upcoming' then g.starts_at >= now() when 'past' then g.starts_at < now() else true end) group by 1`, [c, when])).rows;
      return { games: rows.slice(0, 50), more: rows.length > 50, counts: Object.fromEntries(cnt.map(x => [x.status, x.n])) };
    });
  } },
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
