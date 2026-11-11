// 5g-3 前台接入第 4 轮（4b）：球局写操作在真实模式（nanbanqiu.app）走接口（两端，假 Supabase + 有状态的假 /api）：
//   申请 · 退出 · 申请失败（错误码提示）· 同意 · 婉拒（原因映射）· 取消 · 发局 · 球友约定 · 连点只发一次 · 改局 / 放宽 / 顺延 / 确认改动（4c） · 全程没有页面报错
//   流程：先调接口 → 成功后重新读入 → 页面以服务器为准；点击走真实的 data-a 事件处理，不是直接调函数
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const DIR = process.env.NBQ_DIR || path.join(__dirname, '..', '..');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 600) : '')) };
const SB = 'https://xosrdkrkfxkdrwldfhac.supabase.co';
const U = c => `${c.repeat(8)}-${c.repeat(4)}-4${c.repeat(3)}-8${c.repeat(3)}-${c.repeat(12)}`;
const V1 = U('1'), ME = U('a'), HOST = U('b'), REQ = U('d'), G1 = U('c'), G2 = U('e'), G3 = U('f');
const card = (id, n, no) => ({ id, member_no: no, nickname: n, last_initial: 'W', utr: 5.5, avatar_kind: 'letter', avatar_animal: null, avatar_color: 'paper', seal_roll: 3, card_theme: 'court', played: 4, hosted: 1, kudos: 2, level: 'fresh', gone: false });
const VENUES = [{ id: V1, name: 'Test Tennis Club', short_name: 'Test TC', suburb: 'Malvern', surfaces: ['hard'], courts: 4, lights: true, indoor: false, booking_url: null, lat: -37.86, lng: 145.03 }];
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  for (const f of ['南伴球_PWA.html', '南伴球_Web.html']) {
    const W = f.includes('Web'), ctx = await b.newContext({ viewport: W ? { width: 1360, height: 860 } : { width: 390, height: 844 } });
    const pg = await ctx.newPage(), errs = []; pg.on('pageerror', e => errs.push(e.message + ' @ ' + String(e.stack).split('\n').slice(1, 3).join('|')));
    const tag = s => `${f} ${s}`;
    const S = { now: Date.now(), me: { id: ME, member_no: 1288, nickname: 'Sam', last_initial: 'L', utr: 5, utr_estimated: false, avatar_kind: 'letter', avatar_animal: null, avatar_color: 'paper', card_theme: 'court', created_at: new Date().toISOString(), gender: null, club_ids: [], pact_accepted_at: new Date().toISOString() },
      my1: null, ack1: null, reqStatus: 'pending', g2Cancelled: false, created: false, fail: null, log: [], bodies: {}, mineGets: 0, slow: 0 };
    const iso = h => new Date(S.now + h * 3600e3).toISOString();
    const G = (id, code, host, hostName, h, extra = {}) => ({ id, share_code: code, host_id: host, host_nickname: hostName, host_utr: 5.5, venue_id: V1, venue_name: 'Test Tennis Club', short_name: 'Test TC', starts_at: iso(h), duration_min: 90, game_type: 'doubles', capacity: 4, utr_min: 4, utr_max: 6.5,
      note: '', status: 'open', tags: [], visibility: 'public', filled: 0, join_mode: 'approve', city: 'melb', approved_count: 1, pending_count: 0, spots_left: 3, ...extra });
    const games = () => [G(G1, 'Ab3k', HOST, 'Host', 30, { approved_count: S.my1 === 'approved' ? 2 : 1, pending_count: S.my1 === 'pending' ? 1 : 0 }),
      G(G2, 'Mine', ME, 'Sam', 31, { status: S.g2Cancelled ? 'cancelled' : 'open', pending_count: S.reqStatus === 'pending' ? 1 : 0, approved_count: S.reqStatus === 'approved' ? 2 : 1 }), ...(S.created ? [G(G3, 'New1', ME, 'Sam', 33)] : [])];
    const parts = () => [{ game_id: G1, user_id: HOST, role: 'host', status: 'approved', created_at: iso(-5), message: '' },
      ...(S.my1 ? [{ game_id: G1, user_id: ME, role: 'player', status: S.my1, created_at: iso(-1), message: 'hi', change_ack: S.my1 === 'approved' ? S.ack1 : null }] : []),
      { game_id: G2, user_id: ME, role: 'host', status: 'approved', created_at: iso(-5), message: '' },
      { game_id: G2, user_id: REQ, role: 'player', status: S.reqStatus, created_at: iso(-1), message: '想打', decline_reason: S.reqStatus === 'rejected' ? 'pass' : null }];
    await pg.route('https://nanbanqiu.app/**', async r => { const u = new URL(r.request().url()); if (!u.pathname.startsWith('/api/')) return r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: fs.readFileSync(path.join(DIR, f)) });
      const m = r.request().method(), p = u.pathname, pd = r.request().postData(), body = pd ? JSON.parse(pd) : null; const J = (s, d) => r.fulfill({ status: s, contentType: 'application/json', body: JSON.stringify(d) });
      // 埋点（/api/events）由定时器批量发，什么时候插进来不确定；它不是写操作，不进写请求日志（11-05：「约定」那条因此偶发红）
      if (m !== 'GET' && p !== '/api/events') { S.log.push(m + ' ' + p.replace(/[0-9a-f]{8}-[0-9a-f-]{27}/g, x => ({ [G1]: 'G1', [G2]: 'G2', [G3]: 'G3', [REQ]: 'REQ', [ME]: 'ME' })[x] || x)); S.bodies[m + ' ' + p] = body; if (S.slow) await new Promise(x => setTimeout(x, S.slow)) }
      if (m === 'PATCH' && p === '/api/me') { Object.assign(S.me, body); return J(200, { user: S.me }) }   // 资料修改：服务器记下，下次读回就是新值
      if (m === 'GET') {
        if (p === '/api/venues') return J(200, { venues: VENUES });
        if (p === '/api/me') return J(200, { registered: true, user: S.me });
        if (p === '/api/games') return J(200, { games: games() });
        if (p === '/api/games/mine') { S.mineGets++; return J(200, { games: games().filter(g => g.host_id === ME || (g.id === G1 && S.my1)), participants: parts(), profiles: { [HOST]: card(HOST, 'Host', 1200), [REQ]: card(REQ, 'Req', 1300), [ME]: S.me } }) }
        if (p === '/api/invites') return J(200, { invites: [], profiles: {} });
        if (p === '/api/profiles') return J(200, { profiles: { [HOST]: card(HOST, 'Host', 1200) } });
        return J(404, { error: 'not_found' }) }
      if (p === '/api/me/pact') { S.me.pact_accepted_at = new Date().toISOString(); return J(200, { ok: true }) }
      if (p === '/api/games') { S.created = true; return J(201, { id: G3, share_code: 'New1' }) }
      if (p === `/api/games/${G1}/requests`) return S.fail ? J(409, { error: S.fail }) : (S.my1 = 'pending', J(200, { status: 'pending' }));
      if (p === `/api/games/${G1}/requests/me`) return (S.my1 = null, J(200, { status: 'withdrawn' }));
      if (p === `/api/games/${G2}/requests/${REQ}/approve`) return (S.reqStatus = 'approved', J(200, { status: 'approved' }));
      if (p === `/api/games/${G2}/requests/${REQ}/decline`) return (S.reqStatus = 'rejected', J(200, { ok: true }));
      if (p === `/api/games/${G3}` && m === 'PATCH') return S.fail ? J(409, { error: S.fail }) : J(200, { changes: { note: ['', body.note] } });
      if (p === `/api/games/${G3}/postpone`) return J(200, { starts_at: iso(34) });
      if (p === `/api/games/${G1}/change-ack`) { S.ack1 = body.choice; if (body.choice === 'out') S.my1 = null; return J(200, { status: body.choice }) }
      if (p === `/api/games/${G2}/cancel`) return (S.g2Cancelled = true, J(200, { ok: true }));
      if (p === '/api/me/clubs') { S.me.club_ids = body.venue_ids; return J(200, { venue_ids: body.venue_ids }) }
      return J(404, { error: 'not_found' }) });
    await pg.route(SB + '/**', r => { const u = r.request().url(); const v = u.includes('/verify');
      r.fulfill({ status: v ? 200 : 204, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: v ? JSON.stringify({ access_token: 'AT', refresh_token: 'RT', expires_in: 3600, user: { id: 'sb-1', phone: '61412345678' } }) : '' }) });
    await pg.route('https://cdnjs.cloudflare.com/**', r => r.abort()); await pg.route('https://basemaps.cartocdn.com/**', r => r.abort());
    const click = async (attrs, extra = '') => { await pg.evaluate(([a, x]) => { const el = document.createElement('button'); el.id = '__t'; Object.entries(a).forEach(([k, v]) => el.setAttribute(k, v)); const host = typeof DEV !== 'undefined' ? DEV : document.body; host.appendChild(el); if (x) { const t = document.createElement('textarea'); t.id = 'applyMsg'; t.value = x; host.appendChild(t) } el.click(); el.remove(); const t = document.getElementById('applyMsg'); if (t && x) t.remove() }, [attrs, extra]); await pg.settle(700) };
    const mine = id => pg.evaluate(i => { const g = GAMES.find(x => x.id === i); return g ? api.get(i).mine : undefined }, id);
    const st = id => pg.evaluate(i => { const g = GAMES.find(x => x.id === i); return g ? g.status : undefined }, id);
    const until = (fn, n = 24) => pg.until(fn, n * 300);   // 按真实时间等（pg.until，tests/lib/preload 第 9 条）   // 11-05（#40）：先等条件成立再断言——固定 settle 在 CI / 并行负载下不够，红的断言每次不一样
    const toasts = () => pg.evaluate(() => document.querySelector('#toast') && document.querySelector('#toast').textContent);

    await pg.goto('https://nanbanqiu.app/'); await pg.settle(600);
    await pg.evaluate(() => { openAuth(null) }); await pg.settle(300); await pg.fill('#ph', '0412 345 678'); await pg.click('[data-a="sendCode"]'); await pg.settle(400); await pg.fill('#otp', '123456'); await pg.waitForFunction(() => ME && GAMES.length === 2, null, { timeout: 20000 }).catch(() => { }); await pg.settle(200);
    T(tag('登录后读入：球局 2 局、我的约定已记录'), await pg.evaluate(() => ME && ME.name === 'Sam' && !!ME.pact_at && GAMES.length === 2));

    // 申请
    S.log.length = 0; await click({ 'data-a': 'doApply', 'data-g': G1 }, '周六想打'); await until(async () => S.log.length > 0 && (await mine(G1)) === 'pending');   // 11-11：固定 settle 在并行负载下不够（--changed 连红 3 次），先等结果再断言
    T(tag('申请：POST 申请，留言原样带上'), S.log.join() === 'POST /api/games/G1/requests' && S.bodies[`POST /api/games/${G1}/requests`].message === '周六想打', [S.log, S.bodies]);
    T(tag('申请：读入后状态来自服务器（待确认）'), await mine(G1) === 'pending', await mine(G1));
    // 退出（撤回）
    S.log.length = 0; await click({ 'data-a': 'doLeave', 'data-g': G1 }); await until(async () => S.log.length > 0 && !(await mine(G1)));
    T(tag('撤回申请：DELETE，读入后回到未申请'), S.log.join() === 'DELETE /api/games/G1/requests/me' && !(await mine(G1)), [S.log, await mine(G1)]);
    // 申请失败
    S.fail = 'game_full'; S.log.length = 0; const m0 = S.mineGets; await click({ 'data-a': 'doApply', 'data-g': G1 }, 'x'); await until(async () => /刚刚满员了/.test(await toasts()) && S.mineGets > m0);
    T(tag('申请失败（满员）：提示后端错误码对应的文字，状态不变，并重新同步'), /刚刚满员了/.test(await toasts()) && !(await mine(G1)) && S.mineGets > m0, [await toasts(), S.mineGets - m0]);
    S.fail = null;
    // 连点只发一次
    S.slow = 400; S.log.length = 0;
    await pg.evaluate(([a]) => { const mk = () => { const host = typeof DEV !== 'undefined' ? DEV : document.body; const el = document.createElement('button'); el.setAttribute('data-a', 'doApply'); el.setAttribute('data-g', a); host.appendChild(el); const t = document.createElement('textarea'); t.id = 'applyMsg'; t.value = 'y'; host.appendChild(t); el.click(); el.remove(); t.remove() }; mk(); mk(); mk() }, [G1]); await until(() => S.log.some(x => /requests$/.test(x))); await pg.settle(1500); S.slow = 0;
    T(tag('连点三次只发一次申请'), S.log.filter(x => /requests$/.test(x)).length === 1, S.log);
    await click({ 'data-a': 'doLeave', 'data-g': G1 }); await until(async () => !(await mine(G1)));
    // 同意 / 婉拒
    S.log.length = 0; await click({ 'data-a': 'approve', 'data-g': G2, 'data-u': REQ }); await until(() => pg.evaluate(([g, u]) => !!PARTS.find(p => p.game_id === g && p.user_id === u && p.status === 'approved'), [G2, REQ]));
    T(tag('同意：POST approve，读入后对方已加入'), S.log.join() === 'POST /api/games/G2/requests/REQ/approve' && await pg.evaluate(([g, u]) => !!PARTS.find(p => p.game_id === g && p.user_id === u && p.status === 'approved'), [G2, REQ]), S.log);
    S.reqStatus = 'pending'; await pg.evaluate(() => nbqRefresh()); S.log.length = 0; await click({ 'data-a': 'reject', 'data-g': G2, 'data-u': REQ }); await until(() => S.log.length > 0);
    T(tag('婉拒（直接）：POST decline，原因 pass'), S.log.join() === 'POST /api/games/G2/requests/REQ/decline' && S.bodies[`POST /api/games/${G2}/requests/${REQ}/decline`].reason === 'pass', [S.log, S.bodies]);
    T(tag('婉拒原因映射：full / friends → known，level → level，其他 → pass'), await pg.evaluate(() => [nbqReason('full'), nbqReason('friends'), nbqReason('level'), nbqReason('next'), nbqReason(undefined)].join()) === 'known,known,level,pass,pass');
    // 取消
    S.log.length = 0; await click({ 'data-a': 'doCancelGame', 'data-g': G2 }); await until(async () => (await st(G2)) === 'cancelled');
    T(tag('取消球局：POST cancel，读入后状态是已取消'), S.log.join() === 'POST /api/games/G2/cancel' && await st(G2) === 'cancelled', [S.log, await st(G2)]);
    // 发局
    S.log.length = 0; const id = await pg.evaluate(([v]) => { const f = { venue_id: v, o: 2, t: '10:00', dur: 90, type: 'doubles', mn: 3.5, mx: 5, note: ' 周六双打 ', tags: new Set(['relax', 'newbie']), miss: 1, instant: false }; return nbqCreate(f) }, [V1]);
    const cb = S.bodies['POST /api/games'] || {};
    T(tag('发局：参数映射（utr 范围、标签、缺几人 → filled、加入方式、说明去空格）'), cb.venue_id === V1 && cb.utr_min === 3.5 && cb.utr_max === 5 && cb.game_type === 'doubles' && cb.duration_min === 90 && cb.filled === 2 && cb.join_mode === 'approve' && cb.note === '周六双打' && cb.tags.join() === 'relax,newbie' && typeof cb.starts_at === 'string', cb);
    T(tag('发局：返回服务器的球局 id，读入后列表里有这局（我是发起人）'), id === G3 && await pg.evaluate(i => { const g = GAMES.find(x => x.id === i); return !!g && api.get(i).isHost }, G3), id);
    // 4c：改局 / 放宽 / 顺延 / 确认改动
    const exp = await pg.evaluate(([g]) => { geOpen(g); document.getElementById('ngNote').value = '改个备注'; NG.mn = 3; const e = NG.type === 'doubles' ? Math.max(0, CAP.doubles - api.get(g).appr.length - NG.miss) : null; geSave(); return e }, [G3]); await pg.settle(500);
    const eb = S.bodies[`PATCH /api/games/${G3}`] || {};
    T(tag('改局：PATCH /api/games/:id，带接口认的字段，没有玩法'), !!S.bodies[`PATCH /api/games/${G3}`] && eb.note === '改个备注' && eb.utr_min === 3 && eb.duration_min > 0 && eb.venue_id === V1 && !('game_type' in eb) && !!eb.starts_at, [S.log, eb]);
    T(tag('改局：双打带 filled（4 - 已确认人数 - 缺几人），单打不带'), exp === null ? !('filled' in eb) : eb.filled === exp, [exp, eb]);
    T(tag('改局成功：提示已保存'), /已保存/.test(await toasts()), await toasts());
    // 开始时间落在时段空隙里（17:52 / 顺延后的 22:30 / 05:40）：打开改局表单不崩，时段就近归位
    const per = await pg.evaluate(g => { const gm = GAMES.find(x => x.id === g), r = []; for (const hm of ['17:52', '22:30', '05:40', '09:45']) { gm.starts_at = dayAt(2, hm).toISOString(); try { geOpen(g); r.push(NG.per) } catch (e) { r.push('ERR ' + e.message) } NG.edit = null; if (typeof closeSheet === 'function') closeSheet() } return r }, G3);
    T(tag('改局表单：开始时间在时段空隙里也能打开（17:52 / 22:30 / 05:40 / 09:45 → 晚上 / 晚上 / 早上 / 中午）'), per.join() === '3,3,0,1', per);
    await pg.evaluate(() => nbqRefresh()); await pg.settle(300);
    S.log.length = 0; delete S.bodies[`PATCH /api/games/${G3}`];
    await pg.evaluate(g => { geOpen(g); NG.type = NG.type === 'doubles' ? 'singles' : 'doubles'; geSave() }, G3); await pg.settle(300);
    T(tag('改局：改玩法暂不支持，提示且不发请求'), /暂时不能改/.test(await toasts()) && !S.log.length, [await toasts(), S.log]);
    await pg.evaluate(() => { NG.edit = null; if (typeof closeSheet === 'function') closeSheet() }).catch(() => {});
    S.fail = 'game_started'; await pg.evaluate(g => { geOpen(g); document.getElementById('ngNote').value = '再改'; geSave() }, G3); await pg.settle(400); await until(async () => /开打/.test(await toasts() || ''));
    T(tag('改局失败（已开打）：提示后端错误码对应的文字'), /开打/.test(await toasts()), await toasts()); S.fail = null;
    await pg.evaluate(() => { NG.edit = null; if (typeof closeSheet === 'function') closeSheet() }).catch(() => {});
    S.log.length = 0; await click({ 'data-uf': 'widen', 'data-g': G3 }); await pg.settle(300); await until(() => S.log.includes('PATCH /api/games/G3'));
    const wb = S.bodies[`PATCH /api/games/${G3}`] || {};
    T(tag('放宽水平：PATCH 只带 utr_min / utr_max'), S.log.join() === 'PATCH /api/games/G3' && typeof wb.utr_min === 'number' && typeof wb.utr_max === 'number' && Object.keys(wb).length === 2, [S.log, wb]);
    S.log.length = 0; await click({ 'data-uf': 'delayGo', 'data-g': G3 }); await pg.settle(300); await until(async () => S.log.includes('POST /api/games/G3/postpone') && /已顺延/.test(await toasts() || ''));
    T(tag('顺延 1 小时：POST postpone'), S.log.join() === 'POST /api/games/G3/postpone' && /已顺延/.test(await toasts()), [S.log, await toasts()]);
    S.my1 = 'approved'; S.ack1 = 'pending'; await pg.evaluate(() => nbqRefresh());
    T(tag('确认改动：待确认时球局页顶部有提示'), await pg.evaluate(g => /还能来/.test(geBanner(api.get(g))), G1));
    S.log.length = 0; await click({ 'data-ge': 'ok', 'data-g': G1 }); await pg.settle(300);
    T(tag('确认改动「还能来」：POST change-ack ok，提示消失'), S.log.join() === 'POST /api/games/G1/change-ack' && S.bodies[`POST /api/games/${G1}/change-ack`].choice === 'ok' && await pg.evaluate(g => geBanner(api.get(g)) === '', G1), [S.log, S.bodies]);
    S.ack1 = 'pending'; await pg.evaluate(() => nbqRefresh()); S.log.length = 0; await click({ 'data-ge': 'out', 'data-g': G1 }); await pg.settle(300);
    T(tag('确认改动「来不了」：POST change-ack out，读入后已不在这局'), S.bodies[`POST /api/games/${G1}/change-ack`].choice === 'out' && !(await mine(G1)), [S.bodies, await mine(G1)]);
    // 球友约定
    S.me.pact_accepted_at = null; await pg.evaluate(() => nbqRefresh()); S.log.length = 0;
    await pg.evaluate(() => { window.__pactNext = false; pactGate(() => { window.__pactNext = true }) }); await pg.settle(400);
    T(tag('约定：没同意过就不直接继续，等同意'), await pg.evaluate(() => window.__pactNext === false && typeof PACT_NEXT !== 'undefined' && !!PACT_NEXT));
    await pg.evaluate(() => { const el = document.createElement('button'); el.setAttribute('data-pact', 'ok'); document.body.appendChild(el); el.click(); el.remove() }); await pg.waitForFunction(() => window.__pactNext === true && !!ME.pact_at, null, { timeout: 15000 }).catch(() => { }); await pg.settle(200);   // 约定弹窗里的「同意并继续」；等「同意后读入」成立再断言（原固定等 900ms，CI 慢时抢跑）
    T(tag('约定：同意后先记到数据库（POST /api/me/pact），再继续原来的操作'), S.log.join() === 'POST /api/me/pact' && await pg.evaluate(() => window.__pactNext === true && !!ME.pact_at), S.log);
    // 我的 Club（11-03）：最多 3 个、「完成」按钮在长列表里也看得到、保存走 PUT /api/me/clubs、读回后页面状态来自服务器
    await pg.evaluate(ids => { const v = Object.values(VEN)[0]; ids.forEach((id, i) => { VEN[id] = { ...v, id, name: 'Club ' + (i + 2), short: 'C' + (i + 2) } }) }, [U('2'), U('3'), U('4')]);
    S.log.length = 0; await pg.evaluate(() => openClubs()); await pg.settle(400);
    for (const id of [V1, U('2'), U('3'), U('4')]) { await pg.evaluate(i => document.querySelector(`[data-cl="${i}"]`).click(), id); await pg.settle(60) }
    T(tag('Club：最多选 3 个，第 4 个提示'), (await pg.evaluate(() => CL.length)) === 3 && /最多选 3/.test(await toasts() || ''), [await pg.evaluate(() => CL), await toasts()]);
    T(tag('Club：「完成」按钮在屏幕里能看到（不用翻到长列表最下面）'), await pg.evaluate(() => { const b = document.querySelector('[data-a=saveClubs]'); if (!b) return false; const r = b.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight + 1 }), await pg.evaluate(() => { const b = document.querySelector('[data-a=saveClubs]'); return b && JSON.stringify(b.getBoundingClientRect()) + ' vh=' + innerHeight }));
    await pg.evaluate(() => document.querySelector('[data-a=saveClubs]').click()); await pg.settle(700);
    await until(() => pg.evaluate(c => JSON.stringify(ME.home_club_ids) === c && (() => { const b = document.querySelector('[data-a=saveClubs]'); return !b || !b.getClientRects().length || b.getBoundingClientRect().top >= innerHeight })(), JSON.stringify(S.me.club_ids)));
    T(tag('Club：保存 → PUT /api/me/clubs，带 3 个球场'), S.log.includes('PUT /api/me/clubs') && S.bodies['PUT /api/me/clubs'].venue_ids.length === 3, [S.log, S.bodies['PUT /api/me/clubs']]);
    T(tag('Club：读回后我的 Club 来自服务器，且页面上的弹层已关'), JSON.stringify(await pg.evaluate(() => ME.home_club_ids)) === JSON.stringify(S.me.club_ids) && await pg.evaluate(() => { const b = document.querySelector('[data-a=saveClubs]'); return !b || !b.getClientRects().length || b.getBoundingClientRect().top >= innerHeight }), await pg.evaluate(() => ME.home_club_ids));
    // 资料类修改（11-03）：球员卡 / 头像 / 微信号 / 邀约限制 / 性别 / 邮箱要写到服务器，刷新（重读）后不丢。之前只改内存。
    const clk = a => pg.evaluate(a => { const el = document.createElement('button'); for (const k in a) el.setAttribute(k, a[k]); (document.querySelector('.device') || document.body).appendChild(el); el.click(); el.remove() }, a);
    S.log.length = 0; for (const c of ['#E3262B', '#F07D1A', '#2C98EC']) { await clk({ 'data-avc': c }); await pg.settle(60) } await pg.settle(900); await until(() => S.log.includes('PATCH /api/me')); await pg.settle(300);
    T(tag('印章颜色：连点 3 次只存一次，存的是最后选的色名 sky'), S.log.filter(x => x === 'PATCH /api/me').length === 1 && S.bodies['PATCH /api/me'].avatar_color === 'sky', [S.log, S.bodies['PATCH /api/me']]);
    await pg.evaluate(() => nbqRefresh()); await pg.settle(500);
    T(tag('印章颜色：重读后还是 sky（刷新不丢），页面头像画的也是这个色'), await pg.evaluate(() => ME.color === '#2C98EC' && /2C98EC/i.test((document.querySelector('#meSlot .av,.av') || { innerHTML: '' }).innerHTML)), await pg.evaluate(() => ME.color));
    S.log.length = 0; await clk({ 'data-cth': 'clay' }); await clk({ 'data-an': 'lion' }); await clk({ 'data-roll': '1' }); await pg.settle(900);
    await pg.evaluate(() => nbqRefresh()); await pg.settle(500);
    T(tag('卡面主题 / 动物 / 换印：写到服务器，重读后还在'), await pg.evaluate(() => ME.card_theme === 'clay' && ME.animal === 'lion' && ME.avatar_kind === 'animal' && ME.seal_roll >= 1), [S.bodies['PATCH /api/me'], await pg.evaluate(() => [ME.card_theme, ME.animal, ME.seal_roll])]);
    S.log.length = 0; await pg.evaluate(() => { ME.wechat = null }); await clk({ 'data-a': 'wxSave' }); await pg.settle(100);
    await pg.evaluate(() => { nbqPatchMe('wx', { wechat_id: 'sam_wx' }) }); await pg.settle(700);
    T(tag('微信号：PATCH 带 wechat_id，重读后有'), S.bodies['PATCH /api/me'].wechat_id === 'sam_wx' && await pg.evaluate(() => ME.wechat === 'sam_wx'), S.bodies['PATCH /api/me']);
    await pg.evaluate(() => { setGender('f') }); await pg.settle(700);
    T(tag('性别：改了会 PATCH，重读后是 f'), S.bodies['PATCH /api/me'].gender === 'f' && await pg.evaluate(() => ME.gender === 'f'), S.bodies['PATCH /api/me']);
    S.log.length = 0; await clk({ 'data-ivset': 'played' }); await pg.settle(700);
    T(tag('邀约限制：PATCH invite_from=played，重读后还在'), S.bodies['PATCH /api/me'].invite_from === 'played' && await pg.evaluate(() => ME.invite_from === 'played'), S.bodies['PATCH /api/me']);
    S.fail = null; S.me.avatar_color = 'paper'; S.me.card_theme = 'court'; await pg.evaluate(() => nbqRefresh()); await pg.settle(400);
    T(tag('全程没有页面报错'), errs.length === 0, errs);
    await ctx.close();
  }
  await b.close(); console.log(`\nreal_write: ${pass} 通过, ${fail} 失败`); process.exit(fail ? 1 : 0);
})();
