// 11-14 真机反馈的四件事（手机端）：
//   ① 放到主屏幕的 App 从后台回来，球局列表要自己更新（以前只有「有新通知」才重读，别人新发的球局看不到）
//   ② 分享落地页要能回首页：左上角标志可点、下面有「看看更多球局」按钮（以前只有一行小字）
//   ③ 「添加到主屏幕」不反复提醒：看过步骤后 7 天内顺带的小卡片不再出现；点过「我已添加」后这个浏览器里都不再提醒（iPhone 的 Safari 不知道桌面已有图标，只能记用户说的）
//   ④ 主屏幕 App 里登录完，一步开通知，只问一次；不在主屏幕 App 里、或正看着别的东西时不问
//   查不到什么：真机上从后台回来是否触发 visibilitychange、系统通知弹窗（真机清单）。
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const DIR = process.env.NBQ_DIR || path.join(__dirname, '..', '..'), F = '南伴球_PWA.html';
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 500) : '')) };
const V1 = '11111111-1111-4111-8111-111111111111', HOST = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const game = (n, now) => ({ id: `cccccccc-cccc-4ccc-8ccc-00000000000${n}`, share_code: 'Ab3' + n, host_id: HOST, host_nickname: 'Host', host_utr: 5.5, venue_id: V1, venue_name: 'Test Tennis Club', short_name: 'Test TC', starts_at: new Date(now + (20 + n) * 3600e3).toISOString(), duration_min: 120, game_type: 'doubles', capacity: 4, utr_min: 4, utr_max: 6.5,
  note: '', status: 'open', tags: [], visibility: 'public', filled: 0, join_mode: 'approve', city: 'melb', approved_count: 1, pending_count: 0, spots_left: 3 });
(async () => {
  const b = await chromium.launch({ executablePath: process.env.NBQ_CHROMIUM || '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const html = r => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: fs.readFileSync(path.join(DIR, F)) });
  // ---- ①② 真实模式、未登录 ----
  { const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }), pg = await ctx.newPage(), errs = [], S = { n: 1, hits: 0 }; pg.on('pageerror', e => errs.push(e.message));
    await pg.route('https://nanbanqiu.app/**', async r => { const u = new URL(r.request().url()); if (!u.pathname.startsWith('/api/')) return html(r);
      const now = await pg.evaluate(() => Date.now()).catch(() => Date.now()), J = (s, d) => r.fulfill({ status: s, contentType: 'application/json', body: JSON.stringify(d) });
      if (u.pathname === '/api/venues') return J(200, { venues: [{ id: V1, name: 'Test Tennis Club', short_name: 'Test TC', suburb: 'Malvern', surfaces: ['hard'], courts: 4, lights: true, indoor: false, booking_url: null, lat: -37.86, lng: 145.03 }] });
      if (u.pathname === '/api/games') { S.hits++; return J(200, { games: Array.from({ length: S.n }, (_, i) => game(i + 1, now)), anon: true }) }
      return J(404, { error: 'not_found' }) });
    await pg.route(u => !/^https:\/\/nanbanqiu\.app\//.test(u.toString()), r => r.abort());
    await pg.goto('https://nanbanqiu.app/g/Ab31'); await pg.waitForFunction(() => typeof UI !== 'undefined' && !!UI.detail, null, { timeout: 15000 }).catch(() => { }); await pg.settle(600);
    T('② 落地页左上角的标志是可点的按钮', await pg.evaluate(() => !!document.querySelector('#dNav button.nb-brand[data-a="explore"]')));
    T('② 落地页有「看看更多球局」按钮', await pg.evaluate(() => [...document.querySelectorAll('#detail button[data-a="explore"]')].some(x => x.textContent.includes('看看更多球局'))));
    await pg.click('#dNav button.nb-brand'); await pg.settle(600);
    T('② 点标志：回到首页，详情关掉', await pg.evaluate(() => !UI.detail && !document.querySelector('#detail').classList.contains('show')));
    S.n = 2; const h0 = S.hits;
    await pg.evaluate(() => { document.dispatchEvent(new Event('visibilitychange')) }); await pg.settle(500);
    T('① 刚读过（不到 1 分钟）回到前台：不重复读', S.hits === h0, [S.hits, h0]);
    await pg.evaluate(() => { NBQ_FRESH_AT = Date.now() - 61000; document.dispatchEvent(new Event('visibilitychange')) });
    await pg.waitForFunction(() => GAMES.length === 2, null, { timeout: 8000 }).catch(() => { }); await pg.settle(400);
    T('① 过了 1 分钟回到前台：重读，新发布的球局进来了', await pg.evaluate(() => GAMES.length) === 2 && S.hits === h0 + 1, [await pg.evaluate(() => GAMES.length), S.hits]);
    T('①② 没有页面报错', !errs.length, errs); await ctx.close(); }
  // ---- ③④ 演示模式（已登录的演示账号）；无头浏览器 = 浏览器标签（ENV = safari）----
  { const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }), pg = await ctx.newPage(), errs = []; pg.on('pageerror', e => errs.push(e.message));
    await pg.route('https://demo.test/**', html); await pg.route(u => !/^https:\/\/demo\.test\//.test(u.toString()), r => r.abort());
    await pg.goto('https://demo.test/'); await pg.waitForFunction(() => typeof setWho === 'function' && typeof pushNudgeHTML === 'function'); await pg.settle(600);
    await pg.evaluate(() => { setWho('jason', true); setEnv('safari'); PUSH.enabled = false }); await pg.settle(300);
    T('③ 浏览器标签里、没看过步骤：有「放到主屏幕」小卡片', await pg.evaluate(() => /data-a="a2hs"/.test(pushNudgeHTML('game'))));
    await pg.evaluate(() => openA2HS()); await pg.settle(400);
    T('③ 步骤页有「我已添加」和「稍后」', await pg.evaluate(() => !!document.querySelector('#sheet [data-a="a2hsDone"]') && !!document.querySelector('#sheet [data-a="close"]')));
    await pg.click('#sheet [data-a="close"]'); await pg.settle(400);
    T('③ 看过步骤后：小卡片不再出现，状态仍是 need_install', await pg.evaluate(() => pushNudgeHTML('game') === '' && pushState() === 'need_install'));
    T('③ 还没说「已添加」：申请成功页仍给「添加到主屏幕」按钮', await pg.evaluate(() => { openApplied(GAMES[0].id); return !!document.querySelector('#sheet [data-a="a2hs"]') }));
    await pg.evaluate(() => openA2HS()); await pg.settle(300); await pg.click('#sheet [data-a="a2hsDone"]'); await pg.settle(400);
    T('③ 点「我已添加」：状态 installed，小卡片没有', await pg.evaluate(() => pushState() === 'installed' && pushNudgeHTML('game') === '' && pushNudgeHTML('invite') === ''));
    T('③ 已添加：申请成功页不再给按钮，只说从桌面图标打开', await pg.evaluate(() => { openApplied(GAMES[0].id); const s = document.querySelector('#sheet'); return !s.querySelector('[data-a="a2hs"]') && s.innerText.includes('桌面的南伴球图标') }));
    const shut = async () => { await pg.evaluate(() => closeSheet()); await pg.waitForFunction(() => !document.querySelector('#sheet.show'), null, { timeout: 5000 }).catch(() => { }) };   // 等面板真的关上（并发跑时动画慢，固定等会偶发）
    await shut();
    // ④
    await pg.evaluate(() => { try { localStorage.removeItem('nbq_push_asked') } catch (_) { } pnAfterLogin() }); await pg.settle(300);
    T('④ 浏览器标签里登录完：不问通知', await pg.evaluate(() => !document.querySelector('#sheet.show')));
    await pg.evaluate(() => { setEnv('pwa'); PUSH.enabled = false }); await pg.settle(300);
    const canAsk = await pg.evaluate(() => pushState());
    if (canAsk === 'ask') {
      await pg.evaluate(() => pnAfterLogin()); await pg.settle(400);
      T('④ 主屏幕 App 里登录完：出现一步开通知', await pg.evaluate(() => !!document.querySelector('#sheet.show [data-a="enablePush"]')));
      await shut(); await pg.evaluate(() => pnAfterLogin()); await pg.settle(300);
      T('④ 只问一次', await pg.evaluate(() => !document.querySelector('#sheet.show')));
    } else T('④ 前置：主屏幕 App 里通知状态应为 ask', false, canAsk);
    T('③④ 没有页面报错', !errs.length, errs); await ctx.close(); }
  await b.close();
  console.log(`launch_ux: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
})();
