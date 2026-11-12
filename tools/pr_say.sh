#!/usr/bin/env bash
# 在 PR / Issue 上留言，带去重（11-12）：同一个「标签 + 提交号 + 正文」只会发一次，不会两个会话各回一遍，也不会重复刷屏。
#   bash tools/pr_say.sh <PR或Issue号> <标签> <提交号7位|-> "<正文>"       例：bash tools/pr_say.sh 185 请转草稿 ab7d5ed "排队在 #184 后"
# 第一行自动写成【标签 提交号】；隐藏标记 nbq-say:<标签>:<提交号>:<正文哈希>。查重只看这个标记，不依赖账号（同账号的多个会话也分得出）。
set -eu
N="${1:?用法：bash tools/pr_say.sh <号> <标签> <提交号7位|-> \"<正文>\"}"; TAG="${2:?缺标签}"; SHA="${3:?缺提交号（没有写 -）}"; BODY="${4:?缺正文}"; R=SMG562/nanbanqiu
# 11-12（#201）：标签不是复核类，正文里却出现「独立复核：通过 / （提交号）：要改」句式 → 会被看板 / pr_merge 当成复核结论，拒绝发送
case "$TAG" in 独立复核*) ;; *) if printf '%s' "$BODY" | grep -qE '独立复核(：通过 *[0-9a-f]{7,40}|（[0-9a-f]{7,40}.*）(：|:))'; then echo "❌ 正文里有复核结论句式（独立复核：通过 / 独立复核（提交号）：要改），会被看板和 pr_merge 当成真复核：请换个说法，或把标签写成「独立复核…」并确实做过复核" >&2; exit 3; fi;; esac
H=$(printf '%s' "$BODY" | sha1sum | cut -c1-6); KEY="nbq-say:$TAG:$SHA:$H"
if gh api --paginate "repos/$R/issues/$N/comments?per_page=100" --jq '.[].body' | grep -qF "<!-- $KEY -->"; then echo "已经说过（$KEY），不重复发"; exit 0; fi
HEAD1="【$TAG$([ "$SHA" = - ] || echo " $SHA")】"
gh api -X POST "repos/$R/issues/$N/comments" -f body="<!-- $KEY -->
$HEAD1 $BODY" --jq .html_url
