// 推送护栏（.githooks/pre-push，11-12）：改写远端历史（强推的各种写法）和删除远端分支一律拦下；普通推送、新分支照常放行。
// 按「结果」拦而不是按参数名拦：-f / --force-with-lease / +分支 三种写法都要红；有 NBQ_REWRITE="原因" 才放行。临时仓库里跑，不碰真仓库。
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawnSync } from 'node:child_process';
import { cleanGitEnv } from '../lib/git_env.mjs';
const DIR = process.argv[2] || path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 300) : '')) };
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nbq-prepush-')), env = cleanGitEnv();
const git = (cwd, extra, ...a) => spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', '-c', 'commit.gpgsign=false', ...a], { cwd, encoding: 'utf8', env: { ...env, ...extra } });
const push = (cwd, extra, ...a) => git(cwd, extra, '-c', `core.hooksPath=${path.join(DIR, '.githooks')}`, 'push', ...a);
const commit = (cwd, f, msg, extra = []) => { fs.writeFileSync(path.join(cwd, f), msg); git(cwd, {}, 'add', '-A'); return git(cwd, {}, 'commit', '-qm', msg, ...extra) };
try {
  const remote = path.join(tmp, 'r.git'), a = path.join(tmp, 'a'), b = path.join(tmp, 'b');
  git(tmp, {}, 'init', '-q', '--bare', remote); git(tmp, {}, 'clone', '-q', remote, a);
  git(a, {}, 'checkout', '-qb', 'feat'); commit(a, 'x', '1');
  let r = push(a, {}, '-q', 'origin', 'feat');
  T('新分支的第一次推送：放行', r.status === 0, r.stderr);
  commit(a, 'x', '2'); r = push(a, {}, '-q', 'origin', 'feat');
  T('普通推送（快进）：放行', r.status === 0, r.stderr);
  git(a, {}, 'commit', '-q', '--amend', '-m', 'rewritten');      // 改写历史
  for (const [name, args] of [['-f', ['-f']], ['--force-with-lease', ['--force-with-lease']], ['+分支 写法', []]]) {
    r = push(a, {}, '-q', ...args, 'origin', name === '+分支 写法' ? '+feat' : 'feat');
    T(`改写历史（${name}）：拦下，且提示怎么办`, r.status !== 0 && /改写远端历史/.test(r.stdout + r.stderr) && /NBQ_REWRITE/.test(r.stdout + r.stderr), r.stdout + r.stderr);
  }
  r = push(a, { NBQ_REWRITE: '测试：确认要改写' }, '-q', '-f', 'origin', 'feat');
  T('带 NBQ_REWRITE 原因：放行，并打印原因', r.status === 0 && /测试：确认要改写/.test(r.stdout + r.stderr), r.stdout + r.stderr);
  r = push(a, {}, '-q', 'origin', ':feat');
  T('删除远端分支：拦下', r.status !== 0 && /删除远端分支/.test(r.stdout + r.stderr), r.stdout + r.stderr);
  // 别人推了新提交、我本地还没抓：本地没有远端那个提交 → 验证不了，同样拦下（提示先 fetch）
  git(tmp, {}, 'clone', '-q', '-b', 'feat', remote, b); commit(b, 'y', 'other'); push(b, {}, '-q', 'origin', 'feat');
  commit(a, 'z', 'mine'); r = push(a, {}, '-q', 'origin', 'feat');
  T('远端有我没抓的提交：拦下并提示先 git fetch', r.status !== 0 && /git fetch/.test(r.stdout + r.stderr), r.stdout + r.stderr);
  git(a, {}, 'fetch', '-q', 'origin'); git(a, {}, 'merge', '-q', '--no-edit', 'origin/feat'); r = push(a, {}, '-q', 'origin', 'feat');
  T('抓取并合并之后（快进）：放行', r.status === 0, r.stderr);
} finally { fs.rmSync(tmp, { recursive: true, force: true }) }
console.log(`pre_push_guard: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
