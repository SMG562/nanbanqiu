// 本地测试时区固定为墨尔本（#190，11-10 环境假设第二次）：tests/lib/preload.js 与 tests/run_all.mjs 都设 TZ，
//   机器时区是 UTC 时，测试脚本（Node 侧）造的本地 09:00 也必须是墨尔本 09:00，和 CI（TZ=Australia/Melbourne）一致。
//   #190 复核建议：这两行以前没有测试守着，删掉 unit 也不红。
import fs from 'fs'; import path from 'path'; import { execFileSync } from 'child_process'; import { fileURLToPath } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url)), DIR = process.argv[2] || process.env.NBQ_DIR || path.join(HERE, '..', '..');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? '  ✓ ' : 'FAIL ') + n + (ok || x === undefined ? '' : ' ' + JSON.stringify(x))); };
const env = { ...process.env, TZ: 'UTC' }; delete env.NBQ_TZ;
const got = execFileSync('node', ['-r', path.join(DIR, 'tests', 'lib', 'preload.js'), '-e', 'console.log(new Date(2026,9,14,9).toISOString())'], { env, encoding: 'utf8' }).trim().split('\n').pop();
T('机器是 UTC，preload 之后本地 10-14 09:00 = 墨尔本 09:00（2026-10-13T22:00Z）', got === '2026-10-13T22:00:00.000Z', got);
const nz = execFileSync('node', ['-r', path.join(DIR, 'tests', 'lib', 'preload.js'), '-e', 'console.log(new Date(2026,9,14,9).toISOString())'], { env: { ...env, NBQ_TZ: 'Pacific/Auckland' }, encoding: 'utf8' }).trim().split('\n').pop();
T('NBQ_TZ 可改（奥克兰 09:00 = 2026-10-13T20:00Z）', nz === '2026-10-13T20:00:00.000Z', nz);
T('run_all.mjs 也固定时区（和 preload 同一规则）', /process\.env\.TZ\s*=\s*process\.env\.NBQ_TZ\s*\|\|\s*'Australia\/Melbourne'/.test(fs.readFileSync(path.join(DIR, 'tests', 'run_all.mjs'), 'utf8')));
console.log(`tz_fixed: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
