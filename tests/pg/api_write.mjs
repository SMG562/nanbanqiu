// 5g-3 第 3 步：写接口（球局 / 申请 / 同意…）经 HTTP 层走一遍；规则本身由 pg/api 测，这里测接线：令牌、路径参数、JSON、错误码 → 状态码、重试。
// （原头注释）5g-3 第 1 步：接口层（server/api）连真实数据库：令牌 → 球友 → 以 nbq_user 身份读自己；用真正的 nbq_api 账号登录；
//   没登录 / 令牌错 / 没注册 / 已注销、健康检查、数据库连不上不泄露细节、连接用完即还。
import fs from 'fs'; import { createRequire } from 'module'; import path from 'path'; import { fileURLToPath } from 'url';
import { startCluster, loadSchema } from './cluster.mjs';
const require = createRequire(import.meta.url); const pg = require('pg');
const HERE = path.dirname(fileURLToPath(import.meta.url)), DIR = process.env.NBQ_DIR || path.join(HERE, '..', '..');
const { handleApi } = await import(path.join(DIR, 'server/api/handler.mjs')), { makeVerifier } = await import(path.join(DIR, 'server/api/jwt.mjs')), { makeDb } = await import(path.join(DIR, 'server/api/db.mjs'));
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 500) : '')) };

const UUIDre = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const c = startCluster(); let admin;
try {
  c.createdb('nbq');
  const errs = loadSchema(c, 'nbq', path.join(DIR, 'schema.sql')); T('schema 执行无错误', !errs.length, errs.slice(0, 3));
  admin = new pg.Pool({ host: c.host, port: c.port, user: 'postgres', database: 'nbq', max: 2 });
  await admin.query(`create role nbq_api login in role nbq_user, nbq_service`);   // 和正式环境一致：API 用的账号只属于这两个角色

  const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const jwk = { ...(await crypto.subtle.exportKey('jwk', kp.publicKey)), alg: 'ES256', kid: 'k1' }, U = 'https://t.supabase.co', ISS = U + '/auth/v1';
  const b64 = x => Buffer.from(x).toString('base64url');
  const token = async (sub, extra = {}) => { const h = b64(JSON.stringify({ alg: 'ES256', kid: 'k1' })), p = b64(JSON.stringify({ iss: ISS, aud: 'authenticated', sub, exp: Math.floor(Date.now() / 1000) + 600, ...extra }));
    return h + '.' + p + '.' + b64(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, kp.privateKey, new TextEncoder().encode(h + '.' + p))) };
  const verify = makeVerifier({ url: U, fetch: async () => ({ ok: true, json: async () => ({ keys: [jwk] }) }) });
  const connect = () => async () => { const cl = new pg.Client({ host: c.host, port: c.port, user: 'nbq_api', database: 'nbq' }); await cl.connect(); return cl };
  const deps = { verify, db: makeDb(connect()) };
  const call = async (method, p, tok, body, d = deps) => { const init = { method, headers: tok ? { Authorization: 'Bearer ' + tok } : {} };
    if (body !== undefined) init.body = typeof body === 'string' ? body : JSON.stringify(body);
    const r = await handleApi(new Request('https://x.test' + p, init), d); let j = null; try { j = await r.clone().json() } catch (_) { } return { s: r.status, j, h: r.headers } };

  const AH = '11111111-aaaa-4aaa-8aaa-aaaaaaaaaaaa', AP = '22222222-bbbb-4bbb-8bbb-bbbbbbbbbbbb', AQ = '33333333-cccc-4ccc-8ccc-cccccccccccc', AN = '44444444-dddd-4ddd-8ddd-dddddddddddd';
  await admin.query(`insert into users(auth_id, phone_e164, nickname, utr, pact_accepted_at) values ($1,'+61400000001','发起人',6.0, now()), ($2,'+61400000002','球友P',6.0, now()), ($3,'+61400000003','球友Q',6.0, null)`, [AH, AP, AQ]);
  const uid = async a => (await admin.query('select id from users where auth_id = $1', [a])).rows[0].id; const H = await uid(AH), P = await uid(AP), Q = await uid(AQ);
  const V = (await admin.query(`insert into venues(name, short_name, suburb, location) values ('Glen Iris Tennis Club','Glen Iris','Glen Iris', st_makepoint(145.05, -37.86)::geography) returning id`)).rows[0].id;
  const slot = async (off, hm) => (await admin.query(`select ((mel_today() + $1::int)::timestamp + $2::time) at time zone 'Australia/Melbourne' as t`, [off, hm])).rows[0].t.toISOString();
  const tH = await token(AH), tP = await token(AP), tQ = await token(AQ), tN = await token(AN);
  const NG = async (extra = {}) => ({ venue_id: V, starts_at: await slot(2, '18:00'), duration_min: 90, game_type: 'singles', utr_min: 4, utr_max: 8, ...extra });

  // 登录 / 参数
  let r = await call('POST', '/api/games', null, await NG()); T('发局：没登录 → 401 login_required', r.s === 401 && r.j.error === 'login_required', r);
  r = await call('POST', '/api/games', 'garbage', await NG()); T('发局：乱写的令牌 → 401 login_required', r.s === 401 && r.j.error === 'login_required');
  r = await call('POST', '/api/games', tN, await NG()); T('发局：令牌有效但没注册 → 401 login_required', r.s === 401 && r.j.error === 'login_required', r);
  r = await call('POST', '/api/games', tH, '{bad json'); T('发局：JSON 不对 → 400 bad_json', r.s === 400 && r.j.error === 'bad_json', r);
  r = await call('POST', '/api/games', tH, '[1,2]'); T('发局：JSON 不是对象 → 400 bad_json', r.s === 400 && r.j.error === 'bad_json');
  r = await call('POST', '/api/games', tH, 'x'.repeat(40000)); T('发局：请求体太大 → 413', r.s === 413, r.s);
  r = await call('POST', '/api/games', tH, await NG({ duration_min: 45 })); T('发局：时长不对 → 422 invalid，detail 指出字段', r.s === 422 && r.j.error === 'invalid' && r.j.detail === 'duration_min', r);
  r = await call('POST', '/api/games', tH, await NG({ starts_at: 'not-a-time' })); T('发局：时间格式不对 → 422 invalid（不外露数据库原文）', r.s === 422 && r.j.error === 'invalid' && !/timestamp|syntax/.test(JSON.stringify(r.j)), r);
  r = await call('POST', '/api/games', tQ, await NG()); T('发局：没确认球友约定 → 428 pact_required', r.s === 428 && r.j.error === 'pact_required', r);
  r = await call('POST', '/api/me/pact', tQ); T('确认球友约定', r.s === 200 && r.j.ok === true, r);
  r = await call('POST', '/api/games', tQ, await NG({ starts_at: await slot(3, '18:00') })); T('确认后 Q 能发局', r.s === 200, r);

  // 发局 → 看得到
  r = await call('POST', '/api/games', tH, await NG());
  T('发局：200，返回 id 和分享码', r.s === 200 && UUIDre.test(r.j.id) && /^[0-9a-f]{6}$/.test(r.j.share_code), r);
  const G = r.j.id, CODE = r.j.share_code;
  r = await call('GET', '/api/game?code=' + CODE, tP); T('发出的球局别人马上能读到', r.s === 200 && r.j.game.id === G && r.j.game.spots_left === 1, r);

  // 申请 / 同意
  r = await call('POST', `/api/games/${G}/requests`, tP, { message: '我也想打' }); T('P 申请 → pending', r.s === 200 && r.j.status === 'pending', r);
  r = await call('POST', `/api/games/${G}/requests`, tP, { message: '再来' }); T('重复申请 → 409 already_applied', r.s === 409 && r.j.error === 'already_applied', r);
  r = await call('POST', `/api/games/${G}/requests`, tP, { message: 123 }); T('message 不是文字 → 422 invalid', r.s === 422 && r.j.error === 'invalid', r);
  r = await call('POST', `/api/games/${G}/requests/${P}/approve`, tP); T('P 自己同意自己 → 403 not_host', r.s === 403 && r.j.error === 'not_host', r);
  r = await call('POST', `/api/games/${G}/requests/${P}/approve`, tH); T('发起人同意 → approved', r.s === 200 && r.j.status === 'approved', r);
  r = await call('POST', `/api/games/${G}/requests/${P}/approve`, tH); T('再同意一次 → 409 state_changed', r.s === 409 && r.j.error === 'state_changed', r);
  r = await call('POST', `/api/games/${G}/requests/${P}/decline`, tH, { reason: 'pass' }); T('已同意的不能再婉拒 → 409 state_changed', r.s === 409 && r.j.error === 'state_changed', r);
  r = await call('GET', '/api/game?code=' + CODE, tP); T('同意后球局满员（余位 0）', r.j.game.spots_left === 0 && r.j.game.status === 'full', r.j.game);

  // 退出 / 婉拒 / 加入
  r = await call('DELETE', `/api/games/${G}/requests/me`, tP); T('P 退出 → left', r.s === 200 && r.j.status === 'left', r);
  r = await call('DELETE', `/api/games/${G}/requests/me`, tH); T('发起人退出 → 409 host_cannot_leave', r.s === 409 && r.j.error === 'host_cannot_leave', r);
  r = await call('POST', `/api/games/${G}/requests`, tP, {}); T('退出后可再申请', r.s === 200 && r.j.status === 'pending', r);
  r = await call('POST', `/api/games/${G}/requests/${P}/decline`, tH, { reason: 'bogus' }); T('婉拒原因不对 → 422 invalid', r.s === 422 && r.j.error === 'invalid', r);
  r = await call('POST', `/api/games/${G}/requests/${P}/decline`, tH, { reason: 'level', note: '下次吧' }); T('婉拒 → ok', r.s === 200 && r.j.ok === true, r);
  r = await call('POST', `/api/games/${G}/join`, tP); T('不是 instant 的局直接加入 → 409 join_not_allowed', r.s === 409 && r.j.error === 'join_not_allowed', r);

  // 编辑 / 顺延 / 取消 / 路径参数
  r = await call('PATCH', `/api/games/${G}`, tP, { note: 'x' }); T('非发起人改球局 → 403 not_host', r.s === 403 && r.j.error === 'not_host', r);
  r = await call('PATCH', `/api/games/${G}`, tH, { note: '带球拍就行' }); T('发起人改说明 → 200', r.s === 200, r);
  r = await call('POST', `/api/games/${G}/postpone`, tH); T('顺延一次 → 返回新开打时间', r.s === 200 && Date.parse(r.j.starts_at) - Date.parse((await admin.query('select original_start from games where id=$1', [G])).rows[0].original_start) === 3600000, r);
  r = await call('POST', `/api/games/${G}/postpone`, tH); T('再顺延 → 409 postpone_once', r.s === 409 && r.j.error === 'postpone_once', r);
  r = await call('POST', '/api/games/not-a-uuid/cancel', tH); T('路径里的 id 不是 uuid → 404 not_found', r.s === 404 && r.j.error === 'not_found', r);
  r = await call('POST', '/api/games/00000000-0000-4000-8000-000000000000/cancel', tH); T('球局不存在 → 404 not_found', r.s === 404 && r.j.error === 'not_found', r);
  r = await call('POST', `/api/games/${G}/cancel`, tP); T('非发起人取消 → 403 not_host', r.s === 403, r);
  r = await call('POST', `/api/games/${G}/cancel`, tH); T('发起人取消 → ok', r.s === 200 && r.j.ok === true, r);
  r = await call('POST', `/api/games/${G}/cancel`, tH); T('已取消的再取消 → 409', r.s === 409, r);
  r = await call('POST', `/api/games/${G}/requests`, tP, {}); T('已取消的球局不能申请 → 409 game_closed', r.s === 409 && r.j.error === 'game_closed', r);

  // 频率限制：返回 429 + Retry-After
  let hit = null; for (let i = 0; i < 8 && !hit; i++) { const x = await call('POST', '/api/games', tH, await NG({ starts_at: await slot(1 + (i % 6), i % 2 ? '18:00' : '19:00') })); if (x.s === 429 || (x.s === 409 && x.j.error === 'game_open_limit')) hit = x }
  T('连续发局触到上限：429 game_daily_limit 或 409 game_open_limit', hit && ((hit.s === 429 && hit.j.error === 'game_daily_limit') || (hit.s === 409 && hit.j.error === 'game_open_limit')), hit);
  if (hit && hit.s === 429) T('429 带 Retry-After', /^\d+$/.test(hit.h.get('Retry-After') || '') && hit.j.retry_after > 0, [...hit.h]);


  // ---- 续：邀约、偏好、聊天、举报、屏蔽、通知 ----
  await admin.query(`update users set pact_accepted_at = now() where id = $1`, [Q]);
  const inv = async (to, over = {}) => ({ to_user: to, starts_at: await slot(2, '09:00'), ends_at: await slot(2, '10:30'), venue_id: V, game_type: 'singles', note: '约一场', ...over });
  r = await call('POST', '/api/invites', tP, await inv(P)); T('邀约：约自己 → 422 invite_self', r.s === 422 && r.j.error === 'invite_self', r);
  r = await call('POST', '/api/invites', null, await inv(H)); T('邀约：没登录 → 401', r.s === 401);
  r = await call('POST', '/api/invites', tP, await inv(H)); T('邀约：P 约发起人 → 200 返回 id', r.s === 200 && UUIDre.test(r.j.id), r);
  const IV = r.j.id;
  r = await call('POST', '/api/invites', tP, await inv(H, { starts_at: await slot(3, '09:00'), ends_at: await slot(3, '10:30') })); T('邀约：对同一人已有待回复的 → 409 invite_pending', r.s === 409 && r.j.error === 'invite_pending', r);
  r = await call('POST', `/api/invites/${IV}/accept`, tP); T('邀约：自己不能接受自己发的 → 403/409/404（不是 200）', r.s !== 200, r);
  r = await call('POST', `/api/invites/${IV}/decline`, tH, { reason: 'bogus' }); T('邀约：婉拒原因不对 → 422 invalid', r.s === 422 && r.j.error === 'invalid', r);
  r = await call('POST', `/api/invites/${IV}/decline`, tH, { reason: 'week', note: '这周满了' }); T('邀约：婉拒 → ok', r.s === 200 && r.j.ok === true, r);
  r = await call('POST', `/api/invites/${IV}/withdraw`, tP); T('邀约：对方已婉拒后撤回 → 409 invite_ended', r.s === 409 && r.j.error === 'invite_ended', r);
  r = await call('POST', '/api/invites', tP, await inv(Q)); const IV2 = r.j.id; T('邀约：约 Q → 200', r.s === 200, r);
  r = await call('POST', `/api/invites/${IV2}/withdraw`, tP); T('邀约：撤回 → 200', r.s === 200, r);
  r = await call('POST', `/api/invites/${IV2}/accept`, tQ); T('邀约：已撤回的不能接受 → 409 invite_ended', r.s === 409 && r.j.error === 'invite_ended', r);
  r = await call('POST', '/api/invites/not-a-uuid/accept', tP); T('邀约：id 不是 uuid → 404', r.s === 404);

  r = await call('PUT', `/api/players/${H}/pref`, tP, { pref: 'more' }); T('偏好：多遇到 → ok', r.s === 200 && r.j.ok === true, r);
  r = await call('PUT', `/api/players/${H}/pref`, tP, { pref: 'love' }); T('偏好：值不对 → 422 invalid', r.s === 422 && r.j.error === 'invalid', r);
  r = await call('PUT', `/api/players/${P}/pref`, tP, { pref: 'more' }); T('偏好：对自己 → 422 invalid', r.s === 422, r);
  r = await call('POST', `/api/players/${H}/kudos`, tP, { game_id: G }); T('好评：没一起打过 → 4xx（不是 200）', r.s >= 400 && r.s < 500, r);
  r = await call('POST', `/api/players/${H}/kudos`, tP, {}); T('好评：缺 game_id → 422', r.s === 422);
  r = await call('PUT', `/api/games/${G}/recap`, tP, { feel: 'ok' }); T('赛后：没打过这局 → 4xx', r.s >= 400 && r.s < 500, r);
  r = await call('POST', `/api/games/${G}/noshow`, tP, { target_id: 'x' }); T('爽约反馈：target_id 不是 uuid → 422', r.s === 422);
  r = await call('POST', `/api/games/${G}/attendance/${P}`, tP, { value: 'came' }); T('出席：非发起人 → 403', r.s === 403, r);

  r = await call('POST', '/api/threads', tP, { user_id: H }); T('聊天：开私信 → 200 返回对话 id', r.s === 200 && UUIDre.test(r.j.id), r); const TH = r.j.id;
  r = await call('POST', '/api/threads', tP, { user_id: H }); T('聊天：同一对话再开 → 同一个 id', r.j.id === TH);
  r = await call('POST', '/api/threads', tP, { user_id: H, game_id: G }); T('聊天：user_id 和 game_id 只能给一个 → 422', r.s === 422);
  r = await call('POST', '/api/threads', tP, { user_id: P }); T('聊天：和自己 → 404', r.s === 404, r);
  r = await call('POST', `/api/threads/${TH}/messages`, tP, { body: '你好' }); T('聊天：发消息 → 200 返回消息 id', r.s === 200 && r.j.id, r);
  r = await call('POST', `/api/threads/${TH}/messages`, tP, { body: '看 https://x.example' }); T('聊天：带链接 → 422 message_link', r.s === 422 && r.j.error === 'message_link', r);
  r = await call('POST', `/api/threads/${TH}/messages`, tQ, { body: '我是外人' }); T('聊天：不在对话里 → 403 forbidden', r.s === 403 && r.j.error === 'forbidden', r);

  r = await call('POST', '/api/reports', tP, { target_type: 'user', target_id: H, reason: 'other', via: 'card' }); T('举报：选「其他」没写说明 → 422 report_note_required', r.s === 422 && r.j.error === 'report_note_required', r);
  r = await call('POST', '/api/reports', tP, { target_type: 'user', target_id: H, reason: 'harass', via: 'card' }); T('举报：→ 200', r.s === 200 && r.j.ok === true, r);
  r = await call('POST', '/api/reports', tP, { target_type: 'user', target_id: H, reason: 'harass', via: 'card' }); T('举报：同一对象未处理时重复 → 409 report_duplicate', r.s === 409 && r.j.error === 'report_duplicate', r);
  r = await call('POST', '/api/reports', tP, { target_type: 'message', target_id: H, reason: 'harass', via: 'card' }); T('举报：对象类型不支持 → 422', r.s === 422);
  r = await call('POST', '/api/reports', tP, { target_type: 'user', target_id: Q, reason: 'harass', via: 'card', status: 'actioned', reporter_id: H });
  { const row = (await admin.query(`select reporter_id, status from reports where target_id = $1`, [Q])).rows[0]; T('举报：多传的 reporter_id / status 被忽略（举报人=自己、状态=open）', row && row.reporter_id === P && row.status === 'open', row); }

  r = await call('POST', '/api/blocks', tP, { user_id: Q }); T('屏蔽：→ 200', r.s === 200, r);
  r = await call('POST', '/api/threads', tP, { user_id: Q }); T('屏蔽后不能再开对话 → 403 blocked', r.s === 403 && r.j.error === 'blocked', r);
  r = await call('DELETE', `/api/blocks/${Q}`, tP); T('取消屏蔽 → 200', r.s === 200, r);
  r = await call('POST', '/api/blocks', tP, {}); T('屏蔽：缺 user_id → 422', r.s === 422);

  r = await call('GET', '/api/notifications', tH); T('通知：发起人有通知（申请 / 邀约 / 私信）', r.s === 200 && r.j.notifications.length > 0 && !('user_id' in r.j.notifications[0]), r.j);
  const unread = r.j.notifications.filter(x => !x.read_at).length;
  r = await call('POST', '/api/notifications/read', tH, { ids: [r.j.notifications[0].id] }); T('通知：标记一条已读 → read 1', r.s === 200 && r.j.read === 1, r);
  r = await call('POST', '/api/notifications/read', tH, { all: true }); T('通知：全部已读', r.s === 200 && r.j.read === unread - 1, [r.j, unread]);
  r = await call('POST', '/api/notifications/read', tH, { ids: ['1; drop'] }); T('通知：ids 不是整数 → 422', r.s === 422);
  r = await call('POST', '/api/notifications/read', tH, {}); T('通知：不给 ids 也不给 all → 422', r.s === 422);
  r = await call('GET', '/api/notifications'); T('通知：没登录 → 401', r.s === 401);


  // ---- 续 2：我的资料、球场 / 区、聊天记录 ----
  r = await call('PATCH', '/api/me', tP, { nickname: '新昵称', utr: 7.25, card_theme: 'clay' }); T('资料：改昵称 / 水平 / 卡片主题 → 200 返回新资料', r.s === 200 && r.j.user.nickname === '新昵称' && Number(r.j.user.utr) === 7.25 && r.j.user.card_theme === 'clay', r);
  T('资料：返回里没有手机号 / 登录 id', !/phone|auth_id|\+61/.test(JSON.stringify(r.j)));
  r = await call('PATCH', '/api/me', tP, { status: 'active' }); T('资料：改状态 → 403 forbidden', r.s === 403 && r.j.error === 'forbidden', r);
  r = await call('PATCH', '/api/me', tP, { level: 5 }); T('资料：改等级 → 403 forbidden', r.s === 403 && r.j.error === 'forbidden');
  r = await call('PATCH', '/api/me', tP, { phone_e164: '+61400999999' }); T('资料：改手机号 → 403 forbidden', r.s === 403);
  r = await call('PATCH', '/api/me', tP, {}); T('资料：什么都没改 → 422', r.s === 422);
  r = await call('PATCH', '/api/me', tP, { card_theme: 'rainbow' }); T('资料：主题值不对 → 422 invalid', r.s === 422 && r.j.error === 'invalid', r);
  r = await call('PATCH', '/api/me', tP, { nickname: '微信 vx12345678' }); T('资料：昵称带联系方式 → 422 nickname_not_allowed', r.s === 422 && r.j.error === 'nickname_not_allowed', r);
  r = await call('PATCH', '/api/me', tP, { invite_from: 'played', email_prefs: { request: false, result: true, change: true } }); T('资料：邀约设置 + 邮件偏好（对象）→ 200', r.s === 200 && r.j.user, r);
  { const row = (await admin.query('select invite_from, email_prefs from users where id = $1', [P])).rows[0]; T('资料：确实写进了数据库', row.invite_from === 'played' && row.email_prefs.request === false, row); }
  r = await call('PATCH', '/api/me', null, { nickname: 'x' }); T('资料：没登录 → 401', r.s === 401);
  r = await call('PUT', '/api/me/clubs', tP, { venue_ids: [V] }); T('常去球场：存 1 个 → 200', r.s === 200, r);
  T('常去球场：写进了数据库', (await admin.query('select count(*)::int n from user_clubs where user_id = $1', [P])).rows[0].n === 1);
  r = await call('PUT', '/api/me/clubs', tP, { venue_ids: [V, V] }); T('常去球场：重复 → 422', r.s === 422);
  r = await call('PUT', '/api/me/clubs', tP, { venue_ids: [V, V, V, V] }); T('常去球场：超过 3 个 → 422', r.s === 422);
  r = await call('PUT', '/api/me/clubs', tP, { venue_ids: ['00000000-0000-4000-8000-000000000000'] }); T('常去球场：球场不存在 → 422，且原来的不丢（整笔回滚）', r.s === 422 && (await admin.query('select count(*)::int n from user_clubs where user_id = $1', [P])).rows[0].n === 1, r);
  r = await call('PUT', '/api/me/clubs', tP, { venue_ids: [] }); T('常去球场：清空 → 200', r.s === 200 && (await admin.query('select count(*)::int n from user_clubs where user_id = $1', [P])).rows[0].n === 0);
  r = await call('PUT', '/api/me/suburb', tP, { suburb: 'Nowhere', postcode: '9999' }); T('所在区：不存在的区 → 422', r.s === 422, r);
  r = await call('PUT', '/api/me/suburb', tP, { suburb: 'x', postcode: 'abc' }); T('所在区：邮编格式不对 → 422', r.s === 422);

  // 私人球局里展示微信
  const PG = (await admin.query(`insert into games(share_code, host_id, venue_id, starts_at, duration_min, game_type, capacity, utr_min, utr_max, visibility)
    values ('Pv01',$1,$2, now() + interval '30 hours', 90,'singles',2,4,8,'private') returning id`, [H, V])).rows[0].id;
  await admin.query(`insert into game_participants(game_id, user_id, role, status) values ($1,$2,'player','approved') on conflict do nothing`, [PG, P]);
  r = await call('PATCH', `/api/games/${PG}/me`, tP, { show_wechat: true }); T('展示微信：私人球局里打开 → 200', r.s === 200 && r.j.show_wechat === true, r);
  r = await call('PATCH', `/api/games/${PG}/me`, tP, { show_wechat: 'yes' }); T('展示微信：值不是布尔 → 422', r.s === 422);
  r = await call('PATCH', `/api/games/${G}/me`, tP, { show_wechat: true }); T('展示微信：公开球局 / 没加入 → 403 not_in_game', r.s === 403 && r.j.error === 'not_in_game', r);
  r = await call('PATCH', `/api/games/${PG}/me`, tQ, { show_wechat: true }); T('展示微信：不在这局的人改不了 → 403', r.s === 403);

  // 聊天记录
  r = await call('POST', `/api/threads/${TH}/messages`, tH, { body: '收到' });
  r = await call('GET', '/api/threads', tP); T('对话列表：有刚才的私信，带最后一条和未读', r.s === 200 && r.j.threads.length === 1 && r.j.threads[0].id === TH && r.j.threads[0].other_id === H && r.j.threads[0].last_body === '收到' && r.j.threads[0].unread === true, r.j);
  r = await call('GET', '/api/threads', tQ); T('对话列表：别人的对话看不到', r.s === 200 && r.j.threads.length === 0, r.j);
  r = await call('GET', `/api/threads/${TH}/messages`, tP); T('消息：按时间从旧到新，id 是数字', r.s === 200 && r.j.messages.length === 2 && r.j.messages[0].body === '你好' && typeof r.j.messages[0].id === 'number' && r.j.messages[0].id < r.j.messages[1].id, r.j);
  r = await call('GET', `/api/threads/${TH}/messages?before=${r.j.messages[1].id}`, tP); T('消息：before 翻页', r.j.messages.length === 1 && r.j.messages[0].body === '你好', r.j);
  r = await call('GET', `/api/threads/${TH}/messages?before=abc`, tP); T('消息：before 不是数字 → 422', r.s === 422);
  r = await call('GET', `/api/threads/${TH}/messages`, tQ); T('消息：不在对话里 → 空（行级权限，不报错）', r.s === 200 && r.j.messages.length === 0, r.j);
  await admin.query(`update messages set hidden = true where body = '收到'`);
  r = await call('GET', `/api/threads/${TH}/messages`, tP); T('消息：被隐藏的别人的消息看不到', r.j.messages.length === 1, r.j);
  r = await call('POST', `/api/threads/${TH}/read`, tP); T('已读：→ 200', r.s === 200, r);
  r = await call('GET', '/api/threads', tP); T('已读后不再未读', r.j.threads[0].unread === false, r.j);
  r = await call('POST', `/api/threads/${TH}/read`, tQ); T('已读：不在对话里 → 404', r.s === 404 && r.j.error === 'not_found', r);


  // ---- 续 3：场边、推送订阅、账号注销 / 恢复 ----
  r = await call('POST', '/api/sideline/posts', null, { body: '今天球场很安静', venue_id: V, topic_title: '清晨球场' }); T('场边发布：没登录 → 401', r.s === 401);
  r = await call('POST', '/api/sideline/posts', tP, { body: '今天球场很安静', venue_id: V, topic_title: '清晨球场' }); T('场边发布：→ 200 返回 id / 话题 / 编号', r.s === 200 && UUIDre.test(r.j.id) && r.j.floor >= 1, r);
  const SP = r.j.id;
  r = await call('POST', '/api/sideline/posts', tP, { body: '看 https://x.example', venue_id: V, topic_title: '清晨球场' }); T('场边发布：带链接 → 422 message_link', r.s === 422 && r.j.error === 'message_link', r);
  r = await call('POST', '/api/sideline/posts', tP, { body: '', venue_id: V, topic_title: '清晨球场' }); T('场边发布：没字没照片 → 422 invalid', r.s === 422 && r.j.error === 'invalid', r);
  r = await call('POST', `/api/sideline/posts/${SP}/replies`, tH, { body: '我也在附近' }); T('场边回复：→ 200 返回数字 id', r.s === 200 && typeof r.j.id === 'number', r); const RP = r.j.id;
  r = await call('POST', `/api/sideline/posts/${SP}/replies`, tH, { body: 'x'.repeat(61) }); T('场边回复：超过 60 字 → 422 invalid', r.s === 422 && r.j.error === 'invalid', r);
  r = await call('PATCH', `/api/sideline/posts/${SP}`, tH, { replies_open: false }); T('场边：非作者关回复 → 404/403（不是 200）', r.s >= 400 && r.s < 500, r);
  r = await call('PATCH', `/api/sideline/posts/${SP}`, tP, { replies_open: false }); T('场边：作者关回复 → 200', r.s === 200 && r.j.replies_open === false, r);
  r = await call('POST', `/api/sideline/posts/${SP}/replies`, tH, { body: '再回一条' }); T('场边回复：作者关了回复 → 409 replies_closed', r.s === 409 && r.j.error === 'replies_closed', r);
  r = await call('PUT', `/api/sideline/posts/${SP}/ball`, tH); T('网球：点 → 1', r.s === 200 && r.j.balls === 1, r);
  r = await call('PUT', `/api/sideline/posts/${SP}/ball`, tH); T('网球：重复点不报错、不多算', r.s === 200 && r.j.balls === 1, r);
  r = await call('DELETE', `/api/sideline/posts/${SP}/ball`, tH); T('网球：取消 → 0', r.s === 200 && r.j.balls === 0, r);
  r = await call('POST', `/api/sideline/posts/${SP}/hide`, tH, { reason: 'bogus' }); T('不感兴趣：原因不对 → 422', r.s === 422, r);
  r = await call('POST', `/api/sideline/posts/${SP}/hide`, tP, {}); T('不感兴趣：自己的 → 422 invalid', r.s === 422, r);
  r = await call('POST', `/api/sideline/posts/${SP}/hide`, tH, {}); T('不感兴趣：→ 200', r.s === 200, r);
  r = await call('DELETE', `/api/sideline/replies/${RP}`, tP); T('场边：删别人的回复 → 404', r.s === 404, r);
  r = await call('DELETE', `/api/sideline/replies/${RP}`, tH); T('场边：删自己的回复 → 200', r.s === 200, r);
  r = await call('DELETE', '/api/sideline/replies/abc', tH); T('场边：回复 id 不是数字 → 404', r.s === 404);
  r = await call('POST', '/api/sideline/views', null, { post_ids: [SP], device: 'abcdef0123456789abcdef' }); T('浏览：没登录靠设备 id → 200', r.s === 200 && typeof r.j.counted === 'number', r);
  r = await call('POST', '/api/sideline/views', null, { post_ids: [SP] }); T('浏览：没登录又没设备 id → 422 invalid', r.s === 422 && r.j.error === 'invalid', r);
  r = await call('POST', '/api/sideline/views', tH, { post_ids: Array(51).fill(SP) }); T('浏览：超过 50 条 → 422', r.s === 422);
  r = await call('POST', '/api/sideline/views', 'garbage', { post_ids: [SP] }); T('浏览：带了坏令牌 → 401（不当匿名）', r.s === 401);
  r = await call('POST', `/api/sideline/posts/${SP}/share`, null, { device: 'abcdef0123456789abcdef' }); T('分享：没登录 → 200', r.s === 200, r);
  r = await call('GET', '/api/sideline/config'); T('场边配置：没登录能读 → 有版本号', r.s === 200 && r.j.version >= 1 && r.j.config, r);
  r = await call('GET', `/api/sideline/config?v=${r.j.version}`); T('场边配置：版本没变 → same', r.s === 200 && r.j.same === true, r);
  r = await call('GET', '/api/sideline/config?v=abc'); T('场边配置：v 不是数字 → 422', r.s === 422);
  r = await call('POST', '/api/reports', tH, { target_type: 'sb_post', target_id: SP, reason: 'photo', via: 'sideline' }); T('举报场边发布：已点不感兴趣的看不到 → 404', r.s === 404 && r.j.error === 'not_found', r);
  r = await call('POST', '/api/reports', tP, { target_type: 'sb_post', target_id: SP, reason: 'harass', via: 'sideline' }); T('举报场边发布：举报自己的 → 422', r.s === 422, r);
  r = await call('DELETE', `/api/sideline/posts/${SP}`, tH); T('场边：删别人的发布 → 404', r.s === 404, r);
  r = await call('DELETE', `/api/sideline/posts/${SP}`, tP); T('场边：删自己的发布 → 200', r.s === 200, r);

  const sub = { endpoint: 'https://push.example/abc123', keys: { p256dh: 'BPk', auth: 'au' }, platform: 'mobile' };
  const devs = async () => (await admin.query('select platform, push_endpoint, push_p256dh, push_auth from user_devices where user_id = $1 order by created_at', [P])).rows;
  r = await call('POST', '/api/push/subscriptions', tP, sub); T('推送订阅：→ 200，写进 user_devices（发送程序读这里）', r.s === 200 && (await devs()).length === 1 && (await devs())[0].push_endpoint === sub.endpoint && (await devs())[0].platform === 'mobile', await devs());
  r = await call('POST', '/api/push/subscriptions', tP, { ...sub, keys: { p256dh: 'BPk2', auth: 'au2' } }); T('推送订阅：同一个 endpoint 再订阅 = 更新密钥，不新增', r.s === 200 && (await devs()).length === 1 && (await devs())[0].push_p256dh === 'BPk2', await devs());
  r = await call('POST', '/api/push/subscriptions', tP, { ...sub, endpoint: 'https://push.example/desk', platform: 'desktop' }); T('推送订阅：电脑是另一台设备', r.s === 200 && (await devs()).length === 2, await devs());
  r = await call('POST', '/api/push/subscriptions', tP, { ...sub, platform: 'android' }); T('推送订阅：platform 写 android / ios_pwa 按手机算', r.s === 200 && (await devs()).length === 2, await devs());
  r = await call('POST', '/api/push/subscriptions', tP, { ...sub, endpoint: 'http://insecure.example/x' }); T('推送订阅：不是 https → 422', r.s === 422);
  r = await call('POST', '/api/push/subscriptions', tP, { endpoint: sub.endpoint }); T('推送订阅：缺 keys → 422', r.s === 422);
  r = await call('POST', '/api/push/subscriptions', tP, { ...sub, platform: 'tv' }); T('推送订阅：platform 不认识 → 422', r.s === 422);
  r = await call('DELETE', '/api/push/subscriptions', tP, { endpoint: sub.endpoint }); T('推送订阅：取消 → 200，这台设备的订阅清空（设备行保留）', r.s === 200 && (await devs()).filter(x => x.push_endpoint === sub.endpoint).length === 0 && (await devs()).length === 2, await devs());
  r = await call('POST', '/api/push/subscriptions', tH, { ...sub, endpoint: 'https://push.example/h' }); { const o = (await admin.query('select count(*)::int n from user_devices where user_id = $1', [P])).rows[0].n; T('推送订阅：别人的订阅不影响我的', r.s === 200 && o === 2, o); }

  r = await call('POST', '/api/me/restore', tQ); T('恢复账号：没注销的 → 409 state_changed', r.s === 409 && r.j.error === 'state_changed', r);
  r = await call('DELETE', '/api/me', tQ); T('注销账号：→ 200 返回影响的球局数', r.s === 200 && r.j.upcoming_left === 0 && r.j.hosted_cancelled >= 0, r);
  r = await call('DELETE', '/api/me', tQ); T('注销账号：重复注销 → 403 account_deleted 或 409 state_changed', (r.s === 403 && r.j.error === 'account_deleted') || (r.s === 409 && r.j.error === 'state_changed'), r);
  r = await call('POST', '/api/games', tQ, await NG({ starts_at: await slot(4, '18:00') })); T('注销后不能发局 → 403 account_deleted', r.s === 403 && r.j.error === 'account_deleted', r);
  r = await call('POST', '/api/me/restore', tQ); T('30 天内恢复 → 200', r.s === 200, r);
  await admin.query(`update users set status = 'deleted', status_since = now() - interval '31 days' where id = $1`, [Q]);
  r = await call('POST', '/api/me/restore', tQ); T('超过 30 天恢复 → 410 restore_expired', r.s === 410 && r.j.error === 'restore_expired', r);


  // ---- 新号码建资料 ----
  const NEWU = '66666666-ffff-4fff-8fff-ffffffffffff', tNew = await token(NEWU, { phone: '61400000099' });
  const REG = { nickname: '新球友', last_initial: 'w', utr: 6.5, utr_estimated: true, avatar_kind: 'animal', avatar_animal: 'tiger', avatar_color: 'paper', card_theme: 'clay', adult: true };
  r = await call('POST', '/api/me/register', null, REG); T('注册：没登录 → 401', r.s === 401);
  r = await call('POST', '/api/me/register', await token(NEWU), REG); T('注册：令牌里没有手机号 → 422', r.s === 422 && r.j.detail === 'phone', r);
  r = await call('POST', '/api/me/register', await token(NEWU, { phone: '61300000000' }), REG); T('注册：不是澳洲手机号 → 422', r.s === 422 && r.j.detail === 'phone', r);
  r = await call('POST', '/api/me/register', tNew, { ...REG, adult: false }); T('注册：没确认满 18 岁 → 422 adult_required', r.s === 422 && r.j.error === 'adult_required', r);
  r = await call('POST', '/api/me/register', tNew, { ...REG, nickname: '' }); T('注册：昵称为空 → 422', r.s === 422 && r.j.detail === 'nickname');
  r = await call('POST', '/api/me/register', tNew, { ...REG, nickname: 'x'.repeat(21) }); T('注册：昵称超过 20 字 → 422', r.s === 422);
  r = await call('POST', '/api/me/register', tNew, { ...REG, utr: 17 }); T('注册：水平超出范围 → 422 utr', r.s === 422 && r.j.detail === 'utr');
  r = await call('POST', '/api/me/register', tNew, { ...REG, last_initial: '12' }); T('注册：姓氏首字母不是一个字母 → 422', r.s === 422);
  r = await call('POST', '/api/me/register', tNew, { ...REG, nickname: '微信 vx12345678' }); T('注册：昵称带联系方式 → 422 nickname_not_allowed', r.s === 422 && r.j.error === 'nickname_not_allowed', r);
  T('注册：上面失败的都没留下半截资料', (await admin.query(`select count(*)::int n from users where auth_id = $1`, [NEWU])).rows[0].n === 0);
  r = await call('POST', '/api/me/register', tNew, REG); T('注册：成功 → 返回资料（首字母大写、水平、主题）', r.s === 200 && r.j.registered === true && r.j.user.nickname === '新球友' && r.j.user.last_initial === 'W' && Number(r.j.user.utr) === 6.5 && r.j.user.utr_estimated === true && r.j.user.card_theme === 'clay', r);
  { const row = (await admin.query(`select phone_e164, adult_confirmed_at, terms_version from users where auth_id = $1`, [NEWU])).rows[0]; T('注册：手机号取自令牌（+61…），记了满 18 岁和协议版本', row.phone_e164 === '+61400000099' && row.adult_confirmed_at && row.terms_version >= 1, row); }
  T('注册：返回里没有手机号 / 登录 id', !/phone|auth_id|\+61/.test(JSON.stringify(r.j)));
  r = await call('POST', '/api/me/register', tNew, { ...REG, nickname: '改名想蒙混' }); T('注册：同一个号码再提交 → 返回已有资料，不改、不重复建', r.s === 200 && r.j.user.nickname === '新球友' && (await admin.query(`select count(*)::int n from users where auth_id = $1`, [NEWU])).rows[0].n === 1, r);
  r = await call('GET', '/api/me', tNew); T('注册后 /api/me 认得出来', r.j.registered === true && r.j.user.nickname === '新球友', r.j);
  r = await call('POST', '/api/me/register', await token('77777777-aaaa-4aaa-8aaa-aaaaaaaaaaaa', { phone: '61400000099' }), REG); T('注册：别的登录账号用同一个手机号 → 409 phone_taken', r.s === 409 && r.j.error === 'phone_taken', r);

  // 路由
  r = await call('GET', '/api/games/' + G + '/cancel', tH); T('方法不对 → 405', r.s === 405 && r.j.error === 'method_not_allowed', r);
  r = await call('POST', '/api/nope/x', tH); T('不存在的路径 → 404', r.s === 404);
  r = await call('POST', `/api/games/${G}/join`, tP, undefined, { verify, db: makeDb(null) }); T('没配数据库 → 503 db_unavailable', r.s === 503 && r.j.error === 'db_unavailable', r);

  // 死锁 / 序列化冲突：整笔重试一次
  { let n = 0; const flaky = { verify, db: { ...deps.db, asUser: async (u, fn) => { if (n++ === 0) throw Object.assign(new Error('deadlock'), { code: '40P01' }); return deps.db.asUser(u, fn) } } };
    r = await call('POST', '/api/me/pact', tH, undefined, flaky); T('遇到死锁重试一次后成功', r.s === 200 && n === 2, [r.s, n]);
    n = -99; const bad = { verify, db: { ...deps.db, asUser: async () => { throw Object.assign(new Error('deadlock'), { code: '40P01' }) } } };
    r = await call('POST', '/api/me/pact', tH, undefined, bad); T('重试仍失败 → 503 busy_retry', r.s === 503 && r.j.error === 'busy_retry', r); }
  { const log = console.error; let leaked = ''; console.error = (...a) => { leaked += a.join(' ') };
    const boom = { verify, db: { ...deps.db, asUser: async () => { throw new Error('connect ECONNREFUSED secret-host.example password=hunter2') } } };
    r = await call('POST', '/api/me/pact', tH, undefined, boom); console.error = log;
    T('数据库连不上 → 503，响应里没有地址和密码', r.s === 503 && !/secret-host|hunter2/.test(JSON.stringify(r.j)), r); }

  // 连接用完即还
  await new Promise(r => setTimeout(r, 200));
  const left = +(await admin.query(`select count(*) n from pg_stat_activity where usename = 'nbq_api'`)).rows[0].n;
  T('请求结束后 nbq_api 的连接全部关闭', left === 0, left);
} catch (e) { fail++; console.log('FAIL 异常', e.stack || e.message) }
finally { try { await admin?.end() } catch (_) { } c.stop() }
console.log(`api_write: ${pass} 通过, ${fail} 失败`); process.exit(fail ? 1 : 0);
