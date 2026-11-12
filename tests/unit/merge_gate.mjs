// merge-gate（tools/merge_gate.mjs，#229 第 3 项）：evaluate(facts) 与 pr_merge.sh 的各项核对逐项对应；只读，不碰网络。
import fs from 'node:fs'; import path from 'node:path';
import { evaluate } from '../../tools/merge_gate.mjs';
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 300) : '')) };
const ROOT = path.resolve(import.meta.dirname, '../..');
const SHA = 'abcdef1234567890';
const base = (o = {}) => ({ state: 'open', base: 'main', sha: SHA, ff: 'ff', docsOnly: false, ci: { 'tests-fast': 'success', tests: 'success' }, dbChanged: false, dbParity: false, bodyOk: true, level: 'self', me: 'MDD1102', coOwners: ['MDD1102'], reviewPass: [], carryWhy: null, clean: true, ...o });
const v = o => evaluate(base(o)), fails = o => v(o).items.filter(x => !x.ok).map(x => x.id);
T('全部满足 → 可合并', v().pass === true);
T('PR 已关闭 / 目标不是 main → 不可', fails({ state: 'closed' }).includes('open') && fails({ base: 'staging' }).includes('open'));
T('不能快进且放宽没过 → 不可；放宽通过 → 可', fails({ ff: 'no', ffWhy: 'x' }).includes('ff') && v({ ff: 'relaxed', ffWhy: '文件不重叠' }).pass);
T('tests-fast / tests 任一没跑 / 失败 / 进行中 → 不可', fails({ ci: { 'tests-fast': 'success', tests: null } }).join() === 'tests' && fails({ ci: { 'tests-fast': 'failure', tests: 'success' } }).join() === 'tests-fast' && fails({ ci: { 'tests-fast': 'success', tests: 'in_progress' } }).join() === 'tests');
T('只改 *.md：不需要运行记录', v({ docsOnly: true, ci: {} }).pass);
T('改了数据库：没有 db-parity → 不可；有 → 可', fails({ dbChanged: true }).join() === 'db' && v({ dbChanged: true, dbParity: true }).pass);
T('PR 描述核对没过 → 不可，并带原因', (() => { const r = evaluate(base({ bodyOk: false, bodyWhy: '缺入口清单' })); return !r.pass && /缺入口清单/.test(r.items.find(x => x.id === 'body').msg) })());
T('红线：所有者 / 共同所有者可合，其他人不可', v({ level: 'owner', me: 'SMG562' }).pass && v({ level: 'owner', me: 'MDD1102' }).pass && fails({ level: 'owner', me: 'someone' }).join() === 'level' && fails({ level: 'owner', me: '' }).join() === 'level');
T('需复核：没有留言 → 不可；有「通过 <当前提交>」→ 可；只有旧提交的留言但沿用成立 → 可', fails({ level: 'review' }).join() === 'level' && v({ level: 'review', reviewPass: ['abcdef1'] }).pass && v({ level: 'review', reviewPass: ['1111111'], carryWhy: '只多合并 main' }).pass && fails({ level: 'review', reviewPass: ['1111111'] }).join() === 'level');
T('工作区不干净 → 不可', fails({ clean: false }).join() === 'clean');
T('多项同时不满足：全部列出', fails({ state: 'closed', ci: { 'tests-fast': null, tests: null }, clean: false }).length === 4);
// 与 pr_merge.sh 的对应：每个核对项在两边都存在（以后给 pr_merge.sh 加了新核对项、这里忘了加，测试变红）
const pm = fs.readFileSync(path.join(ROOT, 'tools/pr_merge.sh'), 'utf8');
T('pr_merge.sh 的核对项 merge-gate 都有：快进 / tests-fast+tests / db-parity / 描述 / 级别 / 复核 / 干净', ['merge_drift.sh', 'pr_body_check.mjs', 'decision_card.mjs', 'review_state.mjs', 'review_carry.mjs', 'db-parity', 'porcelain'].every(k => pm.includes(k) && fs.readFileSync(path.join(ROOT, 'tools/merge_gate.mjs'), 'utf8').includes(k)));
console.log(`merge_gate: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
