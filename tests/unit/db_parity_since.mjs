// tools/db_parity_since.sh（11-13，#241）：改了库结构的 PR，db-parity 算不算数——唯一实现。
// ① 静态：pr_merge.sh ④ 和 merge_gate.mjs 都调它，且都不再自己查 db-parity 运行记录（所有者 #229 条件：只留一份实现）
// ② 行为：临时仓库 + 假 gh（固定的运行记录），同一场景只有一个结论——两边调的是同一个脚本，结论必然一致
// 用法：node tests/unit/db_parity_since.mjs [仓库根目录]
import fs from 'fs'; import os from 'os'; import path from 'path'; import { spawnSync, execFileSync } from 'child_process'; import { fileURLToPath } from 'url';
const ROOT = process.argv[2] || path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? 'PASS ' : 'FAIL ') + n + (!ok && x !== undefined ? ' ' + JSON.stringify(x).slice(0, 600) : '')) };
const pm = fs.readFileSync(path.join(ROOT, 'tools/pr_merge.sh'), 'utf8'), mg = fs.readFileSync(path.join(ROOT, 'tools/merge_gate.mjs'), 'utf8');
T('pr_merge.sh ④ 调 db_parity_since.sh，自己不再查 db-parity 运行记录', /bash tools\/db_parity_since\.sh "\$SHA"/.test(pm) && !/db-parity\.yml\/runs/.test(pm));
T('merge_gate.mjs 调 db_parity_since.sh，自己不再查 db-parity 运行记录', /tools\/db_parity_since\.sh/.test(mg) && !/db-parity\.yml\/runs/.test(mg));

const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('GIT_')));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nbq-dbp-')), bin = path.join(tmp, 'bin'), fx = path.join(tmp, 'runs.json');
fs.mkdirSync(path.join(tmp, 'tools'), { recursive: true }); fs.mkdirSync(bin); fs.copyFileSync(path.join(ROOT, 'tools/db_parity_since.sh'), path.join(tmp, 'tools/db_parity_since.sh'));
fs.writeFileSync(path.join(bin, 'gh'), `#!/bin/sh\ncat "${fx}"\n`, { mode: 0o755 });
const G = (d, ...a) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', '-c', 'core.hooksPath=/dev/null', '-c', 'commit.gpgsign=false', ...a], { cwd: tmp, env: { ...env, GIT_COMMITTER_DATE: d, GIT_AUTHOR_DATE: d }, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const cm = (f, d) => { fs.mkdirSync(path.dirname(path.join(tmp, f)), { recursive: true }); fs.writeFileSync(path.join(tmp, f), d + Math.random() + '\n'); G(d, 'add', '-A'); G(d, 'commit', '-qm', f); return G(d, 'rev-parse', 'HEAD').trim() };
const runs = (...a) => fs.writeFileSync(fx, JSON.stringify({ workflow_runs: a.map(([c, s, k], i) => ({ id: 100 + i, created_at: c, status: s, conclusion: k })) }));
const at = sha => { const r = spawnSync('bash', ['tools/db_parity_since.sh', sha], { cwd: tmp, env: { ...env, PATH: bin + ':' + process.env.PATH }, encoding: 'utf8' }); return { code: r.status, out: r.stdout.trim() } };
G('2026-10-01T00:00:00Z', 'init', '-q', '-b', 'main'); cm('a.js', '2026-10-01T00:00:00Z');
G('2026-10-01T00:00:00Z', 'checkout', '-q', '-b', 'db'); cm('server/migrations/9.sql', '2026-11-01T10:00:00Z'); const after = cm('a.js', '2026-11-02T10:00:00Z');
G('2026-11-03T10:00:00Z', 'checkout', '-q', 'main'); cm('b.js', '2026-11-03T10:00:00Z'); G('2026-11-04T10:00:00Z', 'checkout', '-q', 'db');
G('2026-11-04T10:00:00Z', 'merge', '-q', '--no-edit', 'main'); const synced = G('x', 'rev-parse', 'HEAD').trim();
runs(['2026-11-01T12:00:00Z', 'completed', 'success']);
let r = at(after); T('迁移之后跑过并通过，之后又改了别的文件 → 算数', r.code === 0 && /^ok 100 2026-11-01/.test(r.out), r);
r = at(synced); T('只多合并了 main（main 没动库结构）→ 仍算数，不用为 main 前进再跑', r.code === 0 && /^ok 100/.test(r.out), r);
runs(['2026-10-31T12:00:00Z', 'completed', 'success']); r = at(synced); T('db-parity 在迁移之前跑的 → 不算', r.code === 1 && /^no 没有 2026-11-01/.test(r.out), r);
runs(['2026-11-01T12:00:00Z', 'completed', 'success'], ['2026-11-02T12:00:00Z', 'completed', 'failure']); r = at(synced); T('之后最近一次失败 → 不算（以最近一次为准）', r.code === 1 && /completed\/failure/.test(r.out), r);
runs(['2026-11-01T12:00:00Z', 'completed', 'success'], ['2026-11-05T12:00:00Z', 'in_progress', null]); r = at(synced); T('最近一次还在跑 → 不算', r.code === 1 && /in_progress/.test(r.out), r);
const re = cm('schema.sql', '2026-11-05T10:00:00Z'); runs(['2026-11-01T12:00:00Z', 'completed', 'success']); r = at(re); T('库结构又改了 → 锚点后移，旧的 db-parity 作废', r.code === 1 && /2026-11-05/.test(r.out), r);
cm('server/migrations/_bundle.sql', '2026-11-06T10:00:00Z'); runs(['2026-11-05T12:00:00Z', 'completed', 'success']); r = at(G('x', 'rev-parse', 'HEAD').trim()); T('只重新生成 _bundle.sql → 不算库结构改动', r.code === 0, r);
fs.writeFileSync(fx, 'not json'); r = at(synced); T('运行记录读不懂 → 不算（宁严）', r.code === 1, r);
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`db_parity_since: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
