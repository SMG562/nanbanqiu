// 场边读图（#393 P2）：签名（篡改 / 过期 / 时钟偏差 / 伪造远期）、GET /api/sideline/photo/<uid>/<名>（状态码、下载头、缓存、路径穿越）、
//   feed / 详情 / 我的 里 photos 的形状（ok / blurred / removed / 没配密钥 / 仅作者可见）。假的库 + 假的 R2；真库上的行级权限见 tests/pg/sb_photo_read.mjs。
import path from 'path'; import { fileURLToPath } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url)), DIR = process.argv[2] || process.env.NBQ_DIR || path.join(HERE, '..', '..');
const H = await import(path.join(DIR, 'server/api/handler.mjs')), S = await import(path.join(DIR, 'server/api/photo_sign.mjs')), { r2Store } = await import(path.join(DIR, 'server/api/photo_store.mjs'));
const { handleApi, SB_FEED_SQL, SB_MINE_SQL, SB_POST_SQL, SB_REPLIES_SQL, SB_TOPICS_SQL, SB_PROFILES_SQL } = H;
const { jpeg } = await import(path.join(HERE, '..', 'lib', 'jpeg_sample.mjs'));
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 400) : '')) };

const KEY = 'test-photo-key-0123456789', UID = '00000000-0000-4000-8000-000000000001', A1 = '00000000-0000-4000-8000-0000000000a1', NAME = 'AbCdEfGhIjKlMnOp', NAME2 = 'ZyXwVuTsRqPoNmLk', NAME3 = 'QqQqQqQqQqQqQqQq';
const now = () => Math.floor(Date.now() / 1000);

// ---- 签名：过期取整、篡改、时钟偏差 ----
const E = S.expiryAt(1_800_000_000);
T('过期 = 下一个 15 分钟边界之后再一个时段：剩余 15–30 分钟', [1_800_000_000, 1_800_000_001, 1_800_000_899, 1_800_000_900].every(t => { const l = S.expiryAt(t) - t; return l >= 900 && l <= 1800 }));
T('同一时段所有人拿到同一个过期时间（边缘缓存能命中）', S.expiryAt(1_800_000_000) === S.expiryAt(1_800_000_899) && S.expiryAt(1_800_000_900) !== S.expiryAt(1_800_000_899));
const sg = await S.signPhoto(KEY, A1, NAME, 'full', E, false), P = { uid: A1, name: NAME, v: 'full', e: E, p: false, s: sg }, t0 = E - 600;
T('签名正确且没过期 → ok', await S.verifyPhoto(KEY, P, t0) === 'ok');
T('签名稳定：同样输入同样输出', sg === await S.signPhoto(KEY, A1, NAME, 'full', E, false) && /^[A-Za-z0-9_-]{43}$/.test(sg), sg);
for (const [n, q] of [['变体', { v: 't' }], ['名字', { name: NAME2 }], ['用户', { uid: UID }], ['过期时间', { e: E + 900 }], ['仅作者标记', { p: true }], ['签名最后一位', { s: sg.slice(0, -1) + (sg.endsWith('A') ? 'B' : 'A') }], ['签名为空', { s: '' }], ['签名缺失', { s: undefined }]])
  T(`篡改${n} → bad`, await S.verifyPhoto(KEY, { ...P, ...q }, t0) === 'bad');
T('别的密钥签的 → bad', await S.verifyPhoto('another-key', P, t0) === 'bad');
T('变体不是 full / t / b → bad', await S.verifyPhoto(KEY, { ...P, v: 'x' }, t0) === 'bad');
T('过期超过时钟偏差 → expired；偏差内（60 秒）仍 ok', await S.verifyPhoto(KEY, P, E + 61) === 'expired' && await S.verifyPhoto(KEY, P, E + 60) === 'ok' && await S.verifyPhoto(KEY, P, E + 1) === 'ok');
{ const far = now() + 7200, s = await S.signPhoto(KEY, A1, NAME, 'full', far, false); T('过期时间离现在超过 1 小时（哪怕签名对）→ bad', await S.verifyPhoto(KEY, { ...P, e: far, s }, now()) === 'bad') }
T('地址形状：/api/sideline/photo/<uid>/<名>?v=…&e=…&s=…，仅作者可见带 &p=1', (u => u.startsWith(`/api/sideline/photo/${A1}/${NAME}?v=t&e=${E}&s=`) && !u.includes('&p=1'))(await S.photoUrl(KEY, A1, NAME, 't', E, false)) && (await S.photoUrl(KEY, A1, NAME, 't', E, true)).endsWith('&p=1'));

// ---- 假 R2 + 假库 ----
const IMG = jpeg(), THUMB = jpeg({ w: 480, h: 320 }), TINY = jpeg({ w: 48, h: 32 });
const mk = ({ key = KEY, bucket = true, photos = {}, feed = [], mine = [], post = null } = {}) => {
  const objs = new Map(Object.entries(photos)), log = [];
  const b = { async get(k) { const v = objs.get(k); return v ? { arrayBuffer: async () => v.buffer.slice(v.byteOffset, v.byteOffset + v.byteLength) } : null }, async head() { return null }, async put() { return {} }, async delete() { }, async list() { return { objects: [], truncated: false } } };
  const run = async (role, uid, fn) => { const q = async (sql, args) => { log.push({ sql, args });
      if (sql === SB_FEED_SQL) return { rows: feed }; if (sql === SB_MINE_SQL) return { rows: mine }; if (sql === SB_POST_SQL) return { rows: post ? [post] : [] }; if (sql === SB_REPLIES_SQL) return { rows: [] };
      if (sql === SB_TOPICS_SQL) return { rows: [] }; if (sql === SB_PROFILES_SQL) return { rows: [] };
      if (/from sb_photos/.test(sql)) return { rows: m.phRows.filter(r => args[0].includes(r.post_id)) };
      if (/app_switches_get/.test(sql)) return { rows: [{ s: {} }] }; if (/from users where auth_id/.test(sql)) return { rows: [{ id: UID }] };
      throw new Error('没预料到的 SQL：' + sql.slice(0, 60)) }; return fn(q) };
  const m = { objs, log, phRows: [], deps: { verify: async () => ({ ok: true, sub: 'auth-1', claims: {} }), db: { asService: fn => run('nbq_service', null, fn), asUser: (uid, fn) => run('nbq_user', uid, fn), configured: true }, switchesTtlMs: 0, photoKey: key, photos: bucket ? r2Store(b) : null } };
  return m;
};
const get = async (m, p, { tok } = {}) => { const r = await handleApi(new Request('https://x.test' + p, { headers: tok ? { Authorization: 'Bearer ' + tok } : {} }), m.deps); let j = null, bytes = null;
  if ((r.headers.get('Content-Type') || '').includes('json')) { try { j = await r.clone().json() } catch (_) { } } else bytes = new Uint8Array(await r.clone().arrayBuffer()); return { s: r.status, j, bytes, h: r.headers } };
const url = async (uid, name, v, { e = S.expiryAt(now()), p = false, key = KEY } = {}) => S.photoUrl(key, uid, name, v, e, p);
const files = { [`sb/${A1}/${NAME}.jpg`]: IMG, [`sb/${A1}/${NAME}-t.jpg`]: THUMB, [`sb/${A1}/${NAME}-b.jpg`]: TINY };

// ---- GET 读图 ----
let m = mk({ photos: files }), r = await get(m, await url(A1, NAME, 'full'));
T('读原图：不用登录，200，字节一致', r.s === 200 && r.bytes.length === IMG.length && r.bytes.every((x, i) => x === IMG[i]), [r.s, r.j]);
T('下载头：image/jpeg、nosniff、inline', r.h.get('Content-Type') === 'image/jpeg' && r.h.get('X-Content-Type-Options') === 'nosniff' && r.h.get('Content-Disposition') === 'inline', [...r.h]);
{ const ma = /public, max-age=(\d+)$/.exec(r.h.get('Cache-Control') || ''); T('缓存：public，max-age 不超过剩余有效期（≤30 分钟）', !!ma && +ma[1] > 0 && +ma[1] <= 1800, r.h.get('Cache-Control')) }
T('读缩略 / 极小图：取 -t / -b 的键', (await get(m, await url(A1, NAME, 't'))).bytes.length === THUMB.length && (await get(m, await url(A1, NAME, 'b'))).bytes.length === TINY.length);
r = await get(m, await url(A1, NAME, 'full', { p: true })); T('仅作者可见的地址：200 但 Cache-Control 是 private', r.s === 200 && /^private, max-age=\d+$/.test(r.h.get('Cache-Control')), r.h.get('Cache-Control'));
T('读图不查库', m.log.length === 0 || m.log.every(x => /app_switches_get/.test(x.sql)), m.log.map(x => x.sql.slice(0, 40)));
const good = await url(A1, NAME, 'full'), bad = (f) => good.replace(/([?&]s=)([^&]+)/, (_, a, s) => a + f(s));
T('篡改签名 → 403 photo_forbidden', (await get(m, bad(s => s.slice(0, -1) + (s.endsWith('A') ? 'B' : 'A')))).s === 403);
T('换成别人的 uid 但沿用签名 → 403', (await get(m, good.replace(A1, UID))).s === 403);
T('改变体沿用签名 → 403', (await get(m, good.replace('v=full', 'v=t'))).s === 403);
{ const e = now() - 3600, u = await url(A1, NAME, 'full', { e }); r = await get(m, u); T('过期地址（签名对）→ 410 photo_expired', r.s === 410 && r.j.error === 'photo_expired', [r.s, r.j]) }
T('缺参数 / 变体不认识 / p 不是 1 → 404', [good.replace(/&s=[^&]+/, ''), good.replace('v=full', 'v=x'), good + '&p=2', good.replace(/e=\d+/, 'e=abc')].every(async u => true) && (await Promise.all([good.replace(/&s=[^&]+/, ''), good.replace('v=full', 'v=x'), good + '&p=2', good.replace(/e=\d+/, 'e=abc')].map(u => get(m, u)))).every(x => x.s === 404));
T('名字以 -t / -b 结尾、长度不对、uid 不是 uuid → 404', (await Promise.all([`/api/sideline/photo/${A1}/${NAME}-t?v=full&e=1800000000&s=x`, `/api/sideline/photo/${A1}/short?v=full&e=1800000000&s=x`, `/api/sideline/photo/not-a-uuid/${NAME}?v=full&e=1800000000&s=x`].map(u => get(m, u)))).every(x => x.s === 404));
T('路径穿越（.. / 编码斜杠）→ 404，不碰存储', (await Promise.all([`/api/sideline/photo/${A1}/..%2F${NAME}?v=full&e=1800000000&s=x`, `/api/sideline/photo/${A1}/%2e%2e/x?v=full&e=1800000000&s=x`, `/api/sideline/photo/..%2f..%2fetc/${NAME}?v=full&e=1800000000&s=x`].map(u => get(m, u)))).every(x => x.s === 404 || x.s === 403));
T('对象不存在（地址对）→ 404', (await get(mk(), good)).s === 404);
T('没配密钥 / 没绑桶 → 503 photos_unavailable', (await get(mk({ key: null, photos: files }), good)).s === 503 && (await get(mk({ bucket: false }), good)).s === 503);
T('用别的密钥签的地址 → 403', (await get(m, await url(A1, NAME, 'full', { key: 'other' }))).s === 403);

// ---- 读接口里的 photos ----
const PID = n => `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const post = (n, extra = {}) => ({ id: PID(n), user_id: A1, city: 'melb', body: '帖' + n, topic_id: null, floor: null, venue_id: null, photo_count: 0, tone: '', replies_open: true, publish_at: new Date(1_800_000_000_000 - n * 1000), balls: 0, replies: 0, mine: false, my_ball: false, cur: `2027-01-15T08:00:0${n}.123456Z_${PID(n)}`, ...extra });
const ph = (n, idx, name, review = 'ok', w = 1600, h = 1200) => ({ post_id: PID(n), idx, storage_key: name, width: w, height: h, review });
m = mk({ feed: [post(1, { photo_count: 2 }), post(2), post(3, { photo_count: 1 }), post(4, { photo_count: 1 })] });
m.phRows = [ph(1, 0, NAME), ph(1, 1, NAME2, 'blurred'), ph(3, 0, NAME3, 'removed'), ph(4, 0, NAME3)];
r = await get(m, '/api/sideline/feed'); const P1 = r.j.posts[0].photos;
T('feed：只多查一次 sb_photos，且只查有图的帖子', m.log.filter(x => /from sb_photos/.test(x.sql)).length === 1 && JSON.stringify(m.log.find(x => /from sb_photos/.test(x.sql)).args[0]) === JSON.stringify([PID(1), PID(3), PID(4)]), m.log.map(x => x.sql.slice(0, 40)));
T('feed：没图的帖子 photos 是 []', Array.isArray(r.j.posts[1].photos) && r.j.posts[1].photos.length === 0);
T('feed：ok → idx / w / h / state 和 url / t / b 三个签名地址', P1[0].idx === 0 && P1[0].w === 1600 && P1[0].h === 1200 && P1[0].state === 'ok' && [P1[0].url, P1[0].t, P1[0].b].every(u => typeof u === 'string' && u.startsWith(`/api/sideline/photo/${A1}/${NAME}?v=`)) && P1[0].url.includes('v=full') && P1[0].t.includes('v=t') && P1[0].b.includes('v=b'), P1[0]);
T('feed：blurred（打码）只给极小图 b，不给原图 / 缩略', P1[1].state === 'blurred' && typeof P1[1].b === 'string' && !('url' in P1[1]) && !('t' in P1[1]), P1[1]);
T('feed：removed 一个地址都不给，只剩状态 / 宽高', (x => x.state === 'removed' && !('url' in x) && !('t' in x) && !('b' in x))(r.j.posts[2].photos[0]), r.j.posts[2].photos);
T('feed：同一时段所有人拿到同一个地址（可边缘缓存）', (await get(m, '/api/sideline/feed')).j.posts[0].photos[0].url === P1[0].url);
T('feed：地址能真的取到图（接线 + 签名一致）', (mm => mm)(true) && await (async () => { const mm = mk({ photos: files, feed: [post(1, { photo_count: 1 })] }); mm.phRows = [ph(1, 0, NAME)]; const f = await get(mm, '/api/sideline/feed'); const g = await get(mm, f.j.posts[0].photos[0].url); return g.s === 200 && g.bytes.length === IMG.length })());
T('feed：库里存的是完整键 sb/<uid>/<名>.jpg（发布接口就这样存）→ 地址里只有 <名>，且能取到图（#450：别人看不到图）', await (async () => { const mm = mk({ photos: files, feed: [post(1, { photo_count: 1 })] }); mm.phRows = [ph(1, 0, `sb/${A1}/${NAME}.jpg`)]; const f = await get(mm, '/api/sideline/feed'); const u = f.j.posts[0].photos[0].url; const g = await get(mm, u); return u.startsWith(`/api/sideline/photo/${A1}/${NAME}?`) && g.s === 200 && g.bytes.length === IMG.length })());
T('feed：没带 public 字段（都是公开的）→ 地址没有 p=1', !P1[0].url.includes('&p=1'));
{ const mm = mk({ key: null, feed: [post(1, { photo_count: 1 })] }); mm.phRows = [ph(1, 0, NAME)]; const x = (await get(mm, '/api/sideline/feed')).j.posts[0].photos[0]; T('没配密钥：照样返回 state / 宽高，不发任何地址', x.state === 'ok' && x.w === 1600 && !('url' in x) && !('t' in x) && !('b' in x), x) }
m = mk({ mine: [post(1, { photo_count: 1, public: false, status: 'visible' }), post(2, { photo_count: 1, public: true })] }); m.phRows = [ph(1, 0, NAME), ph(2, 0, NAME2)];
r = await get(m, '/api/sideline/mine', { tok: 't' });
T('mine：仅作者可见的帖子（public = false）地址带 p=1，公开的没有', r.j.posts[0].photos[0].url.endsWith('&p=1') && r.j.posts[0].photos[0].t.endsWith('&p=1') && !r.j.posts[1].photos[0].url.includes('&p=1'), r.j.posts.map(x => x.photos[0].url));
m = mk({ post: post(1, { photo_count: 2, public: false }) }); m.phRows = [ph(1, 0, NAME), ph(1, 1, NAME2, 'removed')];
r = await get(m, `/api/sideline/posts/${PID(1)}`, { tok: 't' });
T('详情：photos 与 feed 同形状；作者能看到自己被移除的（只有状态，没有地址）', r.s === 200 && r.j.post.photos.length === 2 && r.j.post.photos[0].url.endsWith('&p=1') && r.j.post.photos[1].state === 'removed' && !('url' in r.j.post.photos[1]), r.j.post?.photos);
m = mk({ post: post(1) }); r = await get(m, `/api/sideline/posts/${PID(1)}`);
T('详情：没图的帖子 photos: []，不查 sb_photos', r.s === 200 && Array.isArray(r.j.post.photos) && r.j.post.photos.length === 0 && !m.log.some(x => /from sb_photos/.test(x.sql)));

console.log(`sb_photo_get: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
