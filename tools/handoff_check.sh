#!/usr/bin/env bash
# 新对话接手时的「记录过时检查」（11-04）：进度记录.md 可能没赶上最新进展（用户随时会开新对话）。
# 列出进度记录最后一次修改之后发生的事；任何一节非空 = 记录可能过时，先按这些事实补全认知、跟用户说清楚，再动手。
# 用法：bash tools/handoff_check.sh（需要 origin/main 有足够历史：git fetch --depth=200 origin main）
cd "$(dirname "$0")/.."
R=gh; REPO=SMG562/nanbanqiu; F=进度记录.md
# 11-10（逃逸缺陷 #160）：对话里的人默认就是 gh 账号本人（用户 11-10 明确：别再问）。给用户的步骤按这个角色写
me=$($R api user --jq .login 2>/dev/null || echo "?"); case "$me" in SMG562) role="所有者";; "?") role="未知（gh 读不到，先问）";; *) role="协作者";; esac
echo "身份：本会话 gh 账号 $me → 对话里的人就是 $me 本人（$role）。不要再问身份；给的步骤只写 $role 能做的，所有者的事直接留言到 #108（@SMG562），不让用户转达；等所有者的后续订阅那个 PR 自动接上，不让用户盯"
git fetch -q --depth=200 origin main 2>/dev/null
last=$(git log -1 --format=%H origin/main -- "$F"); when=$(git log -1 --format=%cI "$last")
# 11-12：协作者的会话常落后 main（新脚本 / 护栏没拉到）。规矩文件、脚本、钩子落后了就先拉
bh=$(git rev-list --count HEAD..origin/main -- tools .githooks CLAUDE.md docs 2>/dev/null); [ "${bh:-0}" -gt 0 ] && echo "⚠ 本地落后 origin/main：tools/ .githooks/ CLAUDE.md docs/ 有 $bh 个新提交（新脚本、护栏、规矩你还没拿到）——先 bash tools/sync_main.sh（在 main 上用 git pull --ff-only），再开工"
echo "进度记录最后更新：$(git log -1 --format='%h %ci' "$last")"
after=$(git log --format='%h %s' "$last"..origin/main -- . ':!marketing' ':!*.md' 2>/dev/null)
echo "── 之后 main 上的代码提交（不含宣传图和文档）："; [ -n "$after" ] && echo "$after" || echo "  无"
echo "── 没合并的 PR："; $R api "repos/$REPO/pulls?state=open" --jq '.[]|"  #\(.number)\(if .draft then " [草稿]" else "" end) \(.head.ref)：\(.title)"' 2>/dev/null | grep . || echo "  无"
nd=$($R api "repos/$REPO/pulls?state=open&per_page=100" --jq '[.[]|select(.draft==false and (.user.login|test("dependabot")|not))]|group_by(.user.login)|map("\(.[0].user.login) \(length)")|join("、")' 2>/dev/null); echo "── 在制品：非草稿 PR（每人上限 2；超了先清评审，不开新的）：${nd:-无}"
node tools/branch_prune.mjs --summary 2>/dev/null || echo "── 分支：读不到（gh 未登录或 git < 2.38）"
echo "── 之后合并的 PR："; $R api "repos/$REPO/pulls?state=closed&sort=updated&direction=desc&per_page=10" --jq ".[]|select(.merged_at!=null and .merged_at>\"$when\")|\"  #\(.number) \(.title)（\(.merged_at)）\"" 2>/dev/null | grep . || echo "  无"
echo "── 还在跑 / 失败 / 被取消的 CI（最近 10 次）："; $R api "repos/$REPO/actions/runs?per_page=10" --jq '.workflow_runs[]|select(.status!="completed" or (.conclusion!="success" and .conclusion!="skipped"))|"  \(.path|split("/")|last) \(.head_sha[0:7]) \(.status) \(.conclusion // "")"' 2>/dev/null | grep . || echo "  无"
echo "── 开着的 PR 之间同改的文件（要串行：先合一个，另一个再 sync_main；开工前 node tools/overlap_check.mjs 查自己的）："; node tools/overlap_check.mjs --prs 2>/dev/null || echo "  读不到"
echo "── 近 7 天协作规则 / 合并闸门的变化（仅供知悉，不代表记录过时；规则以仓库文件为准）："; git log origin/main --since='7 days ago' --format='  %h %cs %s' -- CLAUDE.md CONTRIBUTING.md 协作实践.md docs/协作分工.md 开发规矩.md tools/pr_merge.sh tools/merge_drift.sh tools/sync_main.sh 2>/dev/null | head -5 | grep . || echo "  无"
echo "（任何一节不是「无」：记录可能过时——先把这些写进进度记录，再告诉用户「记录比实际落后，以下是我根据 git / PR / CI 补上的」。）"
