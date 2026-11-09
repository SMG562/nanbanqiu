// tests/lib/wait.js：按真实时间等（#109 / #118 第 7 条）。假 pg.settle 立即返回，模拟「页面只等接口时 settle 提前返回」
import { createRequire } from 'module'; const { waitUntil } = createRequire(import.meta.url)('../lib/wait.js');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x) : '')) };
const pg = { settle: () => new Promise(r => setTimeout(r, 1)) };
let t = Date.now(); T('settle 提前返回也等满 ms（不按次数）', (await waitUntil(pg, () => false, { ms: 300 })) === false && Date.now() - t >= 300, Date.now() - t);
let k = 0; T('条件成立就停、返回 true', (await waitUntil(pg, () => ++k === 3)) === true && k === 3, k);
let thrown = false; try { await waitUntil(pg, () => { throw new Error('x') }, { ms: 50 }) } catch (_) { thrown = true } T('默认 fn 抛错就抛出', thrown);
k = 0; T('ignoreErrors：抛错当成还没成立', (await waitUntil(pg, () => { if (++k < 3) throw new Error('nav'); return true }, { ms: 500, ignoreErrors: true })) === true);
console.log(`wait: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
