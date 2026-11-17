// 通知发送的定时 Worker（Cloudflare Cron Trigger，每分钟一次）。Pages 项目没有定时任务，所以单独部署：
//   cd notify-worker && npx wrangler deploy      （配置在 notify-worker/wrangler.jsonc）
//   密钥（wrangler secret put …）：DB_URL · VAPID_PUBLIC · VAPID_PRIVATE · VAPID_SUBJECT · RESEND_KEY（· MAIL_FROM · BASE_URL）
//   本地试跑：npx wrangler dev --test-scheduled，再打开 http://localhost:8787/__scheduled
import { runNotify } from '../server/notify/run.mjs';

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runNotify(env).then(s => { if (s.delivered + s.sent + s.failed + s.stale + (s.errors || 0)) console.log('notify', JSON.stringify(s)) }, e => console.error('notify_error', e && (e.code || e.name))));
  },
  async fetch() { return new Response('not found', { status: 404 }) },     // 不对外提供任何页面
};
