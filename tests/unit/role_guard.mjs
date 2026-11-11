// tools/role_guard.mjs（回复前的身份检查，Stop 钩子）。反例全部来自真实对话：11-12 会话里协作者 MDD1102 第四次被当成所有者（#160）。
// 覆盖：真实错话必拦 · 改好的话必放 · 讨论措辞（引文）不拦 · 所有者 / 读不到账号 / 已退回过一次 → 放行 · 对话记录只取最后一轮 ·
//       账号缓存 · 命令行按钩子的方式跑（stdin JSON → stdout {decision:block}）· 出错不拦人。
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawnSync } from 'node:child_process'; import { pathToFileURL } from 'node:url';
const DIR = process.argv[2] || path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const G = await import(pathToFileURL(path.join(DIR, 'tools/role_guard.mjs')));
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? 'PASS ' : 'FAIL ') + n + (!ok && x !== undefined ? ' ' + JSON.stringify(x).slice(0, 500) : '')) };
const hits = t => G.findViolations(t).map(v => v.act);

// ---- 真实的错话（11-12，原文）----
const BAD = `**需要你做的**（和之前一样，迁移多了申诉这部分）：
1. 在测试库、正式库执行迁移 \`20261114_admin_step4\`，然后再合并。
2. 等协作者账号的非草稿 PR 少于 2 个，我再把 #193 转成 Ready，跑浏览器测试。`;
T('真实错话：「需要你做的」下面写了在两库执行迁移 → 拦', hits(BAD).includes('在数据库执行迁移 / 改库'), G.findViolations(BAD));
T('真实错话：只拦第 2 行（第 3 行转 Ready 是协作者能做的）', G.findViolations(BAD).map(v => v.line).join() === '2', G.findViolations(BAD));
const BAD_OLD = `## 需要所有者做的\n1. 两库执行迁移\n\n**你来做**\n- 运行 \`bash tools/pr_merge.sh 193\`\n- 在 Cloudflare 加密钥 ADMIN_DB_URL`;
T('「你来做」下面的 pr_merge 命令和加密钥 → 各拦一条；「需要所有者做的」段落不拦', JSON.stringify(hits(BAD_OLD)) === JSON.stringify(['合并 PR', '改密钥 / 环境变量']), G.findViolations(BAD_OLD));
T('没有小标题、一行里「请 / 你」+ 所有者的事 → 拦', hits('请在正式库执行迁移。').length === 1 && hits('你先把 #193 合并进 main 吧').length === 1 && hits('- 请部署发送程序').length === 1);

// ---- 改好的话（11-12，原文）必须放行 ----
const GOOD = `**你能做的**
- **定名额**：你名下的非草稿 PR 现在有 #185、#114 两个，已到上限。想让 #193 先跑浏览器测试的话，告诉我把哪个转回草稿。不转也可以，#193 先停在草稿，等其中一个合并再转 Ready。
- **催所有者**：合并前要所有者先在两个库执行迁移，这一点已写在 #193 描述第一屏。要我现在在 #193 发一条【阻塞@SMG562】请他执行迁移吗？

**要等所有者做的**
1. 在测试库、正式库执行迁移 \`20261114_admin_step4\`，然后合并 #193（只有他能合）。
2. 在预览站真机过一遍后台各页。`;
T('改好的话：「你能做的」只有协作者的事、所有者的事放在「要等所有者做的」下 → 不拦', !hits(GOOD).length, G.findViolations(GOOD));
const META = `身份我是知道的：会话一开始，钩子就提醒了。出错是在写汇报那一刻：标题顺手写成「需要你做的」，写完没有回头核对「你」是谁。
- 我的最后一条回复里，在「你来做 / 需要你做 / 你需要」这类标题下，出现了只有所有者能做的事：正式库、测试库执行迁移、合并、部署、密钥、\`pr_merge\`。
两条都满足就退回这条回复，提示「对方是协作者，这一步要写成『等所有者 SMG562 做』」。`;
T('讨论这个检查本身（引文、提到所有者）→ 不拦', !hits(META).length, G.findViolations(META));
T('否定句：「你碰不了正式库」「迁移不用你执行」→ 不拦', !hits('你碰不了正式库和测试库的迁移。').length && !hits('**你来做**\n- 迁移不用你执行').length);
T('陈述句（不是派活）：「合并后预览站自动部署」→ 不拦', !hits('PR 合并后预览站会自动部署。').length && !hits('我已经推送到分支 fix/x，CI 在跑。').length);
T('「转给所有者：在正式库执行迁移」→ 不拦', !hits('**转给所有者**：在正式库执行迁移 X').length && !hits('- 转给所有者：合并 #193').length);
T('新小标题会结束「你」段落：之后的所有者事项不算给对方', !hits('**你能做的**\n- 留言催一下\n\n### 进度\n- #193 等合并 main').length);
T('空文本 / 非字符串不出错', !G.findViolations('').length && !G.findViolations(null).length && !G.findViolations(undefined).length);

// ---- decide ----
T('协作者 + 错话 → 退回，理由里有账号、行号、改法', /协作者 MDD1102/.test(G.decide({ login: 'MDD1102', text: BAD })) && /第 2 行/.test(G.decide({ login: 'MDD1102', text: BAD })) && /等所有者 SMG562 做/.test(G.decide({ login: 'MDD1102', text: BAD })));
T('所有者本人 → 放行（同样的话对所有者是对的）', G.decide({ login: 'SMG562', text: BAD }) === null);
T('读不到账号 → 放行（不因检查卡住会话）', G.decide({ login: '?', text: BAD }) === null && G.decide({ login: '', text: BAD }) === null);
T('已经退回过一次（stop_hook_active）→ 放行，防死循环', G.decide({ login: 'MDD1102', text: BAD, stopHookActive: true }) === null);
T('协作者 + 改好的话 → 放行', G.decide({ login: 'MDD1102', text: GOOD }) === null);

// ---- 对话记录：只取最后一轮助手的文字 ----
const J = rows => rows.map(r => JSON.stringify(r)).join('\n');
const tr = J([
  { type: 'user', message: { role: 'user', content: '旧问题' } },
  { type: 'assistant', message: { role: 'assistant', content: [{ type: 'text', text: BAD }] } },                      // 上一轮的错话：不该算进这一轮
  { type: 'user', message: { role: 'user', content: '新问题' } },
  { type: 'assistant', message: { role: 'assistant', content: [{ type: 'text', text: '先查一下' }, { type: 'tool_use', id: 't1', name: 'Bash', input: { command: 'pr_merge.sh' } }] } },
  { type: 'user', message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: 't1', content: '请在正式库执行迁移' }] } },  // 工具结果不是人说的话、也不是助手的话
  { type: 'user', isMeta: true, message: { role: 'user', content: '<system-reminder>x</system-reminder>' } },
  { type: 'assistant', message: { role: 'assistant', content: [{ type: 'text', text: GOOD }] } },
]);
const last = G.lastTurnText(tr);
T('对话记录：只取最后一条人话之后的助手文字（工具调用、工具结果、系统提示都不算）', last === '先查一下\n' + GOOD, last.slice(0, 80));
T('对话记录：坏行 / 空行不出错', G.lastTurnText('{坏的\n\n' + J([{ type: 'assistant', message: { content: [{ type: 'text', text: 'ok' }] } }])) === 'ok');

// ---- 账号缓存 ----
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rg-')), cf = path.join(tmp, 'login');
fs.writeFileSync(cf, 'MDD1102');
T('账号：6 小时内用缓存', G.ghLogin({ env: {}, cacheFile: cf, now: Date.now() }) === 'MDD1102');
T('账号：环境变量 NBQ_GH_LOGIN 优先（测试用）', G.ghLogin({ env: { NBQ_GH_LOGIN: 'SMG562' }, cacheFile: cf }) === 'SMG562');
fs.writeFileSync(cf, 'bad login!'); T('账号：缓存内容不像账号名 → 不用它；gh 也不可用 → \'?\'（放行）', G.ghLogin({ env: {}, cacheFile: cf, gh: path.join(tmp, '没有这个命令') }) === '?');
fs.writeFileSync(cf, 'MDD1102'); T('账号：缓存过期（7 小时前）→ 不用旧值', G.ghLogin({ env: {}, cacheFile: cf, now: Date.now() + 7 * 36e5, gh: path.join(tmp, '没有这个命令') }) === '?');
const fake = path.join(tmp, 'gh'); fs.writeFileSync(fake, '#!/bin/sh\necho SMG562\n'); fs.chmodSync(fake, 0o755); fs.rmSync(cf);
T('账号：没缓存 → 问 gh，并写进缓存', G.ghLogin({ env: {}, cacheFile: cf, gh: fake }) === 'SMG562' && fs.readFileSync(cf, 'utf8') === 'SMG562');

// ---- 命令行：按钩子的方式跑 ----
const run = (input, login) => spawnSync(process.execPath, [path.join(DIR, 'tools/role_guard.mjs')], { input: typeof input === 'string' ? input : JSON.stringify(input), encoding: 'utf8', env: { ...process.env, NBQ_GH_LOGIN: login }, timeout: 20000 });
const tf = path.join(tmp, 't.jsonl'); fs.writeFileSync(tf, J([{ type: 'user', message: { content: '汇报一下' } }, { type: 'assistant', message: { content: [{ type: 'text', text: BAD }] } }]));
let r = run({ transcript_path: tf, stop_hook_active: false }, 'MDD1102');
let out = (() => { try { return JSON.parse(r.stdout) } catch (_) { return null } })();
T('命令行：协作者 + 对话记录里是错话 → stdout 是 {decision:"block", reason}，退出码 0', r.status === 0 && out?.decision === 'block' && /第 2 行/.test(out.reason), [r.status, r.stdout, r.stderr]);
r = run({ last_assistant_message: BAD }, 'MDD1102'); T('命令行：钩子直接给 last_assistant_message 也认', JSON.parse(r.stdout || '{}').decision === 'block', r.stdout);
r = run({ transcript_path: tf }, 'SMG562'); T('命令行：所有者 → 不输出、退出码 0', r.status === 0 && r.stdout === '', r.stdout);
r = run({ transcript_path: tf, stop_hook_active: true }, 'MDD1102'); T('命令行：stop_hook_active → 不输出', r.status === 0 && r.stdout === '', r.stdout);
r = run('不是 JSON', 'MDD1102'); T('命令行：输入坏了 → 不拦、退出码 0', r.status === 0 && r.stdout === '', [r.status, r.stdout]);
r = run({ transcript_path: path.join(tmp, '不存在.jsonl') }, 'MDD1102'); T('命令行：对话记录不存在 → 不拦、退出码 0', r.status === 0 && r.stdout === '', [r.status, r.stdout]);
const big = path.join(tmp, 'big.jsonl'); fs.writeFileSync(big, J(Array.from({ length: 20000 }, (_, i) => ({ type: 'assistant', message: { content: [{ type: 'text', text: 'x'.repeat(300) + i } ] } }))) + '\n' + J([{ type: 'user', message: { content: '问' } }, { type: 'assistant', message: { content: [{ type: 'text', text: BAD }] } }]));
const t0 = Date.now(); r = run({ transcript_path: big }, 'MDD1102');
T('命令行：6 MB 的对话记录只读尾部，1.5 秒内出结果且照样拦', JSON.parse(r.stdout || '{}').decision === 'block' && Date.now() - t0 < 1500, [Date.now() - t0, r.stdout.slice(0, 80)]);

// ---- 钩子配置：.claude/settings.json 里真的挂上了，且用的是这个脚本 ----
const st = JSON.parse(fs.readFileSync(path.join(DIR, '.claude/settings.json'), 'utf8'));
const stops = (st.hooks?.Stop || []).flatMap(h => h.hooks || []).map(h => h.command || '');
T('.claude/settings.json 的 Stop 钩子调用 tools/role_guard.mjs', stops.some(c => /node\s+.*tools\/role_guard\.mjs/.test(c)), stops);
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
