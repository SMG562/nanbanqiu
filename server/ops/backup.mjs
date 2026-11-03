// 南伴球 · 备份与恢复演练（第五批 5d）。
//   日常备份：Supabase 每日自动备份 + 时间点恢复（PITR，付费附加项，建议开）；另外每天用 dump() 导一份加密的逻辑备份放到别处（异地、另一个账号）
//   每月演练：drill() = 导出 → 加密 → 解密 → 恢复到一个新库 → 逐表对数 → ops_verify() 自检 → 记进 ops_drills（后台「系统状态」看「恢复演练」一项）
//   加密：AES-256-GCM，密钥 32 字节（base64，放在密码管理器里，和备份分开放）；文件 = "NBQB1" + 12 字节 IV + 密文 + 16 字节校验
//   命令：node server/ops/backup.mjs drill <源库连接串> <演练库连接串>   （环境变量 NBQ_BACKUP_KEY、NBQ_PGBIN）
import crypto from 'crypto'; import fs from 'fs'; import os from 'os'; import path from 'path'; import { execFileSync } from 'child_process';
import { pipeline } from 'stream/promises';

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
export async function restore(file, conn, key, { pgbin, env } = {}) {
  const tmp = file + '.restore'; await decryptFile(file, tmp, key);
  try { execFileSync(bin('pg_restore', pgbin), ['--no-owner', '--exit-on-error', '-d', conn, tmp], { env: { ...process.env, ...env }, stdio: 'pipe' }) }
  finally { fs.rmSync(tmp, { force: true }) }
}
// 对数用的表：业务核心 + 日志
export const KEY_TABLES = ['users', 'games', 'game_participants', 'invites', 'messages', 'threads', 'notifications', 'reports', 'blocks', 'player_prefs', 'impressions', 'venues', 'admin_users', 'admin_audit_log', 'user_status_log', 'risk_rules', 'rate_rules', 'legal_docs'];
// 演练：源库 → 加密备份 → 恢复到演练库（必须是空库；角色在同一个实例里已有，或先跑 schema 里建角色的那段）→ 对数 + 自检 → 记到源库
export async function drill({ pg, source, target, key, pgbin, env, workdir = os.tmpdir() }) {
  const t0 = Date.now(), file = path.join(fs.mkdtempSync(path.join(workdir, 'nbq-drill-')), 'backup.nbqb');
  const detail = { tables: {}, verify: [] }; let ok = false;
  const q = async (conn, sql, p) => { const c = new pg.Client({ connectionString: conn }); await c.connect(); try { return (await c.query(sql, p)).rows } finally { await c.end() } };
  try {
    const backupAt = (await q(source, 'select now() t'))[0].t;
    detail.bytes = await dump(source, file, key, { pgbin, env });
    await restore(file, target, key, { pgbin, env });
    for (const t of KEY_TABLES) {
      const [a] = await q(source, `select count(*)::int n from ${t}`), [b] = await q(target, `select count(*)::int n from ${t}`);
      detail.tables[t] = [a.n, b.n];
    }
    detail.verify = await q(target, 'select * from ops_verify()');
    ok = Object.values(detail.tables).every(([a, b]) => a === b) && detail.verify.every(v => v.ok);
    detail.backup_at = backupAt;
  } catch (e) { detail.error = String(e.message || e).slice(0, 300) }
  finally { fs.rmSync(path.dirname(file), { recursive: true, force: true }) }
  const minutes = +((Date.now() - t0) / 60e3).toFixed(2);
  const c = new pg.Client({ connectionString: source }); await c.connect();
  try { await c.query('begin'); await c.query('set local role nbq_service'); await c.query(`insert into ops_drills(ok, backup_at, minutes, detail) values ($1,$2,$3,$4)`, [ok, detail.backup_at || null, minutes, detail]); await c.query('commit') }
  finally { await c.end() }
  return { ok, minutes, detail };
}

if (import.meta.url === `file://${process.argv[1]}` && process.argv[2] === 'drill') {
  const { default: pg } = await import('pg');
  const r = await drill({ pg, source: process.argv[3], target: process.argv[4], key: process.env.NBQ_BACKUP_KEY, pgbin: process.env.NBQ_PGBIN });
  console.log(r.ok ? '演练通过' : '演练失败', r.minutes + ' 分钟', JSON.stringify(r.detail)); process.exit(r.ok ? 0 : 1);
}
