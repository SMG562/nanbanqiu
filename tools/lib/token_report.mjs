// 省 token 的「量」自动化（11-17）：读本机对话记录，自动出 §十 第 1 步那 4 个数，不再靠人问「token 用在哪」。
// 用法：node tools/lib/token_report.mjs [对话记录.jsonl]（缺省 = 本项目最新一份）。只输出数字，不含对话内容。
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const M = n => (n / 1e6).toFixed(2) + 'M', K = n => Math.round(n / 1024) + 'KB';
const ctxOf = u => (u.input_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0);
const text = c => typeof c === 'string' ? c : Array.isArray(c) ? c.filter(b => b && b.type === 'text').map(b => b.text).join('\n') : '';
const ASK = /(要我|需要我|是否|要不要|可以吗|好吗).{0,30}[吗？?]\s*$/;   // 收尾在问「要我…吗」= 多花一个完整历史重读的回合

export function analyze(jsonl) {
  const ev = []; for (const l of jsonl.split('\n')) { if (!l) continue; try { ev.push(JSON.parse(l)) } catch { } }
  const calls = new Map(); for (const o of ev) if (o.type === 'assistant' && o.message && o.message.usage) calls.set(o.message.id || o.uuid, o);   // 流式重复片段按 id 去重
  const names = new Map(), sizes = [];
  for (const o of ev) { const c = o.message && o.message.content; if (!Array.isArray(c)) continue;
    for (const b of c) { if (b.type === 'tool_use') names.set(b.id, b.name); if (b.type === 'tool_result') sizes.push([names.get(b.tool_use_id) || '?', JSON.stringify(b.content || '').length]) } }
  const turns = []; let cur = null;                                                                  // 一回合 = 一条字符串用户消息（人 / 通知）到下一条之前
  for (const o of ev) {
    if (o.type === 'user' && o.message && typeof o.message.content === 'string') { cur = { human: !!(o.origin ? o.origin.kind === 'human' : o.userType === 'external'), read: 0, calls: 0, last: '' }; turns.push(cur) }
    else if (o.type === 'assistant' && o.message && o.message.usage && cur && calls.get(o.message.id || o.uuid) === o) { cur.read += o.message.usage.cache_read_input_tokens || 0; cur.calls++; const t = text(o.message.content).trim(); if (t) cur.last = t }
  }
  const all = [...calls.values()].map(o => o.message.usage), tot = k => all.reduce((s, u) => s + (u[k] || 0), 0), read = tot('cache_read_input_tokens');
  const hum = turns.filter(t => t.human), non = turns.filter(t => !t.human);
  return { calls: all.length, turns: turns.length, human: hum.length, notif: non.length, read, create: tot('cache_creation_input_tokens'), out: tot('output_tokens'),
    ctxNow: all.length ? ctxOf(all[all.length - 1]) : 0, ctxMax: all.reduce((m, u) => Math.max(m, ctxOf(u)), 0),
    readPerHuman: hum.length ? Math.round(hum.reduce((s, t) => s + t.read, 0) / hum.length) : 0, notifRead: non.reduce((s, t) => s + t.read, 0),
    asks: turns.filter(t => ASK.test(t.last)).length, big: sizes.sort((a, b) => b[1] - a[1]).slice(0, 3) };
}
export function summary(r) {   // ≤5 行：总 token / 回合 / 最大头 / 次大头 / 建议
  if (!r.calls) return '（没有可统计的调用）';
  const share = r.read ? Math.round(r.notifRead * 100 / r.read) : 0, tt = r.read + r.create + r.out;
  const head = r.ctxNow > 150e3 ? `上下文已 ${Math.round(r.ctxNow / 1e3)}K，每次调用都重读` : r.notif > r.human ? `通知回合 ${r.notif} 个多于人类回合 ${r.human}` : r.asks ? `收尾「要我…吗」${r.asks} 次` : '无明显单项大头';
  return [`总 token ≈ ${M(tt)}（cache 读 ${Math.round(r.read * 100 / tt)}%、输出 ${Math.round(r.out * 100 / tt)}%）；调用 ${r.calls} 次，回合 ${r.turns}（人 ${r.human} / 通知 ${r.notif}）`,
    `每个人类回合 cache 读 ≈ ${M(r.readPerHuman)}；通知回合占 cache 读 ${share}%；上下文 现在 ${Math.round(r.ctxNow / 1e3)}K / 最大 ${Math.round(r.ctxMax / 1e3)}K`,
    `最大头：${head}；收尾提问 ${r.asks} 次；最大工具输出：${r.big.map(([n, s]) => n + ' ' + K(s)).join('、') || '无'}`].join('\n');
}
export function latestTranscript() {
  const base = path.join(os.homedir(), '.claude', 'projects'); let best = null;
  try { for (const d of fs.readdirSync(base)) for (const f of fs.readdirSync(path.join(base, d))) if (f.endsWith('.jsonl')) { const p = path.join(base, d, f), m = fs.statSync(p).mtimeMs; if (!best || m > best[1]) best = [p, m] } } catch { }
  return best && best[0];
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const f = process.argv[2] || latestTranscript(); if (!f) { console.log('找不到对话记录'); process.exit(0) }
  console.log(summary(analyze(fs.readFileSync(f, 'utf8'))));
}
