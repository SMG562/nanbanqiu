// 我的球拍（#60 PR-B）：真实模式（nanbanqiu.app + 假 Supabase + 有状态的假 /api），两端都点真实按钮走一遍入口清单：
//   添加（品牌 → 系列）· 其他（输入框）· 设为主力 · 换一把 · 移除 —— 每次都断言 PUT 的内容、页面（DOM）和「清空内存 → 重读 → 还在」；
//   刷新：先画快照里的球拍（不先闪空槽）；读失败：保留原来的、不许改（不拿空列表冲掉服务器）；保存失败：页面不变 + 有提示；
//   当场校验（链接 / @ / 连续数字 / 重复）不发请求；开关关着：不显示、不读接口；退出登录：清掉。
// B2（#60，ADR 0009）：选择列表改读 GET /api/rackets/catalog（读不到 / 数据不对 → 内置常量兜底）；从产品库点选的发 {catalog_id}，
//   包里已有的保留各自的 catalog_id；4 个埋点（racket_picker_open / racket_brand_pick / racket_save / racket_invalid）props 与字典一致、不含手写文字、
//   保存失败不发 racket_save。前半段（B 的入口清单）在产品库读不到时跑，等于同时测了兜底。
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const DIR = process.env.NBQ_DIR || path.join(__dirname, '..', '..');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 600) : '')) };
const SB = 'https://xosrdkrkfxkdrwldfhac.supabase.co', ME = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', V1 = '11111111-1111-4111-8111-111111111111';
const VENUES = [{ id: V1, name: 'Test Tennis Club', short_name: 'Test TC', suburb: 'Malvern', surfaces: ['hard'], courts: 4, lights: true, indoor: false, booking_url: null, lat: -37.86, lng: 145.03 }];
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  for (const f of ['南伴球_PWA.html', '南伴球_Web.html']) for (const on of [true, false]) {
    const W = f.includes('Web'), tag = s => `${W ? 'Web' : 'PWA'}${on ? '' : '（开关关）'} ${s}`;
    const ctx = await b.newContext({ viewport: W ? { width: 1360, height: 860 } : { width: 390, height: 844 } });
    const pg = await ctx.newPage(), errs = []; pg.on('pageerror', e => errs.push(e.message + ' @ ' + String(e.stack).split('\n').slice(1, 3).join('|')));
    if (on) await pg.addInitScript(() => { try { localStorage.setItem('nbq_ff_rackets', '1') } catch (_) { } });
    await pg.addInitScript(() => { window.AN_LOG = [] });
    const S = { me: { id: ME, member_no: 1288, nickname: 'Sam', last_initial: 'L', utr: 5, utr_estimated: false, avatar_kind: 'letter', avatar_animal: null, avatar_color: 'paper', card_theme: 'court', created_at: new Date().toISOString(), gender: null, club_ids: [], pact_accepted_at: new Date().toISOString() },
      rk: [{ brand: 'Head', series: 'Speed' }], log: [], puts: [], getFail: false, putFail: null, rkGets: 0, slowMe: 0,
      cat: null, catGets: 0, catSlow: 0 };   // cat：null = 产品库接口 500（兜底）；数组 = 正常返回；{raw} = 原样返回（坏数据）
    await pg.route('https://nanbanqiu.app/**', async r => { const u = new URL(r.request().url()); if (!u.pathname.startsWith('/api/')) return r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: fs.readFileSync(path.join(DIR, f)) });
      const m = r.request().method(), p = u.pathname, pd = r.request().postData(), body = pd ? JSON.parse(pd) : null; const J = (s, d) => r.fulfill({ status: s, contentType: 'application/json', body: JSON.stringify(d) });
      if (p !== '/api/events') S.log.push(m + ' ' + p);
      const rows = () => S.rk.map((x, i) => ({ slot: i + 1, brand: x.brand, series: x.series, catalog_id: x.catalog_id || null }));
      const catArr = () => Array.isArray(S.cat) ? S.cat : [];
      if (p === '/api/rackets/catalog' && m === 'GET') { S.catGets++; if (S.catSlow) await new Promise(x => setTimeout(x, S.catSlow));
        return S.cat === null ? J(500, { error: 'server' }) : J(200, Array.isArray(S.cat) ? { catalog: S.cat } : S.cat.raw) }
      if (p === '/api/me/rackets' && m === 'GET') { S.rkGets++; return S.getFail ? J(500, { error: 'server' }) : J(200, { rackets: rows() }) }
      if (p === '/api/me/rackets' && m === 'PUT') { S.puts.push(body); if (S.putFail) return J(422, { error: S.putFail });
        S.rk = body.rackets.map(x => { if (x.catalog_id) { const c = catArr().find(c => c.id === x.catalog_id); return c ? { brand: c.brand, series: c.series, catalog_id: c.id } : { brand: '?', series: '?', catalog_id: x.catalog_id } }
          const c = catArr().find(c => c.brand.toLowerCase() === String(x.brand || '').toLowerCase() && c.series.toLowerCase() === String(x.series).toLowerCase());
          return c ? { brand: c.brand, series: c.series, catalog_id: c.id } : { brand: x.brand || null, series: x.series, catalog_id: null } }); return J(200, { rackets: rows() }) }
      if (m === 'GET') {
        if (p === '/api/me' && S.slowMe) await new Promise(x => setTimeout(x, S.slowMe));
        if (p === '/api/venues') return J(200, { venues: VENUES });
        if (p === '/api/me') return J(200, { registered: true, user: S.me });
        if (p === '/api/games') return J(200, { games: [] });
        if (p === '/api/games/mine') return J(200, { games: [], participants: [], profiles: { [ME]: S.me } });
        if (p === '/api/invites') return J(200, { invites: [], profiles: {} });
        return J(404, { error: 'not_found' }) }
      return J(404, { error: 'not_found' }) });
    await pg.route(SB + '/**', r => { const v = r.request().url().includes('/verify');
      r.fulfill({ status: v ? 200 : 204, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: v ? JSON.stringify({ access_token: 'AT', refresh_token: 'RT', expires_in: 3600, user: { id: 'sb-1', phone: '61412345678' } }) : '' }) });
    await pg.route('https://cdnjs.cloudflare.com/**', r => r.abort()); await pg.route('https://basemaps.cartocdn.com/**', r => r.abort());
    const until = async (fn, n = 30) => { for (let i = 0; i < n; i++) { try { if (await fn()) return true } catch (_) { } await pg.settle(200) } return false };
    const toMe = () => pg.evaluate(W => { try { closeSheet() } catch (_) { } try { closeModal() } catch (_) { } if (W) { UI.tab = 'me'; render() } else go('me') }, W);
    // 页面上画出来的球拍（DOM），不是内存
    const tiles = () => pg.evaluate(() => [...document.querySelectorAll('.rk .rk-row')].map(t => t.classList.contains('rk-add') ? '+' : (t.querySelector('.rk-main') ? '*' : '') + (t.querySelector('.rk-br') ? t.querySelector('.rk-br').textContent + '/' : '') + t.querySelector('.rk-se').textContent).join(' '));
    const tap = sel => pg.evaluate(s => { const e = document.querySelector(s); if (!e) return false; e.click(); return true }, sel);
    const putN = () => S.puts.length;
    const sheetOpen = () => pg.evaluate(W => W ? document.querySelector('#mbg').classList.contains('show') && !!document.querySelector('#modal .rk-pk') : document.querySelector('#sheet').classList.contains('show') && !!document.querySelector('#sheet .rk-pk'), W);
    const login = async () => { await pg.evaluate(() => { openAuth(null) }); await pg.settle(300); await pg.fill('#ph', '0412 345 678'); await pg.click('[data-a="sendCode"]'); await pg.settle(400); await pg.fill('#otp', '123456');
      await pg.waitForFunction(() => typeof ME !== 'undefined' && ME && ME.name === 'Sam', null, { timeout: 10000 }).catch(() => { }); await pg.settle(300) };

    await pg.goto('https://nanbanqiu.app/'); await pg.settle(600); await login(); await toMe(); await pg.settle(300);
    if (!on) {
      T(tag('不读 /api/me/rackets'), S.rkGets === 0, S.log);
      T(tag('个人页没有「我的球拍」'), await pg.evaluate(() => !document.querySelector('.rk') && !!document.querySelector(typeof DEV !== 'undefined' ? '#meBody .group' : '.card')));
      T(tag('无脚本错误'), errs.length === 0, errs); await ctx.close(); continue }

    // —— 读入：登录后读一次，页面画出服务器上的那把
    T(tag('登录后读 /api/me/rackets'), S.rkGets >= 1, S.log);
    T(tag('读入后页面：主力 Head Speed（带主力标签）+「再添一把」'), await until(async () => await tiles() === '*Head/Speed +'), await tiles());

    // —— 添加：点空格 → 品牌 → 系列，点完即保存（真实点击第一下）
    await pg.click('.rk [data-a="rkSlot"][data-i="1"]'); await pg.settle(400);
    T(tag('点空格 → 弹出选品牌'), await pg.evaluate(() => document.querySelectorAll('[data-a="rkBrand"]').length >= 7 && !!document.querySelector('[data-a="rkOther"]')));
    await tap('[data-a="rkBrand"][data-b="Head"]'); await pg.settle(200);
    T(tag('Head 的系列里，已在包里的 Speed 不能再选'), await pg.evaluate(() => { const b = document.querySelector('[data-a="rkSeries"][data-s="Speed"]'); return !!b && b.disabled && /已在包里/.test(b.textContent) }));
    await tap('[data-a="rkBack"]'); await pg.settle(200); await tap('[data-a="rkBrand"][data-b="Wilson"]'); await pg.settle(200); await tap('[data-a="rkSeries"][data-s="Blade"]');
    await until(async () => await tiles() === '*Head/Speed Wilson/Blade +');
    T(tag('添加：PUT 整组（顺序 = 槽位）'), JSON.stringify(S.puts.at(-1)) === JSON.stringify({ rackets: [{ brand: 'Head', series: 'Speed' }, { brand: 'Wilson', series: 'Blade' }] }), S.puts.at(-1));
    T(tag('添加：页面画出两把，弹层关了'), await tiles() === '*Head/Speed Wilson/Blade +' && !(await sheetOpen()), await tiles());
    const reread = async () => { await pg.evaluate(async () => { ME.rackets = undefined; await nbqRefresh() }); await pg.settle(300); return tiles() };
    T(tag('添加：清空内存 → 重读 → 还在'), await reread() === '*Head/Speed Wilson/Blade +', await tiles());

    // —— 某品牌的「其他系列」：和包里的同一把（不分大小写）当场拦下
    await tap('.rk [data-a="rkSlot"][data-i="2"]'); await pg.settle(300); await tap('[data-a="rkBrand"][data-b="Wilson"]'); await pg.settle(200); await tap('[data-a="rkOther"]'); await pg.settle(400);
    const n00 = putN(); await pg.fill('#rkName', ' BLADE '); await tap('[data-a="rkSave"]'); await pg.settle(150);
    T(tag('Wilson · 其他系列：「 BLADE 」= 包里那把，当场提示、不发请求'), putN() === n00 && /已经在包里/.test(await pg.evaluate(() => document.getElementById('rkErr').textContent)) && await sheetOpen());
    // —— 其他品牌：输入框；当场校验不发请求
    await tap('[data-a="rkBack"]'); await pg.settle(200); await tap('[data-a="rkBack"]'); await pg.settle(200); await tap('[data-a="rkOther"]'); await pg.settle(400);
    T(tag('返回两次再选「其他品牌」：标题是其他品牌'), await pg.evaluate(() => /其他品牌/.test(document.querySelector('.rk-pk').textContent)));
    T(tag('其他品牌：只有一个输入框，保存按钮先是灰的'), await pg.evaluate(() => document.querySelectorAll('.rk-pk input').length === 1 && document.querySelector('[data-a="rkSave"]').disabled));
    const n0 = putN();
    for (const [v, re] of [['加我 1234567', /链接|@|数字/], ['www.shop.com', /链接/], ['ask @me', /@/]]) {
      await pg.fill('#rkName', v); await tap('[data-a="rkSave"]'); await pg.settle(150);
      T(tag(`其他：「${v}」当场提示、不发请求`), putN() === n0 && re.test(await pg.evaluate(() => document.getElementById('rkErr').textContent)), await pg.evaluate(() => document.getElementById('rkErr').textContent)) }
    await pg.fill('#rkName', '  Diadem   Elevate '); await pg.keyboard.press('Enter'); await pg.settle(150);
    T(tag('其他：回车只收键盘，不保存'), putN() === n0);
    await tap('[data-a="rkSave"]'); await until(async () => (await tiles()).includes('Diadem'));
    T(tag('其他：去多余空格后保存，品牌为空'), JSON.stringify(S.puts.at(-1).rackets[2]) === JSON.stringify({ brand: null, series: 'Diadem Elevate' }), S.puts.at(-1));
    T(tag('其他：清空内存 → 重读 → 还在（没有品牌那行）'), await reread() === '*Head/Speed Wilson/Blade Diadem Elevate', await tiles());

    // —— 设为主力：和 1 号交换
    await tap('.rk [data-a="rkSlot"][data-i="2"]'); await pg.settle(300);
    T(tag('点已有的一把 → 三个动作'), await pg.evaluate(() => ['rkMain', 'rkSwap', 'rkDel'].every(a => document.querySelector(`[data-a="${a}"]`))));
    await tap('[data-a="rkMain"]'); await until(async () => (await tiles()).startsWith('*Diadem'));
    T(tag('设为主力：与 1 号交换'), JSON.stringify(S.puts.at(-1).rackets.map(r => r.series)) === '["Diadem Elevate","Blade","Speed"]', S.puts.at(-1));
    T(tag('设为主力：清空内存 → 重读 → 还在'), await reread() === '*Diadem Elevate Wilson/Blade Head/Speed', await tiles());
    await tap('.rk [data-a="rkSlot"][data-i="0"]'); await pg.settle(300);
    T(tag('主力那把没有「设为主力」'), await pg.evaluate(() => !document.querySelector('[data-a="rkMain"]') && !!document.querySelector('[data-a="rkSwap"]')));

    // —— 换一把：被换掉的那把显示「现在这把」，别的槽位的不能选
    await tap('[data-a="rkSwap"]'); await pg.settle(200); await tap('[data-a="rkBrand"][data-b="Yonex"]'); await pg.settle(200); await tap('[data-a="rkSeries"][data-s="EZONE"]');
    await until(async () => (await tiles()).startsWith('*Yonex'));
    T(tag('换一把：只换这一格'), JSON.stringify(S.puts.at(-1).rackets.map(r => r.series)) === '["EZONE","Blade","Speed"]', S.puts.at(-1));
    T(tag('换一把：清空内存 → 重读 → 还在'), await reread() === '*Yonex/EZONE Wilson/Blade Head/Speed', await tiles());

    // —— 保存失败：页面不变 + 有提示；弹层不关
    S.putFail = 'invalid'; const n1 = putN();
    await tap('.rk [data-a="rkSlot"][data-i="1"]'); await pg.settle(300); await tap('[data-a="rkDel"]'); await pg.settle(900);
    T(tag('保存失败：发了请求，页面不变'), putN() === n1 + 1 && await tiles() === '*Yonex/EZONE Wilson/Blade Head/Speed', await tiles());
    T(tag('保存失败：有提示'), await pg.evaluate(() => { const t = document.querySelector('#toast'); return !!t && t.textContent.trim().length > 0 }));
    S.putFail = null;

    // —— 移除
    await tap('[data-a="rkDel"]'); await until(async () => !(await tiles()).includes('Blade'));
    T(tag('移除：后面的往前挪'), JSON.stringify(S.puts.at(-1)) === JSON.stringify({ rackets: [{ brand: 'Yonex', series: 'EZONE' }, { brand: 'Head', series: 'Speed' }] }), S.puts.at(-1));
    T(tag('移除：清空内存 → 重读 → 还在'), await reread() === '*Yonex/EZONE Head/Speed +', await tiles());

    // —— 读失败：保留原来的，不清空；第一次就没读到：不显示格子、不许改（不拿空列表冲掉服务器）
    S.getFail = true; await pg.evaluate(() => nbqRefresh()); await pg.settle(300);
    T(tag('重读失败：保留原来的'), await tiles() === '*Yonex/EZONE Head/Speed +', await tiles());
    const n2 = putN(); await pg.evaluate(async () => { ME.rackets = undefined; await nbqRefresh() }); await pg.settle(300);
    T(tag('从没读到：显示「断线了」，没有球拍行'), await pg.evaluate(() => !document.querySelector('.rk .rk-row') && /断线了/.test(document.querySelector('.rk-off').textContent)));
    await pg.evaluate(() => rkAct({ dataset: { a: 'rkSlot', i: '0' } })); await pg.settle(200);
    T(tag('从没读到：点不开、不发写请求'), putN() === n2 && !(await sheetOpen()));
    S.getFail = false; await pg.evaluate(() => nbqRefresh()); await pg.settle(300);
    T(tag('恢复后再读：回来了'), await tiles() === '*Yonex/EZONE Head/Speed +', await tiles());

    // —— 刷新：先画快照里的（服务器慢也不闪空槽），读完以服务器为准
    await pg.settle(1200); S.slowMe = 2500; S.rk = [{ brand: 'Yonex', series: 'EZONE' }, { brand: 'Head', series: 'Speed' }, { brand: 'Dunlop', series: 'CX' }];
    await pg.reload(); await pg.waitForFunction(() => typeof ME !== 'undefined' && !!ME, null, { timeout: 5000 }).catch(() => { }); await toMe(); await pg.settle(150);
    T(tag('刷新：还没读回来时先画快照里的球拍（不闪空槽）'), await tiles() === '*Yonex/EZONE Head/Speed +', await tiles());
    await until(async () => (await tiles()).includes('Dunlop'), 40);
    T(tag('刷新：读回来后换成服务器上的（换设备改过的也在）'), await tiles() === '*Yonex/EZONE Head/Speed Dunlop/CX', await tiles()); S.slowMe = 0;

    // ================= B2：选择列表读产品库 + catalog_id + 4 个埋点 =================
    const CID = n => `c0000000-0000-4000-8000-00000000000${n}`, XSS = '<img src=x onerror=__rkx=1>';   // 30 字以内（服务器上限），否则前台按长度规则丢掉
    const CAT = [{ id: CID(1), brand: 'Solinco', series: 'Whiteout' }, { id: CID(2), brand: 'Head', series: 'Speed' }, { id: CID(3), brand: 'Head', series: 'Radical' },
      { id: CID(4), brand: 'Wilson', series: 'Pro Staff' }, { id: CID(5), brand: 'Wilson', series: 'Blade' }, { id: CID(6), brand: XSS, series: 'Bad' }];
    const brands = () => pg.evaluate(() => [...document.querySelectorAll('.rk-pk [data-a="rkBrand"]')].map(b => b.textContent).join('|'));
    const series = () => pg.evaluate(() => [...document.querySelectorAll('.rk-pk [data-a="rkSeries"]')].map(b => b.textContent).join('|'));
    const rkEv = () => pg.evaluate(() => (AN.pre || []).concat(window.AN_LOG || []).filter(e => /^racket_/.test(e.ev)).map(e => ({ ev: e.ev, p: e.props })));
    let e0 = (await rkEv()).length; const newEv = async () => (await rkEv()).slice(e0), lastEv = async () => (await rkEv()).at(-1);
    const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    S.cat = CAT; S.rk = [{ brand: 'Head', series: 'Speed', catalog_id: CID(2) }, { brand: null, series: 'Diadem Elevate', catalog_id: null }];
    await pg.evaluate(() => nbqRefresh()); await toMe(); await until(async () => await tiles() === '*Head/Speed Diadem Elevate +');
    const g0 = S.catGets;
    T(tag('B2 准备：服务器上两把（一把带 catalog_id）'), await tiles() === '*Head/Speed Diadem Elevate +', await tiles());

    // —— 添加：读产品库，品牌顺序 = 服务器顺序；常量里有、产品库里没有的（Babolat / Prince）不出现；品牌名转义
    await tap('.rk [data-a="rkSlot"][data-i="2"]'); await until(async () => (await brands()).startsWith('Solinco'));
    T(tag('B2 打开选拍：读一次 GET /api/rackets/catalog'), S.catGets === g0 + 1, S.catGets - g0);
    T(tag('B2 品牌 = 产品库（顺序照服务器，按品牌合并）'), await brands() === `Solinco|Head|Wilson|${XSS}`, await brands());
    T(tag('B2 产品库里的文字原样显示、不当 HTML（无 img、脚本没执行）'), await pg.evaluate(() => !document.querySelector('.rk-pk img') && window.__rkx === undefined));
    T(tag('B2 埋点 racket_picker_open {mode:add, slot:3}'), same(await newEv(), [{ ev: 'racket_picker_open', p: { mode: 'add', slot: 3 } }]), await newEv());
    e0 = (await rkEv()).length;
    await tap('[data-a="rkBrand"][data-b="Solinco"]'); await pg.settle(200);
    T(tag('B2 Solinco 的系列 = 产品库（Whiteout）'), await series() === 'Whiteout', await series());
    T(tag('B2 埋点 racket_brand_pick {brand:Solinco}'), same(await newEv(), [{ ev: 'racket_brand_pick', p: { brand: 'Solinco' } }]), await newEv());
    await tap('[data-a="rkBack"]'); await pg.settle(150); await tap('[data-a="rkBrand"][data-b="Head"]'); await pg.settle(200);
    T(tag('B2 Head：包里那把（catalog_id 相同）不能再选，Radical 可以'), await pg.evaluate(() => { const s = document.querySelector('[data-a="rkSeries"][data-s="Speed"]'), r = document.querySelector('[data-a="rkSeries"][data-s="Radical"]'); return !!s && s.disabled && !!r && !r.disabled }));
    await tap('[data-a="rkBack"]'); await pg.settle(150); await tap('[data-a="rkBrand"][data-b="Solinco"]'); await pg.settle(150);
    e0 = (await rkEv()).length; const p0 = putN();
    await tap('[data-a="rkSeries"][data-s="Whiteout"]'); await until(async () => (await tiles()).includes('Solinco'));
    T(tag('B2 点选产品库：发 {catalog_id}；已有的带 id 的发 id，没 id 的发品牌 + 系列'), putN() === p0 + 1 && same(S.puts.at(-1), { rackets: [{ catalog_id: CID(2) }, { brand: null, series: 'Diadem Elevate' }, { catalog_id: CID(1) }] }), S.puts.at(-1));
    T(tag('B2 页面画出 Solinco Whiteout，弹层关了'), await tiles() === '*Head/Speed Diadem Elevate Solinco/Whiteout' && !(await sheetOpen()), await tiles());
    T(tag('B2 埋点：保存成功后 racket_save {add, catalog, 3}'), same((await newEv()).filter(e => e.ev === 'racket_save'), [{ ev: 'racket_save', p: { action: 'add', source: 'catalog', n_after: 3 } }]), await newEv());
    T(tag('B2 清空内存 → 重读 → 还在'), await reread() === '*Head/Speed Diadem Elevate Solinco/Whiteout', await tiles());

    // —— 换一把：产品库只读一次（缓存）；「其他品牌」→ brand:other；当场校验各原因；手写保存 source:other
    e0 = (await rkEv()).length;
    await tap('.rk [data-a="rkSlot"][data-i="2"]'); await pg.settle(300); await tap('[data-a="rkSwap"]'); await pg.settle(300);
    T(tag('B2 同一页面再打开：不重复读产品库'), S.catGets === g0 + 1 && (await brands()).startsWith('Solinco'), S.catGets - g0);
    await tap('[data-a="rkOther"]'); await pg.settle(400);
    T(tag('B2 埋点：racket_picker_open {swap, 3} + racket_brand_pick {other}'), same(await newEv(), [{ ev: 'racket_picker_open', p: { mode: 'swap', slot: 3 } }, { ev: 'racket_brand_pick', p: { brand: 'other' } }]), await newEv());
    e0 = (await rkEv()).length; const p1 = putN();
    const setName = v => pg.evaluate(v => { const i = document.getElementById('rkName'); i.value = v; i.dispatchEvent(new Event('input', { bubbles: true })) }, v);
    const reasons = [];
    for (const [v, r] of [['diadem  elevate', 'dup'], ['www.shop.au', 'link'], ['ask @me', 'at'], ['加我 1234567', 'digits'], ['x'.repeat(31), 'long'], ['   ', 'empty']]) {
      await setName(v); await pg.evaluate(() => rkAct({ dataset: { a: 'rkSave' } })); await pg.settle(120); reasons.push(r) }
    T(tag('B2 当场校验不发请求'), putN() === p1, putN() - p1);
    T(tag('B2 埋点 racket_invalid：dup / link / at / digits / long / empty'), same(await newEv(), reasons.map(r => ({ ev: 'racket_invalid', p: { reason: r } }))), await newEv());
    e0 = (await rkEv()).length;
    await setName('Volkl V-Cell 8'); await tap('[data-a="rkSave"]'); await until(async () => (await tiles()).includes('Volkl'));
    T(tag('B2 换成手写：只换这一格，别的照旧（带 id 的发 id）'), same(S.puts.at(-1), { rackets: [{ catalog_id: CID(2) }, { brand: null, series: 'Diadem Elevate' }, { brand: null, series: 'Volkl V-Cell 8' }] }), S.puts.at(-1));
    T(tag('B2 埋点 racket_save {swap, other, 3}'), same((await newEv()).filter(e => e.ev === 'racket_save'), [{ ev: 'racket_save', p: { action: 'swap', source: 'other', n_after: 3 } }]), await newEv());

    // —— 设为主力 / 移除：source 看被操作的那把有没有归到产品库；保存失败不发 racket_save
    e0 = (await rkEv()).length;
    await tap('.rk [data-a="rkSlot"][data-i="2"]'); await pg.settle(300); await tap('[data-a="rkMain"]'); await until(async () => (await tiles()).startsWith('*Volkl'));
    T(tag('B2 设为主力：PUT 里 Head Speed 仍发 id'), same(S.puts.at(-1), { rackets: [{ brand: null, series: 'Volkl V-Cell 8' }, { brand: null, series: 'Diadem Elevate' }, { catalog_id: CID(2) }] }), S.puts.at(-1));
    T(tag('B2 埋点 racket_save {main, other, 3}'), same(await newEv(), [{ ev: 'racket_save', p: { action: 'main', source: 'other', n_after: 3 } }]), await newEv());
    e0 = (await rkEv()).length; S.putFail = 'invalid';
    await tap('.rk [data-a="rkSlot"][data-i="2"]'); await pg.settle(300); await tap('[data-a="rkDel"]'); await pg.settle(900);
    T(tag('B2 保存失败：页面不变、不发 racket_save'), await tiles() === '*Volkl V-Cell 8 Diadem Elevate Head/Speed' && (await newEv()).length === 0, await newEv());
    S.putFail = null; await tap('[data-a="rkDel"]'); await until(async () => !(await tiles()).includes('Speed'));
    T(tag('B2 埋点 racket_save {remove, catalog, 2}'), same(await newEv(), [{ ev: 'racket_save', p: { action: 'remove', source: 'catalog', n_after: 2 } }]), await newEv());
    const all = JSON.stringify(await rkEv());
    T(tag('B2 埋点不含手写文字'), !/Volkl|Diadem|elevate|shop|@me|1234567|xxxx/i.test(all), all.slice(0, 300));
    const KEYS = { racket_picker_open: 'mode,slot', racket_brand_pick: 'brand', racket_save: 'action,source,n_after', racket_invalid: 'reason' };
    T(tag('B2 每个埋点的 props 正好是字典登记的'), (await rkEv()).every(e => Object.keys(e.p).sort().join() === KEYS[e.ev].split(',').sort().join()), await rkEv());

    // —— 产品库来得慢：先画常量，到了再换；正在「其他」里打字时不重画（输入不丢）
    const gR = S.catGets; S.cat = CAT; S.catSlow = 1500; await pg.reload(); await pg.waitForFunction(() => typeof ME !== 'undefined' && !!ME && Array.isArray(ME.rackets), null, { timeout: 8000 }).catch(() => { }); await toMe(); await pg.settle(300);
    T(tag('B2 刷新后、没打开选拍弹层：不读产品库'), S.catGets === gR, S.catGets - gR);
    const g1 = S.catGets; await tap('.rk [data-a="rkSlot"][data-i="2"]'); await pg.settle(150);
    T(tag('B2 产品库还没到：先画内置常量（7 个品牌）'), (await brands()).split('|').length === 7 && (await brands()).includes('Babolat'), await brands());
    const arrived = await until(async () => (await brands()).startsWith('Solinco'), 20);   // #141：失败时分开看「到了没有」和「读了几次」
    T(tag('B2 产品库到了：换成产品库'), arrived && S.catGets === g1 + 1, { brands: await brands(), arrived, catGets: S.catGets, g1, reads: S.catGets - g1 });
    await pg.evaluate(() => { try { closeSheet() } catch (_) { } try { closeModal() } catch (_) { } }); await pg.reload(); await pg.waitForFunction(() => typeof ME !== 'undefined' && !!ME && Array.isArray(ME.rackets), null, { timeout: 8000 }).catch(() => { }); await toMe(); await pg.settle(300);
    await tap('.rk [data-a="rkSlot"][data-i="2"]'); await pg.settle(100); await tap('[data-a="rkOther"]'); await pg.settle(300); await pg.fill('#rkName', 'Pacific X'); await pg.settle(1800);
    T(tag('B2 产品库在打字时到了：输入框和内容都还在'), await pg.evaluate(() => { const i = document.getElementById('rkName'); return !!i && i.value === 'Pacific X' }));
    S.catSlow = 0;

    // —— 产品库数据不对（id 不是 uuid、名字为空 / 不是文字）→ 丢掉坏行；一行都不剩 → 内置常量
    S.cat = { raw: { catalog: [{ id: 'not-a-uuid', brand: 'Evil', series: 'X' }, { id: CID(7), brand: '', series: 'Y' }, { id: CID(8), brand: 'Ok', series: 42 }] } };
    await pg.evaluate(() => { try { closeSheet() } catch (_) { } try { closeModal() } catch (_) { } }); await pg.reload(); await pg.waitForFunction(() => typeof ME !== 'undefined' && !!ME && Array.isArray(ME.rackets), null, { timeout: 8000 }).catch(() => { }); await toMe(); await pg.settle(300);
    await tap('.rk [data-a="rkSlot"][data-i="2"]'); await pg.settle(800);
    T(tag('B2 产品库全是坏行：用内置常量，不显示坏数据'), (await brands()).split('|').length === 7 && !/Evil|Ok/.test(await brands()), await brands());
    await pg.evaluate(() => { try { closeSheet() } catch (_) { } try { closeModal() } catch (_) { } }); S.cat = null;

    // —— 退出登录：清掉
    await pg.evaluate(() => { sbaLogout(); render() }); await pg.settle(400); await toMe(); await pg.settle(200);
    T(tag('退出登录：个人页不再有球拍'), await pg.evaluate(() => !document.querySelector('.rk') && !Object.values(USERS).some(u => Array.isArray(u.rackets))));
    T(tag('无脚本错误'), errs.length === 0, errs); await ctx.close();
  }
  await b.close(); console.log(`rackets: ${pass} 通过, ${fail} 失败`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1) });
