// 第五批 5c：后台管理员（schema ⑰ + server/admin/auth.mjs）。登录（密码、两步验证、恢复码、锁定、防重放）、会话（12 小时 / 闲置 1 小时 / 撤销 / 停用）、
// 三种角色逐个函数能 / 不能、必须填理由、操作日志、后台不能直接读私信只能看被举报的那段、封禁的连带处理、至少保留一位 owner。
import { createRequire } from 'module'; import path from 'path'; import { fileURLToPath, pathToFileURL } from 'url';
import { startCluster, loadSchema } from './cluster.mjs';
const require = createRequire(import.meta.url); const pg = require('pg');
const HERE = path.dirname(fileURLToPath(import.meta.url)), DIR = process.env.NBQ_DIR || path.join(HERE, '..', '..');
const AU = await import(pathToFileURL(path.join(DIR, 'server/admin/auth.mjs')));
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 500) : '')) };

// ---------- 纯计算 ----------
const K = Buffer.from('12345678901234567890');
T('HOTP / TOTP 与 RFC 6238 测试向量一致（59 秒 → 94287082；1111111109 秒 → 07081804）', AU.hotp(K, 1, 8) === '94287082' && AU.hotp(K, Math.floor(1111111109 / 30), 8) === '07081804');
const SEC = AU.b32encode(K);
T('Base32 往返', SEC === 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ' && AU.b32decode(SEC).equals(K));
const t0 = 1_800_000_000_000, c0 = AU.totp(SEC, t0);
T('两步验证码：当前、前后 30 秒都能用；更早的不行', AU.verifyTotp(SEC, c0, t0) === Math.floor(t0 / 30e3) && AU.verifyTotp(SEC, AU.totp(SEC, t0 - 30e3), t0) != null && AU.verifyTotp(SEC, AU.totp(SEC, t0 + 30e3), t0) != null && AU.verifyTotp(SEC, AU.totp(SEC, t0 - 90e3), t0) === null);
T('两步验证码：已用过的时间步不能再用；格式不对直接拒绝', AU.verifyTotp(SEC, c0, t0, Math.floor(t0 / 30e3)) === null && AU.verifyTotp(SEC, '12345', t0) === null && AU.verifyTotp(SEC, 'abcdef', t0) === null);
const PH = AU.hashPassword('correct horse battery');
T('密码：scrypt 存储、能校验、错的不行、太短不收', PH.startsWith('scrypt$') && AU.verifyPassword('correct horse battery', PH) && !AU.verifyPassword('correct horse batterx', PH) && (() => { try { AU.hashPassword('short'); return false } catch (e) { return true } })());
const RC = AU.newRecoveryCodes();
T('恢复码：10 个 xxxx-xxxx，只存哈希', RC.codes.length === 10 && RC.codes.every(c => /^[0-9a-f]{4}-[0-9a-f]{4}$/.test(c)) && RC.hashes.every(h => /^[0-9a-f]{64}$/.test(h)) && AU.recoveryHash(RC.codes[0].toUpperCase()) === RC.hashes[0]);
T('会话 Cookie：HttpOnly、Secure、SameSite=Strict、只在 /admin', /HttpOnly/.test(AU.COOKIE('x')) && /Secure/.test(AU.COOKIE('x')) && /SameSite=Strict/.test(AU.COOKIE('x')) && /Path=\/admin/.test(AU.COOKIE('x')));
T('二维码地址', /^otpauth:\/\/totp\/.*secret=[A-Z2-7]+&issuer=/.test(AU.totpURI(SEC, 'a@b.c')));

const c = startCluster(); let pool;
try {
  c.createdb('nbq');
  const errs = loadSchema(c, 'nbq', path.join(DIR, 'schema.sql')); T('schema 执行无错误', !errs.length, errs.slice(0, 3));
  pool = new pg.Pool({ host: c.host, port: c.port, user: 'postgres', database: 'nbq', max: 6 });
  const q = (s, p) => pool.query(s, p), one = async (s, p) => (await q(s, p)).rows[0];
  const err = e => e.code || e.message;
  // 管理员：两位 owner、一位运营、一位只读
  const mk = async (email, role, rc = []) => (await one(`insert into admin_users(email,name,role,password_hash,totp_secret,recovery_hashes) values ($1,$2,$3,$4,$5,$6) returning id`, [email, email.split('@')[0], role, PH, SEC, rc])).id;
  const O1 = await mk('han@x.com', 'owner', RC.hashes), O2 = await mk('backup@x.com', 'owner'), OP = await mk('ops@x.com', 'operator'), VW = await mk('view@x.com', 'viewer');

  // ---------- 登录 ----------
  let now = t0, r;
  const login = (email, o = {}) => AU.adminLogin(pool, { email, password: 'correct horse battery', code: AU.totp(SEC, now), now, ip: '1.2.3.4', ua: 'test', ...o }).then(x => x, e => ({ err: err(e), detail: e.detail }));
  r = await login('han@x.com'); T('邮箱 + 密码 + 两步验证码 → 登录成功，拿到令牌', r.token && r.role === 'owner' && /nbq_admin=/.test(r.cookie), r);
  const tokOwner = r.token;
  T('数据库只存令牌的 sha256', !!(await one(`select 1 x from admin_sessions where token_hash=$1`, [AU.tokenHash(tokOwner)])) && !(await one(`select 1 x from admin_sessions where token_hash=$1`, [tokOwner])));
  r = await login('han@x.com'); T('同一个两步验证码不能用第二次', r.err === 'admin_bad_login', r);
  now += 30e3; r = await login('han@x.com'); T('下一个 30 秒的码可以', !!r.token, r);
  { const step = (await one(`select totp_last_step s from admin_users where id=$1`, [O1])).s;
    const cl = await pool.connect(); try { await cl.query('begin'); await cl.query('set local role nbq_service');
      r = await cl.query(`select admin_login_finish($1,true,null,null,$2,$3)`, [O1, 'f'.repeat(64), step]).then(() => ({ ok: true }), e => ({ ok: false, err: e.message, detail: e.detail })); await cl.query('rollback') } finally { cl.release() }
    T('数据库也拒绝用过的两步验证时间步（双保险）', !r.ok && r.err === 'admin_bad_login' && r.detail === 'totp_reused', r) }
  r = await login('han@x.com', { password: 'wrong password!!' }); T('密码错 → admin_bad_login（不说哪一步错）', r.err === 'admin_bad_login', r);
  r = await login('nobody@x.com'); T('没这个人 → 同样的 admin_bad_login', r.err === 'admin_bad_login', r);
  for (let i = 0; i < 4; i++) await login('ops@x.com', { code: '000000' });
  r = await login('ops@x.com', { code: '000000' }); r = await login('ops@x.com');
  T('连错 5 次锁 15 分钟（对的也进不去，告诉剩余秒数）', r.err === 'admin_locked' && +r.detail > 800, r);
  await q(`update admin_users set locked_until=now()-interval '1 second' where id=$1`, [OP]);
  now += 30e3; r = await login('ops@x.com'); T('锁定过了就能登录，失败次数清零', !!r.token && (await one(`select failed_logins from admin_users where id=$1`, [OP])).failed_logins === 0, r);
  const tokOp = r.token;
  r = await login('han@x.com', { code: null, recovery: RC.codes[0] }); T('恢复码可以代替两步验证码', !!r.token, r);
  r = await login('han@x.com', { code: null, recovery: RC.codes[0] }); T('恢复码只能用一次', r.err === 'admin_bad_login', r);
  T('恢复码剩 9 个，登录方式记进日志', (await one(`select cardinality(recovery_hashes) n from admin_users where id=$1`, [O1])).n === 9 && !!(await one(`select 1 x from admin_audit_log where action='login.recovery'`)));
  T('失败的登录也记日志', +(await one(`select count(*) from admin_audit_log where action='login.fail'`)).count >= 6);
  now += 30e3; const tokView = (await login('view@x.com')).token;

  // ---------- 会话 ----------
  const req = (tok, sql, p) => AU.adminRequest(pool, tok, db => db.query(sql, p).then(x => x.rows[0] && Object.values(x.rows[0])[0]), { ip: '1.2.3.4' }).then(v => ({ ok: true, v }), e => ({ ok: false, err: err(e), detail: e.detail }));
  r = await req(tokOwner, `select count(*)::int from users`); T('有效会话可以访问', r.ok, r);
  r = await req('bogus', `select 1`); T('假令牌 → admin_session_expired', r.err === 'admin_session_expired', r);
  await q(`update admin_sessions set last_seen_at=now()-interval '61 minutes' where token_hash=$1`, [AU.tokenHash(tokView)]);
  r = await req(tokView, `select 1`); T('闲置超过 1 小时 → 过期', r.err === 'admin_session_expired', r);
  const s2 = (await login('backup@x.com', { code: AU.totp(SEC, now + 60e3), now: now + 60e3 })).token;
  await q(`update admin_sessions set expires_at=now()-interval '1 second' where token_hash=$1`, [AU.tokenHash(s2)]);
  r = await req(s2, `select 1`); T('超过 12 小时 → 过期', r.err === 'admin_session_expired', r);
  const s3 = (await login('backup@x.com', { code: AU.totp(SEC, now + 90e3), now: now + 90e3 })).token;
  await AU.adminLogout(pool, s3); r = await req(s3, `select 1`); T('退出后令牌失效', r.err === 'admin_session_expired', r);
  const tokView2 = (await login('view@x.com', { code: AU.totp(SEC, now + 120e3), now: now + 120e3 })).token;
  r = await req(tokView2, `select count(*) from users`); T('只读管理员以 nbq_viewer 连接（读不到球友表）', !r.ok && /permission denied/.test(r.err), r);
  r = await req(tokView2, `select count(*)::int from admin_perms`); T('只读能看权限表（R4 加了城市两项，S4 加了场边配置）', r.ok && r.v === 20, r);

  // ---------- 准备业务数据 ----------
  let un = 0; const user = async nick => (await one(`insert into users(phone_e164,nickname,utr,gender,pact_accepted_at) values ($1,$2,5,'m',now()) returning id`, ['+6142' + String(++un).padStart(7, '0'), nick])).id;
  const U1 = await user('Bad'), U2 = await user('Host'), U3 = await user('Rep'), U4 = await user('Mate');
  await q(`insert into suburbs(name,postcode,centroid) values ('Brighton','3186','POINT(145 -37.9)')`);
  const V = (await one(`insert into venues(name,short_name,suburb,postcode,location,surfaces,status) values ('Brighton TC','Brighton TC','Brighton','3186','POINT(145 -37.9)','{hard}','active') returning id`)).id;
  const VP = (await one(`insert into venues(name,short_name,suburb,postcode,location,surfaces,status) values ('New Court','New Court','Brighton','3186','POINT(145 -37.9)','{hard}','pending') returning id`)).id;
  const game = async (host, start) => (await one(`insert into games(share_code,host_id,venue_id,starts_at,duration_min,game_type,capacity,utr_min,utr_max) values ($1,$2,$3,${start},90,'doubles',4,3,7) returning id`, ['a' + (++un), host, V])).id;
  const gJoin = await game(U2, "now()+interval '2 days'"), gPend = await game(U2, "now()+interval '3 days'"), gHost = await game(U1, "now()+interval '2 days'");
  await q(`insert into game_participants(game_id,user_id,status,approved_at) values ($1,$2,'approved',now())`, [gJoin, U1]);
  await q(`insert into game_participants(game_id,user_id,status) values ($1,$2,'pending')`, [gPend, U1]);
  await q(`insert into game_participants(game_id,user_id,status,approved_at) values ($1,$2,'approved',now())`, [gHost, U4]);
  await q(`insert into invites(from_user,to_user,starts_at,ends_at,venue_id,game_type) values ($1,$2,now()+interval '1 day',now()+interval '1 day 1 hour',$3,'singles')`, [U1, U4, V]);
  const [a, b] = [U1, U3].sort(); const th = (await one(`insert into threads(kind,user_a,user_b) values ('dm',$1,$2) returning id`, [a, b])).id;
  const [c1, d1] = [U2, U4].sort(); const thOther = (await one(`insert into threads(kind,user_a,user_b) values ('dm',$1,$2) returning id`, [c1, d1])).id;
  await q(`insert into messages(thread_id,sender_id,body,created_at) values ($1,$2,'很久以前',now()-interval '30 days'),($1,$2,'骚扰的话',now()-interval '1 hour'),($1,$3,'请别这样',now()-interval '50 minutes')`, [th, U1, U3]);
  await q(`insert into messages(thread_id,sender_id,body) values ($1,$2,'无关的私信')`, [thOther, U2]);
  const RP = (await one(`insert into reports(reporter_id,target_type,target_id,reason,source,via,context_ref) values ($1,'user',$2,'harass','in_app','chat',$3) returning id`, [U3, U1, th])).id;
  const RP2 = (await one(`insert into reports(reporter_id,target_type,target_id,reason,source,via) values ($1,'user',$2,'harass','in_app','card') returning id`, [U4, U2])).id;

  // ---------- 后台不能直接读私信、不能直接改表 ----------
  r = await req(tokOwner, `select count(*) from messages`); T('owner 也不能直接读私信表', !r.ok && /permission denied/.test(r.err), r);
  for (const [n, sql] of [['改账号状态', `update users set status='banned'`], ['改举报', `update reports set status='dismissed'`], ['隐藏消息', `update messages set hidden=true`], ['写操作日志', `insert into admin_audit_log(admin_id,action) values ('${OP}','x')`], ['改风险规则', `update risk_rules set weight=0`]]) {
    r = await req(tokOp, sql); T(`后台不能直接${n}`, !r.ok && /permission denied/.test(r.err), r) }

  // ---------- 举报：看被举报的对话 ----------
  r = await req(tokOp, `select count(*)::int from admin_report_messages($1, null)`, [RP]); T('看被举报的对话必须填理由', r.err === 'admin_reason_required', r);
  r = await req(tokOp, `select json_agg(body order by created_at) from admin_report_messages($1, '核实骚扰举报')`, [RP]);
  T('只返回被举报那段对话、举报前 7 天到后 1 天', r.ok && JSON.stringify(r.v) === JSON.stringify(['骚扰的话', '请别这样']), r);
  r = await req(tokOp, `select json_agg(body) from admin_report_messages($1, '核实举报内容')`, [RP2]); T('球员卡举报：看举报人和被举报人之间的私信', r.ok && JSON.stringify(r.v) === '["无关的私信"]', r);
  const RP3 = (await one(`insert into reports(reporter_id,target_type,target_id,reason,source,via) values ($1,'user',$2,'harass','in_app','card') returning id`, [U2, U3])).id;
  r = await req(tokOp, `select count(*)::int from admin_report_messages($1, '核实举报内容')`, [RP3]); T('两人没有私信就什么都不返回（不会看到别的对话）', r.ok && r.v === 0, r);
  const log = await one(`select admin_id, detail from admin_audit_log where action='message.read' order by id desc limit 1`);
  T('看对话记进操作日志（谁、哪条举报、理由）', log && log.admin_id === OP && log.detail.reason === '核实举报内容', log);
  const M = (await one(`select id from messages where body='骚扰的话'`)).id;
  r = await req(tokOp, `select admin_message_hide($1, '骚扰内容')`, [M]); T('隐藏消息（带理由）', r.ok && (await one(`select hidden from messages where id=$1`, [M])).hidden === true, r);
  r = await req(tokOp, `select admin_report_handle($1, 'actioned', '已隐藏并处理')`, [RP]); T('处理举报', r.ok && (await one(`select status, handled_by from reports where id=$1`, [RP])).handled_by === OP, r);
  r = await req(tokOp, `select admin_report_handle($1, 'dismissed')`, [RP]); T('已处理的再处理 → state_changed', r.err === 'state_changed', r);

  // ---------- 账号状态 ----------
  r = await req(tokOp, `select admin_user_status($1,'suspended','harass','x',7)`, [U1]); T('理由太短 → admin_reason_required', r.err === 'admin_reason_required', r);
  r = await req(tokOp, `select admin_user_status($1,'suspended','harass','多次骚扰球友',5)`, [U1]); T('暂停天数只能 1/3/7/30/90/180', r.err === 'invalid' && r.detail === 'days', r);
  r = await req(tokOp, `select admin_user_banned_x()`); T('不存在的函数', !r.ok);
  r = await req(tokOp, `select admin_user_status($1,'banned','harass','多次骚扰球友')`, [U1]); T('运营不能封禁（只有 owner）', r.err === 'admin_forbidden' && r.detail === 'user.ban', r);
  r = await req(tokOp, `select admin_user_status($1,'suspended','harass','多次骚扰球友',7)`, [U1]); T('运营可以暂停 7 天', r.ok, r);
  const u1 = await one(`select status, status_until, status_reason from users where id=$1`, [U1]);
  T('暂停：状态、到期时间、原因', u1.status === 'suspended' && Math.abs(new Date(u1.status_until) - Date.now() - 7 * 864e5) < 6e4 && u1.status_reason === 'harass', u1);
  T('暂停的连带处理：待确认的申请撤回；已加入的局保留', (await one(`select status from game_participants where game_id=$1 and user_id=$2`, [gPend, U1])).status === 'withdrawn' && (await one(`select status from game_participants where game_id=$1 and user_id=$2`, [gJoin, U1])).status === 'approved');
  const sl = await one(`select * from user_status_log where user_id=$1 order by id desc limit 1`, [U1]);
  T('状态记录：谁做的、原因、天数', sl.by_admin === OP && sl.reason === '骚扰' && sl.duration_days === 7 && sl.note === '多次骚扰球友', sl);
  T('通知本人', !!(await one(`select 1 x from notifications where user_id=$1 and kind='account_status'`, [U1])));
  r = await req(tokOwner, `select admin_user_status($1,'banned','harass','暂停期间仍骚扰')`, [U1]); T('owner 可以封禁', r.ok, r);
  T('封禁的连带处理：退出未开打的局并通知发起人', (await one(`select status from game_participants where game_id=$1 and user_id=$2`, [gJoin, U1])).status === 'left' && !!(await one(`select 1 x from notifications where user_id=$1 and kind='player_left' and game_id=$2`, [U2, gJoin])));
  T('封禁的连带处理：取消发起的未开打球局并通知、撤回邀约', (await one(`select status from games where id=$1`, [gHost])).status === 'cancelled' && !!(await one(`select 1 x from notifications where user_id=$1 and kind='game_cancelled'`, [U4])) && (await one(`select status from invites where from_user=$1`, [U1])).status === 'withdrawn');
  r = await req(tokOp, `select admin_user_status($1,'active',null,'申诉成功恢复')`, [U1]); T('恢复已封禁的账号只有 owner', r.err === 'admin_forbidden', r);
  r = await req(tokOwner, `select admin_user_status($1,'active',null,'申诉成功恢复')`, [U1]); T('owner 恢复', r.ok && (await one(`select status from users where id=$1`, [U1])).status === 'active', r);
  r = await req(tokOp, `select admin_user_reset($1,'nickname','昵称含不当内容')`, [U2]); T('重置昵称', r.ok && (await one(`select nickname from users where id=$1`, [U2])).nickname.startsWith('球友'), r);
  r = await req(tokOp, `select admin_user_gender($1,'clear','性别信息待重新确认')`, [U2]); T('清除性别', r.ok && (await one(`select gender from users where id=$1`, [U2])).gender === null, r);

  // ---------- 只有 owner ----------
  r = await req(tokOp, `select admin_reveal_phone($1,'需要电话联系')`, [U3]); T('运营不能看完整手机号', r.err === 'admin_forbidden', r);
  r = await req(tokOwner, `select admin_reveal_phone($1,null)`, [U3]); T('owner 看手机号也要填理由', r.err === 'admin_reason_required', r);
  r = await req(tokOwner, `select admin_reveal_phone($1,'警方依法调取')`, [U3]); T('owner 填理由后可以看，并记日志', r.ok && /^\+614/.test(r.v) && !!(await one(`select 1 x from admin_audit_log where action='phone.reveal' and detail->>'reason'='警方依法调取'`)), r);
  r = await req(tokOp, `select admin_export('games', false)`); T('运营可以导出统计', r.ok, r);
  r = await req(tokOp, `select admin_export('users', true, '对账需要用户 ID')`); T('运营不能导出带用户 ID 的数据', r.err === 'admin_forbidden' && r.detail === 'data.export_ids', r);
  r = await req(tokOwner, `select admin_export('users', true, '对账需要用户 ID')`); T('owner 可以（记日志）', r.ok && !!(await one(`select 1 x from admin_audit_log where action='data.export_ids'`)), r);
  r = await req(tokOp, `select admin_rule_set('risk','no_show','{"threshold":3}','误伤太多先放宽')`); T('运营不能改规则', r.err === 'admin_forbidden', r);
  r = await req(tokOwner, `select admin_rule_set('risk','no_show','{"threshold":3}','误伤太多先放宽')`);
  const rl = await one(`select detail from admin_audit_log where action='rules.edit' order by id desc limit 1`);
  T('owner 改规则：生效、日志记改前和改后', r.ok && +(await one(`select threshold from risk_rules where code='no_show'`)).threshold === 3 && +rl.detail.before.threshold === 2 && rl.detail.patch.threshold === 3, [r, rl]);
  r = await req(tokOwner, `select admin_rule_set('rate','msg_minute','{"max_hits":12}','节假日放宽一点')`); T('改频率规则', r.ok && (await one(`select max_hits from rate_rules where rule='msg_minute'`)).max_hits === 12, r);

  // ---------- 球场、风险 ----------
  r = await req(tokOp, `select admin_venue_review($1,'merge',null)`, [VP]); T('合并必须指定合并到哪个已收录的球场', r.err === 'invalid', r);
  r = await req(tokOp, `select admin_venue_review($1,'merge',$2)`, [VP, V]); T('合并球场', r.ok && (await one(`select status, merged_into from venues where id=$1`, [VP])).merged_into === V, r);
  await q(`insert into risk_rules(code,name,weight,threshold,window_days) values ('t_rule','测试',10,1,30) on conflict do nothing`);
  const AL = (await one(`insert into risk_alerts(user_id,rule_code,value,score,window_from,window_to) values ($1,'t_rule',1,10,now()-interval '1 day',now()) returning id`, [U2])).id;
  r = await req(tokOp, `select admin_risk_alert($1,'watching','先观察一周')`, [AL]); const al = await one(`select status, watch_until, reviewed_by from risk_alerts where id=$1`, [AL]);
  T('风险提醒：观察 7 天', r.ok && al.status === 'watching' && al.reviewed_by === OP && Math.abs(new Date(al.watch_until) - Date.now() - 7 * 864e5) < 6e4, [r, al]);

  // ---------- 管理员管理 ----------
  r = await req(tokOp, `select admin_add('new@x.com','New','operator','h','s','{}','新运营入职')`); T('运营不能加管理员', r.err === 'admin_forbidden', r);
  r = await req(tokOwner, `select admin_add('new@x.com','New','operator','h','s','{}','新运营入职')`); T('owner 加管理员', r.ok && (await one(`select created_by from admin_users where email='new@x.com'`)).created_by === O1, r);
  const NEW = (await one(`select id from admin_users where email='new@x.com'`)).id;
  r = await req(tokOwner, `select admin_update($1,null,true,'离职停用')`, [OP]); T('停用运营', r.ok, r);
  r = await req(tokOp, `select 1`); T('停用后会话立即失效', r.err === 'admin_session_expired', r);
  T('停用时会话全部标记撤销', +(await one(`select count(*) from admin_sessions where admin_id=$1 and revoked_at is null`, [OP])).count === 0);
  r = await login('ops@x.com', { code: AU.totp(SEC, now + 150e3), now: now + 150e3 }); T('停用后不能登录', r.err === 'admin_bad_login', r);
  r = await req(tokOwner, `select admin_update($1,null,true,'测试停用自己')`, [O1]); T('不能停用自己', r.err === 'admin_last_owner', r);
  r = await req(tokOwner, `select admin_update($1,null,true,'备用 owner 离开')`, [O2]); T('停用备用 owner', r.ok, r);
  T('owner 只剩 1 位时提示', +(await one(`select owners from admin_health`)).owners === 1);
  r = await req(tokOwner, `select admin_update($1,'operator',null,'测试降级自己')`, [O1]); T('最后一位 owner 不能降级', r.err === 'admin_last_owner', r);
  r = await req(tokOwner, `select admin_update($1,'owner',false,'恢复备用 owner')`, [O2]); T('恢复备用 owner', r.ok && +(await one(`select owners from admin_health`)).owners === 2, r);
  r = await req(tokOwner, `select admin_update($1,'viewer',null,'改为只读')`, [NEW]); T('改角色', r.ok && (await one(`select role from admin_users where id=$1`, [NEW])).role === 'viewer', r);

  // ---------- 权限与日志 ----------
  r = await req(tokView2, `select admin_export('games', false)`); T('只读管理员不能调任何后台写函数', !r.ok && /permission denied/.test(r.err), r);
  const cl = await pool.connect(); try { await cl.query('begin'); await cl.query('set local role nbq_user'); r = await cl.query(`select admin_reveal_phone($1,'x')`, [U3]).then(() => ({ ok: true }), e => ({ ok: false, err: e.message })); await cl.query('rollback') } finally { cl.release() }
  T('前台身份调不了后台函数', !r.ok && /permission denied/.test(r.err), r);
  r = await req(tokOwner, `select password_hash from admin_users limit 1`); T('后台读不到密码哈希', !r.ok, r);
  r = await req(tokOwner, `select recovery_hashes from admin_users limit 1`); T('后台读不到恢复码哈希', !r.ok, r);
  r = await req(tokOwner, `select count(*) from admin_sessions`); T('后台读不到会话表', !r.ok, r);
  const ip = await one(`select ip::text from admin_audit_log where action='phone.reveal'`); T('操作日志记了管理员 IP', ip && ip.ip.startsWith('1.2.3.4'), ip);
  T('每个写操作都有日志', +(await one(`select count(distinct action) from admin_audit_log where action in ('user.status','user.ban','user.reset','user.gender','phone.reveal','report.handle','message.read','message.hide','venue.review','risk.handle','data.export','data.export_ids','rules.edit','admin.manage')`)).count === 14);
} catch (e) { fail++; console.log('FAIL 异常 ' + (e.stack || e)) }
finally { if (pool) await pool.end().catch(() => { }); c.stop() }
console.log(`admin: ${pass} 通过, ${fail} 失败`); process.exit(fail ? 1 : 0);
