// 开启提醒页 / 被拒后指引的新风格（开关 NBQ_A2HS2_ON，11-15）。查：开关开 = 通知样例「Sam 同意了一起打球，周六 9:00 见」+ 开启通知 / 以后再说，只问一次；
//   被拒指引多一句「为什么要开」且仍是 3 步 + 我已打开；开关关 = 完全是旧文案。查不到：iOS 真机上的实际样子。
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const DIR = process.env.NBQ_DIR || path.join(__dirname, '..', '..');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 400) : '')) };
(async () => {
  const b = await chromium.launch({ executablePath: process.env.NBQ_CHROMIUM || '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  for (const flag of [true, false]) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    if (flag) await ctx.addInitScript(() => { try { localStorage.setItem('nbq_ff_a2hs2', '1') } catch (_) { } });
    const pg = await ctx.newPage(), errs = []; pg.on('pageerror', e => errs.push(e.message));
    await pg.route('https://nanbanqiu.test/**', r => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: fs.readFileSync(path.join(DIR, '南伴球_PWA.html')) }));
    await pg.route('https://cdnjs.cloudflare.com/**', r => r.abort()); await pg.route('https://basemaps.cartocdn.com/**', r => r.abort());
    await pg.goto('https://nanbanqiu.test/'); await pg.settle(500); await pg.evaluate(() => { try { LOC.asked = true; openLocSheet = function () { } } catch (_) { } });   // 演示账号会自己弹定位面板，与本测试无关
    const L = flag ? '开' : '关';
    const ask = async () => { await pg.evaluate(() => { try { localStorage.removeItem('nbq_push_asked') } catch (_) { } Object.defineProperty(Notification, 'permission', { configurable: true, get: () => 'default' }); setWho(Object.keys(USERS)[0], true); setEnv('pwa'); PUSH.enabled = false }); await pg.settle(400);
      for (let i = 0; i < 6; i++) {   // 演示账号会自己弹别的面板（定位 / 徽章等）：pnAfterLogin 按设计不打断，所以关掉再试
        await pg.evaluate(() => { document.querySelector('#sheet').classList.remove('show'); try { localStorage.removeItem('nbq_push_asked') } catch (_) { } pnAfterLogin() });
        if (await pg.waitForFunction(() => !!document.querySelector('#sheet.show [data-a="enablePush"]'), null, { timeout: 1500 }).then(() => true, () => false)) break } };
    await ask();
    const t = await pg.evaluate(() => (document.querySelector('#sheet') || document.body).innerText);
    T(`开关${L}：有开启通知 / 以后再说`, /开启通知/.test(t) && /以后再说/.test(t), t);
    T(`开关${L}：${flag ? '有通知样例，没有旧文案' : '旧文案，没有样例'}`, flag ? /Sam 同意了一起打球，周六 9:00 见/.test(t) && /有人回复，马上知道/.test(t) && !/第一时间告诉你/.test(t) : /第一时间告诉你/.test(t) && !/Sam 同意/.test(t), t);
    await pg.evaluate(() => document.querySelector('#sheet').classList.remove('show')); await pg.settle(400);
    await pg.evaluate(() => pnAfterLogin()); await pg.settle(300);
    T(`开关${L}：只问一次`, await pg.evaluate(() => !document.querySelector('#sheet.show [data-a="enablePush"]')));
    await pg.evaluate(() => { closeSheet(); openPushDenied() }); await pg.settle(400);
    const d = await pg.evaluate(() => ({ t: (document.querySelector('#sheet') || document.body).innerText, n: document.querySelectorAll('.pdsteps li').length, r: !!document.querySelector('[data-a="pushRecheck"]') }));
    T(`开关${L}：被拒指引仍是 3 步 + 我已打开`, d.n === 3 && d.r, d);
    T(`开关${L}：被拒指引${flag ? '带「为什么要开」' : '是旧文案'}`, flag ? /球友同意或回复你时/.test(d.t) : /需要通知才能第一时间告诉你/.test(d.t), d.t);
    T(`开关${L}：没有脚本错误`, !errs.length, errs); await ctx.close();
  }
  await b.close(); console.log(`push_v2: ${pass} 通过, ${fail} 失败`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1) });
