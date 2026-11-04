#!/usr/bin/env bash
# 合并 PR（11-04）：只允许「快进」——把 PR 最新提交原样推成 main，main 上的提交号 = 测过的提交号，
# 所以合并后 tests / tests-fast 直接复用 PR 上的结果（tools/ci_reuse.sh），不重跑；GitHub 会自动把 PR 标成已合并。
#   bash tools/pr_merge.sh <PR 号>            核对全部通过才推；任何一项不满足就停，并说明怎么补
#   bash tools/pr_merge.sh <PR 号> --check    只核对，不推
# 核对：① PR 打开着、目标是 main；② main 是 PR 提交的祖先（能快进；不能就先 rebase 到最新 main 再推，等测试重跑）；
#   ③ 这个提交的 tests-fast、tests 都通过（没跑完 / 失败 / 取消都不行）；
#   ④ 动到了 schema.sql 或 server/migrations：db-parity 在这个提交之后跑过且通过（迁移先在正式库跑）；
#   ⑤ PR 描述有「入口清单」，较大风险的 PR 真机两项（刷新后还在 / 换设备登录还在）已勾（tools/pr_body_check.mjs --merge）；
#   ⑥ 本地工作区干净（不会把没提交的东西当成测过的）。
# 合并后再跑：bash tools/gate.sh <提交号>（tests-fast · tests · smoke 三项）才算上线。
set -u
R=SMG562/nanbanqiu; N="${1:?用法：bash tools/pr_merge.sh <PR 号> [--check]}"; CHECK="${2:-}"
cd "$(dirname "$0")/.."
bad=0; no() { echo "❌ $*"; bad=1; }; yes() { echo "✅ $*"; }
P=$(gh api "repos/$R/pulls/$N" --jq '[.state, .base.ref, .head.ref, .head.sha, (.merged|tostring)]|join(" ")') || { echo "读不到 PR #$N"; exit 2; }
read -r STATE BASE HEAD SHA MERGED <<<"$P"
[ "$STATE" = open ] && [ "$BASE" = main ] && yes "PR #$N 打开着，目标 main（分支 $HEAD，提交 ${SHA:0:7}）" || no "PR #$N 状态 $STATE / 目标 $BASE / 已合并 $MERGED"
git fetch -q origin main "$HEAD" 2>/dev/null; git fetch -q --unshallow 2>/dev/null || true
git cat-file -e "$SHA^{commit}" 2>/dev/null || git fetch -q origin "$SHA" 2>/dev/null
if git merge-base --is-ancestor origin/main "$SHA" 2>/dev/null; then yes "可以快进（main 是这个提交的祖先）"
else no "不能快进：main 有 PR 之外的新提交。在分支上  git merge origin/main  再推分支（不用强推），等 PR 上的测试对新提交跑完再合并"; fi
for W in tests-fast tests; do
  L=$(gh api "repos/$R/actions/runs?head_sha=$SHA&per_page=50" --jq "[.workflow_runs[]|select(.path==\".github/workflows/$W.yml\" and ((.display_title // \"\")|test(\"visual-baseline\")|not))]|sort_by(.created_at)|last|\"\(.status) \(.conclusion // \"\") \(.id)\"" 2>/dev/null)
  case "$L" in "completed success "*) yes "$W 通过（运行 ${L##* }）";; "null"*|"") no "$W：这个提交还没有运行记录";; *) no "$W：$L";; esac
done
if [ -n "$(git diff --name-only origin/main "$SHA" -- schema.sql server/migrations)" ]; then
  T=$(git show -s --format=%cI "$SHA")
  D=$(gh api "repos/$R/actions/workflows/db-parity.yml/runs?per_page=5" --jq "[.workflow_runs[]|select(.created_at > \"$(date -u -d "$T" +%Y-%m-%dT%H:%M:%SZ)\")]|sort_by(.created_at)|last|\"\(.status) \(.conclusion // \"\") \(.id)\"" 2>/dev/null)
  case "$D" in "completed success "*) yes "改了数据库：db-parity 在这个提交之后通过（运行 ${D##* }）";; *) no "改了数据库：需要在这个提交之后跑 db-parity 并通过（先在正式库跑迁移）。现在：${D:-没有}";; esac
else yes "没改数据库结构，不需要 db-parity"; fi
PB=$(node tools/pr_body_check.mjs "$N" --merge 2>&1) && yes "PR 描述：入口清单 + 真机两项核对通过" || { no "PR 描述核对没过："; echo "$PB" | sed 's/^/    /'; }
[ -z "$(git status --porcelain)" ] && yes "本地工作区干净" || no "本地有没提交的改动"
[ $bad = 0 ] || { echo "→ 有没满足的项，没有合并。"; exit 1; }
[ "$CHECK" = "--check" ] && { echo "→ 全部满足（--check 只核对，没有推）。"; exit 0; }
git push origin "$SHA:refs/heads/main" || { echo "推送失败（不会强推）。"; exit 1; }
echo "→ 已快进合并：main = ${SHA:0:7}。接着：bash tools/gate.sh $SHA（等 smoke 跑完）"
