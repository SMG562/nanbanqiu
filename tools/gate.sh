#!/usr/bin/env bash
# 上线闸门（11-03）：这个提交的三项线上检查都过了，才算「已验证」。
#   bash tools/gate.sh [提交号，默认 HEAD]      退出码 0 = 三项都通过；否则列出哪项没过 / 没跑完 / 被取消
# 三项：tests-fast（静态+单元+数据库）· tests（浏览器）· smoke（线上冒烟）。被取消 / 没跑完都算没过——汇报「通过」前必须过这一关。
R=SMG562/nanbanqiu
SHA=$(git rev-parse "${1:-HEAD}")
ok=0
# 11-05：推 main 只在改了这些路径时才触发 smoke（与 .github/workflows/smoke.yml 的 paths 保持一致，tests/unit/ci_paths 盯着）；
# 只改 tools / 文档的提交没有 smoke 运行记录是正常的，显示「不适用」，不是 ❌。
smoke_triggered() {
  # 11-09：core.quotepath=off——git 默认把中文文件名加引号输出（"南伴球_PWA.html"），结尾的引号会让 *.html 匹配不上（同 pr_merge.sh 的 #100）
  git -c core.quotepath=off diff-tree --no-commit-id --name-only -r --root "$SHA" 2>/dev/null \
    | grep -qE '^(src/.*|.*\.html|sw\.js|functions/.*|server/.*|tools/site\.mjs|tools/smoke_prod\.mjs)$'
}
# 11-13（#266）：tests-fast / tests 也按 paths 触发（两份 paths 一致，ci_paths 盯着）；只改文档的提交没有运行记录 = 「不适用」。
# 下面两个正则要和 tests-fast.yml 的 push.paths 等价，tests/unit/ci_paths 拿每个已跟踪文件对照。
TESTS_RE='^(src/.*|.*\.(html|js|mjs|cjs|sql|py|json|jsonc|sh)|manifest\.webmanifest|tests/.*|\.github/(workflows|actions)/.*|\.githooks/.*|\.gitattributes|vendor/.*)$'
TESTS_EXCL='^marketing/icons/'
tests_triggered() {
  git -c core.quotepath=off diff-tree --no-commit-id --name-only -r --root "$SHA" 2>/dev/null \
    | grep -vE "$TESTS_EXCL" | grep -qE "$TESTS_RE"
}
# 11-20（#480）：某提交的运行被取消、但更新的 main 提交（包含它）同一工作流已绿 = 被后者覆盖，算过；找不到才仍按没过。
covered_by() {
  git merge-base --is-ancestor "$SHA" origin/main 2>/dev/null || return 1
  for N in $(git rev-list --reverse --max-count=5 "$SHA..origin/main"); do
    C=$(gh api "repos/$R/actions/runs?head_sha=$N&per_page=100" --jq "[.workflow_runs[]|select(.path==\".github/workflows/$1.yml\")]|sort_by(.created_at)|last|\"\(.status) \(.conclusion // \"\")\"" 2>/dev/null)
    [ "$C" = "completed success" ] && { echo "${N:0:7}"; return 0; }
  done; return 1
}
for W in tests-fast tests smoke; do
  L=$(gh api "repos/$R/actions/runs?head_sha=$SHA&per_page=100" --jq "[.workflow_runs[]|select(.path==\".github/workflows/$W.yml\" and ((.display_title // \"\")|test(\"visual-baseline|未测：草稿\")|not))]|sort_by(.created_at)|last|\"\(.status) \(.conclusion // \"\")\"" 2>/dev/null); [ "$L" = "null " ] && L=""
  if [ "$L" = "completed success" ]; then echo "✅ $W"
  elif [ "$L" = "completed cancelled" ] && CB=$(covered_by "$W"); then echo "✅ $W（本轮被取消，由后续 main 提交 $CB 的绿灯覆盖）"
  elif [ -z "$L" ] && [ "$W" = smoke ] && ! smoke_triggered; then echo "⚪ smoke：不适用（这个提交没改会触发 smoke 的文件，见 smoke.yml 的 paths；定时冒烟另跑）"
  elif [ -z "$L" ] && [ "$W" != smoke ] && ! tests_triggered; then echo "⚪ $W：不适用（这个提交没改会触发测试的文件，见 $W.yml 的 paths）"
  else echo "❌ $W：${L:-没有运行记录}"; ok=1; fi
done
exit $ok
