// 场边读接口（#369 PR-A）：真实 PostgreSQL + 真正的 nbq_api 账号，经 HTTP 层（handleApi）走一遍。
//   规则本身在库里（sb_post_public / sb_post_readable / sb_reply_read），这里验证「接口读出来的就是规则允许的」：
//   动态流（本城 · 24 小时内 · 倒序）· 游标分页（同一时间的两条不丢不重）· 话题 / 城市筛 · 屏蔽 · 不感兴趣 · 停用账号 · 过 24 小时 · 隐藏 · 删除后不可见 · 未公开 ·
//   详情与回复（隐藏 / 已删回复、被屏蔽人的回复）· 我发过的 · 没登录也能看 · 返回里没有后台字段、photos 恒为空数组。
//   二期（照片、球场页、话题墙）在这个文件里扩展。接线 / 参数校验的单测见 tests/unit/sb_read_route.mjs。
import { createRequire } from 'module'; import path from 'path'; import { fileURLToPath } from 'url';
import { startCluster, loadSchema } from './cluster.mjs';
const require = createRequire(import.meta.url); const pg = require('pg');
const HERE = path.dirname(fileURLToPath(import.meta.url)), DIR = process.env.NBQ_DIR || path.join(HERE, '..', '..');
const { handleApi } = await import(path.join(DIR, 'server/api/handler.mjs')), { makeVerifier } = await import(path.join(DIR, 'server/api/jwt.mjs')), { makeDb } = await import(path.join(DIR, 'server/api/db.mjs'));
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
  const deps = { verify, db: makeDb(async () => { const cl = new pg.Client({ host: c.host, port: c.port, user: 'nbq_api', database: 'nbq' }); await cl.connect(); return cl }) };
  const call = async (p, tok) => { const r = await handleApi(new Request('https://x.test' + p, { method: 'GET', headers: tok ? { Authorization: 'Bearer ' + tok } : {} }), deps); let j = null; try { j = await r.clone().json() } catch (_) { } return { s: r.status, j } };
  const ids = r => (r.j?.posts || []).map(x => x.body);

  // ---------- 准备：用户 ----------
  const AU = { a: 'a1111111-aaaa-4aaa-8aaa-aaaaaaaaaaaa', b: 'b2222222-bbbb-4bbb-8bbb-bbbbbbbbbbbb', c: 'c3333333-cccc-4ccc-8ccc-cccccccccccc', s: 'd4444444-dddd-4ddd-8ddd-dddddddddddd', x: 'e5555555-eeee-4eee-8eee-eeeeeeeeeeee' };
  const rows = [['a', '+61400000011', '发帖人A', 'active'], ['b', '+61400000012', '看帖人B', 'active'], ['c', '+61400000013', '被屏蔽的C', 'active'], ['s', '+61400000014', '停用的S', 'suspended'], ['x', '+61400000015', '注销的X', 'deleted']];
  for (const [k, ph, nick, st] of rows) await admin.query(`insert into users(auth_id, phone_e164, nickname, utr, pact_accepted_at) values ($1,$2,$3,5, now())`, [AU[k], ph, nick]);
  await admin.query(`update users set status='suspended', status_since=now(), status_until=now()+interval '7 days', status_reason='no_show' where auth_id=$1`, [AU.s]);
  await admin.query(`update users set status='deleted' where auth_id=$1`, [AU.x]);
  const UID = {}; for (const k in AU) UID[k] = (await admin.query('select id from users where auth_id=$1', [AU[k]])).rows[0].id;
  const tA = await token(AU.a), tB = await token(AU.b), tC = await token(AU.c);
  await admin.query(`insert into blocks(blocker_id, blocked_id) values ($1,$2)`, [UID.b, UID.c]);   // B 屏蔽了 C（双方互相看不到）

  // ---------- 准备：帖子（直接写表；publish_at 相对现在，created_at 跟着，满足「公开时间不早于创建时间 1 分钟」的约束）----------
  let fl = 900;
  const mkPost = async (who, body, { ago = '10 minutes', city = 'melb', topic = null, status = 'visible', deleted = false } = {}) => (await admin.query(
    `insert into sb_posts(user_id, city, body, topic_id, floor, status, deleted_at, created_at, publish_at)
     values ($1,$2,$3,$4,$5,$6, case when $7 then now() end, now() - $8::interval, now() - $8::interval) returning id`, [UID[who], city, body, topic, topic ? ++fl : null, status, deleted, ago])).rows[0].id;
  const P = {};
  P.new = await mkPost('a', '最新', { ago: '1 minute', topic: 'ootd' });
  P.mid = await mkPost('a', '中间', { ago: '2 hours' });
  P.old = await mkPost('a', '快过期', { ago: '23 hours' });
  P.expired = await mkPost('a', '已过24小时', { ago: '25 hours' });
  P.hidden = await mkPost('a', '后台隐藏', { ago: '30 minutes', status: 'hidden' });
  P.deleted = await mkPost('a', '本人删除', { ago: '40 minutes', deleted: true });
  P.susp = await mkPost('s', '停用账号的帖', { ago: '50 minutes' });
  P.gone = await mkPost('x', '注销账号的帖', { ago: '55 minutes' });
  P.blocked = await mkPost('c', '被B屏蔽的人的帖', { ago: '5 minutes' });
  P.mine = await mkPost('b', 'B自己的帖', { ago: '3 minutes' });
  P.syd = await mkPost('a', '悉尼的帖', { ago: '4 minutes', city: 'syd' });
  P.later = (await admin.query(`insert into sb_posts(user_id, city, body, created_at, publish_at) values ($1,'melb','2 小时后才公开', now(), now() + interval '2 hours') returning id`, [UID.a])).rows[0].id;
  // 同一个公开时间的两条（游标必须按 id 区分，不丢不重）
  const tie = (await admin.query(`select now() - interval '90 minutes' as t`)).rows[0].t;
  for (const b of ['并列1', '并列2']) await admin.query(`insert into sb_posts(user_id, city, body, created_at, publish_at) values ($1,'melb',$2,$3,$3)`, [UID.a, b, tie]);
  await admin.query(`insert into sb_hides(user_id, post_id) values ($1,$2)`, [UID.b, P.mid]);        // B 对「中间」点了不感兴趣
  await admin.query(`insert into sb_balls(post_id, user_id) values ($1,$2)`, [P.new, UID.b]);        // B 给「最新」点过网球

  // ---------- 动态流：没登录 ----------
  let r = await call('/api/sideline/feed');
  T('动态流：没登录 → 200', r.s === 200, r);
  const anonBodies = ids(r);
  T('没登录：看到公开中的（最新 / 中间 / 快过期 / 并列 / B 的 / 被屏蔽人的）', ['最新', '中间', '快过期', '并列1', '并列2', 'B自己的帖', '被B屏蔽的人的帖'].every(x => anonBodies.includes(x)), anonBodies);
  T('没登录：看不到 过 24 小时 / 后台隐藏 / 本人删除 / 停用 / 注销 / 未到公开时间 / 别的城市', ['已过24小时', '后台隐藏', '本人删除', '停用账号的帖', '注销账号的帖', '2 小时后才公开', '悉尼的帖'].every(x => !anonBodies.includes(x)), anonBodies);
  T('倒序：最新在最前、快过期在最后', anonBodies[0] === '最新' && anonBodies[anonBodies.length - 1] === '快过期', anonBodies);
  T('没登录：mine / my_ball 都是 false', r.j.posts.every(x => x.mine === false && x.my_ball === false));
  T('每条带 photo_count = 0 与 photos: []', r.j.posts.every(x => x.photo_count === 0 && Array.isArray(x.photos) && x.photos.length === 0));
  T('返回里没有后台字段（hidden_reason / 识别标签）和游标列', r.j.posts.every(x => !('hidden_reason' in x) && !('cur' in x) && !('tags' in x)));
  T('带作者名片（昵称）和话题名', r.j.profiles[UID.a]?.nickname === '发帖人A' && r.j.topics.ootd?.title === '网球人的OOTD', { p: r.j.profiles, t: r.j.topics });
  T('名片不带手机号 / 微信号 / 性别', Object.values(r.j.profiles).every(x => !('phone_e164' in x) && !('wechat_id' in x) && !('gender' in x)));

  // ---------- 动态流：登录（B）----------
  r = await call('/api/sideline/feed', tB); const bBodies = ids(r);
  T('B：看不到自己点了「不感兴趣」的、被自己屏蔽的人的', !bBodies.includes('中间') && !bBodies.includes('被B屏蔽的人的帖'), bBodies);
  T('B：其余照常（最新 / 快过期 / 并列 / 自己的）', ['最新', '快过期', '并列1', '并列2', 'B自己的帖'].every(x => bBodies.includes(x)), bBodies);
  T('B：自己的帖 mine = true；点过网球的 my_ball = true、别的 false', r.j.posts.find(x => x.body === 'B自己的帖').mine === true && r.j.posts.find(x => x.body === '最新').my_ball === true && r.j.posts.find(x => x.body === '快过期').my_ball === false);
  r = await call('/api/sideline/feed', tC); const cBodies = ids(r);
  T('C（被 B 屏蔽的人）：看不到 B 的帖（屏蔽是双向的）', !cBodies.includes('B自己的帖') && cBodies.includes('最新'), cBodies);
  r = await call('/api/sideline/feed', tA); T('A：自己过期 / 隐藏的帖也不在动态流里（只在「我发过的」）', !ids(r).includes('已过24小时') && !ids(r).includes('后台隐藏'), ids(r));

  // ---------- 筛选 ----------
  r = await call('/api/sideline/feed?topic=ootd'); T('按话题筛：只有那个话题的', r.s === 200 && JSON.stringify(ids(r)) === JSON.stringify(['最新']), ids(r));
  r = await call('/api/sideline/feed?topic=nonexistent'); T('话题不存在：200 空列表（不报错）', r.s === 200 && r.j.posts.length === 0 && r.j.next === null, r);
  r = await call('/api/sideline/feed?city=syd'); T('按城市：悉尼只有悉尼的', JSON.stringify(ids(r)) === JSON.stringify(['悉尼的帖']), ids(r));
  r = await call('/api/sideline/feed?city=perth'); T('没有帖的城市：200 空列表', r.s === 200 && r.j.posts.length === 0, r);

  // ---------- 分页：2 条一页走到底，和一次取完的顺序完全一样（含同一时间的并列）----------
  const all = ids(await call('/api/sideline/feed?limit=50')), got = []; let cur = null, pages = 0;
  do { const x = await call('/api/sideline/feed?limit=2' + (cur ? '&before=' + encodeURIComponent(cur) : '')); T('分页：每页 ≤ 2 条', x.s === 200 && x.j.posts.length <= 2, x); got.push(...ids(x)); cur = x.j.next; pages++ } while (cur && pages < 20);
  T('分页：走到底 = 一次取完（不丢、不重、顺序一样）', JSON.stringify(got) === JSON.stringify(all) && new Set(got).size === got.length, { got, all });
  T('分页：最后一页 next 为 null；页数符合', cur === null && pages === Math.ceil(all.length / 2), { pages, n: all.length });
  r = await call('/api/sideline/feed?limit=' + all.length); T('刚好一页装下：next 为 null（不会多出空的一页）', r.j.next === null && r.j.posts.length === all.length, r.j.next);

  // ---------- 详情 + 回复 ----------
  const rep = (who, body, extra = '') => admin.query(`insert into sb_replies(post_id, user_id, body ${extra ? ', ' + extra.split('=')[0] : ''}) values ($1,$2,$3 ${extra ? ', ' + extra.split('=')[1] : ''})`, [P.new, UID[who], body]);
  await rep('a', 'A的回复'); await rep('b', 'B的回复'); await rep('c', 'C的回复（被B屏蔽）');
  await rep('a', 'A被隐藏的回复', 'status=\'hidden\''); await rep('a', 'A删掉的回复', 'deleted_at=now()'); await rep('b', 'B被隐藏的回复', 'status=\'hidden\'');
  r = await call('/api/sideline/posts/' + P.new);
  T('详情：没登录也能看公开的 → 200', r.s === 200 && r.j.post.id === P.new && r.j.post.body === '最新', r);
  const rb = x => x.j.replies.map(y => y.body);
  T('详情（没登录）：回复只有公开可见的，按时间正序；隐藏的、删掉的不在', JSON.stringify(rb(r)) === JSON.stringify(['A的回复', 'B的回复', 'C的回复（被B屏蔽）']), rb(r));
  T('详情：回复 id 是数字、带作者名片', typeof r.j.replies[0].id === 'number' && r.j.profiles[UID.b]?.nickname === '看帖人B');
  T('详情：photos: []、photo_count = 0、无后台字段', Array.isArray(r.j.post.photos) && r.j.post.photos.length === 0 && r.j.post.photo_count === 0 && !('hidden_reason' in r.j.post));
  r = await call('/api/sideline/posts/' + P.new, tB);
  T('详情（B）：看不到被自己屏蔽的 C 的回复；自己被隐藏的回复自己看得到（hidden = true）', JSON.stringify(rb(r)) === JSON.stringify(['A的回复', 'B的回复', 'B被隐藏的回复']) && r.j.replies.find(y => y.body === 'B被隐藏的回复').hidden === true && r.j.replies.every(y => y.mine === (y.user_id === UID.b)), rb(r));
  r = await call('/api/sideline/posts/' + P.new, tA);
  T('详情（A）：自己被隐藏的回复自己看得到；别人被隐藏的看不到；自己删掉的看不到', rb(r).includes('A被隐藏的回复') && !rb(r).includes('B被隐藏的回复') && !rb(r).includes('A删掉的回复'), rb(r));
  r = await call('/api/sideline/posts/' + P.expired); T('详情：过了 24 小时，没登录 → 404', r.s === 404 && r.j.error === 'not_found', r);
  r = await call('/api/sideline/posts/' + P.expired, tB); T('详情：过了 24 小时，别人 → 404', r.s === 404, r);
  r = await call('/api/sideline/posts/' + P.expired, tA); T('详情：过了 24 小时，作者本人 → 200（只剩自己看得到）', r.s === 200 && r.j.post.mine === true && r.j.post.public === false, r);
  r = await call('/api/sideline/posts/' + P.hidden); T('详情：后台隐藏，没登录 → 404', r.s === 404, r);
  r = await call('/api/sideline/posts/' + P.hidden, tA); T('详情：后台隐藏，作者本人 → 200 且 status = hidden（作者在相册里看得到）', r.s === 200 && r.j.post.status === 'hidden', r);
  for (const [k, who] of [['deleted', tA], ['deleted', null], ['susp', null], ['gone', tB], ['later', null]]) { r = await call('/api/sideline/posts/' + P[k], who); T(`详情：${k}（${who ? '登录' : '没登录'}）→ 404`, r.s === 404, r) }
  r = await call('/api/sideline/posts/' + P.blocked, tB); T('详情：被 B 屏蔽的人的帖，B → 404', r.s === 404, r);
  r = await call('/api/sideline/posts/' + P.mid, tB); T('详情：B 点了不感兴趣的帖，B → 404（和动态流一致）', r.s === 404, r);
  r = await call('/api/sideline/posts/' + P.mid); T('详情：同一条，没登录 → 200', r.s === 200, r);
  r = await call('/api/sideline/posts/00000000-0000-4000-8000-000000000000'); T('详情：不存在 → 404（和看不到的一样）', r.s === 404 && r.j.error === 'not_found', r);
  r = await call('/api/sideline/posts/' + P.new, tB); T('详情：带话题名；点过网球的 my_ball = true', r.j.topics.ootd?.title === '网球人的OOTD' && r.j.post.my_ball === true && r.j.post.floor >= 1, r.j);

  // ---------- 我发过的 ----------
  r = await call('/api/sideline/mine'); T('我发过的：没登录 → 401', r.s === 401, r);
  r = await call('/api/sideline/mine', tA); const aMine = ids(r);
  T('我发过的（A）：公开中的、过 24 小时的、被隐藏的、未到公开时间的都在；已删除的不在；不含别人的', ['最新', '中间', '快过期', '已过24小时', '后台隐藏', '2 小时后才公开', '悉尼的帖'].every(x => aMine.includes(x)) && !aMine.includes('本人删除') && !aMine.includes('B自己的帖') && !aMine.includes('被B屏蔽的人的帖'), aMine);
  T('我发过的：倒序（未到公开时间的排最前）、带 status / public、mine 恒为 true', aMine[0] === '2 小时后才公开' && r.j.posts.every(x => x.mine === true && 'status' in x && 'public' in x), r.j.posts[0]);
  T('我发过的：公开中 public = true；过期 / 隐藏 public = false', r.j.posts.find(x => x.body === '最新').public === true && r.j.posts.find(x => x.body === '已过24小时').public === false && r.j.posts.find(x => x.body === '后台隐藏').public === false);
  r = await call('/api/sideline/mine', tB); T('我发过的（B）：只有自己的', JSON.stringify(ids(r)) === JSON.stringify(['B自己的帖']), ids(r));
  const allMine = ids(await call('/api/sideline/mine?limit=50', tA)), gm = []; cur = null; pages = 0;
  do { const x = await call('/api/sideline/mine?limit=3' + (cur ? '&before=' + encodeURIComponent(cur) : ''), tA); gm.push(...ids(x)); cur = x.j.next; pages++ } while (cur && pages < 20);
  T('我发过的：分页走到底 = 一次取完', JSON.stringify(gm) === JSON.stringify(allMine) && new Set(gm).size === gm.length, { gm, allMine });

  // ---------- 状态变了立刻跟着变（不缓存）----------
  await admin.query(`update sb_posts set deleted_at = now() where id = $1`, [P.new]);
  r = await call('/api/sideline/feed'); T('本人删除后：动态流里立刻没了', !ids(r).includes('最新'), ids(r));
  r = await call('/api/sideline/posts/' + P.new); T('本人删除后：详情 404', r.s === 404, r);
  await admin.query(`update users set status='banned' where id = $1`, [UID.a]);
  r = await call('/api/sideline/feed'); T('作者被封后：他的帖子全部不在动态流里', !ids(r).some(x => ['中间', '快过期', '并列1', '并列2'].includes(x)) && ids(r).includes('B自己的帖'), ids(r));
} catch (e) { fail++; console.log('FAIL 测试脚本异常', e && (e.stack || e.message || e)) }
finally { try { await admin?.end() } catch (_) { } c.stop() }
console.log(`sb_read: ${pass} 通过, ${fail} 失败`); process.exit(fail ? 1 : 0);
