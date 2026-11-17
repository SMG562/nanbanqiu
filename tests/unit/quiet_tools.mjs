// 省 token 小工具（11-17）：tests/lib/q.sh（静默运行，只回结论 + 失败行）和 handoff_check.sh --brief（精简交接）。
// 真的跑脚本：q.sh 用真命令；handoff_check 用临时仓库 + 假 gh。用法：node tests/unit/quiet_tools.mjs [仓库根目录]
import fs from 'fs'; import os from 'os'; import path from 'path'; import { spawnSync, execFileSync } from 'child_process'; import { fileURLToPath } from 'url';
const ROOT = process.argv[2] || path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 600) : '')) };
const run = (args, opts = {}) => spawnSync('bash', args, { encoding: 'utf8', cwd: ROOT, ...opts });
const Q = path.join(ROOT, 'tests/lib/q.sh');

// 1. q.sh：通过 → 一行结论 + 最后一行输出；失败 → 退出码透传 + 只给报错行
let r = run([Q, 'bash', '-c', 'for i in $(seq 1 500); do echo noise $i; done; echo "12 passed, 0 failed"']);
T('通过：退出码 0，只有 2 行（结论 + 最后一行），噪音不外泄', r.status === 0 && r.stdout.trim().split('\n').length === 2 && /^✅ /.test(r.stdout) && /12 passed, 0 failed/.test(r.stdout) && !/noise \d/.test(r.stdout), r);
r = run([Q, 'bash', '-c', 'for i in $(seq 1 300); do echo noise $i; done; echo "FAIL case_x expected 1 got 2"; for i in $(seq 1 300); do echo more $i; done; exit 7']);
T('失败：退出码原样透传', r.status === 7, r.status);
T('失败：只列报错行（带行号），不贴 600 行噪音', /❌ .*退出码 7/.test(r.stdout) && /301:FAIL case_x/.test(r.stdout) && !/noise 5\b/.test(r.stdout) && r.stdout.split('\n').length < 12, r.stdout.slice(0, 400));
const logm = r.stdout.match(/：(\/\S+nbq-q\.\S+)）/); T('失败：给出完整日志路径且文件真在', !!logm && fs.existsSync(logm[1]) && fs.readFileSync(logm[1], 'utf8').split('\n').length > 600, logm);
if (logm) fs.rmSync(logm[1], { force: true });
r = run([Q, '--lines=3', 'bash', '-c', 'for i in 1 2 3 4 5 6; do echo "Error $i"; done; exit 1']);
T('--lines=3：最多 3 行报错', r.stdout.split('\n').filter(l => /^\d+:Error/.test(l)).length === 3, r.stdout);
r = run([Q, '--lines=0', 'bash', '-c', 'echo "Error boom"; exit 1']);
T('--lines=0 → 至少给 1 行报错（复核 #331）', /1:Error boom/.test(r.stdout) && r.status === 1, r.stdout);
r = run([Q, 'bash', '-c', 'for i in 1 2 3; do echo "plain line $i"; done; exit 2']);
T('失败但没有任何报错关键词 → 退回给最后几行（不让会话两眼一抹黑）', /plain line 3/.test(r.stdout) && r.status === 2, r.stdout);
r = run([Q, '--timeout=1', 'sleep', '5']);
T('--timeout：超时终止，退出码 124', r.status === 124 && /超时/.test(r.stdout), r);
r = run([Q, 'no_such_command_xyz']);
T('命令不存在：失败而不是假通过（127）', r.status === 127 && /❌/.test(r.stdout), r);
r = run([Q]); T('没给命令 → 用法 + 退出码 2', r.status === 2 && /用法/.test(r.stdout), r);
r = run([Q, '--lines=abc', 'true']); T('--lines 非数字 → 退出码 2，不执行命令', r.status === 2, r);
r = run([Q, '--', 'bash', '-c', 'echo "a b"; exit 0']); T('-- 分隔后命令参数含空格原样传递', r.status === 0 && /a b/.test(r.stdout), r);

// 2. handoff_check.sh --brief：临时仓库 + 假 gh（不连网）
{ const d = fs.mkdtempSync(path.join(os.tmpdir(), 'nbq-handoff-')); const sh = (cwd, ...a) => execFileSync(a[0], a.slice(1), { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null' } });
  const origin = path.join(d, 'origin.git'), repo = path.join(d, 'repo'), bin = path.join(d, 'bin'); fs.mkdirSync(bin);
  sh(d, 'git', 'init', '-q', '--bare', '-b', 'main', origin); sh(d, 'git', 'clone', '-q', origin, repo);
  fs.mkdirSync(path.join(repo, 'tools')); fs.copyFileSync(path.join(ROOT, 'tools/handoff_check.sh'), path.join(repo, 'tools/handoff_check.sh')); fs.writeFileSync(path.join(repo, '进度记录.md'), 'x\n');
  sh(repo, 'git', '-c', 'user.name=t', '-c', 'user.email=t@t', 'add', '-A'); sh(repo, 'git', '-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qm', 'base'); sh(repo, 'git', 'push', '-q', 'origin', 'HEAD:main');
  // 假 gh：user → 登录名；pulls?state=open → 一个 PR；issues/65 → 带「本周」表的正文；其余 → 空
  fs.writeFileSync(path.join(bin, 'gh'), `#!/usr/bin/env bash
case "$*" in
  "api user --jq .login") echo tester;;
  *"pulls?state=open&per_page=100"*) echo "tester 1";;
  *"pulls?state=open"*) echo "  #1 feat/x：做一件事";;
  *"issues/65"*) printf '## 本周\\n\\n| 事项 | 负责人 | 完成标准 | Issue |\\n|---|---|---|---|\\n| 修登录 | tester | 实测过 | #299 |\\n\\n---\\n\\n| 旧表行 | 不该出现 |\\n';;
esac
exit 0
`, { mode: 0o755 });
  const env = { ...process.env, PATH: bin + ':' + process.env.PATH };
  const B = spawnSync('bash', [path.join(repo, 'tools/handoff_check.sh'), '--brief'], { encoding: 'utf8', env, cwd: repo });
  const lines = B.stdout.trim().split('\n');
  T('brief：退出 0，约 15 行以内', B.status === 0 && lines.length <= 15, { status: B.status, n: lines.length, err: B.stderr.slice(0, 200) });
  T('brief：身份一行（不再问身份）', /^身份：tester/.test(lines[0]) && /不再问/.test(lines[0]), lines[0]);
  T('brief：列出没合并的 PR 和在制品', /#1 feat\/x/.test(B.stdout) && /在制品.*tester 1/.test(B.stdout), B.stdout);
  T('brief：只带「本周」块里的事项行，不带表头 / 旧表', /修登录/.test(B.stdout) && !/事项 \|/.test(B.stdout) && !/旧表行/.test(B.stdout), B.stdout);
  T('brief：不含慢的全量段落（分支 / 同改文件 / 之后合并的 PR）', !/分支：|同改的文件|之后合并的 PR|之后 main 上的代码提交/.test(B.stdout), B.stdout);
  const F = spawnSync('bash', [path.join(repo, 'tools/handoff_check.sh')], { encoding: 'utf8', env, cwd: repo });
  T('不带 --brief：仍是全量输出（含「之后 main 上的代码提交」和完整身份说明）', /之后 main 上的代码提交/.test(F.stdout) && /对话里的人就是 tester 本人/.test(F.stdout) && F.stdout.split('\n').length > lines.length, F.stdout.slice(0, 300));
  // gh 全部失败（没登录 / 被拦）：brief 必须明说「不可信」，不能让「无」冒充事实（复核 #331）
  const bin2 = path.join(d, 'bin2'); fs.mkdirSync(bin2); fs.writeFileSync(path.join(bin2, 'gh'), '#!/usr/bin/env bash\nexit 1\n', { mode: 0o755 });
  const G = spawnSync('bash', [path.join(repo, 'tools/handoff_check.sh'), '--brief'], { encoding: 'utf8', env: { ...process.env, PATH: bin2 + ':' + process.env.PATH }, cwd: repo });
  T('brief：gh 失败 → 明说「读不到 / 不可信」', /gh 读不到/.test(G.stdout) && /不可信/.test(G.stdout), G.stdout);
  fs.rmSync(d, { recursive: true, force: true }); }

console.log(`\nquiet_tools: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
