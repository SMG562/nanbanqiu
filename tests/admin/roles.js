// 第五批 5c：后台三种身份。超级管理员 / 运营 / 只读各登录一次：不能做的按钮置灰、点了拦下并说明要谁；要理由的先填理由（少于 4 个字不行）；
// 操作日志记对人和理由；只读只剩统计页，页面上看不到任何昵称；运营看不了完整手机号、封不了号；后台只能在举报里看被举报的对话。
const { chromium } = require('playwright'); const path = require('path');
const FILE = path.join(process.env.NBQ_DIR || path.join(__dirname, '..', '..'), '南伴球_后台.html');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 500) : '')) };
(async () => { const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const open = async role => { const pg = await b.newPage({ viewport: { width: 1360, height: 900 } }); const errs = []; pg.on('pageerror', e => errs.push(e.message));
    await pg.goto('file://' + FILE); await pg.waitForTimeout(400); await pg.selectOption('#demoRole', role); await pg.click('.go'); await pg.waitForTimeout(300); await pg.evaluate(() => clearInterval(window._tk)); return { pg, errs } };
  const toast = pg => pg.evaluate(() => (document.getElementById('admToast') || {}).textContent || '');
  for (const role of ['owner', 'operator']) {
    const { pg, errs } = await open(role), who = role === 'owner' ? 'Han' : 'Amy';
    T(`${role}：侧栏显示身份`, await pg.evaluate(() => document.querySelector('.side .me small').textContent) === (role === 'owner' ? '超级管理员' : '运营'));
    await pg.evaluate(() => { S.page = 'users'; render(); openUD(USERS[3].id) }); await pg.waitForTimeout(120);
    const dis = await pg.evaluate(() => ['[data-adm="phone"]', '[data-udst="banned"]', '[data-udst="suspended"]', '[data-udop="name"]'].map(s => document.querySelector(s).classList.contains('noperm')));
    T(`${role}：置灰的按钮（看手机号、封禁只有超级管理员）`, JSON.stringify(dis) === JSON.stringify(role === 'owner' ? [false, false, false, false] : [true, true, false, false]), dis);
    await pg.click('[data-adm="phone"]'); await pg.waitForTimeout(100);
    if (role === 'operator') T('运营点「查看完整手机号」→ 拦下并说明要超级管理员', /需要超级管理员/.test(await toast(pg)) && !(await pg.evaluate(() => !!document.querySelector('#admR.show'))));
    else {
      await pg.fill('#admRin', '短'); await pg.click('[data-admrok]'); T('理由少于 4 个字不行', /至少 4 个字/.test(await pg.evaluate(() => document.getElementById('admRe').textContent)));
      await pg.fill('#admRin', '警方依法调取'); await pg.click('[data-admrok]'); await pg.waitForTimeout(80);
      const a0 = await pg.evaluate(() => S.audit[0]); T('超级管理员看手机号：显示号码，日志记人和理由', a0[0] === 'Han' && a0[1] === 'phone.reveal' && /理由：警方依法调取/.test(a0[2]) && await pg.evaluate(() => /\+61 4/.test(document.querySelector('.ud-id').textContent)), a0);
    }
    await pg.evaluate(() => openUD(USERS[3].id)); await pg.click('[data-udst="suspended"]'); await pg.click('[data-udgo]'); await pg.waitForTimeout(80);
    T(`${role}：改状态不写理由 → 拦下`, await pg.evaluate(() => USERS[3].st) === 'active' && /至少 4 个字/.test(await toast(pg)));
    await pg.fill('#udNote', '多次骚扰球友'); await pg.click('[data-udgo]'); await pg.waitForTimeout(120);
    const a1 = await pg.evaluate(() => [USERS[3].st, S.audit[0][0], S.audit[0][1]]); T(`${role}：写了理由 → 暂停，日志记 ${who}`, a1[0] === 'suspended' && a1[1] === who && a1[2] === 'user.suspended', a1);
    await pg.evaluate(() => openUD(USERS[3].id)); await pg.click('[data-udop="name"]'); await pg.waitForTimeout(60);
    T(`${role}：重置昵称先填理由`, await pg.evaluate(() => !!document.querySelector('#admR.show')));
    await pg.fill('#admRin', '昵称含广告'); await pg.click('[data-admrok]'); await pg.waitForTimeout(80);
    const a2 = await pg.evaluate(() => S.audit[0]); T(`${role}：重置昵称后日志带理由`, a2[0] === who && /理由：昵称含广告/.test(a2[2]), a2);
    await pg.evaluate(() => { closeUD(); S.page = 'review'; S.tab2 = 'reports'; render() }); await pg.waitForTimeout(80);
    await pg.click('[data-adm="msgs"]'); await pg.fill('#admRin', '核实骚扰举报'); await pg.click('[data-admrok]'); await pg.waitForTimeout(80);
    T(`${role}：在举报里看被举报的对话（填理由、留痕）`, await pg.evaluate(() => /被举报的对话/.test(document.getElementById('admR').textContent) && S.audit[0][1] === 'message.read'));
    await pg.evaluate(() => { document.getElementById('admR').classList.remove('show'); S.page = 'users'; render() }); await pg.waitForTimeout(60);
    const ex = await pg.evaluate(() => document.querySelector('[onclick="exportCSV()"]').classList.contains('noperm'));
    T(`${role}：导出球友名单（含编号昵称）只有超级管理员`, ex === (role !== 'owner'), ex);
    await pg.evaluate(() => { S.page = 'admin'; render() }); await pg.waitForTimeout(60);
    T(`${role}：管理员页有权限表、操作日志`, await pg.evaluate(() => /谁能做什么/.test(document.getElementById('page').textContent) && /操作日志/.test(document.getElementById('page').textContent)));
    T(`${role}：没有报错`, !errs.length, errs); await pg.close();
  }
  { const { pg, errs } = await open('viewer');
    const nav = await pg.evaluate(() => [...document.querySelectorAll('#nav [data-pg]')].map(b => b.dataset.pg));
    T('只读：没有球友、待审核、风险用户、管理员页', !['users', 'review', 'safety', 'admin'].some(p => nav.includes(p)) && nav.includes('overview'), nav);
    const leak = await pg.evaluate(() => { const names = [...new Set(USERS.map(u => u.name))].filter(n => n.length > 3); const o = {}; for (const p of [...document.querySelectorAll('#nav [data-pg]')].map(b => b.dataset.pg)) { S.page = p; render(); const t = document.getElementById('page').innerText; const n = names.filter(x => t.includes(x)).length; if (n) o[p] = n } return o });
    T('只读：所有统计页上看不到任何昵称', !Object.keys(leak).length, leak);
    await pg.evaluate(() => { S.page = 'users'; render() }); T('只读：直接切到球友页也会回到概览', await pg.evaluate(() => S.page) === 'overview');
    T('只读：没有报错', !errs.length, errs); await pg.close() }
  await b.close(); console.log(`${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0) })();
