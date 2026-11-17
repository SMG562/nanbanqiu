-- #276 PR①（可重复执行；内容与 schema.sql 同名段落一致）：写接口幂等（api_spec §0.2 第 3 条）。只建表和两个函数，不改任何接口的现有行为；接口层（act 里 opt-in 的 4 个路由）是 PR②。
--   · idempotency_keys：一人一个 key 一行，保留 24 小时（每晚清掉 2 天前的）；只能经下面两个函数读写，前台身份碰不到表
--   · idem_begin(key, route)：第一次 → 记下 key、返回 null，调用方接着做写操作，然后在同一个事务里调 idem_finish 存结果；
--       同一个 key 再来 → 返回第一次存的结果（不再做一遍）；同一个 key 换了接口 → 409 idempotency_key_reused；超过 24 小时 → 当新的。
--       同时来两次：第二次的 insert 等第一次的事务结束——第一次提交了就返回它的结果，第一次失败回滚了就由第二次来做
create table if not exists idempotency_keys (
  user_id    uuid not null references users(id) on delete cascade,
  key        text not null check (key ~ '^[A-Za-z0-9_-]{16,64}$'),
  route      text not null check (char_length(route) between 1 and 80),
  response   jsonb,
  created_at timestamptz not null default now(),
  primary key (user_id, key)
);
create index if not exists idempotency_keys_at on idempotency_keys (created_at);
alter table idempotency_keys enable row level security;
drop policy if exists svc_all on idempotency_keys; create policy svc_all on idempotency_keys to nbq_service using (true) with check (true);
revoke all on idempotency_keys from public, anon, authenticated, nbq_viewer, nbq_user;
grant all on idempotency_keys to nbq_service;
create or replace function idem_begin(p_key text, p_route text) returns jsonb language plpgsql security definer set search_path = public as $$
declare u uuid := nbq_me(); r idempotency_keys;
begin
  if p_key is null or p_key !~ '^[A-Za-z0-9_-]{16,64}$' then perform nbq_err('invalid', 'idempotency_key'); end if;
  if p_route is null or char_length(p_route) not between 1 and 80 then perform nbq_err('invalid', 'route'); end if;
  insert into idempotency_keys(user_id, key, route) values (u, p_key, p_route) on conflict do nothing;
  if found then return null; end if;
  select * into r from idempotency_keys where user_id = u and key = p_key for update;
  if r.created_at < now() - interval '24 hours' then
    update idempotency_keys set route = p_route, response = null, created_at = now() where user_id = u and key = p_key;
    return null;
  end if;
  if r.route <> p_route or r.response is null then perform nbq_err('idempotency_key_reused'); end if;
  return r.response;
end $$;
create or replace function idem_finish(p_key text, p_response jsonb) returns void language plpgsql security definer set search_path = public as $$
begin
  update idempotency_keys set response = coalesce(p_response, '{}'::jsonb) where user_id = nbq_me() and key = p_key and response is null;
  if not found then perform nbq_err('state_changed'); end if;
end $$;
revoke execute on function idem_begin(text, text), idem_finish(text, jsonb) from public, anon, authenticated, nbq_viewer;
grant execute on function idem_begin(text, text), idem_finish(text, jsonb) to nbq_user;

-- 每晚：在上一版的基础上加「幂等 key 清理」（保留 24 小时，这里清 2 天前的，留一天余量）
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
  perform racket_rollup(d - 1);   -- 我的球拍（#60 A5）：昨天结束时的持有人数快照
  return nbq_job_log('nightly', n, t0);
end $$;

create table if not exists schema_migrations (version text primary key, applied_at timestamptz not null default now());
alter table schema_migrations enable row level security;
drop policy if exists svc_all on schema_migrations; create policy svc_all on schema_migrations to nbq_service using (true) with check (true);
grant select, insert on schema_migrations to nbq_service;
insert into schema_migrations(version) values ('20261116_idempotency_keys') on conflict do nothing;
