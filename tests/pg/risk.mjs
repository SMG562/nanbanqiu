// 第五批 5a-2：滥用识别（schema ⑮）。19 条风险规则逐条用真实表的数据触发、差一点不触发；风险分 / 提醒的重算、处理后不重复打扰、
// 观察期满回到待处理；新信号的记录（留联系方式、撤回、被拒操作）；昵称规则（数据库与前台 NICK_BAD 同一套）；后台规则表与数据库一致；权限与清理。
import { createRequire } from 'module'; import path from 'path'; import fs from 'fs'; import vm from 'vm'; import { fileURLToPath } from 'url';
import { startCluster, loadSchema } from './cluster.mjs';
const require = createRequire(import.meta.url); const pg = require('pg');
const HERE = path.dirname(fileURLToPath(import.meta.url)), DIR = process.env.NBQ_DIR || path.join(HERE, '..', '..');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 600) : '')) };
const src = f => fs.readFileSync(path.join(DIR, f), 'utf8');

// 前台 / 后台里的同名常量
const grabConst = (h, name) => { const m = h.match(new RegExp(`const ${name}=([\\s\\S]*?);\\n`)); return m ? vm.runInNewContext('(' + m[1] + ')') : null };
const NICK = { PWA: grabConst(src('南伴球_PWA.html'), 'NICK_BAD'), Web: grabConst(src('南伴球_Web.html'), 'NICK_BAD') };
const ADMIN_RULES = grabConst(src('南伴球_后台.html'), 'RISK_RULES');

const c = startCluster(); let pool;
try {
  c.createdb('nbq');
  const errs = loadSchema(c, 'nbq', path.join(DIR, 'schema.sql')); T('schema 执行无错误', !errs.length, errs.slice(0, 3));
  pool = new pg.Pool({ host: c.host, port: c.port, user: 'postgres', database: 'nbq', max: 6 });
  const q = (s, p) => pool.query(s, p), one = async (s, p) => (await q(s, p)).rows[0];
  const as = (role) => async (uid, sql, params) => { const cl = await pool.connect();
    try { await cl.query('begin'); await cl.query(`set local role ${role}`); if (uid) await cl.query(`select set_config('nbq.uid', $1, true)`, [uid]);
      const r = await cl.query(sql, params); await cl.query('commit'); return { ok: true, v: r.rows[0] && Object.values(r.rows[0])[0], rows: r.rows } }
    catch (e) { await cl.query('rollback').catch(() => { }); return { ok: false, err: e.message, detail: e.detail } } finally { cl.release() } };
  const call = as('nbq_user'), svc = (sql, p) => as('nbq_service')(null, sql, p), adm = (sql, p) => as('nbq_admin')(null, sql, p);
  let un = 0; const user = async (age = '60 days', extra = {}) => { const id = (await one(`insert into users(phone_e164,nickname,utr,gender,pact_accepted_at,created_at,signup_device,signup_ip)
      values ($1,$2,5,'m',now(),now()-$3::interval,$4,$5) returning id`, ['+6140' + String(++un).padStart(7, '0'), 'P' + un, age, extra.dev || null, extra.ip || null])).id; return id };
  await q(`insert into suburbs(name,postcode,centroid) values ('Brighton','3186','POINT(145 -37.9)')`);
  const V = (await one(`insert into venues(name,short_name,suburb,postcode,location,surfaces,status) values ('Brighton TC','Brighton TC','Brighton','3186','POINT(145 -37.9)','{hard}','active') returning id`)).id;
  let gn = 0; const game = async (host, start, cap = 4) => (await one(`insert into games(share_code,host_id,venue_id,starts_at,duration_min,game_type,capacity,utr_min,utr_max)
      values ($1,$2,$3,${start},90,'doubles',$4,3,7) returning id`, ['k' + (++gn), host, V, cap])).id;
  const part = (g, u, cols) => q(`insert into game_participants(game_id,user_id,${Object.keys(cols).join(',')}) values ($1,$2,${Object.keys(cols).map((_, i) => '$' + (i + 3)).join(',')})`, [g, u, ...Object.values(cols)]);
  const ev = (u, kind, n, ago = '1 hour', ref = null) => q(`insert into risk_events(user_id,kind,ref,at) select $1,$2,coalesce($5, 'r'||i),now()-$4::interval from generate_series(1,$3) i`, [u, kind, n, ago, ref]);
  const codes = async u => (await q(`select v.code from risk_values() v join risk_rules r on r.code=v.code where v.user_id=$1 and v.value >= r.threshold order by 1`, [u])).rows.map(r => r.code);
  const val = async (u, code) => +((await one(`select value from risk_values() where user_id=$1 and code=$2`, [u, code]))?.value || 0);

  // ---------- 规则表：后台与数据库逐条相同 ----------
  const rules = (await q(`select code,name,weight,threshold::float t,window_days from risk_rules where enabled order by code`)).rows;
  T('启用的规则 19 条', rules.length === 19, rules.map(r => r.code));
  T('后台 RISK_RULES 与数据库逐条相同（代码、名称、权重、阈值、时间窗）', Array.isArray(ADMIN_RULES) && JSON.stringify(ADMIN_RULES.map(r => [r[0], r[1], r[2], r[3], r[4]]).sort()) === JSON.stringify(rules.map(r => [r.code, r.name, r.weight, r.t, r.window_days]).sort()),
    { 后台: ADMIN_RULES?.map(r => r.join('|')), 数据库: rules.map(r => [r.code, r.name, r.weight, r.t, r.window_days].join('|')) });

  // ---------- 19 条规则逐条：够阈值触发，差一点不触发 ----------
  const H = await user();
  // 确认爽约 2 次
  const ns = await user(), ns1 = await user();
  for (const [u, n] of [[ns, 2], [ns1, 1]]) for (let i = 0; i < n; i++) { const g = await game(H, `now()-interval '${3 + i} days'`); await part(g, u, { status: 'approved', approved_at: new Date(Date.now() - 9 * 864e5), attendance: 'no_show' }) }
  // 24 小时内退出 3 次（通过 1 小时后退出）；10 分钟内退出、改时间后退出不算
  const ll = await user(), ll1 = await user();
  for (let i = 0; i < 3; i++) { const g = await game(H, `now()+interval '${2 + i} hours'`); await part(g, ll, { status: 'left', approved_at: new Date(Date.now() - 3 * 36e5), left_at: new Date(Date.now() - 36e5) }) }
  for (let i = 0; i < 4; i++) { const g = await game(H, `now()+interval '${2 + i} hours'`); await part(g, ll1, i < 2 ? { status: 'left', approved_at: new Date(Date.now() - 3 * 36e5), left_at: new Date(Date.now() - 36e5) } : i === 2 ? { status: 'left', approved_at: new Date(Date.now() - 5 * 6e4), left_at: new Date(Date.now() - 6e4) } : { status: 'left', approved_at: new Date(Date.now() - 3 * 36e5), left_at: new Date(Date.now() - 36e5), change_ack: 'out' }) }
  // 发起人临时取消 2 次（已有人加入）；没人加入的取消不算
  const hc = await user(), hc1 = await user(), pl = await user();
  for (const [h, withP] of [[hc, true], [hc, true], [hc1, true], [hc1, false]]) { const g = await game(h, `now()+interval '5 hours'`); if (withP) await part(g, pl, { status: 'approved', approved_at: new Date(Date.now() - 864e5) }); await q(`update games set status='cancelled' where id=$1`, [g]) }
  // 被 2 个不同的人举报；同一人举报两次只算 1
  const rp = await user(), rp1 = await user(), rA = await user(), rB = await user();
  const report = (by, t, reason = 'harass', status = 'open') => q(`insert into reports(reporter_id,target_type,target_id,reason,source,via,status) values ($1,'user',$2,$3,'in_app','card',$4)`, [by, t, reason, status]);
  await report(rA, rp); await report(rB, rp, 'no_show'); await report(rA, rp1); await report(rA, rp1, 'no_show', 'dismissed');
  // 违反球友约定（核实 1 次）；未核实的不算
  const pv = await user(), pv1 = await user(); await report(rA, pv, 'pact_violation', 'actioned'); await report(rA, pv1, 'pact_violation', 'open');
  // 被 3 人屏蔽 / 被 3 人标少遇到
  const bb = await user(), bb1 = await user(), lm = await user(), xs = []; for (let i = 0; i < 3; i++) xs.push(await user());
  for (const x of xs) { await q(`insert into blocks(blocker_id,blocked_id) values ($1,$2)`, [x, bb]); await q(`insert into player_prefs(user_id,target_id,pref) values ($1,$2,'less')`, [x, lm]) }
  for (const x of xs.slice(0, 2)) await q(`insert into blocks(blocker_id,blocked_id) values ($1,$2)`, [x, bb1]);
  // 邀约被同一人婉拒 2 次；被两个不同的人各婉拒 1 次不算
  const iv = await user(), iv1 = await user(), to1 = await user(), to2 = await user();
  const inv = (f, t) => q(`insert into invites(from_user,to_user,starts_at,ends_at,venue_id,game_type,status,responded_at) values ($1,$2,now()+interval '1 day',now()+interval '1 day 1 hour',$3,'singles','declined',now()-interval '2 days')`, [f, t, V]);
  await inv(iv, to1); await inv(iv, to1); await inv(iv1, to1); await inv(iv1, to2);
  // 被婉拒后仍高频申请：7 天内被婉拒 1 次 + 共 8 次申请
  const ds = await user(); for (let i = 0; i < 8; i++) { const g = await game(H, `now()+interval '3 days'`); await part(g, ds, i === 0 ? { status: 'rejected', decline_reason: 'level', decided_at: new Date(Date.now() - 864e5), created_at: new Date(Date.now() - 2 * 864e5) } : { status: 'pending', created_at: new Date(Date.now() - 864e5) }) }
  // 试女生局 3 次 / 发链接 3 次 / 申请后撤回 6 次 / 触发频率限制 5 次（1 天内）
  const wp = await user(), lk = await user(), ac = await user(), rh = await user(), rh1 = await user();
  await ev(wp, 'women_probe', 3); await ev(lk, 'link_attempt', 3); await ev(ac, 'apply_withdraw', 6); await ev(rh, 'rate_hit', 5); await ev(rh1, 'rate_hit', 5, '25 hours');
  // 注册 30 天内男改女 / 注册很久后改的不算
  const gf = await user('10 days'), gf1 = await user('200 days');
  await q(`insert into gender_changes(user_id,from_g,to_g,created_at) values ($1,'m','f',now()-interval '2 days'),($2,'m','f',now()-interval '2 days')`, [gf, gf1]);
  // 新账号 24 小时内私信 5 个人；老账号不算
  const db = await user('2 days'), db1 = await user('60 days');
  for (const s of [db, db1]) for (let i = 0; i < 5; i++) { const o = await user(); const [a, b] = [s, o].sort();
    const t = (await one(`insert into threads(kind,user_a,user_b) values ('dm',$1,$2) returning id`, [a, b])).id; await q(`insert into messages(thread_id,sender_id,body) values ($1,$2,'hi')`, [t, s]) }
  // 同一设备 2 个号 / 同一网络 1 天 3 个号；同一网络 2 个号（一家人）不报
  const d1 = await user('3 days', { dev: 'anonA' }), d2 = await user('1 day', { dev: 'anonA' });
  const i1 = await user('2 hours', { ip: '10.0.0.1' }), i2 = await user('3 hours', { ip: '10.0.0.1' }), i3 = await user('5 hours', { ip: '10.0.0.1' });
  const f1 = await user('2 hours', { ip: '10.0.0.9' }), f2 = await user('3 hours', { ip: '10.0.0.9' });
  // 新号留联系方式给 2 个人；同一个人两次只算 1
  const cl = await user('2 days'), cl1 = await user('2 days'); await ev(cl, 'contact_lure', 2); await ev(cl1, 'contact_lure', 2, '1 hour', 'same');
  // 加球友被 3 个不同的人忽略（7 天内）；同一个人忽略 3 次只算 1；8 天前的不算（#110）
  const bi = await user(), bi1 = await user(), bi2 = await user(); await ev(bi, 'buddy_ignored', 3); await ev(bi1, 'buddy_ignored', 3, '1 hour', 'same'); await ev(bi2, 'buddy_ignored', 3, '8 days');
  const quiet = await user();

  const want = [['确认爽约', ns, 'no_show', ns1], ['24 小时内退出', ll, 'late_leave', ll1], ['发起人临时取消', hc, 'host_late_cancel', hc1], ['被不同的人举报', rp, 'reported', rp1],
    ['违反球友约定', pv, 'pact_violation', pv1], ['被多人屏蔽', bb, 'blocked_by', bb1], ['被多人标少遇到', lm, 'less_marked', null], ['邀约被同一人婉拒', iv, 'invite_declined', iv1],
    ['被婉拒后仍高频申请', ds, 'declined_streak', null], ['试女生局', wp, 'women_probe', null], ['男改女', gf, 'gender_flip', gf1], ['新账号私信很多人', db, 'dm_burst', db1],
    ['发链接', lk, 'link_spam', null], ['同一设备', d2, 'same_device', null], ['同一网络', i1, 'same_ip', f1], ['留联系方式', cl, 'contact_lure', cl1], ['反复撤回', ac, 'apply_churn', null], ['频率限制', rh, 'rate_hit', rh1], ['加球友被多人忽略', bi, 'buddy_ignored', bi1], ['加球友被忽略（8 天前）', bi, 'buddy_ignored', bi2]];
  for (const [n, u, code, ctrl] of want) {
    const got = await codes(u);
    T(`规则 ${code}（${n}）：够阈值触发`, got.includes(code), got);
    if (ctrl) { const g2 = await codes(ctrl); T(`规则 ${code}：差一点 / 不该算的不触发`, !g2.includes(code), [g2, await val(ctrl, code)]) }
  }
  T('所有规则都覆盖到', new Set(want.map(w => w[2])).size === rules.length);
  T('没有信号的人什么都不触发', (await codes(quiet)).length === 0);
  await q(`update users set status='deleted' where id=$1`, [lk]); T('已注销的不算', (await codes(lk)).length === 0);

  // ---------- 每小时重算：分数、提醒 ----------
  const X = await user('3 days');
  await ev(X, 'contact_lure', 2); await ev(X, 'apply_withdraw', 6); await ev(X, 'rate_hit', 5);
  let r = await svc(`select job_risk_scores()`); T('job_risk_scores 运行', r.ok, r);
  let ur = await one(`select * from user_risk where user_id=$1`, [X]);
  T('风险分 = 满足规则的权重之和（15+10+10=35，观察）', ur && ur.score === 35 && ur.level === 'watch' && ur.signals.contact_lure === 2 && ur.suggested === 'watch', ur);
  const nsr = await one(`select * from user_risk where user_id=$1`, [ns]);
  T('确认爽约 2 次 → 建议暂停', nsr.suggested === 'suspended' && (await one(`select suggested from risk_alerts where user_id=$1 and rule_code='no_show'`, [ns])).suggested === 'suspended', nsr);
  const al = async (u, extra = '') => (await q(`select * from risk_alerts where user_id=$1 ${extra} order by id`, [u])).rows;
  T('每条满足的规则一条待处理提醒', (await al(X)).length === 3 && (await al(X)).every(a => a.status === 'open'));
  await ev(X, 'rate_hit', 1); await svc(`select job_risk_scores()`);
  T('重算时更新同一条提醒（不重复开）', (await al(X)).length === 3 && +(await al(X, `and rule_code='rate_hit'`))[0].value === 6);
  await q(`update risk_alerts set status='handled', handled_at=now() where user_id=$1 and rule_code='rate_hit'`, [X]); await svc(`select job_risk_scores()`);
  T('处理过、没有新情况的不再打扰', (await al(X, `and rule_code='rate_hit'`)).length === 1);
  await ev(X, 'rate_hit', 2); await svc(`select job_risk_scores()`);
  T('处理后又变多 → 新开一条提醒', (await al(X, `and rule_code='rate_hit'`)).length === 2 && (await al(X, `and rule_code='rate_hit' and status='open'`)).length === 1);
  await q(`update risk_alerts set status='watching', watch_until=now()-interval '1 minute' where user_id=$1 and rule_code='apply_churn'`, [X]); await svc(`select job_risk_scores()`);
  T('观察期满回到待处理', (await al(X, `and rule_code='apply_churn'`))[0].status === 'open');
  await q(`delete from risk_events where user_id=$1`, [X]); await svc(`select job_risk_scores()`);
  ur = await one(`select * from user_risk where user_id=$1`, [X]);
  T('信号消失 → 分数归零，记录保留', ur.score === 0 && ur.level === 'low' && JSON.stringify(ur.signals) === '{}');
  T('分级：爽约 25 低 → 加举报 55 观察 → 加屏蔽 70 高', (await one(`select level from user_risk where user_id=$1`, [ns]))?.level === 'low' && await (async () => { await report(rA, ns); await report(rB, ns); await svc(`select job_risk_scores()`); const o = await one(`select level, score from user_risk where user_id=$1`, [ns]); return o.score === 55 && o.level === 'watch' })()
    && await (async () => { await q(`insert into blocks(blocker_id,blocked_id) select x, $1 from unnest($2::uuid[]) x`, [ns, xs]); await svc(`select job_risk_scores()`); const o = await one(`select level, score from user_risk where user_id=$1`, [ns]); return o.score === 70 && o.level === 'high' })());
  T('记了 job_runs', +(await one(`select count(*) from job_runs where job='risk_scores'`)).count >= 5);

  // ---------- 新信号的记录 ----------
  const N = await user('2 days'), O1 = await user(), O2 = await user(), Old = await user('30 days');
  const dm = async (a, b) => (await call(a, `select api_thread_dm($1)`, [b])).v;
  const tN1 = await dm(N, O1);
  r = await call(N, `select api_message_send($1,'加我微信 tennis88 聊')`, [tN1]);
  T('新号私信留联系方式：照常发出，记 contact_lure（对方 id，不存内容）', r.ok && (await one(`select ref from risk_events where user_id=$1 and kind='contact_lure'`, [N]))?.ref === O1, r);
  const tN2 = await dm(N, O2); await call(N, `select api_message_send($1,'我的号码 0412 345 678')`, [tN2]);
  T('手机号（带空格）也算', +(await one(`select count(*) from risk_events where user_id=$1 and kind='contact_lure'`, [N])).count === 2);
  const tO = await dm(Old, O1); await call(Old, `select api_message_send($1,'加我微信')`, [tO]);
  T('注册满 7 天的不记', +(await one(`select count(*) from risk_events where user_id=$1`, [Old])).count === 0);
  await call(N, `select api_message_send($1,'周六 9 点 Brighton 见')`, [tN1]);
  T('普通消息不记', +(await one(`select count(*) from risk_events where user_id=$1 and kind='contact_lure'`, [N])).count === 2);
  const gA = await game(H, `now()+interval '3 days'`), gB = await game(H, `now()+interval '3 days'`);
  await call(N, `select api_apply($1)`, [gA]); await call(N, `select api_leave($1)`, [gA]);
  T('申请中撤回 → 记 apply_withdraw', (await one(`select ref from risk_events where user_id=$1 and kind='apply_withdraw'`, [N]))?.ref === gA);
  await part(gB, Old, { status: 'approved', approved_at: new Date() }); await call(Old, `select api_leave($1)`, [gB]);
  T('已加入后退出不记撤回（算临时退出）', +(await one(`select count(*) from risk_events where user_id=$1 and kind='apply_withdraw'`, [Old])).count === 0);
  const lr = async (code) => (await svc(`select risk_log_rejected($1,$2,'x')`, [N, code])).v;
  T('被拒操作：发链接 / 女生局 / 频率上限各记对的信号，其他错误不记', await lr('message_link') === 'link_attempt' && await lr('women_only') === 'women_probe'
    && await lr('apply_hourly_limit') === 'rate_hit' && await lr('invite_daily_limit') === 'rate_hit' && await lr('game_full') === null);

  // ---------- 昵称规则 ----------
  const S = [['小明', ''], ['Jason W', ''], ['Grace 🎾', ''], ['Tom1985', ''], ['J.Smith', ''], ['Company Tom', ''], ['哈哈哈哈', ''],
    ['abc.com', 'link'], ['www.tennis', 'link'], ['http://a', 'link'], ['看我 tennis.com.au', 'link'],
    ['加我微信', 'contact'], ['vx 小王', 'contact'], ['0412 345 678', 'contact'], ['12345678', 'contact'], ['WeChat Amy', 'contact'], ['qq 小李', 'contact'],
    ['南伴球官方', 'impersonate'], ['Admin', 'impersonate'], ['客服小王', 'impersonate'], ['系统通知', 'impersonate'],
    ['哈哈哈哈哈', 'repeat'], ['a​b', 'invisible'], ['abc‮def', 'invisible']];
  const MSG = { '': '', link: '昵称里不能有链接', contact: '昵称里不能有联系方式', impersonate: '昵称不能用「官方」「客服」等字样', repeat: '昵称不能连续重复同一个字', invisible: '昵称里有不支持的字符' };
  const dbRes = (await q(`select x, nbq_nickname_problem(x) p from unnest($1::text[]) x`, [S.map(s => s[0])])).rows;
  T('数据库昵称判断', dbRes.every((r, i) => (r.p || '') === S[i][1]), dbRes.filter((r, i) => (r.p || '') !== S[i][1]));
  for (const k of ['PWA', 'Web']) T(`前台 ${k} 的 NICK_BAD 与数据库同一结果`, typeof NICK[k] === 'function' && S.every(s => NICK[k](s[0]) === MSG[s[1]]), typeof NICK[k] === 'function' ? S.filter(s => NICK[k](s[0]) !== MSG[s[1]]).map(s => [s[0], NICK[k](s[0])]) : NICK[k]);
  const P = await user();
  r = await call(P, `update users set nickname='客服小王' where id=$1`, [P]); T('前台改成不允许的昵称 → nickname_not_allowed（detail = 原因）', !r.ok && r.err === 'nickname_not_allowed' && r.detail === 'impersonate', r);
  r = await call(P, `update users set nickname='小王' where id=$1`, [P]); T('正常昵称可以改', r.ok, r);
  r = await q(`update users set nickname='南伴球客服' where id=$1`, [P]).then(() => ({ ok: true }), e => ({ ok: false, err: e.message })); T('后台改不受限制', r.ok, r);
  r = await call(P, `update users set utr=6 where id=$1`, [P]); T('昵称没变时改别的资料不检查', r.ok, r);

  // ---------- 权限 ----------
  r = await call(N, `select count(*) from risk_events`); T('前台看不到风险信号', !r.ok && /permission denied/.test(r.err), r);
  r = await call(N, `select job_risk_scores()`); T('前台不能跑风险重算', !r.ok && /permission denied/.test(r.err), r);
  r = await call(N, `select risk_log_rejected($1,'message_link')`, [O1]); T('前台不能伪造被拒记录', !r.ok && /permission denied/.test(r.err), r);
  r = await call(N, `select * from risk_values()`); T('前台不能看风险值', !r.ok && /permission denied/.test(r.err), r);
  r = await adm(`select count(*) from risk_values()`); const r2 = await adm(`select count(*) from risk_events`);
  T('后台能看风险值和信号', r.ok && r2.ok && +r2.v > 0, [r, r2]);
  r = await adm(`insert into risk_events(user_id,kind) values ($1,'rate_hit')`, [N]); T('后台不能写信号', !r.ok, r);

  // ---------- 每晚清理 ----------
  await q(`insert into risk_events(user_id,kind,at) values ($1,'rate_hit',now()-interval '91 days'),($1,'rate_hit',now()-interval '89 days')`, [O2]);
  const oldIp = await user('31 days', { ip: '10.9.9.9' }), newIp = await user('29 days', { ip: '10.9.9.8' });
  r = await svc(`select job_nightly()`);
  T('每晚：风险信号保留 90 天', r.ok && +(await one(`select count(*) from risk_events where user_id=$1`, [O2])).count === 1, r);
  T('每晚：注册 IP 30 天后清空', (await one(`select signup_ip from users where id=$1`, [oldIp])).signup_ip === null && (await one(`select signup_ip from users where id=$1`, [newIp])).signup_ip === '10.9.9.8');
} catch (e) { fail++; console.log('FAIL 异常 ' + (e.stack || e)) }
finally { if (pool) await pool.end().catch(() => { }); c.stop() }
console.log(`risk: ${pass} 通过, ${fail} 失败`); process.exit(fail ? 1 : 0);
