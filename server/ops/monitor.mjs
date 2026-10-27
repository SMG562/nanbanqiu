// 南伴球 · 报警（第五批 5d）。每 5 分钟调一次 runMonitor()：数据库 job_monitor() 算 16 项检查、记报警，这里把要通知的发邮件给所有 owner。
//   新出现 / 警告升到严重 / 6 小时还没恢复 → 发；恢复了 → 发一封「已恢复」。阈值在 monitor_thresholds 表，处理办法见 出事处理手册.md
const LV = { crit: '严重', warn: '警告', ok: '已恢复' };
const fmt = (code, v) => v == null ? '—' : /rate|bounce|connections|drop/.test(code) && v < 5 ? (v * 100).toFixed(1) + '%' : String(v);
export function alertMail(alerts, baseUrl = 'https://nanbanqiu.com') {
  const worst = alerts.some(a => a.level === 'crit') ? 'crit' : alerts.some(a => a.level === 'warn') ? 'warn' : 'ok';
  const subject = `[南伴球] ${LV[worst]}：${alerts.map(a => a.label).join('、')}`;
  const text = alerts.map(a => `${LV[a.level]} · ${a.label} · 现在 ${fmt(a.code, a.value)}${a.kind === 'remind' ? ' · 6 小时了还没恢复' : a.kind === 'escalate' ? ' · 从警告升为严重' : ''}`).join('\n')
    + `\n\n后台「管理员 → 系统状态」：${baseUrl}/admin\n怎么处理：出事处理手册.md（按报警名称找对应的一节）`;
  return { subject, text };
}
export async function runMonitor(pool, { mail, now = Date.now(), baseUrl } = {}) {
  const db = await pool.connect(); let alerts, owners;
  try {
    await db.query('begin'); await db.query('set local role nbq_service');
    alerts = (await db.query('select job_monitor($1) j', [new Date(now).toISOString()])).rows[0].j;
    owners = (await db.query(`select email from admin_users where role = 'owner' and not disabled`)).rows.map(r => r.email);
    await db.query('commit');
  } catch (e) { await db.query('rollback').catch(() => { }); throw e } finally { db.release() }
  if (alerts.length && mail) { const m = alertMail(alerts, baseUrl); for (const to of owners) await mail.send({ to, subject: m.subject, text: m.text }).catch(() => { }) }
  return { alerts, owners };
}
export function startMonitor(pool, { mail, baseUrl, log = console }) {
  const t = setInterval(() => runMonitor(pool, { mail, baseUrl }).then(r => r.alerts.length && log.info?.('monitor', r.alerts), e => log.error?.('monitor', e)), 5 * 60e3);
  return () => clearInterval(t);
}
