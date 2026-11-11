// 测试在临时目录跑 git，不能落到真仓库（11-11，同类第二次 → 自动检查）。
// 11-03：select 测试在提交钩子里跑，临时仓库的 init / x 两个提交被推上了 main；11-11：sync_verify 的临时提交 a / b 进了 #95 的分支（删了几乎所有文件），git init 还把真仓库改成 bare。
// 根因：钩子里 git 导出 GIT_DIR / GIT_INDEX_FILE，子进程继承后 cwd 不起作用。做法：run_all 给每个测试去掉这些变量（总闸），自己 spawn git 的测试也要去（直接 node 跑时）。
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os'; import { spawnSync } from 'node:child_process'; import { fileURLToPath } from 'node:url';
import { cleanGitEnv, REPO_VARS } from '../lib/git_env.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 400) : '')) };

// ① 去掉定位仓库的，留下代理 / 证书 / 配置注入
const e = cleanGitEnv({ GIT_DIR: '/x/.git', GIT_INDEX_FILE: '/x/.git/index', GIT_WORK_TREE: '/x', GIT_COMMON_DIR: '/x/.git', GIT_CONFIG_COUNT: '1', GIT_SSL_CAINFO: '/ca', PATH: '/bin' });
T('去掉 GIT_DIR / GIT_INDEX_FILE / GIT_WORK_TREE / GIT_COMMON_DIR', !('GIT_DIR' in e) && !('GIT_INDEX_FILE' in e) && !('GIT_WORK_TREE' in e) && !('GIT_COMMON_DIR' in e), e);
T('保留 GIT_CONFIG_* / GIT_SSL_CAINFO / PATH', e.GIT_CONFIG_COUNT === '1' && e.GIT_SSL_CAINFO === '/ca' && e.PATH === '/bin', e);

// ② 总闸：run_all 启动每个测试时用 cleanGitEnv
const ra = fs.readFileSync(path.join(ROOT, 'tests/run_all.mjs'), 'utf8');
T('run_all：测试子进程的环境经过 cleanGitEnv', /spawn\(cmd\[0\][^\n]*env: \{ \.\.\.cleanGitEnv\(process\.env\)/.test(ra));

// ③ 每个「建临时目录又 spawn git」的脚本都去掉了 GIT_*（对修复前的 tests/unit/sync_verify.mjs 会红）
const files = [];
const walk = d => { for (const f of fs.readdirSync(path.join(ROOT, d), { withFileTypes: true })) { const p = path.join(d, f.name);
  if (f.isDirectory()) { if (!['reports', 'node_modules', 'snapshots'].includes(f.name)) walk(p) } else if (/\.(mjs|js)$/.test(f.name)) files.push(p) } };
walk('tests'); walk('tools');
const SPAWNS_GIT = /\b(spawnSync|execFileSync|spawn|execFile)\(\s*'git'|\bexecSync\(\s*[`'"]git\b/, TEMP = /\bmkdtemp(Sync)?\(/, SAFE = /cleanGitEnv|startsWith\('GIT_'\)|REPO_VARS/;
const bad = files.filter(f => { const s = fs.readFileSync(path.join(ROOT, f), 'utf8'); return SPAWNS_GIT.test(s) && TEMP.test(s) && !SAFE.test(s) });
T(`在临时目录跑 git 的脚本都去掉了 GIT_*（查了 ${files.length} 个）`, bad.length === 0, bad);

// ④ 前提没变 + 真的管用：模拟钩子环境（GIT_DIR 指向「受害」仓库），在另一个临时目录 init + commit
const genv = { ...process.env }; for (const k of Object.keys(genv)) if (REPO_VARS.test(k)) delete genv[k];
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nbq-gitenv-')), victim = path.join(tmp, 'victim'), work = path.join(tmp, 'work');
const git = (cwd, env, ...a) => spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', '-c', 'commit.gpgsign=false', ...a], { cwd, env, encoding: 'utf8' });
try {
  fs.mkdirSync(victim); fs.mkdirSync(work);
  git(victim, genv, 'init', '-q'); fs.writeFileSync(path.join(victim, 'keep.txt'), 'x'); git(victim, genv, 'add', '-A'); git(victim, genv, 'commit', '-qm', 'base');
  const head = () => git(victim, genv, 'rev-parse', 'HEAD').stdout.trim(), bare = () => git(victim, genv, 'config', 'core.bare').stdout.trim();
  const h0 = head(), hook = { ...genv, GIT_DIR: path.join(victim, '.git'), GIT_INDEX_FILE: path.join(victim, '.git', 'index') };
  const attack = env => { git(work, env, 'init', '-q'); fs.writeFileSync(path.join(work, 'a.txt'), String(Math.random())); git(work, env, 'add', '-A'); git(work, env, 'commit', '-qm', 'a') };
  attack(cleanGitEnv(hook));
  T('去掉之后：受害仓库的提交和 core.bare 都没变', head() === h0 && bare() === 'false', { h0, now: head(), bare: bare() });
  attack(hook);
  T('前提：不去掉就会写进受害仓库（这就是事故的样子）', head() !== h0 || bare() === 'true', { h0, now: head(), bare: bare() });
} finally { fs.rmSync(tmp, { recursive: true, force: true }) }

console.log(`git_env: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
