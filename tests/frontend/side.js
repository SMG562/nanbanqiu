// 第八批 F1a：手机端接入场边（只看部分）。底栏 发现 / 球局 / ＋ / 场边 / 我的；消息移到右上角（各页同一个红点）；
// 场边页是设计稿 v35 的 App（放在 Shadow DOM 里），话题 / 今日推荐 / 底栏问题来自内置的第 1 版配置；盖在上面的页面要盖住底栏；
// 从「我的」进场边相册，返回回到「我的」；看不见场边时不自动冒新消息；没有脚本错误。
const { chromium } = require('playwright');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? '  ✓ ' : 'FAIL ') + n + (ok || x === undefined ? '' : ' ' + JSON.stringify(x).slice(0, 400))) };
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); await ctx.addInitScript(() => { window.AN_LOG = [] });
  const pg = await ctx.newPage(), errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('file:///mnt/user-data/outputs/南伴球_PWA.html'); await pg.waitForTimeout(800);
  await pg.evaluate(() => { LOC.asked = true; closeSheet(); setWho('jason', true) }); await pg.waitForTimeout(300);
  const W = ms => pg.waitForTimeout(ms), E = f => pg.evaluate(f), S = f => pg.evaluate(f);   // S：在场边的 Shadow DOM 里取值
  const SR = 'document.querySelector("#sbHost").shadowRoot';

  // ---- 底栏与右上角消息 ----
  const tabs = await E(() => [...document.querySelectorAll('#tabbar > button')].map(x => x.dataset.tab || x.dataset.a));
  T('底栏：发现 / 球局 / ＋ / 场边 / 我的', JSON.stringify(tabs) === JSON.stringify(['disc', 'mine', 'create', 'side', 'me']), tabs);
  T('底栏没有「消息」', await E(() => !document.querySelector('#tabbar [data-tab="notif"]')));
  const bells = [];
  for (const t of ['disc', 'mine', 'me']) {
    await pg.click(`#tabbar [data-tab="${t}"]`); await W(200);
    const r = await pg.evaluate(t => { const x = document.querySelector(`#scr-${t} .tbell`), r = x && x.getBoundingClientRect(), main = document.querySelector('#nBadge'), bd = x && x.querySelector('.badge');
      return { vis: !!r && r.width > 0 && r.right > 300 && r.top < 140, same: !!bd && bd.hidden === main.hidden && bd.textContent === main.textContent, n: main.textContent } }, t);
    T(`${t}：右上角有消息，红点数字一致`, r.vis && r.same && +r.n > 0, r);
    bells.push(await pg.evaluate(t => { const d = document.querySelector('#dev').getBoundingClientRect(), x = document.querySelector(`#scr-${t} .tbell`), r = x.getBoundingClientRect(), s = x.querySelector('svg').getBoundingClientRect(); return [r.left - d.left, r.top - d.top, r.width, r.height, s.left - d.left, s.top - d.top, s.width].map(Math.round).join(',') }, t));
  }
  await pg.click('#tabbar [data-tab="mine"]'); await W(150); await pg.click('#scr-mine .tbell'); await W(250);
  T('点右上角消息 → 消息页', await E(() => UI.tab === 'notif' && !document.querySelector('#scr-notif').hidden));
  await pg.click('#scr-notif [data-a="nBack"]'); await W(250);
  T('消息页返回 → 回到刚才的页面（球局）', await E(() => UI.tab === 'mine'));

  // ---- 场边页 ----
  await pg.click('#tabbar [data-tab="side"]'); await W(1500);
  const s1 = await E(new Function(`const r=${SR};return {root:!!r,rows:r?r.querySelectorAll('[data-s="home"] .ln').length:0,on:document.querySelector('#tabbar [data-tab="side"]').classList.contains('on'),
    tabs:r?r.querySelectorAll('.tabs').length:-1,sbar:r?r.querySelectorAll('.sbar,.island').length:-1,bell:r?r.querySelector('[data-bell] [data-bn]').textContent:'',n:document.querySelector('#nBadge').textContent}`));
  T('场边页：用 Shadow DOM，信息流有内容，底栏「场边」亮', s1.root && s1.rows > 5 && s1.on, s1);
  T('场边页：没有设计稿自带的底栏、状态栏', s1.tabs === 0 && s1.sbar === 0, s1);
  T('场边页右上角消息红点 = 其他页', s1.bell === s1.n && +s1.n > 0, s1);
  const sb = await E(() => { const d = document.querySelector('#dev').getBoundingClientRect(), x = document.querySelector('#sbHost').shadowRoot.querySelector('[data-bell]'), r = x.getBoundingClientRect(), s = x.querySelector('svg').getBoundingClientRect(); return [r.left - d.left, r.top - d.top, r.width, r.height, s.left - d.left, s.top - d.top, s.width].map(Math.round).join(',') });
  T('右上角消息：四个页面位置、大小完全一样（发现 / 球局 / 我的 / 场边）', new Set([...bells, sb]).size === 1, [...bells, sb]);
  const bs = await E(() => { const f = e => { const c = getComputedStyle(e); return [c.backgroundColor, c.color, c.font, c.borderTop, c.minWidth, c.height, c.paddingLeft].join('|') }; return [f(document.querySelector('#nBadge')), f(document.querySelector('#sbHost').shadowRoot.querySelector('[data-bn]'))] });
  T('右上角红点：场边页和其他页同一套样式', bs[0] === bs[1], bs);
  const cfg = await E(() => { const id = SB.today(), t = SB.topics()[id]; return { id, t: t && t.t, k: t && t.k } });
  const card = await E(new Function(`const r=${SR};const c=r.querySelector('.itc');return c?c.textContent:''`));
  T('今日推荐卡片 = 配置算出的今日话题（测试时间周三 → 本周最热）', !!cfg.t && card.includes('#' + cfg.t) && card.includes('今日推荐 · 周三') && cfg.id === 'u2', { cfg, card: card.slice(0, 80) });
  const hint = await E(new Function(`return ${SR}.querySelector('[data-hint]').textContent`));
  const allow = await E(() => { const T = SB.topics(); return [...SB.hints('general').map(x => x.t), ...SB.CFG.slots.flatMap(s => s.topics).map(id => T[id] && T[id].ask), ...SB.hints('lost').map(x => x.t)] });
  T('底栏问题来自配置', allow.includes(hint), { hint });
  T('常驻话题名字 = 配置（10 个，按顺序）', await E(() => { const T = SB.topics(), ev = SB.CFG.topics.filter(t => t.kind === 'evergreen'); return ev.length === 10 && ev.every(t => T[t.id] && T[t.id].t === t.title && T[t.id].ask === t.ask && JSON.stringify(T[t.id].fills) === JSON.stringify(t.starters)) }));
  const ml = await E(new Function(`return +${SR}.querySelector('[data-in]').maxLength`));
  T('发布字数上限 = 配置 post_max_len', ml === await E(() => SB.CFG.settings.post_max_len), ml);

  // 盖在上面的页面盖住底栏
  await E(new Function(`${SR}.querySelector('[data-cam]').click()`)); await W(900);
  const cov = await E(() => { const s = document.querySelector('#scr-side'), tb = document.querySelector('#tabbar'); return { top: s.classList.contains('top'), z: +getComputedStyle(s).zIndex > +getComputedStyle(tb).zIndex } });
  T('打开发布页：盖住 App 的底栏', cov.top && cov.z, cov);
  await E(new Function(`const x=${SR}.querySelector('[data-cx]');x&&x.click()`)); await W(900);
  T('关掉发布页：底栏回来', await E(() => !document.querySelector('#scr-side').classList.contains('top')));
  await E(new Function(`${SR}.querySelectorAll('[data-s="home"] .ln')[1].click()`)); await W(900);
  T('打开一条：盖住底栏', await E(() => document.querySelector('#scr-side').classList.contains('top')));
  await E(new Function(`const x=${SR}.querySelector('[data-shut]');x&&x.click()`)); await W(900);

  // 场边里的消息
  await E(new Function(`${SR}.querySelector('[data-bell]').click()`)); await W(300);
  T('场边右上角消息 → 消息页；返回回到场边', await E(() => UI.tab === 'notif') && (await pg.click('#scr-notif [data-a="nBack"]'), await W(250), await E(() => UI.tab === 'side')));

  // 看不见时不冒新消息
  const n0 = await E(new Function(`return ${SR}.querySelectorAll('[data-s="home"] .ln').length`));
  await pg.click('#tabbar [data-tab="disc"]'); await W(8000);
  const n1 = await E(new Function(`return ${SR}.querySelectorAll('[data-s="home"] .ln').length`));
  T('不在场边页时，不自动冒新消息', n1 === n0, [n0, n1]);
  await pg.click('#tabbar [data-tab="side"]'); await W(7500);
  const n2 = await E(new Function(`return ${SR}.querySelectorAll('[data-s="home"] .ln').length`));
  T('回到场边页，新消息继续冒出来', n2 > n1, [n1, n2]);
  // 新动态的气泡：底是单独一层（.bb），褪去后连同 bub 一起移除；动画结束后不留 fill（WAAPI 动画全部释放）
  const lk = await E(() => new Promise(res => { const root = document.querySelector('#sbHost').shadowRoot, born = new Map(); let max = 0, n = 0, pcN = 0; const t0 = performance.now();
    const iv = setInterval(() => { const now = performance.now(); root.querySelectorAll('.bb').forEach(e => { if (!born.has(e)) { born.set(e, now); n++; if (e.closest('.pc')) pcN++ } max = Math.max(max, now - born.get(e)) });
      if (now - t0 > 16000) { clearInterval(iv); const idle = root.getAnimations().filter(a => !(a instanceof CSSAnimation) && !(a instanceof CSSTransition) && a.playState === 'finished');
        res({ n, pcN, max: Math.round(max), idle: idle.length, bub: [...root.querySelectorAll('.tx.bub')].filter(t => !t.querySelector(':scope>.bb')).length,
          blurOnText: [...root.querySelectorAll('.tx')].filter(t => getComputedStyle(t).backdropFilter !== 'none').length }) } }, 100) }));
  T('新动态气泡：每个气泡底 4 秒内移除，没有留下的 bub', lk.n >= 2 && lk.max < 4000 && lk.bub === 0, lk);
  T('新动态气泡：动画结束后不留 fill（没有已结束还挂着的动画）', lk.idle === 0, lk);
  T('带照片的新动态：毛玻璃只在气泡底那一层，文字本身不带', lk.pcN >= 1 && lk.blurOnText === 0, lk);

  // 从「我的」进相册
  await pg.click('#tabbar [data-tab="me"]'); await W(250);
  T('「我的」页有场边相册入口', await E(() => !!document.querySelector('#scr-me [data-a="sbAlbum"]')));
  await pg.click('#scr-me [data-a="sbAlbum"]'); await W(1000);
  const al = await E(new Function(`const r=${SR};return {tab:UI.tab,in:r.querySelector('.dev').classList.contains('inalbum'),top:document.querySelector('#scr-side').classList.contains('top'),n:r.querySelectorAll('.album [data-ln],.album .tn,.album img,.album .ag>*').length}`));
  T('点「场边相册」→ 场边的相册（盖住底栏）', al.tab === 'side' && al.in && al.top, al);
  await E(new Function(`${SR}.querySelector('[data-aback]').click()`)); await W(800);
  T('相册返回 → 回到「我的」', await E(() => UI.tab === 'me'));

  // 埋点：切到场边记 page_view
  const pv = await E(() => AN_LOG.filter(e => e.ev === 'page_view').map(e => e.props.screen));
  T('切到场边记 page_view（screen = side）', pv.includes('side'), pv);
  T('没有脚本错误', !errs.length, errs.slice(0, 3));
  await b.close(); console.log(`${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
})();
