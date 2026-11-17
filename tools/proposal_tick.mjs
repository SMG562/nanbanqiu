#!/usr/bin/env node
// 提案「24 小时无异议自动生效」（11-11，#167 第四节；所有者 11-11 授权）：带「提案」标签的 Issue，写了「默认方案」后开始倒计时，
//   期间没人反对 → 机器人评论「默认方案生效」并把标签换成「已生效」；有人反对 → 换成「有异议」转入讨论；所有者回复「同意」→ 立即生效。
//   硬红线类（正式库 / 密钥 / 隐私 / 删除强推 / 部署 / 费用）永远不自动生效：标「需所有者」，评论 @所有者 一次。
//   node tools/proposal_tick.mjs [--dry]     要 GH_TOKEN（或 GITHUB_TOKEN）；--dry 只打印将做的动作
// 安全：Issue / 评论正文只做正则匹配，不进 shell，不执行任何内容；机器人评论不算异议也不算同意；工作流只在默认分支的版本上跑、只检出本文件。
import { execFileSync } from 'node:child_process'; import { createHash } from 'node:crypto'; import path from 'node:path'; import fs from 'node:fs'; import { fileURLToPath } from 'node:url';
export const OWNER = 'SMG562', SILENCE_H = 24, H = 3600e3;
export const LBL = { open: '提案', done: '已生效', objected: '有异议', owner: '需所有者' };
export const HARD = /正式库|生产库|密钥|secret|隐私|删除|强推|force.?push|部署|费用|付款|CODEOWNERS|权限/i;   // 宁可多拦：误拦只是多等所有者一句话
const OBJECT = /^\s*(反对|不同意|否决|不做|先别|暂缓)/, AGREE = /^\s*(同意|批准|通过|采纳|按默认)/;

// issue = { number, title, body, author, created }；comments = [{ author, body, bot, at }]；labeledAt = 最近一次打上「提案」标签的时间
export function decide({ issue, comments, labeledAt, now }) {
  const start = Math.max(Date.parse(issue.created), Date.parse(labeledAt || issue.created)), after = comments.filter(c => !c.bot && Date.parse(c.at) >= start);
  if (!/默认方案/.test(issue.body || '')) return { action: 'malformed', why: '正文里没有「默认方案」' };
  const agree = after.some(c => c.author === OWNER && AGREE.test(c.body)), objection = after.find(c => OBJECT.test(c.body));
  if (objection) return { action: 'objected', why: `${objection.author} 提出异议` };
  if (agree) return { action: 'effect', why: '所有者同意', by: 'owner' };
  if (HARD.test(`${issue.title}\n${issue.body}`)) return { action: 'needs_owner', why: '涉及硬红线（正式库 / 密钥 / 隐私 / 删除 / 部署 / 费用 / 权限）' };
  const left = start + SILENCE_H * H - now;
  return left <= 0 ? { action: 'effect', why: `静默期 ${SILENCE_H} 小时无异议`, by: 'silence' } : { action: 'wait', why: `还剩 ${Math.ceil(left / H)} 小时`, left };
}
export const planOf = body => { const m = (body || '').match(/默认方案[^\n]*\n+([\s\S]*?)(?=\n#{1,6}\s|\n\*\*|$)/); return (m?.[1] || '').trim().split('\n').slice(0, 6).join('\n') };
export const marker = a => `<!-- nbq-proposal:${a} -->`;
export const textOf = (issue, d) => ({
  effect: `${marker('effect')}\n✅ **默认方案生效**（${d.by === 'owner' ? '所有者同意' : `${SILENCE_H} 小时静默期内无异议`}）。@${issue.author} 可以按它做了；做完在这里勾一下或关闭。\n\n> ${planOf(issue.body).replace(/\n/g, '\n> ')}`,
  objected: `${marker('objected')}\n⏸ **有异议**（${d.why}）：倒计时停止，请在这里讨论。达成一致后重新打「${LBL.open}」标签，重新计时 ${SILENCE_H} 小时。`,
  needs_owner: `${marker('needs_owner')}\n@${OWNER} 这条${d.why}，不会自动生效。你回复「同意」或「不做」即可；其余事不用你处理。`,
  malformed: `${marker('malformed')}\n正文里没有「默认方案」，倒计时没开始。请按模板补上：**默认方案**（不回复就按它做）+ 一句理由 + 影响面与回退。`,
}[d.action]);
export const swap = (labels, to) => [...labels.filter(l => ![LBL.open, LBL.done, LBL.objected, LBL.owner].includes(l) || (to === LBL.owner && l === LBL.open)), to];

// ---- 排期对齐（11-18，所有者要求「两侧对排期的理解随时一致」）：#65 顶部「本周」块 / 「本周」标签一变，自动在 #216 通知两边；顺手查漂移 ----
//   单一来源 = #65 顶部块 + 各 Issue（协作者读不到项目文档）。约定：表格「Issue」列第一个 #号 = 带「本周」标签的那个，其余是相关 Issue。
//   工作流每小时对账 + Issue 编辑 / 打标签 / 评论事件触发；hash 没变就不发（机器人自己的评论不会触发第二次）。只读 Issue 文字，不进 shell。
export const SCHED = { issue: 65, notify: 216, label: '本周', cap: 3, people: ['SMG562', 'MDD1102'] };
export const schedMark = h => `<!-- nbq-sched:${h} -->`;
export const schedBlock = body => (/^## 本周[\s\S]*?(?=\n---\n|(?![\s\S]))/m.exec(body || '') || [''])[0];
export const schedRows = block => block.split('\n').filter(l => /^\|/.test(l) && !/^\|\s*(事项|-{3})/.test(l)).map(l => l.split('|').slice(1, -1).map(x => x.trim()));
const countdownOf = block => (block.split('\n').find(l => /^\*\*上线倒计时/.test(l)) || '').trim();
export const schedHash = (block, labeled) => createHash('sha1').update(JSON.stringify([schedRows(block), countdownOf(block), labeled.map(x => `${x.number}:${[...x.assignees].sort()}`).sort()])).digest('hex').slice(0, 10);
export const lastSchedHash = bodies => { for (const b of [...bodies].reverse()) { const m = /<!-- nbq-sched:([0-9a-f]{10}) -->/.exec(b || ''); if (m) return m[1] } return '' };
export const schedDrift = (block, labeled) => {
  const rows = schedRows(block), first = rows.map(r => /#(\d+)/.exec(r[3] || '')).filter(Boolean).map(m => +m[1]), lab = labeled.map(x => x.number), w = [];
  if (!rows.length) return ['#65 顶部读不到「本周」表格'];
  if (lab.length > SCHED.cap) w.push(`本周标签 ${lab.length} 个，超过上限 ${SCHED.cap}`);
  for (const x of labeled) if (!x.assignees.length) w.push(`#${x.number} 打了本周标签但没有负责人`);
  for (const r of rows) if (!r[1]) w.push(`表里「${(r[0] || '').slice(0, 10)}」没有负责人`);
  for (const n of first) if (!lab.includes(n)) w.push(`表里的 #${n} 没打「本周」标签`);
  for (const n of lab) if (!first.includes(n)) w.push(`#${n} 打了「本周」标签但表里没有`);
  return w;
};
export const schedText = (block, drift, hash) => {
  const rows = schedRows(block).slice(0, SCHED.cap).map(r => `- ${(r[0] || '').replace(/[：:（(].*$/, '').slice(0, 26)} → ${(r[1] || '').replace(/[（(].*$/, '')}（${(r[3] || '').split(/\s+/)[0]}）`);
  return [schedMark(hash), `【排期变化】${SCHED.people.map(x => '@' + x).join(' ')} #${SCHED.issue} 顶部「本周」块或「本周」标签变了（排期以 #${SCHED.issue} 为准，开工先读）：`, ...rows, ...(drift.length ? [`⚠ 对不上：${drift.join('；')}`] : [])].join('\n');
};
export function syncSchedule({ gh, list, R, dry }) {
  const block = schedBlock(JSON.parse(gh(`repos/${R}/issues/${SCHED.issue}`)).body);
  if (!block) return console.log('排期对账：#65 顶部读不到「本周」块，跳过');
  const labeled = list(`repos/${R}/issues?labels=${encodeURIComponent(SCHED.label)}&state=open&per_page=100`).filter(i => !i.pull_request).map(i => ({ number: i.number, assignees: (i.assignees || []).map(a => a.login) }));
  const hash = schedHash(block, labeled), last = lastSchedHash(list(`repos/${R}/issues/${SCHED.notify}/comments?per_page=100`).map(c => c.body || ''));
  console.log(`排期对账：当前 ${hash}，上次通知 ${last || '无'}`);
  if (hash === last) return;
  const text = schedText(block, schedDrift(block, labeled), hash);
  if (dry) return console.log(text);
  gh('-X', 'POST', `repos/${R}/issues/${SCHED.notify}/comments`, '-f', `body=${text}`);
}

function main() {
  const dry = process.argv.includes('--dry'), R = process.env.GITHUB_REPOSITORY || OWNER + '/nanbanqiu', now = Date.now();
  const gh = (...a) => execFileSync('gh', ['api', ...a], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }), list = p => JSON.parse(gh('--paginate', '--slurp', p)).flat();
  for (const x of list(`repos/${R}/issues?labels=${encodeURIComponent(LBL.open)}&state=open&per_page=100`).filter(i => !i.pull_request)) {
    const raw = list(`repos/${R}/issues/${x.number}/comments?per_page=100`), comments = raw.map(c => ({ author: c.user?.login, body: c.body || '', bot: c.user?.type === 'Bot', at: c.created_at }));
    const ev = list(`repos/${R}/issues/${x.number}/events?per_page=100`).filter(e => e.event === 'labeled' && e.label?.name === LBL.open);
    const issue = { number: x.number, title: x.title, body: x.body, author: x.user.login, created: x.created_at }, d = decide({ issue, comments, labeledAt: ev.at(-1)?.created_at, now });
    console.log(`#${x.number} ${x.title}：${d.action}（${d.why}）`);
    if (d.action === 'wait') continue;
    const text = textOf(issue, d), sent = raw.some(c => c.body.includes(text.split('\n')[0]));
    const to = { effect: LBL.done, objected: LBL.objected, needs_owner: LBL.owner }[d.action];
    if (dry) continue;
    if (!sent) gh('-X', 'POST', `repos/${R}/issues/${x.number}/comments`, '-f', `body=${text}`);
    if (to) { for (const l of Object.values(LBL)) { try { gh('-X', 'POST', `repos/${R}/labels`, '-f', `name=${l}`, '-f', 'color=0e8a16') } catch { } } gh('-X', 'PUT', `repos/${R}/issues/${x.number}/labels`, ...swap(x.labels.map(l => l.name), to).flatMap(l => ['-f', `labels[]=${l}`])) }
  }
  try { syncSchedule({ gh, list, R, dry }) } catch (e) { console.log('排期对账失败：' + e.message) }
}
if (process.argv[1] && fs.realpathSync(path.resolve(process.argv[1])) === fs.realpathSync(fileURLToPath(import.meta.url))) main();
