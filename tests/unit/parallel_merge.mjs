// 并行开发合并（11-10）：两个分支往 src/*.list 同一处追加新文件，合并不报冲突、两行都留下；重复行构建直接拒绝。
//   起因：#131 合 main 时，「我的 UTR」「球友」和引导条都追加在 0498 之后，连着两次清单冲突。
import fs from 'fs'; import os from 'os'; import path from 'path'; import { execFileSync } from 'child_process'; import { fileURLToPath, pathToFileURL } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url)), DIR = process.argv[2] || process.env.NBQ_DIR || path.join(HERE, '..', '..');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? '  ✓ ' : 'FAIL ') + n + (ok || x === undefined ? '' : ' ' + JSON.stringify(x))); };
const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('GIT_')));   // 临时仓库：去掉 GIT_*（提交前检查里跑时会带）
const git = (cwd, ...a) => execFileSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', '-c', 'core.hooksPath=/dev/null', ...a], { cwd, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
// ① 仓库里的规则确实生效
for (const l of ['pwa', 'web', 'admin']) T(`src/${l}.list 的合并方式是 union`, /merge: union/.test(git(DIR, 'check-attr', 'merge', '--', `src/${l}.list`)));
// ② 重放：同一处各加一行
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nbq-merge-'));
try {
  git(tmp, 'init', '-q', '-b', 'main'); fs.mkdirSync(path.join(tmp, 'src'));
  fs.copyFileSync(path.join(DIR, '.gitattributes'), path.join(tmp, '.gitattributes'));
  const L = path.join(tmp, 'src', 'pwa.list'), w = s => fs.writeFileSync(L, s);
  w('shared/script/0497-a.js\nshared/script/0498-b.js\npwa/script/0260-c.js\n'); git(tmp, 'add', '-A'); git(tmp, 'commit', '-qm', 'base');
  git(tmp, 'checkout', '-qb', 'utr'); w('shared/script/0497-a.js\nshared/script/0498-b.js\nshared/script/0499-我的UTR.js\npwa/script/0260-c.js\n'); git(tmp, 'commit', '-qam', 'utr');
  git(tmp, 'checkout', '-q', 'main'); git(tmp, 'checkout', '-qb', 'intro'); w('shared/script/0497-a.js\nshared/script/0498-b.js\nshared/script/0499-首页引导条.js\npwa/script/0260-c.js\n'); git(tmp, 'commit', '-qam', 'intro');
  let ok = true; try { git(tmp, 'merge', '-q', '--no-edit', 'utr') } catch (e) { ok = false }
  const got = fs.readFileSync(L, 'utf8');
  T('两个分支在同一处追加：合并不报冲突', ok);
  T('两边新加的行都在、没有冲突标记', got.includes('0499-我的UTR.js') && got.includes('0499-首页引导条.js') && !/<<<<<<<|>>>>>>>/.test(got), got);
  T('原有的行顺序不变', got.indexOf('0498-b.js') < got.indexOf('0499-') && got.indexOf('0499-') < got.indexOf('0260-c.js'), got);
} finally { fs.rmSync(tmp, { recursive: true, force: true }) }
// ③ union 的风险：两边加了同一行 → 构建拒绝（不让同一文件被拼两次）
const B = await import(pathToFileURL(path.join(DIR, 'tools', 'build.mjs')).href);
const t2 = fs.mkdtempSync(path.join(os.tmpdir(), 'nbq-dup-'));
try {
  fs.mkdirSync(path.join(t2, 'src', 'shared'), { recursive: true }); fs.writeFileSync(path.join(t2, 'src', 'shared', 'x.js'), '1\n');
  fs.writeFileSync(path.join(t2, 'src', 'pwa.list'), 'shared/x.js\nshared/x.js\n');
  let msg = ''; try { B.assemble('pwa', t2) } catch (e) { msg = e.message }
  T('清单有重复行：构建直接报错并指出是哪一行', /重复/.test(msg) && msg.includes('shared/x.js'), msg);
  fs.writeFileSync(path.join(t2, 'src', 'pwa.list'), 'shared/x.js\n');
  T('没有重复：照常拼出', B.assemble('pwa', t2).text === '1\n');
} finally { fs.rmSync(t2, { recursive: true, force: true }) }
console.log(`parallel_merge: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
