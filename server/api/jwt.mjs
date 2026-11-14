// 南伴球 · 接口层：验证 Supabase 登录令牌（5g-3 第 1 步）。只用 WebCrypto，Node 和 Workers 通用，不装第三方库。
//   Supabase 新项目用非对称签名（ES256 / RS256），公钥在 <项目>/auth/v1/.well-known/jwks.json；旧的共享密钥（HS256）一律拒绝。
//   检查：签名、iss（<项目>/auth/v1）、aud（authenticated）、exp / nbf（允许 30 秒时钟误差）、sub 必须是 uuid。
const b64 = s => { s = s.replace(/-/g, '+').replace(/_/g, '/'); s += '='.repeat((4 - s.length % 4) % 4); const r = atob(s); return Uint8Array.from(r, c => c.charCodeAt(0)) };
const dec = s => JSON.parse(new TextDecoder().decode(b64(s)));
const ALG = { ES256: [{ name: 'ECDSA', namedCurve: 'P-256' }, { name: 'ECDSA', hash: 'SHA-256' }], RS256: [{ name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, { name: 'RSASSA-PKCS1-v1_5' }] };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// 公钥缓存：10 分钟；遇到没见过的 kid 最多每分钟重新取一次
export function makeVerifier({ url, fetch: f = globalThis.fetch, now = () => Date.now(), audience = 'authenticated' }) {
  const base = String(url || '').replace(/\/+$/, ''), iss = base + '/auth/v1', jwks = iss + '/.well-known/jwks.json';
  let keys = new Map(), at = 0, tried = 0;
  const load = async () => {
    tried = now(); const r = await f(jwks); if (!r.ok) throw new Error('jwks_http_' + r.status);
    const { keys: ks } = await r.json(); const m = new Map();
    for (const k of ks || []) { const a = ALG[k.alg]; if (!a || !k.kid) continue;
      try { m.set(k.kid, { alg: k.alg, key: await crypto.subtle.importKey('jwk', k, a[0], false, ['verify']) }) } catch (_) { } }
    keys = m; at = now();
  };
  return async function verify(token) {
    const bad = c => ({ ok: false, code: c });
    if (!base) return bad('not_configured');
    const p = String(token || '').split('.'); if (p.length !== 3) return bad('malformed');
    let h, c; try { h = dec(p[0]); c = dec(p[1]) } catch (_) { return bad('malformed') }
    if (!ALG[h.alg]) return bad('alg_not_allowed');
    if (!h.kid) return bad('no_kid');
    if (!keys.has(h.kid) && (now() - at > 600_000 || now() - tried > 60_000)) { try { await load() } catch (_) { return bad('jwks_unavailable') } }
    const k = keys.get(h.kid); if (!k || k.alg !== h.alg) return bad('unknown_key');
    let okSig = false; try { okSig = await crypto.subtle.verify(ALG[h.alg][1], k.key, b64(p[2]), new TextEncoder().encode(p[0] + '.' + p[1])) } catch (_) { }
    if (!okSig) return bad('bad_signature');
    const t = Math.floor(now() / 1000);
    if (c.iss !== iss) return bad('bad_issuer');
    if (!(Array.isArray(c.aud) ? c.aud.includes(audience) : c.aud === audience)) return bad('bad_audience');
    if (typeof c.exp !== 'number' || c.exp + 30 < t) return bad('expired');
    if (typeof c.nbf === 'number' && c.nbf - 30 > t) return bad('not_yet_valid');
    if (!UUID.test(c.sub || '')) return bad('bad_subject');
    return { ok: true, sub: c.sub.toLowerCase(), claims: c };
  };
}

// ---- 自签令牌（登录交接，11-14）----
// Supabase 的令牌只能由 Supabase 签发；Safari → 桌面图标的登录交接要接口层自己给新环境签一份。所以多一个签发方：
//   iss = OWN_ISS、ES256，私钥在密钥 NBQ_SESSION_KEY（EC P-256 的 JWK，含 d）；sub 仍是 Supabase 的 auth id（接口按它找球友，其余不变）。
//   没配密钥 = 不启用：makeSession 返回 null，交接接口 404，前台安静跳过。
//   生成密钥（输出整行就是密钥的值，只放进 Cloudflare 的密钥里，不进仓库）：
//     node -e "crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign']).then(k=>crypto.subtle.exportKey('jwk',k.privateKey)).then(j=>console.log(JSON.stringify(j)))"
//   换密钥 = 所有交接出来的登录下次续期前失效一次（1 小时内），之后用续期凭证自动换新，用户无感。
export const OWN_ISS = 'https://nanbanqiu.app/session';
export const issOf = token => { try { return dec(String(token).split('.')[1]).iss || null } catch (_) { return null } };
const b64u = bytes => { let s = ''; for (const b of bytes) s += String.fromCharCode(b); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') };
export function makeSession(key, { now = () => Date.now(), audience = 'authenticated' } = {}) {
  let jwk; try { jwk = typeof key === 'string' ? JSON.parse(key) : key } catch (_) { return null }
  if (!jwk || jwk.kty !== 'EC' || jwk.crv !== 'P-256' || !jwk.d || !jwk.x || !jwk.y) return null;
  const kid = String(jwk.kid || 'nbq1'), P = { name: 'ECDSA', namedCurve: 'P-256' }, S = { name: 'ECDSA', hash: 'SHA-256' }, enc = new TextEncoder();
  let keys = null;
  const load = () => keys ||= Promise.all([
    crypto.subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', x: jwk.x, y: jwk.y, d: jwk.d }, P, false, ['sign']),
    crypto.subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', x: jwk.x, y: jwk.y }, P, false, ['verify'])]);
  return {
    // 签一个 ttl 秒有效的令牌；claims 至少要有 sub
    async sign(claims, ttl = 3600) {
      const [priv] = await load(), t = Math.floor(now() / 1000);
      const h = b64u(enc.encode(JSON.stringify({ alg: 'ES256', typ: 'JWT', kid }))), p = b64u(enc.encode(JSON.stringify({ ...claims, iss: OWN_ISS, aud: audience, iat: t, exp: t + ttl })));
      return h + '.' + p + '.' + b64u(new Uint8Array(await crypto.subtle.sign(S, priv, enc.encode(h + '.' + p))));
    },
    // 和 makeVerifier 的 verify 同样的返回：{ ok, sub, claims } 或 { ok:false, code }
    async verify(token) {
      const bad = c => ({ ok: false, code: c }), p = String(token || '').split('.'); if (p.length !== 3) return bad('malformed');
      let h, c; try { h = dec(p[0]); c = dec(p[1]) } catch (_) { return bad('malformed') }
      if (h.alg !== 'ES256') return bad('alg_not_allowed');
      if (h.kid !== kid) return bad('unknown_key');
      let ok = false; try { const [, pub] = await load(); ok = await crypto.subtle.verify(S, pub, b64(p[2]), enc.encode(p[0] + '.' + p[1])) } catch (_) { }
      if (!ok) return bad('bad_signature');
      const t = Math.floor(now() / 1000);
      if (c.iss !== OWN_ISS) return bad('bad_issuer');
      if (c.aud !== audience) return bad('bad_audience');
      if (typeof c.exp !== 'number' || c.exp + 30 < t) return bad('expired');
      if (!UUID.test(c.sub || '')) return bad('bad_subject');
      return { ok: true, sub: c.sub.toLowerCase(), claims: c };
    },
  };
}
