-- 11-03 你定的：提醒只推手机，邮件默认不发（用户自己打开才发）。可重复运行。
-- 1) 新默认 {}；2) 已有数据：把「正好等于旧默认（三类全开）」的改成 {}（旧默认是注册时自动给的，不是用户选的；用户自己关掉过某类的保持原样）。
alter table users alter column email_prefs set default '{}';
update users set email_prefs = '{}'::jsonb where email_prefs = '{"request":true,"result":true,"change":true}'::jsonb;
create table if not exists schema_migrations (version text primary key, applied_at timestamptz not null default now());
alter table schema_migrations enable row level security;
drop policy if exists svc_all on schema_migrations; create policy svc_all on schema_migrations to nbq_service using (true) with check (true);
grant select, insert on schema_migrations to nbq_service;
insert into schema_migrations(version) values ('20261103_mail_default_off') on conflict do nothing;
