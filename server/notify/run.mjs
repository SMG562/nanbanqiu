// 南伴球 · 通知发送的运行入口（5g-3 第 4 步）。Cloudflare 定时 Worker（worker/notify.mjs）每分钟调用一次；本地 / 测试也能直接调。
//   一次调用 = 几轮 dispatch（每轮隔 15 秒，推送最多晚 15 秒）+ 一次 flushEmail。以 nbq_api 连库，sender 里 set local role nbq_service。
//   没配的渠道直接跳过：没有数据库连接 → 全跳；没有 VAPID → 不推送；没有 RESEND_KEY → 不发邮件（通知留在队列里，配好后自动补发）。
//   环境变量 / 密钥：DB_URL（或 HYPERDRIVE）· VAPID_PUBLIC · VAPID_PRIVATE · VAPID_SUBJECT · RESEND_KEY · MAIL_FROM · BASE_URL
import { connectFromEnv } from '../api/connect.mjs';
import { dispatch, flushEmail } from './sender.mjs';
import { webPush } from './webpush.mjs';
import { resend } from './resend.mjs';

const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function runNotify(env, { connect = connectFromEnv(env), fetch: f = fetch, passes = 4, gapMs = 15000, log = console, now = () => Date.now() } = {}) {
  const out = { passes: 0, delivered: 0, deferred: 0, stale: 0, merged: 0, emailQueued: 0, sent: 0, skipped: 0, failed: 0 };
  if (!connect) return { ...out, skipped_all: 'db_not_configured' };
  const pool = { connect: async () => { const c = await connect(); c.release = () => c.end().catch(() => { }); return c } };
  let push = null, mail = null;
  if (env.VAPID_PUBLIC && env.VAPID_PRIVATE) push = webPush({ publicKey: env.VAPID_PUBLIC, privateKey: env.VAPID_PRIVATE, subject: env.VAPID_SUBJECT || 'mailto:hello@nanbanqiu.app', fetch: f });
  if (env.RESEND_KEY) { mail = resend({ apiKey: env.RESEND_KEY, from: env.MAIL_FROM || '南伴球 <notify@nanbanqiu.app>' }); }
  if (!push && !mail) return { ...out, skipped_all: 'push_and_mail_not_configured' };
  if (push) for (let i = 0; i < passes; i++) {
    if (i) await sleep(gapMs);
    try { const s = await dispatch(pool, { push, now: now(), version: env.NBQ_VERSION }); out.passes++; for (const k of ['delivered', 'deferred', 'stale', 'merged', 'emailQueued']) out[k] += s[k] || 0 }
    catch (e) { log.error?.('dispatch_error', e && (e.code || e.name)); break }          // 下一分钟再来；细节不外露
  }
  if (mail) try { const s = await flushEmail(pool, { mail, now: now(), baseUrl: env.BASE_URL || 'https://nanbanqiu.app' }); for (const k of ['sent', 'skipped', 'failed']) out[k] += s[k] || 0 }
  catch (e) { log.error?.('email_error', e && (e.code || e.name)) }
  return out;
}
