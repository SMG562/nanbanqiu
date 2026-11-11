#!/usr/bin/env node
// 远端分支清理（11-10）：把每个远端分支归类，只删「内容确定已在 main」或「PR 已关闭」的；默认只列清单，不动任何东西。
//   node tools/branch_prune.mjs                 列清单（任何人可跑，只读）
//   node tools/branch_prune.mjs --apply         【仅所有者】删「可删」两类；没进 main 的先打 archive/<分支> 标签再删
//   node tools/branch_prune.mjs --archive=a,b   【仅所有者】把「需决定」里点名的分支打标签后删（标签留着，随时能恢复）
//   node tools/branch_prune.mjs --json          机器可读
//   node tools/branch_prune.mjs --summary       一行摘要（handoff_check 每次开对话都跑：不补全历史，「可删」只会少算、不会多算）
// 恢复：git push origin archive/<分支>:refs/heads/<分支>
// 为什么：合并后没删分支 + 每个 AI 会话一个 claude/* 分支，11-10 远端堆到 55 个，真正在做的不到 10 个（Issue 见 PR 描述）。
import fs from 'node:fs'; import path from 'node:path'; import { spawnSync } from 'node:child_process'; import { fileURLToPath } from 'node:url';

export const PROTECTED = ['main', 'staging'];   // staging = 测试推送固定地址 staging.nanbanqiu-preview.pages.dev（ADR 0007），不能删
export const GRACE_DAYS = 3;                     // 没 PR 的新分支、刚关的 PR：3 天内不动（分支存活 ≤ 3 天的规矩，也给正在进行的会话留余地）
export const STALE_DAYS = 7;                     // 开着的 PR 超过 7 天没动：列出来提醒
const DAY = 864e5;

// 纯函数：branches = [{ name, tip, date(ISO), contained(内容是否已全部在 main) }]；prs = GitHub pulls（state=all）
export function classify({ branches, prs, now }) {
  const t = Date.parse(now), age = d => (t - Date.parse(d)) / DAY;
  const baseOfOpen = new Set(prs.filter(p => p.state === 'open').map(p => p.base.ref));
  return branches.map(b => {
    // 只认本仓库分支发起的 PR（fork 里同名分支的 PR 不算）
    const mine = prs.filter(p => p.head.ref === b.name && (!p.head.repo || !p.base.repo || p.head.repo.full_name === p.base.repo.full_name))
      .sort((x, y) => y.number - x.number);
    const open = mine.find(p => p.state === 'open'), last = mine[0];
    const r = (kind, why, extra = {}) => ({ ...b, kind, why, pr: (open || last)?.number ?? null, ...extra });
    if (PROTECTED.includes(b.name)) return r('keep', '保护分支');
    if (baseOfOpen.has(b.name)) return r('keep', '是开着的 PR 的目标分支（叠加 PR），删了会关掉上面的 PR');
    if (open) return age(open.updated_at) > STALE_DAYS ? r('stale', `PR #${open.number}${open.draft ? '（草稿）' : ''} ${Math.floor(age(open.updated_at))} 天没动`) : r('keep', `PR #${open.number} 进行中`);
    if (last && last.merged_at && last.head.sha === b.tip) return r('delete', `PR #${last.number} 已合并，分支之后没再动`);
    if (b.contained && (last || age(b.date) > GRACE_DAYS)) return r('delete', last ? `PR #${last.number} 已${last.merged_at ? '合并' : '关闭'}，内容都在 main` : '没有 PR，内容都在 main');
    if (last && !last.merged_at && last.head.sha === b.tip && age(last.closed_at) > GRACE_DAYS) return r('delete', `PR #${last.number} 已关闭未合并（先打 archive 标签）`, { archive: true });
    if (age(b.date) <= GRACE_DAYS) return r('keep', last ? `PR #${last.number} 刚${last.merged_at ? '合并' : '关闭'}后又有新提交` : `${GRACE_DAYS} 天内的新分支，可能正在做`);
    return r('decide', last ? `PR #${last.number} 已${last.merged_at ? '合并' : '关闭'}，之后又有没进 main 的提交` : '没有 PR，有没进 main 的提交', { archive: true });
  });
}

const env = { ...process.env }; for (const k of Object.keys(env)) if (k.startsWith('GIT_')) delete env[k];
const sh = (cmd, args, opt = {}) => { const p = spawnSync(cmd, args, { encoding: 'utf8', env, maxBuffer: 64 << 20, ...opt }); if (p.status !== 0 && !opt.ok) throw new Error(`${cmd} ${args.join(' ')}: ${p.stderr || p.stdout}`); return p };
const git = (...a) => sh('git', a).stdout.trim();
// 查远端引用的提交号：gh api 失败（404 等）时错误正文也会打到 stdout，只有退出码 0 才算有值——否则 404 的 JSON 会被当成「标签已存在」（11-11 实际踩到）
export const okText = p => (p && p.status === 0 ? String(p.stdout).trim() : '');

// 内容是否已全部在 main：把分支并进 main 得到的树 = main 的树（快进合并、压缩合并、已被别的 PR 吸收都算；冲突算「没进」——宁可漏删不误删）
export function contained(tip, main = 'origin/main', cwd) {
  const p = spawnSync('git', ['merge-tree', '--write-tree', main, tip], { cwd, encoding: 'utf8', env });
  return p.status === 0 && p.stdout.split('\n')[0] === spawnSync('git', ['rev-parse', main + '^{tree}'], { cwd, encoding: 'utf8', env }).stdout.trim();
}

function main() {
  const A = process.argv.slice(2), has = f => A.includes(f), opt = k => (A.find(a => a.startsWith(k + '=')) || '').slice(k.length + 1);
  const R = process.env.GITHUB_REPOSITORY || 'SMG562/nanbanqiu';
  process.chdir(path.join(path.dirname(fileURLToPath(import.meta.url)), '..'));
  const [maj, min] = git('version').match(/(\d+)\.(\d+)/).slice(1).map(Number);
  if (maj < 2 || (maj === 2 && min < 38)) { console.error('需要 git ≥ 2.38（merge-tree --write-tree）'); process.exit(2) }
  const SUM = has('--summary');
  if (!SUM && git('rev-parse', '--is-shallow-repository') === 'true') sh('git', ['fetch', '-q', '--unshallow', 'origin']);
  sh('git', ['fetch', '-q', '--prune', 'origin', '+refs/heads/*:refs/remotes/origin/*']);
  const prs = JSON.parse(sh('gh', ['api', '--paginate', '--slurp', `repos/${R}/pulls?state=all&per_page=100`]).stdout).flat();
  const branches = git('for-each-ref', 'refs/remotes/origin', '--format=%(refname:lstrip=3)%09%(objectname)%09%(committerdate:iso-strict)')
    .split('\n').filter(Boolean).map(l => l.split('\t')).filter(([n]) => n !== 'HEAD')
    .map(([name, tip, date]) => ({ name, tip, date, contained: contained(tip) }));
  const rows = classify({ branches, prs, now: new Date().toISOString() });
  const archive = opt('--archive').split(',').filter(Boolean);
  if (has('--json')) { console.log(JSON.stringify(rows, null, 1)); return }
  const n = k => rows.filter(r => r.kind === k).length;
  if (SUM) { console.log(`── 分支：可删 ${n('delete')} · 需决定 ${n('decide')} · 久没动的 PR ${n('stale')}${n('delete') + n('decide') + n('stale') ? '（明细 node tools/branch_prune.mjs；删除归所有者，见 #158）' : ''}`); return }
  const L = { delete: '可删', decide: '需决定（没进 main 的内容，删前先打标签）', stale: '开着但久没动的 PR', keep: '保留' };
  for (const k of Object.keys(L)) { const g = rows.filter(r => r.kind === k); if (!g.length) continue;
    console.log(`\n## ${L[k]}：${g.length}`); for (const r of g) console.log(`- ${r.name} · ${r.date.slice(0, 10)} · ${r.why}`) }
  if (!has('--apply') && !archive.length) { console.log('\n（只列清单，没有改动。所有者确认后：--apply 删「可删」；--archive=分支1,分支2 处理「需决定」里点名的）'); return }
  const me = sh('gh', ['api', 'user', '--jq', '.login']).stdout.trim();
  if (me !== R.split('/')[0]) { console.error(`❌ 删除远端分支只由所有者（${R.split('/')[0]}）做；当前账号 ${me}。把上面的清单发给所有者。`); process.exit(1) }
  const bad = archive.filter(n => !rows.some(r => r.name === n && r.kind === 'decide'));
  if (bad.length) { console.error(`❌ 这些不在「需决定」里，不处理：${bad.join(', ')}`); process.exit(1) }
  const todo = rows.filter(r => (has('--apply') && r.kind === 'delete') || archive.includes(r.name));
  let ok = 0;
  for (const r of todo) {
    const enc = r.name.split('/').map(encodeURIComponent).join('/');
    // 删前再读一次远端：提交号变了（有人刚推）就跳过
    const now = okText(sh('gh', ['api', `repos/${R}/git/ref/heads/${enc}`, '--jq', '.object.sha'], { ok: true }));
    if (now !== r.tip) { console.log(`⏭️ ${r.name}：远端已变（${now.slice(0, 7) || '不存在'} ≠ ${r.tip.slice(0, 7)}），跳过`); continue }
    if (r.archive || !r.contained) {
      const tag = `archive/${r.name}`, have = okText(sh('gh', ['api', `repos/${R}/git/ref/tags/${tag.split('/').map(encodeURIComponent).join('/')}`, '--jq', '.object.sha'], { ok: true }));
      if (have && have !== r.tip) { console.log(`⏭️ ${r.name}：标签 ${tag} 已存在且指向别的提交，跳过`); continue }
      if (!have) sh('gh', ['api', '-X', 'POST', `repos/${R}/git/refs`, '-f', `ref=refs/tags/${tag}`, '-f', `sha=${r.tip}`, '--silent']);
    }
    sh('gh', ['api', '-X', 'DELETE', `repos/${R}/git/refs/heads/${enc}`, '--silent']);
    ok++; console.log(`🗑️ ${r.name}${r.archive || !r.contained ? `（已存标签 archive/${r.name}）` : ''}`);
  }
  console.log(`\n→ 删了 ${ok} / ${todo.length} 个。恢复：git push origin archive/<分支>:refs/heads/<分支>`);
}

if (process.argv[1] && fs.realpathSync(path.resolve(process.argv[1])) === fs.realpathSync(fileURLToPath(import.meta.url))) main();
