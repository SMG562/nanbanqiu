// 南伴球 · Resend 邮件发送（fetch，不装 SDK）。单独一个文件：定时 Worker 只引这个，不能引 adapters.mjs（里面有 Node 专用的 web-push，Workers 打包会失败）。
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
