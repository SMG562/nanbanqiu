// 第五批 5b-2：隐私（schema ⑯）。同意记录与 18 岁确认、下载我的数据（有什么、没有什么）、关闭「使用数据」、注销匿名化补漏、保存期限任务。
import fs from 'fs'; import { createRequire } from 'module'; import path from 'path'; import { fileURLToPath } from 'url';
import { startCluster, loadSchema } from './cluster.mjs';
const require = createRequire(import.meta.url); const pg = require('pg');
const HERE = path.dirname(fileURLToPath(import.meta.url)), DIR = process.env.NBQ_DIR || path.join(HERE, '..', '..');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 600) : '')) };

const c = startCluster(); let pool;
try {
  c.createdb('nbq');
  const errs = loadSchema(c, 'nbq', path.join(DIR, 'schema.sql')); T('schema 执行无错误', !errs.length, errs.slice(0, 3));
  pool = new pg.Pool({ host: c.host, port: c.port, user: 'postgres', database: 'nbq', max: 4 });
  const q = (s, p) => pool.query(s, p), one = async (s, p) => (await q(s, p)).rows[0];
  const as = (role) => async (uid, sql, params) => { const cl = await pool.connect();
    try { await cl.query('begin'); await cl.query(`set local role ${role}`); if (uid) await cl.query(`select set_config('nbq.uid', $1, true)`, [uid]);
      const r = await cl.query(sql, params); await cl.query('commit'); return { ok: true, v: r.rows[0] && Object.values(r.rows[0])[0] } }
    catch (e) { await cl.query('rollback').catch(() => { }); return { ok: false, err: e.message, detail: e.detail } } finally { cl.release() } };
  const call = as('nbq_user'), svc = (sql, p) => as('nbq_service')(null, sql, p);
  let un = 0; const user = async (nick, age = '60 days') => (await one(`insert into users(phone_e164,nickname,utr,gender,pact_accepted_at,created_at,email,wechat_id,signup_device,signup_ip)
      values ($1,$2,5,'m',now(),now()-$3::interval,lower($2)||'@x.com','wx_'||$2,'anon_'||$2,'10.1.1.'||$4) returning id`, ['+6141' + String(++un).padStart(7, '0'), nick, age, un])).id;
  await q(`insert into suburbs(name,postcode,centroid) values ('Brighton','3186','POINT(145 -37.9)')`);
  const V = (await one(`insert into venues(name,short_name,suburb,postcode,location,surfaces,status) values ('Brighton TC','Brighton TC','Brighton','3186','POINT(145 -37.9)','{hard}','active') returning id`)).id;
  let r;

  // ---------- 同意记录与 18 岁 ----------
  const A = await user('Amy');
  r = await call(A, `select api_consent_state()`); T('新用户需要同意（未确认 18 岁、版本 0）', r.ok && r.v.need === true && r.v.adult === false && r.v.terms_current === 1, r);
  r = await call(A, `select api_consent_accept()`); T('没确认满 18 岁 → adult_required', !r.ok && r.err === 'adult_required', r);
  r = await call(A, `select api_consent_accept(true)`); T('确认满 18 岁并同意 → 记版本', r.ok && r.v.terms === 1 && r.v.privacy === 1, r);
  const u0 = await one(`select adult_confirmed_at, terms_version, privacy_version, privacy_accepted_at from users where id=$1`, [A]);
  T('记下确认时间和版本', u0.adult_confirmed_at && u0.terms_version === 1 && u0.privacy_version === 1 && u0.privacy_accepted_at);
  r = await call(A, `select api_consent_state()`); T('同意后不再需要', r.v.need === false, r);
  await q(`insert into legal_docs(kind,version,summary) values ('privacy',2,'写明新的境外服务商')`);
  r = await call(A, `select api_consent_state()`); T('隐私政策改版 → 需要重新同意', r.v.need === true && r.v.privacy === 1 && r.v.privacy_current === 2, r);
  r = await call(A, `select api_consent_accept()`); T('重新同意不用再确认年龄', r.ok && r.v.privacy === 2, r);
  r = await call(A, `insert into legal_docs(kind,version,summary) values ('terms',9,'x')`); T('前台不能改协议版本', !r.ok, r);
  r = await call(A, `update users set adult_confirmed_at=null, privacy_version=9 where id=$1`, [A]); T('前台不能直接改同意记录', !r.ok, r);

  // ---------- 下载我的数据 ----------
  const B = await user('Ben'), C = await user('Cat'), D = await user('Dan');
  const g = (await one(`insert into games(share_code,host_id,venue_id,starts_at,duration_min,game_type,capacity,utr_min,utr_max,note) values ('pv1',$1,$2,now()-interval '3 days',90,'doubles',4,3,7,'轻松双打') returning id`, [B, V])).id;
  for (const u of [A, C]) await q(`insert into game_participants(game_id,user_id,status,approved_at,created_at,message) values ($1,$2,'approved',now()-interval '4 days',now()-interval '5 days','我想来')`, [g, u]);
  const [a1, b1] = [A, B].sort(); const t = (await one(`insert into threads(kind,user_a,user_b) values ('dm',$1,$2) returning id`, [a1, b1])).id;
  await q(`insert into messages(thread_id,sender_id,body) values ($1,$2,'周六见'),($1,$3,'好的'),($1,$3,'被隐藏的一条')`, [t, A, B]);
  await q(`update messages set hidden=true where body='被隐藏的一条'`);
  const [c1, d1] = [C, D].sort(); const t2 = (await one(`insert into threads(kind,user_a,user_b) values ('dm',$1,$2) returning id`, [c1, d1])).id;
  await q(`insert into messages(thread_id,sender_id,body) values ($1,$2,'别人的私信')`, [t2, C]);
  await q(`insert into player_prefs(user_id,target_id,pref) values ($1,$2,'more'),($3,$1,'less')`, [A, B, D]);      // A 设的；D 对 A 少遇到
  await q(`insert into impressions(game_id,from_id,to_id,kinds) values ($1,$2,$3,'{ontime}'),($1,$3,$2,'{kind}')`, [g, A, C]);
  await q(`insert into reports(reporter_id,target_type,target_id,reason,source,via) values ($1,'user',$2,'harass','in_app','card')`, [D, A]);   // D 举报了 A
  await q(`insert into reports(reporter_id,target_type,target_id,reason,source,via,note) values ($1,'user',$2,'other','in_app','chat','说明')`, [A, D]);
  await q(`insert into blocks(blocker_id,blocked_id) values ($1,$2)`, [A, D]);
  // #71：球拍 / UTR 历史 / 球友（A 有一把球拍、一条 UTR 改动、和 B 是球友、发给 C 的申请被忽略、D 发给 A 的申请等待中）
  await q(`insert into user_rackets(user_id, slot, brand, series) values ($1, 1, 'Head', 'Speed')`, [A]);
  await q(`update users set utr_profile = '1234567', utr_at = now() where id = $1`, [A]);
  await q(`insert into utr_changes(user_id, old_utr, new_utr, old_est, new_est) values ($1, 4, 5.5, true, false)`, [A]);
  const [ba, bb] = [A, B].sort(); await q(`insert into buddies(user_a, user_b) values ($1, $2)`, [ba, bb]);
  await q(`insert into buddy_requests(from_user, to_user, status, responded_at) values ($1, $2, 'ignored', now())`, [A, C]);
  await q(`insert into buddy_requests(from_user, to_user, status, source) values ($1, $2, 'pending', 'link')`, [D, A]);
  r = await call(A, `select api_export_me()`); const X = r.v || {}, XS = JSON.stringify(X);
  T('导出成功', r.ok && X.exported_at && X.profile, r);
  T('包含资料（手机号、邮箱、微信号、同意记录、注册 IP）', X.profile.phone_e164 && X.profile.email === 'amy@x.com' && X.profile.wechat_id && X.profile.privacy_version === 2 && X.profile.signup_ip);
  T('不含登录 id、退订 token', !('auth_id' in X.profile) && !('email_unsub_token' in X.profile));
  T('包含参加的球局（含自己的留言）', X.games_joined.length === 1 && X.games_joined[0].message === '我想来' && X.games_joined[0].venue === 'Brighton TC');
  T('包含自己对话里的消息（对方被隐藏的不含），不含别人的对话', XS.includes('周六见') && XS.includes('好的') && !XS.includes('被隐藏的一条') && !XS.includes('别人的私信'));
  T('包含自己设的多遇到；不含别人对我的少遇到', X.my_preferences.length === 1 && X.my_preferences[0].pref === 'more' && !X.my_preferences.some(p => p.pref === 'less'));
  T('给出的印象有对象；收到的只有数量', X.impressions_given.length === 1 && X.impressions_given[0].kinds[0] === 'ontime' && X.impressions_received_count === 1 && !('impressions_received' in X));
  T('自己的举报、屏蔽在里面；别人举报我的不在（举报人身份不泄露）', X.reports_made.length === 1 && X.blocked.length === 1 && !XS.includes('harass'));
  T('不含风险分', !/risk/.test(Object.keys(X).join(',')));
  // #71：球拍 / UTR 历史 / 球友
  T('#71 导出含 UTR 主页编号（在资料里）和改动历史', X.profile.utr_profile === '1234567' && X.utr_history.length === 1 && +X.utr_history[0].new_utr === 5.5 && X.utr_history[0].old_estimated === true && X.utr_history[0].new_estimated === false, [X.profile.utr_profile, X.utr_history]);
  T('#71 导出含球拍', X.rackets.length === 1 && X.rackets[0].brand === 'Head' && X.rackets[0].series === 'Speed' && X.rackets[0].slot === 1, X.rackets);
  T('#71 导出含球友（对方昵称、成为球友的时间）', X.buddies.length === 1 && typeof X.buddies[0].player === 'string' && !!X.buddies[0].since, X.buddies);
  const sent = X.buddy_requests.find(x => x.direction === 'sent'), got = X.buddy_requests.find(x => x.direction === 'received');
  T('#71 我发出被忽略的申请：导出里是「等待中」，没有处理时间（发起人永远不知道被忽略）', X.buddy_requests.length === 2 && sent.status === 'pending' && sent.responded_at === null && !XS.includes('"ignored"'), X.buddy_requests);
  T('#71 收到的申请：带来源和状态', got.status === 'pending' && got.source === 'link', got);
  await q(`update buddy_requests set expires_at = now() - interval '1 hour' where from_user = $1`, [A]); await q(`delete from rate_hits`);
  r = await call(A, `select api_export_me()`); T('#71 过期后被忽略的申请显示「已失效」', r.ok && r.v.buddy_requests.find(x => x.direction === 'sent').status === 'expired', r.v && r.v.buddy_requests);
  const fnSrc = (await q(`select prosrc from pg_proc where proname = 'api_export_me'`)).rows[0].prosrc;
  const mig = fs.readFileSync(path.join(DIR, 'server/migrations/20261113_export_more.sql'), 'utf8');
  let e1 = null; try { await q(mig); await q(mig) } catch (e) { e1 = e.message } T('#71 迁移连跑两次不报错', e1 === null, e1);
  T('#71 迁移里的函数与 schema.sql 一致', (await q(`select prosrc from pg_proc where proname = 'api_export_me'`)).rows[0].prosrc === fnSrc);
  await q(`delete from buddies`); await q(`delete from buddy_requests`); await q(`delete from user_rackets`); await q(`delete from utr_changes`);   // 清掉本段的数据，后面按总数核对的用例不受影响
  r = await call(A, `select api_export_me()`); T('每天只能导出 1 次', !r.ok && r.err === 'rate_limited' && +r.detail > 80000, r);
  r = await call(null, `select api_export_me()`); T('没登录不能导出', !r.ok && r.err === 'login_required', r);

  // ---------- 关闭「使用数据」 ----------
  const E = await user('Eve');
  await q(`insert into sessions(session_id,anon_id,user_id,build,started_at) values ('s1','anE',$1,'pwa',now()),('s0','anE',null,'pwa',now())`, [E]);
  await q(`insert into link_visits(visitor_id,user_id) values ('anE',$1)`, [E]);
  await q(`insert into events(occurred_at,user_id,anon_id,session_id,build,event) values (now(),$1,'anE','s1','pwa','game_view')`, [E]);
  r = await call(E, `update users set analytics_opt_out=true where id=$1`, [E]); T('本人关闭使用数据', r.ok, r);
  T('关闭时已有的会话、事件、分享打开记录去掉账号关联', +(await one(`select (select count(*) from sessions where user_id=$1)+(select count(*) from events where user_id=$1)+(select count(*) from link_visits where user_id=$1) n`, [E])).n === 0);
  await q(`insert into sessions(session_id,anon_id,user_id,build,started_at) values ('s2','anE',$1,'pwa',now())`, [E]);
  await q(`insert into link_visits(visitor_id,user_id) values ('anE',$1)`, [E]);
  await q(`insert into events(occurred_at,user_id,anon_id,session_id,build,event) values (now(),$1,'anE','s2','pwa','game_view')`, [E]);
  T('之后的会话、分享打开、事件都不写', !(await one(`select 1 x from sessions where session_id='s2'`)) && +(await one(`select count(*) from link_visits where user_id=$1`, [E])).count === 0 && +(await one(`select count(*) from events where session_id='s2'`)).count === 0);
  await q(`insert into sessions(session_id,anon_id,user_id,build,started_at) values ('s3','anX',null,'web',now())`);
  T('没登录的会话照常写（是否发送由前台开关决定）', !!(await one(`select 1 x from sessions where session_id='s3'`)));

  // ---------- 注销匿名化补漏 ----------
  const F = await user('Fay'), G = await user('Gus');
  await q(`update users set status='deleted', status_since=now()-interval '31 days' where id=$1`, [F]);
  await q(`insert into push_subscriptions(user_id,endpoint,p256dh,auth) values ($1,'https://push/f','p','a')`, [F]);
  await q(`insert into user_devices(user_id,platform) values ($1,'mobile')`, [F]);
  await q(`insert into player_prefs(user_id,target_id,pref) values ($1,$2,'less'),($2,$1,'more')`, [F, G]);
  await q(`insert into gender_changes(user_id,from_g,to_g) values ($1,'m','f')`, [F]);
  await q(`insert into user_rackets(user_id,slot,brand,series) values ($1,1,'Head','Speed'),($1,2,null,'老拍'),($2,1,'Wilson','Blade')`, [F, G]);
  const Hh = await user('Hal'); const pr = (x, y) => [x, y].sort();
  await q(`insert into buddies(user_a,user_b) values ($1,$2),($3,$4),($5,$6)`, [...pr(F, G), ...pr(F, Hh), ...pr(G, Hh)]);
  await q(`insert into buddy_requests(from_user,to_user) values ($1,$2),($2,$3),($3,$2)`, [F, G, Hh]);
  const gf = (await one(`insert into games(share_code,host_id,venue_id,starts_at,duration_min,game_type,capacity,utr_min,utr_max) values ('pv2',$1,$2,now()-interval '40 days',90,'singles',2,3,7) returning id`, [G, V])).id;
  await q(`insert into impressions(game_id,from_id,to_id,kinds) values ($1,$2,$3,'{ontime}'),($1,$3,$2,'{kind}')`, [gf, F, G]);
  await q(`insert into email_outbox(user_id,to_email,kind,merge_key,subject,send_after) values ($1,'fay@x.com','result','k','s',now()),($1,'fay@x.com','result','k2','s',now())`, [F]);
  await q(`update email_outbox set status='sent', sent_at=now() where merge_key='k2'`);
  const [f1, g1] = [F, G].sort(); const tf = (await one(`insert into threads(kind,user_a,user_b) values ('dm',$1,$2) returning id`, [f1, g1])).id;
  await q(`insert into messages(thread_id,sender_id,body) values ($1,$2,'以前的消息')`, [tf, F]);
  r = await svc(`select job_anonymize_deleted()`); T('匿名化任务运行', r.ok && r.v === 1, r);
  const fu = await one(`select * from users where id=$1`, [F]);
  T('性别、注册设备 / IP、退订 token 清空', fu.gender === null && fu.signup_device === null && fu.signup_ip === null && fu.email_unsub_token === null && fu.nickname === '已注销' && fu.email === null);
  T('旧推送订阅、设备、改性别记录删除', +(await one(`select (select count(*) from push_subscriptions where user_id=$1)+(select count(*) from user_devices where user_id=$1)+(select count(*) from gender_changes where user_id=$1) n`, [F])).n === 0);
  T('球友：注销匿名化后删除 TA 的球友关系和申请，别人之间的不动（#110）', +(await one(`select count(*) from buddies where $1 in (user_a,user_b)`, [F])).count === 0
    && +(await one(`select count(*) from buddy_requests where $1 in (from_user,to_user)`, [F])).count === 0 && +(await one(`select count(*) from buddies`)).count === 1 && +(await one(`select count(*) from buddy_requests`)).count === 2);
  T('我的球拍：注销匿名化后删除，别人的不动（#60 A2）', +(await one(`select count(*) from user_rackets where user_id=$1`, [F])).count === 0 && +(await one(`select count(*) from user_rackets where user_id=$1`, [G])).count === 1);
  T('本人设的偏好删除；别人对 TA 的保留', !(await one(`select 1 x from player_prefs where user_id=$1`, [F])) && !!(await one(`select 1 x from player_prefs where user_id=$1 and target_id=$2`, [G, F])));
  T('印象保留计入汇总（两个方向）', +(await one(`select count(*) from impressions where game_id=$1`, [gf])).count === 2);
  const ob = (await q(`select to_email, status, skip_reason from email_outbox where user_id=$1 order by merge_key`, [F])).rows;
  T('邮件记录里的邮箱清空；没发的不再发', ob.every(o => o.to_email === 'deleted') && ob[0].status === 'skipped' && ob[1].status === 'sent', ob);
  T('聊天保留（显示已注销）', !!(await one(`select 1 x from messages where thread_id=$1`, [tf])));

  // ---------- 保存期限 ----------
  await q(`insert into events(occurred_at,user_id,anon_id,session_id,build,event) values (now()-interval '26 months',null,'old','so','pwa','game_view'),(now()-interval '24 months',null,'mid','sm','pwa','game_view')`);
  await q(`insert into sessions(session_id,anon_id,build,started_at) values ('so','old','pwa',now()-interval '26 months'),('sm','mid','pwa',now()-interval '24 months')`);
  await q(`insert into link_visits(visitor_id,created_at) values ('old',now()-interval '26 months'),('mid',now()-interval '24 months')`);
  const nOld = (await one(`insert into notifications(user_id,kind,created_at) values ($1,'badge',now()-interval '13 months') returning id`, [B])).id;
  const nNew = (await one(`insert into notifications(user_id,kind,created_at) values ($1,'badge',now()-interval '11 months') returning id`, [B])).id;
  await q(`insert into notification_deliveries(notification_id,channel,reason) values ($1,'none','no_push')`, [nOld]);
  await q(`insert into email_outbox(user_id,to_email,kind,merge_key,subject,send_after,status,sent_at,created_at) values
    ($1,'b@x.com','result','old','s',now()-interval '100 days','sent',now()-interval '100 days',now()-interval '100 days'),
    ($1,'b@x.com','result','new','s',now()-interval '30 days','sent',now()-interval '30 days',now()-interval '30 days'),
    ($1,'b@x.com','result','q','s',now()-interval '100 days','queued',null,now()-interval '100 days')`, [B]);
  const rpOld = (await one(`insert into reports(reporter_id,target_type,target_id,reason,source,via,note,status,handled_at) values ($1,'user',$2,'other','in_app','card','很久以前的说明','dismissed',now()-interval '25 months') returning id`, [C, B])).id;
  const rpOpen = (await one(`insert into reports(reporter_id,target_type,target_id,reason,source,via,note,created_at) values ($1,'user',$2,'other','in_app','card','还没处理',now()-interval '3 years') returning id`, [B, C])).id;
  const adm = (await one(`insert into admin_users(email,name,role,password_hash,totp_secret) values ('o@x.com','O','owner','h','t') returning id`)).id;
  await q(`insert into admin_audit_log(admin_id,action,at) values ($1,'old',now()-interval '25 months'),($1,'new',now()-interval '23 months')`, [adm]);
  r = await q(`delete from admin_audit_log where action='old'`).then(() => ({ ok: true }), e => ({ ok: false, err: e.message })); T('平时不能删操作日志（即使很旧）', !r.ok, r);
  r = await svc(`select job_nightly()`); T('每晚任务（含保存期限）运行', r.ok, r);
  T('原始事件 / 会话 / 分享打开：25 个月前的删，之内的留', !(await one(`select 1 x from events where anon_id='old'`)) && !!(await one(`select 1 x from events where anon_id='mid'`))
    && !(await one(`select 1 x from sessions where session_id='so'`)) && !!(await one(`select 1 x from sessions where session_id='sm'`)) && !(await one(`select 1 x from link_visits where visitor_id='old'`)) && !!(await one(`select 1 x from link_visits where visitor_id='mid'`)));
  T('通知 12 个月（送达记录一起删）', !(await one(`select 1 x from notifications where id=$1`, [nOld])) && !!(await one(`select 1 x from notifications where id=$1`, [nNew])) && !(await one(`select 1 x from notification_deliveries where notification_id=$1`, [nOld])));
  T('补发邮件记录 90 天（排队中的不删）', (await q(`select merge_key from email_outbox where user_id=$1 order by merge_key`, [B])).rows.map(x => x.merge_key).join() === 'new,q');
  T('已处理举报 2 年后删说明；未处理的不动', (await one(`select note from reports where id=$1`, [rpOld])).note === '（已过保存期限，说明已删除）' && (await one(`select note from reports where id=$1`, [rpOpen])).note === '还没处理');
  T('后台操作日志 2 年', (await q(`select action from admin_audit_log`)).rows.map(x => x.action).join() === 'new');
  r = await q(`delete from admin_audit_log`).then(() => ({ ok: true }), e => ({ ok: false, err: e.message })); T('任务结束后又不能删', !r.ok, r);
  T('记了 job_runs', !!(await one(`select 1 x from job_runs where job='retention'`)));
  r = await call(A, `select job_retention()`); T('前台不能跑保存期限任务', !r.ok && /permission denied/.test(r.err), r);
} catch (e) { fail++; console.log('FAIL 异常 ' + (e.stack || e)) }
finally { if (pool) await pool.end().catch(() => { }); c.stop() }
console.log(`privacy: ${pass} 通过, ${fail} 失败`); process.exit(fail ? 1 : 0);
