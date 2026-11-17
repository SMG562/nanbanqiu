// Home Club 列表加搜索（#335 C，11-17）：只加搜索框，列表仍按拼音字母排序、不显示距离（loc_persist 守着 11-03 那两条）。
// 搜索：按名称 / 区 / 邮编过滤；无结果「没找到，换个词」；过滤时已选的不丢；清空回到完整字母序；键盘升起时搜索框在可视区。
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const DIR = process.env.NBQ_DIR || path.join(__dirname, '..', '..');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 400) : '')) };
(async () => {
  for (const [name, file] of [['pwa', '南伴球_PWA.html'], ['web', '南伴球_Web.html']]) {
    const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
    const ctx = await b.newContext({ viewport: name === 'pwa' ? { width: 390, height: 844 } : { width: 1280, height: 800 }, hasTouch: name === 'pwa', isMobile: name === 'pwa' });
    const pg = await ctx.newPage(), errs = []; pg.on('pageerror', e => errs.push(e.message));
    await pg.route('https://nanbanqiu.test/**', r => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: fs.readFileSync(path.join(DIR, file)) }));
    await pg.route('https://nanbanqiu.test/vendor/**', r => r.fulfill({ status: 200, contentType: r.request().url().endsWith('.css') ? 'text/css' : 'application/javascript', body: '' }));
    await pg.route('https://cdnjs.cloudflare.com/**', r => r.abort()); await pg.route('https://basemaps.cartocdn.com/**', r => r.abort());
    const W = ms => pg.waitForTimeout(ms);
    await pg.goto('https://nanbanqiu.test/'); await W(900);
    await pg.evaluate(() => { ME = USERS.jason; ME.home_club_ids = []; openClubs() }); await W(500);
    const rows = () => pg.evaluate(() => ({ names: [...document.querySelectorAll('#clList .cp .v b')].map(e => e.textContent), text: document.getElementById('clList').textContent, none: !!document.querySelector('#clList .vp-none') }));
    const type = v => pg.evaluate(v => { const i = document.getElementById('clQ'); i.value = v; i.dispatchEvent(new Event('input', { bubbles: true })) }, v);
    const COLL = new Intl.Collator(['zh-Hans-u-co-pinyin', 'en'], { sensitivity: 'base', numeric: true });
    let s = await rows(); const all = s.names.length;
    T(name + ' 有搜索框，初始是完整列表', all > 20 && await pg.evaluate(() => !!document.getElementById('clQ')), all);
    await type('kooyong'); s = await rows(); const want = await pg.evaluate(() => Object.values(VEN).filter(v => /kooyong/i.test(v.name + v.short + v.suburb)).length);
    T(name + ' 搜名称：只剩匹配的', s.names.length === want && want > 0 && s.names.length < all, { n: s.names.length, want });
    const pc = await pg.evaluate(() => (Object.values(VEN).find(v => v.pc) || {}).pc); await type(pc); s = await rows();
    const wantPc = await pg.evaluate(pc => Object.values(VEN).filter(v => (v.pc || '').includes(pc)).length, pc);
    T(name + ' 搜邮编可用（用数据里真实的邮编）', !!pc && wantPc > 0 && s.names.length === wantPc && !s.none, { pc, n: s.names.length, wantPc });
    await type('zzqq'); s = await rows();
    T(name + ' 无结果：提示「没找到，换个词」，没有行', s.none && /没找到，换个词/.test(s.text) && s.names.length === 0, s);
    await type('malv'); s = await rows(); const sorted = [...s.names].sort(COLL.compare);
    T(name + ' 过滤后仍按拼音字母排序、不显示距离', s.names.length > 0 && JSON.stringify(s.names) === JSON.stringify(sorted) && !/\bkm\b/.test(s.text), s.names.slice(0, 4));
    // 过滤时点选一个，清空后仍是已选
    const pickId = await pg.evaluate(() => { const e = document.querySelector('#clList [data-cl]'); const id = e.dataset.cl; e.click(); return id }); await W(200);
    await type(''); s = await rows();
    const on = await pg.evaluate(id => !!document.querySelector(`#clList [data-cl="${id}"].on`) && CL.includes(id), pickId);
    T(name + ' 过滤时选的球场，清空搜索后仍是已选', on && s.names.length === all, { pickId, n: s.names.length });
    // 重新打开：搜索词不残留
    await pg.evaluate(() => { typeof closeSheet === 'function' ? closeSheet() : closeModal(); }); await W(500);
    await pg.evaluate(() => openClubs()); await W(500); s = await rows();
    T(name + ' 重新打开：搜索框是空的、完整列表', s.names.length === all && await pg.evaluate(() => document.getElementById('clQ').value === ''), s.names.length);
    if (name === 'pwa') {
      await pg.setViewportSize({ width: 390, height: 470 }); await W(500);
      await pg.evaluate(() => document.getElementById('clQ').focus()); await W(400);
      const r = await pg.evaluate(() => { const e = document.getElementById('clQ').getBoundingClientRect(); return { t: Math.round(e.top), b: Math.round(e.bottom), vh: innerHeight } });
      T(name + ' 键盘升起（视口 470）：搜索框在可视区内', r.t >= 0 && r.b <= r.vh, r);
    }
    T(name + ' 无脚本错误', errs.length === 0, errs);
    await b.close();
  }
  console.log(`club_search: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
})();
