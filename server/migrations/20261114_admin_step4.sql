-- 后台接真数据 #27 第 4 步：补读权限 + 爽约申诉的后台处理（只加不改，可重复运行）。
--   · admin_users 后加的列补给 nbq_admin 读：schema ④ 的按列授权只覆盖当时已有的列（id、email、name、role、last_login_at、disabled），
--     「管理员」页要显示负责城市、停用时间和理由、创建时间。密码哈希、两步验证密钥、恢复码、失败次数照旧读不到
grant select (created_at, created_by, password_changed_at, disabled_at, disabled_reason, cities) on admin_users to nbq_admin;

-- 爽约申诉的后台处理（#195 ②）：球友对「确认爽约」申诉后（noshow_appeals.status = pending，期间不计入），运营核实后
--   upheld = 申诉成立（这次爽约永久不计）· rejected = 申诉不成立（重新计入）。记处理人、时间、备注；只有 pending 能处理（别人刚处理过 → state_changed）。
--   权限 report.handle（owner、运营），留痕 target = noshow:<球局>:<球友>；城市范围由接口在后台角色的行级安全下先查球友（库函数本身不看城市）。
alter table noshow_appeals add column if not exists decided_by uuid references admin_users(id);
alter table noshow_appeals add column if not exists decided_at timestamptz;
alter table noshow_appeals add column if not exists admin_note text check (char_length(admin_note) <= 200);
create or replace function admin_noshow_appeal(p_game uuid, p_user uuid, p_status text, p_note text default null) returns void language plpgsql security definer set search_path = public as $$
declare adm uuid;
begin
  if p_status not in ('upheld','rejected') then perform nbq_err('invalid', 'status'); end if;
  if not exists (select 1 from noshow_appeals where game_id = p_game and user_id = p_user) then perform nbq_err('not_found'); end if;
  adm := nbq_admin_act('report.handle', 'noshow:' || p_game || ':' || p_user, p_note, jsonb_build_object('status', p_status));
  update noshow_appeals set status = p_status, decided_by = adm, decided_at = now(), admin_note = nullif(btrim(coalesce(p_note, '')), '')
   where game_id = p_game and user_id = p_user and status = 'pending';
  if not found then perform nbq_err('state_changed'); end if;
end $$;
revoke execute on function admin_noshow_appeal(uuid, uuid, text, text) from public;
grant execute on function admin_noshow_appeal(uuid, uuid, text, text) to nbq_admin;
grant select on noshow_appeals, noshow_reports to nbq_admin;

create table if not exists schema_migrations (version text primary key, applied_at timestamptz not null default now());
alter table schema_migrations enable row level security;
drop policy if exists svc_all on schema_migrations; create policy svc_all on schema_migrations to nbq_service using (true) with check (true);
grant select, insert on schema_migrations to nbq_service;
insert into schema_migrations(version) values ('20261114_admin_step4') on conflict do nothing;
