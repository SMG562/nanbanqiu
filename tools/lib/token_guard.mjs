// 省 token 的自动护栏（11-17）：把「一会话一件事 / 别手写轮询 / 同一处改两次没好就停手」从靠人记变成脚本管。
// 由 tools/role_guard.mjs 按钩子事件分发（Stop 已接线；PreToolUse 要所有者在 .claude/settings.json 加一段，见 PRE_SNIPPET）。
// 安全阀：任何出错 / 读不到 → 放行；每种提醒每个会话只出一次（标记文件），绝不卡死会话。
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { analyze, summary } from './token_report.mjs';
export const PRE_SNIPPET = '"PreToolUse": [{ "matcher": "Bash", "hooks": [{ "type": "command", "command": "node \\"$CLAUDE_PROJECT_DIR/tools/role_guard.mjs\\"", "timeout": 10 }] }]';
const KB = () => +process.env.NBQ_SESSION_KB || 1024, MIN_EDITS = () => +process.env.NBQ_EDIT_MIN || 4, CTX = () => +process.env.NBQ_CTX_K || 150;   // 上下文超 150K token 就该换会话（比看文件大小准）

// ① 手写轮询 / 会 403 重试的命令 → 直接拒绝并给替代品（PreToolUse）
export function pollingBlock(cmd) {
  if (typeof cmd !== 'string' || /tools\/(ci_wait|pr_state|pr_merge|gate)\.sh/.test(cmd.split(/[;&|\n]/)[0])) return null;
  if (/\bgh\s+pr\s+(view|checks|status)\b/.test(cmd)) return '`gh pr view/checks` 在这里会 403 并白白重试。查状态用 `bash tools/pr_state.sh <PR号> status`，或 `gh api repos/SMG562/nanbanqiu/pulls/<号>`；等 CI 用 `bash tools/ci_wait.sh <PR号>`。';
  if (/\b(while|until)\b[\s\S]*\b(sleep|gh|curl)\b[\s\S]*\bdone\b/.test(cmd) || /\bsleep\s+\d+[\s\S]*\bgh\s+(api|run)\b/.test(cmd) || /\bgh\s+(api|run)\b[\s\S]*\bsleep\s+\d+/.test(cmd)) return '别手写轮询循环：等 CI 用 `bash tools/ci_wait.sh [提交号|PR号]`；有 PR 订阅就推完结束本轮，事件会唤醒你。';
  return null;
}
export function preDecision(input) {
  if (input.tool_name !== 'Bash') return null; const r = pollingBlock(input.tool_input && input.tool_input.command); if (!r) return null;
  return { hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: r } };
}

// ② 对话记录里同一文件被 Edit / Write 的次数（≥ min 的）
export function repeatedEdits(jsonl, min = 4) {
  const c = new Map(); for (const l of jsonl.split('\n')) { if (!l.includes('"tool_use"')) continue; let o; try { o = JSON.parse(l) } catch { continue }
    const m = o.message && o.message.content; if (!Array.isArray(m)) continue;
    for (const b of m) if (b && b.type === 'tool_use' && /^(Edit|Write|MultiEdit)$/.test(b.name) && b.input && b.input.file_path) c.set(b.input.file_path, (c.get(b.input.file_path) || 0) + 1) }
  return [...c].filter(([, n]) => n >= min).sort((a, b) => b[1] - a[1]);
}

// ③ Stop 时的提醒（返回理由或 null）：会话太长 → 交接换新会话；同一文件改了 ≥ N 次 → 先停手取证
export function stopNudges({ bytes, edits, done = new Set(), ctx = 0, report = '' }) {
  const out = [];
  if ((bytes > KB() * 1024 || ctx > CTX() * 1000) && !done.has('long')) out.push(['long', `${report ? '本会话用量（自动统计）：\n' + report + '\n' : ''}本会话上下文已约 ${Math.round(ctx / 1000)}K token、记录 ${Math.round(bytes / 1024)} KB：长会话每一轮都要重读全部历史，越往后越贵。把这件事收尾，然后用 ≤ 5 行写「现状 / 下一步 / 踩过的坑」（贴到对应 Issue 或 PR 评论，不另建文件），建议用户新开会话只读这段，别在这个会话里接着做下一件事。`]);
  if (edits.length && !done.has('edits')) out.push(['edits', `同一文件已改 ${edits.slice(0, 3).map(([f, n]) => `${path.basename(f)}×${n}`).join('、')} 次。如果是在排查同一个问题而它还没好：先停手，不再改——① 全局 grep 同名 / 同类写法 ② 沿祖先链往上查（根因常在祖先容器上，不在出问题的元素上）③ 列 2–3 个假设并写明怎么证伪 ④ 一次性取证（一条只读 SQL / 一张截图 / 一行日志），再动手。若只是在写新功能，忽略本条。`]);
  return out;
}
export function stopReason(input, { dir = os.tmpdir() } = {}) {
  const f = input.transcript_path; if (!f) return null; const sid = String(input.session_id || path.basename(f)).replace(/[^\w-]/g, '').slice(0, 64) || 'x';
  const mark = k => path.join(dir, `nbq-guard-${sid}-${k}`), done = new Set(['long', 'edits'].filter(k => fs.existsSync(mark(k))));
  const st = fs.statSync(f); let tail = ''; if (done.size < 2) { const n = Math.min(st.size, 32 << 20), fd = fs.openSync(f, 'r'); try { const b = Buffer.alloc(n); fs.readSync(fd, b, 0, n, st.size - n); tail = b.toString('utf8') } finally { fs.closeSync(fd) } }
  const r = done.has('long') || !tail ? null : analyze(tail);
  const hits = stopNudges({ bytes: st.size, edits: done.has('edits') ? [] : repeatedEdits(tail, MIN_EDITS()), done, ctx: r ? r.ctxNow : 0, report: r ? summary(r) : '' }); if (!hits.length) return null;
  for (const [k] of hits) try { fs.writeFileSync(mark(k), '1') } catch { }
  return '【省 token 提醒，只出一次】\n' + hits.map(h => '· ' + h[1]).join('\n');
}
