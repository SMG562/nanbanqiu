// 账号状态（第二批第 1 轮）：两端的权限矩阵、拦截提示、连带处理、注销 / 恢复、封禁不能登录、我的页提示、通知、事件。
// 规则来源：进度记录.md §3「账号状态」；与后台 UST、schema users.status / can_act() 同一套。
const { chromium } = require('playwright');
let pass = 0, fail = 0;
const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x) : '')) };
(async () => {
  const b = await chromium.launch({});
  const out = {};
  for (const f of ['PWA', 'Web']) {
    const ctx = await b.newContext({ viewport: f === 'PWA' ? { width: 390, height: 844 } : { width: 1360, height: 860 } });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', x => errs.push(x.message));
    await p.goto('file:///mnt/user-data/outputs/南伴球_' + f + '.html'); await p.settle(900);
    const r = await p.evaluate(async () => {
      const wait = ms => window.__nbqSettle ? __nbqSettle(ms) : new Promise(r => setTimeout(r, ms));
      const close = () => { try { closeSheet() } catch (_) { } try { closeModal() } catch (_) { } };
      const ev = []; const _t = track; track = function (n, pr) { ev.push([n, pr || {}]); return _t.apply(this, arguments) };
      const sheetText = () => { const s = [...document.querySelectorAll('.acsh')].pop(); return s ? s.innerText : '' };
      const o = {};
      // 1) 权限矩阵
      const stranger = Object.keys(USERS).find(id => id !== 'jason' && !playedTogether('jason', id));
      const pal = Object.keys(USERS).find(id => id !== 'jason' && playedTogether('jason', id));
      o.hasPeople = !!stranger && !!pal;
      const cases = [];
      for (const st of ['active', 'review', 'limited', 'suspended', 'banned', 'deleted']) {
        ME = USERS.jason; ME.status = st; ME.status_until = st === 'suspended' ? Date.now() + 864e5 : null;
        cases.push([st, {
          apply: acctCan('apply'), applyW: acctCan('apply', { women: true }), join: acctCan('join'), create: acctCan('create'),
          invS: acctCan('invite', { to: stranger }), invP: acctCan('invite', { to: pal }), chatS: acctCan('chat', { to: stranger }), chatP: acctCan('chat', { to: pal }),
          accS: acctCan('accept', { to: stranger }), counter: acctCan('counter')
        }]);
      }
      o.matrix = Object.fromEntries(cases);
      // 女生局可见性（womenOK）
      const mia = Object.values(USERS).find(u => u.gender === 'f' && !u.g_flag);
      o.womenOK = {}; for (const st of ['active', 'review', 'limited', 'suspended', 'banned', 'deleted']) { mia.status = st; o.womenOK[st] = womenOK(mia) } mia.status = 'active';
      // 暂停到期自动恢复
      ME = USERS.jason; ME.status = 'suspended'; ME.status_until = Date.now() - 1000; o.expired = acctSt(ME); o.expiredUntil = ME.status_until;
      ME.status = 'active';

      // 2) 暂停：入口拦截 + 提示 + 事件 + 待确认申请自动撤回 + 通知
      close(); ME = USERS.jason;
      const g = GAMES.find(g => g.host_id !== 'jason' && g.status === 'open' && new Date(g.starts_at) > NOW && V(g).spots >= 1 && !isW(V(g)) && !PARTS.some(p => p.game_id === g.id && p.user_id === 'jason'));
      api.apply(g.id, 'hi'); o.pendBefore = PARTS.find(p => p.game_id === g.id && p.user_id === 'jason').status;
      acctSet('jason', 'suspended', { until: Date.now() + 7 * 864e5, reason: '多次爽约' });
      o.pendAfter = PARTS.find(p => p.game_id === g.id && p.user_id === 'jason').status;
      o.reqHidden = NOTIFS.filter(n => n.kind === 'request' && n.game_id === g.id && n.from === 'jason').every(n => n.hide);
      const an = NOTIFS.find(n => n.user_id === 'jason' && n.kind === 'account_status');
      o.ntf = an ? ntfText(an) : null; o.ntfSt = an && an.st;
      ev.length = 0; close(); gateApply(g.id, () => { o.applyRan = true }); await wait(250);
      o.sheetApply = sheetText(); o.evApply = ev.filter(e => e[0] === 'account_blocked').map(e => e[1]);
      ev.length = 0; close(); openCreate(); await wait(250); o.sheetCreate = sheetText(); o.evCreate = ev.filter(e => e[0] === 'account_blocked').map(e => e[1]);
      // 我的页提示 + 注销入口
      close(); if (typeof go === 'function') { UI.detail = null; go('me') } else { UI.tab = 'mine'; UI.sel = null; render() }
      await wait(250);
      o.note = (document.querySelector('.acnote') || {}).innerText || ''; o.delLink = !!document.querySelector('.acdel');
      // 点提示：打开说明，不记拦截事件
      ev.length = 0; document.querySelector('.acnote') && document.querySelector('.acnote').click(); await wait(250);
      o.infoSheet = sheetText(); o.infoEv = ev.filter(e => e[0] === 'account_blocked').length;
      close(); acctSet('jason', 'active'); o.backActive = acctSt(USERS.jason);
      const an2 = NOTIFS.find(n => n.user_id === 'jason' && n.kind === 'account_status'); o.ntfActive = an2 ? ntfText(an2) : null;

      // 3) 注销：已加入的局退出、发起的局取消、通知、事件、登出、30 天内恢复
      close(); ME = USERS.jason;
      const g2 = GAMES.find(x => x.host_id !== 'jason' && x.status === 'open' && new Date(x.starts_at) > NOW && V(x).spots >= 1 && !isW(V(x)) && !PARTS.some(p => p.game_id === x.id && p.user_id === 'jason'));
      api.apply(g2.id, 'x'); const host2 = g2.host_id; const meSave = ME; ME = USERS[host2]; api.decide(g2.id, 'jason', true); ME = meSave;
      o.joined = PARTS.find(p => p.game_id === g2.id && p.user_id === 'jason').status;
      // Jason 发起一局，Han 已加入
      const base = GAMES.find(x => x.host_id === 'han' && new Date(x.starts_at) > NOW);
      const g3 = JSON.parse(JSON.stringify(base)); g3.id = 'acct_g3'; g3.host_id = 'jason'; g3.status = 'open'; g3.starts_at = new Date(+NOW + 3 * 864e5).toISOString(); GAMES.push(g3);
      PARTS.push({ game_id: g3.id, user_id: 'jason', role: 'host', status: 'approved' }, { game_id: g3.id, user_id: 'han', role: 'player', status: 'approved' });
      const now0 = Date.now(), up0 = GAMES.filter(x => x.status !== 'cancelled' && new Date(x.starts_at) > now0);
      o.expLeft = PARTS.filter(p => p.user_id === 'jason' && p.status === 'approved' && p.role !== 'host' && up0.some(x => x.id === p.game_id)).length;
      o.expHosted = up0.filter(x => x.host_id === 'jason').length;
      const nBefore = NOTIFS.length;
      ev.length = 0; acctDelOpen(); await wait(250); o.delSheet = sheetText();
      const go_ = document.querySelector('[data-ac="delGo"]'); go_ && go_.click(); await wait(400);
      o.afterDel = { me: ME ? ME.id : null, st: USERS.jason.status, part2: PARTS.find(p => p.game_id === g2.id && p.user_id === 'jason').status, g3: g3.status, g3cancelled: !!g3.cancelled_at };
      const newN = NOTIFS.slice(0, NOTIFS.length - nBefore);
      o.notifHost2 = newN.some(n => n.user_id === host2 && n.kind === 'player_left' && n.game_id === g2.id);
      o.notifHan = newN.some(n => n.user_id === 'han' && n.kind === 'game_cancelled' && n.game_id === g3.id);
      o.noSelfNtf = !newN.some(n => n.user_id === 'jason' && n.kind === 'account_status');
      o.evDel = ev.filter(e => e[0] === 'account_delete').map(e => e[1]);
      // 再登录 → 问要不要恢复
      close(); ev.length = 0; setWho('jason', true); await wait(250); o.restoreSheet = sheetText();
      const rb = document.querySelector('[data-ac="restore"]'); rb && rb.click(); await wait(250);
      o.afterRestore = { me: ME ? ME.id : null, st: acctSt(USERS.jason) }; o.evRestore = ev.filter(e => e[0] === 'account_restore').length;
      // 超过 30 天 → 不能恢复
      close(); USERS.jason.status = 'deleted'; USERS.jason.deleted_at = Date.now() - 31 * 864e5; setWho('jason', true); await wait(250);
      o.expiredDel = { me: ME ? ME.id : null }; USERS.jason.status = 'active'; USERS.jason.deleted_at = null;

      // 4) 封禁：不能登录
      close(); ev.length = 0; USERS.jason.status = 'banned'; USERS.jason.status_reason = '冒用身份'; setWho('jason', true); await wait(250);
      o.banned = { me: ME ? ME.id : null, sheet: sheetText(), ev: ev.filter(e => e[0] === 'account_blocked').map(e => e[1]) };
      USERS.jason.status = 'active'; USERS.jason.status_reason = null; close();
      // 5) 受限：私信陌生人被拦，私信打过球的人可以
      ME = USERS.jason; ME.status = 'limited';
      ev.length = 0; o.limInvS = acctGuard('invite', { to: stranger }); close(); o.limInvP = acctGuard('invite', { to: pal }); close();
      ME.status = 'active';
      // 所有 account_* 事件都在字典里
      o.allEv = [...new Set(ev.map(e => e[0]))];
      return o
    });
    out[f] = r;
    const m = r.matrix;
    T(f + ' 有测试用的球友', r.hasPeople);
    T(f + ' 正常：全部可以', Object.values(m.active).every(v => v === null), m.active);
    T(f + ' 待核实：只拦女生局', m.review.applyW === 'review' && m.review.apply === null && m.review.create === null && m.review.invS === null && m.review.chatS === null, m.review);
    T(f + ' 受限：女生局、陌生人私信/约球/接受被拦，打过球的人照常', m.limited.applyW === 'limited' && m.limited.apply === null && m.limited.create === null && m.limited.invS === 'limited' && m.limited.invP === null && m.limited.chatS === 'limited' && m.limited.chatP === null && m.limited.accS === 'limited' && m.limited.counter === null, m.limited);
    T(f + ' 暂停：所有写操作被拦', ['apply', 'applyW', 'join', 'create', 'invS', 'invP', 'chatS', 'chatP', 'accS', 'counter'].every(k => m.suspended[k] === 'suspended'), m.suspended);
    T(f + ' 封禁 / 注销：全部被拦', Object.values(m.banned).every(v => v === 'banned') && Object.values(m.deleted).every(v => v === 'deleted'));
    T(f + ' 女生局：待核实/封禁/注销看不到，受限/暂停仍可看', r.womenOK.active && !r.womenOK.review && r.womenOK.limited && r.womenOK.suspended && !r.womenOK.banned && !r.womenOK.deleted, r.womenOK);
    T(f + ' 暂停到期自动恢复', r.expired === 'active' && r.expiredUntil === null, [r.expired, r.expiredUntil]);
    T(f + ' 暂停后待确认申请自动撤回', r.pendBefore === 'pending' && r.pendAfter === 'withdrawn' && r.reqHidden, [r.pendBefore, r.pendAfter, r.reqHidden]);
    T(f + ' 暂停通知文案', r.ntfSt === 'suspended' && r.ntf && /暂停到/.test(r.ntf[0]) && /多次爽约/.test(r.ntf[1]), r.ntf);
    T(f + ' 暂停后申请被拦、出提示', !r.applyRan && /账号暂停中/.test(r.sheetApply) && /恢复/.test(r.sheetApply) && /safety@nanbanqiu\.app/.test(r.sheetApply), r.sheetApply);
    T(f + ' 拦截事件 account_blocked 只发一次、props 正确', r.evApply.length === 1 && r.evApply[0].action === 'apply' && r.evApply[0].status === 'suspended', r.evApply);
    T(f + ' 暂停后发起被拦', /账号暂停中/.test(r.sheetCreate) && r.evCreate.length === 1 && r.evCreate[0].action === 'create', [r.sheetCreate, r.evCreate]);
    T(f + ' 我的页有状态提示和注销入口', /账号暂停中/.test(r.note) && /恢复/.test(r.note) && r.delLink, [r.note, r.delLink]);
    T(f + ' 点提示打开说明、不记拦截事件', /账号暂停中/.test(r.infoSheet) && r.infoEv === 0, [r.infoSheet, r.infoEv]);
    T(f + ' 恢复正常 + 通知', r.backActive === 'active' && r.ntfActive && /恢复正常/.test(r.ntfActive[0]), r.ntfActive);
    T(f + ' 注销确认页列出后果', /注销账号/.test(r.delSheet) && /自动退出/.test(r.delSheet) && /会取消/.test(r.delSheet) && /30 天/.test(r.delSheet), r.delSheet);
    T(f + ' 注销后：登出、退出已加入的局、取消发起的局', r.joined === 'approved' && r.afterDel.me === null && r.afterDel.st === 'deleted' && r.afterDel.part2 === 'left' && r.afterDel.g3 === 'cancelled' && r.afterDel.g3cancelled, r.afterDel);
    T(f + ' 注销后通知发起人和已加入的人、不给自己发', r.notifHost2 && r.notifHan && r.noSelfNtf, [r.notifHost2, r.notifHan, r.noSelfNtf]);
    T(f + ' account_delete 事件只发一次、props 正确', r.evDel.length === 1 && r.expLeft >= 1 && r.expHosted >= 1 && r.evDel[0].upcoming_left === r.expLeft && r.evDel[0].hosted_cancelled === r.expHosted, [r.evDel, r.expLeft, r.expHosted]);
    T(f + ' 30 天内登录问要不要恢复', /恢复账号/.test(r.restoreSheet), r.restoreSheet);
    T(f + ' 恢复后正常、account_restore 一次', r.afterRestore.me === 'jason' && r.afterRestore.st === 'active' && r.evRestore === 1, [r.afterRestore, r.evRestore]);
    T(f + ' 超过 30 天不能恢复', r.expiredDel.me === null, r.expiredDel);
    T(f + ' 封禁不能登录、出提示、记事件', r.banned.me === null && /账号已封禁/.test(r.banned.sheet) && /冒用身份/.test(r.banned.sheet) && r.banned.ev.length === 1 && r.banned.ev[0].action === 'login', r.banned);
    T(f + ' 受限：约陌生人被拦、约打过球的人放行', r.limInvS === true && r.limInvP === false, [r.limInvS, r.limInvP]);
    // 演示按钮
    const p2 = await ctx.newPage(); const errs2 = []; p2.on('pageerror', x => errs2.push(x.message));
    await p2.goto('file:///mnt/user-data/outputs/南伴球_' + f + '.html'); await p2.settle(800);
    await p2.evaluate(() => document.querySelector('[data-demo="acct"]').click()); await p2.settle(800);
    const d = await p2.evaluate(() => ({ st: USERS.jason.status, me: ME && ME.id, note: (document.querySelector('.acnote') || {}).innerText || '', sheet: ([...document.querySelectorAll('.acsh')].pop() || {}).innerText || '' }));
    T(f + ' 演示「账号暂停中」', d.st === 'suspended' && d.me === 'jason' && /账号暂停中/.test(d.note) && /账号暂停中/.test(d.sheet), d);
    await p2.evaluate(() => { try { closeSheet() } catch (_) { } try { closeModal() } catch (_) { } document.querySelector('[data-demo="card"]').click() }); await p2.settle(600);
    T(f + ' 换其他演示后 Jason 恢复正常', await p2.evaluate(() => USERS.jason.status || 'active') === 'active');
    T(f + ' 没有页面错误', errs.length === 0 && errs2.length === 0, errs.concat(errs2));
  }
  // 两端一致
  const strip = o => JSON.stringify({ m: o.matrix, w: o.womenOK, n: o.ntf, a: o.evApply, d: o.evDel, b: o.banned && o.banned.ev });
  T('两端规则和事件完全一致', strip(out.PWA) === strip(out.Web));
  console.log(`${pass} passed, ${fail} failed`); await b.close(); process.exit(fail ? 1 : 0);
})();
