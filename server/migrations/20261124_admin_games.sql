-- #27 第 5 步：后台球局「取消 / 隐藏」。可重复执行；内容与 schema.sql 同名段落一致。
--   · 取消：只限未开始、状态 open / full；通知发起人和所有已确认 / 待确认的球友；待确认申请由现有触发器结束
--   · 隐藏：把公开球局改成 private（所有公开列表、统计都只认 visibility='public'，不用改前台读路径），
--          admin_hidden_at 记下是后台隐藏的；恢复只对后台隐藏过的球局有效。限城市的管理员只能动自己城市的球局（库里再查一遍）
alter table games add column if not exists admin_hidden_at timestamptz;
alter table games add column if not exists admin_hidden_reason text;
insert into admin_perms(action, label, roles, need_reason) values
 ('game.cancel', '取消球局',            '{owner,operator}', true),
 ('game.hide',   '隐藏 / 恢复公开球局', '{owner,operator}', true)
on conflict (action) do update set label = excluded.label, roles = excluded.roles, need_reason = excluded.need_reason;
create or replace function admin_game_cancel(p_code text, p_reason text) returns void language plpgsql security definer set search_path = public as $$
declare g games; adm uuid; cs text[]; who uuid[];
begin
  select * into g from games where share_code = p_code for update;
  if not found then perform nbq_err('not_found'); end if;
  adm := nbq_admin_act('game.cancel', 'game:' || p_code, p_reason, jsonb_build_object('city', g.city));
  select cities into cs from admin_users where id = adm;
  if cs is not null and not (g.city = any(cs)) then perform nbq_err('admin_forbidden', 'city'); end if;
  if g.status not in ('open','full') or g.starts_at <= now() then perform nbq_err('state_changed'); end if;
  select array_agg(user_id) into who from game_participants where game_id = g.id and role = 'player' and status in ('approved','pending');
  update games set status = 'cancelled', cancelled_at = now() where id = g.id;
  insert into notifications(user_id, kind, game_id, actor_id)
  select x, 'game_cancelled', g.id, g.host_id from unnest(coalesce(who, '{}') || array[g.host_id]) x;
end $$;
create or replace function admin_game_hide(p_code text, p_hide boolean, p_reason text) returns void language plpgsql security definer set search_path = public as $$
declare g games; adm uuid; cs text[];
begin
  if p_hide is null then perform nbq_err('invalid', 'hide'); end if;
  select * into g from games where share_code = p_code for update;
  if not found then perform nbq_err('not_found'); end if;
  adm := nbq_admin_act('game.hide', 'game:' || p_code, p_reason, jsonb_build_object('hide', p_hide, 'city', g.city));
  select cities into cs from admin_users where id = adm;
  if cs is not null and not (g.city = any(cs)) then perform nbq_err('admin_forbidden', 'city'); end if;
  if p_hide then
    if g.visibility <> 'public' then perform nbq_err('state_changed'); end if;
    update games set visibility = 'private', admin_hidden_at = now(), admin_hidden_reason = btrim(p_reason) where id = g.id;
  else
    if g.admin_hidden_at is null then perform nbq_err('state_changed'); end if;
    update games set visibility = 'public', admin_hidden_at = null, admin_hidden_reason = null where id = g.id;
  end if;
end $$;
revoke execute on function admin_game_cancel(text, text), admin_game_hide(text, boolean, text) from public, nbq_user, nbq_viewer;
grant execute on function admin_game_cancel(text, text), admin_game_hide(text, boolean, text) to nbq_admin;

insert into schema_migrations(version) values ('20261124_admin_games') on conflict do nothing;
