-- 后台接口（/admin/api）的数据库部分（11-05，#27 第 1 步 PR-A）。可重复运行；纯新增，不改已有表、不动已有数据。
--   · 登录角色 nbq_admin_api：后台接口专用，NOINHERIT（连上来本身什么表都碰不到，必须 set local role 切成 nbq_admin / nbq_viewer 才有权限）；
--     不属于 nbq_service / nbq_user，所以后台接口的代码即使被利用，也拿不到前台接口那一套权限。
--     本迁移只建 NOLOGIN 的角色；开通登录和设密码由你手动做（密码不进仓库）：alter role nbq_admin_api login password '<强密码>';
--   · 登录前后只能调 6 个门禁函数（4 个已有 + 下面 2 个按 IP 限流）
--   · admin_login_attempts：只记失败的登录（含「邮箱不存在」，这种记不进 admin_audit_log，因为那里 admin_id 不能为空）
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'nbq_admin_api') then create role nbq_admin_api nologin noinherit; end if;
  alter role nbq_admin_api noinherit;
end $$;
grant nbq_admin to nbq_admin_api;
grant nbq_viewer to nbq_admin_api;
do $$ begin
  -- 前台接口那套权限一个都不能有（万一手动加过也收回）
  if pg_has_role('nbq_admin_api', 'nbq_service', 'member') then revoke nbq_service from nbq_admin_api; end if;
  if pg_has_role('nbq_admin_api', 'nbq_user', 'member') then revoke nbq_user from nbq_admin_api; end if;
end $$;
grant usage on schema public to nbq_admin_api;

create table if not exists admin_login_attempts (
  id  bigserial primary key,
  at  timestamptz not null default now(),
  ip  inet
);
create index if not exists admin_login_attempts_ip_at on admin_login_attempts (ip, at desc);
create index if not exists admin_login_attempts_at on admin_login_attempts (at);
alter table admin_login_attempts enable row level security;   -- 不建任何策略 = 只有下面两个定义者函数能碰
revoke all on admin_login_attempts from public, anon, authenticated, nbq_user, nbq_service, nbq_admin, nbq_viewer, nbq_admin_api;

-- 登录前：这个 IP 最近 15 分钟失败 ≥ 20 次就拒绝（rate_limited，detail = 还要等几秒）；在算 scrypt 之前调用，挡住拿登录接口耗 CPU 的刷法
create or replace function admin_attempt_check(p_ip inet) returns void language plpgsql security definer set search_path = public as $$
declare n int; oldest timestamptz;
begin
  select count(*), min(at) into n, oldest from admin_login_attempts where ip is not distinct from p_ip and at > now() - interval '15 minutes';
  if n >= 20 then perform nbq_err('rate_limited', greatest(1, ceil(extract(epoch from oldest + interval '15 minutes' - now()))::int)::text); end if;
end $$;
-- 登录失败后记一笔（单独一个事务提交；失败的登录事务会回滚，记在里面会丢）；顺手清掉 2 天前的
create or replace function admin_attempt_note(p_ip inet) returns void language plpgsql security definer set search_path = public as $$
begin
  insert into admin_login_attempts(ip) values (p_ip);
  delete from admin_login_attempts where at < now() - interval '2 days';
end $$;

revoke execute on function admin_attempt_check(inet), admin_attempt_note(inet) from public, anon, authenticated, nbq_user, nbq_service, nbq_admin, nbq_viewer;
grant execute on function admin_login_begin(text), admin_login_finish(uuid, boolean, inet, text, text, bigint, text),
  admin_session_check(text), admin_session_revoke(text), admin_attempt_check(inet), admin_attempt_note(inet) to nbq_admin_api;

create table if not exists schema_migrations (version text primary key, applied_at timestamptz not null default now());
alter table schema_migrations enable row level security;
drop policy if exists svc_all on schema_migrations; create policy svc_all on schema_migrations to nbq_service using (true) with check (true);
grant select, insert on schema_migrations to nbq_service;
insert into schema_migrations(version) values ('20261105_admin_api') on conflict do nothing;
