-- 我的 UTR（#101，11-07 用户定的第二版）：个人页随时更新 UTR，两种：正式 / 自评（自评 = 已有的 utr_estimated）；正式可附 UTR 主页编号。
--   · users 加 utr_profile（UTR 主页编号，只存数字；users 只许本人读，对外的 public_profiles 不加）和 utr_at（上次确认 UTR 的时间）
--   · utr_changes：每次数值或类型变了记一行（给后台查虚报、将来同步比对）；只许本人读
--   · 写入只走 api_set_utr(jsonb)：校验、频率（24 小时 5 次）、历史都在库里；PATCH /api/me 不再能改 utr / utr_estimated（收回列权限）
--   · 注销匿名化时清掉 utr_profile 和历史（触发器，不改 job_anonymize_deleted，免得和其他迁移互相覆盖）
--   可重复运行；只加不删（收回的是前台账号对两列的直接改权限，注册仍走 /api/me/register）。
alter table users add column if not exists utr_profile text;
alter table users add column if not exists utr_at timestamptz;
alter table users drop constraint if exists users_utr_profile_check;
alter table users add constraint users_utr_profile_check check (utr_profile is null or utr_profile ~ '^[0-9]{4,12}$');

create table if not exists utr_changes (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references users(id) on delete cascade,
  old_utr    numeric(4,2),
  new_utr    numeric(4,2) not null,
  old_est    boolean,
  new_est    boolean not null,
  at         timestamptz not null default now()
);
create index if not exists utr_changes_user on utr_changes (user_id, at desc);
alter table utr_changes enable row level security;
drop policy if exists svc_all on utr_changes; create policy svc_all on utr_changes to nbq_service using (true) with check (true);
drop policy if exists own_read on utr_changes; create policy own_read on utr_changes for select to nbq_user using (user_id = nbq_uid());
revoke all on utr_changes from public, anon, authenticated, nbq_user;
grant select on utr_changes to nbq_user;
grant all on utr_changes to nbq_service;

revoke update (utr, utr_estimated) on users from nbq_user;

insert into rate_rules(rule, grp, win, max_hits, per_key, code, note)
values ('utr_day', 'utr', '24 hours', 5, false, 'rate_limited', '我的 UTR：数值或类型 24 小时内最多改 5 次（只改链接、原样再确认不计）')
on conflict (rule) do nothing;

-- p = {utr: 数字, estimated: true/false, profile?: 字符串 | null}；profile 不传 = 不动，null / 空串 = 清掉，
--   可以是 UTR 主页链接（utrsports.net / universaltennis.com 的 /profiles/<数字>）或纯数字。
-- 返回 {utr, estimated, profile, updated_at}
create or replace function api_set_utr(p jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare u uuid := nbq_me(); v numeric; e boolean; prof text; raw text; o users;
begin
  if p is null or jsonb_typeof(p) <> 'object' then perform nbq_err('invalid', 'utr'); end if;
  if coalesce(jsonb_typeof(p->'utr'), '') <> 'number' then perform nbq_err('invalid', 'utr'); end if;
  v := (p->>'utr')::numeric;
  if v < 1 or v > 16.5 or v <> round(v, 2) then perform nbq_err('invalid', 'utr'); end if;
  if coalesce(jsonb_typeof(p->'estimated'), '') <> 'boolean' then perform nbq_err('invalid', 'estimated'); end if;
  e := (p->>'estimated')::boolean;
  select * into o from users where id = u for update;
  prof := o.utr_profile;
  if p ? 'profile' then
    if jsonb_typeof(p->'profile') not in ('string', 'null') then perform nbq_err('invalid', 'profile'); end if;
    raw := nullif(btrim(p->>'profile'), '');
    if raw is null then prof := null;
    elsif raw ~ '^[0-9]{4,12}$' then prof := raw;
    else
      prof := substring(raw from '^(?:https?://)?(?:app\.|www\.)?(?:utrsports\.net|universaltennis\.com)/profiles/([0-9]{4,12})(?:[/?#].*)?$');
      if prof is null then perform nbq_err('invalid', 'profile'); end if;
    end if;
  end if;
  if v is distinct from o.utr or e is distinct from o.utr_estimated then
    perform nbq_rate(u::text, 'utr');
    insert into utr_changes(user_id, old_utr, new_utr, old_est, new_est) values (u, o.utr, v, o.utr_estimated, e);
  end if;
  update users set utr = v, utr_estimated = e, utr_profile = prof, utr_at = now() where id = u;
  return jsonb_build_object('utr', v, 'estimated', e, 'profile', prof, 'updated_at', now());
end $$;
-- 读自己的：updated_at 没确认过就用注册时间
create or replace function api_my_utr() returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('utr', utr, 'estimated', utr_estimated, 'profile', utr_profile, 'updated_at', coalesce(utr_at, created_at))
    from users where id = nbq_me() $$;
revoke execute on function api_set_utr(jsonb), api_my_utr() from public, anon, authenticated;
grant execute on function api_set_utr(jsonb), api_my_utr() to nbq_user, nbq_service;

-- 注销匿名化：清掉 UTR 主页编号和改动历史
create or replace function users_utr_wipe() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.anonymized_at is not null and old.anonymized_at is null then
    new.utr_profile := null;
    delete from utr_changes where user_id = new.id;
  end if;
  return new;
end $$;
revoke execute on function users_utr_wipe() from public, anon, authenticated, nbq_user;
drop trigger if exists trg_users_utr_wipe on users;
create trigger trg_users_utr_wipe before update of anonymized_at on users for each row execute function users_utr_wipe();

create table if not exists schema_migrations (version text primary key, applied_at timestamptz not null default now());
alter table schema_migrations enable row level security;
drop policy if exists svc_all on schema_migrations; create policy svc_all on schema_migrations to nbq_service using (true) with check (true);
grant select, insert on schema_migrations to nbq_service;
insert into schema_migrations(version) values ('20261110_my_utr') on conflict do nothing;
