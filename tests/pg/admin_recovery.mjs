// 后台「重新生成恢复码」（POST /admin/api/account/recovery）：真 PostgreSQL + 真的 nbq_admin_api 连接。
// 覆盖：登录要求 · 输入校验 · 密码 / 验证码错不换码并记失败 · 与登录共用的锁定 · 验证码重放 · 成功后旧码作废新码可用 ·
//       只存哈希不存明文 · 审计 · 其他管理员不受影响 · 只读角色也能换自己的。
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
  const q = (s, p) => su.query(s, p), one = async (s, p) => (await q(s, p)).rows[0];
  const connect = async () => { const cl = new pg.Client({ host: c.host, port: c.port, user: 'nbq_admin_api', database: 'nbq' }); await cl.connect(); return cl };
  const PW = 'correct horse battery', SEC = AU.newTotpSecret(), PH = AU.hashPassword(PW);
  const OLD = AU.newRecoveryCodes(), OTHER = AU.newRecoveryCodes(), VRC = AU.newRecoveryCodes();
  const mk = async (email, role, rc) => (await one(`insert into admin_users(email,name,role,password_hash,totp_secret,recovery_hashes) values ($1,$2,$3,$4,$5,$6) returning id`, [email, email.split('@')[0], role, PH, SEC, rc])).id;
  const ME = await mk('me@x.com', 'owner', OLD.hashes), OT = await mk('other@x.com', 'operator', OTHER.hashes), VW = await mk('view@x.com', 'viewer', VRC.hashes);
  let clock = 1_800_000_000_000; const deps = { connect, now: () => clock }; const ORIGIN = 'https://nanbanqiu.test';
  const call = async (method, p, { body, cookie } = {}) => {
    const h = { 'X-NBQ-Admin': '1', ...(method !== 'GET' ? { Origin: ORIGIN, 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}) };
    const r = await API.handleAdmin(new Request(ORIGIN + p, { method, headers: h, body: method === 'GET' ? undefined : JSON.stringify(body ?? {}) }), deps);
    const text = await r.text(); let j = null; try { j = JSON.parse(text) } catch (_) { } return { s: r.status, j, text, ck: r.headers.get('Set-Cookie') } };
  const next = () => { clock += 30e3; return AU.totp(SEC, clock) };                  // 每次拿一个新的 30 秒时间步的验证码
  const login = async (email, extra = {}) => { const r = await call('POST', '/admin/api/login', { body: { email, password: PW, ...(extra.recovery ? { recovery: extra.recovery } : { code: next() }) } }); return { ...r, cookie: r.ck ? 'nbq_admin=' + (r.ck.match(/nbq_admin=([^;]+)/) || [])[1] : null } };
  const row = id => one(`select recovery_hashes, failed_logins, locked_until, totp_last_step from admin_users where id=$1`, [id]);
  const audit = (id, a) => one(`select count(*)::int n from admin_audit_log where admin_id=$1 and action=$2`, [id, a]).then(x => x.n);
  const REC = '/admin/api/account/recovery';

  // ---------- 登录与输入校验 ----------
  let r = await call('POST', REC, { body: { password: PW, code: next() } }); T('未登录 → 401', r.s === 401 && r.j.error === 'admin_session_expired', r);
  const me = await login('me@x.com'); T('登录成功', me.s === 200 && !!me.cookie, me);
  for (const [b, n] of [[{ code: '123456' }, '缺密码'], [{ password: PW }, '缺验证码'], [{ password: PW, code: '12345' }, '验证码不是 6 位'], [{ password: PW, code: 123456 }, '验证码不是字符串'], [{ password: 'x'.repeat(257), code: '123456' }, '密码超长']]) {
    r = await call('POST', REC, { cookie: me.cookie, body: b }); T('输入校验：' + n + ' → 422', r.s === 422 && r.j.error === 'invalid', r) }
  T('输入校验失败不动恢复码、不记失败', JSON.stringify((await row(ME)).recovery_hashes) === JSON.stringify(OLD.hashes) && (await row(ME)).failed_logins === 0);

  // ---------- 密码 / 验证码错 ----------
  r = await call('POST', REC, { cookie: me.cookie, body: { password: 'wrong password!!', code: next() } }); T('密码错 → 403 admin_reauth_failed', r.s === 403 && r.j.error === 'admin_reauth_failed' && !r.text.includes('codes'), r);
  r = await call('POST', REC, { cookie: me.cookie, body: { password: PW, code: '000000' } }); T('验证码错 → 403 admin_reauth_failed', r.s === 403 && r.j.error === 'admin_reauth_failed', r);
  let w = await row(ME); T('错了：旧码原样、失败计数 +2、留痕 recovery.regen_fail 两条', JSON.stringify(w.recovery_hashes) === JSON.stringify(OLD.hashes) && w.failed_logins === 2 && await audit(ME, 'recovery.regen_fail') === 2, w);
  T('错了：会话还在（没被踢出）', (await call('GET', '/admin/api/me', { cookie: me.cookie })).s === 200);

  // ---------- 验证码刚被用过（登录用的）→ 要等下一个 ----------
  const used = next(); await call('POST', '/admin/api/login', { body: { email: 'other@x.com', password: PW, code: used } });   // 别人用了这个验证码不影响我（按账号记）
  const lg = await login('me@x.com');                                              // 我登录又用掉一个时间步
  const stepNow = (await row(ME)).totp_last_step;
  r = await call('POST', REC, { cookie: lg.cookie, body: { password: PW, code: AU.totp(SEC, clock) } }); T('刚被登录用过的验证码 → 403（防重放）', r.s === 403 && r.j.error === 'admin_reauth_failed', r);
  T('重放被拒时旧码没动', JSON.stringify((await row(ME)).recovery_hashes) === JSON.stringify(OLD.hashes) && (await row(ME)).totp_last_step === stepNow);

  // ---------- 成功 ----------
  const ok = await call('POST', REC, { cookie: lg.cookie, body: { password: PW, code: next() } });
  const NEW = ok.j?.codes || [];
  T('成功 → 200，返回 10 个 xxxx-xxxx 格式、互不相同的新码', ok.s === 200 && NEW.length === 10 && NEW.every(x => /^[0-9a-f]{4}-[0-9a-f]{4}$/.test(x)) && new Set(NEW).size === 10, ok);
  w = await row(ME);
  T('成功：库里整批换成新码的哈希（旧的一个不剩）', w.recovery_hashes.length === 10 && w.recovery_hashes.every(h => !OLD.hashes.includes(h)) && JSON.stringify([...w.recovery_hashes].sort()) === JSON.stringify(NEW.map(AU.recoveryHash).sort()), w);
  T('成功：库里只有哈希，没有新码明文（表里任何文本列都搜不到）', !(JSON.stringify((await q(`select * from admin_users`)).rows) + JSON.stringify((await q(`select * from admin_audit_log`)).rows)).includes(NEW[0]));
  T('成功：失败计数清零，留痕 recovery.regen 一条（含「换之前还剩几个」）', w.failed_logins === 0 && await audit(ME, 'recovery.regen') === 1 && (await one(`select detail from admin_audit_log where action='recovery.regen'`)).detail.old_left === 10);
  r = await login('me@x.com', { recovery: OLD.codes[0] }); T('旧恢复码不能再登录', r.s === 401, r);
  r = await login('me@x.com', { recovery: NEW[0] }); T('新恢复码可以登录（用掉一个）', r.s === 200 && (await row(ME)).recovery_hashes.length === 9, r);
  r = await login('me@x.com', { recovery: NEW[0] }); T('新恢复码也是一次性的', r.s === 401, r);
  T('别的管理员的恢复码没动', JSON.stringify((await row(OT)).recovery_hashes) === JSON.stringify(OTHER.hashes));
  const again = await call('POST', REC, { cookie: lg.cookie, body: { password: PW, code: next() } }); T('可以再换一次，上一批作废', again.s === 200 && again.j.codes.length === 10 && (await row(ME)).recovery_hashes.every(h => !NEW.map(AU.recoveryHash).includes(h)), again);

  // ---------- 锁定：和登录共用计数 ----------
  const lg2 = await login('me@x.com');
  for (let i = 0; i < 5; i++) r = await call('POST', REC, { cookie: lg2.cookie, body: { password: 'wrong password!!', code: next() } });
  w = await row(ME); T('连错 5 次：账号被锁 15 分钟', !!w.locked_until && w.failed_logins >= 5, w);
  r = await call('POST', REC, { cookie: lg2.cookie, body: { password: PW, code: next() } }); T('锁定期间就算密码和验证码都对也换不了 → 429', r.s === 429 && r.j.error === 'admin_locked', r);
  T('锁定期间旧码没被换掉', (await row(ME)).recovery_hashes.every(h => again.j.codes.map(AU.recoveryHash).includes(h)));
  r = await call('POST', '/admin/api/login', { body: { email: 'me@x.com', password: PW, code: next() } }); T('锁定也挡住登录（同一个计数）', r.s === 429, r);

  // ---------- 只读角色也能换自己的 ----------
  const vw = await login('view@x.com'); r = await call('POST', REC, { cookie: vw.cookie, body: { password: PW, code: next() } });
  T('只读角色可以换自己的恢复码', r.s === 200 && r.j.codes.length === 10 && (await row(VW)).recovery_hashes.every(h => !VRC.hashes.includes(h)), r);
  // ---------- 数据库函数不能被前台角色调用 ----------
  const cl = await su.connect(); try { for (const role of ['nbq_user', 'nbq_admin', 'nbq_viewer', 'nbq_service']) { await cl.query('begin'); await cl.query(`set local role ${role}`);
    let denied = false; try { await cl.query(`select admin_recovery_regen($1,true,1,array[]::text[],null)`, [ME]) } catch (e) { denied = /permission denied/.test(e.message) } await cl.query('rollback'); T(`${role} 不能直接调 admin_recovery_regen`, denied) } } finally { cl.release() }
} finally { try { await su?.end() } catch (_) { } c.stop() }
console.log(`admin_recovery: ${pass} 通过, ${fail} 失败`); process.exit(fail ? 1 : 0);
