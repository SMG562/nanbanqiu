// 退出登录时正在进行的读取（11-09，#110 PR-B1 测试里抓到）：读到一半退出登录，数据回来后不能再套用上去。
//   ① nbqRefresh（整体重读）途中退出 → 回来后 ME 仍是空、USERS 里没有这个人、个人页不出现他的数据
//   ② nbqPullNotifs（读通知）途中退出 → 不报脚本错误（原来 ME.id 读空值）、NOTIFS 仍是空
//   两端各走一遍；再登录回来一切照常（不误伤正常读取）。
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const DIR = process.env.NBQ_DIR || path.join(__dirname, '..', '..');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 600) : '')) };
const SB = 'https://xosrdkrkfxkdrwldfhac.supabase.co', ME = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', V1 = '11111111-1111-4111-8111-111111111111', G1 = '99999999-9999-4999-8999-999999999999';
const VENUES = [{ id: V1, name: 'Test Tennis Club', short_name: 'Test TC', suburb: 'Malvern', surfaces: ['hard'], courts: 4, lights: true, indoor: false, booking_url: null, lat: -37.86, lng: 145.03 }];
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  for (const f of ['南伴球_PWA.html', '南伴球_Web.html']) {
    const W = f.includes('Web'), tag = s => `${W ? 'Web' : 'PWA'} ${s}`;
    const ctx = await b.newContext({ viewport: W ? { width: 1360, height: 860 } : { width: 390, height: 844 } });
    const pg = await ctx.newPage(), errs = []; pg.on('pageerror', e => errs.push(e.message + ' @ ' + String(e.stack).split('\n').slice(1, 3).join('|')));
    const S = { slowMine: 0, slowNtf: 0, now: 0,
      me: { id: ME, member_no: 1288, nickname: 'Sam', last_initial: 'L', utr: 5, utr_estimated: false, avatar_kind: 'letter', avatar_animal: null, avatar_color: 'paper', card_theme: 'court', created_at: '2026-01-01T00:00:00Z', gender: null, club_ids: [], pact_accepted_at: '2026-01-01T00:00:00Z' } };
    const iso = h => new Date(S.now + h * 3600e3).toISOString();
    const game = () => ({ id: G1, share_code: 'Rc3e', host_id: ME, host_nickname: 'Sam', host_utr: 5, venue_id: V1, venue_name: 'Test Tennis Club', short_name: 'Test TC', starts_at: iso(30), duration_min: 90, game_type: 'singles', capacity: 2, utr_min: 3, utr_max: 7,
      note: '只有 Sam 看得到的局', status: 'open', tags: [], visibility: 'public', filled: 1, join_mode: 'approve', city: 'melb', approved_count: 1, pending_count: 0, spots_left: 1 });
    await pg.route('https://nanbanqiu.app/**', async r => { const u = new URL(r.request().url()); if (!u.pathname.startsWith('/api/')) return r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: fs.readFileSync(path.join(DIR, f)) });
      const m = r.request().method(), p = u.pathname; const J = (s, d) => r.fulfill({ status: s, contentType: 'application/json', body: JSON.stringify(d) });
      if (m !== 'GET') return J(200, { ok: true });
      if (p === '/api/venues') return J(200, { venues: VENUES });
      if (p === '/api/me') return J(200, { registered: true, user: S.me });
      if (p === '/api/games') return J(200, { games: [] });
      if (p === '/api/games/mine') { if (S.slowMine) await new Promise(x => setTimeout(x, S.slowMine));
        return J(200, { games: [game()], participants: [{ game_id: G1, user_id: ME, role: 'host', status: 'approved', created_at: iso(-1), message: '' }], profiles: { [ME]: S.me } }) }
      if (p === '/api/invites') return J(200, { invites: [], profiles: {} });
      if (p === '/api/notifications') { if (S.slowNtf) await new Promise(x => setTimeout(x, S.slowNtf));
        return J(200, { notifications: [{ id: 5, kind: 'joined', game_id: G1, invite_id: null, actor_id: null, read_at: null, created_at: iso(-0.5) }] }) }
      return J(404, { error: 'not_found' }) });
    await pg.route(SB + '/**', r => { const v = r.request().url().includes('/verify');
      r.fulfill({ status: v ? 200 : 204, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: v ? JSON.stringify({ access_token: 'AT', refresh_token: 'RT', expires_in: 3600, user: { id: 'sb-1', phone: '61412345678' } }) : '' }) });
    await pg.route('https://cdnjs.cloudflare.com/**', r => r.abort()); await pg.route('https://basemaps.cartocdn.com/**', r => r.abort());
    const login = async () => { await pg.evaluate(() => { openAuth(null) }); await pg.settle(300); await pg.fill('#ph', '0412 345 678'); await pg.click('[data-a="sendCode"]'); await pg.settle(400); await pg.fill('#otp', '123456');
      await pg.waitForFunction(() => typeof ME !== 'undefined' && ME && ME.name === 'Sam', null, { timeout: 10000 }).catch(() => { }); await pg.settle(600) };
    const state = () => pg.evaluate(id => ({ me: !!ME, user: !!USERS[id], game: GAMES.some(g => g.note === '只有 Sam 看得到的局'), notifs: NOTIFS.length, page: /只有 Sam 看得到的局/.test(document.body.innerText) }), ME);

    await pg.goto('https://nanbanqiu.app/'); await pg.settle(600); S.now = await pg.evaluate(() => Date.now());
    await login();
    T(tag('登录后读到了自己的球局（前提）'), (await state()).game, await state());

    // ① 整体重读途中退出
    S.slowMine = 1500; await pg.evaluate(() => { nbqRefresh() }); await pg.settle(200);
    await pg.evaluate(() => { sbaLogout(); render() }); await pg.waitForTimeout(2500); await pg.settle(300);
    let s = await state();
    T(tag('重读途中退出：回来后不再套用（没有登录、没有这个人、没有他的球局、页面上看不到）'), !s.me && !s.user && !s.game && !s.page, s);
    S.slowMine = 0;

    // ② 读通知途中退出
    await login(); S.slowNtf = 1500; await pg.evaluate(() => { nbqPullNotifs() }); await pg.settle(200);
    await pg.evaluate(() => { sbaLogout(); render() }); await pg.waitForTimeout(2500); await pg.settle(300);
    s = await state();
    T(tag('读通知途中退出：没有通知、没有登录'), !s.me && s.notifs === 0, s);
    T(tag('读通知途中退出：不报脚本错误'), errs.length === 0, errs);
    S.slowNtf = 0;

    // 不误伤：再登录，读取和通知照常
    await login(); await pg.evaluate(() => nbqPullNotifs()); await pg.settle(300); s = await state();
    T(tag('再登录：球局和通知都照常读入'), s.me && s.game && s.notifs === 1, s);
    T(tag('无脚本错误'), errs.length === 0, errs); await ctx.close();
  }
  await b.close(); console.log(`logout_race: ${pass} 通过, ${fail} 失败`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1) });
