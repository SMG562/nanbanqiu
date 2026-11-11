#!/usr/bin/env bash
# PR 状态（草稿 / Ready）只由「PR 所属分支上的会话」改（11-12，#185 事故：同账号两个会话 22 秒内 Ready→草稿）。
#   bash tools/pr_state.sh <PR号> status|mine|ready|draft
#   mine = 被 PR 事件叫醒后的第一步（唤醒闸门）：是我的 PR → 退出码 0；不是 → 退出码 3，并告诉你该做什么。
# 规矩：一个会话 = 一个 Issue = 一个分支 = 这个分支上的 PR；当前检出的分支 ≠ PR 的分支 → 拒绝（别的会话只许留言）。
# 例外只有 NBQ_PR_OVERRIDE="原因"（所有者当场点头的），原因会写进 PR 留言留痕。
set -eu
PR="${1:?用法：bash tools/pr_state.sh <PR号> status|ready|draft}"; ACT="${2:-status}"; R=SMG562/nanbanqiu
read -r HEAD DRAFT STATE < <(gh api "repos/$R/pulls/$PR" --jq '[.head.ref,.draft,.state]|@tsv')
echo "PR #$PR 分支 $HEAD ｜ 草稿=$DRAFT ｜ $STATE ｜ 当前检出分支 $(git rev-parse --abbrev-ref HEAD)"
[ "$ACT" = status ] && exit 0
if [ "$ACT" = mine ]; then
  [ "$(git rev-parse --abbrev-ref HEAD)" = "$HEAD" ] && { echo "✅ 是我的 PR（分支 $HEAD）"; exit 0; }
  echo "⛔ 不是我的 PR（它属于分支 $HEAD）：不改状态、不推提交、不回机器人评论；有话用 bash tools/pr_say.sh 留一条带标签的评论；然后取消订阅这个 PR 的活动。"; exit 3
fi
[ "$STATE" = open ] || { echo "PR 不是 open，不改状态"; exit 1; }
if [ "$(git rev-parse --abbrev-ref HEAD)" != "$HEAD" ]; then
  if [ -z "${NBQ_PR_OVERRIDE:-}" ]; then
    echo "⛔ 这个 PR 属于分支 $HEAD 的会话。你不在这个分支上：不要改它的草稿 / Ready 状态。"
    echo "   要它改：在 PR 上留言【请转草稿】/【请转 Ready】+ 理由，由所属会话自己改（见 docs/协作分工.md §1b）。"
    exit 2
  fi
  gh pr comment "$PR" -R "$R" --body "【越权改状态】$ACT：$NBQ_PR_OVERRIDE（所有者点头）" >/dev/null
fi
case "$ACT" in
  ready) [ "$DRAFT" = true ] || { echo "已经是 Ready"; exit 0; }; P=ready_for_review ;;
  draft) [ "$DRAFT" = false ] || { echo "已经是草稿"; exit 0; }; P=convert_to_draft ;;
  *) echo "动作只能是 status|ready|draft"; exit 1 ;;
esac
gh api -X POST "repos/$R/pulls/$PR/ccr/$P" >/dev/null 2>&1 || { [ "$ACT" = ready ] && gh pr ready "$PR" -R "$R" || { echo "改状态失败（CCR 路由和 gh 都不通）"; exit 1; }; }
echo "✅ PR #$PR → $ACT"
