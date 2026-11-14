// 正式首页（11-03 第一轮）：nanbanqiu.app 不再是开发用的入口页（手机端 / 网页端 / 后台 / 宣传物料四个链接 + 「演示数据」），
// 打开就进应用，按主要输入方式选排版（11-03 你定的）：触屏设备（手机、iPad）横竖都是手机版——转屏不换样式；
//   用鼠标 / 触控板的电脑看窗口宽度：宽 → 网页版，缩窄 → 手机版。不按设备型号（新 iPad 的 Safari 自称 Mac，按型号会认错）。
//   /                  → 跳到城市网址 /melbourne/
//                        例外：预览站根 nanbanqiu-preview.pages.dev 仍是入口页（后台、宣传物料从这里进）
//   正式站 /materials  → 回首页（宣传物料只在预览站）
// 第二轮（11-04）统一网址：/ → 302 /melbourne/（参数和 # 带上）；/melbourne/（和 /sydney/）= 同一个地址，页面里按上面的规则把手机版或网页版原地载入，地址栏不变；
//   旧地址 /pwa.html /web.html（含去掉 .html 的写法）被浏览器直接打开（导航请求）时跳到 /melbourne/，页面自己 fetch 它们不受影响；预览站根仍留着直达。
//   其余路径不管，交给下一层（静态文件、/api、/g、/p）。
// Pages：functions/_middleware.js 调用（只在 tools/site.mjs 写的 _routes.json 里列出的路径上运行）；Workers：worker/index.mjs 调用。
export const PREVIEW_ROOT = 'nanbanqiu-preview.pages.dev';
export const NARROW = 900;   // 电脑窗口窄于 900 用手机版
export const TOUCH = '(hover: none) and (pointer: coarse)';   // 主要输入是手指：手机、iPad（接了键盘触控板也还是手指为主）
export const isProd = h => /^(www\.)?nanbanqiu\.app$/.test(String(h || ''));
const HTML = { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex, nofollow' };

export const CITY_PATH = '/melbourne/';
const SLUGS = ['melbourne', 'sydney'];
// 选排版并原地载入：fetch 手机版 / 网页版整页，document.write 进来，地址栏不变（应用按网址第一段认城市、按 /g/码 认分享）。失败退回跳转。
// 判断规则的唯一来源；/g /p 的分享页（server/og/page.mjs）也用这个壳，只是头部换成这条链接自己的卡片信息。
// 登录交接（#299）：iOS 在页面加载时就读安装配置，不等脚本慢慢换。所以本机已缓存、还没过期的交接码要在第一时间同步写进 <link rel="manifest">——
//   壳里先写一次，整页载进来后页面头部再写一次（src/pwa/page/0010-开头.html 里是同一段，unit/site_route 核对两处一致）。只在本机有登录（nbq_sb）时写；不发请求、不探测
export const HO_EARLY = `try{var c=JSON.parse(localStorage.getItem('nbq_ho')||'null'),l=document.querySelector('link[rel="manifest"]');if(l&&c&&/^[A-Za-z0-9_-]{40,64}$/.test(c.code)&&c.exp-Date.now()>36e5&&localStorage.getItem('nbq_sb'))l.setAttribute('href','/api/manifest?h='+c.code)}catch(e){}`;
export const chooserScript = () => `${HO_EARLY};var t=!!(window.matchMedia&&matchMedia('${TOUCH}').matches),a=(t||(innerWidth||screen.width)<${NARROW})?'/pwa.html':'/web.html';
fetch(a,{credentials:'same-origin'}).then(function(r){if(!r.ok)throw 0;return r.text()}).then(function(h){document.open();document.write(h);document.close()}).catch(function(){location.replace(a+location.search+location.hash)})`;
export const chooserHTML = () => `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#176B4D"><title>南伴球</title><link rel="manifest" href="/manifest.webmanifest"><link rel="apple-touch-icon" href="/icons/icon-180.png">
<script>${chooserScript()}</script>
<style>html,body{margin:0;height:100%;background:#F2F4F2}</style></head><body>
<noscript><p style="font:15px sans-serif;padding:24px">南伴球需要开启 JavaScript。<a href="/pwa.html">手机版</a> · <a href="/web.html">电脑版</a></p></noscript>
</body></html>
`;
const OLD = /^\/(pwa|web)(\.html)?$/;

// 返回 Response，或 null（不归这里管，交给下一层）
export async function siteRoute(request) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return null;
  const url = new URL(request.url), p = url.pathname, head = request.method === 'HEAD';
  if (p === '/') {
    if (url.hostname === PREVIEW_ROOT) return null;
    return new Response(null, { status: 302, headers: { location: CITY_PATH + url.search, 'cache-control': 'no-store' } });
  }
  const m = p.match(/^\/([a-z]+)\/?$/);
  if (m && SLUGS.includes(m[1])) {
    if (p === '/' + m[1]) return new Response(null, { status: 302, headers: { location: p + '/' + url.search, 'cache-control': 'no-store' } });
    return new Response(head ? null : chooserHTML(), { status: 200, headers: HTML });
  }
  if (OLD.test(p) && url.hostname !== PREVIEW_ROOT && request.headers.get('sec-fetch-dest') === 'document')
    return new Response(null, { status: 302, headers: { location: CITY_PATH + url.search, 'cache-control': 'no-store' } });
  if (isProd(url.hostname) && /^\/materials(\.html)?\/?$/.test(p)) return new Response(null, { status: 302, headers: { location: '/', 'cache-control': 'no-store' } });
  return null;
}
