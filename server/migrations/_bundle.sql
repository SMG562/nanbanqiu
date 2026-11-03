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

-- ===== 20261104_chat_notify.sql =====
-- 新消息通知：收到私信 / 球局群聊消息推送到手机（11-04）。可重复运行。
-- 1) 通知类型 chat；2) notifications.thread_id；3) 发消息时生成通知（nbq_chat_notify）；4) 打开会话时标已读（api_chat_notif_read）。
alter type notif_kind add value if not exists 'chat';
-- ---------- 新消息通知（11-04）：收到私信 / 球局群聊消息，推送到手机 ----------
-- chat 通知带 thread_id（点推送直接打开那个会话），不带 game_id（球局开打后聊天还能继续 48 小时，带了会被当成「球局已开打」而不推）。
-- 规则：屏蔽的不通知；对方把我设成「少遇到」不通知（同局开打前 24 小时到结束后 2 小时除外）；同一会话里上一条还没读、且 5 分钟内已通知过 → 不再重复通知；
--       打开会话（thread read）时把这个会话的 chat 通知标成已读（发送程序推送前发现已读就不推）。
alter table notifications add column if not exists thread_id uuid references threads(id) on delete cascade;
create index if not exists notif_chat_idx on notifications(user_id, thread_id, created_at desc) where kind = 'chat';
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
create or replace function api_chat_notif_read(p_thread uuid) returns void language sql security definer set search_path = public as $$
  update notifications set read_at = now() where user_id = nbq_me() and kind = 'chat' and thread_id = p_thread and read_at is null
$$;
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
