#!/usr/bin/env bash
# main 比 PR 前进了：能不能不重合 main、不重跑 CI 就合并（11-11，所有者定「按文件重叠放宽」；#125）
#   bash tools/merge_drift.sh <PR 提交号> [main 引用，默认 origin/main]
#   退出 0 = 可放宽（stdout 一句话说明）；退出 1 = 严格（stdout 说明原因：先 bash tools/sync_main.sh 再等 CI）
# 放宽条件：① main 多出来的文件都是 *.md；或 ② 与 PR 改的文件完全不重叠，且 git merge-tree 预演能干净合并。
# 永远严格：任一边动了闸门本身（tools/gate.sh、pr_merge.sh、merge_drift.sh、.githooks/）、.github/workflows/；
#   main 这边动了 schema.sql、server/migrations/（迁移顺序会变）。只有 PR 动库结构 → 照常按下面的条件放宽（11-12，#229）。
# 放宽后的兜底：压缩合并后 main 自己跑 tests-fast / tests，红了立刻 revert；合并后照旧 bash tools/gate.sh <提交号>。
set -u
# 子命令 --db-parity（11-13，#241）：改了库结构的 PR，db-parity 算不算数——唯一实现（pr_merge.sh ④ 和 tools/merge_gate.mjs 都只调它）
#   bash tools/merge_drift.sh --db-parity <PR 提交号>   退出 0 = 算数（stdout：ok <运行号> <时间锚点>），1 = 不算（no <最近一次状态> <时间锚点>）
#   以「schema.sql / server/migrations 最后一次改动」的提交时间为锚点：只多合并 main / 改了别的文件不作废，库结构再改才作废；
#   取不到改动记录就退回头提交时间（原规则，更严）；_bundle.sql 是生成文件（ADR 0011）不算。放在这里而不是新脚本：tools 脚本数有上限（ADR 0012）
if [ "${1:-}" = --db-parity ]; then
  SHA="${2:?用法：bash tools/merge_drift.sh --db-parity <PR 提交号>}"; R=SMG562/nanbanqiu; cd "$(dirname "$0")/.."
  T=$(git log -1 --format=%cI "$SHA" -- schema.sql server/migrations ':!server/migrations/_bundle.sql' 2>/dev/null); [ -n "$T" ] || T=$(git show -s --format=%cI "$SHA" 2>/dev/null)
  [ -n "$T" ] || { echo "no 取不到提交$SHA -"; exit 1; }
  RUNS=$(gh api "repos/$R/actions/workflows/db-parity.yml/runs?per_page=10" 2>/dev/null) || { echo "no 读不到db-parity运行记录 $T"; exit 1; }
  printf '%s' "$RUNS" | T="$T" node -e '
    const t = new Date(process.env.T).toISOString(); let j; try { j = JSON.parse(require("fs").readFileSync(0, "utf8")) } catch { console.log("no 运行记录读不懂 " + process.env.T); process.exit(1) }
    const d = (j.workflow_runs || []).filter(r => r.created_at > t).sort((a, b) => a.created_at < b.created_at ? 1 : -1)[0];
    if (d && d.status === "completed" && d.conclusion === "success") { console.log(`ok ${d.id} ${process.env.T}`); process.exit(0) }
    console.log(`no ${d ? (d.status + "/" + (d.conclusion || "-")) : "没有"} ${process.env.T}`); process.exit(1)'
  exit $?
fi
SHA="${1:?用法：bash tools/merge_drift.sh <PR 提交号> [main 引用]}"; MAIN="${2:-origin/main}"
cd "$(dirname "$0")/.."
git merge-base --is-ancestor "$MAIN" "$SHA" 2>/dev/null && { echo "main 已是祖先，可直接快进"; exit 0; }
base=$(git merge-base "$MAIN" "$SHA" 2>/dev/null) || { echo "找不到和 main 的共同祖先"; exit 1; }
theirs=$(git -c core.quotepath=off diff --name-only "$base" "$MAIN" | sort)
mine=$(git -c core.quotepath=off diff --name-only "$base" "$SHA" | sort)
HARD='^(tools/(gate|pr_merge|merge_drift)\.sh$|\.githooks/|\.github/workflows/)'
hit=$( { echo "$theirs"; echo "$mine"; } | grep -E "$HARD" | head -3 | tr '\n' ' ')
[ -z "$hit" ] || { echo "牵涉闸门 / CI 本身（$hit）：永远严格"; exit 1; }
# 11-12（#229）：库结构只在 main 这边动了才永远严格（迁移顺序会变）；只有 PR 动库结构时照常按「不重叠 + 预演干净」放宽——
#   迁移已先在正式库跑过、db-parity 绑库结构内容（pr_merge.sh ④），main 上别的代码本来就跑在新结构上，重跑一轮不多保护什么
DB='^(schema\.sql$|server/migrations/)'
hit=$(echo "$theirs" | grep -E "$DB" | head -3 | tr '\n' ' ')
[ -z "$hit" ] || { echo "main 动了库结构（$hit）：永远严格"; exit 1; }
if ! echo "$theirs" | grep -qvE '\.md$'; then echo "main 多出来的只有 *.md 文档，认 PR 上已测结果"; exit 0; fi
both=$(comm -12 <(echo "$theirs") <(echo "$mine") | grep . | head -3 | tr '\n' ' ')
[ -z "$both" ] || { echo "main 和 PR 同改了：$both"; exit 1; }
git merge-tree --write-tree "$MAIN" "$SHA" >/dev/null 2>&1 || { echo "合并预演有冲突（或 git 低于 2.38）"; exit 1; }
echo "main 多出来的文件和 PR 完全不重叠，合并预演干净"
