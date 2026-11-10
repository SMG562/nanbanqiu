-- 我的 UTR（#101）后台只读：运营看 UTR 类型、是否关联主页、改动历史，用来发现虚报和多个账号关联同一个主页。可重复运行，只加不改。
--   · users 新加的两列（utr_profile、utr_at）补给 nbq_admin 读：schema ④ 的批量授权只覆盖当时已有的列
--   · utr_changes：nbq_admin 可读（行级安全 adm_read）；只读角色 nbq_viewer 不给（它只看统计，不看个人）
--   · 限城市的管理员：接口查询都 join users，users 上的 adm_city 限制照样生效
do $$ begin if to_regclass('public.utr_changes') is null then raise exception '先执行 20261110_my_utr'; end if; end $$;
grant select (utr_profile, utr_at) on users to nbq_admin;
grant select on utr_changes to nbq_admin;
drop policy if exists adm_read on utr_changes; create policy adm_read on utr_changes for select to nbq_admin using (true);

create table if not exists schema_migrations (version text primary key, applied_at timestamptz not null default now());
alter table schema_migrations enable row level security;
drop policy if exists svc_all on schema_migrations; create policy svc_all on schema_migrations to nbq_service using (true) with check (true);
grant select, insert on schema_migrations to nbq_service;
insert into schema_migrations(version) values ('20261112_utr_admin') on conflict do nothing;
