// 发送程序部署闸门（tools/deploy_notify.mjs，11-04）：本机文件不是最新就不部署。11-02、11-04 两次「部署了旧代码」都是靠记性，现在由程序拦。
import { spawnSync } from 'node:child_process'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { senderVersion } from '../../tools/worker_version.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 300) : '')) };
const run = (...a) => spawnSync(process.execPath, ['tools/deploy_notify.mjs', ...a], { cwd: ROOT, encoding: 'utf8', timeout: 20000, env: { ...process.env, PATH: '/nonexistent' } });   // PATH 清空：万一闸门失效，wrangler 也起不来，不会真部署
const v = senderVersion(ROOT);
let r = run(); T('不带 --expect：拒绝部署（退出码 3），没碰 wrangler', r.status === 3 && /--expect/.test(r.stderr), r.status);
r = run('--expect=0000000000'); T('指纹对不上：拒绝部署，并说明本机文件不是最新', r.status === 3 && /不是最新/.test(r.stderr) && r.stderr.includes(v), r.stderr);
r = run(`--expect=${v}`); T('指纹对上：闸门放行（后面才轮到 wrangler；这里 PATH 被清空所以在 wrangler 处失败，但不是退出码 3）', r.status !== 3, r.status);
console.log(`deploy_gate: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
