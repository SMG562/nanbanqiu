// #49 PR①：运行时开关（接口层）：默认全关 → 公开读 → 暂停注册只拦新号码 → 维护页拦全部（放行白名单）→ 读不到按全关。后台切换在 pg/admin_switches 测。
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
  await admin.query(`create role nbq_api login in role nbq_user, nbq_service`);
  const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const jwk = { ...(await crypto.subtle.exportKey('jwk', kp.publicKey)), alg: 'ES256', kid: 'k1' }, U = 'https://t.supabase.co', ISS = U + '/auth/v1';
  const b64 = x => Buffer.from(x).toString('base64url');
  const token = async (sub, extra = {}) => { const h = b64(JSON.stringify({ alg: 'ES256', kid: 'k1' })), p = b64(JSON.stringify({ iss: ISS, aud: 'authenticated', sub, exp: Math.floor(Date.now() / 1000) + 3600, ...extra }));
    return h + '.' + p + '.' + b64(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, kp.privateKey, new TextEncoder().encode(h + '.' + p))) };
  const verify = makeVerifier({ url: U, fetch: async () => ({ ok: true, json: async () => ({ keys: [jwk] }) }) });
  const connect = () => async () => { const cl = new pg.Client({ host: c.host, port: c.port, user: 'nbq_api', database: 'nbq' }); await cl.connect(); return cl };
  const deps = { verify, db: makeDb(connect()), switchesTtlMs: 0 };   // 0 = 不缓存，开关一改马上生效
  const call = async (method, p, tok, body, d = deps) => { const init = { method, headers: tok ? { Authorization: 'Bearer ' + tok } : {} };
    if (body !== undefined) init.body = JSON.stringify(body);
    const r = await handleApi(new Request('https://x.test' + p, init), d); let j = null; try { j = await r.clone().json() } catch (_) { } return { s: r.status, j, h: r.headers } };
  const set = (k, v) => admin.query('update app_switches set is_on = $2 where key = $1', [k, v]);
  const OLD = '11111111-aaaa-4aaa-8aaa-aaaaaaaaaaaa', NEW = '22222222-bbbb-4bbb-8bbb-bbbbbbbbbbbb', PH = '61400000009';
  await admin.query(`insert into users(auth_id, phone_e164, nickname, utr, pact_accepted_at) values ($1,'+61400000001','老球友',6.0, now())`, [OLD]);
  const tOld = await token(OLD, { phone: '61400000001' }), tNew = await token(NEW, { phone: PH });
  const REG = { nickname: '新球友', last_initial: 'w', utr: 6.5, utr_estimated: true, avatar_kind: 'animal', avatar_animal: 'tiger', avatar_color: 'paper', card_theme: 'clay', adult: true };

  let r = await call('GET', '/api/switches');
  T('默认：三个开关都是关，不需要登录，不缓存', r.s === 200 && Object.keys(r.j.switches).length === 3 && Object.values(r.j.switches).every(v => v === false) && /no-store/.test(r.h.get('Cache-Control')), r);
  T('库里只有这三行', +(await admin.query('select count(*) from app_switches')).rows[0].count === 3);
  r = await call('GET', '/api/me', tOld); T('默认：已注册的人照常读自己', r.s === 200, r.s);

  await set('register_paused', true);
  r = await call('GET', '/api/switches'); T('暂停注册开 → 公开读能看到', r.j.switches.register_paused === true, r);
  r = await call('POST', '/api/me/register', tNew, REG); T('暂停注册：新号码注册 → 403 register_paused', r.s === 403 && r.j.error === 'register_paused', r);
  T('暂停注册：没有建出资料', +(await admin.query(`select count(*) from users where auth_id = $1`, [NEW])).rows[0].count === 0);
  r = await call('POST', '/api/me/register', await token(OLD, { phone: '61400000001' }), REG); T('暂停注册：已有资料的重复提交照旧 → 200', r.s === 200 && r.j.registered === true, r);
  r = await call('GET', '/api/me', tOld); T('暂停注册：老用户不受影响', r.s === 200, r.s);
  await set('register_paused', false);
  r = await call('POST', '/api/me/register', tNew, REG); T('关掉后恢复：新号码能注册', r.s === 200 && r.j.registered === true, r);

  await set('sms_paused', true);
  r = await call('GET', '/api/switches'); T('停发短信开 → 只是状态，接口照常（短信由前台拦）', r.j.switches.sms_paused === true && (await call('GET', '/api/me', tOld)).s === 200, r);
  await set('sms_paused', false);

  await set('maintenance', true);
  for (const [m, p, t] of [['GET', '/api/me', tOld], ['GET', '/api/venues'], ['POST', '/api/me/register', tNew]]) {
    r = await call(m, p, t, m === 'POST' ? REG : undefined); T(`维护页：${m} ${p} → 503 maintenance，带 Retry-After`, r.s === 503 && r.j.error === 'maintenance' && r.h.get('Retry-After') === '300', r);
  }
  r = await call('GET', '/api/switches'); T('维护页：读开关本身放行（前台靠它知道在维护）', r.s === 200 && r.j.switches.maintenance === true, r);
  r = await call('GET', '/api/version'); T('维护页：/api/version 放行', r.s === 200, r.s);
  r = await call('POST', '/api/client-errors', null, { msg: 'x' }); T('维护页：页面报错上报放行', r.s !== 503, r.s);
  await set('maintenance', false);
  r = await call('GET', '/api/me', tOld); T('关掉后恢复：接口照常', r.s === 200, r.s);

  // 读不到开关（库里表不见了 / 连不上）→ 按全关，不把全站拦住；缓存：默认 5 秒内不重读
  await set('maintenance', true); await call('GET', '/api/me', tOld);   // 不缓存的依赖先把「维护开」读进内存缓存
  const cached = { ...deps, switchesTtlMs: 60000 };
  await set('maintenance', false);
  r = await call('GET', '/api/me', tOld, undefined, cached); T('缓存：TTL 内还是旧值（说明没有每个请求都读库）', r.s === 503, r.s);
  r = await call('GET', '/api/me', tOld); T('不缓存的依赖马上看到新值', r.s === 200, r.s);
  await admin.query('alter table app_switches rename to app_switches_x');
  const bad = { ...deps }; r = await call('GET', '/api/me', tOld, undefined, bad); T('开关表读不到：按全关，全站照常（不被拦）', r.s === 200, r.s);
  await admin.query('alter table app_switches_x rename to app_switches');
  await new Promise(r => setTimeout(r, 200));
  const left = +(await admin.query(`select count(*) n from pg_stat_activity where usename = 'nbq_api'`)).rows[0].n;
  T('请求结束后 nbq_api 的连接全部关闭', left === 0, left);
} catch (e) { fail++; console.log('FAIL 异常', e.stack || e.message) }
finally { try { await admin?.end() } catch (_) { } c.stop() }
console.log(`switches: ${pass} 通过, ${fail} 失败`); process.exit(fail ? 1 : 0);
