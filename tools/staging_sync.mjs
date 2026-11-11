#!/usr/bin/env node
// 推 main 后自动把 staging 分支快进到 main，并核对测试站上线的就是这个提交（11-11，#161 原第 2 项，所有者授权）。
//   背景：测试站 staging.nanbanqiu-preview.pages.dev 对应 staging 分支，不会随 main 自动更新；以前要手动 `git push origin HEAD:refs/heads/staging`，忘了就测到旧版。
//   node tools/staging_sync.mjs [--dry]     要 GH_TOKEN（contents: write）；--dry 只说明会做什么
// 只做「快进」：用 API 更新引用且 force=false，staging 上有 main 里没有的提交（分叉）就跳过并报警，永不强推。
// 核对：轮询 /version.json 的 sha 直到等于 main 的提交（最多 10 分钟），对不上就让任务变红（有人收到通知）。
import path from 'node:path'; import fs from 'node:fs'; import { execFileSync } from 'node:child_process'; import { fileURLToPath } from 'node:url';
export const SITE = 'https://staging.nanbanqiu-preview.pages.dev', WAIT_MS = 10 * 60e3, STEP_MS = 20e3;
// compare(staging...main).status：ahead = main 比 staging 多（可快进）；identical = 一样；behind / diverged = 不能快进
export const decide = status => status === 'ahead' ? 'push' : status === 'identical' ? 'noop' : 'skip';
export const versionOk = (json, sha) => { try { return String(JSON.parse(json).sha || '').startsWith(sha.slice(0, 7)) } catch { return false } };

async function main() {
  const dry = process.argv.includes('--dry'), R = process.env.GITHUB_REPOSITORY || 'SMG562/nanbanqiu';
  const gh = (...a) => execFileSync('gh', ['api', ...a], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  const main = gh(`repos/${R}/git/ref/heads/main`, '--jq', '.object.sha');          // 始终同步到「现在的 main」，不是触发事件那个提交（排队时旧事件不会把 staging 拉回去）
  const status = gh(`repos/${R}/compare/staging...${main}`, '--jq', '.status'), act = decide(status);
  console.log(`main ${main.slice(0, 7)} · staging 相对关系 ${status} → ${act}`);
  if (act === 'skip') { console.log(`::warning::staging 不能快进到 main（${status}）：staging 上有 main 里没有的提交，或已经更新。不强推；需要人看一眼 git log main..staging`); return }
  if (act === 'push' && !dry) gh('-X', 'PATCH', `repos/${R}/git/refs/heads/staging`, '-f', `sha=${main}`, '-F', 'force=false');
  if (dry) return;
  const t0 = Date.now(); let last = '';
  while (Date.now() - t0 < WAIT_MS) {
    try { last = await (await fetch(`${SITE}/version.json?_=${Date.now()}`, { cache: 'no-store' })).text(); if (versionOk(last, main)) { console.log(`✅ 测试站已是 ${main.slice(0, 7)}（${Math.round((Date.now() - t0) / 1e3)} 秒）`); return } } catch { }
    await new Promise(r => setTimeout(r, STEP_MS));
  }
  console.log(`::error::测试站 10 分钟内没有更新到 ${main.slice(0, 7)}（现在：${last.slice(0, 120)}）。看 Cloudflare Pages 的 staging 分支构建是否失败`); process.exit(1);
}
if (process.argv[1] && fs.realpathSync(path.resolve(process.argv[1])) === fs.realpathSync(fileURLToPath(import.meta.url))) main();
