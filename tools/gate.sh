#!/usr/bin/env bash
# 上线闸门（11-03）：这个提交的三项线上检查都过了，才算「已验证」。
#   bash tools/gate.sh [提交号，默认 HEAD]      退出码 0 = 三项都通过；否则列出哪项没过 / 没跑完 / 被取消
# 三项：tests-fast（静态+单元+数据库）· tests（浏览器）· smoke（线上冒烟）。被取消 / 没跑完都算没过——汇报「通过」前必须过这一关。
R=SMG562/nanbanqiu
SHA=$(git rev-parse "${1:-HEAD}")
ok=0
for W in tests-fast tests smoke; do
  L=$(gh api "repos/$R/actions/runs?head_sha=$SHA&per_page=20" --jq "[.workflow_runs[]|select(.path==\".github/workflows/$W.yml\" and ((.display_title // \"\")|test(\"visual-baseline\")|not))]|sort_by(.created_at)|last|\"\(.status) \(.conclusion // \"\")\"" 2>/dev/null); [ "$L" = "null " ] && L=""
  [ "$L" = "completed success" ] && echo "✅ $W" || { echo "❌ $W：${L:-没有运行记录}"; ok=1; }
done
exit $ok
