-- 测试专用桩（pglite 没有 PostGIS）；pgcrypto / pg_trgm 是 pglite 自带的真扩展
create extension if not exists btree_gist;   -- 让 domain(text) 上的 gist 索引可建
create domain geography as text;
create function ST_MakePoint(float8, float8) returns geography language sql immutable as $$ select ('POINT('||$1||' '||$2||')')::geography $$;
create function ST_DWithin(geography, geography, float8) returns boolean language sql immutable as $$ select true $$;
create function ST_Distance(geography, geography) returns float8 language sql immutable as $$ select 0::float8 $$;
