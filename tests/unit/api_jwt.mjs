// 5g-3 第 1 步：接口层令牌验证（server/api/jwt.mjs）。用测试时现生成的密钥签令牌、假的 fetch 提供公钥，不连网。
import path from 'path'; import { fileURLToPath } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url)), DIR = process.argv[2] || process.env.NBQ_DIR || path.join(HERE, '..', '..');
const { makeVerifier } = await import(path.join(DIR, 'server/api/jwt.mjs'));
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x) : '')) };

const URL_ = 'https://abc.supabase.co', ISS = URL_ + '/auth/v1', SUB = '6f1d2c3a-1111-4222-8333-944455556666';
const u8 = b => Buffer.from(b).toString('base64url');
const gen = async (alg, kid) => {
  const [imp] = alg === 'ES256' ? [{ name: 'ECDSA', namedCurve: 'P-256' }] : [{ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }];
  const kp = await crypto.subtle.generateKey(imp, true, ['sign', 'verify']);
  return { kp, alg, kid, jwk: { ...(await crypto.subtle.exportKey('jwk', kp.publicKey)), alg, kid, use: 'sig' } };
};
const sign = async (k, claims, hdr = {}) => {
  const h = u8(JSON.stringify({ alg: k.alg, typ: 'JWT', kid: k.kid, ...hdr })), p = u8(JSON.stringify(claims)), d = new TextEncoder().encode(h + '.' + p);
  const a = k.alg === 'ES256' ? { name: 'ECDSA', hash: 'SHA-256' } : { name: 'RSASSA-PKCS1-v1_5' };
  return h + '.' + p + '.' + u8(await crypto.subtle.sign(a, k.kp.privateKey, d));
};
const NOW = 1_800_000_000_000, claims = (x = {}) => ({ iss: ISS, aud: 'authenticated', sub: SUB, exp: NOW / 1000 + 3600, ...x });
const es = await gen('ES256', 'k-es'), rs = await gen('RSA256'.replace('RSA', 'RS'), 'k-rs'), other = await gen('ES256', 'k-es');   // other：同 kid 不同密钥
let fetches = 0, jwks = [es.jwk, rs.jwk], t = NOW;
const f = async u => { fetches++; if (u !== ISS + '/.well-known/jwks.json') return { ok: false, status: 404 }; return { ok: true, json: async () => ({ keys: jwks }) } };
const V = () => makeVerifier({ url: URL_ + '/', fetch: f, now: () => t });

let v = V(), r = await v(await sign(es, claims()));
T('ES256 正常令牌通过，sub 取出', r.ok && r.sub === SUB, r);
T('RS256 正常令牌通过', (await v(await sign(rs, claims()))).ok);
T('公钥缓存：连续验证只取一次', fetches === 1, fetches);
T('签名被换（同 kid 不同密钥）→ bad_signature', (await v(await sign(other, claims()))).code === 'bad_signature');
T('内容被改（签名对不上）→ bad_signature', await (async () => { const tk = await sign(es, claims()), p = tk.split('.'); p[1] = u8(JSON.stringify(claims({ sub: '00000000-0000-4000-8000-000000000000' }))); return (await v(p.join('.'))).code === 'bad_signature' })());
T('过期 → expired', (await v(await sign(es, claims({ exp: NOW / 1000 - 60 })))).code === 'expired');
T('刚过期 30 秒内容许时钟误差', (await v(await sign(es, claims({ exp: NOW / 1000 - 10 })))).ok);
T('还没生效（nbf 在未来）→ not_yet_valid', (await v(await sign(es, claims({ nbf: NOW / 1000 + 120 })))).code === 'not_yet_valid');
T('签发方不对 → bad_issuer', (await v(await sign(es, claims({ iss: 'https://evil.supabase.co/auth/v1' })))).code === 'bad_issuer');
T('受众不对（anon / service_role）→ bad_audience', (await v(await sign(es, claims({ aud: 'anon' })))).code === 'bad_audience');
T('受众是数组且含 authenticated 通过', (await v(await sign(es, claims({ aud: ['x', 'authenticated'] })))).ok);
T('sub 不是 uuid → bad_subject', (await v(await sign(es, claims({ sub: 'not-a-uuid' })))).code === 'bad_subject');
T('没有 exp → expired（不能永久有效）', (await v(await sign(es, (({ exp, ...c }) => c)(claims())))).code === 'expired');
T('HS256（共享密钥）一律拒绝', (await v(u8('{"alg":"HS256","typ":"JWT","kid":"k-es"}') + '.' + u8(JSON.stringify(claims())) + '.AAAA')).code === 'alg_not_allowed');
T('alg=none 拒绝', (await v(u8('{"alg":"none","kid":"k-es"}') + '.' + u8(JSON.stringify(claims())) + '.')).code === 'alg_not_allowed');
T('没有 kid → no_kid', (await v(await sign(es, claims(), { kid: undefined }))).code === 'no_kid');
for (const bad of ['', 'abc', 'a.b', 'a.b.c.d', null, undefined, 'not.base64!.sig']) T('格式不对不抛错：' + JSON.stringify(bad), (await v(bad)).ok === false);

// 新 kid：缓存里没有 → 重新取一次（限速每分钟 1 次）
const ne = await gen('ES256', 'k-new'); v = V(); await v(await sign(es, claims())); const before = fetches;
T('没见过的 kid、公钥里也没有 → unknown_key', (await v(await sign(ne, claims()))).code === 'unknown_key');
const afterMiss = fetches; t += 5_000;
T('5 秒内再来一个不认识的 kid，不会再取公钥（限速）', (await v(await sign(ne, claims()))).code === 'unknown_key' && fetches === afterMiss, [before, afterMiss, fetches]);
jwks = [es.jwk, rs.jwk, ne.jwk]; t += 61_000;
T('密钥轮换：新 kid 出现在公钥里，一分钟后自动取到并通过', (await v(await sign(ne, claims({ exp: (NOW + 200_000) / 1000 })))).ok);

// 公钥取不到
v = makeVerifier({ url: URL_, fetch: async () => { throw new Error('offline') }, now: () => t });
T('取公钥失败 → jwks_unavailable（不放行）', (await v(await sign(es, claims()))).code === 'jwks_unavailable');
v = makeVerifier({ url: URL_, fetch: async () => ({ ok: false, status: 500 }), now: () => t });
T('公钥接口 500 → jwks_unavailable', (await v(await sign(es, claims()))).code === 'jwks_unavailable');
T('没配项目地址 → not_configured', (await makeVerifier({ url: '', fetch: f })(await sign(es, claims()))).code === 'not_configured');

console.log(`api_jwt: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
