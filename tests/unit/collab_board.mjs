// 协作看板（tools/collab_board.mjs，11-11）：「球在谁手里」的判定、复核留言解析、提醒去重和标签。纯函数，不碰网络。
import { stuckKey, stuckText, STUCK_MIN, flapOf, flapText, classify, reviewState, pingKey, pingText, idleText, already, labelsFor, ownerKey, render, isoWeek, BALL } from '../../tools/collab_board.mjs';
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 400) : '')) };
const NOW = Date.parse('2026-11-11T10:00:00Z'), SHA = 'abcdef1234567890';
const base = (o = {}) => ({ number: 7, title: 't', author: 'MDD1102', draft: false, sha: SHA, mergeable: 'clean', behind: 0, updated: '2026-11-11T09:00:00Z', level: 'self', ci: { tests: 'ok', fast: 'ok' }, review: 'none', ...o });
const ball = o => classify(base(o), NOW).ball;

// ① 判定：每一类都有正例，顺序有反例
T('草稿：球在作者、不提醒', (c => c.ball === 'author' && !c.ping)(classify(base({ draft: true }), NOW)));
T('有冲突：作者', ball({ mergeable: 'dirty' }) === 'author');
T('CI 红：作者（点名哪一个）', (c => c.ball === 'author' && /浏览器测试/.test(c.reason))(classify(base({ ci: { tests: 'failure', fast: 'ok' } }), NOW)));
T('CI 在跑：等CI、不提醒任何人', (c => c.ball === 'ci' && !c.ping)(classify(base({ ci: { tests: 'pending', fast: 'ok' } }), NOW)));
T('CI 红优先于「在跑」：一个红一个在跑 = 先修红的', ball({ ci: { tests: 'failure', fast: 'pending' } }) === 'author');
T('只有一个 CI 没跑（转 Ready 没触发）：作者', ball({ ci: { tests: 'none', fast: 'ok' } }) === 'author');
T('两个 CI 都没跑（只改文档）：不算问题，可合并', ball({ ci: { tests: 'none', fast: 'none' } }) === 'merge');
T('需复核、还没复核：球在复核', ball({ level: 'review' }) === 'review');
T('复核要改：作者；改过之后要重新复核：复核', ball({ level: 'review', review: 'fix' }) === 'author' && ball({ level: 'review', review: 'rereview' }) === 'review');
T('复核已通过：可合并', ball({ level: 'review', review: 'pass' }) === 'merge');
T('红线：球在所有者，且不给作者发提醒', (c => c.ball === 'owner' && !c.ping)(classify(base({ level: 'owner' }), NOW)));
T('落后 main 不再推给作者（11-11 放宽）：照常可合并 / 红线归所有者，下一步提到 pr_merge 自动判断', ball({ behind: 3 }) === 'merge' && ball({ behind: 3, level: 'owner' }) === 'owner' && /sync_main/.test(classify(base({ behind: 3 })).next));
T('什么都满足：可合并，带命令', (c => c.ball === 'merge' && c.ping && c.next.includes('pr_merge.sh 7'))(classify(base(), NOW)));
T('闲置天数', classify(base({ updated: '2026-11-07T10:00:00Z' }), NOW).idle === 4);

// ② 复核留言解析：和 pr_merge.sh 认的字符串一致；机器人的话不算
const c = (body, bot = false) => ({ body, bot });
T('「独立复核：通过 <本提交>」→ pass', reviewState([c('独立复核：通过 abcdef1')], SHA) === 'pass');
T('通过的是旧提交 → 不算（要重新复核）', reviewState([c('独立复核：通过 1111111')], SHA) === 'none');
T('「独立复核（<本提交>，…）：**要改」→ fix', reviewState([c('独立复核（abcdef1，另开的只读会话）：**要改，1 条阻断**')], SHA) === 'fix');
T('要改的是旧提交、之后推过新提交 → rereview', reviewState([c('独立复核（1111111，x）：**要改')], SHA) === 'rereview');
T('机器人的评论不算复核（即使写了通过）', reviewState([c('独立复核：通过 abcdef1', true)], SHA) === 'none');
T('没有留言 → none', reviewState([], SHA) === 'none');
// 11-12（#197）：只多合并了 main → 旧「通过」沿用，看板和 pr_merge.sh 同口径（判据都是 tools/review_carry.mjs）
const yes = () => true, only = o => x => x === o;
T('旧提交通过 + 能沿用 → pass（不再喊「需要独立复核」）', reviewState([c('独立复核：通过 1111111')], SHA, only('1111111')) === 'pass');
T('旧提交通过 + 不能沿用（文件变了）→ none', reviewState([c('独立复核：通过 1111111')], SHA, () => false) === 'none');
T('当前提交「要改」优先于沿用旧的通过', reviewState([c('独立复核：通过 1111111'), c('独立复核（abcdef1，x）：要改')], SHA, yes) === 'fix');
T('机器人的「通过」即使能沿用也不算', reviewState([c('独立复核：通过 1111111', true)], SHA, yes) === 'none');
T('沿用判断只问留言里出现过的提交', (() => { const asked = []; reviewState([c('独立复核：通过 1111111')], SHA, o => (asked.push(o), false)); return asked.join() === '1111111' })());

// ③ 提醒：去重键、不会冒充复核、不会泄漏
const cl = classify(base(), NOW), P = base();
T('提醒里没有 pr_merge 认的「独立复核：通过 <7 位提交号>」（机器人不能替人复核）', ![pingText(P, classify(base({ level: 'review' }), NOW)), pingText(P, cl), idleText(P, cl, NOW)].some(s => /独立复核：通过\s*[0-9a-f]{7}/.test(s)));
T('去重键：同 球+原因+提交 相同；换提交 / 换原因就不同', pingKey(P, cl) === pingKey(P, cl) && pingKey(P, cl) !== pingKey({ ...P, sha: '9999999aaaa' }, cl) && pingKey(P, cl) !== pingKey(P, { ...cl, reason: '别的' }));
T('already：评论里有键才算发过', already([c(pingText(P, cl))], pingKey(P, cl)) && !already([c('随便')], pingKey(P, cl)));
T('提醒 @ 作者并写明下一步', /^<!-- nbq-ball/.test(pingText(P, cl)) && pingText(P, cl).includes('@MDD1102') && pingText(P, cl).includes('下一步'));
T('isoWeek 同一周相同、跨周不同', isoWeek('2026-11-09T01:00:00Z') === isoWeek('2026-11-15T20:00:00Z') && isoWeek('2026-11-09T01:00:00Z') !== isoWeek('2026-11-16T01:00:00Z'));

// ④ 标签：只换球标签，别的标签原样保留，且不重复
const L = labelsFor(['协作体系', BALL.ci, '要你定'], 'merge');
T('标签：去掉旧的球标签、保留其它、加上新的', L.includes('协作体系') && L.includes('要你定') && L.includes(BALL.merge) && !L.includes(BALL.ci) && L.length === 3, L);
T('标签：已经是这个球 → 不变（不会重复添加）', labelsFor([BALL.merge, 'x'], 'merge').filter(l => l === BALL.merge).length === 1);

// ⑤ 看板与所有者提醒
const rows = [{ p: base({ number: 95, level: 'owner' }), c: classify(base({ number: 95, level: 'owner' }), NOW) }, { p: base({ number: 12, level: 'owner' }), c: classify(base({ number: 12, level: 'owner' }), NOW) }, { p: base({ number: 5, draft: true }), c: classify(base({ number: 5, draft: true }), NOW) }];
T('所有者集合键：按编号排序、只算红线', ownerKey(rows) === '12,95');
const md = render(rows, NOW);
T('看板：分组标题、在制品计数、草稿单列', /球在所有者（2）/.test(md) && /在制品\*\*（每人 ≤ 2）：.* 2 \/ 2/.test(md) && /草稿（1）/.test(md), md.slice(0, 300));
T('看板：超限时提示', /超限/.test(render([...rows, { p: base({ number: 9 }), c: classify(base({ number: 9 }), NOW) }], NOW)));
T('看板：在制品按作者分别计数（两人各 2 个都不超限）', (() => { const mk = (n, a) => { const p = base({ number: n, author: a }); return { p, c: classify(p, NOW) } }; const m2 = render([mk(1, 'A'), mk(2, 'A'), mk(3, 'B'), mk(4, 'B')], NOW); return /A 2 \/ 2/.test(m2) && /B 2 \/ 2/.test(m2) && !/超限/.test(m2) })());
T('看板：只有该作者超限才提示', (() => { const mk = (n, a) => { const p = base({ number: n, author: a }); return { p, c: classify(p, NOW) } }; const m3 = render([mk(1, 'A'), mk(2, 'A'), mk(3, 'A'), mk(4, 'B')], NOW); return /A 3 \/ 2 ⚠ 超限/.test(m3) && !/B 1 \/ 2 ⚠/.test(m3) })());
T('看板：没有 PR 也不崩', /没有开着的 PR/.test(render([], NOW)));
// ⑥ 状态抖动（#185：22 秒内 Ready → 草稿）
const ev = (event, at, actor = 'MDD1102') => ({ event, actor, at }), N2 = Date.parse('2026-11-11T12:45:00Z');
const f1 = flapOf([ev('ready_for_review', '2026-11-11T12:39:20Z'), ev('convert_to_draft', '2026-11-11T12:39:42Z')], N2);
T('抖动：10 分钟内两次改状态 → 报警，key 按最后一次时间', f1 && f1.n === 2 && f1.key === 'nbq-flap:2026-11-11T12:39:42Z', f1);
T('抖动：只改了一次 → 不报；两次但隔了很久 → 不报', !flapOf([ev('ready_for_review', '2026-11-11T12:39:20Z')], N2) && !flapOf([ev('ready_for_review', '2026-11-11T09:00:00Z'), ev('convert_to_draft', '2026-11-11T12:39:42Z')], N2));
T('抖动：别的事件（评论、标签）不算', !flapOf([ev('labeled', '2026-11-11T12:39:20Z'), ev('commented', '2026-11-11T12:39:42Z')], N2));
T('抖动提醒：点名分支、脚本和账号，且带去重标记', (x => /pr_state\.sh 185/.test(x) && /feature\/x/.test(x) && x.includes('<!-- nbq-flap:') && /MDD1102/.test(x))(flapText({ number: 185, branch: 'feature/x', draft: true }, f1)));
// ⑥ CI 卡在排队（11-12）：非草稿 → 球在作者并给出「推空提交」；提醒带去重标记、点名作者和提交号、草稿也能发
const cs = classify(base({ ci: { tests: 'stuck', fast: 'ok' } }), NOW);
T('CI 卡排队：球在作者、reason 点名 30 分钟、next 是推空提交', cs.ball === 'author' && cs.reason.includes(String(STUCK_MIN)) && cs.next.includes('--allow-empty') && cs.ping, cs);
T('CI 卡排队优先于「在跑」（一个卡一个在跑 = 先处理卡住的）', classify(base({ ci: { tests: 'stuck', fast: 'pending' } }), NOW).ball === 'author');
T('CI 红仍优先于卡住（先修红的）', /CI 红/.test(classify(base({ ci: { tests: 'stuck', fast: 'failure' } }), NOW).reason));
T('卡住提醒：带去重标记 / 作者 / 提交号 / 草稿说明', (m => m.includes(`<!-- ${stuckKey(base())} -->`) && m.includes('@MDD1102') && m.includes('abcdef1') && m.includes('草稿 PR'))(stuckText(base({ draft: true }))));
console.log(`collab_board: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
