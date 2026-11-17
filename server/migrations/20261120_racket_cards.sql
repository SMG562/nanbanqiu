-- 球员卡显示球拍（#60 PR-C1，11-18，迁移 20261120_racket_cards）：按一组球员 id 返回别人可见的球拍。可重复执行；纯新增，不改已有表 / 视图。
--   user_rackets 的 RLS 只让本人读，所以走 SECURITY DEFINER；注销 / 封禁的人（users.status in banned, deleted）不返回；一次最多 50 人。
create or replace function api_player_rackets(p_ids uuid[]) returns table(user_id uuid, slot smallint, brand text, series text, catalog_id uuid)
language sql stable security definer set search_path = public as $$
  select r.user_id, r.slot, r.brand, r.series, r.catalog_id from user_rackets r join users u on u.id = r.user_id
  where r.user_id = any(p_ids[1:50]) and u.status not in ('banned', 'deleted') and u.anonymized_at is null and nbq_me() is not null
  order by r.user_id, r.slot $$;
revoke execute on function api_player_rackets(uuid[]) from public, anon, authenticated;
grant execute on function api_player_rackets(uuid[]) to nbq_user, nbq_service;
insert into schema_migrations(version) values ('20261120_racket_cards') on conflict do nothing;
