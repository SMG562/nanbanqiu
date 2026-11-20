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
    const u = new URL(r.request().url()), m = r.request().method(), p = u.pathname, pd = r.request().postData(), body = pd && !p.startsWith('/api/sideline/photos/') ? JSON.parse(pd) : null;
    if (!p.startsWith('/api/')) return r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: fs.readFileSync(path.join(DIR, '南伴球_PWA.html')) });
    if (p === '/api/events') return J(r, 200, { ok: true });
    if (p.startsWith('/api/sideline/') && m !== 'GET') { const k = m + ' ' + p.replace(/[0-9a-f]{8}-[0-9a-f-]{27}/g, x => ({ [P1]: 'P1', [P2]: 'P2', [P3]: 'P3', [P4]: 'P4', [P5]: 'P5' })[x] || x); S.log.push(k); S.bodies[k] = body; (S.idk[k] ||= []).push(r.request().headers()['idempotency-key'] || null) }
    if (m === 'GET') {
      if (p === '/api/venues') return J(r, 200, { venues: VENUES });
      if (S.phMock && p.startsWith('/api/sideline/photo/')) { if (S.phDelay) await new Promise(q => setTimeout(q, S.phDelay)); const old = u.searchParams.get('x') === 'old'; (S.phGets ||= []).push(p.split('/').pop() + '?x=' + u.searchParams.get('x') + ' ' + (old ? 410 : 200)); return old ? J(r, 410, { error: 'photo_expired' }) : r.fulfill({ status: 200, contentType: 'image/jpeg', body: S.jpg }) }
      if (p === '/api/me') return J(r, 200, { registered: true, user: S.me });
      if (p === '/api/games') return J(r, 200, { games: [] });
      if (p === '/api/games/mine') return J(r, 200, { games: [], participants: [], profiles: { [ME]: S.me } });
      if (p === '/api/invites') return J(r, 200, { invites: [], profiles: {} });
      if (p === '/api/profiles') return J(r, 200, { profiles: {} });
      if (p === '/api/sideline/config') { const v = +u.searchParams.get('v') || 0; S.cfgGets = (S.cfgGets || 0) + 1; if (v >= S.cfgV) return J(r, 200, { version: S.cfgV, same: true }); return J(r, 200, { version: S.cfgV, published_at: iso(60), config: S.cfg }) }
      if (p === '/api/sideline/feed') { S.feedGets++; if (S.feedDown) return r.abort(); if (S.pendingNew) { S.posts = [S.pendingNew, ...S.posts]; S.pendingNew = null } return J(r, 200, feedOut()) }
      if (p === '/api/sideline/mine') { S.log.push('GET /api/sideline/mine'); return J(r, 200, { posts: S.mine || [], next: null, topics: feedOut().topics, profiles: prof }) }
      const mm = p.match(/^\/api\/sideline\/posts\/([0-9a-f-]{36})$/);
      if (mm) { S.detailGets++; const x = S.posts.find(q => q.id === mm[1]) || (S.extra || []).find(q => q.id === mm[1]); if (!x) return J(r, 404, { error: 'not_found' }); const px = S.freshPh ? { ...x, photos: (x.photos || []).map(q => Object.fromEntries(Object.entries(q).map(([k, v]) => [k, typeof v === 'string' ? v.replace('x=old', 'x=new') : v]))) } : x; return J(r, 200, { post: { ...px, status: 'visible', public: !x.old }, replies: S.replies[x.id] || [], topics: feedOut().topics, profiles: prof }) }
      return J(r, 404, { error: 'not_found' }) }
    if (p.startsWith('/api/sideline/photos/') && m === 'PUT') { S.putN = (S.putN || 0) + 1; return J(r, 200, { key: p.split('/').pop(), size: 1 }) }
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
  await pg.waitForTimeout(60); T('点网球：接口回来时数字还在向上翻滚，没被直接覆盖', await SRQ('[data-ball="' + P2 + '"] .odo', '!!r.querySelector(".roll")'));
  await until(async () => /1/.test(await SRQ('[data-ball="' + P2 + '"] .odo', 'r.textContent')));
  T('点亮后数字变品牌绿（不是正文黑）', await until(async () => await SRQ('[data-ball="' + P2 + '"] .odo', 'getComputedStyle(r).color') === 'rgb(23, 107, 77)'));
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
  // ---- #393 P4b：发布页真选图 → 压缩 → 上传 → 发布带 photos（开关 NBQ_SB_PHOTO_POST）----
    await E(() => { window.NBQ_SB_PHOTO_POST = true }); await dc('[data-cx]'); await pg.settle(600); await dc('[data-cam]'); await pg.settle(800);
  T('P4b：发布页有选图入口（隐藏的文件框 + 正文下的「照片」按钮；没图时不画大加号框）', await SRQ('.compose', "!!r.querySelector('[data-cfile]') && !!r.querySelector('.ctool [data-lib]') && !r.querySelector('.phadd')"));
  const jpg = Buffer.from(await E(() => { const c = document.createElement('canvas'); c.width = 600; c.height = 400; const g = c.getContext('2d'); g.fillStyle = '#c60'; g.fillRect(0, 0, 600, 400); return c.toDataURL('image/jpeg', .9).split(',')[1] }), 'base64');
  S.failPost = null; S.putN = 0; S.log.length = 0;
  await SRQ('.compose', "(window.__phRm = [], new MutationObserver(m => m.forEach(x => x.removedNodes.forEach(n => n.classList && n.classList.contains('ph1') && window.__phRm.push(n.dataset.u)))).observe(r.querySelector('.phs'), { childList: true }), 1)");
  await pg.setInputFiles('#sbHost >> [data-cfile]', [{ name: 'a.jpg', mimeType: 'image/jpeg', buffer: jpg }]); await pg.settle(3000);
  T('P4b：一张图传完（b / t / full 各一个 PUT），格子里有缩略图、没有「重试」', S.putN === 3 && await SRQ('.compose', "r.querySelectorAll('.ph1 img').length === 1 && !r.querySelector('[data-pr]') && !r.querySelector('.phst')"), [S.putN, S.log]);
  T('P4b：上传进度 / 状态变化不重建缩略图格子（否则每格重播入场动画、图重载 = 真机闪三下）', await E(() => window.__phRm.length === 0), await E(() => window.__phRm));
  // 打字时：只留 取消 / 发布 + 输入框，底栏（照片 / 球场 / 设置）收起，输入框在可视区内；失焦后底栏回来
  // 聚焦前后版面必须一模一样（11-19：聚焦时收起相机框 / 缩缩略图，输入区上下跳 = 用户眼里的「抖动」）；底栏仍显示
  const LAY = "(() => { const g = x => { const e = r.querySelector(x); if (!e) return null; const b = e.getBoundingClientRect(); return [b.top, b.height, b.width].map(Math.round).join() }; return [g('[data-ctext]'), g('.phs'), g('.ph1'), g('.phadd'), g('.ctop')].join('|') })()";
  const lay0 = await SRQ('.compose', LAY);
  await sr('[data-ctext]').focus(); await pg.settle(300);
  T('打字时：版面不动（输入框 / 照片格 / 相机框位置尺寸不变）、键盘上方没有固定的工具条、输入框完整可见', (await SRQ('.compose', LAY)) === lay0 && await SRQ('.compose', "(() => { const t = r.querySelector('[data-ctext]').getBoundingClientRect(); return r.classList.contains('cmp-ty') && !r.querySelector('.cbot') && getComputedStyle(r.querySelector('.ctool')).position !== 'fixed' && t.height >= 100 && t.bottom <= innerHeight })()"));
  await sr('[data-ctext]').evaluate(e => e.blur()); await pg.settle(300);
  T('失焦后：版面仍不动', (await SRQ('.compose', LAY)) === lay0 && await SRQ('.compose', "!r.classList.contains('cmp-ty')"));
  // ---- #393 P4c：长按拖动换图片顺序，第一张 = 封面；短按移动 = 滚动，不换 ----
  await pg.setInputFiles('#sbHost >> [data-cfile]', [{ name: 'b.jpg', mimeType: 'image/jpeg', buffer: jpg }]); await pg.settle(3000);
  const IDS = "[...r.querySelectorAll('.ph1[data-u]')].map(n => n.dataset.u).join()", BOX = i => SRQ('.compose', `(() => { const b = r.querySelectorAll('.ph1[data-u]')[${i}].getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2] })()`);
  const ids0 = await SRQ('.compose', IDS), c0 = await BOX(0), c1 = await BOX(1);
  T('P4c：两张图时第一张有「封面」标记、第二张没有', await SRQ('.compose', "r.querySelectorAll('.ph1.cov').length === 1 && r.querySelector('.ph1[data-u]').classList.contains('cov')"), ids0);
  await pg.mouse.move(c0[0], c0[1]); await pg.mouse.down(); await pg.mouse.move(c0[0] + 20, c0[1], { steps: 3 }); await pg.mouse.up(); await pg.settle(300);
  T('P4c：没长按就移动（= 滚动）不换位置', (await SRQ('.compose', IDS)) === ids0);
  await pg.mouse.move(c0[0], c0[1]); await pg.mouse.down(); await pg.waitForTimeout(480); await pg.mouse.move(c1[0], c1[1], { steps: 6 }); await pg.mouse.up(); await pg.settle(300);
  const ids1 = await SRQ('.compose', IDS);
  T('P4c：长按第一张拖到第二张 = 两张换位，封面跟着换，没有残留拖动样式', ids1 === ids0.split(',').reverse().join() && await SRQ('.compose', "r.querySelectorAll('.ph1.cov').length === 1 && r.querySelector('.ph1[data-u]').dataset.u === '" + ids0.split(',')[1] + "' && !r.querySelector('.ph1.drag')"), [ids0, ids1]);
  await sr('.ph1[data-u] >> nth=1').locator('[data-pu]').click(); await pg.settle(300);
  T('P4c：移除一张后只剩一张、封面标记消失', await SRQ('.compose', "r.querySelectorAll('.ph1[data-u]').length === 1 && !r.querySelector('.ph1.cov')"));
  T('P4b：只有图、没写字也能点发布', await SRQ('.compose', "r.querySelector('[data-cgo]').textContent === '发布'"));
  await sr('[data-cgo]').click(); await pg.settle(1500);   // 真实点击：again() 里的二次 click 在 element.click() 期间会被浏览器忽略
  const pb = S.bodies['POST /api/sideline/posts'];
  T('P4b：发布请求带 photos（键 sb/<本人>/<名>.jpg + 宽高），正文可为空', !!pb && Array.isArray(pb.photos) && pb.photos.length === 1 && new RegExp('^sb/' + ME + '/[A-Za-z0-9_-]{16,24}\\.jpg$').test(pb.photos[0].key) && pb.photos[0].w > 0 && pb.photos[0].h > 0 && pb.body === '', pb);
  T('P4b：发布后列表里刚发的那条显示了照片（<img>），不是空白（#450：发出去看不到图）', await pg.evaluate(() => { const r = document.querySelector('#sbHost').shadowRoot; const i = r.querySelector('.it .bg img, .it img'); return !!i && /^blob:|^https?:/.test(i.getAttribute('src') || '') }));
  // #450：别人发的真照片帖，列表要画成带图的卡片（x.pic 是列表卡片的开关；只设 pics 时列表退成纯文字，点开详情才有图）
  S.feedDown = false; S.posts = [{ id: 'e1e1e1e1-0000-4000-8000-000000000001', user_id: JAY, city: 'melb', body: '', topic_id: null, floor: 0, venue_id: null, photo_count: 2, tone: '', replies_open: true, replies: 0, balls: 0, my_ball: false, mine: false, publish_at: iso(1), photos: [{ idx: 0, w: 1200, h: 1600, state: 'ok', t: '/api/sideline/photo/u9/a-t?x=1', url: '/api/sideline/photo/u9/a-f?x=1', b: '/api/sideline/photo/u9/a-b?x=1' }, { idx: 1, state: 'ok', t: '/api/sideline/photo/u9/b-t?x=1', url: '/api/sideline/photo/u9/b-f?x=1', b: '' }] }, ...S.posts];
  await pg.reload(); await pg.settle(900); await until(() => E(() => !!document.querySelector('#tabbar [data-tab="side"]'))); await E(() => { LOC.asked = true; closeSheet() }).catch(() => { }); await pg.click('#tabbar [data-tab="side"]'); await pg.settle(1200);
  const fp = await pg.evaluate(() => { const r = document.querySelector('#sbHost').shadowRoot, i = r.querySelector('[data-s="home"] .ln.pc .bg img'); return { n: r.querySelectorAll('[data-s="home"] .ln').length, first: (r.querySelector('[data-s="home"] .ln')||{}).outerHTML && r.querySelector('[data-s="home"] .ln').outerHTML.slice(0, 200), src: i && i.getAttribute('src'), stack: r.querySelectorAll('[data-s="home"] .ln.pc .mst i').length, pt: !!r.querySelector('[data-s="home"] .ln.pc.pt'), ar: !!r.querySelector('[data-s="home"] .ln.pc.lnar') } });
  T('真照片帖（别人发的，2 张）：列表画成带图卡片，用原图档（#483：缩略图拉到大卡片会糊），不叠小图，竖图是 4:5 高卡片（设计稿）', /a-f/.test(fp.src || '') && fp.stack === 0 && fp.pt && !fp.ar, fp);
  // ---- #488 列表卡片图：srcset 两档 + sizes 不低估渲染宽 + 首屏 2 张之外懒加载 ----
  const im = await pg.evaluate(() => { const r = document.querySelector('#sbHost').shadowRoot, i = r.querySelector('[data-s="home"] .ln.pc .bg img'); return i && { srcset: i.getAttribute('srcset'), sizes: i.getAttribute('sizes'), loading: i.getAttribute('loading'), w: i.getBoundingClientRect().width, vw: innerWidth, dpr: devicePixelRatio, cur: i.currentSrc } });
  T('#488 列表卡片图：srcset = 缩略 t（720w）+ 原图 u（1200w），竖图 1200×1600 按变体真实宽算', !!im && im.srcset === '/api/sideline/photo/u9/a-t?x=1 720w, /api/sideline/photo/u9/a-f?x=1 1200w', im);
  T('#488 sizes 不低估卡片渲染宽（写窄会选到小一档的图而发糊）：渲染宽 ≤ min(712, 视口 − 28)', !!im && im.sizes === 'min(712px,calc(100vw - 28px))' && im.w <= Math.min(712, im.vw - 28) + 0.5 && im.w > 300, im);
  T('#488 第一张不懒加载；DPR 1 的 362 宽卡片选缩略档（原图 1.5MB 档留给 3 倍屏）', !!im && im.loading !== 'lazy' && (im.dpr !== 1 || /a-t/.test(im.cur)), im);
  { const mk = i => ({ id: 'e1e1e1e1-0000-4000-8000-0000000001' + String(i).padStart(2, '0'), user_id: JAY, city: 'melb', body: '', topic_id: null, floor: 0, venue_id: null, photo_count: 1, tone: '', replies_open: true, replies: 0, balls: 0, my_ball: false, mine: false, publish_at: new Date(Date.now() - (i + 1) * 6e4).toISOString(), photos: [{ idx: 0, w: 1200, h: 1600, state: 'ok', t: `/api/sideline/photo/u9/p${i}-t?x=1`, url: `/api/sideline/photo/u9/p${i}-f?x=1`, b: `/api/sideline/photo/u9/p${i}-b?x=1` }] });
    S.posts = [0, 1, 2, 3, 4].map(mk);
    await pg.reload(); await pg.settle(900); await until(() => E(() => !!document.querySelector('#tabbar [data-tab="side"]'))); await E(() => { LOC.asked = true; closeSheet() }).catch(() => { }); await pg.click('#tabbar [data-tab="side"]'); await pg.settle(1200);
    const lz = await pg.evaluate(() => [...document.querySelector('#sbHost').shadowRoot.querySelectorAll('[data-s="home"] .ln.pc .bg img')].map(i => i.getAttribute('loading') || '')),
      tx = await pg.evaluate(() => document.querySelector('#sbHost').shadowRoot.querySelectorAll('[data-s="home"] .ln.pc .bg img').length);
    T('#488 多张带图卡片：前 2 张立即加载，第 3 张起 loading=lazy', tx === 5 && lz.slice(0, 2).every(x => x !== 'lazy') && lz.slice(2).every(x => x === 'lazy'), lz); }
  // ---- #488 图片地址过期（15–30 分钟）：图 410 → 读这一条的新地址 → 换 src 重试；不循环 ----
  { const ph = i => ({ id: 'e1e1e1e1-0000-4000-8000-0000000002' + String(i).padStart(2, '0'), user_id: JAY, city: 'melb', body: '', topic_id: null, floor: 0, venue_id: null, photo_count: 1, tone: '', replies_open: true, replies: 0, balls: 0, my_ball: false, mine: false, publish_at: new Date(Date.now() - (i + 1) * 6e4).toISOString(), photos: [{ idx: 0, w: 1200, h: 1600, state: 'ok', t: `/api/sideline/photo/u9/q${i}-t?x=old`, url: `/api/sideline/photo/u9/q${i}-f?x=old`, b: `/api/sideline/photo/u9/q${i}-b?x=old` }] });
    const open = async () => { await pg.reload(); await pg.settle(900); await until(() => E(() => !!document.querySelector('#tabbar [data-tab="side"]'))); await E(() => { LOC.asked = true; closeSheet() }).catch(() => { }); await pg.click('#tabbar [data-tab="side"]'); await pg.settle(2200) };
    const st = () => pg.evaluate(() => [...document.querySelector('#sbHost').shadowRoot.querySelectorAll('[data-s="home"] .ln.pc .bg img')].map(i => ({ s: i.getAttribute('src'), ss: i.getAttribute('srcset'), ok: i.complete && i.naturalWidth > 0 })));
    S.jpg = jpg; S.phMock = true; S.freshPh = true; S.phGets = []; S.posts = [ph(0)]; S.detailGets = 0; await open();
    const a = await st();
    T('#488 地址过期（410）：读这一条的新地址，src / srcset 换成新的，图真的显示出来', a.length === 1 && /x=new/.test(a[0].s) && /x=new/.test(a[0].ss) && !/x=old/.test(a[0].ss) && a[0].ok && S.detailGets === 1, { a, gets: S.phGets, dg: S.detailGets });
    T('#488 过期恢复：先 410 再用新地址 200，各一次，不反复请求', S.phGets.filter(x => /-[tf]\?.*410$/.test(x)).length === 1 && S.phGets.filter(x => /-[tf]\?.*200$/.test(x)).length >= 1, S.phGets);
    S.freshPh = false; S.phGets = []; S.detailGets = 0; await open();
    T('#488 读回的还是旧地址（服务端没换新）：这条 2 分钟内只读一次，不循环', S.detailGets <= 1 && S.phGets.length <= 4, { dg: S.detailGets, gets: S.phGets });
    S.phMock = false; S.freshPh = false; }
  // ---- #492 ①打码态提示：blurred 的图是 48px 小图拉满卡片，要写明「已打码」，别让人以为图坏了 ----
  { const mk = (i, st) => ({ id: 'e1e1e1e1-0000-4000-8000-0000000003' + String(i).padStart(2, '0'), user_id: JAY, city: 'melb', body: '', topic_id: null, floor: 0, venue_id: null, photo_count: 1, tone: '', replies_open: true, replies: 0, balls: 0, my_ball: false, mine: false, publish_at: new Date(Date.now() - (i + 1) * 6e4).toISOString(), photos: [st === 'blurred' ? { idx: 0, w: 1200, h: 1600, state: 'blurred', b: `/api/sideline/photo/u9/z${i}-b?x=1` } : { idx: 0, w: 1200, h: 1600, state: 'ok', t: `/api/sideline/photo/u9/z${i}-t?x=1`, url: `/api/sideline/photo/u9/z${i}-f?x=1`, b: `/api/sideline/photo/u9/z${i}-b?x=1` }] });
    S.posts = [mk(0, 'blurred'), mk(1, 'ok')];
    await pg.reload(); await pg.settle(900); await until(() => E(() => !!document.querySelector('#tabbar [data-tab="side"]'))); await E(() => { LOC.asked = true; closeSheet() }).catch(() => { }); await pg.click('#tabbar [data-tab="side"]'); await pg.settle(1200);
    const bl = await pg.evaluate(() => [...document.querySelector('#sbHost').shadowRoot.querySelectorAll('[data-s="home"] .ln.pc')].map(c => { const h = c.querySelector('.blh'); return { hint: h ? h.textContent : null, vis: h ? h.getBoundingClientRect().width > 20 : false } }));
    T('#492 打码的图：卡片上有「已打码」提示且看得见；正常图没有', bl.length === 2 && bl[0].hint === '已打码' && bl[0].vis && bl[1].hint === null, bl); }
  // ---- #492 ③④ v2 观感：氛围底（b 图）+ 显影淡入 + 小图（原图宽 < 600）摆成相框，不满铺拉糊 ----
  { const mk = (i, w) => ({ id: 'e1e1e1e1-0000-4000-8000-0000000004' + String(i).padStart(2, '0'), user_id: JAY, city: 'melb', body: '', topic_id: null, floor: 0, venue_id: null, photo_count: 1, tone: '', replies_open: true, replies: 0, balls: 0, my_ball: false, mine: false, publish_at: new Date(Date.now() - (i + 1) * 6e4).toISOString(), photos: [{ idx: 0, w, h: Math.round(w * 4 / 3), state: 'ok', t: `/api/sideline/photo/u9/y${i}-t?x=1`, url: `/api/sideline/photo/u9/y${i}-f?x=1`, b: `/api/sideline/photo/u9/y${i}-b?x=1` }] });
    S.jpg = jpg; S.phMock = true; S.feedDown = false; S.posts = [mk(0, 1200), mk(1, 500)];
    await pg.reload(); await pg.settle(900); await until(() => E(() => !!document.querySelector('#tabbar [data-tab="side"]'))); await E(() => { LOC.asked = true; closeSheet() }).catch(() => { }); await pg.click('#tabbar [data-tab="side"]'); await pg.settle(1500);
    const v2 = await pg.evaluate(() => [...document.querySelector('#sbHost').shadowRoot.querySelectorAll('[data-s="home"] .ln.pc')].map(c => { const t = c.querySelector('.tn'), i = c.querySelector('img.mi'); return { am: t.classList.contains('am'), sm: t.classList.contains('sm'), amb: !!c.querySelector('.amb'), w: i.getBoundingClientRect().width, cw: c.getBoundingClientRect().width, op: getComputedStyle(i).opacity } }));
    T('#492 v2：列表卡片有氛围底；高清图（宽 1200）满铺，低清图（宽 500）摆成相框（渲染宽 < 卡片宽的 80%）', v2.length === 2 && v2.every(x => x.am && x.amb) && !v2[0].sm && v2[0].w > v2[0].cw * 0.95 && v2[1].sm && v2[1].w < v2[1].cw * 0.8, v2);
    T('#492 v2：主图加载后「显影」淡入到可见（opacity 1）', v2.every(x => +x.op > 0.9), v2);
    // 慢网中间态：主图 1.6 秒才回来时，先看到氛围底（b 小图已先到），主图透明；回来后淡入
    S.posts = [mk(2, 1200), mk(3, 500)]; S.phDelay = 1600; await pg.reload(); await pg.settle(900); await until(() => E(() => !!document.querySelector('#tabbar [data-tab="side"]'))); await E(() => { LOC.asked = true; closeSheet() }).catch(() => { }); await pg.click('#tabbar [data-tab="side"]'); await pg.waitForTimeout(700);
    const mid = await pg.evaluate(() => [...document.querySelector('#sbHost').shadowRoot.querySelectorAll('[data-s="home"] .ln.pc')].map(c => { const i = c.querySelector('img.mi'), a = c.querySelector('.amb'); return { op: getComputedStyle(i).opacity, ld: i.classList.contains('ld'), amb: a && /url/.test(getComputedStyle(a).backgroundImage) } }));
    T('#492 v2 慢网中间态：主图没到时透明、氛围底在；不出现空白或破图', mid.length === 2 && mid.every(x => +x.op < 0.5 && !x.ld && x.amb), mid);
    S.phDelay = 0; await pg.waitForTimeout(2500);
    T('#492 v2 慢网：主图到了之后淡入完成', await pg.evaluate(() => [...document.querySelector('#sbHost').shadowRoot.querySelectorAll('[data-s="home"] .ln.pc img.mi')].every(i => i.classList.contains('ld') && +getComputedStyle(i).opacity > 0.9)));
    S.phMock = false; }
  // ---- #492 ② 大图弹层里的图过期（410）：读新地址后整格重画，图真的显示 ----
  { const pv = { id: 'e1e1e1e1-0000-4000-8000-000000000501', user_id: JAY, city: 'melb', body: '', topic_id: null, floor: 0, venue_id: null, photo_count: 1, tone: '', replies_open: true, replies: 0, balls: 0, my_ball: false, mine: false, publish_at: new Date(Date.now() - 6e4).toISOString(), photos: [{ idx: 0, w: 1200, h: 1600, state: 'ok', t: '/api/sideline/photo/u9/v1-t?x=new', url: '/api/sideline/photo/u9/v1-f?x=new', b: '/api/sideline/photo/u9/v1-b?x=new' }] };
    S.jpg = jpg; S.phMock = true; S.freshPh = true; S.phGets = []; S.posts = [pv]; S.detailGets = 0;
    await pg.reload(); await pg.settle(900); await until(() => E(() => !!document.querySelector('#tabbar [data-tab="side"]'))); await E(() => { LOC.asked = true; closeSheet() }).catch(() => { }); await pg.click('#tabbar [data-tab="side"]'); await pg.settle(1500);
    const sr = () => document.querySelector('#sbHost').shadowRoot;
    await pg.evaluate(() => document.querySelector('#sbHost').shadowRoot.querySelector('[data-s="home"] .ln.pc').click()); await pg.settle(900);
    await pg.evaluate(() => document.querySelector('#sbHost').shadowRoot.querySelector('.hero .hp').click()); await pg.settle(900);
    const before = await pg.evaluate(() => { const i = document.querySelector('#sbHost').shadowRoot.querySelector('.viewer .img img'); return !!i });
    S.detailGets = 0; await pg.evaluate(() => { const i = document.querySelector('#sbHost').shadowRoot.querySelector('.viewer .img img'); i.removeAttribute('srcset'); i.src = i.src.replace('x=new', 'x=old') }); await pg.settle(2000);
    const v = await pg.evaluate(() => { const i = document.querySelector('#sbHost').shadowRoot.querySelector('.viewer .img img'); return i && { s: i.getAttribute('src'), ok: i.complete && i.naturalWidth > 0 } });
    T('#492 ② 大图弹层图 410：读新地址重画，src 换新且图显示出来', before && v && /x=new/.test(v.s) && v.ok && S.detailGets === 1 && S.phGets.some(x => /v1-f\?x=old 410/.test(x)), { before, v, dg: S.detailGets, gets: S.phGets });
    S.phMock = false; S.freshPh = false; }
  // ---- #492 ③ 话题照片墙方格 / 相册「公开中」胶囊缩略：只拿缩略档（srcset+sizes），方格首屏外懒加载；不带氛围底 / 相框 ----
  { const mk = (i, mine) => ({ id: 'e1e1e1e1-0000-4000-8000-0000000006' + String(i).padStart(2, '0'), user_id: mine ? ME : JAY, city: 'melb', body: '', topic_id: 'brain', floor: 40 + i, venue_id: null, photo_count: 1, tone: '', replies_open: true, replies: 0, balls: 0, my_ball: false, mine: !!mine, publish_at: new Date(Date.now() - (i + 1) * 6e4).toISOString(), photos: [{ idx: 0, w: 1200, h: 1600, state: 'ok', t: `/api/sideline/photo/u9/g${i}-t?x=1`, url: `/api/sideline/photo/u9/g${i}-f?x=1`, b: `/api/sideline/photo/u9/g${i}-b?x=1` }] });
    S.jpg = jpg; S.phMock = true; S.posts = [0, 1, 2, 3, 4, 5].map(i => mk(i, i === 0)); S.mine = [];
    await pg.reload(); await pg.settle(900); await until(() => E(() => !!document.querySelector('#tabbar [data-tab="side"]'))); await E(() => { LOC.asked = true; closeSheet() }).catch(() => { }); await pg.click('#tabbar [data-tab="side"]'); await pg.settle(1200);
    await pg.evaluate(() => document.querySelector('#sbHost').shadowRoot.querySelector('[data-topic="brain"]').click()); await pg.settle(1200);
    const gd = await pg.evaluate(() => [...document.querySelector('#sbHost').shadowRoot.querySelectorAll('.itg .wt img.mi')].map(i => ({ ss: i.getAttribute('srcset'), sz: i.getAttribute('sizes'), lz: i.getAttribute('loading'), am: !!i.parentElement.querySelector('.amb'), w: i.getBoundingClientRect().width, vw: innerWidth })));
    T('#492 ③ 话题方格：6 张都带 srcset（t 720w + u 1200w）+ sizes；第 5 张起懒加载；无氛围底', gd.length === 6 && gd.every(x => /g\d-t\?x=1 720w, \S+g\d-f\?x=1 1200w/.test(x.ss || '') && x.sz && !x.am) && gd.slice(0, 4).every(x => x.lz !== 'lazy') && gd.slice(4).every(x => x.lz === 'lazy'), gd);
    T('#492 ③ 话题方格：sizes 不低估渲染宽（渲染宽 ≤ min(338,(视口−36)/2) + 0.5）', gd.length === 6 && gd.every(x => x.w > 50 && x.w <= Math.min(338, (x.vw - 36) / 2) + 0.5), gd);
    await E(() => SBV.api.album()); await pg.settle(1200);
    const cp = await pg.evaluate(() => { const i = document.querySelector('#sbHost').shadowRoot.querySelector('.album .pend .th img'); return i && { ss: i.getAttribute('srcset'), sz: i.getAttribute('sizes'), am: !!i.parentElement.querySelector('.amb') } });
    T('#492 ③ 相册胶囊缩略：srcset + sizes=48px，不带氛围底', cp && /g0-t\?x=1 720w/.test(cp.ss || '') && cp.sz === '48px' && !cp.am, cp);
    S.phMock = false; S.mine = []; }
  // ---- #488 我的相册 3 列方格：用缩略档（srcset+sizes）+ 懒加载，不再拿 1.5MB 原图画一百多像素的格子 ----
  { const mine = i => ({ id: 'e1e1e1e1-0000-4000-8000-0000000003' + String(i).padStart(2, '0'), user_id: ME, city: 'melb', body: '', topic_id: null, floor: 0, venue_id: null, photo_count: 1, tone: '', replies_open: true, replies: 0, balls: 0, my_ball: false, mine: true, status: 'visible', publish_at: new Date(Date.now() - (i + 40) * 36e5).toISOString(), photos: [{ idx: 0, w: 1200, h: 1600, state: 'ok', t: `/api/sideline/photo/u9/m${i}-t?x=1`, url: `/api/sideline/photo/u9/m${i}-f?x=1`, b: `/api/sideline/photo/u9/m${i}-b?x=1` }] });
    S.posts = []; S.mine = [0, 1, 2, 3].map(mine); await pg.reload(); await pg.settle(900); await until(() => E(() => !!document.querySelector('#tabbar [data-tab="side"]'))); await E(() => { LOC.asked = true; closeSheet() }).catch(() => { }); await pg.click('#tabbar [data-tab="side"]'); await pg.settle(1200);
    S.log.length = 0; await E(() => SBV.api.album()); await until(() => S.log.includes('GET /api/sideline/mine')); await pg.settle(1000);
    const al = await SRQ('.album', "[...r.querySelectorAll('.at img')].map(i => ({ ss: i.getAttribute('srcset'), sz: i.getAttribute('sizes'), lz: i.getAttribute('loading'), w: i.getBoundingClientRect().width, vw: innerWidth, dpr: devicePixelRatio, cur: i.currentSrc }))");
    T('#488 相册方格：4 张都带 srcset（t 720w + u 1200w）+ sizes + loading=lazy', al.length === 4 && al.every(x => /m\d-t\?x=1 720w, \S+m\d-f\?x=1 1200w/.test(x.ss || '') && x.sz === 'min(240px,calc((100vw - 34px)/3))' && x.lz === 'lazy'), al);
    T('#488 相册方格：sizes 不低估渲染宽（≤ (视口−34)/3 + 0.5）；DPR 1 选缩略档', al.length === 4 && al.every(x => x.w > 50 && x.w <= (x.vw - 34) / 3 + 0.5 && (x.dpr !== 1 || /-t\?/.test(x.cur))), al); }
  await E(() => { delete window.NBQ_SB_PHOTO_POST });
  T('全程没有页面报错', errs.length === 0, errs);
  console.log('side_real: ' + pass + ' 通过, ' + fail + ' 失败'); await b.close(); process.exit(fail ? 1 : 0);
})();
