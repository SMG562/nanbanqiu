// 静态资源 404 守卫（11-17，C1）：代码里写死的静态资源路径，必须真的随站点发布。
// 为什么：sw.js 推送通知引用了 /icons/badge-72.png，文件从来没进过仓库 / 站点白名单，没有测试发现（site 测试只查 manifest 图标、
//   apple-touch-icon、HTML 里的 /vendor/，而且在浏览器档）。这里补上其余引用点：sw.js、manifest、src 脚本里的字符串、server、functions。
// 查什么：扫描上面这些文件里带引号 / 括号的 /icons/… /vendor/… 和根目录下的图片 / manifest 路径；每个都要 ①在 tools/site.mjs 的
//   FILES 里（= 会被部署）②FILES 指向的仓库文件真实存在。含 ${ 的动态路径跳过。
// 自检：对合成文本里的一个不存在的路径，扫描必须报出来；并核对扫描至少看到几个已知引用（防止正则悄悄什么也没匹配）。
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const { FILES, GENERATED } = await import('file://' + path.join(ROOT, 'tools/site.mjs'));
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? 'PASS ' : 'FAIL ') + n + (!ok && x !== undefined ? ' ' + JSON.stringify(x).slice(0, 400) : '')) };

// 引号 / 括号 / 等号后面紧跟的路径：/icons/… /vendor/…，或根目录下的 .png .jpg .svg .ico .webp .webmanifest
const REF = /["'`(=](\/(?:(?:icons|vendor)\/[A-Za-z0-9_.\/-]+|[A-Za-z0-9_-]+\.(?:png|jpe?g|svg|ico|webp|webmanifest)))(?![A-Za-z0-9_.\/-]|\$\{)/g;
export function refsIn(text) { return [...text.matchAll(REF)].map(m => m[1]); }
// 站点会提供这个路径吗？问题描述：返回 null = 没问题，否则是原因
export function problem(ref) {
  const rel = ref.slice(1);
  if (GENERATED.includes(rel)) return null;                       // 构建时生成（manifest.webmanifest 等）
  if (!(rel in FILES)) return '不在 tools/site.mjs 的 FILES 里（不会被部署 → 线上 404）';
  if (!fs.existsSync(path.join(ROOT, FILES[rel]))) return `FILES 指向的 ${FILES[rel]} 在仓库里不存在`;
  return null;
}

const SCAN = [['sw.js'], ['manifest.webmanifest'], ['src', /\.(js|html|css)$/], ['server', /\.mjs$/], ['functions', /\.js$/]];
const walk = (p, re) => { const f = path.join(ROOT, p); if (!fs.existsSync(f)) return []; const s = fs.statSync(f); if (s.isFile()) return [p];
  return fs.readdirSync(f).filter(n => n !== 'migrations' && n !== 'node_modules').flatMap(n => walk(path.join(p, n), re)).filter(x => !re || fs.statSync(path.join(ROOT, x)).isDirectory() || re.test(x)) };
const files = [...new Set(SCAN.flatMap(([p, re]) => walk(p, re)))].filter(x => fs.statSync(path.join(ROOT, x)).isFile());

const seen = new Map();   // 引用 → 出现的文件
for (const f of files) for (const r of refsIn(fs.readFileSync(path.join(ROOT, f), 'utf8'))) { if (!seen.has(r)) seen.set(r, new Set()); seen.get(r).add(f) }
for (const [r, fs_] of [...seen].sort()) T(`${r} 随站点发布（${[...fs_][0]}${fs_.size > 1 ? ' 等 ' + fs_.size + ' 处' : ''}）`, problem(r) === null, problem(r));

// 自检
const known = ['/icons/icon-180.png', '/icons/icon-192.png', '/icons/og-share.jpg', '/vendor/qrcode.min.js'];
T(`扫描看到了已知引用（${seen.size} 个路径、${files.length} 个文件）`, known.every(k => seen.has(k)), known.filter(k => !seen.has(k)));
T('自检：合成文本里不存在的 /icons/ 路径会被报出来', refsIn(`x: '/icons/no-such-file.png', y: "/icons/icon-192.png"`).filter(r => problem(r)).join() === '/icons/no-such-file.png');
T('自检：合成文本里不存在的根目录图片会被报出来', refsIn('<img src="/nope.jpg">').filter(r => problem(r)).join() === '/nope.jpg');
T('自检：含 ${} 的动态路径跳过', refsIn('`/icons/${name}.png`').length === 0);
console.log(`${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
