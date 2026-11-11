#!/usr/bin/env node
// 开工前 30 秒查「会不会撞车」（11-11，协作分工与消息协议 §3）。多个会话 / 协作者并行时，浪费几乎都来自「两个人同时改同一个文件」：
//   node tools/overlap_check.mjs                 本分支（相对 origin/main）改的文件：哪些有别的开着的 PR 也在改、哪些是热点
//   node tools/overlap_check.mjs a.js dir/       指定文件 / 目录前缀（还没开工、只是打算改它们时用）
//   node tools/overlap_check.mjs --prs           开着的 PR 两两之间同改了哪些文件（handoff_check 会带上）
//   node tools/overlap_check.mjs --hot [天] [次]   热点文件：近 N 天（默认 14）被提交 ≥ 次（默认 15）的文件
// 只读：不改任何东西；gh 读不到时只报热点。
import { execFileSync } from 'node:child_process'; import path from 'node:path'; import fs from 'node:fs'; import { fileURLToPath } from 'node:url';
const SKIP = /^(tests\/reports\/|marketing\/|site\/|icons\/|南伴球_(PWA|Web|后台)\.html$|server\/migrations\/_bundle\.sql$)/;   // 含生成文件（ADR 0011 起不入库，旧分支还带着）
export const AUTO = /^(tests\/run_all\.mjs|src\/[^/]*\.list)$/;   // .gitattributes 里 merge=union：两边各加一行自动合并，不算撞车
export const hotFiles = (logText, min = 15) => { const c = new Map(); for (const l of logText.split('\n')) { const f = l.trim(); if (f && !SKIP.test(f)) c.set(f, (c.get(f) || 0) + 1) }
  return [...c].filter(([, n]) => n >= min).sort((a, b) => b[1] - a[1]) };
// prFiles: { 号: [文件…] } → [{ a, b, files }]（只列有重叠的）
export const pairwise = prFiles => { const ks = Object.keys(prFiles), out = [];
  for (let i = 0; i < ks.length; i++) for (let j = i + 1; j < ks.length; j++) { const s = new Set(prFiles[ks[j]]), files = prFiles[ks[i]].filter(f => s.has(f)); if (files.length) out.push({ a: ks[i], b: ks[j], files }) }
  return out };
export const touches = (files, targets) => files.filter(f => targets.some(t => f === t || (t.endsWith('/') && f.startsWith(t))));
const sh = (...a) => execFileSync(a[0], a.slice(1), { encoding: 'utf8', maxBuffer: 1 << 26, stdio: ['ignore', 'pipe', 'pipe'] });
const gh = (...a) => JSON.parse(sh('gh', 'api', ...a));
const hot = (days, min) => hotFiles(sh('git', '-c', 'core.quotepath=false', 'log', `--since=${days}.days`, '--name-only', '--pretty=format:', 'origin/main'), min);
function openPRs(R) { const ps = gh('--paginate', `repos/${R}/pulls?state=open&per_page=100`).filter(p => !/dependabot/.test(p.user.login)), o = {};
  for (const p of ps) o[p.number] = { head: p.head.ref, draft: p.draft, files: gh('--paginate', `repos/${R}/pulls/${p.number}/files?per_page=100`).map(f => f.filename) }; return o }
function main() {
  const A = process.argv.slice(2), R = process.env.GITHUB_REPOSITORY || 'SMG562/nanbanqiu';
  if (A[0] === '--hot') { const d = +A[1] || 14, m = +A[2] || 15, h = hot(d, m); console.log(`热点文件（近 ${d} 天提交 ≥ ${m} 次）：`); h.forEach(([f, n]) => console.log(`  ${String(n).padStart(3)}  ${f}`)); if (!h.length) console.log('  无'); return }
  let prs; try { prs = openPRs(R) } catch { prs = null }
  if (A[0] === '--prs') { if (!prs) { console.log('  读不到开着的 PR（gh 未登录？）'); return }
    const pw = pairwise(Object.fromEntries(Object.entries(prs).map(([n, p]) => [n, p.files.filter(f => !/\.md$/.test(f) && !SKIP.test(f) && !AUTO.test(f))]))); if (!pw.length) console.log('  无（开着的 PR 之间没有同改的代码文件）');
    for (const [n, p] of Object.entries(prs)) if (p.files.some(f => /^南伴球_(PWA|Web|后台)\.html$|_bundle\.sql$/.test(f))) console.log(`  ℹ️ #${n} 还带着生成文件（ADR 0011 起不入库）：合并 main 时 sync_main.sh 会自动跟着删掉，不用手工处理`);
    pw.forEach(x => console.log(`  #${x.a} × #${x.b} 同改：${x.files.slice(0, 6).join('、')}${x.files.length > 6 ? ` 等 ${x.files.length} 个` : ''} → 串行：先合一个，另一个再 sync_main`)); return }
  let mine = A, self = '';
  if (!A.length) { try { self = sh('git', 'rev-parse', '--abbrev-ref', 'HEAD').trim(); mine = sh('git', '-c', 'core.quotepath=false', 'diff', '--name-only', 'origin/main...HEAD').split('\n').filter(Boolean) } catch { mine = [] } }
  if (!mine.length) { console.log('没有可查的文件（分支相对 origin/main 没有改动；或传文件 / 目录前缀）'); return }
  const hs = new Map(hot(14, 15)); let bad = 0;
  for (const f of mine.filter(f => !SKIP.test(f) && !AUTO.test(f))) if (hs.has(f)) { bad++; console.log(`🔥 热点 ${f}（近 14 天 ${hs.get(f)} 次）：改动保持小而快，单独成 PR，先合`) }
  if (prs) for (const [n, p] of Object.entries(prs)) { if (p.head === self) continue; const hit = [...new Set(touches(p.files, mine))].filter(f => !AUTO.test(f)); if (hit.length) { bad++; console.log(`⚠️ #${n}（${p.head}${p.draft ? '，草稿' : ''}）也在改：${hit.slice(0, 6).join('、')}${hit.length > 6 ? ` 等 ${hit.length} 个` : ''} → 串行，或先在那个 Issue 里说一声`) } }
  else console.log('（gh 读不到开着的 PR，只查了热点）');
  if (!bad) console.log('✅ 没有撞车风险：没人在改这些文件，也不是热点');
}
if (process.argv[1] && fs.realpathSync(path.resolve(process.argv[1])) === fs.realpathSync(fileURLToPath(import.meta.url))) main();
