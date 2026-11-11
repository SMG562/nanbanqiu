#!/usr/bin/env node
// 独立复核结论「沿用」判断（11-11，协作分工与消息协议 §4）：PR 因为 main 前进而合了一次 main，提交号变了，
//   但 PR 改过的每个文件内容一个字节没变、main 新增的改动又没碰 PR 改的文件 → 之前的「独立复核：通过 <旧提交>」继续算数，不必再开一个复核会话、再手工补留言。
//   node tools/review_carry.mjs <已复核提交> <现在的头提交> [基线=origin/main]   退出码 0 = 沿用（打印原因），1 = 不沿用（打印原因）；只读
// 判据（都要满足，宁可不沿用）：① 旧提交是头提交的祖先 ② PR 改过的每个文件（复核时和现在的并集、含改名两端）在两个提交里内容逐字节相同
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
  // 逐文件比内容（不用 patch-id：它把缩进、行位置变化当成相同，独立复核 11-11 实测会被骗）：PR 在复核时 / 现在改过的每个文件（含改名的两端），两个提交里的内容必须逐字节相同
  const names = x => g('diff', '--name-only', '--no-renames', `${base}...${x}`).split('\n').filter(Boolean);
  const blob = (x, f) => { try { return g('ls-tree', x, '--', f).split('\t')[0].trim() } catch { return '' } };   // 模式 + 内容哈希（只比内容会漏掉 .sh 的可执行位变化，独立复核 11-11）
  const all = [...new Set([...names(reviewed), ...names(head)])], diff = all.filter(f => blob(reviewed, f) !== blob(head, f));
  if (diff.length) return no(`PR 的文件和复核时不一样：${diff.slice(0, 5).join('、')}（有新提交，或合并时解过冲突 / 夹带了改动）`);
  const mine = names(reviewed), mb = g('merge-base', base, reviewed).trim();
  const theirs = new Set(g('diff', '--name-only', mb, base).split('\n').filter(Boolean)), both = mine.filter(f => theirs.has(f));
  if (both.length) return no(`main 在复核之后也改了 PR 改的文件：${both.slice(0, 5).join('、')}（合并后语义可能变，要重审）`);
  return { carry: true, why: `PR 改的每个文件与复核时逐字节相同，main 新增的改动没碰 PR 的 ${mine.length} 个文件，只多了合并 main` };
}
if (process.argv[1] && fs.realpathSync(path.resolve(process.argv[1])) === fs.realpathSync(fileURLToPath(import.meta.url))) {
  const [r, h, b] = process.argv.slice(2); if (!r || !h) { console.error('用法：node tools/review_carry.mjs <已复核提交> <头提交> [基线]'); process.exit(2) }
  const x = carries(r, h, b || 'origin/main'); console.log(x.why); process.exit(x.carry ? 0 : 1);
}
