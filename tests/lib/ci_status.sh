#!/usr/bin/env bash
# 看 GitHub 上最近一次自动测试的结果（会话里用：日志和附件下载被拦，只能读注解）
#   bash tests/lib/ci_status.sh          最近一次
#   bash tests/lib/ci_status.sh <run id> 指定那次
R=SMG562/nanbanqiu
ID=${1:-$(gh run list -R $R --workflow tests --limit 1 --json databaseId -q '.[0].databaseId')}
gh run view "$ID" -R $R --json status,conclusion,headSha,displayTitle,createdAt,updatedAt -q '"run \(.headSha[0:7]) \(.status) \(.conclusion // "") · \(.displayTitle) · \(.createdAt) → \(.updatedAt)"'
# 一次运行可能有两个任务（11-04 起：reuse 判断是否复用 + test 真正跑测试），每个任务的注解都读
for JOB in $(gh run view "$ID" -R $R --json jobs -q '.jobs[].databaseId'); do
  gh api "repos/$R/check-runs/$JOB/annotations" -q '.[] | select(.title != "") | "\(.annotation_level) \(.title)：\(.message)"'
done
