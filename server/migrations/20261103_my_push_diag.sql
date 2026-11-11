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
