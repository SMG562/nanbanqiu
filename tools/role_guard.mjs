#!/usr/bin/env node
// 回复前的身份检查（11-12，#160 第四次；逃逸缺陷「给用户的待办默认对方是所有者」）——Claude Code 的 Stop 钩子调用。
// 规则：本会话 gh 账号不是 SMG562 时：协作者——全部检查；共同所有者（main 上 .github/CO_OWNERS，11-13 起）——只查仍只有 SMG562 能做的（推 main）。
//      协作者时，回复里「写给对方做」的地方不能出现只有所有者能做的事
//      （在正式库 / 测试库执行迁移、合并 PR、推 main、部署、改密钥、改 .claude / CODEOWNERS / 分支保护）。
//      这些事要写成「等所有者 SMG562 做」「转给所有者：…」。命中 → 退回这条回复并说明哪一行、怎么改。
// 怎么判断「写给对方做」：
//   ① 小标题（# 标题、整行加粗、以冒号结尾的短行）里有「你 / 待办」类字眼 → 这一段都是给对方的，直到下一个小标题；
//      小标题里有「所有者 / SMG562 / 转给」→ 这一段是写给所有者的，不查。
//   ② 不在上面两种段落里：单独一行同时有「你 / 请」和所有者的事，也算。
//   每一行：提到所有者 / SMG562、或有否定（不能 / 碰不了 / 不用 …）的不算；「」里的引文不算（在讨论措辞，不是在派活）。
// 安全阀（绝不因为这个检查把会话卡死）：读不到账号 / 是所有者 / 出任何错 → 放行；同一次停止只退回一次（stop_hook_active）。
// 用法：钩子里 `node tools/role_guard.mjs`（stdin = 钩子 JSON）；测试直接 import 下面的纯函数（tests/unit/role_guard.mjs）。
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { execFileSync } from 'node:child_process'; import { fileURLToPath } from 'node:url';

export const OWNER_LOGIN = 'SMG562';
// 接入方式（.claude/ 是所有者的文件，由所有者加）：.claude/settings.json 的 hooks 里加下面这一段（和 SessionStart 并列）。测试核对它能解析、指向本脚本
export const HOOK_SNIPPET = '"Stop": [{ "hooks": [{ "type": "command", "command": "node \\"$CLAUDE_PROJECT_DIR/tools/role_guard.mjs\\"", "timeout": 15 }] }]';
// 只有所有者能做的事（CLAUDE.md「仅所有者」+ CONTRIBUTING：正式库 / 部署 / 密钥 / 合并 / 推 main / 红线文件）
const OWNER_ACT = [
  [/(执行|跑|运行|应用)\s*(这个|这次|那个)?\s*迁移|迁移.{0,12}(执行|跑一?下|运行)|(正式库|测试库|生产库|两个库|两库|staging\s*库|Supabase).{0,16}(执行|跑|运行|建|改|删)|migrations?\b.{0,16}(prod|production|正式|生产)/, '在数据库执行迁移 / 改库'],
  [/(合并|合进|merge)\s*(#\d+|PR|pr|main|这个\s*PR|进\s*main)|(合并|合|merge)\s*(到|进|into)\s*main|点.{0,6}(merge|合并)|(merge|合并)\s*按钮|pr_merge|sync_main/, '合并 PR'],   // 11-13 补漏：「把 PR 合并到 main」「点 merge 按钮」
  [/推\s*main|push\b.{0,60}?(\bmain\b|:main\b)|直推/, '推 main', true],                     // 11-13：`git push origin HEAD:main` 这种中间隔得远的也算                                      // true = 共同所有者也不能做（只有 SMG562）
  // 11-13 收窄（复核 ① 误拦）：只认「去做部署」这个动作——请 / 去 / 你 + 部署、部署 + 对象、重新部署；「部署日志 / 计划 / 记录」「合并后自动部署」这类陈述不算
  [/(请|去|你)\S{0,4}(重新)?部署(?!日志|记录|状态|计划|结果|链接|地址|情况)|(重新|执行|手动)部署|部署(一下|发送程序|到正式|正式站|worker)|发送程序.{0,6}部署|deploy_notify|wrangler\s+deploy/, '部署'],
  [/密钥|Secrets?\b|ADMIN_DB_URL|DB_URL|环境变量.{0,6}(加|设|改)/, '改密钥 / 环境变量'],
  [/分支保护|CODEOWNERS|\.claude\/settings/, '改红线配置'],
];
const READER = /你来做|需要你|你需要|你要做|你可以做|你能做|你做的|请你|你的待办|待办|你的下一步|下一步[（(]你|给你的|交给你/;
const OWNER_MARK = /所有者|SMG562|owner|转给|请他|让他|由他|他来|他会|他点/i;          // 「请他私下交给你」：句里有「你」，但做事的是「他」
const DONE = /已经?(合并|合进|部署|执行|跑完|跑过)|(合并|合进|部署|执行)(了|过|完)/;            // 陈述已发生的事，不是派活（11-13 回放真实回复时的误拦）
const NEG = /不能|不可以|不要|别去|碰不了|做不了|无法|不用|不需要|无需|没法|没有权限|不归你|不是你/;
const HEADER = [/^#{1,6}\s/, /^\*\*[^*]+\*\*\s*[（(][^）)]*[）)]\s*[:：]?\s*$/, /^\*\*[^*]+\*\*\s*[:：]?\s*$/, /^[^\s|`>].{0,30}[:：]\s*$/];
const stripQuotes = s => s.replace(/「[^」]*」/g, '「」').replace(/“[^”]*”/g, '“”');

// 找出「写给对方做、但只有所有者能做」的行；返回 [{line, act, text}]
export function findViolations(text, { soleOnly = false } = {}) {   // soleOnly：只查共同所有者也不能做的事
  const out = []; let section = 'neutral';
  String(text || '').split('\n').forEach((raw, i) => {
    const line = raw.trim(); if (!line) return;
    const plain = stripQuotes(line);
    if (HEADER.some(r => r.test(line))) { section = OWNER_MARK.test(plain) ? 'owner' : READER.test(plain) ? 'reader' : 'neutral'; if (section !== 'reader') return }
    if (section === 'owner' || OWNER_MARK.test(plain) || NEG.test(plain) || DONE.test(plain)) return;
    const toReader = section === 'reader' || /你|^\s*(\d+[.)、]\s*|[-*]\s*)?请/.test(plain);
    if (!toReader) return;
    const hit = OWNER_ACT.find(([r, , sole]) => (!soleOnly || sole) && r.test(plain)); if (hit) out.push({ line: i + 1, act: hit[1], text: line.slice(0, 120) });
  });
  return out;
}

// 从对话记录（JSONL）取最后一轮里助手说的所有文字（从最后一条「人说的话」之后开始；工具结果、系统提示不算人说的话）
export function lastTurnText(jsonl) {
  const rows = String(jsonl || '').split('\n').filter(Boolean).map(l => { try { return JSON.parse(l) } catch (_) { return null } }).filter(Boolean);
  const isHuman = r => r.type === 'user' && !r.isMeta && (typeof r.message?.content === 'string' ? !/^<(system-reminder|command-|local-command)/.test(r.message.content.trim())
    : Array.isArray(r.message?.content) && r.message.content.some(b => b.type === 'text' && !/^<system-reminder>/.test(String(b.text).trim())));
  let start = 0; for (let i = rows.length - 1; i >= 0; i--) if (isHuman(rows[i])) { start = i + 1; break }
  return rows.slice(start).filter(r => r.type === 'assistant').flatMap(r => Array.isArray(r.message?.content) ? r.message.content.filter(b => b.type === 'text').map(b => b.text) : typeof r.message?.content === 'string' ? [r.message.content] : []).join('\n');
}

// 决定：返回退回的理由（字符串）或 null（放行）。coOwners = main 上 .github/CO_OWNERS 的名单（读不到传 null：按协作者查，宁可多拦一次——
//   被拦后同一次停止不会再拦（stop_hook_active），不会卡死；漏拦才是这个检查要防的事）
export function decide({ login, text, stopHookActive, coOwners = null }) {
  if (stopHookActive || !login || login === '?' || login === OWNER_LOGIN) return null;
  const co = Array.isArray(coOwners) && coOwners.includes(login);
  const v = findViolations(text, { soleOnly: co }); if (!v.length) return null;
  const who = co ? `共同所有者 ${login}（.github/CO_OWNERS）` : `协作者 ${login}`;
  return `对话里的人是${who}（gh 账号），不是所有者 ${OWNER_LOGIN}。下面这些行把${co ? '只有 SMG562 本人能做' : '只有所有者能做'}的事写成了「对方去做」：\n`
    + v.map(x => `  第 ${x.line} 行（${x.act}）：${x.text}`).join('\n')
    + (co ? `\n改法：共同所有者能合并红线 PR、执行正式库迁移、部署，但仍不推 main（走 PR + \`bash tools/pr_merge.sh\`）。这些步骤改成 PR 流程，或写成「等所有者 ${OWNER_LOGIN} 做：…」。改完再回复。`
      : `\n改法：这些步骤写成「等所有者 ${OWNER_LOGIN} 做：…」或放在「要等所有者做的」小标题下；协作者能做的只写协作者能做的（比如在 PR / Issue 里【阻塞@${OWNER_LOGIN}】请他做）。改完再回复。`);
}

// 共同所有者名单：只认 origin/main 上的 .github/CO_OWNERS（和 tools/pr_merge.sh 同一份；分支上改了不算）。读不到 → null
export function coOwnerList({ cwd = process.env.CLAUDE_PROJECT_DIR || process.cwd(), git = 'git', env = process.env } = {}) {
  if (env.NBQ_CO_OWNERS != null) return env.NBQ_CO_OWNERS.split(',').map(x => x.trim()).filter(Boolean);       // 测试用
  try { return execFileSync(git, ['show', 'origin/main:.github/CO_OWNERS'], { cwd, encoding: 'utf8', timeout: 5000, stdio: ['ignore', 'pipe', 'ignore'] })
    .split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#') && /^[A-Za-z0-9-]{1,39}$/.test(l)) } catch (_) { return null }
}

// 本会话的 gh 账号：先读缓存（6 小时），没有再问 gh（5 秒超时）；读不到 → '?'（放行）
export function ghLogin({ env = process.env, cacheFile = path.join(os.tmpdir(), `nbq-gh-login-${os.userInfo().uid}`), now = Date.now(), gh = 'gh' } = {}) {
  if (env.NBQ_GH_LOGIN) return env.NBQ_GH_LOGIN;                                                           // 测试用
  try { const st = fs.statSync(cacheFile); if (now - st.mtimeMs < 6 * 36e5) { const v = fs.readFileSync(cacheFile, 'utf8').trim(); if (/^[A-Za-z0-9-]{1,39}$/.test(v)) return v } } catch (_) { }
  try { const v = execFileSync(gh, ['api', 'user', '--jq', '.login'], { encoding: 'utf8', timeout: 5000, stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    if (/^[A-Za-z0-9-]{1,39}$/.test(v)) { try { fs.writeFileSync(cacheFile, v) } catch (_) { } return v } } catch (_) { }
  return '?';
}

function readTail(file, max = 4 << 20) {                                                                     // 只读最后 4 MB（对话记录可能很长）
  const fd = fs.openSync(file, 'r'); try { const size = fs.fstatSync(fd).size, n = Math.min(size, max), buf = Buffer.alloc(n); fs.readSync(fd, buf, 0, n, size - n);
    const s = buf.toString('utf8'); return size > n ? s.slice(s.indexOf('\n') + 1) : s } finally { fs.closeSync(fd) }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}');
    const text = typeof input.last_assistant_message === 'string' ? input.last_assistant_message : input.transcript_path ? lastTurnText(readTail(input.transcript_path)) : '';
    const login = ghLogin(), reason = decide({ login, text, stopHookActive: !!input.stop_hook_active, coOwners: login === OWNER_LOGIN ? [] : coOwnerList() });
    if (reason) process.stdout.write(JSON.stringify({ decision: 'block', reason }) + '\n');
  } catch (_) { }                                                                                             // 检查自己出错绝不拦人
  process.exit(0);
}
