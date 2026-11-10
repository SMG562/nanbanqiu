// 脚本里「拿 git 输出的文件名来匹配」的守卫（11-09）。
// 起因：git 默认把中文等非 ASCII 路径加引号输出（"进度记录.md"），结尾的引号让 grep '\.md$' / case *.html 匹配不上。
//   tools/pr_merge.sh 因此把「只改文档」的 PR 当成「要跑测试」，#91 #94 #99 #102 #107 全合不进去（#100 修）；tools/gate.sh 里同类写法也有（本 PR 修）。
// 规矩：脚本里要「按文件名匹配 / 循环 / 管道处理」的 git 路径输出，必须 -z（NUL 分隔）或 -c core.quotepath=off。
//   只数行数（wc -l）、只判断空不空（[ -n "$(…)" ]）、只给人看（| head）不受影响，不查。
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os'; import { spawnSync } from 'node:child_process'; import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 400) : '')) };

const PATHY = /\bgit\b[^|\n]*(--name-only|--name-status|--porcelain|\bls-files\b)/;
const SAFE = /(\s-z\b|quotepath=(off|false))/i;   // git 配置名不分大小写：precommit.sh 写的是 core.quotePath=false
const COUNT_OR_SHOW = /\|\s*(wc\b|head\b)/;
const EMPTY_CHECK = /\[\s+(!\s+)?-[nz]\s+"\$\(\s*git\b/;
const MATCHES = /\|\s*(grep|while|sed|awk|xargs|python3?)\b|\bfor\s+\w+\s+in\s+\$\(\s*git\b|^\s*\w+=\$\(\s*git\b|\$\(\s*git[^)]*\)\s*\|/;
// 一行是否「用 git 路径输出做匹配却没处理引号」
export const risky = line => PATHY.test(line) && !SAFE.test(line) && !COUNT_OR_SHOW.test(line) && !EMPTY_CHECK.test(line) && MATCHES.test(line);

// ① 规则本身：坏写法抓得住，好写法放得过（对修复前的两行真代码会红）
T('抓：pr_merge 修复前（变量赋值，之后要 grep）', risky('CHG=$(git diff --name-only "$(git merge-base origin/main "$SHA")" "$SHA" 2>/dev/null)'));
T('抓：gate 修复前（for f in $(git diff-tree …)）', risky('  local f; for f in $(git diff-tree --no-commit-id --name-only -r --root "$SHA" 2>/dev/null); do'));
T('抓：管道进 grep', risky("git diff --name-only a b | grep -v '^\\.github/'"));
T('放：-z', !risky("git diff --name-only -z --diff-filter=AM \"$REF\" HEAD | tr '\\0' '\\n' | grep -v x"));
T('放：core.quotepath=off', !risky('CHG=$(git -c core.quotepath=off diff --name-only a b)'));
T('放：只判断空不空', !risky('if [ -n "$(git diff --name-only origin/main "$SHA" -- schema.sql server/migrations)" ]; then'));
T('放：只数行数', !risky('n=$(git diff --diff-filter=D --name-only "$base" "$lsha" | wc -l)'));
T('放：只给人看（head）', !risky('echo "$(git diff --diff-filter=D --name-only "$base" "$lsha" | head -5 | tr x y)"'));
T('放：git status --porcelain 只判空', !risky('[ -z "$(git status --porcelain)" ] && echo ok'));

// ② 真实脚本里没有漏网的
const files = [];
for (const d of ['tools', '.githooks']) for (const f of fs.readdirSync(path.join(ROOT, d))) { if (/\.(sh|mjs)$/.test(f) || d === '.githooks') files.push(path.join(d, f)) }
for (const f of fs.readdirSync(path.join(ROOT, '.github/workflows'))) if (/\.ya?ml$/.test(f)) files.push(path.join('.github/workflows', f));
const bad = [];
for (const f of files) { let s; try { s = fs.readFileSync(path.join(ROOT, f), 'utf8') } catch { continue } if (!s) continue;
  s.split('\n').forEach((l, i) => { if (!/^\s*#/.test(l) && risky(l)) bad.push(`${f}:${i + 1}: ${l.trim().slice(0, 110)}`) }) }
T('脚本里用 git 路径输出做匹配的，都处理了中文文件名引号（-z 或 core.quotepath=off）', bad.length === 0, bad);

// ③ 前提没变：这个 git 对中文路径默认确实加引号，关掉后能匹配 *.html（gate.sh 的 smoke 判断用的就是这条）
const env = { ...process.env }; for (const k of Object.keys(env)) if (k.startsWith('GIT_')) delete env[k];   // 在临时仓库跑 git 必须去掉 GIT_* 变量
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nbq-gitpaths-'));
const g = (...a) => spawnSync('git', a, { cwd: tmp, encoding: 'utf8', env });
try {
  g('init', '-q'); g('config', 'user.email', 't@t'); g('config', 'user.name', 't'); fs.writeFileSync(path.join(tmp, '南伴球_PWA.html'), 'x'); g('add', '.'); g('commit', '-q', '-m', 'x');
  const plain = g('diff-tree', '--no-commit-id', '--name-only', '-r', '--root', 'HEAD').stdout.trim();
  const off = g('-c', 'core.quotepath=off', 'diff-tree', '--no-commit-id', '--name-only', '-r', '--root', 'HEAD').stdout.trim();
  T('默认输出带引号 / 转义（这就是 *.html 匹配不上的原因）', plain.startsWith('"') && !plain.endsWith('.html'), plain);
  T('关掉 quotepath 后原样输出，能匹配 .html 结尾', off === '南伴球_PWA.html' && /\.html$/.test(off), off);
} finally { fs.rmSync(tmp, { recursive: true, force: true }) }

console.log(`git_paths: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
