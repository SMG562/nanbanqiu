// 南伴球 · 通知发送的真实对接（第四批 4h）。sender.mjs 只认 push.send / mail.send 两个接口，这里接上 Web Push 和 Resend。
//   环境变量：DATABASE_URL（nbq_service 能登录的连接）· VAPID_PUBLIC / VAPID_PRIVATE / VAPID_SUBJECT（mailto:…）· RESEND_KEY · MAIL_FROM · BASE_URL
//   运行：node server/notify/adapters.mjs   （常驻；可开多个，skip locked 保证不重复发）
//   依赖：npm i pg web-push   （Resend 直接用 fetch，不装 SDK）
import { dispatch, flushEmail, onEmailEvent } from './sender.mjs';
import { URGENT } from './rules.mjs';

// Web Push：201 = 送达；404 / 410 = 订阅失效（sender 会清掉）；其他 = 这次失败
export async function webPush({ publicKey, privateKey, subject }) {
  const wp = (await import('web-push')).default; wp.setVapidDetails(subject, publicKey, privateKey);
  return {
    async send(sub, payload) {
      try {
        const r = await wp.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify(payload),
          { TTL: 6 * 3600, urgency: URGENT.has(payload.data?.kind) ? 'high' : 'normal', topic: payload.data?.kind === 'request' ? 'req-' + String(payload.data.game_id || '').slice(0, 20) : undefined });
        return { status: r.statusCode };
      } catch (e) { return { status: e.statusCode || 0, error: String(e.body || e.message || e) } }
    },
  };
}

// Resend：带一键退订头（Gmail / Apple Mail 显示「退订」按钮）
export function resend({ apiKey, from }) {
  return {
    async send({ to, subject, text, unsubscribe }) {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to, subject, text, headers: { 'List-Unsubscribe': `<${unsubscribe}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } }),
      });
      if (!r.ok) throw new Error('resend ' + r.status + ' ' + (await r.text()).slice(0, 200));
      return { id: (await r.json()).id };
    },
  };
}

// Resend 回调（webhook，需先用 svix 签名校验）→ onEmailEvent 的参数；其他事件返回 null
export function resendEvent(body) {
  const type = { 'email.bounced': 'bounced', 'email.complained': 'complained' }[body?.type]; if (!type) return null;
  return { type, email: [].concat(body.data?.to || [])[0], provider_id: body.data?.email_id };
}
export { onEmailEvent };

// 常驻循环：每 15 秒 dispatch，每 60 秒 flushEmail；出错只记日志，下一轮重试
export function startWorker(pool, { push, mail, baseUrl, log = console }) {
  let busyD = false, busyE = false;
  const d = setInterval(async () => { if (busyD) return; busyD = true; try { const s = await dispatch(pool, { push }); if (s.delivered + s.deferred + s.stale + s.merged) log.info?.('dispatch', s) } catch (e) { log.error?.('dispatch', e) } busyD = false }, 15e3);
  const e = setInterval(async () => { if (busyE) return; busyE = true; try { const s = await flushEmail(pool, { mail, baseUrl }); if (s.sent + s.skipped + s.failed) log.info?.('email', s) } catch (x) { log.error?.('email', x) } busyE = false }, 60e3);
  return () => { clearInterval(d); clearInterval(e) };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { default: pg } = await import('pg'); const env = process.env;
  const pool = new pg.Pool({ connectionString: env.DATABASE_URL, max: 4 });
  const push = await webPush({ publicKey: env.VAPID_PUBLIC, privateKey: env.VAPID_PRIVATE, subject: env.VAPID_SUBJECT });
  const mail = resend({ apiKey: env.RESEND_KEY, from: env.MAIL_FROM || '南伴球 <notify@nanbanqiu.com>' });
  const stop = startWorker(pool, { push, mail, baseUrl: env.BASE_URL });
  for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, async () => { stop(); await pool.end(); process.exit(0) });
}
