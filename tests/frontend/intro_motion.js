// 首页引导条的「运动不变式」（11-19）：把所有者说过的话写成测试，防止做进正式代码时和定稿原型不一致。
//   场景不变（球场线 / 立柱不动画）· 球一直亮（球层在夜色遮罩之上）· 弹跳平滑（水平单调减速、无速度突变、弹高递减）· 滚动方向与前进方向一致
//   灯亮不闪（灯芯 / 光晕 / 夜色半径只增不减）· 球落稳后不再动 · 退场 = 整条渐隐再折叠，球不动
// 做法：把页面里引导条的动画全部暂停、逐个时间点设 currentTime 读数（不靠计时，没有抖动）。
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const DIR = process.env.NBQ_DIR || path.join(__dirname, '..', '..');
let pass = 0, fail = 0;
const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 300) : '')) };
const FLAG = k => { try { localStorage.setItem('nbq_ff_intro', '1'); if (k) window.__NBQ_INTRO_K = k } catch (_) { } };   // 作为参数传给 addInitScript（闭包变量带不进页面）
(async () => {
  const b = await chromium.launch({}); const errs = [];
  for (const f of ['PWA', 'Web']) {
    const W = f === 'Web', HTML = fs.readFileSync(path.join(DIR, '南伴球_' + f + '.html'));
    const open = async k => {
      const ctx = await b.newContext({ viewport: W ? { width: 1360, height: 860 } : { width: 390, height: 844 } });
      await ctx.addInitScript(FLAG, k); const p = await ctx.newPage(); p.on('pageerror', x => errs.push(f + ' ' + x.message));
      await p.route('https://nanbanqiu.test/**', r => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: HTML }));
      await p.route('https://cdnjs.cloudflare.com/**', r => r.abort()); await p.route('https://basemaps.cartocdn.com/**', r => r.abort());
      await p.goto('https://nanbanqiu.test/'); await p.waitForSelector('#niBall', { timeout: 5000 }); return p };
    // 定格到 t 毫秒（含入场前的延迟）并读数
    const at = (p, t) => p.evaluate(t => { document.getAnimations().forEach(a => { const e = a.effect && a.effect.target; if (e && e.closest && e.closest('#nbqIntro')) { a.pause(); a.currentTime = t } });
      const r = document.getElementById('niBall').getBoundingClientRect(), g = id => document.getElementById(id), op = id => +getComputedStyle(g(id)).opacity;
      const m = new DOMMatrix(getComputedStyle(g('niBSpin')).transform);
      return { x: r.left + r.width / 2, bottom: r.bottom, rot: Math.atan2(m.b, m.a) * 180 / Math.PI, lens: op('niLens'), glow: op('niGlow'), nir: parseFloat(getComputedStyle(document.querySelector('.ni-dim')).getPropertyValue('--nir')) || 0 } }, t);
    let p = await open();
    // 1) 场景不变：动画只作用在球 / 灯 / 夜色 / 文字上，球场线与立柱从不被动画
    const tg = await p.evaluate(() => [...new Set(document.getAnimations().map(a => a.effect && a.effect.target).filter(e => e && e.closest && e.closest('#nbqIntro')).map(e => e.id || e.className || e.tagName))]);
    const okIds = new Set(['niBX', 'niBY', 'niBSq', 'niBSpin', 'niBSh', 'niLens', 'niGlow', 'niEb', 'niH', 'ni-dim']);
    T(f + ' 场景不变：只有球 / 灯 / 夜色 / 文字在动画', tg.every(x => okIds.has(x)), tg);
    // 2) 球一直亮：球层在夜色遮罩之后（盖在它上面）
    T(f + ' 球一直亮：球层盖在夜色遮罩之上', await p.evaluate(() => !!(document.querySelector('.ni-dim').compareDocumentPosition(document.querySelector('.ni-balls')) & Node.DOCUMENT_POSITION_FOLLOWING)));
    // 3) 弹跳：从 t=900（入场开始）到 2650（落稳）每 25ms 一帧
    const S = []; for (let t = 900; t <= 2900; t += 25) S.push(await at(p, t));
    const xs = S.map(s => s.x), dx = xs.slice(1).map((v, i) => v - xs[i]);
    T(f + ' 弹跳：水平单调向左（从不往回走）', dx.every(d => d <= 0.01), dx.filter(d => d > 0.01));
    T(f + ' 弹跳：水平速度一路减小、没有突变（相邻帧速度差 ≤ 1.2px）', dx.slice(1).every((d, i) => Math.abs(d - dx[i]) <= 1.2), Math.max(...dx.slice(1).map((d, i) => Math.abs(d - dx[i]))));
    T(f + ' 弹跳：落稳之后不再动（2650ms 起的最后 250ms 位移 < 0.5px）', Math.abs(xs[xs.length - 1] - xs[xs.length - 11]) < .5 && Math.abs(S[S.length - 1].bottom - S[S.length - 11].bottom) < .5, [xs[xs.length - 1] - xs[xs.length - 11]]);
    const base = S[S.length - 1].bottom, hs = S.map((s, i) => base - s.bottom);   // 越大越高（地面随 x 缓慢下移，只用于数峰）
    const pk = []; for (let i = 1; i < hs.length - 1; i++) if (hs[i] > hs[i - 1] && hs[i] >= hs[i + 1] && hs[i] > 1.5) pk.push(hs[i]);
    T(f + ' 弹跳：弹高逐次变矮，最多 4 个峰', pk.length >= 2 && pk.length <= 4 && pk.every((h, i) => !i || h < pk[i - 1]), pk);
    // 4) 滚动方向：向左前进时逆时针（角度减小）
    let rot = 0, bad = 0; for (let i = 1; i < S.length; i++) { let d = S[i].rot - S[i - 1].rot; d = ((d + 540) % 360) - 180; if (dx[i - 1] < -0.5) { rot++; if (d > 0.5) bad++ } }
    T(f + ' 滚动方向与前进方向一致（向左 = 逆时针）', rot > 10 && bad === 0, { rot, bad });
    // 5) 灯亮不闪：灯芯 / 光晕 / 夜色半径只增不减（t 从 3700 到 7800）
    const L = []; for (let t = 3700; t <= 7800; t += 50) L.push(await at(p, t));
    for (const k of ['lens', 'glow', 'nir']) T(f + ' 灯亮不闪：' + k + ' 单调不减', L.every((s, i) => !i || s[k] >= L[i - 1][k] - 1e-3), L.map(s => +s[k].toFixed(3)).filter((v, i, a) => i && v < a[i - 1]));
    T(f + ' 灯亮：从暗到亮（灯芯 < .2 → 1）', L[0].lens < .2 && L[L.length - 1].lens > .99, [L[0].lens, L[L.length - 1].lens]);
    await p.context().close();
    // 6) 退场：整条渐隐再折叠，球不动（把时间缩到 4%，真实计时采样）
    p = await open(0.04);
    const rows = []; for (let i = 0; i < 40; i++) { await p.waitForTimeout(100); rows.push(await p.evaluate(() => { const e = document.getElementById('nbqIntro'); if (!e) return null;
      return { out: e.classList.contains('out'), x: document.getElementById('niBall').getBoundingClientRect().left, o: +getComputedStyle(e.querySelector('.ni-box')).opacity } })) }
    const ex = rows.filter(r => r && r.out);
    T(f + ' 退场：出现了渐隐阶段', ex.length >= 3, rows.length);
    T(f + ' 退场：球全程不动', ex.length > 0 && ex.every(r => Math.abs(r.x - ex[0].x) < .5), ex.map(r => r.x));
    T(f + ' 退场：整条透明度只降不升，降到 0', ex.length > 0 && ex.every((r, i) => !i || r.o <= ex[i - 1].o + 1e-3) && ex[ex.length - 1].o < .05, ex.map(r => r.o));
    T(f + ' 退场：最后从页面里移除', rows[rows.length - 1] === null);
    await p.context().close();
  }
  T('没有页面报错', errs.length === 0, errs);
  console.log(`intro_motion: ${pass} passed, ${fail} failed`); await b.close(); process.exit(fail ? 1 : 0);
})();
