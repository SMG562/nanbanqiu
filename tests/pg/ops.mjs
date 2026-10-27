// 第五批 5d：上线后盯什么（schema ⑱ + server/ops）。16 项检查逐项触发 / 不触发、报警（新出现、升级、6 小时提醒、恢复、不重复）、
// 发给 owner 的邮件、送达失败和发送程序心跳、页面报错合并计数、加密备份（密钥错 / 被改过都解不开）、真实的导出 → 恢复 → 对数 → 自检演练。
import { createRequire } from 'module'; import path from 'path'; import fs from 'fs'; import os from 'os'; import { fileURLToPath, pathToFileURL } from 'url';
import { startCluster, loadSchema } from './cluster.mjs';
const require = createRequire(import.meta.url); const pg = require('pg');
const HERE = path.dirname(fileURLToPath(import.meta.url)), DIR = process.env.NBQ_DIR || path.join(HERE, '..', '..');
const MON = await import(pathToFileURL(path.join(DIR, 'server/ops/monitor.mjs')));
const BK = await import(pathToFileURL(path.join(DIR, 'server/ops/backup.mjs')));
const SND = await import(pathToFileURL(path.join(DIR, 'server/notify/sender.mjs')));
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 600) : '')) };

// ---------- 加密备份（不用数据库） ----------
const tmpd = fs.mkdtempSync(path.join(os.tmpdir(), 'nbq-ops-')), K = BK.newKey(), plain = path.join(tmpd, 'a.bin'), enc = path.join(tmpd, 'a.nbqb'), back = path.join(tmpd, 'b.bin');
fs.writeFileSync(plain, Buffer.concat([Buffer.from('南伴球备份测试'), require('crypto').randomBytes(300000)]));
await BK.encryptFile(plain, enc, K); await BK.decryptFile(enc, back, K);
T('加密备份：解密后和原文件一模一样，密文里看不到原文', fs.readFileSync(back).equals(fs.readFileSync(plain)) && !fs.readFileSync(enc).includes(Buffer.from('南伴球备份测试')) && fs.readFileSync(enc).subarray(0, 5).toString() === 'NBQB1');
let bad = await BK.decryptFile(enc, back + '2', BK.newKey()).then(() => 'ok', e => e.message); T('密钥不对解不开', bad !== 'ok', bad);
const t2 = fs.readFileSync(enc); t2[100] ^= 1; fs.writeFileSync(enc + 'x', t2); bad = await BK.decryptFile(enc + 'x', back + '3', K).then(() => 'ok', e => e.message); T('文件被改过一个字节也解不开', bad !== 'ok', bad);
bad = await BK.encryptFile(plain, enc + 'k', 'short').then(() => 'ok', e => e.message); T('密钥长度不对直接拒绝', bad === 'backup_key_invalid', bad);
const m = MON.alertMail([{ code: 'push_fail_rate', label: '推送失败率', level: 'crit', value: 0.35, kind: 'escalate' }, { code: 'signup_drop', label: '新注册骤降', level: 'ok', value: 0.9, kind: 'resolved' }]);
T('报警邮件：标题按最严重的、百分比显示、写明升级和处理手册', m.subject === '[南伴球] 严重：推送失败率、新注册骤降' && /35\.0%/.test(m.text) && /从警告升为严重/.test(m.text) && /出事处理手册/.test(m.text), m);

const c = startCluster(); let pool;
try {
  c.createdb('nbq');
  const errs = loadSchema(c, 'nbq', path.join(DIR, 'schema.sql')); T('schema 执行无错误', !errs.length, errs.slice(0, 3));
  pool = new pg.Pool({ host: c.host, port: c.port, user: 'postgres', database: 'nbq', max: 6 });
  const q = (s, p) => pool.query(s, p), one = async (s, p) => (await q(s, p)).rows[0];
  const svc = async (sql, p) => { const cl = await pool.connect(); try { await cl.query('begin'); await cl.query('set local role nbq_service'); const r = await cl.query(sql, p); await cl.query('commit'); return r.rows } catch (e) { await cl.query('rollback'); throw e } finally { cl.release() } };
  const checks = async () => Object.fromEntries((await q(`select * from monitor_checks()`)).rows.map(r => [r.code, r]));
  const lv = async code => (await checks())[code].level;
  const fresh = () => q(`insert into job_runs(job, started_at, finished_at, rows, ok) select j, now(), now(), 0, true from unnest(array['expire_applications','start_checks','soon_reminders','unfilled_reminders','recap_notices','restore_suspended','expire_invites','risk_scores','sb_hourly','nightly']) j`);
  T('阈值表 16 项', +(await one(`select count(*) from monitor_thresholds`)).count === 16);

  // ---------- 基线：都正常 ----------
  let ck = await checks();
  T('新库：定时任务没跑 → 严重；从没演练过 → 严重', ck.jobs_stale.level === 'crit' && +ck.jobs_stale.value === 10 && ck.restore_drill.level === 'crit');
  await fresh(); await q(`insert into ops_drills(ok, at) values (true, now()-interval '3 days')`);
  ck = await checks(); const notOk = Object.values(ck).filter(r => r.level !== 'ok').map(r => r.code);
  T('任务都跑了、演练过、没有数据 → 全部正常（数据量不够的不算）', !notOk.length, notOk);
  T('数据库连接数、慢查询有值', ck.db_connections.value != null && +ck.long_queries.value === 0);
  await q(`update job_runs set started_at = now()-interval '10 minutes' where job='soon_reminders'`);
  T('每分钟的任务 10 分钟没跑 → 严重', await lv('jobs_stale') === 'crit' && +(await checks()).jobs_stale.value === 1);
  await q(`insert into job_runs(job, started_at, finished_at, rows, ok) values ('soon_reminders', now(), now(), 0, true)`);
  await q(`update job_runs set started_at = now()-interval '20 hours' where job='nightly'`); T('每天的任务 20 小时前跑过 → 正常', await lv('jobs_stale') === 'ok');

  // ---------- 系统类 ----------
  let un = 0; const user = async (ago = '60 days') => (await one(`insert into users(phone_e164,nickname,utr,created_at) values ($1,'U'||$2,5,now()-$3::interval) returning id`, ['+6143' + String(++un).padStart(7, '0'), un, ago])).id;
  const U = await user();
  await q(`insert into notifications(user_id,kind,created_at) values ($1,'badge',now()-interval '10 minutes')`, [U]);
  ck = await checks(); T('到时间 10 分钟没处理的提醒 1 条 → 警告；发送程序从没跑 → 严重', ck.notif_backlog.level === 'warn' && ck.sender_stale.level === 'crit', [ck.notif_backlog, ck.sender_stale]);
  await q(`insert into notifications(user_id,kind,created_at) select $1,'badge',now()-interval '10 minutes' from generate_series(1,19)`, [U]); T('积压 20 条 → 严重', await lv('notif_backlog') === 'crit');
  await q(`insert into ops_heartbeats(name,at) values ('sender', now()-interval '2 minutes')`); T('发送程序 2 分钟前跑过 → 正常', await lv('sender_stale') === 'ok');
  await q(`update ops_heartbeats set at = now()-interval '15 minutes'`); T('15 分钟没跑 → 警告', await lv('sender_stale') === 'warn');
  await q(`update notifications set pushed_at = now()`); T('没有到期提醒时不看心跳', await lv('sender_stale') === 'ok' && await lv('notif_backlog') === 'ok');
  const N = (await one(`insert into notifications(user_id,kind,pushed_at) values ($1,'badge',now()) returning id`, [U])).id;
  await q(`insert into notification_deliveries(notification_id,channel,reason) select $1,'push_mobile','mobile_first' from generate_series(1,17)`, [N]);
  await q(`insert into delivery_errors(channel,status) values ('push_mobile',500),('push_mobile',0)`);
  T('推送尝试不到 20 次不算', (await checks()).push_fail_rate.value === null);
  await q(`insert into delivery_errors(channel,status) values ('push_desktop',503)`); ck = await checks();
  T('推送 20 次失败 3 次（15%）→ 警告', ck.push_fail_rate.level === 'warn' && +ck.push_fail_rate.value === 0.15, ck.push_fail_rate);
  await q(`insert into email_outbox(user_id,to_email,kind,merge_key,subject,send_after,status,sent_at) select $1,'a@x.com','result','k'||i,'s',now(),case when i<=2 then 'bounced' else 'sent' end,now()-interval '1 day' from generate_series(1,20) i`, [U]);
  T('邮件退信 10% → 严重', await lv('email_bounce') === 'crit');
  await q(`insert into delivery_errors(channel,status) select 'email',0 from generate_series(1,5)`); T('1 小时邮件出错 5 封 → 警告', await lv('email_failed') === 'warn');
  await q(`insert into rate_hits(subject,grp,key) select 'phone:+61400000000','otp_fail','x' from generate_series(1,50)`); T('1 小时验证码输错 50 次 → 警告', await lv('otp_fail') === 'warn');
  await q(`insert into risk_events(user_id,kind,at) select $1,'rate_hit',now()-interval '2 days' from generate_series(1,168)`, [U]);
  await q(`insert into risk_events(user_id,kind) select $1,'rate_hit' from generate_series(1,30)`, [U]);
  ck = await checks(); T('频率限制触发：平时每小时 1 次，这 1 小时 30 次 → 严重', ck.rate_hit_spike.level === 'crit' && +ck.rate_hit_spike.value === 30, ck.rate_hit_spike);
  for (let i = 0; i < 25; i++) await svc(`select client_error_log('pwa','mobile','TypeError: x is undefined','app.js',120)`);
  await svc(`select client_error_log('web','desktop','TypeError: y','app.js',9)`);
  T('页面报错同一条每小时合并计数', (await q(`select n from client_errors order by n desc`)).rows.map(r => r.n).join() === '25,1');
  T('页面报错 26 次（平时 0）→ 严重', await lv('client_errors') === 'crit');
  await q(`delete from ops_drills`); await q(`insert into ops_drills(ok, at) values (true, now()-interval '40 days'), (false, now()-interval '1 day')`);
  T('上次成功的演练 40 天前（失败的不算）→ 警告', await lv('restore_drill') === 'warn' && +(await checks()).restore_drill.value === 40);

  // ---------- 业务类 ----------
  await q(`insert into suburbs(name,postcode,centroid) values ('Brighton','3186','POINT(145 -37.9)')`);
  const V = (await one(`insert into venues(name,short_name,suburb,postcode,location,surfaces,status) values ('B','B','Brighton','3186','POINT(145 -37.9)','{hard}','active') returning id`)).id;
  const H = await user(), P = await user();
  let gn = 0; const game = async (ago, full) => { const g = (await one(`insert into games(share_code,host_id,venue_id,starts_at,duration_min,game_type,capacity,utr_min,utr_max) values ($1,$2,$3,now()-$4::interval,90,'singles',2,3,7) returning id`, ['m' + (++gn), H, V, ago])).id;
    if (full) await q(`insert into game_participants(game_id,user_id,status,approved_at) values ($1,$2,'approved',now()-interval '30 days')`, [g, P]); return g };
  for (let w = 1; w <= 4; w++) for (let i = 0; i < 10; i++) await game(`${w * 7} days ${i + 1} hours`, i < 9);   // 过去 4 周同一时段：人齐率 90%
  for (let i = 0; i < 9; i++) await game(`${i + 1} hours`, i < 6);
  T('最近 24 小时开打不到 10 局不算', (await checks()).fill_rate_drop.value === null);
  await game('12 hours', false); ck = await checks();
  T('人齐率 60%（平时 90%）→ 0.67 → 警告', ck.fill_rate_drop.level === 'warn' && Math.abs(ck.fill_rate_drop.value - 0.667) < 0.01, ck.fill_rate_drop);
  for (let w = 1; w <= 4; w++) await q(`insert into users(phone_e164,nickname,utr,created_at) select '+6144'||lpad((${w}*100+i)::text,7,'0'),'N',5,now()-interval '${w * 7} days'-interval '3 hours' from generate_series(1,12) i`);
  T('新注册：最近 24 小时 0 个（平时 12 个）→ 严重', await lv('signup_drop') === 'crit');
  await q(`insert into users(phone_e164,nickname,utr,created_at) select '+6145'||lpad(i::text,7,'0'),'N',5,now()-interval '2 hours' from generate_series(1,10) i`);
  T('最近 24 小时 10 个（83%）→ 正常', await lv('signup_drop') === 'ok');
  const R = await user(); const tgs = []; for (let i = 0; i < 6; i++) tgs.push(await user());
  for (const t of tgs) await q(`insert into reports(reporter_id,target_type,target_id,reason,source,via) values ($1,'user',$2,'harass','in_app','card')`, [R, t]);
  T('最近 24 小时 6 条举报（平时 0）→ 严重', await lv('reports_spike') === 'crit');
  const GE = await game('-3 days', false);
  const appl = []; for (let i = 0; i < 20; i++) appl.push(await user());
  for (let i = 0; i < 20; i++) await q(`insert into game_participants(game_id,user_id,status,decided_at,expired_at,decline_reason,via) values ($1,$2,$3,now()-interval '1 day',$4,$5,'request')`, [GE, appl[i], i < 9 ? 'expired' : 'rejected', i < 9 ? new Date(Date.now() - 864e5) : null, i < 9 ? 'timeout' : 'level']);
  ck = await checks(); T('申请失效率 45% → 警告', ck.expiry_rate.level === 'warn' && +ck.expiry_rate.value === 0.45, ck.expiry_rate);

  // ---------- 报警：新出现 / 不重复 / 升级 / 提醒 / 恢复 ----------
  let a1 = (await svc(`select job_monitor() j`))[0].j;
  const codes = a1.map(x => x.code).sort();
  T('第一次：所有异常各发一条「新出现」', a1.every(x => x.kind === 'new') && codes.includes('push_fail_rate') && codes.includes('reports_spike') && codes.includes('restore_drill') && !codes.includes('db_connections'), codes);
  T('报警记录与通知一致', +(await one(`select count(*) from monitor_alerts where resolved_at is null`)).count === a1.length);
  let a2 = (await svc(`select job_monitor() j`))[0].j; T('5 分钟后再跑：没有变化就不重复通知', a2.length === 0, a2);
  await q(`insert into delivery_errors(channel,status) select 'push_mobile',500 from generate_series(1,10)`);
  a2 = (await svc(`select job_monitor() j`))[0].j; T('推送失败率从警告升到严重 → 通知「升级」', a2.length === 1 && a2[0].code === 'push_fail_rate' && a2[0].kind === 'escalate', a2);
  a2 = (await svc(`select job_monitor(now()+interval '6 hours 1 minute') j`))[0].j;
  T('6 小时还没恢复 → 再提醒', a2.length > 0 && a2.every(x => x.kind === 'remind' || x.kind === 'resolved' || x.kind === 'new'), a2.map(x => x.code + ':' + x.kind));
  await q(`delete from reports`); a2 = (await svc(`select job_monitor() j`))[0].j;
  T('举报恢复正常 → 通知「已恢复」，记录关掉', a2.some(x => x.code === 'reports_spike' && x.kind === 'resolved') && !(await one(`select 1 x from monitor_alerts where code='reports_spike' and resolved_at is null`)));
  T('monitor 任务记了 job_runs', !!(await one(`select 1 x from job_runs where job='monitor'`)));
  await q(`insert into reports(reporter_id,target_type,target_id,reason,source,via) select $1,'user',t,'harass','in_app','card' from unnest($2::uuid[]) t`, [R, tgs]);
  a2 = (await svc(`select job_monitor() j`))[0].j; T('恢复后又出现 → 新开一条', a2.some(x => x.code === 'reports_spike' && x.kind === 'new') && +(await one(`select count(*) from monitor_alerts where code='reports_spike'`)).count === 2);

  // ---------- 发给 owner ----------
  await q(`insert into admin_users(email,name,role,password_hash,totp_secret) values ('han@x.com','Han','owner','h','t'),('bk@x.com','Bk','owner','h','t'),('ops@x.com','Ops','operator','h','t'),('old@x.com','Old','owner','h','t')`);
  await q(`update admin_users set disabled=true where email='old@x.com'`);
  await q(`delete from reports`); const sent = []; const mail = { send: async x => { sent.push(x); return { id: 'm' } } };
  const rm = await MON.runMonitor(pool, { mail });
  T('报警邮件只发给在职的 owner（运营、已停用的不发）', JSON.stringify(sent.map(x => x.to).sort()) === '["bk@x.com","han@x.com"]' && /已恢复/.test(sent[0].subject), sent.map(x => [x.to, x.subject]));

  // ---------- 发送程序：送达失败、心跳 ----------
  await q(`delete from delivery_errors`); await q(`update notifications set pushed_at=now() where pushed_at is null`);
  const dv = (await one(`insert into user_devices(user_id,platform,push_endpoint,push_p256dh,push_auth) values ($1,'mobile','e500','p','a') returning id`, [U])).id;
  // 用紧急类（夜里也照常发）：原来用 badge，墨尔本 22:00–08:00 跑测试会被夜间顺延、推不出去（10-26 22:30 发现）
  await q(`insert into notifications(user_id,kind,created_at) values ($1,'game_cancelled',now()-interval '1 minute')`, [U]);
  await SND.dispatch(pool, { push: { send: async () => ({ status: 500 }) }, now: Date.now() + 9 * 36e5 * 0 });
  T('推送失败记进 delivery_errors（订阅保留）', (await one(`select channel, status from delivery_errors`))?.status === 500 && !!(await one(`select push_endpoint from user_devices where id=$1`, [dv])).push_endpoint);
  T('发送程序每轮写心跳', Date.now() - +(await one(`select at from ops_heartbeats where name='sender'`)).at < 60e3);

  // ---------- 真实的恢复演练 ----------
  c.createdb('drill');
  const conn = db => `postgresql://postgres@localhost/${db}?host=${encodeURIComponent(c.host)}&port=${c.port}`;
  const dr = await BK.drill({ pg, source: conn('nbq'), target: conn('drill'), key: K, pgbin: c.bin, env: c.env });
  T('演练：导出 → 加密 → 恢复到新库 → 逐表对数一致 → 自检全过', dr.ok && Object.values(dr.detail.tables).every(([a, b]) => a === b) && dr.detail.tables.users[0] > 50 && dr.detail.verify.length === 6 && dr.detail.verify.every(v => v.ok), dr);
  T('演练记到 ops_drills；「恢复演练」变正常', !!(await one(`select 1 x from ops_drills where ok and at > now()-interval '1 minute'`)) && await lv('restore_drill') === 'ok');
  const dr2 = await BK.drill({ pg, source: conn('nbq'), target: conn('drill'), key: K, pgbin: c.bin, env: c.env });
  T('恢复到非空库失败 → 记一条失败（不算成功的演练）', !dr2.ok && /pg_restore|already exists|Command failed/.test(dr2.detail.error || '') && !!(await one(`select 1 x from ops_drills where not ok and at > now()-interval '1 minute'`)), dr2.detail.error);
  await q(`update admin_users set disabled=true where role='owner'`); c.createdb('drill2');
  const dr3 = await BK.drill({ pg, source: conn('nbq'), target: conn('drill2'), key: K, pgbin: c.bin, env: c.env });
  T('恢复出来的库自检不过（没有在职 owner）→ 演练算失败', !dr3.ok && dr3.detail.verify.some(x => !x.ok && /超级管理员/.test(x.item)), dr3.detail.verify);
  await q(`update admin_users set disabled=false where email in ('han@x.com','bk@x.com')`);
  const v = (await q(`select * from ops_verify()`)).rows; T('源库自检也全过', v.every(x => x.ok), v);

  // ---------- 权限 ----------
  const asUser = async sql => { const cl = await pool.connect(); try { await cl.query('begin'); await cl.query('set local role nbq_user'); await cl.query(sql); await cl.query('rollback'); return 'ok' } catch (e) { await cl.query('rollback'); return e.message } finally { cl.release() } };
  T('前台不能看检查、不能写页面报错（要经后端）、不能跑报警', /permission denied/.test(await asUser(`select * from monitor_checks()`)) && /permission denied/.test(await asUser(`select client_error_log('pwa','mobile','x')`)) && /permission denied/.test(await asUser(`select job_monitor()`)));
  const asAdm = async sql => { const cl = await pool.connect(); try { await cl.query('begin'); await cl.query('set local role nbq_admin'); const r = await cl.query(sql); await cl.query('rollback'); return r.rows.length } catch (e) { await cl.query('rollback'); return e.message } finally { cl.release() } };
  T('后台能看系统状态（检查、报警、演练）', await asAdm(`select * from monitor_checks()`) === 16 && typeof await asAdm(`select * from monitor_alerts`) === 'number' && typeof await asAdm(`select * from ops_drills`) === 'number');
} catch (e) { fail++; console.log('FAIL 异常 ' + (e.stack || e)) }
finally { if (pool) await pool.end().catch(() => { }); c.stop(); fs.rmSync(tmpd, { recursive: true, force: true }) }
console.log(`ops: ${pass} 通过, ${fail} 失败`); process.exit(fail ? 1 : 0);
