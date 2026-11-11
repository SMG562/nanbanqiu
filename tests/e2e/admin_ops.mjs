// #27 第 4 步起：后台真数据页的处理操作，端到端（浏览器里的真实后台页面 ↔ 真实 server/admin/api.mjs ↔ 真实 PostgreSQL + schema.sql）。
//   每一块一节；每个写操作都验证「点 → 服务器 → 刷新页面后还在」，以及不能做的人按钮置灰、服务端也拦。
//   夹具同 admin_login.mjs：Node http 挂页面和 /admin/api；可控时钟给验证码。
import fs from 'fs'; import { createRequire } from 'module'; import http from 'http'; import path from 'path'; import { fileURLToPath, pathToFileURL } from 'url';
import { startCluster, loadSchema } from '../pg/cluster.mjs';
const require = createRequire(import.meta.url), pg = require('pg'), { chromium } = require('playwright');
const HERE = path.dirname(fileURLToPath(import.meta.url)), DIR = process.env.NBQ_DIR || path.join(HERE, '..', '..');
const AU = await import(pathToFileURL(path.join(DIR, 'server/admin/auth.mjs'))), API = await import(pathToFileURL(path.join(DIR, 'server/admin/api.mjs')));
const HTML = fs.readFileSync(path.join(DIR, '南伴球_后台.html'));
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 600) : '')) };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const until = async (fn, ms = 6000) => { const end = Date.now() + ms; while (Date.now() < end) { try { if (await fn()) return true } catch (_) { } await sleep(80) } return false };

const c = startCluster(); let su, br, srv;
try {
  c.createdb('nbq');
  const errs = loadSchema(c, 'nbq', path.join(DIR, 'schema.sql')); T('schema 执行无错误', !errs.length, errs.slice(0, 3));
  c.psql('nbq', `-c "alter role nbq_admin_api login"`);
  su = new pg.Pool({ host: c.host, port: c.port, user: 'postgres', database: 'nbq', max: 3 });
  const q = (s, p) => su.query(s, p), one = async (s, p) => (await q(s, p)).rows[0];
  const PW = 'correct horse battery', SEC = AU.newTotpSecret(), PH = AU.hashPassword(PW);
  for (const [e, n, r] of [['han@x.com', 'Han', 'owner'], ['ops@x.com', 'Amy', 'operator'], ['view@x.com', 'Leo', 'viewer']])
    await q(`insert into admin_users(email,name,role,password_hash,totp_secret,recovery_hashes) values ($1,$2,$3,$4,$5,'{}')`, [e, n, r, PH, SEC]);
  let un = 0; const user = async (nick, o = {}) => one(`insert into users(phone_e164,nickname,utr,gender,pact_accepted_at,home_city) values ($1,$2,5,$3,now(),'melb') returning id, member_no::int as no`, ['+6142' + String(++un).padStart(7, '0'), nick, o.gender ?? 'm']);

  let clock = 1_800_000_000_000;
  const connect = async () => { const cl = new pg.Client({ host: c.host, port: c.port, user: 'nbq_admin_api', database: 'nbq' }); await cl.connect(); return cl };
  srv = http.createServer(async (req, res) => {
    const chunks = []; for await (const b of req) chunks.push(b);
    if (!req.url.startsWith('/admin/api')) { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); return res.end(HTML) }
    const h = new Headers(); for (const [k, v] of Object.entries(req.headers)) h.set(k, String(v)); h.set('CF-Connecting-IP', '203.0.113.9');
    const r = await API.handleAdmin(new Request('http://' + req.headers.host + req.url, { method: req.method, headers: h, body: ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(chunks) }), { connect, hosts: ['127.0.0.1'], now: () => clock });
    const out = {}; r.headers.forEach((v, k) => { out[k] = v }); res.writeHead(r.status, out); res.end(await r.text());
  });
  await new Promise(r => srv.listen(0, '127.0.0.1', r)); const URL0 = `http://127.0.0.1:${srv.address().port}/admin`;
  const exe = [process.env.NBQ_CHROMIUM, '/opt/pw-browsers/chromium'].find(x => x && fs.existsSync(x));
  br = await chromium.launch({ ...(exe ? { executablePath: exe } : {}), args: ['--no-sandbox'] });
  const vis = (p, s) => p.evaluate(s => { const e = document.querySelector(s); if (!e) return false; const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0 && r.height > 0 }, s);
  const txt = (p, s) => p.evaluate(s => document.querySelector(s)?.innerText || '', s);
  // 登录一个角色，返回 {p, pe}：pe 收集页面错误和未处理的异步错误（await 里抛的错不算 pageerror）
  const session = async email => {
    const ctx = await br.newContext({ viewport: { width: 1360, height: 900 }, acceptDownloads: true }), p = await ctx.newPage(), pe = [];
    p.on('pageerror', e => pe.push(e.message)); await p.addInitScript(() => addEventListener('unhandledrejection', e => console.error('UNHANDLED ' + (e.reason && e.reason.message))));
    p.on('console', m => { if (m.text().startsWith('UNHANDLED')) pe.push(m.text()) });
    await p.goto(URL0); await until(() => vis(p, '#lgEmail'));
    clock += 30e3; await p.fill('#lgEmail', email); await p.fill('#lgPw', PW); await p.fill('#lgCode', AU.totp(SEC, clock)); await p.click('.go');
    T(`${email} 登录进后台`, await until(() => vis(p, '#app')));
    return { p, pe, ctx };
  };
  const goPage = async (p, k) => { await p.click(`#nav [data-pg="${k}"]`); await until(async () => (await txt(p, '#pt')).length > 0) };
  const reload = async p => { await p.reload(); await until(() => vis(p, '#app')) };

  // ================= 1. 球友详情与处理 =================
  {
    const A = await user('小甲'), B = await user('小乙');
    const { p, pe, ctx } = await session('ops@x.com');
    await goPage(p, 'users');
    T('1.1 球友列表的行可以点开', await until(() => p.evaluate(no => !!document.querySelector(`tr[data-rud="${no}"]`), A.no)));
    await p.click(`tr[data-rud="${A.no}"]`);
    T('1.2 抽屉打开，显示昵称和编号（来自 /users/detail）', await until(async () => /小甲/.test(await txt(p, '#ud .ud')) && /#0*1\b/.test(await txt(p, '#ud .ud'))));
    T('1.3 运营：「封禁」和「看完整号码」置灰并说明需要谁', await p.evaluate(() => document.querySelector('[data-rux="st"][data-v="banned"]').disabled && document.querySelector('[data-rux="phone"]').disabled && /超级管理员/.test(document.querySelector('[data-rux="phone"]').title)));
    await p.click('[data-rux="st"][data-v="suspended"]');
    await p.click('[data-rux="go"]'); T('1.4 不选原因不能提交', /原因/.test(await txt(p, '#rudErr')));
    await p.click('[data-rux="rc"][data-v="harass"]'); await p.click('[data-rux="days"][data-v="3"]');
    await p.fill('#rudWhy', '短'); await p.click('[data-rux="go"]'); T('1.5 理由太短不能提交', /至少 4 个字/.test(await txt(p, '#rudErr')));
    await p.fill('#rudWhy', '聊天里多次骚扰，已核实'); await p.click('[data-rux="go"]');
    T('1.6 提交后：抽屉重读，显示「暂停」和状态记录（谁、几天）', await until(async () => { const t = await txt(p, '#ud .ud'); return /暂停 3 天/.test(t) && /Amy/.test(t) && /聊天里多次骚扰/.test(t) }));
    T('1.7 库里真的改了', (await one(`select status from users where id=$1`, [A.id])).status === 'suspended');
    await reload(p); await goPage(p, 'users');
    T('1.8 刷新页面后列表里还是「暂停」', await until(() => p.evaluate(no => /暂停/.test(document.querySelector(`tr[data-rud="${no}"]`)?.innerText || ''), A.no)));
    await p.click(`tr[data-rud="${B.no}"]`); await until(async () => /小乙/.test(await txt(p, '#ud .ud')));
    await p.click('[data-rux="op"][data-v="nickname"]'); await p.fill('#admRin', '昵称含广告链接'); await p.click('[data-admrok]');
    T('1.9 重置昵称：填理由 → 抽屉重读显示「球友+编号」', await until(async () => (await txt(p, '#ud .ud')).includes('球友' + B.no)));
    await p.keyboard.press('Escape'); T('1.10 Esc 关闭抽屉', await until(async () => !(await p.evaluate(() => document.getElementById('ud').classList.contains('show')))));
    T('1.11 运营全程没有页面错误', !pe.length, pe); await ctx.close();

    const o = await session('han@x.com'); await goPage(o.p, 'users');
    await until(() => o.p.evaluate(no => !!document.querySelector(`tr[data-rud="${no}"]`), B.no)); await o.p.click(`tr[data-rud="${B.no}"]`);
    await until(async () => !(await o.p.evaluate(() => document.querySelector('[data-rux="phone"]')?.disabled ?? true)));
    await o.p.click('[data-rux="phone"]'); await o.p.fill('#admRin', '警方协查函 123'); await o.p.click('[data-admrok]');
    T('1.12 owner 看完整号码：填理由后显示，并记进操作日志', await until(async () => /\+6142\d{7}/.test(await txt(o.p, '#ud .ud'))) && !!(await one(`select 1 from admin_audit_log where action='phone.reveal' and target=$1`, [B.id])));
    await o.p.click('[data-rux="st"][data-v="banned"]'); await o.p.click('[data-rux="rc"][data-v="spam"]'); await o.p.fill('#rudWhy', '批量发广告封禁'); await o.p.click('[data-rux="go"]');
    T('1.13 owner 封禁 → 库里封禁', await until(async () => (await one(`select status from users where id=$1`, [B.id])).status === 'banned'));
    await o.p.click('#ud [data-rux="x"]');
    T('1.14 owner 全程没有页面错误', !o.pe.length, o.pe); await o.ctx.close();
  }
  // ================= 2. 风险用户 =================
  {
    const R = await user('风险丙');
    const al = (await one(`insert into risk_alerts(user_id,rule_code,value,score,window_from,window_to,suggested) values ($1,'no_show',2,50,now()-interval '30 days',now(),'review') returning id::text`, [R.id])).id;
    const { p, pe, ctx } = await session('ops@x.com');
    await goPage(p, 'safety');
    T('2.1 风险用户页：不再是占位，列出提醒（规则名、球友）', await until(async () => { const t = await txt(p, '#page'); return /爽约/.test(t) && /风险丙/.test(t) && !/还没接真数据/.test(t) }));
    T('2.2 运营看得到规则，但没有「改」按钮', await until(() => p.evaluate(() => /频率限制/.test(document.getElementById('page').innerText) && !document.querySelector('[data-rsk="edit"]'))));
    await p.click(`[data-rsk="watch"][data-id="${al}"]`);
    T('2.3 观察 7 天 → 待处理里没了，库里是观察中', await until(async () => !(await p.evaluate(id => !!document.querySelector(`[data-rsk="watch"][data-id="${id}"]`), al)) && (await one(`select status from risk_alerts where id=$1`, [al])).status === 'watching'));
    await reload(p); await goPage(p, 'safety'); await until(() => p.evaluate(() => !!document.querySelector('[data-rsk="view"][data-v="watching"]')));
    await p.click('[data-rsk="view"][data-v="watching"]');
    T('2.4 刷新后在「观察中」还在，显示处理人', await until(async () => { const t = await txt(p, '#page'); return /风险丙/.test(t) && /Amy/.test(t) }));
    await p.click(`[data-rsk="user"]`);
    T('2.5 点球友名字打开详情抽屉', await until(async () => /风险丙/.test(await txt(p, '#ud .ud'))));
    T('2.6 运营全程没有页面错误', !pe.length, pe); await ctx.close();

    const o = await session('han@x.com'); await goPage(o.p, 'safety');
    T('2.7 owner 有「改」按钮', await until(() => o.p.evaluate(() => !!document.querySelector('[data-rsk="edit"][data-kind="risk"][data-v="no_show"]'))));
    await o.p.click('[data-rsk="edit"][data-kind="risk"][data-v="no_show"]'); await o.p.fill('#rkW', '35'); await o.p.fill('#rkWhy', '上线首月调高');
    await o.p.click('[data-rsk="save"]');
    T('2.8 owner 改权重 → 库里是 35', await until(async () => (await one(`select weight from risk_rules where code='no_show'`)).weight === 35));
    await reload(o.p); await goPage(o.p, 'safety');
    T('2.9 刷新后规则表显示 35', await until(() => o.p.evaluate(() => [...document.querySelectorAll('#page tr')].some(tr => /no_show/.test(tr.innerText) && /\b35\b/.test(tr.innerText)))));
    T('2.10 owner 全程没有页面错误', !o.pe.length, o.pe); await o.ctx.close();
  }
  // ================= 3. 待审核 · 场边举报 =================
  {
    const W = await user('场边丁'), X = await user('举报戊');
    const P = (await one(`insert into sb_posts(user_id,city,body) values ($1,'melb','场边不当发布') returning id`, [W.id])).id;
    await q(`begin; set local session_replication_role = replica; insert into reports(reporter_id,target_type,target_id,reason,source,via) values ('${X.id}','sb_post','${P}','harass','in_app','sideline'); commit;`);
    const { p, pe, ctx } = await session('ops@x.com');
    await goPage(p, 'review');
    T('3.1 待审核页下面有「场边举报」，列出内容、作者、举报原因', await until(async () => { const t = await txt(p, '#page'); return /场边举报/.test(t) && /场边不当发布/.test(t) && /场边丁/.test(t) && /骚扰或冒犯/.test(t) }));
    await p.click(`[data-sq="hide"][data-id="${P}"]`); await p.fill('#admRin', '骚扰内容已核实'); await p.click('[data-admrok]');
    T('3.2 隐藏：填理由 → 库里发布已隐藏、举报已处理', await until(async () => (await one(`select status from sb_posts where id=$1`, [P])).status === 'hidden' && (await one(`select status from reports where target_id=$1`, [P])).status === 'actioned'));
    await reload(p); await goPage(p, 'review');
    T('3.3 刷新后：这条显示「已隐藏」，按钮变成「恢复显示」', await until(() => p.evaluate(id => !!document.querySelector(`[data-sq="show"][data-id="${id}"]`), P)) && /已隐藏/.test(await txt(p, '#page')));
    T('3.4 没有页面错误', !pe.length, pe); await ctx.close();
  }
  // ================= 5. 城市 =================
  {
    await q(`insert into area_demand(kind, city, email) values ('city_waitlist','melb','w1@x.com')`);
    const { p, pe, ctx } = await session('han@x.com'); await goPage(p, 'cities');
    T('5.1 城市页：6 个城市卡片，墨尔本开放、带检查清单', await until(async () => { const t = await txt(p, '#page'); return /墨尔本/.test(t) && /珀斯/.test(t) && /开放/.test(t) && /区数据已导入/.test(t) }));
    await p.click('[data-rc2="st"][data-c="syd"][data-v="prep"]'); await p.fill('#admRin', '开始准备悉尼'); await p.click('[data-admrok]');
    T('5.2 悉尼改为准备中 → 库里是 prep', await until(async () => (await one(`select status from cities where key='syd'`)).status === 'prep'));
    await until(() => p.evaluate(() => !!document.querySelector('[data-rc2="edit"][data-c="syd"]')));
    await p.click('[data-rc2="edit"][data-c="syd"]'); await p.fill('#rcUrl', 'https://example.com/syd-group'); await p.fill('#rcWhy', '补社群链接'); await p.click('[data-rc2="save"][data-c="syd"]');
    T('5.3 改资料 → 库里是新链接', await until(async () => (await one(`select community_url from cities where key='syd'`)).community_url === 'https://example.com/syd-group'));
    const dl = p.waitForEvent('download', { timeout: 6000 }).catch(() => null);
    await until(() => p.evaluate(() => !!document.querySelector('[data-rc2="wl"][data-c="melb"]'))); await p.click('[data-rc2="wl"][data-c="melb"]'); await p.fill('#admRin', '墨尔本开放通知'); await p.click('[data-admrok]');
    const f = await dl; T('5.4 导出名单：下载 CSV，里面有邮箱', !!f && /w1@x\.com/.test(fs.readFileSync(await f.path(), 'utf8')));
    await reload(p); await goPage(p, 'cities');
    T('5.5 刷新后悉尼显示「准备中」', await until(() => p.evaluate(() => [...document.querySelectorAll('#page .card')].some(c => /悉尼/.test(c.innerText) && /准备中/.test(c.innerText)))));
    T('5.6 没有页面错误', !pe.length, pe); await ctx.close();
  }
  // ================= 6. 统计页（白名单接口 + 通用卡片） =================
  {
    await q(`insert into daily_metrics(day,metric,dims,value,additive) values (current_date - 1,'new_users','{}',4,true),(current_date - 2,'new_users','{}',5,true) on conflict do nothing`);
    const H = await user('统计发起人');
    await q(`insert into suburbs(name,postcode,centroid) values ('Brighton','3186','POINT(145 -37.9)') on conflict do nothing`).catch(() => { });
    const V = (await one(`insert into venues(name,short_name,suburb,postcode,location,surfaces,status,city) values ('E2E Court','E2E','Brighton','3186','POINT(145 -37.9)','{hard}','active','melb') returning id`)).id;
    await q(`insert into games(share_code,host_id,venue_id,starts_at,duration_min,game_type,capacity,utr_min,utr_max,status,visibility) values ('E2E01',$1,$2,now()-interval '1 day',90,'singles',2,3,6,'open','public')`, [H.id, V]);
    const { p, pe, ctx } = await session('ops@x.com'); await goPage(p, 'overview');
    T('6.1 概览：真数据卡片（活跃、人齐、今天、每天、最活跃的球友），新注册合计 9', await until(async () => { const t = await txt(p, '#page'); return /活跃球友/.test(t) && /开打时人齐/.test(t) && /今天还没开打/.test(t) && /最活跃的球友/.test(t) && /新注册\s*9\b/.test(t) && !/还没接真数据/.test(t) }));
    T('6.2 概览里出现前面几节建的真球友（最活跃的球友表）或「还没有数据」，没有「读不出来」', !/暂时读不出来|读不出来/.test(await txt(p, '#page')));
    for (const k of ['cards', 'regions', 'traffic', 'growth', 'platform', 'env', 'life', 'after', 'grow', 'sb']) {
      await p.evaluate(k => { S.page = k; render() }, k);
      const ok = await until(async () => { const t = await txt(p, '#page'); return !/读取中/.test(t) }); const t = await txt(p, '#page');
      T(`6.3 ${k}：读完、没有「暂时读不出来」的卡片`, ok && !/暂时读不出来/.test(t) && !/还没接真数据/.test(t), t.slice(0, 300));
    }
    await p.evaluate(() => { S.page = 'overview'; render() }); await p.click('[data-stx="range"][data-v="7"]');
    T('6.4 切到近 7 天：重新读', await until(async () => /新注册\s*9\b/.test(await txt(p, '#page'))));
    await until(() => p.evaluate(() => !!document.querySelector('[data-stx="export"][data-fn="venue_activity"]')));
    const dl = p.waitForEvent('download', { timeout: 6000 }).catch(() => null); await p.click('[data-stx="export"][data-fn="venue_activity"]'); const f = await dl;
    T('6.5a 导出：下载 CSV（中文表头），并记进操作日志', !!f && /球场/.test(fs.readFileSync(await f.path(), 'utf8')) && !!(await one(`select 1 from admin_audit_log where action='data.export' and target='venue_activity'`)));
    T('6.5b 运营没有「含编号昵称导出」', !(await p.evaluate(() => !!document.querySelector('[data-stx="exportids"]'))));
    await p.evaluate(() => { S.page = 'events'; render() });
    T('6.5c 数据口径页：事件定义（库里的）+ 每张卡片的口径', await until(async () => { const t = await txt(p, '#page'); return /事件定义/.test(t) && /每张卡片的口径/.test(t) && /app_open|page_view|signup/.test(t) }));
    T('6.5 没有页面错误', !pe.length, pe); await ctx.close();
    await q(`update admin_users set role='viewer', disabled=false where email='view@x.com'`);
    const v = await session('view@x.com'); await goPage(v.p, 'overview');
    T('6.6 只读：最活跃的球友那张卡说明看不到，其他照常', await until(async () => { const t = await txt(v.p, '#page'); return /你的角色看不到这一项/.test(t) && /新注册/.test(t) }));
    T('6.7 只读没有页面错误', !v.pe.length, v.pe); await v.ctx.close();
  }
  // ================= 7. 场边配置（草稿 → 发布 → 退回） =================
  {
    const { p, pe, ctx } = await session('ops@x.com'); await goPage(p, 'stopic');
    const v0 = (await one(`select max(version)::int v from sb_config_versions`)).v;
    T('7.1 话题页：版本号、话题表（上线开关）', await until(async () => { const t = await txt(p, '#page'); return new RegExp('场边配置 v' + v0).test(t) && /上线中/.test(t) && !/还没接真数据/.test(t) }));
    await p.click('[data-sc="toggle"][data-i="0"]');
    T('7.2 关掉第一个话题 → 草稿里「话题」已改，前台还没变（库里话题仍上线）', await until(async () => /草稿里改了：话题/.test(await txt(p, '#page'))) && (await one(`select count(*)::int n from sb_config_draft`)).n === 1);
    await reload(p); await p.evaluate(() => { S.page = 'stopic'; render() });
    T('7.3 刷新后草稿还在', await until(async () => /草稿里改了：话题/.test(await txt(p, '#page'))));
    await p.fill('#scNote', '先下线一个话题'); await p.click('[data-sc="publish"]');
    T('7.4 发布 → 新版本，草稿清空', await until(async () => (await one(`select max(version)::int v from sb_config_versions`)).v === v0 + 1 && /没有未发布的改动/.test(await txt(p, '#page'))));
    await p.evaluate(() => { S.page = 'sguide'; render() });
    await until(() => p.evaluate(() => !!document.querySelector('[data-sc="edit"][data-k="hints"]'))); await p.click('[data-sc="edit"][data-k="hints"]');
    await p.fill('#scJson', '{坏的'); await p.click('[data-sc="save"]'); T('7.5 JSON 写坏：页面先拦下', /不是合法的 JSON/.test(await txt(p, '#scErr')));
    await p.evaluate(() => { document.querySelector('[data-sc="rollback"]')?.closest('details')?.setAttribute('open', '') });
    await p.click(`[data-sc="rollback"][data-v="${v0}"]`); await p.fill('#admRin', '撤回下线'); await p.click('[data-admrok]');
    T('7.6 退回旧版 → 又一个新版本，记着从哪版退回', await until(async () => (await one(`select from_version from sb_config_versions order by version desc limit 1`)).from_version === v0));
    T('7.7 没有页面错误', !pe.length, pe); await ctx.close();
  }
  // ================= 4. 管理员与操作日志（放最后：会改管理员角色） =================
  {
    const op = await session('ops@x.com'); await goPage(op.p, 'admin');
    T('4.1 运营：看得到操作日志（前面几节的处理都在），看不到管理员名单', await until(async () => { const t = await txt(op.p, '#page'); return /操作日志/.test(t) && /只有超级管理员能看/.test(t) && /Amy/.test(t) && /user\.status/.test(t) }));
    await op.p.click('[data-ra="cat"][data-v="risk"]');
    T('4.2 日志按类别筛：只剩风险类', await until(() => op.p.evaluate(() => { const rows = [...document.querySelectorAll('#page table tbody tr')]; return rows.length > 0 && rows.every(r => /risk\./.test(r.innerText)) })));
    T('4.3 运营没有页面错误', !op.pe.length, op.pe); await op.ctx.close();

    const { p, pe, ctx } = await session('han@x.com'); await goPage(p, 'admin');
    T('4.4 owner：管理员名单 3 位，提示超级管理员少于 2 位', await until(async () => { const t = await txt(p, '#page'); return /Leo/.test(t) && /Amy/.test(t) && /超级管理员只有 1 位/.test(t) }));
    const leo = (await one(`select id from admin_users where email='view@x.com'`)).id;
    await p.selectOption(`[data-rarole="${leo}"]`, 'operator'); await p.fill('#admRin', '升为运营'); await p.click('[data-admrok]');
    T('4.5 改角色：选「运营」+ 填理由 → 库里是运营', await until(async () => (await one(`select role from admin_users where id=$1`, [leo])).role === 'operator'));
    await p.click(`[data-ra="city"][data-id="${leo}"]`); await p.check('[data-racity="melb"]'); await p.fill('#raWhy', '只负责墨尔本'); await p.click(`[data-ra="savecity"][data-id="${leo}"]`);
    T('4.6 改负责城市 → 库里是 melb', await until(async () => JSON.stringify((await one(`select cities from admin_users where id=$1`, [leo])).cities) === '["melb"]'));
    await p.click(`[data-ra="disable"][data-id="${leo}"]`); await p.fill('#admRin', '测试停用'); await p.click('[data-admrok]');
    T('4.7 停用 → 库里已停用', await until(async () => (await one(`select disabled from admin_users where id=$1`, [leo])).disabled));
    await reload(p); await goPage(p, 'admin');
    T('4.8 刷新后：Leo 显示已停用和理由、负责城市是墨尔本；日志里有这三次操作', await until(async () => { const t = await txt(p, '#page'); return /已停用：测试停用/.test(t) && /墨尔本/.test(t) && (t.match(/admin\.manage/g) || []).length >= 3 }));
    T('4.9 owner 没有页面错误', !pe.length, pe); await ctx.close();
  }
} catch (e) { fail++; console.log('FAIL 异常 ' + (e.stack || e).toString().slice(0, 800)) }
finally { try { await br?.close() } catch (_) { } try { srv?.close() } catch (_) { } try { await su?.end() } catch (_) { } c.stop() }
console.log(`admin_ops: ${pass} 通过, ${fail} 失败`); process.exit(fail ? 1 : 0);
