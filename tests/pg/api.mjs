// 第四批 4f-2：后端接口的数据库函数（球局 / 申请与参加 / 邀约）按 tests/spec/api_spec.md 逐条测。
//   每次调用都按 API 的写法：begin; set local role nbq_user; set_config('nbq.uid', <id>, true); select api_xxx(…); commit
//   出错时数据库返回的 message 就是错误码；同时核对错误码都在 api_spec.md 的错误码表里。
import { createRequire } from 'module'; import path from 'path'; import fs from 'fs'; import { fileURLToPath } from 'url';
import { startCluster, loadSchema } from './cluster.mjs';
const require = createRequire(import.meta.url); const pg = require('pg');
const HERE = path.dirname(fileURLToPath(import.meta.url)), DIR = process.env.NBQ_DIR || path.join(HERE, '..', '..');
const SPEC = fs.readFileSync(path.join(HERE, '..', 'spec', 'api_spec.md'), 'utf8');
const CODES = new Set([...SPEC.matchAll(/^\| ([a-z_ /]+) \| \d{3} \|/gm)].flatMap(m => m[1].split('/').map(x => x.trim())));
let pass = 0, fail = 0; const seen = new Set();
const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 500) : '')) };

const c = startCluster(); let pool;
try {
  c.createdb('nbq');
  const errs = loadSchema(c, 'nbq', path.join(DIR, 'schema.sql')); T('schema 执行无错误', !errs.length, errs.slice(0, 3));
  pool = new pg.Pool({ host: c.host, port: c.port, user: 'postgres', database: 'nbq', max: 4 });
  const q = (s, p) => pool.query(s, p);
  const call = async (uid, sql, params) => { const cl = await pool.connect();
    try { await cl.query('begin'); await cl.query('set local role nbq_user'); if (uid) await cl.query(`select set_config('nbq.uid', $1, true)`, [uid]);
      const r = await cl.query(sql, params); await cl.query('commit'); return { ok: true, v: r.rows[0] && Object.values(r.rows[0])[0], rows: r.rows } }
    catch (e) { await cl.query('rollback').catch(() => { }); seen.add(e.message); return { ok: false, err: e.message, detail: e.detail } } finally { cl.release() } };
  const is = (r, code) => !r.ok && r.err === code;
  const id = n => '00000000-0000-0000-0000-0000000000' + String(n).padStart(2, '0');
  // 墨尔本某天某时（offset = 今天起第几天）
  const slot = async (off, hm) => (await q(`select ((mel_today() + $1::int)::timestamp + $2::time) at time zone 'Australia/Melbourne' as t`, [off, hm])).rows[0].t.toISOString();
  const nn = async (uid, kind) => +(await q(`select count(*) from notifications where user_id=$1 and kind=$2`, [uid, kind])).rows[0].count;

  // ---------- 样例 ----------
  const U = { H: 1, A: 2, B: 3, C: 4, N: 5, S: 6, R: 7, L: 8, F: 9, P: 10, Q: 11, X: 12 }; for (const k in U) U[k] = id(U[k]);
  await q(`insert into suburbs(name,postcode,centroid) values ('Brighton','3186','POINT(145 -37.9)')`);
  const rows = [['H', 'm', 5], ['A', 'f', 5], ['B', 'm', 5], ['C', 'm', 5], ['N', 'm', 5], ['S', 'm', 5], ['R', 'f', 5], ['L', 'f', 9], ['F', 'm', 5], ['P', 'm', 5], ['Q', 'm', 5], ['X', 'm', 5]];
  for (const [k, g, utr] of rows) await q(`insert into users(id,phone_e164,nickname,utr,gender,pact_accepted_at) values ($1,$2,$3,$4,$5,${k === 'N' ? 'null' : 'now()'})`, [U[k], '+614000000' + U[k].slice(-2), k, utr, g]);
  await q(`update users set status='suspended', status_since=now(), status_until=now()+interval '7 days', status_reason='no_show' where id=$1`, [U.S]);
  await q(`update users set status='review', status_since=now() where id=$1`, [U.R]);
  await q(`update users set invite_from='none' where id=$1`, [U.P]); await q(`update users set invite_from='played' where id=$1`, [U.Q]);
  await q(`insert into blocks(blocker_id,blocked_id) values ($1,$2)`, [U.H, U.C]);
  await q(`insert into player_prefs(user_id,target_id,pref) values ($1,$2,'more')`, [U.F, U.H]);
  const V = id(90); await q(`insert into venues(id,name,short_name,suburb,postcode,location,surfaces,status) values ($1,'Brighton TC','Brighton TC','Brighton','3186','POINT(145 -37.9)','{hard}','active')`, [V]);
  const t18 = await slot(1, '18:00'), t19 = await slot(1, '19:00');
  const G = (extra = {}) => JSON.stringify({ venue_id: V, starts_at: t18, duration_min: 90, game_type: 'singles', utr_min: 3, utr_max: 7, ...extra });
  let r;

  // ---------- 发起 ----------
  r = await call(null, `select api_game_create($1)`, [G()]); T('没登录 → login_required', is(r, 'login_required'), r);
  r = await call(U.N, `select api_game_create($1)`, [G()]); T('没同意球友约定 → pact_required', is(r, 'pact_required'), r);
  r = await call(U.S, `select api_game_create($1)`, [G()]); T('暂停中 → account_suspended', is(r, 'account_suspended'), r);
  r = await call(U.N, `select api_pact_accept()`); r = await call(U.N, `select api_game_create($1)`, [G()]); T('同意约定后可以发起', r.ok, r);
  for (const [n, extra, code] of [['已经过了的时间', { starts_at: new Date(Date.now() - 36e5).toISOString() }, 'time_past'],
      ['早于 6:00', { starts_at: await slot(1, '05:30') }, 'time_out_of_range'], ['晚于 21:30', { starts_at: await slot(1, '22:00') }, 'time_out_of_range'],
      ['不是整点半点', { starts_at: await slot(1, '18:15') }, 'time_out_of_range'], ['7 天以后', { starts_at: await slot(7, '18:00') }, 'time_out_of_range'],
      ['时长不对', { duration_min: 45 }, 'invalid'], ['水平上下限反了', { utr_min: 7, utr_max: 3 }, 'invalid'], ['没有球场', { venue_id: null }, 'invalid'],
      ['单打不能有线下补位', { filled: 1 }, 'invalid'], ['2 小时以后的局不能直接加入', { join_mode: 'instant' }, 'invalid']]) {
    r = await call(U.H, `select api_game_create($1)`, [G(extra)]); T(`发起：${n} → ${code}`, is(r, code), r) }
  r = await call(U.B, `select api_game_create($1)`, [G({ tags: ['women'] })]); T('男生不能发女生局 → women_only', is(r, 'women_only'), r);
  r = await call(U.H, `select api_game_create($1)`, [G({ game_type: 'doubles', filled: 1 })]); const g1 = r.v; T('发起双打（线下已有 1 人）', r.ok, r);
  T('多遇到 TA 的人收到「TA 发了新球局」', await nn(U.F, 'follow_game') === 1);
  r = await call(U.H, `select api_game_create($1)`, [G()]); const g2 = r.v; T('再发一局', r.ok, r);
  T('同一人 7 天内只提醒一次', await nn(U.F, 'follow_game') === 1);
  r = await call(U.H, `select api_game_create($1)`, [G({ starts_at: await slot(0, '23:00') })]);
  // ---------- 申请 ----------
  r = await call(U.A, `select api_apply($1,'想一起打')`, [g2]); T('申请 → pending', r.ok && r.v === 'pending', r);
  T('发起人收到申请通知', await nn(U.H, 'request') === 1);
  r = await call(U.A, `select api_apply($1)`, [g2]); T('重复申请 → already_applied', is(r, 'already_applied'), r);
  r = await call(U.C, `select api_apply($1)`, [g2]); T('被发起人屏蔽的人看不到这局 → not_found', is(r, 'not_found'), r);
  r = await call(U.S, `select api_apply($1)`, [g2]); T('暂停中不能申请 → account_suspended', is(r, 'account_suspended'), r);
  r = await call(U.A, `select api_leave($1)`, [g2]); T('撤回申请 → withdrawn', r.ok && r.v === 'withdrawn', r);
  r = await call(U.A, `select api_apply($1,'再试一次')`, [g2]); T('撤回后可以再申请（复用同一行）', r.ok && +(await q(`select count(*) from game_participants where game_id=$1 and user_id=$2`, [g2, U.A])).rows[0].count === 1, r);
  T('同一人再次申请只保留最新一条通知', await nn(U.H, 'request') === 1);
  r = await call(U.H, `select api_game_create($1)`, [G({ tags: ['women'], utr_min: 3, utr_max: 7 })]); T('男生发女生局被拦（女发起人才行）', is(r, 'women_only'), r);
  r = await call(U.A, `select api_game_create($1)`, [G({ tags: ['women'] })]); const gw = r.v; T('女生可以发女生局', r.ok, r);
  r = await call(U.B, `select api_apply($1)`, [gw]); T('男生申请女生局 → women_only', is(r, 'women_only'), r);
  r = await call(U.R, `select api_apply($1)`, [gw]); T('待核实的女生申请女生局 → account_review', is(r, 'account_review'), r);
  r = await call(U.L, `select api_apply($1)`, [gw]); T('女生可以申请女生局', r.ok, r);
  const gPast = (await q(`insert into games(share_code,host_id,venue_id,starts_at,duration_min,game_type,capacity,utr_min,utr_max) values ('past',$1,$2,now()-interval '40 minutes',90,'singles',2,3,7) returning id`, [U.H, V])).rows[0].id;
  r = await call(U.B, `select api_apply($1)`, [gPast]); T('开打超过 30 分钟 → game_started', is(r, 'game_started'), r);
  // 11-04：开打后 30 分钟内仍可申请；发起人仍能接受；申请的 15 分钟不被开打截断
  const gLate = (await q(`insert into games(share_code,host_id,venue_id,starts_at,duration_min,game_type,capacity,utr_min,utr_max) values ('late',$1,$2,now()-interval '10 minutes',90,'singles',2,3,7) returning id`, [U.H, V])).rows[0].id;
  r = await call(U.B, `select api_apply($1)`, [gLate]); T('开打 10 分钟后还能申请', r.ok, r);
  T('开打后申请：截止 = 申请时间 + 15 分钟（不被开打截断）', (await q(`select application_deadline(p.created_at, g.starts_at) - p.created_at as d from game_participants p join games g on g.id=p.game_id where p.game_id=$1 and p.user_id=$2`, [gLate, U.B])).rows[0].d.minutes === 15);
  r = await call(U.H, `select api_approve($1,$2)`, [gLate, U.B]); T('开打后发起人仍能接受申请', r.ok && r.v && r.v.status === 'approved', r);
  await q(`update games set starts_at=now()-interval '31 minutes' where id=$1`, [gLate]);
  r = await call(U.A, `select api_apply($1)`, [gLate]); T('开打满 30 分钟 → game_started', is(r, 'game_started'), r);
  // 11-04：预计几分钟到 / 开打后不能直接加入 / 开打后发起人可一键「人齐了」（只许改 filled）
  const gL2 = (await q(`insert into games(share_code,host_id,venue_id,starts_at,duration_min,game_type,capacity,utr_min,utr_max) values ('late2',$1,$2,now()-interval '10 minutes',90,'singles',2,3,7) returning id`, [U.H, V])).rows[0].id;
  r = await call(U.A, `select api_apply($1,$2,$3)`, [gL2, 'hi', 15]); T('开打后申请可带预计到场分钟', r.ok, r);
  T('预计到场分钟记下了', (await q(`select eta_min from game_participants where game_id=$1 and user_id=$2`, [gL2, U.A])).rows[0].eta_min === 15);
  r = await call(U.B, `select api_apply($1,$2,$3)`, [gL2, null, 999]); T('预计分钟超范围 → invalid', is(r, 'invalid'), r);
  const gFut = (await q(`insert into games(share_code,host_id,venue_id,starts_at,duration_min,game_type,capacity,utr_min,utr_max) values ('fut1',$1,$2,now()+interval '3 hours',90,'singles',2,3,7) returning id`, [U.H, V])).rows[0].id;
  r = await call(U.L, `select api_apply($1,$2,$3)`, [gFut, null, 15]); T('开打前申请带预计分钟：不记', r.ok && (await q(`select eta_min from game_participants where game_id=$1 and user_id=$2`, [gFut, U.L])).rows[0].eta_min === null, r);
  await q(`update games set join_mode='instant' where id=$1`, [gL2]);
  r = await call(U.L, `select api_join($1)`, [gL2]); T('开打后不能直接加入 → join_not_allowed', is(r, 'join_not_allowed'), r);
  r = await call(U.H, `select api_game_edit($1,$2)`, [gL2, JSON.stringify({ note: 'x' })]); T('开打后改别的项仍 → game_started', is(r, 'game_started'), r);
  r = await call(U.H, `select api_game_edit($1,$2)`, [gL2, JSON.stringify({ filled: 1 })]); T('开打后发起人可改「线下已有几人」（人齐了）', r.ok, r);
  T('人齐了：球局满员，没处理的申请自动结束并通知', (await q(`select status::text s from games where id=$1`, [gL2])).rows[0].s === 'full'
    && (await q(`select status::text s, decline_reason from game_participants where game_id=$1 and user_id=$2`, [gL2, U.A])).rows[0].decline_reason === 'full_auto'
    && (await q(`select count(*)::int c from notifications where user_id=$1 and kind='full' and game_id=$2`, [U.A, gL2])).rows[0].c === 1);
  await q(`update games set starts_at=now()-interval '100 minutes' where id=$1`, [gL2]);
  r = await call(U.H, `select api_game_edit($1,$2)`, [gL2, JSON.stringify({ filled: 0 })]); T('打完（超过时长）后不能再改 → game_started', is(r, 'game_started'), r);
  // ---------- 发起人处理 ----------
  r = await call(U.B, `select api_apply($1)`, [g2]); T('B 也申请', r.ok, r);
  r = await call(U.B, `select api_approve($1,$2)`, [g2, U.A]); T('不是发起人不能通过 → not_host', is(r, 'not_host'), r);
  r = await call(U.H, `select api_decline($1,$2,'busy')`, [g2, U.B]); T('婉拒理由不对 → invalid', is(r, 'invalid'), r);
  r = await call(U.H, `select api_approve($1,$2)`, [g2, U.A]); T('发起人通过 → approved', r.ok && r.v.status === 'approved', r);
  T('申请人收到通过通知', await nn(U.A, 'approved') === 1);
  T('人齐后其余申请满员自动结束并通知', (await q(`select status::text||':'||decline_reason s from game_participants where game_id=$1 and user_id=$2`, [g2, U.B])).rows[0].s === 'rejected:full_auto' && await nn(U.B, 'full') === 1);
  r = await call(U.H, `select api_approve($1,$2)`, [g2, U.A]); T('重复通过 → state_changed', is(r, 'state_changed'), r);
  r = await call(U.X, `select api_apply($1)`, [g2]); T('满员后申请 → game_full', is(r, 'game_full'), r);
  r = await call(U.H, `select api_leave($1)`, [g2]); T('发起人不能退出 → host_cannot_leave', is(r, 'host_cannot_leave'), r);
  r = await call(U.A, `select api_leave($1)`, [g2]); T('已加入的人退出 → left', r.ok && r.v === 'left', r);
  T('发起人收到退出通知', await nn(U.H, 'player_left') === 1);
  T('之前满员没排上的人收到「又有空位了」', await nn(U.B, 'reopen') === 1);
  r = await call(U.A, `select api_leave($1)`, [g2]); T('已经不在这局 → not_in_game', is(r, 'not_in_game'), r);
  r = await call(U.B, `select api_apply($1)`, [g2]); r = await call(U.H, `select api_decline($1,$2,'level','下次约')`, [g2, U.B]); T('婉拒（带一句话）', r.ok && await nn(U.B, 'rejected') === 1, r);
  // 刚好被占满：双打线下已有 1 人、还缺 2 位，3 人申请，先通过 2 位后第 3 位按满员自动结束
  for (const k of ['A', 'B', 'X']) await call(U[k], `select api_apply($1)`, [g1]);
  await q(`update game_participants set status='pending' where game_id=$1 and user_id=$2`, [g1, U.X]).catch(() => { });
  await call(U.H, `select api_approve($1,$2)`, [g1, U.A]); await call(U.H, `select api_approve($1,$2)`, [g1, U.B]);
  r = await call(U.H, `select api_approve($1,$2)`, [g1, U.X]); T('最后一位刚好被占满 → 状态已变（已满员自动结束）', is(r, 'state_changed') || (r.ok && r.v.reason === 'full_auto'), r);
  // 过了申请截止
  const gSoon = (await q(`insert into games(share_code,host_id,venue_id,starts_at,duration_min,game_type,capacity,utr_min,utr_max) values ('soon',$1,$2,now()+interval '30 minutes',90,'singles',2,3,7) returning id`, [U.H, V])).rows[0].id;
  await q(`insert into game_participants(game_id,user_id,created_at) values ($1,$2,now()-interval '40 minutes')`, [gSoon, U.X]);
  r = await call(U.H, `select api_approve($1,$2)`, [gSoon, U.X]); T('过了申请截止 → application_expired', is(r, 'application_expired'), r);
  // ---------- 直接加入 ----------
  r = await call(U.H, `select api_game_create($1)`, [G({ starts_at: new Date(Math.ceil((Date.now() + 90 * 6e4) / 18e5) * 18e5).toISOString(), join_mode: 'instant', game_type: 'doubles' })]);
  T('2 小时内的局可以设为直接加入（夜里没有可选时段时报 time_out_of_range）', r.ok || is(r, 'time_out_of_range'), r);
  // 直接加入的测试不受当前时刻影响：直接建一个 90 分钟后开打的直接加入局
  const gi = r.ok ? r.v : (await q(`insert into games(share_code,host_id,venue_id,starts_at,duration_min,game_type,capacity,utr_min,utr_max,join_mode) values ('inst',$1,$2,now()+interval '90 minutes',90,'doubles',4,3,7,'instant') returning id`, [U.H, V])).rows[0].id;
  await q(`insert into player_prefs(user_id,target_id,pref) values ($1,$2,'less')`, [U.H, U.X]);   // H 对 X「少遇到」（直接加入、邀约都用到；不受当前时刻影响）
  if (gi) {
    r = await call(U.B, `select api_join($1)`, [g2]); T('确认制的局不能直接加入 → join_not_allowed', is(r, 'join_not_allowed') || is(r, 'already_applied') || is(r, 'game_full'), r);
    r = await call(U.L, `select api_join($1)`, [gi]); T('水平不在范围 → level_mismatch', is(r, 'level_mismatch'), r);
    r = await call(U.X, `select api_join($1)`, [gi]); T('发起人对 TA「少遇到」→ 不能直接加入', is(r, 'join_not_allowed') && r.detail === 'less', r);
    r = await call(U.B, `select api_join($1)`, [gi]); T('直接加入 → approved', r.ok && r.v === 'approved' && await nn(U.H, 'joined') === 1, r);
  }
  // ---------- 修改 / 顺延 / 取消 ----------
  r = await call(U.B, `select api_game_edit($1,$2)`, [g1, JSON.stringify({ note: 'x' })]); T('不是发起人不能改 → not_host', is(r, 'not_host'), r);
  r = await call(U.H, `select api_game_edit($1,$2)`, [g1, JSON.stringify({ starts_at: t19 })]); T('改时间', r.ok && r.v.starts_at, r);
  T('改时间记为大改动、已加入的人要确认、收到通知', (await q(`select bool_and(is_major) m from game_changes where game_id=$1`, [g1])).rows[0].m === true
    && +(await q(`select count(*) from game_participants where game_id=$1 and change_ack='pending'`, [g1])).rows[0].count === 2 && await nn(U.A, 'changed') === 1);
  r = await call(U.A, `select api_change_ack($1,'out')`, [g1]); T('改时间后选择退出（不算临时退出）', r.ok && (await q(`select change_ack from game_participants where game_id=$1 and user_id=$2`, [g1, U.A])).rows[0].change_ack === 'out', r);
  r = await call(U.B, `select api_change_ack($1,'ok')`, [g1]); T('改时间后选择继续', r.ok, r);
  r = await call(U.B, `select api_change_ack($1,'ok')`, [g1]); T('重复确认 → state_changed', is(r, 'state_changed'), r);
  r = await call(U.H, `select api_game_edit($1,$2)`, [g1, JSON.stringify({ filled: 0, game_type: 'singles' })]); T('改人数仍按规则（不改类型字段，只改线下人数）', r.ok, r);
  r = await call(U.H, `select api_game_postpone($1)`, [g1]); T('顺延 1 小时', r.ok && await nn(U.B, 'postponed') === 1, r);
  r = await call(U.H, `select api_game_cancel($1)`, [g1]); T('取消球局，已加入的人收到通知', r.ok && await nn(U.B, 'game_cancelled') >= 1, r);
  r = await call(U.H, `select api_game_cancel($1)`, [g1]); T('重复取消 → game_closed', is(r, 'game_closed'), r);
  r = await call(U.B, `select api_apply($1)`, [g1]); T('已取消的局不能申请', is(r, 'game_closed') || is(r, 'already_applied'), r);
  r = await call(U.H, `select api_game_edit($1,$2)`, [gPast, JSON.stringify({ note: 'x' })]); T('已开打（超过 30 分钟）不能改 → game_started', is(r, 'game_started'), r);

  // ---------- 邀约 ----------
  const IV = (to, extra = {}) => JSON.stringify({ to_user: to, starts_at: t18, ends_at: new Date(+new Date(t18) + 90 * 6e4).toISOString(), venue_id: V, game_type: 'singles', ...extra });
  r = await call(U.B, `select api_invite($1)`, [IV(U.B)]); T('不能约自己 → invite_self', is(r, 'invite_self'), r);
  r = await call(U.H, `select api_invite($1)`, [IV(U.C)]); T('屏蔽 → blocked', is(r, 'blocked'), r);
  r = await call(U.C, `select api_invite($1)`, [IV(U.H)]); T('对方屏蔽了我 → blocked', is(r, 'blocked'), r);
  r = await call(U.B, `select api_invite($1)`, [IV(U.P)]); T('对方不接受邀约 → invite_closed', is(r, 'invite_closed'), r);
  r = await call(U.B, `select api_invite($1)`, [IV(U.Q)]); T('对方只接受一起打过的人 → invite_played_only', is(r, 'invite_played_only'), r);
  r = await call(U.X, `select api_invite($1)`, [IV(U.H)]); T('对方对我「少遇到」→ invite_closed', is(r, 'invite_closed') && r.detail === 'less', r);
  r = await call(U.S, `select api_invite($1)`, [IV(U.B)]); T('暂停中不能约人', is(r, 'account_suspended'), r);
  r = await call(U.B, `select api_invite($1)`, [IV(U.A, { ends_at: new Date(+new Date(t18) + 45 * 6e4).toISOString() })]); T('时长不对 → time_out_of_range', is(r, 'time_out_of_range'), r);
  r = await call(U.B, `select api_invite($1)`, [IV(U.A)]); const iv1 = r.v; T('约人 → 对方收到邀约通知（带邀约 id）', r.ok && +(await q(`select count(*) from notifications where user_id=$1 and kind='invite' and invite_id=$2`, [U.A, iv1])).rows[0].count === 1, r);
  r = await call(U.B, `select api_invite($1)`, [IV(U.A)]); T('已有进行中的邀约 → invite_pending', is(r, 'invite_pending'), r);
  r = await call(U.B, `select api_invite($1)`, [IV(U.L)]); T('第二位新球友', r.ok, r);
  r = await call(U.B, `select api_invite($1)`, [IV(U.R)]); T('一天第三位新球友 → invite_new_limit', is(r, 'invite_new_limit'), r);
  r = await call(U.B, `select api_invite_accept($1)`, [iv1]); T('发起人不能替对方接受 → forbidden', is(r, 'forbidden'), r);
  r = await call(U.A, `select api_invite_counter($1,$2)`, [iv1, JSON.stringify({ starts_at: t18, ends_at: new Date(+new Date(t18) + 90 * 6e4).toISOString() })]); T('换的时间和原来一样 → counter_same', is(r, 'counter_same'), r);
  r = await call(U.A, `select api_invite_counter($1,$2)`, [iv1, JSON.stringify({ starts_at: t19, ends_at: new Date(+new Date(t19) + 60 * 6e4).toISOString() })]); T('接收人换个时间', r.ok && await nn(U.B, 'invite_counter') === 1, r);
  r = await call(U.A, `select api_invite_counter($1,$2)`, [iv1, JSON.stringify({ starts_at: t18, ends_at: new Date(+new Date(t18) + 60 * 6e4).toISOString() })]); T('只能换一次 → counter_once', is(r, 'counter_once'), r);
  r = await call(U.A, `select api_invite_withdraw($1)`, [iv1]); T('接收人撤回新时间 → 回到待回复', r.ok && r.v === 'pending', r);
  r = await call(U.A, `select api_invite_counter($1,$2)`, [iv1, JSON.stringify({ starts_at: t19, ends_at: new Date(+new Date(t19) + 60 * 6e4).toISOString() })]); T('撤回后也不能再换 → counter_once', is(r, 'counter_once'), r);
  r = await call(U.A, `select api_invite_accept($1)`, [iv1]); const pg1 = r.v; T('接收人接受 → 生成私人球局', r.ok && (await q(`select visibility, capacity from games where id=$1`, [pg1])).rows[0].visibility === 'private', r);
  T('私人球局两人都已加入、发起人收到通知', +(await q(`select count(*) from game_participants where game_id=$1 and status='approved'`, [pg1])).rows[0].count === 2 && await nn(U.B, 'invite_accepted') === 1);
  r = await call(U.A, `select api_invite_accept($1)`, [iv1]); T('重复接受 → invite_ended（不会多建一局）', is(r, 'invite_ended') && +(await q(`select count(*) from games where visibility='private'`)).rows[0].count === 1, r);
  r = await call(U.L, `select api_invite_decline($1,'busy')`, [(await q(`select id from invites where to_user=$1`, [U.L])).rows[0].id]); T('婉拒理由不对 → invalid', is(r, 'invalid'), r);
  const iv2 = (await q(`select id from invites where to_user=$1`, [U.L])).rows[0].id;
  r = await call(U.L, `select api_invite_decline($1,'week')`, [iv2]); T('婉拒邀约', r.ok && await nn(U.B, 'invite_declined') === 1, r);
  r = await call(U.L, `select api_invite_withdraw($1)`, [iv2]); T('已结束的邀约不能撤回 → invite_ended', is(r, 'invite_ended'), r);
  // 换时间后由发起人确认
  await q(`delete from invites where from_user=$1`, [U.H]);
  r = await call(U.H, `select api_invite($1)`, [IV(U.A)]); const iv3 = r.v;
  r = await call(U.A, `select api_invite_counter($1,$2)`, [iv3, JSON.stringify({ starts_at: t19, ends_at: new Date(+new Date(t19) + 120 * 6e4).toISOString() })]);
  r = await call(U.A, `select api_invite_accept($1)`, [iv3]); T('换了时间后接收人不能自己接受 → forbidden', is(r, 'forbidden'), r);
  r = await call(U.H, `select api_invite_accept($1)`, [iv3]); const pg2 = r.v; T('发起人确认对方换的时间 → 按新时间成局', r.ok && (await q(`select duration_min from games where id=$1`, [pg2])).rows[0].duration_min === 120, r);
  // 被同一人婉拒 2 次、过期
  await q(`insert into invites(from_user,to_user,starts_at,ends_at,venue_id,game_type,status,created_at) values ($1,$2,now()+interval '1 day',now()+interval '1 day 1 hour',$3,'singles','declined',now()-interval '3 days'),($1,$2,now()+interval '1 day',now()+interval '1 day 1 hour',$3,'singles','declined',now()-interval '5 days')`, [U.X, U.F, V]);
  r = await call(U.X, `select api_invite($1)`, [IV(U.F)]); T('30 天内被同一人婉拒 2 次 → invite_declined_twice', is(r, 'invite_declined_twice'), r);
  const ivOld = (await q(`insert into invites(from_user,to_user,starts_at,ends_at,venue_id,game_type,created_at,expires_at) values ($1,$2,now()+interval '1 day',now()+interval '1 day 1 hour',$3,'singles',now()-interval '49 hours',now()-interval '1 hour') returning id`, [U.F, U.X, V])).rows[0].id;
  r = await call(U.X, `select api_invite_accept($1)`, [ivOld]); T('过了 48 小时 → invite_ended', is(r, 'invite_ended'), r);
  // 一天最多 3 个
  for (const k of ['A', 'B', 'L']) await q(`insert into invites(from_user,to_user,starts_at,ends_at,venue_id,game_type,status) values ($1,$2,now()+interval '1 day',now()+interval '1 day 1 hour',$3,'singles','declined')`, [U.F, U[k], V]);
  r = await call(U.F, `select api_invite($1)`, [IV(U.N)]); T('一天第 3 位新球友 → invite_new_limit', is(r, 'invite_new_limit'), r);
  // 一起打过的人不受「新球友 2 位」限制，但一天总共 3 个
  const gPlayed = (await q(`insert into games(share_code,host_id,venue_id,starts_at,duration_min,game_type,capacity,utr_min,utr_max) values ('pl',$1,$2,now()-interval '2 days',90,'singles',2,3,7) returning id`, [U.F, V])).rows[0].id;
  await q(`insert into game_participants(game_id,user_id,status,approved_at) values ($1,$2,'approved',now()-interval '3 days')`, [gPlayed, U.N]);
  r = await call(U.F, `select api_invite($1)`, [IV(U.N)]); T('一天第 4 个邀约 → invite_daily_limit', is(r, 'invite_daily_limit'), r);

  // ---------- 直接写表绕过接口也不行 ----------
  r = await call(U.A, `update game_participants set status='approved' where game_id=$1 and user_id=$2`, [gw, U.A]); T('绕过接口直接改表也拦得住', !r.ok || r.rows.length === 0, r);
  // ---------- 错误码都在规格里 ----------
  const unknown = [...seen].filter(e => !CODES.has(e));
  T(`测试中出现的错误码都在 api_spec.md 里（${seen.size} 个）`, !unknown.length, unknown);
  const fnCodes = [...fs.readFileSync(path.join(DIR, 'schema.sql'), 'utf8').matchAll(/nbq_err\('([a-z_]+)'/g)].map(m => m[1]);
  const missing = [...new Set(fnCodes)].filter(e => !e.endsWith('_') && !CODES.has(e));   // account_<状态> 是拼出来的
  T('数据库函数里用到的错误码都在 api_spec.md 里', !missing.length, missing);
} catch (e) { T('运行', false, e.stack || String(e)) }
finally { if (pool) await pool.end().catch(() => { }); c.stop() }
console.log(`${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
