// 添加到桌面引导 v2（开关 NBQ_A2HS2_ON，11-15）：「比下载 App 更简单」。一屏一件事：为什么 → 怎么做（循环演示，最多三步）→ 去桌面。
//   没有「我已添加」按钮：用户一点「添加」系统就把他带回桌面，不会回来点；回到页面时才显示「放好了吗？」（用页面可见性模拟）。
//   为什么：旧引导是三行文字，用户要自己把文字对到屏幕上；真机上第一次添加最容易卡在「分享按钮在哪」。
//   查什么：① 开关开 + iPhone Safari：三屏能往前 / 往回走，文案是新的，没有旧的三行步骤  ② iPhone 其他浏览器 / App 内置浏览器：先让换 Safari（复制链接），不进三步
//           ③ 点「好的」才记「我已添加」，点「以后再说」不记  ④ 开关关 / 安卓：完全是旧界面  ⑤ 埋点 a2hs_open 只在打开时发一次，翻页不重复；hoGuide 照常调用
//           ⑥ 演示真的在动（CSS 动画 9 秒一圈），开了「减少动态效果」就不动  ⑦ 小屏（320×568）不横向溢出  ⑧ 「好的」屏的文案随登录交接是否就绪变化
//   查不到什么：iOS 真机上 Safari 的实际样子、用户看懂没有（真机清单 + 之后的埋点漏斗）。
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const DIR = process.env.NBQ_DIR || path.join(__dirname, '..', '..');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 400) : '')) };
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) ';
const UAS = { ios_safari: IOS + 'Version/18.0 Mobile/15E148 Safari/604.1', ios_other: IOS + 'CriOS/130.0 Mobile/15E148 Safari/604.1', inapp: IOS + 'Mobile/15E148 MicroMessenger/8.0',
  android: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36' };
(async () => {
  const b = await chromium.launch({ executablePath: process.env.NBQ_CHROMIUM || '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const mk = async (ua, flag, size = { width: 390, height: 844 }, reduce = false) => {
    const ctx = await b.newContext({ viewport: size, userAgent: ua, hasTouch: true, isMobile: true, reducedMotion: reduce ? 'reduce' : 'no-preference' });
    if (flag) await ctx.addInitScript(() => { try { localStorage.setItem('nbq_ff_a2hs2', '1') } catch (_) { } });
    const pg = await ctx.newPage(), errs = []; pg.on('pageerror', e => errs.push(e.message));
    await pg.route('https://nanbanqiu.test/**', r => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: fs.readFileSync(path.join(DIR, '南伴球_PWA.html')) }));
    await pg.route('https://cdnjs.cloudflare.com/**', r => r.abort()); await pg.route('https://basemaps.cartocdn.com/**', r => r.abort());
    await pg.goto('https://nanbanqiu.test/'); await pg.settle(500);
    await pg.evaluate(() => { window.__tr = []; window.__hg = 0; const o = track; track = function (n) { window.__tr.push(n); return o.apply(this, arguments) }; const g = hoGuide; hoGuide = function () { window.__hg++; return g.apply(this, arguments) } });
    const txt = () => pg.evaluate(() => (document.querySelector('#sheet') || document.body).innerText);
    const click = async sel => { await pg.evaluate(s => document.querySelector(s).click(), sel); await pg.settle(300) };
    const open = async () => { await pg.evaluate(() => openA2HS()); await pg.settle(400) };
    return { ctx, pg, errs, txt, click, open } };

  // ① iPhone Safari，开关开：三屏
  let s = await mk(UAS.ios_safari, true); await s.open();
  let t = await s.txt();
  T('① 第一屏：新标题和副标题', /比下载 App 更简单/.test(t) && /把南伴球放到桌面，所有球局都不错过/.test(t), t.slice(0, 120));
  T('① 第一屏：三个好处（不用下载 / 球友回复 / 不错过球局），不再有「一点就开」', /不用下载，没有负担/.test(t) && /有人回复，马上提醒/.test(t) && /所有球局，一眼看到/.test(t) && !/一点就开/.test(t), t);
  T('① 第一屏：主按钮「放到桌面」，下面是「以后再说」；没有旧的三行步骤，用的是真图标', await s.pg.evaluate(() => !!document.querySelector('[data-a="a2hsNext"]') && !!document.querySelector('[data-a="close"]') && !document.querySelector('.a2s') && document.querySelector('.a2v-ic').getAttribute('src') === '/icons/icon-180.png'));
  T('⑤ 打开时埋点 a2hs_open 一次、hoGuide 调用一次', await s.pg.evaluate(() => window.__tr.filter(x => x === 'a2hs_open').length === 1 && window.__hg === 1), await s.pg.evaluate(() => [window.__tr, window.__hg]));
  await s.click('[data-a="a2hsNext"]'); t = await s.txt();
  T('① 第二屏：「三步，放到桌面」，三个步骤文字、演示；没有「我已添加」按钮', /三步，放到桌面/.test(t) && /点「≡」，选「分享」/.test(t) && /往上滑，点「添加到主屏幕」/.test(t) && /点右上角的「添加」/.test(t) && !/我已添加/.test(t) && await s.pg.evaluate(() => !!document.querySelector('.a2d') && document.querySelectorAll('.a2v-c li').length === 3 && !document.querySelector('.a2v-c ~ .btn, .a2d ~ .btn')), t);
  const an = await s.pg.evaluate(() => { const g = (q, k) => getComputedStyle(document.querySelector(q))[k]; return { shs: g('.a2d-shs', 'animationName'), dur: g('.a2d-shs', 'animationDuration'), cap2: g('.a2v-c li:nth-child(2)', 'animationDelay'), cap3: g('.a2v-c li:nth-child(3)', 'animationDelay'), hl: g('.a2v-c .hl', 'animationName'), u: g('.a2v-c u', 'animationName') } });
  T('⑥ 演示在动：分享面板、说明条都是 9 秒一圈的 CSS 动画，第 2、3 条依次错开 3 秒（负延迟，开头就是暗的）', an.shs !== 'none' && an.dur === '9s' && an.cap2 === '-6s' && an.cap3 === '-3s', an);
  T('⑥ 高亮只用透明度叠层（iOS 上 background / color 的关键帧不可靠，真机截图里曾没高亮）', an.hl === 'a2hl' && an.u === 'a2hl' && !/background|color/.test(await s.pg.evaluate(() => [...document.styleSheets].flatMap(x => { try { return [...x.cssRules] } catch (_) { return [] } }).filter(r => r.name === 'a2cap' || r.name === 'a2hl').map(r => r.cssText).join(' '))), an);
  T('⑤ 翻页不重复埋点、不再调 hoGuide', await s.pg.evaluate(() => window.__tr.filter(x => x === 'a2hs_open').length === 1 && window.__hg === 1));
  // 离开页面（去分享、添加、被带回桌面）再回来 → 「放好了吗？」
  const vis = v => s.pg.evaluate(v => { Object.defineProperty(document, 'visibilityState', { get: () => v, configurable: true }); document.dispatchEvent(new Event('visibilitychange')) }, v);
  await vis('hidden'); await vis('visible'); await s.pg.settle(300); t = await s.txt();
  T('① 在演示屏离开页面再回来：显示「放好了吗？」，有桌面示意和「好的」', /放好了吗/.test(t) && /回到桌面，点南伴球/.test(t) && /好的/.test(t) && await s.pg.evaluate(() => !!document.querySelector('.a2v-home .me img')), t);
  T('⑧ 登录交接没就绪：写「登录一次，之后都不用再登录」', /登录一次，之后都不用再登录/.test(t) && !/自动登录/.test(t), t);
  await s.pg.evaluate(() => { HO_READY = true; a2hsScreen('go') }); await s.pg.settle(300); t = await s.txt();
  T('⑧ 登录交接就绪：写「从图标打开，自动登录」', /从图标打开，自动登录/.test(t), t);
  await s.click('[data-a="a2hsBack"]'); t = await s.txt();
  T('① 在「放好了吗」点「还没添加？再看一遍」：回到演示屏', /三步，放到桌面/.test(t));
  await s.click('[data-a="a2hsBack"]'); t = await s.txt();
  T('① 在演示屏点「返回」：回到第一屏', /比下载 App 更简单/.test(t));
  // 不在演示屏 / 弹层已关：离开再回来不弹「放好了吗」
  await vis('hidden'); await vis('visible'); await s.pg.settle(300); t = await s.txt();
  T('① 在第一屏离开再回来：不出现「放好了吗」', !/放好了吗/.test(t), t);
  await s.click('[data-a="a2hsNext"]'); await s.pg.evaluate(() => closeSheet()); await s.pg.settle(300); await vis('hidden'); await vis('visible'); await s.pg.settle(300);
  T('① 演示屏时弹层已关：离开再回来不重新打开弹层', await s.pg.evaluate(() => !document.querySelector('#sheet').classList.contains('show')));
  await s.pg.evaluate(() => a2hsScreen('go')); await s.pg.settle(300); await s.click('[data-a="a2hsDone"]');
  T('③ 点「好的」：记下「我已添加」、弹层收起', await s.pg.evaluate(() => !!localStorage.getItem('nbq_a2hs_ok') && !document.querySelector('#sheet').classList.contains('show')));
  T('① 没有脚本错误', s.errs.length === 0, s.errs); await s.ctx.close();

  // ③ 「以后再说」不记「我已添加」
  s = await mk(UAS.ios_safari, true); await s.open(); await s.click('[data-a="close"]');
  T('③ 点「以后再说」：弹层收起，不记「我已添加」', await s.pg.evaluate(() => !localStorage.getItem('nbq_a2hs_ok') && !document.querySelector('#sheet').classList.contains('show')));
  await s.ctx.close();

  // ② 其他浏览器 / App 内置浏览器：先换 Safari
  for (const [k, re] of [['ios_other', /只有 Safari 能把网页放到 iPhone 桌面/], ['inapp', /微信等 App 里不能放到桌面/]]) {
    s = await mk(UAS[k], true); await s.open(); t = await s.txt();
    T(`② ${k}：「先用 Safari 打开」+ 对应说明 + 复制链接，不进三步`, /先用 Safari 打开/.test(t) && re.test(t) && await s.pg.evaluate(() => !!document.querySelector('[data-a="a2hsLink"]') && !document.querySelector('[data-a="a2hsNext"]') && !document.querySelector('.a2s')), t);
    T(`② ${k}：没有脚本错误`, s.errs.length === 0, s.errs); await s.ctx.close() }

  // ④ 开关关 / 安卓：旧界面
  s = await mk(UAS.ios_safari, false); await s.open(); t = await s.txt();
  T('④ 开关关：iPhone Safari 仍是旧界面（三行步骤、「点屏幕底部的分享」）', await s.pg.evaluate(() => document.querySelectorAll('.a2s').length === 3 && !document.querySelector('.a2v')) && /点屏幕底部的「分享」/.test(t) && !/比下载 App 更简单/.test(t), t); await s.ctx.close();
  s = await mk(UAS.android, true); await s.open(); t = await s.txt();
  T('④ 开关开：安卓仍是旧界面（⋮ 菜单三步）', await s.pg.evaluate(() => document.querySelectorAll('.a2s').length === 3 && !document.querySelector('.a2v')) && /⋮/.test(t), t); await s.ctx.close();

  // ⑥ 减少动态效果：演示不动
  s = await mk(UAS.ios_safari, true, { width: 390, height: 844 }, true); await s.open(); await s.click('[data-a="a2hsNext"]');
  const rm = await s.pg.evaluate(() => ({ shs: getComputedStyle(document.querySelector('.a2d-shs')).animationName, pop: getComputedStyle(document.querySelector('.a2d-pop')).opacity, li: getComputedStyle(document.querySelector('.a2v-c li')).animationName, liop: getComputedStyle(document.querySelector('.a2v-c li')).opacity }));
  T('⑥ 开了「减少动态效果」：演示和说明条都不动，菜单固定显示，三条说明都清楚可读', rm.shs === 'none' && rm.pop === '1' && rm.li === 'none' && rm.liop === '1', rm); await s.ctx.close();

  // ⑦ 小屏不横向溢出
  s = await mk(UAS.ios_safari, true, { width: 320, height: 568 }); await s.open();
  for (const step of ['why', 'how', 'go']) {
    if (step !== 'why') { await s.pg.evaluate(k => a2hsScreen(k), step); await s.pg.settle(300) }
    const o = await s.pg.evaluate(() => { const e = document.querySelector('#sheet'); return { sw: e.scrollWidth, cw: e.clientWidth, over: [...e.querySelectorAll('*')].filter(x => x.getBoundingClientRect().right > e.getBoundingClientRect().right + 1).length } });
    T(`⑦ 320 宽小屏「${step}」屏：不横向溢出`, o.sw <= o.cw && o.over === 0, o) }
  T('⑦ 小屏没有脚本错误', s.errs.length === 0, s.errs); await s.ctx.close();

  await b.close(); console.log(`a2hs_v2: ${pass} 通过, ${fail} 失败`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1) });
