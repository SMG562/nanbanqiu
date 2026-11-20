#!/usr/bin/env node
// 协作看板（11-11，#167 第四节「沟通自动化」）：每个开着的 PR「球在谁手里」由机器从 PR 本身推出来（CI、冲突、复核留言、红线级别），
// 球换手时自动 @ 对方并写明下一步；所有者只在「红线 PR 集合变化」时被提醒一次。协作者不用再手动汇报进度，所有者不用再手动催。
//   node tools/collab_board.mjs [--dry]     要 GH_TOKEN（或 GITHUB_TOKEN）；--dry 只打印看板和将做的动作，不写任何东西
// 做三件事：① 给 PR 打标签（球在作者 / 球在所有者 / 球在复核 / 等CI / 可合并）；② 球换手时在 PR 上评论一次（按 球+原因+提交号 去重；每周最多一次「久没动」提醒）；
//   ③ 更新置顶 Issue「协作看板」的正文（内容没变不写）；红线集合变了就在看板里 @所有者 一次。
// 安全：只读 PR 元数据，不执行 PR 里的任何代码（工作流只用默认分支的版本）；评论正文只做正则匹配，不进 shell；机器人的评论不算「独立复核」（pr_merge.sh 认的字符串在提醒里写成占位符）。
import { collect } from './review_state.mjs';
import { execFileSync } from 'node:child_process'; import crypto from 'node:crypto'; import path from 'node:path'; import fs from 'node:fs'; import { fileURLToPath } from 'node:url';
import { levelOf, redLines } from './decision_card.mjs'; import { carries } from './review_carry.mjs';

export const OWNER = 'SMG562', WIP_LIMIT = 2, IDLE_DAYS = 3, D = 864e5;
// 11-13（#233 活锁）：协作者每合一次 main 要等约 5 分钟 CI，而 main 约 20 分钟动一次、所有者约 16 分钟才看一次，同步永远追不上。
// 同一个 PR 已「合并 main」≥ SYNC_LOOP 次、CI 又是绿的 = 别再同步，留【可合】让所有者当场合（GitHub 的 Approve 不是闸门）。
// 11-13（协作者指出，#250）：共同所有者只在「CODEOWNERS 那一行也写了他」的路径上能自己合；只写 @SMG562 的路径（pr_merge.sh、gate.sh、CLAUDE.md、ADR、collab-board.yml …）GitHub 分支规则要所有者审，由所有者会话当场合
export const coOwns = (ownerFiles, codeownersText, login) => { const lines = codeownersText.split('\n').filter(l => /^\//.test(l) && l.includes('@' + login)), res = redLines(lines.join('\n')); return ownerFiles.length > 0 && ownerFiles.every(f => res.some(r => r.test(f))) };
export const SYNC_LOOP = 2;
// 11-13（#266）：也认 sync_main.sh 写的「合并 origin/main，为快进合并做准备」（以前只认英文，脚本同步全算 0 次，提示从没触发）
export const syncsOf = commits => commits.filter(c => (c.parents || []).length > 1 && /^(Merge (remote-tracking )?(branch )?'?(origin\/)?main\b|合并 (origin\/)?main(?![\w\/-]))/.test(c.message || '')).length;
export const syncText = (p, n) => `<!-- nbq-syncloop:${p.number} -->\n@${p.author} 这个 PR 已经合并 main ${n} 次了。CI 绿、能快进时**不要再同步**：在这里留一句「【可合 ${p.sha.slice(0, 7)}】」，所有者会话当场 \`bash tools/pr_merge.sh ${p.number}\`（GitHub 的 Approve 不是闸门，不用对头提交）。只有 \`pr_merge.sh ${p.number} --check\` 明确报「不能快进」才再 \`bash tools/sync_main.sh\` 一次。\n\n> 自动消息（协作看板），每个 PR 只提醒一次。`;
export const BALL = { author: '球在作者', owner: '球在所有者', review: '球在复核', ci: '等CI', merge: '可合并' };
const COLOR = { author: 'fbca04', owner: 'd93f0b', review: '5319e7', ci: 'c5def5', merge: '0e8a16' };
const NAME = { tests: '浏览器测试', fast: 'tests-fast' };
// 11-12（GitHub Actions 事件，20:18–21:07 UTC 起 32 个运行卡在排队）：排队超过 STUCK_MIN 分钟 = 卡住。这种运行取消 / 重跑都不行（409 / 403），只能推新提交重新触发
export const STUCK_MIN = 30;
export const stuckNext = '这个提交的检查没有机会跑出结果，取消 / 重跑都不行。在**自己的分支**推一个空提交重新触发：`git commit --allow-empty -m "ci: 重新触发" && git push`（别动别人分支的运行；先看 githubstatus.com 有没有在处理的事件）';
export const stuckKey = p => `nbq-stuck:${p.sha.slice(0, 7)}`;
export const stuckText = p => `<!-- ${stuckKey(p)} -->\n@${p.author} 这个提交（${p.sha.slice(0, 7)}）的 CI 排队超过 ${STUCK_MIN} 分钟没开始，多半是 GitHub 平台故障（${p.draft ? '草稿 PR，' : ''}不是代码问题）。\n下一步：${stuckNext}\n\n> 自动消息（协作看板），同一个提交只提醒一次。`;

// 独立复核留言 → 针对当前提交的状态：pass 通过 / fix 要改 / rereview 改过了要重审 / none 还没复核（机器人的评论不算）
// carry(旧提交) → 真/假：旧提交的「通过」能否沿用到当前提交（只多合并了 main，判据 = tools/review_carry.mjs，和 pr_merge.sh 同一份）。
//   11-12：以前看板不认沿用，pr_merge 放行的 PR 看板仍喊「需要独立复核」（#197）
export function reviewState(comments, sha, carry = () => false) {
  const { pass, fix } = collect(comments.filter(c => !c.bot).map(c => c.body)), cur = sha.slice(0, 7);   // 解析统一在 tools/review_state.mjs（#201）
  if (pass.includes(cur)) return 'pass';
  if (fix.includes(cur)) return 'fix';
  if (pass.some(o => carry(o))) return 'pass';
  return fix.length ? 'rereview' : 'none';
}
// 沿用要用 git 比对提交内容：按需取 main 和 PR 头（工作流是 blob:none 的完整历史，只取提交和目录树）；取不到 = 不沿用（宁可多要一次复核）
const fetched = new Map();
const fetchPr = n => { if (!fetched.has(n)) { try { execFileSync('git', ['fetch', '-q', '--no-tags', 'origin', '+refs/heads/main:refs/remotes/origin/main', `+refs/pull/${n}/head`], { stdio: 'ignore', timeout: 60e3 }); fetched.set(n, true) } catch { fetched.set(n, false) } } return fetched.get(n) };
export const gitCarry = (n, sha) => old => fetchPr(n) && carries(old, sha, 'origin/main').carry;
// 11-16（#310）：含数据库改动的 PR，db-parity 在「库结构最后一次改动」之后有没有通过——和 pr_merge.sh ④ / merge_gate.mjs 同一份实现（tools/merge_drift.sh --db-parity），这里只取结果。
//   取不到（没拉到提交 / 读不到运行记录）= null（不确定）：看板不替所有者「认定在等」，宁可不提醒也不乱提醒
export const dbFiles = files => files.filter(f => /^(schema\.sql|server\/migrations\/)/.test(f) && f !== 'server/migrations/_bundle.sql');   // _bundle.sql 是生成文件（ADR 0011），不算
// 取 db-parity 结果：运行的是 **origin/main 上的** merge_drift.sh（不依赖检出：协作看板 job 是稀疏检出，只有几个脚本；也不运行 PR 里的代码）。
//   `bash -c <脚本内容> tools/merge_drift.sh ...`：$0 仍是 tools/merge_drift.sh，脚本里的 cd "$(dirname "$0")/.." 才回到仓库根。
//   11-16 教训：第一版直接 `bash tools/merge_drift.sh`，在 Actions 里「找不到文件」（退出码 127），被当成「不确定」悄悄放过，功能在线上整个失效而没人知道——
//   所以「不确定」必须带原因、并在日志里大声警告（::warning），不能静默。返回 { status, why }：status 0 / 1 = 脚本明确的结论，其余 = 不确定。
export const runMergeDrift = sha => {
  let script; try { script = execFileSync('git', ['show', 'origin/main:tools/merge_drift.sh'], { encoding: 'utf8', timeout: 60e3, stdio: ['ignore', 'pipe', 'ignore'] }) } catch (e) { return { status: null, why: `取不到 origin/main:tools/merge_drift.sh（${String(e.message).split('\n')[0].slice(0, 80)}）` } }
  try { execFileSync('bash', ['-c', script, 'tools/merge_drift.sh', '--db-parity', sha], { stdio: 'ignore', timeout: 60e3 }); return { status: 0 } }
  catch (e) { return e.status === 1 ? { status: 1 } : { status: null, why: `merge_drift.sh 退出码 ${e.status ?? e.signal ?? e.code}（不是 0 / 1）` } }
};
export function dbFacts(n, sha, files, deps = {}) {
  const fetch = deps.fetch || fetchPr, run = deps.run || runMergeDrift, f = dbFiles(files);
  if (!f.length) return { changed: false, files: [], parity: null };
  if (!fetch(n)) return { changed: true, files: f, parity: null, why: `取不到 PR #${n} 的提交（git fetch 失败）` };
  const r = run(sha);
  return { changed: true, files: f, parity: r.status === 0 ? true : r.status === 1 ? false : null, ...(r.status === 0 || r.status === 1 ? {} : { why: r.why || '未知原因' }) };
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
  // 11-16（#310）：含数据库改动、db-parity 还没在库结构最后一次改动之后通过 = 球在所有者（只有所有者能在正式库跑迁移）。
  //   以前这里会对共同所有者说「可以合并了」，作者撞上 pr_merge.sh 的闸门才发现要等迁移，所有者也没人通知。判断来自事实（db-parity 运行记录），不靠「迁移已跑」留言约定。
  if (p.db?.changed && p.db.parity === false) return { ...R('owner', '含数据库改动：等所有者先在正式库跑迁移，再跑 db-parity', `所有者：在正式库 nanbanqiu-au 跑迁移（${p.db.files.join('、')}），再在 Actions 手动跑 db-parity；✅ 后看板自动放行。作者先别合前端`), ownerAct: 'migrate' };
  // 11-11：落后 main 不再把球推给作者——pr_merge.sh 自己判断（只多文档 / 文件不重叠自动放行，否则提示 sync_main.sh），省掉不必要的合 main 和重跑
  const bh = p.behind > 0 ? `（main 前进了 ${p.behind} 个提交：只多文档 / 文件不重叠会自动放行，否则它会提示 \`bash tools/sync_main.sh\`）` : '';
  const loop = (p.syncs || 0) >= SYNC_LOOP ? `（已合并 main ${p.syncs} 次，别再同步，留【可合 ${p.sha.slice(0, 7)}】）` : '';
  // 11-13（#241 同类第二次）：作者本人在 .github/CO_OWNERS 里 = 共同所有者，红线 PR 自己就能合，不用等所有者、不用 Approve
  if (p.level === 'owner' && p.coOwner) return R('merge', '红线文件：你是共同所有者，可自行合并（不用等 Approve）' + loop, `CI 全绿后 \`bash tools/pr_merge.sh ${p.number}\`${bh}；只有正式库迁移 / 登录密钥权限 / 部署 / 删除才找所有者`);
  if (p.level === 'owner') return R('owner', '红线文件：需要所有者当场点头' + loop, `所有者看 diff 后 \`bash tools/pr_merge.sh ${p.number}\`${bh}`);
  return R('merge', 'CI 全绿' + (p.level === 'review' ? ' + 复核已通过' : '，无需复核') + loop, `自助合并：\`bash tools/pr_merge.sh ${p.number}\`${bh}`);
}

// 11-12（#185 事故）：PR 草稿 / Ready 在 FLAP_MIN 分钟内被改 ≥ 2 次 = 有两个会话在抢状态。events = [{ event, actor, at }]，返回 null 或 { n, actors, key }
export const FLAP_MIN = 10;
export function flapOf(events, now = Date.now()) {
  const ch = events.filter(e => /^(ready_for_review|convert_to_draft)$/.test(e.event) && now - Date.parse(e.at) <= FLAP_MIN * 6e4).sort((a, b) => a.at < b.at ? -1 : 1);
  return ch.length < 2 ? null : { n: ch.length, actors: [...new Set(ch.map(e => e.actor))], key: `nbq-flap:${ch[ch.length - 1].at}` };
}
export const flapText = (p, f) => `<!-- ${f.key} -->\n⚠️ 这个 PR 的草稿 / Ready 状态在 ${FLAP_MIN} 分钟内被改了 ${f.n} 次（账号：${f.actors.join('、')}）。多半是两个会话在抢状态。\n规矩（docs/协作分工.md §1b）：**状态只由这个 PR 分支（\`${p.branch}\`）上的会话改**，用 \`bash tools/pr_state.sh ${p.number} ready|draft\`；别的会话只在这里留言【请转草稿】/【请转 Ready】+ 理由。排队顺序不靠改草稿表达，由集成者按看板安排合并。现在状态是「${p.draft ? '草稿' : 'Ready'}」，请所属会话确认后再动，其他会话先别改。`;
// 一个工作流在这个提交上的状态：ok / pending / stuck / failure / none（11-13，#248）
//   转 Ready 时同一秒会有两个 tests 运行：草稿那次 skipped + 正常那次 in_progress；按时间取最新可能落到 skipped → 误报「没跑完」。
//   所以先排除 skipped，有别的运行就看最新的那个；全是 skipped 才算 none。
export const runState = (runs, w, now) => {
  const all = runs.filter(v => v.path === `.github/workflows/${w}.yml`).sort((a, b) => a.created_at < b.created_at ? 1 : -1);
  const r = all.find(v => v.conclusion !== 'skipped');
  return !r ? 'none' : r.status !== 'completed' ? (r.status === 'queued' && now - Date.parse(r.created_at) > STUCK_MIN * 6e4 ? 'stuck' : 'pending') : r.conclusion === 'success' ? 'ok' : 'failure';
};
const h6 = s => crypto.createHash('sha1').update(s).digest('hex').slice(0, 6);
export const pingKey = (p, c) => `nbq-ball:${c.ball}:${h6(c.reason)}:${p.sha.slice(0, 7)}`;
export const isoWeek = t => { const d = new Date(t); d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7)); const y = d.getUTCFullYear(); return `${y}-W${Math.ceil(((d - Date.UTC(y, 0, 1)) / D + 1) / 7)}` };
export const pingText = (p, c) => `<!-- ${pingKey(p, c)} -->\n@${p.author} ${c.ball === 'merge' ? '可以合并了' : '球在你这边'}：**${c.reason}**。\n下一步：${c.next}\n\n> 自动消息（协作看板）。进度由看板从 PR 状态自动推出，不用另外汇报；卡住了直接在这里留言写「卡住 + 在哪」。`;
// 11-16（#310）：「等所有者做一件事」的提醒：首次直接在 PR 上 @ 所有者写明动作；24 小时还没做，每天再提醒一次，最多 OWNER_REMIND_MAX 次（不刷屏）。
//   标记按「这批库结构文件」去重（作者推别的提交不重复提醒），文件变了才算新的一件事。comments = [{ body, at }]；返回 null 或 { key, body }
export const OWNER_REMIND_H = 24, OWNER_REMIND_MAX = 3;
export const ownerActKey = (p, c) => `nbq-owner-act:${c.ownerAct}:${h6((p.db?.files || []).join(','))}`;
export function ownerActPost(p, c, comments, now) {
  if (!c.ownerAct || p.draft || p.author.endsWith('[bot]')) return null;
  const k = ownerActKey(p, c), mine = comments.filter(m => m.body.includes(`<!-- ${k}`));
  const tail = '\n\n> 自动消息（协作看板）。判断来自 db-parity 的运行记录（和合并闸门同一份），做完不用留言，✅ 后看板会自动改成「可合并」。';
  if (!mine.length) return { key: k, body: `<!-- ${k} -->\n@${OWNER} **需要你做一件事**：${c.reason}。\n下一步：${c.next}\n\n作者（@${p.author}）先别合前端，等 db-parity ✅。${tail}` };
  const last = Math.max(...mine.map(m => Date.parse(m.at || 0) || 0)), n = mine.length;   // n = 已提醒次数（含首次）
  if (n > OWNER_REMIND_MAX || now - last < OWNER_REMIND_H * 36e5) return null;
  return { key: `${k}:r${n}`, body: `<!-- ${k}:r${n} -->\n@${OWNER} 提醒（第 ${n} 次）：${c.reason}，已等 ${Math.floor((now - Date.parse(mine[0].at || 0)) / 36e5)} 小时。\n${c.next}${tail}` };
}
export const idleText = (p, c, now) => `<!-- nbq-idle:${isoWeek(now)} -->\n@${p.author} 这个 PR 已 ${c.idle} 天没动（${c.reason}）。默认方案：本周内推进；不做了就转草稿并在这里留一句结论，或关闭。`;
export const already = (comments, key) => comments.some(c => c.body.includes(`<!-- ${key} -->`));
export const labelsFor = (current, ball) => [...current.filter(l => !Object.values(BALL).includes(l)), BALL[ball]];
export const ownerKey = rows => rows.filter(r => r.c.ball === 'owner').map(r => r.p.number).sort((a, b) => a - b).join(',');

const GUIDE = `**怎么用**：每个 PR 的「球」由机器从 CI、冲突、复核留言、红线级别自动推出；球换手时机器人会在 PR 上 @ 对应的人并给出下一步命令，所以**不用另外汇报进度**。
- 标签 \`球在作者 / 球在复核 / 球在所有者 / 等CI / 可合并\` 随状态自动更新，可直接按标签筛选。
- **所有者只处理四类事**：红线 PR（当场点头）、含数据库改动的 PR（先在正式库跑迁移，再跑 db-parity；PR 上会直接 @ 你并每天提醒，最多 3 次）、每日真机、每周一周报；需要你处理的 PR 集合变化时这里会 @ 一次。
- 提问格式固定「默认方案 + 一句理由 + 不回复就按它做」，24 小时无异议即生效（#87）；协作者在 Issue 里只回「N 做完 / N 不做 + 理由 / N 卡住 + 在哪」。
- **这套通知本身也能改**：哪类消息漏了 / 太吵 / 写得不清，在 #216 回「通知：想改什么 + 理由」，两边都能提 PR（说明见 docs/协作分工.md §6）；改了会自动通知对方。
- 在制品（非草稿 PR）上限：**每个作者 ${WIP_LIMIT} 个**（#229，11-13：两人都能合并后不再全仓共 ${WIP_LIMIT} 个）。`;

// main 有新提交时告诉「相关的」开着的 PR（#189，11-13 所有者同意）：同改了文件，或提交信息 / 新增行里 #提到了它。
//   起因：#197 被 main 上的提交提到、#193 被 main 追着改了同一批文件，主人会话都要等 GitHub 报冲突才知道（提交里写 #号不会推送给订阅 PR 的会话）。
//   规则：每个提交在 PR 评论里留标记 nbq-main:<提交号前 7 位>，重复运行不重发；一次运行一个 PR 最多一条（汇总这次的所有相关提交）；
//   机器人的 PR 不发；一律 @ PR 作者（提交作者是会话署名，对不上 PR 作者，不按它判断）；跳过合并提交（「合并 origin/main」的改动文件是另一条线的全部改动，
//   会把没改的文件说成同改；那些改动的原始提交本身也在时间窗里）。纯函数，网络在 main() 里。
export const MAIN_WINDOW_H = 6;                                   // 看板每 3 小时兜底跑一次：看最近 6 小时，漏一轮也接得上
export const mainKey = sha => `nbq-main:${sha.slice(0, 7)}`;
const mentionRe = n => new RegExp(`(^|[^\\w&/#])#${n}(?!\\d)`);
export function mainNotices(prs, commits) {
  const out = [];
  for (const pr of prs) {
    if (pr.author.endsWith('[bot]')) continue;
    const re = mentionRe(pr.number), mine = new Set(pr.files || []), hits = [];
    for (const c of commits) {
      if (c.parents > 1 || already(pr.comments || [], mainKey(c.sha))) continue;
      const same = c.files.map(f => f.filename).filter(f => mine.has(f));
      const lines = [...String(c.message || '').split('\n'), ...c.files.flatMap(f => String(f.patch || '').split('\n').filter(l => l.startsWith('+') && !l.startsWith('+++')).map(l => l.slice(1)))];
      const said = lines.find(l => re.test(l));
      if (same.length || said) hits.push({ c, same, said });
    }
    if (!hits.length) continue;
    const item = h => `- \`${h.c.sha.slice(0, 7)}\` ${String(h.c.message || '').split('\n')[0].slice(0, 60)}：${[h.same.length ? `同改 ${h.same.slice(0, 5).map(f => '`' + f + '`').join('、')}${h.same.length > 5 ? ` 等 ${h.same.length} 个文件` : ''}` : '', h.said ? `提到你：「${h.said.trim().slice(0, 80)}」` : ''].filter(Boolean).join('；')}`;
    out.push({ number: pr.number, body: hits.map(h => `<!-- ${mainKey(h.c.sha)} -->`).join('') + `\n@${pr.author} main 有 ${hits.length} 个新提交和这个 PR 有关：\n${hits.map(item).join('\n')}\n\n下一步：同改了文件 → 合并前 \`bash tools/sync_main.sh\`（\`pr_merge.sh\` 也会提示）；提到你 → 看看那一行要不要你跟进。\n\n> 自动消息（协作看板，#189）。同一个提交只提醒一次。` });
  }
  return out;
}

// 11-18（#363）：依赖链通知。#358 写了「依赖 PR：#357」，#357 合并后没有任何东西叫 #358 的作者往下走（草稿 PR 不走 ping，GitHub 自动改基也不通知）。
//   从 PR 描述「依赖 PR：…」那一行取 #号；依赖的 PR 已合并 → 在这个 PR 上 @ 作者一次（按依赖号去重），写明三步。草稿 / Ready 都发，所有者自己的 PR 和机器人不发。
export const depsOf = body => { const m = /依赖 PR[：:][ \t]*([^\n]*)/.exec(body || ''); return m ? [...new Set([...m[1].matchAll(/#(\d+)/g)].map(x => +x[1]))] : [] };
export const depKey = dep => `nbq-dep:${dep}`;
export const depText = (p, dep) => `<!-- ${depKey(dep)} -->\n@${p.author} #${dep} 已合并，这个 PR 依赖它，可以往下走了：\n1. \`bash tools/sync_main.sh\` 把 main 合进来（GitHub 若已把基改成 main 就不用再改基）；\n2. 看 PR 的 Files changed：只该剩你自己的改动，不该再出现 #${dep} 的文件，再本地测；\n3. 测过后 \`bash tools/pr_state.sh ${p.number} ready\` 转 Ready（你的非草稿在制品 ≤ ${WIP_LIMIT}）。\n\n> 自动消息（协作看板，依赖链）。每个依赖只提醒一次，不用回复。`;
export function depNotices(prs, merged) {
  const out = [];
  for (const p of prs) {
    if (p.author === OWNER || p.author.endsWith('[bot]')) continue;
    for (const dep of p.deps || []) if (dep !== p.number && merged.has(dep) && !already(p.comments || [], depKey(dep))) out.push({ number: p.number, body: depText(p, dep) });
  }
  return out;
}

export function render(rows, now = Date.now()) {
  const order = ['owner', 'review', 'author', 'merge', 'ci'], wipBy = {};
  for (const r of rows) if (!r.p.draft && !/\[bot\]$/.test(r.p.author)) wipBy[r.p.author] = (wipBy[r.p.author] || 0) + 1;
  const wipTxt = Object.entries(wipBy).map(([a, n]) => `${a} ${n} / ${WIP_LIMIT}${n > WIP_LIMIT ? ' ⚠ 超限：先合并 / 转草稿 / 关掉旧的' : ''}`).join(' · ') || '0';
  const line = r => `| #${r.p.number} | ${r.p.author} | ${r.p.draft ? '草稿' : BALL[r.c.ball]} | ${r.c.reason} | ${r.c.next.replace(/\|/g, '/')} | ${r.c.idle} 天 |`;
  const body = order.map(b => [b, rows.filter(r => r.c.ball === b && !r.p.draft)]).filter(([, g]) => g.length).map(([b, g]) => `### ${BALL[b]}（${g.length}）\n| PR | 作者 | 状态 | 原因 | 下一步 | 闲置 |\n|---|---|---|---|---|---|\n${g.map(line).join('\n')}`);
  const dr = rows.filter(r => r.p.draft); if (dr.length) body.push(`### 草稿（${dr.length}）\n| PR | 作者 | 状态 | 原因 | 下一步 | 闲置 |\n|---|---|---|---|---|---|\n${dr.map(line).join('\n')}`);
  return `${GUIDE}\n\n**在制品**（每人 ≤ ${WIP_LIMIT}）：${wipTxt}\n\n${body.join('\n\n') || '（没有开着的 PR）'}`;
}

// #471：maxBuffer 默认 1MB，大合并提交（6a82afd，patch JSON 约 0.9MB+）会 ENOBUFS 让整个看板失败
const gh = (...a) => execFileSync('gh', ['api', ...a], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 256 * 1024 * 1024 }), list = path => JSON.parse(gh('--paginate', '--slurp', path)).flat();
// 取开着的每个 PR 的状态（CI、复核、级别、落后 main 几个提交）并分类 → [{ p, c }]；看板和 tools/review_queue.mjs 共用（11-11：自动复核巡检）
export function gather(R, now = Date.now()) {
  const CO = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.github/CODEOWNERS'), 'utf8');
  const rows = [];
  for (const x of list(`repos/${R}/pulls?state=open&per_page=100`)) {
    // 改动文件用 compare（main...提交，和 pr_merge.sh 看到的一致）；PR 的 files 接口在 main 前进后会滞后，把别人已合并的文件也算进来
    const cmp = JSON.parse(gh(`repos/${R}/compare/main...${x.head.sha}`, '--jq', '{files:[.files[].filename],behind:.behind_by}')), files = cmp.files;
    const runs = JSON.parse(gh(`repos/${R}/actions/runs?head_sha=${x.head.sha}&per_page=50`)).workflow_runs;
    const st = w => runState(runs, w, now);
    const comments = list(`repos/${R}/issues/${x.number}/comments?per_page=100`).map(c => ({ body: c.body || '', bot: c.user?.type === 'Bot', at: c.created_at }));
    const syncs = syncsOf(list(`repos/${R}/pulls/${x.number}/commits?per_page=100`).map(c => ({ parents: c.parents, message: c.commit.message })));
    const mergeable = gh(`repos/${R}/pulls/${x.number}`, '--jq', '.mergeable_state').trim();
    const lv = levelOf(files, CO), isCo = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.github/CO_OWNERS'), 'utf8').split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#')).includes(x.user.login);
    const p = { number: x.number, title: x.title, branch: x.head.ref, author: x.user.login, draft: x.draft, sha: x.head.sha, mergeable, behind: cmp.behind, syncs, files, coOwner: isCo && lv.level === 'owner' && coOwns(lv.owner, CO, x.user.login), updated: x.updated_at, level: lv.level, ci: { tests: st('tests'), fast: st('tests-fast') }, labels: x.labels.map(l => l.name), deps: depsOf(x.body), comments };
    p.db = dbFacts(x.number, p.sha, files); if (p.db.changed && p.db.parity === null) console.log(`::warning title=协作看板::#${x.number} 含数据库改动，但 db-parity 的判断取不到：${p.db.why}。看板暂不提醒所有者，请查原因（别让这个功能静默失效）`);   // 只有含库结构文件的 PR 才会去调 merge_drift.sh（很少）
    p.review = reviewState(comments, p.sha, p.level === 'review' ? gitCarry(x.number, p.sha) : undefined); rows.push({ p, c: classify(p, now) });
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
    if ((p.syncs || 0) >= SYNC_LOOP && ['owner', 'merge'].includes(c.ball) && !p.draft && p.author !== OWNER && !p.author.endsWith('[bot]') && !already(p.comments, `nbq-syncloop:${p.number}`)) post(p.number, syncText(p, p.syncs));
    const oa = ownerActPost(p, c, p.comments, now); if (oa) post(p.number, oa.body);   // 所有者要做的事：在 PR 上 @ 他（作者是所有者本人也一样要提醒，所以放在下面的 continue 之前）
    if (!c.ping || p.author === OWNER || p.author.endsWith('[bot]')) continue;
    if (!already(p.comments, pingKey(p, c))) post(p.number, pingText(p, c));
    else if (c.idle >= IDLE_DAYS && c.ball !== 'merge' && !already(p.comments, `nbq-idle:${isoWeek(now)}`)) post(p.number, idleText(p, c, now));
  }
  // main 有新提交 → 告诉相关的开着的 PR（#189）。每个提交一次 API 取改动文件和新增行
  const since = new Date(now - MAIN_WINDOW_H * 36e5).toISOString();
  const commits = list(`repos/${R}/commits?sha=main&since=${since}&per_page=100`).map(c => { let d = {}; try { d = JSON.parse(gh(`repos/${R}/commits/${c.sha}`)) } catch (e) { console.log(`::warning::取提交 ${c.sha.slice(0, 7)} 详情失败（${String(e.code || e.message).slice(0, 60)}），按「无改动文件」处理，不拖垮整个看板（#471）`) }
    return { sha: c.sha, parents: (c.parents || []).length, message: d.commit?.message || '', files: (d.files || []).map(f => ({ filename: f.filename, patch: f.patch || '' })) } });
  for (const n of mainNotices(rows.map(r => r.p), commits)) post(n.number, n.body);
  // 依赖链（#363）：只查被依赖的 PR 号（通常 0–2 个）是否已合并；查不到（不是 PR / 无权限）= 当没合并
  const merged = new Set(); for (const d of new Set(rows.flatMap(r => r.p.deps))) { try { if (gh(`repos/${R}/pulls/${d}`, '--jq', '.merged').trim() === 'true') merged.add(d) } catch { } }
  for (const n of depNotices(rows.map(r => r.p), merged)) post(n.number, n.body);
  // 看板 Issue（标签「协作看板」，没有就建）：正文只在内容变化时写；红线集合变了 @所有者 一次
  const hash = h6(board), when = new Date(now).toLocaleString('zh-CN', { timeZone: 'Australia/Melbourne', hour12: false }), okey = ownerKey(rows);
  if (dry) { console.log(`[看板] hash ${hash}，需要所有者：${okey || '无'}`); return }
  try { gh('-X', 'POST', `repos/${R}/labels`, '-f', 'name=协作看板', '-f', 'color=1d76db') } catch { }
  let issue = list(`repos/${R}/issues?labels=${encodeURIComponent('协作看板')}&state=open&per_page=5`)[0];
  const full = `${board}\n\n<!-- nbq-board:${hash} -->\n_更新于 ${when}（墨尔本）· 由 tools/collab_board.mjs 自动生成，别手改_`;
  if (!issue) issue = JSON.parse(gh('-X', 'POST', `repos/${R}/issues`, '-f', 'title=协作看板（自动更新，别手改）', '-f', 'labels[]=协作看板', '-f', `body=${full}`));
  else if (!(issue.body || '').includes(`nbq-board:${hash}`)) gh('-X', 'PATCH', `repos/${R}/issues/${issue.number}`, '-f', `body=${full}`);
  const prev = list(`repos/${R}/issues/${issue.number}/comments?per_page=100`).filter(c => c.body.includes('nbq-owner-set:')).pop()?.body.match(/nbq-owner-set:([\d,]*)/)?.[1];
  if (okey && okey !== prev) post(issue.number, `<!-- nbq-owner-set:${okey} -->\n@${OWNER} 现在需要你的 PR：${rows.filter(r => r.c.ball === 'owner').map(r => `#${r.p.number} ${r.p.title}（${r.c.reason}）`).join('；')}。其余不用你处理。`);
  else if (!okey && prev) post(issue.number, `<!-- nbq-owner-set: -->\n现在没有需要所有者处理的 PR。`);
}
if (process.argv[1] && fs.realpathSync(path.resolve(process.argv[1])) === fs.realpathSync(fileURLToPath(import.meta.url))) main();
