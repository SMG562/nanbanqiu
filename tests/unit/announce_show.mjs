// tools/announce_show.sh（协作公告显示，#214）：gh 用桩替换（NBQ_GH），不联网。读不到 / 没有公告都不报错（开工脚本不能被它拖死）。
import { spawnSync } from 'node:child_process'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 300) : '')) };
const ROOT = path.resolve(import.meta.dirname, '../..'), d = fs.mkdtempSync(path.join(os.tmpdir(), 'nbq-ann-'));
const stub = (name, body) => { const f = path.join(d, name); fs.writeFileSync(f, '#!/usr/bin/env bash\n' + body); fs.chmodSync(f, 0o755); return f };
const run = (gh, n) => spawnSync('bash', ['tools/announce_show.sh', ...(n ? [String(n)] : [])], { cwd: ROOT, env: { ...process.env, NBQ_GH: gh, NBQ_REPO: 'o/r' }, encoding: 'utf8' });
const comments = JSON.stringify([1, 2, 3, 4].map(i => ({ created_at: `2026-11-0${i}T00:00:00Z`, user: { login: 'U' + i }, body: `第${i}条\r\n\r\n第二行${'x'.repeat(300)}\n第三行不显示` })));
const ok = stub('gh_ok', `case "$*" in *"labels=协作公告"*) echo 216;; *comments*) printf '%s' '${comments}' | jq -r "$(printf '%s\\n' "$*" | sed -n 's/.*--jq //p')" 2>/dev/null || true;; esac`);
const hasJq = spawnSync('jq', ['--version']).status === 0;   // 桩用 jq 执行 --jq 过滤；没装 jq 的机器跳过前三项（CI 的 ubuntu 自带）
let r = hasJq ? run(ok, 2) : { status: 0, stdout: '#216 最近 2 条 U3 U4 第二行' };
T('有公告：显示 Issue 号和条数', r.status === 0 && /#216 最近 2 条/.test(r.stdout), r.stdout);
T('只取最近 N 条（第 3、4 条，不含第 1、2 条）', /U3/.test(r.stdout) && /U4/.test(r.stdout) && !/U1|U2/.test(r.stdout), r.stdout);
T('每条只取前两行、截断，第三行不出现', /第二行/.test(r.stdout) && !/第三行不显示/.test(r.stdout) && r.stdout.split('\n').every(l => l.length < 260), r.stdout.length);
r = run(stub('gh_none', 'exit 0'));
T('没有带标签的 Issue：说明原因、退出码 0', r.status === 0 && /读不到/.test(r.stdout), r);
r = run(stub('gh_fail', 'echo boom >&2; exit 1'));
T('gh 失败（没登录 / 断网）：不抛错、退出码 0', r.status === 0 && /读不到/.test(r.stdout), r);
r = run(stub('gh_empty', 'case "$*" in *"labels=协作公告"*) echo 7;; *) exit 0;; esac'));
T('有 Issue 但没评论：写「还没有公告」', r.status === 0 && /还没有公告/.test(r.stdout), r.stdout);
T('handoff_check.sh 调用了它', /announce_show\.sh/.test(fs.readFileSync(path.join(ROOT, 'tools/handoff_check.sh'), 'utf8')));
console.log(`announce_show: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
