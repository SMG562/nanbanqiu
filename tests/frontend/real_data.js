// 5g-3 前台接入第 4 轮（4a）：真实数据只在 nanbanqiu.app 启用（两端）。用假的 Supabase 和 /api 在浏览器里拦截：
//   ① 预览站 pages.dev：数据仍是演示，不发 /api 请求  ② nanbanqiu.app 未登录：演示数据被清空，只读公开球场
//   ③ 老用户登录：读入我 / 球局 / 球友，球局卡片字段对得上前台（ntrp_min…）  ④ 新号码：选球场 → 注册 → 常去球场 → 读入
//   ⑤ 刷新页面自动恢复（含令牌过期后续期、续期遇到临时错误自动重试、令牌被撤销才清登录）  ⑥ 退出清空  ⑦ 全程没有页面报错
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const DIR = process.env.NBQ_DIR || path.join(__dirname, '..', '..');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 600) : '')) };
const SB = 'https://xosrdkrkfxkdrwldfhac.supabase.co';
const V1 = '11111111-1111-4111-8111-111111111111', V2 = '22222222-2222-4222-8222-222222222222', ME = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', HOST = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', G1 = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const iso = h => new Date(Date.now() + h * 3600e3).toISOString();
const card = (id, n, no) => ({ id, member_no: no, nickname: n, last_initial: 'W', utr: 5.5, avatar_kind: 'letter', avatar_animal: null, avatar_color: 'paper', seal_roll: 3, card_theme: 'court', played: 4, hosted: 1, kudos: 2, level: 'fresh', gone: false });
const GAME = { id: G1, share_code: 'Ab3k', host_id: HOST, host_nickname: 'Host', host_utr: 5.5, venue_id: V1, venue_name: 'Test Tennis Club', short_name: 'Test TC', starts_at: iso(30), duration_min: 120, game_type: 'doubles', capacity: 4, utr_min: 4, utr_max: 6.5,
  note: '周六双打', status: 'open', tags: [], visibility: 'public', filled: 0, join_mode: 'approve', city: 'melb', approved_count: 1, pending_count: 0, spots_left: 3 };
const VENUES = [{ id: V1, name: 'Test Tennis Club', short_name: 'Test TC', suburb: 'Malvern', surfaces: ['hard'], courts: 4, lights: true, indoor: false, booking_url: null, lat: -37.86, lng: 145.03 },
  { id: V2, name: 'Second Park Tennis', short_name: 'Second Park', suburb: 'Kew', surfaces: ['clay'], courts: 2, lights: false, indoor: false, booking_url: null, lat: -37.81, lng: 145.03 }];
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  for (const f of ['南伴球_PWA.html', '南伴球_Web.html']) {
    const W = f.includes('Web'), ctx = await b.newContext({ viewport: W ? { width: 1360, height: 860 } : { width: 390, height: 844 } });
    const pg = await ctx.newPage(), errs = [], api = []; pg.on('pageerror', e => errs.push(e.message));
    const S = { registered: true, meUser: { id: ME, member_no: 1288, nickname: 'Sam', last_initial: 'L', utr: 5, utr_estimated: false, avatar_kind: 'letter', avatar_animal: null, avatar_color: 'paper', card_theme: 'court', created_at: iso(-100), gender: 'f', club_ids: [V2] }, now: Date.now(), regBody: null, clubsBody: null, genderBody: null, build: null, remote: null, bj: 0, hdrs: [], force426: false };
    const tag = s => `${f} ${s}`, GM = () => ({ ...GAME, starts_at: new Date(S.now + 30 * 3600e3).toISOString() });   // 页面里的时钟被测试框架固定在 10-14，球局时间跟着页面走
    const html = r => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: S.build ? fs.readFileSync(path.join(DIR, f), 'utf8').replace(/<head>/i, `<head><meta name="nbq-build" content="${S.build}">`) : fs.readFileSync(path.join(DIR, f)) });   // S.build：像部署时 tools/site.mjs 那样写进构建号
    await pg.route('https://nanbanqiu.app/**', r => { const u = new URL(r.request().url()); if (u.pathname === '/build.json') { S.bj++; return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ build: S.remote }) }) } if (!u.pathname.startsWith('/api/')) return html(r);
      S.hdrs.push(r.request().headers()['x-nbq-build'] || ''); if (S.force426 && u.pathname === '/api/games/mine') return r.fulfill({ status: 426, contentType: 'application/json', body: '{"error":"client_outdated"}' });
      const m = r.request().method(), p = u.pathname, body = r.request().postData(); api.push(m + ' ' + p); if (p === '/api/games') S.gamesAuth = r.request().headers()['authorization'] || null; const J = (s, d) => r.fulfill({ status: s, contentType: 'application/json', body: JSON.stringify(d) });
      if (p === '/api/venues') return J(200, { venues: VENUES });
      if (p === '/api/me' && m === 'GET') return J(200, S.registered ? { registered: true, user: S.meUser } : { registered: false });
      if (p === '/api/me' && m === 'PATCH') { S.genderBody = JSON.parse(body); return J(200, { ok: true }) }
      if (p === '/api/me/register') { S.regBody = JSON.parse(body); S.registered = true; S.meUser = { ...S.meUser, nickname: S.regBody.nickname, club_ids: [] }; return J(200, { registered: true, user: S.meUser }) }
      if (p === '/api/me/clubs') { S.clubsBody = JSON.parse(body); S.meUser.club_ids = S.clubsBody.venue_ids; return J(200, { ok: true }) }
      if (p === '/api/games') return J(200, { games: [GM()] });
      if (p === '/api/games/mine') return J(200, { games: [GM()], participants: [{ game_id: G1, user_id: HOST, role: 'host', status: 'approved', created_at: iso(-5), message: '' }], profiles: { [HOST]: card(HOST, 'Host', 1200) } });
      if (p === '/api/notifications' && m === 'GET') return J(200, { notifications: [
        { id: 9, kind: 'request', game_id: G1, actor_id: HOST, read_at: null, created_at: new Date(S.now - 3600e3).toISOString() },
        { id: 8, kind: 'approved', game_id: G1, actor_id: HOST, read_at: new Date(S.now - 1800e3).toISOString(), created_at: new Date(S.now - 7200e3).toISOString() },
        ...(S.extraNotif ? [{ id: 10, kind: 'approved', game_id: G1, actor_id: HOST, read_at: null, created_at: new Date(S.now).toISOString() }] : []),
        { id: 7, kind: 'invite', game_id: null, actor_id: HOST, read_at: null, created_at: new Date(S.now - 9000e3).toISOString() },
        { id: 6, kind: 'recap', game_id: G1, actor_id: null, read_at: null, created_at: new Date(S.now - 9000e3).toISOString() }] });
      if (p === '/api/me/push-diag' && m === 'POST') { S.diagBody = JSON.parse(body); return J(200, { now: new Date().toISOString(), devices: [{ platform: 'mobile', push: true, this: false, push_ok_at: new Date(Date.now() - 300000).toISOString(), last_active_at: new Date(Date.now() - 7200000).toISOString() }], recent: [{ id: '5', kind: 'request', created_at: new Date(Date.now() - 180000).toISOString(), read_at: null, deliveries: [{ channel: 'in_app', reason: 'active_device' }, { channel: 'push_mobile', reason: 'mobile_first' }] }] }) }
      if (p === '/api/notifications/read') { S.readBody = JSON.parse(body); return J(200, { read: S.readBody.ids ? S.readBody.ids.length : 0 }) }
      if (p === '/api/events') { S.evAuth = r.request().headers()['authorization'] || null; S.evBody = JSON.parse(body); return J(200, { ok: true, n: S.evBody.events.length }) }
      if (p === '/api/push/key') return J(404, { error: 'push_unavailable' });
      if (p === '/api/invites') return J(200, { invites: [], profiles: {} });
      return J(404, { error: 'not_found' }) });
    await pg.route('https://nanbanqiu-preview.pages.dev/**', r => { const u = new URL(r.request().url()); if (u.pathname.startsWith('/api/')) { api.push('PAGES ' + u.pathname); return r.fulfill({ status: 404, body: '{}' }) } html(r) });
    await pg.route(SB + '/**', r => { const u = r.request().url(); if (u.includes('grant_type=refresh_token')) { REF.n++; const H = { 'access-control-allow-origin': '*' };
        if (REF.mode === 'revoked') return r.fulfill({ status: 400, contentType: 'application/json', headers: H, body: '{"error":"invalid_grant"}' });
        if (REF.mode === 'busy_once' && REF.n === 1) return r.fulfill({ status: 503, contentType: 'application/json', headers: H, body: '{}' });
        return r.fulfill({ status: 200, contentType: 'application/json', headers: H, body: JSON.stringify({ access_token: 'AT2', refresh_token: 'RT2', expires_in: 3600, user: { id: 'sb-1', phone: '61412345678' } }) }) }
      const x = u.includes('/otp') ? { access_token: null } : u.includes('/verify') ? { access_token: 'AT', refresh_token: 'RT', expires_in: 3600, user: { id: 'sb-1', phone: '61412345678' } } : null;
      r.fulfill({ status: x ? 200 : 204, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: x && x.access_token !== null ? JSON.stringify(x) : (x ? '{}' : '') }) });
    await pg.route('https://cdnjs.cloudflare.com/**', r => r.abort()); await pg.route('https://basemaps.cartocdn.com/**', r => r.abort());
    const REF = { n: 0, mode: 'ok' };
    const state = () => pg.evaluate(() => ({ g: GAMES.length, u: Object.keys(USERS).length, v: Object.keys(VEN).length, me: ME && ME.name, net: !!NBQ_NET }));
    // 页面和内存必须一致（11-03 教训）：网页端右上角槽位要和 ME 对得上；手机端没有这个槽位就只看内存
    const uiHdr = () => pg.evaluate(() => { const m = document.querySelector('#meSlot'); return m ? { web: true, me: !!m.querySelector('.me'), login: !!m.querySelector('[data-a="login"]'), ME: !!ME } : { web: false, ME: !!ME } });
    const uiOK = async want => { await pg.settle(300); const h = await uiHdr(); return !h.web || (want ? h.me && !h.login : h.login && !h.me) };
    const login = async () => { await pg.evaluate(() => { openAuth(null) }); await pg.settle(300); await pg.fill('#ph', '0412 345 678'); await pg.click('[data-a="sendCode"]'); await pg.settle(400); await pg.fill('#otp', '123456'); await pg.waitForFunction(() => ME || document.querySelector('#npName'), null, { timeout: 10000 }).catch(() => { }); await pg.settle(300) };

    // ① 预览站：数据仍是演示
    await pg.goto('https://nanbanqiu-preview.pages.dev/'); await pg.settle(600);
    S.now = await pg.evaluate(() => +NOW); let s = await state(); T(tag('预览站：演示数据还在、没有启用真数据'), s.g > 5 && s.net === false && !api.some(x => x.startsWith('PAGES')), s);
    // ② 正式域名未登录
    api.length = 0; await pg.goto('https://nanbanqiu.app/'); await pg.settle(800);
    s = await state(); T(tag('正式域名未登录：演示数据已清空，换成服务器的球场和公开球局（发起人用卡片昵称）'), s.net === true && s.g === 1 && s.u === 1 && s.v === 2 && s.me === null, s);
    T(tag('未登录只读公开球场和公开球局：不带令牌，不读我的资料'), [...api].sort().join() === 'GET /api/games,GET /api/venues' && S.gamesAuth === null, [api, S.gamesAuth]);
    const anon = await pg.evaluate(() => { const l = api.list(); return { n: l.length, host: l[0] && l[0].host && l[0].host.name, spots: l[0] && l[0].spots } });
    // 11-13（上线前审查）：正式站的登录框不能再写「演示：任意手机号和 6 位验证码」（真短信登录下这句是错的，新用户会以为是测试站）
    await pg.evaluate(() => { openAuth(null) }); await pg.settle(400);
    T(tag('正式域名登录框：没有「演示」字样，写明只支持澳洲手机号，协议链接还在'), await pg.evaluate(() => { const p = document.querySelector('#ph'), box = p && p.closest('.sheet, .modal, #sheet, #modal') || document.body, t = box.innerText; return !!p && !t.includes('演示') && t.includes('澳洲手机号') && t.includes('隐私政策') }));
    await pg.evaluate(() => { typeof closeSheet === 'function' ? closeSheet() : closeModal() }); await pg.settle(400);
    T(tag('未登录也能在发现列表里看到公开球局：发起人、余位对得上（4 人局已确认 1 人 → 余 3）'), anon.n === 1 && anon.host === 'Host' && anon.spots === 3, anon);
    // ③ 老用户登录
    api.length = 0; await login(); s = await state();
    T(tag('登录后页面也是已登录的样子（右上角头像）'), await uiOK(true), await uiHdr());
    T(tag('头像印色：库里的色名 paper 换成纸白色值，页面上画的是纸白（不是黑色）'), await pg.evaluate(() => { const h = document.querySelector('#meSlot .av, .av'); return ME.color === '#F4EFE3' && !!h && /F4EFE3/i.test(h.innerHTML) && !/color:\s*paper/i.test(h.innerHTML) }), await pg.evaluate(() => ({ c: ME.color, h: (document.querySelector('.av') || {}).innerHTML?.slice(0, 160) })));
    T(tag('老用户：读入我 / 球局 / 球友'), s.me === 'Sam' && s.g === 1 && s.u === 2 && api.includes('GET /api/games') && api.includes('GET /api/games/mine') && api.includes('GET /api/invites'), [s, api]);
    const g = await pg.evaluate(() => { const c = V(GAMES[0]); return { ntrp: [c.ntrp_min, c.ntrp_max], iso: typeof GAMES[0].starts_at, venue: c.v && c.v.short, spots: c.spots, host: c.host && c.host.name, club: ME.home_club_ids, gender: ME.gender } });
    T(tag('球局字段对得上前台：水平范围、开始时间、球场、空位、发起人'), g.ntrp[0] === 4 && g.ntrp[1] === 6.5 && g.iso === 'string' && g.venue === 'Test TC' && g.spots === 3 && g.host === 'Host', g);
    T(tag('我的常去球场和性别来自数据库'), g.club[0] === V2 && g.gender === 'f', g);
    await pg.evaluate(() => { render() }); await pg.settle(400);
    T(tag('发现列表（距离 / 水平 / 屏蔽过滤）能算出这局真实球局'), (await pg.evaluate(() => api.list().map(c => c.id))).includes('cccccccc-cccc-4ccc-8ccc-cccccccccccc'), await pg.evaluate(() => api.list().length));
    // ③b 通知（第 5 轮）：列表来自服务器，已读回写，本地不再自造，埋点带令牌
    const nt = await pg.evaluate(() => ({ n: NOTIFS.map(x => x.kind + ':' + x.id + ':' + x.read).join(), badge: nrBadgeN(), mine: NOTIFS.every(x => x.user_id === ME.id && x.srv) }));
    // 推送自检：提醒方式里能看到设备订阅状态和最近提醒去向（POST，地址放请求体）
    await pg.evaluate(() => { nrSettings() }); await pg.settle(900);
    { const tx = await pg.evaluate(() => (document.getElementById('nrDiag') || {}).innerText || '');
      T(tag('提醒方式里有「推送自检」：设备订阅状态 + 最近提醒去向'), /推送自检/.test(tx) && /已订阅推送 · 最近送达 5 分钟前/.test(tx) && /有人申请/.test(tx) && /推送到手机/.test(tx), tx);
      T(tag('推送自检：POST 请求体带 endpoint（无订阅时为 null），不在网址里'), S.diagBody && 'endpoint' in S.diagBody && api.includes('POST /api/me/push-diag'), [S.diagBody, api.filter(x => /push-diag/.test(x))]) }
    await pg.evaluate(() => { typeof closeSheet === 'function' ? closeSheet() : closeModal() }); await pg.settle(300);
    T(tag('通知：登录后读服务器列表，只显示有球局文案的种类（邀约 / 赛后先不显示）'), api.includes('GET /api/notifications') && nt.n === 'request:9:false,approved:8:true' && nt.mine, [nt, api]);
    T(tag('通知：红点按未读数算（1 条）'), nt.badge === 1, nt);
    const loc = await pg.evaluate(h => { const n0 = NOTIFS.length; notify(ME.id, 'soon', GAMES[0].id, null); notifyInv(ME.id, 'invite', { id: 'i1' }, h); return [n0, NOTIFS.length] }, HOST);
    api.length = 0; S.extraNotif = true; await pg.evaluate(() => nbqNtfTick()); await pg.settle(600);
    T(tag('通知：轮询到新通知 → 同时重新读入球局（对方同意 / 婉拒后状态跟着变）'), api.includes('GET /api/notifications') && api.includes('GET /api/games/mine') && await pg.evaluate(() => NOTIFS.some(x => x.id === 10)), api);
    api.length = 0; await pg.evaluate(() => nbqNtfTick()); await pg.settle(400);
    T(tag('通知：没有新的就不重读球局'), !api.includes('GET /api/games/mine'), api);
    S.extraNotif = false; await pg.evaluate(() => nbqNtfTick()); await pg.settle(300);
    api.length = 0; await pg.evaluate(() => { const n = NOTIFS.find(x => x.kind === 'request'); PARTS.splice(0, PARTS.length, ...PARTS.filter(p => !(p.game_id === n.game_id && p.user_id === n.from))); ntfOpen(n) }); await pg.settle(600);
    T(tag('通知：点「申请加入」时内存里没有这条申请 → 先重读球局再打开'), api.includes('GET /api/games/mine'), api);
    T(tag('通知：真实模式下前台不再自己造通知'), loc[0] === loc[1], loc);
    const both = await pg.evaluate(async () => { NOTIFS.length = 0; const a = nbqPullNotifs(), b = nbqPullNotifs(); await Promise.all([a, b]); return NOTIFS.length });
    T(tag('通知：两处同时读，后到的等先到的读完（不会拿到空列表）'), both > 0, both);
    const rr = await pg.evaluate(async () => { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); let n = 0; const o = render; render = function () { n++; return o.apply(this, arguments) }; await nbqRefresh(); await new Promise(r => setTimeout(r, 120)); render = o; return n });
    T(tag('任何一次把数据读进内存（nbqRefresh / 登录 / 恢复）之后，页面一定重画'), rr >= 1, rr);
    const opened = await pg.evaluate(() => { UI.msgTab = 'chat'; nbqOpenFromPush(true); return NR_PLAT + ':' + UI.msgTab });
    T(tag('点推送（页面已开着）→ 手机端切到「消息 → 通知」页（网页端不动）'), opened === 'mobile:ntf' || opened === 'desktop:chat', opened);
    await pg.evaluate(() => { NOTIFS.find(x => x.id === 9).read = true; return nbqFlushReads() }); await pg.settle(300);
    T(tag('通知：本地点开（已读）会回写服务器，且只写一次'), S.readBody && S.readBody.ids.join() === '9', S.readBody);
    S.readBody = null; await pg.evaluate(() => nbqFlushReads()); await pg.settle(200);
    T(tag('通知：已同步过的不再重复回写'), S.readBody === null);
    await pg.evaluate(() => { track('filter_open'); anFlush() }); await pg.settle(400);
    T(tag('埋点：已登录时带令牌发到 /api/events（服务端才认 user_id）'), S.evAuth && /^Bearer /.test(S.evAuth) && S.evBody.v === 2 && S.evBody.events.some(e => e.ev === 'filter_open' && e.uid), [S.evAuth, S.evBody && S.evBody.events.map(e => e.ev)]);
    T(tag('推送：服务器没配公钥（404）→ 安静跳过，不报错'), await pg.evaluate(() => nbqPushSub()) === false);
    // ⑤ 刷新自动恢复
    // 刷新过程中右上角不能闪出「登录」（11-03）：从页面一开始就记录槽位每次变化
    await pg.addInitScript(() => { window.__hdr = []; const rec = () => { const m = document.querySelector('#meSlot'); if (m) window.__hdr.push(m.querySelector('[data-a="login"]') ? 'login' : m.querySelector('.me') ? 'me' : m.querySelector('[data-wait]') ? 'wait' : 'empty'); if (/正在恢复登录|还没有登录|登录后(查看|接收)/.test(document.body ? document.body.innerText : '')) window.__hdr.push('text') }; new MutationObserver(rec).observe(document, { childList: true, subtree: true, characterData: true }) });
    api.length = 0; await pg.reload(); await pg.settle(1200); s = await state();
    T(tag('刷新后自动恢复登录并读入'), s.me === 'Sam' && s.g === 1 && api.includes('GET /api/games/mine'), [s, api]);
    { const seq = await pg.evaluate(() => window.__hdr || []); T(tag('刷新过程中右上角没有闪出「登录」，也没有占位：一开始就是头像（用上次的快照）'), !seq.includes('login') && !seq.includes('wait') && !seq.includes('text'), seq) }
    // 「正在恢复登录」期间，所有需要登录的页面都不能画登录按钮 / 「登录后…」（11-03：全站排查）
    { const r = await pg.evaluate(async () => { const me = ME; const bad = []; ME = null; SBA_WAIT = true;
        const tabs = typeof go === 'function' ? ['mine', 'notif', 'me', 'home'] : ['mine', 'home']; 
        for (const t of tabs) { try { if (typeof go === 'function') go(t); else { UI.tab = t; render() } } catch (e) { bad.push('err ' + t) } await new Promise(r => setTimeout(r, 150));
          const body = document.body.innerText; if (document.querySelector('[data-a="login"]') || /还没有登录|登录后/.test(body)) bad.push(t) }
        ME = me; SBA_WAIT = false; render(); return bad });
      T(tag('恢复登录期间：我的球局 / 通知 / 我的 / 首页都不画「登录」'), r.length === 0, r) }
    { const hdr = await pg.evaluate(() => { const m = document.querySelector('#meSlot'); return m ? { web: true, login: !!m.querySelector('[data-a="login"]'), me: !!m.querySelector('.me') } : { web: false } });
      T(tag('刷新后页面也画成已登录（网页端右上角是头像，不再是「登录」按钮）'), !hdr.web || (hdr.me && !hdr.login), hdr); }
    // ⑤c 新版本提示 + 最低前端版本（#63 第 3 件，ADR 0013）
    { const bar = () => pg.evaluate(() => { const b = document.getElementById('nbqUpd'); return b ? b.innerText : null });
      const back = (ago) => pg.evaluate(m => { NBQ_UPD.at -= m; document.dispatchEvent(new Event('visibilitychange')) }, ago);
      S.build = S.remote = '1763017920-aaaaaaa'; S.hdrs.length = 0; await pg.reload(); await pg.settle(1200);
      T(tag('部署的页面带构建号：每个 /api 请求都带 X-NBQ-Build'), S.hdrs.length > 0 && S.hdrs.every(h => h === S.build), S.hdrs);
      S.bj = 0; await back(5 * 60e3); await pg.settle(300);
      T(tag('回到前台但距上次检查不到 10 分钟：不去取 /build.json'), S.bj === 0, S.bj);
      await back(11 * 60e3); await pg.settle(400);
      T(tag('超过 10 分钟回到前台：取 /build.json；线上没变 → 不提示'), S.bj === 1 && await bar() === null, [S.bj, await bar()]);
      S.remote = '1763099999-bbbbbbb';
      const typing = await pg.evaluate(async () => { const i = document.createElement('input'); i.id = '__typ'; document.body.appendChild(i); i.focus(); NBQ_UPD.at -= 11 * 60e3; document.dispatchEvent(new Event('visibilitychange')); await new Promise(r => setTimeout(r, 500)); return { bar: !!document.getElementById('nbqUpd'), focus: document.activeElement === i } });
      T(tag('有新版本但正在输入：先不出提示、不抢焦点'), !typing.bar && typing.focus, typing);
      await pg.evaluate(() => { const i = document.getElementById('__typ'); i.blur(); i.remove() }); await pg.settle(700);
      T(tag('离开输入框后出现不打断的提示「有新版本 · 点一下刷新」（不是弹层）'), await bar() === '有新版本 · 点一下刷新' && await pg.evaluate(() => { const b = document.getElementById('nbqUpd'), r = b.getBoundingClientRect(); return getComputedStyle(b).position === 'fixed' && r.height < 60 && r.top >= 0 && r.bottom <= innerHeight }), await bar());
      S.build = S.remote; S.hdrs.length = 0; await Promise.all([pg.waitForNavigation(), pg.click('#nbqUpd')]); await pg.settle(1500); s = await state();
      T(tag('点提示 → 重新载入成新版，仍是登录状态（页面也是已登录样子），提示消失'), s.me === 'Sam' && await pg.evaluate(() => NBQ_BUILD) === S.build && await bar() === null && await uiOK(true), [s, await bar()]);
      S.force426 = true; const r426 = await pg.evaluate(async () => { const r = await NBQ_NET.get('/api/games/mine'); return { code: r.code, me: !!ME, tk: !!localStorage.getItem('nbq_sb') } }); await pg.settle(300);
      T(tag('接口回 426 client_outdated：显示同一条新版本提示，不退出登录'), r426.code === 'client_outdated' && r426.me && r426.tk && await bar() === '有新版本 · 点一下刷新', [r426, await bar()]);
      T(tag('client_outdated 有中文提示（不落到「出了点问题」）'), await pg.evaluate(() => apiErrText('client_outdated')) === '有新版本 · 点一下刷新');
      S.force426 = false; S.build = S.remote = null; await pg.reload(); await pg.settle(1200);
      T(tag('本地 / 测试拼的页面（没有构建号）：不带 X-NBQ-Build、回到前台也不检查'), await pg.evaluate(() => NBQ_BUILD) === '' && (S.bj = 0, await back(11 * 60e3), await pg.settle(300), S.bj === 0), S.bj); }
    // ⑤b 令牌过期后重新打开（手机桌面应用隔一阵再开）
    const expire = () => pg.evaluate(() => { const k = JSON.parse(localStorage.getItem('nbq_sb')); k.expires_at = Math.floor(Date.now() / 1000) - 7200; localStorage.setItem('nbq_sb', JSON.stringify(k)) });
    await expire(); REF.n = 0; REF.mode = 'ok'; await pg.reload(); await pg.settle(1500); s = await state();
    T(tag('令牌过期后重开：自动续期并登录，只刷新一次'), s.me === 'Sam' && REF.n === 1, [s, REF.n]);
    T(tag('令牌过期后重开：页面也是已登录的样子'), await uiOK(true), await uiHdr());
    // 快照：别人的快照不用、并且删掉（换了账号不能看到上一个人的数据）
    { const r = await pg.evaluate(() => { const t = JSON.parse(localStorage.getItem('nbq_snap')); t.uid = 'someone-else'; localStorage.setItem('nbq_snap', JSON.stringify(t)); NBQ_STALE = false; nbqClear(); const ok = nbqSnapLoad(); return [ok, !!localStorage.getItem('nbq_snap'), !!ME] });
      T(tag('快照：属于别的账号 → 不用，并且删掉'), r[0] === false && r[1] === false && r[2] === false, r) }
    await pg.reload(); await pg.settle(1800);   // 回到已登录、并重新存好快照
    await expire(); REF.n = 0; REF.mode = 'busy_once'; api.length = 0; await pg.reload(); await pg.settle(600); s = await state();
    T(tag('续期碰上服务端临时出错：先显示上次的快照（已登录样子），登录态保留'), s.me === 'Sam' && await pg.evaluate(() => !!localStorage.getItem('nbq_sb') && NBQ_STALE === true), s);
    { const w = await pg.evaluate(() => nbqJoin('GX')); T(tag('快照期间（数据可能是旧的）：写操作不放行、不发请求'), w === null && !api.some(x => /\/api\/games\/GX\/join/.test(x)), [w, api]) }
    await pg.waitForFunction(() => typeof ME !== 'undefined' && ME && ME.name === 'Sam' && NBQ_STALE === false, null, { timeout: 8000 }).catch(() => { }); s = await state();
    T(tag('自动重试后换上最新数据（不用重新输手机号），快照标记解除'), s.me === 'Sam' && REF.n >= 2 && await pg.evaluate(() => NBQ_STALE === false), [s, REF.n]);
    await expire(); REF.mode = 'revoked'; await pg.reload(); await pg.settle(1200); s = await state();
    T(tag('令牌确实被撤销（400）：才清掉登录，快照也删掉'), s.me === null && await pg.evaluate(() => !localStorage.getItem('nbq_sb') && !localStorage.getItem('nbq_snap')), s);
    T(tag('令牌被撤销后页面回到未登录样子'), await uiOK(false), await uiHdr());
    REF.mode = 'ok';
    // ⑥ 退出
    await pg.evaluate(() => { sbaLogout(); ME = null; render() }); await pg.settle(700); s = await state();
    T(tag('退出：我的数据清空，回到公开球局'), s.me === null && s.g === 1 && s.u === 1, s);
    T(tag('退出后页面也回到未登录的样子（右上角「登录」）'), await uiOK(false), await uiHdr());
    T(tag('退出后快照已删'), await pg.evaluate(() => !localStorage.getItem('nbq_snap')));
    // ④ 新号码
    S.registered = false; api.length = 0; await pg.reload(); await pg.settle(600); await pg.evaluate(() => { localStorage.clear() }); await pg.reload(); await pg.settle(600);
    await login(); T(tag('新号码：进填资料页，Home Club 选项来自服务器球场'), await pg.$('#npName') !== null && (await pg.$$('[data-npc]')).length === 2, api);
    await pg.evaluate(() => { typeof closeSheet === 'function' ? closeSheet() : closeModal() }); await pg.settle(500);
    await pg.evaluate(() => { openAuth(null) }); await pg.settle(800);
    T(tag('新号码划掉资料卡后再点登录：直接回到填资料，不再要手机号 / 验证码'), await pg.$('#npName') !== null && await pg.$('#ph') === null, await pg.evaluate(() => !!document.querySelector('#ph')));
    await pg.fill('#npName', 'Newbie'); await pg.fill('#npLast', 'z'); await pg.click(`[data-npc="${V2}"]`); await pg.settle(200); await pg.click('[data-sx="npg"][data-v="f"]'); await pg.settle(200);
    await pg.check('#npAdult'); await pg.click('[data-a="npDone"]'); await pg.settle(1200); s = await state();
    T(tag('新号码注册：昵称 / 姓 / UTR / 成年确认'), S.regBody && S.regBody.nickname === 'Newbie' && S.regBody.last_initial === 'Z' && S.regBody.adult === true && typeof S.regBody.utr === 'number', S.regBody);
    T(tag('新号码：常去球场和性别单独保存，然后读入'), S.clubsBody && S.clubsBody.venue_ids[0] === V2 && S.genderBody && S.genderBody.gender === 'f' && s.me === 'Newbie' && s.g === 1, [S.clubsBody, S.genderBody, s]);
    T(tag('全程没有页面报错'), errs.length === 0, errs);
    await ctx.close();
  }
  await b.close(); console.log(`\nreal_data: ${pass} 通过, ${fail} 失败`); process.exit(fail ? 1 : 0);
})();
