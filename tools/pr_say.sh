#!/usr/bin/env bash
# 在 PR / Issue 上留言，带去重（11-12）：同一个「标签 + 提交号 + 正文」只会发一次，不会两个会话各回一遍，也不会重复刷屏。
#   bash tools/pr_say.sh <PR或Issue号> <标签> <提交号7位|-> "<正文>"       例：bash tools/pr_say.sh 185 请转草稿 ab7d5ed "排队在 #184 后"
# 第一行自动写成【标签 提交号】；隐藏标记 nbq-say:<标签>:<提交号>:<正文哈希>。查重只看这个标记，不依赖账号（同账号的多个会话也分得出）。
set -eu
N="${1:?用法：bash tools/pr_say.sh <号> <标签> <提交号7位|-> \"<正文>\"}"; TAG="${2:?缺标签}"; SHA="${3:?缺提交号（没有写 -）}"; BODY="${4:?缺正文}"; R=SMG562/nanbanqiu
# 11-12（#201）：标签不是复核类，正文里却出现「独立复核：通过 / （提交号）：要改」句式 → 会被看板 / pr_merge 当成复核结论，拒绝发送
case "$TAG" in 独立复核*) ;; *) if printf '%s' "$BODY" | sed $'s/）/\x01/g' | grep -qE $'独立复核(：通过 *[0-9a-f]{7,40}|（[0-9a-f]{7,40}[^\x01]*\x01(：|:))'; then echo "❌ [nbq:block:pr_say_review] 正文里有复核结论句式（独立复核：通过 / 独立复核（提交号）：要改），会被看板和 pr_merge 当成真复核。请换个说法：写「复核结论：通过」或「留复核通过留言」；只有真做过只读复核、要发正式结论时，标签写成「独立复核：通过」（会生成首行【独立复核：通过 提交号】，解析口径见 tools/review_state.mjs）" >&2; exit 3; fi;; esac
case "$TAG" in 交接*) printf '%s' "$BODY" | grep -q "预览" || echo "ℹ️ 交接留言建议贴「node tools/preview_url.mjs --contents」的输出（预览含 / 不含哪些未合并分支，#454）" >&2;; esac
H=$(printf '%s' "$BODY" | sha1sum | cut -c1-6); KEY="nbq-say:$TAG:$SHA:$H"
if gh api --paginate "repos/$R/issues/$N/comments?per_page=100" --jq '.[].body' | grep -qF "<!-- $KEY -->"; then echo "已经说过（$KEY），不重复发"; exit 0; fi
HEAD1="【$TAG$([ "$SHA" = - ] || echo " $SHA")】"
gh api -X POST "repos/$R/issues/$N/comments" -f body="<!-- $KEY -->
$HEAD1 $BODY" --jq .html_url
