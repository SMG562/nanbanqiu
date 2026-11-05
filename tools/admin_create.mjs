#!/usr/bin/env node
// 创建后台管理员（#27 第 1 步）。在你自己的电脑上运行，不连数据库、不联网：
//   node tools/admin_create.mjs --email=you@example.com --name=Han --role=owner
// 流程：输入两遍密码（至少 12 位，输入时不显示）→ 打印一段 SQL（只含密码哈希、两步验证密钥和恢复码的哈希，不含密码）
//       → 你把这段 SQL 粘到 Supabase SQL Editor 运行（测试库、正式库各一次）→ 用手机验证器 App 添加下面打印的密钥 → 抄好 10 个恢复码。
// 注意：SQL 里的两步验证密钥是明文（表结构如此）；运行后清掉 SQL Editor 的历史。同一邮箱已存在时什么都不做（on conflict do nothing），不会覆盖别人。
import readline from 'node:readline';
import { hashPassword, newTotpSecret, newRecoveryCodes, totpURI } from '../server/admin/auth.mjs';
const arg = k => (process.argv.find(a => a.startsWith(`--${k}=`)) || '').slice(k.length + 3);
const email = arg('email').trim().toLowerCase(), name = arg('name').trim(), role = arg('role') || 'owner';
const die = m => { console.error('✗ ' + m); process.exit(1) };
if (!/^[^\s@'"\;]+@[^\s@'"\;]+\.[^\s@'"\;]+$/.test(email) || email.length > 254) die('用法：node tools/admin_create.mjs --email=<邮箱> --name=<名字> --role=owner|operator|viewer');
if (!name || /['"\;]/.test(name) || name.length > 40) die('--name 不能为空，也不能含引号、反斜杠、分号');
if (!['owner', 'operator', 'viewer'].includes(role)) die('--role 只能是 owner / operator / viewer');
// 一个 readline 按行取输入（终端里输入不回显；管道输入也行，方便测试）
const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: !!process.stdin.isTTY });
let muted = false; const w = rl._writeToOutput; rl._writeToOutput = s => { if (!muted) w.call(rl, s) };
const lines = [], waiters = []; let closed = false;
rl.on('line', l => { const f = waiters.shift(); f ? f(l) : lines.push(l) });
rl.on('close', () => { closed = true; while (waiters.length) waiters.shift()('') });
const ask = q => new Promise(res => { process.stdout.write(q); muted = true; const done = a => { muted = false; process.stdout.write('\n'); res(a) }; if (lines.length) done(lines.shift()); else if (closed) done(''); else waiters.push(done) });
const p1 = await ask('密码（至少 12 位）：'), p2 = await ask('再输一遍：'); rl.close();
if (p1 !== p2) die('两次不一样');
let hash; try { hash = hashPassword(p1) } catch (e) { die(e.message === 'password_too_short' ? '密码至少 12 位' : e.message) }
const secret = newTotpSecret(), rc = newRecoveryCodes();
console.log(`
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
