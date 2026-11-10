// CI 路径规则守卫（11-04）：tests-fast.yml / tests.yml 的 paths 决定「哪些提交跑测试」。靠人记会漏，所以用程序盯：
//   ① 两份列表必须一致（手工同步的两份，改一份漏一份 = 悄悄少测）
//   ② 每个已跟踪文件要么触发测试，要么在下面的「不测名单」里写明理由——新目录 / 新文件类型必须有人决定，不能默认漏掉
//   ③ 被 ! 排除的目录：没有测试 / 工具 / 站点引用它，并且有别的轻量检查工作流顶上
//   ④ 关键文件（依赖、部署配置、海报清单、流程脚本…）一定触发
// 路径通配按 GitHub 规则近似：** 匹配含 / 的任意字符，* 不含 /；! 只排除它前面的规则（所以排除放最后）。
// 背景见 开发规矩.md「11-04 · 图稿提交触发全套测试的教训」。
import fs from 'fs'; import path from 'path'; import { spawnSync } from 'child_process'; import { fileURLToPath } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = process.env.NBQ_CI_ROOT || path.join(HERE, '..', '..');
const WF = path.join(ROOT, '.github', 'workflows');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? '  ✓ ' : 'FAIL ') + n + (ok || x === undefined ? '' : ' ' + JSON.stringify(x).slice(0, 900))) };

// 读 on.push.paths（简单的行解析，不引入 yaml 依赖；读不到会让下面的第一项测试失败）
function pushPaths(file, ev = 'push') {
  let lines; try { lines = fs.readFileSync(path.join(WF, file), 'utf8').split('\n') } catch { return null }
  let i = lines.findIndex(l => new RegExp('^  ' + ev + ':').test(l)); if (i < 0) return null;
  const out = []; let inPaths = false;
  for (i++; i < lines.length; i++) {
    const l = lines[i];
    if (/^  \S/.test(l)) break;                                   // 下一个事件（schedule: / workflow_dispatch: …）
    if (/^    paths:\s*$/.test(l)) { inPaths = true; continue }
    if (inPaths) { const m = l.match(/^      - '([^']+)'/); if (m) out.push(m[1]); else if (/^    \S/.test(l)) break }
  }
  return out;
}
const rx = p => { let o = '', i = 0; while (i < p.length) { if (p.startsWith('**', i)) { o += '.*'; i += 2 } else if (p[i] === '*') { o += '[^/]*'; i++ } else if (p[i] === '?') { o += '[^/]'; i++ } else { o += p[i].replace(/[.+^${}()|[\]\\]/g, '\\$&'); i++ } } return new RegExp('^' + o + '$') };
const triggers = (pats, f) => { let sel = false; for (const p of pats) { if (p[0] === '!') { if (rx(p.slice(1)).test(f)) sel = false } else if (rx(p).test(f)) sel = true } return sel };

const FAST = pushPaths('tests-fast.yml'), FULL = pushPaths('tests.yml');
T('读到两个工作流的 push.paths', !!FAST && !!FULL && FAST.length > 5 && FULL.length > 5, { FAST, FULL });
if (!FAST || !FULL) { console.log(`\nci_paths: ${pass} passed, ${fail} failed`); process.exit(1) }

// ① 一致
T('tests-fast.yml 和 tests.yml 的路径列表一致（顺序也一致，因为 ! 规则看顺序）', JSON.stringify(FAST) === JSON.stringify(FULL), { 只在fast: FAST.filter(p => !FULL.includes(p)), 只在tests: FULL.filter(p => !FAST.includes(p)) });

// 通配实现本身的对照（防止守卫自己写错）
const t = f => triggers(FAST, f);
T('通配对照：页面源码 / 脚本 / 测试 / 工作流本身会触发', t('src/pwa/script/0100-x.js') && t('南伴球_PWA.html') && t('tests/unit/a.mjs') && t('.github/workflows/tests.yml') && t('schema.sql'));
T('通配对照：只改文档 / 图片不触发', !t('进度记录.md') && !t('marketing/img/01-a.webp'));
T('通配对照：海报脚本触发，图标脚本不触发', t('marketing/posters/p01_x.py') && !t('marketing/icons/gen_a.py'));
T('通配对照：一次推送里图标 + 业务代码，只要有一个触发就跑', ['marketing/icons/a.svg', 'src/shared/x.js'].some(t));

// ② 分类：每个已跟踪文件，要么触发，要么在不测名单里
const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('GIT_')));   // 开发规矩：git 的测试去掉 GIT_* 变量
// 已跟踪 + 还没 add 的新文件（-c -o --exclude-standard，不含 .gitignore 忽略的）：11-10 新加的 .gitattributes 没 add 就跑检查，只看已跟踪文件 → 漏掉，CI 才红
const ls = spawnSync('git', ['ls-files', '-z', '-c', '-o', '--exclude-standard'], { cwd: ROOT, env, encoding: 'utf8', maxBuffer: 64 << 20 });
const FILES = (ls.stdout || '').split('\0').filter(Boolean);
T('能列出已跟踪文件', ls.status === 0 && FILES.length > 100, { status: ls.status, n: FILES.length });
const NO_TEST = [
  [/\.(md|txt)$/i, '文档'],
  [/\.(png|jpe?g|webp|gif|ico|svg|pdf|zip)$/i, '图片 / 压缩包：内容测不了；海报名字对得上由 tests/frontend/site.js 在改 posters.json / 脚本时检查'],
  [/^marketing\/icons\//, '小毛图标：没有测试或站点引用，由 icons-lint.yml 检查（下面第 ③ 项盯着）'],
  [/^src\/.*\.(css|list)$/, '拼进三个 html，生成的 html 随同一提交入库（提交前检查核对一致），那几个 html 会触发'],
  [/^\.gitignore$/, 'git 配置'],
  [/^\.github\/(CODEOWNERS|dependabot\.yml|ISSUE_TEMPLATE\/)/, 'GitHub 协作配置（谁必须审 / Issue 表单）：不影响运行代码，生效与否在 GitHub 设置里看'],
  [/^\.claude\/(?!.*\.json$)/, '助手说明文档（.claude 里的 json 配置仍会触发）'],
];
const unclassified = FILES.filter(f => !triggers(FAST, f) && !NO_TEST.some(([r]) => r.test(f)));
T('每个已跟踪文件要么触发测试、要么在不测名单里（新目录 / 新类型：加进 paths，或在本文件 NO_TEST 写明理由）', unclassified.length === 0, { 数量: unclassified.length, 例: unclassified.slice(0, 12) });

// ③ 被排除的目录
const EXC = FAST.filter(p => p[0] === '!').map(p => p.slice(1).replace(/\/\*\*$/, ''));
T('至少有一个被排除的目录（没有就说明规则被改掉了，更新这个测试）', EXC.length >= 1, EXC);
const ALLOW_REF = new Set(['tools/lint_icons.py', 'tests/unit/ci_paths.mjs']);   // 本来就是顶替它的检查，或本守卫自己
const CODE_DIRS = /^(tests|tools|server|functions|worker|notify-worker|src|\.githooks)\//, CODE_EXT = /\.(m?js|cjs|py|sh|html|json|sql|ya?ml)$/;
for (const dir of EXC) {
  const refs = [];
  for (const f of FILES) {
    if (f.startsWith(dir + '/') || ALLOW_REF.has(f) || !CODE_DIRS.test(f) || !CODE_EXT.test(f)) continue;
    let txt; try { txt = fs.readFileSync(path.join(ROOT, f), 'utf8') } catch { continue }
    if (txt.includes(dir)) refs.push(f);
  }
  T(`被排除的目录 ${dir}：没有测试 / 工具 / 站点代码引用它（有引用就不能排除，否则改它不会触发那个测试）`, refs.length === 0, refs);
  const others = fs.readdirSync(WF).filter(f => /\.ya?ml$/.test(f) && !['tests-fast.yml', 'tests.yml'].includes(f));
  const cover = others.filter(f => (pushPaths(f) || []).includes(dir + '/**'));
  T(`被排除的目录 ${dir}：有别的工作流在它变动时跑轻量检查（不是「不测」）`, cover.length >= 1, others);
}

// ④ 关键文件一定触发（存在才查）：依赖、部署配置、海报清单、数据库结构、流程脚本、提交前检查
const MUST = ['package.json', 'package-lock.json', 'wrangler.jsonc', 'notify-worker/wrangler.jsonc', 'marketing/posters.json', 'marketing/lib.py', 'marketing/build.py',
  'schema.sql', 'manifest.webmanifest', 'sw.js', 'tests/run_all.mjs', 'tools/gate.sh', 'tools/build.mjs', '.githooks/pre-commit', '.githooks/pre-push', '.githooks/post-merge', '.gitattributes'];
const missing = MUST.filter(f => FILES.includes(f) && !(triggers(FAST, f) && triggers(FULL, f)));
T('关键文件改动一定触发 tests-fast 和 tests', missing.length === 0, missing);

// ⑤ 按提交复用结果（11-04）：PR 上测过的提交快进到 main 后不重跑。前提必须守住，否则会「复用」到没测过的东西
const PR = pushPaths('tests.yml', 'pull_request');
T('tests.yml 的 pull_request.paths 和 push.paths 完全一致（否则有的改动 PR 上不测、合并后却被复用）', !!PR && JSON.stringify(PR) === JSON.stringify(FULL), { PR, FULL });
const rd = f => { try { return fs.readFileSync(f, 'utf8') } catch { return '' } };
const reuse = rd(path.join(ROOT, 'tools', 'ci_reuse.sh')), merge = rd(path.join(ROOT, 'tools', 'pr_merge.sh')), tests = rd(path.join(WF, 'tests.yml')), fastY = rd(path.join(WF, 'tests-fast.yml'));
// 11-05：「没有运行记录」时 jq 输出「null  null」而不是「null」；用 = null 判断就永远不会自动触发 tests-fast（PR #43 合并时撞上）
T('pr_merge.sh：判断「没有运行记录」用 null* 前缀匹配，不用 = null', /case "\$L" in null\*\|""\) true;;/.test(merge) && !/\[ "\$L" = null \]/.test(merge));
{ const { execSync } = await import('child_process');
  const cond = L => execSync(`L='${L}'; W=tests-fast; if [ "$W" = tests-fast ] && case "$L" in null*|"") true;; *) false;; esac; then echo yes; else echo no; fi`, { shell: '/bin/bash' }).toString().trim();
  T('pr_merge.sh 的判断：「null  null」「null」「」都算没有记录；「completed success 123」不算', cond('null  null') === 'yes' && cond('null') === 'yes' && cond('') === 'yes' && cond('completed success 123') === 'no' && cond('in_progress  123') === 'no') }
T('复用按提交号（head_sha）或「内容 tree 完全相同」查，只认通过的运行，不认重拍截图基准的运行（ADR 0010）', reuse.includes('head_sha=$1') && reuse.includes('find_id "$SHA"') && reuse.includes('.commit.tree.sha') && reuse.includes('conclusion==\\"success\\"') && reuse.includes('visual-baseline'));
const testIf = /needs: reuse\n\s+if: \$\{\{ !cancelled\(\) && needs.reuse.outputs.hit != '1'( && !\(github.event_name == 'pull_request' && github.event.pull_request.draft\))? \}\}/;
T('两个工作流都只在「推到 main」时开复用检查；没检查 / 检查出错照常测试，只有命中才跳过', /reuse:[^\n]*\n\s+if: github.event_name == 'push'\n/.test(tests) && /reuse:[^\n]*\n\s+if: github.ref == 'refs\/heads\/main' && github.event_name == 'push'\n/.test(fastY)
  && testIf.test(tests) && testIf.test(fastY));
{ const gate = fs.readFileSync(path.join(ROOT, 'tools/gate.sh'), 'utf8'), mark = '未测：草稿';   // 11-07 省额度：草稿 PR 不测，但运行结论仍是 success → 必须靠标题排除，否则会被当成「测过」
  T('草稿 PR 不跑浏览器测试，运行标题带「未测：草稿」，复用 / 合并 / 上线闸门都排除它', /hit != '1' && !\(github.event_name == 'pull_request' && github.event.pull_request.draft\)/.test(tests)
    && tests.includes("github.event.pull_request.draft && '" + mark) && reuse.includes('visual-baseline|' + mark) && gate.includes('visual-baseline|' + mark)
    && merge.split('visual-baseline|' + mark).length === 3) }
T('PR 测的是 PR 最新提交本身，且和推 main 跑同一条命令', tests.includes('github.event.pull_request.head.sha') && tests.includes('[ "${{ github.event_name }}" = "push" ] || [ "${{ github.event_name }}" = "pull_request" ]'));
T('合并脚本只快进（把测过的提交号推成 main）、不强推，并核对测试 / db-parity / 工作区', merge.includes('merge-base --is-ancestor origin/main') && merge.includes('git push origin "$SHA:refs/heads/main"') && !/git push[^\n]*(--force|\s-f\s)/.test(merge) && merge.includes('db-parity') && merge.includes('status --porcelain'));

const gateS = rd(path.join(ROOT, 'tools', 'gate.sh'));
T('查运行记录按工作流文件路径（.path），不按 .name——tests.yml 有 run-name，name 会变成 PR 标题 / 提交说明（11-04 实测）', [reuse, merge, gateS].every(x => x.includes('.path==') && !/select\(\.name==/.test(x)));
T('闸门 / 合并 / 复用都不把「重拍截图基准」的运行当成测试（它不跑测试）', [reuse, merge, gateS].every(x => x.includes('visual-baseline')));

console.log(`\nci_paths: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
