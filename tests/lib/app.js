/* 页面测试公共函数（11-11，#172 第 4 项）：一行打开一端页面，代替每个测试里十几行样板。
 *   const { openApp } = require('../lib/app');
 *   const { page, ctx, errs } = await openApp(browser, { end: 'Web', tz: 'Asia/Shanghai', flags: ['intro'], width: 1024 });
 * 默认：手机端 PWA 390×844 / 网页端 1360×860；墨尔本时区；https://nanbanqiu.test/（不是正式 / 预览域名，开关默认关；
 *   不用 file://——刷新太快时本机存储偶尔来不及写进去，会误报）；页面 HTML 由路由直接给，除本站外的外网请求一律拦掉。
 * 选项（拼错的名字直接报错，不会悄悄不生效）：
 *   end     'PWA' | 'Web'                 哪一端（默认 PWA）
 *   tz      IANA 时区                      默认 Australia/Melbourne
 *   flags   ['intro', …]                  打开的功能开关（写 localStorage nbq_ff_<名>=1，页面脚本执行前就在）
 *   width / height                        屏宽 / 屏高（默认按端）
 *   hash    '#g=…'                        打开时带的地址尾巴
 *   origin  'https://nanbanqiu.app'       换域名（真实模式的测试用）；页面以外的 /api/ 请求交给 api
 *   api     async (route, url) => …       处理本站 /api/ 请求；不给就一律回 404 {error:'not_found'}
 *   init    函数                           额外的页面初始化脚本（在页面脚本之前执行）
 *   errs    数组                           把页面报错也推进这个数组（多个页面共用一个；每条前面带端名）
 *   settle  毫秒                           打开后等页面安静最多多久（默认 900；0 = 不等）
 * 返回 { page, ctx, errs, plan }：errs 收 pageerror（实测已含没人处理的 Promise 拒绝，不用另外监听）。 */
const path = require('path'); const fs = require('fs');
const DIR = process.env.NBQ_DIR || path.join(__dirname, '..', '..');
const KEYS = ['end', 'tz', 'flags', 'width', 'height', 'hash', 'origin', 'api', 'init', 'errs', 'settle'];
const SIZE = { PWA: { width: 390, height: 844 }, Web: { width: 1360, height: 860 } };

// 纯函数：选项 → 要怎么打开（不开浏览器，tests/unit/open_app 直接测）
function appPlan(o = {}) {
  const bad = Object.keys(o).filter(k => !KEYS.includes(k));
  if (bad.length) throw new Error('openApp 不认识的选项：' + bad.join(', ') + '（能用的：' + KEYS.join(' ') + '）');
  const end = o.end || 'PWA';
  if (!SIZE[end]) throw new Error(`openApp end 只能是 PWA / Web：${end}`);
  const flags = o.flags || [];
  if (!Array.isArray(flags) || flags.some(f => typeof f !== 'string' || !/^[a-z][a-z0-9_]*$/.test(f) || f.startsWith('nbq_ff_'))) throw new Error('openApp flags 要写成开关名数组，如 [\'intro\']：' + JSON.stringify(flags));
  const origin = (o.origin || 'https://nanbanqiu.test').replace(/\/+$/, '');
  if (!/^https:\/\/[a-z0-9.-]+$/.test(origin)) throw new Error('openApp origin 要写成 https://域名：' + origin);
  const hash = o.hash || '';
  if (hash && !/^[#?]/.test(hash)) throw new Error('openApp hash 要以 # 或 ? 开头：' + hash);
  for (const k of ['width', 'height', 'settle']) if (o[k] !== undefined && !(Number.isFinite(o[k]) && o[k] >= 0)) throw new Error(`openApp ${k} 要是非负数：${o[k]}`);
  return {
    end, file: path.join(DIR, '南伴球_' + end + '.html'), origin, url: origin + '/' + hash,
    context: { viewport: { width: o.width || SIZE[end].width, height: o.height || SIZE[end].height }, timezoneId: o.tz || 'Australia/Melbourne' },
    flagKeys: flags.map(f => 'nbq_ff_' + f), settle: o.settle === undefined ? 900 : o.settle,
  };
}

// 页面里执行：打开开关（页面脚本执行前就写好）；本机存储报错时不抛
function pageInit(keys) { try { keys.forEach(k => localStorage.setItem(k, '1')) } catch (_) { } }

async function openApp(browser, o = {}) {
  const plan = appPlan(o);
  const html = fs.readFileSync(plan.file), errs = o.errs || [];
  const ctx = await browser.newContext(plan.context);
  await ctx.addInitScript(pageInit, plan.flagKeys);
  if (o.init) await ctx.addInitScript(o.init);
  // 外网一律拦掉（preload 也拦，这里再拦一次：不靠 -r preload 也成立）；本站：/api/ 交给 api，其余都给页面 HTML
  await ctx.route(u => !String(u).startsWith(plan.origin + '/'), r => r.abort());
  await ctx.route(plan.origin + '/**', async (r, q) => {
    const u = new URL(q.url());
    if (u.pathname.startsWith('/api/')) return o.api ? o.api(r, u) : r.fulfill({ status: 404, contentType: 'application/json', body: '{"error":"not_found"}' });
    return r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html });
  });
  const page = await ctx.newPage();
  page.on('pageerror', e => errs.push(plan.end + ' ' + e.message));
  await page.goto(plan.url);
  if (plan.settle) await (page.settle ? page.settle(plan.settle) : page.waitForTimeout(plan.settle));
  return { page, ctx, errs, plan };
}

module.exports = { openApp, appPlan, pageInit };
