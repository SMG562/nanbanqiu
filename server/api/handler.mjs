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
  if (e.code === '42501') return send(403, { error: 'forbidden' });                    // 改了不允许改的列（列权限）
  if (e.constraint === 'reports_one_open') return send(409, { error: 'report_duplicate' });
  if (/^(22|23)/.test(String(e.code || ''))) return send(422, { error: 'invalid' });    // 格式不对 / 约束不满足：不外露数据库原文
  return null;
}
async function readBody(req) {
  const t = await req.text(); if (t.length > 32768) return { err: send(413, { error: 'too_large' }) };
  if (!t.trim()) return { body: {} };
  try { const b = JSON.parse(t); return b && typeof b === 'object' && !Array.isArray(b) ? { body: b } : { err: send(400, { error: 'bad_json' }) } } catch (_) { return { err: send(400, { error: 'bad_json' }) } }
}
// 写接口的固定流程：验令牌 → 球友 → 取 JSON → 在 nbq_user 事务里执行（死锁 / 序列化冲突整笔重试一次）→ 失败按错误码返回
async function act(req, d, params, fn, { body = true, ids = [], nums = [], anon = false } = {}) {
  let uid = null;
  if (anon && !req.headers.get('Authorization')) uid = null;          // 没登录也能调的接口（浏览 / 分享 / 配置）：以匿名身份执行，由数据库函数判断
  else {
    const w = await whoIs(req, d);
    if (w.err) return send(401, { error: 'login_required' }, { 'X-Auth-Reason': w.err.headers.get('X-Auth-Reason') || '' });
    if (!w.uid && !anon) return send(401, { error: 'login_required' });
    uid = w.uid;
  }
  for (const k of ids) if (!UUID.test(params[k] || '')) return send(404, { error: 'not_found' });
  for (const k of nums) if (!/^\d{1,15}$/.test(params[k] || '')) return send(404, { error: 'not_found' });
  let b = {}; if (body) { const r = await readBody(req); if (r.err) return r.err; b = r.body }
  for (let i = 0; ; i++) {
    try { return send(200, await d.db.asUser(uid, q => fn(q, b, params))) }
    catch (e) { if ((e.code === '40P01' || e.code === '40001') && i === 0) continue; if (e.code === '40P01' || e.code === '40001') return send(503, { error: 'busy_retry' }); throw e }
  }
}
const str = v => typeof v === 'string' ? v : null;   // 不是文字的字段一律当没填，让数据库的检查去报错
const bad = () => Object.assign(new Error('invalid'), { code: '22023' });
const ME_EDITABLE = new Set(['nickname', 'last_initial', 'avatar_kind', 'avatar_animal', 'seal_roll', 'avatar_color', 'utr', 'utr_estimated', 'card_theme', 'wechat_id', 'gender', 'main_club_id', 'invite_from', 'analytics_opt_out', 'email', 'email_prefs']);
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
  // ---- 第 3 步（续）：邀约、赛后、球友偏好、聊天、举报、屏蔽、通知 ----
  'POST /api/invites': (req, d, p) => act(req, d, p, async (q, b) => ({ id: (await one(q, 'select api_invite($1::jsonb) as id', [JSON.stringify(b)])).id })),
  'POST /api/invites/:id/accept': (req, d, p) => act(req, d, p, async (q, b, x) => ({ game_id: (await one(q, 'select api_invite_accept($1) as g', [x.id])).g }), { ids: ['id'], body: false }),
  'POST /api/invites/:id/counter': (req, d, p) => act(req, d, p, async (q, b, x) => { await q('select api_invite_counter($1, $2::jsonb)', [x.id, JSON.stringify(b)]); return { ok: true } }, { ids: ['id'] }),
  'POST /api/invites/:id/decline': (req, d, p) => act(req, d, p, async (q, b, x) => { await q('select api_invite_decline($1, $2, $3)', [x.id, str(b.reason), str(b.note)]); return { ok: true } }, { ids: ['id'] }),
  'POST /api/invites/:id/withdraw': (req, d, p) => act(req, d, p, async (q, b, x) => ({ status: (await one(q, 'select api_invite_withdraw($1) as s', [x.id])).s }), { ids: ['id'], body: false }),
  'PUT /api/games/:id/recap': (req, d, p) => act(req, d, p, async (q, b, x) => { await q('select api_recap($1, $2::jsonb)', [x.id, JSON.stringify(b)]); return { ok: true } }, { ids: ['id'] }),
  'POST /api/games/:id/attendance/:uid': (req, d, p) => act(req, d, p, async (q, b, x) => { await q('select api_attendance($1, $2, $3)', [x.id, x.uid, str(b.value)]); return { ok: true } }, { ids: ['id', 'uid'] }),
  'POST /api/games/:id/noshow': (req, d, p) => act(req, d, p, async (q, b, x) => {
    if (!UUID.test(str(b.target_id) || '')) throw bad();
    return { confirmed: (await one(q, 'select api_noshow_report($1, $2) as r', [x.id, b.target_id])).r } }, { ids: ['id'] }),
  'DELETE /api/games/:id/noshow': (req, d, p) => act(req, d, p, async (q, b, x) => {
    if (!UUID.test(str(b.target_id) || '')) throw bad();
    await q('select api_noshow_undo($1, $2)', [x.id, b.target_id]); return { ok: true } }, { ids: ['id'] }),
  'POST /api/games/:id/appeal': (req, d, p) => act(req, d, p, async (q, b, x) => { await q('select api_noshow_appeal($1, $2, $3)', [x.id, str(b.reason), str(b.note)]); return { ok: true } }, { ids: ['id'] }),
  'PUT /api/players/:id/pref': (req, d, p) => act(req, d, p, async (q, b, x) => { await q('select api_pref_set($1, $2)', [x.id, str(b.pref)]); return { ok: true } }, { ids: ['id'] }),
  'POST /api/players/:id/kudos': (req, d, p) => act(req, d, p, async (q, b, x) => {
    if (!UUID.test(str(b.game_id) || '')) throw bad();
    return { kudos: (await one(q, 'select api_kudos($1, $2) as n', [b.game_id, x.id])).n } }, { ids: ['id'] }),
  // 聊天：先开对话（DM 给对方 id，群聊给球局 id），再发消息
  'POST /api/threads': (req, d, p) => act(req, d, p, async (q, b) => {
    const u = str(b.user_id), g = str(b.game_id); if ((u ? 1 : 0) + (g ? 1 : 0) !== 1 || !UUID.test(u || g)) throw bad();
    return { id: u ? (await one(q, 'select api_thread_dm($1) as t', [u])).t : (await one(q, 'select api_thread_game($1) as t', [g])).t } }),
  'POST /api/threads/:id/messages': (req, d, p) => act(req, d, p, async (q, b, x) => ({ id: Number((await one(q, 'select api_message_send($1, $2) as m', [x.id, str(b.body)])).m) }), { ids: ['id'] }),
  'POST /api/reports': (req, d, p) => act(req, d, p, async (q, b) => {
    const tt = str(b.target_type), tid = str(b.target_id), why = str(b.reason), via = str(b.via), note = str(b.note);
    const sb = tt === 'sb_post' || tt === 'sb_reply';
    if (!['user', 'game', 'sb_post', 'sb_reply'].includes(tt) || !(tt === 'sb_reply' ? /^\d{1,15}$/ : UUID).test(tid || '')) throw bad();
    if (why === 'other' && !sb && !(note || '').trim()) throw Object.assign(new Error('report_note_required'), { code: 'P0001' });
    await q(`insert into reports(reporter_id, target_type, target_id, reason, note, source, via, context_ref) values (nbq_uid(), $1, $2, $3, $4, 'in_app', $5, $6)`, [tt, tid, why, note || null, via, str(b.context_ref)]);
    return { ok: true } }),
  'POST /api/blocks': (req, d, p) => act(req, d, p, async (q, b) => { if (!UUID.test(str(b.user_id) || '')) throw bad(); await q('select api_block($1)', [b.user_id]); return { ok: true } }),
  'DELETE /api/blocks/:id': (req, d, p) => act(req, d, p, async (q, b, x) => { await q('select api_unblock($1)', [x.id]); return { ok: true } }, { ids: ['id'], body: false }),
  'GET /api/notifications': async (req, d) => {
    const w = await whoIs(req, d); if (w.err) return send(401, { error: 'login_required' }); if (!w.uid) return send(401, { error: 'login_required' });
    const rows = await d.db.asUser(w.uid, async q => (await q(`select id::float8 as id, kind, game_id, actor_id, read_at, created_at from notifications where user_id = nbq_uid() order by created_at desc limit 100`)).rows);
    return send(200, { notifications: rows }) },
  'POST /api/notifications/read': (req, d, p) => act(req, d, p, async (q, b) => {
    const ids = b.all === true ? null : Array.isArray(b.ids) && b.ids.length <= 200 && b.ids.every(n => Number.isInteger(n) && n > 0) ? b.ids : (() => { throw bad() })();
    return { read: (await one(q, 'select api_notif_read($1::bigint[]) as n', [ids])).n } }),
  // ---- 第 3 步（续 2）：我的资料、球场/区、聊天记录 ----
  // 只放行资料类的列（和 schema 里 grant update 一致）；其余列 → 403 forbidden；昵称规则、改名频率、性别只能改一次等由数据库触发器判断
  'PATCH /api/me': (req, d, p) => act(req, d, p, async (q, b) => {
    const keys = Object.keys(b); if (!keys.length) throw bad();
    if (keys.some(k => !ME_EDITABLE.has(k))) throw Object.assign(new Error('forbidden'), { code: 'P0001' });
    const vals = keys.map(k => b[k] !== null && typeof b[k] === 'object' ? JSON.stringify(b[k]) : b[k]);
    const r = await q(`update users set ${keys.map((k, i) => `${k} = $${i + 1}`).join(', ')} where id = nbq_uid() returning ${ME_COLS}`, vals);
    if (!r.rows[0]) throw Object.assign(new Error('not_found'), { code: 'P0001' });
    return { user: r.rows[0] } }),
  'PUT /api/me/clubs': (req, d, p) => act(req, d, p, async (q, b) => {
    const ids = b.venue_ids; if (!Array.isArray(ids) || ids.length > 3 || new Set(ids).size !== ids.length || !ids.every(v => UUID.test(str(v) || ''))) throw bad();
    await q('delete from user_clubs where user_id = nbq_uid()'); for (const v of ids) await q('insert into user_clubs(user_id, venue_id) values (nbq_uid(), $1)', [v]);
    return { venue_ids: ids } }),
  'PUT /api/me/suburb': (req, d, p) => act(req, d, p, async (q, b) => {
    const sub = str(b.suburb), pc = str(b.postcode); if (!sub || !/^\d{4}$/.test(pc || '')) throw bad();
    await q(`insert into user_suburb_picks(user_id, suburb, postcode) values (nbq_uid(), $1, $2) on conflict (user_id, suburb, postcode) do update set picked_at = now()`, [sub, pc]); return { ok: true } }),
  'PATCH /api/games/:id/me': (req, d, p) => act(req, d, p, async (q, b, x) => {
    if (typeof b.show_wechat !== 'boolean') throw bad();
    return { show_wechat: (await one(q, 'select api_show_wechat($1, $2) as v', [x.id, b.show_wechat])).v } }, { ids: ['id'] }),
  'GET /api/threads': (req, d, p) => act(req, d, p, async q => ({ threads: (await q(`
      select t.id, t.kind, t.game_id, case when t.kind = 'dm' then case when t.user_a = nbq_uid() then t.user_b else t.user_a end end as other_id,
             lm.body as last_body, lm.created_at as last_at, coalesce(lm.sender_id <> nbq_uid() and (tr.last_read_at is null or lm.created_at > tr.last_read_at), false) as unread
        from threads t
        left join lateral (select m.body, m.created_at, m.sender_id from messages m where m.thread_id = t.id and (not m.hidden or m.sender_id = nbq_uid()) order by m.id desc limit 1) lm on true
        left join thread_reads tr on tr.thread_id = t.id and tr.user_id = nbq_uid()
       order by coalesce(lm.created_at, t.created_at) desc limit 100`)).rows }), { body: false }),
  'GET /api/threads/:id/messages': (req, d, p) => act(req, d, p, async (q, b, x) => {
    const before = new URL(req.url).searchParams.get('before'); if (before !== null && !/^\d{1,15}$/.test(before)) throw bad();
    const rows = (await q(`select id::float8 as id, sender_id, body, created_at from messages where thread_id = $1 and (not hidden or sender_id = nbq_uid()) ${before ? 'and id < $2' : ''} order by id desc limit 50`, before ? [x.id, before] : [x.id])).rows;
    return { messages: rows.reverse() } }, { ids: ['id'], body: false }),
  'POST /api/threads/:id/read': (req, d, p) => act(req, d, p, async (q, b, x) => {
    const t = await q('select 1 from threads where id = $1', [x.id]); if (!t.rowCount) throw Object.assign(new Error('not_found'), { code: 'P0001' });   // 行级权限：不在对话里 = 看不到 = 404
    await q(`insert into thread_reads(thread_id, user_id, last_read_at) values ($1, nbq_uid(), now()) on conflict (thread_id, user_id) do update set last_read_at = now()`, [x.id]); return { ok: true } }, { ids: ['id'], body: false }),
  // ---- 第 3 步（续 3）：场边、账号注销 / 恢复、推送订阅（对应 api_spec §14、§2、§3）----
  'POST /api/sideline/posts': (req, d, p) => act(req, d, p, async (q, b) => (await one(q, 'select api_sb_post($1::jsonb) as r', [JSON.stringify(b)])).r),
  'DELETE /api/sideline/posts/:id': (req, d, p) => act(req, d, p, async (q, b, x) => { await q('select api_sb_delete($1)', [x.id]); return { ok: true } }, { ids: ['id'], body: false }),
  'PATCH /api/sideline/posts/:id': (req, d, p) => act(req, d, p, async (q, b, x) => {
    if (typeof b.replies_open !== 'boolean') throw bad(); await q('select api_sb_replies_open($1, $2)', [x.id, b.replies_open]); return { replies_open: b.replies_open } }, { ids: ['id'] }),
  'POST /api/sideline/posts/:id/replies': (req, d, p) => act(req, d, p, async (q, b, x) => {
    if (b.to != null && !UUID.test(str(b.to) || '')) throw bad();
    return { id: Number((await one(q, 'select api_sb_reply($1, $2, $3) as r', [x.id, str(b.body), b.to ?? null])).r) } }, { ids: ['id'] }),
  'DELETE /api/sideline/replies/:id': (req, d, p) => act(req, d, p, async (q, b, x) => { await q('select api_sb_reply_delete($1)', [x.id]); return { ok: true } }, { nums: ['id'], body: false }),
  'PUT /api/sideline/posts/:id/ball': (req, d, p) => act(req, d, p, async (q, b, x) => ({ balls: (await one(q, 'select api_sb_ball($1) as n', [x.id])).n }), { ids: ['id'], body: false }),
  'DELETE /api/sideline/posts/:id/ball': (req, d, p) => act(req, d, p, async (q, b, x) => ({ balls: (await one(q, 'select api_sb_unball($1) as n', [x.id])).n }), { ids: ['id'], body: false }),
  'POST /api/sideline/posts/:id/hide': (req, d, p) => act(req, d, p, async (q, b, x) => { await q('select api_sb_hide($1, $2)', [x.id, b.reason == null ? 'none' : str(b.reason)]); return { ok: true } }, { ids: ['id'] }),
  // 没登录也能调：看和分享不算互动；匿名时靠 device（数据库里存哈希）
  'POST /api/sideline/views': (req, d, p) => act(req, d, p, async (q, b) => {
    const ids = b.post_ids; if (!Array.isArray(ids) || ids.length > 50 || !ids.every(v => UUID.test(str(v) || ''))) throw Object.assign(new Error('invalid'), { code: 'P0001', detail: 'posts' });
    return { counted: (await one(q, 'select api_sb_view($1::uuid[], $2) as n', [ids, str(b.device)])).n } }, { anon: true }),
  'POST /api/sideline/posts/:id/share': (req, d, p) => act(req, d, p, async (q, b, x) => ({ counted: (await one(q, 'select api_sb_share($1, $2) as n', [x.id, str(b.device)])).n }), { ids: ['id'], anon: true }),
  'GET /api/sideline/config': (req, d, p) => act(req, d, p, async q => {
    const v = new URL(req.url).searchParams.get('v'); if (v !== null && !/^\d{1,9}$/.test(v)) throw bad();
    return (await one(q, 'select sb_config($1::int) as c', [v === null ? null : +v])).c }, { body: false, anon: true }),
  'DELETE /api/me': (req, d, p) => act(req, d, p, async q => (await one(q, 'select api_account_delete() as r')).r, { body: false }),
  'POST /api/me/restore': (req, d, p) => act(req, d, p, async q => { await q('select api_account_restore()'); return { ok: true } }, { body: false }),
  // 推送订阅写在 user_devices（发送程序读这里）：同一个 endpoint 更新密钥；否则占用这一端（手机 / 电脑）还没开推送的设备行；再没有就新建
  'POST /api/push/subscriptions': (req, d, p) => act(req, d, p, async (q, b) => {
    const ep = str(b.endpoint), k = b.keys || {}, pf = { mobile: 'mobile', ios_pwa: 'mobile', android: 'mobile', desktop: 'desktop' }[str(b.platform)];
    if (!ep || ep.length > 1000 || !/^https:\/\//.test(ep) || !str(k.p256dh) || !str(k.auth) || !pf) throw bad();
    const set = `push_endpoint = $1, push_p256dh = $2, push_auth = $3, last_active_at = now()`;
    let r = await q(`update user_devices set ${set} where user_id = nbq_uid() and push_endpoint = $1`, [ep, k.p256dh, k.auth]);
    if (!r.rowCount) r = await q(`update user_devices set ${set} where id = (select id from user_devices where user_id = nbq_uid() and platform = $4 and push_endpoint is null order by created_at limit 1)`, [ep, k.p256dh, k.auth, pf]);
    if (!r.rowCount) await q(`insert into user_devices(user_id, platform, push_endpoint, push_p256dh, push_auth, last_active_at) values (nbq_uid(), $4, $1, $2, $3, now())`, [ep, k.p256dh, k.auth, pf]);
    return { ok: true } }),
  'DELETE /api/push/subscriptions': (req, d, p) => act(req, d, p, async (q, b) => { await q('update user_devices set push_endpoint = null, push_p256dh = null, push_auth = null where user_id = nbq_uid() and push_endpoint = $1', [str(b.endpoint)]); return { ok: true } }),
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
  catch (e) { const r = dbError(e); if (r) return r; console.error('api_error', name, e && (e.code || e.name)); return send(503, { error: 'db_unavailable' }) }   // 细节不外露（数据库地址、报错原文）；排查看日志
}
