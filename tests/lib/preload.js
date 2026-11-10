/* 南伴球测试 · 运行环境预加载（node -r lib/preload.js <script>）
 * 让所有脚本在同一个、可重复的环境里运行，不需要改动各个脚本：
 *   1. 固定时钟：页面里的 Date 统一从 NBQ_TS 开始走（默认 2026-10-14 15:10 墨尔本时间）。
 *      脚本自己再加的时间偏移会叠加在上面，结果仍然是脚本指定的绝对时间。
 *   2. 固定随机数：页面里的 Math.random 换成带种子的伪随机（NBQ_SEED），每次运行结果一致，快照可比对。
 *   3. 文件位置：脚本里写死的 file:///mnt/user-data/outputs/ 自动改到 NBQ_DIR（被测文件所在目录）。
 *   4. 浏览器：统一用 NBQ_CHROMIUM（默认 /opt/pw-browsers/chromium），没有就用 Playwright 自带的。
 *   5. 时区固定为墨尔本（NBQ_TZ 可改），与跑测试的机器无关。
 *   6. 外网请求一律拦掉（CDN、Google 等），避免网络状况影响结果；页面已经为离线做了兜底。
 *   7. 等页面安静（E2）：page.settle(最多毫秒)——在「最多毫秒」之内会到期的短定时器（≤ 2 秒）都执行完了、没有待执行的
 *      requestAnimationFrame、在那之前会结束的动画（含 Shadow DOM 里的）都结束了，连续两次检查（50 毫秒一次）都这样就继续。
 *      用来代替「点完等固定 N 毫秒」：页面早就安静了就不用干等；一直不安静（比如 rAF 循环）就和原来一样等满。
 *   8. 等条件成立：page.until(条件, 最多毫秒)——按真实时间等。轮询等待只用它，不要拿 settle 当间隔（页面空闲时 settle 立刻返回）。
 *      等待时间之后才到期的定时器、才结束的动画（场边 5 秒一条的新动态、横幅 4 秒后收起……）不算——原来的固定等待本来也等不到它们。
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
  // 7. 记下待执行的短定时器（到期时间）和 rAF，page.settle() 用
  if (!window.__nbqQuiet) {
    const pend = new Map(), st = window.setTimeout, ct = window.clearTimeout, raf = window.requestAnimationFrame, caf = window.cancelAnimationFrame, now = () => performance.now();
    window.setTimeout = function (f, ms, ...a) {
      if (typeof f !== 'function' || +ms > 2000) return st.call(this, f, ms, ...a);
      let id; id = st.call(this, function () { pend.delete('t' + id); return f.apply(this, arguments) }, ms, ...a); pend.set('t' + id, now() + (+ms || 0)); return id };
    window.clearTimeout = function (id) { pend.delete('t' + id); return ct.call(this, id) };
    window.requestAnimationFrame = function (f) { let id; id = raf.call(this, function () { pend.delete('r' + id); return f.apply(this, arguments) }); pend.set('r' + id, 0); return id };
    window.cancelAnimationFrame = function (id) { pend.delete('r' + id); return caf.call(this, id) };
    const roots = () => [document, ...[...document.querySelectorAll('*')].filter(e => e.shadowRoot).map(e => e.shadowRoot)];
    // 进行中、会在 dl 之前结束的动画（无限循环的、dl 之后才结束的不算：原来的固定等待也等不到它们结束）
    const busy = (a, dl) => { if (a.playState !== 'running') return false; try { const t = a.effect.getComputedTiming(), left = (t.endTime - t.localTime) / (a.playbackRate || 1); return isFinite(left) && now() + left <= dl } catch (_) { return false } };
    // dl = 这次最多等到什么时候（页面时间）；只看那之前会到期的
    window.__nbqQuiet = dl => ![...pend.values()].some(d => d <= dl) && !roots().some(r => r.getAnimations().some(a => busy(a, dl)));
    // 页面里用的版本（测试在 page.evaluate 里等）：自己用原始 setTimeout，不算进待执行
    window.__nbqSettle = cap => new Promise(res => { const dl = now() + cap; let q = 0; const tick = () => { if (now() >= dl) return res();
      if (window.__nbqQuiet(dl)) { if (++q >= 2) return res() } else q = 0; st.call(window, tick, 50) }; st.call(window, tick, 50) });
    window.__nbqWhy = dl => ({ t: [...pend].filter(([k, d]) => k[0] === 't' && d <= dl).map(([, d]) => Math.round(d - now())), r: [...pend.keys()].filter(k => k[0] === 'r').length,
      a: roots().flatMap(r => r.getAnimations().filter(a => busy(a, dl))).map(a => (a.animationName || a.transitionProperty || 'waapi') + ':' + (a.effect.target?.className || a.effect.target?.tagName || '')).slice(0, 4) });
  }
}

// settle 的统计：退出时打印一行（等了多少 / 原来要等多少），用来量 E2 省了多少
const SETTLE = { n: 0, cap: 0, used: 0 };
process.on('exit', () => { if (SETTLE.n) console.log(`[settle] ${SETTLE.n} 次，等了 ${(SETTLE.used / 1000).toFixed(1)}s（原来固定等 ${(SETTLE.cap / 1000).toFixed(1)}s）`) });
const origLoad = Module._load;
let patched = null;
Module._load = function (request, parent, isMain) {
  const m = origLoad.apply(this, arguments);
  if (request !== 'playwright' && request !== 'playwright-core') return m;
  if (patched) return patched;
  const wrapPage = page => {
    const goto = page.goto.bind(page);
    page.goto = (u, o) => goto(fixUrl(u), o);
    page.settle = async (cap = 1600) => {
      const t0 = Date.now();
      const key = Math.random();
      try { await page.waitForFunction(([key, cap]) => { if (window.__nbqK !== key) { window.__nbqK = key; window.__nbqDL = performance.now() + cap; window.__nbqQ = 0 }
        if (!window.__nbqQuiet || !window.__nbqQuiet(window.__nbqDL)) { window.__nbqQ = 0; return false } return ++window.__nbqQ >= 2 }, [key, cap], { timeout: cap, polling: 50 }) }
      catch (e) { if (process.env.NBQ_SETTLE_DEBUG) console.log('[settle 等满]', JSON.stringify(await page.evaluate(() => window.__nbqWhy && window.__nbqWhy(window.__nbqDL + 1e9)).catch(() => 'nav'))); const left = cap - (Date.now() - t0); if (left > 0 && !page.isClosed()) await page.waitForTimeout(left) }   // 超时 = 等满；页面跳转等其他情况：把剩下的时间等完
      SETTLE.n++; SETTLE.cap += cap; SETTLE.used += Date.now() - t0;
    };
    // 8. 等条件成立（11-10）：page.until(条件, 最多毫秒) 按真实时间等，每 100 毫秒查一次，成立返回 true、到时返回 false。
    //    不要用 settle 当轮询间隔：页面空闲时 settle 会立刻返回，「最多 20 轮」可能 1 秒不到就判「没到」（#141 根因；7 个测试都有过这个写法，tests/unit/until_guard 拦）
    page.until = async (fn, ms = 6000) => { const t0 = Date.now(); for (;;) { try { if (await fn()) return true } catch (_) { } if (Date.now() - t0 >= ms) return false; await new Promise(r => setTimeout(r, 100)) } };
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
