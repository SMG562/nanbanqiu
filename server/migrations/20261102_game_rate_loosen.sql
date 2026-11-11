-- 发局频率放宽：每天 3→5 个（进行中最多 5 个不变；取消的也算今天发的）。可重复运行。
update rate_rules set max_hits = 5, note = '发局：每天 5 个' where rule = 'game_day';

-- 迁移记录（11-03）：每个迁移文件结尾保证记录表存在并记一行自己；/api/version 会报「库里执行到哪一版」，冒烟测试核对它等于代码里最新的迁移。
create table if not exists schema_migrations (version text primary key, applied_at timestamptz not null default now());
alter table schema_migrations enable row level security;
drop policy if exists svc_all on schema_migrations; create policy svc_all on schema_migrations to nbq_service using (true) with check (true);
grant select, insert on schema_migrations to nbq_service;
insert into schema_migrations(version) values ('20261102_game_rate_loosen') on conflict do nothing;
