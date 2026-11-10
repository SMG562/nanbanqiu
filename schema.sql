-- =====================================================================
--  南伴球 Southern Companion · 数据库设计 v4（v3 精简版 + 屏蔽 / 游戏化）
--  PostgreSQL 15+ / Supabase + PostGIS
--  v3 变化（按“非必要不添加”原则）：
--    - 去掉：费用、已订场、审核开关、出勤率 / 迟取消记录、群聊、互评、候补
--    - 新增：user_clubs（我的 Club，可多选；拒绝定位时以 Home Club 为中心）
--    - 规则：球局默认已订场；所有申请都需发起人确认；人数按玩法自动（单打 2 / 双打 4 / 拉球 2）
-- =====================================================================

set client_min_messages = warning;   -- 迁移里大量 if not exists 的重复项只是 NOTICE，不打印
create extension if not exists postgis;
create extension if not exists pgcrypto;

create type game_type    as enum ('singles','doubles','rally');
create type surface_type as enum ('hard','clay','synclay','grass','synthetic');   -- synclay 人工红土（第 7 轮）；一个球场可以多种，见 venues.surfaces
create type game_status  as enum ('open','full','cancelled','completed');
-- 参与状态：一律软删除，行永远保留（统计、临时退出、赴约率都要用）
--   pending 待确认 · approved 已确认（发起人本人也是一行 approved，role='host'）
--   rejected 没排上（必须带 decline_reason）· expired 申请超时（decline_reason='timeout'）
--   withdrawn 申请人在确认前撤回 · left 确认后退出（这两种都必须有 left_at）
create type part_status  as enum ('pending','approved','rejected','expired','withdrawn','left');
create type part_role    as enum ('host','player');
-- 通知类型（完整清单，后面各节的 add value if not exists 只是历史记录，不会重复）
--   request_group 不是一种通知：同一局多人申请时由客户端按 game_id 合并显示，数据库里仍是多条 request
create type notif_kind   as enum ('request','approved','rejected','full','player_left','game_cancelled',
  'invite','invite_counter','invite_accepted','invite_declined','invite_expired',
  'joined','expired','recap','follow_game','badge','levelup','noshow',
  'unfilled','unfilled_end','postponed','changed','soon','reopen','chat');   -- chat = 新消息（11-04）：私信 / 球局群聊，点开去那个会话

-- ---------- 用户（手机号即账号） ----------
create table users (
  id            uuid primary key default gen_random_uuid(),
  auth_id       uuid unique,                        -- Supabase auth.users（phone OTP）
  phone_e164    text unique not null,
  nickname      text not null check (char_length(nickname) between 1 and 20),
  last_initial  char(1),                            -- 姓氏首字母（选填），卡片显示为 Jason W.
  member_no     bigint generated always as identity unique,  -- 终身球员编号 #0062，按注册顺序，永不变更
  avatar_kind   text not null default 'letter' check (avatar_kind in ('letter','animal')),
  avatar_animal text,                               -- 动物头像 key：dragon / lion / tiger / dog ...
  seal_roll     smallint not null default 0,        -- 「换一枚印」次数，决定卡片上的印型
  avatar_color  text not null default 'paper'      -- 印色：paper 宣纸白 / red / orange / olive / green / teal / sky / navy / violet / rose / cocoa / slate
                check (avatar_color in ('paper','red','orange','olive','green','teal','sky','navy','violet','rose','cocoa','slate')),
  ntrp          numeric(2,1) not null check (ntrp between 1.0 and 7.0),
  signup_source text,                               -- wechat / xhs / direct
  card_theme    text not null default 'court'       -- 球员卡主题色：court 南伴绿 / hard 硬地 / clay 红土 / grass 草地 / night 夜场
                check (card_theme in ('court','hard','clay','grass','night')),
  created_at    timestamptz not null default now()
);

-- ---------- 球场 / Club ----------
create table venues (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,                        -- 'Glen Iris Tennis Club'
  short_name  text not null,                        -- 'Glen Iris'
  suburb      text,
  location    geography(point,4326) not null,
  surface     surface_type                          -- 主场地类型（兼容字段，可空）；以 venues.surfaces（多选）为准
);
create index venues_gix on venues using gist(location);

-- ---------- 我的 Club（多选） ----------
create table user_clubs (
  user_id    uuid references users(id) on delete cascade,
  venue_id   uuid references venues(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, venue_id)
);
-- “最近常去”不存表，从已参加的球局统计（见视图 user_frequent_venues）

-- ---------- 球局 ----------
create table games (
  id            uuid primary key default gen_random_uuid(),
  share_code    text not null unique,               -- nanbanqiu.app/g/7Kq2
  host_id       uuid not null references users(id),
  venue_id      uuid not null references venues(id),
  starts_at     timestamptz not null,
  duration_min  int not null check (duration_min between 30 and 300),
  game_type     game_type not null,
  capacity      int not null,                       -- 由 game_type 决定：2 / 4 / 2
  ntrp_min      numeric(2,1) not null,
  ntrp_max      numeric(2,1) not null check (ntrp_max >= ntrp_min),
  note          text check (char_length(note) <= 60),   -- 一句话，选填
  status        game_status not null default 'open',
  cancelled_at  timestamptz,                        -- status 变成 cancelled 时由触发器 trg_games_cancelled_at 写入
  created_device text check (created_device in ('mobile','desktop')),   -- 发起时客户端上报的 device（不是 plat / 构建文件）
  created_at    timestamptz not null default now(),
  check (status <> 'cancelled' or cancelled_at is not null)
);
create index games_time_idx on games(starts_at) where status in ('open','full');

-- ---------- 参与 / 申请 ----------
create table game_participants (
  game_id     uuid not null references games(id) on delete cascade,
  user_id     uuid not null references users(id),
  role        part_role not null default 'player',
  status      part_status not null default 'pending',
  message     text check (char_length(message) <= 140),   -- “说一句”，选填
  decided_at  timestamptz,
  left_at     timestamptz,                                -- 撤回（withdrawn）/ 退出（left）的时间
  device      text check (device in ('mobile','desktop')),  -- 申请 / 加入时客户端上报的 device
  created_at  timestamptz not null default now(),
  primary key (game_id, user_id),
  check (status not in ('withdrawn','left') or left_at is not null)
);
-- 撤回后再次申请同一局：upsert 同一行（status='pending'，created_at=now()，left_at / decline_reason 清空），历史看 events
create index gp_user_idx on game_participants(user_id);

-- ---------- 通知 + 推送 ----------
create table notifications (
  id         bigserial primary key,
  user_id    uuid not null references users(id) on delete cascade,
  kind       notif_kind not null,
  game_id    uuid references games(id) on delete cascade,
  actor_id   uuid references users(id),
  read_at    timestamptz,
  pushed_at  timestamptz,
  created_at timestamptz not null default now()
);
create index notif_user_idx on notifications(user_id, created_at desc);

create table push_subscriptions (
  id          bigserial primary key,
  user_id     uuid not null references users(id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  platform    text,                                 -- ios_pwa / android / desktop
  disabled_at timestamptz,                          -- 收到 404/410 后停用
  created_at  timestamptz not null default now()
);

-- ---------- 分享链接访问（增长漏斗：小红书 → 微信群 → 链接 → 申请） ----------
create table link_visits (
  id         bigserial primary key,
  game_id    uuid references games(id) on delete set null,
  source     text,                                  -- wechat / xhs / copy
  env        text,                                  -- wechat / safari / pwa
  visitor_id text not null,
  user_id    uuid references users(id),
  created_at timestamptz not null default now()
);

-- =====================================================================
--  视图
-- =====================================================================
-- game_cards（球局卡片）放到文末「最终口径」一节创建：它用 g.*，提前建会挡住后面对 games 列的改类型

-- 已打场次 / 最近常去（不需要用户打卡，从已结束且已通过的球局统计）
create view user_frequent_venues as
select p.user_id, g.venue_id, count(*) as times, max(g.starts_at) as last_played
from game_participants p join games g on g.id=p.game_id
where p.status='approved' and g.starts_at + (g.duration_min||' minutes')::interval < now() and g.status<>'cancelled'
group by p.user_id, g.venue_id;

-- =====================================================================
--  规则：人满 → full，其余待确认申请自动婉拒；有人退出 → 重新 open
-- =====================================================================
--  满员口径（全站唯一）：approved 行数（含发起人那一行，不再 +1）+ games.filled（线下补位）>= capacity
--  只数 approved：withdrawn / left / rejected / expired 都不占位
create or replace function sync_game() returns trigger language plpgsql as $$
declare gid uuid; cap int; off int; st game_status; n int;
begin
  if tg_table_name = 'games' then gid := new.id; else gid := coalesce(new.game_id, old.game_id); end if;
  select capacity, coalesce(filled,0), status into cap, off, st from games where id=gid for update;
  if st is null or st not in ('open','full') then return null; end if;     -- 已取消 / 已结束的不动
  select count(*) into n from game_participants where game_id=gid and status='approved';
  if n + off >= cap then
    update games set status='full' where id=gid and status='open';
    with r as (update game_participants set status='rejected', decline_reason='full_auto', decided_at=now()
               where game_id=gid and status='pending' returning user_id)
    insert into notifications(user_id,kind,game_id) select user_id,'full',gid from r;
  else
    update games set status='open' where id=gid and status='full';
  end if;
  return null;
end $$;
create trigger trg_gp_sync after insert or update of status or delete on game_participants
for each row execute function sync_game();
-- games.filled（线下补位）改动也要重算，触发器见「双打缺几人」一节

-- 取消时间：status 变成 cancelled 时写 cancelled_at
create or replace function games_cancelled_at() returns trigger language plpgsql as $$
begin
  if new.status = 'cancelled' and (tg_op = 'INSERT' or old.status is distinct from 'cancelled') then
    new.cancelled_at := coalesce(new.cancelled_at, now());
  elsif new.status <> 'cancelled' then
    new.cancelled_at := null;
  end if;
  return new;
end $$;
create trigger trg_games_cancelled_at before insert or update of status on games
for each row execute function games_cancelled_at();

-- 发起人本人一定是一行 approved / role='host'：发布球局时由触发器补上（API 不要再插发起人那一行）
create or replace function games_host_row() returns trigger language plpgsql as $$
begin
  insert into game_participants(game_id, user_id, role, status, decided_at, device)
  values (new.id, new.host_id, 'host', 'approved', now(), new.created_device)
  on conflict (game_id, user_id) do nothing;
  return null;
end $$;
create trigger trg_games_host_row after insert on games
for each row execute function games_host_row();

-- =====================================================================
--  API
-- =====================================================================
--  POST   /api/auth/otp/send   { phone }
--  POST   /api/auth/otp/verify { phone, code }   → { user, is_new }（refresh token 存 httpOnly Cookie）
--  PATCH  /api/me              { nickname, ntrp }
--  PUT    /api/me/clubs        { venue_ids: [] }
--  GET    /api/games?date&lat&lng&radius_km(2|5|10|20|50，上限 50)&levels&types&club_ids   —— 已排除屏蔽关系
--  GET    /api/games/:code     详情 / 分享落地页（记录 link_visits）
--  POST   /api/games           { venue_id, starts_at, duration_min, game_type, ntrp_min, ntrp_max, note }
--  PATCH  /api/games/:id       { status:'cancelled' }                  仅发起人
--  POST   /api/games/:id/requests          { message }
--  PATCH  /api/games/:id/requests/:user_id { decision: approve|reject } 仅发起人
--  DELETE /api/games/:id/requests/me       撤回申请 / 取消参加（软删除：pending → withdrawn，approved → left，写 left_at；不需原因；已通过的会通知发起人）
--  GET    /api/me/games        时间轴：发起的 + 申请过的（前端按时间分“即将开始 / 已结束”）
--  GET    /api/notifications   PATCH /api/notifications/read
--  POST   /api/push/subscriptions   DELETE /api/push/subscriptions
--  GET    /g/:code  (SSR + OG)      GET /og/:code.png

-- =====================================================================
--  v4 新增：屏蔽（首期上线）
--  规则：任一方屏蔽 → 双方互相看不到对方发起的球局（含分享链接）、不能申请；
--        屏蔽时对方在我球局里的待确认申请自动婉拒；对方不会收到任何通知。
-- =====================================================================
create table blocks (
  blocker_id  uuid not null references users(id) on delete cascade,
  blocked_id  uuid not null references users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index blocks_blocked_idx on blocks(blocked_id);

create or replace function is_blocked(a uuid, b uuid) returns boolean language sql stable as $$
  select exists (select 1 from blocks where (blocker_id=a and blocked_id=b) or (blocker_id=b and blocked_id=a))
$$;
-- RLS（games select）：using ( not is_blocked(auth_user_id(), host_id) )
-- 申请前校验：insert into game_participants 时 not is_blocked(user_id, games.host_id)

-- 举报：站内（球员卡 / 聊天，reports.source = in_app）+ 邮件 safety@nanbanqiu.app 由管理员录入（source = email），见文末 ⑥

-- =====================================================================
--  v4 新增：游戏化（全部由系统自动记分，用户无需签到 / 打卡）
--  【已废弃】积分 / 积分等级（points_ledger · point_kind）和下面的 kudos 表只为兼容保留，不再写入、不参与任何视图。
--  等级唯一口径 = 「成长体系 v3」规则（users.level 当前等级 + user_level_log 首次达到记录）；好评 = impressions。
-- =====================================================================
create type point_kind as enum ('played','hosted','kudos','streak_week','invite');

-- 积分流水（【已废弃】，保留表结构以兼容旧数据）
create table points_ledger (
  id          bigserial primary key,
  user_id     uuid not null references users(id) on delete cascade,
  kind        point_kind not null,
  points      int not null,                 -- played +20 / hosted +50 / kudos +10 / streak_week +5 / invite +30
  game_id     uuid references games(id) on delete set null,
  ref_user_id uuid references users(id),    -- kudos 来源 / 被邀请人
  created_at  timestamptz not null default now(),
  unique (user_id, kind, game_id, ref_user_id)   -- 防重复记分
);
create index pl_user_idx on points_ledger(user_id, created_at desc);

-- 赛后点赞（【已废弃】→ 迁移为 impressions，一键点赞也写 impressions）
create table kudos (
  game_id    uuid not null references games(id) on delete cascade,
  from_id    uuid not null references users(id),
  to_id      uuid not null references users(id),
  created_at timestamptz not null default now(),
  primary key (game_id, from_id, to_id),
  check (from_id <> to_id)
);

-- 已获得的徽章（唯一定义；徽章规则放在代码里：first / ten / fifty / hundred / host10 / night / early / surface / explorer / streak / kudos / partner）
-- 条件达成即写入（获得后永久保留，球局取消、数字回落都不收回）；seen_at 为空 = 还没庆祝过
create table user_badges (
  user_id   uuid not null references users(id) on delete cascade,
  code      text not null,
  earned_at timestamptz not null default now(),
  game_id   uuid references games(id) on delete set null,   -- 触发这枚徽章的球局（如果有）
  seen_at   timestamptz,                   -- 看过获得动画的时间：每枚只庆祝一次
  shared_at timestamptz,                   -- 生成过分享图（统计用）
  primary key (user_id, code)
);

-- 球员卡汇总视图 player_cards：按 v3 口径在文末「最终口径」一节创建（原来按积分算等级的版本已废弃）

-- 结算任务（每 15 分钟，Edge Function / cron）：
--   1.–3. 【已废弃】积分结算（played / hosted / streak_week / invite）不再执行
--   4. 对刚结束的球局：按 v3 规则重算相关用户的场次 / 等级（users.level、user_level_log）和徽章，新获得的写入 user_badges 并发通知 badge

-- 新增 API
--  GET    /api/players/:id/card        球员卡（NTRP、等级、积分、数据、徽章）
--  GET    /p/:member_no                 球员卡分享页（导出图二维码指向这里；SSR + OG 图 /og/p/:member_no.png；可一键申请一起打球）
--  POST   /api/players/:id/kudos {game_id}   在 TA 的球员卡上单独点赞（14 天内一起打过、每场每人一次）  → 写 impressions（不写已废弃的 kudos 表）
--  PATCH  /api/me {last_initial, card_theme, avatar_kind, avatar_animal, avatar_color, seal_roll}   修改球员卡与头像
--  POST   /api/blocks {user_id}         DELETE /api/blocks/:user_id      GET /api/blocks

-- =====================================================================
-- 约 TA 打球（结构化邀约）
--   入口唯一：对方球员卡 / 分享页 /p/:member_no 上的「约 TA 打球」
--   结果：接受后生成 visibility='private' 的 2 人球局，不出现在发现页
-- =====================================================================
alter table users add column wechat_id          text;                             -- 仅在私人球局中、双方都开启时互相可见

alter table games add column venue_name text;   -- 私人球局可用自填场地
alter table games alter column venue_id drop not null;
alter table games add column visibility text not null default 'public'
  check (visibility in ('public','private'));
alter table games add constraint games_venue_chk check (venue_id is not null or (visibility='private' and venue_name is not null)) not valid;
create index games_public_idx on games(starts_at) where visibility='public' and status<>'cancelled';
-- GET /api/games 一律加 where visibility='public'；私人球局只经 /api/me/games 与通知进入

alter table game_participants add column show_wechat boolean not null default false;  -- 私人球局中向对方展示微信号

alter type notif_kind add value if not exists 'invite';           -- 收到邀约
alter type notif_kind add value if not exists 'invite_counter';   -- 对方换了个时间，待你确认
alter type notif_kind add value if not exists 'invite_accepted';  -- 邀约成立（附 game_id）
alter type notif_kind add value if not exists 'invite_declined';  -- 对方暂不（过期另发 invite_expired）

create type invite_status as enum ('pending','counter','accepted','declined','expired');

create table invites (
  id            uuid primary key default gen_random_uuid(),
  from_user     uuid not null references users(id) on delete cascade,
  to_user       uuid not null references users(id) on delete cascade,
  starts_at     timestamptz not null,                   -- 具体开始时间（06:00–21:30，半点粒度）
  ends_at       timestamptz not null,                   -- = starts_at + 所选时长
  venue_id      uuid references venues(id),             -- 默认发起人第一个 Home Club；可选其他球场
  venue_name    text check (char_length(venue_name) <= 40),  -- 或自己填写的场地（venue_id 为空时必填）
  game_type     text not null check (game_type in ('singles','rally')),
  note          text check (char_length(note) <= 30),
  status        invite_status not null default 'pending',
  -- 换个时间（仅一次）：对方给出具体时段 / 场地，发回发起人确认
  counter_starts_at timestamptz,
  counter_ends_at   timestamptz,
  counter_venue_id  uuid references venues(id),
  counter_venue_name text,
  countered_at      timestamptz,
  game_id       uuid references games(id),              -- accepted 后生成的私人球局
  created_at    timestamptz not null default now(),
  expires_at    timestamptz not null default now() + interval '48 hours',
  responded_at  timestamptz,
  check (from_user <> to_user),
  check (ends_at - starts_at in (interval '60 minutes', interval '90 minutes', interval '120 minutes')),  -- 时长只有 1 / 1.5 / 2 小时
  check (starts_at < created_at + interval '7 days'),   -- 只能约接下来一周；开始时间为整点或半点
  check (venue_id is not null or venue_name is not null)
);
create index invites_to_idx   on invites(to_user, status);
create index invites_from_idx on invites(from_user, created_at desc);
-- 同一对人同时只能有一条进行中的邀约
create unique index invites_open_pair on invites(from_user, to_user) where status in ('pending','counter');

-- 发送前校验（在 POST /api/invites 中执行，或做成 before insert trigger）：
--   1. 双向屏蔽 → 拒绝（提示“暂时无法约这位球友”，不暴露屏蔽关系）
--   2. 发起人 24 小时内已发 ≥3 条 → 拒绝
--   3. 同一接收人 30 天内 declined ≥2 次 → 拒绝
-- 过期任务（每 15 分钟）：status in ('pending','counter') and (expires_at < now() or 当前生效的 starts_at < now()) → 'expired'，通知发起人
-- 接受：事务内创建 games(visibility='private', capacity=2；自填场地时 venue_id 为空、存 games.venue_name)，发起人那一行由触发器自动补上，
--       再插入接收人一行 approved（满员由 sync_game 置为 full），
--       invites.status='accepted', game_id=…，通知发起人 invite_accepted

-- 私人球局中对方可见的微信号：仅当双方 show_wechat 都为 true
create view private_game_contacts as
select p.game_id, p.user_id as viewer, o.user_id as other_user,
       case when p.show_wechat and o.show_wechat then u.wechat_id end as wechat_id
from game_participants p
join game_participants o on o.game_id=p.game_id and o.user_id<>p.user_id and o.status='approved'
join games g on g.id=p.game_id and g.visibility='private'
join users u on u.id=o.user_id
where p.status='approved';

-- 邀约 API
--  POST   /api/invites                { to_user, starts_at, ends_at, venue_id | venue_name, game_type, note? }
--  GET    /api/invites?box=in|out     收到 / 发出的邀约
--  GET    /api/players/:id/invite-state  球员卡按钮状态：can_invite | pending_out | pending_in | counter | upcoming_game | only_played | hidden（屏蔽时）
--  POST   /api/invites/:id/accept     → 按当前时间地点生成私人球局（duration = ends_at - starts_at），返回 game_id
--  POST   /api/invites/:id/counter    { starts_at, ends_at, venue_id | venue_name }   仅接收人、仅一次 → status='counter'，发回发起人
--  POST   /api/invites/:id/decline    接收人暂不 / 发起人拒绝换的时间
--  PATCH  /api/games/:id/me           { show_wechat }            私人球局中是否展示微信号
--  PATCH  /api/me                     { wechat_id }

-- =====================================================================
-- 双打缺几人 · 每周重复 · 常一起打 · 女生局 / 新手友好
-- =====================================================================
-- 双打「缺几人」：发起时选缺 1 / 2 / 3 人；其余位置是匿名占位，不需要填是谁
alter table games add column filled smallint not null default 0 check (filled between 0 and 2);
-- 空位 = capacity - approved 人数（含发起人）- filled；满员 = approved + filled >= capacity（sync_game）
create trigger trg_games_filled_sync after update of filled, capacity on games
for each row when (old.filled is distinct from new.filled or old.capacity is distinct from new.capacity)
execute function sync_game();

-- 性别：只用于女生局，不显示在球员卡上；确认后不能自行修改（需联系我们）；冒用被举报核实后永久封号
alter table users add column gender text check (gender in ('f','m'));   -- null = 未填写
alter table users add column gender_confirmed_at timestamptz;

-- 标签（多选）：booked 场地已订 / newbie 新手友好 / match 认真比赛 / casual 轻松娱乐（与 match 互斥）/ aa AA 场地费 / women 女生局
-- 除女生局外都只是标签，任何人都能报名
alter table games add column tags text[] not null default '{}' check (tags <@ array['booked','newbie','match','casual','aa','women'] and not (tags @> array['match','casual']));
create index games_tags_idx on games using gin(tags);
-- 女生局规则（API 层强制）：
--   发起：host.gender = 'f'
--   GET /api/games：仅对 gender = 'f' 的用户返回（已加入 / 已申请的人仍能看到自己那一局）
--   GET /api/games/:code：非女生只返回 {tags:['women']}，不返回时间、地点、球友
--   POST /api/games/:id/requests：申请人 gender 必须为 'f'
--   举报「冒用」：reports(reason='gender_fake')，24 小时内人工核实

-- 每周重复：只替发起人自动发布下一场，和普通球局完全一样
--   不带上一场的任何球友、不保留位置、不通知任何人；只有发起人在自己的球局里看到「每周重复」
create table game_series (
  id          uuid primary key default gen_random_uuid(),
  host_id     uuid not null references users(id),
  weekday     smallint not null check (weekday between 0 and 6),   -- 0 = 周日
  start_time  time not null,
  duration_min smallint not null,
  venue_id    uuid not null references venues(id),
  game_type   text not null,
  filled      smallint not null default 0,
  ntrp_min    numeric(2,1) not null,   -- 希望球友的水平：和我相近 = 自己 ±0.5；不限 = 2.5–5.0
  ntrp_max    numeric(2,1) not null,
  note        text,                    -- 备注，≤60 字
  tags        text[] not null default '{}',
  active      boolean not null default true,        -- 「停止每周自动发布」→ false，已发布的那一场照常
  created_at  timestamptz not null default now()
);
alter table games add column series_id uuid references game_series(id);   -- 仅发起人可见
create unique index games_series_once on games(series_id, starts_at) where series_id is not null;
-- 发布任务（每小时）：active 的 series，未来 7 天内那一场还没发布 → insert games（发起人那一行由触发器补上），别的什么都不做

-- 常一起打（只有自己看得到）：近 180 天共同完成 ≥2 场的球友，按场次、最近一次排序
create view frequent_partners as
select a.user_id, b.user_id as partner_id, count(*) as games, max(g.starts_at) as last_at
from game_participants a
join game_participants b on b.game_id=a.game_id and b.user_id<>a.user_id and b.status='approved'
join games g on g.id=a.game_id and g.status<>'cancelled'
             and g.starts_at + make_interval(mins => g.duration_min) < now()
             and g.starts_at > now() - interval '180 days'
where a.status='approved'
  and not exists (select 1 from blocks k where (k.blocker_id=a.user_id and k.blocked_id=b.user_id) or (k.blocker_id=b.user_id and k.blocked_id=a.user_id))
group by a.user_id, b.user_id
having count(*) >= 2;

-- API
--  POST   /api/games              {…, filled, tags[], repeat_weekly:bool}
--  PATCH  /api/series/:id         {active:false}
--  GET    /api/me/partners        常一起打（含上一场的星期 / 时间 / 场地，用于一键再约预填）
--  GET    /api/games?…&tags=women,newbie
--  PATCH  /api/me                 {gender}   仅当 gender 为空时可设置


-- =====================================================================
-- 第 4 轮：UTR · 场地信息 · 积分与等级 · 性别修改限制 · 标签
-- =====================================================================
-- 水平统一改用 UTR（1.00–16.50，界面显示一位小数）
alter table users rename column ntrp to utr;                 -- numeric(4,2)
alter table users alter column utr type numeric(4,2);
alter table users add column utr_estimated boolean not null default false;   -- 没有 UTR 时按描述估的（≈）
alter table games rename column ntrp_min to utr_min;         -- 「不限」= 1.00 – 16.50
alter table games rename column ntrp_max to utr_max;
alter table games alter column utr_min type numeric(4,2);
alter table games alter column utr_max type numeric(4,2);
-- 改名不会改约束：原来的 ntrp 1.0–7.0 检查要换成 UTR 的 1.00–16.50，否则 UTR ≥ 7 的人注册即报错
alter table users drop constraint if exists users_ntrp_check;
alter table users add constraint users_utr_check check (utr between 1.00 and 16.50);
-- 每周重复（game_series）同样改用 UTR；numeric(2,1) 存不下 10 以上的 UTR
alter table game_series rename column ntrp_min to utr_min;
alter table game_series rename column ntrp_max to utr_max;
alter table game_series alter column utr_min type numeric(4,2);
alter table game_series alter column utr_max type numeric(4,2);
-- 发起时：和我相近 = 自己 ±1.0；不限；自己选（最低 / 最高，步长 0.5）
-- 申请时：低于下限 0.5 以上或高于上限 1.0 以上，提醒「水平有差距」，但不拦

-- 场地：一个 Club 可以有多种场地
-- 简称唯一范围 = (short_name, suburb)：不同区允许同名（St James TC 在 Brighton 和 Coburg North 各有一家），同一个区里不能重名；
--   界面上凡是只显示简称、可能撞名的地方一律显示「简称 · 所在区」。suburb 为空的也算一组（nulls not distinct，PG15+）
--   名录数据修正：v253（St James Tennis Club）的区应为 Coburg North（不是 Brighton），导入前先改正区，否则会撞这条约束
alter table venues add constraint venues_short_name_suburb_key unique nulls not distinct (short_name, suburb);   -- Malvern TC / Malvern East / Central Park
alter table venues add column surfaces    text[] not null default '{}'   -- {clay,hard} → 显示「红土 / 硬地」；以这一列为准（surface 只是主类型）
  check (surfaces <@ array['hard','clay','synclay','grass','synthetic']);
alter table venues add column courts      smallint;
alter table venues add column lights      boolean not null default false;
alter table venues add column indoor      boolean not null default false;
alter table venues add column booking_url text;
-- 球场可见性：唯一的状态列（取代 verified / review_status / 名录导入时的 nosub · outside，三者只保留为只读兼容列）
--   active 公开 · pending 用户添加待审核（只在添加人自己的球局里显示）· hidden 后台下线 · merged 已合并到 merged_into
--   rejected 驳回 · nosub 缺所在区 · outside 不在服务范围（后三种只在后台显示）
alter table venues add column status      text not null default 'active'
  check (status in ('active','pending','hidden','merged','rejected','nosub','outside'));
create table venue_suggestions (             -- 用户「建议修改场地信息」，后台审核后更新 venues
  id         uuid primary key default gen_random_uuid(),
  venue_id   uuid references venues(id),     -- null = 新场地
  user_id    uuid not null references users(id),
  payload    jsonb not null,                 -- {name, short_name, surfaces, courts, lights, indoor, booking_url, lat, lng}
  status     text not null default 'pending' check (status in ('pending','applied','rejected')),
  created_at timestamptz not null default now()
);
-- 后台：Club 列表（筛选 suburb / 场地类型 / 状态）→ 编辑简称、场地类型（多选）、片数、夜灯、室内、订场链接、坐标；处理用户建议

-- 标签（多选）：booked 场地已订 / newbie 新手友好 / match 认真比赛 / casual 轻松娱乐 / drill 练球为主 / newballs 开新球 / women 女生局
-- match 与 casual、drill 互斥；水平选「不限」时默认勾上 newbie
alter table games drop constraint if exists games_tags_check;
alter table games add constraint games_tags_check check (tags <@ array['booked','newbie','match','casual','drill','newballs','women'] and not (tags @> array['match','casual']) and not (tags @> array['match','drill']));
-- 「新手友好」筛选 = 带 newbie 标签，或 utr_min ≤ 3

-- 性别修改限制（v2）：首次填写立即生效；女→男随时可以；男→女一生只能一次（gender_m2f_at 非空即已用过），立即生效
-- （v1 的「最多 2 次 / 30 天冷静期 / 超次审核」已废弃；gender_review 只保留给人工核实冒用）
alter table users add column gender_changes smallint not null default 0;
alter table users add column gender_m2f_at  timestamptz;
alter table users add column gender_review  boolean not null default false;
create table gender_changes (user_id uuid not null references users(id), from_g text, to_g text, created_at timestamptz not null default now());
-- 能看女生局 = gender='f' and not gender_review
-- PATCH /api/me {gender}：from='m' and to='f' and gender_m2f_at is not null → 409 gender_m2f_used

-- 【已废弃】积分与等级（v1，已被「成长体系 v3」取代，仅保留记录）
--   打完一场 +10 · 组织一场（≥1 人加入并打完）+20 · 被点赞 +5 · 连续每周都打 +5/周 · 邀请的新朋友打完第一场 +20 · 开打前 24 小时内退出 −10
--   新球友 0 · 活跃球友 100 · 老球友 300 · 铁杆球友 800 · 元老 2000
alter type point_kind add value 'late_leave';
-- 发现页：同一天超过 30 局时，只返回离你最近的 30 局（自己的球局始终返回），并告诉前端还有多少局未显示

-- =====================================================================
-- 第 5 轮：球员编号展示 · 球友等级（四个隐藏分）· 社区印象
-- =====================================================================
-- 球员编号：后台 9 位（member_no 1 – 999,999,999，按注册顺序，前 100 号留给团队 / 种子用户，注销不回收）
--   展示：不足 4 位补到 4 位（0001 · 0062），超过就原样显示（10001 · 100001），不展示多余的 0
--   分享链接同理：/p/0062 · /p/10001；服务端同时兼容 /p/62、/p/000000062
alter table users add constraint users_member_no_range check (member_no between 1 and 999999999);

-- 社区印象：打完球后给某一位球友留 1–3 个（不是打分，每场每人一次，只统计次数）
create type impression_kind as enum ('ontime','kind','partner','serious','fun','share','newbie');
create table impressions (
  game_id    uuid not null references games(id) on delete cascade,
  from_id    uuid not null references users(id),
  to_id      uuid not null references users(id),
  kinds      impression_kind[] not null check (cardinality(kinds) >= 1),   -- 不限个数，点一下即送出，再点撤回
  created_at timestamptz not null default now(),
  primary key (game_id, from_id, to_id),
  check (from_id <> to_id)
);
-- 只能在一起完成的球局结束后 14 天内给；原 kudos 表迁移为 impressions

-- 到场记录：发起人赛后可标记「没来」（对方可申诉），用于赴约率
alter table game_participants add column attendance text check (attendance in ('came','no_show'));

-- 【已废弃】球友等级 v1：四个隐藏分（user_scores / stage_history 不再写入；等级以「成长体系 v3」+ user_level_log 为准）
create table user_scores (
  user_id       uuid primary key references users(id) on delete cascade,
  participation smallint not null,   -- 参与 30%：完成的球局、持续每周来（登录、刷页面不算）
  trust         smallint not null,   -- 可信 30%：赴约率、爽约、临时退出、被核实的举报、手机验证
  kindness      smallint not null,   -- 友善 25%：收到的印象（按场均）、「新手友好」、被举报
  contribution  smallint not null,   -- 贡献 15%：组织有人加入的球局、带新朋友完成首场、完善资料 / 场地信息
  community     smallint not null,   -- = .30P + .30T + .25K + .15C
  stage         smallint not null,   -- Lv1 初见 · Lv2 相伴 · Lv3 常伴 · Lv4 挚友 · Lv5 南伴之光
  updated_at    timestamptz not null default now()
);
-- 阶段门槛（社区分 + 硬条件）：
--   相伴     ≥40 · 完成 3 场
--   常伴     ≥60 · 10 场 · 赴约率 ≥90%
--   挚友     ≥80 · 30 场 · 赴约率 ≥97% · 收到 25 次印象
--   南伴之光 ≥90 · 60 场 · 180 天内零爽约 · 收到 60 次印象 · 零被核实的举报
-- 旅程会后退（v1，已废弃；现行规则见 v3：近 90 天爽约 ≥2 次最高 Lv3，≥4 次最高 Lv2）
create table stage_history (user_id uuid not null references users(id), from_stage smallint, to_stage smallint, reason text, created_at timestamptz not null default now());

-- =====================================================================
-- 第 6 轮：消息 · 新增球场 · UTR 区间筛选
-- =====================================================================
-- 消息：球局群聊（同局已确认的人）+ 球友私信（一起打过球 / 同在一局 / 有过邀约的人才能发起）
create table threads (
  id         uuid primary key default gen_random_uuid(),
  kind       text not null check (kind in ('game','dm')),
  game_id    uuid references games(id) on delete cascade,      -- kind='game'
  user_a     uuid references users(id),                         -- kind='dm'，user_a < user_b
  user_b     uuid references users(id),
  created_at timestamptz not null default now(),
  check ((kind='game' and game_id is not null) or (kind='dm' and user_a is not null and user_b is not null and user_a<user_b))
);
create unique index threads_game_uq on threads(game_id) where kind='game';
create unique index threads_dm_uq on threads(user_a,user_b) where kind='dm';
create table messages (
  id         bigserial primary key,
  thread_id  uuid not null references threads(id) on delete cascade,
  sender_id  uuid not null references users(id),
  body       text not null check (char_length(body) between 1 and 200),   -- 只能发文字，不允许链接
  created_at timestamptz not null default now(),
  hidden     boolean not null default false                               -- 被举报核实后隐藏
);
create index messages_thread_idx on messages(thread_id, created_at);
create table thread_reads (thread_id uuid references threads(id) on delete cascade, user_id uuid references users(id), last_read_at timestamptz not null, primary key(thread_id,user_id));
-- 球局群聊在开打 48 小时后关闭（只读）；屏蔽后双方互相看不到消息；新消息推送；可举报单条消息

-- 用户添加的球场：先只在添加人的球局里显示，后台核实后公开
alter table venues add column added_by uuid references users(id);
alter table venues add column verified boolean generated always as (status = 'active') stored;   -- 兼容列（只读）：= status='active'；用户添加的新建为 status='pending'

-- UTR 筛选：一个区间 [utr_lo, utr_hi]（双滑块，步长 0.5，13+ 视为不封顶），返回与球局水平区间有交集的球局
-- GET /api/games?…&utr_lo=3&utr_hi=5

-- 第 7 轮
-- 场地类型增加 synclay（人工红土）：venues.surfaces ⊂ {hard, clay, synclay, grass, synthetic}
-- 【已废弃】球友等级：友善度硬门槛（v1 隐藏分体系，已被 v3 取代）
-- UTR 筛选恢复为多选区间：1–3 · 3–5 · 5–7 · 7–8 · 8+

-- ============ 婉拒理由（发起人不说「拒绝」，申请人只看到温和的一句话） ============
ALTER TABLE game_participants ADD COLUMN IF NOT EXISTS decline_reason text
  CHECK (decline_reason IN ('full','level','time','pass'));
-- （历史版本；最终取值见「多人申请 · 婉拒 v2」：known / level / pass + 系统 full_auto / timeout / blocked）另可附一句话 decline_note（≤30 字）
-- 申请人端状态文案统一为「没排上」，不显示「拒绝 / 未通过」

-- ============ 球员卡分享 ============
-- 分享链接 = /p/<member_no 显示码>，与球员卡背面二维码同一地址；未登录也能看卡，约球需登录

-- =====================================================================
-- 数据与后台（埋点 · 指标 · 运营后台 · 审核）
-- 原则：只记行为，不记聊天内容 / 手机号 / 精确坐标；用户可在「我的 → 使用数据」关闭；
--       原始事件保留 13 个月后删除，聚合指标长期保留；后台所有敏感操作留审计日志
-- =====================================================================
-- analytics_opt_out 是服务端唯一的准绳（前端开关只是同步它）：为 true 时服务端丢弃该用户的客户端事件，也不写服务端事件
--   （数据库兜底：events 上的 trg_events_opt_out 直接丢弃这类行）；只保留业务表里本来就要有的数据
alter table users add column if not exists analytics_opt_out boolean not null default false;
alter table users add column if not exists last_active_at timestamptz;
alter table users add column if not exists signup_source text;          -- utm_source / ref / 分享链接 / 二维码

-- 原始事件：按月分区；前端每 10 秒攒批 POST /api/events（sendBeacon），服务端补 received_at / suburb / 设备
create table events (
  id           bigserial,
  occurred_at  timestamptz not null,
  received_at  timestamptz not null default now(),
  user_id      uuid references users(id) on delete set null,   -- 未登录为空
  anon_id      text not null,                                  -- 设备匿名 ID，登录后通过 identity_links 归并
  session_id   text not null,
  build        text not null check (build in ('pwa','web')),   -- = 客户端公共字段 build：哪个构建文件（PWA / Web），不能用来做手机 / 电脑拆分（原 platform 列，已改名）
  event        text not null,                                  -- 见 event_definitions
  screen       text,
  game_id      uuid,                                           -- 冗余出来方便按球局 / 球场统计
  venue_id     uuid,
  suburb       text,                                           -- 服务端由 IP 或用户常用区推出，只到区
  app_version  text,
  device       text check (device in ('mobile','desktop')),    -- = 客户端 device 字段；平台拆分（手机 / 电脑）一律用这一列
  props        jsonb not null default '{}',
  primary key (id, occurred_at)
) partition by range (occurred_at);
-- 分区：上线时一次建到 2027-12，另有 DEFAULT 分区兜底（日期超出范围的事件也能写入，不会报错）
--   之后用 pg_partman 每月预建：select partman.create_parent('public.events','occurred_at','native','1 month', p_premake => 3);
--   建新月分区前，若 DEFAULT 里已有该月的行，要先把这些行挪出（partman 的 partition_data_proc 会处理）
do $$
declare m date := date '2026-10-01';
begin
  while m < date '2028-01-01' loop
    execute format('create table if not exists %I partition of events for values from (%L) to (%L)',   -- 边界按 UTC，与会话时区无关
                   'events_' || to_char(m, 'YYYY_MM'), m::text || ' 00:00+00', (m + interval '1 month')::date::text || ' 00:00+00');
    m := (m + interval '1 month')::date;
  end loop;
end $$;
create table if not exists events_default partition of events default;
create index on events (event, occurred_at);
create index on events (user_id, occurred_at);
create index on events (venue_id, occurred_at);
create index on events using gin (props jsonb_path_ops);

create table sessions (
  session_id  text primary key,
  anon_id     text not null,
  user_id     uuid references users(id) on delete set null,
  build       text not null check (build in ('pwa','web')),   -- 构建文件（pwa / web），不用于平台拆分（原 platform 列，已改名）
  device      text check (device in ('mobile','desktop')),    -- 平台拆分用这一列
  started_at  timestamptz not null,
  last_event_at timestamptz,                                  -- 服务端收到该会话最后一个事件的时间
  ended_at    timestamptz,                                    -- 服务端写入：30 分钟没有新事件 → ended_at = last_event_at（客户端不上报）
  landing     text,
  referrer    text,
  utm_source  text, utm_medium text, utm_campaign text,
  standalone  boolean,                                        -- 是否从主屏幕（已安装 PWA）打开
  events_n    int not null default 0
);
-- 设备匿名 ID ↔ 账号：多对多。同一台设备上两个人先后登录，各自一条，绝不把两个账号合并；
--   关联时机 = 服务端收到 login_success；统计时按 (anon_id, 时间) 找当时登录的那个人，不能只按 anon_id 归并
create table identity_links (
  anon_id   text not null,
  user_id   uuid not null references users(id) on delete cascade,
  linked_at timestamptz not null default now(),
  primary key (anon_id, user_id)
);
create index identity_links_user on identity_links(user_id);

-- 退出「使用数据」的用户：事件在入库时丢弃（服务端已先过滤，这里兜底）
create or replace function events_drop_opted_out() returns trigger language plpgsql as $$
begin
  if new.user_id is not null and exists (select 1 from users u where u.id = new.user_id and u.analytics_opt_out) then
    return null;
  end if;
  return new;
end $$;
create trigger trg_events_opt_out before insert on events
for each row execute function events_drop_opted_out();

-- 事件字典：后台「埋点字典」页读这张表；新增埋点先改 events_spec.md，再同步这里、前台两端和后台 EVDEF
--   唯一来源 = events_spec.md（事件字典 v2）：event / category / description / props / source 逐字与它一致（C → client，S → server）
--   下面是 upsert（可重复执行）：spec 里的 116 个事件 status='active'；spec 末尾列出的旧名 status='deprecated' 并写 replaced_by；
--   表里其他不在 spec 里的名字（早期版本登记过的 game_create / day_change / mode_change / filter_change / a2hs_guide_open …）一律标为 deprecated
--   公共字段（每条事件都带，不在 props 里登记）：ev, at, uid, anon, sid, device(mobile|desktop), build(pwa|web), env, os, scr, props
create table event_definitions (
  event        text primary key,
  category     text not null,        -- 访问 / 安装 / 隐私 / 登录 / 发现 / 球局 / 分享 / 球员卡 / 打完之后 / 邀约 / 安全 / 成长 / 通知 / 消息 / 我的
  description  text not null,
  props        text not null default '',   -- 属性名列表，与 events_spec.md 的 props 列逐字一致，例：'game_id, venue_id, type, utr'
  source       text not null default 'client' check (source in ('client','server')),   -- client 前端两端上报（同名同 props）/ server 服务端写入
  added_in     text,                 -- 版本号
  status       text not null default 'active' check (status in ('active','deprecated')),
  replaced_by  text                  -- 废弃名合并到哪个事件（为空 = 直接删除，不再上报）
);
insert into event_definitions (event,category,description,props,source,status,replaced_by) values
 ('session_start','访问','新会话开始（身份恢复之后再发）','entry(share/external/direct/push), ref, landing(路径+hash), utm_source, utm_medium, utm_campaign, s, f, source(manifest ?source=), standalone, lang, vw','client','active',null),
 ('page_view','访问','切换页面（含首屏、分享落地页）','screen, entry','client','active',null),
 ('page_time','访问','离开页面时停留时长','screen, ms','client','active',null),
 ('app_hide','访问','页面转到后台','','client','active',null),
 ('app_show','访问','页面回到前台','','client','active',null),
 ('pwa_install_prompt','安装','浏览器给出安装提示','','client','active',null),
 ('pwa_installed','安装','安装完成','os','client','active',null),
 ('pwa_first_launch','安装','第一次从主屏幕打开','os','client','active',null),
 ('a2hs_open','安装','打开「添加到主屏幕」引导','env','client','active',null),
 ('analytics_off','隐私','关闭使用数据（发完这一条后停止）','','client','active',null),
 ('analytics_on','隐私','重新打开使用数据','','client','active',null),
 ('login_open','登录','打开登录（含被动触发）','trigger(apply/create/invite/chat/manual/sideline/...)','client','active',null),
 ('login_send_code','登录','发送验证码（号码格式通过才发）','cc','client','active',null),
 ('login_verify','登录','提交验证码','ok','client','active',null),
 ('login_success','登录','登录成功','is_new, trigger, entry','client','active',null),
 ('signup_complete','登录','新用户填完资料','ntrp, clubs_n, gender_given, avatar_kind','client','active',null),
 ('logout','登录','退出登录（之后换新 anon）','','client','active',null),
 ('account_blocked','账号','点到账号状态不允许的操作，看到说明','action, status','client','active',null),
 ('account_delete','账号','本人注销账号（确认之后）','upcoming_left, hosted_cancelled','client','active',null),
 ('account_restore','账号','注销 30 天内登录后恢复账号','','client','active',null),
 ('filter_open','发现','打开筛选','','client','active',null),
 ('filter_reset','发现','重置筛选','','client','active',null),
 ('filter_utr_band','发现','切换 UTR 段','band, on','client','active',null),
 ('filter_type','发现','切换玩法','type, on','client','active',null),
 ('filter_tag','发现','切换场景标签','tag, on','client','active',null),
 ('filter_radius','发现','选距离','km','client','active',null),
 ('day_select','发现','换日期 / 翻页','offset, via(strip/pager/next_day)','client','active',null),
 ('view_mode','发现','日程 / 地图切换','mode','client','active',null),
 ('loc_suburb_pick','发现','选区','suburb, via(search/recent/hot/letter/club)','client','active',null),
 ('location_allow','发现','定位授权结果','result(granted/denied/outside)','client','active',null),
 ('map_day','发现','地图上换天','day','client','active',null),
 ('map_cluster_open','发现','点开地图上的球场','venue_id','client','active',null),
 ('game_select','球局','列表里选中（未进详情，PWA 预览）','game_id','client','active',null),
 ('game_view','球局','打开球局详情（每次打开只记一次）','game_id, venue_id, type, utr, via(list/map/chat/notif/card/mine/detail/link/share_link)','client','active',null),
 ('women_lock_view','球局','看到女生局锁定页','game_id, logged_in','client','active',null),
 ('game_create_start','球局','打开发起表单','','client','active',null),
 ('game_create_submit','球局','发布成功','game_id, type, venue_id, minutes_to_start, dur, utr_min, utr_max, join_mode(approve/instant), hide_done, repeat, spots, women','client','active',null),
 ('game_edit','球局','修改成功','game_id, fields, minutes_to_start, approved_n','client','active',null),
 ('game_postpone','球局','顺延成功','game_id, from, to','client','active',null),
 ('unfilled_action','球局','还缺人时发起人的处理','game_id, action(share/widen/delay/cancel/again)','client','active',null),
 ('game_cancel_open','球局','打开取消球局','game_id','client','active',null),
 ('game_cancel','球局','取消成功','game_id, minutes_to_start, approved_n, pending_n','client','active',null),
 ('game_apply_open','球局','打开申请','game_id','client','active',null),
 ('game_apply_submit','球局','申请成功','game_id, minutes_to_start, played_n, avatar_kind, has_message','client','active',null),
 ('game_join_instant','球局','直接加入成功','game_id, minutes_to_start','client','active',null),
 ('apply_withdraw','球局','撤回申请','game_id','client','active',null),
 ('game_leave_open','球局','打开退出','game_id','client','active',null),
 ('game_leave','球局','退出成功','game_id, minutes_to_start, grace, after_change','client','active',null),
 ('host_decide','球局','发起人接受 / 婉拒','game_id, target_uid, ok, reason(known/level/pass), has_note, viewed_card, ms_since_request','client','active',null),
 ('host_decline_open','球局','打开婉拒理由','game_id, target_uid','client','active',null),
 ('req_sort','球局','申请列表换排序','game_id, sort','client','active',null),
 ('req_expand','球局','展开收起的申请','game_id','client','active',null),
 ('game_share_open','分享','打开球局分享','game_id','client','active',null),
 ('share_copy_link','分享','复制球局链接','game_id','client','active',null),
 ('share_copy_text','分享','复制球局文案（发微信群）','game_id','client','active',null),
 ('share_system','分享','系统分享','game_id','client','active',null),
 ('poster_open','分享','打开小红书海报','game_id','client','active',null),
 ('poster_download','分享','保存海报','game_id','client','active',null),
 ('share_xhs_copy','分享','复制小红书文案','game_id','client','active',null),
 ('calendar_add','球局','加入日历','game_id','client','active',null),
 ('card_view','球员卡','查看球员卡','target_uid, own, via(list/map/chat/notif/card/mine/detail/link/recap/request)','client','active',null),
 ('card_custom_open','球员卡','打开个性化','days_since_signup','client','active',null),
 ('card_customize','球员卡','改了一项（即时生效）','field(seal/animal/color/theme/avatar_kind), value','client','active',null),
 ('card_share_open','球员卡','打开分享球员卡','target_uid','client','active',null),
 ('card_share','球员卡','分享 / 保存 / 复制链接','channel(moments/xhs), action(go/save/link), ok','client','active',null),
 ('card_share_error','球员卡','分享失败','reason','client','active',null),
 ('card_image_render','球员卡','分享图生成耗时','ms, ok','client','active',null),
 ('pref_set','打完之后','多遇到 / 随缘 / 少遇到','target_uid, value(more/ok/less), prev, via(recap/card)','client','active',null),
 ('invite_open','邀约','打开约 TA 表单','target_uid, played_together','client','active',null),
 ('invite_send','邀约','邀约发出成功','invite_id, target_uid, played_together','client','active',null),
 ('invite_accept','邀约','接受邀约','invite_id','client','active',null),
 ('invite_decline','邀约','婉拒邀约','invite_id, reason(week/rest/pass), has_note','client','active',null),
 ('invite_counter_send','邀约','提议新时间','invite_id','client','active',null),
 ('invite_withdraw','邀约','撤回邀约 / 撤回新时间','invite_id, what(invite/counter)','client','active',null),
 ('invite_setting','邀约','「谁可以约我」','value(all/played/none)','client','active',null),
 ('recap_open','打完之后','打开赛后卡片','game_id, via(notif/detail)','client','active',null),
 ('feel_set','打完之后','这局感受','game_id, value(hard/ok/easy)','client','active',null),
 ('impression_give','打完之后','留个好印象（含撤回）','target_uid, tag, on, bulk','client','active',null),
 ('recap_done','打完之后','点完成','game_id, n_set','client','active',null),
 ('noshow_report','安全','反馈 TA 没来','game_id, target_uid, role(host/player)','client','active',null),
 ('noshow_undo','安全','撤回没来反馈','game_id, target_uid','client','active',null),
 ('noshow_appeal','安全','爽约申诉','game_id, reason','client','active',null),
 ('badge_view','成长','打开徽章详情 / 庆祝页','code, via(ceremony/wall/card/notif)','client','active',null),
 ('badge_share','成长','徽章分享','code, to(moments/xhs), action(save/copy)','client','active',null),
 ('level_view','成长','看到升级庆祝','lv','client','active',null),
 ('level_info_open','成长','打开等级说明','','client','active',null),
 ('notif_open','通知','点开一条通知','kind, from(push/list/banner), notif_id','client','active',null),
 ('notif_settings_open','通知','打开提醒方式','','client','active',null),
 ('push_enable','通知','申请推送权限的结果','result(granted/denied/unsupported), env','client','active',null),
 ('email_settings_save','通知','保存邮件提醒','on','client','active',null),
 ('pact_view','安全','看到球友约定','via(gate/soon/safety/detail)','client','active',null),
 ('pact_accept','安全','同意球友约定','via(apply/create/invite/accept)','client','active',null),
 ('soon_open','通知','打开开打前 30 分钟卡片','game_id','client','active',null),
 ('safety_open','安全','打开安全须知','','client','active',null),
 ('contact_open','安全','打开联系我们 / 举报','','client','active',null),
 ('report_open','安全','打开站内举报（球员卡 / 聊天 / 场边）','target_type(user/game/sb_post/sb_reply), via(card/chat/sideline)','client','active',null),
 ('report_submit','安全','提交站内举报（不含说明内容）','target_type, reason, has_note, via','client','active',null),
 ('user_block','安全','屏蔽用户','target_uid','client','active',null),
 ('user_unblock','安全','解除屏蔽','target_uid','client','active',null),
 ('chat_open','消息','打开对话','type(game/dm)','client','active',null),
 ('chat_send','消息','发出消息（不含内容）','type, quick','client','active',null),
 ('gender_open','我的','打开性别设置','','client','active',null),
 ('gender_set','我的','保存性别（不记录值）','first, changed','client','active',null),
 ('club_add_open','我的','打开添加 Club','','client','active',null),
 ('home_clubs_save','我的','保存我的 Club','n','client','active',null),
 ('utr_open','我的','打开我的 UTR 弹层（长按看时间那次不算）','mode(off/self), linked','client','active',null),
 ('utr_invalid','我的','我的 UTR 当场校验没通过（不发请求、不记填的内容）','reason(empty/format/range/link)','client','active',null),
 ('utr_save','我的','我的 UTR 保存成功（以服务器返回为准，失败不记；不记数值和主页编号）','mode(off/self), linked, change(up/down/same)','client','active',null),
 ('racket_picker_open','我的','打开选拍弹层（添一把 / 换一把；从系列返回不算）','mode(add/swap), slot(1-3)','client','active',null),
 ('racket_brand_pick','我的','选拍时点了品牌（品牌名来自产品库或兜底列表；点「其他品牌」记 other；不记手写文字）','brand','client','active',null),
 ('racket_save','我的','球拍保存成功（以服务器返回为准，失败不记）；source：添 / 换时看是点选（catalog）还是手写（other），设为主力 / 移除时看那把有没有归到产品库','action(add/swap/main/remove), source(catalog/other), n_after','client','active',null),
 ('racket_invalid','我的','手写拍子名当场没通过校验（不发请求、不记文字）','reason(empty/long/link/at/digits/dup)','client','active',null),
 ('community_open','我的','打开微信约球群','','client','active',null),
 ('series_end','我的','停止每周发布','game_id','client','active',null),
 ('follow_open','打完之后','打开「TA 发了新球局」','game_id','client','active',null),
 ('sb_post_view','场边','打开一条发布的详情','post_id, own, via(feed/court/topic/album/notif)','client','active',null),
 ('sb_post_submit','场边','发布成功（含「2 小时后再公开」）','post_id, photos, topic_kind(none/official/user/new), court, later, via(bar/compose/court)','client','active',null),
 ('sb_reply_send','场边','回复成功（不含内容）','post_id, own_post, to_someone','client','active',null),
 ('sb_ball','场边','点网球 / 取消','post_id, on, via(tap/double)','client','active',null),
 ('sb_photo_view','场边','看大图','post_id','client','active',null),
 ('sb_topic_view','场边','按话题看','topic(话题代码；大家发起的记 user)','client','active',null),
 ('sb_court_view','场边','按球场看 / 打开球场页','venue, via(filter/page)','client','active',null),
 ('sb_hide','场边','不感兴趣（之后选了原因再记一条）','post_id, reason(none/topic/user/far)','client','active',null),
 ('sb_post_delete','场边','删除自己的发布','post_id','client','active',null),
 ('sb_replies_toggle','场边','开关自己发布的回复','post_id, open','client','active',null),
 ('sb_share','场边','分享照片 / 话题','post_id, topic, what(photo/topic), to(save/instagram/xhs)','client','active',null),
 ('sb_album_open','场边','打开场边相册（「我的」页）','','client','active',null),
 ('apply_expired','球局','申请超时自动结束','game_id','server','active',null),
 ('game_start_check','球局','开打时检查人数','game_id, filled, need, applied_n, reason','server','active',null),
 ('game_counted','成长','一局计入场次','game_id, players','server','active',null),
 ('recap_notify','打完之后','赛后提醒送出','game_id, delay_min, deferred','server','active',null),
 ('follow_notify','打完之后','TA 发了新局提醒','host_id, suppressed','server','active',null),
 ('less_effect','打完之后','少遇到生效','type(join/invite/dm/rank)','server','active',null),
 ('noshow_confirm','安全','爽约确认','game_id, rule(host/single/2+)','server','active',null),
 ('badge_earned','成长','获得徽章','code, rarity','server','active',null),
 ('level_up','成长','等级提升','from, to','server','active',null),
 ('notif_deliver','通知','一条提醒的去向','kind, channel(in_app/push_mobile/push_desktop/email/none), reason','server','active',null),
 ('women_apply_blocked','安全','非女生请求女生局被 API 拒绝','game_id','server','active',null),
 ('account_status_change','账号','账号状态变化（后台处理、暂停到期自动恢复、本人注销 / 恢复）','from, to, reason','server','active',null)
on conflict (event) do update set category=excluded.category, description=excluded.description, props=excluded.props,
  source=excluded.source, status=excluded.status, replaced_by=excluded.replaced_by;
-- 不再使用（合并到上面的事件）
insert into event_definitions (event,category,description,props,source,status,replaced_by) values
 ('host_approve','已废弃','已合并到 host_decide','','client','deprecated','host_decide'),
 ('host_decline','已废弃','已合并到 host_decide','','client','deprecated','host_decide'),
 ('invite_start','已废弃','已合并到 invite_open','','client','deprecated','invite_open'),
 ('avatar_change','已废弃','已合并到 card_customize','','client','deprecated','card_customize'),
 ('card_theme_change','已废弃','已合并到 card_customize','','client','deprecated','card_customize'),
 ('card_custom_save','已废弃','即时生效，无保存，不再上报','','client','deprecated',null),
 ('card_save_image','已废弃','已合并到 card_share','','client','deprecated','card_share'),
 ('card_share_link','已废弃','已合并到 card_share','','client','deprecated','card_share'),
 ('card_share_preview','已废弃','已合并到 card_share','','client','deprecated','card_share'),
 ('chat_report','已废弃','合并到 report_open(via=chat) + report_submit','','client','deprecated','report_open'),
 ('chat_quick_reply','已废弃','合并到 chat_send(quick=true)，不带文字','','client','deprecated','chat_send'),
 ('push_enable_click','已废弃','已合并到 push_enable','','client','deprecated','push_enable')
on conflict (event) do update set status='deprecated', replaced_by=excluded.replaced_by, description=excluded.description;
-- 其余不在 spec 里的旧名：标记废弃（新库里不会有这些行；老库迁移时生效）
update event_definitions set status='deprecated'
 where status='active' and event <> all (array[
   'session_start', 'page_view', 'page_time', 'app_hide', 'app_show', 'pwa_install_prompt', 'pwa_installed', 'pwa_first_launch', 'a2hs_open',
   'analytics_off', 'analytics_on', 'login_open', 'login_send_code', 'login_verify', 'login_success', 'signup_complete', 'logout', 'account_blocked', 'account_delete', 'account_restore', 'filter_open',
   'filter_reset', 'filter_utr_band', 'filter_type', 'filter_tag', 'filter_radius', 'day_select', 'view_mode', 'loc_suburb_pick', 'location_allow',
   'map_day', 'map_cluster_open', 'game_select', 'game_view', 'women_lock_view', 'game_create_start', 'game_create_submit', 'game_edit',
   'game_postpone', 'unfilled_action', 'game_cancel_open', 'game_cancel', 'game_apply_open', 'game_apply_submit', 'game_join_instant',
   'apply_withdraw', 'game_leave_open', 'game_leave', 'host_decide', 'host_decline_open', 'req_sort', 'req_expand', 'game_share_open',
   'share_copy_link', 'share_copy_text', 'share_system', 'poster_open', 'poster_download', 'share_xhs_copy', 'calendar_add', 'card_view',
   'card_custom_open', 'card_customize', 'card_share_open', 'card_share', 'card_share_error', 'card_image_render', 'pref_set', 'invite_open',
   'invite_send', 'invite_accept', 'invite_decline', 'invite_counter_send', 'invite_withdraw', 'invite_setting', 'recap_open', 'feel_set',
   'impression_give', 'recap_done', 'noshow_report', 'noshow_undo', 'noshow_appeal', 'badge_view', 'badge_share', 'level_view', 'level_info_open',
   'notif_open', 'notif_settings_open', 'push_enable', 'email_settings_save', 'pact_view', 'pact_accept', 'soon_open', 'safety_open', 'contact_open',
   'report_open', 'report_submit', 'user_block', 'user_unblock', 'chat_open', 'chat_send', 'gender_open', 'gender_set', 'club_add_open',
   'home_clubs_save', 'utr_open', 'utr_invalid', 'utr_save', 'community_open', 'series_end', 'follow_open',
   'racket_picker_open', 'racket_brand_pick', 'racket_save', 'racket_invalid',
   'sb_post_view', 'sb_post_submit', 'sb_reply_send', 'sb_ball', 'sb_photo_view', 'sb_topic_view', 'sb_court_view', 'sb_hide', 'sb_post_delete', 'sb_replies_toggle', 'sb_share', 'sb_album_open',
   'apply_expired', 'game_start_check', 'game_counted', 'recap_notify',
   'follow_notify', 'less_effect', 'noshow_confirm', 'badge_earned', 'level_up', 'notif_deliver', 'women_apply_blocked', 'account_status_change']);

-- 指标汇总：今天每 5 分钟增量刷新，历史每天凌晨 3 点重算前 2 天；后台图表只读这张表 + 下面的视图
create table daily_metrics (
  day        date not null,
  metric     text not null,          -- new_users / games_created / games_started / games_full_at_start / applications / approvals /
                                     --   invites / messages / shares / page_views / page_ms_sum / page_time_n / sessions / events / dau ...
                                     --   比率不存（成局率 = games_full_at_start ÷ games_started，展示时现算；平均停留 = page_ms_sum ÷ page_time_n）
  dims       jsonb not null default '{}',   -- 多维：{} 总量 / {"device":"mobile"} / {"device":"mobile","screen":"disc"} / {"suburb":"Brighton","build":"pwa"}
                                            --   键名用事件 / 表里的原字段名：device / build / env / screen / suburb / venue_id / channel / reason / animal / color / theme …
  value      numeric not null,
  additive   boolean not null default true, -- false = 当天去重人数（dau、访客、申请人数…）：只能画日线，不能跨天相加
  primary key (day, metric, dims),
  check (jsonb_typeof(dims) = 'object'),
  check (metric !~ '(^|_)(rate|ratio|pct|avg)(_|$)')
);
create index if not exists daily_metrics_dims on daily_metrics using gin (dims jsonb_path_ops);
-- 去重人数（活跃人数、访客、申请人数、球员卡看过的人……）不能跨天相加：dau 可以按天存（additive=false）来画日线，
--   但任意区间的人数必须对 events / 业务表现算 count(distinct …)（见 distinct_people / active_users / page_traffic 等函数），
--   或者每天存 HLL sketch（postgresql-hll：hll_union_agg）再合并；本库不依赖 hll 扩展，默认直接 count distinct。
-- 区间求和只对 additive 指标；对去重指标求和直接报错，防止后台误用
create or replace function metric_sum(p_metric text, p_from date, p_to date, p_dims jsonb default '{}')
returns numeric language plpgsql stable as $$
begin
  if exists (select 1 from daily_metrics where metric = p_metric and not additive) then
    raise exception '% 是去重指标，不能跨天相加；请用 distinct_people() 现算', p_metric;
  end if;
  return (select coalesce(sum(value),0) from daily_metrics
          where metric = p_metric and day >= p_from and day < p_to and dims = p_dims);
end $$;
-- 任意区间、任意事件的去重人数（登录用户按 user_id，未登录按 anon_id）；可按 device / build 过滤
create or replace function distinct_people(p_event text, p_from timestamptz, p_to timestamptz,
                                           p_device text default null, p_build text default null)
returns bigint language sql stable as $$
  select count(distinct coalesce(e.user_id::text, 'anon:' || e.anon_id))
  from events e
  where e.event = p_event and e.occurred_at >= p_from and e.occurred_at < p_to
    and (p_device is null or e.device = p_device) and (p_build is null or e.build = p_build)
$$;

-- 印色与前端 AVC 对齐（珊瑚 / 琥珀 / 樱粉 / 酒红 / 紫罗兰 / 天蓝 / 湖青 / 石墨）
alter table users drop constraint if exists users_avatar_color_check;
alter table users alter column avatar_color set default 'paper';   -- 新用户默认印色是纸白（11-03 改回：之前这里误写成 coral，和下面的说明、接口的 coalesce 都不一致）
-- 前台有两套：头像字母底色 AVC（coral…slate，8 种）和印色 ZAVC（paper 宣纸白、red…cocoa，12 种，新用户默认 paper）；库里存两套的并集，否则「宣纸白」存不进去（前台接入第 3 轮发现）
alter table users add constraint users_avatar_color_check check (avatar_color in ('coral','amber','rose','wine','violet','sky','teal','slate','paper','red','orange','olive','green','navy','cocoa'));

-- 球员卡偏好（当前快照）：哪个动物 / 印样 / 印色 / 卡面用得最多
create view v_card_preferences as
select 'animal' as dim, coalesce(case when avatar_kind='animal' then avatar_animal end,'letter') as value, count(*) as users from users group by 2
union all
select 'seal', (array['bw-rd','bw-rd-m:linen','zw-rd','bw-rd-g','bw-rd-m:rim','bw-rd-m:dry','free','bw-rd-m:press'])[seal_roll % 8 + 1], count(*) from users where avatar_kind='animal' group by 2
union all
select 'color', avatar_color, count(*) from users group by 2
union all
select 'theme', card_theme, count(*) from users group by 2;
-- 注：STYLES 顺序变了要同步改上面的数组；也可以直接看 card_seal_roll 事件里的 seal 字段

-- 区域热度 v_suburb_activity、用户活跃分 user_activity() / v_user_activity_7d：见文末「最终口径」（统一满员口径，不再 +1）

-- 用户提交的球场（来源追踪）：后台「球场」页显示提交人、提交时间、被多少局使用、审核状态
alter table venues add column if not exists added_at timestamptz;
alter table venues add column if not exists reviewed_by uuid;
alter table venues add column if not exists reviewed_at timestamptz;
alter table venues add column if not exists review_status text generated always as
  (case when status in ('pending','merged','rejected') then status else 'approved' end) stored;   -- 兼容列（只读），由 status 推出
alter table venues add column if not exists merged_into uuid references venues(id);

-- 站内举报（后台审核队列）
create table reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references users(id),
  target_type text not null check (target_type in ('user','game','message','venue')),
  target_id   text not null,          -- user / game / venue 为 uuid，message 为 messages.id（bigint），统一存文本
  reason      text not null check (reason in ('no_show','rude','harass','fake_profile','gender_fake','spam','pact_violation','other')),
                                      -- pact_violation = 违反球友约定
  note        text,
  status      text not null default 'open' check (status in ('open','actioned','dismissed')),
  handled_by  uuid, handled_at timestamptz, created_at timestamptz not null default now()
);

-- 后台账号：只用邮箱 + 密码 + 两步验证（TOTP）；三种角色
create table admin_users (
  id          uuid primary key default gen_random_uuid(),
  email       text not null unique,
  name        text not null,
  role        text not null check (role in ('owner','operator','viewer')),   -- 超级管理员 / 运营（可审核）/ 只读
  password_hash text not null,
  totp_secret text not null,
  last_login_at timestamptz,
  disabled    boolean not null default false
);
create table admin_audit_log (
  id         bigserial primary key,
  admin_id   uuid not null references admin_users(id),
  action     text not null,          -- venue.approve / venue.merge / user.suspend / report.dismiss / data.export ...
  target     text,
  detail     jsonb not null default '{}',
  ip         inet,
  at         timestamptz not null default now()
);

-- 后台 API（只读接口带 ?from=&to=&platform=）
--  GET  /admin/api/realtime                 今日实时：在线人数（5 分钟内有事件）、今日 KPI、最新 50 条事件
--  GET  /admin/api/metrics?metric=dau&dims={…}  读 daily_metrics
--  GET  /admin/api/suburbs | /venues | /users/top | /cards | /funnel | /retention
--  GET  /admin/api/review/venues | /review/reports
--  POST /admin/api/review/venues/:id {action: approve|merge|reject, merge_into?}
--  POST /admin/api/export {dataset, from, to}   导出 CSV（owner 才能导出带用户 ID 的数据，记审计）
-- 保留：raw events 13 个月后按分区直接 drop；sessions 13 个月；daily_metrics 长期

-- =====================================================================
-- 数据 · 第二期：平台对比 / 页面流量 / 站外回流 / 风险用户
-- =====================================================================
-- 分享链接一律带 ?s=渠道&f=分享人编号（前端 shareURL()）；打开时写一条 link_visits
alter table link_visits add column if not exists target_type text check (target_type in ('game','card'));
alter table link_visits add column if not exists target_user_id uuid references users(id);    -- 被打开的球员卡主人
alter table link_visits add column if not exists channel text;            -- link / text / sys / xhs / qr / webqr / moments
alter table link_visits add column if not exists sharer_id uuid references users(id);
alter table link_visits add column if not exists session_id text;
alter table link_visits add column if not exists converted_user_id uuid references users(id);  -- 之后注册 / 登录的人
alter table link_visits add column if not exists applied boolean not null default false;      -- 之后申请了这一局

-- （这里原先追加的埋点 page_time / card_view / safety_open … 已并入上面按 events_spec.md 生成的事件字典）
-- page_view.props.screen：disc 发现 / mine 我的球局 / notif 消息 / me 我的 / game_detail 球局详情 / player_card 球员卡 /
--   safety 安全须知 / login 登录 / create 发起球局 / invite 约 TA / card_share 分享球员卡 / game_share 分享球局 / poster / filter / community
-- session_start.props.entry：share 带 s= 的分享链接 / external 其他站外来源 / direct 直接打开 / push 从推送打开（URL 带 ?n=通知id&k=类型）；game_view.props.via：站内从哪进入

-- 平台 × 页面：每天每个页面（daily_metrics: metric=page_views|page_ms_sum|page_time_n, dims={"device":…,"screen":…}）；
--   任意区间的访问人数用 page_traffic(from,to)；被看最多的球员卡用 card_views(from,to)（含 via='link' 的 /p/ 站外落地）——见文末

-- 风险用户：规则可在后台调整权重和阈值，每小时重算；只是「需要人看一下」，处理由运营决定
create table risk_rules (
  code       text primary key,
  name       text not null,
  weight     int not null,
  threshold  numeric not null,
  window_days int not null default 30,
  enabled    boolean not null default true
);
insert into risk_rules values
 ('no_show','爽约（发起人标记未到）',25,2,30,true),
 ('reported','被不同的人举报',30,2,30,true),
 ('blocked_by','被多人屏蔽',15,3,30,true),
 ('declined_streak','连续被婉拒后仍高频申请',10,8,7,true),
 ('women_probe','未通过性别确认却反复尝试女生局',20,3,30,true),
 ('gender_flip','短期内修改性别',20,1,30,true),
 ('dm_burst','新账号短时间内大量私信',15,10,1,true),
 ('link_spam','反复尝试发送链接 / 联系方式',15,3,7,true),
 ('late_cancel','临开局 2 小时内取消',10,3,30,true);
create table user_risk (
  user_id    uuid primary key references users(id),
  score      int not null,
  level      text not null check (level in ('low','watch','high')),     -- <30 / 30–59 / ≥60
  signals    jsonb not null,                                            -- {"no_show":2,"reported":1,...}
  status     text not null default 'open' check (status in ('open','watching','limited','suspended','cleared')),
  note       text,
  reviewed_by uuid references admin_users(id),
  updated_at timestamptz not null default now()
);
-- user_risk = 每人一行的当前汇总（分数 / 等级，每小时覆盖）；每一次触发的提醒另记在 risk_alerts（见「风险用户：处理进度」），保留历史
-- limited：不能申请女生局 / 不能私信新球友；suspended：不能发起和申请；都会通知用户并可申诉

-- =====================================================================
-- 数据 · 第三期：使用环境 / 添加到主屏幕 / 活跃分与球场活跃度的定义
-- =====================================================================
-- 每个事件都带使用环境（前端 AENV，按 User-Agent + display-mode 判断）
alter table events add column if not exists env text;      -- pwa_ios / pwa_android / wechat / xhs / ig_fb / safari_ios / chrome_ios / chrome_android / samsung / mobile_other / desk_chrome / desk_safari / desk_edge / desk_firefox / desk_other
alter table events add column if not exists os  text;      -- ios / android / macos / windows / other
create index on events (env, occurred_at);
alter table sessions add column if not exists env text;
alter table users add column if not exists installed_at timestamptz;   -- 第一次从主屏幕打开（pwa_first_launch）或 pwa_installed

-- （安装相关埋点 pwa_install_prompt / pwa_installed / pwa_first_launch / wechat_guide_open … 已并入事件字典）

-- 各环境：会话、人数 → env_usage(from,to)；「申请」的两种口径 → v_applications_daily —— 均见文末「最终口径」
--   申请加入（次数）= game_participants 新增的 player 行数（同一人申请 3 局记 3 次；撤回后再申请同一局仍是 1 行）
--   申请人数        = 去重后的 user_id 数

-- 最活跃球友：权重可调（后台「活跃分」读这张表）
create table activity_weights (k text primary key, label text not null, weight numeric not null);
insert into activity_weights values
 ('host_ok','发起并成局',4),('played','到场打球',3),('apply','申请加入',1),('invite','发出邀约',1),
 ('impression','留印象',0.5),('active_day','活跃天数',1),('no_show','爽约',-5);
-- v_user_activity_7d / v_venue_activity_30d：见文末「最终口径」（用 attendance / 确认爽约、invites.from_user，满员不 +1）

-- ============ 所属 Club / 主 Club · 谁可以约我 ============
-- home_club_ids 改为「所属（会员）Club」，数组第一个 = 主 Club，显示在球员卡上；不再用「常去」推断
alter table users add column if not exists main_club_id uuid references venues(id);   -- 冗余存一份主 Club，方便查询
alter table users add column if not exists invite_from text not null default 'all' check (invite_from in ('all','played','none'));
-- 邀约限制（服务端校验）：invite_from；每人每天最多 3 个邀约、其中最多 2 位没一起打过的；同一人 30 天内被婉拒 2 次后不能再约
-- 陌生人邀约的预填只用双方已有资料（共同所属 Club > 对方主 Club），打过球的用最近一场（game_participants 按两人 + starts_at desc limit 1，有索引，开销很小）

-- ============ 徽章 ============
-- 12 枚：首场 / 十场 / 半百 / 百场（铜 → 银 → 金 → 黑金）· 组局达人 · 夜场常客 · 早起鸟 · 全场地 · Club 探险家 · 四周连打 · 好球友 · 黄金搭档
-- 黄金搭档：与同一位球友一起打满 10 场（双方都在 approved 名单里、且球局已结束）
create view v_badge_partner as
select a.user_id, max(cnt) as best_partner_games from (
  select p1.user_id, p2.user_id as partner, count(*) as cnt
  from game_participants p1 join game_participants p2 on p2.game_id=p1.game_id and p2.user_id<>p1.user_id
  join games g on g.id=p1.game_id
  where p1.status='approved' and p2.status='approved' and g.starts_at < now() and g.status<>'cancelled'
  group by 1,2) a group by a.user_id;

-- 婉拒理由更新为：full / friends / level / next，可附一句话（历史版本，最终取值见「多人申请 · 婉拒 v2」）
alter table game_participants drop constraint if exists game_participants_decline_reason_check;
alter table game_participants add constraint game_participants_decline_reason_check check (decline_reason in ('full','friends','level','next'));
alter table game_participants add column if not exists decline_note text check (char_length(decline_note) <= 30);

-- ============ 场景标签 / 邀约婉拒 ============
-- 球局标签：newbie 新手友好 / match 认真比赛 / casual 轻松拉球 / easy 养生局 / drill 练球为主 / newballs 开新球 / women 女生局（booked 停用，默认场地已订）
-- 邀约婉拒与球局婉拒统一：invites.decline_reason in ('week','rest','pass') + decline_note（≤30 字）
alter table invites add column if not exists decline_reason text check (decline_reason in ('week','rest','pass'));
alter table invites add column if not exists decline_note text check (char_length(decline_note) <= 30);

-- ============ 账号状态 ============
-- active 正常 / review 待核实 / limited 受限 / suspended 暂停（必须有到期时间）/ banned 封禁（永久，没有到期时间）/ deleted 已注销（30 天内可恢复）
-- 暂停时长只能是 1 / 3 / 7 / 30 / 90 / 180 天，status_until 必填（没有「直到手动解除」）；其余状态 status_until 一律为空
alter table users add column if not exists status text not null default 'active' check (status in ('active','review','limited','suspended','banned','deleted'));
alter table users add column if not exists status_since timestamptz;     -- 进入当前状态的时间
alter table users add column if not exists status_until timestamptz;     -- 暂停到期时间，定时任务到期自动恢复为 active
alter table users add column if not exists status_reason text            -- 原因代码，取值同 user_status_log.reason_code
  check (status_reason in ('no_show','reported','gender_fake','harass','spam','fake_profile','pact_violation','risk_rule','self_delete','other'));
-- 时长按秒算，允许 ±1 小时（墨尔本夏令时切换那天，「+7 天」可能是 167 或 169 小时）
create or replace function suspension_days_ok(p_since timestamptz, p_until timestamptz) returns boolean
  language sql immutable as $$
  select coalesce(exists (select 1 from unnest(array[1,3,7,30,90,180]) d
                          where abs(extract(epoch from (p_until - p_since)) - d * 86400) <= 3600), false) $$;
alter table users add constraint users_status_until_chk check (
  case when status = 'suspended'
       then status_since is not null and status_until is not null and suspension_days_ok(status_since, status_until)
       else status_until is null end);
create table user_status_log (
  id         bigserial primary key,
  user_id    uuid not null references users(id),
  from_status text, to_status text not null,
  reason     text,                       -- 显示文案：多次爽约 / 被多人举报 / 冒用女生身份 / 骚扰 / 广告 / 资料不实 / 违反球友约定 / 风险规则 / 本人注销 / 其他
  reason_code text check (reason_code in ('no_show','reported','gender_fake','harass','spam','fake_profile','pact_violation','risk_rule','self_delete','auto_restore','other')),
                                         --  对应：no_show 多次爽约 · reported 被多人举报 · gender_fake 冒用女生身份 · harass 骚扰 · spam 广告 · fake_profile 资料不实 ·
                                         --        pact_violation 违反球友约定 · risk_rule 风险规则 · self_delete 本人注销 · auto_restore 到期自动恢复 · other 其他
  note       text,                       -- 管理员备注，只在后台可见
  duration_days smallint check (duration_days in (1,3,7,30,90,180)),   -- 只用于暂停
  until      timestamptz,
  by_admin   uuid references admin_users(id),   -- 为空 = 系统（风险规则 / 本人操作 / 到期恢复）
  notified   boolean not null default true,
  created_at timestamptz not null default now(),
  check (case when to_status = 'suspended'
              then duration_days is not null and until is not null          -- until = 生效时间 + duration_days 天
              else duration_days is null and until is null end)
);
-- 权限：review → 不能看 / 报名女生局；limited → 再加不能私信、邀约没一起打过的人；suspended → 只能看；banned → 不能登录，报名的局自动退出、发起的局自动取消
-- 后台：用户列表按状态分组 + 用户详情抽屉里改状态（必须选原因，暂停要选时长），写 user_status_log 和 admin_audit_log

-- =====================================================================
-- 球场数据库 · 第二期：球友真正关心的信息（夜灯不再作为维度，lights 保留但后台不展示）
-- =====================================================================
alter table venues add column if not exists venue_type   text check (venue_type in ('club','public','school','commercial'));
alter table venues add column if not exists indoor_courts smallint not null default 0;          -- 取代 indoor boolean
alter table venues add column if not exists condition    smallint check (condition between 1 and 5);   -- 5 新铺/刚翻修 · 3 能打有磨损 · 1 积水/裂缝
alter table venues add column if not exists condition_checked_at date;
alter table venues add column if not exists facilities   text[] not null default '{}'
  check (facilities <@ array['park','toilet','club','water','shade','coach','shop','cafe']);
alter table venues add column if not exists visitor      text check (visitor in ('open','social','guest','members'));
  -- open 公开订场（任何人在线订）/ social 固定时段到场付费 / guest 会员带入 / members 仅会员
alter table venues add column if not exists price_per_hour numeric(6,2);                       -- 非会员每小时，0 = 免费
alter table venues add column if not exists booking_method text;                               -- Book a Court / ClubSpark / 官网 / 电话 / 先到先打
alter table venues add column if not exists has_wall     boolean not null default false;
alter table venues add column if not exists rating       numeric(2,1);                         -- 由 venue_reviews 汇总（定时任务）
alter table venues add column if not exists review_count int not null default 0;
alter table venues add column if not exists address      text;
alter table venues add column if not exists postcode     text;
alter table venues add column if not exists place_id     text unique;                          -- Google place_id，去重的第一依据
alter table venues add column if not exists source       text not null default 'admin' check (source in ('admin','user_map','user_manual'));

-- 年费：一个 Club 有多档
create table venue_fees (
  venue_id   uuid not null references venues(id) on delete cascade,
  tier       text not null check (tier in ('adult','junior','student','senior','family','social','off_peak')),
  amount     numeric(8,2) not null,          -- AUD / 年
  season     text,                            -- '2026-27'
  updated_at timestamptz not null default now(),
  primary key (venue_id, tier)
);

-- 球友评价：只有在这个球场打过球（game_participants approved + 已结束）的人能评，一人一场一条
create table venue_reviews (
  id         uuid primary key default gen_random_uuid(),
  venue_id   uuid not null references venues(id) on delete cascade,
  user_id    uuid not null references users(id),
  game_id    uuid references games(id),
  stars      smallint not null check (stars between 1 and 5),
  tags       text[] not null default '{}',   -- 场地平整 / 好停车 / 难订 / 风大 / 场地旧 / 设施好 / 贵 / 停车难
  body       text check (char_length(body) <= 140),
  hidden     boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, game_id)
);
create index venue_reviews_v on venue_reviews(venue_id, created_at desc);

-- 练习墙：为「墨尔本网球墙地图」准备；公园里的公共墙不一定属于某个球场
create table hitting_walls (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  suburb     text,
  location   geography(point,4326) not null,
  venue_id   uuid references venues(id),      -- 属于某个球场时
  wall_type  text check (wall_type in ('concrete','board','brick')),
  walls      smallint not null default 1,
  ground     text,                            -- 硬地 / 人造草 / 草地
  access     text not null default 'public' check (access in ('public','members')),
  condition  smallint check (condition between 1 and 5),
  rating     numeric(2,1), review_count int not null default 0,
  photos     text[] not null default '{}',    -- 上线前每面墙至少 1 张
  place_id   text unique,
  added_by   uuid references users(id),
  status     text not null default 'pending' check (status in ('pending','verified','rejected')),
  created_at timestamptz not null default now()
);
create index hitting_walls_gix on hitting_walls using gist(location);

-- 「在哪打」：发起球局时找球场 / 添加球场
-- 1) 先搜本站 venues：name / short_name / suburb 模糊匹配（pg_trgm），按离发起人 home club 或当前位置距离排序
-- 2) 本站少于 3 条且输入 ≥ 2 个字 → 前端调用 Google Places Autocomplete（components=country:au，偏向墨尔本，type=establishment），
--    输入停 300ms 才发；选中后用同一个 session token 取 Place Details（只要 name / formatted_address / location / address_components）
-- 3) 去重：place_id 已存在 → 直接用；150 米内已有已核实球场 → 直接用（ST_DWithin(location, :pt, 150)）
-- 4) 新建：source='user_map'，status='pending'，只出现在添加人自己的球局里；后台「待审核」通过（active）/ 合并（merged）/ 驳回（rejected）
-- 5) 地图上也找不到 → 手动填写（source='user_manual'），坐标先用所在区中心点，后台审核时补准确位置
create extension if not exists pg_trgm;
create index if not exists venues_name_trgm on venues using gin ((name || ' ' || coalesce(short_name,'') || ' ' || coalesce(suburb,'')) gin_trgm_ops);

-- 附近的球场 / 球局：前端拿到坐标（浏览器定位，或选的区的中心点）后，服务端 PostGIS 计算距离，不调用任何收费接口
-- select v.*, ST_Distance(v.location, ST_MakePoint(:lng,:lat)::geography)/1000 as km
--   from venues v where ST_DWithin(v.location, ST_MakePoint(:lng,:lat)::geography, :radius_km*1000) order by km;
-- 区（suburb）中心点和邮编：Vicmap / ABS 公开数据，导入一次，前端直接打包
create table suburbs (
  name     text primary key,
  postcode text not null,
  centroid geography(point,4326) not null
);

-- ============ 风险用户：处理进度（与账号状态分开） ============
-- 风险提醒只记录「这条提醒处理到哪」，真正的处罚写在 users.status + user_status_log
alter table user_risk drop constraint if exists user_risk_status_check;
alter table user_risk add constraint user_risk_status_check check (status in ('open','watching','handled','ignored'));
alter table user_risk add column if not exists watch_until timestamptz;   -- 观察：7 天后自动回到 open 复查
alter table user_risk add column if not exists suggested text check (suggested in ('watch','review','limited','suspended','banned'));
-- 风险提醒历史：每个用户 × 每条规则每次触发一行（同一用户可以有多条、可以反复触发）；处理进度记在这里，user_risk 只放汇总
create table risk_alerts (
  id          bigserial primary key,
  user_id     uuid not null references users(id) on delete cascade,
  rule_code   text not null references risk_rules(code),
  value       numeric not null,                      -- 触发时窗口内的计数，如 no_show = 2
  score       int not null,                          -- 触发时这条规则贡献的分
  window_from timestamptz not null,
  window_to   timestamptz not null,
  detail      jsonb not null default '{}',           -- 证据：相关 game_id / report_id ……
  status      text not null default 'open' check (status in ('open','watching','handled','ignored')),
  watch_until timestamptz,
  suggested   text check (suggested in ('watch','review','limited','suspended','banned')),
  note        text,
  reviewed_by uuid references admin_users(id),
  handled_at  timestamptz,
  created_at  timestamptz not null default now()
);
create index risk_alerts_user on risk_alerts(user_id, created_at desc);
create index risk_alerts_open on risk_alerts(status, created_at) where status in ('open','watching');
-- 同一用户同一规则同时只保留一条未处理的提醒（重算时更新它，处理完再触发就新开一条）
create unique index risk_alerts_one_open on risk_alerts(user_id, rule_code) where status in ('open','watching');
-- 受限（limited）：长期有效直到人工解除；不能报名女生局、不能私信 / 邀约没一起打过球的人；普通球局照常
-- 暂停（suspended）：必须有 status_until（1 / 3 / 7 / 30 / 90 / 180 天），到期自动恢复；只能登录查看，待处理的申请自动撤回，已确认的球局保留
-- 封禁（banned）：永久，没有 status_until
-- 升级：受限期间再被举报 → 建议暂停 7 天；一年内第 2 次暂停 → 管理员决定是否封禁


-- 邀约：发起人可以在对方回复前撤回（对方打开时看到「TA 撤回了邀约」）
alter type invite_status add value if not exists 'withdrawn';

-- ============ 约满后不再公开 · 没凑齐的球局 ============
-- hide_when_done（发布时默认打开）：满员或开打后，发现页 / 地图 / 分享链接对非参与者不可见；分享链接只返回「已约满 / 已结束」，不带时间地点和球友
alter table games add column if not exists hide_when_done boolean not null default true;
alter table game_series add column if not exists hide_when_done boolean not null default true;
-- 可见性：status='open' and starts_at > now()，或者 not hide_when_done，或者当前用户是参与者
-- 没凑齐：定时任务每 5 分钟扫一次
--   开打前 2 小时仍有空位 → 给发起人发 unfilled（只发一次）：再分享 / 放宽水平 / 顺延 1 小时 / 取消
--   开打时间到了仍有空位 → unfilled_end：这局从发现页撤下，提醒「用同样的设置再发一局」；待处理的申请自动婉拒
alter table games add column if not exists unfilled_reminded_at timestamptz;
alter table games add column if not exists unfilled_closed_at   timestamptz;
-- 顺延：只能一次，+60 分钟，结束不晚于 23:00；已加入的人收到 postponed 通知，可以退出（不计入爽约 / 临时退出）
alter table games add column if not exists postponed_at   timestamptz;
alter table games add column if not exists original_start timestamptz;
alter type notif_kind add value if not exists 'unfilled';
alter type notif_kind add value if not exists 'unfilled_end';
alter type notif_kind add value if not exists 'postponed';

-- ============ 修改球局 ============
-- 小改（水平、标签、备注、缺几人、公开设置）：直接更新，不通知
-- 大改（时间、时长、地点、玩法）：更新后给已加入 + 待审核的人发 changed 通知；已加入的人需要回应「还能来 / 来不了」
--   来不了 = 退出，不计入临时退出 / 赴约率；开打后不能修改；已加入人数超过新玩法人数时不能改玩法
alter type notif_kind add value if not exists 'changed';
create table game_changes (
  id         bigserial primary key,
  game_id    uuid not null references games(id) on delete cascade,
  changed_by uuid not null references users(id),
  fields     jsonb not null,               -- {"starts_at":["2026-10-08T18:00","2026-10-08T19:00"],"venue_id":[...]}
  is_major   boolean not null,
  created_at timestamptz not null default now()
);
alter table game_participants add column if not exists change_ack text check (change_ack in ('pending','ok','out'));   -- 大改后置为 pending

-- ============ 邮件提醒（推送的兜底） ============
-- 注册只要手机号；邮箱在「收不到推送的人刚申请 / 刚发起后」选填一次，或在「我的 → 邮件提醒」里设置
alter table users add column if not exists email          text check (email ~* '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$');
alter table users add column if not exists email_prefs    jsonb not null default '{}';   -- 11-03：邮件默认不发，用户自己在「提醒方式 → 邮件」打开哪几类才发（缺省 = 关）
alter table users add column if not exists email_status   text not null default 'ok' check (email_status in ('ok','bounced','complained'));  -- 退信 / 投诉后停发，设置页提示修改
alter table users add column if not exists email_asked_at timestamptz;      -- 用户点了「不用了」：30 天内不再询问
alter table users add column if not exists email_unsub_token text unique default encode(gen_random_bytes(16),'hex');   -- 邮件底部一键退订

-- 发送规则（按顺序判断，任何一步不满足就不发）：
-- ① 只发三类：request 有人申请加入我的球局 · result 我的申请有结果（approved / rejected / full）· change 我参加的球局改了 / 顺延 / 取消
-- ② 用户填了邮箱、email_status='ok'、这一类没有关掉
-- ③ 推送不到才发：通知产生时先推送；满足任一条才算「推送不到」——
--      a. 这个人没有有效的推送订阅（push_subscriptions 为空；推送服务返回 404/410 的订阅会被删除）
--      b. 所有订阅都推送失败
--    推送成功就不发邮件。推送不到时，等 5 分钟：这期间用户打开了南伴球、看过这条通知，也不发
-- ④ 合并：同一个人、同一局、同一类，1 小时内最多一封
--      第一件事 → 5 分钟后发第一封；之后 1 小时内同一局同一类的新事件先攒着，
--      1 小时到点时还有没看过的，就合成一封发出（「又有 2 位球友申请加入你周六 9:00 的球局」）
-- ⑤ 每人每天最多 5 封（按墨尔本时间的自然日）。到上限后当天不再发邮件，通知仍然在南伴球里；
--    第 5 封末尾加一句「今天的邮件提醒已达上限，其余的请在南伴球里查看」
--    同一时刻排队的邮件按重要程度先发：change > result > request
-- ⑥ 过期的不发：request / result 对应的球局已经开打；或者事情已经被处理（申请已被接受或婉拒、已撤回）
-- ⑦ 退订：邮件底部一键退订（只关这一类，或全部关掉）；退信或投诉 → email_status 改为 bounced / complained，不再发送
create table email_outbox (
  id          bigserial primary key,
  user_id     uuid not null references users(id),
  to_email    text not null,
  kind        text not null check (kind in ('request','result','change')),
  game_id     uuid references games(id),
  merge_key   text not null,                 -- user_id:game_id:kind，用于 1 小时合并
  notification_ids bigint[] not null default '{}',   -- 合并进这封的所有通知
  subject     text not null,                 -- 「Grace 申请加入你周六 9:00 的球局」/「又有 2 位球友申请…」
  send_after  timestamptz not null,          -- 首封 = 事件时间 + 5 分钟；合并封 = 上一封发出时间 + 1 小时
  status      text not null default 'queued' check (status in ('queued','sent','skipped','bounced','failed')),
  skip_reason text check (skip_reason in ('pushed','seen','merged','daily_cap','stale','pref_off','email_bad')),
  provider_id text,                          -- Resend 返回的 id
  created_at  timestamptz not null default now(),
  sent_at     timestamptz
);
create index email_outbox_q on email_outbox(status, send_after) where status='queued';
create index email_outbox_merge on email_outbox(merge_key, created_at desc);
create index email_outbox_daily on email_outbox(user_id, sent_at) where status='sent';

-- ============ 服务范围与区域数据 ============
-- 区数据来自官方公开数据集（ABS 统计区 + Australia Post 邮编），每年导入一次；管理员不手动维护单个区
create table service_areas (
  key        text primary key,                -- melb / geelong
  name       text not null,                   -- 大墨尔本
  status     text not null default 'off' check (status in ('on','prep','off')),
  center     geography(point,4326) not null,
  radius_km  smallint not null default 75,    -- 只收录离中心这么远以内的区
  source     text,                            -- 'ABS 2021 · Australia Post · 2026-07'
  imported_at timestamptz
);
alter table suburbs add column if not exists area_key text references service_areas(key);
alter table suburbs add column if not exists region   text;    -- inner / east / se / south / north / west（按 LGA 归类，方便浏览）
alter table suburbs add column if not exists lga      text;
alter table suburbs add column if not exists pinned   smallint;  -- 置顶顺序；null = 按球局数排序
alter table suburbs drop constraint if exists suburbs_pkey;
alter table suburbs add primary key (name, postcode);
create table suburb_aliases (alias text primary key, suburb text not null);   -- 博士山 → Box Hill
-- 服务范围以外的需求：搜索没有结果、定位在开放地区以外；用来决定下一个开放哪里
create table area_demand (
  id         bigserial primary key,
  kind       text not null check (kind in ('search_miss','geo_outside')),
  query      text,                            -- 搜索词
  geo        geography(point,4326),           -- 只存到区的精度
  guess_area text,                            -- 反查到的地区：Geelong / Ballarat …
  notify_me  boolean not null default false,  -- 用户留了「开放时通知我」
  created_at timestamptz not null default now()
);
-- 前端：区数据打包成一个 JSON（669 个区约 30KB，gzip 后约 9KB），Service Worker 缓存；搜索、按大区浏览、GPS 最近区都在本地完成
-- 地图：不加载区的边界，只用中心点 + 距离半径；地图上只显示半径内有球局的球场，按视野请求、同一球场合并成一个标记

-- ============ 球场 × 区域 统一管理 ============
-- 球场的「所在区」必须指向区域库里的一个区（名称 + 邮编），不再存自由文本
alter table venues add column if not exists postcode text;
alter table venues add constraint venues_suburb_fk foreign key (suburb, postcode) references suburbs(name, postcode);
-- venue_kind 与上一期的 venue_type 重复：统一用 venue_type（club / public / school / commercial），这里不再新增列
alter table venues add column if not exists geo_source text not null default 'suburb_centroid' check (geo_source in ('google','admin','suburb_centroid'));   -- 坐标来源；suburb_centroid = 待核实
alter table venues add column if not exists suburb_check text not null default 'ok' check (suburb_check in ('ok','mismatch','resolved'));
alter table venues add column if not exists suburb_suggested text;     -- 复核算出的区
-- 区怎么来：
--   · 从 Google 地图选的球场：用坐标反查所在的区（坐标落在哪个区的范围里；第一版用最近的区中心近似），用户不用填
--   · 手动添加：只能从区域库里选，输入邮编最快（3163 → Carnegie / Glen Huntly / Murrumbeena）
-- 复核：手动添加的球场补上坐标后，如果坐标反查出的区 ≠ 用户选的区，或者离所选区中心超过 3 km → suburb_check='mismatch'，进后台「区域待核实」，一键改正
-- 第一版球场库：88 个真实球场，来自 melbourneplaygrounds.com.au、Tennis Australia 球会页面、各区政府社区目录；坐标 geo_source='suburb_centroid'，逐个用 Google 地图核实后改为 'google'
-- 选球场的界面：搜索（名称 / 简称 / 区 / 邮编）+ 常用（对方的 Club、我的 Club、我最常去的）+ 最近 + 按首字母；每行只显示「球场简称 · 所在区」
create index if not exists venues_suburb on venues(suburb, postcode);

-- ============ 球局标签（第二版） ============
-- 节奏（单选，选填）：match 认真比赛 · relax 轻松随意（合并原来的 casual 轻松拉球 / easy 养生局 / drill 练球为主）；不选 = 正常对打
-- 适合谁（可多选，选填）：newbie 新手友好 · women 女生局
-- 「拉球」是玩法（game_type='rally'），不再做标签；newballs 开新球 → 迁移到备注「我带新球」；booked 停用
update games set tags = array_remove(array_remove(array_remove(tags,'casual'),'easy'),'drill') || array['relax']
  where tags && array['casual','easy','drill'] and not tags @> array['match'];
update games set note = concat_ws('，', nullif(note,''), '我带新球'), tags = array_remove(tags,'newballs') where tags @> array['newballs'];
update games set tags = array_remove(tags,'booked') where tags @> array['booked'];
alter table games drop constraint if exists games_tags_check;
alter table games add constraint games_tags_check check (tags <@ array['match','relax','newbie','women'] and not (tags @> array['match','relax']));
-- 筛选：节奏两个选项互斥（点一个自动取消另一个）；「新手友好」= 带 newbie 标签，或者 utr_min ≤ 3；多个条件之间是「且」

-- ============ 球场名录导入（2026-10） ============
-- 来源：公开资料整理 88 个 + 用户提供名录 244 家（含 130 家的地址 / 场地 / 片数 / 对外方式），合并去重后 303 个
-- 去重规则：名称去掉 Tennis / Club / Lawn / 括号后相同，且两处的区相距 6 km 以内 → 同一家；相距更远 → 两家（例：St James TC 在 Brighton 和 Coburg North 各有一家）
-- 两份资料写的区不一样 → venues.suburb_check='mismatch'，进后台「区域待核实」
-- 没有区、或者区不在服务范围（75 km 外）→ venues.status = 'nosub' / 'outside'，只在后台显示，补齐后改为 active
alter table venues add column if not exists address text;
alter table venues add column if not exists data_sources text[] not null default '{}';   -- {web, directory_2026}
-- 筛选「节奏」：没标节奏的局（大多数）算「都可以」，选认真比赛或轻松随意时照样出现，只排除标了相反节奏的；明确标了所选节奏的排在前面
--   where not (tags && array['match','relax']) or tags @> array[:pace]
-- 「新手友好」：带 newbie 标签，或 utr_min ≤ 3；「女生局」：必须带 women（涉及谁能看到，不放宽）
-- 显示名：venues.short_name 用于日程、卡片、地图、通知（xxx TC / xxx LTC / NTC），球局详情和导航用全称

-- ============ 位置筛选「常用 / 最近」（个性化） ============
-- 常用 = 我的 Club 所在区 → 近 60 天打过的区（越近权重越高）→ 最近选过的区；个人数据不足时，最多补 2 个热门区。
-- 最近 = 最近手动选过的 3 个区，跟着账号走，换设备也在。
create table if not exists user_suburb_picks (
  user_id    uuid not null references users(id) on delete cascade,
  suburb     text not null,
  postcode   text not null,                -- 区名不唯一（同名区不同邮编），必须带邮编
  picked_at  timestamptz not null default now(),
  primary key (user_id, suburb, postcode),
  foreign key (suburb, postcode) references suburbs(name, postcode) on update cascade
);
create index if not exists user_suburb_picks_recent on user_suburb_picks (user_id, picked_at desc);

-- ============ 临时约球（开场前 2 小时内） ============
-- ① 加入方式：approve = 发起人确认（默认）；instant = 不用确认，水平在 [ntrp_min, ntrp_max] 内的人直接加入。
--    只有开场前 2 小时内发布 / 修改时才能选 instant（已经是 instant 的，修改时可以关掉）。私人球局不适用。
alter table games add column if not exists join_mode text not null default 'approve' check (join_mode in ('approve','instant'));
alter table games add column if not exists time_set_at timestamptz;   -- 最近一次设定开场时间（发布 / 改时间 / 顺延）；距开场不到 2 小时则不发「还缺人」提醒
-- 直接加入：POST /api/games/:id/join —— 同一事务里加行锁检查名额，避免超员：
--   select ... from games where id=$1 for update;  校验 join_mode='instant' 且未开打、未满、水平在范围内、无屏蔽、女生局规则；
--   insert game_participants(status='approved', via='instant', approved_at=now())；满员由 sync_game 处理：games.status='full'，其余 pending 改 rejected(decline_reason='full_auto') 并通知
alter table game_participants add column if not exists approved_at timestamptz;   -- 被确认 / 直接加入的时间：10 分钟内退出不算临时退出
alter table game_participants add column if not exists via text not null default 'request' check (via in ('request','instant','invite','series'));
alter table game_participants add column if not exists expired_at timestamptz;
-- 预计几分钟到（11-04）：开打后才申请的人选 10 / 20 / 30 分钟；发起人据此决定接不接受。只有发起人和本人看得到
alter table game_participants add column if not exists eta_min smallint check (eta_min between 1 and 120);
-- ② 申请超时：失效时间 = least( greatest(created_at, starts_at - 60 min) + 15 min , starts_at )
--    到点：status → expired，decline_reason='timeout'，通知申请人（kind='expired'，只推送，不发邮件）；
--    离线补算时失效已超过 30 分钟的，只改状态不通知。接受 / 婉拒前都要重新检查 status='pending'。
alter table game_participants drop constraint if exists game_participants_decline_reason_check;
alter table game_participants add constraint game_participants_decline_reason_check
  check (decline_reason in ('full','level','time','pass','timeout'));
create or replace function application_deadline(p_created timestamptz, p_start timestamptz) returns timestamptz
  language sql immutable as $$ select greatest(p_created, p_start - interval '60 minutes') + interval '15 minutes' $$;
-- 11-04 改：不再被「开打」截断。开打后 30 分钟内仍可申请，申请人的 15 分钟照给（最晚 = 开打后 45 分钟）。
create index if not exists gp_pending_idx on game_participants(game_id) where status = 'pending';
-- 定时任务（每分钟）：
--   update game_participants gp set status='expired', decline_reason='timeout', expired_at=application_deadline(gp.created_at, g.starts_at)
--     from games g where g.id=gp.game_id and gp.status='pending' and g.status<>'cancelled'
--       and now() >= application_deadline(gp.created_at, g.starts_at)
--   returning ...  → 对 expired_at > now() - 30 min 的行发通知
alter type notif_kind add value if not exists 'joined';    -- 有人直接加入了你的球局
alter type notif_kind add value if not exists 'expired';   -- 你的申请超时失效
-- ③ 邮件规则 ⑦：开场前 1 小时内，申请 / 结果类不进 email_outbox；开场前 2 小时内的改动 / 取消 send_after = now()，不合并。
-- ④ 临时退出：starts_at - now() < 24h 且 not (approved_at > now() - interval '10 minutes') 才计一次 late。

-- ============ 打完之后：只关于自己的选择（不等任何人回应） ============
-- 赛后卡片：对每位同场球友选「多遇到 / 随缘 / 少遇到」+ 这局对你来说「偏难 / 刚好 / 偏轻松」。
-- 原则：这是用户给自己的推荐做的设置，不是发给对方的请求；没有「互相」才出现的东西，也不通知对方，所以不存在期待落空。
create table if not exists player_prefs (
  user_id    uuid not null references users(id) on delete cascade,
  target_id  uuid not null references users(id) on delete cascade,
  pref       text not null check (pref in ('more','less')),   -- 随缘 = 删除这一行
  game_id    uuid references games(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (user_id, target_id), check (user_id <> target_id)
);
create index if not exists player_prefs_target on player_prefs(target_id) where pref='more';
create table if not exists player_pref_mutes (     -- 少遇到生效的时间段（私信是否提醒按消息时间判断）
  user_id uuid not null references users(id) on delete cascade, target_id uuid not null references users(id) on delete cascade,
  muted_from timestamptz not null, muted_until timestamptz,      -- null = 仍在生效
  primary key (user_id, target_id, muted_from)
);   -- 发局时找「多遇到 TA」的人
create table if not exists game_feel (
  game_id uuid not null references games(id) on delete cascade, user_id uuid not null references users(id) on delete cascade,
  feel text check (feel in ('hard','ok','easy')),   -- 先只记录，后续用于水平校准（只私下提醒本人）
  closed_at timestamptz, reminded_at timestamptz,   -- 提交时间；提醒只发一次
  primary key (game_id, user_id)
);
create table if not exists follow_notices (        -- 多遇到：同一个人每 7 天最多提醒一次
  user_id uuid not null references users(id) on delete cascade, target_id uuid not null references users(id) on delete cascade,
  last_at timestamptz not null, primary key (user_id, target_id)
);
alter type notif_kind add value if not exists 'recap';         -- 「打得怎么样」：结束后 1 小时，22:00–08:00 顺延到 8 点；超过 24 小时未送出则不再发
alter type notif_kind add value if not exists 'follow_game';   -- 你选了多遇到的人发了适合你的新局（水平相差 0.5 以内、可见、未屏蔽）
-- 少遇到（pref='less'）的效果，对方一律不可见：
--   · 对方发的局在我的列表里排到最后
--   · 对方不能直接加入我的局（照常申请，看到的就是一场普通的需要确认的局）
--   · 对方不能约我：返回与「我关闭了邀约」完全相同的文案「TA 暂时不接受邀约」
--   · 对方的私信：设置之后收到的不计未读、不推送（消息照常送达、随时可看；对方那边一切如常）
--       例外：两人有共同球局（未取消），开场前 24 小时到结束后 2 小时内的私信照常提醒；球局群聊不受影响
--       设置之前已有的未读保持不变；改回随缘后，静音期间的消息不会突然变成未读（按时间段 player_pref_mutes 判断）
--   · 对方申请我的局：照常通知（发起人需要处理），申请卡片上只有我能看到一行「你设过少遇到」
--   · 我主动约对方：自动改回随缘
-- 多遇到（pref='more'）：对方发的局在我的列表里靠前；进入「常一起打」；对方发了适合我的新局提醒一次。

-- ============ 徽章：获得的那一刻 ============
-- user_badges 的唯一定义在「v4 新增：游戏化」一节（code / earned_at / game_id / seen_at / shared_at）
alter type notif_kind add value if not exists 'badge';   -- 获得新徽章（22:00–08:00 顺延到早上 8 点）
-- 判定时机：每场球局结束、收到好评时，对相关用户重新计算；连续周按真实球局（周一为一周开始，本周还没打不算中断）
-- 稀有度 = 拥有该徽章的人数 ÷ 至少有 1 场「算数」球局的用户数（v_badge_rarity）；只在 ≤ 50% 时展示

-- ============ 统一规则：场次 · 早场 / 夜场 · 好评 · 赴约 · 球友等级 ============
-- 一场「算数」的球（场次、徽章、等级都用这一个定义）：
--   games.status <> 'cancelled' 且已结束；用户在结束时仍为 approved（撤回 = withdrawn、退出 = left，行保留但不算）；
--   至少还有 1 位已确认球友或线下补位（filled）；该用户没有被确认爽约 → 视图 v_counted_games（文末）
-- 早场：开场时间 ≤ 08:00；夜场：开场时间 ≥ 19:00（墨尔本时间）。早起鸟 / 夜场常客门槛均为 5 场
-- 好评：同一评价人 × 同一场球最多 1 次（不论点了几个印象；一键点赞也算 1 次）。印象标签另外分别计数
-- 【已被 v2 取代】user_kudos：按「评价人 × 球局」计次，仅为兼容保留；现行口径用 user_kudos_v2
create or replace view user_kudos as
  select to_id as user_id, count(*) as kudos, count(distinct from_id) as kudos_from
  from (select distinct from_id, to_id, game_id from impressions) x group by to_id;
-- 「好球友」徽章：kudos ≥ 30 且 kudos_from ≥ 10
-- 爽约反馈：结束后 48 小时内，同场球友可以反馈「TA 没来」
create table if not exists noshow_reports (
  game_id uuid not null references games(id) on delete cascade, target_id uuid not null references users(id) on delete cascade,
  reporter_id uuid not null references users(id) on delete cascade, created_at timestamptz not null default now(),
  primary key (game_id, target_id, reporter_id), check (target_id <> reporter_id)
);
create table if not exists noshow_appeals (
  game_id uuid not null references games(id) on delete cascade, user_id uuid not null references users(id) on delete cascade,
  reason text not null check (reason in ('came','told','other')), status text not null default 'pending' check (status in ('pending','upheld','rejected')),
  created_at timestamptz not null default now(), primary key (game_id, user_id)
);
-- 确认爽约 = 发起人反馈；或两人局里另一位反馈；或至少 2 位球友反馈。申诉 pending / upheld 期间不计入
-- 赴约率 = 场次 ÷（场次 + 确认爽约）；等级里另把开打前 24 小时内退出按 0.5 次计
-- 球友等级（逐级满足，近 90 天爽约 ≥2 次最高 Lv3，≥4 次最高 Lv2）：
--   好评率 = (kudos + 2.5) / (场次 + 10)   （本段口径已被下面的 v2 / v3 取代）
--   Lv2 相伴：3 场
--   Lv3 常伴：10 场 · 赴约率 ≥ 90% · 好评率 ≥ 0.15 · 来自 ≥ 3 位
--   Lv4 挚友：30 场 · 赴约率 ≥ 95% · 好评率 ≥ 0.30 · 来自 ≥ 10 位
--   Lv5 南伴之光：60 场 · 赴约率 ≥ 98% · 好评率 ≥ 0.40 · 来自 ≥ 25 位 · 180 天内零被核实举报
create table if not exists user_level_log (user_id uuid not null references users(id) on delete cascade, level smallint not null, reached_at timestamptz not null default now(), seen_at timestamptz, primary key (user_id, level));
alter type notif_kind add value if not exists 'levelup';   -- 只在升级时通知一次；回落不通知
alter type notif_kind add value if not exists 'noshow';    -- 被确认爽约，附申诉入口
-- 球员卡底部徽章：最多 7 枚；场次系列只显示最高一枚；按稀有度（拥有比例低的在前），再按获得时间新的在前

-- ============ 成长体系 v2（取代上一节的好评 / 等级口径） ============
-- 好评 = 给过你好评的「不同球友」人数：同一位球友不论打多少场、点多少印象，只算 1
-- user_kudos_v2（好评人数、一起打过的球友数、好评率）在文末「最终口径」创建（依赖 v_counted_games）
-- 好评率 = (好评人数 + 1) ÷ (一起打过球的不同球友人数 + 4)
-- 等级（逐级满足；近 90 天爽约 ≥2 次最高 Lv3，≥4 次最高 Lv2）：
--   Lv1 初见 🌱 · Lv2 相伴 🌿 20 场 · Lv3 常伴 🪴 50 场 / 赴约 90% / 好评率 0.3 / ≥10 人
--   Lv4 挚友 🌲 100 场 / 95% / 0.4 / ≥25 人 · Lv5 南伴之光 🌳 200 场 / 98% / 0.5 / ≥50 人 / 180 天零举报
-- 界面上不显示「还差几场」之类的提示；要求只写在「等级说明」里
-- 「好球友」徽章：30 位不同球友给过你好评
-- 成长体系 v3：好评率门槛 Lv3 ≥ 1/2，Lv4 / Lv5 ≥ 2/3；图标 🌱 初见 · 🍃 相伴 · 🌿 常伴 · 🌲 挚友 · 🌳 南伴之光
-- 好评率的分母 = max(一起打过球的不同球友, 好评人数)   → user_kudos_v2.kudos_rate
-- 【唯一现行等级口径】v3：users.level = 当前等级（每场结束 / 每天按上面 v3 门槛重算，可回落）；user_level_log = 每级首次达到（升级通知用）
--   爽约封顶窗口一律 90 天（近 90 天确认爽约 ≥2 次最高 Lv3，≥4 次最高 Lv2）
alter table users add column if not exists level smallint not null default 1 check (level between 1 and 5);

-- ===== 后台第十一期：体验与成长监控 =====
-- 开打时人数检查（服务端在 starts_at 时写入一次）
CREATE TABLE IF NOT EXISTS game_start_checks (
  game_id     uuid PRIMARY KEY REFERENCES games(id) ON DELETE CASCADE,
  checked_at  timestamptz NOT NULL DEFAULT now(),
  need        int NOT NULL,              -- = games.capacity
  filled      int NOT NULL,              -- 开打时已到位人数 = approved 行数（含发起人）+ games.filled（线下补位），不再 +1
  applied_n   int NOT NULL DEFAULT 0,
  pending_n   int NOT NULL DEFAULT 0,
  reason      text CHECK (reason IN ('full','short_one','no_apply','not_handled','all_rejected','left_after_full')),
  played      boolean
);
CREATE INDEX IF NOT EXISTS game_start_checks_at ON game_start_checks (checked_at);

-- 开打时段（墨尔本时间）：早场 ≤08:00 · 上午 · 下午 · 傍晚 · 晚场 ≥19:00
CREATE OR REPLACE VIEW admin_game_slots AS
SELECT g.id, g.starts_at,
  CASE WHEN (g.starts_at AT TIME ZONE 'Australia/Melbourne')::time <= time '08:00' THEN 'early'
       WHEN (g.starts_at AT TIME ZONE 'Australia/Melbourne')::time <  time '12:00' THEN 'am'
       WHEN (g.starts_at AT TIME ZONE 'Australia/Melbourne')::time <  time '17:00' THEN 'pm'
       WHEN (g.starts_at AT TIME ZONE 'Australia/Melbourne')::time <  time '19:00' THEN 'dusk'
       ELSE 'night' END AS slot,
  extract(isodow FROM g.starts_at AT TIME ZONE 'Australia/Melbourne')::int AS dow,
  c.filled >= c.need AS full_at_start, c.reason
FROM games g LEFT JOIN game_start_checks c ON c.game_id = g.id;

-- 被标「少遇到」较多的球友（仅后台；至少 3 人标记才出现）
CREATE OR REPLACE VIEW admin_less_marked AS
SELECT target_id AS user_id, count(*) AS marked_by
FROM player_prefs WHERE pref = 'less'
GROUP BY target_id HAVING count(*) >= 3;

-- ===== 多人申请 · 婉拒 v2 =====
-- 申请结束原因（game_participants.decline_reason）：known 想和熟悉的球友打 · level 想找水平更接近的 · pass 这次先不了（发起人选择，对方只看到对应的一句话 + 可选留言）
--   full_auto 人齐后自动结束（通知 kind=full，「这局已经满员啦」）· timeout 超时 · blocked 屏蔽（不通知）
--   旧值兼容：full/friends → known，next/time → pass（迁移见下）
-- 状态对应：known / level / pass / full_auto / blocked → status='rejected'；timeout → status='expired'
-- （前台原型在内存里用 status='rejected' + reason='timeout' 表示超时；API 写库时映射为 status='expired', decline_reason='timeout'）
update game_participants set decline_reason = 'known' where decline_reason in ('full','friends');
update game_participants set decline_reason = 'pass'  where decline_reason in ('next','time');
update game_participants set status = 'expired' where status = 'rejected' and decline_reason = 'timeout';
update game_participants set decline_reason = 'pass'  where status = 'rejected' and decline_reason is null;   -- 早期没填理由的婉拒
alter table game_participants drop constraint if exists game_participants_decline_reason_check;
alter table game_participants add constraint game_participants_decline_reason_check
  check (decline_reason in ('known','level','pass','full_auto','timeout','blocked'));
alter table game_participants add constraint game_participants_status_reason_chk check (
  case status when 'rejected' then coalesce(decline_reason in ('known','level','pass','full_auto','blocked'), false)
              when 'expired'  then coalesce(decline_reason = 'timeout', false)
              else true end);
-- 通知合并：同一局 2 人以上申请，列表里合并成一条（客户端按 game_id 分组）；推送同一局 10 分钟内只发一次，之后一条写「X 等 N 人在等你确认」
-- 申请列表默认排序：发起人设过多遇到 → 一起打过 → 水平在范围内且接近 → 赴约率高 → 申请早；设过少遇到的排最后

-- =====================================================================
-- 通知 v2：一条通知只提醒一次，提醒在对的设备上（两端同一套规则，服务端执行）
-- =====================================================================
-- 设备：每个用户可以有多台设备（手机 PWA / 手机浏览器 / 电脑浏览器），推送订阅和最近活跃时间按设备记
create table if not exists user_devices (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references users(id) on delete cascade,
  platform      text not null check (platform in ('mobile','desktop')),
  push_endpoint text, push_p256dh text, push_auth text,          -- 为空 = 没开推送
  push_ok_at    timestamptz,                                     -- 最近一次推送送达（推送服务返回 201）
  last_active_at timestamptz,                                    -- 页面在前台、最近 60 秒有心跳
  created_at    timestamptz not null default now()
);
create index if not exists user_devices_user on user_devices(user_id);
-- 送达记录：每条通知最终去了哪（后台统计和排查用）
create table if not exists notification_deliveries (
  id       bigserial primary key,
  notification_id bigint not null references notifications(id) on delete cascade,   -- notifications.id 是 bigserial
  channel  text not null check (channel in ('in_app','push_mobile','push_desktop','email','none')),
  device_id uuid references user_devices(id) on delete set null,
  reason   text,                                -- active_device / mobile_first / go_kind / no_push / deferred_night / merged / stale:<原因>
  at       timestamptz not null default now()
);
create index if not exists notification_deliveries_n on notification_deliveries(notification_id);
-- 路由规则（按顺序）：
--   ① 收件箱只有一份，所有设备同步；已读同步。需要处理的（待确认的申请、待回复的邀约）处理完之前保持未读
--   ② 有设备正在用（last_active_at 60 秒内）：只在这台设备的页面里提醒，其他设备只更新红点
--   ③ 都没在用：有手机推送就推手机；没有才推电脑
--   ④ 出发类（soon / game_cancelled / changed / postponed）：电脑上在看，也同时推手机
--   ⑤ 夜间 22:00–08:00（Australia/Melbourne；08:00 按墙上时间算，夏令时切换那夜不是固定的 10 小时）：不紧急的（recap / follow_game / badge / levelup / reopen / invite_expired，
--      以及 12 小时后才开打的球局相关）顺延到 08:00；08:00 同时到期的多条合成一条推送
--   ⑥ 发送前再检查：已读 / 球局取消 / 已开打 / 申请已处理 / 邀约已结束 / 有屏蔽关系 → 不推送（收件箱照常保留）
--   ⑦ 合并：同一局的申请 10 分钟内只推一次（之后一条写「X 等 N 人在等你确认」）；同一对话的消息 5 分钟内只推一次
--   ⑧ 邮件（原 ③ 改）：只有「手机推送送达」或「已读」才算看到；只推到电脑的，5 分钟后仍未读就补发邮件；
--      球局已取消时不再发 request / result 类邮件；标题区分 取消 / 顺延 / 修改 / 还缺人
alter type notif_kind add value if not exists 'soon';
alter type notif_kind add value if not exists 'reopen';
alter type notif_kind add value if not exists 'invite_expired';
alter type notif_kind add value if not exists 'unfilled';
alter type notif_kind add value if not exists 'unfilled_end';
-- soon：开打前 30 分钟，发给已确认的参加者（含发起人）；只有 1 人的局不发；开打前 30 分钟内才加入 / 才发布的不发；
--       顺延或改时间后按新时间重新计算（去重键 = game_id + user_id + starts_at）
-- reopen：已确认的人退出后又有空位，告诉一次之前因满员自动结束申请的人（开打前 1 小时以上、非私人局）
-- invite_expired：邀约 48 小时没回复或已过开打时间，告诉等待回复的一方
-- noshow：actor 不记录反馈人（隐私），列表里显示系统头像

-- ===== 球友约定 =====
alter table users add column if not exists pact_accepted_at timestamptz;   -- 第一次申请 / 直接加入 / 发起 / 约人 / 接受邀约前必须同意
alter table users add column if not exists pact_version smallint;
-- 约定内容（v1）：准时到场，来不了尽早说；尊重每一位球友；真诚友善，不嘲讽不争执；守住边界，不骚扰不推销、未经同意不索要联系方式；
--               费用提前说清、按约分摊。违反且经核实：视情节暂停账号，最长 6 个月；情节严重的永久封禁。
-- 暂停时长：1 / 3 / 7 / 30 / 90 / 180 天（违反球友约定的情形可到 180 天），status_until 必填

-- =====================================================================
-- 最终口径（上线版）：所有统计视图 / 函数集中在这里，按同一套定义
--   · 满员 = approved 行数（发起人本人就是其中一行，任何地方都不再 +1）+ games.filled（线下补位）>= capacity
--   · 只数 approved；withdrawn / left / rejected / expired 都不占位
--   · 成局率 = 未取消且已开打的球局中，开打时满员的比例；有 game_start_checks 时以它为准
--   · 区间指标一律用带 (from, to) 参数的函数现算（去重人数不能把每天的数相加）；旧的 7d / 30d 视图只是薄包装
-- =====================================================================

-- 球局卡片（发现页 / 详情）
create or replace view game_cards as
select g.*, v.name as venue_name_full, v.short_name, v.surface, v.surfaces, v.location as venue_location,
       u.nickname as host_nickname, u.utr as host_utr,
       count(p.user_id) filter (where p.status='approved') as approved_count,   -- 含发起人
       count(p.user_id) filter (where p.status='pending')  as pending_count,
       greatest(g.capacity - count(p.user_id) filter (where p.status='approved') - g.filled, 0) as spots_left
from games g left join venues v on v.id=g.venue_id join users u on u.id=g.host_id
left join game_participants p on p.game_id=g.id
group by g.id, v.id, u.id;

-- 开打时是否满员：每局一行（只含未取消、已开打的球局）
create or replace view v_game_fill as
select g.id as game_id, g.venue_id, g.host_id, g.starts_at, g.capacity, g.filled,
       (select count(*) from game_participants p where p.game_id=g.id and p.status='approved') as approved_n,
       coalesce(c.filled >= c.need,
                (select count(*) from game_participants p where p.game_id=g.id and p.status='approved') + g.filled >= g.capacity
       ) as full_at_start
from games g left join game_start_checks c on c.game_id=g.id
where g.status <> 'cancelled' and g.starts_at <= now();

-- 开打时段（墨尔本时间），full_at_start 同上口径
create or replace view admin_game_slots as
select g.id, g.starts_at,
  case when (g.starts_at at time zone 'Australia/Melbourne')::time <= time '08:00' then 'early'
       when (g.starts_at at time zone 'Australia/Melbourne')::time <  time '12:00' then 'am'
       when (g.starts_at at time zone 'Australia/Melbourne')::time <  time '17:00' then 'pm'
       when (g.starts_at at time zone 'Australia/Melbourne')::time <  time '19:00' then 'dusk'
       else 'night' end as slot,
  extract(isodow from g.starts_at at time zone 'Australia/Melbourne')::int as dow,
  f.full_at_start, c.reason
from games g left join v_game_fill f on f.game_id=g.id left join game_start_checks c on c.game_id=g.id;

-- 成局率（任意区间）：started = 未取消且已开打的球局数，full = 开打时满员的局数
create or replace function fill_rate(p_from timestamptz, p_to timestamptz)
returns table(started bigint, full_at_start bigint, rate numeric) language sql stable as $$
  select count(*), count(*) filter (where f.full_at_start),
         round(count(*) filter (where f.full_at_start)::numeric / nullif(count(*),0), 3)
  from v_game_fill f where f.starts_at >= p_from and f.starts_at < p_to
$$;

-- 确认爽约：发起人标记（attendance='no_show'），或发起人反馈，或两人局里另一位反馈，或 ≥2 位球友反馈；申诉 pending / upheld 期间不计
create or replace view v_confirmed_noshow as
with r as (
  select p.game_id, p.user_id from game_participants p where p.attendance = 'no_show'
  union
  select n.game_id, n.target_id
  from noshow_reports n join games g on g.id=n.game_id
  group by n.game_id, n.target_id, g.host_id, g.capacity
  having bool_or(n.reporter_id = g.host_id) or count(*) >= 2 or g.capacity = 2
)
select r.game_id, r.user_id, g.starts_at
from r join games g on g.id=r.game_id
where not exists (select 1 from noshow_appeals a where a.game_id=r.game_id and a.user_id=r.user_id and a.status in ('pending','upheld'));

-- 一场「算数」的球（场次、徽章、等级都用这一个定义）
create or replace view v_counted_games as
select p.user_id, p.game_id, p.role, g.starts_at, g.venue_id, g.host_id
from game_participants p join games g on g.id=p.game_id
where p.status = 'approved' and g.status <> 'cancelled'
  and g.starts_at + make_interval(mins => g.duration_min) <= now()
  and (g.filled > 0 or exists (select 1 from game_participants o where o.game_id=p.game_id and o.user_id<>p.user_id and o.status='approved'))
  and not exists (select 1 from v_confirmed_noshow n where n.game_id=p.game_id and n.user_id=p.user_id);

-- 好评 v2 / v3：好评人数 = 给过你印象的不同球友；好评率 = 好评人数 ÷ max(一起打过球的不同球友, 好评人数)
create or replace view user_kudos_v2 as
with k as (select to_id as user_id, count(distinct from_id) as kudos from impressions group by to_id),
     pt as (select a.user_id, count(distinct b.user_id) as partners
            from v_counted_games a join game_participants b on b.game_id=a.game_id and b.user_id<>a.user_id and b.status='approved'
            group by a.user_id)
select coalesce(k.user_id, pt.user_id) as user_id,
       coalesce(k.kudos,0) as kudos, coalesce(pt.partners,0) as partners,
       round(coalesce(k.kudos,0)::numeric / nullif(greatest(coalesce(pt.partners,0), coalesce(k.kudos,0)),0), 3) as kudos_rate,
       -- 等级用的好评率（平滑，和前台 grRate 一致）：(好评人数 + 1) / (max(一起打过的球友, 好评人数) + 4)
       round((coalesce(k.kudos,0) + 1)::numeric / (greatest(coalesce(pt.partners,0), coalesce(k.kudos,0)) + 4), 3) as level_rate
from k full join pt on pt.user_id=k.user_id;

-- 球员卡汇总（v3 口径；原积分版已废弃）
create or replace view player_cards as
select u.id as user_id, u.member_no, u.nickname, u.last_initial, u.utr, u.avatar_kind, u.avatar_animal, u.avatar_color, u.seal_roll, u.card_theme,
       coalesce(u.main_club_id,
         (select uc.venue_id from user_clubs uc where uc.user_id=u.id order by uc.created_at limit 1),
         (select c.venue_id from v_counted_games c where c.user_id=u.id and c.venue_id is not null
           group by c.venue_id order by count(*) desc limit 1))                       as card_venue_id,
       (select count(*) from v_counted_games c where c.user_id=u.id)                    as played,
       (select count(*) from v_counted_games c where c.user_id=u.id and c.role='host')  as hosted,
       coalesce(k.kudos,0)                                                              as kudos,
       u.level                                                                          as level   -- 🌱 初见 · 🍃 相伴 · 🌿 常伴 · 🌲 挚友 · 🌳 南伴之光
from users u left join user_kudos_v2 k on k.user_id=u.id;

-- 徽章稀有度 = 拥有人数 ÷ 至少 1 场算数球局的用户数
create or replace view v_badge_rarity as
with base as (select count(distinct user_id) as n from v_counted_games)
select b.code, count(*) as holders, base.n as base_users,
       round(count(*)::numeric / nullif(base.n,0), 4) as rarity
from user_badges b cross join base group by b.code, base.n;

-- 区域热度：近 30 天每个区的球局数、申请次数、成局率
create or replace view v_suburb_activity as
select v.suburb, count(distinct g.id) as games,
       (select count(*) from game_participants p join games g2 on g2.id=p.game_id join venues v2 on v2.id=g2.venue_id
         where v2.suburb is not distinct from v.suburb and p.role='player' and g2.status <> 'cancelled' and g2.starts_at > now() - interval '30 days') as applications,
       round(count(distinct f.game_id) filter (where f.full_at_start)::numeric / nullif(count(distinct f.game_id),0), 3) as fill_rate
from games g join venues v on v.id=g.venue_id left join v_game_fill f on f.game_id=g.id
where g.starts_at > now() - interval '30 days' and g.status <> 'cancelled'
group by v.suburb;

-- 最活跃的球场（近 30 天）：开打时满员的局×3 + 发布的局×1 + 申请次数×0.5
create or replace view v_venue_activity_30d as
with g as (select g.id, g.venue_id from games g where g.starts_at > now()-interval '30 days' and g.status <> 'cancelled'),
     s as (select g.venue_id, count(*) as games,
                  count(*) filter (where f.full_at_start) as played,
                  (select count(*) from game_participants p join g g3 on g3.id=p.game_id where g3.venue_id=g.venue_id and p.role='player') as applications
           from g left join v_game_fill f on f.game_id=g.id group by g.venue_id)
select v.id as venue_id, v.short_name, v.suburb, s.games, s.played, s.applications,
       s.played*3 + s.games + s.applications*0.5 as score
from venues v join s on s.venue_id=v.id
where v.status = 'active';

-- 「申请」的两种口径（只数 player 行；发起人那一行不算申请）
create or replace view v_applications_daily as
select date(created_at at time zone 'Australia/Melbourne') as day,
  count(*) as applications, count(distinct user_id) as applicants,
  count(*) filter (where status='approved')  as approved,
  count(*) filter (where status='rejected')  as declined,
  count(*) filter (where status='expired')   as expired,
  count(*) filter (where status='withdrawn') as withdrawn,
  count(*) filter (where status='left')      as left_after_approved,
  count(*) filter (where status='pending')   as pending
from game_participants where role='player' group by 1;

-- 活跃人数（区间去重）：登录用户 + 未登录设备
create or replace function active_users(p_from timestamptz, p_to timestamptz)
returns table(users bigint, anon_visitors bigint) language sql stable as $$
  select count(distinct user_id), count(distinct anon_id) filter (where user_id is null)
  from events where occurred_at >= p_from and occurred_at < p_to
$$;

-- 用户活跃分（任意区间）：权重读 activity_weights
create or replace function user_activity(p_from timestamptz, p_to timestamptz)
returns table(user_id uuid, member_no bigint, nickname text, host_ok bigint, played bigint, apply bigint,
              invite bigint, impression bigint, active_day bigint, no_show bigint, score numeric)
language sql stable as $$
  with x as (
    select u.id as uid, u.member_no as mno, u.nickname as nick,
      (select count(*) from v_game_fill f where f.host_id=u.id and f.full_at_start and f.starts_at >= p_from and f.starts_at < p_to) as host_ok,
      (select count(*) from v_counted_games c where c.user_id=u.id and c.starts_at >= p_from and c.starts_at < p_to) as played,
      (select count(*) from game_participants p where p.user_id=u.id and p.role='player' and p.created_at >= p_from and p.created_at < p_to) as apply,
      (select count(*) from invites i where i.from_user=u.id and i.created_at >= p_from and i.created_at < p_to) as invite,
      (select count(*) from impressions m where m.from_id=u.id and m.created_at >= p_from and m.created_at < p_to) as impression,
      (select count(distinct (e.occurred_at at time zone 'Australia/Melbourne')::date) from events e
         where e.user_id=u.id and e.occurred_at >= p_from and e.occurred_at < p_to) as active_day,
      (select count(*) from v_confirmed_noshow n where n.user_id=u.id and n.starts_at >= p_from and n.starts_at < p_to) as no_show
    from users u)
  select x.uid, x.mno, x.nick, x.host_ok, x.played, x.apply, x.invite, x.impression, x.active_day, x.no_show,
    (select coalesce(sum(w.weight * case w.k when 'host_ok' then x.host_ok when 'played' then x.played when 'apply' then x.apply
        when 'invite' then x.invite when 'impression' then x.impression when 'active_day' then x.active_day when 'no_show' then x.no_show else 0 end),0)
       from activity_weights w)
  from x
$$;
-- 后台列表同时显示 users.id（UUID）和 member_no，方便在数据库里定位
create or replace view v_user_activity_7d as select * from user_activity(now() - interval '7 days', now());

-- 页面流量（任意区间）：按 device（手机 / 电脑）× 页面；不按 platform（构建文件）拆
create or replace function page_traffic(p_from timestamptz, p_to timestamptz)
returns table(device text, screen text, views bigint, visitors bigint, avg_seconds numeric) language sql stable as $$
  select coalesce(e.device,'unknown'), e.props->>'screen',
    count(*) filter (where e.event='page_view'),
    count(distinct coalesce(e.user_id::text, e.anon_id)) filter (where e.event='page_view'),
    round(avg((e.props->>'ms')::numeric) filter (where e.event='page_time')/1000, 1)
  from events e
  where e.occurred_at >= p_from and e.occurred_at < p_to and e.event in ('page_view','page_time')
  group by 1, 2
$$;
create or replace view v_page_traffic_7d as select * from page_traffic(now() - interval '7 days', now());

-- 被看最多的球员卡（任意区间，排除自己看自己）；站外落地 = 打开 /p/{no} 分享页（card_view.via='link'，按 events_spec；旧值 'external' 兼容）
create or replace function card_views(p_from timestamptz, p_to timestamptz)
returns table(user_id uuid, views bigint, from_outside bigint, external_landings bigint, viewers bigint) language sql stable as $$
  select (e.props->>'target_uid')::uuid, count(*),
    count(*) filter (where e.props->>'via' in ('link','share_link','external')),
    count(*) filter (where e.props->>'via' in ('link','external')),
    count(distinct coalesce(e.user_id::text, e.anon_id))
  from events e
  where e.event='card_view' and coalesce((e.props->>'own')::boolean,false) = false
    and e.props->>'target_uid' ~ '^[0-9a-f-]{36}$'
    and e.occurred_at >= p_from and e.occurred_at < p_to
  group by 1
$$;
create or replace view v_card_views_30d as select * from card_views(now() - interval '30 days', now());

-- 使用环境（任意区间）：会话数、人数、平均会话时长（ended_at 由服务端写）
create or replace function env_usage(p_from timestamptz, p_to timestamptz)
returns table(env text, device text, sessions bigint, people bigint, avg_seconds numeric) language sql stable as $$
  select s.env, s.device, count(*), count(distinct coalesce(s.user_id::text, s.anon_id)),
    round(avg(extract(epoch from (s.ended_at - s.started_at))))
  from sessions s where s.started_at >= p_from and s.started_at < p_to
  group by 1, 2
$$;
create or replace view v_env_30d as select * from env_usage(now() - interval '30 days', now());

-- =====================================================================
-- 上线前修正（第一批，2026-10）：可重复执行；新库与老库都能跑
-- =====================================================================
-- ① user_badges 统一到一套列（code / earned_at / game_id / seen_at / shared_at）：
--    早期库里如果是另一版（badge_code 列），改名并补齐缺的列；新库这几句什么都不做
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = current_schema() and table_name='user_badges' and column_name='badge_code')
     and not exists (select 1 from information_schema.columns where table_schema = current_schema() and table_name='user_badges' and column_name='code') then
    alter table user_badges rename column badge_code to code;
  end if;
end $$;
alter table user_badges add column if not exists earned_at timestamptz not null default now();
alter table user_badges add column if not exists game_id   uuid references games(id) on delete set null;
alter table user_badges add column if not exists seen_at   timestamptz;
alter table user_badges add column if not exists shared_at timestamptz;

-- ② 举报来源：首期没有站内举报入口，用户发邮件到 safety@，由管理员录入（source='email'，entered_by = 录入的管理员）；
--    站内举报（source='in_app'）属第二批决策，上线前不会有这类行
alter table reports add column if not exists source text not null default 'email' check (source in ('email','in_app'));
alter table reports add column if not exists entered_by uuid references admin_users(id);
alter table reports add column if not exists source_ref text;    -- 邮件主题 / 邮件 ID，方便回溯（不存邮件正文）

-- ③ 风险规则与前台 / 后台口径对齐：
--    确认爽约 = 发起人反馈，或两人局里另一位反馈，或 ≥2 位球友反馈（v_confirmed_noshow）；近 30 天 2 次 → 建议暂停 7 天
--    「临开局 2 小时内取消」拆成「参加者开打前 24 小时内退出」和「发起人临时取消」；补三条信号
insert into risk_rules (code, name, weight, threshold, window_days, enabled) values
 ('no_show',         '确认爽约（发起人反馈 / 两人局另一位反馈 / ≥2 位球友反馈）', 25, 2, 30, true),
 ('late_leave',      '参加者开打前 24 小时内退出',                               10, 3, 30, true),
 ('host_late_cancel','发起人临时取消（开打前 24 小时内取消已有人加入的局）',          10, 2, 30, true),
 ('pact_violation',  '违反球友约定（举报核实）',                                   30, 1, 90, true),
 ('less_marked',     '被多人标「少遇到」（≥3 人）',                                10, 3, 90, true),
 ('invite_declined', '30 天内邀约被同一人婉拒 2 次后仍尝试',                         10, 2, 30, true)
on conflict (code) do update set name=excluded.name, weight=excluded.weight, threshold=excluded.threshold,
  window_days=excluded.window_days, enabled=excluded.enabled;
-- 旧规则 late_cancel 已拆分：没有提醒引用的直接删，有历史提醒的保留但停用
delete from risk_rules r where r.code='late_cancel' and not exists (select 1 from risk_alerts a where a.rule_code=r.code);
update risk_rules set enabled=false, name=name || '（已拆分为 late_leave / host_late_cancel）' where code='late_cancel' and enabled;

-- ④ 已废弃的对象：保留结构只为兼容旧数据，不再写入、任何视图 / 后台都不读
--    等级唯一口径 = 成长体系 v3（users.level + user_level_log）；好评 = impressions（user_kudos_v2）
comment on table points_ledger is '【已废弃】v1 积分流水，不再写入；等级见 users.level（v3）+ user_level_log';
comment on type  point_kind    is '【已废弃】v1 积分类型';
comment on table kudos         is '【已废弃】已迁移到 impressions；一键点赞也写 impressions';
comment on table user_scores   is '【已废弃】v1 四个隐藏分，不再写入；等级见 users.level（v3）';
comment on table stage_history is '【已废弃】v1 阶段变化，不再写入；升级记录见 user_level_log';
comment on view  user_kudos    is '【已废弃】按「评价人 × 球局」计次的旧好评口径；现行用 user_kudos_v2';
comment on view  player_cards  is '球员卡汇总（v3 口径：played / hosted 来自 v_counted_games，kudos 来自 user_kudos_v2，level = users.level）';
comment on column users.analytics_opt_out is '「使用数据」开关的服务端准绳：前端开关与它同步（登录时以它为准）；为 true 时客户端事件与服务端事件都不写入 events';
comment on column games.cancelled_at is '发起人取消时间（status=cancelled 时由触发器补写；前端取消时也会带上）';
comment on column game_participants.left_at is '撤回（withdrawn）/ 退出（left）的时间；行永远保留（软删除）';
comment on column game_participants.decline_reason is 'known / level / pass（发起人婉拒）· full_auto（满员自动结束）· blocked（屏蔽自动结束）→ status=rejected；timeout → status=expired。旧值 full/friends→known，next/time→pass';
comment on table events is '原始事件，按月分区（UTC 边界）+ events_default 兜底；上线后用 pg_partman 每月预建 3 个月分区';

-- ⑤ 账号状态落地（第二批第 1 轮）：前台拦截与服务端同一套规则
alter type notif_kind add value if not exists 'account_status';   -- 账号状态变化（暂停 / 受限 / 核实 / 封禁 / 恢复正常）；本人注销不发
-- 能不能做：返回 null = 可以；否则返回拦截原因（= 当前状态），API 返回 403 + 这个值，前台据此显示说明
--   p_action：apply / join / create / invite / accept / chat / counter
--   review    只拦女生局（apply / join 且 p_women）
--   limited   拦女生局；invite / chat / accept 对象没一起打过球时拦（counter 是对已存在的邀约改时间，不拦）
--   suspended 拦全部写操作（到期由定时任务恢复为 active；这里按 status_until 再判断一次，避免定时任务延迟）
--   banned / deleted 全部拦
create or replace function can_act(p_uid uuid, p_action text, p_target uuid default null, p_women boolean default false)
returns text language sql stable as $$
  with u as (select case when status = 'suspended' and status_until <= now() then 'active' else status end as st
               from users where id = p_uid),
  played as (select exists (select 1 from game_participants a join game_participants b on b.game_id = a.game_id
                            join games g on g.id = a.game_id
                             where a.user_id = p_uid and b.user_id = p_target and a.status = 'approved' and b.status = 'approved'
                               and g.status <> 'cancelled' and g.starts_at < now()) as ok)
  select case
    when u.st = 'active' then null
    when u.st in ('banned','deleted') then u.st
    when u.st = 'suspended' and p_action in ('apply','join','create','invite','accept','chat','counter') then 'suspended'
    when u.st in ('review','limited') and p_action in ('apply','join') and p_women then u.st
    when u.st = 'limited' and p_action in ('invite','chat','accept') and p_target is not null and not (select ok from played) then 'limited'
    else null end
  from u
$$;
comment on function can_act(uuid, text, uuid, boolean) is '账号状态权限（与前台 acctCan 同一套）：null = 可以，否则返回拦截原因';
-- 状态变化时的连带处理（在同一事务里由后台 / 定时任务 / 注销接口执行）：
--   suspended / banned / deleted：待确认的申请 → withdrawn（left_at = now()），发起人那条申请通知隐藏
--   banned / deleted：已加入、未开打的球局 → left 并通知发起人（player_left）；发起的未开打球局 → cancelled 并通知已加入 / 待确认的人；进行中的邀约 → withdrawn
--   除 deleted 外都给本人发 account_status 通知；每次变化写 user_status_log 和服务端事件 account_status_change(from, to, reason)
--   deleted 30 天内用同一手机号登录可恢复为 active（已退出的球局不自动恢复）；超过 30 天匿名化

-- ⑥ 站内举报（第二批第 2 轮）
--   入口：球员卡 → target_type=user；私信 → user（context_ref = 对话 id）；球局聊天 → game（context_ref = 对话 id）
--   站内原因 5 选 1：pact_violation / harass / no_show / fake_profile / other（other 必须写说明）；gender_fake / rude / spam 只用于管理员录入邮件举报
--   说明 ≤200 字；同一举报人对同一对象未处理（open）时只能有一条；不告诉被举报人是谁举报的
alter table reports add column if not exists via text check (via in ('card','chat'));
alter table reports add column if not exists context_ref text;     -- 聊天举报时的对话 id，便于管理员核对上下文
alter table reports add constraint reports_source_chk check (
  case when source = 'in_app'
       then entered_by is null and via is not null
        and reason in ('pact_violation','harass','no_show','fake_profile','other')
        and (reason <> 'other' or coalesce(btrim(note), '') <> '')
        and (note is null or char_length(note) <= 200)
        and target_type in ('user','game')
       else entered_by is not null and via is null end);
create unique index if not exists reports_one_open on reports (reporter_id, target_type, target_id) where status = 'open';
comment on column reports.via is '站内举报的入口：card 球员卡 / chat 聊天；邮件录入为空';

-- =====================================================================
-- ⑦ 后台卡片的数据源（第三批 3e，2026-10）：后台每张卡片标题旁 ⓘ 写的视图 / 函数都在这里或上文定义
--    时间一律按墨尔本日界；p_from / p_to 为左闭右开；「人」= 登录用户按 user_id，未登录按 anon_id
-- =====================================================================
-- 墨尔本某天 0 点（夏令时切换那天只有 23 / 25 小时）：天的边界一律用它，不要写「0 点 + interval '1 day'」——
--   timestamptz + interval '1 day' 按会话时区算，会话是 UTC 时在切换日会差 1 小时
create or replace function mel_day_start(p_day date) returns timestamptz language sql immutable as $$
  select p_day::timestamp at time zone 'Australia/Melbourne'
$$;
create or replace function mel_today() returns date language sql stable as $$ select (now() at time zone 'Australia/Melbourne')::date $$;

-- 今天面板（不受时间范围筛选）：还要开打 / 已人齐 / 还缺人 / 2 小时内开打还缺人 / 今天取消 / 等确认的申请 / 15 分钟内失效 / 想打没打上
create or replace function today_board()
returns table(left_n bigint, filled_n bigint, short_n bigint, soon_short bigint, cancelled_n bigint, pending_n bigint, expiring_n bigint, unmet_n bigint)
language sql stable as $$
  with d as (select mel_day_start(mel_today()) as d0, mel_day_start(mel_today() + 1) as d1),
  g as (select g.*, (select count(*) from game_participants p where p.game_id=g.id and p.status='approved') + g.filled >= g.capacity as ok
          from games g, d where g.visibility='public' and g.starts_at >= d.d0 and g.starts_at < d.d1),
  up as (select * from g where g.starts_at >= now() and g.status <> 'cancelled'),
  pend as (select p.*, g.starts_at from game_participants p join games g on g.id=p.game_id
            where p.role='player' and p.status='pending' and g.visibility='public' and g.starts_at > now()),
  lost as (select distinct p.user_id from game_participants p join g on g.id=p.game_id where p.role='player' and p.status in ('expired','rejected')),
  inn  as (select distinct p.user_id from game_participants p join g on g.id=p.game_id where p.status='approved')
  select (select count(*) from up), (select count(*) from up where ok), (select count(*) from up where not ok),
         (select count(*) from up where not ok and starts_at < now() + interval '2 hours'),
         (select count(*) from g where status='cancelled'),
         (select count(*) from pend), (select count(*) from pend where application_deadline(created_at, starts_at) < now() + interval '15 minutes'),
         (select count(*) from lost where user_id not in (select user_id from inn))
$$;

-- 最活跃的球场（任意区间，按开打时间；只算已核实的球场）：活跃度 = 开打时人齐的局×3 + 发布的局 + 申请×0.5
create or replace function venue_activity(p_from timestamptz, p_to timestamptz)
returns table(venue_id uuid, short_name text, suburb text, games bigint, played bigint, applications bigint, score numeric)
language sql stable as $$
  with g as (select g.id, g.venue_id from games g where g.visibility='public' and g.status <> 'cancelled' and g.starts_at >= p_from and g.starts_at < p_to),
  s as (select g.venue_id, count(*) as games, count(*) filter (where f.full_at_start) as played,
               (select count(*) from game_participants p join g g2 on g2.id=p.game_id where g2.venue_id=g.venue_id and p.role='player') as applications
          from g left join v_game_fill f on f.game_id=g.id group by g.venue_id)
  select v.id, v.short_name, v.suburb, s.games, s.played, s.applications, s.played*3 + s.games + s.applications*0.5
  from venues v join s on s.venue_id=v.id where v.status='active'
$$;

-- 区域（任意区间）：按球场所在区，自己填写场地的局归到「自填场地」；新注册按球友第一次填的所在区；prev_games = 上一个等长区间（算增长）
create or replace function suburb_activity(p_from timestamptz, p_to timestamptz)
returns table(suburb text, games bigint, prev_games bigint, applications bigint, full_games bigint, new_users bigint, score numeric)
language sql stable as $$
  with g as (select g.id, g.starts_at, coalesce(v.suburb, '自填场地') as sub from games g left join venues v on v.id=g.venue_id
              where g.status <> 'cancelled' and g.starts_at >= p_from - (p_to - p_from) and g.starts_at < p_to),
  cur as (select g.sub, count(*) as games, count(*) filter (where f.full_at_start) as full_games,
                 (select count(*) from game_participants p join g g2 on g2.id=p.game_id where g2.sub=g.sub and g2.starts_at >= p_from and p.role='player') as applications
            from g left join v_game_fill f on f.game_id=g.id where g.starts_at >= p_from group by g.sub),
  prv as (select sub, count(*) as n from g where starts_at < p_from group by sub),
  nu as (select fp.suburb as sub, count(*) as n from users u
           join lateral (select s.suburb from user_suburb_picks s where s.user_id=u.id order by s.picked_at limit 1) fp on true
          where u.created_at >= p_from and u.created_at < p_to group by fp.suburb),
  k as (select sub from cur union select sub from nu)
  select k.sub, coalesce(cur.games,0), coalesce(prv.n,0), coalesce(cur.applications,0), coalesce(cur.full_games,0), coalesce(nu.n,0),
         coalesce(cur.full_games,0)*3 + coalesce(cur.games,0) + coalesce(cur.applications,0)*0.5
  from k left join cur on cur.sub=k.sub left join prv on prv.sub=k.sub left join nu on nu.sub=k.sub
$$;

-- 大家几点打球：到了开打时间的球局（含取消），星期（1=周一）× 小时
create or replace function start_heatmap(p_from timestamptz, p_to timestamptz)
returns table(dow int, hour int, games bigint, cancelled bigint) language sql stable as $$
  select extract(isodow from g.starts_at at time zone 'Australia/Melbourne')::int, extract(hour from g.starts_at at time zone 'Australia/Melbourne')::int,
         count(*), count(*) filter (where g.status='cancelled')
  from games g where g.visibility='public' and g.starts_at >= p_from and g.starts_at < least(p_to, now())
  group by 1, 2
$$;

-- 从来访到打上球：按人去重，每一步都是上一步里的人（来访 → 看过球局 → 申请 / 加入 → 被通过 → 打完）
create or replace function visit_funnel(p_from timestamptz, p_to timestamptz)
returns table(step int, name text, people bigint) language sql stable as $$
  with v as (select distinct coalesce(user_id::text, anon_id) as who, user_id from events where occurred_at >= p_from and occurred_at < p_to),
  gv as (select distinct coalesce(user_id::text, anon_id) as who from events where event='game_view' and occurred_at >= p_from and occurred_at < p_to),
  ap as (select distinct user_id from game_participants where role='player' and created_at >= p_from and created_at < p_to),
  ok as (select distinct user_id from game_participants where role='player' and status in ('approved','left') and created_at >= p_from and created_at < p_to),
  pl as (select distinct c.user_id from v_counted_games c join game_participants p on p.game_id=c.game_id and p.user_id=c.user_id
          where p.role='player' and p.created_at >= p_from and p.created_at < p_to),
  s1 as (select * from v), s2 as (select * from s1 where who in (select who from gv)),
  s3 as (select * from s2 where user_id in (select user_id from ap)), s4 as (select * from s3 where user_id in (select user_id from ok)),
  s5 as (select * from s4 where user_id in (select user_id from pl))
  select 1, '来访', (select count(*) from s1) union all select 2, '看过球局', (select count(*) from s2)
  union all select 3, '申请 / 加入', (select count(*) from s3) union all select 4, '被通过', (select count(*) from s4)
  union all select 5, '打完', (select count(*) from s5)
$$;

-- 留存：近 90 天注册的人，第 1 / 7 / 30 天（墨尔本日）有没有再来；还没到那天为 null
create or replace view v_user_retention as
with u as (select id, (created_at at time zone 'Australia/Melbourne')::date as d0 from users where created_at > now() - interval '90 days'),
     a as (select distinct user_id, (occurred_at at time zone 'Australia/Melbourne')::date as d from events where user_id is not null and occurred_at > now() - interval '121 days'),
     today as (select (now() at time zone 'Australia/Melbourne')::date as t)
select u.id as user_id, u.d0 as signup_day, date_trunc('week', u.d0)::date as signup_week,
       case when u.d0 + 1  <= today.t then exists (select 1 from a where a.user_id=u.id and a.d=u.d0 + 1)  end as d1,
       case when u.d0 + 7  <= today.t then exists (select 1 from a where a.user_id=u.id and a.d=u.d0 + 7)  end as d7,
       case when u.d0 + 30 <= today.t then exists (select 1 from a where a.user_id=u.id and a.d=u.d0 + 30) end as d30
from u, today;

-- 分享与带来的人（任意区间）：kind = game / card；分享按发生时间，打开按打开时间（link_visits），带来注册 = 打开分享链接当天注册
create or replace function share_attribution(p_from timestamptz, p_to timestamptz)
returns table(kind text, channel text, shares bigint, opens bigint, signups bigint) language sql stable as $$
  with sh as (
    select case when event='card_share' then 'card' else 'game' end as kind,
           case when event='card_share' then coalesce(props->>'channel','other')
                when event in ('share_xhs_copy','poster_open') then 'xhs' when event='share_copy_text' then 'wechat'
                when event='share_copy_link' then 'copy' else 'system' end as channel
      from events where event in ('card_share','share_copy_link','share_copy_text','share_system','share_xhs_copy')
       and coalesce((props->>'ok')::boolean, true) and occurred_at >= p_from and occurred_at < p_to),
  op as (select case when l.game_id is null then 'card' else 'game' end as kind, coalesce(l.source,'other') as channel, l.visitor_id, l.user_id, l.created_at
           from link_visits l where l.created_at >= p_from and l.created_at < p_to),
  k as (select kind, channel from sh union select kind, channel from op)
  select k.kind, k.channel, (select count(*) from sh where sh.kind=k.kind and sh.channel=k.channel),
         (select count(*) from op where op.kind=k.kind and op.channel=k.channel),
         (select count(distinct op.user_id) from op join users u on u.id=op.user_id
           where op.kind=k.kind and op.channel=k.channel
             and (u.created_at at time zone 'Australia/Melbourne')::date = (op.created_at at time zone 'Australia/Melbourne')::date)
  from k
$$;

-- 申请的结果（任意区间，按申请时间；互斥，加起来 = 申请次数；不含发起人那一行）
create or replace function application_outcomes(p_from timestamptz, p_to timestamptz)
returns table(outcome text, device text, n bigint) language sql stable as $$
  select case when status in ('approved','left') then 'approved'
              when status='rejected' and decline_reason='full_auto' then 'full_auto'
              when status='rejected' and decline_reason='blocked' then 'blocked'
              when status='rejected' then 'declined'
              else status::text end, coalesce(device,'unknown'), count(*)
  from game_participants where role='player' and created_at >= p_from and created_at < p_to group by 1, 2
$$;

-- 多人申请的局：每个公开球局一行；applicants 不含发起人；host_minutes = 发起人亲自处理（通过 / 婉拒，不含直接加入、自动结束）的中位用时
create or replace view v_multi_applicant_games as
select g.id as game_id, g.created_at, g.starts_at, g.status,
       count(p.user_id) as applicants, count(p.user_id) >= 4 as multi,
       count(p.user_id) filter (where p.decline_reason='full_auto') as full_auto,
       f.full_at_start,
       percentile_cont(0.5) within group (order by extract(epoch from (p.decided_at - p.created_at))/60)
         filter (where p.via='request' and p.decided_at is not null and (p.status in ('approved','left') or p.decline_reason in ('known','level','pass'))) as host_minutes
from games g join game_participants p on p.game_id=g.id and p.role='player'
left join v_game_fill f on f.game_id=g.id
where g.visibility='public'
group by g.id, f.full_at_start;

-- 邀约的结果：每条邀约一行；played_before = 发出前两人已一起打完过；reply_minutes = 发出到接受 / 婉拒
create or replace view v_invite_outcomes as
select i.id as invite_id, i.from_user, i.to_user, i.created_at, i.status, i.game_id,
       i.status in ('accepted','declined','expired') as decided,
       case when i.status in ('accepted','declined') then extract(epoch from (i.responded_at - i.created_at))/60 end as reply_minutes,
       exists (select 1 from v_counted_games a join v_counted_games b on b.game_id=a.game_id
                where a.user_id=i.from_user and b.user_id=i.to_user and a.starts_at < i.created_at) as played_before
from invites i;

-- 少遇到的效果（任意区间）：type = join（拦下的直接加入）/ invite（拦下的邀约）/ dm（静音的私信）/ rank（排序后移的球局）
create or replace function less_effect_counts(p_from timestamptz, p_to timestamptz)
returns table(type text, n bigint, people bigint) language sql stable as $$
  select props->>'type', count(*), count(distinct user_id) from events
  where event='less_effect' and occurred_at >= p_from and occurred_at < p_to group by 1
$$;

-- 场次够了、还没升上去：每人对每个「场次已够的下一级」一行，标出卡在哪一项（可多项）；门槛与前台 v3 一致
create or replace view v_level_stuck as
with lv(level, games, attend, rate, givers) as (values (3, 50, 0.90, 0.5, 10), (4, 100, 0.95, 0.667, 25), (5, 200, 0.98, 0.667, 50)),
st as (select u.id as user_id, u.level,
         (select count(*) from v_counted_games c where c.user_id=u.id) as played,
         (select count(*) from v_confirmed_noshow n where n.user_id=u.id) as noshow_all,
         (select count(*) from v_confirmed_noshow n where n.user_id=u.id and n.starts_at > now() - interval '90 days') as noshow_90,
         exists (select 1 from reports r where r.target_type='user' and r.target_id=u.id::text and r.status='actioned' and r.created_at > now() - interval '180 days') as report_6m,
         coalesce(k.level_rate, 0.25) as rate, coalesce(k.kudos, 0) as givers
       from users u left join user_kudos_v2 k on k.user_id=u.id)
select st.user_id, lv.level as target_level, st.played,
       st.rate < lv.rate as low_rate, st.givers < lv.givers as low_givers,
       st.played::numeric / nullif(st.played + st.noshow_all, 0) < lv.attend as low_attend,
       case when lv.level = 3 then st.noshow_90 >= 4 else st.noshow_90 >= 2 end as noshow_cap,   -- 近 90 天爽约 ≥2 最高 Lv3，≥4 最高 Lv2
       lv.level = 5 and st.report_6m as recent_report
from st join lv on st.played >= lv.games and st.level < lv.level;

-- 怎么进来的（任意区间）：每次会话的进入方式 session_start.entry（share / external / direct / push），按设备
create or replace function entry_sources(p_from timestamptz, p_to timestamptz)
returns table(device text, entry text, sessions bigint, people bigint) language sql stable as $$
  select coalesce(device,'unknown'), coalesce(props->>'entry','direct'), count(*), count(distinct coalesce(user_id::text, anon_id))
  from events where event='session_start' and occurred_at >= p_from and occurred_at < p_to group by 1, 2
$$;

-- 站内从哪里点进球局：game_view.via（list / map / chat / notif / card / mine / detail / link / share_link）
create or replace function game_view_via(p_from timestamptz, p_to timestamptz)
returns table(device text, via text, views bigint, people bigint) language sql stable as $$
  select coalesce(device,'unknown'), coalesce(props->>'via','other'), count(*), count(distinct coalesce(user_id::text, anon_id))
  from events where event='game_view' and occurred_at >= p_from and occurred_at < p_to group by 1, 2
$$;

-- 手机 / 电脑关键指标对比（任意区间）：每项都按当时用的设备
create or replace function device_compare(p_from timestamptz, p_to timestamptz)
returns table(device text, active_people bigint, signups bigint, games bigint, applications bigint, fill_rate numeric) language sql stable as $$
  with d(device) as (values ('mobile'), ('desktop'))
  select d.device,
    (select count(distinct coalesce(e.user_id::text, e.anon_id)) from events e where e.device=d.device and e.occurred_at >= p_from and e.occurred_at < p_to),
    (select count(*) from events e where e.event='signup_complete' and e.device=d.device and e.occurred_at >= p_from and e.occurred_at < p_to),
    (select count(*) from games g where g.visibility='public' and g.created_device=d.device and g.created_at >= p_from and g.created_at < p_to),
    (select count(*) from game_participants p where p.role='player' and p.device=d.device and p.created_at >= p_from and p.created_at < p_to),
    (select round(count(*) filter (where f.full_at_start)::numeric / nullif(count(*),0), 3)
       from v_game_fill f join games g on g.id=f.game_id where g.created_device=d.device and f.starts_at >= p_from and f.starts_at < p_to)
  from d
$$;

-- 添加到主屏幕（任意区间）：在手机浏览器里用过的球友 → 打开过引导 → 已添加 → 最近 7 天还从主屏幕打开（按人去重，每一步都是上一步里的人）
create or replace function pwa_install_funnel(p_from timestamptz, p_to timestamptz)
returns table(step int, name text, people bigint) language sql stable as $$
  with s1 as (select distinct user_id from sessions where device='mobile' and not coalesce(standalone,false) and user_id is not null
               and started_at >= p_from and started_at < p_to),
  s2 as (select * from s1 where user_id in (select user_id from events where event='a2hs_open' and occurred_at >= p_from and occurred_at < p_to)),
  s3 as (select * from s2 where user_id in (select id from users where installed_at is not null)),
  s4 as (select * from s3 where user_id in (select user_id from sessions where standalone and started_at > now() - interval '7 days'))
  select 1, '在手机浏览器里用过', (select count(*) from s1) union all select 2, '打开过添加引导', (select count(*) from s2)
  union all select 3, '已添加到主屏幕', (select count(*) from s3) union all select 4, '最近 7 天还从主屏幕打开', (select count(*) from s4)
$$;

-- 微信 / 小红书里的球友去哪了（任意区间）：按登录后的用户 ID 串起不同环境
--   在 App 内打开过 → 之后在别的环境（浏览器 / 主屏幕）打开过 → 之后申请或发起过球局
create or replace function inapp_handoff_funnel(p_from timestamptz, p_to timestamptz)
returns table(env text, inapp_users bigint, moved bigint, acted bigint) language sql stable as $$
  with a as (select s.env, s.user_id, min(s.started_at) as t0 from sessions s
              where s.env in ('wechat','xhs') and s.user_id is not null and s.started_at >= p_from and s.started_at < p_to group by 1, 2),
  m as (select a.*, (select min(s.started_at) from sessions s where s.user_id=a.user_id and s.started_at > a.t0
                      and coalesce(s.env,'') not in ('wechat','xhs','ig_fb')) as t1 from a)
  select m.env, count(*), count(*) filter (where m.t1 is not null),
         count(*) filter (where m.t1 is not null and (
            exists (select 1 from game_participants p where p.user_id=m.user_id and p.role='player' and p.created_at > m.t1)
            or exists (select 1 from games g where g.host_id=m.user_id and g.created_at > m.t1)))
  from m group by m.env
$$;

-- 提醒去了哪里（任意区间，按第一次送达时间；夜间顺延的按 8 点）：每条提醒的第一去向 + 原因；opened = 已读；go_extra = 出发类同时推手机
create or replace function notification_route(p_from timestamptz, p_to timestamptz)
returns table(channel text, reason text, device text, notifications bigint, opened bigint, go_extra bigint) language sql stable as $$
  with f as (select distinct on (d.notification_id) d.notification_id, d.channel, d.reason, d.at, ud.platform
               from notification_deliveries d left join user_devices ud on ud.id=d.device_id
              where d.reason is distinct from 'go_kind' order by d.notification_id, d.at, d.id)
  select f.channel, f.reason, f.platform, count(*), count(*) filter (where n.read_at is not null),
         count(*) filter (where exists (select 1 from notification_deliveries g where g.notification_id=n.id and g.reason='go_kind'))
  from f join notifications n on n.id=f.notification_id
  where f.at >= p_from and f.at < p_to group by 1, 2, 3
$$;

-- =====================================================================
-- ⑧ 同时操作（第四批 4c，2026-10）：两个人 / 两个任务同时改同一局、同一条申请、同一条邀约时，数据库自己保证不超员、状态不矛盾
--   · 同一局的「占位」写操作（通过、直接加入、邀约成局、线下补位）都先锁球局行，在锁里数名额 → 排队，不会超员
--   · 状态只能按规定路线变；拿着旧状态的操作（已撤回 / 已失效 / 已取消后再点通过）会被拒绝或按规则落到正确的结果
--   · API 约定：改申请 / 邀约一律带上「当前状态」条件（where status = 'pending' …），影响 0 行 = 状态已变，重新读取后告诉用户；
--     收到 40P01（死锁）/ 40001 时整笔事务重试一次。错误信息（message）：
--       game_full 已满 · game_closed 球局已取消 · application_expired 申请已失效 · bad_transition 状态已变 · counter_once 只能换一次时间 · invite_game_fixed 邀约已成局
-- =====================================================================
create or replace function gp_guard() returns trigger language plpgsql as $$
declare g record; n int;
begin
  if tg_op = 'UPDATE' and new.status = old.status then return new; end if;
  -- ① 状态路线：pending → approved / rejected / expired / withdrawn；approved → left；结束的申请可以重新申请（→ pending），
  --    直接加入 / 邀约成局可以从结束状态直接 → approved；其他一律拒绝（例如已撤回、已失效后发起人才点「通过」）
  if tg_op = 'UPDATE' and not (
       (old.status = 'pending'  and new.status in ('approved','rejected','expired','withdrawn'))
    or (old.status = 'approved' and new.status = 'left')
    or (old.status in ('withdrawn','left','rejected','expired') and new.status = 'pending')
    or (old.status in ('withdrawn','left','rejected','expired') and new.status = 'approved' and new.via in ('instant','invite'))) then
    raise exception 'bad_transition' using errcode = 'P0001', detail = old.status || ' → ' || new.status, hint = '状态已变，重新读取后再操作';
  end if;
  if new.status <> 'approved' then return new; end if;
  -- ② 变成 approved：先锁球局行，再在锁里数名额
  select id, capacity, coalesce(filled,0) as filled, status, starts_at into g from games where id = new.game_id for update;
  if g.status = 'cancelled' then
    if tg_op = 'UPDATE' and old.status = 'pending' then          -- 球局刚被取消：这条申请随球局结束（和取消时的处理一样）
      new.status := 'rejected'; new.decline_reason := 'pass'; new.decided_at := now(); return new;
    end if;
    raise exception 'game_closed' using errcode = 'P0001';
  end if;
  if tg_op = 'UPDATE' and old.status = 'pending' and new.role = 'player' and now() >= application_deadline(old.created_at, g.starts_at) then
    raise exception 'application_expired' using errcode = 'P0001';
  end if;
  select count(*) into n from game_participants where game_id = new.game_id and status = 'approved' and user_id <> new.user_id;
  if n + g.filled + 1 > g.capacity then
    if tg_op = 'UPDATE' and old.status = 'pending' then          -- 发起人点通过时已经被别人占满：按「满员自动结束」处理
      new.status := 'rejected'; new.decline_reason := 'full_auto'; new.decided_at := now();
      insert into notifications(user_id, kind, game_id) values (new.user_id, 'full', new.game_id);
      return new;
    end if;
    raise exception 'game_full' using errcode = 'P0001';        -- 直接加入 / 邀约成局：整笔失败，前台提示「刚刚满了」
  end if;
  return new;
end $$;
drop trigger if exists trg_gp_guard on game_participants;
create trigger trg_gp_guard before insert or update of status on game_participants
for each row execute function gp_guard();

-- 满员时自动结束其他待确认申请：跳过正被别的事务改动的行（它们会在自己的事务里经过 gp_guard，落到正确结果），避免互相等待成死锁
create or replace function sync_game() returns trigger language plpgsql as $$
declare gid uuid; cap int; off int; st game_status; n int;
begin
  if tg_table_name = 'games' then gid := new.id; else gid := coalesce(new.game_id, old.game_id); end if;
  select capacity, coalesce(filled,0), status into cap, off, st from games where id=gid for update;
  if st is null or st not in ('open','full') then return null; end if;     -- 已取消 / 已结束的不动
  select count(*) into n from game_participants where game_id=gid and status='approved';
  if n + off >= cap then
    update games set status='full' where id=gid and status='open';
    with c as (select user_id from game_participants where game_id=gid and status='pending' for update skip locked),
         r as (update game_participants p set status='rejected', decline_reason='full_auto', decided_at=now()
                 from c where p.game_id=gid and p.user_id=c.user_id and p.status='pending' returning p.user_id)
    insert into notifications(user_id,kind,game_id) select user_id,'full',gid from r;
  else
    update games set status='open' where id=gid and status='full';
  end if;
  return null;
end $$;

-- 球局取消：还在等确认的申请随球局结束（rejected / pass）。由数据库在同一事务里做，跳过正被别的事务改动的行
--   （那个事务稍后经过 gp_guard 会看到球局已取消，同样落到 rejected / pass），取消和「通过」同时发生也不会互相等待
create or replace function games_cancel_cleanup() returns trigger language plpgsql as $$
begin
  if new.status = 'cancelled' and old.status is distinct from 'cancelled' then
    update game_participants p set status = 'rejected', decline_reason = 'pass', decided_at = now()
      from (select user_id from game_participants where game_id = new.id and status = 'pending' for update skip locked) c
     where p.game_id = new.id and p.user_id = c.user_id and p.status = 'pending';
  end if;
  return null;
end $$;
drop trigger if exists trg_games_cancel_cleanup on games;
create trigger trg_games_cancel_cleanup after update of status on games
for each row execute function games_cancel_cleanup();

-- 线下补位 / 改人数：不能少于已经加入的人
create or replace function games_capacity_guard() returns trigger language plpgsql as $$
declare n int;
begin
  if new.filled is distinct from old.filled or new.capacity is distinct from old.capacity then
    select count(*) into n from game_participants where game_id = new.id and status = 'approved';
    if n + coalesce(new.filled,0) > new.capacity then raise exception 'game_full' using errcode = 'P0001', detail = '已加入 ' || n || ' 人'; end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_games_capacity_guard on games;
create trigger trg_games_capacity_guard before update of filled, capacity on games
for each row execute function games_capacity_guard();

-- 邀约：状态路线 pending → counter / accepted / declined / expired / withdrawn，counter → accepted / declined / expired / withdrawn；
--   结束后不能再变；只能换一次时间；成局后 game_id 不能再改（双击「接受」时第二次整笔失败，不会多建一局）
create or replace function invites_guard() returns trigger language plpgsql as $$
begin
  if new.status is distinct from old.status and not (
       (old.status = 'pending' and new.status in ('counter','accepted','declined','expired','withdrawn'))
    or (old.status = 'counter' and new.status in ('accepted','declined','expired','withdrawn'))) then
    raise exception 'bad_transition' using errcode = 'P0001', detail = old.status || ' → ' || new.status, hint = '邀约状态已变，重新读取';
  end if;
  if old.countered_at is not null and new.countered_at is distinct from old.countered_at then raise exception 'counter_once' using errcode = 'P0001'; end if;
  if old.game_id is not null and new.game_id is distinct from old.game_id then raise exception 'invite_game_fixed' using errcode = 'P0001'; end if;
  return new;
end $$;
drop trigger if exists trg_invites_guard on invites;
create trigger trg_invites_guard before update on invites
for each row execute function invites_guard();

-- =====================================================================
-- ⑨ 一年数据量下的速度（第四批 4d，2026-10）：在「上线一年」的数据量上测过（tests/pg/perf.mjs），下面是改写后的版本，
--    返回的列与口径不变。三类改法：
--    · 「每天来过的人」先汇总到 daily_people（每晚的任务写昨天，见 rollup_people），任意区间的去重人数 = 整天读汇总 + 首尾不满一天的读原始事件
--    · 去重计数先按「人」分组再数（两层聚合），比 count(distinct …) 快 2–3 倍
--    · 「每个人一行」的视图改成对每个人单独查（lateral），只看一个人时只算这一个人；名单类改成先分组再合并
--    · 关掉 JIT：后台这些查询每次都要先编译 1 秒多，关掉后快一倍以上（只影响本库）
-- =====================================================================
do $$ begin execute format('alter database %I set jit = off', current_database()); exception when others then null; end $$;
create index if not exists events_occurred_brin on events using brin (occurred_at);
create index if not exists sessions_user_time on sessions (user_id, started_at);
create index if not exists sessions_time on sessions (started_at);
create index if not exists impressions_to on impressions (to_id);
create index if not exists games_host_created on games (host_id, created_at);
create index if not exists games_starts on games (starts_at);
create index if not exists invites_from_to on invites (from_user, to_user);
create index if not exists notification_deliveries_at on notification_deliveries (at);
create index if not exists gp_created on game_participants (created_at) where role = 'player';

-- 每天来过的人：一人一设备一行，记当天做过哪些事件（墨尔本日）。who = 登录用户的 user_id，未登录 = 'anon:' || anon_id
create table if not exists daily_people (
  day     date not null,
  who     text not null,
  user_id uuid,
  device  text not null default 'unknown',
  events  text[] not null,
  primary key (day, who, device)
);
create index if not exists daily_people_user on daily_people (user_id, day) where user_id is not null;
-- 进入方式 / 点进球局的来源 / 页面：每天每人每设备每个取值一行（session_start.entry · game_view.via · page_view / page_time.screen）
create table if not exists daily_event_dims (
  day date not null, event text not null, device text not null, dim text not null, who text not null,
  n int not null, ms numeric,
  primary key (day, event, device, dim, who)
);
-- 球员卡被查看：每天每张卡每位看的人一行（不含看自己）
create table if not exists daily_card_views (
  day date not null, target_id uuid not null, who text not null,
  views int not null, outside int not null, landings int not null,
  primary key (day, target_id, who)
);
create table if not exists rollup_days (day date primary key, rolled_at timestamptz not null default now());
-- 每晚 03:10（墨尔本）跑：select rollup_people(d)（同时写 daily_people、daily_event_dims 和 daily_card_views） for d in [今天 - 3, 今天 - 1]（重跑最近 3 天，兜住离线补传的事件）；可重复执行
create or replace function rollup_people(p_day date) returns int language plpgsql as $$
declare n int;
begin
  delete from daily_people where day = p_day;
  insert into daily_people(day, who, user_id, device, events)
  select p_day, coalesce(user_id::text, 'anon:' || anon_id), user_id, coalesce(device, 'unknown'), array_agg(distinct event)
  from events where occurred_at >= mel_day_start(p_day) and occurred_at < mel_day_start(p_day + 1)
  group by 2, 3, 4;
  get diagnostics n = row_count;
  delete from daily_event_dims where day = p_day;
  insert into daily_event_dims(day, event, device, dim, who, n, ms)
  select p_day, e.event, coalesce(e.device, 'unknown'),
         case e.event when 'session_start' then coalesce(e.props->>'entry', 'direct') when 'game_view' then coalesce(e.props->>'via', 'other') else coalesce(e.props->>'screen', '') end,
         coalesce(e.user_id::text, 'anon:' || e.anon_id), count(*), sum((e.props->>'ms')::numeric) filter (where e.event = 'page_time')
  from events e
  where e.event in ('session_start','game_view','page_view','page_time') and e.occurred_at >= mel_day_start(p_day) and e.occurred_at < mel_day_start(p_day + 1)
  group by 2, 3, 4, 5;
  delete from daily_card_views where day = p_day;
  insert into daily_card_views(day, target_id, who, views, outside, landings)
  select p_day, (e.props->>'target_uid')::uuid, coalesce(e.user_id::text, 'anon:' || e.anon_id), count(*),
         count(*) filter (where e.props->>'via' in ('link','share_link','external')), count(*) filter (where e.props->>'via' in ('link','external'))
  from events e
  where e.event = 'card_view' and coalesce((e.props->>'own')::boolean, false) = false and e.props->>'target_uid' ~ '^[0-9a-f-]{36}$'
    and e.occurred_at >= mel_day_start(p_day) and e.occurred_at < mel_day_start(p_day + 1)
  group by 2, 3;
  insert into rollup_days(day) values (p_day) on conflict (day) do update set rolled_at = now();
  return n;
end $$;
-- 任意区间里来过的人（每人每天每设备一行）：整天且已汇总的读 daily_people，其余读原始事件
create or replace function people_between(p_from timestamptz, p_to timestamptz)
returns table(day date, who text, user_id uuid, device text, events text[]) language plpgsql stable as $$
#variable_conflict use_column
declare d date := (p_from at time zone 'Australia/Melbourne')::date; d_end date := (p_to at time zone 'Australia/Melbourne')::date; lo timestamptz := p_from; s timestamptz;
begin
  while d <= d_end loop
    s := mel_day_start(d);
    if s >= p_from and mel_day_start(d + 1) <= p_to and exists (select 1 from rollup_days r where r.day = d) then
      if lo < s then
        return query select (e.occurred_at at time zone 'Australia/Melbourne')::date, coalesce(e.user_id::text, 'anon:' || e.anon_id), e.user_id, coalesce(e.device, 'unknown'), array_agg(distinct e.event)
          from events e where e.occurred_at >= lo and e.occurred_at < s group by 1, 2, 3, 4;
      end if;
      return query select p.day, p.who, p.user_id, p.device, p.events from daily_people p where p.day = d;
      lo := mel_day_start(d + 1);
    end if;
    d := d + 1;
  end loop;
  if lo < p_to then
    return query select (e.occurred_at at time zone 'Australia/Melbourne')::date, coalesce(e.user_id::text, 'anon:' || e.anon_id), e.user_id, coalesce(e.device, 'unknown'), array_agg(distinct e.event)
      from events e where e.occurred_at >= lo and e.occurred_at < p_to group by 1, 2, 3, 4;
  end if;
end $$;

create or replace function active_users(p_from timestamptz, p_to timestamptz)
returns table(users bigint, anon_visitors bigint) language sql stable as $$
  select count(*) filter (where u is not null), count(*) filter (where u is null)
  from (select p.who, max(p.user_id::text) as u from people_between(p_from, p_to) p group by p.who) x
$$;

create or replace function distinct_people(p_event text, p_from timestamptz, p_to timestamptz,
                                           p_device text default null, p_build text default null)
returns bigint language sql stable as $$
  select case when p_build is null then
    (select count(distinct p.who) from people_between(p_from, p_to) p where p.events @> array[p_event] and (p_device is null or p.device = p_device))
  else
    (select count(*) from (select 1 from events e where e.event = p_event and e.occurred_at >= p_from and e.occurred_at < p_to
       and (p_device is null or e.device = p_device) and e.build = p_build group by coalesce(e.user_id::text, 'anon:' || e.anon_id)) x)
  end
$$;

-- 算数的球局：确认爽约直接按这一人这一局判断（与 v_confirmed_noshow 同一口径），不再每行重算整个爽约视图
create or replace view v_counted_games as
select p.user_id, p.game_id, p.role, g.starts_at, g.venue_id, g.host_id
from game_participants p join games g on g.id=p.game_id
where p.status = 'approved' and g.status <> 'cancelled'
  and g.starts_at + make_interval(mins => g.duration_min) <= now()
  and (g.filled > 0 or exists (select 1 from game_participants o where o.game_id=p.game_id and o.user_id<>p.user_id and o.status='approved'))
  and not ((p.attendance is not distinct from 'no_show'
            or exists (select 1 from noshow_reports n where n.game_id = p.game_id and n.target_id = p.user_id and (n.reporter_id = g.host_id or g.capacity = 2))
            or (select count(*) from noshow_reports n where n.game_id = p.game_id and n.target_id = p.user_id) >= 2)
           and not exists (select 1 from noshow_appeals a where a.game_id = p.game_id and a.user_id = p.user_id and a.status in ('pending','upheld')));

-- 好评人数 / 一起打过的球友：每人单独查（只看一个人时只算一个人）
create or replace view user_kudos_v2 as
select u.id as user_id, k.kudos, pt.partners,
       round(k.kudos::numeric / nullif(greatest(pt.partners, k.kudos), 0), 3) as kudos_rate,
       round((k.kudos + 1)::numeric / (greatest(pt.partners, k.kudos) + 4), 3) as level_rate
from users u
cross join lateral (select count(distinct m.from_id) as kudos from impressions m where m.to_id = u.id) k
cross join lateral (select count(distinct b.user_id) as partners from v_counted_games a
                    join game_participants b on b.game_id = a.game_id and b.user_id <> a.user_id and b.status = 'approved'
                    where a.user_id = u.id) pt
where k.kudos > 0 or pt.partners > 0;

-- 球员卡：场次 / 发起 / 好评人数先按人分组再连（只看一个人时数据库会把条件推进分组里，只算这一个人）
create or replace view player_cards as
select u.id as user_id, u.member_no, u.nickname, u.last_initial, u.utr, u.avatar_kind, u.avatar_animal, u.avatar_color, u.seal_roll, u.card_theme,
       coalesce(u.main_club_id,
         (select uc.venue_id from user_clubs uc where uc.user_id=u.id order by uc.created_at limit 1),
         (select c.venue_id from v_counted_games c where c.user_id=u.id and c.venue_id is not null
           group by c.venue_id order by count(*) desc limit 1))                       as card_venue_id,
       coalesce(c.played, 0)                                                            as played,
       coalesce(c.hosted, 0)                                                            as hosted,
       coalesce(k.kudos, 0)                                                             as kudos,
       u.level                                                                          as level
from users u
left join (select user_id, count(*) as played, count(*) filter (where role = 'host') as hosted from v_counted_games group by 1) c on c.user_id = u.id
left join (select to_id, count(distinct from_id) as kudos from impressions group by 1) k on k.to_id = u.id;

create or replace function user_activity(p_from timestamptz, p_to timestamptz)
returns table(user_id uuid, member_no bigint, nickname text, host_ok bigint, played bigint, apply bigint,
              invite bigint, impression bigint, active_day bigint, no_show bigint, score numeric)
language sql stable as $$
  with h as (select f.host_id as u, count(*) as n from v_game_fill f where f.full_at_start and f.starts_at >= p_from and f.starts_at < p_to group by 1),
  pl as (select c.user_id as u, count(*) as n from v_counted_games c where c.starts_at >= p_from and c.starts_at < p_to group by 1),
  ap as (select p.user_id as u, count(*) as n from game_participants p where p.role = 'player' and p.created_at >= p_from and p.created_at < p_to group by 1),
  iv as (select i.from_user as u, count(*) as n from invites i where i.created_at >= p_from and i.created_at < p_to group by 1),
  im as (select m.from_id as u, count(*) as n from impressions m where m.created_at >= p_from and m.created_at < p_to group by 1),
  ad as (select x.user_id as u, count(distinct x.day) as n from people_between(p_from, p_to) x where x.user_id is not null group by 1),
  ns as (select n.user_id as u, count(*) as n from v_confirmed_noshow n where n.starts_at >= p_from and n.starts_at < p_to group by 1),
  w as (select coalesce(sum(weight) filter (where k = 'host_ok'), 0) as wh, coalesce(sum(weight) filter (where k = 'played'), 0) as wp,
               coalesce(sum(weight) filter (where k = 'apply'), 0) as wa, coalesce(sum(weight) filter (where k = 'invite'), 0) as wi,
               coalesce(sum(weight) filter (where k = 'impression'), 0) as wm, coalesce(sum(weight) filter (where k = 'active_day'), 0) as wd,
               coalesce(sum(weight) filter (where k = 'no_show'), 0) as wn from activity_weights),
  x as (select u.id, u.member_no, u.nickname, coalesce(h.n, 0) as host_ok, coalesce(pl.n, 0) as played, coalesce(ap.n, 0) as apply, coalesce(iv.n, 0) as invite,
               coalesce(im.n, 0) as impression, coalesce(ad.n, 0) as active_day, coalesce(ns.n, 0) as no_show
        from users u left join h on h.u = u.id left join pl on pl.u = u.id left join ap on ap.u = u.id left join iv on iv.u = u.id
        left join im on im.u = u.id left join ad on ad.u = u.id left join ns on ns.u = u.id)
  select x.id, x.member_no, x.nickname, x.host_ok, x.played, x.apply, x.invite, x.impression, x.active_day, x.no_show,
         (w.wh * x.host_ok + w.wp * x.played + w.wa * x.apply + w.wi * x.invite + w.wm * x.impression + w.wd * x.active_day + w.wn * x.no_show)::numeric
  from x cross join w
$$;

create or replace function visit_funnel(p_from timestamptz, p_to timestamptz)
returns table(step int, name text, people bigint) language sql stable as $$
  with v as (select p.who, max(p.user_id::text)::uuid as user_id, bool_or(p.events @> array['game_view']) as gv from people_between(p_from, p_to) p group by p.who),
  ap as (select distinct user_id from game_participants where role='player' and created_at >= p_from and created_at < p_to),
  ok as (select distinct user_id from game_participants where role='player' and status in ('approved','left') and created_at >= p_from and created_at < p_to),
  pl as (select distinct c.user_id from v_counted_games c join game_participants p on p.game_id=c.game_id and p.user_id=c.user_id
          where p.role='player' and p.created_at >= p_from and p.created_at < p_to),
  s as (select v.*, v.user_id in (select user_id from ap) as a, v.user_id in (select user_id from ok) as o, v.user_id in (select user_id from pl) as l from v)
  select 1, '来访', (select count(*) from s) union all select 2, '看过球局', (select count(*) from s where gv)
  union all select 3, '申请 / 加入', (select count(*) from s where gv and a) union all select 4, '被通过', (select count(*) from s where gv and a and o)
  union all select 5, '打完', (select count(*) from s where gv and a and o and l)
$$;

create or replace view v_user_retention as
with u as (select id, (created_at at time zone 'Australia/Melbourne')::date as d0 from users where created_at > now() - interval '90 days'),
     a as (select distinct p.user_id, p.day from people_between(now() - interval '121 days', now()) p where p.user_id is not null),
     today as (select (now() at time zone 'Australia/Melbourne')::date as t)
select u.id as user_id, u.d0 as signup_day, date_trunc('week', u.d0)::date as signup_week,
       case when u.d0 + 1  <= today.t then coalesce(bool_or(a.day = u.d0 + 1), false)  end as d1,
       case when u.d0 + 7  <= today.t then coalesce(bool_or(a.day = u.d0 + 7), false)  end as d7,
       case when u.d0 + 30 <= today.t then coalesce(bool_or(a.day = u.d0 + 30), false) end as d30
from u cross join today left join a on a.user_id = u.id and a.day in (u.d0 + 1, u.d0 + 7, u.d0 + 30)
group by u.id, u.d0, today.t;

create or replace view v_invite_outcomes as
select i.id as invite_id, i.from_user, i.to_user, i.created_at, i.status, i.game_id,
       i.status in ('accepted','declined','expired') as decided,
       case when i.status in ('accepted','declined') then extract(epoch from (i.responded_at - i.created_at))/60 end as reply_minutes,
       exists (select 1 from game_participants a join game_participants b on b.game_id = a.game_id and b.user_id = i.to_user and b.status = 'approved'
                join games g on g.id = a.game_id
                where a.user_id = i.from_user and a.status = 'approved' and g.status <> 'cancelled' and g.starts_at < i.created_at
                  and g.starts_at + make_interval(mins => g.duration_min) <= now()
                  and not exists (select 1 from v_confirmed_noshow n where n.game_id = a.game_id and n.user_id in (a.user_id, b.user_id))) as played_before
from invites i;

create or replace view v_level_stuck as
with lv(level, games, attend, rate, givers) as (values (3, 50, 0.90, 0.5, 10), (4, 100, 0.95, 0.667, 25), (5, 200, 0.98, 0.667, 50)),
pl as (select c.user_id, count(*) as played from v_counted_games c group by 1 having count(*) >= 50),
ns as (select n.user_id, count(*) as noshow_all, count(*) filter (where n.starts_at > now() - interval '90 days') as noshow_90 from v_confirmed_noshow n group by 1),
st as (select u.id as user_id, u.level, pl.played, coalesce(ns.noshow_all, 0) as noshow_all, coalesce(ns.noshow_90, 0) as noshow_90,
         exists (select 1 from reports r where r.target_type='user' and r.target_id=u.id::text and r.status='actioned' and r.created_at > now() - interval '180 days') as report_6m,
         coalesce(k.level_rate, 0.25) as rate, coalesce(k.kudos, 0) as givers
       from pl join users u on u.id = pl.user_id left join ns on ns.user_id = u.id
       left join lateral (select kk.kudos, kk.level_rate from user_kudos_v2 kk where kk.user_id = u.id) k on true)
select st.user_id, lv.level as target_level, st.played,
       st.rate < lv.rate as low_rate, st.givers < lv.givers as low_givers,
       st.played::numeric / nullif(st.played + st.noshow_all, 0) < lv.attend as low_attend,
       case when lv.level = 3 then st.noshow_90 >= 4 else st.noshow_90 >= 2 end as noshow_cap,   -- 近 90 天爽约 ≥2 最高 Lv3，≥4 最高 Lv2
       lv.level = 5 and st.report_6m as recent_report
from st join lv on st.played >= lv.games and st.level < lv.level;

-- 事件计数类：先按「人」分组再数
-- 任意区间的「事件 × 设备 × 取值 × 人」：整天且已汇总的读 daily_event_dims，其余读原始事件（时间写成常量，只扫对应的月分区）
create or replace function event_dims_between(p_from timestamptz, p_to timestamptz, p_events text[])
returns table(event text, device text, dim text, who text, n bigint, ms numeric) language plpgsql stable as $$
declare d date := (p_from at time zone 'Australia/Melbourne')::date; d_end date := (p_to at time zone 'Australia/Melbourne')::date;
        lo timestamptz := p_from; s timestamptz; raw text := ''; days date[] := '{}';
begin
  while d <= d_end loop
    s := mel_day_start(d);
    if s >= p_from and mel_day_start(d + 1) <= p_to and exists (select 1 from rollup_days r where r.day = d) then
      if lo < s then raw := raw || format(' or (e.occurred_at >= %L and e.occurred_at < %L)', lo, s); end if;
      days := days || d; lo := mel_day_start(d + 1);
    end if;
    d := d + 1;
  end loop;
  if lo < p_to then raw := raw || format(' or (e.occurred_at >= %L and e.occurred_at < %L)', lo, p_to); end if;
  return query execute format($q$
    select e.event, coalesce(e.device, 'unknown'),
           case e.event when 'session_start' then coalesce(e.props->>'entry', 'direct') when 'game_view' then coalesce(e.props->>'via', 'other') else coalesce(e.props->>'screen', '') end,
           coalesce(e.user_id::text, 'anon:' || e.anon_id), count(*), sum((e.props->>'ms')::numeric) filter (where e.event = 'page_time')
    from events e where e.event = any($1) and (false %s) group by 1, 2, 3, 4
    union all
    select x.event, x.device, x.dim, x.who, x.n::bigint, x.ms from daily_event_dims x where x.day = any($2) and x.event = any($1)$q$, raw) using p_events, days;
end $$;
create or replace function entry_sources(p_from timestamptz, p_to timestamptz)
returns table(device text, entry text, sessions bigint, people bigint) language sql stable as $$
  select d, e, sum(n)::bigint, count(*) from (
    select x.device as d, x.dim as e, x.who, sum(x.n) as n from event_dims_between(p_from, p_to, array['session_start']) x group by 1, 2, 3) y group by 1, 2
$$;
create or replace function game_view_via(p_from timestamptz, p_to timestamptz)
returns table(device text, via text, views bigint, people bigint) language sql stable as $$
  select d, v, sum(n)::bigint, count(*) from (
    select x.device as d, x.dim as v, x.who, sum(x.n) as n from event_dims_between(p_from, p_to, array['game_view']) x group by 1, 2, 3) y group by 1, 2
$$;
create or replace function page_traffic(p_from timestamptz, p_to timestamptz)
returns table(device text, screen text, views bigint, visitors bigint, avg_seconds numeric) language sql stable as $$
  select d, nullif(s, ''), sum(v)::bigint, count(*) filter (where v > 0), round(sum(ms) / nullif(sum(t), 0) / 1000, 1) from (
    select x.device as d, x.dim as s, x.who,
           coalesce(sum(x.n) filter (where x.event = 'page_view'), 0) as v, sum(x.ms) filter (where x.event = 'page_time') as ms, coalesce(sum(x.n) filter (where x.event = 'page_time'), 0) as t
    from event_dims_between(p_from, p_to, array['page_view','page_time']) x group by 1, 2, 3) y group by 1, 2
$$;
create or replace function card_views(p_from timestamptz, p_to timestamptz)
returns table(user_id uuid, views bigint, from_outside bigint, external_landings bigint, viewers bigint) language plpgsql stable as $$
declare d date := (p_from at time zone 'Australia/Melbourne')::date; d_end date := (p_to at time zone 'Australia/Melbourne')::date;
        lo timestamptz := p_from; s timestamptz; raw text := ''; days date[] := '{}';
begin
  -- 整天且已汇总的读 daily_card_views，其余（首尾不满一天、还没汇总的今天）读原始事件；原始事件的时间写成常量，只扫对应的月分区
  while d <= d_end loop
    s := mel_day_start(d);
    if s >= p_from and mel_day_start(d + 1) <= p_to and exists (select 1 from rollup_days r where r.day = d) then
      if lo < s then raw := raw || format(' or (e.occurred_at >= %L and e.occurred_at < %L)', lo, s); end if;
      days := days || d; lo := mel_day_start(d + 1);
    end if;
    d := d + 1;
  end loop;
  if lo < p_to then raw := raw || format(' or (e.occurred_at >= %L and e.occurred_at < %L)', lo, p_to); end if;
  return query execute format($q$
    with raw as (
      select (e.props->>'target_uid')::uuid as t, coalesce(e.user_id::text, 'anon:' || e.anon_id) as w, count(*) as n,
             count(*) filter (where e.props->>'via' in ('link','share_link','external')) as o, count(*) filter (where e.props->>'via' in ('link','external')) as x
      from events e
      where e.event = 'card_view' and (false %s) and coalesce((e.props->>'own')::boolean, false) = false and e.props->>'target_uid' ~ '^[0-9a-f-]{36}$'
      group by 1, 2),
    allr as (select t, w, n, o, x from raw
             union all select c.target_id, c.who, c.views::bigint, c.outside::bigint, c.landings::bigint from daily_card_views c where c.day = any($1)),
    per as (select t, w, sum(n) n, sum(o) o, sum(x) x from allr group by 1, 2)
    select t, sum(n)::bigint, sum(o)::bigint, sum(x)::bigint, count(*) from per group by 1$q$, raw) using days;
end $$;
create or replace function env_usage(p_from timestamptz, p_to timestamptz)
returns table(env text, device text, sessions bigint, people bigint, avg_seconds numeric) language sql stable as $$
  select e, d, sum(n)::bigint, count(*), round(sum(sec) / nullif(sum(n_end), 0)) from (
    select s.env as e, s.device as d, coalesce(s.user_id::text, s.anon_id) as w, count(*) as n,
           sum(extract(epoch from (s.ended_at - s.started_at))) as sec, count(s.ended_at) as n_end
    from sessions s where s.started_at >= p_from and s.started_at < p_to group by 1, 2, 3) x group by 1, 2
$$;

create or replace function device_compare(p_from timestamptz, p_to timestamptz)
returns table(device text, active_people bigint, signups bigint, games bigint, applications bigint, fill_rate numeric) language sql stable as $$
  with d(device) as (values ('mobile'), ('desktop')),
  ppl as (select p.device, count(distinct p.who) as n from people_between(p_from, p_to) p group by 1),
  su as (select e.device, count(*) as n from events e where e.event='signup_complete' and e.occurred_at >= p_from and e.occurred_at < p_to group by 1),
  gm as (select g.created_device as device, count(*) as n from games g where g.visibility='public' and g.created_at >= p_from and g.created_at < p_to group by 1),
  ap as (select p.device, count(*) as n from game_participants p where p.role='player' and p.created_at >= p_from and p.created_at < p_to group by 1),
  fr as (select g.created_device as device, round(count(*) filter (where f.full_at_start)::numeric / nullif(count(*),0), 3) as r
           from v_game_fill f join games g on g.id=f.game_id where f.starts_at >= p_from and f.starts_at < p_to group by 1)
  select d.device, coalesce(ppl.n,0), coalesce(su.n,0), coalesce(gm.n,0), coalesce(ap.n,0), fr.r
  from d left join ppl on ppl.device=d.device left join su on su.device=d.device left join gm on gm.device=d.device left join ap on ap.device=d.device left join fr on fr.device=d.device
$$;

create or replace function inapp_handoff_funnel(p_from timestamptz, p_to timestamptz)
returns table(env text, inapp_users bigint, moved bigint, acted bigint) language sql stable as $$
  with a as (select s.env, s.user_id, min(s.started_at) as t0 from sessions s
              where s.env in ('wechat','xhs') and s.user_id is not null and s.started_at >= p_from and s.started_at < p_to group by 1, 2),
  m as (select a.*, (select min(s.started_at) from sessions s where s.user_id=a.user_id and s.started_at > a.t0
                      and coalesce(s.env,'') not in ('wechat','xhs','ig_fb')) as t1 from a)
  select m.env, count(*), count(*) filter (where m.t1 is not null),
         count(*) filter (where m.t1 is not null and (
            exists (select 1 from game_participants p where p.user_id=m.user_id and p.role='player' and p.created_at > m.t1)
            or exists (select 1 from games g where g.host_id=m.user_id and g.created_at > m.t1)))
  from m group by m.env
$$;

-- 提醒的第一去向记在通知本身上（写送达记录时由触发器补），统计时只读 notifications，不用每条再去找最早的送达记录
alter table notifications add column if not exists first_at timestamptz;
alter table notifications add column if not exists first_channel text;
alter table notifications add column if not exists first_reason text;
alter table notifications add column if not exists first_device uuid;
alter table notifications add column if not exists go_extra boolean not null default false;
create index if not exists notifications_first_at on notifications (first_at) where first_at is not null;
create or replace function notification_first() returns trigger language plpgsql as $$
begin
  if new.reason = 'go_kind' then
    update notifications set go_extra = true where id = new.notification_id and not go_extra;
  else
    update notifications set first_at = new.at, first_channel = new.channel, first_reason = new.reason, first_device = new.device_id
     where id = new.notification_id and (first_at is null or new.at < first_at);
  end if;
  return null;
end $$;
drop trigger if exists trg_notification_first on notification_deliveries;
create trigger trg_notification_first after insert on notification_deliveries for each row execute function notification_first();
-- 已有的送达记录补一次（新库为空，什么都不做）
update notifications n set first_at = f.at, first_channel = f.channel, first_reason = f.reason, first_device = f.device_id
  from (select distinct on (notification_id) notification_id, at, channel, reason, device_id from notification_deliveries
         where reason is distinct from 'go_kind' order by notification_id, at, id) f
 where f.notification_id = n.id and n.first_at is null;
update notifications n set go_extra = true where not go_extra and exists (select 1 from notification_deliveries g where g.notification_id = n.id and g.reason = 'go_kind');
create or replace function notification_route(p_from timestamptz, p_to timestamptz)
returns table(channel text, reason text, device text, notifications bigint, opened bigint, go_extra bigint) language sql stable as $$
  select n.first_channel, n.first_reason, ud.platform, count(*), count(*) filter (where n.read_at is not null), count(*) filter (where n.go_extra)
  from notifications n left join user_devices ud on ud.id = n.first_device
  where n.first_at >= p_from and n.first_at < p_to group by 1, 2, 3
$$;

-- =====================================================================
-- ⑩ 谁能读、谁能写（第四批 4e，2026-10）
--   数据库自己把关，不只靠 API：即使 API 某处漏了检查，或有人拿到了 Supabase 的公开 key，也读不到别人的私密数据。
--   角色：
--     nbq_user      前台用户的请求。API 每个请求：begin; set local role nbq_user; select set_config('nbq.uid', <登录用户 id>, true); …
--                   只能看到 / 改到下面每张表的策略允许的行和列
--     nbq_service   API 内部和定时任务（发通知、失效、汇总、写事件）：全部表可读写
--     nbq_admin     后台运营（admin_users.role = owner / operator）：能看全部业务数据（手机号只看后 4 位），只能改审核和处理相关的列；操作日志只能追加
--     nbq_viewer    后台只读（role = viewer）：只能看统计（视图 / 函数 / 汇总表），看不到聊天、举报内容、手机号、微信号、邮箱
--     anon / authenticated（Supabase 自带）、PUBLIC：什么都不能做
--   API 登录用的账号（例如 nbq_api）加入 nbq_user 和 nbq_service；后台登录账号加入 nbq_admin 或 nbq_viewer。
--   新建的表默认开启 RLS、没有策略 = 谁都看不到（tests/pg/rls.mjs 会查出没登记的表）。
-- =====================================================================
do $$ declare r text; begin
  foreach r in array array['nbq_user','nbq_service','nbq_admin','nbq_viewer','anon','authenticated'] loop
    if not exists (select 1 from pg_roles where rolname = r) then execute format('create role %I nologin', r); end if;
  end loop; end $$;

-- 判断规则的函数要看到双方的数据（例如对方是否屏蔽了我），以定义者身份运行
alter function can_act(uuid, text, uuid, boolean) security definer set search_path = public;
alter function is_blocked(uuid, uuid) security definer set search_path = public;
create or replace function nbq_uid() returns uuid language sql stable as $$ select nullif(current_setting('nbq.uid', true), '')::uuid $$;

-- ① 先全部收回，再按需给
revoke all on all tables in schema public from public, anon, authenticated, nbq_user, nbq_viewer;
revoke all on all sequences in schema public from public, anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;
alter default privileges in schema public revoke all on tables from public, anon, authenticated;
alter default privileges revoke execute on functions from public;   -- 函数默认给 PUBLIC 的执行权限是全局默认，只能在全局收回
grant usage on schema public to nbq_user, nbq_service, nbq_admin, nbq_viewer;
grant all on all tables in schema public to nbq_service;
grant usage, select on all sequences in schema public to nbq_service, nbq_user, nbq_admin;
grant execute on all functions in schema public to nbq_service, nbq_admin, nbq_viewer;
grant execute on function nbq_uid(), can_act(uuid, text, uuid, boolean), is_blocked(uuid, uuid), application_deadline(timestamptz, timestamptz), mel_day_start(date), mel_today() to nbq_user;

-- ② 所有表开启 RLS；nbq_service 全部放行
do $$ declare t record; begin
  for t in select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'public' and c.relkind in ('r','p') and not c.relispartition loop
    begin
      execute format('alter table %I enable row level security', t.relname);
      execute format('drop policy if exists svc_all on %I', t.relname);
      execute format('create policy svc_all on %I to nbq_service using (true) with check (true)', t.relname);
    exception when insufficient_privilege then
      -- PostGIS 自带的 spatial_ref_sys 在 Supabase 上属于平台账号，改不了；里面只有坐标系参考数据，没有用户数据
      if t.relname <> 'spatial_ref_sys' then raise; end if;
    end;
  end loop; end $$;

-- ③ 前台用户（nbq_user）
-- 球友：自己那一行（含手机号、邮箱、微信号）可读；能改的只有资料类的列，状态 / 等级 / 编号 / 风控相关的列只能由服务端改
grant select on users to nbq_user;
grant update (nickname, last_initial, avatar_kind, avatar_animal, seal_roll, avatar_color, utr, utr_estimated, card_theme, wechat_id, gender,
              main_club_id, invite_from, analytics_opt_out, email, email_prefs, email_asked_at, pact_accepted_at, pact_version) on users to nbq_user;
create policy u_self on users for select to nbq_user using (id = nbq_uid());
create policy u_self_upd on users for update to nbq_user using (id = nbq_uid()) with check (id = nbq_uid());
-- 性别：男 → 女一生只能一次（前台规则 §3.8），数据库兜底；后台核实冒用时由 nbq_admin / nbq_service 改，不受限
create or replace function users_gender_guard() returns trigger language plpgsql as $$
begin
  if new.gender is distinct from old.gender and old.gender is not null then
    if current_setting('role') = 'nbq_user' and old.gender = 'm' and new.gender = 'f' and old.gender_m2f_at is not null then
      raise exception 'gender_m2f_used' using errcode = 'P0001';
    end if;
    if old.gender = 'm' and new.gender = 'f' then new.gender_m2f_at := coalesce(old.gender_m2f_at, now()); end if;
    new.gender_changes := coalesce(old.gender_changes, 0) + 1;
    insert into gender_changes(user_id, from_g, to_g) values (old.id, old.gender, new.gender);
  end if;
  return new;
end $$;
drop trigger if exists trg_users_gender_guard on users;
create trigger trg_users_gender_guard before update of gender on users for each row execute function users_gender_guard();
-- 别人的资料只能通过 public_profiles 看（球员卡上本来就公开的列；没有手机号、邮箱、微信号、性别、状态原因）
create or replace view public_profiles as
select id, member_no, nickname, last_initial, utr, utr_estimated, avatar_kind, avatar_animal, avatar_color, seal_roll, card_theme, level, main_club_id,
       status in ('banned','deleted') as gone
from users;
grant select on public_profiles, player_cards to nbq_user;

-- 球局：公开的（双方没有屏蔽）+ 自己发起 / 参加的私人局
create or replace function game_visible(p_game uuid, p_uid uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from games g where g.id = p_game and (
           g.host_id = p_uid
        or exists (select 1 from game_participants p where p.game_id = g.id and p.user_id = p_uid)
        or (g.visibility = 'public' and not is_blocked(p_uid, g.host_id))))
$$;
create or replace function game_member(p_game uuid, p_uid uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from game_participants p where p.game_id = p_game and p.user_id = p_uid and p.status = 'approved')
$$;
create or replace function game_host(p_game uuid, p_uid uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from games g where g.id = p_game and g.host_id = p_uid)
$$;
revoke execute on function game_visible(uuid, uuid), game_member(uuid, uuid), game_host(uuid, uuid) from public;
grant execute on function game_visible(uuid, uuid), game_member(uuid, uuid), game_host(uuid, uuid) to nbq_user, nbq_service, nbq_admin;
grant select, insert on games to nbq_user;
grant update (note, starts_at, duration_min, game_type, capacity, utr_min, utr_max, venue_id, venue_name, filled, tags, status, cancelled_at,
              hide_when_done, join_mode, postponed_at, original_start, time_set_at) on games to nbq_user;
create policy g_read on games for select to nbq_user using (game_visible(id, nbq_uid()));
create policy g_new on games for insert to nbq_user with check (host_id = nbq_uid() and can_act(nbq_uid(), 'create') is null);
create policy g_host on games for update to nbq_user using (host_id = nbq_uid()) with check (host_id = nbq_uid());
-- 发现页 / 详情：game_cards 只出现我能看到的局（人数统计仍按全部已加入的人算）
create or replace view api_game_cards as select * from game_cards where game_visible(id, nbq_uid());
grant select on api_game_cards to nbq_user;

-- 申请 / 参加：自己的行；我发起的局里的所有行；我已加入的局里其他已加入的人。别的申请人的待确认 / 被婉拒的行看不到
grant select, insert on game_participants to nbq_user;
grant update (status, decided_at, left_at, decline_reason, decline_note, approved_at, attendance, show_wechat, change_ack, message, expired_at) on game_participants to nbq_user;
create policy gp_read on game_participants for select to nbq_user using (
  user_id = nbq_uid() or game_host(game_id, nbq_uid()) or (status = 'approved' and game_member(game_id, nbq_uid())));
-- 申请 / 直接加入：只能为自己，按账号状态和屏蔽关系；直接加入只在 instant 局、水平合适时
create policy gp_apply on game_participants for insert to nbq_user with check (
  user_id = nbq_uid() and role = 'player' and game_visible(game_id, nbq_uid())
  and exists (select 1 from games g where g.id = game_id and g.visibility = 'public' and not is_blocked(nbq_uid(), g.host_id)
                and can_act(nbq_uid(), case when game_participants.status = 'approved' then 'join' else 'apply' end, null, 'women' = any(g.tags)) is null
                and (game_participants.status = 'pending' or (game_participants.status = 'approved' and game_participants.via = 'instant' and g.join_mode = 'instant'
                     and (select u.utr from users u where u.id = nbq_uid()) between g.utr_min and g.utr_max))));
-- 改：申请人自己只能撤回 / 退出 / 重新申请 / 改展示微信；发起人可以确认、婉拒、标记到场
create policy gp_self on game_participants for update to nbq_user using (user_id = nbq_uid()) with check (
  user_id = nbq_uid() and status in ('pending','withdrawn','left')
  and attendance is not distinct from (select o.attendance from game_participants o where o.game_id = game_participants.game_id and o.user_id = game_participants.user_id));
create policy gp_host on game_participants for update to nbq_user using (game_host(game_id, nbq_uid())) with check (game_host(game_id, nbq_uid()));

-- 邀约：只有双方
grant select, insert on invites to nbq_user;
grant update (status, counter_starts_at, counter_ends_at, counter_venue_id, counter_venue_name, countered_at, game_id, responded_at, decline_reason, decline_note, note) on invites to nbq_user;
create policy iv_read on invites for select to nbq_user using (nbq_uid() in (from_user, to_user));
create policy iv_new on invites for insert to nbq_user with check (from_user = nbq_uid() and status = 'pending' and not is_blocked(from_user, to_user)
  and can_act(nbq_uid(), 'invite', to_user) is null);
-- 接收人：接受 / 婉拒 / 换个时间；发起人：撤回、确认对方换的时间、改备注
create policy iv_upd on invites for update to nbq_user using (nbq_uid() in (from_user, to_user)) with check (
     (to_user = nbq_uid() and status in ('accepted','declined','counter'))
  or (from_user = nbq_uid() and (status in ('withdrawn','pending') or (status in ('accepted','declined') and countered_at is not null))));

-- 只属于自己的数据：通知、多遇到 / 少遇到、赛后感受、常去的场地、所在区、设备与推送、已读、屏蔽、徽章、等级记录、每周重复的局
grant select, update (read_at) on notifications to nbq_user;
create policy n_own on notifications for select to nbq_user using (user_id = nbq_uid());
create policy n_own_upd on notifications for update to nbq_user using (user_id = nbq_uid()) with check (user_id = nbq_uid());
do $$ declare t text; c text; begin
  foreach t in array array['player_prefs:user_id','player_pref_mutes:user_id','follow_notices:user_id','game_feel:user_id','user_clubs:user_id',
                           'user_suburb_picks:user_id','user_devices:user_id','push_subscriptions:user_id','thread_reads:user_id','blocks:blocker_id','game_series:host_id'] loop
    c := split_part(t, ':', 2); t := split_part(t, ':', 1);
    execute format('grant select, insert, update, delete on %I to nbq_user', t);
    execute format('drop policy if exists own_all on %I', t);
    execute format('create policy own_all on %I to nbq_user using (%I = nbq_uid()) with check (%I = nbq_uid())', t, c, c);
  end loop;
  foreach t in array array['user_badges','user_level_log'] loop
    execute format('grant select, update (seen_at) on %I to nbq_user', t);
    execute format('drop policy if exists own_read on %I', t);
    execute format('create policy own_read on %I to nbq_user using (user_id = nbq_uid()) with check (user_id = nbq_uid())', t);
  end loop; end $$;
grant update (shared_at) on user_badges to nbq_user;

-- 给别人留的印象 / 爽约反馈 / 举报：只能看到自己写的；被评价 / 被反馈 / 被举报的人看不到是谁
grant select, insert on impressions, noshow_reports to nbq_user;
create policy imp_mine on impressions for select to nbq_user using (from_id = nbq_uid());
create policy imp_new on impressions for insert to nbq_user with check (from_id = nbq_uid() and from_id <> to_id
  and game_member(game_id, from_id) and game_member(game_id, to_id));
create policy ns_mine on noshow_reports for select to nbq_user using (reporter_id = nbq_uid());
create policy ns_new on noshow_reports for insert to nbq_user with check (reporter_id = nbq_uid() and reporter_id <> target_id
  and game_member(game_id, reporter_id) and game_member(game_id, target_id));
grant select, insert on noshow_appeals to nbq_user;
create policy ap_own on noshow_appeals to nbq_user using (user_id = nbq_uid()) with check (user_id = nbq_uid());
grant select, insert (reporter_id, target_type, target_id, reason, note, source, via, context_ref) on reports to nbq_user;
create policy rp_mine on reports for select to nbq_user using (reporter_id = nbq_uid());
create policy rp_new on reports for insert to nbq_user with check (reporter_id = nbq_uid() and source = 'in_app' and status = 'open');

-- 聊天：球局群聊 = 这局已加入的人和发起人；私信 = 双方。被隐藏的消息只有发送人自己还看得到
create or replace function thread_member(p_thread uuid, p_uid uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from threads t where t.id = p_thread and (
    (t.kind = 'dm' and p_uid in (t.user_a, t.user_b)) or (t.kind = 'game' and (game_member(t.game_id, p_uid) or game_host(t.game_id, p_uid)))))
$$;
revoke execute on function thread_member(uuid, uuid) from public;
grant execute on function thread_member(uuid, uuid) to nbq_user, nbq_service, nbq_admin;
grant select, insert on threads, messages to nbq_user;
create policy th_read on threads for select to nbq_user using (thread_member(id, nbq_uid()));
create policy th_new on threads for insert to nbq_user with check ((kind = 'dm' and nbq_uid() in (user_a, user_b) and not is_blocked(user_a, user_b)) or (kind = 'game' and game_host(game_id, nbq_uid())));
create policy msg_read on messages for select to nbq_user using (thread_member(thread_id, nbq_uid()) and (not hidden or sender_id = nbq_uid()));
create policy msg_new on messages for insert to nbq_user with check (sender_id = nbq_uid() and not hidden and thread_member(thread_id, nbq_uid())
  and can_act(nbq_uid(), 'chat', (select case when t.user_a = nbq_uid() then t.user_b else t.user_a end from threads t where t.id = thread_id and t.kind = 'dm')) is null);

-- 球局改动记录：这局的发起人和参加的人
grant select on game_changes to nbq_user;
create policy gc_read on game_changes for select to nbq_user using (game_host(game_id, nbq_uid()) or game_member(game_id, nbq_uid()));

-- 公共参考数据：所有人可读
do $$ declare t text; begin
  foreach t in array array['venues','suburbs','suburb_aliases','service_areas','venue_fees','hitting_walls'] loop
    execute format('grant select on %I to nbq_user', t);
    execute format('drop policy if exists pub_read on %I', t);
    execute format('create policy pub_read on %I for select to nbq_user using (true)', t);
  end loop; end $$;
grant select, insert on venue_reviews, venue_suggestions to nbq_user;
create policy vr_read on venue_reviews for select to nbq_user using (not hidden or user_id = nbq_uid());
create policy vr_new on venue_reviews for insert to nbq_user with check (user_id = nbq_uid() and not hidden);
create policy vs_own on venue_suggestions to nbq_user using (user_id = nbq_uid()) with check (user_id = nbq_uid() and status = 'pending');
grant insert on area_demand to nbq_user;
create policy ad_new on area_demand for insert to nbq_user with check (true);
-- 私人球局里的微信号：只看得到同局、双方都打开了「展示微信」的人
create or replace view my_private_contacts as select game_id, other_user, wechat_id from private_game_contacts where viewer = nbq_uid();
grant select on my_private_contacts to nbq_user;

-- ④ 后台运营（nbq_admin）：看全部业务数据；手机号、登录 id、管理员密码 / 两步验证密钥不可读
do $$ declare t record; cols text; begin
  for t in select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'public' and c.relkind in ('r','p','v','m') and not c.relispartition and c.relname not in ('users','admin_users') loop
    execute format('grant select on %I to nbq_admin', t.relname);
  end loop;
  for t in select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'public' and c.relkind in ('r','p') and not c.relispartition loop
    begin
      execute format('drop policy if exists adm_read on %I', t.relname);
      execute format('create policy adm_read on %I for select to nbq_admin using (true)', t.relname);
    exception when insufficient_privilege then
      if t.relname <> 'spatial_ref_sys' then raise; end if;   -- 同上
    end;
  end loop;
  select string_agg(quote_ident(column_name), ', ') into cols from information_schema.columns
   where table_schema = current_schema() and table_name = 'users' and column_name not in ('phone_e164', 'auth_id');
  execute format('grant select (%s) on users to nbq_admin', cols);
  select string_agg(quote_ident(column_name), ', ') into cols from information_schema.columns
   where table_schema = current_schema() and table_name = 'admin_users' and column_name not in ('password_hash', 'totp_secret');
  execute format('grant select (%s) on admin_users to nbq_admin', cols);
end $$;
create or replace view admin_user_phone as select id, '••• ' || right(phone_e164, 4) as phone_tail from users;
grant select on admin_user_phone to nbq_admin;
-- 能改的：账号状态、举报处理、球场审核、隐藏消息 / 评价、风险提醒处理；能追加的：状态记录、邮件举报、操作日志
grant update (status, status_since, status_until, status_reason, gender, gender_review) on users to nbq_admin;
grant update (status, handled_by, handled_at) on reports to nbq_admin;
grant insert on reports, user_status_log, admin_audit_log to nbq_admin;
grant update (hidden) on messages, venue_reviews to nbq_admin;
grant update (status) on venue_suggestions to nbq_admin;
grant insert, update on venues to nbq_admin;
do $$ declare t text; begin
  foreach t in array array['users','reports','messages','venue_reviews','venue_suggestions','venues','risk_alerts'] loop
    execute format('drop policy if exists adm_upd on %I', t);
    execute format('create policy adm_upd on %I for update to nbq_admin using (true) with check (true)', t);
  end loop;
  foreach t in array array['reports','user_status_log','admin_audit_log','venues'] loop
    execute format('drop policy if exists adm_new on %I', t);
    execute format('create policy adm_new on %I for insert to nbq_admin with check (true)', t);
  end loop; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema = current_schema() and table_name = 'risk_alerts' and column_name = 'status') then
  execute 'grant update (status) on risk_alerts to nbq_admin'; end if; end $$;
-- 操作日志只能追加：谁都不能改、不能删（迁移时要清理请先 disable trigger 并留记录）
create or replace function audit_append_only() returns trigger language plpgsql as $$
begin raise exception 'admin_audit_log_append_only' using errcode = 'P0001'; end $$;
drop trigger if exists trg_audit_append_only on admin_audit_log;
create trigger trg_audit_append_only before update or delete on admin_audit_log for each row execute function audit_append_only();

-- 触发器里的连带处理（自动结束申请、补发起人那一行、发通知、记性别变更）以定义者身份运行：由谁触发都能完成，规则本身已在函数里
do $$ declare f record; begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.prorettype = 'trigger'::regtype
             and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e') loop   -- 扩展自带的触发器函数（PostGIS）不动
    execute format('alter function %s security definer set search_path = public', f.sig);
  end loop; end $$;
-- 约束里用到的函数，写入的人要能调用
grant execute on function suspension_days_ok(timestamptz, timestamptz) to nbq_user, nbq_admin;

-- ⑤ 后台只读（nbq_viewer）：只看统计，不看个人内容
do $$ declare t text; begin
  foreach t in array array['daily_metrics','daily_people','daily_event_dims','daily_card_views','rollup_days','event_definitions','activity_weights','risk_rules',
                           'venues','suburbs','v_applications_daily','v_badge_rarity','v_card_preferences','v_game_fill','admin_game_slots','v_suburb_activity','v_venue_activity_30d',
                           'v_multi_applicant_games','v_invite_outcomes','v_counted_games','v_user_retention','v_level_stuck','public_profiles','player_cards'] loop
    if exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname = t) then
      execute format('grant select on %I to nbq_viewer', t);
      if exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname = t and c.relkind in ('r','p')) then
        execute format('drop policy if exists vw_read on %I', t);
        execute format('create policy vw_read on %I for select to nbq_viewer using (true)', t);
      end if;
    end if;
  end loop; end $$;
-- 统计函数以定义者身份运行（读原始表算出汇总数字，返回的是人数 / 次数），只读角色可以调用，但不能直接查原始表
do $$ declare f record; begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname in ('today_board','active_users','fill_rate','venue_activity','suburb_activity','start_heatmap','visit_funnel',
             'share_attribution','application_outcomes','less_effect_counts','entry_sources','game_view_via','device_compare','pwa_install_funnel','inapp_handoff_funnel',
             'notification_route','page_traffic','env_usage','distinct_people','metric_sum','people_between','event_dims_between','card_views','user_activity') loop
    execute format('alter function %s security definer set search_path = public', f.sig);
  end loop; end $$;
revoke execute on all functions in schema public from nbq_viewer;
grant execute on function today_board(), active_users(timestamptz, timestamptz), fill_rate(timestamptz, timestamptz), venue_activity(timestamptz, timestamptz),
  suburb_activity(timestamptz, timestamptz), start_heatmap(timestamptz, timestamptz), visit_funnel(timestamptz, timestamptz), share_attribution(timestamptz, timestamptz),
  application_outcomes(timestamptz, timestamptz), less_effect_counts(timestamptz, timestamptz), entry_sources(timestamptz, timestamptz), game_view_via(timestamptz, timestamptz),
  device_compare(timestamptz, timestamptz), pwa_install_funnel(timestamptz, timestamptz), inapp_handoff_funnel(timestamptz, timestamptz), notification_route(timestamptz, timestamptz),
  page_traffic(timestamptz, timestamptz), env_usage(timestamptz, timestamptz), metric_sum(text, date, date, jsonb), mel_day_start(date), mel_today() to nbq_viewer;
-- 收尾：本节新建的函数也从 PUBLIC 收回（上面只给了指定角色）
revoke execute on all functions in schema public from public, anon, authenticated;

-- =====================================================================
-- ⑪ 后端接口的数据库函数（第四批 4f-2，2026-10）：球局、申请与参加、邀约
--   与 tests/spec/api_spec.md 一一对应。后端每个前台请求：begin; set local role nbq_user; set_config('nbq.uid', …); select api_xxx(…); commit。
--   函数以定义者身份运行（要看对方的屏蔽、设置、额度），身份一律取 nbq_uid()，每一条检查都写在函数里。
--   出错：raise exception，message = 错误码（见 api_spec.md §1），detail 可带补充信息；后端按错误码映射 HTTP 状态和文案。
-- =====================================================================
alter table notifications add column if not exists invite_id uuid references invites(id) on delete cascade;   -- 邀约类通知点开去邀约卡片

create or replace function nbq_err(p_code text, p_detail text default null) returns void language plpgsql as $$
begin raise exception using errcode = 'P0001', message = p_code, detail = coalesce(p_detail, ''); end $$;

-- 当前登录的人；没登录 → login_required
create or replace function nbq_me() returns uuid language plpgsql stable security definer set search_path = public as $$
declare u uuid := nbq_uid();
begin
  if u is null or not exists (select 1 from users where id = u) then perform nbq_err('login_required'); end if;
  return u;
end $$;
-- 前置三关：登录 → 账号状态（can_act）→ 球友约定（第一次申请 / 直接加入 / 发起 / 约人 / 接受邀约前）
create or replace function nbq_gate(p_action text, p_target uuid default null, p_women boolean default false) returns uuid
language plpgsql stable security definer set search_path = public as $$
declare u uuid := nbq_me(); st text;
begin
  st := can_act(u, p_action, p_target, p_women);
  if st is not null then perform nbq_err('account_' || st); end if;
  if p_action in ('apply','join','create','invite','accept') and (select pact_accepted_at from users where id = u) is null then perform nbq_err('pact_required'); end if;
  return u;
end $$;
-- 可选的开打时间：今天起 7 天（墨尔本日）、6:00–21:30、整点或半点、还没过
-- 发局 / 邀约时段：按球场所在城市的当地时间（地区扩展 R1：城市配置 cities.slot_start / slot_end；城市没开放 → city_closed）
create or replace function nbq_check_slot(p_start timestamptz, p_city text default 'melb') returns void language plpgsql stable as $$
declare c record; t time; d date;
begin
  select * into c from cities where key = coalesce(p_city, 'melb');
  if not found or c.status not in ('beta','on') then perform nbq_err('city_closed', coalesce(p_city, '')); end if;
  if p_start is null then perform nbq_err('invalid', 'starts_at'); end if;
  t := (p_start at time zone c.tz)::time; d := (p_start at time zone c.tz)::date;
  if p_start <= now() then perform nbq_err('time_past'); end if;
  if d > (now() at time zone c.tz)::date + 6 or t < c.slot_start or t > c.slot_end or extract(minute from t)::int not in (0, 30) or extract(second from t) <> 0 then
    perform nbq_err('time_out_of_range'); end if;
end $$;
create or replace function nbq_played_together(a uuid, b uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from v_counted_games x join v_counted_games y on y.game_id = x.game_id where x.user_id = a and y.user_id = b)
$$;
create or replace function nbq_notify(p_user uuid, p_kind notif_kind, p_game uuid, p_actor uuid, p_invite uuid default null) returns void
language sql security definer set search_path = public as $$
  insert into notifications(user_id, kind, game_id, actor_id, invite_id) values (p_user, p_kind, p_game, p_actor, p_invite)
$$;

-- ---------- 球局 ----------
create or replace function api_pact_accept() returns void language plpgsql security definer set search_path = public as $$
begin update users set pact_accepted_at = coalesce(pact_accepted_at, now()), pact_version = 1 where id = nbq_me(); end $$;

-- 徽章接服务器（11-04，迁移 20261104_badges_server）
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

create or replace function api_game_create(p jsonb) returns uuid language plpgsql security definer set search_path = public as $$
declare u uuid := nbq_gate('create'); me users; g uuid; st timestamptz := (p->>'starts_at')::timestamptz; dur int := coalesce((p->>'duration_min')::int, 90);
        typ text := p->>'game_type'; lo numeric := (p->>'utr_min')::numeric; hi numeric := (p->>'utr_max')::numeric; fl int := coalesce((p->>'filled')::int, 0);
        tg text[] := coalesce(array(select jsonb_array_elements_text(p->'tags')), '{}'); jm text := coalesce(p->>'join_mode', 'approve');
begin
  select * into me from users where id = u;
  perform nbq_check_slot(st, coalesce((select city from venues where id = (p->>'venue_id')::uuid), 'melb'));   -- 球场所在城市的当地时段
  if typ is null or typ not in ('singles','doubles','rally') then perform nbq_err('invalid', 'game_type'); end if;
  if dur not in (60, 90, 120) then perform nbq_err('invalid', 'duration_min'); end if;
  if lo is null or hi is null or lo > hi or lo < 1 or hi > 16.5 then perform nbq_err('invalid', 'utr'); end if;
  if (p->>'venue_id') is null or not exists (select 1 from venues where id = (p->>'venue_id')::uuid and status = 'active') then perform nbq_err('invalid', 'venue_id'); end if;
  if fl not between 0 and 2 or (typ <> 'doubles' and fl <> 0) then perform nbq_err('invalid', 'filled'); end if;
  if char_length(coalesce(p->>'note', '')) > 60 then perform nbq_err('invalid', 'note'); end if;
  if 'women' = any(tg) and (me.gender is distinct from 'f' or me.gender_review) then perform nbq_err('women_only'); end if;
  if jm not in ('approve','instant') or (jm = 'instant' and st - now() > interval '2 hours') then perform nbq_err('invalid', 'join_mode'); end if;
  -- 频率（⑭）：进行中的球局最多 5 个；每天发 5 个
  if (select count(*) from games where host_id = u and status in ('open','full') and starts_at > now()) >= 5 then perform nbq_err('game_open_limit'); end if;
  perform nbq_rate(u::text, 'game_create');
  insert into games(share_code, host_id, venue_id, starts_at, duration_min, game_type, capacity, utr_min, utr_max, note, created_device, visibility, filled, tags, join_mode, time_set_at)
  values (substr(md5(random()::text || clock_timestamp()::text), 1, 6), u, (p->>'venue_id')::uuid, st, dur, typ::game_type, case typ when 'doubles' then 4 else 2 end,
          lo, hi, nullif(p->>'note', ''), p->>'device', 'public', fl, tg, jm, now())
  returning id into g;
  -- 多遇到 TA 的人：TA 发了适合你的新局（水平相差 0.5 以内、女生局规则、未屏蔽、正常账号；同一人每 7 天最多 1 次）
  with f as (select pp.user_id from player_prefs pp join users x on x.id = pp.user_id
              where pp.target_id = u and pp.pref = 'more' and x.status = 'active' and x.utr between lo - 0.5 and hi + 0.5
                and (not 'women' = any(tg) or (x.gender = 'f' and not x.gender_review)) and not is_blocked(pp.user_id, u)
                and not exists (select 1 from follow_notices n where n.user_id = pp.user_id and n.target_id = u and n.last_at > now() - interval '7 days')),
       up as (insert into follow_notices(user_id, target_id, last_at) select user_id, u, now() from f
              on conflict (user_id, target_id) do update set last_at = excluded.last_at returning user_id)
  insert into notifications(user_id, kind, game_id, actor_id) select user_id, 'follow_game', g, u from up;
  return g;
end $$;

-- 发起人修改：时间 / 时长 / 球场 / 水平 / 线下已有几人 / 标签 / 说明；改时间或球场算大改动，已加入的人可以不算临时退出地退出
create or replace function api_game_edit(p_game uuid, p jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare u uuid := nbq_gate('create'); g games; n games; ch jsonb := '{}';
begin
  select * into g from games where id = p_game for update;
  if not found then perform nbq_err('not_found'); end if;
  if g.host_id <> u then perform nbq_err('not_host'); end if;
  if g.status = 'cancelled' then perform nbq_err('game_closed'); end if;
  -- 已开打：只许改「线下已有几人」（发起人现场凑齐了 / 不再等了，一键「人齐了」）；其余照旧不能改
  if g.starts_at <= now() and not (p ? 'filled' and p - 'filled' = '{}'::jsonb and g.starts_at + make_interval(mins => g.duration_min) > now()) then perform nbq_err('game_started'); end if;
  n := g;
  if p ? 'starts_at' then n.starts_at := (p->>'starts_at')::timestamptz; if n.starts_at <> g.starts_at then perform nbq_check_slot(n.starts_at, g.city); end if; end if;
  if p ? 'duration_min' then n.duration_min := (p->>'duration_min')::int; if n.duration_min not in (60, 90, 120) then perform nbq_err('invalid', 'duration_min'); end if; end if;
  if p ? 'venue_id' then n.venue_id := (p->>'venue_id')::uuid;
    if not exists (select 1 from venues where id = n.venue_id and status = 'active') then perform nbq_err('invalid', 'venue_id'); end if; end if;
  if p ? 'utr_min' then n.utr_min := (p->>'utr_min')::numeric; end if;
  if p ? 'utr_max' then n.utr_max := (p->>'utr_max')::numeric; end if;
  if n.utr_min > n.utr_max then perform nbq_err('invalid', 'utr'); end if;
  if p ? 'filled' then n.filled := (p->>'filled')::int; end if;
  if p ? 'note' then n.note := nullif(p->>'note', ''); if char_length(coalesce(n.note, '')) > 60 then perform nbq_err('invalid', 'note'); end if; end if;
  if p ? 'tags' then n.tags := array(select jsonb_array_elements_text(p->'tags')); end if;
  if p ? 'join_mode' then n.join_mode := p->>'join_mode';
    if n.join_mode = 'instant' and n.starts_at - now() > interval '2 hours' then perform nbq_err('invalid', 'join_mode'); end if; end if;
  select jsonb_object_agg(k, jsonb_build_array(to_jsonb(g) -> k, to_jsonb(n) -> k)) into ch from jsonb_object_keys(to_jsonb(n)) k
   where to_jsonb(g) -> k is distinct from to_jsonb(n) -> k;
  if ch is null or ch = '{}'::jsonb then return '{}'::jsonb; end if;
  update games set starts_at = n.starts_at, duration_min = n.duration_min, venue_id = n.venue_id, utr_min = n.utr_min, utr_max = n.utr_max, filled = n.filled,
         note = n.note, tags = n.tags, join_mode = n.join_mode, time_set_at = case when n.starts_at <> g.starts_at then now() else time_set_at end
   where id = p_game;
  insert into game_changes(game_id, changed_by, fields, is_major) values (p_game, u, ch, ch ? 'starts_at' or ch ? 'venue_id');
  if ch ? 'starts_at' then update game_participants set change_ack = 'pending' where game_id = p_game and role = 'player' and status = 'approved'; end if;
  insert into notifications(user_id, kind, game_id, actor_id) select user_id, 'changed', p_game, u from game_participants where game_id = p_game and role = 'player' and status = 'approved';
  return ch;
end $$;

create or replace function api_game_postpone(p_game uuid) returns timestamptz language plpgsql security definer set search_path = public as $$
declare u uuid := nbq_gate('create'); g games;
begin
  select * into g from games where id = p_game for update;
  if not found then perform nbq_err('not_found'); end if;
  if g.host_id <> u then perform nbq_err('not_host'); end if;
  if g.status = 'cancelled' then perform nbq_err('game_closed'); end if;
  if g.starts_at <= now() then perform nbq_err('game_started'); end if;
  if g.postponed_at is not null then perform nbq_err('postpone_once'); end if;   -- 只能顺延一次
  if ((g.starts_at + interval '1 hour' + make_interval(mins => g.duration_min)) at time zone city_tz(g.city))::date > (g.starts_at at time zone city_tz(g.city))::date
     or ((g.starts_at + interval '1 hour' + make_interval(mins => g.duration_min)) at time zone city_tz(g.city))::time > (select postpone_end from cities where key = g.city) then perform nbq_err('postpone_too_late'); end if;   -- 结束不晚于当地 23:00
  update games set starts_at = g.starts_at + interval '1 hour', postponed_at = now(), original_start = coalesce(original_start, g.starts_at), time_set_at = now() where id = p_game;
  insert into game_changes(game_id, changed_by, fields, is_major) values (p_game, u, jsonb_build_object('starts_at', jsonb_build_array(g.starts_at, g.starts_at + interval '1 hour')), true);
  update game_participants set change_ack = 'pending' where game_id = p_game and role = 'player' and status = 'approved';
  insert into notifications(user_id, kind, game_id, actor_id) select user_id, 'postponed', p_game, u from game_participants where game_id = p_game and role = 'player' and status = 'approved';
  return g.starts_at + interval '1 hour';
end $$;

create or replace function api_game_cancel(p_game uuid) returns void language plpgsql security definer set search_path = public as $$
declare u uuid := nbq_me(); g games; who uuid[];
begin
  select * into g from games where id = p_game for update;
  if not found then perform nbq_err('not_found'); end if;
  if g.host_id <> u then perform nbq_err('not_host'); end if;
  if g.status = 'cancelled' then perform nbq_err('game_closed'); end if;
  if g.starts_at <= now() then perform nbq_err('game_started'); end if;
  select array_agg(user_id) into who from game_participants where game_id = p_game and role = 'player' and status in ('approved','pending');
  update games set status = 'cancelled' where id = p_game;   -- 待确认的申请由 games_cancel_cleanup 结束
  insert into notifications(user_id, kind, game_id, actor_id) select x, 'game_cancelled', p_game, u from unnest(coalesce(who, '{}')) x;
end $$;

-- ---------- 申请与参加 ----------
-- 申请 / 直接加入的共同检查，按 api_spec §5 的顺序
create or replace function nbq_join_checks(p_game uuid, p_action text) returns games language plpgsql security definer set search_path = public as $$
declare g games; u uuid; me users; mine game_participants;
begin
  u := nbq_me();
  select * into g from games where id = p_game;
  if not found then perform nbq_err('not_found'); end if;
  u := nbq_gate(p_action, null, 'women' = any(g.tags));
  if not game_visible(p_game, u) or g.visibility <> 'public' then perform nbq_err('not_found'); end if;
  if g.status = 'cancelled' then perform nbq_err('game_closed'); end if;
  if g.starts_at + interval '30 minutes' <= now() then perform nbq_err('game_started'); end if;   -- 11-04：开打后 30 分钟内仍可申请 / 直接加入
  select * into me from users where id = u;
  if 'women' = any(g.tags) and (me.gender is distinct from 'f' or me.gender_review) then perform nbq_err('women_only'); end if;
  if is_blocked(u, g.host_id) then perform nbq_err('blocked'); end if;
  select * into mine from game_participants where game_id = p_game and user_id = u;
  if found and mine.status in ('pending','approved') then perform nbq_err('already_applied'); end if;
  if (select count(*) from game_participants where game_id = p_game and status = 'approved') + g.filled >= g.capacity then perform nbq_err('game_full'); end if;
  return g;
end $$;

create or replace function api_apply(p_game uuid, p_message text default null, p_eta int default null) returns text language plpgsql security definer set search_path = public as $$
declare g games := nbq_join_checks(p_game, 'apply'); u uuid := nbq_uid();
begin
  if char_length(coalesce(p_message, '')) > 140 then perform nbq_err('invalid', 'message'); end if;
  if p_eta is not null and p_eta not between 1 and 120 then perform nbq_err('invalid', 'eta'); end if;
  perform nbq_rate(u::text, 'apply', p_game::text);   -- 频率（⑭）
  insert into game_participants(game_id, user_id, role, status, message, via, created_at, eta_min)
  values (p_game, u, 'player', 'pending', nullif(p_message, ''), 'request', now(), case when g.starts_at <= now() then p_eta end)   -- 预计几分钟到：只有开打后才申请的才记
  on conflict (game_id, user_id) do update set status = 'pending', message = excluded.message, via = 'request', created_at = now(), eta_min = excluded.eta_min,
     left_at = null, decided_at = null, approved_at = null, expired_at = null, decline_reason = null, decline_note = null
   where game_participants.status in ('withdrawn','left','rejected','expired');
  -- 同一人对同一局再次申请：只保留最新一条申请通知
  delete from notifications where user_id = g.host_id and kind = 'request' and game_id = p_game and actor_id = u;
  perform nbq_notify(g.host_id, 'request', p_game, u);
  return 'pending';
end $$;

create or replace function api_join(p_game uuid) returns text language plpgsql security definer set search_path = public as $$
declare g games := nbq_join_checks(p_game, 'join'); u uuid := nbq_uid(); r numeric;
begin
  if g.join_mode <> 'instant' then perform nbq_err('join_not_allowed'); end if;
  if g.starts_at <= now() then perform nbq_err('join_not_allowed', 'started'); end if;   -- 11-04：开打后（宽限期内）一律要发起人确认，不能直接加入
  select utr into r from users where id = u;
  if r not between g.utr_min and g.utr_max then perform nbq_err('level_mismatch'); end if;
  -- 发起人对我「少遇到」：不能直接加入（不告诉原因，前台提示改为发送申请）
  if exists (select 1 from player_prefs where user_id = g.host_id and target_id = u and pref = 'less') then perform nbq_err('join_not_allowed', 'less'); end if;
  perform nbq_rate(u::text, 'apply', p_game::text);   -- 频率（⑭）：和申请合计
  insert into game_participants(game_id, user_id, role, status, via, approved_at, decided_at, created_at)
  values (p_game, u, 'player', 'approved', 'instant', now(), now(), now())
  on conflict (game_id, user_id) do update set status = 'approved', via = 'instant', approved_at = now(), decided_at = now(), created_at = now(),
     left_at = null, expired_at = null, decline_reason = null, decline_note = null, message = null
   where game_participants.status in ('withdrawn','left','rejected','expired');
  perform nbq_notify(g.host_id, 'joined', p_game, u);
  return 'approved';
end $$;

create or replace function api_approve(p_game uuid, p_user uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare u uuid := nbq_me(); h uuid; st text; rs text;
begin
  select host_id into h from games where id = p_game;
  if h is null then perform nbq_err('not_found'); end if;
  if h <> u then perform nbq_err('not_host'); end if;
  update game_participants set status = 'approved', decided_at = now(), approved_at = now()
   where game_id = p_game and user_id = p_user and role = 'player' and status = 'pending'
  returning status::text, decline_reason into st, rs;          -- 刚好被占满 / 球局刚取消时 gp_guard 会改成 rejected
  if st is null then perform nbq_err('state_changed'); end if;
  if st = 'approved' then perform nbq_notify(p_user, 'approved', p_game, u); end if;
  return jsonb_build_object('status', st, 'reason', rs);
end $$;

create or replace function api_decline(p_game uuid, p_user uuid, p_reason text, p_note text default null) returns void language plpgsql security definer set search_path = public as $$
declare u uuid := nbq_me(); h uuid;
begin
  select host_id into h from games where id = p_game;
  if h is null then perform nbq_err('not_found'); end if;
  if h <> u then perform nbq_err('not_host'); end if;
  if p_reason is null or p_reason not in ('known','level','pass') then perform nbq_err('invalid', 'reason'); end if;
  if char_length(coalesce(p_note, '')) > 30 then perform nbq_err('invalid', 'note'); end if;
  update game_participants set status = 'rejected', decline_reason = p_reason, decline_note = nullif(p_note, ''), decided_at = now()
   where game_id = p_game and user_id = p_user and role = 'player' and status = 'pending';
  if not found then perform nbq_err('state_changed'); end if;
  perform nbq_notify(p_user, 'rejected', p_game, u);
end $$;

-- 撤回申请（pending → withdrawn）或退出（approved → left）。已加入的人退出：通知发起人；开打前 1 小时以上的公开局，告诉之前因满员没排上的人一次
create or replace function api_leave(p_game uuid) returns text language plpgsql security definer set search_path = public as $$
declare u uuid := nbq_me(); g games; p game_participants; nst part_status;
begin
  select * into g from games where id = p_game;
  if not found then perform nbq_err('not_found'); end if;
  select * into p from game_participants where game_id = p_game and user_id = u for update;
  if not found or p.status not in ('pending','approved') then perform nbq_err('not_in_game'); end if;
  if p.role = 'host' then perform nbq_err('host_cannot_leave'); end if;
  nst := case p.status when 'pending' then 'withdrawn'::part_status else 'left'::part_status end;
  update game_participants set status = nst, left_at = now() where game_id = p_game and user_id = u and status = p.status;
  if p.status = 'approved' then
    perform nbq_notify(g.host_id, 'player_left', p_game, u);
    if g.visibility = 'public' and g.status <> 'cancelled' and g.starts_at - now() > interval '1 hour' then
      insert into notifications(user_id, kind, game_id, actor_id)
      select x.user_id, 'reopen', p_game, null from game_participants x
       where x.game_id = p_game and x.status = 'rejected' and x.decline_reason = 'full_auto'
         and not exists (select 1 from notifications n where n.user_id = x.user_id and n.kind = 'reopen' and n.game_id = p_game);
    end if;
  end if;
  return nst::text;
end $$;

-- 改时间后，已加入的人确认：ok 继续 / out 退出（不算临时退出）
create or replace function api_change_ack(p_game uuid, p_choice text) returns text language plpgsql security definer set search_path = public as $$
declare u uuid := nbq_me(); h uuid;
begin
  if p_choice not in ('ok','out') then perform nbq_err('invalid', 'choice'); end if;
  select host_id into h from games where id = p_game;
  if p_choice = 'ok' then
    update game_participants set change_ack = 'ok' where game_id = p_game and user_id = u and status = 'approved' and change_ack = 'pending';
  else
    update game_participants set change_ack = 'out', status = 'left', left_at = now() where game_id = p_game and user_id = u and status = 'approved' and change_ack = 'pending';
  end if;
  if not found then perform nbq_err('state_changed'); end if;
  if p_choice = 'out' then perform nbq_notify(h, 'player_left', p_game, u); end if;
  return p_choice;
end $$;

-- ---------- 邀约 ----------
create or replace function nbq_check_invite_time(p_start timestamptz, p_end timestamptz, p_city text default 'melb') returns void language plpgsql stable as $$
begin
  perform nbq_check_slot(p_start, p_city);
  if p_end is null or p_end - p_start not in (interval '60 minutes', interval '90 minutes', interval '120 minutes') then perform nbq_err('time_out_of_range', 'duration'); end if;
end $$;

create or replace function api_invite(p jsonb) returns uuid language plpgsql security definer set search_path = public as $$
declare t uuid := (p->>'to_user')::uuid; u uuid; tu users; played boolean; v_id uuid; ic text;
        st timestamptz := (p->>'starts_at')::timestamptz; en timestamptz := (p->>'ends_at')::timestamptz;
begin
  u := nbq_gate('invite', t);
  if t = u then perform nbq_err('invite_self'); end if;
  select * into tu from users where id = t;
  if not found or tu.status in ('banned','deleted') then perform nbq_err('not_found'); end if;
  if is_blocked(u, t) then perform nbq_err('blocked'); end if;
  played := nbq_played_together(u, t);
  if tu.invite_from = 'none' then perform nbq_err('invite_closed'); end if;
  if tu.invite_from = 'played' and not played then perform nbq_err('invite_played_only'); end if;
  if exists (select 1 from player_prefs where user_id = t and target_id = u and pref = 'less') then perform nbq_err('invite_closed', 'less'); end if;
  if not played and (select count(distinct i.to_user) from invites i where i.from_user = u and i.created_at > now() - interval '24 hours'
                       and i.to_user <> t and not nbq_played_together(u, i.to_user)) >= 2 then perform nbq_err('invite_new_limit'); end if;
  if (select count(*) from invites where from_user = u and created_at > now() - interval '24 hours') >= 3 then perform nbq_err('invite_daily_limit'); end if;
  if (select count(*) from invites where from_user = u and to_user = t and status = 'declined' and created_at > now() - interval '30 days') >= 2 then perform nbq_err('invite_declined_twice'); end if;
  if exists (select 1 from invites where from_user = u and to_user = t and status in ('pending','counter')) then perform nbq_err('invite_pending'); end if;
  ic := coalesce((select city from venues where id = (p->>'venue_id')::uuid), (select home_city from users where id = u), 'melb');
  perform nbq_check_invite_time(st, en, ic);
  if coalesce(p->>'game_type', 'singles') not in ('singles','rally') then perform nbq_err('invalid', 'game_type'); end if;
  if (p->>'venue_id') is null and coalesce(p->>'venue_name', '') = '' then perform nbq_err('invalid', 'venue'); end if;
  if char_length(coalesce(p->>'venue_name', '')) > 40 or char_length(coalesce(p->>'note', '')) > 30 then perform nbq_err('invalid', 'length'); end if;
  insert into invites(from_user, to_user, starts_at, ends_at, venue_id, venue_name, game_type, note, expires_at, city)
  values (u, t, st, en, (p->>'venue_id')::uuid, nullif(p->>'venue_name', ''), coalesce(p->>'game_type', 'singles'), nullif(p->>'note', ''), now() + interval '48 hours', ic)
  returning invites.id into v_id;
  perform nbq_notify(t, 'invite', null, u, v_id);
  return v_id;
end $$;

-- 接受：接收人接受（pending），或发起人确认对方换的时间（counter）。一个事务里建私人球局 + 对方那一行 + 邀约成局
create or replace function api_invite_accept(p_id uuid) returns uuid language plpgsql security definer set search_path = public as $$
declare u uuid := nbq_me(); i invites; other uuid; st timestamptz; en timestamptz; v uuid; vn text; g uuid;
begin
  select * into i from invites where id = p_id for update;
  if not found or u not in (i.from_user, i.to_user) then perform nbq_err('not_found'); end if;
  if i.status not in ('pending','counter') then perform nbq_err('invite_ended'); end if;
  if (i.status = 'pending' and u <> i.to_user) or (i.status = 'counter' and u <> i.from_user) then perform nbq_err('forbidden'); end if;
  st := case when i.status = 'counter' then i.counter_starts_at else i.starts_at end;
  en := case when i.status = 'counter' then i.counter_ends_at else i.ends_at end;
  v := case when i.status = 'counter' then i.counter_venue_id else i.venue_id end;
  vn := case when i.status = 'counter' then i.counter_venue_name else i.venue_name end;
  if i.expires_at < now() or st <= now() then perform nbq_err('invite_ended', 'expired'); end if;
  other := case when u = i.from_user then i.to_user else i.from_user end;
  perform nbq_gate('accept', other);
  if is_blocked(u, other) then perform nbq_err('blocked'); end if;
  insert into games(share_code, host_id, venue_id, venue_name, starts_at, duration_min, game_type, capacity, utr_min, utr_max, visibility, join_mode, time_set_at, city)
  values (substr(md5(random()::text || clock_timestamp()::text), 1, 6), i.from_user, v, vn, st, (extract(epoch from en - st) / 60)::int,
          i.game_type::game_type, 2, 1, 16.5, 'private', 'approve', now(), i.city)
  returning id into g;
  insert into game_participants(game_id, user_id, role, status, via, approved_at, decided_at) values (g, i.to_user, 'player', 'approved', 'invite', now(), now());
  update invites set status = 'accepted', game_id = g, responded_at = now() where id = p_id and status = i.status;
  if not found then perform nbq_err('state_changed'); end if;
  perform nbq_notify(other, 'invite_accepted', g, u, p_id);
  return g;
end $$;

create or replace function api_invite_counter(p_id uuid, p jsonb) returns void language plpgsql security definer set search_path = public as $$
declare u uuid := nbq_me(); i invites; st timestamptz := (p->>'starts_at')::timestamptz; en timestamptz := (p->>'ends_at')::timestamptz;
        v uuid := (p->>'venue_id')::uuid; vn text := nullif(p->>'venue_name', '');
begin
  select * into i from invites where id = p_id for update;
  if not found or u not in (i.from_user, i.to_user) then perform nbq_err('not_found'); end if;
  if u <> i.to_user then perform nbq_err('forbidden'); end if;
  if i.status = 'counter' or (i.status = 'pending' and i.countered_at is not null) then perform nbq_err('counter_once'); end if;
  if i.status <> 'pending' or i.expires_at < now() or i.starts_at <= now() then perform nbq_err('invite_ended'); end if;
  perform nbq_gate('counter', i.from_user);
  if v is not null and (select city from venues where id = v) is distinct from i.city then perform nbq_err('invalid', 'venue_city'); end if;   -- 换时间不能换到别的城市
  perform nbq_check_invite_time(st, en, i.city);
  if v is null and vn is null then v := i.venue_id; vn := i.venue_name; end if;
  if st = i.starts_at and en = i.ends_at and v is not distinct from i.venue_id and vn is not distinct from i.venue_name then perform nbq_err('counter_same'); end if;
  update invites set status = 'counter', counter_starts_at = st, counter_ends_at = en, counter_venue_id = v, counter_venue_name = vn,
         countered_at = now(), expires_at = now() + interval '48 hours' where id = p_id and status = 'pending';
  perform nbq_notify(i.from_user, 'invite_counter', null, u, p_id);
end $$;

create or replace function api_invite_decline(p_id uuid, p_reason text default null, p_note text default null) returns void language plpgsql security definer set search_path = public as $$
declare u uuid := nbq_me(); i invites; other uuid;
begin
  select * into i from invites where id = p_id for update;
  if not found or u not in (i.from_user, i.to_user) then perform nbq_err('not_found'); end if;
  if i.status not in ('pending','counter') then perform nbq_err('invite_ended'); end if;
  if (i.status = 'pending' and u <> i.to_user) or (i.status = 'counter' and u <> i.from_user) then perform nbq_err('forbidden'); end if;
  if p_reason is not null and p_reason not in ('week','rest','pass') then perform nbq_err('invalid', 'reason'); end if;
  if char_length(coalesce(p_note, '')) > 30 then perform nbq_err('invalid', 'note'); end if;
  update invites set status = 'declined', responded_at = now(), decline_reason = p_reason, decline_note = nullif(p_note, '') where id = p_id and status = i.status;
  other := case when u = i.from_user then i.to_user else i.from_user end;
  perform nbq_notify(other, 'invite_declined', null, u, p_id);
end $$;

-- 撤回：发起人撤回邀约；接收人撤回自己提的新时间（回到待回复，不能再换一次）
create or replace function api_invite_withdraw(p_id uuid) returns text language plpgsql security definer set search_path = public as $$
declare u uuid := nbq_me(); i invites;
begin
  select * into i from invites where id = p_id for update;
  if not found or u not in (i.from_user, i.to_user) then perform nbq_err('not_found'); end if;
  if u = i.from_user and i.status in ('pending','counter') then
    update invites set status = 'withdrawn', responded_at = now() where id = p_id; return 'withdrawn';
  elsif u = i.to_user and i.status = 'counter' then
    update invites set status = 'pending', counter_starts_at = null, counter_ends_at = null, counter_venue_id = null, counter_venue_name = null where id = p_id;
    return 'pending';
  end if;
  perform nbq_err('invite_ended');
end $$;

-- 邀约：接收人撤回新时间时 counter → pending（countered_at 保留，仍然只能换一次）
create or replace function invites_guard() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status and not (
       (old.status = 'pending' and new.status in ('counter','accepted','declined','expired','withdrawn'))
    or (old.status = 'counter' and new.status in ('pending','accepted','declined','expired','withdrawn'))) then
    raise exception 'bad_transition' using errcode = 'P0001', detail = old.status || ' → ' || new.status, hint = '邀约状态已变，重新读取';
  end if;
  if old.countered_at is not null and new.countered_at is distinct from old.countered_at then raise exception 'counter_once' using errcode = 'P0001'; end if;
  if old.game_id is not null and new.game_id is distinct from old.game_id then raise exception 'invite_game_fixed' using errcode = 'P0001'; end if;
  return new;
end $$;

-- 只给前台调用这些接口函数；内部辅助函数不对外
revoke execute on function nbq_err(text, text), nbq_me(), nbq_gate(text, uuid, boolean), nbq_check_slot(timestamptz, text), nbq_played_together(uuid, uuid),
  nbq_notify(uuid, notif_kind, uuid, uuid, uuid), nbq_join_checks(uuid, text), nbq_check_invite_time(timestamptz, timestamptz, text) from public;
do $$ declare f record; begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname like 'api\_%' loop
    execute format('revoke execute on function %s from public, anon, authenticated, nbq_viewer', f.sig);
    execute format('grant execute on function %s to nbq_user, nbq_service', f.sig);
  end loop; end $$;

-- ---------- ⑪ 续（4f-3）：打完之后、聊天、屏蔽、通知、账号 ----------
-- 这局我是否「一起打完」：已加入、未取消、已结束；返回结束时间（不是则报 not_in_game）
create or replace function nbq_played_in(p_game uuid, p_user uuid) returns timestamptz language plpgsql stable security definer set search_path = public as $$
declare e timestamptz;
begin
  select g.starts_at + make_interval(mins => g.duration_min) into e from games g join game_participants p on p.game_id = g.id
   where g.id = p_game and p.user_id = p_user and p.status = 'approved' and g.status <> 'cancelled';
  if e is null or e > now() then perform nbq_err('not_in_game'); end if;
  return e;
end $$;
-- 多遇到 / 随缘 / 少遇到（只影响自己的推荐，对方不知道）；少遇到同时记私信静音的时间段
create or replace function nbq_set_pref(p_me uuid, p_target uuid, p_pref text, p_game uuid) returns void language plpgsql security definer set search_path = public as $$
declare was text;
begin
  if p_pref not in ('more','ok','less') then perform nbq_err('invalid', 'pref'); end if;
  select pref into was from player_prefs where user_id = p_me and target_id = p_target;
  if p_pref = 'ok' then delete from player_prefs where user_id = p_me and target_id = p_target;
  else insert into player_prefs(user_id, target_id, pref, game_id, updated_at) values (p_me, p_target, p_pref, p_game, now())
       on conflict (user_id, target_id) do update set pref = excluded.pref, game_id = coalesce(excluded.game_id, player_prefs.game_id), updated_at = now();
  end if;
  if p_pref = 'less' and was is distinct from 'less' then insert into player_pref_mutes(user_id, target_id, muted_from) values (p_me, p_target, now()); end if;
  if p_pref <> 'less' and was = 'less' then update player_pref_mutes set muted_until = now() where user_id = p_me and target_id = p_target and muted_until is null; end if;
end $$;

-- 赛后卡片：这局感受、对每位同场球友多遇到 / 随缘 / 少遇到、留印象（空数组 = 撤回）；结束后 7 天内
create or replace function api_recap(p_game uuid, p jsonb) returns void language plpgsql security definer set search_path = public as $$
declare u uuid := nbq_me(); e timestamptz := nbq_played_in(p_game, u); k text; v jsonb; kinds impression_kind[];
begin
  if e < now() - interval '7 days' then perform nbq_err('recap_closed'); end if;
  if p ? 'feel' then
    if p->>'feel' not in ('hard','ok','easy') then perform nbq_err('invalid', 'feel'); end if;
    insert into game_feel(game_id, user_id, feel, closed_at) values (p_game, u, p->>'feel', case when (p->>'done')::boolean then now() end)
    on conflict (game_id, user_id) do update set feel = excluded.feel, closed_at = coalesce(excluded.closed_at, game_feel.closed_at);
  end if;
  for k, v in select * from jsonb_each(coalesce(p->'prefs', '{}')) loop
    if k::uuid = u or not exists (select 1 from game_participants where game_id = p_game and user_id = k::uuid and status = 'approved') then perform nbq_err('invalid', 'prefs'); end if;
    perform nbq_set_pref(u, k::uuid, v #>> '{}', p_game);
  end loop;
  for k, v in select * from jsonb_each(coalesce(p->'impressions', '{}')) loop
    if k::uuid = u or not exists (select 1 from game_participants where game_id = p_game and user_id = k::uuid and status = 'approved') then perform nbq_err('invalid', 'impressions'); end if;
    kinds := array(select jsonb_array_elements_text(v))::impression_kind[];
    if cardinality(kinds) = 0 then delete from impressions where game_id = p_game and from_id = u and to_id = k::uuid;
    else insert into impressions(game_id, from_id, to_id, kinds) values (p_game, u, k::uuid, kinds)
         on conflict (game_id, from_id, to_id) do update set kinds = excluded.kinds; end if;
  end loop;
  if (p->>'done')::boolean and not (p ? 'feel') then
    insert into game_feel(game_id, user_id, closed_at) values (p_game, u, now()) on conflict (game_id, user_id) do update set closed_at = now();
  end if;
end $$;

-- 在球员卡上设多遇到 / 随缘 / 少遇到（不需要一起打过）
create or replace function api_pref_set(p_target uuid, p_pref text) returns void language plpgsql security definer set search_path = public as $$
declare u uuid := nbq_me();
begin
  if p_target = u or not exists (select 1 from users where id = p_target) then perform nbq_err('invalid', 'target'); end if;
  perform nbq_set_pref(u, p_target, p_pref, null);
end $$;

-- 一键点赞：14 天内一起打完的局，给 TA（p_target 为空 = 这局所有同场球友）；每场每人一次
create or replace function api_kudos(p_game uuid, p_target uuid default null) returns int language plpgsql security definer set search_path = public as $$
declare u uuid := nbq_me(); e timestamptz := nbq_played_in(p_game, u); n int;
begin
  if e < now() - interval '14 days' then perform nbq_err('recap_closed'); end if;
  if p_target is not null and not exists (select 1 from game_participants where game_id = p_game and user_id = p_target and status = 'approved' and user_id <> u) then
    perform nbq_err('not_in_game'); end if;
  insert into impressions(game_id, from_id, to_id, kinds)
  select p_game, u, p.user_id, '{kind}' from game_participants p
   where p.game_id = p_game and p.status = 'approved' and p.user_id <> u and (p_target is null or p.user_id = p_target)
  on conflict (game_id, from_id, to_id) do nothing;
  get diagnostics n = row_count;
  return n;
end $$;

-- 反馈 TA 没来：同局已加入的人，结束后 48 小时内；达到确认条件时通知被反馈的人（不说是谁）
create or replace function api_noshow_report(p_game uuid, p_target uuid) returns boolean language plpgsql security definer set search_path = public as $$
declare u uuid := nbq_me(); e timestamptz := nbq_played_in(p_game, u); confirmed boolean;
begin
  if p_target = u or not exists (select 1 from game_participants where game_id = p_game and user_id = p_target and status = 'approved') then perform nbq_err('not_in_game'); end if;
  if e < now() - interval '48 hours' then perform nbq_err('noshow_window_closed'); end if;
  insert into noshow_reports(game_id, target_id, reporter_id) values (p_game, p_target, u) on conflict do nothing;
  confirmed := exists (select 1 from v_confirmed_noshow where game_id = p_game and user_id = p_target);
  if confirmed and not exists (select 1 from notifications where user_id = p_target and kind = 'noshow' and game_id = p_game) then
    perform nbq_notify(p_target, 'noshow', p_game, null);
  end if;
  return confirmed;
end $$;
create or replace function api_noshow_undo(p_game uuid, p_target uuid) returns void language plpgsql security definer set search_path = public as $$
declare u uuid := nbq_me(); e timestamptz := nbq_played_in(p_game, u);
begin
  if e < now() - interval '48 hours' then perform nbq_err('noshow_window_closed'); end if;
  delete from noshow_reports where game_id = p_game and target_id = p_target and reporter_id = u;
  if not found then perform nbq_err('state_changed'); end if;
end $$;
-- 发起人标记到场情况：结束后 48 小时内
create or replace function api_attendance(p_game uuid, p_user uuid, p_value text) returns void language plpgsql security definer set search_path = public as $$
declare u uuid := nbq_me(); e timestamptz := nbq_played_in(p_game, u);
begin
  if not game_host(p_game, u) then perform nbq_err('not_host'); end if;
  if p_value not in ('came','no_show') then perform nbq_err('invalid', 'value'); end if;
  if e < now() - interval '48 hours' then perform nbq_err('noshow_window_closed'); end if;
  update game_participants set attendance = p_value where game_id = p_game and user_id = p_user and role = 'player' and status = 'approved';
  if not found then perform nbq_err('not_in_game'); end if;
  if p_value = 'no_show' and not exists (select 1 from notifications where user_id = p_user and kind = 'noshow' and game_id = p_game) then
    perform nbq_notify(p_user, 'noshow', p_game, null); end if;
end $$;
-- 申诉：被确认爽约的本人；申诉期间不计入
create or replace function api_noshow_appeal(p_game uuid, p_reason text, p_note text default null) returns void language plpgsql security definer set search_path = public as $$
declare u uuid := nbq_me();
begin
  if not exists (select 1 from v_confirmed_noshow where game_id = p_game and user_id = u) then perform nbq_err('forbidden'); end if;
  if p_reason not in ('came','told','other') then perform nbq_err('invalid', 'reason'); end if;
  if char_length(coalesce(p_note, '')) > 200 then perform nbq_err('invalid', 'note'); end if;
  insert into noshow_appeals(game_id, user_id, reason) values (p_game, u, p_reason) on conflict do nothing;
  if not found then perform nbq_err('state_changed'); end if;
end $$;

-- 私人球局里向对方展示微信号：已加入的人（含发起人）改自己的开关。直接 update 会被 gp_self 的 with check 拦下（它只允许状态为待确认 / 撤回 / 退出的行），所以走函数
create or replace function api_show_wechat(p_game uuid, p_value boolean) returns boolean language plpgsql security definer set search_path = public as $$
declare u uuid := nbq_me();
begin
  if p_value is null then perform nbq_err('invalid', 'show_wechat'); end if;
  update game_participants set show_wechat = p_value
   where game_id = p_game and user_id = u and status = 'approved' and exists (select 1 from games g where g.id = p_game and g.visibility = 'private');
  if not found then perform nbq_err('not_in_game'); end if;
  return p_value;
end $$;

-- ---------- 聊天 ----------
-- 打开私信（没有就建）；屏蔽时不行
create or replace function api_thread_dm(p_user uuid) returns uuid language plpgsql security definer set search_path = public as $$
declare u uuid := nbq_me(); a uuid; b uuid; t uuid;
begin
  if p_user = u or not exists (select 1 from users where id = p_user and status not in ('banned','deleted')) then perform nbq_err('not_found'); end if;
  if is_blocked(u, p_user) then perform nbq_err('blocked'); end if;
  a := least(u, p_user); b := greatest(u, p_user);
  select id into t from threads where kind = 'dm' and user_a = a and user_b = b;
  if t is null then insert into threads(kind, user_a, user_b) values ('dm', a, b) returning id into t; end if;
  return t;
end $$;
-- 球局群聊：发起人和已加入的人
create or replace function api_thread_game(p_game uuid) returns uuid language plpgsql security definer set search_path = public as $$
declare u uuid := nbq_me(); t uuid;
begin
  if not (game_host(p_game, u) or game_member(p_game, u)) then perform nbq_err('forbidden'); end if;
  select id into t from threads where kind = 'game' and game_id = p_game;
  if t is null then insert into threads(kind, game_id) values ('game', p_game) returning id into t; end if;
  return t;
end $$;
-- 发消息：只能发文字，不能发链接；对方对我「少遇到」时照常发出、不提醒（由发送通知的任务判断）
-- ---------- 新消息通知（11-04）：收到私信 / 球局群聊消息，推送到手机 ----------
-- chat 通知带 thread_id（点推送直接打开那个会话），不带 game_id（球局开打后聊天还能继续 48 小时，带了会被当成「球局已开打」而不推）。
-- 规则：屏蔽的不通知；对方把我设成「少遇到」不通知（同局开打前 24 小时到结束后 2 小时除外）；同一会话里上一条还没读、且 5 分钟内已通知过 → 不再重复通知；
--       打开会话（thread read）时把这个会话的 chat 通知标成已读（发送程序推送前发现已读就不推）。
alter table notifications add column if not exists thread_id uuid references threads(id) on delete cascade;
create index if not exists notif_chat_idx on notifications(user_id, thread_id, created_at desc);   -- 不加 where kind='chat'：新枚举值在同一事务里不能用（Supabase SQL 编辑器整段是一个事务，报 55P04）
create or replace function nbq_chat_notify(p_thread uuid, p_sender uuid) returns void language plpgsql security definer set search_path = public as $$
declare th threads; r record;
begin
  select * into th from threads where id = p_thread;
  if not found then return; end if;
  for r in
    select case when th.user_a = p_sender then th.user_b else th.user_a end as uid where th.kind = 'dm'
    union
    select gp.user_id from game_participants gp where th.kind = 'game' and gp.game_id = th.game_id and gp.status = 'approved' and gp.user_id <> p_sender
  loop
    continue when r.uid is null or is_blocked(p_sender, r.uid);
    if exists (select 1 from player_prefs where user_id = r.uid and target_id = p_sender and pref = 'less')
       and not exists (select 1 from games g
                         join game_participants a on a.game_id = g.id and a.user_id = p_sender and a.status = 'approved'
                         join game_participants b on b.game_id = g.id and b.user_id = r.uid and b.status = 'approved'
                        where now() between g.starts_at - interval '24 hours' and g.starts_at + make_interval(mins => g.duration_min) + interval '2 hours') then
      continue;
    end if;
    continue when exists (select 1 from notifications where user_id = r.uid and kind = 'chat' and thread_id = p_thread and read_at is null and created_at > now() - interval '5 minutes');
    insert into notifications(user_id, kind, actor_id, thread_id) values (r.uid, 'chat', p_sender, p_thread);
  end loop;
end $$;
revoke execute on function nbq_chat_notify(uuid, uuid) from public;
create or replace function api_chat_notif_read(p_thread uuid) returns void language plpgsql security definer set search_path = public as $$   -- 必须 plpgsql：language sql 建函数时就解析 'chat'，新枚举值同一事务里不能用（55P04）
begin
  update notifications set read_at = now() where user_id = nbq_me() and kind = 'chat' and thread_id = p_thread and read_at is null;
end $$;
revoke execute on function api_chat_notif_read(uuid) from public;
grant execute on function api_chat_notif_read(uuid) to nbq_user;

create or replace function api_message_send(p_thread uuid, p_body text) returns bigint language plpgsql security definer set search_path = public as $$
declare u uuid := nbq_me(); th threads; other uuid; m bigint;
begin
  select * into th from threads where id = p_thread;
  if not found or not thread_member(p_thread, u) then perform nbq_err('forbidden'); end if;
  other := case when th.kind = 'dm' then case when th.user_a = u then th.user_b else th.user_a end end;
  -- 球局群聊在开打 48 小时后关闭（只读）
  if th.kind = 'game' and (select starts_at from games where id = th.game_id) < now() - interval '48 hours' then perform nbq_err('chat_closed'); end if;
  perform nbq_gate('chat', other);
  if other is not null and is_blocked(u, other) then perform nbq_err('blocked'); end if;
  if p_body is null or char_length(btrim(p_body)) = 0 or char_length(p_body) > 200 then perform nbq_err('invalid', 'body'); end if;
  if p_body ~* '(https?://|www\.|[a-z0-9-]+\.(com|net|org|au|cn|io|me|co)(\M|/))' then perform nbq_err('message_link'); end if;
  -- 频率（⑭）：注册 7 天内，主动和没一起打过球的人开始聊天每天 3 位；每分钟 10 条
  if other is not null and not exists (select 1 from messages where thread_id = p_thread)
     and (select created_at from users where id = u) > now() - interval '7 days' and not nbq_played_together(u, other) then
    perform nbq_rate(u::text, 'dm_new', other::text);
  end if;
  perform nbq_rate(u::text, 'message');
  insert into messages(thread_id, sender_id, body) values (p_thread, u, p_body) returning id into m;
  insert into thread_reads(thread_id, user_id, last_read_at) values (p_thread, u, now())
  on conflict (thread_id, user_id) do update set last_read_at = now();
  perform nbq_chat_notify(p_thread, u);   -- 推送给对方 / 同局队友（规则见上）
  return m;
end $$;

-- ---------- 屏蔽 ----------
-- 屏蔽：对方在我球局里待确认的申请自动婉拒（blocked），对方不收到任何通知
create or replace function api_block(p_user uuid) returns void language plpgsql security definer set search_path = public as $$
declare u uuid := nbq_me();
begin
  if p_user = u or not exists (select 1 from users where id = p_user) then perform nbq_err('invalid', 'user'); end if;
  insert into blocks(blocker_id, blocked_id) values (u, p_user) on conflict do nothing;
  update game_participants p set status = 'rejected', decline_reason = 'blocked', decided_at = now()
    from games g where g.id = p.game_id and g.host_id = u and p.user_id = p_user and p.status = 'pending';
end $$;
create or replace function api_unblock(p_user uuid) returns void language plpgsql security definer set search_path = public as $$
begin delete from blocks where blocker_id = nbq_me() and blocked_id = p_user; end $$;

-- ---------- 通知 ----------
-- 标为已读（不传 = 全部）；待处理的（待确认的申请、待回复的邀约）处理完之前保持未读
create or replace function api_notif_read(p_ids bigint[] default null) returns int language plpgsql security definer set search_path = public as $$
declare u uuid := nbq_me(); n int;
begin
  update notifications x set read_at = now()
   where x.user_id = u and x.read_at is null and (p_ids is null or x.id = any(p_ids))
     and not (x.kind = 'request' and exists (select 1 from game_participants p where p.game_id = x.game_id and p.user_id = x.actor_id and p.status = 'pending'))
     and not (x.kind in ('invite','invite_counter') and exists (select 1 from invites i where i.id = x.invite_id and i.status in ('pending','counter') and i.expires_at > now()));
  get diagnostics n = row_count;
  return n;
end $$;

-- ---------- 账号 ----------
-- 本人注销：同封禁的连带处理（§3.11）；本人不收通知；30 天内可恢复，之后由定时任务匿名化
create or replace function api_account_delete() returns jsonb language plpgsql security definer set search_path = public as $$
declare u uuid := nbq_me(); st text; nl int; nc int; r record;
begin
  select status into st from users where id = u;
  if st = 'deleted' then perform nbq_err('state_changed'); end if;
  update game_participants set status = 'withdrawn', left_at = now() where user_id = u and status = 'pending';
  nl := 0;
  for r in select p.game_id, g.host_id from game_participants p join games g on g.id = p.game_id
            where p.user_id = u and p.role = 'player' and p.status = 'approved' and g.status <> 'cancelled' and g.starts_at > now() loop
    update game_participants set status = 'left', left_at = now() where game_id = r.game_id and user_id = u;
    perform nbq_notify(r.host_id, 'player_left', r.game_id, u); nl := nl + 1;
  end loop;
  nc := 0;
  for r in select id from games where host_id = u and status <> 'cancelled' and starts_at > now() loop
    insert into notifications(user_id, kind, game_id, actor_id)
    select user_id, 'game_cancelled', r.id, u from game_participants where game_id = r.id and role = 'player' and status in ('approved','pending');
    update games set status = 'cancelled' where id = r.id; nc := nc + 1;
  end loop;
  update invites set status = 'withdrawn', responded_at = now() where u in (from_user, to_user) and status in ('pending','counter');
  update users set status = 'deleted', status_since = now(), status_until = null, status_reason = 'self_delete' where id = u;
  insert into user_status_log(user_id, from_status, to_status, reason, reason_code, notified) values (u, st, 'deleted', '本人注销', 'self_delete', false);
  return jsonb_build_object('upcoming_left', nl, 'hosted_cancelled', nc);
end $$;
-- 30 天内恢复（之前退出的球局不恢复）
create or replace function api_account_restore() returns void language plpgsql security definer set search_path = public as $$
declare u uuid := nbq_me(); x users;
begin
  select * into x from users where id = u;
  if x.status <> 'deleted' then perform nbq_err('state_changed'); end if;
  if x.status_since < now() - interval '30 days' then perform nbq_err('restore_expired'); end if;
  update users set status = 'active', status_since = now(), status_reason = null where id = u;
  insert into user_status_log(user_id, from_status, to_status, reason, reason_code, notified) values (u, 'deleted', 'active', '本人恢复', 'other', false);
end $$;

revoke execute on function nbq_played_in(uuid, uuid), nbq_set_pref(uuid, uuid, text, uuid) from public;
do $$ declare f record; begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname like 'api\_%' loop
    execute format('revoke execute on function %s from public, anon, authenticated, nbq_viewer', f.sig);
    execute format('grant execute on function %s to nbq_user, nbq_service', f.sig);
  end loop; end $$;

-- =====================================================================
-- ⑫ 定时任务（第四批 4g，2026-10）
--   每个任务一个 job_ 函数，以 nbq_service 身份运行；都可以重复执行（同一时刻跑两次，第二次什么都不做），漏跑几次后补跑也对。
--   都带 p_now 参数（默认 now()），测试可以把时间拨到任意时刻。每次运行记一行 job_runs，后台 / 监控据此报警（第五批 5d）。
--   频率（墨尔本时间）：
--     job_expire_applications   每分钟      申请超时失效（30 分钟内失效的才通知）
--     job_start_checks          每分钟      开打时检查人数（写 game_start_checks）；没凑齐的发 unfilled_end；结束的局标为 completed
--     job_soon_reminders        每分钟      开打前 30 分钟提醒（顺延 / 改时间后按新时间再提醒一次）
--     job_unfilled_reminders    每 5 分钟   开打前 2 小时还缺人 → 提醒发起人一次
--     job_expire_invites        每 15 分钟  邀约 48 小时或过了开打时间失效
--     job_recap_notices         每 10 分钟  结束 1 小时后「打得怎么样」；22:00–08:00 顺延到 8 点；超过 24 小时不再发
--     job_restore_suspended     每 10 分钟  暂停到期自动恢复
--     job_nightly               每天 03:10  汇总最近 3 天（rollup_people）· 注销满 30 天的账号匿名化
--   上线用 pg_cron（Supabase 自带）：本节末尾在装了 pg_cron 的库里自动登记；没装就什么都不做，由外部调度调用同样的函数。
-- =====================================================================
create table if not exists job_runs (
  id bigserial primary key, job text not null, started_at timestamptz not null default clock_timestamp(), finished_at timestamptz,
  rows int, ok boolean, error text
);
create index if not exists job_runs_job on job_runs (job, started_at desc);
alter table job_runs enable row level security;
drop policy if exists svc_all on job_runs; create policy svc_all on job_runs to nbq_service using (true) with check (true);
drop policy if exists adm_read on job_runs; create policy adm_read on job_runs for select to nbq_admin using (true);
grant all on job_runs to nbq_service; grant select on job_runs to nbq_admin; grant usage on sequence job_runs_id_seq to nbq_service;
alter table users add column if not exists anonymized_at timestamptz;   -- 注销满 30 天后匿名化的时间
grant select (anonymized_at) on users to nbq_admin;

create or replace function nbq_job_log(p_job text, p_rows int, p_started timestamptz) returns int language sql security definer set search_path = public as $$
  insert into job_runs(job, started_at, finished_at, rows, ok) values (p_job, p_started, clock_timestamp(), p_rows, true) returning p_rows
$$;

-- 申请超时：失效时间 = least(greatest(申请时间, 开打前 60 分钟) + 15 分钟, 开打)
create or replace function job_expire_applications(p_now timestamptz default now()) returns int language plpgsql security definer set search_path = public as $$
declare t0 timestamptz := clock_timestamp(); n int;
begin
  with x as (
    update game_participants p set status = 'expired', decline_reason = 'timeout', expired_at = application_deadline(p.created_at, g.starts_at), decided_at = application_deadline(p.created_at, g.starts_at)
      from games g
     where g.id = p.game_id and p.status = 'pending' and g.status <> 'cancelled' and p_now >= application_deadline(p.created_at, g.starts_at)
    returning p.user_id, p.game_id, p.expired_at)
  , nt as (insert into notifications(user_id, kind, game_id) select user_id, 'expired', game_id from x where expired_at > p_now - interval '30 minutes' returning 1)
  select count(*) into n from x;
  return nbq_job_log('expire_applications', n, t0);
end $$;

-- 开打后 30 分钟检查人数（11-04：开打后 30 分钟内仍可申请）：每局只写一次；没凑齐的（公开局）给发起人发 unfilled_end；结束了的局标为 completed
create or replace function job_start_checks(p_now timestamptz default now()) returns int language plpgsql security definer set search_path = public as $$
declare t0 timestamptz := clock_timestamp(); n int;
begin
  with g as (select g.* from games g where g.starts_at + interval '30 minutes' <= p_now and g.status in ('open','full')   -- 11-04：开打后 30 分钟（仍可申请的窗口结束）才检查人数 / 撤下
               and not exists (select 1 from game_start_checks c where c.game_id = g.id)
               and not exists (select 1 from game_participants p where p.game_id = g.id and p.status = 'pending')),   -- 还有没处理完的申请：等处理完（或超时）再检查
  s as (select g.id, g.capacity, g.filled + (select count(*) from game_participants p where p.game_id = g.id and p.status = 'approved') as have,
               (select count(*) from game_participants p where p.game_id = g.id and p.role = 'player') as applied,
               (select count(*) from game_participants p where p.game_id = g.id and (p.status = 'pending' or (p.status = 'expired' and p.decline_reason = 'timeout'))) as pend,   -- 有申请没处理（含超时失效的）
               (select count(*) from game_participants p where p.game_id = g.id and p.role = 'player' and p.status = 'rejected') as rej,
               (select count(*) from game_participants p where p.game_id = g.id and p.status = 'left') as lft,
               g.host_id, g.visibility from g),
  ins as (insert into game_start_checks(game_id, checked_at, need, filled, applied_n, pending_n, reason)
          select id, p_now, capacity, have, applied, pend,
                 case when have >= capacity then 'full' when lft > 0 and applied > 0 then 'left_after_full' when applied = 0 then 'no_apply'
                      when pend > 0 then 'not_handled' when rej = applied then 'all_rejected' else 'short_one' end
            from s on conflict (game_id) do nothing returning game_id, filled, need),
  nt as (insert into notifications(user_id, kind, game_id) select s.host_id, 'unfilled_end', s.id from s join ins on ins.game_id = s.id
          where ins.filled < ins.need and s.visibility = 'public' returning 1),
  cl as (update games set unfilled_closed_at = p_now from ins where games.id = ins.game_id and ins.filled < ins.need and games.unfilled_closed_at is null returning 1)
  select count(*) into n from ins;
  update games set status = 'completed' where status in ('open','full') and starts_at + make_interval(mins => duration_min) <= p_now;
  return nbq_job_log('start_checks', n, t0);
end $$;

-- 开打前 30 分钟：发给已确认的人（含发起人）；只有 1 人的局不发；开打前 30 分钟内才加入 / 才发布的不发；顺延 / 改时间后按新时间再提醒一次
create or replace function job_soon_reminders(p_now timestamptz default now()) returns int language plpgsql security definer set search_path = public as $$
declare t0 timestamptz := clock_timestamp(); n int;
begin
  with g as (select g.* from games g where g.status <> 'cancelled' and g.starts_at > p_now and g.starts_at - interval '30 minutes' <= p_now
               and g.created_at < g.starts_at - interval '30 minutes'
               and (select count(*) from game_participants p where p.game_id = g.id and p.status = 'approved') + g.filled >= 2),
  x as (insert into notifications(user_id, kind, game_id, created_at)
        select p.user_id, 'soon', g.id, p_now from g join game_participants p on p.game_id = g.id and p.status = 'approved'
         where (case when p.role = 'host' then g.created_at else coalesce(p.approved_at, p.decided_at, p.created_at) end) < g.starts_at - interval '30 minutes'
           and not exists (select 1 from notifications n where n.user_id = p.user_id and n.kind = 'soon' and n.game_id = g.id
                             and n.created_at >= coalesce(g.time_set_at, g.created_at))
        returning 1)
  select count(*) into n from x;
  return nbq_job_log('soon_reminders', n, t0);
end $$;

-- 开打前 2 小时还缺人：提醒发起人一次（再分享 / 放宽水平 / 顺延 1 小时 / 取消）；距开场不到 2 小时才定下时间的不发
create or replace function job_unfilled_reminders(p_now timestamptz default now()) returns int language plpgsql security definer set search_path = public as $$
declare t0 timestamptz := clock_timestamp(); n int;
begin
  with g as (update games g set unfilled_reminded_at = p_now
              where g.status = 'open' and g.visibility = 'public' and g.unfilled_reminded_at is null and g.starts_at > p_now and g.starts_at - interval '2 hours' <= p_now
                and coalesce(g.time_set_at, g.created_at) < g.starts_at - interval '2 hours'
                and (select count(*) from game_participants p where p.game_id = g.id and p.status = 'approved') + g.filled < g.capacity
             returning g.id, g.host_id),
  x as (insert into notifications(user_id, kind, game_id) select host_id, 'unfilled', id from g returning 1)
  select count(*) into n from x;
  return nbq_job_log('unfilled_reminders', n, t0);
end $$;

-- 邀约失效：48 小时没回复或已过开打时间；通知等待回复的一方（待回复 → 发起人；换了时间待确认 → 接收人）
create or replace function job_expire_invites(p_now timestamptz default now()) returns int language plpgsql security definer set search_path = public as $$
declare t0 timestamptz := clock_timestamp(); n int;
begin
  with x as (update invites i set status = 'expired'
              where i.status in ('pending','counter')
                and (i.expires_at <= p_now or (case when i.status = 'counter' then i.counter_starts_at else i.starts_at end) <= p_now)
             returning i.id, case when i.countered_at is not null and i.counter_starts_at is not null then i.to_user else i.from_user end as waiting, i.from_user, i.to_user),
  nt as (insert into notifications(user_id, kind, invite_id, actor_id) select waiting, 'invite_expired', id, case when waiting = from_user then to_user else from_user end from x returning 1)
  select count(*) into n from x;
  return nbq_job_log('expire_invites', n, t0);
end $$;

-- 赛后提醒：结束 1 小时后发一次；22:00–08:00（墨尔本）不发，到 8 点再发；应发时间过了 24 小时就不再发
create or replace function job_recap_notices(p_now timestamptz default now()) returns int language plpgsql security definer set search_path = public as $$
declare t0 timestamptz := clock_timestamp(); n int := 0;
begin
  -- 夜间不打扰按收提醒的人常用城市的当地时间（cities.quiet_start / quiet_end，默认 22:00–08:00）；到 8 点后发
  with c as (select c.user_id, c.game_id from v_counted_games c join games g on g.id = c.game_id join users u on u.id = c.user_id join cities ct on ct.key = u.home_city
              where not nbq_quiet((p_now at time zone ct.tz)::time, ct.quiet_start, ct.quiet_end)
                and g.starts_at + make_interval(mins => g.duration_min) + interval '1 hour' <= p_now
                and g.starts_at + make_interval(mins => g.duration_min) + interval '1 hour' > p_now - interval '24 hours'
                and not exists (select 1 from notifications x where x.user_id = c.user_id and x.kind = 'recap' and x.game_id = c.game_id)),
  x as (insert into notifications(user_id, kind, game_id, created_at) select user_id, 'recap', game_id, p_now from c returning 1)
  select count(*) into n from x;
  return nbq_job_log('recap_notices', n, t0);
end $$;

-- 暂停到期自动恢复：写状态记录、通知本人
create or replace function job_restore_suspended(p_now timestamptz default now()) returns int language plpgsql security definer set search_path = public as $$
declare t0 timestamptz := clock_timestamp(); n int;
begin
  with x as (update users set status = 'active', status_since = p_now, status_until = null, status_reason = null
              where status = 'suspended' and status_until <= p_now returning id),
  lg as (insert into user_status_log(user_id, from_status, to_status, reason, reason_code) select id, 'suspended', 'active', '到期自动恢复', 'auto_restore' from x returning 1),
  nt as (insert into notifications(user_id, kind) select id, 'account_status' from x returning 1)
  select count(*) into n from x;
  return nbq_job_log('restore_suspended', n, t0);
end $$;

-- 注销满 30 天：去掉能认出本人的信息（手机号、昵称、姓氏首字母、微信、邮箱、头像设置、登录 id），保留球局和统计用的行
create or replace function job_anonymize_deleted(p_now timestamptz default now()) returns int language plpgsql security definer set search_path = public as $$
declare t0 timestamptz := clock_timestamp(); n int;
begin
  update users set phone_e164 = 'deleted:' || id, nickname = '已注销', last_initial = null, wechat_id = null, email = null, auth_id = null,
         avatar_kind = 'letter', avatar_animal = null, card_theme = 'court', anonymized_at = p_now
   where status = 'deleted' and anonymized_at is null and status_since <= p_now - interval '30 days';
  get diagnostics n = row_count;
  delete from identity_links l using users u where u.id = l.user_id and u.anonymized_at = p_now;
  delete from user_devices d using users u where u.id = d.user_id and u.anonymized_at = p_now;
  return nbq_job_log('anonymize_deleted', n, t0);
end $$;

-- 每晚：汇总最近 3 天（兜住离线补传的事件）+ 注销满 30 天的匿名化
create or replace function job_nightly(p_now timestamptz default now()) returns int language plpgsql security definer set search_path = public as $$
declare t0 timestamptz := clock_timestamp(); d date := (p_now at time zone 'Australia/Melbourne')::date; n int := 0;
begin
  for i in 1..3 loop n := n + rollup_people(d - i); end loop;
  perform job_anonymize_deleted(p_now);
  return nbq_job_log('nightly', n, t0);
end $$;

-- 任务只给内部服务调用
do $$ declare f record; begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and (p.proname like 'job\_%' or p.proname = 'nbq_job_log') loop
    execute format('revoke execute on function %s from public, anon, authenticated, nbq_user, nbq_viewer', f.sig);
    execute format('grant execute on function %s to nbq_service', f.sig);
  end loop; end $$;

-- 装了 pg_cron 时自动登记（Supabase：Database → Extensions 打开 pg_cron）；时间是 UTC，取 16:10（墨尔本 03:10 / 02:10；多城市后此时澳洲每个城市都已过当地午夜，最晚的珀斯 00:10，见 ㉑）
do $$ begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    execute $c$select cron.schedule('nbq_expire_applications', '* * * * *', 'select job_expire_applications()')$c$;
    execute $c$select cron.schedule('nbq_start_checks', '* * * * *', 'select job_start_checks()')$c$;
    execute $c$select cron.schedule('nbq_soon_reminders', '* * * * *', 'select job_soon_reminders()')$c$;
    execute $c$select cron.schedule('nbq_unfilled_reminders', '*/5 * * * *', 'select job_unfilled_reminders()')$c$;
    execute $c$select cron.schedule('nbq_expire_invites', '*/15 * * * *', 'select job_expire_invites()')$c$;
    execute $c$select cron.schedule('nbq_recap_notices', '*/10 * * * *', 'select job_recap_notices()')$c$;
    execute $c$select cron.schedule('nbq_restore_suspended', '*/10 * * * *', 'select job_restore_suspended()')$c$;
    execute $c$select cron.schedule('nbq_nightly', '10 16 * * *', 'select job_nightly()')$c$;
  end if; end $$;

-- =====================================================================
-- ⑬ 通知发送（第四批 4h，2026-10）：后端发送程序 server/notify/sender.mjs 读这里
--   · dispatch()（每 15 秒）：pushed_at 为空、到时间（send_after，没有就是 created_at）的通知 → 按路由规则 ①–⑧ 送出 → 写 notification_deliveries → pushed_at
--   · 夜间顺延：send_after = 墨尔本 8:00、deferred = true；8 点到期时同一人合成一条（其余记 merged）
--   · flushEmail()（每分钟）：email_outbox 到期的按 改动 > 结果 > 申请 发出；推不到又没发邮件的通知在这里补记第一去向 none
--   · 推送返回 404 / 410 → 清掉 user_devices 的订阅；退信 / 投诉回调 → users.email_status
-- =====================================================================
alter table notifications add column if not exists send_after timestamptz;          -- 夜间顺延到的时间；为空 = 立即
alter table notifications add column if not exists deferred boolean not null default false;
create index if not exists notifications_due on notifications ((coalesce(send_after, created_at))) where pushed_at is null;

-- =====================================================================
-- ⑭ 频率限制（第五批 5a-1，2026-10）：防刷、防骚扰。数值按「再严格一些」定，上线第一个月（5f）按真实数据回看
--   · rate_rules：每条规则 = 哪类操作、多长时间内、最多几次、超了报哪个错误码；后台可看，改数值只改这张表
--   · rate_hits：每次成功的操作记一条（操作失败整笔回滚，不占次数）；同一人同一类操作加锁排队，同时点也不会超
--   · 超限报错误码，detail = 还要等多少秒（接口层放进 Retry-After 头）；时间窗是滚动的（最近 24 小时，和邀约一致）；发局例外：按墨尔本自然日，0 点清零（day_reset）
--   · 登录验证码在后端调 auth_otp_send / auth_otp_verify（按手机号 + IP），只给内部服务用
-- =====================================================================
create table if not exists rate_rules (
  rule      text primary key,
  grp       text not null,                 -- 操作类别：game_create / apply / message / dm_new / report / nickname / otp_send / otp_ip / otp_fail
  win       interval not null,             -- 时间窗（滚动）
  max_hits  int not null check (max_hits > 0),
  per_key   boolean not null default false,-- true = 按对象分别计（同一局、同一个号码）
  code      text not null,                 -- 超了报的错误码
  enabled   boolean not null default true,
  note      text,
  day_reset boolean not null default false -- true = 按墨尔本自然日算（0 点清零），不是滚动窗口
);
insert into rate_rules(rule, grp, win, max_hits, per_key, code, note) values
 ('game_day',     'game_create', '24 hours',   5, false, 'game_daily_limit',   '发局：每天 5 个（墨尔本自然日，0 点清零）'),
 ('apply_hour',   'apply',       '1 hour',    10, false, 'apply_hourly_limit', '申请 + 直接加入：每小时 10 次'),
 ('apply_day',    'apply',       '24 hours',  30, false, 'apply_daily_limit',  '申请 + 直接加入：每天 30 次'),
 ('apply_same',   'apply',       '24 hours',   3, true,  'apply_same_limit',   '同一局每天最多申请 3 次（撤回后再申请 2 次）'),
 ('msg_minute',   'message',     '1 minute',  10, false, 'message_too_fast',   '消息：每分钟 10 条'),
 ('dm_new_day',   'dm_new',      '24 hours',   3, false, 'dm_new_limit',       '注册 7 天内：每天最多和 3 位没一起打过球的人开始聊天'),
 ('report_day',   'report',      '24 hours',   5, false, 'report_daily_limit', '举报：每天 5 次'),
 ('nick_30d',     'nickname',    '30 days',    2, false, 'nickname_limit',     '改昵称：30 天 2 次（注册 24 小时内不计）'),
 ('otp_gap',      'otp_send',    '60 seconds', 1, true,  'otp_too_fast',       '验证码：同一号码 60 秒 1 次'),
 ('otp_day',      'otp_send',    '24 hours',   5, true,  'otp_daily_limit',    '验证码：同一号码每天 5 次'),
 ('otp_ip_hour',  'otp_ip',      '1 hour',    10, true,  'rate_limited',       '验证码：同一 IP 每小时 10 次'),
 ('otp_fail',     'otp_fail',    '30 minutes', 5, true,  'otp_locked',         '验证码连错 5 次：锁 30 分钟')
on conflict (rule) do nothing;
-- 进行中的球局上限不按时间窗算，单独检查（api_game_create）：最多 5 个
create table if not exists rate_hits (
  id      bigserial primary key,
  subject text not null,                   -- 用户 id；验证码用 phone:+614… / ip:…
  grp     text not null,
  key     text,                            -- per_key 规则的对象（球局 id、号码）
  at      timestamptz not null default now()
);
create index if not exists rate_hits_q on rate_hits (subject, grp, at desc);
create index if not exists rate_hits_at on rate_hits (at);
alter table rate_rules enable row level security; alter table rate_hits enable row level security;
drop policy if exists svc_all on rate_rules; create policy svc_all on rate_rules to nbq_service using (true) with check (true);
drop policy if exists svc_all on rate_hits;  create policy svc_all on rate_hits  to nbq_service using (true) with check (true);
drop policy if exists adm_read on rate_rules; create policy adm_read on rate_rules for select to nbq_admin using (true);
drop policy if exists adm_read on rate_hits;  create policy adm_read on rate_hits  for select to nbq_admin using (true);
grant all on rate_rules, rate_hits to nbq_service; grant select on rate_rules, rate_hits to nbq_admin; grant usage on sequence rate_hits_id_seq to nbq_service;

-- 检查并记一次。超了 → 报规则的错误码，detail = 还要等的秒数
create or replace function nbq_rate(p_subject text, p_grp text, p_key text default null) returns void
language plpgsql security definer set search_path = public as $$
declare r record; n int; t timestamptz; ws timestamptz;
begin
  perform pg_advisory_xact_lock(hashtext('rate:' || p_subject || ':' || p_grp));
  for r in select * from rate_rules where grp = p_grp and enabled order by win loop
    ws := case when r.day_reset then greatest(now() - r.win, mel_day_start(mel_today())) else now() - r.win end;
    select count(*) into n from rate_hits h where h.subject = p_subject and h.grp = p_grp and h.at > ws and (not r.per_key or h.key is not distinct from p_key);
    if n >= r.max_hits then
      if r.day_reset then perform nbq_err(r.code, greatest(1, ceil(extract(epoch from mel_day_start(mel_today() + 1) - now())))::int::text); end if;
      select h.at into t from rate_hits h where h.subject = p_subject and h.grp = p_grp and h.at > ws and (not r.per_key or h.key is not distinct from p_key)
       order by h.at offset n - r.max_hits limit 1;
      perform nbq_err(r.code, greatest(1, ceil(extract(epoch from t + r.win - now())))::int::text);
    end if;
  end loop;
  insert into rate_hits(subject, grp, key) values (p_subject, p_grp, p_key);
end $$;
update rate_rules set day_reset = true where rule = 'game_day';   -- 发局：按墨尔本自然日

-- 举报：每天 5 次（同一对象未处理时重复举报由 reports_one_open 拦下，报 report_duplicate，不占次数）
create or replace function reports_rate() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if current_setting('role') = 'nbq_user' then perform nbq_rate(new.reporter_id::text, 'report'); end if;
  return new;
end $$;
drop trigger if exists trg_reports_rate on reports;
create trigger trg_reports_rate before insert on reports for each row execute function reports_rate();

-- 改昵称：30 天 2 次；注册 24 小时内（填资料阶段）和后台改的不计
create or replace function users_nickname_rate() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.nickname is distinct from old.nickname and current_setting('role') = 'nbq_user' and old.created_at < now() - interval '24 hours' then
    perform nbq_rate(old.id::text, 'nickname');
  end if;
  return new;
end $$;
drop trigger if exists trg_users_nickname_rate on users;
create trigger trg_users_nickname_rate before update of nickname on users for each row execute function users_nickname_rate();

-- 登录验证码（后端调用，nbq_service）：发之前检查号码格式和次数；成功返回 void，超了报 otp_too_fast / otp_daily_limit / rate_limited / otp_locked
create or replace function auth_otp_send(p_phone text, p_ip text) returns void language plpgsql security definer set search_path = public as $$
begin
  if p_phone is null or p_phone !~ '^\+614[0-9]{8}$' then perform nbq_err('invalid', 'phone'); end if;
  if exists (select 1 from rate_rules r where r.rule = 'otp_fail' and r.enabled and (select count(*) from rate_hits h where h.subject = 'phone:' || p_phone and h.grp = 'otp_fail' and h.at > now() - r.win) >= r.max_hits) then
    perform nbq_rate('phone:' || p_phone, 'otp_fail', p_phone);   -- 锁定中：报 otp_locked 和剩余秒数
  end if;
  perform nbq_rate('ip:' || coalesce(p_ip, '?'), 'otp_ip', p_ip);
  perform nbq_rate('phone:' || p_phone, 'otp_send', p_phone);
end $$;
-- 校验：p_ok 为空 = 校验前检查是否锁定；false = 记一次错误；true = 清掉错误记录
create or replace function auth_otp_verify(p_phone text, p_ip text, p_ok boolean default null) returns void language plpgsql security definer set search_path = public as $$
declare lim int; w interval;
begin
  select max_hits, win into lim, w from rate_rules where rule = 'otp_fail' and enabled;
  if lim is null then return; end if;
  if p_ok is null then
    if (select count(*) from rate_hits where subject = 'phone:' || p_phone and grp = 'otp_fail' and at > now() - w) >= lim then perform nbq_rate('phone:' || p_phone, 'otp_fail', p_phone); end if;
  elsif p_ok then delete from rate_hits where subject = 'phone:' || p_phone and grp = 'otp_fail';
  else insert into rate_hits(subject, grp, key) values ('phone:' || p_phone, 'otp_fail', p_phone);
  end if;
end $$;
revoke execute on function nbq_rate(text, text, text), reports_rate(), users_nickname_rate() from public;
revoke execute on function auth_otp_send(text, text), auth_otp_verify(text, text, boolean) from public, nbq_user, nbq_viewer, nbq_admin;
grant execute on function auth_otp_send(text, text), auth_otp_verify(text, text, boolean) to nbq_service;

-- 每晚清理：计数记录保留 31 天（最长的时间窗 30 天）；IP 记录随之删除
create or replace function job_nightly(p_now timestamptz default now()) returns int language plpgsql security definer set search_path = public as $$
declare t0 timestamptz := clock_timestamp(); d date := (p_now at time zone 'Australia/Melbourne')::date; n int := 0;
begin
  for i in 1..3 loop n := n + rollup_people(d - i); end loop;
  perform job_anonymize_deleted(p_now);
  delete from rate_hits where at < p_now - interval '31 days';
  return nbq_job_log('nightly', n, t0);
end $$;

-- =====================================================================
-- ⑮ 滥用识别（第五批 5a-2，2026-10）：风险规则真正在数据库里算；新增 5 条信号；昵称规则
--   · risk_rules 是唯一口径（后台「安全」页的规则表与它逐条相同）：权重 · 阈值 · 时间窗；风险分 = 满足的规则权重之和
--     分数 < 30 低 · 30–59 观察 · ≥ 60 高；只是「需要人看一下」，处理由运营决定（不自动处罚）
--   · job_risk_scores()（每小时）：逐人算每条规则 → user_risk（汇总）+ risk_alerts（每条规则一条未处理提醒，重算时更新）；
--     观察期满的提醒回到待处理
--   · risk_events：别的表算不出的信号（不存消息内容）。成功的操作在数据库里直接记；被拒的操作整笔回滚，
--     由后端收到错误码后另开事务调 risk_log_rejected() 记（message_link → 发链接、women_only → 试女生局、各种频率上限 → 触发频率限制）
--   · 新信号：同一设备注册多个号 · 同一 IP 一天注册 3 个以上（同一家人 2 个号不报）· 新号私信里留联系方式（不拦，只记）·
--     申请后反复撤回 · 反复触发频率限制
-- =====================================================================
alter table users add column if not exists signup_device text;   -- 注册时设备的匿名 id（identity_links 里的 anon_id）
alter table users add column if not exists signup_ip text;       -- 注册时的 IP；30 天后由每晚任务清空
create index if not exists users_signup_device on users(signup_device) where signup_device is not null;
create index if not exists users_signup_ip on users(signup_ip) where signup_ip is not null;

create table if not exists risk_events (
  id      bigserial primary key,
  user_id uuid not null references users(id) on delete cascade,
  kind    text not null check (kind in ('women_probe','link_attempt','contact_lure','apply_withdraw','rate_hit','buddy_ignored')),   -- buddy_ignored：加球友申请被忽略，ref = 忽略的人（#110）
  ref     text,                                   -- 相关对象：球局 id / 对方 id / 错误码（不存内容）
  at      timestamptz not null default now()
);
create index if not exists risk_events_q on risk_events(user_id, kind, at desc);
create index if not exists risk_events_at on risk_events(at);
alter table risk_events enable row level security;
drop policy if exists svc_all on risk_events; create policy svc_all on risk_events to nbq_service using (true) with check (true);
drop policy if exists adm_read on risk_events; create policy adm_read on risk_events for select to nbq_admin using (true);
grant all on risk_events to nbq_service; grant select on risk_events to nbq_admin; grant usage on sequence risk_events_id_seq to nbq_service;

-- 规则表：与后台逐条相同（名称、权重、阈值、时间窗）
-- 名称用后台显示的短名称（完整口径见各规则的计算和 §3.9）
update risk_rules set name = '确认爽约' where code = 'no_show';
update risk_rules set name = '参加者 24 小时内退出' where code = 'late_leave';
update risk_rules set name = '发起人临时取消' where code = 'host_late_cancel';
update risk_rules set name = '被不同的人举报' where code = 'reported';
update risk_rules set name = '违反球友约定' where code = 'pact_violation';
update risk_rules set name = '被多人标少遇到' where code = 'less_marked';
update risk_rules set name = '30 天内邀约被婉拒' where code = 'invite_declined';
update risk_rules set name = '被多人屏蔽' where code = 'blocked_by';
update risk_rules set name = '被婉拒后仍高频申请' where code = 'declined_streak';
update risk_rules set name = '注册 30 天内男生改为女生' where code = 'gender_flip';
update risk_rules set name = '新账号 24 小时内私信很多人', threshold = 5, window_days = 1 where code = 'dm_burst';
update risk_rules set name = '反复尝试发链接' where code = 'link_spam';
update risk_rules set name = '未确认性别反复试女生局' where code = 'women_probe';
update risk_rules set window_days = 180 where code = 'pact_violation';
insert into risk_rules (code, name, weight, threshold, window_days, enabled) values
 ('same_device',  '同一设备注册多个账号',             15, 2, 30, true),
 ('same_ip',      '同一网络一天注册 3 个以上账号',     10, 3, 1,  true),
 ('contact_lure', '新账号私信里留联系方式（≥2 人）',   15, 2, 7,  true),
 ('apply_churn',  '申请后反复撤回',                   10, 6, 7,  true),
 ('rate_hit',     '反复触发频率限制',                 10, 5, 1,  true)
on conflict (code) do update set name = excluded.name, weight = excluded.weight, threshold = excluded.threshold, window_days = excluded.window_days, enabled = excluded.enabled;

-- 后端记被拒的操作（只给内部服务）：返回记成了哪类信号，不需要记的返回空
create or replace function risk_log_rejected(p_user uuid, p_code text, p_ref text default null) returns text
language plpgsql security definer set search_path = public as $$
declare k text := case
  when p_code = 'message_link' then 'link_attempt'
  when p_code = 'women_only' then 'women_probe'
  when p_code in (select code from rate_rules) or p_code in ('invite_daily_limit','invite_new_limit','game_open_limit') then 'rate_hit' end;
begin
  if k is null or p_user is null or not exists (select 1 from users where id = p_user) then return null; end if;
  insert into risk_events(user_id, kind, ref) values (p_user, k, coalesce(p_ref, p_code));
  return k;
end $$;

-- 留联系方式（手机号、微信、WhatsApp 等说法）：只用于新号私信记信号和昵称检查，不拦消息
create or replace function nbq_has_contact(p text) returns boolean language sql immutable as $$
  select regexp_replace(coalesce(p, ''), '[\s\-.()]', '', 'g') ~ '[0-9０-９]{8,}'
      or coalesce(p, '') ~* '(微信|威信|薇信|v信|vx|wx号|wxid|weixin|wechat|加v|加微|whatsapp|telegram|line ?id|qq|扣扣)'
$$;
-- 昵称：返回不允许的原因，空 = 可以
create or replace function nbq_nickname_problem(p text) returns text language sql immutable as $$
  select case
    when p ~ '[\u0001-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2060-\u2064\uFEFF]' then 'invisible'
    when p ~* '(https?://|www\.|[a-z0-9-]+\.(com|net|org|au|cn|io|me|co)(?![a-z]))' then 'link'
    when nbq_has_contact(p) then 'contact'
    when p ~* '(官方|南伴球|客服|管理员|系统|admin|official|support|staff)' then 'impersonate'
    when p ~ '(.)\1{4,}' then 'repeat'
  end
$$;
create or replace function users_nickname_check() returns trigger language plpgsql security definer set search_path = public as $$
declare why text;
begin
  if current_setting('role') = 'nbq_user' and (tg_op = 'INSERT' or new.nickname is distinct from old.nickname) then
    why := nbq_nickname_problem(new.nickname);
    if why is not null then perform nbq_err('nickname_not_allowed', why); end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_users_nickname_check on users;
create trigger trg_users_nickname_check before insert or update of nickname on users for each row execute function users_nickname_check();
-- 接口层注册新号码时（服务身份插入，触发器只管前台身份）要先查同一套昵称规则
grant execute on function nbq_nickname_problem(text), nbq_has_contact(text) to nbq_service;

-- 新号私信留联系方式 → 记信号（消息照常发出）；申请中撤回 → 记信号
create or replace function messages_risk() returns trigger language plpgsql security definer set search_path = public as $$
declare th threads; other uuid;
begin
  select * into th from threads where id = new.thread_id;
  if th.kind = 'dm' and nbq_has_contact(new.body) and (select created_at from users where id = new.sender_id) > now() - interval '7 days' then
    other := case when th.user_a = new.sender_id then th.user_b else th.user_a end;
    insert into risk_events(user_id, kind, ref) values (new.sender_id, 'contact_lure', other::text);
  end if;
  return null;
end $$;
drop trigger if exists trg_messages_risk on messages;
create trigger trg_messages_risk after insert on messages for each row execute function messages_risk();
create or replace function gp_withdraw_risk() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.status = 'pending' and new.status = 'withdrawn' then insert into risk_events(user_id, kind, ref) values (new.user_id, 'apply_withdraw', new.game_id::text); end if;
  return null;
end $$;
drop trigger if exists trg_gp_withdraw_risk on game_participants;
create trigger trg_gp_withdraw_risk after update of status on game_participants for each row execute function gp_withdraw_risk();

-- 每条规则逐人的当前值（窗口 = risk_rules.window_days；p_now 方便测试拨时间）
create or replace function risk_values(p_now timestamptz default now()) returns table(user_id uuid, code text, value numeric)
language sql stable security definer set search_path = public as $$
  with w as (select r.code, p_now - make_interval(days => r.window_days) as t from risk_rules r where r.enabled),
  ev as (select e.user_id, e.kind, e.ref, e.at from risk_events e where e.at > p_now - interval '31 days' and e.at <= p_now),
  v as (
    select n.user_id, 'no_show' c, count(*)::numeric v from v_confirmed_noshow n, w where w.code = 'no_show' and n.starts_at > w.t and n.starts_at <= p_now group by 1
    union all
    select p.user_id, 'late_leave', count(*) from game_participants p join games g on g.id = p.game_id, w
     where w.code = 'late_leave' and p.status = 'left' and coalesce(p.change_ack, '') <> 'out' and p.left_at > w.t and p.left_at <= p_now
       and p.left_at - coalesce(p.approved_at, p.decided_at, p.created_at) > interval '10 minutes' and g.starts_at - p.left_at <= interval '24 hours' group by 1
    union all
    select g.host_id, 'host_late_cancel', count(*) from games g, w
     where w.code = 'host_late_cancel' and g.status = 'cancelled' and g.cancelled_at > w.t and g.cancelled_at <= p_now and g.starts_at - g.cancelled_at <= interval '24 hours'
       and exists (select 1 from game_participants x where x.game_id = g.id and x.role = 'player' and x.approved_at < g.cancelled_at) group by 1
    union all
    select r.target_id::uuid, 'reported', count(distinct r.reporter_id) from reports r, w
     where w.code = 'reported' and r.target_type = 'user' and r.created_at > w.t and r.created_at <= p_now group by 1
    union all
    select r.target_id::uuid, 'pact_violation', count(*) from reports r, w
     where w.code = 'pact_violation' and r.target_type = 'user' and r.reason = 'pact_violation' and r.status = 'actioned' and r.created_at > w.t and r.created_at <= p_now group by 1
    union all
    select b.blocked_id, 'blocked_by', count(distinct b.blocker_id) from blocks b, w where w.code = 'blocked_by' and b.created_at > w.t and b.created_at <= p_now group by 1
    union all
    select pp.target_id, 'less_marked', count(distinct pp.user_id) from player_prefs pp, w where w.code = 'less_marked' and pp.pref = 'less' and pp.updated_at > w.t and pp.updated_at <= p_now group by 1
    union all
    select x.from_user, 'invite_declined', max(x.n) from (select i.from_user, i.to_user, count(*) n from invites i, w
       where w.code = 'invite_declined' and i.status = 'declined' and i.responded_at > w.t and i.responded_at <= p_now group by 1, 2) x group by 1
    union all
    select p.user_id, 'declined_streak', count(*) from game_participants p, w
     where w.code = 'declined_streak' and p.role = 'player' and p.created_at > w.t and p.created_at <= p_now
       and exists (select 1 from game_participants y where y.user_id = p.user_id and y.status = 'rejected' and y.decline_reason in ('known','level','pass') and y.decided_at > w.t) group by 1
    union all
    select e.user_id, 'women_probe', count(*) from ev e, w where w.code = 'women_probe' and e.kind = 'women_probe' and e.at > w.t group by 1
    union all
    select gc.user_id, 'gender_flip', count(*) from gender_changes gc join users u on u.id = gc.user_id, w
     where w.code = 'gender_flip' and gc.from_g = 'm' and gc.to_g = 'f' and gc.created_at > w.t and gc.created_at <= p_now and gc.created_at - u.created_at <= interval '30 days' group by 1
    union all
    select m.sender_id, 'dm_burst', count(distinct m.thread_id) from messages m join threads t on t.id = m.thread_id and t.kind = 'dm' join users u on u.id = m.sender_id, w
     where w.code = 'dm_burst' and m.created_at > w.t and m.created_at <= p_now and u.created_at > p_now - interval '7 days' group by 1
    union all
    select e.user_id, 'link_spam', count(*) from ev e, w where w.code = 'link_spam' and e.kind = 'link_attempt' and e.at > w.t group by 1
    union all
    select u.id, 'same_device', count(*) from users u join users o on o.signup_device = u.signup_device, w
     where w.code = 'same_device' and u.created_at > w.t and o.created_at > w.t and o.created_at <= p_now and u.created_at <= p_now group by 1
    union all
    select u.id, 'same_ip', count(*) from users u join users o on o.signup_ip = u.signup_ip, w
     where w.code = 'same_ip' and u.created_at > w.t and o.created_at > w.t and o.created_at <= p_now and u.created_at <= p_now group by 1
    union all
    select e.user_id, 'contact_lure', count(distinct e.ref) from ev e, w where w.code = 'contact_lure' and e.kind = 'contact_lure' and e.at > w.t group by 1
    union all
    select e.user_id, 'apply_churn', count(*) from ev e, w where w.code = 'apply_churn' and e.kind = 'apply_withdraw' and e.at > w.t group by 1
    union all
    select e.user_id, 'rate_hit', count(*) from ev e, w where w.code = 'rate_hit' and e.kind = 'rate_hit' and e.at > w.t group by 1
    union all
    select e.user_id, 'buddy_ignored', count(distinct e.ref) from ev e, w where w.code = 'buddy_ignored' and e.kind = 'buddy_ignored' and e.at > w.t group by 1
  )
  select v.user_id, v.c, v.v from v join users u on u.id = v.user_id where u.status <> 'deleted'
$$;

-- 每小时：汇总分数 + 提醒（同一人同一规则只有一条未处理的提醒，重算时更新它；处理过的只有变多了才新开）
create or replace function job_risk_scores(p_now timestamptz default now()) returns int language plpgsql security definer set search_path = public as $$
declare t0 timestamptz := clock_timestamp(); n int;
begin
  create temp table _rv on commit drop as
    select v.user_id, v.code, v.value, r.weight, r.window_days from risk_values(p_now) v join risk_rules r on r.code = v.code where v.value >= r.threshold;
  -- 提醒：已有未处理 / 观察中的更新数值；没有的新开一条
  update risk_alerts a set value = x.value, score = x.weight, window_to = p_now
    from _rv x where a.user_id = x.user_id and a.rule_code = x.code and a.status in ('open','watching');
  insert into risk_alerts(user_id, rule_code, value, score, window_from, window_to, suggested)
  select x.user_id, x.code, x.value, x.weight, p_now - make_interval(days => x.window_days), p_now, case when x.code = 'no_show' then 'suspended' end
    from _rv x where not exists (select 1 from risk_alerts a where a.user_id = x.user_id and a.rule_code = x.code
       and (a.status in ('open','watching')
            -- 处理过 / 忽略过、时间窗内没有变多的不再打扰；变多了才新开
            or (a.status in ('handled','ignored') and coalesce(a.handled_at, a.created_at) > p_now - make_interval(days => x.window_days) and a.value >= x.value)));
  -- 观察期满 → 回到待处理
  update risk_alerts set status = 'open', watch_until = null where status = 'watching' and watch_until <= p_now;
  update user_risk set status = 'open', watch_until = null where status = 'watching' and watch_until <= p_now;
  -- 汇总：满足规则的人写分数；之前有分、现在没有的归零（保留处理记录）
  insert into user_risk(user_id, score, level, signals, suggested, updated_at)
  select s.user_id, s.score, case when s.score >= 60 then 'high' when s.score >= 30 then 'watch' else 'low' end, s.sig,
         case when s.ns then 'suspended' when s.score >= 60 then 'review' when s.score >= 30 then 'watch' end, p_now
    from (select user_id, sum(weight)::int score, jsonb_object_agg(code, value) sig, bool_or(code = 'no_show') ns from _rv group by 1) s
  on conflict (user_id) do update set score = excluded.score, level = excluded.level, signals = excluded.signals, suggested = excluded.suggested, updated_at = p_now;
  update user_risk ur set score = 0, level = 'low', signals = '{}', suggested = null, updated_at = p_now
   where ur.score > 0 and not exists (select 1 from _rv x where x.user_id = ur.user_id);
  select count(distinct user_id) into n from _rv;
  return nbq_job_log('risk_scores', n, t0);
end $$;

-- 每晚：计数、风险信号保留期；注册 IP 30 天后清空
create or replace function job_nightly(p_now timestamptz default now()) returns int language plpgsql security definer set search_path = public as $$
declare t0 timestamptz := clock_timestamp(); d date := (p_now at time zone 'Australia/Melbourne')::date; n int := 0;
begin
  for i in 1..3 loop n := n + rollup_people(d - i); end loop;
  perform job_anonymize_deleted(p_now);
  delete from rate_hits where at < p_now - interval '31 days';
  delete from risk_events where at < p_now - interval '90 days';
  update users set signup_ip = null where signup_ip is not null and created_at < p_now - interval '30 days';
  return nbq_job_log('nightly', n, t0);
end $$;

revoke execute on function risk_log_rejected(uuid, text, text), risk_values(timestamptz), job_risk_scores(timestamptz), job_nightly(timestamptz) from public, nbq_user, nbq_viewer;
grant execute on function risk_log_rejected(uuid, text, text), job_risk_scores(timestamptz), job_nightly(timestamptz) to nbq_service;
grant execute on function risk_values(timestamptz) to nbq_service, nbq_admin;
do $$ begin if exists (select 1 from pg_extension where extname = 'pg_cron') then
  execute $c$select cron.schedule('nbq_risk_scores', '7 * * * *', 'select job_risk_scores()')$c$;
end if; end $$;

-- =====================================================================
-- ⑯ 隐私（第五批 5b-2，2026-10）：同意记录与 18 岁确认 · 下载我的数据 · 保存期限 · 注销匿名化补漏 · 关闭「使用数据」补漏
--   依据：隐私清单.md（§1 数据清单、§2 保存期限、§8 缺口）
-- =====================================================================
-- ① 用户协议 / 隐私政策版本：改版时插入新版本；前台发现本人同意的版本低于当前版本 → 弹出更新说明请重新同意
create table if not exists legal_docs (
  kind         text not null check (kind in ('terms','privacy')),
  version      smallint not null,
  published_at timestamptz not null default now(),
  summary      text not null,                 -- 这一版改了什么（重新同意时给用户看）
  primary key (kind, version)
);
insert into legal_docs(kind, version, summary) values
 ('terms', 1, '首版用户协议'), ('privacy', 1, '首版隐私政策')
on conflict do nothing;
alter table legal_docs enable row level security;
drop policy if exists ld_read on legal_docs; create policy ld_read on legal_docs for select to nbq_user, nbq_admin, nbq_viewer using (true);
drop policy if exists svc_all on legal_docs; create policy svc_all on legal_docs to nbq_service using (true) with check (true);
grant select on legal_docs to nbq_user, nbq_admin, nbq_viewer; grant all on legal_docs to nbq_service;

alter table users add column if not exists adult_confirmed_at timestamptz;   -- 注册时勾选「我已满 18 岁」
alter table users add column if not exists terms_version smallint;
alter table users add column if not exists terms_accepted_at timestamptz;
alter table users add column if not exists privacy_version smallint;
alter table users add column if not exists privacy_accepted_at timestamptz;
grant select (adult_confirmed_at, terms_version, terms_accepted_at, privacy_version, privacy_accepted_at) on users to nbq_user, nbq_admin;

-- 同意当前版本（注册时由后端带 adult = true 调用；改版后前台请用户重新同意）
create or replace function api_consent_accept(p_adult boolean default null) returns jsonb language plpgsql security definer set search_path = public as $$
declare u uuid := nbq_me(); tv smallint := (select max(version) from legal_docs where kind = 'terms'); pv smallint := (select max(version) from legal_docs where kind = 'privacy');
begin
  if (select adult_confirmed_at from users where id = u) is null and p_adult is not true then perform nbq_err('adult_required'); end if;
  update users set adult_confirmed_at = coalesce(adult_confirmed_at, now()),
         terms_version = tv, terms_accepted_at = now(), privacy_version = pv, privacy_accepted_at = now() where id = u;
  return jsonb_build_object('terms', tv, 'privacy', pv);
end $$;
-- 本人是否需要（重新）同意
create or replace function api_consent_state() returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'adult', u.adult_confirmed_at is not null,
    'terms', coalesce(u.terms_version, 0), 'terms_current', (select max(version) from legal_docs where kind = 'terms'),
    'privacy', coalesce(u.privacy_version, 0), 'privacy_current', (select max(version) from legal_docs where kind = 'privacy'),
    'need', u.adult_confirmed_at is null or coalesce(u.terms_version, 0) < (select max(version) from legal_docs where kind = 'terms')
            or coalesce(u.privacy_version, 0) < (select max(version) from legal_docs where kind = 'privacy'))
  from users u where u.id = nbq_me()
$$;

-- ② 下载我的数据（隐私原则 12）：本人在南伴球的全部个人信息，JSON。
--   不含：别人对我「少遇到 / 多遇到」、谁举报 / 反馈了我、风险分（内部安全记录）、登录 id、退订 token
--   别人发给我的消息：只含我所在对话里、没被隐藏的；收到的印象 / 好评只给数量。每天 1 次（rate_rules: export_day）
--   场边（S2c）：自己的发布 / 回复 / 点过的网球 / 不感兴趣 / 发起的话题 / 浏览数；不含后台隐藏原因、照片识别标签
insert into rate_rules(rule, grp, win, max_hits, per_key, code, note) values ('export_day', 'export', '24 hours', 1, false, 'rate_limited', '下载我的数据：每天 1 次')
on conflict (rule) do nothing;
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

-- ③ 关闭「使用数据」：会话、分享链接打开记录也不写（events 已有）
create or replace function analytics_drop_opted_out() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.user_id is not null and exists (select 1 from users u where u.id = new.user_id and u.analytics_opt_out) then return null; end if;
  return new;
end $$;
drop trigger if exists trg_sessions_opt_out on sessions;
create trigger trg_sessions_opt_out before insert on sessions for each row execute function analytics_drop_opted_out();
drop trigger if exists trg_link_visits_opt_out on link_visits;
create trigger trg_link_visits_opt_out before insert on link_visits for each row execute function analytics_drop_opted_out();
-- 关闭时：已写的会话里去掉账号关联（事件保留为匿名统计）
create or replace function users_opt_out_detach() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.analytics_opt_out and not coalesce(old.analytics_opt_out, false) then
    update sessions set user_id = null where user_id = new.id;
    update link_visits set user_id = null where user_id = new.id;
    update events set user_id = null where user_id = new.id;
  end if;
  return null;
end $$;
drop trigger if exists trg_users_opt_out_detach on users;
create trigger trg_users_opt_out_detach after update of analytics_opt_out on users for each row execute function users_opt_out_detach();

-- ④ 注销满 30 天匿名化：补上性别、注册设备 / IP、退订 token、待发邮件里的邮箱、旧推送订阅、本人设的偏好（少遇到 / 多遇到，只有本人可见）、我的球拍（11-07 迁移 20261107_wipe_rackets）
--   保留：球局记录、聊天（显示「已注销」）、给别人 / 收到的印象和好评（计入汇总，本来就不显示是谁给的）
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
  delete from user_rackets r using users u where u.id = r.user_id and u.anonymized_at = p_now;   -- 我的球拍（#60 A2）：注销即删，不保留
  delete from buddies b using users u where u.anonymized_at = p_now and u.id in (b.user_a, b.user_b);   -- 球友（#110）：注销即删，对方那边也随之消失
  delete from buddy_requests r using users u where u.anonymized_at = p_now and u.id in (r.from_user, r.to_user);
  update email_outbox e set to_email = 'deleted', status = case when e.status = 'queued' then 'skipped' else e.status end,
         skip_reason = case when e.status = 'queued' then 'email_bad' else e.skip_reason end
    from users u where u.id = e.user_id and u.anonymized_at = p_now;
  return nbq_job_log('anonymize_deleted', n, t0);
end $$;

-- ⑤ 保存期限（每晚）：原始事件 / 会话 / 分享打开 25 个月；通知 12 个月；补发邮件记录 90 天；已处理举报的说明 2 年；后台操作日志 2 年
create or replace function audit_append_only() returns trigger language plpgsql as $$
begin
  -- 只有保存期限任务能删 2 年前的日志；其他任何修改、删除都拒绝
  if tg_op = 'DELETE' and current_setting('nbq.retention', true) = 'on' and old.at < now() - interval '2 years' then return old; end if;
  raise exception 'admin_audit_log_append_only' using errcode = 'P0001';
end $$;
create or replace function job_retention(p_now timestamptz default now()) returns int language plpgsql security definer set search_path = public as $$
declare t0 timestamptz := clock_timestamp(); n int := 0; k int;
begin
  delete from events where occurred_at < p_now - interval '25 months'; get diagnostics k = row_count; n := n + k;
  delete from sessions where started_at < p_now - interval '25 months'; get diagnostics k = row_count; n := n + k;
  delete from link_visits where created_at < p_now - interval '25 months'; get diagnostics k = row_count; n := n + k;
  delete from notifications where created_at < p_now - interval '12 months'; get diagnostics k = row_count; n := n + k;
  delete from email_outbox where status <> 'queued' and coalesce(sent_at, created_at) < p_now - interval '90 days'; get diagnostics k = row_count; n := n + k;
  update reports set note = '（已过保存期限，说明已删除）' where status <> 'open' and handled_at < p_now - interval '2 years' and note is not null and note <> '（已过保存期限，说明已删除）';
  get diagnostics k = row_count; n := n + k;
  perform set_config('nbq.retention', 'on', true);
  delete from admin_audit_log where at < p_now - interval '2 years'; get diagnostics k = row_count; n := n + k;
  perform set_config('nbq.retention', 'off', true);
  return nbq_job_log('retention', n, t0);
end $$;
create or replace function job_nightly(p_now timestamptz default now()) returns int language plpgsql security definer set search_path = public as $$
declare t0 timestamptz := clock_timestamp(); d date := (p_now at time zone 'Australia/Melbourne')::date; n int := 0;
begin
  for i in 1..3 loop n := n + rollup_people(d - i); end loop;
  perform job_anonymize_deleted(p_now);
  perform job_retention(p_now);
  delete from rate_hits where at < p_now - interval '31 days';
  delete from risk_events where at < p_now - interval '90 days';
  update users set signup_ip = null where signup_ip is not null and created_at < p_now - interval '30 days';
  return nbq_job_log('nightly', n, t0);
end $$;

revoke execute on function api_consent_accept(boolean), api_consent_state(), api_export_me() from public, nbq_viewer;
grant execute on function api_consent_accept(boolean), api_consent_state(), api_export_me() to nbq_user, nbq_service;
revoke execute on function job_retention(timestamptz), job_anonymize_deleted(timestamptz), job_nightly(timestamptz) from public, nbq_user, nbq_viewer;
grant execute on function job_retention(timestamptz), job_anonymize_deleted(timestamptz), job_nightly(timestamptz) to nbq_service;

-- =====================================================================
-- ⑰ 后台管理员（第五批 5c，2026-10）：登录与会话 · 角色权限表 · 敏感操作必须填理由并留痕 · 后台不再直接读私信
--   · 登录：邮箱 + 密码（scrypt）+ 两步验证（TOTP，同一个码不能用两次）或一次性恢复码；连错 5 次锁 15 分钟；
--     会话 12 小时、闲置 1 小时退出；后端只存会话令牌的 sha256。密码 / TOTP 的计算在 server/admin/auth.mjs，数据库管次数、锁定、会话
--   · 角色：owner（你 + 1 位备用，至少保留 1 位、建议 2 位）/ operator 运营 / viewer 只读。
--     owner、operator 以 nbq_admin 连接，viewer 以 nbq_viewer；后端在事务里 set_config('nbq.admin', 管理员 id)
--   · 所有写操作都走下面的 admin_ 函数：查权限表 → 需要理由的检查理由 → 做事 → 写操作日志（同一个事务）。nbq_admin 不再能直接改表
--   · 私信：后台不能直接读 messages；只能在处理举报时用 admin_report_messages() 看被举报的那段对话（要填理由、留痕）
-- =====================================================================
alter table admin_users add column if not exists created_at timestamptz not null default now();
alter table admin_users add column if not exists created_by uuid references admin_users(id);
alter table admin_users add column if not exists failed_logins smallint not null default 0;
alter table admin_users add column if not exists locked_until timestamptz;
alter table admin_users add column if not exists totp_last_step bigint;               -- 最近一次用过的 TOTP 时间步，防止同一个码再用
alter table admin_users add column if not exists recovery_hashes text[] not null default '{}';   -- 10 个一次性恢复码的 sha256，用掉就删
alter table admin_users add column if not exists password_changed_at timestamptz;
alter table admin_users add column if not exists disabled_at timestamptz;
alter table admin_users add column if not exists disabled_reason text;

create table if not exists admin_sessions (
  id          bigserial primary key,
  admin_id    uuid not null references admin_users(id),
  token_hash  text not null unique,          -- sha256(令牌)；令牌本身只在 httpOnly Cookie 里
  created_at  timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  expires_at  timestamptz not null,           -- 创建 + 12 小时
  ip          inet,
  user_agent  text,
  revoked_at  timestamptz
);
create index if not exists admin_sessions_admin on admin_sessions(admin_id, created_at desc);

-- 权限表：唯一口径（后台页面 ADMIN_PERMS 与它逐条相同，测试保证）
create table if not exists admin_perms (
  action      text primary key,
  label       text not null,
  roles       text[] not null,
  need_reason boolean not null default false
);
insert into admin_perms(action, label, roles, need_reason) values
 ('page.view',       '查看统计和名单',               '{owner,operator,viewer}', false),
 ('audit.view',      '查看操作日志',                 '{owner,operator}',        false),
 ('user.status',     '待核实 / 受限 / 暂停 / 恢复正常', '{owner,operator}',     true),
 ('user.ban',        '永久封禁、恢复已封禁或已注销的账号', '{owner}',            true),
 ('user.reset',      '重置昵称 / 头像',              '{owner,operator}',        true),
 ('user.gender',     '性别：清除 / 解除男改女限制',   '{owner,operator}',        true),
 ('user.notify',     '给球友发通知',                 '{owner,operator}',        false),
 ('phone.reveal',    '查看完整手机号',               '{owner}',                 true),
 ('report.handle',   '处理举报',                     '{owner,operator}',        false),
 ('message.read',    '查看被举报的对话',             '{owner,operator}',        true),
 ('message.hide',    '隐藏消息 / 评价',              '{owner,operator}',        true),
 ('venue.review',    '审核球场',                     '{owner,operator}',        false),
 ('risk.handle',     '处理风险提醒',                 '{owner,operator}',        false),
 ('data.export',     '导出统计（不含用户 ID）',       '{owner,operator}',        false),
 ('data.export_ids', '导出带用户 ID 的数据',          '{owner}',                 true),
 ('rules.edit',      '修改风险 / 频率规则',          '{owner}',                 true),
 ('admin.manage',    '管理管理员',                   '{owner}',                 true),
 ('city.manage',     '城市上线状态和资料',           '{owner}',                 true),
 ('city.waitlist',   '导出「开放时通知我」名单',     '{owner}',                 true)
on conflict (action) do update set label = excluded.label, roles = excluded.roles, need_reason = excluded.need_reason;
alter table admin_sessions enable row level security; alter table admin_perms enable row level security;
drop policy if exists svc_all on admin_sessions; create policy svc_all on admin_sessions to nbq_service using (true) with check (true);
drop policy if exists svc_all on admin_perms; create policy svc_all on admin_perms to nbq_service using (true) with check (true);
drop policy if exists adm_read on admin_perms; create policy adm_read on admin_perms for select to nbq_admin, nbq_viewer using (true);
drop policy if exists adm_read on admin_sessions;
grant all on admin_sessions, admin_perms to nbq_service; grant usage on sequence admin_sessions_id_seq to nbq_service;
grant select on admin_perms to nbq_admin, nbq_viewer;
revoke select on admin_sessions from nbq_admin;
revoke select (failed_logins, locked_until, totp_last_step, recovery_hashes) on admin_users from nbq_admin;

-- 后台不再直接写业务表、不再直接读私信（一律走下面的函数）
revoke update on users, reports, messages, venue_reviews, venue_suggestions, venues, risk_alerts from nbq_admin;
revoke insert on reports, user_status_log, admin_audit_log, venues from nbq_admin;
revoke select on messages from nbq_admin;
drop policy if exists adm_read on messages;

-- ---------- 登录（后端以 nbq_service 调用） ----------
-- 登录前：账号可用吗、锁了吗。返回 {id, role, password_hash, totp_secret, totp_last_step, recovery_n} 或报 admin_locked / admin_bad_login
create or replace function admin_login_begin(p_email text) returns jsonb language plpgsql security definer set search_path = public as $$
declare a admin_users;
begin
  select * into a from admin_users where lower(email) = lower(p_email);
  if not found or a.disabled then perform nbq_err('admin_bad_login'); end if;   -- 不区分「没这个人」和「已停用」
  if a.locked_until > now() then perform nbq_err('admin_locked', ceil(extract(epoch from a.locked_until - now()))::int::text); end if;
  return jsonb_build_object('id', a.id, 'role', a.role, 'password_hash', a.password_hash, 'totp_secret', a.totp_secret,
                            'totp_last_step', a.totp_last_step, 'recovery_n', cardinality(a.recovery_hashes));
end $$;
-- 登录结果：失败计数（连错 5 次锁 15 分钟）；成功清零、记 TOTP 时间步或用掉恢复码、建会话。p_token_hash = sha256(新令牌)
create or replace function admin_login_finish(p_admin uuid, p_ok boolean, p_ip inet default null, p_ua text default null,
    p_token_hash text default null, p_totp_step bigint default null, p_recovery_hash text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare a admin_users; sid bigint;
begin
  select * into a from admin_users where id = p_admin for update;
  if not found or a.disabled then perform nbq_err('admin_bad_login'); end if;
  if not p_ok then
    update admin_users set failed_logins = failed_logins + 1,
           locked_until = case when failed_logins + 1 >= 5 then now() + interval '15 minutes' else locked_until end where id = p_admin;
    insert into admin_audit_log(admin_id, action, detail, ip) values (p_admin, 'login.fail', '{}', p_ip);
    return jsonb_build_object('ok', false);
  end if;
  if a.locked_until > now() then perform nbq_err('admin_locked'); end if;
  if p_totp_step is not null and a.totp_last_step is not null and p_totp_step <= a.totp_last_step then perform nbq_err('admin_bad_login', 'totp_reused'); end if;
  if p_recovery_hash is not null and not (p_recovery_hash = any(a.recovery_hashes)) then perform nbq_err('admin_bad_login', 'recovery'); end if;
  if p_token_hash is null or length(p_token_hash) <> 64 then perform nbq_err('invalid', 'token'); end if;
  update admin_users set failed_logins = 0, locked_until = null, last_login_at = now(),
         totp_last_step = coalesce(p_totp_step, totp_last_step),
         recovery_hashes = case when p_recovery_hash is null then recovery_hashes else array_remove(recovery_hashes, p_recovery_hash) end
   where id = p_admin;
  insert into admin_sessions(admin_id, token_hash, expires_at, ip, user_agent) values (p_admin, p_token_hash, now() + interval '12 hours', p_ip, left(p_ua, 200)) returning id into sid;
  insert into admin_audit_log(admin_id, action, detail, ip) values (p_admin, case when p_recovery_hash is null then 'login' else 'login.recovery' end,
         jsonb_build_object('recovery_left', cardinality(a.recovery_hashes) - case when p_recovery_hash is null then 0 else 1 end), p_ip);
  return jsonb_build_object('ok', true, 'session', sid);
end $$;
-- 每个请求：令牌有效吗（未撤销、没过 12 小时、闲置不超过 1 小时、管理员没被停用）→ 返回 {id, role, name}，并刷新闲置时间
create or replace function admin_session_check(p_token_hash text) returns jsonb language plpgsql security definer set search_path = public as $$
declare s admin_sessions; a admin_users;
begin
  select * into s from admin_sessions where token_hash = p_token_hash;
  if not found or s.revoked_at is not null or s.expires_at <= now() or s.last_seen_at <= now() - interval '1 hour' then perform nbq_err('admin_session_expired'); end if;
  select * into a from admin_users where id = s.admin_id;
  if a.disabled then perform nbq_err('admin_session_expired'); end if;
  update admin_sessions set last_seen_at = now() where id = s.id;
  return jsonb_build_object('id', a.id, 'role', a.role, 'name', a.name, 'db_role', case when a.role = 'viewer' then 'nbq_viewer' else 'nbq_admin' end);
end $$;
create or replace function admin_session_revoke(p_token_hash text) returns void language sql security definer set search_path = public as $$
  update admin_sessions set revoked_at = now() where token_hash = p_token_hash and revoked_at is null
$$;

-- ---------- 权限检查 + 留痕 ----------
create or replace function nbq_admin_id() returns uuid language sql stable as $$ select nullif(current_setting('nbq.admin', true), '')::uuid $$;
-- 检查当前管理员能不能做这件事；需要理由的检查理由（≥ 4 个字）；通过后写操作日志，返回管理员 id
create or replace function nbq_admin_act(p_action text, p_target text default null, p_reason text default null, p_detail jsonb default '{}') returns uuid
language plpgsql security definer set search_path = public as $$
declare a admin_users; p admin_perms;
begin
  select * into a from admin_users where id = nbq_admin_id();
  if not found or a.disabled then perform nbq_err('admin_session_expired'); end if;
  select * into p from admin_perms where action = p_action;
  if not found or not (a.role = any(p.roles)) then perform nbq_err('admin_forbidden', p_action); end if;
  if p.need_reason and char_length(btrim(coalesce(p_reason, ''))) < 4 then perform nbq_err('admin_reason_required', p_action); end if;
  insert into admin_audit_log(admin_id, action, target, detail, ip)
  values (a.id, p_action, p_target, coalesce(p_detail, '{}') || case when p_reason is null then '{}' else jsonb_build_object('reason', btrim(p_reason)) end,
          nullif(current_setting('nbq.admin_ip', true), '')::inet);
  return a.id;
end $$;

-- ---------- 账号状态 ----------
create or replace function admin_user_status(p_user uuid, p_status text, p_reason_code text, p_reason text, p_days int default null, p_note text default null) returns void
language plpgsql security definer set search_path = public as $$
declare x users; adm uuid; lbl text; r record; untl timestamptz;
begin
  select * into x from users where id = p_user for update;
  if not found then perform nbq_err('not_found'); end if;
  if p_status not in ('active','review','limited','suspended','banned') then perform nbq_err('invalid', 'status'); end if;
  if p_status = x.status then perform nbq_err('state_changed'); end if;
  -- 封禁、以及把已封禁 / 已注销的账号恢复，只有 owner 能做
  adm := nbq_admin_act(case when p_status = 'banned' or x.status in ('banned','deleted') then 'user.ban' else 'user.status' end, p_user::text, p_reason,
                       jsonb_build_object('from', x.status, 'to', p_status, 'days', p_days, 'code', p_reason_code));
  if p_status = 'suspended' and (p_days is null or p_days not in (1,3,7,30,90,180)) then perform nbq_err('invalid', 'days'); end if;
  if p_status <> 'active' and (p_reason_code is null or p_reason_code not in ('no_show','reported','gender_fake','harass','spam','fake_profile','pact_violation','risk_rule','other')) then perform nbq_err('invalid', 'reason_code'); end if;
  lbl := case p_reason_code when 'no_show' then '多次爽约' when 'reported' then '被多人举报' when 'gender_fake' then '冒用女生身份' when 'harass' then '骚扰'
           when 'spam' then '广告' when 'fake_profile' then '资料不实' when 'pact_violation' then '违反球友约定' when 'risk_rule' then '风险规则' when 'other' then '其他' else '恢复正常' end;
  untl := case when p_status = 'suspended' then now() + make_interval(days => p_days) end;
  -- 连带处理（§3.11）：暂停 → 待确认的申请撤回；封禁 → 同注销（退出未开打的局并通知、取消发起的未开打球局并通知、撤回进行中的邀约）
  if p_status in ('suspended','banned') then
    update game_participants set status = 'withdrawn', left_at = now() where user_id = p_user and status = 'pending';
  end if;
  if p_status = 'banned' then
    for r in select p.game_id, g.host_id from game_participants p join games g on g.id = p.game_id
              where p.user_id = p_user and p.role = 'player' and p.status = 'approved' and g.status <> 'cancelled' and g.starts_at > now() loop
      update game_participants set status = 'left', left_at = now() where game_id = r.game_id and user_id = p_user;
      perform nbq_notify(r.host_id, 'player_left', r.game_id, p_user);
    end loop;
    for r in select id from games where host_id = p_user and status <> 'cancelled' and starts_at > now() loop
      insert into notifications(user_id, kind, game_id, actor_id)
      select user_id, 'game_cancelled', r.id, p_user from game_participants where game_id = r.id and role = 'player' and status in ('approved','pending');
      update games set status = 'cancelled' where id = r.id;
    end loop;
    update invites set status = 'withdrawn', responded_at = now() where p_user in (from_user, to_user) and status in ('pending','counter');
  end if;
  update users set status = p_status, status_since = now(), status_until = untl, status_reason = case when p_status = 'active' then null else p_reason_code end where id = p_user;
  insert into user_status_log(user_id, from_status, to_status, reason, reason_code, note, duration_days, until, by_admin)
  values (p_user, x.status, p_status, lbl, case when p_status = 'active' then null else p_reason_code end, coalesce(p_note, p_reason), case when p_status = 'suspended' then p_days end, untl, adm);
  if p_status <> 'deleted' then perform nbq_notify(p_user, 'account_status', null, null); end if;
end $$;
-- 重置昵称 / 头像（不合适的内容）
create or replace function admin_user_reset(p_user uuid, p_what text, p_reason text) returns void language plpgsql security definer set search_path = public as $$
begin
  perform nbq_admin_act('user.reset', p_user::text, p_reason, jsonb_build_object('what', p_what));
  if p_what = 'nickname' then update users set nickname = '球友' || member_no where id = p_user;
  elsif p_what = 'avatar' then update users set avatar_kind = 'letter', avatar_animal = null where id = p_user;
  else perform nbq_err('invalid', 'what'); end if;
  perform nbq_notify(p_user, 'account_status', null, null);
end $$;
-- 性别：清除（重新确认）/ 解除男改女限制
create or replace function admin_user_gender(p_user uuid, p_action text, p_reason text) returns void language plpgsql security definer set search_path = public as $$
begin
  perform nbq_admin_act('user.gender', p_user::text, p_reason, jsonb_build_object('action', p_action));
  if p_action = 'clear' then update users set gender = null, gender_review = false where id = p_user;
  elsif p_action = 'unlock' then update users set gender_m2f_at = null, gender_review = false where id = p_user;
  else perform nbq_err('invalid', 'action'); end if;
end $$;
-- 查看完整手机号（只有 owner，必须填理由）
create or replace function admin_reveal_phone(p_user uuid, p_reason text) returns text language plpgsql security definer set search_path = public as $$
begin
  perform nbq_admin_act('phone.reveal', p_user::text, p_reason);
  return (select phone_e164 from users where id = p_user);
end $$;

-- ---------- 举报与消息 ----------
create or replace function admin_report_handle(p_report uuid, p_action text, p_note text default null) returns void language plpgsql security definer set search_path = public as $$
declare adm uuid;
begin
  if p_action not in ('actioned','dismissed') then perform nbq_err('invalid', 'action'); end if;
  adm := nbq_admin_act('report.handle', p_report::text, p_note, jsonb_build_object('action', p_action));
  update reports set status = p_action, handled_by = adm, handled_at = now() where id = p_report and status = 'open';
  if not found then perform nbq_err('state_changed'); end if;
end $$;
-- 被举报的那段对话：聊天里举报 → context_ref 那个对话；球员卡举报 → 举报人和被举报人之间的私信。只返回举报前 7 天到举报后 1 天的消息
create or replace function admin_report_messages(p_report uuid, p_reason text) returns table(id bigint, sender uuid, sender_name text, body text, created_at timestamptz, hidden boolean)
language plpgsql security definer set search_path = public as $$
declare rp reports; th uuid;
begin
  select * into rp from reports where reports.id = p_report;
  if not found then perform nbq_err('not_found'); end if;
  perform nbq_admin_act('message.read', p_report::text, p_reason);
  if rp.context_ref is not null and rp.context_ref ~ '^[0-9a-f-]{36}$' and exists (select 1 from threads t where t.id = rp.context_ref::uuid and thread_member(t.id, rp.reporter_id)) then
    th := rp.context_ref::uuid;
  elsif rp.target_type = 'user' then
    select t.id into th from threads t where t.kind = 'dm' and t.user_a = least(rp.reporter_id, rp.target_id::uuid) and t.user_b = greatest(rp.reporter_id, rp.target_id::uuid);
  end if;
  if th is null then return; end if;
  return query select m.id, m.sender_id, u.nickname, m.body, m.created_at, m.hidden from messages m join users u on u.id = m.sender_id
                where m.thread_id = th and m.created_at between rp.created_at - interval '7 days' and rp.created_at + interval '1 day' order by m.created_at;
end $$;
create or replace function admin_message_hide(p_message bigint, p_reason text) returns void language plpgsql security definer set search_path = public as $$
begin
  perform nbq_admin_act('message.hide', p_message::text, p_reason);
  update messages set hidden = true where id = p_message;
  if not found then perform nbq_err('not_found'); end if;
end $$;

-- ---------- 球场、风险、导出、规则 ----------
create or replace function admin_venue_review(p_venue uuid, p_action text, p_merge_into uuid default null) returns void language plpgsql security definer set search_path = public as $$
begin
  if p_action not in ('approve','merge','reject') then perform nbq_err('invalid', 'action'); end if;
  perform nbq_admin_act('venue.review', p_venue::text, null, jsonb_build_object('action', p_action, 'merge_into', p_merge_into));
  if p_action = 'merge' and (p_merge_into is null or p_merge_into = p_venue or not exists (select 1 from venues where id = p_merge_into and status = 'active')) then perform nbq_err('invalid', 'merge_into'); end if;
  update venues set status = case p_action when 'approve' then 'active' when 'merge' then 'merged' else 'rejected' end,
         merged_into = case when p_action = 'merge' then p_merge_into end where id = p_venue;
  if not found then perform nbq_err('not_found'); end if;
end $$;
-- 球场坐标核对（#27 第 3 步）：p_lat / p_lng 都不填 = 「现在的位置没错」，只把来源标成已核对；填了 = 改到新位置。
--   范围只收澳大利亚境内（挡住填反经纬度）；改动前后的位置和移动距离写进操作日志；不改球场的其他任何字段。
create or replace function admin_venue_geo(p_venue uuid, p_lat double precision default null, p_lng double precision default null) returns void language plpgsql security definer set search_path = public as $$
declare old_loc geography; moved numeric;
begin
  if (p_lat is null) <> (p_lng is null) then perform nbq_err('invalid', 'latlng'); end if;
  if p_lat is not null and (p_lat not between -44 and -10 or p_lng not between 112 and 154) then perform nbq_err('invalid', 'latlng'); end if;
  select location into old_loc from venues where id = p_venue;
  if not found then perform nbq_err('not_found'); end if;
  perform nbq_admin_act('venue.review', p_venue::text, null, jsonb_build_object('action', case when p_lat is null then 'geo_confirm' else 'geo_move' end,
    'from', jsonb_build_array(round(st_y(old_loc::geometry)::numeric, 6), round(st_x(old_loc::geometry)::numeric, 6)), 'to', case when p_lat is null then null else jsonb_build_array(p_lat, p_lng) end));
  if p_lat is null then
    update venues set geo_source = 'admin' where id = p_venue;
  else
    update venues set location = st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography, geo_source = 'admin' where id = p_venue;
  end if;
end $$;
grant execute on function admin_venue_geo(uuid, double precision, double precision) to nbq_admin;
create or replace function admin_risk_alert(p_alert bigint, p_status text, p_note text default null, p_watch_days int default 7) returns void language plpgsql security definer set search_path = public as $$
declare adm uuid;
begin
  if p_status not in ('watching','handled','ignored','open') then perform nbq_err('invalid', 'status'); end if;
  adm := nbq_admin_act('risk.handle', p_alert::text, p_note, jsonb_build_object('status', p_status));
  update risk_alerts set status = p_status, note = coalesce(p_note, note), reviewed_by = adm,
         handled_at = case when p_status in ('handled','ignored') then now() end,
         watch_until = case when p_status = 'watching' then now() + make_interval(days => p_watch_days) end where id = p_alert;
  if not found then perform nbq_err('not_found'); end if;
end $$;
-- 导出：后端先调这个拿许可（记日志），再按数据集导出；带用户 ID 的只有 owner，必须填理由
create or replace function admin_export(p_dataset text, p_with_ids boolean, p_reason text default null) returns void language plpgsql security definer set search_path = public as $$
begin
  perform nbq_admin_act(case when p_with_ids then 'data.export_ids' else 'data.export' end, p_dataset, p_reason, jsonb_build_object('with_ids', p_with_ids));
end $$;
-- 改规则（风险 / 频率）：只有 owner，必须填理由；日志里记改前改后
create or replace function admin_rule_set(p_kind text, p_rule text, p_patch jsonb, p_reason text) returns void language plpgsql security definer set search_path = public as $$
declare before jsonb;
begin
  if p_kind = 'risk' then select to_jsonb(r) into before from risk_rules r where code = p_rule;
  elsif p_kind = 'rate' then select to_jsonb(r) into before from rate_rules r where rule = p_rule;
  else perform nbq_err('invalid', 'kind'); end if;
  if before is null then perform nbq_err('not_found'); end if;
  perform nbq_admin_act('rules.edit', p_kind || ':' || p_rule, p_reason, jsonb_build_object('before', before, 'patch', p_patch));
  if p_kind = 'risk' then
    update risk_rules set weight = coalesce((p_patch->>'weight')::int, weight), threshold = coalesce((p_patch->>'threshold')::numeric, threshold),
           window_days = coalesce((p_patch->>'window_days')::int, window_days), enabled = coalesce((p_patch->>'enabled')::boolean, enabled) where code = p_rule;
  else
    update rate_rules set max_hits = coalesce((p_patch->>'max_hits')::int, max_hits), win = coalesce((p_patch->>'win')::interval, win),
           enabled = coalesce((p_patch->>'enabled')::boolean, enabled) where rule = p_rule;
  end if;
end $$;

-- ---------- 管理员 ----------
-- 新增（密码哈希、TOTP 密钥、恢复码哈希由后端生成；第一次登录后要改密码）
create or replace function admin_add(p_email text, p_name text, p_role text, p_password_hash text, p_totp_secret text, p_recovery_hashes text[], p_reason text) returns uuid
language plpgsql security definer set search_path = public as $$
declare me uuid; nid uuid;
begin
  if p_role not in ('owner','operator','viewer') then perform nbq_err('invalid', 'role'); end if;
  me := nbq_admin_act('admin.manage', p_email, p_reason, jsonb_build_object('add', p_role));
  insert into admin_users(email, name, role, password_hash, totp_secret, recovery_hashes, created_by) values (lower(p_email), p_name, p_role, p_password_hash, p_totp_secret, p_recovery_hashes, me) returning id into nid;
  return nid;
end $$;
-- 改角色 / 停用（离职）：停用时撤销全部会话；不能让 owner 变成 0 位，不能停用自己
create or replace function admin_update(p_admin uuid, p_role text, p_disable boolean, p_reason text) returns void language plpgsql security definer set search_path = public as $$
declare me uuid; t admin_users; owners int;
begin
  select * into t from admin_users where id = p_admin for update;
  if not found then perform nbq_err('not_found'); end if;
  me := nbq_admin_act('admin.manage', t.email, p_reason, jsonb_build_object('role', p_role, 'disable', p_disable, 'was', t.role));
  if p_admin = me and coalesce(p_disable, false) then perform nbq_err('admin_last_owner', 'self'); end if;
  select count(*) into owners from admin_users where role = 'owner' and not disabled and id <> p_admin;
  if t.role = 'owner' and (coalesce(p_disable, false) or coalesce(p_role, 'owner') <> 'owner') and owners = 0 then perform nbq_err('admin_last_owner'); end if;
  update admin_users set role = coalesce(p_role, role),
         disabled = coalesce(p_disable, disabled), disabled_at = case when p_disable then now() when p_disable is false then null else disabled_at end,
         disabled_reason = case when p_disable then btrim(p_reason) when p_disable is false then null else disabled_reason end where id = p_admin;
  if p_disable then update admin_sessions set revoked_at = now() where admin_id = p_admin and revoked_at is null; end if;
end $$;
-- 管理员状况（后台「管理员」卡片）：owner 少于 2 位时提示
create or replace view admin_health as
select (select count(*) from admin_users where role = 'owner' and not disabled) as owners,
       (select count(*) from admin_users where not disabled) as active_admins,
       (select count(*) from admin_users where not disabled and cardinality(recovery_hashes) < 3) as low_recovery,
       (select count(*) from admin_sessions where revoked_at is null and expires_at > now() and last_seen_at > now() - interval '1 hour') as live_sessions;
grant select on admin_health to nbq_admin;

do $$ declare f record; begin
  for f in select p.oid::regprocedure as sig, p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and (p.proname like 'admin\_%' or p.proname in ('nbq_admin_act','nbq_admin_id')) loop
    execute format('revoke execute on function %s from public, nbq_user, nbq_viewer', f.sig);
    if f.proname in ('admin_login_begin','admin_login_finish','admin_session_check','admin_session_revoke') then
      execute format('revoke execute on function %s from nbq_admin', f.sig);
      execute format('grant execute on function %s to nbq_service', f.sig);
    elsif f.proname in ('nbq_admin_act') then
      execute format('revoke execute on function %s from nbq_admin, nbq_service', f.sig);
    else
      execute format('grant execute on function %s to nbq_admin', f.sig);
    end if;
  end loop; end $$;

-- =====================================================================
-- ⑱ 上线后盯什么（第五批 5d，2026-10）：16 项检查 · 报警（新出现 / 升级 / 6 小时仍未恢复再提醒 / 恢复）· 页面报错 · 送达失败 · 恢复演练记录
--   · monitor_checks(p_now)：每项返回 ok / warn / crit + 当前值 + 阈值 + 一句话说明；阈值写在 monitor_thresholds（改数值只改表）
--   · job_monitor(p_now)（每 5 分钟）：写 monitor_alerts，返回这次要通知的报警；后端 server/ops/monitor.mjs 发邮件给 owner
--   · 后台「系统状态」卡片读 monitor_checks()；出事处理见 出事处理手册.md
-- =====================================================================
create table if not exists monitor_thresholds (
  code   text primary key,
  area   text not null check (area in ('系统','业务')),
  label  text not null,
  warn   numeric not null,
  crit   numeric,                       -- 为空 = 只有警告级
  note   text not null                  -- 怎么算
);
insert into monitor_thresholds(code, area, label, warn, crit, note) values
 ('jobs_stale',      '系统', '定时任务没在跑',         1,    1,    '超过 3 个周期没有成功运行的任务数（每分钟的 5 分钟、每 5 分钟的 15 分钟、每 10 分钟的 30 分钟、每 15 分钟的 45 分钟、每小时的 2.5 小时、每天的 26 小时）'),
 ('notif_backlog',   '系统', '提醒积压',               1,    20,   '到时间却超过 5 分钟还没处理的提醒条数'),
 ('push_fail_rate',  '系统', '推送失败率',             0.10, 0.30, '最近 1 小时推送失败 / 推送尝试（尝试 ≥ 20 才算）'),
 ('email_bounce',    '系统', '邮件退信率',             0.05, 0.10, '最近 7 天退信 / 发出（发出 ≥ 20 才算）'),
 ('email_failed',    '系统', '邮件发送失败',           5,    20,   '最近 1 小时邮件服务出错的封数'),
 ('otp_fail',        '系统', '验证码输错激增',         50,   200,  '最近 1 小时验证码输错次数（可能有人在试号）'),
 ('rate_hit_spike',  '系统', '频率限制触发激增',       3,    10,   '最近 1 小时触发次数 ÷ 过去 7 天每小时平均（次数 ≥ 30 才算）'),
 ('client_errors',   '系统', '页面报错',               3,    10,   '最近 1 小时页面报错次数 ÷ 过去 7 天每小时平均（次数 ≥ 20 才算）'),
 ('db_connections',  '系统', '数据库连接数',           0.80, 0.95, '正在用的连接 / 最大连接数'),
 ('long_queries',    '系统', '慢查询',                 1,    5,    '已经跑了 60 秒以上还没结束的查询数'),
 ('restore_drill',   '系统', '恢复演练',               35,   60,   '距离上一次成功的备份恢复演练的天数（每月演练一次）'),
 ('fill_rate_drop',  '业务', '人齐率骤降',             0.70, 0.50, '最近 24 小时开打的局的人齐率 ÷ 过去 4 周同一时段的平均（开打 ≥ 10 局才算；越低越差）'),
 ('signup_drop',     '业务', '新注册骤降',             0.50, 0.25, '最近 24 小时新注册 ÷ 过去 4 周同一时段的平均（平均 ≥ 10 才算；越低越差）'),
 ('reports_spike',   '业务', '举报激增',               3,    10,   '最近 24 小时举报 ÷ 过去 28 天每天平均（举报 ≥ 5 才算）'),
 ('expiry_rate',     '业务', '申请失效率',             0.40, 0.60, '最近 7 天申请超时失效 / 已有结果的申请（≥ 20 才算）'),
 ('sender_stale',    '系统', '发送程序没在跑',         10,   30,   '距离发送程序最近一次处理的分钟数（只在有到期提醒时算）')
on conflict (code) do update set area = excluded.area, label = excluded.label, note = excluded.note;

-- 送达失败（发送程序记）：推送非 2xx、邮件服务出错
create table if not exists delivery_errors (
  id      bigserial primary key,
  at      timestamptz not null default now(),
  channel text not null check (channel in ('push_mobile','push_desktop','email')),
  status  int,                          -- 推送服务返回码；0 = 网络错误
  detail  text
);
create index if not exists delivery_errors_at on delivery_errors(at);
-- 页面报错（POST /api/client-errors → 后端以 nbq_service 调 client_error_log）：只有错误信息和位置，不含用户内容；同一条每小时合并计数
create table if not exists client_errors (
  hour    timestamptz not null,
  build   text not null check (build in ('pwa','web','admin')),
  device  text check (device in ('mobile','desktop')),
  msg     text not null,
  src     text not null default '',
  line    int not null default 0,
  n       int not null default 1,
  primary key (hour, build, msg, src, line)
);
create or replace function client_error_log(p_build text, p_device text, p_msg text, p_src text default '', p_line int default 0) returns void
language sql security definer set search_path = public as $$
  insert into client_errors(hour, build, device, msg, src, line) values (date_trunc('hour', now()), p_build, nullif(p_device, ''), left(coalesce(p_msg, ''), 200), left(coalesce(p_src, ''), 80), coalesce(p_line, 0))
  on conflict (hour, build, msg, src, line) do update set n = client_errors.n + 1
$$;
-- 报警记录：同一项同时只有一条没恢复的
create table if not exists monitor_alerts (
  id          bigserial primary key,
  code        text not null references monitor_thresholds(code),
  level       text not null check (level in ('warn','crit')),
  value       numeric,
  note        text,
  opened_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  notified_at timestamptz,
  resolved_at timestamptz
);
create unique index if not exists monitor_alerts_open on monitor_alerts(code) where resolved_at is null;
-- 恢复演练记录（server/ops/backup.mjs 写）
create table if not exists ops_drills (
  id         bigserial primary key,
  at         timestamptz not null default now(),
  ok         boolean not null,
  backup_at  timestamptz,               -- 用的是哪个时间点的备份
  minutes    numeric,                   -- 从开始到恢复完成用了多久
  detail     jsonb not null default '{}'
);
-- 发送程序心跳：每次 dispatch 结束写一行（只留最新）
create table if not exists ops_heartbeats (name text primary key, at timestamptz not null);
do $$ declare t text; begin
  foreach t in array array['monitor_thresholds','delivery_errors','client_errors','monitor_alerts','ops_drills','ops_heartbeats'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists svc_all on %I', t); execute format('create policy svc_all on %I to nbq_service using (true) with check (true)', t);
    execute format('drop policy if exists adm_read on %I', t); execute format('create policy adm_read on %I for select to nbq_admin using (true)', t);
    execute format('grant all on %I to nbq_service', t); execute format('grant select on %I to nbq_admin', t);
  end loop; end $$;
grant usage on sequence delivery_errors_id_seq, monitor_alerts_id_seq, ops_drills_id_seq to nbq_service;

-- 16 项检查
create or replace function monitor_checks(p_now timestamptz default now()) returns table(code text, area text, label text, level text, value numeric, warn numeric, crit numeric, note text)
language plpgsql stable security definer set search_path = public as $$
declare v numeric; base numeric; n numeric; t monitor_thresholds; lv text;
begin
  for t in select * from monitor_thresholds m order by m.area desc, m.code loop
    v := null; lv := 'ok';
    case t.code
    when 'jobs_stale' then
      select count(*) into v from (values ('expire_applications',5),('start_checks',5),('soon_reminders',5),('unfilled_reminders',15),('recap_notices',30),('restore_suspended',30),
                                          ('expire_invites',45),('risk_scores',150),('nightly',1560)) j(job, mins)
       where coalesce((select max(r.started_at) from job_runs r where r.job = j.job and r.ok), '-infinity') < p_now - make_interval(mins => j.mins);
    when 'notif_backlog' then
      select count(*) into v from notifications x where x.pushed_at is null and coalesce(x.send_after, x.created_at) < p_now - interval '5 minutes';
    when 'push_fail_rate' then
      select count(*) into n from notification_deliveries d where d.channel in ('push_mobile','push_desktop') and d.at > p_now - interval '1 hour';
      select count(*) into v from delivery_errors e where e.channel like 'push%' and e.at > p_now - interval '1 hour';
      v := case when n + v >= 20 then round(v / (n + v), 3) end;
    when 'email_bounce' then
      select count(*) filter (where o.status = 'bounced'), count(*) filter (where o.status in ('sent','bounced')) into v, n from email_outbox o where o.sent_at > p_now - interval '7 days';
      v := case when n >= 20 then round(v / n, 3) end;
    when 'email_failed' then
      select count(*) into v from delivery_errors e where e.channel = 'email' and e.at > p_now - interval '1 hour';
    when 'otp_fail' then
      select count(*) into v from rate_hits h where h.grp = 'otp_fail' and h.at > p_now - interval '1 hour';
    when 'rate_hit_spike' then
      select count(*) into n from risk_events e where e.kind = 'rate_hit' and e.at > p_now - interval '1 hour';
      select count(*) / 168.0 into base from risk_events e where e.kind = 'rate_hit' and e.at <= p_now - interval '1 hour' and e.at > p_now - interval '7 days 1 hour';
      v := case when n >= 30 then round(n / greatest(base, 1), 2) end;
    when 'client_errors' then
      select coalesce(sum(c.n), 0) into n from client_errors c where c.hour >= date_trunc('hour', p_now - interval '1 hour') and c.hour <= p_now;
      select coalesce(sum(c.n), 0) / 168.0 into base from client_errors c where c.hour < date_trunc('hour', p_now - interval '1 hour') and c.hour >= p_now - interval '7 days 1 hour';
      v := case when n >= 20 then round(n / greatest(base, 1), 2) end;
    when 'db_connections' then
      select round(count(*)::numeric / current_setting('max_connections')::numeric, 3) into v from pg_stat_activity;
    when 'long_queries' then
      select count(*) into v from pg_stat_activity a where a.state = 'active' and a.pid <> pg_backend_pid() and a.query_start < clock_timestamp() - interval '60 seconds';
    when 'restore_drill' then
      select round(extract(epoch from p_now - max(d.at)) / 86400, 1) into v from ops_drills d where d.ok;
      v := coalesce(v, 999);
    when 'fill_rate_drop' then
      select count(*), avg(case when f.full_at_start then 1.0 else 0 end) into n, v from v_game_fill f where f.starts_at > p_now - interval '24 hours' and f.starts_at <= p_now;
      select avg(case when f.full_at_start then 1.0 else 0 end) into base from v_game_fill f, generate_series(1, 4) w
       where f.starts_at > p_now - make_interval(days => 7 * w) - interval '24 hours' and f.starts_at <= p_now - make_interval(days => 7 * w);
      v := case when n >= 10 and base > 0 then round(v / base, 3) end;
    when 'signup_drop' then
      select count(*) into n from users u where u.created_at > p_now - interval '24 hours' and u.created_at <= p_now;
      select count(*) / 4.0 into base from users u, generate_series(1, 4) w where u.created_at > p_now - make_interval(days => 7 * w) - interval '24 hours' and u.created_at <= p_now - make_interval(days => 7 * w);
      v := case when base >= 10 then round(n / base, 3) end;
    when 'reports_spike' then
      select count(*) into n from reports r where r.created_at > p_now - interval '24 hours';
      select count(*) / 28.0 into base from reports r where r.created_at <= p_now - interval '24 hours' and r.created_at > p_now - interval '29 days';
      v := case when n >= 5 then round(n / greatest(base, 0.5), 2) end;
    when 'expiry_rate' then
      select count(*) filter (where p.status = 'expired'), count(*) into v, n from game_participants p
       where p.role = 'player' and p.decided_at > p_now - interval '7 days' and p.status in ('approved','rejected','expired') and p.via = 'request';
      v := case when n >= 20 then round(v / n, 3) end;
    when 'sender_stale' then
      if exists (select 1 from notifications x where x.pushed_at is null and coalesce(x.send_after, x.created_at) <= p_now) then
        select round(extract(epoch from p_now - h.at) / 60, 1) into v from ops_heartbeats h where h.name = 'sender';
        v := coalesce(v, 999);
      end if;
    else null;
    end case;
    if v is not null then
      if t.code in ('fill_rate_drop','signup_drop') then
        lv := case when t.crit is not null and v <= t.crit then 'crit' when v <= t.warn then 'warn' else 'ok' end;
      else
        lv := case when t.crit is not null and v >= t.crit then 'crit' when v >= t.warn then 'warn' else 'ok' end;
      end if;
    end if;
    code := t.code; area := t.area; label := t.label; level := lv; value := v; warn := t.warn; crit := t.crit; note := t.note;
    return next;
  end loop;
end $$;

-- 每 5 分钟：开 / 升级 / 恢复报警；返回要通知的 [{code,label,level,value,kind: new|escalate|remind|resolved}]
create or replace function job_monitor(p_now timestamptz default now()) returns jsonb language plpgsql security definer set search_path = public as $$
declare t0 timestamptz := clock_timestamp(); c record; a monitor_alerts; out jsonb := '[]';
begin
  for c in select * from monitor_checks(p_now) loop
    select * into a from monitor_alerts where code = c.code and resolved_at is null;
    if c.level = 'ok' then
      if found then
        update monitor_alerts set resolved_at = p_now, last_seen_at = p_now where id = a.id;
        out := out || jsonb_build_object('code', c.code, 'label', c.label, 'level', 'ok', 'value', c.value, 'kind', 'resolved');
      end if;
    elsif not found then
      insert into monitor_alerts(code, level, value, note, opened_at, last_seen_at, notified_at) values (c.code, c.level, c.value, c.note, p_now, p_now, p_now);
      out := out || jsonb_build_object('code', c.code, 'label', c.label, 'level', c.level, 'value', c.value, 'kind', 'new');
    elsif c.level = 'crit' and a.level = 'warn' then
      update monitor_alerts set level = 'crit', value = c.value, last_seen_at = p_now, notified_at = p_now where id = a.id;
      out := out || jsonb_build_object('code', c.code, 'label', c.label, 'level', 'crit', 'value', c.value, 'kind', 'escalate');
    elsif a.notified_at <= p_now - interval '6 hours' then
      update monitor_alerts set value = c.value, level = c.level, last_seen_at = p_now, notified_at = p_now where id = a.id;
      out := out || jsonb_build_object('code', c.code, 'label', c.label, 'level', c.level, 'value', c.value, 'kind', 'remind');
    else
      update monitor_alerts set value = c.value, level = case when c.level = 'crit' then 'crit' else a.level end, last_seen_at = p_now where id = a.id;
    end if;
  end loop;
  perform nbq_job_log('monitor', jsonb_array_length(out), t0);
  return out;
end $$;

-- 恢复后的库自检（server/ops/backup.mjs 在恢复出来的库里调用）
create or replace function ops_verify() returns table(item text, ok boolean, detail text) language plpgsql security definer set search_path = public as $$
declare n bigint;
begin
  item := '全部表开着行级权限'; select count(*), coalesce(string_agg(c.relname, ', '), '') into n, detail from pg_class c join pg_namespace s on s.oid = c.relnamespace
   where s.nspname = 'public' and c.relkind in ('r','p') and not c.relispartition and not c.relrowsecurity and c.relname <> 'spatial_ref_sys';
  ok := n = 0; detail := n || ' 张没开' || case when n > 0 then '：' || detail else '' end; return next;
  item := '四个角色都在'; select count(*) into n from pg_roles where rolname in ('nbq_user','nbq_service','nbq_admin','nbq_viewer');
  ok := n = 4; detail := n || ' / 4'; return next;
  item := '球局都有发起人那一行'; select count(*) into n from games g where not exists (select 1 from game_participants p where p.game_id = g.id and p.role = 'host');
  ok := n = 0; detail := n || ' 局缺'; return next;
  item := '没有孤儿参加记录'; select count(*) into n from game_participants p where not exists (select 1 from games g where g.id = p.game_id);
  ok := n = 0; detail := n || ' 行'; return next;
  item := '操作日志防改触发器在'; select count(*) into n from pg_trigger where tgname = 'trg_audit_append_only' and not tgisinternal;
  ok := n = 1; detail := n || ' 个'; return next;
  item := '超级管理员至少 1 位'; select count(*) into n from admin_users where role = 'owner' and not disabled;
  ok := n >= 1; detail := n || ' 位'; return next;
end $$;

revoke execute on function monitor_checks(timestamptz), job_monitor(timestamptz), client_error_log(text, text, text, text, int), ops_verify() from public, nbq_user, nbq_viewer;
grant execute on function job_monitor(timestamptz), client_error_log(text, text, text, text, int), ops_verify() to nbq_service;
grant execute on function monitor_checks(timestamptz) to nbq_service, nbq_admin;
grant execute on function ops_verify() to nbq_admin;
do $$ begin if exists (select 1 from pg_extension where extname = 'pg_cron') then
  execute $c$select cron.schedule('nbq_monitor', '*/5 * * * *', 'select job_monitor()')$c$;   -- 发报警邮件由 server/ops/monitor.mjs 做；只用 pg_cron 时报警只在后台「系统状态」里看
end if; end $$;

-- =====================================================================
-- ⑲ 多城市（地区扩展 R1-1，2026-10）：澳洲各城市（墨尔本、悉尼、堪培拉、布里斯班、阿德莱德、珀斯）
--   · cities：每个城市的时区、中心、上线状态、发局时段、夜间不打扰时段、顺延截止、分享话题（改配置只改表）
--   · 区、球场、球局、邀约、用户都带城市：区 → 球场（触发器）→ 球局（触发器）；用户 home_city = 常用城市
--   · 时间规则按「事情发生在哪个城市」：发局 / 邀约时段、顺延截止按球场城市；赛后提醒的夜间不打扰按收提醒的人常用城市
--   · city_tz() / city_today() / city_day_start()；墨尔本的结果和原来的 mel_today() / mel_day_start() 完全相同
--   · 区的唯一键本来就是（区名, 邮编），澳洲邮编按州分段，同名区（如 Brighton VIC 3186 / SA 5048 / QLD 4017）不会冲突；页面上跨城市显示时带州
-- =====================================================================
create table if not exists cities (
  key          text primary key check (key ~ '^[a-z]{2,8}$'),
  country      text not null default 'AU' check (country in ('AU')),
  state        text not null check (state in ('VIC','NSW','ACT','QLD','SA','WA','TAS','NT')),
  name_zh      text not null,
  name_en      text not null,
  tz           text not null,                          -- IANA 时区
  center       geography(point,4326) not null,
  radius_km    smallint not null default 60,
  status       text not null default 'off' check (status in ('off','prep','beta','on')),   -- 未开放 / 筹备（只有管理员能看）/ 试运行 / 正式
  launched_at  timestamptz,
  slot_start   time not null default '06:00',          -- 发局 / 邀约最早开打
  slot_end     time not null default '21:30',          -- 最晚开打
  quiet_start  time not null default '22:00',          -- 夜间不打扰
  quiet_end    time not null default '08:00',
  postpone_end time not null default '23:00',          -- 顺延后结束不晚于
  hashtag      text not null,                          -- 分享话题：墨尔本网球
  community_url text,                                  -- 当地微信群 / 社群
  sort         smallint not null default 100,
  check (slot_start < slot_end and slot_end < postpone_end)
);
create or replace function cities_tz_check() returns trigger language plpgsql as $$
begin perform now() at time zone new.tz; return new; end $$;   -- 时区名写错直接报错
drop trigger if exists trg_cities_tz_check on cities;
create trigger trg_cities_tz_check before insert or update of tz on cities for each row execute function cities_tz_check();
insert into cities(key, state, name_zh, name_en, tz, center, radius_km, status, hashtag, sort) values
 ('melb','VIC','墨尔本','Melbourne','Australia/Melbourne','POINT(144.9631 -37.8136)',75,'on','墨尔本网球',1),
 ('syd','NSW','悉尼','Sydney','Australia/Sydney','POINT(151.2093 -33.8688)',60,'off','悉尼网球',2),
 ('bne','QLD','布里斯班','Brisbane','Australia/Brisbane','POINT(153.0251 -27.4698)',60,'off','布里斯班网球',3),
 ('per','WA','珀斯','Perth','Australia/Perth','POINT(115.8605 -31.9505)',60,'off','珀斯网球',4),
 ('adl','SA','阿德莱德','Adelaide','Australia/Adelaide','POINT(138.6007 -34.9285)',50,'off','阿德莱德网球',5),
 ('cbr','ACT','堪培拉','Canberra','Australia/Sydney','POINT(149.1300 -35.2809)',40,'off','堪培拉网球',6)
on conflict (key) do nothing;
alter table cities enable row level security;
drop policy if exists ct_read on cities; create policy ct_read on cities for select to nbq_user using (status in ('beta','on'));   -- 前台只看得到已开放的城市
drop policy if exists adm_read on cities; create policy adm_read on cities for select to nbq_admin, nbq_viewer using (true);
drop policy if exists svc_all on cities; create policy svc_all on cities to nbq_service using (true) with check (true);
grant select on cities to nbq_user, nbq_admin, nbq_viewer; grant all on cities to nbq_service;

-- 时间工具：城市的时区、当地今天、当地某天的开始
create or replace function city_tz(p_city text) returns text language sql stable security definer set search_path = public as $$
  select coalesce((select tz from cities where key = coalesce(p_city, 'melb')), 'Australia/Melbourne') $$;
create or replace function city_today(p_city text) returns date language sql stable as $$ select (now() at time zone city_tz(p_city))::date $$;
create or replace function city_day_start(p_city text, p_day date) returns timestamptz language sql stable as $$ select p_day::timestamp at time zone city_tz(p_city) $$;
-- 是否在夜间不打扰时段（跨午夜：22:00–08:00）
create or replace function nbq_quiet(p_t time, p_start time, p_end time) returns boolean language sql immutable as $$
  select case when p_start <= p_end then p_t >= p_start and p_t < p_end else p_t >= p_start or p_t < p_end end $$;
grant execute on function city_tz(text), city_today(text), city_day_start(text, date), nbq_quiet(time, time, time) to nbq_user, nbq_service, nbq_admin, nbq_viewer;

-- 服务区、区、球场、球局、邀约、用户都带城市
alter table service_areas add column if not exists city text references cities(key);
update service_areas set city = 'melb' where city is null;
alter table suburbs add column if not exists city text references cities(key);
alter table suburbs add column if not exists state text;
update suburbs set city = coalesce(city, 'melb'), state = coalesce(state, 'VIC') where city is null or state is null;
create index if not exists suburbs_city on suburbs(city);
alter table venues add column if not exists city text references cities(key);
update venues v set city = coalesce((select s.city from suburbs s where s.name = v.suburb and s.postcode = v.postcode), 'melb') where v.city is null;
alter table venues alter column city set not null;
alter table venues alter column city set default 'melb';
create index if not exists venues_city on venues(city);
create or replace function venues_city() returns trigger language plpgsql as $$
begin
  new.city := coalesce((select s.city from suburbs s where s.name = new.suburb and s.postcode = new.postcode), new.city, 'melb');
  return new;
end $$;
drop trigger if exists trg_venues_city on venues;
create trigger trg_venues_city before insert or update of suburb, postcode on venues for each row execute function venues_city();
alter table games add column if not exists city text references cities(key);
update games g set city = coalesce((select v.city from venues v where v.id = g.venue_id), 'melb') where g.city is null;
alter table games alter column city set not null;
alter table games alter column city set default 'melb';
create index if not exists games_city_start on games(city, starts_at);
create or replace function games_city() returns trigger language plpgsql as $$
begin
  new.city := coalesce((select v.city from venues v where v.id = new.venue_id), new.city, 'melb');   -- 球局的城市 = 球场的城市；私人球局自填场地时用邀约的城市
  return new;
end $$;
drop trigger if exists trg_games_city on games;
create trigger trg_games_city before insert or update of venue_id on games for each row execute function games_city();
alter table invites add column if not exists city text references cities(key);
update invites i set city = coalesce((select v.city from venues v where v.id = i.venue_id), 'melb') where i.city is null;
alter table invites alter column city set not null;
alter table invites alter column city set default 'melb';
alter table users add column if not exists home_city text not null default 'melb' references cities(key);
grant update (home_city) on users to nbq_user;
grant select (home_city) on users to nbq_admin;
-- 常用城市只能选已开放的
create or replace function users_home_city_check() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if current_setting('role') = 'nbq_user' and not exists (select 1 from cities where key = new.home_city and status in ('beta','on')) then perform nbq_err('city_closed', new.home_city); end if;
  return new;
end $$;
drop trigger if exists trg_users_home_city on users;
create trigger trg_users_home_city before update of home_city on users for each row execute function users_home_city_check();
-- 球员卡上带常用城市
create or replace view public_profiles as
select id, member_no, nickname, last_initial, utr, utr_estimated, avatar_kind, avatar_animal, avatar_color, seal_roll, card_theme, level, main_club_id,
       status in ('banned','deleted') as gone, home_city
from users;
grant select on public_profiles to nbq_user;

-- =====================================================================
-- ⑳ 按城市统计（地区扩展 R1-2，2026-10）：每个城市按自己的当地日期算「一天」
--   · events / sessions / link_visits 带城市（后端写入时填：客户端上报的当前城市，没有就用本人常用城市；默认墨尔本）
--   · 每天汇总（daily_people / daily_event_dims / daily_card_views / rollup_days）按（城市, 当地日期）存；每晚一次把所有城市的「昨天」都汇总
--   · 统计函数加 p_city：给城市 = 只算这个城市、按它的当地日期；不给 = 全部城市（各城市按各自的日期合计）
--   · 同一城市里区名唯一（跨城市可以同名）；区的别名按城市
-- =====================================================================
alter table events add column if not exists city text not null default 'melb';
alter table sessions add column if not exists city text not null default 'melb';
alter table link_visits add column if not exists city text not null default 'melb';
create unique index if not exists suburbs_city_name on suburbs(city, name);
alter table suburb_aliases add column if not exists city text not null default 'melb' references cities(key);
alter table suburb_aliases drop constraint if exists suburb_aliases_pkey;
alter table suburb_aliases add primary key (city, alias);

-- 汇总表加城市
alter table daily_people add column if not exists city text not null default 'melb';
alter table daily_people drop constraint if exists daily_people_pkey; alter table daily_people add primary key (day, city, who, device);
alter table daily_event_dims add column if not exists city text not null default 'melb';
alter table daily_event_dims drop constraint if exists daily_event_dims_pkey; alter table daily_event_dims add primary key (day, city, event, device, dim, who);
alter table daily_card_views add column if not exists city text not null default 'melb';
alter table daily_card_views drop constraint if exists daily_card_views_pkey; alter table daily_card_views add primary key (day, city, target_id, who);
alter table rollup_days add column if not exists city text not null default 'melb';
alter table rollup_days drop constraint if exists rollup_days_pkey; alter table rollup_days add primary key (day, city);

-- 参与统计的城市：不给城市时 = 已进入筹备 / 试运行 / 正式的城市（未开放的城市没有数据，不用逐个跑；城市一旦开过就不会再改回 off）
create or replace function stat_cities(p_city text default null) returns setof text language sql stable as $$
  select key from cities where (p_city is null and status <> 'off') or key = p_city
$$;

-- 汇总某一天（各城市按自己的当地日期）：只扫一次这一天前后的原始事件
create or replace function rollup_people(p_day date) returns int language plpgsql as $$
declare n int; lo timestamptz; hi timestamptz;
begin
  select min(city_day_start(key, p_day)), max(city_day_start(key, p_day + 1)) into lo, hi from cities;
  delete from daily_people where day = p_day;
  insert into daily_people(day, city, who, user_id, device, events)
  select p_day, e.city, coalesce(e.user_id::text, 'anon:' || e.anon_id), e.user_id, coalesce(e.device, 'unknown'), array_agg(distinct e.event)
  from events e join cities c on c.key = e.city
  where e.occurred_at >= lo and e.occurred_at < hi and (e.occurred_at at time zone c.tz)::date = p_day
  group by 2, 3, 4, 5;
  get diagnostics n = row_count;
  delete from daily_event_dims where day = p_day;
  insert into daily_event_dims(day, city, event, device, dim, who, n, ms)
  select p_day, e.city, e.event, coalesce(e.device, 'unknown'),
         case e.event when 'session_start' then coalesce(e.props->>'entry', 'direct') when 'game_view' then coalesce(e.props->>'via', 'other') else coalesce(e.props->>'screen', '') end,
         coalesce(e.user_id::text, 'anon:' || e.anon_id), count(*), sum((e.props->>'ms')::numeric) filter (where e.event = 'page_time')
  from events e join cities c on c.key = e.city
  where e.event in ('session_start','game_view','page_view','page_time') and e.occurred_at >= lo and e.occurred_at < hi and (e.occurred_at at time zone c.tz)::date = p_day
  group by 2, 3, 4, 5, 6;
  delete from daily_card_views where day = p_day;
  insert into daily_card_views(day, city, target_id, who, views, outside, landings)
  select p_day, e.city, (e.props->>'target_uid')::uuid, coalesce(e.user_id::text, 'anon:' || e.anon_id), count(*),
         count(*) filter (where e.props->>'via' in ('link','share_link','external')), count(*) filter (where e.props->>'via' in ('link','external'))
  from events e join cities c on c.key = e.city
  where e.event = 'card_view' and coalesce((e.props->>'own')::boolean, false) = false and e.props->>'target_uid' ~ '^[0-9a-f-]{36}$'
    and e.occurred_at >= lo and e.occurred_at < hi and (e.occurred_at at time zone c.tz)::date = p_day
  group by 2, 3, 4;
  insert into rollup_days(day, city) select p_day, key from cities on conflict (day, city) do update set rolled_at = now();
  return n;
end $$;

-- 任意区间里来过的人：给城市 = 这个城市的当地日期；不给 = 每个城市各算各的再合起来（每人每城市每天每设备一行）
drop view if exists v_user_retention;
drop function if exists people_between(timestamptz, timestamptz);
create or replace function people_between(p_from timestamptz, p_to timestamptz, p_city text default null)
returns table(day date, who text, user_id uuid, device text, events text[]) language plpgsql stable as $$
#variable_conflict use_column
declare c text; tz text; d date; d_end date; lo timestamptz; s timestamptz;
begin
  for c in select * from stat_cities(p_city) loop
    tz := city_tz(c); d := (p_from at time zone tz)::date; d_end := (p_to at time zone tz)::date; lo := p_from;
    while d <= d_end loop
      s := city_day_start(c, d);
      if s >= p_from and city_day_start(c, d + 1) <= p_to and exists (select 1 from rollup_days r where r.day = d and r.city = c) then
        if lo < s then
          return query select (e.occurred_at at time zone tz)::date, coalesce(e.user_id::text, 'anon:' || e.anon_id), e.user_id, coalesce(e.device, 'unknown'), array_agg(distinct e.event)
            from events e where e.city = c and e.occurred_at >= lo and e.occurred_at < s group by 1, 2, 3, 4;
        end if;
        return query select p.day, p.who, p.user_id, p.device, p.events from daily_people p where p.day = d and p.city = c;
        lo := city_day_start(c, d + 1);
      end if;
      d := d + 1;
    end loop;
    if lo < p_to then
      return query select (e.occurred_at at time zone tz)::date, coalesce(e.user_id::text, 'anon:' || e.anon_id), e.user_id, coalesce(e.device, 'unknown'), array_agg(distinct e.event)
        from events e where e.city = c and e.occurred_at >= lo and e.occurred_at < p_to group by 1, 2, 3, 4;
    end if;
  end loop;
end $$;
drop function if exists active_users(timestamptz, timestamptz);
create or replace function active_users(p_from timestamptz, p_to timestamptz, p_city text default null)
returns table(users bigint, anon_visitors bigint) language sql stable as $$
  select count(*) filter (where u is not null), count(*) filter (where u is null)
  from (select p.who, max(p.user_id::text) as u from people_between(p_from, p_to, p_city) p group by p.who) x
$$;
drop function if exists distinct_people(text, timestamptz, timestamptz, text, text);
create or replace function distinct_people(p_event text, p_from timestamptz, p_to timestamptz, p_device text default null, p_build text default null, p_city text default null)
returns bigint language sql stable as $$
  select case when p_build is null then
    (select count(distinct p.who) from people_between(p_from, p_to, p_city) p where p.events @> array[p_event] and (p_device is null or p.device = p_device))
  else
    (select count(*) from (select 1 from events e where e.event = p_event and e.occurred_at >= p_from and e.occurred_at < p_to
       and (p_device is null or e.device = p_device) and e.build = p_build and (p_city is null or e.city = p_city) group by coalesce(e.user_id::text, 'anon:' || e.anon_id)) x)
  end
$$;

-- 进入方式 / 来源 / 页面：同样按城市
drop function if exists event_dims_between(timestamptz, timestamptz, text[]);
create or replace function event_dims_between(p_from timestamptz, p_to timestamptz, p_events text[], p_city text default null)
returns table(event text, device text, dim text, who text, n bigint, ms numeric) language plpgsql stable as $$
declare c text; tz text; d date; d_end date; lo timestamptz; s timestamptz; raw text; days date[];
begin
  for c in select * from stat_cities(p_city) loop
    tz := city_tz(c); d := (p_from at time zone tz)::date; d_end := (p_to at time zone tz)::date; lo := p_from; raw := ''; days := '{}';
    while d <= d_end loop
      s := city_day_start(c, d);
      if s >= p_from and city_day_start(c, d + 1) <= p_to and exists (select 1 from rollup_days r where r.day = d and r.city = c) then
        if lo < s then raw := raw || format(' or (e.occurred_at >= %L and e.occurred_at < %L)', lo, s); end if;
        days := days || d; lo := city_day_start(c, d + 1);
      end if;
      d := d + 1;
    end loop;
    if lo < p_to then raw := raw || format(' or (e.occurred_at >= %L and e.occurred_at < %L)', lo, p_to); end if;
    return query execute format($q$
      select e.event, coalesce(e.device, 'unknown'),
             case e.event when 'session_start' then coalesce(e.props->>'entry', 'direct') when 'game_view' then coalesce(e.props->>'via', 'other') else coalesce(e.props->>'screen', '') end,
             coalesce(e.user_id::text, 'anon:' || e.anon_id), count(*), sum((e.props->>'ms')::numeric) filter (where e.event = 'page_time')
      from events e where e.city = $3 and e.event = any($1) and (false %s) group by 1, 2, 3, 4
      union all
      select x.event, x.device, x.dim, x.who, x.n::bigint, x.ms from daily_event_dims x where x.city = $3 and x.day = any($2) and x.event = any($1)$q$, raw) using p_events, days, c;
  end loop;
end $$;

-- 球员卡被查看：按城市（看的人当时所在的城市）
drop view if exists v_card_views_30d;
drop function if exists card_views(timestamptz, timestamptz);
create or replace function card_views(p_from timestamptz, p_to timestamptz, p_city text default null)
returns table(user_id uuid, views bigint, from_outside bigint, external_landings bigint, viewers bigint) language plpgsql as $$   -- 用临时表合并各城市，所以不是 stable
declare c text; tz text; d date; d_end date; lo timestamptz; s timestamptz; raw text; days date[];
begin
  create temp table if not exists _cv(t uuid, w text, n bigint, o bigint, x bigint) on commit drop;
  delete from _cv;
  for c in select * from stat_cities(p_city) loop
    tz := city_tz(c); d := (p_from at time zone tz)::date; d_end := (p_to at time zone tz)::date; lo := p_from; raw := ''; days := '{}';
    while d <= d_end loop
      s := city_day_start(c, d);
      if s >= p_from and city_day_start(c, d + 1) <= p_to and exists (select 1 from rollup_days r where r.day = d and r.city = c) then
        if lo < s then raw := raw || format(' or (e.occurred_at >= %L and e.occurred_at < %L)', lo, s); end if;
        days := days || d; lo := city_day_start(c, d + 1);
      end if;
      d := d + 1;
    end loop;
    if lo < p_to then raw := raw || format(' or (e.occurred_at >= %L and e.occurred_at < %L)', lo, p_to); end if;
    execute format($q$
      insert into _cv
      select (e.props->>'target_uid')::uuid, coalesce(e.user_id::text, 'anon:' || e.anon_id), count(*),
             count(*) filter (where e.props->>'via' in ('link','share_link','external')), count(*) filter (where e.props->>'via' in ('link','external'))
      from events e
      where e.city = $2 and e.event = 'card_view' and (false %s) and coalesce((e.props->>'own')::boolean, false) = false and e.props->>'target_uid' ~ '^[0-9a-f-]{36}$'
      group by 1, 2
      union all select v.target_id, v.who, v.views::bigint, v.outside::bigint, v.landings::bigint from daily_card_views v where v.city = $2 and v.day = any($1)$q$, raw) using days, c;
  end loop;
  return query select t, sum(n)::bigint, sum(o)::bigint, sum(x)::bigint, count(distinct w) from _cv group by t;
end $$;

-- 活跃分：给城市 = 常用城市在这里的人
drop view if exists v_user_activity_7d;
drop function if exists user_activity(timestamptz, timestamptz);
create or replace function user_activity(p_from timestamptz, p_to timestamptz, p_city text default null)
returns table(user_id uuid, member_no bigint, nickname text, host_ok bigint, played bigint, apply bigint,
              invite bigint, impression bigint, active_day bigint, no_show bigint, score numeric)
language sql stable as $$
  with h as (select f.host_id as u, count(*) as n from v_game_fill f where f.full_at_start and f.starts_at >= p_from and f.starts_at < p_to group by 1),
  pl as (select c.user_id as u, count(*) as n from v_counted_games c where c.starts_at >= p_from and c.starts_at < p_to group by 1),
  ap as (select p.user_id as u, count(*) as n from game_participants p where p.role = 'player' and p.created_at >= p_from and p.created_at < p_to group by 1),
  iv as (select i.from_user as u, count(*) as n from invites i where i.created_at >= p_from and i.created_at < p_to group by 1),
  im as (select m.from_id as u, count(*) as n from impressions m where m.created_at >= p_from and m.created_at < p_to group by 1),
  ad as (select x.user_id as u, count(distinct x.day) as n from people_between(p_from, p_to, p_city) x where x.user_id is not null group by 1),
  ns as (select n.user_id as u, count(*) as n from v_confirmed_noshow n where n.starts_at >= p_from and n.starts_at < p_to group by 1),
  w as (select coalesce(sum(weight) filter (where k = 'host_ok'), 0) as wh, coalesce(sum(weight) filter (where k = 'played'), 0) as wp,
               coalesce(sum(weight) filter (where k = 'apply'), 0) as wa, coalesce(sum(weight) filter (where k = 'invite'), 0) as wi,
               coalesce(sum(weight) filter (where k = 'impression'), 0) as wm, coalesce(sum(weight) filter (where k = 'active_day'), 0) as wd,
               coalesce(sum(weight) filter (where k = 'no_show'), 0) as wn from activity_weights),
  x as (select u.id, u.member_no, u.nickname, coalesce(h.n, 0) as host_ok, coalesce(pl.n, 0) as played, coalesce(ap.n, 0) as apply, coalesce(iv.n, 0) as invite,
               coalesce(im.n, 0) as impression, coalesce(ad.n, 0) as active_day, coalesce(ns.n, 0) as no_show
        from users u left join h on h.u = u.id left join pl on pl.u = u.id left join ap on ap.u = u.id left join iv on iv.u = u.id
        left join im on im.u = u.id left join ad on ad.u = u.id left join ns on ns.u = u.id
        where p_city is null or u.home_city = p_city)
  select x.id, x.member_no, x.nickname, x.host_ok, x.played, x.apply, x.invite, x.impression, x.active_day, x.no_show,
         (w.wh * x.host_ok + w.wp * x.played + w.wa * x.apply + w.wi * x.invite + w.wm * x.impression + w.wd * x.active_day + w.wn * x.no_show)::numeric
  from x cross join w
$$;

-- 今天：每个城市按自己的「今天」；给城市只看这个城市
drop function if exists today_board();
create or replace function today_board(p_city text default null)
returns table(left_n bigint, filled_n bigint, short_n bigint, soon_short bigint, cancelled_n bigint, pending_n bigint, expiring_n bigint, unmet_n bigint)
language sql stable as $$
  with b as (select c.key, ((now() at time zone c.tz)::date)::timestamp at time zone c.tz as d0, ((now() at time zone c.tz)::date + 1)::timestamp at time zone c.tz as d1
              from cities c where p_city is null or c.key = p_city),
  g as (select g.*, (select count(*) from game_participants p where p.game_id=g.id and p.status='approved') + g.filled >= g.capacity as ok
          from b join games g on g.city = b.key and g.starts_at >= b.d0 and g.starts_at < b.d1 where g.visibility='public'),
  up as (select * from g where g.starts_at >= now() and g.status <> 'cancelled'),
  pend as (select p.*, g.starts_at from game_participants p join games g on g.id=p.game_id
            where p.role='player' and p.status='pending' and g.visibility='public' and g.starts_at > now() and (p_city is null or g.city = p_city)),
  lost as (select distinct p.user_id from game_participants p join g on g.id=p.game_id where p.role='player' and p.status in ('expired','rejected')),
  inn  as (select distinct p.user_id from game_participants p join g on g.id=p.game_id where p.status='approved')
  select (select count(*) from up), (select count(*) from up where ok), (select count(*) from up where not ok),
         (select count(*) from up where not ok and starts_at < now() + interval '2 hours'),
         (select count(*) from g where status='cancelled'),
         (select count(*) from pend), (select count(*) from pend where application_deadline(created_at, starts_at) < now() + interval '15 minutes'),
         (select count(*) from lost where user_id not in (select user_id from inn))
$$;

-- 开打时间分布：按球局城市的当地星期 / 钟点
drop function if exists start_heatmap(timestamptz, timestamptz);
create or replace function start_heatmap(p_from timestamptz, p_to timestamptz, p_city text default null)
returns table(dow int, hour int, games bigint, cancelled bigint) language sql stable as $$
  select extract(isodow from g.starts_at at time zone c.tz)::int, extract(hour from g.starts_at at time zone c.tz)::int,
         count(*), count(*) filter (where g.status='cancelled')
  from games g join cities c on c.key = g.city where g.visibility='public' and g.starts_at >= p_from and g.starts_at < least(p_to, now()) and (p_city is null or g.city = p_city)
  group by 1, 2
$$;

-- 分享带来的注册：「当天注册」按注册人常用城市的当地日期
drop function if exists share_attribution(timestamptz, timestamptz);
create or replace function share_attribution(p_from timestamptz, p_to timestamptz, p_city text default null)
returns table(kind text, channel text, shares bigint, opens bigint, signups bigint) language sql stable as $$
  with sh as (
    select case when event='card_share' then 'card' else 'game' end as kind,
           case when event='card_share' then coalesce(props->>'channel','other')
                when event in ('share_xhs_copy','poster_open') then 'xhs' when event='share_copy_text' then 'wechat'
                when event='share_copy_link' then 'copy' else 'system' end as channel
      from events where event in ('card_share','share_copy_link','share_copy_text','share_system','share_xhs_copy')
       and coalesce((props->>'ok')::boolean, true) and occurred_at >= p_from and occurred_at < p_to and (p_city is null or city = p_city)),
  op as (select case when l.game_id is null then 'card' else 'game' end as kind, coalesce(l.source,'other') as channel, l.visitor_id, l.user_id, l.created_at
           from link_visits l where l.created_at >= p_from and l.created_at < p_to and (p_city is null or l.city = p_city)),
  k as (select kind, channel from sh union select kind, channel from op)
  select k.kind, k.channel, (select count(*) from sh where sh.kind=k.kind and sh.channel=k.channel),
         (select count(*) from op where op.kind=k.kind and op.channel=k.channel),
         (select count(distinct op.user_id) from op join users u on u.id=op.user_id join cities c on c.key = u.home_city
           where op.kind=k.kind and op.channel=k.channel
             and (u.created_at at time zone c.tz)::date = (op.created_at at time zone c.tz)::date)
  from k
$$;

-- 视图：开打时段 / 每天申请 / 新用户留存 —— 带城市、按当地时间
create or replace view v_user_activity_7d as select * from user_activity(now() - interval '7 days', now());
create or replace view v_card_views_30d as select * from card_views(now() - interval '30 days', now());
drop view if exists admin_game_slots;
create view admin_game_slots as
select g.id, g.starts_at, g.city,
  case when (g.starts_at at time zone ct.tz)::time <= time '08:00' then 'early'
       when (g.starts_at at time zone ct.tz)::time <  time '12:00' then 'am'
       when (g.starts_at at time zone ct.tz)::time <  time '17:00' then 'pm'
       when (g.starts_at at time zone ct.tz)::time <  time '19:00' then 'dusk'
       else 'night' end as slot,
  extract(isodow from g.starts_at at time zone ct.tz)::int as dow,
  f.full_at_start, c.reason
from games g join cities ct on ct.key = g.city left join v_game_fill f on f.game_id=g.id left join game_start_checks c on c.game_id=g.id;
drop view if exists v_applications_daily;
create view v_applications_daily as
select g.city, date(p.created_at at time zone c.tz) as day,
  count(*) as applications, count(distinct p.user_id) as applicants,
  count(*) filter (where p.status='approved')  as approved,
  count(*) filter (where p.status='rejected')  as declined,
  count(*) filter (where p.status='expired')   as expired,
  count(*) filter (where p.status='withdrawn') as withdrawn,
  count(*) filter (where p.status='left')      as left_after_approved,
  count(*) filter (where p.status='pending')   as pending
from game_participants p join games g on g.id = p.game_id join cities c on c.key = g.city where p.role='player' group by 1, 2;
create view v_user_retention as
with u as (select x.id, x.home_city as city, (x.created_at at time zone c.tz)::date as d0, (now() at time zone c.tz)::date as t
              from users x join cities c on c.key = x.home_city where x.created_at > now() - interval '90 days'),
     a as (select distinct p.user_id, p.day from people_between(now() - interval '121 days', now()) p where p.user_id is not null)
select u.id as user_id, u.city, u.d0 as signup_day, date_trunc('week', u.d0)::date as signup_week,
       case when u.d0 + 1  <= u.t then coalesce(bool_or(a.day = u.d0 + 1), false)  end as d1,
       case when u.d0 + 7  <= u.t then coalesce(bool_or(a.day = u.d0 + 7), false)  end as d7,
       case when u.d0 + 30 <= u.t then coalesce(bool_or(a.day = u.d0 + 30), false) end as d30
from u left join a on a.user_id = u.id and a.day in (u.d0 + 1, u.d0 + 7, u.d0 + 30)
group by u.id, u.city, u.d0, u.t;

-- 每晚：所有城市的最近 3 个「昨天」（按最晚的那个城市的今天算，确保每个城市的这些天都已结束）
create or replace function job_nightly(p_now timestamptz default now()) returns int language plpgsql security definer set search_path = public as $$
declare t0 timestamptz := clock_timestamp(); d date := (select min((p_now at time zone tz)::date) from cities); n int := 0;
begin
  for i in 1..3 loop n := n + rollup_people(d - i); end loop;
  perform job_anonymize_deleted(p_now);
  perform job_retention(p_now);
  delete from rate_hits where at < p_now - interval '31 days';
  delete from risk_events where at < p_now - interval '90 days';
  update users set signup_ip = null where signup_ip is not null and created_at < p_now - interval '30 days';
  return nbq_job_log('nightly', n, t0);
end $$;

-- 权限：后台 / 只读照旧能调统计函数；视图重建后补授权
grant select on v_user_retention, v_applications_daily, admin_game_slots, v_user_activity_7d, v_card_views_30d to nbq_admin;
grant select on v_user_retention, v_applications_daily, admin_game_slots to nbq_viewer;
-- 统计函数照旧以定义者身份运行（只读角色能调用，但不能直接查原始表）
do $$ declare f record; begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.proname in ('people_between','active_users','distinct_people','event_dims_between','card_views','user_activity','today_board','start_heatmap','share_attribution','stat_cities') loop
    execute format('alter function %s security definer set search_path = public', f.sig);
  end loop; end $$;
grant execute on function people_between(timestamptz, timestamptz, text), active_users(timestamptz, timestamptz, text), distinct_people(text, timestamptz, timestamptz, text, text, text),
  event_dims_between(timestamptz, timestamptz, text[], text), card_views(timestamptz, timestamptz, text), user_activity(timestamptz, timestamptz, text),
  today_board(text), start_heatmap(timestamptz, timestamptz, text), share_attribution(timestamptz, timestamptz, text), stat_cities(text) to nbq_admin, nbq_viewer;
revoke execute on function people_between(timestamptz, timestamptz, text), active_users(timestamptz, timestamptz, text), distinct_people(text, timestamptz, timestamptz, text, text, text),
  event_dims_between(timestamptz, timestamptz, text[], text), card_views(timestamptz, timestamptz, text), user_activity(timestamptz, timestamptz, text),
  today_board(text), start_heatmap(timestamptz, timestamptz, text), share_attribution(timestamptz, timestamptz, text), stat_cities(text), rollup_people(date) from public, nbq_user;

-- =====================================================================
-- ㉑ 后端按城市 / 国家（地区扩展 R2，2026-10）：手机号和验证码按国家 · 系统状态的业务指标按城市 · 定时任务的时间
--   · countries：每个国家一行（现在只有澳洲）。手机号格式、显示提示、短信发件名和模板、短信服务商都从这里读，代码里不写死
--   · auth_otp_send 先按号码认出国家（认不出 / 国家没开放 → invalid），返回这个国家的短信配置给后端用
--   · 业务类 4 项检查（人齐率骤降、新注册骤降、举报激增、申请失效率）对每个正式开放（on）的城市各算一行：
--     悉尼人齐率骤降不会被墨尔本的平均值掩盖；试运行（beta）的城市数据太少，不报警
--   · 发送程序（server/notify）：夜间不打扰按收提醒的人常用城市的时区和时段；每天 5 封邮件按他那边的自然日；提醒里的开打时间按球局城市当地时间
--   · 每晚任务 16:10 UTC：此时澳洲每个城市都已过了当地午夜（最晚的珀斯是 00:10），且都早于当地 06:00
-- =====================================================================
create table if not exists countries (
  code        text primary key check (code ~ '^[A-Z]{2}$'),
  name_zh     text not null,
  status      text not null default 'off' check (status in ('off','on')),
  dial        text not null check (dial ~ '^\+[0-9]{1,3}$'),       -- 国家代码
  phone_re    text not null,                                       -- 完整 E.164 手机号的格式
  phone_hint  text not null,                                       -- 输入框提示
  sms_provider text not null default 'supabase',                   -- 发验证码用哪家（Supabase 手机登录背后的短信服务）
  sms_sender  text not null,                                       -- 短信发件名
  otp_template text not null check (otp_template like '%{code}%')  -- 验证码短信内容
);
insert into countries(code, name_zh, status, dial, phone_re, phone_hint, sms_sender, otp_template) values
 ('AU', '澳大利亚', 'on', '+61', '^\+614[0-9]{8}$', '04xx xxx xxx', 'NanBanQiu', '南伴球验证码：{code}，5 分钟内有效。NanBanQiu code: {code}')
on conflict (code) do nothing;
create or replace function countries_re_check() returns trigger language plpgsql as $$
begin perform '' ~ new.phone_re; return new; end $$;   -- 格式写错直接报错
drop trigger if exists trg_countries_re_check on countries;
create trigger trg_countries_re_check before insert or update of phone_re on countries for each row execute function countries_re_check();
-- 城市属于哪个国家：原来的写死检查换成外键
alter table cities drop constraint if exists cities_country_check;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'cities_country_fk') then
    alter table cities add constraint cities_country_fk foreign key (country) references countries(code);
  end if; end $$;
alter table countries enable row level security;
drop policy if exists ct_read on countries; create policy ct_read on countries for select to nbq_user using (status = 'on');   -- 前台读手机号格式和提示
drop policy if exists adm_read on countries; create policy adm_read on countries for select to nbq_admin, nbq_viewer using (true);
drop policy if exists svc_all on countries; create policy svc_all on countries to nbq_service using (true) with check (true);
grant select on countries to nbq_admin, nbq_viewer; grant all on countries to nbq_service;
grant select (code, name_zh, status, dial, phone_re, phone_hint) on countries to nbq_user;   -- 短信配置前台看不到

-- 号码属于哪个已开放的国家；认不出 = null
create or replace function nbq_phone_country(p_phone text) returns text language sql stable security definer set search_path = public as $$
  select code from countries where status = 'on' and p_phone ~ phone_re order by code limit 1
$$;
-- 发验证码：格式按国家；返回 { country, provider, sender, template } 给后端发短信
drop function if exists auth_otp_send(text, text);
create or replace function auth_otp_send(p_phone text, p_ip text) returns jsonb language plpgsql security definer set search_path = public as $$
declare k countries;
begin
  select * into k from countries where code = nbq_phone_country(p_phone);
  if p_phone is null or k.code is null then perform nbq_err('invalid', 'phone'); end if;
  if exists (select 1 from rate_rules r where r.rule = 'otp_fail' and r.enabled and (select count(*) from rate_hits h where h.subject = 'phone:' || p_phone and h.grp = 'otp_fail' and h.at > now() - r.win) >= r.max_hits) then
    perform nbq_rate('phone:' || p_phone, 'otp_fail', p_phone);   -- 锁定中：报 otp_locked 和剩余秒数
  end if;
  perform nbq_rate('ip:' || coalesce(p_ip, '?'), 'otp_ip', p_ip);
  perform nbq_rate('phone:' || p_phone, 'otp_send', p_phone);
  return jsonb_build_object('country', k.code, 'provider', k.sms_provider, 'sender', k.sms_sender, 'template', k.otp_template);
end $$;
revoke execute on function auth_otp_send(text, text), nbq_phone_country(text) from public, nbq_user, nbq_viewer, nbq_admin;
grant execute on function auth_otp_send(text, text), nbq_phone_country(text) to nbq_service;

-- 报警记录带城市（系统类为空）；同一项同一城市同时只有一条没恢复的
alter table monitor_alerts add column if not exists city text references cities(key);
drop index if exists monitor_alerts_open;
create unique index if not exists monitor_alerts_open on monitor_alerts(code, coalesce(city, '')) where resolved_at is null;
update monitor_thresholds set note = note || '；每个正式开放的城市各算一行' where area = '业务' and note not like '%每个正式开放的城市%';

-- 16 项检查；业务类按城市（球局按球场城市、注册和举报按本人常用城市）
drop function if exists monitor_checks(timestamptz);
create or replace function monitor_checks(p_now timestamptz default now())
returns table(code text, area text, label text, level text, value numeric, warn numeric, crit numeric, note text, city text, city_name text)
language plpgsql stable security definer set search_path = public as $$
declare v numeric; base numeric; n numeric; t monitor_thresholds; lv text; cy record;
begin
  for t in select * from monitor_thresholds m order by m.area desc, m.code loop
   for cy in select null::text k, null::text nm, 0 s where t.area <> '业务'
             union all select c.key, c.name_zh, c.sort from cities c where t.area = '业务' and c.status = 'on' order by 3 loop
    v := null; lv := 'ok';
    case t.code
    when 'jobs_stale' then
      select count(*) into v from (values ('expire_applications',5),('start_checks',5),('soon_reminders',5),('unfilled_reminders',15),('recap_notices',30),('restore_suspended',30),
                                          ('expire_invites',45),('risk_scores',150),('sb_hourly',150),('nightly',1560)) j(job, mins)
       where coalesce((select max(r.started_at) from job_runs r where r.job = j.job and r.ok), '-infinity') < p_now - make_interval(mins => j.mins);
    when 'notif_backlog' then
      select count(*) into v from notifications x where x.pushed_at is null and coalesce(x.send_after, x.created_at) < p_now - interval '5 minutes';
    when 'push_fail_rate' then
      select count(*) into n from notification_deliveries d where d.channel in ('push_mobile','push_desktop') and d.at > p_now - interval '1 hour';
      select count(*) into v from delivery_errors e where e.channel like 'push%' and e.at > p_now - interval '1 hour';
      v := case when n + v >= 20 then round(v / (n + v), 3) end;
    when 'email_bounce' then
      select count(*) filter (where o.status = 'bounced'), count(*) filter (where o.status in ('sent','bounced')) into v, n from email_outbox o where o.sent_at > p_now - interval '7 days';
      v := case when n >= 20 then round(v / n, 3) end;
    when 'email_failed' then
      select count(*) into v from delivery_errors e where e.channel = 'email' and e.at > p_now - interval '1 hour';
    when 'otp_fail' then
      select count(*) into v from rate_hits h where h.grp = 'otp_fail' and h.at > p_now - interval '1 hour';
    when 'rate_hit_spike' then
      select count(*) into n from risk_events e where e.kind = 'rate_hit' and e.at > p_now - interval '1 hour';
      select count(*) / 168.0 into base from risk_events e where e.kind = 'rate_hit' and e.at <= p_now - interval '1 hour' and e.at > p_now - interval '7 days 1 hour';
      v := case when n >= 30 then round(n / greatest(base, 1), 2) end;
    when 'client_errors' then
      select coalesce(sum(c.n), 0) into n from client_errors c where c.hour >= date_trunc('hour', p_now - interval '1 hour') and c.hour <= p_now;
      select coalesce(sum(c.n), 0) / 168.0 into base from client_errors c where c.hour < date_trunc('hour', p_now - interval '1 hour') and c.hour >= p_now - interval '7 days 1 hour';
      v := case when n >= 20 then round(n / greatest(base, 1), 2) end;
    when 'db_connections' then
      select round(count(*)::numeric / current_setting('max_connections')::numeric, 3) into v from pg_stat_activity;
    when 'long_queries' then
      select count(*) into v from pg_stat_activity a where a.state = 'active' and a.pid <> pg_backend_pid() and a.query_start < clock_timestamp() - interval '60 seconds';
    when 'restore_drill' then
      select round(extract(epoch from p_now - max(d.at)) / 86400, 1) into v from ops_drills d where d.ok;
      v := coalesce(v, 999);
    when 'fill_rate_drop' then
      select count(*), avg(case when f.full_at_start then 1.0 else 0 end) into n, v from v_game_fill f join games g on g.id = f.game_id
       where g.city = cy.k and f.starts_at > p_now - interval '24 hours' and f.starts_at <= p_now;
      select avg(case when f.full_at_start then 1.0 else 0 end) into base from v_game_fill f join games g on g.id = f.game_id, generate_series(1, 4) w
       where g.city = cy.k and f.starts_at > p_now - make_interval(days => 7 * w) - interval '24 hours' and f.starts_at <= p_now - make_interval(days => 7 * w);
      v := case when n >= 10 and base > 0 then round(v / base, 3) end;
    when 'signup_drop' then
      select count(*) into n from users u where u.home_city = cy.k and u.created_at > p_now - interval '24 hours' and u.created_at <= p_now;
      select count(*) / 4.0 into base from users u, generate_series(1, 4) w where u.home_city = cy.k and u.created_at > p_now - make_interval(days => 7 * w) - interval '24 hours' and u.created_at <= p_now - make_interval(days => 7 * w);
      v := case when base >= 10 then round(n / base, 3) end;
    when 'reports_spike' then
      select count(*) into n from reports r join users u on u.id = r.reporter_id where u.home_city = cy.k and r.created_at > p_now - interval '24 hours';
      select count(*) / 28.0 into base from reports r join users u on u.id = r.reporter_id where u.home_city = cy.k and r.created_at <= p_now - interval '24 hours' and r.created_at > p_now - interval '29 days';
      v := case when n >= 5 then round(n / greatest(base, 0.5), 2) end;
    when 'expiry_rate' then
      select count(*) filter (where p.status = 'expired'), count(*) into v, n from game_participants p join games g on g.id = p.game_id
       where g.city = cy.k and p.role = 'player' and p.decided_at > p_now - interval '7 days' and p.status in ('approved','rejected','expired') and p.via = 'request';
      v := case when n >= 20 then round(v / n, 3) end;
    when 'sender_stale' then
      if exists (select 1 from notifications x where x.pushed_at is null and coalesce(x.send_after, x.created_at) <= p_now) then
        select round(extract(epoch from p_now - h.at) / 60, 1) into v from ops_heartbeats h where h.name = 'sender';
        v := coalesce(v, 999);
      end if;
    else null;
    end case;
    if v is not null then
      if t.code in ('fill_rate_drop','signup_drop') then
        lv := case when t.crit is not null and v <= t.crit then 'crit' when v <= t.warn then 'warn' else 'ok' end;
      else
        lv := case when t.crit is not null and v >= t.crit then 'crit' when v >= t.warn then 'warn' else 'ok' end;
      end if;
    end if;
    code := t.code; area := t.area; label := t.label; level := lv; value := v; warn := t.warn; crit := t.crit; note := t.note; city := cy.k; city_name := cy.nm;
    return next;
   end loop;
  end loop;
end $$;

-- 每 5 分钟：开 / 升级 / 恢复报警（按 项 + 城市）；返回 [{code,label,level,value,kind,city}]，业务类的名称带城市（「人齐率骤降 · 悉尼」）
--   城市不再正式开放（改回 beta / off）后，它没恢复的报警自动关掉
create or replace function job_monitor(p_now timestamptz default now()) returns jsonb language plpgsql security definer set search_path = public as $$
declare t0 timestamptz := clock_timestamp(); c record; a monitor_alerts; out jsonb := '[]'; nm text;
begin
  for c in select * from monitor_checks(p_now) loop
    nm := c.label || coalesce(' · ' || c.city_name, '');
    select * into a from monitor_alerts m where m.code = c.code and m.city is not distinct from c.city and m.resolved_at is null;
    if c.level = 'ok' then
      if found then
        update monitor_alerts set resolved_at = p_now, last_seen_at = p_now where id = a.id;
        out := out || jsonb_build_object('code', c.code, 'label', nm, 'level', 'ok', 'value', c.value, 'kind', 'resolved', 'city', c.city);
      end if;
    elsif not found then
      insert into monitor_alerts(code, city, level, value, note, opened_at, last_seen_at, notified_at) values (c.code, c.city, c.level, c.value, c.note, p_now, p_now, p_now);
      out := out || jsonb_build_object('code', c.code, 'label', nm, 'level', c.level, 'value', c.value, 'kind', 'new', 'city', c.city);
    elsif c.level = 'crit' and a.level = 'warn' then
      update monitor_alerts set level = 'crit', value = c.value, last_seen_at = p_now, notified_at = p_now where id = a.id;
      out := out || jsonb_build_object('code', c.code, 'label', nm, 'level', 'crit', 'value', c.value, 'kind', 'escalate', 'city', c.city);
    elsif a.notified_at <= p_now - interval '6 hours' then
      update monitor_alerts set value = c.value, level = c.level, last_seen_at = p_now, notified_at = p_now where id = a.id;
      out := out || jsonb_build_object('code', c.code, 'label', nm, 'level', c.level, 'value', c.value, 'kind', 'remind', 'city', c.city);
    else
      update monitor_alerts set value = c.value, level = case when c.level = 'crit' then 'crit' else a.level end, last_seen_at = p_now where id = a.id;
    end if;
  end loop;
  update monitor_alerts m set resolved_at = p_now where m.resolved_at is null and m.city is not null
     and not exists (select 1 from cities x where x.key = m.city and x.status = 'on');
  perform nbq_job_log('monitor', jsonb_array_length(out), t0);
  return out;
end $$;
revoke execute on function monitor_checks(timestamptz), job_monitor(timestamptz) from public, nbq_user, nbq_viewer;
grant execute on function job_monitor(timestamptz) to nbq_service;
grant execute on function monitor_checks(timestamptz) to nbq_service, nbq_admin;

-- =====================================================================
-- ㉒ 城市网址（地区扩展 R3，2026-10）：每个城市一个网址 nanbanqiu.app/<slug>（/melbourne、/sydney……）
--   · slug 决定页面上的城市；不带城市 → 墨尔本。分享链接保持短链接 /g/码、/p/编号，后端按球局 / 球员的城市跳到 /<slug>/…
--   · center_label：默认位置的名称（没有定位时「以 Melbourne CBD 为中心」）
--   · 前台两端的 CITIES 与这里逐条相同（tests/static/cities_front.mjs）
-- =====================================================================
alter table cities add column if not exists slug text;
alter table cities add column if not exists center_label text;
update cities c set slug = v.slug, center_label = v.lbl from (values
  ('melb','melbourne','Melbourne CBD'),('syd','sydney','Sydney CBD'),('bne','brisbane','Brisbane City'),
  ('per','perth','Perth'),('adl','adelaide','Adelaide'),('cbr','canberra','Canberra City')) v(key, slug, lbl)
 where c.key = v.key and c.slug is null;
alter table cities alter column slug set not null, alter column center_label set not null;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'cities_slug_key') then alter table cities add constraint cities_slug_key unique (slug); end if;
  if not exists (select 1 from pg_constraint where conname = 'cities_slug_check') then alter table cities add constraint cities_slug_check check (slug ~ '^[a-z]{3,20}$' and slug not in ('g','p','api','admin','og','unsub','community','privacy','terms','static','assets')); end if;
end $$;
-- 网址 → 城市（后端路由用；认不出 = null，由后端按墨尔本处理）
create or replace function city_by_slug(p_slug text) returns text language sql stable security definer set search_path = public as $$
  select key from cities where slug = lower(p_slug)
$$;
grant execute on function city_by_slug(text) to nbq_service, nbq_user, nbq_admin, nbq_viewer;

-- =====================================================================
-- ㉓ 城市网址（地区扩展 R3-2，2026-10）：短链接跳转 · 「即将开放」的开放时通知我 · 频率限制
--   · route_city(kind, code)：短链接 /g/码、/p/编号 → 球局 / 球员所在城市的网址 slug（server/routes.mjs 用；找不到 = null，按墨尔本）
--   · 打开还没开放的城市（/sydney）→ 页面显示「悉尼即将开放」，留邮箱「开放时通知我」：
--     POST /api/city-waitlist {city, email} → 后端以 nbq_service 调 api_city_waitlist(city, email, ip)；
--     只收未开放 / 筹备中的城市；同一城市同一邮箱只记一次；同一 IP 每小时 5 次（waitlist_ip）
--   · 保存期限：开放后通知过的 30 天内删除；没通知的最多保留 2 年（每晚任务清理）
-- =====================================================================
alter table area_demand drop constraint if exists area_demand_kind_check;
alter table area_demand add constraint area_demand_kind_check check (kind in ('search_miss','geo_outside','city_waitlist'));
alter table area_demand add column if not exists city text references cities(key);
alter table area_demand add column if not exists email text;
alter table area_demand add column if not exists notified_at timestamptz;
create unique index if not exists area_demand_waitlist on area_demand(city, lower(email)) where kind = 'city_waitlist';
-- 前台直接写的只能是搜索没找到 / 定位在外面这两种，不能留邮箱
drop policy if exists ad_new on area_demand;
create policy ad_new on area_demand for insert to nbq_user with check (kind in ('search_miss','geo_outside') and email is null);

insert into rate_rules(rule, grp, win, max_hits, per_key, code, note) values
 ('waitlist_ip', 'waitlist_ip', '1 hour', 5, true, 'rate_limited', '开放时通知我：同一 IP 每小时 5 次')
on conflict (rule) do nothing;

create or replace function api_city_waitlist(p_city text, p_email text, p_ip text) returns boolean language plpgsql security definer set search_path = public as $$
declare st text; e text := lower(trim(coalesce(p_email, ''))); n int;
begin
  select status into st from cities where key = p_city;
  if st is null or st not in ('off','prep') then perform nbq_err('invalid', 'city'); end if;
  if e !~ '^[^@\s]+@[^@\s]+\.[a-z]{2,}$' or length(e) > 200 then perform nbq_err('invalid', 'email'); end if;
  perform nbq_rate('ip:' || coalesce(p_ip, '?'), 'waitlist_ip', p_ip);
  insert into area_demand(kind, city, email, notify_me) values ('city_waitlist', p_city, e, true) on conflict do nothing;
  get diagnostics n = row_count;
  return n = 1;   -- false = 这个邮箱已经登记过（页面照样显示「已登记」）
end $$;
-- 短链接的城市
create or replace function route_city(p_kind text, p_code text) returns text language sql stable security definer set search_path = public as $$
  select c.slug from cities c where c.key = case p_kind
    when 'g' then (select g.city from games g where g.share_code = p_code)
    when 'p' then (select u.home_city from users u where p_code ~ '^[0-9]{1,12}$' and u.member_no = p_code::bigint and u.status <> 'deleted')
  end
$$;
revoke execute on function api_city_waitlist(text, text, text), route_city(text, text) from public, nbq_user, nbq_viewer, nbq_admin;
grant execute on function api_city_waitlist(text, text, text), route_city(text, text) to nbq_service;

-- 球场简称在「区」里唯一：区名跨城市会重名（Brighton VIC 3186 / SA 5048），改成按（简称, 区名, 邮编）
alter table venues drop constraint if exists venues_short_name_suburb_key;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'venues_short_name_suburb_pc_key') then
    alter table venues add constraint venues_short_name_suburb_pc_key unique nulls not distinct (short_name, suburb, postcode);
  end if; end $$;

-- 每晚：在 ⑳ 的基础上加「开放时通知我」的清理
create or replace function job_nightly(p_now timestamptz default now()) returns int language plpgsql security definer set search_path = public as $$
declare t0 timestamptz := clock_timestamp(); d date := (select min((p_now at time zone tz)::date) from cities); n int := 0;
begin
  for i in 1..3 loop n := n + rollup_people(d - i); end loop;
  perform job_anonymize_deleted(p_now);
  perform job_retention(p_now);
  delete from rate_hits where at < p_now - interval '31 days';
  delete from risk_events where at < p_now - interval '90 days';
  update users set signup_ip = null where signup_ip is not null and created_at < p_now - interval '30 days';
  delete from area_demand where kind = 'city_waitlist' and (notified_at < p_now - interval '30 days' or created_at < p_now - interval '2 years');
  perform racket_rollup(d - 1);   -- 我的球拍（#60 A5）：昨天结束时的持有人数快照
  return nbq_job_log('nightly', n, t0);
end $$;

-- =====================================================================
-- ㉔ 后台按城市（地区扩展 R4，2026-10）：运营按城市授权 · 城市页（状态、导入情况、上线检查清单、开放时通知我）
--   · admin_users.cities：空 = 全部城市（超级管理员一律全部）；运营 / 只读可以只负责某几个城市
--   · 处理类操作按对象所在城市检查（球友 = 常用城市、举报 = 举报人的常用城市、消息 = 发送人、球场 = 球场城市、风险提醒 = 那位球友、城市 = 城市本身）；
--     不负责的城市 → admin_forbidden（detail = city）。导出、改规则、管理管理员这类全局操作只有「全部城市」的人能做
--   · 读：球友、球局、球场三张表对只负责部分城市的人只显示这些城市；统计函数（stat_cities）也只算这些城市。
--     其余明细表和汇总视图不按城市隔离（都是同事，后台本来就要按页面权限看；要外包运营时再收紧）
--   · 上线状态：未开放 → 筹备 → 试运行 → 正式，每一步要过检查清单（admin_city_not_ready，detail = 没过的项）；可以退回
--   · 开放时通知我：试运行 / 正式之后才能导出名单（要理由），发完标记已通知（通知后 30 天删除，见 ㉓）
-- =====================================================================
alter table admin_users add column if not exists cities text[];
alter table cities add column if not exists beta_at timestamptz;   -- 进入试运行的时间（正式开放前至少试运行 14 天）

create or replace function nbq_admin_sees(p_city text) returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select a.cities is null or p_city = any(a.cities) from admin_users a where a.id = nbq_admin_id()), true)
$$;
grant execute on function nbq_admin_sees(text) to nbq_admin, nbq_viewer, nbq_service;
-- 负责的城市（空 = 全部）；读策略里写成 (select nbq_admin_cities())，整条查询只算一次，不逐行调用
create or replace function nbq_admin_cities() returns text[] language sql stable security definer set search_path = public as $$
  select a.cities from admin_users a where a.id = nbq_admin_id()
$$;
grant execute on function nbq_admin_cities() to nbq_admin, nbq_viewer, nbq_service;

-- 读：只负责部分城市的人只看到这些城市的球友、球局、球场（另加一条「同时满足」的策略，原来的读权限不变）
drop policy if exists adm_city on users;  create policy adm_city on users  as restrictive for select to nbq_admin using ((select nbq_admin_cities()) is null or home_city = any((select nbq_admin_cities())::text[]));
drop policy if exists adm_city on games;  create policy adm_city on games  as restrictive for select to nbq_admin using ((select nbq_admin_cities()) is null or city = any((select nbq_admin_cities())::text[]));
drop policy if exists adm_city on venues; create policy adm_city on venues as restrictive for select to nbq_admin, nbq_viewer using ((select nbq_admin_cities()) is null or city = any((select nbq_admin_cities())::text[]));
-- 统计函数都经过 stat_cities：给了不负责的城市 → 空；不给 → 只算负责的城市
create or replace function stat_cities(p_city text default null) returns setof text language sql stable security definer set search_path = public as $$
  select key from cities where (p_city is null and status <> 'off' or key = p_city) and nbq_admin_sees(key)
$$;

-- 操作：权限 → 城市 → 理由 → 日志
create or replace function nbq_admin_act(p_action text, p_target text default null, p_reason text default null, p_detail jsonb default '{}') returns uuid
language plpgsql security definer set search_path = public as $$
declare a admin_users; p admin_perms; c text; uid uuid;
begin
  select * into a from admin_users where id = nbq_admin_id();
  if not found or a.disabled then perform nbq_err('admin_session_expired'); end if;
  select * into p from admin_perms where action = p_action;
  if not found or not (a.role = any(p.roles)) then perform nbq_err('admin_forbidden', p_action); end if;
  if a.cities is not null then
    if p_action in ('data.export','data.export_ids','rules.edit','admin.manage') then perform nbq_err('admin_forbidden', 'city'); end if;
    uid := case when p_target ~ '^[0-9a-f-]{36}$' then p_target::uuid end;
    c := case
      when p_action in ('user.status','user.ban','user.reset','user.gender','user.notify','phone.reveal') then (select home_city from users where id = uid)
      when p_action in ('report.handle','message.hide') and p_target ~ '^sb(post|photo):' then (select sp.city from sb_posts sp where sp.id::text = split_part(p_target, ':', 2))   -- 场边：按发布所在城市
      when p_action = 'message.hide' and p_target ~ '^sbreply:' then (select sp.city from sb_replies sr join sb_posts sp on sp.id = sr.post_id where sr.id::text = split_part(p_target, ':', 2))
      when p_action in ('report.handle','message.read') then (select u.home_city from reports r join users u on u.id = r.reporter_id where r.id = uid)
      when p_action = 'message.hide' and p_target ~ '^[0-9]{1,18}$' then (select u.home_city from messages m join users u on u.id = m.sender_id where m.id = p_target::bigint)
      when p_action = 'venue.review' then (select v.city from venues v where v.id = uid)
      when p_action = 'risk.handle' and p_target ~ '^[0-9]{1,18}$' then (select u.home_city from risk_alerts x join users u on u.id = x.user_id where x.id = p_target::bigint)
      when p_action like 'city.%' then p_target
    end;
    if c is not null and not (c = any(a.cities)) then perform nbq_err('admin_forbidden', 'city'); end if;
  end if;
  if p.need_reason and char_length(btrim(coalesce(p_reason, ''))) < 4 then perform nbq_err('admin_reason_required', p_action); end if;
  insert into admin_audit_log(admin_id, action, target, detail, ip)
  values (a.id, p_action, p_target, coalesce(p_detail, '{}') || case when p_reason is null then '{}' else jsonb_build_object('reason', btrim(p_reason)) end,
          nullif(current_setting('nbq.admin_ip', true), '')::inet);
  return a.id;
end $$;

-- 上线检查清单：每一项 {item, label, ok, need}；need = 进入哪个状态前必须通过
create or replace function city_checklist(p_city text) returns jsonb language sql stable security definer set search_path = public as $$
  with c as (select * from cities where key = p_city),
  n as (select (select count(*) from suburbs s where s.city = p_city) sub,
               (select count(*) from venues v where v.city = p_city and v.status = 'active') ven)
  select jsonb_build_array(
    jsonb_build_object('item','suburbs', 'label','区数据已导入（至少 20 个区）',           'ok', n.sub >= 20, 'need','beta', 'value', n.sub),
    jsonb_build_object('item','venues',  'label','球场已收录（至少 10 个）',               'ok', n.ven >= 10, 'need','beta', 'value', n.ven),
    jsonb_build_object('item','basics',  'label','时区、中心、网址、默认位置、分享话题',     'ok', c.tz is not null and c.slug is not null and c.center_label is not null and c.hashtag <> '', 'need','prep'),
    jsonb_build_object('item','community','label','当地社群链接',                          'ok', coalesce(c.community_url, '') <> '', 'need','on'),
    jsonb_build_object('item','beta14',  'label','试运行满 14 天',                         'ok', c.beta_at is not null and c.beta_at <= now() - interval '14 days', 'need','on'))
  from c, n
$$;
-- 城市页：每个城市一行（只负责部分城市的人只看到这些）
create or replace function admin_city_overview() returns table(key text, name_zh text, slug text, status text, beta_at timestamptz, launched_at timestamptz,
  suburbs bigint, venues bigint, players bigint, games_30d bigint, waitlist bigint, waitlist_pending bigint, checklist jsonb, community_url text, sort smallint)
language sql stable security definer set search_path = public as $$
  select c.key, c.name_zh, c.slug, c.status, c.beta_at, c.launched_at,
    (select count(*) from suburbs s where s.city = c.key),
    (select count(*) from venues v where v.city = c.key and v.status = 'active'),
    (select count(*) from users u where u.home_city = c.key and u.status not in ('deleted','banned')),
    (select count(*) from games g where g.city = c.key and g.starts_at > now() - interval '30 days' and g.starts_at <= now() and g.status <> 'cancelled'),
    (select count(*) from area_demand d where d.kind = 'city_waitlist' and d.city = c.key),
    (select count(*) from area_demand d where d.kind = 'city_waitlist' and d.city = c.key and d.notified_at is null),
    city_checklist(c.key), c.community_url, c.sort
  from cities c where nbq_admin_sees(c.key) order by c.sort
$$;
-- 改上线状态：off ⇄ prep ⇄ beta ⇄ on（可以跳级往前，但要过对应的检查项；往回退不检查）
create or replace function admin_city_status(p_city text, p_status text, p_reason text) returns void language plpgsql security definer set search_path = public as $$
declare cur text; rank_new int; miss text;
begin
  perform nbq_admin_act('city.manage', p_city, p_reason, jsonb_build_object('status', p_status));
  select status into cur from cities where key = p_city for update;
  if cur is null then perform nbq_err('not_found'); end if;
  if p_status not in ('off','prep','beta','on') then perform nbq_err('invalid', 'status'); end if;
  rank_new := array_position(array['off','prep','beta','on'], p_status);
  if rank_new > array_position(array['off','prep','beta','on'], cur) then
    select string_agg(x->>'item', ',') into miss from jsonb_array_elements(city_checklist(p_city)) x
     where not (x->>'ok')::boolean and array_position(array['off','prep','beta','on'], x->>'need') <= rank_new;
    if miss is not null then perform nbq_err('admin_city_not_ready', miss); end if;
  end if;
  update cities set status = p_status,
    beta_at = case when p_status = 'beta' and cur <> 'beta' then now() else beta_at end,
    launched_at = case when p_status = 'on' and launched_at is null then now() else launched_at end
   where key = p_city;
end $$;
-- 改城市资料（只能改这几项）
create or replace function admin_city_set(p_city text, p_patch jsonb, p_reason text) returns void language plpgsql security definer set search_path = public as $$
declare k text;
begin
  perform nbq_admin_act('city.manage', p_city, p_reason, jsonb_build_object('patch', p_patch));
  for k in select jsonb_object_keys(p_patch) loop
    if k not in ('community_url','hashtag','center_label') then perform nbq_err('invalid', k); end if;
  end loop;
  if p_patch ? 'community_url' and coalesce(p_patch->>'community_url', '') !~ '^(https://[^\s<>"]+)?$' then perform nbq_err('invalid', 'community_url'); end if;
  update cities set community_url = case when p_patch ? 'community_url' then nullif(p_patch->>'community_url', '') else community_url end,
                    hashtag = coalesce(nullif(p_patch->>'hashtag', ''), hashtag),
                    center_label = coalesce(nullif(p_patch->>'center_label', ''), center_label)
   where key = p_city;
  if not found then perform nbq_err('not_found'); end if;
end $$;
-- 开放时通知我：试运行 / 正式之后导出还没通知的名单（要理由）；发完标记已通知
create or replace function admin_city_waitlist(p_city text, p_reason text) returns table(email text, created_at timestamptz) language plpgsql security definer set search_path = public as $$
begin
  perform nbq_admin_act('city.waitlist', p_city, p_reason);
  if not exists (select 1 from cities c where c.key = p_city and c.status in ('beta','on')) then perform nbq_err('admin_city_not_ready', 'not_open'); end if;
  return query select d.email, d.created_at from area_demand d where d.kind = 'city_waitlist' and d.city = p_city and d.notified_at is null order by d.created_at;
end $$;
create or replace function admin_city_waitlist_done(p_city text, p_reason text) returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  perform nbq_admin_act('city.waitlist', p_city, p_reason, jsonb_build_object('mark', 'notified'));
  if not exists (select 1 from cities c where c.key = p_city and c.status in ('beta','on')) then perform nbq_err('admin_city_not_ready', 'not_open'); end if;
  update area_demand set notified_at = now() where kind = 'city_waitlist' and city = p_city and notified_at is null;
  get diagnostics n = row_count; return n;
end $$;
-- 管理员负责的城市（超级管理员一律全部城市）
create or replace function admin_set_cities(p_admin uuid, p_cities text[], p_reason text) returns void language plpgsql security definer set search_path = public as $$
declare t admin_users;
begin
  select * into t from admin_users where id = p_admin;
  if not found then perform nbq_err('not_found'); end if;
  perform nbq_admin_act('admin.manage', t.email, p_reason, jsonb_build_object('cities', p_cities, 'was', t.cities));
  if p_cities is not null and (t.role = 'owner' or cardinality(p_cities) = 0 or exists (select 1 from unnest(p_cities) x where x not in (select key from cities))) then perform nbq_err('invalid', 'cities'); end if;
  update admin_users set cities = p_cities where id = p_admin;
end $$;
-- 会话里带上负责的城市（后台页面据此默认筛选）
create or replace function admin_session_check(p_token_hash text) returns jsonb language plpgsql security definer set search_path = public as $$
declare s admin_sessions; a admin_users;
begin
  select * into s from admin_sessions where token_hash = p_token_hash;
  if not found or s.revoked_at is not null or s.expires_at <= now() or s.last_seen_at <= now() - interval '1 hour' then perform nbq_err('admin_session_expired'); end if;
  select * into a from admin_users where id = s.admin_id;
  if a.disabled then perform nbq_err('admin_session_expired'); end if;
  update admin_sessions set last_seen_at = now() where id = s.id;
  return jsonb_build_object('id', a.id, 'role', a.role, 'name', a.name, 'cities', a.cities, 'db_role', case when a.role = 'viewer' then 'nbq_viewer' else 'nbq_admin' end);
end $$;
revoke execute on function city_checklist(text), admin_city_overview(), admin_city_status(text, text, text), admin_city_set(text, jsonb, text),
  admin_city_waitlist(text, text), admin_city_waitlist_done(text, text), admin_set_cities(uuid, text[], text) from public, nbq_user, nbq_service;
grant execute on function admin_city_status(text, text, text), admin_city_set(text, jsonb, text), admin_city_waitlist(text, text), admin_city_waitlist_done(text, text), admin_set_cities(uuid, text[], text) to nbq_admin;
grant execute on function admin_city_overview(), city_checklist(text) to nbq_admin, nbq_viewer;

-- 自检：通知类型必须齐全
do $$
declare want text[] := array['request','approved','rejected','full','player_left','game_cancelled','invite','invite_counter',
  'invite_accepted','invite_declined','invite_expired','joined','expired','recap','follow_game','badge','levelup','noshow',
  'unfilled','unfilled_end','postponed','changed','soon','reopen','account_status'];
  have text[] := (select array_agg(e::text) from unnest(enum_range(null::notif_kind)) e);
begin
  if not (have @> want) then raise exception 'notif_kind 缺少：%', (select array_agg(x) from unnest(want) x where x <> all(have)); end if;
end $$;

-- =====================================================================
-- ㉕ 场边 24h（第七批 S1，2026-10）：话题与引导的配置 · 发布 / 照片 / 回复 / 网球 / 不感兴趣 / 浏览 · 读写权限 · 后台统计
--   设计稿：南伴球_场边设计稿_v35.html（前台）、南伴球_后台_场边.html（后台）。规则（10-26 定）：
--   · 每条公开 24 小时（从 publish_at 算；选「2 小时后再公开」时 publish_at = 发出时间 + 2 小时），之后只在本人的相册里，一直保存到本人删除或注销
--   · 未登录能看 24 小时内的公开内容，不能互动；只显示昵称和球场名
--   · 照片先发后审：发出立刻可见；自动识别可疑的打码（review = blurred）送审，举报也进「待审核」
--   · 写入一律走接口函数（S2），前台角色只有读权限；配置由后台改、发布成版本后前台读（S4）
-- =====================================================================

-- ---------- 配置：话题 ----------
create table if not exists sb_topics (
  id          text primary key check (id ~ '^[a-z][a-z0-9_]{1,39}$'),      -- 常驻 / 限时用英文短名（ootd、brain…）；大家发起的由接口生成 u_xxxxxxxx
  title       text not null check (char_length(btrim(title)) between 1 and 20),   -- 名字长短的规则（2–12）在后台设置里，由接口检查
  kind        text not null check (kind in ('evergreen','limited','user')),         -- 常驻 / 限时 / 大家发起
  intro       text not null default '' check (char_length(intro) <= 24),           -- 一句说明（话题页顶部）
  ask         text not null default '' check (char_length(ask) <= 20),             -- 它的问题（底栏和发布页的提示）
  starters    text[] not null default '{}' check (cardinality(starters) <= 3),      -- 三个开头（半句）
  photo_tags  text[] not null default '{}',                                         -- 照片里有这些东西时优先推荐
  suggest     boolean not null default true,                                        -- 出现在「今天想聊点什么」
  active      boolean not null default false,                                       -- 上线
  starts_at   timestamptz, ends_at timestamptz,                                     -- 限时话题的起止
  city        text references cities(key),                                          -- 大家发起时所在城市；常驻 / 限时为空 = 所有城市
  created_by  uuid references users(id) on delete set null,
  released_at timestamptz,                                                          -- 大家发起的：到门槛或后台「提前放出」后，出现在「大家在聊」和搜索里
  sunk_at     timestamptz,                                                          -- 多少天没人用就沉下去（不在列表里，旧帖子上仍显示）
  merged_into text references sb_topics(id),
  post_count  int not null default 0 check (post_count >= 0),                       -- 编号 No.N 的计数器（发出时 +1）
  sort        smallint not null default 100,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check (kind <> 'limited' or (starts_at is not null and ends_at is not null and starts_at < ends_at)),
  check (kind <> 'user' or created_by is not null or merged_into is not null or released_at is not null),
  check (merged_into is null or merged_into <> id)
);
create unique index if not exists sb_topics_title_uq on sb_topics (lower(btrim(title))) where merged_into is null;
create or replace function sb_starters_ok(a text[]) returns boolean language sql immutable as $$
  select coalesce(bool_and(char_length(btrim(x)) between 1 and 16), true) from unnest(a) x $$;
alter table sb_topics drop constraint if exists sb_topics_starters_len;
alter table sb_topics add constraint sb_topics_starters_len check (sb_starters_ok(starters));

create table if not exists sb_topic_alias (                -- 相似的合并：大家输入这个词时，先推荐 / 并入这个话题
  word     text primary key check (char_length(btrim(word)) between 1 and 12),
  topic_id text not null references sb_topics(id) on delete cascade
);
create table if not exists sb_generic_words (               -- 太宽的词：不能新建成话题
  word text primary key check (char_length(btrim(word)) between 1 and 12)
);
create table if not exists sb_settings (
  key        text primary key check (key in ('name_min','name_max','release_people','release_days','sink_days','hint_every','hint_hold','suggest_n','hint_max_len','post_max_len','reply_max_len','later_hours','public_hours')),
  value      jsonb not null,
  updated_at timestamptz not null default now()
);
insert into sb_settings(key, value) values
 ('name_min','2'),('name_max','12'),('release_people','3'),('release_days','7'),('sink_days','30'),
 ('hint_every','4'),('hint_hold','4'),('suggest_n','3'),('hint_max_len','12'),('post_max_len','60'),('reply_max_len','60'),
 ('later_hours','2'),('public_hours','24')
on conflict (key) do nothing;

-- ---------- 配置：引导文案 ----------
create table if not exists sb_hints (                      -- 底栏一直会出现的问题 + 选了球场时的问题（{球场} 会换成球场名）
  id      smallint generated by default as identity primary key,
  kind    text not null check (kind in ('general','lost','court')),
  text    text not null check (char_length(btrim(text)) between 1 and 20),
  daypart text not null default 'any' check (daypart in ('any','day','night')),
  sort    smallint not null default 100,
  active  boolean not null default true,
  check (kind = 'court' or position('{球场}' in text) = 0),
  check (kind <> 'court' or position('{球场}' in text) > 0)
);
create table if not exists sb_slots (                      -- 按时段带出的两个话题（城市当地时间）
  slot      smallint primary key check (slot between 0 and 3),
  name      text not null,
  from_hour smallint not null check (from_hour between 0 and 23),
  to_hour   smallint not null check (to_hour between 0 and 23),
  topic_ids text[] not null check (cardinality(topic_ids) = 2)
);
create table if not exists sb_starters (                   -- 不是话题的开头：球场、失物招领
  kind text not null check (kind in ('court','lost')),
  sort smallint not null,
  text text not null check (char_length(btrim(text)) between 1 and 16),
  primary key (kind, sort)
);
create table if not exists sb_week (                       -- 今日推荐：每周固定栏目（1 = 周一 … 7 = 周日）
  dow      smallint primary key check (dow between 1 and 7),
  topic_id text references sb_topics(id),
  auto_hot boolean not null default false,                  -- 大家发起的本周最热（自动）
  note     text not null default '',
  check (topic_id is not null or auto_hot)
);
create table if not exists sb_specials (                   -- 特别安排：盖过周历
  id        uuid primary key default gen_random_uuid(),
  topic_id  text not null references sb_topics(id),
  trigger   text not null default 'date' check (trigger in ('date','rain')),
  starts_at timestamptz, ends_at timestamptz,
  city      text references cities(key),
  active    boolean not null default true,
  note      text not null default '',
  check (trigger <> 'date' or (starts_at is not null and ends_at is not null and starts_at < ends_at))
);
create table if not exists sb_config_versions (            -- 发布的配置版本（S4 写入）；前台只读最新一版
  version      int generated by default as identity primary key,
  config       jsonb not null,
  note         text not null default '',
  published_by uuid references admin_users(id),
  published_at timestamptz not null default now()
);

-- ---------- 内容 ----------
create table if not exists sb_posts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references users(id) on delete cascade,
  city         text not null references cities(key),
  body         text not null default '' check (char_length(body) <= 60),
  topic_id     text references sb_topics(id),
  floor        int check (floor > 0),                       -- 话题里的编号 No.N
  venue_id     uuid references venues(id),                  -- 和哪块场有关（不是「我在哪」）
  photo_count  smallint not null default 0 check (photo_count between 0 and 3),
  tone         text not null default '' check (tone in ('','warm','film','dawn')),
  replies_open boolean not null default true,
  created_at   timestamptz not null default now(),
  publish_at   timestamptz not null default now(),          -- 公开开始；24 小时后只在本人相册
  status       text not null default 'visible' check (status in ('visible','hidden')),   -- hidden = 后台隐藏（作者仍能在相册看到）
  hidden_reason text,
  deleted_at   timestamptz,                                 -- 本人删除
  balls        int not null default 0 check (balls >= 0),
  replies      int not null default 0 check (replies >= 0),
  views        int not null default 0 check (views >= 0),
  shares       int not null default 0 check (shares >= 0),
  check (btrim(body) <> '' or photo_count > 0),
  check (publish_at >= created_at - interval '1 minute' and publish_at <= created_at + interval '6 hours'),
  check ((topic_id is null) = (floor is null))
);
create unique index if not exists sb_posts_floor_uq on sb_posts (topic_id, floor) where topic_id is not null;
create index if not exists sb_posts_feed on sb_posts (city, publish_at desc) where status = 'visible' and deleted_at is null;
create index if not exists sb_posts_user on sb_posts (user_id, created_at desc);
create index if not exists sb_posts_topic on sb_posts (topic_id, publish_at desc) where topic_id is not null;
create index if not exists sb_posts_venue on sb_posts (venue_id, publish_at desc) where venue_id is not null;

create table if not exists sb_photos (
  post_id     uuid not null references sb_posts(id) on delete cascade,
  idx         smallint not null check (idx between 0 and 2),
  storage_key text not null,                                -- 对象存储里的位置（只存键，不存图片本身）
  width       int check (width > 0), height int check (height > 0),
  tags        text[] not null default '{}',                 -- 自动识别出的东西（穿搭、鞋、宠物…），用于推荐话题
  review      text not null default 'ok' check (review in ('ok','blurred','removed')),   -- blurred = 自动识别可疑，打码送审；removed = 审核拿掉
  flagged_by  text check (flagged_by in ('auto','report','admin')),
  reviewed_by uuid references admin_users(id), reviewed_at timestamptz,
  primary key (post_id, idx)
);
create index if not exists sb_photos_review on sb_photos (review) where review = 'blurred';

create table if not exists sb_replies (
  id         bigint generated by default as identity primary key,
  post_id    uuid not null references sb_posts(id) on delete cascade,
  user_id    uuid not null references users(id) on delete cascade,
  to_user    uuid references users(id) on delete set null, -- 回复某人
  body       text not null check (char_length(btrim(body)) between 1 and 60),
  created_at timestamptz not null default now(),
  status     text not null default 'visible' check (status in ('visible','hidden')),
  deleted_at timestamptz
);
create index if not exists sb_replies_post on sb_replies (post_id, created_at);
create index if not exists sb_replies_user on sb_replies (user_id, created_at desc);

create table if not exists sb_balls (                      -- 点网球（点赞）
  post_id    uuid not null references sb_posts(id) on delete cascade,
  user_id    uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index if not exists sb_balls_user on sb_balls (user_id, created_at desc);

create table if not exists sb_hides (                      -- 不感兴趣（只用来调排序，不通知对方）
  user_id    uuid not null references users(id) on delete cascade,
  post_id    uuid not null references sb_posts(id) on delete cascade,
  reason     text not null default 'none' check (reason in ('none','topic','user','far')),   -- 没说 / 少看这一类 / 少看这个人 / 离我太远
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);
create table if not exists sb_views (                      -- 浏览去重：同一个人（或同一台没登录的设备）一天只算一次；30 天后删（S3），总数留在 sb_posts.views
  post_id    uuid not null references sb_posts(id) on delete cascade,
  day        date not null,
  viewer     text not null,                                -- 登录：用户 id；未登录：设备匿名 id 的哈希
  primary key (post_id, day, viewer)
);

-- 举报：加上场边的发布和回复；原因加「不当照片」「虚假交易」
alter table reports drop constraint if exists reports_target_type_check;
alter table reports add constraint reports_target_type_check check (target_type in ('user','game','message','venue','sb_post','sb_reply'));
alter table reports drop constraint if exists reports_reason_check;
alter table reports add constraint reports_reason_check check (reason in ('no_show','rude','harass','fake_profile','gender_fake','spam','pact_violation','other','photo','fraud'));
alter table reports drop constraint if exists reports_source_chk;
alter table reports add constraint reports_source_chk check (
  case when source = 'in_app'
       then entered_by is null and via is not null and (note is null or char_length(note) <= 200)
        and ((via in ('card','chat') and target_type in ('user','game') and reason in ('pact_violation','harass','no_show','fake_profile','other') and (reason <> 'other' or coalesce(btrim(note), '') <> ''))
          or (via = 'sideline' and target_type in ('sb_post','sb_reply') and reason in ('harass','photo','fraud','other')))   -- 场边：骚扰或冒犯 / 不当照片 / 虚假交易 / 其他（不要求写说明）
       else entered_by is not null and via is null end);
alter table reports drop constraint if exists reports_via_check;
alter table reports add constraint reports_via_check check (via in ('card','chat','sideline'));

-- ---------- 谁能看到一条发布 ----------
-- 公开中：没被隐藏、没删除、在 publish_at 之后 24 小时内、作者账号可见；看的人和作者没有互相屏蔽、看的人没点「不感兴趣」
create or replace function sb_post_public(p_post uuid, p_uid uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from sb_posts p join users u on u.id = p.user_id
    where p.id = p_post and p.status = 'visible' and p.deleted_at is null
      and now() >= p.publish_at and now() < p.publish_at + make_interval(hours => coalesce((select (value)::text::int from sb_settings where key = 'public_hours'), 24))
      and u.status not in ('suspended','banned','deleted')
      and (p_uid is null or (not is_blocked(p_uid, p.user_id) and not exists (select 1 from sb_hides h where h.user_id = p_uid and h.post_id = p.id))))
$$;
create or replace function sb_post_readable(p_post uuid, p_uid uuid) returns boolean language sql stable security definer set search_path = public as $$
  select sb_post_public(p_post, p_uid) or exists (select 1 from sb_posts p where p.id = p_post and p.user_id = p_uid and p.deleted_at is null)
$$;
revoke execute on function sb_post_public(uuid, uuid), sb_post_readable(uuid, uuid), sb_starters_ok(text[]) from public;
grant execute on function sb_post_public(uuid, uuid), sb_post_readable(uuid, uuid), sb_starters_ok(text[]) to nbq_user, nbq_service, nbq_admin, nbq_viewer;

-- ---------- 读写权限 ----------
do $$ declare t text; begin
  foreach t in array array['sb_topics','sb_topic_alias','sb_generic_words','sb_settings','sb_hints','sb_slots','sb_starters','sb_week','sb_specials','sb_config_versions',
                           'sb_posts','sb_photos','sb_replies','sb_balls','sb_hides','sb_views'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists svc_all on %I', t);
    execute format('create policy svc_all on %I to nbq_service using (true) with check (true)', t);
    execute format('drop policy if exists adm_read on %I', t);
    execute format('create policy adm_read on %I for select to nbq_admin using (true)', t);
    execute format('grant all on %I to nbq_service', t);
    execute format('grant select on %I to nbq_admin', t);
    execute format('revoke all on %I from public, anon, authenticated, nbq_viewer', t);
  end loop; end $$;
grant usage on sequence sb_hints_id_seq, sb_config_versions_version_seq, sb_replies_id_seq to nbq_service;
-- 前台（含未登录）：只读；写入一律走接口函数（S2）
grant select on sb_topics, sb_posts, sb_photos, sb_replies, sb_balls, sb_hides to nbq_user;
revoke select on sb_photos from nbq_user; grant select (post_id, idx, storage_key, width, height, review) on sb_photos to nbq_user;   -- 识别标签、审核人不给前台
revoke select on sb_posts from nbq_user;
grant select (id, user_id, city, body, topic_id, floor, venue_id, photo_count, tone, replies_open, created_at, publish_at, status, deleted_at, balls, replies, views, shares) on sb_posts to nbq_user;   -- hidden_reason 只给本人看（接口返回）
drop policy if exists sb_topic_read on sb_topics;
create policy sb_topic_read on sb_topics for select to nbq_user using (active or created_by = nbq_uid());
drop policy if exists sb_post_read on sb_posts;
create policy sb_post_read on sb_posts for select to nbq_user using (sb_post_readable(id, nbq_uid()));
drop policy if exists sb_photo_read on sb_photos;
create policy sb_photo_read on sb_photos for select to nbq_user using (sb_post_readable(post_id, nbq_uid()) and (review <> 'removed' or exists (select 1 from sb_posts p where p.id = post_id and p.user_id = nbq_uid())));
drop policy if exists sb_reply_read on sb_replies;
create policy sb_reply_read on sb_replies for select to nbq_user using (
  user_id = nbq_uid()
  or (status = 'visible' and deleted_at is null and sb_post_readable(post_id, nbq_uid()) and (nbq_uid() is null or not is_blocked(nbq_uid(), user_id))));
drop policy if exists sb_ball_own on sb_balls;
create policy sb_ball_own on sb_balls for select to nbq_user using (user_id = nbq_uid());
drop policy if exists sb_hide_own on sb_hides;
create policy sb_hide_own on sb_hides for select to nbq_user using (user_id = nbq_uid());
-- 后台运营：场边表一律只读；隐藏发布 / 回复、照片审核走 admin_sb_post_hide / admin_sb_reply_hide / admin_sb_photo_review（A1，2026-10：原来直接给 nbq_admin 改审核列的权限收回，和球友 / 举报「后台一律走函数」一致）
revoke update on sb_posts, sb_photos, sb_replies from nbq_admin;
drop policy if exists adm_upd on sb_posts;
drop policy if exists adm_upd on sb_photos;
drop policy if exists adm_upd on sb_replies;

-- ---------- 后台统计（场边数据页；城市当地时间；后台只读也能看） ----------
-- 时间范围一律 [p_from, p_to)，按 publish_at；「看过场边的人」「底栏问题点进率」「开头被用」要等前台埋点（下一批 C5），这里先不出
create or replace function sb_stat_kpis(p_city text, p_from timestamptz, p_to timestamptz)
returns table(posts bigint, posters bigint, balls bigint, replies bigint, with_photo numeric, views bigint) language sql stable security definer set search_path = public as $$
  with p as (select * from sb_posts where (p_city is null or city = p_city) and publish_at >= p_from and publish_at < p_to and deleted_at is null)
  select count(*), count(distinct user_id),
         (select count(*) from sb_balls b join p on p.id = b.post_id),
         (select count(*) from sb_replies r join p on p.id = r.post_id where r.deleted_at is null),
         round(avg((photo_count > 0)::int), 4), coalesce(sum(views), 0)
  from p
$$;
create or replace function sb_stat_topics(p_city text, p_from timestamptz, p_to timestamptz)
returns table(topic_id text, title text, kind text, posts bigint, people bigint, balls bigint, replies bigint, views bigint, prev_posts bigint) language sql stable security definer set search_path = public as $$
  with cur as (select topic_id, count(*) posts, count(distinct user_id) people, sum(balls) balls, sum(replies) replies, sum(views) views
                 from sb_posts where topic_id is not null and (p_city is null or city = p_city) and publish_at >= p_from and publish_at < p_to and deleted_at is null group by 1),
       prv as (select topic_id, count(*) posts from sb_posts where topic_id is not null and (p_city is null or city = p_city)
                 and publish_at >= p_from - (p_to - p_from) and publish_at < p_from and deleted_at is null group by 1)
  select t.id, t.title, t.kind, coalesce(c.posts,0), coalesce(c.people,0), coalesce(c.balls,0), coalesce(c.replies,0), coalesce(c.views,0), coalesce(v.posts,0)
    from sb_topics t left join cur c on c.topic_id = t.id left join prv v on v.topic_id = t.id
   where t.merged_into is null and (c.posts is not null or t.active)
   order by coalesce(c.posts,0) desc, t.sort
$$;
create or replace function sb_stat_courts(p_city text, p_from timestamptz, p_to timestamptz)
returns table(venue_id uuid, name text, posts bigint, views bigint, interactions bigint) language sql stable security definer set search_path = public as $$
  select v.id, v.name, count(*), sum(p.views), sum(p.balls + p.replies)
    from sb_posts p join venues v on v.id = p.venue_id
   where (p_city is null or p.city = p_city) and p.publish_at >= p_from and p.publish_at < p_to and p.deleted_at is null
   group by v.id, v.name order by 3 desc
$$;
create or replace function sb_stat_top_posts(p_city text, p_from timestamptz, p_to timestamptz, p_limit int default 20)
returns table(post_id uuid, body text, topic_id text, venue text, author text, has_photo boolean, views int, balls int, replies int, shares int, still_public boolean, status text)
language sql stable security definer set search_path = public as $$
  select p.id, p.body, p.topic_id, v.short_name, u.nickname, p.photo_count > 0, p.views, p.balls, p.replies, p.shares,
         now() < p.publish_at + interval '24 hours', p.status
    from sb_posts p join users u on u.id = p.user_id left join venues v on v.id = p.venue_id
   where (p_city is null or p.city = p_city) and p.publish_at >= p_from and p.publish_at < p_to and p.deleted_at is null
   order by p.views desc, p.balls desc limit greatest(1, least(p_limit, 100))
$$;
create or replace function sb_stat_heat(p_city text, p_from timestamptz, p_to timestamptz)
returns table(dow int, hour int, posts bigint) language sql stable security definer set search_path = public as $$
  select extract(isodow from p.publish_at at time zone c.tz)::int, extract(hour from p.publish_at at time zone c.tz)::int, count(*)
    from sb_posts p join cities c on c.key = p.city
   where (p_city is null or p.city = p_city) and p.publish_at >= p_from and p.publish_at < p_to and p.deleted_at is null
   group by 1, 2 order by 1, 2
$$;
create or replace function sb_stat_choices(p_city text, p_from timestamptz, p_to timestamptz)
returns table(posts bigint, with_topic numeric, with_venue numeric, with_photo numeric, later numeric, replies_closed numeric) language sql stable security definer set search_path = public as $$
  select count(*), round(avg((topic_id is not null)::int), 4), round(avg((venue_id is not null)::int), 4), round(avg((photo_count > 0)::int), 4),
         round(avg((publish_at > created_at + interval '30 minutes')::int), 4), round(avg((not replies_open)::int), 4)
    from sb_posts where (p_city is null or city = p_city) and created_at >= p_from and created_at < p_to
$$;
create or replace function sb_stat_negative(p_city text, p_from timestamptz, p_to timestamptz)
returns table(hides bigint, hide_topic bigint, hide_user bigint, hide_far bigint, reports bigint, deleted bigint, photos_blurred bigint) language sql stable security definer set search_path = public as $$
  select (select count(*) from sb_hides h join sb_posts p on p.id = h.post_id where (p_city is null or p.city = p_city) and h.created_at >= p_from and h.created_at < p_to),
         (select count(*) from sb_hides h join sb_posts p on p.id = h.post_id where (p_city is null or p.city = p_city) and h.reason = 'topic' and h.created_at >= p_from and h.created_at < p_to),
         (select count(*) from sb_hides h join sb_posts p on p.id = h.post_id where (p_city is null or p.city = p_city) and h.reason = 'user' and h.created_at >= p_from and h.created_at < p_to),
         (select count(*) from sb_hides h join sb_posts p on p.id = h.post_id where (p_city is null or p.city = p_city) and h.reason = 'far' and h.created_at >= p_from and h.created_at < p_to),
         (select count(*) from reports r where r.target_type in ('sb_post','sb_reply') and r.created_at >= p_from and r.created_at < p_to
             and (p_city is null or exists (select 1 from sb_posts p where p.city = p_city and (p.id::text = r.target_id or exists (select 1 from sb_replies x where x.id::text = r.target_id and x.post_id = p.id))))),
         (select count(*) from sb_posts p where (p_city is null or p.city = p_city) and p.deleted_at >= p_from and p.deleted_at < p_to),
         (select count(*) from sb_photos f join sb_posts p on p.id = f.post_id where (p_city is null or p.city = p_city) and f.review = 'blurred')
$$;
revoke execute on function sb_stat_kpis(text, timestamptz, timestamptz), sb_stat_topics(text, timestamptz, timestamptz), sb_stat_courts(text, timestamptz, timestamptz),
  sb_stat_top_posts(text, timestamptz, timestamptz, int), sb_stat_heat(text, timestamptz, timestamptz), sb_stat_choices(text, timestamptz, timestamptz),
  sb_stat_negative(text, timestamptz, timestamptz) from public, nbq_user;
grant execute on function sb_stat_kpis(text, timestamptz, timestamptz), sb_stat_topics(text, timestamptz, timestamptz), sb_stat_courts(text, timestamptz, timestamptz),
  sb_stat_top_posts(text, timestamptz, timestamptz, int), sb_stat_heat(text, timestamptz, timestamptz), sb_stat_choices(text, timestamptz, timestamptz),
  sb_stat_negative(text, timestamptz, timestamptz) to nbq_admin, nbq_viewer, nbq_service;

-- ---------- 默认配置（= 设计稿 v35 的内容；以后由后台改） ----------
insert into sb_topics(id, title, kind, intro, ask, starters, photo_tags, suggest, active, sort) values
 ('ootd','网球人的OOTD','evergreen','今天穿什么上场？拍一张发上来。','今天穿什么上场？','{今天这身是,第一次穿网球裙上场，,这双鞋终于到了，}','{穿搭,鞋}',true,true,10),
 ('brain','脑子会了，身体没会','evergreen','教学视频看了十遍，手还是不听话。','今天哪个动作又没跟上？','{看了十遍教学视频，,教练说的我都懂，就是,今天的反手又}','{}',true,true,20),
 ('dopa','多巴胺太爽了','evergreen','那一拍打出去的时候。','今天哪一拍最爽？','{今天终于赢了一盘，,第一次发球直接得分，,打了两个小时，}','{}',true,true,30),
 ('pet','带着宠物去打球','evergreen','来看球的、来捡球的，都算。','今天带它来了吗？','{今天带狗狗来看球，,它在场边乖乖等了,它捡球比我还积极，}','{宠物}',true,true,40),
 ('trip','带着球拍去旅行','evergreen','换一座城市，换一块场。','这次带球拍去了哪？','{这次旅行带上了球拍，,出门在外也没忘了打球，,找到一块海边的球场，}','{风景}',true,true,50),
 ('gear','我的新装备','evergreen','新拍子、新鞋、新手胶，拆开的那一刻。','最近换了什么装备？','{换了新拍子，,新鞋第一次上场，,纠结了一个月，终于入手了}','{球拍,球包}',true,true,60),
 ('spot','宝藏球场','evergreen','人少、灯亮、地面好，悄悄分享。','最近发现了哪块好场？','{发现一块宝藏球场：,这块场人少，而且,周末不用抢的场：}','{球场}',true,true,70),
 ('good','实用网球好物','evergreen','不贵，但真的好用。','最近离不开的小东西？','{用了就回不去的：,十几块钱买的,球包里一定会带的}','{}',true,true,80),
 ('sunset','场边的晚霞','evergreen','最后一局，抬头看一眼。','今天的晚霞……','{打完最后一局，抬头,今天的晚霞,夜场的灯亮起来的时候，}','{晚霞}',true,true,90),
 ('love','别人在恋爱，而我在打球','evergreen','周末的约会对象：一块场，一筐球。','周末和网球约会了吗？','{这个周末的约会对象，是,别人在约会，我在,今天又和球拍待了一下午，}','{影子}',true,true,100)
on conflict (id) do nothing;
insert into sb_topics(id, title, kind, intro, ask, starters, active, starts_at, ends_at, sort) values
 ('ao','AO来了','limited','墨尔本的一月，全城都在看球。','今年去看 AO 了吗？','{今年的 AO，,在场边看到了,回家第一件事是}',false,'2027-01-12 00:00+11','2027-02-02 00:00+11',5),
 ('rain','雨停了','limited','场地在冒热气，第一个上场的人。','场地干了吗？','{雨停了，,场地还有点湿，,第一个上场的是}',false,'2026-01-01 00:00+11','2099-01-01 00:00+11',6)
on conflict (id) do nothing;
insert into sb_topic_alias(word, topic_id) values
 ('神仙球场','spot'),('好场','spot'),('穿搭','ootd'),('宠物','pet'),('狗','pet'),('旅行','trip'),('装备','gear'),('好物','good'),('日落','sunset'),('学不会','brain')
on conflict (word) do nothing;
insert into sb_generic_words(word) values ('网球'),('墨尔本'),('打球'),('运动'),('日常'),('tennis'),('健身'),('生活') on conflict do nothing;
insert into sb_hints(kind, text, daypart, sort) select * from (values
 ('general','场边有什么新鲜事？','any',10),('lost','捡到东西了？','any',90),
 ('court','{球场} 现在怎么样？','any',10),('court','{球场} 有空场吗？','day',20),('court','{球场} 的灯亮了吗？','night',30)) v(k, t, d, s)
 where not exists (select 1 from sb_hints);
insert into sb_slots(slot, name, from_hour, to_hour, topic_ids) values
 (0,'早上',5,11,'{brain,gear}'),(1,'中午',11,16,'{good,spot}'),(2,'傍晚',16,20,'{sunset,dopa}'),(3,'晚上',20,5,'{dopa,love}')
on conflict (slot) do nothing;
insert into sb_starters(kind, sort, text) values
 ('court',1,'{球场} 现在有空场，'),('court',2,'{球场} 风好大，'),('court',3,'刚下过雨，{球场} 的场地'),
 ('lost',1,'在 {球场} 捡到一个'),('lost',2,'有没有人在 {球场} 看到一个')
on conflict do nothing;
insert into sb_week(dow, topic_id, auto_hot, note) values
 (1,'dopa',false,'周末的余温'),(2,'gear',false,'周末刚买的'),(3,null,true,'大家发起的本周最热'),(4,'spot',false,'为周末找场'),
 (5,'ootd',false,'周末前的打扮'),(6,'pet',false,'周末带它出门'),(7,'sunset',false,'和 #实用网球好物 隔周轮换')
on conflict (dow) do nothing;
insert into sb_specials(topic_id, trigger, starts_at, ends_at, note)
 select 'ao','date','2027-01-12 00:00+11','2027-02-02 00:00+11','澳网期间每天推荐' where not exists (select 1 from sb_specials where topic_id = 'ao');
insert into sb_specials(topic_id, trigger, note)
 select 'rain','rain','雨停 2 小时内（按球场所在区），最多一天一次' where not exists (select 1 from sb_specials where topic_id = 'rain');
-- 球场开头里的 {球场} 允许出现在 starters 表里（上面的检查只管 hints）

-- ---------- 场边接口 · 发布（第七批 S2a，2026-10） ----------
--   前台：POST /api/sideline/posts → api_sb_post(p)；DELETE /api/sideline/posts/:id → api_sb_delete(id)
--   照片先上传到对象存储（键 = sb/<本人 id>/<随机名>.jpg|webp），发布时只带键；识别程序（nbq_service）随后调 sb_photo_scan 写标签、可疑的打码送审
--   账号状态：停用中、封禁、注销不能发（can_act 'create'）；待核实 / 受限可以发。场边不需要先同意球友约定
insert into rate_rules(rule, grp, win, max_hits, per_key, code, note) values
 ('sb_post_hour',  'sb_post',  '1 hour',   5,  false, 'sb_post_hourly_limit', '场边发布：每小时 5 条'),
 ('sb_post_day',   'sb_post',  '24 hours', 20, false, 'sb_post_daily_limit',  '场边发布：每天 20 条'),
 ('sb_topic_day',  'sb_topic', '24 hours', 3,  false, 'sb_topic_daily_limit', '新建话题：每天 3 个')
on conflict (rule) do nothing;

create or replace function sb_setting(p_key text) returns int language sql stable security definer set search_path = public as $$
  select (value)::text::int from sb_settings where key = p_key $$;

-- 场边能发的前提：登录 + 账号状态
create or replace function nbq_sb_gate() returns uuid language plpgsql stable security definer set search_path = public as $$
declare u uuid := nbq_me(); st text;
begin
  st := can_act(u, 'create');
  if st is not null then perform nbq_err('account_' || st); end if;
  return u;
end $$;

-- 话题名 → 话题：太宽的词不行；相似词、同名（不分大小写）并入已有的；都没有就新建（大家发起，到门槛前只有拿到链接的人能看到）
--   返回 (话题 id, 是否新建)。名字可以带也可以不带 #
create or replace function sb_topic_resolve(p_title text, p_uid uuid, p_city text, out topic_id text, out created boolean)
language plpgsql security definer set search_path = public as $$
declare t text := btrim(regexp_replace(coalesce(p_title, ''), '^\s*[#＃]+', '')); lt text; why text;
begin
  created := false; lt := lower(t);
  if char_length(t) < sb_setting('name_min') or char_length(t) > sb_setting('name_max') then perform nbq_err('invalid', 'topic_title'); end if;
  if exists (select 1 from sb_generic_words where lower(word) = lt) then perform nbq_err('topic_too_generic'); end if;
  select a.topic_id into topic_id from sb_topic_alias a where lower(a.word) = lt;
  if topic_id is null then select id into topic_id from sb_topics where lower(btrim(title)) = lt and merged_into is null; end if;
  if topic_id is not null then return; end if;
  why := nbq_nickname_problem(t);
  if why is not null then perform nbq_err('topic_name_not_allowed', why); end if;
  begin   -- 两个人同时新建同名话题：后到的并入先建的
    perform nbq_rate(p_uid::text, 'sb_topic');
    topic_id := 'u_' || substr(md5(gen_random_uuid()::text), 1, 8);
    insert into sb_topics(id, title, kind, active, city, created_by, suggest) values (topic_id, t, 'user', true, p_city, p_uid, false);
    created := true;
  exception when unique_violation then
    select id into topic_id from sb_topics where lower(btrim(title)) = lt and merged_into is null; created := false;
  end;
end $$;

-- 发布。p = {body, topic_id | topic_title, venue_id, city, photos:[{key,w,h}] ≤3, tone, later, replies_open}
--   返回 {id, topic_id, floor, new_topic, publish_at}
create or replace function api_sb_post(p jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare u uuid := nbq_sb_gate(); b text := btrim(coalesce(p->>'body', '')); ph jsonb := coalesce(p->'photos', '[]'::jsonb);
        v uuid; ct text; tp text; isnew boolean := false; t sb_topics; fl int; pid uuid; pub timestamptz; i int; x jsonb; tone text := coalesce(p->>'tone', '');
begin
  -- 内容
  if char_length(b) > sb_setting('post_max_len') then perform nbq_err('invalid', 'body'); end if;
  if b ~* '(https?://|www\.|[a-z0-9-]+\.(com|net|org|au|cn|io|me|co)(\M|/))' then perform nbq_err('message_link'); end if;
  if jsonb_typeof(ph) <> 'array' or jsonb_array_length(ph) > 3 then perform nbq_err('invalid', 'photos'); end if;
  if b = '' and jsonb_array_length(ph) = 0 then perform nbq_err('invalid', 'body'); end if;
  for x in select * from jsonb_array_elements(ph) loop
    if coalesce(x->>'key', '') !~ ('^sb/' || u::text || '/[A-Za-z0-9_-]{8,64}\.(jpg|webp)$') then perform nbq_err('invalid', 'photos'); end if;
  end loop;
  if (select count(distinct e->>'key') from jsonb_array_elements(ph) e) <> jsonb_array_length(ph) then perform nbq_err('invalid', 'photos'); end if;
  if tone not in ('', 'warm', 'film', 'dawn') then perform nbq_err('invalid', 'tone'); end if;
  -- 球场和城市：带球场就用球场的城市
  if nullif(p->>'venue_id', '') is not null then
    begin v := (p->>'venue_id')::uuid; exception when others then perform nbq_err('invalid', 'venue'); end;
    select city into ct from venues where id = v and status = 'active';
    if ct is null then perform nbq_err('invalid', 'venue'); end if;
  end if;
  ct := coalesce(ct, nullif(p->>'city', ''), (select home_city from users where id = u), 'melb');
  if not exists (select 1 from cities where key = ct and status in ('beta','on')) then perform nbq_err('city_closed', ct); end if;
  -- 话题：选已有的（id）或输入名字
  if nullif(p->>'topic_id', '') is not null then tp := p->>'topic_id';
  elsif nullif(btrim(p->>'topic_title'), '') is not null then select r.topic_id, r.created into tp, isnew from sb_topic_resolve(p->>'topic_title', u, ct) r;
  end if;
  if tp is not null then
    select * into t from sb_topics where id = tp for update;
    while found and t.merged_into is not null loop select * into t from sb_topics where id = t.merged_into for update; end loop;
    if not found or (t.kind = 'user' and not t.active and t.created_by is distinct from u) then perform nbq_err('not_found', 'topic'); end if;
    if not t.active or (t.kind = 'limited' and not (now() >= t.starts_at and now() < t.ends_at)) then perform nbq_err('topic_ended'); end if;
    if t.city is not null and t.city <> ct then perform nbq_err('invalid', 'topic_city'); end if;
    update sb_topics set post_count = post_count + 1, sunk_at = null, updated_at = now() where id = t.id returning post_count into fl;   -- 行锁：同时发也不会重号
    tp := t.id;
  end if;
  perform nbq_rate(u::text, 'sb_post');
  pub := case when coalesce((p->>'later')::boolean, false) then now() + make_interval(hours => sb_setting('later_hours')) else now() end;
  insert into sb_posts(user_id, city, body, topic_id, floor, venue_id, photo_count, tone, replies_open, publish_at)
  values (u, ct, b, tp, fl, v, jsonb_array_length(ph), tone, coalesce((p->>'replies_open')::boolean, true), pub) returning id into pid;
  i := 0;
  for x in select * from jsonb_array_elements(ph) loop
    insert into sb_photos(post_id, idx, storage_key, width, height) values (pid, i, x->>'key', nullif(x->>'w', '')::int, nullif(x->>'h', '')::int);
    i := i + 1;
  end loop;
  return jsonb_build_object('id', pid, 'topic_id', tp, 'floor', fl, 'new_topic', isnew, 'publish_at', pub);
end $$;

-- 删除自己的发布（相册里也没了；编号不回收）
create or replace function api_sb_delete(p_post uuid) returns void language plpgsql security definer set search_path = public as $$
begin
  update sb_posts set deleted_at = now() where id = p_post and user_id = nbq_me() and deleted_at is null;
  if not found then perform nbq_err('not_found', 'post'); end if;
end $$;

-- 照片识别结果（识别程序调用）：写标签；可疑的打码送审（已审过的不改）
create or replace function sb_photo_scan(p_post uuid, p_idx int, p_tags text[], p_suspicious boolean) returns text
language plpgsql security definer set search_path = public as $$
declare r text;
begin
  update sb_photos set tags = coalesce(p_tags, '{}'),
         review = case when p_suspicious and review = 'ok' and reviewed_at is null then 'blurred' else review end,
         flagged_by = case when p_suspicious and review = 'ok' and reviewed_at is null then 'auto' else flagged_by end
   where post_id = p_post and idx = p_idx returning review into r;
  if r is null then perform nbq_err('not_found', 'photo'); end if;
  return r;
end $$;

revoke execute on function sb_setting(text), nbq_sb_gate(), sb_topic_resolve(text, uuid, text), api_sb_post(jsonb), api_sb_delete(uuid), sb_photo_scan(uuid, int, text[], boolean) from public;
grant execute on function api_sb_post(jsonb), api_sb_delete(uuid) to nbq_user, nbq_service;
grant execute on function sb_setting(text) to nbq_user, nbq_service, nbq_admin, nbq_viewer;
grant execute on function sb_photo_scan(uuid, int, text[], boolean) to nbq_service;

-- ---------- 场边接口 · 互动（第七批 S2b，2026-10） ----------
--   回复、删除回复、作者开关回复、点 / 取消网球、不感兴趣、举报（直接 insert reports，via = sideline）、浏览 / 分享计数
--   能互动的前提：这条现在对我公开（sb_post_public；看不到的一律 not_found，不说明原因）
insert into rate_rules(rule, grp, win, max_hits, per_key, code, note) values
 ('sb_reply_min', 'sb_reply', '1 minute', 6,  false, 'message_too_fast', '场边回复：每分钟 6 条'),
 ('sb_ball_min',  'sb_ball',  '1 minute', 30, false, 'rate_limited',     '点网球：每分钟 30 次')
on conflict (rule) do nothing;

create or replace function sb_need_public(p_post uuid, p_uid uuid) returns sb_posts language plpgsql stable security definer set search_path = public as $$
declare p sb_posts;
begin
  if p_post is null or not sb_post_public(p_post, p_uid) then perform nbq_err('not_found', 'post'); end if;
  select * into p from sb_posts where id = p_post;
  return p;
end $$;

-- 回复数 = 没删、没被后台隐藏的回复（任何途径改动都重算，作者行加锁）
create or replace function sb_replies_count() returns trigger language plpgsql security definer set search_path = public as $$
declare pid uuid := coalesce(new.post_id, old.post_id);
begin
  -- 先锁作者行，再另起一句去数（S2c 同时操作测试发现：只用一句 update 时，同时回复的后一笔数的是开始时的快照，会少算 1）
  perform 1 from sb_posts where id = pid for update;
  update sb_posts set replies = (select count(*) from sb_replies where post_id = pid and status = 'visible' and deleted_at is null) where id = pid;
  return null;
end $$;
drop trigger if exists trg_sb_replies_count on sb_replies;
create trigger trg_sb_replies_count after insert or delete or update of status, deleted_at on sb_replies for each row execute function sb_replies_count();

-- 回复。p_to = 回复某人（作者，或这条下面我看得到的回复人）
create or replace function api_sb_reply(p_post uuid, p_body text, p_to uuid default null) returns bigint language plpgsql security definer set search_path = public as $$
declare u uuid := nbq_sb_gate(); p sb_posts; b text := btrim(coalesce(p_body, '')); rid bigint;
begin
  p := sb_need_public(p_post, u);
  if not p.replies_open and p.user_id <> u then perform nbq_err('replies_closed'); end if;
  if b = '' or char_length(b) > sb_setting('reply_max_len') then perform nbq_err('invalid', 'body'); end if;
  if b ~* '(https?://|www\.|[a-z0-9-]+\.(com|net|org|au|cn|io|me|co)(\M|/))' then perform nbq_err('message_link'); end if;
  if p_to is not null and (p_to = u or (p_to <> p.user_id and not exists (
       select 1 from sb_replies r where r.post_id = p_post and r.user_id = p_to and r.status = 'visible' and r.deleted_at is null and not is_blocked(u, p_to)))) then
    perform nbq_err('invalid', 'to');
  end if;
  perform nbq_rate(u::text, 'sb_reply');
  insert into sb_replies(post_id, user_id, to_user, body) values (p_post, u, p_to, b) returning id into rid;
  perform sb_notify_reply(rid);   -- 通知（S2b+）
  return rid;
end $$;

-- 删除自己的回复
create or replace function api_sb_reply_delete(p_reply bigint) returns void language plpgsql security definer set search_path = public as $$
begin
  update sb_replies set deleted_at = now() where id = p_reply and user_id = nbq_me() and deleted_at is null;
  if not found then perform nbq_err('not_found', 'reply'); end if;
end $$;

-- 作者开关回复（发出后也能改）
create or replace function api_sb_replies_open(p_post uuid, p_open boolean) returns void language plpgsql security definer set search_path = public as $$
begin
  update sb_posts set replies_open = coalesce(p_open, true) where id = p_post and user_id = nbq_me() and deleted_at is null;
  if not found then perform nbq_err('not_found', 'post'); end if;
end $$;

-- 点 / 取消网球：重复点不报错；返回这条现在的网球数
create or replace function api_sb_ball(p_post uuid) returns int language plpgsql security definer set search_path = public as $$
declare u uuid := nbq_sb_gate(); n int;
begin
  perform sb_need_public(p_post, u);
  perform nbq_rate(u::text, 'sb_ball');
  insert into sb_balls(post_id, user_id) values (p_post, u) on conflict do nothing;
  if found then update sb_posts set balls = balls + 1 where id = p_post returning balls into n; perform sb_notify_ball(p_post, u, true);   -- 通知（S2b+）
  else select balls into n from sb_posts where id = p_post; end if;
  return n;
end $$;
create or replace function api_sb_unball(p_post uuid) returns int language plpgsql security definer set search_path = public as $$
declare u uuid := nbq_me(); n int;
begin
  delete from sb_balls where post_id = p_post and user_id = u;
  if found then update sb_posts set balls = greatest(balls - 1, 0) where id = p_post returning balls into n; perform sb_notify_ball(p_post, u, false);
  else select balls into n from sb_posts where id = p_post and sb_post_readable(id, u); end if;
  if n is null then perform nbq_err('not_found', 'post'); end if;
  return n;
end $$;

-- 不感兴趣：先隐藏（reason = none），之后可以补原因（少看这一类 / 少看这个人 / 离我太远）；不通知对方
create or replace function api_sb_hide(p_post uuid, p_reason text default 'none') returns void language plpgsql security definer set search_path = public as $$
declare u uuid := nbq_me(); r text := coalesce(p_reason, 'none');
begin
  if r not in ('none','topic','user','far') then perform nbq_err('invalid', 'reason'); end if;
  if exists (select 1 from sb_hides where user_id = u and post_id = p_post) then
    update sb_hides set reason = r where user_id = u and post_id = p_post;
    return;
  end if;
  if (sb_need_public(p_post, u)).user_id = u then perform nbq_err('invalid', 'post'); end if;
  insert into sb_hides(user_id, post_id, reason) values (u, p_post, r);
end $$;

-- 浏览 / 分享：一个人（没登录 = 一台设备）一天只算一次；自己的不算；只算现在公开的。返回算上的条数
--   sb_views.viewer：登录 = 用户 id；没登录 = 'd:' || md5(设备匿名 id)；分享前面再加 's:'
create or replace function sb_count(p_posts uuid[], p_device text, p_kind text) returns int language plpgsql security definer set search_path = public as $$
declare u uuid := nbq_uid(); who text; d date; n int := 0; pid uuid; ct text;
begin
  if cardinality(p_posts) > 50 then perform nbq_err('invalid', 'posts'); end if;
  if u is not null and not exists (select 1 from users where id = u) then perform nbq_err('login_required'); end if;
  who := coalesce(u::text, case when coalesce(p_device, '') ~ '^[A-Za-z0-9_-]{16,64}$' then 'd:' || md5(p_device) end);
  if who is null then perform nbq_err('invalid', 'device'); end if;
  if p_kind = 'share' then who := 's:' || who; end if;
  foreach pid in array coalesce(p_posts, '{}') loop
    continue when not sb_post_public(pid, u) or exists (select 1 from sb_posts where id = pid and user_id = u);
    select city into ct from sb_posts where id = pid; d := (now() at time zone city_tz(ct))::date;   -- 「一天」按这条所在城市的当地日期
    insert into sb_views(post_id, day, viewer) values (pid, d, who) on conflict do nothing;
    if found then
      if p_kind = 'share' then update sb_posts set shares = shares + 1 where id = pid; else update sb_posts set views = views + 1 where id = pid; end if;
      n := n + 1;
    end if;
  end loop;
  return n;
end $$;
create or replace function api_sb_view(p_posts uuid[], p_device text default null) returns int language sql security definer set search_path = public as $$
  select sb_count(p_posts, p_device, 'view') $$;
create or replace function api_sb_share(p_post uuid, p_device text default null) returns int language sql security definer set search_path = public as $$
  select sb_count(array[p_post], p_device, 'share') $$;
comment on table sb_views is '场边浏览 / 分享去重：同一个人（没登录 = 同一台设备）一天只算一次；viewer 以 s: 开头的是分享。30 天后删（S3），总数在 sb_posts.views / shares';

-- 场边举报（前台直接 insert reports，via = sideline）：对象必须是我现在看得到的、不是我自己的；举报照片 → 这条的照片先打码送审
create or replace function reports_sideline() returns trigger language plpgsql security definer set search_path = public as $$
declare pid uuid; owner uuid;
begin
  if new.target_type not in ('sb_post','sb_reply') then return new; end if;
  if new.target_type = 'sb_post' then
    begin pid := new.target_id::uuid; exception when others then perform nbq_err('not_found', 'post'); end;
    select user_id into owner from sb_posts where id = pid and sb_post_readable(id, new.reporter_id);
  else
    begin select r.post_id, r.user_id into pid, owner from sb_replies r where r.id = new.target_id::bigint and r.status = 'visible' and r.deleted_at is null
                and sb_post_readable(r.post_id, new.reporter_id) and not is_blocked(new.reporter_id, r.user_id);
    exception when others then perform nbq_err('not_found', 'reply'); end;
  end if;
  if owner is null then perform nbq_err('not_found', replace(new.target_type, 'sb_', '')); end if;
  if owner = new.reporter_id then perform nbq_err('invalid', 'target'); end if;
  if new.target_type = 'sb_post' and new.reason = 'photo' then
    update sb_photos set review = 'blurred', flagged_by = 'report' where post_id = pid and review = 'ok' and reviewed_at is null;
  end if;
  return new;
end $$;
drop trigger if exists trg_reports_sideline on reports;
create trigger trg_reports_sideline before insert on reports for each row execute function reports_sideline();

revoke execute on function sb_need_public(uuid, uuid), sb_replies_count(), api_sb_reply(uuid, text, uuid), api_sb_reply_delete(bigint), api_sb_replies_open(uuid, boolean),
  api_sb_ball(uuid), api_sb_unball(uuid), api_sb_hide(uuid, text), sb_count(uuid[], text, text), api_sb_view(uuid[], text), api_sb_share(uuid, text), reports_sideline() from public;
grant execute on function api_sb_reply(uuid, text, uuid), api_sb_reply_delete(bigint), api_sb_replies_open(uuid, boolean), api_sb_ball(uuid), api_sb_unball(uuid),
  api_sb_hide(uuid, text), api_sb_view(uuid[], text), api_sb_share(uuid, text) to nbq_user, nbq_service;

-- ---------- 场边 · 互动通知（第七批 S2b+，2026-10-26 定） ----------
--   网球（sb_ball）：第一下立刻推；还没看（read_at 为空）时后面的合并进同一条（「Coco 和另外 4 人给你点了网球」），不再响；看过之后再有新的网球 → 新的一条，再推
--   回复（sb_reply 给作者 / sb_reply_to 给被回复的人）：每条都推、带回复内容；同一条发布 10 分钟内的合并进同一条（「Coco 等 3 人回复了你」），不再响
--   sb_count = 这一条合并了多少人（重算，不累加：取消网球、删回复都准）；actor_id = 最近的那个人
--   不紧急：夜里顺延到早上 8 点（server/notify/rules.mjs LOW）；不发邮件；发布被删 / 隐藏、回复被删 / 隐藏、屏蔽了的 → 推送前判为过时不推
alter type notif_kind add value if not exists 'sb_ball';       -- 有人给你的发布点了网球
alter type notif_kind add value if not exists 'sb_reply';      -- 有人回复了你的发布
alter type notif_kind add value if not exists 'sb_reply_to';   -- 有人在别人的发布下面回复了你
alter table notifications add column if not exists sb_post_id  uuid references sb_posts(id) on delete cascade;
alter table notifications add column if not exists sb_reply_id bigint references sb_replies(id) on delete set null;
alter table notifications add column if not exists sb_count    int not null default 1 check (sb_count >= 1);
create index if not exists notifications_sb on notifications (user_id, sb_post_id, kind) where sb_post_id is not null and read_at is null;

-- 网球：点了（p_new = true）/ 取消（false）后调用，重算作者那条没看的网球提醒
--   人数 = 上一条网球提醒被看过之后点的人（不按提醒的创建时间算：同时点时先开始、后拿到锁的那一下也要算上）
--   有没看的 → 更新人数和名字（0 人就拿掉）；没有 → 刚点的这一下新建一条
create or replace function sb_notify_ball(p_post uuid, p_actor uuid, p_new boolean) returns void language plpgsql security definer set search_path = public as $$
declare au uuid; nid bigint; since timestamptz; c int; last uuid;
begin
  select user_id into au from sb_posts where id = p_post;
  if au is null or au = p_actor then return; end if;
  perform pg_advisory_xact_lock(hashtext('sbn:' || au || ':' || p_post || ':sb_ball'));
  select id into nid from notifications where user_id = au and sb_post_id = p_post and kind = 'sb_ball' and read_at is null order by id desc limit 1;
  select coalesce(max(read_at), '-infinity') into since from notifications where user_id = au and sb_post_id = p_post and kind = 'sb_ball' and read_at is not null;
  select count(*), (array_agg(user_id order by created_at desc, user_id))[1] into c, last from sb_balls where post_id = p_post and user_id <> au and created_at > since;
  if nid is null then
    if p_new and c > 0 then insert into notifications(user_id, kind, actor_id, sb_post_id, sb_count) values (au, 'sb_ball', p_actor, p_post, c); end if;
  elsif c = 0 then delete from notifications where id = nid;          -- 都取消了：这条没看的提醒也拿掉
  else update notifications set sb_count = c, actor_id = last where id = nid;
  end if;
end $$;

-- 回复：给作者（sb_reply）和被回复的人（sb_reply_to）。自己回自己的不提醒
create or replace function sb_notify_reply(p_reply bigint) returns void language plpgsql security definer set search_path = public as $$
declare r sb_replies; au uuid; who uuid; k notif_kind; n notifications; c int;
begin
  select * into r from sb_replies where id = p_reply;
  select user_id into au from sb_posts where id = r.post_id;
  foreach who in array array[au, r.to_user] loop
    continue when who is null or who = r.user_id or (who = r.to_user and who = au);
    k := case when who = au then 'sb_reply' else 'sb_reply_to' end;
    perform pg_advisory_xact_lock(hashtext('sbn:' || who || ':' || r.post_id || ':' || k));
    select * into n from notifications where user_id = who and sb_post_id = r.post_id and kind = k and read_at is null and created_at > now() - interval '10 minutes'
     order by id desc limit 1;
    if n.id is null then
      insert into notifications(user_id, kind, actor_id, sb_post_id, sb_reply_id) values (who, k, r.user_id, r.post_id, r.id);
    else
      select count(distinct x.user_id) into c from sb_replies x
       where x.post_id = r.post_id and x.user_id <> who and x.status = 'visible' and x.deleted_at is null and x.created_at >= n.created_at
         and (k = 'sb_reply' or x.to_user = who);
      update notifications set actor_id = r.user_id, sb_reply_id = r.id, sb_count = greatest(c, 1) where id = n.id;
    end if;
  end loop;
end $$;

-- 推送前判断过时（发送程序调用）：返回原因或 null
create or replace function sb_notif_stale(p_notif bigint) returns text language sql stable security definer set search_path = public as $$
  select case
    when p.id is null or p.deleted_at is not null or p.status <> 'visible' then 'removed'
    when n.kind in ('sb_reply','sb_reply_to') and (r.id is null or r.deleted_at is not null or r.status <> 'visible') then 'removed'
  end
  from notifications n left join sb_posts p on p.id = n.sb_post_id left join sb_replies r on r.id = n.sb_reply_id
  where n.id = p_notif
$$;
revoke execute on function sb_notify_ball(uuid, uuid, boolean), sb_notify_reply(bigint), sb_notif_stale(bigint) from public;
grant execute on function sb_notif_stale(bigint) to nbq_service;

-- ---------- 场边定时任务（第七批 S3，2026-10） ----------
--   job_sb_hourly(p_now)（每小时第 17 分钟；可重复执行，记 job_runs 'sb_hourly'）：
--   · 大家发起的话题到门槛放出：最近 release_days（7）天里有 release_people（3）个不同的人发过（没隐藏、没删除）→ released_at
--   · 沉下去：放出后 sink_days（30）天没人发 → sunk_at（再有人发时 api_sb_post 清掉）；常驻 / 限时不沉
--   · 今日推荐：每座开放（beta / on）的城市按当地日期写 sb_today；当天已选了「本周最热」的不再换，其余跟着排期变
--   · 浏览去重明细 sb_views 30 天后删（总数早已记在 sb_posts.views / shares）
--   「2 小时后再公开」「24 小时后收进相册」按 publish_at 实时判断（sb_post_public），不需要任务改状态，任务也不碰它们
do $$ begin
  if not exists (select 1 from information_schema.columns where table_name = 'sb_week' and column_name = 'alt_topic_id') then
    alter table sb_week add column alt_topic_id text references sb_topics(id);     -- 隔周轮换：ISO 周数为单数的那周用它
    update sb_week set alt_topic_id = 'good' where dow = 7;                        -- 设计稿：周日 #场边的晚霞 和 #实用网球好物 隔周轮换
  end if;
end $$;
create index if not exists sb_views_day on sb_views (day);

create table if not exists sb_today (                       -- 今日推荐（每城每天一条；前台的「今日推荐」卡片、底栏第二句、发布页第一个）
  city      text not null references cities(key),
  day       date not null,                                   -- 城市当地日期
  topic_id  text not null references sb_topics(id),
  source    text not null check (source in ('special','week','alt','hot','fallback')),
  picked_at timestamptz not null default now(),
  primary key (city, day)
);
do $$ begin
  execute 'alter table sb_today enable row level security';
  execute 'drop policy if exists svc_all on sb_today'; execute 'create policy svc_all on sb_today to nbq_service using (true) with check (true)';
  execute 'drop policy if exists adm_read on sb_today'; execute 'create policy adm_read on sb_today for select to nbq_admin using (true)';
  execute 'grant all on sb_today to nbq_service'; execute 'grant select on sb_today to nbq_admin';
  execute 'revoke all on sb_today from public, nbq_viewer';
  if exists (select 1 from pg_roles where rolname = 'anon') then execute 'revoke all on sb_today from anon, authenticated'; end if;
end $$;

-- 话题这天能不能被推荐：上线、没并入别的、限时的在时间内
create or replace function sb_topic_live(p_topic text, p_at timestamptz) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from sb_topics t where t.id = p_topic and t.active and t.merged_into is null
                   and (t.kind <> 'limited' or (p_at >= t.starts_at and p_at < t.ends_at)))
$$;

-- 算某城某天（当地日期）的今日推荐：特别安排（按日期）→ 周历（隔周轮换 / 大家发起的本周最热）→ 兜底（按排序第一个本周没排上的常驻话题）
create or replace function sb_pick_today(p_city text, p_day date, out topic_id text, out source text)
language plpgsql stable security definer set search_path = public as $$
declare tz text := city_tz(p_city); d0 timestamptz := (p_day::timestamp at time zone tz); w sb_week;
begin
  select s.topic_id into topic_id from sb_specials s
   where s.trigger = 'date' and s.active and (s.city is null or s.city = p_city) and d0 >= s.starts_at and d0 < s.ends_at and sb_topic_live(s.topic_id, d0)
   order by s.starts_at desc, s.id limit 1;
  if topic_id is not null then source := 'special'; return; end if;
  select * into w from sb_week where dow = extract(isodow from p_day)::int;
  if found and w.auto_hot then
    select t.id into topic_id from sb_topics t join sb_posts p on p.topic_id = t.id
     where t.kind = 'user' and t.active and t.merged_into is null and t.released_at is not null and t.sunk_at is null and (t.city is null or t.city = p_city)
       and p.city = p_city and p.status = 'visible' and p.deleted_at is null and p.publish_at >= d0 - interval '7 days' and p.publish_at < d0
     group by t.id order by count(distinct p.user_id) desc, count(*) desc, t.id limit 1;
    if topic_id is not null then source := 'hot'; return; end if;
  elsif found then
    if w.alt_topic_id is not null and extract(week from p_day)::int % 2 = 1 and sb_topic_live(w.alt_topic_id, d0) then topic_id := w.alt_topic_id; source := 'alt'; return; end if;
    if sb_topic_live(w.topic_id, d0) then topic_id := w.topic_id; source := 'week'; return; end if;
  end if;
  select t.id into topic_id from sb_topics t
   where t.kind = 'evergreen' and t.active and t.merged_into is null
   order by (t.id in (select x from sb_week k, unnest(array[k.topic_id, k.alt_topic_id]) x where x is not null)), t.sort, t.id limit 1;
  source := case when topic_id is not null then 'fallback' end;
end $$;

-- 前台读今日推荐（没登录也能读）；任务还没写今天这条时当场算
create or replace function sb_today_topic(p_city text) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare d date; r sb_today; t text; s text;
begin
  if not exists (select 1 from cities where key = p_city and status in ('beta','on')) then return null; end if;
  d := (now() at time zone city_tz(p_city))::date;
  select * into r from sb_today where city = p_city and day = d;
  if found then return jsonb_build_object('day', d, 'topic_id', r.topic_id, 'source', r.source); end if;
  select x.topic_id, x.source into t, s from sb_pick_today(p_city, d) x;
  return case when t is not null then jsonb_build_object('day', d, 'topic_id', t, 'source', s) end;
end $$;

-- 写今日推荐（任务每小时调；后台发布配置后也马上调一次，三个地方一起变）。当天已选的「本周最热」不再换
create or replace function sb_today_refresh(p_now timestamptz default now()) returns int language plpgsql security definer set search_path = public as $$
declare n int := 0; k int; c record; d date; pt text; ps text;
begin
  for c in select key, tz from cities where status in ('beta','on') order by key loop
    d := (p_now at time zone c.tz)::date;
    select x.topic_id, x.source into pt, ps from sb_pick_today(c.key, d) x;
    continue when pt is null;
    insert into sb_today(city, day, topic_id, source, picked_at) values (c.key, d, pt, ps, p_now)
    on conflict (city, day) do update set topic_id = excluded.topic_id, source = excluded.source, picked_at = excluded.picked_at
     where (sb_today.topic_id, sb_today.source) is distinct from (excluded.topic_id, excluded.source)
       and not (sb_today.source = 'hot' and excluded.source = 'hot');
    get diagnostics k = row_count; n := n + k;
  end loop;
  return n;
end $$;

create or replace function job_sb_hourly(p_now timestamptz default now()) returns int language plpgsql security definer set search_path = public as $$
declare t0 timestamptz := clock_timestamp(); n int := 0; k int;
begin
  -- 放出
  update sb_topics t set released_at = p_now, updated_at = p_now
   where t.kind = 'user' and t.released_at is null and t.merged_into is null and t.active
     and (select count(distinct p.user_id) from sb_posts p where p.topic_id = t.id and p.status = 'visible' and p.deleted_at is null
            and p.created_at > p_now - make_interval(days => sb_setting('release_days')) and p.created_at <= p_now) >= sb_setting('release_people');
  get diagnostics k = row_count; n := n + k;
  -- 沉下去
  update sb_topics t set sunk_at = p_now, updated_at = p_now
   where t.kind = 'user' and t.released_at is not null and t.sunk_at is null and t.merged_into is null
     and greatest(t.released_at, coalesce((select max(p.created_at) from sb_posts p where p.topic_id = t.id and p.deleted_at is null), '-infinity'))
         < p_now - make_interval(days => sb_setting('sink_days'));
  get diagnostics k = row_count; n := n + k;
  -- 今日推荐
  n := n + sb_today_refresh(p_now);
  -- 浏览去重明细 30 天后删
  delete from sb_views where day < (p_now at time zone 'UTC')::date - 30;
  get diagnostics k = row_count; n := n + k;
  return nbq_job_log('sb_hourly', n, t0);
end $$;
revoke execute on function sb_topic_live(text, timestamptz), sb_pick_today(text, date), sb_today_topic(text), sb_today_refresh(timestamptz), job_sb_hourly(timestamptz) from public;
grant execute on function sb_today_topic(text) to nbq_user, nbq_service, nbq_admin, nbq_viewer;
grant execute on function sb_pick_today(text, date) to nbq_service, nbq_admin;
grant execute on function job_sb_hourly(timestamptz) to nbq_service;
do $$ begin if exists (select 1 from pg_extension where extname = 'pg_cron') then
  execute $c$select cron.schedule('nbq_sb_hourly', '17 * * * *', 'select job_sb_hourly()')$c$;
end if; end $$;

-- ---------- 场边配置下发（第七批 S4，2026-10） ----------
--   后台改的是一份共用草稿（sb_config_draft，只有一份）；发布 = 检查 → 写进正式的配置表 → 存成一个版本（sb_config_versions）→ 清掉草稿 → 马上刷新今日推荐
--   退回 = 把某个旧版本再发布一次（新版本号，记 from_version）；有没发布的草稿会一起清掉
--   前台只读 sb_config(已有版本号)：版本没变只回 {version, same}；配置里不带只给后台看的说明（周历、特别安排的 note）
--   配置包括：常驻 / 限时话题（大家发起的不在里面；放进去改成常驻 = 「转为常驻」；常驻 / 限时从配置里拿掉 = 下线）、相似词、太宽的词、设置、底栏问题、时段、开头、周历、特别安排
--   只负责部分城市的管理员不能改（配置是所有城市共用的）
insert into admin_perms(action, label, roles, need_reason) values
 ('sideline.config', '场边：改话题、引导文案、排期，发布 / 退回版本', '{owner,operator}', false)
on conflict (action) do update set label = excluded.label, roles = excluded.roles, need_reason = excluded.need_reason;

update sb_specials set active = false, note = '暂不做（10-27）：要接天气数据' where trigger = 'rain' and note like '雨停 2 小时内%';
alter table sb_config_versions add column if not exists from_version int references sb_config_versions(version);   -- 退回：从哪个版本退回来的

create table if not exists sb_config_draft (
  id           boolean primary key default true check (id),   -- 只有一份
  config       jsonb not null,
  base_version int not null references sb_config_versions(version),
  updated_by   uuid references admin_users(id),
  updated_at   timestamptz not null default now()
);
do $$ begin
  execute 'alter table sb_config_draft enable row level security';
  execute 'drop policy if exists svc_all on sb_config_draft'; execute 'create policy svc_all on sb_config_draft to nbq_service using (true) with check (true)';
  execute 'drop policy if exists adm_read on sb_config_draft'; execute 'create policy adm_read on sb_config_draft for select to nbq_admin using (true)';
  execute 'grant all on sb_config_draft to nbq_service'; execute 'grant select on sb_config_draft to nbq_admin';
  execute 'revoke all on sb_config_draft from public, anon, authenticated, nbq_viewer, nbq_user';
end $$;

create or replace function sb_ts(t timestamptz) returns text language sql immutable as $$ select to_char(t at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') $$;

-- 正式配置表 → 一份 JSON（版本里存的就是它）
create or replace function sb_config_export() returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'topics', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'title', title, 'kind', kind, 'intro', intro, 'ask', ask, 'starters', to_jsonb(starters),
                 'photo_tags', to_jsonb(photo_tags), 'suggest', suggest, 'active', active, 'starts_at', sb_ts(starts_at), 'ends_at', sb_ts(ends_at), 'sort', sort) order by sort, id)
               from sb_topics where kind in ('evergreen','limited') and merged_into is null), '[]'),
    'alias', coalesce((select jsonb_agg(jsonb_build_array(word, topic_id) order by word) from sb_topic_alias), '[]'),
    'generic', coalesce((select jsonb_agg(word order by word) from sb_generic_words), '[]'),
    'settings', coalesce((select jsonb_object_agg(key, value) from sb_settings), '{}'),
    'hints', coalesce((select jsonb_agg(jsonb_build_object('kind', kind, 'text', text, 'daypart', daypart, 'active', active) order by sort, id) from sb_hints), '[]'),
    'slots', coalesce((select jsonb_agg(jsonb_build_object('slot', slot, 'name', name, 'from', from_hour, 'to', to_hour, 'topics', to_jsonb(topic_ids)) order by slot) from sb_slots), '[]'),
    'starters', jsonb_build_object('court', coalesce((select jsonb_agg(text order by sort) from sb_starters where kind = 'court'), '[]'),
                                   'lost',  coalesce((select jsonb_agg(text order by sort) from sb_starters where kind = 'lost'), '[]')),
    'week', coalesce((select jsonb_agg(jsonb_build_object('dow', dow, 'topic_id', topic_id, 'alt_topic_id', alt_topic_id, 'auto_hot', auto_hot, 'note', note) order by dow) from sb_week), '[]'),
    'specials', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'topic_id', topic_id, 'trigger', trigger, 'starts_at', sb_ts(starts_at), 'ends_at', sb_ts(ends_at),
                 'city', city, 'active', active, 'note', note) order by trigger, starts_at nulls last, id) from sb_specials), '[]'))
$$;

create or replace function sb_config_diff(a jsonb, b jsonb) returns text[] language sql immutable as $$
  select coalesce(array_agg(k order by k), '{}') from (select jsonb_object_keys(coalesce(a, '{}')) k union select jsonb_object_keys(coalesce(b, '{}'))) x
   where a->k is distinct from b->k
$$;

-- 把一份配置写进正式的表（只给 发布 / 检查草稿 用）。出错报 invalid，detail = 'config:<哪一块>[:<哪一项>]'
create or replace function sb_config_apply(c jsonb) returns void language plpgsql security definer set search_path = public as $$
declare part text := 'config'; k text; x jsonb; v int; i int; ids text[] := '{}'; cur sb_topics;
begin
  if jsonb_typeof(c) is distinct from 'object' then perform nbq_err('invalid', 'config'); end if;
  for k in select jsonb_object_keys(c) loop
    if k not in ('topics','alias','generic','settings','hints','slots','starters','week','specials') then perform nbq_err('invalid', 'config:' || k); end if;
  end loop;
  begin
    -- 设置：只能改已有的项，整数，在范围内
    part := 'settings';
    if c ? 'settings' then
      if jsonb_typeof(c->'settings') <> 'object' then perform nbq_err('invalid', 'config:settings'); end if;
      for k, x in select key, value from jsonb_each(c->'settings') loop
        if jsonb_typeof(x) <> 'number' or (x)::text !~ '^[0-9]+$' then perform nbq_err('invalid', 'config:settings:' || k); end if;
        v := (x)::text::int;
        if not exists (select 1 from (values ('name_min',1,12),('name_max',2,20),('release_people',1,50),('release_days',1,90),('sink_days',1,365),('hint_every',2,30),
              ('hint_hold',1,30),('suggest_n',1,6),('hint_max_len',4,20),('post_max_len',10,60),('reply_max_len',10,60),('later_hours',1,6),('public_hours',1,48)) r(key, lo, hi)
              where r.key = k and v between r.lo and r.hi) then perform nbq_err('invalid', 'config:settings:' || k); end if;
        update sb_settings set value = to_jsonb(v), updated_at = now() where key = k and value is distinct from to_jsonb(v);
      end loop;
      if sb_setting('name_min') > sb_setting('name_max') then perform nbq_err('invalid', 'config:settings:name_min'); end if;
    end if;
    -- 话题：常驻 / 限时整份；没列出的常驻 / 限时 → 下线；大家发起的列进来改成常驻 = 转为常驻
    part := 'topics';
    if c ? 'topics' then
      if jsonb_typeof(c->'topics') <> 'array' then perform nbq_err('invalid', 'config:topics'); end if;
      for x in select * from jsonb_array_elements(c->'topics') loop
        k := x->>'id';
        if k is null or k = any(ids) then perform nbq_err('invalid', 'config:topics:' || coalesce(k, '?')); end if;
        ids := ids || k;
        if coalesce(x->>'kind', '') not in ('evergreen','limited') then perform nbq_err('invalid', 'config:topics:' || k); end if;
        if exists (select 1 from jsonb_array_elements(coalesce(x->'starters', '[]')) s where jsonb_typeof(s) <> 'string')
           or exists (select 1 from jsonb_array_elements(coalesce(x->'photo_tags', '[]')) s where jsonb_typeof(s) <> 'string') then perform nbq_err('invalid', 'config:topics:' || k); end if;
        select * into cur from sb_topics where id = k;
        if found and (cur.merged_into is not null or (cur.kind = 'user' and x->>'kind' <> 'evergreen')) then perform nbq_err('invalid', 'config:topics:' || k); end if;
        insert into sb_topics(id, title, kind, intro, ask, starters, photo_tags, suggest, active, starts_at, ends_at, sort, updated_at)
        values (k, btrim(x->>'title'), x->>'kind', coalesce(x->>'intro', ''), coalesce(x->>'ask', ''),
                array(select jsonb_array_elements_text(coalesce(x->'starters', '[]'))), array(select jsonb_array_elements_text(coalesce(x->'photo_tags', '[]'))),
                coalesce((x->>'suggest')::boolean, true), coalesce((x->>'active')::boolean, false), (x->>'starts_at')::timestamptz, (x->>'ends_at')::timestamptz,
                coalesce((x->>'sort')::smallint, 100), now())
        on conflict (id) do update set title = excluded.title, kind = excluded.kind, intro = excluded.intro, ask = excluded.ask, starters = excluded.starters,
          photo_tags = excluded.photo_tags, suggest = excluded.suggest, active = excluded.active, starts_at = excluded.starts_at, ends_at = excluded.ends_at,
          sort = excluded.sort, updated_at = now()
         where (sb_topics.title, sb_topics.kind, sb_topics.intro, sb_topics.ask, sb_topics.starters, sb_topics.photo_tags, sb_topics.suggest, sb_topics.active,
                sb_topics.starts_at, sb_topics.ends_at, sb_topics.sort)
           is distinct from (excluded.title, excluded.kind, excluded.intro, excluded.ask, excluded.starters, excluded.photo_tags, excluded.suggest, excluded.active,
                excluded.starts_at, excluded.ends_at, excluded.sort);
        if char_length(btrim(x->>'title')) < sb_setting('name_min') or char_length(btrim(x->>'title')) > sb_setting('name_max') then perform nbq_err('invalid', 'config:topics:' || k); end if;
      end loop;
      update sb_topics set active = false, updated_at = now() where kind in ('evergreen','limited') and merged_into is null and active and not (id = any(ids));
    end if;
    part := 'alias';
    if c ? 'alias' then
      delete from sb_topic_alias;
      insert into sb_topic_alias(word, topic_id) select btrim(e->>0), e->>1 from jsonb_array_elements(c->'alias') e;
      if exists (select 1 from sb_topic_alias a join sb_topics t on t.id = a.topic_id where t.merged_into is not null) then perform nbq_err('invalid', 'config:alias'); end if;
    end if;
    part := 'generic';
    if c ? 'generic' then
      delete from sb_generic_words;
      insert into sb_generic_words(word) select btrim(e) from jsonb_array_elements_text(c->'generic') e;
    end if;
    part := 'hints';
    if c ? 'hints' then
      delete from sb_hints; i := 0;
      for x in select * from jsonb_array_elements(c->'hints') loop
        i := i + 1;
        insert into sb_hints(kind, text, daypart, sort, active) values (x->>'kind', btrim(x->>'text'), coalesce(x->>'daypart', 'any'), i * 10, coalesce((x->>'active')::boolean, true));
      end loop;
      if not exists (select 1 from sb_hints where kind = 'general' and active) then perform nbq_err('invalid', 'config:hints:general'); end if;
    end if;
    part := 'starters';
    if c ? 'starters' then
      delete from sb_starters;
      for k in select jsonb_object_keys(c->'starters') loop
        if k not in ('court','lost') then perform nbq_err('invalid', 'config:starters:' || k); end if;
        insert into sb_starters(kind, sort, text) select k, o::smallint, btrim(e) from jsonb_array_elements_text(c->'starters'->k) with ordinality t(e, o);
      end loop;
    end if;
    part := 'slots';
    if c ? 'slots' then
      delete from sb_slots;
      insert into sb_slots(slot, name, from_hour, to_hour, topic_ids)
      select (e->>'slot')::smallint, btrim(e->>'name'), (e->>'from')::smallint, (e->>'to')::smallint, array(select jsonb_array_elements_text(e->'topics')) from jsonb_array_elements(c->'slots') e;
      if (select count(*) from sb_slots) <> 4 then perform nbq_err('invalid', 'config:slots'); end if;
    end if;
    part := 'week';
    if c ? 'week' then
      delete from sb_week;
      insert into sb_week(dow, topic_id, alt_topic_id, auto_hot, note)
      select (e->>'dow')::smallint, nullif(e->>'topic_id', ''), nullif(e->>'alt_topic_id', ''), coalesce((e->>'auto_hot')::boolean, false), coalesce(e->>'note', '')
        from jsonb_array_elements(c->'week') e;
      if (select count(*) from sb_week) <> 7 then perform nbq_err('invalid', 'config:week'); end if;
    end if;
    part := 'specials';
    if c ? 'specials' then
      delete from sb_specials;
      insert into sb_specials(id, topic_id, trigger, starts_at, ends_at, city, active, note)
      select coalesce(nullif(e->>'id', '')::uuid, gen_random_uuid()), e->>'topic_id', coalesce(e->>'trigger', 'date'), (e->>'starts_at')::timestamptz, (e->>'ends_at')::timestamptz,
             nullif(e->>'city', ''), coalesce((e->>'active')::boolean, true), coalesce(e->>'note', '')
        from jsonb_array_elements(c->'specials') e;
    end if;
    -- 互相引用的检查（话题下线后，时段 / 周历 / 相似词还指着它就不行）
    part := 'refs';
    if exists (select 1 from sb_slots s, unnest(s.topic_ids) t where not exists (select 1 from sb_topics x where x.id = t and x.active and x.kind <> 'user')) then perform nbq_err('invalid', 'config:slots:topic'); end if;
    if exists (select 1 from sb_week w, unnest(array[w.topic_id, w.alt_topic_id]) t where t is not null and not exists (select 1 from sb_topics x where x.id = t and x.active and x.kind <> 'user')) then perform nbq_err('invalid', 'config:week:topic'); end if;
    if exists (select 1 from sb_specials s join sb_topics x on x.id = s.topic_id where s.active and s.trigger = 'date' and x.kind = 'user') then perform nbq_err('invalid', 'config:specials:topic'); end if;
  exception when data_exception or integrity_constraint_violation then
    perform nbq_err('invalid', 'config:' || part);
  end;
end $$;

-- 只检查不写：在子事务里试着写一遍、导出、再撤销；返回整理过的整份配置（时间、顺序、默认值都和版本里存的写法一致）
create or replace function sb_config_check(c jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare r jsonb;
begin
  begin
    perform sb_config_apply(c);
    r := sb_config_export();
    raise exception using errcode = 'NB001';
  exception when sqlstate 'NB001' then null;
  end;
  return r;
end $$;

create or replace function sb_config_latest() returns sb_config_versions language sql stable security definer set search_path = public as $$
  select * from sb_config_versions order by version desc limit 1 $$;

-- 第一次建库：把设计稿 v35 的默认配置存成第 1 版
insert into sb_config_versions(config, note) select sb_config_export(), '初始配置（设计稿 v35）' where not exists (select 1 from sb_config_versions);

-- 后台：不能改的情况
create or replace function sb_config_gate(p_what text, p_base int, p_detail jsonb default '{}') returns uuid language plpgsql security definer set search_path = public as $$
declare a uuid;
begin
  a := nbq_admin_act('sideline.config', p_what, null, p_detail);
  if (select cities from admin_users where id = a) is not null then perform nbq_err('admin_forbidden', 'city'); end if;
  perform pg_advisory_xact_lock(hashtext('nbq:sb_config'));
  if p_base is distinct from (sb_config_latest()).version then perform nbq_err('admin_config_stale', (sb_config_latest()).version::text); end if;
  return a;
end $$;

-- 后台读：草稿（没有草稿 = 最新版本）+ 改了哪几块
create or replace function admin_sb_config_draft() returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v sb_config_versions := sb_config_latest(); d sb_config_draft;
begin
  if nbq_admin_id() is null or not exists (select 1 from admin_users where id = nbq_admin_id() and not disabled) then perform nbq_err('admin_session_expired'); end if;
  select * into d from sb_config_draft;
  return jsonb_build_object('version', v.version, 'published_at', v.published_at, 'config', coalesce(d.config, v.config),
    'changed', to_jsonb(sb_config_diff(v.config, coalesce(d.config, v.config))), 'updated_at', d.updated_at,
    'updated_by', (select name from admin_users where id = d.updated_by));
end $$;

-- 后台改草稿的一块（p_base = 改的时候看到的版本号；别人在这期间发布过 → admin_config_stale）。保存时就检查，错了不存
create or replace function admin_sb_config_set(p_part text, p_value jsonb, p_base int) returns jsonb language plpgsql security definer set search_path = public as $$
declare a uuid; v sb_config_versions; d sb_config_draft; nc jsonb;
begin
  if p_part not in ('topics','alias','generic','settings','hints','slots','starters','week','specials') then perform nbq_err('invalid', 'part'); end if;
  a := sb_config_gate('draft:' || p_part, p_base, jsonb_build_object('part', p_part));
  v := sb_config_latest(); select * into d from sb_config_draft;
  nc := coalesce(d.config, v.config) || jsonb_build_object(p_part, p_value);
  nc := sb_config_check(nc);
  if nc = v.config then delete from sb_config_draft;
  else insert into sb_config_draft(id, config, base_version, updated_by, updated_at) values (true, nc, v.version, a, now())
       on conflict (id) do update set config = excluded.config, base_version = excluded.base_version, updated_by = excluded.updated_by, updated_at = excluded.updated_at;
  end if;
  return admin_sb_config_draft();
end $$;

create or replace function admin_sb_config_discard(p_base int) returns void language plpgsql security definer set search_path = public as $$
begin
  perform sb_config_gate('discard', p_base);
  delete from sb_config_draft;
end $$;

-- 发布草稿：一句说明（1–60 字）必填；返回新版本号
create or replace function admin_sb_config_publish(p_note text, p_base int) returns int language plpgsql security definer set search_path = public as $$
declare a uuid; d sb_config_draft; v sb_config_versions := sb_config_latest(); nv int;
begin
  select * into d from sb_config_draft;
  a := sb_config_gate('publish', p_base, jsonb_build_object('note', btrim(coalesce(p_note, '')), 'changed', to_jsonb(sb_config_diff(v.config, coalesce(d.config, v.config)))));
  if char_length(btrim(coalesce(p_note, ''))) not between 1 and 60 then perform nbq_err('invalid', 'note'); end if;
  if d.config is null then perform nbq_err('invalid', 'unchanged'); end if;
  perform sb_config_apply(d.config);
  if sb_config_export() = v.config then perform nbq_err('invalid', 'unchanged'); end if;
  insert into sb_config_versions(config, note, published_by) values (sb_config_export(), btrim(p_note), a) returning version into nv;
  delete from sb_config_draft;
  perform sb_today_refresh(now());
  return nv;
end $$;

-- 退回到某个旧版本：再发布一次那份配置（新版本号）；没发布的草稿一起清掉
create or replace function admin_sb_config_rollback(p_version int, p_base int, p_note text default null) returns int language plpgsql security definer set search_path = public as $$
declare a uuid; o sb_config_versions; nv int; had boolean;
begin
  had := exists (select 1 from sb_config_draft);
  a := sb_config_gate('rollback:' || coalesce(p_version::text, '?'), p_base, jsonb_build_object('to', p_version, 'draft_discarded', had));
  select * into o from sb_config_versions where version = p_version;
  if not found then perform nbq_err('not_found', 'version'); end if;
  if p_version = (sb_config_latest()).version then perform nbq_err('invalid', 'unchanged'); end if;
  if char_length(btrim(coalesce(p_note, ''))) > 60 then perform nbq_err('invalid', 'note'); end if;
  perform sb_config_apply(o.config);
  insert into sb_config_versions(config, note, published_by, from_version)
  values (sb_config_export(), coalesce(nullif(btrim(p_note), ''), '退回到 v' || p_version), a, p_version) returning version into nv;
  delete from sb_config_draft;
  perform sb_today_refresh(now());
  return nv;
end $$;

-- 版本列表：每一版改了哪几块（和上一版比）
create or replace function admin_sb_config_versions(p_limit int default 20) returns table(version int, note text, published_by text, published_at timestamptz, from_version int, changed text[])
language plpgsql stable security definer set search_path = public as $$
begin
  if nbq_admin_id() is null or not exists (select 1 from admin_users where id = nbq_admin_id() and not disabled) then perform nbq_err('admin_session_expired'); end if;
  return query
  select v.version, v.note, (select name from admin_users u where u.id = v.published_by), v.published_at, v.from_version,
         sb_config_diff((select p.config from sb_config_versions p where p.version < v.version order by p.version desc limit 1), v.config)
    from sb_config_versions v order by v.version desc limit least(greatest(coalesce(p_limit, 20), 1), 200);
end $$;

-- 话题页「提前放出」：大家发起的、还没到门槛的，马上出现在「大家在聊」和搜索里（不走版本）
create or replace function admin_sb_topic_release(p_topic text) returns void language plpgsql security definer set search_path = public as $$
declare a uuid;
begin
  a := nbq_admin_act('sideline.config', p_topic, null, '{"what":"release"}');
  if (select cities from admin_users where id = a) is not null
     and not coalesce((select t.city = any(u.cities) from sb_topics t, admin_users u where t.id = p_topic and u.id = a), false) then perform nbq_err('admin_forbidden', 'city'); end if;
  update sb_topics set released_at = now(), sunk_at = null, updated_at = now() where id = p_topic and kind = 'user' and released_at is null and merged_into is null;
  if not found then perform nbq_err('not_found', 'topic'); end if;
end $$;

-- 前台读配置（没登录也能读）：p_have = 手上的版本号，没变只回 {version, same: true}
create or replace function sb_config(p_have int default null) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v sb_config_versions := sb_config_latest(); c jsonb;
begin
  if v.version is null then return null; end if;
  if p_have = v.version then return jsonb_build_object('version', v.version, 'same', true); end if;
  c := v.config;
  c := c || jsonb_build_object(
    'week', coalesce((select jsonb_agg(e - 'note' order by (e->>'dow')::int) from jsonb_array_elements(c->'week') e), '[]'),
    'specials', coalesce((select jsonb_agg(e - 'note') from jsonb_array_elements(c->'specials') e where (e->>'active')::boolean), '[]'),
    'topics', coalesce((select jsonb_agg(e) from jsonb_array_elements(c->'topics') e where (e->>'active')::boolean), '[]'));
  return jsonb_build_object('version', v.version, 'published_at', v.published_at, 'config', c);
end $$;

revoke execute on function sb_ts(timestamptz), sb_config_export(), sb_config_diff(jsonb, jsonb), sb_config_apply(jsonb), sb_config_check(jsonb), sb_config_latest(),
  sb_config_gate(text, int, jsonb), admin_sb_config_draft(), admin_sb_config_set(text, jsonb, int), admin_sb_config_discard(int), admin_sb_config_publish(text, int),
  admin_sb_config_rollback(int, int, text), admin_sb_config_versions(int), admin_sb_topic_release(text), sb_config(int) from public;
grant execute on function admin_sb_config_draft(), admin_sb_config_versions(int) to nbq_admin, nbq_viewer;
grant execute on function admin_sb_config_set(text, jsonb, int), admin_sb_config_discard(int), admin_sb_config_publish(text, int), admin_sb_config_rollback(int, int, text),
  admin_sb_topic_release(text) to nbq_admin;
grant execute on function sb_config(int) to nbq_user, nbq_service, nbq_admin, nbq_viewer;
grant execute on function sb_config_export() to nbq_service;

-- ---------- 后台审核场边（A1，2026-10；待审核页「场边」） ----------
--   隐藏发布 / 回复：权限 message.hide（要理由；只负责部分城市的只能管自己城市）；隐藏 = 作者仍在相册看到、别人看不到，hidden_reason 作者能看到；p_hide = false 恢复
--   照片审核：权限 report.handle；只处理 review = 'blurred'（自动识别可疑 / 被举报）送审的：keep → ok，remove → removed；记审核人，之后不再被自动改
--   举报本身的状态仍走 admin_report_handle
create or replace function admin_sb_post_hide(p_post uuid, p_hide boolean, p_reason text) returns void language plpgsql security definer set search_path = public as $$
begin
  perform nbq_admin_act('message.hide', 'sbpost:' || p_post, p_reason, jsonb_build_object('hide', coalesce(p_hide, true)));
  update sb_posts set status = case when coalesce(p_hide, true) then 'hidden' else 'visible' end,
                      hidden_reason = case when coalesce(p_hide, true) then btrim(p_reason) end
   where id = p_post and deleted_at is null;
  if not found then perform nbq_err('not_found', 'post'); end if;
end $$;
create or replace function admin_sb_reply_hide(p_reply bigint, p_hide boolean, p_reason text) returns void language plpgsql security definer set search_path = public as $$
begin
  perform nbq_admin_act('message.hide', 'sbreply:' || p_reply, p_reason, jsonb_build_object('hide', coalesce(p_hide, true)));
  update sb_replies set status = case when coalesce(p_hide, true) then 'hidden' else 'visible' end where id = p_reply and deleted_at is null;
  if not found then perform nbq_err('not_found', 'reply'); end if;
end $$;
create or replace function admin_sb_photo_review(p_post uuid, p_idx int, p_action text) returns void language plpgsql security definer set search_path = public as $$
declare adm uuid;
begin
  if p_action not in ('keep','remove') then perform nbq_err('invalid', 'action'); end if;
  adm := nbq_admin_act('report.handle', 'sbphoto:' || p_post || ':' || p_idx, null, jsonb_build_object('action', p_action));
  update sb_photos set review = case p_action when 'keep' then 'ok' else 'removed' end, flagged_by = coalesce(flagged_by, 'admin'), reviewed_by = adm, reviewed_at = now()
   where post_id = p_post and idx = p_idx and review = 'blurred';
  if not found then perform nbq_err('state_changed'); end if;
end $$;
revoke execute on function admin_sb_post_hide(uuid, boolean, text), admin_sb_reply_hide(bigint, boolean, text), admin_sb_photo_review(uuid, int, text) from public;
grant execute on function admin_sb_post_hide(uuid, boolean, text), admin_sb_reply_hide(bigint, boolean, text), admin_sb_photo_review(uuid, int, text) to nbq_admin;

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

-- =====================================================================
-- ㉚ 后台接口专用登录角色与登录限流（11-05，#27 第 1 步；同 server/migrations/20261105_admin_api.sql）
-- =====================================================================
-- 后台接口（/admin/api）的数据库部分（11-05，#27 第 1 步 PR-A）。可重复运行；纯新增，不改已有表、不动已有数据。
--   · 登录角色 nbq_admin_api：后台接口专用，NOINHERIT（连上来本身什么表都碰不到，必须 set local role 切成 nbq_admin / nbq_viewer 才有权限）；
--     不属于 nbq_service / nbq_user，所以后台接口的代码即使被利用，也拿不到前台接口那一套权限。
--     本迁移只建 NOLOGIN 的角色；开通登录和设密码由你手动做（密码不进仓库）：alter role nbq_admin_api login password '<强密码>';
--   · 登录前后只能调 6 个门禁函数（4 个已有 + 下面 2 个按 IP 限流）
--   · admin_login_attempts：只记失败的登录（含「邮箱不存在」，这种记不进 admin_audit_log，因为那里 admin_id 不能为空）
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'nbq_admin_api') then create role nbq_admin_api nologin noinherit; end if;
  alter role nbq_admin_api noinherit;
end $$;
grant nbq_admin to nbq_admin_api;
grant nbq_viewer to nbq_admin_api;
do $$ begin
  -- 前台接口那套权限一个都不能有（万一手动加过也收回）
  if pg_has_role('nbq_admin_api', 'nbq_service', 'member') then revoke nbq_service from nbq_admin_api; end if;
  if pg_has_role('nbq_admin_api', 'nbq_user', 'member') then revoke nbq_user from nbq_admin_api; end if;
end $$;
grant usage on schema public to nbq_admin_api;

create table if not exists admin_login_attempts (
  id  bigserial primary key,
  at  timestamptz not null default now(),
  ip  inet
);
create index if not exists admin_login_attempts_ip_at on admin_login_attempts (ip, at desc);
create index if not exists admin_login_attempts_at on admin_login_attempts (at);
alter table admin_login_attempts enable row level security;   -- 不建任何策略 = 只有下面两个定义者函数能碰
revoke all on admin_login_attempts from public, anon, authenticated, nbq_user, nbq_service, nbq_admin, nbq_viewer, nbq_admin_api;

-- 登录前：这个 IP 最近 15 分钟失败 ≥ 20 次就拒绝（rate_limited，detail = 还要等几秒）；在算 scrypt 之前调用，挡住拿登录接口耗 CPU 的刷法
create or replace function admin_attempt_check(p_ip inet) returns void language plpgsql security definer set search_path = public as $$
declare n int; oldest timestamptz;
begin
  select count(*), min(at) into n, oldest from admin_login_attempts where ip is not distinct from p_ip and at > now() - interval '15 minutes';
  if n >= 20 then perform nbq_err('rate_limited', greatest(1, ceil(extract(epoch from oldest + interval '15 minutes' - now()))::int)::text); end if;
end $$;
-- 登录失败后记一笔（单独一个事务提交；失败的登录事务会回滚，记在里面会丢）；顺手清掉 2 天前的
create or replace function admin_attempt_note(p_ip inet) returns void language plpgsql security definer set search_path = public as $$
begin
  insert into admin_login_attempts(ip) values (p_ip);
  delete from admin_login_attempts where at < now() - interval '2 days';
end $$;

revoke execute on function admin_attempt_check(inet), admin_attempt_note(inet) from public, anon, authenticated, nbq_user, nbq_service, nbq_admin, nbq_viewer;
grant execute on function admin_login_begin(text), admin_login_finish(uuid, boolean, inet, text, text, bigint, text),
  admin_session_check(text), admin_session_revoke(text), admin_attempt_check(inet), admin_attempt_note(inet) to nbq_admin_api;


-- 我的球拍（#60 PR-A1，11-07，迁移 20261107_user_rackets）：每人最多 3 把，只记「品牌 + 系列」；可重复运行，纯新增，不改已有表和数据。
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

-- 球友（#110 PR-A，11-08，迁移 20261108_buddies）：当面扫码加球友 —— 扫码的人发申请，被扫的人确认 / 忽略。可重复运行，纯新增，不改已有表和数据。
--   · 关系只来自事实：一起打过（照旧实时算，不落表）+ 当面扫码确认（buddies 表）。没有远程「加好友」入口，那是前台的事（PR-B）
--   · 没有「拒绝」：忽略不通知对方；发起人在 24 小时失效前一直看到「等待 TA 确认」（被忽略的也一样）→ buddy_requests 前台不能直接读，只走 api_buddies()
--   · 防骚扰：同一人 30 天内被忽略 2 次 / 24 小时内已发 10 个 → buddy_limit（两种情况同一个错误码，不泄露「被忽略过」）；屏蔽双向生效；账号不是正常状态不能发
--   · 两人互相扫了对方（对方已有一条待确认的给我）→ 直接成为球友
--   · 运营（PR-A3）：申请记来源（qr / link）和确认方式（confirm / mutual）；后台统计 buddy_stats；风控 buddy_ignored；6 个埋点进字典；注销满 30 天删关系和申请
--   · 本期不改：球友 = 一起打过的权限（约 / 私信，PR-A2）、api_export_me（并入 #71）
--   · 迁移里还复制了三个已有对象（risk_events 约束、risk_values、job_anonymize_deleted），在下面 ↓ ↑ 标出的块里，schema.sql 里改在原处，两边一字不差（pg/buddies 核对）
alter type notif_kind add value if not exists 'buddy_request';    -- 有人扫了你的码，等你确认
alter type notif_kind add value if not exists 'buddy_accepted';   -- 对方确认了，你们成为球友

create table if not exists buddy_requests (
  id           uuid primary key default gen_random_uuid(),
  from_user    uuid not null references users(id) on delete cascade,
  to_user      uuid not null references users(id) on delete cascade,
  status       text not null default 'pending' check (status in ('pending','accepted','ignored','expired')),
  source       text not null default 'qr' check (source in ('qr','link','other')),   -- 从哪扫来的：qr 球员卡背面 / link 分享图、链接（监测截图外传后的远程申请）
  accepted_via text check (accepted_via in ('confirm','mutual')),                   -- confirm 对方确认 / mutual 互相扫了
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null default now() + interval '24 hours',
  responded_at timestamptz,
  check (from_user <> to_user)
);
create unique index if not exists buddy_requests_one_pending on buddy_requests (from_user, to_user) where status = 'pending';
create index if not exists buddy_requests_to on buddy_requests (to_user, created_at desc);
alter table buddy_requests enable row level security;
drop policy if exists svc_all on buddy_requests; create policy svc_all on buddy_requests to nbq_service using (true) with check (true);
revoke all on buddy_requests from public, anon, authenticated, nbq_user;
grant all on buddy_requests to nbq_service;

create table if not exists buddies (
  user_a     uuid not null references users(id) on delete cascade,   -- user_a < user_b：一对人只有一行
  user_b     uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_a, user_b),
  check (user_a < user_b)
);
create index if not exists buddies_b on buddies (user_b);
alter table buddies enable row level security;
drop policy if exists svc_all on buddies; create policy svc_all on buddies to nbq_service using (true) with check (true);
drop policy if exists own_read on buddies; create policy own_read on buddies for select to nbq_user using (nbq_uid() in (user_a, user_b));
revoke all on buddies from public, anon, authenticated, nbq_user;
grant select on buddies to nbq_user;
grant all on buddies to nbq_service;

-- 风控：7 天内加球友申请被 ≥3 个不同的人忽略（远程拿截图乱扫、当面纠缠的信号）；后台 RISK_RULES 同一条
insert into risk_rules (code, name, weight, threshold, window_days, enabled) values ('buddy_ignored', '加球友申请被多人忽略', 10, 3, 7, true)
on conflict (code) do update set name = excluded.name, weight = excluded.weight, threshold = excluded.threshold, window_days = excluded.window_days, enabled = excluded.enabled;

-- 埋点字典（#110）：前台两端发（PR-B 起），与 tests/spec/events_spec.md、后台 B1_EVENTS 逐字一致；业务数字以表为准（buddy_stats），埋点只看漏斗
insert into event_definitions (event, category, description, props, source, status, replaced_by) values
 ('buddy_scan_view','球友','扫码落地页看到「加球友」','target_uid, logged_in, source(qr/link/other)','client','active',null),
 ('buddy_request_send','球友','加球友申请发出（含已是球友 / 失败）','target_uid, result(pending/buddies/fail), err, source(qr/link/other)','client','active',null),
 ('buddy_request_open','球友','打开加球友确认页','request_id, via(push/notif/list)','client','active',null),
 ('buddy_respond','球友','确认 / 忽略加球友申请','request_id, action(accept/ignore), wait_min','client','active',null),
 ('buddy_remove','球友','删除球友','target_uid, played_together','client','active',null),
 ('buddy_list_open','球友','打开我的球友','n_buddies, n_played','client','active',null)
on conflict (event) do update set category = excluded.category, description = excluded.description, props = excluded.props, source = excluded.source, status = 'active', replaced_by = null;

-- 扫码 / 球员卡链接落地（/p/{编号}）：按编号找人。原来前台只在已读进内存的人里找，扫陌生人的码打不开（#110 PR-B 发现）。
--   必须登录；限频防按编号遍历（每小时 60 次、每天 300 次 → card_lookup_limit）；封禁 / 注销 / 有屏蔽关系 → not_found。
--   只返回 id，卡片内容由接口层按 id 取（和 GET /api/players/:id 同一份，不多给任何列）
insert into rate_rules(rule, grp, win, max_hits, per_key, code, note) values
 ('card_no_hour', 'card_no', '1 hour',   60,  false, 'card_lookup_limit', '按编号查球员卡（扫码 / 链接落地）：每小时 60 次，防遍历'),
 ('card_no_day',  'card_no', '24 hours', 300, false, 'card_lookup_limit', '按编号查球员卡（扫码 / 链接落地）：每天 300 次')
on conflict (rule) do update set grp = excluded.grp, win = excluded.win, max_hits = excluded.max_hits, per_key = excluded.per_key, code = excluded.code, note = excluded.note;
create or replace function api_card_by_no(p_no bigint) returns uuid language plpgsql security definer set search_path = public as $$
declare u uuid := nbq_me(); t uuid;
begin
  perform nbq_rate(u::text, 'card_no');
  select id into t from users where member_no = p_no and status not in ('banned','deleted');
  if t is null or (t <> u and is_blocked(u, t)) then perform nbq_err('not_found'); end if;   -- 有屏蔽关系：当作找不到（被屏蔽的人不能靠扫码再找到你）
  return t;
end $$;

-- 账号不是正常状态（暂停中 / 核实中 / 受限 / 封禁）不能加球友；暂停到期按正常
create or replace function nbq_buddy_gate() returns uuid language plpgsql stable security definer set search_path = public as $$
declare u uuid := nbq_me(); st text;
begin
  select case when status = 'suspended' and status_until <= now() then 'active' else status end into st from users where id = u;
  if st is distinct from 'active' then perform nbq_err('account_' || coalesce(st, 'deleted')); end if;
  return u;
end $$;
create or replace function nbq_buddy_link(a uuid, b uuid) returns void language sql security definer set search_path = public as $$
  insert into buddies (user_a, user_b) values (least(a, b), greatest(a, b)) on conflict do nothing
$$;

-- 扫码后发申请：p_source = qr | link | other（空 = qr）；返回 {status: 'pending' | 'buddies', id?}
create or replace function api_buddy_request(p_to uuid, p_source text default 'qr') returns jsonb language plpgsql security definer set search_path = public as $$
declare u uuid := nbq_buddy_gate(); tu users; r buddy_requests; src text := coalesce(p_source, 'qr');
begin
  if src not in ('qr','link','other') then perform nbq_err('invalid', 'source'); end if;
  if p_to = u then perform nbq_err('buddy_self'); end if;
  select * into tu from users where id = p_to;
  if not found or tu.status in ('banned','deleted') then perform nbq_err('not_found'); end if;
  if is_blocked(u, p_to) then perform nbq_err('blocked'); end if;
  perform 1 from users where id = least(u, p_to) for update; perform 1 from users where id = greatest(u, p_to) for update;   -- 同一对人并发扫码时排队（固定顺序上锁，不死锁）
  if exists (select 1 from buddies where user_a = least(u, p_to) and user_b = greatest(u, p_to)) then return jsonb_build_object('status', 'buddies'); end if;
  update buddy_requests set status = 'expired' where status = 'pending' and expires_at <= now() and from_user in (u, p_to) and to_user in (u, p_to);
  -- 对方已经扫过我、还在等我确认 → 互相扫了，直接成为球友
  select * into r from buddy_requests where from_user = p_to and to_user = u and status = 'pending' for update;
  if found then
    update buddy_requests set status = 'accepted', accepted_via = 'mutual', responded_at = now() where id = r.id;
    perform nbq_buddy_link(u, p_to); perform nbq_notify(p_to, 'buddy_accepted', null, u);
    return jsonb_build_object('status', 'buddies');
  end if;
  -- 24 小时内重复扫（包括已被忽略的）：返回原来那条，不重复提醒、不让发起人看出被忽略
  select * into r from buddy_requests where from_user = u and to_user = p_to and status in ('pending','ignored') and expires_at > now() order by created_at desc limit 1;
  if found then return jsonb_build_object('status', 'pending', 'id', r.id); end if;
  if (select count(*) from buddy_requests where from_user = u and to_user = p_to and status = 'ignored' and responded_at > now() - interval '30 days') >= 2
     or (select count(*) from buddy_requests where from_user = u and created_at > now() - interval '24 hours') >= 10 then perform nbq_err('buddy_limit'); end if;
  insert into buddy_requests (from_user, to_user, source) values (u, p_to, src) returning * into r;
  perform nbq_notify(p_to, 'buddy_request', null, u);
  return jsonb_build_object('status', 'pending', 'id', r.id);
end $$;

-- 被扫的人确认 / 忽略：p_action = 'accept' | 'ignore'；返回 'buddies' | 'ignored'。已处理 / 已失效 → buddy_request_ended
create or replace function api_buddy_respond(p_id uuid, p_action text) returns text language plpgsql security definer set search_path = public as $$
declare u uuid := nbq_buddy_gate(); r buddy_requests;
begin
  if p_action is null or p_action not in ('accept','ignore') then perform nbq_err('invalid', 'action'); end if;
  select * into r from buddy_requests where id = p_id and to_user = u for update;
  if not found then perform nbq_err('not_found'); end if;
  if r.status <> 'pending' or r.expires_at <= now() then perform nbq_err('buddy_request_ended'); end if;
  if p_action = 'ignore' then   -- 不通知对方；记一条风险信号（7 天内被 ≥3 个不同的人忽略 → buddy_ignored）
    update buddy_requests set status = 'ignored', responded_at = now() where id = r.id;
    insert into risk_events (user_id, kind, ref) values (r.from_user, 'buddy_ignored', u::text);
    return 'ignored';
  end if;
  if is_blocked(u, r.from_user) or (select status from users where id = r.from_user) in ('banned','deleted') then perform nbq_err('not_found'); end if;
  update buddy_requests set status = 'accepted', accepted_via = 'confirm', responded_at = now() where id = r.id;
  perform nbq_buddy_link(u, r.from_user); perform nbq_notify(r.from_user, 'buddy_accepted', null, u);
  return 'buddies';
end $$;

-- 删除球友：不通知对方；一起打过的关系不受影响（那是事实）
create or replace function api_buddy_remove(p_user uuid) returns void language plpgsql security definer set search_path = public as $$
declare u uuid := nbq_me();
begin
  delete from buddies where user_a = least(u, p_user) and user_b = greatest(u, p_user);
end $$;

-- 我的球友 + 申请：{buddies:[{user_id, since}], incoming:[{id, from_user, created_at, expires_at}], outgoing:[{id, to_user, created_at, expires_at}]}
--   outgoing 里被忽略的也照样列出（24 小时失效前），只给 id / 对象 / 时间，不给状态
create or replace function api_buddies() returns jsonb language sql stable security definer set search_path = public as $$
  with me as (select nbq_me() as u),
  b as (select case when x.user_a = me.u then x.user_b else x.user_a end as o, x.created_at from buddies x, me where me.u in (x.user_a, x.user_b))
  select jsonb_build_object(
    'buddies', coalesce((select jsonb_agg(jsonb_build_object('user_id', b.o, 'since', b.created_at) order by b.created_at desc)
                 from b join users ou on ou.id = b.o, me where ou.status not in ('banned','deleted') and not is_blocked(me.u, b.o)), '[]'),
    'incoming', coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'from_user', r.from_user, 'created_at', r.created_at, 'expires_at', r.expires_at) order by r.created_at desc)
                 from buddy_requests r join users ou on ou.id = r.from_user, me where r.to_user = me.u and r.status = 'pending' and r.expires_at > now()
                   and ou.status not in ('banned','deleted') and not is_blocked(me.u, r.from_user)), '[]'),
    'outgoing', coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'to_user', r.to_user, 'created_at', r.created_at, 'expires_at', r.expires_at) order by r.created_at desc)
                 from buddy_requests r join users ou on ou.id = r.to_user, me where r.from_user = me.u and r.status in ('pending','ignored') and r.expires_at > now()
                   and ou.status not in ('banned','deleted') and not is_blocked(me.u, r.to_user)), '[]'))
  from me
$$;

-- 后台统计（数据页 / 只读角色也能看）：申请按发出时间落在 [p_from, p_to)；p_cities 非空 = 只算发申请的人常用城市在这些城市里的（球友对：任一方在就算）
--   业务数字以表为准，不靠埋点；被忽略的在这里照实统计（只有后台看得到），过期 = pending 且已过 24 小时
create or replace function buddy_stats(p_from timestamptz, p_to timestamptz, p_cities text[] default null)
returns table(requests bigint, senders bigint, receivers bigint, accepted_confirm bigint, accepted_mutual bigint, ignored bigint, expired bigint, pending bigint,
              from_link bigint, accept_rate numeric, median_accept_min numeric, new_pairs bigint, total_pairs bigint)
language sql stable security definer set search_path = public as $$
  with r as (select x.*, case when x.status = 'pending' and x.expires_at <= now() then 'expired' else x.status end as st
               from buddy_requests x join users u on u.id = x.from_user
              where x.created_at >= p_from and x.created_at < p_to and (p_cities is null or u.home_city = any (p_cities))),
  pr as (select b.created_at from buddies b
          where p_cities is null or exists (select 1 from users u where u.id in (b.user_a, b.user_b) and u.home_city = any (p_cities)))
  select count(*), count(distinct r.from_user), count(distinct r.to_user),
         count(*) filter (where r.accepted_via = 'confirm'), count(*) filter (where r.accepted_via = 'mutual'),
         count(*) filter (where r.st = 'ignored'), count(*) filter (where r.st = 'expired'), count(*) filter (where r.st = 'pending'),
         count(*) filter (where r.source = 'link'),
         round(count(*) filter (where r.st = 'accepted')::numeric / nullif(count(*) filter (where r.st <> 'pending'), 0), 3),
         round((percentile_cont(0.5) within group (order by extract(epoch from r.responded_at - r.created_at) / 60) filter (where r.accepted_via = 'confirm'))::numeric, 1),
         (select count(*) from pr where pr.created_at >= p_from and pr.created_at < p_to), (select count(*) from pr)
    from r
$$;

revoke execute on function api_card_by_no(bigint), buddy_stats(timestamptz, timestamptz, text[]), nbq_buddy_gate(), nbq_buddy_link(uuid, uuid), api_buddy_request(uuid, text), api_buddy_respond(uuid, text), api_buddy_remove(uuid), api_buddies() from public, anon, authenticated;
grant execute on function api_card_by_no(bigint), api_buddy_request(uuid, text), api_buddy_respond(uuid, text), api_buddy_remove(uuid), api_buddies() to nbq_user;
grant execute on function buddy_stats(timestamptz, timestamptz, text[]) to nbq_admin, nbq_viewer;
grant execute on function api_card_by_no(bigint), nbq_buddy_gate(), nbq_buddy_link(uuid, uuid), api_buddy_request(uuid, text), api_buddy_respond(uuid, text), api_buddy_remove(uuid), api_buddies() to nbq_service;
-- 球拍产品库（#60 A4，迁移 20261108_racket_catalog，所有者 11-07 已批准，ADR 0009）。可重复运行，只加不改。
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

-- 球拍统计（#60 A5，迁移 20261108_racket_stats，所有者 11-07 已批准，ADR 0009）。可重复运行，只加不改。
--   · racket_daily / racket_daily_total：每晚记一次「持有人数」快照（只存计数、不存用户），是趋势和「上升最快」的数据来源，长期保留
--   · racket_rollup(day)：按当时的 user_rackets 记快照（不算已注销 / 已封禁的人）；同一天重跑覆盖
--   · job_nightly：只加一行 perform racket_rollup(d - 1)，其余与 schema.sql 原样一致
--   · admin_racket_stats / admin_racket_unmatched：后台「球拍」页用（只授权给后台角色；页面权限由后台接口层按 page.view 检查）。
--     口径：持有 = 正常状态的用户现在包里有这把；上升 = 现在的持有人数 − p_days 天前（含）最近一次快照；现在持有 < 5 的不进上升榜
do $$ begin if to_regclass('public.racket_catalog') is null then raise exception '先执行 20261108_racket_catalog'; end if; end $$;
create table if not exists racket_daily (
  day        date not null,
  catalog_id uuid references racket_catalog(id),   -- 空 = 产品库外的自由文字（合在一起记）
  holders    int not null default 0,
  mains      int not null default 0
);
create unique index if not exists racket_daily_key on racket_daily (day, coalesce(catalog_id, '00000000-0000-0000-0000-000000000000'::uuid));
create table if not exists racket_daily_total (
  day        date primary key,
  users_with int not null default 0,    -- 有至少一把的人
  users_all  int not null default 0,    -- 正常状态的人（分母）
  rows_all   int not null default 0,
  rows_other int not null default 0     -- 产品库外的
);
alter table racket_daily enable row level security; alter table racket_daily_total enable row level security;
drop policy if exists svc_all on racket_daily; create policy svc_all on racket_daily to nbq_service using (true) with check (true);
drop policy if exists svc_all on racket_daily_total; create policy svc_all on racket_daily_total to nbq_service using (true) with check (true);
revoke all on racket_daily, racket_daily_total from public, anon, authenticated, nbq_user;
grant all on racket_daily, racket_daily_total to nbq_service;

-- 正常状态的人的球拍（已注销 / 已封禁的不算）
create or replace function nbq_racket_live() returns table (user_id uuid, slot smallint, catalog_id uuid, created_at timestamptz) language sql stable security definer set search_path = public as $$
  select r.user_id, r.slot, r.catalog_id, r.created_at from user_rackets r join users u on u.id = r.user_id where u.status not in ('deleted', 'banned') $$;

create or replace function racket_rollup(p_day date) returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  delete from racket_daily where day = p_day;
  insert into racket_daily (day, catalog_id, holders, mains)
    select p_day, catalog_id, count(distinct user_id), count(*) filter (where slot = 1) from nbq_racket_live() group by catalog_id;
  get diagnostics n = row_count;
  insert into racket_daily_total (day, users_with, users_all, rows_all, rows_other)
    select p_day, (select count(distinct user_id) from nbq_racket_live()), (select count(*) from users where status not in ('deleted', 'banned')),
           (select count(*) from nbq_racket_live()), (select count(*) from nbq_racket_live() where catalog_id is null)
  on conflict (day) do update set users_with = excluded.users_with, users_all = excluded.users_all, rows_all = excluded.rows_all, rows_other = excluded.rows_other;
  return n;
end $$;

-- job_nightly 的那一行加在上面「开放时通知我」那版里

-- 后台概览：一次给齐（页面一次请求）
create or replace function admin_racket_stats(p_days int default 7) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare base date; tot jsonb; top jsonb; rising jsonb; brands jsonb; trend jsonb;
begin
  if p_days is null or p_days not between 1 and 90 then perform nbq_err('invalid', 'days'); end if;
  select max(day) into base from racket_daily_total where day <= (now() at time zone 'Australia/Melbourne')::date - p_days;
  select jsonb_build_object('users_with', count(distinct l.user_id), 'users_all', (select count(*) from users where status not in ('deleted', 'banned')),
           'rows_all', count(*), 'rows_other', count(*) filter (where l.catalog_id is null)) into tot from nbq_racket_live() l;
  select coalesce(jsonb_agg(x order by x.holders desc, x.mains desc, x.brand, x.series), '[]') into top from (
    select c.id as catalog_id, c.brand, c.series, count(distinct l.user_id)::int as holders, count(*) filter (where l.slot = 1)::int as mains
      from nbq_racket_live() l join racket_catalog c on c.id = l.catalog_id group by c.id order by 4 desc, 5 desc, 2, 3 limit 10) x;
  select coalesce(jsonb_agg(x order by x.delta desc, x.holders desc), '[]') into rising from (
    select c.id as catalog_id, c.brand, c.series, now_.holders, coalesce(d.holders, 0) as base, now_.holders - coalesce(d.holders, 0) as delta, now_.added
      from (select catalog_id, count(distinct user_id)::int as holders, count(*) filter (where created_at > now() - make_interval(days => p_days))::int as added
              from nbq_racket_live() where catalog_id is not null group by catalog_id) now_
      join racket_catalog c on c.id = now_.catalog_id
      left join racket_daily d on d.day = base and d.catalog_id = now_.catalog_id
     where base is not null and now_.holders >= 5 and now_.holders - coalesce(d.holders, 0) > 0
     order by 6 desc, 4 desc limit 10) x;
  select coalesce(jsonb_agg(x order by x.holders desc), '[]') into brands from (
    select coalesce(c.brand, '其他') as brand, count(distinct l.user_id)::int as holders from nbq_racket_live() l left join racket_catalog c on c.id = l.catalog_id group by 1) x;
  select coalesce(jsonb_agg(jsonb_build_object('day', day, 'users_with', users_with, 'users_all', users_all) order by day), '[]') into trend
    from racket_daily_total where day > (now() at time zone 'Australia/Melbourne')::date - 90;
  return jsonb_build_object('total', tot, 'top', top, 'rising', rising, 'rising_base', base, 'days', p_days, 'brands', brands, 'trend', trend);
end $$;
-- 待归类：产品库外的自由文字，按「不分大小写、去多余空白」分组，只给文字和人数（不给是谁）
create or replace function admin_racket_unmatched(p_limit int default 50) returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(x order by x.n desc, x.k), '[]') from (
    select lower(coalesce(r.brand || ' ', '') || r.series) as k, min(coalesce(r.brand || ' ', '') || r.series) as text, count(distinct r.user_id)::int as n
      from user_rackets r join users u on u.id = r.user_id where r.catalog_id is null and u.status not in ('deleted', 'banned')
     group by 1 order by 3 desc, 1 limit least(greatest(coalesce(p_limit, 50), 1), 200)) x $$;

revoke execute on function nbq_racket_live(), racket_rollup(date), admin_racket_stats(int), admin_racket_unmatched(int) from public, anon, authenticated, nbq_user;
grant execute on function nbq_racket_live(), racket_rollup(date) to nbq_service;
grant execute on function admin_racket_stats(int), admin_racket_unmatched(int) to nbq_admin, nbq_viewer, nbq_service;
revoke execute on function job_nightly(timestamptz) from public, nbq_user, nbq_viewer;
grant execute on function job_nightly(timestamptz) to nbq_service;

-- 我的 UTR（#101，11-07 用户定的第二版）：个人页随时更新 UTR，两种：正式 / 自评（自评 = 已有的 utr_estimated）；正式可附 UTR 主页编号。
--   · users 加 utr_profile（UTR 主页编号，只存数字；users 只许本人读，对外的 public_profiles 不加）和 utr_at（上次确认 UTR 的时间）
--   · utr_changes：每次数值或类型变了记一行（给后台查虚报、将来同步比对）；只许本人读
--   · 写入只走 api_set_utr(jsonb)：校验、频率（24 小时 5 次）、历史都在库里；PATCH /api/me 不再能改 utr / utr_estimated（收回列权限）
--   · 注销匿名化时清掉 utr_profile 和历史（触发器，不改 job_anonymize_deleted，免得和其他迁移互相覆盖）
--   可重复运行；只加不删（收回的是前台账号对两列的直接改权限，注册仍走 /api/me/register）。
alter table users add column if not exists utr_profile text;
alter table users add column if not exists utr_at timestamptz;
alter table users drop constraint if exists users_utr_profile_check;
alter table users add constraint users_utr_profile_check check (utr_profile is null or utr_profile ~ '^[0-9]{4,12}$');

create table if not exists utr_changes (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references users(id) on delete cascade,
  old_utr    numeric(4,2),
  new_utr    numeric(4,2) not null,
  old_est    boolean,
  new_est    boolean not null,
  at         timestamptz not null default now()
);
create index if not exists utr_changes_user on utr_changes (user_id, at desc);
alter table utr_changes enable row level security;
drop policy if exists svc_all on utr_changes; create policy svc_all on utr_changes to nbq_service using (true) with check (true);
drop policy if exists own_read on utr_changes; create policy own_read on utr_changes for select to nbq_user using (user_id = nbq_uid());
revoke all on utr_changes from public, anon, authenticated, nbq_user;
grant select on utr_changes to nbq_user;
grant all on utr_changes to nbq_service;

revoke update (utr, utr_estimated) on users from nbq_user;

insert into rate_rules(rule, grp, win, max_hits, per_key, code, note)
values ('utr_day', 'utr', '24 hours', 5, false, 'rate_limited', '我的 UTR：数值或类型 24 小时内最多改 5 次（只改链接、原样再确认不计）')
on conflict (rule) do nothing;

-- p = {utr: 数字, estimated: true/false, profile?: 字符串 | null}；profile 不传 = 不动，null / 空串 = 清掉，
--   可以是 UTR 主页链接（utrsports.net / universaltennis.com 的 /profiles/<数字>）或纯数字。
-- 返回 {utr, estimated, profile, updated_at}
create or replace function api_set_utr(p jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare u uuid := nbq_me(); v numeric; e boolean; prof text; raw text; o users;
begin
  if p is null or jsonb_typeof(p) <> 'object' then perform nbq_err('invalid', 'utr'); end if;
  if coalesce(jsonb_typeof(p->'utr'), '') <> 'number' then perform nbq_err('invalid', 'utr'); end if;
  v := (p->>'utr')::numeric;
  if v < 1 or v > 16.5 or v <> round(v, 2) then perform nbq_err('invalid', 'utr'); end if;
  if coalesce(jsonb_typeof(p->'estimated'), '') <> 'boolean' then perform nbq_err('invalid', 'estimated'); end if;
  e := (p->>'estimated')::boolean;
  select * into o from users where id = u for update;
  prof := o.utr_profile;
  if p ? 'profile' then
    if jsonb_typeof(p->'profile') not in ('string', 'null') then perform nbq_err('invalid', 'profile'); end if;
    raw := nullif(btrim(p->>'profile'), '');
    if raw is null then prof := null;
    elsif raw ~ '^[0-9]{4,12}$' then prof := raw;
    else
      prof := substring(raw from '^(?:https?://)?(?:app\.|www\.)?(?:utrsports\.net|universaltennis\.com)/profiles/([0-9]{4,12})(?:[/?#].*)?$');
      if prof is null then perform nbq_err('invalid', 'profile'); end if;
    end if;
  end if;
  if v is distinct from o.utr or e is distinct from o.utr_estimated then
    perform nbq_rate(u::text, 'utr');
    insert into utr_changes(user_id, old_utr, new_utr, old_est, new_est) values (u, o.utr, v, o.utr_estimated, e);
  end if;
  update users set utr = v, utr_estimated = e, utr_profile = prof, utr_at = now() where id = u;
  return jsonb_build_object('utr', v, 'estimated', e, 'profile', prof, 'updated_at', now());
end $$;
-- 读自己的：updated_at 没确认过就用注册时间
create or replace function api_my_utr() returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('utr', utr, 'estimated', utr_estimated, 'profile', utr_profile, 'updated_at', coalesce(utr_at, created_at))
    from users where id = nbq_me() $$;
revoke execute on function api_set_utr(jsonb), api_my_utr() from public, anon, authenticated;
grant execute on function api_set_utr(jsonb), api_my_utr() to nbq_user, nbq_service;

-- 注销匿名化：清掉 UTR 主页编号和改动历史
create or replace function users_utr_wipe() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.anonymized_at is not null and old.anonymized_at is null then
    new.utr_profile := null;
    delete from utr_changes where user_id = new.id;
  end if;
  return new;
end $$;
revoke execute on function users_utr_wipe() from public, anon, authenticated, nbq_user;
drop trigger if exists trg_users_utr_wipe on users;
create trigger trg_users_utr_wipe before update of anonymized_at on users for each row execute function users_utr_wipe();

-- 我的 UTR（#101）后台只读：运营看 UTR 类型、是否关联主页、改动历史，用来发现虚报和多个账号关联同一个主页。可重复运行，只加不改。
--   · users 新加的两列（utr_profile、utr_at）补给 nbq_admin 读：schema ④ 的批量授权只覆盖当时已有的列
--   · utr_changes：nbq_admin 可读（行级安全 adm_read）；只读角色 nbq_viewer 不给（它只看统计，不看个人）
--   · 限城市的管理员：接口查询都 join users，users 上的 adm_city 限制照样生效
grant select (utr_profile, utr_at) on users to nbq_admin;
grant select on utr_changes to nbq_admin;
drop policy if exists adm_read on utr_changes; create policy adm_read on utr_changes for select to nbq_admin using (true);

-- 迁移记录（11-03）：每个迁移文件结尾保证记录表存在并记一行自己；/api/version 会报「库里执行到哪一版」，冒烟测试核对它等于代码里最新的迁移。
create table if not exists schema_migrations (version text primary key, applied_at timestamptz not null default now());
alter table schema_migrations enable row level security;
drop policy if exists svc_all on schema_migrations; create policy svc_all on schema_migrations to nbq_service using (true) with check (true);
grant select, insert on schema_migrations to nbq_service;
insert into schema_migrations(version) values
  ('20261030_register_and_wechat'),
  ('20261102_apply_rate_loosen'),
  ('20261102_game_rate_loosen'),
  ('20261102_no_night_quiet'),
  ('20261103_avatar_coral_to_paper'),
  ('20261103_avatar_default_paper'),
  ('20261103_game_rate_calendar_day'),
  ('20261103_my_push_diag'),
  ('20261103_mail_default_off'),
  ('20261103_schema_migrations'),
  ('20261104_badges_server'),
  ('20261104_chat_notify'),
  ('20261104_late_join'),
  ('20261105_admin_api'),
  ('20261106_admin_venue_geo'),
  ('20261107_user_rackets'),
  ('20261107_wipe_rackets'),
  ('20261108_buddies'),
  ('20261108_racket_catalog'),
  ('20261108_racket_stats'),
  ('20261109_racket_events'),
  ('20261110_my_utr'),
  ('20261111_utr_events'),
  ('20261112_utr_admin')
on conflict do nothing;
