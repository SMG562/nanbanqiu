#!/usr/bin/env node
// 每周研发指标（11-07）：DORA 四项 + CI 分钟 + 不稳定信号 + 并行 PR，用数字盯效率和质量，不靠感觉。
//   node tools/weekly_metrics.mjs [--days=7]        要 GH_TOKEN（或 GITHUB_TOKEN）、GITHUB_REPOSITORY（默认 SMG562/nanbanqiu）
//   node tools/weekly_metrics.mjs --from=<json>     离线：{ runs, pulls, now } （测试用）
// 输出 Markdown；在 Actions 里同时写进 $GITHUB_STEP_SUMMARY。时长按运行的开始→结束算（≈计费分钟，多任务并行时偏小）。
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';

const H = 3600e3, mins = r => Math.max(0, (Date.parse(r.updated_at) - Date.parse(r.run_started_at || r.created_at)) / 60e3);
const median = a => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2 };
const wf = r => (r.path || '').replace('.github/workflows/', '').replace(/\.ya?ml$/, '') || r.name;
export const WIP_LIMIT = 2, MIN_PER_DAY_BUDGET = 100;   // 私有仓库每月 3000 分钟 ≈ 每天 100 分钟

export function compute({ runs, pulls, now, days = 7 }) {
  const t1 = Date.parse(now), t0 = t1 - days * 24 * H, inWin = t => { const x = Date.parse(t); return x >= t0 && x <= t1 };
  runs = runs.filter(r => inWin(r.created_at));
  // 部署频率：推到 main 的不同提交数
  const deploys = new Set(runs.filter(r => r.event === 'push' && r.head_branch === 'main').map(r => r.head_sha)).size;
  // 变更前置时间：窗口内合并的 PR，开 PR → 合并（小时）
  const merged = pulls.filter(p => p.merged_at && inWin(p.merged_at));
  const lead = median(merged.map(p => (Date.parse(p.merged_at) - Date.parse(p.created_at)) / H));
  // 变更失败率 / 恢复时间：看 smoke（推 main 后核对线上 + 每 6 小时）
  const smoke = runs.filter(r => wf(r) === 'smoke' && r.status === 'completed' && ['success', 'failure'].includes(r.conclusion)).sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
  const smokePush = smoke.filter(r => r.event === 'push');
  const cfr = smokePush.length ? smokePush.filter(r => r.conclusion === 'failure').length / smokePush.length : null;
  const mttr = []; let down = null;
  for (const r of smoke) { if (r.conclusion === 'failure') down ??= Date.parse(r.created_at); else if (down != null) { mttr.push((Date.parse(r.updated_at) - down) / H); down = null } }
  // CI 分钟：按工作流；被取消的单列（白花）
  const byWf = {}; let total = 0, cancelled = 0;
  for (const r of runs) { const m = mins(r); total += m; (byWf[wf(r)] ??= { n: 0, m: 0 }); byWf[wf(r)].n++; byWf[wf(r)].m += m; if (r.conclusion === 'cancelled') cancelled += m }
  // 每个 PR 跑了几次浏览器测试（次数多 = PR 太大或边做边推）
  const perPr = {};
  for (const r of runs) if (wf(r) === 'tests' && r.event === 'pull_request' && r.conclusion !== 'skipped') { const n = r.pull_requests?.[0]?.number ?? r.head_branch; perPr[n] = (perPr[n] || 0) + 1 }
  const heavyPr = Object.entries(perPr).filter(([, n]) => n >= 5).sort((a, b) => b[1] - a[1]);
  // 不稳定信号：同一提交、同一测试工作流既有失败又有通过（代码没变结果变了）。smoke / db-parity / pr-checklist 看的是线上、库、PR 描述，结果本就会变，不算
  const seen = {};
  for (const r of runs) if (['tests', 'tests-fast'].includes(wf(r)) && ['success', 'failure'].includes(r.conclusion)) { const k = wf(r) + '@' + String(r.head_sha).slice(0, 7); (seen[k] ??= new Set()).add(r.conclusion) }
  const flaky = Object.entries(seen).filter(([, s]) => s.size === 2).map(([k]) => k);
  // 并行 PR：现在开着、非草稿的
  const wipPulls = pulls.filter(p => p.state === 'open' && !p.draft), wip = wipPulls.map(p => p.number), wipBy = {};
  for (const p of wipPulls) { const a = p.user?.login ?? '?'; wipBy[a] = (wipBy[a] || 0) + 1 }
  return { days, deploys, merged: merged.length, lead, cfr, smokeN: smokePush.length, mttr: median(mttr), total, cancelled, byWf, heavyPr, flaky, wip, wipBy };
}

const f1 = x => x == null ? '—' : (Math.round(x * 10) / 10).toString();
export function render(m) {
  const warn = [];
  if (m.total / m.days > MIN_PER_DAY_BUDGET) warn.push(`CI 平均每天 ${Math.round(m.total / m.days)} 分钟，超过私有仓库额度折算的 ${MIN_PER_DAY_BUDGET} 分钟/天`);
  if (m.cancelled > m.total * 0.1) warn.push(`被取消的运行花了 ${Math.round(m.cancelled)} 分钟（${Math.round(m.cancelled / m.total * 100)}%）：改动攒成一次推送`);
  for (const [a, n] of Object.entries(m.wipBy ?? {})) if (n > WIP_LIMIT) warn.push(`${a} 同时开着 ${n} 个非草稿 PR（每人上限 ${WIP_LIMIT}）：先合并或转草稿`);
  if (m.heavyPr.length) warn.push(`浏览器测试跑了 5 次以上的 PR：${m.heavyPr.map(([n, c]) => `${/^\d+$/.test(n) ? '#' : ''}${n}×${c}`).join('、')}（拆小 / 先草稿）`);
  if (m.flaky.length) warn.push(`同一提交时过时不过（不稳定，要修不要跳过）：${m.flaky.slice(0, 8).join('、')}`);
  if (m.cfr != null && m.cfr > 0.15) warn.push(`上线后 smoke 失败率 ${Math.round(m.cfr * 100)}%（目标 ≤ 15%）`);
  const rows = Object.entries(m.byWf).sort((a, b) => b[1].m - a[1].m).map(([k, v]) => `| ${k} | ${v.n} | ${Math.round(v.m)} |`).join('\n');
  return `## 研发周报（近 ${m.days} 天）

| 指标 | 数值 | 说明 |
|---|---|---|
| 部署频率 | ${m.deploys} 次 | 推到 main 的不同提交 |
| 变更前置时间 | ${f1(m.lead)} 小时 | 开 PR → 合并的中位数（${m.merged} 个 PR） |
| 变更失败率 | ${m.cfr == null ? '—' : Math.round(m.cfr * 100) + '%'} | 推 main 后 smoke 失败的比例（${m.smokeN} 次） |
| 恢复时间 | ${f1(m.mttr)} 小时 | smoke 从失败到再次通过的中位数 |
| CI 分钟 | ${Math.round(m.total)}（被取消 ${Math.round(m.cancelled)}） | 每天 ${Math.round(m.total / m.days)} |
| 并行 PR | ${m.wip.length} 个 | 非草稿，每人上限 ${WIP_LIMIT}（${Object.entries(m.wipBy ?? {}).map(([a, n]) => `${a} ${n}`).join('、') || '—'}） |

${warn.length ? '### 要处理\n' + warn.map(w => '- ' + w).join('\n') : '### 要处理\n- 无'}

<details><summary>CI 分钟按工作流</summary>

| 工作流 | 次数 | 分钟 |
|---|---|---|
${rows}
</details>
`;
}

async function gh(url, token) {
  const r = await fetch('https://api.github.com/' + url, { headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json', 'User-Agent': 'nbq-weekly-metrics' } });
  if (!r.ok) throw new Error(`${url} → ${r.status}`); return r.json();
}
async function fetchAll(repo, token, days, now) {
  const since = new Date(Date.parse(now) - days * 24 * H).toISOString().slice(0, 10), runs = [], pulls = [];
  for (let p = 1; p <= 20; p++) { const j = await gh(`repos/${repo}/actions/runs?created=>=${since}&per_page=100&page=${p}`, token); runs.push(...j.workflow_runs); if (j.workflow_runs.length < 100) break }
  for (let p = 1; p <= 5; p++) { const j = await gh(`repos/${repo}/pulls?state=all&sort=updated&direction=desc&per_page=100&page=${p}`, token); pulls.push(...j); if (j.length < 100 || Date.parse(j.at(-1).updated_at) < Date.parse(since)) break }
  return { runs, pulls };
}

if (process.argv[1] && fs.realpathSync(path.resolve(process.argv[1])) === fs.realpathSync(fileURLToPath(import.meta.url))) {
  const arg = k => (process.argv.find(a => a.startsWith(`--${k}=`)) || '').split('=').slice(1).join('=');
  const days = Number(arg('days') || 7);
  let data;
  if (arg('from')) data = JSON.parse(fs.readFileSync(arg('from'), 'utf8'));
  else {
    const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
    if (!token) { console.error('要 GH_TOKEN / GITHUB_TOKEN（或用 --from=<json> 离线跑）'); process.exit(2) }
    const now = new Date().toISOString();
    data = { ...(await fetchAll(process.env.GITHUB_REPOSITORY || 'SMG562/nanbanqiu', token, days, now)), now };
  }
  const md = render(compute({ ...data, days }));
  console.log(md);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);
}
