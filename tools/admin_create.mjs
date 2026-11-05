#!/usr/bin/env node
// 创建后台管理员（#27 第 1 步）。在你自己的电脑上运行，不连数据库、不联网：
//   node tools/admin_create.mjs --email=you@example.com --name=Han --role=owner
// 流程：输入两遍密码（至少 12 位，输入时不显示）→ 打印一段 SQL（只含密码哈希、两步验证密钥和恢复码的哈希，不含密码）
//       → 你把这段 SQL 粘到 Supabase SQL Editor 运行（测试库、正式库各一次）→ 用手机验证器 App 添加下面打印的密钥 → 抄好 10 个恢复码。
// 注意：SQL 里的两步验证密钥是明文（表结构如此）；运行后清掉 SQL Editor 的历史。同一邮箱已存在时什么都不做（on conflict do nothing），不会覆盖别人。
import { hashPassword, newTotpSecret, newRecoveryCodes, totpURI } from '../server/admin/auth.mjs';
const arg = k => (process.argv.find(a => a.startsWith(`--${k}=`)) || '').slice(k.length + 3);
const email = arg('email').trim().toLowerCase(), name = arg('name').trim(), role = arg('role') || 'owner';
const die = m => { console.error('✗ ' + m); process.exit(1) };
const USAGE = '用法：node tools/admin_create.mjs --email=you@example.com --name="Han Liu" --role=owner（名字有空格要加引号）';
if (!arg('email')) die('缺 --email。' + USAGE);
if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email) || email.length > 254) die(`邮箱格式不对：${arg('email')}。` + USAGE);
if (!name || /['"\\;]/.test(name) || name.length > 40) die('--name 不能为空，也不能含引号、反斜杠、分号');
if (!['owner', 'operator', 'viewer'].includes(role)) die('--role 只能是 owner / operator / viewer');
// 读密码：终端里用原始模式逐个字符读（提示语照常显示、输入不回显、退格可用、Ctrl-C 退出）；
//   11-05 用户实测：原来用 readline 的终端模式，它重画这一行时把提示语擦掉了，屏幕上只剩空行。管道输入（测试）按行读。
const pipedLines = process.stdin.isTTY ? null : (await (async () => { let t = ''; for await (const c of process.stdin) t += c; return t.split(/\r?\n/) })());
const ask = q => new Promise(res => {
  process.stdout.write(q);
  if (pipedLines) { process.stdout.write('\n'); return res(pipedLines.shift() ?? '') }
  const stdin = process.stdin; let buf = '';
  stdin.setRawMode(true); stdin.resume(); stdin.setEncoding('utf8');
  const onData = chunk => { for (const ch of chunk) {
    if (ch === '\r' || ch === '\n') { stdin.setRawMode(false); stdin.pause(); stdin.off('data', onData); process.stdout.write('\n'); return res(buf) }
    if (ch === '\u0003') { stdin.setRawMode(false); process.stdout.write('\n'); process.exit(130) }
    if (ch === '\u007f' || ch === '\b') { buf = buf.slice(0, -1); continue }
    if (ch >= ' ') buf += ch } };
  stdin.on('data', onData);
});
const p1 = await ask('后台登录密码（自己定，至少 12 位；输入时屏幕不显示，输完按回车）：'), p2 = await ask('再输一遍：');
if (p1 !== p2) die('两次输入的密码不一样，请重新运行');
let hash; try { hash = hashPassword(p1) } catch (e) { die(e.message === 'password_too_short' ? `密码至少 12 位（这次是 ${[...p1].length} 位），请重新运行` : e.message) }
const secret = newTotpSecret(), rc = newRecoveryCodes();
console.log(`
⚠️  下面的密钥和恢复码只给你自己：不要截图、不要发给任何人（包括 Claude）。SQL 只贴进 Supabase SQL Editor。

-- ===== 复制从这里到「复制到这里结束」，粘到 Supabase SQL Editor 运行 =====
insert into admin_users(email, name, role, password_hash, totp_secret, recovery_hashes, password_changed_at)
values ('${email}', '${name}', '${role}', '${hash}', '${secret}', array[${rc.hashes.map(h => `'${h}'`).join(', ')}], now())
on conflict (email) do nothing;
select email, name, role, cardinality(recovery_hashes) as recovery_codes, disabled from admin_users where email = '${email}';
-- ===== 复制到这里结束 =====

两步验证（在手机验证器 App 里「手动输入密钥」，类型选基于时间）：
  账号：${email}
  密钥：${secret}
  或者把这条地址做成二维码：${totpURI(secret, email)}

恢复码（手机丢了时用，每个只能用一次，抄在纸上，别存在电脑里）：
${rc.codes.map((c, i) => `  ${String(i + 1).padStart(2)}. ${c}`).join('\n')}

提醒：这些密钥和恢复码只显示这一次。至少保留 2 位 owner。
`);
