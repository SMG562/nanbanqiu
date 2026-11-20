// #460 第 1 步：左上「场边」可点回主页（任何层：详情 / 发布页 / 相册 / 筛选）；发布页有草稿先确认；键盘可聚焦。手机端（PWA）验。
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const DIR = process.env.NBQ_DIR || path.join(__dirname, '..', '..');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 400) : '')) };
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const pg = await ctx.newPage(), errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.route('https://nanbanqiu.test/**', r => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: fs.readFileSync(path.join(DIR, '南伴球_PWA.html')) }));
  await pg.route('https://nanbanqiu.test/vendor/**', r => r.fulfill({ status: 200, contentType: r.request().url().endsWith('.css') ? 'text/css' : 'application/javascript', body: '' }));
  await pg.route('https://cdnjs.cloudflare.com/**', r => r.abort()); await pg.route('https://basemaps.cartocdn.com/**', r => r.abort());
  const W = ms => pg.waitForTimeout(ms), E = (f, a) => pg.evaluate(f, a);
  const q = f => E(new Function(`const r=document.querySelector('#sbHost').shadowRoot;return (${f})(r)`));
  const tapBox = async () => { const bb = await q(`r=>{const e=r.querySelector('.bar .box').getBoundingClientRect();return {x:e.left,y:e.top,w:e.width,h:e.height}}`); await pg.touchscreen.tap(bb.x + bb.w * .5, bb.y + bb.h / 2); await W(900) };
  const cls = () => q(`r=>{const c=r.querySelector('.dev').classList;return ['sheeting','composing','inalbum','incourt','inwall'].filter(k=>c.contains(k))}`);
  let dialogs = [], accept = false; pg.on('dialog', d => { dialogs.push(d.message()); accept ? d.accept() : d.dismiss() });
  await pg.goto('https://nanbanqiu.test/'); await W(900);
  await E(() => { LOC.asked = true; closeSheet(); setWho('jason', true) }); await W(300);
  await pg.click('#tabbar [data-tab="side"]'); await W(900);

  // 主页标题：可聚焦的按钮
  const h = await q(`r=>{const e=r.querySelector('.hd h3[data-gohome]');return e?{role:e.getAttribute('role'),tab:e.tabIndex}:null}`);
  T('主页「场边」标题是可聚焦按钮', h && h.role === 'button' && h.tab === 0, h);

  // 详情层：点左上「场边」回主页
  const opened = await q(`r=>{const c=r.querySelector('[data-ln]');if(!c)return false;c.click();return true}`); await W(800);
  T('点开一条详情', opened && (await cls()).includes('sheeting'), await cls());
  T('详情层有「场边」入口', await q(`r=>!!r.querySelector('.sheet>.bkh[data-gohome]')`));
  await q(`r=>{r.querySelector('.sheet>.bkh').click()}`); await W(700);
  T('详情 → 点「场边」→ 回主页（没有任何层）', (await cls()).length === 0, await cls());

  // 相册层
  await E(() => SBV.api.album()); await W(700);
  T('相册层打开', (await cls()).includes('inalbum'));
  await q(`r=>{r.querySelector('.album [data-gohome]').click()}`); await W(600);
  T('相册 → 点「场边」→ 回主页', (await cls()).length === 0, await cls());

  // 筛选：点卡片上的球场标签 → 出现筛选；点主页「场边」清掉
  const fil = await q(`r=>{const c=r.querySelector('[data-court]');if(!c)return false;c.click();return true}`); await W(500);
  const f1 = await E(() => !!SBV.f);
  if (fil) { T('筛选已生效', f1); await q(`r=>{r.querySelector('.hd h3[data-gohome]').click()}`); await W(500); T('筛选 → 点「场边」→ 筛选清掉', !(await E(() => SBV.f)), await E(() => SBV.f)) }

  // 发布页：有草稿先确认（取消 = 留在发布页，确认 = 回主页）
  await tapBox();
  T('发布页打开', (await cls()).includes('composing'), await cls());
  await E(() => { SBV.cmp.text = '写了一半的话' }); await W(100);
  dialogs = []; accept = false; await q(`r=>{r.querySelector('.compose [data-gohome]').click()}`); await W(500);
  T('有草稿：弹确认，选取消 → 仍在发布页，草稿还在', dialogs.length === 1 && (await cls()).includes('composing') && await E(() => SBV.cmp && SBV.cmp.text === '写了一半的话'), { dialogs, c: await cls() });
  accept = true; await q(`r=>{r.querySelector('.compose [data-gohome]').click()}`); await W(700);
  T('有草稿：确认 → 回主页', (await cls()).length === 0 && dialogs.length === 2, { dialogs, c: await cls() });
  // 没草稿：不弹确认直接回
  await tapBox(); dialogs = [];
  await q(`r=>{r.querySelector('.compose [data-gohome]').click()}`); await W(700);
  T('没草稿：不弹确认，直接回主页', dialogs.length === 0 && (await cls()).length === 0, { dialogs, c: await cls() });

  // 真实模式只选了照片（在 C.ups、没写字）：也算草稿，要确认；确认后走 phDrop 清理
  await tapBox(); dialogs = []; accept = false;
  await E(() => { SBV.cmp.text = ''; SBV.cmp.ups = SBV.cmp.ups || []; SBV.cmp.ups.push({ id: 'x1', url: 'blob:fake' }) }); await W(100);
  await q(`r=>{r.querySelector('.compose [data-gohome]').click()}`); await W(500);
  T('只有照片（ups）：也弹确认，取消仍留在发布页', dialogs.length === 1 && (await cls()).includes('composing'), { dialogs, c: await cls() });
  accept = true; await q(`r=>{r.querySelector('.compose [data-gohome]').click()}`); await W(700);
  T('只有照片（ups）：确认 → 回主页', (await cls()).length === 0 && dialogs.length === 2, { dialogs, c: await cls() });

  // 键盘：Tab 聚焦标题，Enter 触发
  await q(`r=>{r.querySelector('[data-ln]').click()}`); await W(700);
  await q(`r=>{r.querySelector('.hd h3[data-gohome]').focus()}`);
  await pg.keyboard.press('Enter'); await W(600);
  T('键盘 Enter 在标题上 → 回主页', (await cls()).length === 0, await cls());
  T('无脚本错误', errs.length === 0, errs);
  await b.close(); console.log(`side_home: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
})();
