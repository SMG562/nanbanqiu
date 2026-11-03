#!/usr/bin/env node
/**
 * 部署发送程序（nanbanqiu-notify）并核对线上真的换成了这一版。在你电脑的「南伴球」文件夹里运行：
 *     node tools/deploy_notify.mjs
 * 做三件事：① 算本地代码指纹；② wrangler deploy，同时把指纹写进 Worker；③ 每 10 秒问一次线上（/api/version），
 * 最多等 3 分钟，线上指纹 = 本地指纹才算成功，否则明确告诉你没换上（常见原因：本文件夹里的文件不是最新的）。
 * 之后随时可以只核对：node tools/deploy_notify.mjs --check
 * 测试库的发送程序（nanbanqiu-notify-staging）：加 --env=staging，核对的是测试环境 https://staging.nanbanqiu-preview.pages.dev 的 /api/version
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { senderVersion, closure } from './worker_version.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENV = (process.argv.find(a => a.startsWith('--env=')) || '').slice(6);   // '' = 正式；'staging' = 测试库
const BASE = process.env.NBQ_BASE || (ENV === 'staging' ? 'https://staging.nanbanqiu-preview.pages.dev' : 'https://nanbanqiu.app');
const local = senderVersion(ROOT);
console.log(`本地代码指纹：${local}（${closure(ROOT).length} 个文件）`);

export async function live() {
  const r = await fetch(BASE + '/api/version', { headers: { 'Cache-Control': 'no-cache' } });
  if (!r.ok) throw new Error('/api/version 返回 ' + r.status);
  return (await r.json()).sender;
}

if (!process.argv.includes('--check')) {
  const r = spawnSync('npx', ['--yes', 'wrangler', 'deploy', ...(ENV ? ['--env', ENV] : []), '--var', `NBQ_VERSION:${local}`], { cwd: path.join(ROOT, 'notify-worker'), stdio: 'inherit' });
  if (r.status !== 0) { console.error('\n❌ wrangler deploy 失败，上面是原因。'); process.exit(1) }
}
const t0 = Date.now(); let last = null;
while (true) {
  try { last = await live(); if (last.version === local) { console.log(`\n✅ 线上已是这一版（${local}），最近一次发送心跳 ${last.heartbeat_age_s} 秒前。`); process.exit(0) } }
  catch (e) { last = { error: String(e.message || e) } }
  if (process.argv.includes('--check') || Date.now() - t0 > 180000) break;
  process.stdout.write('.'); await new Promise(r => setTimeout(r, 10000));
}
console.error(`\n❌ 线上指纹是 ${last && last.version || '（还没有）'}，本地是 ${local}，没对上。` + (last && last.error ? ' 查询出错：' + last.error : ''));
console.error('   可能：Worker 还没跑到新代码（再等 1 分钟后 --check）；或这个文件夹里的文件不是最新的（让 Claude 重新同步后再来一次）。');
process.exit(2);
