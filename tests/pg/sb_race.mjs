// 第七批 S2c：场边同时操作。真实 PostgreSQL 上开多个连接，两笔操作真的同时发生（写法同 race.mjs）：
//   每个场景「A 先」「B 先」（先到的拿着锁 150ms 再提交，后到的必然要等）+ 自由并发 25 次；每次都查计数和表里实际的行一致。
//   编号（同一话题同时发、其中一笔失败回滚、同时新建同名话题）· 网球数（两人同时点、同一人点和取消、点和作者删除）·
//   回复数（同时回复、回复和删回复）· 浏览 / 分享（同一人同时看）· 网球提醒的人数
import { createRequire } from 'module'; import path from 'path'; import { fileURLToPath } from 'url';
import { startCluster, loadSchema } from './cluster.mjs';
const require = createRequire(import.meta.url); const pg = require('pg');
const HERE = path.dirname(fileURLToPath(import.meta.url)), DIR = process.env.NBQ_DIR || path.join(HERE, '..', '..');
const FREE = +process.env.NBQ_RACE_N || 25;
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 600) : '')) };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const c = startCluster(); let pool;
try {
  c.createdb('nbq');
  const errs = loadSchema(c, 'nbq', path.join(DIR, 'schema.sql'));
  T('schema 执行无错误', !errs.length, errs.slice(0, 3));
  pool = new pg.Pool({ host: c.host, port: c.port, user: 'postgres', database: 'nbq', max: 20 });
  const q = (s, p) => pool.query(s, p), one = async (s, p) => (await q(s, p)).rows[0];
  const U = i => '00000000-0000-0000-0000-0000000000' + String(i).padStart(2, '0');
  for (let i = 1; i <= 8; i++) await q(`insert into users(id,phone_e164,nickname,utr,gender) values ($1,$2,$3,5,'f')`, [U(i), '+6140000000' + i, 'P' + i]);

  // 一笔事务：以前台球友身份（与 API 写法相同）执行 fn；40P01 / 40001 整笔重试一次
  async function tx(uid, fn, hold) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const cl = await pool.connect();
      try {
        await cl.query('begin'); await cl.query('set local role nbq_user'); await cl.query(`select set_config('nbq.uid', $1, true)`, [uid]);
        const r = await fn(cl); if (hold) await hold(); await cl.query('commit'); return { ok: true, v: r && r.rows[0] && Object.values(r.rows[0])[0], retried: attempt > 0 } }
      catch (e) { try { await cl.query('rollback') } catch (_) { } if (['40P01', '40001'].includes(e.code) && attempt === 0) continue; return { ok: false, err: e.message, retried: attempt > 0 } }
      finally { cl.release() }
    }
  }
  async function ordered(first, second) {
    let release; const gate = new Promise(r => release = r);
    const p1 = first(async () => { await gate });
    await sleep(60); const p2 = second(); await sleep(150); release();
    return [await p1, await p2] }
  const runAll = async (name, setup, A, B, check) => {
    const res = [];
    for (const mode of ['A先', 'B先', ...Array(FREE).fill('并发')]) {
      await q(`delete from rate_hits`);
      const x = await setup();
      const [ra, rb] = mode === 'A先' ? await ordered(h => A(x, h), () => B(x)) : mode === 'B先' ? (await ordered(h => B(x, h), () => A(x))).reverse() : await Promise.all([A(x), B(x)]);
      res.push([mode, await check(x, ra, rb), ra, rb]) }
    const bads = res.filter(z => z[1]);
    T(`${name}（A 先 / B 先 / 并发 ${FREE} 次）`, !bads.length, bads.slice(0, 2).map(z => ({ mode: z[0], why: z[1], a: z[2], b: z[3] })));
  };
  const api = (uid, sql, params) => hold => tx(uid, cl => cl.query(sql, params), hold);
  const post = (uid, p) => api(uid, `select api_sb_post($1::jsonb)`, [JSON.stringify(p)]);
  const newPost = async (uid = U(1)) => (await post(uid, { body: '测试' })()).v.id;
  const counts = async pid => one(`select p.balls, p.replies, p.views, p.shares,
      (select count(*)::int from sb_balls b where b.post_id=p.id) nb,
      (select count(*)::int from sb_replies r where r.post_id=p.id and r.status='visible' and r.deleted_at is null) nr from sb_posts p where p.id=$1`, [pid]);
  const floorsOK = async tp => { const t = await one(`select post_count, (select array_agg(floor order by floor) from sb_posts where topic_id=$1) f from sb_topics where id=$1`, [tp]);
    const f = t.f || []; return f.every((v, i) => v === i + 1) && t.post_count === f.length ? null : ['编号不连续或和话题计数不一致', t] };

  // 编号
  let tn = 0;
  const mkTopic = async () => { const id = 't' + (++tn); await q(`insert into sb_topics(id,title,kind,active,city) values ($1,$2,'evergreen',true,'melb')`, [id, '同时' + tn]); return { tp: id } };
  await runAll('Q1 两人同时发同一话题：编号 1、2 各一个', mkTopic,
    (x, h) => post(U(1), { body: 'a', topic_id: x.tp })(h), (x, h) => post(U(2), { body: 'b', topic_id: x.tp })(h),
    async (x, a, b) => !a.ok || !b.ok ? ['都应成功', a.err, b.err] : (new Set([a.v.floor, b.v.floor]).size !== 2 ? ['编号重复', a.v, b.v] : floorsOK(x.tp)));
  await runAll('Q2 同时发、其中一笔超过频率回滚：不占编号', async () => { const x = await mkTopic(); return x },
    (x, h) => post(U(1), { body: 'a', topic_id: x.tp })(h),
    (x, h) => tx(U(3), async cl => { await cl.query(`reset role`); await cl.query(`insert into rate_hits(subject,grp) select $1,'sb_post' from generate_series(1,5)`, [U(3)]); await cl.query('set local role nbq_user');
      return cl.query(`select api_sb_post($1::jsonb)`, [JSON.stringify({ body: 'b', topic_id: x.tp })]) }, h),
    async (x, a, b) => !a.ok || b.ok || !/sb_post_hourly_limit/.test(b.err) ? ['应一成一败（频率）', a.err, b.err] : (a.v.floor !== 1 ? ['成功的应是 No.1', a.v] : floorsOK(x.tp)));
  let nn = 0;
  await runAll('Q3 两人同时新建同名话题：只建一个，编号 1、2', async () => ({ name: '同名新话题' + (++nn) }),
    (x, h) => post(U(1), { body: 'a', topic_title: x.name })(h), (x, h) => post(U(2), { body: 'b', topic_title: x.name })(h),
    async (x, a, b) => { if (!a.ok || !b.ok) return ['都应成功', a.err, b.err];
      const t = await one(`select count(*)::int n, min(id) id from sb_topics where title=$1`, [x.name]);
      if (t.n !== 1 || a.v.topic_id !== t.id || b.v.topic_id !== t.id) return ['应只有一个话题', t, a.v, b.v];
      if ([a.v.new_topic, b.v.new_topic].filter(Boolean).length !== 1) return ['正好一个人是新建的', a.v, b.v];
      return floorsOK(t.id) });

  // 网球数
  const ballOK = async (x, extra) => { const s = await counts(x.p); if (s.balls !== s.nb) return ['网球数和实际不一致', s];
    const nt = await one(`select count(*)::int n, max(sb_count) c from notifications where sb_post_id=$1 and kind='sb_ball' and read_at is null`, [x.p]);
    const others = +(await one(`select count(*) n from sb_balls where post_id=$1 and user_id<>$2`, [x.p, U(1)])).n;
    if (others === 0 ? nt.n !== 0 : (nt.n !== 1 || nt.c !== others)) return ['网球提醒的人数不对', nt, others];
    return extra ? extra(s) : null };
  const ball = (uid, x) => api(uid, `select api_sb_ball($1)`, [x.p]), unball = (uid, x) => api(uid, `select api_sb_unball($1)`, [x.p]);
  await runAll('Q4 两人同时点网球：2 个，提醒 1 条 2 人', async () => ({ p: await newPost() }), (x, h) => ball(U(2), x)(h), (x, h) => ball(U(3), x)(h),
    async (x, a, b) => !a.ok || !b.ok ? ['都应成功', a.err, b.err] : ballOK(x, s => s.balls === 2 ? null : ['应是 2', s]));
  await runAll('Q5 同一人同时点和取消：网球数 = 实际', async () => { const p = await newPost(); await ball(U(3), { p })(); return { p } },
    (x, h) => unball(U(3), x)(h), (x, h) => ball(U(3), x)(h),
    async (x, a, b) => !a.ok || !b.ok ? ['都应成功', a.err, b.err] : ballOK(x));
  await runAll('Q6 同一人同时点两下（双击）：只算 1 个', async () => ({ p: await newPost() }), (x, h) => ball(U(2), x)(h), (x, h) => ball(U(2), x)(h),
    async (x, a, b) => !a.ok || !b.ok ? ['重复点不应报错', a.err, b.err] : ballOK(x, s => s.balls === 1 ? null : ['应是 1', s]));
  await runAll('Q7 点网球的同时作者删了：要么没点上（not_found），要么点上了，计数都对', async () => ({ p: await newPost() }),
    (x, h) => ball(U(2), x)(h), (x, h) => api(U(1), `select api_sb_delete($1)`, [x.p])(h),
    async (x, a, b) => !b.ok ? ['删除应成功', b.err] : (!a.ok && !/not_found/.test(a.err) ? ['点网球只能成功或 not_found', a.err] : ballOK(x)));

  // 回复数
  const reply = (uid, x, body = '好') => api(uid, `select api_sb_reply($1,$2)`, [x.p, body]);
  const repOK = async x => { const s = await counts(x.p); return s.replies === s.nr ? null : ['回复数和实际不一致', s] };
  await runAll('Q8 两人同时回复：回复数 2', async () => ({ p: await newPost() }), (x, h) => reply(U(2), x)(h), (x, h) => reply(U(3), x)(h),
    async (x, a, b) => !a.ok || !b.ok ? ['都应成功', a.err, b.err] : (await repOK(x)) || ((await counts(x.p)).replies === 2 ? null : ['应是 2', await counts(x.p)]));
  await runAll('Q9 一人回复、另一人同时删自己的回复：回复数 = 实际', async () => { const p = await newPost(); const r = await reply(U(4), { p })(); return { p, r: r.v } },
    (x, h) => reply(U(2), x)(h), (x, h) => api(U(4), `select api_sb_reply_delete($1)`, [x.r])(h),
    async (x, a, b) => !a.ok || !b.ok ? ['都应成功', a.err, b.err] : repOK(x));
  await runAll('Q10 回复的同时作者关了回复：要么回上了，要么 replies_closed', async () => ({ p: await newPost() }),
    (x, h) => reply(U(2), x)(h), (x, h) => api(U(1), `select api_sb_replies_open($1,false)`, [x.p])(h),
    async (x, a, b) => !b.ok ? ['关回复应成功', b.err] : (!a.ok && !/replies_closed/.test(a.err) ? ['回复只能成功或 replies_closed', a.err] : repOK(x)));

  // 浏览 / 分享
  await runAll('Q11 同一人在两台设备同时看：今天只算 1 次', async () => ({ p: await newPost() }),
    (x, h) => api(U(2), `select api_sb_view($1::uuid[])`, [[x.p]])(h), (x, h) => api(U(2), `select api_sb_view($1::uuid[])`, [[x.p]])(h),
    async (x, a, b) => !a.ok || !b.ok ? ['都应成功', a.err, b.err] : ((await counts(x.p)).views === 1 && a.v + b.v === 1 ? null : ['应只算 1 次', await counts(x.p), a.v, b.v]));
  await runAll('Q12 两人同时分享：2 次', async () => ({ p: await newPost() }),
    (x, h) => api(U(2), `select api_sb_share($1)`, [x.p])(h), (x, h) => api(U(3), `select api_sb_share($1)`, [x.p])(h),
    async (x, a, b) => !a.ok || !b.ok ? ['都应成功', a.err, b.err] : ((await counts(x.p)).shares === 2 ? null : ['应是 2', await counts(x.p)]));
} catch (e) { fail++; console.log('FAIL 异常', e.stack) }
finally { await pool?.end().catch(() => { }); c.stop() }
console.log(`sb_race: ${pass} 通过, ${fail} 失败`); process.exit(fail ? 1 : 0);
