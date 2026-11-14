// 第四批 4h：通知发送程序（server/notify）。真 PostgreSQL + 假推送 / 假邮件服务：路由 ①–⑧、夜间顺延、过时不推、申请合并、
// 补发邮件的各种「不发」、每天 5 封、1 小时合并、404 / 410 清订阅、退信、同时跑两个进程不重复发。
import { createRequire } from 'module'; import path from 'path'; import { fileURLToPath, pathToFileURL } from 'url';
import { startCluster, loadSchema } from './cluster.mjs';
const require = createRequire(import.meta.url); const pg = require('pg');
const HERE = path.dirname(fileURLToPath(import.meta.url)), DIR = process.env.NBQ_DIR || path.join(HERE, '..', '..');
const { dispatch, flushEmail, onEmailEvent } = await import(pathToFileURL(path.join(DIR, 'server/notify/sender.mjs')));
const R = await import(pathToFileURL(path.join(DIR, 'server/notify/rules.mjs')));
const A = await import(pathToFileURL(path.join(DIR, 'server/notify/adapters.mjs')));
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 600) : '')) };

// ---------- 纯规则（不用数据库） ----------
const iso = t => new Date(t).toISOString();
T('夜间顺延：夏令时开始那夜 23:00 → 墙上 8:00', iso(R.quietUntil(Date.parse('2026-10-03T13:00:00Z'))) === '2026-10-03T21:00:00.000Z', iso(R.quietUntil(Date.parse('2026-10-03T13:00:00Z'))));
T('夜间顺延：夏令时结束那夜 23:00 → 墙上 8:00', iso(R.quietUntil(Date.parse('2027-04-03T12:00:00Z'))) === '2027-04-03T22:00:00.000Z', iso(R.quietUntil(Date.parse('2027-04-03T12:00:00Z'))));
T('凌晨 3:30 → 当天 8:00；白天不动', iso(R.quietUntil(Date.parse('2027-03-09T16:30:00Z'))) === '2027-03-09T21:00:00.000Z' && R.quietUntil(Date.parse('2027-03-10T03:00:00Z')) === Date.parse('2027-03-10T03:00:00Z'));
T('22:00 整算夜间、07:59 算夜间、08:00 不算', R.quietUntil(Date.parse('2027-03-10T11:00:00Z')) > Date.parse('2027-03-10T11:00:00Z') && R.quietUntil(Date.parse('2027-03-10T20:59:00Z')) === Date.parse('2027-03-10T21:00:00Z') && R.quietUntil(Date.parse('2027-03-10T21:00:00Z')) === Date.parse('2027-03-10T21:00:00Z'));
T('退信 / 投诉回调对上，其他事件忽略', JSON.stringify(A.resendEvent({ type: 'email.bounced', data: { to: ['a@x.com'], email_id: 'e1' } })) === JSON.stringify({ type: 'bounced', email: 'a@x.com', provider_id: 'e1' }) && A.resendEvent({ type: 'email.delivered' }) === null);

const c = startCluster(); let pool;
try {
  c.createdb('nbq');
  const errs = loadSchema(c, 'nbq', path.join(DIR, 'schema.sql')); T('schema 执行无错误', !errs.length, errs.slice(0, 3));
  pool = new pg.Pool({ host: c.host, port: c.port, user: 'postgres', database: 'nbq', max: 6 });
  const q = (s, p) => pool.query(s, p), one = async (s, p) => (await q(s, p)).rows[0];
  const kinds = (await q(`select unnest(enum_range(null::notif_kind))::text k`)).rows.map(r => r.k);
  T('每种通知都有推送文字', kinds.every(k => R.pushText({ id: 1, kind: k }, {}).title !== '南伴球'), kinds.filter(k => R.pushText({ id: 1, kind: k }, {}).title === '南伴球'));

  const T0 = Date.parse('2027-03-10T03:00:00Z');           // 墨尔本 3/10 14:00（白天）
  const M = 60e3, H = 36e5, at = d => new Date(T0 + d).toISOString();
  const push = { calls: [], status: {}, async send(sub, p) { this.calls.push({ sub, p }); return { status: this.status[sub.endpoint] ?? 201 } } };
  let mailFail = false; const mail = { sent: [], async send(m) { if (mailFail) throw new Error('down'); this.sent.push(m); return { id: 're_' + this.sent.length } } };
  const run = d => dispatch(pool, { push, now: T0 + d }), flush = d => flushEmail(pool, { mail, now: T0 + d });

  let un = 0; const user = async (name, email = null, optin = true) => { const id = (await one(`insert into users(phone_e164,nickname,utr,pact_accepted_at,wechat_id,email) values ($1,$2,5,now(),'wx'||$2,$3) returning id`, ['+6140000' + String(++un).padStart(4, '0'), name, email])).id;
    if (email && optin) await q(`update users set email_prefs='{"request":true,"result":true,"change":true}' where id=$1`, [id]);   // 11-03：邮件默认不发，有邮箱又要收邮件的人要自己打开（optin=false 就是没打开）
    return id };
  const dev = async (u, platform, { ep = null, active = null } = {}) => (await one(`insert into user_devices(user_id,platform,push_endpoint,push_p256dh,push_auth,last_active_at) values ($1,$2,$3,$4,$5,$6) returning id`,
    [u, platform, ep, ep && 'p', ep && 'a', active === null ? null : at(-active)])).id;
  await q(`insert into suburbs(name,postcode,centroid) values ('Brighton','3186','POINT(145 -37.9)')`);
  const V = (await one(`insert into venues(name,short_name,suburb,postcode,location,surfaces,status) values ('Brighton TC','Brighton TC','Brighton','3186','POINT(145 -37.9)','{hard}','active') returning id`)).id;
  const H0 = await user('Host'); let gn = 0;
  const game = async (startD, host = H0) => (await one(`insert into games(share_code,host_id,venue_id,starts_at,duration_min,game_type,capacity,utr_min,utr_max,created_at,time_set_at)
      values ($1,$2,$3,$4,90,'doubles',4,3,7,$5,$5) returning id`, ['n' + (++gn), host, V, at(startD), at(-2 * 24 * H)])).id;
  const apply = (g, u, status = 'pending') => q(`insert into game_participants(game_id,user_id,status,created_at) values ($1,$2,$3,$4)`, [g, u, status, at(-H)]);
  const N = async (u, kind, { g = null, actor = null, d = 0, read = false } = {}) => (await one(`insert into notifications(user_id,kind,game_id,actor_id,created_at,read_at) values ($1,$2,$3,$4,$5,$6) returning id`,
    [u, kind, g, actor, at(d), read ? at(d) : null])).id;
  const D = async id => (await q(`select channel||'/'||reason r from notification_deliveries where notification_id=$1 order by at, id`, [id])).rows.map(r => r.r).join(',');
  const NR = id => one(`select * from notifications where id=$1`, [id]);
  const OB = u => q(`select * from email_outbox where user_id=$1 order by id`, [u]).then(r => r.rows);
  await q(`update notifications set pushed_at=now() where pushed_at is null`);   // 建数据时触发器写的旧通知不算
  const gF = await game(2 * 24 * H);   // 两天后的局

  // ---------- ② 正在用 → 只在这台设备的页面里提醒 ----------
  const u1 = await user('U1', 'u1@x.com'); await dev(u1, 'mobile', { ep: 'm1', active: 10e3 }); await dev(u1, 'desktop', { ep: 'd1' });
  const n1 = await N(u1, 'approved', { g: gF });
  // ④ 电脑上正在用 + 出发类 → 同时推手机
  const u2 = await user('U2'); await dev(u2, 'desktop', { active: 5e3 }); const u2m = await dev(u2, 'mobile', { ep: 'm2', active: 5 * M });
  const n2 = await N(u2, 'changed', { g: gF }), n2b = await N(u2, 'approved', { g: gF });
  // ③ 都没在用 → 推手机；电脑端不推送
  const u3 = await user('U3', 'u3@x.com'); const u3m = await dev(u3, 'mobile', { ep: 'm3', active: 2 * M }); await dev(u3, 'desktop', { ep: 'd3' });
  const n3 = await N(u3, 'approved', { g: gF });
  const u4 = await user('U4', 'u4@x.com'); await dev(u4, 'desktop', { ep: 'd4' });
  const n4 = await N(u4, 'approved', { g: gF });
  const u5 = await user('U5', 'u5@x.com'); const n5 = await N(u5, 'rejected', { g: gF });     // 推不到、有邮箱
  const u6 = await user('U6'); const n6 = await N(u6, 'approved', { g: gF });                  // 推不到、没邮箱
  const u4x = await user('U4x', 'u4x@x.com', false); await dev(u4x, 'desktop', { ep: 'd4x' }); const n4x = await N(u4x, 'approved', { g: gF });   // 有邮箱但没打开邮件提醒
  // 推送失败：410 → 清订阅（不改推电脑）；404 清订阅；500 → 订阅保留
  const u7 = await user('U7'); const u7m = await dev(u7, 'mobile', { ep: 'gone' }); await dev(u7, 'desktop', { ep: 'd7' }); push.status.gone = 410;
  const n7 = await N(u7, 'approved', { g: gF });
  const u7b = await user('U7b'); const u7bm = await dev(u7b, 'mobile', { ep: 'nf' }); push.status.nf = 404; const n7b = await N(u7b, 'approved', { g: gF });
  const u7c = await user('U7c'); const u7cm = await dev(u7c, 'mobile', { ep: 'busy' }); push.status.busy = 500; const n7c = await N(u7c, 'approved', { g: gF });
  // 还没到时间的不处理
  const nLater = await N(u3, 'approved', { g: gF, d: 10 * M });
  let s = await run(0);
  T('② 手机正在用：页面里提醒，同时也推系统横幅（11-02 你定的：像短信一样）', await D(n1) === 'in_app/active_device,push_mobile/go_kind' && push.calls.some(x => x.sub.endpoint === 'm1') && !push.calls.some(x => x.sub.endpoint === 'd1'), await D(n1));
  T('④ 电脑正在用 + 改动：页面提醒并推手机；第一去向仍是页面', await D(n2) === 'in_app/active_device,push_mobile/go_kind' && (await NR(n2)).go_extra === true && (await NR(n2)).first_channel === 'in_app', await D(n2));
  T('④ 非出发类也推手机（不再区分种类）', await D(n2b) === 'in_app/active_device,push_mobile/go_kind', await D(n2b));
  T('③ 都没在用：推手机（不推电脑），记下送达时间', await D(n3) === 'push_mobile/mobile_first' && !push.calls.some(x => x.sub.endpoint === 'd3') && (await one(`select push_ok_at from user_devices where id=$1`, [u3m])).push_ok_at !== null, await D(n3));
  T('③ 电脑端不推送：只有电脑订阅的人不推（11-03 你定的）', await D(n4) === '' && !push.calls.some(x => x.sub.endpoint === 'd4'), await D(n4));
  T('邮件默认不发：有邮箱但没打开 → 不排邮件，只进消息列表', (await OB(u4x)).length === 0 && await D(n4x) === 'none/no_push', await D(n4x));
  T('推送带应用页地址：统一城市网址 /melbourne/（点开通知才进应用，不是入口页）', push.calls.find(x => x.sub.endpoint === 'm3').p.data.url === '/melbourne/' && push.calls.every(x => x.p.data.url === '/melbourne/'), push.calls.map(x => x.sub.endpoint + ':' + x.p.data.url));
  T('推送内容带球局时间和场地、点开的去处', push.calls.find(x => x.sub.endpoint === 'm3').p.body.includes('Brighton TC') && push.calls.find(x => x.sub.endpoint === 'm3').p.data.notif_id === String(n3));
  T('410：清掉手机订阅，不改推电脑', await D(n7) === 'none/no_push' && (await one(`select push_endpoint from user_devices where id=$1`, [u7m])).push_endpoint === null, await D(n7));
  T('404：清订阅；没别的设备 → 只进消息列表', await D(n7b) === 'none/no_push' && (await one(`select push_endpoint from user_devices where id=$1`, [u7bm])).push_endpoint === null, await D(n7b));
  T('500：这次没推到，订阅保留', await D(n7c) === 'none/no_push' && (await one(`select push_endpoint from user_devices where id=$1`, [u7cm])).push_endpoint === 'busy');
  T('推不到又没邮箱：只进消息列表', await D(n6) === 'none/no_push');
  T('还没到时间的不处理', (await NR(nLater)).pushed_at === null && await D(nLater) === '');
  T('处理过的都记了 pushed_at', (await q(`select count(*) from notifications where id = any($1) and pushed_at is null`, [[n1, n2, n3, n4, n5, n6, n7]])).rows[0].count === '0');

  // ---------- ⑧ 补发邮件 ----------
  let ob4 = await OB(u4), ob5 = await OB(u5);
  T('⑧ 推不到手机、已打开邮件：排一封结果类邮件，5 分钟后发', ob4.length === 1 && ob4[0].kind === 'result' && +ob4[0].send_after === T0 + 5 * M && ob4[0].merge_key === `${u4}:${gF}:result`, ob4);
  T('⑧ 推不到但有邮箱：先排邮件，第一去向等邮件发出再记', ob5.length === 1 && await D(n5) === '' && (await NR(n5)).pushed_at !== null);
  T('推到手机 / 页面里的不排邮件', (await OB(u3)).length === 0 && (await OB(u1)).length === 0);
  s = await flush(4 * M); T('不到 5 分钟不发', s.sent === 0 && mail.sent.length === 0, s);
  s = await flush(5 * M);
  T('5 分钟仍未读：发出', s.sent === 2 && (await OB(u4))[0].status === 'sent' && /^re_\d$/.test((await OB(u4))[0].provider_id), s);
  T('没推送的邮件第一去向记为 email / no_push（电脑订阅不算）', await D(n4) === 'email/no_push', await D(n4));
  T('推不到的：第一去向记为 email / no_push', await D(n5) === 'email/no_push' && (await NR(n5)).first_channel === 'email', await D(n5));
  const m4 = mail.sent.find(m => m.to === 'u4@x.com');
  T('邮件标题、退订链接', m4.subject.startsWith('你的申请通过了') && m4.unsubscribe.includes('/unsub/') && m4.unsubscribe.endsWith('?k=result') && m4.text.includes(m4.unsubscribe), m4);
  T('再跑一次不重发', (await flush(6 * M)).sent === 0 && mail.sent.length === 2);

  // ---------- ⑥ 过时的不推 ----------
  const u8 = await user('U8'); await dev(u8, 'mobile', { ep: 'm8' }); const u9 = await user('U9');
  await q(`insert into blocks(blocker_id,blocked_id) values ($1,$2)`, [u8, u9]);
  const gC = await game(3 * H); await q(`update games set status='cancelled' where id=$1`, [gC]);
  const gS = await game(-10 * M); const gR8 = await game(2 * 24 * H, u8); await apply(gR8, u9, 'approved'); const u9b = await user('U9b'); await apply(gR8, u9b, 'approved');
  const s1 = await N(u8, 'approved', { g: gF, read: true, d: 6 * M }), s2 = await N(u8, 'player_left', { g: gF, actor: u9, d: 6 * M }), s3 = await N(u8, 'changed', { g: gC, d: 6 * M }),
    s4 = await N(u8, 'unfilled', { g: gS, d: 6 * M }), s5 = await N(u8, 'request', { g: gR8, actor: u9b, d: 6 * M }), s6 = await N(u8, 'game_cancelled', { g: gC, d: 6 * M }), s7 = await N(u8, 'recap', { g: gS, d: 6 * M });
  await run(6 * M);
  T('⑥ 已读 / 拉黑 / 已取消 / 已开打 / 申请已处理：不推，记原因', await D(s1) === 'none/stale:read' && await D(s2) === 'none/stale:blocked' && await D(s3) === 'none/stale:cancelled'
    && await D(s4) === 'none/stale:started' && await D(s5) === 'none/stale:handled', [await D(s1), await D(s2), await D(s3), await D(s4), await D(s5)]);
  T('⑥ 取消通知本身、赛后提醒照常推', await D(s6) === 'push_mobile/mobile_first' && await D(s7) === 'push_mobile/mobile_first');
  T('⑥ 过时的仍留在收件箱', +(await one(`select count(*) from notifications where id = any($1)`, [[s1, s2, s3, s4, s5]])).count === 5);

  // ---------- ⑦ 同一局申请 10 分钟内只推一次；邮件合并 ----------
  const u10 = await user('U10', 'u10@x.com'); await dev(u10, 'desktop', { ep: 'd10' }); const gR = await game(2 * 24 * H, u10);
  const u10m = await user('U10m'); await dev(u10m, 'mobile', { ep: 'm10' }); const gRm = await game(2 * 24 * H, u10m);   // 同样的申请，发起人在手机上
  const ap = []; for (let i = 0; i < 4; i++) { ap.push(await user('A' + i)); await apply(gR, ap[i]); await apply(gRm, ap[i]) }
  const r1 = await N(u10, 'request', { g: gR, actor: ap[0], d: 10 * M }), rm1 = await N(u10m, 'request', { g: gRm, actor: ap[0], d: 10 * M }); await run(10 * M);
  const r2 = await N(u10, 'request', { g: gR, actor: ap[1], d: 13 * M }), rm2 = await N(u10m, 'request', { g: gRm, actor: ap[1], d: 13 * M }); await run(13 * M);
  T('⑦ 第一条申请推出；10 分钟内第二条不推（merged）', await D(rm1) === 'push_mobile/mobile_first' && await D(rm2) === 'none/merged', [await D(rm1), await D(rm2)]);
  let ob10 = await OB(u10); T('⑦ 第二条并进同一封申请邮件', ob10.length === 1 && ob10[0].notification_ids.length === 2 && ob10[0].kind === 'request', ob10);
  s = await flush(15 * M); const m10 = mail.sent.at(-1);
  T('合并的邮件：「又有 2 位球友申请」，两条都记邮件', s.sent === 1 && m10.subject.startsWith('又有 2 位球友申请加入你') && await D(r1) === 'email/no_push' && await D(r2) === 'email/no_push', [m10.subject, await D(r1), await D(r2)]);
  const r3 = await N(u10, 'request', { g: gR, actor: ap[2], d: 30 * M }), rm3 = await N(u10m, 'request', { g: gRm, actor: ap[2], d: 30 * M }); await run(30 * M);
  ob10 = await OB(u10);
  T('⑦ 超过 10 分钟的新申请照常推', await D(rm3) === 'push_mobile/mobile_first', await D(rm3));
  T('邮件 1 小时合并：上一封发出 1 小时后才发', ob10.length === 2 && +ob10[1].send_after === T0 + 75 * M, ob10.map(o => o.send_after));
  const r4 = await N(u10, 'request', { g: gR, actor: ap[3], d: 42 * M }); await run(42 * M);
  T('1 小时内再来的并进排队的那封', (await OB(u10)).length === 2 && (await OB(u10))[1].notification_ids.length === 2);
  await q(`update game_participants set status='approved' where game_id=$1 and user_id=$2`, [gR, ap[2]]);   // 其中一条申请已被处理
  s = await flush(75 * M); const m10b = mail.sent.at(-1);
  T('发出时去掉已处理的申请', s.sent === 1 && m10b.subject.startsWith('A3 申请加入你') && await D(r3) === 'none/stale:email' && await D(r4) === 'email/no_push', [m10b.subject, await D(r3), await D(r4)]);

  // ---------- ⑤ 夜间顺延 + 8 点合成一条 ----------
  const TN = Date.parse('2027-03-10T12:00:00Z') - T0;   // 墨尔本 3/10 23:00
  const u11 = await user('U11'); await dev(u11, 'mobile', { ep: 'm11' });
  const gSoon = await game(TN + 5 * H);
  const q1 = await N(u11, 'badge', { d: TN }), q2 = await N(u11, 'recap', { g: gS, d: TN }), q3 = await N(u11, 'approved', { g: gF, d: TN }),
    q4 = await N(u11, 'game_cancelled', { g: gC, d: TN }), q5 = await N(u11, 'approved', { g: gSoon, d: TN });
  s = await run(TN);
  const at8 = Date.parse('2027-03-10T21:00:00Z');
  T('⑤ 夜里不要紧的（徽章、赛后回顾）顺延到 8:00（send_after、deferred）', s.deferred === 2 && [q1, q2].every(Boolean) && +(await NR(q1)).send_after === at8 && (await NR(q2)).deferred === true && (await NR(q1)).pushed_at === null, s);
  T('⑤ 申请 / 同意 / 婉拒这类人对人的提醒夜里也立刻推（11-02 你定的）', await D(q3) === 'push_mobile/mobile_first' && (await NR(q3)).deferred !== true, await D(q3));
  T('⑤ 紧急的（取消、12 小时内开打）夜里照常推', await D(q4) === 'push_mobile/mobile_first' && await D(q5) === 'push_mobile/mobile_first');
  s = await run(TN + H); T('⑤ 没到 8 点不推', s.delivered === 0 && await D(q1) === '', s);
  s = await run(at8 - T0);
  const dq = [await D(q1), await D(q2)];
  T('⑤ 8 点同一人只推一条（deferred_night），其余合并', dq.filter(x => x === 'push_mobile/deferred_night').length === 1 && dq.filter(x => x === 'none/merged').length === 1, dq);
  T('⑤ 第一去向时间是 8 点', +(await NR(q1)).first_at === at8);

  // ---------- 邮件「不发」的各种情况 ----------
  const E = 2 * H; const runE = d => run(E + d), flushE = d => flush(E + d);
  const mk = async (name, ep = true) => { const u = await user(name, name.toLowerCase() + '@x.com'); if (ep) await dev(u, 'desktop', { ep: 'd' + name }); return u };
  const ue1 = await mk('E1'), ue2 = await mk('E2'), ue3 = await mk('E3'), ue4 = await mk('E4'), ue5 = await mk('E5', false);
  const e1 = await N(ue1, 'approved', { g: gF, d: E }), e2 = await N(ue2, 'approved', { g: gF, d: E }), e3 = await N(ue3, 'approved', { g: gF, d: E }),
    e4 = await N(ue4, 'approved', { g: gF, d: E }), e5 = await N(ue5, 'approved', { g: gF, d: E });
  await runE(0);
  await q(`update notifications set read_at=$2 where id=$1`, [e1, at(E + M)]);                                                   // 5 分钟内看过了
  await q(`insert into notification_deliveries(notification_id,channel,reason,at) values ($1,'push_mobile','mobile_first',$2)`, [e2, at(E + M)]);   // 期间手机推送送达
  await q(`update users set email_prefs = email_prefs || '{"result":false}' where id=$1`, [ue3]);                               // 关掉了结果类邮件
  await onEmailEvent(pool, { type: 'bounced', email: 'E4@X.com' });                                                              // 退信
  await q(`update games set starts_at=$2 where id=$1`, [gF, at(E + 2 * M)]);                                                     // 球局已开打
  s = await flushE(5 * M);
  const sk = async u => (await OB(u))[0]?.skip_reason;
  T('已看过 → seen；手机推送已送达 → pushed', await sk(ue1) === 'seen' && await sk(ue2) === 'pushed', [await sk(ue1), await sk(ue2)]);
  T('关掉这一类 → pref_off；退信 → email_bad', await sk(ue3) === 'pref_off' && await sk(ue4) === 'email_bad' && (await one(`select email_status from users where id=$1`, [ue4])).email_status === 'bounced');
  T('球局已开打 → stale；推不到的补记第一去向 none', await sk(ue5) === 'stale' && await D(e5) === 'none/stale:email', [await sk(ue5), await D(e5)]);
  T('跳过的都没发出', s.sent === 0 && s.skipped === 5, s);
  await q(`update games set starts_at=$2 where id=$1`, [gF, at(2 * 24 * H)]);
  const ue6 = await mk('E6'); await q(`update users set email_status='bounced' where id=$1`, [ue6]);
  await N(ue6, 'approved', { g: gF, d: E }); await runE(0); T('邮箱不可用的不排邮件', (await OB(ue6)).length === 0);

  // 每人每天最多 5 封；重要的先发；第 5 封附上限说明
  const u12 = await mk('E7'); const gs = []; for (let i = 0; i < 6; i++) gs.push(await game(2 * 24 * H + i * H));
  for (let i = 0; i < 5; i++) await N(u12, 'approved', { g: gs[i], d: E + i * 1000 });
  const eChg = await N(u12, 'changed', { g: gs[5], d: E + 9000 });
  await runE(10e3); s = await flushE(6 * M);
  const ob12 = await OB(u12), sent12 = mail.sent.filter(m => m.to === 'e7@x.com');
  T('每天最多 5 封，第 6 封 daily_cap', s.sent === 5 && ob12.filter(o => o.skip_reason === 'daily_cap').length === 1, s);
  T('改动类先发（虽然最后排进来）', sent12[0].subject.startsWith('球局有改动') && ob12.find(o => o.kind === 'change').status === 'sent');
  T('第 5 封附上限说明', sent12[4].text.includes('上限') && !sent12[3].text.includes('上限'));

  // 开场前 1 小时内的结果类不进邮件；2 小时内的改动立刻发、不合并
  const u13 = await mk('E8'); const g50 = await game(E + 50 * M), g90 = await game(E + 90 * M);
  await N(u13, 'approved', { g: g50, d: E }); const c90 = await N(u13, 'changed', { g: g90, d: E }); await runE(0);
  const ob13 = await OB(u13);
  T('开场前 1 小时内的结果类不进邮件；2 小时内的改动立刻发', ob13.length === 1 && ob13[0].kind === 'change' && +ob13[0].send_after === T0 + E, ob13);
  mailFail = true; s = await flushE(0); mailFail = false;
  T('邮件服务出错 → failed，不记送达', s.failed === 1 && (await OB(u13))[0].status === 'failed' && await D(c90) === '', s);
  // 退信回调带 provider_id → 那封记 bounced
  const sentRow = (await OB(u12)).find(o => o.status === 'sent');
  await onEmailEvent(pool, { type: 'complained', email: 'e7@x.com', provider_id: sentRow.provider_id });
  T('投诉回调：邮箱停发、那封记 bounced', (await one(`select email_status from users where id=$1`, [u12])).email_status === 'complained' && (await one(`select status from email_outbox where id=$1`, [sentRow.id])).status === 'bounced');

  // ---------- 重复执行 / 两个进程同时跑 ----------
  s = await run(E + H); T('再跑一次什么都不做', s.delivered + s.deferred + s.stale + s.merged === 0, s);
  const u14 = await user('U14'); await dev(u14, 'mobile', { ep: 'm14' }); const ids = [];
  for (let i = 0; i < 30; i++) ids.push(await N(u14, i % 2 ? 'approved' : 'joined', { g: gF, d: E + 2 * H }));
  const before = push.calls.length;
  const [a, b] = await Promise.all([run(E + 2 * H), run(E + 2 * H)]);
  T('两个进程同时跑：每条只发一次', a.delivered + b.delivered === 30 && push.calls.length - before === 30
    && +(await one(`select count(*) from notification_deliveries where notification_id = any($1)`, [ids])).count === 30, [a, b]);
  T('job_ 写的通知也能发（api / 定时任务写入 → 发送程序读）', await (async () => {
    const g = await game(E + 2 * H + 20 * M); await q(`insert into game_participants(game_id,user_id,status,approved_at,decided_at,created_at) values ($1,$2,'approved',$3,$3,$3)`, [g, u14, at(-H)]);
    await q(`update games set created_at=$2 where id=$1`, [g, at(-2 * H)]);
    const cl = await pool.connect(); try { await cl.query('begin'); await cl.query('set local role nbq_service'); await cl.query(`select job_soon_reminders($1::timestamptz)`, [at(E + 2 * H)]); await cl.query('commit') } finally { cl.release() }
    const id = (await one(`select id from notifications where user_id=$1 and kind='soon'`, [u14]))?.id; if (!id) return false;
    await q(`update notifications set created_at=$2 where id=$1`, [id, at(E + 2 * H)]);
    await run(E + 2 * H); return await D(id) === 'push_mobile/mobile_first';
  })());
  // ---------- 场边互动通知（第七批 S2b+）：网球第一下推、没看前合并不响；回复带内容；删了的不推；夜里顺延；不发邮件 ----------
  const asU = async (uid, sql, p) => { const cl = await pool.connect(); try { await cl.query('begin'); await cl.query('set local role nbq_user'); await cl.query(`select set_config('nbq.uid',$1,true)`, [uid]);
    const r = await cl.query(sql, p); await cl.query('commit'); return Object.values(r.rows[0] || {})[0] } catch (e) { await cl.query('rollback'); throw e } finally { cl.release() } };
  const Z = 5 * H;   // 墨尔本 19:00
  const sA = await user('Coco', 'coco@x.com'), sB = await user('Leo'), sC = await user('Mia'), sD = await user('Nia', 'nia@x.com');
  await dev(sA, 'mobile', { ep: 'sbA' }); await dev(sB, 'mobile', { ep: 'sbB' });
  const sbPost = (await asU(sA, `select api_sb_post($1::jsonb)`, [JSON.stringify({ body: '今天的场，风刚好', venue_id: V })])).id;
  const callsTo = ep => push.calls.filter(x => x.sub.endpoint === ep);
  const SBN = (u, k) => q(`select * from notifications where user_id=$1 and kind=$2 order by id`, [u, k]).then(r => r.rows);
  await asU(sB, `select api_sb_ball($1)`, [sbPost]);
  await run(Z);
  let pa = callsTo('sbA');
  T('场边：第一个网球立刻推，标题带名字、正文引用发布', pa.length === 1 && pa[0].p.title === 'Leo 给你点了网球 🎾' && pa[0].p.body === '「今天的场，风刚好」' && pa[0].p.data.kind === 'sb_ball', pa.map(x => x.p));
  await asU(sC, `select api_sb_ball($1)`, [sbPost]); await asU(sD, `select api_sb_ball($1)`, [sbPost]);
  await run(Z + M);
  const nb = await SBN(sA, 'sb_ball');
  T('场边：没看之前后面的网球合并进同一条、不再响', callsTo('sbA').length === 1 && nb.length === 1 && nb[0].sb_count === 3 && nb[0].actor_id === sD, nb.map(x => [x.sb_count, x.actor_id === sD]));
  T('场边：合并后的文字「Nia 和另外 2 人」', R.pushText(nb[0], { actorName: 'Nia', sb: { post_body: '今天的场，风刚好' } }).title === 'Nia 和另外 2 人给你点了网球 🎾');
  await q(`update notifications set read_at=now() where id=$1`, [nb[0].id]);
  await asU(sB, `select api_sb_unball($1)`, [sbPost]); await asU(sB, `select api_sb_ball($1)`, [sbPost]);
  await run(Z + 2 * M);
  T('场边：看过之后再有新网球，再推一次', callsTo('sbA').length === 2 && (await SBN(sA, 'sb_ball')).length === 2);
  // 回复
  await asU(sB, `select api_sb_reply($1,$2)`, [sbPost, '好看！这是哪块场？']);
  await run(Z + 3 * M); pa = callsTo('sbA');
  T('场边：回复立刻推，带回复内容', pa.length === 3 && pa[2].p.title === 'Leo 回复了你' && pa[2].p.body === '好看！这是哪块场？', pa.slice(2).map(x => x.p));
  await asU(sA, `select api_sb_reply($1,$2,$3)`, [sbPost, 'Kooyong，周末人少', sB]);
  await run(Z + 4 * M); const pb = callsTo('sbB');
  T('场边：作者回复某人，被回复的人收到（作者自己不收）', pb.length === 1 && pb[0].p.title === 'Coco 回复了你' && pb[0].p.body === 'Kooyong，周末人少' && pb[0].p.data.kind === 'sb_reply_to' && callsTo('sbA').length === 3, pb.map(x => x.p));
  await asU(sC, `select api_sb_reply($1,$2)`, [sbPost, '我也想去']);
  await run(Z + 5 * M);
  T('场边：同一条 10 分钟内的回复合并、不再响（「Mia 等 2 人回复了你」）', callsTo('sbA').length === 3 && (await SBN(sA, 'sb_reply')).length === 1 && (await SBN(sA, 'sb_reply'))[0].sb_count === 2
    && R.pushText((await SBN(sA, 'sb_reply'))[0], { actorName: 'Mia' }).title === 'Mia 等 2 人回复了你');
  // 删了的不推
  await asU(sD, `select api_sb_reply($1,$2)`, [sbPost, '马上删']);
  await q(`update notifications set created_at = created_at - interval '11 minutes' where user_id=$1 and kind='sb_reply'`, [sA]);
  const sbR3 = await asU(sD, `select api_sb_reply($1,$2)`, [sbPost, '这条也删']); await asU(sD, `select api_sb_reply_delete($1)`, [sbR3]);
  await run(Z + 6 * M);
  const nr = (await SBN(sA, 'sb_reply')).at(-1);
  T('场边：回复被删了 → 推送前判为过时，不推', callsTo('sbA').length === 3 && await D(nr.id) === 'none/stale:removed', await D(nr.id));
  await asU(sC, `select api_sb_ball($1)`, [(await asU(sB, `select api_sb_post($1::jsonb)`, [JSON.stringify({ body: 'B 的' })])).id]);
  await q(`update sb_posts set status='hidden' where user_id=$1`, [sB]);
  await run(Z + 7 * M);
  T('场边：发布被后台隐藏 → 不推', (await SBN(sB, 'sb_ball')).length === 1 && await D((await SBN(sB, 'sb_ball'))[0].id) === 'none/stale:removed');
  // 夜里顺延；不发邮件
  await q(`update notifications set read_at=now() where user_id=$1`, [sA]);
  await asU(sB, `select api_sb_unball($1)`, [sbPost]); await asU(sB, `select api_sb_ball($1)`, [sbPost]);
  const before2 = callsTo('sbA').length; await run(9 * H);   // 23:00
  const nn = (await SBN(sA, 'sb_ball')).at(-1);
  T('场边：夜里 23 点 → 顺延到早上 8 点', callsTo('sbA').length === before2 && nn.deferred === true && +new Date(nn.send_after) === T0 + 18 * H, nn.send_after);
  const sbD = (await asU(sD, `select api_sb_post($1::jsonb)`, [JSON.stringify({ body: 'D 的' })])).id;
  await asU(sB, `select api_sb_ball($1)`, [sbD]); await run(Z + 8 * M); await flush(Z + H);
  T('场边：推不到也不发邮件', (await OB(sD)).length === 0 && /none\/no_push/.test(await D((await SBN(sD, 'sb_ball'))[0].id)));
  // ---------- 新消息（11-04）：私信 / 球局群聊的消息推到手机，点开去那个会话 ----------
  const cA = await user('Cora'), cB = await user('Dan'); await dev(cB, 'mobile', { ep: 'chatB' }); await dev(cB, 'desktop', { ep: 'chatBd' });
  const tCh = await asU(cA, `select api_thread_dm($1)`, [cB]);
  await asU(cA, `select api_message_send($1,$2)`, [tCh, '明早 7 点老地方见，我带球']);
  const cn = await one(`select * from notifications where user_id=$1 and kind='chat'`, [cB]);
  T('新消息：私信发出后生成 chat 通知（带会话 id，不带球局）', cn && cn.thread_id === tCh && cn.game_id === null && cn.actor_id === cA, cn);
  const Zc = 12 * H;   // 墨尔本 2027-03-10 02:00 之后的夜里：别的提醒会顺延，消息像短信一样照推
  s = await run(Zc);
  const cc = callsTo('chatB');
  T('新消息：夜里也立刻推到手机（不顺延），电脑端不推', cc.length === 1 && callsTo('chatBd').length === 0 && cn && (await NR(cn.id)).pushed_at !== null, [cc.length, callsTo('chatBd').length]);
  T('新消息：私信推送文字直白——标题「你收到一条新私信」、正文留空（手机上只显示两行），不带发送人和内容', cc[0] && cc[0].p.title === '你收到一条新私信' && cc[0].p.body === '' && !JSON.stringify(cc[0].p).includes('Cora') && !JSON.stringify(cc[0].p).includes('老地方'), cc[0] && cc[0].p);
  T('新消息：推送带会话 id 和类型，点开地址是 /melbourne/?t=会话', cc[0] && cc[0].p.data.kind === 'chat' && cc[0].p.data.thread_id === tCh && cc[0].p.data.url === `/melbourne/?t=${tCh}`, cc[0] && cc[0].p.data);
  // 已经在应用里看过了（打开会话标已读）→ 推送前判为过时，不推
  await asU(cA, `select api_message_send($1,$2)`, [tCh, '再确认一下场地']);
  await q(`update notifications set created_at = created_at - interval '6 minutes' where user_id=$1 and kind='chat'`, [cB]);
  await asU(cA, `select api_message_send($1,$2)`, [tCh, '第三条']);
  await asU(cB, `select api_chat_notif_read($1)`, [tCh]);
  const before3 = callsTo('chatB').length; await run(Zc + M);
  T('新消息：对方已经点开会话（通知已读）→ 不再推', callsTo('chatB').length === before3, [callsTo('chatB').length, before3]);
  // 球局群聊：标题带「球局聊天」
  const gChat = await game(-H), cG = await user('Gus'); await apply(gChat, cA, 'approved'); await apply(gChat, cG, 'approved'); await dev(cG, 'mobile', { ep: 'chatG' });
  const tG = await asU(cA, `select api_thread_game($1)`, [gChat]);
  await asU(cA, `select api_message_send($1,$2)`, [tG, '谁带水？']);
  await run(Zc + 2 * M);
  const cg = callsTo('chatG');
  T('新消息：球局群聊（球局已开打也照推）标题「球局群聊有新消息」，不带发送人和内容，点开去群聊', cg.length === 1 && cg[0].p.title === '球局群聊有新消息' && cg[0].p.body === '' && !JSON.stringify(cg[0].p).includes('谁带水') && !JSON.stringify(cg[0].p).includes('Cora') && cg[0].p.data.url === `/melbourne/?t=${tG}`, cg[0] && cg[0].p);
  // ---- 一条坏通知不能卡住整批（11-13 上线前审查）----
  //   为什么：dispatch 整批在一个事务里，推送是事务外的副作用。以前任何一条出错 → 整批回滚 → 下一分钟从头再来：
  //           排在它前面的每分钟被重推一次（用户收到重复推送），排在它后面的永远发不出去，直到有人手工处理。
  //   造一条必然出错的：给这条通知的投递记录装一个只对它报错的触发器（真实的数据库错误）；前后各放一条正常的。
  const Zp = 24 * H, pA = await user('Pia'), pB = await user('Pol'), pC = await user('Pam'), gP = await game(48 * H);
  for (const [u, ep] of [[pA, 'poisA'], [pB, 'poisB'], [pC, 'poisC']]) await dev(u, 'mobile', { ep });
  const nP = [];
  for (const [i, u] of [pA, pB, pC].entries()) nP.push((await one(`insert into notifications(user_id, kind, game_id, created_at) values ($1,'approved',$2,$3) returning id`, [u, gP, new Date(T0 + Zp - 3 * M + i * 1000).toISOString()])).id);
  await q(`create function test_poison() returns trigger language plpgsql as $$ begin raise exception 'poison'; end $$`);
  await q(`create trigger test_poison before insert on notification_deliveries for each row when (new.notification_id = ${Number(nP[1])} and new.reason <> 'error') execute function test_poison()`);
  let threw = null, sP = null; try { sP = await run(Zp) } catch (e) { threw = e.message }
  T('坏通知：dispatch 不整批失败', threw === null, threw);
  const pushedAt = async id => (await one(`select pushed_at from notifications where id=$1`, [id])).pushed_at;
  T('坏通知：前一条、后一条照常推出并记为已处理', callsTo('poisA').length === 1 && callsTo('poisC').length === 1 && !!(await pushedAt(nP[0])) && !!(await pushedAt(nP[2])), [callsTo('poisA').length, callsTo('poisC').length]);
  T('坏通知：这一条记为已处理（none / error），不再重试', !!(await pushedAt(nP[1])) && (await one(`select count(*)::int n from notification_deliveries where notification_id=$1 and channel='none' and reason='error'`, [nP[1]])).n === 1 && sP && sP.errors === 1, sP);
  await run(Zp + M);
  T('坏通知：下一轮谁也不会被重推', callsTo('poisA').length === 1 && callsTo('poisB').length <= 1 && callsTo('poisC').length === 1, [callsTo('poisA').length, callsTo('poisB').length, callsTo('poisC').length]);
  await q(`drop trigger test_poison on notification_deliveries`);
  // 暂时性错误（11-14 所有者评审）：死锁 / 序列化冲突 / 语句超时不是这条通知的问题——不能记成 none / error 标已处理（那样它永远不推），要整批下一轮重来
  const nT = (await one(`insert into notifications(user_id, kind, game_id, created_at) values ($1,'approved',$2,$3) returning id`, [pB, gP, new Date(T0 + Zp + 2 * M).toISOString()])).id;
  for (const code of ['40001', '40P01', '57014']) {
    await q(`create or replace function test_poison() returns trigger language plpgsql as $$ begin raise exception 'transient' using errcode = '${code}'; end $$`);
    await q(`create trigger test_poison before insert on notification_deliveries for each row when (new.notification_id = ${Number(nT)}) execute function test_poison()`);
    let th = null; try { await run(Zp + 3 * M) } catch (e) { th = e.code }
    T(`暂时性错误 ${code}：整批抛出、这条没被标成已处理、没有 error 记录`, th === code && !(await pushedAt(nT)) && (await one(`select count(*)::int n from notification_deliveries where notification_id=$1`, [nT])).n === 0, th);
    await q(`drop trigger test_poison on notification_deliveries`);
  }
  const bT = callsTo('poisB').length; await run(Zp + 4 * M);
  T('暂时性错误过去后：下一轮照常推出', !!(await pushedAt(nT)) && callsTo('poisB').length === bT + 1, [callsTo('poisB').length, bT]);
} catch (e) { fail++; console.log('FAIL 异常 ' + (e.stack || e)) }
finally { if (pool) await pool.end().catch(() => { }); c.stop() }
console.log(`notify: ${pass} 通过, ${fail} 失败`); process.exit(fail ? 1 : 0);
