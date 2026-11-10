// 合并规则（11-10）：.gitattributes 让「两边都没写错、解决办法永远一样」的冲突不再出现，真要人判断的照常冲突。
//   ① 生成文件（三个 HTML、_bundle.sql）：merge=nbq-generated → 合并时留当前分支的，合并后 post-merge 重新生成
//   ② src/*.list：merge=union → 两边各加一行，两行都留
//   在临时仓库里真的合并一次验证（不是只看配置）：配了 → 不冲突；没配驱动 → 和原来一样冲突（不会更糟）。
// 用法：node tests/unit/merge_rules.mjs [仓库根目录]
import fs from 'fs'; import os from 'os'; import path from 'path'; import { execFileSync } from 'child_process'; import { fileURLToPath } from 'url';
const ROOT = process.argv[2] || path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? 'PASS ' : 'FAIL ') + n + (!ok && x !== undefined ? ' ' + JSON.stringify(x).slice(0, 600) : '')) };
const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('GIT_')));   // 临时仓库跑 git 去掉 GIT_*（开发规矩）
const git = (cwd, ...a) => execFileSync('git', ['-c', 'core.quotePath=false', '-c', 'user.name=t', '-c', 'user.email=t@t', '-c', 'core.hooksPath=/dev/null', '-c', 'commit.gpgsign=false', ...a], { cwd, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const attr = (f, k) => (git(ROOT, 'check-attr', k, '--', f).split(': ').pop() || '').trim();

// 1. 规则覆盖到位
const GEN = ['南伴球_PWA.html', '南伴球_Web.html', '南伴球_后台.html', 'server/migrations/_bundle.sql'];
for (const f of GEN) T(`${f}：merge=nbq-generated`, attr(f, 'merge') === 'nbq-generated', attr(f, 'merge'));
for (const f of fs.readdirSync(path.join(ROOT, 'src')).filter(f => f.endsWith('.list'))) T(`src/${f}：merge=union`, attr('src/' + f, 'merge') === 'union', attr('src/' + f, 'merge'));
T('普通源文件不受影响（照常逐行合并）', attr('src/shared/script/0495-接口调用.js', 'merge') === 'unspecified' && attr('schema.sql', 'merge') === 'unspecified');
T('setup_env.sh 会配上驱动', /git config merge\.nbq-generated\.driver true/.test(fs.readFileSync(path.join(ROOT, 'tools/setup_env.sh'), 'utf8')));
T('post-merge 钩子存在且可执行', (() => { try { fs.accessSync(path.join(ROOT, '.githooks/post-merge'), fs.constants.X_OK); return true } catch (_) { return false } })());

// 2. 临时仓库里真的合并一次
const run = withDriver => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'nbq-merge-'));
  try {
    git(d, 'init', '-q', '-b', 'main'); fs.copyFileSync(path.join(ROOT, '.gitattributes'), path.join(d, '.gitattributes')); fs.mkdirSync(path.join(d, 'src'));
    if (withDriver) git(d, 'config', 'merge.nbq-generated.driver', 'true');
    const w = (f, t) => fs.writeFileSync(path.join(d, f), t);
    w('南伴球_PWA.html', 'base\n'); w('src/pwa.list', 'a.js\nb.js\n'); w('x.js', 'base\n'); git(d, 'add', '-A'); git(d, 'commit', '-qm', 'base');
    git(d, 'checkout', '-qb', 'feat'); w('南伴球_PWA.html', 'feat\n'); w('src/pwa.list', 'a.js\nb.js\nfeat.js\n'); w('x.js', 'feat\n'); git(d, 'commit', '-qam', 'feat');
    git(d, 'checkout', '-q', 'main'); w('南伴球_PWA.html', 'main\n'); w('src/pwa.list', 'a.js\nb.js\nmain.js\n'); w('x.js', 'main\n'); git(d, 'commit', '-qam', 'main');
    git(d, 'checkout', '-q', 'feat'); try { git(d, 'merge', '-q', '--no-edit', 'main') } catch (_) { }
    const conf = git(d, 'diff', '--name-only', '--diff-filter=U').split('\n').filter(Boolean).sort();
    return { conf, html: fs.readFileSync(path.join(d, '南伴球_PWA.html'), 'utf8'), list: fs.readFileSync(path.join(d, 'src/pwa.list'), 'utf8') };
  } finally { fs.rmSync(d, { recursive: true, force: true }) } };
const on = run(true), off = run(false);
T('配了驱动：生成文件不冲突，留当前分支的（之后由 post-merge 重新生成）', !on.conf.includes('南伴球_PWA.html') && on.html === 'feat\n', on);
T('src/*.list：两边各加一行 → 两行都留、不冲突', !on.conf.includes('src/pwa.list') && /feat\.js/.test(on.list) && /main\.js/.test(on.list) && !/<<<<<<</.test(on.list), on);
T('普通源文件两边改了同一行：照常冲突（要人判断的不自动合）', on.conf.includes('x.js'), on.conf);
T('没配驱动：生成文件和原来一样冲突（规则不会让情况更糟）', off.conf.includes('南伴球_PWA.html'), off.conf);
console.log(`${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
