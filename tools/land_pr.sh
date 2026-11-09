#!/usr/bin/env bash
# 落地一个「只改 *.md」的 PR（11-09）：把分支并入最新 main → 推分支 → 在最新 main 的检出上跑 pr_merge.sh（快进合并）。
#   bash tools/land_pr.sh <PR 号>
# 为什么：手工做这几步在 11-09 重复了 5 次；而且 pr_merge.sh 必须用「最新 main 上的版本」跑——在旧分支上跑，
#   会用旧脚本把中文文件名的文档 PR 判成要跑测试，自动触发 tests-fast 白烧 Actions（见 逃逸缺陷.md 11-09）。
# 只处理纯文档 PR；带代码 / 迁移的 PR 走 pr_merge.sh 本身（要等 CI）。合并前的真机 / E 级审批仍由所有者在对话里点头。
set -eu; N="${1:?用法：bash tools/land_pr.sh <PR 号>}"; R=SMG562/nanbanqiu; cd "$(dirname "$0")/.."
[ -z "$(git status --porcelain)" ] || { echo "工作区有没提交的改动，先处理"; exit 1; }
read -r REF SHA < <(gh api "repos/$R/pulls/$N" --jq '[.head.ref,.head.sha]|join(" ")')
NON=$(gh api "repos/$R/pulls/$N/files" --paginate --jq '.[].filename' | grep -v '\.md$' || true)
[ -z "$NON" ] || { echo "❌ #$N 不只改 *.md（$(echo "$NON" | head -3 | tr '\n' ' ')…），不能用这个脚本，走 pr_merge.sh"; exit 2; }
START=$(git rev-parse --abbrev-ref HEAD)
git fetch -q origin main "$SHA"
git checkout -q -B "$REF" "$SHA"
if ! git merge-base --is-ancestor origin/main HEAD; then
  git merge -q --no-edit -m "合并 origin/main，为快进合并做准备" origin/main || { git merge --abort; git checkout -q "$START"; echo "❌ 合并冲突：#$N 要作者处理"; exit 3; }
  git push -q origin "HEAD:refs/heads/$REF" 2>&1 | grep -v '^remote:' || true
  sleep 4   # 等 GitHub 更新 PR 的头提交
fi
git checkout -q -B landing origin/main   # 最新 main 上的 pr_merge.sh
bash tools/pr_merge.sh "$N"; rc=$?
git checkout -q "$START" 2>/dev/null || true; exit $rc
