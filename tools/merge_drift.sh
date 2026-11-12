#!/usr/bin/env bash
# main 比 PR 前进了：能不能不重合 main、不重跑 CI 就合并（11-11，所有者定「按文件重叠放宽」；#125）
#   bash tools/merge_drift.sh <PR 提交号> [main 引用，默认 origin/main]
#   退出 0 = 可放宽（stdout 一句话说明）；退出 1 = 严格（stdout 说明原因：先 bash tools/sync_main.sh 再等 CI）
# 放宽条件：① main 多出来的文件都是 *.md；或 ② 与 PR 改的文件完全不重叠，且 git merge-tree 预演能干净合并。
# 永远严格：任一边动了闸门本身（tools/gate.sh、pr_merge.sh、merge_drift.sh、.githooks/）、.github/workflows/；
#   main 这边动了 schema.sql、server/migrations/（迁移顺序会变）。只有 PR 动库结构 → 照常按下面的条件放宽（11-12，#229）。
# 放宽后的兜底：压缩合并后 main 自己跑 tests-fast / tests，红了立刻 revert；合并后照旧 bash tools/gate.sh <提交号>。
set -u
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
