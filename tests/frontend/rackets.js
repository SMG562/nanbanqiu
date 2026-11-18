// 我的球拍（#60 / #389 PR2b，ADR 0014）：真实模式（nanbanqiu.app + 假 Supabase + 有状态的假 /api），两端都点真实按钮走一遍入口清单：
//   添加（搜索 / 品牌 → 系列 + 昵称）· 其他系列 · 其他品牌 · 编辑 · 设为主力 · 删除（要确认）—— 每次都断言 PUT 的内容、页面（DOM）和「清空内存 → 重读 → 还在」；
//   库（GET /api/rackets/lib）读不到 / 数据不对 → 内置兜底（发旧形状）；老行（brand_id 空）回退读 brand / series；昵称 ≤12 字符、输入法组合期间不截断；
//   刷新：先画快照里的球拍；读失败：保留原来的、不许改；保存失败：页面不变 + 有提示；当场校验不发请求；开关关着：不显示、不读接口；退出登录：清掉；
//   4 个埋点（racket_picker_open / racket_brand_pick / racket_save / racket_invalid）props 与字典一致、不含手写文字。
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const DIR = process.env.NBQ_DIR || path.join(__dirname, '..', '..');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 600) : '')) };
const SB = 'https://xosrdkrkfxkdrwldfhac.supabase.co', ME = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', V1 = '11111111-1111-4111-8111-111111111111';
const VENUES = [{ id: V1, name: 'Test Tennis Club', short_name: 'Test TC', suburb: 'Malvern', surfaces: ['hard'], courts: 4, lights: true, indoor: false, booking_url: null, lat: -37.86, lng: 145.03 }];
const U = n => `b0000000-0000-4000-8000-0000000000${String(n).padStart(2, '0')}`, XSS = '<img src=x onerror=__rkx=1>';
const mk = (id, name, ser) => ({ id: U(id), name, series: ser.map(([i, n, al]) => ({ id: U(i), name: n, is_other: n === '其他系列', aliases: al || [] })) });
const LIB = [mk(1, 'Head', [[1, 'Speed'], [2, 'Radical'], [3, '其他系列']]), mk(2, 'Wilson', [[4, 'Blade'], [5, 'Pro Staff', ['ps']], [6, '其他系列']]),
  mk(3, 'Babolat', [[7, 'Pure Drive', ['pd']], [8, '其他系列']]), mk(4, XSS, [[9, 'Bad'], [10, '其他系列']])];
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  for (const f of ['南伴球_PWA.html', '南伴球_Web.html']) for (const on of [true, false]) {
    const W = f.includes('Web'), tag = s => `${W ? 'Web' : 'PWA'}${on ? '' : '（开关关）'} ${s}`;
    const ctx = await b.newContext({ viewport: W ? { width: 1360, height: 860 } : { width: 390, height: 844 } });
    const pg = await ctx.newPage(), errs = []; pg.on('pageerror', e => errs.push(e.message + ' @ ' + String(e.stack).split('\n').slice(1, 3).join('|')));
    if (on) await pg.addInitScript(() => { try { localStorage.setItem('nbq_ff_rackets', '1') } catch (_) { } });
    await pg.addInitScript(() => { window.AN_LOG = [] });
    const S = { me: { id: ME, member_no: 1288, nickname: 'Sam', last_initial: 'L', utr: 5, utr_estimated: false, avatar_kind: 'letter', avatar_animal: null, avatar_color: 'paper', card_theme: 'court', created_at: new Date().toISOString(), gender: null, club_ids: [], pact_accepted_at: new Date().toISOString() },
      rk: [{ brand: 'Head', series: 'Speed' }], log: [], puts: [], getFail: false, putFail: null, rkGets: 0, slowMe: 0, lib: LIB, libGets: 0 };   // lib：null = 接口 500（兜底）；数组 = 正常；{raw} = 原样返回（坏数据）
    // 假服务器：新形状按 id 查库；旧形状按名字对库（对上记 id，对不上当其他）；回的行带全部新字段
    const toRow = (x, i) => { const base = { slot: i + 1, catalog_id: null, brand_id: null, series_id: null, other_text: null, other_brand_text: null, nickname: x.nickname || null };
      if (x.brand_id) { const g = LIB.find(g => g.id === x.brand_id), se = x.series_id ? g.series.find(s => s.id === x.series_id) : null; return { ...base, brand: g.name, series: se ? se.name : x.other_text, brand_id: g.id, series_id: se ? se.id : null, other_text: se ? null : x.other_text } }
      const g = LIB.find(g => g.name.toLowerCase() === String(x.brand || '').toLowerCase()), se = g && g.series.find(s => !s.is_other && s.name.toLowerCase() === String(x.series).toLowerCase());
      return g ? { ...base, brand: g.name, series: x.series, brand_id: g.id, series_id: se ? se.id : null, other_text: se ? null : x.series } : { ...base, brand: x.brand || null, series: x.series, other_brand_text: x.brand || null } };
    await pg.route('https://nanbanqiu.app/**', async r => { const u = new URL(r.request().url()); if (!u.pathname.startsWith('/api/')) return r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: fs.readFileSync(path.join(DIR, f)) });
      const m = r.request().method(), p = u.pathname, pd = r.request().postData(), body = pd ? JSON.parse(pd) : null; const J = (s, d) => r.fulfill({ status: s, contentType: 'application/json', body: JSON.stringify(d) });
      if (p !== '/api/events') S.log.push(m + ' ' + p);
      const rows = () => S.rk.map((x, i) => (x.slot ? x : { slot: i + 1, brand: x.brand, series: x.series, catalog_id: null, brand_id: null, series_id: null, other_text: null, other_brand_text: null, nickname: null }));
      if (p === '/api/rackets/lib' && m === 'GET') { S.libGets++; return S.lib === null ? J(500, { error: 'server' }) : J(200, Array.isArray(S.lib) ? { brands: S.lib } : S.lib.raw) }
      if (p === '/api/me/rackets' && m === 'GET') { S.rkGets++; return S.getFail ? J(500, { error: 'server' }) : J(200, { rackets: rows() }) }
      if (p === '/api/me/rackets' && m === 'PUT') { S.puts.push(body); if (S.putFail) return J(422, { error: S.putFail }); S.rk = body.rackets.map(toRow); return J(200, { rackets: rows() }) }
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
    // 按真实时间等条件成立（n × 200ms）：pg.settle 页面空闲时会提前返回（#141 根因）
    const until = async (fn, n = 30) => { const t0 = Date.now(); while (Date.now() - t0 < n * 200) { try { if (await fn()) return true } catch (_) { } await new Promise(r => setTimeout(r, 100)) } return false };
    const toMe = () => pg.evaluate(W => { try { closeSheet() } catch (_) { } try { closeModal() } catch (_) { } if (W) { UI.tab = 'me'; render() } else go('me') }, W);
    // 页面上画出来的球拍（DOM）：主力 * ；标题 / 副标题；空槽 +
    const tiles = () => pg.evaluate(() => [...document.querySelectorAll('.rk .rk-row')].map(t => t.classList.contains('rk-add') ? '+' : (t.querySelector('.rk-main') ? '*' : '') + t.querySelector('.rk-se').textContent + (t.querySelector('.rk-br') ? '/' + t.querySelector('.rk-br').textContent : '')).join(' '));
    const tap = sel => pg.evaluate(s => { const e = document.querySelector(s); if (!e) return false; e.click(); return true }, sel);
    const putN = () => S.puts.length, lastPut = () => S.puts.at(-1);
    const sheetOpen = () => pg.evaluate(W => W ? document.querySelector('#mbg').classList.contains('show') && !!document.querySelector('#modal .rk-pk') : document.querySelector('#sheet').classList.contains('show') && !!document.querySelector('#sheet .rk-pk'), W);
    const txt = sel => pg.evaluate(s => [...document.querySelectorAll(s)].map(e => e.textContent).join('|'), sel);
    const setIn = (id, v) => pg.evaluate(([id, v]) => { const i = document.getElementById(id); i.value = v; i.dispatchEvent(new Event('input', { bubbles: true })) }, [id, v]);
    const saveDis = () => pg.evaluate(() => document.querySelector('[data-a="rkSave"]').disabled);
    const reread = async () => { await pg.evaluate(async () => { ME.rackets = undefined; await nbqRefresh() }); await pg.settle(300); return tiles() };
    const rkEv = () => pg.evaluate(() => (AN.pre || []).concat(window.AN_LOG || []).filter(e => /^racket_/.test(e.ev)).map(e => ({ ev: e.ev, p: e.props })));
    const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    const login = async () => { await pg.evaluate(() => { openAuth(null) }); await pg.settle(300); await pg.fill('#ph', '0412 345 678'); await pg.click('[data-a="sendCode"]'); await pg.settle(400); await pg.fill('#otp', '123456');
      await pg.waitForFunction(() => typeof ME !== 'undefined' && ME && ME.name === 'Sam', null, { timeout: 10000 }).catch(() => { }); await pg.settle(300) };
    const open = async i => { await tap(`.rk [data-a="rkSlot"][data-i="${i}"]`); await until(async () => await pg.evaluate(() => !!document.querySelector('.rk-pk')), 15); await pg.settle(150) };

    await pg.goto('https://nanbanqiu.app/'); await pg.settle(600); await login(); await toMe(); await pg.settle(300);
    if (!on) {
      T(tag('不读 /api/me/rackets'), S.rkGets === 0, S.log);
      T(tag('个人页没有「我的球拍」'), await pg.evaluate(() => !document.querySelector('.rk') && !!document.querySelector(typeof DEV !== 'undefined' ? '#meBody .group' : '.card')));
      T(tag('无脚本错误'), errs.length === 0, errs); await ctx.close(); continue }

    // —— 读入：老行（brand_id 空）回退读 brand / series 列；主力大卡 + 空槽
    T(tag('登录后读 /api/me/rackets'), S.rkGets >= 1, S.log);
    T(tag('读入后页面：主力 Speed/Head（老行回退旧列）+ 空槽'), await until(async () => await tiles() === '*Speed/Head +'), await tiles());
    T(tag('一张主力大卡 + 备用小卡区（空槽虚线）'), await pg.evaluate(() => !!document.querySelector('.rk .rk-big.main') && document.querySelectorAll('.rk .rk-sm.rk-add').length === 1));

    // —— 添加：一屏（搜索 + 品牌 + 系列 + 昵称 + 保存）；点品牌 → 系列；保存按钮先是灰的
    await open(1); const g0 = S.libGets;
    T(tag('点空槽 → 一屏弹层：搜索框、品牌 chips、昵称、保存、可见说明'), await pg.evaluate(() => !!document.querySelector('.rk-pk #rkQ') && document.querySelectorAll('#rkBr [data-a="rkBrand"]').length === 4 && !!document.querySelector('#rkBr [data-a="rkOther"]') && !!document.querySelector('#rkNick') && /所有球友可见/.test(document.querySelector('.rk-pk').textContent)));
    T(tag('搜索框 16px（iOS 不放大）、昵称输入框有'), W || await pg.evaluate(() => parseFloat(getComputedStyle(document.getElementById('rkQ')).fontSize) >= 16 && parseFloat(getComputedStyle(document.getElementById('rkNick')).fontSize) >= 16));
    T(tag('品牌名当文字显示（无 img、脚本没执行）'), await pg.evaluate(() => !document.querySelector('.rk-pk img') && window.__rkx === undefined));
    T(tag('保存先是灰的'), await saveDis());
    await tap('[data-a="rkBrand"][data-b="Wilson"]'); await pg.settle(100);
    T(tag('Wilson 的系列：Blade / Pro Staff / 其他系列'), await txt('#rkSe [data-a="rkSeries"]') === 'Blade|Pro Staff|其他系列', await txt('#rkSe [data-a="rkSeries"]'));
    await tap('[data-a="rkSeries"][data-s="Blade"]'); await pg.settle(100);
    T(tag('选了系列：保存亮了'), !(await saveDis()));
    await setIn('rkNick', '老伙计'); const n0 = putN(); await tap('[data-a="rkSave"]'); await until(async () => (await tiles()).includes('老伙计'));
    T(tag('添加：PUT 整组（老行旧形状，新的发 brand_id / series_id / nickname）'), same(lastPut(), { rackets: [{ brand: 'Head', series: 'Speed' }, { brand_id: U(2), series_id: U(4), nickname: '老伙计' }] }) && putN() === n0 + 1, lastPut());
    T(tag('添加：昵称为主、品牌系列为副；弹层关了'), await tiles() === '*Speed/Head 老伙计/Wilson Blade +' && !(await sheetOpen()), await tiles());
    T(tag('添加：清空内存 → 重读 → 还在'), await reread() === '*Speed/Head 老伙计/Wilson Blade +', await tiles());
    T(tag('库一页只读一次'), S.libGets === g0, S.libGets - g0);

    // —— 搜索（品牌 / 系列 / 别名）、已在包里不能再选
    await open(2); await setIn('rkQ', 'pd'); await pg.settle(100);
    T(tag('搜索别名 pd → Babolat Pure Drive'), await txt('#rkSe [data-a="rkSeries"]') === 'Babolat Pure Drive' && await txt('#rkBr [data-a="rkBrand"]') === 'Babolat', await txt('#rkSe [data-a="rkSeries"]'));
    await setIn('rkQ', 'zzz'); await pg.settle(100);
    T(tag('搜不到：提示可以点「其他品牌」'), /其他品牌/.test(await txt('#rkSe')), await txt('#rkSe'));
    await setIn('rkQ', ''); await tap('[data-a="rkBrand"][data-b="Wilson"]'); await pg.settle(100);
    T(tag('包里已有的 Wilson Blade 不能再选'), await pg.evaluate(() => { const x = document.querySelector('[data-a="rkSeries"][data-s="Blade"]'); return !!x && x.disabled && /已在包里/.test(x.textContent) }));

    // —— 其他系列：出输入框，当场校验不发请求；通过后发 {brand_id, other_text}
    await tap('[data-a="rkSeries"][data-s="其他系列"]'); await pg.settle(400);
    T(tag('其他系列：出现拍子名称输入框，保存灰'), await pg.evaluate(() => !document.getElementById('rkTx').hidden) && await saveDis());
    const n1 = putN();
    for (const [v, re] of [['加我 1234567', /链接|@|数字/], ['www.shop.com', /链接/], ['ask @me', /@/], ['blade', /已经在包里/]]) {
      await setIn('rkName', v); await tap('[data-a="rkSave"]'); await pg.settle(120);
      T(tag(`其他系列：「${v}」当场提示、不发请求`), putN() === n1 && re.test(await pg.evaluate(() => document.getElementById('rkErr').textContent)), await pg.evaluate(() => document.getElementById('rkErr').textContent)) }
    T(tag('埋点 racket_invalid：dup / link / at / digits 各一次'), same((await rkEv()).filter(e => e.ev === 'racket_invalid').map(e => e.p.reason), ['digits', 'link', 'at', 'dup']), (await rkEv()).filter(e => e.ev === 'racket_invalid'));
    await setIn('rkName', '  Pro  Staff 97 '); await tap('[data-a="rkSave"]'); await until(async () => (await tiles()).includes('Pro Staff 97'));
    T(tag('其他系列：去多余空格，发 {brand_id, other_text}'), same(lastPut().rackets[2], { brand_id: U(2), other_text: 'Pro Staff 97' }), lastPut());
    T(tag('其他系列：清空内存 → 重读 → 还在'), await reread() === '*Speed/Head 老伙计/Wilson Blade Pro Staff 97/Wilson', await tiles());

    // —— 昵称：≤12 字符；输入法组合期间不截断，组合结束才截
    await tap('.rk [data-a="rkSlot"][data-i="2"]'); await pg.settle(200); await tap('[data-a="rkEdit"]'); await pg.settle(300);
    T(tag('编辑：带出已选的品牌 + 其他系列 + 文字'), await pg.evaluate(() => document.querySelector('[data-a="rkBrand"].on').dataset.b === 'Wilson' && document.querySelector('[data-a="rkSeries"].on').dataset.s === '其他系列' && document.getElementById('rkName').value === 'Pro Staff 97'));
    const cap = await pg.evaluate(() => { const k = document.getElementById('rkNick'); k.focus(); k.value = '一二三四五六七八九十一二三四'; k.dispatchEvent(new InputEvent('input', { bubbles: true, isComposing: true })); const mid = k.value.length; k.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true })); return [mid, k.value.length] });
    T(tag('昵称：组合期间不截断（14），组合结束截到 12'), same(cap, [14, 12]), cap);
    await setIn('rkNick', '新昵称'); await tap('[data-a="rkSave"]'); await until(async () => (await tiles()).includes('新昵称'));
    T(tag('编辑：只改昵称，其余照旧'), same(lastPut().rackets[2], { brand_id: U(2), other_text: 'Pro Staff 97', nickname: '新昵称' }), lastPut());

    // —— 其他品牌：一个输入框，发旧形状 {brand:null, series}
    await tap('.rk [data-a="rkSlot"][data-i="2"]'); await pg.settle(200); await tap('[data-a="rkDel"]'); await pg.settle(200);
    const nDel = putN();
    T(tag('删除要确认：先出确认弹层，不发请求'), await pg.evaluate(() => !!document.querySelector('[data-a="rkDelOk"]') && !!document.querySelector('[data-a="rkNo"]')) && putN() === nDel, putN());
    const n2 = putN(); await tap('[data-a="rkNo"]'); await pg.settle(300);
    T(tag('先不删：弹层关了、不发请求、还在'), putN() === n2 && !(await sheetOpen()) && (await tiles()).includes('新昵称'), await tiles());
    await open(2).catch(() => { }); await tap('.rk [data-a="rkSlot"][data-i="2"]'); await pg.settle(200); await tap('[data-a="rkDel"]'); await pg.settle(200);
    S.putFail = 'invalid'; await tap('[data-a="rkDelOk"]'); await pg.settle(900);
    T(tag('保存失败：发了请求、页面不变、有提示'), putN() === n2 + 1 && (await tiles()).includes('新昵称') && await pg.evaluate(() => { const t = document.querySelector('#toast'); return !!t && t.textContent.trim().length > 0 }), await tiles());
    S.putFail = null; await tap('[data-a="rkDelOk"]'); await until(async () => !(await tiles()).includes('新昵称'));
    T(tag('确认删除：PUT 少一把'), lastPut().rackets.length === 2, lastPut());
    T(tag('删除：清空内存 → 重读 → 还在'), await reread() === '*Speed/Head 老伙计/Wilson Blade +', await tiles());
    await open(2); await tap('#rkBr [data-a="rkOther"]'); await pg.settle(400);
    T(tag('其他品牌：只有名称输入框出现，保存灰'), await pg.evaluate(() => !document.getElementById('rkTx').hidden && !document.querySelector('#rkSe [data-a="rkSeries"]')) && await saveDis());
    await setIn('rkName', 'Diadem Elevate'); await tap('[data-a="rkSave"]'); await until(async () => (await tiles()).includes('Diadem'));
    T(tag('其他品牌：发旧形状 {brand:null, series}'), same(lastPut().rackets[2], { brand: null, series: 'Diadem Elevate' }), lastPut());
    T(tag('其他品牌：清空内存 → 重读 → 还在'), (await reread()).endsWith('Diadem Elevate'), await tiles());

    // —— 编辑老行：对回库里的 Head / Speed，改昵称后升级成新形状
    await tap('.rk [data-a="rkSlot"][data-i="0"]'); await pg.settle(200); await tap('[data-a="rkEdit"]'); await pg.settle(300);
    T(tag('编辑老行：品牌 Head、系列 Speed 已选'), await pg.evaluate(() => document.querySelector('[data-a="rkBrand"].on').dataset.b === 'Head' && document.querySelector('[data-a="rkSeries"].on').dataset.s === 'Speed'));
    await setIn('rkNick', '主力'); await tap('[data-a="rkSave"]'); await until(async () => (await tiles()).startsWith('*主力'));
    T(tag('编辑老行：发新形状 + 昵称'), same(lastPut().rackets[0], { brand_id: U(1), series_id: U(1), nickname: '主力' }), lastPut());

    // —— 设为主力：和 1 号交换
    await tap('.rk [data-a="rkSlot"][data-i="1"]'); await pg.settle(200);
    T(tag('点已有的一把 → 编辑 / 设为主力 / 删除'), await pg.evaluate(() => ['rkEdit', 'rkMain', 'rkDel'].every(a => document.querySelector(`[data-a="${a}"]`))));
    await tap('[data-a="rkMain"]'); await until(async () => (await tiles()).startsWith('*老伙计'));
    T(tag('设为主力：与 1 号交换，清空内存 → 重读 → 还在'), (await reread()).startsWith('*老伙计/Wilson Blade 主力/Head Speed'), await tiles());

    // —— 读失败：保留原来的；第一次就没读到：不显示格子、不许改
    const keep = await tiles(); S.getFail = true; await pg.evaluate(() => nbqRefresh()); await pg.settle(300);
    T(tag('重读失败：保留原来的'), await tiles() === keep, await tiles());
    const n3 = putN(); await pg.evaluate(async () => { ME.rackets = undefined; await nbqRefresh() }); await pg.settle(300);
    T(tag('从没读到：显示「断线了」，没有球拍行'), await pg.evaluate(() => !document.querySelector('.rk .rk-row') && /断线了/.test(document.querySelector('.rk-off').textContent)));
    await pg.evaluate(() => rkAct({ dataset: { a: 'rkSlot', i: '0' } })); await pg.settle(200);
    T(tag('从没读到：点不开、不发写请求'), putN() === n3 && !(await sheetOpen()));
    S.getFail = false; await pg.evaluate(() => nbqRefresh()); await pg.settle(300);
    T(tag('恢复后再读：回来了'), await tiles() === keep, await tiles());

    // —— 刷新：先画快照里的（服务器慢也不闪空槽），读完以服务器为准
    await pg.settle(1200); S.slowMe = 2500; S.rk = [{ brand: 'Yonex', series: 'EZONE' }, { brand: 'Head', series: 'Speed' }, { brand: 'Dunlop', series: 'CX' }];
    await pg.reload(); await pg.waitForFunction(() => typeof ME !== 'undefined' && !!ME, null, { timeout: 5000 }).catch(() => { }); await toMe(); await pg.settle(150);
    T(tag('刷新：还没读回来时先画快照里的球拍（不闪空槽）'), await tiles() === keep, await tiles());
    await until(async () => (await tiles()).includes('Dunlop'), 40);
    T(tag('刷新：读回来后换成服务器上的（换设备改过的也在），满 3 把没有空槽'), await tiles() === '*EZONE/Yonex Speed/Head CX/Dunlop', await tiles()); S.slowMe = 0;

    // —— 库读不到 → 内置兜底（7 个品牌，发旧形状）；库数据全是坏行 → 兜底
    for (const [lib, why] of [[null, '500'], [{ raw: { brands: [{ id: 'bad', name: 'Evil', series: [] }, { id: U(1), name: '', series: [] }] } }, '坏行']]) {
      S.lib = lib; S.rk = [{ brand: 'Head', series: 'Speed' }]; await pg.evaluate(() => { try { closeSheet() } catch (_) { } try { closeModal() } catch (_) { } }); await pg.reload(); await pg.waitForFunction(() => typeof ME !== 'undefined' && !!ME && Array.isArray(ME.rackets), null, { timeout: 8000 }).catch(() => { }); await toMe(); await pg.settle(300);
      await open(1); await pg.settle(600);
      T(tag(`库${why}：用内置 7 个品牌（+ 其他品牌），不显示坏数据`), await pg.evaluate(() => document.querySelectorAll('#rkBr [data-a="rkBrand"]').length === 7 && !/Evil/.test(document.querySelector('.rk-pk').textContent)), await txt('#rkBr [data-a="rkBrand"]'));
      await tap('[data-a="rkBrand"][data-b="Wilson"]'); await pg.settle(100); await tap('[data-a="rkSeries"][data-s="Blade"]'); await tap('[data-a="rkSave"]'); await until(async () => (await tiles()).includes('Blade'));
      T(tag(`库${why}：保存发旧形状 {brand, series}`), same(lastPut().rackets[1], { brand: 'Wilson', series: 'Blade' }), lastPut());
      await pg.evaluate(() => { try { closeSheet() } catch (_) { } try { closeModal() } catch (_) { } }) }
    S.lib = LIB;

    // —— 埋点：props 与字典一致、不含手写文字
    const ev = await rkEv(), all = JSON.stringify(ev), KEYS = { racket_picker_open: 'mode,slot', racket_brand_pick: 'brand', racket_save: 'action,source,n_after', racket_invalid: 'reason' };
    T(tag('埋点：3 种成功路径都出现过'), ['racket_picker_open', 'racket_brand_pick', 'racket_save'].every(k => ev.some(e => e.ev === k)), ev.map(e => e.ev));
    T(tag('埋点：每个 props 正好是字典登记的'), ev.every(e => Object.keys(e.p).sort().join() === KEYS[e.ev].split(',').sort().join()), ev);
    T(tag('埋点：不含手写文字 / 昵称'), !/Diadem|Elevate|shop|@me|1234567|老伙计|新昵称|Pro Staff 97/i.test(all), all.slice(0, 300));

    // —— 退出登录：清掉
    await pg.evaluate(() => { sbaLogout(); render() }); await pg.settle(400); await toMe(); await pg.settle(200);
    T(tag('退出登录：个人页不再有球拍'), await pg.evaluate(() => !document.querySelector('.rk') && !Object.values(USERS).some(u => Array.isArray(u.rackets))));
    T(tag('无脚本错误'), errs.length === 0, errs); await ctx.close();
  }
  await b.close(); console.log(`rackets: ${pass} 通过, ${fail} 失败`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1) });
