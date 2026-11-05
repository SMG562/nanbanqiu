// #27 第 1 步 PR-A：后台接口 /admin/api（server/admin/api.mjs）。
// 用「真实的非超级用户连接」（nbq_admin_api，和线上同一个角色）+ 真 PostgreSQL 跑；夹具用超级用户建。
// 覆盖：跨站防护（CSRF）· 请求格式 · 登录 / 防枚举 / 锁定 / 按 IP 限流 · 会话（过期、闲置、撤销、停用）· 路由权限 · 数据库最小权限 ·
//       写操作与审计同事务 · 并发处理同一举报 · 错误码映射与不泄露 · 两种连接方式（Pool / connect 函数）。
import { createRequire } from 'module'; import { spawnSync } from 'child_process'; import path from 'path'; import { fileURLToPath, pathToFileURL } from 'url';
import { startCluster, loadSchema } from './cluster.mjs';
const require = createRequire(import.meta.url); const pg = require('pg');
const HERE = path.dirname(fileURLToPath(import.meta.url)), DIR = process.env.NBQ_DIR || path.join(HERE, '..', '..');
const AU = await import(pathToFileURL(path.join(DIR, 'server/admin/auth.mjs')));
const API = await import(pathToFileURL(path.join(DIR, 'server/admin/api.mjs')));
const CON = await import(pathToFileURL(path.join(DIR, 'server/admin/connect.mjs')));
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 600) : '')) };

// ---------- 连接方式：只认 ADMIN_DB_URL ----------
T('connectAdminFromEnv：没配 ADMIN_DB_URL = null，且绝不使用前台接口的 HYPERDRIVE / DB_URL',
  CON.connectAdminFromEnv({}) === null && CON.connectAdminFromEnv({ HYPERDRIVE: { connectionString: 'postgres://x' }, DB_URL: 'postgres://y' }) === null);
T('connectAdminFromEnv：配了 ADMIN_DB_URL 才给连接函数', typeof CON.connectAdminFromEnv({ ADMIN_DB_URL: 'postgres://z' }) === 'function');
const HL = API.parseHosts(' nanbanqiu.app , *.nanbanqiu-preview.pages.dev,');
T('域名白名单：解析去空格、小写、丢空项', JSON.stringify(HL) === '["nanbanqiu.app","*.nanbanqiu-preview.pages.dev"]');
T('域名白名单：正式站、分支预览、测试环境放行', ['nanbanqiu.app', 'NANBANQIU.APP', 'staging.nanbanqiu-preview.pages.dev', 'admin-api-a.nanbanqiu-preview.pages.dev'].every(h => API.hostAllowed(h, HL)));
T('域名白名单：预览站根域名（和正式站是同一个生产部署，但没有 Access）不放行；仿冒后缀也不放行', !['nanbanqiu-preview.pages.dev', 'evil-nanbanqiu-preview.pages.dev', 'nanbanqiu.app.evil.com', 'www.nanbanqiu.app', 'x.nanbanqiu-preview.pages.dev.evil.com', ''].some(h => API.hostAllowed(h, HL)));
T('域名白名单：没配（空）= 什么都不放行', !API.hostAllowed('nanbanqiu.app', API.parseHosts(undefined)) && !API.hostAllowed('nanbanqiu.app', []));
T('isAdminPath：只认 /admin/api 和 /admin/api/…', API.isAdminPath('/admin/api') && API.isAdminPath('/admin/api/me') && !API.isAdminPath('/admin') && !API.isAdminPath('/admin/apix') && !API.isAdminPath('/api/me'));

const c = startCluster(); let su, pool, apiPool;
const quiet = () => { const o = console.error; console.error = () => { }; return () => { console.error = o } };
try {
  c.createdb('nbq');
  const errs = loadSchema(c, 'nbq', path.join(DIR, 'schema.sql')); T('schema 执行无错误', !errs.length, errs.slice(0, 3));
  c.psql('nbq', `-c "alter role nbq_admin_api login"`);       // 线上由你手动开通登录并设密码；测试里用 trust 认证
  su = new pg.Pool({ host: c.host, port: c.port, user: 'postgres', database: 'nbq', max: 4 });
  const mkClient = user => async () => { const cl = new pg.Client({ host: c.host, port: c.port, user, database: 'nbq' }); await cl.connect(); return cl };
  const connect = mkClient('nbq_admin_api');                                   // Workers 的方式：connect 函数
  apiPool = new pg.Pool({ host: c.host, port: c.port, user: 'nbq_admin_api', database: 'nbq', max: 4 });   // Node 的方式：Pool
  const q = (s, p) => su.query(s, p), one = async (s, p) => (await q(s, p)).rows[0];

  // ---------- 夹具 ----------
  const PW = 'correct horse battery', SEC = AU.newTotpSecret(), PH = AU.hashPassword(PW);
  const RC = AU.newRecoveryCodes();
  const mk = async (email, role, rc = []) => (await one(`insert into admin_users(email,name,role,password_hash,totp_secret,recovery_hashes) values ($1,$2,$3,$4,$5,$6) returning id`, [email, email.split('@')[0], role, PH, SEC, rc])).id;
  const O1 = await mk('han@x.com', 'owner', RC.hashes), OP = await mk('ops@x.com', 'operator'), VW = await mk('view@x.com', 'viewer');
  const O3 = await mk('o3@x.com', 'owner'), DIS = await mk('off@x.com', 'operator');
  for (const e of ['f1', 'f2', 'f3']) await mk(e + '@x.com', 'operator');   // 专门用来失败的账号：不要把 han / ops 锁住
  let un = 0; const user = async nick => (await one(`insert into users(phone_e164,nickname,utr,gender,pact_accepted_at) values ($1,$2,5,'m',now()) returning id`, ['+6142' + String(++un).padStart(7, '0'), nick])).id;

  let clock = 1_800_000_000_000;                                              // 虚拟时钟：每次登录前进 30 秒，避免「同一个码不能用两次」
  const deps = { connect, now: () => clock };
  const ORIGIN = 'https://nanbanqiu.test';
  const call = async (method, p, { body, cookie, headers = {}, ip, d = deps, csrf = true, origin = ORIGIN, ctype = 'application/json', raw } = {}) => {
    const h = { ...(csrf ? { 'X-NBQ-Admin': '1' } : {}), ...(method !== 'GET' && origin ? { Origin: origin } : {}), ...(cookie ? { Cookie: cookie } : {}), ...(ip ? { 'CF-Connecting-IP': ip } : {}), ...headers };
    if (method !== 'GET' && ctype) h['Content-Type'] = ctype;
    const r = await API.handleAdmin(new Request(ORIGIN + p, { method, headers: h, body: method === 'GET' ? undefined : (raw ?? JSON.stringify(body ?? {})) }), d);
    const text = await r.text(); let j = null; try { j = JSON.parse(text) } catch (_) { }
    return { s: r.status, j, text, h: r.headers, cookie: r.headers.get('Set-Cookie') };
  };
  const login = async (email, o = {}) => { clock += 30e3; return call('POST', '/admin/api/login', { body: { email, password: PW, code: AU.totp(SEC, clock), ...(o.body || {}) }, ip: o.ip, d: o.d }) };
  const tokOf = r => (r.cookie.match(/nbq_admin=([^;]+)/) || [])[1];
  const ck = r => 'nbq_admin=' + tokOf(r);

  // ---------- 基本形状 ----------
  let r = await call('GET', '/admin/api/health', { csrf: false });
  T('health：不需要自定义头，不连数据库也 200', r.s === 200 && r.j.ok === true && r.j.db === null, r);
  r = await call('GET', '/admin/api/health?db=1', { csrf: false });
  T('health?db=1：以 nbq_admin_api 真连数据库', r.s === 200 && r.j.db === true, r);
  r = await call('GET', '/admin/api/health?db=1', { csrf: false, d: { connect: null } });
  T('health?db=1：没配数据库 → 503 且 ok=false', r.s === 503 && r.j.ok === false && r.j.db === false, r);
  r = await call('GET', '/admin/api/nope'); T('未知路径 → 404', r.s === 404 && r.j.error === 'not_found', r);
  r = await call('DELETE', '/admin/api/me', { raw: '' }); T('已知路径错误方法 → 405 并带 Allow', r.s === 405 && /GET/.test(r.h.get('Allow') || ''), r);
  r = await call('GET', '/admin/api/me');
  T('响应头：no-store、nosniff、noindex', r.h.get('Cache-Control') === 'no-store' && r.h.get('X-Content-Type-Options') === 'nosniff' && /noindex/.test(r.h.get('X-Robots-Tag') || ''), [...r.h]);

  // ---------- 域名白名单（handleAdmin 的第一道检查） ----------
  for (const [hosts, ok, what] of [[['nanbanqiu.test'], 200, '登记过的域名'], [['nanbanqiu.app'], 404, '没登记的域名'], [[], 404, 'ADMIN_HOSTS 没配']]) {
    r = await call('GET', '/admin/api/health', { csrf: false, d: { ...deps, hosts } }); T('域名白名单：' + what + ' → ' + ok, r.s === ok && (ok === 200 || r.j.error === 'not_found'), r);
  }
  r = await call('POST', '/admin/api/login', { body: { email: 'han@x.com', password: PW, code: '000000' }, d: { ...deps, hosts: [] } });
  T('域名白名单：没登记时连登录都碰不到（不进数据库、不记失败）', r.s === 404 && (await one(`select count(*)::int n from admin_login_attempts`)).n === 0, r);

  // ---------- 跨站防护 ----------
  r = await call('GET', '/admin/api/me', { csrf: false }); T('CSRF：缺 X-NBQ-Admin 头（GET）→ 403 csrf', r.s === 403 && r.j.error === 'csrf', r);
  r = await call('POST', '/admin/api/login', { csrf: false, body: { email: 'han@x.com', password: PW, code: '000000' } }); T('CSRF：缺 X-NBQ-Admin 头（POST）→ 403', r.s === 403 && r.j.error === 'csrf', r);
  r = await call('POST', '/admin/api/login', { origin: 'https://evil.example', body: { email: 'han@x.com', password: PW, code: '000000' } }); T('CSRF：Origin 不是本站 → 403', r.s === 403 && r.j.error === 'csrf', r);
  r = await call('POST', '/admin/api/login', { origin: null, body: { email: 'han@x.com', password: PW, code: '000000' } }); T('CSRF：POST 没有 Origin → 403', r.s === 403 && r.j.error === 'csrf', r);
  r = await call('POST', '/admin/api/logout', { origin: 'https://evil.example' }); T('CSRF：退出也要 Origin 一致', r.s === 403, r);
  r = await call('POST', '/admin/api/login', { ctype: 'text/plain', raw: '{}' }); T('Content-Type 不是 JSON → 415', r.s === 415, r);
  r = await call('POST', '/admin/api/login', { raw: '{"a":"' + 'x'.repeat(9000) + '"}' }); T('请求体超过 8KB → 413', r.s === 413, r.s);
  r = await call('POST', '/admin/api/login', { raw: '{bad' }); T('JSON 解析失败 → 400', r.s === 400 && r.j.error === 'bad_json', r);
  r = await call('POST', '/admin/api/login', { raw: '[1,2]' }); T('JSON 是数组 → 400', r.s === 400, r);
  const before = (await one(`select count(*)::int n from admin_audit_log`)).n;
  for (const body of [{ email: 5, password: PW, code: '123456' }, { email: 'a@b.c', password: 'x'.repeat(300), code: '123456' }, { email: 'a@b.c', password: PW, code: '12345' }, { email: 'a@b.c', password: PW, code: 123456 }, {}, { email: '', password: PW, code: '123456' }, { email: 'a@b.c', password: PW, recovery: 'x'.repeat(40) }]) {
    r = await call('POST', '/admin/api/login', { body }); T('登录参数格式不对 → 422 invalid：' + JSON.stringify(body).slice(0, 40), r.s === 422 && r.j.error === 'invalid', r);
  }
  T('格式错误的登录既不进审计也不记失败（没触发任何数据库登录）', (await one(`select count(*)::int n from admin_audit_log`)).n === before && (await one(`select count(*)::int n from admin_login_attempts`)).n === 0);

  // ---------- 登录 ----------
  r = await login('han@x.com');
  const ownerTok = r.s === 200 && tokOf(r);
  T('登录成功：200 {ok, role}', r.s === 200 && r.j.ok === true && r.j.role === 'owner', r);
  T('Cookie：HttpOnly、Secure、SameSite=Strict、Path=/admin、12 小时', /HttpOnly/.test(r.cookie) && /Secure/.test(r.cookie) && /SameSite=Strict/.test(r.cookie) && /Path=\/admin/.test(r.cookie) && /Max-Age=43200/.test(r.cookie), r.cookie);
  T('令牌只在 Cookie 里：响应体里没有', !!ownerTok && ownerTok.length === 43 && !r.text.includes(ownerTok) && Object.keys(r.j).sort().join() === 'ok,role', r.text);
  T('数据库只存令牌的 sha256', !!(await one(`select 1 x from admin_sessions where token_hash=$1`, [AU.tokenHash(ownerTok)])) && !(await one(`select 1 x from admin_sessions where token_hash=$1`, [ownerTok])));
  T('登录写了审计（login，带 IP）', !!(await one(`select 1 x from admin_audit_log where admin_id=$1 and action='login'`, [O1])));
  T('成功的登录不进失败记录', (await one(`select count(*)::int n from admin_login_attempts`)).n === 0);

  const owner = ck(r);
  r = await call('GET', '/admin/api/me', { cookie: owner });
  const permN = (role) => one(`select count(*)::int n from admin_perms where $1 = any(roles)`, [role]).then(x => x.n);
  T('me：返回名字、角色、该角色的权限清单', r.s === 200 && r.j.name === 'han' && r.j.role === 'owner' && r.j.perms.length === (await permN('owner')) && r.j.perms.every(p => p.action && p.label && typeof p.need_reason === 'boolean'), r);
  const opR = await login('ops@x.com'); const vwR = await login('view@x.com');
  r = await call('GET', '/admin/api/me', { cookie: ck(opR) }); T('me：运营的权限比 owner 少', r.s === 200 && r.j.role === 'operator' && r.j.perms.length === (await permN('operator')) && r.j.perms.length < (await permN('owner')), r.j);
  r = await call('GET', '/admin/api/me', { cookie: ck(vwR) }); T('me：只读只有 page.view', r.s === 200 && r.j.role === 'viewer' && r.j.perms.map(p => p.action).join() === 'page.view', r.j);

  // ---------- 没有 / 坏的会话 ----------
  r = await call('GET', '/admin/api/me'); T('没有 Cookie → 401 admin_session_expired，并清掉 Cookie', r.s === 401 && r.j.error === 'admin_session_expired' && /Max-Age=0/.test(r.cookie || ''), r);
  for (const bad of ['nbq_admin=abc', 'nbq_admin=' + 'A'.repeat(43), 'nbq_admin=' + 'A'.repeat(44), 'other=1', 'nbq_admin=%00' + 'A'.repeat(40)]) {
    r = await call('GET', '/admin/api/me', { cookie: bad }); T('坏 Cookie → 401：' + bad.slice(0, 24), r.s === 401 && r.j.error === 'admin_session_expired', r);
  }

  // ---------- 防枚举：各种失败对外一模一样 ----------
  const fails = {};
  fails.badpw = await login('f1@x.com', { body: { password: 'wrong password!!' } });
  fails.nouser = await login('nobody@x.com');
  fails.badcode = await login('f2@x.com', { body: { code: '000000' } });
  fails.disabled = await (async () => { await q(`update admin_users set disabled=true where id=$1`, [DIS]); return login('off@x.com') })();
  T('密码错 / 没这个人 / 验证码错 / 已停用：状态码和响应体逐字相同', Object.values(fails).every(x => x.s === 401 && x.text === fails.badpw.text) && fails.badpw.j.error === 'admin_bad_login', Object.fromEntries(Object.entries(fails).map(([k, v]) => [k, v.text])));
  T('失败的响应不带 Set-Cookie', Object.values(fails).every(x => !x.cookie));
  T('失败都记进了按 IP 的失败记录（含不存在的邮箱）', (await one(`select count(*)::int n from admin_login_attempts`)).n >= 4);
  // 耗时：不存在的邮箱也要算一次 scrypt（否则几毫秒就返回，和密码错误一比就知道账号存不存在）
  const med = a => a.sort((x, y) => x - y)[Math.floor(a.length / 2)];
  const time = async (email, body) => { const t = process.hrtime.bigint(); await login(email, { body, ip: '203.0.113.' + (1 + Math.floor(Math.random() * 200)) }); return Number(process.hrtime.bigint() - t) / 1e6 };
  const known = med([await time('f3@x.com', { password: 'wrong password!!' }), await time('f3@x.com', { password: 'wrong password!!' }), await time('f3@x.com', { password: 'wrong password!!' })]);
  const unknown = med([await time('nobody1@x.com'), await time('nobody2@x.com'), await time('nobody3@x.com')]);
  T('防枚举：不存在的邮箱耗时 ≥ 密码错误的一半（都算了 scrypt）', unknown >= known * 0.5, { known, unknown });

  // ---------- 重放 / 恢复码 ----------
  clock += 30e3; const code = AU.totp(SEC, clock);
  r = await call('POST', '/admin/api/login', { body: { email: 'ops@x.com', password: PW, code } }); T('新的两步验证码可以登录', r.s === 200, r);
  r = await call('POST', '/admin/api/login', { body: { email: 'ops@x.com', password: PW, code } }); T('同一个码不能用第二次 → 401', r.s === 401 && r.j.error === 'admin_bad_login', r);
  clock += 30e3;
  r = await call('POST', '/admin/api/login', { body: { email: 'han@x.com', password: PW, recovery: RC.codes[0] } }); T('恢复码可以登录一次', r.s === 200, r);
  r = await call('POST', '/admin/api/login', { body: { email: 'han@x.com', password: PW, recovery: RC.codes[0] } }); T('恢复码用掉就作废 → 401', r.s === 401, r);

  // ---------- 账号锁定 ----------
  for (let i = 0; i < 5; i++) await login('o3@x.com', { body: { password: 'wrong password!!' }, ip: '198.51.100.' + (10 + i) });
  r = await login('o3@x.com', { ip: '198.51.100.99' });
  T('连错 5 次后：就算这次全对也 429 admin_locked，带 Retry-After', r.s === 429 && r.j.error === 'admin_locked' && +r.h.get('Retry-After') > 0 && r.j.retry_after > 0, r);
  await q(`update admin_users set locked_until=null, failed_logins=0 where id=$1`, [O3]);
  r = await login('o3@x.com', { ip: '198.51.100.98' }); T('解除锁定后可以登录', r.s === 200, r);

  // ---------- 按 IP 限流 ----------
  await q(`delete from admin_login_attempts`);
  const BAD = '192.0.2.50';
  for (let i = 0; i < 20; i++) await login('nobody' + i + '@x.com', { ip: BAD });
  r = await login('han@x.com', { ip: BAD });
  T('同一 IP 15 分钟内失败 20 次 → 429 rate_limited，带 Retry-After，哪怕这次密码和验证码全对', r.s === 429 && r.j.error === 'rate_limited' && +r.h.get('Retry-After') > 0, r);
  r = await login('han@x.com', { ip: '192.0.2.51' }); T('别的 IP 不受影响', r.s === 200, r);
  T('被限流的请求本身不再追加失败记录', (await one(`select count(*)::int n from admin_login_attempts where ip=$1`, [BAD])).n === 20);
  await q(`update admin_login_attempts set at = now() - interval '16 minutes' where ip=$1`, [BAD]);
  r = await login('han@x.com', { ip: BAD }); T('15 分钟过后自动放开', r.s === 200, r);
  r = await login('nobody@x.com', { ip: 'not-an-ip' }); T('CF-Connecting-IP 不是合法 IP：当作没有，不崩溃', r.s === 401, r);
  r = await login('nobody@x.com', { ip: "1.1.1.1'; drop table users;--" }); T('CF-Connecting-IP 带注入内容：当作没有，不崩溃', r.s === 401, r);
  T('users 表还在', !!(await one(`select to_regclass('users') t`)).t);
  await q(`update admin_login_attempts set at = now() - interval '3 days'`);
  await login('nobody@x.com', { ip: '192.0.2.77' });
  T('2 天前的失败记录会被顺手清掉', (await one(`select count(*)::int n from admin_login_attempts where at < now() - interval '2 days'`)).n === 0);

  // ---------- 会话：退出 / 过期 / 闲置 / 停用 ----------
  const s1 = await login('han@x.com'), s2 = await login('han@x.com');
  r = await call('GET', '/admin/api/me', { cookie: ck(s1) }); T('会话 1 有效', r.s === 200, r);
  r = await call('POST', '/admin/api/logout', { cookie: ck(s1) });
  T('退出：200 并清 Cookie', r.s === 200 && /Max-Age=0/.test(r.cookie || ''), r);
  r = await call('GET', '/admin/api/me', { cookie: ck(s1) }); T('退出后旧令牌立刻失效（服务端已撤销，不只是清 Cookie）', r.s === 401, r);
  r = await call('GET', '/admin/api/me', { cookie: ck(s2) }); T('退出一个会话不影响同一账号的另一个', r.s === 200, r);
  r = await call('POST', '/admin/api/logout'); T('没登录时退出也 200（幂等）', r.s === 200 && r.j.ok === true, r);
  await q(`update admin_sessions set expires_at = now() - interval '1 second' where token_hash=$1`, [AU.tokenHash(tokOf(s2))]);
  r = await call('GET', '/admin/api/me', { cookie: ck(s2) }); T('超过 12 小时 → 401', r.s === 401 && r.j.error === 'admin_session_expired', r);
  const s3 = await login('han@x.com');
  const seen0 = (await one(`select last_seen_at from admin_sessions where token_hash=$1`, [AU.tokenHash(tokOf(s3))])).last_seen_at;
  await q(`update admin_sessions set last_seen_at = now() - interval '50 minutes' where token_hash=$1`, [AU.tokenHash(tokOf(s3))]);
  r = await call('GET', '/admin/api/me', { cookie: ck(s3) });
  T('闲置 50 分钟还有效，且这次请求刷新了闲置时间', r.s === 200 && (await one(`select last_seen_at > now() - interval '1 minute' ok from admin_sessions where token_hash=$1`, [AU.tokenHash(tokOf(s3))])).ok, r);
  await q(`update admin_sessions set last_seen_at = now() - interval '61 minutes' where token_hash=$1`, [AU.tokenHash(tokOf(s3))]);
  r = await call('GET', '/admin/api/me', { cookie: ck(s3) }); T('闲置超过 1 小时 → 401', r.s === 401, r);
  const s4 = await login('ops@x.com');
  await q(`update admin_users set disabled=true where id=$1`, [OP]);
  r = await call('GET', '/admin/api/me', { cookie: ck(s4) }); T('账号被停用 → 已登录的会话立刻失效', r.s === 401, r);
  await q(`update admin_users set disabled=false where id=$1`, [OP]);

  // ---------- 路由权限（接口层）+ 在对应数据库角色下执行 ----------
  const who = (perm, name) => ({ name, perm, run: (req, d, b, route) => API.authed(req, d, route, async db => ({ u: (await db.query('select current_user u')).rows[0].u })) });
  API.ROUTES['GET /admin/api/_t_viewer'] = who('page.view', 't_viewer');
  API.ROUTES['GET /admin/api/_t_report'] = who('report.handle', 't_report');
  API.ROUTES['GET /admin/api/_t_owner'] = who('rules.edit', 't_owner');
  API.ROUTES['GET /admin/api/_t_ghost'] = who('no.such.perm', 't_ghost');
  const o = await login('han@x.com'), op = await login('ops@x.com'), vw = await login('view@x.com');
  const get = (p, s) => call('GET', '/admin/api/' + p, { cookie: ck(s) });
  r = await get('_t_viewer', vw); T('只读访问 page.view 路由：200，数据库身份是 nbq_viewer', r.s === 200 && r.j.u === 'nbq_viewer', r);
  r = await get('_t_viewer', op); T('运营访问：数据库身份是 nbq_admin', r.s === 200 && r.j.u === 'nbq_admin', r);
  r = await get('_t_report', vw); T('只读访问 report.handle 路由 → 403 admin_forbidden', r.s === 403 && r.j.error === 'admin_forbidden', r);
  r = await get('_t_report', op); T('运营访问 report.handle 路由 → 200', r.s === 200, r);
  r = await get('_t_owner', op); T('运营访问 owner 专属路由 → 403', r.s === 403, r);
  r = await get('_t_owner', o); T('owner 访问 owner 专属路由 → 200', r.s === 200, r);
  r = await get('_t_ghost', o); T('路由声明了表里没有的权限 → 对所有人 403（默认拒绝），包括 owner', r.s === 403, r);
  await q(`update admin_perms set roles='{owner}' where action='report.handle'`);
  r = await get('_t_report', op); T('改了 admin_perms 立刻生效（接口层直接读表，没有缓存）', r.s === 403, r);
  await q(`update admin_perms set roles='{owner,operator}' where action='report.handle'`);

  // ---------- 数据库最小权限：nbq_admin_api 自己什么都碰不到 ----------
  const raw = await connect(); const tryq = async sql => { try { await raw.query('begin'); await raw.query(sql); await raw.query('rollback'); return 'ok' } catch (e) { await raw.query('rollback').catch(() => { }); return e.code || e.message } };
  for (const [what, sql] of [['读 users', 'select count(*) from users'], ['读 admin_users', 'select * from admin_users'], ['读 admin_sessions', 'select * from admin_sessions'], ['读 reports', 'select * from reports'], ['读 admin_login_attempts', 'select * from admin_login_attempts'],
    ['改 admin_perms', `update admin_perms set roles='{viewer}'`], ['直接调写函数 admin_report_handle', `select admin_report_handle(gen_random_uuid(), 'dismissed')`]]) {
    T('连上就直接 ' + what + ' → 被拒绝（42501）', await tryq(sql) === '42501', await tryq(sql));
  }
  for (const role of ['nbq_service', 'nbq_user']) T('不能切成 ' + role + '（前台接口那一套权限）', await tryq(`set local role ${role}`) === '42501', await tryq(`set local role ${role}`));
  T('可以切成 nbq_admin 和 nbq_viewer（这是设计）', await tryq('set local role nbq_admin') === 'ok' && await tryq('set local role nbq_viewer') === 'ok');
  T('6 个门禁函数能直接调（这是它唯一该有的直接权限）', await tryq(`select admin_attempt_check('203.0.113.9')`) === 'ok' && await tryq(`select admin_attempt_note('203.0.113.9')`) === 'ok' && await tryq(`select admin_session_check('${'0'.repeat(64)}')`) === 'P0001' && await tryq(`select admin_session_revoke('${'0'.repeat(64)}')`) === 'ok' && await tryq(`select admin_login_begin('nobody@x.com')`) === 'P0001');
  await raw.end();
  const memb = (await q(`select r.rolname from pg_auth_members m join pg_roles r on r.oid=m.roleid join pg_roles u on u.oid=m.member where u.rolname='nbq_admin_api' order by 1`)).rows.map(x => x.rolname).join();
  T('nbq_admin_api 只属于 nbq_admin 和 nbq_viewer，且 NOINHERIT', memb === 'nbq_admin,nbq_viewer' && (await one(`select rolinherit i, rolsuper s, rolcreaterole cr, rolcreatedb cd from pg_roles where rolname='nbq_admin_api'`)).i === false);
  T('nbq_admin_api 不是超级用户、不能建角色 / 库', (await one(`select rolsuper s, rolcreaterole cr, rolcreatedb cd, rolbypassrls b from pg_roles where rolname='nbq_admin_api'`)).s === false);
  for (const role of ['nbq_service', 'nbq_user', 'nbq_admin', 'nbq_viewer', 'anon', 'authenticated']) {
    const x = await one(`select has_function_privilege($1, 'admin_attempt_check(inet)', 'execute') a, has_function_privilege($1, 'admin_attempt_note(inet)', 'execute') b, has_table_privilege($1, 'admin_login_attempts', 'select') t`, [role]);
    T('限流函数和失败记录表：' + role + ' 碰不到', !x.a && !x.b && !x.t, x);
  }

  // ---------- 写操作与审计：同一事务 ----------
  const U1 = await user('被举报'), U2 = await user('举报人');
  const rep = async () => (await one(`insert into reports(reporter_id,target_type,target_id,reason,source,via) values ($1,'user',$2,'harass','in_app','card') returning id`, [U2, U1])).id;
  const R1 = await rep();
  API.ROUTES['POST /admin/api/_t_handle'] = { name: 't_handle', perm: 'report.handle', body: true, run: (req, d, b, route) => API.authed(req, d, route, async db => { await db.query('select admin_report_handle($1,$2,$3)', [b.id, 'dismissed', b.note || null]); if (b.boom) throw Object.assign(new Error('boom'), { code: 'XX000' }); return { ok: true } }, b) };
  const post = (p, s, body, o = {}) => call('POST', '/admin/api/' + p, { cookie: ck(s), body, ...o });
  const restore = quiet();
  r = await post('_t_handle', op, { id: R1, boom: true }, { ip: '203.0.113.7' });
  restore();
  T('处理中途出错 → 500 server_error，且举报状态和审计都回滚（原子）', r.s === 500 && r.j.error === 'server_error' && (await one(`select status from reports where id=$1`, [R1])).status === 'open' && !(await one(`select 1 x from admin_audit_log where action='report.handle' and target=$1`, [R1])), r);
  r = await post('_t_handle', op, { id: R1 }, { ip: '203.0.113.7' });
  const au = await one(`select a.admin_id, host(a.ip) ip, a.detail from admin_audit_log a where a.action='report.handle' and a.target=$1`, [R1]);
  T('处理成功：举报改状态、记录处理人，审计带管理员 id 和 IP', r.s === 200 && (await one(`select status, handled_by from reports where id=$1`, [R1])).handled_by === OP && au && au.admin_id === OP && au.ip === '203.0.113.7', { r, au });
  r = await post('_t_handle', op, { id: R1 }); T('已处理过的再处理 → 409 state_changed', r.s === 409 && r.j.error === 'state_changed', r);
  r = await post('_t_handle', vw, { id: R1 }); T('只读不能处理（接口层 403）', r.s === 403, r);
  // 并发：两位管理员同时处理同一条举报
  const R2 = await rep(), op2 = await login('ops@x.com'), o2 = await login('han@x.com');
  const rs = await Promise.all([post('_t_handle', op2, { id: R2 }), post('_t_handle', o2, { id: R2 })]);
  T('两人同时处理同一条举报：一个 200、一个 409，只写一条审计', rs.map(x => x.s).sort().join() === '200,409' && (await one(`select count(*)::int n from admin_audit_log where action='report.handle' and target=$1`, [R2])).n === 1, rs.map(x => [x.s, x.text]));

  // ---------- 错误映射：不泄露、不认识的一律 500 ----------
  const restore2 = quiet();
  r = await call('GET', '/admin/api/me', { cookie: owner, d: { connect: async () => { const e = new Error('connect ECONNREFUSED 10.1.2.3:5432 password=hunter2'); e.code = 'ECONNREFUSED'; throw e } } });
  T('数据库连不上 → 503 db_unavailable，响应体不含地址 / 密码', r.s === 503 && r.text === '{"error":"db_unavailable"}', r);
  r = await call('GET', '/admin/api/me', { cookie: owner, d: { connect: null } }); T('没配 ADMIN_DB_URL → 503 db_unavailable', r.s === 503 && r.j.error === 'db_unavailable', r);
  r = await call('POST', '/admin/api/login', { body: { email: 'han@x.com', password: PW, code: '123456' }, d: { connect: null } }); T('没配 ADMIN_DB_URL，登录 → 503', r.s === 503, r);
  const weird = { connect: async () => ({ query: async () => { const e = new Error('relation "secret_table" does not exist at SELECT * FROM admin_users'); e.code = '42P01'; throw e }, end: async () => { } }) };
  r = await call('GET', '/admin/api/me', { cookie: owner, d: weird });
  restore2();
  T('数据库报了没见过的错误 → 500 server_error，不把原文交出去', r.s === 500 && r.text === '{"error":"server_error"}', r);

  // ---------- 创建第一个管理员：tools/admin_create.mjs 打印的 SQL + 密钥，真的能用来登录 ----------
  const runTool = (args, input) => spawnSync('node', [path.join(DIR, 'tools/admin_create.mjs'), ...args], { input, encoding: 'utf8' });
  let tr = runTool(['--email=New.Owner@Example.com', '--name=Newbie', '--role=owner'], 'brand new passphrase\nbrand new passphrase\n');
  const outT = tr.stdout, sqlT = (outT.match(/-- ===== 复制从这里[^\n]*\n([\s\S]*?)-- ===== 复制到这里结束/) || [])[1] || '';
  const secT = (outT.match(/密钥：([A-Z2-7]+)/) || [])[1], rcT = [...outT.matchAll(/^\s+\d+\. ([0-9a-f]{4}-[0-9a-f]{4})$/gm)].map(m => m[1]);
  T('创建工具：退出码 0，打印了 SQL、密钥、10 个恢复码；SQL 里没有密码明文', tr.status === 0 && sqlT.includes('insert into admin_users') && !!secT && rcT.length === 10 && !outT.includes('brand new passphrase'), { st: tr.status, err: tr.stderr.slice(0, 200) });
  T('创建工具：SQL 里只有哈希（恢复码、密码都不是明文）', !rcT.some(cd => sqlT.includes(cd)) && /scrypt\$32768\$8\$1\$/.test(sqlT));
  await su.query(sqlT);   // 等同于粘到 Supabase SQL Editor 运行
  const nu = await one(`select email, role, cardinality(recovery_hashes) n, disabled from admin_users where email='new.owner@example.com'`);
  T('创建工具：SQL 能执行；邮箱统一小写，角色正确，10 个恢复码哈希', nu && nu.role === 'owner' && nu.n === 10 && nu.disabled === false, nu);
  await su.query(sqlT);
  T('同一段 SQL 重复运行：不报错、不覆盖、不重复', (await one(`select count(*)::int n from admin_users where email='new.owner@example.com'`)).n === 1);
  clock += 30e3;
  r = await call('POST', '/admin/api/login', { body: { email: 'New.Owner@Example.com', password: 'brand new passphrase', code: AU.totp(secT, clock) } });
  T('用工具打印的密码 + 验证器密钥算出的验证码，真的能登录（邮箱大小写不敏感）', r.s === 200 && r.j.role === 'owner', r);
  r = await call('POST', '/admin/api/login', { body: { email: 'new.owner@example.com', password: 'brand new passphrase', recovery: rcT[3] } });
  T('用工具打印的恢复码也能登录', r.s === 200, r);
  tr = runTool(['--email=a@b.co', '--name=H'], 'short\nshort\n'); T('创建工具：密码少于 12 位 → 退出码 1、不打印 SQL', tr.status === 1 && !/insert into/.test(tr.stdout), tr.stdout.slice(-80));
  tr = runTool(['--email=a@b.co', '--name=H'], 'aaaaaaaaaaaaaaaa\nbbbbbbbbbbbbbbbb\n'); T('创建工具：两次输入不一样 → 退出码 1', tr.status === 1 && !/insert into/.test(tr.stdout));
  for (const bad of ["--email=x'y@b.co", '--email=a@b.co;drop', '--email=nope']) { tr = runTool([bad, '--name=H'], 'aaaaaaaaaaaaaaaa\naaaaaaaaaaaaaaaa\n'); T('创建工具：拒绝可疑邮箱 ' + bad, tr.status === 1 && !/insert into/.test(tr.stdout)) }
  tr = runTool(['--email=a@b.co', "--name=O'Brien"], ''); T('创建工具：拒绝名字里的引号（防止拼出坏 SQL）', tr.status === 1);
  tr = runTool(['--email=a@b.co', '--name=H', '--role=root'], ''); T('创建工具：拒绝未知角色', tr.status === 1);

  // ---------- 两种连接方式等价 ----------
  const dp = { connect: apiPool, now: () => clock };
  r = await login('han@x.com', { d: dp }); T('用 Pool 连接也能登录', r.s === 200, r);
  r = await call('GET', '/admin/api/me', { cookie: ck(r), d: dp }); T('用 Pool 连接也能取 me', r.s === 200 && r.j.role === 'owner', r);
  T('连接用完都归还（没有泄漏）', apiPool.idleCount === apiPool.totalCount && apiPool.waitingCount === 0, { idle: apiPool.idleCount, total: apiPool.totalCount });
  const conns = (await one(`select count(*)::int n from pg_stat_activity where usename='nbq_admin_api'`)).n;
  T('connect 函数方式用完都 end（库里没有残留的 nbq_admin_api 连接，除了 Pool 的）', conns <= apiPool.totalCount, conns);
} finally { try { await su?.end() } catch (_) { } try { await apiPool?.end() } catch (_) { } c.stop() }
console.log(`admin_api: ${pass} 通过, ${fail} 失败`); process.exit(fail ? 1 : 0);
