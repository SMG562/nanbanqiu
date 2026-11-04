// 约 TA 打球表单（11-05 你报的「点输入框 / 点选项页面滚动有点乱」）：
//  · 表单里每点一下都整张重画，滚动条不能被打回顶部；
//  · 「发送邀约」固定在弹层底部，表单滚到哪都看得到；
//  · 「说一句」有快捷短语（点一下填入）和回车发送。
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const DIR = process.env.NBQ_DIR || path.join(__dirname, '..', '..');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 400) : '')) };
(async () => {
  for (const [name, file] of [['pwa', '南伴球_PWA.html'], ['web', '南伴球_Web.html']]) {
    const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
    const ctx = await b.newContext({ viewport: name === 'pwa' ? { width: 390, height: 560 } : { width: 1280, height: 560 }, hasTouch: name === 'pwa', isMobile: name === 'pwa' });
    const pg = await ctx.newPage(), errs = []; pg.on('pageerror', e => errs.push(e.message));
    await pg.route('https://nanbanqiu.test/**', r => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: fs.readFileSync(path.join(DIR, file)) }));
    await pg.route('https://cdnjs.cloudflare.com/**', r => r.abort()); await pg.route('https://basemaps.cartocdn.com/**', r => r.abort());
    await pg.goto('https://nanbanqiu.test/'); await pg.waitForTimeout(700);
    await pg.evaluate(() => document.querySelector('[data-demo="invsend"]').click()); await pg.waitForTimeout(900);
    const st = () => pg.evaluate(() => { const s = ivScroller(), bar = document.querySelector('.iv-bar'); if (!s || !bar) return null; const a = s.getBoundingClientRect(), r = bar.getBoundingClientRect(); return { top: s.scrollTop, over: s.scrollHeight - s.clientHeight, barIn: r.bottom <= a.bottom + 1 && r.top >= a.top } });
    let s = await st(); T(`${name} 表单可滚动（测试前提）`, !!s && s.over > 60, s);
    T(`${name} 发送条在可见区域内（没滚到底也看得到）`, !!s && s.barIn, s);
    await pg.evaluate(() => { ivScroller().scrollTop = 150 }); const t0 = (await st()).top;
    for (const [sel, label] of [['[data-iv="type"][data-v="rally"]', '玩法'], ['[data-iv="dur"][data-v="120"]', '打多久'], ['[data-iv="per"][data-v="3"]', '时段']]) {
      await pg.evaluate(q => document.querySelector(q).click(), sel); await pg.waitForTimeout(150);
      const n = await st(); T(`${name} 点「${label}」后滚动位置不跳回顶部`, !!n && Math.abs(n.top - t0) <= 2, { before: t0, after: n && n.top });
    }
    await pg.evaluate(() => document.querySelector('[data-iv="qp"][data-v="0"]').click());
    const v = await pg.evaluate(() => ({ val: document.getElementById('ivNote').value, f: IVF.note, q: document.querySelector('[data-iv="qp"]').textContent }));
    T(`${name} 快捷短语点一下填入「说一句」`, v.val && v.val === v.q && v.f === v.q, v);
    await pg.focus('#ivNote'); await pg.keyboard.press('Enter'); await pg.waitForTimeout(500);
    const inv = await pg.evaluate(() => INVITES[0] && { note: INVITES[0].note, status: INVITES[0].status, t: INVITES[0].game_type });
    T(`${name} 在输入框按回车 = 发送邀约（带上这句话和玩法）`, !!inv && inv.status === 'pending' && inv.note === v.q && inv.t === 'rally', inv);
    T(`${name} 无脚本错误`, errs.length === 0, errs); await b.close();
  }
  console.log(`invite_form: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
})();
