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
#   ⑦ 级别（ADR 0010，tools/decision_card.mjs 按 CODEOWNERS 判定）：改了红线 → 只有所有者能合；需独立复核的路径 → PR 上要有「独立复核：通过 <提交号前 7 位>」留言；其余自助合并。
#   所有者：快进推 main（绕过规则，提交号不变）；main 前进但 tools/merge_drift.sh 判可放宽时，所有者也走下面的压缩合并（11-11）。协作者：不能直推 main，改用 REST 压缩合并（带 sha 守卫，只合测过的那个提交）；主分支会重跑一次测试。
# 全部满足才推；推送时自动带 NBQ_UNTESTED="PR #N CI 已绿 tests-fast#运行号 tests#运行号 @提交号"（pre-push 闸门认作 PR 上已测过，不再要求本地戳）。
# 合并后再跑：bash tools/gate.sh <提交号>（tests-fast · tests · smoke 三项）才算上线。
set -u
R=SMG562/nanbanqiu; N="${1:?用法：bash tools/pr_merge.sh <PR 号> [--check]}"; CHECK="${2:-}"
cd "$(dirname "$0")/.."
CI_IDS=""; bad=0; no() { echo "❌ $*"; bad=1; }; yes() { echo "✅ $*"; }
P=$(gh api "repos/$R/pulls/$N" --jq '[.state, .base.ref, .head.ref, .head.sha, (.merged|tostring), (.head.repo.full_name // "-")]|join(" ")') || { echo "读不到 PR #$N"; exit 2; }
read -r STATE BASE HEAD SHA MERGED HREPO <<<"$P"
# 11-10（#158）：合并后删 head 分支——不留已合并分支。跳过：fork 的分支、main/staging、叠加 PR 的目标（删了会关掉上面的 PR）、合并后又有人推过的
drop_branch() {
  case "$HEAD" in main|staging) return 0;; esac; [ "$HREPO" = "$R" ] || return 0
  [ "$(gh api "repos/$R/pulls?state=open&base=$HEAD" --jq length 2>/dev/null)" = 0 ] || { echo "ℹ️ 分支 $HEAD 是开着的叠加 PR 的目标，先不删"; return 0; }
  [ "$(gh api "repos/$R/git/ref/heads/$HEAD" --jq .object.sha 2>/dev/null)" = "$SHA" ] || { echo "ℹ️ 分支 $HEAD 合并后又有新提交，没删（node tools/branch_prune.mjs 会列出）"; return 0; }
  # 11-12：仓库开着「合并后自动删分支」（delete_branch_on_merge），GitHub 常常比这里先删（事件记在合并的人名下）：删失败先看分支还在不在，别误报「没删掉」
  gh api -X DELETE "repos/$R/git/refs/heads/$HEAD" --silent 2>/dev/null && echo "🗑️ 已删分支 $HEAD（恢复：git push origin $SHA:refs/heads/$HEAD）" \
    || { gh api "repos/$R/git/ref/heads/$HEAD" --silent 2>/dev/null && echo "ℹ️ 分支 $HEAD 没删掉，之后跑 node tools/branch_prune.mjs" || echo "🗑️ 分支 $HEAD 已不在（GitHub 合并后自动删除；恢复：git push origin $SHA:refs/heads/$HEAD）"; }
}
[ "$STATE" = open ] && [ "$BASE" = main ] && yes "PR #$N 打开着，目标 main（分支 $HEAD，提交 ${SHA:0:7}）" || no "PR #$N 状态 $STATE / 目标 $BASE / 已合并 $MERGED"
git fetch -q origin main "$HEAD" 2>/dev/null; git fetch -q --unshallow 2>/dev/null || true
git cat-file -e "$SHA^{commit}" 2>/dev/null || git fetch -q origin "$SHA" 2>/dev/null
# 11-12：闸门只认 main 上的版本。本脚本和它执行的检查在工作区里跑，分支上改过（哪怕没提交）就可能被放宽；
#   .claude/settings.json 免确认放行本脚本的前提就是这一条（tests/unit/merge_gate_integrity 守着：执行到的脚本都要在名单里）
GATE="tools/pr_merge.sh tools/merge_drift.sh tools/pr_body_check.mjs tools/decision_card.mjs tools/review_state.mjs tools/review_carry.mjs .github/CODEOWNERS"
GD=$(git diff --name-only origin/main -- $GATE 2>&1) && [ -z "$GD" ] || { echo "❌ 合并检查脚本和 origin/main 不一致（${GD:-读不到 origin/main}）：在最新 main 上跑  git checkout --detach origin/main && bash tools/pr_merge.sh $N"; exit 2; }
# 11-11（#125，所有者定）：main 前进了不一定要重合 main——只多文档、或文件完全不重叠且合并预演干净，就认 PR 上已测结果（tools/merge_drift.sh；库结构 / 闸门 / CI 永远严格）
RELAXED=0
if git merge-base --is-ancestor origin/main "$SHA" 2>/dev/null; then yes "可以快进（main 是这个提交的祖先）"
elif DR=$(bash tools/merge_drift.sh "$SHA" 2>&1); then RELAXED=1; yes "main 前进了，但$DR；改用带 sha 守卫的压缩合并（合并后 main 自己再跑一次测试兜底，红了立刻 revert）"
else no "不能快进：main 有 PR 之外的新提交（放宽没过：$DR）。在分支上  bash tools/sync_main.sh  合 main 并推分支（不用强推；分支太老没有这个脚本就  git show origin/main:tools/sync_main.sh | bash），等 PR 上的测试对新提交跑完再合并。已有的独立复核留言在「只多合并 main」时自动沿用（tools/review_carry.mjs）"; fi
# 11-07：只改 *.md 的 PR（没有任何文件会触发 tests / tests-fast 的 paths）不需要测试运行，别为文档白烧 25 分钟 Actions
CHG=$(git -c core.quotepath=off diff --name-only "$(git merge-base origin/main "$SHA" 2>/dev/null || echo origin/main)" "$SHA" 2>/dev/null)
DOCS_ONLY=0; [ -n "$CHG" ] && ! echo "$CHG" | grep -qvE '\.md$' && DOCS_ONLY=1
for W in tests-fast tests; do
  if [ "$DOCS_ONLY" = 1 ]; then yes "$W：只改了 *.md 文档，不触发测试，不需要运行记录"; continue; fi
  L=$(gh api "repos/$R/actions/runs?head_sha=$SHA&per_page=50" --jq "[.workflow_runs[]|select(.path==\".github/workflows/$W.yml\" and ((.display_title // \"\")|test(\"visual-baseline|未测：草稿\")|not))]|sort_by(.created_at)|last|\"\(.status) \(.conclusion // \"\") \(.id)\"" 2>/dev/null)
  # 11-05：最新提交只改文档时 tests-fast 的 paths 不触发，没有任何运行记录——自动手动触发一次并等它跑完（--check 只提示，不触发）
  # 没有运行记录时 jq 输出的是「null  null」（三个字段都是 null），不是「null」——11-05 因此从没自动触发过
  if [ "$W" = tests-fast ] && case "$L" in null*|"") true;; *) false;; esac; then
    if [ "$CHECK" = "--check" ]; then echo "ℹ️ tests-fast 没有运行记录：正式合并时会自动手动触发并等待"
    else
      echo "ℹ️ tests-fast 没有运行记录（最新提交没碰它的 paths），手动触发 $HEAD 并等待…"
      gh api -X POST "repos/$R/actions/workflows/tests-fast.yml/dispatches" -f ref="$HEAD" >/dev/null 2>&1 || echo "  触发失败"
      for _ in $(seq 1 58); do sleep 10
        L=$(gh api "repos/$R/actions/runs?head_sha=$SHA&per_page=50" --jq "[.workflow_runs[]|select(.path==\".github/workflows/$W.yml\" and ((.display_title // \"\")|test(\"visual-baseline|未测：草稿\")|not))]|sort_by(.created_at)|last|\"\(.status) \(.conclusion // \"\") \(.id)\"" 2>/dev/null)
        case "$L" in "completed "*) break;; esac
      done
    fi
  fi
  case "$L" in "completed success "*) yes "$W 通过（运行 ${L##* }）"; CI_IDS="$CI_IDS $W#${L##* }";; "null"*|"") no "$W：这个提交还没有运行记录";; *) no "$W：$L";; esac
done
if [ -n "$(git diff --name-only origin/main "$SHA" -- schema.sql server/migrations ':!server/migrations/_bundle.sql')" ]; then   # 11-11：_bundle.sql 是生成文件（ADR 0011），不算库结构改动
  T=$(git show -s --format=%cI "$SHA")
  D=$(gh api "repos/$R/actions/workflows/db-parity.yml/runs?per_page=5" --jq "[.workflow_runs[]|select(.created_at > \"$(date -u -d "$T" +%Y-%m-%dT%H:%M:%SZ)\")]|sort_by(.created_at)|last|\"\(.status) \(.conclusion // \"\") \(.id)\"" 2>/dev/null)
  case "$D" in "completed success "*) yes "改了数据库：db-parity 在这个提交之后通过（运行 ${D##* }）";; *) no "改了数据库：需要在这个提交之后跑 db-parity 并通过（先在正式库跑迁移）。现在：${D:-没有}";; esac
else yes "没改数据库结构，不需要 db-parity"; fi
PB=$(node tools/pr_body_check.mjs "$N" --merge 2>&1) && yes "PR 描述：入口清单 + 真机两项核对通过" || { no "PR 描述核对没过："; echo "$PB" | sed 's/^/    /'; }
ME=$(gh api user --jq .login 2>/dev/null || echo "")
case "$(echo "$CHG" | node tools/decision_card.mjs --level 2>/dev/null)" in
  owner) if [ "$ME" = SMG562 ]; then yes "改了红线文件：所有者本人合并"
    elif git show origin/main:.github/CO_OWNERS 2>/dev/null | grep -v '^#' | grep -qxF "$ME"; then AP=$(node tools/review_state.mjs approval "$N" "$SHA" 2>&1) && yes "改了红线文件：共同所有者 $ME 合并（名单在 main 的 .github/CO_OWNERS）；$AP" || no "改了红线文件：共同所有者可以点合并，但 GitHub 要求非作者的代码所有者对头提交 Approve——$AP"   # 11-13（#233 拍板）：提前读 Approve，不再等到最后被 405 拦
    else no "改了红线文件（CODEOWNERS）：只有所有者（SMG562）或共同所有者（.github/CO_OWNERS）能合，在 PR 上说明后等点头"; fi ;;
  review) PASS=$(gh api "repos/$R/issues/$N/comments" --paginate --jq '[.[]|select(.user.type!="Bot")|.body]' 2>/dev/null | node tools/review_state.mjs pass 2>/dev/null)   # 解析统一在 review_state.mjs（只认留言第一行，#201）
    if printf '%s\n' "$PASS" | grep -qx "${SHA:0:7}"; then yes "独立复核：已有「通过 ${SHA:0:7}」留言"
    elif CW=$(for o in $PASS; do r=$(node tools/review_carry.mjs "$o" "$SHA" origin/main 2>/dev/null) && { echo "沿用 $o 的复核——$r"; break; } || false; done) && [ -n "$CW" ]; then yes "独立复核：$CW"
    else no "需要独立复核：另开一个没看过本次过程的会话只读复核，在 PR 留言「独立复核：通过 ${SHA:0:7}」（写明看了什么、风险、怎么回退）"; fi ;;
  *) yes "自助合并：无红线、无需复核" ;;
esac
[ -z "$(git status --porcelain)" ] && yes "本地工作区干净" || no "本地有没提交的改动"
[ $bad = 0 ] || { echo "→ 有没满足的项，没有合并。"; exit 1; }
[ "$CHECK" = "--check" ] && { echo "→ 全部满足（--check 只核对，没有推）。"; exit 0; }
# 11-05：pre-push 闸门要本地「相关测试全绿」戳；经 PR 合并的提交已在 GitHub 对同一提交号跑过 tests-fast + tests 且 completed success（上面 ③ 已核对，走到这里即满足），
# 不再本地重跑——把运行号写进 NBQ_UNTESTED，推送时打印，事后可追溯。没有 PR 的直接推 main 仍要本地戳。
if [ "$ME" != SMG562 ] || [ "$RELAXED" = 1 ]; then
  gh api -X PUT "repos/$R/pulls/$N/merge" -f merge_method=squash -f sha="$SHA" --jq '"→ 已合并（压缩合并）：main = "+.sha[0:7]' || { echo "合并失败（可能被分支规则拦：把原因贴在 PR 上）。"; exit 1; }
  drop_branch; exit 0
fi
NBQ_UNTESTED="PR #$N CI 已绿$CI_IDS @${SHA:0:7}" git push origin "$SHA:refs/heads/main" || { echo "推送失败（不会强推）。"; exit 1; }
drop_branch
echo "→ 已快进合并：main = ${SHA:0:7}。接着：bash tools/gate.sh $SHA（等 smoke 跑完）"
