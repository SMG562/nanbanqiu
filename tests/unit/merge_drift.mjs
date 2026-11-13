// tools/merge_drift.sh（11-11，#125）：main 前进后什么时候可以不重合 main 就合并。
// 在临时仓库里真的建分支、真的跑脚本；放宽只在「只多文档」或「文件完全不重叠且能干净合并」时，库结构 / 闸门 / CI 永远严格。
// 用法：node tests/unit/merge_drift.mjs [仓库根目录]
import fs from 'fs'; import os from 'os'; import path from 'path'; import { spawnSync, execFileSync } from 'child_process'; import { fileURLToPath } from 'url';
const ROOT = process.argv[2] || path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? 'PASS ' : 'FAIL ') + n + (!ok && x !== undefined ? ' ' + JSON.stringify(x).slice(0, 600) : '')) };
const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('GIT_')));   // 临时仓库跑 git 去掉 GIT_*
const git = (cwd, ...a) => execFileSync('git', ['-c', 'core.quotePath=false', '-c', 'user.name=t', '-c', 'user.email=t@t', '-c', 'core.hooksPath=/dev/null', '-c', 'commit.gpgsign=false', ...a], { cwd, env, encoding: 'utf8' });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nbq-drift-'));
const W = (f, s) => { fs.mkdirSync(path.dirname(path.join(tmp, f)), { recursive: true }); fs.writeFileSync(path.join(tmp, f), s) };
fs.mkdirSync(path.join(tmp, 'tools')); fs.copyFileSync(path.join(ROOT, 'tools/merge_drift.sh'), path.join(tmp, 'tools/merge_drift.sh'));
git(tmp, 'init', '-q', '-b', 'main'); for (const f of ['a.js', 'b.js', 'schema.sql']) W(f, 'x\n'); W('进度记录.md', '1\n');
git(tmp, 'add', '-A'); git(tmp, 'commit', '-qm', 'init');
// 每个场景：从 init 出发的 PR 分支改 prFiles，main 之后改 mainFiles；返回脚本的退出码和说明
const run = (prFiles, mainFiles) => {
  git(tmp, 'checkout', '-q', 'main'); git(tmp, 'reset', '-q', '--hard', 'HEAD'); const init = git(tmp, 'rev-list', '--max-parents=0', 'HEAD').trim();
  git(tmp, 'checkout', '-q', '-B', 'main', init); git(tmp, 'checkout', '-q', '-B', 'pr', init);
  for (const f of prFiles) W(f, 'pr ' + Math.random() + '\n'); git(tmp, 'add', '-A'); git(tmp, 'commit', '-qm', 'pr'); const sha = git(tmp, 'rev-parse', 'HEAD').trim();
  git(tmp, 'checkout', '-q', 'main'); for (const f of mainFiles) W(f, 'main ' + Math.random() + '\n'); git(tmp, 'add', '-A'); git(tmp, 'commit', '-qm', 'main');
  const r = spawnSync('bash', ['tools/merge_drift.sh', sha, 'main'], { cwd: tmp, env, encoding: 'utf8' }); return { code: r.status, out: r.stdout.trim() };
};
let r;
r = run(['a.js'], ['进度记录.md']); T('main 只多了 *.md（含中文文件名）→ 放宽', r.code === 0 && /\.md/.test(r.out), r);
r = run(['a.js'], ['b.js']); T('代码文件不重叠且能合并 → 放宽', r.code === 0 && /不重叠/.test(r.out), r);
r = run(['a.js'], ['a.js']); T('同改一个文件 → 严格', r.code === 1 && /同改/.test(r.out), r);
r = run(['a.js'], ['schema.sql']); T('main 动了 schema.sql → 永远严格', r.code === 1 && /永远严格/.test(r.out), r);
// 11-12（#229）：只有 PR 动库结构 → 照常放宽（db-parity 改绑库结构内容，见 pr_merge.sh ④）；main 动了库结构仍永远严格
r = run(['server/migrations/1.sql'], ['进度记录.md']); T('只有 PR 动了迁移、main 只多文档 → 放宽', r.code === 0 && /\.md/.test(r.out), r);
r = run(['schema.sql', 'server/migrations/1.sql'], ['b.js']); T('只有 PR 动了库结构、main 改了不重叠的代码 → 放宽', r.code === 0 && /不重叠/.test(r.out), r);
r = run(['server/migrations/1.sql'], ['server/migrations/2.sql']); T('两边都加了迁移 → 永远严格（迁移顺序会变）', r.code === 1 && /main 动了库结构/.test(r.out), r);
r = run(['a.js'], ['.github/workflows/tests.yml']); T('main 动了 CI 工作流 → 永远严格', r.code === 1, r);
r = run(['.github/workflows/collab-board.yml'], ['b.js']); T('PR 自己改 CI 工作流、main 只动无关文件 → 放宽（11-13 #253）', r.code === 0 && /不重叠/.test(r.out), r);
r = run(['tools/pr_merge.sh'], ['b.js']); T('PR 自己改闸门脚本、main 只动无关文件 → 放宽', r.code === 0, r);
r = run(['.github/workflows/collab-board.yml'], ['.github/workflows/tests.yml']); T('PR 改 CI 且 main 也动了 CI → 仍严格', r.code === 1 && /永远严格/.test(r.out), r);
r = run(['a.js'], ['tools/pr_merge.sh']); T('main 动了闸门脚本 → 永远严格', r.code === 1, r);
// 能快进（main 是祖先）→ 脚本直接说可以
git(tmp, 'checkout', '-q', 'main'); const tip = git(tmp, 'rev-parse', 'HEAD').trim(); r = spawnSync('bash', ['tools/merge_drift.sh', tip, 'main'], { cwd: tmp, env, encoding: 'utf8' }); T('main 已是祖先 → 可直接快进', r.status === 0, r.stdout);
// pr_merge.sh 真的用了它，且放宽后走带 sha 守卫的压缩合并
const pm = fs.readFileSync(path.join(ROOT, 'tools/pr_merge.sh'), 'utf8');
T('pr_merge.sh 调用 merge_drift.sh', /tools\/merge_drift\.sh/.test(pm)); T('放宽时走 REST 压缩合并（带 sha 守卫）', /RELAXED/.test(pm) && /merge_method=squash -f sha=/.test(pm));
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`merge_drift: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
