-- 新用户默认印色改回纸白（paper）。可重复运行。
-- 原因：schema.sql 里先建表时默认 paper，后面一条语句又把默认改成 coral，实际库里默认成了 coral；业务规则和接口注册（coalesce 'paper'）都是纸白。
-- 只改「以后新建用户」的默认，不动已有用户的颜色。
alter table users alter column avatar_color set default 'paper';
create table if not exists schema_migrations (version text primary key, applied_at timestamptz not null default now());
alter table schema_migrations enable row level security;
drop policy if exists svc_all on schema_migrations; create policy svc_all on schema_migrations to nbq_service using (true) with check (true);
grant select, insert on schema_migrations to nbq_service;
insert into schema_migrations(version) values ('20261103_avatar_default_paper') on conflict do nothing;
