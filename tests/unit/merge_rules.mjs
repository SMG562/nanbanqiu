// 合并规则（11-10）：.gitattributes 让「两边都没写错、解决办法永远一样」的冲突不再出现，真要人判断的照常冲突。
//   src/*.list：merge=union → 两边各加一行，两行都留（生成文件 11-11 起不入库，ADR 0011，不再需要合并规则）
//   在临时仓库里真的合并一次验证（不是只看配置）；要人判断的普通源文件照常冲突。
// 用法：node tests/unit/merge_rules.mjs [仓库根目录]
import fs from 'fs'; import os from 'os'; import path from 'path'; import { execFileSync } from 'child_process'; import { fileURLToPath } from 'url';
const ROOT = process.argv[2] || path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? 'PASS ' : 'FAIL ') + n + (!ok && x !== undefined ? ' ' + JSON.stringify(x).slice(0, 600) : '')) };
const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('GIT_')));   // 临时仓库跑 git 去掉 GIT_*（开发规矩）
const git = (cwd, ...a) => execFileSync('git', ['-c', 'core.quotePath=false', '-c', 'user.name=t', '-c', 'user.email=t@t', '-c', 'core.hooksPath=/dev/null', '-c', 'commit.gpgsign=false', ...a], { cwd, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const attr = (f, k) => (git(ROOT, 'check-attr', k, '--', f).split(': ').pop() || '').trim();

// 1. 规则覆盖到位
for (const f of fs.readdirSync(path.join(ROOT, 'src')).filter(f => f.endsWith('.list'))) T(`src/${f}：merge=union`, attr('src/' + f, 'merge') === 'union', attr('src/' + f, 'merge'));
T('普通源文件不受影响（照常逐行合并）', attr('src/shared/script/0495-接口调用.js', 'merge') === 'unspecified' && attr('schema.sql', 'merge') === 'unspecified');
T('生成文件不再有合并规则、也不被 git 跟踪（ADR 0011）', ['南伴球_PWA.html', '南伴球_Web.html', '南伴球_后台.html', 'server/migrations/_bundle.sql'].every(f => attr(f, 'merge') === 'unspecified') && !git(ROOT, 'ls-files', '--', '南伴球_PWA.html', '南伴球_Web.html', '南伴球_后台.html', 'server/migrations/_bundle.sql').trim());

// 2. 临时仓库里真的合并一次
const run = () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'nbq-merge-'));
  try {
    git(d, 'init', '-q', '-b', 'main'); fs.copyFileSync(path.join(ROOT, '.gitattributes'), path.join(d, '.gitattributes')); fs.mkdirSync(path.join(d, 'src'));
    const w = (f, t) => fs.writeFileSync(path.join(d, f), t);
    w('src/pwa.list', 'a.js\nb.js\n'); w('x.js', 'base\n'); git(d, 'add', '-A'); git(d, 'commit', '-qm', 'base');
    git(d, 'checkout', '-qb', 'feat'); w('src/pwa.list', 'a.js\nb.js\nfeat.js\n'); w('x.js', 'feat\n'); git(d, 'commit', '-qam', 'feat');
    git(d, 'checkout', '-q', 'main'); w('src/pwa.list', 'a.js\nb.js\nmain.js\n'); w('x.js', 'main\n'); git(d, 'commit', '-qam', 'main');
    git(d, 'checkout', '-q', 'feat'); try { git(d, 'merge', '-q', '--no-edit', 'main') } catch (_) { }
    const conf = git(d, 'diff', '--name-only', '--diff-filter=U').split('\n').filter(Boolean).sort();
    return { conf, list: fs.readFileSync(path.join(d, 'src/pwa.list'), 'utf8') };
  } finally { fs.rmSync(d, { recursive: true, force: true }) } };
const on = run();
T('src/*.list：两边各加一行 → 两行都留、不冲突', !on.conf.includes('src/pwa.list') && /feat\.js/.test(on.list) && /main\.js/.test(on.list) && !/<<<<<<</.test(on.list), on);
T('普通源文件两边改了同一行：照常冲突（要人判断的不自动合）', on.conf.includes('x.js'), on.conf);
console.log(`${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
