-- 球拍两级库 PR1 复核后续（#385，#377）：可重复执行；不改已执行的 20261121，只用新迁移覆盖。
--   · 种子补漏：旧 racket_catalog 里 hidden 的条目，对应的新系列改 hidden（20261121 把它们带成了 active）
--   · api_set_rackets：新形状补「held 例外」——自己已选的品牌 / 系列后来被设为 hidden，原样保存不报 invalid（其余同 20261121）
do $$ begin if to_regclass('public.racket_series') is null then raise exception '先执行 20261121_racket_series'; end if; end $$;
update racket_series s set status = 'hidden' from racket_catalog c, brands b
  where c.status = 'hidden' and b.id = s.brand_id and lower(b.name) = lower(c.brand) and lower(s.name) = lower(c.series) and not s.is_other and s.status = 'active';

create or replace function api_set_rackets(p_rackets jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare u uuid := nbq_me(); e jsonb; b text; s text; k text; cid uuid; c racket_catalog; held uuid[]; hb uuid[]; hs uuid[]; br brands; se racket_series; ot text; ob text; nk text; bid uuid; sid uuid;
        bs text[] := '{}'; ss text[] := '{}'; ks text[] := '{}'; cs uuid[] := '{}'; bids uuid[] := '{}'; sids uuid[] := '{}'; ots text[] := '{}'; obs text[] := '{}'; nks text[] := '{}'; olds jsonb; out jsonb;
        uu text := '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
begin
  if p_rackets is null or jsonb_typeof(p_rackets) <> 'array' or jsonb_array_length(p_rackets) > 3 then perform nbq_err('invalid', 'rackets'); end if;
  select coalesce(array_agg(catalog_id) filter (where catalog_id is not null), '{}') into held from user_rackets where user_id = u;
  -- held 例外（#385）：自己已选的品牌 / 系列即使后来被设为 hidden，原样保存仍可通过
  select coalesce(array_agg(brand_id) filter (where brand_id is not null), '{}'), coalesce(array_agg(series_id) filter (where series_id is not null), '{}') into hb, hs from user_rackets where user_id = u;
  for e in select x from jsonb_array_elements(p_rackets) x loop
    if jsonb_typeof(e) <> 'object' then perform nbq_err('invalid', 'rackets'); end if;
    cid := null; bid := null; sid := null; ot := null; ob := null; nk := null;
    if coalesce(jsonb_typeof(e->'nickname'), 'null') not in ('string', 'null') then perform nbq_err('invalid', 'nickname'); end if;
    nk := nbq_racket_text(e->>'nickname');
    if nk is not null and (char_length(nk) > 12 or nbq_racket_bad(nk)) then perform nbq_err('invalid', 'nickname'); end if;
    if coalesce(jsonb_typeof(e->'brand_id'), 'null') <> 'null' then
      -- 新形状：品牌 id + 系列 id（或自填的系列名）
      if jsonb_typeof(e->'brand_id') <> 'string' or (e->>'brand_id') !~* uu then perform nbq_err('invalid', 'brand_id'); end if;
      select * into br from brands where id = (e->>'brand_id')::uuid and (status = 'active' or id = any (hb)); if br.id is null then perform nbq_err('invalid', 'brand_id'); end if;
      if coalesce(jsonb_typeof(e->'series_id'), 'null') <> 'null' and coalesce(jsonb_typeof(e->'other_text'), 'null') <> 'null' then perform nbq_err('invalid', 'series'); end if;
      if coalesce(jsonb_typeof(e->'series_id'), 'null') <> 'null' then
        if jsonb_typeof(e->'series_id') <> 'string' or (e->>'series_id') !~* uu then perform nbq_err('invalid', 'series_id'); end if;
        select * into se from racket_series where id = (e->>'series_id')::uuid and brand_id = br.id and (status = 'active' or id = any (hs)); if se.id is null then perform nbq_err('invalid', 'series_id'); end if;
        sid := se.id; s := se.name;
      else
        if coalesce(jsonb_typeof(e->'other_text'), 'null') <> 'string' then perform nbq_err('invalid', 'series'); end if;
        ot := nbq_racket_text(e->>'other_text'); if ot is null or char_length(ot) > 30 or nbq_racket_bad(ot) then perform nbq_err('invalid', 'series'); end if; s := ot;
      end if;
      if coalesce(jsonb_typeof(e->'other_brand_text'), 'null') = 'string' then ob := nbq_racket_text(e->>'other_brand_text');
        if ob is not null and (char_length(ob) > 30 or nbq_racket_bad(ob)) then perform nbq_err('invalid', 'brand'); end if; end if;
      bid := br.id; b := br.name; cid := nbq_racket_match(b, s);
    else
      if coalesce(jsonb_typeof(e->'catalog_id'), 'null') <> 'null' then
        if jsonb_typeof(e->'catalog_id') <> 'string' or (e->>'catalog_id') !~* uu then perform nbq_err('invalid', 'catalog_id'); end if;
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
        if cid is not null then select brand, series into b, s from racket_catalog where id = cid; end if;
      end if;
      -- 旧形状映射到新列：品牌名对得上才记 brand_id；系列对得上记 series_id，否则当自填系列
      select * into br from brands where lower(name) = lower(coalesce(b, '')) and status = 'active';
      if br.id is not null then
        bid := br.id; select id into sid from racket_series where brand_id = br.id and lower(name) = lower(s) and not is_other and status = 'active';
        if sid is null then ot := s; end if;
      else ob := b; end if;
    end if;
    k := lower(coalesce(b, '')) || chr(31) || lower(s);
    if k = any (ks) then perform nbq_err('invalid', 'duplicate'); end if;
    bs := bs || b; ss := ss || s; ks := ks || k; cs := cs || cid; bids := bids || bid; sids := sids || sid; ots := ots || ot; obs := obs || ob; nks := nks || nk;
  end loop;
  perform 1 from users where id = u for update;
  select coalesce(jsonb_object_agg(lower(coalesce(brand, '')) || chr(31) || lower(series), created_at), '{}') into olds from user_rackets where user_id = u;
  delete from user_rackets where user_id = u;
  insert into user_rackets (user_id, slot, brand, series, catalog_id, brand_id, series_id, other_text, other_brand_text, nickname, created_at)
    select u, n.i, n.b, n.s, n.c, n.bi, n.si, n.o, n.ob, n.nk, coalesce((olds->>n.k)::timestamptz, now()) from unnest(bs, ss, ks, cs, bids, sids, ots, obs, nks) with ordinality n(b, s, k, c, bi, si, o, ob, nk, i);
  select coalesce(jsonb_agg(jsonb_build_object('slot', slot, 'brand', brand, 'series', series, 'catalog_id', catalog_id, 'brand_id', brand_id, 'series_id', series_id,
    'other_text', other_text, 'other_brand_text', other_brand_text, 'nickname', nickname) order by slot), '[]') into out from user_rackets where user_id = u;
  return out;
end $$;
revoke execute on function api_set_rackets(jsonb) from public, anon, authenticated;
grant execute on function api_set_rackets(jsonb) to nbq_user, nbq_service;
insert into schema_migrations(version) values ('20261122_racket_held') on conflict do nothing;
