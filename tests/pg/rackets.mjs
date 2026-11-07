// 我的球拍（#60 PR-A1）：user_rackets 表 + api_set_rackets 整组替换的服务器校验、权限、迁移可重复。
//   调用方式和 pg/api 一样：begin; set local role nbq_user; set_config('nbq.uid', …); select api_set_rackets(…); commit
import { createRequire } from 'module'; import path from 'path'; import fs from 'fs'; import { fileURLToPath } from 'url';
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
  const set = (uid, list) => as(uid, 'select api_set_rackets($1::jsonb) v', [JSON.stringify(list)]);
  const bad = (r, detail) => !r.ok && r.err === 'invalid' && (detail === undefined || r.detail === detail);
  const mine = async uid => (await as(uid, 'select slot, brand, series from user_rackets order by slot')).rows;
  const fmt = rows => rows.map(x => `${x.slot}:${x.brand ?? '-'}/${x.series}`).join(' ');

  const id = n => '00000000-0000-0000-0000-0000000000' + String(n).padStart(2, '0'); const A = id(1), B = id(2), NOBODY = id(99);
  for (const [u, nm] of [[A, 'Amy'], [B, 'Ben']]) await q(`insert into users(id,phone_e164,nickname,utr) values ($1,$2,$3,5)`, [u, '+6140000' + u.slice(-4), nm]);

  // —— 基本读写
  T('一开始没有球拍', (await mine(A)).length === 0);
  let r = await set(A, []); T('写空数组 → 返回 []', r.ok && Array.isArray(r.v) && r.v.length === 0, r);
  r = await set(A, [{ brand: 'Wilson', series: 'Pro Staff' }]);
  T('写 1 把 → 返回 slot 1', r.ok && fmt(r.v) === '1:Wilson/Pro Staff', r);
  T('清空内存 → 重读 → 还在', fmt(await mine(A)) === '1:Wilson/Pro Staff');
  r = await set(A, [{ brand: 'Head', series: 'Speed' }, { brand: 'Babolat', series: 'Pure Drive' }, { brand: null, series: '自己穿线的老拍' }]);
  T('写 3 把：数组顺序 = slot，「其他」只填系列也能存', r.ok && fmt(r.v) === '1:Head/Speed 2:Babolat/Pure Drive 3:-/自己穿线的老拍', r);
  T('整组替换：旧的 Wilson 消失', fmt(await mine(A)) === '1:Head/Speed 2:Babolat/Pure Drive 3:-/自己穿线的老拍');
  const t0 = (await q(`select created_at from user_rackets where user_id=$1 and slot=1`, [A])).rows[0].created_at;
  r = await set(A, [{ brand: 'Babolat', series: 'Pure Drive' }, { brand: 'Head', series: 'Speed' }, { series: '自己穿线的老拍' }]);
  T('设为主力（与 1 号交换）→ 顺序变了；brand 省略 = 其他', r.ok && fmt(r.v) === '1:Babolat/Pure Drive 2:Head/Speed 3:-/自己穿线的老拍', r);
  T('交换后同一把拍子的 created_at 不变', +(await q(`select created_at from user_rackets where user_id=$1 and series='Speed'`, [A])).rows[0].created_at === +t0);
  const r1 = await set(A, [{ brand: 'Babolat', series: 'Pure Drive' }, { brand: 'Head', series: 'Speed' }, { series: '自己穿线的老拍' }]);
  T('重复提交结果不变', r1.ok && fmt(r1.v) === fmt(r.v), r1);
  r = await set(A, [{ brand: '  Yonex ', series: ' EZONE\t ' }]);
  T('去首尾空白和控制字符', r.ok && fmt(r.v) === '1:Yonex/EZONE', r);
  r = await set(A, [{ brand: '', series: 'Clash　 100' }]);
  T('品牌空串 = 其他；中间连续空白（含全角空格）并成一个', r.ok && fmt(r.v) === '1:-/Clash 100', r);

  // —— 校验不过 → invalid，原来的不丢
  const keep = fmt(await mine(A));
  const cases = [
    ['第 4 把被拒', [1, 2, 3, 4].map(i => ({ brand: 'B' + i, series: 'S' + i })), 'rackets'],
    ['不是数组被拒', { brand: 'Head', series: 'Speed' }, 'rackets'],
    ['元素不是对象被拒', ['Head Speed'], 'rackets'],
    ['系列超过 30 字被拒', [{ brand: 'Head', series: 'x'.repeat(31) }], 'series'],
    ['品牌超过 30 字被拒', [{ brand: '品'.repeat(31), series: 'Speed' }], 'brand'],
    ['系列全是空格被拒', [{ brand: 'Head', series: '  　 ' }], 'series'],
    ['没有系列被拒', [{ brand: 'Head' }], 'series'],
    ['系列不是文字被拒', [{ brand: 'Head', series: 360 }], 'series'],
    ['品牌不是文字被拒', [{ brand: ['Head'], series: 'Speed' }], 'brand'],
    ['同一把重复（不分大小写、空白）被拒', [{ brand: 'Head', series: 'Speed' }, { brand: ' head', series: 'SPEED ' }], 'duplicate'],
    ['「其他」里重复被拒', [{ series: '老拍' }, { brand: '', series: '老拍' }], 'duplicate'],
    ['链接 http 被拒', [{ series: 'http://x.co' }], 'series'],
    ['www 被拒（不分大小写）', [{ series: 'WWW.shop' }], 'series'],
    ['@ 被拒', [{ series: 'ask @me' }], 'series'],
    ['全角＠被拒', [{ series: '找我＠微信' }], 'series'],
    ['连续 6 位数字被拒', [{ series: '加我 123456' }], 'series'],
    ['全角数字连续 6 位被拒', [{ series: '０４１２３４' }], 'series'],
    ['品牌里有链接也拒', [{ brand: 'www', series: 'Speed' }], 'brand'],
  ];
  for (const [name, list, detail] of cases) { const x = await set(A, list); T(name + ' → invalid / ' + detail, bad(x, detail), x) }
  T('校验失败后原来的球拍都还在', fmt(await mine(A)) === keep, await mine(A));
  r = await set(A, [{ brand: 'Prince', series: 'TF40 315' }]); T('5 位以内的数字（型号）可以存', r.ok, r);
  r = await as(A, 'select api_set_rackets(null) v'); T('null 被拒', bad(r, 'rackets'), r);

  // —— 权限
  r = await set(null, [{ brand: 'Head', series: 'Speed' }]); T('没登录 → login_required', !r.ok && r.err === 'login_required', r);
  r = await set(NOBODY, [{ brand: 'Head', series: 'Speed' }]); T('不存在的球友 → login_required', !r.ok && r.err === 'login_required', r);
  await set(B, [{ brand: 'Dunlop', series: 'CX' }]);
  T('别人读不到我的', (await mine(B)).length === 1 && (await as(B, 'select count(*)::int v from user_rackets where user_id=$1', [A])).v === 0);
  r = await as(B, `insert into user_rackets(user_id, slot, series) values ($1, 2, 'Hack')`, [A]); T('前台不能直接写表（别人的）', !r.ok && /permission denied/.test(r.err), r);
  r = await as(A, `insert into user_rackets(user_id, slot, series) values ($1, 2, 'Hack')`, [A]); T('前台不能直接写表（自己的，绕过校验）', !r.ok && /permission denied/.test(r.err), r);
  r = await as(A, `update user_rackets set series = 'www' where user_id = $1`, [A]); T('前台不能直接改表', !r.ok && /permission denied/.test(r.err), r);
  r = await as(A, `delete from user_rackets where user_id = $1`, [B]); T('前台不能删别人的', !r.ok && /permission denied/.test(r.err), r);
  T('我的写入没碰到 B', fmt(await mine(B)) === '1:Dunlop/CX');
  r = await as(A, `select nbq_racket_bad('x') v`); T('清洗 / 校验辅助函数前台不能直接调', !r.ok && /permission denied/.test(r.err), r);

  // —— 表约束兜底（就算绕过函数直接写也进不去）
  for (const [name, sql] of [['slot 4', `insert into user_rackets(user_id,slot,series) values ($1,4,'x')`], ['系列首尾空白', `insert into user_rackets(user_id,slot,series) values ($1,3,' x')`],
    ['系列 31 字', `insert into user_rackets(user_id,slot,series) values ($1,3,repeat('x',31))`], ['同一把不同 slot', `insert into user_rackets(user_id,slot,brand,series) values ($1,3,'DUNLOP','cx')`]]) {
    let ok = true; try { await q(sql, [B]) } catch (_) { ok = false } T('表约束拦：' + name, !ok) }
  await q(`delete from users where id = $1`, [B]); T('删用户行 → 球拍跟着删（cascade）', +(await q(`select count(*) from user_rackets where user_id=$1`, [B])).rows[0].count === 0);

  // —— 迁移可重复运行（schema 已含本迁移，再跑两次）
  const mig = fs.readFileSync(path.join(DIR, 'server/migrations/20261107_user_rackets.sql'), 'utf8');
  let e1 = null; try { await q(mig); await q(mig) } catch (e) { e1 = e.message } T('迁移连跑两次不报错', e1 === null, e1);
  T('迁移重跑后数据还在', fmt(await mine(A)) === '1:Prince/TF40 315');
  T('schema_migrations 记了本迁移', +(await q(`select count(*) from schema_migrations where version='20261107_user_rackets'`)).rows[0].count === 1);
  // A2：注销匿名化删球拍的迁移也可重复，跑完后函数和 schema.sql 里的一模一样（迁移里是整段函数，别跟 schema 走岔）
  const src0 = (await q(`select prosrc from pg_proc where proname='job_anonymize_deleted'`)).rows[0].prosrc;
  const wipe = fs.readFileSync(path.join(DIR, 'server/migrations/20261107_wipe_rackets.sql'), 'utf8');
  e1 = null; try { await q(wipe); await q(wipe) } catch (e) { e1 = e.message } T('A2 迁移连跑两次不报错', e1 === null, e1);
  T('A2 迁移后 job_anonymize_deleted 与 schema.sql 一致且含删球拍', (await q(`select prosrc from pg_proc where proname='job_anonymize_deleted'`)).rows[0].prosrc === src0 && /delete from user_rackets/.test(src0));

  // ===== A4 产品库（#60，ADR 0009）=====
  // 上面「A1 迁移连跑两次」会把 api_set_rackets 换回 A1 版；按迁移顺序再执行一次 A4（正式库也是按这个顺序跑整包）
  const cat4 = fs.readFileSync(path.join(DIR, 'server/migrations/20261108_racket_catalog.sql'), 'utf8'); await q(cat4);
  const C = await q(`select id, brand, series from racket_catalog order by sort`), cat = (b, s2) => C.rows.find(x => x.brand === b && x.series === s2).id;
  T('A4 种子：25 条，全部可选', C.rows.length === 25 && +(await q(`select count(*) from racket_catalog where status <> 'active'`)).rows[0].count === 0, C.rows.length);
  const D = id(3); await q(`insert into users(id,phone_e164,nickname,utr) values ($1,'+61400000003','Dee',5)`, [D]);
  const cid = async u => (await q(`select slot, brand, series, catalog_id from user_rackets where user_id=$1 order by slot`, [u])).rows;
  r = await set(D, [{ catalog_id: cat('Wilson', 'Blade') }]);
  T('A4 按 catalog_id 选：名字用产品库的，记 id', r.ok && r.v[0].brand === 'Wilson' && r.v[0].series === 'Blade' && r.v[0].catalog_id === cat('Wilson', 'Blade'), r);
  r = await set(D, [{ brand: 'wilson', series: ' BLADE ' }, { series: 'head speed' }, { brand: 'Diadem', series: 'Elevate' }]);
  T('A4 自由文字自动归类：品牌 + 系列不分大小写 / 只写一整串 / 匹配不上的保持原样', r.ok && JSON.stringify(r.v.map(x => [x.brand, x.series, !!x.catalog_id])) === JSON.stringify([['Wilson', 'Blade', true], ['Head', 'Speed', true], ['Diadem', 'Elevate', false]]), r);
  await q(`update racket_catalog set aliases = '{ps97}' where id = $1`, [cat('Wilson', 'Pro Staff')]);
  r = await set(D, [{ series: 'PS97' }]); T('A4 别名也能归类', r.ok && r.v[0].catalog_id === cat('Wilson', 'Pro Staff') && r.v[0].series === 'Pro Staff', r);
  r = await set(D, [{ catalog_id: cat('Head', 'Speed') }, { brand: 'HEAD', series: 'speed' }]); T('A4 产品库的和自由文字写的是同一把 → duplicate', bad(r, 'duplicate'), r);
  r = await set(D, [{ catalog_id: 'not-a-uuid' }]); T('A4 catalog_id 格式不对 → invalid / catalog_id', bad(r, 'catalog_id'), r);
  r = await set(D, [{ catalog_id: '00000000-0000-4000-8000-000000000000' }]); T('A4 catalog_id 不存在 → invalid / catalog_id', bad(r, 'catalog_id'), r);
  await set(D, [{ catalog_id: cat('Wilson', 'Burn') }]); await q(`update racket_catalog set status = 'hidden' where id = $1`, [cat('Wilson', 'Burn')]);
  r = await set(D, [{ catalog_id: cat('Wilson', 'Burn') }, { catalog_id: cat('Head', 'Boom') }]); T('A4 隐藏的：本来就有的人能留着', r.ok && r.v.length === 2, r);
  r = await set(A, [{ catalog_id: cat('Wilson', 'Burn') }]); T('A4 隐藏的：没有的人不能新选', bad(r, 'catalog_id'), r);
  const M = (await q(`insert into racket_catalog(brand, series, status, merged_into) values ('Wilson','ProStaff','merged',$1) returning id`, [cat('Wilson', 'Pro Staff')])).rows[0].id;
  r = await set(D, [{ catalog_id: M }]); T('A4 合并掉的条目：跟到合并后的那条', r.ok && r.v[0].catalog_id === cat('Wilson', 'Pro Staff') && r.v[0].series === 'Pro Staff', r);
  r = await as(D, `select count(*)::int v from racket_catalog`); T('A4 前台不能直接读产品库表（走接口层）', !r.ok && /permission denied/.test(r.err), r);
  r = await as(D, `select nbq_racket_match('Wilson','Blade') v`); T('A4 匹配函数前台不能直接调', !r.ok && /permission denied/.test(r.err), r);
  await q(`insert into user_rackets(user_id, slot, brand, series) values ($1, 2, 'Head', 'Gravity')`, [D]);
  e1 = null; try { await q(cat4); await q(cat4) } catch (e) { e1 = e.message } T('A4 迁移连跑两次不报错', e1 === null, e1);
  T('A4 迁移重跑：种子不重复，隐藏的不被改回', +(await q(`select count(*) from racket_catalog where status <> 'merged'`)).rows[0].count === 25 && (await q(`select status from racket_catalog where id=$1`, [cat('Wilson', 'Burn')])).rows[0].status === 'hidden');
  T('A4 迁移给已有的自由文字补上 catalog_id', (await cid(D)).find(x => x.slot === 2).catalog_id === cat('Head', 'Gravity'), await cid(D));
} catch (e) { fail++; console.log('FAIL 异常 ' + (e.stack || e)) }
finally { if (pool) await pool.end().catch(() => { }); c.stop() }
console.log(`rackets: ${pass} 通过, ${fail} 失败`); process.exit(fail ? 1 : 0);
