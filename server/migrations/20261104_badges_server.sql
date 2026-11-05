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
