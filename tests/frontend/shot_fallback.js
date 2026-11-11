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
      window.html2canvas = (el, o) => { n++; calls.push({ scale: o.scale, clone: !!o.onclone, qrImg: !!el.querySelector('.bk .q img') });
        if (o.onclone) { const d = document.implementation.createHTMLDocument(''); d.body.innerHTML = '<svg filter="url(#a)" mask="url(#m)"><g filter="url(#a)"></g></svg><div class="pc-grain" style="background-image:url(x)"></div>'; o.onclone(d); calls[calls.length - 1].cleaned = !d.querySelector('[filter],[mask]') && d.querySelector('.pc-grain').style.backgroundImage === 'none' }
        return n <= failN ? Promise.reject(new Error('The operation is insecure.')) : Promise.resolve(cv) };
      let blob; if (kind === 'sc') { const uid = Object.keys(USERS)[0]; blob = await scBlob(uid) } else { const el = document.createElement('div'); el.innerHTML = '<b>x</b>'; document.body.appendChild(el); blob = await nbqShot(el, 2); el.remove() }
      return { ok: !!blob, type: blob && blob.type, calls, err: window.SC_ERR } }, { kind, failN });
    let r = await run('sc', 0); T(`${f} scBlob 正常：一次出图`, r.ok && r.type === 'image/png' && r.calls.length === 1 && r.calls[0].scale === 3, r);
    r = await run('sc', 2); T(`${f} scBlob 前两次 insecure：第 3 次（去 SVG 版）仍出图，且二维码已换成 PNG`, r.ok && r.calls.length === 3 && r.calls[2].clone && r.calls[2].qrImg, r);
    r = await run('sc', 9); T(`${f} scBlob 全部失败：返回 null，原因留在 SC_ERR`, !r.ok && r.calls.length === 3 && /insecure/.test(r.err || ''), r);
    r = await run('shot', 0); T(`${f} nbqShot 正常：一次出图`, r.ok && r.calls.length === 1 && r.calls[0].scale === 2, r);
    r = await run('shot', 2); T(`${f} nbqShot 前两次失败：第 3 次去掉 SVG 滤镜 / 遮罩 / 纹理后仍出图`, r.ok && r.calls.length === 3 && r.calls[1].scale === 1 && r.calls[2].clone && r.calls[2].cleaned, r);
    r = await run('shot', 9); T(`${f} nbqShot 全部失败：返回 null，不抛错`, !r.ok && r.calls.length === 3 && /insecure/.test(r.err || ''), r);
    T(`${f} 无脚本错误`, errs.length === 0, errs); await ctx.close();
  }
  await b.close(); console.log(`shot_fallback: ${pass} 通过, ${fail} 失败`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1) });
