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
