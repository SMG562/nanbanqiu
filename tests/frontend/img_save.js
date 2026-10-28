// 保存图片 imgSave（两端共用）：能系统分享就分享（iOS 存相册）；不能 / 被拒就弹大图长按保存；用户取消不弹；不再用 <a download> 跳走页面。
//   文案：小红书文案里的链接带 https://（有的 App 才会识别成链接）
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const DIR = process.env.NBQ_DIR || path.join(__dirname, '..', '..');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 400) : '')) };
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  for (const f of ['南伴球_PWA.html', '南伴球_Web.html']) {
    const W = f.includes('Web'), ctx = await b.newContext({ viewport: W ? { width: 1360, height: 860 } : { width: 390, height: 844 } });
    const pg = await ctx.newPage(), errs = []; pg.on('pageerror', e => errs.push(e.message));
    await pg.route('https://nanbanqiu.test/**', r => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: fs.readFileSync(path.join(DIR, f)) }));
    await pg.route('https://cdnjs.cloudflare.com/**', r => r.abort()); await pg.route('https://basemaps.cartocdn.com/**', r => r.abort());
    await pg.goto('https://nanbanqiu.test/'); await pg.settle(500);
    const run = (mode) => pg.evaluate(async mode => {
      document.getElementById('imgSaveBox')?.remove(); window.__shared = null; let dl = 0; const oc = HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click = function () { if (this.download) dl++; return oc.call(this) };
      if (mode === 'none') { Object.defineProperty(navigator, 'canShare', { value: undefined, configurable: true }) }
      else { Object.defineProperty(navigator, 'canShare', { value: () => true, configurable: true });
        Object.defineProperty(navigator, 'share', { value: d => { window.__shared = d; return mode === 'ok' ? Promise.resolve() : Promise.reject(Object.assign(new Error('x'), { name: mode })) }, configurable: true }) }
      imgSave(new Blob(['x'], { type: 'image/png' }), 'a.png'); await new Promise(r => setTimeout(r, 200)); HTMLAnchorElement.prototype.click = oc;
      return { box: !!document.getElementById('imgSaveBox'), img: !!document.querySelector('#imgSaveBox img'), shared: window.__shared && window.__shared.files && window.__shared.files[0].name, dl } }, mode);
    let r = await run('ok'); T(`${f} 能分享：走系统分享带图片文件，不弹大图，不触发下载`, r.shared === 'a.png' && !r.box && r.dl === 0, r);
    r = await run('AbortError'); T(`${f} 用户取消分享：不弹大图`, !r.box, r);
    r = await run('NotAllowedError'); T(`${f} 分享被拒（点太久）：弹出大图，可长按保存`, r.box && r.img && r.dl === 0, r);
    r = await run('none'); T(`${f} 不支持分享：弹出大图，不触发下载`, r.box && r.img && r.dl === 0, r);
    await pg.click('#imgSaveBox button'); T(`${f} 关闭后大图消失`, await pg.$('#imgSaveBox') === null);
    const x = await pg.evaluate(() => xhsText(api.get(GAMES.find(g => g.share_code).id)));
    T(`${f} 小红书文案：链接带 https://`, /打开 https:\/\/nanbanqiu\.app\/g\/\w+\?s=xhs/.test(x), x);
    T(`${f} 无脚本错误`, errs.length === 0, errs); await ctx.close();
  }
  await b.close(); console.log(`img_save: ${pass} 通过, ${fail} 失败`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1) });
