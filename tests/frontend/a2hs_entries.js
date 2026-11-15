// 添加到桌面引导 v2 第 2 个 PR：所有相关入口的说法统一（开关 NBQ_A2HS2_ON）。
//   为什么：用户在不同地方看到「放到主屏幕」「添加到主屏幕」「像 App 一样收提醒」三种叫法，会以为是不同的东西；
//           登录前的拦截弹层是技术语言（「浏览器和桌面图标不共用登录」）；微信遮罩还写着「在桌面图标里登录一次」，和登录交接对不上；
//           「我已添加」是用户自己说的、Safari 没法核实，点错了 45 天都不再提醒。
//   查什么（开关开 vs 关各一份，关时一个字都不变）：
//     ① 邀约 / 分享球局后的小卡片  ② 通知页顶部卡片  ③ 「申请已发送」弹层的按钮  ④ 微信「用 Safari 打开」遮罩
//     ⑤ 登录前拦截：换成新引导的第一屏，下面是「先在浏览器里用」，点它直接进登录；hoGuide 和 a2hs_open 各一次
//     ⑥ 「我已添加」有效期 14 天（开关关仍 45 天）
//   查不到什么：真机上用户看懂没有（真机清单 + PR 4 的漏斗）。
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const DIR = process.env.NBQ_DIR || path.join(__dirname, '..', '..');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 500) : '')) };
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const SB = 'https://xosrdkrkfxkdrwldfhac.supabase.co';
(async () => {
  const b = await chromium.launch({ executablePath: process.env.NBQ_CHROMIUM || '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  // ---------- 演示模式：各个入口的文案 ----------
  for (const flag of [true, false]) {
    const L = flag ? '开关开' : '开关关';
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });   // 演示数据只在非 iPhone UA 下加载（和 push_onboarding 一样）；这里只看各入口的文案，不看 UA
    if (flag) await ctx.addInitScript(() => { try { localStorage.setItem('nbq_ff_a2hs2', '1') } catch (_) { } });
    const pg = await ctx.newPage(), errs = []; pg.on('pageerror', e => errs.push(e.message));
    await pg.route('https://nanbanqiu.test/**', r => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: fs.readFileSync(path.join(DIR, '南伴球_PWA.html')) }));
    await pg.route('https://cdnjs.cloudflare.com/**', r => r.abort()); await pg.route('https://basemaps.cartocdn.com/**', r => r.abort());
    await pg.goto('https://nanbanqiu.test/'); await pg.settle(600);
    const o = await pg.evaluate(async () => { const o = {}; setWho(Object.keys(USERS)[0], true); setEnv('safari'); PUSH.enabled = false; localStorage.removeItem('nbq_a2hs_ok'); localStorage.removeItem('nbq_a2hs_at');
      const gid = (GAMES.find(g => g.host === ME.id) || GAMES[0]).id;
      o.nudge = pushNudgeHTML('game').replace(/<[^>]+>/g, ' '); o.card = pushCardHTML().replace(/<[^>]+>/g, ' ');
      openApplied(gid); await new Promise(r => setTimeout(r, 300)); o.applied = document.querySelector('#sheet').innerText; closeSheet();
      setEnv('wechat'); openWxGuide(); o.wx = document.querySelector('#wxg').innerText; setEnv('safari');
      const day = 864e5; o.ok = {}; for (const d of [10, 20, 50]) { localStorage.setItem('nbq_a2hs_ok', String(Date.now() - d * day)); o.ok[d] = a2hsAdded() }
      return o });
    if (flag) {
      T(`① ${L}：邀约 / 分享后的小卡片：「放到桌面」+「放到桌面，有人回复你马上知道」`, /放到桌面，有人回复你马上知道/.test(o.nudge) && /放到桌面/.test(o.nudge) && !/主屏幕/.test(o.nudge), o.nudge);
      T(`② ${L}：通知页顶部卡片：「比下载 App 更简单，放到桌面就能收提醒」+「放到桌面」`, /比下载 App 更简单，放到桌面就能收提醒/.test(o.card) && /放到桌面/.test(o.card) && !/主屏幕/.test(o.card), o.card);
      T(`③ ${L}：「申请已发送」弹层的按钮：「放到桌面，不错过回复」`, /放到桌面，不错过回复/.test(o.applied) && !/添加到主屏幕，接收通知/.test(o.applied), o.applied);
      T(`④ ${L}：微信遮罩：把南伴球放到桌面、从图标打开会自动登录，不再写「在桌面图标里登录一次」`, /把南伴球放到桌面/.test(o.wx) && /从图标打开会自动登录/.test(o.wx) && !/登录一次即可/.test(o.wx), o.wx);
      T(`⑥ ${L}：「我已添加」14 天内有效、20 天后失效`, o.ok[10] === true && o.ok[20] === false && o.ok[50] === false, o.ok);
    } else {
      T(`① ${L}：小卡片仍是旧说法`, /放到主屏幕后，才能像 App 一样收提醒/.test(o.nudge) && /放到主屏幕/.test(o.nudge), o.nudge);
      T(`② ${L}：通知页顶部卡片仍是旧说法`, /放到主屏幕，像 App 一样收提醒/.test(o.card), o.card);
      T(`③ ${L}：「申请已发送」仍是「添加到主屏幕，接收通知」`, /添加到主屏幕，接收通知/.test(o.applied), o.applied);
      T(`④ ${L}：微信遮罩仍是旧文案`, /不再弹提示/.test(o.wx) && /在桌面图标里登录一次即可/.test(o.wx), o.wx);
      T(`⑥ ${L}：「我已添加」仍是 45 天（20 天后还有效、50 天后失效）`, o.ok[10] === true && o.ok[20] === true && o.ok[50] === false, o.ok);
    }
    T(`${L}：演示模式无脚本错误`, errs.length === 0, errs); await ctx.close();
  }

  // ---------- 真实模式（nanbanqiu.app，iPhone Safari）：登录前拦截 ----------
  for (const flag of [true, false]) {
    const L = flag ? '开关开' : '开关关';
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, userAgent: IOS, hasTouch: true, isMobile: true });
    if (flag) await ctx.addInitScript(() => { try { localStorage.setItem('nbq_ff_a2hs2', '1') } catch (_) { } });
    const pg = await ctx.newPage(), errs = []; pg.on('pageerror', e => errs.push(e.message));
    await pg.route('https://nanbanqiu.app/**', r => { const u = new URL(r.request().url()); if (!u.pathname.startsWith('/api/')) return r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: fs.readFileSync(path.join(DIR, '南伴球_PWA.html')) });
      if (u.pathname === '/api/me') return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ registered: false }) });
      return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ games: [], venues: [], notifications: [], invites: [], participants: [] }) }) });
    await pg.route(SB + '/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
    await pg.route('https://cdnjs.cloudflare.com/**', r => r.abort()); await pg.route('https://basemaps.cartocdn.com/**', r => r.abort());
    await pg.goto('https://nanbanqiu.app/'); await pg.settle(800);
    await pg.evaluate(() => { window.__tr = []; window.__hg = 0; const o = track; track = function (n) { window.__tr.push(n); return o.apply(this, arguments) }; const g = hoGuide; hoGuide = function () { window.__hg++; return g.apply(this, arguments) } });
    await pg.evaluate(() => openAuth(null)); await pg.settle(500);
    const g = await pg.evaluate(() => ({ txt: document.querySelector('#sheet').innerText, any: !!document.querySelector('[data-a="authAnyway"]'), tr: window.__tr.filter(x => x === 'a2hs_open').length, hg: window.__hg, net: !!NBQ_NET, env: ENV }));
    if (flag) {
      T(`⑤ ${L}：登录前拦截换成新引导第一屏（比下载 App 更简单 + 放到桌面），不再是「先添加到主屏幕，再登录」`, g.net && g.env === 'safari' && /比下载 App 更简单/.test(g.txt) && /放到桌面/.test(g.txt) && !/先添加到主屏幕，再登录/.test(g.txt) && !/不共用登录/.test(g.txt), g);
      T(`⑤ ${L}：下面是「先在浏览器里用」，hoGuide 和 a2hs_open 各一次`, g.any && /先在浏览器里用/.test(g.txt) && g.tr === 1 && g.hg === 1, g);
      await pg.evaluate(() => document.querySelector('[data-a="authAnyway"]').click()); await pg.settle(500);
      T(`⑤ ${L}：点「先在浏览器里用」直接进登录（有手机号输入框），同一次打开里不再问`, await pg.evaluate(() => !!document.querySelector('#ph') && !/比下载 App 更简单/.test(document.querySelector('#sheet').innerText) && sessionStorage.getItem('nbq_a2hs_first') === '1'));
      await pg.evaluate(() => { closeSheet(); openAuth(null) }); await pg.settle(400);
      T(`⑤ ${L}：同一次打开里再点登录，不再出引导`, await pg.evaluate(() => !/比下载 App 更简单/.test(document.querySelector('#sheet').innerText)));
    } else {
      T(`⑤ ${L}：登录前拦截仍是旧弹层`, /先添加到主屏幕，再登录/.test(g.txt) && /不共用登录/.test(g.txt) && !/比下载 App 更简单/.test(g.txt), g.txt);
    }
    T(`⑤ ${L}：真实模式无脚本错误`, errs.length === 0, errs); await ctx.close();
  }
  await b.close(); console.log(`a2hs_entries: ${pass} 通过, ${fail} 失败`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1) });
