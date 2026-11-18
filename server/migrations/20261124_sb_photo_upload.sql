-- 场边照片上传（#393 P1，ADR 0015；可重复执行，内容与 schema.sql 同名段落一致）。只加不改（ADR 0013）：
--   · rate_rules 加两条：每小时 30 张 / 每天 100 张（只数原图；缩略图和极小图不占次数，见 api_sb_photo_gate）
--   · app_switches 加第四个开关 photos_paused（一键停传）：放宽 key 的检查约束 + 一行默认关闭 + admin_set_switch 认这个 key
--   · api_sb_photo_gate：上传接口在读文件之前调一次 = 账号状态（同 nbq_sb_gate：停用 / 封禁 / 注销不能传）+ 频率
insert into rate_rules(rule, grp, win, max_hits, per_key, code, note) values
 ('sb_photo_hour', 'sb_photo', '1 hour',   30,  false, 'photo_hourly_limit', '场边照片：每小时 30 张（只数原图）'),
 ('sb_photo_day',  'sb_photo', '24 hours', 100, false, 'photo_daily_limit',  '场边照片：每天 100 张')
on conflict (rule) do nothing;

alter table app_switches drop constraint if exists app_switches_key_check;
alter table app_switches add constraint app_switches_key_check check (key in ('register_paused','maintenance','sms_paused','photos_paused'));
insert into app_switches(key) values ('photos_paused') on conflict (key) do nothing;
create or replace function admin_set_switch(p_key text, p_on boolean, p_reason text) returns void language plpgsql security definer set search_path = public as $$
declare adm uuid;
begin
  if p_key is null or p_on is null or p_key not in ('register_paused','maintenance','sms_paused','photos_paused') then perform nbq_err('invalid', 'switch'); end if;
  adm := nbq_admin_act('switch.set', p_key, p_reason, jsonb_build_object('on', p_on));
  update app_switches set is_on = p_on, updated_at = now(), updated_by = adm where key = p_key;
end $$;

create or replace function api_sb_photo_gate(p_count boolean default true) returns uuid language plpgsql security definer set search_path = public as $$
declare u uuid := nbq_sb_gate();
begin
  if p_count then perform nbq_rate(u::text, 'sb_photo'); end if;
  return u;
end $$;
revoke execute on function api_sb_photo_gate(boolean) from public;
grant execute on function api_sb_photo_gate(boolean) to nbq_user, nbq_service;

insert into schema_migrations(version) values ('20261124_sb_photo_upload') on conflict do nothing;
