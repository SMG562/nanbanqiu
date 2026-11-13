#!/usr/bin/env node
// 独立复核留言的唯一解析入口（#201 / #214 阶段 2b）：看板（collab_board.mjs）和合并脚本（pr_merge.sh）都用它，不再各写一份正则。
// 规则：只看留言**第一行**（先去掉开头的 HTML 注释标记，如 <!-- nbq-say:… -->；第一行开头允许一个「【」，pr_say.sh 发的就是这个形状）：
//   通过：^独立复核：通过 <7–40 位提交号>        要改：^独立复核（<提交号>，…）：要改
// 正文中间、引用行（> …）、代码块里出现这句话一律不算（11-12 #114：作者引用复核原文被误判成通过）。
//   <评论 JSON：每行一个字符串数组（gh --paginate 每页一行）> | node tools/review_state.mjs pass|fix      每行输出一个提交号前 7 位，去重；只读
// 11-13（#233 拍板第 3 点）：红线 PR 的代码所有者 Approve 也在这里判（GitHub 规则集要求「非作者的代码所有者对当前头提交 Approve」，新推送作废旧审批）。
//   node tools/review_state.mjs approval <PR号> <头提交 40 位>   退出 0 = 已批，1 = 没批（打印请谁批哪个提交），2 = 读不到；pr_merge.sh 提前调它，不再等最后被 GitHub 405 拦
//   判据（和 GitHub 一致，宁严）：每人只看最后一次 APPROVED / CHANGES_REQUESTED / DISMISSED；作者自己的不算；只算 origin/main 的 CODEOWNERS 里的账号；Approve 要落在头提交上；任一代码所有者最后是「要改」= 没批。
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url'; import { execFileSync } from 'node:child_process';
const first = b => String(b ?? '').replace(/^(\s*<!--[\s\S]*?-->\s*)+/, '').split('\n')[0].replace(/^\s*【\s*/, '');
export function parse(body) {
  const l = first(body), p = l.match(/^独立复核：通过\s*([0-9a-f]{7,40})/), f = l.match(/^独立复核（([0-9a-f]{7,40})[^）]*）[：:]\s*\**要改/);
  return { pass: p ? p[1].slice(0, 7) : null, fix: f ? f[1].slice(0, 7) : null };
}
export function collect(bodies) {
  const pass = new Set(), fix = new Set();
  for (const b of bodies) { const r = parse(b); if (r.pass) pass.add(r.pass); if (r.fix) fix.add(r.fix) }
  return { pass: [...pass], fix: [...fix] };
}
export const ownersOf = co => [...new Set([...String(co).replace(/#.*$/gm, '').matchAll(/@([A-Za-z0-9-]+)(?![\w/-])/g)].map(m => m[1]))];
export function approval(reviews, sha, author, owners) {
  const last = new Map();
  for (const r of reviews || []) { const u = r.user?.login; if (!u || u === author || !owners.includes(u) || !['APPROVED', 'CHANGES_REQUESTED', 'DISMISSED'].includes(r.state)) continue; last.set(u, r) }
  const s7 = String(sha).slice(0, 7), who = owners.filter(o => o !== author).join(' / ') || '代码所有者';
  const block = [...last.values()].find(r => r.state === 'CHANGES_REQUESTED');
  if (block) return { ok: false, why: `${block.user.login} 要求修改（${String(block.commit_id).slice(0, 7)}）：按意见改完再请 ${who} 对新的头提交 Approve` };
  const ok = [...last.values()].find(r => r.state === 'APPROVED' && r.commit_id === sha);
  if (ok) return { ok: true, why: `${ok.user.login} 已对头提交 ${s7} Approve` };
  const old = [...last.values()].find(r => r.state === 'APPROVED');
  return { ok: false, why: old ? `${old.user.login} 的 Approve 在旧提交 ${String(old.commit_id).slice(0, 7)} 上（新推送已作废）：请 ${who} 对头提交 ${s7} Approve` : `还没有代码所有者 Approve：请 ${who} 对头提交 ${s7} Approve` };
}
if (process.argv[1] && fs.realpathSync(path.resolve(process.argv[1])) === fs.realpathSync(fileURLToPath(import.meta.url))) {
  if (process.argv[2] === 'approval') {
    const [N, sha] = process.argv.slice(3), R = 'SMG562/nanbanqiu';
    if (!/^\d+$/.test(N || '') || !/^[0-9a-f]{40}$/.test(sha || '')) { console.error('用法：node tools/review_state.mjs approval <PR号> <头提交 40 位>'); process.exit(2) }
    try {
      const gh = (...a) => execFileSync('gh', ['api', ...a], { encoding: 'utf8', maxBuffer: 1 << 26, stdio: ['ignore', 'pipe', 'pipe'] });
      const author = gh(`repos/${R}/pulls/${N}`, '--jq', '.user.login').trim(), reviews = JSON.parse(gh('--paginate', '--slurp', `repos/${R}/pulls/${N}/reviews?per_page=100`)).flat();
      const co = execFileSync('git', ['show', 'origin/main:.github/CODEOWNERS'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
      const a = approval(reviews, sha, author, ownersOf(co)); console.log(a.why); process.exit(a.ok ? 0 : 1);
    } catch (e) { console.log('读不到 Approve 状态：' + String(e.message).split('\n')[0]); process.exit(2) }
  }
  const kind = process.argv[2]; if (kind !== 'pass' && kind !== 'fix') { console.error('用法：<评论JSON> | node tools/review_state.mjs pass|fix'); process.exit(2) }
  const bodies = []; for (const line of fs.readFileSync(0, 'utf8').split('\n').filter(Boolean)) { try { const j = JSON.parse(line); bodies.push(...(Array.isArray(j) ? j : [j])) } catch { /* 读不懂的行忽略 = 不算复核，宁可多要一次复核 */ } }
  for (const s of collect(bodies)[kind]) console.log(s);
}
