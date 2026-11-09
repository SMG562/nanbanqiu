#!/usr/bin/env node
// 迁移演练（#113 A，11-09）：正式库执行迁移之前，在本机临时 PostgreSQL 上证明三件事（只读仓库，不连任何线上库）：
//   ① 基准（默认 origin/main）的 schema.sql 建库 + 本分支新增的迁移，连跑两遍都不报错（可重复运行）
//   ② 跑完后的结构指纹（tools/db_parity.sh：表、列、约束、函数体、行级安全、策略）= 本分支 schema.sql 直接建出来的
//      （迁移里整段复制的旧函数和 schema.sql 原处不一致，这里会拦下，#113 B）
//   ③ 单事务（psql -1，等同 Supabase SQL 编辑器整段一个事务）执行「所有者会粘贴的 bundle」不报错（新枚举值同一事务里不能用之类）
// 用法：node tools/migration_rehearsal.mjs [--base=origin/main]   退出码：0 通过 · 1 有问题 · 2 环境不满足
// 改了 server/migrations/ 的 PR：推送前跑一次；pg/migration_rehearsal 用临时迁移验证这三步本身会拦。
import { execSync } from 'child_process'; import fs from 'fs'; import os from 'os'; import path from 'path'; import { fileURLToPath } from 'url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), MIG = path.join(ROOT, 'server/migrations');

// 和 tools/migrate_bundle.mjs 同样的选取与顺序（20261030 之后，记录表迁移最先），只是写到临时文件，不动仓库里的 _bundle.sql
export function bundleOrder(names) {
  return names.filter(f => /^2\d+_.*\.sql$/.test(f) && f > '20261030_zzz').sort((a, b) => (a.includes('schema_migrations') ? -1 : 0) - (b.includes('schema_migrations') ? -1 : 0) || a.localeCompare(b));
}

// baseSchema / schema：.sql 路径；migrations：本分支新增迁移的路径（按执行顺序）；bundle：单事务演练用的 .sql 路径（null = 跳过 ③）
// c：tests/pg/cluster.mjs 的 startCluster() 结果（调用方负责 stop）。返回 { bad, lines }
export function rehearse({ c, loadSchema, baseSchema, schema, migrations, bundle, tag = 'r' }) {
  const lines = []; let bad = 0; const say = (ok, msg) => { if (!ok) bad++; lines.push((ok ? '✅ ' : '❌ ') + msg) };
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nbq-rehearsal-')), [A, B, T] = ['a', 'b', 't'].map(x => `${tag}_${x}`);
  try {
    [A, B, T].forEach(c.createdb);
    say(!loadSchema(c, A, baseSchema).length, '基准 schema.sql 建库无错误');
    for (const i of [1, 2]) for (const f of migrations) { const e = loadSchema(c, A, f); say(!e.length, `第 ${i} 遍执行 ${path.basename(f)}` + (e.length ? '：' + e.slice(0, 2).join(' | ') : '')) }
    say(!loadSchema(c, B, schema).length, '本分支 schema.sql 建库无错误');
    const fp = d => { const out = path.join(tmp, `fp_${d}.txt`); execSync(`bash tools/db_parity.sh ${d} | grep -v '^已写 ' > "${out}"`, { cwd: ROOT, stdio: 'pipe', env: { ...process.env, NBQ_DB_URL: `postgresql://postgres@/${d}?host=${encodeURIComponent(c.host)}&port=${c.port}`, PATH: c.bin + ':' + process.env.PATH } }); return out };
    let diff = ''; try { execSync(`diff "${fp(A)}" "${fp(B)}"`, { stdio: 'pipe' }) } catch (e) { diff = String(e.stdout).split('\n').slice(0, 20).join('\n') }
    say(!diff, '迁移后的结构指纹 = 本分支 schema.sql 的' + (diff ? '，差别（前 20 行，< 迁移后 · > schema.sql）：\n' + diff : ''));
    if (bundle) {
      say(!loadSchema(c, T, baseSchema).length, '单事务演练：基准建库');
      let e = null; try { execSync(`"${c.bin}/psql" -X -q -d ${T} -1 -v ON_ERROR_STOP=1 -f "${bundle}"`, { env: c.env, stdio: 'pipe' }) } catch (x) { e = String(x.stderr || x.stdout).trim().split('\n').slice(-2).join(' ') }
      say(!e, '单事务（psql -1）执行 bundle' + (e ? '：' + e : ''));
    }
  } finally { fs.rmSync(tmp, { recursive: true, force: true }) }
  return { bad, lines };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const base = (process.argv.find(a => a.startsWith('--base=')) || '--base=origin/main').slice(7);
  const sh = cmd => execSync(cmd, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26 });
  let cluster; try { cluster = await import(path.join(ROOT, 'tests/pg/cluster.mjs')); if (!cluster.pgBin()) throw new Error('找不到 PostgreSQL') } catch (e) { console.error(`环境不满足：${e.message}（bash tools/setup_env.sh）`); process.exit(2) }
  let have; try { have = new Set(sh(`git -c core.quotepath=off ls-tree --name-only ${base} server/migrations/`).split('\n').map(f => path.basename(f))) } catch (_) { console.error(`找不到基准 ${base}（git fetch origin main）`); process.exit(2) }
  const names = fs.readdirSync(MIG), mine = names.filter(f => /^2\d+_.*\.sql$/.test(f) && !have.has(f)).sort((a, b) => a.localeCompare(b));
  if (!mine.length) { console.log(`本分支相对 ${base} 没有新增迁移，不用演练`); process.exit(0) }
  console.log(`基准 ${base}；本分支新增迁移：${mine.join('、')}`);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nbq-rehearsal-cli-')), baseSchema = path.join(tmp, 'schema_base.sql'), bundle = path.join(tmp, 'bundle.sql');
  fs.writeFileSync(baseSchema, sh(`git show ${base}:schema.sql`));
  fs.writeFileSync(bundle, bundleOrder(names).map(f => `-- ===== ${f} =====\n${fs.readFileSync(path.join(MIG, f), 'utf8')}`).join('\n'));
  const c = cluster.startCluster(); let r;
  try { r = rehearse({ c, loadSchema: cluster.loadSchema, baseSchema, schema: path.join(ROOT, 'schema.sql'), migrations: mine.map(f => path.join(MIG, f)), bundle }) }
  finally { c.stop(); fs.rmSync(tmp, { recursive: true, force: true }) }
  r.lines.forEach(l => console.log(l));
  console.log(r.bad ? `migration_rehearsal: ${r.bad} 项有问题` : 'migration_rehearsal: 全部通过'); process.exit(r.bad ? 1 : 0);
}
