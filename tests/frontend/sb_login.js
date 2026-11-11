// 5g 前台接入 Supabase 登录（两端）：用假的 Supabase 接口（浏览器里拦截）跑完整流程。
//   ① 没配置 = 演示登录照旧，不发任何 supabase 请求  ② 配置后：发码 → 验码 → 新号码填资料 → 刷新页面自动登录 → 退出后刷新不再登录
//   ③ 老用户（有资料）验码后直接进，不再填资料  ④ 发码失败 / 验证码错：有提示、不进下一步、能重试
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const DIR = process.env.NBQ_DIR || path.join(__dirname, '..', '..');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 500) : '')) };
const SB = 'https://abc.supabase.co';
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  for (const f of ['南伴球_PWA.html', '南伴球_Web.html']) {
    const W = f.includes('Web'), ctx = await b.newContext({ viewport: W ? { width: 1360, height: 860 } : { width: 390, height: 844 } });
    const pg = await ctx.newPage(), errs = [], reqs = []; pg.on('pageerror', e => errs.push(e.message));
    const R = { otp: { s: 200, d: {} }, verify: null, refresh: null };   // 当前假接口的回复，每步前改
    const OKV = uid => ({ s: 200, d: { access_token: 'AT-' + uid, refresh_token: 'RT-' + uid, expires_in: 3600, user: { id: uid, phone: '61412345678' } } });
    await pg.route('https://nanbanqiu.test/**', r => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: fs.readFileSync(path.join(DIR, f)) }));
    await pg.route('https://cdnjs.cloudflare.com/**', r => r.abort()); await pg.route('https://basemaps.cartocdn.com/**', r => r.abort());
    await pg.route(SB + '/**', r => { const u = r.request().url(); reqs.push({ u, body: r.request().postData() }); const k = u.includes('/otp') ? 'otp' : u.includes('/verify') ? 'verify' : u.includes('/token') ? 'refresh' : 'logout';
      const x = R[k] || { s: 204, d: null }; r.fulfill({ status: x.s, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: x.d == null ? '' : JSON.stringify(x.d) }) });
    const open = async () => { await pg.goto('https://nanbanqiu.test/'); await pg.settle(500) };
    const cfg = () => pg.evaluate(u => { SB_CFG.url = u; SB_CFG.key = 'sb_publishable_test' }, SB);
    const startLogin = async () => { await pg.evaluate(() => { openAuth(null) }); await pg.settle(400); await pg.fill('#ph', '0412 345 678'); await pg.click('[data-a="sendCode"]'); await pg.settle(400) };
    const typeCode = async c => { await pg.fill('#otp', c); await pg.settle(500) };
    const meName = () => pg.evaluate(() => ME && ME.name);
    const tag = s => `${f} ${s}`;

    // ① 没配置：演示登录
    await open(); await startLogin();
    T(tag('没配置：直接进验证码页'), await pg.$('#otp') !== null);
    await typeCode('123456'); T(tag('没配置：任意 6 位码进填资料页，没有任何 supabase 请求'), await pg.$('#npName') !== null && reqs.length === 0, reqs);

    // ② 配置后：发码失败
    await open(); await cfg(); R.otp = { s: 429, d: { error_code: 'over_sms_send_rate_limit' } };
    await startLogin(); T(tag('发码太快：留在手机号页，有提示'), await pg.$('#otp') === null && await pg.$('#ph') !== null && /60 秒/.test(await pg.evaluate(() => document.body.innerText)));
    R.otp = { s: 200, d: {} }; await pg.click('[data-a="sendCode"]'); await pg.settle(400);
    const sent = reqs.filter(r => r.u.endsWith('/auth/v1/otp')).pop();
    T(tag('发码成功：进验证码页，请求带 E.164 手机号'), await pg.$('#otp') !== null && JSON.parse(sent.body).phone === '+61412345678', sent);
    // 验证码错
    R.verify = { s: 403, d: { error_code: 'otp_expired' } }; await typeCode('111111');
    T(tag('验证码错：留在验证码页、清空输入框、没登录'), await pg.$('#otp') !== null && (await pg.inputValue('#otp')) === '' && await pg.$('#npName') === null && await meName() === null);
    // 验证码对：新号码 → 填资料
    R.verify = OKV('u-new'); await typeCode('222222');
    T(tag('验证码对（新号码）：进填资料页'), await pg.$('#npName') !== null);
    await pg.fill('#npName', 'Sam'); await pg.check('#npAdult'); await pg.click('[data-a="npDone"]'); await pg.settle(500);
    T(tag('填完资料：已登录'), await meName() === 'Sam');
    const stored = await pg.evaluate(() => JSON.parse(localStorage.getItem('nbq_sb') || 'null'));
    T(tag('登录态存在本机'), stored && stored.uid === 'u-new' && stored.refresh_token === 'RT-u-new', stored);

    // 刷新页面：自动登录（配置在页面里是常量，刷新后要重新填，这里模拟"部署后已写进 SB_CFG"）
    await pg.addInitScript(() => { }); await pg.reload(); await pg.settle(300); await cfg(); await pg.evaluate(() => sbaRestore()); await pg.settle(600);
    T(tag('刷新后自动登录，昵称还在'), await meName() === 'Sam');
    // 退出：本机清掉 + 通知 Supabase；再刷新不再登录
    reqs.length = 0; await pg.evaluate(() => { document.querySelector('[data-a="logout"]') ? document.querySelector('[data-a="logout"]').click() : (sbaLogout(), ME = null, render()) }); await pg.settle(500);
    T(tag('退出后 ME 为空，通知了 supabase /logout，本机登录态清空'), await meName() === null && reqs.some(r => r.u.endsWith('/auth/v1/logout')) && await pg.evaluate(() => localStorage.getItem('nbq_sb')) === null, reqs);
    await pg.reload(); await pg.settle(300); await cfg(); await pg.evaluate(() => sbaRestore()); await pg.settle(500);
    T(tag('退出后刷新：不会自动登录'), await meName() === null);

    // ③ 老用户：同一个 uid 再登录，直接进
    await open(); await cfg(); R.otp = { s: 200, d: {} }; await startLogin(); R.verify = OKV('u-new'); await typeCode('333333');
    T(tag('老用户验码后直接进，不再填资料'), await pg.$('#npName') === null && await meName() === 'Sam');
    // ④ 登录态被服务器撤销：刷新时续期被拒，清掉
    await pg.evaluate(() => { const s = JSON.parse(localStorage.getItem('nbq_sb')); s.expires_at = 1; localStorage.setItem('nbq_sb', JSON.stringify(s)) });
    R.refresh = { s: 400, d: { error_code: 'refresh_token_not_found' } };
    await pg.reload(); await pg.settle(300); await cfg(); await pg.evaluate(() => sbaRestore()); await pg.settle(600);
    T(tag('登录态过期且续期被拒：不自动登录，本机清掉'), await meName() === null && await pg.evaluate(() => localStorage.getItem('nbq_sb')) === null);
    T(tag('没有页面报错'), errs.length === 0, errs);
    await ctx.close();
  }
  await b.close(); console.log(`sb_login: ${pass} 通过, ${fail} 失败`); process.exit(fail ? 1 : 0);
})();
