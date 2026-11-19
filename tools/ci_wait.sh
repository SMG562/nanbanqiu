#!/usr/bin/env bash
# 等一个提交的 CI 跑完，并一次输出紧凑结果（11-11）。会话里不用再手写轮询循环、也不用逐个读注解——那样既费 token 又容易漏看「偶发失败」。
#   bash tools/ci_wait.sh [<提交号 | PR 号 | 运行号 | 分支名>]   默认 HEAD
#   --timeout=秒      最多等多久（默认 540，留在单次命令 10 分钟上限内；超时退出 3，再调一次接着等）
#   --no-wait         不等，只看现在的状态
#   --stuck [--min=分钟] [--max=分钟] [--say]   【11-19】排队 / 等审批看门狗：列出停在「等审批（waiting）」或「排队（pending / queued）」的运行，
#       排队的写明排在哪个运行后面；--say 发留言 @ 审批人（有 PR 发 PR，否则 #65；同一结论只发一次）。--min 默认 3，--max 默认 1440（更久的算僵尸只数个数）。
#       来历：#402 的正式库迁移排在 #399 的 staging 审批后面一直 Pending，没人知道。定时跑见 .github/workflows/queue-watch.yml；退出码 0 没卡住 / 4 有卡住。
# 输出：每个工作流的结论和用时（按任务起止算，重跑也准）、tests 各分片的项数（总数对不对一眼看出）、偶发失败（重跑才过的，同一条出现两次要开 Issue）、
#       失败项的报错行、最慢 5 项。退出码：0 全部成功（跳过也算）；1 有失败；3 还没跑完（超时）。
# 只用 REST（会话里 GraphQL 被拦）；注解是读取结果的唯一办法（日志 / 附件下载被拦）。
set -u
R="${NBQ_REPO:-${GITHUB_REPOSITORY:-SMG562/nanbanqiu}}"; TMO=540; WAIT=1; ARG=""; STUCK=0; MIN=3; MAX=1440; SAY=0
for a in "$@"; do case "$a" in --timeout=*) TMO="${a#--timeout=}";; --no-wait) WAIT=0;; --stuck) STUCK=1;; --min=*) MIN="${a#--min=}";; --max=*) MAX="${a#--max=}";; --say) SAY=1;; *) ARG="$a";; esac; done
cd "$(dirname "$0")/.."
if [ "$STUCK" = 1 ]; then
NOW=$(date +%s); FOUND=0; ZOMBIE=0
F='.workflow_runs[]|[.id,.workflow_id,.name,(.display_title|gsub("[\\t\\n]";" ")),.head_sha[0:7],.created_at,.html_url,.head_branch]|@tsv'
# 所有「还没跑起来」的运行 + 正在跑 / 等审批的（排队时找「前面是谁」用）
ALL=$(for s in waiting pending queued in_progress; do gh api "repos/$R/actions/runs?status=$s&per_page=50" --jq "$F" 2>/dev/null | sed "s/\$/\t$s/"; done)
[ -z "$ALL" ] && { echo "没有排队或等审批的运行。"; exit 0; }
age() { echo $(( (NOW - $(date -d "$1" +%s)) / 60 )); }
# 这个提交对应的 PR 号（没有就空）
prof() { gh api "repos/$R/commits/$1/pulls" --jq '.[0].number // empty' 2>/dev/null; }
say() { # 号 标签 提交 正文
  [ "$SAY" = 1 ] || return 0
  local n; n=$(prof "$3"); n="${n:-65}"
  bash "$(dirname "$0")/pr_say.sh" "$n" "$2" "$3" "$4" >/dev/null 2>&1 || true; }
while IFS=$'\t' read -r id wf name title sha created url br st; do
  case "$st" in waiting|pending|queued) ;; *) continue;; esac
  m=$(age "$created"); [ "$m" -ge "$MIN" ] || continue
  [ "$m" -le "$MAX" ] || { ZOMBIE=$((ZOMBIE+1)); continue; }
  FOUND=1
  if [ "$st" = waiting ]; then
    PD=$(gh api "repos/$R/actions/runs/$id/pending_deployments" 2>/dev/null)
    ENV=$(printf '%s' "$PD" | jq -r '[.[].environment.name]|unique|join("、")' 2>/dev/null); ENV="${ENV:-环境}"
    WHO=$(printf '%s' "$PD" | jq -r '[.[].reviewers[]?|select(.type=="User")|.reviewer.login]|unique|map("@"+.)|join(" ")' 2>/dev/null); WHO="${WHO:-@SMG562}"
    echo "⏸ #$id $name「$title」等 $ENV 审批 ${m} 分钟 → $url"
    say "$id" 等审批 "$sha" "$WHO 运行 #$id（$name：$title）在等 $ENV 环境审批，批准页 $url 。它没批之前，同一并发组里排在后面的运行都会一直 Pending；不想执行就在同一页取消它。"
  else
    # 前一个 = 同一个工作流里更早创建、还在等审批 / 在跑的运行（并发组按工作流划分，足够准确）
    AHEAD=$(echo "$ALL" | awk -F'\t' -v me="$id" -v w="$wf" -v c="$created" '$2==w && $1!=me && $6<c && ($9=="waiting"||$9=="in_progress"){print $1"("$9")"}' | head -3 | paste -sd, -)
    if [ -n "$AHEAD" ]; then
      echo "⏳ #$id $name「$title」排在 #${AHEAD} 后面 ${m} 分钟 → 它批准 / 跑完 / 取消后自动开始"
      say "$id" 排队中 "$sha" "运行 #$id（$name：$title）排在 #${AHEAD} 后面（同一并发组，一次只跑一个）；前面那个批准、跑完或取消后自动开始，不用重触发。"
    else
      echo "⏳ #$id $name「$title」$st ${m} 分钟，前面没有同组运行：可能是 Actions 平台排队，超过 15 分钟再查 githubstatus.com"
    fi
  fi
done <<< "$ALL"
[ "$ZOMBIE" -gt 0 ] && echo "ℹ️ 另有 $ZOMBIE 个超过 $((MAX/60)) 小时的排队运行（多半是永远不会跑的僵尸，可在 Actions 页批量取消，不影响合并）"
[ "$FOUND" = 0 ] && { echo "没有卡住的运行（排队 / 等审批都不到 ${MIN} 分钟）。"; exit 0; }
exit 4
fi
case "$ARG" in
  "") SHA=$(git rev-parse HEAD);;
  *[!0-9]*) SHA=$(git rev-parse "$ARG^{commit}" 2>/dev/null || git rev-parse "origin/$ARG^{commit}" 2>/dev/null) || { echo "找不到 $ARG"; exit 2; };;
  *) if [ "${#ARG}" -ge 8 ]; then SHA=$(gh api "repos/$R/actions/runs/$ARG" --jq .head_sha 2>/dev/null) || { echo "找不到运行 $ARG"; exit 2; }   # 8 位以上的纯数字 = 运行号
     else SHA=$(gh api "repos/$R/pulls/$ARG" --jq .head.sha 2>/dev/null) || { echo "找不到 PR #$ARG"; exit 2; }; fi;;
esac
runs() { gh api "repos/$R/actions/runs?head_sha=$SHA&per_page=30" --jq '.workflow_runs[]|"\(.id) \(.status) \(.name)"' 2>/dev/null; }
T0=$(date +%s)
while :; do
  L=$(runs)
  if [ -n "$L" ] && ! echo "$L" | grep -qE ' (in_progress|queued|waiting|pending|requested) '; then break; fi
  [ "$WAIT" = 0 ] && break
  if [ -z "$L" ] && [ $(( $(date +%s) - T0 )) -gt 90 ]; then echo "CI ${SHA:0:7}：90 秒内没有任何运行（这个提交可能没碰任何会触发测试的路径，如只改了 .md）"; exit 0; fi
  [ $(( $(date +%s) - T0 )) -ge "$TMO" ] && { echo "CI ${SHA:0:7}：还没跑完（已等 ${TMO}s）。再调一次接着等。"; echo "$L"; exit 3; }
  sleep 10
done
SHA="$SHA" R="$R" python3 - <<'PY'
import json, os, re, subprocess, sys, datetime as d
R, SHA = os.environ['R'], os.environ['SHA']
def gh(path, jq=None):
    c = ['gh', 'api', path] + (['--jq', jq] if jq else [])
    p = subprocess.run(c, capture_output=True, text=True); return p.stdout if p.returncode == 0 else ''
ts = lambda s: d.datetime.fromisoformat(s.replace('Z', '+00:00')).timestamp()
runs = json.loads(gh(f'repos/{R}/actions/runs?head_sha={SHA}&per_page=30') or '{"workflow_runs":[]}')['workflow_runs']
def jobs_of(r): return json.loads(gh(f"repos/{R}/actions/runs/{r['id']}/jobs?per_page=50") or '{"jobs":[]}')['jobs']
def reused_run(jobs): return bool(jobs) and any(j['name'] == 'reuse' and j['conclusion'] == 'success' for j in jobs) and all(j['conclusion'] == 'skipped' for j in jobs if j['name'] != 'reuse')
by = {}
for r in sorted(runs, key=lambda r: r['created_at']):
    k = r['path'].split('/')[-1].rsplit('.', 1)[0]   # 工作流文件名（run 的 name 在推送时是提交说明）
    r['_jobs'] = jobs_of(r); r['_reused'] = reused_run(r['_jobs'])
    # 同一工作流：优先显示真正跑过测试的最新一次；只有「复用」的才显示复用（PR 上跑过、合并后 main 复用——要看的是 PR 上那次）
    if k not in by or not r['_reused'] or by[k]['_reused']: by[k] = r
bad = 0; slow = []; lines = []; notes = []
for name, r in sorted(by.items()):
    jobs = r['_jobs']
    js = [j for j in jobs if j.get('started_at') and j.get('completed_at')]
    dur = int(max(ts(j['completed_at']) for j in js) - min(ts(j['started_at']) for j in js)) if js else 0
    concl = r['conclusion'] or r['status']
    ok = concl in ('success', 'skipped'); bad += 0 if ok else 1
    shards = []; flaky = []
    for j in jobs:
        if not j.get('id') or j['conclusion'] in (None, 'skipped') or j['name'] in ('reuse',): continue
        for a in json.loads(gh(f"repos/{R}/check-runs/{j['id']}/annotations?per_page=60") or '[]'):
            t, m = a.get('title') or '', a.get('message') or ''
            if t == '测试结果' and j['name'].startswith('test ('):
                n = re.match(r'(\d+) 项，失败 (\d+)', m); shards.append((j['name'], int(n.group(1)) if n else 0, int(n.group(2)) if n else 0))
            elif t.startswith('偶发失败'): flaky.append(f"{j['name']}: {m[:160]}")
            elif t == '用时最长': slow += [(int(x.group(2)), x.group(1)) for x in re.finditer(r'([^\s、；]+) (\d+)s', m.split('；')[0])]
            elif a['annotation_level'] == 'failure' and not ok: notes.append(f"  ✗ {j['name']} · {t}: {m[:240]}")
    extra = ''
    if shards:
        extra = f"  分片 {len(shards)}：{'+'.join(str(s[1]) for s in sorted(shards))}={sum(s[1] for s in shards)} 项" + (f"，失败 {sum(s[2] for s in shards)}" if any(s[2] for s in shards) else '')
    reused = r['_reused']
    lines.append(f"{'✅' if ok else '❌'} {name:<13} {concl:<9} {dur:>4}s{extra}{'  （复用同一提交已通过的结果，没重跑）' if reused else ''}")
    for f in flaky: lines.append(f"   ⚠ 偶发失败（重跑才过）{f}")
print(f"CI {SHA[:7]}（{len(by)} 个工作流）")
print('\n'.join(lines))
if notes: print('\n'.join(notes[:12]))
if slow: print('最慢：' + '、'.join(f"{n} {s}s" for s, n in sorted(slow, reverse=True)[:5]))
sys.exit(1 if bad else 0)
PY
