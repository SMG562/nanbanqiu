// #27 PR-B1：后台真登录 + 真模式外壳 端到端（浏览器里的真实后台页面 ↔ 真实的 server/admin/api.mjs ↔ 真实的 PostgreSQL，schema.sql）。
//   不是手写的假服务器：登录规则（防跨站、验证码、恢复码、锁定、会话过期）全是线上同一套代码。
//   只有两处是测试自己做的：用 Node 的 http 把后台页面和 /admin/api 挂在 127.0.0.1 上；用一个可控的时钟给验证码（同一个 30 秒的码只能用一次）。
//   覆盖：不闪登录页 · 登录 / 退出 / 刷新还在 · 错误提示（密码错、锁定、服务不可用、网络不通、没开通的网址）· 防连点 ·
//         恢复码 · 会话过期回登录页 · 真模式下点遍所有页面一个模拟数字都没有 · 演示模式只在 file: 和预览站根域名（仿冒域名不算）。
import fs from 'fs'; import { createRequire } from 'module'; import http from 'http'; import path from 'path'; import { fileURLToPath, pathToFileURL } from 'url';
import { startCluster, loadSchema } from '../pg/cluster.mjs';
const require = createRequire(import.meta.url), pg = require('pg'), { chromium } = require('playwright');
const HERE = path.dirname(fileURLToPath(import.meta.url)), DIR = process.env.NBQ_DIR || path.join(HERE, '..', '..');
const AU = await import(pathToFileURL(path.join(DIR, 'server/admin/auth.mjs'))), API = await import(pathToFileURL(path.join(DIR, 'server/admin/api.mjs')));
const HTML = fs.readFileSync(path.join(DIR, '南伴球_后台.html'));
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 600) : '')) };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const until = async (fn, n = 40) => { for (let i = 0; i < n; i++) { try { if (await fn()) return true } catch (_) { } await sleep(100) } return false };

const c = startCluster(); let su, br, srv;
try {
  c.createdb('nbq');
  const errs = loadSchema(c, 'nbq', path.join(DIR, 'schema.sql')); T('schema 执行无错误', !errs.length, errs.slice(0, 3));
  c.psql('nbq', `-c "alter role nbq_admin_api login"`);
  su = new pg.Pool({ host: c.host, port: c.port, user: 'postgres', database: 'nbq', max: 3 });
  const one = async (s, p) => (await su.query(s, p)).rows[0];

  // ---- 账号 ----
  const PW = 'correct horse battery', SEC = AU.newTotpSecret(), PH = AU.hashPassword(PW), RC = AU.newRecoveryCodes();
  const mk = async (email, name, role, rc = [], disabled = false) => (await one(`insert into admin_users(email,name,role,password_hash,totp_secret,recovery_hashes,disabled) values ($1,$2,$3,$4,$5,$6,$7) returning id`, [email, name, role, PH, SEC, rc, disabled])).id;
  await mk('han@x.com', 'Han', 'owner', RC.hashes); await mk('ops@x.com', 'Amy', 'operator'); await mk('view@x.com', 'Leo', 'viewer'); await mk('off@x.com', 'Off', 'operator', [], true);
  for (const e of ['lock', 'a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7']) await mk(e + '@x.com', e, 'operator');

  // ---- 服务器：页面 + /admin/api（线上同一套 handleAdmin）----
  let clock = 1_800_000_000_000, dbDown = false, hosts = ['127.0.0.1'], ip = '203.0.113.1', loginPosts = 0;
  const connect = async () => { if (dbDown) throw Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' }); const cl = new pg.Client({ host: c.host, port: c.port, user: 'nbq_admin_api', database: 'nbq' }); await cl.connect(); return cl };
  srv = http.createServer(async (req, res) => {
    const chunks = []; for await (const b of req) chunks.push(b);
    if (!req.url.startsWith('/admin/api')) { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); return res.end(HTML) }
    if (req.method === 'POST' && req.url.startsWith('/admin/api/login')) loginPosts++;
    const h = new Headers(); for (const [k, v] of Object.entries(req.headers)) h.set(k, String(v)); h.set('CF-Connecting-IP', ip);
    const r = await API.handleAdmin(new Request('http://' + req.headers.host + req.url, { method: req.method, headers: h, body: ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(chunks) }), { connect, hosts, now: () => clock });
    const out = {}; r.headers.forEach((v, k) => { out[k] = v }); res.writeHead(r.status, out); res.end(await r.text());
  });
  await new Promise(r => srv.listen(0, '127.0.0.1', r)); const PORT = srv.address().port, URL0 = `http://127.0.0.1:${PORT}/admin`;

  const exe = [process.env.NBQ_CHROMIUM, '/opt/pw-browsers/chromium'].find(x => x && fs.existsSync(x));   // 本机有固定路径就用，CI 里用 playwright 自带的
  br = await chromium.launch({ ...(exe ? { executablePath: exe } : {}), args: ['--no-sandbox', '--host-resolver-rules=MAP *.pages.dev 127.0.0.1, MAP evil.test 127.0.0.1'] });
  const open = async (url = URL0) => { const ctx = await br.newContext({ viewport: { width: 1360, height: 900 } }), pg = await ctx.newPage(); const pe = []; pg.on('pageerror', e => pe.push(e.message)); await pg.goto(url); return { ctx, pg, pe } };
  const vis = (pg, s) => pg.evaluate(s => { const e = document.querySelector(s); if (!e) return false; const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0 && r.height > 0 }, s);
  const code = () => { clock += 30e3; return AU.totp(SEC, clock) };
  const fill = async (pg, email, pw, cd) => { await pg.fill('#lgEmail', email); await pg.fill('#lgPw', pw); await pg.fill('#lgCode', cd) };
  const err = pg => pg.evaluate(() => { const e = document.getElementById('lgErr'); return e.hidden ? '' : e.textContent });
  const loginAs = async (pg, email = 'han@x.com') => { await until(() => vis(pg, '#lgEmail')); await fill(pg, email, PW, code()); await pg.click('.go'); return until(() => vis(pg, '#app')) };

  // ================= 1. 打开：先问「我是谁」，期间既不显示登录页也不显示后台（不闪） =================
  {
    const { ctx, pg, pe } = await open(URL0 + '#x');            // 先拿一个页面实例；下面重新用延迟的 /me 打开
    await pg.close();
    const p2 = await ctx.newPage(); await p2.route('**/admin/api/me', async r => { await sleep(700); r.continue() });
    await p2.goto(URL0); await sleep(250);
    T('1.1 /me 还没回来：登录页和后台都不显示，只有「正在确认」', !(await vis(p2, '#login')) && !(await vis(p2, '#app')) && await vis(p2, '#boot'));
    T('1.2 /me 回来（没登录）：显示登录页，不显示后台', await until(() => vis(p2, '#lgEmail')) && !(await vis(p2, '#app')) && !(await vis(p2, '#boot')));
    T('1.3 真模式的登录页：没有演示用的假输入框和演示身份', !(await vis(p2, '#demoRole')) && !(await p2.evaluate(() => /han@nanbanqiu\.app|••••/.test(document.getElementById('login').innerText))));
    T('1.4 页面模式 = real；演示开关没有启动', await p2.evaluate(() => document.documentElement.dataset.mode === 'real' && NBQ_MODE === 'real' && !window._tk));
    T('1.5 没有页面报错', !pe.length, pe); await ctx.close();
  }

  // ================= 2. 登录失败：提示、清空、不暴露哪一项错 =================
  {
    const { ctx, pg, pe } = await open(); await until(() => vis(pg, '#lgEmail'));
    await pg.click('.go'); T('2.1 什么都不填点登录：本地提示，不发请求', /请填写/.test(await err(pg)) && loginPosts === 0);
    await fill(pg, 'han@x.com', PW, '12345'); await pg.click('.go'); T('2.2 验证码不是 6 位：本地提示，不发请求', /6 位数字/.test(await err(pg)) && loginPosts === 0);
    await fill(pg, 'han@x.com', 'wrong password!!', code()); await pg.click('.go'); await until(async () => !!(await err(pg)));
    T('2.3 密码错：只说「邮箱、密码或验证码不对」', await err(pg) === '邮箱、密码或验证码不对', await err(pg));
    T('2.4 失败后密码和验证码被清空，邮箱保留；仍在登录页', await pg.evaluate(() => [lgPw.value, lgCode.value, lgEmail.value]).then(v => v[0] === '' && v[1] === '' && v[2] === 'han@x.com') && await vis(pg, '#lgEmail') && !(await vis(pg, '#app')));
    await fill(pg, 'nobody@x.com', PW, code()); await pg.click('.go'); await until(async () => /不对/.test(await err(pg)));
    T('2.5 邮箱不存在：提示和密码错完全一样（防猜账号）', await err(pg) === '邮箱、密码或验证码不对');
    await fill(pg, 'off@x.com', PW, code()); await pg.click('.go'); await until(async () => /不对/.test(await err(pg)));
    T('2.6 已停用的账号：同样的提示', await err(pg) === '邮箱、密码或验证码不对');
    T('2.7 没有页面报错', !pe.length, pe); await ctx.close();
  }

  // ================= 3. 登录成功 → 我的账号；刷新还在；退出 =================
  {
    const { ctx, pg, pe } = await open(); T('3.1 登录成功', await loginAs(pg));
    T('3.2 侧栏显示自己的名字和身份（来自服务器，不是演示的 Han）', await pg.evaluate(() => [document.querySelector('.side .me b').textContent, document.querySelector('.side .me small').textContent]).then(v => v[0] === 'Han' && v[1] === '超级管理员'));
    T('3.3 首页 = 我的账号：列出服务器返回的权限', await pg.evaluate(() => { const t = document.getElementById('page').innerText; return document.getElementById('pt').textContent === '我的账号' && /查看统计和名单/.test(t) && /page\.view/.test(t) && /共 \d+ 项/.test(t) }));
    T('3.4 令牌不在页面能碰到的地方（Cookie 是 httpOnly；localStorage / sessionStorage 没有凭证）', await pg.evaluate(() => !document.cookie.includes('nbq_admin') && !JSON.stringify(localStorage).includes('nbq') && !JSON.stringify(sessionStorage).includes('nbq')) && (await ctx.cookies()).some(k => k.name === 'nbq_admin' && k.httpOnly && k.sameSite === 'Strict'));
    T('3.5 密码和验证码输入框是空的', await pg.evaluate(() => lgPw.value === '' && lgCode.value === ''));
    // 刷新：还在登录态，且期间不闪登录页
    const p2 = await ctx.newPage(); await p2.route('**/admin/api/me', async r => { await sleep(500); r.continue() });
    await p2.goto(URL0); await sleep(200);
    T('3.6 刷新（/me 还没回来）：不闪登录页', !(await vis(p2, '#login')) && !(await vis(p2, '#app')));
    T('3.7 刷新后仍是登录态、仍是我的账号', await until(() => vis(p2, '#app')) && await p2.evaluate(() => document.getElementById('pt').textContent === '我的账号'));
    await p2.close();
    // 退出
    await pg.click('.side .me button'); await until(() => vis(pg, '#lgEmail'));
    T('3.8 退出：回到登录页并说明；页面内容清空（不留上一位的内容）', /已退出登录/.test(await err(pg)) && await pg.evaluate(() => document.getElementById('page').innerHTML === '' && document.getElementById('nav').innerHTML === ''));
    const after = await pg.evaluate(async () => (await fetch('/admin/api/me', { headers: { 'X-NBQ-Admin': '1' } })).status);
    T('3.9 退出后服务端的会话真的作废了（不只是清 Cookie）', after === 401, after);
    await pg.reload(); T('3.10 退出后刷新：仍在登录页', await until(() => vis(pg, '#lgEmail')) && !(await vis(pg, '#app')));
    T('3.11 没有页面报错', !pe.length, pe); await ctx.close();
  }

  // ================= 4. 防连点：只发一次登录请求 =================
  {
    const { ctx, pg } = await open(); await until(() => vis(pg, '#lgEmail')); await fill(pg, 'a1@x.com', PW, code());
    const n0 = loginPosts; await pg.evaluate(() => { const b = document.querySelector('#login .go'); b.click(); b.click(); b.click() }); await until(() => vis(pg, '#app'));
    T('4.1 连点三下登录：只发出一个登录请求（验证码 30 秒内只能用一次，第二个必然失败）', loginPosts - n0 === 1, loginPosts - n0);
    T('4.2 且登录成功', await vis(pg, '#app')); await ctx.close();
  }
  {
    const { ctx, pg } = await open(); await until(() => vis(pg, '#lgEmail')); await fill(pg, 'a7@x.com', PW, code());
    const n0 = loginPosts; await pg.evaluate(() => { onLogin(new Event('submit', { cancelable: true })); onLogin(new Event('submit', { cancelable: true })) }); await until(() => vis(pg, '#app'));
    T('4.3 绕过按钮、直接连调两次提交（回车等路径）：仍只发一个登录请求', loginPosts - n0 === 1, loginPosts - n0); await ctx.close();
  }

  // ================= 5. 恢复码 =================
  {
    const { ctx, pg } = await open(); await until(() => vis(pg, '#lgEmail'));
    await pg.click('#lgAlt'); T('5.1 点「改用恢复码」：标签和输入方式换了', await pg.evaluate(() => /恢复码/.test(lgCodeLab.textContent) && lgCode.autocomplete === 'off' && /改用验证码/.test(lgAlt.textContent)));
    await fill(pg, 'han@x.com', PW, RC.codes[0]); await pg.click('.go'); T('5.2 用恢复码登录成功', await until(() => vis(pg, '#app')));
    await pg.click('.side .me button'); await until(() => vis(pg, '#lgEmail'));
    T('5.3 退出后登录页回到默认（验证码方式）', await pg.evaluate(() => /验证码/.test(lgCodeLab.textContent) && !/恢复码/.test(lgCodeLab.textContent)));
    await pg.click('#lgAlt'); await fill(pg, 'han@x.com', PW, RC.codes[0]); await pg.click('.go'); await until(async () => !!(await err(pg)));
    T('5.4 同一个恢复码不能用第二次', await err(pg) === '邮箱、密码或验证码不对' && !(await vis(pg, '#app')), await err(pg)); await ctx.close();
  }

  // ================= 6. 角色：运营、只读 =================
  for (const [email, who, role] of [['ops@x.com', 'Amy', '运营'], ['view@x.com', 'Leo', '只读']]) {
    const { ctx, pg } = await open(); await loginAs(pg, email);
    T(`6.${role} 侧栏显示 ${who} / ${role}，权限表按角色来`, await pg.evaluate(([w, r]) => document.querySelector('.side .me b').textContent === w && document.querySelector('.side .me small').textContent === r && S.role === (r === '运营' ? 'operator' : 'viewer'), [who, role]) && (role === '运营' ? !/永久封禁/.test(await pg.evaluate(() => document.getElementById('page').innerText)) : /共 1 项/.test(await pg.evaluate(() => document.getElementById('page').innerText)))); await ctx.close();
  }

  {
    const ctx = await br.newContext(), pg = await ctx.newPage(); await pg.route('**/admin/api/me', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ name: 'X', role: 'god', perms: [] }) }));
    await pg.goto(URL0); await until(() => vis(pg, '#app'));
    T('6.未知角色：按最小权限（只读）处理，不会当成管理员', await pg.evaluate(() => S.role === 'viewer' && document.querySelector('.side .me small').textContent === '只读')); await ctx.close();
  }

  {
    const ctx = await br.newContext(), pg = await ctx.newPage(), pe = []; pg.on('pageerror', e => pe.push(e.message));
    await pg.route('**/admin/api/me', r => r.fulfill({ status: 200, contentType: 'text/html', body: '<html>被前面的东西截了</html>' }));
    await pg.goto(URL0); await until(() => vis(pg, '#lgEmail'));
    T('6.b /me 回 200 但不是 JSON（被代理 / 登录墙截了）：显示登录页并说明，不崩、不进后台', /内容不对/.test(await err(pg)) && !(await vis(pg, '#app')) && !pe.length, [await err(pg), pe]); await ctx.close();
  }

  // ================= 7. 真模式铁律：点遍所有页面，一个模拟数字都没有 =================
  {
    const { ctx, pg, pe } = await open(); await loginAs(pg, 'a2@x.com');
    // 已接真数据的页面：每接一页在这里加一个（11-12 起由 #27 第 4 步各块追加）；和页面里的 REAL_PAGES 必须一致
    const REAL = ['account', 'review', 'venues', 'users', 'games', 'safety', 'admin', 'cities',
      'overview', 'cards', 'regions', 'traffic', 'growth', 'platform', 'env', 'life', 'after', 'grow', 'sb', 'stopic', 'ssched', 'sguide', 'events'];
    T('7.0 页面登记的真数据页（REAL_PAGES）和这里的清单一致', JSON.stringify(Object.keys(await pg.evaluate(() => Object.fromEntries(Object.keys(REAL_PAGES).map(k => [k, 1])))).sort()) === JSON.stringify([...REAL].sort()), await pg.evaluate(() => Object.keys(REAL_PAGES)));
    const keys = await pg.evaluate(() => [...new Set([...PAGES.filter(p => p[0] !== 'h').map(p => p[0]), 'life', 'after', 'grow', 'sb', 'stopic', 'ssched', 'sguide', 'no_such_page'])]);
    const mock = await pg.evaluate(() => [...USERS.slice(0, 40).map(u => u.name), ...VENUES.slice(0, 30).map(v => v[1])].filter(x => x && x.length > 3));
    let bad = [], placeholder = 0;
    for (const k of keys) {
      await pg.evaluate(k => { S.page = k; render() }, k);
      const r = await pg.evaluate(() => ({ t: document.getElementById('page').innerText, all: document.getElementById('app').textContent, badge: document.querySelectorAll('#nav button i').length, feed: !!document.getElementById('feed') }));
      if (REAL.includes(k)) { if (/还没接真数据/.test(r.t)) bad.push(k + ':已接真数据，不该是占位') }
      else if (/还没接真数据/.test(r.t)) placeholder++; else bad.push(k + ':不是占位');
      const leak = mock.filter(m => r.all.includes(m)); if (leak.length) bad.push(k + ':出现模拟数据 ' + leak.slice(0, 3));
      if (r.badge || r.feed) bad.push(k + ':有模拟的角标 / 动态');
    }
    T(`7.1 ${keys.length} 个页面（含没登记的 no_such_page）：除已接真数据的 ${REAL.length} 页都是占位，页面和侧栏里没有任何模拟球友 / 球场名、角标、动态`, !bad.length && placeholder === keys.length - REAL.length, bad);
    T('7.2 筛选条（日期范围、设备、导出 CSV）真模式下不显示', !(await vis(pg, '.filters')));
    // 从界面点：点导航里的占位页
    await pg.click('#nav [data-pg="review"]'); T('7.3 点导航「待审核」：是举报队列（没有数据时说「还没有举报」），并如实写明场边举报在下面、球场审核在「球场」页', await until(async () => /还没有举报/.test(await pg.evaluate(() => document.getElementById('page').innerText))) && /场边举报在下面一张卡片；球场审核在「球场」页/.test(await pg.evaluate(() => document.getElementById('page').innerText)));
    T('7.4 占位页的导航项带「待接入」标记，已接真数据的没有', await pg.evaluate(REAL => [...document.querySelectorAll('#nav [data-pg]')].every(b => REAL.includes(b.dataset.pg) ? !b.querySelector('.soon') : !!b.querySelector('.soon')), REAL));
    T('7.5 没有页面报错', !pe.length, pe); await ctx.close();
  }


  // ================= 7b. 举报队列（#27 第 2 步）：真数据 · 查看对话要理由 · 处理后刷新还在 =================
  {
    let un = 100; const mkU = async n => (await one(`insert into users(phone_e164,nickname,utr,gender,pact_accepted_at) values ($1,$2,5,'m',now()) returning id`, ['+6143' + String(++un).padStart(7, '0'), n])).id;
    const UA = await mkU('举报人阿明'), UB = await mkU('被举报阿强');
    const th = (await one(`insert into threads(kind,user_a,user_b) values ('dm',$1,$2) returning id`, [UA < UB ? UA : UB, UA < UB ? UB : UA])).id;
    await su.query(`insert into messages(thread_id,sender_id,body,created_at) values ($1,$2,'你这人怎么回事',now() - interval '3 hours'),($1,$3,'关你什么事',now() - interval '2 hours')`, [th, UA, UB]);
    const RID = (await one(`insert into reports(reporter_id,target_type,target_id,reason,note,source,via,context_ref) values ($1,'user',$2,'harass','一直发骚扰消息','in_app','chat',$3) returning id`, [UA, UB, th])).id;
    const { ctx, pg, pe } = await open(); await loginAs(pg, 'a4@x.com');
    const page = () => pg.evaluate(() => document.getElementById('page').innerText);
    await pg.click('#nav [data-pg="review"]');
    T('7b.1 举报列表读到真数据：举报人、对象、原因、说明、来源都在，状态「待处理」', await until(async () => /举报人阿明/.test(await page())) && /被举报阿强/.test(await page()) && /骚扰/.test(await page()) && /一直发骚扰消息/.test(await page()) && /站内 · 聊天/.test(await page()) && /待处理/.test(await page()), await page());
    T('7b.2 页面里没有手机号', !/\+?614\d{6}/.test(await pg.evaluate(() => document.getElementById('app').textContent)));
    await pg.click(`[data-rp="msgs"][data-id="${RID}"]`);
    await until(() => vis(pg, '#admRin'));
    await pg.fill('#admRin', '短'); await pg.click('[data-admrok]');
    T('7b.3 看对话理由太短：不发请求，提示要写理由', /理由/.test(await pg.evaluate(() => document.getElementById('admRe').textContent)) && +(await one(`select count(*) n from admin_audit_log where action='message.read'`)).n === 0);
    await pg.fill('#admRin', '核对骚扰举报'); await pg.click('[data-admrok]');
    T('7b.4 填了理由：显示被举报的那段对话，并在操作日志留痕', await until(async () => /关你什么事/.test(await pg.evaluate(() => document.getElementById('admR').innerText))) && /你这人怎么回事/.test(await pg.evaluate(() => document.getElementById('admR').innerText)) && +(await one(`select count(*) n from admin_audit_log where action='message.read'`)).n === 1);
    await pg.click('[data-admrx]'); await sleep(200);
    await pg.click(`[data-rp="ok"][data-id="${RID}"]`);
    T('7b.5 点「处理」：服务器状态变 actioned，页面显示「已处理」和处理人', await until(async () => (await one(`select status from reports where id=$1`, [RID])).status === 'actioned') && await until(async () => /已处理/.test(await page()) && /Amy|a4/.test(await page())), await page());
    await pg.reload(); await until(() => vis(pg, '#app')); await pg.click('#nav [data-pg="review"]');
    T('7b.6 刷新后还在：仍是「已处理」，操作按钮没了（以服务器为准，不是本地改的）', await until(async () => /已处理/.test(await page())) && !(await vis(pg, `[data-rp="ok"][data-id="${RID}"]`)), await page());
    T('7b.7 处理留痕：操作日志有 report.handle', +(await one(`select count(*) n from admin_audit_log where action='report.handle' and target=$1`, [RID])).n === 1);
    T('7b.8 没有页面报错', !pe.length, pe); await ctx.close();
  }

  // ================= 7c. 球场审核（#27 第 3 步）：待核对坐标 · 用户添加的球场 · 刷新后还在 =================
  {
    await su.query(`insert into suburbs(name,postcode,centroid) values ('Brighton','3186','POINT(145 -37.9)') on conflict do nothing`);
    const mkV = async (n, st, geo, lng = 145) => (await one(`insert into venues(name,short_name,suburb,postcode,location,surfaces,status,geo_source) values ($1,$1,'Brighton','3186',$2::geography,'{hard}',$3,$4) returning id`, [n, `POINT(${lng} -37.9)`, st, geo])).id;
    const V1 = await mkV('待核球场甲', 'active', 'suburb_centroid'), V2 = await mkV('待核球场乙', 'active', 'suburb_centroid', 145.05), V0 = await mkV('已核球场', 'active', 'admin', 145.1);
    const VP = await mkV('用户新球场', 'pending', 'google', 145.0003);
    const { ctx, pg, pe } = await open(); await loginAs(pg, 'a7@x.com');
    const page = () => pg.evaluate(() => document.getElementById('page').innerText);
    await pg.click('#nav [data-pg="venues"]');
    T('7c.1 球场页读到真数据：待核对的球场、待审核的球场都在，已核对的不在', await until(async () => /待核球场甲/.test(await page())) && /待核球场乙/.test(await page()) && /用户新球场/.test(await page()) && !/已核球场/.test(await page()) && /已核对 1 \/ 3/.test(await page()), await page());
    T('7c.2 待审核球场旁边列出 300 米内已收录的球场（可合并）', /附近已有：.*待核球场甲/.test(await page()), await page());
    T('7c.3 页面没有演示数据（演示球场名、演示数字都不出现）', !/Glen Iris|Brighton TC|Hawksburn/.test(await page()));
    await pg.click(`[data-vg="ok"][data-id="${V1}"]`);
    T('7c.4 点「位置没错」：服务器标成已核对，页面上这一行没了', await until(async () => (await one(`select geo_source from venues where id=$1`, [V1])).geo_source === 'admin') && await until(async () => !(await vis(pg, `[data-vg="ok"][data-id="${V1}"]`)) && /已核对 2 \/ 3/.test(await page())), await page());
    await pg.click(`[data-vg="move"][data-id="${V2}"]`); await until(() => vis(pg, '[data-vgin]'));
    await pg.fill('[data-vgin]', '随便写'); await pg.click('[data-vgok]');
    T('7c.5 坐标格式不对：提示格式，不发请求', /纬度, 经度/.test(await pg.evaluate(() => document.querySelector('[data-vgerr]').textContent)) && (await one(`select geo_source from venues where id=$1`, [V2])).geo_source === 'suburb_centroid');
    await pg.fill('[data-vgin]', '-37.8136, 144.9631'); await pg.click('[data-vgok]');
    T('7c.6 填谷歌地图坐标：服务器位置改了、页面这一行没了', await until(async () => { const v = await one(`select st_y(location::geometry) la, st_x(location::geometry) lo, geo_source from venues where id=$1`, [V2]); return Math.abs(v.la + 37.8136) < 1e-6 && Math.abs(v.lo - 144.9631) < 1e-6 && v.geo_source === 'admin' }) && await until(async () => !(await vis(pg, `[data-vg="move"][data-id="${V2}"]`))), await page());
    await pg.click(`[data-vg="approve"][data-id="${VP}"]`);
    T('7c.7 点「通过」：服务器球场变公开，页面显示没有待审核', await until(async () => (await one(`select status from venues where id=$1`, [VP])).status === 'active') && await until(async () => /没有待审核的球场/.test(await page()) ), await page());
    await pg.reload(); await until(() => vis(pg, '#app')); await pg.click('#nav [data-pg="venues"]');
    T('7c.8 刷新后还在：待审核仍为空、待核对已全部核对（以服务器为准，不是本地改的）', await until(async () => /没有待审核的球场/.test(await page()) && /所有球场的位置都核对过了/.test(await page()) && /已核对 4 \/ 4/.test(await page())) && !/待核球场甲|待核球场乙/.test(await page()), await page());
    T('7c.9 操作留痕：geo_confirm、geo_move、approve 各一条', (await one(`select count(distinct detail->>'action')::int n from admin_audit_log where action='venue.review' and detail->>'action' in ('geo_confirm','geo_move','approve')`)).n === 3);
    T('7c.10 没有页面报错', !pe.length, pe); await ctx.close();
  }

  // ================= 7d. 球友列表（#27 第 3 步，只读）：真数据 · 搜索 · 状态筛选 · 不露完整手机号 =================
  {
    const mkU = async (n, st = 'active', city = 'melb') => (await one(`insert into users(phone_e164,nickname,utr,gender,pact_accepted_at,home_city,status,status_since,status_until) values ($1,$2,5,'m',now(),$3,$4, case when $4 <> 'active' then now() end, case when $4 = 'suspended' then now() + interval '3 days' end) returning id`, ['+61499' + String(Math.floor(Math.random() * 1e6)).padStart(6, '0'), n, city, st])).id;
    const LA = await mkU('列表甲'); await mkU('列表乙', 'banned'); const LC = await mkU('列表丙', 'suspended');
    // 我的 UTR（#101）：丙是自评 ≈1.5 且关联了主页；甲近 7 天改了 3 次（进「需要留意」）
    await su.query(`update users set utr = 1.5, utr_estimated = true, utr_profile = '1234567', utr_at = now() where id = $1`, [LC]);
    for (const v of [5.1, 5.2, 5.3]) await su.query(`insert into utr_changes(user_id, old_utr, new_utr, old_est, new_est) values ($1, 5, $2, false, false)`, [LA, v]);
    const { ctx, pg, pe } = await open(); await loginAs(pg, 'a7@x.com');
    const page = () => pg.evaluate(() => document.getElementById('page').innerText);
    // 球友列表那张卡片（11-07 起页面顶上多了 UTR 卡片，「需要留意」里也会出现昵称，筛选 / 搜索只看列表）
    const list = () => pg.evaluate(() => { const c = [...document.querySelectorAll('#page .card')].find(x => (x.querySelector('.ch b') || {}).textContent === '球友'); return c ? c.innerText : '' });
    await pg.click('#nav [data-pg="users"]');
    T('7d.1 球友页读到真数据：三个人都在，手机号只显示「•••」加后四位', await until(async () => /列表甲/.test(await page())) && /列表乙/.test(await page()) && /列表丙/.test(await page()) && /••• \d{4}/.test(await page()) && !/\+61499/.test(await page()), await page());
    T('7d.2 页面没有演示数据（演示球友名不出现）', !/Jason W|Mia L|Daniel/.test(await page()), (await page()).slice(0, 200));
    T('7d.2b UTR 卡片：概况 + 需要留意（甲近 7 天改了 3 次）', await until(async () => /近 7 天改了 3 次/.test(await page())) && /正式 \d+（\d+%）· 自评 \d+/.test(await page()), await page());
    T('7d.2c 列表 UTR 列：自评显示 ≈1.5、关联主页带 ✓，不露主页编号', /UTR ≈1\.5 ✓/.test(await page()) && !/1234567/.test(await page()), await page());
    await pg.click('[data-up="st"][data-v="banned"]');
    T('7d.3 点「封禁」筛选：只剩封禁的那位', await until(async () => /列表乙/.test(await list()) && !/列表甲/.test(await list())), await list());
    await pg.click('[data-up="st"][data-v=""]'); await until(async () => /列表甲/.test(await list()));
    await pg.fill('[data-upq]', '列表丙');
    T('7d.4 搜昵称：只剩匹配的，输入框没有被重画丢焦点', await until(async () => /列表丙/.test(await list()) && !/列表甲/.test(await list())) && await pg.evaluate(() => document.activeElement && document.activeElement.hasAttribute('data-upq')), await page());
    T('7d.5 没有页面报错', !pe.length, pe); await ctx.close();
  }

  // ================= 7e. 球局列表（#27 第 3 步，只读）：真数据 · 状态筛选 · 搜索 · 私人球局不露备注 =================
  {
    await su.query(`insert into suburbs(name,postcode,centroid) values ('Brighton','3186','POINT(145 -37.9)') on conflict do nothing`);
    const hostId = (await one(`insert into users(phone_e164,nickname,utr,gender,pact_accepted_at,home_city) values ('+61488000777','球局发起人',5,'m',now(),'melb') returning id`)).id;
    const vid = (await one(`insert into venues(name,short_name,suburb,postcode,location,surfaces,status,geo_source,city) values ('球局测试场','球局测试场','Brighton','3186','POINT(145 -37.9)'::geography,'{hard}','active','admin','melb') returning id`)).id;
    const mkG = async (code, hrs, note, vis = 'public') => (await one(`insert into games(share_code,host_id,venue_id,starts_at,duration_min,game_type,capacity,utr_min,utr_max,note,visibility) values ($1,$2,$3,now()+($4||' hours')::interval,90,'doubles',4,3,6,$5,$6) returning id`, [code, hostId, vid, String(hrs), note, vis])).id;
    await mkG('E2E001', 6, '公开球局备注'); const gc = await mkG('E2E002', 8, '要取消的'); await mkG('E2E003', 10, '私人备注绝不能出现', 'private');
    await su.query(`update games set status='cancelled' where id=$1`, [gc]);
    const { ctx, pg, pe } = await open(); await loginAs(pg, 'a7@x.com');
    const page = () => pg.evaluate(() => document.getElementById('page').innerText);
    await pg.click('#nav [data-pg="games"]');
    T('7e.1 球局页读到真数据：公开球局的球场、备注、发起人都在；私人球局不露备注', await until(async () => /E2E001/.test(await page())) && /球局测试场/.test(await page()) && /公开球局备注/.test(await page()) && /球局发起人/.test(await page()) && /E2E003/.test(await page()) && !/私人备注绝不能出现/.test(await page()), await page());
    T('7e.2 页面没有演示数据', !/Glen Iris|Hawksburn|Brighton TC/.test(await page()), (await page()).slice(0, 200));
    await pg.click('[data-gp="st"][data-v="cancelled"]');
    T('7e.3 点「已取消」：只剩取消的那场', await until(async () => /E2E002/.test(await page()) && !/E2E001/.test(await page())), await page());
    await pg.click('[data-gp="st"][data-v=""]'); await until(async () => /E2E001/.test(await page()));
    await pg.fill('[data-gpq]', 'E2E001');
    T('7e.4 搜分享码：只剩匹配的，输入框没丢焦点', await until(async () => /E2E001/.test(await page()) && !/E2E002/.test(await page())) && await pg.evaluate(() => document.activeElement && document.activeElement.hasAttribute('data-gpq')), await page());
    await pg.click('[data-gp="when"][data-v="past"]');
    T('7e.5 切到「已过」：这几场都不在', await until(async () => !/E2E001/.test(await page())), await page());
    T('7e.6 没有页面报错', !pe.length, pe); await ctx.close();
  }

  // ================= 8. 会话过期 → 回登录页 =================
  {
    const { ctx, pg } = await open(); await loginAs(pg, 'a3@x.com');
    await su.query(`update admin_sessions set last_seen_at = now() - interval '2 hours' where admin_id = (select id from admin_users where email='a3@x.com')`);
    await pg.evaluate(() => { RL.touchAt = 0 }); await pg.click('#nav [data-pg="review"]');
    T('8.1 闲置超过 1 小时后点导航：回到登录页并说明过期', await until(() => vis(pg, '#lgEmail')) && /登录已过期/.test(await err(pg)) && await pg.evaluate(() => document.getElementById('page').innerHTML === ''), await err(pg)); await ctx.close();
  }
  {
    const { ctx, pg } = await open(); await loginAs(pg, 'a4@x.com');
    await su.query(`update admin_users set role='viewer' where email='a4@x.com'`);
    await pg.evaluate(() => { RL.touchAt = 0 }); await pg.click('#nav [data-pg="review"]'); await until(() => pg.evaluate(() => S.role === 'viewer'));
    T('8.2 管理员被降权后下一次切换页面就刷新身份（不用等重新登录）', await pg.evaluate(() => S.role === 'viewer' && document.querySelector('.side .me small').textContent === '只读')); await ctx.close();
  }

  // ================= 9. 锁定 / 服务不可用 / 网络不通 / 没开通的网址 =================
  {
    const { ctx, pg } = await open(); await until(() => vis(pg, '#lgEmail')); ip = '203.0.113.9';
    for (let i = 0; i < 5; i++) { await fill(pg, 'lock@x.com', 'bad password 123', code()); await pg.click('.go'); await until(async () => !!(await err(pg))); await pg.evaluate(() => { document.getElementById('lgErr').hidden = true }) }
    await fill(pg, 'lock@x.com', PW, code()); await pg.click('.go'); await until(async () => /次数太多/.test(await err(pg)));
    T('9.1 连错 5 次后，即使这次对了也被锁：提示「输错次数太多，请 N 分钟后再试」', /输错次数太多，请 \d+ 分钟后再试/.test(await err(pg)) && !(await vis(pg, '#app')), await err(pg));
    ip = '203.0.113.1';
    dbDown = true; await fill(pg, 'a5@x.com', PW, code()); await pg.click('.go'); await until(async () => !!(await err(pg)) && !/次数太多/.test(await err(pg)));
    T('9.2 数据库连不上：说「服务暂时不可用」，不说成密码错', /服务暂时不可用/.test(await err(pg)) && !/密码或验证码不对/.test(await err(pg)), await err(pg));
    dbDown = false;
    await pg.route('**/admin/api/login', r => r.abort()); await fill(pg, 'a5@x.com', PW, code()); await pg.click('.go'); await until(async () => /网络/.test(await err(pg)));
    T('9.3 网络不通：说「网络不通」', /网络不通/.test(await err(pg)), await err(pg)); await pg.unroute('**/admin/api/login');
    T('9.4 出错后按钮恢复可点（不会卡在「登录中」）', await pg.evaluate(() => { const b = document.querySelector('#login .go'); return !b.disabled && b.textContent === '登录' }));
    await fill(pg, 'a5@x.com', PW, code()); await pg.click('.go'); T('9.5 恢复后可以正常登录', await until(() => vis(pg, '#app'))); await ctx.close();
  }
  {
    const { ctx, pg } = await open(); await loginAs(pg, 'a6@x.com'); dbDown = true; await pg.reload(); await until(() => vis(pg, '#lgEmail'));
    T('9.6 已登录的人刷新时数据库连不上：登录页上说服务不可用（不是空白、不是转圈、不是「登录已过期」）', /服务暂时不可用/.test(await err(pg)) && !/过期/.test(await err(pg)), await err(pg)); dbDown = false;
    await pg.reload(); T('9.6b 数据库恢复后刷新：直接回到登录态（会话没被误删）', await until(() => vis(pg, '#app'))); await ctx.close();
    hosts = ['other.test']; const o = await open(); await until(() => vis(o.pg, '#lgEmail'));
    T('9.7 这个网址没登记后台：说「没有开通后台」', /没有开通后台/.test(await err(o.pg)), await err(o.pg)); hosts = ['127.0.0.1']; await o.ctx.close();
  }

  // ================= 10. 模式判定：只有 file: 和预览站根域名是演示 =================
  {
    const f = await open('file://' + path.join(DIR, '南伴球_后台.html'));
    T('10.1 本机文件（file:）= 演示：显示演示登录，不发任何 /admin/api 请求', await f.pg.evaluate(() => document.documentElement.dataset.mode === 'demo' && NBQ_MODE === 'demo') && await vis(f.pg, '#demoRole') && !(await vis(f.pg, '#lgEmail')));
    await f.pg.click('.go'); await sleep(200); T('10.2 演示登录照旧：进入带模拟数据的后台', await vis(f.pg, '#app') && await f.pg.evaluate(() => /Han/.test(document.querySelector('.side .me b').textContent) && document.querySelectorAll('#nav [data-pg]').length > 10 && !document.querySelector('#nav .soon'))); await f.ctx.close();
    for (const [host, want] of [['nanbanqiu-preview.pages.dev', 'demo'], ['nanbanqiu.app', 'real'], ['evil-nanbanqiu-preview.pages.dev', 'real'], ['nanbanqiu-preview.pages.dev.evil.test', 'real'], ['staging.nanbanqiu-preview.pages.dev', 'real']]) {
      const ctx = await br.newContext(), p = await ctx.newPage(); const reqs = [];
      await p.route('**/*', r => { const u = new URL(r.request().url()); if (u.pathname.startsWith('/admin/api')) { reqs.push(u.pathname); return r.fulfill({ status: 404, contentType: 'application/json', body: '{"error":"not_found"}' }) } return r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: HTML }) });
      await p.goto(`http://${host}/admin`); await sleep(300);
      T(`10.3 域名 ${host} → ${want}模式${want === 'demo' ? '（不发 /admin/api 请求）' : ''}`, await p.evaluate(() => document.documentElement.dataset.mode) === want && (want === 'real' || reqs.length === 0), reqs);
      await ctx.close();
    }
  }
} finally { try { await br?.close() } catch (_) { } try { srv?.close() } catch (_) { } try { await su?.end() } catch (_) { } c.stop() }
console.log(`admin_login: ${pass} 通过, ${fail} 失败`); process.exit(fail ? 1 : 0);
