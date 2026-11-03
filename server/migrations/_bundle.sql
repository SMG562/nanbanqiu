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
