// 待复核队列（tools/review_queue.mjs，11-11）：只挑「球在复核」的 PR，且不含自己写的。用 collab_board 的 classify 造数据，和看板同一套判断。
import { classify } from '../../tools/collab_board.mjs'; import { queue } from '../../tools/review_queue.mjs';
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 300) : '')) };
const NOW = Date.parse('2026-11-12T00:00:00Z'), mk = (number, o = {}) => { const p = { number, title: 't' + number, branch: 'b' + number, author: 'MDD1102', draft: false, sha: 'abcdef' + number + '0000', mergeable: 'clean', behind: 0, updated: '2026-11-11T00:00:00Z', level: 'review', ci: { tests: 'ok', fast: 'ok' }, review: 'none', labels: [], ...o }; return { p, c: classify(p, NOW) } };
const nums = rows => queue(rows, 'SMG562').map(x => x.number);
T('需要复核 + CI 全绿 + 还没复核 → 进队列', JSON.stringify(nums([mk(1)])) === '[1]');
T('自己写的不复核（作者 = 当前账号）', nums([mk(2, { author: 'SMG562' })]).length === 0);
T('草稿不进队列', nums([mk(3, { draft: true })]).length === 0);
T('CI 在跑 / 红 → 不进（球不在复核）', nums([mk(4, { ci: { tests: 'pending', fast: 'ok' } }), mk(5, { ci: { tests: 'failure', fast: 'ok' } })]).length === 0);
T('已通过 / 要改 → 不进', nums([mk(6, { review: 'pass' }), mk(7, { review: 'fix' })]).length === 0);
T('改动后需要重新复核（rereview）→ 进队列', JSON.stringify(nums([mk(8, { review: 'rereview' })])) === '[8]');
T('不需要复核的级别（self）/ 红线（owner）→ 不进', nums([mk(9, { level: 'self' }), mk(10, { level: 'owner' })]).length === 0);
const q = queue([mk(12, { updated: '2026-11-12T00:00:00Z' }), mk(11, { updated: '2026-11-09T00:00:00Z' })], 'SMG562');
T('闲置久的排前面；带提交号前 7 位和分支', q[0].number === 11 && q[0].sha.length === 7 && q[0].branch === 'b11', q);
console.log(`review_queue: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
