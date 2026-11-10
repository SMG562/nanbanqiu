// 5g-3 前台接入第 6 轮（6b）：聊天在真实模式（nanbanqiu.app）走接口（两端，假 Supabase + 有状态的假 /api）：
//   会话列表读入（最后一句 / 未读）· 点开读消息并标已读 · 发消息（失败提示、输入框保留）· 新消息轮询（输入到一半的字保留）· 球局群聊首次点开才在服务器建。
//   流程：先调接口 → 成功后重新读入 → 页面以服务器为准；点击走真实的 data-a 事件处理，不是直接调函数
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const DIR = process.env.NBQ_DIR || path.join(__dirname, '..', '..');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 600) : '')) };
const SB = 'https://xosrdkrkfxkdrwldfhac.supabase.co';
const U = c => `${c.repeat(8)}-${c.repeat(4)}-4${c.repeat(3)}-8${c.repeat(3)}-${c.repeat(12)}`;
const V1 = U('1'), ME = U('a'), HOST = U('b'), T1 = U('2'), T2 = U('3'), G1 = U('c');
const card = (id, n, no) => ({ id, member_no: no, nickname: n, last_initial: 'W', utr: 5.5, avatar_kind: 'letter', avatar_animal: null, avatar_color: 'paper', seal_roll: 3, card_theme: 'court', played: 4, hosted: 1, kudos: 2, level: 'fresh', gone: false });
const VENUES = [{ id: V1, name: 'Test Tennis Club', short_name: 'Test TC', suburb: 'Malvern', surfaces: ['hard'], courts: 4, lights: true, indoor: false, booking_url: null, lat: -37.86, lng: 145.03 }];
let BASE = Date.now();
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  for (const f of ['南伴球_PWA.html', '南伴球_Web.html']) {
    const W = f.includes('Web'), ctx = await b.newContext({ viewport: W ? { width: 1360, height: 860 } : { width: 390, height: 844 } });
    const pg = await ctx.newPage(), errs = []; pg.on('pageerror', e => errs.push(e.message + ' @ ' + String(e.stack).split('\n').slice(1, 3).join('|')));
    const tag = s => `${f} ${s}`;
    const S = { me: { id: ME, member_no: 1288, nickname: 'Sam', last_initial: 'L', utr: 5, utr_estimated: false, avatar_kind: 'letter', avatar_animal: null, avatar_color: 'paper', card_theme: 'court', created_at: new Date().toISOString(), gender: null, club_ids: [], pact_accepted_at: new Date().toISOString() },
      msgs: { [T1]: [] }, t1read: false, t2: false, fail: null, log: [], bodies: {}, msgGets: 0, nextId: 100 };
    const iso = h => new Date(BASE + h * 36e5).toISOString();
    const game = () => ({ id: G1, share_code: 'Ab3k', host_id: HOST, host_nickname: 'Host', host_utr: 5.5, venue_id: V1, venue_name: 'Test Tennis Club', short_name: 'Test TC', starts_at: iso(30), duration_min: 90, game_type: 'doubles', capacity: 4, utr_min: 4, utr_max: 6.5, note: '', status: 'open', tags: [], visibility: 'public', filled: 0, join_mode: 'approve', city: 'melb', approved_count: 2, pending_count: 0, spots_left: 2 });
    const parts = () => [{ game_id: G1, user_id: HOST, role: 'host', status: 'approved', created_at: iso(-5), message: '' }, { game_id: G1, user_id: ME, role: 'player', status: 'approved', created_at: iso(-4), message: '' }];
    const threads = () => { const m = S.msgs[T1], l = m[m.length - 1];
      return [{ id: T1, kind: 'dm', game_id: null, other_id: HOST, last_body: l ? l.body : null, last_at: l ? l.created_at : null, last_sender: l ? l.sender_id : null, unread: !!l && l.sender_id !== ME && !S.t1read },
        ...(S.t2 ? [{ id: T2, kind: 'game', game_id: G1, other_id: null, last_body: null, last_at: null, last_sender: null, unread: false }] : [])] };
    await pg.route('https://nanbanqiu.app/**', async r => { const u = new URL(r.request().url()); if (!u.pathname.startsWith('/api/')) return r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: fs.readFileSync(path.join(DIR, f)) });
      const m = r.request().method(), p = u.pathname, pd = r.request().postData(), body = pd ? JSON.parse(pd) : null; const J = (s, d) => r.fulfill({ status: s, contentType: 'application/json', body: JSON.stringify(d) });
      if (m !== 'GET' && p !== '/api/events') { S.log.push(m + ' ' + p.replace(/[0-9a-f]{8}-[0-9a-f-]{27}/g, x => ({ [T1]: 'T1', [T2]: 'T2', [ME]: 'ME' })[x] || x)); S.bodies[m + ' ' + p] = body }
      if (m === 'GET') {
        if (p === '/api/venues') return J(200, { venues: VENUES });
        if (p === '/api/me') return J(200, { registered: true, user: S.me });
        if (p === '/api/games') return J(200, { games: [game()] });
        if (p === '/api/games/mine') return J(200, { games: [game()], participants: parts(), profiles: { [HOST]: card(HOST, 'Host', 1200) } });
        if (p === '/api/invites') return J(200, { invites: [], profiles: {} });
        if (p === '/api/notifications') return J(200, { notifications: [] });
        if (p === '/api/profiles') return J(200, { profiles: { [HOST]: card(HOST, 'Host', 1200) } });
        if (p === '/api/threads') return J(200, { threads: threads() });
        if (p === `/api/threads/${T1}/messages`) { S.msgGets++; return J(200, { messages: S.msgs[T1] }) }
        if (p === `/api/threads/${T2}/messages`) return J(200, { messages: [] });
        return J(404, { error: 'not_found' }) }
      if (p === '/api/me/pact') return J(200, { ok: true });
      if (p === '/api/threads') { if (body.game_id === G1) { S.t2 = true; return J(200, { id: T2 }) } return J(200, { id: T1 }) }
      if (p === `/api/threads/${T1}/read`) { S.t1read = true; return J(200, { ok: true }) }
      if (p === `/api/threads/${T2}/read`) return J(200, { ok: true });
      if (p === `/api/threads/${T1}/messages`) { if (S.fail) return J(429, { error: S.fail }); const id = ++S.nextId; S.msgs[T1].push({ id, sender_id: ME, body: body.body, created_at: new Date(BASE).toISOString() }); return J(200, { id }) }
      return J(404, { error: 'not_found' }) });
    await pg.route(SB + '/**', r => { const u = r.request().url(); const v = u.includes('/verify');
      r.fulfill({ status: v ? 200 : 204, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: v ? JSON.stringify({ access_token: 'AT', refresh_token: 'RT', expires_in: 3600, user: { id: 'sb-1', phone: '61412345678' } }) : '' }) });
    await pg.route('https://cdnjs.cloudflare.com/**', r => r.abort()); await pg.route('https://basemaps.cartocdn.com/**', r => r.abort());
    const toasts = () => pg.evaluate(() => document.querySelector('#toast') && document.querySelector('#toast').textContent);
    const until = fn => pg.until(fn, 20 * 300);   // 按真实时间等（pg.until，tests/lib/preload 第 8 条）
    const msgsText = () => pg.evaluate(() => (document.getElementById('cxMsgs') || {}).innerText || '');

    await pg.goto('https://nanbanqiu.app/'); await pg.settle(600);
    BASE = await pg.evaluate(() => Date.now());
    S.msgs[T1] = [{ id: 1, sender_id: ME, body: '周六见', created_at: iso(-3) }, { id: 2, sender_id: HOST, body: '好的，我订场', created_at: iso(-2) }];
    await pg.evaluate(() => { openAuth(null) }); await pg.settle(300); await pg.fill('#ph', '0412 345 678'); await pg.click('[data-a="sendCode"]'); await pg.settle(400); await pg.fill('#otp', '123456');
    await until(() => pg.evaluate(() => ME && THREADS.length === 1));
    T(tag('登录后读入会话列表：一个私信，最后一句和未读来自服务器'), await pg.evaluate(() => THREADS.length === 1 && lastMsg(THREADS[0]).text === '好的，我订场' && chatUnread() === 1), await pg.evaluate(() => [THREADS.length, chatUnread()]));
    T(tag('收件箱里能看到最后一句'), await pg.evaluate(() => /好的，我订场/.test(inboxHTML())));

    // 点开：读消息、标已读
    S.log.length = 0; await pg.evaluate(t => openThread(t), T1); await until(() => pg.evaluate(() => !!document.getElementById('cxMsgs')));
    T(tag('点开：读到 2 条消息并显示'), /周六见/.test(await msgsText()) && /好的，我订场/.test(await msgsText()), await msgsText());
    T(tag('点开：POST read 标已读，未读清零'), S.log.includes('POST /api/threads/T1/read') && (await pg.evaluate(() => chatUnread())) === 0, S.log);

    // 发消息
    S.log.length = 0; await pg.fill('#cxIn', '我带球'); await pg.click('[data-cx="send"]'); await until(() => msgsText().then(t => /我带球/.test(t)));
    T(tag('发消息：POST，内容原样；成功后才显示，输入框清空'), S.log.join() === 'POST /api/threads/T1/messages' && S.bodies[`POST /api/threads/${T1}/messages`].body === '我带球' && /我带球/.test(await msgsText()) && (await pg.inputValue('#cxIn')) === '', [S.log, await msgsText()]);
    // 失败：太快了
    S.fail = 'message_too_fast'; await pg.fill('#cxIn', '再发一条'); await pg.click('[data-cx="send"]'); await pg.settle(700);
    T(tag('发消息失败（太快）：提示对应文字，消息不显示，输入框里的字还在'), (await toasts()) === (await pg.evaluate(() => apiErrText('message_too_fast'))) && !/再发一条/.test(await msgsText()) && (await pg.inputValue('#cxIn')) === '再发一条', [await toasts(), await msgsText()]);
    S.fail = null;
    // 新消息轮询：输入一半的字保留
    S.msgs[T1].push({ id: 50, sender_id: HOST, body: '我到了', created_at: iso(0) });
    await pg.evaluate(() => nbqChatLive()); await until(() => msgsText().then(t => /我到了/.test(t)));
    T(tag('轮询：对方的新消息出现，输入到一半的字保留'), /我到了/.test(await msgsText()) && (await pg.inputValue('#cxIn')) === '再发一条', [await msgsText(), await pg.inputValue('#cxIn')]);

    // 球局群聊：第一次点开才在服务器建
    await pg.evaluate(() => { try { CX_CLOSE() } catch (e) { } }); await pg.settle(500);
    S.log.length = 0; await pg.evaluate(g => openThread(gameThread(g, true).id), G1); await until(() => pg.evaluate(() => THREADS.length > 0 && !THREADS.some(t => t.tmp)));
    T(tag('球局群聊：POST /api/threads 带球局，建好后能打开'), S.log[0] === 'POST /api/threads' && S.bodies['POST /api/threads'].game_id === G1 && (await pg.evaluate(() => THREADS.some(t => t.type === 'game' && t.id !== undefined && !t.tmp && t.srv))), [S.log, await pg.evaluate(() => THREADS.map(t => [t.id, t.type, !!t.tmp]))]);
    // 点新消息的推送（地址带 ?t=会话&n=通知&k=chat）：直接打开那个会话，不去通知页
    await pg.evaluate(() => { try { CX_CLOSE() } catch (e) { } }); await pg.settle(400); S.log.length = 0;
    await pg.goto('https://nanbanqiu.app/?t=' + T1 + '&n=9&k=chat'); await pg.settle(600);
    if (!(await pg.evaluate(() => !!ME))) { await pg.evaluate(() => { openAuth(null) }); await pg.settle(300); await pg.fill('#ph', '0412 345 678'); await pg.click('[data-a="sendCode"]'); await pg.settle(400); await pg.fill('#otp', '123456') }
    await until(() => pg.evaluate(() => !!document.getElementById('cxMsgs') && /周六见/.test(document.getElementById('cxMsgs').innerText)));
    T(tag('点新消息的推送：直接打开那个会话（看到消息），不去通知页'), /周六见/.test(await msgsText()) && !(await pg.evaluate(() => UI.msgTab === 'ntf' && !document.getElementById('cxMsgs'))), await msgsText());
    T(tag('全程没有页面报错'), errs.length === 0, errs);
    await ctx.close();
  }
  await b.close(); console.log(`\nreal_chat: ${pass} 通过, ${fail} 失败`); process.exit(fail ? 1 : 0);
})();
