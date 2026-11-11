// Cloudflare Pages Functions 的共用处理：/g/码、/p/编号 返回「应用页面 + 这条链接自己的卡片信息」，网址保持不变（应用按网址里的码打开对应球局 / 球员卡）。
import { cardFor, rewriteHead } from './card.mjs';
import { chooserHTML } from '../site_route.mjs';

// data：{games, users}（预览站是 demo_data.json，由 functions/ 入口导入——这里不直接 import JSON，Node 测试才能直接载入）
export async function sharePage(kind, key, request, env, data) {
  const url = new URL(request.url), asset = '(同城市网址的选排版壳)';
  // 和 /melbourne/ 同一个壳：浏览器里按同一条规则把手机版 / 网页版原地载入；爬虫只看头部这条链接自己的卡片
  const shell = chooserHTML();
  // 排查用：打开 /g/码?og=debug 直接看服务端认出了什么（部署后 Safari 里打开，能看到文字就说明服务端在跑）
  if (url.searchParams.get('og') === 'debug') return new Response(JSON.stringify({ server: 'og', kind, key, asset, card: cardFor(kind, key, data, url.origin, url.pathname) }, null, 1), { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
  const html = rewriteHead(shell, cardFor(kind, key, data, url.origin, url.pathname));
  return new Response(html, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex, nofollow' } });
}
