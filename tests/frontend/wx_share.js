// 微信分享：① 前台卡片文案 = 服务端卡片文案（所有演示球局逐个核对，两端）② 手机端「发到微信群」走系统分享，发球局图（11-16 起：微信抓不到链接卡片的内容和图）
//   ③ 预览 = 真实发出的文字 ④ 微信内置浏览器给提示、没有系统分享才复制文案、用户取消不复制
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const DIR = process.env.NBQ_DIR || path.join(__dirname, '..', '..');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 500) : '')) };
const FAKE = '2026-10-14T13:10:00+11:00';
(async () => {
  const card = await import(require('url').pathToFileURL(path.join(DIR, 'server', 'og', 'card.mjs')).href);
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  for (const f of ['南伴球_PWA.html', '南伴球_Web.html']) {
    const W = f.includes('Web'), ctx = await b.newContext({ viewport: W ? { width: 1360, height: 860 } : { width: 390, height: 844 }, timezoneId: 'Australia/Melbourne' });
    await ctx.addInitScript(ts => { const off = ts - Date.now(), D = Date; class FD extends D { constructor(...a) { a.length ? super(...a) : super(D.now() + off) } static now() { return D.now() + off } } window.Date = FD }, +new Date(FAKE));
    const pg = await ctx.newPage(), errs = []; pg.on('pageerror', e => errs.push(e.message));
    await pg.route('https://nanbanqiu.test/**', r => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: fs.readFileSync(path.join(DIR, f)) }));
    await pg.route('https://cdnjs.cloudflare.com/**', r => r.abort()); await pg.route('https://basemaps.cartocdn.com/**', r => r.abort());
    await pg.goto('https://nanbanqiu.test/'); await pg.settle(600);
    // ① 前台文案和服务端逐个一致
    const rows = await pg.evaluate(() => GAMES.filter(g => g.share_code).map(g => { const c = api.get(g.id); return c && c.host && { rec: { code: g.share_code, o: dOff(c.start), t: hm(c.start), v: c.v.short, type: c.game_type, spots: c.spots, lvl: lvl(c), host: c.host.name, hu: f1(c.host.ntrp) }, title: ogTitle(c), desc: ogDesc(c) } }).filter(Boolean));
    const bad = rows.filter(r => r.title !== card.ogTitle(r.rec, new Date(FAKE)) || r.desc !== card.ogDesc(r.rec));
    T(`${f} 前台和服务端的卡片标题 / 描述逐个一致（${rows.length} 个球局）`, rows.length > 30 && bad.length === 0, bad.slice(0, 2));
    if (!W) {
      const id = 'g1';
      const o = await pg.evaluate(id => { openShare(id); const tiles = [...document.querySelectorAll('.sgrid button')].map(b => b.dataset.a);
        return { tiles, lnk: !!document.querySelector('[data-a="copyText"]'), img: !!document.querySelector('.xhs-pv .ogW'), card: !!document.querySelector('.wxcard') } }, id);
      T('手机端分享面板：4 个入口（微信群在第一个）+ 复制文案链接', JSON.stringify(o.tiles) === '["wxShare","sysShare","poster","copyLink"]' && o.lnk, o);
      T('预览 = 真实发出的图（球局图 + 二维码），没有假卡片', o.img && !o.card, o);
      const xt = await pg.evaluate(() => Object.keys(USERS || {}).slice(0, 40).map(u => scText(u, 'xhs').title.length));
      T('小红书球员卡标题 ≤ 20 字（超了小红书会截断）', xt.length > 0 && xt.every(n => n <= 20), xt);
      const run = (mode, env) => pg.evaluate(async ([mode, env]) => {
        window.__sh = null; window.__cp = null; ENV = env || 'safari';
        Object.defineProperty(navigator, 'clipboard', { value: { writeText: t => { window.__cp = t; return Promise.resolve() } }, configurable: true });
        if (mode === 'none') Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
        else XHSP.g1 = new Blob(['x'], { type: 'image/png' }); Object.defineProperty(navigator, 'canShare', { value: () => true, configurable: true });
        Object.defineProperty(navigator, 'share', { value: d => { window.__sh = d; return mode === 'ok' ? Promise.resolve() : Promise.reject(Object.assign(new Error('x'), { name: mode })) }, configurable: true });
        openShare('g1'); document.querySelector('[data-a="wxShare"]').click(); await new Promise(r => setTimeout(r, 300));
        const c = api.get('g1'); return { sh: window.__sh, cp: window.__cp, og: document.querySelector('meta[property="og:title"]').content, ogd: document.querySelector('meta[property="og:description"]').content, wxg: !document.getElementById('wxg').hidden && /发送给朋友/.test(document.getElementById('wxg').textContent), title: ogTitle(c), code: c.share_code } }, [mode, env]);
      let r = await run('ok');
      T('点「发到微信群」：系统分享带的是球局图（图片文件）', r.sh && r.sh.files && r.sh.files.length === 1 && r.cp === null, r);
      r = await run('AbortError'); T('用户取消分享：不复制、不提示', r.cp === null, r);
      r = await run('NotAllowedError'); T('分享被拒：退回复制文案', /南伴球｜/.test(r.cp || ''), r);
      r = await run('none'); T('没有系统分享（电脑等）：复制文案', /南伴球｜/.test(r.cp || '') && /g\/[\w]+/.test(r.cp), r);
      r = await run('ok', 'wechat'); T('微信内置浏览器：不调系统分享，提示点右上角「···」→ 发送给朋友', r.sh === null && r.wxg, r);
    }
    T(`${f} 无脚本错误`, errs.length === 0, errs); await ctx.close();
  }
  // 微信里打开：只有微信自己的顶栏。.wxbar 是电脑演示的假顶栏，真手机上不能出现，也不能给它留位置
  const WXUA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.50 NetType/WIFI Language/zh_CN';
  for (const [name, vp, ua, wantBar] of [['微信手机', { width: 390, height: 844 }, WXUA, false], ['电脑演示（切到微信环境）', { width: 1360, height: 900 }, undefined, true]]) {
    const ctx = await b.newContext({ viewport: vp, userAgent: ua, isMobile: !!ua, hasTouch: !!ua }), pg = await ctx.newPage();
    await pg.route('https://nanbanqiu.test/**', r => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: fs.readFileSync(path.join(DIR, '南伴球_PWA.html')) }));
    await pg.route('https://cdnjs.cloudflare.com/**', r => r.abort()); await pg.route('https://basemaps.cartocdn.com/**', r => r.abort());
    await pg.goto('https://nanbanqiu.test/'); await pg.settle(600); if (!ua) { await pg.evaluate(() => setEnv('wechat')); await pg.settle(300) }
    const x = await pg.evaluate(() => { const bar = document.querySelector('.wxbar'), top = document.querySelector('.topbar'); return { env: ENV, bar: getComputedStyle(bar).display, wx: getComputedStyle(document.getElementById('dev')).getPropertyValue('--wx').trim(), tip: !!document.querySelector('.wxtip') && getComputedStyle(document.querySelector('.wxtip')).display !== 'none' } });
    T(`${name}：${wantBar ? '演示里的模拟微信顶栏照常显示' : '没有第二层 ✕ / ··· 顶栏，也没给它留位置'}`, wantBar ? (x.env === 'wechat' && x.bar !== 'none' && x.wx === '44px') : (x.env === 'wechat' && x.bar === 'none' && x.wx === '0px'), x);
    if (!wantBar) { T('微信手机：顶部提示条仍在，引导去 Safari', x.tip, x);
      const tx = await pg.evaluate(() => ({ tip: document.querySelector('.wxtip').textContent }));
      T('提示条文案：用 Safari 打开 / 不再弹提示', /Safari/.test(tx.tip) && /不再弹提示/.test(tx.tip), tx) }
    await ctx.close();
  }
  await b.close(); console.log(`wx_share: ${pass} 通过, ${fail} 失败`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1) });
