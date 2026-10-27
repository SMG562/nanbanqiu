// 撤回 / 退出改为「保留记录、标记状态」之后的完整流程（两端）：
// 申请 → 撤回 → 再申请 → 通过 → 退出 → 再申请；检查每一步的人数、空位、状态、记录条数、发起人看到的列表和通知。
const { chromium } = require('playwright');
let pass = 0, fail = 0;
const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x) : '')) };
(async () => {
  const b = await chromium.launch({});
  for (const f of ['PWA', 'Web']) {
    const ctx = await b.newContext({ viewport: f === 'PWA' ? { width: 390, height: 844 } : { width: 1360, height: 860 } });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', x => errs.push(x.message));
    await p.goto('file:///mnt/user-data/outputs/南伴球_' + f + '.html'); await p.waitForTimeout(900);
    const r = await p.evaluate(() => {
      try { closeSheet() } catch (_) { } try { closeModal() } catch (_) { }
      const g = GAMES.find(g => g.host_id === 'han' && g.status === 'open' && new Date(g.starts_at) > NOW && V(g).spots >= 2 && !isW(V(g)));
      if (!g) return { err: 'no game' };
      const snap = () => { const c = api.get(g.id), rows = PARTS.filter(p => p.game_id === g.id && p.user_id === 'jason');
        return { pend: c.pend.length, appr: c.appr.length, spots: c.spots, rows: rows.length, status: rows.map(r => r.status).join(','), left_at: rows.map(r => !!r.left_at).join(','), st: stateOf(c) } };
      PARTS = PARTS.filter(p => !(p.game_id === g.id && p.user_id === 'jason'));
      const o = {}; ME = USERS.jason; o.s0 = snap();
      api.apply(g.id, 'hi'); o.s1 = snap();
      api.leave(g.id); o.s2 = snap();
      api.apply(g.id, 'again'); o.s3 = snap();
      ME = USERS.han; api.decide(g.id, 'jason', true); ME = USERS.jason; o.s4 = snap();
      api.leave(g.id); o.s5 = snap(); o.inMine = api.mine().some(c => c.id === g.id && !c.past);
      api.apply(g.id, 'back'); o.s6 = snap();
      ME = USERS.han; o.hostPend = api.get(g.id).pend.map(p => p.user_id);
      o.pendingReq = NOTIFS.filter(n => n.user_id === 'han' && n.game_id === g.id && n.kind === 'request' && !n.hide && nrTodo(n)).length;
      return o
    });
    if (r.err) { T(f + ' 准备数据', false, r.err); continue }
    const base = r.s0;
    T(f + ' 申请后是待确认', r.s1.pend === base.pend + 1 && r.s1.status === 'pending' && r.s1.st === 'pending', r.s1);
    T(f + ' 撤回后保留记录、标记 withdrawn、有 left_at', r.s2.rows === 1 && r.s2.status === 'withdrawn' && r.s2.left_at === 'true' && r.s2.pend === base.pend && r.s2.st === 'open', r.s2);
    T(f + ' 再申请复用同一条记录', r.s3.rows === 1 && r.s3.status === 'pending' && r.s3.pend === base.pend + 1, r.s3);
    T(f + ' 通过后占一个空位', r.s4.status === 'approved' && r.s4.appr === base.appr + 1 && r.s4.spots === base.spots - 1 && r.s4.st === 'approved', r.s4);
    T(f + ' 退出后标记 left、空位恢复', r.s5.status === 'left' && r.s5.left_at === 'true' && r.s5.appr === base.appr && r.s5.spots === base.spots && r.s5.st === 'open', r.s5);
    T(f + ' 退出后不在我的球局（即将开始）里', r.inMine === false, r.inMine);
    T(f + ' 退出后还能再申请', r.s6.rows === 1 && r.s6.status === 'pending', r.s6);
    T(f + ' 发起人只看到一条待处理', r.hostPend.filter(x => x === 'jason').length === 1, r.hostPend);
    T(f + ' 待处理的申请通知只有一条', r.pendingReq === 1, r.pendingReq);
    T(f + ' 没有页面错误', errs.length === 0, errs);
    await ctx.close();
  }
  console.log(`${pass} passed, ${fail} failed`); await b.close(); process.exit(fail ? 1 : 0);
})();
