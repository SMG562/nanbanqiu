// 第五批 5a-3：页面注入（XSS）。把「用户写的内容」全部换成恶意字符串（昵称、姓氏首字母、微信号、球局说明、申请留言、婉拒说明、
// 邀约附言 / 场地、私信、球场名、举报说明），然后跑两端的各个页面、每个球局详情、每张球员卡、每个对话和全部演示，
// 检查：页面里没有多出任何元素或属性（.xssp / [data-xss]），图片 onerror 没有执行（window.__X），没有报错。
const { chromium } = require('playwright'); const path = require('path');
const DIR = process.env.NBQ_DIR || path.join(__dirname, '..', '..');
const ONLY = process.env.XSS_ONLY;   // 调试用：只跑一端
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] }); let bad = 0, checks = 0; const leaks = new Map();
  for (const [p, vp] of [['PWA', { width: 390, height: 844 }], ['Web', { width: 1360, height: 860 }]]) {
    if (ONLY && ONLY !== p) continue;
    const ctx = await b.newContext({ viewport: vp }); await ctx.addInitScript(() => { window.AN_LOG = []; window.__X = 0 });
    const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', x => errs.push(x.message)); pg.on('dialog', d => { window.__dlg = 1; d.dismiss() });
    const url = 'file://' + path.join(DIR, '南伴球_' + p + '.html');
    // 在页面里：投毒 + 跑一遍各个界面，每一步之后检查
    const install = () => pg.evaluate(() => {
      const P = ` <i class="xssp"></i><img src="x:" class="xssp" onerror="window.__X++">" data-xss="1" ' data-xss='1' `;
      const KEYS = new Set(['name', 'last', 'wechat', 'note', 'message', 'decline_note', 'body', 'text', 'venue_name', 'short', 'reason_note', 'counter_venue_name', 'msg', 'detail']);
      const hit = o => { if (!o || typeof o !== 'object') return; for (const k of Object.keys(o)) { const v = o[k]; if (typeof v === 'string' && KEYS.has(k) && !v.includes('xssp')) o[k] = v + P } };
      window.__poison = () => {
        try { Object.values(USERS || {}).forEach(hit) } catch (e) { }
        for (const n of ['GAMES', 'PARTS', 'INVITES', 'MSGS', 'THREADS', 'REPORTS']) try { const a = eval(n); if (Array.isArray(a)) a.forEach(hit) } catch (e) { }
        try { Object.values(VEN).forEach(hit) } catch (e) { }
      };
      window.__check = (step) => {
        const els = [...document.querySelectorAll('.xssp,[data-xss]')];
        return { step, n: els.length, x: window.__X, ex: els.slice(0, 2).map(e => (e.parentElement || e).outerHTML.slice(0, 220)) };
      };
      const os = seed; window.seed = function () { const r = os.apply(this, arguments); __poison(); return r };
      if (typeof seedChat === 'function') { const oc = seedChat; window.seedChat = function () { const r = oc.apply(this, arguments); __poison(); return r } }
      __poison();
    });
    const tour = (label, full) => pg.evaluate(async ([label, full]) => {
      let skipped = 0; const out = [], W = typeof openModal === 'function', detail = typeof openDetail === 'function' ? openDetail : select, wait = ms => new Promise(r => setTimeout(r, ms));
      const close = () => { try { W ? closeModal() : closeSheet() } catch (e) { } };
      const step = async (name, f) => { const x0 = window.__X; try { __poison(); await f(); await wait(40); } catch (e) { skipped++ } const c = __check(label + ' · ' + name); c.x -= x0; if (c.n || c.x) out.push(c); close() };
      for (const who of full ? ['han', 'jason'] : ['han']) {
        setWho(who, true);
        for (const t of ['disc', 'mine', 'notif', 'me']) await step(who + ' 页签 ' + t, () => { const x = document.querySelector(`[data-tab="${t}"]`); x && x.click(); render() });
        if (!full) { for (const g of GAMES.filter(g => !/^[hk]\d/.test(g.id)).slice(-4)) await step(who + ' 球局 ' + g.id, () => detail(g.id)); continue }
        for (const g of GAMES.slice(0, 40)) { await step(who + ' 球局 ' + g.id, () => detail(g.id)); if (typeof openApplied === 'function') await step(who + ' 已申请 ' + g.id, () => openApplied(g.id)) }
        for (const u of Object.keys(USERS)) await step(who + ' 球员卡 ' + u, () => openCard(u));
        if (typeof THREADS !== 'undefined') for (const t of THREADS) await step(who + ' 对话 ' + t.id, () => openThread(t.id));
        for (const f of ['openCommunity', 'openBlocklist', 'openClubs', 'openSafety', 'openCustom', 'openNewProfile', 'openFilter', 'openCreate']) if (typeof window[f] === 'function') await step(who + ' ' + f, () => window[f]());
        for (const g of GAMES.slice(0, 12)) { if (typeof openShare === 'function') await step(who + ' 分享 ' + g.id, () => openShare(g.id)); if (typeof openApply === 'function') await step(who + ' 申请 ' + g.id, () => openApply(g.id)) }
        for (const u of Object.keys(USERS).slice(0, 6)) if (typeof openInvite === 'function') await step(who + ' 约球 ' + u, () => openInvite(u));
        if (typeof INVITES !== 'undefined') for (const i of INVITES) await step(who + ' 邀约通知 ' + i.id, () => { setWho(i.to_user || who, true); const x = document.querySelector('[data-tab="notif"]'); x && x.click(); render() });
      }
      return out;
    }, [label, full]);
    // 1) 基本数据
    await pg.goto(url); await pg.settle(700); await install(); await pg.evaluate(() => { seed(); if (typeof seedChat === 'function') seedChat(); render() });
    for (const r of await tour('基本', true)) { leaks.set(p + ' · ' + r.step, r) } checks++;
    // 1b) 地址栏参数：推送打开（n / k）、分享来源（s / f）、球局 / 球员卡路径
    { const PQ = encodeURIComponent(`"><i class="xssp"></i><img src="x:" class="xssp" onerror="window.__X++">' data-xss='1`);
      for (const tail of [`?n=${PQ}&k=${PQ}&s=${PQ}&f=${PQ}`, `#/g/${PQ}`, `#/p/${PQ}`, `#/?n=${PQ}&k=request`, `?s=xhs&f=${PQ}#/g/7Kq2`]) {
        await pg.goto(url + tail); await pg.settle(700);
        const c = await pg.evaluate(t => { const els = [...document.querySelectorAll('.xssp,[data-xss]')]; return { step: '地址栏 ' + t.slice(0, 40), n: els.length, x: window.__X } }, tail);
        if (c.n || c.x) leaks.set(p + ' · ' + c.step, c); checks++ } }
    // 2) 每个演示：重新加载 → 投毒 → 点演示 → 当前画面检查 → 再走一遍
    const demos = await pg.evaluate(() => [...document.querySelectorAll('[data-demo]')].map(x => x.dataset.demo));
    for (const d of demos) {
      await pg.goto(url); await pg.settle(400); await install();
      await pg.evaluate(p => { p === 'PWA' ? closeSheet() : closeModal() }, p);
      await pg.evaluate(d => { document.querySelector(`[data-demo="${d}"]`).click() }, d); await pg.settle(1200);
      await pg.evaluate(() => { __poison(); try { render() } catch (e) { } });
      const c = await pg.evaluate(d => __check('演示 ' + d + ' 当前画面'), d); if (c.n || c.x) leaks.set(p + ' · ' + c.step, c);
      for (const r of await tour('演示 ' + d, false)) leaks.set(p + ' · ' + r.step, r); checks++;
    }
    if (errs.length) { console.log('PAGEERROR', p, [...new Set(errs)].slice(0, 5)); bad++ }
    console.log(p, '演示', demos.length, '个');
    await ctx.close();
  }
  // 汇总：同一处漏洞只列一次
  const uniq = new Map(); for (const [k, v] of leaks) { const key = (v.ex || [v.err]).join('|').replace(/g\d+|h\d+|k\d+|u\d+/g, '#').slice(0, 160); if (!uniq.has(key)) uniq.set(key, [k, v]) }
  for (const [, [k, v]] of uniq) console.log('LEAK', k, JSON.stringify(v).slice(0, 500));
  if (leaks.size) bad++;
  console.log(`xss: 检查 ${checks} 轮，发现 ${leaks.size} 处（去重 ${uniq.size}）`);
  console.log(bad ? 'FAIL xss' : 'PASS xss'); await b.close(); process.exit(bad ? 1 : 0);
})();
