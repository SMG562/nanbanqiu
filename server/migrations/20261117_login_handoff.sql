-- 登录交接（可重复执行；内容与 schema.sql 同名段落一致）。只加两张表和四个函数、重定义每晚任务（多两行清理），不改任何现有接口的行为。
-- ---------- 登录交接（11-14）：Safari 登录后添加到主屏幕，从桌面图标打开不用再登录 ----------
-- iPhone 上 Safari 和「添加到主屏幕」的 App 不共用存储。做法：登录后的页面向服务器要一个一次性交接码，写进安装配置的启动网址；
--   桌面图标第一次打开时拿码换登录态（接口层自己签发的令牌，和 Supabase 的令牌并行，接口两种都认）。
--   · login_handoffs：只存码的 sha256；24 小时内有效、只能用一次；每人每天最多 5 个
--   · device_sessions：交接出来的登录（只存续期凭证的 sha256）；续期时看账号状态，封禁 / 已匿名化的续不了；退出登录删行；
--       从交接那一刻起最多 90 天（expires_at，到期重新登录一次；凭证被偷也不会长期可用），180 天没用过的每晚清掉
--   · 退出登录（两种登录都算）会把这个人还没用掉的码一并作废；换码按 IP 限次（每小时 30 次）
--   两张表前台身份碰不到，只能经下面的函数读写；明文的码和凭证从不落库
create table if not exists login_handoffs (
  code_hash  text primary key check (code_hash ~ '^[0-9a-f]{64}$'),
  user_id    uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at    timestamptz
);
create index if not exists login_handoffs_user on login_handoffs (user_id, created_at);
create table if not exists device_sessions (
  refresh_hash text primary key check (refresh_hash ~ '^[0-9a-f]{64}$'),
  user_id      uuid not null references users(id) on delete cascade,
  created_at   timestamptz not null default now(),
  last_used_at timestamptz not null default now(),
  expires_at   timestamptz not null default now() + interval '90 days'
);
alter table device_sessions add column if not exists expires_at timestamptz not null default now() + interval '90 days';   -- 测试库先跑过没有这一列的版本
create index if not exists device_sessions_user on device_sessions (user_id);
alter table login_handoffs enable row level security; alter table device_sessions enable row level security;
drop policy if exists svc_all on login_handoffs; create policy svc_all on login_handoffs to nbq_service using (true) with check (true);
drop policy if exists svc_all on device_sessions; create policy svc_all on device_sessions to nbq_service using (true) with check (true);
revoke all on login_handoffs, device_sessions from public, anon, authenticated, nbq_viewer, nbq_user;
grant all on login_handoffs, device_sessions to nbq_service;

-- 已登录的人要一个交接码（接口层生成随机码，这里只收它的 sha256）。封禁 / 注销中的账号不给；每人每天 5 个
create or replace function api_handoff_new(p_code_hash text) returns timestamptz language plpgsql security definer set search_path = public as $$
declare u uuid := nbq_me(); st text; exp timestamptz := now() + interval '24 hours';
begin
  if p_code_hash is null or p_code_hash !~ '^[0-9a-f]{64}$' then perform nbq_err('invalid', 'code'); end if;
  select status::text into st from users where id = u;
  if st in ('banned', 'deleted') then perform nbq_err('forbidden'); end if;
  if (select count(*) from login_handoffs where user_id = u and created_at > now() - interval '24 hours') >= 5 then perform nbq_err('rate_limited'); end if;
  insert into login_handoffs(code_hash, user_id, expires_at) values (p_code_hash, u, exp);
  return exp;
end $$;
-- 用码换登录（接口层以服务身份调用）：码存在、没用过、没过期、账号没被封 → 作废这个码、记下新的续期凭证，返回签令牌要用的 {auth_id, phone}；否则返回 null（不说明原因）
create or replace function session_handoff_redeem(p_code_hash text, p_refresh_hash text, p_ip text default null) returns jsonb language plpgsql security definer set search_path = public as $$
declare h login_handoffs; x users;
begin
  perform nbq_rate('ip:' || coalesce(p_ip, '?'), 'handoff_ip', null);   -- 不用登录的接口：同一 IP 每小时 30 次（超了报 rate_limited）
  if p_code_hash is null or p_refresh_hash is null or p_refresh_hash !~ '^[0-9a-f]{64}$' then return null; end if;
  update login_handoffs set used_at = now() where code_hash = p_code_hash and used_at is null and expires_at > now() returning * into h;
  if not found then return null; end if;
  select * into x from users where id = h.user_id;
  if not found or x.auth_id is null or x.status::text = 'banned' then return null; end if;
  insert into device_sessions(refresh_hash, user_id) values (p_refresh_hash, x.id);
  return jsonb_build_object('auth_id', x.auth_id, 'phone', ltrim(x.phone_e164, '+'));
end $$;
-- 续期：凭证还在、账号没被封 / 没匿名化 → 返回 {auth_id, phone}；否则 null（前台据此清掉登录）
create or replace function session_refresh(p_refresh_hash text) returns jsonb language plpgsql security definer set search_path = public as $$
declare x users;
begin
  select u.* into x from device_sessions s join users u on u.id = s.user_id where s.refresh_hash = p_refresh_hash;
  if not found or x.auth_id is null or x.status::text = 'banned' or (select expires_at from device_sessions where refresh_hash = p_refresh_hash) <= now() then
    delete from device_sessions where refresh_hash = p_refresh_hash; return null;
  end if;
  update device_sessions set last_used_at = now() where refresh_hash = p_refresh_hash;
  return jsonb_build_object('auth_id', x.auth_id, 'phone', ltrim(x.phone_e164, '+'));
end $$;
-- 退出交接出来的登录：作废凭证，并把这个人还没用掉的码一并作废（不然退出后 24 小时内，之前写进桌面图标的码还能换出登录）
create or replace function session_logout(p_refresh_hash text) returns void language plpgsql security definer set search_path = public as $$
declare u uuid;
begin
  delete from device_sessions where refresh_hash = p_refresh_hash returning user_id into u;
  if u is not null then update login_handoffs set used_at = now() where user_id = u and used_at is null; end if;
end $$;
-- 已登录的人作废自己还没用掉的码（Supabase 登录的页面退出前调用）
create or replace function api_handoff_revoke() returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  update login_handoffs set used_at = now() where user_id = nbq_me() and used_at is null;
  get diagnostics n = row_count; return n;
end $$;
insert into rate_rules(rule, grp, win, max_hits, per_key, code, note) values
 ('handoff_ip', 'handoff_ip', '1 hour', 30, false, 'rate_limited', '登录交接换码：同一 IP 每小时 30 次')
on conflict do nothing;
-- 只有这一个 session_handoff_redeem（第 3 个参数 IP 可省）。这个迁移的早期版本在测试库建过一个 2 参数的重载，和它并存时「只传 2 个参数」会报函数不唯一；
--   迁移里不放 drop（破坏性语句不进自动迁移），测试库由所有者手工执行一次：drop function if exists session_handoff_redeem(text, text);  正式库没建过，不用管
revoke execute on function api_handoff_new(text), api_handoff_revoke(), session_handoff_redeem(text, text, text), session_refresh(text), session_logout(text) from public, anon, authenticated, nbq_viewer;
grant execute on function api_handoff_new(text), api_handoff_revoke() to nbq_user;
grant execute on function session_handoff_redeem(text, text, text), session_refresh(text), session_logout(text) to nbq_service;

-- 每晚：在上一版的基础上加「交接码 / 交接登录清理」
create or replace function job_nightly(p_now timestamptz default now()) returns int language plpgsql security definer set search_path = public as $$
declare t0 timestamptz := clock_timestamp(); d date := (select min((p_now at time zone tz)::date) from cities); n int := 0;
begin
  for i in 1..3 loop n := n + rollup_people(d - i); end loop;
  perform job_anonymize_deleted(p_now);
  perform job_retention(p_now);
  delete from rate_hits where at < p_now - interval '31 days';
  delete from risk_events where at < p_now - interval '90 days';
  update users set signup_ip = null where signup_ip is not null and created_at < p_now - interval '30 days';
  delete from area_demand where kind = 'city_waitlist' and (notified_at < p_now - interval '30 days' or created_at < p_now - interval '2 years');
  delete from idempotency_keys where created_at < p_now - interval '2 days';
  delete from login_handoffs where created_at < p_now - interval '2 days';
  delete from device_sessions where last_used_at < p_now - interval '180 days' or expires_at < p_now;
  perform racket_rollup(d - 1);   -- 我的球拍（#60 A5）：昨天结束时的持有人数快照
  return nbq_job_log('nightly', n, t0);
end $$;

create table if not exists schema_migrations (version text primary key, applied_at timestamptz not null default now());
alter table schema_migrations enable row level security;
drop policy if exists svc_all on schema_migrations; create policy svc_all on schema_migrations to nbq_service using (true) with check (true);
grant select, insert on schema_migrations to nbq_service;
insert into schema_migrations(version) values ('20261117_login_handoff') on conflict do nothing;
