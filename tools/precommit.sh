#!/usr/bin/env bash
# 提交前检查（E1，2026-10-27；E2 加规则单元测试）：拼接核对 + 代码检查 + 静态检查 + 规则单元测试，十几秒。
#   由 .githooks/pre-commit 自动调用；clone 后跑一次 `git config core.hooksPath .githooks` 启用。
#   也可以手动跑：bash tools/precommit.sh
#   只改了文档（.md 等）的提交跳过前三项，只查进度记录大小。
#   确实要跳过（比如提交一半的工作）：git commit --no-verify，并在提交信息里写原因。
cd "$(git rev-parse --show-toplevel)" || exit 1
fail=0

# 1. 改了源文件 / 拼出的 HTML，却有一部分没 add（检查的是工作区，漏 add 会让提交的和检查的不一样）
un=$(git -c core.quotePath=false diff --name-only -- src tools 南伴球_PWA.html 南伴球_Web.html)
if [ -n "$un" ]; then
  echo "提交前检查：下面这些改了但没 git add，提交的内容会和检查的不一样："; echo "$un" | sed 's/^/  /'; fail=1
fi

# 2. 只有涉及代码的提交才跑检查
staged=$(git -c core.quotePath=false diff --cached --name-only)
if echo "$staged" | grep -qE '^(src/|tools/|tests/(static|spec|lint|unit)/|南伴球_|schema\.sql|server/|sw\.js|manifest)'; then
  node tools/build.mjs --check || { echo "提交前检查：HTML 和 src 拼出来的不一样 → 跑 node tools/build.mjs 再 add"; fail=1; }
  out=$(node tests/run_all.mjs --grep=static/check,static/build,static/lint,static/persist_audit,static/action_audit,unit/ 2>&1)
  echo "$out" | grep -qE '全部通过' || { echo "$out" | grep -vE '^\s*$' | tail -15; echo "提交前检查：静态检查没过（报告见上）"; fail=1; }
fi

# 3. 进度记录保持精简（约 15KB；超过 20KB 提醒，不拦）
sz=$(wc -c < 进度记录.md)
[ "$sz" -gt 20480 ] && echo "提醒：进度记录.md 已 $((sz/1024))KB（目标约 15KB）——已完成的移到 进度记录_历史.md"

[ $fail -eq 0 ] && echo "提交前检查通过" || echo "提交被拦下。修好再提交；确实要跳过用 git commit --no-verify 并写明原因"
exit $fail
