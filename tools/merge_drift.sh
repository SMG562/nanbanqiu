#!/usr/bin/env bash
# main 比 PR 前进了：能不能不重合 main、不重跑 CI 就合并（11-11，所有者定「按文件重叠放宽」；#125）
#   bash tools/merge_drift.sh <PR 提交号> [main 引用，默认 origin/main]
#   退出 0 = 可放宽（stdout 一句话说明）；退出 1 = 严格（stdout 说明原因：先 bash tools/sync_main.sh 再等 CI）
# 放宽条件：① main 多出来的文件都是 *.md；或 ② 与 PR 改的文件完全不重叠，且 git merge-tree 预演能干净合并。
# 永远严格：① 任一边动了 schema.sql、server/migrations/（迁移顺序、db-parity 要在新提交之后）；
#   ② **main 这边**动了闸门本身（tools/gate.sh、pr_merge.sh、merge_drift.sh、.githooks/）或 .github/workflows/（PR 要在新闸门 / 新 CI 下重测）。
#   11-13 放宽：只有 **PR 自己**改闸门 / 工作流、main 没动这些时不再严格（#253：改一行 CI 注释被 main 上无关提交追着重跑两轮）；不重叠 + 预演干净 + 合并后 main 自己再测兜底。
# 放宽后的兜底：压缩合并后 main 自己跑 tests-fast / tests，红了立刻 revert；合并后照旧 bash tools/gate.sh <提交号>。
set -u
SHA="${1:?用法：bash tools/merge_drift.sh <PR 提交号> [main 引用]}"; MAIN="${2:-origin/main}"
cd "$(dirname "$0")/.."
git merge-base --is-ancestor "$MAIN" "$SHA" 2>/dev/null && { echo "main 已是祖先，可直接快进"; exit 0; }
base=$(git merge-base "$MAIN" "$SHA" 2>/dev/null) || { echo "找不到和 main 的共同祖先"; exit 1; }
theirs=$(git -c core.quotepath=off diff --name-only "$base" "$MAIN" | sort)
mine=$(git -c core.quotepath=off diff --name-only "$base" "$SHA" | sort)
HARD='^(schema\.sql|server/migrations/|tools/(gate|pr_merge|merge_drift)\.sh$|\.githooks/|\.github/workflows/)'; HARD_DB='^(schema\.sql|server/migrations/)'
hit=$( { echo "$theirs" | grep -E "$HARD"; echo "$mine" | grep -E "$HARD_DB"; } | head -3 | tr '\n' ' ')
[ -z "$hit" ] || { echo "牵涉库结构 / 闸门 / CI 本身（$hit）：永远严格"; exit 1; }
if ! echo "$theirs" | grep -qvE '\.md$'; then echo "main 多出来的只有 *.md 文档，认 PR 上已测结果"; exit 0; fi
both=$(comm -12 <(echo "$theirs") <(echo "$mine") | grep . | head -3 | tr '\n' ' ')
[ -z "$both" ] || { echo "main 和 PR 同改了：$both"; exit 1; }
git merge-tree --write-tree "$MAIN" "$SHA" >/dev/null 2>&1 || { echo "合并预演有冲突（或 git 低于 2.38）"; exit 1; }
echo "main 多出来的文件和 PR 完全不重叠，合并预演干净"
