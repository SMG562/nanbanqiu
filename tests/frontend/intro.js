// 首页引导条（11-08，src/shared/script/0502）：两端各走一遍。
//   开关关不显示；第一次来显示、手机端这次不弹位置授权；× / 往下滑 / 点开球局 / Esc 都算看过，「清空内存 → 重读」后不再出现；
//   从分享 / 球局链接进来不显示也不算看过；有登录快照时从第一帧起就不出现；本机存储报错时不报错、这次打开内不再出现。
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const DIR = process.env.NBQ_DIR || path.join(__dirname, '..', '..');
let pass = 0, fail = 0;
const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 400) : '')) };
const FLAG = () => { try { localStorage.setItem('nbq_ff_intro', '1') } catch (_) { } };
(async () => {
  const b = await chromium.launch({});
  const errs = [];
  for (const f of ['PWA', 'Web']) {
    // 用 https 假域名打开（file:// 下刷新太快时本机存储偶尔来不及写进去，会误报）；nanbanqiu.test 不是正式 / 预览域名，开关默认关
    const W = f === 'Web', URL0 = 'https://nanbanqiu.test/', HTML = fs.readFileSync(path.join(DIR, '南伴球_' + f + '.html'));
    const open = async ({ flag = true, init, hash = '' } = {}) => {
      const ctx = await b.newContext({ viewport: W ? { width: 1360, height: 860 } : { width: 390, height: 844 } });
      if (flag) await ctx.addInitScript(FLAG);
      if (init) await ctx.addInitScript(init);
      const p = await ctx.newPage(); p.on('pageerror', x => errs.push(f + ' ' + x.message));
      await p.route('https://nanbanqiu.test/**', r => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: HTML }));
      await p.route('https://cdnjs.cloudflare.com/**', r => r.abort()); await p.route('https://basemaps.cartocdn.com/**', r => r.abort());
      await p.goto(URL0 + hash); await p.settle(900); return p };
    const has = p => p.evaluate(() => { const e = document.getElementById('nbqIntro'); return !!(e && e.offsetHeight > 20 && !e.classList.contains('shut')) });
    const seen = p => p.evaluate(() => { try { return JSON.parse(localStorage.getItem('nbq_intro') || 'null') } catch (_) { return 'ERR' } });
    const locAsk = p => p.evaluate(() => /允许南伴球使用你的位置/.test(document.body.innerText));
    const reload = async p => { await p.reload(); await p.settle(900) };

    let p = await open({ flag: false });
    T(f + ' 开关关着：不显示', !(await has(p))); await p.context().close();

    p = await open();
    const st = await p.evaluate(() => ({ me: typeof ME !== 'undefined' && !!ME, txt: (document.getElementById('nbqIntro') || {}).innerText || '' }));
    T(f + ' 第一次来、没登录：显示引导条', await has(p), st);
    T(f + ' 文案：城市名 + 标题 + 三步', /墨尔本华人网球约局/.test(st.txt) && /想打球，缺个搭子/.test(st.txt) && /挑一场[\s\S]*申请加入[\s\S]*球场见/.test(st.txt), st.txt);
    if (!W) T(f + ' 引导条在的时候不弹位置授权', !(await locAsk(p)));
    T(f + ' 还没操作：本机没有记「看过」', (await seen(p)) === null);
    await p.click('#nbqIntro [data-a="introX"]'); await p.settle(600);
    T(f + ' 点 ×：收起', !(await has(p)));
    const s1 = await seen(p); T(f + ' 点 ×：本机记「看过」', !!s1 && s1.v === 1 && s1.by === 'x', s1);
    await reload(p); T(f + ' 点 × 后清空内存重读：不再出现', !(await has(p)));
    await p.context().close();

    p = await open();
    await p.mouse.move(W ? 700 : 195, W ? 600 : 650); await p.mouse.wheel(0, 300); await p.settle(600);
    T(f + ' 往下滑：收起并记「看过」', !(await has(p)) && ((await seen(p)) || {}).by === 'scroll', await seen(p));
    await reload(p); T(f + ' 滑过后重读：不再出现', !(await has(p)));
    await p.context().close();

    p = await open();
    const sel = W ? '[data-sel]' : '#calView [data-open]';
    if (!(await p.$(sel)) && !W) { for (const x of await p.$$('#week [data-day]')) { await x.click(); await p.settle(300); if (await p.$(sel)) break } }
    T(f + ' 切换日期不算看过', (await seen(p)) === null);
    T(f + ' 切换日期后引导条还在', await has(p));
    await p.click(sel); await p.settle(500);
    T(f + ' 点开一场球：记「看过」', ((await seen(p)) || {}).by === 'open', await seen(p));
    await p.context().close();

    if (W) { p = await open(); await p.keyboard.press('Escape'); await p.settle(600);
      T(f + ' 按 Esc：收起', !(await has(p)) && ((await seen(p)) || {}).by === 'x', await seen(p)); await p.context().close() }

    p = await open({ hash: '?s=link' });
    T(f + ' 从分享链接（?s=）进来：不显示', !(await has(p)));
    T(f + ' 从分享链接进来：不算看过', (await seen(p)) === null); await p.context().close();
    p = await open({ hash: '?t=th1&n=9&k=chat' });   // 推送打开（AN.entry=push）：守住「不显示、不算看过」
    T(f + ' 从推送（?t=&n=&k=）进来：不显示、不算看过', !(await has(p)) && (await seen(p)) === null); await p.context().close();
    const q = await open({ flag: false }); const code = await q.evaluate(() => (GAMES.find(g => g.share_code) || {}).share_code); await q.context().close();
    p = await open({ hash: '#/g/' + code });
    T(f + ' 从球局链接（#/g/）进来：不显示', !!code && !(await has(p)), code); await p.context().close();

    // 有登录快照：从第一帧起就不许出现（MutationObserver 从页面一开始就盯着）
    p = await open({ init: () => { try { localStorage.setItem('nbq_snap', '{"v":1}') } catch (_) { }
      window.__introEver = false; new MutationObserver(() => { if (document.getElementById('nbqIntro')) window.__introEver = true }).observe(document, { childList: true, subtree: true }) } });
    T(f + ' 有登录快照：从第一帧起就没出现过', !(await p.evaluate(() => window.__introEver))); await p.context().close();

    // 本机存储读写 nbq_intro 报错（无痕 / 微信）：不报错，点 × 后这次打开内不再出现
    p = await open({ init: () => { const g = Storage.prototype.getItem, s = Storage.prototype.setItem;
      Storage.prototype.getItem = function (k) { if (k === 'nbq_intro') throw new Error('blocked'); return g.call(this, k) };
      Storage.prototype.setItem = function (k, v) { if (k === 'nbq_intro') throw new Error('blocked'); return s.call(this, k, v) } } });
    T(f + ' 存储报错：照常显示', await has(p));
    await p.click('#nbqIntro [data-a="introX"]'); await p.settle(600);
    await p.evaluate(() => { try { render() } catch (_) { } }); await p.settle(300);
    T(f + ' 存储报错：点 × 后重画也不再出现', !(await has(p)));
    await p.context().close();
  }
  T('没有页面报错', errs.length === 0, errs);
  console.log(`intro: ${pass} passed, ${fail} failed`); await b.close(); process.exit(fail ? 1 : 0);
})();
