// 默认印色（纸白）全站一致（11-03）：头像在每个出现的地方（右上角 / 个人页 / 球员卡 / 色板第一格 / 通用头像函数 av()），
// 用真实渲染出来的像素取色，都必须是色板第一格（ZAVC[0]）的颜色，手机端和网页端一样。起因：用户反复指出「头像底色应是球员卡印章底色的第一个颜色纸白，全站一致」。
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs'); const zlib = require('zlib');
const DIR = process.env.NBQ_DIR || path.join(__dirname, '..', '..');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 400) : '')) };
function png(buf) {   // 最小 PNG 解码（8 位 RGB / RGBA，无隔行）
  let p = 8, w, h, ct, idat = []; while (p < buf.length) { const len = buf.readUInt32BE(p), type = buf.toString('latin1', p + 4, p + 8), d = buf.slice(p + 8, p + 8 + len); if (type === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); ct = d[9] } if (type === 'IDAT') idat.push(d); p += 12 + len }
  const bpp = ct === 6 ? 4 : 3, raw = zlib.inflateSync(Buffer.concat(idat)), out = Buffer.alloc(w * h * bpp), st = w * bpp;
  for (let y = 0; y < h; y++) { const f = raw[y * (st + 1)], row = raw.slice(y * (st + 1) + 1, (y + 1) * (st + 1)); for (let x = 0; x < st; x++) { const a = x >= bpp ? out[y * st + x - bpp] : 0, b = y ? out[(y - 1) * st + x] : 0, c = x >= bpp && y ? out[(y - 1) * st + x - bpp] : 0; let v = row[x]; if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1; else if (f === 4) { const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c } out[y * st + x] = v & 255 } }
  return { w, h, at: (x, y) => [0, 1, 2].map(i => out[(y * w + x) * bpp + i]) };
}
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  for (const [name, file, vp] of [['pwa', '南伴球_PWA.html', { width: 390, height: 844 }], ['web', '南伴球_Web.html', { width: 1280, height: 800 }]]) {
    const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: 2 }), pg = await ctx.newPage(), errs = []; pg.on('pageerror', e => errs.push(e.message));
    await pg.route('https://nanbanqiu.test/**', r => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: fs.readFileSync(path.join(DIR, file)) }));
    await pg.route('https://cdnjs.cloudflare.com/**', r => r.abort()); await pg.route('https://basemaps.cartocdn.com/**', r => r.abort());
    await pg.goto('https://nanbanqiu.test/'); await pg.waitForTimeout(800);
    await pg.evaluate(() => { api.login({ name: 'Tess', last: 'L', ntrp: 4, home_club_ids: [], gender: null }); render(); if (typeof renderMe === 'function') renderMe() }); await pg.waitForTimeout(300);
    const want = hex(await pg.evaluate(() => ZAVC[0][1]));
    // 取色：在圆的 0.36 半径处四个角度各取一点（避开中间的字母），都要和色板第一格接近
    const sample = async (sel, label) => {
      const el = pg.locator(sel).first(); if (!(await el.count())) return T(`${name} ${label}：页面里找得到`, false, sel);
      await el.scrollIntoViewIfNeeded().catch(() => { }); const img = png(await el.screenshot()), r = img.w / 2, pts = [45, 135, 225, 315].map(a => img.at(Math.round(img.w / 2 + .36 * r * 2 * Math.cos(a * Math.PI / 180) / 2 * 2), Math.round(img.h / 2 + .36 * r * 2 * Math.sin(a * Math.PI / 180) / 2 * 2)));
      const bad = pts.filter(p => p.some((v, i) => Math.abs(v - want[i]) > 10)); T(`${name} ${label}：渲染出的底色 = 纸白 ${want}`, !bad.length, { pts, want });
    };
    if (name === 'web') await sample('#meSlot .av', '右上角头像');
    else { await pg.evaluate(() => { go('me') }); await pg.waitForTimeout(300); if (await pg.locator('#scr-me .av').count()) await sample('#scr-me .av', '「我」页头像') }
    await pg.evaluate(() => { const d = document.createElement('div'); d.id = 'avT'; d.style.cssText = 'position:fixed;left:8px;top:200px;z-index:99999;background:#fff;padding:8px;display:flex;gap:8px'; d.innerHTML = av(ME, '') + av(ME, 'sm') + av(ME, 'lg'); document.body.appendChild(d) });
    await sample('#avT .av:nth-child(1)', '通用头像 av()'); await sample('#avT .av:nth-child(2)', '通用头像 av(sm)');
    await pg.evaluate(() => { openCard(ME.id); if (!document.querySelector('[data-avc]') && typeof openCustom === 'function') openCustom() }); await pg.waitForTimeout(700);
    const sw = await pg.evaluate(() => { const b = document.querySelector('[data-avc]'); return b ? getComputedStyle(b).backgroundColor : null });
    T(`${name} 色板第一格 = 纸白`, sw && sw.match(/\d+/g).slice(0, 3).every((v, i) => Math.abs(+v - want[i]) <= 1), [sw, want]);
    T(`${name} 默认选中的是第一格`, await pg.evaluate(() => (document.querySelector('[data-avc].on') || {}).dataset?.avc === ZAVC[0][1]));
    T(`${name} 无脚本错误`, errs.length === 0, errs);
    await ctx.close();
  }
  await b.close(); console.log(`paper_consistency: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
})();
