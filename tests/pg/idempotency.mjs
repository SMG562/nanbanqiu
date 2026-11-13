// #276 PR①：写接口幂等的数据库部分（idempotency_keys 表 + idem_begin / idem_finish + 每晚清理）。
//   为什么：#63 盘点发现发起球局 / 发消息 / 场边发帖和回复在「服务器写进去了、但响应丢了」时，用户再点一次会重复（api_spec §0.2 第 3 条）。
//   查什么：第一次放行、同一个 key 再来返回第一次的结果、换接口报 idempotency_key_reused、不同人互不影响、失败回滚不占 key、
//           同时来两次只做一次（第一次提交 / 回滚两种情况）、超过 24 小时当新的、格式不对报 invalid、没登录报 login_required、
//           前台身份碰不到表、每晚清掉 2 天前的。
//   查不到什么：接口层怎么用（PR② 的 pg/api_write 测）、前台什么时候生成 key（PR③）。
import { createRequire } from 'module'; import path from 'path'; import { fileURLToPath } from 'url';
import { startCluster, loadSchema } from './cluster.mjs';
const require = createRequire(import.meta.url); const pg = require('pg');
const HERE = path.dirname(fileURLToPath(import.meta.url)), DIR = process.env.NBQ_DIR || path.join(HERE, '..', '..');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 500) : '')) };

const c = startCluster(); let pool;
try {
  c.createdb('nbq');
  const errs = loadSchema(c, 'nbq', path.join(DIR, 'schema.sql')); T('schema 执行无错误', !errs.length, errs.slice(0, 3));
  pool = new pg.Pool({ host: c.host, port: c.port, user: 'postgres', database: 'nbq', max: 8 });
  const q = (s, p) => pool.query(s, p);
  // 以前台身份开一个事务；fn 里依次执行，最后提交（rollback=true 时回滚）
  const tx = async (uid, fn, rollback = false) => { const cl = await pool.connect();
    try { await cl.query('begin'); await cl.query('set local role nbq_user'); if (uid) await cl.query(`select set_config('nbq.uid', $1, true)`, [uid]);
      const v = await fn((s, p) => cl.query(s, p)); await cl.query(rollback ? 'rollback' : 'commit'); return { ok: true, v } }
    catch (e) { await cl.query('rollback').catch(() => { }); return { ok: false, err: e.message, detail: e.detail } } finally { cl.release() } };
  const begin = (uid, key, route) => tx(uid, async x => (await x('select idem_begin($1, $2) r', [key, route])).rows[0].r);
  // 一次完整的写：begin → 没有旧结果就「做事」并存结果
  const once = (uid, key, route, resp) => tx(uid, async x => {
    const old = (await x('select idem_begin($1, $2) r', [key, route])).rows[0].r; if (old) return { replay: true, r: old };
    await x('select idem_finish($1, $2)', [key, JSON.stringify(resp)]); return { replay: false, r: resp } });
  const is = (r, code) => !r.ok && r.err === code;
  const id = n => '00000000-0000-0000-0000-0000000000' + String(n).padStart(2, '0');
  let un = 0; const user = async () => { const u = id(++un);
    await q(`insert into users(id,phone_e164,nickname,utr,gender,pact_accepted_at) values ($1,$2,$3,5,'m',now())`, [u, '+614000000' + u.slice(-2), 'I' + un]); return u };
  const K = n => 'k' + String(n).padStart(20, '0');
  const A = await user(), B = await user();

  // ---------- 第一次 / 再来一次 ----------
  let r = await once(A, K(1), 'POST /api/games', { id: 'g1', share_code: 'abc123' });
  T('第一次：放行并存下结果', r.ok && !r.v.replay, r);
  r = await once(A, K(1), 'POST /api/games', { id: 'g2' });
  T('同一个 key 再来：返回第一次的结果，不再做一遍', r.ok && r.v.replay && r.v.r.id === 'g1' && r.v.r.share_code === 'abc123', r);
  r = await begin(A, K(1), 'POST /api/threads/:id/messages');
  T('同一个 key 换了接口 → idempotency_key_reused', is(r, 'idempotency_key_reused'), r);
  r = await once(B, K(1), 'POST /api/games', { id: 'gB' });
  T('别人用同一个 key：互不影响（各算各的）', r.ok && !r.v.replay && r.v.r.id === 'gB', r);
  T('表里一人一个 key 一行', +(await q(`select count(*) n from idempotency_keys where key = $1`, [K(1)])).rows[0].n === 2);

  // ---------- 失败回滚不占 key ----------
  r = await tx(A, async x => { await x('select idem_begin($1, $2)', [K(2), 'POST /api/games']); throw new Error('写操作失败') });
  T('写操作失败（整笔回滚）', !r.ok);
  r = await once(A, K(2), 'POST /api/games', { id: 'g3' });
  T('失败过的 key 再来：当第一次，照常做', r.ok && !r.v.replay && r.v.r.id === 'g3', r);

  // ---------- 同时来两次 ----------
  const race = async (key, firstCommits) => {
    const c1 = await pool.connect(), c2 = await pool.connect();
    try {
      for (const cl of [c1, c2]) { await cl.query('begin'); await cl.query('set local role nbq_user'); await cl.query(`select set_config('nbq.uid', $1, true)`, [A]) }
      const r1 = (await c1.query('select idem_begin($1, $2) r', [key, 'POST /api/threads/:id/messages'])).rows[0].r;
      let done = false; const p2 = c2.query('select idem_begin($1, $2) r', [key, 'POST /api/threads/:id/messages']).then(x => { done = true; return x.rows[0].r });
      await new Promise(res => setTimeout(res, 300)); const waited = !done;
      if (firstCommits) { await c1.query('select idem_finish($1, $2)', [key, JSON.stringify({ id: 41 })]); await c1.query('commit') } else await c1.query('rollback');
      const r2 = await p2;
      if (r2 === null) await c2.query('select idem_finish($1, $2)', [key, JSON.stringify({ id: 42 })]);
      await c2.query('commit');
      return { r1, r2, waited };
    } finally { c1.release(); c2.release() } };
  let x = await race(K(3), true);
  T('同时两次：第二次等第一次的事务结束', x.waited, x);
  T('同时两次、第一次提交：第二次拿到第一次的结果', x.r1 === null && x.r2 && x.r2.id === 41, x);
  x = await race(K(4), false);
  T('同时两次、第一次回滚：第二次当第一次来做', x.waited && x.r1 === null && x.r2 === null, x);
  T('……而且只留下第二次的结果', (await q(`select response from idempotency_keys where user_id = $1 and key = $2`, [A, K(4)])).rows[0]?.response?.id === 42);

  // ---------- 24 小时 ----------
  await q(`update idempotency_keys set created_at = now() - interval '23 hours' where user_id = $1 and key = $2`, [A, K(2)]);
  r = await once(A, K(2), 'POST /api/games', { id: 'g4' }); T('23 小时内：还是返回第一次的结果', r.ok && r.v.replay && r.v.r.id === 'g3', r);
  await q(`update idempotency_keys set created_at = now() - interval '25 hours' where user_id = $1 and key = $2`, [A, K(2)]);
  r = await once(A, K(2), 'POST /api/sideline/posts', { id: 'p1' }); T('超过 24 小时：当新的（换接口也行）', r.ok && !r.v.replay && r.v.r.id === 'p1', r);

  // ---------- 参数和身份 ----------
  for (const [k, why] of [['short', '太短'], ['x'.repeat(65), '太长'], ['has space 0000000000', '有空格'], ['中文中文中文中文中文中文中文中文', '非 ASCII'], [null, '没有']]) {
    r = await begin(A, k, 'POST /api/games'); T(`key ${why} → invalid`, is(r, 'invalid') && r.detail === 'idempotency_key', r) }
  r = await begin(A, K(5), ''); T('route 空 → invalid', is(r, 'invalid'), r);
  r = await begin(null, K(5), 'POST /api/games'); T('没登录 → login_required', is(r, 'login_required'), r);
  r = await tx(A, async x => (await x('select idem_finish($1, $2)', [K(9), '{}'])).rows); T('没 begin 就 finish → state_changed', is(r, 'state_changed'), r);
  r = await tx(A, async x => { await x('select idem_begin($1, $2)', [K(6), 'POST /api/games']); await x('select idem_finish($1, $2)', [K(6), '{"id":1}']); await x('select idem_finish($1, $2)', [K(6), '{"id":2}']) });
  T('同一个 key finish 两次 → state_changed（结果不会被改写）', is(r, 'state_changed'), r);
  r = await tx(A, async x => (await x('select * from idempotency_keys')).rows); T('前台身份不能直接读表', !r.ok && /permission denied/.test(r.err), r);
  r = await tx(A, async x => x(`insert into idempotency_keys(user_id, key, route, response) values ($1, $2, 'x', '{}')`, [A, K(7)])); T('前台身份不能直接写表', !r.ok && /permission denied/.test(r.err), r);
  for (const role of ['anon', 'authenticated', 'nbq_viewer']) {
    const ok = (await q(`select has_function_privilege($1, 'idem_begin(text,text)', 'execute') a, has_function_privilege($1, 'idem_finish(text,jsonb)', 'execute') b`, [role])).rows[0];
    T(`${role} 不能调用 idem_begin / idem_finish`, !ok.a && !ok.b, ok) }

  // ---------- 每晚清理 ----------
  await q(`update idempotency_keys set created_at = now() - interval '3 days' where key = $1`, [K(1)]);
  await q(`update idempotency_keys set created_at = now() - interval '30 hours' where user_id = $1 and key = $2`, [A, K(3)]);
  const before = +(await q(`select count(*) n from idempotency_keys`)).rows[0].n;
  await q(`select job_nightly()`);
  const left = (await q(`select key from idempotency_keys`)).rows.map(r => r.key);
  T('每晚：清掉 2 天前的（两个人的 K1）', !left.includes(K(1)) && left.length === before - 2, { before, left });
  T('每晚：1–2 天之间的留着', left.includes(K(3)), left);
} catch (e) { fail++; console.log('FAIL 异常', e.stack || e.message) }
finally { try { await pool?.end() } catch (_) { } c.stop() }
console.log(`idempotency: ${pass} 通过, ${fail} 失败`); process.exit(fail ? 1 : 0);
