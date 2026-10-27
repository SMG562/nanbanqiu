// 第五批 5a-3：后台页面注入（XSS）。在被测文件的副本里把演示数据的昵称、球场名换成恶意字符串，后台搜索框也填恶意字符串，
// 跑每一页 × 子视图、用户 / 球场抽屉，检查页面里没有多出元素或属性、图片 onerror 没执行、没有报错。
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path'); const os = require('os');
const DIR = process.env.NBQ_DIR || path.join(__dirname, '..', '..');
// JS 源码里用的写法（单双引号都安全）
const PJ = String.raw`<i class=xssp></i><img src=x: class=xssp onerror=window.__X++>\x22 data-xss=\x221\x22 \x27 data-xss=\x271\x27`;
(async () => {
  let h = fs.readFileSync(path.join(DIR, '南伴球_后台.html'), 'utf8'), n = 0;
  // 昵称：两份名字表；球场：全名和简称（VENUES 第 2、3 列）
  h = h.replace(/const NAMES=\[([^\]]*)\]/, (m, a) => 'const NAMES=[' + a.replace(/'([^']*)'/g, (x, s) => (n++, `'${s}${PJ}'`)) + ']');
  h = h.replace(/const FN=\[([^\]]*)\]/, (m, a) => 'const FN=[' + a.replace(/'([^']*)'/g, (x, s) => (n++, `'${s}${PJ}'`)) + ']');
  h = h.replace(/(\["v\d+", )"([^"]*)", "([^"]*)"/g, (m, a, b, c) => (n++, `${a}"${b}${PJ}", "${c}${PJ}"`));
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nbq-xss-')), FILE = path.join(tmp, '南伴球_后台.html'); fs.writeFileSync(FILE, h);
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const pg = await br.newPage({ viewport: { width: 1360, height: 900 } }); const errs = []; pg.on('pageerror', e => errs.push(String(e.message)));
  await pg.addInitScript(() => { window.__X = 0 });
  await pg.goto('file://' + FILE); await pg.waitForTimeout(500);
  const r = await pg.evaluate(async () => {
    doLogin({ preventDefault() { } }); clearInterval(window._tk);
    const wait = ms => new Promise(r => setTimeout(r, ms)), out = [];
    const PAYLOAD = `<i class="xssp"></i><img src="x:" class="xssp" onerror="window.__X++">" data-xss="1" ' data-xss='1'`;
    const check = async (step, f) => { const x0 = window.__X; try { f() } catch (e) { out.push({ step, err: String(e).slice(0, 200) }); return } await wait(30);
      const els = [...document.querySelectorAll('.xssp,[data-xss]')]; const x = window.__X - x0;
      if (els.length || x) out.push({ step, n: els.length, x, ex: els.slice(0, 2).map(e => (e.parentElement || e).outerHTML.slice(0, 240)) }) };
    const SUB = { events: ["S.tab2='events'", "S.tab2='metrics'", "S.tab2='flow'"], review: ["S.tab2='venues'", "S.tab2='reports'"],
      venues: ["S.vtab='venues';S.vf='all';S.vsub=null", "S.vtab='walls'", "S.vtab='venues';S.vf='pending'"], users: ["S.ust='all'", "S.ust='limited'", "S.ust='banned'"] };
    let pages = 0;
    for (const p of PAGES.filter(p => p[0] !== 'h').map(p => p[0])) for (const js of SUB[p] || ['0']) { pages++; await check(`页面 ${p} ${js}`, () => { S.page = p; S.range = 30; S.plat = 'all'; eval(js); render() }) }
    await check('用户页搜索框', () => { S.page = 'users'; S.q = PAYLOAD; render() }); S.q = '';
    await check('用户页搜索框（搜到人）', () => { S.page = 'users'; S.q = 'a'; render() }); S.q = '';
    for (const u of USERS.slice(0, 25)) await check('用户抽屉 ' + u.id, () => openUD(u.id));
    for (const v of VENUES.slice(0, 25)) await check('球场抽屉 ' + v[0], () => openVD(v[0]));
    const poisoned = USERS.filter(u => String(u.name).includes('xssp')).length;
    return { out, pages, poisoned, venues: VENUES.filter(v => String(v[1]).includes('xssp')).length };
  });
  await br.close(); fs.rmSync(tmp, { recursive: true, force: true });
  let bad = 0; const T = (n, ok, x) => { if (!ok) { bad++; console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 600) : '')) } else console.log('PASS ' + n) };
  T(`投毒生效（替换 ${n} 处；昵称带恶意字符串的球友 ${r.poisoned} 位、球场 ${r.venues} 个）`, n > 50 && r.poisoned > 50 && r.venues > 10, r);
  const uniq = new Map(); for (const o of r.out) { const k = (o.ex || [o.err]).join('|').replace(/u\d+|v\d+/g, '#').slice(0, 160); if (!uniq.has(k)) uniq.set(k, o) }
  T(`${r.pages} 个页面视图 + 搜索 + 50 个抽屉没有注入`, !r.out.length, [...uniq.values()].slice(0, 8));
  T('没有报错', !errs.length, [...new Set(errs)].slice(0, 5));
  console.log(bad ? 'FAIL admin-xss' : 'ALL PASS admin-xss'); process.exit(bad ? 1 : 0);
})();
