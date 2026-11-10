// L5（11-11）：第三方库本站托管。页面不再引用 cdnjs、CSP 不再放行它、引用的 /vendor/ 文件都在仓库里且进了站点白名单。
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const { CSP } = await import('file://' + path.join(ROOT, 'server/headers.mjs')); const { FILES } = await import('file://' + path.join(ROOT, 'tools/site.mjs'));
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? 'PASS ' : 'FAIL ') + n + (!ok && x !== undefined ? ' ' + JSON.stringify(x).slice(0, 300) : '')) };
T('CSP 不再放行 cdnjs', !/cdnjs/.test(CSP), CSP);
for (const f of ['南伴球_PWA.html', '南伴球_Web.html']) {
  const h = fs.readFileSync(path.join(ROOT, f), 'utf8');
  T(`${f}：不再从 cdnjs 加载`, !/cdnjs\.cloudflare\.com/.test(h));
  const refs = [...h.matchAll(/(?:src|href)="(\/vendor\/[^"]+)"/g)].map(m => m[1]);
  T(`${f}：引用了 leaflet js / css、qrcode、html2canvas`, ['/vendor/leaflet/leaflet.js', '/vendor/leaflet/leaflet.css', '/vendor/qrcode.min.js', '/vendor/html2canvas.min.js'].every(r => refs.includes(r)), refs);
  for (const r of refs) T(`${f}：${r} 在仓库里且进站点白名单`, fs.existsSync(path.join(ROOT, r.slice(1))) && FILES[r.slice(1)] === r.slice(1), r);
}
console.log(`${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
