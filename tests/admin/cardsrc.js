// 第三批 3e：每张卡片都登记了数据源（标题旁 ⓘ），登记的每个数据源都在 schema.sql 里有定义（表 / 视图 / 函数）。
// 走遍所有页面、子标签、时间范围（今天 / 30 天）和概览的 6 个指标；数据口径页的清单与登记一致。
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const DIR = process.env.NBQ_DIR || path.join(__dirname, '..', '..');
const FILE = path.join(DIR, '南伴球_后台.html'), sch = fs.readFileSync(path.join(DIR, 'schema.sql'), 'utf8');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 600) : '')) };
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] }), p = await b.newPage({ viewport: { width: 1360, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + FILE); await p.waitForTimeout(600);
  const r = await p.evaluate(() => { doLogin({ preventDefault() {} }); clearInterval(window._tk); const miss = [], used = new Set(), dup = [];
    const subs = { review: [['tab2', 'venues'], ['tab2', 'reports']], venues: [['vtab', 'venues'], ['vtab', 'walls']], events: [['tab2', 'events'], ['tab2', 'metrics'], ['tab2', 'flow'], ['tab2', 'cards']] };
    let cards = 0;
    for (const rg of [1, 30]) for (const mt of ['dau', 'nu', 'games', 'apps', 'applicants', 'msgs']) PAGES.filter(x => x[0] !== 'h').forEach(([pg]) => (subs[pg] || [[null, null]]).forEach(([k, v]) => {
      S.page = pg; S.range = rg; S.metric = mt; if (k) S[k] = v; render();
      document.querySelectorAll('#page .card').forEach(c => { cards++; const x = cardSrcOf(pg, c), n = c.querySelectorAll('.srci').length - c.querySelectorAll('.card .card .srci').length;
        if (!x || !c.querySelector('.srci')) miss.push(pg + '/' + (k ? v : '') + ': ' + (c.querySelector('.l,.ch b') || { textContent: c.className }).textContent.trim().slice(0, 30)); else x.src.forEach(s => used.add(s));
        if (n > 1) dup.push(pg + ': ' + c.className) }) }));
    // 清单页的行数 = 登记数
    S.page = 'events'; S.tab2 = 'cards'; render(); const rows = document.querySelectorAll('[data-cardsrc] tbody tr').length, reg = Object.values(CARDSRC).reduce((a, m) => a + Object.keys(m).length, 0);
    const all = new Set(); Object.values(CARDSRC).forEach(m => Object.values(m).forEach(v => v[0].forEach(s => all.add(s))));
    return { miss: [...new Set(miss)], used: [...used], all: [...all], dup: [...new Set(dup)], rows, reg, cards } });
  const has = n => { const b0 = n.replace('()', ''); return new RegExp(`create (or replace )?(materialized )?(view|table|function)( if not exists)? ${b0}\\b`).test(sch) };
  const meta = s => /^[A-Z]/.test(s);   // CARDSRC 本身（清单页）不是数据库对象
  T('每张卡片都有数据源和 ⓘ', r.miss.length === 0, r.miss);
  T('一张卡片只有一个 ⓘ', r.dup.length === 0, r.dup);
  T('登记的数据源都在 schema.sql 里', r.all.filter(s => !meta(s) && !has(s)).length === 0, r.all.filter(s => !meta(s) && !has(s)));
  T('清单页逐条列出登记', r.rows === r.reg && r.reg > 150, [r.rows, r.reg]);
  T('没有页面错误', !errs.length, errs);
  console.log(`INFO cards=${r.cards} registered=${r.reg} sources=${r.all.length}`);
  console.log(`${pass} passed, ${fail} failed`); await b.close(); process.exit(fail ? 1 : 0);
})();
