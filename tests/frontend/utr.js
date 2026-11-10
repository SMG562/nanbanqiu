// 我的 UTR（#101）：真实模式（nanbanqiu.app + 假 Supabase + 有状态的假 /api），两端点真实按钮走一遍入口清单：
//   正式（数字 + 主页链接）· 自评（五档）· 当场校验（不发请求）· 保存失败（页面不变）· 「清空内存 → 重读 → 还在」· 刷新后还在；
//   「几周前更新」平时不显示（悬停才显示）；球员卡只显示数字（不带 ≈）；开关关着：不显示、不读接口；换账号不沿用上一个人的主页编号。
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
    pg.settle = ms => new Promise(r => setTimeout(r, ms));
    if (on) await pg.addInitScript(() => { try { localStorage.setItem('nbq_ff_utr', '1') } catch (_) { } });
    await pg.addInitScript(() => { window.AN_LOG = [] });
    const S = { me: { id: ME, member_no: 1288, nickname: 'Sam', last_initial: 'L', utr: 3, utr_estimated: true, avatar_kind: 'letter', avatar_animal: null, avatar_color: 'paper', card_theme: 'court', created_at: new Date().toISOString(), gender: null, club_ids: [], home_city: 'melb' },
      profile: null, at: null, puts: [], gets: 0, putFail: null, log: [] };
    const view = () => ({ utr: S.me.utr, estimated: S.me.utr_estimated, profile: S.profile, updated_at: S.at });
    await pg.route('https://nanbanqiu.app/**', async r => { const u = new URL(r.request().url()); if (!u.pathname.startsWith('/api/')) return r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: fs.readFileSync(path.join(DIR, f)) });
      const m = r.request().method(), p = u.pathname, pd = r.request().postData(), body = pd ? JSON.parse(pd) : null; const J = (s, d) => r.fulfill({ status: s, contentType: 'application/json', body: JSON.stringify(d) });
      if (p === '/api/events') { S.log.push(...((body && body.events) || []).map(e => e.event)); return J(200, { ok: true }) }
      if (p === '/api/me/utr' && m === 'GET') { S.gets++; return J(200, { utr: view() }) }
      if (p === '/api/me/utr' && m === 'PUT') { S.puts.push(body); if (S.putFail) return J(S.putFail === 'rate_limited' ? 429 : 422, { error: S.putFail });
        S.me.utr = body.utr; S.me.utr_estimated = body.estimated; if ('profile' in body) S.profile = body.profile; S.at = new Date().toISOString(); return J(200, { utr: view() }) }
      if (m === 'GET') {
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
    const until = (fn, n = 30) => pg.until(fn, n * 200);   // 按真实时间等（pg.until，tests/lib/preload 第 8 条）
    const toMe = () => pg.evaluate(W => { try { closeSheet() } catch (_) { } try { closeModal() } catch (_) { } if (W) { UI.tab = 'me'; render() } else go('me') }, W);
    // 页面上画出来的那一行（DOM）：「标签|数字」
    const row = () => pg.evaluate(() => { const r = document.querySelector('.ut .ut-row'); return r ? r.querySelector('.rk-br').textContent + '|' + r.querySelector('.ut-n').textContent : null });
    const tap = sel => pg.evaluate(s => { const e = document.querySelector(s); if (!e) return false; e.click(); return true }, sel);
    const open = async () => { await pg.click('.ut .ut-row'); await pg.settle(400) };
    const sheetOpen = () => pg.evaluate(W => W ? document.querySelector('#mbg').classList.contains('show') && !!document.querySelector('#modal .ut-pk') : document.querySelector('#sheet').classList.contains('show') && !!document.querySelector('#sheet .ut-pk'), W);
    const login = async () => { await pg.evaluate(() => { openAuth(null) }); await pg.settle(300); await pg.fill('#ph', '0412 345 678'); await pg.click('[data-a="sendCode"]'); await pg.settle(400); await pg.fill('#otp', '123456');
      await pg.waitForFunction(() => typeof ME !== 'undefined' && ME && ME.name === 'Sam', null, { timeout: 10000 }).catch(() => { }); await pg.settle(300) };

    await pg.goto('https://nanbanqiu.app/'); await pg.settle(600);
    S.at = new Date(await pg.evaluate(() => Date.now()) - 21 * 864e5).toISOString();   // 测试环境的页面时间是固定的，按页面时间算「3 周前」
    await login(); await toMe(); await pg.settle(300);
    if (!on) {
      T(tag('不读 /api/me/utr'), S.gets === 0);
      T(tag('个人页没有「我的 UTR」'), await pg.evaluate(() => !document.querySelector('.ut-row')));
      T(tag('无脚本错误'), errs.length === 0, errs); await ctx.close(); continue }

    // —— 读入
    T(tag('打开个人页读一次 /api/me/utr'), await until(() => S.gets >= 1), S.gets);
    T(tag('自评的人：标签「自评」+「≈3.0」'), await row() === '自评|≈3.0', await row());
    T(tag('「几周前更新」平时看不见'), await pg.evaluate(() => getComputedStyle(document.querySelector('.ut-tip')).opacity === '0'));
    if (W) { await pg.hover('.ut .ut-row'); await pg.settle(250);
      T(tag('鼠标悬停才显示「3 周前更新」'), await pg.evaluate(() => { const t = document.querySelector('.ut-tip'); return getComputedStyle(t).opacity === '1' && t.textContent === '3 周前更新' })) }
    else T(tag('手机：时间写在行里（长按才显示）'), await pg.evaluate(() => document.querySelector('.ut-tip').textContent === '3 周前更新'));

    // —— 自评：打开就在「自评」，选中当前那档
    await open();
    T(tag('点这一行 → 弹层打开在「自评」，选中 ≈3.0（常打比赛）'), await sheetOpen() && await pg.evaluate(() => document.querySelector('[data-a="utMode"][data-m="self"]').getAttribute('aria-selected') === 'true'
      && document.querySelector('.ut-opt[aria-checked="true"]').textContent.includes('常打比赛') && document.querySelectorAll('.ut-opt').length === 5));
    await tap('.ut-opt[data-i="1"]'); await tap('[data-a="utSave"]'); await pg.settle(500);
    T(tag('自评选「能稳定对拉」→ PUT {utr:1.5, estimated:true}，不带 profile'), JSON.stringify(S.puts.at(-1)) === '{"utr":1.5,"estimated":true}', S.puts.at(-1));
    T(tag('保存后弹层关、页面显示「≈1.5」'), !(await sheetOpen()) && await row() === '自评|≈1.5', await row());

    // —— 正式：当场校验不发请求
    await open(); await tap('[data-a="utMode"][data-m="off"]'); await pg.settle(200);
    T(tag('切到「正式」：自评的人数字框是空的'), await pg.evaluate(() => document.querySelector('#utrNum').value === ''));
    const n0 = S.puts.length;
    for (const [v, msg] of [['20', 'UTR 在 1 – 16.5 之间'], ['4.567', '最多两位小数'], ['', '填一下 UTR']]) {
      await pg.fill('#utrNum', v); await tap('[data-a="utSave"]'); await pg.settle(150);
      T(tag(`数字「${v}」→ 当场提示「${msg}」`), await pg.evaluate(m => document.querySelector('#utErr').textContent === m && document.querySelector('#utrNum').classList.contains('bad'), msg)) }
    await pg.fill('#utrNum', '4.62'); await pg.fill('#utrLink', '张三'); await tap('[data-a="utSave"]'); await pg.settle(150);
    T(tag('链接填名字 → 「不是 UTR 主页链接」'), await pg.evaluate(() => document.querySelector('#utErr').textContent === '不是 UTR 主页链接'));
    T(tag('当场校验不通过都不发请求'), S.puts.length === n0);
    await pg.fill('#utrLink', 'https://app.utrsports.net/profiles/1234567'); await pg.settle(100);
    T(tag('链接认出来 → 框里亮 ✓、错误清掉'), await pg.evaluate(() => document.querySelector('.ut-lk').classList.contains('good') && document.querySelector('#utErr').textContent === ''));
    // 回车保存（键盘入口）
    await pg.focus('#utrNum'); await pg.keyboard.press('Enter'); await pg.settle(500);
    T(tag('回车保存 → PUT 正式 4.62 + 链接（只发这三个字段）'), JSON.stringify(S.puts.at(-1)) === '{"utr":4.62,"estimated":false,"profile":"1234567"}', S.puts.at(-1));
    T(tag('页面显示「正式 | 4.62」'), await row() === '正式|4.62', await row());
    T(tag('清空内存 → 重读 → 还在'), await pg.evaluate(async () => { ME.ntrp = 0; UT.got = false; UT.uid = null; utLoad(); await new Promise(r => setTimeout(r, 400)); render(); return ME.ntrp === 4.62 && UT.profile === '1234567' }) && await row() === '正式|4.62');
    await open();
    T(tag('再打开：数字和主页编号带出来'), await pg.evaluate(() => document.querySelector('#utrNum').value === '4.62' && document.querySelector('#utrLink').value === '1234567' && document.querySelector('.ut-lk').classList.contains('good')));
    // —— 保存失败：页面不变 + 有提示
    S.putFail = 'rate_limited'; await pg.fill('#utrNum', '6'); await tap('[data-a="utSave"]'); await pg.settle(600);
    T(tag('服务器拒绝（频率）→ 页面仍是 4.62'), await row() === '正式|4.62' && S.me.utr === 4.62, await row()); S.putFail = null;
    await toMe(); await pg.settle(200);

    // —— 球员卡只显示数字，不带 ≈
    S.me.utr = 2; S.me.utr_estimated = true;
    await pg.evaluate(() => { ME.ntrp = 2; ME.utr_estimated = true; render() }); await pg.settle(200);
    T(tag('球员卡：自评的人也只显示数字（不带 ≈）'), await pg.evaluate(() => { const b = document.querySelector('.pc-rt b'); return !b || !/≈/.test(b.textContent) }));

    const EV = await pg.evaluate(() => (AN.pre || []).concat(window.AN_LOG || []).filter(e => /^utr_/.test(e.ev)).map(e => ({ ev: e.ev, p: e.props })));
    // —— 刷新后还在（从服务器读）
    S.me.utr = 4.62; S.me.utr_estimated = false;
    await pg.reload(); await pg.waitForFunction(() => typeof ME !== 'undefined' && !!ME, null, { timeout: 8000 }).catch(() => { }); await toMe();
    T(tag('刷新后还在：正式 4.62'), await until(async () => await row() === '正式|4.62'), await row());
    T(tag('刷新后主页编号读回'), await until(() => pg.evaluate(() => UT.profile === '1234567')));
    // —— 埋点：只记类型 / 有无链接 / 升降，不记数值和编号
    const ev = EV.filter(e => e.ev === 'utr_save').map(e => e.p);
    T(tag('埋点 utr_save 只有 mode / linked / change，不含数值和编号'), ev.length === 2 && ev.every(p => Object.keys(p).sort().join() === 'change,linked,mode') && !JSON.stringify(ev).includes('1234567') && !JSON.stringify(ev).includes('4.62'), ev);
    T(tag('埋点 utr_save：自评降到 1.5、正式升到 4.62 带链接'), JSON.stringify(ev) === JSON.stringify([{ mode: 'self', linked: false, change: 'down' }, { mode: 'off', linked: true, change: 'up' }]), ev);
    const inv = EV.filter(e => e.ev === 'utr_invalid').map(e => e.p.reason).join();
    T(tag('埋点 utr_invalid：四种原因各一次，只记原因'), inv === 'range,format,empty,link', EV.filter(e => e.ev === 'utr_invalid'));
    const op = EV.filter(e => e.ev === 'utr_open').map(e => e.p);
    T(tag('埋点 utr_open：每次打开一次（自评 / 正式；第二次带链接）'), JSON.stringify(op) === JSON.stringify([{ mode: 'self', linked: false }, { mode: 'self', linked: false }, { mode: 'off', linked: true }]), op);

    // —— 退出再换人登录：不沿用上一个人的主页编号
    await pg.evaluate(() => { sbaLogout(); render() }); await pg.settle(400);
    T(tag('退出登录：没有「我的 UTR」'), await pg.evaluate(() => !document.querySelector('.ut-row')));
    T(tag('无脚本错误'), errs.length === 0, errs); await ctx.close();
  }
  await b.close(); console.log(`utr: ${pass} 通过, ${fail} 失败`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1) });
