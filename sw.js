/* 南伴球 Service Worker —— 离线壳 + Web Push
 * 注册：navigator.serviceWorker.register('/sw.js')（范围是整个网站：所有城市共用一个；每个城市的 PWA 安装配置单独，见 server/routes.mjs）
 * 订阅：reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: VAPID_PUBLIC_KEY })
 *       → POST /push/subscriptions  { endpoint, keys: { p256dh, auth } }
 * iOS：只有“添加到主屏幕”后从主屏幕打开（iOS 16.4+），并由用户点击触发授权，才能订阅推送。
 */
const VERSION = 'nbq-v5';   // R3-2：每个城市一个网址（/melbourne/ …），离线壳按城市缓存；换版本让旧缓存失效
const SHELL = ['/melbourne/', '/icons/icon-192.png'];

self.addEventListener('install', e => {
  // 离线壳逐个缓存、失败不影响安装（预览站没有 /melbourne/；一个文件缓存不上，整个 Service Worker 就装不上，推送也就订阅不了）
  e.waitUntil(caches.open(VERSION).then(c => Promise.allSettled(SHELL.map(u => c.add(u)))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// 页面导航：网络优先，离线时回退到缓存的壳；API 请求不走缓存
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.pathname.startsWith('/api/')) return;
  if (e.request.mode === 'navigate') {
    // 离线壳按城市：/<城市>/… 打开过就缓存这个城市的页面，离线时回退到它（没有就回退墨尔本）
    const city = (url.pathname.match(/^\/([a-z]+)\//) || [])[1], shell = city && !['g', 'p', 'api', 'admin'].includes(city) ? `/${city}/` : null;
    e.respondWith(fetch(e.request).then(r => {
      if (shell && r.ok && !r.redirected) { const c = r.clone(); caches.open(VERSION).then(x => x.put(shell, c)).catch(() => { }) }
      return r;
    }).catch(async () => (shell && await caches.match(shell)) || (await caches.match('/melbourne/')) || Response.error()));
  }
});

/* 服务端 payload 约定（web-push 发送 JSON）：
 * { "title": "Han Liu 接受了你的申请 🎾",
 *   "body":  "今晚 18:00 · Glen Iris · 点击查看集合信息",
 *   "url":   "/g/7Kq2",
 *   "tag":   "approved-7Kq2",        // 种类 + 球局：同一局同一类提醒替换旧的，不同类不互相覆盖
 *   "kind":  "approved",              // = notifications.kind（notif_kind）
 *   "notif_id": 12345 }               // = notifications.id（bigint）；合并推送时填最新那一条
 * 点击后打开 url，并在 URL 上追加 ?n=<notif_id>&k=<kind>（放在 # 之前，已有参数保留）；
 * 前台读到 n / k 时：session_start.entry='push'，发 notif_open{kind, from:'push', notif_id}，然后把 n / k 从地址栏去掉。
 * 服务端路由规则见 schema.sql「通知 v2」：正在用的设备优先、否则优先手机、出发类总推手机、22–08 不紧急的顺延。
 * 页面在前台时不弹系统通知（页面自己显示横幅），所以这里只在后台被调用。
 */
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { d = { body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || '南伴球', {
    body: d.body || '',
    tag: d.tag || ((d.kind || 'n') + '-' + (d.url || '')),
    renotify: ['soon', 'game_cancelled', 'changed', 'postponed'].includes(d.kind),
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    data: { url: d.url || '/', kind: d.kind || null, notif_id: d.notif_id != null ? d.notif_id : (d.id != null ? d.id : null) }
  }));
});

// 推送打开的地址：在原 url 上追加 n=<notif_id>&k=<kind>（URL 对象会把参数放在 # 之前，hash 路由不受影响）
function pushTarget(data) {
  let u = new URL('/', self.location.origin);   // 「/」由后端跳到墨尔本；推送里的 url 是短链接 /g/码，后端再跳到球局所在城市
  try { u = new URL((data && data.url) || '/', self.location.origin) } catch (_) { }
  if (u.origin !== self.location.origin || !/^https?:$/.test(u.protocol)) u = new URL('/', self.location.origin);   // 只打开本站页面（5a-3）
  if (data && data.notif_id != null) u.searchParams.set('n', String(data.notif_id));
  if (data && data.kind) u.searchParams.set('k', String(data.kind));
  return u.href;
}

// 点击通知：已打开的窗口直接跳转，否则新开
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const target = pushTarget(e.notification.data || {});
  e.waitUntil((async () => {
    const wins = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const w of wins) {
      if (!('focus' in w)) continue;
      try {
        await w.focus();
        if ('navigate' in w) { const r = await w.navigate(target); if (r) return r; }
      } catch (_) { /* 未受控的窗口不能 navigate：退回新开窗口 */ }
      break;
    }
    return clients.openWindow(target);
  })());
});

// 订阅过期（浏览器轮换密钥）时重新订阅并上报
self.addEventListener('pushsubscriptionchange', e => {
  e.waitUntil((async () => {
    const sub = await self.registration.pushManager.subscribe(e.oldSubscription.options);
    await fetch('/api/push/subscriptions', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      credentials: 'include', body: JSON.stringify(sub)
    });
  })());
});
