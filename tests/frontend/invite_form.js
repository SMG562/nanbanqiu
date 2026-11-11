// 约 TA 打球表单（11-05 你报的「点输入框 / 点选项页面滚动有点乱」）：
//  · 表单里每点一下都整张重画，滚动条不能被打回顶部；
//  · 「发送邀约」固定在弹层底部，表单滚到哪都看得到；
//  · 「说一句」有快捷短语（点一下填入）和回车发送。
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const DIR = process.env.NBQ_DIR || path.join(__dirname, '..', '..');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 400) : '')) };
(async () => {
  for (const [name, file] of [['pwa', '南伴球_PWA.html'], ['web', '南伴球_Web.html']]) {
    const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
    const ctx = await b.newContext({ viewport: name === 'pwa' ? { width: 390, height: 560 } : { width: 1280, height: 560 }, hasTouch: name === 'pwa', isMobile: name === 'pwa' });
    const pg = await ctx.newPage(), errs = []; pg.on('pageerror', e => errs.push(e.message));
    await pg.route('https://nanbanqiu.test/**', r => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: fs.readFileSync(path.join(DIR, file)) }));
    await pg.route('https://cdnjs.cloudflare.com/**', r => r.abort()); await pg.route('https://basemaps.cartocdn.com/**', r => r.abort());
    await pg.goto('https://nanbanqiu.test/'); await pg.waitForTimeout(700);
    await pg.evaluate(() => document.querySelector('[data-demo="invsend"]').click()); await pg.waitForTimeout(900);
    const st = () => pg.evaluate(() => { const s = ivScroller(); return s ? { top: s.scrollTop, over: s.scrollHeight - s.clientHeight } : null });
    let s = await st(); T(`${name} 表单可滚动（测试前提）`, !!s && s.over > 60, s);
    // 球员卡规则（11-05）：已有一场未开始的球局，仍然能约 TA；球局只是按钮下面一行小字；时间撞了只提醒不拦
    const rule = await pg.evaluate(() => { const to = IVF.to, id = 'tg_rule'; GAMES.push({ id, status: 'open', starts_at: dayAt(1, '09:00').toISOString(), duration_min: 90, venue_id: Object.keys(VEN)[0], host_id: ME.id });
      PARTS.push({ game_id: id, user_id: ME.id, status: 'approved' }, { game_id: id, user_id: to, status: 'approved' });
      const html = invBtnHTML(to), f = IVF; const keep = [f.o, f.t, f.e]; f.o = 1; f.t = '09:00'; f.e = '10:30'; const clash = ivClash(f); f.o = 1; f.t = '16:00'; f.e = '17:30'; const free = ivClash(f); [f.o, f.t, f.e] = keep;
      GAMES.splice(GAMES.findIndex(g => g.id === id), 1); PARTS.splice(PARTS.length - 2, 2); return { hasNew: /data-iv="new"/.test(html), hasGame: /data-iv="gameOf"/.test(html), clash, free } });
    T(`${name} 已有球局时球员卡仍有「约 TA」按钮，并另带一行「查看球局」`, rule.hasNew && rule.hasGame, rule);
    T(`${name} 选的时间和你们已有球局撞了：给提醒；不撞：没有提醒`, /已经有一场/.test(rule.clash) && rule.free === '', rule);
    await pg.evaluate(() => { ivScroller().scrollTop = 150 }); const t0 = (await st()).top;
    for (const [sel, label] of [['[data-iv="type"][data-v="rally"]', '玩法'], ['[data-iv="dur"][data-v="120"]', '打多久'], ['[data-iv="per"][data-v="3"]', '时段']]) {
      await pg.evaluate(q => document.querySelector(q).click(), sel); await pg.waitForTimeout(150);
      const n = await st(); T(`${name} 点「${label}」后滚动位置不跳回顶部`, !!n && Math.abs(n.top - t0) <= 2, { before: t0, after: n && n.top });
    }
    await pg.evaluate(() => document.querySelector('[data-iv="qp"][data-v="0"]').click());
    const v = await pg.evaluate(() => ({ val: document.getElementById('ivNote').value, f: IVF.note, q: document.querySelector('[data-iv="qp"]').textContent }));
    T(`${name} 快捷短语点一下填入「说一句」`, v.val && v.val === v.q && v.f === v.q, v);
    // 键盘弹出（手机端外壳 .kb）：折起选项，只剩摘要 + 说一句 + 发送，不需要滚动、输入框和发送按钮同时在可见区
    if (name === 'pwa') {
      await pg.setViewportSize({ width: 390, height: 330 }); await pg.evaluate(() => document.querySelector('.device').classList.add('kb')); await pg.waitForTimeout(250);
      const k = await pg.evaluate(() => { const s = ivScroller(), n = document.getElementById('ivNote').getBoundingClientRect(), g = document.querySelector('.iv-go').getBoundingClientRect(), vh = innerHeight;
        return { hidden: [...document.querySelectorAll('.iv .kbhide')].every(e => getComputedStyle(e).display === 'none'), sum: getComputedStyle(document.querySelector('.iv-kbsum')).display !== 'none', over: s ? s.scrollHeight - s.clientHeight : 0, noteIn: n.top >= 0 && n.bottom <= vh, goIn: g.top >= 0 && g.bottom <= vh } });
      T(`${name} 键盘弹出时：选项折起、摘要出现、不用滚动，输入框和「发送邀约」同时看得到`, k.hidden && k.sum && k.over <= 2 && k.noteIn && k.goIn, k);
      // 点完「完成」键盘收起（.kb 去掉）：仍然是精简视图，位置不跳；点「修改」才展开
      await pg.focus('#ivNote'); await pg.waitForTimeout(100);
      await pg.evaluate(() => document.querySelector('.device').classList.remove('kb')); await pg.waitForTimeout(250);
      const k2 = await pg.evaluate(() => ({ compact: IVF.compact === true && document.querySelector('.iv').classList.contains('compact'), hidden: [...document.querySelectorAll('.iv .kbhide')].every(e => getComputedStyle(e).display === 'none'), sum: getComputedStyle(document.querySelector('.iv-kbsum')).display !== 'none', note: !!document.getElementById('ivNote') }));
      T(`${name} 键盘收起后仍是精简视图（不展开、不跳位置）`, k2.compact && k2.hidden && k2.sum && k2.note, k2);
      await pg.evaluate(() => document.querySelector('[data-iv="expand"]').click()); await pg.waitForTimeout(250);
      T(`${name} 点「修改」展开全部选项`, await pg.evaluate(() => IVF.compact === false && [...document.querySelectorAll('.iv .kbhide')].every(e => getComputedStyle(e).display !== 'none')));
      await pg.setViewportSize({ width: 390, height: 560 }); await pg.waitForTimeout(200);
    }
    // 回车：iOS 点键盘右下角确认拼音时，compositionend 先到、随后才来一个 isComposing=false 的 Enter —— 不能把邀约发出去
    await pg.evaluate(() => { window.__n0 = INVITES.length }); await pg.focus('#ivNote');
    await pg.evaluate(() => { const n = document.getElementById('ivNote'); n.dispatchEvent(new CompositionEvent('compositionend', { data: 'nihao', bubbles: true })); n.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, isComposing: false, bubbles: true, cancelable: true })) }); await pg.waitForTimeout(100);
    T(`${name} 确认拼音（compositionend 后紧跟的回车）：不发送、键盘不收`, await pg.evaluate(() => INVITES.length === window.__n0 && document.activeElement && document.activeElement.id === 'ivNote'));
    T(`${name} 键盘右下角显示「完成」（有后果的操作回车不提交）`, (await pg.getAttribute('#ivNote', 'enterkeyhint')) === 'done');
    await pg.waitForTimeout(450); await pg.keyboard.press('Enter'); await pg.waitForTimeout(150);
    T(`${name} 正常回车：只收键盘，不发送`, await pg.evaluate(() => INVITES.length === window.__n0 && document.activeElement.id !== 'ivNote'));
    await pg.evaluate(() => document.querySelector('.iv-go').click()); await pg.waitForTimeout(500);
    const inv = await pg.evaluate(() => INVITES[0] && { note: INVITES[0].note, status: INVITES[0].status, t: INVITES[0].game_type });
    T(`${name} 点「发送邀约」按钮才发送（带上这句话和玩法）`, !!inv && inv.status === 'pending' && inv.note === v.q && inv.t === 'rally', inv);
    // 通用规则：没有 data-enter 的输入框，键盘显示「完成」、回车只收键盘；弹层同屏重画保住滚动、换屏回到顶部
    const r = await pg.evaluate(async () => {
      const open = (title, n) => { const h = `<div class="tt-x"><b>${title}</b><input id="tti" class="iv-in">${'<p style="height:60px">x</p>'.repeat(n)}</div>`; if (typeof openSheet === 'function' && document.getElementById('sheet')) openSheet(h); else openModal(h) };
      const sc = () => { let e = document.querySelector('.tt-x'); while (e && e !== document.body) { if (e.scrollHeight > e.clientHeight + 5 && /(auto|scroll)/.test(getComputedStyle(e).overflowY)) return e; e = e.parentElement } return null };
      open('测试屏 A', 30); await new Promise(r => setTimeout(r, 400)); const s1 = sc(); if (!s1) return { err: 'no scroller' };
      s1.scrollTop = 300; const a = s1.scrollTop; open('测试屏 A', 30); const same = sc().scrollTop;
      open('测试屏 B', 30); const other = sc().scrollTop;
      const i = document.getElementById('tti'); i.focus(); const hint = i.getAttribute('enterkeyhint'); const ev = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }); i.dispatchEvent(ev);
      return { a, same, other, hint, blurred: document.activeElement !== i, prevented: ev.defaultPrevented } });
    T(`${name} 同一屏重画：滚动位置保住`, !r.err && r.a > 100 && Math.abs(r.same - r.a) <= 2, r);
    T(`${name} 换到另一屏：回到顶部`, !r.err && r.other === 0, r);
    T(`${name} 普通输入框：键盘显示「完成」，回车只收键盘`, r.hint === 'done' && r.blurred && r.prevented, r);
    T(`${name} 无脚本错误`, errs.length === 0, errs); await b.close();
  }
  console.log(`invite_form: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
})();
