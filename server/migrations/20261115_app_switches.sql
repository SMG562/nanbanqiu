-- #49 PR①：最小运行时开关（可重复执行；默认全关）。内容与 schema.sql 同名段落一致。
--   · app_switches：三行固定的开关；只有 owner 能切（权限 switch.set，必须填理由，留痕进 admin_audit_log）
--   · app_switches_get()：公开读（后端 GET /api/switches 和每个请求的维护检查用）；admin_set_switch()：后台切换
--   · 短信验证码是前台直接调 Supabase Auth 发的，不经后端：sms_paused 在这里只存状态，真正不发由 PR② 前台读到后拦
create table if not exists app_switches (
  key        text primary key check (key in ('register_paused','maintenance','sms_paused')),
  is_on      boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references admin_users(id)
);
insert into app_switches(key) values ('register_paused'),('maintenance'),('sms_paused') on conflict (key) do nothing;
alter table app_switches enable row level security;
drop policy if exists svc_all on app_switches; create policy svc_all on app_switches to nbq_service using (true) with check (true);
drop policy if exists adm_read on app_switches; create policy adm_read on app_switches for select to nbq_admin using (true);
revoke all on app_switches from public, anon, authenticated, nbq_viewer, nbq_user;
grant select on app_switches to nbq_service, nbq_admin;
insert into admin_perms(action, label, roles, need_reason) values
 ('switch.set', '运行时开关：暂停注册 / 维护页 / 停发短信', '{owner}', true)
on conflict (action) do update set label = excluded.label, roles = excluded.roles, need_reason = excluded.need_reason;
create or replace function app_switches_get() returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_object_agg(key, is_on), '{}') from app_switches $$;
create or replace function admin_set_switch(p_key text, p_on boolean, p_reason text) returns void language plpgsql security definer set search_path = public as $$
declare adm uuid;
begin
  if p_key is null or p_on is null or p_key not in ('register_paused','maintenance','sms_paused') then perform nbq_err('invalid', 'switch'); end if;
  adm := nbq_admin_act('switch.set', p_key, p_reason, jsonb_build_object('on', p_on));
  update app_switches set is_on = p_on, updated_at = now(), updated_by = adm where key = p_key;
end $$;
revoke execute on function app_switches_get(), admin_set_switch(text, boolean, text) from public, nbq_user, nbq_viewer;
grant execute on function app_switches_get() to nbq_service, nbq_admin;
grant execute on function admin_set_switch(text, boolean, text) to nbq_admin;

create table if not exists schema_migrations (version text primary key, applied_at timestamptz not null default now());
alter table schema_migrations enable row level security;
drop policy if exists svc_all on schema_migrations; create policy svc_all on schema_migrations to nbq_service using (true) with check (true);
grant select, insert on schema_migrations to nbq_service;
insert into schema_migrations(version) values ('20261115_app_switches') on conflict do nothing;
