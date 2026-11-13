// sw.js 离线壳（11-13 上线前审查）：断网时打开应用不能无限刷新。
//   为什么：/melbourne/ 的壳是「选排版页」，它再 fetch /pwa.html（或 /web.html）把整页载进来。以前只缓存了壳、没缓存 /pwa.html：
//           断网 → 壳从缓存出来 → fetch /pwa.html 失败 → 壳退回 location.replace('/pwa.html') → 这次导航又拿到缓存的壳 → 再失败 → 再跳……
//           装了推送（= 装了 Service Worker）的用户断网时看到的是一直闪的白屏，还费电。
//   查什么：在假的 Service Worker 环境里跑真 sw.js —— ① 联网时 /pwa.html、/web.html 经过就缓存  ② 断网时它们从缓存出来（应用能打开，显示上次的数据）
//           ③ 没缓存过就断网：导航到 /pwa.html 得到的是网络错误，不是选排版壳（不会循环）  ④ /api 不缓存、别的静态文件不管  ⑤ 城市壳照旧
//   查不到什么：真机上的表现（真机清单：开飞行模式从主屏幕打开）。
import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm'; import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(process.argv[2] || path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..'));
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 300) : '')) };
const O = 'https://nanbanqiu.app';
function makeSW() {
  const store = new Map(), L = {}, net = { online: true, hits: [] };
  const cache = { put: async (k, r) => { store.set(String(typeof k === 'string' ? k : k.url).replace(O, ''), r) }, add: async () => { } };
  const self = { addEventListener: (t, f) => { L[t] = f }, location: { origin: O }, skipWaiting: () => { }, clients: { claim: () => { } }, registration: {} };
  const ctx = { self, URL, Response, Promise, console, caches: { open: async () => cache, keys: async () => [], delete: async () => true, match: async k => { const r = store.get(String(typeof k === 'string' ? k : k.url).replace(O, '')); return r ? r.clone() : undefined } },
    fetch: async rq => { const u = typeof rq === 'string' ? rq : rq.url; net.hits.push(u.replace(O, '')); if (!net.online) throw new TypeError('offline'); return new Response('LIVE ' + new URL(u).pathname, { status: 200 }) }, clients: { matchAll: async () => [], openWindow: async () => { } } };
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8'), ctx);
  // 发一个请求给 fetch 监听；返回 'pass'（没接管，走浏览器默认）、'error'（网络错误）或响应文字
  const get = async (p, mode = 'cors', method = 'GET') => { let res; const e = { request: { url: O + p, method, mode, clone() { return this } }, respondWith: r => { res = r }, waitUntil: () => { } };
    L.fetch(e); if (res === undefined) return 'pass'; try { const r = await res; await new Promise(x => setTimeout(x, 5)); return !r || r.type === 'error' ? 'error' : await r.text() } catch (_) { return 'error' } };
  return { get, net, store };
}

{ const s = makeSW();
  T('① 联网：/pwa.html 走网络', await s.get('/pwa.html') === 'LIVE /pwa.html');
  T('① 联网：/web.html 走网络', await s.get('/web.html') === 'LIVE /web.html');
  T('① 联网：城市壳走网络', await s.get('/melbourne/', 'navigate') === 'LIVE /melbourne/');
  s.net.online = false;
  T('② 断网：城市壳从缓存出来', await s.get('/melbourne/', 'navigate') === 'LIVE /melbourne/');
  T('② 断网：/pwa.html 从缓存出来（应用能打开）', await s.get('/pwa.html') === 'LIVE /pwa.html');
  T('② 断网：/web.html 从缓存出来', await s.get('/web.html') === 'LIVE /web.html');
  T('② 断网：带参数的 /pwa.html?source=pwa 也认', await s.get('/pwa.html?source=pwa') === 'LIVE /pwa.html');
  T('④ /api 不接管、不缓存', await s.get('/api/games') === 'pass' && ![...s.store.keys()].some(k => k.startsWith('/api')));
  T('④ 其他静态文件不接管', await s.get('/vendor/leaflet/leaflet.js') === 'pass' && await s.get('/build.json') === 'pass');
  T('④ POST 不接管', await s.get('/pwa.html', 'cors', 'POST') === 'pass'); }

{ const s = makeSW(); await s.get('/melbourne/', 'navigate'); s.net.online = false;   // 只打开过壳、整页没缓存上（比如装完 Service Worker 就断网）
  const page = await s.get('/pwa.html');
  T('③ 没缓存过：页面自己取 /pwa.html 得到网络错误', page === 'error', page);
  const nav = await s.get('/pwa.html', 'navigate');
  T('③ 没缓存过：导航到 /pwa.html 不能再给选排版壳（否则无限刷新）', nav === 'error', nav);
  T('⑤ 没打开过的城市断网：回退墨尔本的壳', await s.get('/sydney/', 'navigate') === 'LIVE /melbourne/'); }

console.log(`sw_offline: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
