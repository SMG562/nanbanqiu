#!/usr/bin/env node
// 测试库迁移的第二道检查（#95 staging-migrate，11-07）：migration_audit 管「向后兼容」，这里管「超出改表结构的操作」。
// 为什么：staging-migrate 用测试库的 postgres 账号执行分支里的迁移。迁移审批将来如果不只所有者一人，下面这些操作仍只能所有者看过后手动执行：
//   人工放行的破坏性语句（audit-allow）· 角色 / 权限 / 所有者变更 · 读写文件、外联网络 · 碰 Supabase 内部 schema（auth / storage / vault …）
//   · 扩展 / 库级设置 · 动态 SQL（execute 拼字符串，静态检查看不见里面）· 关掉行级安全。
// 这是纵深防御，不是沙箱：动态 SQL 一律拦，就是因为它能藏任何东西。真正的边界仍是「测试库只有测试数据」和数据库账号本身的权限。
// 三层：① psql 元命令（反斜杠）② 顶层语句白名单 ③ 黑名单扫去掉注释后的全文（保留字符串和 $$ 体，危险调用常藏在 do / 函数体里）；audit-allow 只在注释里，单独查原文。
// #95 独立复核（11-09）后补：元命令、白名单、带引号 / 空格的内部 schema、系统表、set_config、库级对象、非 sql/plpgsql 语言、事务外语句。
// 用法：node tools/staging_migrate_check.mjs <迁移文件…>   有命中 → 打印「文件:行 规则 —— 说明」，退出码 1
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';

// 词法：把注释（-- 与 /* */，含嵌套）换成空格；opts.strings / opts.bodies 为 true 时把字符串 / $tag$ 体的内容也换成空格（引号保留）。
// 保留换行，行号不变。E'..' 里的 \' 按转义处理（和 psql / 服务器一致，避免词法对不上而漏看）。
export function lex(sql, opts = {}) {
  let out = '', i = 0; const n = sql.length, blank = s => s.replace(/[^\n]/g, ' ');
  while (i < n) {
    const c = sql[i], c2 = sql.slice(i, i + 2);
    if (c2 === '--') { let j = sql.indexOf('\n', i); if (j < 0) j = n; out += blank(sql.slice(i, j)); i = j; continue }
    if (c2 === '/*') { let j = i + 2, d = 1; while (j < n && d) { if (sql.startsWith('/*', j)) { d++; j += 2 } else if (sql.startsWith('*/', j)) { d--; j += 2 } else j++ } out += blank(sql.slice(i, j)); i = j; continue }
    if (c === "'" || c === '"') {
      const esc = c === "'" && /[eE]/.test(sql[i - 1] || '') && !/[A-Za-z0-9_]/.test(sql[i - 2] || '');
      let j = i + 1; while (j < n) { if (esc && sql[j] === '\\') { j += 2; continue } if (sql[j] === c && sql[j + 1] === c) { j += 2; continue } if (sql[j] === c) break; j++ }
      j = Math.min(n, j + 1); const body = sql.slice(i, j);
      out += c === "'" && opts.strings ? c + blank(body.slice(1, -1)) + (body.length > 1 ? c : '') : body; i = j; continue
    }
    const d = /^\$([A-Za-z_][A-Za-z0-9_]*)?\$/.exec(sql.slice(i, i + 64));
    if (d && !/[A-Za-z0-9_]/.test(sql[i - 1] || '')) { const t = d[0]; let j = sql.indexOf(t, i + t.length); j = j < 0 ? n : j + t.length; out += opts.bodies ? t + blank(sql.slice(i + t.length, j - t.length)) + t : sql.slice(i, j); i = j; continue }
    out += c; i++;
  }
  return out;
}
export const stripComments = sql => lex(sql);

const SUPA = 'auth|storage|vault|realtime|supabase_functions|supabase_migrations|pgsodium|graphql|graphql_public|extensions|cron|net|pgbouncer';
export const RULES = [
  ['角色', /\b(create|alter|drop)\s+(role|user|group)\b/, '建 / 改 / 删数据库角色'],
  ['切换身份', /\bset\s+(local\s+|session\s+)?role\b|\bsession\s+authorization\b/, '切换执行身份'],
  ['所有者', /\bowner\s+to\b|\balter\s+default\s+privileges\b/, '改对象所有者 / 默认权限'],
  ['读写文件', /\bcopy\s+[^;]*\b(from|to)\b|\b(pg_read_file|pg_read_binary_file|pg_ls_dir|pg_stat_file|lo_import|lo_export)\b/, '读写服务器文件 / copy'],
  ['外联', /\b(dblink\w*|pg_net|http_(get|post|put|patch|delete|head|request)|pg_terminate_backend|pg_cancel_backend)\b/, '连外部网络 / 其他库 / 结束别的连接'],
  ['内部 schema', new RegExp(`(^|[^a-z0-9_$])"?(${SUPA})"?\\s*\\.\\s*"?[a-z_]`), '碰 Supabase 内部 schema（登录、存储、密钥…；含带引号 / 空格的写法）'],
  ['系统表', /\b(update|insert\s+into|delete\s+from|alter\s+table|truncate)\s+("?pg_catalog"?\s*\.\s*)?"?pg_[a-z_]+|\bpg_(authid|shadow|auth_members|hba_file_rules|file_settings)\b/, '改系统表 / 读口令表'],
  ['改服务器设置', /\b(set_config|pg_reload_conf|pg_rotate_logfile|pg_promote)\s*\(/, 'set_config（可切身份）/ 重载配置'],
  ['执行字符串 SQL', /\b(query_to_xml\w*|table_to_xml\w*|schema_to_xml\w*|database_to_xml\w*|cursor_to_xml\w*)\b/, '这些函数会执行传进去的 SQL 文本（等同动态 SQL）'],
  ['库级对象', /\b(create|alter|drop)\s+(language|server|subscription|publication|database|event\s+trigger|foreign\s+data\s+wrapper|user\s+mapping|tablespace|conversion|access\s+method)\b|\b(drop|reassign)\s+owned\b|\bsecurity\s+label\b|\bload\s+'/, '语言 / 外部服务器 / 订阅发布 / 事件触发器 / owned / 安全标签 / load'],
  ['函数语言', /\blanguage\s+'?(?!(sql|plpgsql)\b)[a-z]/, '只允许 sql / plpgsql 函数'],
  ['不能进事务', /\bconcurrently\b|\bvacuum\b|\balter\s+type\b[^;]*\badd\s+value\b(?![^;]*\bif\s+not\s+exists)/, '必须在事务外执行的语句（concurrently / vacuum），请所有者手动执行'],
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

// 顶层语句白名单（#95 复核第 2 条）：只放行「改表结构 + 数据」这几类，其余（set / reset / lock / call / security label…）一律手动执行。
// do 块和函数体里的内容不受白名单约束（plpgsql 什么都能写），由上面的黑名单 + 动态 SQL 全拦兜底。
export const ALLOW = /^(create\s+(or\s+replace\s+)?(unique\s+)?(table|index|function|view|trigger|type|sequence|policy)\b|alter\s+(table|type|function|index|sequence|view|policy)\b|drop\s+(table|function|policy|index|trigger|view|type|sequence)\b|grant\b|revoke\b|insert\s+into\b|update\b|delete\s+from\b|select\b|with\b|do\b|comment\s+on\b)/;
function statementIssues(code) {   // code：注释、字符串、$$ 体都已换成空格
  const out = [], parts = code.split(';'); let off = 0;
  const stmts = parts.map(p => { const lead = p.length - p.trimStart().length, r = { at: off + lead, s: p.trim().replace(/\s+/g, ' ') }; off += p.length + 1; return r }).filter(x => x.s);
  stmts.forEach(x => {
    if (/^(begin|start transaction|commit|end)$/.test(x.s)) return;   // 旧迁移有 begin … commit；只影响原子性、不涉安全，放行（新迁移不必写，psql -1 已包事务）
    if (!ALLOW.test(x.s)) out.push([x.at, '白名单外', `顶层语句「${x.s.slice(0, 40)}」不在白名单里`]);
  });
  return out;
}

// 返回 [{line, rule, why}]
export function check(sql) {
  const issues = [], lineOf = (s, i) => s.slice(0, i).split('\n').length;
  for (const m of sql.matchAll(/--\s*audit-allow\b/gi)) issues.push({ line: lineOf(sql, m.index), rule: 'audit-allow', why: '人工放行的破坏性语句，要所有者看过后手动执行' });
  const code = lex(sql, { strings: true, bodies: true }).toLowerCase();
  // psql 元命令（\! \i \o \gexec \copy …）：注释 / 字符串 / $$ 体以外出现反斜杠一律拦（#95 复核第 1 条）。
  // 工作流还用 psql -c 执行（不经 psql 词法，元命令在服务器端只是语法错误），这里是第二道。
  for (const m of code.matchAll(/\\/g)) issues.push({ line: lineOf(code, m.index), rule: '元命令', why: 'psql 元命令（\\! \\i \\o \\gexec…）会在 runner 上执行' });
  for (const [i, rule, why] of statementIssues(code)) issues.push({ line: lineOf(code, i), rule, why });
  // 黑名单扫描「去掉注释、保留字符串和 $$ 体」的全文：危险调用常藏在 do / 函数体里；字符串里的危险词宁可误拦（手动执行即可）
  const t = lex(sql).toLowerCase();
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
