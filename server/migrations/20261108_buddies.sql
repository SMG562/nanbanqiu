-- 球友（#110 PR-A，11-08）：当面扫码加球友 —— 扫码的人发申请，被扫的人确认 / 忽略。可重复运行，纯新增，不改已有表和数据。
--   · 关系只来自事实：一起打过（照旧实时算，不落表）+ 当面扫码确认（buddies 表）。没有远程「加好友」入口，那是前台的事（PR-B）
--   · 没有「拒绝」：忽略不通知对方；发起人在 24 小时失效前一直看到「等待 TA 确认」（被忽略的也一样）→ buddy_requests 前台不能直接读，只走 api_buddies()
--   · 防骚扰：同一人 30 天内被忽略 2 次 / 24 小时内已发 10 个 → buddy_limit（两种情况同一个错误码，不泄露「被忽略过」）；屏蔽双向生效；账号不是正常状态不能发
--   · 两人互相扫了对方（对方已有一条待确认的给我）→ 直接成为球友
--   · 本期不改：球友 = 一起打过的权限（约 / 私信，PR-A2）、注销匿名化删球友、api_export_me（#71）
alter type notif_kind add value if not exists 'buddy_request';    -- 有人扫了你的码，等你确认
alter type notif_kind add value if not exists 'buddy_accepted';   -- 对方确认了，你们成为球友

create table if not exists buddy_requests (
  id           uuid primary key default gen_random_uuid(),
  from_user    uuid not null references users(id) on delete cascade,
  to_user      uuid not null references users(id) on delete cascade,
  status       text not null default 'pending' check (status in ('pending','accepted','ignored','expired')),
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null default now() + interval '24 hours',
  responded_at timestamptz,
  check (from_user <> to_user)
);
create unique index if not exists buddy_requests_one_pending on buddy_requests (from_user, to_user) where status = 'pending';
create index if not exists buddy_requests_to on buddy_requests (to_user, created_at desc);
alter table buddy_requests enable row level security;
drop policy if exists svc_all on buddy_requests; create policy svc_all on buddy_requests to nbq_service using (true) with check (true);
revoke all on buddy_requests from public, anon, authenticated, nbq_user;
grant all on buddy_requests to nbq_service;

create table if not exists buddies (
  user_a     uuid not null references users(id) on delete cascade,   -- user_a < user_b：一对人只有一行
  user_b     uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_a, user_b),
  check (user_a < user_b)
);
create index if not exists buddies_b on buddies (user_b);
alter table buddies enable row level security;
drop policy if exists svc_all on buddies; create policy svc_all on buddies to nbq_service using (true) with check (true);
drop policy if exists own_read on buddies; create policy own_read on buddies for select to nbq_user using (nbq_uid() in (user_a, user_b));
revoke all on buddies from public, anon, authenticated, nbq_user;
grant select on buddies to nbq_user;
grant all on buddies to nbq_service;

-- 账号不是正常状态（暂停中 / 核实中 / 受限 / 封禁）不能加球友；暂停到期按正常
create or replace function nbq_buddy_gate() returns uuid language plpgsql stable security definer set search_path = public as $$
declare u uuid := nbq_me(); st text;
begin
  select case when status = 'suspended' and status_until <= now() then 'active' else status end into st from users where id = u;
  if st is distinct from 'active' then perform nbq_err('account_' || coalesce(st, 'deleted')); end if;
  return u;
end $$;
create or replace function nbq_buddy_link(a uuid, b uuid) returns void language sql security definer set search_path = public as $$
  insert into buddies (user_a, user_b) values (least(a, b), greatest(a, b)) on conflict do nothing
$$;

-- 扫码后发申请：返回 {status: 'pending' | 'buddies', id?}
create or replace function api_buddy_request(p_to uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare u uuid := nbq_buddy_gate(); tu users; r buddy_requests;
begin
  if p_to = u then perform nbq_err('buddy_self'); end if;
  select * into tu from users where id = p_to;
  if not found or tu.status in ('banned','deleted') then perform nbq_err('not_found'); end if;
  if is_blocked(u, p_to) then perform nbq_err('blocked'); end if;
  perform 1 from users where id = least(u, p_to) for update; perform 1 from users where id = greatest(u, p_to) for update;   -- 同一对人并发扫码时排队（固定顺序上锁，不死锁）
  if exists (select 1 from buddies where user_a = least(u, p_to) and user_b = greatest(u, p_to)) then return jsonb_build_object('status', 'buddies'); end if;
  update buddy_requests set status = 'expired' where status = 'pending' and expires_at <= now() and from_user in (u, p_to) and to_user in (u, p_to);
  -- 对方已经扫过我、还在等我确认 → 互相扫了，直接成为球友
  select * into r from buddy_requests where from_user = p_to and to_user = u and status = 'pending' for update;
  if found then
    update buddy_requests set status = 'accepted', responded_at = now() where id = r.id;
    perform nbq_buddy_link(u, p_to); perform nbq_notify(p_to, 'buddy_accepted', null, u);
    return jsonb_build_object('status', 'buddies');
  end if;
  -- 24 小时内重复扫（包括已被忽略的）：返回原来那条，不重复提醒、不让发起人看出被忽略
  select * into r from buddy_requests where from_user = u and to_user = p_to and status in ('pending','ignored') and expires_at > now() order by created_at desc limit 1;
  if found then return jsonb_build_object('status', 'pending', 'id', r.id); end if;
  if (select count(*) from buddy_requests where from_user = u and to_user = p_to and status = 'ignored' and responded_at > now() - interval '30 days') >= 2
     or (select count(*) from buddy_requests where from_user = u and created_at > now() - interval '24 hours') >= 10 then perform nbq_err('buddy_limit'); end if;
  insert into buddy_requests (from_user, to_user) values (u, p_to) returning * into r;
  perform nbq_notify(p_to, 'buddy_request', null, u);
  return jsonb_build_object('status', 'pending', 'id', r.id);
end $$;

-- 被扫的人确认 / 忽略：p_action = 'accept' | 'ignore'；返回 'buddies' | 'ignored'。已处理 / 已失效 → buddy_request_ended
create or replace function api_buddy_respond(p_id uuid, p_action text) returns text language plpgsql security definer set search_path = public as $$
declare u uuid := nbq_buddy_gate(); r buddy_requests;
begin
  if p_action is null or p_action not in ('accept','ignore') then perform nbq_err('invalid', 'action'); end if;
  select * into r from buddy_requests where id = p_id and to_user = u for update;
  if not found then perform nbq_err('not_found'); end if;
  if r.status <> 'pending' or r.expires_at <= now() then perform nbq_err('buddy_request_ended'); end if;
  if p_action = 'ignore' then update buddy_requests set status = 'ignored', responded_at = now() where id = r.id; return 'ignored'; end if;   -- 不通知对方
  if is_blocked(u, r.from_user) or (select status from users where id = r.from_user) in ('banned','deleted') then perform nbq_err('not_found'); end if;
  update buddy_requests set status = 'accepted', responded_at = now() where id = r.id;
  perform nbq_buddy_link(u, r.from_user); perform nbq_notify(r.from_user, 'buddy_accepted', null, u);
  return 'buddies';
end $$;

-- 删除球友：不通知对方；一起打过的关系不受影响（那是事实）
create or replace function api_buddy_remove(p_user uuid) returns void language plpgsql security definer set search_path = public as $$
declare u uuid := nbq_me();
begin
  delete from buddies where user_a = least(u, p_user) and user_b = greatest(u, p_user);
end $$;

-- 我的球友 + 申请：{buddies:[{user_id, since}], incoming:[{id, from_user, created_at, expires_at}], outgoing:[{id, to_user, created_at, expires_at}]}
--   outgoing 里被忽略的也照样列出（24 小时失效前），只给 id / 对象 / 时间，不给状态
create or replace function api_buddies() returns jsonb language sql stable security definer set search_path = public as $$
  with me as (select nbq_me() as u),
  b as (select case when x.user_a = me.u then x.user_b else x.user_a end as o, x.created_at from buddies x, me where me.u in (x.user_a, x.user_b))
  select jsonb_build_object(
    'buddies', coalesce((select jsonb_agg(jsonb_build_object('user_id', b.o, 'since', b.created_at) order by b.created_at desc)
                 from b join users ou on ou.id = b.o, me where ou.status not in ('banned','deleted') and not is_blocked(me.u, b.o)), '[]'),
    'incoming', coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'from_user', r.from_user, 'created_at', r.created_at, 'expires_at', r.expires_at) order by r.created_at desc)
                 from buddy_requests r join users ou on ou.id = r.from_user, me where r.to_user = me.u and r.status = 'pending' and r.expires_at > now()
                   and ou.status not in ('banned','deleted') and not is_blocked(me.u, r.from_user)), '[]'),
    'outgoing', coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'to_user', r.to_user, 'created_at', r.created_at, 'expires_at', r.expires_at) order by r.created_at desc)
                 from buddy_requests r, me where r.from_user = me.u and r.status in ('pending','ignored') and r.expires_at > now() and not is_blocked(me.u, r.to_user)), '[]'))
  from me
$$;

revoke execute on function nbq_buddy_gate(), nbq_buddy_link(uuid, uuid), api_buddy_request(uuid), api_buddy_respond(uuid, text), api_buddy_remove(uuid), api_buddies() from public, anon, authenticated;
grant execute on function api_buddy_request(uuid), api_buddy_respond(uuid, text), api_buddy_remove(uuid), api_buddies() to nbq_user;
grant execute on function nbq_buddy_gate(), nbq_buddy_link(uuid, uuid), api_buddy_request(uuid), api_buddy_respond(uuid, text), api_buddy_remove(uuid), api_buddies() to nbq_service;

create table if not exists schema_migrations (version text primary key, applied_at timestamptz not null default now());
alter table schema_migrations enable row level security;
drop policy if exists svc_all on schema_migrations; create policy svc_all on schema_migrations to nbq_service using (true) with check (true);
grant select, insert on schema_migrations to nbq_service;
insert into schema_migrations(version) values ('20261108_buddies') on conflict do nothing;
