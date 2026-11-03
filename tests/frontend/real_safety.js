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
    const tag = s => `${f} ${s}`;
    const S = { me: { id: ME, member_no: 1288, nickname: 'Sam', last_initial: 'L', utr: 5, utr_estimated: false, avatar_kind: 'letter', avatar_animal: null, avatar_color: 'paper', card_theme: 'court', created_at: new Date().toISOString(), gender: null, club_ids: [], pact_accepted_at: new Date().toISOString() },
      blocks: [OLD], fail: null, log: [], bodies: {}, blockGets: 0 };
    await pg.route('https://nanbanqiu.app/**', async r => { const u = new URL(r.request().url()); if (!u.pathname.startsWith('/api/')) return r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: fs.readFileSync(path.join(DIR, f)) });
      const m = r.request().method(), p = u.pathname, pd = r.request().postData(), body = pd ? JSON.parse(pd) : null; const J = (s, d) => r.fulfill({ status: s, contentType: 'application/json', body: JSON.stringify(d) });
      if (m !== 'GET') { S.log.push(m + ' ' + p.replace(/[0-9a-f]{8}-[0-9a-f-]{27}/g, x => ({ [HOST]: 'HOST', [OLD]: 'OLD' })[x] || x)); S.bodies[m + ' ' + p] = body }
      if (m === 'GET') {
        if (p === '/api/venues') return J(200, { venues: VENUES });
        if (p === '/api/me') return J(200, { registered: true, user: S.me });
        if (p === '/api/games') return J(200, { games: [] });
        if (p === '/api/games/mine') return J(200, { games: [], participants: [], profiles: { [HOST]: card(HOST, 'Host', 1200) } });
        if (p === '/api/invites') return J(200, { invites: [], profiles: {} });
        if (p === '/api/notifications') return J(200, { notifications: [] });
        if (p === '/api/threads') return J(200, { threads: [] });
        if (p === '/api/profiles') return J(200, { profiles: { [HOST]: card(HOST, 'Host', 1200) } });
        if (p === '/api/blocks') { S.blockGets++; return J(200, { blocks: S.blocks.map(id => ({ user_id: id, created_at: new Date().toISOString() })), profiles: { [OLD]: card(OLD, 'Olga', 1100) } }) }
        return J(404, { error: 'not_found' }) }
      if (p === '/api/me/pact') return J(200, { ok: true });
      if (p === '/api/blocks') { if (S.fail) return J(500, { error: 'server_error' }); S.blocks.push(body.user_id); return J(200, { ok: true }) }
      if (p === `/api/blocks/${OLD}` && m === 'DELETE') { S.blocks = S.blocks.filter(x => x !== OLD); return J(200, { ok: true }) }
      if (p === '/api/reports') return S.fail ? J(409, { error: S.fail }) : J(200, { ok: true });
      return J(404, { error: 'not_found' }) });
    await pg.route(SB + '/**', r => { const u = r.request().url(); const v = u.includes('/verify');
      r.fulfill({ status: v ? 200 : 204, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: v ? JSON.stringify({ access_token: 'AT', refresh_token: 'RT', expires_in: 3600, user: { id: 'sb-1', phone: '61412345678' } }) : '' }) });
    await pg.route('https://cdnjs.cloudflare.com/**', r => r.abort()); await pg.route('https://basemaps.cartocdn.com/**', r => r.abort());
    const toasts = () => pg.evaluate(() => document.querySelector('#toast') && document.querySelector('#toast').textContent);
    const until = async fn => { for (let n = 0; n < 20; n++) { if (await fn()) return; await pg.settle(300) } };
    const bl = () => pg.evaluate(() => [...ME.blocked].join());
    const click = async (attrs) => { await pg.evaluate(a => { const el = document.createElement('button'); Object.entries(a).forEach(([k, v]) => el.setAttribute(k, v)); (typeof DEV !== 'undefined' ? DEV : document.body).appendChild(el); el.click(); el.remove() }, attrs); await pg.settle(700) };

    await pg.goto('https://nanbanqiu.app/'); await pg.settle(600);
    await pg.evaluate(() => { openAuth(null) }); await pg.settle(300); await pg.fill('#ph', '0412 345 678'); await pg.click('[data-a="sendCode"]'); await pg.settle(400); await pg.fill('#otp', '123456');
    await until(() => pg.evaluate(() => ME && ME.blocked.size === 1));
    T(tag('登录后读入屏蔽名单（刷新不丢），名片读到的显示名字'), (await bl()) === OLD && (await pg.evaluate(o => U(o).name, OLD)) === 'Olga', await bl());
    await pg.evaluate(() => openBlocklist()); await pg.settle(400);
    T(tag('屏蔽名单里有这个人'), await pg.evaluate(() => /Olga/.test(document.body.innerText)));
    await pg.evaluate(() => { try { closeSheet() } catch (e) { } try { closeModal() } catch (e) { } }); await pg.settle(500);

    // 解除屏蔽
    S.log.length = 0; await click({ 'data-a': 'unblock', 'data-u': OLD }); await until(async () => (await bl()) === '');
    T(tag('解除屏蔽：DELETE，读入后名单为空'), S.log.includes('DELETE /api/blocks/OLD') && (await bl()) === '', [S.log, await bl()]);
    // 屏蔽
    S.log.length = 0; await click({ 'data-a': 'doBlock', 'data-u': HOST }); await until(async () => (await bl()) === HOST);
    T(tag('屏蔽：POST，带对方 id，读入后名单里有 TA'), S.log.join() === 'POST /api/blocks' && S.bodies['POST /api/blocks'].user_id === HOST && (await bl()) === HOST, [S.log, await bl()]);
    // 屏蔽失败：名单不变
    S.fail = 'x'; S.log.length = 0; await click({ 'data-a': 'doBlock', 'data-u': OLD }); S.fail = null;
    T(tag('屏蔽失败：名单不变（没有假装成功）'), (await bl()) === HOST, await bl());

    // 举报
    await pg.evaluate(h => { repOpen('user', h, 'card') }, HOST); await pg.settle(400);
    S.log.length = 0; await pg.click('[data-rp="other"]'); await pg.settle(500);
    T(tag('举报：选「其他」没写说明 → 不发请求'), S.log.length === 0, S.log);
    await pg.fill('#repNote', '半夜一直发消息'); await pg.click('[data-rp="other"]'); await pg.settle(700);
    const rb = S.bodies['POST /api/reports'];
    T(tag('举报：POST，对象 / 原因 / 说明 / 来源都带上'), S.log.join() === 'POST /api/reports' && rb.target_type === 'user' && rb.target_id === HOST && rb.reason === 'other' && rb.note === '半夜一直发消息' && rb.via === 'card', [S.log, rb]);
    const shown = () => pg.evaluate(() => { const e = document.querySelector('[data-rp]'); const host = e && e.closest('#sheet,#modal,.modal,.mback'); return !!(e && host && (host.classList.contains('show') || host.closest('.show'))) });   // 面板留在页面里，只是去掉 show 类
    await pg.settle(600);
    T(tag('举报成功：面板关闭并提示'), /24 小时/.test(await toasts()) && !(await shown()), [await toasts(), await shown()]);
    S.fail = 'report_duplicate'; await pg.evaluate(h => { REPORTS.length = 0; repOpen('user', h, 'card') }, HOST); await pg.settle(400); await pg.click('[data-rp="harass"]'); await pg.settle(700);
    T(tag('重复举报：提示服务器的原因，面板还在、不记本地'), (await toasts()) === (await pg.evaluate(() => apiErrText('report_duplicate'))) && (await pg.evaluate(() => REPORTS.length)) === 0, [await toasts(), await pg.evaluate(() => REPORTS.length)]);
    T(tag('全程没有页面报错'), errs.length === 0, errs);
    await ctx.close();
  }
  await b.close(); console.log(`\nreal_safety: ${pass} 通过, ${fail} 失败`); process.exit(fail ? 1 : 0);
})();
