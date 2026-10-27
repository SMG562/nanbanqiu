-- 第四批 4d：造「上线一年」的数据量（按原型模拟的增长外推，:scale = 1 时约：球友 1.2 万、球局 5 万、申请 15 万、
--   通知 115 万、会话 150 万、事件 750 万；最近 30 天的量约是原型模拟外推到一年后的 1–3 倍，留了余量）。只用于测速度：数字分布大致合理即可，约束都满足。
--   用 session_replication_role = replica 跳过触发器批量写入（状态由这里直接给出、保持一致），写完 ANALYZE。
\set ON_ERROR_STOP 1
set session_replication_role = replica;
set synchronous_commit = off;
set max_parallel_workers_per_gather = 0;   -- 并行时各进程的随机数不同，数据量会每次不一样
select setseed(0.4242);

-- 过去 13 个月的事件分区（schema 只预建了 2026-10 起的月份）
do $$ declare m date := date_trunc('month', now() - interval '13 months')::date;
begin
  while m < date '2026-10-01' loop
    execute format('create table if not exists %I partition of events for values from (%L) to (%L)', 'events_' || to_char(m, 'YYYY_MM'), m::text || ' 00:00+00', (m + interval '1 month')::date::text || ' 00:00+00');
    m := (m + interval '1 month')::date;
  end loop; end $$;

create temp table P as select :scale::numeric as s;

insert into suburbs(name, postcode, centroid)
select 'Suburb ' || i, (3000 + i)::text, ('POINT(' || (144.8 + random() * 0.5) || ' ' || (-37.95 + random() * 0.3) || ')')::geography from generate_series(1, 60) i
on conflict do nothing;
insert into venues(id, name, short_name, suburb, postcode, location, surfaces, status)
select gen_random_uuid(), 'Venue ' || i, 'V' || i, 'Suburb ' || (1 + i % 60), (3000 + 1 + i % 60)::text, ('POINT(' || (144.8 + random() * 0.5) || ' ' || (-37.95 + random() * 0.3) || ')')::geography, '{hard}', case when i % 25 = 0 then 'pending' else 'active' end
from generate_series(1, 300) i;
create temp table V as select id, row_number() over () as n from venues where status = 'active';

-- 球友：越接近现在注册的越多
insert into users(id, phone_e164, nickname, utr, gender, created_at, level, signup_source, installed_at, last_active_at)
select gen_random_uuid(), '+6141' || lpad(i::text, 7, '0'), 'P' || i, round((2 + random() * 8)::numeric, 1), case when random() < .3 then 'f' else 'm' end,
       now() - interval '365 days' * power(random(), 1.7), case when random() < .25 then 2 else 1 end, (array['wechat','xhs','direct','share'])[1 + floor(random() * 4)::int],
       case when random() < .3 then now() - interval '200 days' * random() end, now() - interval '30 days' * random()
from generate_series(1, (12000 * (select s from P))::int) i;
create temp table UU as select id, created_at, row_number() over (order by created_at) as n from users;
create index on UU(n);
create temp table NU as select count(*)::int as n from UU;
insert into user_suburb_picks(user_id, suburb, postcode, picked_at) select id, 'Suburb ' || (1 + n % 60), (3000 + 1 + n % 60)::text, created_at from UU;
insert into user_devices(user_id, platform, push_endpoint, last_active_at, created_at)
select id, case when random() < .78 then 'mobile' else 'desktop' end, case when random() < .4 then 'https://push/' || n end, now() - interval '20 days' * random(), created_at from UU;

-- 球局：开打时间 6:00–21:30 的整点 / 半点；随用户增长
insert into games(id, share_code, host_id, venue_id, starts_at, duration_min, game_type, capacity, utr_min, utr_max, created_device, created_at, visibility, status, cancelled_at, filled, tags, join_mode)
select gen_random_uuid(), 'p' || i, u.id, v.id, st, 90, gt, case gt when 'doubles' then 4 else 2 end, 3, 7, case when random() < .7 then 'mobile' else 'desktop' end, ca,
       case when random() < .9 then 'public' else 'private' end,
       case when cx then 'cancelled'::game_status when st + interval '90 minutes' < now() then 'completed' else 'open' end, case when cx then ca + (st - ca) * random() end, 0, '{}', 'approve'
from (select i, ca, ((date_trunc('day', (ca + interval '1 day' * floor(random() * 6)) at time zone 'Australia/Melbourne') + interval '30 minutes' * (12 + floor(random() * 32))) at time zone 'Australia/Melbourne') as st,
             (array['singles','doubles','rally']::game_type[])[1 + floor(random() * 3)::int] as gt, random() < .08 as cx, 1 + floor(random() * (select n from NU))::int as un, 1 + floor(random() * 280)::int as vn
        from (select i, now() - interval '365 days' * power(random(), 1.6) as ca from generate_series(1, (50000 * (select s from P))::int) i) a) x
join UU u on u.n = x.un join V v on v.n = x.vn
where x.st > x.ca;
insert into game_participants(game_id, user_id, role, status, decided_at, device, created_at, approved_at)
select id, host_id, 'host', 'approved', created_at, created_device, created_at, created_at from games;
-- 申请：每局平均约 3 条
insert into game_participants(game_id, user_id, role, status, decided_at, left_at, device, created_at, decline_reason, approved_at, via)
select g.id, u.id, 'player', s.st, case when s.st <> 'pending' then a.ca + interval '30 minutes' end, case when s.st in ('left','withdrawn') then a.ca + interval '2 hours' end,
       case when random() < .75 then 'mobile' else 'desktop' end, a.ca,
       case s.st when 'rejected' then (array['known','level','pass','full_auto'])[1 + floor(random() * 4)::int] when 'expired' then 'timeout' end,
       case when s.st in ('approved','left') then a.ca + interval '30 minutes' end, 'request'
from games g
cross join lateral (select k, g.created_at + (g.starts_at - g.created_at) * random() * .9 as ca, 1 + floor(random() * (select n from NU))::int as un from generate_series(1, 1 + floor(random() * 5 + 0 * extract(epoch from g.created_at))::int) k) a   -- 引用外层，每局各抽一次
join UU u on u.n = a.un and u.id <> g.host_id
cross join lateral (select (case when g.starts_at > now() and random() < .3 then 'pending' else (array['approved','approved','approved','rejected','expired','withdrawn','left'])[1 + floor(random() * 7)::int] end)::part_status as st) s
where g.visibility = 'public'
on conflict do nothing;
-- 状态和名额对齐：超过名额的通过改成满员自动结束；满员的局标 full
with r as (select game_id, user_id, row_number() over (partition by game_id order by created_at) rn, (select capacity from games g where g.id = p.game_id) cap from game_participants p where status = 'approved' and role = 'player')
update game_participants p set status = 'rejected', decline_reason = 'full_auto', approved_at = null from r where r.game_id = p.game_id and r.user_id = p.user_id and r.rn > r.cap - 1;
update games g set status = 'full' where status = 'open' and (select count(*) from game_participants p where p.game_id = g.id and p.status = 'approved') >= capacity;
update game_participants p set status = 'rejected', decline_reason = 'full_auto' from games g where g.id = p.game_id and g.status = 'full' and p.status = 'pending';
update game_participants p set status = 'rejected', decline_reason = 'pass' from games g where g.id = p.game_id and g.status = 'cancelled' and p.status = 'pending';
insert into game_start_checks(game_id, checked_at, need, filled) select id, starts_at, capacity, (select count(*) from game_participants p where p.game_id = g.id and p.status = 'approved') from games g where starts_at < now() and status <> 'cancelled';

-- 邀约
insert into invites(from_user, to_user, starts_at, ends_at, venue_id, game_type, status, created_at, responded_at, expires_at)
select a.id, b.id, x.ca + interval '2 days', x.ca + interval '2 days 90 minutes', (select id from V where n = 1 + (x.i % 280)), 'singles',
       (array['accepted','declined','expired','pending'])[1 + floor(random() * 4)::int]::invite_status, x.ca, x.ca + interval '3 hours', x.ca + interval '48 hours'
from (select i, now() - interval '365 days' * power(random(), 1.6) as ca, 1 + floor(random() * (select n from NU))::int ua, 1 + floor(random() * (select n from NU))::int ub from generate_series(1, (20000 * (select s from P))::int) i) x
join UU a on a.n = x.ua join UU b on b.n = x.ub where a.id <> b.id
on conflict do nothing;
update invites set status = 'expired' where status = 'pending' and created_at < now() - interval '48 hours';

-- 打完之后
insert into impressions(game_id, from_id, to_id, kinds, created_at)
select a.game_id, a.user_id, b.user_id, '{ontime}', g.starts_at + interval '3 hours'
from game_participants a join game_participants b on b.game_id = a.game_id and b.user_id <> a.user_id and b.status = 'approved' join games g on g.id = a.game_id
where a.status = 'approved' and g.status = 'completed' and random() < .3 on conflict do nothing;
insert into player_prefs(user_id, target_id, pref, game_id, updated_at)
select a.user_id, b.user_id, case when random() < .85 then 'more' else 'less' end, a.game_id, g.starts_at + interval '3 hours'
from game_participants a join game_participants b on b.game_id = a.game_id and b.user_id <> a.user_id and b.status = 'approved' join games g on g.id = a.game_id
where a.status = 'approved' and g.status = 'completed' and random() < .2 on conflict do nothing;
insert into game_feel(game_id, user_id, feel, closed_at)
select p.game_id, p.user_id, (array['hard','ok','easy'])[1 + floor(random() * 3)::int], g.starts_at + interval '3 hours'
from game_participants p join games g on g.id = p.game_id where p.status = 'approved' and g.status = 'completed' and random() < .4;
insert into noshow_reports(game_id, target_id, reporter_id, created_at)
select a.game_id, b.user_id, a.user_id, g.starts_at + interval '5 hours'
from game_participants a join game_participants b on b.game_id = a.game_id and b.user_id <> a.user_id and b.status = 'approved' join games g on g.id = a.game_id
where a.status = 'approved' and a.role = 'host' and g.status = 'completed' and random() < .02 on conflict do nothing;
insert into reports(reporter_id, target_type, target_id, reason, source, via, created_at, status)
select a.id, 'user', b.id::text, 'harass', 'in_app', 'card', now() - interval '365 days' * random(), case when random() < .1 then 'open' else 'actioned' end
from (select 1 + floor(random() * (select n from NU))::int ua, 1 + floor(random() * (select n from NU))::int ub from generate_series(1, (2000 * (select s from P))::int)) x join UU a on a.n = x.ua join UU b on b.n = x.ub where a.id <> b.id;

-- 通知与送达
insert into notifications(user_id, kind, game_id, created_at, read_at)
select p.user_id, (array['request','approved','soon','recap','rejected','full','changed','follow_game']::notif_kind[])[1 + floor(random() * 8)::int], p.game_id, p.created_at + interval '1 minute', case when random() < .55 then p.created_at + interval '20 minutes' end
from game_participants p cross join generate_series(1, 6) k where random() < .9;
insert into notification_deliveries(notification_id, channel, reason, at)
select id, (array['in_app','push_mobile','push_mobile','push_desktop','email','none'])[1 + floor(random() * 6)::int], 'mobile_first', created_at from notifications;

-- 会话与事件（事件是最大的表）：每个会话平均 7 个事件
create temp table SS as
select 's' || i as sid, 'a' || (1 + floor(random() * (select n from NU) * 1.6)::int) as anon, x.t0, x.un,
       case when random() < .75 then 'mobile' else 'desktop' end as dev, case when random() < .35 then 'pwa' else 'web' end as build,
       (array['pwa_ios','wechat','xhs','safari_ios','chrome_android','desk_chrome'])[1 + floor(random() * 6)::int] as env
from (select i, now() - interval '365 days' * power(random(), 1.5) as t0, case when random() < .72 then 1 + floor(random() * (select n from NU))::int end as un from generate_series(1, (1200000 * (select s from P))::int) i) x;
insert into sessions(session_id, anon_id, user_id, build, device, started_at, last_event_at, ended_at, standalone, env, events_n)
select sid, anon, u.id, build, dev, t0, t0 + interval '6 minutes', t0 + interval '6 minutes', env = 'pwa_ios', env, 7 from SS left join UU u on u.n = SS.un;
insert into events(occurred_at, user_id, anon_id, session_id, build, event, screen, game_id, device, env, props)
select SS.t0 + interval '50 seconds' * k, u.id, SS.anon, SS.sid, SS.build, e.ev, e.scr, null, SS.dev, SS.env, e.props
from SS left join UU u on u.n = SS.un
cross join lateral generate_series(0, 2 + floor(random() * 9 + 0 * length(SS.sid))::int) k   -- 引用外层的列，每个会话各抽一次（否则数据库会把结果缓存复用）
cross join lateral (select case when k = 0 and SS.sid is not null then 'session_start' else (array['page_view','page_view','page_time','game_view','card_view','game_select','chat_open','notif_open'])[1 + floor(random() * 8)::int] end as ev,
                           1 + floor(random() * (select n from NU))::int as tn) e0
cross join lateral (select e0.ev, case when e0.ev in ('page_view','page_time') and SS.sid is not null then (array['disc','mine','me','card'])[1 + floor(random() * 4)::int] end as scr,
   case when SS.sid is null then null::jsonb else case e0.ev when 'session_start' then jsonb_build_object('entry', (array['direct','push','share','external'])[1 + floor(random() * 4)::int])
              when 'page_view' then jsonb_build_object('screen', (array['disc','mine','me','card'])[1 + floor(random() * 4)::int])
              when 'page_time' then jsonb_build_object('screen', 'disc', 'ms', floor(random() * 60000))
              when 'game_view' then jsonb_build_object('via', (array['list','map','notif','link'])[1 + floor(random() * 4)::int])
              when 'card_view' then jsonb_build_object('via', 'detail', 'target_uid', (select id from UU where n = e0.tn)::text)
              else '{}'::jsonb end end as props) e;
insert into link_visits(game_id, source, env, visitor_id, user_id, created_at)
select g.id, (array['wechat','xhs','copy'])[1 + floor(random() * 3)::int], 'wechat', 'v' || i, case when random() < .2 then g.host_id end, g.created_at + interval '1 hour'
from (select i, 1 + floor(random() * 40000)::int as gn from generate_series(1, (100000 * (select s from P))::int) i) x join (select id, host_id, created_at, row_number() over () n from games) g on g.n = x.gn;

-- 提醒的第一去向（上线后由送达记录的触发器写；批量写入时触发器关着，这里补）
update notifications n set first_at = f.at, first_channel = f.channel, first_reason = f.reason, first_device = f.device_id
  from (select distinct on (notification_id) notification_id, at, channel, reason, device_id from notification_deliveries
         where reason is distinct from 'go_kind' order by notification_id, at, id) f
 where f.notification_id = n.id;
-- 每晚的汇总任务：把今天之前的每一天都汇总一遍（daily_people、daily_card_views）
select sum(rollup_people(d::date)) as rolled from generate_series((now() at time zone 'Australia/Melbourne')::date - 400, (now() at time zone 'Australia/Melbourne')::date - 1, interval '1 day') d;
-- 每日汇总（上线后由每晚的任务写；这里一次算好）
insert into daily_metrics(day, metric, dims, value, additive)
select (occurred_at at time zone 'Australia/Melbourne')::date, 'events', jsonb_build_object('device', device), count(*), true from events group by 1, 3
union all select (occurred_at at time zone 'Australia/Melbourne')::date, 'dau', '{}', count(distinct coalesce(user_id::text, anon_id)), false from events group by 1
union all select (created_at at time zone 'Australia/Melbourne')::date, 'new_users', '{}', count(*), true from users group by 1
union all select (created_at at time zone 'Australia/Melbourne')::date, 'games_created', '{}', count(*), true from games group by 1;

set session_replication_role = origin;
analyze;
select (select count(*) from users) users, (select count(*) from games) games, (select count(*) from game_participants) parts, (select count(*) from notifications) notifs,
       (select count(*) from sessions) sessions, (select count(*) from events) events, pg_size_pretty(pg_database_size(current_database())) db_size;
