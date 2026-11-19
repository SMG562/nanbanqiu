// 首页引导条（11-19 改为每天每端一次、所有人，src/shared/script/0501 + 0502）：两端各走一遍。
//   开关关不显示；今天第一次打开显示（显示时就记当天额度）、手机端这次不弹位置授权；× / 往下滑 / 点开球局 / Esc 提前收起；重读当天不再出现；
//   昨天看过今天又显示、另一端今天看过不占这一端额度、旧版 v1 记录照常显示并升级成 v2；登录快照 / 主屏幕不再影响；
//   从分享 / 推送 / 球局链接进来不显示也不占额度；停留后自动收起；减少动态效果时直接显示最终画面；本机存储报错时不报错、这次打开内不再出现。
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
    const SURF = W ? 'web' : 'pwa', OTHER = W ? 'pwa' : 'web';
    const open = async ({ flag = true, init, hash = '', rm = false } = {}) => {
      const ctx = await b.newContext({ viewport: W ? { width: 1360, height: 860 } : { width: 390, height: 844 }, reducedMotion: rm ? 'reduce' : 'no-preference' });
      if (flag) await ctx.addInitScript(FLAG);
      if (init) await ctx.addInitScript(init);
      const p = await ctx.newPage(); p.on('pageerror', x => errs.push(f + ' ' + x.message));
      await p.route('https://nanbanqiu.test/**', r => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: HTML }));
      await p.route('https://cdnjs.cloudflare.com/**', r => r.abort()); await p.route('https://basemaps.cartocdn.com/**', r => r.abort());
      await p.goto(URL0 + hash); await p.settle(900); return p };
    const has = p => p.evaluate(() => { const e = document.getElementById('nbqIntro'); return !!(e && e.offsetHeight > 20 && !e.classList.contains('shut')) });
    const seen = p => p.evaluate(() => { try { return JSON.parse(localStorage.getItem('nbq_intro') || 'null') } catch (_) { return 'ERR' } });
    const today = p => p.evaluate(() => nbqIntroDay());
    // 往本机种一条「n 天前」的记录（v=1 旧版 / v=2 新版）；做成自包含的脚本文本，注入页面第一帧前执行
    const seed = (n, v, surf) => new Function(`const d=new Date(Date.now()-${n}*864e5),z=x=>String(x).padStart(2,'0'),k=d.getFullYear()+'-'+z(d.getMonth()+1)+'-'+z(d.getDate());
      localStorage.setItem('nbq_intro',JSON.stringify(${v}===1?{v:1,at:Date.now()-${n}*864e5,by:'x'}:{v:2,first:Date.now()-${n}*864e5,days:{${JSON.stringify(surf || '')}:k},n:1}))`);
    const locAsk = p => p.evaluate(() => /允许南伴球使用你的位置/.test(document.body.innerText));
    const reload = async p => { await p.reload(); await p.settle(900) };

    let p = await open({ flag: false });
    T(f + ' 开关关着：不显示', !(await has(p))); await p.context().close();

    p = await open();
    const st = await p.evaluate(() => ({ me: typeof ME !== 'undefined' && !!ME, txt: (document.getElementById('nbqIntro') || {}).innerText || '' }));
    T(f + ' 第一次来、没登录：显示引导条', await has(p), st);
    T(f + ' 文案：城市名 + 一句话引导', /墨尔本华人网球约局/.test(st.txt) && /挑一场，加入。/.test(st.txt), st.txt);
    if (!W) T(f + ' 引导条在的时候不弹位置授权', !(await locAsk(p)));
    const r0 = await seen(p); T(f + ' 显示时就记下今天这一端的额度', !!r0 && r0.v === 2 && r0.days[SURF] === await today(p) && r0.n === 1 && !r0.days[OTHER], r0);
    await p.click('#nbqIntro [data-a="introX"]'); await p.settle(600);
    T(f + ' 点 ×：收起', !(await has(p)));
    await reload(p); T(f + ' 点 × 后重读（当天）：不再出现', !(await has(p)));
    await p.context().close();

    p = await open();
    await p.mouse.move(W ? 700 : 195, W ? 600 : 650); await p.mouse.wheel(0, 300); await p.settle(600);
    T(f + ' 往下滑：收起', !(await has(p)));
    await reload(p); T(f + ' 滑过后重读：不再出现', !(await has(p)));
    await p.context().close();

    p = await open();
    const sel = W ? '[data-sel]' : '#calView [data-open]';
    if (!(await p.$(sel)) && !W) { for (const x of await p.$$('#week [data-day]')) { await x.click(); await p.settle(300); if (await p.$(sel)) break } }
    T(f + ' 切换日期后引导条还在', await has(p));
    await p.click(sel); await p.settle(500);
    T(f + ' 点开一场球：收起', !(await has(p)));
    await p.context().close();

    if (W) { p = await open(); await p.keyboard.press('Escape'); await p.settle(600);
      T(f + ' 按 Esc：收起', !(await has(p))); await p.context().close() }

    p = await open({ hash: '?s=link' });
    T(f + ' 从分享链接（?s=）进来：不显示', !(await has(p)));
    T(f + ' 从分享链接进来：不占当天额度', (await seen(p)) === null); await p.context().close();
    p = await open({ hash: '?t=th1&n=9&k=chat' });   // 推送打开（AN.entry=push）：守住「不显示、不算看过」
    T(f + ' 从推送（?t=&n=&k=）进来：不显示、不占额度', !(await has(p)) && (await seen(p)) === null); await p.context().close();
    const q = await open({ flag: false }); const code = await q.evaluate(() => (GAMES.find(g => g.share_code) || {}).share_code); await q.context().close();
    p = await open({ hash: '#/g/' + code });
    T(f + ' 从球局链接（#/g/）进来：不显示', !!code && !(await has(p)), code); await p.context().close();

    // 每天一次、所有人：有登录快照（已登录用户）今天第一次也显示
    p = await open({ init: () => { try { localStorage.setItem('nbq_snap', '{"v":1}') } catch (_) { } } });
    T(f + ' 有登录快照：今天第一次也显示', await has(p)); await p.context().close();
    // 昨天看过今天又显示；旧版 v1 记录照常显示并升级；另一端今天看过不占这一端额度
    p = await open({ init: seed(1, 2, SURF) });
    T(f + ' 昨天看过：今天又显示', await has(p)); const r1 = await seen(p); T(f + ' 今天显示后额度记成今天', r1 && r1.days[SURF] === await today(p) && r1.n === 2, r1); await p.context().close();
    p = await open({ init: seed(0, 2, SURF) });
    T(f + ' 今天已看过：不显示', !(await has(p))); await p.context().close();
    p = await open({ init: seed(0, 2, OTHER) });
    T(f + ' 另一端今天看过：这一端仍显示', await has(p)); await p.context().close();
    p = await open({ init: seed(3, 1) });
    T(f + ' 旧版 v1 记录：照常显示', await has(p)); const r2 = await seen(p); T(f + ' 旧版 v1 记录：升级成 v2 并保留首次时间', r2 && r2.v === 2 && r2.first > 0 && r2.days[SURF] === await today(p), r2); await p.context().close();
    // 停留后自动收起（把时间缩到 4%），收起后当天不再出现
    p = await open({ init: () => { window.__NBQ_INTRO_K = 0.04 } });
    T(f + ' 自动收起：先显示', await has(p));
    await p.settle(2800); T(f + ' 自动收起：停留后消失', !(await has(p))); await p.context().close();
    // 系统开了「减少动态效果」：不播动画，直接显示最终文字
    p = await open({ rm: true });
    const rmv = await p.evaluate(() => { const h = document.getElementById('niH'); return h ? +getComputedStyle(h).opacity : -1 });
    T(f + ' 减少动态效果：直接显示最终文字', await has(p) && rmv === 1, rmv); await p.context().close();

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
