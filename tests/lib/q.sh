#!/usr/bin/env bash
# 静默运行：命令的完整输出写进日志文件，只把「结论 + 失败的那几行」回给会话（省 token）。
#   bash tests/lib/q.sh [--lines=N] [--timeout=秒] [--] <命令 参数…>
#   例：bash tests/lib/q.sh node tools/build.mjs    bash tests/lib/q.sh --lines=40 node tests/run_all.mjs --changed=origin/main
# 通过：一行「✅ 命令（用时）」+ 输出的最后一行（通常是「N passed, 0 failed」）。
# 失败：「❌ 命令 退出码 N（用时）」+ 最多 N 行（默认 30）报错行（带行号）；一行都没匹配到就给最后 N 行；
#       末尾给完整日志路径，需要更多再 `sed -n 'a,bp' 日志`，不要整份读。
# 注意：命中行原样回给会话；命令输出里若有密钥 / 令牌，它们也会进会话（日志文件权限 600，留在临时目录，需要时自己删）。
# 退出码原样透传（超时 = 124），所以可以直接接在 && 链里。不改被运行命令的任何行为。
LINES_MAX=30; TMO=0
while [ $# -gt 0 ]; do
  case "$1" in
    --lines=*) LINES_MAX="${1#--lines=}"; shift;;
    --timeout=*) TMO="${1#--timeout=}"; shift;;
    --) shift; break;;
    *) break;;
  esac
done
case "$LINES_MAX$TMO" in *[!0-9]*) echo "q.sh：--lines / --timeout 要填数字"; exit 2;; esac
[ "$LINES_MAX" -ge 1 ] 2>/dev/null || LINES_MAX=1   # --lines=0 / 空值：至少给 1 行，不能只剩一行路径
[ $# -gt 0 ] || { echo "用法：bash tests/lib/q.sh [--lines=N] [--timeout=秒] [--] <命令 参数…>"; exit 2; }
LOG=$(mktemp "${TMPDIR:-/tmp}/nbq-q.XXXXXX") || { echo "q.sh：建不了日志文件"; exit 2; }
CMD="$*"; [ "${#CMD}" -gt 70 ] && CMD="${CMD:0:67}..."
T0=$(date +%s)
if [ "$TMO" -gt 0 ] 2>/dev/null; then timeout "$TMO" "$@" >"$LOG" 2>&1; else "$@" >"$LOG" 2>&1; fi
RC=$?
DUR=$(( $(date +%s) - T0 ))
if [ "$RC" -eq 0 ]; then
  echo "✅ $CMD（${DUR}s）"
  # 最后一行非空输出，最多 160 字符
  grep -v '^[[:space:]]*$' "$LOG" | tail -n 1 | cut -c1-160
  rm -f "$LOG"
  exit 0
fi
[ "$RC" -eq 124 ] && [ "$TMO" -gt 0 ] && echo "❌ $CMD 超时（>${TMO}s，已终止）" || echo "❌ $CMD 退出码 $RC（${DUR}s）"
HITS=$(grep -nE 'FAIL|✗|✖|not ok|Error|error:|ERROR|失败|Assertion|Traceback|Cannot find|No such file|command not found' "$LOG" | head -n "$LINES_MAX" | cut -c1-300)
if [ -n "$HITS" ]; then echo "$HITS"; else tail -n "$LINES_MAX" "$LOG" | cut -c1-300; fi
echo "（完整日志 $(wc -l <"$LOG") 行：$LOG）"
exit "$RC"
