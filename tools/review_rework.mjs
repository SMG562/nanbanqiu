#!/usr/bin/env node
// 返工复核只看差异（review_sweep.md 第 2 步）：上一轮「要改」留言里的编号意见（R1、R2…）+ 旧提交到现在的改动文件 → 给复核子会话的最小输入。
//   <评论 JSON：[{body,bot}]> | node tools/review_rework.mjs <头提交> [旧提交→默认取最近一条「要改」里的提交号]   只读；不联网、不用 gh（评论由调用方取好再喂进来）
// 输出 JSON：{ mode:'full'|'rework', reviewed, items:[{id,text}], changed:[文件] }。没有要改留言 / 旧提交取不到 / 不是祖先 → full（整个 PR 照常复核，宁可多看不漏看）。
// 只认非机器人、且「要改」在留言第一行（去掉开头 HTML 注释后）——和 #201 的口径一致，引用 / 举例里的不算。
import { execFileSync } from 'node:child_process'; import path from 'node:path'; import fs from 'node:fs'; import { fileURLToPath } from 'node:url';
const first = b => b.replace(/^(\s*<!--[\s\S]*?-->\s*)+/, '').split('\n')[0];
export const items = body => [...body.matchAll(/^\s*(?:[-*]\s*)?\**(R\d+)\**\s*[.．:：、)）]\s*(.+)$/gm)].map(m => ({ id: m[1], text: m[2].trim() }));
export function lastFix(comments) {
  for (const c of [...comments].reverse()) { if (c.bot) continue; const m = first(c.body).match(/^独立复核（([0-9a-f]{7,40})[^）]*）[：:]\s*\**要改/); if (m) return { sha: m[1], items: items(c.body) } }
  return null;
}
export function plan(comments, head, changedSince) {
  const f = lastFix(comments), full = { mode: 'full', reviewed: null, items: [], changed: [] };
  if (!f) return full; const ch = changedSince(f.sha, head); if (!ch) return { ...full, reviewed: f.sha };
  return { mode: 'rework', reviewed: f.sha, items: f.items, changed: ch };
}
const gitChanged = (old, head) => { const g = (...a) => execFileSync('git', ['-c', 'core.quotepath=false', ...a], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  try { g('merge-base', '--is-ancestor', old, head); return g('diff', '--name-only', '--no-renames', old, head).split('\n').filter(Boolean) } catch { return null } };
if (process.argv[1] && fs.realpathSync(path.resolve(process.argv[1])) === fs.realpathSync(fileURLToPath(import.meta.url))) {
  const [head] = process.argv.slice(2); if (!head) { console.error('用法：<评论JSON> | node tools/review_rework.mjs <头提交>'); process.exit(2) }
  console.log(JSON.stringify(plan(JSON.parse(fs.readFileSync(0, 'utf8') || '[]'), head, gitChanged)));
}
