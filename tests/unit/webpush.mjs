// 5g-3 第 4 步：Web Push（server/notify/webpush.mjs）。加密用 Node 自带的 crypto 另写一份接收端（RFC 8291 §3.4）互相对照，
//   再对照 RFC 8291 附录 A 的例子（固定 salt 和临时密钥时密文必须一模一样）；VAPID 令牌用公钥验签；发送接口的状态码、头、订阅失效处理。
import path from 'path'; import { fileURLToPath } from 'url'; import nodeCrypto from 'crypto';
const HERE = path.dirname(fileURLToPath(import.meta.url)), DIR = process.argv[2] || process.env.NBQ_DIR || path.join(HERE, '..', '..');
const { encryptPayload, vapidHeader, webPush, b64u, unb64u } = await import(path.join(DIR, 'server/notify/webpush.mjs'));
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 400) : '')) };

// 接收端（浏览器做的事），用 node:crypto 独立实现
function decrypt(body, uaPrivB64, uaPubB64, authB64) {
  const salt = body.subarray(0, 16), rs = body.readUInt32BE(16), idlen = body[20], asPub = body.subarray(21, 21 + idlen), ct = body.subarray(21 + idlen);
  const ecdh = nodeCrypto.createECDH('prime256v1'); ecdh.setPrivateKey(Buffer.from(uaPrivB64, 'base64url'));
  const secret = ecdh.computeSecret(asPub), ua = Buffer.from(uaPubB64, 'base64url');
  const ikm = Buffer.from(nodeCrypto.hkdfSync('sha256', secret, Buffer.from(authB64, 'base64url'), Buffer.concat([Buffer.from('WebPush: info\0'), ua, asPub]), 32));
  const cek = Buffer.from(nodeCrypto.hkdfSync('sha256', ikm, salt, 'Content-Encoding: aes128gcm\0', 16)), nonce = Buffer.from(nodeCrypto.hkdfSync('sha256', ikm, salt, 'Content-Encoding: nonce\0', 12));
  const d = nodeCrypto.createDecipheriv('aes-128-gcm', cek, nonce); d.setAuthTag(ct.subarray(ct.length - 16));
  const pt = Buffer.concat([d.update(ct.subarray(0, ct.length - 16)), d.final()]); return { rs, plain: pt.subarray(0, pt.lastIndexOf(2)) };
}
const newRecipient = () => { const e = nodeCrypto.createECDH('prime256v1'); e.generateKeys(); return { priv: e.getPrivateKey().toString('base64url'), p256dh: e.getPublicKey().toString('base64url'), auth: nodeCrypto.randomBytes(16).toString('base64url') } };

// 1 加密 ↔ 解密
const R = newRecipient(), msg = JSON.stringify({ title: '有人申请加入', body: 'Leo 想打你的球局 🎾', data: { kind: 'request', game_id: 'abc' } });
let body = Buffer.from(await encryptPayload(new TextEncoder().encode(msg), R));
let d = decrypt(body, R.priv, R.p256dh, R.auth);
T('加密后接收端能解开，内容一致（含中文和表情）', d.plain.toString() === msg, d.plain.toString());
T('记录大小 4096，头部长度 = 16+4+1+65', d.rs === 4096 && body[20] === 65 && body.length === 21 + 65 + Buffer.byteLength(msg) + 1 + 16, body.length);
const body2 = Buffer.from(await encryptPayload(new TextEncoder().encode(msg), R)); T('每次加密的盐和临时密钥都不同', !body.equals(body2) && !body.subarray(0, 16).equals(body2.subarray(0, 16)));
{ const o = newRecipient(); let ok = false; try { decrypt(body, o.priv, o.p256dh, o.auth); ok = true } catch (_) { } T('别的订阅解不开', !ok); }
{ let e = null; try { await encryptPayload(new Uint8Array(4000), R) } catch (x) { e = x.message } T('载荷太大 → 报错', e === 'payload_too_large', e); }
{ let e = null; try { await encryptPayload(new Uint8Array(3), { p256dh: 'AAAA', auth: R.auth }) } catch (x) { e = x.message } T('订阅密钥格式不对 → 报错', e === 'bad_subscription_keys', e); }

// 2 RFC 8291 附录 A
{ const asPriv = 'yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw', asPub = 'BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8';
  const jwk = { kty: 'EC', crv: 'P-256', d: asPriv, x: b64u(unb64u(asPub).slice(1, 33)), y: b64u(unb64u(asPub).slice(33, 65)) };
  const eph = { privateKey: await crypto.subtle.importKey('jwk', jwk, { name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveBits']), publicKey: await crypto.subtle.importKey('jwk', { ...jwk, d: undefined }, { name: 'ECDH', namedCurve: 'P-256' }, true, []) };
  const sub = { p256dh: 'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4', auth: 'BTBZMqHH6r4Tts7J_aSIgg' };
  const out = Buffer.from(await encryptPayload(new TextEncoder().encode('When I grow up, I want to be a watermelon'), sub, { salt: unb64u('DGv6ra1nlYgDCS1FRnbzlw'), ephemeral: eph }));
  const want = 'DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPTpK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN';
  T('RFC 8291 附录 A：头部（盐 / 记录大小 / 公钥）一致', out.toString('base64url').startsWith(want.slice(0, 21 + 65 > 0 ? 116 : 0)), out.toString('base64url').slice(0, 120));
  const dd = decrypt(out, 'q1dXpw3UpT5VOmu_cf_v6ih07Aems3njxI-JWgLcM94', sub.p256dh, sub.auth); T('RFC 8291 附录 A：用例子里的接收端私钥能解出原文', dd.plain.toString() === 'When I grow up, I want to be a watermelon', dd.plain.toString());
  T('RFC 8291 附录 A：整段密文与 RFC 一致', out.toString('base64url') === want, out.toString('base64url')); }

// 3 VAPID
const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
const pub = b64u(await crypto.subtle.exportKey('raw', kp.publicKey)), priv = (await crypto.subtle.exportKey('jwk', kp.privateKey)).d;
const NOW = 1_800_000_000_000, EP = 'https://fcm.googleapis.com/fcm/send/abc';
const hdr = await vapidHeader(EP, { publicKey: pub, privateKey: priv, subject: 'mailto:a@b.c' }, NOW);
const m = /^vapid t=([\w-]+)\.([\w-]+)\.([\w-]+), k=([\w-]+)$/.exec(hdr); T('VAPID 头格式：vapid t=…, k=…', !!m && m[4] === pub, hdr);
const claims = JSON.parse(Buffer.from(m[2], 'base64url')); T('VAPID 声明：aud = 推送服务的源、exp 在 12 小时内、sub 正确', claims.aud === 'https://fcm.googleapis.com' && claims.exp === NOW / 1000 + 43200 && claims.sub === 'mailto:a@b.c', claims);
T('VAPID 头部声明 ES256', JSON.parse(Buffer.from(m[1], 'base64url')).alg === 'ES256');
T('VAPID 签名用公钥验得过（64 字节 r||s）', Buffer.from(m[3], 'base64url').length === 64 && await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, kp.publicKey, Buffer.from(m[3], 'base64url'), new TextEncoder().encode(m[1] + '.' + m[2])));
T('VAPID 签名被改一个字就验不过', !(await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, kp.publicKey, Buffer.from(m[3], 'base64url'), new TextEncoder().encode(m[1] + '.' + m[2] + 'x'))));

// 4 发送接口
let calls = []; const mk = (status, over = {}) => webPush({ publicKey: pub, privateKey: priv, subject: 'mailto:a@b.c', now: () => NOW, fetch: async (u, o) => { calls.push({ u, o }); if (over.throws) throw new Error('network down'); return { status } }, ...over });
const sub = { endpoint: EP, p256dh: R.p256dh, auth: R.auth, platform: 'android' };
let r = await mk(201).send(sub, { title: 't', body: 'b', data: { kind: 'request', game_id: 'ab12-cd/34' } });
T('发送：201 → status 201', r.status === 201, r);
const c = calls[0]; T('发送：POST 到订阅地址，头里有 aes128gcm / TTL / Authorization', c.u === EP && c.o.method === 'POST' && c.o.headers['Content-Encoding'] === 'aes128gcm' && c.o.headers.TTL === '21600' && /^vapid t=/.test(c.o.headers.Authorization), c.o.headers);
T('发送：申请类带 Topic（只含合法字符且 ≤ 32），不算紧急', c.o.headers.Urgency === 'normal' && /^[A-Za-z0-9_-]{1,32}$/.test(c.o.headers.Topic), c.o.headers);
calls = []; await mk(201).send(sub, { title: 't', data: { kind: 'soon' } }); T('发送：开打提醒等紧急类 Urgency=high', calls[0].o.headers.Urgency === 'high', calls[0].o.headers);
T('发送：发出去的内容接收端能解开', JSON.parse(decrypt(Buffer.from(c.o.body), R.priv, R.p256dh, R.auth).plain.toString()).title === 't');
calls = []; await mk(201).send(sub, { title: 't', body: 'b', data: { kind: 'result' } }); T('发送：非紧急类 normal，没有 Topic', calls[0].o.headers.Urgency === 'normal' && !('Topic' in calls[0].o.headers), calls[0].o.headers);
T('发送：订阅失效（410）原样返回，让发送程序清掉', (await mk(410).send(sub, { title: 't' })).status === 410 && (await mk(404).send(sub, { title: 't' })).status === 404);
r = await mk(0, { throws: true }).send(sub, { title: 't' }); T('发送：网络错误 → status 0 带原因，不抛出', r.status === 0 && /network down/.test(r.error), r);
r = await mk(201).send({ ...sub, p256dh: 'bad' }, { title: 't' }); T('发送：订阅密钥坏了 → status 0，不抛出', r.status === 0 && /bad_subscription_keys/.test(r.error), r);
{ let e = null; try { webPush({ publicKey: pub }) } catch (x) { e = x.message } T('没配 VAPID → 创建时报 vapid_not_configured', e === 'vapid_not_configured', e); }

console.log(`webpush: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
