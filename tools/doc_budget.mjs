// 文档体量预算（11-06）：助手每次开工都要读核心文档，越大越贵、越容易漏。
// tests/spec/doc_budget.json 给每份核心文档一个字节上限；超了就拆分 / 精简，而不是调高上限（上限只降不升；调高要所有者批准）。
// 用法：node tools/doc_budget.mjs [--list]
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
// sizes: { 文件: 字节 }, budgets: { 文件: 上限 } → { over: [...], near: [...], missing: [...] }
export function check(sizes, budgets) {
  const over = [], near = [], missing = [];
  for (const [f, max] of Object.entries(budgets)) {
    if (!(f in sizes)) { missing.push(f); continue }
    if (sizes[f] > max) over.push({ f, size: sizes[f], max });
    else if (sizes[f] > max * 0.9) near.push({ f, size: sizes[f], max });
  }
  return { over, near, missing };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const spec = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/spec/doc_budget.json'), 'utf8')), budgets = spec.budgets, sizes = {};
  for (const f of Object.keys(budgets)) { try { sizes[f] = fs.statSync(path.join(ROOT, f)).size } catch {} }
  const { over, near, missing } = check(sizes, budgets);
  if (process.argv.includes('--list')) for (const f of Object.keys(budgets)) console.log(String(sizes[f] ?? '缺').padStart(7), '/', String(budgets[f]).padEnd(7), f);
  over.forEach(o => console.log(`❌ ${o.f} 已 ${o.size} 字节，超过上限 ${o.max}：拆分或精简（把已完成 / 过时的移到别处），不是调高上限`));
  missing.forEach(f => console.log(`❌ 预算里的 ${f} 不存在（改名或删除后同步改 tests/spec/doc_budget.json）`));
  near.forEach(o => console.log(`⚠ ${o.f} 已用 ${Math.round(o.size / o.max * 100)}% 预算（${o.size}/${o.max}），该精简了`));
  // 11-13（ADR 0012）：流程件数也有上限，只降不升——新增一个脚本 / 工作流，先删一个
  const cnt = spec.counts || {}, cs = {};
  for (const [k, v] of Object.entries(cnt)) { try { cs[k] = fs.readdirSync(path.join(ROOT, v.dir)).filter(n => new RegExp(v.ext).test(n)).length } catch { cs[k] = 0 } }
  const cr = check(cs, Object.fromEntries(Object.entries(cnt).map(([k, v]) => [k, v.max])));
  cr.over.forEach(o => { console.log(`❌ ${o.f} 现有 ${o.size} 个，超过上限 ${o.max}：新增一个先删一个（上限只降不升）`); over.push(o) });
  console.log(`doc_budget: ${Object.keys(budgets).length} 份文档, ${over.length} 份超预算, ${missing.length} 份缺失, ${near.length} 份接近上限`);
  process.exit(over.length || missing.length ? 1 : 0);
}
