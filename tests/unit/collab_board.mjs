// 协作看板（tools/collab_board.mjs，11-11）：「球在谁手里」的判定、复核留言解析、提醒去重和标签。纯函数，不碰网络。
import { coOwns, mainNotices, mainKey, MAIN_WINDOW_H, SYNC_LOOP, syncsOf, syncText, stuckKey, stuckText, STUCK_MIN, flapOf, flapText, classify, reviewState, pingKey, pingText, idleText, already, labelsFor, ownerKey, render, isoWeek, BALL } from '../../tools/collab_board.mjs';
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

// 11-13（#233 活锁）：合并 main ≥ 2 次且 CI 绿 → 提示别再同步
const mc = (m, n = 2) => ({ parents: Array(n).fill({}), message: m });
T('数「合并 main」提交：只算两个父提交且信息是合并 main 的', syncsOf([mc("Merge branch 'main' into x"), mc("Merge remote-tracking branch 'origin/main' into x"), mc("Merge branch 'feature' into x"), mc("fix: 普通提交", 1), mc("Merge branch 'main'", 1)]) === 2);
T('同步 ≥ SYNC_LOOP 且红线：原因里写明别再同步', /别再同步/.test(classify(base({ level: 'owner', syncs: SYNC_LOOP }), NOW).reason) && !/别再同步/.test(classify(base({ level: 'owner', syncs: SYNC_LOOP - 1 }), NOW).reason));
T('同步 ≥ SYNC_LOOP 且可合并：原因里带【可合 <7位>】', classify(base({ syncs: SYNC_LOOP }), NOW).reason.includes('【可合 abcdef1】'));
T('同步提醒：每 PR 一个去重键，不含「独立复核：通过」', (s => already([{ body: s }], 'nbq-syncloop:7') && !/独立复核：通过\s*[0-9a-f]{7}/.test(s))(syncText(base(), 2)));

// 11-13（#241 同类第二次）：共同所有者自己的红线 PR → 球不在所有者，自己合
T('红线 + 作者是共同所有者：可合并，写明不用等 Approve，且给作者发提醒', (c => c.ball === 'merge' && c.ping && /共同所有者/.test(c.reason) && /pr_merge\.sh 7/.test(c.next))(classify(base({ level: 'owner', coOwner: true }), NOW)));
T('红线 + 作者不是共同所有者：仍是所有者', classify(base({ level: 'owner', coOwner: false }), NOW).ball === 'owner');

const COT = '/schema.sql @SMG562 @MDD1102\n/server/migrations/ @SMG562 @MDD1102\n/tools/pr_merge.sh @SMG562\n/docs/adr/ @SMG562\n';
T('共同所有者：改的红线路径 CODEOWNERS 那一行都写了他 → 自己合', coOwns(['schema.sql', 'server/migrations/1.sql'], COT, 'MDD1102'));
T('共同所有者：红线里有只写 @SMG562 的路径（pr_merge.sh / ADR）→ 仍要所有者合（#250 的指正）', !coOwns(['schema.sql', 'tools/pr_merge.sh'], COT, 'MDD1102') && !coOwns(['docs/adr/0012.md'], COT, 'MDD1102'));
T('没有红线文件 → 不适用', !coOwns([], COT, 'MDD1102'));

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
T('看板：机器人账号（dependabot[bot]）不占在制品', (() => { const mk = (n, a) => { const p = base({ number: n, author: a }); return { p, c: classify(p, NOW) } }; const m4 = render([mk(1, 'dependabot[bot]'), mk(2, 'dependabot[bot]'), mk(3, 'dependabot[bot]'), mk(4, 'A')], NOW); return !/dependabot/.test(m4.split('\n').find(l => /在制品\*\*/.test(l))) && /A 1 \/ 2/.test(m4) })());
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
// ⑨ main 有新提交 → 告诉相关的开着的 PR（#189；所有者 11-13 同意时要求的三个用例在最前面）
{
  const pr = (n, files, o = {}) => ({ number: n, author: 'MDD1102', files, comments: [], ...o });
  const cm = (sha, files, o = {}) => ({ sha, parents: 1, message: o.message || '某次修改', files: files.map(f => typeof f === 'string' ? { filename: f, patch: '' } : f) });
  let r = mainNotices([pr(201, ['tools/a.mjs', 'src/x.js'])], [cm('aaaaaaa1', ['tools/a.mjs'])]);
  T('#189 同改文件 → 发一条，@作者，写明同改了哪个文件、下一步 sync_main', r.length === 1 && r[0].number === 201 && /@MDD1102/.test(r[0].body) && /同改 `tools\/a\.mjs`/.test(r[0].body) && /sync_main/.test(r[0].body), r);
  r = mainNotices([pr(201, ['tools/a.mjs'])], [cm('aaaaaaa1', ['docs/b.md'])]);
  T('#189 不同改、也没提到 → 不发', r.length === 0, r);
  const done = pr(201, ['tools/a.mjs'], { comments: [{ body: `<!-- ${mainKey('aaaaaaa1')} -->\n已提醒过` }] });
  r = mainNotices([done], [cm('aaaaaaa1', ['tools/a.mjs'])]);
  T('#189 同一个提交重复运行 → 不重复发（按评论里的提交号标记）', r.length === 0, r);
  r = mainNotices([pr(197, ['tools/role_guard.mjs'])], [cm('bbbbbbb2', [{ filename: '逃逸缺陷.md', patch: '@@\n+| 11-12 | 身份钩子在 #197 |\n-旧的一行 #197' }])]);
  T('提到：改动里新增行写了 #197 → 发「提到你」并摘那一行；删掉的行不算', r.length === 1 && /提到你：「\| 11-12 \| 身份钩子在 #197 \|」/.test(r[0].body), r);
  r = mainNotices([pr(97, [])], [cm('ccccccc3', ['x'], { message: '修 #197 和 #1970 的问题；见 a.md#97 和 issue&#97' })]);
  T('提到：#97 不误认 #197 / #1970、锚点 a.md#97、HTML 实体 &#97', r.length === 0, r);
  r = mainNotices([pr(97, [])], [cm('ccccccc3', ['x'], { message: '接着 #97 做' })]);
  T('提到：提交信息里 #97 → 发', r.length === 1 && /提到你：「接着 #97 做」/.test(r[0].body), r);
  r = mainNotices([pr(201, ['a', 'b'])], [cm('d1', ['a']), cm('d2', ['b']), cm('d3', ['z'])]);
  T('一次运行同一个 PR 只发一条，汇总相关提交（无关的不列），每个提交都留标记', r.length === 1 && /main 有 2 个新提交/.test(r[0].body) && r[0].body.includes(`<!-- ${mainKey('d1')} -->`) && r[0].body.includes(`<!-- ${mainKey('d2')} -->`) && !r[0].body.includes(mainKey('d3')), r);
  r = mainNotices([pr(201, ['a'], { author: 'dependabot[bot]' })], [cm('e1', ['a'])]);
  T('机器人的 PR 不发', r.length === 0, r);
  r = mainNotices([pr(201, ['schema.sql'])], [{ ...cm('m1', ['schema.sql'], { message: '合并 origin/main，为快进合并做准备' }), parents: 2 }]);
  T('跳过合并提交（「合并 origin/main」的改动文件是另一条线的全部改动，会误报同改；11-13 用真实仓库 --dry 试跑发现）', r.length === 0, r);
  r = mainNotices([pr(197, [])], [cm('n1', [{ filename: 'x.md', patch: '@@\n-旧的一行写着 #197\n+新的一行' }])]);
  T('提到：只有被删掉的行写了 #197 → 不算提到', r.length === 0, r);
  r = mainNotices([pr(201, ['f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7'])], [cm('g1', ['f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7'])]);
  T('同改很多文件：最多列 5 个，写「等 7 个文件」', r.length === 1 && /等 7 个文件/.test(r[0].body) && !/f6/.test(r[0].body), r);
  r = mainNotices([pr(201, ['a']), pr(202, ['b'])], [cm('h1', ['a', 'b'])]);
  T('一个提交同时和两个 PR 有关：各发一条', r.length === 2 && r.map(x => x.number).join() === '201,202', r);
  T('时间窗 ≥ 看板兜底周期（3 小时）的两倍，漏一轮也接得上', MAIN_WINDOW_H >= 6);
}

console.log(`collab_board: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
