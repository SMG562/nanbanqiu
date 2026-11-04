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
create table if not exists schema_migrations (version text primary key, applied_at timestamptz not null default now());
alter table schema_migrations enable row level security;
drop policy if exists svc_all on schema_migrations; create policy svc_all on schema_migrations to nbq_service using (true) with check (true);
grant select, insert on schema_migrations to nbq_service;
insert into schema_migrations(version) values ('20261104_late_join') on conflict do nothing;
