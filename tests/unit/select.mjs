// 测试入口的 --changed / --failed（tests/lib/select.mjs + run_all.mjs）：选择规则、失败名单更新、规则里的名字没有过期、端到端用临时 git 仓库走一遍
import fs from 'fs'; import os from 'os'; import path from 'path'; import { spawnSync } from 'child_process'; import { fileURLToPath } from 'url';
import { BASE, RULES, selectByChanged, matches, updateFailed, missingFrom } from '../lib/select.mjs';
const HERE = path.dirname(fileURLToPath(import.meta.url)), TESTS = path.join(HERE, '..');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? '  ✓ ' : 'FAIL ') + n + (ok || x === undefined ? '' : ' ' + JSON.stringify(x).slice(0, 600))) };
const has = (r, t) => r.tokens.includes(t);

// ---- 选择规则 ----
let r = selectByChanged([]);
T('没有改动：只有基础项（static / unit）', r.tokens.join() === BASE.join() && !r.all && !r.unmatched.length);
r = selectByChanged(['src/shared/side/0065-发布规则.js']);
T('改场边源文件：选 side、e2e/sb、visual，也带基础项', has(r, 'side') && has(r, 'e2e/sb') && has(r, 'visual/') && BASE.every(b => has(r, b)), r);
r = selectByChanged(['src/pwa/script/0100-x.js']);
T('改手机端脚本：选 frontend/ 和 visual/，不选 pg/ 和 admin/', has(r, 'frontend/') && has(r, 'visual/') && !has(r, 'pg/') && !has(r, 'admin/'), r);
r = selectByChanged(['src/shared/script/0490-Supabase登录.js']);
T('改登录模块：选 unit/sb_auth、sb_login（同时也算共用脚本，选 frontend/）', has(r, 'unit/sb_auth') && has(r, 'sb_login') && has(r, 'frontend/'), r);
r = selectByChanged(['src/admin/script/0230-x.js']);
T('改后台源文件：选 admin/', has(r, 'admin/') && !has(r, 'frontend/'), r);
r = selectByChanged(['schema.sql']);
T('改 schema.sql：选 schema/ 和 pg/', has(r, 'schema/') && has(r, 'pg/'), r);
r = selectByChanged(['server/api/handler.mjs']);
T('改接口层：选 unit/api、pg/api、frontend/site', has(r, 'unit/api') && has(r, 'pg/api') && has(r, 'frontend/site'), r);
r = selectByChanged(['tests/frontend/side_bar.js']);
T('改某个测试文件：选同名的测试（suite/名字）', has(r, 'frontend/side_bar'), r);
r = selectByChanged(['tests/场边/t3.cjs']);
T('改场边设计稿测试：选 side_design', has(r, 'side_design') && !r.unmatched.length, r);
r = selectByChanged(['tests/run_all.mjs']);
T('改测试入口：all = true（整个快速档）', r.all === true, r);
r = selectByChanged(['tests/lib/select.mjs']);
T('改公共库：all = true', r.all === true, r);
r = selectByChanged(['业务规则.md', 'marketing/posters/a.py', 'marketing/img/1.webp', '.github/workflows/tests.yml', 'tests/snapshots/r4.txt']);
T('文档 / 物料 / CI 配置 / 回归快照：忽略，不算没规则', r.ignored.length === 5 && !r.unmatched.length && r.tokens.join() === BASE.join(), r);
r = selectByChanged(['some/new/thing.xyz', 'src/pwa/script/1.js']);
T('没有规则的文件：列进 unmatched，不影响别的文件的选择', r.unmatched.join() === 'some/new/thing.xyz' && has(r, 'frontend/'), r);
r = selectByChanged(['src/pwa/script/1.js', 'schema.sql']);
T('多个文件：取并集', has(r, 'frontend/') && has(r, 'pg/'), r);

T('matches：按测试名子串匹配（和 --grep 一样）', matches('frontend/side_bar', ['side']) && matches('unit/sb_auth', ['unit/']) && !matches('pg/rls', ['side', 'frontend/']));

// ---- 失败名单 ----
T('名单：这次失败的加入', updateFailed([], [{ id: 'a', ok: false }, { id: 'b', ok: true }]).join() === 'a');
T('名单：之前失败、这次通过的移出', updateFailed(['a', 'c'], [{ id: 'a', ok: true }]).join() === 'c');
T('名单：这次没跑的原样保留（只跑了几项不会把别的失败项弄丢）', updateFailed(['x', 'y'], [{ id: 'z', ok: true }]).join() === 'x,y');
T('名单：仍然失败的不重复；结果按名字排序', updateFailed(['b'], [{ id: 'b', ok: false }, { id: 'a', ok: false }]).join() === 'a,b');
T('名单：没有上一次（undefined / null）也能用', updateFailed(undefined, [{ id: 'a', ok: false }]).join() === 'a' && updateFailed(null, []).length === 0);
T('missingFrom：列出这一档里没有的名字', missingFrom(['a', 'b', 'c'], ['a', 'c']).join() === 'b');

// ---- 规则里的名字没有过期（测试改名 / 删除后，这里会失败）----
const run = (args, env = {}, cwd) => spawnSync('node', [path.join(TESTS, 'run_all.mjs'), ...args], { encoding: 'utf8', env: { ...process.env, ...env }, cwd });
const list = run(['--list']);
const ids = list.stdout.split('\n').map(l => l.trim().split(/\s+/)[1]).filter(Boolean);
T('--list 能列出完整档的测试（100 项以上）', ids.length > 100, ids.length);
const tokens = [...new Set([...BASE, ...RULES.flatMap(x => x[1])])];
const stale = tokens.filter(t => !ids.some(id => id.includes(t)));
T('规则和基础项里的每个名字都至少匹配一个真实测试', !stale.length, stale);

// ---- 端到端：临时 git 仓库里走一遍 --changed / --failed ----
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nbq-select-'));
const g = (...a) => spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', '-c', 'core.quotePath=false', ...a], { cwd: tmp, encoding: 'utf8' });
g('init', '-q'); fs.mkdirSync(path.join(tmp, 'src/shared/side'), { recursive: true }); fs.writeFileSync(path.join(tmp, 'README.md'), 'x'); g('add', '.'); g('commit', '-q', '-m', 'init');
const idsOf = o => o.stdout.split('\n').map(l => l.trim().split(/\s+/)[1]).filter(l => l && /\//.test(l));
const env = { NBQ_DIR: tmp, NBQ_FAILED_FILE: path.join(tmp, 'failed.json') };
let o = run(['--changed', '--list'], env, tmp);
T('端到端：没有改动 → 没有要跑的测试，退出码 0（--list 下什么都不列）', o.status === 0 && idsOf(o).length === 0, o.stdout);
fs.writeFileSync(path.join(tmp, 'src/shared/side/0099-x.js'), '//');
o = run(['--changed', '--list'], env, tmp); let got = idsOf(o);
T('端到端：新增场边源文件（没提交）→ 选到 frontend/side，选不到 pg/rls，基础项在', got.includes('frontend/side') && got.includes('static/check') && !got.includes('pg/rls'), got.length);
fs.mkdirSync(path.join(tmp, 'tests'), { recursive: true }); fs.writeFileSync(path.join(tmp, 'tests/run_all.mjs'), '//');
o = run(['--changed', '--list'], env, tmp); got = idsOf(o);
T('端到端：改了测试入口 = 整个快速档，不含回归、admin/sweep、一年数据量性能（--changed 隐含快速档）', got.length > 60 && got.includes('pg/rls') && !got.some(i => i.startsWith('regression/') || i === 'admin/sweep' || i === 'pg/perf@一年'), got.length);
fs.rmSync(path.join(tmp, 'tests'), { recursive: true, force: true });
g('add', '.'); g('commit', '-q', '-m', 'x');
o = run(['--changed=HEAD~1', '--list'], env, tmp); got = idsOf(o);
T('端到端：--changed=<ref> 和那次提交比', got.includes('frontend/side'), got.length);
o = run(['--changed=HEAD;touch pwned', '--list'], env, tmp);
T('端到端：ref 里夹着命令 → 退出码 2，命令没有被执行', o.status === 2 && !fs.existsSync(path.join(tmp, 'pwned')), [o.status, fs.existsSync(path.join(tmp, 'pwned'))]);
fs.writeFileSync(env.NBQ_FAILED_FILE, JSON.stringify({ ids: ['pg/rls', 'regression/r4'] }));
o = run(['--failed', '--list', '--quick'], env, tmp); got = idsOf(o);
T('端到端：--failed 只列名单里的（在这一档里的）', got.join() === 'pg/rls', got);
T('端到端：名单里有这一档没有的项时说明', /这一档里没有.*regression\/r4/.test(o.stdout), o.stdout);
o = run(['--failed', '--changed=HEAD~1', '--list'], env, tmp); got = idsOf(o);
T('端到端：--failed 和 --changed 一起用 = 并集', got.includes('pg/rls') && got.includes('frontend/side'), got.length);
fs.rmSync(tmp, { recursive: true, force: true });

console.log(`\nselect: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
