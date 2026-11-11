#!/usr/bin/env bash
# 只读：给一个库拍「结构指纹」，用来核对 测试库 和 正式库 是否一致（11-03：测试库上验过的东西，要能证明正式库同样成立）。
#   用法：NBQ_DB_URL='postgresql://…' bash tools/db_parity.sh [标签]   → 输出到屏幕，并写 /tmp/nbq_parity_<标签>.txt
#   对比两个库：分别对测试库、正式库各跑一次，再 diff /tmp/nbq_parity_staging.txt /tmp/nbq_parity_prod.txt
#   一次性对比：NBQ_DB_URL=测试库 NBQ_DB_URL_B=正式库 bash tools/db_parity.sh --diff
# 只读 select，不改库；连接串只放环境变量。
set -euo pipefail
cd "$(dirname "$0")/.."
command -v psql >/dev/null || { echo "✗ 没有 psql（mac：brew install libpq && brew link --force libpq）"; exit 1; }

snap() {  # $1 = 连接串
  local U="$1"; local Q; Q() { psql "$U" -X -q -At -v ON_ERROR_STOP=1 -c "$1"; }
  echo "## 已执行的迁移（schema_migrations）"; Q "select version from schema_migrations order by 1" 2>/dev/null || echo "(没有 schema_migrations 表)"
  echo "## 仓库里的迁移文件里，这个库还没记录的"
  local have; have=$(Q "select version from schema_migrations" 2>/dev/null || true)
  for f in server/migrations/2*.sql; do s=$(basename "$f" .sql); grep -qx "$s" <<<"$have" || echo "缺：$s"; done
  echo "## 表 / 列 / 类型 / 默认值 / 可空（public）"
  Q "select table_name||'.'||column_name||' '||data_type||' default='||coalesce(column_default,'-')||' null='||is_nullable from information_schema.columns where table_schema='public' order by table_name, ordinal_position"
  echo "## 约束（check / 唯一 / 外键）"
  Q "select conrelid::regclass||' '||conname||' '||pg_get_constraintdef(oid) from pg_constraint where connamespace='public'::regnamespace order by 1"
  echo "## 函数（名字 + 定义的 md5，已去掉 -- 注释，只改注释不算差别）"
  Q "select p.proname||'('||pg_get_function_identity_arguments(p.oid)||') '||md5(regexp_replace(pg_get_functiondef(p.oid), '--[^\n]*', '', 'g')) from pg_proc p where p.pronamespace='public'::regnamespace and p.prokind in ('f','p') and not exists (select 1 from pg_depend d where d.objid=p.oid and d.deptype='e') order by 1"
  echo "## 行级安全 / 策略"
  Q "select relname||' rls='||relrowsecurity from pg_class where relnamespace='public'::regnamespace and relkind='r' order by 1"
  Q "select tablename||' '||policyname||' '||coalesce(cmd,'') from pg_policies where schemaname='public' order by tablename, policyname"
  echo "## 定时任务（pg_cron）"; Q "select jobname||' '||schedule from cron.job order by 1" 2>/dev/null || echo "(没有 pg_cron)"
  echo "## 数据里的枚举值分布（库里出现了前台不认识的值就要查）"
  Q "select 'users.avatar_color '||v||' '||n from (select avatar_color::text v, count(*) n from users group by 1 order by 1) x"
  Q "select 'users.card_theme '||v||' '||n from (select card_theme::text v, count(*) n from users group by 1 order by 1) x"
  Q "select 'users.avatar_kind '||v||' '||n from (select avatar_kind::text v, count(*) n from users group by 1 order by 1) x"
  Q "select 'users.gender '||v||' '||n from (select coalesce(gender::text,'null') v, count(*) n from users group by 1 order by 1) x"
}

if [[ "${1:-}" == "--diff" ]]; then
  : "${NBQ_DB_URL:?NBQ_DB_URL = 测试库}"; : "${NBQ_DB_URL_B:?NBQ_DB_URL_B = 正式库}"
  # 先逐个试连：失败时说清是哪个库、用的什么用户名（不打印密码）
  for pair in "测试库:$NBQ_DB_URL" "正式库:$NBQ_DB_URL_B"; do
    nm="${pair%%:*}"; u="${pair#*:}"
    who=$(printf '%s' "$u" | sed -E 's#^[a-z]+://([^:@/]*)[:@].*@([^:/?]*).*#用户名=\1 主机=\2#')
    if ! err=$(psql "$u" -X -q -At -c 'select 1' 2>&1 >/dev/null); then echo "❌ $nm 连不上（$who）"; echo "$err" | head -3; echo "提示：Session pooler 的用户名必须是 postgres.<项目ref>；密码错也会报 password authentication failed"; exit 2; fi
    echo "✓ $nm 连接正常（$who）"
  done
  snap "$NBQ_DB_URL" >/tmp/nbq_parity_A.txt; snap "$NBQ_DB_URL_B" >/tmp/nbq_parity_B.txt
  # 数据行（枚举分布）本来就会不同，只比结构；结构部分在「## 数据里的枚举值分布」之前
  sed '/^## 数据里的枚举值分布/,$d' /tmp/nbq_parity_A.txt >/tmp/nbq_parity_A.s; sed '/^## 数据里的枚举值分布/,$d' /tmp/nbq_parity_B.txt >/tmp/nbq_parity_B.s
  if diff -u /tmp/nbq_parity_A.s /tmp/nbq_parity_B.s; then echo "✅ 测试库和正式库结构一致（表 / 列 / 默认值 / 约束 / 函数 / 权限策略 / 迁移记录 / 定时任务）"; else echo "❌ 上面是两个库的差别（- 是测试库，+ 是正式库）：测试库上验过的结论不能直接当作正式库也成立"; exit 1; fi
  echo; echo "== 两个库各自的数据枚举分布 =="; sed -n '/^## 数据里的枚举值分布/,$p' /tmp/nbq_parity_A.txt | sed 's/^/测试库 /'; sed -n '/^## 数据里的枚举值分布/,$p' /tmp/nbq_parity_B.txt | sed 's/^/正式库 /'
  exit 0
fi
: "${NBQ_DB_URL:?先设置环境变量 NBQ_DB_URL（数据库连接串）}"
L="${1:-db}"; snap "$NBQ_DB_URL" | tee "/tmp/nbq_parity_${L}.txt"; echo; echo "已写 /tmp/nbq_parity_${L}.txt"
