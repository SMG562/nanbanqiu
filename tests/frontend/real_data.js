// 5g-3 前台接入第 4 轮（4a）：真实数据只在 nanbanqiu.app 启用（两端）。用假的 Supabase 和 /api 在浏览器里拦截：
//   ① 预览站 pages.dev：数据仍是演示，不发 /api 请求  ② nanbanqiu.app 未登录：演示数据被清空，只读公开球场
//   ③ 老用户登录：读入我 / 球局 / 球友，球局卡片字段对得上前台（ntrp_min…）  ④ 新号码：选球场 → 注册 → 常去球场 → 读入
//   ⑤ 刷新页面自动恢复  ⑥ 退出清空  ⑦ 全程没有页面报错
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
    const S = { registered: true, meUser: { id: ME, member_no: 1288, nickname: 'Sam', last_initial: 'L', utr: 5, utr_estimated: false, avatar_kind: 'letter', avatar_animal: null, avatar_color: 'paper', card_theme: 'court', created_at: iso(-100), gender: 'f', club_ids: [V2] }, now: Date.now(), regBody: null, clubsBody: null, genderBody: null };
    const tag = s => `${f} ${s}`, GM = () => ({ ...GAME, starts_at: new Date(S.now + 30 * 3600e3).toISOString() });   // 页面里的时钟被测试框架固定在 10-14，球局时间跟着页面走
    const html = r => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: fs.readFileSync(path.join(DIR, f)) });
    await pg.route('https://nanbanqiu.app/**', r => { const u = new URL(r.request().url()); if (!u.pathname.startsWith('/api/')) return html(r);
      const m = r.request().method(), p = u.pathname, body = r.request().postData(); api.push(m + ' ' + p); if (p === '/api/games') S.gamesAuth = r.request().headers()['authorization'] || null; const J = (s, d) => r.fulfill({ status: s, contentType: 'application/json', body: JSON.stringify(d) });
      if (p === '/api/venues') return J(200, { venues: VENUES });
      if (p === '/api/me' && m === 'GET') return J(200, S.registered ? { registered: true, user: S.meUser } : { registered: false });
      if (p === '/api/me' && m === 'PATCH') { S.genderBody = JSON.parse(body); return J(200, { ok: true }) }
      if (p === '/api/me/register') { S.regBody = JSON.parse(body); S.registered = true; S.meUser = { ...S.meUser, nickname: S.regBody.nickname, club_ids: [] }; return J(200, { registered: true, user: S.meUser }) }
      if (p === '/api/me/clubs') { S.clubsBody = JSON.parse(body); S.meUser.club_ids = S.clubsBody.venue_ids; return J(200, { ok: true }) }
      if (p === '/api/games') return J(200, { games: [GM()] });
      if (p === '/api/games/mine') return J(200, { games: [GM()], participants: [{ game_id: G1, user_id: HOST, role: 'host', status: 'approved', created_at: iso(-5), message: '' }], profiles: { [HOST]: card(HOST, 'Host', 1200) } });
      if (p === '/api/invites') return J(200, { invites: [], profiles: {} });
      return J(404, { error: 'not_found' }) });
    await pg.route('https://nanbanqiu-preview.pages.dev/**', r => { const u = new URL(r.request().url()); if (u.pathname.startsWith('/api/')) { api.push('PAGES ' + u.pathname); return r.fulfill({ status: 404, body: '{}' }) } html(r) });
    await pg.route(SB + '/**', r => { const u = r.request().url(); const x = u.includes('/otp') ? { access_token: null } : u.includes('/verify') ? { access_token: 'AT', refresh_token: 'RT', expires_in: 3600, user: { id: 'sb-1', phone: '61412345678' } } : null;
      r.fulfill({ status: x ? 200 : 204, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: x && x.access_token !== null ? JSON.stringify(x) : (x ? '{}' : '') }) });
    await pg.route('https://cdnjs.cloudflare.com/**', r => r.abort()); await pg.route('https://basemaps.cartocdn.com/**', r => r.abort());
    const state = () => pg.evaluate(() => ({ g: GAMES.length, u: Object.keys(USERS).length, v: Object.keys(VEN).length, me: ME && ME.name, net: !!NBQ_NET }));
    const login = async () => { await pg.evaluate(() => { openAuth(null) }); await pg.settle(300); await pg.fill('#ph', '0412 345 678'); await pg.click('[data-a="sendCode"]'); await pg.settle(400); await pg.fill('#otp', '123456'); await pg.settle(900) };

    // ① 预览站：数据仍是演示
    await pg.goto('https://nanbanqiu-preview.pages.dev/'); await pg.settle(600);
    S.now = await pg.evaluate(() => +NOW); let s = await state(); T(tag('预览站：演示数据还在、没有启用真数据'), s.g > 5 && s.net === false && !api.some(x => x.startsWith('PAGES')), s);
    // ② 正式域名未登录
    api.length = 0; await pg.goto('https://nanbanqiu.app/'); await pg.settle(800);
    s = await state(); T(tag('正式域名未登录：演示数据已清空，换成服务器的球场和公开球局（发起人用卡片昵称）'), s.net === true && s.g === 1 && s.u === 1 && s.v === 2 && s.me === null, s);
    T(tag('未登录只读公开球场和公开球局：不带令牌，不读我的资料'), [...api].sort().join() === 'GET /api/games,GET /api/venues' && S.gamesAuth === null, [api, S.gamesAuth]);
    const anon = await pg.evaluate(() => { const l = api.list(); return { n: l.length, host: l[0] && l[0].host && l[0].host.name, spots: l[0] && l[0].spots } });
    T(tag('未登录也能在发现列表里看到公开球局：发起人、余位对得上（4 人局已确认 1 人 → 余 3）'), anon.n === 1 && anon.host === 'Host' && anon.spots === 3, anon);
    // ③ 老用户登录
    api.length = 0; await login(); s = await state();
    T(tag('老用户：读入我 / 球局 / 球友'), s.me === 'Sam' && s.g === 1 && s.u === 2 && api.includes('GET /api/games') && api.includes('GET /api/games/mine') && api.includes('GET /api/invites'), [s, api]);
    const g = await pg.evaluate(() => { const c = V(GAMES[0]); return { ntrp: [c.ntrp_min, c.ntrp_max], iso: typeof GAMES[0].starts_at, venue: c.v && c.v.short, spots: c.spots, host: c.host && c.host.name, club: ME.home_club_ids, gender: ME.gender } });
    T(tag('球局字段对得上前台：水平范围、开始时间、球场、空位、发起人'), g.ntrp[0] === 4 && g.ntrp[1] === 6.5 && g.iso === 'string' && g.venue === 'Test TC' && g.spots === 3 && g.host === 'Host', g);
    T(tag('我的常去球场和性别来自数据库'), g.club[0] === V2 && g.gender === 'f', g);
    await pg.evaluate(() => { render() }); await pg.settle(400);
    T(tag('发现列表（距离 / 水平 / 屏蔽过滤）能算出这局真实球局'), (await pg.evaluate(() => api.list().map(c => c.id))).includes('cccccccc-cccc-4ccc-8ccc-cccccccccccc'), await pg.evaluate(() => api.list().length));
    // ⑤ 刷新自动恢复
    api.length = 0; await pg.reload(); await pg.settle(1200); s = await state();
    T(tag('刷新后自动恢复登录并读入'), s.me === 'Sam' && s.g === 1 && api.includes('GET /api/games/mine'), [s, api]);
    // ⑥ 退出
    await pg.evaluate(() => { sbaLogout(); ME = null; render() }); await pg.settle(700); s = await state();
    T(tag('退出：我的数据清空，回到公开球局'), s.me === null && s.g === 1 && s.u === 1, s);
    // ④ 新号码
    S.registered = false; api.length = 0; await pg.reload(); await pg.settle(600); await pg.evaluate(() => { localStorage.clear() }); await pg.reload(); await pg.settle(600);
    await login(); T(tag('新号码：进填资料页，Home Club 选项来自服务器球场'), await pg.$('#npName') !== null && (await pg.$$('[data-npc]')).length === 2, api);
    await pg.fill('#npName', 'Newbie'); await pg.fill('#npLast', 'z'); await pg.click(`[data-npc="${V2}"]`); await pg.settle(200); await pg.click('[data-sx="npg"][data-v="f"]'); await pg.settle(200);
    await pg.check('#npAdult'); await pg.click('[data-a="npDone"]'); await pg.settle(1200); s = await state();
    T(tag('新号码注册：昵称 / 姓 / UTR / 成年确认'), S.regBody && S.regBody.nickname === 'Newbie' && S.regBody.last_initial === 'Z' && S.regBody.adult === true && typeof S.regBody.utr === 'number', S.regBody);
    T(tag('新号码：常去球场和性别单独保存，然后读入'), S.clubsBody && S.clubsBody.venue_ids[0] === V2 && S.genderBody && S.genderBody.gender === 'f' && s.me === 'Newbie' && s.g === 1, [S.clubsBody, S.genderBody, s]);
    T(tag('全程没有页面报错'), errs.length === 0, errs);
    await ctx.close();
  }
  await b.close(); console.log(`\nreal_data: ${pass} 通过, ${fail} 失败`); process.exit(fail ? 1 : 0);
})();
