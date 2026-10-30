// 5g-3 第 4 步：通知发送的运行入口（server/notify/run.mjs）。真 PostgreSQL + 真的 Web Push 加密（假的推送服务只记录请求）：
//   一条待发通知 → 推送到设备（接收端能解开）→ 记送达；订阅失效（410）清掉；没配的渠道跳过；定时 Worker 入口。
import { createRequire } from 'module'; import path from 'path'; import { fileURLToPath, pathToFileURL } from 'url'; import nodeCrypto from 'crypto';
import { startCluster, loadSchema } from './cluster.mjs';
const require = createRequire(import.meta.url); const pg = require('pg');
const HERE = path.dirname(fileURLToPath(import.meta.url)), DIR = process.env.NBQ_DIR || path.join(HERE, '..', '..');
const { runNotify } = await import(pathToFileURL(path.join(DIR, 'server/notify/run.mjs'))), worker = (await import(pathToFileURL(path.join(DIR, 'worker/notify.mjs')))).default;
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 500) : '')) };

function decrypt(body, uaPrivB64, uaPubB64, authB64) {
  const salt = body.subarray(0, 16), idlen = body[20], asPub = body.subarray(21, 21 + idlen), ct = body.subarray(21 + idlen);
  const e = nodeCrypto.createECDH('prime256v1'); e.setPrivateKey(Buffer.from(uaPrivB64, 'base64url'));
  const ikm = Buffer.from(nodeCrypto.hkdfSync('sha256', e.computeSecret(asPub), Buffer.from(authB64, 'base64url'), Buffer.concat([Buffer.from('WebPush: info\0'), Buffer.from(uaPubB64, 'base64url'), asPub]), 32));
  const cek = Buffer.from(nodeCrypto.hkdfSync('sha256', ikm, salt, 'Content-Encoding: aes128gcm\0', 16)), nonce = Buffer.from(nodeCrypto.hkdfSync('sha256', ikm, salt, 'Content-Encoding: nonce\0', 12));
  const d = nodeCrypto.createDecipheriv('aes-128-gcm', cek, nonce); d.setAuthTag(ct.subarray(ct.length - 16));
  const pt = Buffer.concat([d.update(ct.subarray(0, ct.length - 16)), d.final()]); return pt.subarray(0, pt.lastIndexOf(2)).toString();
}
const recipient = () => { const e = nodeCrypto.createECDH('prime256v1'); e.generateKeys(); return { priv: e.getPrivateKey().toString('base64url'), p256dh: e.getPublicKey().toString('base64url'), auth: nodeCrypto.randomBytes(16).toString('base64url') } };
const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
const VAPID = { VAPID_PUBLIC: Buffer.from(await crypto.subtle.exportKey('raw', kp.publicKey)).toString('base64url'), VAPID_PRIVATE: (await crypto.subtle.exportKey('jwk', kp.privateKey)).d, VAPID_SUBJECT: 'mailto:t@nanbanqiu.app' };
const quiet = { error() { }, info() { } };

// 没配的渠道
let r = await runNotify({}, { log: quiet }); T('没有数据库连接 → 全部跳过', r.skipped_all === 'db_not_configured' && r.passes === 0, r);
r = await runNotify({ DB_URL: 'postgres://x' }, { connect: async () => { throw new Error('should not connect') }, log: quiet }); T('有数据库但推送和邮件都没配 → 不连库、全部跳过', r.skipped_all === 'push_and_mail_not_configured', r);

const c = startCluster(); let admin;
try {
  c.createdb('nbq');
  const errs = loadSchema(c, 'nbq', path.join(DIR, 'schema.sql')); T('schema 执行无错误', !errs.length, errs.slice(0, 3));
  admin = new pg.Pool({ host: c.host, port: c.port, user: 'postgres', database: 'nbq', max: 3 });
  await admin.query(`create role nbq_api login in role nbq_user, nbq_service`);
  const connect = async () => { const cl = new pg.Client({ host: c.host, port: c.port, user: 'nbq_api', database: 'nbq' }); await cl.connect(); return cl };
  const q = (s, p) => admin.query(s, p), one = async (s, p) => (await q(s, p)).rows[0];
  const U1 = (await one(`insert into users(phone_e164,nickname,utr,pact_accepted_at) values ('+61400000011','收件人',5,now()) returning id`)).id;
  const U2 = (await one(`insert into users(phone_e164,nickname,utr,pact_accepted_at) values ('+61400000012','发起人',5,now()) returning id`)).id;
  await q(`update notifications set pushed_at = now() where pushed_at is null`);
  const R = recipient(), requests = [];
  const fakeFetch = status => async (url, init) => { requests.push({ url, init }); return { status: typeof status === 'function' ? status(url) : status } };
  const dev = (await one(`insert into user_devices(user_id,platform,push_endpoint,push_p256dh,push_auth,last_active_at) values ($1,'mobile','https://push.example/ok',$2,$3,null) returning id`, [U1, R.p256dh, R.auth])).id;
  const nid = (await one(`insert into notifications(user_id,kind,actor_id,created_at) values ($1,'joined',$2, now() - interval '1 minute') returning id`, [U1, U2])).id;

  // 一条通知推送出去
  r = await runNotify(VAPID, { connect, fetch: fakeFetch(201), passes: 1, log: quiet });
  T('推送：送达 1 条', r.delivered === 1 && r.passes === 1 && requests.length === 1, [r, requests.length]);
  T('推送：发到订阅地址，带 VAPID 和 aes128gcm', requests[0].url === 'https://push.example/ok' && /^vapid t=/.test(requests[0].init.headers.Authorization) && requests[0].init.headers['Content-Encoding'] === 'aes128gcm', requests[0].init.headers);
  { const p = JSON.parse(decrypt(Buffer.from(requests[0].init.body), R.priv, R.p256dh, R.auth)); T('推送：接收端解开后是这条通知的文字', typeof p.title === 'string' && p.title.length > 0 && /发起人/.test(JSON.stringify(p)), p); }
  T('通知标记已处理，送达记录写入，设备记最近送达时间', (await one('select pushed_at from notifications where id = $1', [nid])).pushed_at && +(await one('select count(*)::int n from notification_deliveries where notification_id = $1', [nid])).n >= 1 && (await one('select push_ok_at from user_devices where id = $1', [dev])).push_ok_at);
  r = await runNotify(VAPID, { connect, fetch: fakeFetch(201), passes: 1, log: quiet }); T('再跑一次不会重复推', r.delivered === 0 && requests.length === 1, [r, requests.length]);

  // 订阅失效
  const nid2 = (await one(`insert into notifications(user_id,kind,actor_id,created_at) values ($1,'joined',$2, now() - interval '1 minute') returning id`, [U1, U2])).id;
  r = await runNotify(VAPID, { connect, fetch: fakeFetch(410), passes: 1, log: quiet });
  T('推送服务返回 410 → 清掉这台设备的订阅', (await one('select push_endpoint from user_devices where id = $1', [dev])).push_endpoint === null, r);

  // 多轮、连库失败、入口
  let sleeps = 0; const t0 = Date.now(); r = await runNotify(VAPID, { connect, fetch: fakeFetch(201), passes: 3, gapMs: 20, log: quiet }); T('多轮：按 passes 跑，每轮之间等 gapMs', r.passes === 3 && Date.now() - t0 >= 40, r);
  let logged = ''; r = await runNotify(VAPID, { connect: async () => { throw new Error('connect ECONNREFUSED secret-host password=hunter2') }, fetch: fakeFetch(201), passes: 3, gapMs: 1, log: { error: (...a) => { logged += a.join(' ') } } });
  T('连不上数据库：不抛出、不继续后面几轮，日志里没有地址和密码', r.passes === 0 && !/secret-host|hunter2/.test(logged) && /dispatch_error/.test(logged), [r, logged]);
  const waits = []; const out = []; const env = { ...VAPID, DB_URL: 'x' };
  T('定时 Worker 入口：有 scheduled 和 fetch，fetch 一律 404', typeof worker.scheduled === 'function' && (await worker.fetch()).status === 404);
  await worker.scheduled({}, {}, { waitUntil: p => waits.push(p) }); await Promise.all(waits); T('定时 Worker：没配数据库时 scheduled 安静地结束（不抛出）', waits.length === 1);
} catch (e) { fail++; console.log('FAIL 异常', e.stack || e.message) }
finally { try { await admin?.end() } catch (_) { } c.stop() }
console.log(`notify_run: ${pass} 通过, ${fail} 失败`); process.exit(fail ? 1 : 0);
