-- 开打后 30 分钟内仍可申请 / 直接加入（11-04）。可重复运行；只改函数，不改表、不动已有数据（已超时失效的申请保持失效）。
-- 1) 申请截止不再被开打时间截断；2) 申请 / 直接加入的开打检查推迟 30 分钟；3) 开打时检查人数 / 「没有凑齐」/ 撤下 推迟到开打后 30 分钟，且有申请没处理完时先等。
create or replace function application_deadline(p_created timestamptz, p_start timestamptz) returns timestamptz
  language sql immutable as $$ select greatest(p_created, p_start - interval '60 minutes') + interval '15 minutes' $$;
-- 11-04 改：不再被「开打」截断。开打后 30 分钟内仍可申请，申请人的 15 分钟照给（最晚 = 开打后 45 分钟）。
create or replace function nbq_join_checks(p_game uuid, p_action text) returns games language plpgsql security definer set search_path = public as $$
declare g games; u uuid; me users; mine game_participants;
begin
  u := nbq_me();
  select * into g from games where id = p_game;
  if not found then perform nbq_err('not_found'); end if;
  u := nbq_gate(p_action, null, 'women' = any(g.tags));
  if not game_visible(p_game, u) or g.visibility <> 'public' then perform nbq_err('not_found'); end if;
  if g.status = 'cancelled' then perform nbq_err('game_closed'); end if;
  if g.starts_at + interval '30 minutes' <= now() then perform nbq_err('game_started'); end if;   -- 11-04：开打后 30 分钟内仍可申请 / 直接加入
  select * into me from users where id = u;
  if 'women' = any(g.tags) and (me.gender is distinct from 'f' or me.gender_review) then perform nbq_err('women_only'); end if;
  if is_blocked(u, g.host_id) then perform nbq_err('blocked'); end if;
  select * into mine from game_participants where game_id = p_game and user_id = u;
  if found and mine.status in ('pending','approved') then perform nbq_err('already_applied'); end if;
  if (select count(*) from game_participants where game_id = p_game and status = 'approved') + g.filled >= g.capacity then perform nbq_err('game_full'); end if;
  return g;
end $$;
create or replace function job_start_checks(p_now timestamptz default now()) returns int language plpgsql security definer set search_path = public as $$
declare t0 timestamptz := clock_timestamp(); n int;
begin
  with g as (select g.* from games g where g.starts_at + interval '30 minutes' <= p_now and g.status in ('open','full')   -- 11-04：开打后 30 分钟（仍可申请的窗口结束）才检查人数 / 撤下
               and not exists (select 1 from game_start_checks c where c.game_id = g.id)
               and not exists (select 1 from game_participants p where p.game_id = g.id and p.status = 'pending')),   -- 还有没处理完的申请：等处理完（或超时）再检查
  s as (select g.id, g.capacity, g.filled + (select count(*) from game_participants p where p.game_id = g.id and p.status = 'approved') as have,
               (select count(*) from game_participants p where p.game_id = g.id and p.role = 'player') as applied,
               (select count(*) from game_participants p where p.game_id = g.id and (p.status = 'pending' or (p.status = 'expired' and p.decline_reason = 'timeout'))) as pend,   -- 有申请没处理（含超时失效的）
               (select count(*) from game_participants p where p.game_id = g.id and p.role = 'player' and p.status = 'rejected') as rej,
               (select count(*) from game_participants p where p.game_id = g.id and p.status = 'left') as lft,
               g.host_id, g.visibility from g),
  ins as (insert into game_start_checks(game_id, checked_at, need, filled, applied_n, pending_n, reason)
          select id, p_now, capacity, have, applied, pend,
                 case when have >= capacity then 'full' when lft > 0 and applied > 0 then 'left_after_full' when applied = 0 then 'no_apply'
                      when pend > 0 then 'not_handled' when rej = applied then 'all_rejected' else 'short_one' end
            from s on conflict (game_id) do nothing returning game_id, filled, need),
  nt as (insert into notifications(user_id, kind, game_id) select s.host_id, 'unfilled_end', s.id from s join ins on ins.game_id = s.id
          where ins.filled < ins.need and s.visibility = 'public' returning 1),
  cl as (update games set unfilled_closed_at = p_now from ins where games.id = ins.game_id and ins.filled < ins.need and games.unfilled_closed_at is null returning 1)
  select count(*) into n from ins;
  update games set status = 'completed' where status in ('open','full') and starts_at + make_interval(mins => duration_min) <= p_now;
  return nbq_job_log('start_checks', n, t0);
end $$;
-- 4) 开打后：「预计几分钟到」（新列 eta_min + api_apply 多一个参数）、不能直接加入、发起人可一键「人齐了」（只许改 filled）
alter table game_participants add column if not exists eta_min smallint check (eta_min between 1 and 120);
drop function if exists api_apply(uuid, text);   -- 旧的两个参数的版本：新版本带默认值，旧调用照样能用
create or replace function api_apply(p_game uuid, p_message text default null, p_eta int default null) returns text language plpgsql security definer set search_path = public as $$
declare g games := nbq_join_checks(p_game, 'apply'); u uuid := nbq_uid();
begin
  if char_length(coalesce(p_message, '')) > 140 then perform nbq_err('invalid', 'message'); end if;
  if p_eta is not null and p_eta not between 1 and 120 then perform nbq_err('invalid', 'eta'); end if;
  perform nbq_rate(u::text, 'apply', p_game::text);   -- 频率（⑭）
  insert into game_participants(game_id, user_id, role, status, message, via, created_at, eta_min)
  values (p_game, u, 'player', 'pending', nullif(p_message, ''), 'request', now(), case when g.starts_at <= now() then p_eta end)   -- 预计几分钟到：只有开打后才申请的才记
  on conflict (game_id, user_id) do update set status = 'pending', message = excluded.message, via = 'request', created_at = now(), eta_min = excluded.eta_min,
     left_at = null, decided_at = null, approved_at = null, expired_at = null, decline_reason = null, decline_note = null
   where game_participants.status in ('withdrawn','left','rejected','expired');
  -- 同一人对同一局再次申请：只保留最新一条申请通知
  delete from notifications where user_id = g.host_id and kind = 'request' and game_id = p_game and actor_id = u;
  perform nbq_notify(g.host_id, 'request', p_game, u);
  return 'pending';
end $$;
revoke execute on function api_apply(uuid, text, int) from public, anon, authenticated, nbq_viewer;
grant execute on function api_apply(uuid, text, int) to nbq_user, nbq_service;
create or replace function api_join(p_game uuid) returns text language plpgsql security definer set search_path = public as $$
declare g games := nbq_join_checks(p_game, 'join'); u uuid := nbq_uid(); r numeric;
begin
  if g.join_mode <> 'instant' then perform nbq_err('join_not_allowed'); end if;
  if g.starts_at <= now() then perform nbq_err('join_not_allowed', 'started'); end if;   -- 11-04：开打后（宽限期内）一律要发起人确认，不能直接加入
  select utr into r from users where id = u;
  if r not between g.utr_min and g.utr_max then perform nbq_err('level_mismatch'); end if;
  -- 发起人对我「少遇到」：不能直接加入（不告诉原因，前台提示改为发送申请）
  if exists (select 1 from player_prefs where user_id = g.host_id and target_id = u and pref = 'less') then perform nbq_err('join_not_allowed', 'less'); end if;
  perform nbq_rate(u::text, 'apply', p_game::text);   -- 频率（⑭）：和申请合计
  insert into game_participants(game_id, user_id, role, status, via, approved_at, decided_at, created_at)
  values (p_game, u, 'player', 'approved', 'instant', now(), now(), now())
  on conflict (game_id, user_id) do update set status = 'approved', via = 'instant', approved_at = now(), decided_at = now(), created_at = now(),
     left_at = null, expired_at = null, decline_reason = null, decline_note = null, message = null
   where game_participants.status in ('withdrawn','left','rejected','expired');
  perform nbq_notify(g.host_id, 'joined', p_game, u);
  return 'approved';
end $$;
create or replace function api_game_edit(p_game uuid, p jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare u uuid := nbq_gate('create'); g games; n games; ch jsonb := '{}';
begin
  select * into g from games where id = p_game for update;
  if not found then perform nbq_err('not_found'); end if;
  if g.host_id <> u then perform nbq_err('not_host'); end if;
  if g.status = 'cancelled' then perform nbq_err('game_closed'); end if;
  -- 已开打：只许改「线下已有几人」（发起人现场凑齐了 / 不再等了，一键「人齐了」）；其余照旧不能改
  if g.starts_at <= now() and not (p ? 'filled' and p - 'filled' = '{}'::jsonb and g.starts_at + make_interval(mins => g.duration_min) > now()) then perform nbq_err('game_started'); end if;
  n := g;
  if p ? 'starts_at' then n.starts_at := (p->>'starts_at')::timestamptz; if n.starts_at <> g.starts_at then perform nbq_check_slot(n.starts_at, g.city); end if; end if;
  if p ? 'duration_min' then n.duration_min := (p->>'duration_min')::int; if n.duration_min not in (60, 90, 120) then perform nbq_err('invalid', 'duration_min'); end if; end if;
  if p ? 'venue_id' then n.venue_id := (p->>'venue_id')::uuid;
    if not exists (select 1 from venues where id = n.venue_id and status = 'active') then perform nbq_err('invalid', 'venue_id'); end if; end if;
  if p ? 'utr_min' then n.utr_min := (p->>'utr_min')::numeric; end if;
  if p ? 'utr_max' then n.utr_max := (p->>'utr_max')::numeric; end if;
  if n.utr_min > n.utr_max then perform nbq_err('invalid', 'utr'); end if;
  if p ? 'filled' then n.filled := (p->>'filled')::int; end if;
  if p ? 'note' then n.note := nullif(p->>'note', ''); if char_length(coalesce(n.note, '')) > 60 then perform nbq_err('invalid', 'note'); end if; end if;
  if p ? 'tags' then n.tags := array(select jsonb_array_elements_text(p->'tags')); end if;
  if p ? 'join_mode' then n.join_mode := p->>'join_mode';
    if n.join_mode = 'instant' and n.starts_at - now() > interval '2 hours' then perform nbq_err('invalid', 'join_mode'); end if; end if;
  select jsonb_object_agg(k, jsonb_build_array(to_jsonb(g) -> k, to_jsonb(n) -> k)) into ch from jsonb_object_keys(to_jsonb(n)) k
   where to_jsonb(g) -> k is distinct from to_jsonb(n) -> k;
  if ch is null or ch = '{}'::jsonb then return '{}'::jsonb; end if;
  update games set starts_at = n.starts_at, duration_min = n.duration_min, venue_id = n.venue_id, utr_min = n.utr_min, utr_max = n.utr_max, filled = n.filled,
         note = n.note, tags = n.tags, join_mode = n.join_mode, time_set_at = case when n.starts_at <> g.starts_at then now() else time_set_at end
   where id = p_game;
  insert into game_changes(game_id, changed_by, fields, is_major) values (p_game, u, ch, ch ? 'starts_at' or ch ? 'venue_id');
  if ch ? 'starts_at' then update game_participants set change_ack = 'pending' where game_id = p_game and role = 'player' and status = 'approved'; end if;
  insert into notifications(user_id, kind, game_id, actor_id) select user_id, 'changed', p_game, u from game_participants where game_id = p_game and role = 'player' and status = 'approved';
  return ch;
end $$;
create table if not exists schema_migrations (version text primary key, applied_at timestamptz not null default now());
alter table schema_migrations enable row level security;
drop policy if exists svc_all on schema_migrations; create policy svc_all on schema_migrations to nbq_service using (true) with check (true);
grant select, insert on schema_migrations to nbq_service;
insert into schema_migrations(version) values ('20261104_late_join') on conflict do nothing;
