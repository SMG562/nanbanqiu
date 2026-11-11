-- 4d 对照用：改写之前的定义（取自 4c 版 schema），建在 ref 模式里。perf.mjs 用它核对改写后的结果逐行相同。

create schema if not exists ref;

set search_path = ref, public;

create or replace view v_counted_games as
select p.user_id, p.game_id, p.role, g.starts_at, g.venue_id, g.host_id
from game_participants p join games g on g.id=p.game_id
where p.status = 'approved' and g.status <> 'cancelled'
  and g.starts_at + make_interval(mins => g.duration_min) <= now()
  and (g.filled > 0 or exists (select 1 from game_participants o where o.game_id=p.game_id and o.user_id<>p.user_id and o.status='approved'))
  and not exists (select 1 from v_confirmed_noshow n where n.game_id=p.game_id and n.user_id=p.user_id);

create or replace view user_kudos_v2 as
with k as (select to_id as user_id, count(distinct from_id) as kudos from impressions group by to_id),
     pt as (select a.user_id, count(distinct b.user_id) as partners
            from v_counted_games a join game_participants b on b.game_id=a.game_id and b.user_id<>a.user_id and b.status='approved'
            group by a.user_id)
select coalesce(k.user_id, pt.user_id) as user_id,
       coalesce(k.kudos,0) as kudos, coalesce(pt.partners,0) as partners,
       round(coalesce(k.kudos,0)::numeric / nullif(greatest(coalesce(pt.partners,0), coalesce(k.kudos,0)),0), 3) as kudos_rate,
       -- 等级用的好评率（平滑，和前台 grRate 一致）：(好评人数 + 1) / (max(一起打过的球友, 好评人数) + 4)
       round((coalesce(k.kudos,0) + 1)::numeric / (greatest(coalesce(pt.partners,0), coalesce(k.kudos,0)) + 4), 3) as level_rate
from k full join pt on pt.user_id=k.user_id;

create or replace view player_cards as
select u.id as user_id, u.member_no, u.nickname, u.last_initial, u.utr, u.avatar_kind, u.avatar_animal, u.avatar_color, u.seal_roll, u.card_theme,
       coalesce(u.main_club_id,
         (select uc.venue_id from user_clubs uc where uc.user_id=u.id order by uc.created_at limit 1),
         (select c.venue_id from v_counted_games c where c.user_id=u.id and c.venue_id is not null
           group by c.venue_id order by count(*) desc limit 1))                       as card_venue_id,
       (select count(*) from v_counted_games c where c.user_id=u.id)                    as played,
       (select count(*) from v_counted_games c where c.user_id=u.id and c.role='host')  as hosted,
       coalesce(k.kudos,0)                                                              as kudos,
       u.level                                                                          as level   -- 🌱 初见 · 🍃 相伴 · 🌿 常伴 · 🌲 挚友 · 🌳 南伴之光
from users u left join user_kudos_v2 k on k.user_id=u.id;

create or replace function active_users(p_from timestamptz, p_to timestamptz)
returns table(users bigint, anon_visitors bigint) language sql stable set search_path = ref, public as $$
  select count(distinct user_id), count(distinct anon_id) filter (where user_id is null)
  from events where occurred_at >= p_from and occurred_at < p_to
$$;

create or replace function distinct_people(p_event text, p_from timestamptz, p_to timestamptz,
                                           p_device text default null, p_build text default null)
returns bigint language sql stable set search_path = ref, public as $$
  select count(distinct coalesce(e.user_id::text, 'anon:' || e.anon_id))
  from events e
  where e.event = p_event and e.occurred_at >= p_from and e.occurred_at < p_to
    and (p_device is null or e.device = p_device) and (p_build is null or e.build = p_build)
$$;

create or replace function user_activity(p_from timestamptz, p_to timestamptz)
returns table(user_id uuid, member_no bigint, nickname text, host_ok bigint, played bigint, apply bigint,
              invite bigint, impression bigint, active_day bigint, no_show bigint, score numeric)
language sql stable set search_path = ref, public as $$
  with x as (
    select u.id as uid, u.member_no as mno, u.nickname as nick,
      (select count(*) from v_game_fill f where f.host_id=u.id and f.full_at_start and f.starts_at >= p_from and f.starts_at < p_to) as host_ok,
      (select count(*) from v_counted_games c where c.user_id=u.id and c.starts_at >= p_from and c.starts_at < p_to) as played,
      (select count(*) from game_participants p where p.user_id=u.id and p.role='player' and p.created_at >= p_from and p.created_at < p_to) as apply,
      (select count(*) from invites i where i.from_user=u.id and i.created_at >= p_from and i.created_at < p_to) as invite,
      (select count(*) from impressions m where m.from_id=u.id and m.created_at >= p_from and m.created_at < p_to) as impression,
      (select count(distinct (e.occurred_at at time zone 'Australia/Melbourne')::date) from events e
         where e.user_id=u.id and e.occurred_at >= p_from and e.occurred_at < p_to) as active_day,
      (select count(*) from v_confirmed_noshow n where n.user_id=u.id and n.starts_at >= p_from and n.starts_at < p_to) as no_show
    from users u)
  select x.uid, x.mno, x.nick, x.host_ok, x.played, x.apply, x.invite, x.impression, x.active_day, x.no_show,
    (select coalesce(sum(w.weight * case w.k when 'host_ok' then x.host_ok when 'played' then x.played when 'apply' then x.apply
        when 'invite' then x.invite when 'impression' then x.impression when 'active_day' then x.active_day when 'no_show' then x.no_show else 0 end),0)
       from activity_weights w)
  from x
$$;

create or replace function visit_funnel(p_from timestamptz, p_to timestamptz)
returns table(step int, name text, people bigint) language sql stable set search_path = ref, public as $$
  with v as (select distinct coalesce(user_id::text, anon_id) as who, user_id from events where occurred_at >= p_from and occurred_at < p_to),
  gv as (select distinct coalesce(user_id::text, anon_id) as who from events where event='game_view' and occurred_at >= p_from and occurred_at < p_to),
  ap as (select distinct user_id from game_participants where role='player' and created_at >= p_from and created_at < p_to),
  ok as (select distinct user_id from game_participants where role='player' and status in ('approved','left') and created_at >= p_from and created_at < p_to),
  pl as (select distinct c.user_id from v_counted_games c join game_participants p on p.game_id=c.game_id and p.user_id=c.user_id
          where p.role='player' and p.created_at >= p_from and p.created_at < p_to),
  s1 as (select * from v), s2 as (select * from s1 where who in (select who from gv)),
  s3 as (select * from s2 where user_id in (select user_id from ap)), s4 as (select * from s3 where user_id in (select user_id from ok)),
  s5 as (select * from s4 where user_id in (select user_id from pl))
  select 1, '来访', (select count(*) from s1) union all select 2, '看过球局', (select count(*) from s2)
  union all select 3, '申请 / 加入', (select count(*) from s3) union all select 4, '被通过', (select count(*) from s4)
  union all select 5, '打完', (select count(*) from s5)
$$;

create or replace view v_user_retention as   -- 地区扩展 R1-2：注册日按本人常用城市、活跃日按事件所在城市的当地日期（与正式版同一口径）
with u as (select id, home_city as city, (created_at at time zone city_tz(home_city))::date as d0 from users where created_at > now() - interval '90 days'),
     a as (select distinct user_id, (occurred_at at time zone city_tz(city))::date as d from events where user_id is not null and occurred_at > now() - interval '121 days')
select u.id as user_id, u.city, u.d0 as signup_day, date_trunc('week', u.d0)::date as signup_week,
       case when u.d0 + 1  <= city_today(u.city) then exists (select 1 from a where a.user_id=u.id and a.d=u.d0 + 1)  end as d1,
       case when u.d0 + 7  <= city_today(u.city) then exists (select 1 from a where a.user_id=u.id and a.d=u.d0 + 7)  end as d7,
       case when u.d0 + 30 <= city_today(u.city) then exists (select 1 from a where a.user_id=u.id and a.d=u.d0 + 30) end as d30
from u;

create or replace view v_invite_outcomes as
select i.id as invite_id, i.from_user, i.to_user, i.created_at, i.status, i.game_id,
       i.status in ('accepted','declined','expired') as decided,
       case when i.status in ('accepted','declined') then extract(epoch from (i.responded_at - i.created_at))/60 end as reply_minutes,
       exists (select 1 from v_counted_games a join v_counted_games b on b.game_id=a.game_id
                where a.user_id=i.from_user and b.user_id=i.to_user and a.starts_at < i.created_at) as played_before
from invites i;

create or replace view v_level_stuck as
with lv(level, games, attend, rate, givers) as (values (3, 50, 0.90, 0.5, 10), (4, 100, 0.95, 0.667, 25), (5, 200, 0.98, 0.667, 50)),
st as (select u.id as user_id, u.level,
         (select count(*) from v_counted_games c where c.user_id=u.id) as played,
         (select count(*) from v_confirmed_noshow n where n.user_id=u.id) as noshow_all,
         (select count(*) from v_confirmed_noshow n where n.user_id=u.id and n.starts_at > now() - interval '90 days') as noshow_90,
         exists (select 1 from reports r where r.target_type='user' and r.target_id=u.id::text and r.status='actioned' and r.created_at > now() - interval '180 days') as report_6m,
         coalesce(k.level_rate, 0.25) as rate, coalesce(k.kudos, 0) as givers
       from users u left join user_kudos_v2 k on k.user_id=u.id)
select st.user_id, lv.level as target_level, st.played,
       st.rate < lv.rate as low_rate, st.givers < lv.givers as low_givers,
       st.played::numeric / nullif(st.played + st.noshow_all, 0) < lv.attend as low_attend,
       case when lv.level = 3 then st.noshow_90 >= 4 else st.noshow_90 >= 2 end as noshow_cap,   -- 近 90 天爽约 ≥2 最高 Lv3，≥4 最高 Lv2
       lv.level = 5 and st.report_6m as recent_report
from st join lv on st.played >= lv.games and st.level < lv.level;

create or replace function entry_sources(p_from timestamptz, p_to timestamptz)
returns table(device text, entry text, sessions bigint, people bigint) language sql stable set search_path = ref, public as $$
  select coalesce(device,'unknown'), coalesce(props->>'entry','direct'), count(*), count(distinct coalesce(user_id::text, anon_id))
  from events where event='session_start' and occurred_at >= p_from and occurred_at < p_to group by 1, 2
$$;

create or replace function game_view_via(p_from timestamptz, p_to timestamptz)
returns table(device text, via text, views bigint, people bigint) language sql stable set search_path = ref, public as $$
  select coalesce(device,'unknown'), coalesce(props->>'via','other'), count(*), count(distinct coalesce(user_id::text, anon_id))
  from events where event='game_view' and occurred_at >= p_from and occurred_at < p_to group by 1, 2
$$;

create or replace function page_traffic(p_from timestamptz, p_to timestamptz)
returns table(device text, screen text, views bigint, visitors bigint, avg_seconds numeric) language sql stable set search_path = ref, public as $$
  select coalesce(e.device,'unknown'), e.props->>'screen',
    count(*) filter (where e.event='page_view'),
    count(distinct coalesce(e.user_id::text, e.anon_id)) filter (where e.event='page_view'),
    round(avg((e.props->>'ms')::numeric) filter (where e.event='page_time')/1000, 1)
  from events e
  where e.occurred_at >= p_from and e.occurred_at < p_to and e.event in ('page_view','page_time')
  group by 1, 2
$$;

create or replace function card_views(p_from timestamptz, p_to timestamptz)
returns table(user_id uuid, views bigint, from_outside bigint, external_landings bigint, viewers bigint) language sql stable set search_path = ref, public as $$
  select (e.props->>'target_uid')::uuid, count(*),
    count(*) filter (where e.props->>'via' in ('link','share_link','external')),
    count(*) filter (where e.props->>'via' in ('link','external')),
    count(distinct coalesce(e.user_id::text, e.anon_id))
  from events e
  where e.event='card_view' and coalesce((e.props->>'own')::boolean,false) = false
    and e.props->>'target_uid' ~ '^[0-9a-f-]{36}$'
    and e.occurred_at >= p_from and e.occurred_at < p_to
  group by 1
$$;

create or replace function env_usage(p_from timestamptz, p_to timestamptz)
returns table(env text, device text, sessions bigint, people bigint, avg_seconds numeric) language sql stable set search_path = ref, public as $$
  select s.env, s.device, count(*), count(distinct coalesce(s.user_id::text, s.anon_id)),
    round(avg(extract(epoch from (s.ended_at - s.started_at))))
  from sessions s where s.started_at >= p_from and s.started_at < p_to
  group by 1, 2
$$;

create or replace function device_compare(p_from timestamptz, p_to timestamptz)
returns table(device text, active_people bigint, signups bigint, games bigint, applications bigint, fill_rate numeric) language sql stable set search_path = ref, public as $$
  with d(device) as (values ('mobile'), ('desktop'))
  select d.device,
    (select count(distinct coalesce(e.user_id::text, e.anon_id)) from events e where e.device=d.device and e.occurred_at >= p_from and e.occurred_at < p_to),
    (select count(*) from events e where e.event='signup_complete' and e.device=d.device and e.occurred_at >= p_from and e.occurred_at < p_to),
    (select count(*) from games g where g.visibility='public' and g.created_device=d.device and g.created_at >= p_from and g.created_at < p_to),
    (select count(*) from game_participants p where p.role='player' and p.device=d.device and p.created_at >= p_from and p.created_at < p_to),
    (select round(count(*) filter (where f.full_at_start)::numeric / nullif(count(*),0), 3)
       from v_game_fill f join games g on g.id=f.game_id where g.created_device=d.device and f.starts_at >= p_from and f.starts_at < p_to)
  from d
$$;

create or replace function inapp_handoff_funnel(p_from timestamptz, p_to timestamptz)
returns table(env text, inapp_users bigint, moved bigint, acted bigint) language sql stable set search_path = ref, public as $$
  with a as (select s.env, s.user_id, min(s.started_at) as t0 from sessions s
              where s.env in ('wechat','xhs') and s.user_id is not null and s.started_at >= p_from and s.started_at < p_to group by 1, 2),
  m as (select a.*, (select min(s.started_at) from sessions s where s.user_id=a.user_id and s.started_at > a.t0
                      and coalesce(s.env,'') not in ('wechat','xhs','ig_fb')) as t1 from a)
  select m.env, count(*), count(*) filter (where m.t1 is not null),
         count(*) filter (where m.t1 is not null and (
            exists (select 1 from game_participants p where p.user_id=m.user_id and p.role='player' and p.created_at > m.t1)
            or exists (select 1 from games g where g.host_id=m.user_id and g.created_at > m.t1)))
  from m group by m.env
$$;

create or replace function notification_route(p_from timestamptz, p_to timestamptz)
returns table(channel text, reason text, device text, notifications bigint, opened bigint, go_extra bigint) language sql stable set search_path = ref, public as $$
  with f as (select distinct on (d.notification_id) d.notification_id, d.channel, d.reason, d.at, ud.platform
               from notification_deliveries d left join user_devices ud on ud.id=d.device_id
              where d.reason is distinct from 'go_kind' order by d.notification_id, d.at, d.id)
  select f.channel, f.reason, f.platform, count(*), count(*) filter (where n.read_at is not null),
         count(*) filter (where exists (select 1 from notification_deliveries g where g.notification_id=n.id and g.reason='go_kind'))
  from f join notifications n on n.id=f.notification_id
  where f.at >= p_from and f.at < p_to group by 1, 2, 3
$$;

reset search_path;
