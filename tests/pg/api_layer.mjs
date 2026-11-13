// 5g-3 第 1 步：接口层（server/api）连真实数据库：令牌 → 球友 → 以 nbq_user 身份读自己；用真正的 nbq_api 账号登录；
//   没登录 / 令牌错 / 没注册 / 已注销、健康检查、数据库连不上不泄露细节、连接用完即还。
import fs from 'fs'; import os from 'os'; import { createRequire } from 'module'; import path from 'path'; import { fileURLToPath } from 'url';
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
  r = await call('GET', '/api/version'); T('version：没有发送程序心跳时也 200，版本为空', r.s === 200 && r.j.sender.version === null && r.j.sender.heartbeat_age_s === null, r);
  await admin.query(`insert into ops_heartbeats(name, at) values ('sender', now() - interval '20 seconds'), ('sender@abc123def0', now() - interval '20 seconds') on conflict (name) do update set at = excluded.at`);
  r = await call('GET', '/api/version'); T('version：读到心跳里的代码指纹和心跳年龄，不需要登录', r.s === 200 && r.j.sender.version === 'abc123def0' && r.j.sender.heartbeat_age_s >= 19 && r.j.sender.heartbeat_age_s < 60, r);
  { const post = async (body, ip) => { const x = await handleApi(new Request('https://x.test/api/client-errors', { method: 'POST', headers: { 'cf-connecting-ip': ip || '1.1.1.1' }, body: typeof body === 'string' ? body : JSON.stringify(body) }), deps); return x.status };
    const rows = async () => (await admin.query(`select build, device, msg, src, line, n from client_errors order by msg`)).rows;
    T('页面报错：204，记进 client_errors', await post({ build: 'web', device: 'mobile', msg: 'TypeError: x', src: 'a.js', line: 7 }) === 204 && (await rows()).some(r => r.msg === 'TypeError: x' && r.build === 'web' && r.device === 'mobile' && r.line === 7));
    await post({ build: 'web', device: 'mobile', msg: 'TypeError: x', src: 'a.js', line: 7 }); T('同一条再来：按小时合并计数（n=2）', (await rows()).find(r => r.msg === 'TypeError: x').n === 2);
    const n0 = (await rows()).length;
    T('坏内容（不是 JSON / 缺 msg / 太大）：照样 204，不记', await post('not json') === 204 && await post({ build: 'web' }) === 204 && await post({ msg: 'x'.repeat(5000) }) === 204 && (await rows()).length === n0);
    await post({ build: 'hack', device: 'tv', msg: 'E2', src: 's'.repeat(300), line: -5 }); const e2 = (await rows()).find(r => r.msg === 'E2'); T('字段不合规：build / device 回退、src 截断、line 归零', e2 && e2.build === 'web' && e2.device === null && e2.src.length === 80 && e2.line === 0, e2);
    let last = 204; for (let i = 0; i < 40; i++) await post({ msg: 'flood' + i }, '9.9.9.9'); const fl = (await rows()).filter(r => /^flood/.test(r.msg)).length; T('同一个 IP 每分钟最多 30 条：多的静默丢（仍 204）', fl === 30, fl) }
  { // 还没开放的城市「开放时通知我」：POST /api/city-waitlist（11-13 补路由，之前 404）
    const post = async (body, ip) => { const x = await handleApi(new Request('https://x.test/api/city-waitlist', { method: 'POST', headers: ip ? { 'cf-connecting-ip': ip } : {}, body: typeof body === 'string' ? body : JSON.stringify(body) }), deps); let j = null; try { j = await x.json() } catch (_) { } return { s: x.status, j, h: x.headers } };
    const cnt = async () => +(await admin.query(`select count(*) from area_demand where kind='city_waitlist'`)).rows[0].count;
    r = await post({ city: 'syd', email: ' Amy@Example.com ' }, '2.2.2.1'); T('城市等候：不用登录，200 added=true，记进 area_demand', r.s === 200 && r.j.added === true && await cnt() === 1, r);
    r = await post({ city: 'syd', email: 'amy@example.com' }, '2.2.2.1'); T('城市等候：同一城市同一邮箱再提交 → 200 added=false，不重复记', r.s === 200 && r.j.added === false && await cnt() === 1, r);
    r = await post({ city: 'melb', email: 'b@x.com' }, '2.2.2.2'); T('城市等候：已开放的城市 → 422 invalid city（数据库判断）', r.s === 422 && r.j.error === 'invalid' && r.j.detail === 'city', r);
    r = await post({ city: 'SYD;--', email: 'b@x.com' }, '2.2.2.2'); T('城市等候：城市 key 格式不对 → 422，不进数据库', r.s === 422 && r.j.detail === 'city', r);
    r = await post({ city: 'syd', email: 'not-an-email' }, '2.2.2.2'); T('城市等候：邮箱格式不对 → 422 invalid email', r.s === 422 && r.j.error === 'invalid' && r.j.detail === 'email', r);
    r = await post({ city: 'syd', email: 5 }, '2.2.2.2'); T('城市等候：邮箱不是文字 → 422', r.s === 422 && r.j.detail === 'email', r);
    r = await post('not json', '2.2.2.2'); T('城市等候：不是 JSON → 400 bad_json', r.s === 400 && r.j.error === 'bad_json', r);
    r = await call('GET', '/api/city-waitlist'); T('城市等候：GET → 405', r.s === 405, r);
    const st = []; for (let i = 0; i < 7; i++) st.push((await post({ city: 'per', email: `u${i}@x.com` }, '8.8.8.8')).s);
    r = await post({ city: 'per', email: 'u9@x.com' }, '8.8.8.8');
    T('城市等候：同一 IP 每小时 5 次，第 6 次起 429 rate_limited', JSON.stringify(st) === JSON.stringify([200, 200, 200, 200, 200, 429, 429]) && r.s === 429 && r.j.error === 'rate_limited', { st, r });
    r = await post({ city: 'per', email: 'u9@x.com' }, '8.8.4.4'); T('城市等候：别的 IP 不受影响', r.s === 200 && r.j.added === true, r) }
  { const want = fs.readdirSync(path.join(DIR, 'server/migrations')).filter(f => f.endsWith('.sql') && !f.startsWith('_')).map(f => f.replace(/\.sql$/, '')).sort();
    r = await call('GET', '/api/version'); T('version：带数据库迁移版本，和代码里的迁移文件一一对上（新库）', JSON.stringify(r.j.schema && r.j.schema.versions) === JSON.stringify(want) && r.j.schema.latest === want[want.length - 1], [r.j.schema, want]);
    await admin.query(`drop table schema_migrations`); r = await call('GET', '/api/version'); T('旧库（还没有迁移记录表）：version 仍 200，schema 为空', r.s === 200 && r.j.schema === null, r);
    // 迁移文件本身：在没有记录表的库上执行 → 建表并记自己；再执行一遍不报错（可重复运行）
    const sqlf = f => fs.readFileSync(path.join(DIR, 'server/migrations', f), 'utf8');
    await admin.query(sqlf('20261103_schema_migrations.sql')); await admin.query(sqlf('20261103_schema_migrations.sql')); await admin.query(sqlf('20261102_apply_rate_loosen.sql'));
    r = await call('GET', '/api/version'); T('迁移文件可重复执行，并在 schema_migrations 记下自己', r.j.schema && r.j.schema.versions.includes('20261102_apply_rate_loosen') && r.j.schema.versions.includes('20261103_schema_migrations'), r.j.schema) }
  { // 11-04：Supabase SQL 编辑器把整段当一个事务跑；新枚举值（chat）在同一事务里不能被用（55P04）。旧库没有 chat → 整个迁移放进一个事务里跑，必须成功，且可重复
    c.createdb('nbq_old'); const oldSql = fs.readFileSync(path.join(DIR, 'schema.sql'), 'utf8').replace(",'reopen','chat');", ",'reopen');").replace("alter table notifications add column if not exists thread_id", "-- alter table notifications add column if not exists thread_id");
    const oldF = path.join(os.tmpdir(), 'nbq_old_schema.sql'); fs.writeFileSync(oldF, oldSql); const e0 = loadSchema(c, 'nbq_old', oldF); const o = new pg.Client({ host: c.host, port: c.port, user: 'postgres', database: 'nbq_old' }); await o.connect();
    let had = (await o.query(`select 1 from pg_enum where enumtypid='notif_kind'::regtype and enumlabel='chat'`)).rowCount;
    let err = null; try { await o.query('begin'); await o.query(fs.readFileSync(path.join(DIR, 'server/migrations/20261104_chat_notify.sql'), 'utf8')); await o.query('commit') } catch (e) { err = e.code + ' ' + e.message; await o.query('rollback').catch(() => {}) }
    T('旧库（无 chat）：chat_notify 迁移在单个事务里执行成功（不报 55P04）', had === 0 && !err, { had, err });
    err = null; try { await o.query('begin'); await o.query(fs.readFileSync(path.join(DIR, 'server/migrations/20261104_chat_notify.sql'), 'utf8')); await o.query('commit') } catch (e) { err = e.message; await o.query('rollback').catch(() => {}) }
    T('chat_notify 迁移可重复执行', !err, err);
    // 11-04 开打后 30 分钟内仍可申请：迁移只改函数，可重复执行，且在旧库上也在单个事务里成功
    for (const k of [1, 2]) { err = null; try { await o.query('begin'); await o.query(fs.readFileSync(path.join(DIR, 'server/migrations/20261104_late_join.sql'), 'utf8')); await o.query('commit') } catch (e) { err = e.message; await o.query('rollback').catch(() => {}) } T(`late_join 迁移第 ${k} 次执行成功（可重复）`, !err, err) }
    await o.end() }
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
  // 推送自检：只看得到自己的设备和提醒；endpoint 只用来标出「这台设备」，不会返回
  { const uid = async au => (await admin.query(`select id from users where auth_id = $1`, [au])).rows[0].id, ua = await uid(A), ub = await uid(B);
    const dA = (await admin.query(`insert into user_devices(user_id, platform, push_endpoint, push_p256dh, push_auth, push_ok_at, last_active_at) values ($1,'mobile','https://push.example/ep-A','k','a', now() - interval '5 minutes', now() - interval '2 hours') returning id`, [ua])).rows[0].id;
    await admin.query(`insert into user_devices(user_id, platform) values ($1,'desktop'), ($2,'mobile')`, [ua, ub]);
    await admin.query(`update user_devices set push_endpoint = 'https://push.example/ep-B', push_p256dh = 'k', push_auth = 'a' where user_id = $1`, [ub]);
    const nA = (await admin.query(`insert into notifications(user_id, kind) values ($1,'badge') returning id`, [ua])).rows[0].id;
    await admin.query(`insert into notification_deliveries(notification_id, channel, device_id, reason) values ($1,'in_app',null,'active_device'), ($1,'push_mobile',$2,'mobile_first')`, [nA, dA]);
    await admin.query(`insert into notifications(user_id, kind) values ($1,'badge')`, [ub]);
    const diag = async (au, body) => { const x = await handleApi(new Request('https://x.test/api/me/push-diag', { method: 'POST', headers: { Authorization: 'Bearer ' + await token(au), 'Content-Type': 'application/json' }, body: JSON.stringify(body) }), deps); return { s: x.status, j: await x.json().catch(() => null) } };
    let d = await diag(A, { endpoint: 'https://push.example/ep-A' });
    T('推送自检：200，返回自己的 2 台设备，订阅了推送的那台被标成「这台设备」', d.s === 200 && d.j.devices.length === 2 && d.j.devices.filter(x => x.this).length === 1 && d.j.devices.find(x => x.this).platform === 'mobile' && d.j.devices.find(x => x.this).push === true, d);
    T('推送自检：电脑设备没开推送 → push false；返回里没有推送地址原文', d.j.devices.find(x => x.platform === 'desktop').push === false && !JSON.stringify(d.j).includes('push.example'), d.j);
    const rn = d.j.recent.find(x => x.id === String(nA)); T('推送自检：最近提醒带每条的去向（应用内 + 推手机，及原因、设备）', rn && rn.deliveries.length === 2 && rn.deliveries[0].channel === 'in_app' && rn.deliveries[1].channel === 'push_mobile' && rn.deliveries[1].reason === 'mobile_first' && rn.deliveries[1].platform === 'mobile', rn);
    d = await diag(A, {}); T('推送自检：不传 endpoint → 没有「这台设备」', d.s === 200 && d.j.devices.every(x => !x.this), d);
    d = await diag(B, { endpoint: 'https://push.example/ep-A' }); T('推送自检：B 看不到 A 的设备和提醒，A 的地址在 B 这里标不出「这台」', d.j.devices.length === 1 && d.j.devices[0].this === false && d.j.recent.length === 1 && !d.j.recent.some(x => x.id === String(nA)), d.j);
    const x0 = await handleApi(new Request('https://x.test/api/me/push-diag', { method: 'POST', body: '{}' }), deps); T('推送自检：没登录 → 401', x0.status === 401);
    d = await diag(A, { endpoint: 'x'.repeat(2000) }); T('推送自检：过长的 endpoint 当没传，不报错', d.s === 200 && d.j.devices.every(x => !x.this), d.s) }
  r = await call('GET', '/api/me', await token(N)); T('令牌有效但还没注册 → registered false', r.s === 200 && r.j.registered === false, r);
  r = await call('GET', '/api/me', await token(G)); T('从没见过的 sub → registered false，不报错', r.s === 200 && r.j.registered === false);
  r = await call('GET', '/api/me', await token(A), { verify, db: makeDb(null) }); T('没配数据库 → 503 db_unavailable', r.s === 503 && r.j.error === 'db_unavailable', r);
  r = await call('GET', '/api/me', null, { verify, db: makeDb(null) }); T('没配数据库时没带令牌仍是 401（先验令牌）', r.s === 401);

  // 连不上数据库：不泄露细节
  const boom = { verify, db: makeDb(async () => { throw new Error('connect ECONNREFUSED db.secret-host.example:5432 password=hunter2') }) };
  const log = console.error; console.error = () => { }; r = await call('GET', '/api/me', await token(A), boom); console.error = log;
  T('数据库连不上 → 503，响应里没有地址和密码', r.s === 503 && r.j.error === 'db_unavailable' && !/secret-host|hunter2|ECONNREFUSED/.test(JSON.stringify(r.j) + [...r.h].join()), r);


  // ---- 第 2 步：只读接口 ----
  const HA = (await admin.query(`select id from users where auth_id = $1`, [A])).rows[0].id, HB = (await admin.query(`select id from users where auth_id = $1`, [B])).rows[0].id;
  const V1 = (await admin.query(`insert into venues(name, short_name, suburb, location) values ('Glen Iris Tennis Club','Glen Iris','Glen Iris', st_makepoint(145.05, -37.86)::geography) returning id`)).rows[0].id;
  const mkGame = async (host, code, vis, hours) => (await admin.query(`insert into games(share_code, host_id, venue_id, starts_at, duration_min, game_type, capacity, utr_min, utr_max, visibility, venue_name)
    values ($1,$2,$3, now() + ($4 || ' hours')::interval, 90, 'singles', 2, 4.0, 8.0, $5, null) returning id`, [code, host, V1, String(hours), vis])).rows[0].id;
  const g1 = await mkGame(HA, 'Ab12', 'public', 5), g2 = await mkGame(HA, 'Zz99', 'private', 6), g3 = await mkGame(HB, 'Cd34', 'public', 2);
  await mkGame(HA, 'Old1', 'public', 9); await admin.query(`update games set status = 'cancelled' where share_code = 'Old1'`);
  r = await call('GET', '/api/venues'); T('venues：不用登录；有坐标，没有内部列', r.s === 200 && r.j.venues.length === 1 && r.j.venues[0].lat === -37.86 && r.j.venues[0].lng === 145.05 && r.j.venues[0].name === 'Glen Iris Tennis Club', r);
  // 匿名浏览（10-30 定）：没有 Authorization 也能看公开的、非女生局的球局；令牌坏了仍是 401
  await admin.query(`update games set tags = array['women'] where share_code = 'Cd34'`);
  r = await call('GET', '/api/games'); T('games：没登录也能看公开球局（私人的、女生局的、已取消的都不给）', r.s === 200 && r.j.anon === true && r.j.games.map(x => x.share_code).join() === 'Ab12', r.j.games?.map(x => x.share_code));
  T('games（匿名）：带发起人昵称和余位，没有手机号 / 登录 id / 设备等内部列', r.j.games[0].host_nickname === '小明' && r.j.games[0].spots_left === 1 && !/phone|auth_id|\+61|device|secret/i.test(JSON.stringify(r.j)), r.j.games[0]);
  r = await call('GET', '/api/games', 'bad.token.here'); T('games：令牌是坏的 → 401（不当成匿名）', r.s === 401, r.s);
  await admin.query(`update games set tags = '{}' where share_code = 'Cd34'`);
  r = await call('GET', '/api/games', await token(N)); T('games：令牌有效但没注册 → 403 not_registered', r.s === 403 && r.j.error === 'not_registered', r);
  r = await call('GET', '/api/games', await token(B));
  T('games：B 看到公开的两局（按开打时间排，已取消的不出现），看不到 A 的私人球局', r.s === 200 && r.j.games.map(x => x.share_code).join() === 'Cd34,Ab12', r.j.games?.map(x => x.share_code));
  T('games：带发起人昵称和余位，没有手机号等私密列', r.j.games[1].host_nickname === '小明' && r.j.games[1].spots_left === 1 && r.j.games[1].approved_count === 1 && r.j.games[1].pending_count === 0, r.j.games[1]);
  T('games：返回里没有手机号 / 登录 id', !/phone|auth_id|\+61/.test(JSON.stringify(r.j)));
  r = await call('GET', '/api/games', await token(A)); T('games：A 自己的私人球局 A 能看到', r.j.games.some(x => x.share_code === 'Zz99'), r.j.games?.map(x => x.share_code));
  r = await call('GET', '/api/game?code=Ab12', await token(B)); T('game：按分享码取到球局', r.s === 200 && r.j.game.share_code === 'Ab12', r);
  r = await call('GET', '/api/game?code=Zz99', await token(B)); T('game：别人的私人球局 → 404（和不存在一样）', r.s === 404 && r.j.error === 'not_found', r);
  r = await call('GET', '/api/game?code=Nope', await token(B)); T('game：不存在 → 404', r.s === 404);
  r = await call('GET', "/api/game?code=x';drop", await token(B)); T('game：分享码格式不对 → 400', r.s === 400 && r.j.error === 'bad_code');
  r = await call('GET', '/api/game?code=Ab12'); T('game：没登录也能按分享码看公开球局', r.s === 200 && r.j.anon === true && r.j.game.share_code === 'Ab12', r);
  r = await call('GET', '/api/game?code=Zz99'); T('game（匿名）：私人球局 → 404', r.s === 404, r);
  await admin.query(`update games set tags = array['women'] where share_code = 'Ab12'`);
  r = await call('GET', '/api/game?code=Ab12'); T('game（匿名）：女生局 → 404（登录的女生才看得到）', r.s === 404, r);
  await admin.query(`update games set tags = '{}' where share_code = 'Ab12'`);
  r = await call('GET', '/api/profile?id=' + HA, await token(B)); T('profile：B 看 A 的公开资料', r.s === 200 && r.j.profile.nickname === '小明', r);
  T('profile：没有手机号 / 登录 id / 微信号 / 邮箱', !/phone|auth_id|wechat|email|\+61/.test(JSON.stringify(r.j)), r.j);
  r = await call('GET', '/api/profile?id=' + G, await token(B)); T('profile：不存在 → 404', r.s === 404);
  r = await call('GET', '/api/profile?id=abc', await token(B)); T('profile：id 格式不对 → 400', r.s === 400);
  r = await call('GET', '/api/games', await token(A), { verify, db: makeDb(null) }); T('games：没配数据库 → 503', r.s === 503);

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
