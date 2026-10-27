// 地区扩展 R1-2：按城市统计（schema ⑳）。每个城市按自己的当地日期算「一天」：珀斯当地 23:30 的事件算珀斯的当天、不算墨尔本的当天；
// 汇总后读和直接读原始事件结果相同（每个城市、全部城市）；今天面板 / 开打分布 / 时段 / 每天申请 / 留存按当地；每晚汇总所有城市；
// 同一城市区名唯一、别名按城市；6 个城市夏令时切换那天的长度。
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
  const q = (s, p) => pool.query(s, p), one = async (s, p) => (await q(s, p)).rows[0];
  const viewer = async (sql, p) => { const cl = await pool.connect(); try { await cl.query('begin'); await cl.query('set local role nbq_viewer'); const r = await cl.query(sql, p); await cl.query('rollback'); return { ok: true, rows: r.rows } } catch (e) { await cl.query('rollback'); return { ok: false, err: e.message } } finally { cl.release() } };

  // ---------- 6 个城市夏令时切换那天的长度 ----------
  const len = async (city, d) => +(await one(`select extract(epoch from city_day_start($1, $2::date + 1) - city_day_start($1, $2::date)) / 3600 h`, [city, d])).h;
  const L1 = {}, L2 = {}; for (const k of ['melb', 'syd', 'cbr', 'adl', 'bne', 'per']) { L1[k] = await len(k, '2026-10-04'); L2[k] = await len(k, '2027-04-04') }
  T('2026-10-04 夏令时开始：墨尔本 / 悉尼 / 堪培拉 / 阿德莱德 23 小时，布里斯班 / 珀斯 24 小时', JSON.stringify(L1) === JSON.stringify({ melb: 23, syd: 23, cbr: 23, adl: 23, bne: 24, per: 24 }), L1);
  T('2027-04-04 夏令时结束：前四个 25 小时，布里斯班 / 珀斯 24 小时', JSON.stringify(L2) === JSON.stringify({ melb: 25, syd: 25, cbr: 25, adl: 25, bne: 24, per: 24 }), L2);

  // ---------- 区：同城唯一、别名按城市 ----------
  await q(`insert into suburbs(name,postcode,centroid,city,state) values ('Brighton','3186','POINT(145 -37.9)','melb','VIC'),('Brighton','5048','POINT(138.5 -35)','adl','SA'),('Subiaco','6008','POINT(115.8 -31.9)','per','WA')`);
  let r = await q(`insert into suburbs(name,postcode,centroid,city,state) values ('Brighton','3999','POINT(145 -37.9)','melb','VIC')`).then(() => ({ ok: true }), e => ({ ok: false, err: e.message }));
  T('同一城市里区名不能重复（跨城市可以）', !r.ok && /suburbs_city_name/.test(r.err), r);
  await q(`insert into suburb_aliases(city, alias, suburb) values ('melb','布莱顿','Brighton'),('adl','布莱顿','Brighton')`);
  T('别名按城市（同一个别名在两个城市各指各的区）', +(await one(`select count(*) from suburb_aliases where alias='布莱顿'`)).count === 2);

  // ---------- 事件、汇总按当地日期 ----------
  await q(`update cities set status='on' where key='per'`);
  const U1 = (await one(`insert into users(phone_e164,nickname,utr,home_city) values ('+61470000001','A',5,'per') returning id`)).id;
  const U2 = (await one(`insert into users(phone_e164,nickname,utr) values ('+61470000002','B',5) returning id`)).id;
  const D = (await one(`select (city_today('melb') - 5) d`)).d.toISOString().slice(0, 10);
  const ts = async (city, dayOff, hm) => (await one(`select (city_day_start($1, $2::date + $3::int) + $4::interval) t`, [city, D, dayOff, hm])).t;
  const ev = async (city, t, user, event = 'game_view', props = {}) => q(`insert into events(occurred_at,user_id,anon_id,session_id,build,event,city,device,props) values ($1,$2::uuid,'a'||$2::text,'s','pwa',$3,$4,'mobile',$5)`, [t, user, event, city, props]);
  const tPerLate = await ts('per', 0, '23:30');          // 珀斯 D 日 23:30 = 墨尔本 D+1 日凌晨
  await ev('per', tPerLate, U1); await ev('per', tPerLate, U1, 'page_view', { screen: 'disc' });
  await ev('melb', await ts('melb', 0, '23:30'), U2); await ev('melb', await ts('melb', 1, '00:30'), U2);
  await ev('per', tPerLate, U2, 'card_view', { target_uid: U1, via: 'link' });
  T('事件默认城市墨尔本', (await one(`insert into events(occurred_at,anon_id,session_id,build,event) values (now(),'x','s','pwa','game_view') returning city`)).city === 'melb');
  const raw = async (city, a, b) => (await q(`select day::text, who, device, events from people_between($1,$2,$3) order by 1,2,3`, [a, b, city])).rows;
  const perDay = [await ts('per', 0, '00:00'), await ts('per', 1, '00:00')], melDay = [await ts('melb', 0, '00:00'), await ts('melb', 1, '00:00')];
  const pRaw = await raw('per', ...perDay), mRaw = await raw('melb', ...melDay);
  T('珀斯当地 23:30 的事件算珀斯 D 日', pRaw.length === 2 && pRaw.every(x => x.day === D), pRaw);
  T('墨尔本 D 日只有墨尔本当地 23:30 那条（不含珀斯的、不含次日 00:30）', mRaw.length === 1 && mRaw[0].who === U2, mRaw);
  const n = await one(`select rollup_people($1::date) n`, [D]);
  const dp = (await q(`select city, who from daily_people where day=$1`, [D])).rows.map(x => x.city + ':' + (x.who === U1 ? 'A' : 'B')).sort().join();
  T('汇总：daily_people 按（城市, 当地日期）', dp === 'melb:B,per:A,per:B', dp);
  T('汇总：rollup_days 每个城市一行', +(await one(`select count(*) from rollup_days where day=$1`, [D])).count === 6);
  T('汇总后读（珀斯、墨尔本）与直接读原始事件结果相同', JSON.stringify(await raw('per', ...perDay)) === JSON.stringify(pRaw) && JSON.stringify(await raw('melb', ...melDay)) === JSON.stringify(mRaw));
  const all = (await q(`select count(distinct who) n from people_between($1,$2)`, [melDay[0], perDay[1]])).rows[0];
  T('不给城市 = 全部城市合起来（同一人在两个城市各算一行，去重后 2 人）', +all.n === 2, all);
  const dims = await q(`select dim, who from event_dims_between($1,$2,'{page_view}','per')`, perDay);
  T('页面统计按城市（汇总后）', dims.rows.length === 1 && dims.rows[0].dim === 'disc' && (await q(`select 1 from event_dims_between($1,$2,'{page_view}','melb')`, melDay)).rows.length === 0, dims.rows);
  const cv = (await q(`select * from card_views($1,$2,'per')`, perDay)).rows;
  T('球员卡被查看按城市（看的人当时在珀斯）', cv.length === 1 && cv[0].user_id === U1 && +cv[0].views === 1 && +cv[0].external_landings === 1 && (await q(`select 1 from card_views($1,$2,'melb')`, melDay)).rows.length === 0, cv);
  await q(`delete from rollup_days`);
  T('删掉汇总标记后（改读原始事件）结果仍相同', JSON.stringify(await raw('per', ...perDay)) === JSON.stringify(pRaw) && (await q(`select * from card_views($1,$2,'per')`, perDay)).rows.length === 1);
  T('原始事件里别的城市的事件不算进来（球员卡被查看，整段时间）', (await q(`select 1 from card_views($1,$2,'melb')`, [melDay[0], perDay[1]])).rows.length === 0 && (await q(`select 1 from card_views($1,$2,'per')`, [melDay[0], perDay[1]])).rows.length === 1);
  await q(`select rollup_people($1::date + 2)`, [D]);
  const mix = (await q(`select distinct who from people_between($1::timestamptz - interval '1 hour', city_day_start('melb', $2::date + 3), 'melb')`, [tPerLate, D])).rows.map(x => x.who);
  T('汇总日之前的零头时段也只算这个城市的事件', !mix.includes(U1), mix);
  await q(`delete from rollup_days`);
  T('参与统计的城市：已开放的（未开放的城市不逐个跑）', (await q(`select * from stat_cities()`)).rows.map(x => x.stat_cities).sort().join() === 'melb,per');

  // ---------- 球局类统计按当地 ----------
  await q(`update cities set status='on' where key='adl'`);
  const V = (await one(`insert into venues(name,short_name,suburb,postcode,location,surfaces,status) values ('S','S','Subiaco','6008','POINT(0 0)','{hard}','active') returning id`)).id;
  const VM = (await one(`insert into venues(name,short_name,suburb,postcode,location,surfaces,status) values ('B','B','Brighton','3186','POINT(0 0)','{hard}','active') returning id`)).id;
  const g = async (v, t, host = U1) => (await one(`insert into games(share_code,host_id,venue_id,starts_at,duration_min,game_type,capacity,utr_min,utr_max) values ('k'||floor(random()*1e9)::text,$1,$2,$3,90,'singles',2,3,7) returning id, city`, [host, v, t]));
  const g1 = await g(V, await ts('per', 0, '07:30'));
  const slot = await one(`select slot, dow, city from admin_game_slots where id=$1`, [g1.id]);
  T('开打时段按当地：珀斯 07:30 → 早场', g1.city === 'per' && slot.slot === 'early' && slot.city === 'per', slot);
  const hm = (await q(`select hour from start_heatmap(now()-interval '30 days', now(), 'per')`)).rows.map(x => x.hour);
  T('开打分布按当地钟点（7 点）', hm.join() === '7', hm);
  // 今天面板：珀斯今天 23:00 的局（墨尔本已是明天凌晨）只算珀斯的今天
  //   面板只算还没开打的：过了当地 23 点跑时改成「再过 20 秒」（10-26 夜里跑失败后改）
  const tToday = (await one(`select greatest(city_day_start('per', city_today('per')) + interval '23 hours', now() + interval '20 seconds') t`)).t;
  const tMelToday = (await one(`select greatest(city_day_start('melb', city_today('melb')) + interval '23 hours', now() + interval '20 seconds') t`)).t;
  await g(V, tToday); await g(VM, tMelToday, U2);
  const bp = await one(`select left_n + cancelled_n n from today_board('per')`), bm = await one(`select left_n + cancelled_n n from today_board('melb')`), ba = await one(`select left_n + cancelled_n n from today_board()`);
  T('今天面板：每个城市按自己的今天；全部 = 各城市之和', +bp.n === 1 && +bm.n === 1 && +ba.n === 2, [bp, bm, ba]);
  await q(`insert into game_participants(game_id,user_id,status,created_at) values ($1,$2,'pending',$3)`, [g1.id, U2, tPerLate]);
  const ad = (await q(`select city, day::text from v_applications_daily`)).rows;
  T('每天申请按球局城市的当地日期', ad.length === 1 && ad[0].city === 'per' && ad[0].day === D, ad);
  const ret = await q(`select city from v_user_retention where user_id=$1`, [U1]);
  T('留存带城市', ret.rows[0]?.city === 'per', ret.rows);

  // ---------- 每晚汇总所有城市 ----------
  await q(`delete from rollup_days`);
  const cl = await pool.connect(); try { await cl.query('begin'); await cl.query('set local role nbq_service'); await cl.query(`select job_nightly()`); await cl.query('commit') } finally { cl.release() }
  T('每晚：所有城市最近 3 天都汇总了', +(await one(`select count(*) from rollup_days`)).count === 18 && +(await one(`select count(distinct city) from rollup_days`)).count === 6);

  // ---------- 只读角色 ----------
  r = await viewer(`select * from people_between(now()-interval '7 days', now(), 'per')`); T('只读角色能调按城市的统计函数', r.ok, r);
  r = await viewer(`select * from today_board('per')`); T('只读：今天面板', r.ok, r);
  r = await viewer(`select * from card_views(now()-interval '7 days', now())`); T('只读：球员卡被查看（全部城市）', r.ok, r);
  r = await viewer(`select count(*) from events`); T('只读仍然不能直接读原始事件', !r.ok, r);
} catch (e) { fail++; console.log('FAIL 异常 ' + (e.stack || e)) }
finally { if (pool) await pool.end().catch(() => { }); c.stop() }
console.log(`cities_stats: ${pass} 通过, ${fail} 失败`); process.exit(fail ? 1 : 0);
