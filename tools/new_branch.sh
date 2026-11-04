#!/usr/bin/env bash
# 开新分支（11-04）：从最新 origin/main 出发，本地名 = 远端名，立刻推上去并设好跟踪。
#   bash tools/new_branch.sh <分支名>
# 为什么：本地名和远端名不同 / 没设跟踪，会让「有未推送提交」的检查反复误报；从旧分支叠出来的分支，预览站里会缺别的修复。
set -eu
B="${1:?用法：bash tools/new_branch.sh <分支名>}"; cd "$(dirname "$0")/.."
[ -z "$(git status --porcelain)" ] || { echo "工作区有没提交的改动，先提交或处理"; exit 1; }
git fetch -q origin main
git checkout -q -b "$B" origin/main
git push -q -u origin "$B"
echo "✅ 分支 $B 从 origin/main（$(git rev-parse --short origin/main)）出发，已推到远端并设好跟踪"
