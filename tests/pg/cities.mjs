// 地区扩展 R1-1：多城市（schema ⑲）。城市配置、只看得到已开放的城市、区 → 球场 → 球局的城市、同名区不冲突；
// 时间规则按城市：珀斯（没有夏令时，晚 3 小时）、阿德莱德（半小时时区）、布里斯班（没有夏令时）的发局时段、7 天、顺延截止；
// 邀约的城市、换时间不能换城市、成局的城市；赛后提醒按收件人常用城市的夜间；墨尔本的结果和原来完全一样。
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
  const as = role => async (uid, sql, params) => { const cl = await pool.connect();
    try { await cl.query('begin'); await cl.query(`set local role ${role}`); if (uid) await cl.query(`select set_config('nbq.uid', $1, true)`, [uid]);
      const r = await cl.query(sql, params); await cl.query('commit'); return { ok: true, v: r.rows[0] && Object.values(r.rows[0])[0], rows: r.rows } }
    catch (e) { await cl.query('rollback').catch(() => { }); return { ok: false, err: e.message, detail: e.detail } } finally { cl.release() } };
  const call = as('nbq_user'), adm = as('nbq_admin');
  const is = (r, code) => !r.ok && r.err === code;

  // ---------- 城市配置 ----------
  const cs = (await q(`select key, tz, status from cities order by sort`)).rows;
  T('6 个城市，墨尔本已开放，其他未开放', cs.map(x => x.key).join() === 'melb,syd,bne,per,adl,cbr' && cs.filter(x => x.status === 'on').map(x => x.key).join() === 'melb', cs);
  let r = await q(`insert into cities(key,state,name_zh,name_en,tz,center,hashtag) values ('hob','TAS','霍巴特','Hobart','Australia/Hobartt','POINT(147.3 -42.9)','霍巴特网球')`).then(() => ({ ok: true }), e => ({ ok: false, err: e.message }));
  T('时区名写错不能保存', !r.ok && /time zone/.test(r.err), r);
  r = await q(`update cities set slot_end='23:30' where key='syd'`).then(() => ({ ok: true }), e => ({ ok: false, err: e.message })); T('最晚开打不能晚于顺延截止', !r.ok, r);
  for (const d of ['2026-10-03', '2026-10-04', '2026-10-05', '2027-04-03', '2027-04-04', '2027-01-15'])
    T(`墨尔本 ${d}：city_day_start 与原来的 mel_day_start 相同`, (await one(`select city_day_start('melb',$1::date) = mel_day_start($1::date) ok`, [d])).ok);
  T('city_today(melb) = mel_today()', (await one(`select city_today('melb') = mel_today() ok`)).ok);
  T('珀斯、阿德莱德当地日期的开始时间', (await one(`select to_char(city_day_start('per','2027-01-15') at time zone 'UTC','HH24:MI') p, to_char(city_day_start('adl','2027-01-15') at time zone 'UTC','HH24:MI') a`)).p === '16:00'
    && (await one(`select to_char(city_day_start('adl','2027-01-15') at time zone 'UTC','HH24:MI') a`)).a === '13:30');
  T('夜间不打扰跨午夜', (await one(`select nbq_quiet('23:00','22:00','08:00') a, nbq_quiet('07:59','22:00','08:00') b, not nbq_quiet('08:00','22:00','08:00') c, not nbq_quiet('12:00','22:00','08:00') d`)) && Object.values(await one(`select nbq_quiet('23:00','22:00','08:00') a, nbq_quiet('07:59','22:00','08:00') b, not nbq_quiet('08:00','22:00','08:00') c, not nbq_quiet('12:00','22:00','08:00') d`)).every(Boolean));

  // ---------- 用户、区、球场 ----------
  let un = 0; const user = async (city = 'melb') => (await one(`insert into users(phone_e164,nickname,utr,gender,pact_accepted_at,home_city) values ($1,'P'||$2,5,'m',now(),$3) returning id`, ['+6146' + String(++un).padStart(7, '0'), un, city])).id;
  r = await call(await user(), `select key from cities order by sort`); T('前台只看得到已开放的城市', r.ok && r.rows.map(x => x.key).join() === 'melb', r);
  r = await adm(null, `select count(*)::int n from cities`); T('后台看得到全部城市', r.ok && r.v === 6, r);
  await q(`insert into suburbs(name,postcode,centroid,city,state) values ('Brighton','3186','POINT(145 -37.9)','melb','VIC'),('Brighton','5048','POINT(138.52 -35.02)','adl','SA'),
    ('Bondi','2026','POINT(151.27 -33.89)','syd','NSW'),('Subiaco','6008','POINT(115.82 -31.95)','per','WA'),('Glenelg','5045','POINT(138.51 -34.98)','adl','SA'),('New Farm','4005','POINT(153.05 -27.47)','bne','QLD')`);
  T('同名区（Brighton VIC / SA）可以同时存在', +(await one(`select count(*) from suburbs where name='Brighton'`)).count === 2);
  const venue = async (name, sub, pc) => (await one(`insert into venues(name,short_name,suburb,postcode,location,surfaces,status) values ($1,$1,$2,$3,'POINT(0 0)','{hard}','active') returning id, city`, [name, sub, pc]));
  const VM = await venue('Brighton TC', 'Brighton', '3186'), VA = await venue('Brighton SA TC', 'Brighton', '5048'), VP = await venue('Subiaco TC', 'Subiaco', '6008'), VB = await venue('New Farm TC', 'New Farm', '4005'), VS = await venue('Bondi TC', 'Bondi', '2026');
  T('球场的城市由所在区决定（同名区分得清）', VM.city === 'melb' && VA.city === 'adl' && VP.city === 'per' && VB.city === 'bne' && VS.city === 'syd', [VM, VA, VP, VB, VS]);
  await q(`update venues set suburb='Glenelg', postcode='5045' where id=$1`, [VM.id]); T('球场换区后城市跟着变', (await one(`select city from venues where id=$1`, [VM.id])).city === 'adl');
  await q(`update venues set suburb='Brighton', postcode='3186' where id=$1`, [VM.id]);

  // ---------- 发局：城市没开放 / 按当地时段 ----------
  const H = await user();
  const at = async (city, dayOff, hm) => (await one(`select (city_day_start($1, city_today($1) + $2::int) + $3::interval) t`, [city, dayOff, hm])).t.toISOString();
  await q(`update rate_rules set enabled=false where rule='game_day'`);   // 这里测时段，不测发局次数（rate.mjs 测）
  const create = async (v, startIso, host = H) => call(host, `select api_game_create($1)`, [JSON.stringify({ venue_id: v, starts_at: startIso, game_type: 'singles', utr_min: 3, utr_max: 7 })]);
  r = await create(VS.id, await at('syd', 2, '10:00')); T('悉尼没开放 → city_closed', is(r, 'city_closed') && r.detail === 'syd', r);
  await q(`update cities set status='on' where key in ('per','adl','bne')`);
  r = await create(VP.id, await at('per', 2, '21:00')); T('珀斯当地 21:00 可以发（墨尔本那时已过午夜）', r.ok, r);
  r = await create(VM.id, await at('per', 2, '21:00')); T('同一时刻在墨尔本的球场 → 超出时段', is(r, 'time_out_of_range'), r);
  r = await create(VP.id, await at('per', 2, '05:30')); T('珀斯当地 05:30 → 超出时段', is(r, 'time_out_of_range'), r);
  r = await create(VA.id, await at('adl', 2, '21:30')); T('阿德莱德当地 21:30 可以发（半小时时区）', r.ok, r);
  r = await create(VM.id, await at('adl', 2, '21:30')); T('同一时刻墨尔本是 22:00 → 超出时段', is(r, 'time_out_of_range'), r);
  r = await create(VA.id, await at('adl', 2, '18:15')); T('阿德莱德当地 18:15 → 不是半点', is(r, 'time_out_of_range'), r);
  r = await create(VB.id, await at('bne', 2, '21:30')); T('布里斯班当地 21:30 可以发（没有夏令时）', r.ok, r);
  r = await create(VP.id, await at('per', 6, '09:00')); T('珀斯：当地第 6 天可以', r.ok, r);
  r = await create(VP.id, await at('per', 7, '09:00')); T('珀斯：当地第 7 天不行', is(r, 'time_out_of_range'), r);
  const gp = (await one(`select id, city from games where venue_id=$1 order by created_at limit 1`, [VP.id]));
  T('球局的城市 = 球场的城市', gp.city === 'per' && (await one(`select city from games where venue_id=$1 limit 1`, [VA.id])).city === 'adl');
  r = await create(VM.id, await at('melb', 2, '19:00')); T('墨尔本照常', r.ok, r);

  // ---------- 改时间、顺延按当地 ----------
  r = await call(H, `select api_game_edit($1,$2)`, [gp.id, JSON.stringify({ starts_at: await at('per', 3, '21:30') })]); T('珀斯球局改到当地 21:30 可以', r.ok, r);
  const H2 = await user(), H3 = await user();   // 发起人进行中的球局最多 5 个，换人发
  const gp2 = (await create(VP.id, await at('per', 3, '20:30'), H2)); const gid = (await one(`select id from games where venue_id=$1 and starts_at=$2`, [VP.id, await at('per', 3, '20:30')])).id;
  r = await call(H2, `select api_game_postpone($1)`, [gid]); T('珀斯 20:30 开打 90 分钟，顺延后当地 23:00 结束 → 可以（按墨尔本算会过午夜）', r.ok, r);
  const H4 = await user(); await create(VA.id, await at('adl', 3, '20:30'), H4); const ga = (await one(`select id from games where venue_id=$1 and starts_at=$2`, [VA.id, await at('adl', 3, '20:30')])).id;
  r = await call(H4, `select api_game_postpone($1)`, [ga]); T('阿德莱德 20:30 开打，顺延后当地 23:00 结束 → 可以（墨尔本那时 23:30）', r.ok, r);
  const gm = (await create(VM.id, await at('melb', 3, '21:00'), H3)) && (await one(`select id from games where venue_id=$1 and starts_at=$2`, [VM.id, await at('melb', 3, '21:00')])).id;
  r = await call(H3, `select api_game_postpone($1)`, [gm]); T('墨尔本 21:00 开打，顺延后 23:30 结束 → 太晚', is(r, 'postpone_too_late'), r);

  // ---------- 邀约 ----------
  const IP = await user('per'), IP2 = await user('per'), IM = await user('melb');
  const inv = (from, to, o) => call(from, `select api_invite($1)`, [JSON.stringify({ to_user: to, game_type: 'singles', ...o })]);
  r = await inv(IP, IP2, { venue_id: VP.id, starts_at: await at('per', 2, '20:00'), ends_at: await at('per', 2, '21:00') });
  T('邀约按球场城市的当地时段（珀斯 20:00）', r.ok && (await one(`select city from invites where id=$1`, [r.v])).city === 'per', r);
  const iid = r.v;
  r = await inv(IP2, IM, { venue_name: '家附近的球场', starts_at: await at('per', 2, '21:30'), ends_at: await at('per', 2, '22:30') });
  T('自填场地：按发起人常用城市（珀斯）', r.ok && (await one(`select city from invites where id=$1`, [r.v])).city === 'per', r);
  r = await call(IP2, `select api_invite_counter($1,$2)`, [iid, JSON.stringify({ starts_at: await at('per', 3, '09:00'), ends_at: await at('per', 3, '10:00'), venue_id: VM.id })]);
  T('换时间不能换到别的城市的球场', is(r, 'invalid') && r.detail === 'venue_city', r);
  r = await call(IP2, `select api_invite_accept($1)`, [iid]); T('接受邀约 → 成局的城市 = 珀斯', r.ok && (await one(`select city from games where id=$1`, [r.v])).city === 'per', r);

  // ---------- 赛后提醒：按收件人常用城市的夜间 ----------
  const RM = await user('melb'), RP = await user('per'), RX = await user('melb');
  const pNow = await at('melb', -1, '23:30');   // 墨尔本 23:30（夜间）= 珀斯 20:30 或 21:30（白天）
  const gr = (await one(`insert into games(share_code,host_id,venue_id,starts_at,duration_min,game_type,capacity,utr_min,utr_max) values ('rc1',$1,$2,$3::timestamptz - interval '4 hours',90,'doubles',4,3,7) returning id`, [RX, VM.id, pNow])).id;
  for (const u of [RM, RP]) await q(`insert into game_participants(game_id,user_id,status,approved_at) values ($1,$2,'approved',now()-interval '1 day')`, [gr, u]);
  const cl = await pool.connect(); try { await cl.query('begin'); await cl.query('set local role nbq_service'); await cl.query(`select job_recap_notices($1)`, [pNow]); await cl.query('commit') } finally { cl.release() }
  const got = (await q(`select user_id from notifications where kind='recap' and game_id=$1`, [gr])).rows.map(x => x.user_id);
  T('墨尔本深夜：常用城市在珀斯的人收到赛后提醒，墨尔本的人不发（等到 8 点）', got.includes(RP) && !got.includes(RM) && !got.includes(RX), got);

  // ---------- 常用城市 ----------
  const U = await user();
  r = await call(U, `update users set home_city='syd' where id=$1`, [U]); T('常用城市不能选没开放的城市', is(r, 'city_closed'), r);
  r = await call(U, `update users set home_city='per' where id=$1`, [U]); T('改成已开放的城市', r.ok, r);
  r = await call(U, `select home_city from public_profiles where id=$1`, [U]); T('球员卡带常用城市', r.ok && r.v === 'per', r);
  T('新用户默认墨尔本', (await one(`select home_city from users where id=$1`, [H])).home_city === 'melb');
  T('按城市查球局有索引', !!(await one(`select 1 x from pg_indexes where indexname='games_city_start'`)));
} catch (e) { fail++; console.log('FAIL 异常 ' + (e.stack || e)) }
finally { if (pool) await pool.end().catch(() => { }); c.stop() }
console.log(`cities: ${pass} 通过, ${fail} 失败`); process.exit(fail ? 1 : 0);
