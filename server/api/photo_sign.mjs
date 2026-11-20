// 场边照片读地址的签名（#393 P2，ADR 0015）：读图走本站接口，地址 = /api/sideline/photo/<uid>/<名>?v=full|t|b&e=<过期秒>&s=<签名>[&p=1]
//   签名 = HMAC-SHA256(NBQ_PHOTO_KEY, "<uid>/<名>|<变体>|<过期>|<p>")，用 Web Crypto（Workers / Pages / Node 都有）。
//   过期 = 当前 15 分钟时段的结尾再加一个时段 → 剩余有效期 15–30 分钟；同一时段所有人拿到同一个地址，边缘缓存才能命中。
//   p=1 = 仅作者可见的帖子（过 24 小时 / 被后台隐藏）：同样要签名，响应用 private 缓存。
//   校验允许 SKEW 秒时钟偏差；过期时间离现在超过 1 小时一律当伪造（正常地址最远 30 分钟）。
const SLOT = 900, SKEW = 60, MAX_AHEAD = 3600, enc = new TextEncoder();
export const VIEWS = { full: '', t: '-t', b: '-b' };   // 变体 → 对象键后缀
export const expiryAt = nowSec => (Math.floor(nowSec / SLOT) + 2) * SLOT;
const b64u = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const msgOf = (uid, name, v, e, p) => `${uid}/${name}|${v}|${e}|${p ? 1 : 0}`;
export async function signPhoto(secret, uid, name, v, e, p) {
  const k = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64u(await crypto.subtle.sign('HMAC', k, enc.encode(msgOf(uid, name, v, e, p))));
}
export async function photoUrl(secret, uid, name, v, e, p) {
  return `/api/sideline/photo/${uid}/${name}?v=${v}&e=${e}&s=${await signPhoto(secret, uid, name, v, e, p)}${p ? '&p=1' : ''}`;
}
const same = (a, b) => { if (a.length !== b.length) return false; let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0 };   // 常数时间比较
// → 'ok' | 'bad'（签名不对 / 过期时间离谱）| 'expired'
export async function verifyPhoto(secret, { uid, name, v, e, p, s }, nowSec) {
  if (!Number.isInteger(e) || !(v in VIEWS) || typeof s !== 'string' || !same(s, await signPhoto(secret, uid, name, v, e, p))) return 'bad';
  if (e - nowSec > MAX_AHEAD) return 'bad';
  return nowSec > e + SKEW ? 'expired' : 'ok';
}
