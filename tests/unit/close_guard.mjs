// tools/close_guard.mjs（收尾闭环，Stop 钩子）。反例来自 11-19 真实事故：推完分支没有 @ 所有者，被用户追问才补发。
// 覆盖：未推送 / 无 PR / 缺本提交号的交接留言 → 拦，并给出命令 · 有交接留言 → 放 · main / 无新提交 / 已退回过一次 / 关闭开关 → 放。
import path from 'node:path'; import { pathToFileURL } from 'node:url';
const DIR = process.argv[2] || path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const G = await import(pathToFileURL(path.join(DIR, 'tools/lib/close_guard.mjs')));
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? 'PASS ' : 'FAIL ') + n + (!ok && x !== undefined ? ' ' + JSON.stringify(x).slice(0, 300) : '')) };
const base = { branch: 'feat-x', sha: 'abc1234', ahead: 2, pushed: true, pr: { number: 9, draft: false }, comments: [] };
const d = o => G.decide({ ...base, ...o });
T('已推送、有 PR、没有交接留言 → 拦并给 pr_say 命令', /pr_say\.sh 9 交接 abc1234/.test(d({})), d({}));
T('交接留言带别的提交号 → 仍拦', !!d({ comments: ['<!-- nbq-say:交接:zzz9999:aaaaaa -->'] }));
T('交接留言带本提交号 → 放行', d({ comments: ['<!-- nbq-say:交接:abc1234:aaaaaa --> x'] }) === null);
T('没有 PR → 拦并提示先开草稿 PR', /草稿 PR/.test(d({ pr: null })), d({ pr: null }));
T('有未推送的提交 → 拦并提示先推送', /先推送/.test(d({ pushed: false })));
T('在 main 上 → 放行', d({ branch: 'main' }) === null);
T('没有比 main 多的提交 → 放行', d({ ahead: 0 }) === null);
T('同一次停止已退回过一次 → 放行', d({ stopHookActive: true }) === null);
T('NBQ_CLOSE_GUARD=0 → 放行', d({ off: true }) === null);
console.log(`\nclose_guard: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
