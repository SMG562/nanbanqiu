// #27 第 3 步：后台球友列表接口（GET /admin/api/users，只读）。
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
  const A = await user('小A'), B = await user('小B'), C = await user('小C');   // member_no 1..3
  let clock = 1_800_000_000_000; const deps = { connect, now: () => clock }; const ORIGIN = 'https://nanbanqiu.test';
  const call = async (method, p, { body, cookie } = {}) => {
    const h = { 'X-NBQ-Admin': '1', ...(method !== 'GET' ? { Origin: ORIGIN, 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}) };
    const r = await API.handleAdmin(new Request(ORIGIN + p, { method, headers: h, body: method === 'GET' ? undefined : JSON.stringify(body ?? {}) }), deps);
    const text = await r.text(); let j = null; try { j = JSON.parse(text) } catch (_) { } return { s: r.status, j, text } };
  const login = async email => { clock += 30e3; const r = await API.handleAdmin(new Request(ORIGIN + '/admin/api/login', { method: 'POST', headers: { 'X-NBQ-Admin': '1', Origin: ORIGIN, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: PW, code: AU.totp(SEC, clock) }) }), deps); return 'nbq_admin=' + (r.headers.get('Set-Cookie').match(/nbq_admin=([^;]+)/) || [])[1] };
  const op = await login('ops@x.com'), vw = await login('view@x.com'), sy = await login('syd@x.com');


  const sess = (await one(`select count(*)::int n from users`)).n;
  // 夹具：再造 55 个墨尔本 + 2 个悉尼，状态各异
  for (let i = 0; i < 55; i++) await user('路人' + i);
  const S1 = await user('悉尼甲', 'syd'), S2 = await user('悉尼乙', 'syd');
  await q(`update users set status='banned', status_since=now() where id=$1`, [B]);
  await q(`update users set status='suspended', status_since=now(), status_until=now()+interval '3 days' where id=$1`, [C]);
  await q(`update users set last_initial='W', signup_source='xhs', last_active_at=now() where id=$1`, [A]);
  await q(`update users set nickname='100%_真', status='review' where id=$1`, [S1]);

  let r = await call('GET', '/admin/api/users'); T('未登录 → 401', r.s === 401, r);
  r = await call('GET', '/admin/api/users', { cookie: vw }); T('只读角色（库里只有统计）→ 403', r.s === 403 && r.j.error === 'admin_forbidden', r);
  r = await call('GET', '/admin/api/users', { cookie: op });
  T('运营读第一页：50 个 + more', r.s === 200 && r.j.users.length === 50 && r.j.more === true, [r.s, r.j?.users?.length]);
  T('按编号倒序（新注册在前）', r.j.users[0].member_no > r.j.users[1].member_no, r.j.users.slice(0, 2).map(x => x.member_no));
  T('统计按状态分组（全库）', r.j.counts.banned === 1 && r.j.counts.suspended === 1 && r.j.counts.review === 1 && r.j.counts.active === sess + 55 + 2 - 3, r.j.counts);
  T('不泄露完整手机号 / auth_id / 微信 / 邮箱 / IP', !/\+614|phone_e164|auth_id|wechat|email|signup_ip|"id"/.test(r.text), r.text.slice(0, 300));
  T('手机只给后四位', r.j.users.every(x => /^••• \d{4}$/.test(x.phone_tail)), r.j.users[0]);
  r = await call('GET', '/admin/api/users?offset=50', { cookie: op });
  T('翻页：第二页有剩余的，more 为 false，且和第一页不重叠', r.s === 200 && r.j.users.length === 10 && r.j.more === false && r.j.users.every(x => x.member_no <= 10), [r.s, r.j?.users?.length]);
  r = await call('GET', '/admin/api/users?status=banned', { cookie: op }); T('按状态筛：封禁', r.j.users.length === 1 && r.j.users[0].nickname === '小B' && r.j.users[0].status === 'banned', r.j);
  r = await call('GET', '/admin/api/users?status=suspended', { cookie: op }); T('暂停带到期时间', r.j.users.length === 1 && !!r.j.users[0].status_until, r.j);
  r = await call('GET', '/admin/api/users?q=' + encodeURIComponent('小A'), { cookie: op }); T('搜昵称', r.j.users.length === 1 && r.j.users[0].last_initial === 'W' && r.j.users[0].signup_source === 'xhs', r.j);
  r = await call('GET', '/admin/api/users?q=%232', { cookie: op }); T('搜编号 #2', r.j.users.some(x => x.nickname === '小B' && x.member_no === 2), r.j.users);
  r = await call('GET', '/admin/api/users?q=3', { cookie: op }); T('搜编号 3 和昵称含 3 的都在', r.j.users.some(x => x.member_no === 3) && r.j.users.some(x => x.nickname.includes('3')), r.j.users.length);
  r = await call('GET', '/admin/api/users?q=' + encodeURIComponent('%'), { cookie: op }); T('搜「%」按字面量，不当通配符（只匹配昵称里真有 % 的那一位）', r.s === 200 && r.j.users.length === 1 && r.j.users[0].nickname === '100%_真', r.j.users.length);
  r = await call('GET', '/admin/api/users?q=' + encodeURIComponent('_'), { cookie: op }); T('搜「_」按字面量', r.s === 200 && r.j.users.length === 1 && r.j.users[0].nickname === '100%_真', r.j.users.length);
  r = await call('GET', '/admin/api/users?status=banned&q=' + encodeURIComponent('小A'), { cookie: op }); T('状态 + 搜索同时生效', r.j.users.length === 0);
  for (const qs of ['status=hacked', 'offset=-1', 'offset=abc', 'offset=99999999']) { r = await call('GET', '/admin/api/users?' + qs, { cookie: op }); T('参数不合法 ' + qs + ' → 422', r.s === 422, r) }
  r = await call('GET', '/admin/api/users?q=' + encodeURIComponent("' or 1=1 --"), { cookie: op }); T('注入式搜索词：当普通文字，0 个结果', r.s === 200 && r.j.users.length === 0, r);
  r = await call('GET', '/admin/api/users', { cookie: sy });
  T('只负责悉尼的运营：只看到悉尼的人，统计也只算悉尼的', r.s === 200 && r.j.users.length === 2 && r.j.users.every(x => x.city === 'syd') && r.j.counts.active === 1 && r.j.counts.review === 1 && !r.j.counts.banned, r.j);
  r = await call('GET', '/admin/api/users?q=' + encodeURIComponent('小A'), { cookie: sy }); T('悉尼运营搜墨尔本的人 → 0 个', r.j.users.length === 0, r.j);
  r = await call('GET', '/admin/api/users?q=100%25', { cookie: sy }); T('字面量 % 能搜到昵称含 % 的（悉尼）', r.j.users.length === 1 && r.j.users[0].status === 'review', r.j);
  T('只读：没有改动任何用户', (await one(`select count(*)::int n from users where status='banned'`)).n === 1);
} finally { try { await su?.end() } catch (_) { } c.stop() }
console.log(`admin_users: ${pass} 通过, ${fail} 失败`); process.exit(fail ? 1 : 0);
