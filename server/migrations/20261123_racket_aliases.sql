-- 球拍别名（#385 第 4 条，#60，ADR 0014）：可重复执行；只往 racket_aliases 里加行，不改任何表结构 / 函数 / 已执行的迁移。
--   · 1) 旧 racket_catalog.aliases（含合并时被并掉的名字）带到新 racket_aliases，挂到对应的系列上（品牌 + 系列名不分大小写对得上才带）
--   · 2) 补一小批「只是写法不同」的拼写变体（连字符 / 空格 / 连写），不放缩写和中文译名（容易串到别的系列，由所有者在后台逐条加）
--   规则：别名一律小写、1–40 字符；全库不分大小写唯一（先到先得，冲突的跳过）；不收和同品牌某个系列名相同的别名（会盖住真系列）。
do $$ begin if to_regclass('public.racket_aliases') is null then raise exception '先执行 20261121_racket_series'; end if; end $$;

-- 1) 旧库别名：已合并的条目归到 merged_into 那一条，它自己的系列名也算别名
insert into racket_aliases (series_id, alias)
select distinct on (x.alias) x.series_id, x.alias from (
  select s.id as series_id, s.brand_id, lower(btrim(a)) as alias
    from racket_catalog c
    join racket_catalog t on t.id = case when c.status = 'merged' then c.merged_into else c.id end
    join brands b on lower(b.name) = lower(t.brand)
    join racket_series s on s.brand_id = b.id and lower(s.name) = lower(t.series) and not s.is_other
    cross join lateral unnest(c.aliases || case when c.status = 'merged' then array[c.series] else '{}'::text[] end) a
) x
where char_length(x.alias) between 1 and 40
  and not exists (select 1 from racket_series s2 where s2.brand_id = x.brand_id and lower(s2.name) = x.alias)
order by x.alias, x.series_id
on conflict do nothing;

-- 2) 拼写变体（品牌, 系列, 别名）
insert into racket_aliases (series_id, alias)
select s.id, v.alias
  from (values
    ('Wilson', 'Pro Staff', 'prostaff'), ('Wilson', 'Pro Staff', 'pro-staff'),
    ('Babolat', 'Pure Drive', 'puredrive'), ('Babolat', 'Pure Drive', 'pure-drive'),
    ('Babolat', 'Pure Aero', 'pureaero'), ('Babolat', 'Pure Aero', 'pure-aero'),
    ('Babolat', 'Pure Strike', 'purestrike'), ('Babolat', 'Pure Strike', 'pure-strike'),
    ('Yonex', 'EZONE', 'e-zone'), ('Yonex', 'EZONE', 'e zone'),
    ('Yonex', 'VCORE', 'v-core'), ('Yonex', 'VCORE', 'v core'),
    ('Tecnifibre', 'T-Fight', 'tfight'), ('Tecnifibre', 'T-Fight', 't fight'),
    ('Tecnifibre', 'TF40', 'tf-40'), ('Tecnifibre', 'TF40', 'tf 40')) v(brand, series, alias)
  join brands b on lower(b.name) = lower(v.brand)
  join racket_series s on s.brand_id = b.id and lower(s.name) = lower(v.series) and not s.is_other
 where not exists (select 1 from racket_series s2 where s2.brand_id = b.id and lower(s2.name) = v.alias)
on conflict do nothing;

insert into schema_migrations(version) values ('20261123_racket_aliases') on conflict do nothing;
