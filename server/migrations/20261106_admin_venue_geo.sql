-- 后台球场坐标核对函数（#27 第 3 步）。只新增一个函数，可重复运行，不改表、不动已有数据。
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

insert into schema_migrations(version) values ('20261106_admin_venue_geo') on conflict do nothing;
