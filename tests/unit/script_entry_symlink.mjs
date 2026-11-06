// 工具脚本经「符号链接路径」运行时也要真的执行（11-07 协作者在 Mac 上发现：/var → /private/var，
// build.mjs 的「是不是直接运行」判断对不上，--check 静默退出 0，把真实错误当成通过）。
// 做法：造一个指向仓库的符号链接，从链接路径跑 build --check：必须有输出「build check」。
import fs from 'fs'; import os from 'os'; import path from 'path'; import { execFileSync } from 'child_process'; import { fileURLToPath } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url)), DIR = process.argv[2] || process.env.NBQ_DIR || path.join(HERE, '..', '..');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 300) : '')) };
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'symlink-')), link = path.join(tmp, 'repo');
fs.symlinkSync(path.resolve(DIR), link);
const run = (script, args) => { try { return { code: 0, out: execFileSync('node', [path.join(link, 'tools', script), ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) } } catch (e) { return { code: e.status, out: String(e.stdout || '') + String(e.stderr || '') } } };
const b = run('build.mjs', ['--check']);
T('build --check 从符号链接路径运行：有输出（main 真的执行了）', /build check/.test(b.out), b);
const w = run('worker_version.mjs', []);
T('worker_version 从符号链接路径运行：有输出', /^[0-9a-f]{10}/m.test(w.out), w);
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`script_entry_symlink: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
