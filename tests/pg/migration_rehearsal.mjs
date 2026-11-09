// 迁移演练（tools/migration_rehearsal.mjs，#113 A）：用临时迁移证明三步各自会拦——可重复运行 / 结构 = schema.sql / 单事务。
// 基准和目标都用本仓库真实的 schema.sql（db_parity 的指纹依赖真实表），临时迁移只加一张演练表。
import { execFileSync } from 'child_process'; import fs from 'fs'; import os from 'os'; import path from 'path'; import { fileURLToPath } from 'url';
import { startCluster, loadSchema } from './cluster.mjs';
import { rehearse, bundleOrder } from '../../tools/migration_rehearsal.mjs';
const DIR = process.env.NBQ_DIR || path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 800) : '')) };
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nbq-rehearsal-test-')), W = (n, s) => { const f = path.join(tmp, n); fs.writeFileSync(f, s); return f };
const SCHEMA = path.join(DIR, 'schema.sql'), base = fs.readFileSync(SCHEMA, 'utf8');
const ADD = 'create table if not exists zz_rehearsal (id int primary key, note text);\n';
const target = W('schema_target.sql', base + '\n' + ADD);

const c = startCluster(); let k = 0;
const run = (migs, schema = target, bundle = null) => rehearse({ c, loadSchema, baseSchema: SCHEMA, schema, migrations: migs.map(([n, s]) => W(n, s)), bundle: bundle && W('bundle.sql', bundle), tag: 'r' + (k++) });
const failed = r => r.lines.filter(l => l.startsWith('❌')).join(' / ');
try {
  let r = run([['20991231_ok.sql', ADD]], target, ADD);
  T('正常迁移：三步都过', r.bad === 0, r.lines);
  r = run([['20991231_twice.sql', 'create table zz_rehearsal (id int primary key, note text);\n']]);
  T('不可重复运行：第 2 遍报错', /第 2 遍执行 20991231_twice\.sql/.test(failed(r)) && !/第 1 遍/.test(failed(r)), r.lines);
  r = run([['20991231_drift.sql', 'create table if not exists zz_rehearsal (id int primary key);\n']]);
  T('迁移和 schema.sql 不一致：结构指纹拦下', /结构指纹/.test(failed(r)) && /zz_rehearsal\.note/.test(failed(r)), r.lines);
  r = run([['20991231_ok.sql', ADD]], target, "alter type nbq_never_exists add value 'x';\n" + ADD);
  T('单事务执行 bundle 出错：拦下', /单事务（psql -1）执行 bundle/.test(failed(r)), r.lines);
} finally { c.stop(); fs.rmSync(tmp, { recursive: true, force: true }) }

T('bundle 顺序和 migrate_bundle 一致：记录表最先、20261030 及以前不拼',
  JSON.stringify(bundleOrder(['20261101_b.sql', '20261031_schema_migrations.sql', '20261030_old.sql', '_bundle.sql', '20261102_a.sql'])) === JSON.stringify(['20261031_schema_migrations.sql', '20261101_b.sql', '20261102_a.sql']));

// 本分支真实的新增迁移（有 origin/main 才跑；改了 server/migrations/ 时 --changed 会选到本测试，等于推送前自动演练一次）
let hasBase = true; try { execFileSync('git', ['rev-parse', '-q', '--verify', 'origin/main'], { cwd: DIR, stdio: 'pipe' }) } catch (_) { hasBase = false }
if (!hasBase) console.log('（没有 origin/main，跳过本分支迁移的演练）');
else { let out = '', ok = true; try { out = execFileSync('node', [path.join(DIR, 'tools/migration_rehearsal.mjs')], { cwd: DIR, encoding: 'utf8', stdio: 'pipe' }) } catch (e) { ok = false; out = String(e.stdout) + String(e.stderr) }
  console.log(out.trim().split('\n').slice(-1)[0]); T('本分支新增迁移相对 origin/main 演练通过', ok, out.split('\n').filter(l => /❌|环境/.test(l))) }

console.log(`migration_rehearsal: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
