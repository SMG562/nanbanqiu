// 发布安全网（11-20）：把「上线后版本管理」五条原则做成机器检查。故障分析与教训见项目文档《分析_发布与版本管理的故障模式_教训与对应守卫》。
//   ① 部署≠发布：功能开关登记默认值，代码实际求值必须一致  ② 接口 / 推送载荷 N-1 兼容：路由只增不减，真 sw.js 吃旧 / 新 / 乱码载荷
//   ③ 回滚是切换：_headers、构建号、SW 生命周期、手册里「回滚后先暂停合并」  ④ 状态与版本解耦：存储键 / manifest id 冻结，真登录模块读旧 / 带新字段的登录态
//   ⑤ 可观察：手册 §2 的报警键在服务端真实存在；version.json 字段齐
// 登记表 tests/spec/release_contract.json 是棘轮：新增开关 / 存储键要先登记（逼人写明默认值与兼容性）；删接口、改默认值会红。
//   重新生成建议值：NBQ_SNAPSHOT=1 node tests/unit/release_safety.mjs
// 查不到：新功能对不对、真机（iOS 安装 / 微信 / 键盘）、旧前端 + 新库实测（docs/演练记录.md 标未测）。
import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm'; import { execFileSync } from 'node:child_process'; import { fileURLToPath, pathToFileURL } from 'node:url';
const DIR = path.resolve(process.argv[2] || process.env.NBQ_DIR || path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..'));
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 400) : '')) };
const rd = f => fs.readFileSync(path.join(DIR, f), 'utf8');
const walk = d => fs.readdirSync(path.join(DIR, d), { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : /\.(js|html)$/.test(e.name) ? [path.join(d, e.name)] : []);
const SRC = walk('src').map(f => [f, rd(f)]), ALL = SRC.map(x => x[1]).join('\n'), SW = rd('sw.js'), HANDLER = rd('server/api/handler.mjs'), MANUAL = rd('出事处理手册.md');
const C = JSON.parse(rd('tests/spec/release_contract.json'));
const same = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());

// ① 功能开关：登记的「正式站默认值」必须等于代码实际求值（NBQ_ENV=prod、本机没有任何覆盖）
const flags = {};
for (const m of ALL.matchAll(/^\s*const (NBQ_[A-Z0-9_]+_ON)=(.*);\s*$/gm)) { try { flags[m[1]] = !!vm.runInNewContext(m[2], { NBQ_ENV: 'prod', localStorage: { getItem: () => null } }) } catch (e) { flags[m[1]] = 'ERR ' + e.message } }
for (const m of ALL.matchAll(/sbFlag\('(NBQ_[A-Z0-9_]+_ON)',(true|false)\)/g)) flags[m[1]] = m[2] === 'true';
const declared = new Set([...ALL.matchAll(/(?:const|let|var)\s+(NBQ_[A-Z0-9_]+_ON)\b|window\.(NBQ_[A-Z0-9_]+_ON)\s*=[^=]|sbFlag\('(NBQ_[A-Z0-9_]+_ON)'/g)].map(m => m[1] || m[2] || m[3]));   // 不管写在哪一行，只要出现声明就必须登记
for (const k of new Set([...declared, ...Object.keys(flags)])) T(`① 开关 ${k} 已登记`, k in C.flags, k);
for (const [k, v] of Object.entries(C.flags)) T(`① 开关 ${k} 正式站默认 ${v ? '开' : '关'}（改默认值要同时改登记表并写明所有者决定；求值不出来也算红）`, flags[k] === v, flags[k]);
const adminKeys = (rd('server/admin/api.mjs').match(/\[('register_paused'[^\]]*)\]\.includes\(b\.key\)/) || [, ''])[1].match(/\w+/g) || [];
T('① 后台允许的止血开关 = 登记 = 手册 §6 所列', same(adminKeys, C.switches) && C.switches.every(k => MANUAL.includes(k)), adminKeys);
for (const k of C.switches) T(`① 止血开关 ${k} 在前台或接口里有真实拦截`, HANDLER.includes(k) || ALL.includes(k) || rd('src/shared/script/0490-Supabase登录.js').includes(k));

// ② 接口只增不减 + 推送载荷兼容
const routes = [...HANDLER.matchAll(/'(GET|POST|PUT|PATCH|DELETE) (\/api\/[^']*)'/g)].map(m => m[1] + ' ' + m[2]);
for (const r of C.api_routes) T(`② 前台接口 ${r} 仍在（删除/改名要走新路径，ADR 0013）`, routes.includes(r));
T('② 接口清单能读出来（防正则失效）', routes.length >= C.api_routes.length && C.api_routes.length > 50, routes.length);
const O = 'https://nanbanqiu.app';
function makeSW(keys = []) {
  const L = {}, shown = [], opened = [], dels = [], st = { skip: 0, claim: 0 };
  const self = { addEventListener: (t, f) => { L[t] = f }, location: { origin: O }, skipWaiting: () => { st.skip++ }, clients: { claim: () => { st.claim++ } }, registration: { showNotification: async (t, o) => { shown.push([t, o]) } } };
  const ctx = { self, URL, Response, Promise, console, setTimeout, fetch: async () => new Response('x'), caches: { open: async () => ({ add: async () => { }, put: async () => { } }), keys: async () => keys, delete: async k => { dels.push(k); return true }, match: async () => undefined },
    clients: { matchAll: async () => [], openWindow: async u => { opened.push(u) } } };
  vm.runInNewContext(SW, ctx);
  const run = async (t, ev) => { let p; L[t]({ ...ev, waitUntil: x => { p = x } }); await p };
  return { run, shown, opened, dels, st };
}
{ const mk = d => ({ data: { json: () => { if (d === 'bad') throw new Error('x'); return d }, text: () => 'raw' } });
  for (const [n, d] of [['老格式（字段在最外层）', { title: 'T', body: 'B', kind: 'approved', notif_id: 5, url: '/g/7Kq2' }], ['新格式（字段在 data 里）', { title: 'T', data: { kind: 'soon', notif_id: 6, url: '/g/7Kq2' } }], ['带未知新字段', { title: 'T', future_field: { a: 1 }, kind: 'x_new_kind' }], ['空对象', {}], ['乱码（json 解析失败）', 'bad']]) {
    const s = makeSW(); let err = null; try { await s.run('push', mk(d)) } catch (e) { err = e }
    T(`② 推送载荷「${n}」：不抛错且弹出一条通知`, !err && s.shown.length === 1, String(err)); }
  const s0 = makeSW(); await s0.run('push', { data: null }); T('② 推送载荷「没有 data」也弹通知', s0.shown.length === 1);
  const s = makeSW(); await s.run('notificationclick', { notification: { close() { }, data: { url: 'https://evil.example/x', kind: 'soon', notif_id: 9 } } });
  T('② 通知里带外站链接：只会打开本站页面', s.opened.length === 1 && s.opened[0].startsWith(O + '/') && !s.opened[0].includes('evil'), s.opened);
  const s2 = makeSW(); await s2.run('notificationclick', { notification: { close() { }, data: { url: '/g/7Kq2#/chat', kind: 'soon', notif_id: 9 } } });
  T('② 点通知：追加 n / k，保留 # 路由', /^https:\/\/nanbanqiu\.app\/g\/7Kq2\?n=9&k=soon#\/chat$/.test(s2.opened[0]), s2.opened); }

// ③ 回滚 / 更新通道
const site = await import(pathToFileURL(path.join(DIR, 'tools/site.mjs')).href);
const blocks = Object.fromEntries(site.HEADERS.trim().split(/\n\s*\n/).map(b => { const l = b.split('\n'); return [l[0].trim(), l.slice(1).map(x => x.trim())] }));
T('③ _headers：全站 no-cache（页面每次打开都向网络核对）', (blocks['/*'] || []).includes('Cache-Control: no-cache'), blocks['/*']);
T('③ _headers：/sw.js no-cache + Service-Worker-Allowed（修复通道不能被缓存卡死）', (blocks['/sw.js'] || []).includes('Cache-Control: no-cache') && (blocks['/sw.js'] || []).includes('Service-Worker-Allowed: /'), blocks['/sw.js']);
T('③ _headers：只有 /vendor/* 允许长缓存（build.json / version.json / 页面不许）', Object.entries(blocks).every(([p, l]) => p === '/vendor/*' || !l.some(x => /max-age|immutable|s-maxage/i.test(x))), blocks);
T('③ 构建号：两个整页都打 nbq-build 戳，且与 sw.js 缓存的整页是同一组', same(site.BUILD_PAGES, ['pwa.html', 'web.html']) && same(SW.match(/const PAGES = \[([^\]]*)\]/)[1].match(/\/[\w.]+/g), site.BUILD_PAGES.map(x => '/' + x)));
T('③ stampBuild：有构建号才打戳，没有就原样', site.stampBuild('<head>x', '1-ab').includes('<meta name="nbq-build" content="1-ab">') && site.stampBuild('<head>x', '') === '<head>x');
{ let git = true; try { execFileSync('git', ['rev-parse', '--git-dir'], { cwd: DIR, stdio: 'ignore' }) } catch { git = false }
  const id = site.buildId(); T('③ 构建号格式「提交秒-短sha」（在 git 里必须取得到）', git ? /^\d{9,11}-[0-9a-f]{7,}$/.test(id) : id === '', id); }
{ const s = makeSW(['nbq-v1', 'other']); const V = SW.match(/const VERSION = '([^']+)'/)[1]; s.dels.length = 0; const s2 = makeSW([V, 'nbq-v1', 'other']);
  await s2.run('install', {}); await s2.run('activate', {});
  T('③ SW：安装即 skipWaiting、激活即 claim；只清掉名字不等于当前版本的缓存', s2.st.skip === 1 && s2.st.claim === 1 && same(s2.dels, ['nbq-v1', 'other']) && !s2.dels.includes(V), [s2.st, s2.dels]); }
T('③ 手册 §6：回滚后先暂停合并（开着自动部署，下一次 push main 会盖掉回滚，11-20 演练已证实）', /回滚后先暂停合并/.test(MANUAL));

// ④ 状态与版本解耦
const keys = new Set([...ALL.matchAll(/(?:localStorage|sessionStorage)\.(?:get|set|remove)Item\('(nbq_[a-z0-9_]+)'/g)].map(m => m[1]));
for (const m of ALL.matchAll(/(?:[A-Z_]*KEY[A-Z_]*|[A-Z_]*_K|\bK)\s*=\s*'(nbq_[a-z0-9_]+)'/g)) keys.add(m[1]);
for (const k of keys) T(`④ 存储键 ${k} 已登记（新增键先登记并写明旧版本怎么办）`, C.storage_known.includes(k) || C.storage_protected.includes(k), k);
for (const k of C.storage_protected) T(`④ 受保护存储键 ${k} 仍在源码里（改名 = 全员掉登录 / 交接）`, ALL.includes("'" + k + "'") || ALL.includes('"' + k + '"'));
T('④ 全站不出现 localStorage / sessionStorage .clear() / deleteDatabase', ![ALL, SW].some(s => /(?:local|session)Storage\.clear\(|indexedDB\.deleteDatabase/.test(s)));
{ const mf = JSON.parse(rd('manifest.webmanifest')); T('④ manifest 默认版：id 与 scope 冻结为 "/"', mf.id === '/' && mf.scope === '/', [mf.id, mf.scope]);
  const { cityManifest } = await import(pathToFileURL(path.join(DIR, 'server/routes.mjs')).href);
  for (const [slug, zh] of [['melbourne', '墨尔本'], ['sydney', '悉尼']]) { const m = JSON.parse(cityManifest(rd('manifest.webmanifest'), { slug, name_zh: zh })); T(`④ manifest ${slug}：id / scope = /${slug}/（改了 = 已安装用户当成另一个应用）`, m.id === `/${slug}/` && m.scope === `/${slug}/` && m.start_url === `/${slug}/?source=pwa`, m) } }
{ const src = rd('src/shared/script/0490-Supabase登录.js'), pure = src.slice(0, src.indexOf('/* ---- 页面接线')); const ctx = vm.createContext({ JSON, String, Math, Date, Promise, Object }); vm.runInContext(pure + '\n;globalThis.__x={sbAuthMake}', ctx);
  const NOW = 1_800_000_000, CFG = { url: 'https://abc.supabase.co', key: 'k' };
  const env = (stored, reply) => { const mem = { nbq_sb: stored }, calls = []; const fetch = async (u, o) => { calls.push(u); const r = reply || { s: 500, d: {} }; return { ok: r.s < 300, status: r.s, json: async () => r.d } };
    return { A: ctx.__x.sbAuthMake(CFG, { fetch, now: () => NOW * 1000, store: { get: k => mem[k] ?? null, set: (k, v) => { mem[k] = v }, del: k => { delete mem[k] } } }), mem, calls } };
  const S = (o = {}) => JSON.stringify({ access_token: 'AT', refresh_token: 'RT', expires_at: NOW + 3600, uid: 'u1', phone: '614', ...o });
  let e = env(S()); T('④ 登录态：最早格式（5 个字段）能读，不发请求', (await e.A.fresh()).uid === 'u1' && e.calls.length === 0);
  e = env(S({ future_field: { a: 1 }, schema: 9 })); const before = e.mem.nbq_sb; T('④ 登录态：带未知新字段不掉登录、不改写存储', (await e.A.fresh()).uid === 'u1' && e.mem.nbq_sb === before);
  e = env(S({ expires_at: NOW + 10, future_field: 1, own: true }), { s: 200, d: { access_token: 'AT2', refresh_token: 'RT2', expires_in: 3600, user: { id: 'u1', phone: '614' } } }); const r = await e.A.fresh();
  T('④ 登录态：快过期 + 带新字段 → 仍能续期，保留 uid、own 标记、换到新令牌', r && r.uid === 'u1' && r.access_token === 'AT2' && r.own === true && e.calls[0] === '/api/session/refresh', [r, e.calls]);
  e = env(S({ expires_at: NOW + 10 })); T('④ 登录态：续期时服务端 5xx 不清登录', (await e.A.fresh()) !== null && !!e.mem.nbq_sb);
  e = env('{坏掉的存储'); T('④ 登录态：存储被写坏不抛错、视为未登录', e.A.session() === null && (await e.A.fresh()) === null); }

// ⑤ 可观察
const alertKeys = [...new Set([...(MANUAL.split('## 3.')[0].matchAll(/^###\s+2\.\d+.*$/gm))].flatMap(m => [...m[0].matchAll(/（([a-z_]+)）/g)].map(x => x[1])))];
const SERVER = ['server', 'notify-worker', 'worker'].filter(d => fs.existsSync(path.join(DIR, d))).flatMap(d => { const w = x => fs.readdirSync(path.join(DIR, x), { withFileTypes: true }).flatMap(e => e.isDirectory() ? (e.name === 'node_modules' ? [] : w(path.join(x, e.name))) : [path.join(x, e.name)]); return w(d) }).filter(f => /\.(mjs|js|sql)$/.test(f)).map(f => rd(f)).join('\n') + rd('schema.sql');
T('⑤ 手册 §2 的报警键能读出来（防正则失效）', alertKeys.length >= 10, alertKeys);
for (const k of alertKeys) T(`⑤ 手册里的报警键 ${k} 在服务端 / 库里真实存在（防手册与代码漂移）`, SERVER.includes(k));
{ const body = (fs.readFileSync(path.join(DIR, 'tools/site.mjs'), 'utf8').match(/version\.json'\), JSON\.stringify\(\{([^}]*)\}/) || [, ''])[1];
  T('⑤ version.json 含 sha / schema / migrations / built（线上核对版本用）', ['sha', 'schema', 'migrations', 'built'].every(k => new RegExp('\\b' + k + '\\b').test(body)), body); }

if (process.env.NBQ_SNAPSHOT) console.log(JSON.stringify({ flags, storage: [...keys].sort(), api_routes: [...new Set(routes)].sort() }, null, 1));
console.log(`release_safety: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
