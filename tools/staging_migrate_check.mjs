#!/usr/bin/env node
// 测试库迁移的第二道检查（#95 staging-migrate，11-07）：migration_audit 管「向后兼容」，这里管「超出改表结构的操作」。
// 为什么：staging-migrate 用测试库的 postgres 账号执行分支里的迁移。迁移审批将来如果不只所有者一人，下面这些操作仍只能所有者看过后手动执行：
//   人工放行的破坏性语句（audit-allow）· 角色 / 权限 / 所有者变更 · 读写文件、外联网络 · 碰 Supabase 内部 schema（auth / storage / vault …）
//   · 扩展 / 库级设置 · 动态 SQL（execute 拼字符串，静态检查看不见里面）· 关掉行级安全。
// 这是纵深防御，不是沙箱：动态 SQL 一律拦，就是因为它能藏任何东西。真正的边界仍是「测试库只有测试数据」和数据库账号本身的权限。
// 扫描范围：去掉注释后的全文，**保留字符串和 $$ 函数体**（危险调用常藏在 do / 函数体里）；audit-allow 只在注释里，单独查原文。
// 用法：node tools/staging_migrate_check.mjs <迁移文件…>   有命中 → 打印「文件:行 规则 —— 说明」，退出码 1
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';

// 去掉 -- 和 /* */ 注释（字符串、$tag$ 体里的不算注释），换成空格，保留换行，行号不变
export function stripComments(sql) {
  let out = '', i = 0; const n = sql.length, blank = s => s.replace(/[^\n]/g, ' ');
  while (i < n) {
    const c = sql[i], c2 = sql.slice(i, i + 2);
    if (c2 === '--') { let j = sql.indexOf('\n', i); if (j < 0) j = n; out += blank(sql.slice(i, j)); i = j; continue }
    if (c2 === '/*') { let j = sql.indexOf('*/', i + 2); j = j < 0 ? n : j + 2; out += blank(sql.slice(i, j)); i = j; continue }
    if (c === "'") { let j = i + 1; while (j < n) { if (sql[j] === "'" && sql[j + 1] === "'") { j += 2; continue } if (sql[j] === "'") break; j++ } j = Math.min(n, j + 1); out += sql.slice(i, j); i = j; continue }
    const d = /^\$([A-Za-z_]*)\$/.exec(sql.slice(i, i + 40));
    if (d) { const t = d[0]; let j = sql.indexOf(t, i + t.length); j = j < 0 ? n : j + t.length; out += sql.slice(i, j); i = j; continue }
    out += c; i++;
  }
  return out;
}

const SUPA = 'auth|storage|vault|realtime|supabase_functions|supabase_migrations|pgsodium|graphql|graphql_public|extensions|cron|net|pgbouncer';
export const RULES = [
  ['角色', /\b(create|alter|drop)\s+(role|user|group)\b/, '建 / 改 / 删数据库角色'],
  ['切换身份', /\bset\s+(local\s+|session\s+)?role\b|\bsession\s+authorization\b/, '切换执行身份'],
  ['所有者', /\bowner\s+to\b|\balter\s+default\s+privileges\b/, '改对象所有者 / 默认权限'],
  ['读写文件', /\bcopy\s+[^;]*\b(from|to)\b|\b(pg_read_file|pg_read_binary_file|pg_ls_dir|pg_stat_file|lo_import|lo_export)\b/, '读写服务器文件 / copy'],
  ['外联', /\b(dblink\w*|pg_net|http_(get|post|put|patch|delete|head|request)|pg_terminate_backend|pg_cancel_backend)\b/, '连外部网络 / 其他库 / 结束别的连接'],
  ['内部 schema', new RegExp(`\\b(${SUPA})\\.[a-z_"]`), '碰 Supabase 内部 schema（登录、存储、密钥…）'],
  ['扩展与库级', /\b(create|alter|drop)\s+extension\b|\balter\s+(system|database)\b|\bdrop\s+(database|schema)\b|\bcreate\s+schema\b/, '扩展 / 库级设置 / schema'],
  ['动态 SQL', /\bexecute\s+(format\s*\(|'|\$|[a-z_][a-z0-9_.]*\s*(;|\|\||using\b|into\b))/, 'execute 拼出来的 SQL（静态检查看不见内容）'],
  ['关闭行级安全', /\b(disable|no\s+force)\s+row\s+level\s+security\b/, '关掉行级安全'],
];

// grant：只允许把对象权限给 nbq_ 开头的角色；角色成员（grant 角色 to 角色）和 with grant / admin option 一律拦
function grantIssues(text) {
  const out = [];
  for (const m of text.matchAll(/\bgrant\b([^;]*?)\bto\b([^;]*);/g)) {
    const what = m[1], to = m[2].replace(/\bwith\s+(grant|admin|inherit|set)\s+option\b.*$/, ''), opt = /\bwith\s+(grant|admin)\s+option\b/.test(m[2]);
    const roles = to.split(',').map(s => s.trim().replace(/^"|"$/g, '')).filter(Boolean);
    if (!/\bon\b/.test(what)) out.push([m.index, '权限', '把角色授予别的角色（成员关系可能提权）']);
    else if (opt) out.push([m.index, '权限', 'with grant / admin option']);
    else if (roles.some(r => !/^nbq_[a-z0-9_]+$/.test(r))) out.push([m.index, '权限', `授权给 nbq_ 以外的角色：${roles.filter(r => !/^nbq_[a-z0-9_]+$/.test(r)).join(', ')}`]);
  }
  return out;
}

// 返回 [{line, rule, why}]
export function check(sql) {
  const issues = [], lineOf = (s, i) => s.slice(0, i).split('\n').length;
  for (const m of sql.matchAll(/--\s*audit-allow\b/gi)) issues.push({ line: lineOf(sql, m.index), rule: 'audit-allow', why: '人工放行的破坏性语句，要所有者看过后手动执行' });
  const t = stripComments(sql).toLowerCase();
  for (const [rule, re, why] of RULES) for (const m of t.matchAll(new RegExp(re.source, 'g'))) issues.push({ line: lineOf(t, m.index), rule, why });
  for (const [i, rule, why] of grantIssues(t)) issues.push({ line: lineOf(t, i), rule, why });
  return issues.sort((a, b) => a.line - b.line);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const files = process.argv.slice(2); let bad = 0;
  if (!files.length) { console.error('用法：node tools/staging_migrate_check.mjs <迁移文件…>'); process.exit(2) }
  for (const f of files) for (const x of check(fs.readFileSync(f, 'utf8'))) { bad++; console.log(`${path.basename(f)}:${x.line}  ${x.rule} —— ${x.why}`) }
  console.log(bad ? `staging_migrate_check: ${files.length} 个文件，${bad} 处需要所有者手动执行` : `staging_migrate_check: ${files.length} 个文件，没有问题`);
  process.exit(bad ? 1 : 0);
}
