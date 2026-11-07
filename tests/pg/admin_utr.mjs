// 我的 UTR（#101）后台只读：GET /admin/api/utr（概况 + 需要留意的人）、球友列表的 UTR 列。
// 真 PostgreSQL + 真的 nbq_admin_api 连接（和线上同一个角色）；夹具用超级用户建、用 api_set_utr 走真实写入。
// 覆盖：权限（只读角色 403）· 概况口径 · 三种留意（7 天改 3 次以上 / 30 天内一次跳 ≥ 2 / 同一主页多个账号）· 限城市 · 列表不泄露主页编号。
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
  let r;
  const setU = async (uid, p) => { const cl = await su.connect(); try { await cl.query('begin'); await cl.query('set local role nbq_user'); await cl.query(`select set_config('nbq.uid', $1, true)`, [uid]);
    await cl.query('select api_set_utr($1::jsonb)', [JSON.stringify(p)]); await cl.query('commit') } catch (e) { await cl.query('rollback'); throw e } finally { cl.release() } };
  const D = await user('小D'), E = await user('小E'), F = await user('小F'), G = await user('悉尼G', 'syd'), H = await user('小H');
  // 初始都是正式 5。A：7 天内改 3 次（often）；B：正式 3 → 正式 6.5（jump，只看正式→正式；自评换成正式是正常的）；C、D：关联同一个主页（dup）；E：改成自评 ≈1.5（不算跳）；F：正式 6 + 主页（正常）；G：悉尼的人和 C 同一主页；H：注销后不算
  for (const v of [5.1, 5.2, 5.3]) await setU(A, { utr: v, estimated: false });
  await setU(B, { utr: 3, estimated: false }); await setU(B, { utr: 6.5, estimated: false });
  await setU(C, { utr: 4, estimated: false, profile: '1234567' }); await setU(D, { utr: 4.2, estimated: false, profile: 'https://app.utrsports.net/profiles/1234567' });
  await setU(E, { utr: 1.5, estimated: true }); await setU(F, { utr: 6, estimated: false, profile: '7654321' }); await setU(G, { utr: 4, estimated: false, profile: '1234567' });
  await setU(H, { utr: 9, estimated: false, profile: '1111111' }); await q(`update users set status='deleted', status_since=now() where id=$1`, [H]);

  r = await call('GET', '/admin/api/utr'); T('没登录 → 401', r.s === 401, r.s);
  r = await call('GET', '/admin/api/utr', { cookie: vw }); T('只读角色看不到个人名单 → 403', r.s === 403, r.s);
  r = await call('GET', '/admin/api/utr', { cookie: op });
  T('运营 → 200', r.s === 200, r);
  const s = r.j.summary;
  T('概况：在册 7 人（注销的不算）；自评 1（E）、正式 6、关联 4（C、D、F、G）', s.total === 7 && s.self === 1 && s.official === 6 && s.linked === 4, s);
  T('概况：近 30 天确认过 7 人；近 7 天改动 10 次 / 7 人（注销的不算）', s.updated_30d === 7 && s.changes_7d === 10 && s.changers_7d === 7, s);
  const by = Object.fromEntries(r.j.flags.map(f => [f.nickname, f]));
  T('留意：A 近 7 天改了 3 次', by['小A'] && by['小A'].often_n === 3 && by['小A'].jump_to == null, by['小A']);
  T('留意：B 一次从 3 跳到 6.5', by['小B'] && by['小B'].jump_from === 3 && by['小B'].jump_to === 6.5, by['小B']);
  T('留意：C、D 关联同一个主页，带编号方便核实', by['小C'] && by['小D'] && by['小C'].dup_profile === '1234567' && by['小D'].dup_profile === '1234567', [by['小C'], by['小D']]);
  T('不留意：E（换成自评）、F（正常关联）、注销的 H 不出现', !by['小E'] && !by['小F'] && !by['小H'], Object.keys(by));
  T('留意名单不带手机号、用户 id', !JSON.stringify(r.j.flags).match(/\+614|"id"/), r.j.flags[0]);
  r = await call('GET', '/admin/api/utr', { cookie: sy });
  T('只负责悉尼：概况只算悉尼（G）；看不到墨尔本的人，也不会因此知道 G 的主页被别人关联过', r.s === 200 && r.j.summary.total === 1 && r.j.flags.length === 0, r.j);
  r = await call('GET', '/admin/api/users?q=' + encodeURIComponent('小'), { cookie: op });
  const u = Object.fromEntries(r.j.users.map(x => [x.nickname, x]));
  T('球友列表：带 UTR 类型和是否关联', u['小E'].utr_estimated === true && u['小C'].utr_linked === true && u['小A'].utr_linked === false, [u['小E'], u['小C']]);
  T('球友列表不带主页编号', !JSON.stringify(r.j).includes('1234567'));
  // 迁移可重复
  const mig = (await import('fs')).readFileSync(path.join(DIR, 'server/migrations/20261112_utr_admin.sql'), 'utf8');
  let e1 = null; try { await q(mig); await q(mig) } catch (e) { e1 = e.message } T('迁移连跑两次不报错', e1 === null, e1);
} catch (e) { fail++; console.log('FAIL 异常 ' + (e.stack || e)) }
finally { try { await su?.end() } catch (_) { } c.stop() }
console.log(`admin_utr: ${pass} 通过, ${fail} 失败`); process.exit(fail ? 1 : 0);
