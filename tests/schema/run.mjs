// 南伴球 · 数据库测试：在 PGlite（WASM 版 PostgreSQL）里把 schema.sql 从头到尾真实执行一遍，再跑样例数据测试和事件字典核对。
// 用法：node run.mjs <statements.json> <tests.sql> <events_spec.md>
// 退出码：0 = 全部通过；1 = 有失败（会逐条打印 FAIL / ERR）
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';
import { btree_gist } from '@electric-sql/pglite/contrib/btree_gist';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
const [, , stmtsFile, testsFile, specFile] = process.argv;
let bad = 0;
const db = new PGlite({ extensions: { pgcrypto, pg_trgm, btree_gist } });
await db.exec(fs.readFileSync(path.join(here, 'preamble.sql'), 'utf8'));
console.log((await db.query('select version()')).rows[0].version.split(',')[0]);

// 1. schema 全量执行
const stmts = JSON.parse(fs.readFileSync(stmtsFile, 'utf8'));
let errs = 0;
for (let i = 0; i < stmts.length; i++) {
  try { await db.exec(stmts[i]); }
  catch (e) { errs++; console.log(`ERR #${i}: ${e.message}\n   ${stmts[i].slice(0, 200).replace(/\n/g, ' ')}`); }
}
console.log(`schema: ${stmts.length} statements, ${errs} errors`);
bad += errs;

// 2. 样例数据测试（每块以 "-- ## 名称" 开头；名称以 ! 开头表示「应当被拒绝」）
if (testsFile) {
  const blocks = fs.readFileSync(testsFile, 'utf8').split(/^-- ##\s*/m).filter(s => s.trim());
  let terr = 0;
  for (const blk of blocks) {
    const name = blk.split('\n')[0].trim(), body = blk.slice(blk.indexOf('\n') + 1);
    try {
      const res = await db.exec(body), last = res[res.length - 1];
      if (name.startsWith('!')) { terr++; console.log(`FAIL ${name}: 应当被拒绝，却执行成功`); }
      else console.log(`OK   ${name} -> ${JSON.stringify(last.rows).slice(0, 300)}`);
    } catch (e) {
      if (name.startsWith('!')) console.log(`OK   ${name} -> 按预期被拒绝：${e.message}`);
      else { terr++; console.log(`FAIL ${name}: ${e.message}`); }
    }
  }
  console.log(`tests: ${blocks.length} blocks, ${terr} failed`);
  bad += terr;
}

// 3. 事件字典：event_definitions 里 active 的事件 = events_spec.md（名称、分类、说明、props、来源逐字段一致）
if (specFile) {
  const spec = new Map();
  for (const l of fs.readFileSync(specFile, 'utf8').split('\n')) {
    if (!/^\| [a-z0-9_]+ \|/.test(l)) continue;
    const c = l.split('|').slice(1, -1).map(x => x.trim());
    spec.set(c[0], { category: c[1], source: c[2] === 'S' ? 'server' : 'client', description: c[3], props: c[4] === '—' ? '' : c[4] });
  }
  const rows = (await db.query("select event, category, description, props, source, status from event_definitions")).rows;
  const act = new Map(rows.filter(r => r.status === 'active').map(r => [r.event, r]));
  const diff = [];
  for (const [k, v] of spec) {
    const r = act.get(k);
    if (!r) { diff.push(`缺少 ${k}`); continue; }
    for (const f of ['category', 'source', 'description', 'props']) if ((r[f] || '').replace(/^—$/, '') !== v[f]) diff.push(`${k}.${f}: 库="${r[f]}" spec="${v[f]}"`);
  }
  for (const k of act.keys()) if (!spec.has(k)) diff.push(`多出 ${k}`);
  console.log(`dictionary: spec ${spec.size} · active ${act.size} · ${diff.length} differences`);
  diff.slice(0, 30).forEach(d => console.log('FAIL dict ' + d));
  bad += diff.length;
}
console.log(bad ? `RESULT FAIL (${bad})` : 'RESULT PASS');
process.exit(bad ? 1 : 0);
