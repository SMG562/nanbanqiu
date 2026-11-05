// 临时探针（#27，不合并）：scrypt（N=2^15）在 Cloudflare 上能不能跑完。Workers 里 performance.now() 在计算期间不走，所以不计时，只看会不会被 CPU 限制杀掉（Error 1102）。
import { hashPassword, verifyPassword } from '../../server/admin/auth.mjs';
export const onRequest = ({ request }) => {
  const n = Math.min(+new URL(request.url).searchParams.get('n') || 1, 20), out = { n, steps: [] };
  try { const h = hashPassword('probe-password-123'); out.steps.push('hash'); for (let i = 0; i < n; i++) { out.steps.push(verifyPassword('probe-password-123', h) ? 'ok' : 'bad') } out.done = true }
  catch (e) { out.error = String(e && e.message).slice(0, 120) }
  return new Response(JSON.stringify(out), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
};
