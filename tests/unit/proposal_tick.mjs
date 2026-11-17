// 提案「24 小时无异议自动生效」（tools/proposal_tick.mjs，11-11）：倒计时、异议、所有者同意、硬红线不自动生效、重新计时。纯函数，不碰网络。
import { decide, textOf, planOf, swap, marker, LBL, HARD, SILENCE_H } from '../../tools/proposal_tick.mjs';
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
console.log(`proposal_tick: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
