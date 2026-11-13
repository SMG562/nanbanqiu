#!/usr/bin/env bash
# 改了库结构的 PR：db-parity 算不算数——唯一实现（11-13，#229 / #241；pr_merge.sh ④ 和 tools/merge_gate.mjs 都只调它，不各写一份）
#   bash tools/db_parity_since.sh <PR 提交号>     退出 0 = 算数（stdout：ok <运行号> <时间锚点>），1 = 不算（stdout：no <最近一次状态> <时间锚点>）
# 规则：db-parity 比的是测试库 vs 正式库的结构，只和库结构内容有关 → 要在「库结构文件最后一次改动」的提交时间之后跑过并通过。
#   只多合并 main（main 没动库结构）/ 改了别的文件：锚点不变，之前的 db-parity 照样算；库结构再改：锚点后移，旧的作废。
#   取不到库结构改动记录（浅克隆等）→ 退回头提交时间（原来的规则，更严）。_bundle.sql 是生成文件（ADR 0011），不算。
set -u
SHA="${1:?用法：bash tools/db_parity_since.sh <PR 提交号>}"; R=SMG562/nanbanqiu
cd "$(dirname "$0")/.."
T=$(git log -1 --format=%cI "$SHA" -- schema.sql server/migrations ':!server/migrations/_bundle.sql' 2>/dev/null); [ -n "$T" ] || T=$(git show -s --format=%cI "$SHA" 2>/dev/null)
[ -n "$T" ] || { echo "no 取不到提交$SHA -"; exit 1; }
RUNS=$(gh api "repos/$R/actions/workflows/db-parity.yml/runs?per_page=10" 2>/dev/null) || { echo "no 读不到db-parity运行记录 $T"; exit 1; }
printf '%s' "$RUNS" | T="$T" node -e '
  const t = new Date(process.env.T).toISOString(); let j; try { j = JSON.parse(require("fs").readFileSync(0, "utf8")) } catch { console.log("no 运行记录读不懂 " + process.env.T); process.exit(1) }
  const d = (j.workflow_runs || []).filter(r => r.created_at > t).sort((a, b) => a.created_at < b.created_at ? 1 : -1)[0];
  if (d && d.status === "completed" && d.conclusion === "success") { console.log(`ok ${d.id} ${process.env.T}`); process.exit(0) }
  console.log(`no ${d ? (d.status + "/" + (d.conclusion || "-")) : "没有"} ${process.env.T}`); process.exit(1)'
