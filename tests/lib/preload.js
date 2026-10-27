/* 南伴球测试 · 运行环境预加载（node -r lib/preload.js <script>）
 * 让所有脚本在同一个、可重复的环境里运行，不需要改动各个脚本：
 *   1. 固定时钟：页面里的 Date 统一从 NBQ_TS 开始走（默认 2026-10-14 15:10 墨尔本时间）。
 *      脚本自己再加的时间偏移会叠加在上面，结果仍然是脚本指定的绝对时间。
 *   2. 固定随机数：页面里的 Math.random 换成带种子的伪随机（NBQ_SEED），每次运行结果一致，快照可比对。
 *   3. 文件位置：脚本里写死的 file:///mnt/user-data/outputs/ 自动改到 NBQ_DIR（被测文件所在目录）。
 *   4. 浏览器：统一用 NBQ_CHROMIUM（默认 /opt/pw-browsers/chromium），没有就用 Playwright 自带的。
 *   5. 时区固定为墨尔本（NBQ_TZ 可改），与跑测试的机器无关。
 *   6. 外网请求一律拦掉（CDN、Google 等），避免网络状况影响结果；页面已经为离线做了兜底。
 */
const path = require('path');
const fs = require('fs');
const Module = require('module');

const NBQ_DIR = path.resolve(process.env.NBQ_DIR || path.join(__dirname, '..', '..'));
const NBQ_TS = +new Date(process.env.NBQ_TS || '2026-10-14T15:10:00+11:00');
const NBQ_SEED = (+process.env.NBQ_SEED || 20261014) >>> 0;
const CHROMIUM = process.env.NBQ_CHROMIUM || '/opt/pw-browsers/chromium';
if (isNaN(NBQ_TS)) { console.error('NBQ_TS 不是合法时间：' + process.env.NBQ_TS); process.exit(2); }

const ORIG = 'file:///mnt/user-data/outputs/';
const fixUrl = u => (typeof u === 'string' && u.startsWith(ORIG)) ? 'file://' + NBQ_DIR + '/' + u.slice(ORIG.length) : u;

function initScript({ ts, seed }) {
  // 固定时钟（只设一次，脚本自己的 FD 会在此基础上再偏移）
  if (!window.__nbqClock) {
    window.__nbqClock = true;
    const off = ts - Date.now(), D = Date;
    class FD extends D { constructor(...a) { a.length ? super(...a) : super(D.now() + off) } static now() { return D.now() + off } }
    window.Date = FD;
    let s = seed >>> 0;
    Math.random = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 };
  }
}

const origLoad = Module._load;
let patched = null;
Module._load = function (request, parent, isMain) {
  const m = origLoad.apply(this, arguments);
  if (request !== 'playwright' && request !== 'playwright-core') return m;
  if (patched) return patched;
  const wrapPage = page => {
    const goto = page.goto.bind(page);
    page.goto = (u, o) => goto(fixUrl(u), o);
    return page;
  };
  const wrapCtx = ctx => {
    ctx.addInitScript(initScript, { ts: NBQ_TS, seed: NBQ_SEED });
    ctx.route(/^https?:\/\//, r => r.abort()).catch(() => {});
    const np = ctx.newPage.bind(ctx);
    ctx.newPage = async (...a) => wrapPage(await np(...a));
    return ctx;
  };
  const wrapBrowser = br => {
    const nc = br.newContext.bind(br), npg = br.newPage.bind(br);
    // 页面一律按墨尔本时区运行（和用户手机一致），不依赖跑测试那台机器的时区；脚本自己指定 timezoneId 时以脚本为准
    br.newContext = async (o = {}, ...r) => wrapCtx(await nc({ timezoneId: process.env.NBQ_TZ || 'Australia/Melbourne', ...o }, ...r));
    br.newPage = async (opts = {}) => { const ctx = await br.newContext(opts); const p = await ctx.newPage(); return p };
    return br;
  };
  const chromium = Object.create(m.chromium);
  chromium.launch = async (opts = {}) => {
    const o = { ...opts };
    if (fs.existsSync(CHROMIUM)) o.executablePath = CHROMIUM; else delete o.executablePath;
    return wrapBrowser(await m.chromium.launch(o));
  };
  patched = Object.assign(Object.create(m), { chromium, devices: m.devices });
  return patched;
};
