#!/usr/bin/env bash
# 推当前分支 + 开草稿 PR（11-12）：一条命令代替「手写 git push + 手写 API 调用」——手写的长命令容易带错参数（11-12 带过强制参数，被拦下没执行）。
#   bash tools/pr_open.sh "<标题>" [正文文件]     不给正文文件 = 用 PR 模板（开完自己补）。永远是普通推送（pre-push 管着）、永远先开草稿（草稿只跑 tests-fast，Ready 由所属会话用 pr_state.sh 转）。
set -eu; cd "$(dirname "$0")/.."; R=SMG562/nanbanqiu
T="${1:?用法：bash tools/pr_open.sh \"<标题>\" [正文文件]}"; F="${2:-.github/pull_request_template.md}"; B=$(git rev-parse --abbrev-ref HEAD)
case "$B" in main|staging|HEAD) echo "不在功能分支上（当前 $B）：先 bash tools/new_branch.sh <名>"; exit 1;; esac
[ -z "$(git status --porcelain)" ] || { echo "工作区有没提交的改动：先提交"; exit 1; }
[ -f "$F" ] || { echo "找不到正文文件 $F"; exit 1; }
git push -q -u origin "$B"
U=$(gh api "repos/$R/pulls?head=${R%%/*}:$B&state=open" --jq '.[0].html_url // empty')
[ -z "$U" ] || { echo "已经有 PR：$U（分支已推送）"; exit 0; }
gh api -X POST "repos/$R/pulls" -f title="$T" -f head="$B" -f base=main -F draft=true -F body=@"$F" --jq '"✅ 草稿 PR：" + .html_url'
