-- 球拍产品库（#60 A4，所有者 11-07 已批准，ADR 0009）。可重复运行，只加不改。
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
