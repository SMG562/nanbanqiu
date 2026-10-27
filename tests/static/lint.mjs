// R0（10-27）：两个前台 HTML 的脚本过代码检查（tools/lint.mjs，ESLint 版本固定在 tests/lint/package.json）。
//   ① 现在没有问题（用了没定义的名字、重复声明、重复的键……）
//   ② 登记的例外（CROSS_OK）都还对得上：文件存在、名字确实在里面
//   ③ 自检：临时副本里拼错一个函数名 / 重复声明一个变量 / 在共用文件里调用不存在的函数，都要被报出来，并且对回正确的源文件
import fs from 'fs'; import os from 'os'; import path from 'path'; import { fileURLToPath, pathToFileURL } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url)), DIR = process.argv[2] || process.env.NBQ_DIR || path.join(HERE, '..', '..');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 800) : '')) };
const L = await import(pathToFileURL(path.resolve(DIR, 'tools', 'lint.mjs')).href);
const mods = L.lintModules();
if (!fs.existsSync(path.join(mods, 'eslint'))) { console.log('FAIL 没装 ESLint（run_all 会自动装到 ' + mods + '）'); process.exit(1); }

const res = L.lint(DIR, mods);
T('代码检查没有问题', res.length === 0, res.map(r => `${r.src}:${r.srcLine} ${r.rule} ${r.message}`));
for (const [rel, { names }] of Object.entries(L.CROSS_OK)) {
  const f = path.join(DIR, 'src', rel), s = fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null;
  T(`例外登记的 ${rel} 存在`, s !== null);
  if (s) T(`例外登记的名字都在 ${rel} 里`, names.every(n => new RegExp('\\b' + n + '\\b').test(s)), names.filter(n => !new RegExp('\\b' + n + '\\b').test(s)));
}

// 自检：在副本里放三种错误
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nbq-lint-'));
try {
  fs.cpSync(path.join(DIR, 'src'), path.join(tmp, 'src'), { recursive: true });
  const B = await import(pathToFileURL(path.resolve(DIR, 'tools', 'build.mjs')).href);
  const list = B.readList('pwa', tmp);
  const pick = (pre, re) => list.find(r => r.startsWith(pre) && re.test(fs.readFileSync(path.join(tmp, 'src', r), 'utf8')));
  const edit = (rel, fn) => { const f = path.join(tmp, 'src', rel); fs.writeFileSync(f, fn(fs.readFileSync(f, 'utf8'))); };
  const a = pick('shared/script/', /\btoast\(/), b = pick('pwa/side/', /\n/), c = pick('shared/script/', /\n/);
  edit(a, s => s.replace(/\btoast\(/, 'toastt('));                                // 拼错函数名
  edit(b, s => s.replace(/\n/, '\nvar __nbqDup=1;var __nbqDup=2;\n'));              // 重复声明
  edit(c, s => s.replace(/\n/, '\nif(Math.random()<0)nbqNoSuchFn();\n'));          // 共用文件里调用两端都没有的函数
  const got = L.lint(tmp, mods), has = (rel, rule, name) => got.some(r => r.src === 'src/' + rel && r.rule === rule && r.message.includes(name));
  T('自检：拼错的函数名被报出，对回正确的源文件', has(a, 'no-undef', 'toastt'), got.slice(0, 5));
  T('自检：重复声明的变量被报出', has(b, 'no-redeclare', '__nbqDup'), got.slice(0, 5));
  T('自检：共用文件里调用不存在的函数被报出', has(c, 'no-undef', 'nbqNoSuchFn'), got.slice(0, 5));
  T('自检：共用文件的问题只报一次（不因两端重复）', got.filter(r => r.message.includes('nbqNoSuchFn')).length === 1, got.filter(r => r.message.includes('nbqNoSuchFn')));
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }

console.log(`${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
