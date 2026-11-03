// 同步回读核对脚本（tools/sync_verify.sh）：一致 → 0；有文件不一致或缺失 → 1 并点名；--paths 给出带电脑路径的列表
import fs from 'fs'; import os from 'os'; import path from 'path'; import { spawnSync } from 'child_process'; import { fileURLToPath } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url)), DIR = process.argv[2] || process.env.NBQ_DIR || path.join(HERE, '..', '..');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 300) : '')) };
const run = (up, ...a) => spawnSync('bash', [path.join(DIR, 'tools/sync_verify.sh'), ...a], { cwd: DIR, env: { ...process.env, UPLOADS: up }, encoding: 'utf8' });
const files = spawnSync('node', [path.join(DIR, 'tools/worker_version.mjs'), '--list'], { cwd: DIR, encoding: 'utf8' }).stdout.split('\n').filter(Boolean);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sv-'));
for (const f of files) { fs.mkdirSync(path.join(tmp, path.dirname(f)), { recursive: true }); fs.copyFileSync(path.join(DIR, f), path.join(tmp, f)) }
let r = run(tmp, '--deploy');
T('电脑上的内容和仓库一致 → 通过', r.status === 0 && /一致/.test(r.stdout), r.stdout);
fs.appendFileSync(path.join(tmp, 'server/notify/rules.mjs'), '\n// 旧版');
r = run(tmp, '--deploy');
T('有一个文件内容不同 → 失败，并点名是哪个', r.status === 1 && /server\/notify\/rules\.mjs/.test(r.stdout) && !/sender\.mjs/.test(r.stdout), r.stdout);
fs.rmSync(path.join(tmp, 'server/notify/sender.mjs'));
r = run(tmp, '--deploy');
T('有文件没回读到（缺失）也算失败', r.status === 1 && /sender\.mjs/.test(r.stdout), r.stdout);
r = run(tmp, '--deploy', '--paths');
T('--paths：给出电脑上的完整路径（device_stage_files 用），每行是一个 JSON 数组', r.status === 0 && JSON.parse(r.stdout.split('\n')[0]).every(p => p.startsWith('/Users/hanliu/Documents/南伴球/')), r.stdout);
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`sync_verify: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
