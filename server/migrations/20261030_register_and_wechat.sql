-- 迁移（正式库）：把 10-29 建库之后 schema.sql 的两次改动补到已经建好的 Supabase 库里。可重复执行（执行两次也没事）。
-- 用法：Supabase 悉尼项目 → SQL Editor → 粘贴全部 → Run。
-- 对应提交：dfe11bf（新号码注册：头像色约束放宽、服务身份可查昵称规则）· fe5343a（api_show_wechat）。
-- 不执行的后果：新号码填完资料点「完成」报「没有权限做这件事」（服务身份没有昵称规则函数的执行权限）；
--              新用户默认印色 paper（宣纸白）存不进去；私人球局里展示微信的开关调不通。

begin;

-- 1. 头像色约束：放宽成「字母底色 8 种 ∪ 印色 7 种」
alter table users drop constraint if exists users_avatar_color_check;
alter table users add constraint users_avatar_color_check check (avatar_color in ('coral','amber','rose','wine','violet','sky','teal','slate','paper','red','orange','olive','green','navy','cocoa'));

-- 2. 注册新号码时（服务身份插入，触发器只管前台身份）要先查同一套昵称规则
grant execute on function nbq_nickname_problem(text), nbq_has_contact(text) to nbq_service;

-- 3. 私人球局里向对方展示微信号：已加入的人改自己的开关（走函数，直接 update 会被行级策略拦下）
create or replace function api_show_wechat(p_game uuid, p_value boolean) returns boolean language plpgsql security definer set search_path = public as $$
declare u uuid := nbq_me();
begin
  if p_value is null then perform nbq_err('invalid', 'show_wechat'); end if;
  update game_participants set show_wechat = p_value
   where game_id = p_game and user_id = u and status = 'approved' and exists (select 1 from games g where g.id = p_game and g.visibility = 'private');
  if not found then perform nbq_err('not_in_game'); end if;
  return p_value;
end $$;
revoke execute on function api_show_wechat(uuid, boolean) from public, anon, authenticated, nbq_viewer;
grant execute on function api_show_wechat(uuid, boolean) to nbq_user, nbq_service;

commit;

-- 执行后核对（应各返回 true）：
--   select has_function_privilege('nbq_service', 'nbq_nickname_problem(text)', 'execute');
--   select has_function_privilege('nbq_user', 'api_show_wechat(uuid, boolean)', 'execute');
--   select pg_get_constraintdef(oid) like '%paper%' from pg_constraint where conname = 'users_avatar_color_check';
