// 地区扩展 R3：网址决定城市（两端）。/、/melbourne/、短链接 /g/码 → 墨尔本，和原来完全一样；
// 换成 /perth/ 打开时（只为验证配置真的生效，现实中珀斯还没开放）：标题、默认位置、分享文案和话题、埋点的城市、夜间顺延的时区都跟着变。
// R3-2：未开放的城市盖「即将开放」+ 开放时通知我；手机号按国家；手机时区和城市不同时球局另标「当地」时间。
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const DIR = process.env.NBQ_DIR || path.join(__dirname, '..', '..');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 500) : '')) };
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  for (const f of ['南伴球_PWA.html', '南伴球_Web.html']) {
    const W = f.includes('Web'), ctx = await b.newContext({ viewport: W ? { width: 1360, height: 860 } : { width: 390, height: 844 } });
    await ctx.addInitScript(() => { window.AN_LOG = [] });
    const pg = await ctx.newPage(), errs = []; pg.on('pageerror', e => errs.push(e.message));
    await pg.route('https://nanbanqiu.test/**', r => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: fs.readFileSync(path.join(DIR, f)) }));
    await pg.route('https://cdnjs.cloudflare.com/**', r => r.abort()); await pg.route('https://tile.openstreetmap.org/**', r => r.abort());
    const open = async p => { await pg.goto('https://nanbanqiu.test' + p); await pg.settle(500) };
    const info = () => pg.evaluate(() => ({ key: CITY.key, title: document.title, loc: LOC && LOC.label, lat: LOC && LOC.lat,
      xhs: (() => { try { return xhsText(api.get(GAMES.find(g => g.share_code).id)) } catch (e) { return 'ERR ' + e.message } })(),
      ...(() => { track('share_click', { to: 'probe' }); const all = AN.pre.concat(AN_LOG); return { ev: (all.find(e => e.ev === 'session_start') || {}).city, ev2: all.length > 1 && all.every(e => e.city === CITY.key) } })(),
      slogan: [...document.querySelectorAll('[data-city-slogan]')].map(x => x.textContent).join() }));
    for (const p of ['/', '/melbourne/', '/melbourne/g/7Kq2', '/g/7Kq2', '/p/1', '/MELBOURNE', '/nowhere/']) {
      await open(p); const x = await info();
      T(`${f} ${p} → 墨尔本`, x.key === 'melb' && x.title === '南伴球 · 墨尔本网球约局' && x.ev2, x);
    }
    await open('/melbourne/'); let x = await info();
    T(`${f} 墨尔本：默认位置 Melbourne CBD，分享文案带 #墨尔本网球`, x.loc === 'Melbourne CBD' && x.lat === -37.8136 && /🎾 墨尔本约球/.test(x.xhs) && /#墨尔本网球 #墨尔本约球/.test(x.xhs), x);
    if (W) T(`${f} 墨尔本：左上角「墨尔本网球约局」`, /^墨尔本网球约局/.test(x.slogan), x.slogan);
    await open('/perth/'); x = await info();
    T(`${f} /perth/ → 珀斯：标题、默认位置`, x.key === 'per' && x.title === '南伴球 · 珀斯网球约局' && x.loc === 'Perth' && x.lat === -31.9505, x);
    T(`${f} /perth/：分享文案和话题跟着城市`, /🎾 珀斯约球/.test(x.xhs) && /#珀斯网球 #珀斯约球/.test(x.xhs) && !/墨尔本/.test(x.xhs), x.xhs);
    T(`${f} /perth/：埋点带城市 per`, x.ev2, x);
    if (W) T(`${f} /perth/：左上角「珀斯网球约局」`, /^珀斯网球约局/.test(x.slogan), x.slogan);
    const q = await pg.evaluate(() => {
      const t1 = Date.parse('2027-01-15T12:30:00Z'), t2 = Date.parse('2027-01-15T15:30:00Z');   // 墨尔本 23:30 = 珀斯 20:30；珀斯 23:30
      return { a: nrQuiet(t1) === t1, b: new Date(nrQuiet(t2)).toISOString(), c: emDay(Date.parse('2027-01-15T15:30:00Z')) }
    });
    T(`${f} /perth/：夜间顺延按珀斯时间（20:30 不顺延，23:30 → 珀斯 08:00）`, q.a && q.b === '2027-01-16T00:00:00.000Z', q);
    T(`${f} /perth/：每天的邮件按珀斯日期`, q.c === '15/01/2027', q);
    await open('/melbourne/');
    const m = await pg.evaluate(() => { const t = Date.parse('2027-01-15T12:30:00Z'); return { a: new Date(nrQuiet(t)).toISOString(), c: emDay(Date.parse('2027-01-15T15:30:00Z')) } });
    T(`${f} 墨尔本：夜间顺延和日期与原来相同`, m.a === '2027-01-15T21:00:00.000Z' && m.c === '16/01/2027', m);
    // ---------- R3-2：即将开放 ----------
    T(`${f} 墨尔本没有「即将开放」`, !(await pg.$('#citySoon')));
    const posts = []; await pg.route('https://nanbanqiu.test/api/city-waitlist', r => { posts.push(r.request().postDataJSON()); r.fulfill({ status: 200, body: '{}' }) });
    await open('/sydney/'); await pg.settle(200);
    const soon = await pg.evaluate(() => { const d = document.getElementById('citySoon'); if (!d) return null; const r = d.getBoundingClientRect();
      return { h1: d.querySelector('h1').textContent, go: [...d.querySelectorAll('.cs-go')].map(a => a.getAttribute('href') + ' ' + a.textContent), cover: r.width > 300 && r.height > 500, title: document.title } });
    T(`${f} /sydney/：「悉尼即将开放」盖满页面，下面给墨尔本入口`, soon && soon.h1 === '悉尼即将开放' && soon.cover && soon.go.join() === '/melbourne/ 先去看看墨尔本 ›' && soon.title === '南伴球 · 悉尼网球约局', soon);
    await pg.fill('#csE', 'abc'); await pg.click('#csF button');
    T(`${f} /sydney/：邮箱不对 → 标红、不提交`, (await pg.$eval('#csE', e => e.style.borderColor)) !== '' && !posts.length && (await pg.$eval('#csOk', e => e.hidden)));
    await pg.fill('#csE', ' Amy@Example.com '); await pg.click('#csF button'); await pg.settle(300);
    T(`${f} /sydney/：提交 → POST /api/city-waitlist {city:syd, email}，显示已登记`, posts.length === 1 && posts[0].city === 'syd' && posts[0].email === 'Amy@Example.com' && !(await pg.$eval('#csOk', e => e.hidden)), posts);
    // ---------- R3-2：手机号按国家 ----------
    await open('/melbourne/');
    const ph = async v => { await pg.evaluate(() => openAuth(null)); await pg.settle(200); await pg.fill('#ph', v); const cc = await pg.evaluate(() => [...document.querySelectorAll('#cc option')].map(o => o.textContent).join()); await pg.click('[data-a="sendCode"]'); await pg.settle(200);
      return { cc, ...(await pg.evaluate(() => ({ e: AUTH.e164 || null, otp: !!document.getElementById('otp') }))) } };
    let r = await ph('0412 345 678'); T(`${f} 0412 345 678 → +61412345678，进入验证码`, r.e === '+61412345678' && r.otp && r.cc === '+61', r);
    await pg.evaluate(() => { AUTH.e164 = null }); r = await ph('+61 498 765 432'); T(`${f} +61 498 765 432 也认`, r.e === '+61498765432' && r.otp, r);
    await pg.evaluate(() => { AUTH.e164 = null }); r = await ph('02 9876 5432'); T(`${f} 座机号 → 不发验证码`, r.e === null && !r.otp, r);
    await pg.evaluate(() => { AUTH.e164 = null }); r = await ph('0412 345 67'); T(`${f} 少一位 → 不发验证码`, r.e === null && !r.otp, r);
    T(`${f} 没有报错`, !errs.length, errs.slice(0, 3));
    await ctx.close();
    // ---------- R3-2：当地时间 ----------
    for (const [tz, want] of [['Australia/Melbourne', false], ['Australia/Perth', true], ['Asia/Shanghai', true]]) {
      const c2 = await b.newContext({ timezoneId: tz, viewport: W ? { width: 1360, height: 860 } : { width: 390, height: 844 } }), p2 = await c2.newPage(), e2 = []; p2.on('pageerror', e => e2.push(e.message));
      await p2.route('https://nanbanqiu.test/**', r => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: fs.readFileSync(path.join(DIR, f)) }));
      await p2.route('https://cdnjs.cloudflare.com/**', r => r.abort()); await p2.route('https://tile.openstreetmap.org/**', r => r.abort());
      await p2.goto('https://nanbanqiu.test/melbourne/'); await p2.settle(600);
      const y = await p2.evaluate(() => { const g = GAMES.find(x => x.share_code), c = api.get(g.id), mel = new Intl.DateTimeFormat('en-AU', { timeZone: 'Australia/Melbourne', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(c.start);
        return { lt: lt(c.start), mel, list: [...document.querySelectorAll('.lt')].length } });
      T(`${f} 手机时区 ${tz}：${want ? '标「当地 墨尔本时间」' : '不标'}`, want ? y.lt === `<span class="lt">当地 ${y.mel}</span>` && y.list > 0 : y.lt === '' && y.list === 0, y);
      T(`${f} 手机时区 ${tz}：没有报错`, !e2.length, e2.slice(0, 3));
      await c2.close();
    }
  }
  await b.close(); console.log(`cities: ${pass} 通过, ${fail} 失败`); process.exit(fail ? 1 : 0);
})();
