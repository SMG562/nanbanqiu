// 南伴球 · 接口层入口：/api/*（5g-3 第 1 步：骨架 + 令牌验证 + 健康检查 + /api/me）。
//   handleApi(request, { verify, db }) → Response。纯函数风格，Node / Workers 都能用；同域调用，不开 CORS。
//   错误一律 { error: '<码>' }，码和前台 API_ERR 对照；没登录 401 unauthorized；数据库没配 / 连不上 503 db_unavailable。
//   后续步骤在 ROUTES 里加路由（球局、申请……），都经过同一个 auth + db 流程。
import { OWN_ISS, issOf } from './jwt.mjs';
const JSON_H = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
const send = (status, body, extra) => new Response(JSON.stringify(body), { status, headers: { ...JSON_H, ...extra } });
const CE_HITS = new Map();   // 页面报错上报的按 IP 限流（每个实例各算各的，够挡刷）

// 球局卡片对外的列（不含发起设备、系列 id 等内部列）
const GAME_COLS = 'g.id, g.share_code, g.host_id, g.host_nickname, g.host_utr, g.venue_id, g.venue_name, g.short_name, g.starts_at, g.duration_min, g.game_type, g.capacity, g.utr_min, g.utr_max, g.note, g.status, g.tags, g.visibility, g.filled::int as filled, '
  + 'gg.join_mode, gg.city, gg.postponed_at, gg.original_start, gg.time_set_at, g.approved_count::int as approved_count, g.pending_count::int as pending_count, g.spots_left::int as spots_left';
// api_game_cards 是早期建的视图，后来加的列（加入方式、城市、顺延时间…）不在里面，所以再关联 games 取（games 的行级权限同样生效）
const GAME_FROM = 'api_game_cards g join games gg on gg.id = g.id';
const ME_COLS = 'id, nickname, last_initial, member_no, utr, utr_estimated, avatar_kind, avatar_animal, avatar_color, card_theme, created_at';
// 「我」的完整资料：基本列 + 性别 + 常去球场（user_clubs）。注册返回、GET /api/me 都用这个
const ME_SEL = `${ME_COLS}, seal_roll, wechat_id, invite_from, (email is not null) as mail_set, email_prefs as mail_prefs, gender, pact_accepted_at, coalesce((select array_agg(uc.venue_id order by uc.created_at) from user_clubs uc where uc.user_id = users.id), '{}') as club_ids`;

// 登录令牌 → 球友 id（没有对应的球友 = 还没注册，返回 null）
async function whoIs(request, { verify, db, session }) {
  const m = (request.headers.get('Authorization') || '').match(/^Bearer\s+(\S+)$/i);
  if (!m) return { err: send(401, { error: 'unauthorized' }) };
  const own = session && issOf(m[1]) === OWN_ISS;   // 登录交接签发的令牌（11-14）：由接口层自己的公钥验；其余仍是 Supabase 的
  const v = own ? await session.verify(m[1]) : await verify(m[1]);
  if (!v.ok) return { err: send(401, { error: 'unauthorized' }, { 'X-Auth-Reason': v.code }) };
  const uid = await db.asService(async q => (await q('select id from users where auth_id = $1', [v.sub])).rows[0]?.id || null);
  return { sub: v.sub, uid, phone: typeof v.claims?.phone === 'string' ? v.claims.phone : null };
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
const ST403 = new Set(['forbidden', 'women_only', 'blocked', 'not_host', 'invite_closed', 'invite_played_only', 'invite_declined_twice', 'not_in_game', 'register_paused']);
const ST422 = new Set(['invalid', 'postpone_too_late', 'invite_self', 'counter_same', 'time_past', 'time_out_of_range', 'report_note_required', 'message_link', 'nickname_not_allowed', 'adult_required', 'topic_too_generic', 'topic_name_not_allowed', 'buddy_self']);
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
  if (/^(22|23)/.test(String(e.code || ''))) { console.error('api_db', e.code, e.constraint || e.column || ''); return send(422, { error: 'invalid' }) }    // 格式不对 / 约束不满足：不外露数据库原文
  return null;
}
async function readBody(req) {
  const t = await req.text(); if (t.length > 32768) return { err: send(413, { error: 'too_large' }) };
  if (!t.trim()) return { body: {} };
  try { const b = JSON.parse(t); return b && typeof b === 'object' && !Array.isArray(b) ? { body: b } : { err: send(400, { error: 'bad_json' }) } } catch (_) { return { err: send(400, { error: 'bad_json' }) } }
}
// 写接口的固定流程：验令牌 → 球友 → 取 JSON → 在 nbq_user 事务里执行（死锁 / 序列化冲突整笔重试一次）→ 失败按错误码返回
//   idem（#276）：会新插一行的接口填自己的路由名，opt-in 幂等。请求带 Idempotency-Key 时，和写操作在同一个事务里先 idem_begin：
//   同一个 key 来过就直接返回第一次的结果，否则照常做、再 idem_finish 存结果。不带 key 的请求（旧前台）和以前完全一样
async function act(req, d, params, fn, { body = true, ids = [], nums = [], anon = false, idem = null } = {}) {
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
  const key = idem && uid ? req.headers.get('Idempotency-Key') : null, route = idem && idem.replace(/:(\w+)/g, (_, k) => params[k]);   // 拼上具体对象：同一个 key 发到另一个会话 / 帖子 → 409，不会错拿第一次的结果
  const run = !key ? q => fn(q, b, params) : async q => {
    const old = (await one(q, 'select idem_begin($1, $2) as r', [key, route])).r; if (old) return old;
    const out = await fn(q, b, params); await q('select idem_finish($1, $2::jsonb)', [key, JSON.stringify(out ?? {})]); return out };
  for (let i = 0; ; i++) {
    try { return send(200, await d.db.asUser(uid, run)) }
    catch (e) { if ((e.code === '40P01' || e.code === '40001') && i === 0) continue; if (e.code === '40P01' || e.code === '40001') return send(503, { error: 'busy_retry' }); throw e }
  }
}
const str = v => typeof v === 'string' ? v : null;   // 不是文字的字段一律当没填，让数据库的检查去报错
const bad = () => Object.assign(new Error('invalid'), { code: '22023' });
const ME_EDITABLE = new Set(['nickname', 'last_initial', 'avatar_kind', 'avatar_animal', 'seal_roll', 'avatar_color', 'card_theme', 'wechat_id', 'gender', 'main_club_id', 'invite_from', 'analytics_opt_out', 'email', 'email_prefs']);
const one = async (q, sql, args) => (await q(sql, args)).rows[0];


// 球友公开卡片（球员卡上本来就公开的列 + 打过几场 / 发起几场 / 好评数）。传一组 id，返回按 id 索引的对象
const CARD_SQL = `select pc.user_id as id, pc.member_no, pc.nickname, pc.last_initial, pc.utr, pc.avatar_kind, pc.avatar_animal, pc.avatar_color, pc.seal_roll, pc.card_theme,
    pc.card_venue_id, pc.played::int as played, pc.hosted::int as hosted, pc.kudos::int as kudos, pc.level, pp.gone
  from player_cards pc join public_profiles pp on pp.id = pc.user_id where pc.user_id = any($1::uuid[])`;
const cardsOf = async (q, ids) => { const u = [...new Set(ids.filter(Boolean))]; if (!u.length) return {};
  return Object.fromEntries((await q(CARD_SQL, [u])).rows.map(r => [r.id, r])) };
// 参与记录：留言、婉拒原因只有发起人和本人看得到；改动确认只给本人
const PART_SQL = `select gp.game_id, gp.user_id, gp.role, gp.status::text as status, gp.created_at, gp.approved_at, gp.left_at,
    case when gp.user_id = nbq_uid() or game_host(gp.game_id, nbq_uid()) then gp.message end as message,
    case when gp.user_id = nbq_uid() or game_host(gp.game_id, nbq_uid()) then gp.eta_min end as eta_min,
    case when gp.user_id = nbq_uid() or game_host(gp.game_id, nbq_uid()) then gp.decline_reason end as decline_reason,
    case when gp.user_id = nbq_uid() or game_host(gp.game_id, nbq_uid()) then gp.decline_note end as decline_note,
    case when gp.user_id = nbq_uid() then gp.change_ack::text end as change_ack
  from game_participants gp where gp.game_id = any($1::uuid[]) order by gp.created_at`;

// 匿名浏览：没有「我」，所以不走行级权限，改成在这里写死两条——只给公开的（visibility = public）、不是女生局的（女生局只给已注册的女生看）
const anonGames = (d, where, params, tail) => d.db.asService(async q => (await q(`select ${GAME_COLS} from game_cards g join games gg on gg.id = g.id where g.visibility = 'public' and not coalesce('women' = any(g.tags), false) and ${where} ${tail}`, params)).rows);

// ---- 登录交接（11-14）：Safari 登录 → 添加到主屏幕 → 从桌面图标打开不用再登录（设计见 schema.sql「登录交接」）----
const sha256 = async s => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map(b => b.toString(16).padStart(2, '0')).join('');
const rnd = n => { let s = ''; for (const b of crypto.getRandomValues(new Uint8Array(n))) s += String.fromCharCode(b); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') };   // n 字节随机数，网址安全写法
const HO_CODE = /^[A-Za-z0-9_-]{40,64}$/, HO_TTL = 3600;
const hoTokens = async (d, who, refresh) => ({ access_token: await d.session.sign({ sub: who.auth_id, phone: who.phone }, HO_TTL), refresh_token: refresh, expires_in: HO_TTL, user: { id: who.auth_id, phone: who.phone } });
const hoOff = () => send(404, { error: 'handoff_unavailable' });   // 没配签名密钥 = 不启用，前台安静跳过

const ROUTES = {
  // 已登录的页面要一个一次性交接码（明文只在这次响应里出现一次，库里只存 sha256；24 小时内有效，每人每天 5 个）
  'POST /api/session/handoff': (req, d, p) => !d.session ? hoOff() : act(req, d, p, async q => {
    const code = rnd(32); return { code, expires_at: (await one(q, 'select api_handoff_new($1) as e', [await sha256(code)])).e } }, { body: false }),
  // 退出前作废自己还没用掉的码（不然退出后 24 小时内，之前写进桌面图标的码还能换出登录）。没启用时也返回 200：前台不用区分
  'POST /api/session/handoff/revoke': (req, d, p) => !d.session ? send(200, { ok: true, revoked: 0 }) : act(req, d, p, async q => ({ ok: true, revoked: (await one(q, 'select api_handoff_revoke() as n')).n }), { body: false }),
  // 用码换登录（不用登录）：码对、没用过、没过期 → 作废这个码，签一份新的登录；其余一律 401，不说明是哪种不对
  'POST /api/session/redeem': async (req, d) => { if (!d.session) return hoOff();
    const r = await readBody(req); if (r.err) return r.err; const code = str(r.body.code);
    if (!code || !HO_CODE.test(code)) return send(401, { error: 'handoff_invalid' });
    const ip = req.headers.get('cf-connecting-ip') || (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || null;   // 同一 IP 每小时 30 次（数据库里判，超了 429 rate_limited）
    const refresh = rnd(32), who = await d.db.asService(async q => (await q('select session_handoff_redeem($1, $2, $3) as r', [await sha256(code), await sha256(refresh), ip])).rows[0].r);
    return who ? send(200, await hoTokens(d, who, refresh)) : send(401, { error: 'handoff_invalid' }) },
  // 续期：凭证还在、账号没被封 → 新令牌（凭证不变）；否则 401，前台清掉这份登录
  'POST /api/session/refresh': async (req, d) => { if (!d.session) return hoOff();
    const r = await readBody(req); if (r.err) return r.err; const rt = str(r.body.refresh_token);
    if (!rt || !HO_CODE.test(rt)) return send(401, { error: 'session_revoked' });
    const who = await d.db.asService(async q => (await q('select session_refresh($1) as r', [await sha256(rt)])).rows[0].r);
    return who ? send(200, await hoTokens(d, who, rt)) : send(401, { error: 'session_revoked' }) },
  'POST /api/session/logout': async (req, d) => { const r = await readBody(req); if (r.err) return r.err; const rt = str(r.body.refresh_token);
    if (rt && HO_CODE.test(rt)) await d.db.asService(async q => { await q('select session_logout($1)', [await sha256(rt)]) });
    return send(200, { ok: true }) },
  // 带交接码的安装配置：和站点的 manifest.webmanifest 一样，只是启动网址多一个 h=码（iPhone 添加到主屏幕时把启动网址记进桌面图标）。不查库，只看码的格式
  'GET /api/manifest': async (req, d) => { const h = new URL(req.url).searchParams.get('h') || '';
    if (!d.asset || !HO_CODE.test(h)) return send(404, { error: 'not_found' });
    let m; try { const r = await d.asset('/manifest.webmanifest'); if (!r.ok) throw 0; m = await r.json() } catch (_) { return send(404, { error: 'not_found' }) }
    const u = new URL(m.start_url || '/', 'https://x.invalid'); u.searchParams.set('h', h); m.start_url = u.pathname + u.search + u.hash;
    return new Response(JSON.stringify(m), { status: 200, headers: { 'Content-Type': 'application/manifest+json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } }) },
  'GET /api/health': async (req, d) => {
    const out = { ok: true, db: null };
    if (new URL(req.url).searchParams.get('db') === '1') {
      try { await d.db.asService(q => q('select 1')); out.db = true } catch (e) { out.db = false; out.ok = false; out.why = why(e) }
    }
    return send(out.ok ? 200 : 503, out);
  },
  // 线上跑的发送程序是哪一版：部署时写进 Worker 的代码指纹，Worker 每分钟写进心跳表。和仓库里 `node tools/worker_version.mjs` 对得上 = 已是最新
  'GET /api/version': async (req, d) => {
    const rows = await d.db.asService(async q => (await q(`select name, at, round(extract(epoch from now() - at))::int as age_s from ops_heartbeats where name = 'sender' or name like 'sender@%' order by at desc limit 5`)).rows);
    const hb = rows.find(r => r.name === 'sender'), v = rows.find(r => r.name.startsWith('sender@'));
    // 数据库执行到哪一版迁移（schema_migrations 里最大的版本）；表还没建（旧库）→ null
    let schema = null; try { schema = await d.db.asService(async q => { const r = (await q(`select max(version) as latest, coalesce(array_agg(version order by version), '{}') as versions from schema_migrations`)).rows[0]; return { latest: r.latest, versions: r.versions } }) } catch (_) { }
    return send(200, { sender: { version: v ? v.name.slice(7) : null, at: v ? v.at : null, heartbeat_age_s: hb ? hb.age_s : null }, schema }, { 'Cache-Control': 'no-store' });
  },
  // 运行时开关（#49）：暂停注册 / 维护页 / 停发短信；没登录也能读，不缓存；前台读不到时按「全关」处理
  'GET /api/switches': async (req, d) => send(200, { switches: await switchesOf(d, true) }, { 'Cache-Control': 'no-store' }),
  // 页面报错上报（11-03 补：前台和数据库早就有，唯独这个路由漏了，报的错一直被丢）。sendBeacon 发来，不带令牌；
  // 只收 build / device / msg / src / line 五个字段，逐个截断；同一个 IP 每分钟最多 30 条（超了静默丢，不报错）；任何情况都返回 204，不让页面因为上报失败再出错。
  'POST /api/client-errors': async (req, d) => {
    const ip = req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for') || 'x', now = Date.now();
    const h = CE_HITS.get(ip); if (!h || now - h.t > 60000) CE_HITS.set(ip, { t: now, n: 1 }); else h.n++;
    if (CE_HITS.size > 5000) CE_HITS.clear();
    if (CE_HITS.get(ip).n > 30) return new Response(null, { status: 204 });
    let b; try { const t = await req.text(); if (t.length > 2048) return new Response(null, { status: 204 }); b = JSON.parse(t) } catch (_) { return new Response(null, { status: 204 }) }
    if (!b || typeof b !== 'object' || typeof b.msg !== 'string' || !b.msg) return new Response(null, { status: 204 });
    const build = ['pwa', 'web', 'admin'].includes(b.build) ? b.build : 'web', device = ['mobile', 'desktop'].includes(b.device) ? b.device : '';
    const src = typeof b.src === 'string' ? b.src.slice(0, 80) : '', line = Number.isInteger(b.line) && b.line >= 0 && b.line < 1e7 ? b.line : 0;
    try { await d.db.asService(async q => { await q('select client_error_log($1,$2,$3,$4,$5)', [build, device, b.msg.slice(0, 200), src, line]) }) } catch (_) { }
    return new Response(null, { status: 204 });
  },
  // 还没开放的城市「开放时通知我」（11-13 补：前台和数据库函数早就有，路由漏了，一直 404）。不用登录；以 nbq_service 调 api_city_waitlist，
  //   城市是否未开放、邮箱格式、同一 IP 每小时 5 次（429 rate_limited）、同一邮箱只记一次（added=false）都由数据库判断；这里只挡明显不合格式的参数
  'POST /api/city-waitlist': async (req, d) => {
    const r = await readBody(req); if (r.err) return r.err;
    const city = str(r.body.city), email = str(r.body.email)?.trim();
    if (!city || !/^[a-z]{2,12}$/.test(city)) return send(422, { error: 'invalid', detail: 'city' });
    if (!email || email.length > 200 || !/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(email)) return send(422, { error: 'invalid', detail: 'email' });
    const ip = req.headers.get('cf-connecting-ip') || (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || null;
    const added = await d.db.asService(async q => (await q('select api_city_waitlist($1, $2, $3) as v', [city, email, ip])).rows[0].v);
    return send(200, { ok: true, added });
  },
  'GET /api/me': async (req, d) => {
    const w = await whoIs(req, d); if (w.err) return w.err;
    if (!w.uid) return send(200, { registered: false });
    const user = await d.db.asUser(w.uid, async q => (await q(`select ${ME_SEL} from users where id = nbq_uid()`)).rows[0] || null);
    return send(200, user ? { registered: true, user } : { registered: false });
  },
  // ---- 第 2 步：只读接口（球场 / 球局 / 球友公开资料）----
  // 球场是公共参考数据，没登录也能看（场边页本来就允许未登录浏览）
  'GET /api/venues': async (req, d) => {
    const rows = await d.db.asService(async q => (await q(`select id, name, short_name, suburb, surfaces, courts, lights, indoor, booking_url,
      round(st_y(location::geometry)::numeric, 5)::float8 as lat, round(st_x(location::geometry)::numeric, 5)::float8 as lng from venues where status = 'active' order by name`)).rows);   // 缺区 / 待审核 / 下线的球场不对外
    return send(200, { venues: rows }, { 'Cache-Control': 'public, max-age=300' });
  },
  // 球局列表：还没开打、或开打不到 30 分钟（仍可申请，11-04）的公开球局；可见性由数据库的 api_game_cards（game_visible）决定，这里不再判断
  // 没登录（请求里没有 Authorization）也能看：只给公开的、非女生局的球局（匿名浏览，10-30 定）；令牌坏了仍是 401
  'GET /api/games': async (req, d) => {
    if (!req.headers.get('Authorization')) return send(200, { games: await anonGames(d, `g.status in ('open','full') and g.starts_at + interval '30 minutes' > now()`, [], 'order by g.starts_at limit 100'), anon: true });
    const w = await whoIs(req, d); if (w.err) return w.err; if (!w.uid) return send(403, { error: 'not_registered' });
    const rows = await d.db.asUser(w.uid, async q => (await q(`select ${GAME_COLS} from ${GAME_FROM} where g.status in ('open','full') and g.starts_at + interval '30 minutes' > now() order by g.starts_at limit 100`)).rows);
    return send(200, { games: rows });
  },
  // 单个球局（分享码），打开分享链接用；没登录也能看公开的
  'GET /api/game': async (req, d) => {
    const code = new URL(req.url).searchParams.get('code') || ''; if (!/^[A-Za-z0-9]{3,16}$/.test(code)) return send(400, { error: 'bad_code' });
    if (!req.headers.get('Authorization')) { const g = (await anonGames(d, 'g.share_code = $1', [code], 'limit 1'))[0]; return g ? send(200, { game: g, anon: true }) : send(404, { error: 'not_found' }) }
    const w = await whoIs(req, d); if (w.err) return w.err; if (!w.uid) return send(403, { error: 'not_registered' });
    const g = await d.db.asUser(w.uid, async q => (await q(`select ${GAME_COLS} from ${GAME_FROM} where g.share_code = $1`, [code])).rows[0] || null);
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
    return { id, share_code: (await one(q, 'select share_code from games where id = $1', [id])).share_code } }, { idem: 'POST /api/games' }),
  'PATCH /api/games/:id': (req, d, p) => act(req, d, p, async (q, b, x) => ({ changes: (await one(q, 'select api_game_edit($1, $2::jsonb) as r', [x.id, JSON.stringify(b)])).r }), { ids: ['id'] }),
  'POST /api/games/:id/postpone': (req, d, p) => act(req, d, p, async (q, b, x) => ({ starts_at: (await one(q, 'select api_game_postpone($1) as t', [x.id])).t }), { ids: ['id'], body: false }),
  'POST /api/games/:id/cancel': (req, d, p) => act(req, d, p, async (q, b, x) => { await q('select api_game_cancel($1)', [x.id]); return { ok: true } }, { ids: ['id'], body: false }),
  'POST /api/games/:id/requests': (req, d, p) => act(req, d, p, async (q, b, x) => {
    if (b.message != null && typeof b.message !== 'string') throw Object.assign(new Error('invalid'), { code: '22023' });
    if (b.eta != null && !Number.isInteger(b.eta)) throw Object.assign(new Error('invalid'), { code: '22023' });   // 预计几分钟到（开打后才申请的人选）
    return { status: (await one(q, 'select api_apply($1, $2, $3) as s', [x.id, b.message ?? null, b.eta ?? null])).s } }, { ids: ['id'] }),
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
  'POST /api/threads/:id/messages': (req, d, p) => act(req, d, p, async (q, b, x) => ({ id: Number((await one(q, 'select api_message_send($1, $2) as m', [x.id, str(b.body)])).m) }), { ids: ['id'], idem: 'POST /api/threads/:id/messages' }),
  'POST /api/reports': (req, d, p) => act(req, d, p, async (q, b) => {
    const tt = str(b.target_type), tid = str(b.target_id), why = str(b.reason), via = str(b.via), note = str(b.note);
    const sb = tt === 'sb_post' || tt === 'sb_reply';
    if (!['user', 'game', 'sb_post', 'sb_reply'].includes(tt) || !(tt === 'sb_reply' ? /^\d{1,15}$/ : UUID).test(tid || '')) throw bad();
    if (why === 'other' && !sb && !(note || '').trim()) throw Object.assign(new Error('report_note_required'), { code: 'P0001' });
    await q(`insert into reports(reporter_id, target_type, target_id, reason, note, source, via, context_ref) values (nbq_uid(), $1, $2, $3, $4, 'in_app', $5, $6)`, [tt, tid, why, note || null, via, str(b.context_ref)]);
    return { ok: true } }),
  // 我举报过谁（11-05）：只返回处理中（open）的、只有自己的（RLS rp_mine）；前台刷新 / 换设备后据此认出「已举报」，不返回说明和举报人
  'GET /api/reports/mine': (req, d, p) => act(req, d, p, async q => ({
    reports: (await q(`select target_type, target_id, reason, created_at from reports where reporter_id = nbq_uid() and status = 'open' order by created_at desc limit 200`)).rows }), { body: false }),
  'POST /api/blocks': (req, d, p) => act(req, d, p, async (q, b) => { if (!UUID.test(str(b.user_id) || '')) throw bad(); await q('select api_block($1)', [b.user_id]); return { ok: true } }),
  // 我屏蔽的人（屏蔽名单；11-04 第 6 轮）：只返回我屏蔽的，不返回谁屏蔽了我
  'GET /api/blocks': (req, d, p) => act(req, d, p, async q => {
    const blocks = (await q('select blocked_id as user_id, created_at from blocks where blocker_id = nbq_uid() order by created_at desc limit 200')).rows;
    return { blocks, profiles: await cardsOf(q, blocks.map(b => b.user_id)) } }, { body: false }),
  'DELETE /api/blocks/:id': (req, d, p) => act(req, d, p, async (q, b, x) => { await q('select api_unblock($1)', [x.id]); return { ok: true } }, { ids: ['id'], body: false }),
  // 球友（#110 PR-A）：当面扫码 → 申请 → 对方确认 / 忽略；规则全在 api_buddy_* 里（pg/buddies 测），被忽略的申请对发起人仍显示为等待
  'GET /api/buddies': (req, d, p) => act(req, d, p, async q => { const v = (await one(q, 'select api_buddies() as v')).v;   // 带上相关的人的球员卡（和 /api/invites 一样），前台画头像和名字
    return { ...v, profiles: await cardsOf(q, [...v.buddies.map(x => x.user_id), ...v.incoming.map(x => x.from_user), ...v.outgoing.map(x => x.to_user)]) } }, { body: false }),
  'POST /api/buddies/requests': (req, d, p) => act(req, d, p, async (q, b) => { if (!UUID.test(str(b.to_user) || '')) throw bad(); return (await one(q, 'select api_buddy_request($1, $2) as v', [b.to_user, str(b.source)])).v }),
  'POST /api/buddies/requests/:id/accept': (req, d, p) => act(req, d, p, async (q, b, x) => ({ status: (await one(q, "select api_buddy_respond($1, 'accept') as s", [x.id])).s }), { ids: ['id'], body: false }),
  'POST /api/buddies/requests/:id/ignore': (req, d, p) => act(req, d, p, async (q, b, x) => ({ status: (await one(q, "select api_buddy_respond($1, 'ignore') as s", [x.id])).s }), { ids: ['id'], body: false }),
  'DELETE /api/buddies/:id': (req, d, p) => act(req, d, p, async (q, b, x) => { await q('select api_buddy_remove($1)', [x.id]); return { ok: true } }, { ids: ['id'], body: false }),
  // 赛后读回（11-04 第 6 轮 6d）：我的多遇到 / 少遇到、近 7 天的赛后感受、我给的印象、我的没到场反馈、我的申诉。全部是我自己的数据（RLS）
  'GET /api/me/after': (req, d, p) => act(req, d, p, async q => {
    const prefs = (await q(`select target_id, pref, game_id, updated_at from player_prefs where user_id = nbq_uid() order by updated_at desc limit 500`)).rows;
    const feels = (await q(`select f.game_id, f.feel, f.closed_at from game_feel f join games g on g.id = f.game_id
                            where f.user_id = nbq_uid() and g.starts_at + make_interval(mins => g.duration_min) > now() - interval '8 days' order by f.game_id limit 200`)).rows;
    const impressions = (await q(`select i.game_id, i.to_id, i.kinds::text[] as kinds from impressions i join games g on g.id = i.game_id
                                  where i.from_id = nbq_uid() and g.starts_at > now() - interval '15 days' limit 500`)).rows;
    const noshows = (await q(`select n.game_id, n.target_id from noshow_reports n join games g on g.id = n.game_id
                              where n.reporter_id = nbq_uid() and g.starts_at > now() - interval '15 days' limit 200`)).rows;
    const appeals = (await q(`select game_id, reason, status, created_at from noshow_appeals where user_id = nbq_uid() order by created_at desc limit 50`)).rows;
    return { prefs, feels, impressions, noshows, appeals } }, { body: false }),
  'GET /api/notifications': async (req, d) => {
    const w = await whoIs(req, d); if (w.err) return send(401, { error: 'login_required' }); if (!w.uid) return send(401, { error: 'login_required' });
    const rows = await d.db.asUser(w.uid, async q => (await q(`select id::float8 as id, kind, game_id, invite_id, actor_id, read_at, created_at from notifications where user_id = nbq_uid() order by created_at desc limit 100`)).rows);
    return send(200, { notifications: rows }) },
  // 推送自检：本人设备订阅状态 + 最近提醒的去向（11-03）。用 POST 是为了把本机的推送地址放进请求体、不进网址；只读
  'POST /api/me/push-diag': (req, d, p) => act(req, d, p, async (q, b) => {
    const ep = typeof b.endpoint === 'string' && b.endpoint.length <= 1000 ? b.endpoint : null;
    return (await one(q, 'select my_push_diag($1) as r', [ep])).r }),
  'POST /api/notifications/read': (req, d, p) => act(req, d, p, async (q, b) => {
    const ids = b.all === true ? null : Array.isArray(b.ids) && b.ids.length <= 200 && b.ids.every(n => Number.isInteger(n) && n > 0) ? b.ids : (() => { throw bad() })();
    return { read: (await one(q, 'select api_notif_read($1::bigint[]) as n', [ids])).n } }),
  // ---- 前台接入第 5 轮：埋点上报（POST /api/events）----
  // 前台每 10 秒攒批发来（sendBeacon 不能带请求头；已登录时前台改用 fetch 带令牌）。令牌有效才记 user_id，且只记「前台自称的 uid = 令牌对应的人」那几条；
  // 令牌坏了 / 没带 = 匿名记录（埋点不因登录问题丢）。只收字典里 source=client 且 active 的事件名；字段逐个检查，不合格的整条丢弃，从不返回错误细节。
  'POST /api/events': async (req, d) => {
    const t = await req.text(); if (t.length > 98304) return send(413, { error: 'too_large' });
    let b; try { b = JSON.parse(t) } catch (_) { return send(400, { error: 'bad_json' }) }
    const list = b && Array.isArray(b.events) ? b.events.slice(0, 100) : null; if (!list) return send(400, { error: 'bad_json' });
    let uid = null;
    if (req.headers.get('Authorization')) { const w = await whoIs(req, d); if (!w.err) uid = w.uid || null }
    const now = Date.now(), tok = /^[A-Za-z0-9_-]{4,64}$/, lab = v => typeof v === 'string' && /^[a-z0-9_]{1,24}$/.test(v) ? v : null;
    const rows = [];
    for (const e of list) {
      if (!e || typeof e !== 'object') continue;
      if (typeof e.ev !== 'string' || !/^[a-z][a-z0-9_]{1,47}$/.test(e.ev) || !tok.test(e.anon || '') || !tok.test(e.sid || '')) continue;
      if (e.build !== 'pwa' && e.build !== 'web') continue;
      let at = typeof e.at === 'string' ? Date.parse(e.at) : NaN; if (!(at > now - 48 * 3600e3 && at < now + 600e3)) at = now;
      let props = e.props && typeof e.props === 'object' && !Array.isArray(e.props) ? e.props : {}; if (JSON.stringify(props).length > 2000) props = {};
      const id = k => typeof props[k] === 'string' && UUID.test(props[k]) ? props[k] : null;
      rows.push({ at: new Date(at).toISOString(), user_id: uid && e.uid === uid ? uid : null, anon: e.anon, sid: e.sid, build: e.build, device: e.device === 'mobile' || e.device === 'desktop' ? e.device : null,
        event: e.ev, scr: typeof e.scr === 'string' && e.scr.length <= 40 ? e.scr : null, game_id: id('game_id'), venue_id: id('venue_id'), env: lab(e.env), os: lab(e.os), city: lab(e.city), props });
    }
    if (!rows.length) return send(200, { ok: true, n: 0 });
    const n = await d.db.asService(async q => {
      if (uid && (await q('select analytics_opt_out from users where id = $1', [uid])).rows[0]?.analytics_opt_out) return 0;     // 「使用数据」关了：服务端也不记（数据库触发器是第二道）
      const ok = new Set((await q(`select event from event_definitions where source = 'client' and status = 'active'`)).rows.map(r => r.event));
      const use = rows.filter(r => ok.has(r.event)); if (!use.length) return 0;
      const ses = new Map();
      for (const r of use) { const s = ses.get(r.sid) || { sid: r.sid, anon: r.anon, user_id: null, build: r.build, device: r.device, env: r.env, city: r.city, at: r.at, n: 0, landing: null, referrer: null, utm_source: null, utm_medium: null, utm_campaign: null, standalone: null };
        s.n++; if (r.user_id) s.user_id = r.user_id; if (r.at < s.at) s.at = r.at;
        if (r.event === 'session_start') { const p = r.props, tx = (v, m) => typeof v === 'string' ? v.slice(0, m) : null; s.landing = tx(p.landing, 200); s.referrer = tx(p.ref, 100); s.utm_source = tx(p.utm_source, 60); s.utm_medium = tx(p.utm_medium, 60); s.utm_campaign = tx(p.utm_campaign, 60); s.standalone = typeof p.standalone === 'boolean' ? p.standalone : null }
        ses.set(r.sid, s) }
      const ins = await q(`insert into events(occurred_at, user_id, anon_id, session_id, build, event, screen, game_id, venue_id, device, props, env, os, city)
        select x.at, x.user_id, x.anon, x.sid, x.build, x.event, x.scr, x.game_id, x.venue_id, x.device, x.props, x.env, x.os, coalesce((select key from cities where key = x.city), 'melb')
        from jsonb_to_recordset($1::jsonb) as x(at timestamptz, user_id uuid, anon text, sid text, build text, event text, scr text, game_id uuid, venue_id uuid, device text, props jsonb, env text, os text, city text)`, [JSON.stringify(use)]);
      await q(`insert into sessions(session_id, anon_id, user_id, build, device, env, city, started_at, last_event_at, landing, referrer, utm_source, utm_medium, utm_campaign, standalone, events_n)
        select x.sid, x.anon, x.user_id, x.build, x.device, x.env, coalesce((select key from cities where key = x.city), 'melb'), x.at, now(), x.landing, x.referrer, x.utm_source, x.utm_medium, x.utm_campaign, x.standalone, x.n
        from jsonb_to_recordset($1::jsonb) as x(sid text, anon text, user_id uuid, build text, device text, env text, city text, at timestamptz, landing text, referrer text, utm_source text, utm_medium text, utm_campaign text, standalone boolean, n int)
        where x.user_id is null or not exists (select 1 from users u where u.id = x.user_id and u.analytics_opt_out)
        on conflict (session_id) do update set last_event_at = now(), events_n = sessions.events_n + excluded.events_n, user_id = coalesce(sessions.user_id, excluded.user_id),
          landing = coalesce(sessions.landing, excluded.landing), referrer = coalesce(sessions.referrer, excluded.referrer), utm_source = coalesce(sessions.utm_source, excluded.utm_source),
          utm_medium = coalesce(sessions.utm_medium, excluded.utm_medium), utm_campaign = coalesce(sessions.utm_campaign, excluded.utm_campaign), standalone = coalesce(sessions.standalone, excluded.standalone)`, [JSON.stringify([...ses.values()])]);
      // 设备匿名 ID ↔ 账号：收到本人的 login_success 才关联（多对多，不合并账号）
      const lk = use.filter(r => r.event === 'login_success' && r.user_id);
      if (lk.length) await q(`insert into identity_links(anon_id, user_id) select distinct x.anon, x.user_id from jsonb_to_recordset($1::jsonb) as x(anon text, user_id uuid) on conflict do nothing`, [JSON.stringify(lk)]);
      return ins.rowCount;
    });
    return send(200, { ok: true, n });
  },
  // ---- 第 3 步（续 2）：我的资料、球场/区、聊天记录 ----
  // 只放行资料类的列（和 schema 里 grant update 一致）；其余列 → 403 forbidden；昵称规则、改名频率、性别只能改一次等由数据库触发器判断
  'PATCH /api/me': (req, d, p) => act(req, d, p, async (q, b) => {
    const keys = Object.keys(b); if (!keys.length) throw bad();
    if (keys.some(k => !ME_EDITABLE.has(k))) throw Object.assign(new Error('forbidden'), { code: 'P0001' });
    const vals = keys.map(k => b[k] !== null && typeof b[k] === 'object' ? JSON.stringify(b[k]) : b[k]);
    const r = await q(`update users set ${keys.map((k, i) => `${k} = $${i + 1}`).join(', ')} where id = nbq_uid() returning ${ME_COLS}`, vals);
    if (!r.rows[0]) throw Object.assign(new Error('not_found'), { code: 'P0001' });
    return { user: r.rows[0] } }),
  'GET /api/me/badges': (req, d, p) => act(req, d, p, async q => ({ badges: (await q('select code, earned_at, seen_at from user_badges where user_id = nbq_uid() order by earned_at')).rows }), { body: false }),
  'POST /api/me/badges': (req, d, p) => act(req, d, p, async (q, b) => {
    const c = b.codes; if (!Array.isArray(c) || c.length > 20 || !c.every(x => typeof x === 'string' && x.length <= 20)) throw bad();
    await q('select api_badges_claim($1::text[])', [c]); return { ok: true } }),
  'POST /api/me/badges/seen': (req, d, p) => act(req, d, p, async (q, b) => {
    if (typeof b.code !== 'string' || b.code.length > 20) throw bad();
    await q('select api_badge_seen($1)', [b.code]); return { ok: true } }),
  // 我的球拍（#60）：读自己的（RLS）；整组替换只走 api_set_rackets（清洗 / 长度 / 链接 / @ / 连续数字 / 重复都在数据库里判，detail 指出哪项）
  'GET /api/me/rackets': (req, d, p) => act(req, d, p, async q => ({ rackets: (await q('select slot, brand, series, catalog_id from user_rackets where user_id = nbq_uid() order by slot')).rows }), { body: false }),
  // 球拍产品库（选择列表）：不用登录，只给可选的（active）；改动不频繁，缓存 1 小时
  'GET /api/rackets/catalog': async (req, d) => {
    const rows = await d.db.asService(async q => (await q(`select id, brand, series from racket_catalog where status = 'active' order by sort, brand, series`)).rows);
    return send(200, { catalog: rows }, { 'Cache-Control': 'public, max-age=3600' });
  },
  'PUT /api/me/rackets': (req, d, p) => act(req, d, p, async (q, b) => {
    const r = b.rackets; if (!Array.isArray(r) || r.length > 3 || !r.every(x => x && typeof x === 'object' && !Array.isArray(x) && (UUID.test(str(x.catalog_id) || '') || ((x.brand == null || typeof x.brand === 'string') && typeof x.series === 'string')))) throw bad();
    const list = r.map(x => UUID.test(str(x.catalog_id) || '') ? { catalog_id: x.catalog_id } : { brand: x.brand ?? null, series: x.series });   // 选自产品库只转 id；自由文字只转品牌 + 系列
    return { rackets: (await one(q, 'select api_set_rackets($1::jsonb) as v', [JSON.stringify(list)])).v } }),
  // 我的 UTR（#101）：正式 / 自评；写入只走 api_set_utr（校验、频率、历史都在库里），PATCH /api/me 不再放行 utr
  'GET /api/me/utr': (req, d, p) => act(req, d, p, async q => ({ utr: (await one(q, 'select api_my_utr() as v')).v }), { body: false }),
  'PUT /api/me/utr': (req, d, p) => act(req, d, p, async (q, b) => {
    if (typeof b.utr !== 'number' || typeof b.estimated !== 'boolean' || ('profile' in b && b.profile !== null && typeof b.profile !== 'string')) throw bad();
    const body = { utr: b.utr, estimated: b.estimated }; if ('profile' in b) body.profile = b.profile;   // 只转发这三个字段
    return { utr: (await one(q, 'select api_set_utr($1::jsonb) as v', [JSON.stringify(body)])).v } }),
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
             lm.body as last_body, lm.created_at as last_at, lm.sender_id as last_sender, coalesce(lm.sender_id <> nbq_uid() and (tr.last_read_at is null or lm.created_at > tr.last_read_at), false) as unread
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
    await q(`insert into thread_reads(thread_id, user_id, last_read_at) values ($1, nbq_uid(), now()) on conflict (thread_id, user_id) do update set last_read_at = now()`, [x.id]);
    await q('select api_chat_notif_read($1)', [x.id]);   // 这个会话的新消息通知一起标已读（推送前发现已读就不推）
    return { ok: true } }, { ids: ['id'], body: false }),
  // ---- 第 3 步（续 3）：场边、账号注销 / 恢复、推送订阅（对应 api_spec §14、§2、§3）----
  'POST /api/sideline/posts': (req, d, p) => act(req, d, p, async (q, b) => (await one(q, 'select api_sb_post($1::jsonb) as r', [JSON.stringify(b)])).r, { idem: 'POST /api/sideline/posts' }),
  'DELETE /api/sideline/posts/:id': (req, d, p) => act(req, d, p, async (q, b, x) => { await q('select api_sb_delete($1)', [x.id]); return { ok: true } }, { ids: ['id'], body: false }),
  'PATCH /api/sideline/posts/:id': (req, d, p) => act(req, d, p, async (q, b, x) => {
    if (typeof b.replies_open !== 'boolean') throw bad(); await q('select api_sb_replies_open($1, $2)', [x.id, b.replies_open]); return { replies_open: b.replies_open } }, { ids: ['id'] }),
  'POST /api/sideline/posts/:id/replies': (req, d, p) => act(req, d, p, async (q, b, x) => {
    if (b.to != null && !UUID.test(str(b.to) || '')) throw bad();
    return { id: Number((await one(q, 'select api_sb_reply($1, $2, $3) as r', [x.id, str(b.body), b.to ?? null])).r) } }, { ids: ['id'], idem: 'POST /api/sideline/posts/:id/replies' }),
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
  // 推送的公钥（VAPID_PUBLIC，本来就是公开的）：前台订阅推送时要用；没配 = 404，前台安静跳过。不需要登录
  'GET /api/push/key': async (req, d) => d.vapid ? send(200, { key: d.vapid }, { 'Cache-Control': 'public, max-age=3600' }) : send(404, { error: 'push_unavailable' }),
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
  // ---- 第 2 轮（前台接入）：我的球局 / 邀约 / 球友卡片 ----
  // 我发起的、我申请过的、我参加的球局（近 60 天起，含已取消 / 已结束），连同这些球局里我看得到的参与记录和相关球友卡片
  'GET /api/games/mine': (req, d, p) => act(req, d, p, async q => {
    const games = (await q(`select ${GAME_COLS} from ${GAME_FROM} where (g.host_id = nbq_uid() or exists (select 1 from game_participants x where x.game_id = g.id and x.user_id = nbq_uid()))
      and g.starts_at > now() - interval '60 days' order by g.starts_at desc limit 200`)).rows;
    const ids = games.map(g => g.id), participants = ids.length ? (await q(PART_SQL, [ids])).rows : [];
    const profiles = await cardsOf(q, [...games.map(g => g.host_id), ...participants.map(x => x.user_id)]);
    return { games, participants, profiles } }, { body: false }),
  'GET /api/invites': (req, d, p) => act(req, d, p, async q => {
    const invites = (await q(`select id, from_user, to_user, starts_at, ends_at, venue_id, venue_name, game_type, note, status::text as status, counter_starts_at, counter_ends_at,
        counter_venue_id, counter_venue_name, countered_at, game_id, created_at, expires_at, responded_at, decline_reason, decline_note from invites
      where status in ('pending','counter') or created_at > now() - interval '30 days' order by created_at desc limit 100`)).rows;
    return { invites, profiles: await cardsOf(q, invites.flatMap(i => [i.from_user, i.to_user])) } }, { body: false }),
  'GET /api/profiles': (req, d, p) => act(req, d, p, async q => {
    const ids = (new URL(req.url).searchParams.get('ids') || '').split(',').filter(Boolean);
    if (!ids.length || ids.length > 50 || !ids.every(i => UUID.test(i))) throw bad();
    return { profiles: await cardsOf(q, ids) } }, { body: false }),
  // 扫码 / 链接落地（#110）：按球员编号取卡片；必须登录、限频（api_card_by_no），内容和 GET /api/players/:id 同一份
  'GET /api/players/no/:no': (req, d, p) => act(req, d, p, async (q, b, x) => {
    const id = (await one(q, 'select api_card_by_no($1) as id', [x.no])).id, c = (await cardsOf(q, [id]))[id];
    if (!c) throw Object.assign(new Error('not_found'), { code: 'P0001' }); return { player: c } }, { nums: ['no'], body: false }),
  'GET /api/players/:id': (req, d, p) => act(req, d, p, async (q, b, x) => {
    const c = (await cardsOf(q, [x.id]))[x.id]; if (!c) throw Object.assign(new Error('not_found'), { code: 'P0001' }); return { player: c } }, { ids: ['id'], body: false }),
  // 新号码第一次登录后建资料：手机号取自登录令牌里的 phone（不信请求里写的）；同一个号码重复提交 = 返回已有资料
  'POST /api/me/register': async (req, d) => {
    const w = await whoIs(req, d); if (w.err) return send(401, { error: 'login_required' });
    const r = await readBody(req); if (r.err) return r.err; const b = r.body;
    const phone = w.phone && '+' + w.phone.replace(/^\+/, ''); if (!/^\+614\d{8}$/.test(phone || '')) return send(422, { error: 'invalid', detail: 'phone' });
    const utr = Number(b.utr), nick = str(b.nickname), li = str(b.last_initial);
    if (w.uid) return send(200, { registered: true, user: await d.db.asUser(w.uid, async q => (await q(`select ${ME_SEL} from users where id = nbq_uid()`)).rows[0]) });
    if ((await switchesOf(d, true)).register_paused) return send(403, { error: 'register_paused' });   // 暂停注册（#49）：老号码重复提交上面已返回；只拦新建
    if (!nick || nick.length < 1 || nick.length > 20) return send(422, { error: 'invalid', detail: 'nickname' });
    if (!(utr >= 1 && utr <= 16.5)) return send(422, { error: 'invalid', detail: 'utr' });
    if (li !== null && !/^[A-Za-z]$/.test(li)) return send(422, { error: 'invalid', detail: 'last_initial' });
    if (b.adult !== true) return send(422, { error: 'adult_required' });
    const bad = await d.db.asService(async q => (await q('select nbq_nickname_problem($1) as why', [nick])).rows[0].why);   // 触发器只管前台身份（这里是服务身份插入），所以注册时显式查同一套昵称规则
    if (bad) return send(422, { error: 'nickname_not_allowed', detail: bad });
    let id;
    try { id = await d.db.asService(async q => (await q(`insert into users(auth_id, phone_e164, nickname, last_initial, utr, utr_estimated, avatar_kind, avatar_animal, avatar_color, card_theme)
        values ($1,$2,$3,$4,$5,$6,coalesce($7,'letter'),$8,coalesce($9,'paper'),coalesce($10,'court')) returning id`,
        [w.sub, phone, nick, li ? li.toUpperCase() : null, utr, b.utr_estimated === true, str(b.avatar_kind), str(b.avatar_animal), str(b.avatar_color), str(b.card_theme)])).rows[0].id) }
    catch (e) { if (e.code === '23505') { const ex = await d.db.asService(async q => (await q('select id from users where auth_id = $1', [w.sub])).rows[0]?.id); if (!ex) return send(409, { error: 'phone_taken' }); id = ex } else throw e }
    const user = await d.db.asUser(id, async q => { await q('select api_consent_accept(true)'); return (await q(`select ${ME_SEL} from users where id = nbq_uid()`)).rows[0] });
    return send(200, { registered: true, user });
  },
};

// 带 :参数 的路径：编译成正则，按声明顺序匹配（没有 :参数 的走上面的精确匹配）
const PATTERNS = Object.keys(ROUTES).filter(k => k.includes(':')).map(k => { const [m, pth] = k.split(' ');
  const names = []; const re = new RegExp('^' + pth.replace(/:([a-z]+)/g, (_, n) => { names.push(n); return '([^/]+)' }) + '$'); return { key: k, m, re, names } });
const matchPattern = (method, path) => { for (const t of PATTERNS) if (t.m === method) { const r = t.re.exec(path); if (r) return { h: ROUTES[t.key], params: Object.fromEntries(t.names.map((n, i) => [n, decodeURIComponent(r[i + 1])])), key: t.key } } return null };
const pathExists = path => Object.keys(ROUTES).some(k => k.endsWith(' ' + path)) || PATTERNS.some(t => t.re.test(path));

// 最低前端版本（ADR 0013，#63 第 3 件）：deps.minBuild = 环境变量 NBQ_MIN_BUILD（构建号或其前面的秒数），不设 = 不启用。
//   启用后，请求头 X-NBQ-Build 的秒数低于它、或没带 → 426 client_outdated，前台显示「有新版本 · 点一下刷新」。
//   不拦：健康检查 / 版本 / 页面报错上报（旧页面的报错也要收）/ 埋点（sendBeacon 带不了请求头）、Service Worker 自己续订推送（它不知道页面的构建号）。
const BUILD_FREE = new Set(['GET /api/manifest', 'POST /api/session/refresh', 'POST /api/session/logout', 'GET /api/health', 'HEAD /api/health', 'GET /api/version', 'POST /api/client-errors', 'POST /api/events', 'POST /api/push/subscriptions']);
const buildSec = v => { const m = String(v || '').match(/^(\d{9,12})(?:-|$)/); return m ? +m[1] : 0 };
export function outdated(key, header, minBuild) {
  const min = buildSec(minBuild); if (!min || BUILD_FREE.has(key)) return false;
  return buildSec(header) < min;
}
// 运行时开关（#49）：5 秒内存缓存，每个请求都读库太贵；读不到按全关处理（开关坏了不能把全站拦住）。fresh = true 跳过缓存（注册、前台读开关要看最新）
const SW = { at: 0, v: {} };
async function switchesOf(d, fresh) {
  const now = Date.now(); if (!fresh && now - SW.at < (d.switchesTtlMs ?? 5000)) return SW.v;
  try { SW.v = await d.db.asService(async q => (await q('select app_switches_get() as s')).rows[0].s) || {}; SW.at = now } catch (_) { SW.v = {}; SW.at = now }
  return SW.v;
}
// 维护页开着时放行：读开关本身、版本、页面报错上报（前台要靠它们知道在维护、排查要靠它们）
const MAINT_OK = new Set(['GET /api/manifest', 'GET /api/switches', 'GET /api/version', 'POST /api/client-errors']);

export async function handleApi(request, deps) {
  const path = new URL(request.url).pathname.replace(/\/+$/, '');
  const key = request.method + ' ' + path;
  if (outdated(key, request.headers.get('X-NBQ-Build'), deps && deps.minBuild)) return send(426, { error: 'client_outdated' });
  let h = ROUTES[key] || (request.method === 'HEAD' && ROUTES['GET ' + path]), params = {}, name = key;
  if (!h) { const m = matchPattern(request.method, path); if (m) { h = m.h; params = m.params; name = m.key } }
  if (!h) return pathExists(path) ? send(405, { error: 'method_not_allowed' }) : send(404, { error: 'not_found' });
  if (!MAINT_OK.has(key) && (await switchesOf(deps)).maintenance) return send(503, { error: 'maintenance' }, { 'Retry-After': '300', 'Cache-Control': 'no-store' });
  try { return await h(request, deps, params) }
  catch (e) { const r = dbError(e); if (r) return r; console.error('api_error', name, e && (e.code || e.name)); return send(503, { error: 'db_unavailable' }) }   // 细节不外露（数据库地址、报错原文）；排查看日志
}
