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
for W in tests-fast tests smoke; do
  L=$(gh api "repos/$R/actions/runs?head_sha=$SHA&per_page=20" --jq "[.workflow_runs[]|select(.path==\".github/workflows/$W.yml\" and ((.display_title // \"\")|test(\"visual-baseline|未测：草稿\")|not))]|sort_by(.created_at)|last|\"\(.status) \(.conclusion // \"\")\"" 2>/dev/null); [ "$L" = "null " ] && L=""
  if [ "$L" = "completed success" ]; then echo "✅ $W"
  elif [ -z "$L" ] && [ "$W" = smoke ] && ! smoke_triggered; then echo "⚪ smoke：不适用（这个提交没改会触发 smoke 的文件，见 smoke.yml 的 paths；定时冒烟另跑）"
  else echo "❌ $W：${L:-没有运行记录}"; ok=1; fi
done
exit $ok
