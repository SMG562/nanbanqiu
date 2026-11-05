#!/usr/bin/env bash
# 同步到用户电脑之后的「回读核对」：device_commit_files 说写成功了，不等于电脑上的文件真的是最新（11-02 就出过：rules.mjs 没换上，
# 部署了三次都是旧代码）。流程：
#   1) bash tools/sync_files.sh HEAD~1                → 得到要写的文件，调 device_commit_files
#   2) bash tools/sync_verify.sh HEAD~1 --paths       → 得到要回读的路径（每行 ≤50 个），调 device_stage_files 把电脑上的文件读回来
#   3) bash tools/sync_verify.sh HEAD~1               → 逐个比对内容，全部一致才算同步完成；有不一致会列出来并退出码 1
# 只核对发送程序要打包的文件（部署前用）：把 HEAD~1 换成 --deploy，例如  bash tools/sync_verify.sh --deploy --paths
# 环境变量：UPLOADS（回读文件落在哪，默认 /mnt/user-data/uploads/南伴球）
set -u
cd "$(dirname "$0")/.."
UP="${UPLOADS:-/mnt/user-data/uploads/南伴球}"; DEV="/Users/hanliu/Documents/南伴球"
# 11-05：--branch=<分支> [--paths] <文件…>：核对从 PR 分支同步过去的文件（见 sync_files.sh --branch）
BR=""; BFILES=()
if [ "${1#--branch=}" != "${1:-}" ]; then BR="${1#--branch=}"; shift; ACTION=verify; [ "${1:-}" = "--paths" ] && { ACTION=--paths; shift; }; BFILES=("$@"); MODE=branch; REF=""
elif [ "${1:-}" = "--deploy" ]; then MODE=deploy; REF=""; ACTION="${2:-verify}"; else MODE=diff; REF="${1:-HEAD~1}"; ACTION="${2:-verify}"; fi
list() {
  if [ "$MODE" = branch ]; then printf '%s\n' "${BFILES[@]}"
  elif [ "$MODE" = deploy ]; then node tools/worker_version.mjs --list
  else git diff --name-only -z --diff-filter=AM "$REF" HEAD | tr '\0' '\n' | grep -v '^\.github/'; fi   # .github 是受保护文件，写不进电脑，不核对
}
if [ "$ACTION" = "--paths" ]; then
  list | python3 -c "
import sys,json
fs=[x for x in sys.stdin.read().split('\n') if x]
for i in range(0,len(fs),50): print(json.dumps(['$DEV/'+x for x in fs[i:i+50]],ensure_ascii=False))"
  exit 0
fi
# 指纹：PNG 去掉 caBX 块再算（11-03 发现：传到电脑的图片会被加上约 5.7KB 的「内容凭证」caBX 块，像素数据完全相同，不算不一致）
h() { case "$1" in *.png) python3 -c "
import sys,struct,hashlib
b=open(sys.argv[1],'rb').read();i=8;o=[b[:8]]
while i<len(b):
    l=struct.unpack('>I',b[i:i+4])[0];t=b[i+4:i+8]
    if t!=b'caBX':o.append(b[i:i+12+l])
    i+=12+l
print(hashlib.sha256(b''.join(o)).hexdigest())" "$1";; *) sha256sum "$1" | cut -d' ' -f1;; esac; }
bad=(); n=0
for round in 1 2 3 4; do
  bad=(); n=0
  while IFS= read -r f; do
    [ -z "$f" ] && continue; n=$((n+1))
    if [ "$MODE" = branch ]; then git show "origin/$BR:$f" > /tmp/nbq_sv_branch 2>/dev/null; a=$(h /tmp/nbq_sv_branch); else a=$(h "$f"); fi; b=$(h "$UP/$f" 2>/dev/null)
    [ "$a" = "$b" ] || bad+=("$f")
  done < <(list)
  [ ${#bad[@]} -eq 0 ] && break
  [ $round -lt 4 ] && sleep 2      # 回读的文件有时晚一两秒才落地
done
if [ ${#bad[@]} -eq 0 ]; then echo "同步核对：$n 个文件，电脑上的内容和仓库一致 ✓"; exit 0; fi
echo "同步核对失败：$n 个文件里 ${#bad[@]} 个和仓库不一致（或还没回读）："; printf '  %s\n' "${bad[@]}"
echo "→ 用 device_commit_files 重写这几个，再回读核对；没核对通过前，不要让用户部署。"; exit 1
