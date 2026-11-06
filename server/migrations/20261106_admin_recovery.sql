-- 后台「重新生成恢复码」的数据库部分（11-06，#27）。可重复运行；纯新增两个函数，不改表、不动已有数据。
--   · 为什么要重新验证：恢复码等于「绕过验证码的万能钥匙」，换一批码前必须再次证明是本人（密码 + 当前验证码），
--     不能只靠「已登录」——否则别人拿到一个没退出的浏览器就能换走你的恢复码。
--   · admin_reauth_begin(管理员)：返回这个管理员的密码哈希 / 两步验证密钥 / 上次用过的时间步（和 admin_login_begin 同一类，只给接口专用角色 nbq_admin_api）
--   · admin_recovery_regen(管理员, 验证是否通过, 时间步, 10 个新哈希, IP)：通过 → 整批替换旧码并记 recovery.regen；
--     没通过 → 失败计数 +1（连错 5 次锁 15 分钟，和登录共用一个计数，所以猜密码 / 验证码的人换不了码）并记 recovery.regen_fail
--   · 只存哈希；新码明文只在这次响应里出现一次，库里没有、日志里没有
create or replace function admin_reauth_begin(p_admin uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare a admin_users;
begin
  select * into a from admin_users where id = p_admin;
  if not found or a.disabled then perform nbq_err('admin_session_expired'); end if;
  if a.locked_until > now() then perform nbq_err('admin_locked', ceil(extract(epoch from a.locked_until - now()))::int::text); end if;
  return jsonb_build_object('password_hash', a.password_hash, 'totp_secret', a.totp_secret, 'totp_last_step', a.totp_last_step);
end $$;
create or replace function admin_recovery_regen(p_admin uuid, p_ok boolean, p_totp_step bigint, p_hashes text[], p_ip inet default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare a admin_users;
begin
  select * into a from admin_users where id = p_admin for update;
  if not found or a.disabled then perform nbq_err('admin_session_expired'); end if;
  if a.locked_until > now() then perform nbq_err('admin_locked', ceil(extract(epoch from a.locked_until - now()))::int::text); end if;
  if not p_ok then
    update admin_users set failed_logins = failed_logins + 1,
           locked_until = case when failed_logins + 1 >= 5 then now() + interval '15 minutes' else locked_until end where id = p_admin;
    insert into admin_audit_log(admin_id, action, detail, ip) values (p_admin, 'recovery.regen_fail', '{}', p_ip);
    return jsonb_build_object('ok', false);
  end if;
  if p_totp_step is null or (a.totp_last_step is not null and p_totp_step <= a.totp_last_step) then perform nbq_err('admin_reauth_failed'); end if;   -- 这个验证码刚用过（登录用的就是它）：等下一个
  if p_hashes is null or cardinality(p_hashes) <> 10 or exists (select 1 from unnest(p_hashes) h where h !~ '^[0-9a-f]{64}$') or (select count(distinct h) from unnest(p_hashes) h) <> 10 then perform nbq_err('invalid', 'hashes'); end if;
  update admin_users set recovery_hashes = p_hashes, totp_last_step = p_totp_step, failed_logins = 0 where id = p_admin;
  insert into admin_audit_log(admin_id, action, detail, ip) values (p_admin, 'recovery.regen',
         jsonb_build_object('old_left', cardinality(a.recovery_hashes), 'new', 10), p_ip);
  return jsonb_build_object('ok', true);
end $$;
revoke execute on function admin_reauth_begin(uuid), admin_recovery_regen(uuid, boolean, bigint, text[], inet) from public, anon, authenticated, nbq_user, nbq_service, nbq_admin, nbq_viewer;
grant execute on function admin_reauth_begin(uuid), admin_recovery_regen(uuid, boolean, bigint, text[], inet) to nbq_admin_api;

create table if not exists schema_migrations (version text primary key, applied_at timestamptz not null default now());
alter table schema_migrations enable row level security;
drop policy if exists svc_all on schema_migrations; create policy svc_all on schema_migrations to nbq_service using (true) with check (true);
grant select, insert on schema_migrations to nbq_service;
insert into schema_migrations(version) values ('20261106_admin_recovery') on conflict do nothing;
