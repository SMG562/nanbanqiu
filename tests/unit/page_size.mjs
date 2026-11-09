// 页面体积预算（#127 第 5 项）：三个页面 gzip 后的体积不能超过 tests/spec/page_budget.json 的上限。
// 为什么：Service Worker 只能加快第二次打开；新用户从微信点进来的第一次打开要下完整个页面，这是拉新的门槛。以前 CI 不管体积，只会悄悄变大。
// 超了 / 快超（≥98%）会列出「比 origin/main 长大最多」和「最大」的源文件；先删 / 拆 / 晚点加载，不是调高上限（只降不升，调高要所有者批准）。
import fs from 'fs'; import path from 'path'; import zlib from 'zlib'; import { spawnSync } from 'child_process'; import { fileURLToPath } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url)), DIR = process.argv[2] || process.env.NBQ_DIR || path.join(HERE, '..', '..');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? '  ✓ ' : 'FAIL ') + n + (ok || x === undefined ? '' : ' ' + JSON.stringify(x).slice(0, 900))) };
const gz = b => zlib.gzipSync(b).length, kb = n => (n / 1024).toFixed(1) + 'KB';

// 判定规则（纯函数，下面先对照测它，防止守卫自己写错）
export function judge(size, max) { return size > max ? 'over' : size > max * 0.98 ? 'near' : 'ok' }
T('对照：没超 → ok', judge(100, 200) === 'ok');
T('对照：刚好等于上限 → 不算超', judge(200, 200) !== 'over');
T('对照：超 1 字节 → over', judge(201, 200) === 'over');
T('对照：超过 98% → near（提醒，不判红）', judge(197, 200) === 'near' && judge(195, 200) === 'ok');

const spec = JSON.parse(fs.readFileSync(path.join(DIR, 'tests/spec/page_budget.json'), 'utf8'));
T('预算文件里每个页面都有上限和 list', Object.keys(spec.budgets).length === 3 && Object.keys(spec.budgets).every(f => spec.lists[f]), spec);
T('上限只降不升：不高于 11-09 实测 + 5%（要调高先找所有者，同时改这条）', Object.entries(spec.budgets).every(([f, m]) => m <= Math.ceil(spec.measured_1109[f] * 1.05 / 1024) * 1024), spec.budgets);

for (const [f, max] of Object.entries(spec.budgets)) {
  let buf; try { buf = fs.readFileSync(path.join(DIR, f)) } catch { T(`${f} 存在`, false); continue }
  const size = gz(buf), j = judge(size, max);
  T(`${f}：gzip 后 ${kb(size)}，上限 ${kb(max)}（${Math.round(size / max * 100)}%）`, j !== 'over', j === 'over' ? { 超出: kb(size - max), ...why(spec.lists[f]) } : undefined);
  if (j === 'near') console.log(`  提醒：${f} 已用 ${Math.round(size / max * 100)}% 预算`, JSON.stringify(why(spec.lists[f])));
}
// 找原因（只在超了 / 快超时算）：比 origin/main 长大最多的源文件 + 现在最大的源文件。各自单独压缩，只用来找「谁」，加起来不等于整页。
function why(list) {
  const files = fs.readFileSync(path.join(DIR, list), 'utf8').split('\n').map(s => s.trim()).filter(s => s && !s.startsWith('#'));
  const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('GIT_')));   // 开发规矩：git 去掉 GIT_*
  const now = r => { try { return gz(fs.readFileSync(path.join(DIR, 'src', r))) } catch { return 0 } };
  const base = r => { const o = spawnSync('git', ['show', 'origin/main:src/' + r], { cwd: DIR, env, maxBuffer: 64 << 20 }); return o.status === 0 ? gz(o.stdout) : null };
  const rows = files.map(r => ({ r, n: now(r), b: base(r) })), hasBase = rows.some(x => x.b !== null);
  const fmt = (r, n) => `${r} ${n >= 0 ? '+' : ''}${kb(n)}`;
  return {
    比main长大最多: hasBase ? rows.map(x => [x.r, x.n - (x.b ?? 0)]).filter(x => x[1] > 0).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([r, n]) => fmt(r, n)) : '读不到 origin/main（先 git fetch origin main）',
    最大的源文件: rows.sort((a, b) => b.n - a.n).slice(0, 5).map(x => `${x.r} ${kb(x.n)}`),
  };
}
console.log(`\npage_size: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
