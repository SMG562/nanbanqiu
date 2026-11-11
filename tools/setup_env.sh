#!/usr/bin/env bash
# 一条命令装好本地开发 / 测试环境（新会话 clone 之后跑一次；已装好的会跳过，可以反复跑）
#   bash tools/setup_env.sh            装缺的
#   bash tools/setup_env.sh --check    只检查，不安装
# 装：提交前检查（git hooks + 提交署名）· ESLint · pglast · PostgreSQL 16 + PostGIS（真实数据库测试）· 检查 Playwright
# PGlite、pg 这两个 npm 包不在这里装：第一次跑 run_all 时自动装到 NBQ_CACHE。
set -u
cd "$(dirname "$0")/.."
CHECK=0; [ "${1:-}" = "--check" ] && CHECK=1
CACHE="${NBQ_CACHE:-$HOME/.cache/nbq-tests}"
MISS=0
say() { printf '%s %s\n' "$1" "$2"; }
need() { say "✗" "$1"; MISS=$((MISS+1)); }
SUDO=""; [ "$(id -u)" != 0 ] && command -v sudo >/dev/null && SUDO="sudo"

# 1. 提交前检查 + 署名
git config core.hooksPath .githooks
# 合并规则（.gitattributes）：生成文件合并时先留当前分支的，合并后 .githooks/post-merge 重新生成（11-10）
git config merge.nbq-generated.name '生成文件：合并时留当前分支的，合并后重新生成'
git config merge.nbq-generated.driver true
[ -n "$(git config user.name)" ] || git config user.name Claude
[ -n "$(git config user.email)" ] || git config user.email noreply@anthropic.com
say "✓" "提交前检查已启用（core.hooksPath = .githooks）"

# 2. ESLint
if [ -x "$CACHE/lint/node_modules/.bin/eslint" ]; then say "✓" "ESLint"
elif [ $CHECK = 1 ]; then need "ESLint 没装"
else mkdir -p "$CACHE/lint" && cp tests/lint/package.json "$CACHE/lint/" && (cd "$CACHE/lint" && npm install --no-audit --no-fund -s >/dev/null 2>&1) && say "✓" "ESLint（刚装）" || need "ESLint 安装失败（需要能访问 npm）"; fi

# 3. pglast（schema.sql 语法检查）
if python3 -c "import pglast" 2>/dev/null; then say "✓" "pglast"
elif [ $CHECK = 1 ]; then need "pglast 没装"
else (pip install --break-system-packages -q pglast || pip install -q pglast) >/dev/null 2>&1 && python3 -c "import pglast" 2>/dev/null && say "✓" "pglast（刚装）" || need "pglast 安装失败：pip install pglast"; fi

# 4. PostgreSQL + PostGIS（pg/ 测试）：缺 PostGIS 时 initdb 在、但数据库起不来，所以两样都查
hasinit() { ls /usr/lib/postgresql/*/bin/initdb >/dev/null 2>&1; }
haspostgis() { ls /usr/share/postgresql/*/extension/postgis.control >/dev/null 2>&1; }
if [ -n "${NBQ_PGBIN:-}" ] || { hasinit && haspostgis; }; then say "✓" "PostgreSQL + PostGIS"
elif [ $CHECK = 1 ]; then need "PostgreSQL / PostGIS 没装（pg/ 测试跑不了）"
else
  # apt update 里个别源（如 docker）会 403，不影响 Ubuntu 自己的源，所以不看它的退出码
  $SUDO apt-get update -q >/dev/null 2>&1 || true
  $SUDO apt-get install -y -q postgresql-16 postgresql-16-postgis-3 >/dev/null 2>&1
  { hasinit && haspostgis; } && say "✓" "PostgreSQL + PostGIS（刚装）" || need "PostgreSQL / PostGIS 安装失败：apt install postgresql-16 postgresql-16-postgis-3"
fi

# 5. Playwright（前台 / 后台浏览器测试）：只检查，浏览器已预装
if NODE_PATH="$(npm root -g 2>/dev/null)" node -e "require('playwright')" 2>/dev/null; then say "✓" "Playwright"
else need "Playwright 没装：npm i -g playwright && npx playwright install chromium"; fi

echo
if [ $MISS = 0 ]; then echo "环境齐了。跑测试：node tests/run_all.mjs --grep=<相关>（改了 schema.sql 加 pg/，例如 --grep=pg/,schema/）"; else echo "还缺 $MISS 项（见上面的 ✗）。"; exit 1; fi
