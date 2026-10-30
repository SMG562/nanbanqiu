// 南伴球 · Web Push（WebCrypto 版，能在 Cloudflare Workers 里跑；不依赖 web-push 库 / node:https）。
//   VAPID：RFC 8292（ES256 签名的 JWT，Authorization: vapid t=…, k=…）；加密：RFC 8291（aes128gcm，单条记录）。
//   对外接口和 adapters.mjs 的 webPush 一样：push.send({endpoint, p256dh, auth}, payload) → { status }（201 送达；404 / 410 订阅失效；其他 = 失败）。
//   密钥：VAPID_PUBLIC（65 字节未压缩公钥的 base64url）、VAPID_PRIVATE（32 字节私钥的 base64url）；用 `node tools/vapid.mjs` 生成。
import { URGENT } from './rules.mjs';

const enc = new TextEncoder();
export const b64u = b => Buffer.from(b).toString('base64url');
export const unb64u = s => new Uint8Array(Buffer.from(s, 'base64url'));
const cat = (...a) => { const o = new Uint8Array(a.reduce((n, x) => n + x.length, 0)); let i = 0; for (const x of a) { o.set(x, i); i += x.length } return o };
const hkdf = async (salt, ikm, info, bytes) => new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']), bytes * 8));

// RFC 8291：把 payload（字节）加密给订阅（ua_public = p256dh，auth_secret = auth）。salt / 临时密钥只在测试里传入（对照 RFC 的例子）。
export async function encryptPayload(data, { p256dh, auth }, { salt = crypto.getRandomValues(new Uint8Array(16)), ephemeral } = {}) {
  const ua = unb64u(p256dh), authSecret = unb64u(auth);
  if (ua.length !== 65 || ua[0] !== 4 || authSecret.length !== 16) throw new Error('bad_subscription_keys');
  const eph = ephemeral || await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const asPublic = new Uint8Array(await crypto.subtle.exportKey('raw', eph.publicKey));
  const uaKey = await crypto.subtle.importKey('raw', ua, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, eph.privateKey, 256));
  const ikm = await hkdf(authSecret, ecdh, cat(enc.encode('WebPush: info\0'), ua, asPublic), 32);
  const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16), nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12);
  if (data.length > 3993) throw new Error('payload_too_large');                 // 4096 − 16（标签）− 1（分隔）− 86（头）
  const body = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']), cat(data, new Uint8Array([2]))));
  const rs = new Uint8Array(4); new DataView(rs.buffer).setUint32(0, 4096);
  return cat(salt, rs, new Uint8Array([65]), asPublic, body);
}

// RFC 8292：VAPID 的 Authorization 头
export async function vapidHeader(endpoint, { publicKey, privateKey, subject }, now = Date.now()) {
  const pub = unb64u(publicKey);
  const key = await crypto.subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', x: b64u(pub.slice(1, 33)), y: b64u(pub.slice(33, 65)), d: privateKey }, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const h = b64u(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' }))), p = b64u(enc.encode(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(now / 1000) + 12 * 3600, sub: subject })));
  const sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(h + '.' + p)));   // WebCrypto 直接给 r||s（JWT 要的格式）
  return `vapid t=${h}.${p}.${b64u(sig)}, k=${publicKey}`;
}

export function webPush({ publicKey, privateKey, subject, fetch: f = fetch, now = () => Date.now() }) {
  if (!publicKey || !privateKey || !subject) throw new Error('vapid_not_configured');
  return {
    async send(sub, payload) {
      try {
        const body = await encryptPayload(enc.encode(JSON.stringify(payload)), sub);
        const kind = payload.data?.kind, headers = { Authorization: await vapidHeader(sub.endpoint, { publicKey, privateKey, subject }, now()), 'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream', TTL: String(6 * 3600), Urgency: URGENT.has(kind) ? 'high' : 'normal' };
        if (kind === 'request') headers.Topic = ('req-' + String(payload.data.game_id || '')).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 32);   // 同一局的申请推送互相替换
        const r = await f(sub.endpoint, { method: 'POST', headers, body });
        return { status: r.status };
      } catch (e) { return { status: 0, error: String(e && e.message || e) } }
    },
  };
}
