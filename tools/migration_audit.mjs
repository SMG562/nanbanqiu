// 迁移向后兼容检查（11-06 协作机制）：把「expand → migrate → contract 分在不同发布」做成机器检查。
// 为什么：前端随时可能退回上一版，旧代码必须能在新库结构上继续跑；破坏性迁移一步做完，回退前端就会连带坏掉。
//   规矩来源：CLAUDE.md「迁移只往前、向后兼容（先加后删）」· 出事处理手册.md §6 · 协作实践.md §4。
// 检查对象：server/migrations/ 下除 tests/spec/migration_baseline.json 里列的「旧迁移」以外的所有 .sql（_bundle.sql 除外）。
//   旧迁移（本检查建立前已合并、已在库里执行过）不查内容，只用「已合并的迁移不许改」保护。
// 规则（ERR 拦下 / WARN 提醒）：
//   ERR  drop table / drop column / rename / 改列类型 / set not null / add column not null 且无 default
//        / drop function / drop type / truncate / delete 不带 where  → 这些属于「收缩」或破坏性操作：
//        要么拆到下一个发布，要么在语句前一行（或同一行）写  -- audit-allow: <原因>  人工放行（原因必填，所有者审）
//   ERR  不能重复执行：create table / add column / create index / create type / create extension 没有 if not exists
//        （create type 在 do $$ 块里判断过则不算）
//   ERR  文件名不是 YYYYMMDD_小写英文数字下划线.sql；文件里没有登记自己到 schema_migrations
//   ERR  已经在 origin/main 上的迁移被改了（内容不同）→ 迁移合并后不可变，要改就新开一个迁移
//   WARN update 不带 where（全表回填：大表要分批）
// 用法：node tools/migration_audit.mjs            检查全部
//       node tools/migration_audit.mjs --list      列出基线与被检查的文件
// 说明：函数体、字符串里的文字不算（先剥掉再查），所以函数里的 delete / drop 不会误报。
import fs from 'fs'; import path from 'path'; import { execFileSync } from 'child_process'; import { fileURLToPath } from 'url';
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'server/migrations');

// 把注释、字符串、$$ 函数体 抹成空格（保留换行，行号不变）；同时收集 audit-allow 标记所在行
export function strip(sql) {
  let out = '', i = 0; const n = sql.length, allow = new Map();   // 行号 → 原因
  let line = 1;
  const blank = s => s.replace(/[^\n]/g, ' ');
  while (i < n) {
    const c = sql[i], c2 = sql.slice(i, i + 2);
    if (c2 === '--') { let j = sql.indexOf('\n', i); if (j < 0) j = n; const txt = sql.slice(i + 2, j); const m = /^\s*audit-allow:\s*(\S.*)$/.exec(txt); if (m) allow.set(line, m[1].trim()); out += blank(sql.slice(i, j)); i = j; continue }
    if (c2 === '/*') { let j = sql.indexOf('*/', i + 2); j = j < 0 ? n : j + 2; const seg = sql.slice(i, j); out += blank(seg); line += (seg.match(/\n/g) || []).length; i = j; continue }
    if (c === "'") { let j = i + 1; while (j < n) { if (sql[j] === "'" && sql[j + 1] === "'") { j += 2; continue } if (sql[j] === "'") break; j++ } j = Math.min(n, j + 1); const seg = sql.slice(i, j); out += "'" + blank(seg.slice(1, -1)) + "'"; line += (seg.match(/\n/g) || []).length; i = j; continue }
    const d = /^\$([A-Za-z_]*)\$/.exec(sql.slice(i, i + 40));
    if (d) { const tag = d[0]; let j = sql.indexOf(tag, i + tag.length); j = j < 0 ? n : j + tag.length; const seg = sql.slice(i, j); out += tag.length ? '$$' + blank(seg.slice(2)) : blank(seg); line += (seg.match(/\n/g) || []).length; i = j; continue }
    out += c; if (c === '\n') line++; i++;
  }
  return { text: out, allow };
}

// 切成语句：返回 [{ sql(小写、压缩空白), start, end, raw }]（行号从 1 起）；$$ 体已被抹掉，所以分号只会出现在语句末尾
export function statements(text) {
  const res = []; let start = 0, line = 1, sline = 1, started = false;
  for (let i = 0; i <= text.length; i++) {
    const c = text[i];
    if (!started && c && !/\s/.test(c)) { started = true; sline = line; start = i }
    if (c === ';' || i === text.length) {
      if (started) { const raw = text.slice(start, i); const s = raw.replace(/\s+/g, ' ').trim().toLowerCase(); if (s) res.push({ sql: s, start: sline, end: line }); }
      started = false; start = i + 1;
    }
    if (c === '\n') line++;
  }
  return res;
}

const RULES = [
  ['drop table', /\bdrop\s+table\b/, 'drop table（删表）：先停止使用，下一个发布再删'],
  ['drop column', /\bdrop\s+column\b/, 'drop column（删列）：旧代码还在读写它就会坏；下一个发布再删'],
  ['rename', /\brename\s+(to|column)\b/, 'rename（改名）：新旧代码对不上；改成「新加一个，双写，迁完再删旧的」'],
  ['alter type', /\balter\s+column\s+\S+\s+(set\s+data\s+)?type\b/, '改列类型：会重写表、锁表，旧代码也可能不兼容；用新列迁移'],
  ['set not null', /\balter\s+column\s+\S+\s+set\s+not\s+null\b/, 'set not null：旧代码写入空值会失败；先回填并让新代码都写，下一个发布再加'],
  ['drop function', /\bdrop\s+function\b/, 'drop function（删函数 / 改签名）：旧前端调用的接口函数没了就会 500；先加新的，旧的下个发布再删'],
  ['drop type', /\bdrop\s+type\b/, 'drop type（删类型）'],
  ['truncate', /\btruncate\b/, 'truncate（清空表）'],
];
const NOT_RERUN = [
  ['create table', /^create\s+(unlogged\s+)?table\s+(?!if\s+not\s+exists\b)/, 'create table 要写 if not exists（迁移必须可重复运行）'],
  ['create index', /^create\s+(unique\s+)?index\s+(concurrently\s+)?(?!if\s+not\s+exists\b)/, 'create index 要写 if not exists'],
  ['create type', /^create\s+type\b/, 'create type 没有 if not exists：放进 do $$ begin … exception when duplicate_object then null; end $$ 里'],
  ['create extension', /^create\s+extension\s+(?!if\s+not\s+exists\b)/, 'create extension 要写 if not exists'],
];

// 对一个迁移文件的文本做检查，返回 { err: [{line, rule, msg}], warn: [...] }
export function audit(sql, name = 'x.sql') {
  const err = [], warn = []; const { text, allow } = strip(sql);
  const allowed = (s, e) => { for (let l = s - 1; l <= e; l++) if (allow.has(l)) return allow.get(l); return null };
  if (!/^\d{8}_[a-z0-9_]+\.sql$/.test(name)) err.push({ line: 0, rule: '文件名', msg: `文件名「${name}」要是 YYYYMMDD_小写英文数字下划线.sql` });
  const ver = name.replace(/\.sql$/, '');
  if (!new RegExp(`insert\\s+into\\s+schema_migrations[\\s\\S]*'${ver.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`, 'i').test(sql)) err.push({ line: 0, rule: '登记', msg: `文件结尾要登记自己：insert into schema_migrations(version) values ('${ver}') on conflict do nothing;` });
  for (const st of statements(text)) {
    const ok = allowed(st.start, st.end);
    for (const [rule, re, msg] of RULES) if (re.test(st.sql) && !ok) err.push({ line: st.start, rule, msg: `${msg}。确需如此：在语句前一行写 -- audit-allow: <原因>` });
    if (/^delete\s+from\b/.test(st.sql) && !/\bwhere\b/.test(st.sql) && !ok) err.push({ line: st.start, rule: 'delete 无 where', msg: 'delete 不带 where（清空表）。确需如此写 -- audit-allow: <原因>' });
    if (/^update\b/.test(st.sql) && !/\bwhere\b/.test(st.sql)) warn.push({ line: st.start, rule: 'update 无 where', msg: '全表更新：表大时要分批，别一把锁住（确认过可忽略）' });
    // add column：不带 default 的 not null 会让旧代码的 insert 失败；没有 if not exists 不能重跑
    if (/^alter\s+table\b/.test(st.sql)) {
      const parts = st.sql.split(/,\s*(?=add\s|alter\s|drop\s)/);
      for (const p of parts) {
        const m = /\badd\s+column\s+(if\s+not\s+exists\s+)?(\S+)\s*(.*)$/.exec(p);
        if (!m) continue;
        if (!m[1] && !ok) err.push({ line: st.start, rule: 'add column 重跑', msg: `add column ${m[2]} 要写 if not exists（迁移必须可重复运行）` });
        if (/\bnot\s+null\b/.test(m[3]) && !/\bdefault\b|\bgenerated\b/.test(m[3]) && !ok) err.push({ line: st.start, rule: 'add column not null', msg: `add column ${m[2]} not null 没有 default：旧代码的 insert 会失败。给 default，或先加可空列、回填、下个发布再收紧` });
      }
    }
    for (const [rule, re, msg] of NOT_RERUN) if (re.test(st.sql) && !ok) err.push({ line: st.start, rule, msg });
  }
  return { err, warn };
}

function loadBaseline() { try { return new Set(JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/spec/migration_baseline.json'), 'utf8')).files) } catch { return new Set() } }
function gitShow(rel) { try { return execFileSync('git', ['show', 'origin/main:' + rel], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 1 << 26 }) } catch { return null } }
function haveOriginMain() { try { execFileSync('git', ['rev-parse', '--verify', '-q', 'origin/main'], { cwd: ROOT, stdio: 'ignore' }); return true } catch { return false } }

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const base = loadBaseline(), files = fs.readdirSync(DIR).filter(f => f.endsWith('.sql') && f !== '_bundle.sql').sort();
  if (process.argv.includes('--list')) { files.forEach(f => console.log((base.has(f) ? '基线  ' : '检查  ') + f)); process.exit(0) }
  const origin = haveOriginMain(); let errN = 0, warnN = 0, checked = 0, changed = 0;
  for (const f of files) {
    const rel = 'server/migrations/' + f, cur = fs.readFileSync(path.join(DIR, f), 'utf8');
    if (origin) { const old = gitShow(rel); if (old !== null && old !== cur) { changed++; errN++; console.log(`❌ ${rel}：已经合并到 main 的迁移不许修改（改了不会重新执行，库和代码会对不上）→ 恢复原样，改动写进新的迁移`) } }
    if (base.has(f)) continue;
    checked++; const { err, warn } = audit(cur, f);
    err.forEach(e => { errN++; console.log(`❌ ${rel}${e.line ? ':' + e.line : ''} [${e.rule}] ${e.msg}`) });
    warn.forEach(w => { warnN++; console.log(`⚠ ${rel}:${w.line} [${w.rule}] ${w.msg}`) });
  }
  const missing = [...base].filter(f => !files.includes(f)); missing.forEach(f => { errN++; console.log(`❌ 基线里的 ${f} 不见了（迁移不许删）`) });
  console.log(`migration_audit: ${files.length} 个迁移（旧迁移基线 ${base.size} 个，检查 ${checked} 个）, ${errN} 个问题, ${warnN} 个提醒${origin ? '' : '；没有 origin/main，跳过「已合并不许改」'}`);
  process.exit(errN ? 1 : 0);
}
