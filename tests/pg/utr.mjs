// 我的 UTR（#101）：api_set_utr / api_my_utr 的校验、频率、历史、隐私、注销清理、迁移可重复。
//   调用方式和 pg/rackets 一样：begin; set local role nbq_user; set_config('nbq.uid', …); select …; commit
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
  const set = (uid, p) => as(uid, 'select api_set_utr($1::jsonb) v', [JSON.stringify(p)]);
  const get = async uid => (await as(uid, 'select api_my_utr() v')).v;
  const bad = (r, detail) => !r.ok && r.err === 'invalid' && r.detail === detail;
  const hist = async uid => +(await q('select count(*) from utr_changes where user_id=$1', [uid])).rows[0].count;

  const id = n => '00000000-0000-0000-0000-0000000000' + String(n).padStart(2, '0'); const A = id(1), B = id(2), C = id(3);
  for (const [u, nm] of [[A, 'Amy'], [B, 'Ben'], [C, 'Cat']]) await q(`insert into users(id,phone_e164,nickname,utr,created_at) values ($1,$2,$3,3,now() - interval '40 days')`, [u, '+6140000' + u.slice(-4), nm]);

  // —— 读：没确认过 → updated_at = 注册时间
  let g = await get(A); T('读自己的：没确认过时 updated_at = 注册时间，没有主页', Number(g.utr) === 3 && g.estimated === false && g.profile === null && Date.now() - Date.parse(g.updated_at) > 39 * 864e5, g);

  // —— 正式 + 链接
  let r = await set(A, { utr: 4.62, estimated: false, profile: 'https://app.utrsports.net/profiles/1234567' });
  T('正式 4.62 + 主页链接 → 只存编号', r.ok && Number(r.v.utr) === 4.62 && r.v.estimated === false && r.v.profile === '1234567', r);
  g = await get(A); T('清空内存 → 重读 → 还在，updated_at 刷新', Number(g.utr) === 4.62 && g.profile === '1234567' && Date.now() - Date.parse(g.updated_at) < 60e3, g);
  T('改了数值 → 记一行历史（旧 3 → 新 4.62）', (await q('select old_utr, new_utr, old_est, new_est from utr_changes where user_id=$1', [A])).rows.map(x => `${+x.old_utr}>${+x.new_utr}:${x.old_est}>${x.new_est}`).join() === '3>4.62:false>false');
  r = await set(A, { utr: 4.62, estimated: false }); T('profile 不传 = 不动', r.ok && r.v.profile === '1234567', r);
  r = await set(A, { utr: 4.62, estimated: false, profile: 'universaltennis.com/profiles/7654321?tab=results' }); T('旧域名、不带 https、带参数的链接也认', r.ok && r.v.profile === '7654321', r);
  r = await set(A, { utr: 4.62, estimated: false, profile: ' 2468024 ' }); T('纯数字编号也认（去首尾空白）', r.ok && r.v.profile === '2468024', r);
  r = await set(A, { utr: 4.62, estimated: false, profile: '' }); T('空串 = 清掉主页', r.ok && r.v.profile === null, r);
  T('只改链接、原样再确认不记历史', await hist(A) === 1);
  // —— 自评
  r = await set(A, { utr: 1.5, estimated: true }); T('切到自评 ≈1.5', r.ok && Number(r.v.utr) === 1.5 && r.v.estimated === true, r);
  T('类型变了记历史', await hist(A) === 2);
  T('整数也能存（免费账号只看得到整数）', (await set(A, { utr: 5, estimated: false })).ok);

  // —— 校验不过 → invalid，原来的不丢
  const keep = JSON.stringify(await get(A));
  for (const [n, p, d] of [
    ['超过 16.5', { utr: 16.51, estimated: false }, 'utr'], ['小于 1', { utr: 0.99, estimated: false }, 'utr'],
    ['三位小数', { utr: 4.625, estimated: false }, 'utr'], ['数值是文字', { utr: '4.6', estimated: false }, 'utr'],
    ['没有数值', { estimated: false }, 'utr'], ['estimated 不是布尔', { utr: 4, estimated: 'no' }, 'estimated'],
    ['链接不是 UTR 主页', { utr: 4, estimated: false, profile: 'https://evil.com/profiles/1234567' }, 'profile'],
    ['名字不认', { utr: 4, estimated: false, profile: '张三' }, 'profile'], ['编号太短', { utr: 4, estimated: false, profile: '123' }, 'profile'],
    ['profile 不是文字', { utr: 4, estimated: false, profile: 1234567 }, 'profile']]) {
    r = await set(A, p); T('拒绝：' + n, bad(r, d), r) }
  r = await as(A, `select api_set_utr('[]'::jsonb) v`); T('拒绝：不是对象', bad(r, 'utr'), r);
  T('校验失败原来的不丢', JSON.stringify(await get(A)) === keep);

  // —— 频率：24 小时 5 次（数值 / 类型变了才计）
  for (const v of [5.1, 5.2, 5.3, 5.4, 5.5]) await set(B, { utr: v, estimated: false });
  r = await set(B, { utr: 5.6, estimated: false }); T('24 小时内第 6 次改数值 → rate_limited', !r.ok && r.err === 'rate_limited', r);
  T('被拦时没写进去', Number((await get(B)).utr) === 5.5);
  r = await set(B, { utr: 5.5, estimated: false, profile: '1234567' }); T('被拦后只改链接 / 原样确认仍可以', r.ok && r.v.profile === '1234567', r);

  // —— 权限与隐私
  r = await as(A, `update users set utr = 9 where id = $1`, [A]); T('前台不能直接改 users.utr', !r.ok && /permission denied/.test(r.err), r);
  r = await as(A, `update users set utr_estimated = true where id = $1`, [A]); T('前台不能直接改 users.utr_estimated', !r.ok && /permission denied/.test(r.err), r);
  r = await as(A, `update users set utr_profile = '9999999' where id = $1`, [A]); T('前台不能直接改 users.utr_profile', !r.ok && /permission denied/.test(r.err), r);
  r = await as(A, `insert into utr_changes(user_id, new_utr, new_est) values ($1, 9, false)`, [A]); T('前台不能写历史', !r.ok && /permission denied/.test(r.err), r);
  r = await as(B, `select count(*)::int v from utr_changes where user_id = $1`, [A]); T('看不到别人的历史', r.ok && r.v === 0, r);
  r = await as(B, `select utr_profile v from users where id = $1`, [A]); T('看不到别人的主页编号（users 只许本人读）', r.ok && r.rows.length === 0, r);
  const pp = (await q(`select column_name from information_schema.columns where table_name='public_profiles'`)).rows.map(x => x.column_name);
  T('public_profiles 不含主页编号和更新时间', pp.length > 0 && !pp.includes('utr_profile') && !pp.includes('utr_at'), pp);
  r = await as(null, `select api_set_utr('{"utr":4,"estimated":false}'::jsonb) v`); T('没登录不能调', !r.ok, r);

  // —— 注销匿名化：清主页编号和历史
  await set(C, { utr: 6, estimated: false, profile: '1357913' });
  await q(`update users set status='deleted', status_since=now() - interval '31 days' where id=$1`, [C]);
  await q(`select job_anonymize_deleted()`);
  const cc = (await q('select utr_profile, anonymized_at from users where id=$1', [C])).rows[0];
  T('注销满 30 天匿名化：主页编号清空、历史删掉', cc.anonymized_at && cc.utr_profile === null && await hist(C) === 0, cc);
  T('没注销的人不受影响', (await get(A)).utr != null && await hist(A) === 3);

  // —— 迁移可重复（schema 已含本迁移，再跑两次）
  const mig = fs.readFileSync(path.join(DIR, 'server/migrations/20261110_my_utr.sql'), 'utf8');
  let e1 = null; try { await q(mig); await q(mig) } catch (e) { e1 = e.message } T('迁移连跑两次不报错', e1 === null, e1);
  T('迁移重跑后数据还在', Number((await get(A)).utr) === 5 && await hist(A) === 3);
  T('schema_migrations 记了本迁移', +(await q(`select count(*) from schema_migrations where version='20261110_my_utr'`)).rows[0].count === 1);
  T('频率规则只有一条', +(await q(`select count(*) from rate_rules where rule='utr_day'`)).rows[0].count === 1);
} catch (e) { fail++; console.log('FAIL 异常 ' + (e.stack || e)) }
finally { if (pool) await pool.end().catch(() => { }); c.stop() }
console.log(`utr: ${pass} 通过, ${fail} 失败`); process.exit(fail ? 1 : 0);
