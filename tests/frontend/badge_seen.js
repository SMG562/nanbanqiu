// 徽章「庆祝过」刷新后不再重复弹（真实模式记在本机；11-04 你发现：点了收下 / 分享，刷新后「首场」又出现）
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const DIR = process.env.NBQ_DIR || path.join(__dirname, '..', '..');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 500) : '')) };
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  for (const f of ['南伴球_PWA.html', '南伴球_Web.html']) {
    const W = f.includes('Web'), ctx = await b.newContext({ viewport: W ? { width: 1360, height: 860 } : { width: 390, height: 844 } });
    const pg = await ctx.newPage(), errs = []; pg.on('pageerror', e => errs.push(e.message));
    await pg.route('https://nanbanqiu.test/**', r => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: fs.readFileSync(path.join(DIR, f)) }));
    await pg.route('https://cdnjs.cloudflare.com/**', r => r.abort()); await pg.route('https://basemaps.cartocdn.com/**', r => r.abort());
    await pg.goto('https://nanbanqiu.test/'); await pg.settle(500);
    const r = await pg.evaluate(() => {
      if (typeof USERS === 'undefined' || !USERS) return { none: true, why: typeof USERS }; const uid = Object.keys(USERS).find(u => stats(u).badges.find(x => x.code === 'first' && x.cur)); const o = {}; if (!uid) return { none: true };
      setWho(uid, true); localStorage.removeItem('nbq_bdg_seen_' + uid); BDG_PERSIST = true;
      // 「刷新」= 内存里的徽章记录清空后重新计算
      const reload = () => { BDG[uid] = {}; BDG_T = 0; bdgCheck(true) };
      reload(); o.firstPending = bdgPending().includes('first');
      bdgShow(uid, 'first'); bdgClose(true); o.stored = bdgSeenList(uid).includes('first');
      reload(); o.afterReload = bdgPending().includes('first');
      // 没点过的徽章刷新后仍然待庆祝
      BDG[uid] = {}; localStorage.removeItem('nbq_bdg_seen_' + uid); BDG_T = 0; bdgCheck(true); o.stillNew = bdgPending().includes('first');
      // 关闭持久化（演示）：不写本机
      BDG_PERSIST = false; localStorage.removeItem('nbq_bdg_seen_' + uid); BDG[uid] = {}; BDG_T = 0; bdgCheck(true); bdgShow(uid, 'first'); bdgClose(true); o.demoNoStore = !bdgSeenList(uid).length;
      return o });
    T(`${f} 有演示用户`, !r.none, r); T(`${f} 首次获得：待庆祝`, r.none || r.firstPending, r);
    T(`${f} 点过「收下了」：记在本机，刷新后不再待庆祝`, r.none || (r.stored && !r.afterReload), r);
    T(`${f} 没看过的刷新后仍会庆祝；演示模式不写本机`, r.none || (r.stillNew && r.demoNoStore), r);
    T(`${f} 无脚本错误`, errs.length === 0, errs); await ctx.close();
  }
  await b.close(); console.log(`badge_seen: ${pass} 通过, ${fail} 失败`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1) });
