#!/usr/bin/env bash
# 新对话接手时的「记录过时检查」（11-04）：进度记录.md 可能没赶上最新进展（用户随时会开新对话）。
# 列出进度记录最后一次修改之后发生的事；任何一节非空 = 记录可能过时，先按这些事实补全认知、跟用户说清楚，再动手。
# 用法：bash tools/handoff_check.sh（需要 origin/main 有足够历史：git fetch --depth=200 origin main）
cd "$(dirname "$0")/.."
R=gh; REPO=SMG562/nanbanqiu; F=进度记录.md
# 11-10（逃逸缺陷）：gh 账号 = AI 用的权限，不等于对话里的人。给用户写「你要做的」之前，先按这一行确认对方是谁、各步归谁
me=$($R api user --jq .login 2>/dev/null || echo "?"); case "$me" in SMG562) role="所有者";; "?") role="未知（gh 读不到，先问）";; *) role="协作者";; esac
echo "身份：本会话 gh 账号 $me → AI 按「$role」权限做事。对话里的人是谁没说过就先问；给的步骤逐条标「所有者做 / 协作者做」"
git fetch -q --depth=200 origin main 2>/dev/null
last=$(git log -1 --format=%H origin/main -- "$F"); when=$(git log -1 --format=%cI "$last")
echo "进度记录最后更新：$(git log -1 --format='%h %ci' "$last")"
after=$(git log --format='%h %s' "$last"..origin/main -- . ':!marketing' ':!*.md' 2>/dev/null)
echo "── 之后 main 上的代码提交（不含宣传图和文档）："; [ -n "$after" ] && echo "$after" || echo "  无"
echo "── 没合并的 PR："; $R api "repos/$REPO/pulls?state=open" --jq '.[]|"  #\(.number)\(if .draft then " [草稿]" else "" end) \(.head.ref)：\(.title)"' 2>/dev/null | grep . || echo "  无"
nd=$($R api "repos/$REPO/pulls?state=open&per_page=100" --jq '[.[]|select(.draft==false and (.user.login|test("dependabot")|not))]|length' 2>/dev/null); echo "── 在制品：非草稿 PR ${nd:-?} 个（上限 2；超了先清评审，不开新的）"
node tools/branch_prune.mjs --summary 2>/dev/null || echo "── 分支：读不到（gh 未登录或 git < 2.38）"
echo "── 之后合并的 PR："; $R api "repos/$REPO/pulls?state=closed&sort=updated&direction=desc&per_page=10" --jq ".[]|select(.merged_at!=null and .merged_at>\"$when\")|\"  #\(.number) \(.title)（\(.merged_at)）\"" 2>/dev/null | grep . || echo "  无"
echo "── 还在跑 / 失败 / 被取消的 CI（最近 10 次）："; $R api "repos/$REPO/actions/runs?per_page=10" --jq '.workflow_runs[]|select(.status!="completed" or (.conclusion!="success" and .conclusion!="skipped"))|"  \(.path|split("/")|last) \(.head_sha[0:7]) \(.status) \(.conclusion // "")"' 2>/dev/null | grep . || echo "  无"
echo "（任何一节不是「无」：记录可能过时——先把这些写进进度记录，再告诉用户「记录比实际落后，以下是我根据 git / PR / CI 补上的」。）"
