#!/usr/bin/env node
// 协作看板（11-11，#167 第四节「沟通自动化」）：每个开着的 PR「球在谁手里」由机器从 PR 本身推出来（CI、冲突、复核留言、红线级别），
// 球换手时自动 @ 对方并写明下一步；所有者只在「红线 PR 集合变化」时被提醒一次。协作者不用再手动汇报进度，所有者不用再手动催。
//   node tools/collab_board.mjs [--dry]     要 GH_TOKEN（或 GITHUB_TOKEN）；--dry 只打印看板和将做的动作，不写任何东西
// 做三件事：① 给 PR 打标签（球在作者 / 球在所有者 / 球在复核 / 等CI / 可合并）；② 球换手时在 PR 上评论一次（按 球+原因+提交号 去重；每周最多一次「久没动」提醒）；
//   ③ 更新置顶 Issue「协作看板」的正文（内容没变不写）；红线集合变了就在看板里 @所有者 一次。
// 安全：只读 PR 元数据，不执行 PR 里的任何代码（工作流只用默认分支的版本）；评论正文只做正则匹配，不进 shell；机器人的评论不算「独立复核」（pr_merge.sh 认的字符串在提醒里写成占位符）。
import { collect } from './review_state.mjs';
import { execFileSync } from 'node:child_process'; import crypto from 'node:crypto'; import path from 'node:path'; import fs from 'node:fs'; import { fileURLToPath } from 'node:url';
import { levelOf } from './decision_card.mjs';

export const OWNER = 'SMG562', WIP_LIMIT = 2, IDLE_DAYS = 3, D = 864e5;
export const BALL = { author: '球在作者', owner: '球在所有者', review: '球在复核', ci: '等CI', merge: '可合并' };
const COLOR = { author: 'fbca04', owner: 'd93f0b', review: '5319e7', ci: 'c5def5', merge: '0e8a16' };
const NAME = { tests: '浏览器测试', fast: 'tests-fast' };
// 11-12（GitHub Actions 事件，20:18–21:07 UTC 起 32 个运行卡在排队）：排队超过 STUCK_MIN 分钟 = 卡住。这种运行取消 / 重跑都不行（409 / 403），只能推新提交重新触发
export const STUCK_MIN = 30;
export const stuckNext = '这个提交的检查没有机会跑出结果，取消 / 重跑都不行。在**自己的分支**推一个空提交重新触发：`git commit --allow-empty -m "ci: 重新触发" && git push`（别动别人分支的运行；先看 githubstatus.com 有没有在处理的事件）';
export const stuckKey = p => `nbq-stuck:${p.sha.slice(0, 7)}`;
export const stuckText = p => `<!-- ${stuckKey(p)} -->\n@${p.author} 这个提交（${p.sha.slice(0, 7)}）的 CI 排队超过 ${STUCK_MIN} 分钟没开始，多半是 GitHub 平台故障（${p.draft ? '草稿 PR，' : ''}不是代码问题）。\n下一步：${stuckNext}\n\n> 自动消息（协作看板），同一个提交只提醒一次。`;

// 独立复核留言 → 针对当前提交的状态：pass 通过 / fix 要改 / rereview 改过了要重审 / none 还没复核（机器人的评论不算）
export function reviewState(comments, sha) {
  const { pass, fix } = collect(comments.filter(c => !c.bot).map(c => c.body)), cur = sha.slice(0, 7);   // 解析统一在 tools/review_state.mjs（#201）
  return pass.includes(cur) ? 'pass' : fix.includes(cur) ? 'fix' : fix.length ? 'rereview' : 'none';
}

// p = { number, title, author, draft, sha, mergeable, behind（落后 main 几个提交）, updated, level: owner|review|self, ci: { tests, fast }: ok|failure|pending|none, review }
export function classify(p, now = Date.now()) {
  const idle = Math.floor((now - Date.parse(p.updated)) / D);
  const R = (ball, reason, next) => ({ ball, reason, next, idle, ping: ['author', 'review', 'merge'].includes(ball) && !p.draft });
  if (p.draft) return R('author', '排队中', '本地测过后转 Ready（你的在制品 ≤ 2，排队顺序见 #167）');
  if (p.mergeable === 'dirty') return R('author', '和 main 有冲突', '在分支上 `bash tools/sync_main.sh --check` 看冲突文件，`git merge origin/main` 解决后推分支');
  const bad = Object.keys(NAME).filter(k => p.ci[k] === 'failure');
  if (bad.length) return R('author', `CI 红（${bad.map(k => NAME[k]).join('、')}）`, '看注解修；偶发失败先只重跑失败项一次');
  if (Object.keys(NAME).some(k => p.ci[k] === 'stuck')) return R('author', `CI 卡在排队超过 ${STUCK_MIN} 分钟（多半是 GitHub 平台故障）`, stuckNext);
  if (Object.keys(NAME).some(k => p.ci[k] === 'pending')) return R('ci', 'CI 在跑', '等待，无需操作');
  if ([p.ci.tests, p.ci.fast].filter(v => v === 'none').length === 1) return R('author', 'CI 没有对这个提交跑完（转 Ready 没触发 / 被取消）', '转回草稿再转 Ready，或推一个小提交');
  if (p.level === 'review' && p.review !== 'pass') {
    if (p.review === 'fix') return R('author', '独立复核结论「要改」', '按复核意见改，推完在 PR 留言「已改，请重新复核 <提交号前7位>」');
    return R('review', p.review === 'rereview' ? '改动后需要重新复核' : '需要独立复核', '另开一个没看过过程的会话只读复核，在 PR 留言复核结论（通过就写「独立复核：通过 <提交号前7位>」，写明看了什么、风险、怎么回退）');
  }
  // 11-11：落后 main 不再把球推给作者——pr_merge.sh 自己判断（只多文档 / 文件不重叠自动放行，否则提示 sync_main.sh），省掉不必要的合 main 和重跑
  const bh = p.behind > 0 ? `（main 前进了 ${p.behind} 个提交：只多文档 / 文件不重叠会自动放行，否则它会提示 \`bash tools/sync_main.sh\`）` : '';
  if (p.level === 'owner') return R('owner', '红线文件：需要所有者当场点头', `所有者看 diff 后 \`bash tools/pr_merge.sh ${p.number}\`${bh}`);
  return R('merge', 'CI 全绿' + (p.level === 'review' ? ' + 复核已通过' : '，无需复核'), `自助合并：\`bash tools/pr_merge.sh ${p.number}\`${bh}`);
}

// 11-12（#185 事故）：PR 草稿 / Ready 在 FLAP_MIN 分钟内被改 ≥ 2 次 = 有两个会话在抢状态。events = [{ event, actor, at }]，返回 null 或 { n, actors, key }
export const FLAP_MIN = 10;
export function flapOf(events, now = Date.now()) {
  const ch = events.filter(e => /^(ready_for_review|convert_to_draft)$/.test(e.event) && now - Date.parse(e.at) <= FLAP_MIN * 6e4).sort((a, b) => a.at < b.at ? -1 : 1);
  return ch.length < 2 ? null : { n: ch.length, actors: [...new Set(ch.map(e => e.actor))], key: `nbq-flap:${ch[ch.length - 1].at}` };
}
export const flapText = (p, f) => `<!-- ${f.key} -->\n⚠️ 这个 PR 的草稿 / Ready 状态在 ${FLAP_MIN} 分钟内被改了 ${f.n} 次（账号：${f.actors.join('、')}）。多半是两个会话在抢状态。\n规矩（docs/协作分工.md §1b）：**状态只由这个 PR 分支（\`${p.branch}\`）上的会话改**，用 \`bash tools/pr_state.sh ${p.number} ready|draft\`；别的会话只在这里留言【请转草稿】/【请转 Ready】+ 理由。排队顺序不靠改草稿表达，由集成者按看板安排合并。现在状态是「${p.draft ? '草稿' : 'Ready'}」，请所属会话确认后再动，其他会话先别改。`;
const h6 = s => crypto.createHash('sha1').update(s).digest('hex').slice(0, 6);
export const pingKey = (p, c) => `nbq-ball:${c.ball}:${h6(c.reason)}:${p.sha.slice(0, 7)}`;
export const isoWeek = t => { const d = new Date(t); d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7)); const y = d.getUTCFullYear(); return `${y}-W${Math.ceil(((d - Date.UTC(y, 0, 1)) / D + 1) / 7)}` };
export const pingText = (p, c) => `<!-- ${pingKey(p, c)} -->\n@${p.author} ${c.ball === 'merge' ? '可以合并了' : '球在你这边'}：**${c.reason}**。\n下一步：${c.next}\n\n> 自动消息（协作看板）。进度由看板从 PR 状态自动推出，不用另外汇报；卡住了直接在这里留言写「卡住 + 在哪」。`;
export const idleText = (p, c, now) => `<!-- nbq-idle:${isoWeek(now)} -->\n@${p.author} 这个 PR 已 ${c.idle} 天没动（${c.reason}）。默认方案：本周内推进；不做了就转草稿并在这里留一句结论，或关闭。`;
export const already = (comments, key) => comments.some(c => c.body.includes(`<!-- ${key} -->`));
export const labelsFor = (current, ball) => [...current.filter(l => !Object.values(BALL).includes(l)), BALL[ball]];
export const ownerKey = rows => rows.filter(r => r.c.ball === 'owner').map(r => r.p.number).sort((a, b) => a - b).join(',');

const GUIDE = `**怎么用**：每个 PR 的「球」由机器从 CI、冲突、复核留言、红线级别自动推出；球换手时机器人会在 PR 上 @ 对应的人并给出下一步命令，所以**不用另外汇报进度**。
- 标签 \`球在作者 / 球在复核 / 球在所有者 / 等CI / 可合并\` 随状态自动更新，可直接按标签筛选。
- **所有者只处理三类事**：红线 PR（当场点头）、每日真机、每周一周报；红线集合变化时这里会 @ 一次。
- 提问格式固定「默认方案 + 一句理由 + 不回复就按它做」，24 小时无异议即生效（#87）；协作者在 Issue 里只回「N 做完 / N 不做 + 理由 / N 卡住 + 在哪」。
- 在制品（非草稿 PR）上限：**每个作者 ${WIP_LIMIT} 个**（#229，11-13：两人都能合并后不再全仓共 ${WIP_LIMIT} 个）。`;

export function render(rows, now = Date.now()) {
  const order = ['owner', 'review', 'author', 'merge', 'ci'], wipBy = {};
  for (const r of rows) if (!r.p.draft) wipBy[r.p.author] = (wipBy[r.p.author] || 0) + 1;
  const wipTxt = Object.entries(wipBy).map(([a, n]) => `${a} ${n} / ${WIP_LIMIT}${n > WIP_LIMIT ? ' ⚠ 超限：先合并 / 转草稿 / 关掉旧的' : ''}`).join(' · ') || '0';
  const line = r => `| #${r.p.number} | ${r.p.author} | ${r.p.draft ? '草稿' : BALL[r.c.ball]} | ${r.c.reason} | ${r.c.next.replace(/\|/g, '/')} | ${r.c.idle} 天 |`;
  const body = order.map(b => [b, rows.filter(r => r.c.ball === b && !r.p.draft)]).filter(([, g]) => g.length).map(([b, g]) => `### ${BALL[b]}（${g.length}）\n| PR | 作者 | 状态 | 原因 | 下一步 | 闲置 |\n|---|---|---|---|---|---|\n${g.map(line).join('\n')}`);
  const dr = rows.filter(r => r.p.draft); if (dr.length) body.push(`### 草稿（${dr.length}）\n| PR | 作者 | 状态 | 原因 | 下一步 | 闲置 |\n|---|---|---|---|---|---|\n${dr.map(line).join('\n')}`);
  return `${GUIDE}\n\n**在制品**（每人 ≤ ${WIP_LIMIT}）：${wipTxt}\n\n${body.join('\n\n') || '（没有开着的 PR）'}`;
}

const gh = (...a) => execFileSync('gh', ['api', ...a], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }), list = path => JSON.parse(gh('--paginate', '--slurp', path)).flat();
// 取开着的每个 PR 的状态（CI、复核、级别、落后 main 几个提交）并分类 → [{ p, c }]；看板和 tools/review_queue.mjs 共用（11-11：自动复核巡检）
export function gather(R, now = Date.now()) {
  const CO = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.github/CODEOWNERS'), 'utf8');
  const rows = [];
  for (const x of list(`repos/${R}/pulls?state=open&per_page=100`)) {
    // 改动文件用 compare（main...提交，和 pr_merge.sh 看到的一致）；PR 的 files 接口在 main 前进后会滞后，把别人已合并的文件也算进来
    const cmp = JSON.parse(gh(`repos/${R}/compare/main...${x.head.sha}`, '--jq', '{files:[.files[].filename],behind:.behind_by}')), files = cmp.files;
    const runs = JSON.parse(gh(`repos/${R}/actions/runs?head_sha=${x.head.sha}&per_page=50`)).workflow_runs;
    const st = w => { const r = runs.filter(v => v.path === `.github/workflows/${w}.yml`).sort((a, b) => a.created_at < b.created_at ? 1 : -1)[0]; return !r ? 'none' : r.status !== 'completed' ? (r.status === 'queued' && now - Date.parse(r.created_at) > STUCK_MIN * 6e4 ? 'stuck' : 'pending') : r.conclusion === 'success' ? 'ok' : r.conclusion === 'skipped' ? 'none' : 'failure' };
    const comments = list(`repos/${R}/issues/${x.number}/comments?per_page=100`).map(c => ({ body: c.body || '', bot: c.user?.type === 'Bot' }));
    const mergeable = gh(`repos/${R}/pulls/${x.number}`, '--jq', '.mergeable_state').trim();
    const p = { number: x.number, title: x.title, branch: x.head.ref, author: x.user.login, draft: x.draft, sha: x.head.sha, mergeable, behind: cmp.behind, updated: x.updated_at, level: levelOf(files, CO).level, ci: { tests: st('tests'), fast: st('tests-fast') }, labels: x.labels.map(l => l.name), comments };
    p.review = reviewState(comments, p.sha); rows.push({ p, c: classify(p, now) });
  }
  return rows;
}
function main() {
  const dry = process.argv.includes('--dry'), R = process.env.GITHUB_REPOSITORY || OWNER + '/nanbanqiu', now = Date.now();
  const post = (n, body) => dry ? console.log(`[评论 #${n}] ${body.split('\n').slice(1, 3).join(' ')}`) : gh('-X', 'POST', `repos/${R}/issues/${n}/comments`, '-f', `body=${body}`);
  const rows = gather(R, now);
  const board = render(rows, now); console.log(board);
  for (const { p, c } of rows) {
    const want = labelsFor(p.labels, c.ball);
    if (want.slice().sort().join() !== p.labels.slice().sort().join()) { console.log(`[标签 #${p.number}] ${BALL[c.ball]}`); if (!dry) for (const b of Object.keys(BALL)) { try { gh('-X', 'POST', `repos/${R}/labels`, '-f', `name=${BALL[b]}`, '-f', `color=${COLOR[b]}`) } catch { } } if (!dry) gh('-X', 'PUT', `repos/${R}/issues/${p.number}/labels`, ...want.flatMap(l => ['-f', `labels[]=${l}`])) }
    // 状态抖动告警（只查最近 1 小时动过的 PR，省 API）：同一次抖动只提醒一次（按最后一次改状态的时间去重）
    if (now - Date.parse(p.updated) < 36e5) {
      const tl = list(`repos/${R}/issues/${p.number}/timeline?per_page=100`).map(e => ({ event: e.event, actor: e.actor?.login || '', at: e.created_at })), f = flapOf(tl, now);
      if (f && !already(p.comments, f.key)) post(p.number, flapText(p, f));
    }
    if (Object.values(p.ci).includes('stuck') && p.author !== OWNER && !p.author.endsWith('[bot]') && !already(p.comments, stuckKey(p))) post(p.number, stuckText(p));
    if (!c.ping || p.author === OWNER || p.author.endsWith('[bot]')) continue;
    if (!already(p.comments, pingKey(p, c))) post(p.number, pingText(p, c));
    else if (c.idle >= IDLE_DAYS && c.ball !== 'merge' && !already(p.comments, `nbq-idle:${isoWeek(now)}`)) post(p.number, idleText(p, c, now));
  }
  // 看板 Issue（标签「协作看板」，没有就建）：正文只在内容变化时写；红线集合变了 @所有者 一次
  const hash = h6(board), when = new Date(now).toLocaleString('zh-CN', { timeZone: 'Australia/Melbourne', hour12: false }), okey = ownerKey(rows);
  if (dry) { console.log(`[看板] hash ${hash}，需要所有者：${okey || '无'}`); return }
  try { gh('-X', 'POST', `repos/${R}/labels`, '-f', 'name=协作看板', '-f', 'color=1d76db') } catch { }
  let issue = list(`repos/${R}/issues?labels=${encodeURIComponent('协作看板')}&state=open&per_page=5`)[0];
  const full = `${board}\n\n<!-- nbq-board:${hash} -->\n_更新于 ${when}（墨尔本）· 由 tools/collab_board.mjs 自动生成，别手改_`;
  if (!issue) issue = JSON.parse(gh('-X', 'POST', `repos/${R}/issues`, '-f', 'title=协作看板（自动更新，别手改）', '-f', 'labels[]=协作看板', '-f', `body=${full}`));
  else if (!(issue.body || '').includes(`nbq-board:${hash}`)) gh('-X', 'PATCH', `repos/${R}/issues/${issue.number}`, '-f', `body=${full}`);
  const prev = list(`repos/${R}/issues/${issue.number}/comments?per_page=100`).filter(c => c.body.includes('nbq-owner-set:')).pop()?.body.match(/nbq-owner-set:([\d,]*)/)?.[1];
  if (okey && okey !== prev) post(issue.number, `<!-- nbq-owner-set:${okey} -->\n@${OWNER} 现在需要你的 PR（红线，当场点头）：${rows.filter(r => r.c.ball === 'owner').map(r => `#${r.p.number} ${r.p.title}`).join('；')}。其余不用你处理。`);
  else if (!okey && prev) post(issue.number, `<!-- nbq-owner-set: -->\n现在没有需要所有者处理的 PR。`);
}
if (process.argv[1] && fs.realpathSync(path.resolve(process.argv[1])) === fs.realpathSync(fileURLToPath(import.meta.url))) main();
