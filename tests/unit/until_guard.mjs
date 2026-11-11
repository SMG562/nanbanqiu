// 轮询等待不许拿 settle 当间隔（11-10）：页面空闲时 pg.settle 会立刻返回，「最多 20 轮 × settle(300)」可能 1 秒不到就判「没到」。
//   #141（rackets 产品库延迟 1.5s）根因；当时 7 个浏览器测试都有这个写法，real_write / real_safety / real_after 的偶发红都是这一类。
//   正确写法：pg.until(条件, 最多毫秒)（tests/lib/preload 第 9 条，按真实时间等）。
//   拦：计数循环 / while 循环里「if (await 条件)」+「.settle(」写在一行里的轮询；for…of 逐个遍历（点每个演示）不算轮询，不拦。
// 用法：node tests/unit/until_guard.mjs [仓库根目录]
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const ROOT = process.argv[2] || path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? 'PASS ' : 'FAIL ') + n + (!ok && x !== undefined ? ' ' + JSON.stringify(x).slice(0, 800) : '')) };
const LOOP = /(for\s*\(\s*let\s+\w+\s*=[^;]*;[^;]*;[^)]*\)|while\s*\([^)]*\))\s*\{[^\n]*/g;
const bad = src => [...src.matchAll(LOOP)].map(m => m[0]).filter(l => /if\s*\(\s*await\b/.test(l) && /\.settle\s*\(/.test(l));
// 自检：该拦的拦、不该拦的放
T('自检：计数循环 + settle 当间隔 → 拦', bad("const until = async fn => { for (let n = 0; n < 20; n++) { if (await fn()) return; await pg.settle(300) } };").length === 1);
T('自检：带 try 的写法 → 拦', bad("const until = async (fn, n = 30) => { for (let i = 0; i < n; i++) { try { if (await fn()) return true } catch (_) { } await pg.settle(200) } return false };").length === 1);
T('自检：while + settle → 拦', bad("while (!done) { if (await ok()) break; await page.settle(200) }").length === 1);
T('自检：按真实时间等 → 放', bad("const until = async (fn, n = 30) => { const t0 = Date.now(); while (Date.now() - t0 < n * 200) { try { if (await fn()) return true } catch (_) { } await new Promise(r => setTimeout(r, 100)) } return false };").length === 0);
T('自检：for…of 逐个点演示 → 放', bad("for (const d of demos) { await pg.goto(url); await pg.settle(300); if (await x()) y() }").length === 0);
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.name === 'node_modules' || e.name === 'reports' ? [] : e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
const files = walk(path.join(ROOT, 'tests')).filter(f => /\.(m?js)$/.test(f) && !f.endsWith('until_guard.mjs'));
const hits = files.flatMap(f => bad(fs.readFileSync(f, 'utf8')).map(l => path.relative(ROOT, f) + '：' + l.trim().slice(0, 120)));
T(`测试代码里没有拿 settle 当间隔的轮询（扫了 ${files.length} 个文件；改用 pg.until(条件, 最多毫秒)）`, hits.length === 0, hits);
console.log(`${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
