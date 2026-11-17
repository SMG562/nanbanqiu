// 场边读接口（#369 PR-A）接线：参数校验、游标分页、没登录 / 登录两条路、返回形状（photos: []、photo_count）、404。
//   不连数据库：用假的 db 记下每条 SQL 的参数、按 SQL 文本返回预设行。SQL 本身（屏蔽、隐藏、过 24 小时、删除后不可见…）由 tests/pg/sb_read.mjs 在真库上测。
import path from 'path'; import { fileURLToPath } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url)), DIR = process.argv[2] || process.env.NBQ_DIR || path.join(HERE, '..', '..');
const H = await import(path.join(DIR, 'server/api/handler.mjs'));
const { handleApi, SB_FEED_SQL, SB_MINE_SQL, SB_POST_SQL, SB_REPLIES_SQL, SB_TOPICS_SQL, SB_PROFILES_SQL } = H;
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 400) : '')) };

const UID = '00000000-0000-4000-8000-000000000001', A1 = '00000000-0000-4000-8000-0000000000a1', A2 = '00000000-0000-4000-8000-0000000000a2';
const PID = n => `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const post = (n, extra = {}) => ({ id: PID(n), user_id: n % 2 ? A1 : A2, city: 'melb', body: '帖' + n, topic_id: n % 3 ? 'brain' : null, floor: n % 3 ? n : null, venue_id: null, photo_count: 0, tone: '', replies_open: true,
  publish_at: new Date(1_800_000_000_000 - n * 1000), balls: 0, replies: 0, mine: false, my_ball: false, cur: `2027-01-15T08:00:0${n}.123456Z_${PID(n)}`, ...extra });

const mk = (state = {}) => {
  const log = [], st = { feed: [], mine: [], post: null, replies: [], ...state };
  const run = async (role, uid, fn) => { const q = async (sql, args) => { log.push({ role, uid, sql, args });
      if (sql === SB_FEED_SQL) return { rows: st.feed.slice(0, args[4]) }; if (sql === SB_MINE_SQL) return { rows: st.mine.slice(0, args[2]) };
      if (sql === SB_POST_SQL) return { rows: st.post ? [st.post] : [] }; if (sql === SB_REPLIES_SQL) return { rows: st.replies };
      if (sql === SB_TOPICS_SQL) return { rows: args[0].map(id => ({ id, title: '话题' + id, kind: 'evergreen' })) };
      if (sql === SB_PROFILES_SQL) return { rows: args[0].map(id => ({ id, nickname: 'N' + id.slice(-2), gone: false })) };
      if (/app_switches_get/.test(sql)) return { rows: [{ s: {} }] }; if (/from users where auth_id/.test(sql)) return { rows: [{ id: UID }] };
      throw new Error('没预料到的 SQL：' + sql.slice(0, 60)) };
    return fn(q) };
  return { log, deps: { verify: async () => ({ ok: true, sub: 'auth-1', claims: {} }), db: { asService: fn => run('nbq_service', null, fn), asUser: (uid, fn) => run('nbq_user', uid, fn), configured: true }, switchesTtlMs: 0 } };
};
const call = async (m, p, d, tok) => { const r = await handleApi(new Request('https://x.test' + p, { method: m, headers: tok ? { Authorization: 'Bearer ' + tok } : {} }), d); let j = null; try { j = await r.clone().json() } catch (_) { } return { s: r.status, j } };
const feedCalls = log => log.filter(x => x.sql === SB_FEED_SQL);

// ---- feed：没登录 ----
let m = mk({ feed: [1, 2, 3, 4, 5].map(n => post(n)) });
let r = await call('GET', '/api/sideline/feed', m.deps);
T('feed：没登录也能看 → 200', r.s === 200, r);
T('feed：没登录 = 匿名身份（nbq_user，没有 uid），由库里的行级权限判断', feedCalls(m.log).length === 1 && feedCalls(m.log)[0].role === 'nbq_user' && !feedCalls(m.log)[0].uid, m.log.map(x => [x.role, x.uid]));
T('feed：默认墨尔本、不筛话题、不带游标、每页 20（多取 1 条判断下一页）', JSON.stringify(feedCalls(m.log)[0].args) === JSON.stringify(['melb', null, null, null, 21]), feedCalls(m.log)[0].args);
T('feed：返回 posts / next / topics / profiles', Array.isArray(r.j.posts) && r.j.posts.length === 5 && r.j.next === null && typeof r.j.topics === 'object' && typeof r.j.profiles === 'object', Object.keys(r.j));
T('feed：每条从第一天带 photo_count 与 photos: []（二期不改形状）', r.j.posts.every(x => x.photo_count === 0 && Array.isArray(x.photos) && x.photos.length === 0), r.j.posts[0]);
T('feed：游标列 cur 不外露', r.j.posts.every(x => !('cur' in x)));
T('feed：带上作者名片和话题名', r.j.profiles[A1]?.nickname && r.j.topics.brain?.title === '话题brain', r.j);
T('feed：不返回后台才用的字段（hidden_reason / 识别标签 / 审核人）', r.j.posts.every(x => !('hidden_reason' in x) && !('tags' in x) && !('reviewed_by' in x)));

// ---- feed：分页 ----
m = mk({ feed: [1, 2, 3, 4].map(n => post(n)) });
r = await call('GET', '/api/sideline/feed?limit=3', m.deps);
T('feed：limit=3 → 取 4 条、返回 3 条、next = 第 3 条的游标', r.s === 200 && feedCalls(m.log)[0].args[4] === 4 && r.j.posts.length === 3 && r.j.next === post(3).cur, { n: r.j?.posts?.length, next: r.j?.next });
r = await call('GET', '/api/sideline/feed?limit=3&before=' + encodeURIComponent(post(3).cur), mk({ feed: [post(4)] }).deps);
T('feed：带游标 → 200、最后一页 next 为 null', r.s === 200 && r.j.next === null && r.j.posts.length === 1, r);
m = mk({ feed: [post(4)] }); await call('GET', '/api/sideline/feed?before=' + encodeURIComponent(post(3).cur), m.deps);
T('feed：游标拆成「时间 + id」两个参数（微秒不丢）', JSON.stringify(feedCalls(m.log)[0].args.slice(2, 4)) === JSON.stringify(['2027-01-15T08:00:03.123456Z', PID(3)]), feedCalls(m.log)[0].args);
m = mk({ feed: [] }); await call('GET', '/api/sideline/feed?limit=500', m.deps); T('feed：limit 超过 50 按 50（多取 1 条 = 51）', feedCalls(m.log)[0].args[4] === 51, feedCalls(m.log)[0].args);
m = mk({ feed: [] }); await call('GET', '/api/sideline/feed?limit=0', m.deps); T('feed：limit=0 按 1（多取 1 条 = 2）', feedCalls(m.log)[0].args[4] === 2, feedCalls(m.log)[0].args);
r = await call('GET', '/api/sideline/feed?city=syd&topic=brain', (m = mk({ feed: [] })).deps);
T('feed：按城市、话题筛 → 参数照传', r.s === 200 && JSON.stringify(feedCalls(m.log)[0].args.slice(0, 2)) === JSON.stringify(['syd', 'brain']), feedCalls(m.log)[0]?.args);

// ---- feed：参数不对一律 422，不碰数据库 ----
for (const q of ['limit=abc', 'limit=-1', 'limit=1000', 'before=garbage', 'before=2027-01-15T08:00:03Z_' + PID(1), 'before=2027-01-15T08:00:03.123456Z_xyz', "city=melb';drop", 'city=M', 'city=', 'topic=Bad Topic', 'topic=1abc', "topic=a'b"]) {
  m = mk(); r = await call('GET', '/api/sideline/feed?' + q, m.deps);
  T(`feed：参数不对（${q}）→ 422 invalid、没查库`, r.s === 422 && r.j.error === 'invalid' && !feedCalls(m.log).length, { s: r.s, j: r.j });
}

// ---- feed：登录 ----
m = mk({ feed: [post(1, { mine: true, my_ball: true })] }); r = await call('GET', '/api/sideline/feed', m.deps, 'tok');
T('feed：登录 → 以本人身份执行（屏蔽 / 不感兴趣才会生效）', r.s === 200 && feedCalls(m.log)[0].uid === UID && r.j.posts[0].mine === true && r.j.posts[0].my_ball === true, feedCalls(m.log)[0]);
const bad = { verify: async () => ({ ok: false, code: 'expired' }), db: mk().deps.db, switchesTtlMs: 0 };
r = await call('GET', '/api/sideline/feed', bad, 'tok'); T('feed：带了无效令牌 → 401（不悄悄当匿名）', r.s === 401, r);
r = await call('POST', '/api/sideline/feed', mk().deps); T('feed：只认 GET（POST → 405）', r.s === 405, r);

// ---- mine ----
r = await call('GET', '/api/sideline/mine', (m = mk()).deps); T('mine：没登录 → 401 login_required / unauthorized', r.s === 401, r);
m = mk({ mine: [1, 2, 3].map(n => post(n, { mine: true, status: 'visible', public: n === 1 })) }); r = await call('GET', '/api/sideline/mine?limit=2', m.deps, 'tok');
const mineCalls = m.log.filter(x => x.sql === SB_MINE_SQL);
T('mine：登录 → 200，每页 30（这里 limit=2：取 3 返回 2）、有 next', r.s === 200 && mineCalls[0].uid === UID && mineCalls[0].args[2] === 3 && r.j.posts.length === 2 && r.j.next === post(2).cur, { n: r.j?.posts?.length, next: r.j?.next });
T('mine：带 status / public（前台分得清「公开中」和「只剩自己看得到」）、photos: []', r.j.posts.every(x => 'status' in x && 'public' in x && Array.isArray(x.photos)), r.j.posts[0]);
m = mk({ mine: [] }); await call('GET', '/api/sideline/mine', m.deps, 'tok'); T('mine：默认每页 30', m.log.find(x => x.sql === SB_MINE_SQL).args[2] === 31);
r = await call('GET', '/api/sideline/mine?before=x', (m = mk()).deps, 'tok'); T('mine：游标不对 → 422', r.s === 422 && r.j.error === 'invalid');

// ---- 详情 ----
const rep = (id, extra = {}) => ({ id, user_id: A2, to_user: null, body: '回' + id, created_at: new Date(1_800_000_000_000), mine: false, hidden: false, ...extra });
m = mk({ post: post(1, { status: 'visible', public: true, topic_id: 'brain' }), replies: [rep(1), rep(2, { to_user: A1 })] });
r = await call('GET', '/api/sideline/posts/' + PID(1), m.deps);
T('详情：没登录也能看公开的 → 200，帖子 + 回复 + 话题 + 名片', r.s === 200 && r.j.post.id === PID(1) && r.j.replies.length === 2 && r.j.topics.brain && r.j.profiles[A1] && r.j.profiles[A2], r);
T('详情：photos: []、photo_count 在', Array.isArray(r.j.post.photos) && r.j.post.photos.length === 0 && r.j.post.photo_count === 0);
T('详情：匿名身份执行', m.log.filter(x => x.sql === SB_POST_SQL).every(x => x.role === 'nbq_user' && !x.uid));
T('详情：回复里的 id 是数字、回复某人带 to_user', typeof r.j.replies[0].id === 'number' && r.j.replies[1].to_user === A1);
r = await call('GET', '/api/sideline/posts/' + PID(1), mk({ post: null }).deps); T('详情：看不到 / 不存在 → 404 not_found（两种不区分）', r.s === 404 && r.j.error === 'not_found', r);
m = mk(); r = await call('GET', '/api/sideline/posts/not-a-uuid', m.deps); T('详情：id 不是 uuid → 404、没查库', r.s === 404 && !m.log.some(x => x.sql === SB_POST_SQL), r);
m = mk({ post: post(2, { status: 'visible', public: true }), replies: [] }); r = await call('GET', '/api/sideline/posts/' + PID(2), m.deps, 'tok');
T('详情：登录 → 本人身份（我的回复 / 我点过网球才对）', r.s === 200 && m.log.find(x => x.sql === SB_POST_SQL).uid === UID);

// ---- SQL 文本的几条硬规矩（真库行为见 pg/sb_read）----
T('SQL：动态流走公开判断函数 + 游标按（公开时间, id）+ 有 48 小时上限（让部分索引可用）', /sb_post_public\(p\.id, nbq_uid\(\)\)/.test(SB_FEED_SQL) && /\(p\.publish_at, p\.id\) < /.test(SB_FEED_SQL) && /interval '48 hours'/.test(SB_FEED_SQL) && /p\.status = 'visible' and p\.deleted_at is null/.test(SB_FEED_SQL));
T('SQL：不选 hidden_reason / views / shares（前台拿不到或一期不用）', ![SB_FEED_SQL, SB_MINE_SQL, SB_POST_SQL].some(s => /hidden_reason|p\.views|p\.shares/.test(s)));
T('SQL：回复排除已删除、别人的隐藏回复', /deleted_at is null/.test(SB_REPLIES_SQL) && /status = 'visible' or r\.user_id = nbq_uid\(\)/.test(SB_REPLIES_SQL));

console.log(`sb_read_route: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
