-- 我的球拍 B2（#60，ADR 0009）：登记 4 个前台埋点。可重复运行，只加不改。
--   服务器 /api/events 只收 event_definitions 里 active 的 client 事件：这个迁移执行之前，前台发的这 4 个事件会被丢掉（不报错）。
--   名称、分类、说明、props 与 tests/spec/events_spec.md 逐字一致（schema/run 测试核对）。
insert into event_definitions (event,category,description,props,source,status,replaced_by) values
 ('racket_picker_open','我的','打开选拍弹层（添一把 / 换一把；从系列返回不算）','mode(add/swap), slot(1-3)','client','active',null),
 ('racket_brand_pick','我的','选拍时点了品牌（品牌名来自产品库或兜底列表；点「其他品牌」记 other；不记手写文字）','brand','client','active',null),
 ('racket_save','我的','球拍保存成功（以服务器返回为准，失败不记）；source：添 / 换时看是点选（catalog）还是手写（other），设为主力 / 移除时看那把有没有归到产品库','action(add/swap/main/remove), source(catalog/other), n_after','client','active',null),
 ('racket_invalid','我的','手写拍子名当场没通过校验（不发请求、不记文字）','reason(empty/long/link/at/digits/dup)','client','active',null)
on conflict (event) do update set category=excluded.category, description=excluded.description, props=excluded.props,
  source=excluded.source, status=excluded.status, replaced_by=excluded.replaced_by;

create table if not exists schema_migrations (version text primary key, applied_at timestamptz not null default now());
alter table schema_migrations enable row level security;
drop policy if exists svc_all on schema_migrations; create policy svc_all on schema_migrations to nbq_service using (true) with check (true);
grant select, insert on schema_migrations to nbq_service;
insert into schema_migrations(version) values ('20261109_racket_events') on conflict do nothing;
