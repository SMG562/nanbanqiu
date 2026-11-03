#!/usr/bin/env node
/**
 * 把「还没确认执行过」的迁移拼成一个 SQL，一次粘贴到 Supabase SQL Editor 运行（11-03）。
 *   node tools/migrate_bundle.mjs            → 写 server/migrations/_bundle.sql（并打印路径）
 * 每个迁移都可重复运行、结尾会在 schema_migrations 记一行自己；跑完后冒烟测试（或 /api/version）会显示库里已执行的版本。
 * 默认拼 20261030 之后的所有迁移（20261030 已确认跑过）；--all 拼全部。
 */
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), D = path.join(ROOT, 'server', 'migrations');
const all = process.argv.includes('--all');
const files = fs.readdirSync(D).filter(f => f.endsWith('.sql') && !f.startsWith('_')).sort().filter(f => all || f > '20261030_zzz');
// 记录表迁移必须最先（别的迁移结尾会引用它；它自己也可重复运行）
files.sort((a, b) => (a.includes('schema_migrations') ? -1 : 0) - (b.includes('schema_migrations') ? -1 : 0) || a.localeCompare(b));
const out = files.map(f => `-- ===== ${f} =====\n${fs.readFileSync(path.join(D, f), 'utf8')}`).join('\n');
fs.writeFileSync(path.join(D, '_bundle.sql'), `-- 自动拼接，别手改：node tools/migrate_bundle.mjs\n${out}`);
console.log(`已写 server/migrations/_bundle.sql（${files.length} 个迁移：${files.join('、')}）`);
