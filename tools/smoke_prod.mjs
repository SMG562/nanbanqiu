#!/usr/bin/env node
/**
 * 上线后冒烟测试（11-03）：推送后确认「线上真的是这一版、关键页面真的能用」，不靠人工试。
 *   node tools/smoke_prod.mjs [--sha=<提交号，默认 git HEAD>] [--base=https://nanbanqiu.app] [--no-wait]
 * 步骤：① 轮询 /version.json 直到 sha = 本次提交（最多 8 分钟）；② /api/health、/api/version；
 *       ③ 用浏览器打开手机端 / 网页端：没有页面报错、没有一直卡在「正在恢复登录…」、真实数据模式已启用、公开球局读得到；
 *       ④ /sw.js、/manifest.webmanifest 可取。
 * 全部通过 exit 0，否则 exit 1 并写明哪一步。会话里的 shell 连不上正式站，所以由 GitHub Actions（.github/workflows/smoke.yml）跑，
 * 或在你电脑上运行。不登录、不写任何数据。
 */
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
const arg = k => (process.argv.find(a => a.startsWith('--' + k + '=')) || '').split('=').slice(1).join('=');
const BASE = (arg('base') || process.env.NBQ_BASE || 'https://nanbanqiu.app').replace(/\/$/, '');
const SHA = arg('sha') || (() => { try { return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim() } catch { return '' } })();
let fail = 0; const T = (n, ok, x) => { console.log((ok ? '✅ ' : '❌ ') + n + (!ok && x !== undefined ? ' → ' + JSON.stringify(x).slice(0, 300) : '')); if (!ok) fail++ };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const get = async p => { const r = await fetch(BASE + p, { headers: { 'Cache-Control': 'no-cache' } }); return { s: r.status, t: await r.text() } };

// ① 等线上换成这一版
if (SHA && !process.argv.includes('--no-wait')) {
  let live = null;
  for (let i = 0; i < 32; i++) { try { live = JSON.parse((await get('/version.json')).t).sha } catch { live = null } if (live && live.startsWith(SHA.slice(0, 7))) break; await sleep(15000) }
  T(`线上版本 = 本次提交 ${SHA.slice(0, 7)}`, !!live && live.startsWith(SHA.slice(0, 7)), { live });
}
// ② 接口
{ const h = await get('/api/health').catch(() => ({ s: 0 })); T('/api/health 200', h.s === 200, h);
  const v = await get('/api/version').catch(() => ({ s: 0 })); T('/api/version 200', v.s === 200, v); }
// ④ sw / manifest
{ const sw = await get('/sw.js').catch(() => ({ s: 0, t: '' })); T('/sw.js 可取', sw.s === 200 && /VERSION/.test(sw.t), sw.s);
  const m = await get('/manifest.webmanifest').catch(() => ({ s: 0 })); T('/manifest.webmanifest 可取', m.s === 200, m.s); }
// ③ 浏览器
const require = createRequire(import.meta.url); let chromium;
try { ({ chromium } = require('playwright')) } catch { try { ({ chromium } = require(execSync('npm root -g', { encoding: 'utf8' }).trim() + '/playwright')) } catch { } }
if (!chromium) { T('找到 playwright', false); process.exit(1) }
const b = await chromium.launch({ args: ['--no-sandbox'] });
for (const [name, path] of [['手机端', '/pwa.html'], ['网页端', '/web.html']]) {
  const ctx = await b.newContext({ viewport: name === '手机端' ? { width: 390, height: 844 } : { width: 1280, height: 800 } }), pg = await ctx.newPage(), errs = [];
  pg.on('pageerror', e => errs.push(String(e.message).slice(0, 160))); pg.on('console', m => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) errs.push(m.text().slice(0, 160)) });
  await pg.goto(BASE + path, { waitUntil: 'load' }); await pg.waitForTimeout(4000);
  const st = await pg.evaluate(() => ({ real: typeof NBQ_NET !== 'undefined' && !!NBQ_NET, games: typeof GAMES !== 'undefined' ? GAMES.length : -1, waiting: typeof sbaWaiting === 'function' ? sbaWaiting() : false, text: document.body.innerText.length, reported: (window.NBQ_ERRS || []).length }));
  T(`${name}：没有页面报错`, errs.length === 0 && st.reported === 0, { errs, reported: st.reported });
  T(`${name}：真实数据模式已启用`, st.real, st);
  T(`${name}：没有卡在「正在恢复登录」`, !st.waiting, st);
  T(`${name}：页面有内容、公开球局读到了`, st.text > 200 && st.games >= 0, st);
  await ctx.close();
}
await b.close();
console.log(fail ? `\n冒烟测试：${fail} 项失败` : '\n冒烟测试：全部通过'); process.exit(fail ? 1 : 0);
