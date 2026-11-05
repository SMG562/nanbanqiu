#!/usr/bin/env bash
# 收尾同步到用户电脑「文稿/南伴球」：把最近一次提交（或 $1 = 某个 ref 以来）改过的文件复制到暂存目录，
# 并打印可以直接贴给 device_commit_files 的 files 数组（devicePath + stagedPath，中文名也正确）。只复制、不删除。
# 写完之后必须回读核对（tools/sync_verify.sh），commit_files 说成功不等于文件真的换了。
# 11-03 复现：同一个暂存文件刚被 cp 覆盖后立刻 commit_files，电脑上可能拿到上一版内容（读暂存目录有延迟）。所以本脚本最后等几秒；核对不一致就再写一次。
set -e
# .github 不同步：受保护目录写不进电脑（11-04 起自动排除，清单可以直接贴给 device_commit_files）
cd "$(dirname "$0")/.."
REF="${1:-HEAD~1}"; OUT=/mnt/user-data/outputs/sync; DEV="/Users/hanliu/Documents/南伴球"
mkdir -p "$OUT"
# 11-05：给用户的操作步骤要用到「还没合并的 PR 分支」里的文件时（比如迁移 SQL、建账号工具），main 上没有、平常的同步不会带上 →
#   bash tools/sync_files.sh --branch=<分支> <文件…>   从 origin/<分支> 取这几个文件写到电脑；核对：sync_verify.sh --branch=<分支> [--paths] <文件…>
if [ "${1#--branch=}" != "$1" ]; then
  B="${1#--branch=}"; shift; [ $# -gt 0 ] || { echo "用法：sync_files.sh --branch=<分支> <文件…>"; exit 2; }
  git fetch -q origin "$B"
  for f in "$@"; do git cat-file -e "origin/$B:$f" 2>/dev/null || { echo "✗ origin/$B 里没有 $f"; exit 1; }; mkdir -p "$OUT/$(dirname "$f")"; git show "origin/$B:$f" > "$OUT/$f"; done
  printf '%s\n' "$@" | python3 -c "
import sys,json
fs=[x for x in sys.stdin.read().split('\n') if x]
print(json.dumps([{'devicePath':'$DEV/'+x,'stagedPath':'$OUT/'+x} for x in fs],ensure_ascii=False))"
  sleep 3; exit 0
fi
git diff --name-only -z --diff-filter=AM "$REF" HEAD -- . ':!.github' | while IFS= read -r -d '' f; do mkdir -p "$OUT/$(dirname "$f")"; cp "$f" "$OUT/$f"; done
git diff --name-only -z --diff-filter=AM "$REF" HEAD -- . ':!.github' | python3 -c "
import sys,json
fs=[x for x in sys.stdin.buffer.read().decode().split('\0') if x]
print(json.dumps([{'devicePath':'$DEV/'+x,'stagedPath':'$OUT/'+x} for x in fs],ensure_ascii=False))"
sleep 6   # 让暂存目录的新内容落稳，再调 device_commit_files
