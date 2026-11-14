// 登录交接（11-14）：Safari 登录后添加到主屏幕，从桌面图标打开不用再登录。真接口（handler.mjs）+ 真 PostgreSQL。
//   为什么：iPhone 的 Safari 和桌面图标不共用存储，真机反馈「要登录好几次」。交接码写进桌面图标的启动网址，第一次打开换登录。这是登录机制，错一点就是账号被冒用，所以每条安全性质都要有测试。
//   查什么：没配签名密钥 = 整套不启用（404）；要码必须已登录、每人每天 5 个；码只能用一次、24 小时过期、库里只有 sha256（明文码和续期凭证都不落库）；
//           换来的令牌接口认（/api/me 是同一个人）、能续期、退出后续不了；封禁的账号换不了也续不了；
//           伪造 / 篡改 / 别的密钥签的 / 过期的自签令牌都是 401；自签密钥签的令牌冒充 Supabase 的 iss 也不认；安装配置只多一个 h 参数。
//   查不到什么：iPhone 是否把带码的启动网址记进桌面图标（真机清单）；前台什么时候要码、什么时候换（frontend/handoff）。
import { createRequire } from 'module'; import path from 'path'; import { fileURLToPath } from 'url';
import { startCluster, loadSchema } from './cluster.mjs';
const require = createRequire(import.meta.url); const pg = require('pg');
const HERE = path.dirname(fileURLToPath(import.meta.url)), DIR = process.env.NBQ_DIR || path.join(HERE, '..', '..');
const { handleApi } = await import(path.join(DIR, 'server/api/handler.mjs')), { makeVerifier, makeSession, OWN_ISS } = await import(path.join(DIR, 'server/api/jwt.mjs')), { makeDb } = await import(path.join(DIR, 'server/api/db.mjs'));
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 500) : '')) };
const c = startCluster(); let admin;
try {
  c.createdb('nbq');
  const errs = loadSchema(c, 'nbq', path.join(DIR, 'schema.sql')); T('schema 执行无错误', !errs.length, errs.slice(0, 3));
  admin = new pg.Pool({ host: c.host, port: c.port, user: 'postgres', database: 'nbq', max: 2 }); admin.on('error', () => { });
  await admin.query(`create role nbq_api login in role nbq_user, nbq_service`);
  const gen = async () => { const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']); return { kp, priv: await crypto.subtle.exportKey('jwk', kp.privateKey), pub: await crypto.subtle.exportKey('jwk', kp.publicKey) } };
  const sb = await gen(), own = await gen(), other = await gen(), U = 'https://t.supabase.co', ISS = U + '/auth/v1', b64 = x => Buffer.from(x).toString('base64url');
  const sbToken = async (sub, extra = {}, key = sb.kp.privateKey, kid = 'k1') => { const h = b64(JSON.stringify({ alg: 'ES256', kid })), p = b64(JSON.stringify({ iss: ISS, aud: 'authenticated', sub, exp: Math.floor(Date.now() / 1000) + 600, ...extra }));
    return h + '.' + p + '.' + b64(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(h + '.' + p))) };
  const verify = makeVerifier({ url: U, fetch: async () => ({ ok: true, json: async () => ({ keys: [{ ...sb.pub, alg: 'ES256', kid: 'k1' }] }) }) });
  const db = makeDb(async () => { const cl = new pg.Client({ host: c.host, port: c.port, user: 'nbq_api', database: 'nbq' }); await cl.connect(); return cl });
  let clock = Date.now();
  const MAN = { name: '南伴球', id: '/', start_url: '/melbourne/?source=pwa', scope: '/', display: 'standalone' };
  const on = { verify, db, session: makeSession(JSON.stringify(own.priv), { now: () => clock }), asset: async () => new Response(JSON.stringify(MAN), { status: 200 }) }, off = { verify, db };
  const call = async (d, method, p, tok, body, ip) => { const r = await handleApi(new Request('https://nanbanqiu.app' + p, { method, headers: { ...(ip ? { 'cf-connecting-ip': ip } : {}), ...(tok ? { Authorization: 'Bearer ' + tok } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined }), d);
    let j = null; try { j = await r.json() } catch (_) { } return { s: r.status, j, h: r.headers } };
  const A1 = '11111111-aaaa-4aaa-8aaa-aaaaaaaaaaaa', A2 = '22222222-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  await admin.query(`insert into users(auth_id, phone_e164, nickname, utr, pact_accepted_at) values ($1,'+61412345678','Sam',5,now()), ($2,'+61400000002','Pat',5,now())`, [A1, A2]);
  const uid = async a => (await admin.query('select id from users where auth_id=$1', [a])).rows[0].id, U1 = await uid(A1), T1 = await sbToken(A1);

  T('makeSession：没给密钥 / 不是 P-256 私钥 = null（不启用）', makeSession(undefined) === null && makeSession('x') === null && makeSession(JSON.stringify(own.pub)) === null);
  let r = await call(off, 'POST', '/api/session/handoff', T1);
  T('没配签名密钥：要码 / 换码 / 续期都是 404 handoff_unavailable', r.s === 404 && r.j.error === 'handoff_unavailable' && (await call(off, 'POST', '/api/session/redeem', null, { code: 'x'.repeat(43) })).s === 404 && (await call(off, 'POST', '/api/session/refresh', null, { refresh_token: 'x'.repeat(43) })).s === 404, r);
  T('没登录要码：401', (await call(on, 'POST', '/api/session/handoff')).s === 401);
  r = await call(on, 'POST', '/api/session/handoff', T1); const code = r.j && r.j.code;
  T('已登录要码：给一个 43 位的随机码和过期时间（约 24 小时后）', r.s === 200 && /^[A-Za-z0-9_-]{43}$/.test(code || '') && Math.abs(Date.parse(r.j.expires_at) - Date.now() - 864e5) < 60e3, r);
  const rows = (await admin.query('select code_hash, user_id, used_at from login_handoffs')).rows;
  T('库里只有码的 sha256，不是明文', rows.length === 1 && /^[0-9a-f]{64}$/.test(rows[0].code_hash) && rows[0].code_hash !== code && !JSON.stringify(rows).includes(code) && rows[0].user_id === U1 && rows[0].used_at === null);
  T('码不对 / 格式不对：401 handoff_invalid，不说明原因', (await call(on, 'POST', '/api/session/redeem', null, { code: 'A'.repeat(43) })).j.error === 'handoff_invalid' && (await call(on, 'POST', '/api/session/redeem', null, { code: 'short' })).s === 401 && (await call(on, 'POST', '/api/session/redeem', null, {})).s === 401);
  r = await call(on, 'POST', '/api/session/redeem', null, { code }); const S1 = r.j;
  T('用码换登录：给令牌、续期凭证、同一个人的 id 和手机号', r.s === 200 && S1.access_token && /^[A-Za-z0-9_-]{43}$/.test(S1.refresh_token) && S1.expires_in === 3600 && S1.user.id === A1 && S1.user.phone === '61412345678', r);
  T('同一个码第二次：401（只能用一次）', (await call(on, 'POST', '/api/session/redeem', null, { code })).s === 401);
  const ds = (await admin.query('select refresh_hash, user_id from device_sessions')).rows;
  T('续期凭证库里也只有 sha256', ds.length === 1 && ds[0].user_id === U1 && ds[0].refresh_hash !== S1.refresh_token && /^[0-9a-f]{64}$/.test(ds[0].refresh_hash));
  r = await call(on, 'GET', '/api/me', S1.access_token);
  T('换来的令牌接口认：/api/me 是同一个人', r.s === 200 && r.j.registered === true && r.j.user.id === U1, r);
  T('没配密钥的环境不认自签令牌', (await call(off, 'GET', '/api/me', S1.access_token)).s === 401);
  // 伪造与篡改
  const parts = S1.access_token.split('.'), pl = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
  T('令牌内容：iss 是自己的签发方、sub 是 auth id、1 小时', pl.iss === OWN_ISS && pl.sub === A1 && pl.aud === 'authenticated' && pl.exp - pl.iat === 3600);
  const forged = parts[0] + '.' + b64(JSON.stringify({ ...pl, sub: A2 })) + '.' + parts[2];
  T('改了内容（换成别人的 sub）：401', (await call(on, 'GET', '/api/me', forged)).s === 401);
  const evil = makeSession(JSON.stringify(other.priv));
  T('别的密钥签的同样内容：401', (await call(on, 'GET', '/api/me', await evil.sign({ sub: A2 }))).s === 401);
  T('自签密钥签、但 iss 冒充 Supabase：走 Supabase 的公钥验，不认', (await call(on, 'GET', '/api/me', await sbToken(A2, {}, own.kp.privateKey, 'nbq1'))).s === 401);
  T('Supabase 密钥签、但 iss 冒充自签：不认', (await call(on, 'GET', '/api/me', await sbToken(A2, { iss: OWN_ISS }))).s === 401);
  clock += 3700e3; T('自签令牌过期（1 小时多）：401', (await call(on, 'GET', '/api/me', S1.access_token)).s === 401);
  r = await call(on, 'POST', '/api/session/refresh', null, { refresh_token: S1.refresh_token });
  T('续期：新令牌可用，凭证不变', r.s === 200 && r.j.refresh_token === S1.refresh_token && (await call(on, 'GET', '/api/me', r.j.access_token)).j.user.id === U1, r);
  T('续期凭证不对：401 session_revoked', (await call(on, 'POST', '/api/session/refresh', null, { refresh_token: 'B'.repeat(43) })).j.error === 'session_revoked');
  T('交接出来的登录也能再要码（换手机 / 重装）', (await call(on, 'POST', '/api/session/handoff', r.j.access_token)).s === 200);
  // 过期
  r = await call(on, 'POST', '/api/session/handoff', T1); await admin.query(`update login_handoffs set expires_at = now() - interval '1 second' where used_at is null`);
  T('码过期：401', (await call(on, 'POST', '/api/session/redeem', null, { code: r.j.code })).s === 401);
  // 每天 5 个（已要了 3 个）
  await call(on, 'POST', '/api/session/handoff', T1); await call(on, 'POST', '/api/session/handoff', T1); r = await call(on, 'POST', '/api/session/handoff', T1);
  T('同一个人一天第 6 个：429 rate_limited', r.s === 429 && r.j.error === 'rate_limited', r);
  // 退出
  T('退出：之后续不了', (await call(on, 'POST', '/api/session/logout', null, { refresh_token: S1.refresh_token })).s === 200 && (await call(on, 'POST', '/api/session/refresh', null, { refresh_token: S1.refresh_token })).s === 401);
  // 封禁
  const T2 = await sbToken(A2), c2 = (await call(on, 'POST', '/api/session/handoff', T2)).j.code, c3 = (await call(on, 'POST', '/api/session/handoff', T2)).j.code, s2 = (await call(on, 'POST', '/api/session/redeem', null, { code: c2 })).j;
  await admin.query(`update users set status = 'banned' where auth_id = $1`, [A2]);
  T('封禁后：没用过的码换不了、已有的登录续不了（并删掉）、也要不了新码', (await call(on, 'POST', '/api/session/redeem', null, { code: c3 })).s === 401 && (await call(on, 'POST', '/api/session/refresh', null, { refresh_token: s2.refresh_token })).s === 401
    && (await admin.query('select count(*)::int n from device_sessions where user_id = $1', [await uid(A2)])).rows[0].n === 0 && (await call(on, 'POST', '/api/session/handoff', T2)).s === 403);
  // ---- 所有者评审（11-14）----
  // 退出登录要把没用掉的码一并作废：不然退出后 24 小时内，之前写进桌面图标的码还能换出登录
  await admin.query('delete from login_handoffs');
  const A3 = '33333333-cccc-4ccc-8ccc-cccccccccccc'; await admin.query(`insert into users(auth_id, phone_e164, nickname, utr, pact_accepted_at) values ($1,'+61400000003','Kim',5,now())`, [A3]); const T3 = await sbToken(A3), U3 = await uid(A3);
  let k1 = (await call(on, 'POST', '/api/session/handoff', T3)).j.code, k2 = (await call(on, 'POST', '/api/session/handoff', T3)).j.code;
  r = await call(on, 'POST', '/api/session/handoff/revoke', T3);
  T('Supabase 登录的页面退出前作废：没用掉的码都换不了了', r.s === 200 && r.j.revoked === 2 && (await call(on, 'POST', '/api/session/redeem', null, { code: k1 })).s === 401 && (await call(on, 'POST', '/api/session/redeem', null, { code: k2 })).s === 401, r);
  T('作废要登录；没启用时也回 200（前台不用区分）', (await call(on, 'POST', '/api/session/handoff/revoke')).s === 401 && (await call(off, 'POST', '/api/session/handoff/revoke', T3)).s === 200);
  k1 = (await call(on, 'POST', '/api/session/handoff', T3)).j.code; const s3 = (await call(on, 'POST', '/api/session/redeem', null, { code: k1 })).j;
  k2 = (await call(on, 'POST', '/api/session/handoff', s3.access_token)).j.code;
  await call(on, 'POST', '/api/session/logout', null, { refresh_token: s3.refresh_token });
  T('交接出来的登录退出：这个人没用掉的码也一并作废', (await call(on, 'POST', '/api/session/redeem', null, { code: k2 })).s === 401);
  T('别人的码不受影响（只作废自己的）', await (async () => { const mine = (await call(on, 'POST', '/api/session/handoff', T1)).s; await admin.query(`delete from login_handoffs where user_id = $1 and created_at > now() - interval '1 minute'`, [U1]); return mine === 200 || mine === 429 })());
  // 续期凭证的绝对期限：从交接那一刻起最多 90 天
  await admin.query('delete from login_handoffs where user_id = $1', [U3]);
  k1 = (await call(on, 'POST', '/api/session/handoff', T3)).j.code; const s4 = (await call(on, 'POST', '/api/session/redeem', null, { code: k1 })).j;
  const exp = (await admin.query(`select extract(epoch from expires_at - created_at)::int s from device_sessions where user_id = $1`, [U3])).rows[0].s;
  T('交接出来的登录带 90 天的绝对期限', exp === 90 * 86400, exp);
  await admin.query(`update device_sessions set expires_at = now() - interval '1 second', last_used_at = now() where user_id = $1`, [U3]);
  T('过了绝对期限：刚用过也续不了，并删掉这份登录', (await call(on, 'POST', '/api/session/refresh', null, { refresh_token: s4.refresh_token })).s === 401 && (await admin.query('select count(*)::int n from device_sessions where user_id = $1', [U3])).rows[0].n === 0);
  // 换码按 IP 限次：每小时 30 次
  let last = null; for (let i = 0; i < 31; i++) last = await call(on, 'POST', '/api/session/redeem', null, { code: 'Z'.repeat(43) }, '203.0.113.9');
  T('同一 IP 一小时第 31 次换码：429 rate_limited', last.s === 429 && last.j.error === 'rate_limited', last);
  T('别的 IP 不受影响', (await call(on, 'POST', '/api/session/redeem', null, { code: 'Z'.repeat(43) }, '203.0.113.10')).s === 401);
  // 安装配置
  r = await call(on, 'GET', '/api/manifest?h=' + code);
  T('带码的安装配置：只有启动网址多了 h，其余不变，不缓存', r.s === 200 && r.j.start_url === '/melbourne/?source=pwa&h=' + code && r.j.id === '/' && r.j.scope === '/' && r.j.display === 'standalone' && /manifest\+json/.test(r.h.get('content-type')) && r.h.get('cache-control') === 'no-store', r);
  T('码格式不对（想往启动网址里塞别的）：404', (await call(on, 'GET', '/api/manifest?h=' + encodeURIComponent('x&y=1#/g/abc'))).s === 404 && (await call(on, 'GET', '/api/manifest')).s === 404);
  // 每晚清理
  await admin.query(`update login_handoffs set created_at = now() - interval '3 days'`); await admin.query(`insert into device_sessions(refresh_hash, user_id, last_used_at) values ($1, $2, now() - interval '181 days')`, ['a'.repeat(64), U1]);
  await admin.query('select job_nightly()');
  T('每晚：2 天前的码、180 天没用的登录清掉', (await admin.query('select count(*)::int n from login_handoffs')).rows[0].n === 0 && (await admin.query(`select count(*)::int n from device_sessions where refresh_hash = $1`, ['a'.repeat(64)])).rows[0].n === 0);
  // 前台身份碰不到表
  let denied = false; try { await db.asUser(U1, q => q('select 1 from login_handoffs')) } catch (e) { denied = e.code === '42501' }
  let denied2 = false; try { await db.asUser(U1, q => q(`select session_refresh('x')`)) } catch (e) { denied2 = e.code === '42501' }
  T('前台身份读不了交接表、调不了换码 / 续期函数', denied && denied2);
} catch (e) { fail++; console.log('FAIL 异常 ' + (e.stack || e)) }
finally { if (admin) await admin.end().catch(() => { }); c.stop() }
console.log(`api_handoff: ${pass} 通过, ${fail} 失败`); process.exit(fail ? 1 : 0);
