// tools/weekly_metrics.mjs：每周研发指标的计算与告警（11-07）。
import { compute, render, WIP_LIMIT, isMergeMain } from '../../tools/weekly_metrics.mjs';
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x ? ' ' + JSON.stringify(x) : '')) };
const now = '2026-11-08T00:00:00Z', at = (h, m = 0) => new Date(Date.parse(now) - h * 3600e3 + m * 60e3).toISOString();
const run = (o) => ({ path: '.github/workflows/tests.yml', event: 'push', head_branch: 'main', head_sha: 'a', status: 'completed', conclusion: 'success', created_at: at(10), run_started_at: at(10), updated_at: at(10, 10), ...o });
const runs = [
  run({ head_sha: 'a' }), run({ head_sha: 'a', path: '.github/workflows/tests-fast.yml' }), run({ head_sha: 'b' }),
  run({ head_sha: 'c', conclusion: 'cancelled', updated_at: at(10, 5) }),
  run({ event: 'pull_request', head_branch: 'x', head_sha: 'p1', conclusion: 'failure', pull_requests: [{ number: 7 }] }),
  run({ event: 'pull_request', head_branch: 'x', head_sha: 'p1', pull_requests: [{ number: 7 }] }),
  ...[2, 3, 4].map(i => run({ event: 'pull_request', head_branch: 'x', head_sha: 'p' + i, pull_requests: [{ number: 7 }] })),
  run({ event: 'pull_request', head_branch: 'y', head_sha: 'd1', conclusion: 'skipped', pull_requests: [{ number: 8 }] }),
  run({ path: '.github/workflows/smoke.yml', head_sha: 'a', created_at: at(9), run_started_at: at(9), updated_at: at(9, 1) }),
  run({ path: '.github/workflows/smoke.yml', head_sha: 'b', conclusion: 'failure', created_at: at(6), run_started_at: at(6), updated_at: at(6, 1) }),
  run({ path: '.github/workflows/smoke.yml', event: 'schedule', head_sha: 'b', created_at: at(4), run_started_at: at(4), updated_at: at(4, 0) }),
  run({ head_sha: 'old', created_at: at(24 * 9) }),   // 窗口外
];
const pulls = [
  { number: 7, state: 'closed', created_at: at(30), merged_at: at(10), updated_at: at(10) },
  { number: 9, state: 'closed', created_at: at(14), merged_at: at(4), updated_at: at(4) },
  { number: 10, state: 'open', draft: false, created_at: at(3) }, { number: 11, state: 'open', draft: false, created_at: at(3) },
  { number: 12, state: 'open', draft: false, created_at: at(3) }, { number: 13, state: 'open', draft: true, created_at: at(3) },
];
const m = compute({ runs, pulls, now });
T('部署频率 = 推到 main 的不同提交（窗口外不算）', m.deploys === 3, m.deploys);
T('前置时间 = 开 PR→合并的中位数（20h、10h → 15h）', m.lead === 15 && m.merged === 2, [m.lead, m.merged]);
T('变更失败率只看推 main 的 smoke（1 过 1 挂 → 50%）', m.cfr === 0.5 && m.smokeN === 2, [m.cfr, m.smokeN]);
T('恢复时间 = smoke 失败 → 下次通过结束（2 小时）', m.mttr === 2, m.mttr);
T('被取消的运行单列分钟', m.cancelled === 5, m.cancelled);
T('窗口外的运行不算进 CI 分钟', !Object.values(m.byWf).some(v => v.n > 100) && m.byWf.tests.n === 9, m.byWf);
T('同一提交既挂又过 → 不稳定信号；smoke 失败后恢复不算', m.flaky.join() === 'tests@p1', m.flaky);
T('浏览器测试 ≥5 次的 PR 被点名；草稿 skipped 不计', m.heavyPr.length === 1 && m.heavyPr[0][0] === '7' && m.heavyPr[0][1] === 5, m.heavyPr);
T('并行 PR 只数开着的非草稿', m.wip.length === 3 && WIP_LIMIT === 2, m.wip);
T('并行 PR 按作者分别记，只有某人超限才告警', (() => { const w = { ...m, wipBy: { A: 2, B: 3 } }; const t = render(w); return /B 同时开着 3 个/.test(t) && !/A 同时开着/.test(t) })());
T('合并 main 识别有词边界：main-fix / maintenance 不算', !isMergeMain("Merge branch 'main-fix' into x") && !isMergeMain("Merge branch 'maintenance'") && isMergeMain("Merge branch 'main' into feat/x") && isMergeMain("Merge remote-tracking branch 'origin/main'"));
const md = render(m);
T('周报含 DORA 四项和告警', ['部署频率', '变更前置时间', '变更失败率', '恢复时间', '并行 PR'].every(k => md.includes(k)) && md.includes('上限 2') && md.includes('#7×5') && md.includes('tests@p1'));
T('没有问题时写「无」', render(compute({ runs: [], pulls: [], now })).includes('- 无'));
// #214 阶段 0：前置时间按作者拆 + 「合并 main」占比 + 目标告警
{ const P = (u, h, o = {}) => ({ number: 1, state: 'closed', user: { login: u }, created_at: at(h + 1), merged_at: at(1), updated_at: at(1), ...o });
  const pulls2 = [P('A', 1), P('A', 2), P('A', 3), P('B', 30), P('B', 40), P('B', 60), P('dependabot[bot]', 5, { user: { login: 'dependabot[bot]', type: 'Bot' } })];
  const cm = n => Array.from({ length: n }, (_, i) => ({ commit: { message: i < 3 ? '合并 origin/main，为快进合并做准备' : 'x' + i } }));
  const m2 = compute({ runs: [], pulls: pulls2, now, commits: cm(20) }), txt = render(m2);
  T('按作者拆：A 中位 2h、B 中位 40h；机器人不算', m2.leadBy.length === 2 && m2.leadBy.find(x => x.u === 'A').med === 2 && m2.leadBy.find(x => x.u === 'B').med === 40, m2.leadBy);
  T('p90 按最近秩：B 三个 30/40/60 → 60', m2.leadBy.find(x => x.u === 'B').p90 === 60);
  T('B 超目标（中位 > 8h）→ 告警，A 不告警', /B 的 PR 开→合并中位/.test(txt) && !/A 的 PR 开→合并中位/.test(txt), txt.slice(-500));
  T('合并 main 占比 3/20 = 15% > 10% → 告警', m2.mergeMain.n === 3 && /「合并 main」提交占 15%/.test(txt));
  T('样本太少（< 3 个 PR / < 20 个提交）不告警', !/的 PR 开→合并中位/.test(render(compute({ runs: [], pulls: pulls2.slice(3, 5), now }))) && !/提交占/.test(render(compute({ runs: [], pulls: [], now, commits: cm(10) }))));
  T('没传 commits（离线 / 旧数据）→ 不报错、显示 —', compute({ runs: [], pulls: [], now }).mergeMain === null && /占比 \| — \|/.test(render(compute({ runs: [], pulls: [], now }))));
}
console.log(`\nweekly_metrics: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
