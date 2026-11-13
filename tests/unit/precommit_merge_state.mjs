// tools/precommit.sh 第 0 项（11-13 逃逸）：合并状态丢了（解完冲突后 git stash / 切分支，MERGE_HEAD 没了），main 的改动被当成普通提交 → 拦。
// 临时仓库里真跑 precommit.sh：正常合并放行、普通改动放行、丢了合并状态照抄 main 的文件被拦（复现 11-13 的 0ac23a0）。
import fs from 'fs'; import os from 'os'; import path from 'path'; import { spawnSync, execFileSync } from 'child_process'; import { fileURLToPath } from 'url';
const ROOT = process.argv[2] || path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? 'PASS ' : 'FAIL ') + n + (!ok && x !== undefined ? ' ' + JSON.stringify(x).slice(0, 600) : '')) };
const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('GIT_')));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nbq-pcm-')), repo = path.join(tmp, 'r'), bare = path.join(tmp, 'o.git');
const g = (...a) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', '-c', 'core.hooksPath=/dev/null', '-c', 'commit.gpgsign=false', ...a], { cwd: repo, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const W = (f, s) => fs.writeFileSync(path.join(repo, f), s);
const pc = () => { const r = spawnSync('bash', ['tools/precommit.sh'], { cwd: repo, env, encoding: 'utf8' }); return { code: r.status, out: r.stdout + r.stderr } };
fs.mkdirSync(path.join(repo, 'tools'), { recursive: true }); fs.copyFileSync(path.join(ROOT, 'tools/precommit.sh'), path.join(repo, 'tools/precommit.sh')); W('进度记录.md', 'x\n');
execFileSync('git', ['init', '-q', '--bare', bare], { env }); g('init', '-q', '-b', 'main'); W('a.txt', 'a0\n'); W('b.txt', 'b0\n'); g('add', '-A'); g('commit', '-qm', 'init'); g('remote', 'add', 'origin', bare); g('push', '-q', 'origin', 'main');
g('checkout', '-q', '-b', 'pr'); W('a.txt', 'a-pr\n'); g('add', '-A'); g('commit', '-qm', 'pr');
g('checkout', '-q', 'main'); W('b.txt', 'b-main\n'); g('add', '-A'); g('commit', '-qm', 'main moves'); g('push', '-q', 'origin', 'main'); g('fetch', '-q', 'origin'); g('checkout', '-q', 'pr');
// ① 普通改动：放行
W('a.txt', 'a-pr2\n'); g('add', 'a.txt'); let r = pc(); T('普通改动（PR 自己的文件）→ 放行', r.code === 0, r.out); g('commit', '-qm', 'pr2');
// ② 丢了合并状态：把 main 的 b.txt 照抄进来当普通提交 → 拦（复现 11-13：merge 后 stash / pop，MERGE_HEAD 没了）
g('merge', '--no-commit', '-q', 'origin/main'); g('stash', '-q'); g('stash', 'pop', '-q'); g('add', '-A');
T('（复现前提）stash 之后 MERGE_HEAD 确实没了', !fs.existsSync(path.join(repo, '.git/MERGE_HEAD')));
r = pc(); T('合并状态丢了、暂存区带着 main 的改动 → 拦，点名文件并给出重来的命令', r.code === 1 && /b\.txt/.test(r.out) && /git merge origin\/main/.test(r.out), r.out);
g('reset', '-q', '--hard', 'HEAD');
// ③ 正常合并（MERGE_HEAD 在）→ 放行
g('merge', '--no-commit', '-q', 'origin/main'); r = pc(); T('正常合并（MERGE_HEAD 在）→ 放行', r.code === 0, r.out); g('commit', '-qm', 'merge main');
// ④ 合并之后（main 已是祖先）再改 b.txt：不是照抄 main → 放行
W('b.txt', 'b-pr\n'); g('add', 'b.txt'); r = pc(); T('main 已是祖先后自己改同一个文件 → 放行', r.code === 0, r.out);
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`precommit_merge_state: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
