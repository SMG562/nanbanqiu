#!/usr/bin/env bash
# 每日集成预览（ADR 0010，11-10）：把待真机的 PR 合到一条临时分支，推上去 → Cloudflare 自动出一个预览站（连测试库），所有者一次测完。
#   bash tools/integration_preview.sh <PR 号> [<PR 号> …]     合并这些 PR 的最新提交，推 integration/<月日-时分>，打印预览地址和合并后的真机清单
#   bash tools/integration_preview.sh --dry <PR 号> …          只演练：本地合并看有没有冲突，不推
# 合不上的 PR（冲突）跳过并列出，不会卡住其余；临时分支从来不合进 main（合并仍走各自的 PR），不强推、不删分支。
set -u
R=SMG562/nanbanqiu; DRY=0; [ "${1:-}" = "--dry" ] && { DRY=1; shift; }
[ $# -ge 1 ] || { echo "用法：bash tools/integration_preview.sh [--dry] <PR 号> …"; exit 2; }
cd "$(dirname "$0")/.."
[ -z "$(git status --porcelain)" ] || { echo "工作区不干净，先提交或放一边"; exit 1; }
git fetch -q origin main; B="integration/$(TZ=Australia/Melbourne date +%m%d-%H%M)"
git checkout -q -B "$B" origin/main || exit 1
OK=(); SKIP=(); BODY=""
for N in "$@"; do
  H=$(gh api "repos/$R/pulls/$N" --jq .head.ref) || { SKIP+=("#$N（读不到）"); continue; }
  git fetch -q origin "$H" || { SKIP+=("#$N（取不到分支）"); continue; }
  if git merge --no-edit -q FETCH_HEAD >/dev/null 2>&1; then OK+=("#$N"); BODY+="### #$N $(gh api "repos/$R/pulls/$N" --jq .title)"$'\n'"$(gh api "repos/$R/pulls/$N" --jq .body | grep -E '^\s*- \[ \].*(真机|刷新后还在|换设备|预览站)' | head -6)"$'\n'
  else git merge --abort 2>/dev/null; SKIP+=("#$N（和 main / 前面的 PR 冲突）"); fi
done
# 生成文件在合并后重新生成（post-merge 钩子可能没启用，这里显式做一次）
node tools/build.mjs >/dev/null 2>&1; node tools/migrate_bundle.mjs >/dev/null 2>&1
[ -n "$(git status --porcelain)" ] && { git add -A; git -c user.name=integration -c user.email=integration@local commit -qm "集成预览：合并后重新生成" ; }
echo "已合并：${OK[*]:-无}"; [ ${#SKIP[@]} -gt 0 ] && echo "跳过：${SKIP[*]}"
if [ $DRY = 1 ]; then echo "（--dry：没有推送；分支 $B 只在本地）"; else
  NBQ_UNTESTED="集成预览分支，不进 main" git push -q origin "$B" && echo "预览地址（约 1–2 分钟后可用，连测试库）：https://$(echo "$B" | tr '/' '-' ).nanbanqiu-preview.pages.dev"; fi
echo; echo "== 真机清单（合并后一次测完）=="; echo "$BODY"
git checkout -q main
