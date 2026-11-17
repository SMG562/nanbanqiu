// tools/pr_merge.sh 闸门自检（11-12）：.claude/settings.json 免确认放行 pr_merge.sh，前提是它执行的每个检查脚本都只认 origin/main 上的版本。
// ① 静态：pr_merge.sh 执行到的 tools/ 脚本（含它们 import 的本地模块）都在 GATE 名单里——以后加检查忘了加名单就红
// ② 行为：临时仓库里，工作区改过闸门脚本 → 直接拒绝、不碰 GitHub；和 main 一致 → 过了自检往下走
// 用法：node tests/unit/merge_gate_integrity.mjs [仓库根目录]
import fs from 'fs'; import os from 'os'; import path from 'path'; import { spawnSync, execFileSync } from 'child_process'; import { fileURLToPath } from 'url';
const ROOT = process.argv[2] || path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? 'PASS ' : 'FAIL ') + n + (!ok && x !== undefined ? ' ' + JSON.stringify(x).slice(0, 600) : '')) };
const SRC = fs.readFileSync(path.join(ROOT, 'tools/pr_merge.sh'), 'utf8');
const GATE = (SRC.match(/^GATE="([^"]+)"/m) || [, ''])[1].split(/\s+/).filter(Boolean);
T('pr_merge.sh 有 GATE 名单且包含自己和 CODEOWNERS', GATE.includes('tools/pr_merge.sh') && GATE.includes('.github/CODEOWNERS'), GATE);
// 执行到的脚本：$(node|bash tools/x) 或 | node tools/x（echo 里提示用的命令不算）
const run = [...SRC.matchAll(/(?:\$\(|\|\s*)(?:node|bash) (tools\/[\w.\/-]+)/g)].map(m => m[1]);
const deps = new Set(run), todo = [...run];
while (todo.length) { const f = todo.pop(); if (!f.endsWith('.mjs')) continue;
  for (const m of fs.readFileSync(path.join(ROOT, f), 'utf8').matchAll(/from '\.\/([\w.-]+\.mjs)'/g)) { const d = 'tools/' + m[1]; if (!deps.has(d)) { deps.add(d); todo.push(d) } } }
const miss = [...deps].filter(f => !GATE.includes(f));
T('执行到的检查脚本（含 import）都在 GATE 名单里', run.length >= 5 && !miss.length, { run, miss });
T('自检在第一个检查脚本执行之前', SRC.indexOf('GD=$(git diff') > 0 && SRC.indexOf('GD=$(git diff') < SRC.indexOf('bash tools/merge_drift.sh "$SHA"'));

// ② 行为：假 gh 返回一个打开的 PR；临时仓库 + 本地裸库当 origin
const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('GIT_')));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nbq-gate-')), repo = path.join(tmp, 'r'), bare = path.join(tmp, 'o.git'), bin = path.join(tmp, 'bin');
const git = (...a) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', '-c', 'core.hooksPath=/dev/null', '-c', 'commit.gpgsign=false', ...a], { cwd: repo, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
fs.mkdirSync(path.join(repo, 'tools'), { recursive: true }); fs.mkdirSync(path.join(repo, '.github')); fs.mkdirSync(bin);
for (const f of GATE) { const s = path.join(ROOT, f); fs.mkdirSync(path.dirname(path.join(repo, f)), { recursive: true }); fs.writeFileSync(path.join(repo, f), fs.existsSync(s) ? fs.readFileSync(s) : '') }
fs.writeFileSync(path.join(bin, 'gh'), '#!/bin/sh\ncase "$*" in *"repos/SMG562/nanbanqiu/pulls/9 "*|*"pulls/9 --jq"*) echo "open main feat 0000000000000000000000000000000000000000 false SMG562/nanbanqiu";; *) exit 1;; esac\n', { mode: 0o755 });
execFileSync('git', ['init', '-q', '--bare', bare], { env }); git('init', '-q', '-b', 'main'); git('add', '-A'); git('commit', '-qm', 'base'); git('remote', 'add', 'origin', bare); git('push', '-q', 'origin', 'main'); git('fetch', '-q', 'origin');
const go = () => spawnSync('bash', ['tools/pr_merge.sh', '9', '--check'], { cwd: repo, env: { ...env, PATH: bin + ':' + process.env.PATH }, encoding: 'utf8', timeout: 30e3 });
fs.appendFileSync(path.join(repo, 'tools/review_carry.mjs'), '\n// 放宽\n');
let r = go(); T('工作区改了闸门脚本（没提交）→ 拒绝，退出码 2，点名文件', r.status === 2 && /review_carry\.mjs/.test(r.stdout) && /checkout --detach origin\/main/.test(r.stdout), r.stdout + r.stderr);
git('commit', '-qam', 'weaken'); r = go(); T('分支上提交了闸门改动 → 同样拒绝', r.status === 2 && /和 origin\/main 不一致/.test(r.stdout), r.stdout);
git('reset', '-q', '--hard', 'origin/main'); r = go(); T('和 main 一致 → 自检通过、继续往下核对', !/和 origin\/main 不一致/.test(r.stdout) && /PR #9 打开着/.test(r.stdout) && /快进|main 前进了/.test(r.stdout), r.stdout + r.stderr);
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`merge_gate_integrity: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
