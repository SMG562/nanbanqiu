// 第四批 4c：同时操作。在真实 PostgreSQL 上开多个连接，让两个操作真的同时发生：
//   每个场景跑「A 先」「B 先」两种固定顺序（先到的那个故意晚 150ms 提交，后到的必然要等它），再自由并发 25 次。
//   每次都检查：不超员、状态不矛盾、没有留下不该有的待确认申请、每个成局的邀约正好一局。
// API 约定（与 schema ⑧ 一致）：改状态一律带当前状态条件；收到 40P01 / 40001 整笔重试一次。
import { createRequire } from 'module'; import path from 'path'; import { fileURLToPath } from 'url';
import { startCluster, loadSchema } from './cluster.mjs';
const require = createRequire(import.meta.url); const pg = require('pg');
const HERE = path.dirname(fileURLToPath(import.meta.url)), DIR = process.env.NBQ_DIR || path.join(HERE, '..', '..');
const FREE = +process.env.NBQ_RACE_N || 25;
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 600) : '')) };
const sleep = ms => new Promise(r => setTimeout(r, ms));

const c = startCluster();
let pool;
try {
  c.createdb('nbq');
  const errs = loadSchema(c, 'nbq', path.join(DIR, 'schema.sql'));
  console.log('INFO ' + c.version().split(',')[0] + ' · schema 执行错误 ' + errs.length);
  T('schema 在真实 PostgreSQL + PostGIS 上执行无错误', errs.length === 0, errs.slice(0, 5));
  pool = new pg.Pool({ host: c.host, port: c.port, user: 'postgres', database: 'nbq', max: 20 });
  const q = (s, p) => pool.query(s, p);
  const U = i => '00000000-0000-0000-0000-0000000000' + String(i).padStart(2, '0');
  await q(`insert into suburbs(name,postcode,centroid) values ('Brighton','3186','POINT(145 -37.9)') on conflict do nothing`);
  for (let i = 1; i <= 12; i++) await q(`insert into users(id,phone_e164,nickname,utr,gender) values ($1,$2,$3,5,'m')`, [U(i), '+614000000' + String(i).padStart(2, '0'), 'U' + i]);
  const V = '10000000-0000-0000-0000-000000000001';
  await q(`insert into venues(id,name,short_name,suburb,postcode,location,surfaces) values ($1,'Brighton TC','Brighton TC','Brighton','3186','POINT(145 -37.9)','{hard}')`, [V]);
  let gn = 0;
  const newGame = async ({ cap = 2, type, mode = 'approve', start = "now() + interval '2 days'", filled = 0, vis = 'public' } = {}) => {
    const r = await q(`insert into games(share_code,host_id,venue_id,starts_at,duration_min,game_type,capacity,utr_min,utr_max,created_device,join_mode,filled,visibility)
      values ($1,$2,$3,${start},90,$4,$5,3,8,'mobile',$6,$7,$8) returning id`, ['r' + (++gn), U(1), V, type || (cap === 4 ? 'doubles' : 'singles'), cap, mode, filled, vis]);
    return r.rows[0].id };
  const apply = (g, u, ago = 0) => q(`insert into game_participants(game_id,user_id,device,created_at) values ($1,$2,'mobile',now() - make_interval(mins => $3))`, [g, U(u), ago]);

  // 一笔事务：fn(client) 里执行语句；40P01 / 40001 时整笔重试一次（API 约定）
  async function tx(fn, hold) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const cl = await pool.connect();
      try { await cl.query('begin'); const r = await fn(cl); if (hold) await hold(); await cl.query('commit'); return { ok: true, r, retried: attempt > 0 } }
      catch (e) { try { await cl.query('rollback') } catch (_) { } if (['40P01', '40001'].includes(e.code) && attempt === 0) { continue } return { ok: false, err: e.message, code: e.code, retried: attempt > 0 } }
      finally { cl.release() }
    }
  }
  // 固定顺序：first 先执行语句并拿着锁 150ms，second 在这期间开始（必然要等），然后 first 提交
  async function ordered(first, second) {
    let release; const gate = new Promise(r => release = r);
    const p1 = tx(first, async () => { await gate });
    await sleep(60); const p2 = tx(second); await sleep(150); release();
    return [await p1, await p2] }
  const free = (a, b) => Promise.all([tx(a), tx(b)]);
  const runAll = async (name, setup, A, B, check) => {
    const res = [];
    for (const mode of ['A先', 'B先', ...Array(FREE).fill('并发')]) {
      const ctx = await setup();
      const [ra, rb] = mode === 'A先' ? await ordered(cl => A(cl, ctx), cl => B(cl, ctx)) : mode === 'B先' ? (await ordered(cl => B(cl, ctx), cl => A(cl, ctx))).reverse() : await free(cl => A(cl, ctx), cl => B(cl, ctx));
      const bad = await check(ctx, ra, rb, mode); res.push([mode, bad, ra, rb]) }
    const bads = res.filter(x => x[1]);
    T(`${name}（A 先 / B 先 / 并发 ${FREE} 次）`, !bads.length, bads.slice(0, 2).map(x => ({ mode: x[0], why: x[1], a: x[2], b: x[3] })));
    const dl = res.filter(x => x[2].retried || x[3].retried).length; if (dl) console.log(`INFO ${name}：死锁 / 序列化冲突后重试 ${dl} 次（均已重试成功或按规则失败）`);
  };
  const state = async g => (await q(`select g.status, g.capacity, g.filled,
      (select count(*)::int from game_participants p where p.game_id=g.id and p.status='approved') ap,
      (select count(*)::int from game_participants p where p.game_id=g.id and p.status='pending') pend,
      (select json_object_agg(user_id, status::text || coalesce(':' || decline_reason, '')) from game_participants p where p.game_id=g.id and p.role='player') rows
    from games g where g.id=$1`, [g])).rows[0];
  const fullOK = s => s.ap + s.filled <= s.capacity && (s.status === 'cancelled' || s.status === (s.ap + s.filled >= s.capacity ? 'full' : 'open')) && (s.status === 'open' || s.pend === 0);
  const approve = (g, u) => cl => cl.query(`update game_participants set status='approved', decided_at=now(), approved_at=now() where game_id=$1 and user_id=$2 and status='pending' returning status::text`, [g, U(u)]);

  // S1 两人同时「直接加入」最后一个位置
  await runAll('S1 直接加入抢最后一个位置', async () => ({ g: await newGame({ cap: 2, mode: 'instant', start: "now() + interval '90 minutes'" }) }),
    (cl, x) => cl.query(`insert into game_participants(game_id,user_id,status,via,approved_at,decided_at) values ($1,$2,'approved','instant',now(),now())`, [x.g, U(2)]),
    (cl, x) => cl.query(`insert into game_participants(game_id,user_id,status,via,approved_at,decided_at) values ($1,$2,'approved','instant',now(),now())`, [x.g, U(3)]),
    async (x, a, b) => { const s = await state(x.g); if (!fullOK(s)) return ['超员或状态不对', s]; if (a.ok === b.ok) return ['应该正好一个成功', a, b]; const e = a.ok ? b : a; if (!/game_full/.test(e.err)) return ['失败的那个应提示已满', e.err]; return null });

  // S2 发起人在两台设备上同时通过两个申请（只剩一个位置）
  await runAll('S2 同时通过两个申请（只剩一个位置）', async () => { const g = await newGame({ cap: 2 }); await apply(g, 2); await apply(g, 3); return { g } },
    (cl, x) => approve(x.g, 2)(cl), (cl, x) => approve(x.g, 3)(cl),
    async (x, a, b) => { const s = await state(x.g); if (!fullOK(s)) return ['超员或状态不对', s]; if (!a.ok || !b.ok) return ['两笔都不应报错', a.err, b.err];
      const st = Object.values(s.rows).sort(); if (st.join() !== ['approved', 'rejected:full_auto'].join()) return ['应一个通过、一个满员自动结束', s.rows]; return null });

  // S3 发起人点「通过」的同时，申请人点了「撤回」
  await runAll('S3 通过 vs 撤回', async () => { const g = await newGame({ cap: 4 }); await apply(g, 2); return { g } },
    (cl, x) => approve(x.g, 2)(cl),
    (cl, x) => cl.query(`update game_participants set status='withdrawn', left_at=now() where game_id=$1 and user_id=$2 and status='pending' returning status::text`, [x.g, U(2)]),
    async (x, a, b) => { const s = await state(x.g); if (!fullOK(s)) return ['状态不对', s]; const n = (a.ok ? a.r.rowCount : 0) + (b.ok ? b.r.rowCount : 0);
      if (n !== 1) return ['应该正好一个生效（另一个影响 0 行 → 前台提示状态已变）', a, b]; const v = s.rows[U(2)]; if (!['approved', 'withdrawn'].includes(v)) return ['结果应为通过或撤回', v];
      if ((v === 'approved') !== (a.ok && a.r.rowCount === 1)) return ['结果和生效的操作不一致', v]; return null });

  // S4 发起人点「通过」的同时，失效任务把它标为失效
  await runAll('S4 通过 vs 申请失效任务', async () => { const g = await newGame({ cap: 4 }); await apply(g, 2); return { g } },
    (cl, x) => approve(x.g, 2)(cl),
    (cl, x) => cl.query(`update game_participants set status='expired', decline_reason='timeout', decided_at=now(), expired_at=now() where game_id=$1 and status='pending' returning user_id`, [x.g]),
    async (x, a, b) => { const s = await state(x.g); if (!fullOK(s)) return ['状态不对', s]; const n = (a.ok ? a.r.rowCount : 0) + (b.ok ? b.r.rowCount : 0);
      if (n !== 1) return ['应该正好一个生效', a, b]; return null });

  // S5 邀约：接受（建私人球局）vs 过期任务
  const invite = async () => (await q(`insert into invites(from_user,to_user,starts_at,ends_at,venue_id,game_type) values ($1,$2,now()+interval '2 days',now()+interval '2 days 90 minutes',$3,'singles') returning id`, [U(1), U(2), V])).rows[0].id;
  const accept = id => async cl => {
    const iv = (await cl.query(`select * from invites where id=$1`, [id])).rows[0];
    const g = (await cl.query(`insert into games(share_code,host_id,venue_id,starts_at,duration_min,game_type,capacity,utr_min,utr_max,created_device,visibility) values ($1,$2,$3,$4,90,'singles',2,1,16,'mobile','private') returning id`, ['iv' + (++gn), iv.from_user, iv.venue_id, iv.starts_at])).rows[0].id;
    await cl.query(`insert into game_participants(game_id,user_id,status,via,approved_at,decided_at) values ($1,$2,'approved','invite',now(),now())`, [g, iv.to_user]);
    const u = await cl.query(`update invites set status='accepted', game_id=$2, responded_at=now() where id=$1 and status in ('pending','counter')`, [id, g]);
    if (u.rowCount === 0) throw new Error('invite_changed');   // 邀约已经变了：整笔回滚（不会留下多建的球局）
    return g };
  const ivState = async id => (await q(`select i.status::text, i.game_id, (select count(*)::int from games g where g.share_code like 'iv%' and g.created_at >= i.created_at and g.host_id=i.from_user and not exists (select 1 from invites j where j.game_id=g.id)) orphans from invites i where i.id=$1`, [id])).rows[0];
  await runAll('S5 接受邀约 vs 过期任务', async () => { await q(`delete from invites`); return { id: await invite() } },
    (cl, x) => accept(x.id)(cl),
    (cl, x) => cl.query(`update invites set status='expired' where id=$1 and status in ('pending','counter')`, [x.id]),
    async (x, a, b) => { const s = await ivState(x.id); if (s.orphans) return ['多建了没有邀约的球局', s]; if (!['accepted', 'expired'].includes(s.status)) return ['结果不对', s];
      if ((s.status === 'accepted') !== !!s.game_id) return ['成局与 game_id 不一致', s]; if ((s.status === 'accepted') !== a.ok) return ['接受成功与否和结果不一致', s, a]; return null });

  // S6 双击「接受」
  await runAll('S6 双击接受邀约', async () => { await q(`delete from invites`); return { id: await invite() } },
    (cl, x) => accept(x.id)(cl), (cl, x) => accept(x.id)(cl),
    async (x, a, b) => { const s = await ivState(x.id); if (s.status !== 'accepted' || !s.game_id) return ['应该成局', s]; if (s.orphans) return ['多建了一局', s]; if (a.ok === b.ok) return ['应该正好一个成功', a, b]; return null });

  // S6b 旧版 API 忘了带状态条件：第二次「接受」也必须失败（数据库兜底）
  { await q(`delete from invites`); const id = await invite(); const r1 = await tx(accept(id));
    const r2 = await tx(async cl => { const g = (await cl.query(`insert into games(share_code,host_id,venue_id,starts_at,duration_min,game_type,capacity,utr_min,utr_max,created_device,visibility) values ($1,$2,$3,now()+interval '2 days',90,'singles',2,1,16,'mobile','private') returning id`, ['iv' + (++gn), U(1), V])).rows[0].id;
      await cl.query(`update invites set status='accepted', game_id=$2 where id=$1`, [id, g]) });
    T('S6b 不带条件的重复接受被数据库拒绝', r1.ok && !r2.ok && /invite_game_fixed/.test(r2.err), [r1, r2]);
    const r3 = await tx(cl => cl.query(`update invites set status='expired' where id=$1`, [id])); T('S6c 已成局的邀约不能再标为过期', !r3.ok && /bad_transition/.test(r3.err), r3) }

  // S7 发起人取消球局的同时，在另一台设备上点了「通过」
  await runAll('S7 取消球局 vs 通过申请', async () => { const g = await newGame({ cap: 4 }); await apply(g, 2); await apply(g, 3); return { g } },
    (cl, x) => cl.query(`update games set status='cancelled' where id=$1`, [x.g]),   // 待确认的申请由数据库随取消一起结束
    (cl, x) => approve(x.g, 2)(cl),
    async (x, a, b) => { const s = await state(x.g); if (s.status !== 'cancelled') return ['应已取消', s]; if (s.pend) return ['取消后不应留下待确认的申请', s.rows]; if (!a.ok) return ['取消不应失败', a.err];
      if (a.retried || b.retried) return ['不应出现死锁', a, b]; if (!b.ok) return ['通过不应报错（按规则落到结果）', b.err]; return null });

  // S8 发起人改「线下已有几人」的同时，有人直接加入
  await runAll('S8 线下补位 vs 直接加入', async () => { const g = await newGame({ cap: 4, mode: 'instant', start: "now() + interval '90 minutes'" });
      await q(`insert into game_participants(game_id,user_id,status,via,approved_at) values ($1,$2,'approved','instant',now())`, [g, U(2)]); return { g } },
    (cl, x) => cl.query(`update games set filled=2 where id=$1`, [x.g]),
    (cl, x) => cl.query(`insert into game_participants(game_id,user_id,status,via,approved_at) values ($1,$2,'approved','instant',now())`, [x.g, U(3)]),
    async (x, a, b) => { const s = await state(x.g); if (!fullOK(s)) return ['超员或状态不对', s]; if (a.ok === b.ok) return ['应该正好一个成功', a, b]; const e = a.ok ? b : a; if (!/game_full/.test(e.err)) return ['失败的应提示已满', e.err]; return null });

  // S9 双击「申请」：API 用 on conflict 合并成一条
  await runAll('S9 双击申请', async () => ({ g: await newGame({ cap: 4 }) }),
    (cl, x) => cl.query(`insert into game_participants(game_id,user_id,device) values ($1,$2,'mobile') on conflict (game_id,user_id) do update set status='pending', left_at=null, created_at=now() where game_participants.status in ('withdrawn','left','rejected','expired')`, [x.g, U(2)]),
    (cl, x) => cl.query(`insert into game_participants(game_id,user_id,device) values ($1,$2,'mobile') on conflict (game_id,user_id) do update set status='pending', left_at=null, created_at=now() where game_participants.status in ('withdrawn','left','rejected','expired')`, [x.g, U(2)]),
    async (x, a, b) => { const s = await state(x.g); if (!a.ok || !b.ok) return ['都不应报错', a.err, b.err]; if (Object.keys(s.rows || {}).length !== 1 || s.pend !== 1) return ['应只有一条待确认', s.rows]; return null });

  // S10 双打还缺 2 人、3 个申请被同时通过
  await runAll('S10 三个申请同时通过（只剩两个位置）', async () => { const g = await newGame({ cap: 4, filled: 1 }); for (const u of [2, 3, 4]) await apply(g, u); return { g } },
    (cl, x) => approve(x.g, 2)(cl).then(() => approve(x.g, 3)(cl)), (cl, x) => approve(x.g, 4)(cl),
    async (x, a, b) => { const s = await state(x.g); if (!fullOK(s)) return ['超员或状态不对', s]; const st = Object.values(s.rows).sort();
      if (st.filter(v => v === 'approved').length !== 2 || st.filter(v => v === 'rejected:full_auto').length !== 1) return ['应两个通过、一个满员自动结束', s.rows]; return null });

  // 单线程的规则（不需要并发也必须成立）
  { const g = await newGame({ cap: 4, start: "now() + interval '30 minutes'" }); await apply(g, 2, 40);   // 失效时间 = 开打前 60 分钟 + 15 分钟，已过
    const r = await tx(approve(g, 2)); T('已过失效时间的申请不能再通过', !r.ok && /application_expired/.test(r.err), r);
    const g2 = await newGame({ cap: 4 }); await apply(g2, 2); await q(`update game_participants set status='expired', decline_reason='timeout', expired_at=now() where game_id=$1 and role='player'`, [g2]);
    const r2 = await tx(cl => cl.query(`update game_participants set status='approved' where game_id=$1 and user_id=$2`, [g2, U(2)])); T('已失效的申请不能直接改成通过', !r2.ok && /bad_transition/.test(r2.err), r2);
    const r3 = await tx(cl => cl.query(`update game_participants set status='withdrawn', left_at=now() where game_id=$1 and user_id=$2`, [g2, U(2)])); T('已失效的申请不能改成撤回', !r3.ok && /bad_transition/.test(r3.err), r3);
    const g3 = await newGame({ cap: 4 }); await q(`insert into game_participants(game_id,user_id,status,via,approved_at) values ($1,$2,'approved','instant',now()),($1,$3,'approved','instant',now())`, [g3, U(2), U(3)]);
    const r4 = await tx(cl => cl.query(`update games set filled=2 where id=$1`, [g3])); T('线下补位不能超过空位', !r4.ok && /game_full/.test(r4.err), r4);
    const r5 = await tx(cl => cl.query(`update games set filled=1 where id=$1`, [g3])); const s5 = await state(g3); T('线下补位正好填满 → 满员', r5.ok && s5.status === 'full', [r5, s5]);
    const r6 = await tx(cl => cl.query(`update game_participants set status='left', left_at=now() where game_id=$1 and user_id=$2`, [g3, U(2)])); const s6 = await state(g3); T('有人退出 → 重新开放', r6.ok && s6.status === 'open', s6);
    const r7 = await tx(cl => cl.query(`insert into game_participants(game_id,user_id,status,via,approved_at) values ($1,$2,'approved','instant',now()) on conflict (game_id,user_id) do update set status='approved', via='instant', left_at=null, approved_at=now()`, [g3, U(2)]));
    T('退出后可以再直接加入', r7.ok && (await state(g3)).status === 'full', r7) }

  // 全库不变量
  const inv = (await q(`select count(*) filter (where ap + filled > capacity)::int over_cap, count(*) filter (where status in ('open','full') and (ap + filled >= capacity) <> (status = 'full'))::int bad_status,
      count(*) filter (where status in ('full','cancelled') and pend > 0)::int pend_left
    from (select g.*, (select count(*) from game_participants p where p.game_id=g.id and p.status='approved') ap, (select count(*) from game_participants p where p.game_id=g.id and p.status='pending') pend from games g) x`)).rows[0];
  T('全库：没有超员、满员状态都对、满员 / 取消的局里没有待确认申请', !inv.over_cap && !inv.bad_status && !inv.pend_left, inv);
} catch (e) { T('运行', false, e.stack || String(e)) }
finally { if (pool) await pool.end().catch(() => { }); c.stop() }
console.log(`${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
