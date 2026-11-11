// 迁移向后兼容检查的规则：每条规则一个「会拦」和一个「不拦」的用例（含故意写坏的迁移）
import { audit, strip, statements } from '../../tools/migration_audit.mjs';
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x ? ' ' + JSON.stringify(x) : '')) };
const NAME = '20261201_demo.sql';
const REG = "\ninsert into schema_migrations(version) values ('20261201_demo') on conflict do nothing;\n";
const errs = (sql, name = NAME) => audit(sql + (name === NAME ? REG : ''), name).err;
const has = (sql, rule) => errs(sql).some(e => e.rule === rule);

// —— 好迁移：只加不改，可重复，登记自己 → 通过
const GOOD = `create table if not exists racquets (user_id uuid, model text);
alter table users add column if not exists racquet_count int not null default 0;
create index if not exists racquets_user on racquets(user_id);
create or replace function f() returns int language sql as $$ select 1 $$;
`;
T('好迁移（加表 / 加列带默认 / 加索引 / 改函数）→ 通过', errs(GOOD).length === 0, errs(GOOD));

// —— 收缩 / 破坏性操作 → 拦
T('drop table 拦', has('drop table racquets;', 'drop table'));
T('drop column 拦', has('alter table users drop column old_col;', 'drop column'));
T('rename column 拦', has('alter table users rename column a to b;', 'rename'));
T('rename to（改表名）拦', has('alter table users rename to people;', 'rename'));
T('改列类型 拦', has('alter table users alter column age type bigint;', 'alter type'));
T('set data type 拦', has('alter table users alter column age set data type bigint;', 'alter type'));
T('set not null 拦', has('alter table users alter column nick set not null;', 'set not null'));
T('add column not null 无默认 拦', has('alter table users add column if not exists must text not null;', 'add column not null'));
T('add column not null 有默认 → 不拦', !has('alter table users add column if not exists ok text not null default \'\';', 'add column not null'));
T('同一条 alter 里第二个 add column 也查', has('alter table users add column if not exists a int default 1, add column if not exists b int not null;', 'add column not null'));
T('drop function 拦', has('drop function if exists api_apply(uuid, text);', 'drop function'));
T('drop type 拦', has('drop type if exists mood;', 'drop type'));
T('truncate 拦', has('truncate table events;', 'truncate'));
T('delete 不带 where 拦', has('delete from events;', 'delete 无 where'));
T('delete 带 where → 不拦', !has("delete from events where at < now() - interval '30 days';", 'delete 无 where'));

// —— 不能重复执行 → 拦
T('create table 无 if not exists 拦', has('create table racquets (id int);', 'create table'));
T('add column 无 if not exists 拦', has('alter table users add column nick2 text;', 'add column 重跑'));
T('create index 无 if not exists 拦', has('create index i on t(a);', 'create index'));
T('create unique index concurrently 无 if not exists 拦', has('create unique index concurrently i on t(a);', 'create index'));
T('create type 裸写拦', has("create type mood as enum ('a');", 'create type'));
T('create type 放进 do 块 → 不拦', !has("do $$ begin create type mood as enum ('a'); exception when duplicate_object then null; end $$;", 'create type'));
T('create extension 无 if not exists 拦', has('create extension postgis;', 'create extension'));

// —— 人工放行
const ALLOW = '-- audit-allow: 收缩阶段，old_col 自 PR #99 起无任何读写\nalter table users drop column old_col;';
T('audit-allow 带原因 → 放行', errs(ALLOW).length === 0, errs(ALLOW));
T('audit-allow 写在同一行 → 放行', errs('alter table users drop column old_col; -- audit-allow: 已无引用').length === 0);
T('audit-allow 没写原因 → 仍拦', has('-- audit-allow:\nalter table users drop column old_col;', 'drop column'));
T('audit-allow 隔了一行 → 仍拦', has('-- audit-allow: 原因\n\nalter table users drop column old_col;', 'drop column'));

// —— 不误报：注释、字符串、函数体里的文字
T('注释里的 drop table 不算', errs('-- drop table x;\n/* drop column y */\nselect 1;').length === 0);
T('字符串里的 drop table 不算', errs("insert into notes(t) values ('drop table users; truncate x');").length === 0);
T('函数体里的 delete 不带 where 不算', errs('create or replace function f() returns void language plpgsql as $$ begin delete from tmp; end $$;').length === 0);
T('带标签的 $fn$ 函数体也不算', errs('create or replace function f() returns void language plpgsql as $fn$ begin truncate tmp; end $fn$;').length === 0);
T('drop policy / drop trigger / drop constraint（放宽类）不拦', errs('drop policy if exists p on t; drop trigger if exists g on t; alter table t drop constraint if exists c;').length === 0);

// —— 文件名与登记
T('文件名不规范 拦', audit(GOOD + REG, 'demo.sql').err.some(e => e.rule === '文件名'));
T('文件名有大写 拦', audit(GOOD + REG, '20261201_Demo.sql').err.some(e => e.rule === '文件名'));
T('没登记自己 拦', audit(GOOD, NAME).err.some(e => e.rule === '登记'));
T('登记成别的版本 拦', audit(GOOD + "\ninsert into schema_migrations(version) values ('20261201_other') on conflict do nothing;", NAME).err.some(e => e.rule === '登记'));

// —— 提醒（不拦）
const w = audit('update users set x = 1;' + REG, NAME);
T('update 不带 where 只提醒', w.err.length === 0 && w.warn.length === 1, w);
T('update 带 where 不提醒', audit("update users set x = 1 where y = 2;" + REG, NAME).warn.length === 0);

// —— 行号
const r = audit('select 1;\n\n\ndrop table a;' + REG, NAME).err.find(e => e.rule === 'drop table');
T('报告行号正确（第 4 行）', r && r.line === 4, r);
const ml = audit("select 'a\nb';\n/* x\ny */\ndrop table z;" + REG, NAME).err.find(e => e.rule === 'drop table');
T('多行字符串 / 注释之后行号仍正确（第 5 行）', ml && ml.line === 5, ml);

// —— 工具函数
T('strip 保留换行数', strip("a\n'b\nc'\n$$d\ne$$\n-- f\n").text.split('\n').length === 7);
T('statements 按分号切', statements('select 1; select 2;').length === 2);

console.log(`\nmigration_audit: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
