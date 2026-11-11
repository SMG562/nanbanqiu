// 添加到主屏幕引导（手机端）：按浏览器给对的步骤；没有「演示：已添加…」按钮；iOS 其他浏览器 / App 内置浏览器先让换 Safari；安卓有安装事件时一键。
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const DIR = process.env.NBQ_DIR || path.join(__dirname, '..', '..');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 400) : '')) };
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) ';
const UAS = { ios_safari: IOS + 'Version/18.0 Mobile/15E148 Safari/604.1', ios_other: IOS + 'CriOS/130.0 Mobile/15E148 Safari/604.1', inapp: IOS + 'Mobile/15E148 xhsdiscover/8.0',
  android: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36' };
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  for (const [kind, ua] of Object.entries(UAS)) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, userAgent: ua, hasTouch: true, isMobile: true });
    const pg = await ctx.newPage(), errs = []; pg.on('pageerror', e => errs.push(e.message));
    await pg.route('https://nanbanqiu.test/**', r => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: fs.readFileSync(path.join(DIR, '南伴球_PWA.html')) }));
    await pg.route('https://cdnjs.cloudflare.com/**', r => r.abort()); await pg.route('https://tile.openstreetmap.org/**', r => r.abort());
    await pg.goto('https://nanbanqiu.test/'); await pg.settle(500);
    const open = () => pg.evaluate(() => { openA2HS(); return new Promise(r => setTimeout(() => r({ kind: a2hsKind(), txt: document.querySelector('#sheet, .sheet, [id*=sheet]') ? document.body.innerText : document.body.innerText,
      steps: document.querySelectorAll('.a2s').length, link: !!document.querySelector('[data-a="a2hsLink"]'), go: !!document.querySelector('[data-a="a2hsGo"]'), sim: !!document.querySelector('[data-a="simA2hs"]'), icon: (document.querySelector('.a2ic') || {}).getAttribute && document.querySelector('.a2ic').getAttribute('src') }), 300)) });
    let r = await open();
    T(`${kind}：识别为 ${kind}`, r.kind === (kind === 'android' ? 'android' : kind), r.kind);
    T(`${kind}：没有演示按钮，用的是新图标`, !r.sim && !/演示：已添加/.test(r.txt) && r.icon === '/icons/icon-180.png', r);
    if (kind === 'ios_safari') T('iOS Safari：3 步、有分享步骤和「看不到？」提示，不要求换浏览器', r.steps === 3 && /点屏幕底部的「分享」/.test(r.txt) && /看不到/.test(r.txt) && /添加到主屏幕/.test(r.txt) && !r.link, r);
    if (kind === 'ios_other' || kind === 'inapp') T(`${kind}：先让用 Safari 打开，有复制链接，再 3 步`, r.link && /先用 Safari 打开/.test(r.txt) && r.steps === 3, r);
    if (kind === 'android') {
      T('安卓没有安装事件：⋮ 菜单 3 步', r.steps === 3 && /⋮/.test(r.txt) && !r.go, r);
      await pg.evaluate(() => closeSheet()); await pg.settle(300);
      const g = await pg.evaluate(async () => { window.__p = 0; A2HS_EV = { prompt() { window.__p++ }, userChoice: Promise.resolve({ outcome: 'accepted' }) }; openA2HS(); await new Promise(r => setTimeout(r, 300));
        const btn = document.querySelector('[data-a="a2hsGo"]'); const steps = document.querySelectorAll('.a2s').length; btn && btn.click(); await new Promise(r => setTimeout(r, 300)); return { btn: !!btn, steps, prompted: window.__p, ev: A2HS_EV } });
      T('安卓有安装事件：一键按钮、点了触发系统安装框、不再显示步骤', g.btn && g.steps === 0 && g.prompted === 1 && g.ev === null, g);
    }
    T(`${kind}：无脚本错误`, errs.length === 0, errs); await ctx.close();
  }
  await b.close(); console.log(`a2hs: ${pass} 通过, ${fail} 失败`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1) });
