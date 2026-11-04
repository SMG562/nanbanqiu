// 推送引导（11-04）：①引导只在「等对方回复」之后出现（发邀约 / 发球局），手机端才有；②状态 ask/denied/need_install/wechat/on；
//   ③被系统拒绝后不再弹窗、给设置指引；④已授权但服务器没有这台设备 → 启动静默补订阅（只一次，读失败不动）；⑤iPhone Safari 登录前先建议添加到主屏幕（可跳过、同次打开不再问）
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const DIR = process.env.NBQ_DIR || path.join(__dirname, '..', '..');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 500) : '')) };
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const SB = 'https://xosrdkrkfxkdrwldfhac.supabase.co';
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  // ---------- 演示模式：状态与引导卡 ----------
  for (const f of ['南伴球_PWA.html', '南伴球_Web.html']) {
    const W = f.includes('Web'), ctx = await b.newContext({ viewport: W ? { width: 1360, height: 860 } : { width: 390, height: 844 } });
    const pg = await ctx.newPage(), errs = []; pg.on('pageerror', e => errs.push(e.message));
    await pg.route('https://nanbanqiu.test/**', r => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: fs.readFileSync(path.join(DIR, f)) }));
    await pg.route('https://cdnjs.cloudflare.com/**', r => r.abort()); await pg.route('https://basemaps.cartocdn.com/**', r => r.abort());
    await pg.goto('https://nanbanqiu.test/'); await pg.settle(500);
    if (W) {
      const r = await pg.evaluate(() => ({ nudge: typeof pushNudgeHTML === 'function' ? pushNudgeHTML('game') : 'nofn' }));
      T('电脑端：没有推送引导卡（11-03 定的：只推手机）', r.nudge === '' || r.nudge === 'nofn', r);
    } else {
      const r = await pg.evaluate(() => {
        setWho(Object.keys(USERS)[0], true); const o = {};
        setEnv('safari'); o.safari = pushState(); setEnv('wechat'); o.wechat = pushState(); setEnv('pwa'); PUSH.enabled = false;
        o.ask = pushState(); o.askHtml = pushNudgeHTML('game'); o.invHtml = pushNudgeHTML('invite');
        const orig = Object.getOwnPropertyDescriptor(Notification, 'permission'); Object.defineProperty(Notification, 'permission', { configurable: true, get: () => 'denied' });
        o.denied = pushState(); o.deniedHtml = pushNudgeHTML('game');
        window.__req = 0; const oR = Notification.requestPermission; Notification.requestPermission = () => { window.__req++; return Promise.resolve('denied') };
        enablePush(); o.sheet = document.body.innerText; o.req = window.__req;
        o.steps = document.querySelectorAll('.pdsteps li').length; o.recheck = !!document.querySelector('[data-a="pushRecheck"]');
        closeSheet(); Notification.requestPermission = oR; if (orig) Object.defineProperty(Notification, 'permission', orig); else delete Notification.permission;
        PUSH.enabled = true; o.on = pushState(); o.onHtml = pushNudgeHTML('game'); PUSH.enabled = false;
        setWho(null, true); o.anon = pushNudgeHTML('game'); return o });
      T('状态：浏览器标签 = need_install，微信 = wechat', r.safari === 'need_install' && r.wechat === 'wechat', r);
      T('状态：主屏幕 App 未授权 = ask，卡片按钮是「开启提醒」、带 data-pf 来源', r.ask === 'ask' && /开启提醒/.test(r.askHtml) && /data-a="enablePush"/.test(r.askHtml) && /data-pf="game"/.test(r.askHtml), r);
      T('邀约文案与球局文案不同', /对方回复，不错过/.test(r.invHtml) && /有人申请/.test(r.askHtml), r);
      T('状态 denied：卡片按钮是「怎么开」', r.denied === 'denied' && /data-a="pushDenied"/.test(r.deniedHtml), r);
      T('被拒绝后点开启：不再请求权限，弹出设置指引（3 步 + 我已打开）', r.req === 0 && /通知现在是关闭的/.test(r.sheet) && r.steps === 3 && r.recheck, r);
      T('已开启或未登录：不出引导卡', r.on === 'on' && r.onHtml === '' && r.anon === '', r);
      // 发邀约成功页 / 分享球局页带引导卡
      const h = await pg.evaluate(() => { setWho(Object.keys(USERS)[0], true); setEnv('pwa'); PUSH.enabled = false;
        const o = {}; try { o.inv = typeof invSentHTML === 'function' ? invSentHTML.toString().includes('pushNudgeHTML') : false } catch (_) { }
        try { const gid = (GAMES.find(g => g.host === ME.id) || GAMES[0]).id; openShare(gid); o.share = !!document.querySelector('.pnudge[data-pn="game"]'); closeSheet() } catch (e) { o.err = String(e) } return o });
      T('邀约发出页、球局分享页都接入了引导卡', h.inv && h.share, h);
    }
    T(`${f} 无脚本错误`, errs.length === 0, errs); await ctx.close();
  }
  // ---------- 真实模式（nanbanqiu.app，iPhone Safari UA）：先装后登录 · 静默补订阅 ----------
  {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, userAgent: IOS, hasTouch: true, isMobile: true });
    const pg = await ctx.newPage(), errs = []; pg.on('pageerror', e => errs.push(e.message));
    await pg.route('https://nanbanqiu.app/**', r => { const u = new URL(r.request().url()); if (!u.pathname.startsWith('/api/')) return r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: fs.readFileSync(path.join(DIR, '南伴球_PWA.html')) });
      if (u.pathname === '/api/me') return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ registered: false }) });
      return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ games: [], venues: [], notifications: [], invites: [], participants: [] }) }) });
    await pg.route(SB + '/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
    await pg.route('https://cdnjs.cloudflare.com/**', r => r.abort()); await pg.route('https://basemaps.cartocdn.com/**', r => r.abort());
    await pg.goto('https://nanbanqiu.app/'); await pg.settle(800);
    const a = await pg.evaluate(async () => { const o = { net: NBQ_NET, env: ENV, kind: a2hsKind() };
      openAuth(null); await new Promise(r => setTimeout(r, 300)); o.first = document.body.innerText; o.hasGo = !!document.querySelector('[data-a="authAnyway"]'); o.hasA2hs = !!document.querySelector('[data-a="a2hs"]');
      document.querySelector('[data-a="authAnyway"]').click(); await new Promise(r => setTimeout(r, 400)); o.after = document.body.innerText; o.flag = sessionStorage.getItem('nbq_a2hs_first');
      closeSheet(); await new Promise(r => setTimeout(r, 300)); openAuth(null); await new Promise(r => setTimeout(r, 300)); o.again = document.body.innerText; return o });
    T('iPhone Safari 真实模式：登录前先出「先添加到主屏幕」，有两个按钮', a.net && a.env === 'safari' && a.kind === 'ios_safari' && /先添加到主屏幕，再登录/.test(a.first) && a.hasGo && a.hasA2hs, a);
    T('选「先在浏览器里用」→ 进入登录；同一次打开里不再问', !/先添加到主屏幕，再登录/.test(a.after) && a.flag === '1' && !/先添加到主屏幕，再登录/.test(a.again), { flag: a.flag, after: a.after.slice(0, 80), again: a.again.slice(0, 80) });
    // 静默补订阅
    const h = await pg.evaluate(async () => { const o = {}; const calls = { sub: 0, track: [] };
      Object.defineProperty(Notification, 'permission', { configurable: true, get: () => 'granted' });
      ME = ME || { id: 'me' }; const reg = await navigator.serviceWorker.getRegistration().catch(() => null); o.sw = !!reg;
      const oD = nbqPushDiag, oS = nbqPushSub;
      const run = async (diag) => { NBQ_HEAL_DONE = false; PUSH.enabled = false; calls.sub = 0; nbqPushDiag = async () => diag; nbqPushSub = async () => { calls.sub++; return true }; await nbqPushHeal(); return { sub: calls.sub, en: PUSH.enabled } };
      o.has = await run({ devices: [{ this: true, push: true }] });
      o.miss = await run({ devices: [{ this: false, push: true }] });
      o.fail = await run(null);
      NBQ_HEAL_DONE = false; calls.sub = 0; nbqPushDiag = async () => ({ devices: [] }); nbqPushSub = async () => { calls.sub++; return true }; await nbqPushHeal(); await nbqPushHeal(); o.once = calls.sub;
      nbqPushDiag = oD; nbqPushSub = oS; return o });
    T('补订阅：服务器已有这台设备 → 不动，只把状态记为已开启', h.has.sub === 0 && h.has.en === true, h);
    T('补订阅：服务器没有这台设备 → 静默重订一次，状态变已开启', h.miss.sub === 1 && h.miss.en === true, h);
    T('补订阅：读诊断失败 → 不当作「没订阅」，不动', h.fail.sub === 0 && h.fail.en === false, h);
    T('补订阅：每次打开只做一次', h.once === 1, h);
    T('真实模式无脚本错误', errs.length === 0, errs); await ctx.close();
  }
  await b.close(); console.log(`push_onboarding: ${pass} 通过, ${fail} 失败`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1) });
