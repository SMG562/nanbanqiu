// 提案「24 小时无异议自动生效」（tools/proposal_tick.mjs，11-11）：倒计时、异议、所有者同意、硬红线不自动生效、重新计时。纯函数，不碰网络。
import { decide, textOf, planOf, swap, marker, LBL, HARD, SILENCE_H, SCHED, schedBlock, schedRows, schedHash, lastSchedHash, schedDrift, schedText, schedMark } from '../../tools/proposal_tick.mjs';
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 400) : '')) };
const H = 3600e3, T0 = Date.parse('2026-11-11T00:00:00Z'), at = h => new Date(T0 + h * H).toISOString();
const issue = (o = {}) => ({ number: 9, title: '提案：每周自动清理分支', body: '### 默认方案\n\n每周一自动删已合并分支\n\n### 一句理由\n省事', author: 'MDD1102', created: at(0), ...o });
const c = (author, body, h, bot = false) => ({ author, body, bot, at: at(h) });
const d = (o = {}) => decide({ issue: issue(o.issue), comments: o.comments || [], labeledAt: o.labeledAt, now: T0 + (o.h ?? 0) * H });

T('倒计时中：wait，写明还剩几小时', (r => r.action === 'wait' && /23/.test(r.why))(d({ h: 1 })));
T('刚好 24 小时无异议：生效（静默）', (r => r.action === 'effect' && r.by === 'silence')(d({ h: 24 })));
T('23.9 小时：还不生效', d({ h: 23.9 }).action === 'wait');
T('静默期内有人反对：objected（不管多晚）', d({ h: 30, comments: [c('SMG562', '反对：先别做', 5)] }).action === 'objected');
T('「不做」「暂缓」「先别」都算异议', ['不做，理由…', '暂缓', '先别动', '否决', '不同意'].every(t => d({ comments: [c('x', t, 3)], h: 30 }).action === 'objected'));
T('评论里中间出现「不做」不算异议（只认开头）', d({ comments: [c('x', '我觉得这个方案不做也行但是…', 3)], h: 30 }).action === 'effect');
T('所有者回复「同意」：立即生效', (r => r.action === 'effect' && r.by === 'owner')(d({ h: 2, comments: [c('SMG562', '同意', 1)] })));
T('别人回复「同意」不算（只认所有者）', d({ h: 2, comments: [c('MDD1102', '同意', 1)] }).action === 'wait');
T('机器人的评论不算异议也不算同意', d({ h: 30, comments: [c('github-actions[bot]', '反对 同意', 3, true)] }).action === 'effect');
T('没有「默认方案」：malformed，倒计时不开始', d({ issue: { body: '随便写写' }, h: 100 }).action === 'malformed');
T('异议在重新打标签之前：不算（重新计时）', (r => r.action === 'wait')(d({ h: 30, labeledAt: at(29), comments: [c('x', '反对', 5)] })));
T('重新打标签后满 24 小时才生效', d({ h: 53, labeledAt: at(29) }).action === 'effect' && d({ h: 50, labeledAt: at(29) }).action === 'wait');

// 硬红线：永远不自动生效，除非所有者同意
for (const w of ['正式库迁移', '轮换密钥', '改隐私文案', '删除旧数据', 'force push', '部署流程', '费用上限', '改 CODEOWNERS']) T(`硬红线「${w}」：不自动生效`, d({ issue: { title: '提案：' + w }, h: 100 }).action === 'needs_owner');
T('硬红线 + 所有者同意：生效', d({ issue: { title: '提案：轮换密钥' }, h: 2, comments: [c('SMG562', '同意', 1)] }).action === 'effect');
T('硬红线 + 有异议：先转讨论', d({ issue: { title: '提案：轮换密钥' }, h: 2, comments: [c('x', '反对', 1)] }).action === 'objected');
T('HARD 不误伤普通提案', !HARD.test('提案：每周自动清理已合并分支 / 提案标签 / 看板'));

// 文本与标签
T('生效评论带标记、引用默认方案、@ 作者', (t => t.startsWith(marker('effect')) && t.includes('每周一自动删已合并分支') && t.includes('@MDD1102'))(textOf(issue(), { action: 'effect', by: 'silence' })));
T('默认方案提取：只取「默认方案」下面的内容', planOf(issue().body) === '每周一自动删已合并分支', planOf(issue().body));
T('需所有者评论 @所有者 一次且说明只要一句话', /@SMG562/.test(textOf(issue(), { action: 'needs_owner', why: 'x' })));
T('标签：生效 = 去掉「提案」换成「已生效」，其它标签保留', (l => l.includes('协作体系') && l.includes(LBL.done) && !l.includes(LBL.open))(swap(['协作体系', LBL.open], LBL.done)));
T('标签：需所有者 = 保留「提案」（所有者同意后还能被扫到）', (l => l.includes(LBL.open) && l.includes(LBL.owner))(swap([LBL.open], LBL.owner)));
T('静默期是 24 小时', SILENCE_H === 24);

// 排期对齐（11-18）：#65 顶部「本周」块 / 「本周」标签变了 → 自动通知两边；对不上要点出来
const B65 = `## 本周（11-18 起）\n> 说明\n\n| 事项 | 负责人 | 这周做到什么算完 | Issue |\n|---|---|---|---|\n| 场边一期接真后端：PR-A → D | SMG562 侧会话 | 11-23 前合并 | #369 |\n| 我的球拍：#364 + 一期 | MDD1102 | PR1 + PR2 真机通过 | #60 #72 |\n| 上线外部事项 | SMG562 | #11 今天回信 | #11 #53 #64 |\n\n**上线倒计时（目标上线日 2026-11-25）**：11-23 冻结\n**上限**：本周标签同时 ≤ 3\n\n---\n\n# 一期上线前工程排期（总览）\n| 0.1 | 别的表 | 你 | x | #59 |`;
const LAB = [{ number: 369, assignees: ['SMG562'] }, { number: 60, assignees: ['MDD1102'] }, { number: 11, assignees: ['SMG562'] }];
const blk = schedBlock(B65);
T('排期块：取「## 本周」到第一条 --- 之前，不含后面的旧表', blk.startsWith('## 本周') && blk.includes('上线倒计时') && !blk.includes('一期上线前工程排期') && !blk.includes('别的表'), blk.slice(-60));
T('排期块：没有本周标题 = 空', schedBlock('# 别的') === '');
T('排期表：3 行，跳过表头与分隔行，4 列', (r => r.length === 3 && r.every(x => x.length === 4) && r[1][1] === 'MDD1102')(schedRows(blk)));
const h0 = schedHash(blk, LAB);
T('hash：同样内容稳定', h0 === schedHash(schedBlock(B65), [...LAB].reverse()) && /^[0-9a-f]{10}$/.test(h0), h0);
T('hash：负责人变了就变', h0 !== schedHash(blk.replace('| MDD1102 |', '| SMG562 |'), LAB));
T('hash：倒计时日期变了就变', h0 !== schedHash(blk.replace('2026-11-25', '2026-11-26'), LAB));
T('hash：本周标签集合变了就变（多一个 / 负责人变）', h0 !== schedHash(blk, [...LAB, { number: 5, assignees: ['x'] }]) && h0 !== schedHash(blk, [{ ...LAB[0], assignees: [] }, LAB[1], LAB[2]]));
T('hash：说明文字改了不算排期变化（不刷屏）', h0 === schedHash(blk.replace('> 说明', '> 另一句说明'), LAB));
T('上次通知：取 #216 里最近一条标记，没有 = 空', lastSchedHash(['x', `${schedMark('aaaaaaaaaa')} 旧`, '中间', `${schedMark('bbbbbbbbbb')} 新`, '尾']) === 'bbbbbbbbbb' && lastSchedHash(['x', 'y']) === '');
T('漂移：一致时没有警告（Issue 列只认第一个 # 号）', schedDrift(blk, LAB).length === 0, schedDrift(blk, LAB));
T('漂移：本周标签超过上限', schedDrift(blk, [...LAB, { number: 7, assignees: ['x'] }]).some(x => x.includes('超过上限')));
T('漂移：打了本周标签但没有负责人', schedDrift(blk, [{ ...LAB[0], assignees: [] }, LAB[1], LAB[2]]).some(x => x.includes('#369') && x.includes('没有负责人')));
T('漂移：表里有但没打标签 / 打了标签但表里没有', (w => w.some(x => x.includes('#60') && x.includes('没打')) && w.some(x => x.includes('#88') && x.includes('表里没有')))(schedDrift(blk, [LAB[0], LAB[2], { number: 88, assignees: ['x'] }])));
T('漂移：表里负责人列空', schedDrift(blk.replace('| MDD1102 |', '|  |'), LAB).some(x => x.includes('没有负责人')));
T('漂移：读不到表格', schedDrift('## 本周\n没有表', LAB)[0].includes('读不到'));
const tx = schedText(blk, ['x 对不上'], h0);
T('通知文本：带标记、@ 两个人、指向 #65、每件一行、看得见的行 ≤ 5', tx.startsWith(schedMark(h0)) && SCHED.people.every(x => tx.includes('@' + x)) && tx.includes('#65') && tx.includes('场边一期接真后端 → SMG562 侧会话（#369）') && tx.split('\n').slice(1).length <= 5, tx);
T('通知文本：无漂移时没有警告行', !schedText(blk, [], h0).includes('⚠'));
console.log(`proposal_tick: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
