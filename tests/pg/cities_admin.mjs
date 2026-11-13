// 地区扩展 R4：后台按城市（schema ㉔）。运营按城市授权（读 / 写 / 统计 / 全局操作）、城市页一览、上线检查清单、
// 改上线状态（每一步过清单、可退回、记试运行和正式开放时间）、改城市资料、开放时通知我（导出名单、标记已通知）、权限表、会话带城市。
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
  // 以某位管理员的身份（后端在事务里 set role + nbq.admin）
  const as = (role, admin) => async (sql, params) => { const cl = await pool.connect();
    try { await cl.query('begin'); await cl.query(`set local role ${role}`); if (admin) await cl.query(`select set_config('nbq.admin', $1, true)`, [admin]);
      const r = await cl.query(sql, params); await cl.query('commit'); return { ok: true, v: r.rows[0] && Object.values(r.rows[0])[0], rows: r.rows } }
    catch (e) { await cl.query('rollback').catch(() => { }); return { ok: false, err: e.message, detail: e.detail } } finally { cl.release() } };
  const is = (r, code, detail) => !r.ok && r.err === code && (detail === undefined || r.detail === detail);
  const mk = async (email, role, cities = null) => (await one(`insert into admin_users(email,name,role,password_hash,totp_secret,cities) values ($1,$2,$3,'x','x',$4) returning id`, [email, email.split('@')[0], role, cities])).id;
  const O = await mk('han@x.com', 'owner'), OPA = await mk('ops@x.com', 'operator'), OPS = await mk('syd@x.com', 'operator', ['syd']), VWS = await mk('vsyd@x.com', 'viewer', ['syd']);
  const own = as('nbq_admin', O), opa = as('nbq_admin', OPA), ops = as('nbq_admin', OPS), vws = as('nbq_viewer', VWS);

  // 数据：墨尔本、悉尼各一位球友、一个球场、一个球局、一条举报
  await q(`update cities set status='prep' where key='syd'`);
  await q(`insert into suburbs(name,postcode,centroid,city,state) values ('Brighton','3186','POINT(145 -37.9)','melb','VIC'),('Bondi','2026','POINT(151.27 -33.89)','syd','NSW')`);
  const V = async (sub, pc) => (await one(`insert into venues(name,short_name,suburb,postcode,location,surfaces,status) values ($1,$1,$2,$3,'POINT(145 -37.9)','{hard}','active') returning id`, ['V' + pc, sub, pc])).id;
  const Vm = await V('Brighton', '3186'), Vs = await V('Bondi', '2026');
  let un = 0; const U = async city => (await one(`insert into users(phone_e164,nickname,utr,home_city) values ($1,'u'||$2,5,$3) returning id`, ['+6141' + String(++un).padStart(7, '0'), un, city])).id;
  const Um = await U('melb'), Us = await U('syd'), Us2 = await U('syd');
  const G = async (v, host, code) => q(`insert into games(share_code,host_id,venue_id,starts_at,duration_min,game_type,capacity,utr_min,utr_max) values ($1,$2,$3,now()+interval '1 day',90,'singles',2,3,7)`, [code, host, v]);
  await G(Vm, Um, 'gm'); await G(Vs, Us, 'gs');
  const Rm = (await one(`insert into reports(reporter_id,target_type,target_id,reason,source,via) values ($1,'user',$2,'harass','in_app','card') returning id`, [Um, Us])).id;
  const Rs = (await one(`insert into reports(reporter_id,target_type,target_id,reason,source,via) values ($1,'user',$2,'harass','in_app','card') returning id`, [Us, Um])).id;

  // ---------- 权限表、会话 ----------
  T('权限表加了城市两项（只有超级管理员、都要理由）', JSON.stringify((await q(`select action, roles, need_reason from admin_perms where action like 'city.%' order by 1`)).rows) === JSON.stringify([{ action: 'city.manage', roles: ['owner'], need_reason: true }, { action: 'city.waitlist', roles: ['owner'], need_reason: true }]));
  T('权限表共 21 项（#49 加了运行时开关）', +(await one(`select count(*) from admin_perms`)).count === 21);
  { const tok = 'f'.repeat(64); await q(`insert into admin_sessions(admin_id, token_hash, expires_at, last_seen_at) values ($1,$2,now()+interval '1 hour',now())`, [OPS, tok]);
    const r = await as('nbq_service')(`select admin_session_check($1) j`, [tok]); T('会话里带负责的城市', r.ok && JSON.stringify(r.v.cities) === '["syd"]' && r.v.role === 'operator', r) }

  // ---------- 读 ----------
  let r = await ops(`select array_agg(home_city order by home_city) v from users`); T('只负责悉尼的运营：球友只看到悉尼的', r.ok && r.v.join() === 'syd,syd', r);
  r = await ops(`select array_agg(share_code) v from games`); T('球局只看到悉尼的', r.ok && r.v.join() === 'gs', r);
  r = await ops(`select array_agg(city) v from venues`); T('球场只看到悉尼的', r.ok && r.v.join() === 'syd', r);
  r = await opa(`select count(*)::int v from users`); T('负责全部城市的运营看到全部', r.ok && r.v === 3, r);
  r = await own(`select count(*)::int v from games`); T('超级管理员看到全部', r.ok && r.v === 2, r);
  r = await vws(`select array_agg(city) v from venues`); T('只读（悉尼）：球场也只看到悉尼的', r.ok && r.v.join() === 'syd', r);
  r = await ops(`select array_agg(x order by x) v from stat_cities() x`); T('统计：不给城市 → 只算负责的城市', r.ok && r.v.join() === 'syd', r);
  r = await ops(`select count(*)::int v from stat_cities('melb')`); T('统计：给了不负责的城市 → 空', r.ok && r.v === 0, r);
  r = await q(`select array_agg(x order by x) v from stat_cities() x`).then(x => ({ ok: true, v: x.rows[0].v })); T('统计：每晚任务（没有管理员）照常算全部已开放的', r.ok && r.v.join() === 'melb,syd', r);

  // ---------- 写 ----------
  const st = (fn, u, rs = '多次迟到不来') => fn(`select admin_user_status($1,'limited','other',$2)`, [u, rs]);
  r = await st(ops, Us); T('悉尼运营处理悉尼球友：可以', r.ok, r);
  r = await st(ops, Um); T('悉尼运营处理墨尔本球友 → admin_forbidden（city）', is(r, 'admin_forbidden', 'city'), r);
  r = await st(opa, Um); T('全部城市的运营处理墨尔本球友：可以', r.ok, r);
  r = await ops(`select admin_report_handle($1,'dismissed','核实无问题')`, [Rs]); T('举报按举报人的城市：悉尼的可以', r.ok, r);
  r = await ops(`select admin_report_handle($1,'dismissed','核实无问题')`, [Rm]); T('墨尔本人举报的 → 不行', is(r, 'admin_forbidden', 'city'), r);
  r = await ops(`select admin_venue_review($1,'approve')`, [Vm]); T('审核墨尔本的球场 → 不行', is(r, 'admin_forbidden', 'city'), r);
  r = await ops(`select admin_export('users', false, null)`); T('导出（全局操作）→ 只负责部分城市的人不行', is(r, 'admin_forbidden', 'city'), r);
  r = await opa(`select admin_export('users', false, null)`); T('全部城市的运营可以导出统计', r.ok, r);
  T('被拦下的操作不写日志；成功的写', +(await one(`select count(*) from admin_audit_log where admin_id=$1`, [OPS])).count === 2);

  // ---------- 城市页 ----------
  r = await own(`select key, status, suburbs, venues, players, games_30d from admin_city_overview()`);
  T('城市页：6 个城市，区 / 球场 / 球友 / 球局数', r.ok && r.rows.length === 6 && JSON.stringify(r.rows.find(x => x.key === 'syd')) === JSON.stringify({ key: 'syd', status: 'prep', suburbs: '1', venues: '1', players: '2', games_30d: '0' }), r.rows);
  r = await ops(`select array_agg(key) v from admin_city_overview()`); T('城市页：悉尼运营只看到悉尼', r.ok && r.v.join() === 'syd', r);
  r = await vws(`select count(*)::int v from admin_city_overview()`); T('只读也能看城市页（自己负责的）', r.ok && r.v === 1, r);
  const ck = async k => Object.fromEntries((await one(`select city_checklist($1) j`, [k])).j.map(x => [x.item, x.ok]));
  T('检查清单：悉尼的区、球场都不够，社群没填，没试运行', JSON.stringify(await ck('syd')) === JSON.stringify({ suburbs: false, venues: false, basics: true, community: false, beta14: false }), await ck('syd'));

  // ---------- 上线状态 ----------
  r = await opa(`select admin_city_status('syd','beta','准备试运行')`); T('运营不能改上线状态', is(r, 'admin_forbidden', 'city.manage'), r);
  r = await own(`select admin_city_status('syd','beta','')`); T('不写理由不行', is(r, 'admin_reason_required'), r);
  r = await own(`select admin_city_status('syd','beta','准备试运行')`); T('区和球场不够 → admin_city_not_ready（列出没过的项）', is(r, 'admin_city_not_ready', 'suburbs,venues'), r);
  for (let i = 0; i < 20; i++) await q(`insert into suburbs(name,postcode,centroid,city,state) values ($1,$2,'POINT(151.2 -33.9)','syd','NSW')`, ['S' + i, String(2100 + i)]);
  for (let i = 0; i < 9; i++) await q(`insert into venues(name,short_name,suburb,postcode,location,surfaces,status) values ($1,$1,'Bondi','2026','POINT(151.27 -33.89)','{hard}','active')`, ['W' + i]);
  r = await own(`select admin_city_status('syd','on','直接正式')`); T('跳到正式：还要社群链接和试运行 14 天', is(r, 'admin_city_not_ready', 'community,beta14'), r);
  r = await own(`select admin_city_status('syd','beta','准备试运行')`); T('区 21 个、球场 10 个 → 可以试运行，记试运行时间', r.ok && (await one(`select status, beta_at is not null b from cities where key='syd'`)).b, r);
  r = await own(`select admin_city_set('syd','{"community_url":"javascript:alert(1)"}','补社群链接')`); T('社群链接只能是 https', is(r, 'invalid', 'community_url'), r);
  r = await own(`select admin_city_set('syd','{"tz":"Asia/Tokyo"}','想改一下时区')`); T('城市资料只能改社群链接、话题、默认位置名', is(r, 'invalid', 'tz'), r);
  r = await own(`select admin_city_set('syd','{"community_url":"https://example.com/syd"}','补社群链接')`); T('补社群链接', r.ok && (await one(`select community_url from cities where key='syd'`)).community_url === 'https://example.com/syd', r);
  r = await own(`select admin_city_status('syd','on','正式开放')`); T('试运行不满 14 天 → 不能正式', is(r, 'admin_city_not_ready', 'beta14'), r);
  await q(`update cities set beta_at = now()-interval '15 days' where key='syd'`);
  r = await own(`select admin_city_status('syd','on','正式开放')`); T('满 14 天 → 正式开放，记开放时间', r.ok && (await one(`select status, launched_at is not null l from cities where key='syd'`)).l, r);
  r = await own(`select admin_city_status('syd','beta','发现问题先退回')`); T('可以退回（不检查清单）', r.ok && (await one(`select status from cities where key='syd'`)).status === 'beta', r);
  r = await ops(`select admin_city_set('melb','{"hashtag":"x"}','改话题')`); T('改城市资料也是超级管理员才行', !r.ok, r);
  T('成功的改状态和改资料都记日志（含理由；被拦下的整笔回滚、不记）', +(await one(`select count(*) from admin_audit_log where action='city.manage' and detail ? 'reason'`)).count === 4);

  // ---------- 开放时通知我 ----------
  await q(`update cities set status='off' where key='per'`);
  const svc = as('nbq_service');
  await svc(`select api_city_waitlist('per','a@x.com','1.1.1.1')`); await svc(`select api_city_waitlist('per','b@x.com','1.1.1.1')`);
  r = await own(`select * from admin_city_waitlist('per','开放了发通知')`); T('城市还没开放 → 不能导出名单', is(r, 'admin_city_not_ready', 'not_open'), r);
  r = await own(`select waitlist, waitlist_pending from admin_city_overview() where key='per'`); T('城市页显示登记人数', r.ok && r.rows[0].waitlist === '2' && r.rows[0].waitlist_pending === '2', r);
  for (let i = 0; i < 20; i++) await q(`insert into suburbs(name,postcode,centroid,city,state) values ($1,$2,'POINT(115.8 -31.9)','per','WA')`, ['P' + i, String(6000 + i)]);
  for (let i = 0; i < 10; i++) await q(`insert into venues(name,short_name,suburb,postcode,location,surfaces,status) values ($1,$1,'P0','6000','POINT(115.8 -31.9)','{hard}','active')`, ['PV' + i]);
  r = await own(`select admin_city_status('per','beta','珀斯试运行')`); T('珀斯直接从未开放到试运行（过清单）', r.ok, r);
  r = await opa(`select * from admin_city_waitlist('per','开放了发通知')`); T('运营不能导出名单', is(r, 'admin_forbidden', 'city.waitlist'), r);
  r = await own(`select * from admin_city_waitlist('per','')`); T('导出名单要理由', is(r, 'admin_reason_required'), r);
  r = await own(`select array_agg(email order by email) v from admin_city_waitlist('per','珀斯开放，发通知')`); T('导出还没通知的名单', r.ok && r.v.join() === 'a@x.com,b@x.com', r);
  r = await own(`select admin_city_waitlist_done('per','邮件已发出')`); T('标记已通知 → 2 条', r.ok && r.v === 2, r);
  r = await own(`select count(*)::int v from admin_city_waitlist('per','再看一次')`); T('已通知的不再导出', r.ok && r.v === 0, r);
  T('导出和标记都记日志', +(await one(`select count(*) from admin_audit_log where action='city.waitlist'`)).count === 3);

  // ---------- 管理员负责的城市 ----------
  r = await own(`select admin_set_cities($1, array['melb'], '改为负责墨尔本')`, [OPS]); T('超级管理员改运营负责的城市', r.ok && (await one(`select cities from admin_users where id=$1`, [OPS])).cities.join() === 'melb', r);
  r = await ops(`select count(*)::int v from users where home_city='syd'`); T('改完立即生效（看不到悉尼了）', r.ok && r.v === 0, r);
  r = await own(`select admin_set_cities($1, array['xxx'], '写错城市')`, [OPS]); T('不存在的城市不行', is(r, 'invalid', 'cities'), r);
  r = await own(`select admin_set_cities($1, array['melb'], '限制超级管理员')`, [O]); T('超级管理员不能限制城市（一律全部）', is(r, 'invalid', 'cities'), r);
  r = await own(`select admin_set_cities($1, null, '恢复负责全部城市')`, [OPS]); T('改回全部城市', r.ok && (await one(`select cities from admin_users where id=$1`, [OPS])).cities === null, r);
  r = await opa(`select admin_set_cities($1, array['melb'], '运营自己改')`, [OPA]); T('运营不能改负责城市', is(r, 'admin_forbidden', 'admin.manage'), r);
  r = await as('nbq_user')(`select * from admin_city_overview()`); T('前台不能看城市页', !r.ok && /permission denied/.test(r.err), r);
} catch (e) { console.log('FAIL 异常', e.stack); fail++ }
finally { await pool?.end().catch(() => { }); c.stop(); }
console.log(`cities_admin: ${pass} 通过, ${fail} 失败`); process.exit(fail ? 1 : 0);
