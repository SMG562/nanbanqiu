// 5g-3 前台接入第 6 轮（6c）：屏蔽 / 举报在真实模式（nanbanqiu.app）走接口（两端，假 Supabase + 有状态的假 /api）：
//   屏蔽名单登录时读入（刷新不丢）· 屏蔽 / 解除屏蔽调接口 · 举报（点原因即提交；选「其他」必须写说明；重复举报的提示）。
//   流程：先调接口 → 成功后重新读入 → 页面以服务器为准；点击走真实的 data-a 事件处理，不是直接调函数
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const DIR = process.env.NBQ_DIR || path.join(__dirname, '..', '..');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 600) : '')) };
const SB = 'https://xosrdkrkfxkdrwldfhac.supabase.co';
const U = c => `${c.repeat(8)}-${c.repeat(4)}-4${c.repeat(3)}-8${c.repeat(3)}-${c.repeat(12)}`;
const V1 = U('1'), ME = U('a'), HOST = U('b'), OLD = U('d');
const card = (id, n, no) => ({ id, member_no: no, nickname: n, last_initial: 'W', utr: 5.5, avatar_kind: 'letter', avatar_animal: null, avatar_color: 'paper', seal_roll: 3, card_theme: 'court', played: 4, hosted: 1, kudos: 2, level: 'fresh', gone: false });
const VENUES = [{ id: V1, name: 'Test Tennis Club', short_name: 'Test TC', suburb: 'Malvern', surfaces: ['hard'], courts: 4, lights: true, indoor: false, booking_url: null, lat: -37.86, lng: 145.03 }];
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  for (const f of ['南伴球_PWA.html', '南伴球_Web.html']) {
    const W = f.includes('Web'), ctx = await b.newContext({ viewport: W ? { width: 1360, height: 860 } : { width: 390, height: 844 } });
    const pg = await ctx.newPage(), errs = []; pg.on('pageerror', e => errs.push(e.message + ' @ ' + String(e.stack).split('\n').slice(1, 3).join('|')));
    const tag = s => `${f} ${s}`, G1 = U('7'), now = +new Date(process.env.NBQ_TS || '2026-10-14T15:10:00+11:00');   // 页面时钟固定（tests/lib/preload.js），球局时间也按它算
    const S = { me: { id: ME, member_no: 1, nickname: 'Sam', last_initial: 'L', utr: 5, utr_estimated: false, avatar_kind: 'letter', avatar_animal: null, avatar_color: 'paper', card_theme: 'court', created_at: new Date().toISOString(), gender: null, club_ids: [], pact_accepted_at: new Date().toISOString() },
      prefs: [{ target_id: OLD, pref: 'less', game_id: null, updated_at: new Date(now - 864e5).toISOString() }], feel: null, closed: null, imps: [], ns: [], appeals: [], fail: null, log: [], bodies: {} };
    const game = { id: G1, share_code: 'ABC123', host_id: ME, venue_id: V1, venue_name: null, starts_at: new Date(now - 3 * 36e5).toISOString(), duration_min: 90, game_type: 'singles', capacity: 2, utr_min: 3, utr_max: 7, status: 'open', visibility: 'public', join_mode: 'approval', note: '', tags: [], approved_count: 2, filled: 2 };
    const parts = [{ game_id: G1, user_id: ME, role: 'host', status: 'approved', message: '', created_at: new Date(now - 864e5).toISOString() }, { game_id: G1, user_id: HOST, role: 'player', status: 'approved', message: '', created_at: new Date(now - 864e5).toISOString() }];
    await pg.route('https://nanbanqiu.app/**', async r => { const u = new URL(r.request().url()); if (!u.pathname.startsWith('/api/')) return r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: fs.readFileSync(path.join(DIR, f)) });
      const m = r.request().method(), p = u.pathname, pd = r.request().postData(), body = pd ? JSON.parse(pd) : null; const J = (s, d) => r.fulfill({ status: s, contentType: 'application/json', body: JSON.stringify(d) });
      const nm = p.replace(/[0-9a-f]{8}-[0-9a-f-]{27}/g, x => ({ [HOST]: 'HOST', [OLD]: 'OLD', [G1]: 'G1' })[x] || x);
      if (m !== 'GET') { S.log.push(m + ' ' + nm); S.bodies[m + ' ' + nm] = body }
      if (m === 'GET') {
        if (p === '/api/venues') return J(200, { venues: VENUES });
        if (p === '/api/me') return J(200, { registered: true, user: S.me });
        if (p === '/api/games') return J(200, { games: [] });
        if (p === '/api/games/mine') return J(200, { games: [game], participants: parts, profiles: { [HOST]: card(HOST, 'Host', 1200) } });
        if (p === '/api/invites') return J(200, { invites: [], profiles: {} });
        if (p === '/api/notifications') return J(200, { notifications: [] });
        if (p === '/api/threads') return J(200, { threads: [] });
        if (p === '/api/blocks') return J(200, { blocks: [], profiles: {} });
        if (p === '/api/profiles') return J(200, { profiles: { [HOST]: card(HOST, 'Host', 1200), [OLD]: card(OLD, 'Olga', 1100) } });
        if (p === '/api/me/after') return J(200, { prefs: S.prefs, feels: S.feel || S.closed ? [{ game_id: G1, feel: S.feel, closed_at: S.closed }] : [], impressions: S.imps.map(x => ({ game_id: G1, to_id: x.to, kinds: x.kinds })), noshows: S.ns.map(t => ({ game_id: G1, target_id: t })), appeals: S.appeals });
        return J(404, { error: 'not_found' }) }
      if (p === '/api/me/pact') return J(200, { ok: true });
      if (S.fail) return J(409, { error: S.fail });
      if (p === `/api/games/${G1}/recap`) { if (body.prefs) Object.entries(body.prefs).forEach(([k, v]) => { S.prefs = S.prefs.filter(x => x.target_id !== k); if (v !== 'ok') S.prefs.push({ target_id: k, pref: v, game_id: G1, updated_at: new Date().toISOString() }) });
        if (body.impressions) Object.entries(body.impressions).forEach(([k, v]) => { S.imps = S.imps.filter(x => x.to !== k); if (v.length) S.imps.push({ to: k, kinds: v }) });
        if (body.feel) S.feel = body.feel; if (body.done) S.closed = new Date().toISOString(); return J(200, { ok: true }) }
      if (p === `/api/games/${G1}/noshow`) { if (S.fail) return J(409, { error: S.fail }); if (m === 'POST') S.ns = [...new Set([...S.ns, body.target_id])]; else S.ns = S.ns.filter(x => x !== body.target_id); return J(200, { ok: true, confirmed: false }) }
      if (p === `/api/games/${G1}/appeal`) { S.appeals = [{ game_id: G1, reason: body.reason, status: 'pending', created_at: new Date().toISOString() }]; return J(200, { ok: true }) }
      if (p === `/api/players/${HOST}/kudos`) { if (!S.imps.some(x => x.to === HOST)) S.imps.push({ to: HOST, kinds: ['kind'] }); return J(200, { kudos: 1 }) }
      if (p === `/api/players/${HOST}/pref`) { S.prefs = S.prefs.filter(x => x.target_id !== HOST); if (body.pref !== 'ok') S.prefs.push({ target_id: HOST, pref: body.pref, game_id: null, updated_at: new Date().toISOString() }); return J(200, { ok: true }) }
      return J(404, { error: 'not_found' }) });
    await pg.route(SB + '/**', r => { const u = r.request().url(); const v = u.includes('/verify');
      r.fulfill({ status: v ? 200 : 204, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: v ? JSON.stringify({ access_token: 'AT', refresh_token: 'RT', expires_in: 3600, user: { id: 'sb-1', phone: '61412345678' } }) : '' }) });
    await pg.route('https://cdnjs.cloudflare.com/**', r => r.abort()); await pg.route('https://basemaps.cartocdn.com/**', r => r.abort());
    const toasts = () => pg.evaluate(() => document.querySelector('#toast') && document.querySelector('#toast').textContent);
    const until = fn => pg.until(fn, 20 * 300);   // 按真实时间等（pg.until，tests/lib/preload 第 8 条）
    const op = u => pg.evaluate(([a, b]) => opinOf(a, b), [ME, u]);
    const click = async (attrs) => { await pg.evaluate(a => { const el = document.createElement('button'); Object.entries(a).forEach(([k, v]) => el.setAttribute(k, v)); (typeof DEV !== 'undefined' ? DEV : document.body).appendChild(el); el.click(); el.remove() }, attrs); await pg.settle(700) };

    await pg.goto('https://nanbanqiu.app/'); await pg.settle(600);
    await pg.evaluate(() => { openAuth(null) }); await pg.settle(300); await pg.fill('#ph', '0412 345 678'); await pg.click('[data-a="sendCode"]'); await pg.settle(400); await pg.fill('#otp', '123456');
    await until(() => pg.evaluate(() => !!ME && GAMES.length === 1));
    T(tag('登录后读入少遇到（刷新不丢）'), (await op(OLD)) === 'less' && (await op(HOST)) === 'ok', [await op(OLD), await op(HOST)]);
    T(tag('没有服务器记录的赛后：感受为空'), await pg.evaluate(g => !(AFTER[g + '|' + ME.id] || {}).feel, G1));

    // 赛后卡片
    await pg.evaluate(g => rcOpen(g), G1); await pg.settle(500);
    T(tag('赛后卡片打开'), await pg.evaluate(() => !!document.querySelector('.rc')));
    S.log.length = 0; await pg.click('.rc [data-rc="more"][data-u="' + HOST + '"]'); await until(async () => (await op(HOST)) === 'more');
    T(tag('点「多遇到」：PUT recap 带 prefs，读回后页面是多遇到'), S.log.join() === 'PUT /api/games/G1/recap' && S.bodies['PUT /api/games/G1/recap'].prefs[HOST] === 'more' && (await op(HOST)) === 'more', [S.log, await op(HOST)]);
    T(tag('页面上「多遇到」按钮亮着'), await pg.evaluate(h => !!document.querySelector(`.rc [data-rc="more"][data-u="${h}"].on`), HOST));
    S.log.length = 0; await pg.click('.rc [data-rc="feel"][data-v="hard"]'); await until(() => pg.evaluate(g => (AFTER[g + '|' + ME.id] || {}).feel === 'hard', G1));
    T(tag('选感受「偏难」：PUT recap 带 feel，读回后亮着'), S.bodies['PUT /api/games/G1/recap'].feel === 'hard' && await pg.evaluate(() => !!document.querySelector('.rc [data-rc="feel"][data-v="hard"].on')), S.bodies);
    // 失败不改页面
    S.fail = 'recap_closed'; S.log.length = 0; await pg.click('.rc [data-rc="less"][data-u="' + HOST + '"]'); await pg.settle(800); S.fail = null;
    T(tag('接口失败：仍是多遇到，并提示原因'), (await op(HOST)) === 'more' && !!(await toasts()), [await op(HOST), await toasts()]);
    S.log.length = 0; await pg.click('.rc [data-rc="done"]'); await until(() => pg.evaluate(g => (AFTER[g + '|' + ME.id] || {}).closed, G1));
    T(tag('点「好了」：PUT recap done，读回后记为已保存'), S.bodies['PUT /api/games/G1/recap'].done === true && await pg.evaluate(g => !!AFTER[g + '|' + ME.id].closed, G1), S.bodies);

    // 给球友留印象：写服务器、读回后还在
    const kd = () => pg.evaluate(([h, g]) => (KUDOS.get(ME.id + '|' + h + '|' + g) || []).join(), [HOST, G1]);
    S.log.length = 0; await click({ 'data-rcx': 'tag', 'data-g': G1, 'data-u': HOST, 'data-v': 'ontime' }); await until(async () => (await kd()) === 'ontime');
    T(tag('赛后卡片点「守时」：PUT recap 带 impressions，读回后在'), S.bodies['PUT /api/games/G1/recap'].impressions[HOST].join() === 'ontime' && (await kd()) === 'ontime', [S.bodies, await kd()]);
    await click({ 'data-rcx': 'tag', 'data-g': G1, 'data-u': HOST, 'data-v': 'fun' }); await until(async () => (await kd()) === 'ontime,fun');
    T(tag('再点「有趣」：整组一起写，两个都在'), S.bodies['PUT /api/games/G1/recap'].impressions[HOST].join() === 'ontime,fun', S.bodies['PUT /api/games/G1/recap']);
    await click({ 'data-rcx': 'tag', 'data-g': G1, 'data-u': HOST, 'data-v': 'ontime' }); await until(async () => (await kd()) === 'fun');
    T(tag('再点「守时」撤回：只剩「有趣」'), (await kd()) === 'fun', await kd());
    await click({ 'data-sx': 'impPick', 'data-u': HOST, 'data-g': G1, 'data-v': 'kind' }); await until(async () => (await kd()) === 'fun,kind');
    T(tag('球员卡上点「友善」：同样写服务器，读回后两个都在'), S.bodies['PUT /api/games/G1/recap'].impressions[HOST].join() === 'fun,kind', S.bodies['PUT /api/games/G1/recap']);
    await pg.evaluate(() => { KUDOS.clear() }); await pg.evaluate(() => nbqRefresh()); await pg.settle(500);
    T(tag('刷新（内存清空后重读）：印象还在'), (await kd()) === 'fun,kind', await kd());
    S.fail = 'recap_closed'; await click({ 'data-sx': 'impPick', 'data-u': HOST, 'data-g': G1, 'data-v': 'serious' }); S.fail = null;
    T(tag('接口失败：印象不变，并提示原因'), (await kd()) === 'fun,kind' && !!(await toasts()), [await kd(), await toasts()]);
    S.imps = []; await pg.evaluate(() => nbqRefresh()); await pg.settle(400); S.log.length = 0;
    await click({ 'data-rcx': 'all', 'data-g': G1 }); await until(async () => (await kd()) === 'kind');
    T(tag('「都点个赞」：对同局每位调 kudos，读回后是友善'), S.log.includes('POST /api/players/HOST/kudos') && S.bodies['POST /api/players/HOST/kudos'].game_id === G1, [S.log, await kd()]);

    // 爽约反馈 / 申诉：写服务器、读回后还在
    const nsOn = () => pg.evaluate(([h, g, me]) => !!(NS[g + '|' + h] && NS[g + '|' + h].has(me)), [HOST, G1, ME]);
    S.log.length = 0; await click({ 'data-rcx': 'nsok', 'data-g': G1, 'data-u': HOST }); await until(nsOn);
    T(tag('确认没来：POST noshow 带 target_id，读回后已记录；本地不造通知'), S.log.includes('POST /api/games/G1/noshow') && S.bodies['POST /api/games/G1/noshow'].target_id === HOST && (await nsOn()) && await pg.evaluate(() => !NOTIFS.some(n => n.kind === 'noshow')), [S.log, S.bodies]);
    await pg.evaluate(() => { for (const k in NS) delete NS[k] }); await pg.evaluate(() => nbqRefresh()); await pg.settle(400);
    T(tag('刷新（内存清空后重读）：爽约反馈还在'), await nsOn());
    await click({ 'data-rcx': 'nsundo', 'data-g': G1, 'data-u': HOST }); await until(async () => !(await nsOn()));
    T(tag('撤回：DELETE noshow，读回后没有了'), S.log.includes('DELETE /api/games/G1/noshow') && !(await nsOn()), S.log);
    S.fail = 'noshow_window_closed'; await click({ 'data-rcx': 'nsok', 'data-g': G1, 'data-u': HOST }); S.fail = null;
    T(tag('接口失败：不记录，并提示原因'), !(await nsOn()) && !!(await toasts()), await toasts());
    await click({ 'data-nsa': 'came', 'data-g': G1 }); await until(() => pg.evaluate(([g, me]) => !!NS_APPEAL[g + '|' + me], [G1, ME]));
    T(tag('申诉：POST appeal 带 reason，读回后是待核实'), S.bodies['POST /api/games/G1/appeal'].reason === 'came' && await pg.evaluate(([g, me]) => NS_APPEAL[g + '|' + me].status === 'pending', [G1, ME]), S.bodies);

    // 球员卡上改
    S.log.length = 0; await pg.evaluate(h => { UF_CLOSE && UF_CLOSE() }, HOST); await click({ 'data-pcp': 'less', 'data-u': HOST }); await until(async () => (await op(HOST)) === 'less');
    T(tag('球员卡上改少遇到：PUT players/:id/pref，读回后是少遇到'), S.log.includes('PUT /api/players/HOST/pref') && S.bodies['PUT /api/players/HOST/pref'].pref === 'less' && (await op(HOST)) === 'less', [S.log, await op(HOST)]);
    T(tag('本地不会冒出假的「打得怎么样」通知'), await pg.evaluate(() => !NOTIFS.some(n => n.kind === 'recap')));
    T(tag('全程没有页面报错'), errs.length === 0, errs);
    await ctx.close();
  }
  await b.close(); console.log(`\nreal_after: ${pass} 通过, ${fail} 失败`); process.exit(fail ? 1 : 0);
})();
