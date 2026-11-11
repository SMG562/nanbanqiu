// 键盘弹出时，每个弹层里的每个输入框都必须「看得见、点得到」（11-05 约 TA 表单连着出了三次这类问题）。
// 模拟：手机窄矮视口 + 外壳加 .kb（和 0285 视口守卫弹键盘时一样）→ 逐个聚焦输入框 → 像 iOS 那样滚到可见 → 断言：
//   ① 没有被折起 / 隐藏（display:none）② 焦点还在（没被重画弄丢）③ 在可见区内 ④ 它所在的位置最上层就是它自己（没被浮层盖住）。
// 新增弹层表单：把打开它的办法加到 FLOWS，就会自动被检查。
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const DIR = process.env.NBQ_DIR || path.join(__dirname, '..', '..');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 400) : '')) };
const FLOWS = [
  ['约 TA 表单', `newInvite('han')`],
  ['约 TA · 其他场地（搜索 / 自己填）', `newInvite('han'); document.querySelector('[data-iv="more"]').click()`],
  ['发布球局', `openCreate()`],
  ['发布球局 · 其他场地', `openCreate(); setTimeout(()=>{const b=document.querySelector('[data-ng="more"]'); b&&b.click()},50)`],
  ['申请加入', `openApply(GAMES.find(g=>g.host_id!==ME.id&&g.status!=='cancelled').id)`],
  ['举报', `repOpen('user','han','card')`],
  ['登录', `openAuth(null)`],
  ['新用户资料', `openNewProfile()`],
  ['位置 / 区域搜索', `openSuburbPicker()`],
  ['邮件提醒设置', `emSettings()`],
  ['我的球拍 · 其他（拍子名称）', `RK.i=0;RK.mode='add';RK.brand='Wilson';RK.step='other';rkDraw()`],
  ['婉拒申请（说一句）', `SOFT_OPEN(softNoHTML(GAMES.find(g=>g.host_id===ME.id)?GAMES.find(g=>g.host_id===ME.id).id:GAMES[0].id,'han'))`],
];
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 600 }, hasTouch: true, isMobile: true });
  const pg = await ctx.newPage(), errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.route('https://nanbanqiu.test/**', r => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: fs.readFileSync(path.join(DIR, '南伴球_PWA.html')) }));
  await pg.route('https://cdnjs.cloudflare.com/**', r => r.abort()); await pg.route('https://tile.openstreetmap.org/**', r => r.abort());
  await pg.goto('https://nanbanqiu.test/'); await pg.waitForTimeout(700);
  await pg.evaluate(() => { setWho('jason', true) }); await pg.waitForTimeout(500);
  let total = 0;
  for (const [name, js] of FLOWS) {
    await pg.setViewportSize({ width: 390, height: 600 }); await pg.evaluate(() => { const d = document.querySelector('.device'); d && d.classList.remove('kb'); try { closeSheet() } catch (_) { } });
    await pg.waitForTimeout(250);
    const ok = await pg.evaluate(j => { try { (0, eval)(j); return true } catch (e) { return String(e) } }, js); await pg.waitForTimeout(500);
    if (ok !== true) { T(`${name}：能打开`, false, ok); continue }
    await pg.setViewportSize({ width: 390, height: 330 }); await pg.waitForTimeout(150);
    const n = await pg.evaluate(() => [...document.querySelectorAll('#sheet input, #sheet textarea')].filter(e => !/^(hidden|checkbox|radio|range|file)$/.test(e.type)).length);
    T(`${name}：弹层里有输入框（找不到就是打开方式失效）`, n > 0, n);
    for (let i = 0; i < n; i++) {
      const r = await pg.evaluate(async idx => {
        const el = [...document.querySelectorAll('#sheet input, #sheet textarea')].filter(e => !/^(hidden|checkbox|radio|range|file)$/.test(e.type))[idx]; if (!el) return { gone: true, idx, c: document.querySelectorAll('#sheet input').length };
        const label = el.id || el.placeholder || el.name || ('#' + i);
        el.focus(); document.querySelector('.device').classList.add('kb');   // 先点输入框、键盘随后才弹出（0285 视口守卫晚 60~350ms 才加 .kb）
        await new Promise(r => setTimeout(r, 250)); const el2 = document.getElementById(el.id) || el;
        el2.scrollIntoView({ block: 'center' }); await new Promise(r => setTimeout(r, 80));
        const rc = el2.getBoundingClientRect(), vh = innerHeight, cs = getComputedStyle(el2), top = document.elementFromPoint(rc.left + rc.width / 2, rc.top + rc.height / 2);
        const focused = document.activeElement === el2;
        document.querySelector('.device').classList.remove('kb'); try { document.activeElement.blur() } catch (_) { }
        return { label, shown: cs.display !== 'none' && rc.height > 0, focused, inView: rc.top >= 0 && rc.bottom <= vh + 1, onTop: !!top && (top === el2 || el2.contains(top) || top.contains(el2) && top.tagName === 'LABEL') } }, i);
      total++; T(`${name} · ${r.label}：键盘弹出时看得见、点得到`, !r.gone && r.shown && r.focused && r.inView && r.onTop, r);
    }
  }
  // 同屏重画保草稿：新用户资料里先打「姓氏首字母」，再点 UTR 按钮（整张重画），字还在；表单故意清空 / 改值的不被盖回去
  await pg.setViewportSize({ width: 390, height: 600 }); await pg.evaluate(() => { document.querySelector('.device').classList.remove('kb'); closeSheet() }); await pg.waitForTimeout(250);
  await pg.evaluate(() => openNewProfile()); await pg.waitForTimeout(500);
  await pg.fill('#npLast', 'W'); await pg.fill('#npName', 'Tom'); await pg.evaluate(() => document.querySelector('[data-nlv]').click()); await pg.waitForTimeout(300);
  const dr = await pg.evaluate(() => ({ last: document.getElementById('npLast').value, name: document.getElementById('npName').value }));
  T('同屏重画（点 UTR 按钮）：已打的「姓氏首字母」和「昵称」还在', dr.last === 'W' && dr.name === 'Tom', dr);
  const dr2 = await pg.evaluate(() => { openSheet('<div class="x1"><b>草稿测试</b><input id="dd" data-keep value="abc"></div>'); const i = document.getElementById('dd'); i.value = 'abcdef'; openSheet('<div class="x1"><b>草稿测试</b><input id="dd" data-keep value="abc"></div>'); const keep = document.getElementById('dd').value; i.value = 'zzz'; openSheet('<div class="x1"><b>草稿测试</b><input id="dd" data-keep value=""></div>'); const cleared = document.getElementById('dd').value; openSheet('<div class="x1"><b>草稿测试</b><input id="de" value=""></div>'); document.getElementById('de').value='发出去了'; openSheet('<div class="x1"><b>草稿测试</b><input id="de" value=""></div>'); return { keep, cleared, plain: document.getElementById('de').value } });
  T('同屏重画：写了 data-keep 且没改默认值 → 保留；故意清空 → 不盖回；没写 data-keep（如聊天发送后清空）→ 一律不恢复', dr2.keep === 'abcdef' && dr2.cleared === '' && dr2.plain === '', dr2);
  T('检查到的输入框数量合理（防止检查失效）', total >= 14, total);
  T('无脚本错误', errs.length === 0, errs); await b.close();
  console.log(`input_visible: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
})();
