// 南伴球 · 安全响应头（第五批 5a-3 草稿，5g 部署时接到托管平台 / 反向代理上）。
//   前台三个页面都是单文件（脚本、样式写在页面里，后台还有 oninput= 这类行内处理），所以 script-src 暂时要 'unsafe-inline'；
//   防注入主要靠「所有用户文字先 esc() 再显示」（tests/frontend/xss.js、tests/admin/xss.js 保证）。
//   以后拆成独立 .js 文件后，把 'unsafe-inline' 换成 nonce，第三方库已放到本站 vendor/（不再从 cdnjs 加载）。
export const SUPABASE = process.env.SUPABASE_URL || 'https://xosrdkrkfxkdrwldfhac.supabase.co';

export const STAGING = 'https://nqgyhjtwbvuxmyxvegkf.supabase.co';   // 测试库（分支预览用）
export const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",                                          // leaflet / html2canvas / qrcodejs 已改本站托管（vendor/，11-11 L5）
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://tile.openstreetmap.org",                  // 地图瓦片（11-11 起用 OSM：Carto 的 key 失效、瓦片 403）；分享图 / 二维码是 data: / blob:
  `connect-src 'self' ${SUPABASE} ${SUPABASE.replace(/^https/, 'wss')} ${STAGING} ${STAGING.replace(/^https/, 'wss')}`,        // 接口 + Realtime（页面里提醒）
  "font-src 'self' data:",
  "worker-src 'self'", "manifest-src 'self'",
  "frame-ancestors 'none'",                                                     // 不允许被别的网站嵌入（防点击劫持）
  "base-uri 'none'", "object-src 'none'", "form-action 'self'",
  'upgrade-insecure-requests',
].join('; ');

export const SECURITY_HEADERS = {
  'Content-Security-Policy': CSP,
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',          // 只走 HTTPS
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',                                                    // 老浏览器的 frame-ancestors
  'Referrer-Policy': 'strict-origin-when-cross-origin',                         // 分享链接里的 s / f 参数不外泄到第三方
  'Permissions-Policy': 'geolocation=(self), camera=(), microphone=(), payment=(), usb=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
};
// 后台另加：不缓存、不被搜索引擎收录
export const ADMIN_HEADERS = { ...SECURITY_HEADERS, 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' };
// sw.js 必须能及时更新
export const SW_HEADERS = { 'Cache-Control': 'no-cache', 'Service-Worker-Allowed': '/' };
