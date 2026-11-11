#!/usr/bin/env bash
# 等一个提交的 CI 跑完，并一次输出紧凑结果（11-11）。会话里不用再手写轮询循环、也不用逐个读注解——那样既费 token 又容易漏看「偶发失败」。
#   bash tools/ci_wait.sh [<提交号 | PR 号 | 运行号 | 分支名>]   默认 HEAD
#   --timeout=秒      最多等多久（默认 540，留在单次命令 10 分钟上限内；超时退出 3，再调一次接着等）
#   --no-wait         不等，只看现在的状态
# 输出：每个工作流的结论和用时（按任务起止算，重跑也准）、tests 各分片的项数（总数对不对一眼看出）、偶发失败（重跑才过的，同一条出现两次要开 Issue）、
#       失败项的报错行、最慢 5 项。退出码：0 全部成功（跳过也算）；1 有失败；3 还没跑完（超时）。
# 只用 REST（会话里 GraphQL 被拦）；注解是读取结果的唯一办法（日志 / 附件下载被拦）。
set -u
R="${NBQ_REPO:-SMG562/nanbanqiu}"; TMO=540; WAIT=1; ARG=""
for a in "$@"; do case "$a" in --timeout=*) TMO="${a#--timeout=}";; --no-wait) WAIT=0;; *) ARG="$a";; esac; done
cd "$(dirname "$0")/.."
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
