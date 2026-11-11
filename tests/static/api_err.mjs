// 第四批 4f-3：前台两端的错误提示 = 接口规格的错误码表。
//   规格 tests/spec/api_spec.md §1 每一行：错误码 → 给用户看的话（取「/」前的第一句，去掉括号里的说明）。
//   「显示… / 弹出… / 不报错… / 按字段…」开头的由前台专门处理（账号状态说明、球友约定、表单字段提示），不在对照表里。
//   两端各有一份 API_ERR，必须与规格逐条相同（多一条、少一条、改了一个字都会报出来）。
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url)), DIR = process.argv[2] || process.env.NBQ_DIR || path.join(HERE, '..', '..');
const spec = fs.readFileSync(path.join(HERE, '..', 'spec', 'api_spec.md'), 'utf8');
export const SPECIAL = /^(显示|弹出|不报错|按字段)/;
const want = {};
const SEC1 = spec.slice(spec.indexOf('## 1. 错误码'), spec.indexOf('\n## 2.'));   // 只对照 §1（后台错误码在 §10.4，由后台页面自己对照）
for (const m of SEC1.matchAll(/^\| ([a-z_ /]+) \| (\d{3}) \| ([^|]+) \|/gm)) {
  const msg = m[3].trim(); if (SPECIAL.test(msg)) continue;
  const text = msg.split(' / ')[0].replace(/（[^）]*）/g, '').trim();
  for (const code of m[1].split('/').map(x => x.trim())) want[code] = text;
}
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 600) : '')) };
const grab = f => { const h = fs.readFileSync(path.join(DIR, f), 'utf8'), m = h.match(/const API_ERR=(\{[^\n]*?\});/); if (!m) return null; try { return JSON.parse(m[1]) } catch (e) { return 'bad:' + e.message } };
T(`规格里有可对照的错误码（${Object.keys(want).length} 个）`, Object.keys(want).length >= 30, Object.keys(want).length);
for (const f of ['南伴球_PWA.html', '南伴球_Web.html']) {
  const got = grab(f);
  T(`${f} 有 API_ERR`, got && typeof got === 'object', got);
  if (!got || typeof got !== 'object') continue;
  const miss = Object.keys(want).filter(k => !(k in got)), extra = Object.keys(got).filter(k => !(k in want)), diff = Object.keys(want).filter(k => k in got && got[k] !== want[k]);
  T(`${f}：错误码与规格一致`, !miss.length && !extra.length, { 缺: miss, 多: extra });
  T(`${f}：提示文案与规格逐字相同`, !diff.length, diff.map(k => [k, got[k], want[k]]));
}
const a = grab('南伴球_PWA.html'), b = grab('南伴球_Web.html');
T('两端的 API_ERR 完全相同', JSON.stringify(a) === JSON.stringify(b));
console.log(`${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
