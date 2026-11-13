#!/usr/bin/env bash
# 提交前检查（E1，2026-10-27；E2 加规则单元测试）：拼接核对 + 代码检查 + 静态检查 + 规则单元测试，十几秒。
#   由 .githooks/pre-commit 自动调用；clone 后跑一次 `git config core.hooksPath .githooks` 启用。
#   也可以手动跑：bash tools/precommit.sh
#   只改了文档（.md 等）的提交跳过前三项，只查进度记录大小。
#   确实要跳过（比如提交一半的工作）：git commit --no-verify，并在提交信息里写原因。
cd "$(git rev-parse --show-toplevel)" || exit 1
fail=0

# 0. 合并状态丢了（11-13 逃逸：解完冲突后 git stash / 切分支，MERGE_HEAD 没了，main 的改动被当成普通提交）：
#    不在合并中、main 也不是 HEAD 的祖先，暂存区却把 main 新改过的文件改成了 main 的版本 → 拦（看内容不看提交信息）
if [ ! -f "$(git rev-parse --git-path MERGE_HEAD)" ] && git rev-parse -q --verify origin/main >/dev/null && ! git merge-base --is-ancestor origin/main HEAD 2>/dev/null && mb=$(git merge-base HEAD origin/main 2>/dev/null); then
  lost=$(git -c core.quotePath=false diff --cached --name-only | while IFS= read -r f; do m=$(git rev-parse -q --verify "origin/main:$f" 2>/dev/null)
    [ "$(git rev-parse -q --verify ":$f" 2>/dev/null)" = "$m" ] && [ "$(git rev-parse -q --verify "$mb:$f" 2>/dev/null)" != "$m" ] && echo "$f"; done)
  [ -z "$lost" ] || { echo "提交前检查：这些文件被改成了 main 上的版本，但这次提交不是合并（合并状态丢了，多半是解冲突后用了 git stash / 切了分支）："; echo "$lost" | head -5 | sed 's/^/  /'
    echo "  重来：git reset --hard HEAD && git merge origin/main，冲突照刚才的解；合并没提交前不要 stash / checkout / switch，看 main 的文件用 git show origin/main:<文件>"; fail=1; }
fi

# 1. 改了源文件，却有一部分没 add（检查的是工作区，漏 add 会让提交的和检查的不一样）
un=$(git -c core.quotePath=false diff --name-only -- src tools)
if [ -n "$un" ]; then
  echo "提交前检查：下面这些改了但没 git add，提交的内容会和检查的不一样："; echo "$un" | sed 's/^/  /'; fail=1
fi

# 2. 只有涉及代码的提交才跑检查
staged=$(git -c core.quotePath=false diff --cached --name-only)
if echo "$staged" | grep -qE '^(src/|tools/|tests/(static|spec|lint|unit)/|南伴球_|schema\.sql|server/|sw\.js|manifest)'; then
  node tools/build.mjs >/dev/null || { node tools/build.mjs | tail -5; echo "提交前检查：src 拼不出 HTML（上面是原因，多半是新文件没写进 list）"; fail=1; }   # ADR 0011：HTML 不入库，这里只验证能拼
  out=$(node tests/run_all.mjs --grep=static/check,static/build,static/lint,static/persist_audit,static/action_audit,static/input_audit,static/migration_audit,static/doc_budget,unit/ 2>&1)
  echo "$out" | grep -qE '全部通过' || { echo "$out" | grep -vE '^\s*$' | tail -15; echo "提交前检查：静态检查没过（报告见上）"; fail=1; }
fi

# 2b. 核心文档体量预算（改文档的提交也查；超了拆分 / 精简，不是调高上限）
if echo "$staged" | grep -qE '\.md$|tests/spec/doc_budget\.json'; then
  node tools/doc_budget.mjs | grep -E '^(❌|⚠|doc_budget)' ; node tools/doc_budget.mjs >/dev/null || { echo "提交前检查：文档超预算（见上）"; fail=1; }
fi

# 3. 进度记录保持精简（约 15KB；超过 20KB 提醒，不拦）
sz=$(wc -c < 进度记录.md)
[ "$sz" -gt 20480 ] && echo "提醒：进度记录.md 已 $((sz/1024))KB（目标约 15KB）——已完成的移到 进度记录_历史.md"

[ $fail -eq 0 ] && echo "提交前检查通过" || echo "提交被拦下。修好再提交；确实要跳过用 git commit --no-verify 并写明原因"
exit $fail
