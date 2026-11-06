// 南伴球 · 后台登录（第五批 5c）。数据库（schema ⑰）管次数、锁定、会话；这里管密码、两步验证、恢复码、令牌的计算，以及每个请求的身份。
//   密码：scrypt（N=2^15, r=8, p=1, 32 字节盐）· 两步验证：TOTP（RFC 6238，SHA-1，30 秒，6 位，前后各容忍 1 步，同一步不能用两次）
//   恢复码：10 个 xxxx-xxxx，只存 sha256，用一个少一个 · 会话：32 字节随机令牌放 httpOnly + Secure + SameSite=Strict Cookie，数据库只存 sha256
import crypto from 'crypto';

const SCRYPT = { N: 1 << 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
export function hashPassword(pw) {
  if (typeof pw !== 'string' || pw.length < 12) throw new Error('password_too_short');   // 至少 12 位
  const salt = crypto.randomBytes(32), key = crypto.scryptSync(pw.normalize('NFKC'), salt, 32, SCRYPT);
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString('base64')}$${key.toString('base64')}`;
}
export function verifyPassword(pw, stored) {
  const [k, N, r, p, s, h] = String(stored).split('$'); if (k !== 'scrypt') return false;
  const want = Buffer.from(h, 'base64'), got = crypto.scryptSync(String(pw).normalize('NFKC'), Buffer.from(s, 'base64'), want.length, { N: +N, r: +r, p: +p, maxmem: SCRYPT.maxmem });
  return crypto.timingSafeEqual(want, got);
}

// Base32（RFC 4648，无填充）
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export const b32encode = buf => { let bits = 0, v = 0, out = ''; for (const b of buf) { v = (v << 8) | b; bits += 8; while (bits >= 5) { out += B32[(v >>> (bits - 5)) & 31]; bits -= 5 } } if (bits) out += B32[(v << (5 - bits)) & 31]; return out };
export const b32decode = str => { const s = str.replace(/[\s=-]/g, '').toUpperCase(); let bits = 0, v = 0; const out = []; for (const ch of s) { const i = B32.indexOf(ch); if (i < 0) throw new Error('bad_base32'); v = (v << 5) | i; bits += 5; if (bits >= 8) { out.push((v >>> (bits - 8)) & 255); bits -= 8 } } return Buffer.from(out) };
export const newTotpSecret = () => b32encode(crypto.randomBytes(20));
export const totpURI = (secret, email) => `otpauth://totp/${encodeURIComponent('南伴球后台:' + email)}?secret=${secret}&issuer=${encodeURIComponent('南伴球后台')}&algorithm=SHA1&digits=6&period=30`;
export function hotp(key, counter, digits = 6) {
  const c = Buffer.alloc(8); c.writeBigUInt64BE(BigInt(counter));
  const h = crypto.createHmac('sha1', key).update(c).digest(), o = h[h.length - 1] & 15;
  const n = ((h[o] & 127) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
  return String(n % 10 ** digits).padStart(digits, '0');
}
export const totp = (secretB32, now = Date.now(), digits = 6) => hotp(b32decode(secretB32), Math.floor(now / 30e3), digits);
// 返回匹配到的时间步（给数据库记 totp_last_step 防重放），不匹配返回 null
export function verifyTotp(secretB32, code, now = Date.now(), lastStep = null) {
  if (!/^\d{6}$/.test(String(code || ''))) return null;
  const key = b32decode(secretB32), step = Math.floor(now / 30e3);
  for (const d of [0, -1, 1]) { const s = step + d; if (lastStep != null && s <= lastStep) continue; if (crypto.timingSafeEqual(Buffer.from(hotp(key, s)), Buffer.from(String(code)))) return s }
  return null;
}
const sha256 = s => crypto.createHash('sha256').update(s).digest('hex');
export function newRecoveryCodes(n = 10) {
  const codes = Array.from({ length: n }, () => { const x = crypto.randomBytes(4).toString('hex'); return x.slice(0, 4) + '-' + x.slice(4) });
  return { codes, hashes: codes.map(c => sha256(c.toLowerCase())) };
}
export const recoveryHash = code => sha256(String(code).trim().toLowerCase());
export const newSessionToken = () => { const t = crypto.randomBytes(32).toString('base64url'); return { token: t, hash: sha256(t) } };
export const tokenHash = t => sha256(String(t));
export const COOKIE = token => `nbq_admin=${token}; Path=/admin; HttpOnly; Secure; SameSite=Strict; Max-Age=${12 * 3600}`;

// 连接来源：pg 的 Pool（pool.connect() / release()），或 Workers 里的 connect 函数（返回 pg.Client，end() 结束）
export async function acquire(src) {
  if (typeof src === 'function') { const c = await src(); return { db: c, release: () => c.end().catch(() => { }) } }
  const c = await src.connect(); return { db: c, release: () => c.release() };
}
// 后台接口的数据库登录角色（nbq_admin_api）自己就能调 6 个门禁函数（schema ㉚），不再切成 nbq_service：拿到后台接口的代码也碰不到前台那一套权限
let DUMMY; const dummyHash = () => (DUMMY ||= hashPassword('dummy-password-for-timing'));
const codeOf = e => { if (!e.code || /^[0-9A-Z]{5}$/.test(e.code)) e.code = e.message; return e };

// 这个 IP 最近失败太多 → 抛 rate_limited（detail = 还要等几秒）。在算 scrypt 之前调用
export async function adminAttemptCheck(src, ip) {
  const { db, release } = await acquire(src);
  try { await db.query('begin'); await db.query('select admin_attempt_check($1)', [ip]); await db.query('commit') }
  catch (e) { await db.query('rollback').catch(() => { }); throw codeOf(e) } finally { await release() }
}
// 失败后记一笔，单独提交（失败的登录事务会回滚，记在里面会丢）
export async function adminAttemptNote(src, ip) {
  const { db, release } = await acquire(src);
  try { await db.query('begin'); await db.query('select admin_attempt_note($1)', [ip]); await db.query('commit') }
  catch (e) { await db.query('rollback').catch(() => { }) } finally { await release() }
}

// 登录：{email, password, code（6 位两步验证码）| recovery（恢复码）} → {token} 或抛出错误码（admin_bad_login / admin_locked）
//   不管哪一步错，对外都只说「邮箱、密码或验证码不对」，避免猜出哪个账号存在；邮箱不存在 / 已停用时也照样算一次 scrypt，耗时和密码错误差不多
export async function adminLogin(src, { email, password, code, recovery, ip = null, ua = null, now = Date.now() }) {
  const { db, release } = await acquire(src);
  try {
    await db.query('begin');
    let a;
    try { a = (await db.query('select admin_login_begin($1) j', [email])).rows[0].j }
    catch (e) { if (e.message === 'admin_bad_login') verifyPassword(password, dummyHash()); throw e }
    let ok = verifyPassword(password, a.password_hash), step = null, rh = null;
    if (ok && recovery) rh = recoveryHash(recovery);
    else if (ok) { step = verifyTotp(a.totp_secret, code, now, a.totp_last_step); ok = step != null }
    const s = ok ? newSessionToken() : null;
    const r = (await db.query('select admin_login_finish($1,$2,$3,$4,$5,$6,$7) j', [a.id, ok, ip, ua, s && s.hash, step, rh])).rows[0].j;
    await db.query('commit');
    if (!r.ok) { const e = new Error('admin_bad_login'); e.code = 'admin_bad_login'; throw e }
    return { token: s.token, role: a.role, cookie: COOKIE(s.token) };
  } catch (e) { await db.query('rollback').catch(() => { }); throw codeOf(e) } finally { await release() }
}
// 重新生成恢复码：已登录 + 再证明一次是本人（密码 + 当前验证码）→ 整批替换旧码，新码明文只在返回值里出现这一次。
//   失败（密码或验证码不对）与登录共用失败计数（连错 5 次锁 15 分钟）；验证码刚被登录用过时要等下一个（防重放）
export async function adminRegenRecovery(src, token, { password, code, ip = null, now = Date.now() }) {
  const { db, release } = await acquire(src);
  try {
    await db.query('begin');
    const s = (await db.query('select admin_session_check($1) j', [tokenHash(token || '')])).rows[0].j;
    const a = (await db.query('select admin_reauth_begin($1) j', [s.id])).rows[0].j;
    let ok = verifyPassword(password, a.password_hash), step = null;
    if (ok) { step = verifyTotp(a.totp_secret, code, now, a.totp_last_step); ok = step != null }
    const rc = ok ? newRecoveryCodes() : null;
    const r = (await db.query('select admin_recovery_regen($1,$2,$3,$4,$5) j', [s.id, ok, step, rc && rc.hashes, ip])).rows[0].j;
    await db.query('commit');
    if (!r.ok) { const e = new Error('admin_reauth_failed'); e.code = 'admin_reauth_failed'; throw e }
    return { codes: rc.codes };
  } catch (e) { await db.query('rollback').catch(() => { }); throw codeOf(e) } finally { await release() }
}
// 每个后台请求：校验 Cookie 里的令牌 → 以对应数据库角色、带上管理员 id 开事务执行 fn(db, admin)
export async function adminRequest(src, token, fn, { ip = null } = {}) {
  const { db, release } = await acquire(src);
  try {
    await db.query('begin');
    const a = (await db.query('select admin_session_check($1) j', [tokenHash(token || '')])).rows[0].j;
    await db.query('commit');
    await db.query('begin'); await db.query(`set local role ${a.db_role === 'nbq_viewer' ? 'nbq_viewer' : 'nbq_admin'}`);
    await db.query(`select set_config('nbq.admin', $1, true), set_config('nbq.admin_ip', $2, true)`, [a.id, ip || '']);
    const out = await fn(db, a); await db.query('commit'); return out;
  } catch (e) { await db.query('rollback').catch(() => { }); throw codeOf(e) } finally { await release() }
}
export async function adminLogout(src, token) {
  const { db, release } = await acquire(src);
  try { await db.query('begin'); await db.query('select admin_session_revoke($1)', [tokenHash(token || '')]); await db.query('commit') }
  catch (e) { await db.query('rollback').catch(() => { }); throw codeOf(e) } finally { await release() }
}
