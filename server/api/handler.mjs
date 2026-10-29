// 南伴球 · 接口层入口：/api/*（5g-3 第 1 步：骨架 + 令牌验证 + 健康检查 + /api/me）。
//   handleApi(request, { verify, db }) → Response。纯函数风格，Node / Workers 都能用；同域调用，不开 CORS。
//   错误一律 { error: '<码>' }，码和前台 API_ERR 对照；没登录 401 unauthorized；数据库没配 / 连不上 503 db_unavailable。
//   后续步骤在 ROUTES 里加路由（球局、申请……），都经过同一个 auth + db 流程。
const JSON_H = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
const send = (status, body, extra) => new Response(JSON.stringify(body), { status, headers: { ...JSON_H, ...extra } });

// 球局卡片对外的列（不含发起设备、系列 id 等内部列）
const GAME_COLS = 'id, share_code, host_id, host_nickname, host_utr, venue_id, venue_name, short_name, starts_at, duration_min, game_type, capacity, utr_min, utr_max, note, status, tags, visibility, approved_count::int as approved_count, pending_count::int as pending_count, spots_left::int as spots_left';
const ME_COLS = 'id, nickname, last_initial, member_no, utr, utr_estimated, avatar_kind, avatar_animal, avatar_color, card_theme, created_at';

// 登录令牌 → 球友 id（没有对应的球友 = 还没注册，返回 null）
async function whoIs(request, { verify, db }) {
  const m = (request.headers.get('Authorization') || '').match(/^Bearer\s+(\S+)$/i);
  if (!m) return { err: send(401, { error: 'unauthorized' }) };
  const v = await verify(m[1]);
  if (!v.ok) return { err: send(401, { error: 'unauthorized' }, { 'X-Auth-Reason': v.code }) };
  const uid = await db.asService(async q => (await q('select id from users where auth_id = $1', [v.sub])).rows[0]?.id || null);
  return { sub: v.sub, uid };
}

// 数据库连不上时只给一个粗略的类别（排查用，不含地址 / 用户名 / 报错原文）
const why = e => { const c = String(e && e.code || ''), m = String(e && e.message || '');
  if (c === 'db_not_configured') return 'not_configured';
  if (c === '28P01' || c === '28000') return 'auth_failed';                 // 密码不对 / 账号不存在
  if (/tenant or user not found/i.test(m)) return 'user_not_found';         // 连接池里用户名格式不对（要 nbq_api.项目编号）
  if (/^(ECONN|ENOTFOUND|ETIMEDOUT|EAI_|EHOSTUNREACH)/.test(c) || /connection (terminated|timeout)/i.test(m)) return 'network';
  if (/invalid|parse|url/i.test(m) && !c) return 'bad_url';
  return 'other'; };


// ---- 写操作（5g-3 第 3 步）：规则全在数据库的 api_ 函数里，这里只管登录、参数格式、错误码 → HTTP 状态 ----
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// 数据库错误（P0001，message = 错误码，见 tests/spec/api_spec.md §1）→ HTTP 状态；表里没有的按 409
const ST403 = new Set(['forbidden', 'women_only', 'blocked', 'not_host', 'invite_closed', 'invite_played_only', 'invite_declined_twice', 'not_in_game']);
const ST422 = new Set(['invalid', 'postpone_too_late', 'invite_self', 'counter_same', 'time_past', 'time_out_of_range', 'report_note_required', 'message_link', 'nickname_not_allowed', 'adult_required', 'topic_too_generic', 'topic_name_not_allowed']);
export const statusOf = code => code === 'login_required' ? 401 : code === 'not_found' ? 404 : code === 'pact_required' ? 428 : code === 'restore_expired' ? 410
  : /^account_/.test(code) || ST403.has(code) ? 403 : ST422.has(code) ? 422
  : code !== 'game_open_limit' && /(_limit|_too_fast)$|^rate_limited$|^otp_/.test(code) ? 429 : 409;
function dbError(e) {
  if (!e) return null;
  if (e.code === 'P0001' && /^[a-z][a-z_]{1,40}$/.test(e.message || '')) {
    const st = statusOf(e.message), body = { error: e.message }, extra = {}, det = String(e.detail || '');
    if (det) { body.detail = det; if (st === 429 && /^\d+$/.test(det)) { body.retry_after = +det; extra['Retry-After'] = det } }
    return send(st, body, extra);
  }
  if (/^(22|23)/.test(String(e.code || ''))) return send(422, { error: 'invalid' });    // 格式不对 / 约束不满足：不外露数据库原文
  return null;
}
async function readBody(req) {
  const t = await req.text(); if (t.length > 32768) return { err: send(413, { error: 'too_large' }) };
  if (!t.trim()) return { body: {} };
  try { const b = JSON.parse(t); return b && typeof b === 'object' && !Array.isArray(b) ? { body: b } : { err: send(400, { error: 'bad_json' }) } } catch (_) { return { err: send(400, { error: 'bad_json' }) } }
}
// 写接口的固定流程：验令牌 → 球友 → 取 JSON → 在 nbq_user 事务里执行（死锁 / 序列化冲突整笔重试一次）→ 失败按错误码返回
async function act(req, d, params, fn, { body = true, ids = [] } = {}) {
  const w = await whoIs(req, d);
  if (w.err) return send(401, { error: 'login_required' }, { 'X-Auth-Reason': w.err.headers.get('X-Auth-Reason') || '' });
  if (!w.uid) return send(401, { error: 'login_required' });
  for (const k of ids) if (!UUID.test(params[k] || '')) return send(404, { error: 'not_found' });
  let b = {}; if (body) { const r = await readBody(req); if (r.err) return r.err; b = r.body }
  for (let i = 0; ; i++) {
    try { return send(200, await d.db.asUser(w.uid, q => fn(q, b, params))) }
    catch (e) { if ((e.code === '40P01' || e.code === '40001') && i === 0) continue; if (e.code === '40P01' || e.code === '40001') return send(503, { error: 'busy_retry' }); throw e }
  }
}
const one = async (q, sql, args) => (await q(sql, args)).rows[0];

const ROUTES = {
  'GET /api/health': async (req, d) => {
    const out = { ok: true, db: null };
    if (new URL(req.url).searchParams.get('db') === '1') {
      try { await d.db.asService(q => q('select 1')); out.db = true } catch (e) { out.db = false; out.ok = false; out.why = why(e) }
    }
    return send(out.ok ? 200 : 503, out);
  },
  'GET /api/me': async (req, d) => {
    const w = await whoIs(req, d); if (w.err) return w.err;
    if (!w.uid) return send(200, { registered: false });
    const user = await d.db.asUser(w.uid, async q => (await q(`select ${ME_COLS} from users where id = nbq_uid()`)).rows[0] || null);
    return send(200, user ? { registered: true, user } : { registered: false });
  },
  // ---- 第 2 步：只读接口（球场 / 球局 / 球友公开资料）----
  // 球场是公共参考数据，没登录也能看（场边页本来就允许未登录浏览）
  'GET /api/venues': async (req, d) => {
    const rows = await d.db.asService(async q => (await q(`select id, name, short_name, suburb, surfaces, courts, lights, indoor, booking_url,
      round(st_y(location::geometry)::numeric, 5)::float8 as lat, round(st_x(location::geometry)::numeric, 5)::float8 as lng from venues order by name`)).rows);
    return send(200, { venues: rows }, { 'Cache-Control': 'public, max-age=300' });
  },
  // 球局列表：只要还没开打的公开球局；可见性由数据库的 api_game_cards（game_visible）决定，这里不再判断
  'GET /api/games': async (req, d) => {
    const w = await whoIs(req, d); if (w.err) return w.err; if (!w.uid) return send(403, { error: 'not_registered' });
    const rows = await d.db.asUser(w.uid, async q => (await q(`select ${GAME_COLS} from api_game_cards where status in ('open','full') and starts_at > now() order by starts_at limit 100`)).rows);
    return send(200, { games: rows });
  },
  // 单个球局（分享码），打开分享链接用
  'GET /api/game': async (req, d) => {
    const code = new URL(req.url).searchParams.get('code') || ''; if (!/^[A-Za-z0-9]{3,16}$/.test(code)) return send(400, { error: 'bad_code' });
    const w = await whoIs(req, d); if (w.err) return w.err; if (!w.uid) return send(403, { error: 'not_registered' });
    const g = await d.db.asUser(w.uid, async q => (await q(`select ${GAME_COLS} from api_game_cards where share_code = $1`, [code])).rows[0] || null);
    return g ? send(200, { game: g }) : send(404, { error: 'not_found' });   // 看不见的球局（私人 / 被屏蔽）和不存在的一样返回 404
  },
  // 别人的资料：只给球员卡上本来就公开的列（public_profiles）
  'GET /api/profile': async (req, d) => {
    const id = new URL(req.url).searchParams.get('id') || ''; if (!/^[0-9a-f-]{36}$/i.test(id)) return send(400, { error: 'bad_id' });
    const w = await whoIs(req, d); if (w.err) return w.err; if (!w.uid) return send(403, { error: 'not_registered' });
    const p = await d.db.asUser(w.uid, async q => (await q(`select id, member_no, nickname, last_initial, utr, utr_estimated, avatar_kind, avatar_animal, avatar_color, seal_roll, card_theme, level, gone from public_profiles where id = $1`, [id])).rows[0] || null);
    return p ? send(200, { profile: p }) : send(404, { error: 'not_found' });
  },
  // ---- 第 3 步：球局与申请的写操作（对应 api_spec §4–§5）----
  'POST /api/me/pact': (req, d, p) => act(req, d, p, async q => { await q('select api_pact_accept()'); return { ok: true } }, { body: false }),
  'POST /api/games': (req, d, p) => act(req, d, p, async (q, b) => {
    const id = (await one(q, 'select api_game_create($1::jsonb) as id', [JSON.stringify(b)])).id;
    return { id, share_code: (await one(q, 'select share_code from games where id = $1', [id])).share_code } }),
  'PATCH /api/games/:id': (req, d, p) => act(req, d, p, async (q, b, x) => ({ changes: (await one(q, 'select api_game_edit($1, $2::jsonb) as r', [x.id, JSON.stringify(b)])).r }), { ids: ['id'] }),
  'POST /api/games/:id/postpone': (req, d, p) => act(req, d, p, async (q, b, x) => ({ starts_at: (await one(q, 'select api_game_postpone($1) as t', [x.id])).t }), { ids: ['id'], body: false }),
  'POST /api/games/:id/cancel': (req, d, p) => act(req, d, p, async (q, b, x) => { await q('select api_game_cancel($1)', [x.id]); return { ok: true } }, { ids: ['id'], body: false }),
  'POST /api/games/:id/requests': (req, d, p) => act(req, d, p, async (q, b, x) => {
    if (b.message != null && typeof b.message !== 'string') throw Object.assign(new Error('invalid'), { code: '22023' });
    return { status: (await one(q, 'select api_apply($1, $2) as s', [x.id, b.message ?? null])).s } }, { ids: ['id'] }),
  'POST /api/games/:id/join': (req, d, p) => act(req, d, p, async (q, b, x) => ({ status: (await one(q, 'select api_join($1) as s', [x.id])).s }), { ids: ['id'], body: false }),
  'POST /api/games/:id/requests/:uid/approve': (req, d, p) => act(req, d, p, async (q, b, x) => (await one(q, 'select api_approve($1, $2) as r', [x.id, x.uid])).r, { ids: ['id', 'uid'], body: false }),
  'POST /api/games/:id/requests/:uid/decline': (req, d, p) => act(req, d, p, async (q, b, x) => {
    await q('select api_decline($1, $2, $3, $4)', [x.id, x.uid, typeof b.reason === 'string' ? b.reason : null, typeof b.note === 'string' ? b.note : null]); return { ok: true } }, { ids: ['id', 'uid'] }),
  'DELETE /api/games/:id/requests/me': (req, d, p) => act(req, d, p, async (q, b, x) => ({ status: (await one(q, 'select api_leave($1) as s', [x.id])).s }), { ids: ['id'], body: false }),
  'POST /api/games/:id/change-ack': (req, d, p) => act(req, d, p, async (q, b, x) => ({ status: (await one(q, 'select api_change_ack($1, $2) as s', [x.id, typeof b.choice === 'string' ? b.choice : null])).s }), { ids: ['id'] }),
};

// 带 :参数 的路径：编译成正则，按声明顺序匹配（没有 :参数 的走上面的精确匹配）
const PATTERNS = Object.keys(ROUTES).filter(k => k.includes(':')).map(k => { const [m, pth] = k.split(' ');
  const names = []; const re = new RegExp('^' + pth.replace(/:([a-z]+)/g, (_, n) => { names.push(n); return '([^/]+)' }) + '$'); return { key: k, m, re, names } });
const matchPattern = (method, path) => { for (const t of PATTERNS) if (t.m === method) { const r = t.re.exec(path); if (r) return { h: ROUTES[t.key], params: Object.fromEntries(t.names.map((n, i) => [n, decodeURIComponent(r[i + 1])])), key: t.key } } return null };
const pathExists = path => Object.keys(ROUTES).some(k => k.endsWith(' ' + path)) || PATTERNS.some(t => t.re.test(path));

export async function handleApi(request, deps) {
  const path = new URL(request.url).pathname.replace(/\/+$/, '');
  const key = request.method + ' ' + path;
  let h = ROUTES[key] || (request.method === 'HEAD' && ROUTES['GET ' + path]), params = {}, name = key;
  if (!h) { const m = matchPattern(request.method, path); if (m) { h = m.h; params = m.params; name = m.key } }
  if (!h) return pathExists(path) ? send(405, { error: 'method_not_allowed' }) : send(404, { error: 'not_found' });
  try { return await h(request, deps, params) }
  catch (e) { const r = dbError(e); if (r) return r; console.error('api_error', name, e && (e.code || e.message)); return send(503, { error: 'db_unavailable' }) }   // 细节不外露（数据库地址、报错原文）；排查看日志
}
