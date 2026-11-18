// #393 P3 照片管线的纯逻辑：命名、缩放、编码降级、解码回落、选图上限、上传队列（并发 / 重试 / 退避 / 取消 / 单张重试）、草稿。
//   被测 = src/shared/side/0068-照片管线.js，空沙盒载入（页面里的东西一个都不给）；浏览器 / 画布一侧见 tests/frontend/side_photo.js。
import fs from 'fs'; import vm from 'vm'; import path from 'path'; import { fileURLToPath } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url)), DIR = process.env.NBQ_DIR || path.join(HERE, '..', '..');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? '  ✓ ' : 'FAIL ') + n + (ok || x === undefined ? '' : ' ' + JSON.stringify(x).slice(0, 600))) };
const rd = f => fs.readFileSync(path.join(DIR, f), 'utf8'), F = 'src/shared/side/0068-照片管线.js';
const store = {}, sbLS = (k, v) => { if (v === undefined) return store[k] ?? null; if (v === null) delete store[k]; else store[k] = v };
let now = 1e12;
const ctx = vm.createContext({ sbLS, Date: { now: () => now }, Promise, setTimeout, clearTimeout, AbortController, Math, Array, Object, Error, Uint8Array });
vm.runInContext(rd(F) + '\n;globalThis.__x={SB_PH,sbPhName,sbPhFit,sbPhEncode,sbPhDecode,sbPhRun,sbPhPick,sbPhQueue,sbPhDraftGet,sbPhDraftSet,sbPhDraftClear}', ctx);
const X = ctx.__x, code = async p => { try { await p; return null } catch (e) { return e.code } };
T('文件在空沙盒里能载入，两端都拼进去了', !!X.sbPhQueue && ['pwa', 'web'].every(e => rd(`src/${e}.list`).includes('shared/side/0068-照片管线.js')));

// ---- 命名：16–24 位、字符集与 api_sb_post 键正则一致 ----
const names = Array.from({ length: 500 }, X.sbPhName);
T('随机名 16–24 位且只含 [A-Za-z0-9_-]', names.every(n => /^[A-Za-z0-9_-]{16,24}$/.test(n)));
T('500 个随机名不重复', new Set(names).size === 500);
T('随机名不以 -t / -b 结尾（会撞变体键）', names.every(n => !/-[tb]$/.test(n)));
{ // 强制前两次抽到以 -t / -b 结尾的名字：应重抽，最终名合格
  const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-', idx = s => [...s].map(c => A.indexOf(c));
  const fixed = [idx('aaaaaaaaaaaaaa-t'), idx('aaaaaaaaaaaaaa-b')]; let calls = 0;
  const sb2 = vm.createContext({ sbLS, Date, Promise, setTimeout, clearTimeout, AbortController, Array, Object, Error, Uint8Array,
    Math: Object.assign(Object.create(Math), { random: () => 0 }), // n = 16
    crypto: { getRandomValues: a => { const f = fixed[calls++]; for (let i = 0; i < a.length; i++) a[i] = f ? f[i] : (i * 7 + 3) % 62; return a } } });
  vm.runInContext(rd(F) + '\n;globalThis.__n=sbPhName', sb2);
  const n2 = sb2.__n();
  T('抽到 -t / -b 结尾时重抽，最终名合格', calls === 3 && !/-[tb]$/.test(n2) && /^[A-Za-z0-9_-]{16,24}$/.test(n2), { calls, n2 });
}

const sch = rd('schema.sql'), m = sch.match(/\[A-Za-z0-9_-\]\{(\d+),(\d+)\}/);
T('与数据库键正则的长度范围一致（8–64 ⊇ 16–24；找不到正则也算失败）', !!m && +m[1] <= 16 && +m[2] >= 24, m && m[0]);

// ---- 缩放 ----
T('长边缩到 1600、不放大、比例保持', JSON.stringify(X.sbPhFit(4000, 3000, 1600)) === '{"w":1600,"h":1200}' && JSON.stringify(X.sbPhFit(800, 600, 1600)) === '{"w":800,"h":600}' && X.sbPhFit(3000, 4000, 1600).h === 1600);
T('极窄图最短边不为 0', X.sbPhFit(10000, 3, 48).h === 1);

// ---- 选图上限 ----
T('已有 1 张再选 5 张：收 2 张，忽略 3 张', (r => r.take.length === 2 && r.skip === 3)(X.sbPhPick([1, 2, 3, 4, 5], 1)));
T('已满 3 张：一张都不收', (r => r.take.length === 0 && r.skip === 2)(X.sbPhPick([1, 2], 3)));

// ---- 假画布：size = w*h 的比例，便于验证降级 ----
let freed = [], encs = [];
const mkE = (o = {}) => ({
  bitmap: async (f, d) => { if (o.bitmapFail) throw new Error('x'); return { width: d ? d.w : f.w, height: d ? d.h : f.h, id: 'bm' + (d ? 'r' : '') } },
  img: async f => { if (o.imgFail) throw new Error('x'); return { naturalWidth: f.w, naturalHeight: f.h, id: 'img' } },
  enc: async (src, w, h, q) => { encs.push([w, h, q]); return { blob: { size: Math.round(w * h * q * (o.k || .1)) }, cv: { id: 'cv', w, h } } },
  free: s => freed.push(s && s.id) });
const file = (w, h, type = 'image/jpeg', size = 5e6) => ({ type, size, w, h });
let r = await X.sbPhRun(file(4000, 3000), mkE());
T('一张 4000×3000：三个变体 1600 / 480 / 48 长边', r.w === 1600 && r.h === 1200 && Object.keys(r.parts).join() === 'full,t,b' && encs.map(e => Math.max(e[0], e[1])).join() === '1600,480,48', encs);
T('键名合格、宽高是 full 的宽高', /^[A-Za-z0-9_-]{16,24}$/.test(r.name));
T('原图位图与三块画布都释放了', freed.filter(x => x === 'bm').length >= 1 && freed.filter(x => x === 'cv').length >= 3, freed);
encs = []; r = await X.sbPhRun(file(4000, 3000), mkE({ k: .7 }));   // full 1600×1200×.82×.7=1.1MB 过，t 480×360×.82×.7 = 99KB 过
T('大小在上限内：质量不降', encs[0][2] === .82);
encs = []; r = await X.sbPhRun(file(4000, 3000), mkE({ k: 1 }));   // full 1.57MB 超 → .7 = 1.34MB 过
T('超 1.5MB：质量降到 0.7，不缩尺寸', encs[0][2] === .82 && encs[1][2] === .7 && encs[1][0] === 1600, encs.slice(0, 3));
encs = []; r = await X.sbPhRun(file(4000, 3000), mkE({ k: 1.2 }));   // .7 = 1.6MB 仍超 → 1280
T('仍超：缩小到 1280', encs.some(e => e[0] === 1280), encs.slice(0, 4));
T('怎么降都超 → photo_too_big', await code(X.sbPhRun(file(4000, 3000), mkE({ k: 50 }))) === 'photo_too_big');
// ---- 解码 ----
T('视频 / 文本 / SVG / 空文件：给出明确错误码', [await code(X.sbPhDecode(file(1, 1, 'video/mp4'), mkE())), await code(X.sbPhDecode(file(1, 1, 'text/plain'), mkE())), await code(X.sbPhDecode(file(1, 1, 'image/svg+xml'), mkE())), await code(X.sbPhDecode(file(1, 1, 'image/jpeg', 0), mkE())), await code(X.sbPhDecode(null, mkE()))].join() === 'photo_not_image,photo_not_image,photo_not_image,photo_empty,photo_not_image');
T('位图解不了 → 回落 <img>', (await X.sbPhDecode(file(800, 600), mkE({ bitmapFail: true }))).id === 'img');
T('两种都解不了 → photo_decode', await code(X.sbPhDecode(file(800, 600), mkE({ bitmapFail: true, imgFail: true }))) === 'photo_decode');
freed = []; let s = await X.sbPhDecode(file(12000, 9000), mkE());
T('12000×9000（>16MP）：先缩到 ≤4096 再用，原位图释放', s.id === 'bmr' && s.width === 4096 && s.height === 3072 && freed.includes('bm'), [s, freed]);
T('透明 / 动图只走同一条路（type=image/png、image/gif 都收）', (await X.sbPhDecode(file(10, 10, 'image/png'), mkE())).width === 10 && (await X.sbPhDecode(file(10, 10, 'image/gif'), mkE())).width === 10);

// ---- 上传队列 ----
const mkQ = (script, extra = {}) => { const log = [], ev = []; let live = 0, peak = 0;
  const put = async (n, v, b, sg) => { log.push(n + ':' + v); live++; peak = Math.max(peak, live); try { return await script(n, v, log.filter(x => x === n + ':' + v).length, sg) } finally { live-- } };
  const q = X.sbPhQueue({ put, sleep: async ms => { log.push('sleep' + ms) }, on: it => ev.push(it.name + ':' + it.st), ...extra }); return { q, log, ev, peak: () => peak } };
const settle = async () => { for (let i = 0; i < 30; i++) await new Promise(r => setTimeout(r, 0)) };
const P = { full: 1, t: 2, b: 3 };
let Q = mkQ(async () => ({ status: 200 })); ['a', 'b', 'c', 'd'].forEach(n => Q.q.add(n, P)); await settle();
T('4 张全部传完；每张按 b → t → full 顺序', Q.q.items.every(i => i.st === 'ok') && Q.log.filter(x => x.startsWith('a:')).join() === 'a:b,a:t,a:full', Q.log);
T('并发不超过 2', Q.peak() <= 2 && Q.peak() === 2, Q.peak());
Q = mkQ(async (n, v, k) => v === 't' && k < 3 ? { status: 503 } : { status: 200 }); Q.q.add('a', P); await settle();
T('5xx 重试：退避 500 → 1000ms，第 3 次成功，整张传完', Q.q.items[0].st === 'ok' && Q.log.filter(x => x.startsWith('sleep')).join() === 'sleep500,sleep1000', Q.log);
Q = mkQ(async () => ({ status: 429, retryAfter: 7 })); Q.q.add('a', P); await settle();
T('429 遵守 Retry-After（7s），重试 3 次后失败 photo_upload', Q.q.items[0].st === 'fail' && Q.log.filter(x => x === 'sleep7000').length === 3 && Q.q.items[0].code === 'photo_upload', Q.log);
Q = mkQ(async () => { throw new Error('offline') }); Q.q.add('a', P); await settle();
T('网络断：重试 3 次（共 4 次尝试）后失败 photo_net', Q.q.items[0].st === 'fail' && Q.q.items[0].code === 'photo_net' && Q.log.filter(x => x === 'a:b').length === 4, Q.log);
Q = mkQ(async () => ({ status: 413, code: 'photo_too_big' })); Q.q.add('a', P); await settle();
T('4xx 业务错：不重试，带回服务端错误码', Q.q.items[0].st === 'fail' && Q.q.items[0].code === 'photo_too_big' && Q.log.length === 1, Q.log);
Q = mkQ(async (n, v) => n === 'a' && v === 'full' ? { status: 400, code: 'photo_bad_format' } : { status: 200 }); Q.q.add('a', P); Q.q.add('b', P); await settle();
T('一张失败不影响别的张；待传数 = 1', Q.q.items[1].st === 'ok' && Q.q.pending() === 1);
let fixed = false; Q = mkQ(async (n, v) => n === 'a' && v === 'full' && !fixed ? { status: 500 } : { status: 200 }); Q.q.add('a', P); await settle(); fixed = true;
const before = Q.log.filter(x => x === 'a:b').length; Q.q.retry('a'); await settle();
T('单张重试：已传成功的 b / t 不重传，从 full 接着传', Q.q.items[0].st === 'ok' && Q.log.filter(x => x === 'a:b').length === before && Q.log.filter(x => x === 'a:full').length === 5, Q.log);
Q = mkQ((n, v, k, sg) => new Promise((ok, no) => sg.addEventListener('abort', () => no(new Error('abort'))))); Q.q.add('a', P); await settle(); Q.q.cancel('a'); await settle();
T('取消：中止进行中的请求、移出队列、不重试', Q.q.items.length === 0 && Q.log.filter(x => x.startsWith('sleep')).length === 0 && Q.q.pending() === 0, Q.log);
Q = mkQ(async () => ({ status: 200 })); ['a', 'b', 'c'].forEach(n => Q.q.add(n, P)); Q.q.cancel('c'); await settle();
T('排队中的取消：根本没发请求', !Q.log.some(x => x.startsWith('c:')), Q.log);

// ---- 草稿 ----
X.sbPhDraftSet('u1', { text: '好天气', keys: [{ name: 'k1', w: 1600, h: 1200 }], tone: 'warm' });
T('草稿：本人读回文字、已传的键、色调', (d => d && d.text === '好天气' && d.keys[0].name === 'k1' && d.tone === 'warm')(X.sbPhDraftGet('u1')));
T('草稿：换账号读不到，并且被清掉', X.sbPhDraftGet('u2') === null && X.sbPhDraftGet('u1') === null);
X.sbPhDraftSet('u1', { text: 'x', keys: [] }); now += 25 * 36e5;
T('草稿：超过 24 小时作废', X.sbPhDraftGet('u1') === null);
X.sbPhDraftSet('u1', { text: 'x', keys: [] }); X.sbPhDraftClear();
T('草稿：发布 / 取消后清掉', X.sbPhDraftGet('u1') === null);
X.sbPhDraftSet('', { text: 'x' }); T('草稿：没有账号 id 不写', Object.keys(store).length === 0);

console.log(`\nside_photo: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
