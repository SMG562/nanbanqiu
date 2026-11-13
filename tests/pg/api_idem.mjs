// #276 PR②：写接口幂等的接口层。发起球局 / 发消息 / 场边发帖 / 场边回复这 4 个接口带 Idempotency-Key 请求头时，同一个 key 发两次只生效一次。
//   为什么：#63 盘点——服务器写进去了但响应丢了（断网 / 超时），用户再点一次会建出两局、发出两条消息（api_spec §0.2 第 3 条）。
//   查什么：每个接口同一个 key 两次 → 第二次 200、返回的 id 和第一次一样、库里只多一行；不带 key 的旧前台照旧（两次 = 两行）；
//           换个 key = 新的一次；同一个 key 用到别的接口 → 409 idempotency_key_reused；key 格式不对 → 422；第一次失败（422）不占 key；
//           别的接口带了 key 也不受影响（只有这 4 个 opt-in）。
//   查不到什么：同时来两次（pg/idempotency 在数据库层测了）、前台什么时候生成 key（PR③）。
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
  const call = async (method, p, tok, body, key) => { const d = deps; const init = { method, headers: { ...(tok ? { Authorization: 'Bearer ' + tok } : {}), ...(key ? { 'Idempotency-Key': key } : {}) } };
    if (body !== undefined) init.body = typeof body === 'string' ? body : JSON.stringify(body);
    const r = await handleApi(new Request('https://x.test' + p, init), d); let j = null; try { j = await r.clone().json() } catch (_) { } return { s: r.status, j, h: r.headers } };

  const AH = '11111111-aaaa-4aaa-8aaa-aaaaaaaaaaaa', AP = '22222222-bbbb-4bbb-8bbb-bbbbbbbbbbbb', AQ = '33333333-cccc-4ccc-8ccc-cccccccccccc', AN = '44444444-dddd-4ddd-8ddd-dddddddddddd';
  await admin.query(`insert into users(auth_id, phone_e164, nickname, utr, pact_accepted_at) values ($1,'+61400000001','发起人',6.0, now()), ($2,'+61400000002','球友P',6.0, now()), ($3,'+61400000003','球友Q',6.0, null)`, [AH, AP, AQ]);
  const uid = async a => (await admin.query('select id from users where auth_id = $1', [a])).rows[0].id; const H = await uid(AH), P = await uid(AP), Q = await uid(AQ);
  const V = (await admin.query(`insert into venues(name, short_name, suburb, location) values ('Glen Iris Tennis Club','Glen Iris','Glen Iris', st_makepoint(145.05, -37.86)::geography) returning id`)).rows[0].id;
  const slot = async (off, hm) => (await admin.query(`select ((mel_today() + $1::int)::timestamp + $2::time) at time zone 'Australia/Melbourne' as t`, [off, hm])).rows[0].t.toISOString();
  const tH = await token(AH), tP = await token(AP), tQ = await token(AQ), tN = await token(AN);
  const NG = async (extra = {}) => ({ venue_id: V, starts_at: await slot(2, '18:00'), duration_min: 90, game_type: 'singles', utr_min: 4, utr_max: 8, ...extra });

  const n = async (t, w = '') => +(await admin.query(`select count(*) from ${t} ${w}`)).rows[0].count;
  const K = i => 'test-key-' + String(i).padStart(12, '0');
  let r, r2, before;

  // ---------- 发起球局 ----------
  before = await n('games');
  r = await call('POST', '/api/games', tH, await NG(), K(1)); r2 = await call('POST', '/api/games', tH, await NG(), K(1));
  T('发局：同一个 key 两次 → 都是 200，id 和分享码一样', r.s === 200 && r2.s === 200 && r.j.id === r2.j.id && r.j.share_code === r2.j.share_code, [r, r2]);
  T('发局：库里只多 1 局', await n('games') === before + 1);
  r2 = await call('POST', '/api/games', tH, await NG({ starts_at: await slot(3, '18:00') }), K(2)); T('发局：换个 key → 新的一局', r2.s === 200 && r2.j.id !== r.j.id && await n('games') === before + 2, r2);
  r = await call('POST', '/api/games', tP, await NG({ starts_at: await slot(4, '18:00') })); r2 = await call('POST', '/api/games', tP, await NG({ starts_at: await slot(4, '18:00') }));   // 换个人发：一人进行中最多 5 局
  T('发局：不带 key（旧前台）→ 照旧，两次两局', r.s === 200 && r2.s === 200 && r.j.id !== r2.j.id && await n('games') === before + 4, [r, r2]);
  r = await call('POST', '/api/games', tH, await NG({ game_type: 'x' }), K(3)); T('发局：第一次填错 → 422', r.s === 422, r);
  r = await call('POST', '/api/games', tH, await NG({ starts_at: await slot(5, '18:00') }), K(3)); T('发局：填错过的 key 改对再发 → 照常建局', r.s === 200 && r.j.id, r);
  r = await call('POST', '/api/games', tH, await NG(), 'short'); T('发局：key 格式不对 → 422 invalid', r.s === 422 && r.j.error === 'invalid', r);
  const G = (await call('POST', '/api/games', tH, await NG({ starts_at: await slot(6, '18:00') }), K(4))).j.id;

  // ---------- 发消息 ----------
  const TH = (await call('POST', '/api/threads', tP, { user_id: H })).j.id; before = await n('messages');
  r = await call('POST', `/api/threads/${TH}/messages`, tP, { body: '你好' }, K(10)); r2 = await call('POST', `/api/threads/${TH}/messages`, tP, { body: '你好' }, K(10));
  T('发消息：同一个 key 两次 → 同一个消息 id', r.s === 200 && r2.s === 200 && r.j.id === r2.j.id, [r, r2]);
  T('发消息：库里只多 1 条', await n('messages') === before + 1);
  r = await call('POST', `/api/threads/${TH}/messages`, tP, { body: '你好' }, K(1)); T('发消息：用别人（发起人）用过的 key → 各算各的，照常发', r.s === 200 && r.j.id !== r2.j.id, r);
  r = await call('POST', `/api/threads/${TH}/messages`, tH, { body: '你好' }, K(1)); T('同一个人把发局的 key 用到发消息 → 409 idempotency_key_reused', r.s === 409 && r.j.error === 'idempotency_key_reused', r);
  r = await call('POST', `/api/threads/${TH}/messages`, tP, { body: '再见' }); r2 = await call('POST', `/api/threads/${TH}/messages`, tP, { body: '再见' });
  T('发消息：不带 key → 照旧，两条', r.s === 200 && r2.s === 200 && r.j.id !== r2.j.id, [r, r2]);

  // ---------- 场边发帖 / 回复 ----------
  before = await n('sb_posts');
  const SB = { body: '今天球场很安静', venue_id: V, topic_title: '清晨球场' };
  r = await call('POST', '/api/sideline/posts', tP, SB, K(20)); r2 = await call('POST', '/api/sideline/posts', tP, SB, K(20));
  T('场边发帖：同一个 key 两次 → 同一条帖子、同一个编号', r.s === 200 && r2.s === 200 && r.j.id === r2.j.id && r.j.floor === r2.j.floor, [r, r2]);
  T('场边发帖：库里只多 1 条', await n('sb_posts') === before + 1);
  const PID = r.j.id; before = await n('sb_replies');
  r = await call('POST', `/api/sideline/posts/${PID}/replies`, tH, { body: '早上好' }, K(30)); r2 = await call('POST', `/api/sideline/posts/${PID}/replies`, tH, { body: '早上好' }, K(30));
  T('场边回复：同一个 key 两次 → 同一条回复', r.s === 200 && r2.s === 200 && r.j.id === r2.j.id, [r, r2]);
  T('场边回复：库里只多 1 条', await n('sb_replies') === before + 1);

  // ---------- 别的接口不受影响 ----------
  r = await call('POST', `/api/games/${G}/requests`, tP, {}, K(40)); r2 = await call('POST', `/api/games/${G}/requests`, tP, {}, K(40));
  T('申请（没 opt-in）带 key：照旧，第二次 409 already_applied', r.s === 200 && r2.s === 409 && r2.j.error === 'already_applied', [r, r2]);
  T('没 opt-in 的接口不记 key', await n('idempotency_keys', `where key = '${K(40)}'`) === 0);
} catch (e) { fail++; console.log('FAIL 异常', e.stack || e.message) }
finally { try { await admin?.end() } catch (_) { } c.stop() }
console.log(`api_idem: ${pass} 通过, ${fail} 失败`); process.exit(fail ? 1 : 0);
