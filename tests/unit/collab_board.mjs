import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { execFileSync } from 'node:child_process'; import { cleanGitEnv } from '../lib/git_env.mjs';
// 协作看板（tools/collab_board.mjs，11-11）：「球在谁手里」的判定、复核留言解析、提醒去重和标签。纯函数，不碰网络。
import { runState, coOwns, mainNotices, mainKey, MAIN_WINDOW_H, SYNC_LOOP, syncsOf, syncText, stuckKey, stuckText, STUCK_MIN, flapOf, flapText, classify, dbFacts, runMergeDrift, dbFiles, ownerActPost, ownerActKey, OWNER_REMIND_H, OWNER_REMIND_MAX, OWNER, reviewState, pingKey, pingText, idleText, already, labelsFor, ownerKey, render, isoWeek, BALL, depsOf, depKey, depText, depNotices } from '../../tools/collab_board.mjs';
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
T('数「合并 main」提交：也认 sync_main.sh 的中文信息（#266）', syncsOf([mc('合并 origin/main，为快进合并做准备'), mc('合并 origin/main（进度记录），为快进合并做准备'), mc('合并 origin/main：解决与 #89 的冲突'), mc('合并 origin/main-old'), mc('合并 feature 分支'), mc('合并 origin/main，为快进合并做准备', 1)]) === 3);
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

// #248：同一秒一个草稿 skipped + 一个正常在跑 → 在跑，不是「没跑完」
{ const at = '2026-11-13T02:02:16Z', run = (o) => ({ path: '.github/workflows/tests.yml', created_at: at, status: 'completed', conclusion: 'success', ...o }), now = Date.parse(at) + 6e4;
  T('runState：同一秒 skipped + in_progress（两种顺序）都算 pending', runState([run({ conclusion: 'skipped' }), run({ status: 'in_progress', conclusion: null })], 'tests', now) === 'pending' && runState([run({ status: 'in_progress', conclusion: null }), run({ conclusion: 'skipped' })], 'tests', now) === 'pending');
  T('runState：较新的 skipped 不盖过较早的 success；全是 skipped / 没有运行才算 none', runState([run({}), run({ conclusion: 'skipped', created_at: '2026-11-13T02:05:00Z' })], 'tests', now) === 'ok' && runState([run({ conclusion: 'skipped' })], 'tests', now) === 'none' && runState([], 'tests', now) === 'none');
  T('runState：失败 / 只看对应工作流文件', runState([run({ conclusion: 'failure' }), run({ path: '.github/workflows/tests-fast.yml' })], 'tests', now) === 'failure' && runState([run({ path: '.github/workflows/tests-fast.yml' })], 'tests', now) === 'none'); }

// 11-16（#310）：含数据库改动 → 等所有者先在正式库跑迁移。判断来自 db-parity 的事实（和 pr_merge.sh 同一份），不靠留言约定
const dbp = (parity, o = {}) => base({ db: { changed: true, files: ['server/migrations/20261118_x.sql', 'schema.sql'], parity }, ...o });
T('db 文件：只认 schema.sql 和 server/migrations/，生成文件 _bundle.sql 和别的文件不算', JSON.stringify(dbFiles(['schema.sql', 'server/migrations/20261118_x.sql', 'server/migrations/_bundle.sql', 'src/pwa/script/0265.js', 'tests/schema/tests.sql'])) === JSON.stringify(['schema.sql', 'server/migrations/20261118_x.sql']));
T('含迁移、db-parity 还没通过：球在所有者（不是「可合并」），带 ownerAct、写明文件和 db-parity，不给作者发提醒', (c => c.ball === 'owner' && c.ownerAct === 'migrate' && !c.ping && /迁移/.test(c.reason) && /server\/migrations\/20261118_x\.sql/.test(c.next) && /db-parity/.test(c.next))(classify(dbp(false), NOW)));
T('共同所有者的红线 PR 含迁移：不再说「你可自行合并」，而是等所有者跑迁移', (c => c.ball === 'owner' && c.ownerAct === 'migrate')(classify(dbp(false, { level: 'owner', coOwner: true }), NOW)));
T('db-parity 已通过：回到原来的判断（可合并）；共同所有者红线 PR 也回到「可自行合并」', ball(dbp(true)) === 'merge' && ball(dbp(true, { level: 'owner', coOwner: true })) === 'merge');
T('db-parity 取不到（parity 为 null）：不替所有者认定在等，按原判断', ball(dbp(null)) === 'merge' && !classify(dbp(null), NOW).ownerAct);
T('没改库结构：和以前完全一样', ball(base({ db: { changed: false, files: [], parity: null } })) === 'merge' && ball(base()) === 'merge');
T('优先级：草稿 / 有冲突 / CI 红 / CI 在跑 / 要复核，都先于「等所有者跑迁移」', ball(dbp(false, { draft: true })) === 'author' && ball(dbp(false, { mergeable: 'dirty' })) === 'author' && ball(dbp(false, { ci: { tests: 'failure', fast: 'ok' } })) === 'author' && ball(dbp(false, { ci: { tests: 'pending', fast: 'ok' } })) === 'ci' && ball(dbp(false, { level: 'review' })) === 'review');
// 提醒：首次直接 @ 所有者；24 小时没做每天再提醒，最多 3 次；按「这批库结构文件」去重
const HR = 36e5, oc = (p) => classify(p, NOW), DP = dbp(false), DC = oc(DP);
const post1 = ownerActPost(DP, DC, [], NOW);
T('首次提醒：@所有者、写明动作（文件、正式库、db-parity）、告诉作者先别合前端，并带去重标记', post1 && post1.body.includes('@' + OWNER) && /server\/migrations\/20261118_x\.sql/.test(post1.body) && /nanbanqiu-au/.test(post1.body) && /db-parity/.test(post1.body) && /先别合前端/.test(post1.body) && post1.body.includes(`<!-- ${ownerActKey(DP, DC)} -->`));
const cm = (body, hoursAgo) => ({ body, at: new Date(NOW - hoursAgo * HR).toISOString() });
T('已提醒过、不到 24 小时：不重复（作者推别的提交也不重复）', ownerActPost(DP, DC, [cm(post1.body, 3)], NOW) === null && ownerActPost({ ...DP, sha: 'fedcba9876543210' }, DC, [cm(post1.body, 3)], NOW) === null);
const r1 = ownerActPost(DP, DC, [cm(post1.body, OWNER_REMIND_H + 1)], NOW);
T('超过 24 小时还没做：再提醒一次，写明已等多久，key 带次数', r1 && /提醒（第 1 次）/.test(r1.body) && /已等 25 小时/.test(r1.body) && r1.key.endsWith(':r1'), r1 && r1.body);
const mk = (n, ago) => cm(`<!-- ${ownerActKey(DP, DC)}${n ? ':r' + n : ''} -->`, ago);
const r3 = ownerActPost(DP, DC, [mk(0, 80), mk(1, 56), mk(2, 30)], NOW);
T('提醒有上限：首次 + 最多 ' + OWNER_REMIND_MAX + ' 次复提醒；第 3 次复提醒还会发', r3 && r3.key.endsWith(':r3') && /提醒（第 3 次）/.test(r3.body), r3 && r3.key);
T('到了上限（首次 + 3 次复提醒）就不再发，哪怕又过了 24 小时，不刷屏', ownerActPost(DP, DC, [mk(0, 120), mk(1, 96), mk(2, 72), mk(3, 48)], NOW) === null);
T('库结构文件变了：算新的一件事，重新首次提醒', (q => q && !/提醒（第/.test(q.body))(ownerActPost({ ...DP, db: { ...DP.db, files: ['server/migrations/20261119_y.sql'] } }, DC, [cm(post1.body, 3)], NOW)));
T('不需要提醒的：没有 ownerAct / 草稿 / 机器人作者', ownerActPost(base(), oc(base()), [], NOW) === null && ownerActPost(dbp(false, { draft: true }), DC, [], NOW) === null && ownerActPost(dbp(false, { author: 'dependabot[bot]' }), DC, [], NOW) === null);
T('作者就是所有者也要提醒（所有者自己的 PR 含迁移也别忘了跑）', (q => q && q.body.includes('@' + OWNER))(ownerActPost(dbp(false, { author: OWNER }), DC, [], NOW)));

// 11-16 线上故障复现：协作看板 job 是稀疏检出，工作区里没有 tools/merge_drift.sh；第一版直接 bash 它 → 退出码 127 → 被当成「不确定」悄悄放过，功能整个失效。
//   现在从 origin/main 取脚本内容运行（bash -c，$0 仍是 tools/merge_drift.sh），所以工作区里没有也能跑；「不确定」带原因。
{ const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nbq-board-')), envBak = process.env, here = process.cwd();
  process.env = cleanGitEnv(envBak);   // 在临时目录跑 git：去掉 GIT_DIR 等（钩子里会指到真仓库，tests/unit/git_env 查这条）
  const g = (...a) => execFileSync('git', a, { cwd: dir, stdio: 'ignore', env: process.env });
  fs.mkdirSync(path.join(dir, 'tools'));
  fs.writeFileSync(path.join(dir, 'tools/merge_drift.sh'), '#!/usr/bin/env bash\nset -u\ncd "$(dirname "$0")/.."\n[ "${1:-}" = --db-parity ] || exit 2\ntouch .ran-in-root\n[ "${2:-}" = good ] && exit 0\n[ "${2:-}" = boom ] && exit 7\nexit 1\n');
  g('init', '-q'); g('-c', 'user.name=t', '-c', 'user.email=t@t', 'add', '-A'); g('-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '-m', 'x'); g('update-ref', 'refs/remotes/origin/main', 'HEAD');
  fs.rmSync(path.join(dir, 'tools'), { recursive: true });   // 工作区里没有这个脚本（稀疏检出）
  process.chdir(dir);
  try {
    const good = runMergeDrift('good'), bad = runMergeDrift('bad'), boom = runMergeDrift('boom');
    T('稀疏检出（工作区没有脚本、origin/main 有）：能跑出结论——0 = 算数、1 = 不算数', good.status === 0 && bad.status === 1, [good, bad]);
    T('脚本里的 cd 回到的是仓库根（$0 仍是 tools/merge_drift.sh），不是上一级', fs.existsSync(path.join(dir, '.ran-in-root')));
    T('脚本退出码既不是 0 也不是 1：不确定，带原因（不当成「不算数」）', boom.status === null && /退出码 7/.test(boom.why), boom);
    g('update-ref', '-d', 'refs/remotes/origin/main');
    const gone = runMergeDrift('good'); T('origin/main 上取不到脚本：不确定，原因写明取不到', gone.status === null && /取不到 origin\/main:tools\/merge_drift\.sh/.test(gone.why), gone);
  } finally { process.chdir(here); process.env = envBak; fs.rmSync(dir, { recursive: true, force: true }) } }
const okF = ['schema.sql', 'server/migrations/20261118_x.sql'], mk2 = (fetch, run, files = okF) => dbFacts(1, SHA, files, { fetch, run });
T('dbFacts：没改库结构文件 → 不调脚本、不算改了', (r => r.changed === false && r.parity === null)(mk2(() => { throw new Error('不该取') }, () => { throw new Error('不该跑') }, ['src/a.js'])));
T('dbFacts：取不到 PR 提交 → 不确定，带原因', (r => r.changed && r.parity === null && /git fetch 失败/.test(r.why))(mk2(() => false, () => ({ status: 0 }))));
T('dbFacts：脚本结论 0 / 1 / 其他 → true / false / null（其他带原因）', mk2(() => true, () => ({ status: 0 })).parity === true && mk2(() => true, () => ({ status: 1 })).parity === false && (r => r.parity === null && r.why === '坏了')(mk2(() => true, () => ({ status: null, why: '坏了' }))));
// 11-18（#363）：依赖链通知。#358 写「依赖 PR：#357（本分支含其提交…）」，#357 合并后要自动叫 #358 的作者往下走
T('depsOf：取「依赖 PR：」那一行的 #号（真实 #358 写法）', JSON.stringify(depsOf('## 范围与回退\n- 依赖 PR：#357（本分支含其提交，所以 base 暂指向 #357 分支；#357 合并后改基到 main）\n- 其他：#999')) === '[357]');
T('depsOf：「依赖 PR：无」/ 没写 / 空 → 没有依赖；多个去重', depsOf('- 依赖 PR：无').length === 0 && depsOf('没有这一行').length === 0 && depsOf(null).length === 0 && JSON.stringify(depsOf('依赖 PR: #1、#2、#1')) === '[1,2]');
{ const pr = (o = {}) => ({ number: 358, author: 'MDD1102', deps: [357], comments: [], ...o });
  const hit = depNotices([pr()], new Set([357]));
  T('依赖已合并 → 在这个 PR 上 @ 作者一次，写明 sync_main / Files changed / ready 三步', hit.length === 1 && hit[0].number === 358 && /@MDD1102 #357 已合并/.test(hit[0].body) && /sync_main\.sh/.test(hit[0].body) && /pr_state\.sh 358 ready/.test(hit[0].body) && hit[0].body.includes(`<!-- ${depKey(357)} -->`), hit);
  T('依赖还没合并 → 不发', depNotices([pr()], new Set()).length === 0);
  T('已经发过（标记在评论里）→ 不重复发', depNotices([pr({ comments: [{ body: depText(pr(), 357) }] })], new Set([357])).length === 0);
  T('草稿也发（草稿正是在等依赖的那个）；所有者自己的 PR、机器人的 PR 不发', depNotices([pr({ draft: true })], new Set([357])).length === 1 && depNotices([pr({ author: OWNER }), pr({ author: 'dependabot[bot]' })], new Set([357])).length === 0);
  T('依赖写成自己（写错号）→ 不发', depNotices([pr({ deps: [358] })], new Set([358])).length === 0); }
// #471（11-20）：大合并提交的详情 JSON > 1MB 会让 execFileSync 抛 ENOBUFS，整个看板失败 6 次。gh 辅助函数必须放宽 maxBuffer，且单个提交取不到时不能拖垮整次运行
{ const src = fs.readFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), '../../tools/collab_board.mjs'), 'utf8');
  const ghLine = src.split('\n').find(l => l.startsWith('const gh = '));
  T('gh 辅助函数放宽了 maxBuffer（默认 1MB 会 ENOBUFS，#471）', /maxBuffer:\s*\d+\s*\*\s*1024\s*\*\s*1024/.test(ghLine || '') && Number((/maxBuffer:\s*(\d+)/.exec(ghLine) || [])[1]) >= 64);
  T('取 main 提交详情的循环里 try/catch：单个提交失败只告警（#471）', /let d = \{\}; try \{ d = JSON\.parse\(gh\(`repos\/\$\{R\}\/commits\/\$\{c\.sha\}`\)\) \} catch/.test(src));
  const emit = ['-e', "process.stdout.write('x'.repeat(2 * 1024 * 1024))"];
  let enobufs = false; try { execFileSync(process.execPath, emit, { encoding: 'utf8' }) } catch (e) { enobufs = e.code === 'ENOBUFS' }
  T('复现前提：默认 maxBuffer 下 2MB 输出确实 ENOBUFS；放宽后可读', enobufs && execFileSync(process.execPath, emit, { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 }).length === 2 * 1024 * 1024); }
console.log(`collab_board: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
