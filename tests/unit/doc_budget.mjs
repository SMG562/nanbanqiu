import { check } from '../../tools/doc_budget.mjs';
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x ? ' ' + JSON.stringify(x) : '')) };
T('没超 → 无问题', (r => !r.over.length && !r.missing.length)(check({ a: 100 }, { a: 200 })));
T('超了 → 报 over，带大小和上限', (r => r.over.length === 1 && r.over[0].f === 'a' && r.over[0].size === 300 && r.over[0].max === 200)(check({ a: 300 }, { a: 200 })));
T('刚好等于上限 → 不算超', check({ a: 200 }, { a: 200 }).over.length === 0);
T('超过 90% → near 提醒但不算超', (r => r.near.length === 1 && r.over.length === 0)(check({ a: 190 }, { a: 200 })));
T('文件不存在 → missing', check({}, { a: 200 }).missing.join() === 'a');
T('没列进预算的文件不管', (r => !r.over.length && !r.missing.length)(check({ a: 100, b: 9999 }, { a: 200 })));
console.log(`\ndoc_budget: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
