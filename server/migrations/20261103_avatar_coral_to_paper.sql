-- 把「默认印色 coral」的老用户改回纸白（paper）。可重复运行。
-- 为什么安全：之前前台改印色只改内存、从没写到数据库（11-03 才补上保存），所以库里的 coral 只能是旧默认值（schema 里默认被误写成 coral）留下的，
-- 没有任何人是「自己选了 coral」。新版本印色色板里也没有 coral。
update users set avatar_color = 'paper' where avatar_color = 'coral';
create table if not exists schema_migrations (version text primary key, applied_at timestamptz not null default now());
alter table schema_migrations enable row level security;
drop policy if exists svc_all on schema_migrations; create policy svc_all on schema_migrations to nbq_service using (true) with check (true);
grant select, insert on schema_migrations to nbq_service;
insert into schema_migrations(version) values ('20261103_avatar_coral_to_paper') on conflict do nothing;
