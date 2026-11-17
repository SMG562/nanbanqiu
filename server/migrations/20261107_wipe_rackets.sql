-- 我的球拍（#60 PR-A2，11-07）：注销满 30 天匿名化时删掉球拍（所有者定：注销即删，不保留）。
--   匿名化只改 users 行、不删，on delete cascade 不会触发，所以在 job_anonymize_deleted 里加一行 delete；函数其余部分与 schema.sql 原样一致。
--   依赖 20261107_user_rackets（先建表）。可重复运行。
do $$ begin if to_regclass('public.user_rackets') is null then raise exception '先执行 20261107_user_rackets（建 user_rackets 表），再执行本迁移'; end if; end $$;
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
  update email_outbox e set to_email = 'deleted', status = case when e.status = 'queued' then 'skipped' else e.status end,
         skip_reason = case when e.status = 'queued' then 'email_bad' else e.skip_reason end
    from users u where u.id = e.user_id and u.anonymized_at = p_now;
  return nbq_job_log('anonymize_deleted', n, t0);
end $$;
revoke execute on function job_anonymize_deleted(timestamptz) from public, nbq_user, nbq_viewer;
grant execute on function job_anonymize_deleted(timestamptz) to nbq_service;

create table if not exists schema_migrations (version text primary key, applied_at timestamptz not null default now());
alter table schema_migrations enable row level security;
drop policy if exists svc_all on schema_migrations; create policy svc_all on schema_migrations to nbq_service using (true) with check (true);
grant select, insert on schema_migrations to nbq_service;
insert into schema_migrations(version) values ('20261107_wipe_rackets') on conflict do nothing;
