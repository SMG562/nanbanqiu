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
};

export async function handleApi(request, deps) {
  const path = new URL(request.url).pathname.replace(/\/+$/, '');
  const key = request.method + ' ' + path, h = ROUTES[key] || (request.method === 'HEAD' && ROUTES['GET ' + path]);
  if (!h) return Object.keys(ROUTES).some(k => k.endsWith(' ' + path)) ? send(405, { error: 'method_not_allowed' }) : send(404, { error: 'not_found' });
  try { return await h(request, deps) }
  catch (e) { console.error('api_error', key, e && (e.code || e.message)); return send(503, { error: 'db_unavailable' }) }   // 细节不外露（数据库地址、报错原文）；排查看 Workers 日志
}
