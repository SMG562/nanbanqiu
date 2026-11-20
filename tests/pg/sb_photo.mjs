// 场边照片上传的库部分（#393 P1，迁移 20261124_sb_photo_upload）：api_sb_photo_gate（账号状态 + 频率）、两条频率规则、photos_paused 开关、迁移可重复执行。
//   接口层（路径 / 校验 / 不覆盖 / 假 R2）在 tests/unit/sb_photo_put.mjs；这里在真实 PostgreSQL 上以前台身份调用。
import fs from 'fs'; import { createRequire } from 'module'; import path from 'path'; import { fileURLToPath } from 'url';
import { startCluster, loadSchema } from './cluster.mjs';
const require = createRequire(import.meta.url); const pg = require('pg');
const HERE = path.dirname(fileURLToPath(import.meta.url)), DIR = process.env.NBQ_DIR || path.join(HERE, '..', '..');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 400) : '')) };
const c = startCluster(); let pool;
try {
  c.createdb('nbq');
  const errs = loadSchema(c, 'nbq', path.join(DIR, 'schema.sql')); T('schema 执行无错误', !errs.length, errs.slice(0, 3));
  pool = new pg.Pool({ host: c.host, port: c.port, user: 'postgres', database: 'nbq', max: 4 });
  const q = (s, p) => pool.query(s, p), one = async (s, p) => (await q(s, p)).rows[0];
  const as = async (role, uid, sql, params) => { const cl = await pool.connect();
    try { await cl.query('begin'); await cl.query(`set local role ${role}`); if (uid) await cl.query(`select set_config('nbq.uid', $1, true)`, [uid]);
      const r = await cl.query(sql, params); await cl.query('commit'); return { ok: true, v: r.rows[0] && Object.values(r.rows[0])[0] } }
    catch (e) { await cl.query('rollback').catch(() => { }); return { ok: false, code: e.message, detail: e.detail } } finally { cl.release() } };
  const gate = (uid, count = true) => as('nbq_user', uid, 'select api_sb_photo_gate($1)', [count]);
  const id = k => '00000000-0000-0000-0000-0000000000' + String(k).padStart(2, '0');
  for (let i = 1; i <= 6; i++) await q(`insert into users(id,phone_e164,nickname,utr,gender) values ($1,$2,$3,5,'f')`, [id(i), '+6140000000' + String(i).padStart(2, '0'), 'P' + i]);
  await q(`update users set status='suspended', status_since=now(), status_until=now()+interval '7 days', status_reason='no_show' where id=$1`, [id(2)]);
  await q(`update users set status='banned' where id=$1`, [id(3)]);
  await q(`update users set status='deleted' where id=$1`, [id(4)]);
  await q(`update users set status='review' where id=$1`, [id(5)]);

  // ---------- 规则与开关 ----------
  const rules = (await q(`select rule, grp, win::text, max_hits, per_key, code, enabled from rate_rules where grp = 'sb_photo' order by rule`)).rows;
  T('两条频率规则：每小时 30 张 / 每天 100 张，按人计，默认启用', JSON.stringify(rules.map(r => [r.rule, r.win, r.max_hits, r.code, r.per_key, r.enabled])) === JSON.stringify([['sb_photo_day', '24:00:00', 100, 'photo_daily_limit', false, true], ['sb_photo_hour', '01:00:00', 30, 'photo_hourly_limit', false, true]]), rules);
  T('app_switches 第四行 photos_paused，默认关', (await one(`select is_on from app_switches where key = 'photos_paused'`))?.is_on === false && +(await one('select count(*) from app_switches')).count === 4);
  T('app_switches_get 公开读含 photos_paused: false', (await one('select app_switches_get() j')).j.photos_paused === false);

  // ---------- 账号状态：同 nbq_sb_gate（停用 / 封禁 / 注销不能传，待核实 / 受限可以） ----------
  let r = await gate(id(1)); T('正常账号：返回自己的 id', r.ok && r.v === id(1), r);
  r = await gate(null); T('没登录：login_required（不是别的错）', !r.ok && /login_required|unauthor/i.test(r.code), r);
  for (const [k, want] of [[2, 'account_suspended'], [3, 'account_banned'], [4, 'account_deleted']]) { r = await gate(id(k)); T(`账号状态 → ${want}`, !r.ok && r.code === want, r) }
  r = await gate(id(5)); T('待核实（review）可以传，和发文字一致', r.ok, r);
  T('被拒的账号没有留下频率记录', +(await one(`select count(*) from rate_hits where grp = 'sb_photo' and subject = any($1)`, [[id(2), id(3), id(4)]])).count === 0);

  // ---------- 频率：只数原图 ----------
  const U = id(6);
  for (let i = 0; i < 100; i++) await gate(U, false);
  T('缩略图 / 极小图（count=false）传多少次都不占次数', +(await one(`select count(*) from rate_hits where grp = 'sb_photo' and subject = $1`, [U])).count === 0);
  for (let i = 1; i <= 30; i++) { r = await gate(U); if (!r.ok) break }
  T('原图：前 30 张都过', +(await one(`select count(*) from rate_hits where grp = 'sb_photo' and subject = $1`, [U])).count === 30 && r.ok, r);
  r = await gate(U); T('第 31 张：429 类错误码 photo_hourly_limit，detail = 还要等几秒', !r.ok && r.code === 'photo_hourly_limit' && /^\d+$/.test(r.detail || '') && +r.detail > 0 && +r.detail <= 3600, r);
  T('超限的这一次没有记进次数', +(await one(`select count(*) from rate_hits where grp = 'sb_photo' and subject = $1`, [U])).count === 30);
  await q(`update rate_hits set at = now() - interval '2 hours' where grp = 'sb_photo' and subject = $1`, [U]);   // 过了一小时窗：每小时规则放行，每天规则（30 条）仍在
  r = await gate(U); T('过了一小时：又能传（每天规则还没到 100）', r.ok, r);
  await q(`insert into rate_hits(subject, grp, at) select $1, 'sb_photo', now() - interval '3 hours' from generate_series(1, 70)`, [U]);
  r = await gate(U); T('当天累计到 100 张：photo_daily_limit，detail = 到墨尔本次日 0 点还有几秒或滚动窗', !r.ok && r.code === 'photo_daily_limit' && /^\d+$/.test(r.detail || ''), r);
  T('别人不受影响（频率按人）', (await gate(id(1))).ok);

  // ---------- 权限：前台身份只能调这个函数，不能碰频率表 ----------
  r = await as('nbq_user', id(1), `select count(*) from rate_hits`); T('前台身份读不了 rate_hits', !r.ok, r);
  r = await as('nbq_viewer', null, `select api_sb_photo_gate(true)`); T('只读身份不能调 api_sb_photo_gate', !r.ok, r);

  // ---------- 后台切换 photos_paused：在 pg/admin_switches 里测（有管理员账号和留痕）；这里只确认 admin_set_switch 仍拒绝乱写的开关名 ----------
  r = await as('nbq_admin', null, `select admin_set_switch('bogus', true, '测试')`, []); T('不认识的开关名仍被拒', !r.ok, r);

  // ---------- 迁移文件：可重复执行，且和 schema.sql 里的段落一致 ----------
  const mig = fs.readFileSync(path.join(DIR, 'server/migrations/20261124_sb_photo_upload.sql'), 'utf8');
  const cl = await pool.connect(); let again = null; try { await cl.query(mig); await cl.query(mig) } catch (e) { again = e.message } finally { cl.release() }
  T('迁移再执行两遍：没有报错', again === null, again);
  T('再执行后规则仍是 2 条、开关仍是 4 行', +(await one(`select count(*) from rate_rules where grp = 'sb_photo'`)).count === 2 && +(await one('select count(*) from app_switches')).count === 4);
  T('schema.sql 里含这个迁移的完整内容（db-parity 用）', fs.readFileSync(path.join(DIR, 'schema.sql'), 'utf8').includes(mig.trim()));
} catch (e) { fail++; console.log('FAIL 未捕获的错误', e && e.stack || e) } finally { if (pool) await pool.end().catch(() => { }); c.stop && c.stop() }
console.log(`sb_photo: ${pass} 通过, ${fail} 失败`); process.exit(fail ? 1 : 0);
