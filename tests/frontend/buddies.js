// 球友（#110 PR-B1）：真实模式（nanbanqiu.app + 假 Supabase + 有状态的假 /api），两端 × 开关开 / 关，点真实按钮走一遍入口清单：
//   读入（GET /api/buddies，卡片进 USERS）→ 个人页「我的球友」= 待确认行 + 扫码球友 + 只打过 1 场的人（少遇到不显示）；
//   确认（POST …/accept）/ 忽略（POST …/ignore）：断言请求、页面（DOM）和「清空内存 → 重读 → 还在」；处理失败（已失效）：提示 + 以服务器为准；
//   通知：buddy_request 文案、处理前保持未读（待处理）、点开 = 确认页；buddy_accepted 点开 = 球员卡；开关关着时这两种通知不显示；
//   刷新：先画快照里的（不先少一块）；昵称转义；全部球友列表；退出登录：清掉（换人登录看不到上一个人的球友）。
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const DIR = process.env.NBQ_DIR || path.join(__dirname, '..', '..');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 600) : '')) };
const SB = 'https://xosrdkrkfxkdrwldfhac.supabase.co', ME = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', V1 = '11111111-1111-4111-8111-111111111111', G1 = '99999999-9999-4999-8999-999999999999';
const X = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', Y = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', Z = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', P = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', L = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
const RX = '10000000-0000-4000-8000-000000000001', RY = '10000000-0000-4000-8000-000000000002';
const VENUES = [{ id: V1, name: 'Test Tennis Club', short_name: 'Test TC', suburb: 'Malvern', surfaces: ['hard'], courts: 4, lights: true, indoor: false, booking_url: null, lat: -37.86, lng: 145.03 }];
const card = (id, nick, no) => ({ id, member_no: no, nickname: nick, last_initial: 'K', utr: 5, avatar_kind: 'letter', avatar_animal: null, avatar_color: 'paper', seal_roll: 0, card_theme: 'court', card_venue_id: null, played: 3, hosted: 1, kudos: 0, level: 1, gone: false });
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  for (const f of ['南伴球_PWA.html', '南伴球_Web.html']) for (const on of [true, false]) {
    const W = f.includes('Web'), tag = s => `${W ? 'Web' : 'PWA'}${on ? '' : '（开关关）'} ${s}`;
    const ctx = await b.newContext({ viewport: W ? { width: 1360, height: 860 } : { width: 390, height: 844 } });
    const pg = await ctx.newPage(), errs = []; pg.on('pageerror', e => errs.push(e.message + ' @ ' + String(e.stack).split('\n').slice(1, 3).join('|')));
    if (on) await pg.addInitScript(() => { try { localStorage.setItem('nbq_ff_buddies', '1') } catch (_) { } });
    const S = { now: 0, log: [], posts: [], bdGets: 0, failNext: null, slowMe: 0, notifs: [],
      me: { id: ME, member_no: 1288, nickname: 'Sam', last_initial: 'L', utr: 5, utr_estimated: false, avatar_kind: 'letter', avatar_animal: null, avatar_color: 'paper', card_theme: 'court', created_at: '2026-01-01T00:00:00Z', gender: null, club_ids: [], pact_accepted_at: '2026-01-01T00:00:00Z' },
      buddies: [{ user_id: Z, since: null }], incoming: [], cards: { [X]: card(X, '<img src=x onerror=window.__xss=1>Xin', 2001), [Y]: card(Y, 'Yan', 2002), [Z]: card(Z, 'Zoe', 2003), [P]: card(P, 'Pat', 2004), [L]: card(L, 'Lou', 2005) } };
    const iso = h => new Date(S.now + h * 3600e3).toISOString();
    await pg.route('https://nanbanqiu.app/**', async r => { const u = new URL(r.request().url()); if (!u.pathname.startsWith('/api/')) return r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: fs.readFileSync(path.join(DIR, f)) });
      const m = r.request().method(), p = u.pathname, pd = r.request().postData(); const J = (s, d) => r.fulfill({ status: s, contentType: 'application/json', body: JSON.stringify(d) });
      if (p !== '/api/events') S.log.push(m + ' ' + p);
      const bd = () => ({ buddies: S.buddies.map(x => ({ user_id: x.user_id, since: x.since || iso(-48) })), incoming: S.incoming.map(x => ({ id: x.id, from_user: x.from, created_at: x.at, expires_at: x.exp })), outgoing: [],
        profiles: Object.fromEntries([...S.buddies.map(x => x.user_id), ...S.incoming.map(x => x.from)].map(id => [id, S.cards[id]])) });
      if (p === '/api/buddies' && m === 'GET') { S.bdGets++; return J(200, bd()) }
      const mt = p.match(/^\/api\/buddies\/requests\/([^/]+)\/(accept|ignore)$/);
      if (mt && m === 'POST') { S.posts.push(mt[2] + ':' + mt[1]); if (S.failNext) { const e = S.failNext; S.failNext = null; S.incoming = S.incoming.filter(x => x.id !== mt[1]); return J(409, { error: e }) }
        const q = S.incoming.find(x => x.id === mt[1]); if (!q) return J(404, { error: 'not_found' }); S.incoming = S.incoming.filter(x => x !== q);
        if (mt[2] === 'accept') { S.buddies.unshift({ user_id: q.from, since: iso(0) }); return J(200, { status: 'buddies' }) } return J(200, { status: 'ignored' }) }
      if (p === '/api/notifications' && m === 'GET') return J(200, { notifications: S.notifs });
      if (m === 'GET') {
        if (p === '/api/me' && S.slowMe) await new Promise(x => setTimeout(x, S.slowMe));
        if (p === '/api/venues') return J(200, { venues: VENUES });
        if (p === '/api/me') return J(200, { registered: true, user: S.me });
        if (p === '/api/games') return J(200, { games: [] });
        if (p === '/api/games/mine') {   // 3 天前和 Pat、Lou 打过 1 场（Lou 被我设成少遇到）
          const g = { id: G1, share_code: 'Pa5t', host_id: ME, host_nickname: 'Sam', host_utr: 5, venue_id: V1, venue_name: 'Test Tennis Club', short_name: 'Test TC', starts_at: iso(-72), duration_min: 90, game_type: 'doubles', capacity: 4, utr_min: 3, utr_max: 7,
            note: '', status: 'completed', tags: [], visibility: 'public', filled: 3, join_mode: 'approve', city: 'melb', approved_count: 3, pending_count: 0, spots_left: 1 };
          const pp = (uid, role) => ({ game_id: G1, user_id: uid, role, status: 'approved', created_at: iso(-100), approved_at: iso(-99), message: '' });
          return J(200, { games: [g], participants: [pp(ME, 'host'), pp(P, 'player'), pp(L, 'player')], profiles: { [ME]: S.me, [P]: S.cards[P], [L]: S.cards[L] } }) }
        if (p === '/api/invites') return J(200, { invites: [], profiles: {} });
        if (p === '/api/me/after') return J(200, { prefs: [{ target_id: L, pref: 'less', updated_at: iso(-10), game_id: G1 }], impressions: [], noshows: [], appeals: [], feels: [] });
        return J(404, { error: 'not_found' }) }
      return J(404, { error: 'not_found' }) });
    await pg.route(SB + '/**', r => { const v = r.request().url().includes('/verify');
      r.fulfill({ status: v ? 200 : 204, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: v ? JSON.stringify({ access_token: 'AT', refresh_token: 'RT', expires_in: 3600, user: { id: 'sb-1', phone: '61412345678' } }) : '' }) });
    await pg.route('https://cdnjs.cloudflare.com/**', r => r.abort()); await pg.route('https://basemaps.cartocdn.com/**', r => r.abort());
    const until = async (fn, n = 30) => { for (let i = 0; i < n; i++) { try { if (await fn()) return true } catch (_) { } await pg.settle(200) } return false };
    const toMe = () => pg.evaluate(W => { try { closeSheet() } catch (_) { } try { closeModal() } catch (_) { } if (W) { UI.tab = 'me'; render() } else go('me') }, W);
    // 页面上画出来的「我的球友」（DOM）：待确认行 | 小头像（名字/副标题）
    const sec = () => pg.evaluate(() => { const r = document.querySelector('.bd'); if (!r) return null;
      return [...r.querySelectorAll('.bd-req b')].map(x => 'REQ:' + x.textContent).concat([...r.querySelectorAll('.pal')].map(x => x.querySelector('b').textContent + '/' + x.querySelector('small').textContent)).join(' | ') });
    const layer = () => pg.evaluate(W => { const el = W ? document.querySelector('#mbg.show #modal .bd-pk') : document.querySelector('#sheet.show .bd-pk'); return el ? el.textContent.replace(/\s+/g, ' ').trim() : null }, W);
    const toastTxt = () => pg.evaluate(() => { const t = document.querySelector('#toast'); return t ? t.textContent : '' });
    const reread = async () => { await pg.evaluate(async () => { BUDDY = { ok: false, list: [], incoming: [], outgoing: [] }; await nbqRefresh() }); await pg.settle(300); await toMe(); await pg.settle(200); return sec() };
    const login = async () => { await pg.evaluate(() => { openAuth(null) }); await pg.settle(300); await pg.fill('#ph', '0412 345 678'); await pg.click('[data-a="sendCode"]'); await pg.settle(400); await pg.fill('#otp', '123456');
      await pg.waitForFunction(() => typeof ME !== 'undefined' && ME && ME.name === 'Sam', null, { timeout: 10000 }).catch(() => { }); await pg.settle(400) };

    await pg.goto('https://nanbanqiu.app/'); await pg.settle(600); S.now = await pg.evaluate(() => Date.now());
    S.incoming = [{ id: RX, from: X, at: iso(-0.01), exp: iso(23.9) }, { id: RY, from: Y, at: iso(-3), exp: iso(21) }];
    S.notifs = [{ id: 7, kind: 'buddy_request', game_id: null, invite_id: null, actor_id: X, read_at: null, created_at: iso(-0.01) }, { id: 8, kind: 'buddy_accepted', game_id: null, invite_id: null, actor_id: Z, read_at: null, created_at: iso(-40) }];
    await login(); await pg.evaluate(() => nbqPullNotifs()); await pg.settle(300); await toMe(); await pg.settle(300);
    if (!on) {
      T(tag('不读 /api/buddies'), S.bdGets === 0, S.log);
      T(tag('个人页没有「我的球友」，还是原来的「常一起打」（只打过 1 场的不显示）'), (await sec()) === null && await pg.evaluate(() => !/我的球友/.test(document.body.innerText)));
      T(tag('球友通知不显示'), await pg.evaluate(() => !NOTIFS.some(n => /^buddy_/.test(n.kind))));
      T(tag('无脚本错误'), errs.length === 0, errs); await ctx.close(); continue }

    // —— 读入：登录后读一次；页面 = 两条待确认 + 扫码球友 Zoe + 只打过 1 场的 Pat（Lou 设了少遇到，不显示）
    T(tag('登录后读 /api/buddies'), S.bdGets >= 1, S.log);
    const want0 = 'REQ:<img src=x onerror=window.__xss=1>Xin | REQ:Yan | Zoe/扫码 | Pat/1 场';
    T(tag('我的球友：待确认在最上面 + 扫码球友 + 只打过 1 场的人；少遇到的不显示'), await until(async () => await sec() === want0), await sec());
    T(tag('昵称转义（没有注入元素、没有执行）'), await pg.evaluate(() => !document.querySelector('.bd img') && typeof window.__xss === 'undefined'));
    T(tag('待确认行：标题只放名字（名字长也不会把「想加你为球友」挤掉），副标题「想加你为球友 · 刚刚扫了你的码」'), await pg.evaluate(() => document.querySelector('.bd-req small').textContent === '想加你为球友 · 刚刚扫了你的码'));

    // —— 通知：文案、待处理时保持未读、点开 = 确认页
    const nt = await pg.evaluate(() => NOTIFS.filter(n => /^buddy_/.test(n.kind)).map(n => n.kind + ':' + nrText(n)[0] + '|' + nrText(n)[1]));
    T(tag('通知文案：想加你为球友 / 成为球友了'), nt.length === 2 && nt.some(x => /^buddy_request:.*Xin 想加你为球友\|当面扫了你的码 · 点开确认 ›$/.test(x)) && nt.some(x => x === 'buddy_accepted:你和 Zoe 成为球友了|以后想约，在「我的球友」里找 TA ›'), nt);
    T(tag('buddy_request 处理前算待处理（nrTodo）'), await pg.evaluate(() => nrTodo(NOTIFS.find(n => n.kind === 'buddy_request'))));
    await pg.evaluate(() => nrOpen(NOTIFS.find(n => n.kind === 'buddy_accepted'))); await pg.settle(300);
    T(tag('点开「成为球友了」→ Zoe 的球员卡，标为已读'), await pg.evaluate(W => { const el = W ? document.querySelector('#modal') : document.querySelector('#sheet'); return /Zoe/.test(el.textContent) && NOTIFS.find(n => n.kind === 'buddy_accepted').read }, W));
    await toMe(); await pg.settle(200);
    await pg.evaluate(() => nrOpen(NOTIFS.find(n => n.kind === 'buddy_request'))); await pg.settle(300);
    T(tag('点开「想加你为球友」→ 确认页（名字、刚刚扫了你的码、确认 / 忽略、忽略不会通知 TA）'), /Xin.*刚刚扫了你的码，想加你为球友.*确认.*忽略.*忽略不会通知 TA/.test(await layer() || ''), await layer());

    // —— 确认（真实点击）：POST accept → 页面：Xin 进了球友、待确认少一条 → 清空内存 → 重读 → 还在
    await pg.click(W ? '#modal [data-act="bdAccept"]' : '#sheet [data-act="bdAccept"]'); await pg.settle(500);
    T(tag('确认：发 POST /api/buddies/requests/:id/accept'), S.posts.join() === 'accept:' + RX, S.posts);
    T(tag('确认：弹层关了，有提示'), (await layer()) === null && /成为球友了/.test(await toastTxt()), await toastTxt());
    await toMe(); await pg.settle(200);
    const want1 = 'REQ:Yan | <img/扫码 | Zoe/扫码 | Pat/1 场';
    T(tag('确认后页面：Xin 进了我的球友（最新的在前），只剩 Yan 的待确认'), await sec() === want1, await sec());
    T(tag('确认后这条通知不再算待处理、已读'), await pg.evaluate(() => { const n = NOTIFS.find(n => n.kind === 'buddy_request'); return !nrTodo(n) && n.read }));
    T(tag('确认：清空内存 → 重读 → 还在'), await reread() === want1, await sec());

    // —— 忽略（从「我的球友」的待确认行进入）：POST ignore → 页面不再有 Yan → 重读 → 还是没有
    await until(async () => (await sec() || '').includes('REQ:Yan')); await pg.click('.bd-req[data-act="bdOpen"]'); await until(async () => (await layer()) !== null);
    T(tag('点待确认行 → 确认页（Yan，3 小时前）'), /Yan.*3 小时前扫了你的码/.test(await layer() || ''), await layer());
    await pg.click(W ? '#modal [data-act="bdIgnore"]' : '#sheet [data-act="bdIgnore"]'); await pg.settle(500);
    T(tag('忽略：发 POST …/ignore，提示「TA 不会收到通知」'), S.posts[1] === 'ignore:' + RY && /TA 不会收到通知/.test(await toastTxt()), [S.posts, await toastTxt()]);
    await toMe(); await pg.settle(200);
    const want2 = '<img/扫码 | Zoe/扫码 | Pat/1 场';
    T(tag('忽略后页面：没有待确认了'), await sec() === want2, await sec());
    T(tag('忽略：清空内存 → 重读 → 还是没有'), await reread() === want2, await sec());

    // —— 处理失败（别的设备已经处理过 / 已失效）：提示 + 以服务器为准，不显示成球友
    const RW = '10000000-0000-4000-8000-000000000003'; S.cards[Y] = card(Y, 'Yan', 2002); S.incoming = [{ id: RW, from: Y, at: iso(-1), exp: iso(23) }];
    await reread(); await until(async () => (await sec() || '').includes('REQ:Yan')); await pg.click('.bd-req[data-act="bdOpen"]'); await until(async () => (await layer()) !== null); S.failNext = 'buddy_request_ended';
    await pg.click(W ? '#modal [data-act="bdAccept"]' : '#sheet [data-act="bdAccept"]'); await pg.settle(600);
    T(tag('确认失败：提示「已经处理过或失效了」'), /已经处理过或失效了/.test(await toastTxt()), await toastTxt());
    await toMe(); await pg.settle(200);
    T(tag('确认失败：页面以服务器为准（Yan 不是球友，待确认也没了）'), await sec() === want2, await sec());

    // —— 全部球友列表（> 8 位才有入口；这里直接打开，断言内容和埋点）
    await pg.evaluate(() => bdListOpen()); await pg.settle(300);
    T(tag('全部球友：仅你可见 · 3 位，写清来源'), /仅你可见 · 3 位.*Xin.*当面扫码认识.*Zoe.*当面扫码认识.*Pat.*一起打过 1 场/.test(await layer() || ''), await layer());
    await toMe(); await pg.settle(200);

    // —— 刷新：服务器慢时先画快照里的球友（不先少一块），读完以服务器为准
    await pg.settle(1200); S.slowMe = 2500; S.buddies.push({ user_id: Y, since: iso(0) });
    await pg.reload(); await pg.waitForFunction(() => typeof ME !== 'undefined' && !!ME, null, { timeout: 5000 }).catch(() => { }); await toMe(); await pg.settle(150);
    T(tag('刷新：还没读回来时先画快照里的球友（少遇到的 Lou 也不闪出来）'), await sec() === want2, await sec());
    await until(async () => (await sec() || '').includes('Yan'), 40); S.slowMe = 0;
    T(tag('刷新：读回来后换成服务器上的（换设备加的也在）'), /Yan\/扫码/.test(await sec() || ''), await sec());

    // —— 退出登录：清掉。先等进行中的读取都结束 —— 读取途中退出、回来后又套用上去是 0495 原有的竞态，单独修（见 PR 描述），这里不让它干扰本测试
    await pg.evaluate(async () => { try { await NBQ_PULL_P } catch (_) { } }); await pg.settle(1500);
    await pg.evaluate(() => { sbaLogout(); render() }); await pg.settle(400); await toMe(); await pg.settle(200);
    const out = await pg.evaluate(() => ({ dom: !!document.querySelector('.bd'), ok: BUDDY.ok, n: BUDDY.list.length + BUDDY.incoming.length, me: !!ME }));
    T(tag('退出登录：没有「我的球友」，内存里也清掉了'), !out.dom && !out.ok && out.n === 0 && !out.me, [out, S.log.slice(-8)]);
    T(tag('无脚本错误'), errs.length === 0, errs); await ctx.close();
  }
  await b.close(); console.log(`buddies: ${pass} 通过, ${fail} 失败`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1) });
