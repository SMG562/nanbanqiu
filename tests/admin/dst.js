// 4b 夏令时 · 后台：天的边界 = 墨尔本 0 点；球局 / 邀约的开打时间是墙上的整点或半点；「昨天同一时刻」按墙上时间；
// 由 run_all 在夏令时开始当天（10-04）和结束当天（04-04）各跑一次（NBQ_TS）
const { chromium } = require('playwright');
const path = require('path');
const FILE = path.join(process.env.NBQ_DIR || path.join(__dirname, '..', '..'), '南伴球_后台.html');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 400) : '')) };
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox'] }), p = await b.newPage({ viewport: { width: 1360, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.goto('file://' + FILE); await p.waitForTimeout(600);
  const r = await p.evaluate(() => { doLogin({ preventDefault() {} }); clearInterval(window._tk); const D = DB, bad = {}, B = (k, ok, x) => { if (!ok) (bad[k] = bad[k] || []).length < 3 && bad[k].push(x) };
    const lens = new Set();
    for (let d = 0; d <= D.L + 8; d++) { const t = new Date(D.dms(d)); B('每天从当地 0 点开始', t.getHours() === 0 && t.getMinutes() === 0, [d, t.toString()]);
      B('dayOf(0 点) = 这一天', D.dayOf(D.dms(d)) === d, d); B('dayOf(下一天 0 点前 1 毫秒) = 这一天', D.dayOf(D.dms(d + 1) - 1) === d, d); lens.add((D.dms(d + 1) - D.dms(d)) / 36e5) }
    D.games.forEach(g => { const t = new Date(g.starts_at); B('开打时间是整点或半点', t.getMinutes() % 30 === 0 && t.getSeconds() === 0, t.toString()); B('开打在 6–22 点', t.getHours() >= 6 && t.getHours() <= 22, t.toString()) });
    D.invites.forEach(i => { if (i.starts_at == null) return; const t = new Date(i.starts_at); B('邀约时间是整点或半点', t.getMinutes() % 30 === 0, t.toString()) });
    const now = +NOW, y = new Date(D.ago(now, 1)), n = new Date(now); B('昨天同一时刻 = 墙上同一时间', y.getHours() === n.getHours() && y.getMinutes() === n.getMinutes() && D.dayOf(+y) === D.L - 1, [y.toString(), n.toString()]);
    // 所有页面在今天 / 7 天下都能打开
    const subs = { review: ['venues', 'reports'], events: ['events', 'metrics', 'flow', 'cards'] };
    for (const rg of [1, 7]) PAGES.filter(x => x[0] !== 'h').forEach(([pg]) => (subs[pg] || [null]).forEach(v => { S.page = pg; S.range = rg; if (v) S.tab2 = v; render() }));
    const td = todayNow(); B('今天面板自洽', td.filled + td.short === td.left && td.soon <= td.short && td.exp <= td.pend, td);
    return { bad, lens: [...lens].sort(), now: n.toString() } });
  for (const [k, v] of Object.entries(r.bad)) T(k, false, v);
  T('天的边界与开打时间全部正确', !Object.keys(r.bad).length, Object.keys(r.bad));
  T('区间里出现了 23 或 25 小时的一天（确实跨过夏令时）', r.lens.some(x => x !== 24), r.lens);
  T('没有页面错误', !errs.length, errs);
  console.log('INFO now=' + r.now + ' dayLengths=' + r.lens.join(','));
  console.log(`${pass} passed, ${fail} failed`); await b.close(); process.exit(fail ? 1 : 0);
})();
