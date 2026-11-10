// 球友（#110 PR-B2）：扫码落地加球友。真实模式（nanbanqiu.app + 假 Supabase + 有状态的假 /api），两端 × 开关开 / 关：
//   没登录扫码 → 先登录 → 回到那张卡（按编号向服务器取卡）→「加为球友」→ POST 带来源 → 卡片「已发送，等 TA 确认」→ 清空内存 → 重读 → 还在；
//   普通方式打开球员卡没有「加为球友」；对方先扫过我 → 直接成为球友；删除球友（先确认）→ DELETE → 重读 → 不再是球友；
//   编号不存在 → 提示；扫自己的码 → 只看卡；三个埋点（buddy_scan_view / buddy_request_send / buddy_remove）；开关关着 → 原来的路由，什么都不变。
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const DIR = process.env.NBQ_DIR || path.join(__dirname, '..', '..');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 600) : '')) };
const SB = 'https://xosrdkrkfxkdrwldfhac.supabase.co', ME = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', V1 = '11111111-1111-4111-8111-111111111111', G1 = '99999999-9999-4999-8999-999999999999';
const X = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', Y = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', P = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const VENUES = [{ id: V1, name: 'Test Tennis Club', short_name: 'Test TC', suburb: 'Malvern', surfaces: ['hard'], courts: 4, lights: true, indoor: false, booking_url: null, lat: -37.86, lng: 145.03 }];
const card = (id, nick, no) => ({ id, member_no: no, nickname: nick, last_initial: 'K', utr: 5, avatar_kind: 'letter', avatar_animal: null, avatar_color: 'paper', seal_roll: 0, card_theme: 'court', card_venue_id: null, played: 3, hosted: 1, kudos: 0, level: 1, gone: false });
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  for (const f of ['南伴球_PWA.html', '南伴球_Web.html']) for (const on of [true, false]) {
    const W = f.includes('Web'), tag = s => `${W ? 'Web' : 'PWA'}${on ? '' : '（开关关）'} ${s}`;
    const ctx = await b.newContext({ viewport: W ? { width: 1360, height: 860 } : { width: 390, height: 844 } });
    await ctx.addInitScript(on => { window.AN_LOG = []; window.__rej = []; addEventListener('unhandledrejection', e => window.__rej.push(String(e.reason && (e.reason.stack || e.reason)).slice(0, 300))); if (on) try { localStorage.setItem('nbq_ff_buddies', '1') } catch (_) { } }, on);
    const pg = await ctx.newPage(), errs = []; pg.on('pageerror', e => errs.push(e.message + ' @ ' + String(e.stack).split('\n').slice(1, 3).join('|')));
    const S = { now: 0, log: [], posts: [], dels: [], byNo: [], buddies: [], outgoing: [], incoming: [],
      me: { id: ME, member_no: 1288, nickname: 'Sam', last_initial: 'L', utr: 5, utr_estimated: false, avatar_kind: 'letter', avatar_animal: null, avatar_color: 'paper', card_theme: 'court', created_at: '2026-01-01T00:00:00Z', gender: null, club_ids: [], pact_accepted_at: '2026-01-01T00:00:00Z' },
      cards: { [X]: card(X, 'Xin', 2001), [Y]: card(Y, 'Yan', 2002), [P]: card(P, 'Pat', 2004) } };
    S.cards[ME] = { ...card(ME, 'Sam', 1288) };
    const iso = h => new Date(S.now + h * 3600e3).toISOString();
    await pg.route('https://nanbanqiu.app/**', async r => { const u = new URL(r.request().url()); if (!u.pathname.startsWith('/api/')) return r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: fs.readFileSync(path.join(DIR, f)) });
      const m = r.request().method(), p = u.pathname, pd = r.request().postData(), body = pd ? JSON.parse(pd) : null; const J = (s, d) => r.fulfill({ status: s, contentType: 'application/json', body: JSON.stringify(d) });
      if (p !== '/api/events') S.log.push(m + ' ' + p);
      const mn = p.match(/^\/api\/players\/no\/(\d+)$/);
      if (mn && m === 'GET') { S.byNo.push(+mn[1]); const c = Object.values(S.cards).find(x => x.member_no === +mn[1]); return c ? J(200, { player: c }) : J(404, { error: 'not_found' }) }
      if (p === '/api/buddies' && m === 'GET') return J(200, { buddies: S.buddies.map(id => ({ user_id: id, since: iso(-1) })), incoming: S.incoming.map(x => ({ id: x.id, from_user: x.from, created_at: iso(-2), expires_at: iso(22) })),
        outgoing: S.outgoing.map(id => ({ id: 'o' + id.slice(0, 4) + '-0000-4000-8000-000000000000'.slice(0, 31), to_user: id, created_at: iso(-0.1), expires_at: iso(23.9) })),
        profiles: Object.fromEntries([...S.buddies, ...S.outgoing, ...S.incoming.map(x => x.from)].map(id => [id, S.cards[id]])) });
      if (p === '/api/buddies/requests' && m === 'POST') { S.posts.push(body); const inc = S.incoming.find(x => x.from === body.to_user);
        if (inc) { S.incoming = S.incoming.filter(x => x !== inc); S.buddies.push(body.to_user); return J(200, { status: 'buddies' }) }
        if (!S.outgoing.includes(body.to_user)) S.outgoing.push(body.to_user); return J(200, { status: 'pending', id: '20000000-0000-4000-8000-000000000001' }) }
      const md = p.match(/^\/api\/buddies\/([0-9a-f-]{36})$/);
      if (md && m === 'DELETE') { S.dels.push(md[1]); S.buddies = S.buddies.filter(x => x !== md[1]); return J(200, { ok: true }) }
      if (m === 'GET') {
        if (p === '/api/venues') return J(200, { venues: VENUES });
        if (p === '/api/me') return J(200, { registered: true, user: S.me });
        if (p === '/api/games') return J(200, { games: [] });
        if (p === '/api/games/mine') {   // 3 天前和 Pat 打过 1 场（Pat 在内存里，普通方式能打开他的卡）
          const g = { id: G1, share_code: 'Sc4n', host_id: ME, host_nickname: 'Sam', host_utr: 5, venue_id: V1, venue_name: 'Test Tennis Club', short_name: 'Test TC', starts_at: iso(-72), duration_min: 90, game_type: 'singles', capacity: 2, utr_min: 3, utr_max: 7,
            note: '', status: 'completed', tags: [], visibility: 'public', filled: 2, join_mode: 'approve', city: 'melb', approved_count: 2, pending_count: 0, spots_left: 0 };
          const pp = (uid, role) => ({ game_id: G1, user_id: uid, role, status: 'approved', created_at: iso(-100), approved_at: iso(-99), message: '' });
          return J(200, { games: [g], participants: [pp(ME, 'host'), pp(P, 'player')], profiles: { [ME]: S.me, [P]: S.cards[P] } }) }
        if (p === '/api/invites') return J(200, { invites: [], profiles: {} });
        return J(404, { error: 'not_found' }) }
      return J(404, { error: 'not_found' }) });
    await pg.route(SB + '/**', r => { const v = r.request().url().includes('/verify');
      r.fulfill({ status: v ? 200 : 204, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: v ? JSON.stringify({ access_token: 'AT', refresh_token: 'RT', expires_in: 3600, user: { id: 'sb-1', phone: '61412345678' } }) : '' }) });
    await pg.route('https://cdnjs.cloudflare.com/**', r => r.abort()); await pg.route('https://basemaps.cartocdn.com/**', r => r.abort());
    // 按真实时间等条件成立（pg.settle 页面空闲时会提前返回，#141）
    const until = async (fn, n = 30) => { const t0 = Date.now(); while (Date.now() - t0 < n * 200) { try { if (await fn()) return true } catch (_) { } await new Promise(r => setTimeout(r, 100)) } return false };
    // 徽章 / 等级庆祝是时序偶发的全屏层，会盖住按钮（main a616692：buddies 在 CI 上 58 次「intercepts pointer events」超时）：点之前先去掉，同 buddies / verify 做法
    const noFx = () => pg.evaluate(() => { const f = document.getElementById('bdgFx'); if (f) f.remove() });
    const layerText = () => pg.evaluate(W => { const el = W ? document.querySelector('#mbg.show #modal') : document.querySelector('#sheet.show'); return el ? el.innerText.replace(/\s+/g, ' ') : '' }, W);
    const cardBtns = () => pg.evaluate(W => { const el = W ? document.querySelector('#mbg.show #modal') : document.querySelector('#sheet.show'); if (!el) return null;
      return { add: !!el.querySelector('[data-act="bdAdd"]'), wait: !!el.querySelector('.bd-wait'), buddy: /你们是球友/.test((el.querySelector('.bd-st') || {}).textContent || ''), del: !!el.querySelector('[data-act="bdDel"]') } }, W);
    const toastTxt = () => pg.evaluate(() => { const t = document.querySelector('#toast'); return t ? t.textContent : '' });
    const evs = k => pg.evaluate(k => (window.AN_LOG || []).filter(e => e.ev === k).map(e => e.props), k);
    const login = async () => { await until(async () => !!(await pg.$('#ph')), 25); await pg.fill('#ph', '0412 345 678'); await noFx(); await pg.click('[data-a="sendCode"]'); await pg.settle(400); await pg.fill('#otp', '123456');
      await pg.waitForFunction(() => typeof ME !== 'undefined' && ME && ME.name === 'Sam', null, { timeout: 10000 }).catch(() => { }); await pg.settle(400) };
    const land = async q => { await pg.goto('https://nanbanqiu.app/p/' + q); await pg.settle(300) };

    // —— 没登录扫码：先登录（不先去取卡），登录后回到这张卡
    await pg.goto('https://nanbanqiu.app/'); await pg.settle(300); S.now = await pg.evaluate(() => Date.now());
    await land('2001?s=qr&f=9001');
    if (!on) {
      T(tag('没登录扫码：走原来的路由，不弹登录、不取卡'), !(await pg.$('#ph')) && S.byNo.length === 0, S.log);
      await pg.evaluate(() => openAuth(null)); await login(); await land('2001?s=qr'); await pg.settle(600);
      T(tag('登录后扫码：不按编号取卡、卡片上没有加球友'), S.byNo.length === 0 && !(await pg.evaluate(() => !!document.querySelector('[data-act="bdAdd"]'))), S.log);
      T(tag('无脚本错误'), errs.length === 0, errs); await ctx.close(); continue }
    T(tag('没登录扫码：弹出登录，说明为什么'), await until(async () => /加 TA 为球友/.test(await layerText())), await layerText());
    T(tag('没登录时不去取卡'), S.byNo.length === 0, S.log);
    T(tag('埋点 buddy_scan_view（没登录）'), JSON.stringify(await evs('buddy_scan_view')) === JSON.stringify([{ target_uid: null, logged_in: false, source: 'qr' }]), await evs('buddy_scan_view'));
    await login();
    T(tag('登录后按编号取卡（GET /api/players/no/2001），打开 Xin 的卡'), await until(async () => /xin/i.test(await layerText())) && S.byNo.join() === '2001', [S.byNo, await layerText()]);
    T(tag('扫码进来的卡上有「加为球友」'), JSON.stringify(await cardBtns()) === JSON.stringify({ add: true, wait: false, buddy: false, del: false }), await cardBtns());
    T(tag('埋点 buddy_scan_view（登录后）'), (await evs('buddy_scan_view')).some(p => p.target_uid === X && p.logged_in === true && p.source === 'qr'), await evs('buddy_scan_view'));

    // —— 加为球友（真实点击）：POST 带来源 → 卡片「已发送，等 TA 确认」→ 清空内存 → 重读 → 还在
    await noFx(); await pg.click(W ? '#modal [data-act="bdAdd"]' : '#sheet [data-act="bdAdd"]');
    T(tag('POST /api/buddies/requests {to_user, source: qr}'), await until(async () => S.posts.length === 1) && S.posts[0].to_user === X && S.posts[0].source === 'qr', S.posts);
    T(tag('卡片变成「已发送，等 TA 确认」，有提示'), await until(async () => (await cardBtns() || {}).wait) && /已发送/.test(await toastTxt()), [await cardBtns(), await toastTxt()]);
    T(tag('埋点 buddy_request_send（pending）'), (await evs('buddy_request_send')).some(p => p.target_uid === X && p.result === 'pending' && p.err === null && p.source === 'qr'), await evs('buddy_request_send'));
    await pg.evaluate(async X => { BUDDY = { ok: false, list: [], incoming: [], outgoing: [] }; await nbqRefresh(); openCard(X) }, X); await pg.settle(300);
    T(tag('清空内存 → 重读 → 还是「已发送，等 TA 确认」'), (await cardBtns() || {}).wait === true, await cardBtns());

    // —— 普通方式打开球员卡：没有「加为球友」（远程拿不到入口）
    await pg.evaluate(P => openCard(P), P); await pg.settle(300);
    T(tag('普通方式打开 Pat 的卡：没有加球友按钮'), JSON.stringify(await cardBtns()) === JSON.stringify({ add: false, wait: false, buddy: false, del: false }), await cardBtns());

    // —— 对方先扫过我（分享链接进来）：直接成为球友；来源记 link
    S.incoming = [{ id: '30000000-0000-4000-8000-000000000001', from: Y }];
    await land('2002?s=moments'); await until(async () => /yan/i.test(await layerText()));
    await noFx(); await pg.click(W ? '#modal [data-act="bdAdd"]' : '#sheet [data-act="bdAdd"]');
    T(tag('互相扫了：来源 link，直接成为球友'), await until(async () => S.posts.length === 2) && S.posts[1].source === 'link' && await until(async () => /成为球友了/.test(await toastTxt())), [S.posts, await toastTxt()]);
    T(tag('卡片显示「你们是球友 · 删除球友」'), await until(async () => { const c = await cardBtns() || {}; return c.buddy && c.del && !c.add }), await cardBtns());

    // —— 删除球友：先确认 → DELETE → 不再是球友 → 重读 → 还是不是
    await noFx(); await pg.click(W ? '#modal [data-act="bdDel"]' : '#sheet [data-act="bdDel"]'); await pg.settle(300);
    T(tag('删除前确认：写明 TA 不会收到通知'), /删除球友 Yan.*TA 不会收到通知/.test(await layerText()), await layerText());
    await noFx(); await pg.click(W ? '#modal [data-act="bdDelYes"]' : '#sheet [data-act="bdDelYes"]');
    T(tag('DELETE /api/buddies/:uid'), await until(async () => S.dels.join() === Y), S.dels);
    T(tag('删除后：提示「TA 不会收到通知」'), await until(async () => /已删除，TA 不会收到通知/.test(await toastTxt())), await toastTxt());   // 提示在埋点之后，等到它再断言埋点（不抢跑）
    T(tag('删除后：卡片不再显示「你们是球友」'), await until(async () => { const c = await cardBtns() || {}; return !c.buddy && !c.del }), await cardBtns());
    T(tag('埋点 buddy_remove'), JSON.stringify(await evs('buddy_remove')) === JSON.stringify([{ target_uid: Y, played_together: false }]), [await evs('buddy_remove'), await pg.evaluate(() => window.__rej)]);
    await pg.evaluate(async () => { BUDDY = { ok: false, list: [], incoming: [], outgoing: [] }; await nbqRefresh() }); await pg.settle(200);
    T(tag('删除：清空内存 → 重读 → 不在球友里'), await pg.evaluate(Y => BUDDY.ok && !BUDDY.list.some(x => x.uid === Y), Y));

    // —— 编号不存在 / 扫自己的码
    await land('9999?s=qr');
    T(tag('编号不存在：提示没找到'), await until(async () => /没找到这位球友/.test(await toastTxt())), await toastTxt());
    await land('1288?s=qr'); await until(async () => /sam/i.test(await layerText()));
    T(tag('扫自己的码：只看卡，没有加球友'), (await cardBtns() || {}).add === false, await cardBtns());
    T(tag('无未处理的异步错误（await 里抛的错不算脚本错误，要单独看）'), (await pg.evaluate(() => window.__rej)).length === 0, await pg.evaluate(() => window.__rej));
    T(tag('无脚本错误'), errs.length === 0, errs); await ctx.close();
  }
  await b.close(); console.log(`buddies_scan: ${pass} 通过, ${fail} 失败`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1) });
