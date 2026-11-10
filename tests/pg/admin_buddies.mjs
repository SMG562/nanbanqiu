// 球友（#110 PR-A3）：后台统计接口 GET /admin/api/buddies/stats + 数据库 buddy_stats。
// 真 PostgreSQL + 真的 nbq_admin_api 连接；夹具用超级用户建（直接写 buddy_requests / buddies，状态和时间都可控）。
// 覆盖：权限（未登录 / 只读能看汇总 / 运营）· 各项数字的口径（确认 / 互扫 / 忽略 / 过期 / 等待 / 来自链接 / 确认率 / 用时中位数 / 球友对）·
//       时间窗 · 限城市 · 参数校验 · 只读角色不能直接查原始表。
import { createRequire } from 'module'; import path from 'path'; import { fileURLToPath, pathToFileURL } from 'url';
import { startCluster, loadSchema } from './cluster.mjs';
const require = createRequire(import.meta.url); const pg = require('pg');
const HERE = path.dirname(fileURLToPath(import.meta.url)), DIR = process.env.NBQ_DIR || path.join(HERE, '..', '..');
const AU = await import(pathToFileURL(path.join(DIR, 'server/admin/auth.mjs')));
const API = await import(pathToFileURL(path.join(DIR, 'server/admin/api.mjs')));
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 600) : '')) };
const c = startCluster(); let su;
try {
  c.createdb('nbq');
  const errs = loadSchema(c, 'nbq', path.join(DIR, 'schema.sql')); T('schema 执行无错误', !errs.length, errs.slice(0, 3));
  c.psql('nbq', `-c "alter role nbq_admin_api login"`);
  su = new pg.Pool({ host: c.host, port: c.port, user: 'postgres', database: 'nbq', max: 4 });
  const connect = async () => { const cl = new pg.Client({ host: c.host, port: c.port, user: 'nbq_admin_api', database: 'nbq' }); await cl.connect(); return cl };
  const q = (s, p) => su.query(s, p), one = async (s, p) => (await q(s, p)).rows[0];
  const PW = 'correct horse battery', SEC = AU.newTotpSecret(), PH = AU.hashPassword(PW);
  const mk = async (email, role, cities = null) => (await one(`insert into admin_users(email,name,role,password_hash,totp_secret,recovery_hashes,cities) values ($1,$2,$3,$4,$5,'{}',$6) returning id`, [email, email.split('@')[0], role, PH, SEC, cities])).id;
  const OP = await mk('ops@x.com', 'operator'), VW = await mk('view@x.com', 'viewer'), SYD = await mk('syd@x.com', 'operator', ['syd']);
  let un = 0; const user = async (nick, city = 'melb') => (await one(`insert into users(phone_e164,nickname,utr,gender,pact_accepted_at,home_city) values ($1,$2,5,'m',now(),$3) returning id`, ['+6142' + String(++un).padStart(7, '0'), nick, city])).id;
  const A = await user('小A'), B = await user('小B'), C = await user('小C'), S1 = await user('悉尼1', 'syd'), S2 = await user('悉尼2', 'syd');
  let clock = 1_800_000_000_000; const deps = { connect, now: () => clock }; const ORIGIN = 'https://nanbanqiu.test';
  const call = async (method, p, { body, cookie } = {}) => {
    const h = { 'X-NBQ-Admin': '1', ...(method !== 'GET' ? { Origin: ORIGIN, 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}) };
    const r = await API.handleAdmin(new Request(ORIGIN + p, { method, headers: h, body: method === 'GET' ? undefined : JSON.stringify(body ?? {}) }), deps);
    const text = await r.text(); let j = null; try { j = JSON.parse(text) } catch (_) { } return { s: r.status, j, text } };
  const login = async email => { clock += 30e3; const r = await API.handleAdmin(new Request(ORIGIN + '/admin/api/login', { method: 'POST', headers: { 'X-NBQ-Admin': '1', Origin: ORIGIN, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: PW, code: AU.totp(SEC, clock) }) }), deps); return 'nbq_admin=' + (r.headers.get('Set-Cookie').match(/nbq_admin=([^;]+)/) || [])[1] };
  const op = await login('ops@x.com'), vw = await login('view@x.com'), sy = await login('syd@x.com');

  // 夹具：最近 30 天内 A 发了 6 条（各种结局），悉尼 S1 发了 1 条；另有一条 40 天前的
  const req = (f, t, o = {}) => one(`insert into buddy_requests(from_user,to_user,status,source,accepted_via,created_at,expires_at,responded_at)
      values ($1,$2,$3,$4,$5,now() - ($6||' hours')::interval, now() - ($6||' hours')::interval + interval '24 hours', case when $7::numeric is null then null else now() - ($6||' hours')::interval + ($7||' minutes')::interval end) returning id`,
    [f, t, o.st ?? 'pending', o.src ?? 'qr', o.via ?? null, String(o.ago ?? 1), o.min ?? null]);
  await req(A, B, { st: 'accepted', via: 'confirm', ago: 50, min: 2 });
  await req(A, C, { st: 'accepted', via: 'confirm', ago: 60, min: 10 });
  await req(B, A, { st: 'accepted', via: 'mutual', ago: 70, min: 0 });
  await req(A, S1, { st: 'ignored', ago: 80, min: 5, src: 'link' });
  await req(C, A, { st: 'pending', ago: 30 });                 // 过期了还是 pending → 算过期
  await req(C, B, { st: 'pending', ago: 1, src: 'link' });     // 还在等
  await req(S1, S2, { st: 'accepted', via: 'confirm', ago: 5, min: 6 });
  await req(B, C, { st: 'accepted', via: 'confirm', ago: 40 * 24, min: 1 });   // 40 天前：不在默认时间窗
  const pair = (x, y, ago) => q(`insert into buddies(user_a,user_b,created_at) values (least($1::uuid,$2::uuid),greatest($1::uuid,$2::uuid),now() - ($3||' hours')::interval)`, [x, y, String(ago)]);
  await pair(A, B, 50); await pair(A, C, 60); await pair(S1, S2, 5); await pair(B, C, 40 * 24);
  const now = () => new Date().toISOString();

  let r = await call('GET', '/admin/api/buddies/stats'); T('未登录 → 401', r.s === 401, r);
  r = await call('GET', '/admin/api/buddies/stats?to=' + encodeURIComponent(now()), { cookie: op }); const s = r.j && r.j.stats;
  T('运营：200，返回时间窗', r.s === 200 && !!r.j.from && !!r.j.to, r);
  T('申请数 7（不含 40 天前那条）· 发申请 4 人 · 收申请 5 人', s.requests === 7 && s.senders === 4 && s.receivers === 5, s);
  T('确认 3 · 互扫 1 · 忽略 1 · 过期 1 · 等待 1', s.accepted_confirm === 3 && s.accepted_mutual === 1 && s.ignored === 1 && s.expired === 1 && s.pending === 1, s);
  T('来自链接 2', s.from_link === 2, s);
  T('确认率 = 成了 4 ÷ 已有结果 6 = 0.667', s.accept_rate === 0.667, s);
  T('确认用时中位数 = 6 分钟（2 / 6 / 10；互扫不算）', s.median_accept_min === 6, s);
  T('新增球友对 3 · 累计 4', s.new_pairs === 3 && s.total_pairs === 4, s);
  r = await call('GET', '/admin/api/buddies/stats?to=' + encodeURIComponent(now()), { cookie: vw }); T('只读角色：能看汇总数字（和运营一样）', r.s === 200 && JSON.stringify(r.j.stats) === JSON.stringify(s), r);
  r = await call('GET', '/admin/api/buddies/stats?to=' + encodeURIComponent(now()), { cookie: sy });
  T('只负责悉尼：只算悉尼发出的申请和悉尼的球友对', r.s === 200 && r.j.stats.requests === 1 && r.j.stats.accepted_confirm === 1 && r.j.stats.new_pairs === 1 && r.j.stats.total_pairs === 1, r);
  r = await call('GET', `/admin/api/buddies/stats?from=${encodeURIComponent(new Date(Date.now() - 45 * 864e5).toISOString())}&to=${encodeURIComponent(now())}`, { cookie: op });
  T('时间窗拉到 45 天：算上 40 天前那条', r.s === 200 && r.j.stats.requests === 8 && r.j.stats.new_pairs === 4, r);
  r = await call('GET', `/admin/api/buddies/stats?from=${encodeURIComponent(new Date(Date.now() - 864e5 * 400).toISOString())}&to=${encodeURIComponent(new Date(Date.now() - 864e5 * 399).toISOString())}`, { cookie: op });
  T('没有数据的时间窗：0，确认率和中位数是 null（不是 0）', r.s === 200 && r.j.stats.requests === 0 && r.j.stats.accept_rate === null && r.j.stats.median_accept_min === null, r);
  for (const qs of ['from=abc', 'to=xyz', `from=${encodeURIComponent(now())}&to=${encodeURIComponent(new Date(Date.now() - 864e5).toISOString())}`, `from=2020-01-01T00:00:00Z&to=2026-01-01T00:00:00Z`]) {
    r = await call('GET', '/admin/api/buddies/stats?' + qs, { cookie: op }); T('参数不合法 ' + qs.slice(0, 40) + ' → 422', r.s === 422, r) }
  // 只读角色在库里只有统计函数：直接查原始表不行
  const vq = async sql => { const cl = await su.connect(); try { await cl.query('begin'); await cl.query('set local role nbq_viewer'); await cl.query(sql); return 'ok' } catch (e) { return e.message } finally { await cl.query('rollback').catch(() => { }); cl.release() } };
  T('只读角色不能直接读 buddy_requests', /permission denied/.test(await vq('select * from buddy_requests')));
  T('只读角色不能直接读 buddies', /permission denied/.test(await vq('select * from buddies')));
  T('只读角色能调 buddy_stats', (await vq(`select * from buddy_stats(now() - interval '1 day', now())`)) === 'ok');
} catch (e) { fail++; console.log('FAIL 异常 ' + (e.stack || e)) }
finally { try { await su?.end() } catch (_) { } c.stop() }
console.log(`admin_buddies: ${pass} 通过, ${fail} 失败`); process.exit(fail ? 1 : 0);
