// Cloudflare Pages Functions 的共用处理：/g/码、/p/编号 返回「应用页面 + 这条链接自己的卡片信息」，网址保持不变（应用按网址里的码打开对应球局 / 球员卡）。
import { cardFor, rewriteHead } from './card.mjs';

const mobile = ua => /Mobile|iPhone|iPad|Android/i.test(ua || '');
// data：{games, users}（预览站是 demo_data.json，由 functions/ 入口导入——这里不直接 import JSON，Node 测试才能直接载入）
export async function sharePage(kind, key, request, env, data) {
  const url = new URL(request.url), asset = mobile(request.headers.get('user-agent')) ? '/pwa.html' : '/web.html';
  const r = await env.ASSETS.fetch(new Request(new URL(asset, url), { redirect: 'follow' }));
  if (!r.ok) return r;
  const html = rewriteHead(await r.text(), cardFor(kind, key, data, url.origin, url.pathname));
  return new Response(html, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex, nofollow' } });
}
