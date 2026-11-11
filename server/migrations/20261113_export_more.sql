-- 下载我的数据补上球拍 / UTR 改动历史 / 球友（#71，所有者 11-10 同意扩成三项）。可重复运行，只改函数、不动表。
--   · utr_profile / utr_at 本来就在 profile 里（users 整行），这里加 utr_history、rackets、buddies、buddy_requests
--   · 我发出、被对方忽略的球友申请，导出里显示成「等待中 / 已失效」，和界面一致（发起人永远不知道被忽略）
--   · 函数整体复制自 schema.sql（api_export_me），两边一字不差（pg/privacy 核对）
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
    'rackets', (select coalesce(jsonb_agg(jsonb_build_object('slot', r.slot, 'brand', r.brand, 'series', r.series, 'added_at', r.created_at, 'updated_at', r.updated_at) order by r.slot), '[]') from user_rackets r where r.user_id = u),
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

create table if not exists schema_migrations (version text primary key, applied_at timestamptz not null default now());
alter table schema_migrations enable row level security;
drop policy if exists svc_all on schema_migrations; create policy svc_all on schema_migrations to nbq_service using (true) with check (true);
grant select, insert on schema_migrations to nbq_service;
insert into schema_migrations(version) values ('20261113_export_more') on conflict do nothing;
