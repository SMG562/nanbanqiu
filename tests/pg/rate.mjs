// 第五批 5a-1：频率限制（schema ⑭）。每条规则：上限内能做、超了报对的错误码和等待秒数、时间窗过了恢复、失败的操作不占次数、
// 同时点不会超；验证码按号码 / IP / 连错锁定；前台身份不能直接调计数函数、看不到计数表。
import { createRequire } from 'module'; import path from 'path'; import fs from 'fs'; import { fileURLToPath } from 'url';
import { startCluster, loadSchema } from './cluster.mjs';
const require = createRequire(import.meta.url); const pg = require('pg');
const HERE = path.dirname(fileURLToPath(import.meta.url)), DIR = process.env.NBQ_DIR || path.join(HERE, '..', '..');
const SPEC = fs.readFileSync(path.join(HERE, '..', 'spec', 'api_spec.md'), 'utf8');
const CODES = new Set([...SPEC.matchAll(/^\| ([a-z_ /]+) \| \d{3} \|/gm)].flatMap(m => m[1].split('/').map(x => x.trim())));
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 500) : '')) };

const c = startCluster(); let pool;
try {
  c.createdb('nbq');
  const errs = loadSchema(c, 'nbq', path.join(DIR, 'schema.sql')); T('schema 执行无错误', !errs.length, errs.slice(0, 3));
  pool = new pg.Pool({ host: c.host, port: c.port, user: 'postgres', database: 'nbq', max: 12 });
  const q = (s, p) => pool.query(s, p), one = async (s, p) => (await q(s, p)).rows[0];
  const as = (role) => async (uid, sql, params) => { const cl = await pool.connect();
    try { await cl.query('begin'); await cl.query(`set local role ${role}`); if (uid) await cl.query(`select set_config('nbq.uid', $1, true)`, [uid]);
      const r = await cl.query(sql, params); await cl.query('commit'); return { ok: true, v: r.rows[0] && Object.values(r.rows[0])[0] } }
    catch (e) { await cl.query('rollback').catch(() => { }); return { ok: false, err: e.message, detail: e.detail } } finally { cl.release() } };
  const call = as('nbq_user'), svc = (sql, p) => as('nbq_service')(null, sql, p);
  const is = (r, code) => !r.ok && r.err === code;
  const waitIn = (r, lo, hi) => +r.detail >= lo && +r.detail <= hi;
  const back = (subject, grp, iv) => q(`update rate_hits set at = at - $3::interval where subject=$1 and grp=$2`, [subject, grp, iv]);
  const id = n => '00000000-0000-0000-0000-0000000000' + String(n).padStart(2, '0');
  let un = 0; const user = async (age = '30 days') => { const u = id(++un);
    await q(`insert into users(id,phone_e164,nickname,utr,gender,pact_accepted_at,created_at) values ($1,$2,$3,5,'m',now(),now()-$4::interval)`, [u, '+614000000' + u.slice(-2), 'U' + un, age]); return u };
  await q(`insert into suburbs(name,postcode,centroid) values ('Brighton','3186','POINT(145 -37.9)')`);
  const V = (await one(`insert into venues(name,short_name,suburb,postcode,location,surfaces,status) values ('Brighton TC','Brighton TC','Brighton','3186','POINT(145 -37.9)','{hard}','active') returning id`)).id;
  let gn = 0; const game = async (host, start = "now()+interval '2 days'", extra = {}) => (await one(`insert into games(share_code,host_id,venue_id,starts_at,duration_min,game_type,capacity,utr_min,utr_max,join_mode)
      values ($1,$2,$3,${start},90,'doubles',4,3,7,$4) returning id`, ['r' + (++gn), host, V, extra.join_mode || 'approve'])).id;
  const slot = async (dayOff, hh) => (await one(`select ((mel_today() + $1::int)::timestamp + make_time($2, 0, 0)) at time zone 'Australia/Melbourne' t`, [dayOff, hh])).t.toISOString();
  const create = async (u, i, bad = false) => call(u, `select api_game_create($1)`, [JSON.stringify({ venue_id: V, starts_at: await slot(2 + (i % 4), 7 + (i % 12)), game_type: bad ? 'x' : 'singles', utr_min: 3, utr_max: 7 })]);

  // ---------- 规则表 ----------
  const rules = (await q(`select * from rate_rules order by rule`)).rows;
  T('规则 22 条（5b-2 加了下载我的数据每天 1 次，R3-2 加了开放时通知我，第七批 S2a 加了场边发布 2 条、新建话题 1 条，S2b 加了回复、点网球各 1 条，#110 加了按编号查球员卡每小时 / 每天 2 条，11-07 我的 UTR 加 1 条），错误码都在规格错误码表里', rules.length === 22 && rules.every(r => CODES.has(r.code)), rules.map(r => r.code).filter(c => !CODES.has(c)));
  for (const k of ['game_daily_limit', 'game_open_limit', 'apply_hourly_limit', 'apply_daily_limit', 'apply_same_limit', 'message_too_fast', 'dm_new_limit', 'report_daily_limit', 'nickname_limit', 'otp_too_fast', 'otp_daily_limit', 'otp_locked'])
    if (!CODES.has(k)) T('规格里有 ' + k, false);
  T('规格 §0.4 列了限制表', /### 0\.4 频率限制/.test(SPEC) && SPEC.includes('| 发起球局 | 每天 5 个'));

  // ---------- 发起球局：每天 5 个；进行中最多 5 个 ----------
  const G1 = await user(); let r, ok = 0;
  for (let i = 0; i < 5; i++) if ((await create(G1, i)).ok) ok++;
  await q(`update games set status='cancelled' where host_id=$1`, [G1]);   // 取消了也照样算今天发的（进行中上限 5 不挡）
  r = await create(G1, 5);
  T('发局：5 个能发，取消后第 6 个 game_daily_limit', ok === 5 && is(r, 'game_daily_limit'), r);
  T('发局：等到墨尔本次日 0 点（1 秒–24 小时）', waitIn(r, 1, 86400), r.detail);
  await back(G1, 'game_create', '24 hours 1 minute'); r = await create(G1, 6);
  T('24 小时后恢复', r.ok, r);
  const GD = await user(); await q(`insert into rate_hits(subject, grp, at) select $1, 'game_create', mel_day_start(mel_today()) - interval '1 minute' from generate_series(1, 5)`, [GD]);
  r = await create(GD, 0); T('发局按自然日：昨天 23:59 发的 5 个不算今天', r.ok, r);
  await q(`insert into rate_hits(subject, grp, at) select $1, 'game_create', mel_day_start(mel_today()) + interval '1 second' from generate_series(1, 4)`, [GD]);
  r = await create(GD, 1); T('发局按自然日：今天 0 点后已发 5 个（含刚发的）→ 第 6 个 game_daily_limit', is(r, 'game_daily_limit'), r);
  const G2 = await user(); for (let i = 0; i < 5; i++) await create(G2, i, true); ok = 0; for (let i = 0; i < 5; i++) if ((await create(G2, i)).ok) ok++;
  T('填错被拒的不占次数', ok === 5);
  const G3 = await user(); for (let i = 0; i < 5; i++) await game(G3);
  r = await create(G3, 0); T('进行中 5 个 → game_open_limit', is(r, 'game_open_limit'), r);
  await q(`update games set status='cancelled' where id = (select id from games where host_id=$1 limit 1)`, [G3]);
  r = await create(G3, 0); T('取消一个后能发', r.ok, r);
  const G4 = await user(); const res = await Promise.all(Array.from({ length: 10 }, (_, i) => create(G4, i)));
  T('同时点 10 次只成功 5 次', res.filter(x => x.ok).length === 5 && res.filter(x => is(x, 'game_daily_limit') || is(x, 'game_open_limit')).length === 5, res.map(x => x.err || 'ok'));

  // ---------- 申请 + 直接加入：每小时 10、每天 30、同一局 3 次 ----------
  const H = await user(); const GS = []; for (let i = 0; i < 36; i++) GS.push(await game(H));
  const A = await user(); ok = 0;
  for (let i = 0; i < 10; i++) if ((await call(A, `select api_apply($1)`, [GS[i]])).ok) ok++;
  r = await call(A, `select api_apply($1)`, [GS[10]]);
  T('申请：每小时 10 次，第 11 次 apply_hourly_limit', ok === 10 && is(r, 'apply_hourly_limit') && waitIn(r, 3500, 3600), r);
  for (let k = 0; k < 2; k++) { await back(A, 'apply', '61 minutes'); for (let i = 0; i < 10; i++) { r = await call(A, `select api_apply($1)`, [GS[10 + k * 10 + i]]); if (!r.ok) break } }
  await back(A, 'apply', '61 minutes'); r = await call(A, `select api_apply($1)`, [GS[30]]);
  T('一天 30 次后 apply_daily_limit', is(r, 'apply_daily_limit'), r);
  const B = await user(); const g0 = GS[34]; const seq = [];
  for (let i = 0; i < 4; i++) { seq.push((await call(B, `select api_apply($1)`, [g0])).err || 'ok'); await call(B, `select api_leave($1)`, [g0]) }
  T('同一局撤回再申请：3 次后 apply_same_limit', seq.join() === 'ok,ok,ok,apply_same_limit', seq);
  const C = await user(); const gi = await game(H, "now()+interval '1 hour'", { join_mode: 'instant' });
  for (let i = 0; i < 9; i++) await call(C, `select api_apply($1)`, [GS[i]]);
  r = await call(C, `select api_join($1)`, [gi]); const r2 = await call(C, `select api_apply($1)`, [GS[9]]);
  T('直接加入和申请合计', r.ok && is(r2, 'apply_hourly_limit'), [r, r2]);
  r = await call(C, `select api_apply($1)`, [GS[0]]); T('已申请过的报原来的错误（already_applied），不报频率', is(r, 'already_applied'), r);

  // ---------- 消息：每分钟 10 条；新账号每天主动开始 3 个新对话 ----------
  const M1 = await user(), M2 = await user();
  const t12 = (await call(M1, `select api_thread_dm($1)`, [M2])).v;
  ok = 0; for (let i = 0; i < 10; i++) if ((await call(M1, `select api_message_send($1,$2)`, [t12, 'hi ' + i])).ok) ok++;
  r = await call(M1, `select api_message_send($1,'再来')`, [t12]);
  T('消息：每分钟 10 条，第 11 条 message_too_fast（等不到 60 秒）', ok === 10 && is(r, 'message_too_fast') && waitIn(r, 1, 60), r);
  r = await call(M2, `select api_message_send($1,'回你')`, [t12]); T('对方不受影响', r.ok, r);
  await back(M1, 'message', '61 seconds'); r = await call(M1, `select api_message_send($1,'好了')`, [t12]); T('一分钟后恢复', r.ok, r);
  const Nw = await user('1 day'), others = []; for (let i = 0; i < 6; i++) others.push(await user());
  const seqN = []; for (let i = 0; i < 4; i++) { const t = (await call(Nw, `select api_thread_dm($1)`, [others[i]])).v; seqN.push((await call(Nw, `select api_message_send($1,'你好')`, [t])).err || 'ok') }
  T('新账号：每天主动和 3 位新的人开始聊天，第 4 位 dm_new_limit', seqN.join() === 'ok,ok,ok,dm_new_limit', seqN);
  const t0n = (await call(Nw, `select api_thread_dm($1)`, [others[0]])).v;
  r = await call(Nw, `select api_message_send($1,'第二句')`, [t0n]); T('已开始的对话继续发不受限', r.ok, r);
  const t4 = (await call(others[4], `select api_thread_dm($1)`, [Nw])).v; await call(others[4], `select api_message_send($1,'你好呀')`, [t4]);
  r = await call(Nw, `select api_message_send($1,'你好')`, [t4]); T('对方先发的，回复不算主动', r.ok, r);
  const gp = await game(H, "now()-interval '3 days'"); for (const u of [Nw, others[5]]) await q(`insert into game_participants(game_id,user_id,status,approved_at,created_at) values ($1,$2,'approved',now()-interval '4 days',now()-interval '4 days')`, [gp, u]);
  const t5 = (await call(Nw, `select api_thread_dm($1)`, [others[5]])).v; r = await call(Nw, `select api_message_send($1,'上次打得开心')`, [t5]);
  T('一起打过球的不算新的人', r.ok, r);
  const Old = await user('8 days'); ok = 0; for (let i = 0; i < 4; i++) { const t = (await call(Old, `select api_thread_dm($1)`, [others[i]])).v; if ((await call(Old, `select api_message_send($1,'你好')`, [t])).ok) ok++ }
  T('注册满 7 天不受这条限制', ok === 4);
  const M3 = await user(), M4 = await user(); const t34 = (await call(M3, `select api_thread_dm($1)`, [M4])).v;
  const rs = await Promise.all(Array.from({ length: 20 }, (_, i) => call(M3, `select api_message_send($1,$2)`, [t34, 'x' + i])));
  T('同时发 20 条只成功 10 条', rs.filter(x => x.ok).length === 10, rs.map(x => x.err || 'ok'));

  // ---------- 举报：每天 5 次 ----------
  const R1 = await user(), tg = []; for (let i = 0; i < 7; i++) tg.push(await user());
  const rep = t => call(R1, `insert into reports(reporter_id,target_type,target_id,reason,source,via) values ($1,'user',$2,'harass','in_app','card') returning id`, [R1, t]);
  const sr = []; for (let i = 0; i < 4; i++) sr.push((await rep(tg[i])).err || 'ok');
  const dup = await rep(tg[0]); sr.push((await rep(tg[4])).err || 'ok'); const sixth = await rep(tg[5]);
  T('重复举报被拦（不占次数），第 5 次照常', sr.join() === 'ok,ok,ok,ok,ok' && !dup.ok && /reports_one_open/.test(dup.err), [sr, dup.err]);
  T('第 6 次 report_daily_limit', is(sixth, 'report_daily_limit'), sixth);
  const adm = (await one(`insert into admin_users(email,name,role,password_hash,totp_secret) values ('ops@x.com','Ops','operator','h','t') returning id`)).id;
  r = await q(`insert into reports(reporter_id,target_type,target_id,reason,source,entered_by) values ($1,'user',$2,'spam','email',$3)`, [R1, tg[6], adm]).then(() => ({ ok: true }), e => ({ ok: false, err: e.message }));
  T('后台录入的不受限制', r.ok, r);

  // ---------- 改昵称：30 天 2 次 ----------
  const P1 = await user(), P0 = await user('2 hours');
  const nick = (u, n) => call(u, `update users set nickname=$2 where id=$1`, [u, n]);
  const sp = []; for (let i = 0; i < 3; i++) sp.push((await nick(P1, '球友' + i)).err || 'ok');
  T('改昵称：2 次后 nickname_limit', sp.join() === 'ok,ok,nickname_limit', sp);
  r = await call(P1, `update users set card_theme='clay' where id=$1`, [P1]); T('改其他资料不受影响', r.ok, r);
  ok = 0; for (let i = 0; i < 4; i++) if ((await nick(P0, '新人' + i)).ok) ok++; T('注册 24 小时内改昵称不计', ok === 4);
  r = await q(`update users set nickname='后台改' where id=$1`, [P1]).then(() => ({ ok: true }), e => ({ ok: false, err: e.message })); T('后台改不受限', r.ok, r);

  // ---------- 验证码 ----------
  const ph = '+61412345678';
  r = await svc(`select auth_otp_send($1,'1.1.1.1')`, [ph]); const again = await svc(`select auth_otp_send($1,'1.1.1.1')`, [ph]);
  T('同一号码 60 秒 1 次（otp_too_fast，等待 ≤ 60 秒）', r.ok && is(again, 'otp_too_fast') && waitIn(again, 1, 60), again);
  for (let i = 0; i < 4; i++) { await back('phone:' + ph, 'otp_send', '61 seconds'); await svc(`select auth_otp_send($1,'1.1.1.2')`, [ph]) }
  await back('phone:' + ph, 'otp_send', '61 seconds'); r = await svc(`select auth_otp_send($1,'1.1.1.3')`, [ph]);
  T('同一号码每天 5 次（otp_daily_limit）', is(r, 'otp_daily_limit'), r);
  r = await svc(`select auth_otp_send('0412345678','1.1.1.1')`); T('号码格式不对 → invalid', is(r, 'invalid') && r.detail === 'phone', r);
  ok = 0; for (let i = 0; i < 10; i++) if ((await svc(`select auth_otp_send($1,'9.9.9.9')`, ['+6141111110' + (i < 10 ? i : '')])).ok) ok++;
  r = await svc(`select auth_otp_send('+61422222222','9.9.9.9')`);
  T('同一 IP 每小时 10 次（rate_limited）', ok === 10 && is(r, 'rate_limited'), [ok, r]);
  const ph2 = '+61433333333';
  for (let i = 0; i < 5; i++) await svc(`select auth_otp_verify($1,'2.2.2.2',false)`, [ph2]);
  r = await svc(`select auth_otp_verify($1,'2.2.2.2')`, [ph2]); const rs2 = await svc(`select auth_otp_send($1,'2.2.2.3')`, [ph2]);
  T('连错 5 次锁 30 分钟（校验和重新获取都拦，等待 ≤ 30 分钟）', is(r, 'otp_locked') && is(rs2, 'otp_locked') && waitIn(r, 1, 1800), [r, rs2]);
  await back('phone:' + ph2, 'otp_fail', '31 minutes'); r = await svc(`select auth_otp_verify($1,'2.2.2.2')`, [ph2]); T('30 分钟后解锁', r.ok, r);
  const ph3 = '+61444444444';
  for (let i = 0; i < 4; i++) await svc(`select auth_otp_verify($1,'3.3.3.3',false)`, [ph3]);
  await svc(`select auth_otp_verify($1,'3.3.3.3',true)`, [ph3]); for (let i = 0; i < 4; i++) await svc(`select auth_otp_verify($1,'3.3.3.3',false)`, [ph3]);
  r = await svc(`select auth_otp_verify($1,'3.3.3.3')`, [ph3]); T('输对后错误次数清零', r.ok, r);

  // ---------- 权限 ----------
  r = await call(A, `select auth_otp_send('+61455555555','1.1.1.1')`); T('前台不能调验证码函数', !r.ok && /permission denied/.test(r.err), r);
  r = await call(A, `select nbq_rate($1,'apply')`, [A]); T('前台不能直接调计数函数', !r.ok && /permission denied/.test(r.err), r);
  r = await call(A, `select count(*) from rate_hits`); T('前台看不到计数表', !r.ok && /permission denied/.test(r.err), r);
  r = await call(A, `update rate_rules set max_hits=999`); T('前台不能改规则', !r.ok, r);
  r = await as('nbq_admin')(null, `select count(*) from rate_rules`); T('后台能看规则', r.ok && +r.v === 22, r);

  // ---------- 改数值只改表 / 每晚清理 ----------
  await q(`update rate_rules set max_hits=4 where rule='game_day'`); const G5 = await user(); ok = 0; for (let i = 0; i < 5; i++) if ((await create(G5, i)).ok) ok++;
  T('改 rate_rules 立即生效', ok === 4, ok);
  await q(`update rate_rules set enabled=false where rule='msg_minute'`); ok = 0; for (let i = 0; i < 12; i++) if ((await call(M1, `select api_message_send($1,'z')`, [t12])).ok) ok++;
  T('停用的规则不检查', ok === 12, ok);
  await q(`insert into rate_hits(subject,grp,at) values ('ip:old','otp_ip',now()-interval '40 days'),('ip:new','otp_ip',now()-interval '20 days')`);
  r = await svc(`select job_nightly()`);
  T('每晚清理 31 天前的计数（含 IP）', r.ok && !(await one(`select 1 x from rate_hits where subject='ip:old'`)) && !!(await one(`select 1 x from rate_hits where subject='ip:new'`)), r);
} catch (e) { fail++; console.log('FAIL 异常 ' + (e.stack || e)) }
finally { if (pool) await pool.end().catch(() => { }); c.stop() }
console.log(`rate: ${pass} 通过, ${fail} 失败`); process.exit(fail ? 1 : 0);
