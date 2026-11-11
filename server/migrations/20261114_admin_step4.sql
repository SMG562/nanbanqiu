-- 后台接真数据 #27 第 4 步：补读权限（只加不改，可重复运行）。
--   · admin_users 后加的列补给 nbq_admin 读：schema ④ 的按列授权只覆盖当时已有的列（id、email、name、role、last_login_at、disabled），
--     「管理员」页要显示负责城市、停用时间和理由、创建时间。密码哈希、两步验证密钥、恢复码、失败次数照旧读不到
grant select (created_at, created_by, password_changed_at, disabled_at, disabled_reason, cities) on admin_users to nbq_admin;

create table if not exists schema_migrations (version text primary key, applied_at timestamptz not null default now());
alter table schema_migrations enable row level security;
drop policy if exists svc_all on schema_migrations; create policy svc_all on schema_migrations to nbq_service using (true) with check (true);
grant select, insert on schema_migrations to nbq_service;
insert into schema_migrations(version) values ('20261114_admin_step4') on conflict do nothing;
