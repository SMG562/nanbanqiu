#!/usr/bin/env node
// 待独立复核的 PR 队列（11-11，docs/协作分工.md §3b）：「球在复核」= 非草稿 + 两个 CI 都绿 + 级别需要复核 + 还没有对当前提交的「通过」。
// 两边（所有者侧、协作者侧）的定时会话都读它，按 tools/review_sweep.md 复核；不复核自己写的（作者 = 当前 gh 账号的跳过）。
//   node tools/review_queue.mjs [--me=<账号>] [--json]     不写任何东西；要 gh 登录
import { execFileSync } from 'node:child_process'; import path from 'node:path'; import fs from 'node:fs'; import { fileURLToPath } from 'node:url';
import { gather } from './collab_board.mjs';
export const queue = (rows, me) => rows.filter(({ p, c }) => c.ball === 'review' && !p.draft && p.author !== me)
  .map(({ p, c }) => ({ number: p.number, title: p.title, author: p.author, branch: p.branch, sha: p.sha.slice(0, 7), why: c.reason, idleDays: c.idle })).sort((a, b) => b.idleDays - a.idleDays || a.number - b.number);
function main() {
  const A = process.argv.slice(2), R = process.env.GITHUB_REPOSITORY || 'SMG562/nanbanqiu';
  const me = (A.find(x => x.startsWith('--me=')) || '').slice(5) || execFileSync('gh', ['api', 'user', '--jq', '.login'], { encoding: 'utf8' }).trim();
  const q = queue(gather(R), me);
  if (A.includes('--json')) { console.log(JSON.stringify(q)); return }
  if (!q.length) { console.log(`没有待复核的 PR（我是 ${me}；不含自己写的、草稿、CI 没绿的）`); return }
  console.log(`待独立复核（我是 ${me}，已排除自己写的）：`); q.forEach(x => console.log(`  #${x.number} ${x.branch} @${x.sha}（${x.author}，${x.why}，闲置 ${x.idleDays} 天）${x.title}`));
}
if (process.argv[1] && fs.realpathSync(path.resolve(process.argv[1])) === fs.realpathSync(fileURLToPath(import.meta.url))) main();
