// 多会话并行的协作工具（11-11，docs/协作分工.md）：撞车检查纯函数、复核结论沿用（review_carry）、run_all 注册行 union 合并、sync_main 自动处理生成文件冲突。
// 在临时仓库里真的建分支、真的合并、真的跑脚本。用法：node tests/unit/collab_tools.mjs [仓库根目录]
import fs from 'fs'; import os from 'os'; import path from 'path'; import { execFileSync, spawnSync } from 'child_process'; import { fileURLToPath, pathToFileURL } from 'url';
const ROOT = process.argv[2] || path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 500) : '')) };
const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('GIT_')));
const git = (cwd, ...a) => execFileSync('git', ['-c', 'core.quotePath=false', '-c', 'user.name=t', '-c', 'user.email=t@t', '-c', 'core.hooksPath=/dev/null', '-c', 'commit.gpgsign=false', '-c', 'protocol.file.allow=always', ...a], { cwd, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const tmpd = p => fs.mkdtempSync(path.join(os.tmpdir(), p));
const W = (d, f, s) => { fs.mkdirSync(path.dirname(path.join(d, f)), { recursive: true }); fs.writeFileSync(path.join(d, f), s) };
const { hotFiles, pairwise, touches, AUTO } = await import(pathToFileURL(path.join(ROOT, 'tools/overlap_check.mjs')).href);
const { carries } = await import(pathToFileURL(path.join(ROOT, 'tools/review_carry.mjs')).href);

// 1. 撞车检查：纯函数
const log = ['a.js', 'a.js', 'a.js', 'b.js', 'tests/reports/x/y', 'tests/reports/x/y', 'tests/reports/x/y', '南伴球_PWA.html', '南伴球_PWA.html', '南伴球_PWA.html', ''].join('\n');
T('热点：达到次数的文件按次数排，报告 / 生成文件不算', JSON.stringify(hotFiles(log, 3)) === JSON.stringify([['a.js', 3]]), hotFiles(log, 3));
T('两两同改：只列有重叠的', JSON.stringify(pairwise({ 1: ['a', 'b'], 2: ['b', 'c'], 3: ['z'] })) === JSON.stringify([{ a: '1', b: '2', files: ['b'] }]));
T('touches：文件相等或目录前缀', JSON.stringify(touches(['src/a.js', 'x.js', 'srcx/b'], ['src/', 'x.js'])) === JSON.stringify(['src/a.js', 'x.js']));
T('AUTO：run_all.mjs 和 src/*.list 不算撞车（union 自动合并）', AUTO.test('tests/run_all.mjs') && AUTO.test('src/pwa.list') && !AUTO.test('tests/spec/actions.json'));

// 2. 复核结论沿用
const mk = () => { const d = tmpd('nbq-carry-'); git(d, 'init', '-q', '-b', 'main'); W(d, 'f.js', '1\n2\n3\n4\n5\n6\n7\n8\n9\n'); W(d, 'other.js', 'o\n'); git(d, 'add', '-A'); git(d, 'commit', '-qm', 'base'); git(d, 'checkout', '-qb', 'pr');
  W(d, 'f.js', '1\n2\nPR\n4\n5\n6\n7\n8\n9\n'); git(d, 'commit', '-qam', 'pr'); return { d, R: git(d, 'rev-parse', 'HEAD') } };
let { d, R } = mk();   // 只多合并 main（main 改了别的文件）
git(d, 'checkout', '-q', 'main'); W(d, 'other.js', 'o2\n'); git(d, 'commit', '-qam', 'main'); git(d, 'checkout', '-q', 'pr'); git(d, 'merge', '-q', '--no-edit', 'main');
let H = git(d, 'rev-parse', 'HEAD'), r = carries(R, H, 'main', d); T('只多合并 main（文件不重叠）→ 沿用', r.carry, r);
r = carries(R, R, 'main', d); T('同一个提交 → 沿用', r.carry, r);
W(d, 'f.js', '1\n2\nPR\n4\n5\n6\n7\n8\nPR2\n'); git(d, 'commit', '-qam', 'more'); r = carries(R, git(d, 'rev-parse', 'HEAD'), 'main', d); T('复核之后 PR 又有新改动 → 不沿用', !r.carry && /不一样/.test(r.why), r);
({ d, R } = mk()); git(d, 'checkout', '-q', 'main'); W(d, 'f.js', '1\n2\n3\n4\n5\n6\n7\nMAIN\n9\n'); git(d, 'commit', '-qam', 'main edits f.js (far from PR hunk)'); git(d, 'checkout', '-q', 'pr'); git(d, 'merge', '-q', '--no-edit', 'main');
r = carries(R, git(d, 'rev-parse', 'HEAD'), 'main', d); T('main 也改了 PR 改的文件（即使干净合并）→ 不沿用，要重审', !r.carry && /重审/.test(r.why), r);
({ d, R } = mk()); git(d, 'checkout', '-q', 'main'); W(d, 'other.js', 'o2\n'); git(d, 'commit', '-qam', 'main'); git(d, 'checkout', '-q', '-B', 'pr2', 'main'); W(d, 'g.js', 'x\n'); git(d, 'add', '-A'); git(d, 'commit', '-qm', 'other history');
r = carries(R, git(d, 'rev-parse', 'HEAD'), 'main', d); T('旧提交不是头提交的祖先（历史被改写）→ 不沿用', !r.carry && /祖先/.test(r.why), r);

// 3. run_all 注册行：两边在同处各加一行 → 都留
{ const d = tmpd('nbq-union-'); git(d, 'init', '-q', '-b', 'main'); fs.copyFileSync(path.join(ROOT, '.gitattributes'), path.join(d, '.gitattributes')); fs.mkdirSync(path.join(d, 'tests'));
  const base = "add('a');\nadd('b');\n"; W(d, 'tests/run_all.mjs', base); W(d, 'src/pwa.list', 'a\n'); git(d, 'add', '-A'); git(d, 'commit', '-qm', 'base'); git(d, 'checkout', '-qb', 'feat');
  W(d, 'tests/run_all.mjs', base + "add('feat');\n"); git(d, 'commit', '-qam', 'feat'); git(d, 'checkout', '-q', 'main'); W(d, 'tests/run_all.mjs', base + "add('main');\n"); git(d, 'commit', '-qam', 'main');
  let ok = true, out = ''; try { git(d, 'merge', '-q', '--no-edit', 'feat') } catch (e) { ok = false; out = String(e.stderr || e) }
  const t = fs.readFileSync(path.join(d, 'tests/run_all.mjs'), 'utf8'); T('run_all.mjs 两边各加一行：合并不冲突、两行都在', ok && /add\('feat'\)/.test(t) && /add\('main'\)/.test(t), { ok, out, t });
  T('run_all.mjs 已登记 merge=union', git(ROOT, 'check-attr', 'merge', '--', 'tests/run_all.mjs').endsWith('union')); }
{ const src = fs.readFileSync(path.join(ROOT, 'tests/run_all.mjs'), 'utf8'); T('add() 遇到重复的测试名直接报错（union 合出两份时不会悄悄跑两遍）', /const add = .*测试名重复/.test(src)); }

// 4. sync_main：旧分支带着已不入库的生成文件 → 自动跟着 main 删；真冲突照旧中止
const sm = scenario => { const bare = tmpd('nbq-bare-') + '/o.git'; fs.mkdirSync(bare); git(bare, 'init', '-q', '--bare', '-b', 'main'); const d = tmpd('nbq-sm-'); git(d, 'clone', '-q', bare, d + '/w'); const w = d + '/w';
  git(w, 'checkout', '-q', '-b', 'main'); fs.mkdirSync(path.join(w, 'tools')); fs.copyFileSync(path.join(ROOT, 'tools/sync_main.sh'), path.join(w, 'tools/sync_main.sh'));
  W(w, '南伴球_PWA.html', 'gen\n'); W(w, 'x.js', 'base\n'); git(w, 'add', '-A'); git(w, 'commit', '-qm', 'base'); git(w, 'push', '-q', 'origin', 'main'); git(w, 'checkout', '-qb', 'feat');
  W(w, '南伴球_PWA.html', 'gen+feat\n'); W(w, 'y.js', 'feat\n'); if (scenario === 'real') W(w, 'x.js', 'feat\n'); git(w, 'add', '-A'); git(w, 'commit', '-qm', 'feat'); git(w, 'push', '-q', 'origin', 'feat');
  git(w, 'checkout', '-q', 'main'); git(w, 'rm', '-q', '南伴球_PWA.html'); if (scenario === 'real') W(w, 'x.js', 'main\n'); git(w, 'add', '-A'); git(w, 'commit', '-qm', 'main drops generated'); git(w, 'push', '-q', 'origin', 'main'); git(w, 'checkout', '-q', 'feat');
  const before = git(w, 'rev-parse', 'HEAD'), p = spawnSync('bash', ['tools/sync_main.sh'], { cwd: w, env, encoding: 'utf8' }); return { w, p, before, after: git(w, 'rev-parse', 'HEAD'), has: fs.existsSync(path.join(w, '南伴球_PWA.html')), pushed: git(w, 'ls-remote', 'origin', 'feat').split('\t')[0] } };
let s = sm('gen'); T('只有生成文件冲突：自动删除、提交并推送', s.p.status === 0 && !s.has && s.after !== s.before && s.pushed === s.after && /跟着 main 删除/.test(s.p.stdout), { code: s.p.status, out: s.p.stdout + s.p.stderr, has: s.has });
T('合并后分支仍带着自己的改动（y.js）', fs.existsSync(path.join(s.w, 'y.js')));
s = sm('real'); T('真冲突（x.js）：照旧中止、分支不变', s.p.status === 3 && s.after === s.before && /x\.js/.test(s.p.stdout), { code: s.p.status, out: s.p.stdout });
console.log(`collab_tools: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
