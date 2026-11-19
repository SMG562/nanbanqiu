-- 场边：同时回复同一条发布偶发死锁（#153；可重复执行，内容与 schema.sql 同名函数一致）。只改一个函数体，不动表结构：
--   insert 的外键先拿帖子行共享锁、触发器再升级成 for update，两人同时回复会互等 → 先 for update 锁帖子行再 insert。
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
  -- #153：先锁帖子行再 insert。否则 insert 的外键先拿共享锁、触发器再升级成 for update，两人同时回复会互相等待（死锁）
  perform 1 from sb_posts where id = p_post for update;
  insert into sb_replies(post_id, user_id, to_user, body) values (p_post, u, p_to, b) returning id into rid;
  perform sb_notify_reply(rid);   -- 通知（S2b+）
  return rid;
end $$;

insert into schema_migrations(version) values ('20261124_sb_reply_lock') on conflict do nothing;
