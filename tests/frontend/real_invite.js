// 5g-3 前台接入第 6 轮（6a）：邀约在真实模式（nanbanqiu.app）走接口（两端，假 Supabase + 有状态的假 /api）：
//   收到邀约：接受 · 换个时间 · 婉拒（原因）· 撤回；发邀约（含失败的错误码提示）；邀约类通知读入。
//   流程：先调接口 → 成功后重新读入 → 页面以服务器为准；点击走真实的 data-a 事件处理，不是直接调函数
const { waitUntil } = require('../lib/wait');
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const DIR = process.env.NBQ_DIR || path.join(__dirname, '..', '..');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 600) : '')) };
const SB = 'https://xosrdkrkfxkdrwldfhac.supabase.co';
const U = c => `${c.repeat(8)}-${c.repeat(4)}-4${c.repeat(3)}-8${c.repeat(3)}-${c.repeat(12)}`;
const V1 = U('1'), ME = U('a'), HOST = U('b'), I1 = U('2'), I2 = U('3'), I3 = U('4'), I4 = U('5'), G3 = U('f');
const card = (id, n, no) => ({ id, member_no: no, nickname: n, last_initial: 'W', utr: 5.5, avatar_kind: 'letter', avatar_animal: null, avatar_color: 'paper', seal_roll: 3, card_theme: 'court', played: 4, hosted: 1, kudos: 2, level: 'fresh', gone: false });
const VENUES = [{ id: V1, name: 'Test Tennis Club', short_name: 'Test TC', suburb: 'Malvern', surfaces: ['hard'], courts: 4, lights: true, indoor: false, booking_url: null, lat: -37.86, lng: 145.03 }];
let BASE = Date.now();   // 页面的时钟（测试里页面时间是固定的），服务器的时间都以它为准
// 「第 k 天 h:m」按页面的时区算（和 tests/lib/preload.js 一致），不按跑测试那台机器的时区：本机是 UTC 时差 11 小时，读入断言会错
const TZ = process.env.NBQ_TZ || 'Australia/Melbourne';
const wall = t => { const p = {}; for (const x of new Intl.DateTimeFormat('en-US', { timeZone: TZ, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' }).formatToParts(t)) p[x.type] = +x.value; return p };
const at = (k, h, m = 0) => { const d = wall(BASE), w = Date.UTC(d.year, d.month - 1, d.day + k, h, m); let t = w; for (let i = 0; i < 2; i++) { const x = wall(t); t += w - Date.UTC(x.year, x.month - 1, x.day, x.hour, x.minute) } return new Date(t).toISOString() };
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  for (const f of ['南伴球_PWA.html', '南伴球_Web.html']) {
    const W = f.includes('Web'), ctx = await b.newContext({ viewport: W ? { width: 1360, height: 860 } : { width: 390, height: 844 } });
    const pg = await ctx.newPage(), errs = []; pg.on('pageerror', e => errs.push(e.message + ' @ ' + String(e.stack).split('\n').slice(1, 3).join('|')));
    const tag = s => `${f} ${s}`;
    const inv = (id, from, to, k, h, extra = {}) => ({ id, from_user: from, to_user: to, starts_at: at(k, h), ends_at: at(k, h + 1, 30), venue_id: V1, venue_name: null, game_type: 'singles', note: '', status: 'pending', counter_starts_at: null, counter_ends_at: null, counter_venue_id: null, counter_venue_name: null, countered_at: null, game_id: null, created_at: new Date(BASE - 36e5).toISOString(), expires_at: new Date(BASE + 47 * 36e5).toISOString(), responded_at: null, decline_reason: null, decline_note: null, ...extra });
    const S = { me: { id: ME, member_no: 1288, nickname: 'Sam', last_initial: 'L', utr: 5, utr_estimated: false, avatar_kind: 'letter', avatar_animal: null, avatar_color: 'paper', card_theme: 'court', created_at: new Date().toISOString(), gender: null, club_ids: [], pact_accepted_at: new Date().toISOString() },
      invs: [], notifs: [], fail: null, log: [], bodies: {} };
    const find = id => S.invs.find(x => x.id === id);
    const gameG3 = () => ({ id: G3, share_code: 'Pv01', host_id: HOST, host_nickname: 'Host', host_utr: 5.5, venue_id: V1, venue_name: 'Test Tennis Club', short_name: 'Test TC', starts_at: at(1, 9), duration_min: 90, game_type: 'singles', capacity: 2, utr_min: 4, utr_max: 6.5, note: '', status: 'full', tags: [], visibility: 'private', filled: 0, join_mode: 'approve', city: 'melb', approved_count: 2, pending_count: 0, spots_left: 0 });
    await pg.route('https://nanbanqiu.app/**', async r => { const u = new URL(r.request().url()); if (!u.pathname.startsWith('/api/')) return r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: fs.readFileSync(path.join(DIR, f)) });
      const m = r.request().method(), p = u.pathname, pd = r.request().postData(), body = pd ? JSON.parse(pd) : null; const J = (s, d) => r.fulfill({ status: s, contentType: 'application/json', body: JSON.stringify(d) });
      if (m !== 'GET' && p !== '/api/events') { S.log.push(m + ' ' + p.replace(/[0-9a-f]{8}-[0-9a-f-]{27}/g, x => ({ [I1]: 'I1', [I2]: 'I2', [I3]: 'I3', [I4]: 'I4', [ME]: 'ME' })[x] || x)); S.bodies[m + ' ' + p] = body }
      if (m === 'GET') {
        if (p === '/api/venues') return J(200, { venues: VENUES });
        if (p === '/api/me') return J(200, { registered: true, user: S.me });
        if (p === '/api/games') return J(200, { games: S.invs.some(i => i.game_id) ? [gameG3()] : [] });
        if (p === '/api/games/mine') { const has = S.invs.some(i => i.game_id); return J(200, { games: has ? [gameG3()] : [], participants: has ? [{ game_id: G3, user_id: HOST, role: 'host', status: 'approved', created_at: at(0, 1), message: '' }, { game_id: G3, user_id: ME, role: 'player', status: 'approved', created_at: at(0, 1), message: '' }] : [], profiles: { [HOST]: card(HOST, 'Host', 1200) } }) }
        if (p === '/api/invites') return J(200, { invites: S.invs, profiles: { [HOST]: card(HOST, 'Host', 1200) } });
        if (p === '/api/notifications') return J(200, { notifications: S.notifs });
        if (p === '/api/profiles') return J(200, { profiles: { [HOST]: card(HOST, 'Host', 1200) } });
        return J(404, { error: 'not_found' }) }
      if (p === '/api/me/pact') return J(200, { ok: true });
      if (p === '/api/invites') { if (S.fail) return J(429, { error: S.fail }); S.invs.push(inv(U('6'), ME, body.to_user, 5, 9)); return J(201, { id: U('6') }) }
      const mm = /^\/api\/invites\/([^/]+)\/(\w+)$/.exec(p); if (mm) { const i = find(mm[1]), a = mm[2]; if (!i) return J(404, { error: 'not_found' });
        if (a === 'accept') { i.status = 'accepted'; i.game_id = G3; return J(200, { game_id: G3 }) }
        if (a === 'decline') { i.status = 'declined'; i.decline_reason = body.reason; i.decline_note = body.note || null; return J(200, { ok: true }) }
        if (a === 'counter') { i.status = 'counter'; i.countered_at = new Date().toISOString(); i.counter_starts_at = body.starts_at; i.counter_ends_at = body.ends_at; i.counter_venue_id = body.venue_id || null; return J(200, { ok: true }) }
        if (a === 'withdraw') { i.status = 'withdrawn'; return J(200, { status: 'withdrawn' }) } }
      return J(404, { error: 'not_found' }) });
    await pg.route(SB + '/**', r => { const u = r.request().url(); const v = u.includes('/verify');
      r.fulfill({ status: v ? 200 : 204, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: v ? JSON.stringify({ access_token: 'AT', refresh_token: 'RT', expires_in: 3600, user: { id: 'sb-1', phone: '61412345678' } }) : '' }) });
    await pg.route('https://cdnjs.cloudflare.com/**', r => r.abort()); await pg.route('https://basemaps.cartocdn.com/**', r => r.abort());
    const toasts = () => pg.evaluate(() => document.querySelector('#toast') && document.querySelector('#toast').textContent);
    const inv1 = id => pg.evaluate(i => { const x = INVITES.find(v => v.id === i); return x && { status: x.status, o: x.o, t: x.t, e: x.e, no: x.no, noNote: x.noNote, counter: x.counter, game_id: x.game_id, venue_id: x.venue_id } }, id);
    const tap = async sel => { await pg.click(sel); await pg.settle(700) };
    const until = fn => waitUntil(pg, fn);   // tests/lib/wait.js：按真实时间等，不按次数
    const st = (id, v) => until(async () => { const x = await inv1(id); return x && x.status === v });

    await pg.goto('https://nanbanqiu.app/'); await pg.settle(600);
    BASE = await pg.evaluate(() => Date.now()); S.invs = [inv(I1, HOST, ME, 1, 9, { note: '周六打一盘' }), inv(I2, HOST, ME, 2, 10), inv(I3, HOST, ME, 3, 11), inv(I4, ME, HOST, 4, 8)];
    await pg.evaluate(() => { openAuth(null) }); await pg.settle(300); await pg.fill('#ph', '0412 345 678'); await pg.click('[data-a="sendCode"]'); await pg.settle(400); await pg.fill('#otp', '123456'); await pg.waitForFunction(() => ME && INVITES.length === 4, null, { timeout: 10000 }).catch(() => { }); await pg.settle(200);
    const a = await inv1(I1);
    T(tag('登录后读入：4 条邀约，时间换成「第几天 + 时:分」'), (await pg.evaluate(() => INVITES.length)) === 4 && a && a.status === 'pending' && a.o === 1 && a.t === '09:00' && a.e === '10:30' && a.venue_id === V1, a);

    // 接受
    await pg.settle(900); await pg.evaluate(i => openInvite(i), I1); await pg.settle(400);
    T(tag('邀约卡：显示对方、时间和备注'), await pg.evaluate(() => /Host/.test(document.body.innerText) && /周六打一盘/.test(document.body.innerText)));
    S.log.length = 0; await tap('[data-iv="accept"]'); await st(I1, 'accepted');
    T(tag('接受：POST accept，读入后邀约已成立并带球局'), S.log.join() === 'POST /api/invites/I1/accept' && (await inv1(I1)).status === 'accepted' && (await inv1(I1)).game_id === G3, [S.log, await inv1(I1)]);
    T(tag('接受：本地球局表里有新的私人球局'), await pg.evaluate(g => GAMES.some(x => x.id === g), G3));
    await pg.evaluate(() => { try { INV_CLOSE() } catch (e) { } try { closeSheet() } catch (e) { } }); await pg.settle(300);

    // 婉拒（原因 + 一句话）
    await pg.settle(900); await pg.evaluate(i => openInvite(i), I2); await pg.settle(400); await tap('[data-iv="decline"]');
    await pg.fill('#ivNote', '改天'); S.log.length = 0; await tap('[data-iv="noGo"][data-v="rest"]'); await st(I2, 'declined');
    T(tag('婉拒：POST decline，原因和一句话原样带上'), S.log.join() === 'POST /api/invites/I2/decline' && S.bodies[`POST /api/invites/${I2}/decline`].reason === 'rest' && S.bodies[`POST /api/invites/${I2}/decline`].note === '改天', [S.log, S.bodies]);
    T(tag('婉拒：读入后状态是已婉拒'), (await inv1(I2)).status === 'declined' && (await inv1(I2)).no === 'rest');

    // 换个时间
    await pg.settle(900); await pg.evaluate(i => openInvite(i), I3); await pg.settle(400); await tap('[data-iv="counter"]');
    await pg.evaluate(() => { IVF.t = '18:00'; setEnd(IVF); IVF.per = perOf('18:00'); drawInviteForm() }); await pg.settle(200);
    S.log.length = 0; await tap('[data-iv="sendCounter"]'); await st(I3, 'counter');
    const cb = S.bodies[`POST /api/invites/${I3}/counter`];
    T(tag('换时间：POST counter，带新的开始 / 结束时间和场地'), S.log.join() === 'POST /api/invites/I3/counter' && cb && (await pg.evaluate(b => [new Date(b.starts_at).getHours(), new Date(b.ends_at).getHours()].join(), cb)) === '18,19' && cb.venue_id === V1, [S.log, cb]);
    const c3 = await inv1(I3);
    T(tag('换时间：读入后是「等对方确认」，新时间 18:00'), c3.status === 'counter' && c3.counter && c3.counter.t === '18:00', c3);

    // 撤回自己发的邀约
    await pg.settle(900); await pg.evaluate(i => openInvite(i), I4); await pg.settle(400); S.log.length = 0; await tap('[data-iv="withdraw"]'); await st(I4, 'withdrawn');
    T(tag('撤回：POST withdraw，读入后已撤回'), S.log.join() === 'POST /api/invites/I4/withdraw' && (await inv1(I4)).status === 'withdrawn', [S.log, await inv1(I4)]);

    // 发邀约：失败（错误码提示、表单还在）→ 成功
    await pg.evaluate(h => { newInvite(h); IVF.venue_id = null }, HOST); await pg.settle(300);
    await pg.evaluate(v => { IVF.venue_id = v; IVF.note = '带球拍'; IVF.t = '09:00'; setEnd(IVF); IVF.o = 5; IVF.per = perOf('09:00'); drawInviteForm() }, V1); await pg.settle(200);
    S.fail = 'invite_daily_limit'; S.log.length = 0; await tap('[data-iv="send"]');
    T(tag('发邀约失败（每天上限）：提示对应文字，表单还在'), /今天已经发出 3 个邀约/.test(await toasts()) && (await pg.evaluate(() => !!IVF)), await toasts());
    S.fail = null; S.log.length = 0; await tap('[data-iv="send"]'); await until(() => pg.evaluate(() => INVITES.length === 5));
    const sb = S.bodies['POST /api/invites'], sh = await pg.evaluate(b => [new Date(b.starts_at).getHours(), new Date(b.ends_at).getHours(), new Date(b.ends_at).getMinutes()], sb);   // 用页面的时区算
    T(tag('发邀约：POST，对方 / 时间 / 场地 / 玩法 / 备注都带上'), S.log.join() === 'POST /api/invites' && sb.to_user === HOST && sb.venue_id === V1 && sb.game_type === 'singles' && sb.note === '带球拍' && sh.join() === '9,10,30', [S.log, sb, sh]);
    T(tag('发邀约：读入后多一条我发出的，并显示「邀约已发送」'), (await pg.evaluate(() => INVITES.some(i => i.from === ME.id && i.status === 'pending'))) && /邀约已发送/.test(await pg.evaluate(() => document.body.innerText)));

    // 邀约类通知
    S.notifs = [{ id: '31', kind: 'invite', game_id: null, invite_id: I1, actor_id: HOST, read_at: null, created_at: new Date().toISOString() }, { id: '30', kind: 'invite_declined', game_id: null, invite_id: 'zzzzzzzz-0000-4000-8000-000000000000', actor_id: HOST, read_at: null, created_at: new Date().toISOString() }];
    await pg.evaluate(() => nbqPullNotifs()); await until(() => pg.evaluate(() => NOTIFS.length > 0));
    const nn = await pg.evaluate(() => NOTIFS.map(n => n.kind + ':' + n.invite_id));
    T(tag('通知：邀约类读入（带 invite_id），找不到邀约的不显示'), nn.length === 1 && nn[0] === 'invite:' + I1, nn);
    T(tag('全程没有页面报错'), errs.length === 0, errs);
    await ctx.close();
  }
  await b.close(); console.log(`\nreal_invite: ${pass} 通过, ${fail} 失败`); process.exit(fail ? 1 : 0);
})();
