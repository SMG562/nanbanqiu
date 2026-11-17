// 后台接口真库测试的公共夹具（tests/pg/admin_*.mjs 共用；admin_api.mjs 专测登录本身，不用它）。
// 真 PostgreSQL + schema.sql + 线上同一个数据库角色 nbq_admin_api；夹具数据用超级用户建。
//   const K = await adminKit('admin_xxx');  K.T(名字, 条件, 出错时打印的值) · K.call(方法, 路径, {body, cookie}) · K.as.owner / operator / viewer / syd（已登录的 Cookie）
//   K.user(昵称, {city, status, gender}) → {id, no} · K.q / K.one / K.su 超级用户查询 · K.dir 仓库目录 · 最后 await K.done()（打印「名字: N 通过, M 失败」并退出）
import { createRequire } from 'module'; import path from 'path'; import { fileURLToPath, pathToFileURL } from 'url';
import { startCluster, loadSchema } from './cluster.mjs';
const require = createRequire(import.meta.url); const pg = require('pg');
const HERE = path.dirname(fileURLToPath(import.meta.url)), DIR = process.env.NBQ_DIR || path.join(HERE, '..', '..');

export async function adminKit(name) {
  const AU = await import(pathToFileURL(path.join(DIR, 'server/admin/auth.mjs')));
  const API = await import(pathToFileURL(path.join(DIR, 'server/admin/api.mjs')));
  let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 600) : '')) };
  const c = startCluster(); let su;
  const done = async e => {
    if (e) { fail++; console.log('FAIL 异常 ' + (e.stack || e).toString().slice(0, 800)) }
    try { await su?.end() } catch (_) { } c.stop();
    console.log(`${name}: ${pass} 通过, ${fail} 失败`); process.exit(fail ? 1 : 0);
  };
  try {
    c.createdb('nbq');
    const errs = loadSchema(c, 'nbq', path.join(DIR, 'schema.sql')); T('schema 执行无错误', !errs.length, errs.slice(0, 3));
    c.psql('nbq', `-c "alter role nbq_admin_api login"`);
    su = new pg.Pool({ host: c.host, port: c.port, user: 'postgres', database: 'nbq', max: 4 });
    const q = (s, p) => su.query(s, p), one = async (s, p) => (await q(s, p)).rows[0];
    const connect = async () => { const cl = new pg.Client({ host: c.host, port: c.port, user: 'nbq_admin_api', database: 'nbq' }); await cl.connect(); return cl };
    const PW = 'correct horse battery', SEC = AU.newTotpSecret(), PH = AU.hashPassword(PW);
    const mkAdmin = async (email, role, cities = null) => (await one(`insert into admin_users(email,name,role,password_hash,totp_secret,recovery_hashes,cities) values ($1,$2,$3,$4,$5,'{}',$6) returning id`, [email, email.split('@')[0], role, PH, SEC, cities])).id;
    let clock = 1_800_000_000_000; const deps = { connect, now: () => clock }, ORIGIN = 'https://nanbanqiu.test';
    const call = async (method, p, { body, cookie, headers } = {}) => {
      const h = { 'X-NBQ-Admin': '1', ...(method !== 'GET' ? { Origin: ORIGIN, 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}), ...(headers || {}) };
      const r = await API.handleAdmin(new Request(ORIGIN + p, { method, headers: h, body: method === 'GET' ? undefined : JSON.stringify(body ?? {}) }), deps);
      const text = await r.text(); let j = null; try { j = JSON.parse(text) } catch (_) { } return { s: r.status, j, text, h: r.headers } };
    const login = async email => { clock += 30e3; const r = await call('POST', '/admin/api/login', { body: { email, password: PW, code: AU.totp(SEC, clock) } }); return 'nbq_admin=' + ((r.h.get('Set-Cookie') || '').match(/nbq_admin=([^;]+)/) || [])[1] };
    const ids = { owner: await mkAdmin('own@x.com', 'owner'), operator: await mkAdmin('ops@x.com', 'operator'), viewer: await mkAdmin('view@x.com', 'viewer'), syd: await mkAdmin('syd@x.com', 'operator', ['syd']) };
    const as = { owner: await login('own@x.com'), operator: await login('ops@x.com'), viewer: await login('view@x.com'), syd: await login('syd@x.com') };
    let un = 0;
    const user = async (nick, o = {}) => { const r = await one(`insert into users(phone_e164,nickname,utr,gender,pact_accepted_at,home_city) values ($1,$2,5,$3,now(),$4) returning id, member_no::int as no`, ['+6142' + String(++un).padStart(7, '0'), nick, o.gender ?? 'm', o.city ?? 'melb']);
      if (o.status) await q(`update users set status=$2 where id=$1`, [r.id, o.status]); return r };
    // 每个需要登录的接口都要拦住：没登录 401 · 不带自定义头 403
    const guards = async (method, p, body) => {
      let r = await call(method, p, { body }); T(`${p} 没登录 → 401`, r.s === 401, r.s);
      r = await call(method, p, { body, cookie: as.owner, headers: { 'X-NBQ-Admin': '' } }); T(`${p} 不带 X-NBQ-Admin → 403 csrf`, r.s === 403 && r.j?.error === 'csrf', r);
    };
    return { T, call, as, ids, user, q, one, su, dir: DIR, done, guards, login, mkAdmin, tick: ms => { clock += ms } };
  } catch (e) { await done(e) }
}
