#!/usr/bin/env bash
# CI 按提交复用测试结果（11-04）：推到 main 的提交如果已经在 PR / 分支上用同一个工作流测过并通过，就不再重跑。
# 只看「完全相同的提交号」——快进合并时 main 上的提交就是测过的那个提交；提交号不同（合并提交、rebase）一律重跑，所以不会漏测。
#   bash tools/ci_reuse.sh <工作流名>     在 Actions 里用（要 GH_TOKEN、GITHUB_REPOSITORY、GITHUB_SHA、GITHUB_RUN_ID）
#   输出：hit=1 / hit=0 写进 $GITHUB_OUTPUT；命中时把复用的是哪次运行写进摘要
# 不复用：手动重拍截图基准的运行（visual-baseline，没有跑测试）、失败 / 取消 / 没跑完的运行、本次运行自己。
set -u
W="$1"; SHA="${2:-$GITHUB_SHA}"; OUT="${GITHUB_OUTPUT:-/dev/stdout}"
ID=$(gh api "repos/$GITHUB_REPOSITORY/actions/runs?head_sha=$SHA&per_page=100" --jq "[.workflow_runs[]
  | select(.path==\".github/workflows/$W.yml\" and .status==\"completed\" and .conclusion==\"success\" and (.id|tostring)!=\"$GITHUB_RUN_ID\"
           and (.event==\"pull_request\" or .event==\"push\" or .event==\"workflow_dispatch\")
           and ((.display_title // \"\")|test(\"visual-baseline|未测：草稿\")|not))] | sort_by(.created_at) | last | .id // empty" 2>/dev/null)
if [ -n "$ID" ]; then
  echo "hit=1" >> "$OUT"
  echo "这个提交（${SHA:0:7}）已在运行 [$ID](https://github.com/$GITHUB_REPOSITORY/actions/runs/$ID) 用同一套测试通过，本次不重跑。" >> "${GITHUB_STEP_SUMMARY:-/dev/stdout}"
  echo "::notice title=测试结果::复用运行 $ID 的结果（同一提交 ${SHA:0:7} 已通过）"
else
  echo "hit=0" >> "$OUT"
fi
