// 球员卡显示球拍（#60 PR-C2）：真实模式（假 Supabase + 假 /api），两端各开 / 关开关：
//   别人的球员卡弹层：有拍 → 显示（第一把带「主力」）；没拍 / 已注销 → 不出栏；开关关着 → 不显示；
//   自己的球拍不被卡片里的 rackets 冲掉（/api/me/rackets 读失败时沿用旧的，读到了以它为准）；刷新后（清空内存 → 重读）还在。
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const DIR = process.env.NBQ_DIR || path.join(__dirname, '..', '..');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 600) : '')) };
const SB = 'https://xosrdkrkfxkdrwldfhac.supabase.co', ME = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', P1 = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', P2 = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', P3 = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3';
const card = (id, n, no, o = {}) => ({ id, member_no: no, nickname: n, last_initial: 'X', utr: 5, avatar_kind: 'letter', avatar_animal: null, avatar_color: 'paper', seal_roll: 0, card_theme: 'court', card_venue_id: null, played: 0, hosted: 0, kudos: 0, level: 1, gone: false, rackets: [], ...o });
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  for (const f of ['南伴球_PWA.html', '南伴球_Web.html']) for (const on of [true, false]) {
    const W = f.includes('Web'), tag = s => `${W ? 'Web' : 'PWA'}${on ? '' : '（开关关）'} ${s}`;
    const ctx = await b.newContext({ viewport: W ? { width: 1360, height: 860 } : { width: 390, height: 844 } });
    const pg = await ctx.newPage(), errs = []; pg.on('pageerror', e => errs.push(e.message));
    if (on) await pg.addInitScript(() => { try { localStorage.setItem('nbq_ff_rackets', '1') } catch (_) { } });
    const me = { id: ME, member_no: 1288, nickname: 'Sam', last_initial: 'L', utr: 5, utr_estimated: false, avatar_kind: 'letter', avatar_animal: null, avatar_color: 'paper', card_theme: 'court', created_at: new Date().toISOString(), gender: null, club_ids: [], pact_accepted_at: new Date().toISOString() };
    const S = { myRk: [{ slot: 1, brand: 'Head', series: 'Speed', catalog_id: null }], getFail: false };
    const profiles = () => ({ [ME]: card(ME, 'Sam', 1288, { rackets: [] }), [P1]: card(P1, 'Pat', 1001, { rackets: [{ slot: 1, brand: 'Wilson', series: 'Blade', catalog_id: null }, { slot: 2, brand: null, series: '老拍', catalog_id: null }] }),
      [P2]: card(P2, 'Quinn', 1002), [P3]: card(P3, 'Gone', 1003, { gone: true }) });
    await pg.route('https://nanbanqiu.app/**', async r => { const u = new URL(r.request().url()); if (!u.pathname.startsWith('/api/')) return r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: fs.readFileSync(path.join(DIR, f)) });
      const m = r.request().method(), p = u.pathname; const J = (s, d) => r.fulfill({ status: s, contentType: 'application/json', body: JSON.stringify(d) });
      if (m !== 'GET') return J(200, {});
      if (p === '/api/me/rackets') return S.getFail ? J(500, { error: 'server' }) : J(200, { rackets: S.myRk });
      if (p === '/api/venues') return J(200, { venues: [] }); if (p === '/api/me') return J(200, { registered: true, user: me }); if (p === '/api/games') return J(200, { games: [] });
      if (p === '/api/games/mine') return J(200, { games: [], participants: [], profiles: profiles() }); if (p === '/api/invites') return J(200, { invites: [], profiles: {} });
      return J(404, { error: 'not_found' }) });
    await pg.route(SB + '/**', r => { const v = r.request().url().includes('/verify');
      r.fulfill({ status: v ? 200 : 204, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: v ? JSON.stringify({ access_token: 'AT', refresh_token: 'RT', expires_in: 3600, user: { id: 'sb-1', phone: '61412345678' } }) : '' }) });
    await pg.route('https://cdnjs.cloudflare.com/**', r => r.abort()); await pg.route('https://basemaps.cartocdn.com/**', r => r.abort());
    const until = async (fn, n = 30) => { const t0 = Date.now(); while (Date.now() - t0 < n * 200) { try { if (await fn()) return true } catch (_) { } await new Promise(r => setTimeout(r, 100)) } return false };
    const login = async () => { await pg.evaluate(() => { openAuth(null) }); await pg.settle(300); await pg.fill('#ph', '0412 345 678'); await pg.click('[data-a="sendCode"]'); await pg.settle(400); await pg.fill('#otp', '123456');
      await pg.waitForFunction(() => typeof ME !== 'undefined' && ME && ME.name === 'Sam', null, { timeout: 10000 }).catch(() => { }); await pg.settle(300) };
    // 打开别人的球员卡弹层，读弹层里画出来的球拍行（DOM）；null = 没有这一栏
    const cardRk = async uid => { await pg.evaluate(() => { try { closeSheet() } catch (_) { } try { closeModal() } catch (_) { } }); await pg.evaluate(u => openCard(u), uid); await pg.settle(300);
      return pg.evaluate(() => { const e = document.querySelector('#sheet .rk-pc, #modal .rk-pc'); return e ? [...e.querySelectorAll('.rk-pi')].map(x => x.textContent).join('|') : null }) };

    await pg.goto('https://nanbanqiu.app/'); await pg.settle(600); await login();
    await until(() => pg.evaluate(() => Object.keys(USERS).length >= 4));
    if (!on) {
      for (const [u, n] of [[P1, '有拍的人'], [P2, '没拍的人']]) T(tag(n + '：弹层里没有球拍栏'), await cardRk(u) === null);
      T(tag('无脚本错误'), errs.length === 0, errs); await ctx.close(); continue }
    T(tag('有拍的人：主力 + 第二把（品牌为空只显示系列）'), await cardRk(P1) === '主力Wilson Blade|老拍', await cardRk(P1));
    T(tag('没拍的人：不出空栏'), await cardRk(P2) === null);
    T(tag('已注销的人：不出球拍栏'), await cardRk(P3) === null);
    T(tag('我自己的球拍没被卡片里的 rackets 冲掉'), await pg.evaluate(() => JSON.stringify(ME.rackets.map(r => r.series))) === '["Speed"]');
    // 刷新：清空内存 → 重读 → 还在
    await pg.reload(); await until(() => pg.evaluate(() => typeof ME !== 'undefined' && !!ME && USERS && Object.keys(USERS).length >= 4 && !NBQ_STALE));
    T(tag('刷新后：别人的球拍还在'), await until(async () => await cardRk(P1) === '主力Wilson Blade|老拍'), await cardRk(P1));
    // 自己的球拍读失败：沿用旧的，不被卡片的空列表冲掉
    S.getFail = true; await pg.evaluate(() => nbqRefresh()); await pg.settle(300);
    T(tag('我的球拍读失败：沿用旧的'), await pg.evaluate(() => JSON.stringify((ME.rackets || []).map(r => r.series))) === '["Speed"]');
    T(tag('无脚本错误'), errs.length === 0, errs); await ctx.close();
  }
  await b.close(); console.log(`racket_card: ${pass} 通过, ${fail} 失败`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1) });
