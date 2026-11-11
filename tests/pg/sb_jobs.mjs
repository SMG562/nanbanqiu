// 第七批 S3：场边定时任务 job_sb_hourly（schema ㉕ 末尾）。每项：该做的做了、不该做的没动、再跑一次什么都不做、记了 job_runs。
//   话题到门槛放出 · 30 天没人发沉下去 · 今日推荐（特别安排 / 周历 / 隔周轮换 / 本周最热 / 兜底，按城市当地日期）· 浏览明细 30 天后删 ·
//   「2 小时后再公开」「24 小时收进相册」按时间实时判断，任务不碰发布
import { createRequire } from 'module'; import path from 'path'; import { fileURLToPath } from 'url';
import { startCluster, loadSchema } from './cluster.mjs';
const require = createRequire(import.meta.url); const pg = require('pg');
const HERE = path.dirname(fileURLToPath(import.meta.url)), DIR = process.env.NBQ_DIR || path.join(HERE, '..', '..');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 500) : '')) };
const c = startCluster(); let pool;
try {
  c.createdb('nbq');
  const errs = loadSchema(c, 'nbq', path.join(DIR, 'schema.sql')); T('schema 执行无错误', !errs.length, errs.slice(0, 3));
  pool = new pg.Pool({ host: c.host, port: c.port, user: 'postgres', database: 'nbq', max: 4 });
  const q = (s, p) => pool.query(s, p), one = async (s, p) => (await q(s, p)).rows[0], n = async (s, p) => +Object.values(await one(s, p))[0];
  const as = async (role, uid, sql, params) => { const cl = await pool.connect();
    try { await cl.query('begin'); await cl.query(`set local role ${role}`); if (uid) await cl.query(`select set_config('nbq.uid', $1, true)`, [uid]);
      const r = await cl.query(sql, params); await cl.query('commit'); return { ok: true, rows: r.rows } }
    catch (e) { await cl.query('rollback').catch(() => { }); return { ok: false, err: e.message } } finally { cl.release() } };
  // 以 nbq_service 跑任务（和 pg_cron / 后端一样），返回改了几行
  const job = async at => { const r = await as('nbq_service', null, `select job_sb_hourly($1::timestamptz) n`, [at]); if (!r.ok) throw new Error(r.err); return +r.rows[0].n };
  const id = k => '00000000-0000-0000-0000-0000000000' + String(k).padStart(2, '0');
  const U = {}; 'ABCDEFG'.split('').forEach((k, i) => U[k] = id(i + 1));
  for (const k in U) await q(`insert into users(id,phone_e164,nickname,utr,gender) values ($1,$2,$3,5,'f')`, [U[k], '+614000000' + U[k].slice(-2), k]);
  const topic = (tid, title, by, extra = {}) => q(`insert into sb_topics(id,title,kind,active,city,created_by,suggest,released_at,sunk_at) values ($1,$2,'user',true,'melb',$3,false,$4,$5)`,
    [tid, title, by, extra.released || null, extra.sunk || null]);
  const post = (u, tid, at, o = {}) => q(`insert into sb_posts(user_id,city,body,topic_id,floor,created_at,publish_at,status,deleted_at)
     values ($1,'melb','x',$2,${tid ? `(select post_count + 1 from sb_topics where id = '${tid}')` : 'null'},$3,$3,$4,$5) returning id`, [u, tid, at, o.status || 'visible', o.deleted ? at : null])
    .then(async r => { if (tid) await q(`update sb_topics set post_count = post_count + 1 where id = $1`, [tid]); return r.rows[0].id });
  const today = async (city, day) => one(`select topic_id, source from sb_today where city=$1 and day=$2`, [city, day]);

  // ---------- 放出 ----------
  const NOW = '2026-10-29 13:30Z';   // 墨尔本 10-30 周五 00:30
  await topic('u_rel', '一起早起', U.A);
  await post(U.A, 'u_rel', '2026-10-27 09:00+11'); await post(U.A, 'u_rel', '2026-10-27 10:00+11'); await post(U.B, 'u_rel', '2026-10-28 09:00+11');
  await post(U.C, 'u_rel', '2026-10-28 10:00+11', { status: 'hidden' }); await post(U.D, 'u_rel', '2026-10-28 11:00+11', { deleted: true });
  await post(U.E, 'u_rel', '2026-10-20 09:00+11');   // 超过 7 天
  let r0 = await job(NOW);
  T('2 个不同的人（同一人发 3 条只算 1，隐藏 / 删除 / 7 天前的不算）→ 不放出', (await one(`select released_at from sb_topics where id='u_rel'`)).released_at === null);
  T('第一次跑：写了今日推荐（墨尔本 1 条）', r0 === 1, r0);
  await post(U.F, 'u_rel', '2026-10-29 20:00+11');
  T('第 3 个人发了 → 放出', await job(NOW) === 1 && !!(await one(`select released_at from sb_topics where id='u_rel'`)).released_at);
  T('再跑一次什么都不做', await job(NOW) === 0);
  await topic('u_early', '后台提前放出', U.A, { released: '2026-10-01 10:00+10' });
  await job(NOW); T('后台提前放出的不改放出时间', +new Date((await one(`select released_at from sb_topics where id='u_early'`)).released_at) === +new Date('2026-10-01 10:00+10'));
  await q(`update sb_settings set value='2' where key='release_people'`);
  await topic('u_two', '两个人就够', U.A); await post(U.A, 'u_two', '2026-10-29 09:00+11'); await post(U.B, 'u_two', '2026-10-29 09:30+11');
  await job(NOW); T('门槛读后台设置（改成 2 人）', !!(await one(`select released_at from sb_topics where id='u_two'`)).released_at);
  await q(`update sb_settings set value='3' where key='release_people'`);

  // ---------- 沉下去 ----------
  await q(`update sb_topics set released_at = '2026-09-01 10:00+10' where id = 'u_early'`);
  await topic('u_old', '很久没人发', U.A, { released: '2026-09-01 10:00+10' }); await post(U.B, 'u_old', '2026-09-28 10:00+10');   // 31 天前
  await topic('u_mid', '29 天前有人发', U.A, { released: '2026-09-01 10:00+10' }); await post(U.B, 'u_mid', '2026-09-30 15:00+10');
  await topic('u_pend', '没放出', U.A); await post(U.B, 'u_pend', '2026-09-01 10:00+10');
  let r = await job(NOW);
  const sunk = (await q(`select id from sb_topics where sunk_at is not null order by id`)).rows.map(x => x.id).join(',');
  T('放出后 30 天没人发 → 沉下去（没帖子的按放出时间算）；29 天前有人发的、没放出的、常驻的不沉', sunk === 'u_early,u_old' && r === 2, { sunk, r });
  T('再跑一次什么都不做', await job(NOW) === 0);
  await post(U.C, 'u_old', '2026-10-29 21:00+11', { deleted: true });
  T('删掉的帖子不算有人发', await job(NOW) === 0 && !!(await one(`select sunk_at from sb_topics where id='u_old'`)).sunk_at);
  const ap = await as('nbq_user', U.C, `select api_sb_post('{"body":"又来了","topic_id":"u_old"}'::jsonb) r`);
  T('沉下去的话题再有人发（接口）→ 浮上来', ap.ok && (await one(`select sunk_at from sb_topics where id='u_old'`)).sunk_at === null, ap.err);
  await q(`update sb_topics set sunk_at = null where id = 'u_early'`);

  // ---------- 今日推荐 ----------
  const pick = async (day) => one(`select topic_id, source from sb_pick_today('melb', $1::date)`, [day]);
  const P = async (day, t, s) => { const x = await pick(day); return x.topic_id === t && x.source === s || console.log('  ', day, x) };
  T('周五（排期 = #网球人的OOTD）', await today('melb', '2026-10-30').then(x => x && x.topic_id === 'ootd' && x.source === 'week'));
  T('周一 #多巴胺太爽了', await P('2026-10-26', 'dopa', 'week'));
  T('周日按 ISO 周隔周轮换：第 44 周 #场边的晚霞、第 45 周 #实用网球好物', await P('2026-11-01', 'sunset', 'week') && await P('2026-11-08', 'good', 'alt'));
  // 周三：本周最热 = 前 7 天（当地）不同发帖人最多的、已放出、没沉、没并入的大家发起话题
  await q(`delete from sb_posts`); await q(`update sb_topics set released_at = coalesce(released_at, '2026-10-01 10:00+10'), sunk_at = null where kind = 'user'`);
  T('周三没有大家发起的热门 → 兜底：排序第一个、本周没排上的常驻话题', await P('2026-11-04', 'brain', 'fallback'));
  for (const u of [U.A, U.B, U.C]) await post(u, 'u_rel', '2026-11-01 10:00+11');
  for (const u of [U.A, U.B]) await post(u, 'u_two', '2026-11-02 10:00+11');
  for (const u of [U.A, U.B, U.C, U.D, U.E]) await post(u, 'u_mid', '2026-11-03 10:00+11');
  await q(`update sb_topics set sunk_at = now() where id = 'u_mid'`);
  for (const u of [U.D, U.E, U.F, U.G]) await post(u, 'u_pend', '2026-11-04 08:00+11');   // 当天（周三）发的不算前 7 天
  T('周三：本周最热 = #一起早起（3 人；沉了的、当天才发的不算）', await P('2026-11-04', 'u_rel', 'hot'));
  await q(`update sb_topics set merged_into = 'u_two' where id = 'u_rel'`);
  T('并入别的话题的不算', await P('2026-11-04', 'u_two', 'hot'));
  await q(`update sb_topics set merged_into = null where id = 'u_rel'`);
  // 当天选定的本周最热不再换；排期改了跟着变
  r = await job('2026-11-03 13:30Z');   // 墨尔本 11-04 00:30
  T('周三 0 点后：写入本周最热', (await today('melb', '2026-11-04')).topic_id === 'u_rel' && r >= 1);
  for (const u of [U.D, U.E, U.F, U.G]) await post(u, 'u_two', '2026-11-02 12:00+11');   // 补进前 7 天：现在 #两个人就够 更热
  r = await job('2026-11-04 01:00Z'); T('当天更热了也不换（本周最热一天只选一次）', r === 0 && (await pick('2026-11-04')).topic_id === 'u_two' && (await today('melb', '2026-11-04')).topic_id === 'u_rel');
  await q(`update sb_week set auto_hot = false, topic_id = 'pet' where dow = 3`);
  T('后台把周三改成固定话题 → 当天跟着变', await job('2026-11-04 02:00Z') === 1 && (await today('melb', '2026-11-04')).topic_id === 'pet');
  T('再跑一次什么都不做', await job('2026-11-04 03:00Z') === 0);
  await q(`update sb_week set auto_hot = true, topic_id = null where dow = 3`);
  // 特别安排
  T('澳网话题没上线：特别安排不生效，按周历', await P('2027-01-15', 'ootd', 'week'));
  await q(`update sb_topics set active = true where id = 'ao'`);
  T('澳网话题上线：期间每天推荐（盖过周历）', await P('2027-01-12', 'ao', 'special') && await P('2027-02-01', 'ao', 'special') && await P('2027-02-02', 'gear', 'week') && await P('2027-01-11', 'dopa', 'week'));
  await q(`insert into sb_specials(topic_id, trigger, starts_at, ends_at, city) values ('pet','date','2027-01-14 00:00+11','2027-01-15 00:00+11','syd')`);
  T('别的城市的特别安排不影响墨尔本', await P('2027-01-14', 'ao', 'special'));
  T('雨停了（天气触发）不按日期推荐', !(await q(`select 1 from generate_series('2026-11-01'::date, '2026-11-30', '1 day') d, sb_pick_today('melb', d::date) x where x.topic_id = 'rain'`)).rowCount);
  await q(`update sb_topics set active = false where id = 'ootd'`);
  T('排期里的话题下线了 → 兜底', await P('2026-11-06', 'brain', 'fallback'));
  await q(`update sb_topics set active = true where id = 'ootd'`);
  // 按城市当地日期
  await q(`update cities set status = 'beta' where key = 'per'`);
  r = await job('2026-11-05 14:30Z');   // 墨尔本 11-06 01:30（周五），珀斯 11-05 22:30（周四）
  T('每座开放的城市按当地日期各一条（墨尔本周五、珀斯周四）；没开放的城市不写', (await today('melb', '2026-11-06')).topic_id === 'ootd' && (await today('per', '2026-11-05')).topic_id === 'spot'
    && await n(`select count(*) from sb_today where city not in ('melb','per')`) === 0);
  // 前台读
  const rt = await as('nbq_user', null, `select sb_today_topic('melb') r`);
  const d0 = (await one(`select (now() at time zone 'Australia/Melbourne')::date::text d`)).d;
  T('没登录也能读今日推荐（今天这条还没写时当场算）', rt.ok && rt.rows[0].r && rt.rows[0].r.day === d0 && !!rt.rows[0].r.topic_id, rt);
  T('没开放的城市读不到', (await as('nbq_user', null, `select sb_today_topic('syd') r`)).rows[0].r === null);
  await q(`insert into sb_today(city, day, topic_id, source) values ('melb', $1, 'love', 'week') on conflict (city, day) do update set topic_id = 'love'`, [d0]);
  T('写好了就读写好的那条', (await as('nbq_user', U.A, `select sb_today_topic('melb') r`)).rows[0].r.topic_id === 'love');
  T('前台不能直接读 / 写 sb_today、不能跑任务', !(await as('nbq_user', U.A, `select * from sb_today`)).ok && !(await as('nbq_user', U.A, `select job_sb_hourly()`)).ok
    && !(await as('anon', null, `select job_sb_hourly()`)).ok && !(await as('nbq_user', null, `select sb_pick_today('melb', current_date)`)).ok);

  // ---------- 浏览明细 ----------
  await job('2026-11-05 14:30Z');   // 先跑一次：把「今日推荐」写好，免得它的计数混进下面的 r（真实日期过了 11-05 后会多算 1）
  const pv = await post(U.A, null, '2026-11-05 10:00+11');
  await q(`update sb_posts set views = 9 where id = $1`, [pv]);
  await q(`insert into sb_views(post_id, day, viewer) values ($1,'2026-10-05','a'),($1,'2026-10-06','b'),($1,'2026-11-05','c')`, [pv]);
  r = await job('2026-11-05 14:30Z');
  T('30 天前的浏览明细删掉，近的留着，总数不变', r === 1 && (await q(`select day::text from sb_views order by day`)).rows.map(x => x.day).join(',') === '2026-10-06,2026-11-05' && (await one(`select views from sb_posts where id=$1`, [pv])).views === 9, r);

  // ---------- 不碰发布 ----------
  await post(U.B, null, '2026-11-05 13:00+11');
  await q(`update sb_posts set publish_at = created_at + interval '2 hours' where user_id = $1 and topic_id is null`, [U.B]);
  const snap = async () => (await one(`select md5(string_agg(p::text, '|' order by id)) h from sb_posts p`)).h;
  const h1 = await snap(); await job('2026-11-05 15:30Z'); await job('2026-11-07 15:30Z');
  T('任务不改任何发布（2 小时后再公开、24 小时收进相册都按时间判断）', h1 === await snap());

  // ---------- 记录 ----------
  T('每次都记了 job_runs', await n(`select count(*) from job_runs where job='sb_hourly' and ok`) >= 15);
  T('没开 pg_cron 时 schema 也能执行（cron 登记在 if 里）', /cron\.schedule\('nbq_sb_hourly', '17 \* \* \* \*'/.test(require('fs').readFileSync(path.join(DIR, 'schema.sql'), 'utf8')));
} catch (e) { T('未捕获的错误', false, e.stack) } finally { if (pool) await pool.end(); c.stop() }
console.log(`sb_jobs: ${pass} 通过, ${fail} 失败`); process.exit(fail ? 1 : 0);
