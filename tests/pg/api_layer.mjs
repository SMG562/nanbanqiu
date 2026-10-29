// 5g-3 第 1 步：接口层（server/api）连真实数据库：令牌 → 球友 → 以 nbq_user 身份读自己；用真正的 nbq_api 账号登录；
//   没登录 / 令牌错 / 没注册 / 已注销、健康检查、数据库连不上不泄露细节、连接用完即还。
import fs from 'fs'; import { createRequire } from 'module'; import path from 'path'; import { fileURLToPath } from 'url';
import { startCluster, loadSchema } from './cluster.mjs';
const require = createRequire(import.meta.url); const pg = require('pg');
const HERE = path.dirname(fileURLToPath(import.meta.url)), DIR = process.env.NBQ_DIR || path.join(HERE, '..', '..');
const { handleApi } = await import(path.join(DIR, 'server/api/handler.mjs')), { makeVerifier } = await import(path.join(DIR, 'server/api/jwt.mjs')), { makeDb } = await import(path.join(DIR, 'server/api/db.mjs'));
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 500) : '')) };

const c = startCluster(); let admin;
try {
  c.createdb('nbq');
  const errs = loadSchema(c, 'nbq', path.join(DIR, 'schema.sql')); T('schema 执行无错误', !errs.length, errs.slice(0, 3));
  admin = new pg.Pool({ host: c.host, port: c.port, user: 'postgres', database: 'nbq', max: 2 });
  await admin.query(`create role nbq_api login in role nbq_user, nbq_service`);   // 和正式环境一致：API 用的账号只属于这两个角色

  // 令牌：现生成 ES256 密钥，公钥通过假的 fetch 提供
  const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const jwk = { ...(await crypto.subtle.exportKey('jwk', kp.publicKey)), alg: 'ES256', kid: 'k1' }, U = 'https://t.supabase.co', ISS = U + '/auth/v1';
  const b = x => Buffer.from(x).toString('base64url');
  const token = async (sub, over = {}) => { const h = b(JSON.stringify({ alg: 'ES256', kid: 'k1' })), p = b(JSON.stringify({ iss: ISS, aud: 'authenticated', sub, exp: Math.floor(Date.now() / 1000) + 600, ...over }));
    return h + '.' + p + '.' + b(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, kp.privateKey, new TextEncoder().encode(h + '.' + p))) };
  const verify = makeVerifier({ url: U, fetch: async () => ({ ok: true, json: async () => ({ keys: [jwk] }) }) });
  const connect = () => async () => { const cl = new pg.Client({ host: c.host, port: c.port, user: 'nbq_api', database: 'nbq' }); await cl.connect(); return cl };
  const deps = { verify, db: makeDb(connect()) };
  const call = async (method, p, tok, d = deps) => { const r = await handleApi(new Request('https://x.test' + p, { method, headers: tok ? { Authorization: 'Bearer ' + tok } : {} }), d); let j = null; try { j = await r.clone().json() } catch (_) { } return { s: r.status, j, h: r.headers } };

  const A = '11111111-aaaa-4aaa-8aaa-aaaaaaaaaaaa', B = '22222222-bbbb-4bbb-8bbb-bbbbbbbbbbbb', G = '33333333-cccc-4ccc-8ccc-cccccccccccc', N = '44444444-dddd-4ddd-8ddd-dddddddddddd';
  await admin.query(`insert into users(auth_id, phone_e164, nickname, last_initial, utr) values ($1,'+61400000001','小明','W',6.5), ($2,'+61400000002','小红',null,7.0)`, [A, B]);
  await admin.query(`insert into users(auth_id, phone_e164, nickname, utr) values (null,'deleted:x','已注销',5.0)`);

  // 健康检查
  let r = await call('GET', '/api/health'); T('health：200，不碰数据库', r.s === 200 && r.j.ok === true && r.j.db === null, r);
  r = await call('GET', '/api/health?db=1'); T('health?db=1：连得上 → db true', r.s === 200 && r.j.db === true, r);
  r = await call('GET', '/api/health?db=1', null, { verify, db: makeDb(null) }); T('没配数据库：health?db=1 → 503、db false、原因 not_configured', r.s === 503 && r.j.db === false && r.j.why === 'not_configured', r);
  { const mk = e => ({ verify, db: makeDb(async () => { throw e }) }), W = async e => (await call('GET', '/api/health?db=1', null, mk(e))).j.why;
    T('health 失败原因分类：密码错 / 用户名格式 / 网络 / 其他，且不含原文', await W(Object.assign(new Error('password authentication failed for user "nbq_api"'), { code: '28P01' })) === 'auth_failed' && await W(new Error('Tenant or user not found')) === 'user_not_found' && await W(Object.assign(new Error('getaddrinfo ENOTFOUND db.x.co'), { code: 'ENOTFOUND' })) === 'network' && await W(new Error('boom')) === 'other');
    const leak = JSON.stringify((await call('GET', '/api/health?db=1', null, mk(Object.assign(new Error('secret-host.example hunter2'), { code: 'ECONNREFUSED' })))).j); T('分类结果里没有地址和密码', !/secret-host|hunter2/.test(leak), leak); }
  r = await call('HEAD', '/api/health'); T('HEAD 可用', r.s === 200);

  // /api/me
  r = await call('GET', '/api/me'); T('没带令牌 → 401 unauthorized', r.s === 401 && r.j.error === 'unauthorized', r);
  r = await call('GET', '/api/me', 'garbage'); T('乱写的令牌 → 401', r.s === 401 && r.j.error === 'unauthorized');
  r = await call('GET', '/api/me', await token(A, { exp: 1 })); T('过期令牌 → 401，原因在响应头', r.s === 401 && r.h.get('X-Auth-Reason') === 'expired', r.h.get('X-Auth-Reason'));
  r = await call('GET', '/api/me', await token(A, { aud: 'anon' })); T('anon 令牌（公开 key 换来的）→ 401', r.s === 401);
  r = await call('GET', '/api/me', await token(A));
  T('A 的令牌 → registered，拿到 A 自己的资料', r.s === 200 && r.j.registered === true && r.j.user.nickname === '小明' && r.j.user.last_initial === 'W' && Number(r.j.user.utr) === 6.5, r);
  T('资料里没有手机号 / 登录 id / 邮箱', !/phone|auth_id|email|\+61/.test(JSON.stringify(r.j)), r.j);
  r = await call('GET', '/api/me', await token(B)); T('B 的令牌 → B 自己的资料（不会拿到 A 的）', r.j.user?.nickname === '小红');
  r = await call('GET', '/api/me', await token(N)); T('令牌有效但还没注册 → registered false', r.s === 200 && r.j.registered === false, r);
  r = await call('GET', '/api/me', await token(G)); T('从没见过的 sub → registered false，不报错', r.s === 200 && r.j.registered === false);
  r = await call('GET', '/api/me', await token(A), { verify, db: makeDb(null) }); T('没配数据库 → 503 db_unavailable', r.s === 503 && r.j.error === 'db_unavailable', r);
  r = await call('GET', '/api/me', null, { verify, db: makeDb(null) }); T('没配数据库时没带令牌仍是 401（先验令牌）', r.s === 401);

  // 连不上数据库：不泄露细节
  const boom = { verify, db: makeDb(async () => { throw new Error('connect ECONNREFUSED db.secret-host.example:5432 password=hunter2') }) };
  const log = console.error; console.error = () => { }; r = await call('GET', '/api/me', await token(A), boom); console.error = log;
  T('数据库连不上 → 503，响应里没有地址和密码', r.s === 503 && r.j.error === 'db_unavailable' && !/secret-host|hunter2|ECONNREFUSED/.test(JSON.stringify(r.j) + [...r.h].join()), r);

  // 路由
  r = await call('GET', '/api/nope'); T('不存在的路径 → 404 not_found', r.s === 404 && r.j.error === 'not_found');
  r = await call('POST', '/api/me', await token(A)); T('方法不对 → 405', r.s === 405 && r.j.error === 'method_not_allowed');
  r = await call('GET', '/api/me/', await token(A)); T('末尾斜杠同样处理', r.s === 200);
  T('响应不缓存、声明 JSON', (await call('GET', '/api/health')).h.get('Cache-Control') === 'no-store' && /json/.test((await call('GET', '/api/health')).h.get('Content-Type')));

  // nbq_api 的权限：只有 nbq_user / nbq_service 的能力，没有后台权限、不能直接建表
  const cl = await connect()(); const can = async s => cl.query(s).then(() => true, () => false);
  await cl.query('begin'); await cl.query('set local role nbq_user');
  T('切成 nbq_user 但没设 uid：读不到任何球友（策略兜底）', (await cl.query('select count(*) n from users')).rows[0].n === '0');
  await cl.query('rollback');
  T('不能切成后台角色', !(await can('set role nbq_admin')));
  T('不能建表', !(await can('create table zzz(a int)')));
  await cl.end();

  // 连接用完即还
  await new Promise(r => setTimeout(r, 200));
  const left = +(await admin.query(`select count(*) n from pg_stat_activity where usename = 'nbq_api'`)).rows[0].n;
  T('请求结束后 nbq_api 的连接全部关闭', left === 0, left);
} catch (e) { fail++; console.log('FAIL 异常', e.stack || e.message) }
finally { try { await admin?.end() } catch (_) { } c.stop() }
console.log(`api_layer: ${pass} 通过, ${fail} 失败`); process.exit(fail ? 1 : 0);
