// 全栈端到端（11-04）：浏览器里的真实前台 ↔ 真实的 server/api/handler.mjs ↔ 真实的 PostgreSQL（schema.sql）。
//   不是手写的假服务器：假服务器按我们自己写的规则回答，漏接的入口、和真服务器的差异都测不出来（6d 印象 / 徽章就是这样漏的）。
//   每个场景：在页面里做一次操作 → 重新加载页面（模拟刷新 / 换设备重新登录）→ 断言页面状态还在。
//   登录：只把 Supabase 换成假的（发码 / 验码直接给一个签好名的令牌）；其余全是真的。
//   加场景：在 SCENARIOS 里加一项 { name, act(page, ctx), check(page, ctx) }；操作用前台自己的函数 / 点击，不要直接改内存。
import fs from 'fs'; import { createRequire } from 'module'; import path from 'path'; import { fileURLToPath } from 'url';
import { startCluster, loadSchema } from '../pg/cluster.mjs';
const require = createRequire(import.meta.url), requirePg = require; const pg = requirePg('pg'), { chromium } = require('playwright');
const HERE = path.dirname(fileURLToPath(import.meta.url)), DIR = process.env.NBQ_DIR || path.join(HERE, '..', '..');
const { handleApi } = await import(path.join(DIR, 'server/api/handler.mjs')), { makeVerifier } = await import(path.join(DIR, 'server/api/jwt.mjs')), { makeDb } = await import(path.join(DIR, 'server/api/db.mjs'));
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 600) : '')) };
const SB = 'https://xosrdkrkfxkdrwldfhac.supabase.co';
// 点击：和用户点一样走前台真实的事件处理（这些入口正是 6d 漏掉的地方），不直接调函数
const clickAttrs = (pg, a) => pg.evaluate(a => { const el = document.createElement('button'); Object.entries(a).forEach(([k, v]) => el.setAttribute(k, v)); (typeof DEV !== 'undefined' ? DEV : document.body).appendChild(el); el.click(); el.remove() }, a);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const until = async (fn, n = 40) => { for (let i = 0; i < n; i++) { try { if (await fn()) return true } catch (_) { } await sleep(250) } return false };

const c = startCluster(); let admin, br;
try {
  c.createdb('nbq');
  const errs = loadSchema(c, 'nbq', path.join(DIR, 'schema.sql')); T('schema 执行无错误', !errs.length, errs.slice(0, 3));
  admin = new pg.Pool({ host: c.host, port: c.port, user: 'postgres', database: 'nbq', max: 2 });
  await admin.query(`create role nbq_api login in role nbq_user, nbq_service`);
  const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const jwk = { ...(await crypto.subtle.exportKey('jwk', kp.publicKey)), alg: 'ES256', kid: 'k1' }, ISS = SB + '/auth/v1';
  const b64 = x => Buffer.from(x).toString('base64url');
  const token = async sub => { const h = b64(JSON.stringify({ alg: 'ES256', kid: 'k1' })), p = b64(JSON.stringify({ iss: ISS, aud: 'authenticated', sub, exp: Math.floor(Date.now() / 1000) + 3000 }));
    return h + '.' + p + '.' + b64(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, kp.privateKey, new TextEncoder().encode(h + '.' + p))) };
  const deps = { verify: makeVerifier({ url: SB, fetch: async () => ({ ok: true, json: async () => ({ keys: [jwk] }) }) }),
    db: makeDb(async () => { const cl = new pg.Client({ host: c.host, port: c.port, user: 'nbq_api', database: 'nbq' }); await cl.connect(); return cl }) };

  // ---- 数据：我（H）、另一位球友（P）、一个球场、一场别人发的未来球局 ----
  const AH = '11111111-aaaa-4aaa-8aaa-aaaaaaaaaaaa', AP = '22222222-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  await admin.query(`insert into users(auth_id, phone_e164, nickname, last_initial, utr, pact_accepted_at) values ($1,'+61412345678','Sam','L',5.5, now()), ($2,'+61400000002','Pat','W',5.5, now())`, [AH, AP]);
  const H = (await admin.query('select id from users where auth_id=$1', [AH])).rows[0].id, P = (await admin.query('select id from users where auth_id=$1', [AP])).rows[0].id;
  await admin.query(`insert into suburbs(name, postcode, centroid) values ('Glen Iris','3146','POINT(145.05 -37.86)')`);
  const V = (await admin.query(`insert into venues(name, short_name, suburb, postcode, location, surfaces, status) values ('Glen Iris Tennis Club','Glen Iris','Glen Iris','3146', st_makepoint(145.05, -37.86)::geography, '{hard}', 'active') returning id`)).rows[0].id;
  const V2 = (await admin.query(`insert into venues(name, short_name, suburb, postcode, location, surfaces, status) values ('Kooyong Lawn Tennis Club','Kooyong','Glen Iris','3146', st_makepoint(145.04, -37.84)::geography, '{grass}', 'active') returning id`)).rows[0].id;   // 申请 / 打过球会自动把那个球场算进「我的 Club」，所以保存 Club 单独用另一个球场
  const G = (await admin.query(`insert into games(share_code, host_id, venue_id, starts_at, duration_min, game_type, capacity, utr_min, utr_max, join_mode, visibility) values ('e2e001',$1,$2, now()+interval '2 days', 90,'singles',2,3,8,'approve','public') returning id`, [P, V])).rows[0].id;
  const GF = (await admin.query(`insert into games(share_code, host_id, venue_id, starts_at, duration_min, game_type, capacity, utr_min, utr_max, join_mode, visibility) values ('e2e002',$1,$2, now()-interval '5 hours', 90,'singles',2,3,8,'approve','public') returning id`, [P, V])).rows[0].id;
  await admin.query(`insert into game_participants(game_id, user_id, status, approved_at, created_at) values ($1,$2,'approved', now()-interval '1 day', now()-interval '2 days')`, [GF, H]);   // 5 小时前开打、1.5 小时前结束：我和 P 打过
  if (process.env.E2E_DEBUG) console.log('DBG', JSON.stringify((await admin.query('select p.user_id=$2 as me, p.status, p.role, g.status gs, g.starts_at < now() past from game_participants p join games g on g.id=p.game_id where g.id=$1', [GF, H])).rows));
  const ctx0 = { H, P, V, V2, G, GF };

  // ---- 场景：做一次 → 刷新（重新加载 + 重新登录读回）→ 页面状态还在 ----
  const SCENARIOS = [
    { name: '申请加入别人的球局', act: (pg, x) => pg.evaluate(g => nbqApplyReq(g, '你好，想一起打'), x.G), check: (pg, x) => pg.evaluate(([g, me]) => PARTS.some(p => p.game_id === g && p.user_id === me && p.status === 'pending'), [x.G, x.H]) },
    { name: '保存我的 Club', act: (pg, x) => pg.evaluate(v => nbqSetClubs([v]), x.V2), check: (pg, x) => pg.evaluate(v => (ME.home_club_ids || []).includes(v), x.V2) },
    // ---- 赛后：每个入口各一项（6d 就是漏了其中几个）----
    { name: '赛后卡片 · 多遇到', act: (pg, x) => clickAttrs(pg, { 'data-rc': 'more', 'data-g': x.GF, 'data-u': x.P }), check: (pg, x) => pg.evaluate(([me, p]) => (OPIN[me + '>' + p] || {}).v === 'more', [x.H, x.P]) },
    { name: '赛后卡片 · 印象标签（守时）', act: (pg, x) => clickAttrs(pg, { 'data-rcx': 'tag', 'data-g': x.GF, 'data-u': x.P, 'data-v': 'ontime' }), check: (pg, x) => pg.evaluate(([me, p, g]) => (KUDOS.get(me + '|' + p + '|' + g) || []).includes('ontime'), [x.H, x.P, x.GF]) },
    { name: '球员卡 · 给 TA 留个印象（友善）', act: (pg, x) => clickAttrs(pg, { 'data-sx': 'impPick', 'data-u': x.P, 'data-g': x.GF, 'data-v': 'kind' }), check: (pg, x) => pg.evaluate(([me, p, g]) => { const k = KUDOS.get(me + '|' + p + '|' + g) || []; return k.includes('kind') && k.includes('ontime') }, [x.H, x.P, x.GF]) },
    { name: '赛后卡片 · 确认没来', act: (pg, x) => clickAttrs(pg, { 'data-rcx': 'nsok', 'data-g': x.GF, 'data-u': x.P }), check: (pg, x) => pg.evaluate(([me, p, g]) => !!(NS[g + '|' + p] && NS[g + '|' + p].has(me)), [x.H, x.P, x.GF]) },
    { name: '徽章 · 已庆祝（百场）', act: pg => pg.evaluate(() => { bdgSync(['hundred'], ['hundred']) }), check: pg => pg.evaluate(async () => { const r = await NBQ_NET.get('/api/me/badges'); return !!(r.ok && (r.data.badges || []).some(b => b.code === 'hundred' && b.seen_at)) }) },
    { name: '赛后卡片 · 感受（偏难）', act: (pg, x) => clickAttrs(pg, { 'data-rc': 'feel', 'data-g': x.GF, 'data-v': 'hard' }), check: (pg, x) => pg.evaluate(([me, g]) => (AFTER[g + '|' + me] || {}).feel === 'hard', [x.H, x.GF]) },
    // ---- 举报（11-05 已举报标记刷新后丢）：走前台真实入口——球员卡「举报」打开面板 → 点原因提交；刷新后必须仍认得出「已举报」----
    { name: '球员卡 · 举报一位球友（骚扰）', act: async (pg, x) => { await clickAttrs(pg, { 'data-a': 'report', 'data-u': x.P }); await sleep(500); await clickAttrs(pg, { 'data-rp': 'harass' }) }, check: (pg, x) => pg.evaluate(p => !!repOpenOf('user', p), x.P) },
    // 屏蔽放最后：屏蔽后和对方的球局、赛后都不再可见
    { name: '屏蔽一位球友', act: (pg, x) => pg.evaluate(p => nbqBlock(p, true), x.P), check: (pg, x) => pg.evaluate(p => !!ME.blocked && ME.blocked.has(p), x.P) },
    // 自检：只改内存的动作，刷新后必须「丢」——证明这套检查真能发现「没写服务器」
    { name: '（自检）只改内存的动作', lost: true, act: pg => pg.evaluate(() => { window.__mem = 1; localStorage.removeItem('e2e_mem'); ME.__e2e = 1; USERS[ME.id].__e2e = 1 }), check: pg => pg.evaluate(() => !!(ME && ME.__e2e)) },
  ];

  const exe = [process.env.NBQ_CHROMIUM, '/opt/pw-browsers/chromium'].find(x => x && fs.existsSync(x));   // 本机有固定路径就用，CI 里用 playwright 自带的
  br = await chromium.launch({ ...(exe ? { executablePath: exe } : {}), args: ['--no-sandbox'] });
  for (const f of ['南伴球_PWA.html', '南伴球_Web.html']) {
    await admin.query('delete from blocks'); await admin.query('delete from user_clubs'); for (const t of ['impressions', 'noshow_reports', 'game_feel', 'player_prefs', 'player_pref_mutes', 'user_badges', 'reports']) await admin.query(`delete from ${t}`); await admin.query('delete from game_participants where user_id = $1 and game_id = $2', [H, G]);   // 两个文件各自从干净状态开始
    const W = f.includes('Web'), ctx = await br.newContext({ viewport: W ? { width: 1360, height: 860 } : { width: 390, height: 844 } });
    const pg = await ctx.newPage(), perr = []; pg.on('pageerror', e => perr.push(e.message));
    const AT = await token(AH);
    await pg.route('https://nanbanqiu.app/**', async r => { const rq = r.request(), u = new URL(rq.url());
      if (!u.pathname.startsWith('/api/')) return r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: fs.readFileSync(path.join(DIR, f)) });
      const init = { method: rq.method(), headers: rq.headers() }; const pd = rq.postData(); if (pd) init.body = pd;
      const res = await handleApi(new Request(u.toString(), init), deps), body = Buffer.from(await res.arrayBuffer());
      if (process.env.E2E_DEBUG && rq.method() !== 'GET') console.log('API', rq.method(), u.pathname, pd || '', '→', res.status, body.toString().slice(0, 120));
      r.fulfill({ status: res.status, headers: Object.fromEntries(res.headers), body }) });
    await pg.route(SB + '/**', r => { const v = r.request().url().includes('/verify');
      r.fulfill({ status: v ? 200 : 204, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: v ? JSON.stringify({ access_token: AT, refresh_token: 'RT', expires_in: 3000, user: { id: AH, phone: '61412345678' } }) : '' }) });
    await pg.route(url => !/^https:\/\/(nanbanqiu\.app|xosrdkrkfxkdrwldfhac\.supabase\.co)\//.test(url.toString()), r => r.abort());
    const dbg = () => pg.evaluate(() => ({ me: !!ME, stale: typeof NBQ_STALE !== 'undefined' && NBQ_STALE, games: GAMES.length, toast: (document.querySelector('#toast') || {}).textContent, url: location.href }));
    const loggedIn = () => pg.evaluate(() => !!ME && !(typeof NBQ_STALE !== 'undefined' && NBQ_STALE) && Object.keys(VEN).length > 0);
    await pg.goto('https://nanbanqiu.app/'); await sleep(600);
    await pg.evaluate(() => { openAuth(null) }); await sleep(300); await pg.fill('#ph', '0412 345 678'); await pg.click('[data-a="sendCode"]'); await sleep(400); await pg.fill('#otp', '123456');
    T(`${f} 登录（真实接口读入）`, await until(loggedIn), await pg.evaluate(() => !!ME));
    for (const s of SCENARIOS) {
      T(`${f} ${s.name}：做之前不成立`, !(await s.check(pg, ctx0)));
      await s.act(pg, ctx0);
      T(`${f} ${s.name}：做完立刻成立`, await until(() => s.check(pg, ctx0)), await dbg());
      await pg.reload(); T(`${f} ${s.name}：刷新后重新读入`, await until(loggedIn), await dbg());
      if (s.lost) T(`${f} ${s.name}：刷新后丢失（检查能发现没写服务器）`, !(await s.check(pg, ctx0)));
      else T(`${f} ${s.name}：刷新后还在`, await until(() => s.check(pg, ctx0)), await s.check(pg, ctx0));
    }
    T(`${f} 无脚本错误`, perr.length === 0, perr); await ctx.close();
  }
} catch (e) { fail++; console.log('FAIL 异常 ' + String((e && (e.stack || e.message)) || JSON.stringify(e)).slice(0, 1500)) } finally { try { await br?.close() } catch (_) { } try { await admin?.end() } catch (_) { } c.stop() }
console.log(`\nfullstack: ${pass} 通过, ${fail} 失败`); process.exit(fail ? 1 : 0);
