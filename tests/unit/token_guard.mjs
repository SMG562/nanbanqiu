// tools/lib/token_guard.mjs（省 token 自动护栏）+ overlap_check --dup 的纯函数。反例来自 11-11~17 的真实重复劳动。
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawnSync } from 'node:child_process'; import { pathToFileURL } from 'node:url';
const DIR = process.argv[2] || path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const G = await import(pathToFileURL(path.join(DIR, 'tools/lib/token_guard.mjs'))), O = await import(pathToFileURL(path.join(DIR, 'tools/overlap_check.mjs')));
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? 'PASS ' : 'FAIL ') + n + (!ok && x !== undefined ? ' ' + JSON.stringify(x).slice(0, 300) : '')) };
// 手写轮询 / gh pr view 拦；正规脚本放行
T('gh pr view 拦', !!G.pollingBlock('gh pr view 314 --json state'));
T('手写 until 轮询拦', !!G.pollingBlock('until gh api repos/a/b/pulls/1 --jq .merged; do sleep 20; done'));
T('while sleep gh run 拦', !!G.pollingBlock('while true; do gh run list; sleep 30; done'));
T('ci_wait.sh / pr_state.sh / pr_merge.sh 放行', !G.pollingBlock('bash tools/ci_wait.sh 314') && !G.pollingBlock('bash tools/pr_state.sh 314 status') && !G.pollingBlock('bash tools/pr_merge.sh --check 314'));
T('普通 gh api / git 命令放行', !G.pollingBlock('gh api repos/SMG562/nanbanqiu/pulls/314') && !G.pollingBlock('git status && git log -3'));
T('非 Bash 工具不管；Bash 命中给 deny', G.preDecision({ tool_name: 'Read', tool_input: {} }) === null && G.preDecision({ tool_name: 'Bash', tool_input: { command: 'gh pr view 1' } }).hookSpecificOutput.permissionDecision === 'deny');
// 同一文件反复改
const ev = (f, n) => Array.from({ length: n }, () => JSON.stringify({ type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Edit', input: { file_path: f } }] } })).join('\n');
const jl = ev('/x/a.css', 4) + '\n' + ev('/x/b.js', 2) + '\nnot json "tool_use"\n';
T('同一文件 ≥4 次才算；坏行不崩', JSON.stringify(G.repeatedEdits(jl)) === JSON.stringify([['/x/a.css', 4]]), G.repeatedEdits(jl));
T('提醒：长会话 / 反复改各一条，done 的不再出', G.stopNudges({ bytes: 5e6, edits: [['/x/a.css', 4]] }).length === 2 && G.stopNudges({ bytes: 5e6, edits: [['/x/a.css', 4]], done: new Set(['long', 'edits']) }).length === 0 && G.stopNudges({ bytes: 1000, edits: [] }).length === 0);
// Stop：只出一次
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tg-')), tr = path.join(tmp, 't.jsonl'); fs.writeFileSync(tr, jl);
const i = { transcript_path: tr, session_id: 's1' };
T('第一次 Stop 提醒、第二次放行', /反复|同一文件/.test(G.stopReason(i, { dir: tmp }) || '') && G.stopReason(i, { dir: tmp }) === null);
// 命令行按钩子方式：PreToolUse deny；坏输入不崩不拦
const run = j => spawnSync('node', [path.join(DIR, 'tools/role_guard.mjs')], { input: j, encoding: 'utf8' });
T('钩子：PreToolUse gh pr view → deny JSON', /"deny"/.test(run(JSON.stringify({ hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: 'gh pr view 3' } })).stdout));
T('钩子：垃圾输入 → 退出 0 无输出', (r => r.status === 0 && !r.stdout)(run('{bad')));
// 查重
const items = [{ tag: '开着 #281', text: 'ci_wait 提示 修复 fix-ci-wait' }, { tag: 'main abc1234', text: '头像上传' }];
T('--dup 按关键词命中（不分大小写、短词忽略）', O.dupHits(['CI_WAIT'], items).length === 1 && O.dupHits(['x'], items).length === 0 && O.dupHits(['头像'], items)[0].tag.startsWith('main'));
// 用量统计（自动出 §十 第 1 步的数）+ 按上下文大小提醒
const R = await import(pathToFileURL(path.join(DIR, 'tools/lib/token_report.mjs')));
const u = (id, read) => JSON.stringify({ type: 'assistant', uuid: id, message: { id, content: [{ type: 'text', text: id === 'a3' ? '要我现在开始吗？' : '好' }], usage: { input_tokens: 1, cache_read_input_tokens: read, cache_creation_input_tokens: 0, output_tokens: 10 } } });
const hu = k => JSON.stringify({ type: 'user', origin: k ? { kind: k } : undefined, message: { role: 'user', content: 'x' } });
const rep = R.analyze([hu('human'), u('a1', 100000), u('a1', 100000), hu('task-notification'), u('a2', 200000), hu('human'), u('a3', 160000)].join('\n'));
T('统计：流式重复按 id 去重；人 / 通知回合分开；收尾提问计数', rep.calls === 3 && rep.human === 2 && rep.notif === 1 && rep.asks === 1 && rep.read === 460000 && rep.notifRead === 200000 && rep.ctxNow === 160001, rep);
T('摘要 ≤5 行、不含对话内容', R.summary(rep).split('\n').length <= 5 && !/要我现在/.test(R.summary(rep)));
T('上下文 > 150K 就提醒（哪怕文件不大），并带自动统计', (h => h.length === 1 && /自动统计/.test(h[0][1]))(G.stopNudges({ bytes: 1000, edits: [], ctx: 160000, report: 'r' })) && G.stopNudges({ bytes: 1000, edits: [], ctx: 100000 }).length === 0);
// 防漂移：护栏已接线、经验文档点名了它（改了一边忘另一边会红）
const st = JSON.parse(fs.readFileSync(path.join(DIR, '.claude/settings.json'), 'utf8')), sk = fs.readFileSync(path.join(DIR, '.claude/skills/collaborator-pitfalls/SKILL.md'), 'utf8');
T('settings.json 接了 PreToolUse（手写轮询拦截）和 Stop', !!(st.hooks.PreToolUse && JSON.stringify(st.hooks.PreToolUse).includes('role_guard.mjs')) && JSON.stringify(st.hooks.Stop).includes('role_guard.mjs'));
T('技能 §十 点名 token_report.mjs 与 NBQ_CTX_K', /token_report\.mjs/.test(sk) && /NBQ_CTX_K|150K/.test(sk));
// 订阅 / 兜底唤醒：大上下文拦一次，再调放行；小上下文不管
const big = JSON.stringify({ type: 'assistant', message: { id: 'z', usage: { input_tokens: 1, cache_read_input_tokens: 120000, output_tokens: 5 } } }), small = big.replace('120000', '20000');
const wt = (f, c) => { fs.writeFileSync(f, c); return { tool_name: 'mcp__claude-code-remote__subscribe_pr_activity', transcript_path: f, session_id: 'w' + path.basename(f) } };
const wb = wt(path.join(tmp, 'wb.jsonl'), big), ws = wt(path.join(tmp, 'ws.jsonl'), small);
T('订阅：上下文 ≥100K 拦一次、再调放行；<100K 不拦；其他工具不拦', /deny/.test(JSON.stringify(G.watchDecision(wb, { dir: tmp }))) && G.watchDecision(wb, { dir: tmp }) === null && G.watchDecision(ws, { dir: tmp }) === null && G.watchDecision({ ...wb, tool_name: 'Read' }, { dir: tmp }) === null);
T('新开会话的定时任务不拦', G.watchDecision({ ...wb, tool_name: 'mcp__claude-code-remote__create_trigger', session_id: 'n1', tool_input: { create_new_session_on_fire: true } }, { dir: tmp }) === null);
T('钩子：SessionStart 注入常驻规矩', /不订阅/.test(run(JSON.stringify({ hook_event_name: 'SessionStart' })).stdout));
T('settings.json 接了订阅拦截与 SessionStart 注入', /subscribe_pr_activity/.test(JSON.stringify(st.hooks.PreToolUse)) && JSON.stringify(st.hooks.SessionStart).includes('role_guard.mjs'));
const L = await import(pathToFileURL(path.join(DIR, 'tools/lib/lessons_digest.mjs')));
T('经验收集：只抓踩坑 / 教训行并去标记；重复的识别出来', (p => p.length === 2 && !/\*/.test(p[0]) && L.dupes([...p, p[0]]).length === 1)(L.pitfalls(['**踩过的坑**：A 别重踩\n无关行', '第二次出现 B'])));
T('技能 §十一 点名 lessons_digest.mjs 与「净增 ≤ 0」', /lessons_digest\.mjs/.test(sk) && /净增行数必须 ≤ 0/.test(sk));
console.log(`token_guard: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
