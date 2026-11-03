// 第四批 4g：定时任务（schema ⑫）。每个任务：该做的做了、不该做的没动、发了该发的通知、再跑一次什么都不做、记了 job_runs。
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
  const job = async (name, at) => { const cl = await pool.connect();
    try { await cl.query('begin'); await cl.query('set local role nbq_service'); const r = await cl.query(`select ${name}(${at ? '$1::timestamptz' : ''}) as n`, at ? [at] : []); await cl.query('commit'); return r.rows[0].n }
    catch (e) { await cl.query('rollback').catch(() => { }); return 'ERR ' + e.message } finally { cl.release() } };
  const nn = async (uid, kind, game) => +(await one(`select count(*) from notifications where user_id=$1 and kind=$2 and ($3::uuid is null or game_id=$3)`, [uid, kind, game || null])).count;
  const mel = async (off, hm) => (await one(`select ((mel_today() + $1::int)::timestamp + $2::time) at time zone 'Australia/Melbourne' as t`, [off, hm])).t.toISOString();
  const id = n => '00000000-0000-0000-0000-0000000000' + String(n).padStart(2, '0');
  const U = { H: 1, A: 2, B: 3, C: 4, S1: 5, S2: 6, D1: 7, D2: 8 }; for (const k in U) U[k] = id(U[k]);
  await q(`insert into suburbs(name,postcode,centroid) values ('Brighton','3186','POINT(145 -37.9)')`);
  for (const k in U) await q(`insert into users(id,phone_e164,nickname,utr,pact_accepted_at,wechat_id,email) values ($1,$2,$3,5,now(),'wx'||$3,lower($3)||'@x.com')`, [U[k], '+614000000' + U[k].slice(-2), k]);
  const V = id(90); await q(`insert into venues(id,name,short_name,suburb,postcode,location,surfaces,status) values ($1,'Brighton TC','Brighton TC','Brighton','3186','POINT(145 -37.9)','{hard}','active')`, [V]);
  let gn = 0;
  const game = async (start, { cap = 2, host = U.H, created = "now()-interval '1 day'", timeSet = null, vis = 'public' } = {}) =>
    (await one(`insert into games(share_code,host_id,venue_id,starts_at,duration_min,game_type,capacity,utr_min,utr_max,created_at,time_set_at,visibility)
      values ($1,$2,$3,${start},90,$4,$5,3,7,${created},${timeSet || created},$6) returning id`, ['j' + (++gn), host, V, cap === 4 ? 'doubles' : 'singles', cap, vis])).id;
  const join = (g, u, approvedAt = "now()-interval '20 hours'") => q(`insert into game_participants(game_id,user_id,status,approved_at,decided_at,created_at) values ($1,$2,'approved',${approvedAt},${approvedAt},now()-interval '1 day')`, [g, u]);
  let n;

  // ---------- 申请失效 ----------
  const gSoon = await game("now()+interval '30 minutes'", { cap: 4 });
  await q(`insert into game_participants(game_id,user_id,created_at) values ($1,$2,now()-interval '40 minutes')`, [gSoon, U.A]);   // 失效时间已过、刚过不久
  const gOld = await game("now()-interval '2 hours'", { cap: 4 });
  await q(`insert into game_participants(game_id,user_id,created_at) values ($1,$2,now()-interval '1 day')`, [gOld, U.B]);           // 早就该失效（补跑）
  const gFar = await game("now()+interval '3 days'", { cap: 4 });
  await q(`insert into game_participants(game_id,user_id,created_at) values ($1,$2,now())`, [gFar, U.C]);
  n = await job('job_expire_applications'); T('申请超时失效（2 条）', n === 2, n);
  T('30 分钟内失效的通知申请人，补跑出来的旧失效不通知', await nn(U.A, 'expired', gSoon) === 1 && await nn(U.B, 'expired') === 0);
  T('失效时间记为截止时间，没到期的不动', (await one(`select decline_reason, expired_at is not null e from game_participants where game_id=$1 and user_id=$2`, [gSoon, U.A])).decline_reason === 'timeout'
    && (await one(`select status::text s from game_participants where game_id=$1 and user_id=$2`, [gFar, U.C])).s === 'pending');
  n = await job('job_expire_applications'); T('再跑一次什么都不做', n === 0, n);

  // ---------- 开打时检查人数 ----------
  const gFull = await game("now()-interval '5 minutes'"); await join(gFull, U.A);
  const gShort = await game("now()-interval '5 minutes'");
  const gDone = await game("now()-interval '3 hours'"); await join(gDone, U.A);
  n = await job('job_start_checks'); T('开打的局都写了人数检查', n >= 3, n);
  T('人齐的记 full，没人申请的记 no_apply', (await one(`select reason from game_start_checks where game_id=$1`, [gFull])).reason === 'full' && (await one(`select reason from game_start_checks where game_id=$1`, [gShort])).reason === 'no_apply');
  T('没凑齐的给发起人发「没有凑齐」，并从发现页撤下', await nn(U.H, 'unfilled_end', gShort) === 1 && await nn(U.H, 'unfilled_end', gFull) === 0
    && (await one(`select unfilled_closed_at is not null c from games where id=$1`, [gShort])).c === true);
  T('结束了的局标为 completed', (await one(`select status::text s from games where id=$1`, [gDone])).s === 'completed');
  n = await job('job_start_checks'); T('再跑一次什么都不做', n === 0 && await nn(U.H, 'unfilled_end', gShort) === 1, n);

  // ---------- 开打前 30 分钟 ----------
  const g30 = await game("now()+interval '20 minutes'", { cap: 4 }); await join(g30, U.A); await join(g30, U.B, "now()-interval '2 minutes'");   // B 是开打前 30 分钟内才加入的
  const gAlone = await game("now()+interval '20 minutes'");
  const gLate = await game("now()+interval '20 minutes'", { created: "now()-interval '5 minutes'" }); await join(gLate, U.C, "now()-interval '4 minutes'");
  n = await job('job_soon_reminders'); T('发给已确认的人（含发起人），30 分钟内才加入的不发', n === 2 && await nn(U.H, 'soon', g30) === 1 && await nn(U.A, 'soon', g30) === 1 && await nn(U.B, 'soon', g30) === 0, n);
  T('只有 1 人的局、开打前 30 分钟内才发布的局不发', await nn(U.H, 'soon', gAlone) === 0 && await nn(U.C, 'soon', gLate) === 0);
  n = await job('job_soon_reminders'); T('再跑一次什么都不做', n === 0, n);
  await q(`update games set starts_at=now()+interval '25 minutes', time_set_at=clock_timestamp() where id=$1`, [g30]);
  n = await job('job_soon_reminders'); T('改时间后按新时间再提醒一次', n === 2 && await nn(U.A, 'soon', g30) === 2, n);

  // ---------- 还缺人 ----------
  const gU = await game("now()+interval '90 minutes'", { cap: 4 });
  const gU2 = await game("now()+interval '90 minutes'", { cap: 4, timeSet: "now()-interval '10 minutes'" });     // 开场前 2 小时内才定下时间
  const gU3 = await game("now()+interval '90 minutes'"); await join(gU3, U.A);                                   // 已人齐
  n = await job('job_unfilled_reminders'); T('开打前 2 小时还缺人 → 提醒发起人一次', n >= 1 && await nn(U.H, 'unfilled', gU) === 1, n);
  T('2 小时内才定下时间的、已人齐的不提醒', await nn(U.H, 'unfilled', gU2) === 0 && await nn(U.H, 'unfilled', gU3) === 0);
  n = await job('job_unfilled_reminders'); T('再跑一次什么都不做', n === 0, n);

  // ---------- 邀约失效 ----------
  const inv = async (sql) => (await one(`insert into invites(from_user,to_user,starts_at,ends_at,venue_id,game_type,created_at,expires_at${sql.cols || ''}) values ($1,$2,${sql.start},${sql.start}+interval '1 hour',$3,'singles',${sql.created},${sql.exp}${sql.vals || ''}) returning id`, [U.A, U.B, V])).id;
  const i1 = await inv({ start: "now()+interval '1 day'", created: "now()-interval '49 hours'", exp: "now()-interval '1 hour'" });
  const i2 = (await one(`insert into invites(from_user,to_user,starts_at,ends_at,venue_id,game_type,created_at,expires_at) values ($1,$2,now()+interval '1 day',now()+interval '1 day 1 hour',$3,'singles',now()-interval '2 hours',now()+interval '46 hours') returning id`, [U.C, U.B, V])).id;
  await q(`update invites set status='counter', counter_starts_at=now()-interval '10 minutes', counter_ends_at=now()+interval '50 minutes', countered_at=now()-interval '1 hour' where id=$1`, [i2]);
  await q(`delete from invites where id <> all($1)`, [[i1, i2]]);
  const i3 = (await one(`insert into invites(from_user,to_user,starts_at,ends_at,venue_id,game_type) values ($1,$2,now()+interval '1 day',now()+interval '1 day 1 hour',$3,'singles') returning id`, [U.C, U.D1, V])).id;
  n = await job('job_expire_invites'); T('48 小时没回复、换的时间已过 → 失效（2 条）', n === 2, n);
  T('通知等待回复的一方：没回复 → 发起人；换了时间等确认 → 接收人', +(await one(`select count(*) from notifications where user_id=$1 and kind='invite_expired' and invite_id=$2`, [U.A, i1])).count === 1
    && +(await one(`select count(*) from notifications where user_id=$1 and kind='invite_expired' and invite_id=$2`, [U.B, i2])).count === 1 && +(await one(`select count(*) from notifications where user_id=$1 and kind='invite_expired' and invite_id=$2`, [U.C, i2])).count === 0);
  T('没到期的不动', (await one(`select status::text s from invites where id=$1`, [i3])).s === 'pending');
  n = await job('job_expire_invites'); T('再跑一次什么都不做', n === 0, n);

  // ---------- 赛后提醒 ----------
  const gR = await game(`'${await mel(-1, '21:00')}'::timestamptz`); await join(gR, U.A, `'${await mel(-1, '12:00')}'::timestamptz`);
  const gR3 = await game("now()-interval '3 days'"); await join(gR3, U.A, "now()-interval '4 days'");
  n = await job('job_recap_notices', await mel(-1, '23:30')); T('22:00–08:00 不发', n === 0, n);
  n = await job('job_recap_notices', await mel(0, '08:05')); T('到 8 点发：这局的发起人和参加的人各一条', n >= 2 && +(await one(`select count(*) from notifications where kind='recap' and game_id=$1`, [gR])).count === 2 && await nn(U.A, 'recap', gR) === 1 && await nn(U.H, 'recap', gR) === 1, n);
  T('应发时间超过 24 小时的不再发', await nn(U.A, 'recap', gR3) === 0);
  n = await job('job_recap_notices', await mel(0, '08:15')); T('再跑一次不重复发（只看这一局；其他测试局随当前时刻可能刚到点）', +(await one(`select count(*) from notifications where kind='recap' and game_id=$1`, [gR])).count === 2, n);

  // ---------- 暂停到期 ----------
  await q(`update users set status='suspended', status_since=now()-interval '7 days', status_until=now()-interval '1 minute', status_reason='no_show' where id=$1`, [U.S1]);
  await q(`update users set status='suspended', status_since=now()-interval '1 day', status_until=now()+interval '6 days', status_reason='no_show' where id=$1`, [U.S2]);
  n = await job('job_restore_suspended'); T('到期的恢复正常（1 位）', n === 1 && (await one(`select status from users where id=$1`, [U.S1])).status === 'active', n);
  T('写了状态记录（到期自动恢复）、通知本人；没到期的不动', +(await one(`select count(*) from user_status_log where user_id=$1 and reason_code='auto_restore'`, [U.S1])).count === 1
    && await nn(U.S1, 'account_status') === 1 && (await one(`select status from users where id=$1`, [U.S2])).status === 'suspended');
  n = await job('job_restore_suspended'); T('再跑一次什么都不做', n === 0, n);

  // ---------- 注销满 30 天匿名化 + 每晚 ----------
  await q(`update users set status='deleted', status_since=now()-interval '31 days', status_reason='self_delete' where id=$1`, [U.D1]);
  await q(`update users set status='deleted', status_since=now()-interval '10 days', status_reason='self_delete' where id=$1`, [U.D2]);
  await q(`insert into events(occurred_at,user_id,anon_id,session_id,build,event) values (now()-interval '2 days',$1,'a','s','pwa','page_view')`, [U.A]);   // 2 天前：汇总从各城市里最早的当地日期往前 3 天，1 天前在墨尔本午夜到珀斯午夜之间会落在窗口外（E2 修）
  n = await job('job_nightly'); T('每晚任务：汇总最近 3 天', typeof n === 'number' && n >= 1, n);
  const d1 = await one(`select phone_e164, nickname, wechat_id, email, anonymized_at is not null a from users where id=$1`, [U.D1]);
  T('注销满 30 天：手机号、昵称、微信、邮箱都去掉', d1.a && d1.phone_e164.startsWith('deleted:') && d1.nickname === '已注销' && d1.wechat_id === null && d1.email === null, d1);
  T('注销不满 30 天的不动（还能恢复）', (await one(`select anonymized_at from users where id=$1`, [U.D2])).anonymized_at === null);
  n = await job('job_anonymize_deleted'); T('再跑一次什么都不做', n === 0, n);

  // ---------- 记录与权限 ----------
  const runs = (await q(`select job, count(*)::int n, bool_and(ok) ok from job_runs group by 1 order by 1`)).rows;
  T('每个任务每次运行都记了 job_runs', runs.length === 10 && runs.every(r => r.ok), runs);
  { const cl = await pool.connect(); try { await cl.query('begin'); await cl.query('set local role nbq_user'); await cl.query('select job_restore_suspended()'); T('前台球友不能调用定时任务', false) }
    catch (e) { T('前台球友不能调用定时任务', /permission denied/.test(e.message), e.message) } finally { await cl.query('rollback').catch(() => { }); cl.release() } }
  // ---------- 顺延规则（4g 顺带补上）----------
  const callU = async (uid, sql, p) => { const cl = await pool.connect(); try { await cl.query('begin'); await cl.query('set local role nbq_user'); await cl.query(`select set_config('nbq.uid',$1,true)`, [uid]); const r = await cl.query(sql, p); await cl.query('commit'); return { ok: true, r } } catch (e) { await cl.query('rollback').catch(() => { }); return { ok: false, err: e.message } } finally { cl.release() } };
  const gP = await game(`'${await mel(1, '18:00')}'::timestamptz`);
  let r = await callU(U.H, `select api_game_postpone($1)`, [gP]); T('顺延 1 小时', r.ok, r);
  r = await callU(U.H, `select api_game_postpone($1)`, [gP]); T('只能顺延一次 → postpone_once', !r.ok && r.err === 'postpone_once', r);
  const gP2 = await game(`'${await mel(1, '21:30')}'::timestamptz`);
  r = await callU(U.H, `select api_game_postpone($1)`, [gP2]); T('顺延后超过 23:00 结束 → postpone_too_late', !r.ok && r.err === 'postpone_too_late', r);
} catch (e) { T('运行', false, e.stack || String(e)) }
finally { if (pool) await pool.end().catch(() => { }); c.stop() }
console.log(`${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
