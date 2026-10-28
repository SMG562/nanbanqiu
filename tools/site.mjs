#!/usr/bin/env node
/**
 * 生成预览网站 site/（10-27，Cloudflare Pages 每次推送自动部署：构建命令 `node tools/site.mjs`，输出目录 `site`）。
 *
 *   node tools/site.mjs            生成 site/（先清空 site/ 里上次生成的文件——只删 site/ 之内、本脚本建的）
 *
 * 只放可以公开的文件（白名单 FILES）；进度记录、数据库、测试、服务端代码一律不进。
 * 入口页 index.html：手机端 / 网页端 / 后台三个链接 + 这次部署对应的提交。
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
  'manifest.webmanifest': 'manifest.webmanifest',
};
export const GENERATED = ['index.html', '_headers'];

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
</main></body></html>
`;
}
export const HEADERS = `/*
  X-Robots-Tag: noindex, nofollow
  Cache-Control: no-cache
`;

export function build(out = path.join(ROOT, 'site')) {
  // 只清本脚本建的文件，且只在 site/ 之内
  if (fs.existsSync(out)) {
    if (fs.lstatSync(out).isSymbolicLink()) throw new Error('site/ 是链接，停止');
    for (const f of [...Object.keys(FILES), ...GENERATED]) { const p = path.join(out, f); if (fs.existsSync(p)) fs.unlinkSync(p) }
  } else fs.mkdirSync(out);
  for (const [to, from] of Object.entries(FILES)) fs.copyFileSync(path.join(ROOT, from), path.join(out, to));
  const when = new Date().toLocaleString('zh-CN', { timeZone: 'Australia/Melbourne', hour12: false }).slice(0, -3);
  fs.writeFileSync(path.join(out, 'index.html'), indexHTML(commit(), when + ' 墨尔本'));
  fs.writeFileSync(path.join(out, '_headers'), HEADERS);
  return out;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const out = build();
  console.log(`site/：${fs.readdirSync(out).length} 个文件`);
}
