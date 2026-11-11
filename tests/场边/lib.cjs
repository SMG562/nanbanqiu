// T2：设计稿 v35 的 146 项场边测试，改测正式页面。
// 设计稿里每台手机是 #d0…#d5、电脑版是 #desk；正式页面里场边 App 放在 #sbHost 的 Shadow DOM 里（一个实例）。
// 做法：页面里加一层转接，document.querySelector('#d3 …') / ('#desk …') 指到那个实例，document.activeElement 穿过 Shadow DOM；
// 这样测试的断言原样保留（= 同样的行为要求），只换「测哪个页面」。Playwright 自己的选择器穿 Shadow DOM，用 PS。
const { chromium } = require('playwright');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const FILES = { pwa: ROOT + '/南伴球_PWA.html', web: ROOT + '/南伴球_Web.html' };
let pass = 0, fail = 0; const fails = [];
const ok = (c, m, extra = '') => { if (c) { pass++; console.log('  ✓', m, extra) } else { fail++; fails.push(m + ' ' + extra); console.log('  ✗', m, extra) } };
const SHIM = () => {
  const dev = () => { const h = document.getElementById('sbHost'), r = h && h.shadowRoot; return r && (r.querySelector('.dev') || r.querySelector('.wb>div')) };
  const RE = /^#(?:d\d|desk)(?![\w-])\s*(.*)$/;
  const q = Document.prototype.querySelector, qa = Document.prototype.querySelectorAll;
  Document.prototype.querySelector = function (s) { if (this === document && typeof s === 'string') { const m = RE.exec(s); if (m) { const d = dev(); if (!d) return null; return m[1] ? d.querySelector(m[1]) : d } } return q.call(this, s) };
  Document.prototype.querySelectorAll = function (s) { if (this === document && typeof s === 'string') { const m = RE.exec(s); if (m) { const d = dev(); if (!d) return []; return m[1] ? d.querySelectorAll(m[1]) : [d] } } return qa.call(this, s) };
  // el.click() 在点击还没处理完时再 click 同一个元素会被浏览器忽略；正式页面的登录拦截（sbGate → again）正好这样重放，所以用真实的点击事件代替
  HTMLElement.prototype.click = function () { this.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, composed: true, view: window })) };
  const ae = Object.getOwnPropertyDescriptor(Document.prototype, 'activeElement');
  Object.defineProperty(Document.prototype, 'activeElement', { get() { let a = ae.get.call(this); while (a && a.shadowRoot && a.shadowRoot.activeElement) a = a.shadowRoot.activeElement; return a } });
};
// opt.live：要看新动态冒出来（t1）。
// kind：'pwa'（手机端，390×844）或 'web'（网页端，1440×1000）。打开后已登录（Jason）并进入场边，新动态节奏调快。
async function open(kind = 'pwa', opt = {}) {
  const web = kind === 'web';
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const ctx = await b.newContext({ viewport: web ? { width: 1440, height: 1000 } : { width: 390, height: 844 } });
  await ctx.addInitScript(SHIM); await ctx.addInitScript(() => { window.AN_LOG = [] });
  const pg = await ctx.newPage(), errs = [];
  pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => { if (m.type() === 'error' && !/TUNNEL|ERR_TUNNEL|net::|Failed to load resource/.test(m.text())) errs.push(m.text()) });
  await pg.goto('file://' + FILES[kind]);
  await pg.waitForFunction(() => document.querySelector('#sheet.show,#mbg.show'), null, { timeout: 8000, polling: 50 }).catch(() => { });
  await pg.evaluate(() => { LOC.asked = true; if (typeof closeSheet === 'function' && document.querySelector('#sheet.show')) closeSheet(); if (typeof closeModal === 'function') closeModal(); setWho('jason', true) });
  if (web) await pg.evaluate(() => sbGo()); else await pg.click('#tabbar [data-tab="side"]');
  await pg.waitForFunction(() => { const r = document.querySelector('#sbHost')?.shadowRoot; return r && r.querySelectorAll('[data-s="home"] .ln').length > 5 }, null, { timeout: 15000, polling: 50 });
  await pg.evaluate(o => { SBV.every = o.live ? 2000 : 1e9 }, opt);   // 默认不再冒新动态（设计稿里这几台手机也是静止的，位置和数字才测得准）；live = 测新动态，节奏调快（原来 5.2 秒一条）
  if (!opt.live) await W(2500);   // 等已经排好的那一次过去
  if (!web) await pg.evaluate(() => SBV.api.setHome('Kooyong,Glen Iris'));   // 设计稿默认的「我的球场」；正式页面按账号来，这里直接给
  return { b, pg, errs, PS: web ? '#sbHost .wb>div' : '#sbHost .dev' };
}
// 设计稿里把某台手机变成干净的首页（关掉发布页、详情等）；正式页面只有一个实例：关发布页，等动画结束
const lab = async (pg, i) => pg.evaluate(async () => { const el = document.querySelector('#d0'); const cx = el.querySelector('[data-cx]'); if (el.classList.contains('composing') && cx) cx.click(); await new Promise(r => setTimeout(r, 700)); return el.className });
const W = ms => new Promise(r => setTimeout(r, ms));
const done = async (b, errs, name) => { ok(errs.length === 0, name + '：没有脚本错误', errs.slice(0, 3).join(' | ')); await b.close(); console.log(`\n${name}：通过 ${pass}，失败 ${fail}`); if (fails.length) console.log('失败项：\n - ' + fails.join('\n - ')); if (fail) process.exitCode = 1; };
module.exports = { open, ok, lab, W, done };
