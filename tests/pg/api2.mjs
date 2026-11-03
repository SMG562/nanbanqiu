// 第四批 4f-3：后端接口的数据库函数（打完之后 / 聊天 / 屏蔽 / 通知 / 账号）按 tests/spec/api_spec.md 逐条测，以前台球友身份调用。
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
      const r = await cl.query(sql, params); await cl.query('commit'); return { ok: true, v: r.rows[0] && Object.values(r.rows[0])[0] } }
    catch (e) { await cl.query('rollback').catch(() => { }); seen.add(e.message); return { ok: false, err: e.message, detail: e.detail } } finally { cl.release() } };
  const is = (r, code) => !r.ok && r.err === code;
  const one = async (s, p) => (await q(s, p)).rows[0];
  const nn = async (uid, kind, game) => +(await one(`select count(*) from notifications where user_id=$1 and kind=$2 and ($3::uuid is null or game_id=$3)`, [uid, kind, game || null])).count;
  const id = n => '00000000-0000-0000-0000-0000000000' + String(n).padStart(2, '0');
  const U = { H: 1, A: 2, B: 3, C: 4, X: 5, S: 6, D: 7 }; for (const k in U) U[k] = id(U[k]);
  await q(`insert into suburbs(name,postcode,centroid) values ('Brighton','3186','POINT(145 -37.9)')`);
  for (const k in U) await q(`insert into users(id,phone_e164,nickname,utr,gender,pact_accepted_at) values ($1,$2,$3,5,'m',now())`, [U[k], '+614000000' + U[k].slice(-2), k]);
  await q(`update users set status='suspended', status_since=now(), status_until=now()+interval '7 days', status_reason='no_show' where id=$1`, [U.S]);
  await q(`insert into blocks(blocker_id,blocked_id) values ($1,$2)`, [U.H, U.C]);
  const V = id(90); await q(`insert into venues(id,name,short_name,suburb,postcode,location,surfaces,status) values ($1,'Brighton TC','Brighton TC','Brighton','3186','POINT(145 -37.9)','{hard}','active')`, [V]);
  const game = async (code, host, start, players, cap = 4) => { const g = (await one(`insert into games(share_code,host_id,venue_id,starts_at,duration_min,game_type,capacity,utr_min,utr_max) values ($1,$2,$3,${start},90,'doubles',$4,3,7) returning id`, [code, host, V, cap])).id;
    for (const [u, st] of players) await q(`insert into game_participants(game_id,user_id,status,approved_at,created_at) values ($1,$2,$3,${st === 'approved' ? 'now()' : 'null'},now()-interval '20 days')`, [g, u, st]); return g };
  const GC = await game('gc', U.H, "now()-interval '5 hours'", [[U.A, 'approved'], [U.B, 'approved']]);        // 3 小时前结束
  const GV = await game('gv', U.H, "now()-interval '3 days'", [[U.A, 'approved'], [U.B, 'approved']]);         // 3 天前
  const GO = await game('go', U.H, "now()-interval '8 days'", [[U.A, 'approved'], [U.B, 'approved']]);         // 8 天前
  const GF = await game('gf', U.A, "now()+interval '2 days'", [[U.B, 'approved'], [U.C, 'pending']]);          // A 发起、还没开打
  const GH = await game('gh', U.H, "now()+interval '3 days'", [[U.B, 'approved']]);
  let r;

  // ---------- 赛后卡片 ----------
  r = await call(U.X, `select api_recap($1,'{"feel":"ok"}')`, [GC]); T('没参加这局 → not_in_game', is(r, 'not_in_game'), r);
  r = await call(U.B, `select api_recap($1,'{"feel":"ok"}')`, [GF]); T('还没打完 → not_in_game', is(r, 'not_in_game'), r);
  r = await call(U.A, `select api_recap($1,'{"feel":"ok"}')`, [GO]); T('结束超过 7 天 → recap_closed', is(r, 'recap_closed'), r);
  r = await call(U.A, `select api_recap($1,$2)`, [GC, JSON.stringify({ feel: 'hard', prefs: { [U.B]: 'less', [U.H]: 'more' }, impressions: { [U.H]: ['ontime', 'kind'] }, done: true })]);
  T('填写赛后卡片', r.ok, r);
  T('感受、多遇到 / 少遇到、印象都写进去，少遇到同时开始静音私信', (await one(`select feel, closed_at is not null c from game_feel where game_id=$1 and user_id=$2`, [GC, U.A])).feel === 'hard'
    && +(await one(`select count(*) from player_prefs where user_id=$1`, [U.A])).count === 2 && +(await one(`select count(*) from player_pref_mutes where user_id=$1 and target_id=$2 and muted_until is null`, [U.A, U.B])).count === 1
    && +(await one(`select count(*) from impressions where from_id=$1 and to_id=$2`, [U.A, U.H])).count === 1);
  T('对方不收到任何通知', +(await one(`select count(*) from notifications where user_id in ($1,$2)`, [U.B, U.H])).count === 0);
  r = await call(U.A, `select api_recap($1,$2)`, [GC, JSON.stringify({ prefs: { [U.B]: 'ok' }, impressions: { [U.H]: [] } })]);
  T('改为随缘、撤回印象', r.ok && +(await one(`select count(*) from player_prefs where user_id=$1 and target_id=$2`, [U.A, U.B])).count === 0
    && +(await one(`select count(*) from player_pref_mutes where user_id=$1 and target_id=$2 and muted_until is null`, [U.A, U.B])).count === 0
    && +(await one(`select count(*) from impressions where from_id=$1 and to_id=$2`, [U.A, U.H])).count === 0, r);
  r = await call(U.A, `select api_recap($1,$2)`, [GC, JSON.stringify({ prefs: { [U.A]: 'more' } })]); T('不能给自己设 → invalid', is(r, 'invalid'), r);
  r = await call(U.A, `select api_recap($1,$2)`, [GC, JSON.stringify({ prefs: { [U.X]: 'more' } })]); T('不在这局的人 → invalid', is(r, 'invalid'), r);
  r = await call(U.A, `select api_recap($1,'{"feel":"great"}')`, [GC]); T('感受取值不对 → invalid', is(r, 'invalid'), r);
  r = await call(U.A, `select api_pref_set($1,'more')`, [U.X]); T('球员卡上设多遇到（没一起打过也可以）', r.ok, r);
  r = await call(U.A, `select api_pref_set($1,'more')`, [U.A]); T('不能给自己设 → invalid', is(r, 'invalid'), r);
  r = await call(U.A, `select api_kudos($1)`, [GC]); T('一键给同局球友点赞（2 位）', r.ok && r.v === 2, r);
  r = await call(U.A, `select api_kudos($1)`, [GC]); T('每场每人只点一次', r.ok && r.v === 0, r);
  r = await call(U.A, `select api_kudos($1,$2)`, [GC, U.X]); T('给不在这局的人点赞 → not_in_game', is(r, 'not_in_game'), r);

  // ---------- 爽约 ----------
  r = await call(U.A, `select api_noshow_report($1,$2)`, [GC, U.B]); T('一位球友反馈（3 人局，未确认）', r.ok && r.v === false && await nn(U.B, 'noshow') === 0, r);
  r = await call(U.H, `select api_noshow_report($1,$2)`, [GC, U.B]); T('发起人也反馈 → 确认，被反馈的人收到通知', r.ok && r.v === true && await nn(U.B, 'noshow') === 1, r);
  r = await call(U.A, `select api_noshow_report($1,$2)`, [GC, U.B]); T('重复反馈不重复通知', r.ok && await nn(U.B, 'noshow') === 1, r);
  r = await call(U.A, `select api_noshow_undo($1,$2)`, [GC, U.B]); T('撤回自己的反馈', r.ok, r);
  r = await call(U.A, `select api_noshow_undo($1,$2)`, [GC, U.B]); T('重复撤回 → state_changed', is(r, 'state_changed'), r);
  r = await call(U.A, `select api_noshow_report($1,$2)`, [GV, U.B]); T('结束超过 48 小时 → noshow_window_closed', is(r, 'noshow_window_closed'), r);
  r = await call(U.A, `select api_noshow_report($1,$2)`, [GC, U.X]); T('反馈不在这局的人 → not_in_game', is(r, 'not_in_game'), r);
  r = await call(U.A, `select api_noshow_appeal($1,'came')`, [GC]); T('没被确认爽约不能申诉 → forbidden', is(r, 'forbidden'), r);
  r = await call(U.B, `select api_noshow_appeal($1,'sorry')`, [GC]); T('申诉理由不对 → invalid', is(r, 'invalid'), r);
  r = await call(U.B, `select api_noshow_appeal($1,'came','我到了，在 3 号场')`, [GC]); T('被确认爽约的人可以申诉', r.ok, r);
  T('申诉期间不计入爽约', +(await one(`select count(*) from v_confirmed_noshow where game_id=$1 and user_id=$2`, [GC, U.B])).count === 0);
  r = await call(U.B, `select api_noshow_appeal($1,'came')`, [GC]); T('重复申诉 → forbidden 或 state_changed', is(r, 'forbidden') || is(r, 'state_changed'), r);
  r = await call(U.A, `select api_attendance($1,$2,'came')`, [GC, U.B]); T('不是发起人不能标到场 → not_host', is(r, 'not_host'), r);
  r = await call(U.H, `select api_attendance($1,$2,'no_show')`, [GC, U.A]); T('发起人标记没来 → 本人收到通知', r.ok && await nn(U.A, 'noshow', GC) === 1, r);

  // ---------- 聊天 ----------
  r = await call(U.A, `select api_thread_dm($1)`, [U.B]); const dm = r.v; T('打开私信', r.ok, r);
  r = await call(U.B, `select api_thread_dm($1)`, [U.A]); T('对方打开是同一个对话', r.ok && r.v === dm, r);
  r = await call(U.C, `select api_thread_dm($1)`, [U.H]); T('屏蔽了我的人 → blocked', is(r, 'blocked'), r);
  r = await call(U.A, `select api_message_send($1,'周六见')`, [dm]); T('发消息', r.ok, r);
  r = await call(U.A, `select api_message_send($1,'加我 www.example.com')`, [dm]); T('发链接 → message_link', is(r, 'message_link'), r);
  r = await call(U.A, `select api_message_send($1,'看这里 https://x.cn/a')`, [dm]); T('发 https 链接 → message_link', is(r, 'message_link'), r);
  r = await call(U.A, `select api_message_send($1,'3.5 水平，6.30 见')`, [dm]); T('数字里的小数点不算链接', r.ok, r);
  r = await call(U.A, `select api_message_send($1,'   ')`, [dm]); T('空消息 → invalid', is(r, 'invalid'), r);
  r = await call(U.A, `select api_message_send($1,$2)`, [dm, '字'.repeat(201)]); T('超过 200 字 → invalid', is(r, 'invalid'), r);
  r = await call(U.X, `select api_message_send($1,'hi')`, [dm]); T('不在对话里 → forbidden', is(r, 'forbidden'), r);
  r = await call(U.S, `select api_thread_dm($1)`, [U.A]); const dmS = r.v; r = await call(U.S, `select api_message_send($1,'hi')`, [dmS]); T('暂停中不能发消息 → account_suspended', is(r, 'account_suspended'), r);
  r = await call(U.B, `select api_thread_game($1)`, [GC]); const tg = r.v; T('同局的人打开球局群聊', r.ok, r);
  r = await call(U.B, `select api_message_send($1,'今天打得开心')`, [tg]); T('开打 48 小时内可以在群聊里发', r.ok, r);
  r = await call(U.X, `select api_thread_game($1)`, [GC]); T('不在这局 → forbidden', is(r, 'forbidden'), r);
  r = await call(U.B, `select api_thread_game($1)`, [GV]); const tgOld = r.v; r = await call(U.B, `select api_message_send($1,'hi')`, [tgOld]); T('开打 48 小时后群聊关闭 → chat_closed', is(r, 'chat_closed'), r);

  // ---------- 新消息通知（11-04）：收到私信 / 群聊消息 → chat 通知（带 thread_id，不带 game_id），发送程序推到手机 ----------
  const nc = async (uid, th) => +(await one(`select count(*) from notifications where user_id=$1 and kind='chat' and thread_id=$2`, [uid, th])).count;
  T('私信：对方收到 chat 通知，且 5 分钟内同一会话（上一条还没读）只通知一次（前面发了 2 条）', await nc(U.B, dm) === 1, await nc(U.B, dm));
  const cn = await one(`select actor_id, game_id, pushed_at from notifications where user_id=$1 and kind='chat' and thread_id=$2`, [U.B, dm]);
  T('私信通知：actor = 发送人、不带 game_id、等待发送程序推送', cn.actor_id === U.A && cn.game_id === null && cn.pushed_at === null, cn);
  T('发送人自己不收通知', await nc(U.A, dm) === 0);
  r = await call(U.B, `select api_chat_notif_read($1)`, [dm]); T('打开会话 → 这个会话的 chat 通知标已读', r.ok && (await one(`select read_at from notifications where user_id=$1 and kind='chat' and thread_id=$2`, [U.B, dm])).read_at !== null, r);
  r = await call(U.A, `select api_message_send($1,'到了')`, [dm]); T('已读之后再来新消息 → 再通知一次（不被 5 分钟挡住）', r.ok && await nc(U.B, dm) === 2, await nc(U.B, dm));
  r = await call(U.A, `select api_chat_notif_read($1)`, [dm]); T('别人的会话通知不受影响（只标自己的）', r.ok && await nc(U.B, dm) === 2 && (await one(`select count(*)::int n from notifications where user_id=$1 and kind='chat' and thread_id=$2 and read_at is null`, [U.B, dm])).n === 1);
  T('球局群聊：同局其他已加入的人都收到通知，发送人没有', await nc(U.A, tg) === 1 && await nc(U.H, tg) === 1 && await nc(U.B, tg) === 0, [await nc(U.A, tg), await nc(U.H, tg), await nc(U.B, tg)]);
  T('球局群聊通知不带 game_id（开打后聊天还能继续，带了会被当成「已开打」不推）', +(await one(`select count(*) from notifications where kind='chat' and thread_id=$1 and game_id is not null`, [tg])).count === 0);
  // 屏蔽 / 少遇到：直接用通知函数验证（线程直接建，避开「能不能私信」的门槛）
  const mkdm = async (a, b) => (await one(`insert into threads(kind, user_a, user_b) values ('dm', least($1::uuid,$2::uuid), greatest($1::uuid,$2::uuid)) on conflict do nothing returning id`, [a, b]) || await one(`select id from threads where kind='dm' and user_a=least($1::uuid,$2::uuid) and user_b=greatest($1::uuid,$2::uuid)`, [a, b])).id;
  const tXC = await mkdm(U.X, U.C);
  await q(`insert into player_prefs(user_id, target_id, pref) values ($1,$2,'less') on conflict (user_id, target_id) do update set pref='less'`, [U.C, U.X]);
  await q(`select nbq_chat_notify($1,$2)`, [tXC, U.X]); T('对方把我设成「少遇到」（没有同局）→ 不通知', await nc(U.C, tXC) === 0, await nc(U.C, tXC));
  await q(`delete from player_prefs where user_id=$1 and target_id=$2`, [U.C, U.X]);
  await q(`insert into blocks(blocker_id, blocked_id) values ($1,$2) on conflict do nothing`, [U.C, U.X]);
  await q(`select nbq_chat_notify($1,$2)`, [tXC, U.X]); T('有屏蔽关系 → 不通知', await nc(U.C, tXC) === 0, await nc(U.C, tXC));
  await q(`delete from blocks where blocker_id=$1 and blocked_id=$2`, [U.C, U.X]);
  await q(`select nbq_chat_notify($1,$2)`, [tXC, U.X]); T('没有屏蔽 / 少遇到 → 通知', await nc(U.C, tXC) === 1, await nc(U.C, tXC));

  // ---------- 屏蔽 ----------
  r = await call(U.A, `select api_block($1)`, [U.C]); T('屏蔽', r.ok, r);
  T('对方在我球局里待确认的申请自动婉拒（blocked），对方不收到通知', (await one(`select status::text s, decline_reason d from game_participants where game_id=$1 and user_id=$2`, [GF, U.C])).d === 'blocked' && await nn(U.C, 'rejected') === 0);
  r = await call(U.A, `select api_block($1)`, [U.A]); T('不能屏蔽自己 → invalid', is(r, 'invalid'), r);
  r = await call(U.A, `select api_unblock($1)`, [U.C]); T('解除屏蔽', r.ok && +(await one(`select count(*) from blocks where blocker_id=$1`, [U.A])).count === 0, r);

  // ---------- 通知 ----------
  r = await call(U.X, `select api_apply($1)`, [GH]); T('X 申请 H 的局（产生一条待处理的申请通知）', r.ok, r);
  r = await call(U.H, `select api_notif_read()`); T('全部标为已读', r.ok, r);
  T('待处理的申请通知保持未读，其余已读', (await one(`select count(*) filter (where read_at is null and kind='request') a, count(*) filter (where read_at is null and kind<>'request') b from notifications where user_id=$1`, [U.H])).a === '1'
    && (await one(`select count(*) filter (where read_at is null and kind<>'request') b from notifications where user_id=$1`, [U.H])).b === '0');
  r = await call(U.H, `select api_decline($1,$2,'pass')`, [GH, U.X]); r = await call(U.H, `select api_notif_read()`); T('处理完之后这条也能标为已读', r.ok && r.v === 1, r);

  // ---------- 账号 ----------
  await q(`insert into game_participants(game_id,user_id,created_at) values ($1,$2,now())`, [GF, U.D]);              // D 在 A 的局里待确认
  const GD = await game('gd', U.D, "now()+interval '2 days'", [[U.X, 'approved']]);                                // D 发起的局，X 已加入
  await q(`insert into game_participants(game_id,user_id,status,approved_at) values ($1,$2,'approved',now())`, [GH, U.D]);   // D 已加入 H 的局
  await q(`insert into invites(from_user,to_user,starts_at,ends_at,venue_id,game_type) values ($1,$2,now()+interval '1 day',now()+interval '1 day 1 hour',$3,'singles')`, [U.D, U.A, V]);
  r = await call(U.D, `select api_account_delete()`); T('注销：返回退出 1 场、取消 1 场', r.ok && r.v.upcoming_left === 1 && r.v.hosted_cancelled === 1, r);
  T('注销的连带处理：待确认撤回、已加入的退出并通知发起人、发起的取消并通知、邀约撤回、状态记录', (await one(`select status::text s from game_participants where game_id=$1 and user_id=$2`, [GF, U.D])).s === 'withdrawn'
    && await nn(U.H, 'player_left', GH) === 1 && (await one(`select status::text s from games where id=$1`, [GD])).s === 'cancelled' && await nn(U.X, 'game_cancelled', GD) === 1
    && (await one(`select status::text s from invites where from_user=$1`, [U.D])).s === 'withdrawn' && (await one(`select status, status_reason from users where id=$1`, [U.D])).status === 'deleted'
    && +(await one(`select count(*) from user_status_log where user_id=$1 and to_status='deleted'`, [U.D])).count === 1);
  r = await call(U.D, `select api_apply($1)`, [GH]); T('注销后不能操作 → account_deleted', is(r, 'account_deleted'), r);
  r = await call(U.D, `select api_account_restore()`); T('30 天内恢复', r.ok && (await one(`select status from users where id=$1`, [U.D])).status === 'active', r);
  T('之前退出的球局不自动恢复', (await one(`select status::text s from game_participants where game_id=$1 and user_id=$2`, [GH, U.D])).s === 'left');
  r = await call(U.D, `select api_account_restore()`); T('没注销时恢复 → state_changed', is(r, 'state_changed'), r);
  await call(U.D, `select api_account_delete()`); await q(`update users set status_since=now()-interval '31 days' where id=$1`, [U.D]);
  r = await call(U.D, `select api_account_restore()`); T('超过 30 天 → restore_expired', is(r, 'restore_expired'), r);

  const unknown = [...seen].filter(e => !CODES.has(e));
  T(`测试中出现的错误码都在 api_spec.md 里（${seen.size} 个）`, !unknown.length, unknown);
} catch (e) { T('运行', false, e.stack || String(e)) }
finally { if (pool) await pool.end().catch(() => { }); c.stop() }
console.log(`${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
