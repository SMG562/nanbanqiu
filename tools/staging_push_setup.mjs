#!/usr/bin/env node
/**
 * 测试环境推送一次性设置（11-03）。在你电脑的「南伴球」文件夹里运行：
 *     node tools/staging_push_setup.mjs
 * 做五件事（每一步都会打印结果，出错就停）：
 *   ① 部署测试库的发送程序 nanbanqiu-notify-staging（第一次部署 = 创建它）
 *   ② 生成一对测试环境专用的推送密钥（和正式的分开；私钥直接交给 Cloudflare，不写进任何文件、不打印）
 *   ③ 把 VAPID_PUBLIC / VAPID_PRIVATE / VAPID_SUBJECT 填进 nanbanqiu-notify-staging
 *   ④ 让你粘贴测试库连接串 DB_URL（和 Cloudflare Pages「预览」环境里填的 DB_URL 是同一个值）
 *   ⑤ 把公钥填进 Pages 项目 nanbanqiu-preview 的「预览」环境（填不进去会告诉你在网页上怎么填）
 * 最后重新部署并核对测试环境 /api/version 里出现发送程序心跳。
 * 再运行一次会换一对新密钥：之前在测试环境开过的推送要重新点一次「开启」。
 */
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), W = path.join(ROOT, 'notify-worker');
const step = s => console.log('\n── ' + s);
const run = (args, opt = {}) => spawnSync('npx', ['--yes', 'wrangler', ...args], { cwd: W, encoding: 'utf8', ...opt });
const stop = m => { console.error('\n❌ ' + m); process.exit(1) };

step('① 部署 nanbanqiu-notify-staging');
if (run(['deploy', '--env', 'staging'], { stdio: 'inherit' }).status !== 0) stop('部署失败（上面是原因）。没登录过的话先运行 npx wrangler login');

step('② 生成测试环境推送密钥');
const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
const jwk = privateKey.export({ format: 'jwk' });
const PUB = Buffer.concat([Buffer.from([4]), Buffer.from(jwk.x, 'base64url'), Buffer.from(jwk.y, 'base64url')]).toString('base64url');
const PRIV = jwk.d;
if (Buffer.from(PUB, 'base64url').length !== 65 || Buffer.from(PRIV, 'base64url').length !== 32) stop('密钥长度不对');
void publicKey;
console.log('公钥：' + PUB);

step('③ 填推送密钥到 nanbanqiu-notify-staging');
for (const [k, v] of [['VAPID_PUBLIC', PUB], ['VAPID_PRIVATE', PRIV], ['VAPID_SUBJECT', 'mailto:hello@nanbanqiu.app']]) {
  const r = run(['secret', 'put', k, '--env', 'staging'], { input: v, stdio: ['pipe', 'pipe', 'pipe'] });
  if (r.status !== 0) stop(`${k} 没填进去：${(r.stderr || r.stdout || '').trim().split('\n').slice(-3).join(' ')}`);
  console.log('✓ ' + k);
}

step('④ 测试库连接串 DB_URL（粘贴后回车；和 Pages「预览」环境里的 DB_URL 同一个值，输入时不显示）');
if (run(['secret', 'put', 'DB_URL', '--env', 'staging'], { stdio: 'inherit' }).status !== 0) stop('DB_URL 没填进去');

step('⑤ 公钥填进 Pages 项目 nanbanqiu-preview 的「预览」环境');
const p = run(['pages', 'secret', 'put', 'VAPID_PUBLIC', '--project-name', 'nanbanqiu-preview', '--env', 'preview'], { input: PUB, stdio: ['pipe', 'pipe', 'pipe'] });
if (p.status === 0) console.log('✓ 已填。Pages 要重新部署一次才读到：推一次分支即可（Claude 会做）');
else console.log(`没能自动填（${(p.stderr || '').trim().split('\n').slice(-1)[0] || '未知原因'}）。请在网页上填：
   Cloudflare → Workers 和 Pages → nanbanqiu-preview → 设置 → 变量和机密 → 选「预览」→ 添加 → 类型选「密钥」
   名称 VAPID_PUBLIC，值：
   ${PUB}`);

step('最后：带版本号重新部署并核对心跳');
const d = spawnSync('node', [path.join(ROOT, 'tools', 'deploy_notify.mjs'), '--env=staging'], { stdio: 'inherit' });
process.exit(d.status ?? 1);
