// 全量巡检：每页 × 范围 × 平台 × 标签 / 抽屉；三种宽度
const { chromium } = require('playwright');
const FILE = process.argv[2] || require('path').join(process.env.NBQ_DIR || require('path').join(__dirname,'..','..'), '南伴球_后台.html');
const WIDTHS = (process.argv[3] || '1360,1024,390').split(',').map(Number);
(async () => {
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const issues = []; let checks = 0;
  for (const W of WIDTHS) {
    const pg = await br.newPage({ viewport: { width: W, height: 900 } });
    const errs = [];
    pg.on('pageerror', e => errs.push(String(e && e.stack || e)));
    pg.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()) });
    await pg.goto('file://' + FILE);
    await pg.evaluate(() => { doLogin({ preventDefault() {} }); clearInterval(window._tk) });
    const pages = await pg.evaluate(() => PAGES.filter(p => p[0] !== 'h').map(p => p[0]));
    const ranges = await pg.evaluate(() => RANGES.map(r => r[0]));
    // 每页的子视图：[描述, 进入前执行的 JS]
    const sub = {
      events: [['events', "S.tab2='events'"], ['metrics', "S.tab2='metrics'"], ['flow', "S.tab2='flow'"]],
      review: [['venues', "S.tab2='venues'"], ['reports', "S.tab2='reports'"]],
      venues: [['db', "S.vtab='venues';S.vf='all';S.vsub=null"], ['walls', "S.vtab='walls'"], ['open', "S.vtab='venues';S.vf='open'"], ['todo', "S.vf='todo'"], ['nosub', "S.vf='nosub'"], ['pending', "S.vf='pending'"], ['vsub', "S.vf='all';S.vsub='Glen Iris'"]],
      users: [['all', "S.ust='all'"], ['limited', "S.ust='limited'"], ['banned', "S.ust='banned'"], ['sort-play', "S.ust='all';S.usort='play'"], ['p2', "S.usort='score';S.pg.users=2"]],
      cards: [['rules', 'S.cfAll=false'], ['allrules', 'S.cfAll=true']],
      regions: ['score', 'games', 'played', 'players', 'nu', 'chg'].map(k => ['rs-' + k, `S.rsort='${k}'`]),
      overview: ['dau', 'nu', 'games', 'apps', 'applicants', 'msgs'].map(k => ['mt-' + k, `S.metric='${k}'`]),
    };
    for (const p of pages) for (const r of ranges) for (const pl of ['all', 'pwa', 'web']) {
      const views = sub[p] || [['-', '0']];
      for (const [vn, js] of views) {
        const tag = `${W}px ${p}/${vn} range=${r} plat=${pl}`;
        errs.length = 0;
        const res = await pg.evaluate(([p, r, pl, js]) => {
          const TXT = el => { const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); const a = []; let n; while ((n = w.nextNode())) { if (n.parentElement && n.parentElement.closest('script,style')) continue; const t = n.textContent.trim(); if (t) a.push(t) } return a.join('\n') };
          S.page = p; S.range = r; S.plat = pl; eval(js); render();
          const txt = TXT(document.getElementById('page')) + '\n' + TXT(document.getElementById('nav'));
          return { txt, sw: document.documentElement.scrollWidth, iw: innerWidth };
        }, [p, r, pl, js]);
        checks++;
        const bad = scan(res.txt);
        if (bad.length) issues.push(tag + ' TEXT ' + bad.slice(0, 4).join(' | '));
        if (res.sw > res.iw) issues.push(tag + ` OVERFLOW scrollWidth=${res.sw} > ${res.iw}`);
        if (errs.length) issues.push(tag + ' ERROR ' + errs.join(' || ').slice(0, 400));
      }
    }
    // 抽屉：每种范围下打开几个用户抽屉、所有风险用户、几个球场抽屉
    for (const r of [1, 7, 158]) {
      errs.length = 0;
      const out = await pg.evaluate(async (r) => {
        const o = []; S.range = r; S.plat = 'all'; const TXT = el => { const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); const a = []; let n; while ((n = w.nextNode())) { const t = n.textContent.trim(); if (t) a.push(t) } return a.join('\n') };
        const ids = [...USERS.slice(0, 6).map(u => u.id), ...RISK.map(x => x.uid), ...['review', 'limited', 'suspended', 'banned', 'deleted'].map(st => (USERS.find(u => u.st === st) || {}).id).filter(Boolean), (USERS.find(u => b1g(u).m2f) || USERS[0]).id];
        for (const id of ids) { openUD(id); const t = TXT(document.querySelector('#ud .ud')); o.push(['ud:' + id, t, document.documentElement.scrollWidth, innerWidth]);
          for (const st of ['review', 'limited', 'suspended', 'banned', 'active']) { const b = document.querySelector(`[data-udst="${st}"]`); if (b) { b.click(); o.push(['udform:' + id + ':' + st, TXT(document.querySelector('#ud .ud')), document.documentElement.scrollWidth, innerWidth]) } }
          closeUD() }
        for (const v of VENUES.slice(0, 5).concat(VENUES.filter(v => v[6] === 'pending'))) { openVD(v[0]); o.push(['vd:' + v[0], TXT(document.querySelector('#ud .ud')), document.documentElement.scrollWidth, innerWidth]); closeUD() }
        return o
      }, r);
      for (const [k, t, sw, iw] of out) { checks++; const bad = scan(t); if (bad.length) issues.push(`${W}px drawer ${k} r=${r} TEXT ${bad.slice(0, 3).join(' | ')}`); if (sw > iw) issues.push(`${W}px drawer ${k} OVERFLOW ${sw}>${iw}`) }
      if (errs.length) issues.push(`${W}px drawers r=${r} ERROR ` + errs.join(' || ').slice(0, 400));
    }
    // 实时 tick 跑一会儿
    errs.length = 0;
    await pg.evaluate(() => { S.page = 'overview'; S.range = 1; for (let i = 0; i < 60; i++) tick(); render() });
    if (errs.length) issues.push(`${W}px tick ERROR ` + errs.join(' || ').slice(0, 300));
    await pg.close();
  }
  await br.close();
  console.log(`checks=${checks} issues=${issues.length}`);
  issues.slice(0, 200).forEach(x => console.log(' -', x));
  process.exit(issues.length ? 1 : 0);
})();
function scan(t) {
  const out = [];
  for (const w of ['NaN', 'undefined', 'Infinity', 'null']) if (t.includes(w)) { const i = t.indexOf(w); out.push(w + ': …' + t.slice(Math.max(0, i - 30), i + 20).replace(/\n/g, '⏎') + '…') }
  // 负数（排除日期、UUID、区间 1-2）
  const neg = /(^|[^\w\-.:/#])[-−](\d[\d,.]*)/g; let m;
  while ((m = neg.exec(t))) { const ctx = t.slice(Math.max(0, m.index - 20), m.index + 15).replace(/\n/g, '⏎'); if (/[−-]\s?爽约|−10|× -/.test(ctx)) continue; out.push('neg: …' + ctx + '…') }
  // 系统状态「骤降」两行是和平时的比值，可以超过 100%
  const pc = /(\d+(?:\.\d+)?)%/g;
  while ((m = pc.exec(t))) if (+m[1] > 100 && !/[▲▼+]\s*$/.test(t.slice(Math.max(0, m.index - 3), m.index)) && !/骤降\n$/.test(t.slice(Math.max(0, m.index - 4), m.index))) out.push('pct>100: …' + t.slice(Math.max(0, m.index - 25), m.index + 8).replace(/\n/g, '⏎') + '…');
  return out
}
