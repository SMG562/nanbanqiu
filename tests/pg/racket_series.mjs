// 球拍一期 PR1 数据层（#377，#60 11-18 第 2 条）：品牌 → 系列两级库。先写红，迁移 20261121_racket_series.sql 落地后转绿。
//   所有者 3 问（隐私字段 / slot 还是 sort / 正式库清空）答复前不写迁移；这里的假设：沿用 slot（1=主力）、新列都可空。
import { createRequire } from 'module'; import path from 'path'; import fs from 'fs'; import { fileURLToPath } from 'url';
import { startCluster, loadSchema } from './cluster.mjs';
const require = createRequire(import.meta.url); const pg = require('pg');
const HERE = path.dirname(fileURLToPath(import.meta.url)), DIR = process.env.NBQ_DIR || path.join(HERE, '..', '..');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 400) : '')) };
const MIG = path.join(DIR, 'server/migrations/20261121_racket_series.sql');
const c = startCluster(); let pool;
try {
  c.createdb('nbq'); const errs = loadSchema(c, 'nbq', path.join(DIR, 'schema.sql')); T('schema 执行无错误', !errs.length, errs.slice(0, 3));
  pool = new pg.Pool({ host: c.host, port: c.port, user: 'postgres', database: 'nbq', max: 4 });
  const q = (s, p) => pool.query(s, p).then(r => r, e => ({ rows: [], err: e.message }));
  const as = async (role, uid, sql, params) => { const cl = await pool.connect();
    try { await cl.query('begin'); await cl.query(`set local role ${role}`); if (uid) await cl.query(`select set_config('nbq.uid', $1, true)`, [uid]);
      const r = await cl.query(sql, params); await cl.query('commit'); return { ok: true, v: r.rows[0] && Object.values(r.rows[0])[0], rows: r.rows } }
    catch (e) { await cl.query('rollback').catch(() => { }); return { ok: false, err: e.message, detail: e.detail } } finally { cl.release() } };
  const set = (uid, list) => as('nbq_user', uid, 'select api_set_rackets($1::jsonb) v', [JSON.stringify(list)]);
  const id = n => '00000000-0000-0000-0000-0000000000' + String(n).padStart(2, '0'); const A = id(1), B = id(2), Z = id(3);
  for (const [u, nm] of [[A, 'Amy'], [B, 'Ben'], [Z, 'Zed']]) await q(`insert into users(id,phone_e164,nickname,utr) values ($1,$2,$3,5)`, [u, '+6140000' + u.slice(-4), nm]);
  // 旧库形状：先用旧 catalog 存一把，迁移后要映射到新 series_id
  const old = await set(A, [{ catalog_id: (await q(`select id from racket_catalog where brand='Head' and series='Speed'`)).rows[0]?.id }]); T('准备：旧形状 catalog_id 可存', old.ok, old);
  const hasMig = fs.existsSync(MIG); T('迁移文件 20261121_racket_series.sql 存在', hasMig);
  if (hasMig) { const sql = fs.readFileSync(MIG, 'utf8'); const e = (await q(sql)).err; T('迁移执行无错误', !e, e); const e2 = (await q(sql)).err || (await q(sql)).err; T('迁移连跑 3 次幂等', !e2, e2) }
  const n = async s => +((await q(s)).rows[0] || { n: -1 }).n;

  // —— 种子
  T('种子：7 个品牌', await n(`select count(*) n from brands`) === 7);
  T('种子：每个品牌都有「其他系列」', await n(`select count(*) n from brands b where exists (select 1 from racket_series s where s.brand_id=b.id and s.is_other)`) === 7);
  T('种子：每个品牌只有一个「其他系列」', await n(`select count(*) n from (select brand_id from racket_series where is_other group by 1 having count(*)>1) x`) === 0);
  T('迁移前的老数据映射：Head Speed → 新 series_id（旧列保留）', await n(`select count(*) n from user_rackets r join racket_series s on s.id=r.series_id where r.user_id='${A}' and r.catalog_id is not null`) === 1);
  T('拼写不同的旧品牌映射（HEAD/Head、TFight/T-Fight）', await n(`select count(*) n from racket_catalog c where c.status='active' and not exists (select 1 from racket_series s join brands b on b.id=s.brand_id where lower(replace(b.name,'-',''))=lower(replace(c.brand,'-','')))`) === 0);

  // —— 表约束（绕过函数直接写）
  const br = (await q(`select id from brands order by id limit 1`)).rows[0]?.id, se = (await q(`select id from racket_series where brand_id=$1 and not is_other limit 1`, [br])).rows[0]?.id;
  const cons = async (name, cols, v, ok) => { await q(`delete from user_rackets where user_id=$1`, [Z]); const r = await q(`insert into user_rackets(user_id,slot,series,${cols}) values ($1,1,'x',${v})`, [Z]); T('约束：' + name, ok ? !r.err : !!r.err, r.err) };
  await cons('series_id 与 other_text 都有 → 拒', 'brand_id,series_id,other_text', `'${br}','${se}','老拍'`, false);
  await cons('series_id 与 other_text 都没有 → 拒', 'brand_id', `'${br}'`, false);
  await cons('只有 series_id → 过', 'brand_id,series_id', `'${br}','${se}'`, true);
  await cons('只有 other_text → 过', 'brand_id,other_text', `'${br}','老拍'`, true);
  await cons('昵称 12 个中文 → 过', 'brand_id,series_id,nickname', `'${br}','${se}','${'拍'.repeat(12)}'`, true);
  await cons('昵称 13 个中文 → 拒', 'brand_id,series_id,nickname', `'${br}','${se}','${'拍'.repeat(13)}'`, false);
  await cons('昵称 12 个 emoji → 过（按字符数不按字节）', 'brand_id,series_id,nickname', `'${br}','${se}','${'🎾'.repeat(12)}'`, true);
  await cons('昵称 13 个 emoji → 拒', 'brand_id,series_id,nickname', `'${br}','${se}','${'🎾'.repeat(13)}'`, false);

  // —— 新旧形状都收
  const get = u => as('nbq_user', u, `select slot, series_id, other_text, brand_id, nickname from user_rackets order by slot`).then(x => ({ ...x, rows: x.rows || [] }));
  let r = await set(B, [{ brand_id: br, series_id: se, nickname: '主力' }, { brand_id: br, other_text: '老拍' }]);
  T('新形状 {brand_id,series_id,nickname}/{brand_id,other_text} 可保存', r.ok && (await get(B)).rows.length === 2, r);
  r = await set(B, [{ brand: 'Head', series: 'Speed' }]); T('旧形状 {brand,series} 仍可保存，旧字段齐全', r.ok && r.v[0].brand === 'Head' && r.v[0].series === 'Speed' && r.v[0].slot === 1 && 'catalog_id' in r.v[0], r);
  r = await set(B, [{ catalog_id: old.v?.[0]?.catalog_id }]); T('旧形状 {catalog_id} 仍可保存', r.ok && r.v[0].catalog_id === old.v?.[0]?.catalog_id, r);
  r = await set(B, [{ brand_id: br, series_id: se }, { brand_id: br, other_text: 'a' }, { brand_id: br, other_text: 'b' }, { brand_id: br, other_text: 'c' }]); T('同用户 > 3 把 → invalid', !r.ok && r.err === 'invalid', r);
  r = await set(B, [{ brand_id: br, series_id: se, other_text: 'x' }]); T('series_id 与 other_text 同时给 → invalid', !r.ok && r.err === 'invalid', r);
  r = await set(B, [{ brand_id: br, series_id: se, nickname: '拍'.repeat(13) }]); T('昵称超 12 字符 → invalid', !r.ok && r.err === 'invalid', r);
  await Promise.all([set(B, [{ brand_id: br, series_id: se }]), set(B, [{ brand_id: br, other_text: '并发' }]), set(B, [{ brand: 'Head', series: 'Speed' }])]);
  T('并发整组替换：最后只剩 1 把、无半截', (await get(B)).rows.length === 1, (await get(B)).rows);

  // —— RLS：新表对三种前台角色全拒
  for (const t of ['brands', 'racket_series', 'racket_aliases', 'catalogue_submissions']) for (const role of ['anon', 'authenticated', 'nbq_user']) {
    const x = await as(role, B, `select count(*) v from ${t}`); T(`RLS：${role} 读 ${t} 被拒`, !x.ok && /permission denied|does not exist/.test(x.err) ? !/does not exist/.test(x.err) : false, x.err) }

  // —— 读函数 / 导出 / 注销 / rollup
  await set(A, [{ brand_id: br, series_id: se }]); await q(`insert into catalogue_submissions(user_id, text) values ($1,'新系列')`, [B]);
  const pl = ids => as('nbq_user', A, `select user_id, slot, brand_id, series_id, other_text, nickname from api_player_rackets($1::uuid[])`, [ids]);
  r = await pl([B, Z]); T('api_player_rackets 返回新结构字段', r.ok && r.rows.length >= 1 && 'series_id' in r.rows[0] && 'nickname' in r.rows[0], r);
  await q(`update users set status='banned' where id=$1`, [Z]); r = await pl([Z]); T('api_player_rackets 不返回封禁', r.ok && r.rows.length === 0, r);
  const ex = await as('nbq_user', B, `select api_export_me() v`); T('导出含新字段（series_id/nickname）', ex.ok && /series_id/.test(JSON.stringify(ex.v)) && /nickname/.test(JSON.stringify(ex.v?.rackets ?? ex.v)), ex.err);
  T('导出含自己的 catalogue_submissions', ex.ok && /catalogue_submissions|新系列/.test(JSON.stringify(ex.v)));
  await q(`update users set status='deleted', deleted_at=now()-interval '40 days' where id=$1`, [B]); await as('nbq_service', null, `select job_anonymize_deleted() v`);
  T('注销后球拍和 catalogue_submissions 都清空', await n(`select count(*) n from user_rackets where user_id='${B}'`) === 0 && await n(`select count(*) n from catalogue_submissions where user_id='${B}'`) === 0);
  r = await as('nbq_service', null, `select racket_rollup(current_date - 1) v`); T('racket_rollup 在新结构下能跑', r.ok, r.err);
} catch (e) { fail++; console.log('FAIL 异常 ' + (e.stack || e)) }
finally { if (pool) await pool.end().catch(() => { }); c.stop() }
console.log(`racket_series: ${pass} 通过, ${fail} 失败`); process.exit(fail ? 1 : 0);
