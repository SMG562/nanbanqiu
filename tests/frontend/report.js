// 站内举报（第二批第 2 轮）：两端的入口、原因、提交记录、事件、重复举报、「其他」必须写说明、未登录、私信 / 球局聊天、暂停中仍可举报。
const { chromium } = require('playwright');
let pass = 0, fail = 0;
const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x) : '')) };
(async () => {
  const b = await chromium.launch({});
  const out = {};
  for (const f of ['PWA', 'Web']) {
    const ctx = await b.newContext({ viewport: f === 'PWA' ? { width: 390, height: 844 } : { width: 1360, height: 860 } });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', x => errs.push(x.message));
    await p.goto('file:///mnt/user-data/outputs/南伴球_' + f + '.html'); await p.waitForTimeout(900);
    const r = await p.evaluate(async () => {
      const wait = ms => new Promise(r => setTimeout(r, ms));
      const close = () => { try { closeSheet() } catch (_) { } try { closeModal() } catch (_) { } };
      const ev = []; const _t = track; track = function (n, pr) { ev.push([n, JSON.parse(JSON.stringify(pr || {}))]); return _t.apply(this, arguments) };
      const toasts = []; const _to = toast; toast = function (m) { toasts.push(m); return _to.apply(this, arguments) };
      const isOpen = () => !!document.querySelector('#sheet.show .rep, #mbg.show .rep');
      const sheet = () => { const s = document.querySelector('#sheet.show .rep, #mbg.show .rep'); return s ? s.innerText : '' };
      const click = sel => { const e = document.querySelector(sel); if (e) e.click(); return !!e };
      const o = {}; REPORTS.length = 0;
      // 1) 球员卡入口
      setWho('jason', true); close(); openCard('tom'); await wait(300);
      ev.length = 0; o.cardBtn = click('[data-a="report"][data-u="tom"]'); await wait(300);
      o.sheet = sheet(); o.reasons = [...document.querySelectorAll('.rep [data-rp]')].map(x => x.dataset.rp);
      o.noMail = !/mailto/.test(location.href);
      // 「其他」没写说明：不提交
      click('[data-rp="other"]'); await wait(100); o.otherEmpty = { n: REPORTS.length, open: isOpen() };
      // 写说明后选「骚扰」
      document.getElementById('repNote').value = '  球场上一直说难听的话  '; click('[data-rp="harass"]'); await wait(300);
      o.rec = REPORTS[0] && { ...REPORTS[0] }; o.closed = !isOpen();
      o.evCard = ev.filter(e => e[0].startsWith('report_')).map(e => e[0] + JSON.stringify(e[1])); o.toast1 = toasts.slice(-1)[0];
      // 重复举报：未处理时不再打开、不再记录
      close(); openCard('tom'); await wait(300); ev.length = 0; click('[data-a="report"][data-u="tom"]'); await wait(300);
      o.dup = { n: REPORTS.length, open: isOpen(), toast: toasts.slice(-1)[0], submits: ev.filter(e => e[0] === 'report_submit').length };
      // 处理后可以再举报
      REPORTS[0].status = 'actioned'; close(); openCard('tom'); await wait(300); click('[data-a="report"][data-u="tom"]'); await wait(300);
      o.afterHandled = isOpen(); click('[data-rp="no_show"]'); await wait(200); o.n2 = REPORTS.length;
      // 2) 私信 / 球局聊天
      close(); ev.length = 0;
      const btn = document.createElement('button'); btn.dataset.cx = 'report'; btn.style.cssText = 'position:fixed;left:0;top:0'; document.body.appendChild(btn);
      const dm = dmThread('han', true); CXCUR = dm.id; btn.click(); await wait(300); o.dmSheet = sheet(); click('[data-rp="pact_violation"]'); await wait(200);
      o.dmRec = REPORTS[0] && { t: REPORTS[0].target_type, id: REPORTS[0].target_id, via: REPORTS[0].via, ctx: REPORTS[0].ctx === dm.id };
      const gp = PARTS.find(x => x.user_id === 'jason' && x.status === 'approved'); const gt = gameThread(gp.game_id, true); CXCUR = gt.id;
      btn.click(); await wait(300); o.gSheet = sheet(); click('[data-rp="harass"]'); await wait(200);
      o.gRec = REPORTS[0] && { t: REPORTS[0].target_type, id: REPORTS[0].target_id === gp.game_id, via: REPORTS[0].via };
      o.evChat = ev.filter(e => e[0].startsWith('report_')).map(e => e[0] + JSON.stringify(e[1])); btn.remove(); CXCUR = null;
      o.chatFooter = /data-cx="report"/.test(document.documentElement.innerHTML) || typeof cxHTML === 'function';
      // 3) 暂停中仍可举报
      close(); USERS.jason.status = 'suspended'; USERS.jason.status_until = Date.now() + 864e5;
      openCard('lily' in USERS ? 'lily' : 'mia'); await wait(300);
      const any = document.querySelector('[data-a="report"][data-u]'); any && any.click(); await wait(300); o.suspCan = isOpen();
      USERS.jason.status = 'active'; USERS.jason.status_until = null; close();
      // 4) 未登录：先登录
      setWho(null, true); close(); openCard('tom'); await wait(300); ev.length = 0;
      const gb = click('[data-a="report"][data-u="tom"]'); await wait(400);
      o.guest = { btn: gb, rep: isOpen(), auth: /手机号/.test(document.body.innerText), open: ev.filter(e => e[0] === 'report_open').length };
      close();
      // 安全须知文案
      o.safetyTxt = document.documentElement.innerHTML.includes('屏蔽或举报，我们会在 24 小时内') && !document.documentElement.innerHTML.includes('并发邮件举报');
      return o
    });
    out[f] = r;
    T(f + ' 球员卡有举报入口', r.cardBtn);
    T(f + ' 打开站内举报（不再打开邮件）', /举报 Tom/i.test(r.sheet) && /不会告诉对方是谁举报的/.test(r.sheet) && r.noMail, r.sheet);
    T(f + ' 原因 5 个、顺序与数据库一致', JSON.stringify(r.reasons) === JSON.stringify(['pact_violation', 'harass', 'no_show', 'fake_profile', 'other']), r.reasons);
    T(f + ' 「其他」没写说明不提交', r.otherEmpty.n === 0 && r.otherEmpty.open, r.otherEmpty);
    T(f + ' 提交后记录完整', r.rec && r.rec.reporter_id === 'jason' && r.rec.target_type === 'user' && r.rec.target_id === 'tom' && r.rec.reason === 'harass' && r.rec.note === '球场上一直说难听的话' && r.rec.source === 'in_app' && r.rec.status === 'open' && r.rec.via === 'card', r.rec);
    T(f + ' 提交后关闭并提示', r.closed && /24 小时内处理/.test(r.toast1), [r.closed, r.toast1]);
    T(f + ' 事件：report_open + report_submit 各一次，不含说明内容', JSON.stringify(r.evCard) === JSON.stringify(['report_open{"target_type":"user","via":"card"}', 'report_submit{"target_type":"user","reason":"harass","has_note":true,"via":"card"}']), r.evCard);
    T(f + ' 未处理时重复举报：不再打开、不再记录', r.dup.n === 1 && !r.dup.open && /已经举报过/.test(r.dup.toast) && r.dup.submits === 0, r.dup);
    T(f + ' 处理后可以再举报', r.afterHandled && r.n2 === 2, [r.afterHandled, r.n2]);
    T(f + ' 私信里举报 = 举报对方', /举报 Han/i.test(r.dmSheet) && r.dmRec && r.dmRec.t === 'user' && r.dmRec.id === 'han' && r.dmRec.via === 'chat' && r.dmRec.ctx, [r.dmSheet, r.dmRec]);
    T(f + ' 球局聊天里举报 = 举报这局的聊天', /举报这局的聊天/.test(r.gSheet) && r.gRec && r.gRec.t === 'game' && r.gRec.id && r.gRec.via === 'chat', [r.gSheet, r.gRec]);
    T(f + ' 聊天举报事件', r.evChat.filter(x => x.startsWith('report_submit')).length === 2 && r.evChat.includes('report_submit{"target_type":"game","reason":"harass","has_note":false,"via":"chat"}'), r.evChat);
    T(f + ' 暂停中仍可举报', r.suspCan);
    T(f + ' 未登录：没有举报按钮，或点了先登录；不记打开', !r.guest.rep && (!r.guest.btn || r.guest.auth) && r.guest.open === 0, r.guest);
    T(f + ' 安全须知文案已更新', r.safetyTxt);
    T(f + ' 没有页面错误', errs.length === 0, errs);
    await ctx.close();
  }
  const strip = o => JSON.stringify({ r: o.reasons, e: o.evCard, c: o.evChat, d: o.dup.n });
  T('两端一致', strip(out.PWA) === strip(out.Web), [strip(out.PWA), strip(out.Web)]);
  console.log(`${pass} passed, ${fail} failed`); await b.close(); process.exit(fail ? 1 : 0);
})();
