// 5g-3 前台接入第 1 项：球场 + 区导入（server/seed/venues_seed.sql，tools/venues_seed.mjs 生成）
//   在真实 schema 上执行：数量、区外键、坐标范围、可重复执行不重复、核对过的坐标标记、/api/venues 只给 active
import fs from 'fs'; import { createRequire } from 'module'; import path from 'path'; import { fileURLToPath } from 'url';
import { startCluster, loadSchema } from './cluster.mjs';
const require = createRequire(import.meta.url); const pg = require('pg');
const HERE = path.dirname(fileURLToPath(import.meta.url)), DIR = process.env.NBQ_DIR || path.join(HERE, '..', '..');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 500) : '')) };
const SEED = path.join(DIR, 'server/seed/venues_seed.sql');
const c = startCluster(); let admin;
try {
  const dataSrc = fs.readFileSync(path.join(DIR, 'src/shared/script/0080-数据.js'), 'utf8');
  const total = (dataSrc.match(/^ ?\[+"v\d+", /gm) || []).length;
  c.createdb('nbq');
  const errs = loadSchema(c, 'nbq', path.join(DIR, 'schema.sql')); T('schema 执行无错误', !errs.length, errs.slice(0, 3));
  admin = new pg.Pool({ host: c.host, port: c.port, user: 'postgres', database: 'nbq', max: 2 });
  const n = async sql => +(await admin.query(sql)).rows[0].n;
  const e1 = loadSchema(c, 'nbq', SEED); T('导入脚本执行无错误', !e1.length, e1.slice(0, 3));
  const nv = await n('select count(*) n from venues'), ns = await n('select count(*) n from suburbs');
  T(`球场数 = 前台名录（${total}）`, total > 250 && nv === total, [nv, total]);
  T('区数 > 100，且都在墨尔本 / VIC', ns > 100 && await n(`select count(*) n from suburbs where city <> 'melb' or state <> 'VIC'`) === 0, ns);
  T('每个球场都属于一个已有的区（外键）或标记 nosub', await n(`select count(*) n from venues v where status = 'active' and not exists (select 1 from suburbs s where s.name = v.suburb and s.postcode = v.postcode)`) === 0);
  T('没对上区的球场一律 nosub，不会 active', await n(`select count(*) n from venues where postcode is null and status = 'active'`) === 0);
  T('坐标都在墨尔本周边（纬度 -38.6…-37.2，经度 144.2…145.8）', await n(`select count(*) n from venues where st_y(location::geometry) not between -38.6 and -37.2 or st_x(location::geometry) not between 144.2 and 145.8`) === 0);
  T('球场类型 / 场地类型合法，surfaces 非空', await n(`select count(*) n from venues where venue_type is null or cardinality(surfaces) = 0 or surface is null`) === 0);
  const adm = await n(`select count(*) n from venues where geo_source = 'admin'`), cen = await n(`select count(*) n from venues where geo_source = 'suburb_centroid'`);
  T('核对过的坐标标 admin，其余标 suburb_centroid（待核实）', adm > 200 && adm + cen === nv, [adm, cen]);
  T('核对过的坐标与前台 GEO_OK 数量一致', adm === (dataSrc.match(/const GEO_OK=new Set\(\[([^\]]*)\]/)[1].match(/"v\d+"/g) || []).length, adm);
  // 可重复执行
  const e2 = loadSchema(c, 'nbq', SEED); T('再执行一次无错误', !e2.length, e2.slice(0, 3));
  T('再执行一次数量不变（不重复）', await n('select count(*) n from venues') === nv && await n('select count(*) n from suburbs') === ns);
  // 经典球场抽查：名字、区、距离
  const r = (await admin.query(`select suburb, postcode from venues where name = 'South Camberwell Tennis Club'`)).rows[0];
  T('抽查：South Camberwell Tennis Club 在 Glen Iris 3146 一带', r && r.suburb === 'Glen Iris' && /^31\d\d$/.test(r.postcode), r);
  // 接口：/api/venues 只给 active
  await admin.query(`update venues set status = 'nosub' where id = (select id from venues order by name limit 1)`);
  const { handleApi } = await import(path.join(DIR, 'server/api/handler.mjs'));
  const db = { asService: async fn => fn(q => admin.query(q)) };
  const res = await handleApi(new Request('https://x.test/api/venues'), { verify: async () => ({ ok: false }), db }), j = await res.json();
  T('/api/venues 不给 nosub 的球场', res.status === 200 && j.venues.length === nv - 1 && j.venues.every(v => v.id && v.name && typeof v.lat === 'number' && typeof v.lng === 'number'), [res.status, j.venues?.length]);
} catch (e) { fail++; console.log('FAIL 异常', e.stack || e.message) }
finally { try { await admin?.end() } catch (_) { } c.stop() }
console.log(`venues_seed: ${pass} 通过, ${fail} 失败`); process.exit(fail ? 1 : 0);
