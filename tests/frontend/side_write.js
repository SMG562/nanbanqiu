// 第八批 F1b：手机端场边的发布与互动。没登录在第一次互动时登录（登录后接着做、草稿还在）；
// 发布 / 回复 / 网球看账号状态（暂停、封禁不行，待核实、受限可以）；不感兴趣、屏蔽、举报只要登录；
// 按接口文档 §14 的错误码给提示（链接、频率、回复已关闭、重复举报）；话题名：太宽的词、相似词（配置）、同名并入、不允许的名字。
const { chromium } = require('playwright');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? '  ✓ ' : 'FAIL ') + n + (ok || x === undefined ? '' : ' ' + JSON.stringify(x).slice(0, 400))) };
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); await ctx.addInitScript(() => { window.AN_LOG = [] });
  const pg = await ctx.newPage(), errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('file:///mnt/user-data/outputs/南伴球_PWA.html'); await pg.settle(800);
  await pg.evaluate(() => { LOC.asked = true; closeSheet(); setWho(null, true) }); await pg.settle(300);
  const W = ms => pg.settle(ms), E = (f, a) => pg.evaluate(f, a);   // E2：W = 页面安静了就继续，最多等原来那么久
  const sr = s => pg.locator('#sbHost').locator(s);   // playwright 的 locator 能穿过 Shadow DOM
  const sheet = () => E(() => { const s = document.querySelector('#sheet'); return s && s.classList.contains('show') ? s.textContent : '' });
  const toast = () => E(() => { const t = document.querySelector('#sbHost').shadowRoot.querySelector('.toast'); return t.classList.contains('show') ? t.textContent : '' });
  const ev = n => E(n => AN_LOG.filter(e => e.ev === n).map(e => e.props), n);
  const login = async (ph, name) => { await pg.fill('#ph', ph); await pg.locator('[data-a="sendCode"]').first().click(); await W(500); await pg.fill('#otp', '123456'); await W(400);
    await pg.fill('#npName', name); await pg.check('#npAdult'); await pg.locator('[data-a="npDone"]').first().click(); await W(1000) };
  await pg.click('#tabbar [data-tab="side"]'); await W(300);
  await E(() => { SBV.every = 1e9 }); await pg.waitForFunction(() => SBV.qi >= 1, null, { timeout: 4000, polling: 50 }).catch(() => {}); await W(300);   // 等第一条自动新动态冒出来（原来固定等 2.5 秒）   // 演示的自动新动态只冒第一条，之后不再冒，免得干扰数数

  // ---- 没登录：第一次互动时登录，登录后接着做 ----
  // 信息流里的照片卡片双击点网球，同样要先登录（原来这条路径漏了登录检查）
  { const card = sr('[data-s="home"] .ln.pc').first(), cid = await card.getAttribute('data-ln'), m0 = await E(id => !!SBV.L.find(x => String(x.id) === id).my, cid);
    await card.scrollIntoViewIfNeeded(); await card.dblclick({ position: { x: 180, y: 150 } }); await W(450);
    T('没登录双击照片卡片 → 先登录（说明「点网球前…」）', /点网球前/.test(await sheet()), await sheet());
    T('没登录双击照片卡片：网球没点上', await E(id => !!SBV.L.find(x => String(x.id) === id).my, cid) === m0);
    await E(() => closeSheet()); await W(300) }
  const ball = sr('[data-s="home"] [data-ball]').first(), bid = await ball.getAttribute('data-ball');
  const on0 = await E(id => !!SBV.L.find(x => String(x.id) === id).my, bid);
  await ball.click(); await W(450);
  T('没登录点网球 → 先登录（说明「点网球前…」）', /点网球前/.test(await sheet()), await sheet());
  T('没登录点网球：网球还没点上', await E(id => !!SBV.L.find(x => String(x.id) === id).my, bid) === on0);
  T('登录入口记 login_open trigger = sideline', (await ev('login_open')).slice(-1)[0]?.trigger === 'sideline', await ev('login_open'));
  await login('0412 345 678', 'Tess');
  T('登录后接着把网球点上', await E(id => !!SBV.L.find(x => String(x.id) === id).my, bid) === !on0);
  T('login_success trigger = sideline', (await ev('login_success')).slice(-1)[0]?.trigger === 'sideline', await ev('login_success'));

  await E(() => { setWho(null, true) }); await W(200);
  const n0 = await E(() => SBV.L.filter(x => x.mine).length);
  await sr('[data-in]').fill('今天风好大'); await W(100); await sr('[data-send]').click(); await W(450);
  T('没登录发布 → 先登录（说明「发布前…」），草稿还在', /发布前/.test(await sheet()) && await sr('[data-in]').inputValue() === '今天风好大', await sheet());
  await login('0413 111 222', 'Ivy');
  T('登录后接着发出去（刚写的那条）', await E(() => SBV.L.filter(x => x.mine).length) === n0 + 1 && await E(() => SBV.L.some(x => x.mine && x.x === '今天风好大')) && await sr('[data-in]').inputValue() === '');

  await E(() => { setWho(null, true) }); await W(200);
  const other = await E(() => String(SBV.L.find(x => !x.mine && !x.closed).id));
  await E(id => { const r = document.querySelector('#sbHost').shadowRoot.querySelector(`[data-ln="${id}"]`); r ? r.click() : 0 }, other); await W(500);
  if (!(await E(() => SBV.open))) await E(id => { SBV.open = id }, other);
  await sr('.sheet [data-menu]').click(); await W(300); await sr('[data-act="report"]').click(); await W(400);
  T('没登录举报 → 先登录（说明「举报前…」）', /举报前/.test(await sheet()), await sheet());
  await E(() => closeSheet()); await W(300); await E(() => { setWho('jason', true) }); await W(200);

  // ---- 账号状态 ----
  const st = async (s, open) => E(([s, open]) => { const u = USERS.jason; u.status = s; u.status_until = s === 'suspended' ? Date.now() + 7 * 864e5 : null; u.status_reason = s === 'suspended' ? '多次爽约' : null; AN_LOG.length = 0; if (open) SBV.open = open }, [s, open]);
  await E(() => { document.querySelector('#sbHost').shadowRoot.querySelector('[data-shut]')?.click() }); await W(200);
  await st('suspended');
  const b2 = sr('[data-s="home"] [data-ball]').nth(1), b2id = await b2.getAttribute('data-ball'), m2 = await E(id => !!SBV.L.find(x => String(x.id) === id).my, b2id);
  await b2.click(); await W(400);
  T('暂停中点网球 → 账号状态说明，网球没变', /账号暂停中/.test(await sheet()) && await E(id => !!SBV.L.find(x => String(x.id) === id).my, b2id) === m2, await sheet());
  T('拦截事件 account_blocked {action: sb_ball, status: suspended}', JSON.stringify(await ev('account_blocked')) === JSON.stringify([{ action: 'sb_ball', status: 'suspended' }]), await ev('account_blocked'));
  await E(() => closeSheet()); await W(300);
  const n1 = await E(() => SBV.L.length);
  await sr('[data-in]').fill('暂停中发一条'); await W(100); await sr('[data-send]').click(); await W(400);
  T('暂停中发布 → 拦下，没发出去', /账号暂停中/.test(await sheet()) && await E(() => SBV.L.length) === n1, await sheet());
  T('拦截事件 action = sb_post', (await ev('account_blocked')).some(e => e.action === 'sb_post'), await ev('account_blocked'));
  await E(() => closeSheet()); await W(300); await sr('[data-in]').fill(''); await E(() => document.querySelector('#sbHost').shadowRoot.querySelector('[data-in]').dispatchEvent(new Event('input')));
  // 回复
  await E(id => { const r = document.querySelector('#sbHost').shadowRoot.querySelector(`[data-ln="${id}"]`); r && r.click() }, other); await W(500);
  const r0 = await E(id => SBV.L.find(x => String(x.id) === id).r.length, other);
  await sr('.sheet [data-rin]').fill('好看'); await sr('.sheet [data-rin]').dispatchEvent('input'); await sr('.sheet [data-rsend]').click(); await W(400);
  T('暂停中回复 → 拦下（action = sb_reply）', /账号暂停中/.test(await sheet()) && await E(id => SBV.L.find(x => String(x.id) === id).r.length, other) === r0 && (await ev('account_blocked')).some(e => e.action === 'sb_reply'), [await sheet(), await ev('account_blocked')]);
  await E(() => closeSheet()); await W(300);
  // 不感兴趣只要登录：暂停中也可以
  await sr('.sheet [data-menu]').click(); await W(300); await sr('[data-act="less"]').click(); await W(400);
  T('暂停中点「不感兴趣」可以（这一条隐藏）', !(await E(id => SBV.L.some(x => String(x.id) === id), other)) && !(await sheet()), await sheet());
  await E(() => document.querySelector('#sbHost').shadowRoot.querySelector('[data-act="l0"]')?.click()); await W(300);

  for (const s of ['review', 'limited']) {
    await st(s); const bb = sr('[data-s="home"] [data-ball]').nth(2), id = await bb.getAttribute('data-ball'), m = await E(id => !!SBV.L.find(x => String(x.id) === id).my, id);
    await bb.click(); await W(350);
    T(`${s === 'review' ? '待核实' : '受限'}：可以点网球（不拦）`, !(await sheet()) && await E(id => !!SBV.L.find(x => String(x.id) === id).my, id) === !m, await sheet());
  }
  await st('active');

  // ---- 错误码 ----
  const n2 = await E(() => SBV.L.length);
  await sr('[data-in]').fill('看这个 www.abc.com'); await W(100); await sr('[data-send]').click(); await W(200);
  T('带链接发布 → 「暂不支持发送链接」，草稿还在，没发出去', await toast() === '暂不支持发送链接' && await sr('[data-in]').inputValue() === '看这个 www.abc.com' && await E(() => SBV.L.length) === n2, await toast());
  await sr('[data-in]').fill('');
  // 一小时 5 条
  await E(() => { SBV.rl = {} });
  let sent = 0; for (let i = 0; i < 6; i++) { await sr('[data-in]').fill('第' + i + '条'); await W(60); await sr('[data-send]').click(); await W(250); if (await E(i => SBV.L.some(x => x.mine && x.x === '第' + i + '条'), i)) sent++ }
  T('每小时 5 条：第 6 条 → 「发得有点多，过一会儿再发吧」', sent === 5 && await toast() === '发得有点多，过一会儿再发吧', [sent, await toast()]);
  await sr('[data-in]').fill('');
    T('每天 20 条（2 小时前发的 20 条）→ sb_post_daily_limit', await E(() => SB.rules.rate({ rl: { sb_post: Array(20).fill(Date.now() - 2 * 36e5) } }, 'sb_post')) === 'sb_post_daily_limit');
  T('一天前发的不算', await E(() => SB.rules.rate({ rl: { sb_post: Array(20).fill(Date.now() - 864e5 - 1000) } }, 'sb_post')) === null);
  T('新建话题每天 3 个 → sb_topic_daily_limit', await E(() => { const S = {}; return [1, 2, 3, 4].map(() => SB.rules.rate(S, 'sb_topic')) }).then(a => JSON.stringify(a)) === JSON.stringify([null, null, null, 'sb_topic_daily_limit']));
  T('回复每分钟 6 条 → message_too_fast；网球每分钟 30 次 → rate_limited', await E(() => { const a = {}, b = {}; for (let i = 0; i < 6; i++) SB.rules.rate(a, 'sb_reply'); for (let i = 0; i < 30; i++) SB.rules.rate(b, 'sb_ball'); return [SB.rules.rate(a, 'sb_reply'), SB.rules.rate(b, 'sb_ball')] }).then(a => a.join()) === 'message_too_fast,rate_limited');
  T('dry 只看不记', await E(() => { const S = {}; SB.rules.rate(S, 'sb_topic', true); return (S.rl.sb_topic || []).length }) === 0);
  // 回复已关闭（别人关了回复）
  // 回复已关闭：打开时还能回，作者这时关了回复（关了的那条本来就没有回复框）
  await E(() => { SBV.rl = {} });
  const cl = await E(() => String(SBV.L.find(x => !x.mine && !x.closed).id));
  await E(id => { const r = document.querySelector('#sbHost').shadowRoot.querySelector(`[data-ln="${id}"]`); r && r.click() }, cl); await W(500);
  const cr0 = await E(id => SBV.L.find(x => String(x.id) === id).r.length, cl);
  await E(id => { SBV.L.find(x => String(x.id) === id).closed = true }, cl);
  await sr('.sheet [data-rin]').fill('好看'); await sr('.sheet [data-rin]').dispatchEvent('input'); await sr('.sheet [data-rsend]').click(); await W(200);
  T('作者关了回复 → 「作者关闭了回复」，没回出去', await toast() === '作者关闭了回复' && await E(id => SBV.L.find(x => String(x.id) === id).r.length, cl) === cr0, await toast());
  await E(() => document.querySelector('#sbHost').shadowRoot.querySelector('[data-shut]')?.click()); await W(300);
  // 重复举报
  const rp = await E(() => String(SBV.L.find(x => !x.mine).id));
  await E(id => { const r = document.querySelector('#sbHost').shadowRoot.querySelector(`[data-ln="${id}"]`); r && r.click() }, rp); await W(500);
  for (let i = 0; i < 2; i++) { await sr('.sheet [data-menu]').click(); await W(250); await sr('[data-act="report"]').click(); await W(250); await sr('[data-act="r"]').first().click(); await W(250) }
  T('同一条举报两次 → 「你已经举报过，我们正在处理」', await toast() === '你已经举报过，我们正在处理', await toast());

  // ---- 话题名（数据库 sb_topic_resolve 同一个顺序；词表来自配置） ----
  const tr = await E(() => { const T = SB.topics(), C = SB.CFG, r = q => SB.rules.topic(q, T), al = C.alias[0], gen = C.generic[0], any = Object.keys(T)[0];
    return { short: r('a'), long: r('一二三四五六七八九十一二三'), gen: r('#' + gen.toUpperCase()), al: r(al[0]), alId: al[1], same: r(T[any].t.toUpperCase()), sameId: any,
      link: r('看abc.com'), wx: r('加微信聊球'), off: r('官方活动'), ok: r('＃反手终于开窍') } });
  T('话题名不到 2 字 / 超过 12 字 → invalid', tr.short.err === 'invalid' && tr.long.err === 'invalid', tr);
  T('太宽的词（不分大小写、带 #）→ topic_too_generic', tr.gen.err === 'topic_too_generic', tr.gen);
  T('相似词（配置 alias）→ 并入已有话题', tr.al.id === tr.alId, tr.al);
  T('同名（不分大小写）→ 并入已有话题', tr.same.id === tr.sameId, tr.same);
  T('链接、联系方式、冒充官方 → topic_name_not_allowed', [tr.link, tr.wx, tr.off].every(x => x.err === 'topic_name_not_allowed'), [tr.link, tr.wx, tr.off]);
  T('全角 # 去掉后新建', tr.ok.title === '反手终于开窍', tr.ok);
  const src = await E(() => SB.App.toString());
  T('相似词不写死在代码里（读配置）', !/'神仙':'spot'/.test(src) && /SB_ALIAS\(\)/.test(src));

  T('没有脚本错误', errs.length === 0, errs);
  console.log(`\n${pass} passed, ${fail} failed`); await b.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1) });
