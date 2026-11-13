#!/usr/bin/env node
// 独立复核留言的唯一解析入口（#201 / #214 阶段 2b）：看板（collab_board.mjs）和合并脚本（pr_merge.sh）都用它，不再各写一份正则。
// 规则：只看留言**第一行**（先去掉开头的 HTML 注释标记，如 <!-- nbq-say:… -->；第一行开头允许一个「【」，pr_say.sh 发的就是这个形状）：
//   通过：^独立复核：通过 <7–40 位提交号>        要改：^独立复核（<提交号>，…）：要改
// 正文中间、引用行（> …）、代码块里出现这句话一律不算（11-12 #114：作者引用复核原文被误判成通过）。
//   <评论 JSON：每行一个字符串数组（gh --paginate 每页一行）> | node tools/review_state.mjs pass|fix      每行输出一个提交号前 7 位，去重；只读
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const first = b => String(b ?? '').replace(/^(\s*<!--[\s\S]*?-->\s*)+/, '').split('\n')[0].replace(/^\s*【\s*/, '');
export function parse(body) {
  const l = first(body), p = l.match(/^独立复核：通过\s*([0-9a-f]{7,40})(?![0-9a-zA-Z])(?=[\s】]|$)/), f = l.match(/^独立复核（([0-9a-f]{7,40})(?![0-9a-zA-Z])[^）]*）[：:]\s*\**要改/);
  return { pass: p ? p[1].slice(0, 7) : null, fix: f ? f[1].slice(0, 7) : null };
}
export function collect(bodies) {
  const pass = new Set(), fix = new Set();
  for (const b of bodies) { const r = parse(b); if (r.pass) pass.add(r.pass); if (r.fix) fix.add(r.fix) }
  return { pass: [...pass], fix: [...fix] };
}
if (process.argv[1] && fs.realpathSync(path.resolve(process.argv[1])) === fs.realpathSync(fileURLToPath(import.meta.url))) {
  const kind = process.argv[2]; if (kind !== 'pass' && kind !== 'fix') { console.error('用法：<评论JSON> | node tools/review_state.mjs pass|fix'); process.exit(2) }
  const bodies = []; for (const line of fs.readFileSync(0, 'utf8').split('\n').filter(Boolean)) { try { const j = JSON.parse(line); bodies.push(...(Array.isArray(j) ? j : [j])) } catch { /* 读不懂的行忽略 = 不算复核，宁可多要一次复核 */ } }
  for (const s of collect(bodies)[kind]) console.log(s);
}
