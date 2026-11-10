#!/usr/bin/env bash
# 把最新 main 合进当前分支（11-10）：分支落后 main 时 pr_merge.sh 不能快进，要先合 main。
#   src/*.list：.gitattributes 的 union 自动合（两边追加的行都留下），不用手工解。
#   三个生成的 HTML：不手工合，直接重新 node tools/build.mjs。
#   其余冲突（真正的代码冲突）停下来列出来，由人决定。
#   合完只暂存、不提交：按规矩先跑相关测试，全绿再 git commit --no-edit、推送。
# 用法：bash tools/merge_main.sh
set -eu
cd "$(dirname "$0")/.."
[ -z "$(git status --porcelain)" ] || { echo "工作区有没提交的改动，先提交或处理"; exit 1; }
[ "$(git rev-parse --abbrev-ref HEAD)" != main ] || { echo "当前在 main 上，不需要合"; exit 1; }
git fetch -q origin main
if git merge-base --is-ancestor origin/main HEAD; then echo "✅ 已包含最新 main（$(git rev-parse --short origin/main)），不用合"; exit 0; fi
GEN=(南伴球_PWA.html 南伴球_Web.html 南伴球_后台.html)
git merge --no-ff --no-commit origin/main >/dev/null 2>&1 || true
CONF=$(git -c core.quotepath=off diff --name-only --diff-filter=U)
OTHER=$(printf '%s\n' "$CONF" | grep -vxF -e "${GEN[0]}" -e "${GEN[1]}" -e "${GEN[2]}" | grep -v '^$' || true)
if [ -n "$OTHER" ]; then
  echo "❌ 这些文件需要人来合（生成的 HTML 和 src/*.list 已不用管）："; printf '   %s\n' $OTHER
  echo "   解完 git add 这些文件，再重新跑 bash tools/merge_main.sh 的后半段：node tools/build.mjs && git add ${GEN[*]}"; exit 1
fi
node tools/build.mjs >/dev/null && git add -- "${GEN[@]}"
node tools/build.mjs --check && node tools/lint.mjs | tail -1 && node tools/action_audit.mjs | tail -1
echo "✅ 已合入 main（$(git rev-parse --short origin/main)），已暂存未提交。接着："
echo "   node tests/run_all.mjs --changed=origin/main   # 全绿后"
echo "   git commit --no-edit && git push"
