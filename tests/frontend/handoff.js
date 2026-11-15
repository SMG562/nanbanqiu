// 登录交接的前台部分（11-14）：iPhone 的 Safari 里登录 → 页面的安装配置换成带一次性交接码的那份 → 桌面图标第一次打开（网址带 h=码）自动登录。
//   为什么：真机反馈「Safari 登录一次、添加到主屏幕后又要登录一次」。服务端的安全性质在 pg/api_handoff；这里测前台什么时候要码、什么时候换、换不成怎么办。
//   查什么：① Safari 登录后 manifest 指向 /api/manifest?h=码，码缓存在本机不重复要；退出登录后换回原样、缓存清掉
//           ② 带 h=码 打开（本机没登录）：换登录、读入「我」、地址栏里的码立刻去掉、之后续期走自家接口
//           ③ 码不对：照常是未登录的首页，不报错、不卡在「正在恢复登录」  ④ 本机已有登录：不去换
//           ⑤ 安卓不要码（浏览器和桌面图标本来共用登录）；服务器没启用（404）不影响登录
//   查不到什么：iPhone 是否真的把带码的启动网址记进桌面图标（真机清单）。
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const DIR = process.env.NBQ_DIR || path.join(__dirname, '..', '..'), F = '南伴球_PWA.html', SB = 'https://xosrdkrkfxkdrwldfhac.supabase.co';
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 500) : '')) };
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const AND = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36';
const V1 = '11111111-1111-4111-8111-111111111111', ME = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', CODE = 'C'.repeat(43), RT = 'R'.repeat(43);
const USER = { id: ME, member_no: 1288, nickname: 'Sam', last_initial: 'L', utr: 5, utr_estimated: false, avatar_kind: 'letter', avatar_animal: null, avatar_color: 'paper', card_theme: 'court', created_at: new Date(Date.now() - 864e5).toISOString(), gender: 'f', club_ids: [], pact_accepted_at: new Date().toISOString() };
(async () => {
  const b = await chromium.launch({ executablePath: process.env.NBQ_CHROMIUM || '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const open = async (ua, url, S = {}) => { const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, userAgent: ua }), pg = await ctx.newPage(), errs = [], api = []; pg.on('pageerror', e => errs.push(e.message));
    if (S.init) await ctx.addInitScript(S.init, S.initArg);
    S = Object.assign({ handoff: 200, redeem: 200, manifest: 200, n: 0, revoked: 0, check: true, checks: 0, code: CODE }, S);
    await pg.route('https://nanbanqiu.app/**', r => { const u = new URL(r.request().url()), m = r.request().method(), p = u.pathname; if (!p.startsWith('/api/')) return r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: fs.readFileSync(path.join(DIR, F)) });
      api.push(m + ' ' + p + u.search + (r.request().headers()['authorization'] ? ' [' + r.request().headers()['authorization'].slice(7) + ']' : '')); const J = (s, d) => r.fulfill({ status: s, contentType: 'application/json', body: JSON.stringify(d) });
      if (p === '/api/venues') return J(200, { venues: [{ id: V1, name: 'Test Tennis Club', short_name: 'Test TC', suburb: 'Malvern', surfaces: ['hard'], courts: 4, lights: true, indoor: false, booking_url: null, lat: -37.86, lng: 145.03 }] });
      if (p === '/api/me/register') { S.reg = 1; return J(200, { ok: true }) }
      if (p === '/api/me') return J(200, S.newUser && !S.reg ? { registered: false } : { registered: true, user: USER });
      if (p === '/api/games') return J(200, { games: [] }); if (p === '/api/games/mine') return J(200, { games: [], participants: [], profiles: {} }); if (p === '/api/invites') return J(200, { invites: [], profiles: {} });
      if (p === '/api/session/handoff') { S.n++; return S.handoff === 200 ? J(200, { code: S.code, expires_at: new Date(Date.now() + 864e5).toISOString() }) : J(404, { error: 'handoff_unavailable' }) }
      if (p === '/api/session/redeem' && S.redeem === 426) return J(426, { error: 'client_outdated' });
      if (p === '/api/session/redeem') return S.redeem === 200 ? J(200, { access_token: 'OWN', refresh_token: RT, expires_in: 3600, user: { id: 'sb-1', phone: '61412345678' } }) : J(401, { error: 'handoff_invalid' });
      if (p === '/api/session/logout') return J(200, { ok: true });
      if (p === '/api/session/handoff/check') { S.checks++; let bc = ''; try { bc = JSON.parse(r.request().postData() || '{}').code } catch (_) { } return J(200, S.check || bc !== CODE ? { ok: true } : { ok: false }) }   // check:false = 只有旧码 CODE 作废，换来的新码有效
      if (p === '/api/session/handoff/revoke') { S.revoked++; return J(200, { ok: true, revoked: 1 }) }
      if (p === '/api/manifest') return S.manifest === 200 ? J(200, { name: '南伴球', start_url: '/melbourne/?source=pwa&h=' + u.searchParams.get('h') }) : J(404, { error: 'not_found' });
      return J(404, { error: 'not_found' }) });
    await pg.route(SB + '/**', r => { const v = r.request().url().includes('/verify'); r.fulfill({ status: v ? 200 : 204, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: v ? JSON.stringify({ access_token: 'AT', refresh_token: 'SBRT', expires_in: 3600, user: { id: 'sb-1', phone: '61412345678' } }) : '' }) });
    await pg.route(u => !/^https:\/\/(nanbanqiu\.app|xosrdkrkfxkdrwldfhac\.supabase\.co)\//.test(u.toString()), r => r.abort());
    await pg.goto(url); await pg.waitForFunction(() => typeof openAuth === 'function' && typeof nbqApply === 'function'); await pg.settle(800);
    const login = async () => { for (let i = 0; i < 8; i++) { try { await pg.evaluate(() => { try { sessionStorage.setItem('nbq_a2hs_first', '1') } catch (_) { } openAuth(null) }); await pg.fill('#ph', '0412 345 678', { timeout: 3000 }); await pg.click('[data-a="sendCode"]', { timeout: 3000 }); await pg.waitForFunction(() => { const o = document.getElementById('otp'); return !!o && typeof o.oninput === 'function' }, null, { timeout: 5000 }); await pg.fill('#otp', '123456', { timeout: 3000 }); break } catch (_) { await pg.waitForTimeout(300) } }
      await pg.waitForFunction(() => !!ME, null, { timeout: 10000 }).catch(() => { }); await pg.settle(600) };
    const man = () => pg.evaluate(() => (document.querySelector('link[rel="manifest"]') || {}).getAttribute ? document.querySelector('link[rel="manifest"]').getAttribute('href') : null);
    return { pg, ctx, errs, api, S, login, man } };

  // ① iPhone Safari：登录后安装配置带码
  let s = await open(IOS, 'https://nanbanqiu.app/');
  T('① 登录前：安装配置是原样', await s.man() === '/manifest.webmanifest', await s.man());
  await s.login();
  await s.pg.waitForFunction(() => /\/api\/manifest\?h=/.test(document.querySelector('link[rel="manifest"]').getAttribute('href')), null, { timeout: 8000 }).catch(() => { });
  T('① 登录后：安装配置换成带交接码的那份', await s.man() === '/api/manifest?h=' + CODE, await s.man());
  T('① 码缓存在本机（记着是谁的、几时过期）', await s.pg.evaluate(c => { const o = JSON.parse(localStorage.getItem('nbq_ho') || 'null'); return !!o && o.code === c && o.uid === ME.id && o.exp > Date.now() }, CODE));
  // 刚登录的这一次，页面打开时安装配置还没带码 → 打开步骤页会刷新一次再回来（#299）
  await s.pg.evaluate(() => { window.__before = true; openA2HS() });
  await s.pg.waitForFunction(() => !window.__before && typeof ME !== 'undefined' && !!ME && !!document.querySelector('#sheet.show [data-a="a2hsDone"]'), null, { timeout: 15000 }).catch(() => { }); await s.pg.settle(300);
  T('① 刚登录就打开步骤页：刷新一次、回到步骤页；不重复要码；说明写「会自动登录」', s.S.n === 1 && await s.pg.evaluate(() => document.querySelector('#sheet').innerText.includes('会自动登录')), s.S.n);
  await s.pg.evaluate(() => { closeSheet(); sbaLogout(); render() }); await s.pg.settle(600);
  T('① 退出登录：告诉服务器作废没用掉的码', s.S.revoked === 1, s.S.revoked);
  T('① 退出登录：安装配置换回原样，缓存的码清掉', await s.man() === '/manifest.webmanifest' && await s.pg.evaluate(() => localStorage.getItem('nbq_ho') === null), await s.man());
  T('① 没有页面报错', !s.errs.length, s.errs); await s.ctx.close();

  // ①b 第一次登录就能直接添加到主屏幕：登录完趁「登录中」那一下刷新一次（#299），不用用户关标签页重开
  //   查：刷新后页面「加载那一刻」的安装配置就带码（init 脚本在页面脚本之前记下 link 的 href）· 回到刚才的标签页 · 只刷新一次 · 有接着要做的事（AUTH.next）不刷新
  { const rec = () => { window.__loads = (window.__loads || 0) + 1; try { sessionStorage.setItem('__ld', String((+sessionStorage.getItem('__ld') || 0) + 1)) } catch (_) { }
      document.addEventListener('DOMContentLoaded', () => { try { const l = document.querySelector('link[rel="manifest"]'); sessionStorage.setItem('__mf' + sessionStorage.getItem('__ld'), l ? l.getAttribute('href') : 'none') } catch (_) { } }) };
    s = await open(IOS, 'https://nanbanqiu.app/', { init: rec });
    await s.pg.evaluate(() => go('me')); await s.login();
    await s.pg.waitForFunction(() => sessionStorage.getItem('__ld') === '2' && typeof ME !== 'undefined' && !!ME, null, { timeout: 15000 }).catch(() => { }); await s.pg.settle(1200);
    const st = await s.pg.evaluate(() => ({ ld: sessionStorage.getItem('__ld'), m1: sessionStorage.getItem('__mf1'), m2: sessionStorage.getItem('__mf2'), tab: UI.tab, me: !!ME, toast: (document.querySelector('#toast') || {}).innerText || '' }));
    T('①b 第一次登录后刷新了一次（第二次加载）', st.ld === '2', st);
    T('①b 第一次加载安装配置不带码，刷新后加载那一刻就带码', st.m1 === '/manifest.webmanifest' && st.m2 === '/api/manifest?h=' + CODE, st);
    T('①b 刷新后回到「我的」标签页、已登录', st.tab === 'me' && st.me, st);
    T('①b 刷新后补一句「欢迎回来」', /欢迎回来/.test(st.toast), st);
    T('①b 只要了一个码', s.S.n === 1, s.S.n);
    await s.pg.evaluate(() => { try { sessionStorage.removeItem('__x') } catch (_) { } }); await s.pg.reload(); await s.pg.settle(1500);
    T('①b 之后再打开不再多刷新', await s.pg.evaluate(() => sessionStorage.getItem('__ld')) === '3' && s.S.n === 1);
    await s.ctx.close();
    s = await open(IOS, 'https://nanbanqiu.app/', { init: rec });
    await s.pg.evaluate(() => { try { sessionStorage.setItem('nbq_a2hs_first', '1') } catch (_) { } openAuth(() => { window.__nx = 1 }) }); await s.pg.fill('#ph', '0412 345 678'); await s.pg.click('[data-a="sendCode"]'); await s.pg.waitForFunction(() => { const o = document.getElementById('otp'); return !!o && typeof o.oninput === 'function' }); await s.pg.fill('#otp', '123456');
    await s.pg.waitForFunction(() => window.__nx === 1, null, { timeout: 10000 }).catch(() => { }); await s.pg.settle(1500);
    T('①b 登录后还要接着做事：不刷新，接着做', await s.pg.evaluate(() => window.__nx === 1 && sessionStorage.getItem('__ld') === '1'));
    T('①b 没有页面报错', !s.errs.length, s.errs); await s.ctx.close() }

  // ①c 新号码：填完资料后也一样，刷新一次再进入（用户的真机：新账号填资料后添加到桌面，打开还是没登录）
  { const rec = () => { try { sessionStorage.setItem('__ld', String((+sessionStorage.getItem('__ld') || 0) + 1)); document.addEventListener('DOMContentLoaded', () => { try { const l = document.querySelector('link[rel="manifest"]'); sessionStorage.setItem('__mf' + sessionStorage.getItem('__ld'), l ? l.getAttribute('href') : 'none') } catch (_) { } }) } catch (_) { } };
    s = await open(IOS, 'https://nanbanqiu.app/', { init: rec, newUser: true });
    await s.pg.evaluate(() => go('me')); await s.login(); await s.pg.waitForFunction(() => typeof NP !== 'undefined' && !!document.querySelector('[data-a="npDone"]'), null, { timeout: 10000 }).catch(() => { });
    await s.pg.evaluate(() => nbqNpDone('Sam'));
    await s.pg.waitForFunction(() => sessionStorage.getItem('__ld') === '2' && typeof ME !== 'undefined' && !!ME, null, { timeout: 15000 }).catch(() => { }); await s.pg.settle(1200);
    const st = await s.pg.evaluate(() => ({ ld: sessionStorage.getItem('__ld'), m2: sessionStorage.getItem('__mf2'), tab: UI.tab, me: !!ME, toast: (document.querySelector('#toast') || {}).innerText || '' }));
    T('①c 新号码填完资料：刷新一次，加载那一刻安装配置就带码', st.ld === '2' && st.m2 === '/api/manifest?h=' + CODE, st);
    T('①c 刷新后已登录、回到原标签页、提示「账号已创建」', st.me && st.tab === 'me' && /账号已创建/.test(st.toast), st);
    T('①c 没有页面报错', !s.errs.length, s.errs); await s.ctx.close() }

  // ② 桌面图标第一次打开
  s = await open(IOS, 'https://nanbanqiu.app/melbourne/?source=pwa&h=' + CODE);
  await s.pg.waitForFunction(() => !!ME, null, { timeout: 10000 }).catch(() => { }); await s.pg.settle(500);
  T('② 带码打开：自动登录，读入「我」', await s.pg.evaluate(() => !!ME && ME.name) === 'Sam', s.api);
  T('② 换码只发了一次，之后的请求带换来的令牌', s.api.filter(a => a.startsWith('POST /api/session/redeem')).length === 1 && s.api.some(a => a.startsWith('GET /api/me') && a.endsWith('[OWN]')), s.api);
  T('② 地址栏里的码已经去掉，别的参数还在', await s.pg.evaluate(() => !location.href.includes('h=') && location.search.includes('source=pwa')), await s.pg.evaluate(() => location.href));
  T('② 本机存的是 own 登录', await s.pg.evaluate(() => { const x = JSON.parse(localStorage.getItem('nbq_sb')); return x && x.own === true && x.access_token === 'OWN' }));
  T('② 换过的码记在本机', await s.pg.evaluate(c => localStorage.getItem('nbq_ho_done') === c, CODE));
  // 桌面图标每次打开都带着同一个码：退出登录后再从图标打开，不再拿它去试（不闪「正在恢复登录」、不白发请求）
  await s.pg.evaluate(() => { sbaLogout(); render() }); await s.pg.settle(500); s.api.length = 0;
  await s.pg.goto('https://nanbanqiu.app/melbourne/?source=pwa&h=' + CODE); await s.pg.waitForFunction(() => typeof openAuth === 'function' && typeof nbqApply === 'function'); await s.pg.settle(800);
  T('② 同一个码再打开：不再去换，地址栏照样去掉，是未登录的首页', !s.api.some(a => a.includes('/api/session/redeem')) && await s.pg.evaluate(() => !ME && !sbaWaiting() && !location.href.includes('h=')), s.api);
  T('② 没有页面报错', !s.errs.length, s.errs); await s.ctx.close();

  // ③ 码不对
  s = await open(IOS, 'https://nanbanqiu.app/melbourne/?h=' + CODE, { redeem: 401 }); await s.pg.settle(800);
  T('③ 码不对（用过 / 过期）：说明一句，让用户登录一次', await s.pg.evaluate(() => (document.querySelector('#toast') || {}).textContent || '').then(t => t.includes('没能自动登录')), await s.pg.evaluate(() => (document.querySelector('#toast') || {}).textContent));
  T('③ 码不对：未登录的首页，不卡在「正在恢复登录」，地址栏没有码', await s.pg.evaluate(() => !ME && !sbaWaiting() && !location.href.includes('h=') && localStorage.getItem('nbq_sb') === null));
  T('③ 没有页面报错', !s.errs.length, s.errs); await s.ctx.close();
  s = await open(IOS, 'https://nanbanqiu.app/melbourne/?h=bad%20code'); await s.pg.settle(500);
  T('③ 码格式不对：不发换码请求，地址栏照样去掉', !s.api.some(a => a.includes('/api/session/redeem')) && await s.pg.evaluate(() => !location.href.includes('h=')), s.api); await s.ctx.close();

  // 独立复核：换码遇到不确定的失败（版本太旧 426 / 限次 / 服务器忙）不能把码记成「试过」——码还没用掉
  s = await open(IOS, 'https://nanbanqiu.app/melbourne/?h=' + CODE, { redeem: 426 }); await s.pg.settle(800);
  T('③ 换码回 426：不记成试过（码没烧掉），不提示「没能自动登录」', await s.pg.evaluate(() => localStorage.getItem('nbq_ho_done') === null && !ME && !((document.querySelector('#toast') || {}).textContent || '').includes('没能自动登录')));
  s.S.redeem = 200; await s.pg.evaluate(() => document.dispatchEvent(new Event('visibilitychange'))); await s.pg.waitForFunction(() => !!ME, null, { timeout: 10000 }).catch(() => { });
  T('③ 回到前台再试：换成功、自动登录', await s.pg.evaluate(() => !!ME && localStorage.getItem('nbq_ho_done') !== null), s.api); await s.ctx.close();

  // ④ 本机已有登录
  s = await open(IOS, 'https://nanbanqiu.app/'); await s.login(); s.api.length = 0;
  await s.pg.goto('https://nanbanqiu.app/melbourne/?h=' + CODE); await s.pg.waitForFunction(() => typeof ME !== 'undefined' && !!ME, null, { timeout: 10000 }).catch(() => { }); await s.pg.settle(500);
  T('④ 本机已有登录：不去换码，仍是原来的登录', !s.api.some(a => a.includes('/api/session/redeem')) && await s.pg.evaluate(() => !!ME && !JSON.parse(localStorage.getItem('nbq_sb')).own), s.api); await s.ctx.close();

  // ⑤ 安卓不要码；服务器没启用不影响登录
  s = await open(AND, 'https://nanbanqiu.app/'); await s.login(); await s.pg.settle(500);
  T('⑤ 安卓：登录后不要码，安装配置原样', s.S.n === 0 && await s.man() === '/manifest.webmanifest' && await s.pg.evaluate(() => !!ME), [s.S.n, await s.man()]); await s.ctx.close();
  s = await open(IOS, 'https://nanbanqiu.app/', { handoff: 404 }); await s.login(); await s.pg.settle(500);
  await s.pg.evaluate(() => openA2HS()); await s.pg.settle(400);
  T('⑤ 服务器没启用：这次打开只问一次，不反复要码', s.S.n === 1, s.S.n);
  T('⑤ 服务器没启用（404）：照常登录，安装配置原样，没有报错', await s.pg.evaluate(() => !!ME) && await s.man() === '/manifest.webmanifest' && !s.errs.length, [await s.man(), s.errs]); await s.ctx.close();

  // ⑦ #299：iOS 在页面加载时就读安装配置。本机已缓存没过期的码 → 页面一打开就同步写好，不等任何网络请求
  { const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, userAgent: IOS }), pg = await ctx.newPage(), errs = []; pg.on('pageerror', e => errs.push(e.message)); let apiDone = 0, mode = 'ok';
    await ctx.addInitScript(([code, m]) => { try { if (m !== 'nosession') localStorage.setItem('nbq_sb', JSON.stringify({ access_token: 'AT', refresh_token: 'SBRT', expires_at: Math.floor(Date.now() / 1000) + 3000, uid: 'sb-1', phone: '61412345678' }));
      localStorage.setItem('nbq_ho', JSON.stringify({ code, exp: Date.now() + (m === 'expired' ? 60e3 : 20 * 3600e3), uid: 'x' })) } catch (_) { } }, [CODE, 'ok']);
    await pg.route('https://nanbanqiu.app/**', r => { const u = new URL(r.request().url()); if (!u.pathname.startsWith('/api/')) return r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: fs.readFileSync(path.join(DIR, F)) }); /* 接口一律挂住：证明不靠网络 */ });
    await pg.route(u => !/^https:\/\/nanbanqiu\.app\//.test(u.toString()), r => r.abort());
    await pg.goto('https://nanbanqiu.app/', { waitUntil: 'domcontentloaded' });
    const href = await pg.evaluate(() => document.querySelector('link[rel="manifest"]').getAttribute('href'));
    T('⑦ 本机有没过期的码 + 有登录：页面一打开安装配置就带码（所有接口都还挂着）', href === '/api/manifest?h=' + CODE, href);
    T('⑦ 页面脚本也认得已经换好（HO_READY），步骤页会写「会自动登录」', await pg.evaluate(() => typeof HO_READY !== 'undefined' && HO_READY === true));
    T('⑦ 没有页面报错', !errs.length, errs); await ctx.close(); }
  for (const [m, why] of [['expired', '码快过期（不到 1 小时）'], ['nosession', '本机没有登录']]) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, userAgent: IOS }), pg = await ctx.newPage();
    await ctx.addInitScript(([code, m]) => { try { if (m !== 'nosession') localStorage.setItem('nbq_sb', JSON.stringify({ access_token: 'AT', refresh_token: 'SBRT', expires_at: Math.floor(Date.now() / 1000) + 3000, uid: 'sb-1', phone: '61412345678' }));
      localStorage.setItem('nbq_ho', JSON.stringify({ code, exp: Date.now() + (m === 'expired' ? 60e3 : 20 * 3600e3), uid: 'x' })) } catch (_) { } }, [CODE, m]);
    await pg.route('https://nanbanqiu.app/**', r => { const u = new URL(r.request().url()); if (!u.pathname.startsWith('/api/')) return r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: fs.readFileSync(path.join(DIR, F)) }) });
    await pg.route(u => !/^https:\/\/nanbanqiu\.app\//.test(u.toString()), r => r.abort());
    await pg.goto('https://nanbanqiu.app/', { waitUntil: 'domcontentloaded' });
    T(`⑦ ${why}：不提前换，安装配置原样`, await pg.evaluate(() => document.querySelector('link[rel="manifest"]').getAttribute('href')) === '/manifest.webmanifest'); await ctx.close(); }

  // ⑧ #299 真机反馈：桌面图标把码用掉之后，Safari 里缓存的还是同一个（已作废的）码——再添加一次图标就登录不上。
  //   每次打开核对一次；作废了就换新码。打开「添加到主屏幕」步骤页时，iOS 读到的（页面打开那一刻的）安装配置若不是现在有效的这一份，就刷新一次并回到步骤页
  const NEW = 'N'.repeat(43), preset = ([code]) => { try { localStorage.setItem('nbq_sb', JSON.stringify({ access_token: 'AT', refresh_token: 'SBRT', expires_at: Math.floor(Date.now() / 1000) + 3000, uid: 'sb-1', phone: '61412345678' }));
    if (!localStorage.getItem('nbq_ho')) localStorage.setItem('nbq_ho', JSON.stringify({ code, exp: Date.now() + 20 * 3600e3, uid: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' })) } catch (_) { } };
  //   刚打开就核对出作废 → 换新码后静默刷新一次，让页面加载那一刻读到的就是新码（用 Safari 自带分享添加也对）；之后不再刷新
  const preset2 = ([code]) => { try { localStorage.setItem('nbq_sb', JSON.stringify({ access_token: 'AT', refresh_token: 'SBRT', expires_at: Math.floor(Date.now() / 1000) + 3000, uid: 'sb-1', phone: '61412345678' })); if (!localStorage.getItem('nbq_ho')) localStorage.setItem('nbq_ho', JSON.stringify({ code, exp: Date.now() + 20 * 3600e3, uid: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' })) } catch (_) { } try { sessionStorage.setItem('__ld', String((+sessionStorage.getItem('__ld') || 0) + 1)) } catch (_) { } };
  s = await open(IOS, 'https://nanbanqiu.app/', { init: preset2, initArg: [CODE], check: false, code: NEW });
  await s.pg.waitForFunction(() => sessionStorage.getItem('__ld') === '2' && typeof ME !== 'undefined' && !!ME, null, { timeout: 15000 }).catch(() => { }); await s.pg.settle(1000);
  T('⑧ 缓存的码已作废：换成新码，并静默刷新一次', await s.pg.evaluate(() => sessionStorage.getItem('__ld')) === '2' && s.S.n === 1 && await s.pg.evaluate(n => JSON.parse(localStorage.getItem('nbq_ho')).code === n, NEW), [s.S.n]);
  T('⑧ 刷新后页面加载那一刻就是新码（HO_AT_LOAD），不再刷新第二次', await s.pg.evaluate(n => HO_AT_LOAD === '/api/manifest?h=' + n && sessionStorage.getItem('__ld') === '2', NEW) && await s.man() === '/api/manifest?h=' + NEW, await s.man());
  await s.pg.evaluate(() => { window.__before = true; openA2HS() }); await s.pg.settle(1500);
  T('⑧ 这时开步骤页：安装配置已经是对的，不再刷新', await s.pg.evaluate(() => window.__before === true && !!document.querySelector('#sheet.show [data-a="a2hsDone"]')));
  T('⑧ 没有页面报错', !s.errs.length, s.errs); await s.ctx.close();
  s = await open(IOS, 'https://nanbanqiu.app/', { init: preset, initArg: [CODE] }); await s.pg.waitForFunction(() => typeof ME !== 'undefined' && !!ME, null, { timeout: 10000 }).catch(() => { }); await s.pg.settle(600);
  T('⑧ 缓存的码还有效：只核对、不要新码，安装配置不变', s.S.checks === 1 && s.S.n === 0 && await s.man() === '/api/manifest?h=' + CODE, [s.S.checks, s.S.n]);
  await s.pg.evaluate(() => { window.__before = true; openA2HS() }); await s.pg.settle(1500);
  T('⑧ 缓存的码还有效：开步骤页不刷新', await s.pg.evaluate(() => window.__before === true && !!document.querySelector('#sheet.show [data-a="a2hsDone"]'))); await s.ctx.close();

  // ⑧b 本机有登录、页面打开时没带码（比如码过期了）：不静默刷新；打开「添加到主屏幕」步骤页才刷新一次，并自动回到步骤页（hoGuide，兜底）
  const bare = () => { try { localStorage.setItem('nbq_sb', JSON.stringify({ access_token: 'AT', refresh_token: 'SBRT', expires_at: Math.floor(Date.now() / 1000) + 3000, uid: 'sb-1', phone: '61412345678' })) } catch (_) { } };
  s = await open(IOS, 'https://nanbanqiu.app/', { init: bare }); await s.pg.waitForFunction(() => typeof ME !== 'undefined' && !!ME && /\/api\/manifest\?h=/.test(document.querySelector('link[rel="manifest"]').getAttribute('href')), null, { timeout: 10000 }).catch(() => { }); await s.pg.settle(1200);
  T('⑧b 打开时没带码：换好了新码，但页面没有自己刷新', await s.pg.evaluate(() => HO_AT_LOAD === '/manifest.webmanifest') && await s.man() === '/api/manifest?h=' + CODE, [await s.man()]);
  await s.pg.evaluate(() => { window.__before = true; openA2HS() });
  await s.pg.waitForFunction(() => !window.__before && typeof ME !== 'undefined' && !!ME && !!document.querySelector('#sheet.show [data-a="a2hsDone"]'), null, { timeout: 15000 }).catch(() => { }); await s.pg.settle(300);
  T('⑧b 打开步骤页：刷新一次、自动回到步骤页，刷新后加载那一刻就带码', await s.pg.evaluate(() => !window.__before && !!document.querySelector('#sheet.show [data-a="a2hsDone"]') && /\/api\/manifest\?h=/.test(HO_AT_LOAD)));
  await s.pg.evaluate(() => { closeSheet(); window.__before = true; openA2HS() }); await s.pg.settle(1500);
  T('⑧b 安装配置已经是对的：再开步骤页不刷新', await s.pg.evaluate(() => window.__before === true)); await s.ctx.close();

  // ⑧c 同一标签页：带码打开 → 退出 → 再登录（登录后还有事要做）：不能静默刷新（刷新会吃掉要做的事）
  { const init = ([code]) => { try { sessionStorage.setItem('__ld', String((+sessionStorage.getItem('__ld') || 0) + 1)) } catch (_) { } try { localStorage.setItem('nbq_sb', JSON.stringify({ access_token: 'AT', refresh_token: 'SBRT', expires_at: Math.floor(Date.now() / 1000) + 3000, uid: 'sb-1', phone: '61412345678' })); if (!localStorage.getItem('nbq_ho')) localStorage.setItem('nbq_ho', JSON.stringify({ code, exp: Date.now() + 20 * 3600e3, uid: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' })) } catch (_) { } };
    s = await open(IOS, 'https://nanbanqiu.app/', { init, initArg: [CODE] }); await s.pg.waitForFunction(() => typeof ME !== 'undefined' && !!ME && /\/api\/manifest\?h=/.test(HO_AT_LOAD), null, { timeout: 10000 }).catch(() => { }); await s.pg.settle(800);
    await s.pg.evaluate(() => { closeSheet(); sbaLogout(); render() }); await s.pg.settle(600); s.S.code = 'M'.repeat(43);   // 再登录要到的是另一个码（和页面打开时带的不同）
    await s.pg.evaluate(() => { try { sessionStorage.setItem('nbq_a2hs_first', '1') } catch (_) { } openAuth(() => { window.__nx = 1 }) }); await s.pg.fill('#ph', '0412 345 678'); await s.pg.click('[data-a="sendCode"]'); await s.pg.waitForFunction(() => { const o = document.getElementById('otp'); return !!o && typeof o.oninput === 'function' }); await s.pg.fill('#otp', '123456');
    await s.pg.waitForFunction(() => window.__nx === 1, null, { timeout: 10000 }).catch(() => { }); await s.pg.settle(2000);
    T('⑧c 退出再登录（有接着要做的事）：不刷新，接着做', await s.pg.evaluate(() => window.__nx === 1 && sessionStorage.getItem('__ld') === '1'), await s.pg.evaluate(() => sessionStorage.getItem('__ld')));
    T('⑧c 没有页面报错', !s.errs.length, s.errs); await s.ctx.close() }

  // ⑥ 带码的安装配置取不到（接口 404 / 抖动）：保持原样，不把「添加到主屏幕」弄坏
  s = await open(IOS, 'https://nanbanqiu.app/', { manifest: 404 }); await s.login(); await s.pg.settle(800);
  T('⑥ 探测不到带码的安装配置：不换', s.S.n === 1 && await s.man() === '/manifest.webmanifest' && !s.errs.length, [s.S.n, await s.man(), s.errs]); await s.ctx.close();

  await b.close();
  console.log(`handoff: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
})();
