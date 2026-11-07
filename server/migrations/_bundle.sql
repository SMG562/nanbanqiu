-- 自动拼接，别手改：node tools/migrate_bundle.mjs
-- ===== 20261103_schema_migrations.sql =====
-- 建迁移记录表，并把「已确认执行过」的迁移补记上（20261030 你跑过；其余 11-02 / 11-03 那几个是否执行过不确定，以各自文件末尾自己记的那一行为准）。可重复运行。
-- 迁移记录（11-03）：每个迁移文件结尾保证记录表存在并记一行自己；/api/version 会报「库里执行到哪一版」，冒烟测试核对它等于代码里最新的迁移。
create table if not exists schema_migrations (version text primary key, applied_at timestamptz not null default now());
alter table schema_migrations enable row level security;
drop policy if exists svc_all on schema_migrations; create policy svc_all on schema_migrations to nbq_service using (true) with check (true);
grant select, insert on schema_migrations to nbq_service;
insert into schema_migrations(version) values ('20261030_register_and_wechat'), ('20261103_schema_migrations') on conflict do nothing;

-- ===== 20261102_apply_rate_loosen.sql =====
-- 申请 + 直接加入频率放宽：每小时 5→10 次，每天 15→30 次（同一局每天 3 次不变）。可重复运行。
update rate_rules set max_hits = 10, note = '申请 + 直接加入：每小时 10 次' where rule = 'apply_hour';
update rate_rules set max_hits = 30, note = '申请 + 直接加入：每天 30 次' where rule = 'apply_day';

-- 迁移记录（11-03）：每个迁移文件结尾保证记录表存在并记一行自己；/api/version 会报「库里执行到哪一版」，冒烟测试核对它等于代码里最新的迁移。
create table if not exists schema_migrations (version text primary key, applied_at timestamptz not null default now());
alter table schema_migrations enable row level security;
drop policy if exists svc_all on schema_migrations; create policy svc_all on schema_migrations to nbq_service using (true) with check (true);
grant select, insert on schema_migrations to nbq_service;
insert into schema_migrations(version) values ('20261102_apply_rate_loosen') on conflict do nothing;

-- ===== 20261102_game_rate_loosen.sql =====
-- 发局频率放宽：每天 3→5 个（进行中最多 5 个不变；取消的也算今天发的）。可重复运行。
update rate_rules set max_hits = 5, note = '发局：每天 5 个' where rule = 'game_day';

-- 迁移记录（11-03）：每个迁移文件结尾保证记录表存在并记一行自己；/api/version 会报「库里执行到哪一版」，冒烟测试核对它等于代码里最新的迁移。
create table if not exists schema_migrations (version text primary key, applied_at timestamptz not null default now());
alter table schema_migrations enable row level security;
drop policy if exists svc_all on schema_migrations; create policy svc_all on schema_migrations to nbq_service using (true) with check (true);
grant select, insert on schema_migrations to nbq_service;
insert into schema_migrations(version) values ('20261102_game_rate_loosen') on conflict do nothing;

-- ===== 20261102_no_night_quiet.sql =====
-- 取消夜间不打扰（11-02 你定的）：所有城市的开始 = 结束 = 0 点，代码里「夜间」判断永远不成立，通知随时推。可重复运行。
-- 想恢复：update cities set quiet_start = '22:00', quiet_end = '08:00';
update cities set quiet_start = '00:00', quiet_end = '00:00';
-- 之前被顺延到早上 8 点、还没发出的通知：现在就放行（过时的发送程序会自动略过）
update notifications set send_after = now() where pushed_at is null and send_after > now();

-- 迁移记录（11-03）：每个迁移文件结尾保证记录表存在并记一行自己；/api/version 会报「库里执行到哪一版」，冒烟测试核对它等于代码里最新的迁移。
create table if not exists schema_migrations (version text primary key, applied_at timestamptz not null default now());
alter table schema_migrations enable row level security;
drop policy if exists svc_all on schema_migrations; create policy svc_all on schema_migrations to nbq_service using (true) with check (true);
grant select, insert on schema_migrations to nbq_service;
insert into schema_migrations(version) values ('20261102_no_night_quiet') on conflict do nothing;

-- ===== 20261103_avatar_coral_to_paper.sql =====
-- 把「默认印色 coral」的老用户改回纸白（paper）。可重复运行。
-- 为什么安全：之前前台改印色只改内存、从没写到数据库（11-03 才补上保存），所以库里的 coral 只能是旧默认值（schema 里默认被误写成 coral）留下的，
-- 没有任何人是「自己选了 coral」。新版本印色色板里也没有 coral。
update users set avatar_color = 'paper' where avatar_color = 'coral';
create table if not exists schema_migrations (version text primary key, applied_at timestamptz not null default now());
alter table schema_migrations enable row level security;
drop policy if exists svc_all on schema_migrations; create policy svc_all on schema_migrations to nbq_service using (true) with check (true);
grant select, insert on schema_migrations to nbq_service;
insert into schema_migrations(version) values ('20261103_avatar_coral_to_paper') on conflict do nothing;

-- ===== 20261103_avatar_default_paper.sql =====
-- 新用户默认印色改回纸白（paper）。可重复运行。
-- 原因：schema.sql 里先建表时默认 paper，后面一条语句又把默认改成 coral，实际库里默认成了 coral；业务规则和接口注册（coalesce 'paper'）都是纸白。
-- 只改「以后新建用户」的默认，不动已有用户的颜色。
alter table users alter column avatar_color set default 'paper';
create table if not exists schema_migrations (version text primary key, applied_at timestamptz not null default now());
alter table schema_migrations enable row level security;
drop policy if exists svc_all on schema_migrations; create policy svc_all on schema_migrations to nbq_service using (true) with check (true);
grant select, insert on schema_migrations to nbq_service;
insert into schema_migrations(version) values ('20261103_avatar_default_paper') on conflict do nothing;

-- ===== 20261103_game_rate_calendar_day.sql =====
-- 发局频率改按墨尔本自然日算（0 点清零），不再是滚动 24 小时。可重复运行。
alter table rate_rules add column if not exists day_reset boolean not null default false;
create or replace function nbq_rate(p_subject text, p_grp text, p_key text default null) returns void
language plpgsql security definer set search_path = public as $$
declare r record; n int; t timestamptz; ws timestamptz;
begin
  perform pg_advisory_xact_lock(hashtext('rate:' || p_subject || ':' || p_grp));
  for r in select * from rate_rules where grp = p_grp and enabled order by win loop
    ws := case when r.day_reset then greatest(now() - r.win, mel_day_start(mel_today())) else now() - r.win end;
    select count(*) into n from rate_hits h where h.subject = p_subject and h.grp = p_grp and h.at > ws and (not r.per_key or h.key is not distinct from p_key);
    if n >= r.max_hits then
      if r.day_reset then perform nbq_err(r.code, greatest(1, ceil(extract(epoch from mel_day_start(mel_today() + 1) - now())))::int::text); end if;
      select h.at into t from rate_hits h where h.subject = p_subject and h.grp = p_grp and h.at > ws and (not r.per_key or h.key is not distinct from p_key)
       order by h.at offset n - r.max_hits limit 1;
      perform nbq_err(r.code, greatest(1, ceil(extract(epoch from t + r.win - now())))::int::text);
    end if;
  end loop;
  insert into rate_hits(subject, grp, key) values (p_subject, p_grp, p_key);
end $$;
update rate_rules set day_reset = true, note = '发局：每天 5 个（墨尔本自然日，0 点清零）' where rule = 'game_day';

-- 迁移记录（11-03）：每个迁移文件结尾保证记录表存在并记一行自己；/api/version 会报「库里执行到哪一版」，冒烟测试核对它等于代码里最新的迁移。
create table if not exists schema_migrations (version text primary key, applied_at timestamptz not null default now());
alter table schema_migrations enable row level security;
drop policy if exists svc_all on schema_migrations; create policy svc_all on schema_migrations to nbq_service using (true) with check (true);
grant select, insert on schema_migrations to nbq_service;
insert into schema_migrations(version) values ('20261103_game_rate_calendar_day') on conflict do nothing;

-- ===== 20261103_mail_default_off.sql =====
-- 11-03 你定的：提醒只推手机，邮件默认不发（用户自己打开才发）。可重复运行。
-- 1) 新默认 {}；2) 已有数据：把「正好等于旧默认（三类全开）」的改成 {}（旧默认是注册时自动给的，不是用户选的；用户自己关掉过某类的保持原样）。
alter table users alter column email_prefs set default '{}';
update users set email_prefs = '{}'::jsonb where email_prefs = '{"request":true,"result":true,"change":true}'::jsonb;
create table if not exists schema_migrations (version text primary key, applied_at timestamptz not null default now());
alter table schema_migrations enable row level security;
drop policy if exists svc_all on schema_migrations; create policy svc_all on schema_migrations to nbq_service using (true) with check (true);
grant select, insert on schema_migrations to nbq_service;
insert into schema_migrations(version) values ('20261103_mail_default_off') on conflict do nothing;

-- ===== 20261103_my_push_diag.sql =====
-- 推送自检：本人设备订阅状态 + 最近提醒的去向。可重复运行。
-- 推送自检（11-03）：本人的设备订阅状态 + 最近 8 条提醒各自去了哪（送达记录）。只读、只看自己的；endpoint 只用来标出「这台设备」，不返回
create or replace function my_push_diag(p_endpoint text default null) returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'now', now(),
    'devices', coalesce((select jsonb_agg(jsonb_build_object('platform', ud.platform, 'push', ud.push_endpoint is not null,
        'this', p_endpoint is not null and ud.push_endpoint = p_endpoint, 'push_ok_at', ud.push_ok_at, 'last_active_at', ud.last_active_at, 'created_at', ud.created_at)
        order by ud.last_active_at desc nulls last, ud.created_at desc) from user_devices ud where ud.user_id = nbq_me()), '[]'::jsonb),
    'recent', coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from (
        select n.id::text as id, n.kind::text as kind, n.created_at, n.read_at,
               coalesce((select jsonb_agg(jsonb_build_object('channel', d.channel, 'reason', d.reason, 'at', d.at, 'platform', u2.platform) order by d.at, d.id)
                           from notification_deliveries d left join user_devices u2 on u2.id = d.device_id where d.notification_id = n.id), '[]'::jsonb) as deliveries
          from notifications n where n.user_id = nbq_me() order by n.created_at desc limit 8) x), '[]'::jsonb))
$$;
revoke execute on function my_push_diag(text) from public;
grant execute on function my_push_diag(text) to nbq_user;

-- 迁移记录（11-03）：每个迁移文件结尾保证记录表存在并记一行自己；/api/version 会报「库里执行到哪一版」，冒烟测试核对它等于代码里最新的迁移。
create table if not exists schema_migrations (version text primary key, applied_at timestamptz not null default now());
alter table schema_migrations enable row level security;
drop policy if exists svc_all on schema_migrations; create policy svc_all on schema_migrations to nbq_service using (true) with check (true);
grant select, insert on schema_migrations to nbq_service;
insert into schema_migrations(version) values ('20261103_my_push_diag') on conflict do nothing;

-- ===== 20261104_badges_server.sql =====
-- 徽章接服务器（11-04）：获得记录和「已庆祝」存在 user_badges（原来前台只存内存，刷新就重复庆祝）。可重复运行。
-- 徽章规则在前台（0070-游戏化规则.js）：前台算出新获得的 → api_badges_claim 记一笔（只收白名单里的 12 个 code，已有的不改）；
-- 看过庆祝动画 → api_badge_seen 记 seen_at（只改自己的、只记一次）。读：GET /api/me/badges（RLS 只能读自己的）。
create or replace function api_badges_claim(p_codes text[]) returns void language plpgsql security definer set search_path = public as $$
declare u uuid := nbq_me();
begin
  if p_codes is null or coalesce(array_length(p_codes, 1), 0) > 20 then perform nbq_err('invalid', 'codes'); end if;
  insert into user_badges (user_id, code)
    select distinct u, c from unnest(p_codes) c
    where c = any (array['first','ten','fifty','hundred','host10','night','early','surface','explorer','streak','kudos','partner'])
  on conflict (user_id, code) do nothing;
end $$;
create or replace function api_badge_seen(p_code text) returns void language plpgsql security definer set search_path = public as $$
declare u uuid := nbq_me();
begin
  update user_badges set seen_at = coalesce(seen_at, now()) where user_id = u and code = p_code;
end $$;
grant execute on function api_badges_claim(text[]), api_badge_seen(text) to nbq_user;
insert into schema_migrations(version) values ('20261104_badges_server') on conflict do nothing;

-- ===== 20261104_chat_notify.sql =====
-- 新消息通知：收到私信 / 球局群聊消息推送到手机（11-04）。可重复运行。
-- 1) 通知类型 chat；2) notifications.thread_id；3) 发消息时生成通知（nbq_chat_notify）；4) 打开会话时标已读（api_chat_notif_read）。
alter type notif_kind add value if not exists 'chat';
-- ---------- 新消息通知（11-04）：收到私信 / 球局群聊消息，推送到手机 ----------
-- chat 通知带 thread_id（点推送直接打开那个会话），不带 game_id（球局开打后聊天还能继续 48 小时，带了会被当成「球局已开打」而不推）。
-- 规则：屏蔽的不通知；对方把我设成「少遇到」不通知（同局开打前 24 小时到结束后 2 小时除外）；同一会话里上一条还没读、且 5 分钟内已通知过 → 不再重复通知；
--       打开会话（thread read）时把这个会话的 chat 通知标成已读（发送程序推送前发现已读就不推）。
alter table notifications add column if not exists thread_id uuid references threads(id) on delete cascade;
create index if not exists notif_chat_idx on notifications(user_id, thread_id, created_at desc);   -- 不加 where kind='chat'：新枚举值在同一事务里不能用（Supabase SQL 编辑器整段是一个事务，报 55P04）
create or replace function nbq_chat_notify(p_thread uuid, p_sender uuid) returns void language plpgsql security definer set search_path = public as $$
declare th threads; r record;
begin
  select * into th from threads where id = p_thread;
  if not found then return; end if;
  for r in
    select case when th.user_a = p_sender then th.user_b else th.user_a end as uid where th.kind = 'dm'
    union
    select gp.user_id from game_participants gp where th.kind = 'game' and gp.game_id = th.game_id and gp.status = 'approved' and gp.user_id <> p_sender
  loop
    continue when r.uid is null or is_blocked(p_sender, r.uid);
    if exists (select 1 from player_prefs where user_id = r.uid and target_id = p_sender and pref = 'less')
       and not exists (select 1 from games g
                         join game_participants a on a.game_id = g.id and a.user_id = p_sender and a.status = 'approved'
                         join game_participants b on b.game_id = g.id and b.user_id = r.uid and b.status = 'approved'
                        where now() between g.starts_at - interval '24 hours' and g.starts_at + make_interval(mins => g.duration_min) + interval '2 hours') then
      continue;
    end if;
    continue when exists (select 1 from notifications where user_id = r.uid and kind = 'chat' and thread_id = p_thread and read_at is null and created_at > now() - interval '5 minutes');
    insert into notifications(user_id, kind, actor_id, thread_id) values (r.uid, 'chat', p_sender, p_thread);
  end loop;
end $$;
revoke execute on function nbq_chat_notify(uuid, uuid) from public;
create or replace function api_chat_notif_read(p_thread uuid) returns void language plpgsql security definer set search_path = public as $$   -- 必须 plpgsql：language sql 建函数时就解析 'chat'，新枚举值同一事务里不能用（55P04）
begin
  update notifications set read_at = now() where user_id = nbq_me() and kind = 'chat' and thread_id = p_thread and read_at is null;
end $$;
revoke execute on function api_chat_notif_read(uuid) from public;
grant execute on function api_chat_notif_read(uuid) to nbq_user;

create or replace function api_message_send(p_thread uuid, p_body text) returns bigint language plpgsql security definer set search_path = public as $$
declare u uuid := nbq_me(); th threads; other uuid; m bigint;
begin
  select * into th from threads where id = p_thread;
  if not found or not thread_member(p_thread, u) then perform nbq_err('forbidden'); end if;
  other := case when th.kind = 'dm' then case when th.user_a = u then th.user_b else th.user_a end end;
  -- 球局群聊在开打 48 小时后关闭（只读）
  if th.kind = 'game' and (select starts_at from games where id = th.game_id) < now() - interval '48 hours' then perform nbq_err('chat_closed'); end if;
  perform nbq_gate('chat', other);
  if other is not null and is_blocked(u, other) then perform nbq_err('blocked'); end if;
  if p_body is null or char_length(btrim(p_body)) = 0 or char_length(p_body) > 200 then perform nbq_err('invalid', 'body'); end if;
  if p_body ~* '(https?://|www\.|[a-z0-9-]+\.(com|net|org|au|cn|io|me|co)(\M|/))' then perform nbq_err('message_link'); end if;
  -- 频率（⑭）：注册 7 天内，主动和没一起打过球的人开始聊天每天 3 位；每分钟 10 条
  if other is not null and not exists (select 1 from messages where thread_id = p_thread)
     and (select created_at from users where id = u) > now() - interval '7 days' and not nbq_played_together(u, other) then
    perform nbq_rate(u::text, 'dm_new', other::text);
  end if;
  perform nbq_rate(u::text, 'message');
  insert into messages(thread_id, sender_id, body) values (p_thread, u, p_body) returning id into m;
  insert into thread_reads(thread_id, user_id, last_read_at) values (p_thread, u, now())
  on conflict (thread_id, user_id) do update set last_read_at = now();
  perform nbq_chat_notify(p_thread, u);   -- 推送给对方 / 同局队友（规则见上）
  return m;
end $$;
create table if not exists schema_migrations (version text primary key, applied_at timestamptz not null default now());
alter table schema_migrations enable row level security;
drop policy if exists svc_all on schema_migrations; create policy svc_all on schema_migrations to nbq_service using (true) with check (true);
grant select, insert on schema_migrations to nbq_service;
insert into schema_migrations(version) values ('20261104_chat_notify') on conflict do nothing;

-- ===== 20261104_late_join.sql =====
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

-- ===== 20261105_admin_api.sql =====
-- 后台接口（/admin/api）的数据库部分（11-05，#27 第 1 步 PR-A）。可重复运行；纯新增，不改已有表、不动已有数据。
--   · 登录角色 nbq_admin_api：后台接口专用，NOINHERIT（连上来本身什么表都碰不到，必须 set local role 切成 nbq_admin / nbq_viewer 才有权限）；
--     不属于 nbq_service / nbq_user，所以后台接口的代码即使被利用，也拿不到前台接口那一套权限。
--     本迁移只建 NOLOGIN 的角色；开通登录和设密码由你手动做（密码不进仓库）：alter role nbq_admin_api login password '<强密码>';
--   · 登录前后只能调 6 个门禁函数（4 个已有 + 下面 2 个按 IP 限流）
--   · admin_login_attempts：只记失败的登录（含「邮箱不存在」，这种记不进 admin_audit_log，因为那里 admin_id 不能为空）
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'nbq_admin_api') then create role nbq_admin_api nologin noinherit; end if;
  alter role nbq_admin_api noinherit;
end $$;
grant nbq_admin to nbq_admin_api;
grant nbq_viewer to nbq_admin_api;
do $$ begin
  -- 前台接口那套权限一个都不能有（万一手动加过也收回）
  if pg_has_role('nbq_admin_api', 'nbq_service', 'member') then revoke nbq_service from nbq_admin_api; end if;
  if pg_has_role('nbq_admin_api', 'nbq_user', 'member') then revoke nbq_user from nbq_admin_api; end if;
end $$;
grant usage on schema public to nbq_admin_api;

create table if not exists admin_login_attempts (
  id  bigserial primary key,
  at  timestamptz not null default now(),
  ip  inet
);
create index if not exists admin_login_attempts_ip_at on admin_login_attempts (ip, at desc);
create index if not exists admin_login_attempts_at on admin_login_attempts (at);
alter table admin_login_attempts enable row level security;   -- 不建任何策略 = 只有下面两个定义者函数能碰
revoke all on admin_login_attempts from public, anon, authenticated, nbq_user, nbq_service, nbq_admin, nbq_viewer, nbq_admin_api;

-- 登录前：这个 IP 最近 15 分钟失败 ≥ 20 次就拒绝（rate_limited，detail = 还要等几秒）；在算 scrypt 之前调用，挡住拿登录接口耗 CPU 的刷法
create or replace function admin_attempt_check(p_ip inet) returns void language plpgsql security definer set search_path = public as $$
declare n int; oldest timestamptz;
begin
  select count(*), min(at) into n, oldest from admin_login_attempts where ip is not distinct from p_ip and at > now() - interval '15 minutes';
  if n >= 20 then perform nbq_err('rate_limited', greatest(1, ceil(extract(epoch from oldest + interval '15 minutes' - now()))::int)::text); end if;
end $$;
-- 登录失败后记一笔（单独一个事务提交；失败的登录事务会回滚，记在里面会丢）；顺手清掉 2 天前的
create or replace function admin_attempt_note(p_ip inet) returns void language plpgsql security definer set search_path = public as $$
begin
  insert into admin_login_attempts(ip) values (p_ip);
  delete from admin_login_attempts where at < now() - interval '2 days';
end $$;

revoke execute on function admin_attempt_check(inet), admin_attempt_note(inet) from public, anon, authenticated, nbq_user, nbq_service, nbq_admin, nbq_viewer;
grant execute on function admin_login_begin(text), admin_login_finish(uuid, boolean, inet, text, text, bigint, text),
  admin_session_check(text), admin_session_revoke(text), admin_attempt_check(inet), admin_attempt_note(inet) to nbq_admin_api;

create table if not exists schema_migrations (version text primary key, applied_at timestamptz not null default now());
alter table schema_migrations enable row level security;
drop policy if exists svc_all on schema_migrations; create policy svc_all on schema_migrations to nbq_service using (true) with check (true);
grant select, insert on schema_migrations to nbq_service;
insert into schema_migrations(version) values ('20261105_admin_api') on conflict do nothing;

-- ===== 20261106_admin_venue_geo.sql =====
-- 后台球场坐标核对函数（#27 第 3 步）。只新增一个函数，可重复运行，不改表、不动已有数据。
-- 球场坐标核对（#27 第 3 步）：p_lat / p_lng 都不填 = 「现在的位置没错」，只把来源标成已核对；填了 = 改到新位置。
--   范围只收澳大利亚境内（挡住填反经纬度）；改动前后的位置和移动距离写进操作日志；不改球场的其他任何字段。
create or replace function admin_venue_geo(p_venue uuid, p_lat double precision default null, p_lng double precision default null) returns void language plpgsql security definer set search_path = public as $$
declare old_loc geography; moved numeric;
begin
  if (p_lat is null) <> (p_lng is null) then perform nbq_err('invalid', 'latlng'); end if;
  if p_lat is not null and (p_lat not between -44 and -10 or p_lng not between 112 and 154) then perform nbq_err('invalid', 'latlng'); end if;
  select location into old_loc from venues where id = p_venue;
  if not found then perform nbq_err('not_found'); end if;
  perform nbq_admin_act('venue.review', p_venue::text, null, jsonb_build_object('action', case when p_lat is null then 'geo_confirm' else 'geo_move' end,
    'from', jsonb_build_array(round(st_y(old_loc::geometry)::numeric, 6), round(st_x(old_loc::geometry)::numeric, 6)), 'to', case when p_lat is null then null else jsonb_build_array(p_lat, p_lng) end));
  if p_lat is null then
    update venues set geo_source = 'admin' where id = p_venue;
  else
    update venues set location = st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography, geo_source = 'admin' where id = p_venue;
  end if;
end $$;
grant execute on function admin_venue_geo(uuid, double precision, double precision) to nbq_admin;

insert into schema_migrations(version) values ('20261106_admin_venue_geo') on conflict do nothing;

-- ===== 20261107_user_rackets.sql =====
-- 我的球拍（#60 PR-A1，11-07）：每人最多 3 把，只记「品牌 + 系列」；可重复运行，纯新增，不改已有表和数据。
--   · user_rackets：主键 (user_id, slot)，slot 1 = 主力；brand 为空 = 选了「其他」（系列 / 拍子名称自由输入）
--   · 前台只能读自己的行（RLS）；写入只走 api_set_rackets(jsonb)：整组替换，校验不过 → invalid，原来的不丢（同一事务）
--   · 将来球员卡上别人可见（PR-C），所以服务器校验一次到位：≤ 30 字、去控制字符和首尾空白、拒绝链接（http / www）、@、连续 6 位以上数字、同一把重复
--   · 本期不改 public_profiles、不改 api_export_me（隐私欠账 #71）；注销时删球拍另做（A2）
create table if not exists user_rackets (
  user_id    uuid not null references users(id) on delete cascade,
  slot       smallint not null check (slot between 1 and 3),
  brand      text check (brand is null or (char_length(brand) between 1 and 30 and brand = btrim(brand))),
  series     text not null check (char_length(series) between 1 and 30 and series = btrim(series)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, slot)
);
create unique index if not exists user_rackets_same on user_rackets (user_id, lower(coalesce(brand, '')), lower(series));
alter table user_rackets enable row level security;
drop policy if exists svc_all on user_rackets; create policy svc_all on user_rackets to nbq_service using (true) with check (true);
drop policy if exists own_read on user_rackets; create policy own_read on user_rackets for select to nbq_user using (user_id = nbq_uid());
revoke all on user_rackets from public, anon, authenticated, nbq_user;
grant select on user_rackets to nbq_user;
grant all on user_rackets to nbq_service;

-- 球拍文字清洗：去控制字符、连续空白并成一个、去首尾空白（含全角空格 / 不换行空格）；清完是空串 → null
create or replace function nbq_racket_text(p text) returns text language sql immutable set search_path = public as $$
  select nullif(btrim(regexp_replace(regexp_replace(p, '[[:cntrl:]]', '', 'g'), '[[:space:]' || chr(12288) || chr(160) || ']+', ' ', 'g'), ' '), '') $$;
-- 不能出现在公开文字里的：链接、@、连续 6 位以上数字（手机号 / 微信号之类）
create or replace function nbq_racket_bad(p text) returns boolean language sql immutable set search_path = public as $$
  select p ~* '(http|www)' or p ~ '[@＠]' or p ~ '[0-9０-９]{6,}' $$;

-- 整组替换：p_rackets = [{brand, series}, …]，数组顺序 = slot（第 1 个是主力）；返回保存后的 [{slot, brand, series}]
create or replace function api_set_rackets(p_rackets jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare u uuid := nbq_me(); e jsonb; b text; s text; k text; bs text[] := '{}'; ss text[] := '{}'; ks text[] := '{}'; olds jsonb; out jsonb;
begin
  if p_rackets is null or jsonb_typeof(p_rackets) <> 'array' or jsonb_array_length(p_rackets) > 3 then perform nbq_err('invalid', 'rackets'); end if;
  for e in select x from jsonb_array_elements(p_rackets) x loop
    if jsonb_typeof(e) <> 'object' then perform nbq_err('invalid', 'rackets'); end if;
    if coalesce(jsonb_typeof(e->'brand'), 'null') not in ('string', 'null') then perform nbq_err('invalid', 'brand'); end if;
    if coalesce(jsonb_typeof(e->'series'), 'null') <> 'string' then perform nbq_err('invalid', 'series'); end if;
    b := nbq_racket_text(e->>'brand'); s := nbq_racket_text(e->>'series');
    if b is not null and (char_length(b) > 30 or nbq_racket_bad(b)) then perform nbq_err('invalid', 'brand'); end if;
    if s is null or char_length(s) > 30 or nbq_racket_bad(s) then perform nbq_err('invalid', 'series'); end if;
    k := lower(coalesce(b, '')) || chr(31) || lower(s);   -- 同一把：品牌 + 系列，不分大小写（chr(31) 是控制字符，清洗后不会出现在文字里）
    if k = any (ks) then perform nbq_err('invalid', 'duplicate'); end if;
    bs := bs || b; ss := ss || s; ks := ks || k;
  end loop;
  perform 1 from users where id = u for update;   -- 同一人并发保存时排队，避免两次整组替换互相撞主键
  select coalesce(jsonb_object_agg(lower(coalesce(brand, '')) || chr(31) || lower(series), created_at), '{}') into olds from user_rackets where user_id = u;
  delete from user_rackets where user_id = u;
  insert into user_rackets (user_id, slot, brand, series, created_at)
    select u, n.i, n.b, n.s, coalesce((olds->>n.k)::timestamptz, now()) from unnest(bs, ss, ks) with ordinality n(b, s, k, i);
  select coalesce(jsonb_agg(jsonb_build_object('slot', slot, 'brand', brand, 'series', series) order by slot), '[]') into out from user_rackets where user_id = u;
  return out;
end $$;
revoke execute on function api_set_rackets(jsonb), nbq_racket_text(text), nbq_racket_bad(text) from public, anon, authenticated;
grant execute on function api_set_rackets(jsonb) to nbq_user;
grant execute on function api_set_rackets(jsonb), nbq_racket_text(text), nbq_racket_bad(text) to nbq_service;

create table if not exists schema_migrations (version text primary key, applied_at timestamptz not null default now());
alter table schema_migrations enable row level security;
drop policy if exists svc_all on schema_migrations; create policy svc_all on schema_migrations to nbq_service using (true) with check (true);
grant select, insert on schema_migrations to nbq_service;
insert into schema_migrations(version) values ('20261107_user_rackets') on conflict do nothing;

-- ===== 20261107_wipe_rackets.sql =====
-- 我的球拍（#60 PR-A2，11-07）：注销满 30 天匿名化时删掉球拍（所有者定：注销即删，不保留）。
--   匿名化只改 users 行、不删，on delete cascade 不会触发，所以在 job_anonymize_deleted 里加一行 delete；函数其余部分与 schema.sql 原样一致。
--   依赖 20261107_user_rackets（先建表）。可重复运行。
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
  update email_outbox e set to_email = 'deleted', status = case when e.status = 'queued' then 'skipped' else e.status end,
         skip_reason = case when e.status = 'queued' then 'email_bad' else e.skip_reason end
    from users u where u.id = e.user_id and u.anonymized_at = p_now;
  return nbq_job_log('anonymize_deleted', n, t0);
end $$;
revoke execute on function job_anonymize_deleted(timestamptz) from public, nbq_user, nbq_viewer;
grant execute on function job_anonymize_deleted(timestamptz) to nbq_service;

create table if not exists schema_migrations (version text primary key, applied_at timestamptz not null default now());
alter table schema_migrations enable row level security;
drop policy if exists svc_all on schema_migrations; create policy svc_all on schema_migrations to nbq_service using (true) with check (true);
grant select, insert on schema_migrations to nbq_service;
insert into schema_migrations(version) values ('20261107_wipe_rackets') on conflict do nothing;

-- ===== 20261108_racket_catalog.sql =====
-- 球拍产品库（#60 A4，暂定实现：依据 #60 的提案，静默期到 2026-11-10；所有者可整体推翻）。可重复运行，只加不改。
--   · racket_catalog：品牌 + 系列 + 别名；status active（可选）/ hidden（不再出现在选择列表，已选的人不受影响）/ merged（并到 merged_into）
--   · user_rackets.catalog_id：选自产品库或自由文字自动匹配上的，记 id；匹配不上为空（后台「待归类」）。brand / series 仍存显示用的名字
--     （产品库改名时由后台函数同步，M1）
--   · api_set_rackets 新版：元素可以是 {catalog_id} 或 {brand, series}；自由文字按「不分大小写、品牌 + 系列 / 别名」自动归到产品库
--   · 产品库只给 nbq_service（前台 GET /api/rackets/catalog 由接口层读）和后台角色（M1 再开）
do $$ begin if to_regclass('public.user_rackets') is null then raise exception '先执行 20261107_user_rackets'; end if; end $$;
create table if not exists racket_catalog (
  id          uuid primary key default gen_random_uuid(),
  brand       text not null check (char_length(brand) between 1 and 30 and brand = btrim(brand)),
  series      text not null check (char_length(series) between 1 and 30 and series = btrim(series)),
  aliases     text[] not null default '{}',     -- 其他写法（小写），自动匹配用；合并时被并掉的名字也记进来
  status      text not null default 'active' check (status in ('active','hidden','merged')),
  merged_into uuid references racket_catalog(id),
  sort        int not null default 0,
  created_by  uuid,                              -- 后台管理员 id；种子数据为空
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check ((status = 'merged') = (merged_into is not null)),
  check (merged_into is null or merged_into <> id)
);
create unique index if not exists racket_catalog_name on racket_catalog (lower(brand), lower(series));
alter table racket_catalog enable row level security;
drop policy if exists svc_all on racket_catalog; create policy svc_all on racket_catalog to nbq_service using (true) with check (true);
revoke all on racket_catalog from public, anon, authenticated, nbq_user;
grant all on racket_catalog to nbq_service;
alter table user_rackets add column if not exists catalog_id uuid references racket_catalog(id);
create index if not exists user_rackets_catalog on user_rackets (catalog_id) where catalog_id is not null;

-- 种子：热门品牌和系列（顺序即排序）。已有的不动
insert into racket_catalog (brand, series, sort)
select b, s, row_number() over () * 10 from (values
  ('Wilson','Pro Staff'),('Wilson','Blade'),('Wilson','Clash'),('Wilson','Ultra'),('Wilson','Burn'),('Wilson','Shift'),
  ('Babolat','Pure Drive'),('Babolat','Pure Aero'),('Babolat','Pure Strike'),
  ('Head','Speed'),('Head','Radical'),('Head','Gravity'),('Head','Prestige'),('Head','Extreme'),('Head','Boom'),
  ('Yonex','EZONE'),('Yonex','VCORE'),('Yonex','Percept'),
  ('Dunlop','CX'),('Dunlop','SX'),('Dunlop','FX'),
  ('Prince','Phantom'),('Prince','Textreme'),
  ('Tecnifibre','TF40'),('Tecnifibre','T-Fight')) v(b, s)
on conflict do nothing;

-- 自由文字 → 产品库：品牌 + 系列不分大小写；没写品牌时，「品牌 系列」整串或别名都算；合并掉的跟到 merged_into；优先可选的（active）
create or replace function nbq_racket_match(p_brand text, p_series text) returns uuid language sql stable security definer set search_path = public as $$
  select coalesce(c.merged_into, c.id) from racket_catalog c
   where (p_brand is not null and lower(c.brand) = lower(p_brand) and (lower(c.series) = lower(p_series) or lower(p_series) = any (c.aliases)))
      or (p_brand is null and (lower(c.brand || ' ' || c.series) = lower(p_series) or lower(p_series) = any (c.aliases)))
   order by (c.status = 'active') desc, c.sort limit 1 $$;

create or replace function api_set_rackets(p_rackets jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare u uuid := nbq_me(); e jsonb; b text; s text; k text; cid uuid; c racket_catalog; held uuid[];
        bs text[] := '{}'; ss text[] := '{}'; ks text[] := '{}'; cs uuid[] := '{}'; olds jsonb; out jsonb;
begin
  if p_rackets is null or jsonb_typeof(p_rackets) <> 'array' or jsonb_array_length(p_rackets) > 3 then perform nbq_err('invalid', 'rackets'); end if;
  select coalesce(array_agg(catalog_id) filter (where catalog_id is not null), '{}') into held from user_rackets where user_id = u;
  for e in select x from jsonb_array_elements(p_rackets) x loop
    if jsonb_typeof(e) <> 'object' then perform nbq_err('invalid', 'rackets'); end if;
    cid := null;
    if coalesce(jsonb_typeof(e->'catalog_id'), 'null') <> 'null' then
      -- 选自产品库：名字以产品库为准；隐藏的只有本来就有的人能留着；合并掉的跟到新条目
      if jsonb_typeof(e->'catalog_id') <> 'string' or (e->>'catalog_id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then perform nbq_err('invalid', 'catalog_id'); end if;
      select * into c from racket_catalog where id = (e->>'catalog_id')::uuid;
      if c.id is not null and c.status = 'merged' then select * into c from racket_catalog where id = c.merged_into; end if;
      if c.id is null or c.status = 'merged' or (c.status = 'hidden' and not c.id = any (held)) then perform nbq_err('invalid', 'catalog_id'); end if;
      cid := c.id; b := c.brand; s := c.series;
    else
      if coalesce(jsonb_typeof(e->'brand'), 'null') not in ('string', 'null') then perform nbq_err('invalid', 'brand'); end if;
      if coalesce(jsonb_typeof(e->'series'), 'null') <> 'string' then perform nbq_err('invalid', 'series'); end if;
      b := nbq_racket_text(e->>'brand'); s := nbq_racket_text(e->>'series');
      if b is not null and (char_length(b) > 30 or nbq_racket_bad(b)) then perform nbq_err('invalid', 'brand'); end if;
      if s is null or char_length(s) > 30 or nbq_racket_bad(s) then perform nbq_err('invalid', 'series'); end if;
      cid := nbq_racket_match(b, s);
      if cid is not null then select brand, series into b, s from racket_catalog where id = cid; end if;   -- 归到产品库：显示用产品库的写法
    end if;
    k := lower(coalesce(b, '')) || chr(31) || lower(s);
    if k = any (ks) then perform nbq_err('invalid', 'duplicate'); end if;
    bs := bs || b; ss := ss || s; ks := ks || k; cs := cs || cid;
  end loop;
  perform 1 from users where id = u for update;
  select coalesce(jsonb_object_agg(lower(coalesce(brand, '')) || chr(31) || lower(series), created_at), '{}') into olds from user_rackets where user_id = u;
  delete from user_rackets where user_id = u;
  insert into user_rackets (user_id, slot, brand, series, catalog_id, created_at)
    select u, n.i, n.b, n.s, n.c, coalesce((olds->>n.k)::timestamptz, now()) from unnest(bs, ss, ks, cs) with ordinality n(b, s, k, c, i);
  select coalesce(jsonb_agg(jsonb_build_object('slot', slot, 'brand', brand, 'series', series, 'catalog_id', catalog_id) order by slot), '[]') into out from user_rackets where user_id = u;
  return out;
end $$;
revoke execute on function nbq_racket_match(text, text) from public, anon, authenticated, nbq_user;
grant execute on function nbq_racket_match(text, text) to nbq_service;
grant execute on function api_set_rackets(jsonb) to nbq_user, nbq_service;

-- 已有的自由文字：补上能匹配的 catalog_id（不改名字，下次保存时再换成产品库的写法）
update user_rackets r set catalog_id = nbq_racket_match(r.brand, r.series) where r.catalog_id is null and nbq_racket_match(r.brand, r.series) is not null;

create table if not exists schema_migrations (version text primary key, applied_at timestamptz not null default now());
alter table schema_migrations enable row level security;
drop policy if exists svc_all on schema_migrations; create policy svc_all on schema_migrations to nbq_service using (true) with check (true);
grant select, insert on schema_migrations to nbq_service;
insert into schema_migrations(version) values ('20261108_racket_catalog') on conflict do nothing;
