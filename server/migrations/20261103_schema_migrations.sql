-- 建迁移记录表，并把「已确认执行过」的迁移补记上（20261030 你跑过；其余 11-02 / 11-03 那几个是否执行过不确定，以各自文件末尾自己记的那一行为准）。可重复运行。
-- 迁移记录（11-03）：每个迁移文件结尾保证记录表存在并记一行自己；/api/version 会报「库里执行到哪一版」，冒烟测试核对它等于代码里最新的迁移。
create table if not exists schema_migrations (version text primary key, applied_at timestamptz not null default now());
alter table schema_migrations enable row level security;
drop policy if exists svc_all on schema_migrations; create policy svc_all on schema_migrations to nbq_service using (true) with check (true);
grant select, insert on schema_migrations to nbq_service;
insert into schema_migrations(version) values ('20261030_register_and_wechat'), ('20261103_schema_migrations') on conflict do nothing;
