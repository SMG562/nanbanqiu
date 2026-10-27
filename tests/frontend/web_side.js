// 第八批 F3：网页端接入场边。顶部导航 发现球局 / 我的球局 / 场边（24h）；场边页 = 设计稿 v35 的电脑版（左信息流、右边一列「此刻」），
// 放在 Shadow DOM 里，宽 1240 居中、占满导航以下；窄于 900 时右边一列收起、信息流居中；切走再回来滚动和草稿还在；
// 写操作没登录先登录（登录后接着做）、账号状态拦截同手机端；场边通知进通知弹层和桌面横幅，点开 → 场边那条；右上角菜单「场边相册」；
// 看不见场边时不自动冒新消息；场边事件网页端也发；动画结束不留；没有脚本错误。
const { chromium } = require('playwright');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? '  ✓ ' : 'FAIL ') + n + (ok || x === undefined ? '' : ' ' + JSON.stringify(x).slice(0, 400))) };
const FAKE = +new Date('2026-10-27T14:00:00+11:00');   // 白天（通知不在夜间顺延）
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(ts => { const off = ts - Date.now(), D = Date; class FD extends D { constructor(...a) { a.length ? super(...a) : super(D.now() + off) } static now() { return D.now() + off } } window.Date = FD; window.AN_LOG = [] }, FAKE);
  const pg = await ctx.newPage(), errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('file:///mnt/user-data/outputs/南伴球_Web.html'); await pg.settle(800);
  const W = ms => pg.settle(ms), E = (f, a) => pg.evaluate(f, a);   // E2：W = 页面安静了就继续，最多等原来那么久
  const sr = s => pg.locator('#sbHost').locator(s), sh = s => E(s => document.querySelector('#sbHost').shadowRoot.querySelector(s)?.click(), s);
  const ev = n => E(n => AN_LOG.filter(e => e.ev === n).map(e => e.props), n);
  const modal = () => E(() => document.querySelector('#mbg').classList.contains('show') ? document.querySelector('#modal').textContent : '');
  const others = (k, ...a) => E(([k, a]) => SBV.api.others[k](...a), [k, a]);
  const box = s => E(s => { const e = document.querySelector('#sbHost').shadowRoot.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return r.width ? [r.left, r.top, r.width, r.height].map(Math.round) : null }, s);
  await E(() => { LOC.asked = true; closeModal(); setWho(null); window._tt = []; const ot = toast; toast = function (m) { _tt.push(m); return ot.apply(this, arguments) } });

  // ---- 导航 ----
  const tabs = await E(() => [...document.querySelectorAll('#tabs [data-tab]')].map(x => x.dataset.tab));
  T('导航：发现球局 / 我的球局 / 场边', JSON.stringify(tabs) === '["disc","mine","side"]', tabs);
  T('「场边」右上角带 24h', await E(() => { const b = document.querySelector('#tabs [data-tab="side"]'), s = b.querySelector('.h24'); if (!s) return false; const r = s.getBoundingClientRect(), t = b.getBoundingClientRect();
    return s.textContent === '24h' && r.bottom < t.top + t.height / 2 && r.left > t.left + 20 }));
  T('三个导航按钮高度、上边一样', await E(() => new Set([...document.querySelectorAll('#tabs [data-tab]')].map(b => { const r = b.getBoundingClientRect(); return r.top + ',' + r.height })).size === 1));
  T('没打开过场边时不建 Shadow DOM', await E(() => !document.querySelector('#sbHost').shadowRoot && typeof SBV !== 'undefined' && SBV === null));
  await pg.click('#tabs [data-tab="side"]'); await W(300); await E(() => { SBV.every = 1e9 }); await pg.waitForFunction(() => SBV.qi >= 1, null, { timeout: 4000, polling: 50 }).catch(() => {}); await W(300);   // 等第一条自动新动态冒出来（原来固定等 2.5 秒）
  const s1 = await E(() => { const r = document.querySelector('#sbHost').shadowRoot, el = r.querySelector('.wb>div');
    return { tab: UI.tab, on: document.querySelector('#tabs [data-tab="side"]').classList.contains('on'), layout: document.querySelector('#layout').hidden, scr: document.querySelector('#sbScr').hidden,
      foot: getComputedStyle(document.querySelector('.foot')).display, pill: getComputedStyle(document.querySelector('#commPill')).display, desk: el.classList.contains('desk'),
      rows: r.querySelectorAll('[data-s="home"] .ln').length, phone: r.querySelectorAll('.tabs,.tabsp,.sbar,.island,[data-bell]').length, sh: document.scrollingElement.scrollHeight, ih: innerHeight } });
  T('点「场边」→ 场边页，导航「场边」亮', s1.tab === 'side' && s1.on && s1.layout && !s1.scr, s1);
  T('场边页：电脑版（desk），信息流有内容', s1.desk && s1.rows > 5, s1);
  T('没有手机才有的底栏、状态栏、右上角铃铛（网页端用导航里的）', s1.phone === 0, s1);
  T('页脚、微信群入口不显示；页面本身不滚动（信息流在里面滚）', s1.foot === 'none' && s1.pill === 'none' && s1.sh === s1.ih, s1);
  const rail = await E(() => { const r = document.querySelector('#sbHost').shadowRoot.querySelector('.rail'); return { tpc: !!r.querySelector('.rs1 .tpc'), courts: r.querySelectorAll('[data-court]').length, topics: r.querySelectorAll('[data-topic]').length, txt: r.textContent } });
  T('右边一列：今日推荐、此刻热闹的球场、大家在聊', rail.tpc && rail.courts >= 2 && rail.topics >= 1 && /此刻热闹的球场/.test(rail.txt) && /大家在聊/.test(rail.txt), rail);
  T('信息流里不插手机版的引导卡（在右边一列）', await E(() => document.querySelector('#sbHost').shadowRoot.querySelectorAll('[data-s="home"] .itm,[data-s="home"] .itc').length === 0));

  // ---- 位置 ----
  const navH = await E(() => document.querySelector('.nav').getBoundingClientRect().bottom);
  let wb = await box('.wb'), rl = await box('.rail'), bar = await box('.home .bar'), hd = await box('.home .hd');
  T('1440：场边区宽 1240 居中，从导航下沿到窗口底', wb && wb[2] === 1240 && wb[0] === 100 && wb[1] === Math.round(navH) && wb[1] + wb[3] === 900, { wb, navH });
  T('1440：右边一列在右侧、和信息流不重叠', rl && rl[0] > hd[0] + hd[2] && rl[0] + rl[2] <= wb[0] + wb[2], { rl, hd });
  T('1440：发布栏在信息流下方、不压右边一列', bar && bar[0] + bar[2] <= rl[0] && bar[1] + bar[3] <= 900, { bar, rl });
  await pg.setViewportSize({ width: 860, height: 800 }); await W(400);
  wb = await box('.wb'); rl = await box('.rail'); hd = await box('.home .hd'); bar = await box('.home .bar');
  T('860：右边一列收起', rl === null, rl);
  T('860：信息流、发布栏居中占满', hd && Math.abs(hd[0] + hd[2] / 2 - 430) <= 1 && bar && bar[2] === 860 && wb[3] === 800 - Math.round(navH), { hd, bar, wb });
  await pg.setViewportSize({ width: 1440, height: 900 }); await W(400);

  // ---- 打开详情：右边滑出；关掉不留动画 ----
  const first = await E(() => String(SBV.L.find(x => !x.mine && Date.now() - x.t < 864e5).id));
  await sh(`[data-s="home"] [data-ln="${first}"]`); await W(800);
  await pg.waitForFunction(() => { const r = document.querySelector('#sbHost').shadowRoot, s = r.querySelector('.sheet'); return SBV.open && !s.getAnimations().some(a => a.playState === 'running') }, null, { timeout: 3000, polling: 50 }).catch(() => {});   // 量位置前等滑出动画走完
  const sd = await E(() => { const r = document.querySelector('#sbHost').shadowRoot, s = r.querySelector('.sheet').getBoundingClientRect(); return { open: String(SBV.open), cls: r.querySelector('.wb>div').className, l: Math.round(s.left), w: Math.round(s.width) } });
  T('点一条 → 详情从右边出来（宽 420，靠右）', sd.open === first && /sheeting/.test(sd.cls) && sd.w === 420 && sd.l === 100 + 1240 - 420, sd);
  await sh('[data-shut]'); await W(900);
  T('关掉后没有挂着的动画', await E(() => document.querySelector('#sbHost').shadowRoot.getAnimations().filter(a => !(a instanceof CSSAnimation) && !(a instanceof CSSTransition) && a.playState === 'finished').length === 0));

  // ---- 切走再回来：同一个实例，滚动、草稿还在 ----
  await sr('[data-in]').fill('草稿还在吗'); await E(() => { document.querySelector('#sbHost').shadowRoot.querySelector('[data-sc="home"]').scrollTop = 600 }); await W(100);
  const inst = await E(() => { window._sbv = SBV; return true });
  await pg.click('#tabs [data-tab="disc"]'); await W(400);
  T('切到发现球局：三栏回来，场边藏起来', await E(() => !document.querySelector('#layout').hidden && document.querySelector('#sbScr').hidden && UI.tab === 'disc' && getComputedStyle(document.querySelector('.foot')).display !== 'none'));
  const n0 = await E(() => SBV.L.length); await E(() => { SBV.every = 300 }); await W(1800);
  T('看不见场边时不自动冒新消息', await E(() => SBV.L.length) === n0, { n0, n: await E(() => SBV.L.length) });
  await E(() => { SBV.every = 1e9 });
  await pg.click('#tabs [data-tab="side"]'); await W(400);
  T('再回场边：同一个实例，草稿、滚动位置都在', inst && await E(() => SBV === _sbv) && await sr('[data-in]').inputValue() === '草稿还在吗' && await E(() => document.querySelector('#sbHost').shadowRoot.querySelector('[data-sc="home"]').scrollTop) >= 590);
  await sr('[data-in]').fill('');

  // ---- 没登录：第一次互动时登录，登录后接着做 ----
  const login = async (ph, name) => { await pg.fill('#ph', ph); await pg.locator('[data-a="sendCode"]').first().click(); await W(500); await pg.fill('#otp', '123456'); await W(400);
    await pg.fill('#npName', name); await pg.check('#npAdult'); await pg.locator('[data-a="npDone"]').first().click(); await W(1000) };
  await E(() => { AN_LOG.length = 0 });
  const ball = sr('[data-s="home"] [data-ball]').first(), bid = await ball.getAttribute('data-ball');
  const on0 = await E(id => !!SBV.L.find(x => String(x.id) === id).my, bid);
  await ball.click(); await W(450);
  T('没登录点网球 → 网页端登录弹窗（说明「点网球前…」）', /点网球前/.test(await modal()), await modal());
  T('登录入口记 login_open trigger = sideline', (await ev('login_open')).slice(-1)[0]?.trigger === 'sideline', await ev('login_open'));
  await login('0412 345 678', 'Tess');
  T('登录后接着把网球点上，还在场边页', await E(id => !!SBV.L.find(x => String(x.id) === id).my, bid) === !on0 && await E(() => UI.tab) === 'side');
  T('sb_ball 网页端也发', (await ev('sb_ball')).length >= 1, await ev('sb_ball'));

  // ---- 账号状态 ----
  await E(() => { setWho('jason'); acctDemo('suspended'); closeModal() }); await W(300);
  const m0 = await E(() => SBV.L.filter(x => x.mine).length);
  await sr('[data-in]').fill('暂停了还能发吗'); await sr('[data-send]').click(); await W(500);
  T('暂停的账号发布 → 拦下（account_blocked action = sb_post），没发出去', (await ev('account_blocked')).some(p => p.action === 'sb_post') && await E(() => SBV.L.filter(x => x.mine).length) === m0, await ev('account_blocked'));
  await E(() => { closeModal(); acctDemo('active'); USERS.jason.status = 'active'; setWho('jason') }); await sr('[data-in]').fill(''); await W(200);

  // ---- 场边通知：通知弹层、桌面横幅、点开去处 ----
  await E(() => { for (let i = NOTIFS.length - 1; i >= 0; i--) if (NOTIFS[i].kind.startsWith('sb_')) NOTIFS.splice(i, 1) });
  await pg.click('#tabs [data-tab="mine"]'); await W(300);
  await others('reply', 21, '这张光影绝了'); await W(300);
  const dn = await E(() => { const d = document.querySelector('#dn'); return d.classList.contains('show') ? d.textContent : '' });
  T('不在场边页收到回复 → 桌面横幅', /回复了你/.test(dn) && /这张光影绝了/.test(dn), dn);
  T('导航铃铛红点算上场边通知', await E(() => !document.querySelector('#nBadge').hidden && +document.querySelector('#nBadge').textContent >= 1));
  await E(() => togglePop(true)); await W(200);
  const nid = await E(() => NOTIFS.find(n => n.kind === 'sb_reply').id);
  const row = await E(id => { const x = document.querySelector(`#pop [data-wn="${id}"]`); return x ? { txt: x.textContent, av: !!x.querySelector('.av.sbav') } : null }, nid);
  T('通知弹层里有这条：文字同手机端、场边的字母头像', row && /回复了你/.test(row.txt) && /这张光影绝了/.test(row.txt) && row.av, row);
  await others('reply', 21, '我也想去拍'); await W(200);
  T('弹层开着时合并 → 弹层跟着更新（最近一条的内容）', await E(id => (document.querySelector(`#pop [data-wn="${id}"]`) || {}).textContent || '', nid).then(t => /我也想去拍/.test(t)));
  await E(() => { AN_LOG.length = 0 });
  await pg.locator(`#pop [data-wn="${nid}"]`).click(); await W(900);
  const op = await E(() => ({ shown: !document.querySelector('#sbScr').hidden && document.querySelector('#layout').hidden, tab: UI.tab, open: String(SBV.open), cls: document.querySelector('#sbHost').shadowRoot.querySelector('.wb>div').className, pop: document.querySelector('#pop').classList.contains('show') }));
  T('点开 → 弹层收起，切到场边，打开那条发布', op.shown && op.tab === 'side' && op.open === '21' && /sheeting/.test(op.cls) && !op.pop, op);
  T('点开记 sb_post_view（via notif）', (await ev('sb_post_view')).some(p => p.via === 'notif' && p.post_id === 21), await ev('sb_post_view'));
  await sh('[data-shut]'); await W(600);
  await pg.click('#tabs [data-tab="disc"]'); await W(300);
  await others('ball', 22, 'Coco'); await W(300);
  await E(() => document.querySelector('#dn').click()); await W(900);
  T('点桌面横幅 → 场边那条', await E(() => UI.tab) === 'side' && await E(() => String(SBV.open)) === '22');
  await sh('[data-shut]'); await W(600);
  await others('ball', 22, 'Ray'); await W(100);
  const gone = await E(() => { const n = NOTIFS.find(n => n.kind === 'sb_ball' && n.sb_post_id === 22 && !n.read); const x = SBV.L.find(x => x.id === 22); SBV.L.splice(SBV.L.indexOf(x), 1); return n.id });
  await E(() => togglePop(true)); await W(200); await pg.locator(`#pop [data-wn="${gone}"]`).click(); await W(300);
  T('点开已不在的 → 「这条已经不在了」', (await E(() => _tt)).includes('这条已经不在了'), await E(() => _tt));
  await E(() => togglePop(false));

  // ---- 场边相册 ----
  await pg.click('#tabs [data-tab="mine"]'); await W(200);
  await E(() => toggleUmenu()); await W(200);
  T('右上角菜单有「场边相册」', await E(() => /场边相册/.test(document.querySelector('#umenu').textContent)));
  await pg.locator('#umenu [data-a="sbAlbum"]').click(); await W(700);
  T('点「场边相册」→ 场边页打开相册，菜单收起', await E(() => UI.tab === 'side' && !document.querySelector('#sbScr').hidden && document.querySelector('#layout').hidden && !!SBV.album && !document.querySelector('#umenu').classList.contains('show')), { tab: await E(() => UI.tab), album: await E(() => SBV.album) });
  T('sb_album_open 网页端也发', (await ev('sb_album_open')).length >= 1);

  T('没有脚本错误', errs.length === 0, errs);
  console.log(`\n${pass} passed, ${fail} failed`); await b.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1) });
