// 前端设计令牌守卫（11-17）：docs/design/前端风格.md 与真实 CSS 对账，设计债只降不升。
// ① 令牌表：文档里 <!-- tokens --> 到 <!-- /tokens --> 之间的表（令牌 | 手机版 | 网页版），必须和两端 :root 里的变量逐个一致（值、有无）；
//    CSS 里新增 / 改值而没改文档、文档写了 CSS 里没有的，都变红。「—」表示该端没有这个变量。
// ② 棘轮：手机版（shared+pwa）和网页版（shared+web）样式里的「不同颜色 / 字号 / 圆角 / 阴影 / z-index 的种类数」不得超过
//    tests/spec/design_budget.json 的预算（只降不升；比预算少了会提示把预算下调）。新代码要用标尺值（见文档），不要再造新值。
// ③ 保底：reduced-motion / focus-visible / 安全区 的写法次数不得比预算少（别把无障碍处理删掉）。
// ⑤ 对比度：核心配色组合 ≥ 保底（正文 4.5:1 = WCAG AA）；已知欠账的组合保底 = 现状，只许变好。
// ④ docs/design/*.md 里用反引号写的仓库路径（src/ marketing/ tests/ tools/ docs/ .claude/）必须存在。
// 自检：对合成 CSS，各指标的统计函数必须给出预期数字，防止正则悄悄失效。
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? 'PASS ' : 'FAIL ') + n + (!ok && x !== undefined ? ' ' + JSON.stringify(x).slice(0, 500) : '')) };

const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const cssOf = dirs => dirs.flatMap(d => fs.readdirSync(path.join(ROOT, 'src', d, 'style')).filter(f => f.endsWith('.css')).sort().map(f => read(`src/${d}/style/${f}`))).join('\n');
const uniq = a => [...new Set(a)];
const nz = s => s.replace(/\s+/g, ' ').trim();
export function metrics(t) {
  return {
    colors: uniq([...t.matchAll(/(?<!url\()#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g)].map(m => m[0].toUpperCase())).length,
    fontSizes: uniq([...t.matchAll(/font-size:\s*([0-9.]+)px/g)].map(m => m[1])).length,
    radii: uniq([...t.matchAll(/border-radius:\s*([0-9.]+)px/g)].map(m => m[1])).length,
    shadows: uniq([...t.matchAll(/box-shadow:([^;}]+)/g)].map(m => nz(m[1]))).length,
    zIndex: uniq([...t.matchAll(/z-index:\s*(-?\d+)/g)].map(m => m[1])).length,
    reducedMotion: (t.match(/prefers-reduced-motion/g) || []).length,
    focusVisible: (t.match(/focus-visible/g) || []).length,
    safeArea: (t.match(/env\(safe-area/g) || []).length,
  };
}
export function rootVars(t) {
  const m = {}; for (const b of t.matchAll(/:root\s*\{([^}]*)\}/g)) for (const d of b[1].split(';')) { const i = d.indexOf(':'); if (i > 0 && d.trim().startsWith('--')) m[d.slice(0, i).trim()] = nz(d.slice(i + 1)) }
  return m;
}

// ---- 自检 ----
{
  const s = metrics('a{color:#fff;background:#FFF;border:1px solid #abc123;font-size:12px;border-radius:8px;box-shadow:0 1px 2px #000;z-index:5}b{font-size:12px;font-size:13.5px;border-radius:8px;border-radius:12px;z-index:5;box-shadow:0  1px 2px #000}@media (prefers-reduced-motion:reduce){x{y:env(safe-area-inset-top)}}:focus-visible{} .i{fill:url(#abc)}');
  T('自检：颜色按大小写合并并忽略 url(#id)（#FFF、#ABC123、#000 = 3 种）', s.colors === 3, s);
  T('自检：字号 / 圆角 / 阴影 / z-index 去重', s.fontSizes === 2 && s.radii === 2 && s.shadows === 1 && s.zIndex === 1, s);
  T('自检：保底写法被数到', s.reducedMotion === 1 && s.focusVisible === 1 && s.safeArea === 1, s);
  const v = rootVars(':root{ --a:#FFF;--b: 1px solid  red }.x{--c:1}');
  T('自检：rootVars 只读 :root 里的变量', JSON.stringify(v) === JSON.stringify({ '--a': '#FFF', '--b': '1px solid red' }), v);
}

// ---- ① 令牌表对账 ----
const doc = read('docs/design/前端风格.md');
const blk = doc.match(/<!-- tokens -->([\s\S]*?)<!-- \/tokens -->/);
T('前端风格.md 里有令牌表标记', !!blk);
const rows = {}; for (const l of (blk ? blk[1] : '').split('\n')) { const c = l.split('|').map(x => x.trim()); if (c.length >= 5 && /^`--[\w-]+`$/.test(c[1])) rows[c[1].slice(1, -1)] = { pwa: c[2].replace(/^`|`$/g, ''), web: c[3].replace(/^`|`$/g, '') } }
const P = rootVars(read('src/pwa/style/0010-开头.css')), W = rootVars(read('src/web/style/0010-开头.css'));
const names = uniq([...Object.keys(P), ...Object.keys(W)]);
T(`文档令牌表覆盖两端 :root 的全部变量（${names.length} 个）`, names.every(n => rows[n]), names.filter(n => !rows[n]));
T('文档令牌表里没有 CSS 里不存在的变量', Object.keys(rows).every(n => names.includes(n)), Object.keys(rows).filter(n => !names.includes(n)));
for (const n of names) if (rows[n]) {
  T(`${n} 手机版值与文档一致`, (P[n] ?? '—') === rows[n].pwa, [P[n] ?? '—', rows[n].pwa]);
  T(`${n} 网页版值与文档一致`, (W[n] ?? '—') === rows[n].web, [W[n] ?? '—', rows[n].web]);
}

// ---- ②③ 棘轮与保底 ----
const B = JSON.parse(read('tests/spec/design_budget.json'));
for (const [k, dirs] of [['pwa', ['shared', 'pwa']], ['web', ['shared', 'web']]]) {
  const m = metrics(cssOf(dirs)), b = B[k];
  for (const key of ['colors', 'fontSizes', 'radii', 'shadows', 'zIndex']) {
    T(`${k} ${key} 种类 ${m[key]} ≤ 预算 ${b[key]}`, m[key] <= b[key], '新代码用标尺值，别造新的；确实要新增，先在 docs/design/前端风格.md 的标尺里加');
    if (m[key] < b[key]) console.log(`  提示：${k} ${key} 已降到 ${m[key]}，请把 design_budget.json 里的预算下调到 ${m[key]}`);
  }
  for (const key of ['reducedMotion', 'focusVisible', 'safeArea']) T(`${k} ${key} 写法 ${m[key]} ≥ 保底 ${b[key]}`, m[key] >= b[key], '别删掉无障碍 / 安全区处理');
}

// ---- 对比度（WCAG 2.x）：核心配色组合不得低于保底；已知欠账的组合保底 = 现状（只许更好，不许更差）----
const lum = h => { const c = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(v => v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2] };
export const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05) };
T('自检：黑 / 白 对比度 21、同色 1', Math.abs(contrast('#000000', '#FFFFFF') - 21) < 0.01 && Math.abs(contrast('#123456', '#123456') - 1) < 1e-9);
for (const [fg, bg, min, why] of B.contrast) for (const [end, V] of [['手机', P], ['网页', W]]) {
  const f = fg.startsWith('--') ? V[fg] : fg, g = bg.startsWith('--') ? V[bg] : bg;
  if (!f || !g) continue;   // 该端没有这个令牌
  const r = /^#[0-9A-Fa-f]{6}$/.test(f) && /^#[0-9A-Fa-f]{6}$/.test(g) ? contrast(f, g) : 0;
  T(`${end}版对比度 ${fg} / ${bg} = ${r.toFixed(2)} ≥ ${min}（${why}）`, r >= min, [f, g, r]);
  if (why.startsWith('【欠账】') && r > min + 0.3) console.log(`  提示：${fg} / ${bg} 已提升到 ${r.toFixed(2)}，请把 design_budget.json 里的保底上调`);
}

// ---- ⑥ 场边页（独立 Shadow DOM，样式在 src/shared/side/0010-开头.js 的 SB_CSS 里）：同一套文字角色，不另立一套灰 ----
{
  const raw = read('src/shared/side/0010-开头.js');
  const css = (raw.match(/const SB_CSS="([\s\S]*?)";\nconst SB_SVG/) || [])[1] || '';
  const host = {}; for (const m of css.matchAll(/--(bg|sf|ink|ink2|mut|dim):(#[0-9A-Fa-f]{6})/g)) host['--' + m[1]] = m[2].toUpperCase();
  T('场边：:host 里读到 --bg --sf --ink --ink2 --mut --dim', ['--bg', '--sf', '--ink', '--ink2', '--mut', '--dim'].every(k => host[k]), host);
  for (const k of ['--bg', '--ink', '--ink2', '--mut', '--dim']) T(`场边 ${k} 与主站一致`, host[k] === P[k] && host[k] === W[k], [host[k], P[k], W[k]]);
  { const a = (css.match(/--acc:(#[0-9A-Fa-f]{6})/) || [])[1]; T('场边 --acc（场边绿）与主站品牌绿 --g 一致', a && a.toUpperCase() === P['--g'].toUpperCase(), [a, P['--g']]); }
  for (const [fg, bg, min] of [['--mut', '--bg', 4.5], ['--mut', '--sf', 4.5], ['--ink2', '--bg', 4.5], ['--dim', '--bg', 3], ['--dim', '--sf', 3]])
    T(`场边对比度 ${fg} / ${bg} ≥ ${min}`, host[fg] && host[bg] && contrast(host[fg], host[bg]) >= min, [host[fg], host[bg]]);
  // 手写的浅灰文字色（低饱和、在稿纸底上低于 4.5）一律不许；有意的装饰灰登记在下面白名单
  // 棘轮：场边的样式在 JS 字符串里，上面的 pwa/web 统计看不到它，单独设预算（只降不升）
  const sm = metrics(css), sb = B.side;
  for (const key of ['colors', 'fontSizes', 'radii', 'shadows', 'zIndex']) {
    T(`场边 ${key} 种类 ${sm[key]} ≤ 预算 ${sb[key]}`, sm[key] <= sb[key], '场边也用标尺值，别造新的');
    if (sm[key] < sb[key]) console.log(`  提示：场边 ${key} 已降到 ${sm[key]}，请把 design_budget.json 的 side.${key} 下调到 ${sm[key]}`);
  }
  const OK = new Set(['#A3A6A1']);   // .av.an 匿名头像的占位图形（装饰）
  const bad = uniq([...css.matchAll(/[^a-z-]color:\s*(#[0-9A-Fa-f]{6})\b/g)].map(m => m[1].toUpperCase())).filter(h => {
    const c = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)); const sat = Math.max(...c) - Math.min(...c);
    const r = contrast(h, host['--bg'] || '#F9F7EF'); return sat <= 16 && r < 4.5 && r > 1.3 && !OK.has(h);
  });
  T('场边：没有手写的低对比度浅灰文字色（用 --mut / --dim）', !bad.length, bad);
}

// ---- ④ 文档里的路径必须存在 ----
const dir = path.join(ROOT, 'docs', 'design');
for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.md'))) {
  const bad = uniq([...read(`docs/design/${f}`).matchAll(/`((?:src|marketing|tests|tools|docs|\.claude)\/[^`\s*<>{}]+)`/g)].map(m => m[1].replace(/[.,;:)]+$/, ''))).filter(p => !fs.existsSync(path.join(ROOT, p)));
  T(`${f} 引用的路径都存在`, !bad.length, bad);
}
console.log(`${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
