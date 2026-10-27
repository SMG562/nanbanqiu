// 第八批 F2：场边通知进消息列表 + 场边埋点。
// 通知：别人给我的发布点网球（sb_ball）、回复我的发布（sb_reply）、回复我（sb_reply_to）；合并规则 = 数据库 sb_notify_ball / sb_notify_reply；
// 文字 = server/notify/rules.mjs；不紧急、不发邮件；过时（发布不在 / 屏蔽）不提醒；点开 → 场边那条发布（回复滚到那条），不在了 → 「这条已经不在了」。
// 埋点：12 个场边事件 + 举报 / 屏蔽 都按字典的 props 发出（键名逐个一致）。
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs'), url = require('url');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? '  ✓ ' : 'FAIL ') + n + (ok || x === undefined ? '' : ' ' + JSON.stringify(x).slice(0, 400))) };
const FAKE = +new Date('2026-10-27T14:00:00+11:00');   // 白天（不在夜间顺延）
const SPEC = {}; for (const l of fs.readFileSync(path.join(__dirname, '..', 'spec', 'events_spec.md'), 'utf8').split('\n')) {
  const c = l.match(/^\| ([a-z0-9_]+) \| ([^|]+) \| ([CS]) \| [^|]+ \| ([^|]+) \|$/); if (c) SPEC[c[1]] = { cat: c[2].trim(), props: c[4].trim() === '—' ? [] : c[4].replace(/\([^)]*\)/g, '').split(',').map(s => s.trim()) } }
(async () => {
  const { pushText } = await import(url.pathToFileURL(path.join(__dirname, '..', '..', 'server', 'notify', 'rules.mjs')).href);
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(ts => { const off = ts - Date.now(), D = Date; class FD extends D { constructor(...a) { a.length ? super(...a) : super(D.now() + off) } static now() { return D.now() + off } } window.Date = FD; window.AN_LOG = [] }, FAKE);
  const pg = await ctx.newPage(), errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('file:///mnt/user-data/outputs/南伴球_PWA.html'); await pg.settle(800);
  const W = ms => pg.settle(ms), E = (f, a) => pg.evaluate(f, a);   // E2：W = 页面安静了就继续，最多等原来那么久
  const sr = s => pg.locator('#sbHost').locator(s);
  await E(() => { LOC.asked = true; closeSheet(); setWho('jason', true);
    window._bn = []; const o = pushBanner; pushBanner = function (t) { _bn.push(t); return o.apply(this, arguments) };
    window._tt = []; const ot = toast; toast = function (m) { _tt.push(m); return ot.apply(this, arguments) } });
  await pg.click('#tabbar [data-tab="side"]'); await W(300); await E(() => { SBV.every = 1e9 }); await pg.waitForFunction(() => SBV.qi >= 1, null, { timeout: 4000, polling: 50 }).catch(() => {}); await W(300);   // 等第一条自动新动态冒出来（原来固定等 2.5 秒）
  const SB = () => E(() => NOTIFS.filter(n => n.kind.startsWith('sb_')).map(n => ({ id: n.id, kind: n.kind, post: n.sb_post_id, count: n.sb_count, an: n.an, read: n.read, rid: n.sb_reply_id, t: ntfText(n) })));
  const clear = () => E(() => { for (let i = NOTIFS.length - 1; i >= 0; i--) if (NOTIFS[i].kind.startsWith('sb_')) NOTIFS.splice(i, 1); _bn.length = 0; _tt.length = 0 });
  const others = (k, ...a) => E(([k, a]) => SBV.api.others[k](...a), [k, a]);
  await clear();

  // ---- 网球 ----
  await others('ball', 21, 'Coco'); await W(100);
  let L = await SB();
  T('别人点我的发布 → 一条 sb_ball，给我', L.length === 1 && L[0].kind === 'sb_ball' && L[0].post === 21 && await E(() => NOTIFS.find(n => n.kind === 'sb_ball').user_id === ME.id), L);
  T('文字：「Coco 给你点了网球 🎾」+ 引用发布', L[0].t[0] === 'Coco 给你点了网球 🎾' && L[0].t[1] === '「下午四点的影子，比我打得好看」', L[0].t);
  T('第一下提醒（横幅）', (await E(() => _bn)).length === 1, await E(() => _bn));
  await others('ball', 21, 'Leo'); await others('ball', 21, 'Mia'); await W(100); L = await SB();
  T('没看时后面的并进同一条：人数 3、名字 = 最近的人', L.length === 1 && L[0].count === 3 && L[0].an === 'Mia' && L[0].t[0] === 'Mia 和另外 2 人给你点了网球 🎾', L);
  T('并进去的不再提醒', (await E(() => _bn)).length === 1);
  await others('ball', 21, 'Mia', false); L = await SB();
  T('取消网球重算：人数 2、名字 = 剩下最近的 Leo', L[0].count === 2 && L[0].an === 'Leo', L);
  await others('ball', 21, 'Leo', false); await others('ball', 21, 'Coco', false); L = await SB();
  T('都取消了 → 没看的那条拿掉', L.length === 0, L);
  await others('ball', 21, 'Coco'); await E(() => { NOTIFS.find(n => n.kind === 'sb_ball').read = true }); await W(50); await others('ball', 21, 'Ray'); L = await SB();
  T('看过之后再有新网球 → 新的一条（人数只算看过之后的）', L.length === 2 && L[0].count === 1 && L[0].an === 'Ray' && !L[0].read, L);
  T('新的一条再提醒', (await E(() => _bn)).length === 3, await E(() => _bn));
  await clear(); const notMine = await E(() => SBV.L.find(x => !x.mine).id);
  await others('ball', notMine, 'Coco'); await others('reply', notMine, '路过'); L = await SB();
  T('别人的发布被点网球 / 被回复 → 不提醒我', L.length === 0, L);

  // ---- 回复 ----
  await others('reply', 21, '这张构图我喜欢'); L = await SB(); const a1 = L[0] && L[0].an;
  T('回复我的发布 → sb_reply，正文是回复内容', L.length === 1 && L[0].kind === 'sb_reply' && L[0].t[0] === `${a1} 回复了你` && L[0].t[1] === '这张构图我喜欢', L);
  T('回复提醒的时间 = 那条回复的时间（数据库同一事务；E2 修：差 1 毫秒时合并漏算第一个人）', await E(() => { const n = NOTIFS.find(n => n.kind === 'sb_reply'), x = SBV.L.find(x => x.id === 21); return n.at === x.r.find(r => r.id === n.sb_reply_id).t }));
  await others('reply', 21, '明天还去吗'); L = await SB(); const a2 = L[0].an;
  T('10 分钟内的并进同一条（不再提醒）', L.length === 1 && (a2 === a1 ? L[0].count === 1 : L[0].count === 2) && L[0].t[1] === '明天还去吗' && (await E(() => _bn)).filter(t => /回复了你/.test(t)).length === 1, { L, bn: await E(() => _bn) });
  T('合并后的文字「X 等 2 人回复了你」', a2 === a1 || L[0].t[0] === `${a2} 等 2 人回复了你`, L[0].t);
  await E(() => { NOTIFS.find(n => n.kind === 'sb_reply').at -= 11 * 60e3 }); await others('reply', 21, '再来一句'); L = await SB();
  T('超过 10 分钟 → 新的一条', L.filter(n => n.kind === 'sb_reply').length === 2, L);
  await others('reply', 4, '好，我也差不多那个点到', { to: 'Nana' }); await others('reply', 4, '还有人要吗'); L = await SB();
  T('别人的发布下回复我 → sb_reply_to；不是回复我的不提醒', L.filter(n => n.kind === 'sb_reply_to').length === 1 && L.find(n => n.kind === 'sb_reply_to').t[1] === '好，我也差不多那个点到', L);

  // ---- 文字 = server/notify/rules.mjs ----
  await clear();
  await E(() => { const now = Date.now(); SBV.L.unshift({ id: 901, t: now, x: '（一张照片）', pics: ['sunset'], pic: 'sunset', mine: true, b: 0, r: [], views: 0 }, { id: 902, t: now, x: '今天的夜场灯特别亮，打到十点半都不想走，大家明天还来吗？', mine: true, b: 0, r: [], views: 0 }) });
  await others('ball', 901, 'Coco'); await others('ball', 902, 'Coco'); await others('ball', 902, 'Leo');
  await others('reply', 902, '一定来！明天七点半我在三号场等你们，带上新买的球，顺便试试新拍子，打完一起去吃宵夜怎么样'); await others('reply', 4, '收到', { to: 'Nana' });
  const cmp = await E(() => NOTIFS.filter(n => n.kind.startsWith('sb_')).map(n => ({ n: { kind: n.kind, sb_count: n.sb_count }, ctx: { actorName: n.an, sb: { post_body: n.pb, photos: n.ph, reply_body: n.rb } }, t: ntfText(n) })));
  const bad = cmp.filter(c => { const r = pushText(c.n, c.ctx); return r.title !== c.t[0] || r.body !== c.t[1] });
  T(`4 条（网球 只有照片 / 长文字合并 2 人、回复 长内容、回复我）的文字和推送（rules.mjs）逐字一致`, cmp.length === 4 && bad.length === 0, bad.map(c => [c.t, pushText(c.n, c.ctx)]));
  T('只有照片 →「你的照片」；长内容截断带 …', cmp.some(c => c.t[1] === '你的照片') && cmp.some(c => /…」$/.test(c.t[1])) && cmp.some(c => c.t[1].length === 41 && c.t[1].endsWith('…')), cmp.map(c => c.t));

  // ---- 不紧急、不发邮件、过时 ----
  T('不紧急（夜里顺延，NR_LOW）、不发邮件（EM_KIND 没有）', await E(() => ['sb_ball', 'sb_reply', 'sb_reply_to'].every(k => NR_LOW.has(k) && !EM_KIND[k] && nrPri({ kind: k }) === 2)));
  T('列表头像：场边的字母头像（不是南伴球标识）', await E(() => { const n = NOTIFS.find(n => n.kind === 'sb_ball'); return /class="av sbav"/.test(nrAv(n, {})) && nrAv(n, {}).includes('>' + [...n.an][0] + '<') }));
  const night = await E(() => { const t = Date.now() + 9 * 36e5; return nrQuiet(t) > t });
  T('夜里 23 点的场边提醒会顺延（城市 quiet）', night);
  await E(() => { const x = SBV.L.find(x => x.id === 901); SBV.L.splice(SBV.L.indexOf(x), 1) });
  T('发布不在了 → 推送前判为过时', await E(() => nrStale(NOTIFS.find(n => n.sb_post_id === 901)) === '发布已不在'));
  await E(() => SBV.bl.add(NOTIFS.find(n => n.sb_post_id === 902 && n.kind === 'sb_ball').an));
  T('屏蔽了对方 → 不提醒', await E(() => nrStale(NOTIFS.find(n => n.sb_post_id === 902 && n.kind === 'sb_ball')) === '有屏蔽关系'));
  await E(() => SBV.bl.clear());
  const gone = await E(() => NOTIFS.find(n => n.sb_post_id === 901).id);
  await E(id => { go('notif'); UI.msgTab = 'ntf'; renderNotif() }, gone); await W(300);
  await pg.locator(`[data-ntfo="${gone}"]`).click(); await W(300);
  T('点开已不在的 → 「这条已经不在了」，留在消息页，标为已读', (await E(() => _tt)).includes('这条已经不在了') && await E(() => UI.tab) === 'notif' && await E(id => NOTIFS.find(n => n.id === id).read, gone), await E(() => _tt));

  // ---- 点开去处 ----
  await clear(); await E(() => { AN_LOG.length = 0 });
  await others('reply', 21, '这张光影绝了'); await W(50); await others('reply', 21, '我也想去拍'); const nr = await E(() => NOTIFS.find(n => n.kind === 'sb_reply'));
  await E(() => { go('notif'); UI.msgTab = 'ntf'; renderNotif() }); await W(300);
  await pg.locator(`[data-ntfo="${nr.id}"]`).click(); await W(900);
  T('点开回复通知 → 场边页，打开那条发布', await E(() => UI.tab) === 'side' && await E(() => String(SBV.open)) === '21' && await E(() => document.querySelector('#sbHost').shadowRoot.querySelector('.dev').classList.contains('sheeting')), { tab: await E(() => UI.tab), open: await E(() => SBV.open) });
  const hl = await E(rid => { const x = SBV.L.find(x => x.id === 21), i = x.r.findIndex(r => r.id === rid), sh = document.querySelector('#sbHost').shadowRoot, row = sh.querySelector('.sheet .rs').children[i], c = sh.querySelector('.sh-sc');
    return { i, txt: row && row.textContent, top: row && row.getBoundingClientRect().top, ch: c.getBoundingClientRect(), anim: row ? row.getAnimations().length : -1 } }, nr.sb_reply_id);
  T('滚到最近那条回复并闪一下（在可见范围内）', /我也想去拍/.test(hl.txt || '') && hl.top >= hl.ch.top && hl.top <= hl.ch.bottom && hl.anim === 1, hl);
  await W(1800);
  T('闪完不留动画', await E(() => document.querySelector('#sbHost').shadowRoot.querySelector('.sheet .rs').getAnimations({ subtree: true }).length === 0));
  T('点开记 notif_open（list）+ sb_post_view（via notif）', await E(() => AN_LOG.some(e => e.ev === 'notif_open' && e.props.kind === 'sb_reply' && e.props.from === 'list') && AN_LOG.some(e => e.ev === 'sb_post_view' && e.props.via === 'notif' && e.props.post_id === 21)), await E(() => AN_LOG.map(e => e.ev)));
  await E(() => document.querySelector('#sbHost').shadowRoot.querySelector('[data-shut]').click()); await W(300);
  await E(() => { SBV.api.album() }); await W(300);
  await others('ball', 22, 'Coco'); await W(200);
  T('在场边页（相册盖着）收到 → 横幅', (await E(() => _bn)).some(t => /Coco 给你点了网球/.test(t)), await E(() => _bn));
  await E(() => document.querySelector('#banner').click()); await W(900);
  T('点横幅 → 相册收起，打开那条发布', await E(() => String(SBV.open)) === '22' && !(await E(() => SBV.album)), { open: await E(() => SBV.open), album: await E(() => SBV.album) });
  await E(() => document.querySelector('#sbHost').shadowRoot.querySelector('[data-shut]').click()); await W(300);

  // ---- 没登录 ----
  await clear(); await E(() => setWho(null, true)); await W(200);
  await others('ball', 21, 'Zoe'); await others('reply', 21, '没登录也收到吗');
  T('没登录：不生成通知', (await SB()).length === 0);
  await E(() => setWho('jason', true)); await W(200);

  // ---- 埋点 ----
  await E(() => { AN_LOG.length = 0 }); const sh = s => E(s => document.querySelector('#sbHost').shadowRoot.querySelector(s)?.click(), s);
  const first = await E(() => String(SBV.L.find(x => !x.mine && !x.closed && Date.now() - x.t < 864e5).id));
  await sr(`[data-s="home"] [data-ball="${first}"]`).first().click(); await W(500);
  await sh(`[data-s="home"] [data-ln="${first}"]`); await W(500); if (!(await E(() => SBV.open))) await E(id => SBV.api.open(id), first); await W(300);
  await sr('.sheet [data-rin]').fill('我也去'); await W(100); await sr('.sheet [data-rsend]').click(); await W(400);
  await sr('.sheet [data-menu]').click(); await W(300); await sr('[data-act="report"]').click(); await W(300); await sr('[data-rr="photo"]').click(); await W(300);
  await sh('[data-shut]'); await W(300);
  await sr('[data-in]').fill('风好大'); await W(100); await sr('[data-send]').click(); await W(600);
  const mine = await E(() => SBV.lastMine.id);
  await E(id => SBV.api.open(id), mine); await W(500); await sr('.sheet [data-menu]').click(); await W(300); await sr('[data-act="mute"]').click(); await W(300);
  await sr('.sheet [data-menu]').click(); await W(300); await sr('[data-act="del"]').click(); await W(400);
  const pic = await E(() => String(SBV.L.find(x => x.pics && x.pics.length && !x.mine).id));
  await E(id => SBV.api.open(id), pic); await W(500); await sr('.sheet [data-pic]').first().click(); await W(400); await sh('[data-close]'); await W(200);
  await sr('.sheet [data-menu]').click(); await W(300); await sr('[data-act="hide"]').click().catch(() => {}); await W(200);
  const hid = await E(() => AN_LOG.some(e => e.ev === 'sb_hide')); if (!hid) await sr('[data-act="less"]').click().catch(() => {}); await W(300);
  await sr('[data-act="lf"]').click().catch(() => {}); await W(300);
  await E(() => { const x = SBV.L.find(x => x.mine && x.pics && x.pics.length); SBV.api.open(x.id) }); await W(500);
  await sr('.sheet [data-share]').click(); await W(400); await sr('[data-sv]').first().click(); await W(300); await sh('[data-sx]'); await W(300); await sh('[data-shut]'); await W(300);
  await sr('[data-s="home"] [data-topic]').first().click().catch(() => {}); await W(300);
  await E(() => SBV.api.open(SBV.L.find(x => x.w && !x.area && Date.now() - x.t < 864e5).id)); await W(500); await sr('.sheet [data-court]').first().click(); await W(400);
  await E(() => SBV.api.album()); await W(300);
  const LOG = await E(() => AN_LOG.map(e => ({ ev: e.ev, props: e.props })));
  const sbEv = Object.keys(SPEC).filter(k => SPEC[k].cat === '场边'), seen = new Set(LOG.map(e => e.ev));
  T('字典里有 12 个场边事件', sbEv.length === 12, sbEv);
  T('场边事件都发出过（' + sbEv.length + ' 个）', sbEv.every(k => seen.has(k)), sbEv.filter(k => !seen.has(k)));
  const keyBad = LOG.filter(e => SPEC[e.ev] && (e.ev.startsWith('sb_') || /^report_|^user_block/.test(e.ev)) && JSON.stringify(Object.keys(e.props || {}).sort()) !== JSON.stringify([...SPEC[e.ev].props].sort()));
  T('props 键名 = 字典（逐个事件）', keyBad.length === 0, keyBad);
  const g = n => LOG.filter(e => e.ev === n).map(e => e.props);
  T('举报：target_type sb_post、via sideline、原因代码', g('report_open').some(p => p.target_type === 'sb_post' && p.via === 'sideline') && g('report_submit').some(p => p.reason === 'photo' && p.via === 'sideline' && p.target_type === 'sb_post'), [g('report_open'), g('report_submit')]);
  T('发布：via bar、photos 0、topic_kind 在范围里', g('sb_post_submit').some(p => p.via === 'bar' && ['none', 'official', 'user', 'new'].includes(p.topic_kind) && p.photos === 0 && p.later === false), g('sb_post_submit'));
  T('取值都在字典写的范围里', [['sb_ball', 'via', ['tap', 'double']], ['sb_post_view', 'via', ['feed', 'court', 'topic', 'album', 'notif']], ['sb_hide', 'reason', ['none', 'topic', 'user', 'far']], ['sb_share', 'to', ['save', 'instagram', 'xhs']], ['sb_court_view', 'via', ['filter', 'page']]].every(([e, k, vs]) => g(e).every(p => vs.includes(p[k]))), LOG.filter(e => e.ev.startsWith('sb_')));
  T('不记内容（回复、发布的文字不出现在事件里）', !JSON.stringify(LOG).includes('我也去') && !JSON.stringify(LOG).includes('风好大'));

  T('没有脚本错误', errs.length === 0, errs);
  console.log(`\n${pass} passed, ${fail} failed`); await b.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1) });
