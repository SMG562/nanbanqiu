-- 新消息通知：收到私信 / 球局群聊消息推送到手机（11-04）。可重复运行。
-- 1) 通知类型 chat；2) notifications.thread_id；3) 发消息时生成通知（nbq_chat_notify）；4) 打开会话时标已读（api_chat_notif_read）。
alter type notif_kind add value if not exists 'chat';
-- ---------- 新消息通知（11-04）：收到私信 / 球局群聊消息，推送到手机 ----------
-- chat 通知带 thread_id（点推送直接打开那个会话），不带 game_id（球局开打后聊天还能继续 48 小时，带了会被当成「球局已开打」而不推）。
-- 规则：屏蔽的不通知；对方把我设成「少遇到」不通知（同局开打前 24 小时到结束后 2 小时除外）；同一会话里上一条还没读、且 5 分钟内已通知过 → 不再重复通知；
--       打开会话（thread read）时把这个会话的 chat 通知标成已读（发送程序推送前发现已读就不推）。
alter table notifications add column if not exists thread_id uuid references threads(id) on delete cascade;
create index if not exists notif_chat_idx on notifications(user_id, thread_id, created_at desc) where kind = 'chat';
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
create or replace function api_chat_notif_read(p_thread uuid) returns void language sql security definer set search_path = public as $$
  update notifications set read_at = now() where user_id = nbq_me() and kind = 'chat' and thread_id = p_thread and read_at is null
$$;
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
create table if not exists schema_migrations (version text primary key, applied_at timestamptz not null default now());
alter table schema_migrations enable row level security;
drop policy if exists svc_all on schema_migrations; create policy svc_all on schema_migrations to nbq_service using (true) with check (true);
grant select, insert on schema_migrations to nbq_service;
insert into schema_migrations(version) values ('20261104_chat_notify') on conflict do nothing;
