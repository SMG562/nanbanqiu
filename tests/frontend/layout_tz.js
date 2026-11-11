// 排版守卫（11-09 逃逸：手机不在墨尔本时区时，球局卡片「当地 05:30」和「1.5 小时」挤在 50px 的时间栏里互相压住）。
// 为什么以前漏：所有浏览器测试都固定在墨尔本时区（preload），「当地 HH:MM」这条分支从没被画出来过。
// 做法：两端在几个真实会遇到的时区（墨尔本本地 / 珀斯 / 上海 / 洛杉矶）× 几种屏宽下打开，
//   把列表卡片、详情头部里每一段文字的实际位置量出来：两段文字不许互相压住；文字不许跑出卡片（带省略号的除外）。
//   检查是通用的：以后卡片里加任何东西，只要压住了就会红，不用为每个字段单独写断言。
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const DIR = process.env.NBQ_DIR || path.join(__dirname, '..', '..');
let pass = 0, fail = 0;
const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 700) : '')) };
const TZS = ['Australia/Melbourne', 'Australia/Perth', 'Asia/Shanghai', 'America/Los_Angeles'];
// 在页面里量：roots 里每张卡，取所有可见文字段的矩形
function measure(sel) {
  const out = [];
  const vis = el => { const s = getComputedStyle(el); return s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > 0.05 };
  document.querySelectorAll(sel).forEach((root, ri) => {
    const rr = root.getBoundingClientRect(); if (rr.width < 2 || rr.height < 2 || !vis(root)) return;
    const segs = []; const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n; (n = w.nextNode());) {
      const t = n.nodeValue.trim(); if (!t) continue; const p = n.parentElement; if (!p || !vis(p)) continue;
      const ps = getComputedStyle(p), ell = ps.textOverflow === 'ellipsis' || getComputedStyle(p.closest('*')).textOverflow === 'ellipsis';
      const rg = document.createRange(); rg.selectNodeContents(n);
      for (const r of rg.getClientRects()) if (r.width > 0.5 && r.height > 0.5) segs.push({ t: t.slice(0, 24), node: n, l: r.left, r: r.right, tp: r.top, b: r.bottom, ell });
    }
    const bad = [];
    for (let i = 0; i < segs.length; i++) {
      const a = segs[i];
      if (!a.ell && (a.l < rr.left - 1 || a.r > rr.right + 1)) bad.push(['出卡片', a.t]);
      for (let j = i + 1; j < segs.length; j++) { const b = segs[j]; if (b.node === a.node) continue;   // 同一段文字换行后的上下两行不算
        const ox = Math.min(a.r, b.r) - Math.max(a.l, b.l), oy = Math.min(a.b, b.b) - Math.max(a.tp, b.tp);
        if (ox > 1.5 && oy > 3) bad.push(['压住', a.t, b.t]) }
    }
    if (bad.length) out.push({ card: ri, text: root.innerText.replace(/\s+/g, ' ').slice(0, 60), bad: bad.slice(0, 3) });
  });
  return out;
}
(async () => {
  const b = await chromium.launch({});
  const errs = [];
  for (const f of ['PWA', 'Web']) {
    const W = f === 'Web', HTML = fs.readFileSync(path.join(DIR, '南伴球_' + f + '.html'));
    for (const tz of TZS) for (const vw of (W ? [1280, 1024] : [320, 390])) {
      const ctx = await b.newContext({ viewport: { width: vw, height: W ? 860 : 844 }, timezoneId: tz });
      const p = await ctx.newPage(); p.on('pageerror', x => errs.push(f + ' ' + x.message));
      await p.route('https://nanbanqiu.test/**', r => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: HTML }));
      await p.route('https://cdnjs.cloudflare.com/**', r => r.abort()); await p.route('https://basemaps.cartocdn.com/**', r => r.abort());
      await p.goto('https://nanbanqiu.test/'); await p.settle(900);
      await p.evaluate(() => { try { closeSheet() } catch (_) { } try { closeModal() } catch (_) { } });
      const tag = `${f} ${tz} ${vw}px`;
      let lt = 0;
      // 列表：把每一天都画一遍
      const listSel = W ? '.gc' : '.gr';
      let n = 0;
      for (let d = 0; d < (W ? 1 : 7); d++) {
        if (!W) { await p.evaluate(d => { UI.day = d; renderDisc() }, d); await p.settle(150) }
        const exp = await p.$$('[data-exp]'); for (const e of exp) { try { await e.click(); await p.settle(100) } catch (_) { } }
        n += await p.evaluate(s => document.querySelectorAll(s).length, listSel);
        lt += await p.evaluate(() => document.querySelectorAll('.lt').length);
        const bad = await p.evaluate(measure, listSel);
        T(`${tag} 球局列表（第 ${d} 天）没有文字压住 / 出卡片`, bad.length === 0, bad);
      }
      T(tag + ' 前提：列表里有球局卡', n > 0, n);
      if (tz !== 'Australia/Melbourne') T(tag + ' 前提：确实画出了「当地时间」（不然等于没测）', lt > 0, lt);
      else T(tag + ' 墨尔本本地不显示「当地时间」', lt === 0, lt);
      // 详情头部
      const id = await p.evaluate(() => (api.list().find(c => !c.past) || {}).id);
      if (id) {
        await p.evaluate(id => { if (typeof openDetail === 'function') openDetail(id); else { UI.sel = id; render() } }, id); await p.settle(400);
        // 不写死选择器（写死会选空、等于没测）：从每个看得见的「当地时间」往上找它所在的卡片 / 行，逐个量
        const roots = await p.evaluate(() => { let k = 0; document.querySelectorAll('[data-lt-root]').forEach(e => e.removeAttribute('data-lt-root'));
          document.querySelectorAll('.lt').forEach(e => { if (!e.offsetParent) return; const r = e.closest('.gr,.gc,.pass,.card,li,button') || e.parentElement; if (!r.hasAttribute('data-lt-root')) { r.setAttribute('data-lt-root', ''); k++ } }); return k });
        if (tz !== 'Australia/Melbourne') T(`${tag} 前提：详情里量到了带当地时间的区块`, roots > 0, roots);
        const bad = await p.evaluate(measure, '[data-lt-root]');
        T(`${tag} 球局详情里带当地时间的区块没有文字压住`, bad.length === 0, bad);
      }
      await ctx.close();
    }
  }
  T('没有页面报错', errs.length === 0, errs);
  console.log(`layout_tz: ${pass} passed, ${fail} failed`); await b.close(); process.exit(fail ? 1 : 0);
})();
