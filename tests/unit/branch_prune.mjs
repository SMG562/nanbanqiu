// 远端分支清理（tools/branch_prune.mjs）：只删「确定已进 main / PR 已关闭」的，其余一律不动（11-10）。
// ① 归类规则：每一类各有正例和反例（误删比漏删贵得多，所以反例更多）；② contained()：在临时仓库里造快进 / 压缩合并 / 未合并 / 冲突四种分支。
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os'; import { spawnSync } from 'node:child_process';
import { classify, contained, okText, PROTECTED } from '../../tools/branch_prune.mjs';
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 400) : '')) };

const now = '2026-11-10T00:00:00Z', ago = d => new Date(Date.parse(now) - d * 864e5).toISOString();
const repo = { full_name: 'o/r' };
const pr = (n, ref, sha, o = {}) => ({ number: n, state: 'closed', draft: false, merged_at: null, closed_at: ago(10), updated_at: ago(10), head: { ref, sha, repo }, base: { ref: 'main', repo }, ...o });
const br = (name, o = {}) => ({ name, tip: 's-' + name, date: ago(10), contained: false, ...o });
const kind = (b, prs = []) => classify({ branches: [b], prs, now })[0];

// ① 可删
T('PR 已合并、分支没再动 → 可删', kind(br('a'), [pr(1, 'a', 's-a', { merged_at: ago(9) })]).kind === 'delete');
T('PR 已合并、内容在 main（压缩合并后分支又并过 main）→ 可删', kind(br('a', { tip: 'x', contained: true }), [pr(1, 'a', 's-a', { merged_at: ago(9) })]).kind === 'delete');
T('没 PR、内容在 main、超过 3 天 → 可删', kind(br('a', { contained: true })).kind === 'delete');
const closed = kind(br('a'), [pr(1, 'a', 's-a')]);
T('PR 关闭未合并、超过 3 天 → 可删且先打标签', closed.kind === 'delete' && closed.archive === true, closed);
// ② 绝不删
for (const n of PROTECTED) T(`保护分支 ${n} 即使内容在 main 也保留`, kind(br(n, { contained: true })).kind === 'keep');
T('staging 在保护名单里（测试推送固定地址）', PROTECTED.includes('staging'));
T('有开着的 PR → 保留', kind(br('a', { contained: true }), [pr(2, 'a', 's-a', { state: 'open', updated_at: ago(1) })]).kind === 'keep');
T('开着的 PR 超过 7 天没动 → 只提醒，不删', kind(br('a'), [pr(2, 'a', 's-a', { state: 'open', draft: true, updated_at: ago(9) })]).kind === 'stale');
T('同名分支以前合并过、现在又开了新 PR → 保留', kind(br('a', { contained: true }), [pr(1, 'a', 's-a', { merged_at: ago(9) }), pr(5, 'a', 's-a', { state: 'open', updated_at: ago(1) })]).kind === 'keep');
T('是开着的叠加 PR 的目标分支 → 保留', classify({ branches: [br('base', { contained: true })], prs: [pr(3, 'top', 's', { state: 'open', updated_at: ago(1), base: { ref: 'base', repo } })], now })[0].kind === 'keep');
T('没 PR、3 天内的新分支（可能正在做，哪怕还没提交）→ 保留', kind(br('a', { date: ago(1), contained: true })).kind === 'keep');
T('PR 合并后又推了没进 main 的提交 → 需决定，不自动删', kind(br('a', { tip: 'new' }), [pr(1, 'a', 's-a', { merged_at: ago(9) })]).kind === 'decide');
T('PR 关闭后又推了新提交 → 需决定', kind(br('a', { tip: 'new' }), [pr(1, 'a', 's-a')]).kind === 'decide');
T('PR 刚关闭（3 天内）→ 不动', kind(br('a', { date: ago(1) }), [pr(1, 'a', 's-a', { closed_at: ago(1) })]).kind !== 'delete');
T('没 PR、有没进 main 的提交、很旧 → 需决定（只列出，不删）', kind(br('a')).kind === 'decide');
T('fork 里同名分支的已合并 PR 不算本分支的', kind(br('a'), [pr(1, 'a', 's-a', { merged_at: ago(9), head: { ref: 'a', sha: 's-a', repo: { full_name: 'x/r' } } })]).kind === 'decide');

// ④ 合并出口 pr_merge.sh：合并后删分支，安全条件一条都不能少（红线文件，改了这里会红）
const pm = fs.readFileSync(new URL('../../tools/pr_merge.sh', import.meta.url), 'utf8'), fn = (pm.match(/drop_branch\(\) \{[\s\S]*?\n\}/) || [''])[0];
T('pr_merge：跳过保护分支，且和 branch_prune 的 PROTECTED 一致', PROTECTED.every(n => new RegExp(`case "\\$HEAD" in [^)]*\\b${n}\\b`).test(fn)), fn.slice(0, 200));
T('pr_merge：只删本仓库的分支（fork 不删）', /\[ "\$HREPO" = "\$R" \]/.test(fn));
T('pr_merge：叠加 PR 的目标分支不删', /pulls\?state=open&base=\$HEAD/.test(fn));
T('pr_merge：合并后又有人推过就不删', /git\/ref\/heads\/\$HEAD[^\n]*\.object\.sha[^\n]*= "\$SHA"/.test(fn));
T('pr_merge：所有者快进、协作者压缩合并两个出口都删', /^drop_branch$/m.test(pm) && /drop_branch; exit 0/.test(pm));
// 11-13（#267）：云端代理禁 REST 删引用（403）、GitHub 自动删是异步的 → 退到 git push --delete，再隔几秒复查，不误报「没删掉」
T('pr_merge：REST 删不了就退到 git push --delete（带 NBQ_REWRITE，否则 pre-push 钩子拦下，#270 合并时实际遇到）', /NBQ_REWRITE="[^"]+" git push -q origin --delete "\$HEAD"/.test(fn));
T('pr_merge：查到还在时隔几秒再查（等 GitHub 自动删）', /for i in 1 2 3 4 5;[^\n]*git\/ref\/heads\/\$HEAD[^\n]*sleep/.test(fn));
const nb = fs.readFileSync(new URL('../../tools/new_branch.sh', import.meta.url), 'utf8');
T('pr_merge：删分支时清掉它的点名 fetch 规则（否则之后 git fetch 报 couldn\'t find remote ref）', /git config --unset-all remote\.origin\.fetch "\^\\\+refs\/heads\/\$HEAD:"/.test(fn));
T('new_branch：已有通配 fetch 规则就不加点名规则', /grep -qxF "\+refs\/heads\/\*:refs\/remotes\/origin\/\*" \|\|[^\n]*git config --add remote\.origin\.fetch/.test(nb));

// 11-11 实际踩到：gh api 查不到标签（404）时错误正文打在 stdout，旧写法把它当成「标签已存在」，--archive 全被跳过
T('okText：成功时取提交号', okText({ status: 0, stdout: 'abc123\n' }) === 'abc123');
T('okText：404 时 stdout 里的错误 JSON 不当成提交号', okText({ status: 1, stdout: '{"message":"Not Found","status":"404"}' }) === '');
T('okText：没有结果对象也不崩', okText(undefined) === '');
// ③ contained()：真 git 仓库
const env = { ...process.env }; for (const k of Object.keys(env)) if (k.startsWith('GIT_')) delete env[k];
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nbq-prune-'));
const g = (...a) => { const p = spawnSync('git', a, { cwd: tmp, encoding: 'utf8', env }); return p.stdout.trim() };
const w = (f, s) => fs.writeFileSync(path.join(tmp, f), s);
const commit = m => { g('add', '-A'); g('commit', '-q', '-m', m); return g('rev-parse', 'HEAD') };
try {
  g('init', '-q', '-b', 'main'); g('config', 'user.email', 't@t'); g('config', 'user.name', 't'); g('config', 'commit.gpgsign', 'false');
  w('a.txt', '1\n'); commit('base');
  g('checkout', '-q', '-b', 'ff'); w('b.txt', 'ff\n'); const ff = commit('ff');
  g('checkout', '-q', 'main'); g('merge', '-q', '--ff-only', 'ff');
  g('checkout', '-q', '-b', 'sq'); w('c.txt', 'sq\n'); commit('sq1'); w('c.txt', 'sq2\n'); const sq = commit('sq2');
  g('checkout', '-q', 'main'); g('merge', '-q', '--squash', 'sq'); commit('squash');
  g('checkout', '-q', '-b', 'open'); w('d.txt', 'new\n'); const open = commit('open');
  g('checkout', '-q', 'main'); g('checkout', '-q', '-b', 'cf', 'HEAD~2'); w('a.txt', 'other\n'); const cf = commit('cf');
  g('checkout', '-q', 'main'); w('a.txt', 'main\n'); commit('main moves');
  T('快进合并过的分支：内容在 main', contained(ff, 'main', tmp));
  T('压缩合并过的分支（提交号不在 main 里）：内容在 main', contained(sq, 'main', tmp));
  T('有新文件没合并：不算在 main', !contained(open, 'main', tmp));
  T('和 main 冲突：不算在 main（宁可漏删）', !contained(cf, 'main', tmp));
} finally { fs.rmSync(tmp, { recursive: true, force: true }) }

// 11-13：云端会话代理不放行 gh --paginate 的翻页链接（repositories/<数字ID>/…，403），PR 超过 100 个就整个脚本崩
const bp = fs.readFileSync(new URL('../../tools/branch_prune.mjs', import.meta.url), 'utf8');
T('branch_prune：不用 gh --paginate，自己按 page= 翻页', !/'--paginate'/.test(bp) && /pulls\?state=all&per_page=100&page=\$\{pg\}/.test(bp));
console.log(`branch_prune: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
