-- 球拍统计（#60 A5，暂定实现：依据 #60 的提案，静默期到 2026-11-10；所有者可整体推翻）。可重复运行，只加不改。
--   · racket_daily / racket_daily_total：每晚记一次「持有人数」快照（只存计数、不存用户），是趋势和「上升最快」的数据来源，长期保留
--   · racket_rollup(day)：按当时的 user_rackets 记快照（不算已注销 / 已封禁的人）；同一天重跑覆盖
--   · job_nightly：只加一行 perform racket_rollup(d - 1)，其余与 schema.sql 原样一致
--   · admin_racket_stats / admin_racket_unmatched：后台「球拍」页用（只授权给后台角色；页面权限由后台接口层按 page.view 检查）。
--     口径：持有 = 正常状态的用户现在包里有这把；上升 = 现在的持有人数 − p_days 天前（含）最近一次快照；现在持有 < 5 的不进上升榜
do $$ begin if to_regclass('public.racket_catalog') is null then raise exception '先执行 20261108_racket_catalog'; end if; end $$;
create table if not exists racket_daily (
  day        date not null,
  catalog_id uuid references racket_catalog(id),   -- 空 = 产品库外的自由文字（合在一起记）
  holders    int not null default 0,
  mains      int not null default 0
);
create unique index if not exists racket_daily_key on racket_daily (day, coalesce(catalog_id, '00000000-0000-0000-0000-000000000000'::uuid));
create table if not exists racket_daily_total (
  day        date primary key,
  users_with int not null default 0,    -- 有至少一把的人
  users_all  int not null default 0,    -- 正常状态的人（分母）
  rows_all   int not null default 0,
  rows_other int not null default 0     -- 产品库外的
);
alter table racket_daily enable row level security; alter table racket_daily_total enable row level security;
drop policy if exists svc_all on racket_daily; create policy svc_all on racket_daily to nbq_service using (true) with check (true);
drop policy if exists svc_all on racket_daily_total; create policy svc_all on racket_daily_total to nbq_service using (true) with check (true);
revoke all on racket_daily, racket_daily_total from public, anon, authenticated, nbq_user;
grant all on racket_daily, racket_daily_total to nbq_service;

-- 正常状态的人的球拍（已注销 / 已封禁的不算）
create or replace function nbq_racket_live() returns table (user_id uuid, slot smallint, catalog_id uuid, created_at timestamptz) language sql stable security definer set search_path = public as $$
  select r.user_id, r.slot, r.catalog_id, r.created_at from user_rackets r join users u on u.id = r.user_id where u.status not in ('deleted', 'banned') $$;

create or replace function racket_rollup(p_day date) returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  delete from racket_daily where day = p_day;
  insert into racket_daily (day, catalog_id, holders, mains)
    select p_day, catalog_id, count(distinct user_id), count(*) filter (where slot = 1) from nbq_racket_live() group by catalog_id;
  get diagnostics n = row_count;
  insert into racket_daily_total (day, users_with, users_all, rows_all, rows_other)
    select p_day, (select count(distinct user_id) from nbq_racket_live()), (select count(*) from users where status not in ('deleted', 'banned')),
           (select count(*) from nbq_racket_live()), (select count(*) from nbq_racket_live() where catalog_id is null)
  on conflict (day) do update set users_with = excluded.users_with, users_all = excluded.users_all, rows_all = excluded.rows_all, rows_other = excluded.rows_other;
  return n;
end $$;

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
  perform racket_rollup(d - 1);   -- 我的球拍（#60 A5）：昨天结束时的持有人数快照
  return nbq_job_log('nightly', n, t0);
end $$;

-- 后台概览：一次给齐（页面一次请求）
create or replace function admin_racket_stats(p_days int default 7) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare base date; tot jsonb; top jsonb; rising jsonb; brands jsonb; trend jsonb;
begin
  if p_days is null or p_days not between 1 and 90 then perform nbq_err('invalid', 'days'); end if;
  select max(day) into base from racket_daily_total where day <= (now() at time zone 'Australia/Melbourne')::date - p_days;
  select jsonb_build_object('users_with', count(distinct l.user_id), 'users_all', (select count(*) from users where status not in ('deleted', 'banned')),
           'rows_all', count(*), 'rows_other', count(*) filter (where l.catalog_id is null)) into tot from nbq_racket_live() l;
  select coalesce(jsonb_agg(x order by x.holders desc, x.mains desc, x.brand, x.series), '[]') into top from (
    select c.id as catalog_id, c.brand, c.series, count(distinct l.user_id)::int as holders, count(*) filter (where l.slot = 1)::int as mains
      from nbq_racket_live() l join racket_catalog c on c.id = l.catalog_id group by c.id order by 4 desc, 5 desc, 2, 3 limit 10) x;
  select coalesce(jsonb_agg(x order by x.delta desc, x.holders desc), '[]') into rising from (
    select c.id as catalog_id, c.brand, c.series, now_.holders, coalesce(d.holders, 0) as base, now_.holders - coalesce(d.holders, 0) as delta, now_.added
      from (select catalog_id, count(distinct user_id)::int as holders, count(*) filter (where created_at > now() - make_interval(days => p_days))::int as added
              from nbq_racket_live() where catalog_id is not null group by catalog_id) now_
      join racket_catalog c on c.id = now_.catalog_id
      left join racket_daily d on d.day = base and d.catalog_id = now_.catalog_id
     where base is not null and now_.holders >= 5 and now_.holders - coalesce(d.holders, 0) > 0
     order by 6 desc, 4 desc limit 10) x;
  select coalesce(jsonb_agg(x order by x.holders desc), '[]') into brands from (
    select coalesce(c.brand, '其他') as brand, count(distinct l.user_id)::int as holders from nbq_racket_live() l left join racket_catalog c on c.id = l.catalog_id group by 1) x;
  select coalesce(jsonb_agg(jsonb_build_object('day', day, 'users_with', users_with, 'users_all', users_all) order by day), '[]') into trend
    from racket_daily_total where day > (now() at time zone 'Australia/Melbourne')::date - 90;
  return jsonb_build_object('total', tot, 'top', top, 'rising', rising, 'rising_base', base, 'days', p_days, 'brands', brands, 'trend', trend);
end $$;
-- 待归类：产品库外的自由文字，按「不分大小写、去多余空白」分组，只给文字和人数（不给是谁）
create or replace function admin_racket_unmatched(p_limit int default 50) returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(x order by x.n desc, x.k), '[]') from (
    select lower(coalesce(r.brand || ' ', '') || r.series) as k, min(coalesce(r.brand || ' ', '') || r.series) as text, count(distinct r.user_id)::int as n
      from user_rackets r join users u on u.id = r.user_id where r.catalog_id is null and u.status not in ('deleted', 'banned')
     group by 1 order by 3 desc, 1 limit least(greatest(coalesce(p_limit, 50), 1), 200)) x $$;

revoke execute on function nbq_racket_live(), racket_rollup(date), admin_racket_stats(int), admin_racket_unmatched(int) from public, anon, authenticated, nbq_user;
grant execute on function nbq_racket_live(), racket_rollup(date) to nbq_service;
grant execute on function admin_racket_stats(int), admin_racket_unmatched(int) to nbq_admin, nbq_viewer, nbq_service;
revoke execute on function job_nightly(timestamptz) from public, nbq_user, nbq_viewer;
grant execute on function job_nightly(timestamptz) to nbq_service;

create table if not exists schema_migrations (version text primary key, applied_at timestamptz not null default now());
alter table schema_migrations enable row level security;
drop policy if exists svc_all on schema_migrations; create policy svc_all on schema_migrations to nbq_service using (true) with check (true);
grant select, insert on schema_migrations to nbq_service;
insert into schema_migrations(version) values ('20261108_racket_stats') on conflict do nothing;
