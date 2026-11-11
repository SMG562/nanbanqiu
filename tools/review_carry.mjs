#!/usr/bin/env node
// 独立复核结论「沿用」判断（11-11，协作分工与消息协议 §4）：PR 因为 main 前进而合了一次 main，提交号变了，
//   但 PR 自己的改动一个字没变、main 新增的改动又没碰 PR 改的文件 → 之前的「独立复核：通过 <旧提交>」继续算数，不必再开一个复核会话、再手工补留言。
//   node tools/review_carry.mjs <已复核提交> <现在的头提交> [基线=origin/main]   退出码 0 = 沿用（打印原因），1 = 不沿用（打印原因）；只读
// 判据（都要满足，宁可不沿用）：① 旧提交是头提交的祖先 ② 两者相对 main 的「PR 自己的改动」逐行相同（git patch-id，-U0 只看增删行）
//   ③ 旧提交之后 main 新增的文件改动，和 PR 改的文件不重叠（重叠 = 合并后语义可能变，要重审）。CI 仍会对新头提交重跑，这里只管「要不要人再看一遍」。
import { execFileSync } from 'node:child_process'; import path from 'node:path'; import fs from 'node:fs'; import { fileURLToPath } from 'node:url';
const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('GIT_')));
export function carries(reviewed, head, base = 'origin/main', cwd = process.cwd()) {
  const g = (...a) => execFileSync('git', ['-c', 'core.quotepath=false', ...a], { cwd, env, encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'pipe'] });
  const ok = (...a) => { try { g(...a); return true } catch { return false } };
  const no = why => ({ carry: false, why });
  if (!ok('cat-file', '-e', reviewed + '^{commit}')) return no('旧提交取不到（浅克隆？先 git fetch --depth=1000 origin <分支>）');
  if (reviewed === head || head.startsWith(reviewed) || reviewed.startsWith(head)) return { carry: true, why: '就是同一个提交' };
  if (!ok('merge-base', '--is-ancestor', reviewed, head)) return no('旧提交不是现在头提交的祖先（分支被改写过，或提交了新改动前换过历史）');
  const pid = x => { const d = g('diff', '-U0', `${base}...${x}`); return d ? execFileSync('git', ['patch-id', '--stable'], { cwd, env, input: d, encoding: 'utf8' }).split(' ')[0] : '' };
  if (pid(reviewed) !== pid(head)) return no('PR 自己的改动和复核时不一样（有新提交，或合并时解过冲突）');
  const mine = g('diff', '--name-only', `${base}...${reviewed}`).split('\n').filter(Boolean), mb = g('merge-base', base, reviewed).trim();
  const theirs = new Set(g('diff', '--name-only', mb, base).split('\n').filter(Boolean)), both = mine.filter(f => theirs.has(f));
  if (both.length) return no(`main 在复核之后也改了 PR 改的文件：${both.slice(0, 5).join('、')}（合并后语义可能变，要重审）`);
  return { carry: true, why: `PR 自己的改动与复核时逐行相同，main 新增的改动没碰 PR 的 ${mine.length} 个文件，只多了合并 main` };
}
if (process.argv[1] && fs.realpathSync(path.resolve(process.argv[1])) === fs.realpathSync(fileURLToPath(import.meta.url))) {
  const [r, h, b] = process.argv.slice(2); if (!r || !h) { console.error('用法：node tools/review_carry.mjs <已复核提交> <头提交> [基线]'); process.exit(2) }
  const x = carries(r, h, b || 'origin/main'); console.log(x.why); process.exit(x.carry ? 0 : 1);
}
