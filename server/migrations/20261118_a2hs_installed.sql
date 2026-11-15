-- 添加到桌面引导 v2（可重复执行；内容与 schema.sql 同名段落一致）。加一个只读函数、两个事件、修漏斗第 3 步；不改任何现有接口。
-- 添加到主屏幕（11-15，迁移 20261118_a2hs_installed）：这个人有没有从主屏幕图标打开过（服务器记的 sessions.standalone）。只读、只看自己；
--   前台身份不能直接读 sessions，所以走 SECURITY DEFINER。Safari 读到 true 就永久记「已添加」，不再提醒
create or replace function api_me_installed() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from sessions where user_id = nbq_me() and standalone) $$;
grant execute on function api_me_installed() to nbq_user, nbq_service;
-- 漏斗第 3 步原来看 users.installed_at，但没有任何地方写它（正式库 0 人）：改成「有从主屏幕打开过的会话」（或 installed_at 有值）
create or replace function pwa_install_funnel(p_from timestamptz, p_to timestamptz)
returns table(step int, name text, people bigint) language sql stable as $$
  with s1 as (select distinct user_id from sessions where device='mobile' and not coalesce(standalone,false) and user_id is not null
               and started_at >= p_from and started_at < p_to),
  s2 as (select * from s1 where user_id in (select user_id from events where event='a2hs_open' and occurred_at >= p_from and occurred_at < p_to)),
  s3 as (select * from s2 where user_id in (select user_id from sessions where standalone and user_id is not null)
                            or user_id in (select id from users where installed_at is not null)),
  s4 as (select * from s3 where user_id in (select user_id from sessions where standalone and started_at > now() - interval '7 days'))
  select 1, '在手机浏览器里用过', (select count(*) from s1) union all select 2, '打开过添加引导', (select count(*) from s2)
  union all select 3, '已添加到主屏幕', (select count(*) from s3) union all select 4, '最近 7 天还从主屏幕打开', (select count(*) from s4)
$$;
insert into event_definitions(event, category, description, props, source, status, replaced_by) values
 ('a2hs_go','安装','引导第一屏点「放到桌面」','','client','active',null),
 ('a2hs_back','安装','从添加步骤回到页面，看到「放好了吗」','','client','active',null)
on conflict (event) do update set status='active', description=excluded.description;
insert into schema_migrations(version) values ('20261118_a2hs_installed') on conflict do nothing;
