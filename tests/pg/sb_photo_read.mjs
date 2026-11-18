// 场边读图（#393 P2）：真实 PostgreSQL + 真正的 nbq_api 账号，经 HTTP 层（handleApi）验证 photos 的状态 / 地址类型 / 行级权限，并真的用地址取到图。
//   规则在库里（sb_photo_read：看得到帖子才看得到图；removed 只有作者读得到）；签名 / 状态码细节见 tests/unit/sb_photo_get.mjs。
// （下面沿用 sb_read 的准备方式）真实 PostgreSQL + 真正的 nbq_api 账号，经 HTTP 层（handleApi）走一遍。
//   规则本身在库里（sb_post_public / sb_post_readable / sb_reply_read），这里验证「接口读出来的就是规则允许的」：
//   动态流（本城 · 24 小时内 · 倒序）· 游标分页（同一时间的两条不丢不重）· 话题 / 城市筛 · 屏蔽 · 不感兴趣 · 停用账号 · 过 24 小时 · 隐藏 · 删除后不可见 · 未公开 ·
//   详情与回复（隐藏 / 已删回复、被屏蔽人的回复）· 我发过的 · 没登录也能看 · 返回里没有后台字段、photos 恒为空数组。
//   二期（照片、球场页、话题墙）在这个文件里扩展。接线 / 参数校验的单测见 tests/unit/sb_read_route.mjs。
import { createRequire } from 'module'; import path from 'path'; import { fileURLToPath } from 'url';
import { startCluster, loadSchema } from './cluster.mjs';
const require = createRequire(import.meta.url); const pg = require('pg');
const HERE = path.dirname(fileURLToPath(import.meta.url)), DIR = process.env.NBQ_DIR || path.join(HERE, '..', '..');
const { r2Store } = await import(path.join(DIR, 'server/api/photo_store.mjs')), { handleApi } = await import(path.join(DIR, 'server/api/handler.mjs')), { makeVerifier } = await import(path.join(DIR, 'server/api/jwt.mjs')), { makeDb } = await import(path.join(DIR, 'server/api/db.mjs'));
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 500) : '')) };
const c = startCluster(); let admin;
try {
  c.createdb('nbq');
  const errs = loadSchema(c, 'nbq', path.join(DIR, 'schema.sql')); T('schema 执行无错误', !errs.length, errs.slice(0, 3));
  admin = new pg.Pool({ host: c.host, port: c.port, user: 'postgres', database: 'nbq', max: 2 });
  await admin.query(`create role nbq_api login in role nbq_user, nbq_service`);
  const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const jwk = { ...(await crypto.subtle.exportKey('jwk', kp.publicKey)), alg: 'ES256', kid: 'k1' }, U = 'https://t.supabase.co', ISS = U + '/auth/v1';
  const b64 = x => Buffer.from(x).toString('base64url');
  const token = async sub => { const h = b64(JSON.stringify({ alg: 'ES256', kid: 'k1' })), p = b64(JSON.stringify({ iss: ISS, aud: 'authenticated', sub, exp: Math.floor(Date.now() / 1000) + 600 }));
    return h + '.' + p + '.' + b64(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, kp.privateKey, new TextEncoder().encode(h + '.' + p))) };
  const verify = makeVerifier({ url: U, fetch: async () => ({ ok: true, json: async () => ({ keys: [jwk] }) }) });
  const objs = new Map(), bucket = { async get(k) { const v = objs.get(k); return v ? { arrayBuffer: async () => v.buffer.slice(v.byteOffset, v.byteOffset + v.byteLength) } : null }, async head() { return null }, async put() { return {} }, async delete() { }, async list() { return { objects: [], truncated: false } } };
  const deps = { photoKey: 'pg-test-photo-key', photos: r2Store(bucket), verify, db: makeDb(async () => { const cl = new pg.Client({ host: c.host, port: c.port, user: 'nbq_api', database: 'nbq' }); await cl.connect(); return cl }) };
  const call = async (p, tok) => { const r = await handleApi(new Request('https://x.test' + p, { method: 'GET', headers: tok ? { Authorization: 'Bearer ' + tok } : {} }), deps); let j = null; try { j = await r.clone().json() } catch (_) { } return { s: r.status, j } };
  const ids = r => (r.j?.posts || []).map(x => x.body);

  // ---------- 准备：用户 ----------
  const AU = { a: 'a1111111-aaaa-4aaa-8aaa-aaaaaaaaaaaa', b: 'b2222222-bbbb-4bbb-8bbb-bbbbbbbbbbbb', c: 'c3333333-cccc-4ccc-8ccc-cccccccccccc' };
  for (const [k, ph, nick] of [['a', '+61400000021', '发图人A'], ['b', '+61400000022', '看图人B'], ['c', '+61400000023', '被屏蔽的C']]) await admin.query(`insert into users(auth_id, phone_e164, nickname, utr, pact_accepted_at) values ($1,$2,$3,5, now())`, [AU[k], ph, nick]);
  const UID = {}; for (const k in AU) UID[k] = (await admin.query('select id from users where auth_id=$1', [AU[k]])).rows[0].id;
  const tA = await token(AU.a), tB = await token(AU.b);
  await admin.query(`insert into blocks(blocker_id, blocked_id) values ($1,$2)`, [UID.b, UID.c]);
  const mkPost = async (who, body, n, { ago = '10 minutes', status = 'visible' } = {}) => (await admin.query(
    `insert into sb_posts(user_id, city, body, photo_count, status, created_at, publish_at) values ($1,'melb',$2,$3,$4, now() - $5::interval, now() - $5::interval) returning id`, [UID[who], body, n, status, ago])).rows[0].id;
  const mkPh = (pid, idx, name, review = 'ok') => admin.query(`insert into sb_photos(post_id, idx, storage_key, width, height, review) values ($1,$2,$3,1600,1200,$4)`, [pid, idx, name, review]);
  const N = i => `PgPhoto${String(i).padStart(10, '0')}`;   // 16 位
  const P = {};
  P.ok = await mkPost('a', '正常两张', 2); await mkPh(P.ok, 0, N(1)); await mkPh(P.ok, 1, N(2));
  P.mixed = await mkPost('a', '一正常一打码一移除', 3, { ago: '20 minutes' }); await mkPh(P.mixed, 0, N(3)); await mkPh(P.mixed, 1, N(4), 'blurred'); await mkPh(P.mixed, 2, N(5), 'removed');
  P.text = await mkPost('a', '纯文字', 0, { ago: '30 minutes' });
  P.old = await mkPost('a', '已过24小时仅作者', 1, { ago: '25 hours' }); await mkPh(P.old, 0, N(6));
  P.hidden = await mkPost('a', '后台隐藏', 1, { ago: '40 minutes', status: 'hidden' }); await mkPh(P.hidden, 0, N(7));
  P.blocked = await mkPost('c', '被B屏蔽的人的图', 1, { ago: '5 minutes' }); await mkPh(P.blocked, 0, N(8));
  const byBody = (r, b) => (r.j?.posts || []).find(x => x.body === b);
  const phs = (r, b) => byBody(r, b)?.photos;
  const isOk = x => x.state === 'ok' && [x.url, x.t, x.b].every(u => /^\/api\/sideline\/photo\/[0-9a-f-]{36}\/PgPhoto\d{10}\?v=(full|t|b)&e=\d+&s=[A-Za-z0-9_-]{43}$/.test(u));

  // ---------- 动态流：陌生人（B）----------
  let r = await call('/api/sideline/feed', tB);
  T('feed：正常两张 → 两个 ok，各带 url / t / b 签名地址，按 idx 排', phs(r, '正常两张')?.length === 2 && phs(r, '正常两张').every(isOk) && phs(r, '正常两张').map(x => x.idx).join() === '0,1', phs(r, '正常两张'));
  T('feed：宽高来自库（1600 × 1200）', phs(r, '正常两张')?.[0].w === 1600 && phs(r, '正常两张')[0].h === 1200);
  const mx = phs(r, '一正常一打码一移除');
  T('feed：别人的帖子里被移除的图行级权限直接读不到（只剩 ok 和 blurred）', mx?.length === 2 && mx.map(x => x.state).join() === 'ok,blurred', mx);
  T('feed：blurred 只给极小图 b，不给原图 / 缩略', mx?.[1].state === 'blurred' && /v=b&/.test(mx[1].b) && !('url' in mx[1]) && !('t' in mx[1]), mx?.[1]);
  T('feed：photo_count 仍是库里的数（移除的不影响计数字段）', byBody(r, '一正常一打码一移除')?.photo_count === 3);
  T('feed：纯文字帖 photos: []', Array.isArray(phs(r, '纯文字')) && phs(r, '纯文字').length === 0);
  T('feed：被屏蔽的人的帖子和图都看不到', !byBody(r, '被B屏蔽的人的图'));
  T('feed：过 24 小时 / 后台隐藏的帖子不在别人的动态流里', !byBody(r, '已过24小时仅作者') && !byBody(r, '后台隐藏'));
  T('feed：公开帖的地址没有 p=1（所有人同一地址，可边缘缓存）', !phs(r, '正常两张')[0].url.includes('&p=1'));
  const url0 = phs(r, '正常两张')[0].url, anon = await call('/api/sideline/feed');
  T('没登录也能看：同一帖子拿到同样的地址', phs(anon, '正常两张')?.[0].url === url0, phs(anon, '正常两张')?.[0]);

  // ---------- 作者自己（A）：我发过的 ----------
  r = await call('/api/sideline/mine', tA);
  const mm = phs(r, '一正常一打码一移除');
  T('mine：作者读得到自己被移除的图，只有状态没有地址', mm?.length === 3 && mm[2].state === 'removed' && !('url' in mm[2]) && !('t' in mm[2]) && !('b' in mm[2]), mm);
  T('mine：已过 24 小时、被后台隐藏的帖子（仅作者可见）地址带 p=1', ['已过24小时仅作者', '后台隐藏'].every(b => phs(r, b)?.[0].url.endsWith('&p=1') && phs(r, b)[0].b.endsWith('&p=1')), ['已过24小时仅作者', '后台隐藏'].map(b => phs(r, b)));
  T('mine：公开的帖子地址没有 p=1', !phs(r, '正常两张')[0].url.includes('&p=1'));

  // ---------- 详情 ----------
  r = await call('/api/sideline/posts/' + P.mixed, tA);
  T('详情（作者）：photos 与 feed 同形状，含被移除的状态', r.j?.post?.photos?.length === 3 && r.j.post.photos[2].state === 'removed', r.j?.post?.photos);
  r = await call('/api/sideline/posts/' + P.mixed, tB);
  T('详情（陌生人）：看不到被移除的图', r.j?.post?.photos?.length === 2 && r.j.post.photos.every(x => x.state !== 'removed'), r.j?.post?.photos);
  r = await call('/api/sideline/posts/' + P.old, tB); T('详情（陌生人）：过 24 小时的帖子连同图一起 404', r.s === 404, r);
  r = await call('/api/sideline/posts/' + P.old, tA); T('详情（作者）：过 24 小时的帖子能看，地址带 p=1', r.s === 200 && r.j.post.public === false && r.j.post.photos[0].url.endsWith('&p=1'), r.j?.post?.photos);

  // ---------- 用地址真的取到图 ----------
  const bytes = Uint8Array.from([0xFF, 0xD8, 0xFF, 0xD9]); objs.set(`sb/${UID.a}/${N(1)}.jpg`, bytes);
  const g = await handleApi(new Request('https://x.test' + url0, { method: 'GET' }), deps);
  T('用 feed 给的地址取图：200、image/jpeg、nosniff、不用登录', g.status === 200 && g.headers.get('Content-Type') === 'image/jpeg' && g.headers.get('X-Content-Type-Options') === 'nosniff' && (await g.arrayBuffer()).byteLength === 4, g.status);
  const g2 = await handleApi(new Request('https://x.test' + url0.replace(/&s=.{4}/, '&s=AAAA'), { method: 'GET' }), deps);
  T('地址被改动 → 403', g2.status === 403, g2.status);
  r = await call('/api/sideline/feed', tB);
  const none = await call('/api/sideline/feed', null);
  T('库里的行没变：重复读取结果稳定', JSON.stringify(phs(r, '正常两张').map(x => x.idx)) === '[0,1]' && JSON.stringify(none.j.posts.map(x => x.body).sort()) === JSON.stringify(r.j.posts.map(x => x.body).sort()));
} catch (e) { fail++; console.log('FAIL 测试脚本异常', e && (e.stack || e.message || e)) }
finally { try { await admin?.end() } catch (_) { } c.stop() }
console.log(`sb_photo_read: ${pass} 通过, ${fail} 失败`); process.exit(fail ? 1 : 0);
