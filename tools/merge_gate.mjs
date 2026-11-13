#!/usr/bin/env node
// merge-gate（#229 第 3 项 / #214 阶段 2a）：把 pr_merge.sh 的「能不能合」判断抽成只读检查。只读：不推、不合、不评论、不触发任何工作流。
//   node tools/merge_gate.mjs <PR号>            打印每一项 ✅/❌ 和结论（退出码 0 = 可合并，1 = 不可，2 = 读不到）
//   node tools/merge_gate.mjs <PR号> --json     同上，输出 JSON（供周报 / 看板）
//   node tools/merge_gate.mjs <PR号> --shadow   影子运行：同时跑 `pr_merge.sh <号> --check`，比较两边结论，输出一行 JSON（agree: true/false）
// 现在**不是**必需检查，也不会开 auto-merge：影子运行一周、与 pr_merge.sh 结论一致率 ≥ 95% 后，才由所有者决定设为必需检查（红线）。
// 判断全在 evaluate(facts)（纯函数，tests/unit/merge_gate.mjs 逐项覆盖）；gather(N) 只负责从 GitHub / git 取事实，复用 review_state / review_carry / decision_card / pr_body_check / merge_drift，不再另写一份规则。
import { execFileSync, spawnSync } from 'node:child_process'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..'), R = 'SMG562/nanbanqiu';
const ok = (id, msg) => ({ id, ok: true, msg }), no = (id, msg) => ({ id, ok: false, msg });

// facts: { state, base, sha, ff:'ff'|'relaxed'|'no', ffWhy, docsOnly, ci:{'tests-fast','tests'}: 'success'|<其它描述>|null,
//          dbChanged, dbParity:bool, bodyOk:bool, bodyWhy, level:'owner'|'review'|'self', me, coOwners:[], reviewPass:[7位], carryWhy:string|null, clean:bool }
export function evaluate(f) {
  const r = [], s7 = String(f.sha || '').slice(0, 7);
  r.push(f.state === 'open' && f.base === 'main' ? ok('open', `PR 打开着，目标 main（${s7}）`) : no('open', `PR 状态 ${f.state} / 目标 ${f.base}`));
  r.push(f.ff === 'ff' ? ok('ff', '可以快进') : f.ff === 'relaxed' ? ok('ff', `main 前进了，但${f.ffWhy}（放宽）`) : no('ff', `不能快进：${f.ffWhy || 'main 有 PR 之外的新提交'}`));
  for (const w of ['tests-fast', 'tests']) {
    if (f.docsOnly) r.push(ok(w, `${w}：只改了 *.md，不需要运行记录`));
    else r.push(f.ci?.[w] === 'success' ? ok(w, `${w} 通过`) : no(w, `${w}：${f.ci?.[w] ?? '这个提交还没有运行记录'}`));
  }
  r.push(!f.otherFail ? ok('others', '其他 PR 检查没有红的') : no('others', `其他检查红了：${f.otherFail}`));
  r.push(!f.dbChanged ? ok('db', '没改数据库结构，不需要 db-parity') : f.dbParity ? ok('db', 'db-parity 在这个提交之后通过') : no('db', '改了数据库：需要在这个提交之后跑 db-parity 并通过'));
  r.push(f.bodyOk ? ok('body', 'PR 描述核对通过') : no('body', `PR 描述核对没过：${f.bodyWhy || ''}`.trim()));
  if (f.level === 'owner') {
    const who = f.me === 'SMG562' ? '所有者' : (f.coOwners || []).includes(f.me) ? '共同所有者' : null;
    r.push(who ? ok('level', `改了红线文件：${who} ${f.me} 合并`) : no('level', '改了红线文件：只有所有者或共同所有者能合'));
  } else if (f.level === 'review') {
    r.push((f.reviewPass || []).includes(s7) ? ok('level', `独立复核：已有「通过 ${s7}」留言`) : f.carryWhy ? ok('level', `独立复核：沿用——${f.carryWhy}`) : no('level', '需要独立复核'));
  } else r.push(ok('level', '自助合并：无红线、无需复核'));
  r.push(f.clean ? ok('clean', '本地工作区干净') : no('clean', '本地有没提交的改动'));
  return { items: r, pass: r.every(x => x.ok) };
}

const gh = (...a) => execFileSync('gh', ['api', ...a], { encoding: 'utf8', maxBuffer: 1 << 26 });
const sh = (cmd, a, input) => spawnSync(cmd, a, { cwd: ROOT, encoding: 'utf8', input, maxBuffer: 1 << 26 });
export function gather(N) {
  const pr = JSON.parse(gh(`repos/${R}/pulls/${N}`)), sha = pr.head.sha;
  // 与 pr_merge.sh 同样的取法：补全历史（浅克隆里 merge-base 会失败）、按提交号补取（fork / 分支已删也能取）；分支名带 refs/heads/ 前缀，防 `-` 开头被当成选项
  sh('git', ['fetch', '-q', 'origin', 'main', `refs/heads/${pr.head.ref}`]); sh('git', ['fetch', '-q', '--unshallow']);
  if (sh('git', ['cat-file', '-e', sha + '^{commit}']).status !== 0) sh('git', ['fetch', '-q', 'origin', sha]);
  const git = (...a) => sh('git', ['-c', 'core.quotepath=false', ...a]);
  const isAnc = git('merge-base', '--is-ancestor', 'origin/main', sha).status === 0;
  let ff = 'ff', ffWhy = '';
  if (!isAnc) { const d = sh('bash', ['tools/merge_drift.sh', sha]); ffWhy = (d.stdout + d.stderr).trim(); ff = d.status === 0 ? 'relaxed' : 'no' }
  const base = git('merge-base', 'origin/main', sha).stdout.trim() || 'origin/main';
  const files = git('diff', '--name-only', base, sha).stdout.split('\n').filter(Boolean);
  const docsOnly = files.length > 0 && files.every(x => /\.md$/.test(x));
  const runs = JSON.parse(gh(`repos/${R}/actions/runs?head_sha=${sha}&per_page=50`)).workflow_runs;
  const ci = {};
  for (const w of ['tests-fast', 'tests']) {
    const x = runs.filter(y => y.path === `.github/workflows/${w}.yml` && !/visual-baseline|未测：草稿/.test(y.display_title || '')).sort((a, b) => a.created_at < b.created_at ? 1 : -1)[0];
    ci[w] = x ? (x.status === 'completed' ? x.conclusion : x.status) : null;
  }
  // 数据库判断与 pr_merge.sh 一致：两点 diff（origin/main 对 PR 头），main 自己改了库结构而 PR 没合进来时也要求 db-parity（更严）
  const dbFiles = git('diff', '--name-only', 'origin/main', sha).stdout.split('\n').filter(Boolean);
  const dbChanged = dbFiles.some(x => (x === 'schema.sql' || x.startsWith('server/migrations/')) && x !== 'server/migrations/_bundle.sql');
  let dbParity = false;
  if (dbChanged) {
    const t = new Date(git('show', '-s', '--format=%cI', sha).stdout.trim()).toISOString();
    const d = JSON.parse(gh(`repos/${R}/actions/workflows/db-parity.yml/runs?per_page=5`)).workflow_runs.filter(y => y.created_at > t).sort((a, b) => a.created_at < b.created_at ? 1 : -1)[0];
    dbParity = !!d && d.status === 'completed' && d.conclusion === 'success';
  }
  const otherFail = (JSON.parse(gh(`repos/${R}/actions/runs?head_sha=${sha}&event=pull_request&per_page=100`)).workflow_runs || []).filter(y => !/\/tests(-fast)?\.yml$/.test(y.path)).reduce((m, y) => { (!m[y.path] || m[y.path].created_at < y.created_at) && (m[y.path] = y); return m }, {});
  const otherFailNames = Object.values(otherFail).filter(y => y.conclusion === 'failure').map(y => y.name).join('、');
  const pb = sh('node', ['tools/pr_body_check.mjs', String(N), '--merge']);
  const level = sh('node', ['tools/decision_card.mjs', '--level'], files.join('\n')).stdout.trim() || 'self';
  const me = (() => { try { return gh('user', '--jq', '.login').trim() } catch { return '' } })();
  const co = (git('show', 'origin/main:.github/CO_OWNERS').stdout || '').split('\n').map(x => x.trim()).filter(x => x && !x.startsWith('#'));
  let reviewPass = [], carryWhy = null;
  if (level === 'review') {
    const bodies = gh('--paginate', `repos/${R}/issues/${N}/comments`, '--jq', '[.[]|select(.user.type!="Bot")|.body]');
    reviewPass = sh('node', ['tools/review_state.mjs', 'pass'], bodies).stdout.split('\n').filter(Boolean);
    for (const o of reviewPass) { const c = sh('node', ['tools/review_carry.mjs', o, sha, 'origin/main']); if (c.status === 0) { carryWhy = c.stdout.trim(); break } }
  }
  return { state: pr.state, base: pr.base.ref, sha, ff, ffWhy, docsOnly, ci, otherFail: otherFailNames, dbChanged, dbParity, bodyOk: pb.status === 0, bodyWhy: (pb.stdout + pb.stderr).trim().split('\n')[0], level, me, coOwners: co, reviewPass, carryWhy, clean: git('status', '--porcelain').stdout.trim() === '' };
}

if (process.argv[1] && fs.realpathSync(path.resolve(process.argv[1])) === fs.realpathSync(fileURLToPath(import.meta.url))) {
  const N = process.argv[2], mode = process.argv[3] || '';
  if (!/^\d+$/.test(N || '')) { console.error('用法：node tools/merge_gate.mjs <PR号> [--json|--shadow]'); process.exit(2) }
  let f; try { f = gather(N) } catch (e) { console.error('读不到 PR #' + N + '：' + String(e.message).split('\n')[0]); process.exit(2) }
  const v = evaluate(f);
  if (mode === '--shadow') {
    const pm = sh('bash', ['tools/pr_merge.sh', N, '--check']), old = pm.status === 0;
    const diff = v.pass === old ? [] : v.items.filter(x => !x.ok).map(x => x.id);
    console.log(JSON.stringify({ pr: +N, sha: f.sha.slice(0, 7), gate: v.pass, pr_merge: old, agree: v.pass === old, gateFails: diff, at: new Date().toISOString() }));
    process.exit(0);
  }
  if (mode === '--json') console.log(JSON.stringify({ sha: f.sha.slice(0, 7), pass: v.pass, items: v.items }));
  else { for (const x of v.items) console.log(`${x.ok ? '✅' : '❌'} ${x.msg}`); console.log(v.pass ? '→ merge-gate：可以合并（只读检查，没有合并）' : '→ merge-gate：不可合并') }
  process.exit(v.pass ? 0 : 1);
}
