// T4：截图对比（逐像素）。三个页面的关键画面在固定时钟、固定随机数、固定窗口下截图，和 tests/visual/baseline/ 里的基准图比。
//   node -r tests/lib/preload.js tests/visual/shots.js            对比（不一致 = 失败，差异图写到 tests/reports/visual/）
//   NBQ_VISUAL_UPDATE=1 node -r … shots.js                         重拍基准（确认界面改动是预期的之后）
//   NBQ_VISUAL_ONLY=pwa,web,admin                                  只拍某几个页面
// 比对在 Chromium 里用 canvas 做（不需要装图片库）：每个像素三个通道差都 ≤ 16 算同一个颜色；不同的像素超过总数的 0.05% 算不一致
// （抗锯齿、字体边缘的零星差异不报；挪了位置 / 变了颜色 / 少了元素一定报）。
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const DIR = process.env.NBQ_DIR || path.join(__dirname, '..', '..');
const BASE = path.join(__dirname, 'baseline'), OUT = path.join(__dirname, '..', 'reports', 'visual');
const UPDATE = !!process.env.NBQ_VISUAL_UPDATE, ONLY = process.env.NBQ_VISUAL_ONLY ? process.env.NBQ_VISUAL_ONLY.split(',') : null;
const CH_TOL = 16, RATIO = 0.0005;
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? '  ✓ ' : 'FAIL ') + n + (ok || x === undefined ? '' : ' ' + JSON.stringify(x).slice(0, 400))) };
fs.mkdirSync(BASE, { recursive: true });

(async () => {
  const b = await chromium.launch({ executablePath: process.env.NBQ_CHROMIUM || '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--font-render-hinting=none', '--disable-lcd-text'] });
  const cmp = await b.newPage();   // 比对用的空白页
  await cmp.setContent('<canvas id=a></canvas><canvas id=b></canvas><canvas id=d></canvas>');
  const compare = (got, want) => cmp.evaluate(async ([g, w, tol]) => {
    const load = s => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = 'data:image/png;base64,' + s });
    const [A, B] = await Promise.all([load(g), load(w)]);
    if (A.width !== B.width || A.height !== B.height) return { size: [A.width, A.height, B.width, B.height] };
    const W = A.width, H = A.height, px = im => { const c = document.getElementById(im === A ? 'a' : 'b'); c.width = W; c.height = H; const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(im, 0, 0); return x.getImageData(0, 0, W, H).data };
    const a = px(A), bb = px(B), dc = document.getElementById('d'); dc.width = W; dc.height = H; const dx = dc.getContext('2d'), out = dx.createImageData(W, H);
    let n = 0, minX = W, minY = H, maxX = -1, maxY = -1;
    for (let i = 0; i < W * H; i++) {
      const o = i * 4, d = Math.max(Math.abs(a[o] - bb[o]), Math.abs(a[o + 1] - bb[o + 1]), Math.abs(a[o + 2] - bb[o + 2]));
      if (d > tol) { n++; const x = i % W, y = (i / W) | 0; minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); out.data.set([255, 0, 60, 255], o) }
      else { const g = (bb[o] + bb[o + 1] + bb[o + 2]) / 3 | 0; out.data.set([g, g, g, 70 + 0], o); out.data[o + 3] = 90 }
    }
    dx.putImageData(out, 0, 0);
    return { n, total: W * H, box: n ? [minX, minY, maxX, maxY] : null, diff: n ? dc.toDataURL('image/png').split(',')[1] : null };
  }, [got.toString('base64'), want.toString('base64'), CH_TOL]);

  const check = async (name, pg, opt = {}) => {
    await pg.settle(1500).catch(() => { });
    const got = await pg.screenshot({ animations: 'disabled', caret: 'hide', ...opt }), f = path.join(BASE, name + '.png');
    if (UPDATE) { fs.writeFileSync(f, got); T(name + '：基准已更新', true); return }
    if (!fs.existsSync(f)) { T(name + '：没有基准图（NBQ_VISUAL_UPDATE=1 重拍）', false); return }
    const r = await compare(got, fs.readFileSync(f));
    if (r.size) return T(name + '：尺寸变了', false, r.size);
    const bad = r.n / r.total > RATIO;
    if (bad) { fs.mkdirSync(OUT, { recursive: true }); fs.writeFileSync(path.join(OUT, name + '.新.png'), got); fs.writeFileSync(path.join(OUT, name + '.差异.png'), Buffer.from(r.diff, 'base64')) }
    T(name + '：与基准一致' + (r.n ? `（${r.n} 个点不同，${(r.n / r.total * 100).toFixed(3)}%）` : ''), !bad, bad ? { 不同的点: r.n, 占比: (r.n / r.total * 100).toFixed(2) + '%', 范围: r.box } : undefined);
  };

  const errs = [], want = k => !ONLY || ONLY.includes(k);
  const open = async (file, vp, init) => {
    const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: 1, reducedMotion: 'reduce' }), pg = await ctx.newPage();
    pg.on('pageerror', e => errs.push(file + ': ' + e.message));
    await pg.goto('file://' + path.join(DIR, file)); await init(pg); return pg;
  };
  const SHELL = async pg => {   // 启动 300 毫秒后弹出位置询问：等它出来再关；换成固定账号
    await pg.waitForFunction(() => document.querySelector('#sheet.show'), null, { polling: 50, timeout: 8000 }).catch(() => { });
    await pg.evaluate(() => { LOC.asked = true; closeSheet(); setWho('jason', true) }); await pg.waitForFunction(() => !document.querySelector('#sheet.show'), null, { polling: 50 });
  };
  const SBREADY = pg => pg.waitForFunction(() => { const r = document.querySelector('#sbHost')?.shadowRoot; return r && r.querySelectorAll('[data-s="home"] .ln').length > 5 }, null, { polling: 50, timeout: 15000 });
  const demo = (pg, d) => pg.evaluate(d => { const el = document.querySelector(`[data-demo="${d}"]`); el ? el.click() : runDemo(d) }, d);

  if (want('pwa')) {
    const pg = await open('南伴球_PWA.html', { width: 390, height: 844 }, SHELL);
    await pg.evaluate(() => { window.SBV && (SBV.every = 1e9) });
    await check('pwa_发现', pg);
    await pg.click('#tabbar [data-tab="mine"]'); await check('pwa_球局', pg);
    await pg.click('#tabbar [data-tab="me"]'); await check('pwa_我的', pg);
    await pg.click('#tabbar [data-tab="side"]'); await SBREADY(pg); await pg.evaluate(() => { SBV.every = 1e9 }); await check('pwa_场边', pg);
    await pg.click('#tabbar [data-tab="disc"]'); await pg.click('#scr-disc .tbell'); await check('pwa_消息', pg);
    await pg.click('#scr-notif [data-a="nBack"]');
    await pg.click('#tabbar [data-a="create"]'); await check('pwa_发起球局', pg);
    await pg.evaluate(() => closeSheet()); await pg.click('#tabbar [data-tab="disc"]');
    await demo(pg, 'card'); await check('pwa_球员卡', pg);
    await pg.close();
  }
  if (want('web')) {
    const pg = await open('南伴球_Web.html', { width: 1440, height: 900 }, async pg => { await pg.settle(800); await pg.evaluate(() => { typeof setWho === 'function' && setWho('jason', true) }); await pg.settle(500) });
    await check('web_发现', pg);
    await pg.click('#tabs [data-tab="mine"]'); await check('web_球局', pg);
    await pg.click('#tabs [data-tab="side"]'); await SBREADY(pg); await pg.evaluate(() => { SBV.every = 1e9 }); await check('web_场边', pg);
    await pg.close();
  }
  if (want('admin')) {
    const pg = await open('南伴球_后台.html', { width: 1360, height: 900 }, async pg => { await pg.waitForTimeout(500) });
    await check('admin_登录', pg);
    await pg.evaluate(() => { doLogin({ preventDefault() { } }); clearInterval(window._tk) });
    for (const [k, nm] of [['overview', '概览'], ['users', '球友'], ['games', '球局'], ['review', '待审核'], ['cities', '城市'], ['sb', '场边数据']]) {
      await pg.evaluate(k => { S.page = k; render() }, k); await check('admin_' + nm, pg);
    }
    await pg.close();
  }
  await b.close();
  T('没有页面错误', !errs.length, errs);
  console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
})().catch(e => { console.log('FAIL 脚本出错 ' + e.stack); process.exit(1) });
