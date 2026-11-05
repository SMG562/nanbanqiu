// 探针（不合并）：@simplewebauthn/server 能不能在 Cloudflare Pages Functions 里打包、并真的验一次签名。
//   在函数里自己生成 ES256 密钥，造一份「通行密钥登录」的数据（authenticatorData / clientDataJSON / 签名），交给库验证；
//   再试几种该被拒绝的情况（挑战不对、域名不对、计数没增加、签名被改）。返回每一项是否符合预期。
import { generateAuthenticationOptions, verifyAuthenticationResponse } from '@simplewebauthn/server';

const b64u = u8 => btoa(String.fromCharCode(...u8)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const cat = (...a) => { const n = a.reduce((s, x) => s + x.length, 0), o = new Uint8Array(n); let i = 0; for (const x of a) { o.set(x, i); i += x.length } return o };
const sha = async d => new Uint8Array(await crypto.subtle.digest('SHA-256', d));
// WebCrypto 给的是 r||s（64 字节）；WebAuthn 要 DER
const der = raw => { const t = x => { let i = 0; while (i < x.length - 1 && x[i] === 0) i++; x = x.slice(i); if (x[0] & 0x80) x = cat(new Uint8Array([0]), x); return cat(new Uint8Array([2, x.length]), x) }; const r = t(raw.slice(0, 32)), s = t(raw.slice(32)); return cat(new Uint8Array([0x30, r.length + s.length]), r, s) };
const cose = (x, y) => cat(new Uint8Array([0xa5, 1, 2, 3, 0x26, 0x20, 1, 0x21, 0x58, 0x20]), x, new Uint8Array([0x22, 0x58, 0x20]), y);

export const onRequest = async () => {
  const out = { steps: {} }; const RP = 'probe.test', ORIGIN = 'https://probe.test';
  try {
    const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
    const pub = new Uint8Array(await crypto.subtle.exportKey('raw', kp.publicKey));        // 04 || x || y
    const publicKey = cose(pub.slice(1, 33), pub.slice(33, 65));
    const opts = await generateAuthenticationOptions({ rpID: RP, userVerification: 'required' }); out.steps.options = typeof opts.challenge === 'string' && opts.challenge.length >= 16;
    const make = async ({ challenge = opts.challenge, origin = ORIGIN, counter = 5, flags = 0x05, tamper = false } = {}) => {
      const cd = new TextEncoder().encode(JSON.stringify({ type: 'webauthn.get', challenge, origin, crossOrigin: false }));
      const ad = cat(await sha(new TextEncoder().encode(RP)), new Uint8Array([flags, 0, 0, (counter >> 8) & 255, counter & 255]));
      let sig = der(new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, kp.privateKey, cat(ad, await sha(cd)))));
      if (tamper) sig = cat(sig.slice(0, sig.length - 1), new Uint8Array([sig[sig.length - 1] ^ 1]));
      return { id: 'cred1', rawId: 'cred1', type: 'public-key', clientExtensionResults: {}, response: { clientDataJSON: b64u(cd), authenticatorData: b64u(ad), signature: b64u(sig) } };
    };
    const base = { expectedChallenge: opts.challenge, expectedOrigin: ORIGIN, expectedRPID: RP, requireUserVerification: true, credential: { id: 'cred1', publicKey, counter: 4 } };
    const run = async (resp, over = {}) => { try { const r = await verifyAuthenticationResponse({ response: resp, ...base, ...over }); return r.verified ? { ok: true, counter: r.authenticationInfo.newCounter } : { ok: false } } catch (e) { return { ok: false, err: String(e.message).slice(0, 80) } } };
    const good = await run(await make()); out.steps.valid = good.ok === true && good.counter === 5;
    out.steps.wrong_challenge = (await run(await make({ challenge: 'AAAAAAAAAAAAAAAAAAAAAA' }))).ok === false;
    out.steps.wrong_origin = (await run(await make({ origin: 'https://evil.test' }))).ok === false;
    out.steps.counter_not_increased = (await run(await make({ counter: 4 }))).ok === false;
    out.steps.user_not_verified = (await run(await make({ flags: 0x01 }))).ok === false;
    out.steps.tampered_signature = (await run(await make({ tamper: true }))).ok === false;
    out.steps.wrong_rpid = (await run(await make(), { expectedRPID: 'other.test' })).ok === false;
    out.ok = Object.values(out.steps).every(v => v === true);
  } catch (e) { out.ok = false; out.error = String(e && e.message || e).slice(0, 200) }
  return Response.json(out, { headers: { 'Cache-Control': 'no-store' } });
};
