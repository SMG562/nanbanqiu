// 5g-3 前台接入第 2 轮：读接口（我的球局 / 邀约 / 球友卡片）（球局 / 申请 / 同意…）经 HTTP 层走一遍；规则本身由 pg/api 测，这里测接线：令牌、路径参数、JSON、错误码 → 状态码、重试。
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
  const token = async sub => { const h = b64(JSON.stringify({ alg: 'ES256', kid: 'k1' })), p = b64(JSON.stringify({ iss: ISS, aud: 'authenticated', sub, exp: Math.floor(Date.now() / 1000) + 600 }));
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

  let r;
  const AR = '55555555-eeee-4eee-8eee-eeeeeeeeeeee'; await admin.query(`insert into users(auth_id, phone_e164, nickname, utr, pact_accepted_at, wechat_id) values ($1,'+61400000004','球友R',5.5, now(), 'wx_secret_r')`, [AR]);
  const R_ = await uid(AR), tR = await token(AR);
  // G1 双打：H 发起；Q 已确认；P 待确认（留言）；R 待确认后被婉拒
  const mk = async (host, code, vis, startSql, type = 'doubles', cap = 4) => (await admin.query(`insert into games(share_code, host_id, venue_id, starts_at, duration_min, game_type, capacity, utr_min, utr_max, visibility, note)
    values ($1,$2,$3, ${startSql}, 90, $4, $5, 4, 8, $6, '带球拍') returning id`, [code, host, V, type, cap, vis])).rows[0].id;
  const G1 = await mk(H, 'Dd01', 'public', "now() + interval '30 hours'");
  await admin.query(`insert into game_participants(game_id, user_id, role, status, message) values ($1,$2,'player','approved','我是Q的留言'), ($1,$3,'player','pending','我是P的留言'), ($1,$4,'player','pending','我是R的留言')`, [G1, Q, P, R_]);
  await admin.query(`update game_participants set status = 'rejected', decline_reason = 'level', decline_note = '下次吧' where game_id = $1 and user_id = $2`, [G1, R_]);
  const GP = await mk(H, 'Pr01', 'private', "now() + interval '40 hours'", 'singles', 2);       // 私人局：H + P
  await admin.query(`insert into game_participants(game_id, user_id, role, status) values ($1,$2,'player','approved')`, [GP, P]);
  const GO = await mk(H, 'Old2', 'public', "now() - interval '70 days'");                          // 70 天前：不在「我的」里
  const GX = await mk(AR && R_, 'Oth3', 'public', "now() + interval '20 hours'", 'singles', 2);    // R 发起的，H / P 没参与

  const G = '33333333-cccc-4ccc-8ccc-cccccccccccc';
  r = await call('GET', '/api/games/mine'); T('我的球局：没登录 → 401', r.s === 401);
  r = await call('GET', '/api/games/mine', tN); T('我的球局：没注册 → 401', r.s === 401);
  r = await call('GET', '/api/games/mine', tH);
  const codes = x => (x.j.games || []).map(g => g.share_code).sort().join();
  T('发起人：看到自己发起的两局，不含 70 天前的、别人的', r.s === 200 && codes(r) === 'Dd01,Pr01', [r.s, r.j, codes(r)]);
  T('发起人：每局带开打时间、水平范围、余位、加入方式', r.j.games.every(g => g.starts_at && g.utr_min !== undefined && typeof g.spots_left === 'number' && g.join_mode && 'filled' in g), r.j.games[0]);
  { const ps = r.j.participants.filter(x => x.game_id === G1); T('发起人：看到 G1 全部参与记录（含待确认、被婉拒），留言和婉拒原因都在', ps.length === 4 && ps.find(x => x.user_id === P).message === '我是P的留言' && ps.find(x => x.user_id === R_).decline_reason === 'level' && ps.find(x => x.user_id === R_).decline_note === '下次吧', ps); }
  T('发起人：球友卡片带出所有相关的人（昵称、头像、水平、场次）', ['id', 'nickname', 'utr', 'avatar_kind', 'played', 'hosted', 'kudos', 'level', 'gone'].every(k => k in r.j.profiles[P]) && r.j.profiles[P].nickname === '球友P' && r.j.profiles[Q] && r.j.profiles[R_] && r.j.profiles[H], Object.keys(r.j.profiles));
  T('返回里没有手机号 / 登录 id / 微信号', !/phone|auth_id|wechat|\+61|wx_secret/.test(JSON.stringify(r.j)));
  r = await call('GET', '/api/games/mine', tP);
  T('待确认的 P：看到 G1 和私人局，看不到别人的局', codes(r) === 'Dd01,Pr01', codes(r));
  { const g1 = r.j.participants.filter(x => x.game_id === G1); T('待确认的 P：在 G1 里只看得到自己那一行（看不到 Q 的、R 的留言）', g1.length === 1 && g1[0].user_id === P && g1[0].message === '我是P的留言' && g1[0].status === 'pending', g1);
    T('P 看不到 Q / R 的留言', !/我是Q的留言|我是R的留言/.test(JSON.stringify(r.j))); }
  r = await call('GET', '/api/games/mine', tQ);
  { const g1 = r.j.participants.filter(x => x.game_id === G1).map(x => x.user_id).sort().join(); T('已确认的 Q：看到发起人和自己（已确认的人），看不到待确认的 P / 被婉拒的 R', g1 === [H, Q].sort().join(), g1);
    T('已确认的 Q：看不到别人的留言和婉拒原因', !/我是P的留言|我是R的留言|decline_note.*下次吧|"level"/.test(JSON.stringify(r.j.participants.filter(x => x.user_id !== Q))), r.j.participants); }
  r = await call('GET', '/api/games/mine', tR); T('被婉拒的 R：看得到自己的状态和婉拒原因，以及自己发起的局', r.j.participants.some(x => x.game_id === G1 && x.user_id === R_ && x.status === 'rejected' && x.decline_reason === 'level') && codes(r).includes('Oth3'), codes(r));

  // 邀约
  const IV = (await admin.query(`insert into invites(from_user, to_user, starts_at, ends_at, venue_id, game_type, note) values ($1,$2, now() + interval '30 hours', now() + interval '31 hours 30 minutes', $3, 'singles', '约一场') returning id`, [P, H, V])).rows[0].id;
  r = await call('GET', '/api/invites', tH); T('邀约：收到的邀约出现在列表里，带对方卡片', r.s === 200 && r.j.invites.length === 1 && r.j.invites[0].id === IV && r.j.invites[0].status === 'pending' && r.j.profiles[P].nickname === '球友P', r.j);
  r = await call('GET', '/api/invites', tP); T('邀约：发出的邀约发起人也看得到', r.j.invites.length === 1 && r.j.invites[0].from_user === P, r.j);
  r = await call('GET', '/api/invites', tQ); T('邀约：别人的邀约看不到', r.s === 200 && r.j.invites.length === 0, r.j);
  r = await call('GET', '/api/invites'); T('邀约：没登录 → 401', r.s === 401);

  // 球友卡片
  r = await call('GET', `/api/profiles?ids=${H},${P},${P}`, tQ); T('批量卡片：按 id 返回（重复 id 只出一份）', r.s === 200 && Object.keys(r.j.profiles).length === 2 && r.j.profiles[H].nickname === '发起人', r.j);
  r = await call('GET', `/api/profiles?ids=${G}`, tQ); T('批量卡片：不是球友的 id → 返回里没有它', r.s === 200 && Object.keys(r.j.profiles).length === 0, r.j);
  r = await call('GET', '/api/profiles?ids=abc', tQ); T('批量卡片：id 格式不对 → 422', r.s === 422);
  r = await call('GET', '/api/profiles', tQ); T('批量卡片：没给 ids → 422', r.s === 422);
  r = await call('GET', '/api/profiles?ids=' + Array(51).fill(H).join(','), tQ); T('批量卡片：超过 50 个 → 422', r.s === 422);
  r = await call('GET', `/api/players/${P}`, tQ); T('球员卡：→ 200，公开字段齐', r.s === 200 && r.j.player.nickname === '球友P' && 'member_no' in r.j.player && 'card_theme' in r.j.player, r.j);
  T('球员卡：没有手机号 / 微信号 / 登录 id', !/phone|wechat|auth_id|\+61/.test(JSON.stringify(r.j)));
  r = await call('GET', `/api/players/${G}`, tQ); T('球员卡：不存在 → 404', r.s === 404);
  r = await call('GET', '/api/players/xyz', tQ); T('球员卡：id 不是 uuid → 404', r.s === 404);
  await admin.query(`update users set status = 'deleted', status_since = now() where id = $1`, [R_]);
  r = await call('GET', `/api/players/${R_}`, tQ); T('球员卡：已注销的球友 gone = true', r.s === 200 && r.j.player.gone === true, r.j);
  r = await call('GET', '/api/games/mine', tH, undefined, { verify, db: makeDb(null) }); T('没配数据库 → 503', r.s === 503);

  // 连接用完即还
  await new Promise(r => setTimeout(r, 200));
  const left = +(await admin.query(`select count(*) n from pg_stat_activity where usename = 'nbq_api'`)).rows[0].n;
  T('请求结束后 nbq_api 的连接全部关闭', left === 0, left);
} catch (e) { fail++; console.log('FAIL 异常', e.stack || e.message) }
finally { try { await admin?.end() } catch (_) { } c.stop() }
console.log(`api_read: ${pass} 通过, ${fail} 失败`); process.exit(fail ? 1 : 0);
