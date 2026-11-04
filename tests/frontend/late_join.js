// 11-04 开打后 30 分钟内仍可申请：球局 13:30 开打、13:28 有人申请、13:31 发起人才打开——
//   发起人要能看到申请并接受；别人在开打后 29 分钟内仍能申请；开打满 30 分钟才变成「已开打」；「没有凑齐」也推迟到那时。
const { chromium } = require('playwright');
let pass = 0, fail = 0;
const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x) : '')) };
(async () => {
  const b = await chromium.launch({});
  for (const f of ['PWA', 'Web']) {
    const p = await b.newPage({ viewport: f === 'PWA' ? { width: 390, height: 844 } : { width: 1360, height: 860 } });
    const errs = []; p.on('pageerror', x => errs.push(x.message));
    await p.goto('file:///mnt/user-data/outputs/南伴球_' + f + '.html'); await p.settle(700);
    // 造一个 1 分钟前开打的局（Han 发起，缺 1 位），Jason 2 分钟前申请
    const mk = await p.evaluate(() => {
      const now = Date.now(), id = 'lj' + (++NID);
      GAMES.push({ id, share_code: 'LJ' + NID, status: 'open', game_type: 'singles', capacity: 2, duration_min: 90, venue_id: 'v1', note: '', tags: [], host_id: 'han', ntrp_min: 1, ntrp_max: 16, starts_at: new Date(now - 60e3).toISOString(), created_at: now - 3 * 36e5 });
      partUpsert({ game_id: id, user_id: 'han', role: 'host', status: 'approved', message: '', created_at: now - 3 * 36e5 });
      partUpsert({ game_id: id, user_id: 'jason', role: 'player', status: 'pending', message: '', created_at: now - 2 * 6e4 });
      const p = PARTS.find(x => x.game_id === id && x.user_id === 'jason');
      return { id, dl: Math.round((ugDeadline(p, GAMES.find(g => g.id === id)) - now) / 6e4) };
    });
    T(`${f} 开打后申请：截止在 13 分钟后（申请 + 15 分钟），没被开打截断`, mk.dl === 13, mk);
    const host = await p.evaluate(async id => {
      setWho('han', true); ugExpire(); const c = api.get(id);
      const st = PARTS.find(x => x.game_id === id && x.user_id === 'jason').status;
      const h = requestsHTML(c);
      return { pend: c.pend.length, st, lateOpen: c.lateOpen, html: h.includes('申请 · 1') && /data-a="approve"/.test(h), stale: nrStale({ id: 9e6, kind: 'request', game_id: id, from: 'jason', user_id: 'han', read: false }) };
    }, mk.id);
    T(`${f} 13:31 发起人打开：申请还在（没失效），球局显示可加入窗口`, host.pend === 1 && host.st === 'pending' && host.lateOpen === true, host);
    T(`${f} 发起人界面里能看到申请 / 接受按钮`, host.html === true, host);
    T(`${f} 申请通知不再被判「已经开打」`, host.stale === null, host.stale);
    const acc = await p.evaluate(id => { api.decide(id, 'jason', true); return PARTS.find(x => x.game_id === id && x.user_id === 'jason').status }, mk.id);
    T(`${f} 开打后发起人仍能接受申请`, acc === 'approved', acc);
    // 别人：开打 29 分钟内能申请，满 30 分钟变「已开打」
    const other = await p.evaluate(async id => {
      const g = GAMES.find(x => x.id === id); PARTS.find(x => x.game_id === id && x.user_id === 'jason').status = 'withdrawn';
      const out = {}; setWho('grace', true);
      g.starts_at = new Date(Date.now() - 29 * 6e4).toISOString();
      const acts = c => { const x = xActs(c, stateOf(c)); if (x != null) return x; if (typeof actionsHTML === 'function') return actionsHTML(c) || ''; UI.detail = id; renderDetail(); return document.getElementById('dAct').innerHTML };
      out.in = acts(api.get(id));
      g.starts_at = new Date(Date.now() - 31 * 6e4).toISOString();
      out.out = acts(api.get(id));
      return out;
    }, mk.id);
    T(`${f} 开打 29 分钟：还能申请（有申请按钮、提示「已开打 · 还能申请加入」）`, other.in.includes('还能申请加入') && /data-a="(apply|join)"/.test(other.in), other.in.slice(0, 200));
    T(`${f} 开打 31 分钟：「这局已经开打了」，不能再申请`, other.out.includes('这局已经开打了') && !/data-a="(apply|join)"/.test(other.out), other.out.slice(0, 200));
    // 没凑齐：开打后 10 分钟不发；满 30 分钟且没有待处理申请才发
    const uf = await p.evaluate(() => {
      setWho('han', true); const now = Date.now(), id = 'lk' + (++NID);
      GAMES.push({ id, share_code: 'LK' + NID, status: 'open', game_type: 'singles', capacity: 2, duration_min: 90, venue_id: 'v1', note: '', tags: [], host_id: 'han', ntrp_min: 1, ntrp_max: 16, starts_at: new Date(now - 10 * 6e4).toISOString(), created_at: now - 3 * 36e5 });
      partUpsert({ game_id: id, user_id: 'han', role: 'host', status: 'approved', message: '', created_at: now - 3 * 36e5 });
      const has = () => NOTIFS.some(n => n.kind === 'unfilled_end' && n.game_id === id), out = {};
      housekeep(); out.at10 = has();
      const g = GAMES.find(x => x.id === id); g.starts_at = new Date(Date.now() - 35 * 6e4).toISOString();
      partUpsert({ game_id: id, user_id: 'jason', role: 'player', status: 'pending', message: '', created_at: Date.now() - 6e4 });
      housekeep(); out.pending = has();
      PARTS.find(x => x.game_id === id && x.user_id === 'jason').status = 'rejected';
      housekeep(); out.after = has();
      return out;
    });
    T(`${f} 「没有凑齐」：开打后 10 分钟不发；有待处理申请时不发；处理完且满 30 分钟才发`, uf.at10 === false && uf.pending === false && uf.after === true, uf);
    T(`${f} 没有页面错误`, errs.length === 0, errs);
    await p.close();
  }
  console.log(`${pass} passed, ${fail} failed`); await b.close(); process.exit(fail ? 1 : 0);
})();
