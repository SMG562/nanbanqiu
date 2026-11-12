// 保存图多级降级（#161 第 4 项，11-11）：iPhone Safari 的 insecure / 手机内存不够时，球员卡 scBlob 和海报 nbqShot 都要逐级降级，仍出图；
//   scBlob 最后一级仍带二维码（换成 PNG）；全部失败才返回 null 并留下原因；src 里除这两处外不再直接调 html2canvas（避免「修一处漏全站」）。
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const DIR = process.env.NBQ_DIR || path.join(__dirname, '..', '..');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 500) : '')) };
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
const direct = walk(path.join(DIR, 'src')).filter(f => /\.(js|html)$/.test(f) && /html2canvas\(/.test(fs.readFileSync(f, 'utf8'))).map(f => path.relative(DIR, f));
T('src 里只有共用截图函数（0470）直接调 html2canvas', direct.length === 1 && direct[0].endsWith('0470-分享球员卡.js'), direct);
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  for (const f of ['南伴球_PWA.html', '南伴球_Web.html']) {
    const W = f.includes('Web'), ctx = await b.newContext({ viewport: W ? { width: 1360, height: 860 } : { width: 390, height: 844 } });
    const pg = await ctx.newPage(), errs = []; pg.on('pageerror', e => errs.push(e.message));
    await pg.route('https://nanbanqiu.test/**', r => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: fs.readFileSync(path.join(DIR, f)) }));
    await pg.route('https://cdnjs.cloudflare.com/**', r => r.abort()); await pg.route('https://basemaps.cartocdn.com/**', r => r.abort());
    await pg.goto('https://nanbanqiu.test/'); await pg.settle(500);
    // 假 html2canvas：前 failN 次抛 iPhone 的 insecure 错误，之后返回 8×8 画布；记录每次的 scale、是否带 onclone、调用时目标元素里有没有二维码 PNG
    const run = (kind, failN) => pg.evaluate(async ({ kind, failN }) => {
      const calls = []; let n = 0; const cv = document.createElement('canvas'); cv.width = cv.height = 8;
      window.html2canvas = async (el, o) => { n++; calls.push({ scale: o.scale, clone: !!o.onclone, qrImg: !!el.querySelector('.bk .q img') });
        if (o.onclone) { const d = document.implementation.createHTMLDocument(''); d.body.innerHTML = kind === 'poster' ? el.outerHTML : '<svg filter="url(#a)" mask="url(#m)"><g filter="url(#a)"></g></svg><div class="pc-grain" style="background-image:url(x)"></div>'; const c = calls[calls.length - 1];
          c.svgBefore = d.querySelectorAll('svg').length; c.qrBefore = d.querySelectorAll('[data-qr] svg').length; await o.onclone(d);
          c.svgAfter = d.querySelectorAll('svg').length; c.qrPng = /^data:image\/png/.test((d.querySelector('[data-qr] img') || {}).src || ''); c.cleaned = c.svgAfter === 0 && (kind === 'poster' || d.querySelector('.pc-grain').style.backgroundImage === 'none'); c.text = (d.body.textContent || '').length }
        if (n <= failN) throw new Error('The operation is insecure.'); return cv };
      let blob; if (kind === 'sc') { const uid = Object.keys(USERS)[0]; blob = await scBlob(uid) } else if (kind === 'poster') { const el = document.createElement('div'); el.innerHTML = ogAHTML(api.get(GAMES.find(g => g.share_code).id)); document.body.appendChild(el); blob = await nbqShot(el.firstElementChild, 2); el.remove() } else { const el = document.createElement('div'); el.innerHTML = '<b>x</b>'; document.body.appendChild(el); blob = await nbqShot(el, 2); el.remove() }
      return { ok: !!blob, type: blob && blob.type, calls, err: window.SC_ERR } }, { kind, failN });
    let r = await run('sc', 0); T(`${f} scBlob 正常：一次出图`, r.ok && r.type === 'image/png' && r.calls.length === 1 && r.calls[0].scale === 3, r);
    r = await run('sc', 2); T(`${f} scBlob 前两次 insecure：第 3 次（去 SVG 版）仍出图，且二维码已换成 PNG`, r.ok && r.calls.length === 3 && r.calls[2].clone && r.calls[2].qrImg, r);
    r = await run('sc', 9); T(`${f} scBlob 全部失败：返回 null，原因留在 SC_ERR`, !r.ok && r.calls.length === 3 && /insecure/.test(r.err || ''), r);
    r = await run('shot', 0); T(`${f} nbqShot 正常：一次出图`, r.ok && r.calls.length === 1 && r.calls[0].scale === 2, r);
    r = await run('shot', 2); T(`${f} nbqShot 前两次失败：第 3 次去掉全部 SVG / 纹理后仍出图（倍数取 min(scale,2)）`, r.ok && r.calls.length === 3 && r.calls[1].scale === 1 && r.calls[2].scale === 2 && r.calls[2].clone && r.calls[2].cleaned, r);
    r = await run('poster', 2); const c3 = r.calls[2] || {}; T(`${f} 真实海报：第 3 次克隆里二维码 SVG 已换成 PNG、其余 SVG 全部去掉、文字还在（协作者交叉复核 11-11）`, r.ok && r.calls.length === 3 && c3.qrBefore === 1 && c3.svgAfter === 0 && c3.qrPng && c3.text > 20, r);
    r = await run('poster', 0); T(`${f} 真实海报：第 1 次成功时不动 SVG`, r.ok && r.calls.length === 1 && !r.calls[0].clone, r);
    r = await run('shot', 9); T(`${f} nbqShot 全部失败：返回 null，不抛错`, !r.ok && r.calls.length === 3 && /insecure/.test(r.err || ''), r);
    // 头像印章（用户选的动物 / 印型）：最后一级要画成位图保留；被判不安全 / 画成空白才退化（协作者交叉复核之外，所有者真机 11-12 报：印章被换成字母）
    const av = (mode) => pg.evaluate(async (mode) => {
      const u = Object.assign({}, Object.values(USERS)[0], { avatar_kind: 'animal', animal: Object.keys(LA)[0] });
      const d = document.implementation.createHTMLDocument(''); d.body.innerHTML = '<div class="pc-av" style="width:128px;height:128px">' + avStamp(u, 128) + '</div><div class="x"><svg><use href="#i-share"/></svg></div>';
      const g = CanvasRenderingContext2D.prototype.getImageData; if (mode === 'taint') CanvasRenderingContext2D.prototype.getImageData = function () { throw new Error('The operation is insecure.') };
      const before = d.querySelectorAll('svg').length; await nbqShotClean(d); CanvasRenderingContext2D.prototype.getImageData = g;
      const im0 = d.querySelector('.pc-av img'); let ink = 0, im = im0 && new Image();
      if (im) { await new Promise(r => { im.onload = im.onerror = r; im.src = im0.src }); const cv = document.createElement('canvas'); cv.width = cv.height = 64; const x = cv.getContext('2d'); x.drawImage(im, 0, 0, 64, 64); const px = x.getImageData(0, 0, 64, 64).data; for (let i = 3; i < px.length; i += 4) if (px[i] > 8) ink++ }
      return { before, nw: im && im.naturalWidth, svgAfter: d.querySelectorAll('svg').length, avImg: !!im0 && /^data:image\/png/.test(im.src), ink, iconLeft: d.querySelectorAll('.x svg,.x img').length } }, mode);
    let a = await av('ok'); T(`${f} 头像印章：最后一级把印章画成位图换回（保留图案），页面里 SVG 一个不剩，图标空 SVG 被移除`, a.before >= 1 && a.svgAfter === 0 && a.avImg && a.ink > 200 && a.iconLeft === 0, a);
    a = await av('taint'); T(`${f} 头像印章：画成位图被判不安全时不卡死、不留 SVG（退化为移除 / 首字母）`, a.svgAfter === 0 && !a.avImg, a);
    // 真实球员卡（#205）：二维码带 data-qr，第 3 级（去 SVG 版）才能换成 PNG；头像画不成位图时退化成「底色圆 + 首字母」而不是空着
    const card = mode => pg.evaluate(async mode => {
      const uid = Object.keys(USERS)[0], u = Object.assign({}, USERS[uid], { avatar_kind: 'animal', animal: Object.keys(LA)[0] }); USERS[uid] = u;
      const d = document.implementation.createHTMLDocument(''); d.body.innerHTML = shareShot(uid);
      const g = CanvasRenderingContext2D.prototype.getImageData; if (mode === 'taint') CanvasRenderingContext2D.prototype.getImageData = function () { throw new Error('The operation is insecure.') };
      const qrAttr = d.querySelectorAll('.bk .q[data-qr]').length; await nbqShotClean(d); CanvasRenderingContext2D.prototype.getImageData = g;
      const ini = d.querySelector('.pc-av .pc-ini');
      return { qrAttr, qrPng: /^data:image\/png/.test((d.querySelector('.bk .q img') || {}).src || ''), svgAfter: d.querySelectorAll('svg').length, ini: ini && ini.textContent, want: (String(u.name || '?').trim()[0] || '?').toUpperCase() } }, mode);
    let c = await card('ok'); T(`${f} 真实球员卡：二维码带 data-qr，第 3 级换成 PNG`, c.qrAttr === 1 && c.qrPng && c.svgAfter === 0, c);
    c = await card('taint'); T(`${f} 真实球员卡：头像画不成位图时退化为首字母（不是空白）`, c.qrAttr === 1 && c.svgAfter === 0 && c.ini === c.want && !!c.want, c);
    T(`${f} 无脚本错误`, errs.length === 0, errs); await ctx.close();
  }
  await b.close(); console.log(`shot_fallback: ${pass} 通过, ${fail} 失败`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1) });
