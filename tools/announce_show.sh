#!/usr/bin/env bash
# 显示最近的「协作公告」（11-12，#214 沟通机制）：标签「协作公告」的开着的 Issue 里最近 N 条评论，每条只取前两行 + 日期。
#   bash tools/announce_show.sh [条数=3]      只读；gh 读不到时静默说明，不影响调用方（handoff_check.sh 开工时调它）
# 为什么：两边的流程变化只发在公告 Issue，会话开工自动看到，不靠聊天转达、不靠人记得去翻。
R=${NBQ_GH:-gh}; REPO=${NBQ_REPO:-SMG562/nanbanqiu}; N=${1:-3}
n=$($R api -X GET "repos/$REPO/issues" -f labels=协作公告 -f state=open -f per_page=1 --jq '.[0].number // empty' 2>/dev/null)
[ -n "$n" ] || { echo "── 协作公告：读不到（gh 未登录，或还没有带「协作公告」标签的开着的 Issue）"; exit 0; }
echo "── 协作公告（#$n 最近 $N 条；有「你要做什么」就照做，看懂了回「收到」）："
out=$($R api "repos/$REPO/issues/$n/comments?per_page=100" --jq ".[-$N:][]|\"  \\(.created_at[0:10]) \\(.user.login)：\\(.body|gsub(\"\\r\";\"\")|split(\"\\n\")|map(select(length>0))|.[0:2]|join(\" \")|.[0:170])\"" 2>/dev/null)
[ -n "$out" ] && echo "$out" || echo "  还没有公告"
