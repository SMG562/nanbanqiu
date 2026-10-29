#!/usr/bin/env bash
# 把 schema.sql 建到一个「空」的 PostgreSQL / Supabase 库里，并做建后核对。
#   用法：NBQ_DB_URL='postgresql://…' bash tools/db_apply.sh [--check | --apply]
#   --check（默认）只做建前检查，不改库；--apply 检查通过后建库并核对。
# 连接串只放在你电脑的环境变量里，不写进文件、不进仓库。
# Supabase：Settings → Database → Connection string → 选 Session pooler（或 Direct），把 [YOUR-PASSWORD] 换成数据库密码。
# 建之前：Database → Extensions 打开 pg_cron（schema 里 11 个定时任务靠它自动登记；postgis / pgcrypto / pg_trgm 会自动装）。
set -euo pipefail
cd "$(dirname "$0")/.."

MODE="${1:---check}"
[[ "$MODE" == "--check" || "$MODE" == "--apply" ]] || { echo "用法：$0 [--check|--apply]"; exit 2; }
: "${NBQ_DB_URL:?先设置环境变量 NBQ_DB_URL（数据库连接串）}"
command -v psql >/dev/null || { echo "✗ 没有 psql（mac：brew install libpq && brew link --force libpq）"; exit 1; }

Q() { psql "$NBQ_DB_URL" -X -q -At -v ON_ERROR_STOP=1 -c "$1"; }
ok() { echo "✓ $*"; }
bad() { echo "✗ $*"; FAIL=1; }
FAIL=0

echo "== 建前检查（$(Q "select current_database() || ' @ ' || inet_server_addr()::text" 2>/dev/null || echo '?')）=="
VER=$(Q "show server_version_num")
(( VER >= 150000 )) && ok "PostgreSQL ${VER:0:2}" || bad "PostgreSQL 版本过低（要 15+，现 $VER）"

for e in postgis pgcrypto pg_trgm; do
  [[ -n "$(Q "select 1 from pg_available_extensions where name='$e'")" ]] && ok "扩展 $e 可用" || bad "扩展 $e 不可用"
done
if [[ -n "$(Q "select 1 from pg_extension where extname='pg_cron'")" ]]; then ok "pg_cron 已打开（定时任务会自动登记）"
elif [[ "${NBQ_ALLOW_NO_CRON:-}" == 1 ]]; then echo "! 没有 pg_cron（已允许，本地测试用；定时任务不会登记）"
else bad "pg_cron 还没打开：Supabase → Database → Extensions 打开后重跑（本地测试可设 NBQ_ALLOW_NO_CRON=1）"; fi

N=$(Q "select count(*) from pg_tables where schemaname='public' and tablename not in ('spatial_ref_sys')")
if [[ "$N" != "0" ]]; then bad "public 里已有 $N 张表。schema.sql 只能建在空库上（不是增量迁移）；要重建请先在 Supabase 新建一个空项目或自己确认后清空"; fi

if (( FAIL )); then echo; echo "建前检查未通过，没有改动数据库。"; exit 1; fi
[[ "$MODE" == "--apply" ]] || { echo; echo "建前检查通过（只检查，没改库）。确认后：NBQ_DB_URL=… bash tools/db_apply.sh --apply"; exit 0; }

echo; echo "== 建库（schema.sql 里有 enum 加值，不能包在单个事务里；出错即停）=="
# schema.sql 开头自己把消息级别设回 warning，所以这里直接过滤 PostGIS 自带对象收不回 / 给不了权限的无害提示（其余警告和报错照常显示）
if ! { cat schema.sql; } | psql "$NBQ_DB_URL" -X -q -v ON_ERROR_STOP=1 -f - >/dev/null 2> >(grep -v -E 'no privileges (could be revoked|were granted)' >&2); then
  echo "✗ 建库中途出错，库里可能留着一半的表。把上面的错误发给 Claude；重试前要先把库清空（Supabase 建议直接用新的空项目，或由你确认后在 SQL Editor 里 drop schema public cascade; create schema public;）。"
  exit 1
fi
ok "schema.sql 已执行"

echo; echo "== 建后核对 =="
T=$(Q "select count(*) from pg_tables where schemaname='public' and tablename<>'spatial_ref_sys'")
R=$(Q "select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and c.relname<>'spatial_ref_sys' and not c.relispartition and not c.relrowsecurity")
(( R == 0 )) && ok "$T 张表（含分区），分区之外全部开启 RLS" || bad "有 $R 张表没开 RLS"

for role in anon authenticated; do
  # 扩展自带的对象（PostGIS 的坐标系表、几何函数）在 Supabase 上属于平台账号，收不回，也不含用户数据，不计入
  P=$(Q "select count(*) from pg_class c where c.relnamespace='public'::regnamespace and c.relkind in ('r','p','v','m','S') and not exists (select 1 from pg_depend d where d.objid=c.oid and d.deptype='e') and (has_table_privilege('$role', c.oid, 'select,insert,update,delete') or (c.relkind='S' and has_sequence_privilege('$role', c.oid, 'usage,select')))")
  F=$(Q "select count(*) from pg_proc p where p.pronamespace='public'::regnamespace and not exists (select 1 from pg_depend d where d.objid=p.oid and d.deptype='e') and has_function_privilege('$role', p.oid, 'execute')")
  (( P == 0 && F == 0 )) && ok "$role 对我们的表 / 函数无任何权限（公开 key 读不到数据）" || bad "$role 仍有权限：表 $P 项、函数 $F 项"
done

C=$(Q "select count(*) from cities")
(( C > 0 )) && ok "城市初始数据 $C 条" || bad "cities 为空"
if [[ -n "$(Q "select 1 from pg_extension where extname='pg_cron'")" ]]; then
  J=$(Q "select count(*) from cron.job where jobname like 'nbq_%'")
  (( J == 11 )) && ok "定时任务已登记 $J 个" || bad "定时任务登记了 $J 个（预期 11 个）"
fi

echo
if (( FAIL )); then echo "建后核对有问题，请把上面 ✗ 的行发给 Claude。"; exit 1; fi
cat <<'EOF'
建库完成，核对通过。接下来（只在 Supabase SQL Editor 里手动做，密码不要发给 Claude）：
  1. 建 API 登录账号并加入角色：
       create role nbq_api login password '<强密码>' in role nbq_user, nbq_service;
  2. 后台账号按需加入 nbq_admin / nbq_viewer。
EOF
