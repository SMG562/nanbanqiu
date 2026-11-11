// 地区扩展 R4：后台城市页。超级管理员：6 个城市、检查清单、往前改状态要过清单（不够就拦下并说明）、要理由、记日志、可以退回；
// 两个城市开放后顶部出现城市筛选；导出名单 / 标记已通知；运营：城市操作置灰、点了拦下；只读：没有城市页；管理员页显示负责城市。
const { chromium } = require('playwright'); const path = require('path');
const FILE = path.join(process.env.NBQ_DIR || path.join(__dirname, '..', '..'), '南伴球_后台.html');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 500) : '')) };
(async () => { const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const open = async role => { const pg = await b.newPage({ viewport: { width: 1360, height: 900 } }); const errs = []; pg.on('pageerror', e => errs.push(e.message));
    await pg.goto('file://' + FILE); await pg.waitForTimeout(400); await pg.selectOption('#demoRole', role); await pg.click('.go'); await pg.waitForTimeout(300); await pg.evaluate(() => clearInterval(window._tk)); return { pg, errs } };
  const toast = pg => pg.evaluate(() => (document.getElementById('admToast') || {}).textContent || '');
  const reason = async (pg, txt) => { await pg.waitForSelector('#admR.show'); await pg.fill('#admRin', txt); await pg.click('[data-admrok]'); await pg.waitForTimeout(120) };
  const st = (pg, k) => pg.evaluate(k => CITY_ADM.find(c => c.key === k).status, k);
  // ---------- 超级管理员 ----------
  { const { pg, errs } = await open('owner');
    T('导航里有「城市」', await pg.evaluate(() => !!document.querySelector('#nav [data-pg="cities"]')));
    await pg.click('#nav [data-pg="cities"]'); await pg.waitForTimeout(150);
    const rows = await pg.evaluate(() => [...document.querySelectorAll('#page table')[0].querySelectorAll('tbody tr')].map(r => r.querySelector('td').textContent.replace(/\s+/g, '')));
    T('6 个城市，带网址', rows.join() === '墨尔本/melbourne,悉尼/sydney,布里斯班/brisbane,珀斯/perth,阿德莱德/adelaide,堪培拉/canberra', rows);
    T('只有一个城市开放：顶部没有城市筛选', await pg.evaluate(() => getComputedStyle(document.getElementById('citySel')).display === 'none'));
    await pg.click('[data-cypick="syd"]'); await pg.waitForTimeout(100);
    T('点城市名 → 检查清单换成这个城市', /悉尼/.test(await pg.evaluate(() => [...document.querySelectorAll('#page .card .ch')].find(x => /上线检查清单/.test(x.textContent)).textContent)));
    await pg.click('[data-adm="cyst"][data-city="syd"][data-to="prep"]'); T('改状态要先写理由', await pg.evaluate(() => !!document.querySelector('#admR.show')));
    await reason(pg, '开始准备悉尼');
    const a0 = await pg.evaluate(() => S.audit[0]); T('悉尼 → 筹备，日志记人和理由', await st(pg, 'syd') === 'prep' && a0[0] === 'Han' && a0[1] === 'city.manage' && /理由：开始准备悉尼/.test(a0[2]), a0);
    await pg.click('[data-adm="cyst"][data-city="syd"][data-to="beta"]'); await reason(pg, '准备试运行');
    T('区和球场不够 → 拦下并说明缺什么，状态不变', await st(pg, 'syd') === 'prep' && /还没准备好.*区数据已导入.*球场已收录/.test(await toast(pg)), await toast(pg));
    await pg.evaluate(() => { const c = CITY_ADM.find(c => c.key === 'syd'); c.sub = 312; c.ven = 85; render() });
    await pg.click('[data-adm="cyst"][data-city="syd"][data-to="beta"]'); await reason(pg, '导入完成，开始试运行');
    T('导入完成 → 试运行，记试运行开始日期', await st(pg, 'syd') === 'beta' && await pg.evaluate(() => !!CITY_ADM.find(c => c.key === 'syd').beta));
    const sel = await pg.evaluate(() => { const s = document.getElementById('citySel'); return { show: getComputedStyle(s).display !== 'none', opts: [...s.options].map(o => o.textContent).join() } });
    T('两个城市开放 → 顶部出现城市筛选（全部 / 墨尔本 / 悉尼）', sel.show && sel.opts === '全部城市,墨尔本,悉尼', sel);
    await pg.selectOption('#citySel', 'syd'); await pg.waitForTimeout(100);
    T('选悉尼：记住选择，说明演示数据只有墨尔本', await pg.evaluate(() => S.city) === 'syd' && /演示数据只有墨尔本/.test(await pg.evaluate(() => document.getElementById('page').textContent)));
    await pg.click('[data-adm="cyst"][data-city="syd"][data-to="on"]'); await reason(pg, '直接正式开放');
    T('正式开放前要社群链接和试运行满 14 天', await st(pg, 'syd') === 'beta' && /当地社群链接.*试运行满 14 天/.test(await toast(pg)), await toast(pg));
    await pg.click('[data-adm="cywl"][data-city="syd"]'); await reason(pg, '悉尼开放，发通知');
    T('导出名单：要理由、记日志', await pg.evaluate(() => S.audit[0][1] === 'city.waitlist' && /导出 37 个邮箱/.test(S.audit[0][2])));
    await pg.click('[data-adm="cywd"][data-city="syd"]'); await reason(pg, '邮件已经发出');
    T('标记已通知 → 待通知清零，按钮消失', await pg.evaluate(() => CITY_ADM.find(c => c.key === 'syd').wlp) === 0 && !(await pg.$('[data-adm="cywl"][data-city="syd"]')));
    T('还没开放的城市没有「导出名单」', !(await pg.$('[data-adm="cywl"][data-city="bne"]')));
    await pg.click('[data-adm="cyst"][data-city="syd"][data-to="prep"]'); await reason(pg, '发现问题先退回');
    T('可以退回；只剩一个城市开放 → 筛选收起、回到全部', await st(pg, 'syd') === 'prep' && await pg.evaluate(() => S.city === 'all' && getComputedStyle(document.getElementById('citySel')).display === 'none'));
    await pg.click('#nav [data-pg="admin"]'); await pg.waitForTimeout(100);
    T('管理员页：显示负责城市、权限表有城市两项', await pg.evaluate(() => /全部城市/.test(document.getElementById('page').textContent) && /城市上线状态和资料/.test(document.getElementById('page').textContent) && /开放时通知我」名单/.test(document.getElementById('page').textContent)));
    T('超级管理员：没有报错', !errs.length, errs.slice(0, 3));
    await pg.close() }
  // ---------- 运营 ----------
  { const { pg, errs } = await open('operator');
    await pg.evaluate(() => { S.page = 'cities'; render() }); await pg.waitForTimeout(150);
    T('运营：城市操作按钮置灰', await pg.evaluate(() => [...document.querySelectorAll('[data-adm="cyst"]')].every(b => b.classList.contains('noperm'))));
    await pg.click('[data-adm="cyst"][data-city="syd"]'); await pg.waitForTimeout(80);
    T('运营点了 → 拦下并说明要超级管理员，状态不变', /需要超级管理员/.test(await toast(pg)) && await st(pg, 'syd') === 'off' && !(await pg.evaluate(() => !!document.querySelector('#admR.show'))));
    T('运营：没有报错', !errs.length, errs.slice(0, 3)); await pg.close() }
  // ---------- 只读 ----------
  { const { pg, errs } = await open('viewer');
    T('只读：导航里没有城市页', await pg.evaluate(() => !document.querySelector('#nav [data-pg="cities"]')));
    T('只读：没有报错', !errs.length, errs.slice(0, 3)); await pg.close() }
  await b.close(); console.log(`${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
})();
