// 返工复核只看差异（tools/review_rework.mjs）：取最近一条非机器人的「要改」、解析编号意见；任何不确定都退回整审。
import { items, lastFix, plan } from '../../tools/review_rework.mjs';
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 300) : '')) };
const FIX = '独立复核（e76b202）：要改\n\n@A 请改：\n1. 不是编号\nR1. 红线清单不准\n- **R2**：水位线没定义\n  R3) 前缀无依据\n\n看了：x';
const c = (body, bot = false) => ({ body, bot });
T('解析 R1/R2/R3（句点、加粗、右括号都认；普通 1. 不算）', JSON.stringify(items(FIX).map(x => x.id)) === '["R1","R2","R3"]', items(FIX));
T('取最近一条「要改」的提交号', lastFix([c('独立复核（1111111）：要改\nR1. a'), c(FIX)]).sha === 'e76b202');
T('机器人留言不算', lastFix([c(FIX, true)]) === null);
T('带开头 HTML 注释标记的第一行照认', lastFix([c('<!-- nbq-review -->\n' + FIX)])?.sha === 'e76b202');
T('引用 / 正文中间 / 代码块里的「要改」不算（#201 同口径）', lastFix([c('> ' + FIX), c('结论如下\n' + FIX), c('```\n' + FIX + '\n```')]) === null);
T('「通过」留言不算要改', lastFix([c('独立复核：通过 abcdef1')]) === null);
T('没有要改留言 → full', plan([], 'abcdef1', () => []).mode === 'full');
T('旧提交取不到 / 不是祖先（changedSince 给 null）→ full 且带上旧提交号', (p => p.mode === 'full' && p.reviewed === 'e76b202')(plan([c(FIX)], 'abcdef1', () => null)));
const p = plan([c(FIX)], 'abcdef1', (o, h) => o === 'e76b202' && h === 'abcdef1' ? ['docs/a.md'] : null);
T('有要改且旧提交是祖先 → rework：意见清单 + 改动文件', p.mode === 'rework' && p.items.length === 3 && p.changed[0] === 'docs/a.md', p);
T('旧提交 = 头提交（没推新东西）→ rework 且改动为空，不凭空放行', plan([c(FIX)], 'e76b202', () => []).changed.length === 0);
console.log(`review_rework: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
