// 分享链接 /g/码 在真实模式下必须打开那一场球局（11-13 上线前审查发现）。
//   为什么：真实模式的球局是异步读进来的，手机端启动时按分享码找球局只找一次（那时内存还是空的）→ 微信群里点开链接的人看到的是首页列表，不是那一局。
//           这是「发起人分享 → 朋友点开 → 申请」的主链路；演示数据是同步的，所以原有测试都测不到。
//   查什么（两端，未登录）：① 球局在公开列表里：读完自动打开那一局  ② 不在列表里（超过 100 场 / 开打超过 30 分钟）：按分享码单独取，再打开
//                          ③ 码不存在：留在首页、有提示、不报错  ④ 没有分享码的普通打开不受影响、不多发 /api/game
//   查不到什么：微信内置浏览器、真机上的跳转（真机清单）。
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const DIR = process.env.NBQ_DIR || path.join(__dirname, '..', '..');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 600) : '')) };
const V1 = '11111111-1111-4111-8111-111111111111', HOST = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', G1 = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', G2 = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const VENUES = [{ id: V1, name: 'Test Tennis Club', short_name: 'Test TC', suburb: 'Malvern', surfaces: ['hard'], courts: 4, lights: true, indoor: false, booking_url: null, lat: -37.86, lng: 145.03 }];
const game = (id, code, now) => ({ id, share_code: code, host_id: HOST, host_nickname: 'Host', host_utr: 5.5, venue_id: V1, venue_name: 'Test Tennis Club', short_name: 'Test TC', starts_at: new Date(now + 30 * 3600e3).toISOString(), duration_min: 120, game_type: 'doubles', capacity: 4, utr_min: 4, utr_max: 6.5,
  note: '', status: 'open', tags: [], visibility: 'public', filled: 0, join_mode: 'approve', city: 'melb', approved_count: 1, pending_count: 0, spots_left: 3 });
(async () => {
  const b = await chromium.launch({ executablePath: process.env.NBQ_CHROMIUM || '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  for (const f of ['南伴球_PWA.html', '南伴球_Web.html']) {
    const W = f.includes('Web'), tag = s => `${f} ${s}`;
    const open = async url => {
      const ctx = await b.newContext({ viewport: W ? { width: 1360, height: 860 } : { width: 390, height: 844 } }), pg = await ctx.newPage(), errs = [], api = []; pg.on('pageerror', e => errs.push(e.message));
      await pg.route('https://nanbanqiu.app/**', async r => { const u = new URL(r.request().url()); if (!u.pathname.startsWith('/api/')) return r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: fs.readFileSync(path.join(DIR, f)) });
        const now = await pg.evaluate(() => Date.now()).catch(() => Date.now()), J = (s, d) => r.fulfill({ status: s, contentType: 'application/json', body: JSON.stringify(d) }); api.push(u.pathname + u.search);
        if (u.pathname === '/api/venues') return J(200, { venues: VENUES });
        if (u.pathname === '/api/games') { await new Promise(x => setTimeout(x, 150)); return J(200, { games: [game(G1, 'Ab3k', now)], anon: true }) }   // 晚一点才回来：启动时内存里一定还没有
        if (u.pathname === '/api/game') return u.searchParams.get('code') === 'Zz9q' ? J(200, { game: game(G2, 'Zz9q', now), anon: true }) : J(404, { error: 'not_found' });
        return J(404, { error: 'not_found' }) });
      await pg.route(u => !/^https:\/\/nanbanqiu\.app\//.test(u.toString()), r => r.abort());
      await pg.goto(url); await pg.waitForFunction(() => typeof GAMES !== 'undefined' && GAMES.length > 0, null, { timeout: 15000 }).catch(() => { }); await pg.settle(1200);
      // 页面上正在看的球局：手机端是详情页，网页端是分享落地页
      const shown = () => pg.evaluate(() => { const d = document.querySelector('#detail'); if (d) return d.classList.contains('show') ? UI.detail : null; const c = UI.landing && api.byCode && api.byCode(UI.landing); return c ? c.id : null });
      return { pg, ctx, errs, api, shown } };

    let s = await open('https://nanbanqiu.app/g/Ab3k');
    T(tag('① 球局在公开列表里：读完自动打开这一局'), await s.shown() === G1, { shown: await s.shown(), api: s.api });
    T(tag('① 页面上看得到这局的球场名'), await s.pg.evaluate(() => document.body.innerText.includes('Test Tennis Club')));
    T(tag('① 没有页面报错'), !s.errs.length, s.errs); await s.ctx.close();

    s = await open('https://nanbanqiu.app/g/Zz9q');
    T(tag('② 不在公开列表里：按分享码单独取'), s.api.some(a => a.startsWith('/api/game?code=Zz9q')), s.api);
    T(tag('② 取到后打开这一局'), await s.shown() === G2, { shown: await s.shown() });
    T(tag('② 没有页面报错'), !s.errs.length, s.errs); await s.ctx.close();

    s = await open('https://nanbanqiu.app/g/None1');
    T(tag('③ 码不存在：不打开详情'), await s.shown() === null, { shown: await s.shown() });
    T(tag('③ 首页球局照常显示、没有页面报错'), await s.pg.evaluate(() => GAMES.length === 1) && !s.errs.length, s.errs); await s.ctx.close();

    s = await open('https://nanbanqiu.app/');
    T(tag('④ 普通打开：不打开详情、不发 /api/game'), await s.shown() === null && !s.api.some(a => a.startsWith('/api/game?')), s.api); await s.ctx.close();
  }
  await b.close();
  console.log(`share_link: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
})();
