// #393 P3 照片管线在真实浏览器画布上：固定样张（EXIF 方向 1–8、带 GPS、超大图、透明 PNG、动图、损坏、0 字节）。
//   断言「输出」：三变体长边 / 大小上限、输出里没有 EXIF·GPS·XMP（位置信息一律不出现）、方向正确、透明铺白底、坏文件给错误码。
//   手机端、网页端各跑一遍（管线两端共用同一文件）。真机（iOS HEIC / 微信）见 #393 真机协议。
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const DIR = process.env.NBQ_DIR || path.join(__dirname, '..', '..');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 500) : '')) };
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  for (const f of ['南伴球_PWA.html', '南伴球_Web.html']) {
    const W = f.includes('Web'), ctx = await b.newContext({ viewport: W ? { width: 1360, height: 860 } : { width: 390, height: 844 } });
    const pg = await ctx.newPage(), errs = []; pg.on('pageerror', e => errs.push(e.message));
    await pg.route('https://nanbanqiu.test/**', r => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: fs.readFileSync(path.join(DIR, f)) }));
    await pg.route('https://cdnjs.cloudflare.com/**', r => r.abort()); await pg.route('https://basemaps.cartocdn.com/**', r => r.abort());
    await pg.goto('https://nanbanqiu.test/'); await pg.settle(500);
    T(`${f} 管线已拼进页面`, await pg.evaluate(() => typeof SB.photo.run === 'function' && typeof SB.photo.env === 'function'));
    const res = await pg.evaluate(async () => {
      const E = SB.photo.env(), out = {}, sbPhRun = SB.photo.run;
      // ---- 造样张（页面里画 → JPEG → 手工拼 APP1：方向 + GPS）----
      const cvBlob = (w, h, draw, type = 'image/jpeg') => new Promise(ok => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); c.toBlob(ok, type, .9) });
      const halves = (c, w, h) => { c.fillStyle = '#f00'; c.fillRect(0, 0, w / 2, h); c.fillStyle = '#00f'; c.fillRect(w / 2, 0, w / 2, h) };   // 左红右蓝
      const exif = (ori) => { // 最小 TIFF：IFD0 = 方向 + GPS 指针；GPS IFD = 一条 ASCII 标签；末尾再塞一段可 grep 的坐标文字当哨兵
        const t = [0x49, 0x49, 42, 0, 8, 0, 0, 0, 2, 0, 0x12, 1, 3, 0, 1, 0, 0, 0, ori, 0, 0, 0, 0x25, 0x88, 4, 0, 1, 0, 0, 0, 38, 0, 0, 0, 0, 0, 0, 0,
          1, 0, 1, 0, 2, 0, 2, 0, 0, 0, 83, 0, 0, 0, 0, 0, 0, 0]; const body = [69, 120, 105, 102, 0, 0, ...t, ...Array.from('GPS -37.8136 144.9631', c => c.charCodeAt(0))], len = body.length + 2;
        return new Uint8Array([0xFF, 0xE1, len >> 8, len & 255, ...body]) };
      const withExif = async (blob, ori) => { const a = new Uint8Array(await blob.arrayBuffer()), e = exif(ori); return new Blob([a.slice(0, 2), e, a.slice(2)], { type: 'image/jpeg' }) };
      const hasMark = async blob => { const a = new Uint8Array(await blob.arrayBuffer()), s = new TextDecoder('latin1').decode(a);
        let seg = []; for (let i = 2; i + 4 < a.length && a[i] === 0xFF && a[i + 1] !== 0xDA;) { seg.push(a[i + 1].toString(16)); i += 2 + (a[i + 2] << 8 | a[i + 3]) }
        return { app1: seg.includes('e1'), exifStr: s.includes('Exif'), xmp: s.includes('http://ns.adobe.com/xap'), gps: s.includes('GPS'), head: a[0] === 0xFF && a[1] === 0xD8, tail: a[a.length - 2] === 0xFF && a[a.length - 1] === 0xD9 } };
      const px = async (blob, fx, fy) => { const bm = await createImageBitmap(blob, { imageOrientation: 'none' }), c = document.createElement('canvas'); c.width = bm.width; c.height = bm.height; const g = c.getContext('2d'); g.drawImage(bm, 0, 0); const d = g.getImageData(Math.floor(bm.width * fx), Math.floor(bm.height * fy), 1, 1).data; return [d[0], d[1], d[2]] };
      const dims = async blob => { const bm = await createImageBitmap(blob, { imageOrientation: 'none' }); const r = [bm.width, bm.height]; bm.close(); return r };
      const run = async (blob, type) => { try { const f = new File([blob], 'x', { type: type || blob.type }); const r = await sbPhRun(f, E); return { ok: 1, r } } catch (e) { return { err: e.code || e.message } } };
      // ① 方向 1–8：40×20 横图（左红右蓝），输出尺寸与方向
      const base = await cvBlob(240, 120, halves); out.ori = {};
      for (let o = 1; o <= 8; o++) { const x = await run(await withExif(base, o)); out.ori[o] = x.ok ? { w: x.r.w, h: x.r.h, full: await dims(x.r.parts.full) } : x }
      // 方向 6（顺时针转 90°显示）：原左红 → 显示在上；方向 3（转 180°）：左红 → 右
      const o6 = await run(await withExif(base, 6)), o3 = await run(await withExif(base, 3)), o1 = await run(await withExif(base, 1));
      out.px6 = { top: await px(o6.r.parts.full, .5, .1), bot: await px(o6.r.parts.full, .5, .9) };
      out.px3 = { left: await px(o3.r.parts.full, .1, .5), right: await px(o3.r.parts.full, .9, .5) };
      out.px1 = { left: await px(o1.r.parts.full, .1, .5), right: await px(o1.r.parts.full, .9, .5) };
      // ② 带 GPS 的样张：输入确有 EXIF，输出三个变体都没有
      const gpsIn = await withExif(base, 1), inMark = await hasMark(gpsIn), o = o1.r;
      out.gps = { inApp1: inMark.app1, inGps: inMark.gps, full: await hasMark(o.parts.full), t: await hasMark(o.parts.t), b: await hasMark(o.parts.b) };
      // ③ 大图 4000×3000：三变体长边与大小
      const big = await cvBlob(4000, 3000, (c, w, h) => { const g = c.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#2a7'); g.addColorStop(1, '#fa3'); c.fillStyle = g; c.fillRect(0, 0, w, h); for (let i = 0; i < 400; i++) { c.fillStyle = `hsl(${i * 7 % 360} 60% 50%)`; c.fillRect(i * 9 % w, i * 31 % h, 80, 60) } });
      const t0 = performance.now(), bg = await run(big); out.big = { ms: performance.now() - t0, full: await dims(bg.r.parts.full), t: await dims(bg.r.parts.t), b: await dims(bg.r.parts.b), sz: [bg.r.parts.full.size, bg.r.parts.t.size, bg.r.parts.b.size], name: bg.r.name, w: bg.r.w, h: bg.r.h };
      // ④ 超大：12000×9000（108MP）——只靠画布造不出，直接用 15000×1000 以外的真实大图：用 resize 后的 bitmap 路径
      const huge = await cvBlob(9000, 2000, halves).catch(() => null); const hg = huge && await run(huge);   // 18MP > 16MP 触发「先缩到 ≤4096」
      out.huge = hg && (hg.ok ? { full: await dims(hg.r.parts.full), tail: (await hasMark(hg.r.parts.full)).tail } : hg);
      // ⑤ 透明 PNG：输出为 JPEG 且透明处是白色
      const png = await cvBlob(60, 60, (c, w, h) => { c.clearRect(0, 0, w, h); c.fillStyle = '#f00'; c.fillRect(0, 0, 30, 60) }, 'image/png'), pr = await run(png);
      out.png = { mark: (await hasMark(pr.r.parts.full)).head, type: pr.r.parts.full.type, white: await px(pr.r.parts.full, .9, .5) };
      // ⑥ 动图（image/gif 头）：只要能解出一帧就行；这里用 1×1 的最小 GIF
      const gif = new Blob([Uint8Array.from(atob('R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=='), c => c.charCodeAt(0))], { type: 'image/gif' }); const gr = await run(gif); out.gif = gr.ok ? { w: gr.r.w, h: gr.r.h } : gr;
      // ⑦ 坏文件
      out.bad = { zero: await run(new Blob([], { type: 'image/jpeg' })), text: await run(new Blob(['hello'], { type: 'text/plain' })), broken: await run(new Blob([new Uint8Array([0xFF, 0xD8, 0xFF, 1, 2, 3])], { type: 'image/jpeg' })), svg: await run(new Blob(['<svg xmlns="http://www.w3.org/2000/svg"/>'], { type: 'image/svg+xml' })), video: await run(new Blob(['x'], { type: 'video/mp4' })) };
      for (const k of Object.keys(out.bad)) out.bad[k] = out.bad[k].err || 'OK?';
      return out });
    T(`${f} 方向 1–8：4、6、8… 横图转竖（5–8 宽高互换），1–4 不换`, [1, 2, 3, 4].every(o => res.ori[o].w === 240 && res.ori[o].h === 120) && [5, 6, 7, 8].every(o => res.ori[o].w === 120 && res.ori[o].h === 240), res.ori);
    T(`${f} 输出尺寸与记录的 w/h 一致`, Object.values(res.ori).every(o => o.full && o.full[0] === o.w && o.full[1] === o.h), res.ori);
    const red = c => c[0] > 180 && c[2] < 90, blue = c => c[2] > 180 && c[0] < 90;
    T(`${f} 方向 6：原来左边的红色显示在上方`, red(res.px6.top) && blue(res.px6.bot), res.px6);
    T(`${f} 方向 3（转 180°）：红色在右边`, red(res.px3.right) && blue(res.px3.left), res.px3);
    T(`${f} 方向 1：红左蓝右不变`, red(res.px1.left) && blue(res.px1.right), res.px1);
    T(`${f} 样张确实带 APP1 / GPS（测试自身有效）`, res.gps.inApp1 && res.gps.inGps, res.gps);
    T(`${f} 输出三个变体都没有 APP1 / Exif / GPS / XMP，且是完整 JPEG`, ['full', 't', 'b'].every(k => { const m = res.gps[k]; return !m.app1 && !m.exifStr && !m.gps && !m.xmp && m.head && m.tail }), res.gps);
    T(`${f} 4000×3000：full 1600×1200、t 480×360、b 48×36`, JSON.stringify([res.big.full, res.big.t, res.big.b]) === '[[1600,1200],[480,360],[48,36]]' && res.big.w === 1600 && res.big.h === 1200, res.big);
    T(`${f} 大小在上限内：full ≤ 1.5MB、t ≤ 150KB、b ≤ 4KB`, res.big.sz[0] <= 1.5e6 && res.big.sz[1] <= 150e3 && res.big.sz[2] <= 4e3, res.big.sz);
    T(`${f} 一张 12MP 级照片处理 ≤ 4 秒（沙盒无 GPU，宽松）`, res.big.ms < 4000, res.big.ms);
    T(`${f} 键名合格`, /^[A-Za-z0-9_-]{16,24}$/.test(res.big.name));
    T(`${f} 18MP 超大图：能处理，长边 ≤1600`, res.huge && res.huge.full && Math.max(...res.huge.full) <= 1600 && res.huge.tail, res.huge);
    T(`${f} 透明 PNG：输出 JPEG，透明处铺白底`, res.png.mark && res.png.type === 'image/jpeg' && res.png.white.every(v => v > 235), res.png);
    T(`${f} 动图只取第一帧：能出图`, res.gif.w === 1 && res.gif.h === 1, res.gif);
    T(`${f} 0 字节 / 文本 / SVG / 视频 / 损坏：各给错误码，不崩`, JSON.stringify(res.bad) === JSON.stringify({ zero: 'photo_empty', text: 'photo_not_image', broken: 'photo_decode', svg: 'photo_not_image', video: 'photo_not_image' }), res.bad);
    T(`${f} 无脚本错误`, errs.length === 0, errs); await ctx.close();
  }
  await b.close(); console.log(`side_photo: ${pass} 通过, ${fail} 失败`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1) });
