// 真实发信测试（不连数据库）：用真正的发件人、真正的主题文案，从 Resend 发几封到你的收件箱。
// 用法：RESEND_KEY=re_xxx node tools/mail_test.mjs 你的邮箱1 [邮箱2 …]
//   可加 resend 的测试地址验证退信：bounced@resend.dev（回调要等后端上线才有人接）
// key 只放在这条命令的环境变量里，不要写进文件、不要贴到聊天里。
import { resend } from '../server/notify/adapters.mjs';
import { emailSubject } from '../server/notify/rules.mjs';

const key = process.env.RESEND_KEY, to = process.argv.slice(2);
if (!key || !to.length) { console.error('用法：RESEND_KEY=re_xxx node tools/mail_test.mjs 邮箱1 [邮箱2 …]'); process.exit(1) }
const from = process.env.MAIL_FROM || '南伴球 <notify@nanbanqiu.app>', baseUrl = process.env.BASE_URL || 'https://nanbanqiu.app';
const mail = resend({ apiKey: key, from });
const game = { starts_at: new Date(Date.now() + 3 * 864e5 + 36e5).toISOString(), venue: '示例球场', tz: 'Australia/Melbourne' };
const samples = [
  ['request', [{ kind: 'request' }], { actorName: 'Jason' }],
  ['result', [{ kind: 'approved' }], {}],
  ['change', [{ kind: 'postponed' }], {}],
];
for (const addr of to) for (const [kind, items, ctx] of samples) {
  const subject = '【测试】' + emailSubject(kind, items, { game, userTz: 'Australia/Melbourne', ...ctx });
  const unsubscribe = `${baseUrl}/unsub/test-token?k=${kind}`;
  const text = `${subject}\n\n打开南伴球查看：${baseUrl}\n\n不想再收到这类邮件：${unsubscribe}`;
  try { const r = await mail.send({ to: addr, subject, text, unsubscribe }); console.log('已发', addr, kind, r.id) }
  catch (e) { console.error('失败', addr, kind, e.message) }
}
