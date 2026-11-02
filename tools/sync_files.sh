#!/usr/bin/env bash
# 收尾同步到用户电脑「文稿/南伴球」：把最近一次提交（或 $1 = 某个 ref 以来）改过的文件复制到暂存目录，
# 并打印可以直接贴给 device_commit_files 的 files 数组（devicePath + stagedPath，中文名也正确）。只复制、不删除。
# 写完之后必须回读核对（tools/sync_verify.sh），commit_files 说成功不等于文件真的换了。
set -e
cd "$(dirname "$0")/.."
REF="${1:-HEAD~1}"; OUT=/mnt/user-data/outputs/sync; DEV="/Users/hanliu/Documents/南伴球"
mkdir -p "$OUT"
git diff --name-only -z --diff-filter=AM "$REF" HEAD | while IFS= read -r -d '' f; do mkdir -p "$OUT/$(dirname "$f")"; cp "$f" "$OUT/$f"; done
git diff --name-only -z --diff-filter=AM "$REF" HEAD | python3 -c "
import sys,json
fs=[x for x in sys.stdin.buffer.read().decode().split('\0') if x]
print(json.dumps([{'devicePath':'$DEV/'+x,'stagedPath':'$OUT/'+x} for x in fs],ensure_ascii=False))"
