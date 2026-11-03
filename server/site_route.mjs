// 正式首页（11-03 第一轮）：nanbanqiu.app 不再是开发用的入口页（手机端 / 网页端 / 后台 / 宣传物料四个链接 + 「演示数据」），
// 打开就进应用，按主要输入方式选排版（11-03 你定的）：触屏设备（手机、iPad）横竖都是手机版——转屏不换样式；
//   用鼠标 / 触控板的电脑看窗口宽度：宽 → 网页版，缩窄 → 手机版。不按设备型号（新 iPad 的 Safari 自称 Mac，按型号会认错）。
//   /                  → 选排版的小页面（浏览器里判断后跳转，参数和 # 原样带上）
//                        例外：预览站根 nanbanqiu-preview.pages.dev 仍是入口页（后台、宣传物料从这里进）
//   正式站 /materials  → 回首页（宣传物料只在预览站）
// 第二轮再做统一网址 /melbourne/（手机、iPad、电脑同一个地址）。其余路径不管，交给下一层（静态文件、/api、/g、/p）。
// Pages：functions/_middleware.js 调用（只在 tools/site.mjs 写的 _routes.json 里列出的路径上运行）；Workers：worker/index.mjs 调用。
export const PREVIEW_ROOT = 'nanbanqiu-preview.pages.dev';
export const NARROW = 900;   // 电脑窗口窄于 900 用手机版
export const TOUCH = '(hover: none) and (pointer: coarse)';   // 主要输入是手指：手机、iPad（接了键盘触控板也还是手指为主）
export const isProd = h => /^(www\.)?nanbanqiu\.app$/.test(String(h || ''));
const HTML = { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex, nofollow' };

export const chooserHTML = () => `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#176B4D"><title>南伴球</title><link rel="manifest" href="/manifest.webmanifest"><link rel="apple-touch-icon" href="/icons/icon-180.png">
<script>var t=!!(window.matchMedia&&matchMedia('${TOUCH}').matches);location.replace((t||(innerWidth||screen.width)<${NARROW}?'/pwa.html':'/web.html')+location.search+location.hash)</script>
<style>html,body{margin:0;height:100%;background:#F2F4F2}</style></head><body>
<noscript><p style="font:15px sans-serif;padding:24px">南伴球需要开启 JavaScript。<a href="/pwa.html">手机版</a> · <a href="/web.html">电脑版</a></p></noscript>
</body></html>
`;

// 返回 Response，或 null（不归这里管，交给下一层）
export async function siteRoute(request) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return null;
  const url = new URL(request.url), p = url.pathname;
  if (p === '/') {
    if (url.hostname === PREVIEW_ROOT) return null;
    return new Response(request.method === 'HEAD' ? null : chooserHTML(), { status: 200, headers: HTML });
  }
  if (isProd(url.hostname) && /^\/materials(\.html)?\/?$/.test(p)) return new Response(null, { status: 302, headers: { location: '/', 'cache-control': 'no-store' } });
  return null;
}
