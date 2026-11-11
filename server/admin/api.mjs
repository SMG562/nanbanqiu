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
const noOk = v => Number.isInteger(v) && v > 0 && v < 1e9;                                   // 会员编号
const reasonOk = v => typeof v === 'string' && v.length <= 200;                               // 理由：长度上限在这里，「至少 4 个字」由数据库按权限判断（不需要理由的动作可以空）
const cityOk = v => typeof v === 'string' && /^[a-z]{2,12}$/.test(v);
const notFound = () => Object.assign(new Error('not_found'), { code: 'not_found' });
// 会员编号 → id：在后台数据库角色下查（行级安全：限城市的管理员查不到别的城市的人 → 404）
const sbTarget = b => (b.kind === 'post' && UUID.test(b.id || '')) || (b.kind === 'reply' && /^\d{1,18}$/.test(String(b.id ?? '')));
// 场边内容所在城市：限城市的管理员只能处理自己城市的（库函数本身不看城市）
async function sbCityCheck(db, a, b) {
  const r = (await db.query(b.kind === 'post' ? 'select city from sb_posts where id = $1::uuid' : 'select p.city from sb_replies r join sb_posts p on p.id = r.post_id where r.id = $1::bigint', [String(b.id)])).rows[0];
  if (!r || (a.cities && !a.cities.includes(r.city))) throw notFound();
}
// 逐条走 admin_report_handle（每条都留痕）；返回关掉了几条
async function sbCloseReports(db, b, action) {
  const ids = (await db.query(`select id from reports where target_type = $1 and target_id = $2 and status = 'open'`, [b.kind === 'post' ? 'sb_post' : 'sb_reply', String(b.id)])).rows;
  for (const r of ids) await db.query('select admin_report_handle($1::uuid, $2)', [r.id, action]);
  return ids.length;
}
const SB_PARTS = ['topics', 'alias', 'generic', 'settings', 'hints', 'slots', 'starters', 'week', 'specials'];
// 场边配置写入：配置内容不合格时库里可能抛约束 / 类型错误（23xxx / 22xxx）——这是「填的内容不对」，按 invalid（422）回，detail 给出是哪一块的问题（不带库原文）
async function sbCfg(db, sql, params) {
  try { return (await db.query(sql, params)).rows[0].d }
  catch (e) { if (/^2[23]/.test(String(e.code || ''))) throw Object.assign(new Error('invalid'), { code: 'invalid', detail: 'config' }); throw e }
}
async function userIdByNo(db, no) { const r = (await db.query('select id from users where member_no = $1::bigint', [String(no)])).rows[0]; if (!r) throw notFound(); return r.id }

// 统计白名单：名字 → SQL + 参数 (from, to, city)。名字与原型的 CARDSRC 数据源同名；cityReq = 函数要求城市（不传就用 melb）；max = 最多返回几行
const R2 = (f, t) => [f, t], R3 = (f, t, c) => [f, t, c], C3 = (f, t, c) => [c, f, t];
const STATS = {
  active_users: { sql: 'select * from active_users($1, $2, $3)', args: R3 },
  today_board: { sql: 'select * from today_board($1)', args: (f, t, c) => [c] },
  fill_rate: { sql: 'select * from fill_rate($1, $2)', args: R2 },
  series: { sql: `select day, metric, sum(value)::float as value from daily_metrics where day >= ($1::timestamptz at time zone 'Australia/Melbourne')::date and day <= ($2::timestamptz at time zone 'Australia/Melbourne')::date
                    and dims = '{}' and metric in ('dau', 'new_users', 'games_created', 'applications', 'messages', 'shares') group by 1, 2 order by 1, 2`, args: R2, max: 3000 },
  user_activity: { sql: 'select member_no, nickname, host_ok, played, apply, invite, impression, active_day, no_show, score from user_activity($1, $2, $3) order by score desc nulls last limit 20', args: R3, personal: true },
  venue_activity: { sql: 'select short_name, suburb, games, played, applications, score from venue_activity($1, $2) order by score desc limit 20', args: R2 },
  suburb_activity: { sql: 'select * from suburb_activity($1, $2) order by score desc nulls last limit 60', args: R2 },
  start_heatmap: { sql: 'select * from start_heatmap($1, $2, $3)', args: R3 },
  visit_funnel: { sql: 'select * from visit_funnel($1, $2) order by step', args: R2 },
  application_outcomes: { sql: 'select outcome, sum(n)::bigint as n from application_outcomes($1, $2) group by 1 order by 2 desc', args: R2 },
  card_views: { sql: 'select count(*)::bigint as cards, coalesce(sum(views), 0)::bigint as views, coalesce(sum(from_outside), 0)::bigint as from_outside, coalesce(sum(external_landings), 0)::bigint as external_landings from card_views($1, $2, $3)', args: R3 },
  share_attribution: { sql: 'select * from share_attribution($1, $2, $3) order by shares desc', args: R3 },
  page_traffic: { sql: 'select * from page_traffic($1, $2) order by views desc', args: R2 },
  entry_sources: { sql: 'select * from entry_sources($1, $2) order by sessions desc', args: R2 },
  game_view_via: { sql: 'select * from game_view_via($1, $2) order by views desc', args: R2 },
  device_compare: { sql: 'select * from device_compare($1, $2)', args: R2 },
  env_usage: { sql: 'select * from env_usage($1, $2) order by sessions desc', args: R2 },
  pwa_install_funnel: { sql: 'select * from pwa_install_funnel($1, $2) order by step', args: R2 },
  inapp_handoff_funnel: { sql: 'select * from inapp_handoff_funnel($1, $2)', args: R2 },
  less_effect_counts: { sql: 'select * from less_effect_counts($1, $2) order by n desc', args: R2 },
  badge_rarity: { sql: 'select * from v_badge_rarity', args: () => [], max: 100 },
  level_stuck: { sql: 'select * from v_level_stuck', args: () => [], max: 100 },
  invite_outcomes: { sql: 'select * from v_invite_outcomes', args: () => [], max: 100 },
  retention: { sql: 'select * from v_user_retention', args: () => [], max: 60 },
  event_defs: { sql: 'select event, category, description, props, source, status, replaced_by from event_definitions order by category, event', args: () => [], max: 500 },
  sb_kpis: { sql: 'select * from sb_stat_kpis($1, $2, $3)', args: C3, cityReq: true },
  sb_topics: { sql: 'select * from sb_stat_topics($1, $2, $3) order by posts desc limit 30', args: C3, cityReq: true },
  sb_courts: { sql: 'select name, posts, views, interactions from sb_stat_courts($1, $2, $3) order by posts desc limit 30', args: C3, cityReq: true },
  sb_heat: { sql: 'select * from sb_stat_heat($1, $2, $3)', args: C3, cityReq: true },
  sb_choices: { sql: 'select * from sb_stat_choices($1, $2, $3)', args: C3, cityReq: true },
  sb_negative: { sql: 'select * from sb_stat_negative($1, $2, $3)', args: C3, cityReq: true },
  sb_top_posts: { sql: 'select body, topic_id, venue, author, has_photo, views, balls, replies, shares, still_public, status from sb_stat_top_posts($1, $2, $3, 20)', args: C3, cityReq: true, personal: true },
};
export const STAT_NAMES = Object.keys(STATS);

// 跑一个白名单统计：去掉内部 uuid 列，bigint / numeric 转成数字；noIds = 再去掉能认出人的列（导出不带用户 ID 时）
const PERSON_COLS = new Set(['member_no', 'nickname', 'author', 'body']);
async function runStat(db, name, f, t, c, noIds = false) {
  const s = STATS[name], res = await db.query(s.sql, s.args(f, t, s.cityReq ? (c || 'melb') : c)), num = new Set(res.fields.filter(x => [20, 1700].includes(x.dataTypeID)).map(x => x.name));
  return res.rows.slice(0, s.max || 200).map(r => Object.fromEntries(Object.entries(r).filter(([k, v]) => !(/(^|_)id$/.test(k) && UUID.test(String(v))) && !(noIds && PERSON_COLS.has(k))).map(([k, v]) => [k, num.has(k) && v !== null ? +v : v])));
}

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
         where ($1::text[] is null or ru.home_city = any($1::text[])) and r.target_type not in ('sb_post', 'sb_reply')),   -- 场边举报在 /sideline/reports（按内容合并）
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
  // ---------- 球友详情与处理（#27 第 4 步）----------
  // 对外只用会员编号 no（不暴露内部 id）。编号 → id 在后台角色的行级安全下查：限城市的管理员查不到别的城市的人 → 404，写操作也就做不了
  //   （admin_ 函数是 security definer，本身不看城市，所以这一步是城市范围的唯一一道闸，tests/pg/admin_user_ops 有用例）。
  'GET /admin/api/users/detail': { name: 'users_detail', perm: 'user.status', run: (req, d, b, route) => {
    const no = new URL(req.url).searchParams.get('no') || '';
    if (!/^\d{1,9}$/.test(no)) return fail(bad(), 'users_detail');
    return authed(req, d, route, async db => {
      const id = await userIdByNo(db, no);
      const u = (await db.query(`select u.member_no::int as member_no, u.nickname, u.last_initial, u.home_city as city, u.status, u.status_since, u.status_until, u.status_reason,
               u.gender, u.gender_review, (u.gender_m2f_at is not null) as m2f_used, u.avatar_kind, u.utr::float as utr, u.utr_estimated, u.level, u.created_at, u.last_active_at, u.signup_source, p.phone_tail,
               (select count(*)::int from games g where g.host_id = u.id) as hosted,
               (select count(*)::int from game_participants x where x.user_id = u.id and x.role = 'player' and x.status = 'approved') as joined,
               (select count(*)::int from reports r where r.target_type = 'user' and r.target_id = u.id::text) as reported,
               (select count(*)::int from reports r where r.target_type = 'user' and r.target_id = u.id::text and r.status = 'open') as reported_open
          from users u join admin_user_phone p on p.id = u.id where u.id = $1`, [id])).rows[0];
      const log = (await db.query(`select l.from_status, l.to_status, l.reason, l.note, l.duration_days, l.until, l.created_at, a.name as by_name
          from user_status_log l left join admin_users a on a.id = l.by_admin where l.user_id = $1 order by l.created_at desc, l.id desc limit 20`, [id])).rows;
      return { user: u, log };
    });
  } },
  // 改状态：数据库函数决定要 user.status 还是 user.ban（封禁 / 恢复已封禁或已注销 → 只有 owner），并做连带处理、发通知、写状态日志和操作日志
  'POST /admin/api/users/status': { name: 'users_status', perm: 'user.status', body: true, run: (req, d, b, route) => {
    if (!noOk(b.no) || !['active', 'review', 'limited', 'suspended', 'banned'].includes(b.status) || !reasonOk(b.reason)
      || (b.reason_code != null && !/^[a-z_]{2,20}$/.test(b.reason_code)) || (b.days != null && !Number.isInteger(b.days))) return fail(bad(), 'users_status');
    return authed(req, d, route, async db => { await db.query('select admin_user_status($1, $2, $3, $4, $5)', [await userIdByNo(db, b.no), b.status, b.reason_code ?? null, b.reason, b.days ?? null]); return { ok: true } }, b);
  } },
  'POST /admin/api/users/reset': { name: 'users_reset', perm: 'user.reset', body: true, run: (req, d, b, route) => {
    if (!noOk(b.no) || !['nickname', 'avatar'].includes(b.what) || !reasonOk(b.reason)) return fail(bad(), 'users_reset');
    return authed(req, d, route, async db => { await db.query('select admin_user_reset($1, $2, $3)', [await userIdByNo(db, b.no), b.what, b.reason]); return { ok: true } }, b);
  } },
  'POST /admin/api/users/gender': { name: 'users_gender', perm: 'user.gender', body: true, run: (req, d, b, route) => {
    if (!noOk(b.no) || !['clear', 'unlock'].includes(b.action) || !reasonOk(b.reason)) return fail(bad(), 'users_gender');
    return authed(req, d, route, async db => { await db.query('select admin_user_gender($1, $2, $3)', [await userIdByNo(db, b.no), b.action, b.reason]); return { ok: true } }, b);
  } },
  // 完整手机号：只有 owner，必须填理由；每次查看都记操作日志。响应 no-store（BASE_H），前端只显示、不缓存
  'POST /admin/api/users/phone': { name: 'users_phone', perm: 'phone.reveal', body: true, run: (req, d, b, route) => {
    if (!noOk(b.no) || !reasonOk(b.reason)) return fail(bad(), 'users_phone');
    return authed(req, d, route, async db => ({ phone: (await db.query('select admin_reveal_phone($1, $2) as p', [await userIdByNo(db, b.no), b.reason])).rows[0].p }), b);
  } },
  // ---------- 场边举报（#27 第 4 步）----------
  // 按被举报的内容合并：同一条发布 / 回复的多条举报一行显示（举报原因、举报人、时间）；附内容原文、作者、现在是否已隐藏。
  // 待处理 = 还有未处理举报的内容（最多 100）；另给最近处理的 30 条。限城市的管理员只看自己城市的场边。
  'GET /admin/api/sideline/reports': { name: 'sideline_reports', perm: 'report.handle', run: (req, d, b, route) => authed(req, d, route, async (db, a) => {
    const rows = (await db.query(`
      with r0 as (select r.*, case when r.target_type = 'sb_reply' then r.target_id::bigint end as reply_id from reports r where r.target_type in ('sb_post', 'sb_reply') and r.target_id ~ '^([0-9a-f-]{36}|[0-9]{1,18})$'),
      r as (select r.*, case when r.target_type = 'sb_post' then r.target_id::uuid else (select post_id from sb_replies where id = r.reply_id) end as post_id
                   from r0 r where r.target_type in ('sb_post', 'sb_reply') and r.target_id ~ '^([0-9a-f-]{36}|[0-9]{1,18})$'),
      t as (select r.target_type, r.target_id, min(r.post_id::text)::uuid as post_id, min(r.reply_id) as reply_id, bool_or(r.status = 'open') as open, max(coalesce(r.handled_at, r.created_at)) as last_at,
                   jsonb_agg(jsonb_build_object('id', r.id, 'reason', r.reason, 'status', r.status, 'reporter', (select nickname from users where id = r.reporter_id), 'created_at', r.created_at) order by r.created_at) as reports
              from r group by 1, 2),
      x as (select t.*, p.city, case when t.target_type = 'sb_post' then p.body else rp.body end as body, case when t.target_type = 'sb_post' then p.status else rp.status end as status,
                   case when t.target_type = 'sb_post' then p.deleted_at else rp.deleted_at end is not null as deleted, p.photo_count, p.topic_id,
                   (select count(*)::int from sb_photos f where f.post_id = p.id and f.review = 'blurred') as photos_pending,
                   au.member_no::int as author_no, au.nickname as author
              from t join sb_posts p on p.id = t.post_id left join sb_replies rp on rp.id = t.reply_id
              join users au on au.id = case when t.target_type = 'sb_post' then p.user_id else rp.user_id end
             where $1::text[] is null or p.city = any($1::text[]))
      (select * from x where open order by last_at desc limit 100) union all (select * from x where not open order by last_at desc limit 30)`, [a.cities ?? null])).rows;
    return { items: rows.map(({ post_id, reply_id, city, ...o }) => ({ ...o, kind: o.target_type === 'sb_post' ? 'post' : 'reply', id: o.target_id })) };
  }) },
  // 隐藏 / 恢复显示（message.hide，必须填理由）。隐藏时这条内容上所有未处理的举报一并标成「已处理」（同一个事务）
  'POST /admin/api/sideline/hide': { name: 'sideline_hide', perm: 'message.hide', body: true, run: (req, d, b, route) => {
    if (!sbTarget(b) || typeof b.hide !== 'boolean' || !reasonOk(b.reason)) return fail(bad(), 'sideline_hide');
    return authed(req, d, route, async (db, a) => {
      await sbCityCheck(db, a, b);
      await db.query(b.kind === 'post' ? 'select admin_sb_post_hide($1::uuid, $2, $3)' : 'select admin_sb_reply_hide($1::bigint, $2, $3)', [b.id, b.hide, b.reason]);
      if (b.hide) await sbCloseReports(db, b, 'actioned');
      return { ok: true };
    }, b);
  } },
  // 不用处理：这条内容上所有未处理的举报标成「已忽略」（report.handle）。没有未处理的 → 409（别人刚处理过）
  'POST /admin/api/sideline/dismiss': { name: 'sideline_dismiss', perm: 'report.handle', body: true, run: (req, d, b, route) => {
    if (!sbTarget(b)) return fail(bad(), 'sideline_dismiss');
    return authed(req, d, route, async (db, a) => { await sbCityCheck(db, a, b); if (!(await sbCloseReports(db, b, 'dismissed'))) throw Object.assign(new Error('state_changed'), { code: 'state_changed' }); return { ok: true } }, b);
  } },
  // ---------- 管理员与操作日志（#27 第 4 步）----------
  // 名单：只有 owner（admin.manage）。不返回密码哈希、两步验证密钥、恢复码（列权限本来就读不到），只给恢复码剩几个。
  // 新增管理员不走网页：用 tools/admin_create.mjs 在本机生成（密码由本人输入、不经过网络）
  'GET /admin/api/admins': { name: 'admins', perm: 'admin.manage', run: (req, d, b, route) => authed(req, d, route, async (db, a) => ({
    me: a.id,
    admins: (await db.query(`select id, email, name, role, cities, disabled, disabled_at, disabled_reason, created_at, last_login_at from admin_users order by disabled, case role when 'owner' then 0 when 'operator' then 1 else 2 end, created_at`)).rows,
    health: (await db.query('select owners::int, active_admins::int, low_recovery::int, live_sessions::int from admin_health')).rows[0],
    cities: (await db.query('select key, name_zh from cities order by key')).rows,
  })) },
  // 改角色 / 停用 / 恢复：至少保留一位 owner、不能停用自己（库函数挡）；停用时撤销他的全部会话
  'POST /admin/api/admins/update': { name: 'admins_update', perm: 'admin.manage', body: true, run: (req, d, b, route) => {
    if (!UUID.test(b.id || '') || (b.role != null && !['owner', 'operator', 'viewer'].includes(b.role)) || (b.disable != null && typeof b.disable !== 'boolean') || (b.role == null && b.disable == null) || !reasonOk(b.reason)) return fail(bad(), 'admins_update');
    return authed(req, d, route, async db => { await db.query('select admin_update($1::uuid, $2, $3, $4)', [b.id, b.role ?? null, b.disable ?? null, b.reason]); return { ok: true } }, b);
  } },
  // 负责的城市：null = 全部城市；owner 不能限城市（库函数挡）
  'POST /admin/api/admins/cities': { name: 'admins_cities', perm: 'admin.manage', body: true, run: (req, d, b, route) => {
    if (!UUID.test(b.id || '') || !(b.cities === null || (Array.isArray(b.cities) && b.cities.length <= 20 && b.cities.every(c => /^[a-z]{2,12}$/.test(c)))) || !reasonOk(b.reason)) return fail(bad(), 'admins_cities');
    return authed(req, d, route, async db => { await db.query('select admin_set_cities($1::uuid, $2::text[], $3)', [b.id, b.cities, b.reason]); return { ok: true } }, b);
  } },
  // 操作日志（audit.view：owner / 运营）。按时间倒序每页 100；before = 上一页最后一条的 id；action 按前缀筛（user. / report. …）。日志只追加，后台不能改
  'GET /admin/api/audit': { name: 'audit', perm: 'audit.view', run: (req, d, b, route) => {
    const sp = new URL(req.url).searchParams, before = sp.get('before') || '', act = sp.get('action') || '';
    if ((before && !/^\d{1,18}$/.test(before)) || (act && !/^[a-z_]{2,20}\.?[a-z_]{0,20}$/.test(act))) return fail(bad(), 'audit');
    const exact = /\.[a-z_]+$/.test(act);                                      // user.status = 只看这一种；user / user. = 这一类
    return authed(req, d, route, async db => {
      const rows = (await db.query(`select l.id::text as id, l.at, l.action, l.target, l.detail, a.name as admin_name, a.role as admin_role
          from admin_audit_log l left join admin_users a on a.id = l.admin_id
         where ($1 = '' or l.id < $1::bigint) and ($2 = '' or l.action = $2) and ($3 = '' or l.action like $3 || '%')
         order by l.id desc limit 101`, [before, exact ? act : '', exact || !act ? '' : act.replace(/\.$/, '').replace(/_/g, '\\_') + '.'])).rows;
      return { rows: rows.slice(0, 100), more: rows.length > 100 };
    });
  } },
  // ---------- 场边配置（#27 第 4 步）：草稿 → 发布 / 丢弃 / 退回旧版本 ----------
  // 读：草稿（没有草稿 = 最新版本）+ 最近 20 个版本 + 还没到门槛的「大家发起」话题（可提前放出）。
  // 写：sideline.config（owner、运营；限城市的管理员不能改全站配置——库函数挡）。每个写操作带页面上看到的版本号 base，别人刚发布过 → 409 admin_config_stale
  'GET /admin/api/sideline/config': { name: 'sb_config', perm: 'sideline.config', run: (req, d, b, route) => authed(req, d, route, async db => ({
    draft: (await db.query('select admin_sb_config_draft() as d')).rows[0].d,
    versions: (await db.query('select * from admin_sb_config_versions(20)')).rows,
    pending: (await db.query(`select id, title, city, created_at from sb_topics where kind = 'user' and released_at is null and merged_into is null order by created_at desc limit 50`)).rows,
  })) },
  'POST /admin/api/sideline/config/set': { name: 'sb_config_set', perm: 'sideline.config', body: true, run: (req, d, b, route) => {
    if (!SB_PARTS.includes(b.part) || b.value === undefined || !Number.isInteger(b.base)) return fail(bad(), 'sb_config_set');
    return authed(req, d, route, async db => ({ draft: await sbCfg(db, 'select admin_sb_config_set($1, $2::jsonb, $3) as d', [b.part, JSON.stringify(b.value), b.base]) }), b);
  } },
  'POST /admin/api/sideline/config/discard': { name: 'sb_config_discard', perm: 'sideline.config', body: true, run: (req, d, b, route) => {
    if (!Number.isInteger(b.base)) return fail(bad(), 'sb_config_discard');
    return authed(req, d, route, async db => { await db.query('select admin_sb_config_discard($1)', [b.base]); return { ok: true } }, b);
  } },
  'POST /admin/api/sideline/config/publish': { name: 'sb_config_publish', perm: 'sideline.config', body: true, run: (req, d, b, route) => {
    if (!Number.isInteger(b.base) || !strIn(b.note, 60)) return fail(bad(), 'sb_config_publish');
    return authed(req, d, route, async db => ({ version: await sbCfg(db, 'select admin_sb_config_publish($1, $2) as d', [b.note, b.base]) }), b);
  } },
  'POST /admin/api/sideline/config/rollback': { name: 'sb_config_rollback', perm: 'sideline.config', body: true, run: (req, d, b, route) => {
    if (!Number.isInteger(b.base) || !Number.isInteger(b.version) || (b.note != null && typeof b.note !== 'string')) return fail(bad(), 'sb_config_rollback');
    return authed(req, d, route, async db => ({ version: (await db.query('select admin_sb_config_rollback($1, $2, $3) as v', [b.version, b.base, b.note ?? null])).rows[0].v }), b);
  } },
  'POST /admin/api/sideline/topics/release': { name: 'sb_topic_release', perm: 'sideline.config', body: true, run: (req, d, b, route) => {
    if (!strIn(b.topic, 80)) return fail(bad(), 'sb_topic_release');
    return authed(req, d, route, async db => { await db.query('select admin_sb_topic_release($1)', [b.topic]); return { ok: true } }, b);
  } },
  // ---------- 统计（#27 第 4 步）：一个白名单批量接口，给概览和各统计页 ----------
  // GET /stats?fns=a,b,c&from=&to=&city=  → { from, to, city, data: { a: [行…] | { error } } }
  //   · 只能调 STATS 里登记的查询（库里的统计函数 / 视图，和原型 CARDSRC 同名同口径）；每个在自己的保存点里跑，一个失败（比如只读角色读不到某张表）不影响其他
  //   · 去掉内部 id（*_id 且是 uuid 的列）；personal = 结果里有昵称 / 内容，只读角色不给
  //   · 时间：默认最近 30 天，跨度 ≤ 366 天；city：限城市的管理员只能看自己负责的城市（不传 = 负责的第一个）
  'GET /admin/api/stats': { name: 'stats', perm: 'page.view', run: (req, d, b, route) => {
    const sp = new URL(req.url).searchParams, now = d.now ? d.now() : Date.now(), fns = (sp.get('fns') || '').split(',').filter(Boolean);
    const to = sp.get('to') ? Date.parse(sp.get('to')) : now, from = sp.get('from') ? Date.parse(sp.get('from')) : to - 30 * 864e5, city = sp.get('city') || null;
    if (!fns.length || fns.length > 12 || !fns.every(f => Object.hasOwn(STATS, f)) || !Number.isFinite(from) || !Number.isFinite(to) || from >= to || to - from > 366 * 864e5 || (city && !cityOk(city))) return fail(bad(), 'stats');
    return authed(req, d, route, async (db, a) => {
      if (city && a.cities && !a.cities.includes(city)) throw Object.assign(new Error('admin_forbidden'), { code: 'admin_forbidden' });
      const c = city || (a.cities ? a.cities[0] : null), f = new Date(from).toISOString(), t = new Date(to).toISOString(), data = {};
      for (const fn of fns) {
        const s = STATS[fn];
        if (s.personal && a.db_role === 'nbq_viewer') { data[fn] = { error: 'admin_forbidden' }; continue }
        await db.query('savepoint st');
        try {
          data[fn] = await runStat(db, fn, f, t, c);
          await db.query('release savepoint st');
        } catch (e) { await db.query('rollback to savepoint st'); data[fn] = { error: String(e.code || '').startsWith('42501') || /permission denied/.test(e.message) ? 'admin_forbidden' : 'failed' }; if (!data[fn].error.startsWith('admin')) console.error('admin_api stats', fn, e.code || e.message?.slice(0, 60)) }
      }
      return { from: f, to: t, city: c, data };
    });
  } },
  // ---------- 导出（#27 第 4 步）：任一统计导出成表格 ----------
  // 先调 admin_export 拿许可并留痕（不带用户 ID：data.export，owner / 运营；带用户 ID：data.export_ids，只有 owner、必须填理由），再在同一事务里取数。
  // 不带用户 ID 时去掉编号、昵称、作者、内容这几列。时间 / 城市参数同 /stats
  'POST /admin/api/export': { name: 'export', perm: 'data.export', body: true, run: (req, d, b, route) => {
    const now = d.now ? d.now() : Date.now(), to = b.to ? Date.parse(b.to) : now, from = b.from ? Date.parse(b.from) : to - 30 * 864e5;
    if (!Object.hasOwn(STATS, b.dataset || '') || typeof b.with_ids !== 'boolean' || (b.reason != null && !reasonOk(b.reason)) || !Number.isFinite(from) || !Number.isFinite(to) || from >= to || to - from > 366 * 864e5) return fail(bad(), 'export');
    return authed(req, d, route, async (db, a) => {
      await db.query('select admin_export($1, $2, $3)', [b.dataset, b.with_ids, b.reason ?? null]);
      return { dataset: b.dataset, rows: await runStat(db, b.dataset, new Date(from).toISOString(), new Date(to).toISOString(), a.cities ? a.cities[0] : null, !b.with_ids) };
    }, b);
  } },
  // ---------- 城市（#27 第 4 步，地区扩展 R4）----------
  // 一览：admin_city_overview（库函数按 nbq_admin_sees 只给自己负责的城市）；改状态 / 资料：city.manage（owner，必须填理由，前进要过检查清单）
  'GET /admin/api/cities': { name: 'cities', perm: 'page.view', run: (req, d, b, route) => authed(req, d, route, async db => ({
    cities: (await db.query(`select key, name_zh, slug, status, beta_at, launched_at, suburbs::int, venues::int, players::int, games_30d::int, waitlist::int, waitlist_pending::int, checklist, community_url,
        (select hashtag from cities c where c.key = o.key) as hashtag, (select center_label from cities c where c.key = o.key) as center_label from admin_city_overview() o`)).rows,
  })) },
  'POST /admin/api/cities/status': { name: 'cities_status', perm: 'city.manage', body: true, run: (req, d, b, route) => {
    if (!cityOk(b.city) || !['off', 'prep', 'beta', 'on'].includes(b.status) || !reasonOk(b.reason)) return fail(bad(), 'cities_status');
    return authed(req, d, route, async db => { await db.query('select admin_city_status($1, $2, $3)', [b.city, b.status, b.reason]); return { ok: true } }, b);
  } },
  'POST /admin/api/cities/set': { name: 'cities_set', perm: 'city.manage', body: true, run: (req, d, b, route) => {
    const p = b.patch; if (!cityOk(b.city) || !reasonOk(b.reason) || !p || typeof p !== 'object' || Array.isArray(p) || !Object.keys(p).length
      || !Object.entries(p).every(([k, v]) => ['community_url', 'hashtag', 'center_label'].includes(k) && typeof v === 'string' && v.length <= 300)) return fail(bad(), 'cities_set');
    return authed(req, d, route, async db => { await db.query('select admin_city_set($1, $2::jsonb, $3)', [b.city, JSON.stringify(p), b.reason]); return { ok: true } }, b);
  } },
  // 开放时通知我：导出还没通知的邮箱（个人信息：owner + 理由，留痕；响应不缓存）· 发完标记已通知
  'POST /admin/api/cities/waitlist': { name: 'cities_waitlist', perm: 'city.waitlist', body: true, run: (req, d, b, route) => {
    if (!cityOk(b.city) || !reasonOk(b.reason)) return fail(bad(), 'cities_waitlist');
    return authed(req, d, route, async db => ({ emails: (await db.query('select email, created_at from admin_city_waitlist($1, $2)', [b.city, b.reason])).rows }), b);
  } },
  'POST /admin/api/cities/waitlist/done': { name: 'cities_waitlist_done', perm: 'city.waitlist', body: true, run: (req, d, b, route) => {
    if (!cityOk(b.city) || !reasonOk(b.reason)) return fail(bad(), 'cities_waitlist_done');
    return authed(req, d, route, async db => ({ marked: (await db.query('select admin_city_waitlist_done($1, $2) as n', [b.city, b.reason])).rows[0].n }), b);
  } },
  // ---------- 风险提醒与规则（#27 第 4 步）----------
  // 列表：view = open（待处理）/ watching（观察中）/ done（最近处理或忽略的 50 条）。inner join users：限城市的管理员只看得到自己城市的人的提醒
  'GET /admin/api/risk': { name: 'risk', perm: 'risk.handle', run: (req, d, b, route) => {
    const view = new URL(req.url).searchParams.get('view') || 'open';
    if (!['open', 'watching', 'done'].includes(view)) return fail(bad(), 'risk');
    return authed(req, d, route, async db => {
      const alerts = (await db.query(`select a.id::text as id, a.rule_code, r.name as rule_name, a.value::float as value, a.score, a.window_from, a.window_to, a.status, a.watch_until, a.suggested, a.note,
               a.handled_at, a.created_at, jsonb_typeof(a.detail) = 'object' and a.detail <> '{}' as has_detail, ad.name as reviewed_by_name,
               u.member_no::int as member_no, u.nickname, u.status as user_status
          from risk_alerts a join users u on u.id = a.user_id join risk_rules r on r.code = a.rule_code left join admin_users ad on ad.id = a.reviewed_by
         where case $1 when 'done' then a.status in ('handled', 'ignored') else a.status = $1 end
         order by case when $1 = 'done' then a.handled_at end desc nulls last, a.score desc, a.created_at limit ${view === 'done' ? 50 : 200}`, [view])).rows;
      const cnt = (await db.query(`select a.status, count(*)::int n from risk_alerts a join users u on u.id = a.user_id where a.status in ('open', 'watching') group by 1`)).rows;
      return { alerts, counts: Object.fromEntries(cnt.map(x => [x.status, x.n])) };
    });
  } },
  // 处理：watching（观察 N 天）/ handled / ignored / open（重新打开）。先在行级安全下确认看得到这条（别的城市 → 404），再调库函数（留痕）
  'POST /admin/api/risk/handle': { name: 'risk_handle', perm: 'risk.handle', body: true, run: (req, d, b, route) => {
    if (!/^\d{1,18}$/.test(String(b.id ?? '')) || !['watching', 'handled', 'ignored', 'open'].includes(b.status) || (b.note != null && !strIn(b.note, 200))
      || (b.watch_days != null && ![3, 7, 14, 30].includes(b.watch_days))) return fail(bad(), 'risk_handle');
    return authed(req, d, route, async db => {
      const a = (await db.query(`select a.status from risk_alerts a join users u on u.id = a.user_id where a.id = $1::bigint`, [String(b.id)])).rows[0];
      if (!a) throw notFound();
      if (a.status === b.status && b.status !== 'watching') throw Object.assign(new Error('state_changed'), { code: 'state_changed' });
      await db.query('select admin_risk_alert($1::bigint, $2, $3, $4)', [String(b.id), b.status, b.note ?? null, b.watch_days ?? 7]); return { ok: true };
    }, b);
  } },
  // ---------- 爽约申诉（#195 ②）----------
  // 列表：view = pending（待处理）/ done（最近处理的 50 条）。对外用球局分享码 + 会员编号，不给内部 id。
  // 证据：谁反馈的（昵称、是不是发起人）、发起人是否在出勤里直接标了未到、这位球友近 90 天其他确认爽约次数。inner join users：限城市的管理员只看自己城市的人
  'GET /admin/api/appeals': { name: 'appeals', perm: 'report.handle', run: (req, d, b, route) => {
    const view = new URL(req.url).searchParams.get('view') || 'pending';
    if (!['pending', 'done'].includes(view)) return fail(bad(), 'appeals');
    return authed(req, d, route, async db => ({ appeals: (await db.query(`
      select g.share_code, g.starts_at, g.game_type::text as game_type, g.capacity, coalesce(v.name, g.venue_name) as venue, h.nickname as host,
             u.member_no::int as member_no, u.nickname, a.reason, a.status, a.created_at, a.decided_at, a.admin_note, ad.name as decided_by_name,
             exists (select 1 from game_participants p where p.game_id = a.game_id and p.user_id = a.user_id and p.attendance = 'no_show') as host_marked,
             coalesce((select jsonb_agg(jsonb_build_object('name', ru.nickname, 'is_host', n.reporter_id = g.host_id) order by n.created_at) from noshow_reports n join users ru on ru.id = n.reporter_id
                        where n.game_id = a.game_id and n.target_id = a.user_id), '[]'::jsonb) as reporters,
             (select count(*)::int from v_confirmed_noshow c where c.user_id = a.user_id and c.game_id <> a.game_id and c.starts_at > now() - interval '90 days') as other_noshows_90d
        from noshow_appeals a join users u on u.id = a.user_id join games g on g.id = a.game_id
        left join users h on h.id = g.host_id left join venues v on v.id = g.venue_id left join admin_users ad on ad.id = a.decided_by
       where case $1 when 'pending' then a.status = 'pending' else a.status <> 'pending' end
       order by case when $1 = 'pending' then a.created_at end asc, a.decided_at desc nulls last limit ${view === 'pending' ? 200 : 50}`, [view])).rows }));
  } },
  // 处理：upheld（申诉成立，这次不计）/ rejected（不成立，重新计入）。先在行级安全下确认看得到这位球友和这条申诉（别的城市 → 404）
  'POST /admin/api/appeals/handle': { name: 'appeals_handle', perm: 'report.handle', body: true, run: (req, d, b, route) => {
    if (!strIn(b.game, 20) || !noOk(b.no) || !['upheld', 'rejected'].includes(b.status) || (b.note != null && !reasonOk(b.note))) return fail(bad(), 'appeals_handle');
    return authed(req, d, route, async db => {
      const r = (await db.query(`select a.game_id, a.user_id from noshow_appeals a join users u on u.id = a.user_id join games g on g.id = a.game_id where g.share_code = $1 and u.member_no = $2::bigint`, [b.game, String(b.no)])).rows[0];
      if (!r) throw notFound();
      await db.query('select admin_noshow_appeal($1, $2, $3, $4)', [r.game_id, r.user_id, b.status, b.note ?? null]); return { ok: true };
    }, b);
  } },
  // 规则：风险规则（权重、阈值、时间窗、开关）+ 频率规则（次数、时间窗、开关）。看：运营以上；改：只有 owner、必须填理由（库函数记改前改后）
  'GET /admin/api/rules': { name: 'rules', perm: 'risk.handle', run: (req, d, b, route) => authed(req, d, route, async db => ({
    risk: (await db.query(`select code, name, weight, threshold::float as threshold, window_days, enabled from risk_rules order by weight desc, code`)).rows,
    rate: (await db.query(`select rule, grp, extract(epoch from win)::int as win_s, max_hits, per_key, enabled, note, day_reset from rate_rules order by grp, rule`)).rows,
  })) },
  'POST /admin/api/rules/set': { name: 'rules_set', perm: 'rules.edit', body: true, run: (req, d, b, route) => {
    const p = b.patch, isInt = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi, ok = b.kind === 'risk'
      ? p && typeof p === 'object' && Object.keys(p).length && Object.keys(p).every(k => ({ weight: v => isInt(v, 0, 100), threshold: v => typeof v === 'number' && v > 0 && v <= 1000, window_days: v => isInt(v, 1, 365), enabled: v => typeof v === 'boolean' })[k]?.(p[k]))
      : b.kind === 'rate' && p && typeof p === 'object' && Object.keys(p).length && Object.keys(p).every(k => ({ max_hits: v => isInt(v, 1, 100000), win_s: v => isInt(v, 60, 366 * 86400), enabled: v => typeof v === 'boolean' })[k]?.(p[k]));
    if (!ok || !/^[a-z_]{2,40}$/.test(b.rule || '') || !reasonOk(b.reason)) return fail(bad(), 'rules_set');
    const patch = { ...p }; if (patch.win_s != null) { patch.win = patch.win_s + ' seconds'; delete patch.win_s }
    return authed(req, d, route, async db => { await db.query('select admin_rule_set($1, $2, $3::jsonb, $4)', [b.kind, b.rule, JSON.stringify(patch), b.reason]); return { ok: true } }, b);
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
