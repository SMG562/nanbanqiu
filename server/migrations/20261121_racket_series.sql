-- 球拍一期 PR1 数据层（#377，#60 所有者 11-18 第 2 条，ADR 0014）：品牌 → 系列两级库。可重复执行；只加不改，旧列 / 旧表 / 旧接口形状全部保留（ADR 0013）。
--   · brands / racket_series / racket_aliases / catalogue_submissions：前台全拒，只走 SECURITY DEFINER 函数；系列先从旧 racket_catalog 拷贝（拼写不变，逐字映射），每个品牌补一条「其他系列」
--   · user_rackets 加 brand_id / series_id / other_text / other_brand_text / nickname（≤12 个字符，emoji / 中文各算 1）；series_id 与 other_text 二选一；仍用 slot（1=主力），brand / series 文字列继续填，老读函数不受影响
--   · api_set_rackets：新旧形状都收；api_player_rackets 不动（返回类型不变），新增 api_player_rackets2 返回新结构；api_export_me、job_anonymize_deleted 原地补字段 / 补清理
--   · 规格拼写（HEAD / PERCEPT / TFight）待官网核对，核对前不进正式库：单独的种子文件另提
do $$ begin if to_regclass('public.racket_catalog') is null then raise exception '先执行 20261108_racket_catalog'; end if; end $$;
create table if not exists brands (
  id uuid primary key default gen_random_uuid(), name text not null check (char_length(name) between 1 and 30),
  sort int not null default 0, status text not null default 'active' check (status in ('active', 'hidden')), created_at timestamptz not null default now());
create unique index if not exists brands_name on brands (lower(name));
create table if not exists racket_series (
  id uuid primary key default gen_random_uuid(), brand_id uuid not null references brands(id), name text not null check (char_length(name) between 1 and 30),
  is_other boolean not null default false, sort int not null default 0, status text not null default 'active' check (status in ('active', 'hidden')), created_at timestamptz not null default now());
create unique index if not exists racket_series_name on racket_series (brand_id, lower(name));
create unique index if not exists racket_series_other on racket_series (brand_id) where is_other;
create table if not exists racket_aliases (id uuid primary key default gen_random_uuid(), series_id uuid not null references racket_series(id), alias text not null check (char_length(alias) between 1 and 40));
create unique index if not exists racket_aliases_alias on racket_aliases (lower(alias));
create table if not exists catalogue_submissions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references users(id) on delete cascade, text text not null check (char_length(text) between 1 and 60), created_at timestamptz not null default now());
create index if not exists catalogue_submissions_user on catalogue_submissions (user_id);
alter table brands enable row level security; drop policy if exists svc_all on brands; create policy svc_all on brands to nbq_service using (true) with check (true);
revoke all on brands from public, anon, authenticated, nbq_user; grant all on brands to nbq_service;
alter table racket_series enable row level security; drop policy if exists svc_all on racket_series; create policy svc_all on racket_series to nbq_service using (true) with check (true);
revoke all on racket_series from public, anon, authenticated, nbq_user; grant all on racket_series to nbq_service;
alter table racket_aliases enable row level security; drop policy if exists svc_all on racket_aliases; create policy svc_all on racket_aliases to nbq_service using (true) with check (true);
revoke all on racket_aliases from public, anon, authenticated, nbq_user; grant all on racket_aliases to nbq_service;
alter table catalogue_submissions enable row level security; drop policy if exists svc_all on catalogue_submissions; create policy svc_all on catalogue_submissions to nbq_service using (true) with check (true);
revoke all on catalogue_submissions from public, anon, authenticated, nbq_user; grant all on catalogue_submissions to nbq_service;
-- 种子：品牌和系列来自旧 racket_catalog（顺序沿用 sort），每个品牌一条「其他系列」
insert into brands (name, sort) select brand, (row_number() over (order by min(sort))) * 10 from racket_catalog where status <> 'merged' group by brand on conflict do nothing;
insert into racket_series (brand_id, name, sort) select b.id, c.series, c.sort from racket_catalog c join brands b on lower(b.name) = lower(c.brand) where c.status <> 'merged' on conflict do nothing;
insert into racket_series (brand_id, name, is_other, sort) select id, '其他系列', true, 9999 from brands on conflict do nothing;

alter table user_rackets add column if not exists brand_id uuid references brands(id);
alter table user_rackets add column if not exists series_id uuid references racket_series(id);
alter table user_rackets add column if not exists other_text text;
alter table user_rackets add column if not exists other_brand_text text;
alter table user_rackets add column if not exists nickname text;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'user_rackets_new_shape') then
    alter table user_rackets add constraint user_rackets_new_shape check (
      not (series_id is not null and other_text is not null) and (brand_id is null or series_id is not null or other_text is not null)
      and (other_text is null or char_length(other_text) between 1 and 30) and (other_brand_text is null or char_length(other_brand_text) between 1 and 30)
      and (nickname is null or char_length(nickname) between 1 and 12)) not valid;
  end if; end $$;
-- 老数据映射：已有 catalog_id 的，按名字对到新 series_id（旧列保留）
update user_rackets r set brand_id = s.brand_id, series_id = s.id
  from racket_catalog c, racket_series s, brands b
  where r.catalog_id = c.id and r.series_id is null and b.id = s.brand_id and lower(b.name) = lower(c.brand) and lower(s.name) = lower(c.series);

-- 整组替换：新形状 {brand_id, series_id | other_text, other_brand_text?, nickname?}；旧形状 {catalog_id} / {brand, series} 继续收，并尽量映射到新列
create or replace function api_set_rackets(p_rackets jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare u uuid := nbq_me(); e jsonb; b text; s text; k text; cid uuid; c racket_catalog; held uuid[]; br brands; se racket_series; ot text; ob text; nk text; bid uuid; sid uuid;
        bs text[] := '{}'; ss text[] := '{}'; ks text[] := '{}'; cs uuid[] := '{}'; bids uuid[] := '{}'; sids uuid[] := '{}'; ots text[] := '{}'; obs text[] := '{}'; nks text[] := '{}'; olds jsonb; out jsonb;
        uu text := '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
begin
  if p_rackets is null or jsonb_typeof(p_rackets) <> 'array' or jsonb_array_length(p_rackets) > 3 then perform nbq_err('invalid', 'rackets'); end if;
  select coalesce(array_agg(catalog_id) filter (where catalog_id is not null), '{}') into held from user_rackets where user_id = u;
  for e in select x from jsonb_array_elements(p_rackets) x loop
    if jsonb_typeof(e) <> 'object' then perform nbq_err('invalid', 'rackets'); end if;
    cid := null; bid := null; sid := null; ot := null; ob := null; nk := null;
    if coalesce(jsonb_typeof(e->'nickname'), 'null') not in ('string', 'null') then perform nbq_err('invalid', 'nickname'); end if;
    nk := nbq_racket_text(e->>'nickname');
    if nk is not null and (char_length(nk) > 12 or nbq_racket_bad(nk)) then perform nbq_err('invalid', 'nickname'); end if;
    if coalesce(jsonb_typeof(e->'brand_id'), 'null') <> 'null' then
      -- 新形状：品牌 id + 系列 id（或自填的系列名）
      if jsonb_typeof(e->'brand_id') <> 'string' or (e->>'brand_id') !~* uu then perform nbq_err('invalid', 'brand_id'); end if;
      select * into br from brands where id = (e->>'brand_id')::uuid and status = 'active'; if br.id is null then perform nbq_err('invalid', 'brand_id'); end if;
      if coalesce(jsonb_typeof(e->'series_id'), 'null') <> 'null' and coalesce(jsonb_typeof(e->'other_text'), 'null') <> 'null' then perform nbq_err('invalid', 'series'); end if;
      if coalesce(jsonb_typeof(e->'series_id'), 'null') <> 'null' then
        if jsonb_typeof(e->'series_id') <> 'string' or (e->>'series_id') !~* uu then perform nbq_err('invalid', 'series_id'); end if;
        select * into se from racket_series where id = (e->>'series_id')::uuid and brand_id = br.id and status = 'active'; if se.id is null then perform nbq_err('invalid', 'series_id'); end if;
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

-- 别人可见的球拍（新结构）：规则同 api_player_rackets（注销 / 封禁 / 匿名化不返回，一次最多 50 人）；旧函数返回类型不能改，所以另起一个
create or replace function api_player_rackets2(p_ids uuid[]) returns table(user_id uuid, slot smallint, brand text, series text, catalog_id uuid, brand_id uuid, series_id uuid, other_text text, other_brand_text text, nickname text)
language sql stable security definer set search_path = public as $$
  select r.user_id, r.slot, r.brand, r.series, r.catalog_id, r.brand_id, r.series_id, r.other_text, r.other_brand_text, r.nickname from user_rackets r join users u on u.id = r.user_id
  where r.user_id = any(p_ids[1:50]) and u.status not in ('banned', 'deleted') and u.anonymized_at is null and nbq_me() is not null
  order by r.user_id, r.slot $$;
revoke execute on function api_player_rackets2(uuid[]) from public, anon, authenticated;
grant execute on function api_player_rackets2(uuid[]) to nbq_user, nbq_service;

-- 导出补新字段 + 自己提交过的新系列；注销匿名化补清 catalogue_submissions（整段函数照 schema.sql 现行版本加一处）
create or replace function api_export_me() returns jsonb language plpgsql security definer set search_path = public as $$
declare u uuid := nbq_me(); out jsonb;
begin
  perform nbq_rate(u::text, 'export');
  select jsonb_build_object(
    'exported_at', now(),
    'about', '这是南伴球保存的你的个人信息（隐私政策第 6 条）。不含别人对你的私下评价和举报人身份；有疑问请写信给 privacy@nanbanqiu.app。',
    'profile', (select to_jsonb(x) - 'auth_id' - 'email_unsub_token' from users x where x.id = u),
    'clubs', (select coalesce(jsonb_agg(jsonb_build_object('venue', v.name, 'since', c.created_at)), '[]') from user_clubs c join venues v on v.id = c.venue_id where c.user_id = u),
    'suburb_picks', (select coalesce(jsonb_agg(to_jsonb(s) - 'user_id'), '[]') from user_suburb_picks s where s.user_id = u),
    'games_hosted', (select coalesce(jsonb_agg(jsonb_build_object('share_code', g.share_code, 'starts_at', g.starts_at, 'venue', v.name, 'type', g.game_type, 'status', g.status, 'note', g.note) order by g.starts_at), '[]')
                      from games g join venues v on v.id = g.venue_id where g.host_id = u),
    'games_joined', (select coalesce(jsonb_agg(jsonb_build_object('share_code', g.share_code, 'starts_at', g.starts_at, 'venue', v.name, 'status', p.status, 'message', p.message,
                       'applied_at', p.created_at, 'decided_at', p.decided_at, 'left_at', p.left_at, 'attendance', p.attendance) order by g.starts_at), '[]')
                      from game_participants p join games g on g.id = p.game_id join venues v on v.id = g.venue_id where p.user_id = u and p.role = 'player'),
    'invites', (select coalesce(jsonb_agg(jsonb_build_object('direction', case when i.from_user = u then 'sent' else 'received' end, 'other', o.nickname,
                       'starts_at', i.starts_at, 'status', i.status, 'note', i.note, 'created_at', i.created_at) order by i.created_at), '[]')
                 from invites i join users o on o.id = case when i.from_user = u then i.to_user else i.from_user end where u in (i.from_user, i.to_user)),
    'messages', (select coalesce(jsonb_agg(jsonb_build_object('thread', m.thread_id, 'from', case when m.sender_id = u then '我' else s.nickname end, 'body', m.body, 'at', m.created_at) order by m.created_at), '[]')
                  from messages m join users s on s.id = m.sender_id where thread_member(m.thread_id, u) and (m.sender_id = u or not m.hidden)),
    'my_preferences', (select coalesce(jsonb_agg(jsonb_build_object('player', o.nickname, 'pref', p.pref, 'updated_at', p.updated_at)), '[]') from player_prefs p join users o on o.id = p.target_id where p.user_id = u),
    'impressions_given', (select coalesce(jsonb_agg(jsonb_build_object('player', o.nickname, 'kinds', i.kinds, 'at', i.created_at)), '[]') from impressions i join users o on o.id = i.to_id where i.from_id = u),
    'impressions_received_count', (select count(*) from impressions i where i.to_id = u),
    'kudos_received_count', (select count(*) from kudos k where k.to_id = u),
    'noshow_against_me', (select coalesce(jsonb_agg(jsonb_build_object('game', g.share_code, 'starts_at', g.starts_at)), '[]') from v_confirmed_noshow n join games g on g.id = n.game_id where n.user_id = u),
    'appeals', (select coalesce(jsonb_agg(to_jsonb(a) - 'user_id'), '[]') from noshow_appeals a where a.user_id = u),
    'reports_made', (select coalesce(jsonb_agg(jsonb_build_object('target_type', r.target_type, 'reason', r.reason, 'note', r.note, 'status', r.status, 'at', r.created_at)), '[]') from reports r where r.reporter_id = u),
    'blocked', (select coalesce(jsonb_agg(jsonb_build_object('player', o.nickname, 'at', b.created_at)), '[]') from blocks b join users o on o.id = b.blocked_id where b.blocker_id = u),
    -- 球拍 / UTR / 球友（#71，11-10）：自己填的 UTR 主页编号和确认时间已在 profile 里（users 整行）；这里补改动历史、球拍、球友关系和申请
    --   球友申请：我发出的被「忽略」时导出里不显示被忽略（和界面一致，发起人永远不知道）：24 小时内算「等待中」，过期算「已失效」
    'utr_history', (select coalesce(jsonb_agg(jsonb_build_object('at', c.at, 'old_utr', c.old_utr, 'new_utr', c.new_utr, 'old_estimated', c.old_est, 'new_estimated', c.new_est) order by c.at), '[]') from utr_changes c where c.user_id = u),
    'rackets', (select coalesce(jsonb_agg(jsonb_build_object('slot', r.slot, 'brand', r.brand, 'series', r.series, 'added_at', r.created_at, 'updated_at', r.updated_at, 'brand_id', r.brand_id, 'series_id', r.series_id, 'other_text', r.other_text, 'other_brand_text', r.other_brand_text, 'nickname', r.nickname) order by r.slot), '[]') from user_rackets r where r.user_id = u),
    'catalogue_submissions', (select coalesce(jsonb_agg(jsonb_build_object('text', t.text, 'created_at', t.created_at) order by t.created_at), '[]') from catalogue_submissions t where t.user_id = u),
    'buddies', (select coalesce(jsonb_agg(jsonb_build_object('player', o.nickname, 'since', b.created_at) order by b.created_at), '[]') from buddies b join users o on o.id = case when b.user_a = u then b.user_b else b.user_a end where u in (b.user_a, b.user_b)),
    'buddy_requests', (select coalesce(jsonb_agg(jsonb_build_object('direction', case when r.from_user = u then 'sent' else 'received' end, 'player', o.nickname, 'source', r.source, 'created_at', r.created_at,
                         'status', case when r.from_user = u and r.status = 'ignored' then (case when r.expires_at > now() then 'pending' else 'expired' end) else r.status end,
                         'responded_at', case when r.from_user = u and r.status = 'ignored' then null else r.responded_at end) order by r.created_at), '[]')
                  from buddy_requests r join users o on o.id = case when r.from_user = u then r.to_user else r.from_user end where u in (r.from_user, r.to_user)),
    -- 场边（第七批 S2c，表在 ㉕）：自己的发布（含后台隐藏的、过了 24 小时在相册里的；删了的不含）、回复、点过的网球、不感兴趣、发起的话题、浏览数
    --   不含：后台隐藏原因、照片识别标签和审核结果（和前台一样拿不到）；别人给我的网球只有数量（在发布里）
    'sideline', jsonb_build_object(
      'posts', (select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'at', p.created_at, 'publish_at', p.publish_at, 'city', p.city, 'body', p.body,
                   'topic', t.title, 'floor', p.floor, 'venue', v.name, 'tone', p.tone, 'replies_open', p.replies_open,
                   'photos', (select coalesce(jsonb_agg(ph.storage_key order by ph.idx), '[]') from sb_photos ph where ph.post_id = p.id),
                   'balls', p.balls, 'replies', p.replies, 'views', p.views, 'shares', p.shares) order by p.created_at), '[]')
                from sb_posts p left join sb_topics t on t.id = p.topic_id left join venues v on v.id = p.venue_id where p.user_id = u and p.deleted_at is null),
      'replies', (select coalesce(jsonb_agg(jsonb_build_object('post', r.post_id, 'to', o.nickname, 'body', r.body, 'at', r.created_at) order by r.created_at), '[]')
                  from sb_replies r left join users o on o.id = r.to_user where r.user_id = u and r.deleted_at is null),
      'balls_given', (select coalesce(jsonb_agg(jsonb_build_object('post', b.post_id, 'at', b.created_at) order by b.created_at), '[]') from sb_balls b where b.user_id = u),
      'not_interested', (select coalesce(jsonb_agg(jsonb_build_object('post', h.post_id, 'reason', h.reason, 'at', h.created_at) order by h.created_at), '[]') from sb_hides h where h.user_id = u),
      'topics_started', (select coalesce(jsonb_agg(jsonb_build_object('title', t.title, 'at', t.created_at) order by t.created_at), '[]') from sb_topics t where t.created_by = u),
      'viewed_count', (select count(*) from sb_views w where w.viewer = u::text)),
    'account_status_history', (select coalesce(jsonb_agg(jsonb_build_object('from', l.from_status, 'to', l.to_status, 'reason', l.reason, 'at', l.created_at) order by l.created_at), '[]') from user_status_log l where l.user_id = u),
    'notifications', (select coalesce(jsonb_agg(jsonb_build_object('kind', n.kind, 'at', n.created_at, 'read_at', n.read_at) order by n.created_at), '[]') from notifications n where n.user_id = u),
    'devices', (select coalesce(jsonb_agg(jsonb_build_object('platform', d.platform, 'push_on', d.push_endpoint is not null, 'last_active_at', d.last_active_at, 'created_at', d.created_at)), '[]') from user_devices d where d.user_id = u),
    'emails_sent', (select coalesce(jsonb_agg(jsonb_build_object('subject', e.subject, 'status', e.status, 'sent_at', e.sent_at)), '[]') from email_outbox e where e.user_id = u),
    'usage_events', (select coalesce(jsonb_agg(jsonb_build_object('event', e.event, 'screen', e.screen, 'at', e.occurred_at) order by e.occurred_at), '[]') from events e where e.user_id = u)
  ) into out;
  return out;
end $$;
create or replace function job_anonymize_deleted(p_now timestamptz default now()) returns int language plpgsql security definer set search_path = public as $$
declare t0 timestamptz := clock_timestamp(); n int;
begin
  update users set phone_e164 = 'deleted:' || id, nickname = '已注销', last_initial = null, wechat_id = null, email = null, auth_id = null,
         avatar_kind = 'letter', avatar_animal = null, card_theme = 'court', gender = null, gender_review = false,
         signup_device = null, signup_ip = null, email_unsub_token = null, anonymized_at = p_now
   where status = 'deleted' and anonymized_at is null and status_since <= p_now - interval '30 days';
  get diagnostics n = row_count;
  delete from identity_links l using users u where u.id = l.user_id and u.anonymized_at = p_now;
  delete from user_devices d using users u where u.id = d.user_id and u.anonymized_at = p_now;
  delete from push_subscriptions s using users u where u.id = s.user_id and u.anonymized_at = p_now;
  delete from player_prefs p using users u where u.id = p.user_id and u.anonymized_at = p_now;
  delete from gender_changes g using users u where u.id = g.user_id and u.anonymized_at = p_now;
  delete from user_rackets r using users u where u.id = r.user_id and u.anonymized_at = p_now;
  delete from catalogue_submissions t using users u where u.id = t.user_id and u.anonymized_at = p_now;   -- 我的球拍（#60 A2）：注销即删，不保留
  delete from buddies b using users u where u.anonymized_at = p_now and u.id in (b.user_a, b.user_b);   -- 球友（#110）：注销即删，对方那边也随之消失
  delete from buddy_requests r using users u where u.anonymized_at = p_now and u.id in (r.from_user, r.to_user);
  update email_outbox e set to_email = 'deleted', status = case when e.status = 'queued' then 'skipped' else e.status end,
         skip_reason = case when e.status = 'queued' then 'email_bad' else e.skip_reason end
    from users u where u.id = e.user_id and u.anonymized_at = p_now;
  return nbq_job_log('anonymize_deleted', n, t0);
end $$;
insert into schema_migrations(version) values ('20261121_racket_series') on conflict do nothing;
