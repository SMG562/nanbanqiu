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
const run = j => spawnSync('node', [path.join(DIR, 'tools/role_guard.mjs')], { input: j, encoding: 'utf8', env: { ...process.env, NBQ_GUARD_DIR: tmp } });
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
// 11-17 第二批：大会话拒绝订阅 / 唤醒、整读大文件、收尾提问（协作者用量记录：通知回合空转 0.23–0.42M、「要我…吗」每次一个整段重读回合）
T('大会话（≥60K）拒绝订阅 PR / send_later / 唤醒；小会话放行；NBQ_NOSUB_K=0 关闭', !!G.wakeBlock('mcp__github__subscribe_pr_activity', 80000) && !!G.wakeBlock('mcp__claude-code-remote__send_later', 60000) && !G.wakeBlock('mcp__github__subscribe_pr_activity', 30000) && !G.wakeBlock('Bash', 200000) && (() => { process.env.NBQ_NOSUB_K = '0'; const r = G.wakeBlock('ScheduleWakeup', 200000); delete process.env.NBQ_NOSUB_K; return r === null })());
T('整读 >20KB 文件拒绝；带 limit / offset、小文件、图片放行', !!G.bigReadBlock('Read', { file_path: '/a/进度记录.md' }, 30000) && !G.bigReadBlock('Read', { file_path: '/a/b.md', limit: 50 }, 30000) && !G.bigReadBlock('Read', { file_path: '/a/b.md' }, 5000) && !G.bigReadBlock('Read', { file_path: '/a/x.png' }, 90000) && !G.bigReadBlock('Edit', { file_path: '/a/b.md' }, 90000));
const big = path.join(tmp, 'big.md'); fs.writeFileSync(big, 'x'.repeat(30000));
T('钩子：Read 大文件 → deny；带 limit → 放行', /"deny"/.test(run(JSON.stringify({ hook_event_name: 'PreToolUse', tool_name: 'Read', tool_input: { file_path: big } })).stdout) && !run(JSON.stringify({ hook_event_name: 'PreToolUse', tool_name: 'Read', tool_input: { file_path: big, limit: 40 } })).stdout);
const tc = path.join(tmp, 'ctx.jsonl'); fs.writeFileSync(tc, [u('c1', 90000), u('c2', 120000)].join('\n'));
T('ctxNowOf 取最后一次调用；坏路径 → 0', G.ctxNowOf(tc) === 120001 && G.ctxNowOf('/no/such') === 0);
T('钩子：大会话订阅 → deny；小会话 → 放行', /"deny"/.test(run(JSON.stringify({ hook_event_name: 'PreToolUse', tool_name: 'mcp__github__subscribe_pr_activity', tool_input: {}, transcript_path: tc, session_id: 'wk1' })).stdout) && !run(JSON.stringify({ hook_event_name: 'PreToolUse', tool_name: 'mcp__github__subscribe_pr_activity', tool_input: {}, transcript_path: path.join(tmp, 'nope') })).stdout);
T('收尾「要我…吗」提醒一次，done 后不再出', G.stopNudges({ bytes: 1, edits: [], ask: true }).some(h => h[0] === 'ask') && !G.stopNudges({ bytes: 1, edits: [], ask: true, done: new Set(['ask']) }).length);
const sr = G.stopReason({ transcript_path: tr, session_id: 's2', last_assistant_message: '做完了。要我现在合并吗？' }, { dir: tmp });
T('Stop：收尾提问被提醒', /要我/.test(sr || ''), sr);
// 11-17 第三批：命中打标签 + 机器台账（两侧互相检验闸门有效性 / 时效性的数据来源）
T('deny / 提醒都带 [nbq:种类] 标签（台账靠它数命中）', /\[nbq:poll\]/.test(G.preDecision({ tool_name: 'Bash', tool_input: { command: 'gh pr view 1' } }).hookSpecificOutput.permissionDecisionReason) && /\[nbq:bigread\]/.test(G.preDecision({ tool_name: 'Read', tool_input: { file_path: big } }).hookSpecificOutput.permissionDecisionReason) && /\[nbq:wake\]/.test(run(JSON.stringify({ hook_event_name: 'PreToolUse', tool_name: 'mcp__x__send_later', tool_input: {}, transcript_path: tc, session_id: 'wk2' })).stdout) && /\[nbq:ask\]/.test(G.stopReason({ transcript_path: tr, session_id: 's3', last_assistant_message: '要我现在合并吗？' }, { dir: tmp })));
const lj = [hu('human'), u('l1', 100000), hu('human'), u('l2', 120000), hu('task-notification'), u('l3', 130000), hu('human'), u('l4', 140000), JSON.stringify({ type: 'user', message: { content: [{ type: 'tool_result', content: '[nbq:wake] x [nbq:wake] y [nbq:bigread] z' }] } })].join('\n');
const ll = G.ledgerLine(lj, 'MDD1102', new Date('2026-11-18T01:00:00Z'));
T('台账行：固定格式、含登录名 / 日期 / 回合 / 各闸门命中；不含对话内容', /^NBQ-LEDGER v1 \| MDD1102 \| 2026-11-18 \| human=3 notif=1 \| readPerHuman=\d+ \| notifShare=\d+ \| ctxMax=140K \| asks=\d \| hits=long:0,edits:0,poll:0,wake:2,bigread:1,ask:0$/.test(ll) && !/好|要我/.test(ll), ll);
T('台账登录名被清洗（防注入）', !/[|\n<]/.test(G.ledgerLine(lj, 'a|b\n<x>').split(' | ')[1]));
// postLedger：注入假 gh，不碰网络
const calls = [], fake = (c, a) => { calls.push(a.join(' ')); return a[1] === 'user' ? { status: 0, stdout: 'MDD1102\n' } : { status: 0, stdout: '777\n' } };
const tl = path.join(tmp, 'led.jsonl'); fs.writeFileSync(tl, lj);
const L1 = G.postLedger({ transcript_path: tl, session_id: 'L1' }, { dir: tmp, run: fake });
T('postLedger：首次 POST 到台账 Issue，记下评论号；5 分钟内不重复；之后 PATCH 同一条', /^NBQ-LEDGER/.test(L1 || '') && calls.some(c => /POST repos\/SMG562\/nanbanqiu\/issues\/349\/comments/.test(c)) && G.postLedger({ transcript_path: tl, session_id: 'L1' }, { dir: tmp, run: fake }) === null && (G.postLedger({ transcript_path: tl, session_id: 'L1' }, { dir: tmp, run: fake, now: Date.now() + 600e3 }), calls.some(c => /PATCH repos\/SMG562\/nanbanqiu\/issues\/comments\/777/.test(c))), calls);
T('postLedger：NBQ_LEDGER=0 / 会话太短 / gh 失败 → 静默不写', (() => { process.env.NBQ_LEDGER = '0'; const a = G.postLedger({ transcript_path: tl, session_id: 'L2' }, { dir: tmp, run: fake }); delete process.env.NBQ_LEDGER; const sh = path.join(tmp, 'short.jsonl'); fs.writeFileSync(sh, [hu('human'), u('s1', 1000)].join('\n')); const b = G.postLedger({ transcript_path: sh, session_id: 'L3' }, { dir: tmp, run: fake }); const c = G.postLedger({ transcript_path: tl, session_id: 'L4' }, { dir: tmp, run: () => ({ status: 1, stdout: '' }) }); return a === null && b === null && c === null })());
T('唤醒类只拦第一次（用户明确要就放行）；create_trigger（新开会话的定时任务）不拦', (() => { const w = { hook_event_name: 'PreToolUse', tool_name: 'mcp__github__subscribe_pr_activity', tool_input: {}, transcript_path: tc, session_id: 'wk3' }; const a = run(JSON.stringify(w)).stdout, b = run(JSON.stringify(w)).stdout, c = run(JSON.stringify({ ...w, tool_name: 'mcp__claude-code-remote__create_trigger', session_id: 'wk4' })).stdout; return /"deny"/.test(a) && !b && !c })());
// 防漂移：护栏已接线、经验文档点名了它（改了一边忘另一边会红）
const st = JSON.parse(fs.readFileSync(path.join(DIR, '.claude/settings.json'), 'utf8')), sk = fs.readFileSync(path.join(DIR, '.claude/skills/collaborator-pitfalls/SKILL.md'), 'utf8');
T('settings.json 的 PreToolUse 还接了 Read / 订阅 / 唤醒类工具',/subscribe_pr_activity/.test(JSON.stringify(st.hooks.PreToolUse)) && /Read/.test(JSON.stringify(st.hooks.PreToolUse)));
T('settings.json 接了 PreToolUse（手写轮询拦截）和 Stop', !!(st.hooks.PreToolUse && JSON.stringify(st.hooks.PreToolUse).includes('role_guard.mjs')) && JSON.stringify(st.hooks.Stop).includes('role_guard.mjs'));
T('技能 §十 点名 token_report.mjs 与 NBQ_CTX_K', /token_report\.mjs/.test(sk) && /NBQ_CTX_K|150K/.test(sk));
T('钩子：SessionStart 注入常驻规矩', /不订阅/.test(run(JSON.stringify({ hook_event_name: 'SessionStart' })).stdout));
T('settings.json 接了 SessionStart 注入', JSON.stringify(st.hooks.SessionStart).includes('role_guard.mjs'));
const L = await import(pathToFileURL(path.join(DIR, 'tools/lib/lessons_digest.mjs')));
T('经验收集：只抓踩坑 / 教训行并去标记；重复的识别出来', (p => p.length === 2 && !/\*/.test(p[0]) && L.dupes([...p, p[0]]).length === 1)(L.pitfalls(['**踩过的坑**：A 别重踩\n无关行', '第二次出现 B'])));
T('规则体检：取 #号 / 脚本名为证据；老且没用到才算候选删除；取 #216 最近一条【规则体检】', JSON.stringify(L.ruleKeys('1. 见 #333 与 `ci_wait.sh`')) === JSON.stringify(['#333', 'ci_wait.sh']) && L.stale(40, 0) && !L.stale(40, 1) && !L.stale(10, 0) && L.latestCheck(['x', '【规则体检】旧', '闲聊', '【规则体检】新']) === '【规则体检】新' && L.latestCheck(['x']) === '');
T('技能 §十一 点名 lessons_digest.mjs 与「净增 ≤ 0」', /lessons_digest\.mjs/.test(sk) && /净增行数必须 ≤ 0/.test(sk));
console.log(`token_guard: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
