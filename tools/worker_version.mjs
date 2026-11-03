#!/usr/bin/env node
/**
 * 发送程序（nanbanqiu-notify）的「代码版本」：对它实际会打进包里的源文件算一个指纹（内容哈希，不依赖 git，
 * 所以在你电脑「文稿/南伴球」这种没有 .git 的副本里算出来也一样）。
 *   node tools/worker_version.mjs           打印指纹（10 位）
 *   node tools/worker_version.mjs --list    打印参与计算的文件（相对路径，一行一个）
 * 部署时把指纹写进 Worker（--var NBQ_VERSION），Worker 每分钟写进心跳表，/api/version 读出来：
 *   线上指纹 = 仓库指纹 → 线上就是最新代码；不一致 → 还没部署，或者部署用的文件不是最新。
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = ['worker/notify.mjs', 'notify-worker/wrangler.jsonc'];

// 从入口出发，顺着相对路径的 import 找到所有会被打包的文件
export function closure(root = ROOT, entry = ENTRY) {
  const seen = new Set(), todo = [...entry];
  while (todo.length) {
    const rel = todo.pop(); if (seen.has(rel)) continue;
    const abs = path.join(root, rel); if (!fs.existsSync(abs)) throw new Error('缺文件：' + rel);
    seen.add(rel);
    if (!/\.m?js$/.test(rel)) continue;
    const src = fs.readFileSync(abs, 'utf8');
    for (const m of src.matchAll(/(?:from|import)\s*\(?\s*['"](\.{1,2}\/[^'"]+)['"]/g)) todo.push(path.posix.normalize(path.posix.join(path.posix.dirname(rel), m[1])));
  }
  return [...seen].sort();
}
export function senderVersion(root = ROOT) {
  const h = crypto.createHash('sha256');
  for (const rel of closure(root)) { h.update(rel + '\0'); h.update(fs.readFileSync(path.join(root, rel))); h.update('\0') }
  return h.digest('hex').slice(0, 10);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--list')) console.log(closure().join('\n'));
  else console.log(senderVersion());
}
