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
    const keys = await pg.evaluate(() => [...new Set([...PAGES.filter(p => p[0] !== 'h').map(p => p[0]), 'life', 'after', 'grow', 'sb', 'stopic', 'ssched', 'sguide', 'no_such_page'])]);
    const mock = await pg.evaluate(() => [...USERS.slice(0, 40).map(u => u.name), ...VENUES.slice(0, 30).map(v => v[1])].filter(x => x && x.length > 3));
    let bad = [], placeholder = 0;
    for (const k of keys) {
      await pg.evaluate(k => { S.page = k; render() }, k);
      const r = await pg.evaluate(() => ({ t: document.getElementById('page').innerText, all: document.getElementById('app').textContent, badge: document.querySelectorAll('#nav button i').length, feed: !!document.getElementById('feed') }));
      if (k === 'account') { if (/还没接真数据/.test(r.t)) bad.push(k + ':account 不该是占位') }
      else if (/还没接真数据/.test(r.t)) placeholder++; else bad.push(k + ':不是占位');
      const leak = mock.filter(m => r.all.includes(m)); if (leak.length) bad.push(k + ':出现模拟数据 ' + leak.slice(0, 3));
      if (r.badge || r.feed) bad.push(k + ':有模拟的角标 / 动态');
    }
    T(`7.1 ${keys.length} 个页面（含没登记的 no_such_page）：除「我的账号」都是占位，页面和侧栏里没有任何模拟球友 / 球场名、角标、动态`, !bad.length && placeholder === keys.length - 1, bad);
    T('7.2 筛选条（日期范围、设备、导出 CSV）真模式下不显示', !(await vis(pg, '.filters')));
    // 从界面点：点导航里的占位页
    await pg.click('#nav [data-pg="review"]'); T('7.3 点导航「待审核」：占位页，并说明接入计划', /还没接真数据/.test(await pg.evaluate(() => document.getElementById('page').innerText)) && /举报队列/.test(await pg.evaluate(() => document.getElementById('page').innerText)));
    T('7.4 占位页的导航项带「待接入」标记，「我的账号」没有', await pg.evaluate(() => [...document.querySelectorAll('#nav [data-pg]')].every(b => b.dataset.pg === 'account' ? !b.querySelector('.soon') : !!b.querySelector('.soon'))));
    T('7.5 没有页面报错', !pe.length, pe); await ctx.close();
  }


  // ================= 7c. 重新生成恢复码（#27）：再输密码 + 验证码 · 新码只显示一次 · 旧码作废 · 关掉就清空 =================
  {
    const R0 = AU.newRecoveryCodes(); await mk('rc@x.com', 'Rita', 'operator', R0.hashes);
    const { ctx, pg, pe } = await open(); await loginAs(pg, 'rc@x.com');
    await pg.click('#nav [data-pg="account"]');
    T('7c.1 「我的账号」页有恢复码卡片，说明旧码会全部作废', await until(() => vis(pg, '[data-rgn="open"]')) && /旧的 10 个会立刻全部作废/.test(await pg.evaluate(() => document.getElementById('page').innerText)));
    await pg.click('[data-rgn="open"]'); await until(() => vis(pg, '#rcPw'));
    await pg.fill('#rcPw', 'wrong password!!'); await pg.fill('#rcCode', code()); await pg.click('#rcGo');
    const e72 = await until(async () => /密码或验证码不对/.test(await pg.evaluate(() => document.getElementById('rcErr')?.textContent || '')), 120), h72 = (await one(`select recovery_hashes h from admin_users where email='rc@x.com'`)).h;
    T('7c.2 密码错：提示「密码或验证码不对」，旧码没动', e72 && JSON.stringify(h72) === JSON.stringify(R0.hashes), [e72, h72.length, await pg.evaluate(() => document.getElementById('rcErr')?.textContent)]);
    await pg.fill('#rcPw', PW); await pg.fill('#rcCode', '12'); await pg.click('#rcGo');
    T('7c.3 验证码不是 6 位：本地提示，不发请求', /6 位数字/.test(await pg.evaluate(() => document.getElementById('rcErr').textContent)));
    await pg.fill('#rcPw', PW); await pg.fill('#rcCode', code()); await pg.click('#rcGo');
    T('7c.4 密码和验证码都对：显示 10 个新码，并说明旧码已作废', await until(() => pg.evaluate(() => /新的恢复码/.test(document.getElementById('admR')?.innerText || '')), 120));
    const shown = await pg.evaluate(() => (document.getElementById('admR').innerText.match(/\b[0-9a-f]{4}-[0-9a-f]{4}\b/g) || []));
    const h1 = (await one(`select recovery_hashes h from admin_users where email='rc@x.com'`)).h;
    T('7c.5 页面上的 10 个码就是库里新的 10 个（只比哈希），旧码一个不剩', shown.length === 10 && new Set(shown).size === 10 && JSON.stringify([...h1].sort()) === JSON.stringify(shown.map(AU.recoveryHash).sort()) && h1.every(h => !R0.hashes.includes(h)), [shown, h1.length]);
    T('7c.6 留痕：recovery.regen 一条', +(await one(`select count(*) n from admin_audit_log where action='recovery.regen'`)).n === 1);
    await pg.click('[data-rgn="close"]');
    T('7c.7 关掉后新码不留在页面里', await pg.evaluate((c) => !document.body.innerText.includes(c) && !document.body.innerHTML.includes(c), shown[0]));
    const loginRec = rc => pg.evaluate(async rc => (await fetch('/admin/api/login', { method: 'POST', credentials: 'same-origin', headers: { 'X-NBQ-Admin': '1', 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'rc@x.com', password: 'correct horse battery', recovery: rc }) })).status, rc);
    T('7c.8 旧恢复码登录 → 401；新恢复码登录 → 200', await loginRec(R0.codes[0]) === 401 && await loginRec(shown[0]) === 200);
    T('7c.9 没有页面报错', !pe.length, pe); await ctx.close();
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
