// 提醒去了哪里：从数据层推出的每条提醒都符合前台路由规则；页面数字 = 计算；手机 + 电脑 = 全部
const { chromium } = require('playwright');
const path = require('path');
const FILE = path.join(process.env.NBQ_DIR || path.join(__dirname, '..', '..'), '南伴球_后台.html');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 500) : '')) };
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] }), p = await b.newPage({ viewport: { width: 1360, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.goto('file://' + FILE); await p.waitForTimeout(600);
  const r = await p.evaluate(() => { doLogin({ preventDefault() {} }); clearInterval(window._tk); const L = N3(), D = DB, now = +NOW, bad = {}, B = (k, ok, x) => { if (!ok) (bad[k] = bad[k] || []).length < 3 && bad[k].push(x) };
    const CH = ['in_app', 'push_mobile', 'push_desktop', 'email', 'none'], LATE = ['recap', 'follow_game', 'invite_expired'], GO = ['soon', 'game_cancelled', 'changed', 'postponed'];
    const lastReq = {};
    L.forEach(n => { const h = new Date(n.t).getHours(), u = D.users[n.uid];
      B('去向取值', CH.includes(n.ch), n.ch); B('设备取值', ['mobile', 'desktop'].includes(n.dev), n.dev); B('不在未来', n.t < now, n);
      B('不紧急的夜间不推（22–8 点顺延）', !(LATE.includes(n.kind) && n.ch !== 'none' && (h >= 22 || h < 8)), [n.kind, h]);
      B('页面里提醒 = 正在用（7–23 点）', n.ch !== 'in_app' || (h >= 7 && h < 23), h);
      B('推手机 = 开了手机推送', n.ch !== 'push_mobile' || u.push, n.uid);
      B('出发类同时推手机只在电脑页面里看到时', !n.extra || (GO.includes(n.kind) && n.ch === 'in_app' && n.dev === 'desktop' && u.push), n);
      B('邮件补发只跟在推电脑后', !n.mail || n.ch === 'push_desktop', n);
      if (n.kind === 'request') { const k = n.uid + '|' + n.game; if (n.why === 'merged') B('合并 = 同局 10 分钟内', lastReq[k] != null && n.t - lastReq[k] < 6e5, n); else if (n.why !== 'stale') { B('同局 10 分钟内的第二条要合并', !(lastReq[k] != null && n.t - lastReq[k] < 6e5), n); lastReq[k] = n.t }
        B('申请提醒发给发起人', D.games[n.game].host_id === n.uid, n) }
      if (n.kind === 'soon') { const g = D.games[n.game], ap = (D.byGame.get(g.id) || []).filter(x => x.status === 'approved'); B('出发提醒：未取消、≥2 人、发给参加者', g.status !== 'cancelled' && ap.length >= 2 && ap.some(x => x.user_id === n.uid) && n.t === g.starts_at - 18e5, n) }
      if (n.kind === 'game_cancelled') B('取消提醒：球局确实取消', D.games[n.game].status === 'cancelled', n) });
    // 页面数字
    const out = []; for (const rg of [1, 7, 30, 90]) for (const pl of ['all', 'pwa', 'web']) { S.page = 'after'; S.range = rg; S.plat = pl; render();
      const C = X3.ctx(), dk = MM().range.dk, sel = L.filter(n => n.t >= C.t0 && n.t < C.t1 && B3.ok(dk, n.dev));
      const k = [...document.querySelectorAll('#page .kpi')].find(x => x.querySelector('.l').firstChild.textContent.trim() === '发出的提醒');
      out.push({ rg, pl, n: sel.length, shown: k && k.querySelector('.v').textContent, want: fmt(sel.length) }) }
    return { bad, out, n: L.length } });
  for (const [k, v] of Object.entries(r.bad)) T(k, false, v);
  T('路由规则全部满足', !Object.keys(r.bad).length, Object.keys(r.bad));
  r.out.forEach(o => T(`页面「发出的提醒」= 计算 r=${o.rg} ${o.pl}`, o.shown === o.want, o));
  [1, 7, 30, 90].forEach(rg => { const g = pl => r.out.find(o => o.rg === rg && o.pl === pl).n; T(`手机 + 电脑 = 全部 r=${rg}`, g('pwa') + g('web') === g('all'), [g('all'), g('pwa'), g('web')]) });
  T('有足够的提醒', r.n > 10000, r.n); T('没有页面错误', !errs.length, errs);
  console.log(`INFO notifications=${r.n}`); console.log(`${pass} passed, ${fail} failed`); await b.close(); process.exit(fail ? 1 : 0);
})();
