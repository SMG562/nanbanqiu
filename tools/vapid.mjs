// 生成一对 VAPID 密钥（Web Push 用）。公钥给前台订阅时用，私钥只放在发送程序的密钥里（VAPID_PRIVATE）。用法：node tools/vapid.mjs
import { webcrypto as c } from 'crypto';
const kp = await c.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign']);
const pub = Buffer.from(await c.subtle.exportKey('raw', kp.publicKey)).toString('base64url'), jwk = await c.subtle.exportKey('jwk', kp.privateKey);
console.log(`VAPID_PUBLIC=${pub}\nVAPID_PRIVATE=${jwk.d}\nVAPID_SUBJECT=mailto:hello@nanbanqiu.app`);
