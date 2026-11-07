// 我的球拍（#60 PR-B）：真实模式（nanbanqiu.app + 假 Supabase + 有状态的假 /api），两端都点真实按钮走一遍入口清单：
//   添加（品牌 → 系列）· 其他（输入框）· 设为主力 · 换一把 · 移除 —— 每次都断言 PUT 的内容、页面（DOM）和「清空内存 → 重读 → 还在」；
//   刷新：先画快照里的球拍（不先闪空槽）；读失败：保留原来的、不许改（不拿空列表冲掉服务器）；保存失败：页面不变 + 有提示；
//   当场校验（链接 / @ / 连续数字 / 重复）不发请求；开关关着：不显示、不读接口；退出登录：清掉。
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
    const S = { me: { id: ME, member_no: 1288, nickname: 'Sam', last_initial: 'L', utr: 5, utr_estimated: false, avatar_kind: 'letter', avatar_animal: null, avatar_color: 'paper', card_theme: 'court', created_at: new Date().toISOString(), gender: null, club_ids: [], pact_accepted_at: new Date().toISOString() },
      rk: [{ brand: 'Head', series: 'Speed' }], log: [], puts: [], getFail: false, putFail: null, rkGets: 0, slowMe: 0 };
    await pg.route('https://nanbanqiu.app/**', async r => { const u = new URL(r.request().url()); if (!u.pathname.startsWith('/api/')) return r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: fs.readFileSync(path.join(DIR, f)) });
      const m = r.request().method(), p = u.pathname, pd = r.request().postData(), body = pd ? JSON.parse(pd) : null; const J = (s, d) => r.fulfill({ status: s, contentType: 'application/json', body: JSON.stringify(d) });
      if (p !== '/api/events') S.log.push(m + ' ' + p);
      const rows = () => S.rk.map((x, i) => ({ slot: i + 1, brand: x.brand, series: x.series }));
      if (p === '/api/me/rackets' && m === 'GET') { S.rkGets++; return S.getFail ? J(500, { error: 'server' }) : J(200, { rackets: rows() }) }
      if (p === '/api/me/rackets' && m === 'PUT') { S.puts.push(body); if (S.putFail) return J(422, { error: S.putFail });
        S.rk = body.rackets.map(x => ({ brand: x.brand || null, series: x.series })); return J(200, { rackets: rows() }) }
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

    // —— 退出登录：清掉
    await pg.evaluate(() => { sbaLogout(); render() }); await pg.settle(400); await toMe(); await pg.settle(200);
    T(tag('退出登录：个人页不再有球拍'), await pg.evaluate(() => !document.querySelector('.rk') && !Object.values(USERS).some(u => Array.isArray(u.rackets))));
    T(tag('无脚本错误'), errs.length === 0, errs); await ctx.close();
  }
  await b.close(); console.log(`rackets: ${pass} 通过, ${fail} 失败`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1) });
