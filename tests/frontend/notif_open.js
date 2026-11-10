// 点通知去哪（v3）：每一种通知在两端的消息列表里点开，都要有去处，并且去对地方。
// 规则见 进度记录.md §3.6「点通知去哪」。
const { chromium } = require('playwright');
let pass = 0, fail = 0;
const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x) : '')) };
// 期望：game = 打开这局详情；sheet:<文字> = 打开含该文字的卡片；me = 我的页；fx = 庆祝页；invite = 邀约卡片
const CASES = [
  ['request', 'han', 'game'], ['approved', 'jason', 'game'], ['rejected', 'jason', 'game'], ['expired', 'jason', 'game'], ['full', 'jason', 'game'],
  ['joined', 'han', 'game'], ['player_left', 'han', 'game'], ['game_cancelled', 'jason', 'game'], ['postponed', 'jason', 'game'], ['changed', 'jason', 'game'],
  ['reopen', 'jason', 'game'], ['follow_game', 'jason', 'game'],
  ['soon', 'jason', 'sheet:分钟后开打'], ['soon_left', 'jason', 'game'], ['unfilled', 'han', 'sheet:还缺'], ['noshow', 'jason', 'sheet:没到场'],
  ['account_status', 'jason', 'me+sheet:账号暂停中'], ['account_status_stale', 'jason', 'me'], ['gone', 'jason', 'toast:已不存在'],
];
(async () => {
  const b = await chromium.launch({});
  const out = {};
  for (const f of ['PWA', 'Web']) {
    const p = await b.newPage({ viewport: f === 'PWA' ? { width: 390, height: 844 } : { width: 1360, height: 860 } });
    const errs = []; p.on('pageerror', x => errs.push(x.message));
    out[f] = {};
    for (const [kind, who, want] of CASES) {
      await p.goto('file:///mnt/user-data/outputs/南伴球_' + f + '.html'); await p.settle(700);
      const r = await p.evaluate(async ([kind, who]) => {
        const wait = ms => window.__nbqSettle ? __nbqSettle(ms) : new Promise(r => setTimeout(r, ms));
        const close = () => { try { closeSheet() } catch (_) { } try { closeModal() } catch (_) { } };
        const toasts = []; const _to = toast; toast = function (m) { toasts.push(m); return _to.apply(this, arguments) };
        const now = Date.now(), g = GAMES.find(x => x.host_id === 'han' && x.status !== 'cancelled' && new Date(x.starts_at) > now && !isW(V(x)));
        const extra = { game_id: g.id, from: who === 'han' ? 'jason' : 'han' };
        let k = kind;
        // 参加状态与通知种类对得上
        const setPart = st => { let pp = PARTS.find(x => x.game_id === g.id && x.user_id === 'jason'); if (!pp) { pp = { game_id: g.id, user_id: 'jason', role: 'player' }; PARTS.push(pp) } pp.status = st; if (st === 'rejected') pp.reason = 'level' };
        if (['rejected', 'full'].includes(kind)) setPart('rejected');
        if (['approved', 'soon', 'postponed', 'changed'].includes(kind)) setPart('approved');
        if (kind === 'soon_left') { setPart('left'); k = 'soon' }
        if (kind === 'account_status') { USERS.jason.status = 'suspended'; USERS.jason.status_until = now + 7 * 864e5; USERS.jason.status_reason = '多次爽约' }
        if (kind === 'account_status_stale') k = 'account_status';
        if (kind === 'gone') { k = 'approved'; extra.game_id = 'g_deleted' }
        if (kind === 'noshow') { const pg = GAMES.find(x => x.host_id === 'han' && new Date(x.starts_at) < now && x.status !== 'cancelled'); extra.game_id = pg.id }
        setWho(who, true); await wait(150); close();
        const n = { id: ++NID, user_id: who, kind: k, game_id: null, from: null, at: now - 1000, read: false, ...extra };
        if (k === 'account_status') { n.game_id = null; n.from = null; n.st = 'suspended'; n.until = now + 7 * 864e5; n.reason = '多次爽约' }
        NOTIFS.unshift(n);
        let text = ''; try { text = nrText(n).join(' | ') } catch (e) { text = 'ERR ' + e.message }
        if (NR_PLAT === 'mobile') { UI.msgTab = 'ntf'; go('notif') } else togglePop(true);
        await wait(300);
        const row = document.querySelector(`[data-ntfo="${n.id}"],[data-wn="${n.id}"]`);
        if (!row) return { text, row: false };
        row.querySelector('.nb b').click(); await wait(700);
        const sh = document.querySelector('#sheet.show') || document.querySelector('#mbg.show #modal');
        const detail = NR_PLAT === 'mobile' ? (document.querySelector('#detail.show') ? UI.detail : null) : UI.sel;
        const me = UI.tab === 'me' && !UI.sel;
        return { text, row: true, detail, gid: n.game_id, sheet: sh ? sh.innerText.replace(/\s+/g, ' ').slice(0, 80) : '', me, read: n.read, toast: toasts.slice(-1)[0] || '', pop: !!document.querySelector('#pop.show') }
      }, [kind, who]);
      out[f][kind] = r;
      const name = `${f} ${kind}`;
      if (!r.row) { T(name + ' 列表里有这一条', false, r); continue }
      T(name + ' 文案正常', !/ERR|undefined|NaN/.test(r.text), r.text);
      T(name + ' 点开后标为已读', r.read === true, r.read);
      if (f === 'Web') T(name + ' 点开后弹层收起', !r.pop);
      if (want === 'game') T(name + ' → 这局详情', !!r.gid && r.detail === r.gid && !r.sheet, r);
      else if (want.startsWith('sheet:')) T(name + ' → 卡片「' + want.slice(6) + '」', r.sheet.includes(want.slice(6)), r);
      else if (want === 'me') T(name + ' → 我的页（状态已恢复，不弹说明）', r.me && !r.sheet, r);
      else if (want.startsWith('me+sheet:')) T(name + ' → 我的页 + 说明「' + want.slice(9) + '」', r.me && r.sheet.includes(want.slice(9)), r);
      else if (want.startsWith('toast:')) T(name + ' → 提示「' + want.slice(6) + '」', r.toast.includes(want.slice(6)) && !r.detail, r);
    }
    // 这几种点开是球局详情，文案里要写清是哪一局（时间 · 球场）
    for (const k of ['rejected', 'expired', 'full']) T(`${f} ${k} 文案里有时间和球场`, /\d{1,2}:\d{2} · /.test(out[f][k].text) && !/附近还有别的局/.test(out[f][k].text), out[f][k].text);
    T(`${f} rejected 文案不重复「没排上」`, (out[f].rejected.text.match(/没排上/g) || []).length === 1, out[f].rejected.text);
    // 详情里的「看看附近其他球局」→ 这局那天的发现页
    await p.goto('file:///mnt/user-data/outputs/南伴球_' + f + '.html'); await p.settle(700);
    const ex = await p.evaluate(async () => {
      const wait = ms => window.__nbqSettle ? __nbqSettle(ms) : new Promise(r => setTimeout(r, ms)); const now = Date.now();
      const g = GAMES.filter(x => x.host_id === 'han' && x.status !== 'cancelled' && !isW(V(x)) && dOff(new Date(x.starts_at)) >= 1 && dOff(new Date(x.starts_at)) <= 4)[0];
      let pp = PARTS.find(x => x.game_id === g.id && x.user_id === 'jason'); if (!pp) { pp = { game_id: g.id, user_id: 'jason', role: 'player' }; PARTS.push(pp) } pp.status = 'rejected'; pp.reason = 'level';
      setWho('jason', true); await wait(100); try { closeSheet() } catch (_) { } try { closeModal() } catch (_) { }
      nrToGame(g.id, null); await wait(500);
      const btn = document.querySelector('#dAct [data-a="explore"],#colR [data-a="explore"]'); if (!btn) return { btn: false };
      btn.click(); await wait(500);
      return { btn: true, off: dOff(new Date(g.starts_at)), day: UI.day, page: UI.page, tab: UI.tab, detail: NR_PLAT === 'mobile' ? !!document.querySelector('#detail.show') : !!UI.sel }
    });
    T(`${f} 没排上的详情 →「看看附近其他球局」→ 那天的发现页`, ex.btn && ex.tab === 'disc' && !ex.detail && (f === 'PWA' ? ex.day === ex.off : ex.page === (ex.off <= 4 ? 0 : 2)), ex);
    // 演示：账号暂停后换其他演示，Jason 恢复正常，旧的状态通知不再显示
    await p.goto('file:///mnt/user-data/outputs/南伴球_' + f + '.html'); await p.settle(700);
    await p.evaluate(() => document.querySelector('[data-demo="acct"]').click()); await p.settle(900);
    await p.evaluate(() => { try { closeSheet() } catch (_) { } try { closeModal() } catch (_) { } document.querySelector('[data-demo="card"]').click() }); await p.settle(700);
    const dm = await p.evaluate(() => ({ st: USERS.jason.status || 'active', shown: NOTIFS.filter(n => n.user_id === 'jason' && n.kind === 'account_status' && !n.hide).length }));
    T(`${f} 换演示后 Jason 恢复正常、旧的账号通知隐藏`, dm.st === 'active' && dm.shown === 0, dm);
    T(`${f} 没有页面错误`, errs.length === 0, errs);
    await p.close();
  }
  // 两端去处一致
  const sig = o => JSON.stringify(Object.fromEntries(Object.entries(o).map(([k, r]) => [k, [!!r.detail, !!r.sheet, !!r.me, r.text]])));
  T('两端去处和文案一致', sig(out.PWA) === sig(out.Web), [sig(out.PWA), sig(out.Web)]);
  console.log(`${pass} passed, ${fail} failed`); await b.close(); process.exit(fail ? 1 : 0);
})();
