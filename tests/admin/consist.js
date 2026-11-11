// A3 一致性断言
const { chromium } = require('playwright');
const fs = require('fs');
const FILE = process.argv[2] || require('path').join(process.env.NBQ_DIR || require('path').join(__dirname,'..','..'), '南伴球_后台.html');
const SPEC = require('path').join(__dirname, '..', 'spec', 'events_spec.md');
function parseSpec() {
  const rows = [];
  for (const l of fs.readFileSync(SPEC, 'utf8').split('\n')) {
    if (!l.startsWith('| ') || l.startsWith('| 事件')) continue;
    const c = l.trim().replace(/^\||\|$/g, '').split('|').map(x => x.trim());
    if (c.length !== 5 || /^-+$/.test(c[0])) continue;
    rows.push({ name: c[0], cat: c[1], src: c[2] === 'C' ? 'client' : 'server', desc: c[3], props: c[4] === '—' ? '' : c[4] });
  }
  return rows;
}
(async () => {
  const spec = parseSpec();
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const pg = await br.newPage({ viewport: { width: 1360, height: 900 } });
  const errs = []; pg.on('pageerror', e => errs.push(String(e)));
  await pg.goto('file://' + FILE);
  await pg.evaluate(() => { doLogin({ preventDefault() {} }); clearInterval(window._tk) });
  const res = await pg.evaluate((spec) => {
    const fails = [], passes = {}; const ok = (name, cond, msg) => { passes[name] = (passes[name] || 0) + 1; if (!cond) fails.push(name + ': ' + msg) };
    const num = t => { const x = +String(t).replace(/[^\d.]/g, ''); return /万/.test(t) ? x * 1e4 : x };
    const pctOf = t => +String(t).replace('%', '');
    const show = (p, r, pl, extra) => { S.page = p; S.range = r; S.plat = pl; if (extra) extra(); render(); return document.getElementById('page') };
    const RANGES_ = RANGES.map(r => r[0]), PLATS = ['all', 'pwa', 'web'];
    // ---- 1 去重 ≤ 总量；漏斗单调 ----
    for (const r of RANGES_) for (const pl of PLATS) {
      S.range = r; S.plat = pl; B1C = { k: '' }; const M = MM(), F = M.fun, tag = `r=${r} ${pl}`;
      ok('dedupe', M.applicants <= M.apps + 1e-9, `${tag} 申请人数 ${M.applicants} > 申请次数 ${M.apps}`);
      ok('dedupe', M.applicants <= M.au, `${tag} 申请人数 > 活跃 ${M.au}`);
      ok('dedupe', M.au <= M.dauSum + 1, `${tag} 区间活跃 ${M.au} > 每日相加 ${M.dauSum}`);
      ok('dedupe', M.au + 1 >= Math.max(...(r === 1 ? [T] : inRange()).map(x => x.dau * PFm('dau'))), `${tag} 区间活跃 < 单日最大`);
      ok('dedupe', F.L <= M.regAll + 1, `${tag} 登录的人 ${F.L} > 截至期末的注册 ${M.regAll}`);   // 在某台设备上登录的人可能是在另一台设备上注册的，所以和全部注册比
      ok('dedupe', F.V === M.au, `${tag} 访问的人 ≠ 区间活跃`);
      const st = [F.V, F.L, F.D, F.A, F.AC, F.PL];
      ok('funnel', st.every((v, i) => !i || v <= st[i - 1] + 1e-9) && st.every(v => v >= 0), `${tag} 漏斗不单调 ${st.map(Math.round)}`);
      ok('newreg<=total', M.nu <= TU() + 1e-6 && M.reg <= TU(), `${tag} 新注册 ${M.nu} / 期末注册 ${M.reg} > 总注册 ${TU()}`);
      ok('fill', M.full <= M.st + 1e-9 && (M.rate == null || (M.rate >= 0 && M.rate <= 1)), `${tag} 人齐 > 已开打`);
      // DOM 里的漏斗
      const el = show('overview', r, pl); const fun = el.querySelector('[data-fun]').dataset.fun.split(',').map(Number);
      ok('funnel', fun.every((v, i) => !i || v <= fun[i - 1]), `${tag} DOM 漏斗 ${fun}`);
      // 页面清单：人数 ≤ 人次
      screenRows().forEach(x => ok('dedupe', x.u <= x.v + 1e-9 && x.uP <= x.pwa + 1e-9 && x.uW <= x.web + 1e-9, `${tag} 页面 ${x.k} 人数 > 人次`));
    }
    ok('newreg<=total', b1allPlat(() => TU()) === DB.users.length && b1allPlat(() => TU()) === B3.ROLL.reduce((a, r) => a + r.all.nu, 0) && B3.ROLL.reduce((a, r) => a + r.mobile.nu + r.desktop.nu, 0) === DB.users.length, `总注册 ${b1allPlat(() => TU())} ≠ 数据层球友数 ${DB.users.length}`);
    // 球友页：总注册 ≥ 任意范围新注册；月活 ≥ 周活
    for (const pl of PLATS) {
      const el = show('users', 7, pl), k = [...el.querySelectorAll('.kpi')].map(x => [((e=>{const c=e.cloneNode(true);c.querySelectorAll('.hp').forEach(x=>x.remove());return c.textContent})(x.querySelector('.l'))), x.querySelector('.v').textContent]);
      const tot = num(k.find(x => x[0].includes('总注册'))[1]), mau = num(k.find(x => x[0].includes('月活'))[1]), wau = num(k.find(x => x[0].includes('周活'))[1]);
      ok('newreg<=total', mau >= wau, `${pl} 月活 < 周活`);
      S.range = LAUNCH; B1C = { k: '' }; ok('newreg<=total', Math.round(MM().nu) <= tot, `${pl} 全部新注册 ${MM().nu} > 总注册 ${tot}`);
      ok('newreg<=total', el.textContent.includes(`全部 ${fmt(DB.users.length)} 位`) && USERS.length === DB.users.length, '球友名单不是数据层的全部球友');
    }
    // ---- 2 环比：上一周期不完整时不显示 ----
    for (const r of RANGES_) for (const pl of PLATS) {
      const el = show('overview', r, pl), d = [...el.querySelectorAll('.kpi .d')].map(x => x.textContent).join('|'); S.range = r; B1C = { k: '' };
      const prevOK = MM().prevOK;
      if (!prevOK) ok('chg', !/较上一周期|较昨日/.test(d), `r=${r} ${pl} 上一周期不全却显示环比：${d}`);
      if (r === 7) ok('chg', /较上一周期/.test(d), `r=7 应显示环比`);
      const rg = show('regions', r, pl);
      if (!prevOK) ok('chg', ![...rg.querySelectorAll('table[data-regions] tbody tr')].some(tr => /▲|▼/.test(tr.lastElementChild.previousElementSibling.textContent)), `r=${r} 区域仍显示环比`);
    }
    // ---- 3 同一指标跨页一致 ----
    for (const r of RANGES_) for (const pl of PLATS) {
      const tag = `r=${r} ${pl}`, vals = {};
      for (const p of ['overview', 'games', 'life', 'regions', 'venues']) { const el = show(p, r, pl); vals[p] = [...el.querySelectorAll('[data-fill]')].map(x => x.textContent.trim()) }
      const all = Object.values(vals).flat();
      ok('fill-same', all.length >= 5 && new Set(all).size === 1, `${tag} 开打时人齐不一致 ${JSON.stringify(vals)}`);
      // 标题统一
      const ov = show('overview', r, pl); ok('fill-same', [...ov.querySelectorAll('.kpi .l')].some(x => x.textContent.includes('开打时人齐')) && ![...document.querySelectorAll('#page .kpi .l')].some(x => /^成局率/.test(x.textContent.trim())), `${tag} 标题不是「开打时人齐」`);
      // 分享带来的注册：分享与拉新 / 访问与页面 / 新球友从哪来 / 球员卡页
      S.range = r; S.plat = pl; B1C = { k: '' }; const SH = b1share(), want = fmt(SH.regs);
      const kv = (el, lab) => { const k = [...el.querySelectorAll('.kpi')].find(x => ((e=>{const c=e.cloneNode(true);c.querySelectorAll('.hp').forEach(x=>x.remove());return c.textContent})(x.querySelector('.l'))).includes(lab)); return k && k.querySelector('.v').textContent };
      const gr = show('growth', r, pl), g1 = kv(gr, '分享带来注册');
      const bars = [...gr.querySelectorAll('.bar')].map(b => [b.querySelector('.n').textContent, num(b.querySelector('.v').textContent)]);
      const sb = (bars.find(b => b[0] === '球局分享链接') || [0, NaN])[1] + (bars.find(b => b[0] === '球员卡分享') || [0, NaN])[1];
      const per = (([...gr.querySelectorAll('.kpi')].find(x => x.textContent.includes('分享带来注册')) || { textContent: '' }).querySelector('.d') || { textContent: '' }).textContent.match(/被打开 ([\d.]+) 次/);
      const tr = show('traffic', r, pl), g2 = kv(tr, '分享带来注册');
      const cd = show('cards', r, pl), cdtxt = [...cd.querySelectorAll('.kpi')].find(x => x.textContent.includes('站外打开球员卡')).querySelector('.d').textContent;
      ok('share-same', g1 === want && g2 === want, `${tag} 分享带来注册 growth=${g1} traffic=${g2} want=${want}`);
      ok('share-same', Math.abs(sb - num(want)) <= 1, `${tag} 新球友从哪来 分享+球员卡=${sb} vs ${want}`);
      ok('share-same', cdtxt.includes(fmt(SH.card.regs)) && Math.abs(num(fmt(SH.card.regs)) - (bars.find(b => b[0] === '球员卡分享') || [0, NaN])[1]) <= 1, `${tag} 球员卡页注册 ${cdtxt} vs ${fmt(SH.card.regs)}`);
      ok('share-same', per && +per[1] === +(SH.shares ? SH.opens / SH.shares : 0).toFixed(1), `${tag} 每次分享被打开次数与分享表不一致`);
      const E = entryData(); ok('share-same', Math.abs(E.share - SH.opens) < 1e-6 || E.share === E.ses * .4, `${tag} 访问页分享打开 ${E.share} vs 分享表 ${SH.opens}`);
      // 区域 = 球场之和；单个球场不超过所在区
      const G = b1geo(), byR = {}; G.regions.forEach(x => byR[x.n] = x);
      G.venues.forEach(v => { const R = byR[v.v[3]]; ok('region-sum', R && v.games <= R.games + 1e-9 && v.full <= R.full + 1e-9, `${tag} 球场 ${v.v[2]} 不在区或超过所在区`) });
      G.regions.forEach(x => { const s = x.vl.reduce((a, v) => a + v.games, 0) + x.custom; ok('region-sum', Math.abs(s - x.games) < 1e-6, `${tag} 区 ${x.n} ≠ 球场之和`) });
      const tg = G.regions.reduce((a, x) => a + x.games, 0); ok('region-sum', Math.abs(tg - MM().games) < 1e-6, `${tag} 区合计 ${tg} ≠ 新球局 ${MM().games}`);
      const notInList = [...new Set(G.venues.map(v => v.v[3]))].filter(n => !SUBURBS.some(s => s[0] === n));
      ok('region-sum', notInList.every(n => byR[n]), `${tag} 不在 SUBURBS 的区没归入`);
      // 稳定：同一次渲染内、跨页面
      const a1 = JSON.stringify(regionRows().map(x => [x.n, x.games, x.chg])), a2 = JSON.stringify(regionRows().map(x => [x.n, x.games, x.chg]));
      show('overview', r, pl); B1C = { k: '' }; const a3 = JSON.stringify(regionRows().map(x => [x.n, x.games, x.chg]));
      ok('stable', a1 === a2 && a2 === a3, `${tag} regionRows 每次调用不同`);
      ok('stable', JSON.stringify(screenRows()) === JSON.stringify(screenRows()), `${tag} screenRows 不稳定`);
    }
    // 稀有度定义：三处一致（成长页 / 指标口径 / 前台展示门槛）
    const gw = show('grow', 30, 'all').textContent, md = METRIC_DEFS.find(m => m[0] === '徽章稀有度');
    ok('rarity', gw.includes('稀有度 = 拥有的人 ÷ 打过至少 1 场的人') && md && md[1].includes('打过至少 1 场'), '稀有度定义不一致');
    // 成长页：全部 = 累计
    const ga = show('grow', LAUNCH, 'all'); const gk = [...ga.querySelectorAll('.kpi')].map(k => [((e=>{const c=e.cloneNode(true);c.querySelectorAll('.hp').forEach(x=>x.remove());return c.textContent})(k.querySelector('.l'))), k.querySelector('.v').textContent, (k.querySelector('.d') || {}).textContent || '']);
    const k10 = gk.find(x => x[0].includes('达到 10 场')); ok('grow', k10[2].includes('累计 ' + k10[1]), `全部时本期≠累计 ${k10}`);
    // 等级：按 v3 门槛
    USERS.forEach(u => ok('level', u.lv === b1lv(u) && (u.played >= 20 || u.lv === 1) && (u.played >= 50 || u.lv <= 2), `${u.name} played=${u.played} lv=${u.lv}`));
    // 抽屉「主要使用」稳定
    const u0 = USERS[3]; openUD(u0.id); const t1 = document.querySelector('#ud .ud').textContent; closeUD(); openUD(u0.id); const t2 = document.querySelector('#ud .ud').textContent; closeUD();
    ok('stable', t1 === t2, '用户抽屉每次打开内容不同');
    // ---- 4 风险提醒与账号状态同步，角标立即更新 ----
    show('safety', 7, 'all');
    const badge = () => { const b = [...document.querySelectorAll('#nav button')].find(x => x.dataset.pg === 'safety'); const i = b.querySelector('i'); return i ? +i.textContent : 0 };
    const openN = () => RISK.filter(r => r.st === 'open').length;
    ok('risk-sync', badge() === openN(), `角标 ${badge()} ≠ 待处理 ${openN()}`);
    ok('risk-sync', RISK.every(r => { const u = USERS.find(x => x.id === r.uid); return !(['limited', 'suspended', 'banned', 'review'].includes(u.st) && ['open', 'watching'].includes(r.st)) }), '已受限的人仍在待处理');
    return { fails, passes, openBefore: openN() };
  }, spec);
  // 账号状态改变 → 角标立刻变
  const before = await pg.evaluate(() => { const r = RISK.find(x => x.st === 'open'); window._rk = r; openUD(r.uid); return RISK.filter(x => x.st === 'open').length });
  await pg.click('[data-udst="suspended"]'); await pg.fill('#udNote', '风险分高，先暂停核实'); await pg.click('[data-udgo]');   // 5c：改状态必须写理由 await pg.waitForTimeout(80);
  const after = await pg.evaluate(() => { const b = [...document.querySelectorAll('#nav button')].find(x => x.dataset.pg === 'safety'), i = b.querySelector('i'); return { badge: i ? +i.textContent : 0, open: RISK.filter(x => x.st === 'open').length, st: window._rk.st, rows: [...document.querySelectorAll('#page table tbody tr')].find(tr => tr.textContent.includes(window._rk.u))?.textContent || '' } });
  const f2 = [];
  if (!(after.open === before - 1 && after.badge === after.open && after.st === 'handled')) f2.push(`risk-sync: 处理后 open ${before}→${after.open} badge=${after.badge} st=${after.st}`);
  if (!/已处理/.test(after.rows)) f2.push('risk-sync: 风险表里该行没变成「已处理」');
  // ---- 4c 第三批：各页数字来自同一份数据，互相核对 ----
  const x3 = await pg.evaluate(() => { const out = []; const kv = el => Object.fromEntries([...el.querySelectorAll('.kpi')].map(k => [((e=>{const c=e.cloneNode(true);c.querySelectorAll('.hp').forEach(x=>x.remove());return c.textContent})(k.querySelector('.l'))).trim(), k.querySelector('.v').textContent.trim()]));
    for (const r of RANGES.map(x => x[0])) { const per = {};
      for (const pl of ['all', 'pwa', 'web']) { S.range = r; S.plat = pl; B1C = { k: '' }; const M = MM(), AP = b1apps(M), C = X3.ctx();
        S.page = 'overview'; render(); const ov = kv(document.getElementById('page')); S.page = 'games'; render(); const gm = kv(document.getElementById('page')); S.page = 'life'; render(); const lf = kv(document.getElementById('page'));
        const st = C.started.filter(g => g.status !== 'cancelled');
        per[pl] = { games: M.games, nu: M.nu, apps: M.apps, st: M.st, full: M.full };
        out.push({ r, pl, ovG: ov[Object.keys(ov).find(k => k.startsWith('新球局'))], gmG: gm['新球局'], lfG: lf['新球局'], fmtG: fmt(M.games), partsSum: AP.parts.reduce((s, p) => s + p[1], 0), apps: AP.apps, Mapps: M.apps,
          stX: st.length, fullX: st.filter(g => g.filled_at_start).length, cancelX: C.started.length - st.length, Mst: M.st, Mfull: M.full, Mcancel: M.cancel, createdX: C.created.length }) }
      out.push({ r, split: ['games', 'nu', 'apps', 'st', 'full'].map(k => [k, per.all[k], per.pwa[k] + per.web[k]]) }) }
    S.range = 7; S.plat = 'all'; B1C = { k: '' }; return out });
  x3.forEach(o => { if (o.split) { o.split.forEach(([k, a, b]) => { if (a !== b) f2.push(`x3: r=${o.r} ${k} 全部 ${a} ≠ 手机 + 电脑 ${b}`) }); return }
    const tag = `x3: r=${o.r} ${o.pl}`;
    if (!(o.ovG === o.fmtG && o.gmG === o.fmtG && o.lfG === o.fmtG)) f2.push(`${tag} 新球局 概览 ${o.ovG} / 球局 ${o.gmG} / 全流程 ${o.lfG} / 计算 ${o.fmtG} 不一致`);
    if (o.createdX !== +String(o.fmtG).replace(/,/g, '')) f2.push(`${tag} 页面里的球局清单 ${o.createdX} ≠ 汇总 ${o.fmtG}`);
    if (o.partsSum !== o.apps || o.apps !== o.Mapps) f2.push(`${tag} 申请结果之和 ${o.partsSum} ≠ 申请 ${o.apps} / ${o.Mapps}`);
    if (o.stX !== o.Mst || o.fullX !== o.Mfull || o.cancelX !== o.Mcancel) f2.push(`${tag} 开打 / 人齐 / 取消 清单 ${o.stX}/${o.fullX}/${o.cancelX} ≠ 汇总 ${o.Mst}/${o.Mfull}/${o.Mcancel}`) });
  // ---- 4d 第三批 3c：球友 / 风险 / 举报 来自数据层 ----
  const x3c = await pg.evaluate(() => { const bad = [];
    if (USERS.length !== DB.users.length) bad.push('球友名单人数 ≠ 数据层');
    RISK.forEach(r => { const u = USERS.find(x => x.id === r.uid); if (!u) bad.push('风险用户找不到球友 ' + r.u); const w = r.sig.reduce((s, [lab]) => s + (RISK_RULES.find(x => x[1] === lab) || [0, 0, 0])[2], 0); if (w !== r.score || r.score < 30) bad.push(`风险分 ${r.u} ${r.score} ≠ 规则权重之和 ${w}`) });
    const open = DB.reports.filter(r => r.status === 'open').length; if (S.reports.filter(r => r.status === 'open').length !== open) bad.push('待审核里的未处理举报 ≠ reports 表');
    USERS.forEach(u => { const p = u.played; if ((u.lv >= 2 && p < 20) || (u.lv >= 3 && (p < 50 || u.att < .9 || u.kRate < .5 || u.kFrom < 10)) || u.lv > 5 || u.lv < 1) bad.push(`等级不符合门槛 ${u.name} Lv${u.lv} 场次 ${p}`) });
    S.range = 30; S.plat = 'all'; B1C = { k: '' }; const top = topUsers(8); for (let i = 1; i < top.length; i++) if (top[i].s.score > top[i - 1].s.score) bad.push('最活跃的球友没按活跃分排序');
    if (top.some(x => x.u.st !== 'active')) bad.push('最活跃的球友里有非正常状态的人');
    return bad.slice(0, 10) });
  x3c.forEach(m => f2.push('x3c: ' + m));
  // ---- 4e 第三批 3c-2：邀约 / 多人申请 / 分享带来的注册 ----
  const x3c2 = await pg.evaluate(() => { const out = [];
    for (const r of RANGES.map(x => x[0])) for (const pl of ['all', 'pwa', 'web']) { S.range = r; S.plat = pl; B1C = { k: '' }; const C = X3.ctx(), D = DB;
      const I = D.invites.filter(i => C.inR(i.created_at) && B3.ok(C.dk, i.device)), st = {}; I.forEach(i => st[i.status] = (st[i.status] || 0) + 1);
      const np = g => (D.byGame.get(g.id) || []).filter(p => p.role === 'player').length, G = C.created, multi = G.filter(g => np(g) >= 4).length, norm = G.filter(g => np(g) >= 1 && np(g) < 4).length, zero = G.filter(g => np(g) === 0).length;
      S.page = 'life'; render(); document.querySelectorAll('#page .hp').forEach(x => x.remove()); const txt = document.getElementById('page').innerText;
      const SH = b1share(); S.page = 'growth'; render(); document.querySelectorAll('#page .hp').forEach(x => x.remove()); const gt = document.getElementById('page').innerText;
      out.push({ r, pl, inv: I.length, invSum: Object.values(st).reduce((a, b) => a + b, 0), invShown: txt.includes('发出的邀约\n' + fmt(I.length)), multi, norm, zero, G: G.length,
        regs: SH.regs, regsShown: gt.includes('分享带来注册\n' + fmt(SH.regs)), srcSum: USERS.filter(u => u.src[0] === 'game' || u.src[0] === 'card').length }) }
    S.range = 7; S.plat = 'all'; B1C = { k: '' }; return out });
  x3c2.forEach(o => { const tag = `x3c2: r=${o.r} ${o.pl}`;
    if (o.invSum !== o.inv) f2.push(`${tag} 邀约各结果之和 ${o.invSum} ≠ 发出 ${o.inv}`);
    if (!o.invShown) f2.push(`${tag} 页面「发出的邀约」≠ 计算 ${o.inv}`);
    if (o.multi + o.norm + o.zero !== o.G) f2.push(`${tag} 4 人以上 + 1–3 人 + 没人申请 ≠ 新球局`);
    if (!o.regsShown) f2.push(`${tag} 「分享带来注册」页面 ≠ 计算 ${o.regs}`) });
  // ---- 4f 第三批 3d-1：访问、进入方式、打开方式自洽 ----
  const x3d = await pg.evaluate(() => { const out = [];
    for (const r of RANGES.map(x => x[0])) for (const pl of ['all', 'pwa', 'web']) { S.range = r; S.plat = pl; B1C = { k: '' }; A3.acc.c = null;
      const { a, b, cut, dk } = MM().range, o = A3.acc(a, b, cut, dk), E = entryData(), SR = screenRows(), M = MM();
      const envSum = Object.values(o.env).reduce((s, x) => s + x, 0), osSum = Object.values(o.os).reduce((s, x) => s + x, 0);
      out.push({ r, pl, ses: o.ses, Mses: M.sessions, entSum: E.share + E.ext + E.push + E.direct, envSum, osSum, sh: E.share, opens: b1share().opens,
        split: pl === 'all' ? SR.every(x => Math.abs(x.pwa + x.web - x.v) < 1e-6) : true, pwaOnly: SR.filter(x => x.b === '仅 PWA').every(x => x.web === 0) }) }
    S.range = 7; S.plat = 'all'; B1C = { k: '' }; return out });
  x3d.forEach(o => { const tag = `x3d: r=${o.r} ${o.pl}`;
    if (o.ses !== o.Mses) f2.push(`${tag} 访问页会话 ${o.ses} ≠ 汇总 ${o.Mses}`);
    if (Math.abs(o.entSum - o.ses) > 1e-6) f2.push(`${tag} 进入方式之和 ${o.entSum} ≠ 会话 ${o.ses}`);
    if (o.envSum !== o.ses || o.osSum !== o.ses) f2.push(`${tag} 打开方式之和 ${o.envSum} / 系统之和 ${o.osSum} ≠ 会话 ${o.ses}`);
    if (o.sh !== o.opens) f2.push(`${tag} 分享链接会话 ${o.sh} ≠ 分享被打开 ${o.opens}`);
    if (!o.split) f2.push(`${tag} 页面访问：手机 + 电脑 ≠ 合计`);
    if (!o.pwaOnly) f2.push(`${tag} 仅 PWA 的页面出现了电脑访问`) });
  // ---- 4b 概览「今天」面板：数字自洽、不受上方筛选影响、和页面显示一致 ----
  const td = await pg.evaluate(() => { const out = []; for (const r of RANGES.map(x => x[0])) for (const pl of ['all', 'pwa', 'web']) { S.range = r; S.plat = pl; out.push(JSON.stringify(todayNow())) }
    S.range = 7; S.plat = 'all'; S.page = 'overview'; render(); const el = document.querySelector('.card.now'); return { all: out, d: todayNow(), txt: el ? el.innerText : '', tiles: el ? [...el.querySelectorAll('.now-t>button')].map(b => b.dataset.pg) : [] } });
  if (new Set(td.all).size !== 1) f2.push('today: 换时间范围或设备后「今天」的数字变了');
  const d = td.d;
  if (!(d.left === d.filled + d.short)) f2.push(`today: 还要开打 ${d.left} ≠ 已人齐 ${d.filled} + 还缺人 ${d.short}`);
  if (!(d.soon <= d.short && d.exp <= d.pend)) f2.push(`today: 2 小时内 ${d.soon} > 还缺人 ${d.short} 或 快失效 ${d.exp} > 待处理 ${d.pend}`);
  if (['left', 'filled', 'short', 'soon', 'cancel', 'pend', 'exp', 'unmet'].some(k => !(Number.isInteger(d[k]) && d[k] >= 0))) f2.push('today: 有非整数或负数 ' + JSON.stringify(d));
  if (d.left && !(td.txt.includes(d.left + ' 局') && td.txt.includes(d.short + ' 局') && td.txt.includes(d.unmet + ' 人') && td.txt.includes(d.pend + ' 条'))) f2.push('today: 页面显示和计算不一致');
  if (/过去 1 小时|较上周同一时间/.test(td.txt)) f2.push('today: 还在显示「过去 1 小时」');
  if (d.left && !(td.tiles.length === 4 && td.tiles.every(x => x === 'life'))) f2.push('today: 4 个数字没有都链到「球局全流程」' + td.tiles);
  // ---- 5 事件字典 = events_spec.md ----
  const ev = await pg.evaluate(() => ({ EV: EVDEF.map(e => [...e]), FLOW: FLOW11.map(f => f[1]).flat(), MAP: (() => { const keys = []; const src = b1evDay.toString(); const m = src.match(/const m=\{([\s\S]*?)\};/); m[1].replace(/([a-z_0-9]+):/g, (_, k) => keys.push(k)); return keys })(), CF: typeof CF_RULES === 'undefined' ? [] : CF_RULES.map(r => r.src) }));   // 旧规则引擎已在 3e 删除（球员卡改用数据层的 cardFindings）
  const names = ev.EV.map(e => e[0]), set = new Set(names), sset = new Set(spec.map(r => r.name));
  if (set.size !== names.length) f2.push('events: 字典有重复 ' + names.filter((n, i) => names.indexOf(n) !== i));
  const miss = [...sset].filter(n => !set.has(n)), extra = [...set].filter(n => !sset.has(n));
  if (miss.length || extra.length) f2.push(`events: 与 spec 不一致 缺 ${miss} 多 ${extra}`);
  spec.forEach(r => { const e = ev.EV.find(x => x[0] === r.name); if (e && (e[1] !== r.cat || e[2] !== r.desc || e[3] !== r.props || e[4] !== r.src)) f2.push(`events: ${r.name} 字段不同 ${JSON.stringify(e)} vs ${JSON.stringify(r)}`) });
  ev.FLOW.forEach(n => { if (!sset.has(n)) f2.push('events: 事件流程用了 spec 外的名字 ' + n) });
  ev.MAP.forEach(n => { if (!sset.has(n)) f2.push('events: 模拟量用了 spec 外的名字 ' + n) });
  ev.CF.forEach(src => (src.match(/\b[a-z]+_[a-z_]+(?=\(| →|$| ·|（)/g) || []).forEach(n => { if (!sset.has(n)) f2.push('events: 规则引擎 src 用了 spec 外的名字 ' + n + ' in ' + src) }));
  // 文件里不再出现废弃事件名（kind=xxx 的通知类型除外）
  const html = fs.readFileSync(FILE, 'utf8');
  const DEPRECATED = ['host_approve', 'host_decline', 'invite_start', 'avatar_change', 'card_theme_change', 'card_custom_save', 'card_save_image', 'card_share_link', 'card_share_preview', 'chat_quick_reply', 'push_enable_click', 'device_push_on', 'apply_closed', 'game_change_ack', 'chat_open_dm', 'chat_open_game', 'applicant_sort', 'applicant_expand', 'filter_change', 'day_change', 'mode_change', 'a2hs_guide_open', 'email_set', 'card_view_own', 'invite_view', 'reopen_notify', 'game_create\\b(?!_)', 'wechat_guide_open', 'venue_pick', 'venue_custom', 'list_expand', 'explore_open', 'location_pick', 'card_seal_roll', 'badge_share_preview', 'notif_read_all', 'home_clubs_edit', 'invite_decline_open', 'invite_counter_open'];
  DEPRECATED.forEach(d => { const re = new RegExp('(?<!kind=)\\b' + d + (d.includes('\\b') ? '' : '\\b'), 'g'); const m = html.match(re); if (m) f2.push(`events: 文件里还有废弃名 ${d} ×${m.length}`) });
  await br.close();
  const fails = [...res.fails, ...f2, ...errs.map(e => 'pageerror: ' + e)];
  console.log('assertion groups:', JSON.stringify(res.passes), '+ risk-sync click test + events dictionary (', spec.length, 'spec rows )');
  console.log(fails.length ? 'FAIL ' + fails.length : 'ALL PASS');
  fails.slice(0, 80).forEach(f => console.log(' -', f));
  process.exit(fails.length ? 1 : 0);
})();
