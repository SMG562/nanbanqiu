#!/usr/bin/env bash
# 「main 又前进了」的一条命令解法（11-11）：把最新 origin/main 并进当前分支并推上去，冲突时不留半成品。
#   bash tools/sync_main.sh           合并 → 推分支 → 提示等 CI（bash tools/ci_wait.sh）
#   bash tools/sync_main.sh --check   只看：main 多了什么、和本分支改的文件重不重叠、会不会冲突（不改任何东西）
# 为什么：11-11 数据——近 14 天约 55 次「合并 origin/main，为快进合并做准备」，每次手工 fetch / merge / push / 轮询。
# 冲突：只有 .gitattributes 里登记的（*.list 两边各加一行）自动处理；其余列出文件后 merge --abort，由作者判断。
set -eu
cd "$(dirname "$0")/.."
B=$(git rev-parse --abbrev-ref HEAD)
case "$B" in main|staging|HEAD) echo "❌ 不在功能分支上（现在是 $B）"; exit 1;; esac
[ -z "$(git status --porcelain)" ] || { echo "❌ 工作区有没提交的改动，先提交或处理"; exit 1; }
git fetch -q origin main
n=$(git rev-list --count HEAD..origin/main)
[ "$n" -gt 0 ] || { echo "✅ $B 已包含最新 main，不用合"; exit 0; }
base=$(git merge-base HEAD origin/main 2>/dev/null) || { git fetch -q --deepen=200 origin main "$B" 2>/dev/null || true; base=$(git merge-base HEAD origin/main); }
theirs=$(git -c core.quotepath=off diff --name-only "$base" origin/main | sort); mine=$(git -c core.quotepath=off diff --name-only "$base" HEAD | sort)
both=$(comm -12 <(echo "$theirs") <(echo "$mine") | grep . || true)
echo "main 比 $B 多 $n 个提交，改了 $(echo "$theirs" | grep -c .) 个文件；其中和本分支同改的：${both:-无}"
if ! echo "$theirs" | grep -qvE '\.md$'; then echo "ℹ️ main 多出来的只有 *.md（文档）"; fi
if git merge-tree --write-tree HEAD origin/main >/dev/null 2>&1; then echo "✅ 能干净合并"; else
  echo "⚠️ 会有冲突："; git -c core.quotepath=off merge-tree --write-tree --name-only HEAD origin/main 2>/dev/null | sed -n '2,$p' | grep -v '^$' | head -10 | sed 's/^/    /'
  [ "${1:-}" = "--check" ] || { echo "没有改动；要手工解决：git merge origin/main"; exit 3; }
fi
[ "${1:-}" = "--check" ] && exit 0
git merge -q --no-edit -m "合并 origin/main，为快进合并做准备" origin/main || {
  echo "❌ 合并冲突：$(git -c core.quotepath=off diff --name-only --diff-filter=U | tr '\n' ' ')"; git merge --abort; echo "已 --abort，分支没变。"; exit 3; }
git push -q origin "HEAD:refs/heads/$B" && echo "→ 已合并并推送 $B。下一步：bash tools/ci_wait.sh"
