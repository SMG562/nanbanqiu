-- 我的球拍（#60 PR-A1，11-07）：每人最多 3 把，只记「品牌 + 系列」；可重复运行，纯新增，不改已有表和数据。
--   · user_rackets：主键 (user_id, slot)，slot 1 = 主力；brand 为空 = 选了「其他」（系列 / 拍子名称自由输入）
--   · 前台只能读自己的行（RLS）；写入只走 api_set_rackets(jsonb)：整组替换，校验不过 → invalid，原来的不丢（同一事务）
--   · 将来球员卡上别人可见（PR-C），所以服务器校验一次到位：≤ 30 字、去控制字符和首尾空白、拒绝链接（http / www）、@、连续 6 位以上数字、同一把重复
--   · 本期不改 public_profiles、不改 api_export_me（隐私欠账 #71）；注销时删球拍另做（A2）
create table if not exists user_rackets (
  user_id    uuid not null references users(id) on delete cascade,
  slot       smallint not null check (slot between 1 and 3),
  brand      text check (brand is null or (char_length(brand) between 1 and 30 and brand = btrim(brand))),
  series     text not null check (char_length(series) between 1 and 30 and series = btrim(series)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, slot)
);
create unique index if not exists user_rackets_same on user_rackets (user_id, lower(coalesce(brand, '')), lower(series));
alter table user_rackets enable row level security;
drop policy if exists svc_all on user_rackets; create policy svc_all on user_rackets to nbq_service using (true) with check (true);
drop policy if exists own_read on user_rackets; create policy own_read on user_rackets for select to nbq_user using (user_id = nbq_uid());
revoke all on user_rackets from public, anon, authenticated, nbq_user;
grant select on user_rackets to nbq_user;
grant all on user_rackets to nbq_service;

-- 球拍文字清洗：去控制字符、连续空白并成一个、去首尾空白（含全角空格 / 不换行空格）；清完是空串 → null
create or replace function nbq_racket_text(p text) returns text language sql immutable set search_path = public as $$
  select nullif(btrim(regexp_replace(regexp_replace(p, '[[:cntrl:]]', '', 'g'), '[[:space:]' || chr(12288) || chr(160) || ']+', ' ', 'g'), ' '), '') $$;
-- 不能出现在公开文字里的：链接、@、连续 6 位以上数字（手机号 / 微信号之类）
create or replace function nbq_racket_bad(p text) returns boolean language sql immutable set search_path = public as $$
  select p ~* '(http|www)' or p ~ '[@＠]' or p ~ '[0-9０-９]{6,}' $$;

-- 整组替换：p_rackets = [{brand, series}, …]，数组顺序 = slot（第 1 个是主力）；返回保存后的 [{slot, brand, series}]
create or replace function api_set_rackets(p_rackets jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare u uuid := nbq_me(); e jsonb; b text; s text; k text; bs text[] := '{}'; ss text[] := '{}'; ks text[] := '{}'; olds jsonb; out jsonb;
begin
  if p_rackets is null or jsonb_typeof(p_rackets) <> 'array' or jsonb_array_length(p_rackets) > 3 then perform nbq_err('invalid', 'rackets'); end if;
  for e in select x from jsonb_array_elements(p_rackets) x loop
    if jsonb_typeof(e) <> 'object' then perform nbq_err('invalid', 'rackets'); end if;
    if coalesce(jsonb_typeof(e->'brand'), 'null') not in ('string', 'null') then perform nbq_err('invalid', 'brand'); end if;
    if coalesce(jsonb_typeof(e->'series'), 'null') <> 'string' then perform nbq_err('invalid', 'series'); end if;
    b := nbq_racket_text(e->>'brand'); s := nbq_racket_text(e->>'series');
    if b is not null and (char_length(b) > 30 or nbq_racket_bad(b)) then perform nbq_err('invalid', 'brand'); end if;
    if s is null or char_length(s) > 30 or nbq_racket_bad(s) then perform nbq_err('invalid', 'series'); end if;
    k := lower(coalesce(b, '')) || chr(31) || lower(s);   -- 同一把：品牌 + 系列，不分大小写（chr(31) 是控制字符，清洗后不会出现在文字里）
    if k = any (ks) then perform nbq_err('invalid', 'duplicate'); end if;
    bs := bs || b; ss := ss || s; ks := ks || k;
  end loop;
  perform 1 from users where id = u for update;   -- 同一人并发保存时排队，避免两次整组替换互相撞主键
  select coalesce(jsonb_object_agg(lower(coalesce(brand, '')) || chr(31) || lower(series), created_at), '{}') into olds from user_rackets where user_id = u;
  delete from user_rackets where user_id = u;
  insert into user_rackets (user_id, slot, brand, series, created_at)
    select u, n.i, n.b, n.s, coalesce((olds->>n.k)::timestamptz, now()) from unnest(bs, ss, ks) with ordinality n(b, s, k, i);
  select coalesce(jsonb_agg(jsonb_build_object('slot', slot, 'brand', brand, 'series', series) order by slot), '[]') into out from user_rackets where user_id = u;
  return out;
end $$;
revoke execute on function api_set_rackets(jsonb), nbq_racket_text(text), nbq_racket_bad(text) from public, anon, authenticated;
grant execute on function api_set_rackets(jsonb) to nbq_user;
grant execute on function api_set_rackets(jsonb), nbq_racket_text(text), nbq_racket_bad(text) to nbq_service;

create table if not exists schema_migrations (version text primary key, applied_at timestamptz not null default now());
alter table schema_migrations enable row level security;
drop policy if exists svc_all on schema_migrations; create policy svc_all on schema_migrations to nbq_service using (true) with check (true);
grant select, insert on schema_migrations to nbq_service;
insert into schema_migrations(version) values ('20261107_user_rackets') on conflict do nothing;
