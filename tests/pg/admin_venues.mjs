// #27 第 3 步：后台球场审核接口（GET /admin/api/venues · POST /venues/geo · POST /venues/review）。
// 真 PostgreSQL + 真的 nbq_admin_api 连接（和线上同一个角色）；夹具用超级用户建。
// 覆盖：权限（未登录 / 只读 / 运营）· 列表内容与不泄露（手机号、举报人 id）· 限城市 · 处理 / 忽略 · 审计 · 并发重复处理 ·
//       与前台闭环（处理后 /api/reports/mine 不再返回、可重新举报）· 查看对话必须填理由并留痕 · 输入校验。
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
  const A = await user('小A'), B = await user('小B'), C = await user('小C');
  let clock = 1_800_000_000_000; const deps = { connect, now: () => clock }; const ORIGIN = 'https://nanbanqiu.test';
  const call = async (method, p, { body, cookie } = {}) => {
    const h = { 'X-NBQ-Admin': '1', ...(method !== 'GET' ? { Origin: ORIGIN, 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}) };
    const r = await API.handleAdmin(new Request(ORIGIN + p, { method, headers: h, body: method === 'GET' ? undefined : JSON.stringify(body ?? {}) }), deps);
    const text = await r.text(); let j = null; try { j = JSON.parse(text) } catch (_) { } return { s: r.status, j, text } };
  const login = async email => { clock += 30e3; const r = await API.handleAdmin(new Request(ORIGIN + '/admin/api/login', { method: 'POST', headers: { 'X-NBQ-Admin': '1', Origin: ORIGIN, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: PW, code: AU.totp(SEC, clock) }) }), deps); return 'nbq_admin=' + (r.headers.get('Set-Cookie').match(/nbq_admin=([^;]+)/) || [])[1] };
  const op = await login('ops@x.com'), vw = await login('view@x.com'), sy = await login('syd@x.com');


  await q(`insert into suburbs(name,postcode,centroid) values ('Brighton','3186','POINT(145 -37.9)')`);
  const pt = id => one(`select st_y(location::geometry)::float lat, st_x(location::geometry)::float lng, geo_source, status from venues where id=$1`, [id]);
  const mkv = async (name, o = {}) => (await one(`insert into venues(name,short_name,suburb,postcode,location,surfaces,status,geo_source,city,added_by) values ($1,$1,'Brighton','3186',$2::geography,'{hard}',$3,$4,$5,$6) returning id`,
    [name, `POINT(${o.lng ?? 145} ${o.lat ?? -37.9})`, o.status ?? 'active', o.geo ?? 'suburb_centroid', o.city ?? 'melb', o.by ?? null])).id;
  const ZERO = '00000000-0000-0000-0000-000000000000';

  // ---------- 权限 ----------
  let r = await call('GET', '/admin/api/venues'); T('未登录读球场 → 401', r.s === 401, r);
  r = await call('GET', '/admin/api/venues', { cookie: vw }); T('只读角色读球场 → 403', r.s === 403 && r.j.error === 'admin_forbidden', r);
  r = await call('POST', '/admin/api/venues/geo', { cookie: vw, body: { id: ZERO } }); T('只读角色核对坐标 → 403', r.s === 403, r);
  r = await call('POST', '/admin/api/venues/review', { cookie: vw, body: { id: ZERO, action: 'approve' } }); T('只读角色审核球场 → 403', r.s === 403, r);

  // ---------- 列表 ----------
  const G1 = await mkv('Glen Court'), G2 = await mkv('Done Court', { geo: 'admin' }), G3 = await mkv('Sydney Court', { city: 'syd', lat: -33.87, lng: 151.2 });
  const P1 = await mkv('User Court', { status: 'pending', by: A, lat: -37.9001, lng: 145.0001, geo: 'google' });
  const P2 = await mkv('Far Court', { status: 'pending', by: B, lat: -37.5, lng: 144.5, geo: 'google' });
  const H1 = await mkv('Hidden Court', { status: 'hidden' });
  r = await call('GET', '/admin/api/venues', { cookie: op });
  const ids = (r.j?.geo || []).map(x => x.id);
  T('运营读球场 → 200', r.s === 200 && Array.isArray(r.j.geo) && Array.isArray(r.j.pending), r);
  T('待核对只含「还是区中心估值」的公开球场', ids.includes(G1) && ids.includes(G3) && !ids.includes(G2) && !ids.includes(P1) && !ids.includes(H1), ids);
  T('统计：待核对数 / 公开球场总数', r.j.geo_todo === 2 && r.j.active_total === 3, r.j);
  const l1 = r.j.geo.find(x => x.id === G1); T('坐标以「纬度 / 经度」给出', l1.lat === -37.9 && l1.lng === 145 && l1.name === 'Glen Court', l1);
  const p1 = r.j.pending.find(x => x.id === P1), p2 = r.j.pending.find(x => x.id === P2);
  T('待审核球场带添加人昵称', r.j.pending.length === 2 && p1.added_by_name === '小A' && p2.added_by_name === '小B', r.j.pending);
  T('待审核：300 米内已收录的球场列为合并候选（只含公开的）', p1.near.length === 2 && p1.near.some(n => n.id === G1) && p1.near.some(n => n.id === G2) && p1.near.every(n => n.dist_m < 300) && p2.near.length === 0, p1.near);
  T('列表不泄露手机号和添加人 id', !/\+614|phone|added_by"|user_id/.test(r.text) && !r.text.includes(A) && !r.text.includes(B), r.text.slice(0, 300));
  r = await call('GET', '/admin/api/venues', { cookie: sy });
  T('只负责悉尼的运营：只看到悉尼的球场', r.s === 200 && r.j.geo.length === 1 && r.j.geo[0].id === G3 && r.j.pending.length === 0 && r.j.geo_todo === 1 && r.j.active_total === 1, r.j);

  // ---------- 核对坐标 ----------
  r = await call('POST', '/admin/api/venues/geo', { cookie: op, body: { id: G1 } });
  let v = await pt(G1);
  T('「位置没错」→ 200，来源标成已核对，位置不变', r.s === 200 && v.geo_source === 'admin' && v.lat === -37.9 && v.lng === 145, [r, v]);
  T('「位置没错」留痕：geo_confirm', (await one(`select count(*)::int n from admin_audit_log where action='venue.review' and target=$1 and detail->>'action'='geo_confirm'`, [G1])).n === 1);
  r = await call('GET', '/admin/api/venues', { cookie: op }); T('核对过的从待核对里消失', !r.j.geo.some(x => x.id === G1) && r.j.geo_todo === 1, r.j.geo_todo);
  const G4 = await mkv('Move Court');
  r = await call('POST', '/admin/api/venues/geo', { cookie: op, body: { id: G4, lat: -37.8136, lng: 144.9631 } });
  v = await pt(G4);
  T('改位置 → 200，新坐标生效、来源已核对', r.s === 200 && Math.abs(v.lat + 37.8136) < 1e-6 && Math.abs(v.lng - 144.9631) < 1e-6 && v.geo_source === 'admin', [r, v]);
  const au = await one(`select detail from admin_audit_log where action='venue.review' and target=$1`, [G4]);
  T('改位置留痕：写明改前、改后', au.detail.action === 'geo_move' && au.detail.from[0] === -37.9 && au.detail.to[0] === -37.8136 && au.detail.to[1] === 144.9631, au);
  T('改位置不动球场的其他字段', (await one(`select name, suburb, status, surfaces from venues where id=$1`, [G4])).name === 'Move Court');
  const bads = [[{ lat: -37.8 }], [{ lng: 144.9 }], [{ lat: 37.8, lng: 144.9 }], [{ lat: -37.8, lng: 44.9 }], [{ lat: '-37.8', lng: 144.9 }], [{ lat: -37.8, lng: null }], [{ lat: null, lng: 144.9 }]];
  for (const [b] of bads) { r = await call('POST', '/admin/api/venues/geo', { cookie: op, body: { id: G4, ...b } }); T('坐标不合法 ' + JSON.stringify(b) + ' → 422', r.s === 422, r) }
  T('不合法的坐标没有改动位置', Math.abs((await pt(G4)).lat + 37.8136) < 1e-6);
  r = await call('POST', '/admin/api/venues/geo', { cookie: op, body: { id: 'x' } }); T('id 不是 uuid → 422', r.s === 422, r);
  r = await call('POST', '/admin/api/venues/geo', { cookie: op, body: { id: ZERO } }); T('球场不存在 → 404', r.s === 404, r);
  const G5 = await mkv('Syd Move', { city: 'syd', lat: -33.87, lng: 151.2 });
  r = await call('POST', '/admin/api/venues/geo', { cookie: sy, body: { id: G5 } }); T('悉尼运营核对悉尼的球场 → 200', r.s === 200, r);
  r = await call('POST', '/admin/api/venues/geo', { cookie: sy, body: { id: G4 } }); T('悉尼运营核对墨尔本的球场 → 403', r.s === 403 && (await pt(G4)).geo_source === 'admin', r);

  // ---------- 审核用户添加的球场 ----------
  r = await call('POST', '/admin/api/venues/review', { cookie: sy, body: { id: P1, action: 'approve' } }); T('悉尼运营审核墨尔本的球场 → 拒绝（行级安全下看不到 = 404），状态不变', [403, 404].includes(r.s) && (await pt(P1)).status === 'pending', r);
  for (const b of [{ id: P1, action: 'delete' }, { id: P1, action: 'merge' }, { id: P1, action: 'merge', merge_into: 'x' }, { id: P1, action: 'approve', merge_into: G1 }, { id: 'x', action: 'approve' }]) {
    r = await call('POST', '/admin/api/venues/review', { cookie: op, body: b }); T('审核参数不合法 ' + JSON.stringify(b) + ' → 422', r.s === 422, r) }
  r = await call('POST', '/admin/api/venues/review', { cookie: op, body: { id: P1, action: 'merge', merge_into: P2 } }); T('不能合并到还没通过的球场 → 422', r.s === 422 && (await pt(P1)).status === 'pending', r);
  r = await call('POST', '/admin/api/venues/review', { cookie: op, body: { id: P1, action: 'merge', merge_into: P1 } }); T('不能合并到自己 → 422', r.s === 422, r);
  r = await call('POST', '/admin/api/venues/review', { cookie: op, body: { id: P1, action: 'merge', merge_into: G1 } });
  v = await one(`select status, merged_into from venues where id=$1`, [P1]);
  T('合并 → 200，状态 merged 并指向目标', r.s === 200 && v.status === 'merged' && v.merged_into === G1, [r, v]);
  r = await call('POST', '/admin/api/venues/review', { cookie: op, body: { id: P1, action: 'approve' } }); T('已处理过的再审核 → 409，状态不变', r.s === 409 && r.j.error === 'state_changed' && (await pt(P1)).status === 'merged', r);
  r = await call('POST', '/admin/api/venues/review', { cookie: op, body: { id: P2, action: 'approve' } }); T('通过 → 200，球场变公开', r.s === 200 && (await pt(P2)).status === 'active', r);
  const P3 = await mkv('Reject Me', { status: 'pending', by: C });
  r = await call('POST', '/admin/api/venues/review', { cookie: op, body: { id: P3, action: 'reject' } }); T('驳回 → 200', r.s === 200 && (await pt(P3)).status === 'rejected', r);
  r = await call('POST', '/admin/api/venues/review', { cookie: op, body: { id: G1, action: 'reject' } }); T('公开球场不能走审核下线 → 409，状态不变', r.s === 409 && (await pt(G1)).status === 'active', r);
  r = await call('POST', '/admin/api/venues/review', { cookie: op, body: { id: ZERO, action: 'approve' } }); T('球场不存在 → 404', r.s === 404, r);
  T('审核留痕：approve / merge / reject 各一条', (await one(`select count(distinct detail->>'action')::int n from admin_audit_log where action='venue.review' and detail->>'action' in ('approve','merge','reject')`)).n === 3);
  r = await call('GET', '/admin/api/venues', { cookie: op }); T('处理后的球场不再出现在待审核里', r.j.pending.length === 0, r.j.pending);
  // 前台视角：通过的球场对所有人可见，驳回 / 合并的不可见（和 /api/venues 同一个条件）
  T('前台只看得到 active 的球场', (await q(`select id from venues where status='active' and id = any($1)`, [[P1, P2, P3]])).rows.map(x => x.id).join() === P2);
} finally { try { await su?.end() } catch (_) { } c.stop() }
console.log(`admin_venues: ${pass} 通过, ${fail} 失败`); process.exit(fail ? 1 : 0);
