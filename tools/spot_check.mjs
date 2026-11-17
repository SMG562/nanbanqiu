#!/usr/bin/env node
// 合并后抽查（#214 阶段 1d）：自助合并（没做独立复核）的 PR，每周抽 3 个，由「另一侧」回看——对冲「非红线自助合并」的风险。
//   node tools/spot_check.mjs [--n=3] [--days=7] [--week=2026-W46]    要 GH_TOKEN / GITHUB_TOKEN（或 gh 登录）；只读，不写任何东西
//   node tools/spot_check.mjs --from=<json>                           离线：{ pulls:[{number,title,user,merged_at,reviewed}], week }
// 抽法：窗口内合并、非机器人、没有「独立复核」留言的 PR；同一周同样的输入抽出同样的结果（按 周 + PR 号 的哈希排序，可复现、可复算）；
//   尽量两边各抽一半（所有者的 PR 由协作者侧回看，协作者的由所有者侧回看）；某一边不够就用另一边补。
// 回看什么：改动是否真的无需复核（分级对不对）、有没有漏测、描述和实际是否一致；发现问题记 逃逸缺陷.md，同类第二次升级成自动检查。
import crypto from 'node:crypto'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
export const OWNER = 'SMG562';
export const isoWeek = t => { const d = new Date(Date.UTC(...(x => [x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate()])(new Date(t)))), n = d.getUTCDay() || 7; d.setUTCDate(d.getUTCDate() + 4 - n); const y = d.getUTCFullYear(); return `${y}-W${String(Math.ceil(((d - Date.UTC(y, 0, 1)) / 864e5 + 1) / 7)).padStart(2, '0')}` };
const h = (week, n) => crypto.createHash('sha1').update(`${week}:${n}`).digest('hex');
export function pick(pulls, week, n = 3) {
  const pool = pulls.filter(p => !p.reviewed && p.user && !/\[bot\]$/.test(p.user)).sort((a, b) => h(week, a.number).localeCompare(h(week, b.number)));
  const mine = pool.filter(p => p.user === OWNER), theirs = pool.filter(p => p.user !== OWNER), out = [];
  for (let i = 0; out.length < n && (i < mine.length || i < theirs.length); i++) for (const g of [theirs, mine]) if (out.length < n && g[i]) out.push({ ...g[i], reviewer: g === mine ? '协作者侧' : '所有者侧' });
  return out;
}
export const render = (picked, week) => `## 合并后抽查（${week}）\n\n${picked.length ? picked.map(p => `- #${p.number} ${p.title}（作者 ${p.user}，${p.merged_at.slice(0, 10)} 合并）→ **${p.reviewer}** 回看`).join('\n') : '- 本周没有符合条件的自助合并 PR'}\n\n回看清单：分级对不对（该复核的有没有漏）、有没有漏测、PR 描述与实际改动是否一致。在这条下面回复「已回看 #号：没问题 / 有问题：…」；有问题记 \`逃逸缺陷.md\`。\n`;
async function gh(url, token) { const r = await fetch('https://api.github.com/' + url, { headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json', 'User-Agent': 'nbq-spot-check' } }); if (!r.ok) throw new Error(`${url} → ${r.status}`); return r.json() }
async function fetchPulls(repo, token, days, now) {
  const since = now - days * 864e5, out = [];
  for (let p = 1; p <= 5; p++) { const j = await gh(`repos/${repo}/pulls?state=closed&sort=updated&direction=desc&per_page=100&page=${p}`, token); for (const x of j) if (x.merged_at && Date.parse(x.merged_at) >= since) out.push({ number: x.number, title: x.title, user: x.user?.login, merged_at: x.merged_at }); if (j.length < 100 || Date.parse(j.at(-1).updated_at) < since) break }
  for (const x of out) { const cs = await gh(`repos/${repo}/issues/${x.number}/comments?per_page=100`, token); x.reviewed = cs.some(c => c.user?.type !== 'Bot' && /^\s*(<!--[\s\S]*?-->\s*)*独立复核/.test(c.body || '')) }
  return out;
}
if (process.argv[1] && fs.realpathSync(path.resolve(process.argv[1])) === fs.realpathSync(fileURLToPath(import.meta.url))) {
  const arg = k => (process.argv.find(a => a.startsWith(`--${k}=`)) || '').split('=').slice(1).join('='), n = Number(arg('n') || 3), days = Number(arg('days') || 7);
  let pulls, week;
  if (arg('from')) { const j = JSON.parse(fs.readFileSync(arg('from'), 'utf8')); pulls = j.pulls; week = arg('week') || j.week }
  else { const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN; if (!token) { console.error('要 GH_TOKEN / GITHUB_TOKEN（或用 --from=<json> 离线跑）'); process.exit(2) } const now = Date.now(); week = arg('week') || isoWeek(now); pulls = await fetchPulls(process.env.GITHUB_REPOSITORY || 'SMG562/nanbanqiu', token, days, now) }
  console.log(render(pick(pulls, week, n), week));
}
