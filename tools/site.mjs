#!/usr/bin/env node
/**
 * 生成预览网站 site/（10-27，Cloudflare Pages 每次推送自动部署：构建命令 `node tools/site.mjs`，输出目录 `site`）。
 *
 *   node tools/site.mjs            生成 site/（先清空 site/ 里上次生成的文件——只删 site/ 之内、本脚本建的）
 *
 * 只放可以公开的文件（白名单 FILES）；进度记录、数据库、测试、服务端代码一律不进。
 * 入口页 index.html：手机端 / 网页端 / 后台 / 宣传物料四个链接 + 这次部署对应的提交。只在预览站根 nanbanqiu-preview.pages.dev 出现；
 *   正式站和分支预览打开 / 按屏幕宽度进应用（_routes.json + functions/_middleware.js → server/site_route.mjs，11-03）。
 * 宣传物料页 materials.html（10-29）：由 marketing/posters.json + marketing/img、thumb 里的 webp 生成；
 *   海报源文件和出图流程见 .claude/skills/nanbanqiu-poster/SKILL.md，新增海报不用改本文件。
 * _headers：不让搜索引擎收录；页面不缓存（每次打开都是最新部署）。
 * static/site 测试核对：只有白名单里的文件、页面引用的本地文件都在。
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// 发布路径 ← 仓库里的文件
export const FILES = {
  'pwa.html': '南伴球_PWA.html',
  'web.html': '南伴球_Web.html',
  'admin.html': '南伴球_后台.html',
  'privacy.html': 'privacy.html',
  'terms.html': 'terms.html',
  // Service Worker（推送订阅要用；根路径 /sw.js，范围整个网站）
  'sw.js': 'sw.js',
  // 主屏幕图标（页面里写的是 /icons/…；没有这些文件时 iOS 会拿页面标题的第一个字「南」生成图标）
  'icons/icon-180.png': 'icons/icon-180.png',
  'icons/icon-192.png': 'icons/icon-192.png',
  'icons/icon-512.png': 'icons/icon-512.png',
  'icons/icon-maskable-512.png': 'icons/icon-maskable-512.png',
};
// 宣传物料：清单来自 marketing/posters.json（build.py 登记），图在 marketing/img、thumb（webp，已入库）
export const posterName = p => `${String(p.id).padStart(2, '0')}-${p.slug}`;
export function posters() { try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'marketing', 'posters.json'), 'utf8')) } catch { return [] } }
for (const p of posters()) {
  FILES[`materials/img/${posterName(p)}.webp`] = `marketing/img/${posterName(p)}.webp`;
  FILES[`materials/thumb/${posterName(p)}.webp`] = `marketing/thumb/${posterName(p)}.webp`;
}
// 代码里最新的数据库迁移（文件名去掉 .sql）；线上库执行到的版本要等于它（/api/version 的 schema.latest）
export function migrations() { try { return fs.readdirSync(path.join(ROOT, 'server', 'migrations')).filter(f => f.endsWith('.sql') && !f.startsWith('_')).sort().map(f => f.replace(/\.sql$/, '')) } catch { return [] } }
export const latestMigration = () => migrations().pop() || null;
export const GENERATED = ['index.html', 'materials.html', '_headers', 'manifest.webmanifest', 'version.json', '_routes.json'];
// Pages Functions 只在这些路径上运行（其余静态文件直接给，不算函数调用次数）：
//   /（跳城市网址）· /melbourne/ 等（按宽度载入手机版 / 网页版）· 旧 /pwa.html /web.html（导航请求跳城市网址）· server/site_route.mjs · 正式站 /materials 回首页 · /api · 分享短链接 /g、/p
export const ROUTES = { version: 1, include: ['/', '/melbourne', '/melbourne/', '/sydney', '/sydney/', '/pwa', '/pwa.html', '/web', '/web.html', '/materials', '/materials.html', '/api/*', '/g/*', '/p/*'], exclude: [] };

// 预览站的 manifest：仓库里的 manifest 是给正式站用的（根网址 / 就是应用）；预览站的根是入口页，
// 应用在 /pwa.html，所以「添加到主屏幕」后要从 /pwa.html 打开（不然会打开入口页）
export function previewManifest(src) {
  const m = JSON.parse(src);
  m.id = '/pwa.html'; m.start_url = '/pwa.html?source=pwa';
  m.shortcuts = (m.shortcuts || []).map(x => ({ ...x, url: x.url.replace(/^\/melbourne\/\?/, '/pwa.html?') }));
  return JSON.stringify(m, null, 2) + '\n';
}

function commit() {
  const env = process.env.CF_PAGES_COMMIT_SHA || process.env.GITHUB_SHA;
  if (env) return env.slice(0, 7);
  try { return execSync('git rev-parse --short HEAD', { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() } catch { return '' }
}

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export function indexHTML(sha, when) {
  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>南伴球 预览</title>
<script>/* 分享短链接 /g/码、/p/编号：预览站没有后端，落到入口页后按屏幕宽度转到手机端 / 网页端，用 #/g/码 的写法交给页面 */
(function(){var m=location.pathname.match(/^[/]([gp])[/]([A-Za-z0-9]+)/);if(m)location.replace((innerWidth<=820?'/pwa.html':'/web.html')+location.search+'#/'+m[1]+'/'+m[2])})()</script>
<style>
:root{--bg:#F3F5F3;--ink:#101828;--mut:#8A919C;--g:#176B4D;--line:#E5E8E5}
*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:var(--bg);color:var(--ink);font:15px/1.5 -apple-system,BlinkMacSystemFont,"PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif}
main{width:100%;max-width:420px;padding:32px 16px}
h1{margin:0 0 4px;font-size:22px;color:var(--g)}p{margin:0 0 22px;color:var(--mut);font-size:13px}
a{display:flex;justify-content:space-between;align-items:center;padding:16px 18px;margin-bottom:10px;background:#fff;border:1px solid var(--line);border-radius:14px;color:inherit;text-decoration:none;font-weight:600}
a small{color:var(--mut);font-weight:400}a:hover{border-color:var(--g)}
</style></head><body><main>
<h1>南伴球 预览</h1><p>演示数据 · 每次推送自动更新${sha ? ` · 提交 ${esc(sha)}` : ''}${when ? ` · ${esc(when)}` : ''}</p>
<a href="pwa.html">手机端<small>PWA</small></a>
<a href="web.html">电脑网页端<small>Web</small></a>
<a href="admin.html">管理后台<small>Admin</small></a>
<a href="materials.html">宣传物料<small>Marketing</small></a>
</main></body></html>
`;
}
export function materialsHTML(list, sha, when) {
  const data = list.map(p => ({ id: p.id, f: posterName(p), title: p.title, lines: p.lines, style: p.style, tone: p.tone, demo: !!p.demo, concept: p.concept, use: p.use }));
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>南伴球 宣传物料</title>
<style>
:root{--bg:#F3F5F3;--ink:#101828;--mut:#8A919C;--g:#176B4D;--lime:#C6EA3D;--line:#E5E8E5}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 -apple-system,BlinkMacSystemFont,"PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif}
header,main{max-width:1100px;margin:0 auto;padding:0 16px}header{padding-top:20px}
.back{display:inline-block;color:var(--mut);font-size:13px;text-decoration:none;margin-bottom:10px}
h1{margin:0 0 4px;font-size:22px;color:var(--g)}.note{margin:0 0 14px;color:var(--mut);font-size:13px}
.chips{display:flex;gap:8px;overflow-x:auto;padding:2px 0 14px;scrollbar-width:none}.chips::-webkit-scrollbar{display:none}
.chips button{flex:none;border:1px solid var(--line);background:#fff;color:var(--ink);border-radius:999px;padding:6px 14px;font:inherit;font-size:13px;cursor:pointer}
.chips button[aria-pressed=true]{background:var(--g);border-color:var(--g);color:#fff}
.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;padding-bottom:40px}
@media(min-width:720px){.grid{grid-template-columns:repeat(4,1fr);gap:16px}}
.card{display:block;width:100%;padding:0;border:0;background:none;text-align:left;font:inherit;color:inherit;cursor:pointer}
.card .im{position:relative;aspect-ratio:4/5;border-radius:14px;overflow:hidden;background:#dfe5e0;box-shadow:0 1px 3px rgba(16,24,40,.12)}
.card img{width:100%;height:100%;object-fit:cover;display:block}
.card .bd{position:absolute;right:8px;top:8px;background:rgba(255,255,255,.92);color:#8A5A00;font-size:11px;border-radius:999px;padding:1px 8px}
.card b{display:block;margin-top:8px;font-size:14px}.card small{color:var(--mut);font-size:12px}
#lb{position:fixed;inset:0;z-index:10;background:rgba(8,18,14,.96);color:#fff;display:none;flex-direction:column}
#lb.on{display:flex}#lb .stage{flex:1;min-height:0;display:flex;align-items:center;justify-content:center;padding:12px 12px 4px}
#lb .stage img{max-width:100%;max-height:100%;object-fit:contain;border-radius:10px}
#lb .info{padding:6px 18px 10px;max-width:640px;width:100%;margin:0 auto;max-height:34vh;overflow:auto}
#lb h2{margin:0 0 2px;font-size:17px}#lb p{margin:2px 0;font-size:13px;color:#cfd8d3}#lb .dm{color:#F2B134}
#lb .bar{display:flex;gap:10px;padding:8px 16px calc(12px + env(safe-area-inset-bottom));max-width:640px;width:100%;margin:0 auto}
#lb .bar button,#lb .bar a{flex:1;text-align:center;border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.08);color:#fff;border-radius:12px;padding:10px 0;font:inherit;font-size:14px;text-decoration:none;cursor:pointer}
#lb .bar a{background:var(--lime);border-color:var(--lime);color:#0B3B2A;font-weight:600;flex:1.4}
</style></head><body>
<header><a class="back" href="index.html">← 预览首页</a><h1>宣传物料</h1>
<p class="note">${data.length} 张海报 · 点开看大图，长按或「保存大图」存到手机 · 带「示意」的海报里，时间、人数、位置只是排版示例${sha ? ` · 提交 ${esc(sha)}` : ''}${when ? ` · ${esc(when)}` : ''}</p>
<div class="chips" id="chips"></div></header>
<main><div class="grid" id="grid"></div></main>
<div id="lb" role="dialog" aria-modal="true" aria-label="海报大图"><div class="stage"><img id="lbimg" alt=""></div>
<div class="info"><h2 id="lbt"></h2><p id="lbl"></p><p id="lbc"></p><p id="lbu"></p><p class="dm" id="lbd"></p></div>
<div class="bar"><button id="prev" type="button">上一张</button><a id="dl" download>保存大图</a><button id="next" type="button">下一张</button><button id="close" type="button">关闭</button></div></div>
<script>
const D=${json};
const $=id=>document.getElementById(id);
const el=(t,c,x)=>{const e=document.createElement(t);if(c)e.className=c;if(x!==undefined)e.textContent=x;return e};
let flt='全部',cur=-1;
const tags=['全部',...[...new Set(D.flatMap(p=>[p.tone,...p.style]))]];
tags.forEach(t=>{const b=el('button','',t);b.type='button';b.setAttribute('aria-pressed',t==='全部');b.onclick=()=>{flt=t;[...$('chips').children].forEach(c=>c.setAttribute('aria-pressed',c.textContent===t));draw()};$('chips').append(b)});
const vis=()=>D.filter(p=>flt==='全部'||p.tone===flt||p.style.includes(flt));
function draw(){const g=$('grid');g.textContent='';vis().forEach(p=>{const c=el('button','card');c.type='button';const im=el('div','im'),i=new Image();i.src='materials/thumb/'+p.f+'.webp';i.alt=p.title;i.loading='lazy';im.append(i);if(p.demo)im.append(el('span','bd','示意'));c.append(im,el('b','',p.title),el('small','',p.tone+' · '+p.style.join(' / ')));c.onclick=()=>open(p.id);g.append(c)})}
function open(id){const v=vis();cur=v.findIndex(p=>p.id===id);if(cur<0)return;show();$('lb').classList.add('on');document.body.style.overflow='hidden'}
function show(){const p=vis()[cur];$('lbimg').src='materials/img/'+p.f+'.webp';$('lbimg').alt=p.title;$('lbt').textContent=String(p.id).padStart(2,'0')+' · '+p.title;$('lbl').textContent='文案：'+p.lines.join('');$('lbc').textContent='创意：'+p.concept;$('lbu').textContent='用途：'+p.use;$('lbd').textContent=p.demo?'示意内容：图里的时间、人数、位置只是排版示例，不是真实数据':'';$('dl').href='materials/img/'+p.f+'.webp';$('dl').setAttribute('download','南伴球-'+p.title+'.webp');history.replaceState(null,'','#'+String(p.id).padStart(2,'0'))}
function step(d){const n=vis().length;cur=(cur+d+n)%n;show()}
function shut(){$('lb').classList.remove('on');document.body.style.overflow='';history.replaceState(null,'',location.pathname+location.search)}
$('prev').onclick=()=>step(-1);$('next').onclick=()=>step(1);$('close').onclick=shut;
addEventListener('keydown',e=>{if(!$('lb').classList.contains('on'))return;if(e.key==='Escape')shut();if(e.key==='ArrowLeft')step(-1);if(e.key==='ArrowRight')step(1)});
let x0=null;$('lb').addEventListener('touchstart',e=>{x0=e.touches[0].clientX},{passive:true});$('lb').addEventListener('touchend',e=>{if(x0===null)return;const dx=e.changedTouches[0].clientX-x0;x0=null;if(Math.abs(dx)>60)step(dx<0?1:-1)});
function fromHash(){const h=location.hash.match(/^#(\\d+)$/);if(h)open(+h[1])}
draw();fromHash();addEventListener('hashchange',fromHash);
</script></body></html>
`;
}
export const HEADERS = `/*
  X-Robots-Tag: noindex, nofollow
  Cache-Control: no-cache

/sw.js
  Cache-Control: no-cache
  Service-Worker-Allowed: /
`;

export function build(out = path.join(ROOT, 'site')) {
  // 只清本脚本建的文件，且只在 site/ 之内
  if (fs.existsSync(out)) {
    if (fs.lstatSync(out).isSymbolicLink()) throw new Error('site/ 是链接，停止');
    for (const f of [...Object.keys(FILES), ...GENERATED]) { const p = path.join(out, f); if (fs.existsSync(p)) fs.unlinkSync(p) }
  } else fs.mkdirSync(out);
  for (const [to, from] of Object.entries(FILES)) { fs.mkdirSync(path.dirname(path.join(out, to)), { recursive: true }); fs.copyFileSync(path.join(ROOT, from), path.join(out, to)) }
  fs.writeFileSync(path.join(out, 'manifest.webmanifest'), previewManifest(fs.readFileSync(path.join(ROOT, 'manifest.webmanifest'), 'utf8')));
  const when = new Date().toLocaleString('zh-CN', { timeZone: 'Australia/Melbourne', hour12: false }).slice(0, -3);
  fs.writeFileSync(path.join(out, 'index.html'), indexHTML(commit(), when + ' 墨尔本'));   // 只有预览站根用得到；正式站 / 由中间件给选排版页
  fs.writeFileSync(path.join(out, '_routes.json'), JSON.stringify(ROUTES, null, 2) + '\n');
  fs.writeFileSync(path.join(out, 'materials.html'), materialsHTML(posters(), commit(), when + ' 墨尔本'));
  fs.writeFileSync(path.join(out, '_headers'), HEADERS);
  // 这次部署对应哪次提交（线上核对用：https://…/version.json 的 sha 要等于仓库 HEAD）
  fs.writeFileSync(path.join(out, 'version.json'), JSON.stringify({ sha: commit(), schema: latestMigration(), migrations: migrations(), built: new Date().toISOString() }) + '\n');
  return out;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const out = build();
  console.log(`site/：${fs.readdirSync(out).length} 个文件`);
}
