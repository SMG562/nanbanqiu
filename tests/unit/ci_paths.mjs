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
function pushPaths(file) {
  let lines; try { lines = fs.readFileSync(path.join(WF, file), 'utf8').split('\n') } catch { return null }
  let i = lines.findIndex(l => /^  push:\s*$/.test(l)); if (i < 0) return null;
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
const ls = spawnSync('git', ['ls-files', '-z'], { cwd: ROOT, env, encoding: 'utf8', maxBuffer: 64 << 20 });
const FILES = (ls.stdout || '').split('\0').filter(Boolean);
T('能列出已跟踪文件', ls.status === 0 && FILES.length > 100, { status: ls.status, n: FILES.length });
const NO_TEST = [
  [/\.(md|txt)$/i, '文档'],
  [/\.(png|jpe?g|webp|gif|ico|svg|pdf|zip)$/i, '图片 / 压缩包：内容测不了；海报名字对得上由 tests/frontend/site.js 在改 posters.json / 脚本时检查'],
  [/^marketing\/icons\//, '小毛图标：没有测试或站点引用，由 icons-lint.yml 检查（下面第 ③ 项盯着）'],
  [/^src\/.*\.(css|list)$/, '拼进三个 html，生成的 html 随同一提交入库（提交前检查核对一致），那几个 html 会触发'],
  [/^\.gitignore$/, 'git 配置'],
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
  'schema.sql', 'manifest.webmanifest', 'sw.js', 'tests/run_all.mjs', 'tools/gate.sh', 'tools/build.mjs', '.githooks/pre-commit', '.githooks/pre-push'];
const missing = MUST.filter(f => FILES.includes(f) && !(triggers(FAST, f) && triggers(FULL, f)));
T('关键文件改动一定触发 tests-fast 和 tests', missing.length === 0, missing);

console.log(`\nci_paths: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
