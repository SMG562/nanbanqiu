-- 球友（#110 PR-A，11-08）：当面扫码加球友 —— 扫码的人发申请，被扫的人确认 / 忽略。可重复运行，纯新增，不改已有表和数据。
--   · 关系只来自事实：一起打过（照旧实时算，不落表）+ 当面扫码确认（buddies 表）。没有远程「加好友」入口，那是前台的事（PR-B）
--   · 没有「拒绝」：忽略不通知对方；发起人在 24 小时失效前一直看到「等待 TA 确认」（被忽略的也一样）→ buddy_requests 前台不能直接读，只走 api_buddies()
--   · 防骚扰：同一人 30 天内被忽略 2 次 / 24 小时内已发 10 个 → buddy_limit（两种情况同一个错误码，不泄露「被忽略过」）；屏蔽双向生效；账号不是正常状态不能发
--   · 两人互相扫了对方（对方已有一条待确认的给我）→ 直接成为球友
--   · 运营（PR-A3）：申请记来源（qr / link）和确认方式（confirm / mutual）；后台统计 buddy_stats；风控 buddy_ignored；6 个埋点进字典；注销满 30 天删关系和申请
--   · 本期不改：球友 = 一起打过的权限（约 / 私信，PR-A2）、api_export_me（并入 #71）
--   · 迁移里还复制了三个已有对象（risk_events 约束、risk_values、job_anonymize_deleted），在下面 ↓ ↑ 标出的块里，schema.sql 里改在原处，两边一字不差（pg/buddies 核对）
alter type notif_kind add value if not exists 'buddy_request';    -- 有人扫了你的码，等你确认
alter type notif_kind add value if not exists 'buddy_accepted';   -- 对方确认了，你们成为球友

-- ↓ 只在迁移里（schema.sql 里改在原处：risk_events 的 kind 约束、risk_values 加 buddy_ignored 分支）
alter table risk_events drop constraint if exists risk_events_kind_check;
alter table risk_events add constraint risk_events_kind_check check (kind in ('women_probe','link_attempt','contact_lure','apply_withdraw','rate_hit','buddy_ignored'));
create or replace function risk_values(p_now timestamptz default now()) returns table(user_id uuid, code text, value numeric)
language sql stable security definer set search_path = public as $$
  with w as (select r.code, p_now - make_interval(days => r.window_days) as t from risk_rules r where r.enabled),
  ev as (select e.user_id, e.kind, e.ref, e.at from risk_events e where e.at > p_now - interval '31 days' and e.at <= p_now),
  v as (
    select n.user_id, 'no_show' c, count(*)::numeric v from v_confirmed_noshow n, w where w.code = 'no_show' and n.starts_at > w.t and n.starts_at <= p_now group by 1
    union all
    select p.user_id, 'late_leave', count(*) from game_participants p join games g on g.id = p.game_id, w
     where w.code = 'late_leave' and p.status = 'left' and coalesce(p.change_ack, '') <> 'out' and p.left_at > w.t and p.left_at <= p_now
       and p.left_at - coalesce(p.approved_at, p.decided_at, p.created_at) > interval '10 minutes' and g.starts_at - p.left_at <= interval '24 hours' group by 1
    union all
    select g.host_id, 'host_late_cancel', count(*) from games g, w
     where w.code = 'host_late_cancel' and g.status = 'cancelled' and g.cancelled_at > w.t and g.cancelled_at <= p_now and g.starts_at - g.cancelled_at <= interval '24 hours'
       and exists (select 1 from game_participants x where x.game_id = g.id and x.role = 'player' and x.approved_at < g.cancelled_at) group by 1
    union all
    select r.target_id::uuid, 'reported', count(distinct r.reporter_id) from reports r, w
     where w.code = 'reported' and r.target_type = 'user' and r.created_at > w.t and r.created_at <= p_now group by 1
    union all
    select r.target_id::uuid, 'pact_violation', count(*) from reports r, w
     where w.code = 'pact_violation' and r.target_type = 'user' and r.reason = 'pact_violation' and r.status = 'actioned' and r.created_at > w.t and r.created_at <= p_now group by 1
    union all
    select b.blocked_id, 'blocked_by', count(distinct b.blocker_id) from blocks b, w where w.code = 'blocked_by' and b.created_at > w.t and b.created_at <= p_now group by 1
    union all
    select pp.target_id, 'less_marked', count(distinct pp.user_id) from player_prefs pp, w where w.code = 'less_marked' and pp.pref = 'less' and pp.updated_at > w.t and pp.updated_at <= p_now group by 1
    union all
    select x.from_user, 'invite_declined', max(x.n) from (select i.from_user, i.to_user, count(*) n from invites i, w
       where w.code = 'invite_declined' and i.status = 'declined' and i.responded_at > w.t and i.responded_at <= p_now group by 1, 2) x group by 1
    union all
    select p.user_id, 'declined_streak', count(*) from game_participants p, w
     where w.code = 'declined_streak' and p.role = 'player' and p.created_at > w.t and p.created_at <= p_now
       and exists (select 1 from game_participants y where y.user_id = p.user_id and y.status = 'rejected' and y.decline_reason in ('known','level','pass') and y.decided_at > w.t) group by 1
    union all
    select e.user_id, 'women_probe', count(*) from ev e, w where w.code = 'women_probe' and e.kind = 'women_probe' and e.at > w.t group by 1
    union all
    select gc.user_id, 'gender_flip', count(*) from gender_changes gc join users u on u.id = gc.user_id, w
     where w.code = 'gender_flip' and gc.from_g = 'm' and gc.to_g = 'f' and gc.created_at > w.t and gc.created_at <= p_now and gc.created_at - u.created_at <= interval '30 days' group by 1
    union all
    select m.sender_id, 'dm_burst', count(distinct m.thread_id) from messages m join threads t on t.id = m.thread_id and t.kind = 'dm' join users u on u.id = m.sender_id, w
     where w.code = 'dm_burst' and m.created_at > w.t and m.created_at <= p_now and u.created_at > p_now - interval '7 days' group by 1
    union all
    select e.user_id, 'link_spam', count(*) from ev e, w where w.code = 'link_spam' and e.kind = 'link_attempt' and e.at > w.t group by 1
    union all
    select u.id, 'same_device', count(*) from users u join users o on o.signup_device = u.signup_device, w
     where w.code = 'same_device' and u.created_at > w.t and o.created_at > w.t and o.created_at <= p_now and u.created_at <= p_now group by 1
    union all
    select u.id, 'same_ip', count(*) from users u join users o on o.signup_ip = u.signup_ip, w
     where w.code = 'same_ip' and u.created_at > w.t and o.created_at > w.t and o.created_at <= p_now and u.created_at <= p_now group by 1
    union all
    select e.user_id, 'contact_lure', count(distinct e.ref) from ev e, w where w.code = 'contact_lure' and e.kind = 'contact_lure' and e.at > w.t group by 1
    union all
    select e.user_id, 'apply_churn', count(*) from ev e, w where w.code = 'apply_churn' and e.kind = 'apply_withdraw' and e.at > w.t group by 1
    union all
    select e.user_id, 'rate_hit', count(*) from ev e, w where w.code = 'rate_hit' and e.kind = 'rate_hit' and e.at > w.t group by 1
    union all
    select e.user_id, 'buddy_ignored', count(distinct e.ref) from ev e, w where w.code = 'buddy_ignored' and e.kind = 'buddy_ignored' and e.at > w.t group by 1
  )
  select v.user_id, v.c, v.v from v join users u on u.id = v.user_id where u.status <> 'deleted'
$$;
-- 注销满 30 天匿名化时删球友和申请（注销后 30 天内：api_buddies 已经不显示这个人，恢复账号后关系还在）。函数其余部分与 schema.sql 原样一致；依赖 20261107_user_rackets
do $$ begin if to_regclass('public.user_rackets') is null then raise exception '先执行 20261107_user_rackets（建 user_rackets 表），再执行本迁移'; end if; end $$;
create or replace function job_anonymize_deleted(p_now timestamptz default now()) returns int language plpgsql security definer set search_path = public as $$
declare t0 timestamptz := clock_timestamp(); n int;
begin
  update users set phone_e164 = 'deleted:' || id, nickname = '已注销', last_initial = null, wechat_id = null, email = null, auth_id = null,
         avatar_kind = 'letter', avatar_animal = null, card_theme = 'court', gender = null, gender_review = false,
         signup_device = null, signup_ip = null, email_unsub_token = null, anonymized_at = p_now
   where status = 'deleted' and anonymized_at is null and status_since <= p_now - interval '30 days';
  get diagnostics n = row_count;
  delete from identity_links l using users u where u.id = l.user_id and u.anonymized_at = p_now;
  delete from user_devices d using users u where u.id = d.user_id and u.anonymized_at = p_now;
  delete from push_subscriptions s using users u where u.id = s.user_id and u.anonymized_at = p_now;
  delete from player_prefs p using users u where u.id = p.user_id and u.anonymized_at = p_now;
  delete from gender_changes g using users u where u.id = g.user_id and u.anonymized_at = p_now;
  delete from user_rackets r using users u where u.id = r.user_id and u.anonymized_at = p_now;   -- 我的球拍（#60 A2）：注销即删，不保留
  delete from buddies b using users u where u.anonymized_at = p_now and u.id in (b.user_a, b.user_b);   -- 球友（#110）：注销即删，对方那边也随之消失
  delete from buddy_requests r using users u where u.anonymized_at = p_now and u.id in (r.from_user, r.to_user);
  update email_outbox e set to_email = 'deleted', status = case when e.status = 'queued' then 'skipped' else e.status end,
         skip_reason = case when e.status = 'queued' then 'email_bad' else e.skip_reason end
    from users u where u.id = e.user_id and u.anonymized_at = p_now;
  return nbq_job_log('anonymize_deleted', n, t0);
end $$;
-- ↑ 只在迁移里

create table if not exists buddy_requests (
  id           uuid primary key default gen_random_uuid(),
  from_user    uuid not null references users(id) on delete cascade,
  to_user      uuid not null references users(id) on delete cascade,
  status       text not null default 'pending' check (status in ('pending','accepted','ignored','expired')),
  source       text not null default 'qr' check (source in ('qr','link','other')),   -- 从哪扫来的：qr 球员卡背面 / link 分享图、链接（监测截图外传后的远程申请）
  accepted_via text check (accepted_via in ('confirm','mutual')),                   -- confirm 对方确认 / mutual 互相扫了
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

-- 风控：7 天内加球友申请被 ≥3 个不同的人忽略（远程拿截图乱扫、当面纠缠的信号）；后台 RISK_RULES 同一条
insert into risk_rules (code, name, weight, threshold, window_days, enabled) values ('buddy_ignored', '加球友申请被多人忽略', 10, 3, 7, true)
on conflict (code) do update set name = excluded.name, weight = excluded.weight, threshold = excluded.threshold, window_days = excluded.window_days, enabled = excluded.enabled;

-- 埋点字典（#110）：前台两端发（PR-B 起），与 tests/spec/events_spec.md、后台 B1_EVENTS 逐字一致；业务数字以表为准（buddy_stats），埋点只看漏斗
insert into event_definitions (event, category, description, props, source, status, replaced_by) values
 ('buddy_scan_view','球友','扫码落地页看到「加球友」','target_uid, logged_in, source(qr/link/other)','client','active',null),
 ('buddy_request_send','球友','加球友申请发出（含已是球友 / 失败）','target_uid, result(pending/buddies/fail), err, source(qr/link/other)','client','active',null),
 ('buddy_request_open','球友','打开加球友确认页','request_id, via(push/notif/list)','client','active',null),
 ('buddy_respond','球友','确认 / 忽略加球友申请','request_id, action(accept/ignore), wait_min','client','active',null),
 ('buddy_remove','球友','删除球友','target_uid, played_together','client','active',null),
 ('buddy_list_open','球友','打开我的球友','n_buddies, n_played','client','active',null)
on conflict (event) do update set category = excluded.category, description = excluded.description, props = excluded.props, source = excluded.source, status = 'active', replaced_by = null;

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

-- 扫码后发申请：p_source = qr | link | other（空 = qr）；返回 {status: 'pending' | 'buddies', id?}
create or replace function api_buddy_request(p_to uuid, p_source text default 'qr') returns jsonb language plpgsql security definer set search_path = public as $$
declare u uuid := nbq_buddy_gate(); tu users; r buddy_requests; src text := coalesce(p_source, 'qr');
begin
  if src not in ('qr','link','other') then perform nbq_err('invalid', 'source'); end if;
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
    update buddy_requests set status = 'accepted', accepted_via = 'mutual', responded_at = now() where id = r.id;
    perform nbq_buddy_link(u, p_to); perform nbq_notify(p_to, 'buddy_accepted', null, u);
    return jsonb_build_object('status', 'buddies');
  end if;
  -- 24 小时内重复扫（包括已被忽略的）：返回原来那条，不重复提醒、不让发起人看出被忽略
  select * into r from buddy_requests where from_user = u and to_user = p_to and status in ('pending','ignored') and expires_at > now() order by created_at desc limit 1;
  if found then return jsonb_build_object('status', 'pending', 'id', r.id); end if;
  if (select count(*) from buddy_requests where from_user = u and to_user = p_to and status = 'ignored' and responded_at > now() - interval '30 days') >= 2
     or (select count(*) from buddy_requests where from_user = u and created_at > now() - interval '24 hours') >= 10 then perform nbq_err('buddy_limit'); end if;
  insert into buddy_requests (from_user, to_user, source) values (u, p_to, src) returning * into r;
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
  if p_action = 'ignore' then   -- 不通知对方；记一条风险信号（7 天内被 ≥3 个不同的人忽略 → buddy_ignored）
    update buddy_requests set status = 'ignored', responded_at = now() where id = r.id;
    insert into risk_events (user_id, kind, ref) values (r.from_user, 'buddy_ignored', u::text);
    return 'ignored';
  end if;
  if is_blocked(u, r.from_user) or (select status from users where id = r.from_user) in ('banned','deleted') then perform nbq_err('not_found'); end if;
  update buddy_requests set status = 'accepted', accepted_via = 'confirm', responded_at = now() where id = r.id;
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
                 from buddy_requests r join users ou on ou.id = r.to_user, me where r.from_user = me.u and r.status in ('pending','ignored') and r.expires_at > now()
                   and ou.status not in ('banned','deleted') and not is_blocked(me.u, r.to_user)), '[]'))
  from me
$$;

-- 后台统计（数据页 / 只读角色也能看）：申请按发出时间落在 [p_from, p_to)；p_cities 非空 = 只算发申请的人常用城市在这些城市里的（球友对：任一方在就算）
--   业务数字以表为准，不靠埋点；被忽略的在这里照实统计（只有后台看得到），过期 = pending 且已过 24 小时
create or replace function buddy_stats(p_from timestamptz, p_to timestamptz, p_cities text[] default null)
returns table(requests bigint, senders bigint, receivers bigint, accepted_confirm bigint, accepted_mutual bigint, ignored bigint, expired bigint, pending bigint,
              from_link bigint, accept_rate numeric, median_accept_min numeric, new_pairs bigint, total_pairs bigint)
language sql stable security definer set search_path = public as $$
  with r as (select x.*, case when x.status = 'pending' and x.expires_at <= now() then 'expired' else x.status end as st
               from buddy_requests x join users u on u.id = x.from_user
              where x.created_at >= p_from and x.created_at < p_to and (p_cities is null or u.home_city = any (p_cities))),
  pr as (select b.created_at from buddies b
          where p_cities is null or exists (select 1 from users u where u.id in (b.user_a, b.user_b) and u.home_city = any (p_cities)))
  select count(*), count(distinct r.from_user), count(distinct r.to_user),
         count(*) filter (where r.accepted_via = 'confirm'), count(*) filter (where r.accepted_via = 'mutual'),
         count(*) filter (where r.st = 'ignored'), count(*) filter (where r.st = 'expired'), count(*) filter (where r.st = 'pending'),
         count(*) filter (where r.source = 'link'),
         round(count(*) filter (where r.st = 'accepted')::numeric / nullif(count(*) filter (where r.st <> 'pending'), 0), 3),
         round((percentile_cont(0.5) within group (order by extract(epoch from r.responded_at - r.created_at) / 60) filter (where r.accepted_via = 'confirm'))::numeric, 1),
         (select count(*) from pr where pr.created_at >= p_from and pr.created_at < p_to), (select count(*) from pr)
    from r
$$;

revoke execute on function buddy_stats(timestamptz, timestamptz, text[]), nbq_buddy_gate(), nbq_buddy_link(uuid, uuid), api_buddy_request(uuid, text), api_buddy_respond(uuid, text), api_buddy_remove(uuid), api_buddies() from public, anon, authenticated;
grant execute on function api_buddy_request(uuid, text), api_buddy_respond(uuid, text), api_buddy_remove(uuid), api_buddies() to nbq_user;
grant execute on function buddy_stats(timestamptz, timestamptz, text[]) to nbq_admin, nbq_viewer;
grant execute on function nbq_buddy_gate(), nbq_buddy_link(uuid, uuid), api_buddy_request(uuid, text), api_buddy_respond(uuid, text), api_buddy_remove(uuid), api_buddies() to nbq_service;

create table if not exists schema_migrations (version text primary key, applied_at timestamptz not null default now());
alter table schema_migrations enable row level security;
drop policy if exists svc_all on schema_migrations; create policy svc_all on schema_migrations to nbq_service using (true) with check (true);
grant select, insert on schema_migrations to nbq_service;
insert into schema_migrations(version) values ('20261108_buddies') on conflict do nothing;
