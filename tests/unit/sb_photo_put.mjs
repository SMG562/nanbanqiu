// 场边照片上传接口（#393 P1）：PUT /api/sideline/photos/[<用户 id>/]<名>-<f|t|b>。假的库（记下 api_sb_photo_gate 的调用、可预设报错）+ 假的 R2（和真 R2 一样「键已存在就不写」）。
//   库里的账号状态 / 频率规则由 tests/pg/sb_photo.mjs 在真库上测；JPEG 校验细节见 unit/photo_jpeg。这里管接线：顺序、状态码、不覆盖、路径穿越、没配桶、停传开关。
import path from 'path'; import { fileURLToPath } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url)), DIR = process.argv[2] || process.env.NBQ_DIR || path.join(HERE, '..', '..');
const { handleApi } = await import(path.join(DIR, 'server/api/handler.mjs')), { r2Store } = await import(path.join(DIR, 'server/api/photo_store.mjs'));
const { seg, jpeg } = await import(path.join(HERE, '..', 'lib', 'jpeg_sample.mjs'));
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 400) : '')) };

const UID = '00000000-0000-4000-8000-000000000001', OTHER = '00000000-0000-4000-8000-0000000000a2', NAME = 'AbCdEfGhIjKlMnOp';   // 16 位
const GOOD = jpeg(), THUMB = jpeg({ w: 480, h: 320 }), TINY = jpeg({ w: 48, h: 32 });
const OTHER_IMG = jpeg({ w: 481, h: 321 }), PNG = Uint8Array.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 13]);
const EXIF = jpeg({ extra: seg(0xE1, [...'Exif\0\0'].map(c => c.charCodeAt(0)).concat([0x4D, 0x4D, 0, 0x2A])) });

const mk = ({ switches = {}, gate = null, photos = true } = {}) => {
  const log = [], objs = new Map();
  const bucket = { async put(k, v, o) { if (o?.onlyIf?.etagDoesNotMatch === '*' && objs.has(k)) return null; objs.set(k, new Uint8Array(v)); return { key: k } },
    async get(k) { const v = objs.get(k); return v ? { arrayBuffer: async () => v.buffer.slice(v.byteOffset, v.byteOffset + v.byteLength) } : null }, async head(k) { const v = objs.get(k); return v ? { size: v.length } : null },
    async delete(ks) { for (const k of [].concat(ks)) objs.delete(k) }, async list({ prefix }) { return { objects: [...objs].filter(([k]) => k.startsWith(prefix)).map(([key, v]) => ({ key, size: v.length, uploaded: new Date(0) })), truncated: false } } };
  const run = async (role, uid, fn) => { const q = async (sql, args) => { log.push({ role, uid, sql, args });
      if (/app_switches_get/.test(sql)) return { rows: [{ s: switches }] }; if (/from users where auth_id/.test(sql)) return { rows: [{ id: UID }] };
      if (/api_sb_photo_gate/.test(sql)) { if (gate) throw gate; return { rows: [{ api_sb_photo_gate: UID }] } }
      throw new Error('没预料到的 SQL：' + sql.slice(0, 60)) }; return fn(q) };
  const deps = { verify: async () => ({ ok: true, sub: 'auth-1', claims: {} }), db: { asService: fn => run('nbq_service', null, fn), asUser: (uid, fn) => run('nbq_user', uid, fn), configured: true }, switchesTtlMs: 0, photos: photos ? r2Store(bucket) : null };
  return { log, objs, deps, gates: () => log.filter(x => /api_sb_photo_gate/.test(x.sql)) };
};
const put = async (m, p, body, { tok = 't', headers = {}, method = 'PUT' } = {}) => {
  const init = { method, ...(body instanceof ReadableStream ? { duplex: 'half' } : {}), headers: { ...(tok ? { Authorization: 'Bearer ' + tok } : {}), ...headers } }; if (body !== undefined) init.body = body;
  const r = await handleApi(new Request('https://x.test' + p, init), m.deps); let j = null; try { j = await r.clone().json() } catch (_) { } return { s: r.status, j, h: r.headers } };
const K = (n, v = '') => `sb/${UID}/${n}${v}.jpg`;


// ---- 正常：三个变体各自的键 ----
let m = mk(), r = await put(m, `/api/sideline/photos/${NAME}-f`, GOOD);
T('原图：200 {key, size, w, h}，键 = sb/<本人 id>/<名>.jpg', r.s === 200 && r.j.key === K(NAME) && r.j.size === GOOD.length && r.j.w === 480 && r.j.h === 320, r);
T('原图：真的写进了存储，字节一致', m.objs.get(K(NAME))?.length === GOOD.length && m.objs.get(K(NAME)).every((x, i) => x === GOOD[i]));
T('原图：先过 api_sb_photo_gate，且数频率（true），身份是登录人', m.gates().length === 1 && m.gates()[0].role === 'nbq_user' && m.gates()[0].uid === UID && m.gates()[0].args[0] === true, m.gates());
T('返回不缓存、不嗅探', r.h.get('Cache-Control') === 'no-store' && r.h.get('X-Content-Type-Options') === 'nosniff', [...r.h]);
r = await put(m, `/api/sideline/photos/${NAME}-t`, THUMB); T('缩略：键 <名>-t.jpg，不数频率（false）', r.s === 200 && r.j.key === K(NAME, '-t') && m.gates()[1].args[0] === false, r);
r = await put(m, `/api/sideline/photos/${NAME}-b`, TINY); T('极小图：键 <名>-b.jpg，不数频率', r.s === 200 && r.j.key === K(NAME, '-b') && m.gates()[2].args[0] === false && m.objs.size === 3, r);
m = mk(); r = await put(m, `/api/sideline/photos/${UID}/${NAME}-f`, GOOD);
T('路径带本人 id 段 → 200，键相同', r.s === 200 && r.j.key === K(NAME), r);

// ---- 登录与前缀 ----
m = mk(); r = await put(m, `/api/sideline/photos/${NAME}-f`, GOOD, { tok: null });
T('没登录 → 401 login_required，没碰库和存储', r.s === 401 && r.j.error === 'login_required' && !m.gates().length && !m.objs.size, r);
m = mk(); r = await put(m, `/api/sideline/photos/${OTHER}/${NAME}-f`, GOOD);
T('往别人的前缀写 → 403 forbidden，什么都没写', r.s === 403 && r.j.error === 'forbidden' && !m.objs.size && !m.gates().length, r);
m = mk(); r = await put(m, `/api/sideline/photos/${UID.toUpperCase()}/${NAME}-f`, GOOD); T('本人 id 写成大写也认（UUID 不分大小写）', r.s === 200, r);

// ---- 路径：名字和变体 ----
for (const [n, p] of [['路径穿越 ..', '/api/sideline/photos/..%2F..%2Fetc-f'], ['路径穿越 编码斜杠', `/api/sideline/photos/${NAME}%2F..%2Fx-f`], ['名字里有点', `/api/sideline/photos/${NAME}.jpg-f`], ['名字太短（15）', '/api/sideline/photos/AbCdEfGhIjKlMnO-f'],
  ['名字太长（25）', `/api/sideline/photos/${NAME}ABCDEFGHI-f`], ['缺变体', `/api/sideline/photos/${NAME}`], ['变体不认识', `/api/sideline/photos/${NAME}-x`], ['名字以 -t 结尾（会和别的图的缩略图撞键）', '/api/sideline/photos/AbCdEfGhIjKlM-t-f'], ['名字以 -b 结尾', '/api/sideline/photos/AbCdEfGhIjKlM-b-f'], ['中文名', '/api/sideline/photos/一二三四五六七八九十一二三四五六-f']]) {
  m = mk(); r = await put(m, p, GOOD); T(`路径不合法（${n}）→ 404，没碰库和存储`, r.s === 404 && r.j.error === 'not_found' && !m.objs.size && !m.gates().length, { s: r.s, j: r.j });
}
m = mk(); r = await put(m, '/api/sideline/photos/AbCdEfGhIjKlMn_t-f', GOOD); T('名字里下划线 t 不是后缀 → 放行', r.s === 200, r);
m = mk(); r = await put(m, `/api/sideline/photos/${NAME}-f`, undefined, { method: 'GET' }); T('GET 同一路径 → 405', r.s === 405, r);

// ---- 内容校验 ----
for (const [n, body, status, err] of [['PNG', PNG, 422, 'photo_bad_format'], ['带 EXIF（GPS）的 JPEG', EXIF, 422, 'photo_exif'], ['空请求体', new Uint8Array(0), 422, 'photo_bad_format'], ['原图尺寸放进极小图变体', GOOD, 413, 'photo_too_big']]) {
  m = mk(); r = await put(m, `/api/sideline/photos/${NAME}-${n === '原图尺寸放进极小图变体' ? 'b' : 'f'}`, body);
  T(`${n} → ${status} ${err}，什么都没存`, r.s === status && r.j.error === err && !m.objs.size, { s: r.s, j: r.j });
}
m = mk(); r = await put(m, `/api/sideline/photos/${NAME}-f`, GOOD, { headers: { 'Content-Length': String(2 * 1024 * 1024) } });
T('Content-Length 声明超限 → 413，不读体、不查库', r.s === 413 && r.j.error === 'photo_too_big' && !m.gates().length && !m.objs.size, r);
const CH = new Uint8Array(64 * 1024).fill(7); let pulled = 0;   // 一条「永远读不完」的流：服务端必须在上限附近自己断开
const stream = new ReadableStream({ pull(c) { pulled += CH.length; c.enqueue(CH) } });
m = mk(); r = await put(m, `/api/sideline/photos/${NAME}-f`, stream, { headers: { 'Content-Type': 'image/jpeg' } }).catch(e => ({ s: -1, e: String(e) }));
T('不带 Content-Length 的流：读到上限就断 → 413，只读了上限附近的字节', r.s === 413 && pulled < 3 * 1024 * 1024, { s: r.s, pulled, e: r.e });
m = mk(); r = await put(m, `/api/sideline/photos/${NAME}-f`, PNG, { headers: { 'Content-Type': 'image/jpeg' } }); T('声明 image/jpeg 也不信（看内容）', r.s === 422 && r.j.error === 'photo_bad_format', r);

// ---- 不覆盖 / 幂等 ----
m = mk(); await put(m, `/api/sideline/photos/${NAME}-f`, GOOD);
r = await put(m, `/api/sideline/photos/${NAME}-f`, GOOD); T('同键同内容重传 → 200（重试幂等），仍是一个对象', r.s === 200 && r.j.key === K(NAME) && m.objs.size === 1, r);
r = await put(m, `/api/sideline/photos/${NAME}-f`, OTHER_IMG); T('同键不同内容 → 409 photo_conflict', r.s === 409 && r.j.error === 'photo_conflict', r);
T('冲突后存储里仍是第一次的内容（绝不覆盖）', m.objs.get(K(NAME)).every((x, i) => x === GOOD[i]) && m.objs.get(K(NAME)).length === GOOD.length);
r = await put(m, `/api/sideline/photos/${NAME}-t`, jpeg({ w: 479, h: 321 })); T('同名的缩略图是另一个键，不受影响', r.s === 200 && m.objs.size === 2, r);

// ---- 账号状态 / 频率 / 开关 / 没配桶 ----
const dberr = (code, detail) => Object.assign(new Error(code), { code: 'P0001', detail });
m = mk({ gate: dberr('photo_hourly_limit', '1234') }); r = await put(m, `/api/sideline/photos/${NAME}-f`, GOOD);
T('超每小时频率 → 429 photo_hourly_limit + Retry-After，什么都没存', r.s === 429 && r.j.error === 'photo_hourly_limit' && r.j.retry_after === 1234 && r.h.get('Retry-After') === '1234' && !m.objs.size, { s: r.s, j: r.j });
m = mk({ gate: dberr('photo_daily_limit', '3600') }); r = await put(m, `/api/sideline/photos/${NAME}-f`, GOOD); T('超每天频率 → 429 photo_daily_limit', r.s === 429 && r.j.error === 'photo_daily_limit', r);
for (const st of ['suspended', 'banned', 'deleted']) { m = mk({ gate: dberr('account_' + st) }); r = await put(m, `/api/sideline/photos/${NAME}-f`, GOOD); T(`账号 ${st} → 403 account_${st}，什么都没存`, r.s === 403 && r.j.error === 'account_' + st && !m.objs.size, { s: r.s, j: r.j }) }
m = mk({ switches: { photos_paused: true } }); r = await put(m, `/api/sideline/photos/${NAME}-f`, GOOD);
T('开关 photos_paused 开 → 503 photos_paused，没查库、没存', r.s === 503 && r.j.error === 'photos_paused' && !m.gates().length && !m.objs.size, r);
m = mk({ switches: { photos_paused: false, sms_paused: true } }); r = await put(m, `/api/sideline/photos/${NAME}-f`, GOOD); T('别的开关开着不影响上传', r.s === 200, r);
m = mk({ photos: false }); r = await put(m, `/api/sideline/photos/${NAME}-f`, GOOD); T('没配桶绑定 → 503 photos_unavailable（不是 500）', r.s === 503 && r.j.error === 'photos_unavailable' && !m.gates().length, r);
m = mk({ switches: { maintenance: true } }); r = await put(m, `/api/sideline/photos/${NAME}-f`, GOOD); T('维护页开着：上传也被拦（503 maintenance）', r.s === 503 && r.j.error === 'maintenance', r);

// ---- 存储适配层：对象存储绑定的 5 个方法 ----
const calls = []; const bk = { put: async (...a) => (calls.push(['put', ...a]), a[0] === 'dup' ? null : { key: a[0] }), get: async k => k === 'k' ? { arrayBuffer: async () => Uint8Array.from([1, 2, 3]).buffer } : null, head: async k => k === 'k' ? { size: 3 } : null,
  delete: async k => calls.push(['delete', k]), list: async o => (calls.push(['list', o]), { objects: [{ key: 'a', size: 1, uploaded: new Date(0) }], truncated: !o.cursor, cursor: 'c1' }) };
const st = r2Store(bk);
T('put：带 onlyIf etagDoesNotMatch * 和 image/jpeg，新写入返回 true', await st.put('new', GOOD) === true && calls[0][3].onlyIf.etagDoesNotMatch === '*' && calls[0][3].httpMetadata.contentType === 'image/jpeg', calls[0]);
T('put：键已存在（R2 返回 null）→ false', await st.put('dup', GOOD) === false);
T('get / head：有 → 字节 / 大小，没有 → null', (await st.get('k')).join() === '1,2,3' && await st.get('x') === null && (await st.head('k')).size === 3 && await st.head('x') === null);
T('del：转给 delete', (await st.del(['a', 'b']), calls.at(-1)[0] === 'delete' && calls.at(-1)[1].join() === 'a,b'));
const l1 = await st.list('sb/u/'); T('list：按前缀、每页 500，有下一页就给游标，最后一页游标为 null', l1.keys[0].key === 'a' && l1.cursor === 'c1' && calls.at(-1)[1].prefix === 'sb/u/' && calls.at(-1)[1].limit === 500 && (await st.list('sb/u/', 'c1')).cursor === null);

console.log(`sb_photo_put: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
