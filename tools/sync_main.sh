#!/usr/bin/env bash
# 「main 又前进了」的一条命令解法（11-11）：把最新 origin/main 并进当前分支并推上去，冲突时不留半成品。
#   bash tools/sync_main.sh           合并 → 推分支 → 提示等 CI（bash tools/ci_wait.sh）
#   bash tools/sync_main.sh --check   只看：main 多了什么、和本分支改的文件重不重叠、会不会冲突（不改任何东西）
# 为什么：11-11 数据——近 14 天约 55 次「合并 origin/main，为快进合并做准备」，每次手工 fetch / merge / push / 轮询。
# 冲突：只有 .gitattributes 里登记的（*.list、tests/run_all.mjs 两边各加一行）和「旧分支带着已不入库的生成文件」自动处理；其余列出文件后 merge --abort，由作者判断。
set -eu
# 用 git 找仓库根目录，不用 $0：旧分支没有本脚本时按文档用管道运行（git show origin/main:tools/sync_main.sh | bash），
#   那时 $0 是 bash，dirname/.. 会跑到仓库外的上一层（11-11 协作者实测；上一层若也是仓库，就会在错的仓库里合并推送）
R=$(git rev-parse --show-toplevel 2>/dev/null) || { echo "❌ 当前目录不在 git 仓库里：先 cd 到 nanbanqiu 仓库再运行"; exit 1; }
cd "$R"
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
GEN='^(南伴球_(PWA|Web|后台)\.html|server/migrations/_bundle\.sql)$'   # 生成文件（ADR 0011 起不入库）：旧分支带着它们 → modify/delete 冲突，合并时自动跟着 main 删
if git merge-tree --write-tree HEAD origin/main >/dev/null 2>&1; then echo "✅ 能干净合并"; else
  CF=$(git -c core.quotepath=off merge-tree --write-tree --name-only HEAD origin/main 2>/dev/null | sed -n '2,/^$/p' | grep -v '^$' || true)
  if [ -n "$CF" ] && ! echo "$CF" | grep -qvE "$GEN"; then echo "✅ 只有生成文件冲突（会自动跟着 main 删除）：$(echo "$CF" | tr '\n' ' ')"; else
  echo "⚠️ 会有冲突："; echo "$CF" | head -10 | sed 's/^/    /'
  [ "${1:-}" = "--check" ] || { echo "没有改动；要手工解决：git merge origin/main"; exit 3; }; fi
fi
[ "${1:-}" = "--check" ] && exit 0
git merge -q --no-edit -m "合并 origin/main，为快进合并做准备" origin/main || {
  U=$(git -c core.quotepath=off diff --name-only --diff-filter=U)
  # 11-11：生成文件（三个页面 HTML、_bundle.sql）ADR 0011 起不入库，main 已删；旧分支还带着修改 → modify/delete 冲突，答案永远一样：跟着 main 删掉
  if [ -n "$U" ] && ! echo "$U" | grep -qvE '^(南伴球_(PWA|Web|后台)\.html|server/migrations/_bundle\.sql)$'; then
    echo "ℹ️ 冲突只有生成文件（ADR 0011 起不入库）：跟着 main 删除 → $(echo "$U" | tr '\n' ' ')"
    echo "$U" | while IFS= read -r f; do git rm -q --cached -- "$f" 2>/dev/null || true; rm -f -- "$f"; done
    git -c core.quotepath=off diff --name-only --diff-filter=U | grep -q . && { echo "❌ 还有没解决的冲突"; git merge --abort; exit 3; }
    git commit -q --no-edit || { git merge --abort; exit 3; }
  else
    echo "❌ 合并冲突：$(echo "$U" | tr '\n' ' ')"; git merge --abort; echo "已 --abort，分支没变。"; exit 3
  fi; }
git push -q origin "HEAD:refs/heads/$B" && echo "→ 已合并并推送 $B。下一步：bash tools/ci_wait.sh"
