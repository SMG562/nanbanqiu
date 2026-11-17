// 添加到桌面引导 v2：iOS 16.4 以下收不到网页推送，三个入口（小卡片 / 通知页卡片 / 申请已发送按钮）不承诺「马上提醒」。
//   查什么：UA 为 iOS 16.0 / 16.4 / 18 / 读不到版本；开关开时文案按版本切换；开关关时一个字都不变。
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const DIR = process.env.NBQ_DIR || path.join(__dirname, '..', '..');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 500) : '')) };
const U = v => `Mozilla/5.0 (iPhone; CPU iPhone OS ${v} like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1`;
(async () => {
  const b = await chromium.launch({ executablePath: process.env.NBQ_CHROMIUM || '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  for (const flag of [true, false]) {
    const L = flag ? '开关开' : '开关关';
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
    if (flag) await ctx.addInitScript(() => { try { localStorage.setItem('nbq_ff_a2hs2', '1') } catch (_) { } });
    const pg = await ctx.newPage(), errs = []; pg.on('pageerror', e => errs.push(e.message));
    await pg.route('https://nanbanqiu.test/**', r => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: fs.readFileSync(path.join(DIR, '南伴球_PWA.html')) }));
    await pg.route('https://cdnjs.cloudflare.com/**', r => r.abort()); await pg.route('https://basemaps.cartocdn.com/**', r => r.abort());
    await pg.goto('https://nanbanqiu.test/'); await pg.settle(600);
    const o = await pg.evaluate(async (uas) => {
      setWho(Object.keys(USERS)[0], true); setEnv('safari'); PUSH.enabled = false; localStorage.removeItem('nbq_a2hs_ok'); localStorage.removeItem('nbq_a2hs_at');
      const gid = (GAMES.find(g => g.host === ME.id) || GAMES[0]).id, r = {};
      for (const [k, ua] of Object.entries(uas)) {
        Object.defineProperty(navigator, 'userAgent', { get: () => ua, configurable: true });
        const x = { ok: iosPushOk() };
        x.nudge = pushNudgeHTML('game').replace(/<[^>]+>/g, ' '); x.card = pushCardHTML().replace(/<[^>]+>/g, ' ');
        openApplied(gid); await new Promise(r => setTimeout(r, 300)); x.applied = document.querySelector('#sheet').innerText; closeSheet();
        r[k] = x }
      return r }, { '16.0': U('16_0'), '16.3.1': U('16_3_1'), '16.4': U('16_4'), '18': U('18_0'), none: 'Mozilla/5.0 (Linux; Android 14) Chrome/120 Mobile' });
    T(`${L}：版本判断 16.0/16.3.1 不支持，16.4/18/读不到 支持`, !o['16.0'].ok && !o['16.3.1'].ok && o['16.4'].ok && o['18'].ok && o.none.ok, o);
    for (const k of ['16.4', '18', 'none']) {
      const x = o[k];
      if (flag) T(`${L}：iOS ${k} 仍是「马上知道 / 收提醒 / 不错过回复」`, /有人回复你马上知道/.test(x.nudge) && /放到桌面就能收提醒/.test(x.card) && /放到桌面，不错过回复/.test(x.applied), x);
      else T(`${L}：iOS ${k} 旧说法不变`, /放到主屏幕后，才能像 App 一样收提醒/.test(x.nudge) && /放到主屏幕，像 App 一样收提醒/.test(x.card) && /添加到主屏幕，接收通知/.test(x.applied), x);
    }
    for (const k of ['16.0', '16.3.1']) {
      const x = o[k];
      if (flag) T(`${L}：iOS ${k} 不承诺提醒，改说「所有球局一眼看到」`, /所有球局，一眼看到/.test(x.nudge) && !/马上知道|第一时间知道|收提醒/.test(x.nudge) && /一眼看到/.test(x.card) && !/收提醒|马上知道/.test(x.card) && /放到桌面，所有球局一眼看到/.test(x.applied) && !/不错过回复/.test(x.applied), x);
      else T(`${L}：iOS ${k} 旧说法不变（开关关不动）`, /放到主屏幕后，才能像 App 一样收提醒/.test(x.nudge) && /添加到主屏幕，接收通知/.test(x.applied) && !/一眼看到/.test(x.nudge), x);
    }
    T(`${L}：无脚本错误`, errs.length === 0, errs); await ctx.close();
  }
  await b.close(); console.log(`a2hs_ios_ver: ${pass} 通过, ${fail} 失败`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1) });
