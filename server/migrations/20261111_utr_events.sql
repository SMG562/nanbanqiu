-- 我的 UTR（#101）：登记 1 个前台埋点。可重复运行，只加不改。
--   服务器 /api/events 只收 event_definitions 里 active 的 client 事件：这个迁移执行之前，前台发的这个事件会被丢掉（不报错）。
--   名称、分类、说明、props 与 tests/spec/events_spec.md 逐字一致（schema/run 测试核对）。
insert into event_definitions (event,category,description,props,source,status,replaced_by) values
 ('utr_save','我的','我的 UTR 保存成功（以服务器返回为准，失败不记；不记数值和主页编号）','mode(off/self), linked, change(up/down/same)','client','active',null)
on conflict (event) do update set category=excluded.category, description=excluded.description, props=excluded.props,
  source=excluded.source, status=excluded.status, replaced_by=excluded.replaced_by;

create table if not exists schema_migrations (version text primary key, applied_at timestamptz not null default now());
alter table schema_migrations enable row level security;
drop policy if exists svc_all on schema_migrations; create policy svc_all on schema_migrations to nbq_service using (true) with check (true);
grant select, insert on schema_migrations to nbq_service;
insert into schema_migrations(version) values ('20261111_utr_events') on conflict do nothing;
