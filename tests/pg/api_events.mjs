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

  const AH = '11111111-aaaa-4aaa-8aaa-aaaaaaaaaaaa', AP = '22222222-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  await admin.query(`insert into users(auth_id, phone_e164, nickname, utr) values ($1,'+61400000001','甲',6.0), ($2,'+61400000002','乙',6.0)`, [AH, AP]);
  const uid = async a => (await admin.query('select id from users where auth_id = $1', [a])).rows[0].id; const H = await uid(AH), P = await uid(AP);
  const tH = await token(AH), tP = await token(AP);
  const E = (ev, o = {}) => ({ ev, at: new Date().toISOString(), uid: null, anon: 'a_dev1', sid: 's_one1', device: 'mobile', build: 'pwa', env: 'safari_ios', os: 'ios', city: 'melb', scr: 'disc', props: {}, ...o });
  const post = (tok, events, raw) => call('POST', '/api/events', tok, raw !== undefined ? raw : { v: 2, events });
  const cnt = async w => +(await admin.query(`select count(*) n from events where ${w}`)).rows[0].n;
  let r;

  // 匿名上报
  r = await post(null, [E('session_start', { props: { entry: 'direct', landing: '/', utm_source: 'xhs', standalone: true } }), E('page_view', { props: { screen: 'disc' } })]);
  T('匿名上报 → 200，写入 2 条', r.s === 200 && r.j.n === 2, r);
  const ev = (await admin.query(`select * from events where event = 'page_view'`)).rows[0];
  T('字段落库：匿名 id / 会话 / 终端 / 环境 / 城市 / 页面', ev && ev.user_id === null && ev.anon_id === 'a_dev1' && ev.session_id === 's_one1' && ev.device === 'mobile' && ev.env === 'safari_ios' && ev.os === 'ios' && ev.city === 'melb' && ev.screen === 'disc', ev);
  const se = (await admin.query(`select * from sessions where session_id = 's_one1'`)).rows[0];
  T('会话：建一条，带来源参数、条数 = 2', se && se.events_n === 2 && se.utm_source === 'xhs' && se.standalone === true && se.landing === '/', se);
  r = await post(null, [E('app_hide')]); const se2 = (await admin.query(`select events_n from sessions where session_id = 's_one1'`)).rows[0];
  T('同一会话再来一批：条数累加，不重复建', se2.events_n === 3 && +(await admin.query(`select count(*) n from sessions`)).rows[0].n === 1, se2);

  // 过滤
  const before = await cnt('true');
  r = await post(null, [E('not_in_dictionary'), E('Bad Name'), E('page_view', { anon: 'x' }), E('page_view', { build: 'ios' }), E('apply_expired'), null, 5]);
  T('不在字典的事件名 / 格式不对 / anon 太短 / build 不对 / 服务端事件 / 非对象 → 全丢，不报错', r.s === 200 && (await cnt('true')) === before, r);
  r = await post(null, [E('page_view', { props: { screen: 'x'.repeat(3000) } })]);
  T('props 太大 → 只丢 props，事件仍记', r.s === 200 && (await cnt(`props = '{}'::jsonb and screen = 'disc' and event = 'page_view'`)) >= 1, r);
  r = await post(null, [E('page_view', { at: '2001-01-01T00:00:00Z' })]);
  const late = (await admin.query(`select occurred_at from events order by id desc limit 1`)).rows[0];
  T('时间离谱（太早）→ 用服务器时间', Math.abs(Date.now() - late.occurred_at.getTime()) < 60000, late);
  r = await post(null, [E('page_view', { city: 'nowhere' })]);
  T('不认识的城市 → 墨尔本', (await admin.query(`select city from events order by id desc limit 1`)).rows[0].city === 'melb');
  r = await post(null, Array.from({ length: 150 }, () => E('app_show')));
  T('一批最多收 100 条', r.j.n === 100, r.j);
  r = await post(null, null, '{坏的'); T('不是 JSON → 400', r.s === 400);
  r = await post(null, null, JSON.stringify({ v: 2 })); T('没有 events → 400', r.s === 400);
  r = await post(null, null, JSON.stringify({ events: [E('app_show', { props: { pad: 'y'.repeat(100000) } })] })); T('超过 96KB → 413', r.s === 413);
  r = await call('GET', '/api/events', null); T('GET → 405', r.s === 405);

  // 登录后：user_id 只认令牌
  r = await post(tH, [E('login_success', { uid: H, anon: 'a_dev1', sid: 's_two2' }), E('page_view', { uid: P, sid: 's_two2' }), E('page_view', { uid: null, sid: 's_two2' })]);
  T('带令牌：自称的 uid = 令牌对应的人 → 记 user_id；自称别人 / 没自称 → 匿名', r.j.n === 3 && (await cnt(`user_id = '${H}'`)) === 1 && (await cnt(`user_id = '${P}'`)) === 0, r.j);
  T('login_success → identity_links 记一条（设备 ↔ 账号）', (await admin.query(`select count(*) n from identity_links where anon_id = 'a_dev1' and user_id = $1`, [H])).rows[0].n === '1');
  T('会话补上登录的人', (await admin.query(`select user_id from sessions where session_id = 's_two2'`)).rows[0].user_id === H);
  r = await post(tH, [E('login_success', { uid: H, anon: 'a_dev1', sid: 's_two2' })]);
  T('重复 login_success 不报错、不重复关联', r.s === 200 && (await admin.query(`select count(*) n from identity_links`)).rows[0].n === '1');
  r = await post('bad.token.x', [E('page_view', { uid: H, sid: 's_three' })]);
  T('令牌坏了 → 仍记，但按匿名（user_id 空）', r.s === 200 && r.j.n === 1 && (await cnt(`session_id = 's_three' and user_id is null`)) === 1, r);

  // 关了「使用数据」
  await admin.query(`update users set analytics_opt_out = true where id = $1`, [P]);
  const b2 = await cnt('true'); r = await post(tP, [E('page_view', { uid: P, sid: 's_opt1' })]);
  T('关了使用数据的人：服务端不记（事件和会话都没有）', r.s === 200 && r.j.n === 0 && (await cnt('true')) === b2 && (await admin.query(`select count(*) n from sessions where session_id = 's_opt1'`)).rows[0].n === '0', r);

  // game_id / venue_id 冗余列
  const G = '99999999-9999-4999-8999-999999999999';
  r = await post(null, [E('game_view', { props: { game_id: G, venue_id: 'bad' } })]);
  T('props.game_id 是 uuid → 进 game_id 列；venue_id 不合格 → 空', r.s === 200 && (await cnt(`game_id = '${G}' and venue_id is null`)) === 1, r);
  r = await call('POST', '/api/events', null, { v: 2, events: [E('page_view')] }, { verify, db: makeDb(null) }); T('没配数据库 → 503', r.s === 503);

  await new Promise(r => setTimeout(r, 200));
  const left = +(await admin.query(`select count(*) n from pg_stat_activity where usename = 'nbq_api'`)).rows[0].n;
  T('请求结束后 nbq_api 的连接全部关闭', left === 0, left);
} catch (e) { fail++; console.log('FAIL 异常', e.stack || e.message) }
finally { try { await admin?.end() } catch (_) { } c.stop() }
console.log(`api_events: ${pass} 通过, ${fail} 失败`); process.exit(fail ? 1 : 0);
