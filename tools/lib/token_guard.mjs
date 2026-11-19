// 省 token 的自动护栏（11-17）：把「一会话一件事 / 别手写轮询 / 同一处改两次没好就停手」从靠人记变成脚本管。
// 由 tools/role_guard.mjs 按钩子事件分发（Stop 已接线；PreToolUse 已接线：Bash / Read / 订阅与唤醒类工具）。
// 安全阀：任何出错 / 读不到 → 放行；每种提醒每个会话只出一次（标记文件），绝不卡死会话。
import fs from 'node:fs'; import { spawnSync } from 'node:child_process'; import os from 'node:os'; import path from 'node:path'; import { analyze, summary, ASK } from './token_report.mjs';
export const PRE_SNIPPET = '"PreToolUse": [{ "matcher": "Bash", "hooks": [{ "type": "command", "command": "node \\"$CLAUDE_PROJECT_DIR/tools/role_guard.mjs\\"", "timeout": 10 }] }]';
const NOSUB = () => process.env.NBQ_NOSUB_K !== undefined ? +process.env.NBQ_NOSUB_K : 60, BIGREAD = () => (+process.env.NBQ_BIGREAD_KB || 20) * 1024;   // NBQ_NOSUB_K=0 关掉「大会话拒绝订阅/唤醒」
const WAKE = /subscribe_pr_activity|send_later|ScheduleWakeup|CronCreate/;   // 不含 create_trigger：定时任务每次新开会话，不重读本会话历史（#346 协作者先发现，我这边曾误拦）
const GDIR = () => process.env.NBQ_GUARD_DIR || os.tmpdir();
export function ctxNowOf(file) {   // 只读记录尾部 512KB，取最后一次模型调用的上下文大小（token）；出错 → 0（放行）
  try { const st = fs.statSync(file), n = Math.min(st.size, 512 << 10), fd = fs.openSync(file, 'r'); try { const b = Buffer.alloc(n); fs.readSync(fd, b, 0, n, st.size - n);
    const ls = b.toString('utf8').split('\n'); for (let i = ls.length - 1; i >= 0; i--) { if (!ls[i].includes('"usage"')) continue; try { const u = JSON.parse(ls[i]).message?.usage; if (u) return (u.input_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0) } catch { } } } finally { fs.closeSync(fd) } } catch { }
  return 0;
}
const KB = () => +process.env.NBQ_SESSION_KB || 1024, MIN_EDITS = () => +process.env.NBQ_EDIT_MIN || 4, CTX = () => +process.env.NBQ_CTX_K || 150;   // 上下文超 150K token 就该换会话（比看文件大小准）

// ① 手写轮询 / 会 403 重试的命令 → 直接拒绝并给替代品（PreToolUse）
export function pollingBlock(cmd) {
  if (typeof cmd !== 'string' || /tools\/(ci_wait|pr_state|pr_merge|gate)\.sh/.test(cmd.split(/[;&|\n]/)[0])) return null;
  if (/\bgh\s+pr\s+(view|checks|status)\b/.test(cmd)) return '`gh pr view/checks` 在这里会 403 并白白重试。查状态用 `bash tools/pr_state.sh <PR号> status`，或 `gh api repos/SMG562/nanbanqiu/pulls/<号>`；等 CI 用 `bash tools/ci_wait.sh <PR号>`。';
  if (/\b(while|until)\b[\s\S]*\b(sleep|gh|curl)\b[\s\S]*\bdone\b/.test(cmd) || /\bsleep\s+\d+[\s\S]*\bgh\s+(api|run)\b/.test(cmd) || /\bgh\s+(api|run)\b[\s\S]*\bsleep\s+\d+/.test(cmd)) return '别手写轮询循环：等 CI 用 `bash tools/ci_wait.sh [提交号|PR号]`；有 PR 订阅就推完结束本轮，事件会唤醒你。';
  return null;
}
const deny = (k, r) => ({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: `[nbq:${k}] ${r}` } });   // [nbq:种类] 标签 = 台账数命中用
// ①b 大会话里订阅 PR / 设兜底唤醒 → 每个通知回合都整段重读历史（实测 0.23–0.42M，输出只有几百 token）。大会话（≥NOSUB K）直接拒绝，给替代
export function wakeBlock(tool, ctx) {
  const k = NOSUB(); if (!k || !WAKE.test(String(tool)) || ctx < k * 1000) return null;
  return `上下文已约 ${Math.round(ctx / 1000)}K：大会话里订阅 PR / 设唤醒，每次事件都要整段重读。等 CI 用 \`bash tools/ci_wait.sh <PR号>\`（在 shell 里等，不占回合）；等复核的 PR 推完就结束本轮，复核后开小会话合并。（NBQ_NOSUB_K=0 可关）`;
}
// ①c 整读大文件（进度记录.md 等）→ 先 grep 定位，再 offset / limit 读几十行
export function bigReadBlock(tool, inp, size) {
  if (tool !== 'Read' || !inp || inp.limit || inp.offset || /\.(png|jpe?g|gif|webp|pdf)$/i.test(inp.file_path || '') || !(size > BIGREAD())) return null;
  return `${path.basename(inp.file_path)} 有 ${Math.round(size / 1024)}KB：别整读。先 grep 定位，再用 offset / limit 读相关几十行。`;
}
export function preDecision(input) {
  const tool = input.tool_name, inp = input.tool_input || {};
  if (tool === 'Bash') { const r = pollingBlock(inp.command); return r ? deny('poll', r) : null }
  if (tool === 'Read') { let size = 0; try { size = fs.statSync(inp.file_path).size } catch { } const r = bigReadBlock(tool, inp, size); return r ? deny('bigread', r) : null }
  if (WAKE.test(String(tool))) {   // 只拦第一次（协作者 #346 的设计：用户明确要就再调一次放行，不会死锁）；命中数进台账，由周体检判这样够不够
    const r = wakeBlock(tool, input.transcript_path ? ctxNowOf(input.transcript_path) : 0); if (!r) return null;
    const sid = String(input.session_id || path.basename(input.transcript_path || 'x')).replace(/[^\w-]/g, '').slice(0, 64) || 'x', m = path.join(GDIR(), `nbq-guard-${sid}-wake`);
    if (fs.existsSync(m)) return null; try { fs.writeFileSync(m, '1') } catch { }
    return deny('wake', r + '（只拦这一次：用户明确要订阅 / 唤醒，再调一次即放行）');
  }
  return null;
}

// ② 对话记录里同一文件被 Edit / Write 的次数（≥ min 的）
export function repeatedEdits(jsonl, min = 4) {
  const c = new Map(); for (const l of jsonl.split('\n')) { if (!l.includes('"tool_use"')) continue; let o; try { o = JSON.parse(l) } catch { continue }
    const m = o.message && o.message.content; if (!Array.isArray(m)) continue;
    for (const b of m) if (b && b.type === 'tool_use' && /^(Edit|Write|MultiEdit)$/.test(b.name) && b.input && b.input.file_path) c.set(b.input.file_path, (c.get(b.input.file_path) || 0) + 1) }
  return [...c].filter(([, n]) => n >= min).sort((a, b) => b[1] - a[1]);
}

// ③ Stop 时的提醒（返回理由或 null）：会话太长 → 交接换新会话；同一文件改了 ≥ N 次 → 先停手取证
export function stopNudges({ bytes, edits, done = new Set(), ctx = 0, report = '', ask = false }) {
  const out = [];
  if ((bytes > KB() * 1024 || ctx > CTX() * 1000) && !done.has('long')) out.push(['long', `${report ? '本会话用量（自动统计）：\n' + report + '\n' : ''}本会话上下文已约 ${Math.round(ctx / 1000)}K token、记录 ${Math.round(bytes / 1024)} KB：长会话每一轮都要重读全部历史，越往后越贵。把这件事收尾，然后用 ≤ 5 行写「现状 / 下一步 / 踩过的坑」（贴到对应 Issue 或 PR 评论，不另建文件），建议用户新开会话只读这段，别在这个会话里接着做下一件事。`]);
  if (edits.length && !done.has('edits')) out.push(['edits', `同一文件已改 ${edits.slice(0, 3).map(([f, n]) => `${path.basename(f)}×${n}`).join('、')} 次。如果是在排查同一个问题而它还没好：先停手，不再改——① 全局 grep 同名 / 同类写法 ② 沿祖先链往上查（根因常在祖先容器上，不在出问题的元素上）③ 列 2–3 个假设并写明怎么证伪 ④ 一次性取证（一条只读 SQL / 一张截图 / 一行日志），再动手。若只是在写新功能，忽略本条。`]);
  if (ask && !done.has('ask')) out.push(['ask', '收尾在问「要我…吗」：每问一次 = 多一个整段历史重读的回合（约 0.4–0.5M）。不是红线 / 单向门（ADR 0012）就直接做完再汇报，别问；真要所有者定的，一次问清并给推荐。']);
  return out;
}
export function stopReason(input, { dir = os.tmpdir() } = {}) {
  const f = input.transcript_path; if (!f) return null; const sid = String(input.session_id || path.basename(f)).replace(/[^\w-]/g, '').slice(0, 64) || 'x';
  const mark = k => path.join(dir, `nbq-guard-${sid}-${k}`), done = new Set(['long', 'edits', 'ask'].filter(k => fs.existsSync(mark(k))));
  const st = fs.statSync(f); let tail = ''; if (done.size < 3) { const n = Math.min(st.size, 32 << 20), fd = fs.openSync(f, 'r'); try { const b = Buffer.alloc(n); fs.readSync(fd, b, 0, n, st.size - n); tail = b.toString('utf8') } finally { fs.closeSync(fd) } }
  const r = done.has('long') || !tail ? null : analyze(tail);
  const hits = stopNudges({ bytes: st.size, edits: done.has('edits') ? [] : repeatedEdits(tail, MIN_EDITS()), done, ctx: r ? r.ctxNow : 0, report: r ? summary(r) : '', ask: !done.has('ask') && ASK.test(String(input.last_assistant_message || '').trim()) }); if (!hits.length) return null;
  for (const [k] of hits) try { fs.writeFileSync(mark(k), '1') } catch { }
  return '【省 token 提醒，只出一次】\n' + hits.map(h => `· [nbq:${h[0]}] ` + h[1]).join('\n');
}

// ④ 机器台账（11-17）：每个会话一行纯数字（无对话内容）写进 Issue #349，所有者与协作者两侧同一份代码；每周一定时任务读它，判每条闸门「有没有效 / 过没过时」。NBQ_LEDGER=0 不上报。
export const LEDGER_ISSUE = 349, HIT_KINDS = ['long', 'edits', 'poll', 'wake', 'bigread', 'ask'];
export const blockCounts = jsonl => { const m = {}; for (const [, g] of String(jsonl).matchAll(/\[nbq:block:([\w-]+)\]/g)) m[g] = (m[g] || 0) + 1; return Object.entries(m).map(([g, n]) => `${g}:${n}`).join(',') || '-' };   // 11-19（#410）：各闸门拒绝信息带 [nbq:block:<闸门名>]，这里按闸门数命中，写进台账末尾 blocks=
export function ledgerLine(jsonl, login, now = new Date()) {   // 格式固定，周任务按它解析；只含数字和登录名
  const r = analyze(jsonl), hits = HIT_KINDS.map(k => `${k}:${(jsonl.match(new RegExp(`\\[nbq:${k}\\]`, 'g')) || []).length}`).join(',');
  return `NBQ-LEDGER v1 | ${String(login).replace(/[^\w-]/g, '')} | ${now.toISOString().slice(0, 10)} | human=${r.human} notif=${r.notif} | readPerHuman=${r.readPerHuman} | notifShare=${r.read ? Math.round(r.notifRead * 100 / r.read) : 0} | ctxMax=${Math.round(r.ctxMax / 1000)}K | asks=${r.asks} | hits=${hits} | blocks=${blockCounts(jsonl)}`;
}
export function postLedger(input, { dir = os.tmpdir(), run = spawnSync, now = Date.now() } = {}) {
  try {
    if (process.env.NBQ_LEDGER === '0' || !input.transcript_path) return null;
    const sid = String(input.session_id || path.basename(input.transcript_path)).replace(/[^\w-]/g, '').slice(0, 64) || 'x', mark = path.join(dir, `nbq-guard-${sid}-ledger`);
    let id = ''; try { const st = fs.statSync(mark); if (now - st.mtimeMs < 300e3) return null; id = fs.readFileSync(mark, 'utf8').trim() } catch { }   // 每会话至多每 5 分钟写一次（同一条评论原地更新）
    const sz = fs.statSync(input.transcript_path).size, n = Math.min(sz, 32 << 20), fd = fs.openSync(input.transcript_path, 'r'); let tail; try { const b = Buffer.alloc(n); fs.readSync(fd, b, 0, n, sz - n); tail = b.toString('utf8') } finally { fs.closeSync(fd) }
    if (analyze(tail).human < 3) return null;   // 太短的会话不记，免噪音
    const who = run('gh', ['api', 'user', '--jq', '.login'], { encoding: 'utf8', timeout: 6000 }); if (who.status !== 0) return null;
    const body = ledgerLine(tail, who.stdout.trim()), base = `repos/SMG562/nanbanqiu/issues`;
    const r = id ? run('gh', ['api', '-X', 'PATCH', `${base}/comments/${id}`, '-f', `body=${body}`, '--jq', '.id'], { encoding: 'utf8', timeout: 8000 }) : run('gh', ['api', '-X', 'POST', `${base}/${LEDGER_ISSUE}/comments`, '-f', `body=${body}`, '--jq', '.id'], { encoding: 'utf8', timeout: 8000 });
    if (r.status === 0 && /^\d+$/.test(String(r.stdout).trim())) { fs.writeFileSync(mark, String(r.stdout).trim()); return body }
  } catch { }
  return null;
}
// 开会话时自动注入的常驻规矩（不放 CLAUDE.md，不占规则预算；每个会话、每个人拉到仓库就得到同一份；协作者 #346）
export const START_NOTE = '省 token 常驻规矩：①授权前置——被点名的任务按交接一路做到合并，只在红线 / 单向门才停，不以「要我开始吗/是否继续」收尾；②等复核或等 CI 的 PR：推完就结束本轮，不订阅、不设兜底唤醒；③一件事一个会话，合并或交接后换新会话；④查状态只用 pr_state.sh / ci_wait.sh / pr_merge.sh --check。';
