# 测试用：把 schema.sql 改写成测试副本（只去掉 postgis 扩展、去掉 geography 的 typmod），再用 pglast 切分语句
import sys, json, re, pglast
src = open(sys.argv[1], encoding='utf-8').read()
# 先在原文件上做 pglast 全量解析（真实文件必须能被解析）
pglast.parse_sql(src)
t = src.replace('create extension if not exists postgis;', '-- [test] postgis 由桩替代')
t = re.sub(r'geography\(point,\s*4326\)', 'geography', t)
stmts = [s for s in pglast.split(t, with_parser=True)]
json.dump(stmts, open(sys.argv[2], 'w', encoding='utf-8'), ensure_ascii=False)
print('pglast parse OK; statements:', len(stmts))
