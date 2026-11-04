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
    const r = await pg.evaluate(async () => {
      if (typeof USERS === 'undefined' || !USERS) return { none: true };
      const uid = Object.keys(USERS).find(u => stats(u).badges.find(x => x.code === 'first' && x.cur)); const o = {}; if (!uid) return { none: true };
      setWho(uid, true); BDG_PERSIST = true; const log = [];
      nbqBadgeClaim = async c => { log.push('claim:' + c.join()); }; nbqBadgeSeen = async c => { log.push('seen:' + c); };
      const reset = () => { localStorage.removeItem('nbq_bdg_seen_' + uid); BDG = {}; BDG_SRV = false; BDG_FAIL = false; BDG_T = 0; BDG_SHOWN = new Set(); log.length = 0 };
      const flush = () => BDG_Q.then(() => 0);
      // C. 还没读到服务器记录：不判断
      reset(); bdgCheck(true); o.beforeLoad = bdgPending().length;
      // A. 服务器上 first 已庆祝：刷新后不弹、不重复记录
      reset(); nbqBadgesIn([{ code: 'first', earned_at: '2026-11-01T00:00:00Z', seen_at: '2026-11-01T00:01:00Z' }]); await flush();
      o.srvSeen = bdgPending().includes('first'); o.srvSeenClaims = log.filter(x => x.startsWith('claim:first')).length;
      // B. 服务器没有：新获得 → 待庆祝、记录获得；庆祝后记已庆祝（先 claim 后 seen）
      reset(); nbqBadgesIn([]); o.newPending = bdgPending().includes('first'); bdgShow(uid, 'first'); bdgClose(true); await flush();
      o.order = log.filter(x => /first/.test(x)).join('|');
      // 同一台设备再读一次服务器（已有 seen）：仍不弹
      nbqBadgesIn([{ code: 'first', earned_at: '2026-11-04T00:00:00Z', seen_at: '2026-11-04T00:00:01Z' }]); o.afterReload = bdgPending().includes('first');
      // E. 这台设备以前庆祝过（本机有记录）、服务器还没有：不弹，补记获得 + 已庆祝
      reset(); bdgSeenAdd(uid, 'first'); nbqBadgesIn([]); await flush(); o.legacyPending = bdgPending().includes('first'); o.legacyLog = log.filter(x => /first/.test(x)).join('|');
      // D. 服务器读失败：退回本机记录，不写服务器
      reset(); nbqBadgesIn(null); o.failPending = bdgPending().includes('first'); bdgShow(uid, 'first'); bdgClose(true); await flush(); o.failLog = log.length; o.failLocal = bdgSeenList(uid).includes('first');
      BDG_PERSIST = false; return o });
    T(`${f} 有演示用户`, !r.none, r);
    T(`${f} 还没读到服务器记录：先不判断（不会误弹）`, r.none || r.beforeLoad === 0, r);
    T(`${f} 服务器上已庆祝：刷新后不弹，也不重复记录`, r.none || (!r.srvSeen && r.srvSeenClaims === 0), r);
    T(`${f} 新获得：待庆祝；记录获得在前、已庆祝在后；再读一次不弹`, r.none || (r.newPending && /^claim:[^|]*first[^|]*\|seen:first$/.test(r.order) && !r.afterReload), r);
    T(`${f} 本机以前庆祝过、服务器没有：不弹，补记获得和已庆祝`, r.none || (!r.legacyPending && /claim:[^|]*first/.test(r.legacyLog) && /seen:first/.test(r.legacyLog)), r);
    T(`${f} 服务器读失败：退回本机记录，不写服务器`, r.none || (r.failPending && r.failLog === 0 && r.failLocal), r);
    T(`${f} 无脚本错误`, errs.length === 0, errs); await ctx.close();
  }
  await b.close(); console.log(`badge_seen: ${pass} 通过, ${fail} 失败`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1) });
