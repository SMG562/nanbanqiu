// #369 PR-B：场边前台在真实模式（nanbanqiu.app）接真接口（手机端；假 Supabase + 有状态的假 /api/sideline/*）
//   读：动态流来自 feed（没有演示的假帖子 / 假计数）· 作者名来自 profiles · 球场名来自真球场表 · 话题名来自配置
//   配置：后台发布的 v2 生效，内置 v1 / 旧缓存不会盖掉它 · 读写：发布 / 回复带 Idempotency-Key · 网球 PUT / DELETE · 删除 DELETE
//   失败：发布被限频 → 回滚 + 人话提示 + 文字还在输入框 · 网球失败翻回去 · 回复失败拿掉
//   新动态：轮询读到别人的 → 先攒着、只亮胶囊，点了才放进来 · 刷新：feed 读不到时用本机缓存画
//   NBQ_SHOTS=目录：顺手截图（给所有者看画面）
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const DIR = process.env.NBQ_DIR || path.join(__dirname, '..', '..');
const SHOTS = process.env.NBQ_SHOTS || '';
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 600) : '')) };
const SBU = 'https://xosrdkrkfxkdrwldfhac.supabase.co';
const U = c => `${c.repeat(8)}-${c.repeat(4)}-4${c.repeat(3)}-8${c.repeat(3)}-${c.repeat(12)}`;
const V1 = U('1'), ME = U('a'), MIA = U('b'), JAY = U('c'), P1 = U('d'), P2 = U('e'), P3 = U('f'), P4 = U('9'), P5 = U('8');
const card = (id, n, no, color) => ({ id, member_no: no, nickname: n, last_initial: 'W', utr: 5.5, avatar_kind: 'letter', avatar_animal: null, avatar_color: color || 'paper', seal_roll: 3, card_theme: 'court', played: 4, hosted: 1, kudos: 2, level: 'fresh', gone: false });
const VENUES = [{ id: V1, name: 'Test Tennis Club', short_name: 'Test TC', suburb: 'Malvern', surfaces: ['hard'], courts: 4, lights: true, indoor: false, booking_url: null, lat: -37.86, lng: 145.03 }];
const NOW = +new Date('2026-10-14T15:10:00+11:00');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: SHOTS ? 2 : 1 });
  const pg = await ctx.newPage(), errs = []; pg.on('pageerror', e => errs.push(e.message + ' @ ' + String(e.stack).split('\n').slice(1, 3).join('|')));
  const iso = m => new Date(NOW - m * 60e3).toISOString();
  const S = { log: [], bodies: {}, idk: {}, cfgV: 2, feedDown: false, cfg: null, pendingNew: null, failPost: null, failBall: false, failReply: false, detailGets: 0, feedGets: 0,
    me: { id: ME, member_no: 1288, nickname: 'Sam', last_initial: 'L', utr: 5, utr_estimated: false, avatar_kind: 'letter', avatar_animal: null, avatar_color: 'paper', card_theme: 'court', created_at: new Date().toISOString(), gender: null, club_ids: [], pact_accepted_at: new Date().toISOString(), seal_roll: 1, home_club_ids: [] } };
  const prof = { [ME]: card(ME, 'Sam', 1288), [MIA]: card(MIA, 'Mia', 1200, 'rose'), [JAY]: card(JAY, '阿杰', 1201, 'sky') };
  S.posts = [
    { id: P1, user_id: MIA, city: 'melb', body: '红土 3、4 号空着，快来', topic_id: null, floor: 0, venue_id: V1, photo_count: 0, photos: [], tone: '', replies_open: true, publish_at: iso(2), balls: 4, replies: 1, mine: false, my_ball: false },
    { id: P2, user_id: JAY, city: 'melb', body: '看了十遍教学视频，反手还是不听话', topic_id: 'brain', floor: 31, venue_id: null, photo_count: 0, photos: [], tone: '', replies_open: true, publish_at: iso(25), balls: 0, replies: 0, mine: false, my_ball: false },
    { id: P3, user_id: ME, city: 'melb', body: '今晚有人打夜场吗', topic_id: null, floor: 0, venue_id: V1, photo_count: 0, photos: [], tone: '', replies_open: true, publish_at: iso(70), balls: 1, replies: 0, mine: true, my_ball: false },
    { id: P4, user_id: JAY, city: 'melb', body: '旧的下线话题里的一条', topic_id: 'ootd', floor: 12, venue_id: null, photo_count: 0, photos: [], tone: '', replies_open: true, publish_at: iso(200), balls: 2, replies: 0, mine: false, my_ball: true }];
  S.replies = { [P1]: [{ id: 501, user_id: JAY, to_user: null, body: '我晚点到', created_at: iso(1), mine: false, hidden: false }] };
  let cfgV2 = null;
  const J = (r, s, d, h) => r.fulfill({ status: s, contentType: 'application/json', headers: h || {}, body: JSON.stringify(d) });
  const feedOut = () => ({ posts: S.posts, next: null, topics: { brain: { id: 'brain', title: '脑子会了，身体没会', kind: 'evergreen' } }, profiles: prof });
  await pg.route('https://nanbanqiu.app/**', async r => {
    const u = new URL(r.request().url()), m = r.request().method(), p = u.pathname, pd = r.request().postData(), body = pd ? JSON.parse(pd) : null;
    if (!p.startsWith('/api/')) return r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: fs.readFileSync(path.join(DIR, '南伴球_PWA.html')) });
    if (p === '/api/events') return J(r, 200, { ok: true });
    if (p.startsWith('/api/sideline/') && m !== 'GET') { const k = m + ' ' + p.replace(/[0-9a-f]{8}-[0-9a-f-]{27}/g, x => ({ [P1]: 'P1', [P2]: 'P2', [P3]: 'P3', [P4]: 'P4', [P5]: 'P5' })[x] || x); S.log.push(k); S.bodies[k] = body; (S.idk[k] ||= []).push(r.request().headers()['idempotency-key'] || null) }
    if (m === 'GET') {
      if (p === '/api/venues') return J(r, 200, { venues: VENUES });
      if (p === '/api/me') return J(r, 200, { registered: true, user: S.me });
      if (p === '/api/games') return J(r, 200, { games: [] });
      if (p === '/api/games/mine') return J(r, 200, { games: [], participants: [], profiles: { [ME]: S.me } });
      if (p === '/api/invites') return J(r, 200, { invites: [], profiles: {} });
      if (p === '/api/profiles') return J(r, 200, { profiles: {} });
      if (p === '/api/sideline/config') { const v = +u.searchParams.get('v') || 0; S.cfgGets = (S.cfgGets || 0) + 1; if (v >= S.cfgV) return J(r, 200, { version: S.cfgV, same: true }); return J(r, 200, { version: S.cfgV, published_at: iso(60), config: S.cfg }) }
      if (p === '/api/sideline/feed') { S.feedGets++; if (S.feedDown) return r.abort(); if (S.pendingNew) { S.posts = [S.pendingNew, ...S.posts]; S.pendingNew = null } return J(r, 200, feedOut()) }
      if (p === '/api/sideline/mine') { S.log.push('GET /api/sideline/mine'); return J(r, 200, { posts: S.mine || [], next: null, topics: feedOut().topics, profiles: prof }) }
      const mm = p.match(/^\/api\/sideline\/posts\/([0-9a-f-]{36})$/);
      if (mm) { S.detailGets++; const x = S.posts.find(q => q.id === mm[1]) || (S.extra || []).find(q => q.id === mm[1]); if (!x) return J(r, 404, { error: 'not_found' }); return J(r, 200, { post: { ...x, status: 'visible', public: !x.old }, replies: S.replies[x.id] || [], topics: feedOut().topics, profiles: prof }) }
      return J(r, 404, { error: 'not_found' }) }
    if (p === '/api/me/pact') return J(r, 200, { ok: true });
    if (p === '/api/sideline/posts' && m === 'POST') { if (S.drop === 'POST ' + p) { S.drop = null; return r.abort() } if (S.failPost) return J(r, 429, { error: S.failPost, detail: 600 }); const x = { id: P5, user_id: ME, city: 'melb', body: body.body, topic_id: body.topic_id || null, floor: body.topic_id ? 32 : 0, venue_id: body.venue_id || null, photo_count: 0, photos: [], tone: '', replies_open: true, publish_at: new Date(NOW).toISOString(), balls: 0, replies: 0, mine: true, my_ball: false }; S.posts = [x, ...S.posts]; return J(r, 200, { id: P5, topic_id: x.topic_id, floor: x.floor, new_topic: false, publish_at: x.publish_at }) }
    if ((p === '/api/reports' || p === '/api/blocks') && m === 'POST') { S.log.push(m + ' ' + p); S.bodies[m + ' ' + p] = body; if (S.failSafe) return J(r, 429, { error: 'rate_limited' }); return J(r, 200, { ok: true }) }
    if (/\/hide$/.test(p) && m === 'POST') { if (S.failSafe) return J(r, 429, { error: 'rate_limited' }); return J(r, 200, { ok: true }) }
    let mm = p.match(/^\/api\/sideline\/posts\/([0-9a-f-]{36})\/ball$/);
    if (mm) { if (S.failBall) return J(r, 429, { error: 'rate_limited' }); const x = S.posts.find(q => q.id === mm[1]); if (m === 'PUT' && !x.my_ball) { x.my_ball = true; x.balls++ } if (m === 'DELETE' && x.my_ball) { x.my_ball = false; x.balls-- } return J(r, 200, { balls: x.balls }) }
    mm = p.match(/^\/api\/sideline\/posts\/([0-9a-f-]{36})\/replies$/);
    if (mm && m === 'POST') { if (S.drop === 'POST /replies') { S.drop = null; return r.abort() } if (S.failReply) return J(r, 409, { error: 'replies_closed' }); const x = S.posts.find(q => q.id === mm[1]); x.replies++; (S.replies[x.id] ||= []).push({ id: 900 + x.replies, user_id: ME, to_user: body.to || null, body: body.body, created_at: new Date(NOW).toISOString(), mine: true, hidden: false }); return J(r, 200, { id: 900 + x.replies }) }
    mm = p.match(/^\/api\/sideline\/posts\/([0-9a-f-]{36})$/);
    if (mm && m === 'DELETE') { S.posts = S.posts.filter(q => q.id !== mm[1]); return J(r, 200, { ok: true }) }
    return J(r, 404, { error: 'not_found' }) });
  await pg.route(SBU + '/**', r => { const v = r.request().url().includes('/verify'); r.fulfill({ status: v ? 200 : 204, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: v ? JSON.stringify({ access_token: 'AT', refresh_token: 'RT', expires_in: 3600, user: { id: 'sb-1', phone: '61412345678' } }) : '' }) });
  await pg.route('https://cdnjs.cloudflare.com/**', r => r.abort()); await pg.route('https://basemaps.cartocdn.com/**', r => r.abort());
  const sr = s => pg.locator('#sbHost').locator(s);
  const E = (f, a) => pg.evaluate(f, a);
  const SRQ = (s, f) => pg.evaluate(([s, f]) => { const r = document.querySelector('#sbHost').shadowRoot; return new Function('r', 'return (' + f + ')')(r.querySelector(s)) }, [s, f]);
  const rows = () => pg.evaluate(() => { const r = document.querySelector('#sbHost').shadowRoot; return [...r.querySelectorAll('[data-s="home"] .ln')].map(x => x.textContent.replace(/\s+/g, ' ').trim()) });
  const home = () => pg.evaluate(() => document.querySelector('#sbHost').shadowRoot.querySelector('[data-s="home"]').textContent.replace(/\s+/g, ' '));
  const toast = () => pg.evaluate(() => document.querySelector('#sbHost').shadowRoot.querySelector('.toast').textContent);
  const until = (fn, n = 20) => pg.until(fn, n * 300);
  const shot = async n => { if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await pg.settle(900); await pg.screenshot({ path: path.join(SHOTS, n + '.png') }) } };

  // v2 配置：从页面里的内置 v1 改出来（下线 ootd / pet / trip / sunset，周三 = 脑子会了身体没会）
  await pg.goto('https://nanbanqiu.app/'); await pg.settle(600);
  const v1 = await E(() => JSON.parse(JSON.stringify(SB.CFG)));
  cfgV2 = JSON.parse(JSON.stringify(v1)); cfgV2.topics = cfgV2.topics.filter(t => !['ootd', 'pet', 'trip', 'sunset'].includes(t.id)); cfgV2.week = cfgV2.week.map(w => w.dow === 3 ? { ...w, auto_hot: false, topic_id: 'brain' } : w.dow === 5 ? { ...w, topic_id: 'love' } : w.dow === 6 ? { ...w, topic_id: 'good' } : w.dow === 7 ? { ...w, topic_id: 'dopa', alt_topic_id: 'good' } : w);
  cfgV2.slots = cfgV2.slots.map(s => ({ ...s, topics: s.topics.map(t => t === 'sunset' ? 'spot' : t) })); S.cfg = cfgV2;
  await E(() => { openAuth(null) }); await pg.settle(300); await pg.fill('#ph', '0412 345 678'); await pg.click('[data-a="sendCode"]'); await pg.settle(400); await pg.fill('#otp', '123456');
  await pg.waitForFunction(() => ME && ME.name === 'Sam', null, { timeout: 20000 }).catch(() => { }); await pg.settle(300);
  await E(() => { LOC.asked = true; closeSheet() }); await pg.settle(300);

  // ---- 读：动态流 ----
  await pg.click('#tabbar [data-tab="side"]');
  await until(async () => (await rows()).length >= 4);
  const R = await rows(), H = await home();
  T('动态流：4 条都是接口给的，不是演示的假帖子', R.length === 4 && R.some(x => x.includes('红土 3、4 号空着')) && !/Lily|Coco|武网决赛|Kooyong|126 条/.test(H), { R, H: H.slice(0, 200) });
  T('作者名来自 profiles（Mia / 阿杰）', R[0].includes('Mia') && R.some(x => x.includes('阿杰')), R);
  T('球场名来自真球场表（Test TC）', R[0].includes('Test TC'), R[0]);
  T('网球数 = 接口（4）', /4$/.test(R[0]) || R[0].includes(' 4'), R[0]);
  T('回复数 = 接口（1）；列表不画没读到的回复预览', R[0].includes('1') && !R[0].includes('我晚点到'), R[0]);
  T('页头计数 = 真实条数（4），没有演示的 +96', /(^|\D)0?4\s*条/.test(await SRQ('[data-cnt]', 'r.textContent')) && !/1\d\d\s*条/.test(await SRQ('[data-cnt]', 'r.textContent')), await SRQ('[data-cnt]', 'r.textContent'));
  T('已下线话题（ootd）的旧帖：标题兜底为话题名，不报错', R.some(x => x.includes('旧的下线话题里的一条')) && R.some(x => /#网球人的OOTD|#话题/.test(x)), R);
  // ---- 配置 v2 ----
  await until(() => E(() => SB.CFG.topics.length === 6));
  const cf = await E(() => ({ ootd: SB.CFG.topics.some(t => t.id === 'ootd'), today: SB.today(), n: SB.CFG.topics.length, slots: JSON.stringify(SB.CFG.slots).includes('sunset') }));
  T('配置：后台发布的 v2 生效（ootd 下线，周三今日话题 = brain，时段不再含 sunset）', !cf.ootd && cf.today === 'brain' && cf.n === 6 && !cf.slots, cf);
  T('今日话题卡：写的是「条」不是「张」，不放假照片', /已有\s*31\s*条/.test(await home()) && !(await home()).includes('张'), (await home()).slice(0, 300));
  await shot('02_动态流_接真');

  // ---- 网球 ----
  S.log.length = 0;
  await sr('[data-s="home"] [data-ball="' + P2 + '"]').click(); await until(() => S.log.some(x => x === 'PUT /api/sideline/posts/P2/ball'));
  T('点网球：PUT /ball，计数跟着接口走', S.log.join() === 'PUT /api/sideline/posts/P2/ball' && await SRQ('[data-ball="' + P2 + '"]', 'r.classList.contains("on")'), S.log);
  await until(async () => /1/.test(await SRQ('[data-ball="' + P2 + '"] .odo', 'r.textContent')));
  S.log.length = 0; await sr('[data-s="home"] [data-ball="' + P2 + '"]').click(); await until(() => S.log.some(x => x.startsWith('DELETE')));
  T('再点一下取消：DELETE /ball', S.log.join() === 'DELETE /api/sideline/posts/P2/ball', S.log);
  S.failBall = true; await sr('[data-s="home"] [data-ball="' + P2 + '"]').click();
  await until(async () => /稍后|太快|频繁|rate|过一会/.test(await toast()) || !(await SRQ('[data-ball="' + P2 + '"]', 'r.classList.contains("on")')));
  await pg.settle(600);
  T('点网球被拒（限频）：翻回去，有提示', !(await SRQ('[data-ball="' + P2 + '"]', 'r.classList.contains("on")')) && (await toast()).length > 0, await toast()); S.failBall = false;

  // ---- 详情与回复 ----
  S.detailGets = 0; S.log.length = 0;
  await sr('[data-s="home"] [data-cmt="' + P1 + '"]').first().click(); await until(async () => (await SRQ('.sheet', 'r.textContent')).includes('我晚点到'));
  T('点开详情：GET /posts/:id 读回复，画出来', S.detailGets === 1 && (await SRQ('.sheet', 'r.textContent')).includes('我晚点到') && (await SRQ('.sheet', 'r.textContent')).includes('阿杰'), S.detailGets);
  T('详情：没有「0 人看过」（浏览统计二期）', !(await SRQ('.sheet', 'r.textContent')).includes('人看过'), (await SRQ('.sheet', 'r.textContent')).slice(0, 200));
  await sr('.sheet [data-rin]').fill('我也去'); await sr('.sheet [data-rin]').dispatchEvent('input'); await sr('.sheet [data-rsend]').click();
  await until(() => S.log.some(x => x.includes('/replies')));
  const rk = 'POST /api/sideline/posts/P1/replies';
  T('回复：POST /replies，正文原样，带 Idempotency-Key', S.bodies[rk] && S.bodies[rk].body === '我也去' && S.idk[rk].length === 1 && !!S.idk[rk][0], [S.bodies[rk], S.idk[rk]]);
  T('回复：画在列表里', (await SRQ('.sheet', 'r.textContent')).includes('我也去'));
  await shot('03_详情与回复');
  S.failReply = true; await sr('.sheet [data-rin]').fill('再来一句'); await sr('.sheet [data-rin]').dispatchEvent('input'); await sr('.sheet [data-rsend]').click();
  await until(async () => /关闭了回复/.test(await toast()));
  await pg.settle(300);
  T('回复被拒（作者关了回复）：提示是人话，那句从列表里拿掉，输入框里文字还在', /关闭了回复/.test(await toast()) && !(await SRQ('.sheet', 'r.textContent')).includes('再来一句') && await SRQ('.sheet [data-rin]', 'r.value') === '再来一句', [await toast(), await SRQ('.sheet [data-rin]', 'r.value')]); S.failReply = false;
  // 重复提交（#291）：回复断网后再点沿用同一个 key；成功后再回 = 新 key
  S.drop = 'POST /replies'; S.idk[rk] = []; await sr('.sheet [data-rin]').fill('断网回复'); await sr('.sheet [data-rin]').dispatchEvent('input'); await sr('.sheet [data-rsend]').click();
  await until(() => S.idk[rk].length >= 1); await pg.settle(500);
  await sr('.sheet [data-rin]').fill('断网回复'); await sr('.sheet [data-rin]').dispatchEvent('input'); await sr('.sheet [data-rsend]').click(); await until(() => S.idk[rk].length >= 2); await pg.settle(500);
  await sr('.sheet [data-rin]').fill('再回一句'); await sr('.sheet [data-rin]').dispatchEvent('input'); await sr('.sheet [data-rsend]').click(); await until(() => S.idk[rk].length >= 3);
  T('回复：断网那次失败，再点沿用同一个 key；成功后再回换新 key', !!S.idk[rk][0] && S.idk[rk][1] === S.idk[rk][0] && !!S.idk[rk][2] && S.idk[rk][2] !== S.idk[rk][0], S.idk[rk]);
  await sr('.sheet [data-shut]').first().click(); await pg.settle(500);

  // ---- 发布 ----
  S.log.length = 0; await sr('[data-in]').fill('今晚七点有人打吗'); await sr('[data-send]').click();
  await until(() => S.log.includes('POST /api/sideline/posts'));
  const pk = 'POST /api/sideline/posts';
  T('发布：POST /posts，正文 + 球场之外不多带东西，带 Idempotency-Key', S.bodies[pk].body === '今晚七点有人打吗' && !S.bodies[pk].photos && !!S.idk[pk][0], [S.bodies[pk], S.idk[pk]]);
  await until(async () => (await rows()).some(x => x.includes('今晚七点有人打吗')));
  T('发布：立刻出现在列表里，且是自己的名字', (await rows())[0].includes('今晚七点有人打吗') && (await rows())[0].includes('Sam'), (await rows())[0]);
  T('发布：话题 / 球场只带用户选的（栏里没选球场就不带 venue_id）', !S.bodies[pk].venue_id, S.bodies[pk]);
  await until(() => E(() => { const r = SBV.L.find(x => x.x === '今晚七点有人打吗'); return r && !r.tmp && r.id === '88888888-8888-4888-8888-888888888888' }));
  T('发布成功：本地临时 id 换成服务器 id', await E(() => { const r = SBV.L.find(x => x.x === '今晚七点有人打吗'); return !!r && !r.tmp && r.id === '88888888-8888-4888-8888-888888888888' }));
  // 撤回 = DELETE
  T('发布提示：「已发布，保质期 24h」，没有撤回按钮', (await SRQ('.undo', 'r.textContent')).includes('保质期 24h') && !(await SRQ('.undo', 'r.querySelector("[data-undo]")')), await SRQ('.undo', 'r.textContent'));
  const dc = sel => E(q => { const r = document.querySelector('#sbHost').shadowRoot.querySelector(q); if (r) r.click(); return !!r }, sel);
  const acts = async (id, act, ex) => { await dc('[data-s="home"] [data-ln="' + id + '"] .tx'); await until(async () => (await SRQ('.sheet', 'r.textContent')).length > 0); await pg.settle(600); await dc('.sheet [data-menu]'); await pg.settle(300); await pg.settle(400); await sr('.acts [data-act="' + act + '"]').click(); if (ex) { await pg.settle(300); await sr('.acts ' + ex).click(); await pg.settle(300) } };
  S.log.length = 0; await acts(P5, 'del'); await until(() => S.log.some(x => x.startsWith('DELETE')));
  await until(async () => !(await rows()).some(x => x.includes('今晚七点有人打吗')));
  T('删除（帖子菜单）：DELETE /posts/:id，列表里拿掉', S.log.join() === 'DELETE /api/sideline/posts/P5' && !(await rows()).some(x => x.includes('今晚七点有人打吗')), [S.log, await rows()]);
  // 重复提交（#291）：断网后再点「发布」沿用同一个 Idempotency-Key；成功后再发 = 新 key
  S.drop = pk; S.idk[pk] = []; await sr('[data-in]').fill('断网重发那条'); await sr('[data-send]').click();
  await until(() => S.idk[pk].length >= 1); await until(async () => !(await rows()).some(x => x.includes('断网重发那条'))); await pg.settle(400);
  await sr('[data-in]').fill('断网重发那条'); await sr('[data-send]').click();
  await until(() => S.idk[pk].length >= 2); await until(async () => (await rows()).some(x => x.includes('断网重发那条'))); await pg.settle(300);
  await sr('[data-in]').fill('下一条新的'); await sr('[data-send]').click(); await until(() => S.idk[pk].length >= 3);
  T('发布：断网那次失败，再点沿用同一个 key；成功后再发换新 key', !!S.idk[pk][0] && S.idk[pk][1] === S.idk[pk][0] && !!S.idk[pk][2] && S.idk[pk][2] !== S.idk[pk][0], S.idk[pk]);
  // 限频
  S.failPost = 'sb_post_hourly_limit'; await sr('[data-in]').fill('连发的第六条'); await sr('[data-send]').click();
  await until(async () => /发得有点多/.test(await toast()));
  await until(async () => !(await rows()).some(x => x.includes('连发的第六条')));
  T('发布被限频：回滚（列表里没有）、提示是人话、文字回到输入框', !(await rows()).some(x => x.includes('连发的第六条')) && /发得有点多/.test(await toast()) && await SRQ('[data-in]', 'r.value') === '连发的第六条', [await toast(), await SRQ('[data-in]', 'r.value')]);
  S.failPost = null; await sr('[data-in]').fill('');

  // ---- 新动态：轮询 ----
  S.pendingNew = { id: U('7'), user_id: JAY, city: 'melb', body: '刚下雨了，场地湿的', topic_id: null, floor: 0, venue_id: V1, photo_count: 0, photos: [], tone: '', replies_open: true, publish_at: new Date(NOW).toISOString(), balls: 0, replies: 0, mine: false, my_ball: false };
  const g0 = S.feedGets; await E(() => { SBV.lastPoll = 0; SBV.wasVis = true });
  await until(() => S.feedGets > g0, 30);
  await until(async () => (await SRQ('[data-more]', 'r.classList.contains("show")')) === true);
  T('新动态：轮询读到别人的 → 先攒着，只亮胶囊，没画进列表', /↑ 1 条新动态/.test(await SRQ('[data-more]', 'r.textContent')) && !(await rows()).some(x => x.includes('刚下雨了')), [await SRQ('[data-more]', 'r.textContent'), await rows()]);
  await shot('04_新动态胶囊');
  await sr('[data-more]').click(); await until(async () => (await rows()).some(x => x.includes('刚下雨了')));
  T('点胶囊：放进列表', (await rows()).some(x => x.includes('刚下雨了')) && !(await SRQ('[data-more]', 'r.classList.contains("show")')));

  // ---- 刷新：feed 读不到时用缓存；配置不被内置 v1 盖掉 ----
  S.feedDown = true; const gc = S.cfgGets || 0;
  await pg.reload(); await pg.settle(900);
  await until(() => E(() => !!document.querySelector('#tabbar [data-tab="side"]')));
  await pg.waitForFunction(() => ME && ME.name === 'Sam', null, { timeout: 20000 }).catch(() => { });
  await E(() => { LOC.asked = true; closeSheet() }).catch(() => { }); await pg.settle(300);
  await pg.click('#tabbar [data-tab="side"]'); await pg.settle(800);
  const cached = await rows();
  T('刷新 + feed 读不到：用本机缓存画，不是空白', cached.length >= 4 && cached.some(x => x.includes('红土 3、4 号空着')), cached);
  T('刷新后配置仍是 v2（内置 v1 没盖掉它）', await E(() => !SB.CFG.topics.some(t => t.id === 'ootd') && SB.today() === 'brain'));
  // ---- 举报 / 不感兴趣 / 屏蔽（PR-C）：打到真接口，失败回滚 ----
  S.log.length = 0; await acts(P1, 'report', '[data-rr="harass"]'); await until(() => S.log.includes('POST /api/reports'));
  T('举报：POST /api/reports 带对象和原因', S.bodies['POST /api/reports'] && S.bodies['POST /api/reports'].target_type === 'sb_post' && S.bodies['POST /api/reports'].target_id === P1 && S.bodies['POST /api/reports'].reason === 'harass', S.bodies['POST /api/reports']);
  await pg.settle(500); S.log.length = 0; await acts(P1, 'block'); await until(() => S.log.includes('POST /api/blocks'));
  T('屏蔽：POST /api/blocks 带对方 id，画面立刻拿掉 TA 的帖子', S.bodies['POST /api/blocks'].user_id === MIA && !(await rows()).some(x => x.includes('红土 3、4 号空着')), [S.bodies['POST /api/blocks'], await rows()]);
  S.log.length = 0; await acts(P2, 'less'); await until(() => S.log.some(x => /\/hide$/.test(x)));
  T('不感兴趣：POST /hide', S.log.join() === 'POST /api/sideline/posts/P2/hide', S.log);
  await dc('.acts [data-act="l0"]');
  // ---- 我发过的（PR-C）：相册读 /mine，含已过 24 小时的；通知点开：不在已读列表里的那条单独读一条 ----
  const P6 = U('7'), P7 = U('6');
  const mk = (id, body, old) => ({ id, user_id: ME, city: 'melb', body, topic_id: null, floor: 0, venue_id: null, photo_count: 0, photos: [], tone: '', replies_open: true, publish_at: iso(old ? 3000 : 5), balls: 0, replies: 0, mine: true, my_ball: false, old: !!old });
  S.mine = [mk(P6, '上周发的那一条', true)]; S.extra = [mk(P7, '通知里的那一条', false), { ...mk(P6, 'x', true), user_id: MIA, mine: false }]; S.log.length = 0;
  await E(() => SBV.api.album()); await until(() => S.log.includes('GET /api/sideline/mine'));
  await until(async () => (await SRQ('.album', 'r.textContent')).includes('上周发的那一条'));
  T('相册（我发过的）：读 /mine，已过 24 小时的那条在里面', (await SRQ('.album', 'r.textContent')).includes('上周发的那一条'), await SRQ('.album', 'r.textContent'));
  await E(() => { const h = document.querySelector('#sbHost').shadowRoot; h.querySelector('[data-aback]').click() });
  T('通知点开：不在已读列表里的 → 先读那一条再打开', await E(async id => { const ok = await SBV.api.ensure(id); SBV.api.open(id); return ok }, P7) && await until(async () => (await SRQ('.sheet', 'r.textContent')).includes('通知里的那一条')) !== false, await SRQ('.sheet', 'r.textContent'));
  T('通知点开：读不到的（已删 / 看不到）→ 不打开、说已经不在了', (await E(id => SBV.api.ensure(id), U('5'))) === false);
  T('通知过时检查：真实模式没读进来的不当成已不在', await E(id => sbGone({ kind: 'sb_ball', sb_post_id: id }), U('4')) === null);

  // ---- 一期开关（PR-D）：真实模式不出「稍后公开」「新建话题」；照片开关默认开 ----
  await dc('[data-cam]'); await pg.settle(600);
  await dc('[data-cset]'); await pg.settle(500);
  T('一期：发布设置里没有「2 小时后再公开」，有「允许回复」', await SRQ('.csh', "r.textContent.includes('允许回复') && !r.textContent.includes('2 小时后再公开')"), await SRQ('.csh', 'r.textContent'));
  T('一期：照片开关默认开，稍后公开 / 新话题默认关', await E(() => SB.flags.photos() === true && SB.flags.later() === false && SB.flags.newTopic() === false));
  T('一期：照片开关能紧急关', await E(() => { window.NBQ_SB_PHOTOS_ON = false; const o = SB.flags.photos(); delete window.NBQ_SB_PHOTOS_ON; return o === false }));
  T('全程没有页面报错', errs.length === 0, errs);
  console.log('side_real: ' + pass + ' 通过, ' + fail + ' 失败'); await b.close(); process.exit(fail ? 1 : 0);
})();
