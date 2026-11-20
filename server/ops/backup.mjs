// 南伴球 · 备份与恢复演练（第五批 5d）。
//   日常备份：Supabase 每日自动备份 + 时间点恢复（PITR，付费附加项，建议开）；另外每天用 dump() 导一份加密的逻辑备份放到别处（异地、另一个账号）
//   每月演练：drill() = 导出 → 加密 → 解密 → 恢复到一个新库 → 逐表对数 → ops_verify() 自检 → 记进 ops_drills（后台「系统状态」看「恢复演练」一项）
//   加密：AES-256-GCM，密钥 32 字节（base64，放在密码管理器里，和备份分开放）；文件 = "NBQB1" + 12 字节 IV + 密文 + 16 字节校验
//   命令：node server/ops/backup.mjs drill <源库连接串> <演练库连接串>   （环境变量 NBQ_BACKUP_KEY、NBQ_PGBIN）
import crypto from 'crypto'; import fs from 'fs'; import os from 'os'; import path from 'path'; import { execFileSync, spawnSync } from 'child_process';
import { pipeline } from 'stream/promises'; import { pathToFileURL } from 'url';

const MAGIC = Buffer.from('NBQB1');
export const newKey = () => crypto.randomBytes(32).toString('base64');
const keyBuf = k => { const b = Buffer.from(String(k || ''), 'base64'); if (b.length !== 32) throw new Error('backup_key_invalid'); return b };
export async function encryptFile(src, dst, key) {
  const iv = crypto.randomBytes(12), c = crypto.createCipheriv('aes-256-gcm', keyBuf(key), iv), out = fs.createWriteStream(dst);
  out.write(Buffer.concat([MAGIC, iv]));
  await new Promise((res, rej) => { c.on('error', rej); out.on('error', rej); c.on('end', res); c.pipe(out, { end: false }); fs.createReadStream(src).on('error', rej).pipe(c) });
  await new Promise((res, rej) => out.end(c.getAuthTag(), e => e ? rej(e) : res()));
}
export async function decryptFile(src, dst, key) {
  const size = fs.statSync(src).size, fd = fs.openSync(src, 'r'), head = Buffer.alloc(17), tag = Buffer.alloc(16);
  fs.readSync(fd, head, 0, 17, 0); fs.readSync(fd, tag, 0, 16, size - 16); fs.closeSync(fd);
  if (!head.subarray(0, 5).equals(MAGIC)) throw new Error('backup_format');
  const d = crypto.createDecipheriv('aes-256-gcm', keyBuf(key), head.subarray(5, 17)); d.setAuthTag(tag);
  await pipeline(fs.createReadStream(src, { start: 17, end: size - 17 }), d, fs.createWriteStream(dst));   // 密钥不对或文件被改过 → 抛错
}
const bin = (name, pgbin) => pgbin ? path.join(pgbin, name) : name;
export async function dump(conn, file, key, { pgbin, env } = {}) {
  const tmp = file + '.plain'; execFileSync(bin('pg_dump', pgbin), ['-Fc', '--no-owner', '-f', tmp, conn], { env: { ...process.env, ...env }, stdio: 'pipe' });
  try { await encryptFile(tmp, file, key) } finally { fs.rmSync(tmp, { force: true }) }
  return fs.statSync(file).size;
}
// 本机演练专用（#473）：Supabase 备份里的平台对象（pg_cron / vault / pg_stat_statements）本机装不了。
// 只过滤这些；真出事恢复到新 Supabase 项目**不能**过滤（新项目自带这些扩展），所以目标是 Supabase 就拒绝。
export const PLATFORM_RE = /\b(pg_cron|supabase_vault|pg_stat_statements)\b|\s(cron|vault)\s/;
export const filterToc = toc => { const keep = [], skipped = []; for (const l of toc.split('\n')) (l && !l.startsWith(';') && PLATFORM_RE.test(l) ? skipped : keep).push(l); return { list: keep.join('\n'), skipped: skipped.length } };
// 忽略的报错按类型归类计数。角色名保留（看缺的是哪些）；函数名只留 schema（PostGIS 版本差异的权限项）；其余引号内名字合并成 X（#473，11-20 实测：1111 条里 1071 条是 GRANT 给本机没有的平台角色）
export const APP_ROLES = ['nbq_user', 'nbq_service', 'nbq_admin', 'nbq_viewer', 'anon', 'authenticated'];
export const classifyErrors = log => { const by = {}; for (const l of String(log || '').split('\n')) { const m = l.match(/ERROR:\s+(.*)$/); if (m) { const k = m[1].replace(/function (\w+)\.[^(]*\([^)]*\)/, 'function $1.X()').replace(/"([^"]*)"/g, (a, n) => /^role /.test(m[1]) ? a : '"X"').replace(/\d+/g, 'N').slice(0, 120); by[k] = (by[k] || 0) + 1 } } return by };
export async function restore(file, conn, key, { pgbin, env, skipPlatform, logFile } = {}) {
  if (skipPlatform && /supabase\.(co|com)\b|pooler/i.test(conn)) throw new Error('skip_platform_not_for_supabase');
  const tmp = file + '.restore'; await decryptFile(file, tmp, key); const e = { ...process.env, ...env }, pr = bin('pg_restore', pgbin);
  try {
    if (!skipPlatform) { execFileSync(pr, ['--no-owner', '--exit-on-error', '-d', conn, tmp], { env: e, stdio: 'pipe' }); return null }
    const { list, skipped } = filterToc(execFileSync(pr, ['-l', tmp], { env: e, maxBuffer: 64 << 20 }).toString()); fs.writeFileSync(tmp + '.toc', list);
    const r = spawnSync(pr, ['--no-owner', '-L', tmp + '.toc', '-d', conn, tmp], { env: e, maxBuffer: 256 << 20 }), log = String(r.stderr || '');
    if (logFile) fs.writeFileSync(logFile, log);   // 日志先存下来再归类，别和删除放在一起
    if (r.error) throw r.error;
    const by = classifyErrors(log), missing = Object.keys(by).map(k => k.match(/^role "([^"]+)"/)?.[1]).filter(r => APP_ROLES.includes(r));   // 应用角色缺失会被忽略掉，必须单独拦
    return { skipped, ignored: Object.values(by).reduce((a, b) => a + b, 0), by_type: by, app_roles_missing: missing, log: logFile || null };
  } finally { fs.rmSync(tmp, { force: true }); fs.rmSync(tmp + '.toc', { force: true }) }
}
// 对数用的表：业务核心 + 日志
export const KEY_TABLES = ['users', 'games', 'game_participants', 'invites', 'messages', 'threads', 'notifications', 'reports', 'blocks', 'player_prefs', 'impressions', 'venues', 'admin_users', 'admin_audit_log', 'user_status_log', 'risk_rules', 'rate_rules', 'legal_docs'];
// 演练：源库 → 加密备份 → 恢复到演练库（必须是空库；角色在同一个实例里已有，或先跑 schema 里建角色的那段）→ 对数 + 自检 → 记到源库
export async function drill({ pg, source, target, key, pgbin, env, workdir = os.tmpdir(), skipPlatform, log = console.log }) {
  const t0 = Date.now(), file = path.join(fs.mkdtempSync(path.join(workdir, 'nbq-drill-')), 'backup.nbqb');
  const detail = { tables: {}, verify: [] }; let ok = false;
  const q = async (conn, sql, p) => { const c = new pg.Client({ connectionString: conn }); await c.connect(); try { return (await c.query(sql, p)).rows } finally { await c.end() } };
  try {
    const backupAt = (await q(source, 'select now() t'))[0].t;
    detail.bytes = await dump(source, file, key, { pgbin, env });
    const rs = await restore(file, target, key, { pgbin, env, skipPlatform, logFile: path.join(workdir, `nbq-restore-${Date.now()}.log`) }); if (rs) detail.restore = rs;
    for (const t of KEY_TABLES) {
      const [a] = await q(source, `select count(*)::int n from ${t}`), [b] = await q(target, `select count(*)::int n from ${t}`);
      detail.tables[t] = [a.n, b.n];
    }
    detail.verify = await q(target, 'select * from ops_verify()');
    ok = Object.values(detail.tables).every(([a, b]) => a === b) && detail.verify.every(v => v.ok) && !detail.restore?.app_roles_missing.length;
    detail.backup_at = backupAt;
  } catch (e) { detail.error = String(e.message || e).slice(0, 300) }
  finally { fs.rmSync(path.dirname(file), { recursive: true, force: true }) }
  const minutes = +((Date.now() - t0) / 60e3).toFixed(2);
  log(ok ? '演练通过' : '演练失败', minutes + ' 分钟', JSON.stringify(detail));   // 先打印结果，再写库：写库失败也不丢
  // 记进源库：先试 nbq_service；Supabase 的 postgres 不是该角色成员（42501）→ 退回当前账号插入
  let recorded = null, recordError;
  for (const asRole of [true, false]) {
    const c = new pg.Client({ connectionString: source });
    try { await c.connect(); await c.query('begin'); if (asRole) await c.query('set local role nbq_service'); await c.query(`insert into ops_drills(ok, backup_at, minutes, detail) values ($1,$2,$3,$4)`, [ok, detail.backup_at || null, minutes, detail]); await c.query('commit'); recorded = asRole ? 'nbq_service' : 'current_user'; break }
    catch (e) { recordError = String(e.message || e).slice(0, 200); await c.query('rollback').catch(() => { }) } finally { await c.end().catch(() => { }) }
  }
  if (!recorded) log('⚠ 结果没能记进 ops_drills：' + recordError + '（上面的输出就是结果）');
  return { ok, minutes, detail, recorded };
}

// 启动判断：目录含中文时 import.meta.url 带 %E5… 编码而 argv 原样，不能直接字符串比较（#473，曾静默退出）
const isMain = (() => { try { return import.meta.url === pathToFileURL(fs.realpathSync(process.argv[1])).href } catch { return false } })();
if (isMain) {
  const [, , cmd, src, dst] = process.argv;
  if (cmd !== 'drill' || !src || !dst) { console.log('用法：node server/ops/backup.mjs drill <源库连接串> <演练库连接串>（环境变量 NBQ_BACKUP_KEY、NBQ_PGBIN；本机演练从 Supabase 源库恢复加 NBQ_RESTORE_SKIP_PLATFORM=1）'); process.exit(2) }
  const { default: pg } = await import('pg');
  const r = await drill({ pg, source: src, target: dst, key: process.env.NBQ_BACKUP_KEY, pgbin: process.env.NBQ_PGBIN, skipPlatform: process.env.NBQ_RESTORE_SKIP_PLATFORM === '1' });
  process.exit(r.ok ? 0 : 1);
}
