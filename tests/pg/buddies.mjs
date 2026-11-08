// 球友（#110 PR-A）：当面扫码加球友 —— api_buddy_request / api_buddy_respond / api_buddy_remove / api_buddies 的规则、权限、不泄露「被忽略」。
//   调用方式和 pg/rackets 一样：begin; set local role nbq_user; set_config('nbq.uid', …); select api_…; commit
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
  const q = (s, p) => pool.query(s, p);
  const as = async (uid, sql, params) => { const cl = await pool.connect();
    try { await cl.query('begin'); await cl.query('set local role nbq_user'); if (uid) await cl.query(`select set_config('nbq.uid', $1, true)`, [uid]);
      const r = await cl.query(sql, params); await cl.query('commit'); return { ok: true, v: r.rows[0] && Object.values(r.rows[0])[0], rows: r.rows } }
    catch (e) { await cl.query('rollback').catch(() => { }); return { ok: false, err: e.message, detail: e.detail } } finally { cl.release() } };
  const ask = (u, to, src) => as(u, 'select api_buddy_request($1, $2) v', [to, src ?? null]);
  const row = async rid => (await q('select status, source, accepted_via from buddy_requests where id=$1', [rid])).rows[0];
  const respond = (u, id, a) => as(u, 'select api_buddy_respond($1, $2) v', [id, a]);
  const list = async u => (await as(u, 'select api_buddies() v')).v;
  const ids = (arr, k) => (arr || []).map(x => x[k]).sort().join(',');
  const notifs = async (u, kind) => +(await q(`select count(*) from notifications where user_id=$1 and kind=$2`, [u, kind])).rows[0].count;

  const id = n => '00000000-0000-0000-0000-0000000000' + String(n).padStart(2, '0');
  const [A, B, C, D, E, X] = [1, 2, 3, 4, 5, 6].map(id);
  for (const [u, nm] of [[A, 'Amy'], [B, 'Ben'], [C, 'Cat'], [D, 'Dan'], [E, 'Eve'], [X, 'Xin']]) await q(`insert into users(id,phone_e164,nickname,utr) values ($1,$2,$3,5)`, [u, '+6140000' + u.slice(-4), nm]);

  // —— 申请 → 确认
  let r = await ask(A, B); const r1 = r.v && r.v.id;
  T('A 扫 B → pending，B 收到 buddy_request 通知', r.ok && r.v.status === 'pending' && r1 && await notifs(B, 'buddy_request') === 1, r);
  r = await ask(A, B); T('重复扫：返回同一条 pending，不重复提醒', r.ok && r.v.id === r1 && await notifs(B, 'buddy_request') === 1, r);
  let L = await list(B); T('B 的 incoming 里有 A 的申请', ids(L.incoming, 'from_user') === A && L.buddies.length === 0, L);
  L = await list(A); T('A 的 outgoing 里有给 B 的申请，不带状态字段', ids(L.outgoing, 'to_user') === B && !('status' in L.outgoing[0]), L);
  r = await respond(A, r1, 'accept'); T('发起人不能自己确认 → not_found', !r.ok && r.err === 'not_found', r);
  T('没给来源 → 记为 qr', (await row(r1)).source === 'qr');
  r = await respond(B, r1, 'accept'); T('B 确认 → buddies，A 收到 buddy_accepted', r.ok && r.v === 'buddies' && await notifs(A, 'buddy_accepted') === 1, r);
  T('确认的记 accepted_via = confirm', (await row(r1)).accepted_via === 'confirm');
  T('清空内存 → 重读 → 两边都在对方的球友里', ids((await list(A)).buddies, 'user_id') === B && ids((await list(B)).buddies, 'user_id') === A);
  T('确认后两边的申请列表都清空', (await list(A)).outgoing.length === 0 && (await list(B)).incoming.length === 0);
  r = await respond(B, r1, 'accept'); T('同一条再确认 → buddy_request_ended', !r.ok && r.err === 'buddy_request_ended', r);
  r = await ask(B, A); T('已经是球友再扫 → buddies，不发通知', r.ok && r.v.status === 'buddies' && await notifs(A, 'buddy_request') === 0, r);

  // —— 忽略：发起人看不出来
  r = await ask(C, D); const r2 = r.v.id;
  r = await respond(D, r2, 'ignore'); T('D 忽略 → ignored，C 没收到任何通知', r.ok && r.v === 'ignored' && +(await q(`select count(*) from notifications where user_id=$1`, [C])).rows[0].count === 0, r);
  L = await list(C); T('被忽略后 C 仍看到「等待 TA 确认」（outgoing 里还在）', ids(L.outgoing, 'to_user') === D, L);
  T('D 的 incoming 里不再有', (await list(D)).incoming.length === 0);
  r = await ask(C, D); T('24 小时内再扫：仍返回同一条（看起来还在等），D 不会再收到提醒', r.ok && r.v.status === 'pending' && r.v.id === r2 && await notifs(D, 'buddy_request') === 1, r);
  await q(`update buddy_requests set expires_at = now() - interval '1 minute' where id=$1`, [r2]);
  T('过了 24 小时：C 的 outgoing 消失', (await list(C)).outgoing.length === 0);
  r = await ask(C, D); const r3 = r.v && r.v.id; T('失效后再扫 → 新的一条申请', r.ok && r.v.status === 'pending' && r3 && r3 !== r2, r);
  await respond(D, r3, 'ignore'); await q(`update buddy_requests set expires_at = now() - interval '1 minute' where id=$1`, [r3]);
  r = await ask(C, D); T('30 天内被忽略 2 次 → buddy_limit（和每日上限同一个码）', !r.ok && r.err === 'buddy_limit', r);
  await q(`update buddy_requests set responded_at = now() - interval '31 days' where from_user=$1 and to_user=$2`, [C, D]);
  r = await ask(C, D); T('超过 30 天 → 又能申请', r.ok && r.v.status === 'pending', r);

  T('每次忽略记一条风险信号（发起人 C，ref = 忽略的人 D）', +(await q(`select count(*) from risk_events where user_id=$1 and kind='buddy_ignored' and ref=$2`, [C, D])).rows[0].count === 2);
  T('只被 1 个人忽略：不触发 buddy_ignored（阈值 3 个不同的人）', !(await q(`select 1 from risk_values() v where v.user_id=$1 and v.code='buddy_ignored' and v.value >= 3`, [C])).rowCount);
  // —— 失效后不能再确认
  r = await ask(E, A); const r4 = r.v.id; await q(`update buddy_requests set expires_at = now() - interval '1 minute' where id=$1`, [r4]);
  r = await respond(A, r4, 'accept'); T('过期的申请确认 → buddy_request_ended', !r.ok && r.err === 'buddy_request_ended', r);
  T('过期的不出现在 A 的 incoming', (await list(A)).incoming.length === 0);

  // —— 互相扫了
  r = await ask(D, E, 'link'); const r5 = r.v && r.v.id; T('D 扫 E（来自链接）→ pending，来源记 link', r.ok && r.v.status === 'pending' && (await row(r5)).source === 'link', r);
  r = await ask(E, D); T('E 也扫了 D → 直接成为球友，D 收到 buddy_accepted', r.ok && r.v.status === 'buddies' && ids((await list(D)).buddies, 'user_id') === E && await notifs(D, 'buddy_accepted') === 1, r);
  T('互扫的记 accepted_via = mutual，状态 accepted', JSON.stringify(await row(r5)) === JSON.stringify({ status: 'accepted', source: 'link', accepted_via: 'mutual' }), await row(r5));

  // —— 边界与权限
  r = await ask(A, A); T('扫自己 → buddy_self', !r.ok && r.err === 'buddy_self', r);
  r = await ask(A, C, 'wechat'); T('来源不在 qr / link / other → invalid source', !r.ok && r.err === 'invalid' && r.detail === 'source', r);
  r = await ask(A, id(99)); T('不存在的人 → not_found', !r.ok && r.err === 'not_found', r);
  r = await ask(null, B); T('没登录 → login_required', !r.ok && r.err === 'login_required', r);
  r = await respond(B, r1, 'reject'); T('action 不对 → invalid', !r.ok && r.err === 'invalid', r);
  await q(`insert into blocks(blocker_id, blocked_id) values ($1,$2)`, [X, A]);
  r = await ask(A, X); T('对方屏蔽了我 → blocked', !r.ok && r.err === 'blocked', r);
  r = await ask(X, A); T('我屏蔽了对方 → blocked', !r.ok && r.err === 'blocked', r);
  await q(`insert into blocks(blocker_id, blocked_id) values ($1,$2)`, [B, A]);
  T('屏蔽后球友列表互相不显示', (await list(A)).buddies.length === 0 && (await list(B)).buddies.length === 0);
  await q(`delete from blocks where blocker_id=$1 and blocked_id=$2`, [B, A]);
  for (const st of ['suspended', 'limited', 'review']) {
    await q(`update users set status=$2, status_since=now(), status_until=case when $2='suspended' then now() + interval '1 day' end where id=$1`, [C, st]);
    r = await ask(C, B); T(`账号 ${st} → account_${st}`, !r.ok && r.err === 'account_' + st, r) }
  await q(`update users set status='suspended', status_since=now() - interval '1 day 1 minute', status_until=now() - interval '1 minute' where id=$1`, [C]);
  r = await ask(C, B); T('暂停到期 → 可以申请', r.ok && r.v.status === 'pending', r);
  await q(`update users set status='active', status_until=null where id=$1`, [C]);
  T('C 发给 B 的申请在 C 的 outgoing 里', ids((await list(C)).outgoing, 'to_user').includes(B));
  await q(`update users set status='banned' where id=$1`, [B]);
  T('对方被封禁：C 的 outgoing 不再显示这条', !ids((await list(C)).outgoing, 'to_user').includes(B));
  await q(`update users set status='active' where id=$1`, [B]);
  for (let i = 0; i < 9; i++) { const u = id(30 + i); await q(`insert into users(id,phone_e164,nickname,utr) values ($1,$2,$3,5)`, [u, '+6140001' + u.slice(-4), 'P' + i]); await ask(E, u) }
  const u11 = id(40); await q(`insert into users(id,phone_e164,nickname,utr) values ($1,$2,'P11',5)`, [u11, '+61400019940']);
  T('E 24 小时内已发 10 个', +(await q(`select count(*) from buddy_requests where from_user=$1 and created_at > now() - interval '24 hours'`, [E])).rows[0].count === 10);
  r = await ask(E, u11); T('第 11 个 → buddy_limit', !r.ok && r.err === 'buddy_limit', r);
  r = await as(B, 'select * from buddy_requests'); T('前台不能直接读 buddy_requests（看不到 ignored 状态）', !r.ok && /permission denied/.test(r.err), r);
  r = await as(B, `insert into buddies(user_a,user_b) values ($1,$2)`, [B < C ? B : C, B < C ? C : B]); T('前台不能直接写 buddies', !r.ok && /permission denied/.test(r.err), r);
  r = await as(C, 'select * from buddies'); T('只能读自己相关的 buddies 行', r.ok && r.rows.every(x => [x.user_a, x.user_b].includes(C)), r);

  // —— 删除球友：不通知
  const before = +(await q(`select count(*) from notifications where user_id=$1`, [E])).rows[0].count;
  r = await as(D, 'select api_buddy_remove($1)', [E]); T('D 删除 E → 两边都不再是球友', r.ok && (await list(D)).buddies.length === 0 && (await list(E)).buddies.length === 0, r);
  T('删除不通知对方', +(await q(`select count(*) from notifications where user_id=$1`, [E])).rows[0].count === before);
  r = await as(D, 'select api_buddy_remove($1)', [E]); T('重复删除不报错', r.ok, r);

  // —— 迁移可重复运行
  const src = async f => (await q(`select prosrc from pg_proc where proname=$1`, [f])).rows.map(r => r.prosrc).join('\n---\n');
  const fnBefore = {}; for (const f of ['risk_values', 'job_anonymize_deleted', 'api_buddy_request', 'api_buddy_respond', 'api_buddies', 'buddy_stats']) fnBefore[f] = await src(f);
  const errs2 = loadSchema(c, 'nbq', path.join(DIR, 'server', 'migrations', '20261108_buddies.sql'));
  for (const f of Object.keys(fnBefore)) T(`迁移里的 ${f} 与 schema.sql 一字不差`, (await src(f)) === fnBefore[f]);
  T('迁移后 risk_events 仍接受 buddy_ignored', (await q(`insert into risk_events(user_id,kind,ref) values ($1,'buddy_ignored','x') returning id`, [A])).rowCount === 1); T('迁移在已有库上再跑一遍无错误', !errs2.length, errs2.slice(0, 3));
  T('再跑一遍后数据还在', ids((await list(A)).buddies, 'user_id') === B && +(await q('select count(*) from buddies')).rows[0].count === 1);
} catch (e) { fail++; console.log('FAIL 异常 ' + (e.stack || e)) }
finally { if (pool) await pool.end().catch(() => { }); c.stop() }
console.log(`buddies: ${pass} 通过, ${fail} 失败`); process.exit(fail ? 1 : 0);
