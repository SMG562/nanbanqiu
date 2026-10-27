// 4b 夏令时：墨尔本 10 月第一个周日 2:00→3:00（那天 23 小时）、4 月第一个周日 3:00→2:00（那天 25 小时）
// 两端：夜间顺延必须落在墨尔本 8:00；连续周数跨过夏令时那周不断；「今天 / 明天」按日历天
const { chromium } = require('playwright');
const path = require('path');
const DIR = process.env.NBQ_DIR || path.join(__dirname, '..', '..');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 400) : '')) };
const at = s => +new Date(s);
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox'] });
  for (const F of ['南伴球_PWA.html', '南伴球_Web.html']) {
    const p = await b.newPage({ viewport: { width: F.includes('PWA') ? 390 : 1360, height: 900 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto('file://' + path.join(DIR, F)); await p.waitForTimeout(500);
    const cases = [
      ['夏令时开始前一晚 22:30 → 次日 8:00（+11）', at('2026-10-03T22:30:00+10:00'), at('2026-10-04T08:00:00+11:00')],
      ['夏令时开始当天凌晨 1:30 → 8:00（+11）', at('2026-10-04T01:30:00+10:00'), at('2026-10-04T08:00:00+11:00')],
      ['夏令时开始当天凌晨 4:00 → 8:00', at('2026-10-04T04:00:00+11:00'), at('2026-10-04T08:00:00+11:00')],
      ['夏令时结束前一晚 23:00 → 次日 8:00（+10）', at('2027-04-03T23:00:00+11:00'), at('2027-04-04T08:00:00+10:00')],
      ['夏令时结束当天凌晨 2:30（第二次）→ 8:00', at('2027-04-04T02:30:00+10:00'), at('2027-04-04T08:00:00+10:00')],
      ['平常的夜里 22:30 → 次日 8:00', at('2026-10-14T22:30:00+11:00'), at('2026-10-15T08:00:00+11:00')],
      ['白天不顺延', at('2026-10-14T15:10:00+11:00'), at('2026-10-14T15:10:00+11:00')],
    ];
    const r = await p.evaluate(({ cases, games }) => {
      const q = cases.map(([n, t, want]) => [n, nrQuiet(t), want]);
      // 连续周数：今天是夏令时开始后那周的周三，上周（夏令时那周，167 小时）和再上两周都打过，本周还没打
      const oG = grPlayed, oN = Date.now; const res = {};
      for (const [k, now, gs] of games) { grPlayed = () => gs.map(s => ({ starts_at: s, status: 'completed' })); Date.now = () => now; try { res[k] = bdgStreak('x') } catch (e) { res[k] = 'ERR ' + e.message } }
      grPlayed = oG; Date.now = oN;
      return { q, res };
    }, { cases, games: [
      ['spring', at('2026-10-07T12:00:00+11:00'), ['2026-09-30T18:00:00+10:00', '2026-09-23T18:00:00+10:00', '2026-09-16T18:00:00+10:00']],
      ['spring-thisweek', at('2026-10-07T12:00:00+11:00'), ['2026-10-06T18:00:00+11:00', '2026-09-30T18:00:00+10:00', '2026-09-23T18:00:00+10:00']],
      ['autumn', at('2027-04-07T12:00:00+10:00'), ['2027-03-31T18:00:00+11:00', '2027-03-24T18:00:00+11:00']],
    ] });
    const tag = F.includes('PWA') ? 'PWA' : 'Web';
    r.q.forEach(([n, got, want]) => T(`${tag} 夜间顺延：${n}`, got === want, { got: new Date(got).toString(), want: new Date(want).toString() }));
    T(`${tag} 连续周数跨夏令时开始那周（本周未打）= 3`, r.res.spring === 3, r.res);
    T(`${tag} 连续周数跨夏令时开始那周（本周已打）= 3`, r.res['spring-thisweek'] === 3, r.res);
    T(`${tag} 连续周数跨夏令时结束那周 = 2`, r.res.autumn === 2, r.res);
    T(`${tag} 没有页面错误`, !errs.length, errs);
    await p.close();
  }
  console.log(`${pass} passed, ${fail} failed`); await b.close(); process.exit(fail ? 1 : 0);
})();
